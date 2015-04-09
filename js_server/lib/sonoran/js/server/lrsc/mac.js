/**
 * @class
 * @static
*/
LRSC.Mac = {

    /**
     * @param bytes
     * @param offset
     * @returns {Object[]} with state object and remaing bytes
     */
    unpackState: function(/** String */bytes, offset) {
	//printf("LRSC.Mac.unpackState: %H\n", bytes);
	if (!offset) { offset = 0; }
	var descr = [
	    "netid", "4uL",
	    "devaddr", "4uL",
	    "seqnoUp", "4uL",
	    "seqnoDn", "4uL",
	    "txfreq", "4uL", 
	    "drift", "2sL",
	    "lastDriftDiff", "2sL",
	    "maxDriftDiff", "2sL",
	    "datarate", "1u",
	    "txchnl", "1u",
	    "txpow", "1uL",
	    "txcnt", "1uL",
	    "bcnrssi", "1uL",
	    "bcnsnr", "1uL"
	];
	var obj = Formatter.unpackObj(bytes, offset, descr);
	return [ obj, bytes.substring(offset+LRSCdev.SIZE_lrscmac_state_t) ];
    },


    /**
     * @param bytes
     * @param offset
     * @returns {Object}
     */
    unpackBcnInfo: function(/** String */bytes, offset) {
	//printf("LRSC.Mac.unpackBcnInfo: %H\n", bytes);
	var descr = [ "ticks", "4uL", "time", "4uL", "flags", "1u", "info", "1u", "lat", "4uL", "lon", "4uL" ];
	var obj = Formatter.unpackObj(bytes, offset, descr);
	obj.toString = function() {
	    return sprintf("Beacon: ticks %d, time %u '%s', flags %x, info %x, lat %d, lon %d", this.ticks, this.time, Util.micros2str(this.time*1000*1000), this.flags, this.info, this.lat, this.lon);
	};
	return obj;
    }

};


    
Class.define(
    "LRSC.Mac.Socket",
    /**
     * @lends LRSC.Mac.Socket
     */
    {
	/**
	 * LIP socket to communicate with LRSC mac library.
	 * @constructs
	 * @param {Number} dstport
	 * @param {Number} srcport
	 */
	__constr__: function(dstport, srcport) {
	    if (!dstport) {
		dstport = LRSCMacDEFS.LIP_PORT;
	    }
	    this.dstport = dstport;
	    this.command = null;
	    this.sock = new Sonoran.Socket();
	    this.sock.onClose = this.onClose.bind(this);
	    this.sock.onData = this.onData.bind(this);
	    this.sock.open(srcport, BLCK);

	    this.FMT_UNPACK_DESCRS = {};
	    this.FMT_UNPACK_DESCRS[LRSCMacDEFS.LIP_EV_TRACE] = [ "source", "2uL" ];
	    this.FMT_UNPACK_DESCRS[LRSCMacDEFS.LIP_EV_TRACE_U] = [ "source", "2uL", "u", "2uL" ];
	    this.FMT_UNPACK_DESCRS[LRSCMacDEFS.LIP_EV_TRACE_STATE] = [ "source", "2uL", "state", "2uL" ];
	    this.FMT_UNPACK_DESCRS[LRSCMacDEFS.LIP_EV_TRACE_UL] = [ "source", "2uL", "u", "2uL", "l1", "4uL" ];
	    this.FMT_UNPACK_DESCRS[LRSCMacDEFS.LIP_EV_TRACE_ULL] =  [ "source", "2uL", "u", "2uL", "l1", "4uL", "l2", "4uL" ];
	    this.FMT_UNPACK_SIZES = {};
	    this.FMT_UNPACK_SIZES[LRSCMacDEFS.LIP_EV_TRACE] = 2;
	    this.FMT_UNPACK_SIZES[LRSCMacDEFS.LIP_EV_TRACE_U] = 4;
	    this.FMT_UNPACK_SIZES[LRSCMacDEFS.LIP_EV_TRACE_STATE] = 4;
	    this.FMT_UNPACK_SIZES[LRSCMacDEFS.LIP_EV_TRACE_UL] = 8;
	    this.FMT_UNPACK_SIZES[LRSCMacDEFS.LIP_EV_TRACE_ULL] = 12;
	},

	/**
	 * Send command to LRSC library.
	 * @param mote
	 * @param cmdno
	 * @param data
	 * @param callback
	 */
	sendCommand: function(/** Sonoran.Mote */mote, /** Number */cmdno, /** String */data, /** DFLT_ASYNC_CB */callback) {
	    assert(mote);
	    if (callback&&BC.is(callback)) { return BC.exec(arguments.callee, this, arguments); }
	    if (this.command != null) {
		this.command.timer.cancel();
		this.command = null;
		println("WARNING: overwrite previous command..");
		//throw new Exception("Command already set!");
	    }
	    this.command = {
		cmdno: cmdno,
		data: data,
		callback: callback,
		timer: null
	    };
	    var _this = this;
	    var onTimeout = function(status) {
		_this.command = null;
		callback(status);
	    };
	    this.command.timer = new Timer.Timer(1000, mote, onTimeout);
	    var bytes = Formatter.pack("1u", cmdno) + data;
	    //printf("Socket-Input: %s %d %H\n", mote, this.dstport, bytes);
	    this.sock.send(bytes, mote, this.dstport); //, this.command.timer);
	},

	/** 
	 * Overload when necessary.
	 * @param status
	 */
	onClose: function(/** AOP.Result */status) {},

	/**
	 * @param blob
	 * @private
	 */
	onData: function(/** Sonoran.Event.Media */blob) {
	    //println("Socket-Event: " + blob.toString());
	    //var mote = blob.mote;
	    //var data = blob.data;
	    if (blob.data.length < 1) {
		printf("AppSocket: %s: received invalid empty pdu.\n", blob.mote);
		return;
	    }
	    var arr = Formatter.unpack("1u*d", blob.data);
	    var b0 = arr[0];
	    var data = arr[1];
	    var cmdno = (b0 & LRSCMacDEFS.LIP_CMD_CMD_MASK);
	    if ((b0 & LRSCMacDEFS.LIP_CMD_REPLY_MASK) != 0) {
		if (!this.command) {
		    printf("AppSocket: %s: ignore command response: cmdno %d, data %H.\n", blob.mote, cmdno, data);
		    return;
		}
		if (this.command.cmdno != cmdno) {
		    printf("AppSocket: %s: ignore unexpected command response: cmdno %d != %d\n", this.command.cmdno, cmdno);
		    return;
		}
		var command = this.command;
		this.command.timer.cancel();
		this.command = null;
		if ((b0 & LRSCMacDEFS.LIP_CMD_REPLY_OK) != 0) {
		    command.callback(new AOP.OK(data));
		} else if ((b0 & LRSCMacDEFS.LIP_CMD_REPLY_ERR) != 0) {
		    command.callback(new AOP.ERR(sprintf("Command failed: %H", data), undefined, data));
		} else {
		    assert(false);
		}
		
	    } else {

		// payoad with many events
		var data = blob.data;
		while(data.length>0) {
		    var arr = Formatter.unpack("1u*d", data);
		    var b0 = arr[0];
		    data = arr[1];
		    switch(b0) {
		    case LRSCMacDEFS.LIP_EV_TRACE_BUF: {
			var arr = Formatter.unpack("2uL2uL*d", data);
			var source = arr[0];
			var length = arr[1];
			var data = arr[2];
			var buf = data.substring(0, length);
			data = data.substring(length);
			var trace = {
			    msgtype: b0,
			    source: this.mapSource(source)
			};
			trace.buf = Formatter.binToHex(buf);
			this.onEvent(trace);
			break;
		    }
		    case LRSCMacDEFS.LIP_EV_TRACE:
		    case LRSCMacDEFS.LIP_EV_TRACE_U:
		    case LRSCMacDEFS.LIP_EV_TRACE_STATE:
		    case LRSCMacDEFS.LIP_EV_TRACE_UL:
		    case LRSCMacDEFS.LIP_EV_TRACE_ULL: {
			var trace = Formatter.unpackObj(data, 0, this.FMT_UNPACK_DESCRS[b0]);
			assert(trace.source!=0);
			trace.msgtype = b0;
			trace.source = this.mapSource(trace.source);
			this.onEvent(trace);
			break;
		    }
		    default:
			assert(false);
		    }
		    var size = this.FMT_UNPACK_SIZES[b0];
		    data = data.substr(size);
		}
	    }
	},


	/**
	 * @param {Number} source
	 * @private
	 */
	mapSource: function(source) {
	    for (var k in LRSCMacDEFS) {
		if (LRSCMacDEFS[k] == source) {
		    return k;
		}
	    }
	    return source.toString();
	},
	
	
	/**
	 * Might be overloaded.
	 * @param status
	 */
	onEvent: function(/** Object */event) {
	    Logger.println(this.event2string(event), "LORA");
	},


	/**
	 * @param {Object} event
	 */
	event2string: function(event) {
	    var txt = event.source + ":";
	    if (txt.length < 30) {
		txt += Util.getSpaces(30 - txt.length);
	    }
	    if (event.source == "SRC_MAC_ONEVENT") {
		for (var k in LRSCdev) {
		    if (LRSCdev[k] == event.u && /^EV_/.test(k)) {
			return txt + sprintf("%s, l1 0x%x, l2 0x%x", k, event.l1, event.l2);
		    }
		}
	    }
	    
	    switch(event.msgtype) {
	    case LRSCMacDEFS.LIP_EV_TRACE:
		return txt;
	    case LRSCMacDEFS.LIP_EV_TRACE_U:
		return txt + sprintf("u 0x%x", event.u);
	    case LRSCMacDEFS.LIP_EV_TRACE_STATE:
		return txt + sprintf("state 0x%x", event.state);
	    case LRSCMacDEFS.LIP_EV_TRACE_UL:
		return txt + sprintf("u 0x%x, l1 0x%x", event.u, event.l1);
	    case LRSCMacDEFS.LIP_EV_TRACE_ULL: 
		return txt + sprintf("u 0x%x, l1 0x%x, l2 0x%x", event.u, event.l1, event.l2);
	    case LRSCMacDEFS.LIP_EV_TRACE_BUF: 
		return txt + sprintf("%s", event.buf);
	    default:
		assert(false, event.msgtype);
	    }
	    return null;
	},


	/**
	 * @param mote
	 */
	join: function(/** Sonoran.Mote */mote, /** DFLT_ASYNC_CB */callback) {
	    if (callback&&BC.is(callback)) { return BC.exec(arguments.callee, this, arguments); }
	    this.sendCommand(mote, LRSCMacDEFS.LIP_CMD_JOIN, "", callback);
	},

	/**
	 * @param mote
	 */
	shutdown: function(/** Sonoran.Mote */mote, /** DFLT_ASYNC_CB */callback) {
	    if (callback&&BC.is(callback)) { return BC.exec(arguments.callee, this, arguments); }
	    this.sendCommand(mote, LRSCMacDEFS.LIP_CMD_SHUTDOWN, "", callback);
	},

	/**
	 * @param mote
	 */
	attach: function(/** Sonoran.Mote */mote, /** DFLT_ASYNC_CB */callback) {
	    if (callback&&BC.is(callback)) { return BC.exec(arguments.callee, this, arguments); }
	    this.sendCommand(mote, LRSCMacDEFS.LIP_CMD_ATTACH, "", callback);
	},

	/**
	 * @param mote
	 */
	detach: function(/** Sonoran.Mote */mote, /** DFLT_ASYNC_CB */callback) {
	    if (callback&&BC.is(callback)) { return BC.exec(arguments.callee, this, arguments); }
	    this.sendCommand(mote, LRSCMacDEFS.LIP_CMD_DETACH, "", callback);
	},


	/**
	 * @param mote
	 */
	beaconScan: function(/** Sonoran.Mote */mote, /** Boolean */enable, /** DFLT_ASYNC_CB */callback) {
	    if (callback&&BC.is(callback)) { return BC.exec(arguments.callee, this, arguments); }
	    this.sendCommand(mote, LRSCMacDEFS.LIP_CMD_SCAN_BEACON, Formatter.pack("1u", enable?1:0), callback);
	},

	
	/**
	 * Asks mac library to transmit a message to the network server. 
	 * @param mote
	 * @param confirmed
	 * @param port
	 * @param bytes
	 * @param millis
	 * @returns
	 */
	rqTransmit: function(/** Sonoran.Mote */mote, /** Boolen */confirmed, /** Number */port, /** String */bytes, /** DFLT_ASYNC_CB */callback) {
	    assert(arguments.length===5);
	    if (callback&&BC.is(callback)) { return BC.exec(arguments.callee, this, arguments); }
	    assert(typeof(port)==="number");
	    assert(typeof(bytes) === "string");
	    assert(confirmed===true||confirmed===false);
	    var data = Formatter.pack("1u1u", confirmed?1:0, port) + bytes;
	    //printf("rqTransmit: %s %H %H\n", mote, bytes, data);
	    this.sendCommand(mote, LRSCMacDEFS.LIP_CMD_SET_TX_DATA, data, callback);
	},

	/**
	 * @param mote
	 * @returns {String}
	 */
	getAppEui: function(/** Sonoran.Mote */mote, /** DFLT_ASYNC_CB */callback) {
	    if (callback&&BC.is(callback)) { return BC.exec(arguments.callee, this, arguments); }
	    this.sendCommand(mote, LRSCMacDEFS.LIP_CMD_GET_APP_EUI, "", function(result) {
		if (result.code !== 0) {
		    callback(result);
		} else {
		    var data = result.getData();
		    assert(data.length===8);
		    var hex = Formatter.unpack("8xL", data)[0];
		    var eui = Util.UUID.hex2eui64(hex); 
		    callback(new AOP.OK(eui));
		}
	    });
	},

	/**
	 * @param mote
	 * @param eui
	 * @returns
	 */
	setAppEui: function(/** Sonoran.Mote */mote, /** String */eui, /** DFLT_ASYNC_CB */callback) {
	    if (callback&&BC.is(callback)) { return BC.exec(arguments.callee, this, arguments); }
	    var bytes = Formatter.pack("8xL", Util.UUID.eui642hex(eui));
	    this.sendCommand(mote, LRSCMacDEFS.LIP_CMD_SET_APP_EUI, bytes, callback);
	},


	/**
	 * @param mote
	 * @param enabled
	 * @param datarate
	 * @param txpow
	 * @returns
	 */
	setAdrMode: function(/** Sonoran.Mote */mote, /** Boolean */enabled, /** Number */datarate, /** Number */txpow, /** DFLT_ASYNC_CB */callback) {
	    if (callback&&BC.is(callback)) { return BC.exec(arguments.callee, this, arguments); }
	    var bytes = Formatter.pack("1u1u1u", enabled?1:0, datarate, txpow);
	    this.sendCommand(mote, LRSCMacDEFS.LIP_CMD_ADR_MODE, bytes, callback);
	},

	
	/**
	 * @param mote
	 * @param periodicity 0..7 or 0xff
	 * @returns
	 */
	setPingable: function(/** Sonoran.Mote */mote, /** Number */periodicity, /** DFLT_ASYNC_CB */callback) {
	    if (callback&&BC.is(callback)) { return BC.exec(arguments.callee, this, arguments); }
	    assert(periodicity>=0 && (periodicity <=7 || periodicity == 0xff));
	    var bytes = Formatter.pack("1u", periodicity);
	    this.sendCommand(mote, LRSCMacDEFS.LIP_CMD_SET_PINGABLE, bytes, callback);
	},

	
	/**
	 * @param mote
	 * @returns {String}
	 */
	getBcnInfo: function(/** Sonoran.Mote */mote, /** DFLT_ASYNC_CB */callback) {
	    if (callback&&BC.is(callback)) { return BC.exec(arguments.callee, this, arguments); }
	    this.sendCommand(mote, LRSCMacDEFS.LIP_CMD_GET_BCN_INFO, "", function(result) {
		if (result.code !== 0) {
		    callback(result);
		} else {
		    var data = result.getData();
		    callback(new AOP.OK(LRSC.Mac.unpackBcnInfo(data)));
		}
	    });
	},


	/**
	 * @param mote
	 * @returns {String}
	 */
	getState: function(/** Sonoran.Mote */mote, /** DFLT_ASYNC_CB */callback) {
	    if (callback&&BC.is(callback)) { return BC.exec(arguments.callee, this, arguments); }
	    this.sendCommand(mote, LRSCMacDEFS.LIP_CMD_GET_STATE, "", function(result) {
		if (result.code !== 0) {
		    callback(result);
		} else {
		    var data = result.getData();
		    callback(new AOP.OK(LRSC.Mac.unpackState(data)[0]));
		}
	    });
	}
    }
);





