const db = require("../models");
const fs = require("fs");
const result = require("../helps/result.helps");
const User = db.user;
var bcrypt = require("bcryptjs");
const Resize = require('../helps/resizeImage.help');
const path = require('path');
const config = require("../config/auth.config");

/* Get All On System -----------------------------------------*/
exports.getAllUser = (req, res) => {
  User.find({},'fullname username _id avatar email status').exec((err, users) => {
    if (err) {
      result.ServerError(res,err);
      return;
    }
    if (users) result.Ok(res,{users:users});
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

/* Find User By string -------------------------------------*/
exports.findUser = (req, res) => {
  User.find({
    $or: [ 
      {username: new RegExp(req.body.search_string, "i") },
      {email: new RegExp(req.body.search_string, "i")},
      {fullname: new RegExp(req.body.search_string, "i")} 
    ]

  },'fullname username _id avatar email status').exec((err, users) => {
    if (err) {
      result.ServerError(res, err);
      return;
    }
    
    result.Ok(res,{users:users});
  });
};


exports.editUser = (req, res) =>{
  User.findById(req.userId).exec((err, user) => {
    if (err) {
      result.ServerError(res,err)
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
    if(req.body.dateOfBirth){
      user.dateOfBirth = req.body.dateOfBirth;
    }
   
    user
      .save()
      .then((newUser) => {
        newUser.password = null;
        result.Ok(res,{user:newUser});
      })
      .catch((err) => {
        result.ServerError(res,err);
      });
  });
}

/* Forgot Password -------------------------------------*/
exports.forgotPassword = (req, res) => {
  User.findOne({
      username:req.body.username,
      email:req.body.email
    }).exec((err, user) => {
    if (err) {
      result.ServerError(res,err)
      return;
    }
    if(user){
      let newPassword = Math.random().toString(36).slice(-8);
      user.password = bcrypt.hashSync(newPassword, 8);
      user.save()
        .then(() =>{
          result.Ok(res, {password: newPassword});
        })
        .catch(err=>{
          result.ServerError(res,err)
        })
      
    }else{
      result.NotFound(res,'Thông tin khôi phục mật khẩu không chính xác')
    }
  });  
  
}

/* Change Password -------------------------------------*/
exports.changePassword = (req, res) => {
  User.findOne({
      _id: req.userId
    }).exec((err, user) => {
    if (err) {
      result.ServerError(res,err)
      return;
    }
    if(user){
      var passwordIsValid = bcrypt.compareSync(req.body.oldPassword, user.password);
      if (!passwordIsValid) {
        result.BadRequest(res,'Sai mật khẩu cũ');
        return;
      }
      user.password = bcrypt.hashSync(req.body.newPassword, 8);
      user.save()
        .then(() =>{
          result.Ok(res, {password: req.body.newPassword});
        })
        .catch(err=>{
          result.ServerError(res,err)
        })
      
    }else{
      result.NotFound(res,'Không thể tìm thấy tài khoản')
    }
  });  
}


/* Upload Avatar -------------------------------------*/
exports.uploadAvatar = function(req, res){
  User.findById(req.userId).exec((err,user)=>{
    if (err) {
      result.ServerError(res,err)
      return;
    }
    if(user){
      let userAvatar = user.avatar.slice(user.avatar.lastIndexOf('/')+1,user.avatar.length);
      if(userAvatar != config.avatarDefault){
        fs.unlink('./uploads/UserAvatar/'+userAvatar, (err) => {});
      }
      const imagePath = path.join(__dirname, '../../uploads/UserAvatar');
      const fileUpload = new Resize(imagePath);
      if (!req.file) {
          result.BadRequest(res,'Không tìm thấy file upload');
          return;
      }
      fileUpload.save(req.file.buffer).then(filename =>{
        user.avatar = config.baseUrl+"api/user/avatar/"+ filename;
        user.save()
        .then(()=>{
          user.password = null;
          result.Ok(res,{user:user});
        })
        .catch(err =>{
          result.ServerError(res,err);
        });
      })
    }

  })
  
}