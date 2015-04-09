//  (C) COPYRIGHT INTERNATIONAL BUSINESS MACHINES CORPORATION 2006-2008
//                       ALL RIGHTS RESERVED
//        IBM Research Division, Zurich Research Laboratory
// --------------------------------------------------------------------



Class.define(
    "DBI.Sqlite3.Statement",
    /**
     * @lends DBI.Sqlite3.Statement.prototype
     */
    {
	/**
	 * A handle to a sqlite3 statement. Sample code:
	 * <pre>
	 * db = Sqlite3.open("/tmp/DB", Sqlite3.SQLITE_OPEN_READWRITE, null, BLCK);
	 * db.perform("select * from table1 where ifield1>:name", function(stmt) {
	 *     println("Search rows with > 5...");
	 *     stmt.bindInt(":name", 5, BLCK);
	 *     var rows = stmt.fetchAllRows(BLCK);
	 *     println("ROWS:\n"+rows);
	 *     stmt.reset(BLCK);
	 *     println("Search rows with > 8...");
	 *     stmt.bindInt(":name", 8, BLCK);
	 *     var rows = stmt.fetchManyRows(2, BLCK);
	 *     println("ROWS:\n"+rows);
	 * });
	 * </pre>
	 * <ul>
	 * <li>Use 'fetchManyRows' and 'fetchAllRows' to fetch rows.</li>
	 * <li>Use 'reset' to reset a statements for restarting a fetch operation</li>
	 * <li>Use 'bind' to bind SQL parameters</li>
	 * </ul>
	 * @constructs
	 * @param handle
	 * @param id
	 * @param stmt        Native handle
	 */
	__constr__: function(/** DBI.Sqlite3.Handle */handle, /** Number */id, /** Object */stmt) {
	    this.handle = handle;
	    this.id = id;
	    this.stmt = stmt;
	},

	/**
	 * @type DBI.Sqlite3.Handle
	 * @private
	 */
	handle: null,

	/**
	 * @type Number
	 * @private
	 */
	id: -1,

	/**
	 * @type Object
	 * @private
	 */
	stmt: null,

	/**
	 * @throws Exception
	 * @private
	 */
	check: function() {
	    if (!this.handle.getStatement(this.id)) {
		throw new Exception("Sqlite3 statement already finalized.");
	    }
	},

	/**
	 * Low level interface to sqlite_step(). Returns SQLITE_DONE or SQLITE_ROW if 
	 * successful, otherwise AOP.ERR.
	 * @returns {Number}
	 * @private
	 */
	step: function(/** DFLT_ASYNC_CB */callback) {
	    if (BC.is(callback)) { return BC.exec(arguments.callee, this, arguments); }
	    this.check();
	    var _this = this;
	    var queue = DBI.Sqlite3.getQueue();
	    var cmd = queue.getCmd(DBI.Sqlite3.OP_STEP, this.handle, this, callback, function(blob) {
		switch(blob.code) {
		case DBI.Sqlite3.SQLITE_DONE:
		case DBI.Sqlite3.SQLITE_ROW:
		    callback(new AOP.OK(blob.code));
		    break;
		default:
		    callback(new AOP.ERR(blob.code, sprintf("Operation failed: %d, %s", blob.code, blob.msg)));
		} 
	    });
	    queue.issue(cmd, this.stmt);
	},


	/**
	 * Returns next row. step() must have been called before and evaluated.
	 * @returns {DBI.Sqlite3.Rows}
	 * @private
	 */
	row: function(/** DFLT_ASYNC_CB */callback) {
	    if (BC.is(callback)) { return BC.exec(arguments.callee, this, arguments); }
	    this.check();
	    var _this = this;
	    var queue = DBI.Sqlite3.getQueue();
	    var cmd = queue.getCmd(DBI.Sqlite3.OP_ROW, this.handle, this, callback, function(blob) {
		if (blob.code===0) {
		    var obj = new DBI.Sqlite3.Rows(blob.columns, blob.values);
		    callback(new AOP.OK(obj));
		} else {
		    callback(new AOP.ERR(blob.code, sprintf("Operation failed: %d, %s", blob.code, blob.msg)));
		} 
	    });
	    queue.issue(cmd, this.stmt);
	},


	/**
	 * Fetch 'cnt' rows, if -1 all available rows are fetched.
	 * @param cnt
	 * @returns {DBI.Sqlite3.Rows}
	 */
	fetchManyRows: function(/** Number */cnt, /** DFLT_ASYNC_CB */callback) {
	    if (BC.is(callback)) { return BC.exec(arguments.callee, this, arguments); }
	    this.check();
	    var _this = this;
	    var queue = DBI.Sqlite3.getQueue();
	    var cmd = queue.getCmd(DBI.Sqlite3.OP_ROWS, this.handle, this, callback, function(blob) {
		if (blob.code===0) {
		    var obj = new DBI.Sqlite3.Rows(blob.columns, blob.values);
		    callback(new AOP.OK(obj));
		} else {
		    callback(new AOP.ERR(blob.code, sprintf("Operation failed: %d, %s", blob.code, blob.msg)));
		} 
	    });
	    queue.issue(cmd, cnt);
	},


	/**
	 * Calls step and then retrieves the next row. If the statement has been fully
	 * executed, null is returned. 
	 * @returns {DBI.Sqlite3.Rows}
	 */
	fetchOneRow: function(/** DFLT_ASYNC_CB */callback) {
	    if (BC.is(callback)) { return BC.exec(arguments.callee, this, arguments); }
	    //this.fetchManyRows(1, callback);
	    this.check();
	    var _this = this;
	    this.step(function(result) {
	    	if (result.code !== 0) {
	    	    callback(result);
	    	    return;
	    	}
	    	var ret = result.getData();
	    	if (ret == DBI.Sqlite3.SQLITE_DONE) {
	    	    callback(new AOP.OK(null));
	    	    return;
	    	}
	    	_this.row(callback);
	    });
	},


	/**
	 * Fetch all rows and return result.
	 * @returns {DBI.Sqlite3.Rows}
	 */
	fetchAllRows: function(/** DFLT_ASYNC_CB */callback) {
	    if (BC.is(callback)) { return BC.exec(arguments.callee, this, arguments); }
	    this.fetchManyRows(-1, callback);
	},

	/**
	 * Calls the given function with a Rows instance retrieved from the database.
	 * If the function returns true, the retrieval is aborted. Any error during the 
	 * retrieveal is returned to the caller with an exception. 
	 * @param receiver
	 * @returns {Boolean} true if aborted by receiver function
	 */
	forEachRow: function(/** Function */receiver) {
	    this.check();
	    while(true) {
		var rows = this.fetchOneRow(BLCK);
		if (rows == null) {
		    return false;
		}
		var finish = receiver(rows);
		if (finish===true) {
		    return true;
		}
	    };
	},


	/**
	 * Wrapper to sqlite3_finalize, release resources associated with statement. Statements
	 * are automatically finalized when a database handle is closed or on return of a 'perform'
	 * invocation.
	 */
	finalize: function(/** DFLT_ASYNC_CB */callback) {
	    if (BC.is(callback)) { return BC.exec(arguments.callee, this, arguments); }
	    this.check();
	    this.handle.removeStatement(this.id);
	    var _this = this;
	    var queue = DBI.Sqlite3.getQueue();
	    var cmd = queue.getCmd(DBI.Sqlite3.OP_FINALIZE, this.handle, this, callback, function(blob) {
		if (blob.code===DBI.Sqlite3.SQLITE_OK) {
		    callback(new AOP.OK(blob.code));
		} else {
		    callback(new AOP.ERR(blob.code, sprintf("Operation failed: %d, %s", blob.code, blob.msg)));
		} 
	    });
	    queue.issue(cmd, this.stmt);
	},



	/**
	 * Reset statement to reevaluate.
	 */
	reset: function(/** DFLT_ASYNC_CB */callback) {
	    if (BC.is(callback)) { return BC.exec(arguments.callee, this, arguments); }
	    this.check();
	    var _this = this;
	    var queue = DBI.Sqlite3.getQueue();
	    var cmd = queue.getCmd(DBI.Sqlite3.OP_RESET, this.handle, this, callback, function(blob) {
		if (blob.code===DBI.Sqlite3.SQLITE_OK) {
		    callback(new AOP.OK(blob.code));
		} else {
		    callback(new AOP.ERR(blob.code, sprintf("Operation failed: %d, %s", blob.code, blob.msg)));
		} 
	    });
	    queue.issue(cmd, this.stmt);
	},


	/**
	 * Find the number of SQL parameters in a prepared statement.  
	 * @returns {Number}
	 */
	bindParameterCount: function(/** DFLT_ASYNC_CB */callback) {
	    if (BC.is(callback)) { return BC.exec(arguments.callee, this, arguments); }
	    this.check();
	    var _this = this;
	    var queue = DBI.Sqlite3.getQueue();
	    var cmd = queue.getCmd(DBI.Sqlite3.OP_BIND_PARAMETER_COUNT, this.handle, this, callback, function(blob) {
		assert(blob.code===DBI.Sqlite3.SQLITE_OK);
		assert(typeof(blob.value) === 'number');
		callback(new AOP.OK(blob.value));
	    });
	    queue.issue(cmd, this.stmt);
	},

	/**
	 * Returns the name of the N-th SQL parameter in the prepared statement.
	 * @param idx
	 * @returns {String}
	 */
	bindParameterName: function(/** Number */idx, /** DFLT_ASYNC_CB */callback) {
	    if (BC.is(callback)) { return BC.exec(arguments.callee, this, arguments); }
	    this.check();
	    var _this = this;
	    var queue = DBI.Sqlite3.getQueue();
	    var cmd = queue.getCmd(DBI.Sqlite3.OP_BIND_PARAMETER_NAME, this.handle, this, callback, function(blob) {
		assert(blob.code===DBI.Sqlite3.SQLITE_OK);
		assert(blob.value==null || typeof(blob.value)=='string');
		callback(new AOP.OK(blob.value));
	    });
	    queue.issue(cmd, idx);
	},


	/**
	 * Return the index of an SQL parameter given its name. 
	 * @param name
	 * @returns {Number}
	 */
	bindParameterIndex: function(/** String */name, /** DFLT_ASYNC_CB */callback) {
	    if (BC.is(callback)) { return BC.exec(arguments.callee, this, arguments); }
	    this.check();
	    var _this = this;
	    var queue = DBI.Sqlite3.getQueue();
	    var cmd = queue.getCmd(DBI.Sqlite3.OP_BIND_PARAMETER_INDEX, this.handle, this, callback, function(blob) {
		assert(blob.code===DBI.Sqlite3.SQLITE_OK);
		assert(typeof(blob.value) === 'number');		       
		callback(new AOP.OK(blob.value));
	    });
	    queue.issue(cmd, name);
	},


	/**
	 * Binding Values To Prepared Statements (Int).
	 * @param idx
	 * @param value
	 */
	bindInt: function(/** String|Number */idx, /** Number */value, /** DFLT_ASYNC_CB */callback) {
	    assert(typeof(value)==='number');
	    return this.bindAny(DBI.Sqlite3.OP_BIND_INT, idx, value, callback);
	},


	/**
	 * Binding Values To Prepared Statements (Double).
	 * @param idx
	 * @param value
	 */
	bindDouble: function(/** String|Number */idx, /** Number */value, /** DFLT_ASYNC_CB */callback) {
	    assert(typeof(value)==='number');
	    return this.bindAny(DBI.Sqlite3.OP_BIND_DOUBLE, idx, value, callback);
	},


	/**
	 * Binding Values To Prepared Statements (UTF8).
	 * @param idx
	 * @param value
	 */
	bindText: function(/** String|Number */idx, /** String */value, /** DFLT_ASYNC_CB */callback) {
	    assert(typeof(value)==='string');
	    return this.bindAny(DBI.Sqlite3.OP_BIND_TEXT, idx, value, callback);
	},


	/**
	 * Binding Values To Prepared Statements (Binary).
	 * @param idx
	 * @param value
	 */
	bindBlob: function(/** String|Number */idx, /** String */value, /** DFLT_ASYNC_CB */callback) {
	    assert(typeof(value)==='string');
	    return this.bindAny(DBI.Sqlite3.OP_BIND_BLOB, idx, value, callback);
	},


	/**
	 * Binding Values To Prepared Statements (NULL).
	 * @param idx
	 */
	bindNull: function(/** String|Number */idx, /** DFLT_ASYNC_CB */callback) {
	    assert(typeof(value)==='string');
	    return this.bindAny(DBI.Sqlite3.OP_BIND_NULL, idx, null, callback);
	},


	/**
	 * @param idx
	 * @param value
	 * @private
	 */
	bindAny: function(/** Number */operation, /** String|Number */idx, /** String */value, /** DFLT_ASYNC_CB */callback) {
	    if (BC.is(callback)) { return BC.exec(arguments.callee, this, arguments); }
	    this.check();
	    var _this = this;
	    var queue = DBI.Sqlite3.getQueue();
	    var cmd = queue.getCmd(operation, this.handle, this, callback, function(blob) {
		if (blob.code===DBI.Sqlite3.SQLITE_OK) {
		    callback(new AOP.OK());
		} else {
		    callback(new AOP.ERR(blob.code, sprintf("Operation failed: %d, %s", blob.code, blob.msg)));
		} 
	    });
	    queue.issue(cmd, idx, value);
	},


	/**
	 * Perform sequence of statement operations in specified function. On return, 
	 * statement is finalized.
	 * @param f Function receiving statement
	 */
	perform: function(/** Function */f) {
	    this.check();
	    try {
		f(this);
	    } finally {
		this.finalize(SCB);
	    }
	},

	/**
	 * @private
	 */
	toString: function() {
	    return "DBI.Sqlite3.Statement";
	}
    }
);
