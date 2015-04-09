//  (C) COPYRIGHT INTERNATIONAL BUSINESS MACHINES CORPORATION 2006-2010
//                       ALL RIGHTS RESERVED
//        IBM Research Division, Zurich Research Laboratory
// --------------------------------------------------------------------

//==================================================================================================
//
// IO.TCPServer
//

//==================================================================================================


Class.define(
    "IO.TCPSocket",
    /**
     * @lends IO.TCPSocket
     */
    {
	/**
	 * IO.TCPSocket provides access to a TCP socket.
	 * The following methods of a socket instance may be overridden:
	 * <ul>
	 * <li>onOpen:    Called when the socket is ready</li>
	 * <li>onBlob:    Called when a packet is received</li>
	 * <li>onClose:   Called when a socket was closed.</li>
	 * </ul>
	 * If the TCPSocket is to be used in blocking mode, call IO.TCPSocket.setBlockingMode and then
	 * IO.TCPSocket#recv to receive, IO.TCPSocket#canRecv to check for packets.<br/>
	 * The packets received on a TCPSocket contain the data of the packet in the property 'data'.
	 * These property might be of type String or U8Array. 
	 * @constructs
	 * @param binmoe Binary mode, if true, the onData method receives in the data property the type U8Array 
	 */
	__constr__: function(/** Boolean */binmode) {
	    assert(arguments.length<=1, "API change: no delay flag anymore");
	    this.host = null;
	    this.port = this.localport = -1;
	    this.binmode = binmode?true:false;
	    this.ioqueue = new IO.Queue(this);
	},

	/**
	 * Underlying io queue.
	 * @type IO.Queue
	 * @private
	 */
	ioqueue: null,

	/**
	 * Host
	 * @type String
	 * @private
	 */
	host: null,
	
	/**
	 * Port
	 * @type Number
	 * @private
	 */
	port: -1,

	/**
	 * Local port
	 * @type Number
	 * @private
	 */
	localport: -1,


	/**
	 * @returns {Boolean} whether socket is still alive
	 */
	isAlive: function() {
	    return this.ioqueue.isAlive();
	},
	
	/**
	 * @returns {IO.Queue} the IO queue
	 * @private
	 */
	getIOQueue: function() {
	    return this.ioqueue;
	},

	/**
	 * @returns {Number} the underlying io queue id
	 * @private
	 */
	getId: function() {
	    return this.ioqueue.getId();
	},


	/**
	 * @returns {String} host
	 */
	getHost: function() {
	    return this.host;
	},

	/**
	 * @returns {Number} port
	 */
	getPort: function() {
	    return this.port;
	},

	/**
	 * toString implementation
	 * @returns {String} 
	 */
	toString: function() {
	    return 'TCPSocket:'+this.host+":"+this.port;
	},
	
	/**
	 * Calls toString.
	 * @returns {String} 
	 */
	getInfo: function() {
	    return this.toString();
	},

	
	/**
	 * Try to connect and call onOpen afterwards with the status of the operation.
	 * @param host     Host name or IP address in dot notation
	 * @param port     Target port
	 * @param callback 
	 * @throws {AOP.Exception} 
	 * @returns {IO.TCPSocket} this
	 */
	open: function(/** String */host, /** Number */port, /** DFLT_ASYNC_CB */callback) {
	    return this.open4({ type: IO.CONN_TCPSOCKET, host: host, port: port, binmode: this.binmode }, callback);
	},



	/**
	 * Fd for socket already exists
	 * @param host          Host name or IP address in dot notation
	 * @param port          Target port
	 * @param localport     Local port
	 * @param fd
	 * @param type     SSL or TCP
	 * @param callback 
	 * @throws {AOP.Exception} 
	 * @returns {IO.TCPSocket} this
	 * @private
	 */
	open2: function(/** String */host, /** Number */port, /** Number */localport, /** Number */fd, /** Number */type, /** DFLT_ASYNC_CB */callback) {
	    if (BC.is(callback)) { return BC.exec(arguments.callee, this, arguments); }
            this.host = host;
            this.port = port;          // XXX: fix this
	    this.localport = port;
	    return this.open4({ type: type, host: host, port: port, fd: fd, binmode: this.binmode }, callback);
	},
	


	/**
	 * Try to connect and call onOpen afterwards with the status of the operation.
	 * @param paras    Parameters with host, port, binmode, fd and arg
	 * @param callback 
	 * @throws {AOP.Exception} 
	 * @returns {IO.TCPSocket} this
	 * @private
	 */
	open4: function(/** Number */paras, /** DFLT_ASYNC_CB */callback) {
	    if (BC.is(callback)) { return BC.exec(arguments.callee, this, arguments); }
            if (this.isAlive()) {
		throw sprintf("%s: socket is already open or open operation is in progress!", this);
            }
	    assert(paras.host, "Missing 'host' in 'paras' parameter!");
	    assert(paras.type, "Missing 'type' in 'paras' parameter!");
	    assert(paras.port, "Missing 'port' in 'paras' parameter!");
	    if (!paras.binmode) {
		paras.binmode = this.binmode;
	    }
	    assert(paras.binmode!=null, "Missing 'binmode' in 'paras' parameter!");
            this.host = paras.host;
	    var _this = this;
            this.ioqueue.open(paras.type, paras, function(result) {
		if (result.code===0) {
		    var blob = result.getData();
		    assert(blob.port);
		    assert(_this.port== -1 || _this.port == blob.port);
		    if (_this.port == -1) {
			_this.port = blob.port;
		    }
		    if (blob.localport != -1) {
			assert(_this.localport== -1 || _this.localport == blob.localport, sprintf("%d != %d", _this.localport, blob.localport));
			if (_this.localport == -1) {
			    _this.localport = blob.localport;
			}
		    }
		    result = new AOP.OK(_this);
		}
		_this.onOpen(result);
		callback(result);
	    });
	    return this;
	},

	
	/**
	 * Override when interested in result of open operation.
	 * @param result
	 */
	onOpen: function(/** AOP.Result */result) {
	    //QUACK(0, sprintf("%s: onOpen..", this));
	},
	
	
	/**
	 * Override when interested in being notified when socket gets closed.
	 * @param result
	 */
	onClose: function(/** AOP.Result */result) {
	    QUACK(1, sprintf("%s: onClose..", this));
	},


	/**
	 * Close the socket.
	 * @param result
	 * @param callback
	 */
	close: function(/** AOP.Result */status, /** DFLT_ASYNC_CB */callback) {
	    if (BC.is(callback)) { return BC.exec(arguments.callee, this, arguments); }
	    this.ioqueue.close(status, callback);
	},


	/**
	 * IO.Queue expects this function to be defined.
	 * @param status
	 * @private
	 */
	onTimeout: function(/** AOP.ERR */status) {
	    ;
	},
	

	/**
	 * Sends data.
	 * @param bytes    Binary data to send
	 * @param isFile   Optional, bytes denotes a filename
	 */
	send: function(/** String */bytes, /** Boolean */isFile) {
	    if (isFile!== undefined) {
		assert(isFile===false||isFile===true, "API change: timeout parameter has been removed");
	    }
            assert(typeof(bytes) === 'string');
	    if (!this.isAlive()) {
		throw sprintf("%s: is closed", this);
            }
	    if (isFile) {
		IO.sendTcpFile(this.getId(), bytes);
	    } else {
		IO.sendTcpData(this.getId(), bytes);
	    }
	},

	
	/**
	 * Default implementation of onBlob is empty. Blobs are received with a property
	 * 'data' keeping the received binary data as String or U8Array.
	 * @param blob   Object with property data
	 */
	onBlob: function(/** Object */blob) {},


	/**
	 * Set to blocking or non-blocking mode. Override onBlob to receive data in non-blocking mode.
	 * Use recv in blocking mode.
	 * @param flag
	 * @returns {IO.TCPSocket} this
	 */
	setBlockingMode: function(/** Boolean */flag) {
	    this.ioqueue.setBlockingMode(flag);
            return this;
	},


	/**
	 * A packet is ready to pickup without blocking. Only supported by a connection operated in blocking mode.
	 * @returns {Boolean} flag
	 */
	canRecv: function() {
	    return this.ioqueue.canRecv();
	},
	
	
	/**
	 * Receive a packet from a IO queue. A TimerException is thrown in case of timeout, an IOException is thrown
	 * in case the socket has been closed.
	 * @param timeout Timeout in milliseconds; if undefined, indefinite.
	 * @returns {Object}
	 * @throws {Exception} exception, possibly with ERR_RESOURCE_GONE when queue was closed
	 * @throws {Timer.Exception} on timeout
	 */
	recv: function(/** Number */timeout) {
	    return this.ioqueue.recv(timeout);
	}
    }
);







