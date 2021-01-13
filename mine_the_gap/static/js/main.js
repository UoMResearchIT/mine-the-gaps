import {LoaderDisplay} from "./loader.js";
import {GapMap} from "./gapMap.js";

const csrftoken = getCookie('csrftoken');
const fileSizeLimit = 5;
var xhr = null;

var curLoader;
var gapMap;
var userUploadedData = null;


$(document).ready(function(){
    gapMap = new GapMap('mapid', regionsFileUrl, csrftoken, showTimelineComparisons);

    // Make the timestamp slider draggable:
    dragElement(document.getElementById("map-slider"));

    $("#file-upload-form").on("submit", function(){
        if(confirm('Do you really want to replace these files?')){
            curLoader = new LoaderDisplay('loader-outer','<p>Uploading data...</p>');
            return true;
        }else{
            return false;
        }
    });

    $("div#select-files").show();
    // Upload files toggle button
    $("button#btn-select-files").click(function(){
        $("div#select-files").toggle('slow');
    });

    $("#estimation-method-label").html('<em>' + $("input[name='estimation-method']:checked").val() + '</em>');
    $("#estimation-method input").change(function() {
        $("#estimation-method-label").html('<em>' + $("input[name='estimation-method']:checked").val() + '</em>');
        gapMap.dataUrl = dataUrl + '/' + this.value + '/';
        gapMap.updateTimeseries(get_site_select_url_params());
    });

    $("#measurement-names-label").html('<em>' + $("input[name='measurement']:checked").val() + '</em>');
    $("#measurement-names input").change(function() {
        $("#measurement-names-label").html('<em>' + $("input[name='measurement']:checked").val() + '</em>');
        gapMap.updateTimeseries(get_site_select_url_params());
    });

    $('#region-data').html(get_region_default());
    $('#site-data-instructions').html(get_site_default());

    // bounds must be set after only the first initialisation of map
    initialise_slider();
    initialise_site_fields();

    $('#upload-data-button').change(function(){
        uploadUserData(this);
    })

    function uploadUserData(inputElem){
        //alert(inputElem);
        var file = inputElem.files[0];
        uploadData(file);
    }
});

// Upload user data functions
function uploadData(file){
    var csvType = 'text/csv';
    var success = false;
    userUploadedData = null;
    if(!validateFileSize(file)){
        alert('File size exceeeds limit: ' + fileSizeLimit.toString() + ' MiB');
        return;
    }
    if (file.type.match(csvType)) {
        var reader = new FileReader();
        reader.onload = function(e) {
            try {
                userUploadedData = processCSV(reader.result);
                success = true;
            }catch {
                success = false;
            }
        }
        reader.onloadend = function(e){
            if(success === true) {
                gapMap.addUploadedData(userUploadedData);
            }
        }
        reader.readAsText(file);
    } else {
        alert("Only CSV files are accepted. File type: " + file.type );
    }
}

function validateFileSize(file) {
    // Convert to Megabytes
    var fileSize = file.size / 1024 / 1024; // in MiB
    // check OK
    return (fileSize <= fileSizeLimit);
}

