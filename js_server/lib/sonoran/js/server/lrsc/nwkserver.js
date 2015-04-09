//  (C) COPYRIGHT INTERNATIONAL BUSINESS MACHINES CORPORATION 2013-2013
//                       ALL RIGHTS RESERVED
//        IBM Research Division, Zurich Research Laboratory
// --------------------------------------------------------------------



Class.define(
    "LRSC.Configuration",
    /**
     * @lends LRSC.Configuration.prototype
     */
    {
	/**
	 * Configuration for the network server simulation.
	 * @constructs
	 */
	__constr__:function() {
	    this.srvPort = LRSC.DEFAULT_PORT.NWK_GW;
	    this.nwkeui = LRSC.DEFAULT_NWK_EUI;
	    this.nwkid = 0;
	},

	/**
	 * Network EUI.
	 * @type String
	 */
	nwkeui: 0,

	/**
	 * If hardware gateway, server port.
	 * @type Number
	 */
	srvPort: 0,

	/**
	 * Network id.
	 * @type Number
	 */
	nwkid: 0
    }
);







Class.define(
    "LRSC.Packet",
    /**
     * @lends LRSC.Packet.prototype
     */
    {
	/**
	 * Data packet as received by a simulated mote.
	 * @constructs
	 * @param addr
	 * @param hdr
	 * @param fct
	 * @param seqno
	 * @param opts
	 * @param port
	 * @param payload
	 * @param mic
	 */
	__constr__: function(/** Number */addr, /** Number */hdr, /** Number */fct, /** Number */seqno, /** String */opts, /** Number */port, /** String */payload, /** String */mic) {
	    assert(arguments.length===8);
	    this.hdr = hdr;
	    this.addr = addr;
	    this.fct = fct;
	    this.seqno = seqno;
	    this.opts = opts||"";
	    this.port = port;
	    this.payload = payload;
	    this.mic = mic;
	    assert(!this.mic||this.mic.length==4);
	},
	
	/**
	 * @type Number
	 */
	hdr: null,

	/**
	 * @type Number
	 */
	addr: null,

	/**
	 * @type String
	 */
	mic: null,

	/**
	 * @type Number
	 */
	fct: null,

	/**
	 * @type Number
	 */
	seqno: null,

	/**
	 * @type Number
	 */
	port: null,

	/**
	 * @type String
	 */
	payload: null,

	/**
	 * @type String
	 */
	opts: null,

	/**
	 * @returns {String}
	 */
	toString: function() {
	    return Util.Formatter.Table2.obj2table(this, true, {
		payload: function(v) { if (!v) { return ""; } else { return Formatter.binToHex(v); } },
		opts: function(v) { if (!v) { return ""; } else { return Formatter.binToHex(v); } },
		mic: function(v) { return Formatter.binToHex(v); }
	    }).join("\n");
	},

	/**
	 * @returns {Boolean}
	 */
	isDCDN: function() {
	    return (this.hdr&SaguaroDEFS.LORA_HDR_FTYPE) == SaguaroDEFS.LORA_HDR_FTYPE_DCDN;
	},

	/**
	 * @returns {Boolean}
	 */
	isDADN: function() {
	    return (this.hdr&SaguaroDEFS.LORA_HDR_FTYPE) == SaguaroDEFS.LORA_HDR_FTYPE_DADN;
	},

	/**
	 * @returns {Boolean}
	 */
	isDAUP: function() {
	    return (this.hdr&SaguaroDEFS.LORA_HDR_FTYPE) == SaguaroDEFS.LORA_HDR_FTYPE_DAUP;
	},

	/**
	 * @returns {Boolean}
	 */
	isDCUP: function() {
	    return (this.hdr&SaguaroDEFS.LORA_HDR_FTYPE) == SaguaroDEFS.LORA_HDR_FTYPE_DCUP;
	},

	/**
	 * @returns {Boolean}
	 */
	requestsAdrAck: function() {
	    return (this.fct & SaguaroDEFS.LORA_FCT_ADRARQ_MASK) != 0;
	},

	/**
	 * @returns {String}
	 */
	pack: function() {
	    if (!this.mic) {
		this.mic = "\0\0\0\0";
	    }
	    if (this.opts) {
		this.fct |= this.opts.length;
	    }
	    var data = Formatter.pack("1u4uL1u2uL", this.hdr, this.addr, this.fct, this.seqno);
	    if (this.opts) {
		data += this.opts;
	    }
	    if (this.port!=null) {
		data += String.fromCharCode(this.port);
	    }
	    if (this.payload!=null) {
		data += this.payload;
	    }
	    data += this.mic;
	    assert(data.length>=12);
	    return data;
	}
    },
    /**
     * @lends LRSC.Packet
     */
    {
	unpackDeviceAddr: function(/** String */data) {
	    var arr =  Formatter.unpack("1u4uL*d", data);
	    var ftype = (arr[0]&SaguaroDEFS.LORA_HDR_FTYPE);
	    var addr = arr[1];
	    assert(ftype==SaguaroDEFS.LORA_HDR_FTYPE_DCUP||ftype==SaguaroDEFS.LORA_HDR_FTYPE_DCDN||ftype==SaguaroDEFS.LORA_HDR_FTYPE_DAUP||ftype==SaguaroDEFS.LORA_HDR_FTYPE_DADN);
	    return addr;
	}
    }
);









