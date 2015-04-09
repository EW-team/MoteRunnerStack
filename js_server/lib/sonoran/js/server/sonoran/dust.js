// //  (C) COPYRIGHT INTERNATIONAL BUSINESS MACHINES CORPORATION 2011-2011
// //                       ALL RIGHTS RESERVED
// //        IBM Research Division, Zurich Research Laboratory
// // --------------------------------------------------------------------



// Runtime.include("sonoran/dust.js");



// /**
//  * Constant.
//  * @type Number
//  */
// Dust.UDP_CTRL_PORT    = 0xF0B0;
// /**
//  * Constant.
//  * @type Number
//  */
// Dust.UDP_EXT_APP_PORT = 0xF0B1;   // Port for external application commands
// /**
//  * Constant.
//  * @type Number
//  */
// Dust.UDP_LOC_PORT     = 0xF0B2;   // Location port
// /**
//  * Constant.
//  * @type Number
//  */
// Dust.UDP_DATA_PORT    = 0xF0B3;   // Default data port
// /**
//  * Constant.
//  * @type Number
//  */
// Dust.UDP_SERAPI_PORT  = 0xF0B8;   // Serial API pass-through
// /**
//  * Constant.
//  * @type Number
//  */
// Dust.UDP_OAP_PORT     = 0xF0B9;   // Oski Application Protocol
// /**
//  * Constant.
//  * @type Number
//  */
// Dust.UDP_MR_PORT      = 0xF0B5;   // Mote Runner port




// /**
//  * Constant.
//  * @type Number
//  * @constant
//  * @private
//  */
// Dust.HW_MOTE_CLASS= "DN";

// /**
//  * @type String
//  * @constant
//  * @private
//  */
// Dust.ADDRESS_FAMILY = "dn";

// /**
//  * @type String
//  * @private
// */
// Dust.LOG_MOD = 'DUST';

// Logger.defineModule(Dust.LOG_MOD, Logger.INFO);


// /**
//  * @type Number
//  * @private
// */
// Dust.EPOCH_SHIFT = 284878800;


// /**
//  * This converts between Dust UTC seconds and Unix UTC seconds.
//  * Dust epoch starts 20:00:00 2002-07-02 GMT.
//  * Unix epoch starts 00:00:00 UTC on 1970-01-01.
//  * @param seconds since input epoch
//  * @param inputEpoch a string 'unix' or 'dust' denoting input epoch
//  * @return seconds since output epoch
//  */
// Dust.changeEpoch = function (secs, inputEpoch) {
//     return inputEpoch=='dust' ? secs+Dust.EPOCH_SHIFT : secs-Dust.EPOCH_SHIFT;
// };


// /**
//  * @param noMR
//  * @returns {Sonoran.Mote[]}
//  * @private
//  */
// Dust.getAllMotes = function(/** Boolean */noMR) {
//     var motes = [];
//     Sonoran.Registry.getMotes(noMR).forEach(function(mote) {
// 	if (mote.getClass() === Dust.HW_MOTE_CLASS) {
// 	    motes.push(mote);
// 	}
//     });
//     return motes;
// };


// /**
//  * Constant.
//  * @type ENUM
//  */
// Dust.RESPCODE = new ENUM("RespCode",
//  			      "OK",                // 0
//  			      "INV_CMD",           // 1
//  			      "INV_ARG",           // 2
// 			      4,
// 			      "INV_VERSION",       // 4
//  			      11,
//  			      "E_LIST",            // 11
//  			      "NO_RESOUCRES",      // 12
//  			      "IN_PROGRESS",       // 13
//  			      "NAK",               // 14
//  			      "WRITE_ERROR",       // 15
//  			      "VALIDATION_ERROR"   // 16
//  			    );

// /**
//  * Constant.
//  * @type ENUM
//  */
// Dust.CMDTYPE = new ENUM("CmdType",
//  			     "NULL_PKT",            // 0
//  			     "HELLO",               // 1
//  			     "MUX_INFO",            // 2
//  			     "MGR_HELLO",           // 3
//  			     20,
//  			     "NOTIF",               // 20
//  			     "RESET",               // 21
//  			     "SUBSCRIBE",           // 22
//  			     "GET_TIME",            // 23
//  			     26,
//  			     "SET_NET_CFG",         // 26
//  			     31,
//  			     "CLEAR_STATS",         // 31
//  			     33,
//  			     "EXCH_JOINKEY",        // 33
//  			     "EXCH_NETWORKID",      // 34
//  			     36,
//  			     "RADIOTEST_TX",        // 36
//  			     "RADIOTEST_RX",        // 37
//  			     "RADIOTEST_STATS",     // 38
//  			     "SET_ACL_ENTRY",       // 39
//  			     "GET_NEXT_ACL_ENTRY",  // 40
//  			     "DEL_ACL_ENTRY",       // 41
//  			     "PING_MOTE",           // 42
//  			     "GET_LOG",             // 43
//  			     // New Picard commands
//  			     "SEND_DATA",           // 44
//  			     "START_NETWORK",       // 45
//  			     "GET_SYSINFO",         // 46
//  			     "GET_MOTE_CFG",        // 47
//  			     "GET_PATH",            // 48
//  			     "GET_NEXT_PATH",       // 49
//  			     "SET_ADVERTISING",     // 50
//  			     "SET_DFRAME_MULT",     // 51
//  			     "MEASURE_RSSI",        // 52
//  			     "GET_MANAGER_STATS",   // 53
//  			     "SET_TIME",            // 54
//  			     "GET_LICENSE",         // 55
//  			     "SET_LICENSE",         // 56
//  			     58,
//  			     "SET_CLI_USER",        // 58
//  			     "SEND_IP",             // 59
//  			     "START_LOCATION",      // 60
//  			     "RESTORE_FACTORY_DEFAULTS", // 61
//  			     "GET_MOTE_INFO",       // 62
//  			     "GET_NET_CFG",         // 63
//  			     "GET_NET_INFO",        // 64
//  			     "GET_MOTE_CFG_BY_ID",  // 65
//  			     "SET_COMMON_JOINKEY",  // 66
//  			     "GET_IP_CFG",          // 67
//  			     "SET_IP_CFG",          // 68
//  			     "DEL_MOTE",            // 69
//  			     "APP_CMD_TOTAL",       // 70
//  			     128,
//  			     "INTERNAL_CMD"         // 128
//  			    );
// /**
//  * Constant.
//  * @type ENUM
//  */
// Dust.SUBSCR = new ENUM("SubScr",
//  			    0x02, "EVENT",
//  			    0x04, "LOG",
//  			    0x10, "DATA",
//  			    0x20, "IP_DATA",
//  			    0x40, "HR"
//  			   );
// /**
//  * Constant.
//  * @type ENUM
//  */
// Dust.NOTIF = new ENUM("Notif",
// 			   1, "EVENT",
// 			   2, "LOG",
// 			   4, "DATA",
// 			   5, "IP_DATA",
// 			   6, "HR"
// 			  );
// /**
//  * Constant.
//  * @type ENUM
//  */
// Dust.EVTYPE = new ENUM("EV", //             num  eventData
// 			    "MOTE_RESET",     //   0 mac address
// 			    "NET_RESET",      //   1 empty
// 			    "CMD_FINISH",     //   2 struct cmdFinish
// 			    "MOTE_JOIN",      //   3 mac address
// 			    "MOTE_OPER",      //   4 mac address
// 			    "MOTE_LOST",      //   5 mac address
// 			    "NET_TIME",       //   6 struct spl_timeEve
// 			    "PING_RESP",      //   7 struct spl_pingRes
// 			    "RSV1",           //   8 reserved (was SPL_EV_BROWNOUT)
// 			    "MOTE_BANDWIDTH", //   9 mac address
// 			    "PATH_CREATE",    //  10 struct path
// 			    "PATH_DELETE",    //  11 struct path
// 			    "PACKET_SENT",    //  12 struct cmdFinish
// 			    "MOTE_CREATE",    //  13 struct moteinfo			    
// 			    "MOTE_DELETE"     //  14 struct moteinfo
// 			   );
// /**
//  * Constant.
//  * @type ENUM
//  */
// Dust.RESET = new ENUM("RESET",
// 			   "SYSTEM",
// 			   "NETWORK",
// 			   "MOTE"
// 			  );



// /**
//  * Constant.
//  * @constant
//  * @type Number
//  * @private
//  */
// Dust.PROTOCOL_VERSION = 4;

// /**
//  * Constant. Option "Dust.AUTH_TOKEN".
//  * @type String
//  * @constant 
//  */
// Dust.AUTH_TOKEN       = "01234567";    
// OPTIONS.add("Dust.AUTH_TOKEN",       'string');


// /**
//  * Constant. Option "Dust.LOGTRAFFIC".
//  * @type Number
//  * @constant
//  */
// Dust.LOGTRAFFIC       = false;         
// OPTIONS.add("Dust.LOGTRAFFIC",       'bool');
// //Dust.LOGTRAFFIC       = true;

// /**
//  * Constant. Option "Dust.RESP_TIMEOUT".
//  * @type Number
//  * @constant
//  * @private
//  */
// Dust.RESP_TIMEOUT     = 5000;          
// OPTIONS.add("Dust.RESP_TIMEOUT",     'int', "milliseconds");


// /**
//  * Constant. Option "Dust.CALLBACK_TIMEOUT".
//  * @type Number
//  * @constant
//  */
// Dust.CALLBACK_TIMEOUT = 6000;          
// OPTIONS.add("Dust.CALLBACK_TIMEOUT", 'int', "milliseconds");


// /**
//  * @type Number
//  * @constant
//  * @private
//  */
// Dust.SPL_BB_MODE_OFF = 0;
// /**
//  * @type Number
//  * @constant
//  * @private
//  */
// Dust.SPL_BB_MODE_UP = 1;
// /**
//  * @type Number
//  * @constant
//  * @private
//  */
// Dust.SPL_BB_MODE_BIDIR = 2;





// /**
//  * Accepts msg and variable list of arguments.
//  * @param msg
//  * @private
//  */
// Dust._warn = function (msg) {
//     var s = (Dust.connection ? Dust.connection.toString() : "Dust-Connection") + ": " + svprintf(msg, 1, arguments);
//     Logger.log(Logger.WARN, Dust.LOG_MOD, s);
// };

// /**
//  * Accepts msg and variable list of arguments.
//  * @param msg
//  * @private
//  */
// Dust._err = function (msg) {
//     var s = (Dust.connection ? Dust.connection.toString() : "Dust-Connection") + ": " + svprintf(msg, 1, arguments);
//     Logger.log(Logger.ERR, Dust.LOG_MOD, s);
// };

// /**
//  * Accepts msg and variable list of arguments.
//  * @param msg
//  * @private
//  */
// Dust._info = function (msg) {
//     var s = (Dust.connection ? Dust.connection.toString() : "Dust-Connection") + ": " + svprintf(msg, 1, arguments);
//     Logger.log(Logger.INFO, Dust.LOG_MOD, s);
// };







// /**
//  * Mote state
//  * @type Number
//  * @constant
//  * @private
//  */
// Dust.MOTE_STATE_LOST = 0;
// /**
//  * Mote state
//  * @type Number
//  * @constant
//  * @private
//  */
// Dust.MOTE_STATE_NEGOT = 1;
// /**
//  * Mote state
//  * @type Number
//  * @constant
//  * @private
//  */
// Dust.MOTE_STATE_RSV1 = 2;
// /**
//  * Mote state
//  * @type Number
//  * @constant
//  * @private
//  */
// Dust.MOTE_STATE_RSV1 = 3;
// /**
//  * Mote state
//  * @type Number
//  * @constant
//  * @private
//  */
// Dust.MOTE_STATE_OPERATIONAL = 4;



