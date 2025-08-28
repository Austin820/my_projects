// Database connection and utility functions for NexaLearn Affiliate System
const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');

class Database {
    constructor() {
        this.dbPath = path.join(__dirname, 'database.db');
        this.initSqlPath = path.join(__dirname, 'init.sql');
        this.db = null;
    }

    // Initialize database connection
    async connect() {
        return new Promise((resolve, reject) => {
            this.db = new sqlite3.Database(this.dbPath, (err) => {
                if (err) {
                    console.error('Error opening database:', err.message);
                    reject(err);
                } else {
                    console.log('Connected to SQLite database via db.js');
                    this.initializeSchema()
                        .then(() => resolve(this.db))
                        .catch(reject);
                }
            });
        });
    }

    // Initialize database schema
    async initializeSchema() {
        return new Promise((resolve, reject) => {
            if (fs.existsSync(this.initSqlPath)) {
                const initSql = fs.readFileSync(this.initSqlPath, 'utf8');
                this.db.exec(initSql, (err) => {
                    if (err) {
                        console.error('Error initializing database schema:', err.message);
                        reject(err);
                    } else {
                        console.log('Database schema initialized successfully');
                        resolve();
                    }
                });
            } else {
                console.warn('init.sql file not found, skipping schema initialization');
                resolve();
            }
        });
    }

    // Get database instance
    getDatabase() {
        return this.db;
    }

    // Run a query with parameters
    async run(sql, params = []) {
        return new Promise((resolve, reject) => {
            this.db.run(sql, params, function(err) {
                if (err) {
                    reject(err);
                } else {
                    resolve({ id: this.lastID, changes: this.changes });
                }
            });
        });
    }

    // Get single row
    async get(sql, params = []) {
        return new Promise((resolve, reject) => {
            this.db.get(sql, params, (err, row) => {
                if (err) {
                    reject(err);
                } else {
                    resolve(row);
                }
            });
        });
    }

    // Get all rows
    async all(sql, params = []) {
        return new Promise((resolve, reject) => {
            this.db.all(sql, params, (err, rows) => {
                if (err) {
                    reject(err);
                } else {
                    resolve(rows);
                }
            });
        });
    }

    // Close database connection
    async close() {
        return new Promise((resolve, reject) => {
            if (this.db) {
                this.db.close((err) => {
                    if (err) {
                        console.error('Error closing database:', err.message);
                        reject(err);
                    } else {
                        console.log('Database connection closed');
                        resolve();
                    }
                });
            } else {
                resolve();
            }
        });
    }

    // Utility functions for common operations

    // Create a teacher
    async createTeacher(userData) {
        const { username, email, password, full_name, phone } = userData;
        const sql = `
            INSERT INTO Teachers (username, email, password, full_name, phone, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
        `;
        return await this.run(sql, [username, email, password, full_name, phone]);
    }

    // Get teacher by username or email
    async getTeacher(identifier) {
        const sql = `
            SELECT * FROM Teachers 
            WHERE username = ? OR email = ?
        `;
        return await this.get(sql, [identifier, identifier]);
    }

    // Get teacher by ID
    async getTeacherById(id) {
        const sql = `SELECT * FROM Teachers WHERE id = ?`;
        return await this.get(sql, [id]);
    }

    // Update teacher credits
    async updateTeacherCredits(teacherId, amount) {
        const sql = `
            UPDATE Teachers 
            SET credits = credits + ?, total_referrals = total_referrals + 1, updated_at = CURRENT_TIMESTAMP
            WHERE id = ?
        `;
        return await this.run(sql, [amount, teacherId]);
    }

    // Create a student
    async createStudent(userData) {
        const { username, email, password, full_name, phone, referred_by, referral_code } = userData;
        const sql = `
            INSERT INTO Students (username, email, password, full_name, phone, referred_by, referral_code, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
        `;
        return await this.run(sql, [username, email, password, full_name, phone, referred_by, referral_code]);
    }

