const profileService = require('./profile-service');

exports.getProfile = async (req, res) => {
  const { username } = req.user;

  try {
    const profile = await profileService.getProfile(username);

    if (!profile) {
      return res.status(404).json({ success: false, message: 'Profil tidak ditemukan' });
    }

    res.status(200).json({
      success: true,
      message: 'Profil ditemukan',
      data: profile
    });
  } catch (err) {
    console.error('Error fetching profile:', err);
    res.status(500).json({ success: false, message: 'Terjadi kesalahan di server' });
  }
};

exports.changePassword = async (req, res) => {
  const { username } = req.user;
  const { oldPassword, newPassword, confirmPassword } = req.body;

  if (!oldPassword || !newPassword || !confirmPassword) {
    return res.status(400).json({ success: false, message: 'Semua password harus diisi.' });
  }

  if (newPassword !== confirmPassword) {
    return res.status(400).json({ success: false, message: 'Password baru dan konfirmasi password tidak cocok.' });
  }

  try {
    const success = await profileService.changePassword(username, oldPassword, newPassword);

    if (!success) {
      return res.status(400).json({ success: false, message: 'Password lama tidak cocok.' });
    }

    res.status(200).json({ success: true, message: 'Password berhasil diganti.' });
  } catch (err) {
    console.error('Error changing password:', err);
    res.status(500).json({ success: false, message: 'Terjadi kesalahan di server' });
  }
};
