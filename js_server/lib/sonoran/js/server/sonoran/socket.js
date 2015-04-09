//  (C) COPYRIGHT INTERNATIONAL BUSINESS MACHINES CORPORATION 2006-2010
//                       ALL RIGHTS RESERVED
//        IBM Research Division, Zurich Research Laboratory
// --------------------------------------------------------------------


/**
 * Sonoran.Socket implements the socket class for driving the communication
 * with motes in a non-blocking or blocking manner (by default, non-blocking). 
 * In non-blocking mode, override Sonoran.Socket.onData to receive media events.
 * In blocking mode, use Sonoran.Socket#recv to receive messages.</br>
 * You may override the following methods in non-blocking mode:
 * <ul>
 * <li>onOpen:            called when socket is ready.</li>
 * <li>onData:            called when a packet is received.</li>
 * <li>onTimeout:         called when timeout occurs after a send (with a timeout specification) occured.</li>
 * <li>onClose:           called when the socket was closed.</li>
 * </ul>
 * Use the following functions with Socket in both modes:
 * <ul>
 * <li>send:            Send message to a mote.</li>
 * <li>broadcast:       Broadcast a message using a gateway mote.</li>
 * <li>close:           Close the socket.</li>
 * </ul> 
 * Use the following functions in blocking-mode:
 * <ul>
 * <li>recv:            Receive media events or errors, supports timeout.</li>
 * </ul>
 * @class
 * @constructor
 * @param options Optional, by default socket is created for non-blocking use
 * @see Sonoran.Socket.create
 */
Sonoran.Socket = function(/** Sonoran.Socket.Options */options) {
    assert((arguments.length==0)||(arguments[0] instanceof Sonoran.Socket.Options));
    /**
     * Source port. Port on the side of sonoran. Source when sent from Sonoran, destination
     * when received from a mote.
     * @type Number
     * @private
     */
    this.srcport = -1;
    /**
     * Source mote. If set, only accepts messages from this mote.
     * @type Sonoran.Mote
     * @private
     */
    this.srcmote = null;
    /**
     * FLag to indicated whether this socket provides a synchronous interface.
     * @type Boolean
     * @private
     */
    this.forBlockingMode = false;
    /**
     * Thread queue
     * @type Thread.Queue
     * @private
     */
    this.syncQueue = null;
    /**
     * Socket id.
     * @type Number
     * @private
     */
    this.id = Sonoran.Socket.ID;
    Sonoran.Socket.ID += 1;
    /**
     * Socket name.
     * @type String
     * @private
     */
    this.name = "Sonoran.Socket:" + this.id;
    
    this.setOptions(options ? options : new Sonoran.Socket.Options());
};


/**
 * @type Number
 * @private
 */
Sonoran.Socket.ID = 1;


