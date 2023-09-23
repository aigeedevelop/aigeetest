var db = require('../utils/db');

var userInfoList = {};
var userSocketList = {};

exports.initUserInfoList = function() {
    db.getUserInfoList(function(result) {
        if(result) {
            userInfoList = {};
            for(let i in result) {
                let userInfo = {
                    roomId : result[i].chat_room_id
                };
                
                userInfoList[result[i].id] = userInfo;
            }
        }
    });
};

exports.updateRoomId = function(userId, roomId){
    if(userInfoList[userId])
        userInfoList[userId].roomId = roomId;
    else{
        let userInfo = {
            roomId : roomId
        };                
        
        userInfoList[userId] = userInfo;
    }
    db.updateByField('chat_room_id', roomId, userId, function (){});
};

exports.getRoomId = function(userId){
    if(userInfoList[userId])
        return userInfoList[userId].roomId;
    else
        return 0;
};

exports.addSocket = function(userId, socket){
    userSocketList[userId] = socket;
};

exports.delSocket = function(userId){
    delete userSocketList[userId];    
};

exports.sendMsg = function(userId, event, msgData){
    let socket = userSocketList[userId];

    if(socket == null)
        return;    

    socket.emit(event, msgData);
};