// /**
//  * Map dust mote state to sonoran state.
//  * @param state
//  * @returns {String}
//  * @private
//  */
// Dust.mapMoteState2SonoranState = function(/** Number */state) {
//     switch(state) {
//     case Dust.MOTE_STATE_LOST:
// 	return Sonoran.Mote.OFF;
//     case Dust.MOTE_STATE_NEGOT:
// 	return Sonoran.Mote.PENDING;
//     case Dust.MOTE_STATE_OPERATIONAL:
// 	return Sonoran.Mote.ON;
//     default:
// 	assert("invalid dust mote state: " + state);
// 	return 0;
//     }
// };







// Sonoran.Gateway.extend(
//     "Dust.Gateway",
//     /**
//      * @lends Dust.Gateway.prototype
//      */
//     {
// 	/**
// 	 * Inherits from gateway. A connection to a dust network (smux or edge mote) is gateway
// 	 * to wireless motes. 
// 	 *  @augments Sonoran.Gateway
// 	 * @constructs
// 	 */
// 	__constr__: function(/** Sonoran.Mote */mote) {
// 	    Sonoran.Gateway.call(this, mote);
// 	},


//        /**
// 	* @param dstmote
// 	* @param dstport
// 	* @param srcport
// 	* @param data
// 	* @param timer
// 	*/
//        send: function (/** Sonoran.Mote */dstmote, /** Number */dstport, /** Number */srcport, /** String */data, /** Timer.Timer|Timer.Timer[] */timer) {
// 	   if( dstport < 256 ) {
// 	       // LIP specific port
// 	       data = Formatter.pack("1u*d", dstport, data);
// 	       dstport = Dust.UDP_MR_PORT;
// 	   }
// 	   if( dstport >= 0x10000 ) {
// 	       dstport -= 0x10000;  // to reach port 0-255
// 	   }
// 	   var callbackid = this.sendData2(dstmote.getUniqueid(), srcport, dstport, data, undefined, undefined, function(result) {
// 	       if (result.code!==0) {
// 		   var msg = "Dust send data operation failed: " + result.toString();
// 		   QUACK(0, msg);
// 		   Dust._err(msg);
// 	       }
// 	   });
// 	   if (timer) { Timer.startTimers(timer); }
//        },


// 	/**
// 	 * @see Sonoran.Gateway.broadcast
// 	 * @param dstmote Wireless target mote
// 	 * @param dstport Port on wirless target mote
// 	 * @param data    Binary string with data
// 	 * @param timer
// 	 * @private
// 	 */
// 	broadcast: function(/** Number */dstport, /** Number */srcport, /** String */data, /** Timer.Timer|Timer.Timer[] */timer) {
// 	       if( dstport < 256 ) {
// 	       // LIP specific port
// 	       data = Formatter.pack("1u*d", dstport, data);
// 	       dstport = Dust.UDP_MR_PORT;
// 	   }
// 	   if( dstport >= 0x10000 ) {
// 	       dstport -= 0x10000;  // to reach port 0-255
// 	   }
// 	    var bc_addr = "ff-ff-ff-ff-ff-ff-ff-ff";
// 	   //var callbackid = this.connection.sendData2(bc_addr, srcport, dstport, data, undefined, undefined, function(result) {
// 	    var callbackid = this.sendData2(bc_addr, srcport, dstport, data, undefined, undefined, function(result) {
// 	       if (timer) {
// 		   Timer.startTimers(timer);
//                }
// 	       if (result.code!==0) {
// 		   var msg = "Dust broadcast data operation failed: " + result.toString();
// 		   QUACK(0, msg);
// 		   Dust._err(msg);
// 	       }
// 	   });
// 	}
//     }
// );









// Dust.Gateway.extend(
//     "Dust.Connection",
//     /**
//      * @lends Dust.Connection.prototype
//      */
//     {
// 	/**
// 	 * @augments Dust.Gateway
// 	 * @constructs
// 	 * @param name
// 	 * @param doHello
// 	 */
// 	__constr__: function(/** String */name, /** Boolean */doHello) {
// 	    Dust.Gateway.call(this, null);

// 	    this._pendCmds = [];       // Pending commands - command responses are received in the order they have been sent
// 	    this._callbackIdMap = {};
// 	    this._name = name;

// 	    // required for SMux
// 	    if (doHello) {
// 		var protov = this.sendHello(BLCK);
// 		assert(this._pendCmds.length===0);
// 	    }

// 	    this.getTime(BLCK);

// 	    var stats = this.getManagerStats(BLCK);

// 	    var config = this.getNetworkConfig(BLCK);
// 	    if (config.bbMode===Dust.SPL_BB_MODE_OFF) {
// 		Sonoran.MOMA.DUST_TIMEOUT = 20000;
// 	    } else {
// 		Sonoran.MOMA.DUST_TIMEOUT = 8000;
// 	    }

// 	    var configs = this.getAllMoteCfg(BLCK);
// 	    var gwMote = null;
// 	    for( var i = 0; i < configs.length; i++ ) {
// 		var conf = configs[i];
// 		if (conf.isAP) {
// 		    var mote = this.createMote(conf.mac, conf);
// 		    var state = Dust.mapMoteState2SonoranState(conf.state);
// 		    mote.updateState(state);
// 		    if (gwMote===null) {
// 			gwMote = mote;
// 		    }
// 		}
// 	    }

// 	    if (!gwMote) {
// 		throw new Exception("No dust access point has been found");
// 	    }
// 	    // set super class gateway mote
// 	    this.gatewayMote = gwMote;
// 	    this.setAddressFamiliy(Dust.ADDRESS_FAMILY);
// 	    this.setState(Sonoran.Gateway.STATE_CONNECTED);

// 	    for( var i = 0; i < configs.length; i++ ) {
// 		var conf = configs[i];
// 		if (!conf.isAP) {
// 		    assert(conf.mac!==this.gatewayMote.getUniqueid());
// 		    var state = Dust.mapMoteState2SonoranState(conf.state);
// 		    if (state === Sonoran.Mote.ON) {
// 			this.onMoteDetection(conf.mac, state, state===Sonoran.Mote.ON);
// 		    }
// 		}
// 	    }

// 	    this.subscribe((1<<Dust.NOTIF.EVENT)|(1<<Dust.NOTIF.LOG)|(1<<Dust.NOTIF.DATA)|(1<<Dust.NOTIF.IP_DATA)|(1<<Dust.NOTIF.HR)|0, BLCK);
// 	},


// 	/**
// 	 * Name
// 	 * @type String
// 	 * @private
// 	 */
// 	_name: null,

// 	/**
// 	 * Pending commands - command responses are received in the order they have been sent
// 	 * @type Dust.Command[]
// 	 * @private
// 	 */
// 	_pendCmds: null,

// 	/**
// 	 * @type Object
// 	 * @private
// 	 */
// 	_callbackIdMap: null,


// 	/**
// 	 * @returns {String}
// 	 */
// 	toString: function () {
// 	    // XXX: Make subclass specific and add device/socket info
// 	    return this._name;
// 	},


// 	/**
// 	 * Overloaded Gateway method.
// 	 * @param eui
// 	 * @param config
// 	 * @returns {Sonoran.Mote}
// 	 * @private
// 	 */
// 	createMote: function(/** String */eui, /** Dust.MoteConfig */config) {
// 	    var addr = sprintf("%s://%s", Dust.ADDRESS_FAMILY, eui);
// 	    var noMR = config && config.isAP ? true : false;
// 	    var impl = new Dust.MoteImpl(eui, addr, noMR);
// 	    var mote = impl.mote;
// 	    return impl.mote;
// 	},


// 	/**
// 	 * Can be overwritten to recive log events.
// 	 * @param log
// 	 */
// 	onNotifyLog: function (/** Object */log) {
// 	    Logger.log(Logger.INFO, Dust.LOG_MOD, log.mac + ": " + log.msg, undefined, Sonoran.Registry.lookupMoteByUniqueid(log.mac));
// 	},

	
// 	/**
// 	 * @param mac
// 	 * @param report
// 	 * @private
// 	 */
// 	onNotifyHR: function (/** String */mac, /** Dust.DeviceHealthReport | Dust.NeighborHealthReport[] | Dust.NeighborDiscovery[] */report) {
// 	    var t = mac+": ";
// 	    if( report instanceof Array ) {
// 		for( var i=0; i<report.length; i++ ) {
// 		    t += "\t\t"+report[i]+"\n";
// 		}
// 	    } else {
// 		t += report;
// 	    }
// 	    Logger.log(Logger.INFO, Dust.LOG_MOD, t);
// 	},


// 	/**
// 	 * Can be overwritten to receive close notification.
// 	 * @param reason
// 	 */
// 	onClose: function (/** AOP.Result */reason) {},


// 	/**
// 	 * Close connection.
// 	 * @param reason
// 	 */
// 	close: function (/** AOP.Result */reason) {
// 	    QUACK(0, "Dust.Connection.close: " + this);
// 	    if (reason.code!==0) {
// 		Dust._err("got disconnected: %s", reason);
// 	    }
// 	    this._setupTimeout(0);
	    
// 	    // set gateway state to disconnected
// 	    var msg = sprintf("Gateway %s: got disconnected: %s", this.gatewayMote, reason.toString());
// 	    Logger.log(Logger.INFO, Sonoran.Logger.GATEWAY, msg, undefined, this.gatewayMote);
// 	    this.setState(Sonoran.Gateway.STATE_DISCONNECTED);

// 	    // deregister all motes
// 	    var motes = Dust.getAllMotes(true);
// 	    motes.forEach(function(mote) {
// 		assert(mote.getClass() === Dust.HW_MOTE_CLASS);
// 		Sonoran.Registry.deregisterMote(mote);
// 	    });

// 	    var pend = this._pendCmds;
// 	    this._pendCmds = [];
// 	    while( pend.length > 0 ) {
// 		var p = pend.shift();
// 		p.onError(new AOP.ERR(ERR_GENERIC, "Connection closed"));
// 	    }

// 	    if (motes.length > 0) {
// 		this.onClose(reason);
// 	    }
// 	},


	
// 	/**
// 	 * Program timer for a sent command.
// 	 * @param set
// 	 * @private
// 	 */
// 	_setupTimeout: function (/** Boolean */set) {
// 	    if( this.timer != null ) {
// 		this.timer.cancel();
// 		this.timer = null;
// 	    }
// 	    if (set) {
// 		this.timer = new Timer.Timer(Dust.RESP_TIMEOUT, undefined, this.close.bind(this));
// 		this.timer.start();
// 	    }
// 	},


// 	/**
// 	 * Send a command.
// 	 * @param cmdtype Dust.CMDTYPE
// 	 * @param msg     Payload
// 	 * @returns {Dust.Command}
// 	 * @private
// 	 */
// 	sendCommand2: function (/** ENUM */cmdtype, /** String */msg, /** DFLT_ASYNC_CB */callback) {
// 	    if (BC.is(callback)) { return BC.exec(arguments.callee, this, arguments); }

// 	    var outmsg = this.formatCommand(cmdtype, msg);
// 	    if( Dust.LOGTRAFFIC ) {
// 		var s = Util.Formatter.genHexTable(outmsg, 4, 16);
// 		printf("%s: sending %s\n%s\n", this, Dust.CMDTYPE.toStr(cmdtype), s.join("\n"));
// 	    }

// 	    var pend = new Dust.Command(this, cmdtype);
// 	    pend.callback = callback;
// 	    this._pendCmds.push(pend);
// 	    this._setupTimeout(this._pendCmds.length === 1);
// 	    this.sendBytes(outmsg);
// 	},


// 	/**
// 	 * To be implemented by subclass
// 	 * @param cmdtype
// 	 * @param msg
// 	 * @returns {String}
// 	 * @private
// 	 */
// 	formatCommand: function(/** ENUM */cmdtype, /** String */msg) {
// 	    throw new Exception("Dust.Connection.formatCommand: to be implemented by subclass!");
// 	},


