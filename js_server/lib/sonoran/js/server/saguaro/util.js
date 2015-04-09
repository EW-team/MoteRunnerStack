//  (C) COPYRIGHT INTERNATIONAL BUSINESS MACHINES CORPORATION 2006-2010
//                       ALL RIGHTS RESERVED
//        IBM Research Division, Zurich Research Laboratory
// --------------------------------------------------------------------



/**
 * Get all currently registered  simulated saguaro motes.
 * @returns {Sonoran.Mote[]}
 */
Saguaro.getSaguaroMotes = function() {
    return Sonoran.Registry.filterMotes(function(m) { return m.getClass() === 'saguaro'; });
};


/**
 * Lookup mote for connection and mote id.
 * @param conn
 * @param moteid
 * @returns {Saguaro.Mote} mote or null
 * @private
 */
Saguaro.lookupMote = function(/** Saguaro.Connection */conn, /** Number */moteid) {
    var impl = conn.sagid2moteImpl[moteid];
    assert(impl);
    return impl.mote;
};





/**
 * @param mote Mote or mote class
 * @returns {Boolean}
 */
Saguaro.isDustMote = function(/** String|Sonoran.Mote */mote) {
    var moteclass;
    if (typeof(mote) === 'string') {
	moteclass= mote;
    } else {
	assert(mote.getClass() === 'saguaro');
	moteclass = mote.getType();
    }
    return moteclass===Saguaro.DUST_TYPE; 
};



/**
 * @param mote Mote or mote class
 * @returns {Boolean}
 */
Saguaro.isLoraGwMote = function(/** String|Sonoran.Mote */mote) {
    var moteclass;
    if (typeof(mote) === 'string') {
	moteclass = mote;
    } else {
	assert(mote.getClass() === 'saguaro');
	moteclass = mote.getType();
    }
    return moteclass==="lora-gw";
};


/**
 * @param mote Mote or mote class
 * @returns {Boolean}
 */
Saguaro.isAvrravenMote = function(/** String|Sonoran.Mote */mote) {
    var moteclass;
    if (typeof(mote) === 'string') {
	moteclass= mote;
    } else {
	assert(mote.getClass() === 'saguaro');
	moteclass = mote.getType();
    }
    return moteclass===Saguaro.AVRRAVEN_TYPE;
};



/**
 * Lookup simulated motes which have specified assembly installed. Checks with the
 * internal assembly registry of a simulated mote and does not use MOMA.
 * @returns {Saguaro.Mote[]} motes
 */
Saguaro.lookupMotesByAsmFilter = function(/** Sonoran.AsmName */filter) {
    return Sonoran.Registry.lookupMotesByFunc(function(mote) {
        if (mote.getClass() !== 'saguaro') {
            return false;
        }
	var impl = Saguaro.mote2impl(mote);
        var assemblies = impl.getAssemblies();
        var entries = assemblies.getMatchingEntries(filter);
        return entries.length>0;
    });
};






/**
 * Retrieve the assembly id from a assembly id string in a saguaro event.
 * @param asmid String
 * @returns {Number} the assembly id
 * @private
 */
Saguaro.parseEventAsmId = function(asmid) {
   var md = /^.+:([0-9a-fA-F]+)$/.exec(asmid);
   assert(md, "Invalid assembly id in saguaro mote event " + asmid);
   return parseInt(md[1], 16);
};



/**
 * Parse address as handed out by Saguaro connections.
 * Throws exception in case of invalid format.
 * @param addr address string, 'sag://host:port/moteid'
 * @returns {Array} triple with host, port and mote id.
 * @private
 */
Saguaro.parseAddr = function(/** String */addr) {
   var re = /sag:(\/\/([^:]+)(:(\d+))?\/)?(\d+)/;
   var match = re.exec(addr);
   if (match == null) {
       throw "Invalid Saguaro URI: " + addr;
   }
   var hostport = match[1];
   var host = match[2];
   var port = match[4];
   var moteid = match[5];
   if (!host) { host = Saguaro.DFLT_HOST; }
   if (!port) { port = Saguaro.DFLT_PORT; }
   assert(moteid);
   port = parseInt(port);
   moteid = parseInt(moteid);
   return [ host, port, moteid ];
};




