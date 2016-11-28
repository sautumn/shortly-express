var express = require('express');
var util = require('./lib/utility');
var partials = require('express-partials');
var bodyParser = require('body-parser');
var session = require('express-session');
var bcrypt = require('bcrypt-nodejs');

var db = require('./app/config');
var Users = require('./app/collections/users');
var User = require('./app/models/user');
var Links = require('./app/collections/links');
var Link = require('./app/models/link');
var Click = require('./app/models/click');

var app = express();

app.set('views', __dirname + '/views');
app.set('view engine', 'ejs');
app.use(partials());
// Parse JSON (uniform resource locators)
app.use(bodyParser.json());
// Parse forms (signup/login)
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static(__dirname + '/public'));
app.use(session({secret: 'COOKIE'}));


app.get('/', 
function(req, res) {
  // console.log('THIS IS SESSION', req.session);
  // console.log(req.session.user);
  if (!req.session.user) {
    res.redirect('login');
  } else {
    res.render('index');
  }
});

app.get('/create', 
function(req, res) {
  if (!req.session.user) {
    res.redirect('login');
  } else {
    res.render('index');
  }
});

app.get('/links', 
function(req, res) {
  Links.reset().fetch().then(function(links) {
    res.status(200).send(links.models);
  });
});

app.post('/links', 
function(req, res) {
  var uri = req.body.url;

  if (!util.isValidUrl(uri)) {
    console.log('Not a valid url: ', uri);
    return res.sendStatus(404);
  }

  new Link({ url: uri }).fetch().then(function(found) {
    if (found) {
      res.status(200).send(found.attributes);
    } else {
      util.getUrlTitle(uri, function(err, title) {
        if (err) {
          console.log('Error reading URL heading: ', err);
          return res.sendStatus(404);
        }

        Links.create({
          url: uri,
          title: title,
          baseUrl: req.headers.origin
        })
        .then(function(newLink) {
          res.status(200).send(newLink);
        });
      });
    }
  });
});

/************************************************************/
// Write your authentication routes here
/************************************************************/

app.get('/login', function(req, res) {
  res.render('login');
});

app.get('/signup', function(req, res) {
  // req.session.user = req.body.username;
  res.render('signup');
});

app.post('/login', function(req, res) {

});

app.post('/signup', function(req, res) {
  // req.session.user = req.body.username;
  var user = req.body.username;
  var password = req.body.password;
  db.knex.select().from('users').then(function(value) {
    if (value.length === 0) {  
      bcrypt.hash(password, null, null, function(err, hash) { 
        if (err) {
          res.statusCode(400);
          res.redirect('signup');
        } else {
          //put into db
          db.knex('users').insert({username: user, password: hash}).catch(function(err) {
            console.log('shit', err);
          });
        }
      });
    } else {
      res.statusCode(400);
      res.redirect('login');
    }
  });
  // db.knex('users').whereExists(function() {
  //   console.log('asdf');
  //   var test = this.select('*').from('users').whereRaw('username =' + user);
  //   console.log('FAIWJEFOAJWIOFWAF', test);
  // });

  // CHECK IF USERNAME EXISTS INSIDE DATABASE
    // IF EXISTS, SEND ERROR (USERNAME EXISTS ALREADY)
  // ELSE
    // HASH PASSWORD
    // INSERT USERNAME AND PASSWORD INTO DB.

  res.render('signup');
  res.end();
});

app.get('/logout', function(req, res) {
  req.session.destroy(function() {
    res.redirect('login');
  });
});
/************************************************************/
// Handle the wildcard route last - if all other routes fail
// assume the route is a short code and try and handle it here.
// If the short-code doesn't exist, send the user to '/'
/************************************************************/

app.get('/*', function(req, res) {
  new Link({ code: req.params[0] }).fetch().then(function(link) {
    if (!link) {
      res.redirect('/');
    } else {
      var click = new Click({
        linkId: link.get('id')
      });

      click.save().then(function() {
        link.set('visits', link.get('visits') + 1);
        link.save().then(function() {
          return res.redirect(link.get('url'));
        });
      });
    }
  });
});

console.log('Shortly is listening on 4568');
app.listen(4568);
