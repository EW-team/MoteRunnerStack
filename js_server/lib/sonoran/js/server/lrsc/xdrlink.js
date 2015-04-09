// updated by: make -C ~lrsc/src/xdrc



// =========================================================
// ------------------- DO NOT MODIFY -----------------------
// --------------- This is a copy of: xdrlink.js
// ------- Only modify the original source file! -----------
// ---------------------------------------------------------
// =========================================================




















//==================================================================================================
//
// 
//
//==================================================================================================

XDR.makeNamespace("LRSC.IO");

/**
 * LRSC.IO.DOMAIN enum over EUI domains
 */
LRSC.IO.DOMAIN = {
    // NOTE: Keep in sync with simtypes.hpp edom_t
    NONE:0, "0":"NONE",
    APP :1, "1":"APP",
    NWK :2, "2":"NWK",
    ART :3, "3":"ART",
    GW  :4, "4":"GW",
    NCC :5, "5":"NCC",
    DEV :6, "6":"DEV",
    SIM :7, "7":"SIM",
    ANY :8, "8":"ANY"
};
  

/**
 * LRSC.IO.Identity used to name XdrLink peers.
 * @class
 * @constructor
 */
LRSC.IO.Identity = function (domain,eui,name) {
    this.domain = domain;
    this.eui = eui;
    this.major = 0;
    this.minor = 0;
    this.build = 0;
    this.name  = name||"";
}
LRSC.IO.Identity.prototype = {
    toString: function () {
	return sprintf("%s/%s %u.%u.%08X %s",
		       this.domain, this.eui,
		       this.major, this.minor, this.build,
		       this.name);
    },

    encode: function () {
	var name = this.name;
	if( name.length > LRSC.IO.Identity.MAX_NAME_LEN )
	    name = name.substr(0,LRSC.IO.Identity.MAX_NAME_LEN);
	var pad = [];
	for( var l=this.name.length; l < LRSC.IO.Identity.MAX_NAME_LEN; l++ )
	    pad.push("\u0000");
	name = name+pad.join("");
	return Formatter.pack("8EL4uLuu2uL"+LRSC.IO.Identity.MAX_NAME_LEN+"d",
			      this.eui, this.build,
			      LRSC.IO.DOMAIN[this.domain]||0,
			      this.major, this.minor, this.name);
    },
}
LRSC.IO.Identity.MAX_NAME_LEN = 128;  // NOTE: Keep in sync with nio.hpp::Identity::MAX_NAME_LEN !!!!
LRSC.IO.Identity.ME = new LRSC.IO.Identity("ANY","00-00-00-00-00-00-00-00","lrsc-js XdrLink");
LRSC.IO.Identity.decode = function (data) {
    var obj = Formatter.unpackObj(data, 0,
				  "eui",     "8EL",
				  "build",   "4uL",
				  "domain",  "u",
				  "major",   "u",
				  "minor",   "2uL",
				  "name",    LRSC.IO.Identity.MAX_NAME_LEN+"d");
    var id = new LRSC.IO.Identity(LRSC.IO.DOMAIN[obj.domain] || "DOM"+obj.domain,
				  obj.eui, obj.name.replace(/\u0000*$/,""));
    id.major = obj.major;
    id.minor = obj.minor;
    id.build = obj.build;
    return id;
}


//==================================================================================================
//
// LRSC.IO.XdrLink
//
//==================================================================================================

/**
 * LRSC.IO.XdrLink implements XDR message exchange.
 * @ignore
 */
LRSC.IO.XdrLink = function () {
    var self    = this;
    this.sock   = null;      // IO.TCPSocket
    this.myId   = null;
    this.peerId = null;
    this.data   = "";
};

/**
 * Open a LRSC.IO.XdrLink to a LRSC service.
 * @param host
 * @param port
 * @returns {LRSC.IO.XdrLink}
 */
LRSC.IO.XdrLink.makeClientLink = function (/** String */host, /** Number */port, /** LRSC.IO.Identity*/myId) {
    var link = new LRSC.IO.XdrLink();
    link.myId = myId || LRSC.IO.Identity.ME;
    link.host = host || "localhost";
    link.port = port || 53054;
    return link;
};



