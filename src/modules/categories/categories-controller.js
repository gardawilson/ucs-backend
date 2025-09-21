const categoriesService = require('./categories-service');

exports.getCategories = async (req, res) => {
  try {
    const result = await categoriesService.getCategories();
    res.status(200).json(result);
  } catch (err) {
    res.status(500).json({
      success: false,
      message: 'Terjadi kesalahan di server',
      detail: err.message
    });
  }
};
