// //  (C) COPYRIGHT INTERNATIONAL BUSINESS MACHINES CORPORATION 2006-2010
// //                       ALL RIGHTS RESERVED
// //        IBM Research Division, Zurich Research Laboratory
// // --------------------------------------------------------------------


// Class.define(
//     "Sonoran.Gateway",
//     /**
//      * @lends Sonoran.Gateway.prototype
//      */
//     {
// 	/**
// 	 * Sonoran.Gateway implemens the base class for gateways.
// 	 * For now, a gateway is expected to be implemented by a mote being connected to Sonoran.
// 	 * A gateway is responsible for creating mote objects when they are detected and
// 	 * remove them when they disappear. A gateway forwards messages to motes
// 	 * gated by them and handles incoming packets to find their target mote.
// 	 * @constructs
// 	 * @param mote             Mote instance or eui64 string
// 	 * @param addressFamily    Optional
// 	 */
// 	__constr__: function(/** Sonoran.Mote */mote, /** String */addressFamily) {
// 	    this.state = Sonoran.Gateway.STATE_DISCONNECTED;
// 	    this.addressFamily = addressFamily||"rf";
// 	    if (typeof(mote) === "string") {
// 		this.gatewayUUID = mote;
// 		this.gatewayMote = null;
// 	    } else {
// 		this.gatewayMote = mote;
// 		this.gatewayUUID = mote.getUniqueid();
// 	    }
// 	},

// 	/**
// 	 * The mote that acts as gateway and carries the gateway application. Might be null.
// 	 * @type Sonoran.Mote
// 	 * @private
// 	 */
// 	gatewayMote: null,

// 	/**
// 	 * EUI64.
// 	 * @type String
// 	 * @private
// 	 */
// 	gatewayUUID: null,

// 	/**
// 	 * The state the gateway is in. 
// 	 * @type Number
// 	 * @see Sonoran.Gateway.STATE_CONNECTED
// 	 * @see Sonoran.Gateway.STATE_DISCONNECTED
// 	 * @private
// 	 */
// 	state: null,


// 	/**
// 	 * Returns the gateway mote.
// 	 * @returns {Sonoran.Mote} the gateway mote
// 	 */
// 	getMote: function() {
// 	    return this.gatewayMote;
// 	},
	
// 	// /**
// 	//  * Sets the gateway mote.
// 	//  * @param mote
// 	//  */
// 	// setMote: function(/** Sonoran.Mote */mote) {
// 	//     assert(!this.gatewayMote);
// 	//     this.gatewayMote = mote;
// 	// },
	

// 	/**
// 	 * @returns {Boolean} true if specified mote is the gateway mote
// 	 */
// 	isGatewayMote: function(/** Sonoran.Mote */mote) {
// 	    return mote===this.gatewayMote;
// 	},
	
	
// 	/**
// 	 * @returns {String} string
// 	 */
// 	toString: function() {
// 	    return sprintf("Gateway:%s", this.gatewayUUID);
// 	},


// 	/**
// 	 * @returns {Number} the gateway state
// 	 * @see Sonoran.Gateway.STATE_CONNECTED
// 	 * @see Sonoran.Gateway.STATE_DISCONNECTED
// 	 */
// 	getState: function() {
// 	    return this.state;
// 	},
	
	
// 	/**
// 	 * Set gateway state. If state is set to STATE_CONNECTED, this gateway is set on the mote and
// 	 * an event is fired. If state is set to STATE_DISCONNECTED, this gateway is removed from the
// 	 * gateway mote and all registered wireless motes. An event is fired, too.
// 	 * @param newState The new state of the gateway
// 	 * @see Sonoran.Gateway.STATE_CONNECTED
// 	 * @see Sonoran.Gateway.STATE_DISCONNECTED
// 	 * @private
// 	 */
// 	setState: function(/** Number */newState) {
// 	    assert(newState === Sonoran.Gateway.STATE_CONNECTED || newState === Sonoran.Gateway.STATE_DISCONNECTED);
// 	    if (this.state===newState) {
// 		return;
// 	    }
// 	    this.state = newState;
// 	    if (newState === Sonoran.Gateway.STATE_CONNECTED) {
// 		if (this.gatewayMote) {
// 		    this.gatewayMote.setGateway(this);
// 		}
// 		Sonoran.Registry.signalEvent(new Sonoran.Event.Gateway(Sonoran.EV_NAME_REGISTER, this.gatewayUUID));
// 		return;
// 	    } 

// 	    var motes = this.getGatedMotes();;
// 	    for (var i = 0; i < motes.length; i++) {
// 		this.removeMoteGatedBy(motes[i]);
// 	    }
// 	    if (this.gatewayMote && this.gatewayMote.getGatewayP() === this) {
// 		this.gatewayMote.setGateway(null);
// 	    }
// 	    Sonoran.Registry.signalEvent(new Sonoran.Event.Gateway(Sonoran.EV_NAME_DEREGISTER, this.gatewayUUID));
// 	},


