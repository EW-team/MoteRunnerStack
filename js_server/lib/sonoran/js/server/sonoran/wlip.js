// //  (C) COPYRIGHT INTERNATIONAL BUSINESS MACHINES CORPORATION 2006-2010
// //                       ALL RIGHTS RESERVED
// //        IBM Research Division, Zurich Research Laboratory
// // --------------------------------------------------------------------



// /** @private */
// Sonoran.WLIP.DEFAULT_ASM_SPEC = new Sonoran.AsmName("wlip-gateway-#.#");


// /**
//  * Sonoran.WLIP.Gateway inherits from Sonoran.Gateway and complements the gateway functionality
//  * implemented by the 'wlip-gateway' assembly.
//  * @class
//  * @augments Sonoran.Gateway
//  * @constructor
//  * @param mote
//  * @param gatewayPort
//  */
// Sonoran.WLIP.Gateway = function(/** Sonoran.Mote */mote,  /** Number */gatewayPort) {
//     Sonoran.Gateway.call(this, mote);

//     this.gatewayPort = gatewayPort||SaguaroDEFS.WLIP_DEFAULT_GTWY_PORT;
//     this.currCmd = null;

//     this.clsock = new Sonoran.Socket();
//     this.clsock.setName("Sonoran.WLIP.Gateway.Cl");
//     this.clsock.onClose = this.shutdown.bind(this); 
//     this.clsock.onData = this.onData.bind(this);

//     this.srvsock = new Sonoran.Socket();
//     var _this = this;
//     this.srvsock.accept = function(blob) {
// 	return (blob.getSrcPort() === _this.gatewayPort && blob.getMote() === _this.gatewayMote) ;
//     };
//     this.srvsock.setName("Sonoran.WLIP.Gateway.Srv");
//     this.srvsock.onData = this.onData.bind(this); 
// };


// /** Prototype */
// Sonoran.WLIP.Gateway.prototype = extend(
//     Sonoran.Gateway.prototype,
//     /** @lends Sonoran.WLIP.Gateway.prototype */
//     {
// 	/**
// 	 * The gateway application sends data from wireless motes to this port, typically 64.
// 	 * @type Number
// 	 * @private
// 	 */
// 	gatewayPort: 0,
	
// 	/**
// 	 * Socket for communicating with the wlip gateway application,
// 	 * especially the exchange of commands.
// 	 * @type Sonoran.Socket
// 	 * @private
// 	 */
// 	clsock: null,

// 	/**
// 	 * Socket listening on the wlip gateway port (usually 64) for
// 	 * incoming messages.
// 	 * @type Sonoran.Socket
// 	 * @private
// 	 */
// 	srvsock: null,

// 	/**
// 	 * Current active command
// 	 * @type Sonoran.WLIP.Command
// 	 * @private
// 	 */
// 	currCmd: null,

// 	/**
// 	 * State for current appeal sequence.
// 	 * @type Sonoran.WLIP.AppealContext
// 	 * @private
// 	 */
// 	appealCtx: null,


// 	/**
// 	 * Opens the socket and connects to the gateway application on the gateway mote. 
// 	 * If this succeeds, Sonoran.Gateway.setState(Sonoran.Gateway.STATE_CONNECTED)
// 	 * is called and the gateway is readyto be used. If this fails, shitdown()
// 	 * is invoked.
// 	 * @param callback
// 	 * @throws {AOP.Exception}
// 	 */
// 	connect: function(/** DFLT_ASYNC_CB */callback) {
// 	    if (this.state != Sonoran.Gateway.STATE_DISCONNECTED) {
// 		throw sprintf("%s: already connected", this.toString());
// 	    }
// 	    if (BC.is(callback)) { return BC.exec(arguments.callee, this, arguments); }
// 	    var _this = this;
// 	    this.clsock.open(0, BLCK); 
// 	    this.srvsock.open(this.gatewayPort, BLCK); 
// 	    this.exchangeCommand(Formatter.pack("1u", SaguaroDEFS.WLIP_CMD_ATTACH), function(status) {
// 		_this.setState(Sonoran.Gateway.STATE_CONNECTED);
// 		if (status.code != 0) {
// 		    _this.shutdown(status, callback);
// 		    return;
// 		} 
// 		var msg = sprintf("Gateway %s: is connected", _this.gatewayMote);
// 		Logger.log(Logger.INFO, Sonoran.Logger.GATEWAY, msg, undefined, _this.gatewayMote);
// 		callback(new AOP.OK());
// 	    });
// 	},




// 	/**
// 	 * Disconnect from the gateway application on the mote. Issues a WLIP_CMD_DETACH message to the
// 	 * wlip gateway application and calls shutdown().
// 	 * @param callback
// 	 * @throws {AOP.Exception}
// 	 * @see Sonoran.Gateway.shutdown
// 	 */
// 	disconnect: function(/** DFLT_ASYNC_CB */callback) {
// 	    if (this.state != Sonoran.Gateway.STATE_CONNECTED) {
// 		throw sprintf("Gateway %s: already disconnected", this.gatewayMote);
// 	    }
// 	    if (BC.is(callback)) { return BC.exec(arguments.callee, this, arguments); }
// 	    var _this = this;
// 	    this.exchangeCommand(String.fromCharCode(SaguaroDEFS.WLIP_CMD_DETACH), function(status) {
// 		_this.shutdown(status, callback);
// 	    });
// 	},


// 	/**
// 	 * Shutdown the connection, close the underlying socket and release resources.
// 	 * Sonoran.Gateway.setState(Sonoran.Gateway.STATE_DISCONNECTED) is invoked
// 	 * which leads to all connected motes being disconnected. The gateway is also removed
// 	 * from its gateway mote.
// 	 * @param status   Optional, result the callback should be invoked with
// 	 * @param callback Optional, callback to invoke with specified status
// 	 */
// 	shutdown: function(/** AOP.Result */status, /** DFLT_ASYNC_CB */callback) {
// 	    if (callback&&BC.is(callback)) { return BC.exec(arguments.callee, this, arguments); }
// 	    if (!status) { status = new AOP.OK(); }
// 	    var msg = sprintf("Gateway %s: is disconnected: %s", this.gatewayMote, status.toString());
// 	    Logger.log(Logger.INFO, Sonoran.Logger.GATEWAY, msg, undefined, this.gatewayMote);
	    
