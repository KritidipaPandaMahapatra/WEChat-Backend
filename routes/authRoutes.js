const express = require("express");
const router = express.Router();
const mongoose = require("mongoose");
const User = mongoose.model("User");
const jwt = require("jsonwebtoken");
const bycrypt = require("bcrypt");
require("dotenv").config();
const nodemailer = require("nodemailer");

// router.get("/home", (req, res) => {
//   console.log("Verify route called");
//   //res.send("Hello world");
//   return res.status(200).json({ message: "verify route called" });
// });
async function mailer(receiveremail, code) {
  //console.log("Mailer function called");
  let transporter = nodemailer.createTransport({
    //service: "gmail",
    host: "smtp.gmail.com",
    port: 587,
    // secure:true for 465,false for other ports
    secure: false,
    requireTLS: true,
    auth: {
      user: process.env.NodeMailer_email,
      pass: process.env.NodeMailer_password,
    },
  });
  let info = await transporter.sendMail({
    from: "WEChat",
    to: `${receiveremail}`,
    subject: "Email Verification",
    text: `Your Verification Code is ${code}`,
    html: `<b>Your Verification Code is ${code}</b>`,
  });
  console.log("Message sent: %s", info.messageId);
  console.log("Preview URL: %s", nodemailer.getTestMessageUrl(info));
}
//For sending verification code
router.post("/verify", (req, res) => {
  console.log("POST DATA", req.body);
  const { email } = req.body;
  if (!email) {
    return res.status(422).json({ error: "Please add all the fields" });
  } else {
    User.findOne({ email: email }).then(async (savedUser) => {
      //  console.log("SAVED USER", savedUser);
      // return res.status(200).json({ message: "Email sent" });
      if (savedUser) {
        return res.status(422).json({ error: "Invalid credentials" });
      }
      try {
        let verificationCode = Math.floor(100000 + Math.random() * 900000);
        await mailer(email, verificationCode);
        res.send({
          message: "Verification Code Sent to your Email",
          verificationCode,
          email,
        });
        console.log("Verification code->", verificationCode);
        // return res
        //   .status(200)
        //   .json({ message: "Email sent", verificationCode, email });
      } catch (error) {
        console.log("Error", error);
      }
    });
  }
});
//If username is already exists change username
router.post("/changeusername", (req, res) => {
  const { username, email } = req.body;
  User.find({ username }).then(async (savedUser) => {
    if (savedUser.length > 0) {
      return res.status(422).json({ error: "Username already exists" });
    } else {
      return res
        .status(200)
        .json({ message: "Username Available", username, email });
    }
  });
});
//For create an acoount/signup
router.post("/signup", async (req, res) => {
  const { username, password, email } = req.body;
  if (!username || !password || !email) {
    return res.status(422).json({ error: "Please add all the fields" });
  } else {
    const user = new User({
      username,
      email,
      password,
    });
    try {
      await user.save();
      const token = jwt.sign({ _id: user._id }, process.env.JWT_SECRET);
      return res
        .status(200)
        .json({ message: "User Registered successfully", token });
    } catch (error) {
      console.log(error);
      return res.status(422).json({ error: "User Not Registered" });
    }
  }
});

