
//==================================================================================================
//
// 
//
//==================================================================================================

/**
 * LRSC.IO.MsgServer accepts message connections with multiple transport types.
 * @class
 * @constructor
 */
LRSC.IO.MsgServer = function () {};


/** Prototype */
LRSC.IO.MsgServer.prototype = {
    /**
     * @type IO.TCPServer
     */
    serverSocket: null,
    /** 
     * Create telnet server listening at specified port.
     * @param port      TCP port, must be > 0
     * @param callback  
     * @throws {AOP.Exception}
     */
    open: function (/** Number */port, /** DFLT_ASYNC_CB */callback) {
	if (BC.is(callback)) { return BC.exec(arguments.callee, this, arguments); }
	var self = this;
	this.serverSocket = new IO.TCPServer();
	this.serverSocket.setBinMode(false);
	/** @ignore */
	this.serverSocket.onClose = function (status) {
	    self.onClose(status);
	};
	/** @ignore */
	this.serverSocket.onAccept = function (sock) {
            self.onAccept(new LRSC.IO.MsgLink(sock, true));
	};
	this.serverSocket.open(port, callback);
    },

    /**
     * Close telnet server
     * @private
     */
    close: function (/** DFLT_ASYNC_CB */callback) {
	if (BC.is(callback)) { return BC.exec(arguments.callee, this, arguments); }
	this.serverSocket.close(new AOP.OK(), callback);
    },

    /** 
     * Invoked when the underlying socket is closed.
     * @param status AOP.OK/AOP.ERR instance
     */
    onClose: function (/** AOP.OK */status) {
	printf("LRSC.IO.MsgServer socket closed: %s\n", status.toString());
    },

    /** 
     * Invoked when a new telnet client connection has been established.
     */
    onAccept: function(/** LRSC.IO.MsgLink */conn) {}
};



/**
 * LRSC.IO.MsgCliet implements client logic for LRSC services.
 * @class
 */
LRSC.IO.MsgClient = {};


/**
 * Open a LRSC.IO.MsgClient to a LRSC service.
 * @param host
 * @param port
 * @param transport "JSON"
 * @returns {LRSC.IO.MsgClient}
 */
LRSC.IO.MsgClient.open = function (/** String */host, /** Number */port, /** String */transport) {
    var sock = new IO.TCPSocket();
    sock.open(host, port, BLCK);
    if( transport == null )
	transport = "JSON";
    if( transport != "JSON" && transport != "BIN" )
	throw "Unknown transport: "+transport;
    var link = new LRSC.IO.MsgLink(sock, false, transport);
    link.connect = function (entity) {
	sock.send(this.transport=="JSON" ? LRSC.IO.MAGIC_JSON : LRSC.IO.MAGIC_BIN);
	if( entity == null )
	    entity = LRSC.IO.MY_ENTITY;
	this.sendHello(entity);
	this.onHelloSent(entity);
    };
    return link;
};


//==================================================================================================
//
// LRSC.IO.MsgLink
//
//==================================================================================================

/**
 * LRSC.IO.MsgClient.
 * @class
 * @constructor
 * @param sock
 * @param serverSide
 * @param transport "JSON"
 */
