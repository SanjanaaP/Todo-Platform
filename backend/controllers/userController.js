const pool = require('../config/db');
const bcrypt = require('bcryptjs');

// GET /api/users
const getAllUsers = async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT id, name, email, role, avatar, created_at FROM users ORDER BY created_at DESC'
    );
    res.json({ success: true, users: result.rows });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to fetch users.' });
  }
};

// PUT /api/users/:id/role
const updateUserRole = async (req, res) => {
  try {
    const { id } = req.params;
    const { role } = req.body;

    if (!['admin', 'member'].includes(role)) {
      return res.status(400).json({ success: false, message: 'Invalid role.' });
    }

    if (parseInt(id) === req.user.id) {
      return res.status(400).json({ success: false, message: 'Cannot change your own role.' });
    }

    const result = await pool.query(
      'UPDATE users SET role = $1, updated_at = NOW() WHERE id = $2 RETURNING id, name, email, role',
      [role, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'User not found.' });
    }

    res.json({ success: true, message: 'Role updated.', user: result.rows[0] });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to update role.' });
  }
};

// DELETE /api/users/:id
const deleteUser = async (req, res) => {
  try {
    const { id } = req.params;

    if (parseInt(id) === req.user.id) {
      return res.status(400).json({ success: false, message: 'Cannot delete your own account.' });
    }

    const result = await pool.query('DELETE FROM users WHERE id = $1 RETURNING id', [id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'User not found.' });
    }

    res.json({ success: true, message: 'User deleted.' });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to delete user.' });
  }
};

// PUT /api/users/profile
const updateProfile = async (req, res) => {
  try {
    const { name, current_password, new_password } = req.body;
    const userId = req.user.id;

    const userResult = await pool.query('SELECT * FROM users WHERE id = $1', [userId]);
    const user = userResult.rows[0];

    let passwordHash = user.password;

    if (new_password) {
      if (!current_password) {
        return res.status(400).json({ success: false, message: 'Current password required.' });
      }
      const isMatch = await bcrypt.compare(current_password, user.password);
      if (!isMatch) {
        return res.status(401).json({ success: false, message: 'Current password incorrect.' });
      }
      passwordHash = await bcrypt.hash(new_password, 12);
    }

    const avatarPath = req.file ? `/uploads/${req.file.filename}` : user.avatar;

    const result = await pool.query(
      'UPDATE users SET name=$1, password=$2, avatar=$3, updated_at=NOW() WHERE id=$4 RETURNING id, name, email, role, avatar',
      [name || user.name, passwordHash, avatarPath, userId]
    );

    res.json({ success: true, message: 'Profile updated.', user: result.rows[0] });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to update profile.' });
  }
};

module.exports = { getAllUsers, updateUserRole, deleteUser, updateProfile };