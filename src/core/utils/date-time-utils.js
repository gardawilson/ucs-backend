// utils/dateUtils.js (atau sesuai nama file kamu)
const moment = require('moment');

exports.formatDate = (date) =>
  date ? moment(date).format('dddd, DD MMM YYYY') : null;

exports.formatTime = (time) =>
  time ? moment.utc(time).format('HH:mm') : null;

// 🔹 Convert berbagai input jadi format 'YYYY-MM-DD' untuk API/SQL
exports.toApiDate = (value) => {
  if (!value) return null;

  // value bisa:
  // - 'Thursday, 13 Nov 2025'
  // - '2025-11-13'
  // - ISO string lain
  const m = moment(
    value,
    [
      'dddd, DD MMM YYYY', // dari Flutter (UI)
      'YYYY-MM-DD',        // kalau sudah raw
      moment.ISO_8601      // jaga-jaga kalau kirim ISO
    ],
    true // strict parsing
  );

  if (!m.isValid()) return null;

  // Keluarkan dalam bentuk raw untuk query DB
  return m.format('YYYY-MM-DD');
};
