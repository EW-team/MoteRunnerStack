//  (C) COPYRIGHT INTERNATIONAL BUSINESS MACHINES CORPORATION 2006-2008
//                       ALL RIGHTS RESERVED
//        IBM Research Division, Zurich Research Laboratory
// --------------------------------------------------------------------

Class.define(
    "MQTT.Connection",
    /**
     * @lends MQTT.Connection.prototype
     */
    {
	/**
	 * @constructs
	 * @param serverURI
	 * @param clientId
	 */
	__constr__: function(/** String */serverURI, /** String */clientId, /** String */username, /** String */password, /** Object */ssl) {
	    this.state = MQTT.STATE_DISCONNECTED;
	    this.serverURI = serverURI;
	    this.clientId  = clientId;
	    this.username = username;
	    this.password = password;
	    this.ssl = ssl;
	    this.handle = null;
	},

	/**
	 * @type Object
	 * @private
	 */
	handle: null,

	/**
	 * @type Number
	 * @private
	 */
	state: 0,

	/**
	 * @type Object
	 * @private
	 */
	serverURI: null,

	/**
	 * @type String
	 * @private
	 */
	clientId: null,


	/**
	 * @returns {String}
	 * @private
	 */
	getHandle: function() {
	    return this.handle;
	},


	/**
	 * @param ev
	 * @private
	 */
	onEvent: function(/** Object */blob) {
	    //QUACK(0, "EV: " + blob.type + ", " + blob.i1 + ", " + blob.i2 + ", " + blob.s1 + ", " + blob.s2);
	    switch(blob.type) {
	    case MQTT.TYPE_CONN_FAILURE:
		this.state = MQTT.STATE_DISCONNECTED;
	    case MQTT.TYPE_SEND_FAILURE:
	    case MQTT.TYPE_SUBSCRIBE_FAILURE:
	    case MQTT.TYPE_DISCONNECT_FAILURE:
		this.onFailure(blob.type, blob.i1, blob.i2, blob.s1);
		break;
	    case MQTT.TYPE_CONN_SUCCESS:
		this.state = MQTT.STATE_CONNECTED;
	    case MQTT.TYPE_SEND_SUCCESS:
	    case MQTT.TYPE_SUBSCRIBE_SUCCESS:
	    case MQTT.TYPE_DISCONNECT_SUCCESS:
		this.onSuccess(blob.type, blob.i1);
		break;
	    case MQTT.TYPE_MESSAGE_ARRIVED: 
		//QUACK(0, "MESSAGE: " + blob.s1 + ", " + blob.s2);
		this.onMessage(blob.s1, blob.s2);
		break;
	    case MQTT.TYPE_CONN_LOST:
		this.state = MQTT.STATE_DISCONNECTED;
		break;
	    }
	//QUACK(0, "EV: " + this);
	},


		
	/**
	 * @param type
	 * @param token
	 * @param code
	 * @param message
	 */
	onFailure: function(/** Number */type, /** Number */token, /** Number */code, /** String */message) {
	    QUACK(0, sprintf("%s: token %d, code %d, %s", MQTT.TYPE2NAME[type], token, code, message));
	},


	/**
	 * @param type
	 * @param token
	 * @param code
	 * @param message
	 */
	onSuccess: function(/** Number */type, /** Number */token) {
	    //QUACK(0, sprintf("%s: token %d", MQTT.TYPE2NAME[type], token));
	},


	/**
	 * @param type
	 * @param token
	 * @param code
	 * @param message
	 */
	onMessage: function(/** String */topic, /** String */data) {
	    QUACK(0, sprintf("MQTT message: %s %s", topic, data));
	},


	/**
	 * @param state
	 * @private
	 */
	wait4State: function(/** Number */state, /** DFLT_ASYNC_CB */callback) {
	    if (BC.is(callback)) { return BC.exec(arguments.callee, this, arguments); }
	    var _this = this;
	    var counter = 500;
	    var f = function() {
		if (_this.state == state) {
		    callback(new AOP.OK());
		    return;
		}
		counter--;
		if (counter == 0) {
		    callback(new AOP.ERR(sprintf("Connection not in state: %s", MQTT.STATE_NAMES[state])));
		    return;
		}
		Timer.timeoutIn(200, f);
	    };
	    f();
	},



	/**
	 * @returns {Boolean}
	 */
	isConnected: function() {
	    return this.state == MQTT.STATE_CONNECTED;
	},


	/**
	 */
	connect: function(/** DFLT_ASYNC_CB */callback) {
	    if (BC.is(callback)) { return BC.exec(arguments.callee, this, arguments); }
	    assert(this.state == MQTT.STATE_DISCONNECTED);
	    var _this = this;
	    var cmd = MQTT.queue.getCmd(MQTT.OP_CONNECT, null, callback, function(blob) {
		if (blob.code !== 0) {
		    callback(new AOP.ERR(blob.code, sprintf("Operation failed: %d, %s", blob.code, blob.msg)));
		} else {
		    var handle = blob.handle;
		    assert(handle !== undefined);
		    _this.handle = handle;
		    callback(new AOP.OK(_this));
		}
	    });
	    MQTT.queue.issue(cmd, this.serverURI, this.clientId, this.username, this.password, this.ssl);
	},


	/**
	 * Close connecton.
	 */
	disconnect: function(/** DFLT_ASYNC_CB */callback) {
	    if (BC.is(callback)) { return BC.exec(arguments.callee, this, arguments); }
	    this.state = MQTT.STATE_DISCONNECTED;
	    var _this = this;
	    var queue = MQTT.getQueue();
	    var cmd = queue.getCmd(MQTT.OP_DISCONNECT, this.handle, callback, function(blob) {
		MQTT.removeConnection(_this);
		if (blob.code !== 0) {
		    callback(new AOP.ERR(blob.code, sprintf("Operation failed: %d, %s", blob.code, blob.msg)));
		} else {
		    callback(new AOP.OK());
		}
	    });
	    queue.issue(cmd);
	},


	/**
	 * @param destinationName
	 * @param payload
	 * @param qos
	 * @param callback
	 */
	send: function(/** String */destinationName, /** String */payload, /** Number */qos, /** DFLT_ASYNC_CB */callback) {
	    if (BC.is(callback)) { return BC.exec(arguments.callee, this, arguments); }
	    var _this = this;
	    this.wait4State(MQTT.STATE_CONNECTED, function(result) {
		if (result.code !== 0) {
		    callback(result);
		    return;
		}
		var queue = MQTT.getQueue();
		var cmd = queue.getCmd(MQTT.OP_SEND, _this.handle, callback, function(blob) {
		    if (blob.code !== 0) {
			callback(new AOP.ERR(blob.code, sprintf("Operation failed: %d, %s", blob.code, blob.msg)));
		    } else {
			callback(new AOP.OK());
		    }
		});
		queue.issue(cmd, destinationName, payload, qos);
	    });
	},



	/**
	 * @param topic
	 * @param qos
	 * @param callback
	 */
	subscribe: function(/** String */topic, /** Number */qos, /** DFLT_ASYNC_CB */callback) {
	    if (BC.is(callback)) { return BC.exec(arguments.callee, this, arguments); }
	    var _this = this;
	    this.wait4State(MQTT.STATE_CONNECTED, function(result) {
		if (result.code !== 0) {
		    callback(result);
		    return;
		}
		var queue = MQTT.getQueue();
		var cmd = queue.getCmd(MQTT.OP_SUBSCRIBE, _this.handle, callback, function(blob) {
		    if (blob.code !== 0) {
			callback(new AOP.ERR(blob.code, sprintf("Operation failed: %d, %s", blob.code, blob.msg)));
		    } else {
			callback(new AOP.OK());
		    }
		});
		queue.issue(cmd, topic, qos);
	    });
	},


	/**
	 * @private
	 */
	toString: function() {
	    return sprintf("MQTT.Connection:%s:%d", this.serverURI, this.state);
	}
    }
);
