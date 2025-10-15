const express = require('express');
const router = express.Router();
const verifyToken = require('../../core/middleware/verify-token');
const warehousesController = require('./warehouses-controller');

// GET /api/warehouses  -> ambil list warehouse aktif (Disabled = 0)
router.get('/', verifyToken, warehousesController.getWarehouses);

module.exports = router;
