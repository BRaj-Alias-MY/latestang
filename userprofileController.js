let app = require ('express');
let router = app.Router ();
let userprofile = require ('../models').user_profile;
let userprofile_edu = require ('../models').user_profile_edu;
let userprofile_exp = require ('../models').user_profile_exp;
let sequelize = require ('../models').sequelize;
const Op = sequelize.Op;

var multer = require ('multer');
const path = require ('path');
//var upload = multer({ dest: 'uploads/' })

let storage = multer.diskStorage ({
  destination: (req, file, cb) => {
    cb (null, './uploads/');
  },
  filename: (req, file, cb) => {
    cb (
      null,
      file.fieldname +
        '-' +
        Date.now () +
        '.' +
        path.extname (file.originalname)
    );
  },
});
let upload = multer ({storage: storage});

router.post ('/upload', upload.single ('doc'), (req, res) => {
  console.log (req);
  if (!req.file) {
    console.log ('No file received');
    return res.send ({
      success: false,
    });
  } else {
    console.log ('file received');
    return res.send ({
      success: true,
    });
  }
});

router.get ('/', (req, res) => {
  if (req.auth.access.gridAccess) {
    userprofile
      .findAll ()
      .then (user => {
        if (user) {
          res.send ({status: true, data: user, access: req.auth.access});
        } else {
          res.send ({status: false, message: 'fail'});
        }
      })
      .catch (function (error) {
        res.status (500).send ('Internal Server Error');
      });
  } else {
    res.send ({
      status: false,
      message: 'Un Authroized',
      access: [req.auth.access],
    });
  }
});

router.post ('/', (req, res) => {
  userprofile
    .findOne ({where: {about: req.body.about}})
    .then (user => {
      if (user) {
        res.send ({status: false, message: 'Data Already Exist.'});
      } else {
        //============= insert query =====================
        /* userprofile.afterCreate(function(model, options, done) {//hook1 resume
                  model.auth = req.auth ? req.auth.userId : 0;
              });*/
        let user_data = req.body;
        userprofile
          .create (
            {
              about: user_data.about,
              adress: user_data.address,
              pincode: user_data.pincode,
              linkedinId: user_data.linkedin,
              resume: user_data.resume,
              userId: req.auth.userId,
            },
            {transaction: t}
          )
          .then (async pro => {
            for (let i = 0; i < user_data.edu.length; i++) {
              await userprofile_edu.afterCreate (function (
                model,
                options,
                done
              ) {
                //hook1
                model.auth = req.auth ? req.auth.userId : 0;
              });
              await userprofile_edu
                .create (
                  {
                    userProfileId: pro.id,
                    education: user_data.edu[i].educationname,
                    university: user_data.edu[i].university,
                    courseFrom: user_data.edu[i].coursefrom,
                    courseTo: user_data.edu[i].courseto,
                    specilization: user_data.edu[i].specialization,
                    grade: user_data.edu[i].grade,
                  },
                  {transaction: t}
                )
                .then (async pro => {
                  for (let i = 0; i < user_data.exp.length; i++) {
                    await userprofile_edu.afterCreate (function (
                      model,
                      options,
                      done
                    ) {
                      //hook1
                      model.auth = req.auth ? req.auth.userId : 0;
                    });
                    await userprofile_exp.create (
                      {
                        userProfileId: pro.id,
                        organizationName: user_data.exp[i].organizationame,
                        desgination: user_data.exp[i].designation,
                        joinedDate: user_data.exp[i].joineddate,
                        relivedDate: user_data.exp[i].reliveddate,
                      },
                      {transaction: t}
                    );
                  }
                  return true;
                })
                .then (result => {
                  res.send ({status: true, message: 'Success'});
                })
                .catch (err => {
                  res.send ({status: false, message: 'fail'});
                });
            }
            return true;
          })
          .then (result => {
            res.send ({status: true, message: 'Success'});
          })
          .catch (err => {
            res.send ({status: false, message: 'fail'});
          });
      }
    })
    .catch (function (error) {
      console.log (error);
      res.status (500).send ('Internal Server Error');
    });
});

