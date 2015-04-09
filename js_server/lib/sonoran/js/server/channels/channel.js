//  (C) COPYRIGHT INTERNATIONAL BUSINESS MACHINES CORPORATION 2006-2010
//                       ALL RIGHTS RESERVED
//        IBM Research Division, Zurich Research Laboratory
// --------------------------------------------------------------------



//---------------------------------------------------------------------------------------------------------
//
// Channels.Channel
//
//---------------------------------------------------------------------------------------------------------


Class.define(
    "Channels.Channel",
    /**
     * @lends Channels.Channel.prototype
     */
    {
	/**
	 * Channels.Channel represents a channel on a particular client session.
	 * @constructs
	 * @param name        Channel name
	 * @param client      Client this channel is for
	 */
	__constr__: function(/** String */name, /** Channels.Client */client) {
	    assert(client instanceof Channels.Client);
	    this.name = name;
	    this.client = client;
	    this.client.addChannel(this);
	},

	/**
	 * Name
	 * @type String
	 * @private
	 */
	name: null,

	/**
	 * @type  Channels.Client
	 * @private
	 */
	client: null,

	/**
	 * Return name of channel
	 * @returns {String}
	 */
	getName: function() {
            return this.name;
	},


	/**
	 * Returns client connection.
	 * @returns {Channels.Client}
	 */
	getClient: function() {
            return this.client;
	},


	/**
	 * @returns {String} string.
	 */
	toString: function() {
            return sprintf("HTTP.Channel:%s", this.name);
	},


	/**
	 * Use addObject instead.
	 * @param origObj        The original object to be signaled
	 * @param marshaledState The marshaled state of the object to push on this channel
	 * @returns {Boolean} true if event was added
	 * @private
	 * @deprecated
	 */
	addEvent: function(/** Object */origObj, /** Object */marshaledState) {
	    QUACK(0, "API change: use Channel.addObject instead of Channel.addEvent");
	    this.addObject(origObj, marshaledState);
            assert(arguments.length==2);
	    return this.client.pushOnChannel(this.name, marshaledState);
	},


	/**
	 * Add marshaled state of object to this channel and send that to the client. Subclasses can
	 * override and filter.
	 * @param origObj        The original object to be signaled
	 * @param marshaledState The marshaled state of the object to push on this channel
	 * @returns {Boolean} true if event was added
	 * @private
	 */
	addObject: function(/** Object */origObj, /** Object */marshaledState) {
            assert(arguments.length==2);
	    return this.client.pushOnChannel(this.name, marshaledState);
	},


	/**
	 * Signal an event on this channel. The event is properly marshalled and added to this channels
	 * event buffer. Any active query is awakened.
	 * @param ev          Object to signal on this channel
	 * @returns {Boolean} whether channel or client connection filtered the event or true if sent
	 */
	signalEvent: function(/** Object */ev) {
	    QUACK(0, "API change: use Channel.push instead of Channel.signalEvent");
	    return this.push(ev);
	},


	/**
	 * Push object on channel to clients. The object is marshalled using Blob.marshal and
	 * transferred to all connected clients.
	 * @param ev
	 * @returns {Boolean} whether channel or client connection filtered the event or true if sent
	 */
	push: function(/** Object */ev) {
            var obj = null;
            try {
		obj = Util.Blob.marshal(ev);
            } catch (x) {
		QUACK(0, Runtime.dumpException(x, "Marshal failed for: " + ev + ": " + x));
		Runtime.exit(1);
            }
            var added = this.addObject(ev, obj);
	    return added;
	},


	/**
	 * Close this channel. It is removed from its session, any active query aborted
	 * and an announcement fired.
	 * @param reason Optional
	 * @returns {Boolean} whether channel existed and has been closed
	 */
	close: function(/** String */reason) {
	    return this.client.removeChannel(this.name, reason);
	},


	/**
	 * Called when channel is removed from session.
	 */
	onClose: function(/** String */reason) {
            QUACK(1, "Channels.Channel.onClose: " + this);
	},


	/**
	 * A http request on a channel from a client. The input parameters are unmarshaled and
	 * onRequest invoked.
	 * @param para    Request parameters
	 * @returns {Object} Data to pass to client or null for no data
	 */
	onData: function(/** Object */para) {
	    //QUACK(0, "Channel.onData: " + Util.formatData(para));
	    var obj;
	    try {
		obj = Blob.unmarshal(para, this);
	    } catch(ex) {
		var msg = sprintf("Unmarshal on channel failed for: '%s'", Util.formatData(para));
		QUACK(0, Runtime.dumpException(ex, msg));
		return;
	    }
	    this.onRequest(obj);
	},


	/**
	 * A http request on a channel from a client.
	 * @param params      Request parameters
	 * @returns {Object} Data to pass to client or null for no data
	 */
	onRequest: function(/** Object */params) {
            return null;
	}
    }
);












