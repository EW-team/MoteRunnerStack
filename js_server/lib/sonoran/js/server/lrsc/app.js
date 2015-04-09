//  (C) COPYRIGHT INTERNATIONAL BUSINESS MACHINES CORPORATION 2013-2013
//                       ALL RIGHTS RESERVED
//        IBM Research Division, Zurich Research Laboratory
// --------------------------------------------------------------------





Class.define(
    "LRSC.ArtCl",
    /**
     * @lends LRSC.ArtCl.prototype
     */
    {
	/**
	 * Connects to the ART and exchanges the messages between ART
	 * and the more abstract application instance. 
	 * @constructs
	 * @param arteui
	 * @param app
	 * @param host         If null, connects to in-sonoran simulated ArtSrv
	 * @param port
	 * @param options      Object with optionally 'appeui' and 'sslctx' 
	 */
	__constr__: function(/** String */arteui, /** LRSC.Application */app, /** String */nwksrvHost, /** Number */nwksrvPort, /** Object */options) {
	    if (!nwksrvPort) { nwksrvPort = LRSC.DEFAULT_PORT.ART_APP; }
	    this.nwksrvHost = nwksrvHost;
	    this.nwksrvPort = nwksrvPort;
	    this.arteui = arteui;
	    assert(this.arteui);
	    this.app = app;
	    this.eui2dev = {};
	    this.nwkeui = null;
	    this.link = null;
	    this.localArtSrv = (nwksrvHost==null);
	    if (!options) { options = {}; }
	    this.options = options;
	    if (!options.appeui) { options.appeui = "FF-00-00-00-00-00-00-00"; }
	    try {
		this.open();
	    } catch(ex) {
		println(Runtime.dumpException(ex));
		var txt = "Cannot open ArtCl client: " + ex;
		this.close(new AOP.ERR(txt));
		throw new Exception(txt);
	    }
	    this.app.router = this;
	},

	/**
	 * @type String
	 * @private
	 */
	nwksrvHost: null,

	/**
	 * @type Number
	 * @private
	 */
	nwksrvPort: null,

	/**
	 * @type Boolean
	 * @private
	 */
	localArtSrv: false,
	
	/**
	 * @type String
	 * @private
	 */
	arteui: null,

	/**
	 * @type LRSC.IO.MsgLink
	 * @private
	 */
	link: null,

	/**
	 * @type String
	 * @private
	 */
	options: null,

	/**
	 * Map of eui to application device
	 * @type Object
	 * @private
	 */
	eui2dev: {},

	/**
	 * @type LRSC.Application
	 * @private
	 */
	app: null,


	/**
	 * @returns {String}
	 */
	getARTEui: function() {
	    return this.arteui;
	},

	/**
	 * @returns {String}
	 */
	getInfo: function() {
	    var sa = [];
	    for (var eui in this.eui2dev) { sa.push(eui); }
	    return this.arteui + ": " + (sa.length==0 ? "---" : sa.join(", "));
	},


	/**
	 * Returns all registered devices.
	 * @returns {Object}  Map of device eui to device state
	 */
	getDevices: function() {
	    return this.eui2dev;
	},

	/**
	 * @private
	 */
	open: function() {
	    if (this.link != null) {
		throw new Exception("Link already connected!");
	    }
	    LRSC.ArtCl.add(this.arteui, this);
	    if (this.localArtSrv) {
		var artsrv = LRSC.getNwkServer().getArtSrv(this.arteui);
		assert(artsrv);
		this.link = LRSC.bridgeArtSrvCl(artsrv, this);
		
	    } else {
		var sock;
		if (this.options.sslctx) {
		    sock = new IO.SSLSocket(this.options.sslctx);
		} else {
		    sock = new IO.TCPSocket();
		}
		sock.open(this.nwksrvHost, this.nwksrvPort, BLCK);
		sock.send(LRSC.IO.MAGIC_JSON);
		this.link = new LRSC.IO.MsgLink(sock, false, "JSON");
		var entity = {
		    eui   : this.options.appeui,
		    euidom: LRSC.IO.EUIDOM.APP,
		    major : 1,
		    minor : 0,
		    build : 0,
		    name  : "Sonoran-APP-LRSC:" + this.options.appeui
		};
		var _this = this;
		this.link.sendHello(entity);
		this.link.onHelloSent(entity);
	    }
	    this.link.onClose = this.close.bind(this);
	    this.link.onJsonMsg = this.onJsonMsg.bind(this);
	    this.app.router = this;
	    this.app.onStart();
	},


	/**
	 * @private
	 */
	onJsonMsg: function(obj) {
	    var msgtag = obj.msgtag;
	    if (msgtag === LRSC.IO.MSGTAG.ajn) {
		this.onAjn(obj);
	    } else if (msgtag === LRSC.IO.MSGTAG.aup) {
		this.onAup(obj);
	    } else if (msgtag === LRSC.IO.MSGTAG.adni) {
		this.onAdni(obj);
	    } //else {
		//printf("LRSC.ArtCl.onJsonMsg:\n%s\n", Util.formatData(obj));
	    //}
	    this.app.onArtMsg(obj);
	},
	
	/**
	 * Stop router.
	 * @param {AOP.Result} status
	 */
	close: function(status) {
	    if (this.link != null) {
		var link = this.link;
		this.link = null;
		link.close(status);
		this.app.onStop();
		this.app.router = null;
		this.eui2dev = {};
		LRSC.ArtCl.remove(this.arteui);
	    }
	    
	},


	/**
	 * @param ajn
	 * @private
	 */
	onAjn: function(/** Object */ajn) {
	    printf("LRSC.ArtCl.onAjn: %s\n", Util.formatData(ajn));
	    assert(ajn.deveui);
	    assert(ajn.arteui);
	    assert(ajn.nwkeui);
	    assert(ajn.arteui == this.arteui);
	    assert(!this.nwkeui || (this.nwkeui == ajn.nwkeui));
	    this.nwkeui = ajn.nwkeui;
	    this.registerDevice(ajn.deveui, true);
	},


	/**
	 * @param aup
	 * @private
	 */
	onAup: function(/** Object */aup) {
	    assert(aup.deveui!=null);
	    assert(aup.seqno!=null);
	    var deveui = aup.deveui;
	    var dev = this.registerDevice(deveui);
	    //this.app.onDevDataUp(deveui, aup);
	},

	
	/**
	 * @param adni
	 * @private
	 */
	onAdni: function(/** Object */adni) {
	    assert(adni.deveui!=null);
	    assert(adni.seqno!=null);
	    assert(adni.info!=null);
	    var deveui = adni.deveui;
	    var dev = this.registerDevice(deveui);
	    //printf("LRSC.ArtCl.onAdni: deveui %s , seqno %d, info 0x%x\n", deveui, adni.seqno, adni.info);
	    var obj = dev.seqno2dnrq[adni.seqno];
	    if (obj) {
		//printf("LRSC.ArtCl.onAdni: notifying callback for seqno %d\n", adni.seqno);
		delete dev.seqno2dnrq[adni.seqno];
		obj.callback(deveui, adni);
	    }
	},
	
	/**
	 * @param deveui
	 * @param notify
	 * @private
	 */
	registerDevice: function(/** String */deveui, /** Boolean */notify) {
	    var dev = this.eui2dev[deveui];
	    if (!dev) {
		dev = {
		    deveui: deveui,
		    arteui: this.arteui,
		    nwkeui: this.nwkeui,
		    seqno: 0,
		    seqno2dnrq: {}
		};
		printf("LRSC.ArtCl: add device: %s\n", Util.formatData2(dev));
		this.eui2dev[deveui] = dev;
		notify = true;
	    }
	    if (notify) {
		this.app.onDevJoinUp(dev.deveui, dev);
	    }
	    return dev;
	},


	/**
	 * Send data to application router and then at some point to the device.
	 * @param deveui
	 * @param mode
	 * @param timeout
	 * @param port
	 * @param pdu
	 * @param callback     If confirmation is requested (mode==LRSC.ADN_MODE_CONFIRMED), receives deveui and adni object with confirmation status
	 */
	sendDnData: function(deveui, mode, timeout, port, pdu, callback) {
	    var dev = this.eui2dev[deveui];
	    if (!dev) {
		throw new Exception("Router.sendDnData: unknown device " + deveui);
	    }
	    var _seqno = dev.seqno;
	    dev.seqno += 1;
	    var adn = {
		msgtag: LRSC.IO.MSGTAG.adn,
		deveui: deveui,
		seqno: _seqno,
		mode: mode,
		timeout: timeout,
		port: port,
		pdu: pdu
	    };
	    //printf("ArtCl.sendDnData: seqno %d, %s\n", _seqno, Util.formatData2(adn));
	    if ((mode&LRSC.ADN_MODE_CONFIRMED) != 0) {
		assert(callback);
		dev.seqno2dnrq[_seqno] = {
		    deveui: deveui,
		    mode: mode,
		    timeout: timeout,
		    seqno: _seqno,
		    port: port,
		    pdu: pdu,
		    callback: callback
		};
	    }
	    this.link.sendJsonMsg(adn);
	},

	/**
	 * @param {String} deveui
	 * @returns {Number}
	 * @private
	 */
	getNextDnSeqno: function (deveui) {
	    return this.eui2dev[deveui].seqno;
	},

	/**
	 * @param {String} deveui
	 * @param {Number} seqno
	 * @private
	 */
	setNextDnSeqno: function (deveui, seqno) {
	    this.eui2dev[deveui].seqno = seqno;
	},

	/**
	 * @returns {String}
	 */
	toString: function() {
	    return sprintf("Router:%s", this.arteui);
	}
    },
    {
	/**
	 * Map of application euis to installed routers
	 * @type Object
	 * @private
	 */
	arteui2routers: {},

	/**
	 * Add application router.
	 * @param {String} arteui
	 * @param {LRSC.ArtCl} obj
	 * @private
	 */
	add: function(arteui, obj) {
	    if (this.arteui2routers[arteui]) {
		this.arteui2routers[arteui].close();
	    }
	    this.arteui2routers[arteui] = obj;
	},

	/**
	 * Return application router.
	 * @param {String} arteui
	 * @returns {LRSC.ArtCl} obj
	 */
	get: function(arteui) {
	    return this.arteui2routers[arteui];
	},

	/**
	 * Remove application router.
	 * @param {String} arteui
	 * @private
	 */
	remove: function(arteui) {
	    delete this.arteui2routers[arteui];
	},


	/**
	 * @returns LRSC.ArtCl[]
	 */
	getAll: function() {
	    return Blob.map(this.arteui2routers);
	},

	/**
	 * Lookup application router for a registered device with specified partial EUI.
	 * @param eui
	 * @returns {Object} Object with arteui and deveui
	 */
	lookupDeviceByEui: function(/** String */eui) {
	    eui = eui.toUpperCase();
	    var ret = [];
	    for (var arteui in this.arteui2routers) {
		var router = this.arteui2routers[arteui];
		var eui2dev = router.getDevices();
		for (var deveui in eui2dev) {
		    if (deveui.indexOf(eui) >= 0) {
			ret.push({ arteui: router.getARTEui(), deveui: deveui });
		    }
		}
	    }
	    if (ret.length == 0) {
		throw new Exception(sprintf("No such device registered with an ART: %s", eui));
	    } else if (ret.length > 1) {
		throw new Exception(sprintf("Multiple devices match EUI: %s\n%s", eui, Util.formatData(ret)));
	    }
	    return ret[0];
	}
    }
);








