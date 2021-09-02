const express = require(`express`);
const nodemailer = require('nodemailer');
const router = express.Router();
const { SelectQuery, ExecuteQuery } = require('../middleware/connections')
const { Auth,generateToken } = require('../middleware/auth');
const Joi = require('@hapi/joi');
const randomstring = require("randomstring");

// Register User
router.post('/register', Auth, async (req, res) => {
  const body = req.body;
  const { error } = validateAddUser(body);
  if (error) return res.status(400).send(error.details[0].message);

  var data = body.password;
  var crypto = require('crypto');
  var passgen = crypto.createHash('md5').update(data).digest("hex");
  

  let sqlQuery = `SELECT * FROM m_user WHERE email='${body.email}' OR username='${body.username}'`;
  let resultSelect = await SelectQuery(sqlQuery)
    .then(result => { return [200, result] }).catch(err => { return [500, err] });
  if (resultSelect[0] !== 200) return res.status(resultSelect[0]).send("Data Tidak Ada");
  if (resultSelect[1].length > 0) {
    res.status(200).send("User Atau Password Sudah Terdaftar");
    return;
  }

  

  sqlQuery = `INSERT INTO m_user (email,username,password,status) VALUES ('${body.email}','${body.username}','${passgen}','OPEN')`;

  let resultInsert = await ExecuteQuery(sqlQuery)
    .then(result => { return [200, result[0]] }).catch(err => { return [500, err] });
  if (resultInsert[0] === 500) return res.status(500).send("Internal Server Error !");
  return res.send('Register User Success.');
})

function validateAddUser(data) {
  const schema = Joi.object({
    email: Joi.string().min(1).max(30).required(),
    username: Joi.string().min(1).max(50).required(),
    password: Joi.string().min(1).max(255).required()
  });
  return schema.validate(data);
}
// Register User

// LOGIN USER
router.post('/login', Auth, async (req, res) => {
  const { error } = validateLoginUser(req.body);
  if (error) return res.status(400).send(error.details[0].message);
  
  
  var data = req.body.password;
  var crypto = require('crypto');
  var passgen = crypto.createHash('md5').update(data).digest("hex");

  let sqlQuery = `SELECT username FROM m_user WHERE username = '${req.body.username}' AND password = '${passgen}' AND status='OPEN'`;
  let resultSelect = await SelectQuery(sqlQuery)
    .then(result => { return [200, result] }).catch(err => { return [500, err] });
  if (resultSelect[1].length <= 0) {
    res.status(500).send("Login Gagal");
    return;
  } else {

    var token = generateToken(req.body.user);
    return res.send( { username : req.body.username,token : token } );
  }
})

function validateLoginUser(data) {
  const schema = Joi.object({
    username: Joi.string().min(1).max(50).required(),
    password: Joi.string().min(1).max(255).required()
  });
  return schema.validate(data);
}
//LOGIN USER

// Forgot Password
router.post('/forgot', Auth, async (req, res) => {
  const body = req.body;
  const { error } = validateForgotUser(body);
  if (error) return res.status(400).send(error.details[0].message);
  let codemail;
  codemail = randomstring.generate({
    length: 12,
    charset: 'alphabetic'
  });
  codemail = codemail.toLocaleLowerCase();

  let sqlQuery = `SELECT * FROM m_user WHERE email='${body.email}' AND username='${body.username}'`;
  let resultSelect = await SelectQuery(sqlQuery)
    .then(result => { return [200, result] }).catch(err => { return [500, err] });
  if (resultSelect[0] !== 200) return res.status(resultSelect[0]).send("Data Tidak Ada");
  if (resultSelect[1].length <= 0) {
    res.status(200).send("Data User Tidak Ada");
    return;
  }

  sqlQuery = `UPDATE m_user SET generate='${codemail}',status='CLOS' WHERE email='${body.email}' AND username='${body.username}'`;

  let resultInsert = await ExecuteQuery(sqlQuery)
    .then(result => { return [200, result[0]] }).catch(err => { return [500, err] });
  if (resultInsert[0] === 500) return res.status(500).send("Internal Server Error !");
  var transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      //User and Password Email
      user: '',
      pass: ''
    }
  });

  var mailOptions = {
    //Sender Email
    from: '',
    to: body.email,
    subject: 'Forgot Password',
    html: 'Hi ' + body.username + ' Here Your Code Activation <h1>' + codemail + '</h1>'
  };
  transporter.sendMail(mailOptions, (err, info) => {
    if (err) throw err;
  });
  return res.send('Please Check Your Email For Activation Code');
})

function validateForgotUser(data) {
  const schema = Joi.object({
    email: Joi.string().min(1).max(30).required(),
    username: Joi.string().min(1).max(50).required()
  });
  return schema.validate(data);
}
// Forgot Password



// Validasi Forgot Password
router.post('/validasi', Auth, async (req, res) => {
  const body = req.body;
  const { error } = validateForgotPass(body);
  if (error) return res.status(400).send(error.details[0].message);
  let codemail;
  codemail = randomstring.generate({
    length: 12,
    charset: 'alphabetic'
  });
  codemail = codemail.toLocaleLowerCase();

  var data = body.password;
  var crypto = require('crypto');
  var passgen = crypto.createHash('md5').update(data).digest("hex");

  let sqlQuery = `SELECT * FROM m_user WHERE username='${body.username}' AND generate='${body.code}' AND status='CLOS'`;
  let resultSelect = await SelectQuery(sqlQuery)
    .then(result => { return [200, result] }).catch(err => { return [500, err] });
  if (resultSelect[0] !== 200) return res.status(resultSelect[0]).send("Data Tidak Ada");
  if (resultSelect[1].length <= 0) {
    res.status(500).send("Mohon Maaf Data Tidak Cocok");
    return;
  }

  sqlQuery = `UPDATE m_user SET generate='',status='OPEN',password='${passgen}' WHERE username='${body.username}' AND generate='${body.code}'`;

  let resultInsert = await ExecuteQuery(sqlQuery)
    .then(result => { return [200, result[0]] }).catch(err => { return [500, err] });
  if (resultInsert[0] === 500) return res.status(500).send("Internal Server Error !");
  return res.send('Validate Forgot Password success.');
})

function validateForgotPass(data) {
  const schema = Joi.object({
    username: Joi.string().min(1).max(50).required(),
    password: Joi.string().min(1).max(50).required(),
    code: Joi.string().min(1).max(50).required()
  });
  return schema.validate(data);
}
// Forgot Password

module.exports = router;