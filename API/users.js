var express = require("express");
var mongodb = require("mongodb");
var _ = require("lodash");
var bodyParser = require("body-parser");
var passport = require("passport");
var passportJWT = require("passport-jwt");
var jwt = require('jsonwebtoken');
var app = express();
var router = express.Router();
var mongoose = require("mongoose");
var Company = mongoose.model('Company')
var FactoryLocation = mongoose.model('FactoryLocation')
var Shift = mongoose.model('Shift')
var Department = mongoose.model('Department')
var User = mongoose.model("User");
var Role = mongoose.model("Role");
var bcrypt = require('bcryptjs');
var stringify = require('csv-stringify');
var parse = require('csv-parse');
var path = __dirname + "/csv/";
var fs = require('fs');
var ExtractJwt = passportJWT.ExtractJwt;
var JwtStrategy = passportJWT.Strategy;
var Validate = require('./validate.js');
var SNS_ACCESS_KEY = 'AKIAIRNDXSEMBY4AEMEQ'
var SNS_KEY_ID = 'Ifl0MnJt7wV+aXgGQrZBjzsil+M15zSlWmmiyepv'
var ANDROID_ARN = 'arn:aws:sns:us-west-1:378258675170:app/GCM/Weigh-Label'
var IOS_ARN = ''

var jwtOptions = {}
jwtOptions.jwtFromRequest = ExtractJwt.fromAuthHeaderWithScheme("JWT");
jwtOptions.secretOrKey = 'Weigh-Secret-2018-no1';

var strategy = new JwtStrategy(jwtOptions, function(jwt_payload, next) {
  User.findOne({"_id": jwt_payload.id}, function(err, user) {
    if (err) {
          return next(err, false);
      }
      if (user) {
          return next(null, user);
      } else {
          return next(null, false);
      }
  });
});

app.use(passport.initialize());
passport.use(strategy);
app.use(bodyParser.json());

router.post("/login", (req, res) => {
  User.findOne({"email": req.body.email}, function (err, users) {
    if (err) throw err;
    if (users !== null) {
      bcrypt.compare(req.body.password, users.password, function(err, isMatch) {
        if (err) return (err);
        if (isMatch === true) {
          Validate.log({
            method: 'post',
            object: 'user',
            endpoint: '/login',
            time: new Date(),
            email: req.body.email,
            ip: req.connection.remoteAddress
          }, function(log, err) {
            if (err) {
              res.status(500).send('Error logging attempt')
            } else {
              var payload = {"id": users.id};
              var token = jwt.sign(payload, jwtOptions.secretOrKey);
              res.json({userId: users.id, token: token, companyId: users.companyId, shift: users.shift, department: users.department, admin: users.admin, systemAdmin: users.systemAdmin, departmentAdmin: users.departmentAdmin});
            }
          })
        } else {
          Validate.log({
            method: 'post',
            object: 'user',
            endpoint: '/login',
            time: new Date(),
            email: req.body.email,
            ip: req.connection.remoteAddress
          }, function(log, err) {
            if (err) {
              res.status(500).send('Error logging attempt')
            } else {
              res.status(401).send('unauthorized');
            }
          })
        }
      })
    } else {
      Validate.log({
        method: 'post',
        object: 'user',
        endpoint: '/login',
        time: new Date(),
        email: req.body.email,
        ip: req.connection.remoteAddress
      }, function(log, err) {
        if (err) {
          res.status(500).send('Error logging attempt')
        } else {
          res.status(401).send('unauthorized');
        }
      })
    }
  })
})

router.post("/recover", (req, res) => {
  function sendRecoveryEmail (user) {
    // todo write email sending logic
    res.send('success')
  }
  User.findOne({"email": req.body.email}, function (err, user) {
    if (err) {
      console.log(err)
    } else {
      Validate.log({
        method: 'post',
        object: 'user',
        endpoint: '/recover',
        time: new Date(),
        email: req.body.email,
        ip: req.connection.remoteAddress
      }, function(log, err) {
        if (err) {
          res.status(500).send('Error logging attempt')
        } else {
          sendRecoveryEmail(user)
        }
      })
    }
  })
})

