#!/usr/bin/env node

// require libraries that we depend on 
const
express = require('express'),
sessions = require('connect-cookie-session'),
path = require('path'),
postprocess = require('postprocess'),
https = require('https'),
querystring = require('querystring'),
db = require('./db.js'),
url = require('url');

// the key with which session cookies are encrypted
const COOKIE_SECRET = process.env.SEKRET || 'you love, i love, we all love beer!';

// The IP Address to listen on.
const IP_ADDRESS = process.env.IP_ADDRESS || '127.0.0.1';

// The port to listen to.
const PORT = process.env.PORT || 0;

// localHostname is the address to which we bind.  It will be used
// as our external address ('audience' to which assertions will be set)
// if no 'Host' header is present on incoming login requests.
var localHostname = undefined;
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

function determineEnvironment(req) {
  if (req.headers['host'] === 'myfavoritebeer.org') return 'prod';
  else if (req.headers['host'] === 'beta.myfavoritebeer.org') return 'beta';
  else if (req.headers['host'] === 'dev.myfavoritebeer.org') return 'dev';
  else return 'local';
}

// some fancy logic to make it so we can run multiple different
// versions of myfavoritebeer on the same server, each which uses
// a different browserid server (dev/beta/prod):
function determineBrowserIDURL(req) {
  // first defer to the environment
  if (process.env.BROWSERID_URL) return process.env.BROWSERID_URL;

  return ({
    prod:   'https://browserid.org',
    beta:   'https://diresworb.org',
    dev:    'https://dev.diresworb.org',
    local:  'https://dev.diresworb.org'
  })[determineEnvironment(req)];
}

function determineBrowserIDHost(req) {
  return determineBrowserIDURL(req).replace(/http(s?):\/\//, '');
}

// a substitution middleware allows us to easily point at different browserid servers
app.use(postprocess.middleware(function(req, body) {
  var browseridURL = determineBrowserIDURL(req);
  return body.toString().replace(new RegExp("https://browserid.org", 'g'), browseridURL);
}));


// and now for the wsapi api
app.get("/api/whoami", function (req, res) {
  if (req.session && typeof req.session.email === 'string') return res.json(req.session.email);
  return res.json(null);
});

app.post("/api/login", function (req, res) {
  // req.body.assertion contains an assertion we should
  // verify, we'll use the browserid verification console
  var vreq = https.request({
    host: determineBrowserIDHost(req),
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
            if (valid) {
              console.log("assertion verified successfully for email:", email);
            } else {
              console.log("failed to verify assertion:", verifierResp.reason);
            }                
            res.json(email);
          } catch(e) {
            console.log("non-JSON response from verifier");
            // bogus response from verifier!  return null
            res.json(null);
          }
        });
  });
  vreq.setHeader('Content-Type', 'application/x-www-form-urlencoded');
  // the *audience* depends on how the client reaches us.  We'll just
  // use the hostname out of the request
  var audience = req.headers['host'] ? req.headers['host'] : localHostname;   
  var data = querystring.stringify({
    assertion: req.body.assertion,
    audience: audience
  });
  vreq.setHeader('Content-Length', data.length);
  vreq.write(data);
  vreq.end();
  console.log("verifying assertion!");
});

app.post("/api/logout", function (req, res) {
  req.session.email = null;
  res.json(true);
});

app.get("/api/get", function (req, res) {
  var email;
  if (req.session && typeof req.session.email === 'string') email = req.session.email;

  if (!email) {
    resp.writeHead(400, {"Content-Type": "text/plain"});
    resp.write("Bad Request: you must be authenticated to get your beer");
    resp.end();
    return;
  }

  db.get(determineEnvironment(req), email, function(err, beer) {
    if (err) {
      console.log("error getting beer for", email); 
      res.writeHead(500);
      res.end();
    } else {
      res.json(beer);
    }
  });
});

app.post("/api/set", function (req, res) {
  var email = req.session.email;

  if (!email) {
    resp.writeHead(400, {"Content-Type": "text/plain"});
    resp.write("Bad Request: you must be authenticated to get your beer");
    resp.end();
    return;
  }

  var beer = req.body.beer;

  if (!beer) {
    resp.writeHead(400, {"Content-Type": "text/plain"});
    resp.write("Bad Request: a 'beer' parameter is required to set your favorite beer");
    resp.end();
    return;
  }

  db.set(determineEnvironment(req), email, beer, function(err) {
    if (err) {
      console.log("setting beer for", email, "to", beer); 
      res.writeHead(500);
      res.end();
    } else {
      res.json(true);
    }
  });
});

// serve static resources
app.use(express.static(path.join(path.dirname(__dirname), "static")));

// connect up the database!
db.connect(function(err) {
  if (err) {
    console.log("failed to connect to db:", err);
    process.exit(1);
  }

  // start listening for connections
  app.listen(PORT, IP_ADDRESS, function () {
    var address = app.address();
    localHostname = address.address + ':' + address.port
    console.log("listening on " + localHostname);
  });
});
