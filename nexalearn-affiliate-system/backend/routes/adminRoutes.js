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

// Middleware to verify admin role
const verifyAdmin = (req, res, next) => {
    if (req.user.type !== 'admin') {
        return res.status(403).json({ success: false, message: 'Admin access required' });
    }
    next();
};

// POST /api/admin/signup
router.post('/signup', [
    body('username').isLength({ min: 3 }).withMessage('Username must be at least 3 characters'),
    body('email').isEmail().withMessage('Valid email is required'),
    body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
    body('full_name').notEmpty().withMessage('Full name is required')
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

        const { username, email, password, full_name } = req.body;
        const db = req.app.locals.db;

        // Check if admin already exists
        db.get('SELECT id FROM Admins WHERE username = ? OR email = ?', [username, email], async (err, row) => {
            if (err) {
                return res.status(500).json({ success: false, message: 'Database error' });
            }

            if (row) {
                return res.status(400).json({ success: false, message: 'Username or email already exists' });
            }

            // Hash password
            const hashedPassword = await bcrypt.hash(password, 10);

            // Insert new admin
            const sql = 'INSERT INTO Admins (username, email, password, full_name) VALUES (?, ?, ?, ?)';
            db.run(sql, [username, email, hashedPassword, full_name], function(err) {
                if (err) {
                    return res.status(500).json({ success: false, message: 'Failed to create admin account' });
                }

                res.status(201).json({
                    success: true,
                    message: 'Admin account created successfully',
                    admin_id: this.lastID
                });
            });
        });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Server error' });
    }
});

// POST /api/admin/login
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

        db.get('SELECT * FROM Admins WHERE username = ? OR email = ?', [username, username], async (err, admin) => {
            if (err) {
                return res.status(500).json({ success: false, message: 'Database error' });
            }

            if (!admin) {
                return res.status(401).json({ success: false, message: 'Invalid credentials' });
            }

            const isValidPassword = await bcrypt.compare(password, admin.password);
            if (!isValidPassword) {
                return res.status(401).json({ success: false, message: 'Invalid credentials' });
            }

            // Generate JWT token
            const token = jwt.sign(
                { id: admin.id, username: admin.username, type: 'admin' },
                JWT_SECRET,
                { expiresIn: '7d' }
            );

            res.json({
                success: true,
                message: 'Login successful',
                token,
                admin: {
                    id: admin.id,
                    username: admin.username,
                    email: admin.email,
                    full_name: admin.full_name,
                    role: admin.role
                }
            });
        });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Server error' });
    }
});

// GET /api/admin/dashboard
router.get('/dashboard', authenticateToken, verifyAdmin, (req, res) => {
    try {
        const db = req.app.locals.db;

        // Get system statistics
        const statsQuery = `
            SELECT 
                (SELECT COUNT(*) FROM Teachers) as total_teachers,
                (SELECT COUNT(*) FROM Students) as total_students,
                (SELECT COUNT(*) FROM Referrals) as total_referrals,
                (SELECT COUNT(*) FROM CreditRedemptions WHERE status = 'pending') as pending_redemptions,
                (SELECT COALESCE(SUM(amount), 0) FROM CreditRedemptions WHERE status = 'pending') as pending_amount,
                (SELECT COALESCE(SUM(credits), 0) FROM Teachers) as total_teacher_credits
        `;

        db.get(statsQuery, [], (err, stats) => {
            if (err) {
                return res.status(500).json({ success: false, message: 'Database error' });
            }

            // Get recent activities
            const activitiesQuery = `
                SELECT 'redemption' as type, cr.id, cr.amount, cr.status, cr.requested_at as created_at, 
                       t.username, t.full_name
                FROM CreditRedemptions cr
                JOIN Teachers t ON cr.teacher_id = t.id
                WHERE cr.status = 'pending'
                ORDER BY cr.requested_at DESC
                LIMIT 10
            `;

            db.all(activitiesQuery, [], (err, activities) => {
                if (err) {
                    return res.status(500).json({ success: false, message: 'Database error' });
                }

                // Get top teachers by referrals
                const topTeachersQuery = `
                    SELECT t.username, t.full_name, t.credits, t.total_referrals,
                           COUNT(r.id) as active_referrals
                    FROM Teachers t
                    LEFT JOIN Referrals r ON t.id = r.teacher_id
                    GROUP BY t.id
                    ORDER BY t.total_referrals DESC
                    LIMIT 5
                `;

                db.all(topTeachersQuery, [], (err, topTeachers) => {
                    if (err) {
                        return res.status(500).json({ success: false, message: 'Database error' });
                    }

                    res.json({
                        success: true,
                        data: {
                            stats: {
                                total_teachers: stats.total_teachers || 0,
                                total_students: stats.total_students || 0,
                                total_referrals: stats.total_referrals || 0,
                                pending_redemptions: stats.pending_redemptions || 0,
                                pending_amount: stats.pending_amount || 0,
                                total_teacher_credits: stats.total_teacher_credits || 0
                            },
                            recent_activities: activities,
                            top_teachers: topTeachers
                        }
                    });
                });
            });
        });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Server error' });
    }
});

