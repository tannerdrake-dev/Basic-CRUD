let Client = {};

function init() {
    Client.socket = io.connect();

    Client.domRefs = {};

    let tableRef = document.getElementById('table-dom');
    if (tableRef != null) {
        Client.domRefs.table = tableRef;
    }
}

document.onload = function () {
    init();
}