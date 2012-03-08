const
https = require('https'),
multienv = require('./multienv.js'),
querystring = require('querystring');

// Implementation of the API for myfavoritebeer

module.exports = function(app) {
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

    db.get(multienv.determineEnvironment(req), email, function(err, beer) {
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

    db.set(multienv.determineEnvironment(req), email, beer, function(err) {
      if (err) {
        console.log("setting beer for", email, "to", beer); 
        res.writeHead(500);
        res.end();
      } else {
        res.json(true);
      }
    });
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
      host: multienv.determineBrowserIDHost(req),
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


};