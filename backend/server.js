const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const cors = require('cors');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 8000;

app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir);
app.use('/uploads', express.static('uploads'));

const storage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, 'uploads/'),
    filename: (req, file, cb) => {
        const unique = Date.now() + '-' + Math.round(Math.random() * 1e9);
        cb(null, file.fieldname + '-' + unique + path.extname(file.originalname));
    }
});
const upload = multer({ storage });

const db = new sqlite3.Database('animal_tracker.db', (err) => {
    if (err) console.error('Error opening DB:', err.message);
    else console.log('Connected to SQLite DB.');
});

function ensureColumnExists(table, column, definition) {
    db.all(`PRAGMA table_info(${table})`, (err, columns) => {
        if (err) return console.error(`Failed to fetch columns for ${table}:`, err.message);
        const columnExists = columns.some(col => col.name === column);
        if (!columnExists) {
            db.run(`ALTER TABLE ${table} ADD COLUMN ${column} ${definition}`, (alterErr) => {
                if (alterErr) console.error(`Error adding column ${column} to ${table}:`, alterErr.message);
                else console.log(`Column '${column}' added to table '${table}'`);
            });
        }
    });
}

db.serialize(() => {
    db.run(`CREATE TABLE IF NOT EXISTS animals (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        species TEXT NOT NULL,
        breed TEXT,
        color TEXT,
        sex TEXT,
        dateOfBirth TEXT NOT NULL,
        status TEXT NOT NULL,
        notes TEXT,
        image TEXT,
        createdAt TEXT NOT NULL,
        updatedAt TEXT NOT NULL
    )`);

    db.run(`CREATE TABLE IF NOT EXISTS breedings (
        id TEXT PRIMARY KEY,
        maleId TEXT NOT NULL,
        femaleId TEXT NOT NULL,
        breedingDate TEXT NOT NULL,
        gestationDays INTEGER DEFAULT 31,
        expectedDate TEXT,
        actualDate TEXT,
        status TEXT DEFAULT 'pending',
        notes TEXT,
        offspring INTEGER DEFAULT 0,
        createdAt TEXT NOT NULL,
        updatedAt TEXT NOT NULL,
        FOREIGN KEY (maleId) REFERENCES animals(id),
        FOREIGN KEY (femaleId) REFERENCES animals(id)
    )`);

    db.run(`CREATE TABLE IF NOT EXISTS hatchings (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        totalEggs INTEGER NOT NULL,
        startDate TEXT NOT NULL,
        incubationDays INTEGER NOT NULL,
        expectedHatchDate TEXT NOT NULL,
        actualHatchDate TEXT,
        hatchedEggs INTEGER DEFAULT 0,
        status TEXT DEFAULT 'incubating',
        temperature REAL,
        humidity REAL,
        notes TEXT,
        createdAt TEXT NOT NULL,
        updatedAt TEXT NOT NULL
    )`);

    console.log('Tables created.');
    ensureColumnExists('breedings', 'gestationDays', 'INTEGER DEFAULT 31');
});

// ---------- Animals Routes ----------

app.get('/api/animals', (req, res) => {
    db.all("SELECT * FROM animals ORDER BY createdAt DESC", (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(rows);
    });
});

app.get('/api/animals/:id', (req, res) => {
    db.get("SELECT * FROM animals WHERE id = ?", [req.params.id], (err, row) => {
        if (err) return res.status(500).json({ error: err.message });
        if (!row) return res.status(404).json({ error: 'Animal not found' });
        res.json(row);
    });
});

app.post('/api/animals', (req, res) => {
    const { id, name, species, breed, color, sex, dateOfBirth, status, notes, image } = req.body;
    const createdAt = new Date().toISOString();
    const updatedAt = createdAt;

    db.run(`INSERT INTO animals (id, name, species, breed, color, sex, dateOfBirth, status, notes, image, createdAt, updatedAt)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [id, name, species, breed, color, sex, dateOfBirth, status, notes, image, createdAt, updatedAt],
        function (err) {
            if (err) {
                console.error('POST /api/animals error:', err.message);
                return res.status(500).json({ error: err.message });
            }
            res.json({ id, success: true });
        });
});

app.put('/api/animals/:id', (req, res) => {
    const { name, species, breed, color, sex, dateOfBirth, status, notes, image } = req.body;
    const updatedAt = new Date().toISOString();

    db.run(`UPDATE animals SET name = ?, species = ?, breed = ?, color = ?, sex = ?, dateOfBirth = ?, status = ?, notes = ?, image = ?, updatedAt = ? WHERE id = ?`,
        [name, species, breed, color, sex, dateOfBirth, status, notes, image, updatedAt, req.params.id],
        function (err) {
            if (err) {
                console.error('PUT /api/animals/:id error:', err.message);
                return res.status(500).json({ error: err.message });
            }
            if (this.changes === 0) return res.status(404).json({ error: 'Animal not found' });
            res.json({ success: true });
        });
});

app.delete('/api/animals/:id', (req, res) => {
    db.run("DELETE FROM animals WHERE id = ?", [req.params.id], function (err) {
        if (err) {
            console.error('DELETE /api/animals/:id error:', err.message);
            return res.status(500).json({ error: err.message });
        }
        if (this.changes === 0) return res.status(404).json({ error: 'Animal not found' });
        res.json({ success: true });
    });
});

// ---------- Breedings Routes ----------

app.get('/api/breedings', (req, res) => {
    const query = `
        SELECT b.*, 
               m.name as maleName, m.species as maleSpecies,
               f.name as femaleName, f.species as femaleSpecies
        FROM breedings b
        LEFT JOIN animals m ON b.maleId = m.id
        LEFT JOIN animals f ON b.femaleId = f.id
        ORDER BY b.createdAt DESC`;
    db.all(query, (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(rows);
    });
});

app.post('/api/breedings', (req, res) => {
    const { id, maleId, femaleId, breedingDate, gestationDays, expectedDate, notes } = req.body;
    const createdAt = new Date().toISOString();
    const updatedAt = createdAt;

    db.run(`INSERT INTO breedings (id, maleId, femaleId, breedingDate, gestationDays, expectedDate, notes, createdAt, updatedAt)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [id, maleId, femaleId, breedingDate, gestationDays || 31, expectedDate, notes, createdAt, updatedAt],
        function (err) {
            if (err) {
                console.error('POST /api/breedings error:', err.message);
                return res.status(500).json({ error: err.message });
            }
            res.json({ id, success: true });
        });
});

