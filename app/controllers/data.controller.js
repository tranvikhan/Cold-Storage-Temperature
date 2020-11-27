
const db = require("../models");
const axios = require('axios');
const config = require('../config/data.config');
const visualData = require('./GetSensorData/visualData');

const xlsxFile = require('read-excel-file/node');
const interpolationArea = require('./Interpolations/MonitorInterpolation');

const Area = db.area;
const Room = db.room;
const Structure = db.structure;
const Sensor = db.sensor;
const Activate = db.activate;

global.currentData = null;

const fake = require("./Interpolations/cubeInterpolation").Fake;
const result = require("../helps/result.helps");
const { sensor, data } = require("../models");



/* Demo Get Data (Dev Tool)-------------------------------*/
exports.getDemoData = (req, res) => {
  res.send(fake());
};

exports.getAreaData = (req, res) =>{
    Room.findById(req.body.room_id).exec((err,room)=>{
        if(err){
            console.log(err);
            return;
        }
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
                result.Ok( res, {room:req.body.room_id,data:data,time: realtimeData.data_createdDate});
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
                                    status: (realtimeData.data_value >99)?"OFF":((sensorX.isUsed)?"RUNNING":"ON")
                                })
                            });
                            result.Ok(res,{
                                room: req.body.room_id,
                                data: data,
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
                
                Area.find({room:room._id}).exec((err,areas)=>{
                    if(err){
                        console.log(err);
                        return;
                    }
                    if(areas!=null && areas.length>0 && data.length>0){
                        //console.log(data,room,areas);
                        areaThemp = interpolationArea.Get(data,room,areas);
                        areaThemp = areaThemp.map(area => ({_id:area._id,name: area.name,value: area.average}))
                        io.to('room'+room._id).emit('data_area',{room:room._id,areas: areaThemp,time: realtimeData.data_createdDate});
                        io.to('room'+room._id).emit('data_room',{room:room._id,datas: data,time: realtimeData.data_createdDate});
                    }
                })
            }
        });
        })
    })       
}