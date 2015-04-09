//  (C) COPYRIGHT INTERNATIONAL BUSINESS MACHINES CORPORATION 2006-2010
//                       ALL RIGHTS RESERVED
//        IBM Research Division, Zurich Research Laboratory
// --------------------------------------------------------------------


Sonoran.Connection.extend(
    "Saguaro.Connection",
    /**
     * @lends Saguaro.Connection.prototype
     */
    {
	/**
	 * Saguaro.Connection represents a connection to a Saguaro process.
	 * Use Saguaro.connectProcess or Saguaro.startProcess instead of the constructor
	 * to reuse connections and/or start a saguaro process.
	 * @constructs
	 * @augments Sonoran.Connection
	 * @see Saguaro#connectProcess
	 * @see Saguaro#startProcess
	 * @param host       Saguaro host, optional
	 * @param port       Saguaro port, optional
	 */
	__constr__:function(/** String */host, /** Number */port, /** Boolean */skipInit) {
	    host = host||Saguaro.DFLT_HOST;
	    port = port||Saguaro.DFLT_PORT;
	    this.host = host;
	    this.port = port;
	    this.commandId = 1;
	    this.commands = {};
	    this.timerq = new Saguaro.Timer.Queue(this);
	    this.sdxManager = new Saguaro.SDXManager(this);
	    this.evLog = new Saguaro.EvLog(this);
	    this.eventListeners = new Saguaro.Connection.EventListeners(this);
	    this.eventListeners.add(Saguaro.Connection.EventListeners.onMoteEvent);
	    this.eventListeners.add(Saguaro.Connection.EventListeners.onRadiohwAddrEvent);
	    this.eventListeners.add(Bugz.onSaguaroEvent.bind(Bugz));
	    this.dispatcher = new Saguaro.Dispatcher(this);
	    this.sock = null;
	    this.skipInit = skipInit;
	    this.sagid2moteImpl = {};
	    Sonoran.Connection.call(this);
	},

	/**
	 * The saguaro host.
	 * @type String
	 * @private
	 */
	host: null,
	/**
	 * The saguaro port.
	 * @type Number
	 * @private
	 */
	port: -1,
	/**
	 * Next sequence number used in a command.
	 * @type Number
	 * @private
	 */
	commandId: null,
	/**
	 * Map of message id to Saguaro.Command instance.
	 * @type Object
	 * @private
	 */
	commands: null,
	/**
	 * Timeout for operations on this connection.
	 * @type Number
	 * @private
	 */
	commandTimeout: 10*1000,
	/**
	 * Last time stamp seen in a blob from saguaro, in micros.
	 * @type Number
	 * @private
	 */
	lastTimestamp: 0,
	/**
	 * Keeps all timers active for this connection (Saguaro.Timer.Queue).
	 * @type Object 
	 * @private
	 */
	timerq: null,
	/**
	 * @type Saguaro.Connection.EventListeners
	 * @private
	 */
	eventListeners: null,
	/**
	 * @type Saguaro.SDXManager
	 * @private
	 */
	sdxManager: null,
	/**
	 * @type Saguaro.EvLog
	 * @private
	 */
	evLog: null,
	/**
	 * Run-state/mode.
	 * @type Saguaro.Info
	 * @private
	 */
	info: null,
	/**
	 * Previous run-state before info was modified.
	 * @type Saguaro.Info
	 * @private
	 */
	prevRunState: null,
	/**
	 * Event dispatcher.
	 * @type Saguaro.Dispatcher
	 * @private
	 */
	dispatcher: null,
	/**
	 * @type IO.Socket
	 * @private
	 */
	sock: null,
	/**
	 * @type DataBuffer
	 * @private
	 */
	buf: null,
	/**
	 * @type Object
	 * @private
	 */
	sagid2moteImpl: null,

	
	/**
	 * Marshal this connection.
	 * @private
	 */
	_marshal: function() {
            return { __constr__: this.__constr__, host: this.host, port: this.port };
	},


	/**
	 * Open and initialize connection.
	 * @param callback
	 * @private
	 */
	open: function( /** DFLT_ASYNC_CB */callback) {
	    if (BC.is(callback)) { return BC.exec(arguments.callee, this, arguments); }
	    assert(!this.sock);
	    var _this = this;


	    // this.sock = new IO.TCPSocket(true); 
	    // this.sock.onClose = function(status) {
            //     _this.onClose(status);
	    // };
	    // this.sock.onBlob = function(blob) {
	    //     var data = blob.data;
	    //     var len = ((data[1]&0xff)<<16) + ((data[2]&0xff)<<8) + (data[3]&0xff) + 4;
    	    //     assert(data.length==len, "" + data.length + ", " + len);
    	    //     var transportMsgtype = data[0];
	    //     try {
	    // 	blob = JSON3.parse(data, 4, len - 4);
	    //     } catch (x) {
            //         QUACK(0, "Received invalid json from saguaro: " + data.join(":"));
            //         QUACK(0, Runtime.dumpException(x));
            //         Runtime.exit(11);
	    //     }
    	    //     try {
    	    // 	_this.dispatcher.onBlob(transportMsgtype, blob);	
    	    //     } catch (x) {
    	    // 	QUACK(0, "EX: " + x);
            //         QUACK(0, Runtime.dumpException(x, "Handling saguaro message failed: " + Util.formatData(blob)));
    	    //     }
	    // };



	    this.sock = new IO.TCPSocket(); 
	    this.sock.onClose = function(status) {
		_this.onClose(status);
	    };
	    this.sock.onBlob = function(blob) {
		var s = blob.data;
		var l = ((s.charCodeAt(1)&0xff)<<16) + ((s.charCodeAt(2)&0xff)<<8) + (s.charCodeAt(3)&0xff) + 4;
    		assert(s.length==l, "" + s.length + ", " + l);
    		var transportMsgtype = s.charCodeAt(0);
		//QUACK(0, "In saguaro: " + s.substr(4));
		try {
		    blob = JSON.parse(s.substr(4));
		} catch (x) {
                    QUACK(0, "Received invalid json from saguaro: " + s.substr(4));
                    QUACK(0, Runtime.dumpException(x));
                    Runtime.exit(11);
		}
    		try {
    		    _this.dispatcher.onBlob(transportMsgtype, blob);	
    		} catch (x) {
    		    QUACK(0, "EX: " + x);
                    QUACK(0, Runtime.dumpException(x, "Handling saguaro message failed: " + Util.formatData(blob)));
    		}
	    };




	    // this.buf = new DataBuffer(64*1024);
	    // this.sock.onBlob = function(blob) {
	    //     //_this.buf.appendU8Array(blob.data);
	    //     _this.buf.appendBinaryString(blob.data);
            //     while(true) {
	    // 	if (_this.buf.getLength() < 4) {
    	    // 	    _this.buf.reshift();
    	    // 	    break;
	    // 	}

	    // 	var len = ((_this.buf.getAt(1))<<16) + ((_this.buf.getAt(2))<<8) + (_this.buf.getAt(3)) + 4;
    	    // 	assert(len > 0, "" + _this.buf.getAt(1) + ", " + _this.buf.getAt(2) + ", " + _this.buf.getAt(3));
	    // 	if (_this.buf.getLength() < len) {
    	    // 	    _this.buf.reshift();
            //             return;
	    // 	}

    	    // 	var transportMsgtype = _this.buf.getAt(0);

	    // 	try {
            //             blob = _this.buf.toJson(4, len-4);
	    // 	} catch (x) {
            //             QUACK(0, "Received invalid json from saguaro:\n" + _this.buf.substring(4,len-4));
            //             QUACK(0, Runtime.dumpException(x));
            //             Runtime.exit(11);
	    // 	}

    	    // 	// eat up len bytes in buffer	    
    	    // 	_this.buf.setOff(len);

    	    // 	try {
    	    // 	    _this.dispatcher.onBlob(transportMsgtype, blob);	
    	    // 	} catch (x) {
    	    // 	    QUACK(0, "EX: " + x);
            //             QUACK(0, Runtime.dumpException(x, "Handling saguaro message failed: " + Util.formatData(blob)));
    	    // 	}
            //     }
	    // };

	    // // this.buf = '';
	    // // this.sock.onBlob = function(blob) {
	    // //     _this.buf += blob.data;
	    // //     if (_this.buf.length < 4) {
	    // //         return;
	    // //     }
	    // //     while(true) {
	    // //         var len = ((_this.buf.charCodeAt(1)&0xff)<<16) + ((_this.buf.charCodeAt(2)&0xff)<<8) + (_this.buf.charCodeAt(3)&0xff) + 4;
	    // //         if (_this.buf.length < len) {
	    // //             return;
	    // //         }
	    // // 	    var msgtype = _this.buf.charCodeAt(0);
	    // // 	    assert(Saguaro.MSGTYPE_NAMES[msgtype]!==undefined);

	    // //         var s = _this.buf.substring(4, len);
	    // //         _this.buf = _this.buf.substring(len);
	    // //         assert(_this.buf.length>=0);
	    // //         try {
	    // //             blob = JSON.parse(s);
	    // //         } catch (x) {
	    // //             QUACK(0, "Received invalid json from saguaro:");
	    // //             QUACK(0, s);
	    // //             Runtime.exit(11);
	    // //         }

	    // //  	    assert(blob.transport_msgtype===undefined);
	    // //  	    blob.transport_msgtype = msgtype;

	    // //         _this.onBlob(blob);
	    // //     }
	    // // };
	    // //var result = this.sock.open(this.host, this.port, SCB);

	    var result = this.sock.open4({ type: IO.CONN_SAGUARO, host: this.host, port: this.port }, SCB);
	    if (result.code !== 0) {
		callback(result);
		return;
	    }

	    if (this.skipInit) {
		callback(new AOP.OK(this));
		return;
	    }

	    var initf = function() {
		var result = _this.linkConfig(1, 1, 1, 1, "json", SCB);
		if (result.code != 0) {
		    return result;
		}
		result = _this.logConfig(Logger.getLogLevels(), SCB);
		if (result.code != 0) {
		    return result;
		}
		result = _this.infoCmd(SCB);
		if (result.code != 0) {
		    return result;
		}
		Saguaro.Connection.setConnection(_this);
		result = _this.detectMotes();
		if (result.code !== 0) {
		    return result;
		}
		Saguaro.getSaguaroMotes().forEach(function(mote) { mote.updateState(Sonoran.Mote.ON); });
		return new AOP.OK(_this);
	    };
            this.info = new Saguaro.Info(this, Saguaro.RUN_STATE_RUNNING);
	    var result = this.dispatcher.invokeHalted(initf);
	    if (result.code !== 0) {
		_this.close(function(status) {
		    callback(new AOP.ERR(sprintf("saguaro %s:%d: initial communication setup failed", _this.host, _this.port), result));
		});
	    } else {
		callback(result);
	    }
	},


	/**
	 * @returns {String} string representation of this saguaro connection.
	 * @ignore
	 */
	toString: function() {
            return "sag://" + this.host + ":" + this.port;
	},



	/**
	 * Return manager of sdx files.
	 * @return {Saguaro.SDXManager}
	 * @private
	 */
	getSDXManager: function() {
            return this.sdxManager;
	},
	

	
	/**
	 * Return event log cache.
	 * @return {Saguaro.EvLog}
	 * @private
	 */
	getEvLog: function() {
            return this.evLog;
	},
	

	
	/**
	 * Returns timeout for commands on this connection.
	 * @returns {Number} timeout for commands on this connection.
	 */
	getCommandTimeout: function() {
            return this.commandTimeout;       // + this.maxMoteId*1000;
	},


	/**
	 * Returns last timestamp seen on this connection.
	 * @returns {Number}
	 * @private
	 */
	getLastTimestampAsMicros: function() {
            return this.lastTimestamp/1000;
	},

	
	/**
	 * Return saguaro run state info.
	 * @see Saguaro.RUN_STATE_RUNNING
	 * @see Saguaro.RUN_STATE_HALTED
	 * @returns {Saguaro.Info} saguaro info
	 */
	getInfo: function() {
            return this.info;
	},


	/**
	 * Return saguaro run state info.
	 * @see Saguaro.RUN_STATE_RUNNING
	 * @see Saguaro.RUN_STATE_HALTED
	 * @returns {String} run state ("running" or "halted").
	 */
	getRunState: function() {
	    return this.info.getRunState();
	},


	/**
	 * Return saguaro run mode.
	 * @returns {String} run mode ("logic-time" etc).
	 */
	getRunMode: function() {
	    return this.info.getRunMode();
	},


	/**
	 * Return whether saguaro is in running state (state "running").
	 * @returns {Boolean} whether saguaro is in running state (state "running").
	 */
	isRunning: function() {
	    return this.info.isRunning();
	},

	/**
	 * Set run state and mode.
	 * @param runState
	 * @param runMode    Optional
	 * @param event      Optional
	 * @private
	 */
	setRunState: function(/** String */runState, /** String */runMode, /** Sonoran.Event */event) {
            assert(runState==Saguaro.RUN_STATE_HALTED||runState==Saguaro.RUN_STATE_RUNNING);
            if (!runMode) {
		runMode = this.info.getRunMode();
            }
	    this.prevRunState = this.info.getRunState();
            this.info = new Saguaro.Info(this, runState, runMode, event);
            if (runState===Saguaro.RUN_STATE_RUNNING) {
		var motes = this.getMotes();
		for (var i = 0; i < motes.length; i++) {
                    motes[i].updateBreakState(false);
		}
            } else {
		if (event.mote) {
		    assert(event.mote instanceof Sonoran.Mote);
                    event.mote.updateBreakState(true);
		}
            }
	},

	
	/**
	 * Return all motes on this saguaro connection.
	 * @returns {Sonoran.Mote[]} array of motes
	 */
	getMotes: function() {
            var _this = this;
            return Sonoran.Registry.lookupMotesByFunc(function(mote) {
		return mote.getClass() == 'saguaro' && Saguaro.mote2impl(mote).conn == _this;
            });
	},


	/**
	 * @returns {Sonoran.MoteImpl[]} Array of motes
	 * @private
	 */
	getImpls: function() {
	    return Blob.map(this.sagid2moteImpl);
	},




	/**
	 * Set timeout for commands on this connection.
	 * @param    millis
	 * @private
	 */
	setCommandTimeout: function(/** Number */millis) {
            assert(millis>100);
            this.commandTimeout = millis;
	},


	/**
	 * Return queue of timers.
	 * @returns {Object}
	 * @private
	 */
	getTimerQueue: function() {
            return this.timerq;
	},


	/**
	 * Close this saguaro connection. If already disconnected, this method has no effect.
	 *  @param callback   
	 */
	close: function(/** DFLT_ASYNC_CB */callback) {
	    return this.sock.close(new AOP.OK(), callback);
	},


	/**
	 * Generate saguaro mote address string, i.e. sag://host:port/moteid
	 * @param moteid Mote identifier used in Saguaro process
	 * @private
	 */
	genAddr: function(/** Number */moteid) {
            assert(moteid>=0, "invalid mote id " + moteid);
            return "sag://" + this.host + ":" + this.port + "/" + moteid;
	},


	/**
	 * Return host name.
	 * @returns {String} saguaro hostname.
	 */
	getHostName: function() {
            return this.host;
	},


	/**
	 * return target saguaro port.
	 * @returns {Number} saguaro port.
	 */
	getHostPort: function() {
            return this.port;
	},


	/**
	 * @param host
	 * @param port
	 * @returns {Boolean}
	 */
	connectsTo: function(/** String */host, /** Number */port) {
	    if (!port) { port = Saguaro.DFLT_PORT; }
	    if (!host) { host = Saguaro.DFLT_HOST; }
	    return this.host==host&&this.port==port;
	},

	
	/**
	 * Return next msgid to use in a blob for the saguaro process.
	 * @private
	 */
	getMsgId: function() {
            var id = this.commandId;
            this.commandId += 1;
            return id;
	},


	/**
	 * Return saguaro dispatcher.
	 * @returns {Saguaro.Dispatcher}
	 */
	getDispatcher: function() {
            return this.dispatcher;
	},

	

	/**
	 * Called when connection disappears (underlying socket or library is closed).
	 * @private
	 */
	onClose: function(/** AOP.Result */status) {
            var _this = this;
            QUACK(0, "Saguaro.Connection", sprintf("%s: disconnect with '%s'", this, status));
            Sonoran.Registry.deregisterAddrs(function(mote) { return Saguaro.mote2impl(mote).conn == _this; });
	    Saguaro.Connection.clearConnection();
            this.timerq.onDisconnect();
	},
	
	
	/**
	 * @param state  If true, blob lead to HALT state
	 * @param blob   
	 * @returns {Sonoran.Event}
	 * @private
	 */
	onBlob: function(haltState, blob)  {
	    assert(haltState===true||haltState===false);

            var mote = null;

            if (blob.moteid !== undefined) {
		mote = Saguaro.lookupMote(this, blob.moteid);
		if (mote) {
                    //XXX:eir-why???? delete blob.moteid;
                    blob.mote = mote;
		} else {
                    if (blob.msgtype != Saguaro.MOTE_EVENT) {
			var msg = sprintf("Received message for unknown mote with mote id '%d': %s", blob.moteid, Util.formatData(blob));
			Logger.err(msg);
			QUACK(0, msg);
			return null;
                    } else {
			this.registerMote(blob.moteid, blob.eui64);
                    }
                    return null;
		}
            }

            var event = null;
	    switch(blob.msgtype) {
	    case Saguaro.LOG_EVENT: {
		assert(!blob.srcid);
		//blob.msgtype = Event.LOG;
		delete blob.msgtype;
		blob.module = Saguaro.mapLogModId2Name(blob.module);
		Logger.signal(new Event.Log(blob));
		return null;
            }
	    case Saguaro.LIP_DATA: {
		assert(blob.mote);
		var time = blob.time;
		if (time) { time /= 1000; }
		event = new Sonoran.Event.Media(blob.hostport, mote, blob.lipport, blob.data, time);
		//QUACK(0, "EV: " + event);
		break;
	    }
	    case Saguaro.MEDIA_EVENT: {
		assert(blob.mote, "No moteid field in saguaro MEDIA_EVENT");
		assert(blob.media, "No media field in saguaro MEDIA_EVENT");
		assert(blob.time, "No time field in saguaro MEDIA_EVENT");
		var time = blob.time;
		if (time) { time /= 1000; }
		assert(blob.data && blob.data.length>=19, "Invalid or no data field in saguaro MEDIA_EVENT");
		if (blob.media!=="DNNET") {
		    var msg = "Unknown simulation media type in media event: "+blob.media;
		    QUACK(0, msg);
		    Logger.err(msg);
		    return null;
		}
		var arr = Formatter.unpack("16x2u*d", blob.data);
		var dstipaddr  = arr[0];
		var dstudpport = arr[1];
		var data       = arr[2];
		if( blob.srcport == Dust.UDP_MR_PORT ) {
		    arr = Formatter.unpack("1u*d", data);
		    blob.srcport = arr[0];  // override with Mote Runner port
		    data = arr[1];
		}
		event = new Sonoran.Event.Media(dstudpport, blob.mote, blob.srcport, data, time);
		event.dst = dstipaddr;
		break;
            }
	    case Saguaro.START_EVENT: {
		//QUACK(0, "START-EVENT: " + Util.formatData(blob));
		event = new Sonoran.Event.Saguaro(Sonoran.EV_NAME_START, this, new Saguaro.Info(this, Saguaro.RUN_STATE_RUNNING, blob.runmode, null));
		break;
	    }
	    case Saguaro.HALT_EVENT: {
		//QUACK(0, "PLEASE: replace HALT_EVENT for byUser to GENERIC_EVENT");
		delete blob.event;
		if (blob.category===Sonoran.EV_CAT_HALT && blob.evname===Sonoran.EV_NAME_BYUSER) {
		    blob.msgtype = Sonoran.Event.GENERIC;
		    event = new Sonoran.Event.Generic(blob, this);
		} else {
		    QUACK(0, "Saguaro", "Unsupported halt event: " + Util.formatData(blob));
		    assert(false);
		}
		assert(blob.evname);
		assert(blob.category!==undefined);
		break;
	    }
	    case Saguaro.GENERIC_EVENT: {
		event = new Sonoran.Event.Generic(blob, this);
		break;
	    }
	    case Saguaro.DEBUG_EVENT: {
		event = new Sonoran.Event.Generic(blob, this);
		break;
	    }
	    case Saguaro.MOTE_EVENT: 
	    case Saguaro.UPDATE_EVENT:
	    case Saguaro.JSON_EVENT: 
            default: {
		delete blob.mote;
		QUACK(0, "Saguaro", "ignore unknown packet: " + Util.formatData(blob));
		return null;
            }
	    }

	    assert(event);
	    this.eventListeners.onEvent(event, haltState);

	    var action = this.eventListeners.getAction();
	    if (haltState === true) {  // event brought saguaro into halt state 
		//QUACK(0, "HALT-STATE true: " + event.msgtype + ", continue " + action.continueCmd);
		if (action.continueCmd) {
                    this.dispatcher.continueCmd1(action.mode, action.until, action.contData);
		    //assert(action.suppress===true); not true, saguaro may continue, but event should still be handed out
		} else {
		    assert(action.suppress===false);
		    //QUACK(0, "SET RUN-STATE HALTED");
                    this.setRunState(Saguaro.RUN_STATE_HALTED, blob.runmode, event);
		}
	    }

	    if (blob.msgtype === Saguaro.START_EVENT) {
		if (this.info.hasRunState(Saguaro.RUN_STATE_RUNNING, event.runmode)) {
		    action.suppress = true;
		} else {
		    //QUACK(0, "SET RUN-STATE RUNNING");
		    this.setRunState(Saguaro.RUN_STATE_RUNNING, event.runmode); 
		}	
	    }

	    return action.suppress ? null : event;
	},




	/**
	 * @private
	 */
	instantiateMote: function(/** Number */moteid, /** String */uniqueid, /*** String */name, /** String */type, /** Object */position) {
	    var mote = Sonoran.Registry.lookupMoteByUniqueid(uniqueid);
	    assert(!mote);
	    var impl = this.sagid2moteImpl[moteid];
	    assert(!impl);

	    var addr = this.genAddr(moteid);
	    var mote = new Sonoran.Mote(this, uniqueid, addr, 'saguaro', name, type);

	    impl = new Saguaro.MoteImpl(this, mote, moteid);
	    if (position) {
		mote.position = Blob.copy(position);
	    }
	    mote.setAttribute(Saguaro.IMPL_MOTE_ATTR_NAME, impl);
	    
	    
	    this.sagid2moteImpl[moteid] = impl;
	    //this.moteuid2moteImpl[mote.getUid()] = impl;

	    Sonoran.Registry.registerMote(mote, true);
	    return mote;
	},



	/**
	 * Create and register Mote and MoteImpl. Note that Mote.onRegister is delayed until the
	 * mote is ready, i.e. it has been queried.
	 * @param moteid
	 * @param uniqueid
	 * @private
	 */
	registerMote: function(/** Number */moteid, /** String */uniqueid) {
            assert(typeof(moteid) === 'number');
            assert(typeof(uniqueid) === 'string');
            assert(arguments.length==2);
            var _this = this;

	    var f = function(cb) {
		var mote = _this.instantiateMote(moteid, uniqueid, "unknown", "unknown");
		var impl = Saguaro.mote2impl(mote);
		assert(impl);
		var result = impl.query(SCB);
		if (result.code != 0) {
		    var msg = sprintf("Could not properly install newly detected mote '%s': %s", uniqueid, result.toString());
		    Logger.err(msg);
		}
		mote.onRegister();
		return mote;
	    };
	    var mote = this.dispatcher.invokeHalted(f);
	    return mote;
	},
        
	
	/**
	 * Detect motes when connecting. List motes from saguaro and then query each one.
	 * @returns {AOP.Result}
	 * @private
	 */
	detectMotes:  function() {
            var result = this.listMotes(SCB);
	    if (result.code !== 0) {
		return result;
            }
	    var replies = result.getData().getReplies();
	    var motes = [];
	    for (var i = 0; i < replies.length; i++) {
		var reply = replies[i];
		var mote = this.registerMote(reply.data.moteid, reply.data.eui64);
		motes.push(mote);
	    }
	    return new AOP.OK(motes);
	},

	
	/**
	 * Remove command from queue.
	 * @private
	 */
	removeCommand: function(/** Saguaro.Command */cmd) {
            var msgid = cmd.request.msgid;
            assert(msgid);
            delete this.commands[msgid];
	},


	/**
	 * Remove command from queue.
	 * @private
	 */
	addCommand: function(/** Saguaro.Command */cmd) {
            var msgid = cmd.request.msgid;
            assert(msgid);
            assert(!this.commands[msgid]);
            this.commands[msgid] = cmd;
	},


	/**
	 * Return the event listeners manager allowing to register for saguaro events.
	 * @returns {Saguaro.Connection.EventListeners}
	 */
	getEventListeners: function() {
            return this.eventListeners;
	},


	/**
	 * Create json structure to send to saguaro for a controller command.
	 * @param cmd   command name
	 * @param args  command parameters
	 * @returns {Object} data to send to saguaro for a controller command
	 * @private
	 */
	getControllerRq: function(/** String */cmd, /** Blob */args) {
            return {
		msgid:   this.getMsgId(),
		msgtype: Saguaro.CONTROLLER_CMD,
		cmd:     cmd,
		args:    args
            };
	},
	
	/**
	 * Create controller command ready to be issued.
	 * @param cmd   command name
	 * @param args  command parameters
	 * @return {Saguaro.Command} command ready to be issued
	 * @private
	 */
	getControllerCmd: function(/** String */cmd, /** Blob */args) {
            var request = this.getControllerRq(cmd, args);
            var command = new Saguaro.Command(this, this.getCommandTimeout(), request);
            return command;
	},

	/**
	 * Create mote command ready to be issued.
	 * @param dst       Mote id or 0 (for all motes) or array of mote ids
	 * @param cmd       Command name
	 * @param args      Command args (added to args field in json structure)
	 * @param extra     Optional, extra parameters (added at top-level to json structore)
	 * @param timeout   Optional, timeout for command to return
	 * @return {Saguaro.Command} command ready to be issued
	 * @private
	 */
	getMoteCmd: function(/** Number|Number[] */dst, /** String */cmd, /** Blob */args, /** Object */extra, /** Number */timeout) {
            if (!timeout) {
		timeout = this.getCommandTimeout();
            }
            var request = this.getMoteRq(dst, cmd, args, extra);
            var command = new Saguaro.Command(this, timeout, request);
            return command;
	},



	/**
	 * Create mote send-lip or media-send command ready to be issued.
	 * @param dst       Mote id or 0 (for all motes)
	 * @param cmd       Command name
	 * @param args      Command args (added to args field in json structure)
	 * @param extra     Optional, extra parameters (added at top-level to json structore)
	 * @param timeout   Optional, timeout for command to return
	 * @return {Saguaro.Command} command ready to be issued
	 * @private
	 */
	getMediaSendCmd: function(/** Sonoran.Saguaro.Mote */dst, /** Number */dstport, /** Number */srcport, /** String */data, /** Object */extra, /** Number */timeout) {
            if (!timeout) { timeout = this.getCommandTimeout(); }
	    var dstid = dst.moteid; 
	    var cmd, args, port;
	    if (dst.mote.type===Saguaro.DUST_TYPE) {
		cmd = 'media-send';
		if( dstport < 256 ) {
		    var mrport = Dust!=null && Dust.UDP_MR_PORT ? Dust.UDP_MR_PORT : 0;
		    port = Formatter.pack("2u1u", mrport, dstport);
		} else {
		    if( dstport >= 0x10000 )
			dstport -= 0x10000;
		    port = Formatter.pack("2u", dstport);
		}
		args = {
		    data:    Saguaro.IPv6ADDR_LINK_LOCAL_ALL_ROUTERS + port + data,
		    srcport: srcport,
		    media:   "DNNET"
		};
	    } else {
		cmd = 'send-lip';
		args = { lipport: dstport, hostport: srcport, data: data };
	    }
            var request = this.getMoteRq(dstid, cmd, args, extra);
            var command = new Saguaro.Command(this, timeout, request);
            return command;
	},

	
	/**
	 * Create mote media-send command ready to be issued.
	 * @param dst       Mote receiving the media event
	 * @param blob      Fields copied to media blob
	 * @param timeout   Optional, timeout for command to return
	 * @return {Saguaro.Command} command ready to be issued
	 * @private
	 */
	getMediaSendBlobCmd: function(/** Sonoran.Saguaro.Mote|Sonoran.Saguaro.Mote[] */dst, /** Object */blob, /** Number */timeout) {
            if (!timeout) { timeout = this.getCommandTimeout(); }
	    var dstid = dst.moteid; 
            if( dst instanceof Array ) {
		dstid = [];
		for( var i=0; i<dst.length; i++ )
		    dstid[i] = dst[i].moteid;
	    } else {
		dstid = dst.moteid; 
	    }
            var request = this.getMoteRq(dstid, 'media-send', blob, null);
            var command = new Saguaro.Command(this, timeout, request);
            return command;
	},

	
	/**
	 * Create json structure to send to saguaro for a controller command.
	 * @param dst       Mote id or 0 (for all motes) or array of mote ids
	 * @param cmd       Command name
	 * @param args      Command args (added to args field in json structure)
	 * @param extra     Optional, extra parameters (added at top-level to json structore)
	 * @param timeout   Optional, timeout for command to return
	 * @returns {Object} data to send to saguaro for a controller command
	 * @private
	 */
	getMoteRq: function(/** Number|Number[] */dst, /** String */cmd, /** Blob */args, /** Object */extra) {
            assert(dst!==undefined&&dst!==null);
            assert(typeof(dst)==='number'||dst instanceof Array);
            var rq = {
		msgid:   this.getMsgId(),
		msgtype: Saguaro.MOTE_CMD,
		cmd:     cmd,
		args:    args,
		dst:     (dst == -1) ? null : dst
            };
            if (extra) {
		for (var k in extra) {
	            assert(!rq[k]);
	            rq[k] = extra[k];
		}
            }
            return rq;
	},

	/**
	 * Create json structure to send to saguaro for a controller command.
	 * @param dst     Mote id or 0
	 * @param device  Name of device
	 * @param cmd     Command name
	 * @param args   Command arguments
	 * @returns {Object} data to send to saguaro for a controller command
	 * @private
	 */
	getDeviceRq: function(/** Number */dst, /** String */device, /** String */cmd, /** Blob */args) {
            assert(dst!==undefined&&dst!==null);
            assert(typeof(dst)==='number');
            assert(typeof(device)==='string');
            return {
		msgid:   this.getMsgId(),
		msgtype: Saguaro.MOTE_CMD,
		cmd:     cmd,
		args:    args,
		dst:     (dst == -1) ? null : dst,
		device:  device
            };
	},

	/**
	 * Return device command ready to be issued.
	 * @param dst     Mote id or 0
	 * @param device  Name of device
	 * @param cmd     Command name
	 * @param args   Command arguments
	 * @returns {Saguaro.Command}
	 * @private
	 */
	getDeviceCmd: function(/** Number */dst, /** String */device, /** String */cmd, /** Blob */args) {
            var request = this.getDeviceRq(dst, device, cmd, args);
            var command = new Saguaro.Command(this, this.getCommandTimeout(), request);
            return command;
	},
	
	/**
	 * Issue controller command.
	 * @param cmd       Command name
	 * @param args      Added to 'args' property in request json data
	 * @param evaluator If non-null, a function called before the callback is invoked which can inspect/change the result
	 * @param callback  
	 * @returns {Saguaro.Response}
	 * @throws {AOP.Exception}
	 * @private  
	 */
	issueControllerCommand: function(/** String */cmd, /** Blob */args, /** Function */evaluator, /** DFLT_ASYNC_CB */callback) {
            var command = this.getControllerCmd(cmd, args);
            return command.issue4(evaluator, callback);
	},


	/**
	 * Issue mote command.
	 * @param cmd       Command name
	 * @param args      Added to 'args' property in request json data
	 * @param dst       Mote id (0 for all)
	 * @param timeout   If not 0, timeout in milliseconds for the command to complete
	 * @param evaluator If non-null, a function called before the callback is invoked which can inspect/change the result
	 * @param callback  
	 * @returns {Saguaro.Response}
	 * @throws {AOP.Exception}
	 * @private  
	 */
	issueMoteCommand: function(/** String */cmd, /** Blob */args, /** Number */dst, /** Number */timeout, /** Function */evaluator, /** DFLT_ASYNC_CB */callback) {
            var command = this.getMoteCmd(dst, cmd, args, undefined, timeout);
            return command.issue4(evaluator, callback);
	},


	/**
	 * Issue a device-specific mote command.
	 * @param cmd       Command name
	 * @param device    Name of device
	 * @param args      Added to 'args' property in request json data
	 * @param dst       Mote id (0 for all)
	 * @param evaluator If non-null, a function called before the callback is invoked which can inspect/change the result
	 * @param callback  
	 * @returns {Saguaro.Response}
	 * @throws {AOP.Exception}
	 * @private  
	 */
	issueMoteDeviceCommand: function(/** String */cmd, /** String */device, /** Blob */args, /** Number */dst, /** Function */evaluator, /** DFLT_ASYNC_CB */callback) {
            var command = this.getDeviceCmd(dst, device, cmd, args);
            return command.issue4(evaluator, callback);
	},


	/**
	 * Quit saguaro process. Throws exception if process could not be quit.
	 * @param {function} callback      callback function.
	 * @throws {AOP.Exception} 
	 */
	exit: function(callback) {
	    if (BC.is(callback)) { return BC.exec(arguments.callee, this, arguments); }
	    var timer;
	    var _this = this;
	    var closef = function(result) {
		if (timer) {
		    timer.cancel();
		    timer = null;
		}
		if (listenerf) {
		    Sonoran.Registry.removeObserver(listenerf);
		    listenerf = null;
		}
		callback(result);
	    };
	    var timerf = function() {
		closef(new AOP.ERR("Exiting saguaro process with exit command failed"));
	    };
	    var listenerf = function(ev) {
		if (ev.category===Sonoran.EV_CAT_SAGUARO && ev.evname===Sonoran.EV_NAME_DISCONNECT && ev.conn===_this) {
		    closef(new AOP.OK());
		}
	    };
	    Sonoran.Registry.addObserver(listenerf);

	    timer = new Timer.Timer(3000, null, timerf);
	    timer.start();
	    var cmd = this.getControllerCmd("exit", null);
            try {
		this.transmit(cmd.request);
            } catch (x) {
		closef(Ex2ERR(ERR_GENERIC, x, "Could not transmit saguaro exit command"));
            }
	},


	/**
	 * Configure the saguaro connection.
	 *  @param log                      0|1, receive log messages.
	 *  @param debug                    0|1, receive debug messages.
	 *  @param update                   0|1, receive update messages.
	 *  @param media                    0|1, receive media messages.
	 *  @param outfmt                   "text"|"json"
	 * @returns {Saguaro.Response}
	 * @throws {AOP.Exception}
	 * @private
	 */
	linkConfig: function(/** Number */log, /** Number */debug, /** Number */update, /** Number */media, /** String */outfmt, /** DFLT_ASYNC_CB */callback) {
	    if (BC.is(callback)) { return BC.exec(arguments.callee, this, arguments); }
            var args = { log: log, debug: debug, update: update, media: media, outfmt: outfmt };
            return this.getControllerCmd("link-config", args).issue1(callback);
	},


	/**
	 * Configure the saguaro logger. Any module name which is not valid for a saguaro process is ignored.
	 *  @param logDescrs    Array of alternating module name and severity number or an object mapping module name to severity number
	 *  @param callback                 
	 * @returns {Saguaro.Response}
	 * @throws {AOP.Exception}
	 * @see Logger#setLogLevels
	 */
	logConfig: function(/** Array|Object */loglevels, /** DFLT_ASYNC_CB */callback) {
	    if (BC.is(callback)) { return BC.exec(arguments.callee, this, arguments); }
	    var levels = [];
	    var module, severity;
            if (loglevels instanceof Array) {
		for (var i = 0; i < loglevels.length; i += 2) {
                    module = loglevels[i];
                    severity = Logger.severity2string(loglevels[i+1]);
                    if (Saguaro.mapLogModName2Id(module)>=0) {
			levels.push(module);
			levels.push(severity);
                    }
		}
            } else {
		for (module in loglevels) {
                    severity = Logger.severity2string(loglevels[module]);
                    if (Saguaro.mapLogModName2Id(module)>=0) {
			levels.push(module);
			levels.push(severity);
                    }
		}
            }
            return this.getControllerCmd("log-config", { loglevels: levels }).issue1(callback);
	},


	/**
	 * Query event log.
	 * @param start   event start index or null if oldest logged event
	 * @param end     event end index or null if newest logged event
	 * @param num     number of event to retrieve
	 * @param callback                 
	 * @returns {Saguaro.Response}
	 * @throws {AOP.Exception}
	 * @private
	 */
	evList: function(/** Number */start, /** Number */end, /** Number */num, /** DFLT_ASYNC_CB */callback) {
            return this.getControllerCmd("ev-list", {start:start,end:end,num:num}).issue1(callback);
	},

	/**
	 * Configure events
	 * @param moteids
	 * @param defs    
	 * @param callback                 
	 * @returns {Saguaro.Response}
	 * @throws {AOP.Exception}
	 * @private
	 */
	evConfig: function(/** Number|Number[] */moteids, /** String[] */defs, /** DFLT_ASYNC_CB */callback) {
            return this.getMoteCmd(moteids, "ev-config", defs).issue1(callback);
	},



	/**
	 * Load a dll int the saguaro process.
	 * @param name                     DLL name
	 * @param callback                 
	 * @returns {Saguaro.Response}
	 * @throws {AOP.Exception}
	 * @private
	 */
	loadDll: function(/** String */name, /** DFLT_ASYNC_CB */callback) {
            return this.getControllerCmd("load-dll", name).issue1(callback);
	},


	/**
	 * Create motes. Do not use this low-level function, but Sonoran.createMote to create properly initialized
	 * motes.
	 * @see Sonoran#createMote
	 * @param dll                      DLL id.
	 * @param num                      Number of motes, optional, default 1.
	 * @param param                    Additonal parameters for mote-create command or null
	 * @param eui64                    Uniqueid
	 * @param callback
	 * @returns {Saguaro.Response}
	 * @throws {AOP.Exception}
	 * @see Sonoran#createMote
	 * @private
	 */
	createMotes: function(/** Number */dll, /** Number */num, /** Object */param, /** String */eui64, /** DFLT_ASYNC_CB */callback) {
            var args = { param: param||null, num: num||1, dll: dll };
            if (eui64) {
		args.uniqueid = Util.UUID.eui642hex(eui64);
            }
            return this.getControllerCmd("mote-create", args).issue1(callback);
	},


	/**
	 * Mote list.
	 * @param moteid        Moteid (0..n) or -1 (all motes)
	 * @param callback                 
	 * @returns {Saguaro.Response}
	 * @throws {AOP.Exception}
	 * @private
	 */
	moteList: function(/** Number */moteid, /** DFLT_ASYNC_CB */callback) {
            return this.getMoteCmd(moteid, "mote-list").issue1(callback);
	},


	/**
	 * Mote local time.
	 * @param moteid        Moteid (0..n) or -1 (all motes)
	 * @param callback                 
	 * @returns {Saguaro.Response}
	 * @throws {AOP.Exception}
	 * @private
	 */
	moteTime: function(/** Number */moteid, /** DFLT_ASYNC_CB */callback) {
            return this.getMoteCmd(moteid, "mote-time").issue1(callback);
	},


	/**
	 * List motes. The saguaro replies contain the following properties:
	 * <ul>
	 * <li>moteid</li>
	 * <li>name</li>
	 * <li>cpumode</li>
	 * <li>moteclass: object with properties id, moteclass, dllname</li>
	 * </ul>
	 * @param callback                 
	 * @returns {Saguaro.Response}
	 * @throws {AOP.Exception}
	 * @private
	 */
	listMotes: function(/** DFLT_ASYNC_CB */callback) {
            return this.getMoteCmd(-1, "mote-list").issue1(callback);
	},


	/**
	 * Argv command.
	 * @param argv           Argv command line
	 * @param callback                 
	 * @returns {Saguaro.Response}
	 * @throws {AOP.Exception}
	 */
	argvCmd: function(/** String[] */argv, /** DFLT_ASYNC_CB */callback) {
            return this.getControllerCmd("argv", argv).issue1(callback);
	},


	/**
	 * 'break-info' command. Returns information about break conditions.
	 *  @param dst           Mote id, -1 for all
	 * @param callback                 
	 * @returns {Saguaro.Response}
	 * @throws {AOP.Exception}
	 * @see Bugz
	 * @private
	 */
	breakInfo: function(/** Number */moteid, /** DFLT_ASYNC_CB */callback) {
            return this.getMoteCmd(moteid, "break-info").issue1(callback);
	},



	/**
	 * 'break-point' command. Retrieve list of breakpoints. 
	 * @param dst               Mote id, -1 for all
	 * @param @param callback                 
	 * @returns {Saguaro.Response}
	 * @throws {AOP.Exception}
	 * @see Bugz
	 * @private
	 */
	breakPointList: function(/** Number */moteid, /** DFLT_ASYNC_CB */callback) {
            return this.getMoteCmd(moteid, "break-point").issue1(callback);
	},


	/**
	 * 'break-point' command. Set a breakpoint.
	 * @param moteid        Mote id, -1 for all
	 * @param breakid       Breakpoint id
	 * @param locspec       Location specification
	 * @param callback                 
	 * @returns {Saguaro.Response}
	 * @throws {AOP.Exception}
	 * @see Bugz
	 * @private
	 */
	breakPointSet: function(/** Number */moteid, /**Number */breakid, /** String */locspec, /** DFLT_ASYNC_CB */callback) {
            var args = {
		breakid: breakid,
		at:locspec
            };
            return this.getMoteCmd(moteid, "break-point", args).issue1(callback);
	},
	
	
	/**
	 * 'break-point' command. Delete a breakpoint.
	 * @param moteid        Mote id, -1 for all
	 * @param breakid       Breakpoint id
	 *  @param callback                 
	 * @returns {Saguaro.Response}
	 * @throws {AOP.Exception}
	 * @see Bugz
	 * @private
	 */
	breakPointDel: function(/** Number */moteid, /** Number */breakid, /** DFLT_ASYNC_CB */callback) {
            var args = {};
            args['breakid'] = breakid;
            args['delete'] = breakid;
            return this.getMoteCmd(moteid, "break-point", args).issue1(callback);
	},
	

	/**
	 * Time command.
	 *  @param callback                 
	 * @returns {Saguaro.Response}
	 * @throws {AOP.Exception}
	 * @private
	 */
	timeCmd: function(/** DFLT_ASYNC_CB */callback) {
            return this.getControllerCmd("time").issue1(callback);
	},


	/**
	 * Halt saguaro process. Calls SaguaroDispatcher.
	 * @see SaguaroDispatcher#haltCmd
	 */
	haltCmd: function(/** DFLT_ASYNC_CB */callback) {
	    return this.dispatcher.haltCmd2(callback);
	},



	/**
	 * Issue continue-command to saguaro process.
	 * @param mode      'real-time'/'logic-time' to switch run mode, null to leave unchanged
	 * @param until     Leave null
	 * @param contData  Expression datat or null
	 * @param callback
	 * @see SaguaroDispatcher#continueCmd
	 */
	continueCmd:  function(/** String */mode, /** Number */until, /** Object */contData, /** DFLT_ASYNC_CB */callback) {
	    return this.dispatcher.continueCmd2(mode, until, contData, callback);
	},



	/**
	 * 'set-halt-at' command. Used by timer queue.
	 * @param until         Run until this deadline (absolute time in nanos) and then halt saguaro.
	 *  @param callback                 
	 * @returns {Saguaro.Response}
	 * @throws {AOP.Exception}
	 * @private
	 */
	setHaltAtCmd: function(/**Number*/until, /** DFLT_ASYNC_CB */callback) {
            assert(until!==undefined);
            var params = {
		until: until,
		timeout: 0
            };
	    //println("setHaltAtCmd: until " + until);
            return this.getControllerCmd("set-halt-at", params).issue1(callback);
	},

	
	/**
	 * Issue info command to saguaro process.
	 * @param callback      
	 * @returns {Saguaro.Info} Saguaro state information
	 * @throws {AOP.Exception}
	 */
	infoCmd: function(/** DFLT_ASYNC_CB */callback) {
	    if (BC.is(callback)) { return BC.exec(arguments.callee, this, arguments); }
            var _this = this;
            var evaluator = function(status) {
		if (status.code==0) {
		    var data = status.getData().getReplyData();
                    var state = data.state;
                    var runmode = data.runmode;
		    var reason = data.reason;
                    var haltev;
                    if (reason) {
			reason.mote = null;
			if (reason.moteid!==undefined) {
			    var impl = _this.sagid2moteImpl[reason.moteid]; // might be null
			    reason.mote = impl ? impl.mote : null;
			    delete reason['moteid'];
			}
			reason.runmode = runmode;
			haltev = new Sonoran.Event.Generic(reason, _this);
                    }
                    var info = new Saguaro.Info(_this, state, runmode, haltev);
                    _this.setRunState(state, runmode, haltev);
                    status = new AOP.OK(info);
		}
		return status;
            };
            return this.getControllerCmd("info").issue4(evaluator, callback);
	},


	/**
	 * SDX load command.
	 * @param filename
	 * @param callback      
	 * @returns {Saguaro.Response}
	 * @throws {AOP.Exception}
	 * @see Saguaro.SDXManager
	 * @private
	 */
	sdxLoad: function(/** String */filename, /** DFLT_ASYNC_CB */callback) {
            var args = { sdxfile: filename };
            return this.getControllerCmd("sdx-load", args).issue1(callback);
	},


	/**
	 * SDX lines command. 
	 * @param asmIdentity
	 * @param filename
	 * @param lineno
	 * @param endline
	 * @param around
	 * @param callback      
	 * @returns {Saguaro.Response}
	 * @throws {AOP.Exception}
	 * @see Saguaro.SDXManager
	 * @private
	 */
	sdxLines: function(/** String */asmIdentity, /** String */filename, /** Number */lineno, /** Number */endline, /** Number */around, /** DFLT_ASYNC_CB */callback) {
            var args = {
		asmIdentity: asmIdentity,
		filename: filename,
		lineno: lineno,
		endline: endline?endline:-1,
		around: around
            };
            return this.getControllerCmd("sdx-lines", args).issue1(callback);
	},

	/**
	 * SDX map command.
	 * @param asmName    Optional
	 * @param filename   Optional
	 * @param filename   Optional
	 * @param callback      Callback function.
	 * @returns {Saguaro.CommandOK} a Saguaro.CommandOK instance on callback invocation
	 * @see Saguaro.SDXManager
	 * @private
	 */
	sdxMap: function(/** Sonoran.AsmName */asmName, /** String */filename, /** Number */lineno, /** DFLT_ASYNC_CB */callback) {
            var asmIdentity = asmName ? asmName.toString() : null;
            filename = filename||null;
            lineno = lineno||0;
            var args = { asmIdentity: asmIdentity, filename: filename, line:lineno };
            return this.getControllerCmd("sdx-map", args).issue1(callback);
	},


	/**
	 * SDX class command.
	 * @param classname    Class name
	 * @param asmIdentity  Assembly identity, might be null
	 * @param callback      
	 * @returns {Saguaro.Response}
	 * @throws {AOP.Exception}
	 * @private
	 */
	sdxClass: function(/** String */classname, /** String */asmIdentity, /** DFLT_ASYNC_CB */callback) {
            var args = { classname: classname };
            if (asmIdentity) {
		args.asmIdentity = asmIdentity;
            }
            return this.getControllerCmd("sdx-class", args).issue1(callback);
	},


	/**
	 * 'inspect-stack' command.
	 * @param moteid                   Mote id, -1 for all
	 *  @param callback      Callback function.
	 * @returns {Saguaro.CommandOK} a Saguaro.CommandOK on callback invocation
	 * @private
	 */
	inspectVMStack: function(/** Number */moteid, /** DFLT_ASYNC_CB */callback) {
            return this.getMoteCmd(moteid, "inspect-vmstack").issue1(callback);
	},


	/**
	 * 'inspect-resources' command.
	 * @param moteid                   Mote id, -1 for all
	 *  @param callback                 
	 * @returns {Saguaro.Response}
	 * @throws {AOP.Exception}
	 * @see Saguaro.MoteImpl.inspectResources
	 * @private
	 */
	inspectResources: function(/** Number */moteid, /** DFLT_ASYNC_CB */callback) {
            return this.getMoteCmd(moteid, "inspect-resources").issue1(callback);
	},


	/**
	 * 'set-device-state' command.
	 *  @param moteid                   Moteid, -1 for all
	 *  @param devname                  Device name
	 *  @param args                     Value to be set
	 *  @param callback
	 * @returns {Saguaro.Response}
	 * @throws {AOP.Exception}
	 * @see Saguaro.Device
	 * @private
	 */
	setDeviceState: function(/** Number */moteid, /** String */devname, /** Blob */args, /** DFLT_ASYNC_CB */callback) {
            return this.getDeviceCmd(moteid, devname, "device-set-state", args).issue1(callback);
	},


	/**
	 * 'device-report-update' command.
	 *  @param moteid                   Moteid, -1 for all
	 *  @param devname                  Device name
	 *  @param args                     1 enable, 0 disable
	 *  @param callback
	 * @returns {Saguaro.Response}
	 * @throws {AOP.Exception}
	 * @see Saguaro.Device
	 * @private
	 */
	reportDeviceUpdates: function(/** Number */moteid, /** String */devname, /** Number */args, /** DFLT_ASYNC_CB */callback) {
            return this.getDeviceCmd(moteid, devname, "device-report-updates", args).issue1(callback);
	},


	/**
	 * Reset mote.
	 *  @param moteid                   Moteid, -1 for all
	 *  @param mode                     Must be 'cold', 'warm', 'bod' or 'err' or null (default: cold)
	 *  @param callback
	 * @returns {Saguaro.Response}
	 * @throws {AOP.Exception}
	 * @see Sonoran.Mote.reset
	 * @private
	 */
	resetMotes: function(/** Number */moteid, /** String */mode, /** DFLT_ASYNC_CB */callback) {
            mode = mode?mode:'cold';
            assert(mode=='cold'||mode=='warm'||mode=='bod'||mode=='err');
            return this.getMoteCmd(moteid, "mote-reset", mode).issue1(callback);
	},


	/**
	 * Sleep until specified number of micros have elapsed in the simulation.
	 * @param mote
	 * @param micros
	 * @param callback
	 * @throws {AOP.Exception|Timer.Exception}
	 */
	sleepOn: function(/** Sonoran.Mote */mote, /** Number */micros, /** DFLT_ASYNC_CB */callback) {
	    if (BC.is(callback)) { return BC.exec(arguments.callee, this, arguments); }
            var timer = new Timer.Timer(Saguaro.Timer.nanos2Span(micros*1000, this));
            return timer.start(callback);
	},

	
	/**
	 * Mote has been deregistered.
	 */
	onDeregister: function(/** Sonoran.Mote */mote) {
	    Saguaro.mote2impl(mote).onDeregister();
	},


	/**
	 * Reset mote.	
	 * @param mote
	 * @param timeout
	 * @param mode
	 */
	reset: function(/** Sonoran.Mote */mote, /** Number */timeout, /** String */mode, /** DFLT_ASYNC_CB */callback) {
	    return Saguaro.mote2impl(mote).reset(timeout, mode, callback);
	},


	
	
	/**
	 * Send lip message.
	 * @param dst                          Destination mote.
	 * @param dstport                      Destination port.
	 * @param srcport                      Source port.
	 * @param data                         Binary data
	 * @param timer                        Optional
	 * @private
	 */
	send: function(/** Sonoran.Saguaro.Mote */dst, /** Number */dstport, /** Number */srcport, /** String */data, /** Timer.Timer|Timer.Timer[] */timer) {
	    if (dst instanceof Sonoran.Mote) {
		dst = Saguaro.mote2impl(dst);
	    }
	    
            if (!timer) {
		this.getMediaSendCmd(dst, dstport, srcport, data).issue4(null,  function(result) {
		    if (result.code != 0) {
			var msg = "Saguaro.Connection.send: invoking 'send-lip' failed: " + result;
			QUACK(0, msg);
			Logger.err(msg);
			return;
		    }
		});
		return;
            }

            if (timer instanceof Timer.Timer) {
		timer = [ timer ];
            }

            var queue = this.timerq;

            var timers = [];
            for (var i = 0; i < timer.length; i++) {
		var t = timer[i];
		if (t.isQueued()) {
                    throw sprintf("Saguaro.Connection.send: timer is already queued: %s", t);
		} else if (t.hasExpired()) {
                    throw sprintf("Saguaro.Connection.send: timer is already expired: %s", t);
		} else if (t.getQueue() != queue) {
                    throw sprintf("Saguaro.Connection.send: timer has been created for different connection: %s", t);
		} else {
                    assert(t.getQueue() instanceof Saguaro.Timer.Queue, "Invalid system clock based timer used on simulated mote");
                    timers.push(t);
		}
            }
            
            queue.send(dst, dstport, srcport, data, timers);
	},


	/**
	 * Send media blob to mote.
	 * @param dst                          Destination mote.
	 * @param blob                         Fields of the media blob
	 * @param timer                        Optional
	 * @private
	 */
	sendMedia: function(/** Sonoran.Saguaro.Mote */dst, /** Blob */blob, /** Timer.Timer|Timer.Timer[] */timer) {
            if (!timer) {
		this.getMediaSendBlobCmd(dst, blob).issue4(null,  function(result) {
		    if (result.code != 0) {
			var msg = "Saguaro.Connection.sendMedia: invoking 'media-send' failed: " + result;
			Logger.err(msg);
			return;
		    }
		});
		return;
            }

            if (timer instanceof Timer.Timer) {
		timer = [ timer ];
            }

            var queue = this.timerq;

            var timers = [];
            for (var i = 0; i < timer.length; i++) {
		var t = timer[i];
		if (t.isQueued()) {
                    throw sprintf("Saguaro.Connection.sendMedia: timer is already queued: %s", t);
		} else if (t.hasExpired()) {
                    throw sprintf("Saguaro.Connection.sendMedia: timer is already expired: %s", t);
		} else if (t.getQueue() != queue) {
                    throw sprintf("Saguaro.Connection.sendMedia: timer has been created for different connection: %s", t);
		} else {
                    assert(t.getQueue() instanceof Saguaro.Timer.Queue, "Invalid system clock based timer used on simulated mote");
                    timers.push(t);
		}
            }
            
            queue.send(dst, blob, timers);
	},


	/**
	 * @param blob
	 * @private
	 */
	transmit: function(/** Object */blob, /** Number */transmitMsgtype) {
            if (QUACK_LEVEL >= 1) {
		QUACK(1, "SON -> SAG", Util.formatData(blob));
            }
            if (Logger.logs(Logger.EVENTS, Logger.DEBUG)) {
		Logger.log(Logger.DEBUG, Logger.EVENTS, "SON -> SAG: " + Util.formatData(blob));
            }
	    var s, l, p;
            try {
		s = JSON.stringify(blob);
		l = s.length;
		//p = "\0\1\0\1" + 
		if (!transmitMsgtype) {
		    transmitMsgtype = 0;
		}
		p = Formatter.pack("1u1u1u1u4u", transmitMsgtype, 1, 0, 1, (l+1)) + s + "\0";
		this.sock.send(p);   
            } catch (x) {
		var msg = sprintf("Sending saguaro packet failed: '%s'\n%s\n-->\n%s: %s", x, Util.formatData(blob), l, s);
		//QUACK(0, msg);
		throw msg;
            }
	}
    },
    /**
     * @lends Saguaro.Connection
     */
    {
	_unmarshal: function(obj) {
	    var host = obj.host;
	    assert(host);
	    var port = obj.port;
	    assert(port);
	    //var conn = Saguaro.Connections.lookupByHostPort(host, port);
	    var conn = Saguaro.Connection.getConnection();
	    assert(conn);
	    return conn;
	},

	/**
	 * @type Saguaro.Connection
	 * @private
	 */
	conn: null,

	/**
	 * @returns Saguaro.Connection
	 */
	getConnection: function() {
	    return Saguaro.Connection.conn;
	},

	/**
	 * @returns Saguaro.Connection[]
	 * @private
	 */
	getConnections: function() {
	    var conn = Saguaro.Connection.conn;
	    return conn ? [ conn ] : [];
	},


	/**
	 * @param conn
	 * @private
	 */
	setConnection: function(/** Saguaro.Connection */conn) {
	    assert(Saguaro.Connection.conn==null);
	    Saguaro.Connection.conn = conn;
	    Sonoran.Registry.signalEvent(new Sonoran.Event.Saguaro(Sonoran.EV_NAME_CONNECT, conn, conn.getInfo()));
	},

	/**
	 * @private
	 */
	clearConnection: function() {
	    var conn = Saguaro.Connection.conn;
	    if (conn != null) {
		Saguaro.Connection.conn = null;
		Sonoran.Registry.signalEvent(new Sonoran.Event.Saguaro(Sonoran.EV_NAME_DISCONNECT, conn, null));
	    }
	}

    }
);






	




