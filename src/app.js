"use strict";

let express = require('express'),
    http = require('http'),
    socket = require('socket.io'),
    uuid = require('uuid/v4'),
    mysql = require('mysql'),
    path = require('path');
//import * as enum from '../js/enum';

//#region Variable Initialization
let app = express(),
    server = http.Server(app),
    io = socket.listen(server),
    port = process.env.PORT || 8081,
    DB_NAME = process.env.DB || 'crud_demo',
    cache = {};
//#endregion

//#region Serve Client Files
app.use('/css', express.static(__dirname + '/css')); 
app.use('/js', express.static(__dirname + '/js')); 
 
app.get('/', function(req, res){ 
    res.sendFile(__dirname+'/index.html'); 
}); 

app.get('/', function(req, res){
    res.sendFile(__dirname + '/index.html');
});
//#endregion

//#region Server Start/Events
server.listen(port, function() {
    Logger.log('Server started...', Logger.types.general);
});

io.on('connection', function(socket) {
    Logger.log(`${socket.request.connection.remoteAddress} connected`, Logger.types.general);
});

io.on('GetTables', function(socket) {
    queryDB('show tables', dbConnection, function (res) {
        let propName = `Tables_in_${DB_NAME}`;

        cache.tables = new Map();

        for (let i = 0, j = res.rows.length; i < j; i++) {
            cache.tables.set(res.rows[i][propName], []);
        }

        //Logger.log(`Tables: ${tableNames}`, Logger.types.general);

        socket.emit('GetTables', cache.tables);
    });
});

io.on('GetAllRecordsByTable', function(socket) {

});

//#endregion

//#region MySQL DB connection
let dbConnection = mysql.createConnection({
    host: 'localhost',
    user: 'crud_user',
    password: 'crudpassword',
    database: DB_NAME
});

dbConnection.connect(function(err) {
    if (err != null) {
        Logger.log(`Database connection failed: ${err}`, Logger.types.error);
        return;
    }

    else {
        Logger.log(`Database connected`, Logger.types.general);
    }
});

function queryDB (query, connection, callback) {
    connection.query(query, function (err, rows, fields) {
        let result = {
            error: err,
            rows: rows,
            fields: fields
        };

        if (err != null) {
            Logger.log(`QUERY: '${query}' failed - ${err}`, Logger.types.dbEvent);
        }

        else {
            Logger.log(`QUERY: '${query}' succeeded`, Logger.types.dbEvent)
        }

        if (callback != null) {
            callback(result);
        }
    });
}

//#endregion

//#region Logger
let Logger = {
    types: {
        general: 0,
        dbEvent: 1,
        error: 2
    },
    log: function (msg, type) {
        var val = `localhost:${server.address().port}`;
        switch (type) {
            case Logger.types.dbEvent:
                val += ' | Database Event | ' + msg;
                break;
            case Logger.types.error:
                val += ' | ERROR | ' + msg;
                break;
            case Logger.types.general:
            default:
                val += ' | General | ' + msg;
        }
    
        console.log(val);
    }
}
//#endregion