//Forgot Password
router.post("/verifyfp", (req, res) => {
  console.log("Sent by client", req.body);
  const { email } = req.body;
  if (!email) {
    return res.status(422).json({ error: "Please add all the fields" });
  } else {
    User.findOne({ email: email }).then(async (savedUser) => {
      if (savedUser) {
        // return res.status(422).json({ error: "Invalid credentials" });
        console.log("savedUser", savedUser);
        try {
          let verificationCode = Math.floor(100000 + Math.random() * 900000);
          await mailer(email, verificationCode);
          res.send({
            message: "Verification Code Sent to your Email",
            verificationCode,
            email,
          });
        } catch (error) {
          console.log("Error", error);
        }
      } else {
        return res.status(422).json({ error: "Invalid credentials" });
      }
    });
  }
});
//Reset Passowrd
router.post("/resetpassword", (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(422).json({ error: "Please add all the fields" });
  } else {
    User.findOne({ email: email }).then(async (savedUser) => {
      if (savedUser) {
        savedUser.password = password;
        savedUser
          .save()
          .then((user) => {
            res.json({ message: "Password changed succesfully" });
          })
          .catch((err) => {
            console.log(err);
          });
      } else {
        return res.status(422).json({ error: "Invalid credentials" });
      }
    });
  }
});
//Sign in
router.post("/signin", (req, res) => {
  const { email, password } = req.body;
  console.log("Password" + password);
  if (!email || !password) {
    return res.status(422).json({ error: "Please add all the fields" });
  } else {
    User.findOne({ email: email })
      .then((savedUser) => {
        if (!savedUser) {
          return res.status(422).json({ error: "Invalid credentials" });
        } else {
          bycrypt.compare(password, savedUser.password).then((doMatch) => {
            if (doMatch) {
              const token = jwt.sign(
                { _id: savedUser._id },
                process.env.JWT_SECRET
              );
              const { _id, username, email } = savedUser;
              res.json({
                message: "Successfully signed in",
                token,
                user: { _id, username, email },
              });
            } else {
              return res.status(422).json({ error: "Invalid credentials" });
            }
          });
          // return res.status(422).json({ message: "User logged in successfully",savedUser });
        }
      })
      .catch((err) => {
        console.log(err);
      });
  }
});
// router.post("/userData", (req, res) => {
//   const { email } = req.body;
//   User.findOne({ email: email }).then((savedUser) => {
//     if (!savedUser) {
//       return res.status(422).json({ error: "Invalid credentials" });
//     } else {
//       res
//         .status(200)
//         .json({ message: "Userdata found successfully", user: savedUser });
//     }
//   });
// });
router.post("/userData", (req, res) => {
  const { authorization } = req.headers;
  if (!authorization) {
    return res
      .status(401)
      .json({ error: "You must be logged in,token not given" });
  }
  const token = authorization.replace("Bearer ", "");
  console.log(token);
  jwt.verify(token, process.env.JWT_SECRET, (err, payload) => {
    if (err) {
      return res
        .status(401)
        .json({ error: "You must be logged in,token invalid" });
    }
    const { _id } = payload;
    User.findById(_id).then((userdata) => {
      res.status(200).send({
        message: "User Found",
        user: userdata,
      });
    });
  });
});
//Change Password
router.post("/changepassword", (req, res) => {
  const { oldpassword, newpassword, email } = req.body;
  if (!email || !oldpassword || !newpassword) {
    return res.status(422).json({ error: "Please add all the fields" });
  } else {
    User.findOne({ email: email })
      .then(async (savedUser) => {
        if (savedUser) {
          bycrypt.compare(oldpassword, savedUser.password).then((doMatch) => {
            if (doMatch) {
              savedUser.password = newpassword;
              savedUser
                .save()
                .then((user) => {
                  res.json({ message: "Password Changed Successfully" });
                })
                .catch((err) => {
                  console.log(err);
                });
            } else {
              return res.status(422).json({ error: "Invalid Credentials" });
            }
          });
        } else {
          return res.status(422).json({ error: "Server Error" });
        }
      })
      .catch((err) => {
        console.log(err);
      });
  }
});
//Update user Data
router.post("/setusername", (req, res) => {
  const { username, email } = req.body;
  if (!username || !email) {
    return res.status(422).json({ error: "Please add all the fields" });
  }
  User.find({ username }).then(async (savedUser) => {
    if (savedUser.length > 0) {
      return res.status(422).json({ error: "username already exists" });
    } else {
      User.findOne({ email: email }).then(async (savedUser) => {
        if (savedUser) {
          savedUser.username = username;
          savedUser
            .save()
            .then((user) => {
              res.json({ message: "Username Updated Successfully" });
            })
            .catch((err) => {
              return res.status(422).json({ error: "Server Error" });
            });
        } else {
          return res.status(422).json({ error: "Invalid credentials" });
        }
      });
    }
  });
});
//Update description
router.post("/setdescription", (req, res) => {
  const { description, email } = req.body;
  if (!description || !email) {
    return res.status(422).json({ error: "Please add all the fields" });
  }
  User.findOne({ email: email })
    .then(async (savedUser) => {
      if (savedUser) {
        savedUser.description = description;
        savedUser
          .save()
          .then((user) => {
            res.json({ message: "Description Updated Successfully" });
          })
          .catch((err) => {
            return res.status(422).json({ error: "Server Error" });
          });
      } else {
        return res.status(422).json({ error: "Invalid credentials" });
      }
    })
    .catch((err) => {
      return res.status(422).json({ error: "Server Error" });
    });
});
router.post("/searchuser", (req, res) => {
  const { keyword } = req.body;
  if (!keyword) {
    return res.status(422).json({ error: "Please search a username" });
  }
  User.find({ username: { $regex: keyword, $options: "i" } })
    .then((user) => {
      console.log(user);
      let data = [];
      user.map((item) => {
        data.push({
          _id: item._id,
          username: item.username,
          email: item.email,
          description: item.description,
          profilepic: item.profilepic,
        });
      });
      console.log(data);
      if (data.length == 0) {
        return res.status(422).json({ error: "No User Found" });
      }
      res.status(200).send({
        user: data,
        message: "User Found",
      });
    })
    .catch((err) => {
      res.status(422).json({ error: "server error" });
    });
});
//get user by id
router.post("/otheruserData", (req, res) => {
  const { email } = req.body;
  User.findOne({ email: email }).then((savedUser) => {
    if (!savedUser) {
      return res.status(422).json({ error: "Invalid Credentials" });
    }
    let data = {
      _id: savedUser._id,
      username: savedUser.username,
      email: savedUser.email,
      description: savedUser.description,
      profilepic: savedUser.profilepic,
      followers: savedUser.followers,
      following: savedUser.following,
      posts: savedUser.posts,
    };
    console.log(data);
    if (data.length == 0) {
      return res.status(422).json({ error: "No User Found" });
    }
    res.status(200).send({
      user: data,
      message: "User Found",
    });
  });
});
//check follow
router.post("/checkfollow", (req, res) => {
  const { followfrom, followto } = req.body;
  console.log(followfrom, followto);
  if (!followfrom || !followto) {
    return res.status(422).json({ error: "Invalid Credentials" });
  }
  User.findOne({ email: followfrom })
    .then((mainuser) => {
      if (!mainuser) {
        return res.status(422).json({ error: "Invalid Credentials" });
      } else {
        let data = mainuser.following.includes(followto);
        if (data == true) {
          res.status(200).send({
            message: "User in following list",
          });
        } else {
          res.status(200).send({
            message: "User not in following list",
          });
        }
      }
    })
    .catch((err) => {
      res.status(422).json({ error: "Server Error" });
    });
});
//follow user
router.post("/followuser", (req, res) => {
  const { followfrom, followto } = req.body;
  console.log(followfrom, followto);
  if (!followfrom || !followto) {
    return res.status(422).json({ error: "Invalid Credentials" });
  }
  User.findOne({ email: followfrom })
    .then((mainuser) => {
      if (!mainuser) {
        return res.status(422).json({ error: "Invalid Credentials" });
      } else {
        let data = mainuser.following.includes(followto);
        if (data) {
          return res.status(422).json({
            error: "Already Following",
          });
        } else {
          mainuser.following.push(followto);
          mainuser.save();
        }
        User.findOne({ email: followto }).then((otheruser) => {
          if (!otheruser) {
            return res.status(422).json({ error: "Invalid Credentials" });
          } else {
            if (otheruser.followers.includes(followfrom)) {
              return res.status(422).json({ error: "Already Following" });
            } else {
              otheruser.followers.push(followfrom);
              otheruser.save();
            }
            res.status(200).send({
              message: "User Followed",
            });
          }
        });
      }
    })
    .catch((err) => {
      res.status(422).json({ error: "Server Error" });
    });
});
//unfollow user
router.post("/unfollowuser", (req, res) => {
  const { followfrom, followto } = req.body;
  console.log(followfrom, followto);
  if (!followfrom || !followto) {
    return res.status(422).json({ error: "Invalid Credentials" });
  }
  User.findOne({ email: followfrom })
    .then((mainuser) => {
      if (!mainuser) {
        return res.status(422).json({ error: "Invalid Credentials" });
      } else {
        if (mainuser.following.includes(followto)) {
          mainuser.following.pull(followto);
          mainuser.save();
          User.findOne({ email: followto }).then((otheruser) => {
            if (!otheruser) {
              return res.status(422).json({ error: "Invalid Credentials" });
            } else {
              if (otheruser.followers.includes(followfrom)) {
                otheruser.following.pull(followfrom);
                otheruser.save();
                return res.status(200).json({ message: "User Unfollowed" });
              } else {
                return res.status(422).json({ error: "Not Following" });
              }
            }
          });
        } else {
          return res.status(422).json({ error: "Not Following" });
        }
      }
    })
    .catch((err) => {
      res.status(422).json({ error: "Server Error" });
    });
});
module.exports = router;