/**
 * Loads sdx files and caches information about successful loads.
 * @class
 * @private
 */
Saguaro.SDXManager = function(conn) {
    /**
     * @type Saguaro.Connection
     * @private
     */
    this.conn = conn;
    /**
     * Map of string to Saguaro.SDXFile
     * @type Object
     * @private
     */
    this.asmIdentity2sdxFile = {};
};


/** @private */
Saguaro.SDXManager.prototype = {
    /**
     * Returns all sdx files available for specified asm name filter.
     * @param asmFilter
     * @returns {Saguaro.SDXManager.SDXFile[]}
     * @private
     */
    getSDXFilesForAsmFilter: function(/** Sonoran.AsmName */asmFilter) {
        var ret = [];
        for (var asmIdentity in this.asmIdentity2sdxFile) {
            var sdxFile = this.asmIdentity2sdxFile[asmIdentity];
            var asmName = new Sonoran.AsmName(sdxFile.asmIdentity);
            if (asmFilter.match(asmName)) {
                ret.push(sdxFile);
            }
        }
        return ret;
    },

    /**
     * Returns sdx file info for a specified assembly identity.
     * @param asmIdentity
     * @returns {Saguaro.SDXManager.SDXFile}
     * @private
     */
    getSDXFileForAsmIdentity: function(/** String */asmIdentity) {
        var sdxFile = this.asmIdentity2sdxFile[asmIdentity];
        if (!sdxFile) {
            sdxFile = new Saguaro.SDXManager.SDXFile(this, asmIdentity);
            this.asmIdentity2sdxFile[asmIdentity] = sdxFile;
        }
        return sdxFile;
    },
    
    /**
     * Load sdx for specified asssembly and from specified file.
     * @param asmIdentity
     * @param filename
     * @returns {Saguaro.SDXManager.SDXFile}
     * @private
     */
    loadSDXForAsmIdentityAndFilename: function(asmIdentity, filename) {
        assert(filename);
        var sdxFile = this.getSDXFileForAsmIdentity(asmIdentity);
        if (sdxFile.sdxState >= 0) {
            return sdxFile;
        }
        sdxFile.sdxState = 0;

        return this.loadFile(asmIdentity, filename);
    },


    /**
     * Load sdx for specified asssembly by searching the filesystem. 
     * @param asmIdentity
     * @param paths        Optional, array of search paths
     * @returns {Saguaro.SDXManager.SDXFile}
     * @private
     */
    loadSDXForAsmIdentity: function(asmIdentity, paths) {
        var sdxFile = this.getSDXFileForAsmIdentity(asmIdentity);
        if (sdxFile.sdxState >= 0) {
            return sdxFile;
        }
        sdxFile.sdxState = 0;

	if (!paths) {
            paths = [];
            var dir = REPO_ROOT + '/src';
            if (/^saguaro\-system\-\d+\.\d+\.\d+/.test(asmIdentity) && IO.File.exists(dir)) { 
		paths.push(dir+"/***");
	    }
            paths.push(Sonoran.Resource.getGACDir());
            paths.push(IO.File.getcwd()+"/***");
	}
        
        var arr = Sonoran.Resource.Assembly.getSDXs(paths, new Sonoran.AsmName(asmIdentity));
        var files = arr[0];
        if (files.length == 0) {
            return sdxFile;
        }

        return this.loadFile(asmIdentity, files[0]);
    },


    /**
     * Load sdx from an assembly resource. The sdx file is expected to be next to the
     * sba file in the filesystem
     * @param asmRes
     * @returns {Saguaro.SDXManager.SDXFile}
     * @private
     */
    loadSDXForAsmResource: function(/** Sonoran.Resource.Assembly */asmRes) {
        var asmIdentity = asmRes.identity;
        var sdxFile = this.getSDXFileForAsmIdentity(asmIdentity);
        if (sdxFile.sdxState >= 0) {
            return sdxFile;
        }
        sdxFile.sdxState = 0;

        var sdxPath = asmRes.getSDXPath();
        if (sdxPath == null) {
            return sdxFile;
        }
        
        return this.loadFile(asmIdentity, sdxPath);
    },


    /**
     * Internal function.
     * @param asmIdentity
     * @param filename 
     * @returns {Saguaro.SDXManager.SDXFile}
     * @private
     */
    loadFile: function(asmIdentity, filename) {
        var sdxFile = this.getSDXFileForAsmIdentity(asmIdentity);
        sdxFile.sdxState = 0;

        this.loadFiles(filename);

        return sdxFile;
    },


    /**
     * Internal function.
     * @param filenames   Array of filepaths to sdx files
     * @private
     */
    loadFiles: function(filenames) {
        if (typeof(filenames)==='string') {
            filenames = [ filenames ];
        }
        for (var i = 0; i < filenames.length; i++) {
            var filename = IO.File.realpath(filenames[i]);
            var result = this.conn.getControllerCmd("sdx-load",{ sdxfile: filename }).issue1(SCB);
            //var result = this.conn.issueControllerCommand("sdx-load", { sdxfile: filename }, null, SCB);
        }
        this.synchronize();
    },

    /**
     * Internal function. Calls 'sdx-load' to query saguaro for all loaded sdx files.
     * @private
     */
    synchronize: function() {
        var result = this.conn.getControllerCmd("sdx-load").issue1(SCB);
        //var result = this.conn.issueControllerCommand("sdx-load", null, null, SCB);
        if (result.code == 0) {
	    var data = result.getData().getReplyData();
            for (var i = 0; i < data.length; i++) {
                var asmIdentity = data[i].asmIdentity;
                var sdxPath = data[i].sdxfile;
                var sdxFile = this.getSDXFileForAsmIdentity(asmIdentity);
                sdxFile.sdxState = 1;
                sdxFile.sdxPath = sdxPath;
            }
        } else {
            Logger.err("SDXManager: synchronize with connection failed: " + result);
        }
        return result;
    },


    /**
     * Return source info for assembly and optionally a source filename. If no filename
     * is specified, the SDXManager annotates the SDXFile info for the assembly with the
     * information whether source is available from saguaro.
     * @returns {Saguaro.SDXInfo[]} array of source infos or empty array if no info could be gathered
     * @private
     */
    lines: function(asmIdentity, filename) {
        assert(asmIdentity);
        var sdxFile = this.loadSDXForAsmIdentity(asmIdentity);
        return sdxFile.lines(filename);
    },

    
    /**
     * @private
     */
    toString: function() {
        var s = "SDXManager:\n";
        for (var asmIdentity in this.asmIdentity2sdxFile) {
            var sdxInfo = this.asmIdentity2sdxFile[asmIdentity];
            s += sdxInfo.toString() + "\n";
        }
        return s;
    }
};

