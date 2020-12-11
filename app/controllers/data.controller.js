
const db = require("../models");
const axios = require('axios');
const config = require('../config/data.config');
const visualData = require('./GetSensorData/visualData');
const mailler = require("../helps/mailler.help");

const xlsxFile = require('read-excel-file/node');
const interpolationArea = require('./Interpolations/MonitorInterpolation');

const Area = db.area;
const Room = db.room;
const Structure = db.structure;
const Sensor = db.sensor;
const Activate = db.activate;
const Notification = db.notification;
const Access = db.access;

global.currentData = null;

const NoiSuyBaChieu = require('./Interpolations/cubeInterpolation').NoiSuyBaChieu;
const result = require("../helps/result.helps");


/* Demo Get Data (Dev Tool)-------------------------------*/
exports.getCubeData = (req, res) => {
    Room.findOne({_id: req.body.room_id}).exec((err,room)=>{
        if(err || !room){
            result.ServerError(res,err);
            return;
        }
        Structure.findOne({ room: room._id},'map').populate({
            path: 'map',
            populate: { path: 'sensor' }
        }).sort({"createdAt":-1}).exec((err,structure)=>{
            if(err){
                result.ServerError(res,err);
                return;
            }
            if(structure && global.currentData !=null){
                let data = new Array();
                let realtimeData;
                structure.map.map(st =>{
                    realtimeData = global.currentData.find(sensor => {
                        return sensor.data_id === st.sensor.data_id;
                    });
                    if (realtimeData != null){
                        data.push({
                            _id: st.sensor._id,
                            x: st.location.x,
                            y: st.location.y,
                            z: st.location.z,
                            value: realtimeData.data_value,
                        })
                    }
                    
                })
                if(realtimeData != null && data.length>0){
                    result.Ok( res, {
                        cubeData:NoiSuyBaChieu([...data],room),
                        time: realtimeData.data_createdDate
                    });
                }else{
                    result.NotFound(res,'Không có dữ liệu')
                }
                
            }else{
                result.NotFound(res,'Không có dữ liệu')
            }
            
        });
    })
    
};

exports.getAreaData = (req, res) =>{
    Room.findById(req.body.room_id).exec((err,room)=>{
        if(err){
            console.log(err);
            return;
        }
        if(room){
            Structure.findOne({ room: room._id}).populate({
                path: 'map',
                populate: { path: 'sensor' }
                }).sort({"createdAt":-1}).exec((err,structure)=>{
                if(err){
                    console.log(err);
                    return;
                }
                if(structure !=null && global.currentData != null){
                    let data = new Array();
                    let realtimeData;
                    let areaThemp;
                    structure.map.map(st =>{
                        realtimeData = global.currentData.find(sensor => {
                            return sensor.data_id === st.sensor.data_id;
                        });
                        data.push({
                            _id: st.sensor._id,
                            datatype_id: st.sensor.datatype_id,
                            data_id: st.sensor.data_id,
                            x: st.location.x,
                            y: st.location.y,
                            z: st.location.z,
                            value: realtimeData.data_value,
                            status: (realtimeData.data_value >99)?"OFF":((st.sensor.isUsed)?"RUNNING":"ON")
                        })
                    })
                    
                    Area.find({room:room._id}).exec((err,areas)=>{
                        if(err){
                            console.log(err);
                            return;
                        }
                        if(areas!=null && areas.length>0 && data.length>0){
                            //console.log(data,room,areas);
                            areaThemp = interpolationArea.Get(data,room,areas);
                            areaThemp = areaThemp.map(area => ({_id:area._id,name: area.name,value: area.average}))
                            result.Ok(res,{areas: areaThemp,time: realtimeData.data_createdDate});
                        }else{
                            result.NotFound(res,'Không có dữ liệu');
                        }
                    })
                }else{
                    result.NotFound(res,'Không có dữ liệu');
                }
            });
        }else{
            result.NotFound(res,'Không có dữ liệu');
        }
            
    })
}