/** @private */
Sonoran.Socket.prototype = {
    /**
     * toString implementation.
     * @returns {String} string
     */
    toString: function() {
        return this.name + ":" + this.srcport;
    },

    
    /**
     * getInfo implementation.
     * @returns {String} information string
     */
    getInfo: function() {
        return this.name + ":" + this.srcport;
    },

    
    /**
     * Is socket closed?
     * @returns {Boolean} flag
     */
    isClosed: function() {
        return this.srcport<0;
    },

    
    /**
     * @returns {Number} the local port of socket
     */
    getLocalPort: function() {
        return this.srcport;
    },


    /**
     * @returns {String} socket name
     * @private
     */
    getName: function() {
        return this.name;
    },
    

    /**
     * Set socket name.
     * @private
     */
    setName: function(/** String */name) {
        this.name = name;
    },



    /**
     * Set socket options. Has to be called before first send operation.
     * @param options
     * @returns {Sonoran.Socket} this
     */
    setOptions: function(/** Sonoran.Socket.Options */options) {
        this.forBlockingMode = options.forBlockingMode;
        if (this.forBlockingMode) {
            this.syncQueue = new Thread.Queue("Sonoran.Socket", options.queueSize, options.dropOnOverflow, options.dropCnt);
        }
        return this;
    },
    
    
    /**
     * Set to blocking or non-blocking mode. Override onBlob to receive data in non-blocking mode.
     * Use recv in blocking mode.
     * @param flag
     * @returns {IO.Queue} this
     */
    setBlockingMode: function(/** Boolean */flag) {
        this.setOptions(flag ? Sonoran.Socket.DfltBlockingOptions : Sonoran.Socket.DfltNonBlockingOptions);
        return this;
    },

    
    /**
     * Specify socket to accept only messages from specified mote by default.
     * @param mote
     */
    setSrcMote: function(/** Sonoran.Mote */mote) {
	this.srcmote = mote;
    },


    /**
     * @returns {Sonoran.Mote}
     */
    getSrcMote: function() {
	return this.srcmote;
    },


    /**
     * @returns {Number}
     */
    getSrcPort: function() {
	return this.srcport;
    },


    
    /**
     * Bind socket to a source port and call onOpen when socket is ready.
     * @param srcport     Optional, source port, if undefined or 0, the socket manages the port
     * @param callback    Optional, invoked when socket is ready and bound, with an AOP.OK instance where
     * the 'data' property points to this socket
     * @returns {Sonoran.Socket} this
     * @throws {Exception}
     */
    open: function(/** Number */srcport, /** DFLT_ASYNC_CB */callback) {
        // We avoid a thread switch by looking at the callback type at the end
        //if (BC.is(callback)) { return BC.exec(arguments.callee, this, arguments); }
        assert(this.srcport<0, "Socket already open");
        if (!srcport) {
            this.srcport = Sonoran.Registry.registerPort();
        } else {
            Sonoran.Registry.registerPort(srcport);
            this.srcport = srcport;
        }

        Sonoran.Socket.Manager.onOpen(this);

        var ok = new AOP.OK(this); 
        this.onOpen(ok);
        if (!callback||callback===BLCK) {
            return this;
        } else if (callback===SCB) {
            return ok;
        } else {
            callback(ok);
            return this;
        }
    },


    /**
     * Bind socket to a source port and source mote. Call onOpen when socket is ready.
     * @param srcport     Optional, source port, if undefined or 0, the socket manages the port
     * @param srcmote     Optional, source mote
     * @param callback    Optional, invoked when socket is ready and bound, with an AOP.OK instance where
     * the 'data' property points to this socket
     * @returns {Sonoran.Socket} this
     * @throws {Exception}
     */
    open2: function(/** Number */srcport, /** Sonoran.Mote */mote, /** DFLT_ASYNC_CB */callback) {
	this.srcmote = mote;
	return this.open(srcport, callback);
    },


    /**
     * Send data. Optionally, a timer or a set of timers can be specified which are started when the data is sent to the mote.
     * Especially timers based on saguaro time should be setup here, as the send operation is used to synchronize the
     * time with the simulation process. Example:
     * var result = Saguaro.startProcess(undefined, SCB);
     * var conn = result.getData();
     * var sock = new Sonoran.Socket();
     * sock.open();
     * var timer1 = new Timer.Timer(500, conn, this.onTimeout1.bind(this));
     * var timer2 = new Timer.Timer(5000, conn, this.onTimeout2.bind(this));
     * sock.send(bytes, dstmote, dstport, [ timer1, timer2 ]);
     * ...
     * @param bytes    Binary striung
     * @param dst      Sonoran.Mote
     * @param dstport  Destination port
     * @param timer    Optional, timer or set of timers, 
     * @throws {Exception} an exception in case of invalid port, invalid mote or no route to mote
     */
    send: function(/** String */bytes, /** Sonoran.Mote */dst, /** Number */dstport, /** Timer.Timer|Timer.Timer[] */timer) {
        if (!dst) { throw "Missing 'dst' specification!"; }
        if (this.srcport < 0) { throw "Socket is closed"; }
	//XXX: Dust motes allow upto 2^16+256 if (dstport<0||dstport>255) { throw "Invalid dstport parameter: " + dstport; }

        if (timer) {
            assert(!this.forBlockingMode, "Unsupported timer parameter for send operation in blocking mode");
            assert(timer instanceof Timer.Timer || timer instanceof Array, "API change");
	    //XXX:eir why check this here???
            if (timer instanceof Timer.Timer) {
		timer = [ timer ];
            }
            for (var i = 0; i < timer.length; i++) {
		var t = timer[i];
		assert(t instanceof Timer.Timer);
		if (t.isQueued()) {
                    throw sprintf("Socket.send: timer has already been started: %s", t);
		} else if (t.hasExpired()) {
                    throw sprintf("Socket.send: timer has already been expired: %s", t);
		} else if (t.getDeadline()) {
                    throw sprintf("Socket.send: timer has already a deadline: %s", t);
		} else if (!t.getCallback()) {
                    throw sprintf("Socket.send: no callback for timer has been specified: %s", t);
		}
            }
        }

        if (Logger.logs(Logger.SONORAN, Logger.DEBUG)) {
            var msg = sprintf("Socket-Message: --> dst %s  dstport %d  srcport %d  %H", dst.toString(), dstport, this.srcport, bytes);
            Logger.debug(msg);
        }

        dst.send(dstport, this.srcport, bytes, timer);
    },

    
    /**
     * Broadcast data.
     * @param bytes    Binary string
     * @param mote     The broadcasting mote which has/must be a gateway capable of broadcasting
     * @param dstport  Destination port
     * @param timer    Optional, timer or set of timers, 
     * @throws {Exception} an exception in case the packet cannot be delivered
     */
    broadcast: function(/** String */bytes, /** Sonoran.Mote */mote, /** Number */dstport, /** Timer.Timer|Timer.Timer[] */timer) {
	assert(Sonoran.Gateway.isGatewayMote(mote), "Not a gateway mote");
	var gateway = mote.getGatewayP();
        if (this.srcport < 0) { throw "Socket is closed"; }
        if (dstport<0||dstport>255) { throw "Invalid dstport parameter " + dstport; }
        
        if (Logger.logs(Logger.SONORAN, Logger.DEBUG)) {
            var msg = sprintf("Socket-Broadcast: --> dstport %d  srcport %d  %H", dstport, this.srcport, bytes);
            Logger.debug(msg);
        }
        gateway.broadcast(dstport, this.srcport, bytes, timer);
    },
    
    
    /**
     * Close this socket. After closing the socket, onClose is called on this socket.
     * @param status   Optional, AOP.Result instance passed to onClose, by default an OK instance
     * @param callback Optional
     */
    close: function(/** AOP.OK */status, /** DFLT_ASYNC_CB */callback) {
	if (callback&&BC.is(callback)) { return BC.exec(arguments.callee, this, arguments); }
        if (!status) {
            status = new AOP.OK();
        }
	try {
	    Sonoran.Registry.deregisterPort(this.srcport);    
	} catch (x) {}
        Sonoran.Socket.Manager.onClose(this);
        this.srcport = -1;
        if (this.syncQueue) {
            assert(this.forBlockingMode);
            this.syncQueue.close(status);
        }
        this.onClose(status);
        if (callback) {
            callback(status);
        }
    },

    
    /**
     * Default implementation of onOpen closes the socket when the open operation failed, otherwise it just returns.
     * @param status      AOP.Result instance
     */
    onOpen: function(/** AOP.Result */status) {
        if (status.code != 0) {
	    this.close(status);
        }
    },


    /**
     * Default implementation of onClose is empty. 
     * @param status      AOP.Result
     */
    onClose: function(/** AOP.Result */status) {},
    
    
    /**
     * Default implementation to receive a message on this socket. Override this function to
     * handle the incoming messages which are Sonoran.Event.Media instances.
     * Bettter use Socket.recv in case of non-blocking mode.
     * @param msg  Sonoran.Event.Media
     */
    onData: function(/** Sonoran.Event.Media */msg) {},


    /**
     * Shall this socket accept given event? Matches destination port in message against this source
     * port and source mote in message against this source mote (if set).
     * @param blob
     * @returns {Boolean}
     */
    accept: function(/** Sonoran.Event.Media */blob) {
	if (blob.dstport !== this.srcport) {          // When socket is closed, dstport != srcport 
	    return false;
	}
	if (this.srcmote && (this.srcmote !== blob.mote)) {
	    return false;
	}
	return true;
    },


    /**
     * @param blob
     * @private
     */
    onBlob: function(/** Sonoran.Event.MEDIA */blob) {
        //assert(blob.msgtype == Sonoran.Event.MEDIA);
	if (!this.accept(blob)) {
	    return false;
	}
            
        if (Logger.logs(Logger.SONORAN, Logger.DEBUG)) {
            var msg = sprintf("Socket-Message: <-- src %s  srcport %d  dstport %d  %H", blob.mote.toString(), blob.srcport, blob.dstport, blob.data);
            Logger.debug(msg);
        }

        if (this.forBlockingMode) {
            this.syncQueue.put(blob);
	    return true;
        } 

        // decouple and start immediately
        //var _this = this;
        //Thread.start(function() { _this.onData(blob); });
        //Thread.yield();
	this.onData(blob);
        return true;
    },



    /**
     * A packet is ready to pickup without blocking? Only supported by a synchonously operated socket.
     * @returns {Boolean} flag
     */
    canRecv: function() {
        assert(this.forBlockingMode, "Invalid socket mode");
        return !this.syncQueue.isEmpty();
    },

    
    /**
     * Receive a packet or error from a socket. An AOP.ERR with code ERR_TIMEOUT is returned on timeout. Any other
     * error indicated the socket being closed. Only supported by a synchonously operated socket.
     * @param timeout Optional, timeout in milliseconds or timer span object
     * @param context Optional, simulated mote or saguaro connection to specify context for timeout (if in milliseconds)
     * @returns {Sonoran.Event.Media}
     * @throws {Exception} exception, possibly with ERR_RESOURCE_GONE when queue was closed
     * @throws {Timer.Exception} on timeout
     */
    recv: function(/** Number|Timer.Span */timeout, /** Object */context) {
        assert(this.forBlockingMode, "Invalid socket mode");
        var timer;
        if (timeout) {
            timer = new Timer.Timer(timeout, context);
        }
        return this.syncQueue.get(timer);
    }
};




