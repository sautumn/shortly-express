var db = require('../config');
var Click = require('./click');
// var crypto = require('crypto');

var userLinks = db.Model.extend({
  tableName: 'users_links',

  initialize: function() {
    //okay
  }
});

module.exports = userLinks;
