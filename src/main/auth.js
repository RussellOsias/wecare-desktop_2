const db = require('../shared/db'); // Database connection module
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs'); // Import bcryptjs for password verification
require('dotenv').config(); // Load environment variables

module.exports = {
    attemptLogin: async ({ email, password }) => {
        try {
            const result = await db.query(
                'SELECT id, first_name, last_name, email, password, role FROM users WHERE email = ? AND role = "officer" LIMIT 1', 
                [email]
            );

            // Ensure rows is treated as an array
            const rows = Array.isArray(result) ? result[0] : [];
            console.log('Query rows:', rows);

            if (!rows || rows.length === 0) {
                return { success: false, message: 'No officer account found with this email' };
            }

            const user = rows[0];
            console.log('Stored hashed password:', user.password);
            console.log('Provided plaintext password:', password);

            // Validate the password
            if (!password || !user.password) {
                console.error('Missing password fields.');
                return { success: false, message: 'Invalid credentials.' };
            }

            const isPasswordValid = bcrypt.compareSync(password, user.password);
            console.log('Is password valid?', isPasswordValid);

            if (isPasswordValid) {
                const token = jwt.sign(
                    { id: user.id, role: user.role, name: `${user.first_name} ${user.last_name}` },
                    process.env.JWT_SECRET || 'your_secret_key',
                    { expiresIn: '8h' }
                );
                console.log('Generated Token:', token);

                return { success: true, token, user: { id: user.id, name: `${user.first_name} ${user.last_name}`, email: user.email, role: user.role } };
            } else {
                console.error('Password validation failed.');
                return { success: false, message: 'Invalid password' };
            }
        } catch (error) {
            console.error('Database error:', error);
            return { success: false, message: 'Database connection error. Please try again later.' };
        }
    },

    validateSession: async (token) => {
        try {
            const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your_secret_key');
            const rows = await db.query(
                'SELECT id, first_name, last_name, email, role FROM users WHERE id = ? AND role = "officer"',
                [decoded.id]
            );

            // Ensure rows is treated as an array
            const rowsArray = Array.isArray(rows) ? rows[0] : [];
            console.log('Session validation rows:', rowsArray);

            if (!rowsArray || rowsArray.length === 0) {
                return { valid: false };
            }

            const user = rowsArray[0];

            return { 
                valid: true,
                user: {
                    id: user.id,
                    name: `${user.first_name} ${user.last_name}`,
                    email: user.email,
                    role: user.role
                }
            };
        } catch (error) {
            console.error('Session validation error:', error);
            return { valid: false };
        }
    }
};