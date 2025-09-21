const express = require('express');
const router = express.Router();
const verifyToken = require('../../core/middleware/verify-token');
const categoriesController = require('./categories-controller');

// GET list categories (dengan JWT)
router.get('/', verifyToken, categoriesController.getCategories);

module.exports = router;