router.post("/spreadsheet", passport.authenticate('jwt', { session: false }), (req,res) => {
  function nameUpdate () {
    var shiftArray = []
    var loop = function (i) {
      i = i || 0
      var shifts = req.body.shifts
      if (i < shifts.length) {
        if (shifts[i].user !== '') {
          User.findOne({'_id': shifts[i].user}, function (err, user) {
            if (err) {
              console.log(err);
              res.status(500).send(err);
            } else {
              let shift = {
                selected: shifts[i].selected,
                department: shifts[i].department,
                user: shifts[i].user,
                userDisplay: user.firstName + ' ' + user.lastName,
                shiftName: shifts[i].shiftName,
                location: shifts[i].location,
                shiftStartDate: new Date(shifts[i].shiftStartDate),
                shiftEndDate: new Date(shifts[i].shiftEndDate),
                shiftStatus: shifts[i].shiftStatus
              }
              shiftArray.push(shift)
              i++
              loop(i)
            }
          })
        } else {
          let shift = {
            selected: shifts[i].selected,
            department: shifts[i].department,
            user: shifts[i].user,
            userDisplay: '',
            shiftName: shifts[i].shiftName,
            location: shifts[i].location,
            shiftStartDate: new Date(shifts[i].shiftStartDate),
            shiftEndDate: new Date(shifts[i].shiftEndDate),
            shiftStatus: shifts[i].shiftStatus
          }
          shiftArray.push(shift)
          i++
          loop(i)
        }
      } else {
        res.send(shiftArray);
      }
    }
    loop()
  }
  Validate.permissions(req.body.adminId, function(result) {
    Validate.log({
      method: 'post',
      object: 'user',
      endpoint: '/spreadsheet',
      time: new Date(),
      adminId: req.body.adminId,
      ip: req.connection.remoteAddress
    }, function(log, err) {
      if (err) {
        res.status(500).send('Error logging attempt')
      } else {
        if (result.permissions === 'systemAdmin') {
          nameUpdate()
        } else if (result.permissions === 'admin') {
          nameUpdate()
        } else if (result.permissions === 'departmentAdmin') {
          nameUpdate()
        } else if (result.permissions === 'role' && result.role.users.read === true) {
          nameUpdate()
        } else {
          res.status(401).send('unauthorized');
        }
      }
    })
  })
})

router.post("/", passport.authenticate('jwt', { session: false }), (req,res) => {
  function createUser (admins) {
    var newUser = new User({
      email: req.body.email,
      password: req.body.password,
      title: req.body.title,
      firstName: req.body.firstName,
      lastName: req.body.lastName,
      address: req.body.address,
      phone: req.body.phone,
      role: req.body.role,
      location: req.body.location,
      shift: req.body.shift,
      department: req.body.department,
      companyId: req.body.companyId,
      departmentAdmin: false,
      admin: false,
      systemAdmin: false
    })
    if (admins.systemAdmin === true) {
      newUser.systemAdmin = req.body.systemAdmin
    }
    if (admins.admin === true) {
      newUser.admin = req.body.admin
    }
    if (admins.departmentAdmin === true) {
      newUser.departmentAdmin = req.body.departmentAdmin
    }

    newUser.save((err, result) => {
      if(err) {
        res.send(err);
      } else {
        User.findOne({"email": req.body.email}, function (err, users) {
          var payload = {"id": users.id};
          var token = jwt.sign(payload, jwtOptions.secretOrKey);
          res.status(201).json({userId: users.id, token: token, companyId: users.companyId, shift: users.shift, department: users.department, admin: users.admin, systemAdmin: users.systemAdmin, departmentAdmin: users.departmentAdmin});
        })
      }
    })
  }
  if (req.body.adminId === null) {
    res.status(401).send('unauthorized');
  }
  Validate.permissions(req.body.adminId, function(result) {
    Validate.log({
      method: 'post',
      object: 'user',
      endpoint: '/',
      time: new Date(),
      adminId: req.body.adminId,
      ip: req.connection.remoteAddress
    }, function(log, err) {
      if (err) {
        res.status(500).send('Error logging attempt')
      } else {
        if (result.permissions !== 'systemAdmin' && req.body.systemAdmin === true) {
          res.status(401).send('unauthorized');
        } else if (result.permissions === 'systemAdmin') {
          createUser({systemAdmin: true, admin: true, departmentAdmin: true})
        } else if (result.permissions !== 'admin' && req.body.admin === true) {
          res.status(401).send('unauthorized');
        } else if (result.permissions === 'admin' && req.body.companyId === result.user.companyId) {
          createUser({systemAdmin: false, admin: true, departmentAdmin: true})
        } else if (result.permissions !== 'departmentAdmin' && req.body.departmentAdmin === true) {
          res.status(401).send('unauthorized');
        } else if (result.permissions === 'departmentAdmin' && req.body.department === result.user.department && req.body.companyId === result.user.companyId) {
          createUser({systemAdmin: false, admin: false, departmentAdmin: true})
        } else if (result.permissions === 'role' && result.role.users.create === true) {
          createUser({systemAdmin: false, admin: false, departmentAdmin: false})
        } else {
          res.status(401).send('unauthorized');
        }
      }
    })
  })
})