// Process the user uploaded CSV file by reading it in to javascript array
function processCSV(dataString) {
    var dictAll = {};
    var allValues = {};
    var dataRows = dataString.toLowerCase().split(/\n/); // Convert to one string per line
    var strHeaders = dataRows[0];
    var headers = strHeaders.split(',');
    if (headers[0] != 'timestamp'){
        alert("CSV file does not contain required 'timestamp' as 1st column");
        throw "CSV file does not contain required 'timestamp' as 1st column"
    }
    if (headers[1] != 'geom'){
        alert("CSV file does not contain required 'geom' as 2nd column");
        throw "CSV file does not contain required 'geom' as 2nd column"
    }
    if (headers.length < 3 ){
        alert("CSV file does not contain any value columns (after the 'timestamp' and 'geom' columns)");
        throw "CSV file does not contain any value columns (after the 'timestamp' and 'geom' columns)";
    }

    // Read lines into array
    var lines = dataRows
        .map(function(lineStr) {
            return lineStr.split(",");   // Convert each line to array (,)
        })
        .slice(1);                       // Ignore header line

    // Convert to list of dicts. Each dict looks like:
    /*  {"2016-03-18":{
            "point (-2.2346505 53.4673973)":[
                {"how_feeling":{
                    "value":0,
                    "percent_score":null
                    },
                 "taken_meds_today":{
                    "value":0,
                    "percent_score":null
                 },
                 "nose":{
                    "value":0,
                    "percent_score":null
                 },
                 "eyes":{
                    "value":0,
                    "percent_score":null
                 },
                 "breathing":{
                    "value":0,
                    "percent_score":null
                 }
                }
               ],
             "point (-0.1150684 51.5225896)":
               [...]
            }
         }

    }*/

    // Itererate through lines
    for(var i=0; i<lines.length; i++){
        var dictItem = {};
        var line = lines[i];
        var timestamp = line[0];
        var geom = line[1];
        // Iterate through columns
        for(var j=2; j<line.length; j++){
            // Convert the string value read in from file into a float
            var fValue = parseFloat(line[j]);  // if not float, assigns null

            // Set the dictionary value
            dictItem[headers[j]] = {'value': fValue};

            // Collect all the values, so we can set z-scores (after outer (lines) loop has completed).
            if(!(headers[j] in allValues)){
                allValues[headers[j]] = {'values':[]};
            }
            allValues[headers[j]]['values'].push(fValue);
        }

        // Add or update the dictItem to dictAll
        if(!(timestamp in dictAll)){
            dictAll[timestamp] = {};
        }
        if(!(geom in dictAll[timestamp])) {
            dictAll[timestamp][geom] = [];
        }
        dictAll[timestamp][geom].push(dictItem);
    }

    // Now we have processed all values for each values column, set the z-scores.

    // Firstly calculate standard deviations and add to all_values dict
    for(var measurement in allValues){
        var valueSet = allValues[measurement];
        var meanStd = getMeanAndStandardDeviation(valueSet['values']);
        valueSet['mean'] = meanStd[0];
        valueSet['std_dev'] = meanStd[1];
        valueSet['min'] = Math.min.apply(null, valueSet['values']);
        valueSet['max'] = Math.max.apply(null, valueSet['values']);
    }


    // Iterate through timestamps
    for(var timestampKey in dictAll){
        // Iterate through locations
        for(var geomKey in dictAll[timestampKey]){
            // Iterate through items in same location
            for(var k=0; k<dictAll[timestampKey][geomKey].length; k++) {
                // Iterate through measurements
                for (var headerKey in dictAll[timestampKey][geomKey][k]) {
                    var curVal = dictAll[timestampKey][geomKey][k][headerKey]['value'];
                    // Calculate percentage score
                    var min = allValues[headerKey]['min'];
                    var max = allValues[headerKey]['max'];
                    var pScore = ((curVal - min) / (max - min)) * 100;

                    // Calculate Z-score: (value - mean) / standard deviation
                    var standardDev = allValues[headerKey]['std_dev'];
                    var mean = allValues[headerKey]['mean'];
                    var zScore = (curVal - mean) / standardDev;

                    dictAll[timestampKey][geomKey][k][headerKey]['z_score'] = zScore;
                    dictAll[timestampKey][geomKey][k][headerKey]['percent_score'] = pScore;
                    dictAll[timestampKey][geomKey][k][headerKey]['min'] = min;
                    dictAll[timestampKey][geomKey][k][headerKey]['max'] = max;
                    dictAll[timestampKey][geomKey][k][headerKey]['mean'] = mean;
                    dictAll[timestampKey][geomKey][k][headerKey]['std_dev'] = standardDev;
                }
            }
        }
    }
    // Return final dict
    return dictAll;
}

