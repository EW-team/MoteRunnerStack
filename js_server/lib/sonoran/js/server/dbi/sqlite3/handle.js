//  (C) COPYRIGHT INTERNATIONAL BUSINESS MACHINES CORPORATION 2006-2008
//                       ALL RIGHTS RESERVED
//        IBM Research Division, Zurich Research Laboratory
// --------------------------------------------------------------------

Class.define(
    "DBI.Sqlite3.Handle",
    /**
     * @lends DBI.Sqlite3.Handle.prototype
     */
    {
	/**
	 * Wraps a native handle to a sqlite3 database. 
	 * <ul>
	 * <li>Use 'close' to close the handle.</li>
	 * <li>Use 'exec' to perform a SQL statement when no fine grained control over the statement is required</li>
	 * <li>Use 'perform' to prepare a SQL statement and use the statement methods in a provided callback function </li>
	 * <li>Use 'listDatabases','listTables', 'getTableInfo' to retrieve meta data</li>
	 * </ul>
	 * @constructs
	 * @param db        Native handle	
	 * @param name      Filename
	 */
	__constr__: function(/** Object */db, /** Strig */name) {
	    this.db = db;
	    this.name = name;
	    this.id2stmt = {};
	    this.enableLoadExtension(1, BLCK);
	},

	/**
	 * @type Object
	 * @private
	 */
	db: null,

	/**
	 * @type String
	 * @private
	 */
	name: null,

	/**
	 * Map id to statement instance.
	 * @type Object
	 * @private
	 */
	id2stmt: null,


	/**
	 * @returns {String}
	 */
	getName: function() {
	    return this.name;
	},

	/**
	 * @returns {DBI.Sqlite3.Statement}
	 * @private
	 */
	getStatement: function(/** Number */id) {
	    return this.id2stmt[id];
	},


	/**
	 * @param id
	 * @private
	 */
	removeStatement: function(/** Number */id) {
	    delete this.id2stmt[id];
	},

	/**
	 * @returns {Boolean}
	 * @private
	 */
	haveStatements: function() {
	    for (var id in this.id2stmt) {
		return true;
	    }
	    return false;
	},


	/**
	 * Close this database handle.
	 */
	close: function(/** DFLT_ASYNC_CB */callback) {
	    if (BC.is(callback)) { return BC.exec(arguments.callee, this, arguments); }
	    var _this = this;
	    for (var id in this.id2stmt) {
		this.id2stmt[id].finalize(BLCK);
	    }
	    var queue = DBI.Sqlite3.getQueue();
	    var cmd = queue.getCmd(DBI.Sqlite3.OP_CLOSE_V2, this, null, callback, function(blob) {
		if (blob.code !== 0) {
		    callback(new AOP.ERR(blob.code, sprintf("Operation failed: %d, %s", blob.code, blob.msg)));
		} else {
		    callback(new AOP.OK());
		}
	    });
	    queue.issue(cmd);
	},


	/**
	 * Prepare specified query and return a Statement instance.
	 * @param query
	 * @param callback
	 * @returns {DBI.Sqlite3.Statement}
	 */
	prepare: function(/** String */query, /** DFLT_ASYNC_CB */callback) {
	    if (BC.is(callback)) { return BC.exec(arguments.callee, this, arguments); }
	    var _this = this;
	    var queue = DBI.Sqlite3.getQueue();
	    var cmd = queue.getCmd(DBI.Sqlite3.OP_PREPARE_V2, this, null, callback, function(blob) {
		if (blob.code !== 0) {
		    callback(new AOP.ERR(blob.code, sprintf("Operation failed: %d, %s", blob.code, blob.msg)));
		    return;
		} 
		assert(typeof(blob.stmt!==undefined));
		var id = DBI.Sqlite3.Handle.STMT_ID;
		DBI.Sqlite3.Handle.STMT_ID += 1;
		var stmt = new DBI.Sqlite3.Statement(_this, id, blob.stmt);
		_this.id2stmt[id] = stmt;
		callback(new AOP.OK(stmt));
	    });
	    queue.issue(cmd, query);
	},


	    
	/**
	 * Prepare the specified query and call the given function with the resulting Statement
	 * instance. 
	 * @param query
	 * @returns {DBI.Sqlite3.Statement}
	 */
	perform: function(/** String */query, /** Function */f) {
	    var statement = this.prepare(query, BLCK);
	    try {
		f(statement);
	    } finally {
		statement.finalize(SCB);
	    }
	},



	/**
	 * Prepare and execte a statement. Returns Rows instance if statement returns
	 * any or null if not. 
	 * param {String} query
	 * @returns {DBI.Sqlite3.Rows} rows or null
	 */
	exec: function(query, /** DFLT_ASYNC_CB */callback) {
	    if (BC.is(callback)) { return BC.exec(arguments.callee, this, arguments); }
	    var queue = DBI.Sqlite3.getQueue();
	    var cmd = queue.getCmd(DBI.Sqlite3.OP_EXEC, this, null, callback, function(blob) {
		if (blob.code===0) {
		    if (blob.columns.length==0) {
			callback(new AOP.OK(null));
		    } else {
			var obj = new DBI.Sqlite3.Rows(blob.columns, blob.values);
			callback(new AOP.OK(obj));
		    }
		} else {
		    callback(new AOP.ERR(blob.code, sprintf("Operation failed: %d, %s", blob.code, blob.msg)));
		}
	    });
	    queue.issue(cmd, query);
	    // this.prepare(query, function(result) {
	    // 	if (result.code !== 0) {
	    // 	    callback(result);
	    // 	    return;
	    // 	} 
	    // 	var statement = result.getData();
	    // 	statement.fetchAllRows(function(result) {
	    // 	    statement.finalize(function(status) { ; });
	    // 	    if (result.code !== 0) {
	    // 		callback(result);
	    // 		return;
	    // 	    } 
	    // 	    var rows = result.getData();
	    // 	    callback((rows.getRowCnt() === 0) ? new AOP.OK(null) : result);		   
	    // 	});
	    // });
	},


	/**
	 * Switch on/off load extension support.
	 * @param onoff If true, extension loading is enabled
	 */
	enableLoadExtension: function(/** Boolean */flag, /** DFLT_ASYNC_CB */callback) {
	    if (BC.is(callback)) { return BC.exec(arguments.callee, this, arguments); }
	    var arg = flag?1:0;
	    var queue = DBI.Sqlite3.getQueue();
	    var cmd = queue.getCmd(DBI.Sqlite3.OP_ENABLE_LOAD_EXTENSION, this, null, callback, function(blob) {
		if (blob.code !== 0) {
		    callback(new AOP.ERR(blob.code, sprintf("Operation failed: %d, %s", blob.code, blob.msg)));
		} else {
		    callback(new AOP.OK());
		}
	    });
	    queue.issue(cmd, arg);
	},


	/**
	 * Return databases. Returns array with objects with keys
	 * id:Integer, name:String, file:String
	 * @returns {Object[]}
	 */
	listDatabases: function() {
	    var rows = this.exec("pragma database_list;", BLCK);
	    var values = rows.getRows();
	    var ret = [];
	    for (var i = 0; i < values.length; i++) {
		assert(values[i].length===3);
		ret.push({ id: values[i][0], name: values[i][1], file: values[i][2] });
	    }
	    return ret;
	},


	/**
	 * List tables in a database.
	 * @param name Database name, if null, 'main'
	 * @returns {Array} String array of table names
	 */
	listTables: function(/** String */name) {
	    if (!name) { name = "main"; }
	    var q;
	    if (name === "temp") {
		q = "SELECT 'temp.' || name FROM sqlite_temp_master" +
		    " WHERE type IN ('table','view')" +
		    "   AND name NOT LIKE 'sqlite_%'" +
		    "   AND name LIKE ?1";
	    } else {
		q = sprintf(
		    "SELECT '%q.' || name FROM \"%s\".sqlite_master" +
		    " WHERE type IN ('table','view')" +
		    "   AND name NOT LIKE 'sqlite_%%'" +
		    "   AND name LIKE ?1", name, name);
	    }
	    q = q + " ORDER BY 1";
	    var statement = this.prepare(q, BLCK);
	    statement.bindText(1, "%", BLCK);
	    var rows = statement.fetchAllRows(BLCK);
	    var values = rows.getRows();
	    var ret = [];
	    for (var i = 0; i < values.length; i++) {
		assert(values[i].length===1);
		ret.push(values[i][0].substr(name.length+1));
	    }
	    return ret;
	},


	/**
	 * Returns column objects with properties id:Number, name:String,
	 * type:String, nullable:Boolean, value:Object, pk:Number
	 * @param name
	 * @returns {Array}
	 */
	getTableInfo: function(/** String */name) {
	    var rows = this.exec(sprintf("pragma table_info(%s)", name), BLCK);
	    var values = rows.getRows();
	    var ret = [];
	    for (var i = 0; i < values.length; i++) {
		assert(values[i].length===6);
		ret.push({ 
		    id: values[i][0], 
		    name: values[i][1], 
		    type: values[i][2],
		    nullable: (values[i][3]==0),
		    value: values[i][4],
		    pk: values[i][5]
		});
	    }
	    return ret;
	},


	/**
	 * @private
	 */
	toString: function() {
	    return "DBI.Sqlite3.Handle";
	}
    },
    /**
     * @lends DBI.Sqlite3.Handle
     */
    {
	/**
	 * @type Number
	 * @private
	 */
	STMT_ID: 1
    }
);
