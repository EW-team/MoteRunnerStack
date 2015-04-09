//  (C) COPYRIGHT INTERNATIONAL BUSINESS MACHINES CORPORATION 2006-2010
//                       ALL RIGHTS RESERVED
//        IBM Research Division, Zurich Research Laboratory
// --------------------------------------------------------------------




/**
 * Sonoran.ProtocolEngine1to1 wraps a socket for communicating with a single mote on a single port.
 * The engine drives simple request and response protocols where the host sends requests with a timeout
 * specification and expects the mote to respond within that time interval. Use 'send' to send a packet,
 * overwrite onData (or set a receiver function) to receive responses and overwrite onTimeout to receive
 * a timeout.
 * The constructor may be called with an 'options' parameter with the properties:
 * <ul>
 * <li>
 * timeout: The number of milliseconds the engine waits for a response after a send operation
 * </li>
 * <li>
 * srcport: The source port to use (if it has been allocated before)
 * </li>
 * <li>
 * recvFunc: Function, a function receiving the next incoming packet
 * </li>
 * </ul>
 * @class
 * @constructor
 * @param name          Operation name for error messages
 * @param mote          Target mote
 * @param dstport       Destination port to use
 * @param options       Optional
 */
Sonoran.ProtocolEngine1to1 = function(/** String */name, /** Sonoran.Mote */mote, /** Number */dstport, /** Object */options) {
    assert(this.onData);
    if (!options) { options = new Sonoran.MOMA.Options(mote); }
    var _this = this;
    this.name = name;
    this.mote = mote;
    this.dstport = dstport;
    this.timeout = options.timeout;
    this.timer = null;
    this.srcport = options.srcport?options.srcport:undefined;
    this.recvFunc = options.recvFunc?options.recvFunc:null;
    this.sock = new Sonoran.Socket();
    /** @ignore */
    this.sock.onClose = function(result) { _this.onClose(result); };
    /** @ignore */
    _this.sock.onData = function(blob) {
        if (_this.timer) {
            _this.timer.cancel();
            _this.timer = null;
        } else {
            QUACK(1, "Protocol.onData: received data after timer expired");
        }
        try {
            var f = _this.recvFunc||_this.onData;
            f.call(_this, blob.data);
        } catch(ex) {
	    Logger.err(Runtime.dumpException(ex, "Protocol.Engine: Socket.onData callback failed: " + ex));
            _this.sock.close(AOP.Ex2ERR(ERR_GENERIC, ex, _this.genErrMsg("Exception occurred in socket data receiver method")));
        }
    };
};