//==================================================================================================
//
// IO.TCPServer
//
//==================================================================================================


Class.define(
    "IO.TCPServer",
    /**
     * @lends IO.TCPServer
     */
    {
	/**
	 * IO.TCPServer listens on a TCP socket for incoming connections.
	 * On an incoming connect, 'onAccept' is onviked with a reference to accepted socket connection.
	 * @class
	 * @constructs
	 */
	__constr__: function() {
	    this.ioqueue = new IO.Queue(this);
	    this.port = -1;
	    this.binmode = true;
	},

	/**
	 * Underlying io queue.
	 * @type IO.Queue
	 * @private
	 */
	ioqueue: null,

	/**
	 * Local TCP port
	 * @type Number
	 */
	port: -1,

	/**
	 * Accepted sockets get typed binary array as data.
	 * @type Boolean
	 */
	binmode: true,
	
	/**
	 * @returns {Boolean} whether socket is still alive
	 */
	isAlive: function() {
	    return this.ioqueue.isAlive();
	},
	
	/**
	 * @returns {Number} the underlying io queue id
	 * @private
	 */
	getId: function() {
	    return this.ioqueue.getId();
	},

	/**
	 * @param binmode
	 */
	setBinMode: function(/** Boolean */binmode) {
	    this.binmode = binmode;
	},

	/**
	 * toString implementation
	 * @returns {String} 'TCPServer:'+port
	 */
	toString: function() {
	    return 'TCPServer:'+this.port;
	},
	
	/**
	 * Calls toString.
	 * @returns {String} 'TCPServer:'+port
	 */
	getInfo: function() {
	    return this.toString();
	},
	
	/**
	 * Try to connect and call onOpen afterwards with the status of the operation (AOP.OK or AOP.ERR).
	 * @param port     Local port, must be greater than 0.
	 * @param callback Optional, invoked when socket is connected and ready
	 * @throws {AOP.Exception}
	 */
	open: function(/** Number */port, /** DFLT_ASYNC_CB */callback) {
	    if (BC.is(callback)) { return BC.exec(arguments.callee, this, arguments); }
	    assert(port!==undefined && port > 0, "Invalid TCP port");
            if (this.isAlive()) {
		throw sprintf("%s: already open or open in progress", this);
            }
            this.port = port;
	    var _this = this;
            this.ioqueue.open(IO.CONN_TCPSERVER, { port: port, binmode: this.binmode }, function(result) {
		if (result.code===0) {
		    callback(new AOP.OK(_this));
		} else {
		    callback(result);
		}
	    });
	},

	
	/**
	 * Override when interested in being notified when socket gets closed.
	 * @param result
	 */
	onClose: function(/** AOP.Result */result) {
	    QUACK(1, sprintf("%s: onClose..", this));
	},


	/**
	 * Close the socket.
	 * @param result
	 * @param callback
	 */
	close: function(/** AOP.Result */status, /** DFLT_ASYNC_CB */callback) {
	    if (BC.is(callback)) { return BC.exec(arguments.callee, this, arguments); }
	    this.ioqueue.close(status, callback);
	},

	/**
	 * IO.Queue expects this function to be here.
	 * @private
	 */
	onTimeout: function(/** AOP.ERR */status) {
	    ;
	},

	
	/**
	 * If clients connect, this function creates a client socket and calls onAccept
	 * @private
	 */
	onBlob: function(blob) {
            assert(blob.fd&&blob.host&&blob.port);
            var sock = new IO.TCPSocket(this.binmode);
	    var _this = this;
	    sock.open2(blob.host, blob.port, blob.port, blob.fd, IO.CONN_TCPSOCKET, function(status) {
		if (status.code !== 0) {
		    Logger.err("TCPServer: could not accept client socket: " + status);
		} else {
		    _this.onAccept(sock);	
		}
	    });
	},

	/**
	 * Called when a new client connection has been accepted. The default implementation is empty.
	 * @param sock The accepted IO.TCPSocket
	 */
	onAccept: function(/** IO.TCPSocket */sock){}
    }
);







