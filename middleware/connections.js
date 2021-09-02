const mysql = require('mysql');
const cf = require('config');
const {logger} = require('./logger');
const { GenIdCluster, idCluster } = require('./generator');

const dbServer = mysql.createConnection({
  host     : cf.get('db_host'),
  user     : cf.get('db_user'),
  password : cf.get('db_pass'),
  database : cf.get('db_name'),
  timezone : 'UTC 7'
});

exports.ExecuteQuery= function (strQuery){
  return new Promise(async(resolve, reject) => {
    dbServer.query(strQuery,(err, row, field) => {
        if(err) {
          logger.error(err);
          return reject([err]);
        }
        return resolve(row);
    })
  })
}


let dbToko = mysql.createPoolCluster();

exports.SelectQuery = function (strQuery){
  return new Promise(async(resolve, reject) => {
    dbServer.query(strQuery,(err, row, field) => {
        if(err) {
          logger.error(err);
          return reject([err]);
        }
        return resolve(row);
    })
  })
}

exports.InsertQuery = function (strIdCluster, strQuery){
  return new Promise(async(resolve, reject) => {
    let pool = dbToko.of(strIdCluster);
    
    pool.query(strQuery ,(err, row, field) => {
      if(err) {
        logger.error(err);
        return reject([err]);
      }
      return resolve("success");
    })
  })
}

exports.UpdateQuery = function (strIdCluster, strQuery){
  return new Promise(async(resolve, reject) => {
    let pool = dbToko.of(strIdCluster);

    // this.dbToko.query(strQuery, (err, row, field) => {
    pool.query(strQuery ,(err, row, field) => {
      if(err) {
        logger.error(err);
        return reject([err]);
      }
      return resolve("success");
    })
  })
}

exports.DeleteQuery = function (strIdCluster, strQuery){
  return new Promise(async(resolve, reject) => {
    let pool = dbToko.of(strIdCluster);

    // this.dbToko.query(strQuery, (err, row, field) => {
    pool.query(strQuery ,(err, row, field) => {
      if(err) {
        logger.error(err);
        return reject([err]);
      }
      return resolve("success");
    })
  })
}

exports.RunQuery = function (strIdCluster, strQuery){
  return new Promise(async(resolve, reject) => {
    let pool = dbToko.of(strIdCluster);

    // this.dbToko.query(strQuery, (err, row, field) => {
    pool.query(strQuery ,(err, row, field) => {
      if(err) {
        logger.error(err);
        return reject([err]);
      }
      return resolve("success");
    })
  })
}

exports.createConnToko = async function(kodeToko, strIdCluster){
  return new Promise(async(resolve, reject) => {
    dbServer.query(`SELECT kode_toko, dbname as db_name FROM tp_system_toko WHERE kode_toko = '${kodeToko}'`,(err, row, field) => {
      if(err) {
        logger.error(err);
        return reject([err]);
      }
      if (row.length === 0) return reject('Data Toko Tidak Di Temukan !');

      dbToko.add(strIdCluster, {
        host     : cf.get('db_host'),
        user     : cf.get('db_user'),
        password : cf.get('db_pass'),
        database : row[0].db_name,
        debug      : false,
        dateStrings: true,
        connectionLimit     : 10,
        defaultSelector     : 'RR',
        multipleStatements  : true,
        removeNodeErrorCount: 1
      });
      dbToko.getConnection(strIdCluster, (err, connection) => {
        if(err){
          logger.error(err);
          return reject(err);
        }
        return resolve('success.');
      })
    })
  })
}

exports.StartTransaction = async function (strIdCluster){
  return new Promise(async(resolve, reject) => {
    dbToko.getConnection(strIdCluster,async (err, connection) => {
      if(err){
        logger.error(err);
        return reject(err);
      }
      await connection.beginTransaction((err) => {
        if (err) {
          return reject(err);
        }
        return resolve('success.');
      });
    })
  })
}

exports.CommitTransaction = async function (strIdCluster){
  return new Promise(async(resolve, reject) => {
    dbToko.getConnection(strIdCluster,async (err, connection) => {
      if(err){
        logger.error(err);
        await connection.rollback();
        return reject(err);
      }
      await connection.commit(async (err) => {
        if (err) {
          await connection.rollback();
          return reject(err);
        }
        return resolve('success.');
      });
    })
  })
}

exports.RollBackTransaction = async function (strIdCluster) {
  return new Promise(async(resolve, reject) => {
    dbToko.getConnection(strIdCluster,async (err, connection) => {
      if(err){
        logger.error(err);
        return reject(err);
      }
      await connection.rollback();
      return resolve('success.');
    })
  })
}

exports.closeConnection = async function (strIdCluster) {
  var index = idCluster.indexOf(strIdCluster);
  if (index !== -1) idCluster.splice(index, 1);

  await dbToko.remove(strIdCluster);
}

exports.get_field_name = async function (strIdCluster, tableName){
  let sqlQuery = `SHOW FIELDS FROM ${tableName}`;
  let resultSelect = await this.SelectQuery(strIdCluster, sqlQuery)
    .then(result => { return [200, result[0]] }).catch(err => { return [500, err]});
  if (resultSelect[0] === 500) return [500,"Internal Server Error !"];

  if(Object.keys(resultSelect[1]).length === 0) return [404, "Fields table not found !"];

  return [200, resultSelect[1]];
}

exports.get_field_key = async function (strIdCluster, tableName) {
  let sqlQuery = `SHOW INDEX FROM ${tableName} WHERE key_name = 'PRIMARY'`;
  let resultSelect = await this.SelectQuery(strIdCluster, sqlQuery)
    .then(result => { return [200, result[0]] }).catch(err => { return [500, err]});
  if (resultSelect[0] === 500) return [500,"Internal Server Error !"];

  if(Object.keys(resultSelect[1]).length === 0) return [404, "No primary key !"];

  return [200, resultSelect[1]];
}

exports.dbServer = dbServer;