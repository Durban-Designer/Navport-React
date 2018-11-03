var mongoose = require("mongoose");
var bcrypt = require('bcryptjs');
var SALT_WORK_FACTOR = 10;

var UserSchema = new mongoose.Schema({
  email: {
    type: String,
    required: true
  },
  password: {
    type: String,
    required: true
  },
  title: {
    type: String,
    required: true
  },
  firstName: {
    type: String,
    required: true
  },
  lastName: {
    type: String,
    required: true
  },
  address: {
    type: String,
    required: true
  },
  phone: {
    type: Number,
    required: true
  },
  role: {
    type: String,
    required: true
  },
  location: {
    type: String,
    required: true
  },
  shift: {
    type: String,
    required: true
  },
  department: {
    type: String,
    required: true
  },
  companyId: {
    type: String,
    required: true
  },
  departmentAdmin: {
    type: Boolean,
    required: false,
    default: false
  },
  admin: {
    type: Boolean,
    required: false,
    default: false
  },
  systemAdmin: {
    type: Boolean,
    required: false,
    default: false
  },
  endpointARN: {
    type: String,
    required: false,
    default: ''
  },
  platform: {
    type: String,
    required: false,
    default: ''
  }
})

UserSchema.pre('save', function(next) {
    var users = this;

    // only hash the password if it has been modified (or is new)
    if (!users.isModified('password')) return next();

    // generate a salt
    bcrypt.genSalt(SALT_WORK_FACTOR, function(err, salt) {
        if (err) return next(err);

        // hash the password along with our new salt
        bcrypt.hash(users.password, salt, function(err, hash) {
            if (err) return next(err);

            // override the cleartext password with the hashed one
            users.password = hash;
            next();
        });
    });
});

var User = mongoose.model("User", UserSchema);

module.exports = User;
