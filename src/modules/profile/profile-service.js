const { sql, connectDb } = require('../../core/config/db');
const { hashPassword } = require('../../core/utils/crypto-utils');

exports.getProfile = async (username) => {
  const pool = await connectDb();
  const result = await sql.query`
    SELECT TOP 1 [Username], [FName], [LName], [Password] 
    FROM [WPS_Test].[dbo].[MstUsername] 
    WHERE Username = ${username}
  `;
  return result.recordset[0] || null;
};

exports.changePassword = async (username, oldPassword, newPassword) => {
  const pool = await connectDb();

  const hashedOldPassword = hashPassword(oldPassword);
  const check = await sql.query`
    SELECT COUNT(*) AS count 
    FROM MstUsername 
    WHERE Username = ${username} AND Password = ${hashedOldPassword}
  `;

  if (check.recordset[0].count === 0) {
    return false;
  }

  const hashedNewPassword = hashPassword(newPassword);
  await sql.query`
    UPDATE MstUsername SET Password = ${hashedNewPassword} WHERE Username = ${username}
  `;
  return true;
};