/** Prototype */
LRSC.IO.XdrLink.prototype = {
    /**
     * @type LRSC.IO.Identity
     * @private
     */
    myId: null,  // my identity
    /**
     * @type LRSC.IO.Identity
     * @private
     */
    peerId: null,
    /**
     * @type Number
     * @private
     */
    reconnect: null,  // if client link reconnect automatically
    /**
     * @type Number
     * @private
     */
    port: null,      // if client link connect to this port
    /**
     * @type String
     * @private
     */
    host: null,      // if client link connect to this
    /**
     * @type Object
     * @private
     */
    msgQ: null,      // pending messages while disconnected

    /**
     * Send binary message.
     * @param obj
     */
    connect: function (reconnect) {
	var self = this;
	if( this.host == null )
	    throw new Exception("Not a client XDR link");
	if( this.sock != null )
	    return; // already conected
	if( this.msgQ == null )
	    this.msgQ = [];
	if( reconnect )
	    this.reconnect = Timer.getTime();
	try {
	    this.sock = new IO.TCPSocket();
	    this.sock.open(this.host, this.port, BLCK);
	} catch (ex) {
	    this.sock = null;
	    this.timer = Timer.timeoutIn(1000, function () { self.connect(); });
	    return;
	}
	// Wait for server peer ID
	this.sock.onBlob = function (blob) {
	    var data = self.data += blob.data;
	    var n = 16+LRSC.IO.Identity.MAX_NAME_LEN;
	    if( data.length >= n ) {
		self.data = data.substr(n);
		self.peerId = LRSC.IO.Identity.decode(data.substr(0,n));
		self.sock.onBlob = self.onBlob;
		self.onConnect(self.peerId);
		self.onBlob({data:""});
		var msgQ = self.msgQ;
		self.msgQ = null;
		while( msgQ.length )
		    self.sendMsg(msgQ.shift());
	    }
	}

	this.sock.onClose = function (status) {
	    self.onClose(status);
	};
	this.sock.send("PLAIN!\r\n"+this.myId.encode());
    },


    /** @ignore */
    onBlob: function (blob) {
	//println(Util.formatData(blob));
	//var data = self.data += blob.data.toBinaryString(0, blob.data.length);
	this.data += blob.data;
	var ex = null;
	while( true ) {
	    var data = this.data
	    if( data.length < 8 )
		break;
	    var obj = Formatter.unpackObj(data, 0, "len", "4uL", "msgid", "4uL");
	    var reclen = 8 + obj.len + (-obj.len7); 
	    if( reclen == 0 )
		throw new Exception("XDR found zero length record!");
	    if( data.length < reclen )
		break;
	    this.data = reclen == data.length ? "" : data.substr(reclen);
	    try {
		var dec = new XDR.DECODER(data,obj.len);
		var mobj = XDR.makeMsg(obj.msgid);
		mobj.decode(dec);
		this.onMsg(mobj);
	    } catch (x) {
		ex = new Exception(sprintf("Failed to decode XDR message msgid=%u len=%u\n", obj.msgid, obj.len));
	    }
	}
	if( ex )
	    throw ex;
    },

    /**
     * Callback.
     */
    onConnect: function (/** LRSC.IO.Identity */peerId) {
	printf("Connected to %s\n", peerId.toString());
    },

    /**
     * Callback.
     */
    onDisconnect: function () {
	printf("Lost connection to %s\n",
	       this.peerId==null
	       ? (this.host==null ? "<unknown>" : this.host+":"+this.port)
	       : this.peerId.toString());
    },

    /**
     * Send binary message.
     * @param obj
     */
    sendMsg: function (/** Object */msg) {
	if( this.msgQ ) {
	    this.msgQ.push(msg);
	    return;
	}
	if( this.sock == null )
	    throw new Exception("XDR link has been closed - cannot send.");
	var enc = new XDR.ENCODER(XDR.encodedSize(msg));
	enc.encode(msg);
	var len = enc.wpos;
	enc.align(8);
	var data = enc.getData();
	this.sock.send(Formatter.pack("4uL4uL*d", len, msg.$msgid, data));
    },

    /**
     * Callback.
     * @param tag
     * @param data
     */
    onMsg: function (/** Object */msg) {
	printf("LRSC.IO.XdrLink.onMsg: msgid=%d %H\n", msg.$msgid);
    },

    /**
     * Close underlying socket.
     * @param AOP.OK or AOP.ERR instance
     */
    close: function (/** AOP.OK */status) {
	if( this.sock ) {
	    this.sock.close(status, function(status){ ; });
	    this.sock = null;
	}
	if( this.timer )
	    this.timer.cancel();
	this.reconnect = null;
	this.msgQ = null;
    },

    /** 
     * Invoked when a telnet client connection was closed.
     * @param status  AOP.ERR or AOP.OK instance
     */
    onClose: function (/** AOP.OK */status) {
	//QUACK(0, "LRSC.IO.MsgLink closed: " + status.toString());
	this.sock = null;
	if( this.timer )
	    this.timer.cancel();
	if( this.reconnect ) {
	    this.msgQ = [];
	    this.onDisconnect(); /// might call close() to stop reconnects
	    if( this.reconnect ) {
		var d = this.reconnect + 1000 - Timer.getTime();
		if( d  > 0 ) {
		    // Max reconnect rate 1Hz
		    var self = this;
		    self.timer = Timer.timeoutIn(d, function () { self.connect(); });
		    return;
		}
		this.connect();
	    }
	}
	this.onDisconnect();
	this.msgQ = null;
    }
};

