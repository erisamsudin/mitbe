const Joi = require('@hapi/joi');
const moment = require('moment');
const conn = require('../../middleware/connections');

async function trfIn(strIdCluster, dataBody) {
  const { error } = validateTrfIn(dataBody);
  if(error) return [400, error.details[0].message];

  let sqlQuery = `INSERT INTO tt_outstand_ku (no_transaksi, type_trx, tgl_janji, kode_customer, kode_salesman,
    no_penjualan, no_bon, rek_asal, rek_to, awal_rp, saldo_rp, keterangan, status) 
  VALUES (
    '${dataBody.no_transaksi}', 
    '${dataBody.type_trx}',
    '${moment(dataBody.tgl_janji).format('YYYY-MM-DD')}', 
    '${dataBody.kode_customer}', 
    '${dataBody.kode_salesman}',
    '${dataBody.no_penjualan}', 
    '${dataBody.no_bon}', 
    '${dataBody.rek_asal}', 
    '${dataBody.rek_to}', 
    '${dataBody.transfer_rp}', 
    '${dataBody.transfer_rp}', 
    '${dataBody.keterangan}',
    'OPEN'
  )`;
  let resInsert = await conn.InsertQuery(strIdCluster, sqlQuery)
    .then(result => { return [200, result[0]] }).catch(err => { return [500, err]});
  if(resInsert[0] === 500) return [resInsert[0], resInsert[1]];

  return [200, 'success.'];
}

function validateTrfIn(data) {
  const schema = Joi.object({
    no_transaksi: Joi.string().min(1).max(30).required(),
    type_trx: Joi.string().min(1).max(5).required(),
    tgl_janji: Joi.date().required(),
    kode_customer: Joi.string().min(1).max(30).required(),
    kode_salesman: Joi.string().min(1).max(30).required(),
    no_penjualan: Joi.string().min(1).max(30).required(),
    no_bon: Joi.string().min(1).max(30).required(),
    rek_asal: Joi.string().min(1).max(30).required(),
    rek_to: Joi.string().min(1).max(30).required(),
    transfer_rp: Joi.number().required(),
    keterangan: Joi.string().min(1).max(60).required()
  });
  return schema.validate(dataIn);
}

exports.trfIn = trfIn;