const express = require('express');
const verifyToken = require('../../core/middleware/verify-token');  // Mengimpor middleware
const moment = require('moment');
const { sql, connectDb } = require('../../core/config/db');
const router = express.Router();

const formatDate = (date) => {
    return moment(date).format('DD MMM YYYY');
};

const WebSocket = require('ws');
const wss = new WebSocket.Server({ port: 5001 }); // Pastikan port sesuai dan tidak bentrok dengan aplikasi lain

// Listener untuk koneksi WebSocket
wss.on('connection', (ws) => {
    console.log('WPS Tablet Connected');
    ws.on('message', (message) => {
        console.log(`Received message: ${message}`);
    });
});

// Route untuk mendapatkan Nomor Stock Opname
router.get('/no-stock-opname', verifyToken, async (req, res) => {
    try {
        await connectDb();

        const result = await sql.query('SELECT [NoSO], [Tgl] FROM [dbo].[StockOpname_h] WHERE [Tgl] > (SELECT MAX(PeriodHarian) FROM [dbo].[MstTutupTransaksiHarian]) ORDER BY [NoSO] DESC');

        if (!result.recordset || result.recordset.length === 0) {
            return res.status(404).json({ message: 'Tidak ada Jadwal Stock Opname saat ini' });
        }

        const formattedData = result.recordset.map(item => ({
            NoSO: item.NoSO,
            Tgl: formatDate(item.Tgl)
        }));

        res.json(formattedData);
    } catch (error) {
        console.error('Error:', error.message);
        res.status(500).json({ message: 'Internal Server Error' });
    }
});



