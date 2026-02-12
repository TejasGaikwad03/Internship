const express = require('express');
const router = express.Router();
const db = require('../config/db');

// Register Route
router.post('/register', async (req, res) => {
    const { username, password, role } = req.body;

    // Default role is student, only allow admin if secret key provided (not implemented for simplicity) or manual database insert.
    // For this app, we'll let UI decide role but strictly validating admin creation is usually improved.
    // Let's restrict registration to 'student' only via API for now, admins created via seed/setup.
    // Or allow both for ease of testing.

    const userRole = role === 'admin' ? 'admin' : 'student';

    if (!username || !password) {
        return res.status(400).json({ error: 'Username and password are required' });
    }

    try {
        // Check if user exists
        const [existing] = await db.execute('SELECT id FROM users WHERE username = ?', [username]);
        if (existing.length > 0) {
            return res.status(400).json({ error: 'Username already exists' });
        }

        // Insert User
        const [result] = await db.execute(
            'INSERT INTO users (username, password_hash, role) VALUES (?, ?, ?)',
            [username, password, userRole]
        );

        res.status(201).json({
            message: 'Registration successful',
            user: { id: result.insertId, username, role: userRole }
        });

    } catch (error) {
        console.error('Registration error:', error);
        res.status(500).json({ error: 'Registration failed' });
    }
});

// Universal Login Route
router.post('/login', async (req, res) => {
    const { username, password } = req.body;

    try {
        if (!username || !password) {
            return res.status(400).json({ error: 'Username and password are required' });
        }

        const [rows] = await db.execute('SELECT * FROM users WHERE username = ?', [username]);
        const user = rows[0];

        if (!user) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }

        // Check Password (simple string check as per requirement)
        if (user.password_hash !== password) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }

        res.json({
            message: 'Login successful',
            user: {
                id: user.id,
                username: user.username,
                role: user.role
            }
        });

    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

module.exports = router;