// 	/**
// 	 * To be implemented by subclass
// 	 * @param bytes
// 	 * @private
// 	 */
// 	sendBytes: function(/** String */bytes) {
// 	    throw new Exception("Dust.Connection.sendBytes: to be implemented by subclass!");
// 	},


// 	/**
// 	 * @param buf
// 	 * @private
// 	 */
// 	onEdgeMoteMessage: function (/** String */buf) {
// 	    // Response message format (without any header):
// 	    //   0   1  cmd type
// 	    //   1   1  response code
// 	    //   2.. n  payload

// 	    // At least on msg received
// 	    var a = Util.Formatter.unpack("1u1u", buf); 
// 	    var cmdtype = a[0];
// 	    var msg = buf.substring(2);
		
// 	    if( cmdtype !== Dust.CMDTYPE.NOTIF ) {
// 		// command response
// 		var respcode = a[1];
// 		if( Dust.LOGTRAFFIC ) {
// 		    var s = Util.Formatter.genHexTable(buf, 2, 16);
// 		    printf("%s received %s (%s)\n%s\n", this, Dust.CMDTYPE.toStr(cmdtype), Dust.RESPCODE.toStr(respcode), s.join("\n"));
// 		}
// 		if( this._pendCmds.length==0 || this._pendCmds[0].cmdtype!=cmdtype ) {
// 		    Logger.log(Logger.WARN, Dust.LOG_MOD, sprintf("Spurious command response (maybe replay): cmdtype=0x%02X", cmdtype));
// 		    return;
			       
// 		}
// 		var pend = this._pendCmds.shift();
// 		assert(pend!=null && pend.cmdtype==cmdtype && pend.result==null);
// 		pend.onMessage(respcode, msg);
// 		return;
// 	    }

	    
// 	    // notification
// 	    var notiftype = a[1];
// 	    if( Dust.LOGTRAFFIC ) {
// 		var s = Util.Formatter.genHexTable(buf, 2, 16);
// 		printf("%s received %s/%s\n%s\n", this, Dust.CMDTYPE.toStr(cmdtype), Dust.NOTIF.toStr(notiftype), s.join("\n"));
// 	    }

// 	    assert(cmdtype == Dust.CMDTYPE.NOTIF);
// 	    var obj;
// 	    try {
// 		if( notiftype == Dust.NOTIF.DATA ) {
// 		    obj = Util.Formatter.unpackObj2(new Dust.NotifyData(), msg,0,
// 						    "secs",       "8u",
// 						    "usecs",      "4u",
// 						    "mac",        "8E",
// 						    "srcPort",    "2u",
// 						    "dstPort",    "2u",
// 						    "data",       "*d"
// 						   );
// 		    var srceui64  = obj.mac;
// 		    var srcport   = obj.srcPort;
// 		    var dstport   = obj.dstPort;
// 		    var data      = obj.data;
// 		    var payload   = data;
// 		    var srcmote   = this.onMoteDetection(srceui64)[1];
// 		    srcmote.updateState(Sonoran.Mote.ON);
// 		    if( srcport == Dust.UDP_MR_PORT ) {
// 			var a = Util.Formatter.unpack("1u*d",data);
// 			srcport = a[0];
// 			payload = a[1];
// 		    }
// 		    //srcmote.onMedia(new Sonoran.Event.Media(dstport, srcmote, srcport, payload));
// 		    Event.Registry.signalEvent(new Sonoran.Event.Media(dstport, srcmote, srcport, payload));
// 		    //Dust._info(blob.toString());
// 		    return;
// 		}
// 		if( notiftype == Dust.NOTIF.LOG ) {
// 		    obj = Util.Formatter.unpackObj2(new Dust.NotifyLog(), msg,0,
// 						    "mac", "8E",
// 						    "msg", "*d"
// 						   );
// 		    this.onNotifyLog(obj);
// 		    return;
// 		}
// 		if( notiftype == Dust.NOTIF.HR ) {
// 		    var a = Util.Formatter.unpack("8E1u1u", msg, 0);
// 		    var mac = a[0];
// 		    var id  = a[1];
// 		    var len = a[2];
// 		    if( id == 0x80 && len == 0x18 ) {
// 			// Length should be 0x18
// 			obj = Util.Formatter.unpackObj2(new Dust.DeviceHealthReport(), msg, 10,
// 							'charge',          '4u',       
// 							'QOcc',            '1u',    
// 							'temperature',     '1s',  
// 							'batteryVolt',     '2u',  
// 							'numTxOk',         '2u',      
// 							'numTxFail',       '2u',    
// 							'numRxOk',         '2u',    
// 							'numRxLost',       '2u',  
// 							'numMacDrop',      '1u', 
// 							'numTxBad',        '1u',   
// 							'badLink_frameId', '1u',
// 							'badLink_slot',    '4u',
// 							'badLink_offset',  '1u'
// 						       );
// 			obj.mac = mac;
// 		    }
// 		    else if( id == 0x81 && (len-1) % 10 == 0 ) {
// 			obj = [];
// 			// offset 10+1=11: skip 1 byte number of neighbor records
// 			for( var pos=11; pos < msg.length; pos+=10 ) {
// 			    var h = Util.Formatter.unpackObj2(new Dust.NeighborHealthReport(), msg, pos,
// 							      'nbrId',     '2u',       
// 							      'nbrFlag',   '1u',    
// 							      'rsl',       '1s',  
// 							      'numTxPk',   '2u',      
// 							      'numTxFail', '2u',    
// 							      'numRxPk',   '2u'
// 							     );
// 			    obj.push(h);
// 			}
// 		    }
// 		    else if( id == 0x82 && (len-2) % 5 == 0 ) {
// 			obj = [];
// 			// offset 10+2=12: skip two 1 byte fields: number of neigbours, Number of Join neigbours
// 			for( var pos=12; pos < msg.length; pos+=5 ) {
// 			    var h = Util.Formatter.unpackObj2(new Dust.NeighborDiscovery(), msg, pos,
// 							      'nbrId',   '2u',       
// 							      'rsl',     '1s',  
// 							      'numRx',   '2u'
// 							     );
// 			    obj.push(h);
// 			}
// 		    }
// 		    else {
// 			Logger.log(Logger.WARN, Dust.LOG_MOD, sprintf("Unrecognized health report format: %H", msg));
// 			return;
// 		    }
// 		    this.onNotifyHR(mac, obj);
//  		    return;
//  		}
// 		if( notiftype == Dust.NOTIF.EVENT ) {
// 		    obj = Util.Formatter.unpackObj(msg,0,
// 						   "eventId",    "4u",
// 						   "eventType",  "1u",
// 						   "evdata",     "*d"
// 						  );

// 		    if( obj.eventType == Dust.EVTYPE.PACKET_SENT || obj.eventType == Dust.EVTYPE.CMD_FINISH ) {
// 			//QUACK(0, "Dust.NOTIF.EVENT: Dust.EVTYPE.PACKET_SENT or Dust.EVTYPE.CMD_FINISH");
// 			obj.evdata = Util.Formatter.unpackObj(obj.evdata,0,
// 							      "callbackId", "4u",
// 							      "result",     "1u");
// 			Dust.Callback.ForRcv(this, obj.evdata.callbackId, obj.evdata.result);
// 			return;
// 		    }
// 		    if( obj.eventType == Dust.EVTYPE.NET_RESET ) {
// 			//XXX: report reset event
// 			Dust._warn("received NET_RESET event");
// 			return;
// 		    }
// 		    if (obj.eventType == Dust.EVTYPE.MOTE_RESET) {
// 			//this.onMoteResetEv(Util.Formatter.unpack("8E", obj.evdata)[0]);
// 			var eui = Util.Formatter.unpack("8E", obj.evdata)[0];
// 			Dust._warn("received mote reset event for %s", eui);
// 			var arr = this.onMoteDetection(eui, Sonoran.Mote.RESET, false);
// 			return;
// 		    }
// 		    if( obj.eventType == Dust.EVTYPE.MOTE_JOIN ) {
// 			var eui = Util.Formatter.unpack("8E", obj.evdata)[0];
// 			Dust._warn("received mote join event for %s", eui);
// 			var arr = this.onMoteDetection(eui, Sonoran.Mote.PENDING, false);
// 			//this.onMoteJoinEv(Util.Formatter.unpack("8E", obj.evdata)[0]);
// 			return;
// 		    }
// 		    if( obj.eventType == Dust.EVTYPE.MOTE_OPER ) {
// 			var eui = Util.Formatter.unpack("8E", obj.evdata)[0];
// 			Dust._warn("received mote operational event for %s", eui);
// 			var arr = this.onMoteDetection(eui, Sonoran.Mote.ON, true);
// 			//this.onMoteOperationalEv(Util.Formatter.unpack("8E", obj.evdata)[0]);
// 			return;
// 		    }
// 		    if( obj.eventType == Dust.EVTYPE.MOTE_LOST ) {
// 			var eui = Util.Formatter.unpack("8E", obj.evdata)[0];
// 			Dust._warn("received mote lost event for %s", eui);
// 			var mote = this.onMoteDisappearance(eui);
// 			if (mote) {
// 			    Sonoran.Registry.deregisterMote(mote);
// 			}
// 			//this.onMoteLostEv(Util.Formatter.unpack("8E", obj.evdata)[0]);
// 			return;
// 		    }
// 		    if( obj.eventType === Dust.EVTYPE.MOTE_CREATE ) {
// 			obj.evdata = Util.Formatter.unpackObj(obj.evdata, 0,
// 							      "mac",              "8E",
// 							      "moteId",            "2u"
// 							     );
// 			//this.onMoteCreateEv(obj.evdata.mac, obj.evdata.moteId);
// 			var eui = obj.evdata.mac; 
// 			var moteid = obj.evdata.moteId;
// 			Dust._warn("received mote create event for eui %s, mote id %d", eui, moteid);
// 			var arr = this.onMoteDetection(eui, Sonoran.Mote.OFF, false);
// 			return;
// 		    }
// 		    if( obj.eventType === Dust.EVTYPE.MOTE_DELETE ) {
// 			obj.evdata = Util.Formatter.unpackObj(obj.evdata, 0,
// 							      "mac",              "8E",
// 							      "moteId",            "2u"
// 							     );
// 			var eui = obj.evdata.mac; 
// 			var moteid = obj.evdata.moteId;
// 			Dust._warn("received mote delete event for eui %s, mote id %d", eui, moteid);
// 			var mote = this.onMoteDisappearance(eui);
// 			if (mote) {
// 			    Sonoran.Registry.deregisterMote(mote);
// 			}
// 			//this.onMoteDeleteEv(obj.evdata.mac, obj.evdata.moteId);
// 			return;
// 		    }
// 		    if( obj.eventType == Dust.EVTYPE.MOTE_BANDWIDTH ) {
// 			obj.evdata = Util.Formatter.unpack("8E", obj.evdata)[0];
// 			//XXX: report mote bw
// 			Dust._warn("received MOTE_BANDWIDTH event for %s", obj.evdata);
// 			return;
// 		    }
// 		    if( obj.eventType == Dust.EVTYPE.PATH_CREATE || obj.eventType == Dust.EVTYPE.PATH_DELETE ) {
// 			obj.evdata = Util.Formatter.unpackObj(obj.evdata, 0,
// 							      "src",      "8E",
// 							      "dst",      "8E",
// 							      "direction","1u");
// 			var ev = new Dust.PathEvent(obj.eventType, obj.evdata.src, obj.evdata.dst, obj.evdata.direction);
// 			Dust._info(ev.toString());
// 			Event.Registry.signalEvent(ev);
// 			return;
// 		    }
// 		    if( obj.eventType == Dust.EVTYPE.NET_TIME ) {
// 			obj.evdata = Util.Formatter.unpackObj(obj.evdata,0,
// 							      "uptime",      "4u",
// 							      "asn",         "5u",
// 							      "utcencoding", "1u", // RFU 0
// 							      "secs",        "4u",
// 							      "usecs",       "4u");
// 			Dust._info("Dust.EVTYPE.NET_TIME: " + Util.formatData(obj.evdata));
// 			return;
// 		    }
// 		    if( obj.eventType == Dust.EVTYPE.PING_RESP ) {
// 			var obj  = Util.Formatter.unpackObj2(new Dust.PingResp(), obj.evdata,0,
// 							     "callbackId", "4u",
// 							     "mac",        "8E",
// 							     "delay",      "4u", // millisecs
// 							     "voltage",    "2u",
// 							     "temperature","1u");
// 			Dust.Callback.ForRcv(this, obj.callbackId, obj);
// 			return;
// 		    }
		    
