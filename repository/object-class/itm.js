const Joi = require('@hapi/joi');
const conn = require('../../middleware/connections');
const moment = require('moment');
const getTableItem = require('../../models/itm_model');

async function itmIn(strIdCluster, dataBody) {
  const {error} = validateItem(dataBody);
  if(error) return [400, error.details[0].message];

  const tablesItem = getTableItem.get_table_name(dataBody.jenis_item);
  if (tablesItem[0] !== 200) return tablesItem;
  
  // Proses Table Card
  const tableCard = String(tablesItem[1].card).trim() + `_${dataBody.kode_lokasi}`;
  const tableSaldo = tablesItem[1].saldo;
  let sqlQuery;
  if (String(dataBody.kode_lokasi).toUpperCase() !== "PUSAT") {
    sqlQuery = `CREATE TABLE IF NOT EXISTS ${tableCard} LIKE ${String(tablesItem[1].card).trim()}_pusat`;
    let resCreate = await conn.RunQuery(strIdCluster, sqlQuery)
      .then(result => { return [200, result[0]] }).catch(err => { return [500, err]});
    if (resCreate[0] === 500) return [resCreate[0], resCreate[1]];
  }
  sqlQuery = `INSERT INTO ${tableCard} (tanggal, jam, kode_kategori, kode_jenis, in_gross, in_netto, no_ref, no_ext, keterangan, input_by, input_date) VALUES (
    '${moment(dataBody.tanggal).format('YYYY-MM-DD')}', 
    '${moment(dataBody.input_date).format('HH:mm:ss')}', 
    '${dataBody.kode_kategori}', 
    '${dataBody.kode_jenis}', 
    '${dataBody.gross}', 
    '${dataBody.netto}', 
    '${dataBody.no_ref}', 
    '${dataBody.no_ext}', 
    '${dataBody.keterangan}', 
    '${dataBody.input_by}', 
    '${moment(dataBody.input_date).format('YYYY-MM-DD HH:mm:ss')}'
  )`;

  // {
  //   "tanggal": `${moment(dataBody.tanggal).format('YYYY-MM-DD')}`, 
  //   "jam": `${moment(dataBody.input_date).format('HH:mm:ss')}`, 
    
  // }

  let resInsert = await conn.InsertQuery(strIdCluster, sqlQuery)
    .then(result => { return [200, result[0]] }).catch(err => { return [500, err]});
  if (resInsert[0] === 500) return [resInsert[0], resInsert[1]];

  // Proses Table Saldo
  sqlQuery = `SELECT akhir_gross, akhir_netto FROM 
    ${tableSaldo} 
  WHERE
    kode_lokasi='${dataBody.kode_lokasi}' AND kode_jenis='${dataBody.kode_jenis}' 
    AND tanggal < '${moment(dataBody.tanggal).format('YYYY-MM-DD')}' 
  ORDER BY tanggal DESC LIMIT 1`;
  let resSelect = await conn.SelectQuery(strIdCluster, sqlQuery)
    .then(result => { return [200, result[0]] }).catch(err => { return [500, err]});
  if (resSelect[0] === 500) return [resSelect[0], resSelect[1]];

  let awalGross = 0;
  let awalNetto = 0;
  if(Object.keys(resSelect[1]).length !== 0) {
    awalGross = Number(resSelect[1][0].akhir_gross);
    awalNetto = Number(resSelect[1][0].akhir_netto);
  }
  let akhirGross = Number(awalGross) + Number(dataBody.gross);
  let akhirNetto = Number(awalNetto) + Number(dataBody.netto);

  sqlQuery = `SELECT ${dataBody.jenis_field}_gross, ${dataBody.jenis_field}_netto, akhir_gross, akhir_netto FROM 
    ${tableSaldo}
  WHERE 
    kode_lokasi='${dataBody.kode_lokasi}' AND kode_jenis='${dataBody.kode_jenis}' 
    AND tanggal='${moment(dataBody.tanggal).format('YYYY-MM-DD')}' LIMIT 1`;
  resSelect = await conn.SelectQuery(strIdCluster, sqlQuery)
    .then(result => { return [200, result[0]] }).catch(err => { return [500, err]});
  if (resSelect[0] === 500) return [resSelect[0], resSelect[1]];

  let resUpdate;
  if(Object.keys(resSelect[1]).length === 0) {
    if (String(dataBody.jenis_item).toUpperCase === "BAYAR") {
      sqlQuery = `INSERT INTO ${tableSaldo} (
        tanggal, kode_lokasi, kode_kategori, kode_jenis, awal_gross, awal_netto, 
        ${dataBody.jenis_field}_gross, ${dataBody.jenis_field}_netto, akhir_gross, akhir_netto
      ) VALUES (
        '${moment(dataBody.tanggal).format('YYYY-MM-DD')}', 
        '${dataBody.kode_lokasi}', 
        '${dataBody.kode_kategori}', 
        '${dataBody.kode_jenis}', 
        '${awalGross}', 
        '${awalNetto}', 
        '${dataBody.gross}', 
        '${dataBody.netto}', 
        '${akhirGross}', 
        '${akhirNetto}'
      )`;
    } else {
      let kadarBarang = await getKadar(strIdCluster, dataBody.kode_jenis);
      if (kadarBarang[0] !== 200) return kadarBarang;

      sqlQuery = `INSERT INTO ${tableSaldo} (
        tanggal, kode_lokasi, kode_kategori, kode_jenis, kadar_cetak, kadar_beli, kadar_jual, 
        awal_gross, awal_netto, ${dataBody.jenis_field}_gross, ${dataBody.jenis_field}_netto,
        akhir_gross, akhir_netto
      ) VALUES (
        '${moment(dataBody.tanggal).format('YYYY-MM-DD')}', 
        '${dataBody.kode_lokasi}', 
        '${dataBody.kode_kategori}', 
        '${dataBody.kode_jenis}', 
        '${kadarBarang[1].kadar_cetak}', 
        '${kadarBarang[1].kadar_beli}', 
        '${kadarBarang[1].kadar_jual}',
        '${awalGross}', 
        '${awalNetto}', 
        '${dataBody.gross}', 
        '${dataBody.netto}', 
        '${akhirGross}', 
        '${akhirNetto}'
      )`;
    }
    resInsert = await conn.InsertQuery(strIdCluster, sqlQuery)
      .then(result => { return [200, result[0]] }).catch(err => { return [500, err]});
    if (resInsert[0] === 500) return [resInsert[0], resInsert[1]];
  } else {
    sqlQuery = `UPDATE ${tableSaldo} SET 
      ${dataBody.jenis_field}_gross=${dataBody.jenis_field}_gross + ${Number(dataBody.gross)},
      ${dataBody.jenis_field}_netto=${dataBody.jenis_field}_netto + ${Number(dataBody.netto)},
      akhir_gross=akhir_gross + ${Number(dataBody.gross)},
      akhir_netto=akhir_netto + ${Number(dataBody.netto)}
    WHERE 
      kode_lokasi='${dataBody.kode_lokasi}' AND kode_jenis='${dataBody.kode_jenis}' 
      AND tanggal='${moment(dataBody.tanggal).format('YYYY-MM-DD')}' LIMIT 1`;
    resUpdate = await conn.UpdateQuery(strIdCluster, sqlQuery)
      .then(result => { return [200, result[0]] }).catch(err => { return [500, err]});
    if (resUpdate[0] === 500) return [resUpdate[0], resUpdate[1]];
  }

  // Update saldo awal dan akhir tanggal setelahnya
  sqlQuery = `UPDATE ${tableSaldo} SET 
    awal_gross=awal_gross + ${Number(dataBody.gross)},
    awal_netto=awal_netto + ${Number(dataBody.netto)},
    akhir_gross=akhir_gross + ${Number(dataBody.gross)},
    akhir_netto=akhir_netto + ${Number(dataBody.netto)}
  WHERE 
    kode_lokasi='${dataBody.kode_lokasi}' AND kode_jenis='${dataBody.kode_jenis}' 
    AND tanggal>'${moment(dataBody.tanggal).format('YYYY-MM-DD')}'`;
  resUpdate = await conn.UpdateQuery(strIdCluster, sqlQuery)
    .then(result => { return [200, result[0]] }).catch(err => { return [500, err]});
  if (resUpdate[0] === 500) return [resUpdate[0], resUpdate[1]];

  return [200, 'success.'];
}

