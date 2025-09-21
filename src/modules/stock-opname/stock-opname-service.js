const { sql, connectDb } = require('../../core/config/db');
const { formatDate } = require('../../core/utils/date-time-utils');


exports.getStockOpnameList = async () => {
  try {
    await connectDb();
    const result = await sql.query`
      SELECT NoSO, Tgl, IsAscend 
      FROM dbo.StockOpname_h 
      ORDER BY NoSO
    `;

    // Mapping hasil query supaya Tgl diformat
    const data = result.recordset.map(row => ({
      ...row,
      Tgl: formatDate(row.Tgl),   // format tanggal
    }));

    return { success: true, data };
  } catch (err) {
    console.error('Error in stockOpname service:', err);
    throw err;
  }
};


exports.saveStockOpnameAscend = async ({ tgl, isAscend, selections }) => {
  let pool;
  let transaction;
  try {
    pool = await connectDb();
    transaction = new sql.Transaction(pool);
    await transaction.begin();

    // 1) Generate NoSO baru dengan lock
    const reqGen = new sql.Request(transaction);
    const last = await reqGen.query(`
      SELECT TOP 1 NoSO
      FROM dbo.StockOpname_h WITH (UPDLOCK, HOLDLOCK)
      WHERE NoSO LIKE 'Q.%'
      ORDER BY NoSO DESC;
    `);

    let nextNum = 1;
    if (last.recordset.length > 0) {
      const m = /^Q\.(\d+)$/.exec(last.recordset[0].NoSO || '');
      if (m) nextNum = parseInt(m[1], 10) + 1;
    }
    const noSO = `Q.${String(nextNum).padStart(6, '0')}`;

    // 2) Insert header
    const reqHead = new sql.Request(transaction);
    await reqHead
      .input('NoSO', sql.VarChar(13), noSO)
      .input('Tgl', sql.Date, new Date(tgl))
      .input('IsAscend', sql.Bit, !!isAscend)
      .query(`
        INSERT INTO dbo.StockOpname_h (NoSO, Tgl, IsAscend)
        VALUES (@NoSO, @Tgl, @IsAscend);
      `);

    // 3) Prepare query templates
    const sqlInsHead = `
      INSERT INTO dbo.StockOpnameAscend_dFamily (NoSO, CategoryID, FamilyID)
      VALUES (@NoSO, @CategoryID, @FamilyID);
    `;

    const sqlInsDetail = `
 INSERT INTO dbo.StockOpnameAscend (NoSO,ItemID,Pcs,CategoryID,FamilyID)
    SELECT
        @NoSO,
        Z.ItemID,
        (ISNULL(Z.QtyPrcIn,0)-ISNULL(Z.QtyUsg,0)+ISNULL(Z.QtyUbb,0)
          -ISNULL(Z.QtySls,0)-ISNULL(Z.QtyPR,0)) AS Hasil,
        @CategoryID,
        @FamilyID
    FROM (
        SELECT AA.ItemID, AA.ItemCode,
               ISNULL(BB.QtyPrcIn,0) AS QtyPrcIn,
               ISNULL(CC.QtyUsg,0)   AS QtyUsg,
               ISNULL(DD.QtyUsg,0)   AS QtyUbb,
               ISNULL(EE.QtySls,0)   AS QtySls,
               ISNULL(FF.QtyPrcOut,0) AS QtyPR
        FROM (
            SELECT I.ItemID,I.ItemCode
            FROM AS_UC_2017.dbo.IC_Items I
            WHERE I.CategoryID=@CategoryID
              AND I.FamilyID = @FamilyID
              AND I.Disabled=0
              AND I.ItemType=0
        ) AA
        LEFT JOIN (
            SELECT D.ItemID,
                   SUM(AS_UC_2017.dbo.UDF_Common_ConvertToSmallestUOMEx(Packing2,Packing3,Packing4,Quantity,UOMLevel)) AS QtyPrcIn
            FROM AS_UC_2017.dbo.AP_PurchaseDetails D
            JOIN AS_UC_2017.dbo.AP_Purchases P ON P.PurchaseID=D.PurchaseID
            INNER JOIN AS_UC_2017.dbo.IC_Items I ON I.ItemID = D.ItemID
            WHERE P.PurchaseDate<@EndDate AND P.Void=0 AND IsPurchase=1
              AND I.CategoryID=@CategoryID
              AND I.FamilyID = @FamilyID
            GROUP BY D.ItemID
        ) BB ON BB.ItemID=AA.ItemID
        LEFT JOIN (
            SELECT U.ItemID,
                   SUM(AS_UC_2017.dbo.UDF_Common_ConvertToSmallestUOMEx(Packing2,Packing3,Packing4,Quantity,UOMLevel)) AS QtyUsg
            FROM AS_UC_2017.dbo.IC_UsageDetails U
            JOIN AS_UC_2017.dbo.IC_Usages UH ON UH.UsageID=U.UsageID
            INNER JOIN AS_UC_2017.dbo.IC_Items I ON I.ItemID = U.ItemID
            WHERE UH.UsageDate<=@EndDate AND UH.Void=0
              AND I.CategoryID=@CategoryID
              AND I.FamilyID = @FamilyID
            GROUP BY U.ItemID
        ) CC ON CC.ItemID=AA.ItemID
        LEFT JOIN (
            SELECT U.ItemID,
                   SUM(AS_UC_2017.dbo.UDF_Common_ConvertToSmallestUOMEx(Packing2,Packing3,Packing4,QtyAdjustBy,UOMLevel)) AS QtyUsg
            FROM AS_UC_2017.dbo.IC_AdjustmentDetails U
            JOIN AS_UC_2017.dbo.IC_Adjustments UH ON UH.AdjustmentID=U.AdjustmentID
            INNER JOIN AS_UC_2017.dbo.IC_Items I ON I.ItemID = U.ItemID
            WHERE UH.AdjustmentDate<=@EndDate AND UH.Void=0 AND UH.Approved=1
              AND I.CategoryID=@CategoryID
              AND I.FamilyID = @FamilyID
            GROUP BY U.ItemID
        ) DD ON DD.ItemID=AA.ItemID
        LEFT JOIN (
            SELECT U.ItemID,
                   SUM(AS_UC_2017.dbo.UDF_Common_ConvertToSmallestUOMEx(Packing2,Packing3,Packing4,Quantity,UOMLevel)) AS QtySls
            FROM AS_UC_2017.dbo.AR_InvoiceDetails U
            JOIN AS_UC_2017.dbo.AR_Invoices UH ON UH.InvoiceID=U.InvoiceID
            INNER JOIN AS_UC_2017.dbo.IC_Items I ON I.ItemID = U.ItemID
            WHERE UH.InvoiceDate<=@EndDate AND UH.Void=0
              AND I.CategoryID=@CategoryID
              AND I.FamilyID = @FamilyID
            GROUP BY U.ItemID
        ) EE ON EE.ItemID=AA.ItemID
        LEFT JOIN (
            SELECT D.ItemID,
                   SUM(AS_UC_2017.dbo.UDF_Common_ConvertToSmallestUOMEx(Packing2,Packing3,Packing4,Quantity,UOMLevel)) AS QtyPrcOut
            FROM AS_UC_2017.dbo.AP_PurchaseDetails D
            JOIN AS_UC_2017.dbo.AP_Purchases P ON P.PurchaseID=D.PurchaseID
            INNER JOIN AS_UC_2017.dbo.IC_Items I ON I.ItemID = D.ItemID
            WHERE P.PurchaseDate<@EndDate AND P.Void=0 AND IsPurchase=0
              AND I.CategoryID=@CategoryID
              AND I.FamilyID = @FamilyID
            GROUP BY D.ItemID
        ) FF ON FF.ItemID=AA.ItemID
    ) Z
    WHERE (ISNULL(Z.QtyPrcIn,0)-ISNULL(Z.QtyUsg,0)+ISNULL(Z.QtyUbb,0)
            -ISNULL(Z.QtySls,0)-ISNULL(Z.QtyPR,0))<>0;
    `;

    let insertedFamilies = 0;
    let insertedDetailRows = 0;

    for (const sel of selections) {
      const catId = parseInt(sel.categoryId, 10);
      const famIds = Array.isArray(sel.familyIds) ? sel.familyIds.map(x => parseInt(x, 10)).filter(Number.isFinite) : [];
      if (!Number.isFinite(catId) || famIds.length === 0) continue;

      for (const famId of famIds) {
        const reqHeadIns = new sql.Request(transaction);
        await reqHeadIns
          .input('NoSO', sql.VarChar(13), noSO)
          .input('CategoryID', sql.Int, catId)
          .input('FamilyID', sql.Int, famId)
          .query(sqlInsHead);
        insertedFamilies++;

        const reqDetailIns = new sql.Request(transaction);
        const r = await reqDetailIns
          .input('NoSO', sql.VarChar(13), noSO)
          .input('CategoryID', sql.Int, catId)
          .input('FamilyID', sql.Int, famId)
          .input('EndDate', sql.Date, new Date(tgl))
          .query(sqlInsDetail);
        insertedDetailRows += r.rowsAffected?.[0] ?? 0;
      }
    }

    await transaction.commit();
    return { success: true, noSO, insertedFamilies, insertedDetailRows };
  } catch (err) {
    if (transaction) await transaction.rollback();
    console.error('Error in saveStockOpnameAscend:', err);
    throw err;
  } finally {
    if (pool) await pool.close();
  }
};


