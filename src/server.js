#!/usr/bin/env node

// require libraries that we depend on
const
express = require('express'),
sessions = require('client-sessions'),
path = require('path'),
postprocess = require('postprocess'),
https = require('https'),
db = require('./db.js'),
url = require('url'),
multienv = require('./multienv.js');

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
      cookieName: 'myfavoritebeer_session',
      cookie: {
        path: '/api',
        httpOnly: true,
        // all cookies are session cookies
        maxAge: 0,
        secure: false
      }
    })(req, res, next);
  } else {
    return next();
  }
});

app.use(postprocess(function(req, body) {
  var browseridURL = multienv.determineBrowserIDURL(req);
  return body.toString().replace(new RegExp("https://browserid.org", 'g'), browseridURL);
}));

// now register all of the APIs of the app
require('./api.js')(app);

// finally, let's register all of the application's views
require('./views.js')(app);

// and static resources (images, styles, and javascript) should be served from ./static
app.use(express.static(path.join(path.dirname(__dirname), "static")));

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