// 	    this.setState(Sonoran.Gateway.STATE_DISCONNECTED);

// 	    if (this.currCmd) {
// 		this.currCmd.close(status);
// 		this.currCmd = null;
//             }
	    
// 	    this.srvsock.close();

// 	    if (!this.clsock.isClosed()) {
// 		this.clsock.close(status, callback);
// 	    } else if (callback) {
// 		callback(status);
// 	    }
// 	},
	

// 	/**
// 	 * @see Sonoran.Gateway.send
// 	 * @param dstmote Wireless target mote
// 	 * @param dstport Port on wirless target mote
// 	 * @param data    Binary string with data
// 	 * @param timer   Optional
// 	 * @private
// 	 */
// 	send: function(/** Sonoran.Mote */dstmote, /** Number */dstport, /** Number */srcport, /** String */data, /** Timer.Timer|Timer.Timer[] */timer) {
//             if (this.state != Sonoran.Gateway.STATE_CONNECTED) {
// 		throw sprintf("Gateway %s: cannot forward message: in disconnected state", this.gatewayMote);
//             }
// 	    assert(dstmote.getSink()==this);
// 	    // eui->toHex->toBin->reverse == 8 Bytes little endian
// 	    var uuid = reverseString(Formatter.hexToBin(Util.UUID.eui642hex(dstmote.getUniqueid())));
// 	    var bytes = String.fromCharCode(SaguaroDEFS.WLIP_CMD_FORWARD) + uuid + Formatter.pack("3u1u*d", 0, dstport, data);
// 	    QUACK(1, "Gateway", "sending bytes " + Formatter.binToHex(bytes));
// 	    try {
// 		this.gatewayMote.send(this.gatewayPort, srcport, bytes, timer);
// 	    } catch (ex) {
// 		throw sprintf("Gateway %s: cannot forward message: %s", this.gatewayMote, ex);
// 	    }
// 	},


// 	/**
// 	 * @see Sonoran.Gateway.broadcast
// 	 * @param dstport 
// 	 * @param srcport 
// 	 * @param data    Binary string with data
// 	 * @param timer
// 	 * @private
// 	 */
// 	broadcast: function(/** Number */dstport, /** Number */srcport, /** String */data, /** Timer.Timer|Timer.Timer[] */timer) {
//             if (this.state != Sonoran.Gateway.STATE_CONNECTED) {
// 		throw sprintf("Gateway %s: cannot broadcast message: in disconnected state", this.gatewayMote);
//             }
// 	    var bytes = String.fromCharCode(SaguaroDEFS.WLIP_CMD_BROADCAST) + Formatter.pack("8u3u1u*d", 0, 0, dstport, data);
// 	    //QUACK(0, "Gateway", "broadcast bytes " + Formatter.binToHex(bytes));
// 	    try {
// 		this.gatewayMote.send(this.gatewayPort, srcport, bytes, timer);
// 	    } catch (ex) {
// 		throw sprintf("Gateway %s: cannot broadcast message: %s", this.gatewayMote, ex);
// 	    }
// 	},


// 	/**
// 	 * Send appeal message and gather HELLO messages from wireless motes in the return object.
// 	 * @param callback
// 	 * @returns {Sonoran.WLIP.AppealInfo}
// 	 * @throws {AOP.Exception}
// 	 */
// 	appeal: function(/** DFLT_ASYNC_CB */callback) {
// 	    if (BC.is(callback)) { return BC.exec(arguments.callee, this, arguments); }
//             if (this.appealCtx) {
// 		throw sprintf("Gateway %s: an appeal-operation is already active", this.gatewayMote);
//             }
//             var appealCtx = new Sonoran.WLIP.AppealContext();
//             this.appealCtx = appealCtx;
//             var motes = this.getGatedMotes();
//             for (var i = 0; i < motes.length; i++) {
// 		var uniqueid = motes[i].getUniqueid();
// 		appealCtx.prevHellos[uniqueid] = motes[i];
//             }
//             var _this = this;
//             var closef = function() {
// 		for (var u in appealCtx.allHellos) {
// 		    delete appealCtx.prevHellos[u];
// 		}
// 		var appeared = Util.Blob.map(appealCtx.allHellos);
// 		var disappeared = Util.Blob.map(appealCtx.prevHellos);
// 		_this.appealCtx = null;
// 		callback(new AOP.OK(new Sonoran.WLIP.AppealInfo(appeared, disappeared)));
//             };
//             var timerf = function() {
// 		appealCtx.intervalTotalCnt += 1;
// 		var intervalHellos = appealCtx.intervalHellos;
// 		appealCtx.intervalHellos = {};
// 		if (Util.Blob.isEmpty(intervalHellos)) {
// 		    appealCtx.intervalEmptyCnt += 1;
// 		    if (appealCtx.intervalEmptyCnt == 2) {
// 			closef();
// 			return;
// 		    }
// 		}
// 		_this.issueCommand(appealCtx.packet);
// 		Timer.timeoutIn(1000, timerf);
//             };
//             this.issueCommand(appealCtx.packet);
//             Timer.timeoutIn(1000, timerf);
// 	},


// 	/**
// 	 * Issue a simple command as APPEAL without expecting a response.
// 	 * @param cmdBytes binary string
// 	 * @private
// 	 */
// 	issueCommand: function(/** String */cmdBytes) {
//             if (this.state != Sonoran.Gateway.STATE_CONNECTED) {
// 		throw sprintf("Gateway %s: cannot issue command message: in disconnected state", this.gatewayMote);
//             }
//             try {
// 		this.clsock.send(cmdBytes, this.gatewayMote, this.gatewayPort);
//             } catch (ex) {
// 		throw sprintf("Gateway %s: cannot send command message: %s", this.gatewayMote, ex);
//             }
// 	},