/**
 * Socket options for Sonoran.Socket.
 * @see IO.Queue.Options
 */
Sonoran.Socket.Options = IO.Queue.Options;


/**
 * Default options object for a Sonoran socket in non-blocking mode.
 * @type IO.Queue.Options
 * @see IO.Queue.DfltNonBlockingOptions
 */
Sonoran.Socket.DfltNonBlockingOptions = IO.Queue.DfltNonBlockingOptions;


/**
 * Default options object for a Sonoran socket in blocking mode.
 * @type IO.Queue.Options
 * @see IO.Queue.DfltBlockingOptions
 */
Sonoran.Socket.DfltBlockingOptions = IO.Queue.DfltBlockingOptions;






/**
 * For legacy code.
 * @private
 * @ignore
 */
Sonoran.SocketA = Sonoran.Socket;


/**
 * For legacy code.
 * @private
 * @ignore
 */
Sonoran.createSocket = Sonoran.Socket.create;





/**
 * Exchange a packet over an asynchronous socket, wait for
 * response, error or timeout. The socket is not closed in case of the timeout.
 * @param sock
 * @param mote
 * @param dstport
 * @param timeout
 * @param data
 * @param callback
 * @returns {Sonoran.Event.Media} The received media event
 * @throws {AOP.Exception|Timer.Exception}
 * @private
 */