/**
 * @param panid
 * @param addr  Number for short address, String for extended address
 * @returns {Sonoran.Mote}
 */
Saguaro.findMoteByRadioConf = function(/** Number */panid, /** Number|String */addr) {
    var isSAddr = (typeof(addr)==='number');
    //QUACK(0, "findMoteByRadioConf: " + panid + ", " + addr);

    if (!isSAddr) {
	var uniqueid = Util.UUID.hex2eui64(addr);
	var mote = Sonoran.Registry.lookupMoteByUniqueid(uniqueid);
	if (!mote) {
	    return null;
	}
	var dev = Saguaro.mote2impl(mote).getDeviceInstance(Saguaro.DEVN_RADIO);
	assert(dev);
	var state = dev.getCachedState(); //.getState();
	assert(state.xaddr===uniqueid, "Mismatch: " + state.xaddr + ", " + uniqueid);
	//QUACK(0, "findMoteByRadioConf: found extended address: " + mote);
	return mote;
    }

    var motes = Saguaro.getSaguaroMotes();
    for (var i = 0; i < motes.length; i++) {
	var mote = motes[i];
	var dev = Saguaro.mote2impl(mote).getDeviceInstance(Saguaro.DEVN_RADIO);
	if (dev) {
	    var state = dev.getCachedState(); //.getState();
	    assert(state.panid!==undefined);
	    //QUACK(0, "findMoteByRadioConf: " + state.panid + ", " + state.saddr + ", " + panid + ", " + addr);
	    if (state.panid!==panid) {
		continue;
	    }
	    if (state.saddr===addr) {
		return mote;
	    }
	}
    };
    return null;
};



/**
 * Return assembly entry for name or id for a simulated mote. If multiple or none exists, an exception is thrown.
 * @param mote Saguaro mote
 * @param asmid
 * @returns {Sonoran.AsmEntry} entry or null
 */
Saguaro.getMoteAssemblyEntry = function(/** Sonoran.Mote */mote, /** Number|Sonoran.AsmName */asmid) {
    var impl = Saguaro.mote2impl(mote);
    var listing = impl.getAssemblies();
    if (typeof(asmid) === 'number') {
        return listing.getEntryById(asmid);
    }
    assert(asmid instanceof Sonoran.AsmName);
    var entries = listing.getMatchingEntries(asmid);
    if (entries.length==0) {
        return null;
    }
    if (entries.length>1) {
        throw sprintf("More than one matching assembly on %s: %s", mote, entries.join(", "));
    }
    return entries[0];
};




/**
 * 'asmobj' is not always set in the assembly info of a saguaro mote. thus, it must be explicitly 
 * retrieved if not yet present.
 * @param mote
 * @param asmid
 * @returns {String} assembly object reference or exception
 * @private
 */
Saguaro.getMoteAssemblyObject = function(/** Sonoran.Mote */mote, /** Number */asmid) {
    var impl = Saguaro.mote2impl(mote);
    var listing = impl.getAssemblies();
    var asmEntry = listing.getEntryById(asmid);
    if (!asmEntry) {
        throw sprintf("No such assembly entry on mote '%s': %d", mote, asmid);
    }
    var asmObj = asmEntry.getObj();
    if (!asmObj) {
	var impl = Saguaro.mote2impl(mote);
        var result = impl.inspectRegistry(true, SCB);
        if (result.code != 0) {
	    throw sprintf("Cannot retrieve registry of mote '%s': %s", mote, result);
        }
	listing = impl.getAssemblies();
        asmEntry = listing.getEntryById(asmid);
        if (!asmEntry) {
	    throw sprintf("No such assembly entry on mote '%s': %d", mote, asmid);
        }
	asmObj = asmEntry.getObj();
    } 
    assert(asmObj);
    return asmObj;
};












