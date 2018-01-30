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
//#endregion

//#region Server Start/Events
server.listen(port, function() {
    Logger.log('Server started...', Logger.types.general);
});

io.on('connection', function(socket) {
    Logger.log(`${socket.request.connection.remoteAddress} connected`, Logger.types.general);

    socket.on('disconnect', function() {
        Logger.log(`${socket.request.connection.remoteAddress} disconnected`, Logger.types.general);
    });

    socket.on('GetTables', function() {
        function sendTablesToClient (res) {
            let propName = `Tables_in_${DB_NAME}`,
                tableNames = [];
            cache.tables = new Map();

            for (let i = 0, j = res.rows.length; i < j; i++) {
                let tableName = res.rows[i][propName];
                cache.tables.set(tableName, []);
                tableNames.push(tableName);
            }
    
            socket.emit('GetTableMap', {err: res.error, tables: tableNames});
        }
    
        queryDB('show tables', dbConnection, sendTablesToClient);
    });
    
    socket.on('GetAllForTable', function(table) {
        function infoToClient (res) {
            socket.emit('GetAllForTable', res);
        }

        queryDB(`select * from \`${table}\``, dbConnection, infoToClient);
    });

    socket.on('NewRecord', function(table) {
        function infoToClient (res) {
            socket.emit('GetNewRecord', res);
        }

        function initialInsert (res) {
            if (res.error != null) {
                socket.emit('GetNewRecord', res);
            }

            else {
                queryDB(`select max(\`id\`) as NewRecordID from \`${table}\``, dbConnection, infoToClient);
            }
        }

        queryDB(`insert into \`${table}\`() values()`, dbConnection, initialInsert);
    });

    socket.on('DeleteRecord', function(rowData) {
        let queriesFinished = 0,
            numQueries = rowData.recordIDs.length;

        function infoToClient (res) {
            queriesFinished += 1;
    
            let finalRes = {
                error: "",
                result: true
            }

            if (res.error != null) {
                finalRes.error += res.error + "\n";
                finslRes.result = false;
            }

            if (queriesFinished === numQueries) {
                socket.emit('DeleteRecordConfirmation', finalRes);
            }
        }

        for (let i = 0, j = rowData.recordIDs.length; i < j; i++) {
            queryDB(`delete from \`${rowData.table}\` where \`id\`=${rowData.recordIDs[i]}`, dbConnection, infoToClient);
        }
    });

    socket.on('UpdateRecords', function(data) {
        let table = data.table,
            queriesCompleted = 0,
            finalRes = true,
            records = data.records,
            error = "";

        function infoToClient (res) {
            //increment queriesCompleted
            queriesCompleted += 1;

            //check each record upate for success, if any one returns an error then we return false to indicate a failure
            if (finalRes === true && res.error != null) {
                finalRes = false;
                error += res.error + "\n";
            }

            if (queriesCompleted === records.length) {
                //we have finished all record updates, tell the client
                socket.emit('UpdateRecordConfirmation', {error: error, allUpdated: finalRes});
            }
        }

        for (let i = 0, j = records.length; i < j; i++) {
            let currData = records[i];
            queryDB(`update \`${table}\` set \`${currData.column}\`='${currData.value}' where \`id\`=${currData.id}`, dbConnection, infoToClient);
        }        
    });
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
            Logger.log(`QUERY: '${query}'`, Logger.types.dbEvent)
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