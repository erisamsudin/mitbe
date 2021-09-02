const {get_table_name} = require('../../models/trx_model');
const conn = require('../../middleware/connections');
const Joi = require('@hapi/joi');
const moment = require('moment-timezone');

async function ProsesDelQuery(strIdCluster, dataBody, kodeTrx){
  const {error} = validProsesSimpan(dataBody);
  if(error) return [400, error.details[0].message];
  // Get Table Name
  const dataTable = get_table_name(kodeTrx, dataBody.adm_tipe);
  if (dataTable[0] !== 200) return [dataTable[0], dataTable[1]];

  // Get fields table
  const fieldsHead = await conn.get_field_name(strIdCluster, dataTable[1].head);
  if(fieldsHead[0] !== 200) return [fieldsHead[0], fieldsHead[1]];

  const fieldsDetail = await conn.get_field_name(strIdCluster, dataTable[1].detail);
  if(fieldsDetail[0] !== 200) return [fieldsDetail[0], fieldsDetail[1]];

  // get field key from head
  const fieldKey = await conn.get_field_key(strIdCluster, dataTable[1].head);
  if(fieldKey[0] !== 200) return [fieldKey[0], fieldKey[1]];

  if(Object.keys(fieldKey[1]).length !== 1) return [500, `Table ${dataTable[1].head} tidak memiliki 1 primary key !`];

  let sqlQuery = `SELECT * FROM ${dataTable[1].head} USE INDEX (no_bon) WHERE no_bon = '${dataBody.no_bon}' LIMIT 1`;
  let resultSelect = await conn.SelectQuery(strIdCluster, sqlQuery)
    .then(result => { return [200, result[0]] }).catch(err => { return [500, err]});
  if (resultSelect[0] === 500) return [500, resultSelect[1]];

  if(Object.keys(resultSelect[1]).length === 0) return [404, `No bon : ${dataBody.no_bon} tidak di temukan !`];

  let resultSelectDetail;
  // Looping head row
  for(let x = 0; x < resultSelect[1].length; x++){
    let fieldsInsert = "|";
    let valuesInsert = "|";

    for(let v = 0; v < fieldsHead[1].length; v++){
      fieldsInsert = fieldsInsert + `${fieldsHead[1][v].Field},`;
      if(fieldsHead[1][v].Type === "date"){
        valuesInsert = valuesInsert + `'${moment(resultSelect[1][x][fieldsHead[1][v].Field]).tz("Asia/Jakarta").format('YYYY-MM-DD')}',`
      }else if(fieldsHead[1][v].Type === "datetime"){
        valuesInsert = valuesInsert + `'${moment(resultSelect[1][x][fieldsHead[1][v].Field]).tz("Asia/Jakarta").format('YYYY-MM-DD HH:mm:ss')}',`
      }else{
        valuesInsert = valuesInsert + `'${resultSelect[1][x][fieldsHead[1][v].Field]}',`
      }
    }
    fieldsInsert = fieldsInsert + "|";
    valuesInsert = valuesInsert + "|";

    fieldsInsert = String(fieldsInsert).replace(",|",")");
    valuesInsert = String(valuesInsert).replace(",|",")");
    fieldsInsert = String(fieldsInsert).replace("|","(");
    valuesInsert = String(valuesInsert).replace("|","(");
    
    sqlQuery = `INSERT INTO ${dataTable[1].head_deleted} ${fieldsInsert} VALUES ${valuesInsert}`;
    let resultInsert = await conn.InsertQuery(strIdCluster, sqlQuery)
      .then(result => { return [200, result[0]] }).catch(err => { return [500, err]});
    if (resultInsert[0] === 500) {
      return [500, resultInsert[1]];
    }
    
    sqlQuery = `SELECT * FROM ${dataTable[1].detail} 
      WHERE ${fieldKey[1][0].Column_name} = '${resultSelect[1][x][fieldKey[1][0].Column_name]}'`;
    resultSelectDetail = await conn.SelectQuery(strIdCluster, sqlQuery)
      .then(result => { return [200, result[0]] }).catch(err => { return [500, err]});
    if (resultSelectDetail[0] === 500) return [500, resultSelectDetail[1]];
    
    // Looping detail row
    for(let v = 0; v < resultSelectDetail[1].length; v++){
      let fieldsInsertDetail = "|";
      let valuesInsertDetail = "|";
      let resultUpdate;
      // Looping detail field
      for(let f = 0; f < fieldsDetail[1].length; f++){
        fieldsInsertDetail = fieldsInsertDetail + `${fieldsDetail[1][f].Field},`;
        if(fieldsHead[1][v].Type === "date"){
          valuesInsertDetail = valuesInsertDetail + `'${moment(resultSelectDetail[1][v][fieldsDetail[1][f].Field]).tz("Asia/Jakarta").format('YYYY-MM-DD')}',`
        }else if(fieldsHead[1][v].Type === "datetime"){
          valuesInsertDetail = valuesInsertDetail + `'${moment(resultSelectDetail[1][v][fieldsDetail[1][f].Field]).tz("Asia/Jakarta").format('YYYY-MM-DD HH:mm:ss')}',`
        }else{
          valuesInsertDetail = valuesInsertDetail + `'${resultSelectDetail[1][v][fieldsDetail[1][f].Field]}',`
        }

        // Proses jika barang barcode atau timbang
        if(String(fieldsDetail[1][f].Field).toUpperCase() === "NO_BARCODE"){
          if(String(resultSelectDetail[1][v][fieldsDetail[1][f].Field]).length > 3){
            switch(String(resultSelectDetail[1][v][fieldsDetail[1][f].Field]).slice(0,3).toUpperCase()){
              case "BRC":
                sqlQuery = `UPDATE ${dataTable[1].barcode} SET status = 'OPEN' WHERE no_barcode = '${resultSelectDetail[1][v][fieldsDetail[1][f].Field]}'`;
                resultUpdate = await conn.UpdateQuery(strIdCluster, sqlQuery)
                  .then(result => { return [200, result[0]] }).catch(err => { return [500, err]});
                if (resultUpdate[0] === 500) return [500, resultUpdate[1]];
              case "TMB":
                sqlQuery = `UPDATE ${dataTable[1].timbang} SET status = 'OPEN' WHERE no_timbang = '${resultSelectDetail[1][v][fieldsDetail[1][f].Field]}'`;
                resultUpdate = await conn.UpdateQuery(strIdCluster, sqlQuery)
                  .then(result => { return [200, result[0]] }).catch(err => { return [500, err]});
                if (resultUpdate[0] === 500) return [500, resultUpdate[1]];
            }
          }
        }
      }
      fieldsInsertDetail = fieldsInsertDetail + "|";
      valuesInsertDetail = valuesInsertDetail + "|";
  
      fieldsInsertDetail = String(fieldsInsertDetail).replace(",|",")");
      valuesInsertDetail = String(valuesInsertDetail).replace(",|",")");
      fieldsInsertDetail = String(fieldsInsertDetail).replace("|","(");
      valuesInsertDetail = String(valuesInsertDetail).replace("|","(");
      
      sqlQuery = `INSERT INTO ${dataTable[1].detail_deleted} ${fieldsInsertDetail} VALUES ${valuesInsertDetail}`;
      resultInsert = await conn.InsertQuery(strIdCluster, sqlQuery)
        .then(result => { return [200, result[0]] }).catch(err => { return [500, err]});
      if (resultInsert[0] === 500) {
        return [500, resultInsert[1]];
      }
    }
  
    // Delete head
    sqlQuery = `DELETE FROM ${dataTable[1].head} WHERE ${fieldKey[1][0].Column_name} = '${resultSelect[1][x][fieldKey[1][0].Column_name]}'`;
    let resultDelete = await conn.DeleteQuery(strIdCluster, sqlQuery)
      .then(result => { return [200, result[0]] }).catch(err => { return [500, err]});
    if (resultDelete[0] !== 200) return [500, resultDelete[1]];

    // Delete detail
    sqlQuery = `DELETE FROM ${dataTable[1].detail} WHERE ${fieldKey[1][0].Column_name} = '${resultSelect[1][x][fieldKey[1][0].Column_name]}'`;
    resultDelete = await conn.DeleteQuery(strIdCluster, sqlQuery)
      .then(result => { return [200, result[0]] }).catch(err => { return [500, err]});
    if (resultDelete[0] !== 200) return [500, resultDelete[1]];
  }

  return [200, 'success.'];
}

function validProsesSimpan(dataBody){
  const schema = Joi.object({
    adm_tipe: Joi.string().min(1).max(40).required(),
    tgl_1: Joi.date().required(),
    tgl_2: Joi.date().required(),
    no_bon: Joi.string().min(1).max(20).required()
  });
  return schema.validate(dataBody);  
}

exports.ProsesDelQuery = ProsesDelQuery;