/**
 * Create saguaro mote(s).
 *  @param settings                 Mote settings
 *  @param moteCnt                  Number of motes, 1 if 'undefined'
 *  @param callback                 
 * @returns {Sonoran.Mote[]} Array of Sonoran.Mote instances
 * @see Sonoran#createMote
 * @private
 */
Saguaro.createMote = function(/** Sonoran.MoteSettings */settings, /** Number */moteCnt, /** DFLT_ASYNC_CB */callback) {
    if (BC.is(callback)) { return BC.exec(arguments.callee, this, arguments); }

    var timer = null;
    moteCnt = moteCnt||1;
    assert(moteCnt>0);
    var conn = null;
    var name = settings.name;
    if (name.length<1) {
        callback(new AOP.ERR("Invalid empty mote name: " + name));
        return;
    }
    assert(settings.dll);
    var dlls = Sonoran.Resource.getMoteDlls();
    if (dlls.indexOf(settings.dll) < 0) {
        callback(new AOP.ERR("Invalid DLL: " + settings.dll));
        return;
    }
    var extra = {};
    if (settings.initDefs != null) {
	extra = settings.initDefs;
    }
    extra[Saguaro.DEVN_LIP] = {
	udpport: settings.udpport,
        wireless: settings.wireless ? 1 : 0
    };
    if( settings.xdevs != null ) {
        extra.xdevs = settings.xdevs;
    }
    if( typeof(settings.drift) === "number" ) {
   	extra.drift = settings.drift|0;
    }
    if( typeof(settings.cloneId) === "number" ) {
   	extra.cloneId = settings.cloneId;
    }
    // TBD: fix by thomas???
    // if (settings.reportRADIO === 1 || settings.reportRADIO === 2) {
    //     extra.RADIO = { logmedia: settings.reportRADIO };
    // } else if (Saguaro.Options.radio.logmedia>0) {
    //     extra.RADIO = { logmedia: Saguaro.Options.radio.logmedia };
    // }
    //var logmedia = (settings.reportRADIO === 1 || settings.reportRADIO === 2) ? settings.reportRADIO : ((Saguaro.Options.radio.logmedia>0) ? Saguaro.Options.radio.logmedia : -1);

    extra.position = { x: 0, y:0, z:0 };
    if (settings.position) {
        if (settings.position.x !== undefined) { extra.position.x = settings.position.x; }
        if (settings.position.y !== undefined) { extra.position.y = settings.position.y; }
        if (settings.position.z !== undefined) { extra.position.z = settings.position.z; }
    }
   
    if (settings.eui64) {
	if (!Util.UUID.EUI64_REGEX.test(settings.eui64)) {
	    callback(new AOP.ERR("Invalid EUI-64: " + settings.eui64));
	    return;
	}
	if (Sonoran.Registry.lookupMoteByUniqueid(settings.eui64)) {
	    callback(new AOP.ERR("Mote with specified EUI64 already registered: " + settings.eui64));
	    return;
	}
    }

    var logf = function(msg) {
	QUACK(0, msg);
	Logger.err(msg);
    };

    var createFunc = function() {
	var result = conn.loadDll(settings.dll, SCB);
	if (result.code !== 0) {
	    return result;
	}
	var dll = result.getData().getReplyData();

	result = conn.createMotes(settings.dll, moteCnt, extra, settings.eui64, SCB);
	if (result.code !== 0) {
	    return result;
	}

	var data = result.getData().getReplyData();
	assert((data instanceof Array) && data.length==moteCnt && (data[0] instanceof Array));
	var moteids = data.map(function(entry) { return entry[0]; });
	var uniqueids = data.map(function(entry) { return entry[1]; });
	var motes = [];

	for (var i = 0; i < uniqueids.length; i++) {
	    var moteid = moteids[i];
	    var uniqueid = uniqueids[i];
	    
	    var mote = conn.instantiateMote(moteid, uniqueid, settings.name, "unknown", extra.position);
	    motes.push(mote);
	    var impl = Saguaro.mote2impl(mote);

	    if (settings.name !== 'noname') {
                var md = /(\d+)$/.exec(name);
                if (md) {
		    var nr = parseInt(md[1]) + 1;
		    settings.name = settings.name.replace(/(\d+)$/, nr.toString());
                }
	    }

	    var result = impl.moteInfo(SCB);

	    var isDustMote = Saguaro.isDustMote(mote);
	    var isAvrRaven = Saguaro.isAvrravenMote(mote);
	    //var radioDevInst = Saguaro.getRadioDevice(impl);
	    var radioDevInst = impl.getDeviceInstance(Saguaro.DEVN_RADIO);
	    
	    var args = Saguaro.Options.getHaltConditionsAsSaguaroArgs();
	    if (radioDevInst) {
		args.push(Saguaro.EV_RADIOHW_ADDR+"+L");
		args.push(Saguaro.EV_RADIOHW_TXFRAME+"+L");
		args.push(Saguaro.EV_RADIOHW_RXFRAME+"+L");
	    }
	    if (settings.reportLEDs) {
		var dev = impl.getDeviceInstance(Saguaro.DEVN_LEDs);
		if( dev != null ) {
		    args.push(Saguaro.EV_LED_OFF+"+L");
		    args.push(Saguaro.EV_LED_ON+"+L");
		}
	    }
	    result = impl.getEvConfigs().programFlags(args, SCB);
	    if (result.code !== 0) {
		logf("Create mote error: could not get event configs: " + result);
	    }

	    if (radioDevInst) {
		if (settings.packetErrorRate>0) {
		    radioDevInst.setState({packetErrorRate:settings.packetErrorRate}, SCB);
		    if (result.code !== 0) {
			logf("Create mote error: could not set packet error rate: " + result);
		    }
		}
		var result = radioDevInst.getState(SCB);
		if (result.code !== 0) {
		    logf("Create mote error: could not get radio state: " + result);
		}
	    }
	    
	    var result = impl.getEvConfigs().update(SCB);
	    if (result.code !== 0) {
		logf("Create mote error: could not get event configs: " + result);
	    }

	    mote.onRegister();
	}

	return new AOP.OK(motes);
    };

    Saguaro.getProcess(settings.sagport, function(result) {
        if (result.code != 0) {
            callback(result);
        } else {
	    conn = result.getData();
	    result = conn.dispatcher.invokeHalted(createFunc); 
	    callback(result);
        }
    });
    return;
};