async function itmOut(strIdCluster, dataBody) {
  const {error} = validateItem(dataBody);
  if(error) return [400, error.details[0].message];

  const tablesItem = getTableItem.get_table_name(dataBody.jenis_item);
  if (tablesItem[0] !== 200) return tablesItem;

  // Proses Table Card
  const tableCard = String(tablesItem[1].card).trim() + `_${dataBody.kode_lokasi}`;
  const tableSaldo = tablesItem[1].saldo;
  let sqlQuery;
  if (String(dataBody.kode_lokasi).toUpperCase() !== "PUSAT") {
    sqlQuery = `CREATE TABLE IF NOT EXISTS ${tableCard} LIKE ${String(tablesItem[1].card).trim()}_pusat`;
    let resCreate = await conn.RunQuery(strIdCluster, sqlQuery)
      .then(result => { return [200, result[0]] }).catch(err => { return [500, err]});
    if (resCreate[0] === 500) return [resCreate[0], resCreate[1]];
  }
  sqlQuery = `INSERT INTO ${tableCard} (tanggal, jam, kode_kategori, kode_jenis, out_gross, out_netto, 
    no_ref, no_ext, keterangan, input_by, input_date) VALUES (
    '${moment(dataBody.tanggal).format('YYYY-MM-DD')}', 
    '${moment(dataBody.input_date).format('HH:mm:ss')}', 
    '${dataBody.kode_kategori}', 
    '${dataBody.kode_jenis}', 
    '${dataBody.gross}', 
    '${dataBody.netto}', 
    '${dataBody.no_ref}', 
    '${dataBody.no_ext}', 
    '${dataBody.keterangan}', 
    '${dataBody.input_by}', 
    '${moment(dataBody.input_date).format('YYYY-MM-DD HH:mm:ss')}'
  )`;
  let resInsert = await conn.InsertQuery(strIdCluster, sqlQuery)
    .then(result => { return [200, result[0]] }).catch(err => { return [500, err]});
  if (resInsert[0] === 500) return [resInsert[0], resInsert[1]];

  // Proses Table Saldo
  sqlQuery = `SELECT akhir_gross, akhir_netto FROM 
    ${tableSaldo} 
  WHERE
    kode_lokasi='${dataBody.kode_lokasi}' AND kode_jenis='${dataBody.kode_jenis}' 
    AND tanggal < '${moment(dataBody.tanggal).format('YYYY-MM-DD')}' 
  ORDER BY tanggal DESC LIMIT 1`;
  let resSelect = await conn.SelectQuery(strIdCluster, sqlQuery)
    .then(result => { return [200, result[0]] }).catch(err => { return [500, err]});
  if (resSelect[0] === 500) return [resSelect[0], resSelect[1]];

  let awalGross = 0;
  let awalNetto = 0;
  if(Object.keys(resSelect[1]).length !== 0) {
    awalGross = Number(resSelect[1][0].akhir_gross);
    awalNetto = Number(resSelect[1][0].akhir_netto);
  }
  let akhirGross = Number(awalGross) - Number(dataBody.gross);
  let akhirNetto = Number(awalNetto) - Number(dataBody.netto);

  sqlQuery = `SELECT ${dataBody.jenis_field}_gross, ${dataBody.jenis_field}_netto, akhir_gross, akhir_netto FROM 
    ${tableSaldo}
  WHERE 
    kode_lokasi='${dataBody.kode_lokasi}' AND kode_jenis='${dataBody.kode_jenis}' 
    AND tanggal='${moment(dataBody.tanggal).format('YYYY-MM-DD')}' LIMIT 1`;
  resSelect = await conn.SelectQuery(strIdCluster, sqlQuery)
    .then(result => { return [200, result[0]] }).catch(err => { return [500, err]});
  if (resSelect[0] === 500) return [resSelect[0], resSelect[1]];

  let resUpdate;
  if(Object.keys(resSelect[1]).length === 0) {
    if (String(dataBody.jenis_item).toUpperCase === "BAYAR") {
      sqlQuery = `INSERT INTO ${tableSaldo} (
        tanggal, kode_lokasi, kode_kategori, kode_jenis, awal_gross, awal_netto, 
        ${dataBody.jenis_field}_gross, ${dataBody.jenis_field}_netto, akhir_gross, akhir_netto
      ) VALUES (
        '${moment(dataBody.tanggal).format('YYYY-MM-DD')}', 
        '${dataBody.kode_lokasi}', 
        '${dataBody.kode_kategori}', 
        '${dataBody.kode_jenis}', 
        '${awalGross}', 
        '${awalNetto}', 
        '${dataBody.gross}', 
        '${dataBody.netto}', 
        '${akhirGross}', 
        '${akhirNetto}'
      )`;
    } else {
      let kadarBarang = await getKadar(strIdCluster, dataBody.kode_jenis);
      if (kadarBarang[0] !== 200) return kadarBarang;

      sqlQuery = `INSERT INTO ${tableSaldo} (
        tanggal, kode_lokasi, kode_kategori, kode_jenis, kadar_cetak, kadar_beli, kadar_jual, 
        awal_gross, awal_netto, ${dataBody.jenis_field}_gross, ${dataBody.jenis_field}_netto,
        akhir_gross, akhir_netto
      ) VALUES (
        '${moment(dataBody.tanggal).format('YYYY-MM-DD')}', 
        '${dataBody.kode_lokasi}', 
        '${dataBody.kode_kategori}', 
        '${dataBody.kode_jenis}', 
        '${kadarBarang[1].kadar_cetak}', 
        '${kadarBarang[1].kadar_beli}', 
        '${kadarBarang[1].kadar_jual}',
        '${awalGross}', 
        '${awalNetto}', 
        '${dataBody.gross}', 
        '${dataBody.netto}', 
        '${akhirGross}', 
        '${akhirNetto}'
      )`;
    }
    resInsert = await conn.InsertQuery(strIdCluster, sqlQuery)
      .then(result => { return [200, result[0]] }).catch(err => { return [500, err]});
    if (resInsert[0] === 500) return [resInsert[0], resInsert[1]];
  } else {
    sqlQuery = `UPDATE ${tableSaldo} SET 
      ${dataBody.jenis_field}_gross=${dataBody.jenis_field}_gross + ${Number(dataBody.gross)},
      ${dataBody.jenis_field}_netto=${dataBody.jenis_field}_netto + ${Number(dataBody.netto)},
      akhir_gross=akhir_gross + ${Number(dataBody.gross)},
      akhir_netto=akhir_netto + ${Number(dataBody.netto)}
    WHERE 
      kode_lokasi='${dataBody.kode_lokasi}' AND kode_jenis='${dataBody.kode_jenis}' 
      AND tanggal='${moment(dataBody.tanggal).format('YYYY-MM-DD')}' LIMIT 1`;
    resUpdate = await conn.UpdateQuery(strIdCluster, sqlQuery)
      .then(result => { return [200, result[0]] }).catch(err => { return [500, err]});
    if (resUpdate[0] === 500) return [resUpdate[0], resUpdate[1]];
  }

  // Update saldo awal dan akhir tanggal setelahnya
  sqlQuery = `UPDATE ${tableSaldo} SET 
    awal_gross=awal_gross - ${Number(dataBody.gross)},
    awal_netto=awal_netto - ${Number(dataBody.netto)},
    akhir_gross=akhir_gross - ${Number(dataBody.gross)},
    akhir_netto=akhir_netto - ${Number(dataBody.netto)}
  WHERE 
    kode_lokasi='${dataBody.kode_lokasi}' AND kode_jenis='${dataBody.kode_jenis}' 
    AND tanggal>'${moment(dataBody.tanggal).format('YYYY-MM-DD')}'`;
  resUpdate = await conn.UpdateQuery(strIdCluster, sqlQuery)
    .then(result => { return [200, result[0]] }).catch(err => { return [500, err]});
  if (resUpdate[0] === 500) return [resUpdate[0], resUpdate[1]];

  return [200, 'success.'];
}