/**
 * @namespace SSL
 * @private
 */
assert(SSL);



IO.TCPSocket.extend(
    "IO.SSLSocket",
    /**
     * @lends IO.SSLSocket.prototype
     */
    {
	/**
	 * @constructs
	 * @augments IO.TCPSocket
	 * @param binmode
	 * @param ctx
	 * @private
	 */
	__constr__: function(/** Object */ctx, /** Boolean */binmode) {
	    IO.TCPSocket.call(this, binmode);
	    if (!ctx) {
		ctx = SSL.getClientCtx();
	    }
	    this.ctx = ctx;
	},


	/**
	 * toString implementation
	 * @returns {String} 
	 */
	toString: function() {
	    return 'SSLSocket:'+this.host+":"+this.port;
	},


	/**
	 * Try to connect and call onOpen afterwards with the status of the operation.
	 * @param host     Host name or IP address in dot notation
	 * @param port     Target port
	 * @param callback 
	 * @throws {AOP.Exception} 
	 * @returns {IO.SSLSocket} this
	 */
	open: function(/** String */host, /** Number */port, /** DFLT_ASYNC_CB */callback) {
	    return this.open4({ type: IO.CONN_SSLSOCKET, host: host, port: port, binmode: this.binmode, arg: this.ctx }, callback);
	}
    }
);