Sonoran.Socket.exchange = function(/** Sonoran.Socket */sock, /** Sonoran.Mote */mote, /** Number */dstport, /** Number */timeout, /** String */data, /** DFLT_ASYNC_CB */callback) {
    if (BC.is(callback)) { return BC.exec(arguments.callee, this, arguments); }
    var oldOnDataFunc = sock.onData;
    var closef = function(result) {
        sock.onData = oldOnDataFunc;
        callback(result);
    };
    sock.onData = function(ev) {
        timer.cancel();
        closef(new AOP.OK(ev));
    };
    var onTimeout = function(result) {
        closef(result);
    };
    var timer = new Timer.Timer(timeout, mote, onTimeout);
    sock.send(data, mote, dstport, timer);
};






/**
 * Keeps track of all open sockets.
 * @class
 * @static
 * @private
 */
Sonoran.Socket.Manager = {
    /**
     * @type Function
     * @private
     */
    eventListener: null,

    /**
     * Map of socket id to socket
     * @private
     */
    sockets: [],

    /**
     * @private
     */
    onOpen: function(/** Sonoran.Socket */sock) {
        if (this.lookupById(sock.id) >= 0) {
            throw "Socket with same id has already been opened: " + sock.id;
        }
        if (this.lookupByName(sock.name)) {
            throw "Socket with same name has already been opened: " + sock.name;
        }
	if (!this.eventListener) {
	    this.eventListener = Sonoran.Registry.addFilter(this.onBlob.bind(this));
	}
        this.sockets.push(sock);
    },
    
    /**
     * @private
     */
    onBlob: function(blob) {
        //assert(blob.msgtype === Sonoran.Event.MEDIA);
	if (blob.category===Sonoran.EV_CAT_MOTE && blob.evname === Sonoran.EV_NAME_MEDIA) {
	    for (var i = 0; i < this.sockets.length; i++) {
		var sock = this.sockets[i];
		if (sock.onBlob(blob) === true) {
		    return;
		}
	    }
	    Logger.info("Media event not handled by any socket: " + blob);
	}
    },

    /**
     * @private
     */
    onClose: function(/** Sonoran.Socket */sock) {
	var idx = this.lookupById(sock.id);
	if (idx >= 0) {
	    this.sockets.splice(idx, 1);
	}
    },

    /**
     * Lookup socket by name.
     * @param name Socket name.
     * @returns {Sonoran.Socket}
     * @private
     */
    lookupByName: function(/** String */name) {
	var sockets = this.sockets;
	var f = function(name) {
	    for (var i = 0; i < sockets.length; i++) {
		if (sockets[i].name === name) {
		    return sockets[i];
		}
	    }
	    return null;
	};
	var sock = f(name);
	if (sock) { 
	    return sock; 
	}
        // compatibility with old code
        if (name.indexOf(".") < 0) {
	    return f("name", "User." + name);
        }
        return null;
    },


    /**
     * Lookup socket by id.
     * @param id
     * @returns {Number}
     * @private
     */
    lookupById: function(/** Number */id) {
	var sockets = this.sockets;
	for (var i = 0; i < sockets.length; i++) {
	    if (sockets[i].id === id) {
		return i;
	    }
	}
	return -1;
    },
    
    /**
     * @private
     */
    toString: function() {
        return "Sonoran.Socket.Manager";
    }
};




