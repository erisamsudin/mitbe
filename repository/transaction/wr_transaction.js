const {get_table_name} = require('../../models/trx_model');
const conn = require('../../middleware/connections');
const Joi = require('@hapi/joi');

async function QueryProsesSimpan(strIdCluster, dataBody, kodeTrx){
  // Get Table Name
  const dataTable = get_table_name(kodeTrx, dataBody.adm_tipe);
  if (dataTable[0] !== 200) return [dataTable[0], dataTable[1]];

  // Get fields table
  const fieldsHead = await conn.get_field_name(strIdCluster, dataTable[1].head);
  if(fieldsHead[0] !== 200) return [fieldsHead[0], fieldsHead[1]];

  const fieldsDetail = await conn.get_field_name(strIdCluster, dataTable[1].detail);
  if(fieldsDetail[0] !== 200) return [fieldsDetail[0], fieldsDetail[1]];

  // Validate data body
  const validBody = validProsesSimpan(fieldsHead[1], fieldsDetail[1], dataBody);
  if(validBody.error) return [400, validBody.error.details[0].message];

  // get field key from head
  const fieldKey = await conn.get_field_key(strIdCluster, dataTable[1].head);
  if(fieldKey[0] !== 200) return [fieldKey[0], fieldKey[1]];

  if(Object.keys(fieldKey[1]).length !== 1) return [500, `Table ${dataTable[1].head} tidak memiliki 1 primary key !`];

  // Cek primary data in head 
  let sqlQuery = "";
  let resultSelect;

  for(let x = 0; x < dataBody.head.length; x++){
    // Cek Primary Head
    sqlQuery = `SELECT ${fieldKey[1][0].Column_name} 
      FROM 
        ${dataTable[1].head} USE INDEX(PRIMARY)
      WHERE ${fieldKey[1][0].Column_name} = '${dataBody.head[x][fieldKey[1][0].Column_name]}' LIMIT 1`
    resultSelect = await conn.SelectQuery(strIdCluster, sqlQuery)
      .then(result => { return [200, result[0]] }).catch(err => { return [500, err]});
    if (resultSelect[0] === 500) return [500, resultSelect[1]];

    if (Object.keys(resultSelect[1]).length !== 0) return [400, `Data ${dataBody.head[x][fieldKey[1][0].Column_name]} sudah ada di head, duplicate entry !`];

    // Cek Primary detail
    sqlQuery = `SELECT ${fieldKey[1][0].Column_name} 
      FROM 
        ${dataTable[1].detail} USE INDEX(PRIMARY) 
      WHERE ${fieldKey[1][0].Column_name} = '${dataBody.head[x][fieldKey[1][0].Column_name]}' LIMIT 1`;
    resultSelect = await conn.SelectQuery(strIdCluster, sqlQuery)
      .then(result => { return [200, result[0]] }).catch(err => { return [500, err]});
    if (resultSelect[0] === 500) return [500, resultSelect[1]];

    if (Object.keys(resultSelect[1]).length !== 0) return [400, `Data ${dataBody.head[x][fieldKey[1][0].Column_name]} sudah ada di detail, duplicate entry !`];

    // Cek no_bon
    sqlQuery = `SELECT no_bon 
      FROM 
        ${dataTable[1].head} USE INDEX (no_bon) 
      WHERE no_bon = '${dataBody.head[x].no_bon}' LIMIT 1`;
    resultSelect = await conn.SelectQuery(strIdCluster, sqlQuery)
      .then(result => { return [200, result[0]] }).catch(err => { return [500, err]});
    if (resultSelect[0] === 500) return res.status(500).send("Internal Server Error !");

    if (Object.keys(resultSelect[1]).length !== 0) return [400, `No Bon ${dataBody.head[x].no_bon} sudah di gunakan, duplicate entry !`];
  }

  // Insert to Head
  for(let x = 0; x < dataBody.head.length; x++){
    let fieldsInsert = "|";
    let valuesInsert = "|";

    for(let v = 0; v < fieldsHead[1].length; v++){
      fieldsInsert = fieldsInsert + `${fieldsHead[1][v].Field},`;
      valuesInsert = valuesInsert + `'${dataBody.head[x][fieldsHead[1][v].Field]}',`
    }
    fieldsInsert = fieldsInsert + "|";
    valuesInsert = valuesInsert + "|";

    fieldsInsert = String(fieldsInsert).replace(",|",")");
    valuesInsert = String(valuesInsert).replace(",|",")");
    fieldsInsert = String(fieldsInsert).replace("|","(");
    valuesInsert = String(valuesInsert).replace("|","(");
    
    sqlQuery = `INSERT INTO ${dataTable[1].head} ${fieldsInsert} VALUES ${valuesInsert}`;
    let resultInsert = await conn.InsertQuery(strIdCluster, sqlQuery)
      .then(result => { return [200, result[0]] }).catch(err => { return [500, err]});
    if (resultInsert[0] === 500) {
      return [500, resultInsert[1]];
    }
  }

  // Insert to Detail
  for(let x = 0; x < dataBody.detail.length; x++){
    let fieldsInsertDetail = "|";
    let valuesInsertDetail = "|";

    for(let v = 0; v < fieldsDetail[1].length; v++){
      fieldsInsertDetail = fieldsInsertDetail + `${fieldsDetail[1][v].Field},`;
      valuesInsertDetail = valuesInsertDetail + `'${dataBody.detail[x][fieldsDetail[1][v].Field]}',`
    }
    fieldsInsertDetail = fieldsInsertDetail + "|";
    valuesInsertDetail = valuesInsertDetail + "|";

    fieldsInsertDetail = String(fieldsInsertDetail).replace(",|",")");
    valuesInsertDetail = String(valuesInsertDetail).replace(",|",")");
    fieldsInsertDetail = String(fieldsInsertDetail).replace("|","(");
    valuesInsertDetail = String(valuesInsertDetail).replace("|","(");
    
    sqlQuery = `INSERT INTO ${dataTable[1].detail} ${fieldsInsertDetail} VALUES ${valuesInsertDetail}`;
    let resultInsert = await conn.InsertQuery(strIdCluster, sqlQuery)
      .then(result => { return [200, result[0]] }).catch(err => { return [500, err]});
    if (resultInsert[0] === 500) {
      return [500, resultInsert[1]];
    }
  }

  // Update barcode
  let resultUpdate;
  for(let x = 0; x < dataBody.barcode.length; x++){
    if(dataBody.barcode[x].no_barcode !== "-"){
      sqlQuery = `UPDATE ${dataTable[1].barcode} SET status = 'CLOSED' WHERE no_barcode = '${dataBody.barcode[x].no_barcode}' LIMIT 1`
      resultUpdate = await conn.UpdateQuery( strIdCluster, sqlQuery)
        .then(result => { return [200, result[0]] }).catch(err => { return [500, err]});
      if (resultUpdate[0] === 500) {
        return [500, resultUpdate[1]];
      }
    }
  }

  // Update Timbang
  for(let x = 0; x < dataBody.timbang.length; x++){
    if(dataBody.timbang[x].no_timbang !== "-"){
      sqlQuery = `UPDATE ${dataTable[1].timbang} SET status = 'CLOSED' WHERE no_timbang = '${dataBody.timbang[x].no_timbang}' LIMIT 1`
      resultUpdate = await conn.UpdateQuery(strIdCluster, sqlQuery)
        .then(result => { return [200, result[0]] }).catch(err => { return [500, err]});
      if (resultUpdate[0] === 500) {
        return [500, resultUpdate[1]];
      }
    }
  }

  return [200, 'success.'];
}