// 	/**
// 	 * Send a simple command expecting a response.
// 	 * @param cmdBytes binary string
// 	 * @param callback
// 	 * @private
// 	 */
// 	exchangeCommand: function(/** String */cmdBytes, /** DFLT_ASYNC_CB */callback) {
//             assert(typeof(callback) == 'function' && callback != SCB);
//             if (this.currCmd) {
// 		callback(new AOP.ERR(sprintf("Gateway %s: still busy with previous command", this.gatewayMote)));
// 		return;
//             }
//             this.currCmd = new Sonoran.WLIP.Command(this, cmdBytes, callback);
//             this.currCmd.send();
// 	},


// 	/**
// 	 * Send stop-radio message to gateway mote.
// 	 * @param callback
// 	 * @throws {AOP.Exception}
// 	 */
// 	stopRadio: function(/** DFLT_ASYNC_CB */callback) {
// 	    if (BC.is(callback)) { return BC.exec(arguments.callee, this, arguments); }
// 	    this.exchangeCommand(String.fromCharCode(SaguaroDEFS.WLIP_CMD_STOPRADIO), callback);
// 	},


// 	/**
// 	 * Send start-radio message to gateway mote.
// 	 * @param callback
// 	 * @throws {AOP.Exception}
// 	 */
// 	startRadio: function(/** DFLT_ASYNC_CB */callback) {
// 	    if (BC.is(callback)) { return BC.exec(arguments.callee, this, arguments); }
// 	    this.exchangeCommand(String.fromCharCode(SaguaroDEFS.WLIP_CMD_STARTRADIO), callback);
// 	},


// 	/**
// 	 * Send/get gateway configure-message
// 	 * @param config      Optional, if set, mote is configured with given configuration, otherwise, configuration is retrieved
// 	 * @param callback
// 	 * @returns {Sonoran.WLIP.Config}
// 	 */
// 	configure: function(/** Sonoran.WLIP.Config */config, /** DFLT_ASYNC_CB */callback) {
// 	    if (BC.is(callback)) { return BC.exec(arguments.callee, this, arguments); }

//             if (SaguaroDEFS.WLIP_CFGOFF_PANID!=0||SaguaroDEFS.WLIP_CFGOFF_CHNL!=2||SaguaroDEFS.WLIP_CFGOFF_TXRETRIES!=3||SaguaroDEFS.WLIP_CFGOFF_TXBUFSIZ!=4) {
// 		throw "unexpected WLIP gateway system constants in saguaroDEFS!";
//             }
//             var data;
//             if (!config) {
// 		data = String.fromCharCode(SaguaroDEFS.WLIP_CMD_CONFIG);
//             } else {
// 		data = String.fromCharCode(SaguaroDEFS.WLIP_CMD_CONFIG) + config.encode();
//             }
// 	    this.exchangeCommand(data, callback);
// 	},


// 	/**
// 	 * onAttach is called when the gateway receive a WLIP_CMD_ATTACH message. By default no action performed.
// 	 */
// 	onAttach: function() {},


// 	/**
// 	 * onDetach is called when a response to WLIP_CMD_DETACH is received. The default implementation
// 	 * of this method is empty.
// 	 */
// 	onDetach: function() {},



// 	/**
// 	 * Evaluate a packet from the remote wlip gateway application.
// 	 * @param blob
// 	 * @private
// 	 */
// 	onData: function(/** Sonoran.Event.Media */blob) {
//             var _this = this;
// 	    var cmd, data, msg, cmdno, cmdreply;;
// 	    try {
// 		var arr = Formatter.unpack("1u*d", blob.data);
// 		cmd = arr[0];
// 		data = arr[1];
// 	    } catch (ex) {
// 		msg = sprintf("Gateway %s: received invalid packet: %H", this.gatewayMote, blob.data);
// 		Logger.log(Logger.INFO, Sonoran.Logger.GATEWAY, msg, null, this.gatewayMote);
// 		return true;
// 	    }
// 	    Logger.debug(sprintf("Gateway %s: incoming gateway command ok/err: 0x%x %H", this.gatewayMote, cmd, data));

// 	    cmdno = (cmd&SaguaroDEFS.WLIP_CMD_CMD_MASK);
// 	    cmdreply = (cmd&SaguaroDEFS.WLIP_CMD_REPLY_MASK);

//             //
//             // It is a response to a command
//             //
//             if (cmdreply != 0) {
// 		var cmdreplyok = (cmd&SaguaroDEFS.WLIP_CMD_REPLY_OK);
// 		var cmdreplyerr = (cmd&SaguaroDEFS.WLIP_CMD_REPLY_ERR);
// 		var status, currCmd = this.currCmd;

// 		if (currCmd == null) {
// 		    msg = sprintf("Gateway %s: received unexpected %s reply for command '%s' (data=%H)", this.gatewayMote, cmdreplyerr ? "error " : "", this.getCmdInfo(cmdno), data);
// 		    Logger.log(Logger.ERR, Sonoran.Logger.GATEWAY, msg, undefined, this.gatewayMote);
// 		    return true;
// 		}