/**
 * @type Object
 * @private
 */
SSL.DFLT_INIT_OPTS =  {
    certFilename: REPO_ROOT + "/lib/sonoran/resources/cert.pem",
    keyFilename: REPO_ROOT + "/lib/sonoran/resources/key.pem"
};




IO.TCPServer.extend(
    "SSL.Server",
    /**
     * @lends SSL.Server.prototype
     */
    {
	/**
	 * @constructs
	 * @augments IO.TCPServer
	 * @param ctx
	 * @private
	 */
	__constr__: function(/** Object */ctx) {
	    IO.TCPServer.call(this);
	    this.ctx = ctx;
	    assert(this.ctx, "Missing SSL cotext parameter");
	},

	/**
	 * If clients connect, this function creates a client socket and calls onAccept
	 * @private
	 */
	onBlob: function(blob) {
            assert(blob.fd&&blob.host&&blob.port);
	    var _this = this;
            var sock = new IO.SSLSocket(this.ctx, this.binmode);
	    sock.open4({ type: IO.CONN_SSLSERVER, arg: this.ctx, host: blob.host, port: blob.port, localport: blob.port, fd: blob.fd, binmode: this.binmode }, function(status) {
		if (status.code !== 0) {
		    Logger.err("SSLServer: could not accept client socket: " + status);
		} else {
		    _this.onAccept(sock);	
		}
	    });
	}
    },
    /**
     * @lends @lends SSL.Server
     */
    {
	/**
	 * @param options Null or object with 'certFilename' and 'keyFilename'
	 * @returns {SSL.Server}
	 * @private
	 */
	create: function(/** Object */options) {
	    if (!options) { options = SSL.DFLT_INIT_OPTS; }
	    assert(options);
	    assert(options.certFilename);
	    assert(options.keyFilename);
	    var ctx = SSL.getContext(true, options.certFilename, options.keyFilename);
	    return new SSL.Server(ctx);
	}
    }
);
	


/**
 * @param forServer
 * @param certfn
 * @param keyfn
 * @returns {Object} SSL context
 * @private
 */
SSL.getContext = function(/** Boolean */forServer, /** String */certfn, /** String */keyfn) {
    var ctx = SSL.createContext(forServer);
    if (certfn) {
	SSL.loadCertificateChain(ctx, certfn);
    }
    if (keyfn) {
	SSL.usePrivateKey(ctx, keyfn);
    }
    return ctx;
};