// validate body request from client with fields table
function validProsesSimpan(fieldsTableHead, fieldsTableDetail, dataBody){
  let objectFieldHead = {};
  let objectFieldDetail = {};

  for (let i = 0; i < Object.keys(fieldsTableHead).length; i++){
    switch(String(fieldsTableHead[i].Type).slice(0,3).toUpperCase()) {
      case "VAR":
        let iMax = Number(String(String(fieldsTableHead[i].Type).split("(")[1]).replace(")",""));
        objectFieldHead[fieldsTableHead[i].Field] = Joi.string().min(0).max(iMax).required();
        break;
      case "INT":
        objectFieldHead[fieldsTableHead[i].Field] = Joi.number().required();
        break;
      case "TIN":
        objectFieldHead[fieldsTableHead[i].Field] = Joi.number().required();
        break;
      case "DOU":
        objectFieldHead[fieldsTableHead[i].Field] = Joi.number().required();
        break;
      case "DAT":
        objectFieldHead[fieldsTableHead[i].Field] = Joi.date().required();
        break;
      default:
        objectFieldHead[fieldsTableHead[i].Field] = Joi.string().min(0).max(255).required();
    }
  }
  
  for (let i = 0; i < Object.keys(fieldsTableDetail).length; i++){
    switch(String(fieldsTableDetail[i].Type).slice(0,3).toUpperCase()) {
      case "VAR":
        let iMax = Number(String(String(fieldsTableDetail[i].Type).split("(")[1]).replace(")",""));
        objectFieldDetail[fieldsTableDetail[i].Field] = Joi.string().min(0).max(iMax).required();
        break;
      case "INT":
        objectFieldDetail[fieldsTableDetail[i].Field] = Joi.number().required();
        break;
      case "TIN":
        objectFieldDetail[fieldsTableDetail[i].Field] = Joi.number().required();
        break;
      case "DOU":
        objectFieldDetail[fieldsTableDetail[i].Field] = Joi.number().required();
        break;
      case "DAT":
        objectFieldDetail[fieldsTableDetail[i].Field] = Joi.date().required();
        break;
      default:
        objectFieldDetail[fieldsTableDetail[i].Field] = Joi.string().min(0).max(255).required();
    }
  }

  const schema = Joi.object({
    adm_tipe: Joi.string().min(1).max(40).required(),
    head: Joi.array().items(objectFieldHead).required(),
    detail: Joi.array().items(objectFieldDetail).required(),
    barcode: Joi.array().items(Joi.object().keys({
      no_barcode: Joi.string().min(1).max(40).required()
    })).required(),
    timbang: Joi.array().items(Joi.object().keys({
      no_timbang: Joi.string().min(1).max(40).required()
    })).required()
  });
  return schema.validate(dataBody);  
}

exports.QueryProsesSimpan = QueryProsesSimpan;