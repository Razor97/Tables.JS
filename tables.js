let table_head = undefined;
let table_body = undefined;
let table_body_sort = [];
let table_head_sort = {};
let validateSchema = true;
let page_no = 0;
let pages = 0; //default value
let rows_per_page = 0; //this is only for client side table
let server_url = "";
let div = "";
let mode = ""; //server-async,client,server-static
let search_mode = "";
let current_row_count = 0;
let searching = false;
let matches = 0;
let search_fields = undefined;


let preprocess_func = undefined; // this function will take in a parameter which is the data of the response

const validateTableLayout = () => {
    if (validateSchema) {
        let isValid = true;
        table_body.forEach((val) => {
            if (val.length != table_head.length) {
                isValid = false;
                return;
            }
        });
        return isValid;
    }
};

const generateTableHead = (thead_style) => {
    //generate table header
    let thead = document.createElement("thead");
    let tr = document.createElement("tr");
    tr.setAttribute("class", thead_style);
    //thead.setAttribute("class", thead_class)
    table_head.forEach((head) => {
        let th = document.createElement("th");
        let onclick = `sortTable("${head}")`;
        th.innerHTML = `${head}<span style="font-size:15px;"><a onclick=${onclick} id="sort_btn_${head}" class="sort" style="color:grey;">⇅</a></span>`;
        tr.appendChild(th);
    });
    thead.appendChild(tr);
    return thead;
};

const generateTableData = () => {
    current_row_count = 0;
    let tbody = document.createElement("tbody");
    let body = searching ? table_body_sort : table_body;
    tbody.id = "table_async_body";
    let i = page_no * rows_per_page;
    let count = rows_per_page;
    while (count != 0 && i < body.length) {
        let tr = document.createElement("tr");
        body[i].map((col) => {
            let td = document.createElement("td");
            td.innerText = col;
            tr.appendChild(td);
        });
        tbody.appendChild(tr);
        i++;
        current_row_count++;
        count--;
    }

    return tbody;
};

const generateTable = (style) => {
    let table = document.createElement("table");
    table.id = "table_async";
    table.className = `table table-hover table-bordered table-striped`;
    table.appendChild(generateTableHead(style));
    table.appendChild(generateTableData());
    return table;
};

const updateTable = () => {
    document.getElementById("table_async_body").remove();
    document.getElementById("table_async").appendChild(generateTableData());
    document.getElementById("table_async_pagination").remove();
    document.getElementById("table_async_summary").remove();
    document.getElementById(div).parentElement.appendChild(generateSummary());
    document.getElementById(div).parentElement.appendChild(generatePagination());
};

const generatePagination = () => {
    let nav = document.createElement("nav");
    nav.id = "table_async_pagination";
    nav.setAttribute("aria-label", "table_pagination");
    let ul = document.createElement("ul");
    ul.setAttribute("class", "pagination justify-content-end");

    if (searching) {
        //redo pages calculation by using rows_per_page
        pages = Math.ceil(matches / rows_per_page);
    } else {
        //recalculate the pages
        pages = Math.ceil(table_body.length / rows_per_page);
    }
    //prev button
    let prev_active = page_no == 0 ? "disabled" : "";
    let li = document.createElement("li");
    li.setAttribute("class", `page-item ${prev_active}`);
    let a = document.createElement("a");
    a.setAttribute("class", "page-link");
    a.setAttribute("href", "#");
    a.setAttribute("onclick", `page_nav_func(${page_no - 1})`);
    let span = document.createElement("span");
    span.setAttribute("aria-hidden", "true");
    span.innerHTML = "&laquo;";
    a.appendChild(span);
    li.appendChild(a);
    ul.appendChild(li);
    //end of prev button

    for (var i = 0; i < pages; i++) {
        let li = document.createElement("li");
        let active = page_no == i ? "active" : "";
        li.setAttribute("class", `page-item ${active}`);
        let a = document.createElement("a");
        a.setAttribute("class", "page-link");
        a.setAttribute("href", "#");
        a.setAttribute("onclick", `page_nav_func(${i})`);
        a.innerText = i + 1;
        li.appendChild(a);
        ul.appendChild(li);
    }

    //next button
    let next_active = page_no + 1 == pages ? "disabled" : "";
    li = document.createElement("li");
    li.setAttribute("class", `page-item ${next_active}`);
    a = document.createElement("a");
    a.setAttribute("class", "page-link");
    a.setAttribute("href", "#");
    a.setAttribute("onclick", `page_nav_func(${page_no + 1})`);
    span = document.createElement("span");
    span.setAttribute("aria-hidden", "true");
    span.innerHTML = "&raquo;";
    a.appendChild(span);
    li.appendChild(a);
    ul.appendChild(li);
    //end of next button

    nav.appendChild(ul);
    let div = document.createElement("div");
    div.appendChild(nav);
    return div;
};

const page_nav_func = (num) => {
    page_no = num;
    if (mode == "client")
        updateTable();

    else if (mode == "server")
        startPageDataFlow(num);

};

