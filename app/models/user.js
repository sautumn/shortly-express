var db = require('../config');
var bcrypt = require('bcrypt-nodejs');
var Promise = require('bluebird');



var User = db.Model.extend({
  tableName: 'users',
  hasTimestamps: true,
  defaults: {},

  initialize: function() {
    // var context = this;
    var password = this.get('password');
    // bcrypt.genSalt(5, function(err, salt) {
    //   bcrypt.hash(password, salt, function(err, hash) {
    //     context.set('password', hash);
    //   });
    // });
    var hash = bcrypt.hashSync(password);
    this.set('password',hash);
    // this.on('creating', function(model, attrs, options) {
    // });
  }
});

module.exports = User;
