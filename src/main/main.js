const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const jwt = require('jsonwebtoken');
const auth = require('./auth'); // Import the auth module
require('dotenv').config(); // Load environment variables

const db = require('../shared/db'); // Database connection module
// Conditionally require electron-reloader only in development mode
if (process.env.NODE_ENV === 'development') {
    require('electron-reloader')(module);
}

let mainWindow;

function createWindow() {
    mainWindow = new BrowserWindow({
        width: 1200,
        height: 800,
        minWidth: 800,
        minHeight: 600,
        webPreferences: {
            nodeIntegration: true,
            contextIsolation: false,
        },
        icon: path.join(__dirname, '../../resources/icons/icon.png'),
        show: false // Don't show until ready
    });

    // Load the login page first
    mainWindow.loadFile(path.join(__dirname, '../renderer/views/login.html'));

    // Show when ready
    mainWindow.once('ready-to-show', () => {
        mainWindow.show();
        if (process.env.NODE_ENV === 'development') {
            mainWindow.webContents.openDevTools();
        }
    });

    mainWindow.on('closed', () => {
        mainWindow = null;
    });
}

app.whenReady().then(() => {
    createWindow();

    // Auth IPC Handlers
    ipcMain.handle('attempt-login', async (event, credentials) => {
        try {
            console.log('Executing login query with email:', credentials.email);
            const result = await auth.attemptLogin(credentials);

            if (!result.success) {
                return { success: false, message: result.message };
            }

            // Send the token to the renderer process after login success
            event.sender.send('login-success', result.token);
            return { success: true, token: result.token, user: result.user };
        } catch (error) {
            console.error('Error during login:', error);
            return { success: false, message: 'An error occurred. Please try again.' };
        }
    });

    ipcMain.handle('validate-session', async (event, token) => {
        try {
            if (!token) {
                console.log('No token provided.');
                return { valid: false };
            }
    
            const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your_secret_key');
            console.log('Decoded token:', decoded);
    
            const [rows] = await db.query(
                'SELECT id, first_name, last_name, email, role FROM users WHERE id = ? AND role = "officer"',
                [decoded.id]
            );
    
            if (Array.isArray(rows) && rows.length > 0) {
                const user = rows[0];
                console.log('Session validation successful. User:', user);
                return { valid: true, user };
            } else {
                console.log('Session validation failed. No matching user found.');
                return { valid: false };
            }
        } catch (error) {
            console.error('Error validating session:', error);
            return { valid: false };
        }
    });
    
    // Officer Stats Handler
    ipcMain.handle('get-officer-stats', async (event, officerId) => {
        try {
            console.log('Fetching officer stats for officer ID:', officerId);
    
            // Fetch complaints from the complaints table
            const [rows] = await db.query(`
                SELECT 
                  COUNT(*) as totalComplaints,
                  SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END) as pendingComplaints,
                  SUM(CASE WHEN status = 'in_progress' THEN 1 ELSE 0 END) as inProgressComplaints
                FROM complaints 
                WHERE assigned_officer_id = ?
            `, [officerId]);
    
            // Fetch resolved complaints from history_complaints
            const [resolvedRows] = await db.query(`
                SELECT COUNT(*) as resolvedComplaints
                FROM history_complaints
                WHERE assigned_officer_id = ? AND status = 'resolved'
            `, [officerId]);
    
            // Combine results
            const result = {
                totalComplaints: rows[0].totalComplaints || 0,
                pendingComplaints: rows[0].pendingComplaints || 0,
                inProgressComplaints: rows[0].inProgressComplaints || 0,
                resolvedComplaints: resolvedRows[0].resolvedComplaints || 0
            };
    
            return result;
        } catch (error) {
            console.error('Error fetching officer stats:', error);
            throw error;
        }
    });

    ipcMain.handle('get-recent-resolved-complaints', async (event, officerId) => {
        try {
            console.log('Fetching recent resolved complaints for officer ID:', officerId);
            const [rows] = await db.query(`
                SELECT c.id, c.title, c.status, c.created_at, 
                       CONCAT(u.first_name, ' ', u.last_name) as resident_name
                FROM history_complaints c
                JOIN users u ON c.resident_id = u.id
                WHERE c.assigned_officer_id = ? AND c.status = 'resolved'
                ORDER BY c.created_at DESC
                LIMIT 5
            `, [officerId]);
            const result = Array.isArray(rows) ? rows : rows ? [rows] : [];
            console.log('Recent resolved complaints query result:', result);
            return result;
        } catch (error) {
            console.error('Error fetching recent resolved complaints:', error);
            throw error;
        }
    });

    // Recent Complaints Handler
    ipcMain.handle('get-recent-complaints', async (event, officerId) => {
        try {
            const [rows] = await db.query(`
                SELECT c.id, c.title, c.status, c.created_at, 
                       CONCAT(u.first_name, ' ', u.last_name) as resident_name
                FROM complaints c
                JOIN users u ON c.resident_id = u.id
                WHERE c.assigned_officer_id = ?
                ORDER BY c.created_at DESC
                LIMIT 5
            `, [officerId]);
            const result = Array.isArray(rows) ? rows : rows ? [rows] : [];
            return result;
        } catch (error) {
            console.error('Error fetching recent complaints:', error);
            throw error;
        }
    });

    // Get Officer Complaints Handler
    ipcMain.handle('get-officer-complaints', async (event, { officerId, status, search }) => {
        try {
            let query = `
                SELECT c.id, c.title, c.status, c.created_at, c.description, 
                       CONCAT(u.first_name, ' ', u.last_name) as resident_name
                FROM complaints c
                JOIN users u ON c.resident_id = u.id
                WHERE c.assigned_officer_id = ?
            `;
            const params = [officerId];
            if (status && status !== 'all') {
                query += ` AND c.status = ?`;
                params.push(status);
            }
            if (search) {
                query += ` AND (c.title LIKE ? OR c.description LIKE ?)`;
                params.push(`%${search}%`, `%${search}%`);
            }
            query += ' ORDER BY c.created_at DESC';
            const [rows] = await db.query(query, params);
            const result = Array.isArray(rows) ? rows : rows ? [rows] : [];
            return result;
        } catch (error) {
            console.error('Error fetching officer complaints:', error);
            throw error;
        }
    });

    // Get Complaint Details Handler
    ipcMain.handle('get-complaint-details', async (event, complaintId) => {
        try {
            const [rows] = await db.query(`
                SELECT c.id, c.title, c.status, c.created_at, 
                       CONCAT(u.first_name, ' ', u.last_name) as resident_name,
                       c.description, c.priority, c.assigned_personnel
                FROM complaints c
                JOIN users u ON c.resident_id = u.id
                WHERE c.id = ?
            `, [complaintId]);
            if (!rows || rows.length === 0) {
                throw new Error('Complaint not found');
            }
            const complaint = rows[0];
            if (complaint.assigned_personnel === null) {
                complaint.assigned_personnel = 'Unassigned';
            }
            return complaint;
        } catch (error) {
            console.error('Error fetching complaint details:', error);
            throw error;
        }
    });

    
    // Handle personnel assignment and resolution
    ipcMain.handle('assign-personnel-and-resolve', async (event, { complaintId, personnel, resolvedBy, resolvedAt }) => {
        if (!complaintId || !personnel || !resolvedBy || !resolvedAt) {
            console.error('Missing required parameters for assign-personnel-and-resolve');
            return { success: false, error: 'Missing required parameters' };
        }
        try {
            // Fetch the complaint details
            const [rows] = await db.query('SELECT * FROM complaints WHERE id = ?', [complaintId]);
            if (!rows || rows.length === 0) {
                throw new Error('Complaint not found');
            }
            const complaint = rows[0];
    
            // Move the complaint to history_complaints
            await db.query(`
                INSERT INTO history_complaints (
                    id, title, status, created_at, description, priority, 
                    resident_id, assigned_officer_id, assigned_personnel, 
                    resolution_notes, resolved_by, resolved_at
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            `, [
                complaint.id, complaint.title, 'resolved', complaint.created_at, complaint.description,
                complaint.priority, complaint.resident_id, complaint.assigned_officer_id, personnel,
                '', resolvedBy, resolvedAt
            ]);
    
            // Delete the complaint from the complaints table
            await db.query('DELETE FROM complaints WHERE id = ?', [complaintId]);
    
            console.log(`Complaint ID ${complaintId} resolved and moved to history.`);
            return { success: true };
        } catch (error) {
            console.error('Error assigning personnel and resolving complaint:', error);
            return { success: false, error: error.message };
        }
    });
    // Submit Complaint Resolution Handler
    ipcMain.handle('submit-complaint-resolution', async (event, { complaintId, resolutionNotes, resolvedBy, resolvedAt }) => {
        try {
            const [rows] = await db.query('SELECT * FROM complaints WHERE id = ?', [complaintId]);
            if (!rows || rows.length === 0) {
                throw new Error('Complaint not found');
            }
            await db.query(`
                UPDATE complaints
                SET status = 'resolved', resolution_notes = ?, resolved_by = ?, resolved_at = ?
                WHERE id = ?
            `, [resolutionNotes, resolvedBy, resolvedAt, complaintId]);
            return { success: true };
        } catch (error) {
            console.error('Error submitting complaint resolution:', error);
            return { success: false, message: 'Failed to submit resolution.' };
        }
    });

    // Get Complaint History Handler
// Get Complaint History Handler
ipcMain.handle('get-complaint-history', async (event, officerId) => {
    try {
        console.log('Fetching complaint history...');
        const [rows] = await db.query(`
            SELECT hc.*, 
                   CONCAT(u1.first_name, ' ', u1.last_name) AS resident_name,
                   CONCAT(u2.first_name, ' ', u2.last_name) AS assigned_officer_name
            FROM history_complaints hc
            LEFT JOIN users u1 ON hc.resident_id = u1.id
            LEFT JOIN users u2 ON hc.assigned_officer_id = u2.id
            WHERE hc.assigned_officer_id = ?
            ORDER BY hc.created_at DESC
        `, [officerId]);
        const result = Array.isArray(rows) ? rows : [];
        console.log('Fetched complaint history:', result);
        return result;
    } catch (error) {
        console.error('Error fetching complaint history:', error);
        throw error;
    }
});

ipcMain.handle('get-user-profile', async (event, userId) => {
    try {
      const [rows] = await db.query(
        'SELECT id, first_name, middle_name, last_name, email, phone_number, address, profile_picture FROM users WHERE id = ?',
        [userId]
      );
      const user = Array.isArray(rows) && rows.length > 0 ? rows[0] : null;
      if (!user) throw new Error('User not found');
      return user;
    } catch (error) {
      console.error('Error fetching user profile:', error);
      throw error;
    }
  });


  ipcMain.handle('update-user-profile', async (event, userData) => {
    try {
      const { id, first_name, middle_name, last_name, email, phone_number, address } = userData;
      await db.query(
        'UPDATE users SET first_name = ?, middle_name = ?, last_name = ?, email = ?, phone_number = ?, address = ? WHERE id = ?',
        [first_name, middle_name, last_name, email, phone_number, address, id]
      );
      return true;
    } catch (error) {
      console.error('Error updating user profile:', error);
      throw error;
    }
  });

});

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        app.quit();
    }
});

app.on('activate', () => {
    if (mainWindow === null) {
        createWindow();
    }
});