router.get("/export/:company", passport.authenticate('jwt', { session: false }),(req, res) => {
  var companyId = req.params["company"];
  User
  .find({"companyId": companyId})
  .exec(function (err, users) {
    if (err) {
      res.send(err);
    } else {
      var usersArray = [[
        '_id',
        'email',
        'password',
        'title',
        'firstName',
        'lastName',
        'address',
        'phone',
        'role',
        'location',
        'shift',
        'department',
        'companyId',
        'departmentAdmin',
        'admin',
        'systemAdmin'
      ]]
      for (let i = 0; i < users.length; i++) {
        usersArray.push([
          users[i]._id,
          users[i].email,
          users[i].password,
          users[i].title,
          users[i].firstName,
          users[i].lastName,
          users[i].address,
          users[i].phone,
          users[i].role,
          users[i].location,
          users[i].shift,
          users[i].department,
          users[i].companyId,
          users[i].departmentAdmin,
          users[i].admin,
          users[i].systemAdmin
        ])
      }
      stringify(usersArray, function(err, output){
        let file = fs.writeFileSync(path + 'data.csv', output);
        res.sendFile(path + 'data.csv');
      });
    }
  });
})

router.get("/export/:company/:location", passport.authenticate('jwt', { session: false }),(req, res) => {
  var companyId = req.params["company"];
  var locationId = req.params["location"];
  User
  .find({"companyId": companyId, "location": locationId})
  .exec(function (err, users) {
    if (err) {
      res.send(err);
    } else {
      var usersArray = [[
        '_id',
        'email',
        'password',
        'title',
        'firstName',
        'lastName',
        'address',
        'phone',
        'role',
        'location',
        'shift',
        'department',
        'companyId',
        'departmentAdmin',
        'admin',
        'systemAdmin'
      ]]
      for (let i = 0; i < users.length; i++) {
        usersArray.push([
          users[i]._id,
          users[i].email,
          users[i].password,
          users[i].title,
          users[i].firstName,
          users[i].lastName,
          users[i].address,
          users[i].phone,
          users[i].role,
          users[i].location,
          users[i].shift,
          users[i].department,
          users[i].companyId,
          users[i].departmentAdmin,
          users[i].admin,
          users[i].systemAdmin
        ])
      }
    }
  });
})

router.get("/export/:company/:location/:shift", passport.authenticate('jwt', { session: false }),(req, res) => {
  var companyId = req.params["company"];
  var locationId = req.params["location"];
  var shiftId = req.params["shift"];
  User
  .find({"companyId": companyId, "location": locationId, "shift": shiftId})
  .exec(function (err, users) {
    if (err) {
      res.send(err);
    } else {
      var usersArray = [[
        '_id',
        'email',
        'password',
        'title',
        'firstName',
        'lastName',
        'address',
        'phone',
        'role',
        'location',
        'shift',
        'department',
        'companyId',
        'departmentAdmin',
        'admin',
        'systemAdmin'
      ]]
      for (let i = 0; i < users.length; i++) {
        usersArray.push([
          users[i]._id,
          users[i].email,
          users[i].password,
          users[i].title,
          users[i].firstName,
          users[i].lastName,
          users[i].address,
          users[i].phone,
          users[i].role,
          users[i].location,
          users[i].shift,
          users[i].department,
          users[i].companyId,
          users[i].departmentAdmin,
          users[i].admin,
          users[i].systemAdmin
        ])
      }
    }
  });
})

router.get("/export/:company/:location/:shift/:department", passport.authenticate('jwt', { session: false }),(req, res) => {
  var companyId = req.params["company"];
  var locationId = req.params["location"];
  var shiftId = req.params["shift"];
  var departmentId = req.params["department"];
  User
  .find({"companyId": companyId, "location": locationId, "shift": shiftId, "department": departmentId})
  .exec(function (err, users) {
    if (err) {
      res.send(err);
    } else {
      var usersArray = [[
        '_id',
        'email',
        'password',
        'title',
        'firstName',
        'lastName',
        'address',
        'phone',
        'role',
        'location',
        'shift',
        'department',
        'companyId',
        'departmentAdmin',
        'admin',
        'systemAdmin'
      ]]
      for (let i = 0; i < users.length; i++) {
        usersArray.push([
          users[i]._id,
          users[i].email,
          users[i].password,
          users[i].title,
          users[i].firstName,
          users[i].lastName,
          users[i].address,
          users[i].phone,
          users[i].role,
          users[i].location,
          users[i].shift,
          users[i].department,
          users[i].companyId,
          users[i].departmentAdmin,
          users[i].admin,
          users[i].systemAdmin
        ])
      }
    }
  });
})