/**
 * Cached information about a SDX file loaded by saguaro.
 * @class
 * @constructor
 * @param manager
 * @param asmIdentity
 * @private
 */
Saguaro.SDXManager.SDXFile = function(manager, asmIdentity) {
    this.manager = manager;
    this.asmIdentity = asmIdentity;
    this.sdxState = -1;
    this.sourceState = -1;
    this.sdxPath = null;
};

/** @private */
Saguaro.SDXManager.SDXFile.prototype = {
    /**
     * SDX manager
     * @type Saguaro.SDXManager
     * @private
     */
    manager: null,
    /**
     * Assembly identity.
     * @type String
     * @private
     */
    asmIdentity: null,
    /**
     * Full path to sdx file.
     * @type String
     * @private
     */
    sdxPath: null,
    /**
     * sdxState: 1 => sdx was loaded, 0 => was not found or error occured, -1 => not tried yet
     * @type Integer
     * @private
     */
    sdxState: -1,
    /**
     * sourceState: 1 => sources are available, 0 => error or no sources, -1 => not tried yet
     * Sources were loaded if 'lines' was once called on this assembly with the filename empty.
     * @type Integer
     * @private
     */
    sourceState: -1,

    /**
     * Return source info for an assembly identity and optionally a source filename. If no filename
     * is specified, this instance caches the information whether source is available from saguaro.
     * @returns {Saguaro.SDXInfo[]} array of source infos or empty array if no info could be gathered
     * @private
     */
    lines: function(filename) {
        assert(this.sdxState>=0);
        if (this.sdxState == 0) {
            this.sourceState = 0;
            return [];    // no sources
        }
        if (this.sourceState==0) {
            // last attempt led to no sources
            return [];
        }
        var result = this.manager.conn.sdxLines(this.asmIdentity, filename, 1, -1, 0, SCB);
        var arr = [];
        if (result.code == 0) {
	    var data = result.getData().getReplyData();
            arr = data.map(function(d) { return new Saguaro.SdxInfo(d); });
        }
        if (!filename) {
            // first lookup for sources might have led to no sources
            this.sourceState = arr.length==0 ? 0 : 1;
        }
        return arr;
    },


    /**
     * Check whether saguaro has source file info.
     * @returns {boolean}
     * @private
     */
    hasLines: function() {
        assert(this.sdxState>=0);
        if (this.sdxState == 0) {
            this.sourceState = 0;
            return false;    // no sources
        }
        if (this.sourceState==0) {
            // last attempt led to no sources
            return false;
        }
        var result = this.manager.conn.sdxLines(this.asmIdentity, null, 1, -1, 0, SCB);
        if (result.code == 0) {
	    var data = result.getData().getReplyData();
            this.sourceState = data.length==0 ? 0 : 1;
        } else {
            this.sourceState = 0;
        }
        // first lookup for sources might have led to no sources
        return this.sourceState==1;
    },

    /**
     * @private
     */
    toString: function() {
        return this.asmIdentity + ": " + this.sdxPath + ", " + this.sdxState + ", " + this.sourceState;
    }
};












