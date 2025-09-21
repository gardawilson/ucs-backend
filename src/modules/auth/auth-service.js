const jwt = require('jsonwebtoken');
const { sql, connectDb } = require('../../core/config/db');
const { hashPassword } = require('../../core/utils/crypto-utils');

exports.login = async (username, password) => {
  try {
    await connectDb();

    const hashedPassword = hashPassword(password);

    const result = await sql.query`
      SELECT COUNT(*) AS count 
      FROM MstUsername 
      WHERE Username = ${username} AND Password = ${hashedPassword}
    `;

    if (result.recordset[0].count > 0) {
      const payload = { username };
      const secretKey = process.env.SECRET_KEY;

      const token = jwt.sign(payload, secretKey, { expiresIn: '12h' });

      return { success: true, token };
    } else {
      return { success: false, message: 'Username atau password salah' };
    }
  } catch (err) {
    console.error('Error in login service:', err);
    throw err;
  }
};