// 		    Dust._warn("Unknown event type: %d - event dropped", obj.eventType);
// 		    return;
// 		}
		
// 		Dust._warn("Unknown notification type: %d - message dropped", notiftype);
// 		return;
// 	    } catch(ex) {
// 		//printf("EX: %s\n", Runtime.dumpException(ex));
// 		Dust._err("Parsing of a <%s/%s> message%s failed: %s",
// 			  Dust.CMDTYPE.toStr(cmdtype),
// 			  Dust.NOTIF.toStr(notiftype),
// 			  obj!=null && 'evtype' in obj ? "EVTYPE="+Dust.EVTYPE.toStr(obj.evtype) : "",
// 			  ex);
// 	    }
// 	},





// 	/**
// 	 * Send command 'cmdtype'with payload 'msg'. Expects response with code 'exprcode' and length 'exprlen'.
// 	 * If this is true, the evaluator (if non-null) is called with the message and the 'callback'
// 	 * is invoked with an AOP.OK instance with the 'data' property returned by the the evaluator.
// 	 * @param cmdtype    Command type
// 	 * @param msg        Payload
// 	 * @param exprlen    Expected returned message length
// 	 * @param exprcode   Expected returned message code (or undefined if OK is expected)
// 	 * @param evaluator  Null or function called with returned payload and returning result
// 	 * @param callback   User-defined callback
// 	 * @private
// 	 */
// 	sendCommand3: function(/** ENUM */cmdtype, /** String */msg, /** Number */exprlen, /** Number */exprcode, /** Function */evaluator, /** DFLT_ASYNC_CB */callback) {
// 	    if (BC.is(callback)) { return BC.exec(arguments.callee, this, arguments); }
// 	    var _this = this;
// 	    this.sendCommand2(cmdtype, msg, function(result) {
// 			   if (result.code!==0) {
// 			       callback(result);
// 			       return;
// 			   }
// 			   var pend = result.getData();
// 			   if (_this._ckMsg2(pend, exprlen, exprcode, callback)) {
// 			       return;
// 			   }
// 			   if (evaluator) {
// 			       var obj = evaluator(pend.getMessage());
// 			       callback(new AOP.OK(obj));
// 			   } else {
// 			       callback(new AOP.OK());
// 			   }
// 		       });
// 	},



// 	/**
// 	 * Send a command getting back a callback id from SMux.
// 	 * @param cmdtype   Command type
// 	 * @param msg       Command payload
// 	 * @param timeout   Time to wait for SMux callback notification
// 	 * @param callback  User-defined callback
// 	 * @private
// 	 */
// 	sendCommand4: function(/** ENUM */cmdtype, /** String */msg, /** Number */timeout, /** DFLT_ASYNC_CB */callback) {
// 	    if (BC.is(callback)) { return BC.exec(arguments.callee, this, arguments); }
// 	    var _this = this;
// 	    if (!timeout) {
// 		timeout = Dust.CALLBACK_TIMEOUT;
// 	    }
// 	    this.sendCommand2(cmdtype, msg, function(result) {
// 			   if (result.code!==0) {
// 			       callback(result);
// 			       return;
// 			   }
// 			   var pend = result.getData();
// 			   assert(pend instanceof Dust.Command);
			   
// 			   if (_this._ckMsg2(pend,4,Dust.RESPCODE.OK, callback)) {
// 			       return;
// 			   }
			   
// 			   var callbackId = Util.Formatter.unpack("4u", pend.getMessage())[0];
// 			   Dust.Callback.ForSend(_this, callbackId, timeout, callback);
// 		       });
// 	},





// 	/**
// 	 * @param pend
// 	 * @param exprlen
// 	 * @param exprcode
// 	 * @returns {Boolean} true if callback has been invoked with error
// 	 * @private
// 	 */
// 	_ckMsg2: function (/** Dust.Command */pend, /** Number */exprlen, /** Number */exprcode, /** DFLT_ASYNC_CB */callback) {
// 	    var err;
// 	    var rcvrcode = pend.getCode();
// 	    if (exprcode!==-1 && rcvrcode!==(exprcode||Dust.RESPCODE.OK)) {
// 		if (rcvrcode===Dust.RESPCODE.NAK) {
// 		    err = new AOP.ERR(ERR_GENERIC, sprintf("%s: User commands queue full", this));
// 		} else if (rcvrcode===Dust.RESPCODE.INV_ARG ) {
// 		    err = new AOP.ERR(ERR_GENERIC, sprintf("%s: Invalid arguments", this));
// 		} else if (rcvrcode===Dust.RESPCODE.E_LIST ) {
// 		    err = new AOP.ERR(ERR_GENERIC, sprintf("%s: Mote does not exist or is not operational", this));
// 		} else if (rcvrcode===Dust.RESPCODE.INV_VERSION ) {
// 		    err = new AOP.ERR(ERR_GENERIC, sprintf("%s: Serial Mux protocol version %d not supported by manager mote", this, Dust.PROTOCOL_VERSION));
// 		} else {
// 		    err = new AOP.ERR(ERR_GENERIC, sprintf("%s: Unexpected response code for <%s>: %d %s", this, Dust.CMDTYPE.toStr(pend.cmdtype), rcvrcode, Dust.RESPCODE.toStr(rcvrcode)));
// 		}
// 	    } else {
// 		var mlen = pend.getMessage().length;
// 		if( mlen != exprlen ) {
// 		    err = new AOP.ERR(ERR_GENERIC, sprintf("%s: Message <%s> has wrong length: %d (expected length %d)", this, Dust.CMDTYPE.toStr(pend.cmdtype), mlen, exprlen));
// 		}
// 	    }
// 	    if (!err) {
// 		return false;
// 	    }
// 	    callback(err);
// 	    return true; 
// 	},



// 	/**
// 	 * Send a data message to mote.
// 	 * @param eui64
// 	 * @param srcPort
// 	 * @param dstPort
// 	 * @param data
// 	 * @param priority   If 'undefined', 0
// 	 * @param options    If 'undefined', 0
// 	 * @param callback
// 	 * @throws {Exception}
// 	 * @private
// 	 */
// 	sendData2: function (/** String */eui64, /** Number */srcPort, /** Number */dstPort, /** String */data, /** Number */priority, options, /** DFLT_ASYNC_CB */callback) {
// 	    if (BC.is(callback)) { return BC.exec(arguments.callee, this, arguments); }

// 	    this.sendCommand4(Dust.CMDTYPE.SEND_DATA, Formatter.pack("8E1u2u2u1u*d", eui64, priority || 0, srcPort, dstPort, options || 0, data), undefined, callback);
// 	},



// 	/** 
// 	 * Subscribe to events.
// 	 * @param events Mask of event specifiers (Dust.NOTIF.EVENT...)
// 	 * @private
// 	 */
// 	subscribe: function (/** Number */events, /** DFLT_ASYNC_CB */callback) {
// 	    if (BC.is(callback)) { return BC.exec(arguments.callee, this, arguments); }
// 	    this.sendCommand3(Dust.CMDTYPE.SUBSCRIBE, Formatter.pack("4u", events), 0, undefined, undefined, callback);
// 	},


// 	/**
// 	 * Sends hello.
// 	 * @returns {Number} the protocol version
// 	 */
// 	sendHello: function(/** DFLT_ASYNC_CB */callback) {
// 	    if (BC.is(callback)) { return BC.exec(arguments.callee, this, arguments); }
// 	    this.sendCommand3(Dust.CMDTYPE.HELLO, Formatter.pack("1u8d", Dust.PROTOCOL_VERSION, Dust.AUTH_TOKEN), 1, undefined, 
// 		       function(msg) {
// 			   return Util.Formatter.unpack("1u", msg)[0];
// 		       }, 
// 		       callback);
// 	},


// 	/**
// 	 * Reset mote.
// 	 * @param eui64
// 	 * @see Sonoran.Mote.reset
// 	 */
// 	resetMote: function (/** String */eui64, /** DFLT_ASYNC_CB */callback) {
// 	    if (BC.is(callback)) { return BC.exec(arguments.callee, this, arguments); }
// 	    // returned mac address - ignored
// 	    this.sendCommand3(Dust.CMDTYPE.RESET, Formatter.pack("1u8E", Dust.RESET.MOTE, eui64), 8, undefined, null, function(result) {
// 			   if (result.code!==0) {
// 			       callback(result);
// 			       return;
// 			   }
// 			   callback(result);
// 		       });
// 	},



// 	/**
// 	 * Return mote info.
// 	 * @returns {Dust.MoteInfo}
// 	 */
// 	getMoteInfo: function (/** String */eui64, /** DFLT_ASYNC_CB */callback) {
// 	    if (BC.is(callback)) { return BC.exec(arguments.callee, this, arguments); }
// 	    this.sendCommand3(Dust.CMDTYPE.GET_MOTE_INFO, Util.Formatter.pack("8E", eui64), 
// 		       35, undefined, 
// 		       function(msg) {
// 			   return Util.Formatter.unpackObj2(new Dust.MoteInfo(), msg, 0,
// 							    "mac",              "8E",
// 							    "state",            "1u",
// 							    "numNbrs",          "1u",
// 							    "numGoodNbrs",      "1u",
// 							    "requestedBw",      "4u",
// 							    "totalNeedBw",      "4u",
// 							    "assignedBw",       "4u",
// 							    "packetsReceived",  "4u",
// 							    "packetsLost",      "4u",
// 							    "avgLatency",       "4u"
// 							   );
// 		       },
// 		       callback);
// 	},


// 	/**
// 	 * Return mote configuration.
// 	 * @param eui64 
// 	 * @param next
// 	 * @param callback
// 	 * @return {Dust.MoteConfig}
// 	 */
// 	getMoteCfg: function (/** String */eui64, /** Boolean */next, /** DFLT_ASYNC_CB */callback) {
// 	    if (BC.is(callback)) { return BC.exec(arguments.callee, this, arguments); }
// 	    var _this = this;
// 	    this.sendCommand2(Dust.CMDTYPE.GET_MOTE_CFG, Formatter.pack("8E1u", eui64, next||0), function(result) {
// 		if (result.code!==0) {
// 		    callback(result);
// 		    return;
// 		}
// 		var pend = result.getData();
// 		if (pend.getCode() === Dust.RESPCODE.E_LIST) {
// 		    if (!next) { 
// 			callback(new AOP.ERR(sprintf("%s: No such mote: %s", _this, eui64)));
// 		    } else {
// 			callback(new AOP.OK(null));
// 		    }
// 		    return;
// 		}
// 		if (_this._ckMsg2(pend,14, undefined, callback)) {
// 		    return;
// 		}
// 		callback(new AOP.OK(Util.Formatter.unpackObj2(new Dust.MoteConfig(), pend.getMessage(),0,
// 		    "mac",              "8E",
// 		    "moteId",           "2u",
// 		    "isAP",             "1u",
// 		    "state",            "1u",
// 		    "mobilityType",     "1u",
// 		    "isRouting",        "1u"
// 		    )));
// 		});
// 	},