function getMeanAndStandardDeviation(colData) {
    var avg = average(colData);
    var squareDiffs = colData.map(function(value){
        var diff = value - avg;
        var sqrDiff = diff * diff;
        return sqrDiff;
    });

    var avgSquareDiff = average(squareDiffs);

    var stdDev = Math.sqrt(avgSquareDiff);
    return [avg, stdDev];
}

function average(data) {
    var sum = data.reduce(function (sum, value) {
        return sum + value;
    }, 0);

    var avg = sum / data.length;
    return avg;
}


// Map functions

function initialise_site_fields(){
    /*
            Add Site fields (to UI site selection/filtering mechanism)

     */

    $.getJSON(siteFieldsUrl, function (data) {
        // Add GeoJSON layer
        //alert(JSON.stringify(data));

        // Create the table for site fields
        var site_fields = '<table class="table table-striped">';

        for (var i=0; i<data.length; i++){
            var fieldName = data[i];

            // Add site field data to the table
            var row = '<tr class="select-button-row">' +
                '<td class="field-name">' + fieldName + '</td>' +
                '<td id="'+ slugify(fieldName) + '-used' +'" class="field-used chosen-option"></td></tr>';
            site_fields += row;
            // Add user input fields for selecting sites
            var rows =
                '<tr class="select-field-instructions info">' +
                    '<td></td>' +
                    '<td><div id="site-select-instructions">' +
                        '<em>Use comma delimited list of values <br> in <b>either</b> the ' +
                            '\'Select values\' <b>or</b> \'Omit values\' box. <br>' +
                            '(\'Omit values\' ignored if both used)' +
                '       </em></div>' +
                '   </td>' +
                '</tr>' +
                '<tr id="' + slugify(fieldName) + '-select' + '" class="selector-field info">' +
                    '<td>Select values:</td><td><input type="text" placeholder="E.G. a,b,c"></td>' +
                '</tr>' +
                '<tr id="' + slugify(fieldName) + '-omit' + '" class="omittor-field info">' +
                '   <td>Omit values:</td><td><input type="text" placeholder="E.G. a,b,c"></td>' +
                '</tr>';
            site_fields += rows;
        }
        site_fields += '</table>';

        // Add the table and instructions to the html div
        $('#collapseFilterSites').html(site_fields);

        // Toggle the field selector / omittor fields (and instructions div) until required
        $("tr.selector-field, tr.omittor-field, tr.select-field-instructions").hide(); //, #site-select-instructions").hide();

        $("table .select-button-row").on('click', function(){
            $(this).nextUntil("tr.select-button-row").toggle('slow');
        });

        // If user presses enter while in selector / omittor fields, turn inputs to json and update map (ajax call).
        $("tr.selector-field input, tr.omittor-field input").on('keypress', function(e){
            if(e.keyCode === 13){ // Enter key

                // Get the site field name to be filtered
                var fieldNameId = this.closest('tr').id;
                var fieldName2 = fieldNameId.replace('-select', '').replace('-omit','');

                // Find previous selection request value, (if it matches new then no need to update map).
                let prevVal = $(this.closest('table')).find("tr.select-button-row td#" + fieldName2 + '-used').html();

                // Get the text from the select/omit edit boxes
                var selectText = $('tr#' + fieldName2 + '-select input').val().trim();
                var omitText = $('tr#' + fieldName2 + '-omit input').val().trim();

                // If valid, create a newVal string and update the select/omit display div with this new value.
                if( selectText !== '' && check_site_select_params(selectText) === true) {
                    var newVal = '<em>Select: [' + selectText+ ']</em>';
                    $(this.closest('table')).find("tr.select-button-row td#" + fieldName2 + '-used').html(newVal);
                }else{
                    if( omitText !== '' && check_site_select_params(omitText) === true) {
                        var newVal = '<em>Omit: [' + omitText + ']</em>';
                        $(this.closest('table')).find("tr.select-button-row td#" + fieldName2 + '-used').html(newVal);
                    }else{
                        $(this.closest('table')).find("tr.select-button-row td#" + fieldName2 + '-used').html('');
                    }
                }

                // Check if this edit boxes select/omit values have changed. If so update map.
                if(newVal !== prevVal){
                    gapMap.updateTimeseries(get_site_select_url_params(), document.getElementById("timestamp-range").value);
                }
            }
        });
    });
}

