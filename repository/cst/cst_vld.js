const Joi = require('@hapi/joi');
const {get_table_name} = require('../../models/trx_model')
const conn = require('../../middleware/connections');
const { object } = require('@hapi/joi');
const { DateNow } = require('../../middleware/datetime');
const moment = require('moment-timezone');

const { itmIn, itmOut } = require('../object-class/itm');
const { ptg_wr_new, ptgIn, ptgOut} = require('../object-class/ptg');
const { ttpIn, ttpOut } = require('../object-class/ttp');
const { mnyIn} = require('../object-class/mny');
const { trfIn } = require('../object-class/trf');
const { groIn } = require('../object-class/gro');


async function ProsesValidPenjualan(strIdCluster, dataBody){
  const {error} = validateValidJual(dataBody);
  if(error) return [400, error.details[0].message];

  if(dataBody.data.length === 0) return [400, `data must be an array object !`]

  let sqlQuery;
  let resultSelect;

  for (let x = 0; x < dataBody.data.length; x++){
    sqlQuery = `SELECT no_penjualan FROM tt_penjualan_head USE INDEX(PRIMARY)
      WHERE no_penjualan = '${dataBody.data[x].no_faktur}' LIMIT 1`;
    resultSelect = await conn.SelectQuery(strIdCluster, sqlQuery)
      .then(result => { return [200, result[0]] }).catch(err => { return [500, err]});
    if (resultSelect[0] === 500) return [500, resultSelect[1]];

    if (Object.keys(resultSelect[1]).length === 0) return [400, `Data transaksi : ${dataBody.data[x].no_faktur} tidak di temukan !`];
  }

  for (let x = 0; x < dataBody.data.length; x++){
    sqlQuery = `SELECT * FROM tt_penjualan_head USE INDEX(PRIMARY)
      WHERE no_penjualan = '${dataBody.data[x].no_faktur}' LIMIT 1`;
    resultSelect = await conn.SelectQuery(strIdCluster, sqlQuery)
      .then(result => { return [200, result[0]] }).catch(err => { return [500, err]});
    if (resultSelect[0] === 500) return [500, resultSelect[1]];

    if (Object.keys(resultSelect[1]).length === 0) return [400, `Data transaksi : ${dataBody.data[x].no_faktur} tidak di temukan !`];

    let objectData = {
      "no_penjualan": resultSelect[1][0].no_penjualan,
      "no_bon": resultSelect[1][0].no_bon,
      "tanggal": moment(resultSelect[1][0].tanggal).tz("Asia/Jakarta").format('YYYY-MM-DD'),
      "kode_lokasi": resultSelect[1][0].kode_lokasi,
      "kode_customer": resultSelect[1][0].kode_customer,
      "keterangan": "PENJUALAN",
      "in_netto": resultSelect[1][0].total_rev_disc_global_ext,
      "in_ongkos_rp": resultSelect[1][0].total_ongkos_rp,
      "input_by": resultSelect[1][0].input_by,
      "input_date": moment(resultSelect[1][0].input_date).tz("Asia/Jakarta").format('YYYY-MM-DD HH:mm:ss')
    };
    let resultProsesInPtg = await ptg_wr_new(strIdCluster, objectData);
    if (resultProsesInPtg[0] !== 200) return [resultProsesInPtg[0], resultProsesInPtg[1]];

    // Proses stock barang
    sqlQuery = `SELECT a.no_bon, a.tanggal, a.kode_lokasi, b.kode_kategori, b.kode_jenis, 
      b.kadar_cetak, b.kadar_modal, b.kadar_jual, b.bruto, b.revaluasi, a.input_by, a.input_date
    FROM tt_penjualan_head a INNER JOIN tt_penjualan_detail b ON b.no_penjualan=a.no_penjualan
    WHERE a.no_penjualan = '${dataBody.data[x].no_faktur}'`;
    resultSelect = await conn.SelectQuery(strIdCluster, sqlQuery)
      .then(result => { return [200, result[0]] }).catch(err => { return [500, err]});
    if (resultSelect[0] === 500) return [500, resultSelect[1]];

    for(let y = 0; y < Object.keys(resultSelect).length; y++){
      objectData = {
        "jenis_item": "BARANG",
        "jenis_field": "jual",
        "tanggal": moment(resultSelect[1][0].tanggal).tz("Asia/Jakarta").format('YYYY-MM-DD'),
        "kode_lokasi": resultSelect[1][y].kode_lokasi,
        "kode_kategori": resultSelect[1][y].kode_kategori,
        "kode_jenis": resultSelect[1][y].kode_jenis,
        "gross": resultSelect[1][y].bruto,
        "netto": resultSelect[1][y].revaluasi,
        "no_ref": dataBody.data[x].no_faktur,
        "no_ext": resultSelect[1][y].no_bon,
        "keterangan": "PENJUALAN",
        "input_by": resultSelect[1][y].input_by,
        "input_date": moment(resultSelect[1][0].input_date).tz("Asia/Jakarta").format('YYYY-MM-DD HH:mm:ss')
      }
      let resItmOut = await itmOut(strIdCluster, objectData);
      if (resItmOut[0] !== 200) return resItmOut;
    }

    sqlQuery = `UPDATE tt_penjualan_head SET 
      status_valid='VALID', 
      valid_by='${dataBody.data[x].valid_by}', 
      valid_date='${DateNow()}'
    WHERE no_penjualan = '${dataBody.data[x].no_faktur}'`;
    let resultUpdate = await conn.UpdateQuery(strIdCluster, sqlQuery)
      .then(result => { return [200, result[0]] }).catch(err => { return [500, err]});
    if (resultUpdate[0] === 500) return [500, resultUpdate[1]];
  }
  
  return [200, {
    "adm_tipe": dataBody.adm_tipe,
    "data": dataBody.data
  }];
}

