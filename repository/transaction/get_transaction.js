const {get_table_name} = require('../../models/trx_model');
const conn = require('../../middleware/connections');
const Joi = require('@hapi/joi');
const moment = require('moment');

async function ProsesGetQuery( strIdCluster, dataBody, kodeTrx, typeGet){
  const {error} = validProsesSimpan(dataBody);
  if(error) return [400, error.details[0].message];

  // Get Table Name
  const dataTable = get_table_name(kodeTrx, dataBody.adm_tipe);
  if (dataTable[0] !== 200) return [dataTable[0], dataTable[1]];

  // Get fields table
  const fieldsHead = await conn.get_field_name( strIdCluster, dataTable[1].head);
  if(fieldsHead[0] !== 200) return [fieldsHead[0], fieldsHead[1]];

  const fieldsDetail = await conn.get_field_name( strIdCluster, dataTable[1].detail);
  if(fieldsDetail[0] !== 200) return [fieldsDetail[0], fieldsDetail[1]];

  // get field key from head
  const fieldKey = await conn.get_field_key( strIdCluster, dataTable[1].head);
  if(fieldKey[0] !== 200) return [fieldKey[0], fieldKey[1]];

  if(Object.keys(fieldKey[1]).length !== 1) return [500, `Table ${dataTable[1].head} tidak memiliki 1 primary key !`];

  let sqlQuery
  if (typeGet === 0){
    sqlQuery = `SELECT * FROM ${dataTable[1].head} USE INDEX (tanggal) WHERE (tanggal BETWEEN '${moment(dataBody.tgl_1).format('YYYY-MM-DD')}' AND '${moment(dataBody.tgl_2).format('YYYY-MM-DD')}')`;
  }else if (typeGet === 2){
    sqlQuery = `SELECT * FROM ${dataTable[1].head} WHERE status_valid = 'OPEN'`;
  }else{
    sqlQuery = `SELECT * FROM ${dataTable[1].head} USE INDEX (no_bon) WHERE no_bon = '${dataBody.no_bon}'`;
  }

  let resultSelect = await conn.SelectQuery(strIdCluster, sqlQuery)
    .then(result => { return [200, result[0]] }).catch(err => { return [500, err]});
  if (resultSelect[0] === 500) return [500, resultSelect[1]];

  let objectSelect = {};
  objectSelect['adm_tipe'] = dataBody.adm_tipe;

  if (Number(Object.keys(resultSelect[1]).length) === Number(0)) {
    objectSelect['head'] = [];
    objectSelect['detail'] = [];
    return [200, objectSelect];
  }

  let objectHead = [];
  let objectDetail = [];
  let resultSelectDetail;
  for(let x = 0; x < resultSelect[1].length; x++){
    objectHead.push(resultSelect[1][x]);
    
    sqlQuery = `SELECT * FROM ${dataTable[1].detail} 
      WHERE ${fieldKey[1][0].Column_name} = '${resultSelect[1][x][fieldKey[1][0].Column_name]}'`;
    resultSelectDetail = await conn.SelectQuery(strIdCluster, sqlQuery)
      .then(result => { return [200, result[0]] }).catch(err => { return [500, err]});
    if (resultSelectDetail[0] === 500) return [500, resultSelectDetail[1]];
    
    for(let v = 0; v < resultSelectDetail[1].length; v++){
      objectDetail.push(resultSelectDetail[1][v])
    }
  }
  return [200, {
    "adm_tipe": dataBody.adm_tipe,
    "head": objectHead,
    "detail": objectDetail
  }];
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

exports.ProsesGetQuery = ProsesGetQuery;