exports.rebuildStockOpnameAscend = async ({ noSO, tgl, isAscend, selections }) => {
  let pool;
  let transaction;
  try {
    pool = await connectDb();
    transaction = new sql.Transaction(pool);
    await transaction.begin();

    // 1) Upsert header
    await new sql.Request(transaction)
      .input('NoSO', sql.VarChar(13), noSO)
      .input('Tgl', sql.Date, new Date(tgl))
      .input('IsAscend', sql.Bit, !!isAscend)
      .query(`
        IF EXISTS (SELECT 1 FROM dbo.StockOpname_h WHERE NoSO=@NoSO)
          UPDATE dbo.StockOpname_h SET Tgl=@Tgl, IsAscend=@IsAscend WHERE NoSO=@NoSO;
        ELSE
          INSERT INTO dbo.StockOpname_h (NoSO, Tgl, IsAscend) VALUES (@NoSO, @Tgl, @IsAscend);
      `);

    // 2) Hapus detail lama
    await new sql.Request(transaction)
      .input('NoSO', sql.VarChar(13), noSO)
      .query(`
        DELETE FROM dbo.StockOpnameAscend         WHERE NoSO=@NoSO;
        DELETE FROM dbo.StockOpnameAscend_dFamily WHERE NoSO=@NoSO;
      `);

    // 3) Template insert
    const sqlInsHead = `
      INSERT INTO dbo.StockOpnameAscend_dFamily (NoSO, CategoryID, FamilyID)
      VALUES (@NoSO, @CategoryID, @FamilyID);
    `;
    const sqlInsDetail = `
   INSERT INTO dbo.StockOpnameAscend (NoSO, ItemID, Pcs, CategoryID, FamilyID)
    SELECT
        @NoSO,
        Z.ItemID,
        (ISNULL(Z.QtyPrcIn,0)-ISNULL(Z.QtyUsg,0)+ISNULL(Z.QtyUbb,0)
          -ISNULL(Z.QtySls,0)-ISNULL(Z.QtyPR,0)) AS Hasil,
        @CategoryID,
        @FamilyID
    FROM (
        SELECT AA.ItemID, AA.ItemCode,
               ISNULL(BB.QtyPrcIn,0) AS QtyPrcIn,
               ISNULL(CC.QtyUsg,0)   AS QtyUsg,
               ISNULL(DD.QtyUsg,0)   AS QtyUbb,
               ISNULL(EE.QtySls,0)   AS QtySls,
               ISNULL(FF.QtyPrcOut,0) AS QtyPR
        FROM (
            SELECT I.ItemID, I.ItemCode
            FROM AS_UC_2017.dbo.IC_Items I
            WHERE I.CategoryID=@CategoryID
              AND I.FamilyID  = @FamilyID
              AND I.Disabled  = 0
              AND I.ItemType  = 0
        ) AA
        LEFT JOIN (
            SELECT D.ItemID,
                   SUM(AS_UC_2017.dbo.UDF_Common_ConvertToSmallestUOMEx(Packing2,Packing3,Packing4,Quantity,UOMLevel)) AS QtyPrcIn
            FROM AS_UC_2017.dbo.AP_PurchaseDetails D
            JOIN AS_UC_2017.dbo.AP_Purchases P ON P.PurchaseID=D.PurchaseID
            INNER JOIN AS_UC_2017.dbo.IC_Items I ON I.ItemID = D.ItemID
            WHERE P.PurchaseDate < @EndDate AND P.Void=0 AND IsPurchase=1
              AND I.CategoryID=@CategoryID AND I.FamilyID=@FamilyID
            GROUP BY D.ItemID
        ) BB ON BB.ItemID=AA.ItemID
        LEFT JOIN (
            SELECT U.ItemID,
                   SUM(AS_UC_2017.dbo.UDF_Common_ConvertToSmallestUOMEx(Packing2,Packing3,Packing4,Quantity,UOMLevel)) AS QtyUsg
            FROM AS_UC_2017.dbo.IC_UsageDetails U
            JOIN AS_UC_2017.dbo.IC_Usages UH ON UH.UsageID=U.UsageID
            INNER JOIN AS_UC_2017.dbo.IC_Items I ON I.ItemID = U.ItemID
            WHERE UH.UsageDate <= @EndDate AND UH.Void=0
              AND I.CategoryID=@CategoryID AND I.FamilyID=@FamilyID
            GROUP BY U.ItemID
        ) CC ON CC.ItemID=AA.ItemID
        LEFT JOIN (
            SELECT U.ItemID,
                   SUM(AS_UC_2017.dbo.UDF_Common_ConvertToSmallestUOMEx(Packing2,Packing3,Packing4,QtyAdjustBy,UOMLevel)) AS QtyUsg
            FROM AS_UC_2017.dbo.IC_AdjustmentDetails U
            JOIN AS_UC_2017.dbo.IC_Adjustments UH ON UH.AdjustmentID=U.AdjustmentID
            INNER JOIN AS_UC_2017.dbo.IC_Items I ON I.ItemID = U.ItemID
            WHERE UH.AdjustmentDate <= @EndDate AND UH.Void=0 AND UH.Approved=1
              AND I.CategoryID=@CategoryID AND I.FamilyID=@FamilyID
            GROUP BY U.ItemID
        ) DD ON DD.ItemID=AA.ItemID
        LEFT JOIN (
            SELECT U.ItemID,
                   SUM(AS_UC_2017.dbo.UDF_Common_ConvertToSmallestUOMEx(Packing2,Packing3,Packing4,Quantity,UOMLevel)) AS QtySls
            FROM AS_UC_2017.dbo.AR_InvoiceDetails U
            JOIN AS_UC_2017.dbo.AR_Invoices UH ON UH.InvoiceID=U.InvoiceID
            INNER JOIN AS_UC_2017.dbo.IC_Items I ON I.ItemID = U.ItemID
            WHERE UH.InvoiceDate <= @EndDate AND UH.Void=0
              AND I.CategoryID=@CategoryID AND I.FamilyID=@FamilyID
            GROUP BY U.ItemID
        ) EE ON EE.ItemID=AA.ItemID
        LEFT JOIN (
            SELECT D.ItemID,
                   SUM(AS_UC_2017.dbo.UDF_Common_ConvertToSmallestUOMEx(Packing2,Packing3,Packing4,Quantity,UOMLevel)) AS QtyPrcOut
            FROM AS_UC_2017.dbo.AP_PurchaseDetails D
            JOIN AS_UC_2017.dbo.AP_Purchases P ON P.PurchaseID=D.PurchaseID
            INNER JOIN AS_UC_2017.dbo.IC_Items I ON I.ItemID = D.ItemID
            WHERE P.PurchaseDate < @EndDate AND P.Void=0 AND IsPurchase=0
              AND I.CategoryID=@CategoryID AND I.FamilyID=@FamilyID
            GROUP BY D.ItemID
        ) FF ON FF.ItemID=AA.ItemID
    ) Z
    WHERE (ISNULL(Z.QtyPrcIn,0)-ISNULL(Z.QtyUsg,0)+ISNULL(Z.QtyUbb,0)-ISNULL(Z.QtySls,0)-ISNULL(Z.QtyPR,0))<>0;
    `;

    let insertedFamilies = 0;
    let insertedDetailRows = 0;

    for (const sel of selections) {
      const categoryId = parseInt(sel.categoryId, 10);
      const famIds = Array.isArray(sel.familyIds) ? sel.familyIds.map(v => parseInt(v, 10)).filter(Number.isFinite) : [];
      if (!Number.isFinite(categoryId) || famIds.length === 0) continue;

      for (const famId of famIds) {
        const reqHeadIns = new sql.Request(transaction);
        await reqHeadIns
          .input('NoSO', sql.VarChar(13), noSO)
          .input('CategoryID', sql.Int, categoryId)
          .input('FamilyID', sql.Int, famId)
          .query(sqlInsHead);
        insertedFamilies++;

        const reqDetailIns = new sql.Request(transaction);
        const r = await reqDetailIns
          .input('NoSO', sql.VarChar(13), noSO)
          .input('CategoryID', sql.Int, categoryId)
          .input('FamilyID', sql.Int, famId)
          .input('EndDate', sql.Date, new Date(tgl))
          .query(sqlInsDetail);
        insertedDetailRows += r.rowsAffected?.[0] ?? 0;
      }
    }

    await transaction.commit();
    return { success: true, noSO, insertedFamilies, insertedDetailRows };
  } catch (err) {
    if (transaction) await transaction.rollback();
    console.error('Error in rebuildStockOpnameAscend:', err);
    throw err;
  } finally {
    if (pool) await pool.close();
  }
};