router.post ('/profilesave', (req, res) => {
  userprofile
    .findOne ({where: {userId: req.auth.userId}})
    .then (profileData => {
      let userData = req.body;
      userData['userId'] = req.auth.userId;
      if (profileData) {
        //============= update data =========================
        userprofile
          .update (userData, {where: {id: profileData.id}})
          .then (data => {
            userData['id'] = profileData.id;
            res.send ({status: true, response: 'success', data: userData});
          })
          .catch (err => {
            res.send ({status: false, message: 'fail'});
          });
      } else {
        //============= insert data ========================
        userprofile
          .create (userData)
          .then (data => {
            res.send ({status: true, response: 'success', data: data});
          })
          .catch (err => {
            res.send ({status: false, message: 'fail'});
          });
      }
    })
    .catch (err => {
      console.log (err);
      res.send ({status: false, message: 'fail'});
    });
});

router.post ('/saveprofile2', (req, res) => {
  sequelize
    .query ('delete from user_profile where userId=' + req.body.userId, {
      type: sequelize.QueryTypes.DELETE,
    })
    .then (data => {
      sequelize
        .query (
          "insert into user_profile(userId,about,adress,pincode,linkedinId,resume) values('" +
            req.body.userId +
            "','" +
            req.body.about +
            "','" +
            req.body.adress +
            "','" +
            req.body.pincode +
            "','" +
            req.body.linkedinId +
            "','" +
            req.body.resume +
            "')",
          {type: sequelize.QueryTypes.INSERT}
        )
        .then (data => {
          if (data) {
            res.send ({status: true});
          } else {
            res.send ({status: true});
          }
        });
    })
    .catch (err => {
      res.send ('unable to access');
    });
});

router.post ('/saveedu2', (req, res) => {
  console.log (req);
  sequelize
    .query (
      "insert into user_profile_edu(userProfileId,education,university,courseFrom,courseTo,specilization,grade) values('" +
        req.body.userProfileId +
        "','" +
        req.body.education +
        "','" +
        req.body.university +
        "','" +
        req.body.courseFrom +
        "','" +
        req.body.courseTo +
        "','" +
        req.body.specilization +
        "','" +
        req.body.grade +
        "')",
      {type: sequelize.QueryTypes.INSERT}
    )
    .then (data => {
      if (data) res.send ({message: 'Inserted'});
      else res.send ({message: 'Not Inserted !'});
    })
    .catch (err => {
      res.send ('unable to access');
    });
});

router.post ('/saveexp2', (req, res) => {
  console.log (req);
  sequelize
    .query (
      "insert into  user_profile_exp(userProfileId,organizationName,desgination,joinedDate,relivedDate) values('" +
        req.body.userProfileId +
        "','" +
        req.body.organizationName +
        "','" +
        req.body.desgination +
        "','" +
        req.body.joinedDate +
        "','" +
        req.body.relivedDate +
        "')",
      {type: sequelize.QueryTypes.INSERT}
    )
    .then (data => {
      if (data) res.send ({message: 'Inserted'});
      else res.send ({message: 'Not Inserted !'});
    })
    .catch (err => {
      res.send ('unable to access');
    });
});

router.get ('/getedu', (req, res) => {
  console.log (req);
  sequelize
    .query (
      'select   * from user_profile_edu group by education order by id desc',
      {
        type: sequelize.QueryTypes.SELECT,
      }
    )
    .then (data => {
      if (data) res.send (data);
      else res.send ({message: 'no data !'});
    })
    .catch (err => {
      res.send ('unable to access');
    });
});


router.get ('/getprofile/:userId', (req, res) => {
  console.log (req);
  sequelize
    .query (
      'select   * from user_profile where userId='+ req.params.userId,
      {
        type: sequelize.QueryTypes.SELECT,
      }
    )
    .then (data => {
      if (data) res.send (data);
      else res.send ({message: 'no data !'});
    })
    .catch (err => {
      res.send ('unable to access');
    });
});