function get_site_select_url_params(){
    var result = {'selectors':[]};
    $('#site-field-data table td.field-name').each(function(index){
        var fieldDict = {};
        var fieldName = $(this).html();
        var dictFieldName = {};

        var fieldSelectors = $(this).closest('tr').nextAll('tr.selector-field').first().find('input').val().trim();
        var fieldOmittors =  $(this).closest('tr').nextAll('tr.omittor-field') .first().find('input').val().trim();
        var fieldSelectorsJson = fieldSelectors.split(',').filter(Boolean);
        var fieldOmittorsJson =  fieldOmittors.split(',').filter(Boolean);

        if (fieldSelectorsJson.length > 0){
            dictFieldName['select_sites'] = fieldSelectorsJson.map(Function.prototype.call, String.prototype.trim);
        }else{
            if (fieldOmittorsJson.length > 0) {
                dictFieldName['omit_sites'] = fieldOmittorsJson.map(Function.prototype.call, String.prototype.trim);
            }
        }
        if(Object.keys(dictFieldName).length > 0){
            fieldDict[fieldName] = dictFieldName;
            result['selectors'].push(fieldDict);
        }
    });
    result['csrfmiddlewaretoken'] = getCookie('csrftoken');
    return result;
}

function check_site_select_params(paramString){
    //todo check params
    // Must return true for empty string
    return true;
}



function initialise_slider(value=0){
    var slider = document.getElementById("timestamp-range");
    var output = document.getElementById("current-time");
    slider.min = 0;
    slider.max = timestampList.length-1;
    slider.value = value;
    output.innerHTML = timestampList[value]; // Display the default slider value
    gapMap.updateTimeseries(get_site_select_url_params(), value);
    // Update the current slider value (each time you drag the slider handle)
    slider.oninput = function() {
        output.innerHTML = timestampList[this.value];
    };
    slider.onchange = function() {
        gapMap.updateTimeseries(get_site_select_url_params(), this.value);
    };

}



// File downloads

function download_csv(url, filename){
    xhr = $.ajax({
        url: url,
        headers: {"X-CSRFToken": csrftoken},
        dataType: 'text',
        method: 'POST',
        timeout: 60000,
        async: true,
        beforeSend: function () {
            // Set up loader display
            curLoader = new LoaderDisplay('loader-outer', '<p>Downloading ' + filename + '...</p>');
        },
        success: function (data) {
            /*
            A hack found online, to allow the use of success/fail callbacks by using js ajax call.
            The Django style technique was to call direct from a html link tag: <a href='[URL]'...>
                ...but this doesn't allow error/success/complete operations.
            A bit concerning that this method appears to call the url twice :/
             */
            if (!data.match(/^data:text\/csv/i)) {
                data = 'data:text/csv;charset=utf-8,' + data;
            }
            link = document.createElement('a');
            link.setAttribute('href', url);
            link.setAttribute('download', filename);
            link.click();
        },
        error: function (xhr, status, error) {
            if (xhr.statusText !== 'abort') {
                alert("There was an problem downloading the CSV data: "
                    + "url: " + url + '; '
                    + "message: " + error + "; "
                    + "status: " + xhr.status + "; "
                    + "status-text: " + xhr.statusText + "; "
                    + "error message: " + JSON.stringify(xhr));
            }
        },
        complete: function (request, status) {
            // Clear Loader
            curLoader.stopLoader('loader-outer');
        }
    })
};

