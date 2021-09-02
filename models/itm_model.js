exports.get_table_name = function (data){
  switch(String(data).toUpperCase()) {
    case "BAYAR":
      return [200, {
        "saldo": "tt_stock_bayar_saldo",
        "card": "tt_stock_bayar_card"
      }];
    case "BARANG":
      return [200, {
        "saldo": "tt_saldo_stock_pusat",
        "card": "tt_stock_card"
      }]
    default:
      return [401, "Invalid fild type model !"];
  }
}