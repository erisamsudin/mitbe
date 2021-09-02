const Joi = require('@hapi/joi');
const conn = require('../../middleware/connections');
const moment = require('moment');
const { GenNoTitip } = require('../../middleware/generator');

async function ttpIn(strIdCluster, dataBody) {
  const {error} = validateTtp(dataBody);
  if (error) return [400, error.details[0].message];

  let jenisTrx;
  if(Number(dataBody.ambil_titip_rp) === 0){
    jenisTrx = "BARANG";
  } else {
    jenisTrx = "RUPIAH";
  }

  const noTitipCust = await GenNoTitip(strIdCluster, moment(dataBody.tanggal).format('YYYY-MM-DD'));
  if (noTitipCust[0] !== 200) return noTitipCust;

  // Insert tt_titip_customer Card
  sqlQuery = `INSERT INTO tt_titip_customer_card (tanggal, jam, no_titip_customer, no_ext, no_penjualan, kode_lokasi, kode_salesman, kode_customer, jenis_trx,
    out_rp, out_gr, ket, input_by, input_date, reff_valid, status) VALUES (
    '${moment(dataBody.tanggal).format('YYYY-MM-DD')}', 
    '${moment(dataBody.input_date).format('HH:mm:ss')}', 
    '${noTitipCust[1]}', 
    '${noTitipCust[1]}', 
    '${dataBody.no_faktur}', 
    '${dataBody.kode_lokasi}', 
    '${dataBody.kode_salesman}', 
    '${dataBody.kode_customer}', 
    '${jenisTrx}',
    '${dataBody.ambil_titip_rp}', 
    '${dataBody.ambil_titip_gr}', 
    '${dataBody.keterangan}', 
    '${dataBody.input_by}', 
    '${moment(dataBody.input_date).format('YYYY-MM-DD HH:mm:ss')}', 
    '${dataBody.reff_valid}', 
    'VALID'
    )`;
  let resInsert = await conn.InsertQuery(strIdCluster, sqlQuery)
    .then(result => { return [200, result[0]] }).catch(err => { return [500, err]});
  if(resInsert[0] === 500) return [resInsert[0], resInsert[1]];

  // Update ke tt_customer
  sqlQuery = `INSERT INTO tt_saldo_titip_customer (tanggal, jam, no_titip_customer, no_bon, no_penjualan, kode_lokasi, kode_salesman, kode_customer, 
    awal_gr, in_gr, sisa_gr, awal_rp, in_rp, sisa_rp, input_by, input_date, status) VALUES (
    '${moment(dataBody.tanggal).format('YYYY-MM-DD')}', 
    '${moment(dataBody.input_date).format('HH:mm:ss')}', 
    '${noTitipCust[1]}', 
    '${noTitipCust[1]}', 
    '${dataBody.no_faktur}', 
    '${dataBody.kode_lokasi}', 
    '${dataBody.kode_salesman}', 
    '${dataBody.kode_customer}', 
    '${dataBody.ambil_titip_gr}', 
    '${dataBody.ambil_titip_gr}', 
    '${dataBody.ambil_titip_gr}', 
    '${dataBody.ambil_titip_rp}', 
    '${dataBody.ambil_titip_rp}', 
    '${dataBody.ambil_titip_rp}', 
    '${dataBody.input_by}', 
    '${moment(dataBody.input_date).format('YYYY-MM-DD HH:mm:ss')}', 
    'VALID'  
  )`;
  let resUpdate = await conn.UpdateQuery(strIdCluster, sqlQuery)
    .then(result => { return [200, result[0]] }).catch(err => { return [500, err]});
  if(resUpdate[0] === 500) return [resUpdate[0], resUpdate[1]];

  return [200, 'success.'];
}