LRSC.IO.MsgLink = function (/** IO.TCPSocket */sock, /** Boolean */serverSide, /** String */transport) {
    var self = this;
    this.serverSide = serverSide;
    this.sock = sock;      // IO.TCPSocket
    this.entity = null;    // entity link peer - unknown if null
    this.transport = transport;
    this.data = "";


    /** @ignore */
    this.sock.onClose = function (status) {
	self.onClose(status);
    };
    /** @ignore */
    this.sock.onBlob = function (blob) {
	//println(Util.formatData(blob));
	//var data = self.data += blob.data.toBinaryString(0, blob.data.length);
	var data = self.data += blob.data;
	if( self.transport == null ) {
	    // Server side - wait for client to announce transport protocol
	    if( data.length < 8 )
		return;
	    var magic = data.substr(0,8);
	    data = self.data = data.substr(8);

	    if( magic == LRSC.IO.MAGIC_BIN ) {
		self.transport = "BIN";
	    }
	    else if( magic == LRSC.IO.MAGIC_JSON ) {
		self.transport = "JSON";
	    }
	    else {
		self.sock.close(new AOP.OK(), SCB);
		return;
	    }
	}
	if( self.transport == "BIN" ) {
	    while( true ) {
		if( data.length < 4 )
		    return;
		var len = data.charCodeAt(0) + (data.charCodeAt(1) << 8);
		if( data.length < len+2 )
		    return;
		var tag = data.charCodeAt(2) + (data.charCodeAt(3) << 8);
		var content = data.substr(4, len-2);
		data = self.data = 2+len == data.length ? "" : data.substr(2+len);
		if( tag == LRSC.IO.MSGTAG.hello ) {
		    self.entity = self.parseHello(content);
		    self.onPeerHello(self.entity);
		    if( self.serverSide ) // after client identified - send our entity
			self.sendHello(LRSC.IO.MY_ENTITY);
		}
		else {
		    //printf("Binary record: tag=0x%02X len=%u %H\n", tag, len, content);
		    self.onBinMsg(tag,content);
		}
	    }
	}
	else if( self.transport == "JSON" ) {
	    while(true) {
		data = self.data; // global data might have been changed by a different thread, so make sure we update our local data
		//printf("DATA:\n<<<<<<<<<%s>>>>>>>>>>\n", data);
		var idx, end;
		if( (idx = data.indexOf('\n\n')) >= 0 ) {
		    end = idx+2;
		}
		else if( (idx = data.indexOf('\r\n\r\n')) >= 0 ) {
		    end = idx+4;
		}
		else {
		    return;
		}
		var obj=null, ex, jblob = data.substr(0, idx);
		var handled = false;
		self.data = end==data.length ? "" : data.substr(end);
		//printf("JBLOB:\n<<<%s>>>\n<<<%s>>>\n", jblob, self.data);
		try {
		    obj = JSON.parse(jblob);
		} catch (ex) {
		    QUACK(0, "Bad JSON: "+ex+"\nOn input text (length="+jblob.length+"):\n"+jblob);
		    continue;
		}
		if( obj.msgtag == LRSC.IO.MSGTAG.hello ) {
		    delete obj.msgtag;
		    self.entity = obj;
		    self.onPeerHello(self.entity);
		    if( self.serverSide ) { // after client identified - send our entity
			var entity = LRSC.IO.MY_ENTITY;
			self.sendHello(entity);
			self.onHelloSent(entity);
		    }
		} else {
		    //printf("OBJECT:\n%s\n", Util.formatData(obj,4,4));
		    if( 'cmdid' in obj ) {
			var cb = self.cmdid2cb[obj.cmdid];
			if( cb != null ) {
			    delete self.cmdid2cb[obj.cmdid];
			    cb(obj);
			    return;
			}
		    }
		    self.onJsonMsg(obj);
		}
	    }
	} else {
	    // Unknown transport
	    assert(0);
	}
    };
};

