let Client = {};

function init() {
    Client.cache = {};
    Client.socket = io.connect();
    Client.prevSelectedTableIndex = -1;
    Client.prevSelectedColumnIndex = -1;
    Client.selectedTable = null;
    Client.dirtyValues = [];

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

    let saveRecordBtn = document.getElementById('save-record-button');
    if (saveRecordBtn != null) {
        Client.domRefs.saveRecordBtn = saveRecordBtn;
        Client.domRefs.saveRecordBtn.onclick = saveRecord;
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
        buildColumnList(data.fields);
    });

    Client.socket.on('GetNewRecord', function (data) {
        if (data.error != null) {
            //error
            console.log(`GetNewRecord error: ${data.error}`);
            return;
        }

        //make service request for all
        Client.socket.emit('GetAllForTable', Client.selectedTable);
    });

    Client.socket.on('UpdateRecordConfirmation', function(data) {
        if (data.allUpdated === false || (data.error != null && data.error != "")) {
            //error
            console.log(`UpdateRecordConfirmation error: ${data.error}`);
            return;
        }

        //go through all text areas and set their styling back to the normal "saved" style with no border
        //TODO: fix this, this function is returning an empty HTML Collection
        let unsavedCells = document.getElementsByClassName('unsaved-cell-texarea');
        for (let i = 0, j = unsavedCells.length; i < j; i++) {
            let currUnsavedCell = unsavedCells[i];
            currUnsavedCell.className = 'cell-textarea';
        }
    });
    //#endregion

    //grab tables and initially build out the grid for the first table
    Client.socket.emit('GetTables');
}

//#region Functions
function tableSelected() {
    let currIndex = Client.domRefs.tableList.selectedIndex,
        table = Client.domRefs.tableList.childNodes[currIndex].value;

    Client.selectedTable = table;

    if (currIndex == Client.prevSelectedTableIndex) {
        //nothing changed don't continue on
        return;
    }

    //a new index was selected so update the previous index to our current one
    Client.prevSelectedTableIndex = currIndex;

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
    //TODO: prompt "are you sure, can't be undone etc"
    alert('deleteTable');
}

function newColumn() {
    alert('newColumn');
}

function deleteColumn() {
    //TODO: prompt "are you sure, can't be undone etc"
    alert('deleteColumn');
}

function newRecord() {
    //tell server to create a new record which will return a new record with an ID
    Client.socket.emit('NewRecord', Client.selectedTable);
}

function deleteRecord() {
    //TODO: prompt "are you sure, can't be undone etc"
    alert('deleteRecord');
}

function cellUpdated() {
    let currValue = this.value,
        dirtyCell = {};

    if (currValue == this.modelData.prevValue) {
        //data hasn't changed, do nothing
        return;
    }

    //set the cell to "unsaved" by giving it a red border
    this.className = 'unsaved-cell-textarea';

    //update model data to reflect new value
    this.modelData.prevValue = currValue;

    //build dirty cell object that we store on the client until saved
    dirtyCell.column = this.modelData.column;
    dirtyCell.id = this.modelData.recordID;
    dirtyCell.value = currValue;

    Client.dirtyValues.push(dirtyCell);
}

function saveRecord() {
    Client.socket.emit('UpdateRecords', {table: Client.selectedTable, records: Client.dirtyValues});
}

function buildColumnList(fields) {
    //remove all column options children for rebuilding
    while (Client.domRefs.columnList.hasChildNodes()) {
        Client.domRefs.columnList.removeChild(Client.domRefs.columnList.childNodes[0]);
    }

    for (let i = 0, j = fields.length; i < j; i++) {
        let columnOption = document.createElement('option');
        columnOption.value = columnOption.innerHTML = fields[i].name;

        Client.domRefs.columnList.appendChild(columnOption);
    }
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
            dataRow = document.createElement('tr'),
            id = currRow['id'];

        for (let k = 0, l = keys.length; k < l; k++) {
            let key = keys[k],
                currCol = currRow[key];

            let tableData = document.createElement('td'),
                textArea = document.createElement('textarea');

            textArea.onblur = cellUpdated;

            textArea.className = 'cell-textarea';
            textArea.value = currCol;

            if (k === 0) {
                //record id field will always be disabled
                textArea.disabled = true;
            }

            textArea.modelData = {
                column: key,
                prevValue: currCol,
                recordID: id
            }

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