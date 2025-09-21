const familiesService = require('./families-service');

exports.getFamilies = async (req, res) => {
  try {
    const idsRaw = (req.query.categoryIds || '').toString().trim();
    if (!idsRaw) {
      return res.status(200).json({ success: true, data: [] });
    }

    const ids = [...new Set(
      idsRaw.split(',')
        .map(s => parseInt(s.trim(), 10))
        .filter(Number.isInteger)
    )];

    if (ids.length === 0) {
      return res.status(200).json({ success: true, data: [] });
    }

    const result = await familiesService.getFamilies(ids);
    res.status(200).json(result);
  } catch (err) {
    res.status(500).json({
      success: false,
      message: 'Terjadi kesalahan di server',
      detail: err.message
    });
  }
};
