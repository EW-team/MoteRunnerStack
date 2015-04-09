//  (C) COPYRIGHT INTERNATIONAL BUSINESS MACHINES CORPORATION 2006-2010
//                       ALL RIGHTS RESERVED
//        IBM Research Division, Zurich Research Laboratory
// --------------------------------------------------------------------


/**
 * Functionality only available on Unix.
 * @class
 */
UNIX = {};



/**
 * A named pipe. Only available on unix vaiants.
 * @class
 * @constructor
 */
UNIX.Pipe = function() {
    this.ioqueue = new IO.Queue(this);
    this.name = null;
    if (Win32.runOnWindows()) {
	throw new Exception("Pipes only supported on UNIX variants");
    }
};

/**
 * @type Number
 * @constant
 */
UNIX.Pipe.READ = 1;

/**
 * @type Number
 * @constant
 */
UNIX.Pipe.WRITE = 2;

/**
 * @type Number
 * @constant
 */
UNIX.Pipe.CREATE = 2;



/** Prototype. */
UNIX.Pipe.prototype = {
    /**
     * Underlying io queue.
     * @type IO.Queue
     * @private
     */
    ioqueue: null,

    /**
     * Name
     * @type String
     * @private
     */
    name: null,
    
    /**
     * Flags
     * @type Number
     * @private
     */
    flags: -1,


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
     * toString implementation
     * @returns {String} 
     */
    toString: function() {
	return 'Pipe:'+this.name;
    },
    
    /**
     * Calls toString.
     * @returns {String} 
     */
    getInfo: function() {
	return this.toString();
    },
    
    /**
     * Open pipe.
     * @param name     Pipe name
     * @param flags    Flags
     * @param callback 
     * @throws {AOP.Exception} 
     * @returns {UNIX.Pipe} this
     */
    open: function(/** String */name, /** Number */flags, /** DFLT_ASYNC_CB */callback) {
	if (BC.is(callback)) { return BC.exec(arguments.callee, this, arguments); }
        if (this.isAlive()) {
            throw sprintf("%s: already open or open in progress", this);
        }
	QUACK(0, "Pipe.open: " + name);
        this.name = name;
	this.flags = flags;
	var _this = this;
        this.ioqueue.open(IO.CONN_PIPE, { name: name, flags: flags }, function(result) {
			      QUACK(0, "Pipe.open: result " + result);
	    if (result.code===0) {
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
     * Called on a timeout after a send with a timeout specification. By default,
     * this socket is closed.
     * @param status
     */
    onTimeout: function(/** AOP.ERR */status) {
       	this.close(status, function(status){ ; });
    },
    

    /**
     * Sends data.
     * @param bytes    Binary data to send
     * @param timeout
     */
    send: function(/** String */bytes, /** Number */timeout) {
        assert(typeof(bytes) === 'string');
	if (!this.isAlive()) {
	    throw sprintf("%s: is closed", this);
        }
	this.ioqueue.setupTimer(timeout);
	IO.sendPipeData(this.getId(), bytes);
    },
    
    /**
     * Default implementation of onBlob is empty. Blobs are received with a property
     * 'data' keeping the received binary data.
     * @param blob   Object with property data
     */
    onBlob: function(/** Object */blob) {},


    /**
     * Set to blocking or non-blocking mode. Override onBlob to receive data in non-blocking mode.
     * Use recv in blocking mode.
     * @param flag
     * @returns {UNIX.Pipe} this
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















/**
 * UNIX file ready for asyncrhonous IO. Only available on unix vaiants.
 * @class
 * @constructor
 */
UNIX.File = function() {
    this.ioqueue = new IO.Queue(this);
    this.name = null;
    if (Win32.runOnWindows()) {
	throw new Exception("Only supported on UNIX variants");
    }
};


/** Prototype. */
UNIX.File.prototype = {
    /**
     * Underlying io queue.
     * @type IO.Queue
     * @private
     */
    ioqueue: null,

    /**
     * Name
     * @type String
     * @private
     */
    name: null,

    /**
     * @returns {Boolean} whether queue is still alive
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
     * toString implementation
     * @returns {String} 
     */
    toString: function() {
	return 'File:'+this.name;
    },
    
    /**
     * Calls toString.
     * @returns {String} 
     */
    getInfo: function() {
	return this.toString();
    },
    
    /**
     * Open file.
     * @param name     File path/name
     * @param flags     Mode (O_RDWR ...)
     * @param fd       Optional
     * @param callback 
     * @throws {AOP.Exception} 
     * @returns {UNIX.File} this
     */
    open: function(/** String */name, /** Number */flags, /** Number */fd, /** DFLT_ASYNC_CB */callback) {
	if (BC.is(callback)) { return BC.exec(arguments.callee, this, arguments); }
        if (this.isAlive()) {
            throw sprintf("%s: already open or open in progress", this);
        }
	//QUACK(0, "File.open: " + name);
        this.name = name;
	var args = {
	    name: name,
	    flags: flags
	};
	if (fd != null) {
	    args.port = fd;
	}
	var _this = this;
        this.ioqueue.open(IO.CONN_FILE, args, function(result) {
	    //QUACK(0, "File.open: result " + result);
	    if (result.code===0) {
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
     * Override when interested in being notified when file gets closed.
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
     * Called on a timeout after a send with a timeout specification. By default,
     * this socket is closed.
     * @param status
     */
    onTimeout: function(/** AOP.ERR */status) {
       	this.close(status, function(status){ ; });
    },
    

    /**
     * Sends data.
     * @param bytes    Binary data to send
     * @param timeout
     */
    send: function(/** String */bytes, /** Number */timeout) {
        assert(typeof(bytes) === 'string');
	if (!this.isAlive()) {
	    throw sprintf("%s: is closed", this);
        }
	this.ioqueue.setupTimer(timeout);
	IO.sendPipeData(this.getId(), bytes);
    },
    
    /**
     * Default implementation of onBlob is empty. Blobs are received with a property
     * 'data' keeping the received binary data.
     * @param blob   Object with property data
     */
    onBlob: function(/** Object */blob) {},


    /**
     * Set to blocking or non-blocking mode. Override onBlob to receive data in non-blocking mode.
     * Use recv in blocking mode.
     * @param flag
     * @returns {UNIX.Pipe} this
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