function download_geojson(url, filename){
    xhr = $.ajax({
        url: url,
        dataType: 'json',
        async: true,
        beforeSend: function () {
            // Set up loader display
            curLoader = new LoaderDisplay('loader-outer', '<p>Downloading ' + filename + '...</p>');
        },
        success: function (data) {
            /*
            A hack found online, to allow the use of success/fail callbacks by using js ajax call.
            The Django style technique was to call direct from a html link tag: <a href='[URL]'...>
                ...but this doesn't allow error/success/complete operations.
            A bit concerning that this method appears to call the url twice :/
             */
            link = document.createElement('a');
            link.setAttribute('href', url);
            link.setAttribute('download', filename);
            link.click();
        },
        error: function (xhr, status, error) {
            if (xhr.statusText !== 'abort') {
                alert("There was an problem downloading the GeoJSON data: "
                    + "url: " + url + '; '
                    + "message: " + error + "; "
                    + "status: " + xhr.status + "; "
                    + "status-text: " + xhr.statusText + "; "
                    + "error message: " + JSON.stringify(xhr));
            }
        },
        complete: function (request, status) {
            // Clear Loader
            curLoader.stopLoader('loader-outer');
        }
    })
};


function download_json(url, filename){
    xhr = $.ajax({
        url: url,
        headers: {"X-CSRFToken": csrftoken},
        dataType: 'json',
        method: 'POST',
        timeout: 90000,
        async: true,
        beforeSend: function () {
            // Set up loader display
            curLoader = new LoaderDisplay('loader-outer', '<p>Downloading ' + filename + '...</p>');
        },
        success: function (data) {
            /*
            A hack found online, to allow the use of success/fail callbacks by using js ajax call.
            The Django style technique was to call direct from a html link tag: <a href='[URL]'...>
                ...but this doesn't allow error/success/complete operations.
            A bit concerning that this method appears to call the url twice :/
             */
            link = document.createElement('a');
            link.setAttribute('href', url);
            link.setAttribute('download', filename);
            link.click();
        },
        error: function (xhr, status, error) {
            if (xhr.statusText !== 'abort') {
                alert("There was an problem downloading the JSON data: "
                    + "url: " + url + '; '
                    + "message: " + error + "; "
                    + "status: " + xhr.status + "; "
                    + "status-text: " + xhr.statusText + "; "
                    + "error message: " + JSON.stringify(xhr));
            }
        },
        complete: function (request, status) {
            // Clear Loader
            curLoader.stopLoader('loader-outer');
        }
    })
};


// File downloads

function get_csv(url, filename='data.csv', jsonParams={}){
    xhr = $.ajax({
        url: url,
        data: JSON.stringify(jsonParams),
        headers: {"X-CSRFToken": csrftoken},
        dataType: 'text',
        method: 'POST',
        timeout: 40000,
        async: false,
        beforeSend: function () {
            // Set up loader display
            curLoader = new LoaderDisplay('loader-outer', '<p>Downloading ' + filename + '...</p>');
        },
        success: function (data) {
            if (!data.match(/^data:text\/csv/i)) {
                data = 'data:text/csv;charset=utf-8,' + data;
            }

            link = document.createElement('a');
            link.setAttribute('href', data);
            link.setAttribute('download', filename);
            link.click();

        },
        error: function (xhr, status, error) {
            if (xhr.statusText !== 'abort') {
                alert("There was an problem downloading the data: "
                    + "url: " + url + '; '
                    + "message: " + error + "; "
                    + "status: " + xhr.status + "; "
                    + "status-text: " + xhr.statusText + "; "
                    + "error message: " + JSON.stringify(xhr));
            }
        },
        complete: function (request, status) {
            // Clear Loader
            curLoader.stopLoader('loader-outer');
        }
    })
};


