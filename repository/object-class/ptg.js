const conn = require('../../middleware/connections');
const {DateNow} = require('../../middleware/datetime');
const Joi = require('@hapi/joi');
const {pad} = require('../../middleware/generator');
const moment = require('moment-timezone');

async function ptg_wr_new(strIdCluster, dataIn){
  const {error} = validatePiutangIn(dataIn);
  if(error) return [500, "[Internal Server Error !]Piutang IN Error : " + error.details[0].message];

  let jamIn = String(moment(DateNow()).format('HH:mm:ss'));
  let dateTrx = moment(dataIn.tanggal).tz("Asia/Jakarta").format('YYYY-MM-DD HH:mm:ss');
  let inputDate = moment(dataIn.input_date).tz("Asia/Jakarta").format('YYYY-MM-DD HH:mm:ss');
  
  let strKeterangan = "";
  switch(String(dataIn.keterangan).toUpperCase()){
    case "PENJUALAN":
      strKeterangan = "ONGKOS JUAL";
      break;
    default:
      strKeterangan = dataIn.keterangan;    
  }

  // Insert into tt_piutang_card
  let sqlQuery = `INSERT INTO tt_piutang_card 
    (tanggal,jam,no_penjualan,in_netto,no_ref,no_ext,keterangan,input_by,input_date,status) VALUES (
    '${dateTrx}', '${jamIn}', '${dataIn.no_penjualan}', '${dataIn.in_netto}', '${dataIn.no_penjualan}', '${dataIn.no_bon}', 
    '${dataIn.keterangan}', '${dataIn.input_by}', '${inputDate}','VALID')`;
  let resultInsert = await conn.InsertQuery(strIdCluster, sqlQuery)
    .then(result => { return [200, result[0]] }).catch(err => { return [500, err]});
  if (resultInsert[0] === 500) return [500, resultInsert[1]];

  if(Number(dataIn.in_ongkos_rp) !== 0){
    let jamIn2 = jamIn.split(":")[0] + ":" + jamIn.split(":")[1] + ":" + Number(Number(jamIn.split(":")[2]) + 1).pad(2);
    sqlQuery = `INSERT INTO tt_piutang_card (tanggal,jam,no_penjualan,in_ongkos_rp,no_ref,no_ext,keterangan,input_by,input_date,status) VALUES (
      '${dateTrx}','${jamIn2}','${dataIn.no_penjualan}','${dataIn.in_ongkos_rp}','${dataIn.no_penjualan}','${dataIn.no_bon}',
      '${strKeterangan}','${dataIn.input_by}','${inputDate}','VALID')`;
    resultInsert = await conn.InsertQuery(strIdCluster, sqlQuery)
      .then(result => { return [200, result[0]] }).catch(err => { return [500, err]});
    if (resultInsert[0] === 500) return [500, resultInsert[1]];
  }

  // Insert into tt_saldo_piutang
  sqlQuery = `INSERT INTO tt_saldo_piutang (no_penjualan,no_bon,tgl_penjualan,kode_lokasi,kode_customer,crd,tgl_jthtempo,awal_netto,akhir_netto,awal_ongkos_rp,akhir_ongkos_rp,input_by,input_date) VALUES (
    '${dataIn.no_penjualan}','${dataIn.no_bon}','${dateTrx}','${dataIn.kode_lokasi}','${dataIn.kode_customer}','0','${dateTrx}',
    '${dataIn.in_netto}','${dataIn.in_netto}','${dataIn.in_ongkos_rp}','${dataIn.in_ongkos_rp}','${dataIn.input_by}','${inputDate}')`
  resultInsert = await conn.InsertQuery(strIdCluster, sqlQuery)
    .then(result => { return [200, result[0]] }).catch(err => { return [500, err]});
  if (resultInsert[0] === 500) return [500, resultInsert[1]];

  return [200, 'success.'];
}

async function ptgIn(dataIn){

}

