var io = require('socket.io-client');
var socket = io.connect('http://localhost:8080/');
var myUser ='5fc05b70d2b6a82f10235ded';
var myToken ='eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjVmYzA1YjcwZDJiNmE4MmYxMDIzNWRlZCIsImlhdCI6MTYwNzU2OTc5NSwiZXhwIjoxNjA3NjU2MTk1fQ.gUWKqEHuHHqnhqB8Q5zTfZCdnVThVR7FJqVoSyqwvHY';

console.log('run socket client');
socket.on('connect', function(){
    console.log("connect");
    socket.emit('login',myToken);
});
socket.on('data_room', function(data){
    //console.log(data);
});
socket.on('data_cube_room', function(data){
    console.log(data);
});
socket.on('log', function(data){
    console.log(data);
});

socket.on('data_area',function(data){
    //console.log(data);
})

socket.on('notification', function(data){
    //console.log(data);
});


socket.on('access', function(data){
    console.log(data);
    if(data.message =='add'){
        socket.emit('join-room', 'room'+data.data.access.room);  
    }
    if(data.message =='edit'){
        //do something
    }
    if(data.message =='delete' && data.data.access.user==myUser){
        socket.emit('leave-room', 'room'+data.data.access.room);  
    }
    
});



socket.on('area', function(data){
    if(data.message == 'add'){
        console.log(data);  
    }
    if(data.message == 'edit'){
        console.log(data);  
    }
    if(data.message == 'delete'){
        console.log(data);  
    }
    if(data.message == 'add-monitor'){
        console.log(data);  
    }
    if(data.message == 'edit-monitor'){
        console.log(data);  
    }
    if(data.message == 'switch-monitor'){
        console.log(data);  
    }
    if(data.message == 'delete-monitor'){
        console.log(data);  
    }
})


socket.on('activate', function(data){
    if(data.message == 'add'){
        console.log(data); 
    }
    if(data.message == 'delete'){
        console.log(data);  
    }
});



socket.on('room', function(data){
    if(data.message == 'delete'){
        socket.emit('leave-room', 'room'+data.data.room._id);  
    }
    if(data.message == 'edit'){
        console.log(data);  
    }
});

socket.on('structure', function(data){
    if(data.message == 'add'){
        console.log(data); 
    }
    if(data.message == 'update'){
        console.log(data);  
    }
});


socket.on('disconnect', function(){});