//---------------------------------------------------------------------------------------------------------
//
// Channels.Factory
//
//---------------------------------------------------------------------------------------------------------



Class.define(
    "Channels.Factory",
    /**
     * @lends Channels.Factory.prototype
     */
    {
	/**
	 * Channels.Factory creates a channel for a client connection. If a factory is installed
	 * at the manager, it is invoked when a client wants to subscribe for its channel. The
	 * factory function receives the Channels.Client and the factory name.
	 * @constructs
	 * @param name      Channel name
	 * @param createf   Optional, function, receiving Channels.Client and factory name
	 */
	__constr__: function(/** String */name, /** Function */createf) {
	    assert(createf===undefined||typeof(createf)==='function', "API: change");
	    this.name = name;
	    this.createf = createf;
	},

	/**
	 * Name of channel
	 * @type String
	 */
	name: null,

	/**
	 * Return name of channel
	 * @returns {String} channel name
	 */
	getName: function() {
            return this.name;
	},

	/**
	 * Create a channel instance for specified client session. By default, a channel
	 * with the factory name is created.
	 * @param client      Client representative
	 * @returns {Channels.Channel} the channel
	 */
	createChannel: function(/** Channels.Client */client) {
	    assert(client instanceof Channels.Client);
            var channel = this.createf ? this.createf(client, this.name) : new Channels.Channel(this.name, client);
            assert(channel);
            return channel;
	}
    }
);









//---------------------------------------------------------------------------------------------------------
//
// Channels.Socket
//
//---------------------------------------------------------------------------------------------------------

Class.define(
    "Channels.Socket",
    /**
     * @lends Channels.Socket.prototype
     */
    {
	/**
	 * A Socket wraps a channel between client and server. If a 'receiver' function is specified in the
	 * constructor, it receives the requests from a client session. The socket send method
	 * allows to send a marshaled javascript objects to all clients connected to it.
	 * The receiver function receives the data pushed by the client in the first parameter
	 * and the HTTP channels client the request came from in the second parameter.
	 * @constructs
	 * @param name     Name of socket
	 * @param receiver Optional, receiver function receiving http requests from the client
	 * @private
	 */
	__constr__: function(/** String */name, /** Function */receiver) {
	    assert(receiver===undefined||typeof(receiver)==='function', "API change");
	    this.name = name;
	    this.factory = new Channels.Factory(name, function(client) {
						    return new Channels.SocketChannel(name, client, receiver);
						});
	    Channels.Registry.addFactory(this.factory);
	},

	/**
	 * @type String
	 * @private
	 */
	name: null,

	/**
	 * @type Channels.Factory
	 * @private
	 */
	factory: null,

	/**
	 * Send object down the channel. The object is marshaled and then signaled to all clients
	 * connected to this socket.
	 * @param data
	 * @private
	 */
	send: function(/** Object */data) {
            Channels.Registry.broadcastObject(data, this.name);
	},

	/**
	 * Close this socket. The socket is not reachable by any client session anymore.
	 * @private
	 */
	close: function() {
            Channels.Registry.removeFactory(this.name);
	}
    }
);









Channels.Channel.extend(
    "Channels.SocketChannel",
    /**
     * @lends Channels.SocketChannel.prototype
     */
    {
	/**
	 * Creates a socket representative for each new session subscribing to this socket.
	 * @constructs
	 * @augments Channels.Channel
	 * @private
	 */
	__constr__: function(/** String */name, /** Channels.Client */client, /** Function */receiver) {
	    Channels.Channel.call(this, name, client);
	    this.receiver = receiver;
	},

        /**
         * @param params      Request parameters
         * @private
         */
        onRequest: function(/** Object */paras) {
            if (this.receiver) {
                return this.receiver(paras, this.client);
            } else {
                return null;
            }
        }
    }
);










//---------------------------------------------------------------------------------------------------------
//
// Channels.ProcessChannel
//
//---------------------------------------------------------------------------------------------------------