/** Prototype */
LRSC.IO.MsgLink.prototype = {
    /**
     * @type Number
     * @private
     */
    cmdid: 0,      // last used command id
    /**
     * @type Object
     * @private
     */
    cmdid2cb: {},  // sequence # based call backs

    /**
     * Callback.
     */
    onHelloSent: function (/** Object */entity) {
	printf("HELLO sent: %s/%s %u.%u.%05u - %s\n",
	       LRSC.IO.EUIDOM.toStr(entity.euidom),
	       entity.eui, entity.major, entity.minor, entity.build, entity.name);
    },

    /**
     * Callback
     */
    onPeerHello: function (/** Object */entity) {
	printf("Peer says HELLO: %s/%s %u.%u.%05u - %s\n",
	       LRSC.IO.EUIDOM.toStr(entity.euidom),
	       entity.eui, entity.major, entity.minor, entity.build, entity.name);
    },

    /**
     * @param data
     * @private
     */
    parseHello: function (/** String */data) {
	var obj = Formatter.unpackObj(data, 0,
				      "eui",     "8EL",
				      "euidom",  "u",
				      "major",   "u",
				      "minor",   "u",
				      "build",   "2uL",
				      "namelen", "u",
				      "name",    "*d");
	delete obj.namelen;
	return obj;
    },

    /**
     * @param entity
     * @private
     */
    sendHello: function (/** Object */entity) {
	if( this.transport == "BIN" ) {
	    var name  = "Sonoran Test Code";
	    var b = Formatter.pack("8ELuuu2uLu*d",
				   entity.eui, entity.euidom,
				   entity.major, entity.minor, entity.build, 
				   entity.name.length, entity.name);
	    this.sendBinMsg(LRSC.IO.MSGTAG.hello,b);
	}
	else if( this.transport == "JSON" ) {
	    var obj = {
		msgtag : LRSC.IO.MSGTAG.hello,
		eui    : entity.eui,
		euidom : entity.euidom,
		major  : entity.major,
		minor  : entity.minor,
		build  : entity.build, 
		name   : entity.name    };
	    this.sendJsonMsg(obj);
	}
    },


    /**
     * Send JSON message
     * @param obj
     */
    sendJsonMsg: function (/** Object */obj, callback) {
	if( this.transport != "JSON" )
	    throw "Cannot send JSON message via "+this.transport+" transport";
	if( 'cmdid' in obj ) {
	    obj.cmdid = ++this.cmdid;
	    if( callback != null )
		this.cmdid2cb[this.cmdid] = callback;
	}
	//printf("--------->%s\n", Util.formatData(obj));//XXX:debug
	this.sock.send(JSON2.stringify(obj)+"\n\n");
    },

    /**
     * Send binary message.
     * @param obj
     */
    sendBinMsg: function (/** Number */msgtag, /** String */data) {
	if( this.transport != "BIN" )
	    throw "Cannot send JSON message via "+this.transport+" transport";
	this.sock.send(Formatter.pack("2uL2uL*d", data.length+2, msgtag, data));
    },

    /**
     * Callback.
     * @param obj
     */
    onJsonMsg: function (/** Object */obj) {
	printf("LRSC.IO.MsgLink.onJsonMsg:\n%s\n",Util.formatData(obj,4,4));
    },

    /**
     * Callback.
     * @param tag
     * @param data
     */
    onBinMsg: function (/** Number */tag, /** String */data) {
	printf("LRSC.IO.MsgLink.onBinMsg: tag=0x%02X %H\n", tag, data);
    },

    /**
     * Close underlying socket.
     * @param AOP.OK or AOP.ERR instance
     */
    close: function (/** AOP.OK */status) {
	this.sock.close(status, function(status){ ; });
    },
    /** 
     * Invoked when a telnet client connection was closed.
     * @param status  AOP.ERR or AOP.OK instance
     */
    onClose: function (/** AOP.OK */status) {
	QUACK(0, "LRSC.IO.MsgLink closed: " + status.toString());
    }
};


// ================================================================================
// -- JsonLink
//


/**
 * @class
 * @constructor
 * @private
*/
LRSC.IO.JsonLink = function () {
    /** IO.TCPSocket */
    this.sock      = null;
    this.version   = null;   // protocol version
    this.buf       = "";
    this.cmdid     = 0;
    this.cmdid2cb  = {};  // sequence # based call backs
    this.callbacks = [];  // permanent callbacks
    // Event logging
    this.lastSeenEvent = -1;
    this.evStart       =  0;   // # of events at index 0
    this.events        = [];   // recorded events
};

