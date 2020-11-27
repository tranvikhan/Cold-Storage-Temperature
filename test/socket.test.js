var io = require('socket.io-client');
var socket = io.connect('http://127.0.0.1:8080');
var myUser ='5fb403b5b7a7da4098b7a977';
var myToken ='eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjVmYjQwM2I1YjdhN2RhNDA5OGI3YTk3NyIsImlhdCI6MTYwNjM4MzE1NCwiZXhwIjoxNjA2NDY5NTU0fQ.hW2q_MT3uQW_3breOlADyFWO70qRqm9BDhQ775BKPE4';

console.log('run socket client');
socket.on('connect', function(){
    console.log("connect");
    socket.emit('login',myToken);
});
socket.on('data_room', function(data){
    console.log(data);
});
socket.on('log', function(data){
    console.log(data);
});

socket.on('data_area',function(data){
    console.log(data);
})

socket.on('notification', function(data){
    console.log(data);
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


socket.on('room', function(data){
    if(data.message == 'delete'){
        socket.emit('leave-room', 'room'+data.data.room._id);  
    }
    if(data.message == 'edit'){
        console.log(data);  
    }
    if(data.message == 'add-area'){
        console.log(data);  
    }
    if(data.message == 'edit-area'){
        console.log(data);  
    }
    if(data.message == 'delete-area'){
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