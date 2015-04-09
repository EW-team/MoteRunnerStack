//  (C) COPYRIGHT INTERNATIONAL BUSINESS MACHINES CORPORATION 2006-2010
//                       ALL RIGHTS RESERVED
//        IBM Research Division, Zurich Research Laboratory
// --------------------------------------------------------------------

/**
 * IO.UDPSocket encapsulates access to a UDP socket.
 * The following methods of a socket instance may be overridden:
 * <ul>
 * <li>onOpen:    Called when the socket is ready</li>
 * <li>onBlob:    Called when a packet is received</li>
 * <li>onTimeout: Called when a timeout occured after a send (with a timeout specification)</li>
 * <li>onClose:   Called when socket was closed</li>
 * </ul>
 * If the TCPSocket is to be used in blocking mode, call IO.TCPSocket.setBlockingMode and then
 * IO.TCPSocket#recv, IO.TCPSocket#canRecv to receive packets.
 * @class
 * @constructor
 */
IO.UDPSocket = function() {
    this.ioqueue = new IO.Queue(this);
    this.port = -1;
};


/** Prototype. */
IO.UDPSocket.prototype = {
    /**
     * Underlying io queue.
     * @type IO.Queue
     * @private
     */
    ioqueue: null,

    /**
     * Port
     * @type Number
     * @private
     */
    port: -1,
    
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
     * toString implementation.
     * @returns {String} String 'UDPSocket:'+port
     */
    toString: function() {
	return 'UDPSocket:'+this.port;
    },

    /**
     * Forwards call to toString.
     * @returns {String} string
     */
    getInfo: function() {
	return this.toString();
    },
    
    /**
     * Return local UDP port.
     * @returns {Number} port
     */
    getPort: function() {
	return this.port;
    },
    
    /**
     * Tries to bind socket to a UDP port and calls onOpen afterwards with the status (AOP.OK or AOP.ERR).
     * @param port        Optional, source port, if 0, port is picked by the system
     * @param callback    
     * @throws {AOP.Exception}
     * @returns {IO.TCPSocket} this
     */
    open: function(/** Number */port, /** DFLT_ASYNC_CB */callback) {
	if (BC.is(callback)) { return BC.exec(arguments.callee, this, arguments); }
        if (this.isAlive()) {
	    callback(new AOP.ERR(sprintf("%s: already open or open in progress", this)));
            return;
        }
	var _this = this;
        this.ioqueue.open(IO.CONN_UDPSOCKET, { port: port }, function(result) {
	    if (result.code===0) {
		var blob = result.getData();
		assert(blob.port!==undefined);
		_this.port = blob.port;
		result = new AOP.OK(_this);
	    }
	    _this.onOpen(result);
	    callback(result);
	});
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
	QUACK(0, sprintf("%s: onClose..", this));
    },
    

    /**
     * Called on a timeout after a send with a timeout specification. By default,
     * this socket is closed.
     * @param status
     */
    onTimeout: function(/** AOP.ERR */status) {
       	this.close(status, function(status){ ; });
    },
    
    /**
     * Sends data on this socket. 
     * @param bytes    Binary striung
     * @param dstaddr  Destination address, an IP  address in dot notation (e.g. "127.0.0.1")
     * @param dstport  Destination port
     * @param timeout  Optional, timespan in millis where a response is expected
     */
    send: function(/** String */bytes, /** String */dst, /** Number */dstport, /** Number */timeout) {
        if (!this.isAlive()) {
            throw sprintf("%s: socket is not alive", this);
        }
	if (timeout) { this.ioqueue.setupTimer(timeout); }
	IO.sendUdpData(this.getId(), dst, dstport, bytes);
    },


    /**
     * Sends data on this socket. 
     * @param bytes    Binary striung
     * @param dsts     Array of objects with properties 'dst' (String) and 'dstport' (Number)
     * @param dstport  If non null, overwrites the ports specified in dsts
     * @param timeout  Optional, timespan in millis where a response is expected
     */
    sendMany: function(/** String */bytes, /** Object[] */dsts, /** Number */dstport, /** Number */timeout) {
        if (!this.isAlive()) {
            throw sprintf("%s: socket is not alive", this);
        }
	if (timeout) { this.ioqueue.setupTimer(timeout); }
	var hosts = [];
	var ports = [];
	for (var i = 0; i < dsts.length; i++) {
	    assert(dsts[i].dst, "Missing destination address in destinations array parameter!");
	    hosts.push(dsts[i].dst);
	    if (dstport != null) {
		ports.push(dstport);
	    } else {
		assert(dsts[i].dstport, "Missing destination port in destinations array parameter!");
		ports.push(dsts[i].dstport);
	    }
	}
	IO.sendUdpDataMany(this.getId(), bytes, hosts, ports);
    },


    
    /**
     * The default implementation of onData is emoty. Blobs are received with properties
     * srcaddr (String, the source IP address in dot notation), srcport (Number) and data (String).
     * @param blob   Data received with properties srcaddr, srcport and data.
     */
    onBlob: function(blob) {},


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
  
};

