# grosir-api

## Table of content

- [Install](#install)
- [Setup](#setup)
- [End point](#end-point)
  - [End point CSTDC](#end-point-cstdc)
  - [End point CSTVLD](#end-point-cstvld)

## Install

This is a [Node.js](https://nodejs.org/en/) module available through the
[npm registry](https://www.npmjs.com/).

Before installing, [download and install Node.js](https://nodejs.org/en/download/).
Node.js 10 or higher is required.

Installation is done using the
[`npm install` command](https://docs.npmjs.com/getting-started/installing-npm-packages-locally):



## Setup

This is for setup variable environment on your local machine.

-Ubuntu

```sh
export NGS_HOST=localhost
export NGS_DB=db_grosir_config
export NGS_USER=root
export NGS_PASSWORD=berasputih
export NGS_NSI_KEY=B803C4B7286D0543EFF4A50D4C498CFE071CA5D0DB36C31B0821EEEDBC7BFD14C4A196D1FB0F
export NGS_ENC_KEY=L4ng1tB1ru974376
export NGS_JWT_KEY=betterlifeisgoodlife
```

-Windows

```sh
set NGS_HOST=localhost
set NGS_DB=db_grosir_config
set NGS_USER=root
set NGS_PASSWORD=berasputih
set NGS_NSI_KEY=B803C4B7286D0543EFF4A50D4C498CFE071CA5D0DB36C31B0821EEEDBC7BFD14C4A196D1FB0F
set NGS_ENC_KEY=L4ng1tB1ru974376
set NGS_JWT_KEY=betterlifeisgoodlife
```

## End point

This end point for access rest api.

### End point CSTDC

CSTDC is a end point for customer document.

* Get with filter range date : 
  ```js
  Methode: GET
  URL: http://{host}:3334/api/cstdc
  Header: 
    Content-Type = application/json
    x-auth-token = {kode_toko}B803C4B7286D0543EFF4A50D4C498CFE071CA5D0DB36C31B0821EEEDBC7BFD14C4A196D1FB0F
    'in this case kode_toko is "NRG"'
  Body:
    {
      "adm_tipe": "PJL",
      "tgl_1": "2020-06-01",
      "tgl_2": "2020-06-30",
      "no_bon": "FJ200610-001"
    }
  ```
* Get with filter no_bon :
  ```js
  Methode: GET
  URL: http://{host}:3334/api/cstdc/1
  Header: 
    Content-Type = application/json
    x-auth-token = {kode_toko}B803C4B7286D0543EFF4A50D4C498CFE071CA5D0DB36C31B0821EEEDBC7BFD14C4A196D1FB0F
    'in this case kode_toko is "NRG"'
  Body:
    {
      "adm_tipe": "PJL",
      "tgl_1": "2020-06-01",
      "tgl_2": "2020-06-30",
      "no_bon": "FJ200610-001"
    }
  ```
* Get with filter status_valid = open :
  ```js
  Methode: GET
  URL: http://{host}:3334/api/cstdc/open
  Header: 
    Content-Type = application/json
    x-auth-token = {kode_toko}B803C4B7286D0543EFF4A50D4C498CFE071CA5D0DB36C31B0821EEEDBC7BFD14C4A196D1FB0F
    'in this case kode_toko is "NRG"'
  Body:
    {
      "adm_tipe": "PJL",
      "tgl_1": "2020-06-01",
      "tgl_2": "2020-06-30",
      "no_bon": "FJ200610-001"
    }
  ```
* Post data cstdc :
  ```js
  Methode: POST
  URL: http://{host}:3334/api/cstdc
  Header: 
    Content-Type = application/json
    x-auth-token = {kode_toko}B803C4B7286D0543EFF4A50D4C498CFE071CA5D0DB36C31B0821EEEDBC7BFD14C4A196D1FB0F
    'in this case kode_toko is "NRG"'
  Body:
    {
      "adm_tipe": "PJL",
      "head": [{ "field_head" }],
      "detail": [{ "field_detail" }],
      "barcode": [
        {
          "no_barcode": "-"
        }],
      "timbang": [
        {
          "no_timbang": "-"
        }]
    }
  ```
* Post data pembayaran cstdc :
  ```js
  Methode: POST
  URL: http://{host}:3334/api/cstdc/byr
  Header: 
    Content-Type = application/json
    x-auth-token = {kode_toko}B803C4B7286D0543EFF4A50D4C498CFE071CA5D0DB36C31B0821EEEDBC7BFD14C4A196D1FB0F
    'in this case kode_toko is "NRG"'
  Body:
    {
      "adm_tipe": "PJL",
      "head": [{ "field_head" }],
      "detail": [{ "field_detail" }],
      "titip_head": [{ "field_titip_head" }],
      "titip_detail": [{ "field_titip_detail" }]
    }
  ```
* Delete data cstdc :
  ```js
    Methode: DELETE
    URL: http://{host}:3334/api/cstdc/1
    Header: 
      Content-Type = application/json
      x-auth-token = {kode_toko}B803C4B7286D0543EFF4A50D4C498CFE071CA5D0DB36C31B0821EEEDBC7BFD14C4A196D1FB0F
      'in this case kode_toko is "NRG"'
    Body:
      {
        "adm_tipe": "PJL",
        "tgl_1": "2020-06-01",
        "tgl_2": "2020-06-30",
        "no_bon": "FJ200610-001"
      }
  ```

### End point CSTVLD

CSTVLD is a end point for customer validation

* Customer validation Penjualan
```js
    Methode: POST
    URL: http://{host}:3334/api/cstvld/pjl
    Header: 
      Content-Type = application/json
      x-auth-token = {kode_toko}B803C4B7286D0543EFF4A50D4C498CFE071CA5D0DB36C31B0821EEEDBC7BFD14C4A196D1FB0F
      'in this case kode_toko is "NRG"'
    Body:
      {
        "adm_tipe": "PJL",
        "data": [{
          "no_faktur": no_penjualan,
          "no_bon": no_bon,
          "valid_by": valid_user
        }]
      }
  ```
* Customer validation Retur Penjualan
```js
  Methode: POST
  URL: http://{host}:3334/api/cstvld/rtr
  Header: 
    Content-Type = application/json
    x-auth-token = {kode_toko}B803C4B7286D0543EFF4A50D4C498CFE071CA5D0DB36C31B0821EEEDBC7BFD14C4A196D1FB0F
    'in this case kode_toko is "NRG"'
  Body:
    {
      "adm_tipe": "RTR",
      "data": [{
        "no_faktur": no_retur_customer,
        "no_bon": no_bon,
        "valid_by": valid_user
      }]
    }
```
* Customer validation Bayar
```js
    Methode: POST
    URL: http://{host}:3334/api/cstvld/byr
    Header: 
      Content-Type = application/json
      x-auth-token = {kode_toko}B803C4B7286D0543EFF4A50D4C498CFE071CA5D0DB36C31B0821EEEDBC7BFD14C4A196D1FB0F
      'in this case kode_toko is "NRG"'
    Body:
      {
        "adm_tipe": "BYR",
        "data": [{
          "no_faktur": no_pembayaran_customer,
          "no_bon": no_bon,
          "valid_by": valid_user
        }]
      }
  ```