const express = require('express');
const router = express.Router();
const verifyToken = require('../../core/middleware/verify-token');
const ctrl = require('./warehouses-controller');

router.get('/', verifyToken, ctrl.getWarehouses);

module.exports = router;
