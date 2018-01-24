let Client = {};

function init() {
    Client.cache = {};
    Client.socket = io.connect();
    Client.prevSelectedTableIndex = -1;
    Client.prevSelectedColumnIndex = -1;

    //#region Grab/Store DOM References
    Client.domRefs = {};

    let newRecordBtn = document.getElementById('new-record-button');
    if (newRecordBtn != null) {
        Client.domRefs.newRecordBtn = newRecordBtn;
        Client.domRefs.newRecordBtn.onclick = newRecord;
    }

    let deleteRecordBtn = document.getElementById('delete-record-button');
    if (deleteRecordBtn != null) {
        Client.domRefs.deleteRecordBtn = deleteRecordBtn;
        Client.domRefs.deleteRecordBtn.onclick = deleteRecord;
    }

    let tableRef = document.getElementById('table-dom');
    if (tableRef != null) {
        Client.domRefs.table = tableRef;
    }

    let tableList = document.getElementById('table-list');
    if (tableList != null) {
        Client.domRefs.tableList = tableList;
        Client.domRefs.tableList.onchange = tableSelected;
    }

    let newTableBtn = document.getElementById('new-table-button');
    if (newTableBtn != null) {
        Client.domRefs.newTableBtn = newTableBtn;
        Client.domRefs.newTableBtn.onclick = newTable;
    }

    let deleteTableBtn = document.getElementById('delete-table-button');
    if (deleteTableBtn != null) {
        Client.domRefs.deleteTableBtn = deleteTableBtn;
        Client.domRefs.deleteTableBtn.onclick = deleteRecord;
    }

    let columnList = document.getElementById('column-list');
    if (columnList != null) {
        Client.domRefs.columnList = columnList;
        Client.domRefs.columnList.onchange = columnSelected;
    }

    let newColumnBtn = document.getElementById('new-column-button');
    if (newColumnBtn != null) {
        Client.domRefs.newColumnBtn = newColumnBtn;
        Client.domRefs.newColumnBtn.onclick = newColumn;
    }

    let deleteColumnBtn = document.getElementById('delete-column-button');
    if (deleteColumnBtn != null) {
        Client.domRefs.deleteColumnBtn = deleteColumnBtn;
        Client.domRefs.deleteColumnBtn.onclick = deleteColumn;
    }
    //#endregion

    //grab tables and initially build out the grid for the first table
    Client.socket.emit('GetTables');

    //#region Socket Events
    Client.socket.on('GetTableMap', function (data) {
        if (data.error != null) {
            //error
            console.log(`GetTableMap error: ${data.error}`);
            return;
        }

        let tables = data.tables;

        //create client table cache
        Client.cache.tables = new Map();

        //update the side table list
        while (Client.domRefs.tableList.hasChildNodes()) {
            Client.domRefs.tableList.removeChild(Client.domRefs.tableList.childNodes[0]);
        }

        for (let i = 0, j = tables.length; i < j; i++) {
            let tableName = tables[i];
            Client.cache.tables.set(tableName, []);

            let tableOption = document.createElement('option');
            tableOption.value = tableOption.innerHTML = tableName;

            Client.domRefs.tableList.appendChild(tableOption);
        }

        if (tables.length > 0) {
            //if there are tables then we initially select the first table
            Client.domRefs.tableList.selectedIndex = 0;

            //call tableSelected to trigger record and column list building/updating
            tableSelected();
        }
    });

    Client.socket.on('GetAllForTable', function (data) {
        if (data.error != null) {
            //error
            console.log(`GetAllForTable error: ${data.error}`);
            return;
        }

        generateGrid(data.rows, data.fields);
    });
    //#endregion
}

//#region Functions
function tableSelected() {
    let currIndex = Client.domRefs.tableList.selectedIndex;
    if (currIndex == Client.prevSelectedTableIndex) {
        //nothing changed don't continue on
        return;
    }

    //a new index was selected so update the previous index to our current one
    Client.prevSelectedTableIndex = currIndex;

    let table = Client.domRefs.tableList.childNodes[currIndex].value;

    //make service request for all
    Client.socket.emit('GetAllForTable', table);
}

function columnSelected() {
    let currIndex = Client.domRefs.columnList.selectedIndex;
    if (currIndex == Client.prevSelectedColumnIndex) {
        //nothing changed don't continue on
        return;
    }

    //a new index was selected so update the previous index to our current one
    Client.prevSelectedColumnIndex = currIndex;
}

function newTable() {
    alert('newTable');
}

function deleteTable() {
    alert('deleteTable');
}

function newColumn() {
    alert('newColumn');
}

function deleteColumn() {
    alert('deleteColumn');
}

function newRecord() {
    alert('newRecord');
}

function deleteRecord() {
    alert('deleteRecord');
}

function updateRecord() {
    alert('updateRecord');
}

function generateGrid(rows, fields) {
    if (rows == null || rows == 'undefined') {
        rows = [];
    }

    //remove all table children for rebuilding
    while (Client.domRefs.table.hasChildNodes()) {
        Client.domRefs.table.removeChild(Client.domRefs.table.childNodes[0]);
    }

    let spanGroup = document.createElement('colgroup'),
        keys = [],
        headerRow = document.createElement('tr');

    for (let s = 0, t = fields.length; s < t; s++) {
        //key references to column header names
        keys.push(fields[s].name);

        //create column header dom elements
        let col = document.createElement('th');
        col.innerHTML = fields[s].name;
        headerRow.appendChild(col);
    }

    spanGroup.span = keys.length;;

    Client.domRefs.table.appendChild(spanGroup);
    Client.domRefs.table.appendChild(headerRow);

    for (let i = 0, j = rows.length; i < j; i++) {
        let currRow = rows[i],
            dataRow = document.createElement('tr');

        for (let k = 0, l = keys.length; k < l; k++) {
            let key = keys[k],
                currCol = currRow[key];

            let tableData = document.createElement('td'),
                textArea = document.createElement('textarea');

            textArea.className = 'cell-textarea';
            textArea.value = currCol;

            tableData.appendChild(textArea);
            dataRow.appendChild(tableData);
        }
        
        Client.domRefs.table.appendChild(dataRow);
    }
}
//#endregion

window.onload = function () {
    init();
}