/**
 * @type LRSC.Mac.Socket
 * @private
 */
LRSC.Mac.SOCKET = null;

    
LRSC.Mac.getSocket = function() {
    if (!LRSC.Mac.SOCKET) {
	LRSC.Mac.SOCKET = new LRSC.Mac.Socket();
    }
    return LRSC.Mac.SOCKET;
};













CLI.LRSC.MacAttachCommand = function(shell, name) {
    this.description =
	"Attach to the LRSC mac library. Debug events from the Mac library can now be received and displayed.";
    var cmdSpec = new Sonoran.CLI.Spec(name, Sonoran.CLI.DST_MANY_MOTES);
    CLI.Command.call(this, shell, cmdSpec, [ new GetOpt.EndOfArgs() ], 0);
};

/** @private */
CLI.LRSC.MacAttachCommand.prototype = extend(
    CLI.Command.prototype,
    {
        /** @private */
        exec: function(callback) {
	    this.cmdSpec.getMotes().forEach(function(mote) { LRSC.Mac.getSocket().attach(mote, BLCK); });
	    callback(new AOP.OK());
	}
    }
);

CLI.LRSC.MacDetachCommand = function(shell, name) {
    this.description =
	"Detach from the LRSC mac library.";
    var cmdSpec = new Sonoran.CLI.Spec(name, Sonoran.CLI.DST_MANY_MOTES);
    CLI.Command.call(this, shell, cmdSpec, [ new GetOpt.EndOfArgs() ], 0);
};