// Class.define(
//     "LRSC.GwEndPoint",
//     /**
//      * @lends LRSC.GwEndPoint.prototype
//      */
//     {
// 	/**
// 	 * Creates a gateway endpoint. Gateways (simulated or hardware) may connect to an endpoint
// 	 * and forward mote messages to it. The endpoint can be used to send back messages to the
// 	 * gateways and motes.
// 	 * @constructs
// 	 * @param simulated True or Saguaro.Connection to start endpoint for simulated network
// 	 * @param config    Configuration, if null default configuration
// 	 */
// 	__constr__:function (/** Boolean */simulated, /** LRSC.Configuration */config) {
// 	    this.config = config||new LRSC.Configuration();
// 	    this.gwConns = [];
// 	    assert((simulated === true) || (simulated instanceof Saguaro.Connection));
// 	    this.simEventListener = this.onSimEvent.bind(this);
// 	    var simConn;
// 	    if (simulated instanceof Saguaro.Connection) {
// 		simConn = simulated;
// 	    } else {
// 		simConn = Saguaro.Connection.getConnection();
// 	    }
// 	    if (simConn) {
// 		this.startSimulating(simConn);
// 	    }
// 	    this.registryListener = Event.Registry.addListener(this.onRegistryEvent.bind(this)); 		
// 	},

// 	/**
// 	 * @type LRSC.Configuration
// 	 * @private
// 	 */
// 	config: null,

// 	/**
// 	 * Array of Sim.GwConn instances
// 	 * @type Array
// 	 * @private
// 	 */
// 	gwConns: null,

// 	/**
// 	 * @type Saguaro.Connection
// 	 * @private
// 	 */
// 	simConn: null,
	
// 	/**
// 	 * @type Function
// 	 * @private
// 	 */
// 	simEventListener: null,

// 	/**
// 	 * @type Function
// 	 * @private
// 	 */
// 	registryListener: null,


// 	/**
// 	 * Register simulated  gateway.
// 	 * @param eui
// 	 * @param name
// 	 * @param name
// 	 * @param position	 
// 	 */
// 	registerGateway: function(/** String */eui, /** String */name, /** Object */position) {
// 	    var gwid = this.gwConns.length;
// 	    var gwconn = new LRSC.Sim.GwConn(this, gwid, eui);
// 	    gwconn.setName(name);
// 	    gwconn.setPosition(position);
// 	    this.gwConns.push(gwconn);
// 	},
	

// 	/**
// 	 * @returns {LRSC.Configuration}
// 	 * @public
// 	 */
// 	getConfig: function () {
// 	    return this.config;
// 	},

// 	/**
// 	 * @returns {Number[]}
// 	 * @public
// 	 */
// 	getGatewayIds: function () {
// 	    var gwids = this.gwConns.map(function(conn) { return conn.gwid; });
// 	    return gwids;
// 	},

// 	/**
// 	 * @returns {Number}
// 	 * @public
// 	 */
// 	getGatewayCnt: function () {
// 	    return this.gwConns.length;
// 	},


// 	/**
// 	 * @return {Object}
// 	 * @public
// 	 */
// 	getGateways: function () {
// 	    return this.gwConns;
// 	},


// 	/**
// 	 * @param name Name 
// 	 * @return {Object}
// 	 * @public
// 	 */
// 	getGatewayByName: function (/** String */name) {
// 	    for (var i = 0; i < this.gwConns.length; i++) {
// 		if (this.gwConns[i].getName() == name) {
// 		    return this.gwConns[i];
// 		}
// 	    }
// 	    return null;
// 	},

// 	/**
// 	 * @param gwid Gateway id
// 	 * @return {Object}
// 	 * @public
// 	 */
// 	getGatewayById: function (/** Number */gwid) {
// 	    return this.gwConns[gwid];
// 	},


// 	/**
// 	 * @param conn
// 	 * @private
// 	 */
// 	startSimulating: function(/** Saguaro.Connection */conn) {
// 	    assert(conn);
// 	    if (this.simConn != null) {
// 		this.stopSimulating();
// 	    }
// 	    this.simConn = conn;
// 	    var evls = this.simConn.getEventListeners();
// 	    evls.unshift(this.simEventListener);
// 	    if (!this.beaconTransmitter) {
// 		this.beaconTransmitter = new LRSC.Sim.BeaconTransmitter(this);
// 	    }
// 	    this.beaconTransmitter.start();
// 	    var motes = LRSC.Sim.getAllSimuLoraMotes();
// 	    for( var i = 0; i < motes.length; i++ ) {
// 		var impl = Saguaro.mote2impl(motes[i]);
// 		var ec = impl.getEvConfigs();
// 		ec.setFlags("lora", "mote2gw", "H", BLCK);
// 		ec.update(BLCK);
// 	    }
// 	},


