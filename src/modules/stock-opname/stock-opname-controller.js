const stockOpnameService = require('./stock-opname-service');

exports.getStockOpnameList = async (req, res) => {
  try {
    const result = await stockOpnameService.getStockOpnameList();
    res.status(200).json(result);
  } catch (err) {
    res.status(500).json({
      success: false,
      message: 'Terjadi kesalahan di server'
    });
  }
};


exports.saveStockOpnameAscend = async (req, res) => {
  try {
    const { tgl, isAscend, selections } = req.body || {};

    if (!tgl) {
      return res.status(400).json({ success: false, message: 'Field tgl wajib diisi' });
    }
    if (!Array.isArray(selections) || selections.length === 0) {
      return res.status(400).json({ success: false, message: 'Field selections minimal 1' });
    }

    const result = await stockOpnameService.saveStockOpnameAscend({ tgl, isAscend, selections });
    res.status(201).json(result);
  } catch (err) {
    res.status(500).json({
      success: false,
      message: 'Terjadi kesalahan di server',
      detail: err.message
    });
  }
};


exports.rebuildStockOpnameAscend = async (req, res) => {
  try {
    const { noSO } = req.params;
    const { tgl, isAscend, selections } = req.body || {};

    if (!noSO) {
      return res.status(400).json({ success: false, message: 'Field noSO wajib diisi' });
    }
    if (!tgl) {
      return res.status(400).json({ success: false, message: 'Field tgl wajib diisi' });
    }
    if (!Array.isArray(selections) || selections.length === 0) {
      return res.status(400).json({ success: false, message: 'Field selections minimal 1' });
    }

    const result = await stockOpnameService.rebuildStockOpnameAscend({ noSO, tgl, isAscend, selections });
    res.status(200).json(result);
  } catch (err) {
    res.status(500).json({
      success: false,
      message: 'Terjadi kesalahan di server',
      detail: err.message
    });
  }
};


exports.getStockOpnameSelections = async (req, res) => {
  try {
    const { noSO } = req.params;

    if (!noSO) {
      return res.status(400).json({
        success: false,
        message: 'Parameter noSO wajib diisi'
      });
    }

    const result = await stockOpnameService.getStockOpnameSelections(noSO);
    res.status(200).json(result);
  } catch (err) {
    res.status(500).json({
      success: false,
      message: 'Terjadi kesalahan di server',
      detail: err.message
    });
  }
};


exports.getStockOpnameHasil = async (req, res) => {
  try {
    const { noSO } = req.params;

    if (!noSO) {
      return res.status(400).json({
        success: false,
        message: 'Parameter noSO wajib diisi'
      });
    }

    const result = await stockOpnameService.getStockOpnameHasil(noSO);
    res.status(200).json(result);
  } catch (err) {
    res.status(500).json({
      success: false,
      message: 'Terjadi kesalahan di server',
      detail: err.message
    });
  }
};

  

exports.deleteStockOpnameFull = async (req, res) => {
  try {
    const { noSO } = req.params;
    if (!noSO) {
      return res.status(400).json({ success: false, message: 'Parameter noSO wajib diisi' });
    }

    const result = await stockOpnameService.deleteStockOpnameFull(noSO);
    res.status(200).json(result);
  } catch (err) {
    res.status(500).json({
      success: false,
      message: 'Terjadi kesalahan di server',
      detail: err.message
    });
  }
};


exports.getStockOpnameHasil = async (req, res) => {
  try {
    const { noSO } = req.params;

    if (!noSO) {
      return res.status(400).json({
        success: false,
        message: 'Parameter noSO wajib diisi'
      });
    }

    const result = await stockOpnameService.getStockOpnameHasil(noSO);
    res.status(200).json(result);
  } catch (err) {
    res.status(500).json({
      success: false,
      message: 'Terjadi kesalahan di server',
      detail: err.message
    });
  }
};


  

  exports.getStockOpnameFamilies = async (req, res) => {
    try {
      const { noSO } = req.params;
  
      if (!noSO) {
        return res.status(400).json({
          success: false,
          message: 'Parameter NoSO wajib diisi'
        });
      }
  
      const result = await stockOpnameService.getStockOpnameFamilies(noSO);
      res.status(200).json(result);
  
    } catch (err) {
      res.status(500).json({
        success: false,
        message: 'Terjadi kesalahan di server',
        detail: err.message
      });
    }
  };

  
  exports.getStockOpnameAscendData = async (req, res) => {
  try {
    const { noSO, familyID } = req.params;
    const { keyword } = req.query;

    if (!noSO || !familyID) {
      return res.status(400).json({
        success: false,
        message: 'Parameter noSO dan familyID wajib diisi'
      });
    }

    const result = await stockOpnameService.getStockOpnameAscendData({
      noSO,
      familyID,
      keyword
    });

    res.status(200).json(result);
  } catch (err) {
    res.status(500).json({
      success: false,
      message: 'Terjadi kesalahan di server',
      detail: err.message
    });
  }
};


exports.fetchQtyUsage = async (req, res) => {
    try {
      const { itemId } = req.params;
      const { tglSO } = req.query; // ambil dari query param
  
      if (!itemId || !tglSO) {
        return res.status(400).json({
          success: false,
          message: 'Parameter itemId dan tglSO wajib diisi'
        });
      }
  
      const result = await stockOpnameService.fetchQtyUsage(itemId, tglSO);
      res.status(200).json(result);
    } catch (err) {
      res.status(500).json({
        success: false,
        message: 'Terjadi kesalahan di server',
        detail: err.message
      });
    }
  };
  

  exports.deleteStockOpnameHasilAscend = async (req, res) => {
    try {
      const { noSO, itemId } = req.params;
  
      if (!noSO || !itemId) {
        return res.status(400).json({
          success: false,
          message: 'Parameter noSO dan itemId wajib diisi'
        });
      }
  
      const result = await stockOpnameService.deleteStockOpnameHasilAscend(noSO, parseInt(itemId, 10));
  
      if (result.deletedCount === 0) {
        return res.status(404).json({
          success: false,
          message: `Data hasil ascend dengan NoSO ${noSO} dan ItemID ${itemId} tidak ditemukan`
        });
      }
  
      res.status(200).json({
        success: true,
        message: `Data hasil ascend dengan NoSO ${noSO} dan ItemID ${itemId} berhasil dihapus`
      });
    } catch (err) {
      res.status(500).json({
        success: false,
        message: 'Terjadi kesalahan di server',
        detail: err.message
      });
    }
  };
  

  exports.saveStockOpnameAscendHasil = async (req, res) => {
    try {
      const { noSO } = req.params;
      const { dataList } = req.body;
  
      if (!noSO || !Array.isArray(dataList)) {
        return res.status(400).json({
          success: false,
          message: 'Parameter noSO dan dataList wajib diisi'
        });
      }
  
      const result = await stockOpnameService.saveStockOpnameAscendHasil(noSO, dataList);
      res.status(200).json(result);
    } catch (err) {
      res.status(500).json({
        success: false,
        message: 'Terjadi kesalahan di server',
        detail: err.message
      });
    }
  };
  

