// server.js - Express server with SQLite backend
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

// Create uploads directory if it doesn't exist
const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir);
}

// Serve static files (images)
app.use('/uploads', express.static('uploads'));

// Multer configuration for file uploads
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, 'uploads/');
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
    }
});

const upload = multer({ storage: storage });

// Initialize SQLite database
const db = new sqlite3.Database('animal_tracker.db', (err) => {
    if (err) {
        console.error('Error opening database:', err.message);
    } else {
        console.log('Connected to SQLite database.');
    }
});

// Create tables
db.serialize(() => {
    // Animals table
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

    // Breedings table
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
    FOREIGN KEY (maleId) REFERENCES animals (id),
    FOREIGN KEY (femaleId) REFERENCES animals (id)
  )`);

    // Hatchings table
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

    console.log('Database tables created successfully.');
});

// ANIMALS ENDPOINTS

// Get all animals
app.get('/api/animals', (req, res) => {
    db.all("SELECT * FROM animals ORDER BY createdAt DESC", (err, rows) => {
        if (err) {
            res.status(500).json({ error: err.message });
            return;
        }
        res.json(rows);
    });
});

// Get single animal
app.get('/api/animals/:id', (req, res) => {
    const { id } = req.params;
    db.get("SELECT * FROM animals WHERE id = ?", [id], (err, row) => {
        if (err) {
            res.status(500).json({ error: err.message });
            return;
        }
        if (!row) {
            res.status(404).json({ error: 'Animal not found' });
            return;
        }
        res.json(row);
    });
});

// Create animal
app.post('/api/animals', (req, res) => {
    const { id, name, species, breed, color, sex, dateOfBirth, status, notes, image } = req.body;
    const createdAt = new Date().toISOString();
    const updatedAt = createdAt;

    db.run(
        "INSERT INTO animals (id, name, species, breed, color, sex, dateOfBirth, status, notes, image, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)", [id, name, species, breed, color, sex, dateOfBirth, status, notes, image, createdAt, updatedAt],
        function(err) {
            if (err) {
                res.status(500).json({ error: err.message });
                return;
            }
            res.json({ id: this.lastID, success: true });
        }
    );
});

// Update animal
app.put('/api/animals/:id', (req, res) => {
    const { id } = req.params;
    const { name, species, breed, color, sex, dateOfBirth, status, notes, image } = req.body;
    const updatedAt = new Date().toISOString();

    db.run(
        "UPDATE animals SET name = ?, species = ?, breed = ?, color = ?, sex = ?, dateOfBirth = ?, status = ?, notes = ?, image = ?, updatedAt = ? WHERE id = ?", [name, species, breed, color, sex, dateOfBirth, status, notes, image, updatedAt, id],
        function(err) {
            if (err) {
                res.status(500).json({ error: err.message });
                return;
            }
            if (this.changes === 0) {
                res.status(404).json({ error: 'Animal not found' });
                return;
            }
            res.json({ success: true });
        }
    );
});

// Delete animal
app.delete('/api/animals/:id', (req, res) => {
    const { id } = req.params;

    db.run("DELETE FROM animals WHERE id = ?", [id], function(err) {
        if (err) {
            res.status(500).json({ error: err.message });
            return;
        }
        if (this.changes === 0) {
            res.status(404).json({ error: 'Animal not found' });
            return;
        }
        res.json({ success: true });
    });
});

// BREEDING ENDPOINTS

// Get all breedings with animal details
app.get('/api/breedings', (req, res) => {
    const query = `
    SELECT 
      b.*,
      m.name as maleName,
      m.species as maleSpecies,
      f.name as femaleName,
      f.species as femaleSpecies
    FROM breedings b
    LEFT JOIN animals m ON b.maleId = m.id
    LEFT JOIN animals f ON b.femaleId = f.id
    ORDER BY b.createdAt DESC
  `;

    db.all(query, (err, rows) => {
        if (err) {
            console.error('Database error:', err);
            res.status(500).json({ error: err.message });
            return;
        }
        console.log('Retrieved breedings:', rows); // Debug log
        res.json(rows);
    });
});

// Create breeding record
app.post('/api/breedings', (req, res) => {
    const { id, maleId, femaleId, breedingDate, gestationDays, expectedDate, notes } = req.body;
    const createdAt = new Date().toISOString();
    const updatedAt = createdAt;

    db.run(
        "INSERT INTO breedings (id, maleId, femaleId, breedingDate, gestationDays, expectedDate, notes, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)", [id, maleId, femaleId, breedingDate, gestationDays || 31, expectedDate, notes, createdAt, updatedAt],
        function(err) {
            if (err) {
                res.status(500).json({ error: err.message });
                return;
            }
            res.json({ success: true });
        }
    );
});

// Update breeding record
app.put('/api/breedings/:id', (req, res) => {
    const { id } = req.params;
    const { status, actualDate, offspring, notes } = req.body;
    const updatedAt = new Date().toISOString();

    db.run(
        "UPDATE breedings SET status = ?, actualDate = ?, offspring = ?, notes = ?, updatedAt = ? WHERE id = ?", [status, actualDate, offspring, notes, updatedAt, id],
        function(err) {
            if (err) {
                res.status(500).json({ error: err.message });
                return;
            }
            res.json({ success: true });
        }
    );
});

// Delete breeding record
app.delete('/api/breedings/:id', (req, res) => {
    const { id } = req.params;

    db.run("DELETE FROM breedings WHERE id = ?", [id], function(err) {
        if (err) {
            res.status(500).json({ error: err.message });
            return;
        }
        res.json({ success: true });
    });
});

// HATCHING ENDPOINTS

// Get all hatchings
app.get('/api/hatchings', (req, res) => {
    db.all("SELECT * FROM hatchings ORDER BY createdAt DESC", (err, rows) => {
        if (err) {
            res.status(500).json({ error: err.message });
            return;
        }
        res.json(rows);
    });
});

// Create hatching record
app.post('/api/hatchings', (req, res) => {
    const { id, name, totalEggs, startDate, incubationDays, expectedHatchDate, temperature, humidity, notes } = req.body;
    const createdAt = new Date().toISOString();
    const updatedAt = createdAt;

    db.run(
        "INSERT INTO hatchings (id, name, totalEggs, startDate, incubationDays, expectedHatchDate, temperature, humidity, notes, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)", [id, name, totalEggs, startDate, incubationDays, expectedHatchDate, temperature, humidity, notes, createdAt, updatedAt],
        function(err) {
            if (err) {
                res.status(500).json({ error: err.message });
                return;
            }
            res.json({ success: true });
        }
    );
});

// Update hatching record
app.put('/api/hatchings/:id', (req, res) => {
    const { id } = req.params;
    const { status, actualHatchDate, hatchedEggs, temperature, humidity, notes } = req.body;
    const updatedAt = new Date().toISOString();

    db.run(
        "UPDATE hatchings SET status = ?, actualHatchDate = ?, hatchedEggs = ?, temperature = ?, humidity = ?, notes = ?, updatedAt = ? WHERE id = ?", [status, actualHatchDate, hatchedEggs, temperature, humidity, notes, updatedAt, id],
        function(err) {
            if (err) {
                res.status(500).json({ error: err.message });
                return;
            }
            res.json({ success: true });
        }
    );
});

// Delete hatching record
app.delete('/api/hatchings/:id', (req, res) => {
    const { id } = req.params;

    db.run("DELETE FROM hatchings WHERE id = ?", [id], function(err) {
        if (err) {
            res.status(500).json({ error: err.message });
            return;
        }
        res.json({ success: true });
    });
});

// Get breeding/hatching statistics
app.get('/api/stats', (req, res) => {
    const stats = {};

    // Get animal counts by status
    db.all("SELECT status, COUNT(*) as count FROM animals GROUP BY status", (err, animalStats) => {
        if (err) {
            res.status(500).json({ error: err.message });
            return;
        }
        stats.animals = animalStats;

        // Get breeding stats
        db.all("SELECT status, COUNT(*) as count FROM breedings GROUP BY status", (err, breedingStats) => {
            if (err) {
                res.status(500).json({ error: err.message });
                return;
            }
            stats.breedings = breedingStats;

            // Get hatching stats
            db.all("SELECT status, COUNT(*) as count FROM hatchings GROUP BY status", (err, hatchingStats) => {
                if (err) {
                    res.status(500).json({ error: err.message });
                    return;
                }
                stats.hatchings = hatchingStats;
                res.json(stats);
            });
        });
    });
});

// Health check endpoint
app.get('/api/health', (req, res) => {
    res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

// Error handling middleware
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({ error: 'Something went wrong!' });
});

// Start server
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
    console.log(`Database: animal_tracker.db`);
    console.log(`API endpoints available at http://localhost:${PORT}/api`);
});

// Graceful shutdown
process.on('SIGINT', () => {
    console.log('\nShutting down server...');
    db.close((err) => {
        if (err) {
            console.error(err.message);
        } else {
            console.log('Database connection closed.');
        }
        process.exit(0);
    });
});