/* Get Current Data-------------------------------------*/
exports.getCurrent = (req, res) => {
    Structure.findOne({ room: req.body.room_id},'map').populate({
        path: 'map',
        populate: { path: 'sensor' }
    }).sort({"createdAt":-1}).exec((err,structure)=>{
        if(err){
            result.ServerError(res,err);
            return;
        }
        if(structure && global.currentData !=null){
            let data = new Array();
            let realtimeData;
            structure.map.map(st =>{
                realtimeData = global.currentData.find(sensor => {
                    return sensor.data_id === st.sensor.data_id;
                });
                if (realtimeData != null){
                    data.push({
                        _id: st.sensor._id,
                        datatype_id: st.sensor.datatype_id,
                        data_id: st.sensor.data_id,
                        x: st.location.x,
                        y: st.location.y,
                        z: st.location.z,
                        value: realtimeData.data_value,
                        status: (realtimeData.data_value >99)?"OFF":((st.sensor.isUsed)?"RUNNING":"ON")
                    })
                }
                
            })
            if(realtimeData != null && data.length>0){
                result.Ok( res, {room:req.body.room_id,datas:data,time: realtimeData.data_createdDate});
            }else{
                result.NotFound(res,'Không có dữ liệu')
            }
            
        }else{
            result.NotFound(res,'Không có dữ liệu')
        }
        
    });
};

/* get Sensor(activated) data-------------------------------------*/
exports.getSensorData = (req,res)=>{
    Activate
    .find({room: req.body.room_id})
    .exec((err,activates)=>{
        if(err){
            result.ServerError(res,err);
            return;
        }
        if(activates.length>0){
            activates.map(activate=>{
                Sensor
                .find({ activate:activate._id})
                .exec((err,sensors)=>{
                    if(err){
                        result.ServerError(res,err);
                        return;
                    }
                    if(sensors){
                        if(global.currentData  != null){
                            let data = new Array();
                            let realtimeData;
            
                            sensors.map(sensorX=>{
                                realtimeData = global.currentData.find(sensor => {
                                    return sensor.data_id === sensorX.data_id;
                                });
                                data.push({
                                    _id: sensorX._id,
                                    datatype_id: sensorX.datatype_id,
                                    data_id: sensorX.data_id,
                                    value: realtimeData.data_value,
                                    name: sensorX.name,
                                    status: (realtimeData.data_value >99)?"OFF":((sensorX.isUsed)?"RUNNING":"ON")
                                })
                            });
                            result.Ok(res,{
                                room: req.body.room_id,
                                datas: data,
                                time: realtimeData.data_createdDate
                            });
                        }else{
                            result.NotFound(res,'Không có dữ liệu');
                        }
                        
                    }else{
                        result.NotFound(res,"Không tìm thấy danh sách cảm biến")
                    }
                })
            })
        }else{
            result.NotFound(res,'Không có dữ liệu');
        }
    })
}




/* set Realtime Data -------------------------------------*/
exports.setRealtimeData =(io)=>{
    global.apiMode = config.mode;
    if(process.env.MODE_API !="fake"){
        RealData(null,null,io);
    }else{
        xlsxFile('./app/controllers/GetSensorData/Data11.xlsx').then(rows =>{
            FakeData(rows,io,1);
        })
        
    } 
}

