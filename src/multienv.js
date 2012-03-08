// This file contains all logic which lets a single deployment
// of my favorite beer work against multiple different browserid servers.
//
// This is useful to have a siglne RP that can test against many different
// sites.  supported environments include:
//
//  * development - dev.myfavoritebeer.org points at dev.diresworb.org
//  * beta - beta.myfavoritebeer.org points at diresworb.org
//  * production -  myfavortitebeer.org points at browserid.org
//  * ad-hoc - (.*).myfavoritebeer.org points at $1.hacksign.in

exports.determineEnvironment = function(req) {
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

exports.determineBrowserIDURL = function(req) {
  // first defer to the environment
  if (process.env.BROWSERID_URL) return process.env.BROWSERID_URL;

  var e = exports.determineEnvironment(req);
  if (staticEnvs[e]) return staticEnvs[e];
  else return 'https://' + e + '.hacksign.in';
}

exports.determineBrowserIDHost = function(req) {
  return exports.determineBrowserIDURL(req).replace(/http(s?):\/\//, '');
}
