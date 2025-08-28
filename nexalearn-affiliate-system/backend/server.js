require('dotenv').config();

const express = require('express');
const cors = require('cors');
const path = require('path');
const sqlite3 = require('sqlite3').verbose();
const fs = require('fs');

// Import routes
const teacherRoutes = require('./routes/teacherRoutes');
const studentRoutes = require('./routes/studentRoutes');
const adminRoutes = require('./routes/adminRoutes');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Database initialization
const dbPath = path.join(__dirname, 'db', 'database.db');
const initSqlPath = path.join(__dirname, 'db', 'init.sql');

// Create database if it doesn't exist
const db = new sqlite3.Database(dbPath, (err) => {
    if (err) {
        console.error('Error opening database:', err.message);
    } else {
        console.log('Connected to SQLite database');
        
        // Initialize database with schema if empty
        if (fs.existsSync(initSqlPath)) {
            const initSql = fs.readFileSync(initSqlPath, 'utf8');
            db.exec(initSql, (err) => {
                if (err) {
                    console.error('Error initializing database:', err.message);
                } else {
                    console.log('Database initialized successfully');
                }
            });
        }
    }
});

// Make database available to routes
app.locals.db = db;

// Routes
app.use('/api/teacher', teacherRoutes);
app.use('/api/student', studentRoutes);
app.use('/api/admin', adminRoutes);

// Serve static files from frontend
app.use(express.static(path.join(__dirname, '../frontend')));

// Health check endpoint
app.get('/health', (req, res) => {
    res.json({ status: 'OK', message: 'NexaLearn Affiliate System API is running' });
});

// Default route - serve frontend
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, '../frontend/public/teacher-login.html'));
});

// Error handling middleware
app.use((err, req, res, next) => {
    console.error('Error:', err.stack);
    res.status(500).json({ 
        success: false, 
        message: 'Internal server error',
        error: process.env.NODE_ENV === 'development' ? err.message : 'Something went wrong'
    });
});

// 404 handler
app.use('*', (req, res) => {
    res.status(404).json({ success: false, message: 'Route not found' });
});

// Start server
app.listen(PORT, () => {
    console.log(`NexaLearn Affiliate System backend running on port ${PORT}`);
    console.log(`Health check: http://localhost:${PORT}/health`);
});

// Graceful shutdown
process.on('SIGINT', () => {
    console.log('\nShutting down server...');
    db.close((err) => {
        if (err) {
            console.error('Error closing database:', err.message);
        } else {
            console.log('Database connection closed');
        }
        process.exit(0);
    });
});