/* Real Data -------------------------------------*/
const RealData = (old_activates,sensorsDB,io)=>{
    if(global.activate_trigger ==1){
        global.activate_trigger =0;
        Activate
        .find()
        .exec((err,activates)=>{
            if(err){
                console.log(err);
                return;
            }
            Sensor.find().exec((err,sensorsDB)=>{
                if(err){
                    console.log(err);
                    return;
                }
                if(sensorsDB) global.currentData = null;

                old_activates =
                activates.map(activate=>{ 
                    let axios_rs = 
                    axios
                    .post(config.real.baseURL+config.real.api.login,
                    {
                        username: activate.api.username,
                        password: activate.api.password,
                        grant_type: config.real.loginInfo.grant_type
                    })
                    .then(user =>{
                        return user.data;
                    })
                    .catch(err=>{
                        console.log(err);
                    })
                    return {...activate._doc,token:axios_rs};     
                })    
                RealData(old_activates,sensorsDB,io);
            })
           
        }) 
    }else{
        if(old_activates.length>0){
            new_activates = old_activates.map(activate=>{
                let temp =
                activate.token.then(user=>{
                    return {...user,sensors:
                    axios
                    .get(config.real.baseURL+config.real.api.getValue+activate.station_id,
                        { 'headers': 
                            { 'Authorization': 'JWT '+ user.accessToken} 
                        }
                    )
                    .then(sensors =>{
                        return sensors.data;
                    })
                    }
                })
                return temp;
            })
            let a =0;
            new_activates.map(activate=>{
                activate.then(data=>{
                    data.sensors.then(sensors=>{
                        save_data(sensorsDB,sensors.data,io);
                        a = a+1;
                        if(a== new_activates.length){
                            RealData(old_activates,sensorsDB,io);
                        }
                    })
                })
            })
        }else{
            setTimeout(()=>{
                RealData(old_activates,sensorsDB,io);
            },5000);
            
        }   
        
    }
    
}
const save_data = (sensorsDB,sensors,io) =>{
        if(global.currentDat ==null) global.currentData = sensorsDB;
        global.currentData = global.currentData.map(sr=>{
            let  dataCurrent =  sensors.find(s=>(s.data_id == sr.data_id));
            return {...sr._doc,
                data_value: (dataCurrent)?dataCurrent.data_value:null,
                data_createdDate: (dataCurrent)?dataCurrent.data_createdDate:null
            }
        })
        sendDataToRoom(io);
}


/* Fake Data -------------------------------------*/
const FakeData = (rows,io,index)=>{
    Sensor.find().exec((err,sensorsDB)=>{
        if(err){
            console.log(err);
            return;
        }
        if(sensorsDB.length>0){
            var newIndex;
            if(index < (config.fake.rowsFake-1)*18)
            {
                newIndex = index+18;
            }else{
                newIndex =1;
            }
            //VISUAL DATA
            let data = visualData.Get(rows,index).data;
            save_data(sensorsDB,data,io);    
        }
        setTimeout(()=>{
            FakeData(rows,io,newIndex);
        },10000); 
        
    });
}



