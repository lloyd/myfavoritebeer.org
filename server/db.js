// db.js is a tiny persistence layer for myfavoritebeer that uses
// mongodb and the mongodb client library.
//
// This implementation is really not the point of the myfavoritebeer
// example code and is just provided for completeness (the point is
// how you can do authentication with browserid).  

const
url = require('url'),
mongodb = require('mongodb');

var collections = {
  dev:  undefined,
  beta: undefined,
  prod: undefined
};

exports.connect = function(cb) {
  var mongo_uri;

  if (process.env.MONGOLAB_URI) {
      mongo_uri = process.env.MONGOLAB_URI;
  }
  else if (process.env.VCAP_SERVICES) {
    var vcapServices = JSON.parse(process.env.VCAP_SERVICES);
    var cfMongo = vcapServices['mongodb-1.8'][0];
    var cfMongoHost =  cfMongo.credentials.hostname;
    var cfMongoPort =  cfMongo.credentials.port;
    var cfMongoUser = cfMongo.credentials.username;
    var cfMongoPass = cfMongo.credentials.password;
    var cfMongoName = cfMongo.credentials.db;
    mongo_uri = "mongodb://" + cfMongoUser + ":" + cfMongoPass + "@" + cfMongoHost + ":" + cfMongoPort + "/" + cfMongoName;
  }

  if (!mongo_uri) {
    cb("no MONGOLAB_URI env var!");
    return;
  }

  var bits = url.parse(mongo_uri);
  var server = new mongodb.Server(bits.hostname, bits.port, {});
  new mongodb.Db(bits.pathname.substr(1), server, {}).open(function (err, cli) {
    if (err) return cb(err);
    collections.dev = new mongodb.Collection(cli, 'devbeers');
    collections.local = collections.dev;
    collections.beta = new mongodb.Collection(cli, 'betabeers');
    collections.prod = new mongodb.Collection(cli, 'prodbeers');

    // now authenticate
    var auth = bits.auth.split(':');
    cli.authenticate(auth[0], auth[1], function(err) {
      cb(err);
    });
  });
}; 

exports.get = function(collection, email, cb) {
  var c = collections[collection].find({ email: email }, { beer: 1 });
  c.toArray(function(err, docs) {
    if (err) return cb(err);
    if (docs.length != 1) return cb("consistency error!  more than one doc returned!");
    cb(undefined, docs[0].beer);
  });
};

exports.set = function(collection, email, beer, cb) {
  collections[collection].update(
    { email: email },
    {
      email: email,
      beer: beer
    },
    {
      safe:true,
      upsert: true
    }, cb);
};
