const express = require('express');
const router = express.Router();
const { register, login, getMe } = require('../controllers/authController');
const { registerValidator, loginValidator } = require('../middleware/validate');
const { authenticate } = require('../middleware/auth');

router.post('/register', registerValidator, register);
router.post('/login', loginValidator, login);
router.get('/me', authenticate, getMe);

module.exports = router;