// 	/**
// 	 * Return mote configurations.
// 	 * @param callback
// 	 * @returns {Dust.MoteConfig[]}
// 	 */
// 	getAllMoteCfg: function (/** DFLT_ASYNC_CB */callback) {
// 	    if (BC.is(callback)) { return BC.exec(arguments.callee, this, arguments); }
// 	    //var eui = "00-00-00-00-00-00-00-00";
// 	    var _this = this;
// 	    var list = [];
// 	    var f = function(result) {
// 		if (result.code !== 0) {
// 		    callback(result);
// 		    return;
// 		}
// 		var r = result.getData();
// 		if (r === null) {
// 		    callback(new AOP.OK(list));
// 		    return;
// 		}
// 		list.push(r);
// 		_this.getMoteCfg(r.mac,1, f);
// 	    };
// 	    this.getMoteCfg("00-00-00-00-00-00-00-00",1, f);
// 	},


// 	/**
// 	 * Reset network.
// 	 * XXX: does not work
// 	 * @param callback
// 	 */
// 	resetNetwork: function (/** DFLT_ASYNC_CB */callback) {
// 	    if (BC.is(callback)) { return BC.exec(arguments.callee, this, arguments); }
// 	    this.sendCommand3(Dust.CMDTYPE.RESET, Formatter.pack("1u8u", Dust.RESET.NETWORK, 0), 8, undefined, undefined, callback);
// 	},


// 	/**
// 	 * Reset system.
// 	 * XXX: does not work
// 	 * @param callback
// 	 */
// 	resetSystem: function (/** DFLT_ASYNC_CB */callback) {
// 	    if (BC.is(callback)) { return BC.exec(arguments.callee, this, arguments); }
// 	    this.sendCommand3(Dust.CMDTYPE.RESET, Formatter.pack("1u8u", Dust.RESET.SYSTEM, 0), 8, undefined, undefined, callback);
// 	},


// 	/**
// 	 * Return info.
// 	 * @param callback
// 	 * @returns {Dust.SysInfo}
// 	 */
// 	getSysInfo: function (/** DFLT_ASYNC_CB */callback) {
// 	    if (BC.is(callback)) { return BC.exec(arguments.callee, this, arguments); }
// 	    this.sendCommand3(Dust.CMDTYPE.GET_SYSINFO,"", 
// 		       15, undefined, 
// 		       function(msg) {
// 			   return Util.Formatter.unpackObj2(new Dust.SysInfo(), msg, 0, "mac", "8E", "hwModel", "1u", "hwRev", "1u", "swMajor", "1u", "swMinor", "1u", "swPatch", "1u", "swBuild", "2u");
// 		       },
// 		       callback);
// 	},


// 	/**
// 	 * Return manager statistics. 
// 	 * @param callback
// 	 * @returns {Dust.ManagerStats}
// 	 */
// 	getManagerStats: function (callback) {
// 	    if (BC.is(callback)) { return BC.exec(arguments.callee, this, arguments); }
// 	    this.sendCommand3(Dust.CMDTYPE.GET_MANAGER_STATS,"", 
// 		       22, undefined, 
// 		       function(msg) {
// 			   return Util.Formatter.unpackObj2(new Dust.ManagerStats(), msg, 0,
// 							    "serTxCnt",         "2u",
// 							    "serRxCnt",         "2u",
// 							    "serCRCErr",        "2u",
// 							    "serRxOverruns",    "2u",
// 							    "apiEstabConn",     "2u",
// 							    "apiDroppedConn",   "2u",
// 							    "apiTxOk",          "2u",
// 							    "apiTxErr",        "2u",
// 							    "apiTxFail",        "2u",
// 							    "apiRxOk",          "2u",
// 							    "apiRxProtErr",     "2u"
// 							   );
// 		       },
// 		       callback
// 		      );
// 	},


// 	/**
// 	 * Ping a mote
// 	 * @param eui
// 	 * @param callback
// 	 * @returns {Dust.PingResp}
// 	 */
// 	pingMote: function(/** String */eui, /** DFLT_ASYNC_CB */callback) {
// 	    if (BC.is(callback)) { return BC.exec(arguments.callee, this, arguments); }
// 	    this.sendCommand4(Dust.CMDTYPE.PING_MOTE, Formatter.pack("8E", eui), undefined, callback);
// 	},


// 	/**
// 	 * @param eui1
// 	 * @param eui2
// 	 * @param callback
// 	 * @returns {Dust.PathInfo}
// 	 */
// 	getPathInfo: function(/** String */eui1, /** String */eui2, /** DFLT_ASYNC_CB */callback) {
// 	    if (BC.is(callback)) { return BC.exec(arguments.callee, this, arguments); }
// 	    this.sendCommand3(Dust.CMDTYPE.GET_PATH, Formatter.pack("8E8E", eui1, eui2),
// 		       21, undefined, 
// 		       function(msg) {
// 			   return Util.Formatter.unpackObj2(new Dust.PathInfo(), msg, 0,
// 							    "source",              "8E",
// 							    "dest",            "8E",
// 							    "direction",          "1u",
// 							    "numLinks",          "1u",
// 							    "quality",          "1u",
// 							    "rssiSrcDest",          "1s",
// 							    "rssiDestSrc",          "1s"
// 							   );
// 		       },
// 		       callback);
// 	},


// 	/**
// 	 * @param eui
// 	 * @param filter
// 	 * @param pathId
// 	 * @param callback
// 	 * @returns {Dust.PathInfo}
// 	 */
// 	getNextPath: function(/** String */eui, /** Number */filter, /** Number */pathId, /** DFLT_ASYNC_CB */callback) {
// 	    if (BC.is(callback)) { return BC.exec(arguments.callee, this, arguments); }
// 	    var _this = this;
// 	    this.sendCommand2(Dust.CMDTYPE.GET_NEXT_PATH, Formatter.pack("8E1u2u", eui, filter||0, pathId||0), function(result) {
// 			   if (result.code!==0) {
// 			       callback(result);
// 			       return;
// 			   }
// 			   var pend = result.getData();
// 			   if( pend.getCode() == Dust.RESPCODE.E_LIST ) {
// 			       callback(new AOP.OK(null)); // end of iteration
// 			       return;
// 			   }
// 			   if (_this._ckMsg2(pend, 23, undefined, callback)) {
// 			       return;
// 			   }
// 			   callback(new AOP.OK(Util.Formatter.unpackObj2(new Dust.PathInfo(), pend.getMessage(),0,
// 									 "pathId",              "2u",
// 									 "source",              "8E",
// 									 "dest",            "8E",
// 									 "direction",          "1u",
// 									 "numLinks",          "1u",
// 									 "quality",          "1u",
// 									 "rssiSrcDest",          "1s",
// 									 "rssiDestSrc",          "1s"
// 									)));
// 		       });
// 	},


// 	/**
// 	 * Returns map of eui to Dust.PathInfo[].
// 	 * @param eui If undefined, all current motes are queried
// 	 * @param callback
// 	 * @returns {Dust.PathInfos}
// 	 */
// 	getAllPaths: function(/** String */eui, /** DFLT_ASYNC_CB */callback) {
// 	    if (BC.is(callback)) { return BC.exec(arguments.callee, this, arguments); }
// 	    var _this = this;
// 	    var euis;
// 	    if (!eui) {
// 		euis = Sonoran.Registry.lookupMotesByFunc(function(mote) { return mote.getClass()===Dust.HW_MOTE_CLASS; }).map(function(mote) { return mote.getUniqueid(); });
// 	    } else {
// 		euis = [ eui ];
// 	    }
// 	    assert(euis.length > 0);
// 	    var ret = new Dust.PathInfos();
// 	    var eidx = 0;
// 	    var pathId = 0;
// 	    var list = [];
// 	    var f = function(result) {
// 		if (result.code!==0) {
// 		    callback(result);
// 		    return;
// 		}
// 		var info = result.getData();
// 		if (info) {
// 		    list.push(info);
// 		    pathId = info.pathId;
// 		    _this.getNextPath(euis[eidx], undefined, pathId, f);
// 		} else {
// 		    ret.addPathInfos(euis[eidx], list);
// 		    list = [];
// 		    eidx += 1;
// 		    if (eidx >= euis.length) {
// 			callback(new AOP.OK(ret));
// 			return;
// 		    } else {
// 			pathId = 0;
// 			_this.getNextPath(euis[eidx], undefined, pathId, f);
// 		    }
// 		}
// 	    };
// 	    _this.getNextPath(euis[eidx], undefined, pathId, f);
// 	},


// 	/**
// 	 * Get network info.
// 	 * @param callback
// 	 * @returns {Dust.NetworkInfo}
// 	 */
// 	getNetworkInfo: function(/** DFLT_ASYNC_CB */callback) {
// 	    if (BC.is(callback)) { return BC.exec(arguments.callee, this, arguments); }
// 	    this.sendCommand3(Dust.CMDTYPE.GET_NET_INFO, "", 
// 		       29, undefined, 
// 		       function(msg) {
// 			   return Util.Formatter.unpackObj2(new Dust.NetworkInfo(), msg, 0, 
// 							    "numMotes",           "2s",
// 							    "asnSize",            "2u",
// 							    "advertisementState", "1u",
// 							    "downFrameState",     "1u",
// 							    "netReliability",     "1u",
// 							    "netPathStability",   "1u",
// 							    "netLatency",         "4u",
// 							    "netState",           "1u"
// 							   );
// 		       },
// 		       callback);
// 	},


// 	/**
// 	 * Get network comfig.
// 	 * @param callback
// 	 * @returns {Dust.NetworkConfig}
// 	 */
// 	getNetworkConfig: function(/** DFLT_ASYNC_CB */callback) {
// 	    if (BC.is(callback)) { return BC.exec(arguments.callee, this, arguments); }
// 	    this.sendCommand3(Dust.CMDTYPE.GET_NET_CFG, "", 
// 		       21, undefined, 
// 		       function(msg) {
// 			   return Util.Formatter.unpackObj2(new Dust.NetworkConfig(), msg, 0,
// 							    "networkId",        "2u",
// 							    "apTxPower",        "1u",
// 							    "frameProfile",     "1u",
// 							    "maxMotes",         "2u",
// 							    "baseBandwidth",    "2u",
// 							    "downFrameMultVal", "1u",
// 							    "numParents",       "1u",
// 							    "enableCCA",        "1u",
// 							    "channelList",      "2u",
// 							    "autoStartNetwork", "1u",
// 							    "locMode",          "1u",
// 							    "bbMode",           "1u",
// 							    "bbSize",           "1u",
// 							    "isRadioTest",      "1u",
// 							    "bwMult",           "2u",
// 							    "oneChannel",       "1u");
// 		       },
// 		       callback);
// 	},


// 	/**
// 	 * Start network.
// 	 * @param callback
// 	 */
// 	startNetwork: function(/** DFLT_ASYNC_CB */callback) {
// 	    if (BC.is(callback)) { return BC.exec(arguments.callee, this, arguments); }
// 	    this.sendCommand3(Dust.CMDTYPE.START_NETWORK, "", 0, undefined, undefined, callback);
// 	},


// 	/**
// 	 * Set advertising.
// 	 * @param advertising
// 	 * @param callback
// 	 */
// 	setAdvertising: function(/** Boolean */advertising,  /** DFLT_ASYNC_CB */callback) {
// 	    if (BC.is(callback)) { return BC.exec(arguments.callee, this, arguments); }
// 	    this.sendCommand4(Dust.CMDTYPE.SET_ADVERTISING, Formatter.pack("1u", advertising), 30000, callback);
// 	},


