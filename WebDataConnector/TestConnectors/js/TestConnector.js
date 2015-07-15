var myConnector = tableau.makeConnector();

myConnector.init = function() 
{
  tryInitializeCallback();
}
 
myConnector.shutdown = function() {
  tableau.shutdownCallback();
}
 
myConnector.getColumnHeaders = function() {
  console.log("calling headersCallback");
  tableau.headersCallback(testConfig[s_fieldNames], testConfig[s_fieldTypes]);
}
 
myConnector.getTableData = function(lastRecordToken) {
  console.log("getTableData called with " + lastRecordToken);
  if (testConfig.hasOwnProperty(s_data)) {

    // the connector author has supplied us with the data they want sent back. Let's just use that
    // we will return the contents of the data property as is to facilitate error testing
    if (lastRecordToken) {
      tableau.dataCallback([], lastRecordToken, false);
    } else {
      tableau.dataCallback(testConfig[s_data], testConfig[s_lastRecordToken], true);
    }
  } 
  else if (testConfig.hasOwnProperty(s_chunkedData)) {
    var chunkedData = testConfig[s_chunkedData];
    var lastRecordNum = 0;
    if (lastRecordToken) {
      lastRecordNum = parseInt(lastRecordToken);
    }

    if (lastRecordNum >= chunkedData.length) {
      // This is the case where we have gone through all our chunks
      tableau.dataCallback([], lastRecordToken, false);
    } else {
      var currChunkData = chunkedData[lastRecordNum];
      var nextRecordNum = (lastRecordNum + 1);
      tableau.dataCallback(currChunkData, nextRecordNum.toString(), true);
    }
  } 
  else {

    // We need to generate some data for the connector. It should be deterministic about its output
    var totalRowCount = testConfig[s_numRows];
    var rowOffset = 0;
    var chunkSize = totalRowCount; // If we don't have a chunk size, that's how many rows were gonna get
    if (testConfig.hasOwnProperty(s_chunkSize)) {
      chunkSize = testConfig[s_chunkSize];
    }

    if (lastRecordToken) {
      rowOffset = parseInt(lastRecordToken);
    }

    // the genData function takes in a sentinal value and an incrementing function and returns an array of values
    var genData = function(startVal, incrementFunction) {
      var columnData = [];
      var currVal = startVal;
      for (var i = 0; i < rowOffset + chunkSize && i < totalRowCount; i++) {
        if (i >= rowOffset) {
          columnData.push(currVal);
        }
        currVal = incrementFunction(currVal); 
      }

      return columnData;
    }

    // generate our data as a columnar store. Then tranform it into rows for Tableau
    var results = [];
    for(var j = 0; j < testConfig[s_fieldTypes].length; j++) {
      var fieldType = testConfig[s_fieldTypes][j];
      var generatedData;
      if (fieldType == "bool") {
        generatedData = genData(true, function(val) {
          var newVal = !val;
          return newVal; // just invert the value every time
        });
      } else if (fieldType == "date") {
        generatedData = genData(new Date(1989, 01, 26), function(val) {
          var newDate = new Date(val.getTime());
          newDate.setDate(val.getDate() + 1); // Add 1 day to the current
          return newDate;
        });
      } else if (fieldType == "datetime") {
        generatedData = genData(new Date(2007, 01, 22, 3, 22, 1), function(val) {
          var newDate = new Date(val.getTime());
          newDate.setHours(val.getHours() + 1); // Add 1 hour to the current
          return newDate; 
        });
      } else if (fieldType == "float") {
        generatedData = genData(5.1, function(val) {
          var newFloat = val;
          newFloat += .11;
          return newFloat; 
        });
      } else if (fieldType == "int") {
        generatedData = genData(10, function(val) {
          var newInt = val;
          newInt += 1;
          return newInt; 
        });
      } else if (fieldType == "string") {
        generatedData = genData("!", function(val) {
          var newString = String.fromCharCode(val.charCodeAt(0) + 1);
          return newString; 
        });
      } else {
        reportTestConnectorError("Unknown field type encountered: " + fieldType);
      }

      results.push(generatedData);
    }

    // now that we've generated a bunch of data, throw it back to tableau
    var toRet = [];
    for (var ii = 0; ii < results[0].length; ii++) {
      var entry = {};
      for (var jj = 0; jj < testConfig[s_fieldNames].length; jj++) {
        var fieldName = testConfig[s_fieldNames][jj];
        var rowValue = results[jj][ii];
        entry[fieldName] = rowValue;
      }

      toRet.push(entry);
    }

    // Call back to tableau with the table data and the new record number (this is stored as a string)
    tableau.dataCallback(toRet, (rowOffset + toRet.length).toString(), toRet.length > 0);
  }
}
//------------------ END TABLEAU API STUFF ----------------------------------------------------------//