Class.define(
    "Saguaro.Connection.EventListeners",
    /**
     * @lends Saguaro.Connection.EventListeners.prototype
     */
    {
        /**
         * A Saguaro.Connection.EventListeners instance manages a set of event listeners for a saguaro connection.
	 * Registered listeners receive all saguaro events and can manipulate the Saguaro.Connection.EventListeners.Action
	 * to modify the behaviour on a halt, consume an event etc.
         * @constructs
         * @param conn    The saguaro connection to manage
	 * @see Saguaro.Connection.EventListeners.ListenerSignature
         */
        __constr__: function(/** Saguaro.Connection */conn) {
            this.conn = conn;
            this.listeners = [];
        },

        /**
         * Installed listeners.
         * @type Function[]
         * @private
         */
        listeners: null,

        /**
         * @type Saguaro.Connection.EventListeners.Action
         * @private
         */
        action: null,

        /**
	 * Returns the currently set action instance.
         * @returns {Saguaro.Connection.EventListeners.Action} 
         */
        getAction: function() {
            return this.action;
        },


        /**
	 * Returns the saguaro connection.
         * @returns {Saguaro.Connection}
         */
        getConnection: function() {
            return this.conn;
        },
        
        /**
         * If a halt event is forwarded to listeners, they can specify whether the connection should
         * continue with the execution on return.
         * @param continueCmd    True if connection should issue a continueCmd
         * @param mode           Undefined or 'logic-time' or 'real-time'
         * @param until          Reserved for timers, set to 'undefined' or null
         * @param contData       
	 * @returns {Object} this
         */
        setContinue: function(/** Boolean */continueCmd, /** String */mode, /** Number */until, /** Object */contData) {
	    assert(this.action);
	    assert(until===undefined||typeof(until)==='number');
	    assert(mode===undefined||typeof(mode)==='string');
            this.action.continueCmd = continueCmd;
	    this.action.mode = mode;
	    this.action.until = until;
	    this.action.contData = contData;
	    return this;
        },

	/**
	 * Modify notification behaviour.
         * @param abort    Abort event listener notification, do not invoke any other EventListeners receivers.
         * @param suppress Consume event, do not signal it to Event.Registry.
	 * @returns {Object} this
	 */
        setAbort: function(/** Boolean */abort, /** Boolean */suppress) {
            this.action.abort = abort;
	    if (suppress!==undefined) {
		this.action.suppress = suppress;
	    }
	    return this;
        },

	/**
         * @param suppress If true, consume event, do not signal it to Event.Registry.
	 * @returns {Object} this
         */
        setSuppress: function(/** Boolean */suppress) {
            this.action.suppress = suppress;
	    return this;
        },

	/**
         * Add another listener at the beginning of the set of listeners.
         * @param listener
         * @returns {Saguaro.Connection.EventListeners.ListenerSignature} listener
         */
        unshift: function(/** Saguaro.Connection.EventListeners.ListenerSignature */listener) {
            return this.listeners.unshift(listener);
        },

        /**
         * Add another listener at the end of the set of listeners.
         * @param listener
         * @returns {Saguaro.Connection.EventListeners.ListenerSignature} listener
         */
        add: function(/** Saguaro.Connection.EventListeners.ListenerSignature */listener) {
	    this.listeners.push(listener);
            return listener;
        },

        /**
         * Remove listener.
         * @param listener
         * @returns {Boolean}
         */
        remove: function(/** Saguaro.Connection.EventListeners.ListenerSignature */listener) {
	    var idx = this.listeners.indexOf(listener);
	    if (idx >= 0) {
		this.listeners.splice(idx, 1);
	    }
        },

        /**
         * Called by connection on saguaro event.
	 * @param event
	 * @param state   True, saguaro went into halt state with this event
         * @private
         */
        onEvent: function(/** Sonoran.Event */event, /** Boolean */haltState) {
            assert(event);

	    if (this.listeners.length===0) {
		return;
	    }

	    var listeners = arraycopy(this.listeners);
	    this.action = new Saguaro.Connection.EventListeners.Action();
	    
	    for (var i = 0; i < listeners.length; i++) {
		listeners[i](event, this, haltState);
		if (this.action.abort) {
		    //QUACK(0, "EventListeners: saguaro event listeners: aborted...");
		    return;
		}
	    };
        },
        
        /**
         * @returns {String} a string
         */
        toString: function() {
            return "Saguaro.Connection.EventListeners";
        }
    }
);




