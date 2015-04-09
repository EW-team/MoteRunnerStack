//  (C) COPYRIGHT INTERNATIONAL BUSINESS MACHINES CORPORATION 2006-2010
//                       ALL RIGHTS RESERVED
//        IBM Research Division, Zurich Research Laboratory
// --------------------------------------------------------------------


/**
 * Abstract interface for the clients handling the traffic between client and server.
 * @class
 * @constructor
 */
Channels.Client = function() {};

/** */
Channels.Client.prototype = {
    /**
     * @returns {String} a uniqueid for this client
     */
    getUniqueid: function() {
    	assert(0);
    },

    /**
     * Channel.close was called to remove a channel from a clients list of channels.
     * @param name
     * @param reason            optional
     * @param skipAnnouncement  optional
     * @returns {Boolean} flag whether channel has been removed
     * @private
     */
    removeChannel: function(/** String */name, /** String */reason, /** Boolean */skipAnnouncement) {
	assert(0);
    },

    /**
     * Channel constructor calls this method to add channel to list of client channels.
     * @param channel
     * @private
     */
    addChannel: function(/** Channels.Channel */channel) {
	assert(0);
    },


    /**
     * Lookup channel.
     * @param name Channel name
     * @returns {Channels.Channel}
     * @private
     */
    lookupChannel: function(/** String */name) {
	assert(0);
    },


    /**
     * Push an object to a client. toJson is called to get state of object to be transferred to client.
     * @param channel
     * @param object
     * @returns {Boolean} true if added
     */
    pushOnChannel: function(/** String */channel, /** Object */object) {
	assert(0);
    }
};






/**
 * Channels.Registry manages events, channels, query requests and timeouts.
 * @class
 */
