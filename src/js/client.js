let Client = {};

function init() {
    Client.cache = {};
    Client.socket = io.connect();
    Client.prevSelectedTableIndex = -1;
    Client.prevSelectedColumnIndex = -1;
    Client.selectedTable = null;
    Client.selectedRows = [];
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
        Client.domRefs.deleteRecordBtn.onclick = promptDeleteRecord;
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
        Client.domRefs.deleteTableBtn.onclick = promptDeleteTable;
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
        Client.domRefs.deleteColumnBtn.onclick = promptDeleteColumn;
    }

    let promptDialog = document.getElementById('prompt-dialog');
    if (promptDialog != null) {
        Client.domRefs.promptDialog = promptDialog;
    }

    let promptLabel = document.getElementById('prompt-label');
    if (promptLabel != null) {
        Client.domRefs.promptLabel = promptLabel;
    }

    let promptTextArea = document.getElementById('prompt-textarea');
    if (promptTextArea != null) {
        Client.domRefs.promptTextArea = promptTextArea;
    }

    let deleteDialog = document.getElementById('delete-dialog');
    if (deleteDialog != null) {
        Client.domRefs.deleteDialog = deleteDialog;
    }

    let deleteLabel = document.getElementById('delete-label');
    if (deleteLabel != null) {
        Client.domRefs.deleteLabel = deleteLabel;
    }

    let deleteConfirmBtn = document.getElementById('delete-confirm-button');
    if (deleteConfirmBtn != null) {
        Client.domRefs.deleteConfirmBtn = deleteConfirmBtn;
    }

    let deleteCancelBtn = document.getElementById('delete-cancel-button');
    if (deleteCancelBtn != null) {
        Client.domRefs.deleteCancelBtn = deleteCancelBtn;
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

        let keys = Client.domRefs.table.columnArray,
            newRecID = data.rows[0].NewRecordID,
            dataRow = document.createElement('tr'),
            firstElementForFocus;

        //add new record to table
        for (let k = 0, l = keys.length; k < l; k++) {
            let key = keys[k];

            let tableData = document.createElement('td'),
                cellElement;

            if (k === 0) {
                cellElement = document.createElement('input');
                cellElement.id = `row-select-id${newRecID}`;
                cellElement.type = 'checkbox';

                cellElement.onchange = rowSelectedDeselected;
                cellElement.modelData = {
                    column: key,
                    recordID: newRecID
                }

                firstElementForFocus = cellElement;
            }

            else {
                cellElement = document.createElement('textarea');
                cellElement.onblur = cellUpdated;

                cellElement.className = 'cell-textarea';

                if (k === 1) {
                    //record id field will always be disabled
                    cellElement.disabled = true;
                    cellElement.value = newRecID;
                }

                cellElement.modelData = {
                    column: key,
                    prevValue: "",
                    recordID: newRecID
                }
            }

            tableData.appendChild(cellElement);
            dataRow.appendChild(tableData);
        }

        Client.domRefs.table.appendChild(dataRow);

        //focus onto the newly created record (scroll into focus if necessary)
        firstElementForFocus.focus({preventScroll: false})
    });

    Client.socket.on('UpdateRecordConfirmation', function(data) {
        if (data.allUpdated === false || (data.error != null && data.error != "")) {
            //error
            console.log(`UpdateRecordConfirmation error: ${data.error}`);
            return;
        }

        //go through all text areas and set their styling back to the normal "saved" style with no border
        let allTextAreas = document.getElementsByTagName('textarea');
        for (let i = 0, j = allTextAreas.length; i < j; i++) {
            let currUnsavedCell = allTextAreas[i];
            currUnsavedCell.className = 'cell-textarea';
        }
    });

    Client.socket.on('DeleteRecordConfirmation', function(data) {
        if (data.error != null && data.error != "") {
            //error
            console.log(`DeleteRecordConfirmation error: ${data.error}`);
            return;
        }

        //go through all rows and visually remove records that were just removed server side
        //calling array slice gives us a "cloned" array of values, not references inside an HTML collection so when we remove them the array doesn't shrink
        let allRows = Array.prototype.slice.call(document.getElementsByTagName('tr'));
        for (let i = 0, j = allRows.length; i < j; i++) {
            let currRow = allRows[i],
                cell = currRow.childNodes[0].childNodes[0];

            //check row id and if index is in selected rows then remove it
            if (cell.modelData != null && Client.selectedRows.indexOf(cell.modelData.recordID) > -1) {
                Client.domRefs.table.removeChild(currRow);
            }
        }

        //unselect any checkboxes of records that are still left
        let allInputs = Array.prototype.slice.call(document.getElementsByTagName('input'));
        for (let i = 0, j = allInputs.length; i < j; i++) {
            let currInput = allInputs[i];

            //check row id and if index is in selected rows then remove it
            if (currInput.type === 'checkbox' && currInput.checked === true) {
                currInput.checked = false;
            }
        }

        //reset selected rows
        Client.selectedRows = [];
    });

    Client.socket.on('AddColumnConfirmation', function(data) {
        if (data.error != null && data.error != "") {
            //error
            console.log(`AddColumnConfirmation error: ${data.error}`);
            return;
        }
    });

    Client.socket.on('RemoveColumnConfirmation', function(data) {
        if (data.error != null && data.error != "") {
            //error
            console.log(`RemoveColumnConfirmation error: ${data.error}`);
            return;
        }

        //no errors, remove the column from list of column
        let selectedColumnIndex = Client.domRefs.columnList.selectedIndex,
            newIndex = selectedColumnIndex - 1;

        if (selectedColumnIndex > -1) {
            Client.domRefs.columnList.removeChild(Client.domRefs.columnList.childNodes[selectedColumnIndex]);

            //select column below the removed column
            if (Client.domRefs.columnList.childNodes.length > 0) {
                newIndex = newIndex > -1 ? selectedColumnIndex : 0;
                Client.domRefs.columnList.selectedIndex = newIndex;
            }            

            //call tableSelected to trigger record and column list building/updating
            tableSelected(true);
        }
    });

    Client.socket.on('AddTableConfirmation', function(data) {
        if (data.error != null && data.error != "") {
            //error
            console.log(`AddTableConfirmation error: ${data.error}`);
            return;
        }
    });

    Client.socket.on('RemoveTableConfirmation', function(data) {
        if (data.error != null && data.error != "") {
            //error
            console.log(`RemoveTableConfirmation error: ${data.error}`);
            return;
        }

        //no errors, remove the table from list of tables
        let selectedTableIndex = Client.domRefs.tableList.selectedIndex,
            newIndex = selectedTableIndex - 1;

        if (selectedTableIndex > -1) {
            Client.domRefs.tableList.removeChild(Client.domRefs.tableList.childNodes[selectedTableIndex]);

            //if there are tables then we initially select the first table
            if (Client.domRefs.tableList.childNodes.length > 0) {
                newIndex = newIndex > -1 ? newIndex : 0;
                Client.domRefs.tableList.selectedIndex = newIndex;
            }            

            //call tableSelected to trigger record and column list building/updating
            tableSelected();
        }
    });
    //#endregion

    //grab tables and initially build out the grid for the first table
    Client.socket.emit('GetTables');
}