/**
 * Can be set by a saguaro event listener to continue with saguaro when returning from
 * a halt event.
 * @class
 * @see Saguaro.Connection.EventListeners.ListenerSignature
 * @constructor
 * @param  continueCmd
 * @param  mode
 * @param  until
 * @param  contData
 */
Saguaro.Connection.EventListeners.Action = function(/** Boolean */continueCmd, /** String */mode, /** Number */until, /** Object */contData) {
    /**
     * If false, do not invoke 'continue' after the set of listeners has been invoked.
     * @type Boolean
     */
    this.continueCmd = continueCmd;
    /**
     * 'mode' parameter for continue call on return of all halt event listeners, e.g. 'real-time'.
     * @type String
     */
    this.mode = mode;
    /**
     * 'until' parameter for continue call on return of all halt event listeners.
     * @type Number
     */
    this.until = until;
    /**
     * Data parameter for continue command.
     * @type Object
     */
    this.contData = contData;
    /**
     * Abort event listener chain.
     * @type Boolean
     */
    this.abort = false;
    /**
     * Dont fire event with registry.
     * @type Boolean
     */
    this.suppress = false;
};

/** @private */
Saguaro.Connection.EventListeners.Action.prototype = {
    /**
     * @returns {String}
     */
    toString: function() {
        return "Action: " + this.continueCmd + ", " + this.abort + ", " + this.suppress;
    }
};