/**
 * Handler for SPI bus implementing behavior of attached slave devices.
 * The simulation is halted when this callback is invoked and will be continued
 * when this call returns.
 * @param mote       The mote hosting the SPI device
 * @param evObj      Full event object. Only needed to access exotic auxilliary information.
 * @param simDevName The name of SPI device in the simulation.
 * @param spiBus     The index of the SPI bus. Some MCUs might have multiple SPI controllers.
 * @param csn        The chip select pin activating a specific SPI slave device.
 * @param freq       The frequency of the SPI bus in kHz.
 * @param time       The (simulation) time when the data request was sent over the SPI bus (microseconds).
 * @param data       The data being sent over the SPI bus.
 * @returns {String} A response string or null if the slave device is not answering.
 *   The response string must have the same length as the data string.
 */
 Saguaro.SPICallback = function (/**Mote*/mote, /**Object*/ evObj, /**String*/simDevName, /**Number*/spiBus, /**Number*/csn, /**Number*/freq, /***/time, /**String*/data) {};

/**
 * Register a handler for an SPI bus implementing the behavior of an attached slave device.
 * The simulation is halted when data is sent to the SPI slave device and the callback
 * returns the response which continue the simulation then.
 * @param mote       The mote hosting the SPI device or null if all motes are addressed.
 * @param simDevName The name of SPI device in the simulation or null for any device implementing an SPI bus.
 * @param spiBus     The index of the SPI bus. Some MCUs might have multiple SPI controllers.
 * @param csn        The chip select pin activating a specific SPI slave device.
 * @param freq       The maximum frequency the slave device is capabale of in kHz.
 */
