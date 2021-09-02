const Table_Schema = [
  {
// tt_penjualan_head
    "table_name" : "create id_transaksi tt_penjualan_head",
    "table_schema" : `ALTER TABLE tt_penjualan_head ADD id_transaksi VARCHAR(20)`
  },{
    "table_name" : "add index id_transaksi tt_penjualan_head",
    "table_schema" : `ALTER TABLE tt_penjualan_head ADD INDEX id_transaksi(id_transaksi)`
  },{
// tt_penjualan_detail
    "table_name" : "create id_transaksi tt_penjualan_detail",
    "table_schema" : `ALTER TABLE tt_penjualan_detail ADD id_transaksi VARCHAR(20)`
  },{
    "table_name" : "add index id_transaksi tt_penjualan_detail",
    "table_schema" : `ALTER TABLE tt_penjualan_detail ADD INDEX id_transaksi(id_transaksi)`
  },{
// tt_penjualan_head_brc
    "table_name" : "create id_transaksi tt_penjualan_head_brc",
    "table_schema" : `ALTER TABLE tt_penjualan_head_brc ADD id_transaksi VARCHAR(20)`
  },{
    "table_name" : "add index id_transaksi tt_penjualan_head_brc",
    "table_schema" : `ALTER TABLE tt_penjualan_head_brc ADD INDEX id_transaksi(id_transaksi)`
  },{
// tt_penjualan_head_tmb
    "table_name" : "create id_transaksi tt_penjualan_head_tmb",
    "table_schema" : `ALTER TABLE tt_penjualan_head_tmb ADD id_transaksi VARCHAR(20)`
  },{
    "table_name" : "add index id_transaksi tt_penjualan_head_tmb",
    "table_schema" : `ALTER TABLE tt_penjualan_head_tmb ADD INDEX id_transaksi(id_transaksi)`
  }
];

exports.Table_Schema = Table_Schema;