/**
 * A Saguaro.Connection.EventListeners.ListenerSignature describes the signature of an event listener function
 * registered at a saguaro connection. Listeners are invoked after the connection has handled the
 * event internally. For instance, a Saguaro.MoteImpl has updated its asssembly listing on an
 * assembly-load-event.</br>
 * A listener receives events such as Sonoran.Event.Generic, Sonoran.Event.Halt, Sonoran.Event.Start, 
 * or Sonoran.Event.Debug events.</br>
 * In case of a halt event, a listener can set the 'continue' behaviour on the
 * Saguaro.Connection.EventListeners instance by calling Saguaro.Connection.EventListeners#setContinue
 * leading to the saguaro connection to issue a continue command when all listeners returned.</br>
 * Event handlers may only block issuing Saguaro controller or mote commands.
 * @param ev             The event
 * @param eventlisteners The event listeners instance issuig this event
 * @param haltState      The event led to a halt state of the simulation
 */
Saguaro.Connection.EventListeners.ListenerSignature = function(/** Sonoran.Event */ev, /** Saguaro.Connection.EventListeners */eventListeners, /** Boolean */haltState) {};



/** 
 * @private 
 */
Saguaro.Connection.EventListeners.onRadiohwAddrEvent = function(/** Sonoran.Event */ev, /** Saguaro.Connection.EventListeners */eventListeners) {
    //assert(eventListeners);
    if (ev.category===Sonoran.EV_CAT_RADIOHW  && ev.evname===Saguaro.EV_ADDR && ev.mote) {
	var impl = Saguaro.mote2impl(ev.mote);
	var dev = impl.getDeviceInstance(Saguaro.DEVN_RADIO);
	assert(dev);
	dev.onRadiohwAddrEvent(ev, eventListeners);
    }
};