// 		if (cmdreplyerr != 0) {
// 		    var errno = Formatter.unpack("1u", data)[0];
// 		    msg = sprintf("Gateway %s: command '%s' failed: %s (data=%H)", this.gatewayMote, this.getCmdInfo(cmdno), this.getErrnoInfo(errno), data);
// 		    Logger.log(Logger.ERR, Sonoran.Logger.GATEWAY, msg, undefined, this.gatewayMote);
// 		    status = new AOP.ERR(msg);
// 		} else if (cmdno != currCmd.cmdByte) {
// 		    msg = sprintf("Gateway %s: received reply for command %d instead of for command %d", this.gatewayMote, cmdno, currCmd.cmdByte);
// 		    Logger.log(Logger.ERR, Sonoran.Logger.GATEWAY, msg, undefined, this.gatewayMote);
// 		    status = new AOP.ERR(msg);
// 		} else {
// 		    assert(currCmd.gateway==this);
// 		    switch(cmdno) {
//                     case SaguaroDEFS.WLIP_CMD_ATTACH: {
// 			msg = sprintf("Gateway %s: is attached", this.gatewayMote);
// 			status = new AOP.OK(msg);
// 			this.onAttach();
// 			break;
//                     }
//                     case SaguaroDEFS.WLIP_CMD_STOPRADIO:
// 	            case SaguaroDEFS.WLIP_CMD_STARTRADIO: {
// 			msg = sprintf("Gateway %s: received OK-reply for radio start/stop command %d", this.gatewayMote, cmdno);
// 			Logger.log(Logger.INFO, Sonoran.Logger.GATEWAY, msg, undefined, this.gatewayMote);
// 			status = new AOP.OK(msg);
// 			break;
//                     }
// 	            case SaguaroDEFS.WLIP_CMD_CONFIG: {
// 			msg = sprintf("Gateway %s: received OK-reply for configure with payload '%H'", this.gatewayMote, data);
// 			Logger.log(Logger.INFO, Sonoran.Logger.GATEWAY, msg, undefined, this.gatewayMote);
// 			var obj = null;
// 			if (data.length > 0) {
// 			    obj = Sonoran.WLIP.Config.decode(data);
// 			}
// 			status = new AOP.OK(obj); //(this, obj, msg);
// 			break;
//                     }
//                     case SaguaroDEFS.WLIP_CMD_DETACH: {
// 			msg = sprintf("Gateway %s: is detached", this.gatewayMote);
// 			status = new AOP.OK(msg);
// 			this.onDetach();
// 			break;
// 	            }
// 		    default:
// 			msg = sprintf("Gateway %s: received unexpected reply: cmdno %2x, data '%H'", this.gatewayMote, cmdno, blob.data);
// 			Logger.log(Logger.ERR, Sonoran.Logger.GATEWAY, msg, undefined, this.gatewayMote);
// 			return true;
// 		    }
// 		}

// 		currCmd.close(status);
// 		//assert(this.currCmd==null);
// 		return true;
//             }


//             //
//             // It is a message sent from the mote to sonoran
//             //
// 	    switch(cmdno) {
//             case  SaguaroDEFS.WLIP_CMD_FORWARD:{
// 		var uniqueid, padding, srcport, bytes;
// 		QUACK(1, "Gateway", "receive in onMedia" + Formatter.binToHex(blob.data));
// 		Logger.debug(sprintf("Gateway %s: incoming wrapped gateway message: %H", this.gatewayMote, blob.data));
// 		try {
//                     var arr = Formatter.unpack("8d3u1u*d", data);
//                     uniqueid = arr[0];
//                     padding = arr[1];
//                     srcport = arr[2];
//                     bytes = arr[3];
//                     msg = arr[4];
// 		} catch (ex) {
// 	            msg = sprintf("Gateway %s: received invalid message: %H", this.gatewayMote, blob.data);
// 	            Logger.log(Logger.ERR, Sonoran.Logger.GATEWAY, msg, undefined, this.gatewayMote);
// 	            break;
// 		}
// 		uniqueid = Formatter.binToHex(reverseString(uniqueid));
// 		var eui64 = Util.UUID.hex2eui64(uniqueid);
// 		QUACK(1, "Gateway", "receive for EUI " + eui64 + ", mote uniqueid " + uniqueid);
// 		var srcmote = Sonoran.Registry.lookupMoteByUniqueid(eui64);
// 		if (srcmote==null) {
// 	            msg = sprintf("Gateway %s: received message from unknown mote %s", this.gatewayMote, eui64);
// 	            Logger.log(Logger.ERR, Sonoran.Logger.GATEWAY, msg, undefined, this.gatewayMote);
// 	            return true;
// 		}
// 		//srcmote.onMedia(new Sonoran.Event.Media(blob.dstport, srcmote, srcport, bytes));
// 		Event.Registry.signalEvent(new Sonoran.Event.Media(blob.dstport, srcmote, srcport, bytes));
// 		break;
//             }
// 	    case SaguaroDEFS.WLIP_CMD_DETACHED: {
// 		var ip1,ip2,ip3,ip4,ipport;
// 		try {
//                     var arr = Formatter.unpack("1u1u1u1u2u", data);
//                     ip1 = arr[0];
//                     ip2 = arr[1];
//                     ip3 = arr[2];
//                     ip4 = arr[3];
//                     ipport = arr[4];
// 		} catch (x) {
// 		    msg = sprintf("Gateway %s: received invalid WLIP_CMD_DETACH %H", this.gatewayMote, blob.data);
// 		    Logger.log(Logger.INFO, Sonoran.Logger.GATEWAY, msg, undefined, this.gatewayMote);
// 		    break;
// 		}
// 		if (ipport == this.clsock.getLocalPort()) {
// 		    msg = sprintf("Gateway %s: was re-attached", this.gatewayMote);
// 		    Logger.log(Logger.INFO, Sonoran.Logger.GATEWAY, msg, undefined, this.gatewayMote);
// 		} else {
// 		    //this.setState(Sonoran.Gateway.STATE_DETACHED);
//                     var ipaddr = sprintf("%d.%d.%d.%d", ip1,ip2,ip3,ip4);
// 		    msg = sprintf("Gateway %s: detached and replaced by %s:%d", this.gatewayMote, ipaddr, ipport);
// 		    Logger.log(Logger.INFO, Sonoran.Logger.GATEWAY, msg, undefined, this.gatewayMote);
//                     //this.onDetached(ipaddr, ipport);
//                     this.shutdown(new AOP.OK(msg),function(status) {});
// 		}
// 		break;
// 	    }
// 	    case SaguaroDEFS.WLIP_CMD_BYE: {
// 		var eui64;
// 		try {
// 		    if (data.length != 8) {
// 			throw "invalid message";
// 		    }
// 		    var uniqueid = Formatter.binToHex(reverseString(data));
// 		    eui64 = Util.UUID.hex2eui64(uniqueid);
// 		} catch (ex) {
// 		    msg = sprintf("Gateway %s: cannot handle invalid BYE-message '%H': '%s'", this.gatewayMote, blob.data, ex);
// 		    Logger.log(Logger.ERR, Sonoran.Logger.GATEWAY, msg, undefined, this.gatewayMote);
// 		    break;
// 		}
// 		this.onMoteDisappearance(eui64);
// 		break;
// 	    }
// 	    case SaguaroDEFS.WLIP_CMD_HELLO: {
// 		var uniqueid;
// 		try {
// 		    if (data.length != 10) {
// 			throw "invalid message length";
// 		    }
//                     var seqno = data.substr(8);
// 		    data = data.substr(0,8);
// 		    uniqueid = Formatter.binToHex(reverseString(data));
// 		    uniqueid = Util.UUID.hex2eui64(uniqueid);
// 		} catch (ex) {
// 		    msg = sprintf("Gateway %s: cannot handle HELLO-message '%H': '%s'", this.gatewayMote, blob.data, ex);
// 		    Logger.log(Logger.ERR, Sonoran.Logger.GATEWAY, msg, undefined, this.gatewayMote);
// 		    break;
// 		}
// 		var arr = this.onMoteDetection(uniqueid, Sonoran.Mote.ON, true);
// 		if (arr) {
//                     var existed = arr[0];
//                     var mote = arr[1];
//                     if (this.appealCtx) {
// 			if (!this.appealCtx.allHellos[uniqueid]) {
//                             this.appealCtx.allHellos[uniqueid] = mote;
//                             this.appealCtx.intervalHellos[uniqueid] = mote;
// 			}
//                     }
// 		}
// 		break;
// 	    }
// 	    case SaguaroDEFS.WLIP_CMD_TXFAIL: {
// 		var msg;
// 		try {
// 		    var uniqueid = Formatter.binToHex(reverseString(data));
// 		    var eui64 = Util.UUID.hex2eui64(uniqueid);
//                     msg = sprintf("Gateway %s: received TXFAIL-message for target mote '%s'", this.gatewayMote, eui64);
// 		} catch (ex) {
// 	            msg = sprintf("Gateway %s: received TXFAIL-message: %H", this.gatewayMote, blob.data);
// 		}
// 		Logger.log(Logger.ERR, Sonoran.Logger.GATEWAY, msg, undefined, this.gatewayMote);
// 		break;
// 	    }
// 	    default:
// 		msg = sprintf("Gateway %s: received unknown/invalid message `%H'", this.gatewayMote, blob.data);
// 		Logger.log(Logger.ERR, Sonoran.Logger.GATEWAY, msg, undefined, this.gatewayMote);
// 	    }
//             return true;
// 	},