/** @private */
Sonoran.ProtocolEngine1to1.prototype = {
    /**
     * @private
     * @type Timer.Timer
     */
    timer: null,

    /**
     * @private
     * @type Number
     */
    timeout: null,
    
    /**
     * @private
     * @type String
     */
    name: null,

    /**
     * @private
     * @type Number
     */
    dstport: null,

    /**
     * @private
     * @type Number
     */
    srcport: null,

    /**
     * @private
     * @type Function
     */
    recvFunc: null,

    /**
     * @private
     * @type Sonoran.Socket
     */
    sock: null,

    /**
     * @returns {Number} The current timeout for send operation
     */
    getTimeout: function() {
        return this.timeout;
    },

    /**
     * Set timeout to use for send operation.
     * @param timeout Timeout in millis
     */
    setTimeout: function(/** Number */timeout) {
        this.timeout = timeout;
    },
    
    /**
     * @returns {Sonoran.Socket} The underlying socket.
     */
    getSocket: function() {
        return this.sock;
    },

    /**
     * Returns the currently set receiver function. By default,
     * this is the function onData().
     * @returns {function} The current receiver function
     */
    getRecvFunc: function() {
        return this.recvFunc;
    },

    /**
     * Set the receiver function for the next incoming packet.
     * It is called with this and the data received. See
     * also the description of onData.
     * @param func
     */
    setRecvFunc: function(/** Function */func) {
        assert(typeof(func) == 'function');
        this.recvFunc = func;
    },

    
    /**
     * @returns {String} Description
     */
    toString: function() {
        return sprintf("%s:%s", this.mote.getUniqueid(), this.name);
    },

    /**
     * Start the protocol. The callback is invoked when the procotol is finished.
     * @param callback  
     */
    open: function(/** DFLT_ASYNC_CB */callback) {
	if (BC.is(callback)) { return BC.exec(arguments.callee, this, arguments); }
        this.callback = callback;
        var _this = this;
        this.sock.open2(this.srcport, this.mote, function(result) {
            if (result.code != 0) {
                _this.sock.close(new AOP.ERR(_this.genErrMsg("socket open"), undefined, result));
            } else {
                _this.onOpen(result);
            }
        });
    },

    
    /**
     * Called when socket is ready and protocol should be started.
     * @param result The result of the open call, an AOP.OK instance
     */
    onOpen: function(/** AOP.OK */result) {
        assert(0, "missing implementation");
    },

    
    /**
     * Called when data on the socket has been received.
     * @param data Binary string
     */
    onData: function(data) {
        assert(0, "missing implementation");
    },

    
    /**
     * Called when a timeout occured. By default, the socket is closed with
     * an AOP.ERR instance and code ERR_TIMEOUT.
     * @param result
     */
    onTimeout: function(/** AOP.ERR */result) {
        assert(result.code!=0);
        this.sock.close(new AOP.ERR(ERR_TIMEOUT, this.genErrMsg("timeout"), undefined, result));
    },

    
    /**
     * Called when the protocol has finished. The socket has been closed and
     * the callback is invoked with the AOP.OK/AOP.ERR instance passed
     * to the Socket#close method.
     * @param result
     */
    onClose: function(/** AOP.Result */result) {
	var callback = this.callback;
	this.callback = null;
	if (callback) {
            callback(result);
	}
    },

    
    /**
     * Send data to the mote. If one parameter is given, it is directly send to the
     * socket. If a variable argument list is specified, Util.Formatter#pack
     * is used to create the data to send.
     * @param fmt   Binary or format string
     */
    send: function(/** Object */fmt) {
        var data = null;
        if (arguments.length==1) {
            data = fmt;
        } else {
            try {
                var args = [];
                for (var i = 1; i < arguments.length; i++) {
                    args.push(arguments[i]);
                }
                data = Formatter.pack(fmt, args);
            } catch (ex) {
                this.sock.close(Ex2ERR(ERR_GENERIC, ex, this.genErrMsg("Formatter.pack")));
            }
        }

        if (this.timer) {
            this.timer.cancel();
        }
        var _this = this;
        var span = Timer.getSpan(this.timeout, this.mote);
        this.timer = new Timer.Timer(span, undefined, function(status, timer) {
             assert(_this.timer != null);
            _this.timer = null;
            _this.onTimeout(status);
        });
        try {
            this.sock.send(data, this.mote, this.dstport, this.timer);
        } catch(ex) {
	    println(Runtime.dumpException(ex));
            this.sock.close(Ex2ERR(ERR_GENERIC, ex, this.genErrMsg("socket send")));
        }
    },

    
    /**
     * End protocol execution. The specified result is passed to onClose
     * and the callback.
     * @param result
     */
    close: function(/** AOP.Result */result) {
	if (this.timer) {
	    this.timer.cancel();
	    this.timer = null;
	}
        this.sock.close(result);
    },

    
    /**
     * End protocol execution with a ERR_INVALID_DATA.
     * @param data       Binary packet which led to failure
     * @param pos        Offset into packet, optional
     * @param reason     Text to add to error message, default 'invalid data'
     */
    closeInvalidData: function(/** String */data, /** Number */pos, /** String */reason) {
        pos = pos||0;
	var aid = new AOP.InvalidData(data, pos);
        reason = reason||"Invalid data";
	reason += ": " + aid.toString();
        var msg = this.genErrMsg(reason);
        this.close(new AOP.ERR(ERR_INVALID_DATA, this.genErrMsg(reason), undefined, aid));
    },
    
    
    /**
     * @private
     */
    genErrMsg: function(reason) {
        return sprintf("%s: '%s' failed: '%s'", this.mote.getUniqueid(), this.name, reason);
    }
};










