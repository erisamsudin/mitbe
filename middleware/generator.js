const moment = require('moment')
const conn = require('./connections');
const {DateNow} = require('./datetime');

let idCluster = [];

Number.prototype.pad = function(size) {
  let s = String(this);
  while (s.length < (size || 2)) {s = "0" + s;}
  return s;
}

async function GenNoRefCash(strIdCluster, tanggal) {
  let strNoCash = "";
  let sqlQuery = `SELECT no_reff FROM tt_cash_detail WHERE tanggal = '${moment(tanggal).format('YYYY-MM-DD')}' ORDER BY no_reff DESC`
  let ResultQuery = await conn.SelectQuery(strIdCluster, sqlQuery)
    .then(result => { return [200, result[0]] }).catch(err => { return [500, err]});
  if(ResultQuery[0] === 500) return ResultQuery;

  if (Object.keys(ResultQuery[1]).length === 0){
    strNoCash = "KM-" + moment(tanggal).format('YYMMDD') + "-0001";
  }else{
    strNoCash = "KM-" + moment(tanggal).format('YYMMDD') + "-" + Number(Number(String(ResultQuery[1][0].no_reff).slice(10,14)) + 1).pad(4);
  }

  for (i = 1; i <= 50; i++) {
    sqlQuery = `SELECT no_reff FROM tt_cash_detail WHERE no_reff = '${strNoCash}' LIMIT 1`
    ResultQuery = await conn.SelectQuery(strIdCluster, sqlQuery)
      .then(result => { return [200, result[0]] }).catch(err => { return [500, err]});
    if(ResultQuery[0] === 500) return ResultQuery;

    if (Object.keys(ResultQuery[1]).length === 0){
      break;
    }else{
      strNoCash = "KM-" + moment(tanggal).format('YYMMDD') + "-" + Number(Number(String(ResultQuery[1][0].no_reff).slice(10,14)) + 1).pad(4);
    }
  }

  return [200, strNoCash];
}

async function GenNoTitip(strIdCluster, tanggal) {
  let strNoTitip = "";
  
  let sqlQuery = `SELECT no_titip_customer FROM tt_saldo_titip_customer 
  WHERE tanggal = '${moment(tanggal).format('YYYY-MM-DD')}' ORDER BY no_titip_customer DESC LIMIT 1`;
  let resSelect = await conn.SelectQuery(strIdCluster, sqlQuery)
    .then(result => { return [200, result[0]] }).catch(err => { return [500, err]});
  if(resSelect[0] === 500) return resSelect;

  console.log(resSelect[1])
  if (Object.keys(resSelect[1]).length === 0){
    strNoTitip = "TPC-" + moment(tanggal).format('YYMMDD') + "-00001";
  }else{
    strNoTitip = "TPC-" + moment(tanggal).format('YYMMDD') + "-" + Number(Number(String(resSelect[1][0].no_titip_customer).slice(11,16)) + 1).pad(5);
  }

  for (i = 1; i <= 50; i++) {
    sqlQuery = `SELECT no_titip_customer FROM tt_saldo_titip_customer
    WHERE no_titip_customer = '${strNoTitip}' LIMIT 1`
    resSelect = await conn.SelectQuery(strIdCluster, sqlQuery)
      .then(result => { return [200, result[0]] }).catch(err => { return [500, err]});
    if(resSelect[0] === 500) return resSelect;

    if (Object.keys(resSelect[1]).length === 0){
      break;
    }else{
      strNoTitip = "TPC-" + moment(tanggal).format('YYMMDD') + "-" + Number(Number(String(resSelect[1][0].no_titip_customer).slice(11,16)) + 1).pad(5);
    }
  }

  return [200, strNoTitip];
}

function GenIdCluster(kodeToko, idProses){
  try{
    let strNoTrx = kodeToko + idProses + moment(DateNow()).format('YYMMDDHHmmss') + '001';

    for (let x = 1; x < 100; x++) {
      let cekIdCluster = idCluster.filter((idClus) => {
        return idClus === strNoTrx;
      });
      if(Object.keys(cekIdCluster).length === 0) break;
      strNoTrx = kodeToko + idProses + moment(DateNow()).format('YYMMDDHHmmss') + Number(x).pad(3);
    }

    idCluster.push(strNoTrx);
    return [200, strNoTrx];
  }catch(err){
    return [500, err.message];
  }
}

exports.pad = Number.prototype.pad;
exports.GenNoRefCash = GenNoRefCash;
exports.GenNoTitip = GenNoTitip;
exports.GenIdCluster = GenIdCluster;
exports.idCluster = idCluster;