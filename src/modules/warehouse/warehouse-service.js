const { sql, connectDb } = require('../../core/config/db');

exports.getWarehouses = async ({ enabledOnly = true } = {}) => {
  try {
    await connectDb();

    const request = new sql.Request();
    let where = '1=1';
    if (enabledOnly) where += ' AND Disabled = 0';

    const query = `
      SELECT WarehouseID, Name
      FROM AS_GSU_2022.dbo.IC_Warehouses
      WHERE ${where}
      ORDER BY Name
    `;

    const result = await request.query(query);
    return { success: true, data: result.recordset };
  } catch (err) {
    console.error('Error in warehouses service:', err);
    throw err;
  }
};