const sendDataToRoom = (io)=>{
    Room.find({}).exec((err,rooms)=>{
        if(err){
            console.log(err);
            return;
        }
        rooms.map((room)=>{
            Structure.findOne({ room: room._id}).populate({
            path: 'map',
            populate: { path: 'sensor' }
            }).sort({"createdAt":-1}).exec((err,structure)=>{
            if(err){
                console.log(err);
                return;
            }
            if(structure !=null && global.currentData != null){
                let data = new Array();
                let realtimeData;
                let areaThemp;
                structure.map.map(st =>{
                    realtimeData = global.currentData.find(sensor => {
                        return sensor.data_id === st.sensor.data_id;
                    });
                    data.push({
                        _id: st.sensor._id,
                        datatype_id: st.sensor.datatype_id,
                        data_id: st.sensor.data_id,
                        x: st.location.x,
                        y: st.location.y,
                        z: st.location.z,
                        value: realtimeData.data_value,
                        status: (realtimeData.data_value >99)?"OFF":((st.sensor.isUsed)?"RUNNING":"ON")
                    })
                })
                if(realtimeData){
                    io.to('room'+room._id).emit('data_room',{room:room._id,datas: data,time: realtimeData.data_createdDate});
                    io.to('room'+room._id).emit('data_cube_room',{room:room._id,
                                                            cubeData:NoiSuyBaChieu([...data],room),
                                                            time: realtimeData.data_createdDate
                                                            });
                }
                

                Area.find({room:room._id}).exec((err,areas)=>{
                    if(err){
                        console.log(err);
                        return;
                    }
                    if(areas!=null && areas.length>0 && data.length>0){
                        //console.log(data,room,areas);
                        areaThemp = interpolationArea.Get(data,room,areas);
                        console.log(areaThemp);
                        
                        io.to('room'+room._id).emit('data_area',{room:room._id,areas:areaThemp ,time: realtimeData.data_createdDate});
                        
                        areaThemp.map(area=>{
                            if(area.monitorOn){
                                area.monitors.map(monitor=>{
                                    let isTimeChecked = checkTime(realtimeData.data_createdDate,monitor.times);
                                    
                                    if(isTimeChecked && monitor.active && (area.average < monitor.temperature.min || area.average > monitor.temperature.max)){
                                        let type = (area.average < monitor.temperature.min)?'WARRING_LOW_TEMPERATURE':'WARRING_HIGH_TEMPERATURE';
                                        Access.find({ room: area.room},{_id:0,role:1,room:1,accepted:1})
                                        .populate("user",'fullname avatar _id  username email')
                                        .exec((err, accesses) => {
                                        if (err) {
                                            return;
                                        }
                                        if(accesses.length>0){
                                            accesses.map(access =>{
                                                Notification.findOne({user:access.user._id,obj_id:area._id,type:type,ref:'Area'}).sort({"createdAt":-1}).exec((err,notification)=>{
                                                    if(err){
                                                        return;
                                                    }
                                                    if(notification){
                                                        let notificationHouse = new Date(notification.createdAt);
                                                        let currentTime = new Date();
                                                        if((currentTime - notificationHouse)/1000/60 > 59){
                                                            let newNotification = new Notification({
                                                                user:access.user._id,
                                                                ref:'Area', 
                                                                content:'Cảnh báo nhiệt độ khu vực '+ area.name+ ' có nhiệt độ '+Math.round(area.average * 100) / 100+ '°C',
                                                                type:type,
                                                                obj_id: area._id
                                                            })
                                                            newNotification.save().then(notificationX =>{
                                                                io.to('room'+area.room).emit('notification',{message:'add',data:notificationX});
                                                            })
                                                            if(area.emailOn){
                                                                mailler.sendMail(access.user.email,'CẢNH BÁO NHIỆT ĐỘ',htmlData(access.user,room,area,monitor,type)).then().catch((err)=>{return});
                                                            }
                                                        }else{
                                                            notification.content = 'Cảnh báo nhiệt độ khu vực '+ area.name+ ' có nhiệt độ '+Math.round(area.average * 100) / 100+ '°C';
                                                            notification.save();
                                                            io.to('room'+area.room).emit('notification',{message:'update',data:notification});
                                                        }
                                                        
                                                    }else{
                                                        let newNotification = new Notification({
                                                            user:access.user._id,
                                                            ref:'Area', 
                                                            content:'Cảnh báo nhiệt độ khu vực '+ area.name+ ' có nhiệt độ '+Math.round(area.average * 100) / 100+ '°C',
                                                            type:type,
                                                            obj_id: area._id
                                                        })
                                                        newNotification.save();
                                                        io.to('room'+area.room).emit('notification',{message:'add',data:newNotification});
                                                        if(area.emailOn){
                                                            mailler.sendMail(access.user.email,'CẢNH BÁO NHIỆT ĐỘ',htmlData(access.user,room,area,monitor,type)).then().catch((err)=>{return});
                                                        }
                                                                                                
                                                    }
                                                })
                                            })
                                        }
                                        });
                                    }
                                })
                            }
                        })

                    }
                    
                })
            }
        });
        })
    })       
}


const checkTime = (strCurrentTime,monitorTime)=>{
    let currentTime = new Date(strCurrentTime);
    let fromTime = new Date(monitorTime.from);
    let toTime = new Date(monitorTime.to);
    let numCurrentTime = currentTime.getHours() *60 + currentTime.getMinutes();
    let numfromTime = fromTime.getHours() *60 + fromTime.getMinutes();
    let numtoTime = toTime.getHours() *60 + toTime.getMinutes();
    return (numCurrentTime >= numfromTime && numCurrentTime <= numtoTime)?true:false;
    
}