Channels.Channel.extend(
    "Channels.ProcessChannel",
    /**
     * @lends Channels.ProcessChannel.prototype
     */
    {
	/**
	 * Process channel. Used by RMI.Process to return a process channel to a client.
	 * @augments Channels.Channel
	 * @constructs
	 * @param path
	 * @param argv
	 * @param client
	 * @private
	 */
	__constr__: function(/** String */path, /** String */argv, /** HTTP.Channel.Client */client) {
	    assert(arguments.length===3);
	    var name = Util.UUID.createGUID();
	    var _this = this;
	    var pid = IO.Process.start(path, argv, function(evt) { _this.onExit(evt); }, function(evt) { _this.onOutput(evt); });
	    Channels.Channel.call(this, name, client);
	    this.pid = pid;
	},

	/**
	 * @returns {Number}
	 */
	getPid: function() {
	    return this.pid;
	},

        /**
         * Called when channel is removed from session.
	 * @private
         */
        onClose: function() {
            QUACK(1, "Channels.ProcessChannel.onClose: " + this);
	    try {
		if (this.pid >= 0) {
		    QUACK(1, "Channels.ProcessChannel.onClose: kill " + this.pid);
		    IO.Process.kill(this.pid);
		}
	    } catch (x) {
		QUACK(1, "Channels.ProcessChannel.onClose: ex on killing: " + x);
	    }
        },

        /**
	 * @private
         */
        onExit: function(/** Object */blob) {
	    this.push(blob);
	    this.close();
        },

        /**
	 * @private
         */
        onOutput: function(/** Object */blob) {
	    this.push(blob);
        },

	/**
	 * On request, starts process and creates channel for pushing output to client.
         * @param params      Request parameters
         */
        onRequest: function(/** Object */paras) {
	    var pid = HTTP.parseInt(paras, "pid");
	    var data = paras.data;
	    if (!data || typeof(data)!=='string') {
		throw "Invalid request: invalid 'data' parameter";
	    }
	    IO.Process.send(pid, data);
        }
    }
);












//---------------------------------------------------------------------------------------------------------
//
// Channels.Controller
//
//---------------------------------------------------------------------------------------------------------

Channels.Channel.extend(
    "Channels.Controller",
    /**
     * @lends Channels.Controller.prototype
     */
    {
	/**
	 * The main controller channel. Allows to subscribe/unsubscribe/create channels.
	 * @augments Channels.Channel
	 * @constructs
	 * @param name
	 * @param client
	 * @private
	 */
	__constr__: function(/** String */name, /** Channels.Client */client) {
	    assert(arguments.length===2);
	    Channels.Channel.call(this, name, client);
	},

        /**
         * Called when channel is removed from session.
	 * @private
         */
        onClose: function() {
            QUACK(1, "Channels.Controller.onClose: " + this);
        },


        /**
         * @param params      Request parameters
	 * @private
         */
        onRequest: function(/** Object */paras) {
            var tick = HTTP.parseInt(paras, "tick");
            var operation = HTTP.parseString(paras, "operation", /^.+$/);
	    var client = this.getClient();

	    if (operation === "subscribeChannels") {

		var channelNames = paras.channels;
		if (!(channelNames instanceof Array)) {
		    throw "Invalid request: missing 'channels' parameter";
		}
		channelNames.forEach(function(name) {
					 Channels.Registry.createChannel(name, client);
				     });
		var resp = new Channels.Response(tick, new AOP.OK(), true);
		this.push(resp);
		return;

	    } else if (operation === "unsubscribeChannels") {

		var channelNames = paras.channels;
		if (!(channelNames instanceof Array)) {
		    throw "Invalid request: missing 'channels' parameter";
		}
		channelNames.forEach(function(name) {
					 client.removeChannel(name);
				     });
		var resp = new Channels.Response(tick, new AOP.OK(), true);
		this.push(resp);
		return;

	    } else if (operation === "createChannel") {

		var name = Util.UUID.createGUID();
		Channels.Registry.createChannel(name, client);
		var resp = new Channels.Response(tick, new AOP.OK(name), true);
		this.push(resp);
		return;

	    } else if (operation === "startMotelet") {
		var motelet = paras.motelet;
		var config = paras.config;
		var self = this;
		Sonoran.Resource.Motelets.start(motelet, config, function(result) {
		    var resp = new Channels.Response(tick, resp, true);
		    self.push(resp);
		});
		return;
	    };
	    throw "Unknown channel operation: " + operation;
        }
    }
);