async function ProsesValidReturJual(strIdCluster, dataBody) {
  const {error} = validateValidJual(dataBody);
  if(error) return [400, error.details[0].message];

  let sqlQuery;
  let resSelect;
  for (let x = 0; x < dataBody.data.length; x++){
    sqlQuery = `SELECT no_retur_customer FROM tt_retur_customer_head
      WHERE no_retur_customer = '${dataBody.data[x].no_faktur}' LIMIT 1`;
    resSelect = await conn.SelectQuery(strIdCluster, sqlQuery)
      .then(result => { return [200, result[0]] }).catch(err => { return [500, err]});
    if (resSelect[0] === 500) return [500, resSelect[1]];

    if (Object.keys(resSelect[1]).length === 0) return [404, `Data retur customer : ${dataBody.data[x].no_faktur} tidak di temukan !`];
  }
  for (let x = 0; x < dataBody.data.length; x++) {
    let objectData;
    // Proses data barang
    sqlQuery = `SELECT a.tgl_retur_customer, a.kode_lokasi, a.kode_salesman, a.kode_customer, b.kode_kategori, b.kode_jenis
      b.bruto_awal, b.netto_awal, a.no_bon_retur, a.input_by, a.input_date, a.bruto_awal as bruto_total, a.netto_awal as netto_total 
    FROM tt_retur_customer_head a INNER JOIN tt_retur_customer_detail b ON b.no_retur_customer = a.no_retur_customer 
    WHERE no_retur_customer = '${dataBody.data[x].no_faktur}'`;
    resSelect = await conn.SelectQuery(strIdCluster, sqlQuery)
      .then(result => { return [200, result[0]] }).catch(err => { return [500, err]});
    if (resSelect[0] === 500) return [500, resSelect[1]];

    if (Object.keys(resSelect[1]).length === 0) return [404, `Data retur customer : ${dataBody.data[x].no_faktur} tidak di temukan !`];
    for (let y = 0; y < resSelect[1].length; y++) {
      objectData = {
        "jenis_item": "BARANG",
        "jenis_field": "jual",
        "tanggal": moment(resSelect[1][0].tgl_retur_customer).tz("Asia/Jakarta").format('YYYY-MM-DD'),
        "kode_lokasi": resSelect[1][y].kode_lokasi,
        "kode_kategori": resSelect[1][y].kode_kategori,
        "kode_jenis": resSelect[1][y].kode_jenis,
        "gross": resSelect[1][y].bruto_awal,
        "netto": resSelect[1][y].netto_awal,
        "no_ref": dataBody.data[x].no_faktur,
        "no_ext": resSelect[1][y].no_bon_retur,
        "keterangan": "RETUR CUSTOMER",
        "input_by": resSelect[1][y].input_by,
        "input_date": moment(resSelect[1][y].input_date).tz("Asia/Jakarta").format('YYYY-MM-DD HH:mm:ss')
      }
      let resInItem = await itmIn(strIdCluster, objectData);
      if (resInItem[0] !== 200) return resInItem;
    }
    objectData = {
      "no_faktur": dataBody.data[x].no_faktur,
      "tanggal": moment(resSelect[1][0].tgl_retur_customer).tz("Asia/Jakarta").format('YYYY-MM-DD'),
      "no_titip_customer": dataBody.data[x].no_faktur,
      "kode_lokasi": resSelect[1][y].kode_lokasi,
      "kode_salesman": resSelect[1][y].kode_salesman,
      "kode_customer": resSelect[1][y].kode_customer,
      "ambil_titip_rp": Number(0),
      "ambil_titip_gr": Number(resSelect[1][y].netto_total),
      "keterangan": `RETUR CUSTOMER`,
      "reff_valid": dataBody.data[x].no_faktur,
      "input_by": resSelect[1][y].input_by,
      "input_date": moment(resSelect[1][y].input_date).tz("Asia/Jakarta").format('YYYY-MM-DD HH:mm:ss')
    };
    let resProsTtp = await ttpIn(strIdCluster, objectData);
    if (resProsTtp[0] !== 200) return resProsTtp;
  }

  return [200, {
    "adm_tipe": dataBody.adm_tipe,
    "data": dataBody.data
  }];
}