// 	/**
// 	 * Is this gateway connected?
// 	 * @returns {Boolean} boolean
// 	 * @see Sonoran.Gateway.STATE_CONNECTED
// 	 * @see Sonoran.Gateway.STATE_DISCONNECTED
// 	 */
// 	isConnected: function() {
// 	    return this.state===Sonoran.Gateway.STATE_CONNECTED;
// 	},

	
// 	/**
// 	 * Return address family implemented by this gateway (default is 'rf').
// 	 * @returns {String} address family
// 	 */
// 	getAddressFamiliy: function() {
// 	    return this.addressFamily;
// 	},


// 	/**
// 	 * Set address family string.
// 	 * @param af
// 	 */
// 	setAddressFamiliy: function(/** String */af) {
// 	    this.addressFamily = af;
// 	},
	

// 	/**
// 	 * Generate an address string for a wireless mote attached to this gateway.
// 	 * Used in createMote to create a new mote.
// 	 * @param mote
// 	 * @returns {String} address string for a mote
// 	 * @private
// 	 */
// 	genAddr: function(/** Sonoran.Mote */mote) {
// 	    if (typeof(mote) === 'string') {
// 		return sprintf("%s://%s", this.addressFamily, mote);
// 	    } else {
// 		return sprintf("%s://%s", this.addressFamily, mote.getUniqueid());
// 	    }
// 	},
	
	
// 	/**
// 	 * Returns the array of motes currently attached to this gateway.
// 	 * @returns {Sonoran.Mote[]} the attached motes
// 	 */
// 	getGatedMotes: function() {
// 	    var _this = this;
// 	    return Sonoran.Registry.filterMotes(function(m) { 
// 						    return m.getSink() === _this; 
// 						});
// 	},

	
// 	/**
// 	 * Helper function for subclasses. Mark the specified mote as being gated by this gateway.
// 	 * @param mote
// 	 * @private
// 	 */
// 	setMoteGatedBy: function(/** Sonoran.Mote */mote) {
// 	    mote.setGateway(this);
// 	},

	
// 	/**
// 	 * Helper function for subclasses. Remove this gateway from the specified mote for which it currently acts
// 	 * as gateway. 
// 	 * @param mote
// 	 * @private
// 	 */
// 	removeMoteGatedBy: function(/** Sonoran.Mote */mote) {
// 	    mote.setGateway(null);
// 	},



// 	/**
// 	 * Forward a message to a wireless mote attached to this gateway.
// 	 * Throws an exception if the message send operation failed. 
// 	 * @param dstmote Wireless target mote
// 	 * @param dstport Port on wireless target mote
// 	 * @param srcport 
// 	 * @param data    Binary string with data
// 	 * @param timer   Optional
// 	 */
// 	send: function(/** Sonoran.Mote */dstmote, /** Number */dstport, /** Number */srcport, /** String */data, /** Timer.Timer|Timer.Timer[] */timer) {
// 	    throw "Send operation not supported by gateway";
// 	},
	

// 	/**
// 	 * Send data via this gateway by broadcast.
// 	 * Throws an exception if sending the message to the gateway failed. 
// 	 * @param dstport  Destination port
// 	 * @param srcport  Source port
// 	 * @param bytes    Binary data
// 	 * @param timer    Optional, timer or set of timers, 
// 	 */
// 	broadcast: function(/** Number */dstport, /** Number */srcport, /** String */data, /** Timer.Timer|Timer.Timer[] */timer) {
// 	    throw "Broadcast operation not supported by gateway";
// 	},


// 	/**
// 	 * Helper function for subclasses. A subclass may call this method when a mote appears (for the first or at any later time). This function
// 	 * makes sure that a mote instance for the specified uniqueid is created if necessary and that this gateway is registered
// 	 * as its sink. 
// 	 * @param uniqueid  The unique id of the mote
// 	 * @param state     The state the mote should have after the creation, such Sonoran.Mote.ON
// 	 * @returns {Array} an array with two elements, a flag indicating whether a mote with this uninqueid was already known before,
// 	 * and the existing or newly created Sonoran.Mote instance
// 	 * @private
// 	 */
// 	onMoteDetection: function(/** String */uniqueid, /** String */state, /** Boolean */issueHelloEvent) {
// 	    var existed;
// 	    var mote = Sonoran.Registry.lookupMoteByUniqueid(uniqueid);
// 	    if (mote && mote===this.gatewayMote) {
// 		var msg = sprintf("%s: HELLO from %s with same uniqueid as gateway!", this, uniqueid);
// 		Logger.log(Logger.ERR, Sonoran.Logger.GATEWAY, msg, undefined, this.gatewayUUID);
// 		return null;
// 	    }
// 	    if (!mote) {
// 		existed = false;
// 		mote = this.createMote(uniqueid);
// 		if (!mote) {
// 		    return null;
// 		}
// 		this.setMoteGatedBy(mote);
// 	    } else if (mote.getGatedBy() != this) {
// 		existed = false;
// 		this.setMoteGatedBy(mote);
// 	    } else {
// 		existed = true;
// 	    }
	    