/** @private */
CLI.LRSC.MacDetachCommand.prototype = extend(
    CLI.Command.prototype,
    {
        /** @private */
        exec: function(callback) {
	    this.cmdSpec.getMotes().forEach(function(mote) { LRSC.Mac.getSocket().detach(mote, BLCK); });
	    callback(new AOP.OK());
	}
    }
);



CLI.LRSC.MacJoinCommand = function(shell, name) {
    this.description =
	"Issue command to LRSC mac to join the network.";
    var cmdSpec = new Sonoran.CLI.Spec(name, Sonoran.CLI.DST_MANY_MOTES);
    CLI.Command.call(this, shell, cmdSpec, [ new GetOpt.EndOfArgs() ], 0);
};

/** @private */
CLI.LRSC.MacJoinCommand.prototype = extend(
    CLI.Command.prototype,
    {
        /** @private */
        exec: function(callback) {
	    this.cmdSpec.getMotes().forEach(function(mote) { LRSC.Mac.getSocket().join(mote, BLCK); });
	    callback(new AOP.OK());
	}
    }
);


CLI.LRSC.MacShutdownCommand = function(shell, name) {
    this.description =
	"Issue command to LRSC mac to shutdown the network stack.";
    var cmdSpec = new Sonoran.CLI.Spec(name, Sonoran.CLI.DST_MANY_MOTES);
    CLI.Command.call(this, shell, cmdSpec, [ new GetOpt.EndOfArgs() ], 0);
};

