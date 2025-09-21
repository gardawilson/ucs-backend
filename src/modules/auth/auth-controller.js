const authService = require('./auth-service');

exports.login = async (req, res) => {
  const { username, password } = req.body;

  try {
    const result = await authService.login(username, password);

    if (result.success) {
      res.status(200).json({
        success: true,
        message: 'Login berhasil',
        token: result.token
      });
    } else {
      res.status(400).json(result);
    }
  } catch (err) {
    res.status(500).json({ success: false, message: 'Terjadi kesalahan di server' });
  }
};
