const moment = require('moment');

exports.formatDate = (date) => 
    date ? moment(date).format('dddd, DD MMM YYYY') : null;
  exports.formatTime = (time) => moment.utc(time).format('HH:mm');