router.post("/import", passport.authenticate('jwt', { session: false }),(req, res) => {
  parse(req.body.file, function(err, output){
    let i = 0;
    var error = ''
    for (i = 1; i < output.length; i++) {
      let array = output[i]
      console.log({
        email: array[1],
        password: array[2],
        title: array[3],
        firstName: array[4],
        lastName: array[5],
        address: array[6],
        phone: array[7],
        role: array[8],
        location: array[9],
        shift: array[10],
        department: array[11],
        companyId: array[12],
        departmentAdmin: array[13],
        admin: array[14],
        systemAdmin: array[15]
      })
      var newUser = new User({
        email: array[1],
        password: array[2],
        title: array[3],
        firstName: array[4],
        lastName: array[5],
        address: array[6],
        phone: array[7],
        role: array[8],
        location: array[9],
        shift: array[10],
        department: array[11],
        companyId: array[12],
        departmentAdmin: array[13],
        admin: array[14],
        systemAdmin: array[15]
      })

      newUser.save((err, result) => {
        if (err) {
          console.log(err);
        }
      });
    }
    res.send('complete')
  });
})

router.get("/all/:companyId/:adminId", passport.authenticate('jwt', { session: false }), (req, res) => {
  var companyId = req.params["companyId"];
  var adminId = req.params["adminId"];
  var usersArray = []
  var user
  var length
  function loop (i, users) {
    i = i || 0
    length = users.length
    if (i < length) {
      Company.findOne({'companyId': users[i].companyId}, function (err, company) {
        FactoryLocation.findOne({'_id': users[i].location}, function (err, location) {
          Shift.findOne({'_id': users[i].shift}, function (err, shift) {
            Department.findOne({'_id': users[i].department}, function (err, department) {
              Role.findOne({'_id': users[i].role}, function (err, role) {
                user = {
                  _id: users[i]._id,
                  email: users[i].email,
                  password: users[i].password,
                  title: users[i].title,
                  firstName: users[i].firstName,
                  lastName: users[i].lastName,
                  address: users[i].address,
                  phone: users[i].phone,
                  role: users[i].role,
                  roleName: role.name,
                  location: users[i].location,
                  locationName: '',
                  shift: users[i].shift,
                  shiftName: '',
                  department: users[i].department,
                  departmentName: '',
                  companyId: users[i].companyId,
                  companyName: '',
                  departmentAdmin: users[i].departmentAdmin,
                  admin: users[i].admin,
                  systemAdmin: users[i].systemAdmin,
                  endpointARN: users[i].endpointARN,
                  platform: users[i].platform,
                  selected: false
                }
                if (department) {
                  user.departmentName = department.name
                }
                if (location) {
                  user.locationName = location.name
                }
                if (shift) {
                  user.shiftName = shift.name
                }
                if (company) {
                  user.companyName = company.companyName
                }
                usersArray.push(user)
                i++
                loop(i, users)
              })
            })
          })
        })
      })
    } else {
      res.send(usersArray)
    }
  }
  Validate.permissions(adminId, function(result) {
    Validate.log({
      method: 'get',
      object: 'user',
      endpoint: '/all/:companyId/:adminId',
      time: new Date(),
      adminId: adminId,
      ip: req.connection.remoteAddress
    }, function(log, err) {
      if (err) {
        res.status(500).send('Error logging attempt')
      } else {
        if (result.permissions === 'systemAdmin' || (result.permissions === 'admin' && result.user.companyId === companyId) || (result.permissions === 'role' && result.user.companyId === companyId && result.role.users.read === true)) {
          User.find({"companyId": companyId},function (err, users) {
            if (err) {
              res.send(err);
            } else {
              loop(0, users);
            }
          })
        } else {
          res.status(401).send('unauthorized');
        }
      }
    })
  })
})

router.get("/all/:adminId/:companyId/:locationId", passport.authenticate('jwt', { session: false }), (req, res) => {
  var companyId = req.params["companyId"];
  var adminId = req.params["adminId"];
  var locationId = req.params["locationId"];
  var usersArray = []
  var user
  var length
  function loop (i, users) {
    i = i || 0
    length = users.length
    if (i < length) {
      Company.findOne({'companyId': users[i].companyId}, function (err, company) {
        FactoryLocation.findOne({'_id': users[i].location}, function (err, location) {
          Shift.findOne({'_id': users[i].shift}, function (err, shift) {
            Department.findOne({'_id': users[i].department}, function (err, department) {
              Role.findOne({'_id': users[i].role}, function (err, role) {
                user = {
                  _id: users[i]._id,
                  email: users[i].email,
                  password: users[i].password,
                  title: users[i].title,
                  firstName: users[i].firstName,
                  lastName: users[i].lastName,
                  address: users[i].address,
                  phone: users[i].phone,
                  role: users[i].role,
                  roleName: role.name,
                  location: users[i].location,
                  locationName: '',
                  shift: users[i].shift,
                  shiftName: '',
                  department: users[i].department,
                  departmentName: '',
                  companyId: users[i].companyId,
                  companyName: '',
                  departmentAdmin: users[i].departmentAdmin,
                  admin: users[i].admin,
                  systemAdmin: users[i].systemAdmin,
                  endpointARN: users[i].endpointARN,
                  platform: users[i].platform,
                  selected: false
                }
                if (department) {
                  user.departmentName = department.name
                }
                if (location) {
                  user.locationName = location.name
                }
                if (shift) {
                  user.shiftName = shift.name
                }
                if (company) {
                  user.companyName = company.companyName
                }
                usersArray.push(user)
                i++
                loop(i, users)
              })
            })
          })
        })
      })
    } else {
      res.send(usersArray)
    }
  }
  Validate.permissions(adminId, function(result) {
    Validate.log({
      method: 'get',
      object: 'user',
      endpoint: '/all/:adminId/:companyId/:locationId',
      time: new Date(),
      adminId: adminId,
      ip: req.connection.remoteAddress
    }, function(log, err) {
      if (err) {
        res.status(500).send('Error logging attempt')
      } else {
        if (result.permissions === 'systemAdmin' || (result.permissions === 'admin' && result.user.companyId === companyId) || (result.permissions === 'role' && result.user.companyId === companyId && result.role.users.read === true)) {
          User.find({"companyId": companyId, "location": locationId},function (err, users) {
            if (err) {
              res.send(err);
            } else {
              loop(0, users);
            }
          })
        } else {
          res.status(401).send('unauthorized');
        }
      }
    })
  })
})