//#region Functions
function tableSelected(overrideIndexChangeCheck = false) {
    let currIndex = Client.domRefs.tableList.selectedIndex,
        table = Client.domRefs.tableList.childNodes[currIndex].value;

    Client.selectedTable = table;

    if (currIndex == Client.prevSelectedTableIndex && overrideIndexChangeCheck === false) {
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

function promptDeleteTable() {
    //TODO: prompt "are you sure, can't be undone etc"
    alert('deleteTable');
}

function deleteTable() {    
    let selectedTableIndex = Client.domRefs.tableList.selectedIndex,
        tableName;
    if (selectedTableIndex > -1) {
        tableName = Client.domRefs.tableList.childNodes[selectedTableIndex].value;
        Client.socket.emit('RemoveTable', { table: tableName });
    }
}

function newColumn() {
    alert('newColumn');
}

function promptDeleteColumn() {
    //TODO: prompt "are you sure, can't be undone etc"
    alert('deleteColumn');
}

function deleteColumn() {    
    let selectedColumnIndex = Client.domRefs.columnList.selectedIndex,
        selectedColumn;

    if (selectedColumnIndex > -1) {
        selectedColumn = Client.domRefs.columnList.childNodes[selectedColumnIndex].value;
        Client.socket.emit('RemoveColumn', { table: Client.selectedTable, column: selectedColumn });
    }
}

function newRecord() {
    //tell server to create a new record which will return a new record with an ID
    Client.socket.emit('NewRecord', Client.selectedTable);
}

function promptDeleteRecord() {
    //TODO: prompt "are you sure, can't be undone etc"
    alert('deleteRecord');
}

function deleteRecord() {    
    Client.socket.emit('DeleteRecord', { table: Client.selectedTable, recordIDs: Client.selectedRows });
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

function selectDeselectAllRows() {
    //whether selecting or deselecting all rows clear our the selected row array
    Client.selectedRows = [];

    //if selecting all rows then iterate through and add all record id's to the selected row array
    let allRows = Array.prototype.slice.call(document.getElementsByTagName('tr')),
        checkedVal = this.checked;
    for (let i = 0, j = allRows.length; i < j; i++) {
        let currRow = allRows[i],
            cell = currRow.childNodes[0].childNodes[0];

        //check row id and if index is in selected rows then remove it
        if (checkedVal === true && cell.modelData != null && Client.selectedRows.indexOf(cell.modelData.recordID) === -1) {
            Client.selectedRows.push(cell.modelData.recordID);
        }

        //set individual checkboxes to match the select/deselect all value
        if (cell.type === 'checkbox') {
            cell.checked = checkedVal;
        }
    }
}

function rowSelectedDeselected() {
    let indexOfRecordID = Client.selectedRows.indexOf(this.modelData.recordID);
    //row selector was toggled to true, only add to selected rows if it is not already in the array
    if (this.checked === true && indexOfRecordID === -1) {
        Client.selectedRows.push(this.modelData.recordID);
    }

    //row selector was toggled to false, only remove from selected rows if it is in the array
    else if (this.checked === false && indexOfRecordID > -1) {
        Client.selectedRows.splice(indexOfRecordID, 1);
    }
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

        //cannot remove 'id' field
        if (i === 0 || fields[i].name === 'id') {
            continue;
        }

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
        headerRow = document.createElement('tr'),
        keys = ['rowSelection'];

    //create the first column which is the row selection column
    let rowSelectionColumn = document.createElement('th'),
        selectAllCheckbox = document.createElement('input');

    //set properties of the DOM elements
    rowSelectionColumn.innerHTML = 'Select/Deselect All';
    selectAllCheckbox.id = 'select-all-rows';
    selectAllCheckbox.type = 'checkbox';
    selectAllCheckbox.onchange = selectDeselectAllRows;

    //add checkbox to the column DOM, then add column to header row
    rowSelectionColumn.appendChild(selectAllCheckbox);
    headerRow.appendChild(rowSelectionColumn);
    
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
                cellElement;

            if (k === 0) {
                cellElement = document.createElement('input');
                cellElement.id = `row-select-id${id}`;
                cellElement.type = 'checkbox';

                cellElement.onchange = rowSelectedDeselected;
                cellElement.modelData = {
                    column: key,
                    recordID: id
                }
            }

            else {
                cellElement = document.createElement('textarea');
                cellElement.onblur = cellUpdated;

                cellElement.className = 'cell-textarea';
                cellElement.value = currCol;

                if (k === 1) {
                    //record id field will always be disabled
                    cellElement.disabled = true;
                }

                cellElement.modelData = {
                    column: key,
                    prevValue: currCol == null ? "" : currCol,
                    recordID: id
                }
            }

            tableData.appendChild(cellElement);
            dataRow.appendChild(tableData);
        }
        
        Client.domRefs.table.appendChild(dataRow);
        Client.domRefs.table.columnArray = keys;
    }
}
//#endregion

window.onload = function () {
    init();
}