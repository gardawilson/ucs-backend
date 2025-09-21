const express = require('express');
const router = express.Router();
const verifyToken = require('../../core/middleware/verify-token');
const stockOpnameController = require('./stock-opname-controller');

// GET list Stock Opname
router.get('/', verifyToken, stockOpnameController.getStockOpnameList);

// SIMPAN Stock Opname (Header + Detail Ascend + Families)
router.post('/', verifyToken, stockOpnameController.saveStockOpnameAscend);

// REBUILD Stock Opname (hapus & isi ulang detail ascend)
router.post('/:noSO/rebuild', verifyToken, stockOpnameController.rebuildStockOpnameAscend);

// DELETE full Stock Opname (header + dFamily + ascend + hasil)
router.delete('/:noSO/full', verifyToken, stockOpnameController.deleteStockOpnameFull);

// GET families for specific Stock Opname (by NoSO)
router.get('/:noSO/families', verifyToken, stockOpnameController.getStockOpnameFamilies);

// GET Ascend Data (items) by NoSO & FamilyID
// contoh: GET /api/stock-opname/Q.000003/families/101/items?keyword=door
router.get('/:noSO/families/:familyID/items', verifyToken, stockOpnameController.getStockOpnameAscendData);

// GET qty usage by ItemID & TglSO
// contoh: GET /api/stock-opname/usage/2001?tglSO=2025-09-20
router.get('/usage/:itemId', verifyToken, stockOpnameController.fetchQtyUsage);

// DELETE hasil ascend by NoSO + ItemID
// contoh: DELETE /api/stock-opname/Q.000003/items/2001
router.delete('/:noSO/items/:itemId', verifyToken, stockOpnameController.deleteStockOpnameHasilAscend);

// SAVE/UPSERT hasil ascend
// contoh: POST /api/stock-opname/Q.000003/items/save
router.post('/:noSO/items/save', verifyToken, stockOpnameController.saveStockOpnameAscendHasil);





module.exports = router;