router.get("/all/:adminId/:companyId/:locationId/:shiftId", passport.authenticate('jwt', { session: false }), (req, res) => {
  var companyId = req.params["companyId"];
  var adminId = req.params["adminId"];
  var locationId = req.params["locationId"];
  var shiftId = req.params["shiftId"];
  var usersArray = []
  var user
  var length
  function loop (i, users) {
    i = i || 0
    length = users.length
    if (i < length) {
      Company.findOne({'companyId': users[i].companyId}, function (err, company) {
        FactoryLocation.findOne({'_id': users[i].location}, function (err, location) {
          Shift.findOne({'_id': users[i].shift}, function (err, shift) {
            Department.findOne({'_id': users[i].department}, function (err, department) {
              Role.findOne({'_id': users[i].role}, function (err, role) {
                user = {
                  _id: users[i]._id,
                  email: users[i].email,
                  password: users[i].password,
                  title: users[i].title,
                  firstName: users[i].firstName,
                  lastName: users[i].lastName,
                  address: users[i].address,
                  phone: users[i].phone,
                  role: users[i].role,
                  roleName: role.name,
                  location: users[i].location,
                  locationName: '',
                  shift: users[i].shift,
                  shiftName: '',
                  department: users[i].department,
                  departmentName: '',
                  companyId: users[i].companyId,
                  companyName: '',
                  departmentAdmin: users[i].departmentAdmin,
                  admin: users[i].admin,
                  systemAdmin: users[i].systemAdmin,
                  endpointARN: users[i].endpointARN,
                  platform: users[i].platform,
                  selected: false
                }
                if (department) {
                  user.departmentName = department.name
                }
                if (location) {
                  user.locationName = location.name
                }
                if (shift) {
                  user.shiftName = shift.name
                }
                if (company) {
                  user.companyName = company.companyName
                }
                usersArray.push(user)
                i++
                loop(i, users)
              })
            })
          })
        })
      })
    } else {
      res.send(usersArray)
    }
  }
  Validate.permissions(adminId, function(result) {
    Validate.log({
      method: 'get',
      object: 'user',
      endpoint: '/all/:adminId/:companyId/:locationId/:shiftId',
      time: new Date(),
      adminId: adminId,
      ip: req.connection.remoteAddress
    }, function(log, err) {
      if (err) {
        res.status(500).send('Error logging attempt')
      } else {
        if (result.permissions === 'systemAdmin' || (result.permissions === 'admin' && result.user.companyId === companyId) || (result.permissions === 'role' && result.user.companyId === companyId && result.role.users.read === true)) {
          User.find({"companyId": companyId, "location": locationId, "shift": shiftId},function (err, users) {
            if (err) {
              res.send(err);
            } else {
              loop(0, users);
            }
          })
        } else {
          res.status(401).send('unauthorized');
        }
      }
    })
  })
})