/** 
 * @private 
 */
Saguaro.Connection.EventListeners.onMoteEvent = function(/** Sonoran.Event */ev, /** Saguaro.Connection.EventListeners */eventListeners, /** Boolean */haltState) {
    if (ev.mote) {
	var impl = Saguaro.mote2impl(ev.mote);
	impl.onSaguaroEvent(ev, eventListeners, haltState);
    }
};












/**
 * Cached events from simulation log
 * @class
 * @private
 */
Saguaro.EvLog = function(conn) {
    /**
     * @type Saguaro.Connection
     * @private
     */
    this.conn = conn;
    /**
     * Map of string to Saguaro.SDXFile
     * @type Object
     * @private
     */
    this.log = [];
    /**
     * @type Number
     * @private
     */
    this.evBase = 0;
};


/** @private */
Saguaro.EvLog.prototype = {
    /**
     * @param evno
     * @param events
     * @private
     */
    addEvents: function(/** Number */evno, /** Object[] */events) {
	for( var i=0; i<events.length; i++ ) {
	    var ei = evno+i;
	    if( ei < this.evBase )
		continue;
	    if( this.log[ei] == null )
		this.log[ei] = events[i];
	}
    },

    /**
     * @param evno
     * @returns {Object}
     * @private
     */
    getEvent: function (evno) {
	if( evno < this.evBase )
	    return undefined;
	return this.log[evno-this.evBase];
    },

    /**
     * @returns {Number}
     */
    getLastEventNo: function () {
	return this.evBase+this.log.length;
    },

    /**
     * @returns {Number}
     */
    getFirstEventNo: function () {
	return this.evBase;
    },

    /**
     * @private
     */
    toString: function() {
        return "EvLog<"+this.conn+">";
    }
};




























/**
 * Controls the flow of saguaro messages. Its method 'invokeHalted' allows a client to 
 * execute a function in a halted state where the dispatcher halts and continues 
 * saguaro as required.
 * @class
 * @constructor
 * @param conn
 */
Saguaro.Dispatcher = function(/** Saguaro.Connection */conn) {
    assert(conn);
    /**
     * @type Saguaro.Connection
     * @private
     */
    this.conn = conn;
    /**
     * Number of active function calls in halt state and requested by API call.
     * @type Number
     * @private
     */
    this.invocationsCnt = 0;
    /**
     * If true, saguaro must be continued after flow-control and halted-invocations have been finished.
     * @type Boolean
     * @private
     */
    this.needContinue = undefined;
    /**
     * Object with 'mode' and 'until' as parameters for continue-call if necessary.
     * @type Object
     * @private
     */
    this.continueParams = null;
    /**
     * The state of the last halt prformed by this dispatcher.
     * @type Object
     * @private
     */
    this.haltReason = null;
    /**
     * @type Function[]
     * @private
     */
    this.waiterCallbacks = [];
};