// 	/**
// 	 * @param conn
// 	 * @private
// 	 */
// 	stopSimulating: function(/** Saguaro.Connection */conn) {
// 	    if (!this.simConn) {
// 		return;
// 	    }
// 	    var evls = this.simConn.getEventListeners();
// 	    evls.remove(this.simEventListener);
// 	    if (this.beaconTransmitter) {
// 		this.beaconTransmitter.stop();
// 	    }
// 	    this.simConn = null;
// 	},



// 	/**
// 	 * @returns {String}
// 	 */
// 	getInfo: function() {
// 	    var t = new Util.Formatter.Table2(3);
// 	    t.setTitle("Gateway-Name", "Position", "Source");
// 	    var y = 0;
// 	    for (var gwid in this.gwConns) {
// 		var c = this.gwConns[gwid];
// 		t.setValue(0, y, c.getName());
// 		var pos = c.getPosition();
// 		t.setValue(1, y, "x:" + pos.x + " y:" + pos.y + " z:" + pos.z);
// 		if (c.sock) {
// 		    t.setValue(2, y, c.sock.toString());
// 		} else {
// 		    t.setValue(2, y, "Simulated");
// 		}
// 		y += 1;
// 	    }
// 	    return t.render().join("\n");
// 	},


// 	/**
// 	 * Set position of gateway
// 	 * @param gwid
// 	 * @param position
// 	 */
// 	setPosition: function(/** Number */gwid, /** Object */position) {
// 	    this.gwConns[gwid].setPosition(position);
// 	},

// 	/**
// 	 * Get position of gateway
// 	 * @param position
// 	 */
// 	getPosition: function(/** Number */gwid) {
// 	    return this.gwConns[gwid].getPosition();
// 	},


// 	/**
// 	 * @public
// 	 */
// 	close: function () {
// 	    for (var i = 0; i < this.gwConns.length; i++) {
// 		this.gwConns[i].close();
// 	    }
// 	    if (this.simConn != null) {
// 		var evls = this.simConn.getEventListeners();
// 		evls.remove(this.simEventListener);
// 		this.simConn = null;
// 	    }
// 	    if (this.registryListener) {
// 		Sonoran.Registry.removeListener(this.registryListener);
// 		this.registryListener = null;
// 	    }
// 	},

// 	/**
// 	 * @param evname
// 	 * @param gwid
// 	 * @param gwConn
// 	 * @public
// 	 */
// 	onEvent: function (/** String */evname, /** Number */gwid, /** Object */gwConn) {},


// 	/**
// 	 * @private
// 	 */
// 	onRegistryEvent: function(/** Event */evt) {
// 	    var c = evt.category;
// 	    var n = evt.evname;

// 	    if (c===Sonoran.EV_CAT_SAGUARO) {
// 		if (n===Sonoran.EV_NAME_DISCONNECT) {
// 		    this.stopSimulating();
// 		}
// 		if (n===Sonoran.EV_NAME_CONNECT) {
// 		    this.startSimulating(evt.conn);
// 		}
// 	    }
// 	    if ((c===Sonoran.EV_CAT_MOTE) && (n===Sonoran.EV_NAME_REGISTER)) {
// 		var mote = Sonoran.Registry.lookupMoteByUid(evt.uid);
// 		assert(mote);
// 		if (mote.isSimulated()) {
// 		    var impl = Saguaro.mote2impl(mote);
// 		    if (impl.getDeviceInstance("LORA") != null ) {
// 			//impl.programHaltConditions({"lora:mote2gw":1}, BLCK);
// 			var ec = impl.getEvConfigs();
// 			ec.setFlags("lora", "mote2gw", "H", BLCK);
// 			ec.update(BLCK);
// 			//QUACK(0, ec.toString());
// 		    }
// 		}
// 	    }
// 	},


// 	/** 
// 	 * @param ev
// 	 * @param eventListener
// 	 * @param halted
// 	 * @private 
// 	 */
// 	onSimEvent: function (/** Sonoran.Event */ev, /** Saguaro.Connection.EventListeners */eventListeners, /** boolean */halted) {
// 	    if (ev.category==="lora" && ev.evname==="mote2gw") {
// 		var frame = ev.media;
// 		assert(frame.rssi==null);
// 		assert(frame.snr==null);
// 		if( 'txbeg' in frame ) frame.txbeg /= 1000;
// 		if( 'txend' in frame ) frame.txend /= 1000;
// 		if( 'txpow'   in frame ) frame.txpow   /= 1000;
// 		for (var gwid=0; gwid < this.gwConns.length; gwid++) {
// 		    this.gwConns[gwid].onMote2gwEvent(ev, frame, ev.mote);
// 		}
// 		if (halted) {
// 		    eventListeners.setContinue(true);
// 		}
// 	    }
// 	},



// 	/** 
// 	 * @param gwconn
// 	 * @param status
// 	 * @private 
// 	 */
// 	onClose: function (gwconn, status) {
// 	    delete this.gwConns[gwconn.gwid];
// 	    this.onEvent('close', gwconn.gwid, gwconn); 
// 	},


