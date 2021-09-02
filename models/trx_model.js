function get_table_name(kodeTrx, data){
  switch(String(kodeTrx).toUpperCase()) {
    case "CST":
      switch(String(data).toUpperCase()) {
        case "PJL":
          return [200, {
            "head": "tt_penjualan_head", 
            "detail": "tt_penjualan_detail",
            "head_deleted": "tt_penjualan_head_log", 
            "detail_deleted": "tt_penjualan_detail_log", 
            "barcode": "tt_penjualan_head_brc",
            "timbang": "tt_penjualan_head_tmb"
          }];
        case "RTR":
          return [200, {
            "head": "tt_retur_customer_head", 
            "detail": "tt_retur_customer_detail",
            "head_deleted": "tt_retur_customer_head_log", 
            "detail_deleted": "tt_retur_customer_detail_log", 
            "barcode": "tt_retur_customer_head_brc",
            "timbang": "tt_retur_customer_head_tmb"
          }]
        case "CLOSE":
          return [200, {
            "head": "tt_penjualan_detail_closed", 
            "detail": "tt_penjualan_head_closed",
            "head_deleted": "-", 
            "detail_deleted": "-", 
            "barcode": "tt_penjualan_head_brc",
            "timbang": "tt_penjualan_head_tmb"
          }]
        case "BYR":
          return [200, {
            "head": "tt_piutang_bayar_head", 
            "detail": "tt_piutang_bayar_detail",
            "head_deleted": "-", 
            "detail_deleted": "-", 
            "barcode": "-",
            "timbang": "-"
          }]
        default:
          return [401, "Invalid fild type model !"];
      }
    case "TTP":
      switch(String(data).toUpperCase()) {
        case "TTP":
          return [200, {
            "head": "tt_titip_customer_head", 
            "detail": "tt_titip_customer_detail",
            "head_deleted": "-", 
            "detail_deleted": "-", 
            "barcode": "-",
            "timbang": "-"
          }]
        default:
          return [401, "Invalid fild type model !"];
      }
    case "SPP":
      
    default:
      return [401, "Invalid kode transaksi model !"];
  }
}

exports.get_table_name = get_table_name;