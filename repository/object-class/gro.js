const Joi = require('@hapi/joi');
const moment = require('moment');
const conn = require('../../middleware/connections');

async function groIn(strIdCluster, dataBody) {
  const { error } = validateGro(dataBody);
  if(error) return [400, error.details[0].message];

  let sqlQuery = `INSERT INTO tt_outstand_giro (no_transaksi, type_trx, due_date, kode_customer, 
    kode_salesman, no_penjualan, no_bon, no_giro, nama_bank, rek_to_giro, awal_rp, saldo_rp, keterangan) 
  VALUES (
    '${dataBody.no_transaksi}', 
    '${dataBody.type_trx}', 
    '${moment(dataBody.due_date).format('YYYY-MM-DD')}', 
    '${dataBody.kode_customer}', 
    '${dataBody.kode_salesman}', 
    '${dataBody.no_penjualan}', 
    '${dataBody.no_bon}', 
    '${dataBody.no_giro}', 
    '${dataBody.nama_bank}', 
    '${dataBody.rek_to_giro}', 
    '${dataBody.giro_rp}', 
    '${dataBody.giro_rp}', 
    '${dataBody.keterangan}'
  )`;
  let resInsert = await conn.InsertQuery(strIdCluster, sqlQuery)
    .then(result => { return [200, result[0]] }).catch(err => { return [500, err]});
  if(resInsert[0] === 500) return [resInsert[0], resInsert[1]];

  return [200, 'success.'];
}

function validateGro(data) {
  const schema = Joi.object({
    no_transaksi: Joi.string().min(1).max(30).required(),
    type_trx: Joi.string().min(1).max(5).required(),
    due_date: Joi.date().required(),
    kode_customer: Joi.string().min(1).max(30).required(),
    kode_salesman: Joi.string().min(1).max(30).required(),
    no_penjualan: Joi.string().min(1).max(30).required(),
    no_bon: Joi.string().min(1).max(30).required(),
    no_giro: Joi.string().min(1).max(30).required(),
    nama_bank: Joi.string().min(1).max(30).required(),
    rek_to_giro: Joi.string().min(1).max(30).required(),
    giro_rp: Joi.number().required(),
    keterangan: Joi.string().min(1).max(60).required()
  });
  return schema.validate(dataIn);
}

exports.groIn = groIn;