function getTimestampValue(data, timestamp) {
    for (var i=0; i<data.length; i++){
        if(data[i]['timestamp'].trim() == timestamp.trim()){
            //alert('timestamp: ' + timestamp + '; dataItem: ' + data[i]['timestamp']);
            return data[i]['percent_score'];
        }
    }
    return null;
}


function slugify(string) {
  const a = 'àáâäæãåāăąçćčđďèéêëēėęěğǵḧîïíīįìłḿñńǹňôöòóœøōõőṕŕřßśšşșťțûüùúūǘůűųẃẍÿýžźż·/_,:;'
  const b = 'aaaaaaaaaacccddeeeeeeeegghiiiiiilmnnnnoooooooooprrsssssttuuuuuuuuuwxyyzzz------'
  const p = new RegExp(a.split('').join('|'), 'g')

  return string.toString().toLowerCase()
    .replace(/\s+/g, '-') // Replace spaces with -
    .replace(p, c => b.charAt(a.indexOf(c))) // Replace special characters
    .replace(/&/g, '-and-') // Replace & with 'and'
    .replace(/[^\w\-]+/g, '') // Remove all non-word characters
    .replace(/\-\-+/g, '-') // Replace multiple - with single -
    .replace(/^-+/, '') // Trim - from start of text
    .replace(/-+$/, '') // Trim - from end of text
}

// Make the DIV element draggable:
// Code from: https://www.w3schools.com/howto/howto_js_draggable.asp
function dragElement(elmnt) {
  var pos1 = 0, pos2 = 0, pos3 = 0, pos4 = 0;
  if (document.getElementById(elmnt.id + "header")) {
    // if present, the header is where you move the DIV from:
    document.getElementById(elmnt.id + "header").onmousedown = dragMouseDown;
  } else {
    // otherwise, move the DIV from anywhere inside the DIV:
    elmnt.onmousedown = dragMouseDown;
  }

  function dragMouseDown(e) {
    e = e || window.event;
    e.preventDefault();
    // get the mouse cursor position at startup:
    pos3 = e.clientX;
    pos4 = e.clientY;
    document.onmouseup = closeDragElement;
    // call a function whenever the cursor moves:
    document.onmousemove = elementDrag;
  }

  function elementDrag(e) {
    e = e || window.event;
    e.preventDefault();
    // calculate the new cursor position:
    pos1 = pos3 - e.clientX;
    pos2 = pos4 - e.clientY;
    pos3 = e.clientX;
    pos4 = e.clientY;
    // set the element's new position:
    elmnt.style.top = (elmnt.offsetTop - pos2) + "px";
    elmnt.style.left = (elmnt.offsetLeft - pos1) + "px";
  }

  function closeDragElement() {
    // stop moving when mouse button is released:
    document.onmouseup = null;
    document.onmousemove = null;
  }
}

function get_region_default(){
    return '<p><b>Region: </b>None</p>' +
    '<table class="table table-striped">' +
        '<tr><td colspan="2"><p>Hover over regions to see region data.</p></td></tr></table>';
}

function get_site_default(){
    return '<table class="table table-striped">' +
            '<tr><td>A tool for estimating regional measurements based on known values and visualising the results. </br>' +
            'Site measurement data uses data from MEDMI and AURN, described in: <a href="https://zenodo.org/record/4315225#.X-9k_1P7RH5/" target = _blank>' +
                'https://zenodo.org/record/4315225#.X-9k_1P7RH5 </a></br>' +
            'Region estimations uses python library: <a href="https://pypi.org/project/region-estimators/" target = _blank>' +
                'https://pypi.org/project/region-estimators/ </a>' +
            '</td></tr>' +
            '<tr><td colspan="2"><p>Click on a site to see site info and the option to see site and estimated data across <em>all</em> timestamps.</p></td></tr>' +
            '<tr><td colspan="2"><p>If no sites exist for this timestamp, either: </p>' +
            '<p>(i) use slider to find another timestamp</p>' +
            '<p>(ii) use \'Select measurement\' option to change measurements.</p></td></tr>' +
        '</table>';
}

