const { sql, connectDb } = require('../../core/config/db');

exports.getCategories = async () => {
  try {
    await connectDb();

    const result = await sql.query`
      SELECT StockCategoryID, StockCategoryName
      FROM AS_UC_2017.dbo.IC_StockCategories
      ORDER BY StockCategoryName
    `;

    return { success: true, data: result.recordset };
  } catch (err) {
    console.error('Error in categories service:', err);
    throw err;
  }
};
