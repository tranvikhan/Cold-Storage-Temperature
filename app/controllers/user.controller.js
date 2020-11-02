const db = require("../models");
const fs = require("fs");
const User = db.user;
exports.getAllUser = (req, res) => {
  User.find({}).exec((err, user) => {
    if (err) {
      res.status(400).send({ messageError: err });
      return;
    }
    if (user) res.status(200).json(user);
  });
};
exports.getAvatar = (req, res) => {
  try {
    fs.readFile("./uploads/UserAvatar/" + req.params.filename, function (
      err,
      data
    ) {
      if (err) {
        res.status(404).send("Not Found");
      } else {
        res.writeHead(200, { "Content-Type": "image/jpeg" });
        res.end(data); // Send the file data to the browser.
      }
    });
  } catch (err) {
    res.status(404).send(err);
  }
};
exports.findUser = (req, res) => {
  User.find({
    username: new RegExp(req.body.username, "i"),
  }).exec((err, user) => {
    if (err) {
      res.status(400).send({ messageError: err });
      return;
    }
    res.status(200).send(user);
  });
};
exports.editUser = (req, res) =>{
  User.findById(req.userId).exec((err, user) => {
    if (err) {
      res.status(400).send({ messageError: err });
      return;
    }
    if(req.body.fullname){
      user.fullname = req.body.fullname;
    }
    if(req.body.phone){
      user.phone = req.body.phone;
    }
    if(req.body.gender){
      user.gender = req.body.gender;
    }
    if(req.body.address){
      user.address = req.body.address;
    }
    if(req.body.avatar){
      user.avatar = req.body.avatar;
    }
    console.log(user);
    user
      .save()
      .then(() => {
        res.status(200).send({ message: "Edit Success" });
      })
      .catch((err) => {
        res.status(400).send({ messageError: err });
      });
  });
}
