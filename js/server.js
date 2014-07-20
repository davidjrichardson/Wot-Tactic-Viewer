var express = require("express");
var app     = express();
var server  = require('http').createServer(app);
var io      = require('socket.io').listen(server);

server.listen(3000);

var map = {"map": "../img/01_karelia.jpg"};

io.sockets.on("connection", function(socket) {
    console.log("Connecting socket");

    socket.emit("changeMap", map);

    socket.on("changeMap", function(data) {
        map = data;
        io.emit("changeMap", map);
    });

    socket.on("clearMap", function(data) {
        io.emit("clearMap", data);
    });

    socket.on("pingMap", function(data) {
        io.emit("pingMap", data);
    })

    socket.on("disconnect", function(socket) {
        console.log("Disconnecting socket");
    });
});