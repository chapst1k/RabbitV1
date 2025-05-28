const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const cors = require('cors');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// Create uploads directory if not exist
const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir);
}

// Serve static files
app.use('/uploads', express.static('uploads'));

// Multer file upload config
const storage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, 'uploads/'),
    filename: (req, file, cb) => {
        const unique = Date.now() + '-' + Math.round(Math.random() * 1e9);
        cb(null, file.fieldname + '-' + unique + path.extname(file.originalname));
    }
});
const upload = multer({ storage });

// SQLite DB init
const db = new sqlite3.Database('animal_tracker.db', (err) => {
    if (err) console.error('Error opening DB:', err.message);
    else console.log('Connected to SQLite DB.');
});

// Create tables
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
});

// ANIMAL ROUTES

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
        function(err) {
            if (err) return res.status(500).json({ error: err.message });
            res.json({ id, success: true });
        });
});

app.put('/api/animals/:id', (req, res) => {
    const { name, species, breed, color, sex, dateOfBirth, status, notes, image } = req.body;
    const updatedAt = new Date().toISOString();

    db.run(`UPDATE animals SET name = ?, species = ?, breed = ?, color = ?, sex = ?, dateOfBirth = ?, status = ?, notes = ?, image = ?, updatedAt = ? WHERE id = ?`,
        [name, species, breed, color, sex, dateOfBirth, status, notes, image, updatedAt, req.params.id],
        function(err) {
            if (err) return res.status(500).json({ error: err.message });
            if (this.changes === 0) return res.status(404).json({ error: 'Animal not found' });
            res.json({ success: true });
        });
});

app.delete('/api/animals/:id', (req, res) => {
    db.run("DELETE FROM animals WHERE id = ?", [req.params.id], function(err) {
        if (err) return res.status(500).json({ error: err.message });
        if (this.changes === 0) return res.status(404).json({ error: 'Animal not found' });
        res.json({ success: true });
    });
});

// BREEDING ROUTES

app.get('/api/breedings', (req, res) => {
    const query = `
        SELECT b.*, 
               m.name as maleName, m.species as maleSpecies,
               f.name as femaleName, f.species as femaleSpecies
        FROM breedings b
        LEFT JOIN animals m ON b.maleId = m.id
        LEFT JOIN animals f ON b.femaleId = f.id
        ORDER BY b.createdAt DESC
    `;
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
        function(err) {
            if (err) return res.status(500).json({ error: err.message });
            res.json({ id, success: true });
        });
});

app.put('/api/breedings/:id', (req, res) => {
    const { status, actualDate, offspring, notes } = req.body;
    const updatedAt = new Date().toISOString();

    db.run(`UPDATE breedings SET status = ?, actualDate = ?, offspring = ?, notes = ?, updatedAt = ? WHERE id = ?`,
        [status, actualDate, offspring, notes, updatedAt, req.params.id],
        function(err) {
            if (err) return res.status(500).json({ error: err.message });
            res.json({ success: true });
        });
});

app.delete('/api/breedings/:id', (req, res) => {
    db.run("DELETE FROM breedings WHERE id = ?", [req.params.id], function(err) {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ success: true });
    });
});

// HATCHING ROUTES

app.get('/api/hatchings', (req, res) => {
    db.all("SELECT * FROM hatchings ORDER BY createdAt DESC", (err, rows) => {
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
        function(err) {
            if (err) return res.status(500).json({ error: err.message });
            res.json({ id, success: true });
        });
});

app.put('/api/hatchings/:id', (req, res) => {
    const { status, actualHatchDate, hatchedEggs, temperature, humidity, notes } = req.body;
    const updatedAt = new Date().toISOString();

    db.run(`UPDATE hatchings SET status = ?, actualHatchDate = ?, hatchedEggs = ?, temperature = ?, humidity = ?, notes = ?, updatedAt = ? WHERE id = ?`,
        [status, actualHatchDate, hatchedEggs, temperature, humidity, notes, updatedAt, req.params.id],
        function(err) {
            if (err) return res.status(500).json({ error: err.message });
            res.json({ success: true });
        });
});

app.delete('/api/hatchings/:id', (req, res) => {
    db.run("DELETE FROM hatchings WHERE id = ?", [req.params.id], function(err) {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ success: true });
    });
});

// Statistics
app.get('/api/stats', (req, res) => {
    const stats = {};

    db.all("SELECT status, COUNT(*) as count FROM animals GROUP BY status", (err, animalStats) => {
        if (err) return res.status(500).json({ error: err.message });
        stats.animals = animalStats;

        db.all("SELECT status, COUNT(*) as count FROM breedings GROUP BY status", (err, breedingStats) => {
            if (err) return res.status(500).json({ error: err.message });
            stats.breedings = breedingStats;

            db.all("SELECT status, COUNT(*) as count FROM hatchings GROUP BY status", (err, hatchingStats) => {
                if (err) return res.status(500).json({ error: err.message });
                stats.hatchings = hatchingStats;
                res.json(stats);
            });
        });
    });
});

// Health check
app.get('/api/health', (req, res) => {
    res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

// Global error handler
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({ error: 'Something went wrong!' });
});

// Start server
app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});

// Graceful shutdown
process.on('SIGINT', () => {
    console.log('\nShutting down...');
    db.close((err) => {
        if (err) console.error(err.message);
        else console.log('Database connection closed.');
        process.exit(0);
    });
});