/** @private */
CLI.LRSC.MacShutdownCommand.prototype = extend(
    CLI.Command.prototype,
    {
        /** @private */
        exec: function(callback) {
	    this.cmdSpec.getMotes().forEach(function(mote) { LRSC.Mac.getSocket().shutdown(mote, BLCK); });
	    callback(new AOP.OK());
	}
    }
);





CLI.LRSC.MacStateCommand = function(shell, name) {
    this.description =
	"Get state of LRSC mac.";
    var cmdSpec = new Sonoran.CLI.Spec(name, Sonoran.CLI.DST_MANY_MOTES);
    CLI.Command.call(this, shell, cmdSpec, [ new GetOpt.EndOfArgs() ], 0);
};

/** @private */
CLI.LRSC.MacStateCommand.prototype = extend(
    CLI.Command.prototype,
    {
        /** @private */
        exec: function(callback) {
	    var objs = this.cmdSpec.getMotes().map(function(mote) { return LRSC.Mac.getSocket().getState(mote, BLCK); });
	    var txt = Util.formatData(objs);
	    callback(new AOP.OK(txt));
	}
    }
);




CLI.LRSC.MacUpCommand = function(shell, name) {
    this.description =
	"Issue command to LRSC mac to transmit a packet to the server.";
    this.confirmOpt = new GetOpt.Option("c", "--confirm", 0, null, "Require confirmation from server.");
    var optSet = new GetOpt.OptionSet([ this.confirmOpt  ]);
    this.portSpec = new GetOpt.Number("port", "Port");
    this.dataSpec = new GetOpt.Simple("data", "Payload");
    this.restOfArgs = new GetOpt.RestOfArgs("If data is a Formatter.pack format string, parameters for pack() function call.");
    var cmdSpec = new Sonoran.CLI.Spec(name,  Sonoran.CLI.DST_MANY_MOTES);
    CLI.Command.call(this, shell, cmdSpec, [ optSet, this.portSpec, this.dataSpec, this.restOfArgs ], 0);
};