// 	/** 
// 	 * @private 
// 	 */
// 	getBeaconPdu: function (seconds) {
// 	    var rfu = 0;
// 	    var chmask = 0;
// 	    var s1 = Formatter.pack("4uL3uL2uL4uL", rfu, this.config.nwkid, chmask, seconds);
// 	    var crc1 = Runtime.crc16(s1);
// 	    var info = 0;
// 	    var lat = 0;
// 	    var lon = 0;
// 	    var s2 = s1 + Formatter.pack("2uL1uL3uL3uL", crc1, info, lat, lon);
// 	    var crc2 = Runtime.crc16(s2);
// 	    var s = s2 + Formatter.pack("2uL", crc2);
// 	    //printf("BEACON: %H\n", s);
// 	    return s;
// 	}
//     }
// );






Class.define(
    "LRSC.GwConn",
    /**
     * @lends LRSC.GwConn.prototype
     */
    {
	/**
	 * Base class for gateway.
	 * @constructs
	 * @param nwksrv
	 * @param gwid
	 */
	__constr__: function (/** LRSC.NwkServer */nwksrv, /** Number */gwid, /** String */eui) {
	    this.nwksrv = nwksrv;
	    this.gwid = gwid;
	    this.eui = eui;
	    this.name = eui;
	    this.position = { x: 0, y: 0, z: 0 };
	},

	toString: function() {
	    return sprintf("%s: %f %f %f", this.getName(), this.position.x, this.position.y, this.position.z);
	},

	/**
	 * @returns {Boolean}
	 */
	isSimulated: function() {
	    return true;
	},

	/**
	 * @returns {String}
	 */
	getName: function() {
	    return this.name;
	},


	/**
	 * @returns {Number}
	 */
	getId: function() {
	    return this.gwid;
	},

	/**
	 * @returns {Number}
	 */
	getEui: function() {
	    return this.eui;
	},


	/**
	 * @param {String}
	 */
	setName: function(/** String */name) {
	    this.name = name;
	},

	/**
	 * @returns {Object} Position
	 */
	getPosition: function() {
	    return { x: this.position.x, y: this.position.y, z: this.position.z };
	},

	/**
	 * @param position
	 */
	setPosition: function(/** Object */position) {
	    if (position.x != null) { this.position.x = position.x; }
	    if (position.y != null) { this.position.y = position.y; }
	    if (position.z != null) { this.position.z = position.z; }
	},

	/**
	 *
	 */
	close: function() {
	    assert(false);
	}
    }
);










/**
 * Global instance of NwkServer.
 * @type LRSC.NwkServer
 * @private
 */
LRSC.nwkServer = null;

/**
 * @returns {LRSC.NwkServer} Network server
 */
LRSC.getNwkServer = function() {
    var nwksrv = LRSC.nwkServer;
    if (nwksrv == null) {
	throw new Exception("Network server not yet started!");
    }
    return nwksrv;
};