// 	/**
// 	 * Set downstream frame mode.
// 	 * @param frameMode
// 	 * @param callback
// 	 */
// 	setDownFrameSize: function(/** Number */frameMode,  /** DFLT_ASYNC_CB */callback) {
// 	    if (BC.is(callback)) { return BC.exec(arguments.callee, this, arguments); }
// 	    this.sendCommand4(Dust.CMDTYPE.SET_DFRAME_MULT, Formatter.pack("1u", frameMode), 30000, callback);
// 	},


	
// 	/**
// 	 * Distribute new network id to motes.
// 	 * @param id
// 	 * @param callback
// 	 */
// 	exchangeNetworkId: function(/** Number */netwId, /** DFLT_ASYNC_CB */callback) {
// 	    if (BC.is(callback)) { return BC.exec(arguments.callee, this, arguments); }
// 	    this.sendCommand4(Dust.CMDTYPE.EXCH_NETWORKID, Formatter.pack("2u", netwId), 60000, callback);
// 	},


// 	/**
// 	 * Returns ip config.
// 	 * @param callback
// 	 * @returns {Dust.IPConfig}
// 	 */
// 	getIPCfg: function(/** DFLT_ASYNC_CB */callback) {
// 	    if (BC.is(callback)) { return BC.exec(arguments.callee, this, arguments); }
// 	    this.sendCommand3(Dust.CMDTYPE.GET_IP_CFG, "", 32, undefined, 
// 		       function(msg) {
// 			   return Util.Formatter.unpackObj2(new Dust.IPConfig(), msg, 0, "ip6addr", "16d", "mask", "16d");
// 		       }, 
// 		       callback);
// 	},


// 	/**
// 	 * Set ip config.
// 	 * @param conf
// 	 * @param callback
// 	 */
// 	setIPCfg: function(/** Dust.IPConfig */conf, /** DFLT_ASYNC_CB */callback) {
// 	    if (BC.is(callback)) { return BC.exec(arguments.callee, this, arguments); }
// 	    this.sendCommand3(Dust.CMDTYPE.SET_IP_CFG, Formatter.pack("16d16d", conf.ip6addr, conf.mask), 0, undefined, undefined, callback);
// 	},


// 	/**
// 	 * The getTime command return current manager UTC time and current Absolute Slot Number.
// 	 * @param callback
// 	 * @returns {Dust.TimeInfo}
// 	 */
// 	getTime: function(/** DFLT_ASYNC_CB */callback) {
// 	    if (BC.is(callback)) { return BC.exec(arguments.callee, this, arguments); }
// 	    this.sendCommand3(Dust.CMDTYPE.GET_TIME, "", 23, undefined,
// 		       function(msg) {
// 			   return Util.Formatter.unpackObj2(new Dust.TimeInfo(),
// 							    msg, 0,
// 							    "uptime",    "4u",
// 							    "utcSecs",   "8u",
// 							    "utcMicros", "4u",
// 							    "asn",       "5u",
// 							    "asnOffset", "2u");
// 		       }, 
// 		       callback);
// 	},


// 	/**
// 	 * The setTime command sets the UTC time on the Manager. This command may only be executed when the network is not running.
// 	 * @param timePin
// 	 * @param micros
// 	 * @param callback
// 	 */
// 	setTime: function(/** Boolean */timePin, /** Number */micros, /** DFLT_ASYNC_CB */callback) {
// 	    if (BC.is(callback)) { return BC.exec(arguments.callee, this, arguments); }

// 	    timePin = timePin?1:0;
// 	    var secs = micros/(1000*1000);
// 	    var usecs = micros%(1000*1000);

// 	    this.sendCommand3(Dust.CMDTYPE.SET_TIME, Formatter.pack("1u1u4s4u", timePin, 0, secs, usecs), 0, undefined, undefined, callback);
// 	},


// 	/**
// 	 * Sends a request to a set of motes to generate distance measurements to a mobile mote.
// 	 * @param numFrames
// 	 * @param mobileMote
// 	 * @param fixedMotes
// 	 * @param callback
// 	 */
// 	startLocation: function(/** Number */numFrames, /** String */mobileMote, /** String[] */fixedMotes, /** DFLT_ASYNC_CB */callback) {
// 	    if (BC.is(callback)) { return BC.exec(arguments.callee, this, arguments); }

// 	    assert(fixedMotes.length>=1);
// 	    var data = Formatter.pack("1u8E", numFrames, mobileMote);
// 	    fixedMotes.forEach(function(eui) { data += Formatter.pack("8E", mobileMote); });

// 	    this.sendCommand4(Dust.CMDTYPE.START_LOCATION, data, 50000, callback);
// 	},


// 	/**
// 	 * The getLog command retrieves logs from the Picard or a mote specified by MAC address.
// 	 * @param eui
// 	 * @param callback
// 	 */     
// 	getLog: function(/** String */eui, /** DFLT_ASYNC_CB */callback) {
// 	    if (BC.is(callback)) { return BC.exec(arguments.callee, this, arguments); }
// 	    this.sendCommand3(Dust.CMDTYPE.GET_LOG, Formatter.pack("8E", eui), 0, undefined, undefined, callback);
// 	},


// 	/**
// 	 * The measureRSSI command starts a distributed RSSI measurement across all channels.
// 	 * @param duration
// 	 * @param callback
// 	 */
// 	measureRSSI: function(/** Number */duration, /** DFLT_ASYNC_CB */callback) {
// 	    if (BC.is(callback)) { return BC.exec(arguments.callee, this, arguments); }
// 	    this.sendCommand3(Dust.CMDTYPE.MEASURE_RSSI, Formatter.pack("2u", duration), 0, undefined, undefined, callback);
// 	}
//     }
// );







// Dust.Connection.extend(
//     "Dust.LIPConnection",
//     /**
//      * @lends Dust.LIPConnection.prototype
//      */
//     {
// 	/**
// 	 * @augments Dust.Connection
// 	 * @constructs
// 	 * @param hwport
// 	 */
// 	__constr__: function(/** String */hwport) {
// 	    //QUACK(0,"before open ...\n");
// 	    var device = Sonoran.LIP.Local.openDevice(hwport, this, BLCK);
// 	    //QUACK(0,"After open.\n");
// 	    device.setLogLevel(Sonoran.LIP.PARA_LOGLVL_HOST, Sonoran.LIP.LOG_ALL, BLCK);
// 	    device.setLogLevel(Sonoran.LIP.PARA_LOGLVL_MOTE, Sonoran.LIP.LOG_ALL, BLCK);

// 	    Thread.sleep(1000);

// 	    var state = device.getState(BLCK);
// 	    //QUACK(0, "Dust.Connection: LIP state: " + Sonoran.LIP.STATE2STR[state]);
// 	    if (state !== Sonoran.LIP.STATE_MOTE_UP) {
// 		//QUACK(0, "Dust.Connection: closing..");
// 		device.close(SCB);
// 		//QUACK(0, "After close.");
// 		throw new Exception("Mote is not up: state is " + Sonoran.LIP.STATE2STR[state]);
// 	    }
// 	    this.device = device;
// 	    Dust.Connection.call(this, sprintf("Dust<%s>", hwport));
// 	    this.device = device;
// 	},


// 	/**
// 	 * Handle event from native code.
// 	 * @param blob
// 	 * @private
// 	 */
// 	onLIPEvent: function(blob) {
// 	    //QUACK(0, "LIP_EV: " + Util.formatData(blob));
//             //var mote = this.mote;
// 	    var msg;
//             switch(blob.event) {
//             case Sonoran.LIP.EV_MOTE_LOST: {
// 		msg = "EV_MOTE_LOST: for " + this;
// 		if (this.gatewayMote) { this.gatewayMote.updateState(Sonoran.Mote.OFF); }
// 		this.close(new AOP.ERR(ERR_GENERIC, "Mote lost due to LIP.EV_MOTE_LOST event"));
// 		break;
//             }
//             case Sonoran.LIP.EV_MOTE_RESET: {
// 		msg = "EV_MOTE_RESET: for " + this;
// 		if (this.gatewayMote) { this.gatewayMote.updateState(Sonoran.Mote.RESET); }
// 		break;
//             }
//             case Sonoran.LIP.EV_MOTE_ALIVE: {
// 		msg = "EV_MOTE_ALIVE: for " + this.device;
// 		if (this.gatewayMote) { this.gatewayMote.updateState(Sonoran.Mote.ON); }
// 		break;
//             }
//             case Sonoran.LIP.EV_DEVICE_OPENED: {
// 		msg = "EV_DEVICE_OPENED: for " + this;
// 		//mote.updateState(Sonoran.Mote.OFF);
// 		break;
//             }
//             case Sonoran.LIP.EV_DEVICE_CLOSED: {
// 		msg = "EV_DEVICE_CLOSED: for " + this;
// 		this.close(new AOP.ERR(ERR_GENERIC, "Mote lost due to LIP.EV_DEVICE_CLOSED event"));
// 		if (this.gatewayMote) { this.gatewayMote.updateState(Sonoran.Mote.OFF); }
// 		break;
//             }
//             case Sonoran.LIP.EV_DATA_FRAME: {
// 		//QUACK(0, "DATA_FRAME: " + Formatter.binToHex(blob.data));
// 		this.onEdgeMoteMessage(blob.data);
// 		break;
//             }
// 	    default:
// 		assert(0, sprintf("Unexpected lip event: %s", Util.formatData(blob)));
//             }
// 	    if (msg) {
// 		//QUACK(0, msg);
// 		Logger.log(Logger.INFO, Sonoran.Logger.HWPORT, msg);
// 	    }
// 	},

// 	/**
// 	 * @param reason
// 	 */
// 	close: function (/** AOP.Result */reason) {
// 	    if (this.device) {
// 		this.device.close(SCB);
// 		Dust.Connection.prototype.close.call(this, reason);
// 	    }
// 	},

// 	/**
// 	 * Overriden.
// 	 * @param cmdtype
// 	 * @param msg
// 	 * @returns {String}
// 	 * @private
// 	 */
// 	formatCommand: function(/** ENUM */cmdtype, /** String */msg) {
// 	    //var outmsg = Formatter.pack("4u2u2u1u*d", Dust.SMux.MAGIC, msg.length+3, 0, cmdtype, msg);
// 	    var outmsg = Formatter.pack("1u*d", cmdtype, msg);
// 	    return outmsg;
// 	},

// 	/**
// 	 * Overridden.
// 	 * @param bytes
// 	 * @private
// 	 */
// 	sendBytes: function(/** String */bytes) {
// 	    this.device.send(bytes, BLCK);
// 	}
//     }
// );







// /**
//  * Dust.MoteImpl implements physical, wirless mote reachable by a gateway mote.
//  * @class
//  * @augments Sonoran.MoteImpl
//  * @constructor This constructor registers the new mote with the Sonoran.Registry.
//  * @param uniqueid  Mote uniqueid
//  * @param addr      Mote address
//  */
// Dust.MoteImpl = function(/** String */uniqueid, /** String */addr, /** Boolean */noMR) {
//     var mote = new Sonoran.Mote(uniqueid, addr, Dust.HW_MOTE_CLASS, this, null, null);
//     Sonoran.MoteImpl.call(this, mote);
//     assert(this.mote == mote);
//     var name = uniqueid.substr(15);
//     mote.setName(name, Dust.HW_MOTE_CLASS);
//     mote.setState(Sonoran.Mote.OFF);
//     if (noMR) {
// 	mote.noMR = true;
//     }
//     Sonoran.Registry.registerMote(mote);
// };

// /** Prototype. */
// Dust.MoteImpl.prototype = extend(
//     Sonoran.MoteImpl.prototype,
//     /** @lends Dust.MoteImpl.prototype */
//     {
//         /**
//          * @returns {String} string representation.
//          */
//         toString: function() {
//             return this.mote.name;
//         },

// 	reset: function(timeout, mode, callback) {
// 	    if (BC.is(callback)) { return BC.exec(arguments.callee, this, arguments); }
// 	    var mote = this.mote;
// 	    var gateway = mote.getGatewayP();
// 	    var prevState = mote.getState();
// 	    mote.updateState(Sonoran.Mote.RESET);
// 	    gateway.connection.resetMote(mote.getUniqueid(), function(result) {
// 		//QUACK(0, "RESET callback received: " + result);
// 		if (result.code!==0) {
// 		    mote.updateState(prevState);
// 		    callback(result);
// 		    return;
// 		}
// 		mote.waitForState(Sonoran.Mote.ON, 30000, callback);
// 	    });
// 	},