/** @private */
CLI.LRSC.MacUpCommand.prototype = extend(
    CLI.Command.prototype,
    {
        /** @private */
        exec: function(callback) {
	    var motes = this.cmdSpec.getMotes();
	    var confirm = this.confirmOpt.isSet();
	    var port = this.portSpec.getNumber();
	    var payload;
	    try {
		payload = Formatter.hexToBin(this.dataSpec.getArg());
	    } catch(ex) {
		try {
		    payload = Formatter.pack(this.dataSpec.getArg(), this.restOfArgs.getRestArgs().map(function(s) { return parseInt(s); }));
		} catch(ex) {
		    throw new Exception(sprintf("Invalid payload: %s %s", this.dataSpec.getArg(), this.restOfArgs.getRestArgs().join(" ")));
		}
	    }
	    var confirm =  this.confirmOpt.isSet(); 
	    motes.forEach(function(mote) { LRSC.Mac.getSocket().rqTransmit(mote, confirm, port, payload, BLCK); });
	    callback(new AOP.OK());
	}
    }
);











CLI.LRSC.MacBeaconCommand = function(shell, name) {
    this.description =
	"'lrsc-mac-beacon start' starts scanning for a beacon.\n" +
	"'lrsc-mac-beacon stop' stops scanning for a beacon.\n" +
	"'lrsc-mac-beacon info' prints information about the last beacon received.";
    var optSet = new GetOpt.OptionSet([ ]);
    this.modeSpec = new GetOpt.Keywords("mode", "'start', 'stop' or 'info'.", [ "start", "stop", "info" ]);
    var cmdSpec = new Sonoran.CLI.Spec(name, Sonoran.CLI.DST_MANY_MOTES);
    CLI.Command.call(this, shell, cmdSpec, [ optSet, this.modeSpec, new GetOpt.EndOfArgs() ]);
};

