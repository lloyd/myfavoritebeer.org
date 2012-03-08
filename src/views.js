const ejs = require('ejs');

module.exports = function(app) {
  app.set('view options', { layout: false });
  app.set('view engine', 'ejs');
  app.set('views', __dirname + "/../views");

  app.get('/', function(req, res) {
    // if the user is not signed in, send them to the signin page
    if (!req.session || !req.session.email) {
      res.redirect('/signin');
    } else {
      res.render('main');
    }
  });

  app.get('/signin', function(req, res) {
    if (req.session && req.session.email) {
      res.redirect('/');
    } else {
      res.render('signin');
    }
  });
};