router.get ('/deleteedu/:id/:education', (req, res) => {
  console.log (req);
  sequelize
    .query (
      'delete from user_profile_edu where id=' +
        req.params.id +
        " or education= '" +
        req.params.education +
        "'",
      {
        type: sequelize.QueryTypes.SELECT,
      }
    )
    .then (data => {
      if (data) res.send ({message: 'Deleted'});
      else res.send ({message: 'no data !'});
    })
    .catch (err => {
      res.send ('unable to access');
    });
});

router.get ('/deleteexp/:id/:organizationName', (req, res) => {
  console.log (req);
  sequelize
    .query (
      'delete from user_profile_exp where id=' +
        req.params.id +
        " or organizationName='" +
        req.params.organizationName +
        "'",
      {
        type: sequelize.QueryTypes.SELECT,
      }
    )
    .then (data => {
      if (data) res.send ({message: 'Deleted'});
      else res.send ({message: 'no data !'});
    })
    .catch (err => {
      res.send ('unable to access');
    });
});

router.get ('/getexp', (req, res) => {
  console.log (req);
  sequelize
    .query (
      'select * from user_profile_exp group by organizationName order by id desc',
      {
        type: sequelize.QueryTypes.SELECT,
      }
    )
    .then (data => {
      if (data) res.send (data);
      else res.send ({message: 'no data !'});
    })
    .catch (err => {
      res.send ('unable to access');
    });
});

router.post ('/saveedu', (req, res) => {
  console.log ('testing new.............');
  userprofile
    .findOne ({where: {userId: req.auth.userId}})
    .then (profileData => {
      if (profileData) {
        return sequelize
          .transaction (t => {
            userprofile_edu.afterBulkDestroy (function (options) {
              //hook1
              options.auth = req.auth ? req.auth.userId : 0;
              options.mdl = 'userprofile_edu';
            });
            return userprofile_edu
              .destroy (
                {where: {userProfileId: profileData.id}},
                {trancation: t}
              )
              .then (deldata => {
                let userdata = req.body.map ((v, i) => {
                  return {
                    userProfileId: profileData.id,
                    education: v.education,
                    university: v.university,
                    courseFrom: v.courseFrom,
                    courseTo: v.courseTo,
                    specilization: v.specilization,
                    grade: v.grade,
                  };
                });
                return userprofile_edu.bulkCreate (userdata, {transcation: t});
              })
              .catch (err => {
                res.send ({status: false, message: 'fail'});
              });
          })
          .then (result => {
            res.send ({status: true, message: 'success'});
          })
          .catch (err => {
            console.log (err);
            res.send ({status: false, message: 'fail'});
          });
      } else {
        res.send ({status: false, message: 'Please save profile first.'});
      }
    })
    .catch (err => {
      console.log (err);
      res.send ({status: false, message: 'fail'});
    });
});

router.post ('/saveexp', (req, res) => {
  userprofile
    .findOne ({where: {userId: req.auth.userId}})
    .then (profileData => {
      if (profileData) {
        return sequelize
          .transaction (t => {
            userprofile_exp.afterBulkDestroy (function (options) {
              //hook1
              options.auth = req.auth ? req.auth.userId : 0;
              options.mdl = 'userprofile_exp';
            });
            return userprofile_exp
              .destroy (
                {where: {userProfileId: profileData.id}},
                {trancation: t}
              )
              .then (deldata => {
                let userdata = req.body.map ((v, i) => {
                  return {
                    userProfileId: profileData.id,
                    organizationName: v.organizationName,
                    desgination: v.desgination,
                    joinedDate: v.joinedDate,
                    relivedDate: v.relivedDate,
                  };
                });
                return userprofile_exp.bulkCreate (userdata, {transcation: t});
              })
              .catch (err => {
                res.send ({status: false, message: 'fail'});
              });
          })
          .then (result => {
            res.send ({status: true, message: 'success'});
          })
          .catch (err => {
            console.log (err);
            res.send ({status: false, message: 'fail'});
          });
      } else {
        res.send ({status: false, message: 'Please save profile first.'});
      }
    })
    .catch (err => {
      console.log (err);
      res.send ({status: false, message: 'fail'});
    });
});

module.exports = router;