//---------------------------------------------------------------------------------------------------------------
//
// Socket Commands
//
//---------------------------------------------------------------------------------------------------------------
/**
 * @class
 * @private
 */
Sonoran.CLI.Commands.Socket = {};


/**
 * @private
 */
Sonoran.CLI.Commands.Socket.setup = function(shell, sock, userHandler, fileHandle) {
    var name = sock.getName();
    sock.onData = function(blob) {
        var s = null;
        if (userHandler && userHandler.onData) {
            try {
	        s = userHandler.onData(blob);
            } catch(ex) {
	        var msg = Runtime.dumpException(ex, name + ".onData() failed: " + ex);
                //shell.println(msg);
		println(msg);
                Logger.info(msg);
            }
        }
        if (s==null) {
            s = blob.format(new Date());
        }
	if (s.length>0) {
            if (fileHandle) {
		try {
	            IO.File.fwrite(fileHandle, s);
	            IO.File.fflush(fileHandle);
		} catch(ex) {
	            var msg = Runtime.dumpException(ex, name + ".onData() failed: " + ex);
                    //shell.println(msg);
		    println(msg);
                    Logger.err(msg);
	            sock.close(new AOP.ERR(msg));
		}
            } else {
		print(s);
            }
	}
    };
    sock.onClose = function(status) {
	var msg = sprintf("Socket %s has been closed", name);
	if (status.code === 0) {
	    msg += ".";
	} else {
	    msg += sprintf(": %s", status); 
	}
        //shell.println(msg);
	println(msg);
        if (userHandler && userHandler.onClose) {
            try {
	        userHandler.onClose(status);
            } catch(ex) {
                var msg = Runtime.dumpException(ex, name + ".onClose() failed: " + ex);
	        //shell.println(msg);
		println(msg);
                Logger.info(msg);
            }
        }
    };
    sock.sendByCommand = function(/** Number */dstport, /** Array */dstmotes, /** Array */args, /** function */callback) {
	assert(args instanceof Array);
        var errs = "";
        for (var i = 0; i < dstmotes.length; i++){
	    var argv = arraycopy(args, 0);
	    assert(args.length===argv.length);
	    var dstmote = dstmotes[i];
	    var bytes = null;
	    if (userHandler && userHandler.send) {
	        try {
	            bytes = userHandler.send(dstport, dstmote, argv);
	        } catch(ex) {
	            callback(Ex2ERR(ERR_GENERIC, ex, name + ".send() failed"));
	            return;
	        }
	    }
            if (!bytes||bytes.length==0) {
                try {
	            bytes = Formatter.transcode(argv.shift(), argv);
                } catch(ex) {
	            callback(Ex2ERR(ERR_GENERIC, ex, "Invalid data format"));
	            return;
                }
	    }
            try {
	        sock.send(bytes, dstmotes[i], dstport);
	    } catch(ex) {
	        errs += ex + "\n";
	    }
	    Thread.sleep(100);
        }
        callback((errs.length>0) ? new AOP.ERR(errs) : new AOP.OK(sock));
    };
    sock.broadcastByCommand = function(/** Mote */gateway, /** Number */dstport, /** Array */argv, /** function */callback) {
        var bytes = null;
        var errs = "";
        if (userHandler && userHandler.broadcast) {
            try {
	        bytes = userHandler.broadcast(gateway, dstport, argv);
            } catch(ex) {
	        callback(Ex2ERR(ERR_GENERIC, ex, name+".broadcast() failed"));
	        return;
            }
	}
        if (!bytes||bytes.length==0) {
            try {
	        bytes = Formatter.transcode(argv.shift(), argv);
            } catch(ex) {
	        callback(Ex2ERR(ERR_GENERIC, ex, "Invalid data format"));
	        return;
            }
        }
        try {
	    sock.broadcast(bytes, gateway, dstport);
        } catch(ex) {
	    callback(Ex2ERR(ERR_GENERIC, ex, "Socket broadcast operation failed"));
	    return;
        }
        callback(new AOP.OK(sock));
    };
    if (userHandler) {
        sock.hasUserHandler = true;
    }
};




