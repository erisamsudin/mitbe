const cf = require('config');
const { SelectQuery,ExecuteQuery } = require('./connections');
const moment = require('moment');
const jwt = require('jsonwebtoken');

async function Auth(req, res, next) {
  const token = req.header('x-auth-token');
  if (!token) return res.status(401).send('Access denied. No token provided.');

  try {
    
    next();
  }
  catch (ex) {
    res.status(400).send('Invalid token.');
  }
}

function nsiAuth(req, res, next) {
  const token = req.header('x-auth-token');
  if (!token) return res.status(401).send('Access denied. No token provided.');

  req.user = { "kode_toko": token.slice(0, 3) };
  if (token.slice(3, Number(token.length)) !== cf.get(`nsi_key`)) return res.status(401).send(`Access denied.`);

  next();
}

function generateToken(userData) {
  const token = jwt.sign({ username: userData}, cf.get('jwt_key'));
  return token;
}

exports.nsiAuth = nsiAuth;
exports.Auth = Auth;
exports.generateToken = generateToken;