Class.define(
    "LRSC.NwkServer",
    /**
     * @lends LRSC.NwkServer.prototype
     */
    {
	/**
	 * Start network server.
	 * @constructs
	 * @param simulated True or Saguaro.Connection to start endpoint for simulated network
	 * @param config    Configuration, if null default configuration
	 */
	__constr__:function (/** Boolean */simulated, /** LRSC.Configuration */config) {
	    if (LRSC.nwkServer != null) {
		throw new Exception("Network server already started!");
	    }

	    this.registryListener = Event.Registry.addListener(this.onRegistryEvent.bind(this)); 

	    this.config = config||new LRSC.Configuration();
	    this.gwConns = [];
	    assert((simulated === true) || (simulated instanceof Saguaro.Connection));
	    this.simEventListener = this.onSimEvent.bind(this);
	    var simConn;
	    if (simulated instanceof Saguaro.Connection) {
		simConn = simulated;
	    } else {
		simConn = Saguaro.Connection.getConnection();
	    }
	    this.beaconTransmitter = null;
	    if (simConn) {
		this.startSimulating(simConn);
	    }
	    this.addr2mote = {};
	    this.deveui2mote = {};
	    this.DEVICE_ADDR = 1;
	    this.arteui2srv = {};
	    LRSC.nwkServer = this;
	},

	/**
	 * @type LRSC.Configuration
	 * @private
	 */
	config: null,

	/**
	 * Array of Sim.GwConn instances
	 * @type Array
	 * @private
	 */
	gwConns: null,

	/**
	 * @type Saguaro.Connection
	 * @private
	 */
	simConn: null,
	
	/**
	 * @type Function
	 * @private
	 */
	simEventListener: null,

	/**
	 * @type Function
	 * @private
	 */
	registryListener: null,

	/**
	 * Map of devuce address to mote
	 * @type Object
	 * @private
	 */
	addr2mote: {},

	/**
	 * Map of device eui to mote
	 * @type Object
	 * @private
	 */
	deveui2mote: {},

	/**
	 * Map of arteui to LRSC.ArtSrv.
	 * @type Object
	 * @private
	 */
	arteui2srv: {},

	/**
	 * @type LRSC.Sim.BeaconTransmitter
	 * @private
	 */
	beaconTransmitter: null,


	/**
	 * Register simulated  gateway.
	 * @param eui
	 * @param name
	 * @param name
	 * @param position	 
	 */
	registerGateway: function(/** String */eui, /** String */name, /** Object */position) {
	    var gwid = this.gwConns.length;
	    var gwconn = new LRSC.Sim.GwConn(this, gwid, eui);
	    gwconn.setName(name);
	    gwconn.setPosition(position);
	    this.gwConns.push(gwconn);
	},
	

	/**
	 * @returns {LRSC.Configuration}
	 * @public
	 */
	getConfig: function () {
	    return this.config;
	},

	/**
	 * @returns {Number[]}
	 * @public
	 */
	getGatewayIds: function () {
	    var gwids = this.gwConns.map(function(conn) { return conn.gwid; });
	    return gwids;
	},

	/**
	 * @returns {Number}
	 * @public
	 */
	getGatewayCnt: function () {
	    return this.gwConns.length;
	},


	/**
	 * @return {Object}
	 * @public
	 */
	getGateways: function () {
	    return this.gwConns;
	},


	/**
	 * @param name Name 
	 * @return {Object}
	 * @public
	 */
	getGatewayByName: function (/** String */name) {
	    for (var i = 0; i < this.gwConns.length; i++) {
		if (this.gwConns[i].getName() == name) {
		    return this.gwConns[i];
		}
	    }
	    return null;
	},

	/**
	 * @param gwid Gateway id
	 * @return {Object}
	 * @public
	 */
	getGatewayById: function (/** Number */gwid) {
	    return this.gwConns[gwid];
	},


	/**
	 * @param conn
	 * @private
	 */
	startSimulating: function(/** Saguaro.Connection */conn) {
	    assert(conn);
	    if (this.simConn != null) {
		this.stopSimulating();
	    }
	    this.simConn = conn;
	    var evls = this.simConn.getEventListeners();
	    evls.unshift(this.simEventListener);
	    if (!this.beaconTransmitter) {
		this.beaconTransmitter = new LRSC.Sim.BeaconTransmitter(this);
	    }
	    this.beaconTransmitter.start();
	    var motes = LRSC.Sim.getAllSimuLoraMotes();
	    for( var i = 0; i < motes.length; i++ ) {
		var impl = Saguaro.mote2impl(motes[i]);
		var ec = impl.getEvConfigs();
		ec.setFlags("lora", "mote2gw", "H", BLCK);
		ec.update(BLCK);
	    }
	},


	/**
	 * @param conn
	 * @private
	 */
	stopSimulating: function(/** Saguaro.Connection */conn) {
	    if (!this.simConn) {
		return;
	    }
	    var evls = this.simConn.getEventListeners();
	    evls.remove(this.simEventListener);
	    if (this.beaconTransmitter) {
		this.beaconTransmitter.stop();
	    }
	    this.simConn = null;
	},



	/**
	 * @public
	 */
	close: function () {
	    for (var i = 0; i < this.gwConns.length; i++) {
		this.gwConns[i].close();
	    }
	    if (this.simConn != null) {
		var evls = this.simConn.getEventListeners();
		evls.remove(this.simEventListener);
		this.simConn = null;
	    }
	    if (this.registryListener) {
		Sonoran.Registry.removeListener(this.registryListener);
		this.registryListener = null;
	    }
	    LRSC.nwkServer = null;
	},

	/**
	 * @param evname
	 * @param gwid
	 * @param gwConn
	 * @private
	 */
	onEvent: function (/** String */evname, /** Number */gwid, /** Object */obj) {
	    if (evname === 'data') {
		var gwConn = this.getGatewayById(gwid);
		assert(gwConn);
		var frame = obj;
		this.onLoraFrame(frame, gwConn);
	    }
	},


	/**
	 * @private
	 */
	onRegistryEvent: function(/** Event */evt) {
	    var c = evt.category;
	    var n = evt.evname;

	    if (c===Sonoran.EV_CAT_SAGUARO) {
		if (n===Sonoran.EV_NAME_DISCONNECT) {
		    this.stopSimulating();
		}
		if (n===Sonoran.EV_NAME_CONNECT) {
		    this.startSimulating(evt.conn);
		}
	    }
	    if ((c===Sonoran.EV_CAT_MOTE) && (n===Sonoran.EV_NAME_REGISTER)) {
		var mote = Sonoran.Registry.lookupMoteByUid(evt.uid);
		assert(mote);
		if (mote.isSimulated()) {
		    var impl = Saguaro.mote2impl(mote);
		    if (impl.getDeviceInstance("LORA") != null ) {
			//impl.programHaltConditions({"lora:mote2gw":1}, BLCK);
			var ec = impl.getEvConfigs();
			ec.setFlags("lora", "mote2gw", "H", BLCK);
			ec.update(BLCK);
			//QUACK(0, ec.toString());
		    }
		}
	    }
	},


	/** 
	 * @param ev
	 * @param eventListener
	 * @param halted
	 * @private 
	 */
	onSimEvent: function (/** Sonoran.Event */ev, /** Saguaro.Connection.EventListeners */eventListeners, /** boolean */halted) {
	    if (ev.category==="lora" && ev.evname==="mote2gw") {
		var frame = ev.media;
		assert(frame.rssi==null);
		assert(frame.snr==null);
		if( 'txbeg' in frame ) frame.txbeg /= 1000;
		if( 'txend' in frame ) frame.txend /= 1000;
		if( 'txpow'   in frame ) frame.txpow   /= 1000;
		for (var gwid=0; gwid < this.gwConns.length; gwid++) {
		    this.gwConns[gwid].onMote2gwEvent(ev, frame, ev.mote);
		}
		if (halted) {
		    eventListeners.setContinue(true);
		}
	    }
	},



	/** 
	 * @param gwconn
	 * @param status
	 * @private 
	 */
	onGatewayClose: function (gwconn, status) {
	    delete this.gwConns[gwconn.gwid];
	    this.onEvent('close', gwconn.gwid, gwconn); 
	},


	/** 
	 * @private 
	 */
	getBeaconPdu: function (seconds) {
	    var rfu = 0;
	    var chmask = 0;
	    var s1 = Formatter.pack("4uL3uL2uL4uL", rfu, this.config.nwkid, chmask, seconds);
	    var crc1 = Runtime.crc16(s1);
	    var info = 0;
	    var lat = 0;
	    var lon = 0;
	    var s2 = s1 + Formatter.pack("2uL1uL3uL3uL", crc1, info, lat, lon);
	    var crc2 = Runtime.crc16(s2);
	    var s = s2 + Formatter.pack("2uL", crc2);
	    //printf("BEACON: %H\n", s);
	    return s;
	},

	

	/**
	 * @returns {String}
	 */
	getNwkEui: function() {
	    return this.config.nwkeui;
	},

	/**
	 * @returns {Number}
	 */
	getNwkid: function() {
	    return this.config.nwkid;
	},

	
	/**
	 * @returns {String}
	 */
	getInfo: function() {
	    var t = new Util.Formatter.Table2(3);
	    t.setTitle("Gateway-Name", "Position", "Source");
	    var y = 0;
	    for (var gwid in this.gwConns) {
		var c = this.gwConns[gwid];
		t.setValue(0, y, c.getName());
		var pos = c.getPosition();
		t.setValue(1, y, "x:" + pos.x + " y:" + pos.y + " z:" + pos.z);
		if (c.sock) {
		    t.setValue(2, y, c.sock.toString());
		} else {
		    t.setValue(2, y, "Simulated");
		}
		y += 1;
	    }
	    var txt = t.render().join("\n");
	    //var txt = this.gwEndPoint.getInfo();
	    txt += "\n\n";

	    var t = new Util.Formatter.Table2(2);
	    t.setTitle("Mote-EUI", "Device-Address");
	    var y = 0;
	    for (var eui in this.deveui2mote) {
		var mote = this.deveui2mote[eui];
		var attr = mote.getAttribute('lora');
		var addr = attr.getAddr();
		t.setValue(0, y, eui);
		t.setValue(1, y, addr.toString(16));
		y += 1;
	    }
	    txt += t.render().join("\n");
	    return txt;
	},



	/**
	 * Register and start an ART.
	 * @param arteui
	 * @param port
	 */
	registerArtSrv: function(/** String */arteui, /** Number */port) {
	    if (this.arteui2srv[arteui]) {
		this.arteui2srv[arteui].close();
	    }
	    this.arteui2srv[arteui] = new LRSC.ArtSrv(arteui, this, port);
	    return this.arteui2srv[arteui];
	},

	/**
	 * Deregister an ART.
	 * @param arteui
	 */
	deregisterArtSrv: function(/** String */arteui) {
	    if (this.arteui2srv[arteui]) {
		this.arteui2srv[arteui].close();
	    }
	    delete this.arteui2srv[arteui];
	},


	/**
	 * Return connection to ART managed by this server. 
	 * @param arteui
	 * @returns {Object}
	 */
	getArtSrv: function(/** String */arteui) {
	    return this.arteui2srv[arteui];
	},



	/**
	 * @param deveui
	 * @param addr
	 * @param arteui
	 * @returns {Sonoran.Mote}
	 * @private
	 */
	registerMote: function(/** String */deveui, /** Number */addr, /** String */arteui) {
	    var mote = Sonoran.Registry.lookupMoteByUniqueid(deveui);
	    assert(mote);
	    if (!mote) {
		// new hardware mote
		var impl = new Sonoran.HW.MoteImpl(deveui, sprintf("lora:%x", addr), null);
		mote = impl.mote;
		mote.setState(Sonoran.Mote.ON);
	    }
	    assert(mote); 
	    if (addr == null) {
		while(true) {
		    addr = this.DEVICE_ADDR;
		    if (!this.addr2mote[addr]) {
			break;
		    }
		    this.DEVICE_ADDR += 1;
		}
	    } else {
		if (this.addr2mote[addr]) {
		    throw new Exception(sprintf("LRSC mote address '%x' already registered!", addr));
		}
	    }
	    Logger.println(sprintf("LRSC.NwkServer.registerMote: %s, addr %x", deveui, addr), "LORA");
	    var attr = LRSC.createMoteAttr(this, mote, addr, arteui);
	    mote.setAttribute('lora', attr);
	    this.addr2mote[addr] = mote;
	    this.deveui2mote[deveui] = mote;
	    return mote;
	},


	/**
	 * @param mote
	 * @private
	 */
	deregisterMote: function(/** Sonoran.Mote */mote) {
	    var mattr = LRSC.getMoteAttribute(mote);
	    assert(mattr);
	    assert(this.addr2mote[mattr.addr]);
	    delete this.addr2mote[mattr.addr];
	    var deveui = mote.getUniqueid();
	    assert(this.deveui2mote[deveui]);
	    delete this.deveui2mote[deveui];
	    mote.setAttribute('lora', null);
	},


	    
	/**
	 * Enqueue packet for transmission to mote on a future receive window.
	 * @param mote
	 * @param mode
	 * @param port
	 * @param payload
	 * @param callback   Optional
	 */
	transmit: function(/** Sonoran.Mote */mote, /** Number */mode, /** Number */port, /** String */payload, /** Function */callback) {
	    assert(arguments.length===4);
	    assert(mode==0||mode==LRSC.ADN_MODE_CONFIRMED);
	    var obj = {
		mode: mode,
		port: port,
		payload: payload
	    };
	    LRSC.getMoteAttribute(mote).addTxJob(obj, callback);
	},



	/**
	 * A packet has been received from a mote via a gateway. this function parses the 
	 * mac header and the payload and waits for other frames to arrive from other
	 * gateways. 
	 * @param frame Received message
	 * @param gwConn
	 */
	onLoraFrame: function(/** Object */frame, /** Object */gwConn) {
	    Logger.println("LRSC.NwkServer.onLoraFrame:\n" + LRSC.frame2str(frame), "LORA");
	    var mote, attr, packet, arr;

	    frame.gwid = gwConn.getId();
	    
	    var hdr = (frame.data.charCodeAt(0)&SaguaroDEFS.LORA_HDR_FTYPE); 
	    switch(hdr) {
	    case SaguaroDEFS.LORA_HDR_FTYPE_JREQ:
	    case SaguaroDEFS.LORA_HDR_FTYPE_REJOIN: {
		packet = LRSC.unpackJoinPacket(frame.data);
		mote = this.deveui2mote[packet.deveui];
		if (!mote) {
		    mote = this.registerMote(packet.deveui, null, packet.arteui);
		    Logger.println(sprintf("onLoraFrame: received join for new mote: %s  %s\n", packet.deveui, mote), "LORA");
		} else {
		    Logger.println(sprintf("onLoraFrame: received join for known mote %s\n", mote), "LORA");
		}
		attr = mote.getAttribute('lora');
		assert(attr);
		break;
	    }
	    case SaguaroDEFS.LORA_HDR_FTYPE_DAUP:
	    case SaguaroDEFS.LORA_HDR_FTYPE_DCUP: {
		var addr = LRSC.Packet.unpackDeviceAddr(frame.data);
		mote = this.addr2mote[addr];
		if (!mote) {
		    Logger.err(sprintf("Ignore frame from unregistered mote address %08x:\n%s\n", addr, Util.formatData(frame)));
		    return;
		}
		
		attr = mote.getAttribute('lora');
		assert(attr);
		break;
	    }
	    default: {
		Logger.err("Unsupported header type in frame: hdr_ftype %x\n%s\n", hdr, Util.formatData(frame));
		return;
	    }
	    }

	    attr.onRxFrame(frame, gwConn);
	},

	
	/**
	 * @returns {String}
	 */
	toString: function() {
	    return "LRSC.NwkServer: " + this.config.nwkeui;
	}
    }
);














