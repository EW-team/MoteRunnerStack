//  (C) COPYRIGHT INTERNATIONAL BUSINESS MACHINES CORPORATION 2006-2010
//                       ALL RIGHTS RESERVED
//        IBM Research Division, Zurich Research Laboratory
// --------------------------------------------------------------------


/**
 * HTML5.Channels exchanges channels data on top of a web socket
 * @class
 * @augments Channels.Client
 * @constructor
 * @param websock
 * @private
 */
Channels.HTML5Client = function(/** HTML5.Socket */websock) {
    this.name2channel = {};
    this.uniqueid = Util.UUID.createGUID();
    this.connection = websock;
    websock.onClose = this.onClose.bind(this);
    websock.onText = this.onText.bind(this);
    Channels.Client.call(this);
    Channels.Registry.installClient(this); 
};

/** */
Channels.HTML5Client.prototype = extend(
    Channels.Client.prototype,
    /** @lends Channels.HTML5Client */
    {
	/**
	 * @type HTML5.Socket
	 * @private
	 */
	connection: null,

	/**
	 * @type Object
	 * @private
	 */
	name2channel: null,

	/**
	 * @type String
	 * @private
	 */
	uniqueid: null,

	/**
	 * Listener function for close.
	 * @type Function
	 * @private
	 */
	closeListener: null,


	/**
	 * @returns {HTML5.Socket} the underlying socket connection
	 * @private
	 */
	getConnection: function() {
	    return this.connection;
	},

	
	/** 
	 * Connection was closed.
	 * @param data Optional, packet which led to close
	 * @private
	 */
	onClose: function(data) {
	    for (var n in this.name2channel) {
		this.removeChannel(n, "Connection died", true);
	    }
	    Channels.Registry.deleteClient(this); 
	    if (this.closeListener) {
		this.closeListener(this);
	    }
	},


	/**
	 * Set close listener. Is called with 'this' instance when this channels client
	 * gets closed.
	 * @param closeListener
	 * @private
	 */
	setCloseListener: function(/** Function */closeListener) {
	    this.closeListener = closeListener;
	},


	/**
	 * Text was received on web socket.
	 * @param fin   FIN bit in http5 web socket frame indicating last packet
	 * @param buf  The received data
	 * @private
	 */
	onText: function(/** Number */fin, /** DataBuffer */buf) {
	    assert(buf instanceof DataBuffer);
	    var _this = this;

	    var obj; //json, obj;
	    try {
		obj = buf.toJson();
		//obj = Blob.unmarshal(json);
	    } catch(ex) {
		var msg = sprintf("Unmarshal failed for: '%s'", buf);
		QUACK(0, Runtime.dumpException(ex, msg));
		return;
	    }

	    //QUACK(0, "OBJ: " + typeof(obj));
	    //QUACK(0, "OBJ: " + Util.formatData(obj));
	    if (!(obj instanceof Array) || (obj.length !== 2)) {
		var msg = sprintf("Invalid request (parameter is not an Array): '%s'", buf);
		QUACK(0, msg);
		return;
	    }

	    var name = obj[0];
	    var channel = Channels.Registry.createChannel(name, this);
            if (!channel) {
		var msg = sprintf("Channels: No such channel '%s'", name);
		QUACK(0, msg);
		return;
            }

	    assert(channel  instanceof Channels.Channel);
            try {
		//channel.onRequest(obj[1]);    
		channel.onData(obj[1]);    
	    } catch (x) {
		QUACK(0, sprintf("Channel '%s' request failed: %s", name, x));
		QUACK(0, "JSON request: " + buf);
		QUACK(0, Runtime.dumpException(x));
	    }
	},


	/**
	 * Remove channel from this session. Use Channel.close.
	 * @param name
	 * @param reason            optional
	 * @param skipAnnouncement  optional
	 * @returns {Boolean} flag whether channel has been removed
	 * @private
	 */
	removeChannel: function(/** String */name, /** String */reason, /** Boolean */skipAnnouncement) {
            assert(typeof(name)==='string');
            var chan = this.name2channel[name];
            if (!chan) {
		return false;
            }
            assert(chan);
            delete this.name2channel[name];
            chan.onClose(reason);
            var obj = { name: name, operation: "removed" };
	    if (skipAnnouncement!==true) {
		Channels.Registry.signalObject(this, Channels.ANNOUNCEMENT_CHANNEL_NAME, obj);
	    }
            return true;
	},
	

	/**
	 * Add channel to this session. Called by Channel constructor.
	 * @param channel
	 * @private
	 */
	addChannel: function(/** Channels.Channel */channel) {
	    var name = channel.getName();
	    assert(!this.name2channel[name]);
	    this.name2channel[name] = channel;
	    //QUACK(0, "ADD CHANNEL: " + name + ", session " + this.connection.session.sessionid);
            var obj = { name: name, operation: "added" };
            Channels.Registry.signalObject(this, Channels.ANNOUNCEMENT_CHANNEL_NAME, obj);
	},


	/**
	 * Lookup channel.
	 * @param name Channel name
	 * @returns {Channels.Channel}
	 * @private
	 */
	lookupChannel: function(/** String */name) {
	    return this.name2channel[name];
	},


	/**
	 * Record item to be pushed to client.
	 * @param channel
	 * @param object
	 * @returns {Boolean} true if added
	 * @private
	 */
	pushOnChannel: function(/** String */channel, /** Object */object) {
	    if (this.name2channel[channel]) {
		this.connection.send(HTML5.Socket.OPC_TEXT, [ channel, object ]);
	    }
	    return true;
	},

	/**
	 * @returns {String} a uniqueid for this client
	 * @private
	 */
	getUniqueid: function() {
	    return this.uniqueid;
	},


	/**
	 * @returns {String}
	 * @private
	 */
	toString: function() {
	    return "Channels.Client: " + this.connection.session.sessionid;
	}
    }
);





