#!/usr/bin/env node

// require libraries that we depend on 
const
express = require('express'),
sessions = require('connect-cookie-session'),
path = require('path'),
postprocess = require('postprocess');

// the key with which session cookies are encrypted
const COOKIE_SECRET = process.env.SEKRET || 'you love, i love, we all love beer!';

var app = express.createServer();

// for local development we'll install a substitution middleware
if (process.env.BROSWERID_URL) {
  console.log("Using BrowserID at: " + process.env.BROSWERID_URL);
  app.use(postprocess.middleware(function(body) {
    return body.toString().replace(new RegExp("https://browserid.org", 'g'), process.env.BROSWERID_URL);
  }));
}

// and now for the wsapi api

app.post("/api/login", function (req, res) {
  console.log("login called");
  res.json(false);
});

app.post("/api/logout", function (req, res) {
  console.log("logout called");
  res.json(false);
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

app.listen(process.env.PORT || 0, '127.0.0.1', function () {
  console.log("listening on http://l27.0.0.1:" + app.address().port);
});
