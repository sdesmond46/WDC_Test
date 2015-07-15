describe('Simulator', function() {
	var simulator;

	beforeEach(function() {
		var mockiFrame = {};
		var mockContentWindow = {};
		mockiFrame.contentWindow = mockContentWindow;
		mockiFrame.contentWindow.postMessage = function(messagePayload, howMuch) {};
		simulator = new tabSimulatorObj(mockiFrame);
	});


	describe('Test updateSimulatorUI()', function() {
		var getHTMLElement = function(elementName) { return $('#' + elementName).find('text'); }

		beforeEach(function() {
			$('body').append("<div id='tableauObject'></tableauObject>");
			$('#tableauObject').append('<input type="text" id="connectionName"/>');
			$('#tableauObject').append('<input type="text" id="connectionData"/>');
			$('#tableauObject').append('<input type="text" id="incrementalExtractColumn"/>');
			$('#tableauObject').append('<input type="text" id="username"/>');
			$('#tableauObject').append('<input type="text" id="password"/>');
		});

		it('call function with nothing set', function() {
			simulator.updateSimulatorUI();
			expect($('#connectionName').val()).toBe("");
		});

		it('call function with input data', function() {
			simulator.connectionName = 'test connection name';
			simulator.updateSimulatorUI();
			expect($('#connectionName').val()).toBe('test connection name');
		});

		afterEach(function() {
			$('#tableauObject').remove();
		})
	});


	describe('Test submit()', function() {
		it('after loading page submit is active and uncalled', function() {
			expect(simulator._wasSubmitCalled).toBe(false);
		});

		it('call submit with no user input data', function() {
			simulator.submit();
			expect(simulator._wasSubmitCalled).toBe(true);
		});

		it('call submit with user input in a WDC', function() {
			simulator.password = 123456;
			simulator.submit();
			expect(simulator.password).toBe('123456');
		});
	});


	describe('Test initCallback()', function() {
		it('before init is called verify "interactivity" is active', function() {
			expect(simulator.phase).toBe('interactive');
			expect(simulator.phase).not.toBe('gatherData');
			expect(simulator._wasInitCallbackCalled).toBe(false);
		});

		it('verify the function is called', function() {
			simulator.initCallback()
			expect(simulator._wasInitCallbackCalled).toBe(true);
		});
	});


	describe('Test shutdownCallback()', function() {
		it('verify the function is called', function() {
			spyOn(console, 'log');
			simulator.shutdownCallback();
			expect(console.log).toHaveBeenCalled();
			expect(console.log).toHaveBeenCalledWith('shutdownCallback called. All done.');
		});
	});


	describe('Test both init and submit were called', function() {
		it('calling init followed by submit', function() {
			simulator.initCallback();
			simulator.submit();
			expect(simulator._wasInitCallbackCalled && simulator._wasSubmitCalled).toBe(true);
		});
	});


	describe('Test header and data callback functions', function() {
		var tableName = 'dataTable';

		var getTableRows = function(elementName, rowType) { return $('#' + elementName).find(rowType); }

		beforeEach(function() {
			$('body').append("<div id='fetchedData'><table id=" + tableName + "/></div>");
		});

		describe('Test headersCallback(titles, types)', function() {
			var errMsg = 'WDC error: header titles and types must be the same length';

			beforeEach(function() {
				$('#fetchedData').append("<tr id='headerTypeRow'/><tr id='headerNameRow'/>");
			});

			it('no headers or types are given', function() {
				simulator.headersCallback([], []);
				expect(simulator._tableTitles).toEqual([]);
			});

			it('types and headers are both given', function() {
				var fieldNames = ["id", "x", "day", "day_and_time", "true_or_false", "color"];
	    		var fieldTypes = ['int', 'float', 'date', 'datetime', 'bool', 'string'];
	    		simulator.headersCallback(fieldNames, fieldTypes);
	    		expect(simulator._tableTitles).toEqual(fieldNames);
	    		expect(getTableRows('headerTypeRow', 'th').length).toBe(6);
	    		expect(getTableRows('headerNameRow', 'th').length).toBe(6);
			});
		});

		describe('Test dataCallback(dataRows, recordsRead, moreData)', function() {
			it('function is called without data or column headers', function() {
				simulator.dataCallback([], [], false);
				expect(getTableRows(tableName, 'tr').length).toBe(0);
			});

			// test here runs single column of data then multiple columns
			// also tests clearing the data table private function.
			it('function called with basic data', function() {
				simulator._numreads = 0;
				simulator._tableTitles = ['col 1'];
				var data = [['test 1'], ['test 2'], ['test 3']];
				simulator.dataCallback(data, [], false);
				expect(getTableRows(tableName, 'tr').length).toBe(3);

				simulator._clearDataTable();
				// expected to be 2 rows (headers and types)
				expect($('#fetchedData').find('tr').length).toBe(2);
				expect($('#fetchedData').find('tr')[0].id).toBe('headerTypeRow');
				expect($('#fetchedData').find('tr')[1].id).toBe('headerNameRow');
				expect(simulator._numreads).toBe(1);

				simulator._tableTitles = ['col 1', 'col 2'];
				var data = [['test 1 1', 'test 1 2'], ['test 2 1', 'test 2 2'], ['test 3 1', 'test 3 2']];
				simulator.dataCallback(data, [], false);
				// 3 rows added to the table that already had rows for column
				// headers and types
				expect(getTableRows(tableName, 'tr').length).toBe(5);
				expect(getTableRows(tableName, 'td').length).toBe(6);
				expect(getTableRows(tableName, 'td')[0].innerHTML).toBe('test 1 1');
				expect(getTableRows(tableName, 'td')[5].innerHTML).toBe('test 3 2');
				expect(simulator._numreads).toBe(2);
			});

			it('data rows have more elements than the number of columns', function() {
				simulator._tableTitles = ['col 1'];
				var data = [['test 1 1', 'test 1 2'], ['test 2 1', 'test 2 2'], ['test 3 1', 'test 3 2']];
				simulator.dataCallback(data, [], false);
				expect(getTableRows(tableName, 'tr').length).toBe(3);
				expect(getTableRows(tableName, 'td')[0].innerHTML).toBe('test 1 1');
			});
		});

		afterEach(function() {
			$('#fetchedData').remove();
		});
	});


	//Logging Tests
	describe('Verify logging, tests simulator.log()', function() {
		var tableName = 'logTable';

		beforeEach(function() {
			$('body').append("<div id='log'><table id=" + tableName + " /></div>");
		});

		var getLogRows = function() { return $('#' + tableName).find('tr'); }

		it('single log entry and text work', function() {
			simulator.log('hello?');
			expect(getLogRows().length).toBe(1);
			expect(getLogRows().text()).toBe('hello?');
		});

		it('log has multiple entires and text', function() {
			for (var ii = 1; ii < 5; ++ii) {
				simulator.log('Test message ' + ii);
			}
			var expected = 'Test message 1Test message 2Test message 3Test message 4';
			expect(getLogRows().length).toBe(4);
			expect(getLogRows().text()).toBe(expected);
		});

		it('clearing log dumps previous entries', function() {
			for (var ii = 0; ii < 4; ++ii) {
				simulator.log('Test message ' + ii);
			}
			expect(getLogRows().length).toBe(4);
			_clearLog();
			expect(getLogRows().length).toBe(0);
		});

		it('logging displays user defined and default colors', function() {
			simulator.log('test message');
			expect(getLogRows()[0].style.color).toBe('rgb(68, 68, 68)');
			simulator.log('test message', '#4b2e83');
			expect(getLogRows()[1].style.color).toBe('rgb(75, 46, 131)');
		});

		it('logs to the console object', function() {
			spyOn(console, 'log');
			simulator.log('test message');
			expect(console.log).toHaveBeenCalledWith('test message');
		});

		it('logs warnings from function _warn(warningMessage)', function() {
			simulator._warn('test warning');
			expect(getLogRows().text()).toBe('Warning: test warning');
			expect(getLogRows()[0].style.color).toBe('orange');
		});

		it('logs errors from function _error(message)', function() {
			simulator._error('test error');
			expect(getLogRows().text()).toBe('ERROR: test error');
			expect(getLogRows()[0].style.color).toBe('red');
		});

		describe('Test abortWithError(errorMsg)', function() {
			it('verify error message is correctly logged', function() {
				expect( function() {simulator.abortWithError('test error')} ).toThrow("WDC error: test error");
				expect(getLogRows().text()).toBe('test error');
				expect(getLogRows()[0].style.color).toBe('red');
			});
		});

		describe('Verify the simulator logs the extract refresh column', function() {
			var fieldNames = ["id", "x", "day", "day_and_time", "true_or_false", "color"];
			var fieldTypes = ['int', 'float', 'date', 'datetime', 'bool', 'string'];

			it('incremental extract column is set and exists', function() {
				simulator.incrementalExtractColumn = 'id';
				simulator.headersCallback(fieldNames, fieldTypes);
    			expect(getLogRows().text()).toBe('');
			});

			it('incremental extract column is not set', function() {
				simulator.incrementalExtractColumn = 'not here';
				simulator.headersCallback(fieldNames, fieldTypes);
				errorMsg = 'Warning: Incremental refresh column is set but is not a column returned to Tableau, IncrementalExtractColumn: "not here"';
    			expect(getLogRows().text()).toBe(errorMsg);
			});
		});

		describe('test group for headersCallback function', function() {
			it('types are given but no headers', function() {
				var types = ['string', 'date', 'float'];
				simulator.headersCallback([], types);
				warningMsg = 'Warning: header titles and types must be the same length';
				expect(getLogRows().text()).toBe(warningMsg);
			});

			it('headers are included but no types', function() {
				var headers = ['header 1', 'header 2', 'header 3'];
				warningMsg = 'Warning: header titles and types must be the same length';
				simulator.headersCallback(headers, [])
				expect(getLogRows().text()).toBe(warningMsg);
			});
		});

		describe('test group for dataCallback function', function() {
			var logMessage = 'Maximum Number of Requests Reached';

			it('test max number of requests logs', function() {
				simulator._numreads = simulator._MAX_DATA_REQUEST_CALLS + 1;
				simulator.dataCallback([], [], false);
				expect(getLogRows().text()).toBe(logMessage);
				expect(getLogRows()[0].style.color).toBe('blue');
			});

			it('test all data is received', function() {
				simulator.dataCallback([], [], false);
				expect(getLogRows().text()).toBe('No More Data');
				expect(getLogRows()[0].style.color).toBe('blue');
			});

			it('test bad authentication error is posted to user', function() {
				simulator._authenticated = false;
				simulator.dataCallback([], [], true);
				expect(getLogRows().text()).toBe('ERROR: Authentication Failed:  Refusing to request data');
				expect(getLogRows()[0].style.color).toBe('red');
			});

			it('test multiple data requests till max request calls is reached', function() {
				simulator._numreads = 0;
				recordsRead = ['test 1', 'test 2', 'test 3', 'test 4', 'test 5', 'test 6'];
				for (var ii = 0; ii < recordsRead.length; ++ii) {
					simulator.dataCallback([], recordsRead[ii], true);
				}
				expect(getLogRows().text()).toBe(logMessage);
				expect(simulator._numreads).toBe(simulator._MAX_DATA_REQUEST_CALLS + 1);
			});

			it('test multiple data requests until the "moreData" flag changes to false', function() {
				simulator._numreads = 0;
				recordsRead = [['test 1', true], ['test 2', true], ['test 3', false]];
				for (var ii = 0; ii < recordsRead.length; ++ii) {
					simulator.dataCallback([], recordsRead[ii][0], recordsRead[ii][1]);
				}
				expect(getLogRows().text()).toBe('No More Data');
				expect(simulator._numreads).toBe(3);
			})
		})

		afterEach(function() {
			$('#log').remove();
		});
	});


	describe('Test reloadConnector()', function() {
		it('call reload connector after calling submit', function() {
			simulator.submit();
			expect(simulator._wasSubmitCalled).toBe(true);
			simulator.reloadConnector();
			expect(simulator._wasSubmitCalled).toBe(false);
		});
	});


	// Private functions that are regularly used. These are tested separately
	// to cover the needs of public functions and reduce tests higher up.
	// 
	// To note, not all private functions are specifically called out. If they
	// are called exclusively within above functions then they are tested in
	// that specific function.
	describe('Testing private functions in the Simulator', function() {

		describe('Test _ensureStringData(data)', function() {
			it('test string data', function() {
				expect(simulator._ensureStringData('testing')).toBe('testing');
			});

			it ('test non string data', function() {
				expect(simulator._ensureStringData(123456)).toBe('123456');
			});
		});


	    // Tests a very basic use case for building message payload
	    describe('Test _buildMessagePayload(msgName, msgData)', function() {
	    	it('message payload is empty with blank strings', function() {
	    		var expected = {"msgName":"","props":{"connectionName":"","connectionData":"","password":"","username":"","incrementalExtractColumn":null},"msgData":""};
	    		expect(simulator._buildMessagePayload('', '')).toBe(JSON.stringify(expected));
	    	});
	    });


	    // sets the properties then builds messages to verify correctly set
	    describe('Test _applyPropertyValues(props)', function() {
	    	it('set property values, payload is blank and payload is set', function() {
	    		var props = {'connectionName': 'testName', 'connectionData': 'testData', 'password': 'password', 'username': 'username', 'incrementalExtractColumn': 'testColumn'};
	    		simulator._applyPropertyValues(props);

	    		var expected1 = {"msgName":"","props":{"connectionName":"testName","connectionData":"testData","password":"password","username":"username","incrementalExtractColumn":'testColumn'},"msgData":""};
	    		expect(simulator._buildMessagePayload('','')).toBe(JSON.stringify(expected1));

	    		var expected2 = {"msgName":"test message name","props":{"connectionName":"testName","connectionData":"testData","password":"password","username":"username","incrementalExtractColumn":'testColumn'},"msgData":"test data"};
	    		expect(simulator._buildMessagePayload('test message name', 'test data')).toBe(JSON.stringify(expected2));
	    	});
	    });


	    describe('Test _packagePropertyValues()', function() {
	    	it('no props are set', function() {
	    		var expected = {'connectionName':'', 'connectionData':'', 'password':'', 'username':'', 'incrementalExtractColumn':null};
	    		var test = simulator._packagePropertyValues();
	    		expect(JSON.stringify(simulator._packagePropertyValues())).toBe(JSON.stringify(expected));
	    	});

	      // tests both cases when all properties are set and when all but the incremental column is set
	      it('props are set', function() {
	      	var expected1 = {'connectionName':'test name', 'connectionData':'test data', 'password':'password', 'username':'username', 'incrementalExtractColumn':'id'};
	      	simulator._applyPropertyValues(expected1);
	      	expect(JSON.stringify(simulator._packagePropertyValues())).toBe(JSON.stringify(expected1));

	      	var expected2 = {'connectionName':'test name', 'connectionData':'test data', 'password':'password', 'username':'username', 'incrementalExtractColumn':''};
	      	simulator._applyPropertyValues(expected2);
	      	expect(JSON.stringify(simulator._packagePropertyValues())).toBe(JSON.stringify(expected2));
	      });
	  });
	});

});