// 	/**
// 	 * @private
// 	 */
// 	getCmdInfo: function(/** Number */cmdno) {
//             return Sonoran.WLIP.INFO_CMDS[cmdno]||sprintf("0x%02X",cmdno);
// 	},


// 	/**
// 	 * @private
// 	 */
// 	getErrnoInfo: function(/** Number */errno) {
//             return Sonoran.WLIP.INFO_ERRS[errno]||sprintf("0x%02X",errno);
// 	}
//     }
// );



// /**
//  * Check motes to attach to a WLIP gateway.
//  * @param motes
//  * @param timeout
//  * @param callback
//  * @private
//  */
// Sonoran.WLIP.Gateway.ensureMotesHaveSink = function(/** Sonoran.Mote[] */motes, /** Number */timeout, /** DFLT_ASYNC_CB */callback) {
//     if (BC.is(callback)) { return BC.exec(arguments.callee, this, arguments); }
//     var source = "Sonoran.WLIP.Gateway";
//     var mote = motes[0];
//     assert(mote, "Sonoran.WLIP.Gateway.ensureHello: no mote(s) specified!");
//     var timer = new Timer.Timer(timeout, mote, 	function(err) {
// 	timer = null;
// 	var arr = [];
// 	for (var i = 0; i < motes.length; i++) {
// 	    if (!motes[i].getSink()) {
// 		arr.push(motes[i]);
// 	    }
// 	}
// 	var msg = sprintf("Wireless motes are not attached to a gateway: %s", arr.join(","));
// 	closef(new AOP.ERR(ERR_GENERIC, msg, undefined, arr));
//     });
//     var closef = function(result) {
// 	Sonoran.Registry.removeListener(listener);
// 	if (timer) {
// 	    timer.cancel();
// 	    timer = null;
// 	}
// 	callback(result);
//     };
//     var checkf = function() {
// 	var arr = [];
// 	for (var i = 0; i < motes.length; i++) {
// 	    //assert(motes[i].isWireless(), "Sonoran.WLIP.Gateway.ensureHello: mote is not wireless: " + motes[i]);
// 	    if (!motes[i].getSink()) {
// 		arr.push(motes[i]);
// 	    }
// 	}
// 	motes = arr;
// 	if (motes.length===0) {
// 	    closef(new AOP.OK(source));
// 	}
//     };
//     var listener = function(ev) {
// 	checkf();
//     };
//     timer.start();
//     Sonoran.Registry.addFilterForMsgTypes(listener, [ Sonoran.Event.GATEWAY ]);
//     checkf();
// };










// /**
//  * Sonoran.WLIP.AppealContext keeps state during an appeal operation
//  * @class
//  * @constructor
//  * @private
//  */
// Sonoran.WLIP.AppealContext = function() {
//    /**
//     * If appeal is active, the current randomly picked appeal sequence id.
//     * If null, no appeal sequence is active.
//     * @type Number
//     * @private
//     */
//    this.seed = parseInt(1 + Math.random()*65534);
//    /**
//     * The appeal packet sent in this sequence.
//     * @type String
//     * @private
//     */
//    this.packet =  Util.Formatter.pack("uU", SaguaroDEFS.WLIP_CMD_APPEAL, this.seed);
//    /**
//     * A map of mote uniqueids which have been saying hello during the current
//     * time interval in the current appeal sequence.
//     * @type Object
//     * @private
//     */
//    this.intervalHellos = {};
//    /**
//     * A map of mote uniqueids which have been saying hello during the 
//     * the whole current appeal sequence.
//     * @type Object
//     * @private
//     */
//    this.allHellos = {};
//    /**
//     * A map of all mote uniqueids known before this appeal took place.
//     * @type Object
//     * @private
//     */
//    this.prevHellos = {};
//    /**
//     * Number of intervals with no new mote saying hello.
//     * @type Number
//     * @private
//     */
//    this.intervalEmptyCnt = 0;
//    /**
//     * Number of intervals this appeal sequence is running
//     * @type Number
//     * @private
//     */
//    this.intervalTotalCnt = 0;
// };