async function ProsesValidCloseJual(strIdCluster, dataBody){
  const {error} = validateValidJual(dataBody);
  if(error) return [400, error.details[0].message];

  if(dataBody.data.length === 0) return [400, `data must be an array object !`]

  let sqlQuery;
  let resultSelect;
  // Cek no faktur
  for(let x = 0; x < dataBody.data.length; x++){
    sqlQuery = `SELECT no_penjualan, status_closed FROM tt_penjualan_head_closed WHERE no_penjualan = '${dataBody.data[x].no_faktur}' LIMIT 1`
    resultSelect = await conn.SelectQuery(strIdCluster, sqlQuery)
      .then(result => { return [200, result[0]] }).catch(err => { return [500, err]});
    if(resultSelect[0] === 500) return [resultSelect[0], resultSelect[1]];

    if (Object.keys(resultSelect[1]).length === 0) return [404, `No faktur : ${dataBody.data[x].no_faktur} tidak di temukan !`];

    if (resultSelect[1][0].status_closed === 'CLOSE') return [400, `Status closed no faktur : ${dataBody.data[x].no_faktur} sudah close.`];
  }

  // Proses closing
  let resultUpdate;
  for(let x = 0; x < dataBody.data.length; x++){
    // Update piutang out
    sqlQuery = `SELECT no_penjualan, total_rev_disc_global_ext, total_ongkos_rp
      FROM tt_penjualan_head_closed WHERE no_penjualan = '${dataBody.data[x].no_faktur}' LIMIT 1`
    resultSelect = await conn.SelectQuery(strIdCluster, sqlQuery)
      .then(result => { return [200, result[0]] }).catch(err => { return [500, err]});
    if(resultSelect[0] === 500) return [resultSelect[0], resultSelect[1]];

    if(Object.keys(resultSelect[1]).length === 0) return [404, `Data penjualan close : ${dataBody.data[x].no_faktur} tidak di temukan !`];
    
    let objectData = {
      "no_penjualan": resultSelect[1][0].no_penjualan,
      "in_netto": resultSelect[1][0].total_rev_disc_global_ext,
      "in_ongkos_rp": resultSelect[1][0].total_ongkos_rp
    };

    let resPtgOut = await ptgOut(strIdCluster, objectData);
    if (resPtgOut[0] !== 200) return [resPtgOut[0], resPtgOut[1]];

    // Closing status_closed
    sqlQuery = `UPDATE tt_penjualan_head SET status_closed = 'CLOSE' WHERE no_penjualan = '${dataBody.data[x].no_faktur}' LIMIT 1`
    resultUpdate = await conn.UpdateQuery(strIdCluster, sqlQuery)
      .then(result => { return [200, result[0]] }).catch(err => { return [500, err]});
    if(resultUpdate[0] === 500) return [resultUpdate[0], resultUpdate[1]];

    sqlQuery = `UPDATE tt_penjualan_head_closed SET status_closed = 'CLOSE' WHERE no_penjualan = '${dataBody.data[x].no_faktur}' LIMIT 1`
    resultUpdate = await conn.UpdateQuery(strIdCluster, sqlQuery)
      .then(result => { return [200, result[0]] }).catch(err => { return [500, err]});
    if(resultUpdate[0] === 500) return [resultUpdate[0], resultUpdate[1]];
  }
}

