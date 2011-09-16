#!/usr/bin/env node

// require libraries that we depend on 
const
express = require('express'),
sessions = require('connect-cookie-session'),
path = require('path'),
postprocess = require('postprocess'),
https = require('https'),
querystring = require('querystring');

// the key with which session cookies are encrypted
const COOKIE_SECRET = process.env.SEKRET || 'you love, i love, we all love beer!';

// BrowserID
const BROWSERID_URL = process.env.BROWSERID_URL ? process.env.BROWSERID_URL: 'https://browserid.org';

// The verifier
const VERIFIER_HOST = BROWSERID_URL.replace(/http(s?):\/\//, '');

// The IP Address to listen on.
const IP_ADDRESS = process.env.IP_ADDRESS || '127.0.0.1';

// The port to listen to.
const PORT = process.env.PORT || 0;

// fullServerAddress is set once the server is started - contains hostname:port
var fullServerAddress;
var app = express.createServer();

// do some logging
app.use(express.logger({ format: 'dev' }));

// parse cookies
app.use(express.cookieParser());

// parse post bodies
app.use(express.bodyParser());

// session support using encrypted cookies
var cookieSession = sessions({
  secret: COOKIE_SECRET,
  key: 'myfavoritebeer_session',
  cookie: {
    path: '/api',
    httpOnly: true,
    // when you're logged in, you're logged in for an hour
    maxAge: (1 * 60 * 60 * 1000), 
    secure: false
  }
});
app.use(function (req, res, next) {
  if (/^\/api/.test(req.url)) return cookieSession(req, res, next);
  return next();
});

// a substitution middleware allows us to easily point at different browserid servers
if (process.env.BROWSERID_URL) {
  console.log("Using BrowserID at: " + BROWSERID_URL);
  app.use(postprocess.middleware(function(body) {
    return body.toString().replace(new RegExp("https://browserid.org", 'g'), BROWSERID_URL);
  }));
}

// and now for the wsapi api
app.get("/api/whoami", function (req, res) {
  if (req.session && typeof req.session.email === 'string') return res.json(req.session.email);
  return res.json(null);
});

app.post("/api/login", function (req, res) {
  // req.body.assertion contains an assertion we should
  // verify, we'll use the browserid verification console
  var vreq = https.request({
    host: VERIFIER_HOST,
    path: "/verify",
    method: 'POST'
  }, function(vres) {
    var body = "";
    vres.on('data', function(chunk) { body+=chunk; } )
        .on('end', function() {
          try {
            var verifierResp = JSON.parse(body);
            var valid = verifierResp && verifierResp.status === "okay";
            var email = valid ? verifierResp.email : null;

            req.session.email = email;
            
            res.json(email);
          } catch(e) {
            // bogus response from verifier!  return null
            res.json(null);
          }
        });
  });
  vreq.setHeader('Content-Type', 'application/x-www-form-urlencoded');
  var data = querystring.stringify({
    assertion: req.body.assertion,
    audience: fullServerAddress
  });
  vreq.setHeader('Content-Length', data.length);
  vreq.write(data);
  vreq.end();
});

app.post("/api/logout", function (req, res) {
  req.session.email = null;
  res.json(true);
});

app.get("/api/get", function (req, res) {
  console.log("you want to get your favorite beer, eh?");
  res.json(false);
});

app.get("/api/set", function (req, res) {
  console.log("you want to set your favorite beer, eh?");
  res.json(false);
});

// serve static resources
app.use(express.static(path.join(path.dirname(__dirname), "static")));

app.listen(PORT, IP_ADDRESS, function () {
  var address = app.address();
  fullServerAddress = address.address + ':' + address.port;
  console.log("listening on " + fullServerAddress);
});
