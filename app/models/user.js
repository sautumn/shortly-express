var db = require('../config');
var bcrypt = require('bcrypt-nodejs');
var Promise = require('bluebird');



var User = db.Model.extend({
  tableName: 'users',
  hasTimestamps: true,
  defaults: {},

  initialize: function(){
    // this.on('creating', function(model, attrs, options) {
      var hash = bcrypt.hashSync(this.get('password'));
      this.set('password', hash);
    // });
  }
});

module.exports = User;