// Route untuk mendapatkan data Label berdasarkan No Stock Opname
router.get('/no-stock-opname/:noso', verifyToken, async (req, res) => {
    const { noso } = req.params;
    const page = parseInt(req.query.page) || 1;
    const pageSize = parseInt(req.query.pageSize) || 20;
    const filterBy = req.query.filterBy || null;
    const idlokasi = req.query.idlokasi || null;
    const offset = (page - 1) * pageSize;
    const { username } = req;  // Mengambil username dari request object

    console.log(`[${new Date().toISOString()}] Stock opname - ${username} mengakses : "${filterBy}"`);

    if (page <= 0 || pageSize <= 0) {
        return res.status(400).json({ message: 'Page and pageSize must be positive numbers.' });
    }

    let pool;
    try {
        pool = await connectDb();
        const request = new sql.Request(pool);
        request.input('noso', sql.VarChar, noso);
        request.input('username', sql.VarChar, username);  // Menambahkan username ke query

        if (idlokasi) request.input('idlokasi', sql.VarChar, idlokasi);

        // Ambil data lokasi
        const mstLokasiResult = await request.query('SELECT IdLokasi, Blok FROM MstLokasi WHERE Enable = 1');

        if (!mstLokasiResult.recordset || mstLokasiResult.recordset.length === 0) {
            return res.status(404).json({ message: 'Data MstLokasi tidak ditemukan' });
        }

        let query = "";
        let totalCountQuery = "";

        function createQuery(tableName, columnName, labelType) {
            return `
                SELECT d.${columnName} AS CombinedLabel, '${labelType}' AS LabelType, d.IdLokasi AS LabelLocation, ISNULL(d.DateTimeScan, '1900-01-01') AS DateTimeScan
                FROM ${tableName} d
                WHERE d.NoSO = @noso
                ${idlokasi && idlokasi !== 'all' ? "AND d.IdLokasi = @idlokasi" : ""}
                AND d.UserID = @username

            `;
        }

        function createTotalQuery(tableName, columnName) {
            return `
                SELECT COUNT(*) AS total FROM ${tableName} d
                WHERE d.NoSO = @noso
                ${idlokasi && idlokasi !== 'all' ? "AND d.IdLokasi = @idlokasi" : ""}
                AND d.UserID = @username

            `;
        }

        if (filterBy && filterBy !== 'all') {
            const filterMap = {
                'st': { table: 'StockOpname_Hasil_d_ST', column: 'NoST', type: 'Sawn Timber' },
                'sanding': { table: 'StockOpname_Hasil_d_Sanding', column: 'NoSanding', type: 'Sanding' },
                's4s': { table: 'StockOpname_Hasil_d_S4S', column: 'NoS4S', type: 'S4S' },
                'moulding': { table: 'StockOpname_Hasil_d_Moulding', column: 'NoMoulding', type: 'Moulding' },
                'laminating': { table: 'StockOpname_Hasil_d_Laminating', column: 'NoLaminating', type: 'Laminating' },
                'fj': { table: 'StockOpname_Hasil_d_FJ', column: 'NoFJ', type: 'Finger Joint' },
                'ccakhir': { table: 'StockOpname_Hasil_d_CCAkhir', column: 'NoCCAkhir', type: 'CC Akhir' },
                'bj': { table: 'StockOpname_Hasil_d_BJ', column: 'NoBJ', type: 'Barang Jadi' },
            };

            const selectedFilter = filterMap[filterBy];
            if (!selectedFilter) {
                return res.status(400).json({ message: "Invalid filterBy value" });
            }

            query = `
                ${createQuery(selectedFilter.table, selectedFilter.column, selectedFilter.type)}
                ORDER BY DateTimeScan DESC
                OFFSET ${offset} ROWS FETCH NEXT ${pageSize} ROWS ONLY;
            `;
            totalCountQuery = createTotalQuery(selectedFilter.table, selectedFilter.column);
        } else {
            // Jika filterBy NULL atau "all", ambil semua data
            query = `
                SELECT CombinedLabel, LabelType, LabelLocation, DateTimeScan FROM (
                    ${createQuery('StockOpname_Hasil_d_ST', 'NoST', 'Sawn Timber')}
                    UNION ALL
                    ${createQuery('StockOpname_Hasil_d_Sanding', 'NoSanding', 'Sanding')}
                    UNION ALL
                    ${createQuery('StockOpname_Hasil_d_S4S', 'NoS4S', 'S4S')}
                    UNION ALL
                    ${createQuery('StockOpname_Hasil_d_Moulding', 'NoMoulding', 'Moulding')}
                    UNION ALL
                    ${createQuery('StockOpname_Hasil_d_Laminating', 'NoLaminating', 'Laminating')}
                    UNION ALL
                    ${createQuery('StockOpname_Hasil_d_FJ', 'NoFJ', 'Finger Joint')}
                    UNION ALL
                    ${createQuery('StockOpname_Hasil_d_CCAkhir', 'NoCCAkhir', 'CC Akhir')}
                    UNION ALL
                    ${createQuery('StockOpname_Hasil_d_BJ', 'NoBJ', 'Barang Jadi')}
                ) AS subquery
                ORDER BY DateTimeScan DESC
                OFFSET ${offset} ROWS FETCH NEXT ${pageSize} ROWS ONLY;
            `;

            totalCountQuery = `
                SELECT SUM(total) AS total FROM (
                    ${createTotalQuery('StockOpname_Hasil_d_ST', 'NoST')}
                    UNION ALL
                    ${createTotalQuery('StockOpname_Hasil_d_Sanding', 'NoSanding')}
                    UNION ALL
                    ${createTotalQuery('StockOpname_Hasil_d_S4S', 'NoS4S')}
                    UNION ALL
                    ${createTotalQuery('StockOpname_Hasil_d_Moulding', 'NoMoulding')}
                    UNION ALL
                    ${createTotalQuery('StockOpname_Hasil_d_Laminating', 'NoLaminating')}
                    UNION ALL
                    ${createTotalQuery('StockOpname_Hasil_d_FJ', 'NoFJ')}
                    UNION ALL
                    ${createTotalQuery('StockOpname_Hasil_d_CCAkhir', 'NoCCAkhir')}
                    UNION ALL
                    ${createTotalQuery('StockOpname_Hasil_d_BJ', 'NoBJ')}
                ) AS total_counts;
            `;
        }

        const [result, totalResult] = await Promise.all([
            request.query(query),
            request.query(totalCountQuery)
        ]);

        res.json({
            mstLokasi: mstLokasiResult.recordset,
            noLabelList: result.recordset,
            noLabelFound: result.recordset.length > 0,
            currentPage: page,
            pageSize,
            totalData: totalResult.recordset[0].total,
            totalPages: Math.ceil(totalResult.recordset[0].total / pageSize),
        });

    } catch (error) {
        res.status(500).json({ message: 'Internal Server Error', error: error.message });
    } finally {
        if (pool) await pool.close();
    }
});