// 	/**
// 	 * Send a lip packet to a mote. 
// 	 * @param dstport
// 	 * @param srcport
// 	 * @param payload
// 	 * @param optional, timer to start
// 	 */
// 	send: function(/** Number */dstport, /** Number */srcport, /** String */payload, /** Timer.Timer */timer) {
// 	    QUACK(0, "Dust.MoteImpl.send: unsupported send to dust access gateway.");
// 	    if (timer) { Timer.startTimers(timer); }
//             return;
// 	},
    

//         /**
//          * Sleep micros on this mote
//          * @param micros
// 	 * @param callback
// 	 * @throws {AOP.Exception}
//          */
//         sleepOn: function(/** Number */micros, /** DFLT_ASYNC_CB */callback) {
// 	    if (BC.is(callback)) { return BC.exec(arguments.callee, this, arguments); }
//             var timer = new Timer.Timer(Timer.System.getSpan(micros/1000));
//             return timer.start(callback);
//         },
        
//         /**
// 	 * Query and refresh mote state. 
// 	 * @param callback    
// 	 * @throws {AOP.Exception}
// 	 */
//         query: function(/** DFLT_ASYNC_CB */callback) {
// 	    if (BC.is(callback)) { return BC.exec(arguments.callee, this, arguments); }
// 	    callback(new AOP.OK(this));
//         }
//     }
// );










// /**
//  * Objects to keep track of confirmations of SEND_DATA commands. 
//  * @class
//  * @constructor
//  * @param id2op   Map of id to Dust.Callback
//  * @param id      Id
//  * @param callback Optional, function to invoke when SEND_DATA confirmation has been received
//  * @param timeout Optional
//  * @private
//  */
// Dust.Callback = function(/** Object */id2op, /** Number */id, /** Function */callback, /** Number */timeout) {
//     this.id2op = id2op;
//     this.id = id;
//     this.result = null;
//     this.timeout = timeout?timeout:Dust.CALLBACK_TIMEOUT;
//     this.callback = callback;
//     id2op[id] = this;
//     this.timer = new Timer.Timer(this.timeout, undefined, this.onTimeout.bind(this));
//     this.timer.start();
// };

// /**
//  * After a SEND_DATA, check for the confirmation 'callbackId' having already received or
//  * start waiting for it.
//  * @param conn
//  * @param callbackId
//  * @param callback
//  * @private
//  */
// Dust.Callback.ForSend = function(/** Dust.Connection */conn, /** Number */callbackId, /** Number */timeout, /** DFLT_ASYNC_CB */callback) {
//     if (BC.is(callback)) { return BC.exec(arguments.callee, this, arguments); }
//     var cb = conn._callbackIdMap[callbackId];
//     if (cb) {
// 	cb.close(callback);
//     } else {
// 	cb = new Dust.Callback(conn._callbackIdMap, callbackId, callback, timeout);
//     }
// };

// /**
//  * A SEND_DATA confirmation/error has been received. If the sender already waits for it, notify him.
//  * Otherwise save the confirmation/error for later notification.
//  * @param conn
//  * @param callbackId
//  * @param callback
//  * @private
//  */
// Dust.Callback.ForRcv = function(/** Dust.Connection */conn, /** Number */callbackId, /** Object */result) {
//     var cb = conn._callbackIdMap[callbackId];
//     if (cb == null) {
// 	cb = new Dust.Callback(conn._callbackIdMap, callbackId);
//     } 
//     cb.onEvent(result);
// };

// /** */
// Dust.Callback.prototype = {
//     /**
//      * @param result
//      * @private
//      */
//     onTimeout: function(/** AOP.Result*/result) {
// 	this.timer = null;
// 	//printf("OP callback timeout: %d", this.id);
// 	var msg;
// 	if (!this.callback) {
// 	    msg = sprintf("Received callback id for unknown SEND_DATA operation %d", this.id);
// 	} else {
// 	    msg = sprintf("No callback received for SEND_DATA operation %d", this.id);
// 	}
// 	this.result = new AOP.ERR(ERR_TIMEOUT, msg);
// 	Dust._err(msg);
// 	this.close();
//     },

//     /**
//      * @param data
//      * @private
//      */
//     onEvent: function(/** Object */data) {
// 	//printf("OP on event callback: id %d data %s\n", this.id, data.toString());
// 	this.result = new AOP.OK(data);
// 	if (this.callback) {
// 	    this.close();
// 	}
//     },

//     /**
//      * @param callback Optional
//      * @private
//      */
//     close: function(/** DFLT_ASYNC_CB */callback) {
// 	//printf("OP close: %d\n", this.id);
// 	if (callback) {
// 	    assert(!this.callback);
// 	    this.callback = callback;
// 	}
// 	assert(this.result);
// 	if (this.timer) {
// 	    this.timer.cancel();
// 	    this.timer = null;
// 	}
// 	delete this.id2op[this.id];
// 	if (!this.callback) {
// 	    assert(this.result.code===ERR_TIMEOUT);
// 	    //printf("IGNORE command finished event..\n");
// 	} else {
// 	    this.callback(this.result);
// 	}
//     }
// };






// /**
//  * Instances keep track of sent command and its response.
//  * @class
//  * @constructor
//  * @param conn
//  * @param cmdtype
//  */
// Dust.Command = function(/** Dust.Connection */conn, /** Number */cmdtype) {
//     this.cmdtype = cmdtype;
//     this.conn = conn;
//     this.result = null;
//     this.callback = null;
// };

// /** */
// Dust.Command.prototype = {
//     /**
//      * @returns {Number} response code
//      */
//     getCode: function() {
// 	assert(this.result);
// 	return this.result.code;
//     },

//     /**
//      * @returns {String} message received for command
//      */
//     getMessage: function() {
// 	if (!this.result) {
// 	    throw sprintf("No response received yet for command '%d'", this.cmdtype);
// 	}
// 	var code = this.result.code;
// 	if (code !== 0) {
// 	    //printf("%s\n", Runtime.getStackTrace().toString());
// 	    throw sprintf("Received error: %d %s", code, Dust.RESPCODE.toStr(code));
// 	}
// 	//QUACK(0, "GETMESSAGE: " + this.result.getData());
// 	return this.result.getData();
//     },

//     /**
//      * Called when response has been received.
//      * @param code
//      * @param msg
//      */
//     onMessage: function(/** Number */code, /** String */msg) {
// 	assert(typeof(code)==='number');
// 	//QUACK(0, "ONMESSAGE: " + code + ", length " + (msg?msg.length:"0"));
// 	this.result = (code===0) ? new AOP.OK(msg) : new AOP.ERR(code, msg);
// 	this.conn._setupTimeout(this.conn._pendCmds.length > 0);
// 	this.close();
//     },

//     /**
//      * On communication error.
//      * @param result
//      * @private
//      */
//     onError: function(/** AOP.ERR */result) {
// 	//QUACK(0, "ONERROR: ...");
// 	assert(result);
// 	this.result = result;
// 	this.close();
//     },
	
//     /**
//      * @private
//      */
//     close: function() {
// 	//QUACK(0, "CLOSE: " + this.result.code + ", " + this.result);
// 	assert(this.result);
// 	assert(this.callback);
// 	var callback = this.callback;
// 	this.callback = null;
// 	callback(new AOP.OK(this));
//     },

//     /**
//      * @private
//      */
//     toString: function() {
// 	return "Dust.Command";
//     }
// };







// /**
//  * The current connection or null.
//  * @type Dust.Connection
//  */
// Dust.connection = null;


// /**
//  * Connect and return connection.
//  * @param port
//  * @returns {Dust.Connection} the connection
//  * @private
//  */
// Dust.connect = function (/** Number */port) {
//     //if (!port) { port = Dust.SMux.DFLT_PORT; }	
//     if (Dust.connection) {
// 	try {
// 	    Dust.connection.close(new AOP.ERR("Closed on reconnecting"));
// 	} catch(ex) {
// 	    QUACK(0, Runtime.dumpException(ex));
// 	}
// 	Dust.connection = null;
//     }
//     if (typeof(port) === 'string') {
// 	Dust.connection = new Dust.LIPConnection(port + ":160");
//     } else {
// 	if (!port) { port = Dust.SMux.DFLT_PORT; }	
// 	if (!Win32.runOnWindows()) { 
// 	    throw new Exception("SMux support only available on Windows platform");
// 	}
// 	Dust.connection = new Dust.SMux.Connection(port);
//     }
//     return Dust.connection;
// };


// /**
//  * @returns {Dust.Connection} connection or null
//  */
// Dust.getConnection = function() {
//     return Dust.connection;
// };





// /**
//  * Handles the communication with the smux daemon.
//  * @namespace Dust.SMux 
//  */
// Dust.SMux = {};


// /**
//  * Constant. Option "Dust.SMux.DFLT_PORT".
//  * @type Number
//  * @constant
//  */
// Dust.SMux.DFLT_PORT        = 9900;          
// OPTIONS.add("Dust.SMux.DFLT_PORT",        'int');


// /**
//  * Constant.
//  * @type Number
//  * @constant
//  * @private
//  */
// Dust.SMux.MAGIC            = 0xA740A0F5;



// /**
//  * @returns {Object}
//  * @private
//  */
// Dust.SMux.loadSerialMuxCfg = function() {
//     var relpath = "/Application Data/Dust Networks/Stargazer/Default/serial_mux/serial_mux.cfg";
//     var path = Win32.getAllUsersProfilePath() + relpath;
//     if (!IO.File.exists(path)) {
// 	path = Win32.getUserProfilePath() + relpath;
//     }
//     if (!IO.File.exists(path)) {
// 	throw "Cannot find serial_mux.cfg in the Stargazer settings directory";
//     }
//     var conf = {};
//     IO.File.readFully(path).split(/(\r)?\n/).forEach(function(l) {
// 	if (/\s*#/.test(l)) {
// 	    return;
// 	}
// 	var md = /^\s*([^\s=]+)\s*=\s*([^\s]+)\s*/.exec(l);
// 	if (md) {
// 	    if (/^\d+$/.test(md[2])) {
// 		conf[md[1]] = parseInt(md[2]);
// 	    } else {
// 		conf[md[1]] = md[2];
// 	    }
// 	}
//     });
//     return conf;
// };


// /**
//  * @returns {Number}
//  * @private
//  */
// Dust.SMux.loadSerialMuxCfgListenPort = function() {
//     var conf = Dust.SMux.loadSerialMuxCfg();
//     if (conf.listen) {
// 	return conf.listen;
//     }
//     throw "No 'listen' property specified in serial_mux.cfg";
// };


// /**
//  * @private
//  */
// Dust.SMux.startSMux = function(/** DFLT_ASYNC_CB */callback) {
//     if (BC.is(callback)) { return BC.exec(arguments.callee, this, arguments); }
//     IO.Process.start("net", [ "start", "SerialMux_Default" ], function(res) {
// 	//QUACK(0, "startSMUX: calling back..");
// 	callback(new AOP.OK());
//     });
// };







// Dust.Connection.extend(
//     "Dust.SMux.Connection",
//     /**
//      * @lends Dust.SMux.Connection.prototype
//      */
//     {
// 	/**
// 	 * @augments Dust.Connection
// 	 * @constructs
// 	 * @param port
// 	 */
// 	__constr__: function(/** Number */port) {
// 	    if(!port) { port = Dust.SMux.DFLT_PORT; }
// 	    this._sock = null;
// 	    this._buf = '';
// 	    this._mlen = -1;  // total length of expected msg
// 	    this._sock = new IO.TCPSocket();
// 	    var host = 'localhost';
// 	    var result = this._sock.open(host, port, SCB);
// 	    if (result.code !== 0) {
// 		Dust.SMux.startSMux(SCB);
// 		Thread.sleep(1000);
// 		this._sock = new IO.TCPSocket();
// 		result = this._sock.open(host, port, SCB);
// 	    }
// 	    if (result.code !== 0) {
// 		throw new Exception("Could not connect to SMux service: " + result.toString());
// 	    }