async function ProsesValidBayarCst(strIdCluster, dataBody) {
  const {error} = validateValidJual(dataBody);
  if(error) return[400, error.details[0].message];

  if(dataBody.data.length === 0) return [400, `data must be an array object !`]

  let sqlQuery;
  let resultSelect;
  let objectData = {};
  // Cek no pembayaran di head
  for(let x = 0; x < dataBody.data.length; x++){
    sqlQuery = `SELECT no_bayar_customer FROM tt_piutang_bayar_head WHERE no_bayar_customer = '${dataBody.data[x].no_faktur}' LIMIT 1`;
    resultSelect = await conn.SelectQuery(strIdCluster, sqlQuery)
      .then(result => { return [200, result[0]] }).catch(err => { return [500, err]});
    if(resultSelect[0] === 500) return [resultSelect[0], resultSelect[1]];

    if(Object.keys(resultSelect[1]).length === 0) return [404, `Data pembayaran : ${dataBody.data[x].no_faktur} tidak di temukan !`];
  }

  // Proses validasi pembayaran
  for (let x = 0; x < dataBody.data.length; x++){
    // Proses Detail
    sqlQuery = `SELECT a.no_bon_bayar, a.tanggal, a.input_date, a.input_by, 
      a.kode_customer, a.kode_lokasi, a.kode_salesman, 
      b.no_bon_jual, b.kode_ciok, b.barang, b.netto_barang, 
      b.kode_rongsok, b.rongsok, b.netto_rongsok, b.cash_rp, b.netto_cash_rp,
      b.trf_rp, b.netto_trf_rp, b.no_rek_rp, b.no_rek_customer_rp, b.duedate_ku,
      b.giro_rp, b.netto_giro_rp, b.bank_giro, b.no_giro, b.no_rek_giro_rp, b.duedate_giro,
      b.netto_putus_rp, b.netto_putus_barang, b.netto_discount, b.netto_cn, 
      b.bon_cash_rp, b.bon_trf_rp, b.bon_norek_rp, b.bon_norek_cust, b.bon_duedate_ku,
      b.bon_giro_rp, b.bon_bank_giro, b.bon_no_giro, b.bon_no_rek_giro_rp, b.bon_putus_rp
    FROM tt_piutang_bayar_detail b INNER JOIN tt_piutang_bayar_head a ON a.no_bayar_customer=b.no_bayar_customer 
    WHERE a.no_bayar_customer = '${dataBody.data[x].no_faktur}'`;
    resultSelect = await conn.SelectQuery(strIdCluster, sqlQuery)
      .then(result => { return [200, result[0]] }).catch(err => { return [500, err]});
    if(resultSelect[0] === 500) return [resultSelect[0], resultSelect[1]];
    if(Object.keys(resultSelect[1]).length === 0) return [404, `Data pembayaran piutang : ${dataBody.data[x].no_faktur} tidak di temukan !`];
    
    let objectPtg = [];
    let objectBrgByr = [];
    let objectTrf = [];
    let objectGiro = [];
    let cekArray = [];
    for (let y = 0; y < resultSelect[1].length; y++) {
      // PTG
      let nettoBayar = Number(resultSelect[1][y].netto_cash_rp) + 
        Number(resultSelect[1][y].netto_trf_rp) + 
        Number(resultSelect[1][y].netto_giro_rp) + 
        Number(resultSelect[1][y].netto_putus_rp) + 
        Number(resultSelect[1][y].netto_putus_barang) + 
        Number(resultSelect[1][y].netto_discount) + 
        Number(resultSelect[1][y].netto_cn);
      let rpBayar = Number(resultSelect[1][y].bon_cash_rp) +
        Number(resultSelect[1][y].bon_trf_rp) +
        Number(resultSelect[1][y].bon_giro_rp) +
        Number(resultSelect[1][y].bon_putus_rp);

      cekArray = objectPtg.findIndex((element) => {
        return element.no_bon === resultSelect[1][y].no_bon_jual;
      });
      if (cekArray === -1) {
        objectPtg.push({
          "no_penjualan": resultSelect[1][y].no_bon_jual,
          "no_bon": resultSelect[1][y].no_bon_jual,
          "keterangan": "BAYAR PIUTANG CUSTOMER",
          "tanggal": moment(resultSelect[1][y].tanggal).tz("Asia/Jakarta").format('YYYY-MM-DD'),
          "kode_lokasi": resultSelect[1][y].kode_lokasi,
          "kode_customer": resultSelect[1][y].kode_customer,
          "in_netto": Number(nettoBayar),
          "in_ongkos_rp": Number(rpBayar),
          "input_by": resultSelect[1][y].input_by,
          "input_date": moment(resultSelect[1][y].input_date).tz("Asia/Jakarta").format('YYYY-MM-DD HH:mm:ss')
        });
      } else {
        objectPtg[cekArray].in_netto = Number(objectPtg[cekArray].in_netto) + Number(nettoBayar);
        objectPtg[cekArray].in_ongkos_rp = Number(objectPtg[cekArray].in_ongkos_rp) + Number(rpBayar);
      }

      // Brg BYR CK
      if (Number(resultSelect[1][y].netto_barang) !== 0) {
        cekArray = objectBrgByr.findIndex((element) => {
          return element.kode_jenis === resultSelect[1][y].kode_ciok;
        });

        if (cekArray === -1) {
          objectBrgByr.push({
            "jenis_item": "BAYAR",
            "jenis_field": "in",
            "tanggal": moment(resultSelect[1][y].tanggal).tz("Asia/Jakarta").format('YYYY-MM-DD'),
            "kode_lokasi": resultSelect[1][y].kode_lokasi,
            "kode_kategori": "CK",
            "kode_jenis": resultSelect[1][y].kode_rongsok,
            "gross": Number(resultSelect[1][y].rongsok),
            "netto": Number(resultSelect[1][y].netto_rongsok),
            "no_ref": dataBody.data[x].no_faktur,
            "no_ext": resultSelect[1][y].no_bon_bayar,
            "keterangan": "PEMBAYARAN CUSTOMER",
            "input_by": resultSelect[1][y].input_by,
            "input_date": moment(resultSelect[1][y].input_date).tz("Asia/Jakarta").format('YYYY-MM-DD HH:mm:ss')
          });
        } else {
          objectBrgByr[cekArray].gross = Number(objectBrgByr[cekArray].gross) + Number(resultSelect[1][y].barang);
          objectBrgByr[cekArray].netto = Number(objectBrgByr[cekArray].netto) + Number(resultSelect[1][y].netto_barang);
        }
      }

      // Brg BYR RSK
      if (Number(resultSelect[1][y].netto_rongsok) !== 0) {
        cekArray = objectBrgByr.findIndex((element) => {
          return element.kode_jenis === resultSelect[1][y].kode_rongsok;
        });
        if (cekArray === -1) {
          objectBrgByr.push({
            "jenis_item": "BAYAR",
            "jenis_field": "in",
            "tanggal": moment(resultSelect[1][y].tanggal).tz("Asia/Jakarta").format('YYYY-MM-DD'),
            "kode_lokasi": resultSelect[1][y].kode_lokasi,
            "kode_kategori": "RSK",
            "kode_jenis": resultSelect[1][y].kode_rongsok,
            "gross": Number(resultSelect[1][y].rongsok),
            "netto": Number(resultSelect[1][y].netto_rongsok),
            "no_ref": dataBody.data[x].no_faktur,
            "no_ext": resultSelect[1][y].no_bon_bayar,
            "keterangan": "PEMBAYARAN CUSTOMER",
            "input_by": resultSelect[1][y].input_by,
            "input_date": moment(resultSelect[1][y].input_date).tz("Asia/Jakarta").format('YYYY-MM-DD HH:mm:ss')
          });
        } else {
          objectBrgByr[cekArray].gross = Number(objectBrgByr[cekArray].gross) + Number(resultSelect[1][y].rongsok);
          objectBrgByr[cekArray].netto = Number(objectBrgByr[cekArray].netto) + Number(resultSelect[1][y].netto_rongsok);
        }
      }

      // Bayar Transfer
      if (Number(resultSelect[1][y].trf_rp) !== 0) {
        cekArray = objectTrf.findIndex((element) => {
          return element.rek_asal === resultSelect[1][y].rek_asal;
        });
        if (cekArray === -1) {
          objectTrf.push({
            "no_transaksi": dataBody.data[x].no_faktur,
            "type_trx": "D",
            "tgl_janji": moment(resultSelect[1][y].duedate_ku).tz("Asia/Jakarta").format('YYYY-MM-DD'),
            "kode_customer": resultSelect[1][y].kode_customer,
            "kode_salesman": resultSelect[1][y].kode_salesman,
            "no_penjualan": dataBody.data[x].no_faktur,
            "no_bon": resultSelect[1][y].no_bon_bayar,
            "rek_asal": resultSelect[1][y].no_rek_customer_rp,
            "rek_to": resultSelect[1][y].no_rek_rp,
            "transfer_rp": Number(resultSelect[1][y].trf_rp),
            "keterangan": "BAYAR PIUTANG CUSTOMER"
          });
        } else {
          objectTrf[cekArray].transfer_rp = Number(objectTrf[cekArray].transfer_rp) + Number(resultSelect[1][y].trf_rp);
        }
      }
      // Bayar Giro
      if (Number(resultSelectp[1][y].giro_rp) !== 0) {
        cekArray = objectGiro.findIndex((element) => {
          return element.no_giro === resultSelect[1][y].no_giro;
        });
        if (cekArray === -1) {
          objectGiro.push({
            "no_transaksi": dataBody.data[x].no_faktur,
            "type_trx": "D",
            "due_date": moment(resultSelect[1][y].duedate_giro).tz("Asia/Jakarta").format('YYYY-MM-DD'),
            "kode_customer": resultSelect[1][y].kode_customer,
            "kode_salesman": resultSelect[1][y].kode_salesman,
            "no_penjualan": dataBody.data[x].no_faktur,
            "no_bon": resultSelect[1][y].no_bon_bayar,
            "no_giro": resultSelect[1][y].no_giro,
            "nama_bank": resultSelect[1][y].bank_giro,
            "rek_to_giro": resultSelect[1][y].no_rek_giro_rp,
            "giro_rp": Number(resultSelect[1][y].giro_rp),
            "keterangan": "BAYAR PIUTANG CUSTOMER"
          })
        }
      }
    }

    // Proses Piutang Out
    for (let y = 0; y < objectPtg.length; y++) {
      let resPtgOut = await ptgOut(strIdCluster, objectPtg[y]);
      if (resPtgOut[0] !== 200) return [resPtgOut[0], resPtgOut[1]];
    }
    // Proses Barang Bayar IN
    for (let y = 0; y < objectBrgByr.length; y++) {
      let resItmByrIn = await itmIn(strIdCluster, objectBrgByr[y]);
      if (resItmByrIn[0] !== 200) return [resItmByrIn[0], resItmByrIn[1]];
    }
    // Proses Transfer IN
    for (let y = 0; y < objectTrf.length; y++) {
      let resTrfIn = await trfIn(strIdCluster, objectTrf[y])
      if (resTrfIn[0] !== 200) return resTrfIn;
    }
    // Proses Giro IN
    for (let y = 0; y < objectGiro.length; y++) {
      let resGroIn = await groIn(strIdCluster, objectGiro[y])
      if (resGroIn[0] !== 200) return resGroIn;
    }

    // Proses Head
    sqlQuery = `SELECT tanggal, total_bon_cash_rp, input_by, input_date 
      FROM tt_bayar_customer_head USE INDEX(PRIMARY) WHERE no_bayar_customer = '${dataBody.data[x].no_faktur}' LIMIT 1`
    resultSelect = await conn.SelectQuery(strIdCluster, sqlQuery)
      .then(result => { return [200, result[0]] }).catch(err => { return [500, err]});
    if(resultSelect[0] === 500) return [resultSelect[0], resultSelect[1]];
    if(Object.keys(resultSelect[1]).length === 0) return [404, `Data pembayaran customer : ${dataBody.data[x].no_faktur} tidak di temukan !`];

    for (let y = 0; y < resultSelect[1].length; y++) {
      if(Number(resultSelect[1][y].total_bon_cash_rp) !== 0) {
        objectData = {
          "tanggal": moment(resultSelect[1][y].tanggal).tz("Asia/Jakarta").format('YYYY-MM-DD'),
          "kategori": "BAYAR PIUTANG RUPIAH",
          "deskripsi": dataBody.data[x].no_faktur,
          "curr": "RUPIAH",
          "cash": Number(resultSelect[1][y].total_bon_cash_rp),
          "input_by": resultSelect[1][y].input_by,
          "input_date": moment(resultSelect[1][y].input_date).tz("Asia/Jakarta").format('YYYY-MM-DD HH:mm:ss')
        };
        let resMnyIn = await mnyIn(objectData);
        if (resMnyIn[0] !== 200) return [resMnyIn[0], resMnyIn[1]];
      }
    }

    // Proses Titipan
    sqlQuery = `SELECT a.input_by, a.input_date, a.kode_salesman, a.kode_customer, 
      a.jenis_trx, a.no_faktur, a.tanggal, b.no_titip_customer, a.jenis_faktur, 
      b.ambil_titip_rp, b.ambil_titip_gr
    FROM 
      tt_titip_customer_head a INNER JOIN tt_titip_customer_detail b ON b.no_faktur=a.no_faktur
    WHERE 
      a.no_ref = '${dataBody.data[x].no_faktur}'`
    resultSelect = await conn.SelectQuery(strIdCluster, sqlQuery)
      .then(result => { return [200, result[0]] }).catch(err => { return [500, err]});
    if(resultSelect[0] === 500) return [resultSelect[0], resultSelect[1]];
    if(Object.keys(resultSelect[1]).length !== 0) {
      for(let y = 0; y < resultSelect[1][y].length; y++){
        let resProsTtp;
        if(String(resultSelect[1][y].jenis_faktur).toUpperCase() === 'TAMBAH'){
          objectData = {
            "no_faktur": resultSelect[1][y].no_faktur,
            "tanggal": moment(resultSelect[1][y].tanggal).tz("Asia/Jakarta").format('YYYY-MM-DD'),
            "no_titip_customer": resultSelect[1][y].no_titip_customer,
            "kode_lokasi": resultSelect[1][y].kode_salesman,
            "kode_salesman": resultSelect[1][y].kode_salesman,
            "kode_customer": resultSelect[1][y].kode_customer,
            "ambil_titip_rp": Number(resultSelect[1][y].ambil_titip_rp),
            "ambil_titip_gr": Number(resultSelect[1][y].ambil_titip_gr),
            "keterangan": `LEBIH BAYAR, DARI BON : ${dataBody.data[x].no_faktur}`,
            "reff_valid": dataBody.data[x].no_faktur,
            "input_by": resultSelect[1][y].input_by,
            "input_date": moment(resultSelect[1][y].input_date).tz("Asia/Jakarta").format('YYYY-MM-DD HH:mm:ss')
          };
          resProsTtp = await ttpIn(strIdCluster, objectData);
        }else{
          objectData = {
            "no_faktur": resultSelect[1][y].no_faktur,
            "tanggal": moment(resultSelect[1][y].tanggal).tz("Asia/Jakarta").format('YYYY-MM-DD'),
            "no_titip_customer": resultSelect[1][y].no_titip_customer,
            "kode_lokasi": resultSelect[1][y].kode_salesman,
            "kode_salesman": resultSelect[1][y].kode_salesman,
            "kode_customer": resultSelect[1][y].kode_customer,
            "ambil_titip_rp": Number(resultSelect[1][y].ambil_titip_rp),
            "ambil_titip_gr": Number(resultSelect[1][y].ambil_titip_gr),
            "keterangan": `PUTUS TITIPAN U/BON BAYAR : ${dataBody.data[x].no_faktur}`,
            "reff_valid": dataBody.data[x].no_faktur,
            "input_by": resultSelect[1][y].input_by,
            "input_date": moment(resultSelect[1][y].input_date).tz("Asia/Jakarta").format('YYYY-MM-DD HH:mm:ss')
          };
          resProsTtp = await ttpOut(strIdCluster, objectData);
        }
        if (resProsTtp[0] !== 200) return [resProsTtp[0], resProsTtp[1]];
      }
    }
  }

  return [200, {
    "adm_tipe": dataBody.adm_tipe,
    "data": dataBody.data
  }];
}

function validateValidJual(validJual){
  const objectData = Joi.object().keys({
    no_faktur: Joi.string().min(1).max(40).required(),
    no_bon: Joi.string().min(1).max(40).required(),
    valid_by: Joi.string().min(1).max(40).required()
  });

  const schema = Joi.object({
    adm_tipe: Joi.string().min(1).max(40).required(),
    data: Joi.array().items(objectData).required(),
  });
  return schema.validate(validJual);
}

exports.ProsesValidPenjualan = ProsesValidPenjualan;
exports.ProsesValidReturJual = ProsesValidReturJual;
exports.ProsesValidCloseJual = ProsesValidCloseJual;
exports.ProsesValidBayarCst = ProsesValidBayarCst;