// Fungsi untuk pengecekan lanjutan di tabel lain berdasarkan tipe resultscanned
const checkInOtherTables = async (request, resultscanned) => {
    // Menentukan tipe tabel berdasarkan tipe resultscanned
    let tablesToCheck = [];
    let columnToSearch = '';

    // Menentukan tabel dan kolom yang relevan berdasarkan kode pertama pada resultscanned
    const firstChar = resultscanned.charAt(0).toUpperCase();

    if (firstChar === 'E') {
        // Jika 'E', gunakan tabel-tabel untuk S4SProduksiInputST, AdjustmentInputST, BongkarSusunInputST
        tablesToCheck = [
            { tableName: "S4SProduksiInputST", column: "NoProduksi" },
            { tableName: "AdjustmentInputST", column: "NoAdjustment" },
            { tableName: "BongkarSusunInputST", column: "NoBongkarSusun" }
        ];
        columnToSearch = 'NoST'; // Menetapkan kolom pencarian untuk 'E'

    } else if (firstChar === 'R') {
        // Jika 'R', gunakan tabel-tabel untuk S4SProduksiInputS4S, FJProduksiInputS4S, dll.
        tablesToCheck = [
            { tableName: "S4SProduksiInputS4S", column: "NoProduksi" },
            { tableName: "FJProduksiInputS4S", column: "NoProduksi" },
            { tableName: "MouldingProduksiInputS4S", column: "NoProduksi" },
            { tableName: "AdjustmentInputS4S", column: "NoAdjustment" },
            { tableName: "BongkarSusunInputS4S", column: "NoBongkarSusun" }
        ];
        columnToSearch = 'NoS4S'; // Menetapkan kolom pencarian untuk 'R'

    } else if (firstChar === 'S') {
        tablesToCheck = [
            { tableName: "SandingProduksiInputFJ", column: "NoProduksi" },
            { tableName: "S4SProduksiInputFJ", column: "NoProduksi" },
            { tableName: "MouldingProduksiInputFJ", column: "NoProduksi" },
            { tableName: "CCAkhirProduksiInputFJ", column: "NoProduksi" },
            { tableName: "AdjustmentInputFJ", column: "NoAdjustment" },
            { tableName: "BongkarSusunInputFJ", column: "NoBongkarSusun" }
        ];
        columnToSearch = 'NoFJ';

    } else if (firstChar === 'T') {
        tablesToCheck = [
            { tableName: "S4SProduksiInputMoulding", column: "NoProduksi" },
            { tableName: "SandingProduksiInputMoulding", column: "NoProduksi" },
            { tableName: "PackingProduksiInputMoulding", column: "NoProduksi" },
            { tableName: "MouldingProduksiInputMoulding", column: "NoProduksi" },
            { tableName: "LaminatingProduksiInputMoulding", column: "NoProduksi" },
            { tableName: "CCAkhirProduksiInputMoulding", column: "NoProduksi" },
            { tableName: "AdjustmentInputMoulding", column: "NoAdjustment" },
            { tableName: "BongkarSusunInputMoulding", column: "NoBongkarSusun" }
        ];
        columnToSearch = 'NoMoulding';

    } else if (firstChar === 'U') {
        tablesToCheck = [
            { tableName: "MouldingProduksiInputLaminating", column: "NoProduksi" },
            { tableName: "CCAkhirProduksiInputLaminating", column: "NoProduksi" },
            { tableName: "AdjustmentInputLaminating", column: "NoAdjustment" },
            { tableName: "BongkarSusunInputLaminating", column: "NoBongkarSusun" }
        ];
        columnToSearch = 'NoLaminating';

    } else if (firstChar === 'V') {
        tablesToCheck = [
            { tableName: "S4SProduksiInputCCAkhir", column: "NoProduksi" },
            { tableName: "FJProduksiInputCCAkhir", column: "NoProduksi" },
            { tableName: "MouldingProduksiInputCCAkhir", column: "NoProduksi" },
            { tableName: "LaminatingProduksiInputCCAkhir", column: "NoProduksi" },
            { tableName: "SandingProduksiInputCCAkhir", column: "NoProduksi" },
            { tableName: "AdjustmentInputCCAkhir", column: "NoAdjustment" },
            { tableName: "BongkarSusunInputCCAkhir", column: "NoBongkarSusun" }
        ];
        columnToSearch = 'NoCCAkhir';

    } else if (firstChar === 'W') {
        tablesToCheck = [
            { tableName: "LaminatingProduksiInputSanding", column: "NoProduksi" },
            { tableName: "PackingProduksiInputSanding", column: "NoProduksi" },
            { tableName: "AdjustmentInputSanding", column: "NoAdjustment" },
            { tableName: "BongkarSusunInputSanding", column: "NoBongkarSusun" }
        ];
        columnToSearch = 'NoSanding';

    } else if (firstChar === 'I') {
        tablesToCheck = [
            { tableName: "MouldingProduksiInputBarangJadi", column: "NoProduksi" },
            { tableName: "LaminatingProduksiInputBarangJadi", column: "NoProduksi" },
            { tableName: "CCAkhirProduksiInputBarangJadi", column: "NoProduksi" },
            { tableName: "PackingProduksiInputBarangJadi", column: "NoProduksi" },
            { tableName: "BongkarSusunInputBarangJadi", column: "NoBongkarSusun" }
        ];
        columnToSearch = 'NoBJ';

    } else {
        // Jika resultscanned bukan 'E' atau 'R', bisa menambahkan logika lain atau handling error
        return { message: 'Invalid resultscanned type', status: 400 };
    }

    // Pengecekan tabel sesuai dengan daftar yang sudah ditentukan
    for (let table of tablesToCheck) {
        const checkQuery = `
            SELECT ${table.column}
            FROM ${table.tableName}
            WHERE ${columnToSearch} = @resultscanned;
        `;

        const resultCheck = await request.query(checkQuery);

        if (resultCheck.recordset.length > 0) {
            const value = resultCheck.recordset[0][table.column]; // Ambil nilai kolom yang sesuai
            return {
                message: `Label sudah di Proses pada Nomor ${value}. Yakin ingin menyimpan?`,
                status: 409,
                value: value // Kembalikan nilai kolom yang ditemukan
            };
        }
    }

    return null; // Tidak ada masalah
};



