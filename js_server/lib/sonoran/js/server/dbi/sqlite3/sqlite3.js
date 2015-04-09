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
 * @namespace DBI.Sqlite3
 */
DBI.Sqlite3 = {
    /**
     * Id used in commands sent to native thread.
     * @type Number
     * @private
     */
    COMMAND_ID: 1,

    /**
     * Queue to communicate with native thread.
     * @type DBI.Sqlite3.Queue
     * @private
     */
    queue: null,

    /**
     * @returns {DBI.Sqlite3.Queue}
     * @private
     */
    getQueue: function() {
	return this.queue;
    },


    /**
     * Open a sqlite3 database and return a handle to it.
     * @param filename   Filename
     * @param flags      Mask of flags such as Sqlite3.SQLITE_OPEN_READWRITE, Sqlite3.SQLITE_OPEN_CREATE
     * @param zVfs
     * @returns {DBI.Sqlite3.Handle}
     */
    open: function(/** String */filename, /** Number */flags, /** String */zVfs, /** DFLT_ASYNC_CB */callback) {
	if (BC.is(callback)) { return BC.exec(arguments.callee, this, arguments); }
	var _this = this;
	var cmd = this.queue.getCmd(DBI.Sqlite3.OP_OPEN_V2, null, null, callback, function(blob) {
	    if (blob.code !== 0) {
		callback(new AOP.ERR(blob.code, sprintf("Operation failed: %d, %s", blob.code, blob.msg)));
	    } else {
		var db = blob.db;
		assert(db !== undefined);
		var handle = new DBI.Sqlite3.Handle(db, filename);
		callback(new AOP.OK(handle));
	    }
	});
	this.queue.issue(cmd, filename, flags, zVfs);
    },
    

    /**
     * Dump all native sqlite3 constants in DBI.Sqlite3 using println.
     */
    dumpConstants: function() {
	for (var p in DBI.Sqlite3) {
            var v = DBI.Sqlite3[p];
            if (typeof(v) == 'number') {
		println(sprintf("%-50s= %d;", "DBI.Sqlite3."+p, v));
            }
	}
    },


    /**
     * Map column type constant (INTEGER, TEXT..) to string.
     * @param ct
     * @returns {String}
     */
    columnType2Str: function(/** Number */ct) {
	switch(ct) {
	case DBI.Sqlite3.SQLITE_INTEGER:
	    return "INTEGER";
	case DBI.Sqlite3.SQLITE_FLOAT:
	    return "FLOAT";
	case DBI.Sqlite3.SQLITE_TEXT:
	    return "TEXT";
	case DBI.Sqlite3.SQLITE_BLOB:
	    return "BLOB";
	case DBI.Sqlite3.SQLITE_NULL:
	    return "NULL";
	default:
	    ;
	}
	throw new Exception("Invalid column type: " + ct);
    },

    
    /** 
     * @private
     */
    init: function() {	
	this.queue = new DBI.Sqlite3.Queue();
	Core.addQ(this.queue);
	assert(this.queue.id>=6);
    }
};





/**
 * The queue to exchange sqlite3 commands with native thread.
 * @class
 * @augments Core.Queue
 * @constructor
 * @private
 */
DBI.Sqlite3.Queue = function() {
    Core.Queue.call(this);
    this.commandMap = {};
};

/** Prototype. */
DBI.Sqlite3.Queue.prototype = extend(
    Core.Queue.prototype,
    /** @lends DBI.Sqlite3.Queue.prototype */
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
	    var cmd = this.commandMap[cid];
	    if (!cmd) {
		QUACK(0, "Ignore command response: " + Util.formatData(blob));
		return;
	    }
	    delete this.commandMap[cid];
	    cmd.evaluator(blob);
	},

	/**
	 * Create a command.
	 * @param cop    Command operation
	 * @param handle Db handle or null
	 * @param handle Statement handle or null
	 * @param callback
	 * @param evaluator
	 * @returns {DBI.Sqlite3.Command}
	 * @private
	 */
	getCmd: function(/** Number */cop, /** DBI.Sqlite3.Handle */handle, /** DBI.Sqlite3.Handle */statement, /** Function */callback, /** Function */evaluator) {
	    assert(typeof(callback) === 'function', "Missing callback function");
	    assert(typeof(evaluator) === 'function', "Missing evaluator function");
	    return new DBI.Sqlite3.Command(this.id, cop, handle, statement, callback, evaluator);
	},
	
	/**
	 * Issue a command.
	 * @param cmd
	 * @param args Variable argument list
	 * @private 
	 */
	issue: function(/** DBI.Sqlite3.Command */cmd) {
	    var args = [ cmd.qid, cmd.cop, cmd.cid, cmd.handle ? cmd.handle.db : null, cmd.statement ? cmd.statement.stmt : null ];
	    for (var i = 1; i < arguments.length; i++) {
		args.push(arguments[i]);
	    }
	    assert(!this.commandMap[cmd.cid]);
	    this.commandMap[cmd.cid] = cmd;
	    DBI.Sqlite3.issue.apply(null, args);
	},

	/**
	 * @private
	 */
	toString: function() {
	    return "Sqlite3";
	}
    }
);

/**
 * Command.
 * @class
 * @constructor
 * @param qid    Queue id
 * @param cop    Command operation id
 * @param handle DB handle
 * @param callback
 * @param evaluator
 * @private
 */
DBI.Sqlite3.Command = function(/** Number */qid, /** Number */cop, /** DBI.Sqlite3.Handle */handle, /** DBI.Sqlite3.Handle */statement, /** DFLT_ASYNC_CB */callback, /** Function */evaluator) {
    assert(typeof(callback) === 'function', "Missing callback function");
    assert(typeof(evaluator) === 'function', "Missing evaluator function");
    this.qid = qid;
    assert(typeof(qid) === 'number');
    this.cop = cop;
    assert(typeof(cop) === 'number');
    this.handle = handle;
    this.statement = statement;
    this.cid = DBI.Sqlite3.COMMAND_ID;
    DBI.Sqlite3.COMMAND_ID += 1;
    this.callback = callback;
    this.evaluator = evaluator;
};



Runtime.include("./handle.js");
Runtime.include("./statement.js");
Runtime.include("./row.js");
Runtime.include("./cli.js");

Runtime.load("jssqlite3", "jssqlite3_init", DBI.Sqlite3);

DBI.Sqlite3.init();












