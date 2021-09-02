const express = require(`express`);
const error = require(`../middleware/error`);

const user = require('../routes/user');


module.exports = function(app) {
  app.use(express.json({ limit: '30mb' }));
  app.use(express.urlencoded({ limit: '30mb', extended: true }))

  app.use(function(req, res, next) {
    res.header("Access-Control-Allow-Origin", "*");
    res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept, x-auth-token");
    next();
  });
  
  //ER
  app.use('/api/user', user);
  //ER
  app.use(error);
}