// 	    var _this = this;
// 	    this._sock.onClose = function (status) {
// 		_this._sock = null;
// 		_this.close(status);
// 	    };
// 	    this._sock.onBlob = this._onBlob.bind(this);

// 	    Dust.Connection.call(this, sprintf("Dust<%d>", port), true);
// 	},

// 	/**
// 	 * Socket
// 	 * @type IO.TCPSocket
// 	 * @private
// 	 */
// 	_sock: null,

// 	/**
// 	 * Socket data buffer
// 	 * @type String
// 	 * @private
// 	 */
// 	_buf: null,
    
// 	/**
// 	 * Socket data message length
// 	 * @type Number
// 	 * @private
// 	 */
// 	_mlen: -1,


// 	/**
// 	 * @param blob  Incoming socket message
// 	 * @private
// 	 */
// 	_onBlob: function (/** Object */blob) {
// 	    // Response message format:
// 	    //   0   4  MAGIC
// 	    //   4   2  length (remaining bytes)
// 	    //   6   2  0 - RFU (command id)
// 	    //   8   1  cmd type
// 	    //   9   1  response code
// 	    //  10.. n  payload
//             this._buf += blob.data;
// 	    var len = this._buf.length;
// 	    var mlen;
// 	    while(true) {
// 		if( len < 8 )
// 		    return;
// 		if( this._mlen < 0 ) {
// 		    var a = Util.Formatter.unpack("4u2u2u", this._buf);
// 		    if( a[0] != Dust.SMux.MAGIC ) {
// 			this.close(sprintf("Protocol failure: Bad magic 0x%08X", a[0]));
// 			return;
// 		    }
// 		    this._mlen = mlen = 6+a[1];
// 		    if( a[2] != 0 ) {
// 			this.close(sprintf("Protocol failure: Non zero RFU command id: id=%d", a[2]));
// 			return;
// 		    }
// 		}
// 		if( len < mlen )
// 		    return;  // need more data
// 		if( len < 10 ) {
// 		    this.close(sprintf("Protocol failure: Message too small: len=%d", len));
// 		    return;
// 		}

// 		try {
// 		    this.onEdgeMoteMessage(this._buf.substring(8, mlen));
// 		} catch (x) {
// 		    QUACK(0, "SMux protocol failure: " + x + "\n" + Runtime.dumpException(x));
// 		}

// 		this._buf = this._buf.substring(mlen);
// 		//QUACK(0, sprintf("SHORTEN BUFFER to len %d", this._buf.length));
// 		len = this._buf.length;
// 		this._mlen = -1;
// 	    } // while
// 	},


// 	/**
// 	 * @param reason
// 	 */
// 	close: function (/** AOP.Result */reason) {
// 	    if (this._sock) {
// 		this._sock.close(reason, function(res){});
// 		Dust.Connection.prototype.close.call(this, reason);
// 	    }
// 	},

// 	/**
// 	 * Overriden.
// 	 * @param cmdtype
// 	 * @param msg
// 	 * @returns {String}
// 	 * @private
// 	 */
// 	formatCommand: function(/** ENUM */cmdtype, /** String */msg) {
// 	    var outmsg = Formatter.pack("4u2u2u1u*d", Dust.SMux.MAGIC, msg.length+3, 0, cmdtype, msg);
// 	    return outmsg;
// 	},

// 	/**
// 	 * Overridden.
// 	 * @param bytes
// 	 * @private
// 	 */
// 	sendBytes: function(/** String */bytes) {
// 	    this._sock.send(bytes);
// 	}
//     }
// );









// //---------------------------------------------------------------------------------------------------------------
// //
// // DustNetwork Commands
// //
// //---------------------------------------------------------------------------------------------------------------

// /**
//  * Command related to DustNetwork motes.
//  * @class
//  * @private
//  */
// Sonoran.CLI.Commands.Dust = {};

// /**
//  * @private
//  */
// Sonoran.CLI.Commands.Dust.USAGE = "Interaction with DustNetworks motes.";

// /**
//  * @private
//  */
// Sonoran.CLI.Commands.Dust.DESCRIPTION =
// "'dust'-commands interact with a DustNetworks collection of motes.\n" +
// "Interaction requires access to a manager mote via a serial mux service\n"+
// "from DustNetworks (default port 9900).\n"; 


// /**
//  * Dust Start command.
//  *  @class 
//  * @constructor
//  * @private
//  */
// Sonoran.CLI.Commands.Dust.ConnectCommand = function(shell, name) {
//     this.description =
//         "Connect to a DustNetworks serial mux service or edge mote.\n" +
//         "An existing connection is terminated before attempting to open a new one.\n";
//     this.portSpec = new GetOpt.Simple("port", sprintf("Port of SMux service or name of serial port."));
//     var seq = new GetOpt.Seq([ this.portSpec ], 0);
//     CLI.Command.call(this, shell, name, [ seq ]);
// };

// /** @private */
// Sonoran.CLI.Commands.Dust.ConnectCommand.prototype = extend(
//     CLI.Command.prototype,
//     {
//         /** @private */
//         exec: function (callback) {
// 	    var port = this.portSpec.getArg();
// 	    //QUACK(0, "PORT: " + port);
// 	    if (!port) {
// 		try {
// 		    port = Dust.SMux.loadSerialMuxCfgListenPort();
// 		} catch(ex) { 
// 		    port = Dust.SMux.DFLT_PORT;
// 		}
// 	    } else if (/^\d+$/.test(port)) {
// 		port = parseInt(port);
// 	    } 
// 	    //QUACK(0, "PORT: " + port);
// 	    var conn = Dust.connect(port);
// 	    callback(new AOP.OK(conn.toString()));
//         }
//     }
// );




// /**
//  * @type String[]
//  * @private
//  */
// Sonoran.CLI.Commands.Dust.INFO_MODES = [ "system", "ninfo", "nconfig", "ip", "stats", "time", "paths", "minfo", "mconfig"  ];

// /**
//  * Dust Start command.
//  *  @class 
//  * @constructor
//  * @private
//  */
// Sonoran.CLI.Commands.Dust.InfoCommand = function(shell, name) {
//     var cmdSpec = new Sonoran.CLI.Spec(name, Sonoran.CLI.DST_ANY_MOTE);
//     this.description =
//         "Get various information from the current Dust connection.";
//     this.modeSpec = new GetOpt.Keywords("mode", "Information to retrieve: " + Sonoran.CLI.Commands.Dust.INFO_MODES.join(","), Sonoran.CLI.Commands.Dust.INFO_MODES);
//     CLI.Command.call(this, shell, cmdSpec, [ this.modeSpec, new GetOpt.EndOfArgs() ]);
// };

// /** @private */
// Sonoran.CLI.Commands.Dust.InfoCommand.prototype = extend(
//     CLI.Command.prototype,
//     {
//         /** @private */
//         exec: function(callback) {
// 	    var motes = this.cmdSpec.motes;
// 	    //QUACK(0, "MOTES: " + (motes?motes.join(","):"none"));
// 	    var conn = Dust.getConnection();
// 	    if (!conn) {
// 		callback(new AOP.ERR("No active dust connection. Use 'dust-connect'."));
// 		return;
// 	    }
// 	    var mode = this.modeSpec.getSelectedKeyword();

// 	    if (mode==="system") {
// 		conn.getSysInfo(callback);
// 		return;
// 	    }

// 	    if (mode==="ninfo") {
// 		conn.getNetworkInfo(callback);
// 		return;
// 	    }

// 	    if (mode==="nconfig") {
// 		conn.getNetworkConfig(callback);
// 		return;
// 	    }

// 	    if (mode==="stats") {
// 		conn.getManagerStats(callback);
// 		return;
// 	    }

// 	    if (mode==="ip") {
// 		conn.getIPCfg(callback);
// 		return;
// 	    }

// 	    if (mode==="time") {
// 		conn.getTime(callback);
// 		return;
// 	    }

// 	    if (mode==="paths") {
// 		conn.getAllPaths(undefined, callback);
// 		return;	
// 	    }

// 	    if (motes.length===0) {
// 		motes = Dust.getAllMotes();
// 	    }
// 	    if (motes.length===0) {
// 		callback(new AOP.ERR("Missing motes"));
// 		return;
// 	    }

// 	    if (mode==="minfo") {
// 		var infos = [];
// 		motes.forEach(function(mote) { infos.push(conn.getMoteInfo(mote.getUniqueid(), BLCK)); });
// 		callback(new AOP.OK(new Dust.SMux.MoteInfos(infos)));
// 		return;
// 	    }

// 	    if (mode==="mconfig") {
// 		var configs = [];
// 		motes.forEach(function(mote) { configs.push(conn.getMoteCfg(mote.getUniqueid(), false, BLCK)); });
// 		callback(new AOP.OK(new Dust.SMux.MoteConfigs(configs)));
// 		return;
// 	    }

// 	    callback(new AOP.ERR("Unexpected mode: " + mode));
//         }
//     }
// );






// /**
//  * @private
//  * @class mote send command.
//  * @constructor
//  */
// Sonoran.CLI.Commands.Dust.SendCommand = function(shell, name) {
//     this.description =
//         "Send data to dust eui. Specify target-port source-port hex-data. Check event log for any answers by the mote.";
//     this.uuidSpec = new GetOpt.Simple("eui", "Target eui");
//     this.dstportSpec = new GetOpt.Number("dstport", "Destination port");
//     this.srcportSpec = new GetOpt.Number("srcport", "Source port");
//     this.dataSpec = new GetOpt.Simple("data", "Data to send");
//     this.restOfArgs = new GetOpt.RestOfArgs("...", "Additonal parameters for data string.");
//     CLI.Command.call(this, shell, name, [ this.uuidSpec, this.dstportSpec, this.srcportSpec, this.dataSpec, this.restOfArgs ]);
// };

// /** @private */
// Sonoran.CLI.Commands.Dust.SendCommand.prototype = extend(
//     CLI.Command.prototype,
//     {
//         /** @private */
//         exec: function(callback) {
// 	    var conn = Dust.getConnection();
// 	    if (!conn) {
// 		callback(new AOP.ERR("No active dust connection. Use 'dust-connect'."));
// 		return;
// 	    }
// 	    var eui;
//             try {
//                 eui = Util.UUID.completeEUI(this.uuidSpec.getArg());
//             } catch (x) {
//                 callback(new AOP.ERR(x.toString()));
//                 return;
//             }
// 	    var dstport = this.dstportSpec.getNumber();
// 	    var srcport = this.srcportSpec.getNumber();
// 	    var data;
// 	    try {
// 	        data = Formatter.transcode(this.dataSpec.getArg(), this.restOfArgs.getRestArgs());
//             } catch(ex) {
// 	        callback(Ex2ERR(ERR_GENERIC, ex, "Invalid data format"));
// 	        return;
//             }
// 	    // see Dust.Gateway.send
// 	    if( dstport < 256 ) {
// 		// LIP specific port
// 		data = Formatter.pack("1u*d", dstport, data);
// 		dstport = Dust.UDP_MR_PORT;
// 	    }
// 	    if( dstport >= 0x10000 ) {
// 		dstport -= 0x10000;  // to reach port 0-255
// 	    }
// 	    conn.sendData2(eui, srcport, dstport, data, undefined, undefined, callback);
//             //callback(new AOP.OK(result));
//         }
//     }
// );








// CLI.commandFactory.addModule("Sonoran.CLI.Commands.Dust");