exports.deleteStockOpnameFull = async (noSO) => {
  let pool;
  let transaction;
  try {
    pool = await connectDb();
    transaction = new sql.Transaction(pool);
    await transaction.begin();

    const reqDel = new sql.Request(transaction).input('NoSO', sql.VarChar(13), noSO);

    // Urutan delete: hasil → ascend → dFamily → header
    const delHasil  = await reqDel.query('DELETE FROM dbo.StockOpnameAscendHasil     WHERE NoSO=@NoSO;');
    const delAscend = await reqDel.query('DELETE FROM dbo.StockOpnameAscend         WHERE NoSO=@NoSO;');
    const delDFam   = await reqDel.query('DELETE FROM dbo.StockOpnameAscend_dFamily WHERE NoSO=@NoSO;');
    const delHeader = await reqDel.query('DELETE FROM dbo.StockOpname_h             WHERE NoSO=@NoSO;');

    await transaction.commit();

    return {
      success: true,
      noSO,
      deleted: {
        StockOpnameAscendHasil: delHasil.rowsAffected?.[0] ?? 0,
        StockOpnameAscend:      delAscend.rowsAffected?.[0] ?? 0,
        StockOpnameAscend_dFamily: delDFam.rowsAffected?.[0] ?? 0,
        StockOpname_h:          delHeader.rowsAffected?.[0] ?? 0
      }
    };
  } catch (err) {
    if (transaction) await transaction.rollback();
    console.error('Error in deleteStockOpnameFull:', err);
    throw err;
  } finally {
    if (pool) await pool.close();
  }
};


  exports.getStockOpnameFamilies = async (noSO) => {
    try {
      await connectDb();
  
      const result = await sql.query`
        SELECT 
          f.NoSO,
          f.CategoryID,
          f.FamilyID,
          ISNULL(sf.FamilyName, '') AS FamilyName,
          COUNT(s.ItemID) AS TotalItem,
          COUNT(DISTINCT sh.ItemID) AS CompleteItem
        FROM [dbo].[StockOpnameAscend_dFamily] f
        LEFT JOIN [AS_UC_2017].[dbo].[IC_StockFamily] sf 
               ON f.FamilyID = sf.FamilyID
        LEFT JOIN [dbo].[StockOpnameAscend] s 
               ON f.NoSO = s.NoSO 
              AND f.CategoryID = s.CategoryID 
              AND f.FamilyID = s.FamilyID
        LEFT JOIN [dbo].[StockOpnameAscendHasil] sh 
               ON s.NoSO = sh.NoSO 
              AND s.ItemID = sh.ItemID
        WHERE f.NoSO = ${noSO}
        GROUP BY f.NoSO, f.CategoryID, f.FamilyID, sf.FamilyName
        ORDER BY f.FamilyID ASC
      `;
  
      if (!result.recordset || result.recordset.length === 0) {
        return { success: true, data: [] };
      }
  
      return { success: true, data: result.recordset };
    } catch (err) {
      console.error('Error in getStockOpnameFamilies:', err);
      throw err;
    }
  };
  

  exports.getStockOpnameAscendData = async ({ noSO, familyID, keyword }) => {
    try {
      await connectDb();
  
      const result = await sql.query`
        SELECT 
          so.NoSO,
          so.ItemID,
          it.ItemCode,
          it.ItemName,
          so.Pcs,
          sh.QtyFisik,
          sh.QtyUsage,
          sh.UsageRemark,
          sh.IsUpdateUsage
        FROM [dbo].[StockOpnameAscend] so
        LEFT JOIN [AS_UC_2017].[dbo].[IC_Items] it 
               ON so.ItemID = it.ItemID
        LEFT JOIN [dbo].[StockOpnameAscendHasil] sh 
               ON so.NoSO = sh.NoSO 
              AND so.ItemID = sh.ItemID
        WHERE so.NoSO = ${noSO}
          AND so.FamilyID = ${familyID}
          AND (so.ItemID LIKE ${'%' + (keyword || '') + '%'} 
               OR it.ItemName LIKE ${'%' + (keyword || '') + '%'})
        ORDER BY it.ItemName ASC
      `;
  
      if (!result.recordset || result.recordset.length === 0) {
        return { success: true, data: [] };
      }
  
      const mapped = result.recordset.map(row => ({
        NoSO: row.NoSO,
        ItemID: row.ItemID,
        ItemCode: row.ItemCode,
        ItemName: row.ItemName,
        Pcs: row.Pcs,
        QtyFisik: row.QtyFisik !== null ? row.QtyFisik : null,
        QtyUsage: row.QtyUsage !== null ? row.QtyUsage : -1.0,
        UsageRemark: row.UsageRemark || '',
        IsUpdateUsage: row.IsUpdateUsage === true
      }));
  
      return { success: true, data: mapped };
    } catch (err) {
      console.error('Error in getStockOpnameAscendData:', err);
      throw err;
    }
  };


  exports.fetchQtyUsage = async (itemId, tglSO) => {
    try {
      await connectDb();
  
      const request = new sql.Request();
      request.input('ItemID', sql.Int, itemId);
      request.input('Tanggal', sql.Date, tglSO);
  
      const result = await request.query(`
        SELECT ISNULL(SUM(d.Quantity), 0) AS TotalUsage
        FROM [AS_UC_2017].[dbo].[IC_UsageDetails] d
        INNER JOIN [AS_UC_2017].[dbo].[IC_Usages] u
            ON d.UsageID = u.UsageID
        WHERE u.UsageDate >= @Tanggal
          AND u.Approved = 1
          AND d.ItemID = @ItemID
      `);
  
      return { success: true, qtyUsage: result.recordset[0]?.TotalUsage || 0.0 };
    } catch (err) {
      console.error('Error in fetchQtyUsage:', err);
      throw err;
    }
  };

  
  exports.deleteStockOpnameHasilAscend = async (noso, itemId) => {
    try {
      await connectDb();
  
      const request = new sql.Request();
      request.input('NoSO', sql.VarChar(50), noso);
      request.input('ItemID', sql.Int, itemId);
  
      const result = await request.query(`
        DELETE FROM [dbo].[StockOpnameAscendHasil]
        WHERE NoSO = @NoSO AND ItemID = @ItemID
      `);
  
      return {
        success: true,
        deletedCount: result.rowsAffected?.[0] ?? 0
      };
    } catch (err) {
      console.error('Error in deleteStockOpnameHasilAscend:', err);
      throw err;
    }
  };
  

  exports.saveStockOpnameAscendHasil = async (noSO, dataList) => {
    let pool;
    let transaction;
    try {
      pool = await connectDb();
      transaction = new sql.Transaction(pool);
      await transaction.begin();
  
      for (const data of dataList) {
        if (data.qtyFound === null || data.qtyFound === undefined) {
          continue; // skip kalau kosong
        }
  
        const request = new sql.Request(transaction);
        await request
          .input('NoSO', sql.VarChar, noSO)
          .input('ItemID', sql.Int, data.itemId)
          .input('QtyFisik', sql.Decimal(18, 6), data.qtyFound)
          .input('QtyUsage', sql.Decimal(18, 6), data.qtyUsage)
          .input('UsageRemark', sql.VarChar, data.usageRemark || '')
          .input('IsUpdateUsage', sql.Bit, 1)
          .query(`
            MERGE [dbo].[StockOpnameAscendHasil] AS target
            USING (SELECT 
                      @NoSO AS NoSO, 
                      @ItemID AS ItemID, 
                      @QtyFisik AS QtyFisik, 
                      @QtyUsage AS QtyUsage, 
                      @UsageRemark AS UsageRemark, 
                      @IsUpdateUsage AS IsUpdateUsage) AS source
            ON (target.NoSO = source.NoSO AND target.ItemID = source.ItemID)
            WHEN MATCHED THEN
              UPDATE SET QtyFisik = source.QtyFisik,
                         QtyUsage = source.QtyUsage,
                         UsageRemark = source.UsageRemark,
                         IsUpdateUsage = source.IsUpdateUsage
            WHEN NOT MATCHED THEN
              INSERT (NoSO, ItemID, QtyFisik, QtyUsage, UsageRemark, IsUpdateUsage)
              VALUES (source.NoSO, source.ItemID, source.QtyFisik, source.QtyUsage, source.UsageRemark, source.IsUpdateUsage);
          `);
      }
  
      await transaction.commit();
      return { success: true, message: 'Data StockOpnameAscendHasil berhasil disimpan/diupdate' };
    } catch (err) {
      if (transaction) await transaction.rollback();
      console.error('Error in saveStockOpnameAscendHasil:', err);
      throw err;
    } finally {
      if (pool) await pool.close();
    }
  };
  
