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

// Generate referral code
const generateReferralCode = (username) => {
    return 'REF' + username.toUpperCase().slice(0, 3) + Math.random().toString(36).substr(2, 5).toUpperCase();
};

// POST /api/teacher/signup
router.post('/signup', [
    body('username').isLength({ min: 3 }).withMessage('Username must be at least 3 characters'),
    body('email').isEmail().withMessage('Valid email is required'),
    body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
    body('full_name').notEmpty().withMessage('Full name is required'),
    body('phone').optional().isMobilePhone()
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

        const { username, email, password, full_name, phone } = req.body;
        const db = req.app.locals.db;

        // Check if user already exists
        db.get('SELECT id FROM Teachers WHERE username = ? OR email = ?', [username, email], async (err, row) => {
            if (err) {
                return res.status(500).json({ success: false, message: 'Database error' });
            }

            if (row) {
                return res.status(400).json({ success: false, message: 'Username or email already exists' });
            }

            // Hash password
            const hashedPassword = await bcrypt.hash(password, 10);

            // Insert new teacher
            const sql = 'INSERT INTO Teachers (username, email, password, full_name, phone) VALUES (?, ?, ?, ?, ?)';
            db.run(sql, [username, email, hashedPassword, full_name, phone || null], function(err) {
                if (err) {
                    return res.status(500).json({ success: false, message: 'Failed to create account' });
                }

                res.status(201).json({
                    success: true,
                    message: 'Teacher account created successfully',
                    teacher_id: this.lastID
                });
            });
        });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Server error' });
    }
});

// POST /api/teacher/login
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

        db.get('SELECT * FROM Teachers WHERE username = ? OR email = ?', [username, username], async (err, teacher) => {
            if (err) {
                return res.status(500).json({ success: false, message: 'Database error' });
            }

            if (!teacher) {
                return res.status(401).json({ success: false, message: 'Invalid credentials' });
            }

            const isValidPassword = await bcrypt.compare(password, teacher.password);
            if (!isValidPassword) {
                return res.status(401).json({ success: false, message: 'Invalid credentials' });
            }

            // Generate JWT token
            const token = jwt.sign(
                { id: teacher.id, username: teacher.username, type: 'teacher' },
                JWT_SECRET,
                { expiresIn: '7d' }
            );

            res.json({
                success: true,
                message: 'Login successful',
                token,
                teacher: {
                    id: teacher.id,
                    username: teacher.username,
                    email: teacher.email,
                    full_name: teacher.full_name,
                    credits: teacher.credits,
                    total_referrals: teacher.total_referrals
                }
            });
        });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Server error' });
    }
});

// GET /api/teacher/dashboard
router.get('/dashboard', authenticateToken, (req, res) => {
    try {
        const db = req.app.locals.db;
        const teacherId = req.user.id;

        // Get teacher info with referral stats
        const teacherQuery = `
            SELECT t.*, 
                   COUNT(r.id) as total_referrals,
                   COALESCE(SUM(r.commission_amount), 0) as total_earnings
            FROM Teachers t
            LEFT JOIN Referrals r ON t.id = r.teacher_id
            WHERE t.id = ?
            GROUP BY t.id
        `;

        db.get(teacherQuery, [teacherId], (err, teacher) => {
            if (err) {
                return res.status(500).json({ success: false, message: 'Database error' });
            }

            if (!teacher) {
                return res.status(404).json({ success: false, message: 'Teacher not found' });
            }

            // Get recent referrals
            const referralsQuery = `
                SELECT s.full_name, s.email, r.commission_amount, r.created_at, r.status
                FROM Referrals r
                JOIN Students s ON r.student_id = s.id
                WHERE r.teacher_id = ?
                ORDER BY r.created_at DESC
                LIMIT 10
            `;

            db.all(referralsQuery, [teacherId], (err, referrals) => {
                if (err) {
                    return res.status(500).json({ success: false, message: 'Database error' });
                }

                // Get pending redemptions
                const redemptionsQuery = `
                    SELECT * FROM CreditRedemptions 
                    WHERE teacher_id = ? 
                    ORDER BY requested_at DESC
                    LIMIT 5
                `;

                db.all(redemptionsQuery, [teacherId], (err, redemptions) => {
                    if (err) {
                        return res.status(500).json({ success: false, message: 'Database error' });
                    }

                    res.json({
                        success: true,
                        data: {
                            teacher: {
                                id: teacher.id,
                                username: teacher.username,
                                email: teacher.email,
                                full_name: teacher.full_name,
                                credits: teacher.credits,
                                total_referrals: teacher.total_referrals,
                                total_earnings: teacher.total_earnings
                            },
                            referrals,
                            redemptions,
                            referral_link: `${req.protocol}://${req.get('host')}/student-signup.html?ref=${teacher.username}`
                        }
                    });
                });
            });
        });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Server error' });
    }
});

// POST /api/teacher/redeem
router.post('/redeem', authenticateToken, [
    body('amount').isFloat({ min: 10 }).withMessage('Minimum redemption amount is $10'),
    body('payment_method').notEmpty().withMessage('Payment method is required'),
    body('payment_details').notEmpty().withMessage('Payment details are required')
], (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ 
                success: false, 
                message: 'Validation failed', 
                errors: errors.array() 
            });
        }

        const { amount, payment_method, payment_details } = req.body;
        const teacherId = req.user.id;
        const db = req.app.locals.db;

        // Check if teacher has enough credits
        db.get('SELECT credits FROM Teachers WHERE id = ?', [teacherId], (err, teacher) => {
            if (err) {
                return res.status(500).json({ success: false, message: 'Database error' });
            }

            if (!teacher) {
                return res.status(404).json({ success: false, message: 'Teacher not found' });
            }

            if (teacher.credits < amount) {
                return res.status(400).json({ 
                    success: false, 
                    message: 'Insufficient credits for redemption' 
                });
            }

            // Create redemption request
            const sql = 'INSERT INTO CreditRedemptions (teacher_id, amount, payment_method, payment_details) VALUES (?, ?, ?, ?)';
            db.run(sql, [teacherId, amount, payment_method, payment_details], function(err) {
                if (err) {
                    return res.status(500).json({ success: false, message: 'Failed to create redemption request' });
                }

                // Deduct credits from teacher account
                db.run('UPDATE Teachers SET credits = credits - ? WHERE id = ?', [amount, teacherId], (err) => {
                    if (err) {
                        return res.status(500).json({ success: false, message: 'Failed to update credits' });
                    }

                    res.json({
                        success: true,
                        message: 'Redemption request submitted successfully',
                        redemption_id: this.lastID
                    });
                });
            });
        });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Server error' });
    }
});

module.exports = router;