async function getKadar(strIdCluster, strKodeJenis) {
  let sqlQuery = `SELECT kadar_cetak, kadar_beli, kadar_jual
    FROM tm_jenis WHERE kode_jenis = '${strKodeJenis}'`;
  let resSelect = await conn.SelectQuery(strIdCluster, strKodeJenis)
    .then(result => { return [200, result[0]] }).catch(err => { return [500, err]});
  if (resSelect[0] === 500) return [resSelect[0], resSelect[1]];

  if (Object.keys(resSelect[0]).length === 0) return [404, `Data barang : ${strKodeJenis} tidak di temukan !`];

  return [200,{
    "kadar_cetak" : resSelect[1][0].kadar_cetak,
    "kadar_beli" : resSelect[1][0].kadar_beli,
    "kadar_jual" : resSelect[1][0].kadar_jual
  }];
}

function validateItem(data) {
  const schema = Joi.object({
    jenis_item: Joi.string().valid(["BARANG", "BAYAR"]).required(),
    jenis_field: Joi.string().valid(["in", "out", "jual"]).required(),
    tanggal: Joi.date().required(),
    kode_lokasi: Joi.string().min(1).max(30).required(),
    kode_kategori: Joi.string().min(1).max(60).required(),
    kode_jenis: Joi.string().min(1).max(60).required(),
    gross: Joi.number().required(),
    netto: Joi.number().required(),
    no_ref: Joi.string().min(1).max(60).required(),
    no_ext: Joi.string().min(1).max(60).required(),
    keterangan: Joi.string().min(1).max(60).required(),
    input_by: Joi.string().min(1).max(30).required(),
    input_date: Joi.date().required()
  });
  return schema.validate(data);
}

exports.itmIn = itmIn;
exports.itmOut = itmOut;