// /**
// *  Sonoran.WLIP.SetupGateway starts mote maintenance and ensures the specified
// *  WLIP gateway is loaded and configured.
// * @class
// * @augments Sonoran.MSETUP
// * @constructor
// * @param mote The mote which is used to install the gateway.
// */
// Sonoran.WLIP.SetupGateway = function (/**Sonoran.Mote*/mote) {
//     Sonoran.MSETUP.call(this);
//     this.setMotes([mote]);
//     this.gasm = Sonoran.WLIP.DEFAULT_ASM_SPEC;
// }

// /** Prototype */
// Sonoran.WLIP.SetupGateway.prototype = extend(
//     Sonoran.MSETUP.prototype,
//     /** @lends Sonoran.WLIP.SetupGateway.prototype */
//     {
// 	/** 
//         * @returns {Sonoran.AsmName|Sonoran.Assembly} the assembly to be installed or the assembly that has been installed.
//         */
// 	getGatewayAssembly: function () {
// 	    return this.gasm;
// 	},
// 	/** Specify the name or the assembly of the WLIP gateway.
//         *   This overrides the internal default 'wlip-gateway-#.#'.
//         * @param asm WLIP gateway
//         */
// 	setGatewayAssembly: function (/**Sonoran.AsmName|Sonoran.Assembly*/asm) {
// 	    this.gasm = asm;
// 	},
// 	/**
//         *  Make sure gateway assembly is installed and configured.
//         *  If the mote already contains a WLIP gateway assembly it is deleted only
//         *  in case of a version mismatch with the registered assembly. In case there is no
//         *  gateway assembly the registered assembly is loaded. If the configuration of
//         *  a loaded gateway differs then the specified configuration is applied.
//         *  If the mote has been prepared before this function will not change any state.
//         * @param config The WLIP protocol configuration or null to use default values.
//         * @see Sonoran.WLIP.setGatewayAssembly()
// 	* @returns {Sonoran.WLIP.Gateway} the gateway
//         */
// 	installGateway: function (/**Sonoran.WLIP.Config*/config) {
// 	    //QUACK(0, "installGateway...\n");	    
// 	    var result;
// 	    if( this.gasm != null ) {
// 		if( this.gasm instanceof Sonoran.AsmName ) {
// 		    // Find by default in GAC
// 		    this.gasm = this.findAndAddAssembly(this.gasm);
// 		} else {
// 		    this.addAssembly(this.gasm);
// 		}
// 	    }
// 	    this.performActions();
// 	    // Gateway should have be loaded
// 	    //QUACK(0, "Gateway should have be loaded\n");	    
// 	    var mote = this.getMotes()[0];
// 	    var gateway = mote.getGatewayP();
// 	    if( !gateway) {
// 	       // Try to open WLIP gateway on this mote
// 	       gateway = new Sonoran.WLIP.Gateway(mote);
// 	    }
// 	    if( !(gateway instanceof Sonoran.WLIP.Gateway) )
// 		throw new AOP.ERR(ERR_GENERIC, sprintf("Mote '%s' tied to non-WLIP gateway: %s", mote, gateway));

//              if (!gateway.isConnected()) {
//                 assert(gateway.clsock.isClosed());
// 		 //QUACK(0, "connecting to it ...\n");	    
// 	        result = gateway.connect(SCB);
// 	        if( result.isERR() )
// 		   throw new AOP.ERR(ERR_GENERIC, "Failed to attach to WLIP gateway: "+mote, result);
//              }
           
// 	    // Is current configuration already set?
// 	    result = gateway.configure(null,SCB);
// 	    if( result.isERR() )
// 		throw new AOP.ERR(ERR_GENERIC, "Failed to read WLIP gateway configuration", result);
// 	    var conf = result.data;
// 	    if( config == null )
// 		config = new Sonoran.WLIP.Config();
// 	    if( !conf.equals(config) ) {
// 		this.onProgress(mote, gateway, 'configure', 'start', null);
//                 //QUACK(0, "CONF: " + config);
// 		result = gateway.configure(config, SCB);
// 		if( result.code != 0) {
// 		    this.onProgress(mote, gateway, 'configure', 'err', null);
// 		    throw new AOP.ERR(ERR_GENERIC, "Failed to configure WLIP gateway", result);
// 		}
// 		this.onProgress(mote, gateway, 'configure', 'done', null);
// 		// XXX: Some settings only activated on mote reset (txbufsz)
// 		// XXX: Some only if radio stopped/started...
// 		// XXX: do a reset on any change?
// 	    }
// 	    gateway.startRadio(SCB); // if already started - will fail
// 	    return gateway;
// 	}
//     }
// );





// /**
//  * Sonoran.WLIP.Command represents a WLIP command which ends up in a reply or timeout.
//  * @class
//  * @constructor
//  * @param gateway
//  * @param cmdBytes
//  * @param callback
//  * @private
//  */
// Sonoran.WLIP.Command = function(/** Sonoran.WLIP.Gateway */gateway, /** String */cmdBytes, /** function */callback) {
//    assert(gateway.gatewayMote);
//    this.gateway = gateway;
//    this.cmdBytes = cmdBytes;
//    this.cmdByte = cmdBytes.charCodeAt(0);
//    this.callback = callback;
// };

// /** Prototype */
// Sonoran.WLIP.Command.prototype = {
//    /**
//     * Close command execution
//     * @private
//     */
//    close: function(/** AOP.OK */result) {
//       if (this.timer) {
//          Timer.remove(this.timer); //.stop();
//           this.timer = null;
//       }
//       this.gateway.currCmd = null;
//       this.callback(result);
//    },

//    /**
//     * Timeout received
//     * @private
//     */
//    onTimeout: function() {
//       this.timer = null;
//       var msg = sprintf("Gateway %s: received TIMEOUT on %s-message", this.gateway.gatewayMote, this.gateway.getCmdInfo(this.cmdByte));
//       this.close(new AOP.ERR(ERR_TIMEOUT, msg, undefined, this.gateway));
//    },