function cloneCanvas(oldCanvas) {

    //create a new canvas
    var newCanvas = document.createElement('canvas');
    var context = newCanvas.getContext('2d');

    //set dimensions
    newCanvas.width = oldCanvas.width;
    newCanvas.height = oldCanvas.height;

    //apply the old canvas to the new one
    context.drawImage(oldCanvas, 0, 0);

    //return the new canvas
    return newCanvas;
}

function showTimelineComparisons(measurement, siteId, regionId, siteName) {
    var estimationMethod = $("input[name='estimation-method']:checked").val();

    var listItem = document.createElement('a');
    listItem.className = "list-group-item list-group-item-action flex-column align-items-start site-chart";
    listItem.href = '#';
    var listItemDiv = document.createElement('div');
    listItemDiv.className = 'd-flex w-100 justify-content-between';
    var canvasItem = document.createElement('canvas');
    canvasItem.id = "site-chart";
    var newChartTitle = document.createElement('div');

    newChartTitle.innerHTML = '<p><b>Site Name: ' + siteName + '</b><br>' +
        'Measurment: ' + measurement + '<br>' +
        'Estimation Method: ' + estimationMethod + '</p>';

    listItemDiv.appendChild(newChartTitle);
    listItemDiv.appendChild(canvasItem);
    listItem.appendChild(listItemDiv);
    var list = document.getElementById('site-charts');
    list.insertBefore(listItem, list.firstChild);

    var ctx = canvasItem.getContext('2d');
    var listChart = new Chart(ctx, {
        // The type of chart we want to create
        type: 'line',
        // The data for our dataset
        data: {
            labels: timestampList,
            datasets: [],
        },
        // Configuration options go here
        options: {}
    });


    var modal = document.createElement('div');
    modal.className = 'modal';
    var modalContent = document.createElement('div');
    modalContent.className = 'modal-content';
    var span = document.createElement('span');
    span.className = "close";
    span.innerHTML = '&times';

    modalContent.appendChild(span);

    var modalCanvas = canvasItem.cloneNode(true);
    modalCanvas.id = 'modal-canvas';

    var ctxModal = modalCanvas.getContext('2d');
    var modalChart = new Chart(ctxModal, {
        // The type of chart we want to create
        type: 'line',
        // The data for our dataset
        data: {
            labels: timestampList,
            datasets: [],
        },
        // Configuration options go here
        options: {}
    });

    modalContent.appendChild(modalCanvas);
    modal.appendChild(modalContent);
    list.appendChild(modal);

    // When the user clicks the button, open the modal
    newChartTitle.onclick = function () {
        modal.style.display = "block";
    };

    // When the user clicks on <span> (x), close the modal
    span.onclick = function () {
        modal.style.display = "none";
    };

    // When the user clicks anywhere outside of the modal, close it
    window.onclick = function (event) {
        if (event.target == modal) {
            modal.style.display = "none";
        }
    };

    getActualTimeseries(measurement, siteId, listChart, modalChart);
    getEstimatedTimeseries(measurement, estimationMethod, regionId, siteId, listChart, modalChart);
}
window.showTimelineComparisons = showTimelineComparisons;