Class.define(
    "LRSC.Application",
    /**
     * @lends LRSC.Application.prototype
     */
    {
	/**
	 * Interface for a LRSC server-side application. Use mrsh commands
	 * to connect to an ART and to instantiate your LRSC.Application instance.
	 * Receive ART data in onArtMsg and onDevJoinUp. Send data back using the
	 * LRSC.ArtCl router.
	 * @constructs
	 */
	__constr__: function() {
	    this.router = null;
	},

	/**
	 * @returns {LRSC.ArtCl} router
	 */
	getRouter: function() {
	    return this.router;
	},

	/**
	 * Called by router on connection to remote app router.
	 */
	onStart: function() {
	    println("AppHandler: router started!");
	},

	/**
	 * Called by router when connection was closed.
	 */
	onStop: function() {
	    println("AppHandler: router stopped!");
	},

	/**
	 * Called by router when new device came up.
	 */
	onDevJoinUp: function(/** String */deveui, /** Object */descr) {
	    printf("AppHandler.onDevJoinUp: deveui: %s, descr: %s\n", deveui, Util.formatData2(descr));
	},

	/**
	 * Called by router when device data was received.
	 */
	onArtMsg: function(/** Object */obj) {
	    printf("AppHandler.onAppMsg: %s\n", Util.formatData2(obj));
	}
    }
);