router.get("/alldep/:adminId/:companyId/:locationId/:departmentId", passport.authenticate('jwt', { session: false }), (req, res) => {
  var companyId = req.params["companyId"];
  var adminId = req.params["adminId"];
  var locationId = req.params["locationId"];
  var shiftId = req.params["shiftId"];
  var departmentId = req.params["departmentId"];
  var usersArray = []
  var user
  var length
  function loop (i, users) {
    i = i || 0
    length = users.length
    if (i < length) {
      Company.findOne({'companyId': users[i].companyId}, function (err, company) {
        FactoryLocation.findOne({'_id': users[i].location}, function (err, location) {
          Shift.findOne({'_id': users[i].shift}, function (err, shift) {
            Department.findOne({'_id': users[i].department}, function (err, department) {
              Role.findOne({'_id': users[i].role}, function (err, role) {
                user = {
                  _id: users[i]._id,
                  email: users[i].email,
                  password: users[i].password,
                  title: users[i].title,
                  firstName: users[i].firstName,
                  lastName: users[i].lastName,
                  address: users[i].address,
                  phone: users[i].phone,
                  role: users[i].role,
                  roleName: role.name,
                  location: users[i].location,
                  locationName: '',
                  shift: users[i].shift,
                  shiftName: '',
                  department: users[i].department,
                  departmentName: '',
                  companyId: users[i].companyId,
                  companyName: '',
                  departmentAdmin: users[i].departmentAdmin,
                  admin: users[i].admin,
                  systemAdmin: users[i].systemAdmin,
                  endpointARN: users[i].endpointARN,
                  platform: users[i].platform,
                  selected: false
                }
                if (department) {
                  user.departmentName = department.name
                }
                if (location) {
                  user.locationName = location.name
                }
                if (shift) {
                  user.shiftName = shift.name
                }
                if (company) {
                  user.companyName = company.companyName
                }
                usersArray.push(user)
                i++
                loop(i, users)
              })
            })
          })
        })
      })
    } else {
      res.send(usersArray)
    }
  }
  Validate.permissions(adminId, function(result) {
    Validate.log({
      method: 'get',
      object: 'user',
      endpoint: '/all/:adminId/:companyId/:locationId/:shiftId/:departmentId',
      time: new Date(),
      adminId: adminId,
      ip: req.connection.remoteAddress
    }, function(log, err) {
      if (err) {
        res.status(500).send('Error logging attempt')
      } else {
        if (result.permissions === 'systemAdmin' || (result.permissions === 'admin' && result.user.companyId === companyId) || (result.permissions === 'role' && result.user.companyId === companyId && result.role.users.read === true)) {
          User.find({"companyId": companyId, "location": locationId, "department": departmentId},function (err, users) {
            if (err) {
              res.send(err);
            } else {
              loop(0, users);
            }
          })
        } else {
          res.status(401).send('unauthorized');
        }
      }
    })
  })
})

router.get("/department/:department/:companyId/:adminId", passport.authenticate('jwt', { session: false }), (req, res) => {
  var companyId = req.params["companyId"];
  var department = req.params["department"];
  var adminId = req.params["adminId"];
  Validate.permissions(adminId, function(result) {
    Validate.log({
      method: 'get',
      object: 'user',
      endpoint: '/department/:department/:companyId/:adminId',
      time: new Date(),
      adminId: adminId,
      ip: req.connection.remoteAddress
    }, function(log, err) {
      if (err) {
        res.status(500).send('Error logging attempt')
      } else {
        if (result.permissions === 'systemAdmin' || (result.permissions === 'admin' && result.user.companyId === companyId) || (result.permissions === 'departmentAdmin' && result.user.companyId === companyId && result.user.department === department) || (result.permissions === 'role' && result.user.companyId === user.companyId && result.user.department === user.department && result.role.users.read === true)) {
          User.find({"companyId": companyId, "department": department},function (err, users) {
            if (err) {
              res.send(err);
            } else {
              res.send(users);
            }
          })
        } else {
          res.status(401).send('unauthorized');
        }
      }
    })
  })
})

router.get("/self/:id", passport.authenticate('jwt', { session: false }), (req, res) => {
  var userid = req.params["id"];
  Validate.log({
    method: 'get',
    object: 'user',
    endpoint: '/self/:id',
    time: new Date(),
    userid: userid,
    ip: req.connection.remoteAddress
  }, function(log, err) {
    if (err) {
      res.status(500).send('Error logging attempt')
    } else {
      User.findOne({"_id": userid},function (err, users) {
        if (err) {
          res.send(err);
        } else {
          res.send(users);
        }
      })
    }
  })
})

router.get("/search/:adminId/:params/:companyId/:shiftId", passport.authenticate('jwt', { session: false }), (req, res) => {
  var params = req.params["params"];
  var adminId = req.params["adminId"];
  var companyId = req.params["companyId"];
  var shiftId = req.params["shiftId"];
  User.find({"firstName": { "$regex" : params}, "companyId": companyId, "shift": shiftId}, function (err, users) {
    if (err) {
      res.send(err);
    } else {
      Validate.permissions(adminId, function(result) {
        Validate.log({
          method: 'get',
          object: 'user',
          endpoint: '/:id/:adminId',
          time: new Date(),
          adminId: adminId,
          ip: req.connection.remoteAddress
        }, function(log, err) {
          if (err) {
            res.status(500).send('Error logging attempt')
          } else {
            if (result.permissions === 'systemAdmin' || (result.permissions === 'admin' && result.user.companyId === users.companyId) || (result.permissions === 'departmentAdmin' && result.user.companyId === users.companyId && result.user.department === users.department)) {
              res.send(users);
            } else {
              res.status(401).send('unauthorized');
            }
          }
        })
      })
    }
  })
})