/** Prototype */
LRSC.IO.JsonLink.prototype = {
    /**
     * @param host
     * @param port
     * @private
     */
    open: function (/** String */host, /** Number */port) {
	if( port == null )
	    port = LRSC.DEFAULT_PORT.NCC_APP;
	this.sock = new IO.TCPSocket();
	this.sock.open(host, port, BLCK);

	var self = this;
	/** @ignore */
	this.sock.onClose = function (status) {
	    self.onClose(status);
	};
	/** @ignore */
	this.sock.onBlob = function (blob) {
	    self.buf += blob.data;
	    while(true) {
		var idx, end;
		if( (idx = self.buf.indexOf('\n\n')) >= 0 ) {
		    end = idx+2;
		}
		else if( (idx = self.buf.indexOf('\r\n\r\n')) >= 0 ) {
		    end = idx+4;
		}
		else {
		    return;
		}
		var obj=null, ex, jblob = self.buf.substr(0, idx);
		var handled = false;
		self.buf = end==self.buf.length ? "" : self.buf.substr(end);
		try {
		    obj = JSON.parse(jblob);
		} catch (ex) {
		    QUACK(0, "Bad JSON: "+ex+"\nOn input text (length="+jblob.length+"):\n"+jblob);
		}
		if( obj != null ) {
		    if( 'evnum' in obj && 'msgtag' in obj ) {
			// Event - record it
			var ev = self.groomEvent(obj);
			ev = self.handleEvent(ev);
			if( ev != null ) {
			    if( ev.evnum == 1+self.lastSeenEvent )
				self.lastSeenEvent = ev.evnum;
			    if( ev.evnum >= self.evStart )
				self.events[ev.evnum-self.evStart] = ev;
			}
			continue;
		    }
		    if( 'report' in obj ) {
			if( self.handleReport(obj) )
			    continue;
		    }
		    if( 'cmdid' in obj ) {
			var cb = self.cmdid2cb[obj.cmdid];
			if( cb != null ) {
			    if( 'sc' in obj || 'fail' in obj ) // otherwise it's a partial response
				delete self.cmdid2cb[obj.cmdid];
			    cb(obj);
			    handled = true;
			}
		    }
		    if( !handled ) {
			for( var i=0; i<self.callbacks.length; i++ ) {
			    if( self.callbacks[i](obj) )
				handled = true;
			}
		    }
		    if( !handled ) {
			self.onObj(obj);
		    }
		}
	    }
	};
    },
    

    /**
     * Override by user.
     * @param ev
     */
    handleEvent: function (/** Object */ev) {
	return ev;
    },

    /**
     * @param ev
     * @returns {Object}
     */
    groomEvent: function (/** Object */ev) {
	ev.evname = LRSC.IO.MSGTAG.toStr(ev.msgtag);
	ev.evsrc  = LRSC.EV.SRC.toStr(ev.evflags & 0xF);
	ev.evsev  = LRSC.EV.SEV.toStr((ev.evflags >> 4)&0xF);
	return ev;
    },

    /**
     * @param func
     * @param del
     * @private
     */
    _handleCallback: function (/** Function */func, /** Boolean */del) {
	for( var i=0; i<this.callbacks.length; i++ ) {
	    if( this.callbacks[i] == func ) {
		if( del )
		    this.callbacks.splice(i,0);
		return;
	    }
	}
	if( !del )
	    this.callbacks.push(func);
    },

    
    /**
     * @param func
     * @private
     */
    addCallback: function (func) {
	this._handleCallback(func,0);
    },

    /**
     * @param func
     * @private
     */
    delCallback: function (func) {
	this._handleCallback(func,1);
    },

    /**
     * Send object.
     * @param obj
     * @param callback
     * @private
     */
    sendObj: function (/** Object */obj, callback) {
	obj.cmdid = ++this.cmdid;
	if( callback != null )
	    this.cmdid2cb[this.cmdid] = callback;
	//printf("======\n%s\n========\n",Util.formatData(obj,0));
	this.sock.send(Util.formatData(obj,0)+"\n\n");
    },

    /**
     * Callback.
     * @param obj
     * @private
     */
    onObj: function (/** Object */obj) {
	printf("LRSC.JsonLink.onObj:\n"+Util.formatData(obj)+"\n");
    },

    /**
     * Close underlying socket.
     * @param AOP.OK or AOP.ERR instance
     * @private
     */
    close: function (/** AOP.OK */status) {
	this.sock.close(status, function(status){ ; });
    },
    /** 
     * Invoked when a telnet client connection was closed.
     * @param status  AOP.ERR or AOP.OK instance
     * @private
     */
    onClose: function (/** AOP.OK */status) {
	QUACK(0, "LRSC.JsonLink.onClose: " + status.toString());
    }
};
