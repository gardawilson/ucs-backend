const express = require('express');
const router = express.Router();
const verifyToken = require('../../core/middleware/verify-token');
const familiesController = require('./families-controller');

// GET list families by categoryIds
// contoh: GET /api/families?categoryIds=1,2,3
router.get('/', verifyToken, familiesController.getFamilies);

module.exports = router;