// This is the test config object we will use to specify our behavior
var testConfig = null;

// global config names:
var s_headless = "autoSubmit";
var s_delayTime = "delayTime";
var s_fieldNames = "fieldNames";
var s_fieldTypes = "fieldTypes";
var s_numRows = "numRows";
var s_data = "literalData";
var s_chunkedData = "chunkedData";
var s_connectionData = "connectionData";
var s_connectionName = "connectionName";
var s_chunkSize = "chunkSize";
var s_lastRecordToken = "lastRecordToken";

function tryInitializeCallback() {
  // we don't really know who's gonna win the race between loading the config and having tableau 
  // call initialize. Wait until tableau and our testConfig are ready before saying we are initialized
  if (testConfig == null || typeof tableau == 'undefined') {
    return; // not ready yet
  }

  tableau.initCallback();

  tableau.connectionData = testConfig[s_connectionData];
  tableau.connectionName = testConfig[s_connectionName];

  // Hide the usage info if we've successfully initialized
  $("#usageDiv").css("display", "none");

  // now that we're initialized, we need to check whether we are in interactive mode or not.
  // If non-interactive mode, we're done and can just wait for the callbacks to happen
  if (tableau.phase == tableau.phaseEnum.interactivePhase && testConfig[s_headless]) {

    $("#autoSubmitDiv").css("display", "block");

    // set a timeout to delay how long we wait until calling submit
    var endTime = Date.now();
    endTime += testConfig.delayTime;

    var intervalTimeRemaining = testConfig.delayTime;
    var intervalStep = 10;
    var intervalID = window.setInterval(function() {
      var timeRemaining = endTime - Date.now();

      if (timeRemaining < 0) {
        timeRemaining = 0;
      }

      var secondRemaining = Math.floor(timeRemaining / 1000);
      var msRemaining = timeRemaining - secondRemaining;

      var timeString = ("0" + secondRemaining).slice(-2) + "." + ("0" + msRemaining).slice(-3);
      $("#autoSubmitCountdown").text(timeString);

      if (timeRemaining <= 0) {
        window.clearInterval(intervalID);
        doSubmit();
      }
    }, intervalStep);
  } else {
    $("#manualSubmitDiv").css("display", "block");
  }
}

function doSubmit() {
  tableau.submit();
}

$(document).ready(function() {
    tableau.registerConnector(myConnector);
    
  $(".statusDiv").css("display", "none");

  var getConfigFileName = function() {
    var results = new RegExp('[\\?&]' + 'configFile' + '=([^&#]*)').exec(window.location.href);
    if (!results || results.length != 2) {
      return null;
    }

    return results[1];
  };

  // document is ready. Let's get our data file loaded up and do some work
  var configFileName = getConfigFileName();

  if (!configFileName) {
    reportTestConnectorError("No connector configuration file provided");
    return;
  }

  configFileName += "?dummyUniqueValue=" + (new Date()).getTime().toString(); // append the current date time to prevent caching
  $.getJSON(configFileName, function(data) {
    // Ok, we've got our data. Now lets do some work with it
    runTestConnector(data);
  })
  .fail(function() {
    reportTestConnectorError("There was an error retrieving: " + configFileName);
  })
});

function validateTestConnectorConfig(config) {
  var reportMissingElement = function(elementName) {
    reportTestConnectorError("The following element is missing from the config: " + elementName);
    return false;
  }

  if (!config.hasOwnProperty(s_headless))
    return reportMissingElement(s_headless);

  if (!config.hasOwnProperty(s_delayTime))
    return reportMissingElement(s_delayTime);

  if (!config.hasOwnProperty(s_fieldNames))
    return reportMissingElement(s_fieldNames);

  if (!config.hasOwnProperty(s_fieldTypes))
    return reportMissingElement(s_fieldTypes);

  if (!config.hasOwnProperty(s_numRows) && !config.hasOwnProperty(s_data) && !config.hasOwnProperty(s_chunkedData))
    return reportMissingElement(s_numRows + ", " + s_chunkedData + ", or " + s_data + ". One is required");  

  return true;
}

function runTestConnector(config) {
  console.log("config is: \n" + JSON.stringify(config, undefined, 2));

  // first go through and validate that everything we are expecting is there
  if (!validateTestConnectorConfig(config)) {
    reportTestConnectorError("The supplied config was invalid");
    return;
  }

  // now we just wait for tableau to start asking us for stuff
  testConfig = config;
  tryInitializeCallback();

  $("#inputForm").submit(function() { // This event fires when a button is clicked
    event.preventDefault();
    doSubmit();
  });
}

function reportTestConnectorError(msg) {
  $("#errorDiv").css("display", "block");
  console.log(msg);
  $("#errorMessage").text(msg);
}
