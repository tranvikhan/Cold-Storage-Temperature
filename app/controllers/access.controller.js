const db = require("../models");
const Access = db.access;
const Notification = db.notification;
const result = require("../helps/result.helps");

/* Get Room Access List-------------------------------------*/
exports.getRoomAccess = (req, res) => {
  Access.find({ user: req.userId,accepted: true },{_id:0,role:1,room:1})
    .populate("room",'name _id')
    .exec((err, accesses) => {
      if (err) {
        result.ServerError(res,err);
        return;
      }
      result.Ok(res,{accesses:accesses});
    });
};


/* Get User Access List-------------------------------------*/
exports.getUserAccess = (req, res) => {
  Access.find({ room: req.body.room_id},{_id:0,role:1,room:1,accepted:1})
    .populate("user",'fullname avatar _id  username email')
    .exec((err, accesses) => {
      if (err) {
        result.ServerError(res,err);
        return;
      }
      result.Ok(res,{accesses:accesses});
    });
};

/* Add Room Access -------------------------------------*/
exports.addAccess = (req, res) => {
  const newAccess = new Access({
    room: req.body.room_id,
    user: req.body.user_id,
    role: req.body.role,
  });
  newAccess
    .save()
    .then((access) => {
      const newNotification = new Notification({
        user: req.body.user_id,
        content: "Lời mời cộng tác",
        type:"Access-Invite",
        ref:"Access",
        obj_id: access._id
      });
      newNotification.save().then((notification)=>{
        req.io.to('user'+notification.user).emit('notification', {message:'add',data:notification});
        req.io.to('room'+access.room).emit('access',{message:'invite',data:{access}})
        result.Ok(res,{access:access});
        
      }).catch(err=>{
        result.ServerError(res,err);
      })
      
    })
    .catch((err) => {
      result.ServerError(res,err);
    });
};


/* Edit Room Access -------------------------------------*/
exports.editAccess = (req, res) => {
  Access.findById(req.body.access_id).exec((err, access) => {
    if (err) {
      result.ServerError(res,err);
      return;
    }
    access.role = req.body.role;
    access
      .save()
      .then(() => {
        req.io.to('room'+access.room).emit('access',{message:'edit',data:{access}})
        result.ServerError(res,{access:access});
      })
      .catch((err) => {
        result.ServerError(res,err);
      });
  });
};


/* Delete Room Access -------------------------------------*/
exports.deleteAccess = (req, res) => {
  Access.findById(req.body.access_id).exec((err,access) => {
    if (err) {
      result.ServerError(res,err);
      return;
    }
    if(access){
      Access.deleteOne({_id:access._id}).exec((err2)=>{
        if (err2) {
          result.ServerError(res,err);
          return;
        }
        req.io.to('room'+access.room).emit('access',{message:'delete',data:{access}})
        result.Ok(res,'Xóa thành công');
      })
    }else{
      result.NotFound(res,'Không tìm thấy')
    }
    
  });
};


/* Reply Room Access -------------------------------------*/
exports.replyAccess = (req,res)=>{
  if(req.body.accepted!=null && req.body.accepted){
    // Chap nhan
    Access.findById(req.body.access_id).exec((err, access) => {
      if (err) {
        result.ServerError(res,err);
        return;
      }
      if(access){
        access.accepted = req.body.accepted;
        access
          .save()
          .then((newAccess) => {
            req.io.to('user'+access.user).emit('access',{message:'add',data:{newAccess}})
            req.io.to('room'+access.room).emit('access',{message:'accepted',data:{newAccess}})
            result.Ok(res,{access:newAccess});
          })
          .catch((err) => {
            result.ServerError(res,err);
          });
      }else{
        result.NotFound(res,'Không tìm thấy yêu cầu cấp quyền này');
      }
      
    });
  }else{

    // Tu choi
    Access.deleteOne({ _id: req.body.access_id }).exec((err) => {
      if (err) {
        result.ServerError(res,err);
        return;
      }
      result.Ok(res,'Từ chối thành công');
    });
  }
  
}