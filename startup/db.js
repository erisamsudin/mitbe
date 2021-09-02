const conn = require('../middleware/connections');
const winston = require('winston');

module.exports = function() {
  conn.dbServer.connect((err) => {
    if(err){
      throw err;
    }
    winston.info('MySql Database Connected.')
  });
}