async function ttpOut(strIdCluster, dataBody) {
  const {error} = validateTtp(dataBody);
  if (error) return [400, error.details[0].message];

  let jenisTrx;
  if(Number(dataBody.ambil_titip_rp) === 0){
    jenisTrx = "BARANG";
  } else {
    jenisTrx = "RUPIAH";
  }

  let sqlQuery = `SELECT no_bon, no_penjualan
  FROM tt_saldo_titip_customer WHERE no_titip_customer = '${dataBody.no_titip_customer}'`;
  let resultSelect = await conn.SelectQuery(strIdCluster, sqlQuery)
    .then(result => { return [200, result[0]] }).catch(err => { return [500, err]});
  if(resultSelect[0] === 500) return [resultSelect[0], resultSelect[1]];

  if (Object.keys(resultSelect[1]).length === 0) return [404, `No titipan ${dataBody.no_titip_customer} tidak di temukan !`];

  // Insert tt_titip_customer Card
  sqlQuery = `INSERT INTO tt_titip_customer_card (tanggal, jam, no_titip_customer, no_ext, no_penjualan, kode_lokasi, kode_salesman, kode_customer, jenis_trx,
    out_rp, out_gr, ket, input_by, input_date, reff_valid, status) VALUES (
    '${moment(dataBody.tanggal).format('YYYY-MM-DD')}', 
    '${moment(dataBody.input_date).format('HH:mm:ss')}', 
    '${dataBody.no_titip_customer}', 
    '${resultSelect[1][0].no_bon}', 
    '${resultSelect[1][0].no_penjualan}', 
    '${dataBody.kode_lokasi}', 
    '${dataBody.kode_salesman}', 
    '${dataBody.kode_customer}', 
    '${jenisTrx}',
    '${dataBody.ambil_titip_rp}', 
    '${dataBody.ambil_titip_gr}', 
    '${dataBody.keterangan}', 
    '${dataBody.input_by}', 
    '${moment(dataBody.input_date).format('YYYY-MM-DD HH:mm:ss')}', 
    '${dataBody.reff_valid}', 
    'VALID'
    )`;
  let resInsert = await conn.InsertQuery(strIdCluster, sqlQuery)
    .then(result => { return [200, result[0]] }).catch(err => { return [500, err]});
  if(resInsert[0] === 500) return [resInsert[0], resInsert[1]];

  // Update ke tt_customer
  sqlQuery = `UPDATE tt_saldo_titip_customer SET 
    out_rp=out_rp + ${Number(dataBody.ambil_titip_rp)},
    sisa_rp=sisa_rp - ${Number(dataBody.ambil_titip_rp)},
    out_gr=out_gr + ${Number(dataBody.ambil_titip_gr)},
    sisa_gr=sisa_gr - ${Number(dataBody.ambil_titip_gr)}
  WHERE
    no_titip_customer = '${dataBody.no_titip_customer}'`;
  let resUpdate = await conn.UpdateQuery(strIdCluster, sqlQuery)
    .then(result => { return [200, result[0]] }).catch(err => { return [500, err]});
  if(resUpdate[0] === 500) return [resUpdate[0], resUpdate[1]];

  return [200, 'success.'];
}

function validateTtp(data) {
  const schema = Joi.object({
    no_faktur: Joi.string().min(1).max(30).required(),
    tanggal: Joi.date().required(),
    no_titip_customer: Joi.string().min(1).max(30).required(),
    kode_lokasi: Joi.string().min(1).max(30).required(),
    kode_salesman: Joi.string().min(1).max(30).required(),
    kode_customer: Joi.string().min(1).max(30).required(),
    ambil_titip_rp: Joi.number().required(),
    ambil_titip_gr: Joi.number().required(),
    keterangan: Joi.string().min(1).max(60).required(),
    reff_valid: Joi.string().min(1).max(30).required(),
    input_by: Joi.string().min(1).max(30).required(),
    input_date: Joi.date().required()
  });
  return schema.validate(data);
}

exports.ttpIn = ttpIn;
exports.ttpOut = ttpOut;