function getActualTimeseries(measurement, siteId, listChart, modalChart){
    //url: site_timeseries/<slug:measurement>/<int:site_id>

    var urlActual = siteTimeseriesUrl + '/' + measurement + '/' + siteId + '/';
    //alert(actualUrl);
    var self = this;
    xhr = $.ajax({
        url: urlActual,
        headers: {"X-CSRFToken": csrftoken},
        dataType: 'json',
        method: 'POST',
        timeout: 200000,
        async: true,
        success: function (data) {
            var values = [];
            for (var timestampIdx=0; timestampIdx<timestampList.length; timestampIdx++){
                values.push(getTimestampValue(data, timestampList[timestampIdx]));
            };
            listChart.data.datasets.push(
                    {
                        label: 'Site values',
                        backgroundColor: 'green',
                        borderColor: 'green',
                        fill:false,
                        data: values
                    }
            );
            listChart.update();
            modalChart.data.datasets.push(
                    {
                        label: 'Site values',
                        backgroundColor: 'green',
                        borderColor: 'green',
                        fill:false,
                        data: values
                    }
            );
            modalChart.update();
        },
        error: function (xhr, status, error) {
            if (xhr.statusText !== 'abort') {
                alert("There was an problem obtaining the site timeseries data: "
                    + "url: " + urlActual + '; '
                    + "message: " + error + "; "
                    + "status: " + xhr.status + "; "
                    + "status-text: " + xhr.statusText + "; "
                    + "error message: " + JSON.stringify(xhr));
            }
        }
    });
}

function getEstimatedTimeseries(measurement, method, regionId, ignoreSiteId, listChart, modalChart){
    //url: estimated_timeseries/<slug:method_name>/<slug:measurement>/<slug:region_id>/<int:ignore_site_id>/
    var urlEstimates = estimatedTimeseriesUrl + '/' + method + '/' + measurement + '/' + regionId + '/' + ignoreSiteId + '/';

    //alert(url_estimates);
    var self = this;
    xhr = $.ajax({
        url: urlEstimates,
        headers: {"X-CSRFToken": csrftoken},
        dataType: 'json',
        method: 'POST',
        timeout: 300000,
        async: true,
        success: function (data) {
            var estValues = [];
            for (var timestampIdx=0; timestampIdx<timestampList.length; timestampIdx++){
                estValues.push(getTimestampValue(data, timestampList[timestampIdx]));
            };
            listChart.data.datasets.push(
                    {
                        label: 'Estimated values',
                        backgroundColor: 'red',
                        borderColor: 'red',
                        fill:false,
                        data: estValues
                    }
            );
            listChart.update();
            modalChart.data.datasets.push(
                    {
                        label: 'Estimated values',
                        backgroundColor: 'red',
                        borderColor: 'red',
                        fill:false,
                        data: estValues
                    }
            );
            modalChart.update();
        },
        error: function (xhr, status, error) {
            if (xhr.statusText !== 'abort') {
                alert("There was an problem obtaining the estimated timeseries data: "
                    + "url: " + urlEstimates + '; '
                    + "message: " + error + "; "
                    + "status: " + xhr.status + "; "
                    + "status-text: " + xhr.statusText + "; "
                    + "error message: " + JSON.stringify(xhr));
            }
        }
    });
}


// ******************************************************************
// ****************** CSRF-TOKEN SET-UP *****************************
// ******************************************************************

// using jQuery
function getCookie(name) {
    var cookieValue = null;
    if (document.cookie && document.cookie !== '') {
        var cookies = document.cookie.split(';');
        for (var i = 0; i < cookies.length; i++) {
            var cookie = jQuery.trim(cookies[i]);
            // Does this cookie string begin with the name we want?
            if (cookie.substring(0, name.length + 1) === (name + '=')) {
                cookieValue = decodeURIComponent(cookie.substring(name.length + 1));
                break;
            }
        }
    }
    return cookieValue;
}

function csrfSafeMethod(method) {
    // these HTTP methods do not require CSRF protection
    return (/^(GET|HEAD|OPTIONS|TRACE)$/.test(method));
}

$.ajaxSetup({
    beforeSend: function(xhr, settings) {
        if (!csrfSafeMethod(settings.type) && !this.crossDomain) {
            xhr.setRequestHeader("X-CSRFToken", csrftoken);
        }
    }
});
// ******************************************************************
// ********************* CSRF-TOKEN END *****************************
// ******************************************************************