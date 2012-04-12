#!/usr/bin/env node

// require libraries that we depend on 
const
express = require('express'),
sessions = require('client-sessions'),
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

// create a webserver using the express framework
var app = express.createServer();

// a global flag indicating whether we have persistence or not.
var havePersistence;

// do some logging
app.use(express.logger({ format: 'dev' }));

// parse cookies
app.use(express.cookieParser());

// parse post bodies
app.use(express.bodyParser());

// session support using signed cookies, also no caching of api requests
app.use(function (req, res, next) {
  if (/^\/api/.test(req.url)) {
    res.setHeader('Cache-Control', 'no-cache, max-age=0');

    return sessions({
      secret: COOKIE_SECRET,
      key: 'myfavoritebeer_session',
      cookie: {
        path: '/api',
        httpOnly: true,
        // when you're logged in, you're logged in for an hour
        maxAge: (1 * 60 * 60 * 1000),
        secure: false
      }
    })(req, res, next);
  } else {
    return next();
  }
});

// The next three functions contain some fancy logic to make it so
// we can run multiple different versions of myfavoritebeer on the
// same server, each which uses a different browserid server
// (dev/beta/prod):
function determineEnvironment(req) {
  if (req.headers['host'] === 'myfavoritebeer.org' || req.headers['host'] === 'www.myfavoritebeer.org') return 'prod';
  else if (req.headers['host'] === 'beta.myfavoritebeer.org') return 'beta';
  else if (req.headers['host'] === 'dev.myfavoritebeer.org') return 'dev';
  else {
    var m = /^(.*)\.myfavoritebeer\.org$/.exec(req.headers['host']);
    if (m) return m[1];
    else return 'local';
  }
}

const staticEnvs = {
  prod:   'https://browserid.org',
  beta:   'https://diresworb.org',
  dev:    'https://dev.diresworb.org',
  local:  'https://dev.diresworb.org'
};

function determineBrowserIDURL(req) {
  // first defer to the environment
  if (process.env.BROWSERID_URL) return process.env.BROWSERID_URL;

  var e = determineEnvironment(req);
  if (staticEnvs[e]) return staticEnvs[e];
  else return 'https://' + e + '.hacksign.in';
}

function determineBrowserIDHost(req) {
  return determineBrowserIDURL(req).replace(/http(s?):\/\//, '');
}

// a substitution middleware allows us to easily point at different browserid servers
app.use(postprocess(function(req, body) {
  var browseridURL = determineBrowserIDURL(req);
  return body.toString().replace(new RegExp("https://browserid.org", 'g'), browseridURL);
}));


// /api/whoami is an API that returns the authentication status of the current session.
// it returns a JSON encoded string containing the currently authenticated user's email
// if someone is logged in, otherwise it returns null.
app.get("/api/whoami", function (req, res) {
  if (req.session && typeof req.session.email === 'string') return res.json(req.session.email);
  return res.json(null);
});


// /api/login is an API which authenticates the current session.  The client includes 
// an assertion in the post body (returned by browserid's navigator.id.getVerifiedEmail()).
// if the assertion is valid an (encrypted) cookie is set to start the user's session.
// returns a json encoded email if the session is successfully authenticated, otherwise
// null.
app.post("/api/login", function (req, res) {
  // To verify the assertion we initiate a POST request to the browserid verifier service.
  // If we didn't want to rely on this service, it's possible to implement verification
  // in a library and to do it ourselves.  
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

  // An "audience" argument is embedded in the assertion and must match our hostname.
  // Because this one server runs on multiple different domain names we just use
  // the host parameter out of the request.
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

// /api/logout clears the session cookie, effectively terminating the current session.
app.post("/api/logout", function (req, res) {
  req.session.email = null;
  res.json(true);
});

// /api/get requires an authenticated session, and accesses the current user's favorite
// beer out of the database.
app.get("/api/get", function (req, res) {
  var email;

  if (req.session && typeof req.session.email === 'string') email = req.session.email;

  if (!email) {
    res.writeHead(400, {"Content-Type": "text/plain"});
    res.write("Bad Request: you must be authenticated to get your beer");
    res.end();
    return;
  }

  if (!havePersistence) {
    console.log("WARNING: get is a no-op!  we have no database configured");
    return res.json("no database");
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

// /api/set requires an authenticated session, and sets the current user's favorite
// beer in the database.
app.post("/api/set", function (req, res) {
  var email = req.session.email;

  if (!email) {
    res.writeHead(400, {"Content-Type": "text/plain"});
    res.write("Bad Request: you must be authenticated to get your beer");
    res.end();
    return;
  }

  var beer = req.body.beer;

  if (!beer) {
    res.writeHead(400, {"Content-Type": "text/plain"});
    res.write("Bad Request: a 'beer' parameter is required to set your favorite beer");
    res.end();
    return;
  }

  if (!havePersistence) {
    console.log("WARNING: set is a no-op!  we have no database configured");
    return res.json(true);
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

// Tell express from where it should serve static resources
app.use(express.static(path.join(__dirname, "static")));

// connect up the database!
db.connect(function(err) {
  havePersistence = (err ? false : true);

  if (err) console.log("WARNING: running without a database means no persistence: ", err);

  // once connected to the database, start listening for connections
  app.listen(PORT, IP_ADDRESS, function () {
    var address = app.address();
    localHostname = address.address + ':' + address.port
    console.log("listening on " + localHostname);
  });
});