const htmlData = (user,room,area,monitor,type) => {
    let noti = (type =='WARRING_HIGH_TEMPERATURE')? `<span style="color: rgb(226, 80, 65);"><strong>cao hơn </strong></span>`:`<span style="color: rgb(41, 105, 176);"><strong>Thấp hơn</strong></span>`;
    let abs =(type =='WARRING_HIGH_TEMPERATURE')?area.average-monitor.temperature.max: area.average - monitor.temperature.min;
    let nowtime = new Date();
    let strtime = nowtime.toUTCString();
    return `<h3>Xin ch&agrave;o, <strong>`+user.fullname+`</strong></h3>
  <p><strong>Kho lạnh:</strong> `+room.name+`</p>
  <p><strong>Khu vực:</strong> `+area.name+`</p><p><span style="color: rgb(41, 105, 176);">
  <em>Đang c&oacute; nhiệt độ ngo&agrave;i ngưỡng cho ph&eacute;p.</em>
  </span></p><p><strong>Nhiệt độ cho ph&eacute;p từ:</strong> `+monitor.temperature.min +` <span style="color: rgb(32, 33, 36); font-family: arial, sans-serif; font-size: 14px; font-style: normal; font-variant-ligatures: normal; font-variant-caps: normal; font-weight: 400; letter-spacing: normal; orphans: 2; text-align: left; text-indent: 0px; text-transform: none; white-space: normal; widows: 2; word-spacing: 0px; -webkit-text-stroke-width: 0px; background-color: rgb(255, 255, 255); text-decoration-thickness: initial; text-decoration-style: initial; text-decoration-color: initial; display: inline !important; float: none;">&deg;C</span>&nbsp;
   đến &nbsp;`+monitor.temperature.max +` <span style="color: rgb(32, 33, 36); font-family: arial, sans-serif; font-size: 14px; font-style: normal; font-variant-ligatures: normal; font-variant-caps: normal; font-weight: 400; letter-spacing: normal; orphans: 2; text-align: left; text-indent: 0px; text-transform: none; white-space: normal; widows: 2; word-spacing: 0px; -webkit-text-stroke-width: 0px; background-color: rgb(255, 255, 255); text-decoration-thickness: initial; text-decoration-style: initial; text-decoration-color: initial; display: inline !important; float: none;">&deg;C</span>&nbsp;</p>
   <p><strong>Nhiệt độ cảnh b&aacute;o:</strong> `+area.average+` <span style="color: rgb(32, 33, 36); font-family: arial, sans-serif; font-size: 14px; font-style: normal; font-variant-ligatures: normal; font-variant-caps: normal; font-weight: 400; letter-spacing: normal; orphans: 2; text-align: left; text-indent: 0px; text-transform: none; white-space: normal; widows: 2; word-spacing: 0px; -webkit-text-stroke-width: 0px; background-color: rgb(255, 255, 255); text-decoration-thickness: initial; text-decoration-style: initial; text-decoration-color: initial; display: inline !important; float: none;">&deg;C</span> , 
   `+noti+`
   : 
   `+Math.round(abs*100)/100+` <span style="color: rgb(32, 33, 36); font-family: arial, sans-serif; font-size: 14px; font-style: normal; font-variant-ligatures: normal; font-variant-caps: normal; font-weight: 400; letter-spacing: normal; orphans: 2; text-align: left; text-indent: 0px; text-transform: none; white-space: normal; widows: 2; word-spacing: 0px; -webkit-text-stroke-width: 0px; background-color: rgb(255, 255, 255); text-decoration-thickness: initial; text-decoration-style: initial; text-decoration-color: initial; display: inline !important; float: none;">&deg;C</span>&nbsp;</p>
   <p>Dấu thời gian:&nbsp;`+strtime+`</p>
   <p><em>Vui l&ograve;ng điều chỉnh nhiệt độ kho lạnh của bạn hoặc tắt chế độ gi&aacute;m s&aacute;t để bỏ qua c&aacute;c email tiếp theo, xin cảm ơn</em></p><p><br></p><p><br></p><p><br></p><h3><br></h3>`
}
  