/** @private */
CLI.LRSC.MacBeaconCommand.prototype = extend(
    CLI.Command.prototype,
    {
        /** @private */
        exec: function(callback) {
            var motes = this.cmdSpec.getMotes();
	    var mode = this.modeSpec.getSelectedKeyword();
	    if (mode == 'start' || mode == 'stop') {
		var enable = (mode=='start');
		motes.forEach(function(mote) { LRSC.Mac.getSocket().beaconScan(mote, enable, BLCK); });
		callback(new AOP.OK());
	    } else {
		var arr = motes.map(function(mote) { return LRSC.Mac.getSocket().getBcnInfo(mote, BLCK); });
		//callback(new AOP.OK(Util.formatData(arr)));
		callback(new AOP.OK(arr.join("\n")));
	    }
	}
    }
);









CLI.LRSC.MacAppeuiCommand = function(shell, name) {
    this.description =
	"Without parameter, retrieves the application EUI from the LRSC mac. If an EUI is specified,\n" +
	"it is persistently stored on the device.";
    var optSet = new GetOpt.OptionSet([ ]);
    this.appEuiSpec = new GetOpt.Simple("eui64", "complete APP EUI-64.");
    var cmdSpec = new Sonoran.CLI.Spec(name, Sonoran.CLI.DST_MANY_MOTES);
    CLI.Command.call(this, shell, cmdSpec, [ optSet, this.appEuiSpec ], 0);
};

/** @private */
CLI.LRSC.MacAppeuiCommand.prototype = extend(
    CLI.Command.prototype,
    {
        /** @private */
        exec: function(callback) {
            var motes = this.cmdSpec.getMotes();
	    var eui64 = this.appEuiSpec.getArg();
	    var ret = [];
            if (eui64) {
                try {
                    eui64 = Util.UUID.completeEUI(eui64);
                } catch (x) {
                    callback(new AOP.ERR("Invalid EUI-64: " + x));
                    return;
                }
		motes.forEach(function(mote) { LRSC.Mac.getSocket().setAppEui(mote, eui64, BLCK); });
	    }
	    var euis = motes.map(function(mote) { return LRSC.Mac.getSocket().getAppEui(mote, BLCK); });
	    callback(new AOP.OK(euis));
        }
    }
);






CLI.LRSC.MacAdrCommand = function(shell, name) {
    this.description =
	"Enable or disable adaptive datarate mode. If adaptive datarate mode is disabled, datarate and transmit power\n" +
	"for the device to use can be configured.";
    var optSet = new GetOpt.OptionSet([ ]);
    this.enableSpec = new GetOpt.Keywords("mode", "'enable' or 'disable'.", [ "enable", "disable" ]);
    var sa = [  "DR_SF12", "DR_SF11", "DR_SF10", "DR_SF9", "DR_SF8", "DR_SF7", "DR_SF7_BW250",  "DR_FSK" ];
    this.drSpec = new GetOpt.Keywords("datarate", null, sa, sa);
    this.txpowSpec = new GetOpt.Number("txpow", "Transmit power.", null, null);
    this.txpowSpec.setRange(14, 2, 30);
    var cmdSpec = new Sonoran.CLI.Spec(name, Sonoran.CLI.DST_MANY_MOTES);
    CLI.Command.call(this, shell, cmdSpec, [ optSet, this.enableSpec, this.drSpec, this.txpowSpec ], 3);
};

/** @private */
CLI.LRSC.MacAdrCommand.prototype = extend(
    CLI.Command.prototype,
    {
        /** @private */
        exec: function(callback) {
            var motes = this.cmdSpec.getMotes();
	    var enable = (this.enableSpec.getSelectedKeywordIndex() == 0);
	    var datarate = LRSC[this.drSpec.getSelectedKeyword()];
	    var txpow = this.txpowSpec.getNumber();
	    //printf("MacAdrCommand: datarate %d, txpow %d\n", datarate, txpow);
	    motes.map(function(mote) { return LRSC.Mac.getSocket().setAdrMode(mote, enable, datarate, txpow, BLCK); });
	    callback(new AOP.OK());
        }
    }
);






