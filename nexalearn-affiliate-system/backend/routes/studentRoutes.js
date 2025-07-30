const express = require('express');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { body, validationResult } = require('express-validator');

const router = express.Router();
const JWT_SECRET = process.env.JWT_SECRET || 'nexalearn-secret-key-2024';

// Middleware to verify JWT token
const authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
        return res.status(401).json({ success: false, message: 'Access token required' });
    }

    jwt.verify(token, JWT_SECRET, (err, user) => {
        if (err) {
            return res.status(403).json({ success: false, message: 'Invalid or expired token' });
        }
        req.user = user;
        next();
    });
};

// Generate unique referral code for student
const generateReferralCode = (username) => {
    return 'STU' + username.toUpperCase().slice(0, 3) + Math.random().toString(36).substr(2, 5).toUpperCase();
};

// POST /api/student/signup
router.post('/signup', [
    body('username').isLength({ min: 3 }).withMessage('Username must be at least 3 characters'),
    body('email').isEmail().withMessage('Valid email is required'),
    body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
    body('full_name').notEmpty().withMessage('Full name is required'),
    body('phone').optional().isMobilePhone(),
    body('referral_code').optional().isString()
], async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ 
                success: false, 
                message: 'Validation failed', 
                errors: errors.array() 
            });
        }

        const { username, email, password, full_name, phone, referral_code } = req.body;
        const db = req.app.locals.db;

        // Check if user already exists
        db.get('SELECT id FROM Students WHERE username = ? OR email = ?', [username, email], async (err, row) => {
            if (err) {
                return res.status(500).json({ success: false, message: 'Database error' });
            }

            if (row) {
                return res.status(400).json({ success: false, message: 'Username or email already exists' });
            }

            // Hash password
            const hashedPassword = await bcrypt.hash(password, 10);
            const studentReferralCode = generateReferralCode(username);

            // Handle referral if provided
            let referredBy = null;
            if (referral_code) {
                // Check if referral code belongs to a teacher
                const teacher = await new Promise((resolve, reject) => {
                    db.get('SELECT id, username FROM Teachers WHERE username = ?', [referral_code], (err, row) => {
                        if (err) reject(err);
                        else resolve(row);
                    });
                });

                if (teacher) {
                    referredBy = teacher.id;
                }
            }

            // Insert new student
            const sql = 'INSERT INTO Students (username, email, password, full_name, phone, referred_by, referral_code) VALUES (?, ?, ?, ?, ?, ?, ?)';
            db.run(sql, [username, email, hashedPassword, full_name, phone || null, referredBy, studentReferralCode], function(err) {
                if (err) {
                    return res.status(500).json({ success: false, message: 'Failed to create account' });
                }

                const studentId = this.lastID;

                // If referred by a teacher, create referral record and add credits
                if (referredBy) {
                    const referralSql = 'INSERT INTO Referrals (teacher_id, student_id, referral_code, commission_amount) VALUES (?, ?, ?, ?)';
                    db.run(referralSql, [referredBy, studentId, referral_code, 50.00], function(err) {
                        if (err) {
                            console.error('Failed to create referral record:', err);
                        } else {
                            // Add credits to teacher
                            db.run('UPDATE Teachers SET credits = credits + 50.00, total_referrals = total_referrals + 1 WHERE id = ?', [referredBy], (err) => {
                                if (err) {
                                    console.error('Failed to update teacher credits:', err);
                                }
                            });
                        }
                    });
                }

                res.status(201).json({
                    success: true,
                    message: 'Student account created successfully',
                    student_id: studentId,
                    referral_applied: !!referredBy
                });
            });
        });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Server error' });
    }
});

// POST /api/student/login
router.post('/login', [
    body('username').notEmpty().withMessage('Username is required'),
    body('password').notEmpty().withMessage('Password is required')
], async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ 
                success: false, 
                message: 'Validation failed', 
                errors: errors.array() 
            });
        }

        const { username, password } = req.body;
        const db = req.app.locals.db;

        db.get('SELECT * FROM Students WHERE username = ? OR email = ?', [username, username], async (err, student) => {
            if (err) {
                return res.status(500).json({ success: false, message: 'Database error' });
            }

            if (!student) {
                return res.status(401).json({ success: false, message: 'Invalid credentials' });
            }

            const isValidPassword = await bcrypt.compare(password, student.password);
            if (!isValidPassword) {
                return res.status(401).json({ success: false, message: 'Invalid credentials' });
            }

            // Generate JWT token
            const token = jwt.sign(
                { id: student.id, username: student.username, type: 'student' },
                JWT_SECRET,
                { expiresIn: '7d' }
            );

            // Get referrer info if exists
            let referrer = null;
            if (student.referred_by) {
                const referrerQuery = await new Promise((resolve, reject) => {
                    db.get('SELECT username, full_name FROM Teachers WHERE id = ?', [student.referred_by], (err, row) => {
                        if (err) reject(err);
                        else resolve(row);
                    });
                });
                referrer = referrerQuery;
            }

            res.json({
                success: true,
                message: 'Login successful',
                token,
                student: {
                    id: student.id,
                    username: student.username,
                    email: student.email,
                    full_name: student.full_name,
                    referral_code: student.referral_code,
                    referred_by: referrer
                }
            });
        });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Server error' });
    }
});

// GET /api/student/profile
router.get('/profile', authenticateToken, (req, res) => {
    try {
        const db = req.app.locals.db;
        const studentId = req.user.id;

        db.get('SELECT * FROM Students WHERE id = ?', [studentId], (err, student) => {
            if (err) {
                return res.status(500).json({ success: false, message: 'Database error' });
            }

            if (!student) {
                return res.status(404).json({ success: false, message: 'Student not found' });
            }

            // Get referrer info if exists
            if (student.referred_by) {
                db.get('SELECT username, full_name FROM Teachers WHERE id = ?', [student.referred_by], (err, teacher) => {
                    const referrer = err ? null : teacher;

                    res.json({
                        success: true,
                        data: {
                            id: student.id,
                            username: student.username,
                            email: student.email,
                            full_name: student.full_name,
                            phone: student.phone,
                            referral_code: student.referral_code,
                            referred_by: referrer,
                            created_at: student.created_at
                        }
                    });
                });
            } else {
                res.json({
                    success: true,
                    data: {
                        id: student.id,
                        username: student.username,
                        email: student.email,
                        full_name: student.full_name,
                        phone: student.phone,
                        referral_code: student.referral_code,
                        referred_by: null,
                        created_at: student.created_at
                    }
                });
            }
        });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Server error' });
    }
});

// GET /api/student/referral-status
router.get('/referral-status', authenticateToken, (req, res) => {
    try {
        const db = req.app.locals.db;
        const studentId = req.user.id;

        // Get referral information
        const query = `
            SELECT r.*, t.username as teacher_username, t.full_name as teacher_name
            FROM Referrals r
            JOIN Teachers t ON r.teacher_id = t.id
            WHERE r.student_id = ?
        `;

        db.get(query, [studentId], (err, referral) => {
            if (err) {
                return res.status(500).json({ success: false, message: 'Database error' });
            }

            res.json({
                success: true,
                data: {
                    has_referral: !!referral,
                    referral: referral ? {
                        teacher_username: referral.teacher_username,
                        teacher_name: referral.teacher_name,
                        commission_amount: referral.commission_amount,
                        status: referral.status,
                        created_at: referral.created_at
                    } : null
                }
            });
        });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Server error' });
    }
});

module.exports = router;