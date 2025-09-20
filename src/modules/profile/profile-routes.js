const express = require('express');
const verifyToken = require('../../core/middleware/verify-token');
const profileController = require('./profile-controller');

const router = express.Router();

router.use(express.json());

// RESTful endpoints
router.get('/profile', verifyToken, profileController.getProfile);
router.post('/change-password', verifyToken, profileController.changePassword);

module.exports = router;