async function ptgOut(strIdCluster, dataOut){
  const {error} = validatePiutangIn(dataOut);
  if (error) return [400, error.details[0].message];

  let strKeterangan = "";
  switch(String(dataOut.keterangan).toUpperCase()) {
    case "BAYAR PIUTANG CUSTOMER":
      strKeterangan = "BAYAR PIUTANG RUPIAH"
      break;
    default:
      strKeterangan = dataOut.keterangan;
  }

  let sqlQuery;
  let resultInsert;
  // Insert into tt_piutang_card
  if(Number(dataOut.in_netto) !== 0){
    sqlQuery = `INSERT INTO tt_piutang_card 
      (tanggal,jam,no_penjualan,out_netto,no_ref,no_ext,keterangan,input_by,input_date,status) VALUES (
      '${dateTrx}', '${jamIn}', '${dataOut.no_penjualan}', '${dataOut.in_netto}', '${dataOut.no_penjualan}', '${dataOut.no_bon}', 
      '${dataOut.keterangan}', '${dataOut.input_by}', '${inputDate}','VALID')`;
    resultInsert = await conn.InsertQuery(strIdCluster, sqlQuery)
      .then(result => { return [200, result[0]] }).catch(err => { return [500, err]});
    if (resultInsert[0] === 500) return [500, resultInsert[1]];
  }

  if(Number(dataOut.in_ongkos_rp) !== 0){
    let jamIn2 = jamIn.split(":")[0] + ":" + jamIn.split(":")[1] + ":" + Number(Number(jamIn.split(":")[2]) + 1).pad(2);
    sqlQuery = `INSERT INTO tt_piutang_card (tanggal,jam,no_penjualan,out_ongkos_rp,no_ref,no_ext,keterangan,input_by,input_date,status) VALUES (
      '${dateTrx}','${jamIn2}','${dataOut.no_penjualan}','${dataOut.in_ongkos_rp}','${dataOut.no_penjualan}','${dataOut.no_bon}',
      '${strKeterangan}','${dataOut.input_by}','${inputDate}','VALID')`;
    resultInsert = await conn.InsertQuery(strIdCluster, sqlQuery)
      .then(result => { return [200, result[0]] }).catch(err => { return [500, err]});
    if (resultInsert[0] === 500) return [500, resultInsert[1]];
  }

  // Update Saldo Piutang
  sqlQuery = `SELECT akhir_netto, akhir_ongkos_rp FROM tt_saldo_piutang WHERE no_penjualan = '${dataOut.no_penjualan}'`;
  let resultSelect = await conn.SelectQuery(strIdCluster, sqlQuery)
    .then(result => { return [200, result[0]] }).catch(err => { return [500, err]});
  if (resultSelect[0] === 500) return [500, resultSelect[1]];

  if (Object.keys(resultSelect[1]).length === 0) return [404, `Saldo piutang faktur : ${dataOut.no_penjualan} tidak di temukan !`];

  const akhirNetto = Number(resultSelect[1][0].akhir_netto) - Number(dataOut.in_netto);
  const akhirOngkos = Number(resultSelect[1][0].akhir_ongkos_rp) - Number(dataOut.in_ongkos_rp);

  sqlQuery = `UPDATE tt_saldo_piutang SET 
    akhir_netto='${akhirNetto}',
    akhir_ongkos_rp='${akhirOngkos}' 
    WHERE no_penjualan = '${dataOut.no_penjualan}'`
  let resultUpdate = await conn.UpdateQuery(strIdCluster, sqlQuery)
    .then(result => { return [200, result[0]] }).catch(err => { return [500, err]});
  if (resultUpdate[0] === 500) return [500, resultUpdate[1]];

  return [200, 'success.'];
}

function validatePiutangIn(dataIn){
  const schema = Joi.object({
    no_penjualan: Joi.string().min(1).max(40).required(),
    no_bon: Joi.string().min(1).max(40).required(),
    keterangan: Joi.string().min(1).max(40).required(),
    tanggal: Joi.date().required(),
    kode_lokasi: Joi.string().min(1).max(40).required(),
    kode_customer: Joi.string().min(1).max(40).required(),
    in_netto: Joi.number().required(),
    in_ongkos_rp: Joi.number().required(),
    input_by: Joi.string().min(1).max(40).required(),
    input_date: Joi.date().required()
  });
  return schema.validate(dataIn);
}

exports.ptg_wr_new = ptg_wr_new;
exports.ptgIn = ptgIn;
exports.ptgOut = ptgOut;