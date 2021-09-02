const moment = require('moment-timezone');
const Joi = require('@hapi/joi');
const {GenNoRefCash} = require('../../middleware/generator');
const { InsertQuery, SelectQuery, UpdateQuery } = require('../../middleware/connections');

async function mnyIn(dataBody){
  const {error} = validateMany(dataBody);
  if(error) return [400, error.details[0].message];

  // Insert tt_cash_detail
  const noReff = await GenNoRefCash(moment(dataBody.tanggal).format('YYYY-MM-DD'));
  let sqlQuery = `INSERT INTO tt_cash_detail (no_reff,type_trx,tanggal,kategori,deskripsi,curr,cash_in,input_by,input_date) VALUES (
    '${noReff}',
    'D',
    '${moment(dataBody.tanggal).format('YYYY-MM-DD')}',
    '${dataBody.kategori}',
    '${dataBody.deskripsi}',
    '${dataBody.curr}',
    '${dataBody.cash}',
    '${dataBody.input_by}',
    '${moment(dataBody.input_date).format('YYYY-MM-DD HH:mm:ss')}'
  )`;
  let resultInsert = await InsertQuery(sqlQuery)
    .then(result => { return [200, result[0]] }).catch(err => { return [500, err]});
  if (resultInsert[0] === 500) return [500, resultInsert[1]];

  // Insert tt_cash_head
  let saldoAwal = 0;
  let saldoAkhir = 0;
  let resultUpdate;

  sqlQuery = `SELECT * FROM tt_cash_head 
    WHERE tanggal = '${moment(dataBody.tanggal).format('YYYY-MM-DD')}' AND curr = 'RUPIAH' LIMIT 1`;
  let resultSelect = await SelectQuery(sqlQuery)
    .then(result => { return [200, result[0]] }).catch(err => { return [500, err]});
  if (resultSelect[0] === 500) return [500, resultSelect[1]];
  
  if (Object.keys(resultSelect[1]).length === 0){
    sqlQuery = `SELECT saldo_akhir FROM tt_cash_head 
      WHERE tanggal < '${moment(dataBody.tanggal).format('YYYY-MM-DD')}' AND curr = 'RUPIAH' ORDER BY tanggal DESC LIMIT 1`;
    resultSelect = await SelectQuery(sqlQuery)
      .then(result => { return [200, result[0]] }).catch(err => { return [500, err]});
    if (resultSelect[0] === 500) return [500, resultSelect[1]];

    if (Object.keys(resultSelect[1]).length !== 0){
      saldoAwal = Number(resultSelect[1][0].saldo_akhir);
      saldoAkhir = Number(resultSelect[1][0].saldo_akhir) + Number(dataBody.cash);
    } else {
      saldoAkhir = Number(dataBody.cash)
    }

    sqlQuery = `INSERT INTO tt_cash_head (tanggal, curr, saldo_awal, cash_in, cash_out, saldo_akhir) VALUES (
      '${moment(dataBody.tanggal).format('YYYY-MM-DD')}', 
      '${dataBody.curr}', 
      '${saldoAwal}', 
      '${dataBody.cash}', 
      '0', 
      '${saldoAkhir}')`
    resultInsert = await InsertQuery(sqlQuery)
      .then(result => { return [200, result[0]] }).catch(err => { return [500, err]});
    if (resultInsert[0] === 500) return [500, resultInsert[1]];
  } else {
    sqlQuery = `UPDATE tt_cash_head SET 
      cash_in = cash_in + ${dataBody.cash}, 
      saldo_akhir = saldo_akhir + ${dataBody.cash} 
    WHERE tanggal = '${moment(dataBody.tanggal).format('YYYY-MM-DD')}' AND curr = '${dataBody.curr}' LIMIT 1`
    resultUpdate = await UpdateQuery(sqlQuery)
      .then(result => { return [200, result[0]] }).catch(err => { return [500, err]});
    if (resultUpdate[0] === 500) return [500, resultUpdate[1]];
  }

  sqlQuery = `UPDATE tt_cash_head USE INDEX(PRIMARY) SET 
    saldo_awal = saldo_awal + ${dataBody.cash}, 
    saldo_akhir = saldo_akhir + ${dataBody.cash} 
  WHERE tanggal > '${moment(dataBody.tanggal).format('YYYY-MM-DD')}' AND curr = '${dataBody.curr}'`
  resultUpdate = await UpdateQuery(sqlQuery)
    .then(result => { return [200, result[0]] }).catch(err => { return [500, err]});
  if (resultUpdate[0] === 500) return [500, resultUpdate[1]];

  return [200, 'success.'];
}

function  validateMany(data) {
  const schema = Joi.object({
    tanggal: Joi.date().required(),
    kategori: Joi.string().min(1).max(60).required(),
    deskripsi: Joi.string().min(1).max(60).required(),
    curr: Joi.string().min(1).max(30).required(),
    cash: Joi.number().required(),
    input_by: Joi.string().min(1).max(30).required(),
    input_date: Joi.date().required()
  });
  return schema.validate(data);
}

exports.mnyIn = mnyIn;