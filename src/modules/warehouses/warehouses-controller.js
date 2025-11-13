const svc = require('./warehouses-service');

exports.getWarehouses = async (req, res) => {
  try {
    const enabledOnly = (req.query.enabled ?? '1') !== '0';
    const result = await svc.getWarehouses({ enabledOnly });
    res.status(200).json(result);
  } catch (e) {
    res.status(500).json({ success:false, message:'Server error', detail:e.message });
  }
};