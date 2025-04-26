const db = require('../shared/db');
const jwt = require('jsonwebtoken');
require('dotenv').config();

module.exports = {
  attemptLogin: async ({ email, password }) => {
    try {
      const [users] = await db.query(
        'SELECT * FROM users WHERE email = ? AND role = "officer" LIMIT 1',
        [email]
      );
      
      if (users.length === 0) {
        return { success: false, message: 'Officer account not found' };
      }

      const user = users[0];
      // In a real app, use bcrypt to compare hashed passwords
      if (password !== user.password) { // TEMPORARY - replace with proper auth
        return { success: false, message: 'Invalid credentials' };
      }

      const token = jwt.sign(
        { id: user.id, role: user.role },
        process.env.JWT_SECRET || 'your_secret_key',
        { expiresIn: '8h' }
      );

      return { 
        success: true, 
        token,
        user: {
          id: user.id,
          name: `${user.first_name} ${user.last_name}`,
          email: user.email
        }
      };
    } catch (error) {
      console.error('Login error:', error);
      return { success: false, message: 'Database error' };
    }
  },

  validateSession: async (token) => {
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your_secret_key');
      const [users] = await db.query('SELECT * FROM users WHERE id = ? AND role = "officer"', [decoded.id]);
      
      if (users.length === 0) {
        return { valid: false };
      }

      return { 
        valid: true,
        user: {
          id: users[0].id,
          name: `${users[0].first_name} ${users[0].last_name}`,
          email: users[0].email
        }
      };
    } catch (error) {
      return { valid: false };
    }
  }
};