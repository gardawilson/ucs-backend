const { sql, connectDb } = require('../../core/config/db');

exports.getWarehouses = async ({ enabledOnly = true } = {}) => {
  await connectDb();
  const req = new sql.Request();
  const where = enabledOnly ? 'Disabled = 0' : '1=1';
  const q = `
    SELECT WarehouseID, Name
    FROM AS_UC_2017.dbo.IC_Warehouses
    WHERE ${where}
    ORDER BY Name
  `;
  const rs = await req.query(q);
  return { success: true, data: rs.recordset };
};