    // Get student by username or email
    async getStudent(identifier) {
        const sql = `
            SELECT s.*, t.full_name as teacher_name 
            FROM Students s
            LEFT JOIN Teachers t ON s.referred_by = t.id
            WHERE s.username = ? OR s.email = ?
        `;
        return await this.get(sql, [identifier, identifier]);
    }

    // Create admin
    async createAdmin(userData) {
        const { username, email, password, full_name, role = 'admin' } = userData;
        const sql = `
            INSERT INTO Admins (username, email, password, full_name, role, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
        `;
        return await this.run(sql, [username, email, password, full_name, role]);
    }

    // Get admin by username or email
    async getAdmin(identifier) {
        const sql = `
            SELECT * FROM Admins 
            WHERE username = ? OR email = ?
        `;
        return await this.get(sql, [identifier, identifier]);
    }

    // Create referral record
    async createReferral(teacherId, studentId, referralCode, commissionAmount = 50.00) {
        const sql = `
            INSERT INTO Referrals (teacher_id, student_id, referral_code, commission_amount, created_at)
            VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP)
        `;
        return await this.run(sql, [teacherId, studentId, referralCode, commissionAmount]);
    }

    // Get teacher referrals
    async getTeacherReferrals(teacherId) {
        const sql = `
            SELECT r.*, s.full_name as student_name, s.email as student_email, s.created_at as student_joined
            FROM Referrals r
            JOIN Students s ON r.student_id = s.id
            WHERE r.teacher_id = ?
            ORDER BY r.created_at DESC
        `;
        return await this.all(sql, [teacherId]);
    }

    // Create credit redemption request
    async createRedemptionRequest(teacherId, amount, paymentMethod, paymentDetails) {
        const sql = `
            INSERT INTO CreditRedemptions (teacher_id, amount, payment_method, payment_details, requested_at)
            VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP)
        `;
        return await this.run(sql, [teacherId, amount, paymentMethod, paymentDetails]);
    }

    // Get teacher redemption history
    async getTeacherRedemptions(teacherId) {
        const sql = `
            SELECT * FROM CreditRedemptions 
            WHERE teacher_id = ?
            ORDER BY requested_at DESC
        `;
        return await this.all(sql, [teacherId]);
    }

    // Get pending redemptions (admin)
    async getPendingRedemptions() {
        const sql = `
            SELECT cr.*, t.full_name as teacher_name, t.email as teacher_email
            FROM CreditRedemptions cr
            JOIN Teachers t ON cr.teacher_id = t.id
            WHERE cr.status = 'pending'
            ORDER BY cr.requested_at ASC
        `;
        return await this.all(sql);
    }

    // Update redemption status
    async updateRedemptionStatus(redemptionId, status, adminId, notes = null) {
        const sql = `
            UPDATE CreditRedemptions 
            SET status = ?, approved_by = ?, approved_at = CURRENT_TIMESTAMP, notes = ?
            WHERE id = ?
        `;
        return await this.run(sql, [status, adminId, notes, redemptionId]);
    }

    // Get dashboard statistics
    async getDashboardStats() {
        const stats = {};

        // Total teachers
        const teacherCount = await this.get('SELECT COUNT(*) as count FROM Teachers');
        stats.totalTeachers = teacherCount.count;

        // Total students
        const studentCount = await this.get('SELECT COUNT(*) as count FROM Students');
        stats.totalStudents = studentCount.count;

        // Total referrals
        const referralCount = await this.get('SELECT COUNT(*) as count FROM Referrals');
        stats.totalReferrals = referralCount.count;

        // Pending redemptions
        const pendingRedemptions = await this.get('SELECT COUNT(*) as count FROM CreditRedemptions WHERE status = "pending"');
        stats.pendingRedemptions = pendingRedemptions.count;

        return stats;
    }
}

module.exports = Database;