// Route untuk input data ke dalam database berdasarkan No Stock Opname
router.post('/no-stock-opname/:noso/scan', verifyToken, async (req, res) => {
    const { noso } = req.params;
    const { resultscanned, idlokasi } = req.body;
    const { username } = req;  // Mengambil username dari request object

    if (!noso || !resultscanned || !idlokasi) {
        return res.status(400).json({ message: 'NoSO, resultscanned, and idlokasi are required.' });
    }

    let pool;
    try {
        pool = await connectDb();
        const request = new sql.Request(pool);
        request.input('noso', sql.VarChar, noso);
        request.input('resultscanned', sql.VarChar, resultscanned);
        request.input('idlokasi', sql.VarChar, idlokasi);
        request.input('username', sql.VarChar, username);  // Menambahkan username ke query

        // Validasi pola resultscanned
        const validPattern = /^[ERSTUVWIA]\.\d{6}$/;
        if (!validPattern.test(resultscanned)) {
            return res.status(400).json({ message: 'Format harus berupa "Kode.xxxxxx"' });
        }

        // Logika untuk memetakan resultscanned ke tabel dan melakukan pengecekan
        const firstChar = resultscanned.charAt(0).toUpperCase();
        const tableMap = {
            'E': { tableName: 'StockOpname_Hasil_d_ST', columnName: 'NoST', tableH: 'ST_h', isColumn: 'IsST' },
            'R': { tableName: 'StockOpname_Hasil_d_S4S', columnName: 'NoS4S', tableH: 'S4S_h', isColumn: 'IsS4S' },
            'S': { tableName: 'StockOpname_Hasil_d_FJ', columnName: 'NoFJ', tableH: 'FJ_h', isColumn: 'IsFJ' },
            'T': { tableName: 'StockOpname_Hasil_d_Moulding', columnName: 'NoMoulding', tableH: 'Moulding_h', isColumn: 'IsMoulding' },
            'U': { tableName: 'StockOpname_Hasil_d_Laminating', columnName: 'NoLaminating', tableH: 'Laminating_h', isColumn: 'IsLaminating' },
            'V': { tableName: 'StockOpname_Hasil_d_CCAkhir', columnName: 'NoCCAkhir', tableH: 'CCAkhir_h', isColumn: 'IsCCAkhir' },
            'W': { tableName: 'StockOpname_Hasil_d_Sanding', columnName: 'NoSanding', tableH: 'Sanding_h', isColumn: 'IsSanding' },
            'I': { tableName: 'StockOpname_Hasil_d_BJ', columnName: 'NoBJ', tableH: 'BarangJadi_h', isColumn: 'IsBJ' },
            // 'A': { tableName: 'StockOpname_Hasil_d_KayuBulat', columnName: 'NoKayuBulat', tableH: 'KayuBulat_h', isColumn: 'IsKB' }
        };

        const tableInfo = tableMap[firstChar];

        if (!tableInfo) {
            return res.status(400).json({ message: 'Invalid starting character for resultscanned.' });
        }

        const { tableName, columnName, tableH, isColumn } = tableInfo;

        // Pengecekan Column data dari StockOpname_h
        const checkHeaderQuery = `
            SELECT ${isColumn}
            FROM StockOpname_h
            WHERE NoSO = @noso;
        `;

        const headerResult = await request.query(checkHeaderQuery);

        if (headerResult.recordset.length === 0) {
            return res.status(404).json({ message: 'Column not found in StockOpname_h.' });
        }

        const isColumnEnabled = headerResult.recordset[0][isColumn];

        // Validasi apakah input diperbolehkan
        if (!isColumnEnabled) {
            return res.status(403).json({ message: `${columnName} Tidak di Aktifkan!` });
        }



        // **Pengecekan apakah resultscanned ada di table yang sesuai**
        const checkResultScannedQuery = `
            SELECT COUNT(*) AS count, MAX(dateusage) AS dateusage
            FROM ${tableH}
            WHERE ${columnName} = @resultscanned;
    `;
        const resultScannedCheck = await request.query(checkResultScannedQuery);
        const resultScannedCount = resultScannedCheck.recordset[0].count;
        const dateusage = resultScannedCheck.recordset[0].dateusage;

        // Jika tidak ada data yang cocok, kembalikan pesan bahwa data tidak terdaftar
        if (resultScannedCount === 0 && !req.body.forceSave) {
            return res.status(404).json({ message: 'Label tidak ada di sistem. Yakin ingin menyimpan?' });
        }

        // Tambahkan pengecekan untuk dateusage jika tidak null
        if (dateusage !== null && !req.body.forceSave) {

            // Pengecekan pada tabel lain
            const otherTableCheck = await checkInOtherTables(request, resultscanned);
            if (otherTableCheck) {
                return res.status(otherTableCheck.status).json({ message: otherTableCheck.message });
            }

            // return res.status(409).json({ message: 'Label Sudah Di Nonaktifkan di Proses Produksi. Yakin ingin menyimpan?' });
        }


        // Cek apakah data sudah ada di tabel tertentu
        const checkQuery = `
            SELECT COUNT(*) AS count
            FROM ${tableName}
            WHERE NoSO = @noso AND ${columnName} = @resultscanned;
        `;

        const duplicateResult = await request.query(checkQuery);
        const count = duplicateResult.recordset[0].count;

        if (count > 0) {

            const checkDuplicateLocation = `
            SELECT IdLokasi
            FROM ${tableName}
            WHERE NoSO = @noso AND ${columnName} = @resultscanned;
        `;

            const duplicateLocation = await request.query(checkDuplicateLocation);
            const existingIdLokasi = duplicateLocation.recordset[0].IdLokasi;

            return res.status(422).json({ message: `Data Duplikat! Label Telah Terdaftar di ${existingIdLokasi}` });

        } else {
            // Insert dan update data
            const updateQuery = `
                UPDATE ${tableH}
                SET IdLokasi = @idlokasi
                WHERE ${columnName} = @resultscanned;
            `;

            const insertQuery = `
                INSERT INTO ${tableName} (NoSO, ${columnName}, userID, IdLokasi, DateTimeScan)
                VALUES (@noso, @resultscanned, @username, @idlokasi, GETDATE());
            `;

            await request.query(updateQuery);
            await request.query(insertQuery);


            // Mengirim notifikasi via WebSocket
            wss.clients.forEach(client => {
                if (client.readyState === WebSocket.OPEN) {
                    client.send(`Data ${noso} berhasil diinsert.`);
                }
            });

            console.log(`[${new Date().toISOString()}] 📦 Stock opname - ${username} input label : "${resultscanned}"`);

            return res.status(201).json({ message: 'Data inserted successfully.' });
        }


    } catch (error) {
        console.error('Error inserting/updating data:', error);
        res.status(500).json({ message: 'Failed to insert/update data.', error: error.message });
    } finally {
        if (pool) {
            try {
                await pool.close();
            } catch (err) {
                console.error('Error closing connection pool:', err);
            }
        }
    }
});


module.exports = router;