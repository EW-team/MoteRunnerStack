//  (C) COPYRIGHT INTERNATIONAL BUSINESS MACHINES CORPORATION 2006-2008
//                       ALL RIGHTS RESERVED
//        IBM Research Division, Zurich Research Laboratory
// --------------------------------------------------------------------




/**
 * @namespace DBI
 */
if (typeof(DBI) === "undefined") {
    DBI = {};
}


/**
 * @namespace DBI.Postgresql
 */
DBI.Postgresql = {
    /**
     * @private
     */
    BOOLEANS: {
	"TRUE" : true,
	"t" : true,
	"true" : true,
	"y" : true,
	"yes" : true,
	"on" : true,
	"1" : true
    },
    
    /**
     * Id used in commands sent to native thread.
     * @type Number
     * @private
     */
    COMMAND_ID: 1,

    /**
     * Queue to communicate with native thread.
     * @type DBI.Postgresql.Queue
     * @private
     */
    queue: null,

    /**
     * @returns {DBI.Postgresql.Queue}
     * @private
     */
    getQueue: function() {
	return this.queue;
    },


    /**
     * @param pgpass
     * @param expand_dbname
     * @returns {DBI.Postgresql.Connection}
     */
    connectPGpass: function(/** String */pgpass, /** Number */expand_dbname, /** DFLT_ASYNC_CB */callback) {
	if (BC.is(callback)) { return BC.exec(arguments.callee, this, arguments); }
	var _this = this;

	var sa = pgpass.split(':');
	if (sa.length != 5) {
	    throw new Exception("Invalid pgpass file format.");
	}
	var params = {
	    host: sa[0].trim(),
	    port: sa[1].trim(),
	    dbname: sa[2].trim(),
	    user: sa[3].trim(),
	    password: sa[4].trim()
	};
	return this.connectdbParams(params, expand_dbname, callback);
    },


    /**
     * Connect to Postgresql DB. 
     * @param key2value
     * @param expand_dbname   Ignored
     * @returns {DBI.Postgresql.Connection}
     */
    connectdbParams: function(/** Object */key2value, /** Number */expand_dbname, /** DFLT_ASYNC_CB */callback) {
	if (BC.is(callback)) { return BC.exec(arguments.callee, this, arguments); }
	var sa = [];
	for (var key in key2value) {
	    var value = key2value[key];
	    sa.push(key+"='"+value.replace(/'/g, "\\'")+"'");
	}
	return this.connectdb(sa.join(" "), callback);
    },

    

    /**
     * Connect to Postgresql DB. 
     * @param conninfo
     * @returns {DBI.Postgresql.Connection}
     */
    connectdb: function(/** String */conninfo, /** DFLT_ASYNC_CB */callback) {
	if (BC.is(callback)) { return BC.exec(arguments.callee, this, arguments); }
	var _this = this;
	println("DBI.Postgresql.connectdb: conninfo " + conninfo);
	var cmd = this.queue.getCmd(DBI.Postgresql.OP_PQconnectdb, null, null, callback, function(blob) {
	    if (blob.status != DBI.Postgresql.CONNECTION_OK) {
		callback(new AOP.ERR(DBI.Postgresql.CONNECTION_BAD, blob.errmsg));
	    } else {
		var conn = blob.conn;
		assert(conn);
		callback(new AOP.OK(new DBI.Postgresql.Connection(conn)));
	    }
	});
	this.queue.issue(cmd, conninfo);
    },
    
    /** 
     * @private
     */
    init: function() {	
	this.queue = new DBI.Postgresql.Queue();
	Core.addQ(this.queue);
	assert(this.queue.id>=6);
    }
};





/**
 * @class
 * @augments Core.Queue
 * @constructor
 * @private
 */
DBI.Postgresql.Queue = function() {
    Core.Queue.call(this);
    this.commandMap = {};
};

/** Prototype. */
DBI.Postgresql.Queue.prototype = extend(
    Core.Queue.prototype,
    /** @lends DBI.Postgresql.Queue.prototype */
    {
	/**
	 * Map of command id to Command instance
	 * @type Object
	 * @private
	 */
	commandMap: null,

	
	/**
	 * Packet from native code, a command response.
	 * @param blob
	 * @private
	 */
	onBlob: function(/** Object */blob) {
	    var cid = blob.cid;
	    //QUACK(0, "Command response: .." + blob.cid + ", " + blob.cop + ", " + blob.qid + ", " + blob.status + ", " + blob.errmsg);
	    assert(typeof(blob.status)==="number");
	    var cmd = this.commandMap[cid];
	    if (!cmd) {
		return;
	    }
	    delete this.commandMap[cid];
	    cmd.evaluator(blob);
	},

	
	/**
	 * Create a command.
	 * @param cop    Command operation
	 * @param conn   Connection
	 * @param result Result
	 * @param callback
	 * @param evaluator
	 * @returns {DBI.Postgresql.Command}
	 * @private
	 */
	getCmd: function(/** Number */cop, /** DBI.Postgresql.Connection */conn, /** DBI.Postgresql.Result */result, /** Function */callback, /** Function */evaluator) {
	    assert(typeof(callback) === 'function', "Missing callback function");
	    assert(typeof(evaluator) === 'function', "Missing evaluator function");
	    return new DBI.Postgresql.Command(this.id, cop, conn, result, callback, evaluator);
	},

	
	/**
	 * Issue a command.
	 * @param cmd
	 * @param args Variable argument list
	 * @private 
	 */
	issue: function(/** DBI.Postgresql.Command */cmd) {
	    var args = [ cmd.qid, cmd.cop, cmd.cid, cmd.conn ? cmd.conn.conn : null, cmd.result ? cmd.result.result : null ];
	    for (var i = 1; i < arguments.length; i++) {
		args.push(arguments[i]);
	    }
	    assert(!this.commandMap[cmd.cid]);
	    this.commandMap[cmd.cid] = cmd;
	    DBI.Postgresql.issue.apply(null, args);
	},

	
	/**
	 * @private
	 */
	toString: function() {
	    return "Postgresql";
	}
    }
);



/**
 * @class
 * @constructor
 * @param qid    Queue id
 * @param cop    Command operation id
 * @param conn   Connection
 * @param callback
 * @param evaluator
 * @private
 */
DBI.Postgresql.Command = function(/** Number */qid, /** Number */cop, /** DBI.Postgresql.Connection */conn, /** DBI.Postgresql.Result */result, /** DFLT_ASYNC_CB */callback, /** Function */evaluator) {
    assert(typeof(callback) === 'function', "Missing callback function");
    assert(typeof(evaluator) === 'function', "Missing evaluator function");
    this.qid = qid;
    assert(typeof(qid) === 'number');
    this.cop = cop;
    assert(typeof(cop) === 'number');
    this.conn = conn;
    this.result = result;
    this.cid = DBI.Postgresql.COMMAND_ID;
    DBI.Postgresql.COMMAND_ID += 1;
    this.callback = callback;
    this.evaluator = evaluator;
};














Class.define(
    "DBI.Postgresql.Connection",
    /**
     * @lends DBI.Postgresql.Connection.prototype
     */
    {
	/**
	 * DBI.Postgresql.Connection represents a connection to a Postgresql process.
	 * @constructs
	 * @param conn       Native handle	
	 */
	__constr__: function(/** Object */conn) {
	    this.conn = conn;
	    assert(this.conn);
	},

	/**
	 * @type Object
	 * @private
	 */
	conn: null,

	
	/**
	 * Close this connection.
	 */
	close: function(/** DFLT_ASYNC_CB */callback) {
	    if (BC.is(callback)) { return BC.exec(arguments.callee, this, arguments); }
	    var _this = this;
	    var cmd = DBI.Postgresql.queue.getCmd(DBI.Postgresql.OP_PQfinish, this, null, callback, function(blob) {
		var status = blob.status;
		assert(status===DBI.Postgresql.PGRES_COMMAND_OK);
		callback(new AOP.OK());
	    });
	    this.conn = null;
	    DBI.Postgresql.queue.issue(cmd);
	},


	/**
	 * Reset and reconnect.
	 */
	reset: function(/** DFLT_ASYNC_CB */callback) {
	    if (BC.is(callback)) { return BC.exec(arguments.callee, this, arguments); }
	    var _this = this;
	    var cmd = DBI.Postgresql.queue.getCmd(DBI.Postgresql.OP_PQreset, this, null, callback, function(blob) {
		if (blob.status != DBI.Postgresql.CONNECTION_OK) {
		    callback(new AOP.ERR(DBI.Postgresql.CONNECTION_BAD, blob.errmsg));
		} else {
		    callback(new AOP.OK());
		}
	    });
	    assert(cmd.conn);
	    DBI.Postgresql.queue.issue(cmd);
	},

	
	/**
	 * Perform a SQL query on the server.
	 * @param command
	 * @returns {DBI.Postgresql.Result}  Result or null (if command succeeded, but no data is retunred)
	 */
	exec: function(/** String */command, /** DFLT_ASYNC_CB */callback) {
	    if (BC.is(callback)) { return BC.exec(arguments.callee, this, arguments); }
	    var _this = this;
	    var cmd = DBI.Postgresql.queue.getCmd(DBI.Postgresql.OP_PQexec, this, null, callback, function(blob) {
		var status = blob.status;
		if (status === DBI.Postgresql.PGRES_COMMAND_OK) {
		    callback(new AOP.OK());
		} else if (status === DBI.Postgresql.PGRES_TUPLES_OK) {
		    assert(blob.ntuples!==undefined);
		    assert(blob.nfields!==undefined);
		    //QUACK(0, "NTUPLES, NFIELDS: " + blob.ntuples + ", " + blob.nfields);
		    callback(new AOP.OK(new DBI.Postgresql.Result(_this, blob.result, blob.ntuples, blob.nfields)));
		} else {
		    callback(new AOP.ERR(status, blob.errmsg));
		}
	    });
	    assert(cmd.conn);
	    DBI.Postgresql.queue.issue(cmd, command);
	},



	/**
	 * Perform a SQL query on the server.
	 * @param query
	 * @param paramValues
	 * @returns {DBI.Postgresql.Result}  Result or null (if command succeeded, but no data is retunred)
	 */
	execParams: function(/** String */query, /** String[] */paramValues, /** DFLT_ASYNC_CB */callback) {
	    if (BC.is(callback)) { return BC.exec(arguments.callee, this, arguments); }
	    var _this = this;
	    var cmd = DBI.Postgresql.queue.getCmd(DBI.Postgresql.OP_PQexecParams, this, null, callback, function(blob) {
		var status = blob.status;
		if (status === DBI.Postgresql.PGRES_COMMAND_OK) {
		    callback(new AOP.OK());
		} else if (status === DBI.Postgresql.PGRES_TUPLES_OK) {
		    assert(blob.ntuples!==undefined);
		    assert(blob.nfields!==undefined);
		    //QUACK(0, "NTUPLES, NFIELDS: " + blob.ntuples + ", " + blob.nfields);
		    callback(new AOP.OK(new DBI.Postgresql.Result(_this, blob.result, blob.ntuples, blob.nfields)));
		} else {
		    callback(new AOP.ERR(status, blob.errmsg));
		}
	    });
	    assert(cmd.conn);
	    DBI.Postgresql.queue.issue(cmd, query, paramValues);
	},

	
	/**
	 * Prepare a query.
	 * @param stmtName
	 * @param query
	 * @returns {DBI.Postgresql.Result}  Result 
	 */
	prepare: function(/** String */stmtName, /** String */query, /** DFLT_ASYNC_CB */callback) {
	    if (BC.is(callback)) { return BC.exec(arguments.callee, this, arguments); }
	    var _this = this;
	    var cmd = DBI.Postgresql.queue.getCmd(DBI.Postgresql.OP_PQprepare, this, null, callback, function(blob) {
		var status = blob.status;
		if (status === DBI.Postgresql.PGRES_COMMAND_OK) {
		    callback(new AOP.OK(new AOP.OK(stmtName)));
		} else {
		    callback(new AOP.ERR(status, blob.errmsg));
		}
	    });
	    assert(cmd.conn);
	    DBI.Postgresql.queue.issue(cmd, stmtName, query);
	},


	/**
	 * Perform a prepared query.
	 * @param stmtName
	 * @param paramValues
	 * @returns {DBI.Postgresql.Result}  Result or null (if command succeeded, but no data is retunred)
	 */
	execPrepared: function(/** String */stmtName, /** String[] */paramValues, /** DFLT_ASYNC_CB */callback) {
	    if (BC.is(callback)) { return BC.exec(arguments.callee, this, arguments); }
	    var _this = this;
	    var cmd = DBI.Postgresql.queue.getCmd(DBI.Postgresql.OP_PQexecPrepared, this, null, callback, function(blob) {
		var status = blob.status;
		if (status === DBI.Postgresql.PGRES_COMMAND_OK) {
		    callback(new AOP.OK());
		} else if (status === DBI.Postgresql.PGRES_TUPLES_OK) {
		    assert(blob.ntuples!==undefined);
		    assert(blob.nfields!==undefined);
		    //QUACK(0, "NTUPLES, NFIELDS: " + blob.ntuples + ", " + blob.nfields);
		    callback(new AOP.OK(new DBI.Postgresql.Result(_this, blob.result, blob.ntuples, blob.nfields)));
		} else {
		    callback(new AOP.ERR(status, blob.errmsg));
		}
	    });
	    assert(cmd.conn);
	    DBI.Postgresql.queue.issue(cmd, stmtName, paramValues);
	},


	
	/**
	 * @param tableName
	 * @returns {Object} Map of field name to type
	 * @private
	 */
	getTableInfo: function(/** String */tableName) {
	    var query = "select column_name, data_type, character_maximum_length from INFORMATION_SCHEMA.COLUMNS where table_name = $1";
	    var result = this.execParams(query, [ tableName ], BLCK);
	    var rows = result.getRows();
	    var ret = {};
	    for (var row = 0; row < rows.length; row++) {
		var name = rows[row][0];
		var type = rows[row][1];
		ret[name] = type;
	    }
	    return ret;
	},
	

	/**
	 * @private
	 */
	toString: function() {
	    return "DBI.Postgresql.Connection";
	}
    },
    /**
     * @lends DBI.Postgresql.Connection
     */
    {
	/**
	 * @type Number
	 * @private
	 */
	STMT_ID: 1
    }
);










Class.define(
    "DBI.Postgresql.Result",
    /**
     * @lends DBI.Postgresql.Result.prototype
     */
    {
	/**
	 * @constructs
	 * @param conn       Connection
	 * @param result     Native handle
	 * @param ntuples
	 * @param nfields
	 */
	__constr__: function(/** DBI.Postgresql.Connection */conn, /** Object */result, /** Number */ntuples, /** Number */nfields) {
	    this.conn = conn;
	    this.oids = null;
	    this.fnames = null;
	    this.rows = null;

	    var obj = DBI.Postgresql.Result.natGetValues(result, 0, ntuples);
	    //println(Util.formatData(obj));
	    
	    assert(obj.oids && obj.rows);
	    this.oids = obj.oids;
	    this.rows = obj.rows;
	    assert(this.rows.length==ntuples);
	    this.fnames = obj.fnames;

	    //println(this.toTable().render().join("\n"));
	},
	/**
	 * @type Object
	 * @private
	 */
	conn: null,
	/**
	 * @type Object
	 * @private
	 */
	result: null,
	/**
	 * @type String[]
	 * @private
	 */
	fnames: null,
	/**
	 * @type Number[]
	 * @private
	 */
	oids: null,
	/**
	 * @type Object[][]
	 * @private
	 */
	rows: null,
	
	/**
	 * @returns {Number} Number of rows
	 */
	getNumRows: function() {
	    return this.rows.length;
	},

	/**
	 * @returns {Number} Number of columns
	 */
	getNumColumns: function() {
	    return this.fnames.length;
	},

	/**
	 * @returns {String[]} Column names
	 */
	getColumnNames: function() {
	    return this.fnames;
	},
	
	/**
	 * Return array of result columns. 
	 * @param mapper Optional
	 * @returns {Object[][]} Rows
	 */
	getRows: function(/** Function */mapper) {
	    var rows = new Array(this.rows.length);
	    for (var row = 0; row < this.rows.length; row++) {
		var srcrow = this.rows[row];
		var dstrow = new Array(srcrow.length);
		rows[row] = dstrow;
		assert(srcrow.length==this.oids.length);
		for (var col = 0; col < this.oids.length; col++) {
		    var oid = this.oids[col];
		    var src = srcrow[col];
		    if (src == null) {
			dstrow[col] = null;
			continue;
		    }
		    if (mapper) {
			var o = mapper(this.fnames[col], src, row, col);
			if (o !== undefined) {
			    dstrow[col] = o;
			    continue;
			}
		    }
		    switch(oid) {
		    case DBI.Postgresql.BYTEAOID: {
			if (src.length>2 && (src.charAt(0) == '\\' && src.charAt(1) == 'x')) {
			    dstrow[col] = Formatter.hexToBin(src.substr(2));
			} else {
			    dstrow[col] = src;
			}
			break;
		    }
		    case DBI.Postgresql.BOOLOID: {
			dstrow[col] = DBI.Postgresql.BOOLEANS[src] ? true : false;
			break;
		    }
		    case DBI.Postgresql.TIMESTAMPOID: {
			var md = /\.([0-9]+)$/.exec(src);
			var micros = (md) ? md[1] : 0;
			//if (micros == 0) {
			//println("MICROS: " + micros);
			//}
			dstrow[col] = (new Date(src)).getTime() * 1000 + micros;
			break;
		    }
		    case DBI.Postgresql.DATEOID: {
			dstrow[col] = new Date(src);
			break;
		    }
		    case DBI.Postgresql.FLOAT4OID: 
		    case DBI.Postgresql.FLOAT8OID: {
			dstrow[col] = parseFloat(src);
		    }
		    case DBI.Postgresql.INT2OID:
		    case DBI.Postgresql.INT4OID: {
			dstrow[col] = parseInt(src);
			break;
		    }
		    case DBI.Postgresql.NUMERICOID:
		    default: {
			dstrow[col] = src;
		    }
		}
		}
	    }
	    //println(this.toTable(rows).render().join("\n"));
	    return rows;
	},


	/**
	 * @param mapper Optional
	 * @returns {Object[]} Array of rows where each row is a map of column name to value
	 */
	toObjects: function(/** Function */mapper) {
	    var rows = this.getRows(mapper);
	    var objs = new Array(rows.length);
	    for (var r = 0; r < rows.length; r++) {
		var row = rows[r];
		var obj = objs[r] = {};
		for (var c = 0; c < this.fnames.length; c++) {
		    obj[this.fnames[c]] = row[c];
		}
	    }
	    return objs;
	},
	
	
	/**
	 * @param rows Optional
	 * @returns {Util.Formatter.Table2} Table for text rendering
	 */
	toTable: function(/** Object[][] */rows) {
	    if (!rows) {
		rows = this.rows;
	    }
	    var t = new Util.Formatter.Table2(this.fnames.length);
	    t.setTitle(this.fnames);
	    //t.addRow(this.oids);
	    for (var i = 0; i < rows.length; i++) {
		assert(rows[i].length==this.fnames.length, "Numbers of elements in row do not match this result.");
		t.addRow(rows[i]);
	    }
	    return t;
	},
	
	/**
	 * @private
	 */
	toString: function() {
	    return sprintf("DBI.Postgresql.Result: %d '%s'", this.rows.length, this.fnames.join("','"));
	}
    }
);






Runtime.load("jspostgresql", "jspostgresql_init", DBI.Postgresql);

assert(DBI.Postgresql.CONNECTION_OK !== undefined);
assert(DBI.Postgresql.CONNECTION_BAD !== undefined);
assert(DBI.Postgresql.CONNECTION_BAD != 0);
assert(DBI.Postgresql.PGRES_COMMAND_OK !== undefined);
assert(DBI.Postgresql.PGRES_TUPLES_OK !== undefined);

DBI.Postgresql.init();
