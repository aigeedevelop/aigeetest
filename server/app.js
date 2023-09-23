'use strict';

const http_server = require('http');
const express = require('express');
const bodyParser = require("body-parser");
const fs = require('fs');
const https = require('https');

const db = require('./utils/db');
const configs = require("./configs");
const http = require('./utils/http');

const swaggerUI = require('swagger-ui-express');
const swaggerDocument = require('./swagger/openapi.json');

const config = configs.app_server();
db.init(configs.mysql());

const scheduler = require('./server/scheduler');
const authMiddleware = require('./auth/auth');
const fcm = require('./utils/fcm');
fcm.initFirebase();
////////////////////////////////////////////////

const app = express();
// app.use(bodyParser.urlencoded({ extended: false }))

app.use(function(req, res, next) {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept, x-access-token, x-access-id");
  next();
});

app.locals.pretty = true;
// app.use(bodyParser.json())
app.set('port', process.env.PORT || config.PORT);
app.use(express.static(__dirname + '/uploads'));

// swaggerUI
app.use('/api-docs', swaggerUI.serve, swaggerUI.setup(swaggerDocument));
// router ///////////////////////////
// auth route
app.use('/auth', authMiddleware);
app.use('/auth', require('./auth'));

const routes = require('./server/http_service');
app.use('/', routes);

// http
// http_server.createServer(app).listen(app.get('port'), function(){
// 	console.log('App server listening on port ' + app.get('port'));
// });

// https
var options = {
  key:  fs.readFileSync('/etc/letsencrypt/live/aigee.ai/privkey.pem', 'utf8'),
  cert: fs.readFileSync('/etc/letsencrypt/live/aigee.ai/cert.pem', 'utf8'),
  ca:   fs.readFileSync('/etc/letsencrypt/live/aigee.ai/chain.pem', 'utf8')
};
https.createServer(options, app).listen(app.get('port'), function(){
  console.log('App server listening on port ' + app.get('port'));
});

//////// nice auth
app.set('view engine', 'ejs');

app.use(express.static('pages'));
app.use(bodyParser.json({limit: '10gb'}));
app.use(bodyParser.urlencoded({limit: '10gb',extended: true}));
///////////////////////////////////////////////