Class.define(
    "LRSC.ArtSrv",
    /**
     * @lends LRSC.ArtSrv.prototype
     */
    {
	/**
	 * Application router for simulated network server and simulated applications.
	 * @constructs
	 * @param {String} arteui
	 * @param {LRSC.NwkServer} nwksrv
	 * @param {Number} port
	 * @private
	 */
	__constr__: function(/** String */arteui, /** String */nwksrv, /** Number */port) {
	    this.arteui = arteui;
	    this.nwksrv = nwksrv;
	    this.links = [];
	    this.eui2dev = {};
	    this.msgsrv = new LRSC.IO.MsgServer();
	    this.msgsrv.onAccept = this.onAccept.bind(this);
	    this.msgsrv.open(port||LRSC.DEFAULT_PORT.ART_APP, BLCK);
	    
	},

	/**
	 * @param {LRSC.IO.MsgLink} link
	 * @private
	 */
	onAccept: function(link) {
	    var _this = this;
	    link.onJsonMsg = function(obj) {
		_this.onJsonMsg(link, obj);
	    };
	    link.onClose = function(status) {
		var idx = _this.links.indexOf(link);
		if (idx >= 0) {
		    _this.links.splice(idx, 1);
		}
	    };
	    this.links.push(link);
	},

	/**
	 * @param {LRSC.IO.MsgLink} link
	 * @param {Object} obj
	 * @private
	 */
	onJsonMsg: function(link, obj) {
	    if (obj.msgtag === LRSC.IO.MSGTAG.adn) {
		var deveui = obj.deveui;
		var seqno = obj.seqno;
		var mode = obj.mode;
		var timeout = obj.timeout;
		var port = obj.port;
		var pdu = obj.pdu;
		var dev = this.eui2dev[deveui];
		if (!dev) {
		    printf("LRSC.ArtSrv.onJsonMsg: no such device %s\n", deveui);
		    return;
		}
		assert(seqno!==undefined, "LRSC.ArtSrv.onJsonMsg: invalid ADN message: undefined 'seqno'");
		assert(mode!==undefined, "LRSC.ArtSrv.onJsonMsg: invalid ADN message: undefined 'mode'");
		assert(timeout!==undefined, "LRSC.ArtSrv.onJsonMsg: invalid ADN message: undefined 'timeout'");
		assert(port!==undefined, "LRSC.ArtSrv.onJsonMsg: invalid ADN message: undefined 'port'");
		assert(pdu!==undefined, "LRSC.ArtSrv.onJsonMsg: invalid ADN message: undefined 'pdu'");
		
		printf("LRSC.ArtSrv.onJsonMsg: send down:%s\n", Util.formatData2(obj));
		
		var mote = LRSC.getMoteAttribute(deveui);
		assert(mote);
		var txjob = {
		    port: port,
		    payload: pdu,
		    mode: mode
		};
		var _this = this;
		mote.addTxJob(txjob, function(status) {
		    var adni = {
			msgtag: LRSC.IO.MSGTAG.adni,
			deveui: deveui,
			seqno: seqno,
			info: 0              //XXX
		    };
		    printf("LRSC.ArtSrv.onJsonMsg: send up: %s\n", Util.formatData(adni));
		    _this.sendJsonMsgs(adni);
		});
	    } else {
		println("Unhandled message:\n" + Util.formatData(obj));
	    }
	},
	
	/**
	 * @private
	 */
	close: function() {
	    var links = this.links;
	    for (var i = 0; i < links.length; i++) {
		links[i].close(new AOP.OK());
	    }
	    this.msgsrv.close(SCB);
	},

	/**
	 * @param deveui
	 * @param arteui
	 * @param nwkeui
	 * @private
	 */
	onAjn: function(/** String */deveui, /** String */arteui, /** String */nwkeui) {
	    this.registerDevice(deveui, true);
	},

	/**
	 * @param deveui
	 * @param seqno
	 * @param port
	 * @param pdu
	 * @private
	 */
	onAup: function(/** String */deveui, /** Number */seqno, /** Number */port, /** String */pdu) {
	    var dev = this.registerDevice(deveui, false);
	    var msg = {
		msgtag: LRSC.IO.MSGTAG.aup,
		deveui: deveui,
		seqno: seqno,
		port: port,
		pdu: pdu
	    };
	    this.sendJsonMsgs(msg);
	},

	/**
	 * @param {String} deveui
	 * @param {Boolan} notify
	 * @private
	 */
	registerDevice: function(deveui, notify) {
	    var dev = this.eui2dev[deveui];
	    if (!dev) {
		dev = {
		    deveui: deveui,
		    seqno: 0,
		    seqno2dnrq: {}
		};
		printf("Router: add unknown device: %s\n", Util.formatData(dev));
		this.eui2dev[deveui] = dev;
		notify = true;
	    }
	    if (notify) {
		var msg =  {
		    msgtag: LRSC.IO.MSGTAG.ajn,
		    deveui: deveui,
		    arteui: this.arteui,
		    nwkeui: this.nwksrv.getNwkEui()
		};
		this.sendJsonMsgs(msg);
	    }
	    return dev;
	},

	/**
	 * @param obj
	 * @private 
	 */
	sendJsonMsgs: function(obj) {
	    for (var i = 0; i < this.links.length; i++) {
		this.links[i].sendJsonMsg(obj);
	    }
	}
    }
);







/**
 * Link art server with local art client
 * @param artsrv
 * @param artcl
 * @returns {Object} link to be used in artcl
 * @private
 */
LRSC.bridgeArtSrvCl = function(artsrv, artcl) {
    var srv, cl;
    srv = {
	close: function(status) {
	    //cl.close(status);   otherwise recursion!
	    this.onClose(status);
	},

	onClose: function(status) {},

	sendJsonMsg: function(obj) {
	    cl.onJsonMsg(obj);
	},
	
	onJsonMsg: function(obj) {}
    };
    cl = {
	close: function(status) {
	    srv.close(status);
	    this.onClose(status);
	},

	onClose: function(status) {},

	sendJsonMsg: function(obj) {
	    srv.onJsonMsg(obj);
	},
	
	onJsonMsg: function(obj) {}
    };

    artsrv.onAccept(srv);
    return cl;
};
