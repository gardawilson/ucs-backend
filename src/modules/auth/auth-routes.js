const express = require('express');
const router = express.Router();
const authController = require('./auth-controller');

// parse JSON
router.use(express.json());

// endpoint login
router.post('/login', authController.login);

module.exports = router;