//    /**
//     * Send this command
//     * @private
//     */
//    send: function() {
//       var gateway = this.gateway;
//       var gatewayMote = gateway.gatewayMote;
//       var gatewayPort = gateway.gatewayPort;
//       //this.timer = Timer.timeoutIn(2000, this.onTimeout.bind(this));
//       try {
//           this.gateway.clsock.send(this.cmdBytes, gatewayMote, gatewayPort);
// 	  //Thread.sleep(100);
// 	  //this.gateway.clsock.send(this.cmdBytes, gatewayMote, gatewayPort);
//          assert(this.gateway.clsock.asyncTimer==null);
//       } catch (ex) {
//          var msg = sprintf("Gateway %s: cannot send %s-message '%H'", this.gateway.gatewayMote, this.gateway.getCmdInfo(this.cmdByte), this.cmdBytes);
//          this.close(AOP.Ex2ERR(ERR_GENERIC, ex, msg, gateway));
//       }
//    }
// };







// /**
//  * @namespace Sonoran.CLI.Commands.WLIP
//  * @private
//  */
// Sonoran.CLI.Commands.WLIP = {};


// /**
//  * @private
//  */
// Sonoran.CLI.Commands.WLIP.ASM_NAME = new Sonoran.AsmName("wlip-gateway", 1, 0);



// /**
//  * @private
//  * @class WLIP setup command
//  * @constructor
//  */
// Sonoran.CLI.Commands.WLIP.SetupCommand = function(/** CLI.Shell */shell, /** String */name) {
//    this.description =
// 	"Delete any older wlip application on mote and load the one from the system directory\n" +
// 	"(if not aleady there). Initialize, configure and attach gateway.";
//    this.vOpt =  new GetOpt.Option("v", "--verbose", 0, null, "Report actions.");
//    this.fileSpec = new GetOpt.FileSpec("assembly", "Path to assembly implementing gateway.");
//    this.fileOpt =  new GetOpt.Option("a", "--asm", 0, null, null, this.fileSpec);
//     this.panSpec = new GetOpt.Number("panid", sprintf("PAN id (hex digits only), default %04X.",SaguaroDEFS.WLIP_DEFAULT_PANID), null, 16);
//    this.panSpec.setRange(SaguaroDEFS.WLIP_DEFAULT_PANID, 0, 65535);
//    this.panOpt = new GetOpt.Option("p", "--panid", 0, null, null, this.panSpec);
//    this.chanSpec = new GetOpt.Number("chan", sprintf("Channel, decimal, default %d.",SaguaroDEFS.WLIP_DEFAULT_CHNL), null, 10);
//    this.chanSpec.setRange(SaguaroDEFS.WLIP_DEFAULT_CHNL, 0, 256);
//    this.chanOpt = new GetOpt.Option("c", "--channel", 0, null, null, this.chanSpec);
//    this.retriesSpec = new GetOpt.Number("retries", sprintf("TX retries, decimal, default %d.",SaguaroDEFS.WLIP_DEFAULT_TXRETRIES), null, 10);
//    this.retriesSpec.setRange(SaguaroDEFS.WLIP_DEFAULT_TXRETRIES, 0, 256);
//    this.retriesOpt = new GetOpt.Option("r", "--retries", 0, null, null, this.retriesSpec);
//    this.bufszSpec = new GetOpt.Number("bufsz", sprintf("Buffer size, decimal, default %d.",SaguaroDEFS.WLIP_DEFAULT_TXBUFSIZ), null, 10);
//    this.bufszSpec.setRange(SaguaroDEFS.WLIP_DEFAULT_TXBUFSIZ, 0, 65536);
//    this.bufszOpt = new GetOpt.Option("s", "--size", 0, null, null, this.bufszSpec);
//     this.excaOpt   = new GetOpt.Option("E", "--excess", 0, null, "Allow excess assemblies.");
//    var optSet = new GetOpt.OptionSet([ this.vOpt, this.fileOpt, this.panOpt, this.chanOpt, this.retriesOpt, this.bufszOpt, this.excaOpt ]);
//     var cmdSpec = new Sonoran.CLI.Spec(name, Sonoran.CLI.DST_ONE_MOTE);
//    CLI.Command.call(this, shell, cmdSpec, [ optSet, new GetOpt.EndOfArgs() ]);
// };

// /** @private */
// Sonoran.CLI.Commands.WLIP.SetupCommand.prototype = extend(
//     CLI.Command.prototype,
//    {
//       /** @private */
//       exec: function(callback) {
// 	  var mote = this.cmdSpec.getMote();
//          assert(mote);

// 	 var SG = new Sonoran.WLIP.SetupGateway(mote);
// 	 if (this.excaOpt.isSet()) {
// 	     SG.allowExcessAssemblies = true;
// 	 }
// 	 var config = new Sonoran.WLIP.Config();
// 	 if( this.vOpt.isSet() )
// 	    SG.onProgress = SG.printOnProgress;
//          if( this.fileOpt.isSet() ) {
// 	    try {
// 	       SG.setGatewayAssembly(new Sonoran.Resource.Assembly(this.fileSpec.getPath()));
// 	    } catch(ex) {
// 		callback(AOP.Ex2ERR(ERR_GENERIC, ex, "Invalid wlip-gateway assembly: "+this.fileSpec.getPath()));
// 	       return;
// 	    }
// 	 }
// 	 if( this.panOpt.isSet() )     config.panid     = this.panSpec.getNumber();
// 	 if( this.chanOpt.isSet() )    config.channel   = this.chanSpec.getNumber();
// 	 if( this.retriesOpt.isSet() ) config.txretries = this.retriesSpec.getNumber();
// 	 if( this.bufszOpt.isSet() )   config.txbufsz   = this.bufszSpec.getNumber();
// 	 SG.installGateway(config);
// 	 callback(new AOP.OK(mote.getGatewayP().toString()));
// 	 return;
//       }
//    }
// );