// POST /api/admin/approve-redemption
router.post('/approve-redemption', authenticateToken, verifyAdmin, [
    body('redemption_id').isInt().withMessage('Valid redemption ID is required'),
    body('action').isIn(['approve', 'reject']).withMessage('Action must be approve or reject'),
    body('notes').optional().isString()
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

        const { redemption_id, action, notes } = req.body;
        const adminId = req.user.id;
        const db = req.app.locals.db;

        // Get redemption details
        db.get('SELECT * FROM CreditRedemptions WHERE id = ?', [redemption_id], (err, redemption) => {
            if (err) {
                return res.status(500).json({ success: false, message: 'Database error' });
            }

            if (!redemption) {
                return res.status(404).json({ success: false, message: 'Redemption not found' });
            }

            if (redemption.status !== 'pending') {
                return res.status(400).json({ success: false, message: 'Redemption already processed' });
            }

            const newStatus = action === 'approve' ? 'approved' : 'rejected';
            const updateSql = `
                UPDATE CreditRedemptions 
                SET status = ?, approved_at = CURRENT_TIMESTAMP, approved_by = ?, notes = ?
                WHERE id = ?
            `;

            db.run(updateSql, [newStatus, adminId, notes || null, redemption_id], (err) => {
                if (err) {
                    return res.status(500).json({ success: false, message: 'Failed to update redemption' });
                }

                // If rejected, refund credits to teacher
                if (action === 'reject') {
                    db.run('UPDATE Teachers SET credits = credits + ? WHERE id = ?', 
                        [redemption.amount, redemption.teacher_id], (err) => {
                            if (err) {
                                console.error('Failed to refund credits:', err);
                            }
                        });
                }

                res.json({
                    success: true,
                    message: `Redemption ${action}d successfully`
                });
            });
        });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Server error' });
    }
});

// GET /api/admin/redemptions
router.get('/redemptions', authenticateToken, verifyAdmin, (req, res) => {
    try {
        const db = req.app.locals.db;
        const { status = 'all', page = 1, limit = 20 } = req.query;

        let whereClause = '';
        const params = [];

        if (status !== 'all') {
            whereClause = 'WHERE cr.status = ?';
            params.push(status);
        }

        const offset = (page - 1) * limit;
        params.push(parseInt(limit), offset);

        const query = `
            SELECT cr.*, t.username, t.full_name, t.email,
                   a.username as approved_by_username
            FROM CreditRedemptions cr
            JOIN Teachers t ON cr.teacher_id = t.id
            LEFT JOIN Admins a ON cr.approved_by = a.id
            ${whereClause}
            ORDER BY cr.requested_at DESC
            LIMIT ? OFFSET ?
        `;

        db.all(query, params, (err, redemptions) => {
            if (err) {
                return res.status(500).json({ success: false, message: 'Database error' });
            }

            // Get total count for pagination
            const countQuery = `SELECT COUNT(*) as total FROM CreditRedemptions cr ${whereClause}`;
            const countParams = status !== 'all' ? [status] : [];

            db.get(countQuery, countParams, (err, countResult) => {
                if (err) {
                    return res.status(500).json({ success: false, message: 'Database error' });
                }

                res.json({
                    success: true,
                    data: {
                        redemptions,
                        pagination: {
                            current_page: parseInt(page),
                            total_pages: Math.ceil(countResult.total / limit),
                            total_records: countResult.total,
                            per_page: parseInt(limit)
                        }
                    }
                });
            });
        });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Server error' });
    }
});

// GET /api/admin/teachers
router.get('/teachers', authenticateToken, verifyAdmin, (req, res) => {
    try {
        const db = req.app.locals.db;
        const { page = 1, limit = 20 } = req.query;
        const offset = (page - 1) * limit;

        const query = `
            SELECT t.id, t.username, t.email, t.full_name, t.credits, t.total_referrals,
                   t.created_at, COUNT(r.id) as active_referrals
            FROM Teachers t
            LEFT JOIN Referrals r ON t.id = r.teacher_id AND r.status = 'active'
            GROUP BY t.id
            ORDER BY t.created_at DESC
            LIMIT ? OFFSET ?
        `;

        db.all(query, [parseInt(limit), offset], (err, teachers) => {
            if (err) {
                return res.status(500).json({ success: false, message: 'Database error' });
            }

            // Get total count
            db.get('SELECT COUNT(*) as total FROM Teachers', [], (err, countResult) => {
                if (err) {
                    return res.status(500).json({ success: false, message: 'Database error' });
                }

                res.json({
                    success: true,
                    data: {
                        teachers,
                        pagination: {
                            current_page: parseInt(page),
                            total_pages: Math.ceil(countResult.total / limit),
                            total_records: countResult.total,
                            per_page: parseInt(limit)
                        }
                    }
                });
            });
        });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Server error' });
    }
});

module.exports = router;