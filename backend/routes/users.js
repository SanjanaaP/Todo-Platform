const express = require('express');
const router = express.Router();
const { getAllUsers, updateUserRole, deleteUser, updateProfile } = require('../controllers/userController');
const { getDashboard } = require('../controllers/dashboardController');
const { authenticate, adminOnly } = require('../middleware/auth');
const upload = require('../middleware/upload');

router.use(authenticate);

// Dashboard
router.get('/dashboard', getDashboard);

// Profile
router.put('/profile', upload.single('avatar'), updateProfile);

// Admin routes
router.get('/', adminOnly, getAllUsers);
router.put('/:id/role', adminOnly, updateUserRole);
router.delete('/:id', adminOnly, deleteUser);

module.exports = router;