app.put('/api/breedings/:id', (req, res) => {
    const { status, actualDate, offspring = 0, notes } = req.body;
    const updatedAt = new Date().toISOString();

    db.run(`UPDATE breedings SET status = ?, actualDate = ?, offspring = ?, notes = ?, updatedAt = ? WHERE id = ?`,
        [status, actualDate, offspring, notes, updatedAt, req.params.id],
        function (err) {
            if (err) {
                console.error('PUT /api/breedings/:id error:', err.message);
                return res.status(500).json({ error: err.message });
            }
            res.json({ success: true });
        });
});

app.delete('/api/breedings/:id', (req, res) => {
    db.run("DELETE FROM breedings WHERE id = ?", [req.params.id], function (err) {
        if (err) {
            console.error('DELETE /api/breedings/:id error:', err.message);
            return res.status(500).json({ error: err.message });
        }
        res.json({ success: true });
    });
});

// ---------- Hatchings Routes ----------

app.get('/api/hatchings', (req, res) => {
    db.all("SELECT *, COALESCE(hatchedEggs, 0) AS hatchedEggs FROM hatchings ORDER BY createdAt DESC", (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(rows);
    });
});

app.post('/api/hatchings', (req, res) => {
    const { id, name, totalEggs, startDate, incubationDays, expectedHatchDate, temperature, humidity, notes } = req.body;
    const createdAt = new Date().toISOString();
    const updatedAt = createdAt;

    db.run(`INSERT INTO hatchings (id, name, totalEggs, startDate, incubationDays, expectedHatchDate, temperature, humidity, notes, createdAt, updatedAt)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [id, name, totalEggs, startDate, incubationDays, expectedHatchDate, temperature, humidity, notes, createdAt, updatedAt],
        function (err) {
            if (err) {
                console.error('POST /api/hatchings error:', err.message);
                return res.status(500).json({ error: err.message });
            }
            res.json({ id, success: true });
        });
});

app.put('/api/hatchings/:id', (req, res) => {
    const { status, actualHatchDate, hatchedEggs, temperature, humidity, notes } = req.body;
    const updatedAt = new Date().toISOString();

    db.run(`UPDATE hatchings SET status = ?, actualHatchDate = ?, hatchedEggs = ?, temperature = ?, humidity = ?, notes = ?, updatedAt = ? WHERE id = ?`,
        [status, actualHatchDate, hatchedEggs, temperature, humidity, notes, updatedAt, req.params.id],
        function (err) {
            if (err) {
                console.error('PUT /api/hatchings/:id error:', err.message);
                return res.status(500).json({ error: err.message });
            }
            res.json({ success: true });
        });
});

app.delete('/api/hatchings/:id', (req, res) => {
    db.run("DELETE FROM hatchings WHERE id = ?", [req.params.id], function (err) {
        if (err) {
            console.error('DELETE /api/hatchings/:id error:', err.message);
            return res.status(500).json({ error: err.message });
        }
        res.json({ success: true });
    });
});

// ---------- Health + Frontend ----------

app.get('/api/health', (req, res) => {
    res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

app.use(express.static(path.join(__dirname, '../build')));
app.get(/^\/(?!api).*/, (req, res) => {
    res.sendFile(path.join(__dirname, '../build', 'index.html'));
});

// ---------- Error & Shutdown ----------

app.use((err, req, res, next) => {
    console.error('Unhandled error:', err.stack);
    res.status(500).json({ error: 'Something went wrong!' });
});

app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
});

process.on('SIGINT', () => {
    console.log('\nShutting down...');
    db.close((err) => {
        if (err) console.error(err.message);
        else console.log('Database connection closed.');
        process.exit(0);
    });
});
