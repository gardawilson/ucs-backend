const moment = require('moment');

exports.formatDate = (date) => moment(date).format('DD-MMM-YYYY');
exports.formatTime = (time) => moment.utc(time).format('HH:mm');
