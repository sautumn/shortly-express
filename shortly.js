var express = require('express');
var util = require('./lib/utility');
var partials = require('express-partials');
var bodyParser = require('body-parser');
var session = require('express-session');



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
app.use(session({'secret':'cookie'}));
// Parse JSON (uniform resource locators)
app.use(bodyParser.json());
// Parse forms (signup/login)
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static(__dirname + '/public'));


app.get('/',
function(req, res) {
  if (!req.session.user){
    res.redirect('login');
  } else {
    res.render('index');
  }
});

app.get('/create',
function(req, res) {
  if (!req.session.user) {
    res.redirect('login')
  } else {
    res.render('index');
  }
});

app.get('/links',
function(req, res) {

  if (!req.session.user){
    res.redirect('login');
  } else {
    Links.reset().fetch().then(function(links) {
      res.status(200).send(links.models);
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
app.get('/login',
  function(req, res) {
      res.render('login');
      res.end();
});

app.get('/signup', function(req, res) {
  res.render('signup');
  res.end();
})

app.post('/signup',
  function(req, res) {
    var newUser = new User({username: req.body.username, password: req.body.password});
    // console.log('User',newUser);
    db.knex.select().from('users').where('username', req.body.username)
    .then(function(value) {
      if (value.length === 0) {
        db.knex('users').insert([newUser.attributes]).then(function(value){
          req.session.user = req.body.username;
          res.redirect('/');
        }).catch(function(err) {
          console.log(err);
          res.redirect('signup');
        })
      } else {
        res.redirect('signup');
      }
    })
});

app.post('/login',
  function(req, res){
    if (req.body.password){
      db.knex.select('users.password').from('users').where('username', req.body.username).then(function(value) {
        if(value.length > 0){
          bcrypt.compare(req.body.password, value[0],password, function(err, result) {
            if (result){
              //start the session if the password is correct
              req.session.user = req.body.username;
              res.redirect('/');
            } else {
              res.redirect('signup');
            }
          })
          //if the password is not correct
        } else {
          res.redirect('login');
        }
      }).catch(function(err){
        console.log(err);
        throw err;
      })
    }
});

app.get('.logout', function(req, res) {
  req.session.destroy(function(){
    res.redirect('login');
  })
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