CLI.LRSC.MacPingableCommand = function(shell, name) {
    this.description =
	"Enable or disable pingable mode, i.e. define receive window for a mote based on beacon and periodicity.\n" +
	"Number of receive windows per beacon interval is 1/(2^Periodicity).";
    var optSet = new GetOpt.OptionSet([ ]);
    this.enableSpec = new GetOpt.Keywords("mode", "'start' or 'stop'.", [ "start", "stop" ]);
    this.periodicitySpec = new GetOpt.Number("periodicity", "Periodicity.", null, null);
    this.periodicitySpec.setRange(0, 0, 7);
    var cmdSpec = new Sonoran.CLI.Spec(name, Sonoran.CLI.DST_MANY_MOTES);
    CLI.Command.call(this, shell, cmdSpec, [ optSet, this.enableSpec, this.periodicitySpec ], 1);
};

/** @private */
CLI.LRSC.MacPingableCommand.prototype = extend(
    CLI.Command.prototype,
    {
        /** @private */
        exec: function(callback) {
            var motes = this.cmdSpec.getMotes();
	    var enable = (this.enableSpec.getSelectedKeywordIndex() == 0);
	    var periodicity = !enable ? 0xff : this.periodicitySpec.getNumber();
	    motes.map(function(mote) { return LRSC.Mac.getSocket().setPingable(mote, periodicity, BLCK); });
	    callback(new AOP.OK());
        }
    }
);






CLI.LRSC.MacConfigCommand = function(shell, name) {
    this.description =
	"Configure various Mac options.\n";
    this.unlimitSpec = new GetOpt.Keywords("mode", "'limit' or 'unlimit'.", [ "limit", "unlimit" ]);
    this.unlimitOpt = new GetOpt.Option("l", "--limit-opt", 0, null, "Disable or enable dutycycle.", this.unlimitSpec);
    var optSet = new GetOpt.OptionSet([ this.unlimitOpt ]);
    var cmdSpec = new Sonoran.CLI.Spec(name, Sonoran.CLI.DST_MANY_MOTES);
    CLI.Command.call(this, shell, cmdSpec, [ optSet, new GetOpt.EndOfArgs() ]);
};

/** @private */
CLI.LRSC.MacConfigCommand.prototype = extend(
    CLI.Command.prototype,
    {
        /** @private */
        exec: function(callback) {
            var motes = this.cmdSpec.getMotes();
	    var bytes = Formatter.pack("1u", (this.unlimitOpt.isSet() && this.unlimitSpec.getSelectedKeywordIndex() == 1) ? 1 : 0);
	    //printf("MacConfig: %s\n", Formatter.binToHex(bytes));
	    motes.map(function(mote) {
		var ret = LRSC.Mac.getSocket().sendCommand(mote, LRSCMacDEFS.LIP_CMD_CONFIG, bytes, BLCK);
		printf("MacConfig: %s\n", Formatter.binToHex(bytes));
	    });
	    callback(new AOP.OK());
        }
    }
);