// /**
//  * @private
//  * @class WLIP appeal command
//  * @constructor
//  */
// Sonoran.CLI.Commands.WLIP.AppealCommand = function(/** CLI.Shell */shell, /** String */name) {
//    this.description = "Issue APPEAL message to an attached gateway mote.";
//     var cmdSpec = new Sonoran.CLI.Spec(name, Sonoran.CLI.DST_ONE_MOTE);
//    CLI.Command.call(this, shell, cmdSpec);
// };

// /** @private */
// Sonoran.CLI.Commands.WLIP.AppealCommand.prototype = extend(
//    CLI.Command.prototype,
//    {
//       /** @private */
//       exec: function(callback) {
// 	  var mote = this.cmdSpec.getMote();
// 	  var gw = mote.getGatewayP();
// 	  if (!gw) {
// 	      callback(new AOP.ERR(sprintf("Mote <%s> is not a WLIP gateway", mote)));
// 	  } else {
// 	      gw.appeal(callback);
// 	  }
//       }
//    }
// );




// /**
//  * @class WLIP close command
//  * @constructor
//  * @private
//  */
// Sonoran.CLI.Commands.WLIP.CloseCommand = function(shell, name) {
//     this.description = "Close gateway and release resources.";
//     var cmdSpec = new Sonoran.CLI.Spec(name, Sonoran.CLI.DST_ONE_MOTE);
//     CLI.Command.call(this, shell, cmdSpec);
// };

// /** @private */
// Sonoran.CLI.Commands.WLIP.CloseCommand.prototype = extend(
//     CLI.Command.prototype,
//    {
//       /** @private */
//       exec: function(callback) {
// 	  var mote = this.cmdSpec.getMote();
// 	  var gw = mote.getGatewayP();
// 	  if (!gw) {
// 	      callback(new AOP.ERR(sprintf("Mote <%s> is not a WLIP gateway", mote)));
// 	  } else {
// 	      gw.shutdown(new AOP.OK(), callback);
// 	  }
//       }
//    }
// );




// /**
//  * @class WLIP info command
//  * @constructor
//  * @private
//  */
// Sonoran.CLI.Commands.WLIP.InfoCommand = function(shell, name) {
//     this.description = "Print information about a gateway and its attached motes.";
//     var cmdSpec = new Sonoran.CLI.Spec(name, Sonoran.CLI.DST_ONE_MOTE);
//     CLI.Command.call(this, shell, cmdSpec);
// };

// /** @private */
// Sonoran.CLI.Commands.WLIP.InfoCommand.prototype = extend(
//     CLI.Command.prototype,
//    {
//       /** @private */
//       exec: function(callback) {
//           var mote = this.cmdSpec.getMote();
//    	 var gateway = mote.getGatewayP();
// 	  if (!gateway) {
// 	      callback(new AOP.ERR(sprintf("Mote <%s> is not a WLIP gateway", mote)));
// 	      return;
// 	  }
// 	 var motes = gateway.getGatedMotes();
// 	 var txt = null;
// 	 if (motes.length==0) {
// 	    txt = "No motes attached to gateway " + mote.getUniqueid();
// 	 } else {
// 	    txt = "Motes attached to gateway " + mote.getUniqueid() + ": \n";
// 	    var table = new Formatter.Table2(2);
// 	     table.setTitle("Name", "Uniqueid");
// 	    for (var i = 0; i < motes.length; i++) {
// 	       table.addRow(motes[i].getName(), motes[i].getUniqueid());
// 	    }
// 	    txt += table.render().join("\n");
// 	 }
// 	 callback(new AOP.OK(txt));
//       }
//    }
// );


// /**
//  * @class WLIP radio command
//  * @constructor
//  * @private
//  */
// Sonoran.CLI.Commands.WLIP.RadioCommand = function(shell, name) {
//     this.description = "Start or stop radio on gateway.";
//     this.actionSpec = new GetOpt.Keywords("action", "Start or stop radio.", [ "start", "stop" ]);
//     var cmdSpec = new Sonoran.CLI.Spec(name, Sonoran.CLI.DST_ONE_MOTE);
//     CLI.Command.call(this, shell, cmdSpec, [ this.actionSpec ]);
// };

// /** @private */
// Sonoran.CLI.Commands.WLIP.RadioCommand.prototype = extend(
//     CLI.Command.prototype,
//    {
//       /** @private */
//       exec: function(callback) {
// 	  var mote = this.cmdSpec.getMote();
// 	  var gateway = mote.getGatewayP();
// 	  if (!gateway) {
// 	      callback(new AOP.ERR(sprintf("Mote <%s> is not a WLIP gateway", mote)));
// 	      return;
// 	  }
// 	 var action = this.actionSpec.getArg();
// 	 if (action=='start') {
// 	    gateway.startRadio(callback);
// 	 } else {
// 	    gateway.stopRadio(callback);
// 	 }
//       }
//    }
// );




// /**
//  * @class WLIP config command
//  * @constructor
//  * @private
//  */
// Sonoran.CLI.Commands.WLIP.ConfigCommand = function(shell, name) {
//     this.description = "Reads the current config of wlip on the gateway mote.";
//     var cmdSpec = new Sonoran.CLI.Spec(name, Sonoran.CLI.DST_ONE_MOTE);
//     CLI.Command.call(this, shell, cmdSpec);
// };

// /** @private */
// Sonoran.CLI.Commands.WLIP.ConfigCommand.prototype = extend(
//     CLI.Command.prototype,
//    {
//       /** @private */
//       exec: function(callback) {
// 	  var mote = this.cmdSpec.getMote();
// 	  var gateway = mote.getGatewayP();
// 	  if (!gateway) {
// 	      callback(new AOP.ERR(sprintf("Mote <%s> is not a WLIP gateway", mote)));
// 	      return;
// 	  }
//          gateway.configure(undefined, function(result) {
//             if (result.code != 0) {
//                callback(new AOP.ERR("Config-command failed", result));
//                return;
//             }
//             var c = result.getData();
//             callback(new AOP.OK(c.toString()));
//          });
//       }
//    }
// );



// CLI.commandFactory.addModule("Sonoran.CLI.Commands.WLIP");
