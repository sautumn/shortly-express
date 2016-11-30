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
var userLinks = require('./app/models/userlinks');

var app = express();

app.set('views', __dirname + '/views');
app.set('view engine', 'ejs');
app.use(partials());
app.use(session({
  'secret': 'cookie'
}));
// Parse JSON (uniform resource locators)
app.use(bodyParser.json());
// Parse forms (signup/login)
app.use(bodyParser.urlencoded({
  extended: true
}));
app.use(express.static(__dirname + '/public'));
app.use(session({
  secret: 'COOKIE'
}));


app.get('/',
  function(req, res) {
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
    if (!req.session.user) {
      res.redirect('login');
    } else {
      // Links.reset().fetch().then(function(links) {
      //   // select
      //   console.log(links.models[0]);

      //   res.status(200).send(links.models);
      // });
      // db.knex.select('urls.*').from('urls').join('users_links', function () {
      //   this.on(function() {
      //     this.on('users_links.username', '=', req.session.user);
      //     this.andOn('users_links.longUrl', '=', 'urls.url');
      //   });
      // })
      //select * from urls left inner join users_links on (users_links.username = 'Phillip' AND users_links.longUrl = urls.url);
      db.knex.raw('select * from urls inner join users_links on (users_links.username = "' + req.session.user + '" AND users_links.longUrl = urls.url)')
      .then(function(links) {
        res.status(200).send(links);
      });
    }
  });

app.post('/links',
  function(req, res) {



    var uri = req.body.url;
    if (!util.isValidUrl(uri)) {
      console.log('Not a valid url: ', uri);
      return res.sendStatus(404);
    }

    new Link({
      url: uri
    }).fetch().then(function(found) {
      if (found) {
        res.status(200).send(found.attributes);
      } else {
        // INSERT INTO USERS_LINKS
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
              console.log('newlink', newLink);
              db.knex('users_links').insert({username: req.session.user, longUrl: newLink.attributes.url})
              .then(function(value) {
                res.status(200).send(newLink);
              })
              .catch(function(err) {
                console.log('fuck you');
              });
            });
        });
      }
    });
  });

/************************************************************/
// Write your authentication routes here
/************************************************************/
app.get('/login',
  function(req, res) {
    res.render('login');
    // res.end();
  });

app.get('/signup', function(req, res) {
  res.render('signup');
  // res.end();
});

app.post('/signup',
  function(req, res) {
    var newUser = new User({
      username: req.body.username,
      password: req.body.password
    });
    // console.log('User',newUser);
    db.knex.select().from('users').where('username', req.body.username)
      .then(function(value) {
        if (value.length === 0) {
          db.knex('users').insert([newUser.attributes]).then(function(value) {
            req.session.user = req.body.username;
            res.redirect('index');
          }).catch(function(err) {
            console.log(err);
            res.redirect('signup');
          });
        } else {
          res.render('/');
        }
      });
  });

app.post('/login',
  function(req, res) {
    if (req.body.password) {
      db.knex.select('users.password').from('users').where('username', req.body.username).then(function(value) {
        if (value.length > 0) {
          bcrypt.compare(req.body.password, value[0].password, function(err, result) {
            if (result) {
              //start the session if the password is correct
              req.session.user = req.body.username;
              res.redirect('/');
            } else {
              res.redirect('signup');
            }
          });
            //if the password is not correct
        } else {
          res.redirect('/login');
        }
      }).catch(function(err) {
        console.log(err);
        throw err;
      });
    }
  });

app.get('.logout', function(req, res) {
  req.session.destroy(function() {
    res.redirect('login');
  });
});


app.get('/login', function(req, res) {
  res.render('login');
  // res.end();
});

app.get('/signup', function(req, res) {
  // req.session.user = req.body.username;
  res.render('signup');
  // res.end();
});


app.post('/login', function(req, res) {
  // req.session.user = req.body.username;
  // SELECT USER AND HASH FROM DATABASE
  // IF HASH FROM DATABASE === HASH FROM REQ.BODY HASH
  // LOGIN TO SESSION
  if (req.body.password) {
    db.knex.select('users.password').from('users').where('username', req.body.username).then(function(value) {
      // console.log('THIS IS VALUE', value);
      // console.log('THIS IS PASSWORD', req.body.password );
      if (value.length > 0) {
        bcrypt.compare(req.body.password, value[0].password, function(err, result) {
          // console.log(result);
          if (result) {
            req.session.user = req.body.username;
            // res.sendStatus(400);
            res.redirect('/');
          } else {
            // res.sendStatus(400);
            res.redirect('signup');
          }
        });
      } else {
        res.redirect('/login');
      }
    });
  }
});

app.post('/signup', function(req, res) {
  var user = req.body.username;
  var password = req.body.password;


  db.knex.select().from('users').where('username', req.body.username).then(function(value) {
    if (value.length === 0) {
      bcrypt.hash(password, null, null, function(err, hash) {
        if (err) {
          return;
        } else {
          db.knex('users').insert([{
            username: user,
            password: hash
          }]).then(function(value) {
            req.session.user = req.body.username;
            res.render('/');
          }).catch(function(err) {
            console.log('shit', err);
            res.render('signup');
          });
        }
      });
    } else {
      res.render('signup');
    }
  });
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
  new Link({
    code: req.params[0]
  }).fetch().then(function(link) {
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

// console.log('Shortly is listening on 4568');
// app.listen(4568);
//changed port for env variables
app.listen(process.env.PORT || 4568, function(){
  console.log('listening on port');
});
