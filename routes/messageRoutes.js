const express = require("express");
const router = express.Router();
const mongoose = require("mongoose");
const User = mongoose.model("User");
const Message = mongoose.model("Message");
const jwt = require("jsonwebtoken");
const bycrypt = require("bcrypt");
require("dotenv").config();
const nodemailer = require("nodemailer");

router.post("/savemessagetodb", async (req, res) => {
  const { senderid, message, roomid, recieverid } = req.body;
  try {
    const newmessage = new Message({
      senderid,
      message,
      roomid,
      recieverid,
    });
    await newmessage.save();
    res.send({ message: "Message Saved successfully" });
  } catch (err) {
    console.log("ERROR WHILE SAVING MESSAGE TO DB LINE 18", err);
    res.status(422).send(err.message);
  }
});
router.post("/getmessages", async (req, res) => {
  const { roomid } = req.body;
  console.log("ROOM ID RECEIVED", roomid);
  Message.find({ roomid: roomid })
    .then((messages) => {
      res.status(200).send(messages);
    })
    .catch((err) => {
      console.log(err);
    });
});
router.post("/setusermessages", async (req, res) => {
  const { ouruserid, fuserid, lastmessage, roomid } = req.body;
  User.findOne({ _id: ouruserid })
    .then((user) => {
      user.allmessages.map((item) => {
        if (item.fuserid == fuserid) {
          user.allmessages.pull(item.fuserid);
        }
      });
      const date = Date.now();
      user.allmessages.push({
        ouruserid,
        fuserid,
        lastmessage,
        roomid,
        date,
      });
      user.save();
      res.status(200).send({ message: "Message saved successfully" });
    })
    .catch((err) => {
      console.log("error updating all chats line err", err);
      res.status(422).send(err.message);
    });
});
router.post("/getusermessages", async (req, res) => {
  const { userid } = req.body;
  User.findOne({ _id: userid })
    .then((user) => {
      res.send(user.allmessages);
    })
    .catch((err) => {
      console.log("error getting all chats line 89", err);
      res.status(422).send(err.message);
    });
});
module.exports = router;