Channels.Registry = {
    /**
     * Map of channel name to Channels.Factory instance.
     * @type Object
     * @private
     */
    name2factory: {},

    /**
     * Map of unique id (String) to client (Channels.Client)
     * @type Channels.Client
     */
    uniqueid2client: {},
    
    /**
     * Initialize this manager.
     * @private
     */
    initialize: function() { 
	this.name2factory = {};
	this.uniqueid2client = {};
        this.addFactory(new Channels.Factory(Channels.ANNOUNCEMENT_CHANNEL_NAME));
	this.addFactory(new Channels.Factory(Channels.MANAGER_CHANNEL_NAME, function(ctx, name) {
		return new Channels.Controller(Channels.MANAGER_CHANNEL_NAME, ctx);
	 }));
    },

    /**
     * @param client
     * @private
     */
    installClient: function(/** Channels.Client */client) {
	var uniqueid = client.getUniqueid();
	this.uniqueid2client[uniqueid] = client;
    },


    /**
     * @param client
     * @private
     */
    deleteClient: function(/** Channels.Client */client) {
	var uniqueid = client.getUniqueid();
	if (this.uniqueid2client[uniqueid]) {
	    delete this.uniqueid2client[uniqueid];
	}
    },


    /**
     * @returns {Channels.Client[]} all clients installed for their sessions
     * @private
     */
    getClients: function() {
	var clients = [];
	for (var uniqueid in this.uniqueid2client) {
	    var client = this.uniqueid2client[uniqueid];
	    clients.push(client);
	}
	return clients;
    },


    /**
     * Return all channel names used by a client or installable in a client.
     * @param client
     * @returns {String[]} channel names
     */
    getChannelNames: function(/** Channels.Client */client) {
	assert(arguments.length===1);
	assert(client instanceof Channels.HTML5Client);
	var name2name = {};
	var name;
	for (name in this.name2factory) {
	    name2name[name] = name;
	}
	for (name in client.name2channel) {
	    name2name[name] = name;
	}
	return Blob.map(name2name, true);
    },


    /**
     * @returns {Boolean} Flag whether a factory for that channel name exists 
     */
    haveFactory: function(/** String */name) {
	return this.name2factory[name] != null;
    },


    /**
     * Returns factory for a channel or null.
     * @param channelName
     * @returns {Channels.Factory} factory
     */
    getFactory: function(/** String */channelName) {
        return this.name2factory[channelName];
    },

    
    /**
     * Add a public channel factory. The channel is instantiated in each session managing channels.
     * @param factory
     */
    addFactory: function(/** Channels.Factory */factory) {
        assert(factory instanceof Channels.Factory);
        var name = factory.getName();
	assert(name!==undefined);
	if (this.name2factory[name]) {
	    QUACK(0, "Channels.Registry.addFactory: overwite existing factory for: " + name);
	}
        this.name2factory[name] = factory;
        var _this = this;
    },

    
    /**
     * Lookup a public channel factory.
     * @param name
     * @returns {Channels.Factory}
     */
    lookupFactory: function(/** String */name) {
        return this.name2factory[name];
    },


    /**
     * Ask factory to create channel for session.
     * @param factory
     * @param client
     * @returns {Channels.Channel}
     * @private
     */
    applyFactory: function(/** Channels.Factory */factory, /** Channels.Client */client) {
        assert(factory instanceof Channels.Factory);
        var channel = factory.createChannel(client);
	assert(channel instanceof Channels.Channel);
        return channel;
    },

    
    /**
     * Remove channel factory. All channels for this factory are removed from their sessions
     * and the factory deleted from this manager.
     * @param factory
     */
    removeFactory: function(/** String */name) {
        var factory = this.name2factory[name];
        assert(factory);
        delete this.name2factory[name];
	for (var uniqueid in this.uniqueid2client) {
		var client = this.uniqueid2client[uniqueid];
		client.removeChannel(name);
	}
    },

    
    /**
     * Return existing channel if it already exists, otherwise create and open it. If no factory
     * for such a channel exists, return null.
     * @param name
     * @param client
     * @returns {Channels.Channel} channel or null
     * @private
     */
    createChannel: function(/** String */name, /** Channels.Client */client) {
	assert(arguments.length===2);
	assert(client instanceof Channels.Client);
	var chan = client.lookupChannel(name);
        if (chan) {
	    return chan;
	}
	var factory = this.name2factory[name];
        if (factory) {
	    chan = factory.createChannel(client);
            return chan;
	}
	return null;
    },


    /**
     * Lookup a channel in a session.
     * @param client
     * @param name
     * @returns {Channels.Channel} the channel instance or undefined
     */
    lookupChannel: function(/** Channels.Client */client, /** String */name) {
	assert(client instanceof Channels.Client);
        return client.lookupChannel(name);
    },


    /**
     * All open channels with specified name on all client connections.
     * @param channelName
     * @return {Channels.Channel[]}
     */
    getChannels: function(/** String */channelName) {
	var channels = [];
	for (var uniqueid in this.uniqueid2client) {
	    var client = this.uniqueid2client[uniqueid];
            var channel = client.lookupChannel(channelName);
            if (channel) {
                channels.push(channel);
            }
	}
	return channels;
    },


    /**
     * Signal an object on a channel in a particular session. 
     * @param client      Channels client
     * @param channelName Name of channel
     * @param ev          Object to signal on this channel
     * @returns {Boolean} false when the event was filtered on its way or true if sent
     * */
    signalObject: function(/** Channels.Client */client, /** String */channelName, /** Object */ev) {
        assert(arguments.length==3);
        assert(client instanceof Channels.Client);
        var channel = client.lookupChannel(channelName);
	return (this.channel) ? channel.push(ev) : false;
    },


    /**
     * Broadcast event on specified channels. The channel name must originate from
     * a channel factory. The event is marshaled and added to all client sessions
     * querying this channel.
     * @param event       The event
     * @param channel     Name of channel stored in potentially many sessions
     */
    broadcastObject: function(/** Object */event,  /** String */channelName) {
        assert(event);
        var obj = null;
        try {
            obj = Util.Blob.marshal(event);
        } catch (x) {
            QUACK(0, Runtime.dumpException(x, "Marshal failed for: " + event + ": " + x));
            Runtime.exit(1);
        }
        var factory = this.name2factory[channelName];
        if (!factory) {
            throw new Exception("No such factory for channel name: " + channelName);
        }

	for (var uniqueid in this.uniqueid2client) {
	    var client = this.uniqueid2client[uniqueid];
            var channel = client.lookupChannel(channelName);
            if (channel) {
                var added = channel.addObject(event, obj);
            }
        }
    },

    
    /**
     * @returns {String} string.
     */
    toString: function() {
        return "Channels.Registry";
    }
};



Channels.Registry.initialize();