/** */
Saguaro.Dispatcher.prototype = {
    /**
     * Called by connection socket when message is received.
     * @param transportMsgtype 
     * @param blob
     * @private
     */
    onBlob: function(/** Number */transportMsgtype, /** Object */blob) {
	if( transportMsgtype == Saguaro.EVENT_LIST ) {
	    this.conn.evLog.addEvents(blob.start, blob.events);
	    return;
	}

	//QUACK(0, "SAG ->SON: " + Util.formatData(blob));
	


	if (blob.msgtype === Saguaro.CONTROLLER_REPLY || blob.msgtype === Saguaro.MOTE_REPLIES) {
	    var command = this.conn.commands[blob.msgid];
	    if (!command) {
	        //QUACK(0, "Saguaro", "ignore saguaro reply " + Util.formatData(blob));
                return;
	    }
	    command.onBlob(blob);
	    return;
	}
	
	var event = { 
	    category: "saguaro",
	    evname:   "blob",
	    dispatcher:  this, 
	    blob:        blob, 
	    state:       (transportMsgtype===Saguaro.HALT_EVENT),
	    toString: function() {
		return "SaguaroBlob: halt-state " + this.state + ", blob:\n" + Util.formatData(blob);
	    }
	};
	Event.Registry.eventHandler.addObject(event);
    },


    /**
     * Called by event registry to handle event. Executed by event handler thread.
     * @param event
     * @private
     */
    handleBlob: function(/** Object */event) {
	assert(this.invocationsCnt===0);
	var ret = null;

	if (event.func !== undefined) {

	    try {
		var result = this.performInvocation(event.func);
		event.notify(result);
	    } catch(ex) {
		event.notify(undefined, ex);
	    }

	} else {

	    var blob = event.blob;
	    assert(blob.time!==undefined);
	    this.conn.lastTimestamp = blob.time;

	    if (blob.category === Sonoran.EV_CAT_HALT && blob.evname === Sonoran.EV_NAME_TIMEOUT) {
		 //QUACK(0, "Dispatcher.handleBlob: timer event..");
		 this.conn.timerq.onHalt(blob);
	     } else if (blob.category===Sonoran.EV_CAT_HALT && this.isMyHaltReason(blob)) {
		 //QUACK(0, "Dispatcher.handleBlob: ignore my own halt!");
	     } else {
		 ret = this.conn.onBlob(event.state, blob);
	     }

	}

	return ret;
    },


    /**
     * Compare a received halt event with the ones triggered by a halt command.
     * Return true if received halt blob has been triggered by a halt command.
     * @param blob   Blob as received from saguaro
     * @returns {Boolean}
     * @private
     */
    isMyHaltReason: function(/** Object */blob) {
	//assert(blob.msgtype === Saguaro.HALT_EVENT);
	assert(blob.time !==undefined);
	var haltReason = this.haltReason;
	var ret = (haltReason && (blob.evname===haltReason.evname && blob.time<=haltReason.time));
	//QUACK(0, "Dispatcher.isMyHaltReason(): " + ret);
	return ret;
    },


    /**
     * Invoke specified function (after saguaro has been halted or is in halted state).
     * Returns result of function call or throws the exception thrown by function.
     * @param func     
     * @returns {Object} result of func
     * @throws {Exception}
     */
    invokeHalted: function(/** Function */func) {
	assert(arguments.length===1);
	var caller = Thread.current();

	if (caller === Event.Registry.eventHandler.getTid()) {
	    return this.performInvocation(func);
	} 

	var result, exception;
	var blob = {
	    category: "saguaro",
	    evname: "blob",
	    dispatcher: this,
	    func: func,
	    notify: function(res, exc) {
		if (exc) {
		    exception = exc;
		} else {
		    result = res;
		}
		Thread.makeRunnable(caller);
	    },
	    toString: function() {
		return "Request.Thread.invokeHalted";
	    }
	};
	Event.Registry.eventHandler.addObject(blob);
	Thread.suspend();
	if (exception) {
	    throw exception;
	}
	return result;
    },


    /**
     * @param func
     * @returns {Object}
     * @private
     */
    performInvocation: function(func) {
	var result, exc;

	this.invocationsCnt += 1;
	if (this.invocationsCnt === 1) {
	    this.startHaltedSequence();
	    assert(this.needContinue!==undefined);
	}

	try {
	    result = func();
	} catch(x) {
	    var msg = Runtime.dumpException(x, "Saguaro.Dispatcher: exception when performing 'halted' function");
	    QUACK(0, msg);
	    Logger.err(msg);
	    exc = new Exception(msg);
	}

	this.invocationsCnt -= 1;
	if (this.invocationsCnt === 0) {
	    this.continueHaltedSequence();
	    assert(this.needContinue===undefined);
	}

	if (exc) {
	    throw exc;
	}
	return result;
    },


    /**
     * Continue saguaro process. If a sequence under halt state is currently in progress, the continue-command
     * is sent after that sequence has been finished. Otherwise, the continue command is sent immediately.
     * Typically, called by event handler thread.
     * @param mode
     * @param until
     * @param contData
     * @returns {Boolean} True if continue has been executed immediately, false if delayed for halt sequence
     * @see Saguaro.EventListeners
     */
    continueCmd1: function(/** String */mode, /** Number */until, /** Object */contData) {
	assert(arguments.length===3);
	if (this.invocationsCnt > 0) {
	    assert(this.needContinue!==undefined);
	    if (this.needContinue===false) {
		//QUACK(0, "Dispatcher.continueCmd: setting needContinue to true!");
		this.needContinue = true;
	    }
	    //QUACK(0, "Dispatcher.continueCmd: continueParams: " + mode + ", " + until);
	    this.continueParams = this.makeContinueParams(mode, until, contData);
	    return false;
	} else {
	    //QUACK(0, "Dispatcher.continueCmd: issue command..");
	    assert(this.invocationsCnt <= 0);
	    //println("continueCm1: until " + until);
	    this.conn.getControllerCmd("continue", this.makeContinueParams(mode, until, contData)).issue1(function(res) {
		if (res.code !== 0) {
		    var msg = "Dispatcher.continueCmd: could not continue simulation: " + res;
		    QUACK(0, msg);
		    Logger.err(msg);
		}
	    });
	    return true;
	}
    },


    /**
     * Continue saguaro process. Blocks until all sequences under halt state have been finished and continues
     * saguaro. Do not call this method from the event handler thread.
     * @param mode
     * @param until
     * @param contData
     * @param callback
     * @see Saguaro.EventListeners
     */
    continueCmd2: function(/** String */mode, /** Number */until, /** Object */contData, /** DFLT_ASYNC_CB */callback) {
	assert(arguments.length===4);
	//assert(Thread.current() !== Event.Registry.eventHandler.getTid(), "Unsupported invocation from event handler thread");
	if (BC.is(callback)) { return BC.exec(arguments.callee, this, arguments); }

	var _this = this;

	var f = function() {
	    //println("continueCm2: until " + until);
	    _this.conn.getControllerCmd("continue", _this.makeContinueParams(mode, until, contData)).issue1(callback);
	};

	if (this.invocationsCnt > 0) {
	    this.waiterCallbacks.push(f);
	} else {
	    f();
	}
    },



    

    /**
     * @param mode
     * @param until
     * @param contData
     * @private
     */
    makeContinueParams: function(/** Number */mode, /** Number */until, /** Object */contData) {
	assert(until===undefined||until===null||typeof(until)==='number');
	assert(mode===undefined||mode===null||typeof(mode)==='string');
	var params = {};
        if (mode) { 
	    params.mode = mode; 
	}
        if (until) {
	    params.until = until;
	    params.untilms = 0;
        }
	params.data = contData;
	return params; 
    },



    
    /**
     * Halt saguaro process. If a sequence under halt state is in progress, it is finished and no continue sent
     * afterwards. Otherwise, a halt command is sent immediately to halt saguaro.
     * @returns {Boolean} True if halt has been executed immediately, false if delayed due to a halted sequence
     * @see Saguaro.EventListeners
     */
    haltCmd1: function() {
	if (this.invocationsCnt > 0) {
	    assert(this.needContinue!==undefined);
	    if (this.needContinue===true) {
		//QUACK(0, "Dispatcher.haltCmd: setting needContinue to false!");
		this.needContinue = false;
	    }
	    return false;
	} else {
	    //QUACK(0, "Dispatcher.haltCmd: issue command..");
	    this.haltReason = null;
	     this.conn.getControllerCmd("halt").issue3(Saguaro.HALT_EVENT, function(res) {
		if (res.code !== 0) {
		    var msg = "Dispatcher.haltCmd: could not halt simulation: " + res;
		    QUACK(0, msg);
		    Logger.err(msg);
		}
	    });
	    return true;
	}
    },


    /**
     * Halt saguaro process. Blocks until all sequences under halt state have been finished and saguaro is halted.
     * Do not call this method from the event handler thread.
     * @param callback
     * @see Saguaro.EventListeners
     */
    haltCmd2: function(/** DFLT_ASYNC_CB */callback) {
	//assert(Thread.current() !== Event.Registry.eventHandler.getTid(), "Unsupported invocation from event handler thread");
	if (BC.is(callback)) { return BC.exec(arguments.callee, this, arguments); }
	
	var _this = this;
	var f = function() {
	    _this.haltReason = null;
	    _this.conn.getControllerCmd("halt").issue3(Saguaro.HALT_EVENT, callback);
	};

	if (this.invocationsCnt > 0) {
	    this.waiterCallbacks.push(f);
	} else {
	    f();
	}
    },




    /**
     * @param forFlowControl
     * @private
     */
    startHaltedSequence: function() {
	assert(this.needContinue===undefined);
	this.needContinue = false;
	//QUACK(0, "Dispatcher.startHaltedSequence: halt for " + forFlowControl);
	var res = this.conn.getControllerCmd("halt").issue3(Saguaro.HALT_EVENT, SCB);
	//QUACK(0, "Dispatcher.startHaltedSequence: returned!");
	if (res.code !== 0) {
	    var msg = sprintf("Saguaro: could not halt simulation for 'halt-invocation': %s", res);
	    QUACK(0, msg);
	    Logger.err(msg);
	} else {
	    var reply = res.getData().getReply();
	    var state = reply.data.state;
	    assert(state==="halted");
	    var reason = reply.data.reason;
	    assert(reason&&(reason.time!==undefined)&&(reply.time!==undefined));
	    if (reason.evname==="byUser" && reason.time===reply.time) {
		this.needContinue = true;
		this.haltReason = reason;
	    }
	}
    },


    /**
     * @param forFlowControl
     * @private
     */
    continueHaltedSequence: function() {
	assert(this.invocationsCnt===0);
	assert(this.needContinue!==undefined);
	var needContinue = this.needContinue;
	this.needContinue = undefined;
	if (needContinue) {
	    //println("continueHaltedSequence: ..");
	    var res = this.conn.getControllerCmd("continue", this.continueParams).issue1(SCB);
	    this.continueParams = null;
	    if (res.code !== 0) {
		var msg = "Dispatcher.continueHaltedSequence: could not continue simulation: " + res;
		QUACK(0, msg);
		Logger.err(msg);
	    }
	}
	var waiterCallbacks = this.waiterCallbacks;
	this.waiterCallbacks = [];
	for (var i = 0; i < waiterCallbacks.length; i++) {
	    waiterCallbacks[i]();
	}
    }
};






/*
 * Listener for log level changes. These are forwarded to all connections.
 */
Logger.logLevelListeners.add(function() {
    var logLevels = Logger.getLogLevels();
    var descrs = [];
    var conn = Saguaro.Connection.getConnection();
    if (conn != null) {
	conn.logConfig(logLevels, function(status) {
            if (status.code != 0) {
                Logger.err("Could not modify log levels on saguaro processes: " + status);
            }
	});
    }
});