Saguaro.addSPIHandler = function(/**Mote*/mote, /**String*/simDevName, /**Number*/spiBus, /**Number*/csn, /**Number*/maxfreq, /**Saguaro.SPICallback*/callback) {
    var motes = mote ? [ mote ] : Saguaro.getSaguaroMotes();
    motes.forEach(function(mote) {
	var impl = Saguaro.mote2impl(mote);
	impl.addSPIHandler(simDevName, spiBus, csn, maxfreq, callback);
    });
};


/**
 * Remove a previously registered SPI callback.
 * @param mote       The mote hosting the SPI device or null if all motes are addressed.
 * @param callback
 */
Saguaro.removeSPIHandler = function(/**Mote*/mote, /**Saguaro.SPICallback*/callback) {
    var motes = mote ? [ mote ] : Saguaro.getSaguaroMotes();
    motes.forEach(function(mote) {
	var impl = Saguaro.mote2impl(mote);
	impl.removeSPIHandler(callback);
    });
};


/**
 * Handler for I2C bus implementing behavior of attached slave devices.
 * The simulation is halted when this callback is invoked and will be continued
 * when this call returns.
 * @param mote       The mote hosting the I2C device
 * @param evObj      Full event object. Only needed to access exotic auxilliary information.
 * @param simDevName The name of I2C device in the simulation.
 * @param i2cBus     The index of the I2C bus. Some MCUs might have multiple I2C controllers.
 * @param addr       The address of the I2C device. The least significant bit is reserved and is zero.
 * @param freq       The frequency of the I2C bus in kHz.
 * @param time       The (simulation) time when the data request was sent over the I2C bus (microseconds).
 * @param data       The data being sent over the I2C bus.
 * @param rlen       The amount of data expected back from the I2C device.
 * @returns {String} A response string or null if the slave device is not answering.
 *   The response string must have the same length as the data string.
 */
Saguaro.I2CCallback = function (/**Mote*/mote, /**Object*/ evObj, /**String*/simDevName, /**Number*/i2cBus, /**Number*/addr, /**Number*/freq, /***/time, /**String*/data, /**Number*/rlen) {};

/**
 * Register a handler for an I2C bus implementing the behavior of an attached slave device.
 * The simulation is halted when data is sent to the I2C slave device and the callback
 * returns the response which continue the simulation then.
 * @param mote       The mote hosting the I2C device or null if all motes are addressed.
 * @param simDevName The name of I2C device in the simulation or null for any device implementing an I2C bus.
 * @param i2cBus     The index of the I2C bus. Some MCUs might have multiple I2C controllers.
 * @param addr       The address of the I2C device. The least significant bit is reserved and should be zero.
 * @param freq       The maximum frequency the slave device is capabale of in kHz.
 */
Saguaro.addI2CHandler = function(/**Mote*/mote, /**String*/simDevName, /**Number*/i2cBus, /**Number*/addr, /**Number*/maxfreq, /**Saguaro.I2CCallback*/callback) {
    var motes = mote ? [ mote ] : Saguaro.getSaguaroMotes();
    motes.forEach(function(mote) {
	var impl = Saguaro.mote2impl(mote);
	impl.addI2CHandler(simDevName, i2cBus, addr, maxfreq, callback);
    });
};


/**
 * Remove a previously registered I2C callback.
 * @param mote       The mote hosting the I2C device or null if all motes are addressed.
 * @param callback
 */
Saguaro.removeI2CHandler = function(/**Mote*/mote, /**Saguaro.I2CCallback*/callback) {
    var motes = mote ? [ mote ] : Saguaro.getSaguaroMotes();
    motes.forEach(function(mote) {
	var impl = Saguaro.mote2impl(mote);
	impl.removeI2CHandler(callback);
    });
};


