const { sql, connectDb } = require('../../core/config/db');

exports.getFamilies = async (categoryIds) => {
  try {
    await connectDb();

    // Kalau kosong langsung return []
    if (!categoryIds || categoryIds.length === 0) {
      return { success: true, data: [] };
    }

    // Buat placeholder @id0,@id1,...
    const placeholders = categoryIds.map((_, i) => `@id${i}`).join(',');

    const request = new sql.Request();
    categoryIds.forEach((v, i) => {
      request.input(`id${i}`, sql.Int, v);
    });

    const result = await request.query(`
      SELECT FamilyID, FamilyName, StockCategoryID
      FROM AS_UC_2017.dbo.IC_StockFamily
      WHERE StockCategoryID IN (${placeholders})
      ORDER BY FamilyName
    `);

    return { success: true, data: result.recordset };
  } catch (err) {
    console.error('Error in families service:', err);
    throw err;
  }
  
};
