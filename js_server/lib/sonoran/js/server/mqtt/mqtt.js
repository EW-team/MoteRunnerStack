//  (C) COPYRIGHT INTERNATIONAL BUSINESS MACHINES CORPORATION 2006-2008
//                       ALL RIGHTS RESERVED
//        IBM Research Division, Zurich Research Laboratory
// --------------------------------------------------------------------



/**
 * @namespace MQTT
 */
MQTT = {
    /**
     * @type Number
     */
    STATE_CONNECTED: 1,

    /**
     * @type Number
     */
    STATE_DISCONNECTED: 2,


    /**
     * @type String[]
     */
    STATE_NAMES: [
       "INVALID", "CONNECTED", "DISCONNECTED"
    ],


    /**
     * Id used in commands sent to native thread.
     * @type Number
     * @private
     */
    COMMAND_ID: 1,

    /**
     * Queue to communicate with native thread.
     * @type MQTT.Queue
     * @private
     */
    queue: null,


    /**
     * Queue id, used by native code.
     * @type Number
     * @private
     */
    qid: null,


    /**
     * @type MQTT.Connections[]
     * @private
     */
    connections: [],


    /**
     * @returns {MQT.Queue}
     * @private
     */
    getQueue: function() {
	return this.queue;
    },


    /**
     * @param serverURI
     * @param clientId
     * @param username
     * @param password
     * @param ssl
     * @returns {MQTT.Connection}
     */
    connect: function(/** String */serverURI, /** String */clientId, /** String */username, /** String */password, /** Object */ssl, /** DFLT_ASYNC_CB */callback) {
	assert(arguments.length===6);
	if (BC.is(callback)) { return BC.exec(arguments.callee, this, arguments); }
	var conn = new MQTT.Connection(serverURI, clientId, username, password, ssl);
	this.connections.push(conn);
	var _this = this;
	conn.connect(function(result) {
	    if (result.code !== 0) {
		_this.removeConnection(conn);
	    } 
	    callback(result);
	});
    },
    

    /**
     * Dump all native constants.
     */
    dumpConstants: function() {
	for (var p in MQTT) {
            var v = MQTT[p];
            if (typeof(v) == 'number') {
		println(sprintf("%-50s= %d;", "MQTT."+p, v));
            }
	}
    },


    /**
     * @param handle
     * @returns{MQTT.Connection}
     * @private
     */
    lookupConnectionByHandle: function(/** Object */handle) {
	for (var i = 0; i < this.connections.length; i++) {
	    if (MQTT.compare(this.connections[i].handle, handle)) {
		return this.connections[i];
	    }
	}
	return null;
    },


    /**
     * @param conn
     * @private
     */
    removeConnection: function(/** MQTT.Connection */conn) {
	for (var i = 0; i < this.connections.length; i++) {
	    if (this.connections[i] == conn) {
		this.connections.splice(i, 1);
		return;
	    }
	}
    },
    
    /** 
     * @private
     */
    init: function() {	
	this.queue = new MQTT.Queue();
	Core.addQ(this.queue);
	this.qid = this.queue.getId();

	Runtime.load("jsmqtt", "jsmqtt_init", this);

	this.TYPE2NAME = {};
	for (var p in MQTT) {
	    if (/^TYPE_/.test(p)) {
		var v = MQTT[p];
		this.TYPE2NAME[v] = p;
	    }
	}
    }
};





/**
 * The queue to exchange commands with native thread.
 * @class
 * @augments Core.Queue
 * @constructor
 * @private
 */
MQTT.Queue = function() {
    Core.Queue.call(this);
    this.commandMap = {};
};

/** Prototype. */
MQTT.Queue.prototype = extend(
    Core.Queue.prototype,
    /** @lends MQTT.Queue.prototype */
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
	    assert(blob.type);
	    if (blob.type !== MQTT.TYPE_CMD_RESPONSE) {
		var conn = MQTT.lookupConnectionByHandle(blob.handle);
		if (conn) {
		    conn.onEvent(blob);
		}
	    } else {
		var cid = blob.cid;
		var cmd = this.commandMap[cid];
		if (!cmd) {
		    QUACK(0, "Ignore MQTT command response: " + Util.formatData(blob));
		    return;
		}
		delete this.commandMap[cid];
		cmd.evaluator(blob);
	    }
	},

	/**
	 * Create a command.
	 * @param cop    Command operation
	 * @param handle MQTT connection handle or null
	 * @param callback
	 * @param evaluator
	 * @returns {MQTT.Command}
	 * @private
	 */
	getCmd: function(/** Number */cop, /** Object */handle, /** Function */callback, /** Function */evaluator) {
	    assert(arguments.length===4);
	    assert(typeof(callback) === 'function', "Missing callback function");
	    assert(typeof(evaluator) === 'function', "Missing evaluator function");
	    return new MQTT.Command(cop, handle, callback, evaluator);
	},
	
	/**
	 * Issue a command.
	 * @param cmd
	 * @param args Variable argument list
	 * @private 
	 */
	issue: function(/** MQTT.Command */cmd) {
	    var args = [ cmd.cop, cmd.cid, cmd.handle ];
	    for (var i = 1; i < arguments.length; i++) {
		args.push(arguments[i]);
	    }
	    assert(!this.commandMap[cmd.cid]);
	    this.commandMap[cmd.cid] = cmd;
	    MQTT.issue.apply(null, args);
	},

	/**
	 * @private
	 */
	toString: function() {
	    return "MQTT";
	}
    }
);

/**
 * Command.
 * @class
 * @constructor
 * @param cop    Command operation id
 * @param handle Connection handle
 * @param callback
 * @param evaluator
 * @private
 */
MQTT.Command = function(/** Number */cop, /** MQTT.Handle */handle, /** DFLT_ASYNC_CB */callback, /** Function */evaluator) {
    assert(typeof(callback) === 'function', "Missing callback function");
    assert(typeof(evaluator) === 'function', "Missing evaluator function");
    this.cop = cop;
    assert(typeof(cop) === 'number');
    this.handle = handle;
    this.cid = MQTT.COMMAND_ID;
    MQTT.COMMAND_ID += 1;
    this.callback = callback;
    this.evaluator = evaluator;
};



Runtime.include("./connection.js");


MQTT.init();












