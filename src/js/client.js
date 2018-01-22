let Client = {};

function init() {
    Client.socket = io.connect();

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
        Client.domRefs.newRecordBtn.onclick = newRecord;
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
}

//#region Functions
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

function generateGrid() {
    
}
//#endregion

window.onload = function () {
    init();
}