/**
 * @class
 * @constructor
 * @private
 */
Sonoran.CLI.Commands.Socket.BindCommand = function(shell, name) {
    this.description =
        "Create and bind a socket for a port to a name. Messages received on this socket are logged to stdout (or a file if \n" +
        "-f is specified). The socket name must be a valid Javascript identifier (may include '.'). The command searches for a\n" +
        "Javascript object reachable by the socket name which handles the socket communication. If none is found, the 'send'\n" +
        "and 'broadcast' commands treat the data parameters as binary strings in hex format. Otherwise, the Javascript object\n" +
        "may override this behaviour for more convenient usage. The interface of that object\n" +
        "must follow the following template (which can be sourced before or sourced by the command using '-s script-name'):\n" +
        "<SocketJavascriptIdentitifier> = {\n" +
        "  /**                                                   \n" +
        "  * Evaluate arguments for a 'socket-send' and act accordingly. \n" +
        "  * @param dstport  Destination port specified by user  \n" +
        "  * @param dstmotes Destination motes specified in command       \n" +
        "  * @param argv     String[] specified by user after dstport on the command line\n" +
        "  * @returns message to be sent to given mote or null if caller should handle this.\n" +
        "  */                                                     \n" +
        "  send: function(dstport, dstmote, argv) {},\n" +
        "  /**                                                   \n" +
        "  * Evaluate arguments for a 'socket-broadcast' and act accordingly. \n" +
        "  * @param dstmote  The mote which does the broadcast. Must have a gateway installed and running.\n" +
        "  * @param dstport  Destination port on all motes to broadcast to. \n" +
        "  * @param argv     String[] specified by user after dstport on the command line.\n" +
        "  * @returns message to be sent to given mote or null if caller should handle this.\n" +
        "  */                                                     \n" +
        "  broadcast: function(dstmote, dstport, argv) {},\n" +
        "  /**\n" +
        "  * Data has been received for this socket.\n" +
        "  * @param blob  Message with properties src (Sonoran.Mote), srcport (Number), dstport (Number)\n" +
        "  *              and data (Binary String)\n" +
        "  * @returns a String to be loged to a file or stdout by caller\n" +
        "  */\n" +
        "  onData: function(blob) {    },\n" +
        "  /** Called when this socket is closed. */\n" +
        "  onClose: function(status) {    }\n" +
        "};\n";
    this.portSpec = new GetOpt.Number("port", "Port to reserve. If 0, system allocates port.");
    this.portSpec.setRange(0, 0, 65535);
    this.nameSpec = new GetOpt.Identifier(/^[a-zA-Z][[a-zA-Z\d_\.]*$/, "name", "Socket name, use a valid Javascript identifier.");
    this.fileSpec = new GetOpt.Simple("logfile", "Log messages to this named file instead of standard out.");
    this.fileOpt = new GetOpt.Option("f", "--filename", 0, null, null, this.fileSpec);
    this.scriptSpec = new GetOpt.Simple("script", "Name of javascript file which is sourced before socket name is searched.");
    this.scriptOpt = new GetOpt.Option("s", "--script", 0, null, null, this.scriptSpec);
    var optSet = new GetOpt.OptionSet([ this.fileOpt, this.scriptOpt ]);
    CLI.Command.call(this, shell, name, [ optSet, this.nameSpec, this.portSpec, new GetOpt.EndOfArgs() ], 1);
};

/** @private */
Sonoran.CLI.Commands.Socket.BindCommand.prototype = extend(
    CLI.Command.prototype,
    {
	/** @private */
        exec: function(callback) {
	    var port = this.portSpec.getNumber();
	    var name = this.nameSpec.getArg();
            if (!name) {
                callback(new AOP.ERR("Missing name"));
                return;
            }
	    var fileHandle = null;
	    if (this.fileOpt.isSet()) {
	        var filePath = this.fileSpec.getArg();
	        try {
	            fileHandle = IO.File.fopen(filePath, "w");
	        } catch(ex) {
	            callback(new Ex2ERR(ERR_GENERIC, ex, "Cannot open " + filePath));
	            return;
	        }
	    }
	    if (this.scriptOpt.isSet()) {
	        var scriptName = this.scriptSpec.getArg();
                var result = this.shell.execFile(scriptName, undefined, null, SCB);
                if (result.code != 0) {
                    callback(new AOP.ERR(sprintf("Cannot source script '%s': %s", scriptName, result)));
                    return;
                }
            }
            var obj = null;
            try {
                obj = Blob.accessGlobalContext(name);
            } catch (x) {
                obj = null;
            }
            if (!obj) {
                // compatibility with old code
                if (name.indexOf(".") < 0) {
                    try {
                        obj = Blob.accessGlobalContext("User." + name);
                    } catch (x) {
                        obj = null;
                    }
                }
            }
            if (!obj && this.scriptOpt.isSet()) {
		callback(new AOP.ERR("Could not find implementation for specified socket name."));
		return;
	    }
            if (obj) {
                if (typeof(obj) !== "object") {
                    var msg = sprintf("Socket name '%s' does not lead to a Javascript object", name);
                    //this.shell.println(msg);
		    println(msg);
                    Logger.warn(msg);
                    obj = null;
                } else if (!obj.onData || !obj.send || !obj.onClose) {
                    var msg = sprintf("Warning: Javascript object '%s' does not have a send, onData or onClose method", name);
                    //this.shell.println(msg);
		    println(msg);
                    Logger.warn(msg);
	        }
            }
	    var sock = Sonoran.Socket.Manager.lookupByName(name);
	    if (sock) {
		var msg = "Closing already existing socket...";
		//this.shell.println(msg);
		println(msg);
		Logger.warn(msg);
		sock.close(new AOP.OK());
	    }
            sock = new Sonoran.Socket();
            var res = sock.open(port, SCB);
            assert(res.code===0);
            sock.setName(name);
            Sonoran.CLI.Commands.Socket.setup(this.shell, sock, obj, fileHandle);
            callback(new AOP.OK(sock));
        }
    }
);




/**
 * @class
 * @constructor
 * @private
 */
Sonoran.CLI.Commands.Socket.ListCommand = function(shell, name) {
    this.description = "List all sockets created by socket-bind commands.";
    CLI.Command.call(this, shell, name);
};

/** @private */
Sonoran.CLI.Commands.Socket.ListCommand.prototype = extend(
    CLI.Command.prototype,
    {
        /** @private */
        exec: function(callback) {
            var sockets = Sonoran.Socket.Manager.sockets;
            var table = new Util.Formatter.Table2(4);
            table.setTitle("Id", "Name", "Port", "Javascript");
            var y = 0;
            for (var i = 0; i < sockets.length; i++) {
                var sock = sockets[i];
                table.setValue(0, y, sock.id);
                table.setValue(1, y, sock.getName());
                table.setValue(2, y, sock.getLocalPort());
                table.setValue(3, y, (sock.hasUserHandler)?"yes":"no");
                y += 1;
            }
	    callback(new AOP.OK(table.render().join("\n")));
        }
    }
);




/**
 * @class 
 * @constructor
 * @private
 */
Sonoran.CLI.Commands.Socket.SendCommand = function(shell, name) {
    this.description =
        "Send parameters to a user-defined socket script or interprete parameters as data and send that\n"+
        "to the selected motes using the specified socket.";
    this.sockSpec = new GetOpt.Simple("socket", "Socket name or id");
    this.dstportSpec = new GetOpt.Number("dstport", "Destination port");
    //Dust motes allow up to 2^16+256 ---- this.dstportSpec.setRange(0, 0, 255);
    this.dataSpec = new GetOpt.Simple("data", "Sent to socket script method or evaluated as message data and sent to motes");
    this.restOfArgs = new GetOpt.RestOfArgs("...", "Additonal parameters for data string.");
    var cmdSpec = new Sonoran.CLI.Spec(name, Sonoran.CLI.DST_MANY_MOTES);
    CLI.Command.call(this, shell, cmdSpec, [ this.sockSpec, this.dstportSpec, this.dataSpec, this.restOfArgs ]);
};

/** @private */
Sonoran.CLI.Commands.Socket.SendCommand.prototype = extend(
    CLI.Command.prototype,
    {
        /** @private */
        exec: function(callback) {
	    var motes = this.cmdSpec.getMotes();
            var dstport = this.dstportSpec.getNumber();
	    var name = this.sockSpec.getArg();
	    var sock = Sonoran.Socket.Manager.lookupByName(name);
	    if (!sock) {
	        callback(new AOP.ERR(sprintf("No such socket <%s>", name)));
	        return;
	    }
	    var argv = [ this.dataSpec.getArg() ].concat(this.restOfArgs.getRestArgs());
            sock.sendByCommand(dstport, motes, argv, callback);
        }
    }
);







/**
 * @class
 * @constructor
 * @private
 */
Sonoran.CLI.Commands.Socket.BroadcastCommand = function(shell, name) {
    this.description =
        "Send parameters to socket script or interprete them as data broadcast them by the socket on the specified mote.\n"+
        "The specified mote must have been setup as gateway and support a broadcast operation.";
    this.sockSpec = new GetOpt.Simple("socket", "Socket name or id");
    this.dstportSpec = new GetOpt.Number("dstport", "Destination port");
    this.dstportSpec.setRange(0, 0, 255);
    this.dataSpec = new GetOpt.Simple("data", "Sent to socket script method or evaluated as message data and sent to motes");
    this.restOfArgs = new GetOpt.RestOfArgs("...", "Additonal parameters for data string.");
    var cmdSpec = new Sonoran.CLI.Spec(name, Sonoran.CLI.DST_ONE_MOTE);
    CLI.Command.call(this, shell, cmdSpec, [ this.sockSpec, this.dstportSpec, this.dataSpec, this.restOfArgs ]);
};

/** @private */
Sonoran.CLI.Commands.Socket.BroadcastCommand.prototype = extend(
    CLI.Command.prototype,
    {
        /** @private */
        exec: function(callback) {
	    var dstport = this.dstportSpec.getNumber();
            var mote = this.cmdSpec.getMote();
            assert(mote);
	    var name = this.sockSpec.getArg();
	    var sock = Sonoran.Socket.Manager.lookupByName(name);
	    if (!sock) {
	        callback(new AOP.ERR(sprintf("No such socket <%s>", name)));
	        return;
	    }
	    var argv = [ this.dataSpec.getArg() ].concat(this.restOfArgs.getRestArgs());
            sock.broadcastByCommand(mote, dstport, argv, callback);
        }
    }
);





/**
 * @class
 * @constructor
 * @private
 */
Sonoran.CLI.Commands.Socket.CloseCommand = function(shell, name) {
    this.description = "Close a socket.";
    this.sockSpec = new GetOpt.Simple("socket", "Socket name or id.");
    this.fopt = new GetOpt.Option("f", "--force", 0, null, null, null);
    var optSet = new GetOpt.OptionSet([this.fopt ]);
    CLI.Command.call(this, shell, name, [ optSet, this.sockSpec, new GetOpt.EndOfArgs() ]);
};

/** @private */
Sonoran.CLI.Commands.Socket.CloseCommand.prototype = extend(
    CLI.Command.prototype,
    {
	/** @private */
	exec: function(callback) {
            var name = this.sockSpec.getArg();
	    var sock = Sonoran.Socket.Manager.lookupByName(name);
	    if (!sock) {
	        if (this.fopt.isSet())
		    callback(new AOP.OK());
		else
		    callback(new AOP.ERR(sprintf("No such socket <%s>", name)));
	        return;
	    }
	    var ok = new AOP.OK();
            sock.close(ok);
	    callback(ok);
	}
    }
);


CLI.commandFactory.addModule("Sonoran.CLI.Commands.Socket");


/**
 * This namespace is searched for user scripts defining support functions for shell sockets.
 * @namespace User
 * @deprecated
 * @private
 */
User = {};