// 	    if( !existed ) {
// 		var msg = sprintf("%s: HELLO from %s %s", this, existed?"old":"new", uniqueid);
// 		println(msg);
// 		Logger.log(Logger.INFO, Sonoran.Logger.GATEWAY, msg, undefined, this.gatewayUUID);
// 	    }
// 	    state = state||Sonoran.Mote.ON;
// 	    mote.updateState(state);

// 	    assert(mote.getGatedBy() === this);
// 	    if (issueHelloEvent) {
// 		var ev = new Sonoran.Event.Gateway(Sonoran.EV_NAME_HELLO, this.gatewayUUID, mote, existed);
// 		Sonoran.Registry.signalEvent(ev);
// 		this.onHello(mote, existed);
// 	    }
	    
// 	    return [ existed, mote ];
// 	},


// 	/**
// 	 * Can be overloaded to create a gateway-specific mote.
// 	 * @returns {Sonoran.Mote}
// 	 * @private
// 	 */
// 	createMote: function(/** String */uniqueid) {
// 	    try {
// 		var addr = this.genAddr(uniqueid);
// 		var impl = new Sonoran.HW.MoteImpl(uniqueid, addr);
// 		return impl.mote;
// 	    } catch (ex) {
// 		var msg = sprintf("%s: cannot register mote %s: '%s'", this, ex);
// 		Logger.log(Logger.ERR, Sonoran.Logger.GATEWAY, msg, undefined, this.gatewayUUID);
// 		return null;
// 	    }
// 	},


// 	/**
// 	 * Helper function for subclasses. A subclass may call this method when a mote disappears.
// 	 * The method removes the gateway from the specified mote, updates the mote state to OFF,
// 	 * fires a Sonoran.Gateway.Event and calls onBye.
// 	 * Note that the mote remains in the Sonoran.Registry and is not deleted.
// 	 * @returns {Sonoran.Mote} the mote deregistered or null
// 	 * @private
// 	 */
// 	onMoteDisappearance: function(/** String */uniqueid) {
// 	    var msg;
// 	    var mote = Sonoran.Registry.lookupMoteByUniqueid(uniqueid);
// 	    if (mote) {
// 		msg = sprintf("%s: received BYE from known mote %s", this, uniqueid);
// 		this.removeMoteGatedBy(mote);
// 		var ev = new Sonoran.Event.Gateway(Sonoran.EV_NAME_BYE, this.gatewayUUID, mote);
// 		Sonoran.Registry.signalEvent(ev);
// 		mote.updateState(Sonoran.Mote.OFF);
// 	    } else {
// 		msg = sprintf("%s: received BYE from unknown mote %s", this, uniqueid);
// 	    }
// 	    Logger.log(Logger.INFO, Sonoran.Logger.GATEWAY, msg, undefined, this.gatewayUUID);
// 	    this.onBye(uniqueid, mote);
// 	    return mote;
// 	},


// 	/**
// 	 * The Sonoran.Mote class calls this function when the mote has been destroyed or
// 	 * another gateway has been set for this mote. By default, a gateway-bye event is issued.
// 	 * @param mote
// 	 */
// 	onMoteRemoval: function(/** Sonoran.Mote */mote) {
//             assert(mote.getGatedBy() != this);
//             var ev = new Sonoran.Event.Gateway(Sonoran.EV_NAME_BYE, this.gatewayUUID, mote);
//             Sonoran.Registry.signalEvent(ev);
// 	},
	

// 	/**
// 	 * onHello is called when a mote says hello (by onMoteDetection). Override if necessary.
// 	 * @param mote    Sonoran.Mote
// 	 * @param existed If true, HELLO is from a previously known mote, false, if it is from a new mote
// 	 */
// 	onHello: function(/** Sonoran.Mote */mote, /** Boolean */existed) {      },
	
	

// 	/**
// 	 * onBye is called when a mote says BYE (from onMoteDisappearance). Parameter 'mote' is null 
// 	 * when the 'eui64' could not be resolved to a mote.
// 	 * point to a registered mote.
// 	 */
// 	onBye: function(/** String */eui64, /** Sonoran.Mote */mote) {}
//     },
//     /**
//      * @lends Sonoran.Gateway
//      */
//     {
// 	/**
// 	 * Gateway is connected, i.e. sonoran can communicate with the gateway.
// 	 * @type Number
// 	 * @constant
// 	 */
// 	STATE_CONNECTED: 1,

	
// 	/**
// 	 * Gateway is disconnected, i.e. sonoran can not communicate with the gateway.
// 	 * @type Number
// 	 * @constant
// 	 */
// 	STATE_DISCONNECTED: 2,

// 	/**
// 	 * Return whether specified mote is a gateway mote, i.e. an access point.
// 	 * @returns {Boolean}
// 	 */
// 	isGatewayMote: function(/** Sonoran.Mote */mote) {
// 	    var gateway = mote.getGatewayP();
// 	    if (gateway) {
// 		return gateway.isGatewayMote(mote);
// 	    }
// 	    return false;
// 	}
//     }
// );