const generateSummary = () => {
    let div = document.createElement("div");
    div.id = "table_async_summary";
    div.style.display = "inline-block";
    let span = document.createElement("span");
    span.innerText = `Showing ${page_no * rows_per_page + 1} to ${page_no * rows_per_page + current_row_count
        } of ${searching ? matches : table_body.length} entries `;
    div.appendChild(span);
    return div;
};

const incomingDataProcess = (responseData) => {
    let preprocess_data = preprocess_func(responseData);
    table_head = preprocess_data.head;
    table_body = preprocess_data.body;
};

const sortTable = (header) => {
    //we basically sort the table_body array and redraw the body
    let mode = table_head_sort[header];
    let index = table_head.indexOf(header);
    let body = searching ? table_body_sort : table_body;
    let pointer = 0;
    if (index != -1) {
        if (mode == "asc") {
            body.sort((row_a, row_b) => (row_a[index] > row_b[index] ? 1 : -1));
            table_head_sort[header] = "desc";
            document.getElementById(`sort_btn_${header}`).innerText = "▲";
        } else {
            body.sort((row_a, row_b) => (row_a[index] < row_b[index] ? 1 : -1));
            table_head_sort[header] = "asc";
            document.getElementById(`sort_btn_${header}`).innerText = "▼";
        }
    }

    updateTable();
};

const search = (parameter, clear = false, filter = search_fields) => {
    matches = 0;
    page_no = 0;
    table_body_sort = [];
    if (clear == true || parameter.trim() == "") searching = false;
    else {
        matches = 0;
        searching = true;
        table_body.forEach((row, index) => {
            let result = row.find(
                (element,ind) =>
                    filter.indexOf(table_head[ind])!=-1 && element.toLowerCase().indexOf(String(parameter).toLowerCase()) != -1
            );

            if (result != undefined) {
                table_body_sort.push(row);
                matches++;
            }
        });
    }
    updateTable();
};

const generateSearchBar = () => {
    let html = ` <div class="row"><br></div>
    <div class="row">
        <div class="col-md-3" id="entries">
        
  <label for="records">Show</label>
  <select id="records" name="records" onchange="modifyRecords()">
  <option value="${rows_per_page}"></option>
    <option value="10">10</option>
    <option value="25">25</option>
    <option value="50">50</option>
    <option value="100">100</option>
  </select>
  <label>entries</label>

        </div>
        <div class="col-md-6"></div>
        <div class="col-md-3 col-sm-12">
            <div>
                <input type="text" placeholder="Search.." id="search">
                <i class="fa fa-search" aria-hidden="true"></i>
            </div>
        </div>
    </div>
    <div class="row"><br></div>`

    document.getElementById(div).parentNode.parentNode.innerHTML = html + document.getElementById(div).parentNode.innerHTML;

    document.getElementById("search").onkeyup = () =>
        search(document.getElementById("search").value);

}

const modifyRecords = ()=>{
    rows_per_page = parseInt(document.getElementById("records").value);
    pages = Math.ceil(table_body.length / rows_per_page);
    updateTable();
}

const Tables = (div_id, json) => {

    if ("mode" in json && json.mode == "server") {
        //handover control to server side methods
    }
    table_head = json.columns;
    table_body = json.data;
    mode = json.mode;
    table_head.forEach((head) => (table_head_sort[head] = "asc"));
    if (json.preprocess != undefined) preprocess_func = json.preprocess;
    div = div_id;
    pages = json.pages;
    rows_per_page = json.rows_per_page;

    if (pages == undefined && rows_per_page == undefined)
        rows_per_page = table_body.length;
    if (pages == undefined) pages = Math.ceil(table_body.length / rows_per_page);
    if (rows_per_page == undefined)
        rows_per_page = Math.ceil(table_body.length / pages);

    if ("search_bar" in json)
        document.getElementById(json["search_bar"]).onkeyup = () =>
            search(document.getElementById(json["search_bar"]).value);
    else
        generateSearchBar();

    if("search_fields" in json)
        search_fields = json.search_fields;
    else
        search_fields = table_head;

    document.getElementById(div_id).appendChild(generateTable(json.head));
    document.getElementById(div_id).parentElement.appendChild(generateSummary());
    document.getElementById(div_id).parentElement.appendChild(generatePagination());
};


//server-side methods
//we just need to fetch the data into table_head and table_body
//and do client side rendering
const configureServer = (div_id, json) => {
    server_url = json.url;

}

const startPageDataFlow = (current_page = 0) => {
    let request = {
        start: current_page, //0 indexed based pagination
        length: rows_per_page
    }

    fetch(server_url, {
        method: "POST",
        body: JSON.stringify(request)
    }).then(result => {

        if (preprocess_func != undefined)
            incomingDataProcess(result)
        else {
            table_body = result.body;
            table_head = result.head;
        }

        pages = result.pages;

        updateTable();
    })


}
