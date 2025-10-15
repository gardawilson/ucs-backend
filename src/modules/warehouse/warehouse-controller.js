const warehousesService = require('./warehouses-service');

exports.getWarehouses = async (req, res) => {
  try {
    // opsional filter enable, default true (Disabled = 0)
    const enabledOnly = (req.query.enabled ?? '1').toString().trim() !== '0';

    const result = await warehousesService.getWarehouses({ enabledOnly });
    res.status(200).json(result);
  } catch (err) {
    res.status(500).json({
      success: false,
      message: 'Terjadi kesalahan di server',
      detail: err.message
    });
  }
};
