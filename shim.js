(function() {
    if (typeof tableauVersionBootstrap === 'undefined') {
        // tableau version bootstrap isn't defined. We are likely running in the simulator so init up our tableau object
        tableau = {
            connectionName: "",
            connectionData: "",
            password: "",
            username: "",
            interactive: true,
            incrementalExtractColumn: "",

            initCallback: function () {
                _sendMessage("initCallback");
            },

            shutdownCallback: function () {
                _sendMessage("shutdownCallback");
            },

            submit: function () {
                _sendMessage("submit");
            },

            log: function (msg) {
                _sendMessage("log", {"logMsg": msg});
            },

            headersCallback: function (fieldNames, types) {
                _sendMessage("headersCallback", {"fieldNames": fieldNames, "types":types});
            },

            dataCallback: function (data, lastRecordToken, moreData) {
                _sendMessage("dataCallback", {"data": data, "lastRecordToken": lastRecordToken, "moreData": moreData});
            },
        };
    } else { // Tableau version bootstrap is defined. Let's use it
        tableauVersionBootstrap.ReportVersionNumber("1.1");
    }
    
    // Check if something weird happened during bootstraping. If so, just define a tableau object to we don't 
    // throw errors all over the place because tableau isn't defined
    if (typeof tableau === "undefined") {
        tableau = {}
    }
    
    // Assign the functions we always want to have available on the tableau object
    tableau.makeConnector = function() {
        return {};
    };

    tableau.registerConnector = function (wdc) {
        // do some error checking on the wdc
        var functionNames = ["init", "shutdown", "getColumnHeaders", "getTableData"]
        for (var ii = functionNames.length - 1; ii >= 0; ii--) {
            if (typeof(wdc[functionNames[ii]]) !== "function") {
                throw exception("The connector did not define the required function: " + functionNames[ii]);
            }
        };
        window._wdc = wdc;
    };

    function _sendPayload(messagePayload) {
        if (window.webkit && 
            window.webkit.messageHandlers && 
            window.webkit.messageHandlers.wdcTest) {

            window.webkit.messageHandlers.wdcTest.postMessage(messagePayload);
        } else {
            window.parent.postMessage(messagePayload, "*");
        }
    }

    function _sendMessage(msgName, msgData) {
        var messagePayload = _buildMessagePayload(msgName, msgData);

        _sendPayload(messagePayload);
        // window.parent.postMessage(messagePayload, "*");
    }

    function _buildMessagePayload(msgName, msgData) {
        var msgObj = {"msgName": msgName, 
                      "props": _packagePropertyValues(),  
                      "msgData": msgData};
        return JSON.stringify(msgObj);
    }

    function _packagePropertyValues() {
        var propValues = {"connectionName": tableau.connectionName, 
                          "connectionData": tableau.connectionData, 
                          "password": tableau.password, 
                          "username": tableau.username, 
                          "incrementalExtractColumn": tableau.incrementalExtractColumn,
                          "scriptVersion" : tableau.scriptVersion, // ADDED THESE THREE
                          "interactive" : tableau.interactive,
                          "APIVersion": tableau.APIVersion};
        return propValues;
    }

    function _applyPropertyValues(props) {
        if (props) {
            this.connectionName = props.connectionName;
            this.connectionData = props.connectionData;
            this.password = props.password;
            this.username = props.username;
            // this.incrementalExtractColumn = props.incrementalExtractColumn;
        }
    }

    function _receiveMessage(event) {
        var wdc = _wdc;
        var payloadObj = JSON.parse(event.data);
        var msgData = payloadObj.msgData;
        _applyPropertyValues(payloadObj.props);
        
        switch(payloadObj.msgName) {
            case "init":
                wdc.init();
            break;
            case "shutdown":
                wdc.shutdown();
            break;
            case "getColumnHeaders":
                wdc.getColumnHeaders();
            break;
            case "getTableData":
                wdc.getTableData(msgData.lastRecordToken);
            break;
        }
    };

    window.addEventListener('message', _receiveMessage, false);
})();