router.get("/search/:adminId/:params/:companyId/:shiftId/:departmentId", passport.authenticate('jwt', { session: false }), (req, res) => {
  var params = req.params["params"];
  var adminId = req.params["adminId"];
  var companyId = req.params["companyId"];
  var shiftId = req.params["shiftId"];
  var departmentId = req.params["departmentId"];
  User.find({"firstName": { "$regex" : params}, "department": departmentId, "companyId": companyId, "shift": shiftId}, function (err, users) {
    if (err) {
      res.send(err);
    } else {
      Validate.permissions(adminId, function(result) {
        Validate.log({
          method: 'get',
          object: 'user',
          endpoint: '/:id/:adminId',
          time: new Date(),
          adminId: adminId,
          ip: req.connection.remoteAddress
        }, function(log, err) {
          if (err) {
            res.status(500).send('Error logging attempt')
          } else {
            if (result.permissions === 'systemAdmin' || (result.permissions === 'admin' && result.user.companyId === users.companyId) || (result.permissions === 'departmentAdmin' && result.user.companyId === users.companyId && result.user.department === users.department)) {
              res.send(users);
            } else {
              res.status(401).send('unauthorized');
            }
          }
        })
      })
    }
  })
})

router.get("/:id/:adminId", passport.authenticate('jwt', { session: false }), (req, res) => {
  var userid = req.params["id"];
  var adminId = req.params["adminId"];
  User.findOne({"_id": userid},function (err, user) {
    if (err) {
      res.send(err);
    } else {
      Validate.permissions(adminId, function(result) {
        Validate.log({
          method: 'get',
          object: 'user',
          endpoint: '/:id/:adminId',
          time: new Date(),
          adminId: adminId,
          ip: req.connection.remoteAddress
        }, function(log, err) {
          if (err) {
            res.status(500).send('Error logging attempt')
          } else {
            if (result.permissions === 'systemAdmin' || (result.permissions === 'admin' && result.user.companyId === users.companyId) || (result.permissions === 'departmentAdmin' && result.user.companyId === users.companyId && result.user.department === users.department) || (result.permissions === 'role' && result.user.companyId === user.companyId && result.user.department === user.department && result.role.users.read === true)) {
              res.send(user);
            } else {
              res.status(401).send('unauthorized');
            }
          }
        })
      })
    }
  })
})

router.put("/mass", passport.authenticate('jwt', { session: false }), (req, res) => {
  var usersArray = req.body.users
  var length
  function loop (i, usersArray) {
    i = i || 0
    length = usersArray.length
    if (i < length) {
      if (usersArray[i]._id === '') {
        var newUser = new User({
          email: usersArray[i].email,
          password: 'default',
          title: usersArray[i].title,
          firstName: usersArray[i].firstName,
          lastName: usersArray[i].lastName,
          address: usersArray[i].address,
          phone: usersArray[i].phone,
          role: usersArray[i].role,
          location: usersArray[i].location,
          shift: usersArray[i].shift,
          department: usersArray[i].department,
          companyId: usersArray[i].companyId,
          departmentAdmin: usersArray[i].departmentAdmin,
          admin: usersArray[i].admin,
          systemAdmin: usersArray[i].systemAdmin,
          endpointARN: usersArray[i].endpointARN,
          platform: usersArray[i].platform
        })
        newUser.save(function (err, user) {
            if (err) {
              console.log(err)
            }
            i++
            loop(i, usersArray)
        });
      } else {
        User.findOne({"_id": usersArray[i]._id}, function (err, user) {
          user.email = usersArray[i].email || user.email;
          user.title = usersArray[i].title || user.title;
          user.firstName = usersArray[i].firstName || user.firstName;
          user.lastName = usersArray[i].lastName || user.lastName;
          user.address = usersArray[i].address || user.address;
          user.phone = usersArray[i].phone || user.phone;
          user.role = usersArray[i].role || user.role;
          user.location = usersArray[i].location || user.location;
          user.shift = usersArray[i].shift || user.shift;
          user.department = usersArray[i].department || user.department;
          user.companyId = usersArray[i].companyId || user.companyId;
          if (usersArray[i].departmentAdmin === true || usersArray[i].departmentAdmin === false) {
            user.departmentAdmin = usersArray[i].departmentAdmin;
          }
          if (usersArray[i].admin === true || usersArray[i].admin === false) {
            user.admin = usersArray[i].admin;
          }
          if (usersArray[i].systemAdmin === true || usersArray[i].systemAdmin === false) {
            user.systemAdmin = usersArray[i].systemAdmin;
          }
          user.save(function (err, user) {
              if (err) {
                console.log(err)
              }
              i++
              loop(i, usersArray)
          });
        })
      }
    } else {
      res.send('success')
    }
  }
  loop(0, usersArray)
})

