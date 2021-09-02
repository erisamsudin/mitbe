const express = require('express');
const winston = require('winston');
const app = express();

require(`./startup/logging`)();
require(`./startup/routes`)(app);
require('./startup/db')();
require(`./startup/config`)();

const port = process.env.PORT || 3334;
app.listen(port,() => winston.info(`Listening on port ${port}...`));