var LRSCMacDEFS = {

  BCNINFO_FLAGS_OFF                       : 0x8,
  BCNINFO_INFO_OFF                        : 0x9,
  BCNINFO_LAT_OFF                         : 0xA,
  BCNINFO_LENGTH                          : 0x16,
  BCNINFO_LON_OFF                         : 0xE,
  BCNINFO_NETID_OFF                       : 0x12,
  BCNINFO_TICKS_OFF                       : 0x0,
  BCNINFO_TIME_OFF                        : 0x4,
  LIP_CMD_ADR_MODE                        : 0xA,
  LIP_CMD_ATTACH                          : 0x1,
  LIP_CMD_CMD_MASK                        : 0x3F,
  LIP_CMD_CONFIG                          : 0xD,
  LIP_CMD_DETACH                          : 0x2,
  LIP_CMD_GET_APP_EUI                     : 0x4,
  LIP_CMD_GET_BCN_INFO                    : 0xB,
  LIP_CMD_GET_STATE                       : 0x3,
  LIP_CMD_JOIN                            : 0x6,
  LIP_CMD_OFF                             : 0x7,
  LIP_CMD_REPLY_ERR                       : 0x40,
  LIP_CMD_REPLY_MASK                      : 0xC0,
  LIP_CMD_REPLY_OK                        : 0x80,
  LIP_CMD_SCAN_BEACON                     : 0x9,
  LIP_CMD_SET_APP_EUI                     : 0x5,
  LIP_CMD_SET_PINGABLE                    : 0xC,
  LIP_CMD_SET_TX_DATA                     : 0x8,
  LIP_CMD_SHUTDOWN                        : 0x7,
  LIP_ERR_BADCMDLEN                       : 0x1,
  LIP_ERR_EXCEPTION                       : 0x2,
  LIP_ERR_INVALIDSTATE                    : 0x4,
  LIP_ERR_UNKNOWNCMD                      : 0x3,
  LIP_EV_TRACE                            : 0x16,
  LIP_EV_TRACE_BUF                        : 0x1B,
  LIP_EV_TRACE_STATE                      : 0x18,
  LIP_EV_TRACE_U                          : 0x17,
  LIP_EV_TRACE_UL                         : 0x19,
  LIP_EV_TRACE_ULL                        : 0x1A,
  LIP_HDR_LEN                             : 0x8,
  LIP_PORT                                : 0x59,
  SRC_MAC_JOIN                            : 0x8101,
  SRC_MAC_ONEVENT                         : 0x8100,
  SRC_MAC_RXDATA                          : 0x8103,
  SRC_MAC_SETTXDATA                       : 0x8102


};var LRSCdev = {

  LORA_SINGLESHOT_RX                      : 0xFC00,
  CMD_CLEAR_TXDATA                        : 0x9,
  CMD_GET_SESSION                         : 0x8,
  CMD_GET_STATE                           : 0xA,
  CMD_JOIN                                : 0x5,
  CMD_SEND_ALIVE                          : 0xC,
  CMD_SET_ARTEUI                          : 0x2,
  CMD_SET_DEVKEY                          : 0x1,
  CMD_SET_PINGABLE                        : 0xD,
  CMD_SHUTDOWN                            : 0xB,
  CMD_START_SCAN                          : 0x6,
  CMD_STOP_SCAN                           : 0x7,
  CMD_TXDATA                              : 0x3,
  CMD_TXDATACONF                          : 0x4,
  CMD_UNLIMIT_BANDS                       : 0xE,
  EV_BEACON_FOUND                         : 0x2,
  EV_BEACON_MISSED                        : 0x3,
  EV_BEACON_TRACKED                       : 0x4,
  EV_JOINED                               : 0x6,
  EV_JOINING                              : 0x5,
  EV_JOIN_FAILED                          : 0x8,
  EV_LINK_DEAD                            : 0xE,
  EV_LOST_TSYNC                           : 0xB,
  EV_REJOIN_FAILED                        : 0x9,
  EV_RESET                                : 0xC,
  EV_RFU1                                 : 0x7,
  EV_RXCOMPLETE                           : 0xD,
  EV_SCAN_TIMEOUT                         : 0x1,
  EV_TXCOMPLETE                           : 0xA,
  MACSTATE_OFF_BCNDATLEN                  : 0x20,
  MACSTATE_OFF_BCNRSSI                    : 0x1E,
  MACSTATE_OFF_BCNSNR                     : 0x1F,
  MACSTATE_OFF_DATARATE                   : 0x1A,
  MACSTATE_OFF_DEVADDR                    : 0x4,
  MACSTATE_OFF_DRIFT                      : 0x14,
  MACSTATE_OFF_LASTDRIFTDIFF              : 0x16,
  MACSTATE_OFF_MAXDRIFTDIFF               : 0x18,
  MACSTATE_OFF_NETID                      : 0x0,
  MACSTATE_OFF_SEQNODOWN                  : 0xC,
  MACSTATE_OFF_SEQNOUP                    : 0x8,
  MACSTATE_OFF_TXCHNL                     : 0x1B,
  MACSTATE_OFF_TXCNT                      : 0x1D,
  MACSTATE_OFF_TXFREQ                     : 0x10,
  MACSTATE_OFF_TXPOW                      : 0x1C,
  MACSTATE_SIZE                           : 0x21,
  PGET_ADR_MODE                           : 0xA,
  PGET_BCN_FLAGS                          : 0x4,
  PGET_BCN_INFO                           : 0x6,
  PGET_BCN_LAT                            : 0x7,
  PGET_BCN_LON                            : 0x8,
  PGET_BCN_RSSI_SNR                       : 0x9,
  PGET_BCN_TICKS                          : 0x3,
  PGET_BCN_TIME                           : 0x5,
  PGET_DEVADDR                            : 0x0,
  PGET_NETID                              : 0x2,
  PGET_PINGABLE                           : 0xC,
  PSET_ADR_MODE                           : 0xB,
  PSET_DEVADDR                            : 0x1,
  TXRX_ACK                                : 0x80,
  TXRX_DNW1                               : 0x1,
  TXRX_DNW2                               : 0x2,
  TXRX_NACK                               : 0x40,
  TXRX_NOPORT                             : 0x20,
  TXRX_PING                               : 0x4


};