//todo add roles validation to self put method
router.put("/self/:id", passport.authenticate('jwt', { session: false }), (req, res) => {
  var userid = new mongodb.ObjectID(req.params["id"]);
  User.find({"_id": userid},function (err, user) {
    if (err) {
        res.status(500).send(err);
    } else {
      var user = user[0];
      user.email = req.body.email || user.email;
      user.password = req.body.password || user.password;
      user.title = req.body.title || user.title;
      user.firstName = req.body.firstName || user.firstName;
      user.lastName = req.body.lastName || user.lastName;
      user.address = req.body.address || user.address;
      user.phone = req.body.phone || user.phone;
      user.role = req.body.role || user.role;
      user.roleName = req.body.roleName || user.roleName;
      user.location = req.body.location || user.location;
      user.locationName = req.body.locationName || user.locationName;
      user.shift = req.body.shift || user.shift;
      user.shiftName = req.body.shiftName || user.shiftName;
      user.department = req.body.department || user.department;
      user.departmentName = req.body.departmentName || user.departmentName;
      user.companyId = req.body.companyId || user.companyId;
      user.companyName = req.body.companyName || user.companyName;
      user.departmentAdmin = req.body.departmentAdmin || user.departmentAdmin;
      user.admin = req.body.admin || user.admin;
      user.systemAdmin = req.body.systemAdmin || user.systemAdmin;
      user.endpointARN = req.body.endpointARN || user.endpointARN;
      user.platform = req.body.platform || user.platform;
      user.save(function (err, user) {
          if (err) {
            res.status(500).send(err)
          }
          res.send(user);
      });
    }
  })
})

router.put("/subscribe/:id", passport.authenticate('jwt', { session: false }), (req, res) => {
  var userid = new mongodb.ObjectID(req.params["id"]);
  function subscribe (platform, platformARN, callback) {
    var SNS = require('sns-mobile');
    var myApp = new SNS({
      platform: platform,
      region: 'us-west-1',
      apiVersion: '2010-03-31',
      accessKeyId: SNS_ACCESS_KEY,
      secretAccessKey: SNS_KEY_ID,
      platformApplicationArn: platformARN
    });
    myApp.addUser(req.body.token, null, function(err, endpointArn) {
      // SNS returned an error
      if(err) {
        console.log(err);
        callback('error', err)
      } else {
        callback(endpointArn)
      }
    })
  }
  User.find({"_id": userid},function (err, user) {
    if (err) {
        res.status(500).send(err);
    } else {
      var user = user[0];
      if (req.body.android === true) {
        subscribe('android', ANDROID_ARN, function (arn, err) {
          if (err) {
            console.log(err)
          } else {
            user.endpointARN = arn
            user.platform = 'android'
            user.save(function (err, user) {
                if (err) {
                  res.status(500).send(err)
                }
                res.send(user);
                console.log(userid, req.body.token, req.body.android, user)
            });
          }
        })
      } else {
        subscribe('ios', IOS_ARN, function (arn, err) {
          if (err) {
            console.log(err)
          } else {
            user.endpointARN = arn
            user.platform = 'ios'
            user.save(function (err, user) {
                if (err) {
                  res.status(500).send(err)
                }
                res.send(user);
            });
          }
        })
      }
    }
  })
})

router.delete("/:id/:adminId", passport.authenticate('jwt', { session: false }), (req, res) => {
  var userid = new mongodb.ObjectID(req.params["id"]);
  var adminId = req.params["adminId"];
  User.find({"_id": userid},function (err, user) {
    if (err) {
        res.status(500).send(err);
    } else {
      Validate.permissions(adminId, function(result) {
        Validate.log({
          method: 'delete',
          object: 'user',
          endpoint: '/:id/:adminId',
          time: new Date(),
          adminId: adminId,
          ip: req.connection.remoteAddress
        }, function(log, err) {
          if (err) {
            res.status(500).send('Error logging attempt')
          } else {
            if (result.permissions === 'systemAdmin' || (result.permissions === 'admin' && result.user.companyId === user.companyId) || (result.permissions === 'departmentAdmin' && result.user.companyId === user.companyId && result.user.department === user.department) || (result.permissions === 'role' && result.user.companyId === user.companyId && result.user.department === user.department && result.role.users.delete === true)) {
              User.find({"_id": userid}).remove().then(() => {
                res.send("success");
              })
            } else {
              res.status(401).send('unauthorized');
            }
          }
        })
      })
    }
  });
})

module.exports = router;
