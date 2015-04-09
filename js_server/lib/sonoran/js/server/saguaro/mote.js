//  (C) COPYRIGHT INTERNATIONAL BUSINESS MACHINES CORPORATION 2006-2010
//                       ALL RIGHTS RESERVED
//        IBM Research Division, Zurich Research Laboratory
// --------------------------------------------------------------------



/**
 * Saguaro.MoteImpl represents the additional functionality of a simulated mote.
 * Use Saguaro.mote2impl to retrieve a reference to a Saguaro.MoteImpl object
 * from a Sonoran.Mote reference.
 * @see Sonoran.Mote#getImpl
 * @class
 * @constructor
 * @param conn
 * @param mote
 */
Saguaro.MoteImpl = function(/** Saguaro.Connection */conn, /** Sonoran.Mote */mote, /** Number */moteid) {
    this.mote = mote;
    this.moteid = moteid;
    this.conn = conn;
    this.info = {};
    this.mspaces = null;
    this.devMap = {};
    this.assemblies = new Sonoran.AsmListing(mote, 'saguaro');
    this.evConfigs = new Saguaro.EvConfigs(mote);
    this.spiHandlers = [];
    this.i2cHandlers = [];
};




/** Prototype. */
Saguaro.MoteImpl.prototype = {
    /**
     * The mote id local to the saguaro process.
     * @type Number
     * @private
     */
    moteid: -1,
    /**
     * Saguaro connection of this mote
     * @type Saguaro.Connection
     * @private
     */
    conn: null,
    /**
     * Result of mote-info command
     * @type Object
     * @private
     */
    info: null,
    /**
     * mspaces part of mote-info result
     * @type Array
     * @private
     */
    mspaces: null,
    /**
     * cpu part of mote-info result
     * @type Array
     * @private
     */
    cpu: null,
    /**
     * Map of device name to Saguaro.Device instance.
     * @type Object
     * @private
     */
    devMap: null,
    /**
     * Assemblies installed on this mote and read from simulation registry.
     * @type Sonoran.AsmListing
     * @private
     */
    assemblies: null,
    /**
     * Event configurations
     * @type Saguaro.EvConfigs
     * @private
     */
    evConfigs: null,
    
    /**
     * toString implementation.
     * @returns {String} string
     */
    toString: function() {
        return this.mote.toString();
    },



    /**
     * Return saguaro connection of this mote.
     * @returns {Saguaro.Connection} saguaro connection
     */
    getConnection: function() {
	return this.conn;
    },


    /**
     * @returns {Saguaro.EvConfigs} event configurations for this mote
     */
    getEvConfigs: function() {
	return this.evConfigs;
    },


    /**
     * Return assemblies stored in the registry in the saguaro simulation.
     * @returns {Sonoran.AsmListing} Sonoran.AsmListing
     */
    getAssemblies: function() {
	return this.assemblies;
    },


    /**
     * Returns result of last mote-info command invocation as received by the saguaro
     * command.
     * @returns {Object} result of last mote-info command
     */
    getMoteInfo: function() {
	return this.info;
    },


    /**
     * Returns result of last mote-info command invocation as received by the saguaro
     * command, but only the 'devices' section.
     * @returns {Object} result of last mote-info command (but only its 'devices' section)
     */
    getDeviceInfos: function() {
        var ret = [];
        for (var n in this.devMap) {
            ret.push(this.devMap[n].getInfo());
        }
	return ret;
    },


    /**
     * @returns {Saguaro.Device}  the device or null
     */
    getDeviceInstance: function(/** String */name) {
        return this.devMap[name];
    },

    /**
     * @returns {Saguaro.Device[]}  the device or null
     */
    getDevicesByType: function(/** String */typeName) {
        var ret = [];
        for (var n in this.devMap) {
	    var dev = this.devMap[n];
	    if( dev.getType() == typeName )
                ret.push(dev);
        }
	return ret;
    },

    /**
     * Return array with device names.
     * @returns {String[]} device names
     */
    getDeviceNames: function() {
        var ret = [];
        for (var n in this.devMap) {
            ret.push(n);
        }
        return ret;
    },


    /**
     * Return object describing CPU. Contains at least a property 'name'.
     * @returns {Object} cpu information
     */
    getCPU: function() {
	return this.cpu;
    },


    /**
     * Return saguaro-process specific mote id.
     * @returns {Number} mote id
     */
    getMoteId: function() {
	return this.moteid;
    },


    /**
     * Create mote command ready to be issued.
     * @param cmd       Command name
     * @param args      Command args (added to args field in json structure)
     * @param extra     Optional, extra parameters (added at top-level to json structore)
     * @return {Saguaro.Command} command ready to be issued
     * @private
     */
    getMoteCmd: function(/** String */cmd, /** Blob */args, /** Object */extra) {
	return this.conn.getMoteCmd(this.moteid, cmd, args, extra);
    },


    /**
     * Returns the property 'udpport' on the LIP device of this mote.
     * @returns {Number} property 'udpport' of the LIP device on this mote or -1 if no information is available
     */
    getUDPPort: function() {
	var dev = this.getDeviceInstance(Saguaro.DEVN_LIP);
        if (!dev) {
            return -1;
        }
        var state = dev.getCachedState();
        if (!state) {
            return -1;
        }
	//return state.getState().udpport;
	return state.udpport;
    },


    /**
     * Updates the position of the mote in the simulation and signals operation end by 
     * invoking the specified callback. If position is not 'undefined', position is set.
     * @param position   Object (with x or y or z) or undefined (position is retrieved).
     * @param callback   
     * @throws {AOP.Exception}
     */
    updatePosition: function(/** Object */position, /** DFLT_ASYNC_CB */callback) {
	if (BC.is(callback)) { return BC.exec(arguments.callee, this, arguments); }
	assert(!position || (position.x!==undefined||position.y!==undefined||position.z!==undefined));
	var mote = this.mote;
	this.conn.getMoteCmd(this.moteid, "mote-position", position).issue1(function(result) {
	    if (result.code === 0) {
		if (position) {
		    mote.setPosition(position);
		} else {
		    var reply = result.getData().getReply();
		    if (reply.data) {
			mote.setPosition(reply.data);
		    }
		}
	    }
	    callback(result);
	});
    },


    /**
     * Reset this simulated mote.
     * @param timeout                  Number of milliseonds to wait for mote to be alive again
     * @param mode                     Must be 'cold', 'warm', 'bod' or 'err' or null (default: cold)
     * @param callback                 
     * @throws {AOP.Exception}
     */
    reset: function(/** Number */timeout, /** String */mode, /** DFLT_ASYNC_CB */callback) {
	if (BC.is(callback)) { return BC.exec(arguments.callee, this, arguments); }
        var _this = this;
        mode = mode||'cold';
        this.mote.updateState(Sonoran.Mote.OFF);
        this.conn.resetMotes(this.moteid, mode, function(result) {
            if (result.code!=0) {
                callback(result);
            } else {
                _this.mote.waitForState(Sonoran.Mote.ON, timeout, callback);
            }
        });
    },


    /**
     * Return memory spaces attribute. Returns array of object where each object decribes a memory space.
     * Each memory space contains at least the property 'name'.
     * @returns {Object} memory space attributes
     */
    getMemSpaces: function() {
	return this.mspaces;
    },


    /**
     * @returns {String[]} the names of the memory spaces.
     */
    getMemSpaceNames: function() {
	var mspaces = this.mspaces;
	var ret = [];
	for (var i = 0; i < mspaces.length; i++) {
	    ret.push(mspaces[i].name);
	}
	return ret;
    },


    /**
     * Return memory space object with specified name.
     * @returns {Object} memory space object
     */
    getMemSpace: function(/** String */name) {
	var mspaces = this.mspaces;
	for (var i = 0; i < mspaces.length; i++) {
	    if (mspaces[i].name == name) {
	        return mspaces[i];
	    }
	}
	return null;
    },


    /**
     * Send a packet to this mote.
     * @param dstport
     * @param srcport
     * @param data
     * @param timer
     * @see Sonoran.Socket
     * @private
     */
    send: function(/** Number */dstport, /** Number */srcport, /** String */data, /** Timer.Timer */timer) {
        this.conn.send(this, dstport, srcport, data, timer);
    },


    /**
     * Perform mote-info command for this mote.
     *  @param callback      
     * @returns {Saguaro.Response}
     * @throws {AOP.Exception}
     */
    moteInfo: function(/** DFLT_ASYNC_CB */callback) {
	if (BC.is(callback)) { return BC.exec(arguments.callee, this, arguments); }
	var _this = this;
	this.conn.getMoteCmd(this.moteid, "mote-info").issue1(function(result) {
	    if (result.code === 0) {
		var reply = result.getData().getReply();
		assert(reply.data);
		_this.onMoteInfo(reply.data);
	    }
	    callback(result);
	});
    },


    /**
     * Perform mote-time command for this mote.
     *  @param callback      
     * @returns {Saguaro.Response}
     * @throws {AOP.Exception}
     */
    moteTime: function(/** DFLT_ASYNC_CB */callback) {
	return this.conn.getMoteCmd(this.moteid, "mote-time").issue1(callback);
    },


    /**
     * 'break-point' command. Retrieve list of breakpoints.
     * @param callback      Callback function.
     *  @param callback      
     * @returns {Saguaro.Response}
     * @throws {AOP.Exception}
     * @private
     */
    breakPointList: function(/** DFLT_ASYNC_CB */callback) {
        return this.conn.getMoteCmd(this.moteid, "break-point").issue1(callback);
    },


    /**
     * 'break-point' command. Set a breakpoint.
     * @param breakid       Breakpoint id
     * @param locspec       Location specification
     *  @param callback      
     * @returns {Saguaro.Response}
     * @throws {AOP.Exception}
     * @private
     */
    breakPointSet: function(/**Number */breakid, /** String */locspec, /** DFLT_ASYNC_CB */callback) {
        var args = {
            breakid: breakid,
            at:locspec
        };
        return this.conn.getMoteCmd(this.moteid, "break-point", args).issue1(callback);
    },


    /**
     * 'break-point' command. Delete a breakpoint.
     * @param breakid       Breakpoint id
     *  @param callback      
     * @returns {Saguaro.Response}
     * @throws {AOP.Exception}
     * @private
     */
    breakPointDel: function(/**Number */breakid, /** DFLT_ASYNC_CB */callback) {
        assert(typeof(breakid) == 'number');
        assert(typeof(callback) == 'function');
        var args = {};
        args['breakid'] = breakid;
        args['delete'] = breakid;
        return this.conn.getMoteCmd(this.moteid, "break-point", args).issue1(callback);
    },


    /**
     * 'watch-point' command. Set a watchpoint.
     * @param watchid       Watchpoint id
     * @param access
     * @param spec
     * @returns {Saguaro.Response}
     * @throws {AOP.Exception}
     * @private
     */
    watchPointSet: function(/**Number */watchid, /** String */spec, /** String */access, /** DFLT_ASYNC_CB */callback) {
        var args = {
            watchid: watchid,
            spec: spec,
            access: access
        };
        return this.conn.getMoteCmd(this.moteid, "watch-point", args).issue1(callback);
    },


    /**
     * 'watch-point' command. Delete a watchpoint.
     * @param watchid       Watchpoint id
     * @param callback      Callback function.
     * @returns {Saguaro.Response}
     * @throws {AOP.Exception}
     * @private
     */
    watchPointDel: function(/**Number */watchid, /** DFLT_ASYNC_CB */callback) {
        var args = {};
        args['watchid'] = watchid;
        args['delete'] = 1;
        return this.conn.getMoteCmd(this.moteid, "watch-point", args).issue1(callback);
    },


    
    /**
     * 
     * @param haltConditions  Map of category:evname to 0 or 1.
     * @param callback
     */
    programHaltConditions: function(/** Object */haltConditions, /** DFLT_ASYNC_CB */callback) {
	if (BC.is(callback)) { return BC.exec(arguments.callee, this, arguments); }
	var sa = Saguaro.haltConditons2saguaroArgs(haltConditions);
	this.evConfigs.programFlags(sa, callback);
    },


    /**
     * @returns Map of category:evname to 0 or 1.
     */
    getHaltConditions: function() {
	var ret = {};
	var name2category = this.evConfigs.forEach(function(evcat, evconf) {
	    var key = evcat.getName() + ":" + evconf.getName();
	    var val = evconf.causesHalt() ? 1 : 0;
	    ret[key] = val;
	});
	return ret;
    },

    /**
     * Change packet error rate for received radio PDUs.
     *  @param per Error rate in ppm (part per million). Legal value range 0-999999.
     *             Zero means no packet errors.
     * @returns {Saguaro.Response}
     * @throws {AOP.Exception}
     */
    setPacketErrorRate: function(/** Number */per, /** DFLT_ASYNC_CB */callback) {
	if (BC.is(callback)) { return BC.exec(arguments.callee, this, arguments); }
        var _this = this;
        var dev = Saguaro.getRadioDevice(this);
        if (!dev) {
	    callback(new AOP.ERR("No radio device found"));
        } else {
	    dev.setState({packetErrorRate:per}, callback);
	}
    },



    /**
     * 'inspect-registry' command.
     * @param update                   Update assembly listing on associated mote
     * @param callback
     * @returns {Sonoran.AsmListing}
     * @throws {AOP.Exception}
     * @private
     */
    inspectRegistry: function(/** Boolean */update, /** DFLT_ASYNC_CB */callback) {
	if (BC.is(callback)) { return BC.exec(arguments.callee, this, arguments); }
        var _this = this;
        var evaluator = function(result) {
	    if (result.code != 0) {
                return result;
	    }
	    var replies = result.getData().getReplies();
	    assert(replies.length===1);
	    var reply = replies[0];
	    var data = reply.data;
            var asmentries = [];
            for (var j = 0; j < data.length; j++) {
		var obj = data[j];
		var asmid = obj.asmid;
		var asmobj = obj.asmobj;
		var md = /^.+:([a-fA-F\d]+)$/.exec(asmid);
		assert(md);
		asmid = parseInt(md[1], 16);
		asmentries.push(new Sonoran.AsmEntry(new Sonoran.AsmName(obj.name, obj.majorVersion, obj.minorVersion, obj.build), asmid, 0, asmobj));
            }
            _this.assemblies.onListing(asmentries);
            return new AOP.OK(_this.assemblies);
        };
        return this.conn.getMoteCmd(this.moteid, "inspect-registry").issue4(evaluator, callback);
    },


    /**
     * 'inspect-resources' command.
     * @param callback
     * @returns {Saguaro.Response}
     * @throws {AOP.Exception}
     */
    inspectResources: function(/** DFLT_ASYNC_CB */callback) {
        return this.conn.getMoteCmd(this.moteid, "inspect-resources").issue1(callback);
    },


    /**
     * 'inspect-stack' command.
     * @param callback
     * @returns {Saguaro.Response}
     * @throws {AOP.Exception}
     */
    inspectVMStack: function(/** DFLT_ASYNC_CB */callback) {
        return this.conn.getMoteCmd(this.moteid, "inspect-vmstack").issue1(callback);
    },


    /**
     * 'inspect-object' command.
     * @param jref                     'jref' argument
     * @param slots
     * @param callback
     * @returns {Saguaro.Response}
     * @throws {AOP.Exception}
     */
    inspectObject: function(/** String */jref, /** int[][] */slots, /** DFLT_ASYNC_CB */callback) {
        var args = [ { jref: jref, slots: slots?slots:[] } ];
        return this.conn.getMoteCmd(this.moteid, "inspect-object", args).issue1(callback);
    },

    /**
     * 'inspect-delegate' command.
     * @param del   
     * @param callback
     * @returns {Saguaro.Response}
     * @throws {AOP.Exception}
     */
    inspectDelegate: function(/** String */del, /** DFLT_ASYNC_CB */callback) {
        return this.conn.getMoteCmd(this.moteid, "inspect-delegate", [ del ]).issue1(callback);
    },


    /**
     * Issue saguaro 'power-charge' command. With 'charge' being undefined or null, the current power
     * values are returned. The format string for charge is [num[unit]] with unit: [munpf]{C|A[sh]}.
     * @param charge 
     * @param callback
     * @returns {Saguaro.Response}
     * @throws {AOP.Exception}
     */
    powerCharge: function(/** String */charge, /** DFLT_ASYNC_CB */callback) {
        var args = null;
        if (charge) {
            args = { charge: charge };
        }
        return this.conn.getMoteCmd(this.moteid, "power-charge", args).issue1(callback);
    },


    /**
     * Issue saguaro 'power-capacity' command. With 'capacity' being null or undefined, the current power
     * values are returned. The format string for capacity is [num[unit]] with unit: [munpf]{C|A[sh]}.
     * @param capacity 
     * @param callback
     * @returns {Saguaro.Response}
     * @throws {AOP.Exception}
     */
    powerCapacity: function(/** String */capacity, /** DFLT_ASYNC_CB */callback) {
        var args = null;
        if (capacity) {
            args = { capacity: capacity };
        }
        return this.conn.getMoteCmd(this.moteid, "power-capacity", args).issue1(callback);
    },

  

    /**
     * Update mote attributes. If attributes have changed, returns true.
     * Otherwise, returns false.
     * Detects change of uniqueid and fires event accordingly in this case.
     * @param atttrs                updated saguaro mote attributes
     * @returns {Boolean} whether attrs in mote have changed.
     * @private
     */
    onMoteInfo: function(/** Blob */info) {
        assert(!info.type);
        assert(!info.power);
        assert(!info.position);
        assert(info.moteclass);
        assert(info.moteclass.dllname);
        assert(info.name);
        this.mote.setName(this.mote.name, info.moteclass.dllname);
	var diff = {};
	var updated = Util.Blob.update(this.info, info, diff);
        this.mspaces = info.mspaces;
        this.cpu = info.cpu;
        for (var i = 0; i < info.devices.length; i++) {
            var devinfo = info.devices[i];
            var devname = devinfo.name;
            assert(devname);
            var d = this.devMap[devname];
            if (!d) {
		d = new Saguaro.Device(devname);
                d.setImpl(this);
                d.setName(devname);
                d.setType(devinfo.type);
                d.setDescription(devinfo.description);
                this.devMap[devname] = d;
            }
            assert(d);
            //d.setReportUpdates(devinfo.reportupdates);
        }

	var o_eui = this.mote.getUniqueid();
	assert(o_eui);
	var n_eui = info['eui64'];
	if (n_eui && o_eui!=n_eui) {
            this.mote.updateUniqueid(n_eui);
	}
	return updated;
    },



    /**
     * True if this mote is wired or connected by a static network such as 'dust'.
     * @returns {Boolean}
     */
    haveStaticConnection: function() {
	if (Saguaro.isDustMote(this.mote) || Saguaro.isAvrravenMote(this.mote)) {
	    return true;
	}
	var dev = this.getDeviceInstance(Saguaro.DEVN_LIP);
	if (!dev) {
	    return false;
	}
	var res = dev.getState(SCB);
	if (res.code !== 0) {
	    var msg = sprintf("Mote.haveStaticConnection: 'dev-get-state' failed: %s", res);
	    QUACK(0, msg);
	    Logger.err(msg);
	    return false;
	}
	var lip = res.getData(); //.getState();
        assert(lip&&lip.isOn!==undefined);
	return lip.isOn!==0;
    },

    /**
     * Handle halt event occured on connection.
     * @param ev
     * @param eventListeners
     * @param haltState
     * @private
     */
    onSaguaroEvent: function(/** Event */ev, /** Saguaro.Connection.EventListeners */eventListeners, /** Boolean */haltState) {
	var _this = this;
	var mote = this.mote;

	if (haltState === true) {
	    switch(ev.evname) {
	    case Sonoran.EV_NAME_NEEDMOREDATA: {
		var dev = this.getDeviceInstance(ev.device);
		if (dev) {
		    dev.onNeedMoreDataEvent(ev, eventListeners);
		}
		return;
	    }
	    case "spiTransfer": {
		for (var i = 0; i < this.spiHandlers.length; i++) {
		    var h = this.spiHandlers[i];
		    if ((h.simDevName==null || h.simDevName==ev.device) &&
			(h.csn==null || h.csn==ev.spiCsn) &&
			(h.spiBus==null || h.spiBus==ev.spiBus) &&
			(h.maxfreq==null || h.maxfreq >= ev.spiSpeed)
		       ) {
			   var resp;
			   try {
			       resp = h.callback(ev.mote, ev, ev.device, ev.spiBus, ev.spiCsn, ev.spiSpeed, ev.time, ev.spiData);
			   } catch (x) {
			       var msg = Runtime.dumpException(x, "SPI event: exception in callback: ");
			       Logger.err(msg);
			   }
			   if ((resp!=null && (typeof(resp) !== 'string' || resp.length!==ev.spiData.length))) {
			       Logger.err("SPI event: callback delivers invalid response object or invalid length: " + resp);
			       return;
			   }
			   eventListeners.setContinue(true, undefined, undefined, { spiData: resp }).setAbort(true, true);
			   return;
		       }
		}
		return;
	    }
	    case "i2cTransfer": {
		for (var i = 0; i < this.i2cHandlers.length; i++) {
		    var h = this.i2cHandlers[i];
		    if ((h.simDevName==null || h.simDevName==ev.device) &&
			(h.addr==null || h.addr==ev.i2cAddr) &&
			(h.i2cBus==null || h.i2cBus==ev.i2cBus) &&
			(h.maxfreq==null || h.maxfreq >= ev.i2cSpeed)
		       ) {
			   var resp;
			   try {
			       resp = h.callback(ev.mote, ev, ev.device, ev.i2cBus, ev.i2cAddr, ev.i2cSpeed, ev.time, ev.i2cData, ev.i2cRlen);
			   } catch (x) {
			       var msg = Runtime.dumpException(x, "I2C event: exception in callback: ");
			       Logger.err(msg);
			   }
			   if (resp!=null && typeof(resp) === 'string' ) {
			       resp = {i2cData:resp,i2cDelay:0};
			   }
			   eventListeners.setContinue(true, undefined, undefined, resp).setAbort(true, true);
			   return;
		       }
		}
		return;
	    }
	    }
	} 

	switch(ev.category) {
	case Sonoran.EV_CAT_MOTE: {
	    switch(ev.evname) {
	    case "brownout":
	    case "error": {
		QUACK(0, sprintf("Mote '%s' switched off due to event: %s", mote, ev.evname));
		mote.updateState(Sonoran.Mote.OFF);
		break;
	    }
	    case "position": {
		mote.position = { x: ev.x, y: ev.y, z: ev.z };
		break;
	    }
	    case "reset": {
		if (Saguaro.isDustMote(mote) || Saguaro.isAvrravenMote(mote) || Saguaro.isLoraGwMote(mote)) {
		    mote.switchOnWithDelay(200);
		}
		else if( mote.getType().match(/^(\w+-)?concentrator$/) ) {
		    mote.switchOnWithDelay(200);
		}
		break;
	    }
	    case "lipUp":
		mote.switchOnWithDelay(100);
		break;
	    }
	    break;
	}
	case "vm": {
	    switch(ev.evname) {
	    case "asmDeleted": {
		assert(ev.asmid!==undefined&&ev.asmIdentity!==undefined);
		var asmid = Saguaro.parseEventAsmId(ev.asmid);
		this.assemblies.onRemove(asmid);
		break;
	    }
	    case "asmCtor": {
		//QUACK(0, "EV_VM_ASMCTOR: " + ev.category + ", " + ev.evname + ", " + ev.asmIdentity);
		assert(ev.operation==="installed"||ev.operation==="loaded");
		assert(ev.asmid!==undefined&&ev.asmIdentity!==undefined);
		var asmid = Saguaro.parseEventAsmId(ev.asmid);
		var asmIdentity = ev.asmIdentity;
		var asmName = new Sonoran.AsmName(asmIdentity);
                var asmobj = ev.asmobj;
                assert(asmobj);
		this.assemblies.onAdd(asmid, asmName, asmobj);

		var sdxFile = this.conn.sdxManager.getSDXFileForAsmIdentity(asmIdentity);
		if (sdxFile.sdxState < 0) {
		    sdxFile = this.conn.dispatcher.invokeHalted(function() {
			var f = _this.conn.sdxManager.loadSDXForAsmIdentity(asmIdentity);
			assert(f.sdxState>=0);
			return f;
		    });
		}
		//QUACK(0, "EV_VM_ASMCTOR: " + ev.category + ", " + ev.evname + ", " + sdxFile);
		assert(sdxFile);
		//var motes = Saguaro.lookupMotesByAsmFilter(asmName);
		//if (motes.length>1 || (motes.length===1 && motes[0]!==this.mote)) {
		var entries = this.assemblies.getMatchingEntries(asmName);
		if (entries.length==0) {
		    eventListeners.setContinue(true); //.setAbort(true, true);
		} else if (sdxFile.hasLines()) {
		    // halt for source inspection
		    ;
		} else {
		    eventListeners.setContinue(true); //.setAbort(true, true);
		}
		break;
	    }
	    }
	}
	}
	return;
    },


    /**
     * @param devName
     * @returns {Boolean}
     * @private
     */
    hasFeeder: function(/** String */devName) {
        var dev = this.devMap[devName];
	return (dev.getFeederGenerator() !=null);
    },


    /**
     * Register a handler for an SPI bus implementing the behavior of an attached slave device.
     * The simulation is halted when data is sent to the SPI slave device and the callback
     * returns the response which continue the simulation then.
     * @param simDevName The name of SPI device in the simulation or null for any device implementing an SPI bus.
     * @param spiBus     The index of the SPI bus. Some MCUs might have multiple SPI busses.
     * @param csn        The chip select pin activating a specific SPI slave device.
     * @param maxfreq    The maximum frequency the slave device is capable of in kHz.
     * @param callback    
     * @returns {Function} the specified callback
     */
    addSPIHandler: function(/** String*/simDevName, /** Number */spiBus, /** Number */csn, /** Number */maxfreq, /** Saguaro.SPICallback */callback) {
	assert(arguments.length===5);
	var l = {
	    mote:       this,
	    simDevName: simDevName,
	    spiBus:     spiBus,
	    csn:        csn,
	    maxfreq:    maxfreq,
	    callback:   callback
	};
	return this.spiHandlers.push(l);
    },

    /**
     * @param callback
     */
    removeSPIHandler: function(/** Saguaro.SPICallback */callback) {
	for (var i = 0; i < this.spiHandlers.length; i++) {
	    if (this.spiHandlers[i].callback === callback) {
		this.spiHandlers.splice(i, 1);
		return;
	    }
	}
    },



    /**
     * Register a handler for an I2C bus implementing the behavior of an attached slave device.
     * The simulation is halted when data is sent to the I2C slave device and the callback
     * returns the response which continue the simulation then.
     * @param simDevName The name of I2C device in the simulation or null for any device implementing an I2C bus.
     * @param i2cBus     The index of the I2C bus. Some MCUs might have multiple I2C busses.
     * @param addr       The address of the I2C device.
     *                   The least significant bit is reserved and should be zero.
     * @param maxfreq    The maximum frequency the slave device is capable of in kHz.
     * @param callback    
     * @returns {Function} the specified callback
     */
    addI2CHandler: function(/** String*/simDevName, /** Number */i2cBus, /** Number */addr, /** Number */maxfreq, /** Saguaro.I2CCallback */callback) {
	assert(arguments.length===5);
	var l = {
	    mote:       this,
	    simDevName: simDevName,
	    i2cBus:     i2cBus,
	    addr:       addr,
	    maxfreq:    maxfreq,
	    callback:   callback
	};
	return this.i2cHandlers.push(l);
    },

    /**
     * @param callback
     */
    removeI2CHandler: function(/** Saguaro.I2CCallback */callback) {
	for (var i = 0; i < this.i2cHandlers.length; i++) {
	    if (this.i2cHandlers[i].callback === callback) {
		this.i2cHandlers.splice(i, 1);
		return;
	    }
	}
    },




    /**
     * @private
     */
    onDeregister: function() {
        for (var name in this.devMap) {
            var dev = this.devMap[name];
            dev.onDeregister();
        }
    },


    /**
     * Query simulated mote and return mote settings.
     * @param callback    
     * @returns {Sonoran.MoteSettings}
     * @throws {AOP.Exception}
     */
    query: function(/** DFLT_ASYNC_CB */callback) {
	if (BC.is(callback)) { return BC.exec(arguments.callee, this, arguments); }
        var ok = new AOP.OK();
        var settings = new Sonoran.MoteSettings();
	var interval = 200;
        var mote = this.mote;
        var impl = this;

        var finish = function(result) {
            if (result.code==0) {
                result = new AOP.OK(settings);
            } else {
                //mote.updateState(Sonoran.Mote.FAILED);
                result = new AOP.ERR(sprintf("Query mote %s failed", mote), result);
            }
            callback(result);
        };
	var getAsmList = function() {
	    var d = new Util.Execute.Descr(impl.inspectRegistry, impl, true);
	    Util.Execute.retry(d, 10, 100, function(r) {
		if (r.code!=0) {
		    finish(r);
		} else {
		    finish(r);
		}
            });
	};
	// var getLED = function() {
	//     settings.reportLEDs = false;
	//     var dev = impl.getDeviceInstance(Saguaro.DEVN_LEDs);
	//     if (dev) {
	//         settings.reportLEDs = dev.getReportUpdates();
	//     }
	//     getAsmList();
	// };
	// var getRADIO = function() {
        //     var dev = Saguaro.getRadioDevice(impl);
	//     if (!dev) {
        //         getLED();
        //         return;
        //     }
        //     var descr = new Util.Execute.Descr(dev.getState, dev, true);
	//     Util.Execute.retry(descr, 10, 100, function(r) {
	// 	    if (r.code!=0) {
	// 	        finish(r);
	// 	    } else {
        //             var radio = r.getData().getState();
	// 	        assert(radio);
        //             assert(radio.logmedia!=undefined);
	// 	        settings.reportRADIO = radio.logmedia;
	// 	        getLED();
        //         }
	//     });
	// };
	var getEvConfigs = function() {
	    var ec = impl.getEvConfigs();
	    var d = new Util.Execute.Descr(ec.update, ec);
	    Util.Execute.retry(d, 10, 100, function(r) {
		if (r.code!=0) {
		    finish(r);
		} else {
		    getAsmList();
		}
	    });
	};
	var getMotePos = function() {
	    var d = new Util.Execute.Descr(impl.updatePosition, impl, undefined);
	    Util.Execute.retry(d, 10, 100, function(r) {
		if (r.code!=0) {
		    finish(r);
		} else {
		    settings.position = mote.getPosition();
		    getEvConfigs();
		}
	    });
	};
        var getLIP = function() {
            var dev = impl.getDeviceInstance(Saguaro.DEVN_LIP);
	    if (!dev) {
		getMotePos();
	    } else {
		var descr = new Util.Execute.Descr(dev.getState, dev);
		Util.Execute.retry(descr, 10, 100, function(r) {
		    if (r.code!=0) {
			finish(r);
		    } else {
			var lip = r.getData();
			assert(lip);
			assert(typeof(lip.udpport)==='number');
			assert(typeof(lip.wireless)==='number');
			settings.lipport = lip.udpport;
			settings.wireless = lip.wireless!==0;
			//mote.setWireless(settings.wireless);
			getMotePos();
		    }
		});
	    }
	};
	var getMoteInfo = function() {
	    var d = new Util.Execute.Descr(impl.moteInfo, impl);
	    Util.Execute.retry(d, 10, 100, function(r) {
	        if (r.code!=0) {
		    finish(r);
	        } else {
	            settings.name = mote.getName();
	            settings.dll = mote.getType();
	            assert(settings.dll);
	            getLIP();
	        }
            });
	};
	getMoteInfo();
    }
};
















