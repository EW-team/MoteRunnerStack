//  (C) COPYRIGHT INTERNATIONAL BUSINESS MACHINES CORPORATION 2006-2010
//                       ALL RIGHTS RESERVED
//        IBM Research Division, Zurich Research Laboratory
// --------------------------------------------------------------------


//---------------------------------------------------------------------------------------------------------------
//
// Sonoran.Mote 
//
//---------------------------------------------------------------------------------------------------------------


/**
 * @type Number
 * @constant
 * @private
 */
Sonoran.Mote.UID_NEXT = 0;




/**
 * Add address if it does not already exist. Fires update event in this case.
 * @param addr String
 * @returns {Boolean} flag indicating addition of address
 */
Sonoran.Mote.prototype.addAddress = function(addr) {
    var addresses = this.addresses;
    var idx = addresses.indexOf(addr);
    if (idx < 0) {
	addresses.push(addr);
        Sonoran.Registry.signalEvent(Sonoran.createAddressesEvent(this, this.addresses));
	return true;
    } else {
	return false;
    }
};

/**
 * Replaces first address in address array and fires event if modified.
 * @param addr String
 * @returns {Boolean} flag indicating update
 */
Sonoran.Mote.prototype.updateAddress = function(addr) {
    var addresses = this.addresses;
    if (addresses[0] != addr) {
	addresses[0] = addr;
        Sonoran.Registry.signalEvent(Sonoran.createAddressesEvent(this, this.addresses));
	return true;
    } else {
	return false;
    }
};





/**
 * Remove all addresses of given address family. Fires event in case of address being removed.
 * @param prefix Prefix
 */
Sonoran.Mote.prototype.removeAddressFamily = function(/** String */prefix) {
    var addresses = this.addresses;
    var re = new RegExp("$"+prefix);
    var i = 0, update = false;
    while(i < addresses.length) {
	if (re.test(addresses[i])) {
	    addresses.splice(i, 1);
            update = true;
	} else {
	    i += 1;
	}
    }
    if (Sonoran.Registry.lookupMoteByUniqueid(this.uniqueid)) {
        Sonoran.Registry.signalEvent(Sonoran.createAddressesEvent(this, this.addresses));
    }
};


/**
 * Returns the mote manager instance to execute a MOMA protocol.
 * @returns {Sonoran.MOMA.Instance} the MOMA instance
 */
Sonoran.Mote.prototype.getMOMA = function() {
    if (this.noMR) {
	throw sprintf("%s: No Mote Runner available", this.uniqueid); 
    }
    return new Sonoran.MOMA.Instance(this);
};




/**
 * Returns the connection.
 * @returns {Sonoran.Connection}
 */
Sonoran.Mote.prototype.getConnection = function() {
    return this.conn;
};


/**
 * TBD!!!
 * @param {Sonoran.Connection} conn
 * @private
 */
Sonoran.Mote.prototype.pushConnection = function(/** Sonoran.Connection */conn) {
    if (!this.attributes["connections"]) { this.attributes["connections"] = []; }
    this.attributes["connections"].push(this.conn);
    this.conn = conn;
    assert(conn instanceof Sonoran.Connection);
};



/**
 * TBD!!!
 * @param {Sonoran.Connection} conn
 * @private
 */
Sonoran.Mote.prototype.popConnection = function(/** Sonoran.Connection */conn) {
    println("popConnection: prev " + this.conn);
    assert(this.conn instanceof Sonoran.Connection);
    assert(this.attributes["connections"]);
    assert(this.attributes["connections"].length>=1);
    this.conn = this.attributes["connections"].shift();
    println("popConnection: now " + this.conn);
};



/**
 * Update mote name (and and optionally type). Fires a Sonoran.Event.Mote.Info and returns true if
 * the mote state has changed.
 * @param name
 * @param type Optional
 * @returns {Boolean} true if name or type was changed
 */
Sonoran.Mote.prototype.updateName = function(/** String */name, /** String */type) {
    assert(name, "undefined mote name");
    var ev1, ev2;
    if (name != this.name) {
        this.name = name;
        ev1 = Sonoran.createInfoEvent(this, Sonoran.EV_NAME_NAME);
    }
    if (type && this.type != type) {
        this.type = type;
        ev2 = Sonoran.createInfoEvent(this, Sonoran.EV_NAME_TYPE);
    }
    if (!ev1 && !ev2) {
        return false;
    }
    if (ev1) {  Sonoran.Registry.signalEvent(ev1); }
    if (ev2) {  Sonoran.Registry.signalEvent(ev2); }
    return true;
};


/**
 * Update the type of mote. Fires a Sonoran.Event.Mote.Info and returns true if the mote state has changed.
 * @param type
 * @returns {Boolean} true when type was changed
 */
Sonoran.Mote.prototype.updateType = function(/** String */type) {
    if (this.type != type) {
        this.type = type;
        Sonoran.Registry.signalEvent(Sonoran.createInfoEvent(this, Sonoran.Event.Mote.TYPE));
        return true;
    }
    return false;
};


/**
 * Update mote state. Fires Sonoran.Event.Mote.State and return true if mote has been modified.
 * @returns {Boolean} if state was changed
 */
Sonoran.Mote.prototype.updateState = function(/** String */state) {
    assert(state===Sonoran.Mote.ON||state===Sonoran.Mote.OFF||state===Sonoran.Mote.RESET||state===Sonoran.Mote.PENDING);
    if (this.state === state) {
        return false;
    }
    this.state = state;
    Sonoran.Registry.signalEvent(Sonoran.createStateEvent(this, state));
    return true;
};


/**
 * Update the uniqueid of mote. Fire Sonoran.Event.MoteUniqueid and returns true if unique id has changed.
 * @returns {Boolean} true if uniqueid was changed
 */
Sonoran.Mote.prototype.updateUniqueid = function(/** String */uniqueid) {
    var current = this.uniqueid;
    if (current == uniqueid) {
        return false;
    }
    this.uniqueid = uniqueid;
    Sonoran.Registry.signalEvent(new Sonoran.Event.MoteUniqueid(uniqueid, current));
    return true;
};


/** 
 * Signal mote to be in specified break state. Fires Sonoran.Event.Mote.State and return true if mote has been modified.
 * @param flag
 */ 
Sonoran.Mote.prototype.updateBreakState = function(/** Boolean */flag) {
    if (((this.subState&Sonoran.Mote.BREAK) !== 0) === flag) {
	return false;
    }
    if (flag) {
	this.subState |= Sonoran.Mote.BREAK;
    } else {
	this.subState &= ~Sonoran.Mote.BREAK;
    }
    Sonoran.Registry.signalEvent(Sonoran.createStateEvent(this, this.state, this.subState));
    return true;
};


/** 
 * Signal mote to be in specified break state. Fires Sonoran.Event.Mote.State and return true if mote has been modified.
 * @param bit Such as Sonoran.Mote.BREAK
 */ 
Sonoran.Mote.prototype.updateSubState = function(/** Number */bit, /** Boolean */flag) {
    if (((this.subState&bit) !== 0) === flag) {
	return false;
    }
    if (flag) {
	this.subState |= bit;
    } else {
	this.subState &= ~bit;
    }
    Sonoran.Registry.signalEvent(Sonoran.createStateEvent(this, this.state, this.subState));
    return true;
};


/**
 * Called by Sonoran.Registry if mote has been registered. Installs a listener at the registry and fires
 * a Sonoran.Event.MoteRegister and various Sonoran.Event.Mote events.
 * In case of saguaro motes, the connection calls this method.
 * @private
 */
Sonoran.Mote.prototype.onRegister = function() {
    Sonoran.Registry.signalEvent(new Sonoran.Event.MoteRegister(this));

    // Now send update events for the basic mote properties
    Sonoran.Registry.signalEvent(Sonoran.createInfoEvent(this, Sonoran.EV_NAME_NAME));
    Sonoran.Registry.signalEvent(Sonoran.createInfoEvent(this, Sonoran.EV_NAME_TYPE));
    Sonoran.Registry.signalEvent(Sonoran.createAddressesEvent(this, this.addresses));
    Sonoran.Registry.signalEvent(Sonoran.createAssembliesEvent(this, this.assemblies, Sonoran.ASSEMBLIES_REFRESH));
    Sonoran.Registry.signalEvent(Sonoran.createPositionEvent(this, this.position.x, this.position.y, this.position.z));
};


/**
 * Mote has been deregistered from Registry. Mote state is set to Sonoran.Mote.DEAD and a
 * Sonoran.Event.MoteDeregister is fired.
 * @private
 */
Sonoran.Mote.prototype.onDeregister = function() {
    this.updateState(Sonoran.Mote.OFF);
    Sonoran.Registry.signalEvent(Sonoran.createDeregisterEvent(this));
    this.conn.onDeregister(this);
};


/**
 * Update position attribute. If modified, a Sonoran.Event.Mote.Position is fired. This function is called
 * by the mote implementation when the position has been updated.
 * @param position   Object with at least one of the properties x, y, z
 * @returns {Boolean} true if position has changed
 * @private
 */
Sonoran.Mote.prototype.setPosition = function(/** Object */position) {
    assert(position.x!=undefined||position.y!=undefined||position.z!=undefined);
    assert(this.position);
    var update = Util.Blob.update(this.position, position, {});
    if (update) {
	Sonoran.Registry.signalEvent(Sonoran.createPositionEvent(this, position.x, position.y, position.z));
    }
    return update;
};



/**
 * Wait for timeout or mote state to reach specified state. The callback
 * receives an AOP.OK instance if the mote has reached the given state.
 * Otherwise an ERR_TIMEOUT in case of timeout or an ERR_GENERIC 
 * in case of mote removal is signaled.
 * @param targetState Mote state such as Sonoran.Mote.ON
 * @param timeout     Time to wait, optional, by default 5000
 * @param callback
 * @throws {AOP.Exception}
 */
Sonoran.Mote.prototype.waitForState = function(/** String */targetState, /** Number */timeout, /** DFLT_ASYNC_CB */callback) {
    if (BC.is(callback)) { return BC.exec(arguments.callee, this, arguments); }
    timeout = timeout||5000;
    var timer = null;
    var listener = null;
    var _this = this;
    if (this.getState() == targetState) {
        callback(new AOP.OK(_this));
        return;
    }
    /** @ignore */
    var listenerf = function(ev) {
        if (ev.category===Sonoran.EV_CAT_MOTE && ev.mote===_this) {
	    if (ev.evname === Sonoran.EV_NAME_DEREGISTER) {
                closef(new AOP.ERR(sprintf("Mote did not switch to state '%s': Mote %s was deregistered.", targetState, _this)));
	    } else if (_this.getState() == targetState) {
                closef(new AOP.OK(_this));
	    }
        }
    };
    /** @ignore */
    var closef = function(result) {
        if (timer) {
	    Timer.remove(timer);
	    timer = null;
        }
        if (listener) {
            Sonoran.Registry.removeListener(listener);
            listener = null;
            callback(result);
        }
    };
    /** @ignore */
    var timeoutf = function() {
        timer = null;
        //QUACK(0, sprintf("waitForMote: %s state=%s\n", _this.getUniqueid(), _this.getState()));
        closef(_this.getState() == targetState
	       ? new AOP.OK(_this)
	       : Timeout2ERR(sprintf("Mote did not switch to state '%s': Timeout", targetState)));
    };
    
    listener = Sonoran.Registry.addListener(listenerf);
    timer = Timer.timeoutIn(timeout, timeoutf);
};


/**
 * Convenience function. Send LIP message and wait for response or timeout.
 * @param dstport    Destination port
 * @param payload    Payload
 * @param timeout    Optional, timeout in millis to use, default is 3000
 * @param srcport    Source port to use or 0
 * @param callback   
 * @returns {Sonoran.Event.Media}
 * @throws {AOP.Exception}
 */
Sonoran.Mote.prototype.exchange = function(/** Number */dstport, /** String */payload, /** Number */timeout, /** Number */srcport, /** DFLT_ASYNC_CB */callback) {
    if (BC.is(callback)) { return BC.exec(arguments.callee, this, arguments); }
    timeout = timeout?timeout:3000;
    assert(typeof(timeout) == 'number');
    var _this = this;
    var timer = null;
    var sock = new Sonoran.Socket();
    /** @ignore */
    sock.onClose = function(result) {
	callback(result);
    };
    /** @ignore */
    sock.onData = function(blob) {
	if (timer != null) {
	    timer.cancel();
	    timer = null;
	}
	sock.close(new AOP.OK(blob));
    };
    sock.open(srcport, function(result) {
	if (result.code!=0) {
	    callback(result);
	} else {
	    timer = new Timer.Timer(timeout, _this, function(res) { sock.close(res); });
	    sock.send(payload, _this, dstport, timer);
	}
    });
};




/**
 * Ask mote implementation to update the position and invoke specified callback.
 * @param position   Object with at least one of the properties x, y, z
 * @param callback   
 * @throws {AOP.Exception}
 */
Sonoran.Mote.prototype.updatePosition = function(/** Object */position, /** DFLT_ASYNC_CB */callback) {
    if (BC.is(callback)) { return BC.exec(arguments.callee, this, arguments); }
    this.conn.updatePosition(position, callback);
};


/**
 * Send a packet to this mote. 
 * @param dstport   Destination port
 * @param srcport   Source port
 * @param payload   Binary string
 * @param timer     Optional
 * @throws {Exception} 
 * @private
 */
Sonoran.Mote.prototype.send = function(/** Number */dstport, /** Number */srcport, /** String */payload, /** Timer.Timer|Timer.Timer[] */timer){
    var _this = this;
    if (this.state!== Sonoran.Mote.ON) {
	var f = function(ev) {
	    return ev.msgtype==='mote-ev' && ev.event===Sonoran.Event.Mote.STATE && ev.mote===_this && ev.state===Sonoran.Mote.ON; 
	};
	var res = Event.wait4(f, new Timer.Timer(100, this), SCB);
	if (res.code!==0) {
	    throw "Mote.send failed: mote is not in ON-state";
	}
    }
    this.conn.send(this, dstport, srcport, payload, timer);
};



/**
 * Sleep for 'micros' microseconds on this mote. If a simulated mote, waits according to the virtual
 * time in the simulation.
 * @param micros
 */
Sonoran.Mote.prototype.sleepOn = function(/** Number */micros, /** DFLT_ASYNC_CB */callback) {
    if (BC.is(callback)) { return BC.exec(arguments.callee, this, arguments); }
    return this.conn.sleepOn(micros, callback);
};



/**
 * Switch mote on after a short delay.
 * @param delay Milliseconds, if unspecified, 100ms
 * @private
 */
Sonoran.Mote.prototype.switchOnWithDelay = function(/** Number */delay) {
    if (!delay) { delay = 100; }
    var _this = this;
    var state = this.getState();
    this.conn.sleepOn(this, delay*1000, function() {
	if (_this.getState() === state) {
	    state = Sonoran.Mote.ON;
	    _this.setState(state);
	    Sonoran.Registry.signalEvent(Sonoran.createStateEvent(_this, state));
	}
    });
}









// //---------------------------------------------------------------------------------------------------------------
// //
// // Sonoran.estimateCurrentTime
// //
// //---------------------------------------------------------------------------------------------------------------


/**
 * Estimate current time for a mote. In case of a simulated mote, the last timestamp received on the
 * connection is returned. In case of a physical mote, a time based on the system clock is returned.
 * @param mote     Mote or unique id
 * @returns {Number} in micros
 */
Sonoran.Mote.estimateCurrentTime = function(/** String|Sonoran.Mote */mote) {
    if (typeof(mote) === 'string') {
        mote = Sonoran.Registry.lookupMoteByUniqueid(mote);
        if (!mote) {
            return Clock.get() * 1000;
        }
    }
    if (mote.getClass() == 'saguaro') {
        return Saguaro.mote2impl(mote).getConnection().getLastTimestampAsMicros();
    } else {
        return Clock.get() * 1000;
    }
};



















// //---------------------------------------------------------------------------------------------------------------
// //
// // Sonoran.MoteImpl
// //
// //---------------------------------------------------------------------------------------------------------------
// /**
//  * Sonoran.MoteImpl represents the base class and interface for classes implementing motes.
//  * @class
//  * @constructor
//  * @param mote
//  */
// Sonoran.MoteImpl =  function(/** Sonoran.Mote */mote) {
//     assert(mote);
//     this.mote = mote;
// };

// /** @private */
// Sonoran.MoteImpl.prototype = {
//     /**
//      * Mote this object is implementing.
//      * @type Sonoran.Mote
//      * @private
//      */
//     mote: null,

//     /**
//      * @returns {String} string representation.
//      */
//     toString: function() {
//         assert(0);
//     },


//     /**
//      * @returns {Sonoran.Mote} the mote.
//      */
//     getMote: function() {
//         return this.mote;
//     },
    
//     /**
//      * @returns {String} uniqueid of mote.
//      */
//     getUniqueid: function() {
//         return this.mote.uniqueid;
//     },

//     /**
//      * Initiates update of position and signals operation end by invoking the specified callback.
//      * @param position   Object with properties x, y, z
//      * @param callback   
//      * @throws {AOP.Exception}
//      */
//     updatePosition: function(/** Object */position, /** DFLT_ASYNC_CB */callback) {
// 	if (BC.is(callback)) { return BC.exec(arguments.callee, this, arguments); }
//         this.mote.setPosition(position);
//         callback(new AOP.OK());
//     },

//     /**
//      * Send a lip packet to a mote. 
//      * @param dstport
//      * @param srcport
//      * @param payload
//      @ @param optional, timer to start
//     */
//     send: function(/** Number */dstport, /** Number */srcport, /** String */payload, /** Timer.Timer */timer) {
//         throw "'send' operation not supported for mote class " + this.mote.clazz;
//     },
    
//     /**
//      * Reset this mote. Throws an exception if that mote implementation cannot reset
//      * its mote.
//      * @param timeout                  Number of milliseonds to wait for mote to be alive again
//      * @param mode                     Optional, might be 'cold', 'warm', 'bod' or 'err' or null (default: cold)
//      * @param callback                 
//      * @throws {AOP.Exception}
//      */
//     reset: function(/** Number */timeout, /** String */mode, /** DFLT_ASYNC_CB */callback) {
//         throw "'reset' operation not supported for mote class " + this.mote.clazz;
//     },

//     /**
//      * Refresh mote state. Concrete action depends on specific mote class.
//      */
//     query: function(/** DFLT_ASYNC_CB */callback) {
//         throw "'query' operation not supported for mote class " + this.mote.clazz;
//         assert(0);
//     },


//     /**
//      * @private
//      */
//     onDeregister: function() {}
// };







//---------------------------------------------------------------------------------------------------------------
//
// Sonoran.HW.Mote
//
//---------------------------------------------------------------------------------------------------------------

// /**
//  * Sonoran.HW implements Sonoran.HW.MoteImpl handling a physical, wireless Mote Runner mote.
//  * @namespace  Sonoran.HW
//  */
// Sonoran.HW = {};

// /**
//  * Sonoran.HW.MoteImpl implements physical, wirless mote reachable by a gateway mote.
//  * @class
//  * @augments Sonoran.MoteImpl
//  * @constructor This constructor registers the new mote with the Sonoran.Registry.
//  * @param uniqueid  Mote uniqueid
//  * @param addr      Mote address
//  * @param gateway   Optional
//  */
// Sonoran.HW.MoteImpl = function(/** String */uniqueid, /** String */addr, /** Sonoran.Gateway */gateway) {
//     var mote = new Sonoran.Mote(uniqueid, addr, 'hardware', this, null, null);
//     Sonoran.MoteImpl.call(this, mote);
//     assert(this.mote == mote);
//     if (gateway) {
//         mote.setGateway(gateway);
//     }
//     var name = "HW-Mote " + Sonoran.HW.MoteImpl.ID;
//     Sonoran.HW.MoteImpl.ID += 1;
//     mote.setName(name, "phys");
//     mote.setState(Sonoran.Mote.OFF);
//     Sonoran.Registry.registerMote(mote);
// };

// /**  @private */
// Sonoran.HW.MoteImpl.ID = 0;

// /** Prototype. */
// Sonoran.HW.MoteImpl.prototype = extend(
//     Sonoran.MoteImpl.prototype,
//     /** @lends Sonoran.HW.MoteImpl.prototype */
//     {
//         /**
//          * @returns {String} string representation.
//          */
//         toString: function() {
//             return this.mote.name;
//         },

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





//---------------------------------------------------------------------------------------------------------------
//
// Sonoran.createMote
//
//---------------------------------------------------------------------------------------------------------------



/**
 * Create a mote and register it with Sonoran.Registry.
 *  @param settings                 Mote settings
 *  @param moteCnt                  If value 'undefined', one mote is generated
 *  @param callback                 Invoked when finished or on error
 * @returns {Sonoran.Motes[]}  Array with created mote instances
 * @throws {AOP.Exception}
 */
Sonoran.createMote = function(/** Sonoran.MoteSettings */settings, /** Number */moteCnt, /** DFLT_ASYNC_CB */callback) {
    return Sonoran.createMote2(settings, moteCnt, 1000, callback);
};


/**
 * Create a mote and register it with Sonoran.Registry.
 *  @param settings                 Mote settings
 *  @param moteCnt                  If value 'undefined', one mote is generated
 *  @param waitMillis               Time to wait for motes to get into ON state (default: 500ms);
 *  @param callback                 Invoked when finished or on error
 * @returns {Sonoran.Motes[]}  Array with created mote instances
 * @throws {AOP.Exception}
 */
Sonoran.createMote2 = function(/** Sonoran.MoteSettings */settings, /** Number */moteCnt, /** Number */waitMillis, /** DFLT_ASYNC_CB */callback) {
    if (BC.is(callback)) { return BC.exec(arguments.callee, this, arguments); }

    var waitForMotesOn = function(result) {
	if (result.code !== 0) {
	    callback(result);
	    return;
	}
	var motes = result.getData();
	var startt = Clock.get();
	var ontimeoutf = function(err) {
	    var _motes = motes.filter(function(mote) { return mote.getState() === Sonoran.Mote.ON; });
	    if (_motes.length===motes.length) {
		callback(new AOP.OK(motes));
		return;
	    }
	    if (Clock.get() >= startt + waitMillis) {
		callback(new AOP.OK(motes));
		return;
	    }
	    (new Timer.Timer(10, undefined, ontimeoutf)).start();
	};
	ontimeoutf();
    };


    if (!settings) { settings = new Sonoran.MoteSettings(); }
    if (!waitMillis) { waitMillis = 500; }
    moteCnt = moteCnt||1;
    assert(moteCnt>0, "Invalid mote count!");
    var clazz = settings.clazz;
    var dll = settings.dll;
    var hwport = settings.hwport;

    if (clazz=='udp') {
        try {
            assert(settings.udpport, "No udpport specified in mote settings!");
            var mote = Sonoran.UDP.Connection.createMote(settings.hostname||'localhost',settings.udpport);
	    waitForMotesOn(new AOP.OK([ mote ]));
        } catch(ex) {
            callback(Ex2ERR(ERR_GENERIC, ex));
        }
    } else if (clazz=='lip') {
        assert(hwport, "No hwport specified in mote settings!");
        assert(moteCnt==1, "Only one physical mote for a given hwport can be instantiated!");
	Sonoran.LIP.createMote(hwport, settings.name, waitForMotesOn);
    } else if (clazz==='saguaro') {
	assert(!hwport, "Saguaro motes dont feature a hwport anymore!");
	try {
            Saguaro.createMote(settings, moteCnt, waitForMotesOn);
	} catch (x) {
            callback(Ex2ERR(ERR_GENERIC, x));
	}
    } else {
	throw "Unsupported mote class: " + clazz;
    }
};




//---------------------------------------------------------------------------------------------------------------
//
// 
// 
// Sonoran.MoteSettings 
//
// 
// 
//---------------------------------------------------------------------------------------------------------------
/**
 * Sonoran.MoteSettings settings for a mote created in Sonoran.createMote.
 * @class  
 * @constructor
 * @param props Optional, object with properties and value to set in this settings object
 * @see Sonoran#createMote
 */
Sonoran.MoteSettings = function(props) {
    this.clazz = 'saguaro';
    this.saghost = Saguaro.DFLT_HOST;
    this.sagport = Saguaro.DFLT_PORT;
    this.name = "noname";
    //this.dll = 'iris';
    this.dll = 'blipper';
    this.xdevs = null;    // external sensor DLLs
    this.initDefs = null; // none
    this.drift = 0;       // clock drift in ppm
    this.hwport = null;
    this.udpport = 0;
    this.wireless = false;
    //this.reportRADIO = 0;
    this.reportLEDs = true;
    this.position = null;
    this.eui64 = null;
    this.packetErrorRate = 0;
    this.cloneId = null;
    if (props) {
	for (var k in props) { this[k] = props[k]; }
    }
};

/* @private */
Sonoran.MoteSettings.prototype = {
    /** @ignore */
    __constr__: "Sonoran.MoteSettings",
    /**
     * Mote class, 'lip, 'saguaro', by default 'saguaro'
     * @type String
     */
    clazz: null,
    /**
     * Hostname for saguaro process. Default is Saguaro.DFLT_HOST.
     * @type String
     */
    saghost: null,
    /**
     * Hostport for saguaro process. Default is Saguaro.DFLT_PORT.
     * @type Number
     */
    sagport: null,
    /**
     * Name for mote, 'noname' leads to name picked by mote implementor.
     * @type String
     */
    name: "noname",
    /**
     * Type of simulated mote, the mote dll name, by default 'iris'.
     * @type String
     */
    dll: 'stm32',
    /**
     * List of external sensor devices implemented in one or more DLLs.
     * This is an array of objects of the form: { dll:STRING, config:STRING } where
     * dll specifies the path and filename of the DLL and config is either absent
     * or if non-null specifies a DLL specific configuration string.
     * @type Array
     */
    xdevs: null,
    /**
     * Passed thru to Saguaro mote-create command as is.
     * @type Object
     */
    initDefs: null,
    /**
     * Drift of mote clock in parts per million. This signed number
     * specifies how much a motes clock deviates from the simulated time.
     * A value of 20 makes a mote's clock go faster by a fraction of 20*10<sup>-6</sup>
     * and a value of -20 makes it go slower.
     * @type Number
     */
    drift: 0,
    /**
     * LIP device name for lip motes. If set, mote is connected via serial or usb interface and
     * a mote class 'lip' is assumed.
     * @type String
     */
    hwport: null,
    /**
     * If specified (if non zero and wireless is false) a UDP port for the simulated mote.
     * @type Number
     */
    udpport: 0,
    /**
     * Flag to create a wireless simulated mote. Otherwise, mote is simulated as being attached by LIP.
     * @type Boolean
     */
    wireless: false,
    /**
     * Report radio updates of a simulated mote?
     * Possible values are 0, 1 or 2 (no updates, sent or sent/received).
     * @type Number
     */
    //reportRADIO: 0,
    /**
     * Report LED updates for a simulated mote? By default, true.
     * @type Boolean
     */
    reportLEDs: true,
    /**
     * Position, an object of { x: Number, y: Number, z:Number }, by default null.
     * @type Object
     */
    position: null,
    /**
     * EUI-64 for a simulated mote. A full eui64 string, with '-' as separator.
     * @type String
     */
    eui64: null,
    /**
     *  Packet error rate for received radio PDUs.
     * Error rate in ppm (part per million). Legal value range 0-999999.
     * Zero means no packet errors.
     * @type Number
     */
    packetErrorRate: 0,
    /**
     *  Clone loaded assemblies and other persistent state from this mote
     *  when creating a new mote. Both mote must be of the same architecture
     *  and must have been built against the same system assembly.
     * @type Number
     */
    cloneId: null,
    /**
     * @returns {String} string
     */
    toString: function() {
        return Util.formatData(this);
    }
};






// //---------------------------------------------------------------------------------------------------------------
// //
// // Sonoran.getMoteInfoAsTable
// //
// //---------------------------------------------------------------------------------------------------------------



/**
 * @param mote
 * @returns {Util.Formatter.Table} Table
 * @private
 */
Sonoran.getMoteInfoAsTable = function(/** Sonoran.Mote */mote) {
    var t = new Util.Formatter.Table2(2);
    t.setTitle("Mote", mote.getUniqueid());
    t.setValue(0, 0, "State"); t.setValue(1, 0, mote.getState());
    t.setValue(0, 1, "Name"); t.setValue(1, 1, mote.getName());
    t.setValue(0, 2, "Class"); t.setValue(1, 2, mote.getClass());
    t.setValue(0, 3, "Type"); t.setValue(1, 3, mote.getType());
    t.setValue(0, 4, "Addresses"); t.setValue(1, 4, mote.getAddresses().join(", "));
    var pos = mote.position;	
    t.setValue(0, 5, "Position"); t.setValue(1, 5, sprintf("x:%d y:%d z:%d", pos.x, pos.y, pos.z));
    
    var entries = mote.getAssemblies().getEntries();
    t.setValue(0, 6, "Assemblies"); t.setValue(1, 6, entries.length==0 ? "---" : entries.length);
    var y = 7;
    
    for (var i = 0; i < entries.length; i++) {
        var entry = entries[i];
	t.setValue(0, y, "  " + entry.getId()); t.setValue(1, y, entry.identity);
	y += 1;
    }
    
    t.setValue(0, y, "Wireless"); t.setValue(1, y, mote.wirelessFlag);
    y += 1;
    
    var s = "----";
    if (mote.getConnection()) {
	s = mote.getConnection().toString();
    }
    t.setValue(0, y, "Connection"); t.setValue(1, y, s);
    y += 1;

    if (mote.getClass() === 'lip') {
	t.setValue(0, y, "HW-Port"); t.setValue(1, y, mote.getConnection().getHWPORT());
	y += 1;
    }

    if (mote.getClass() === 'saguaro') {
	var impl = Saguaro.mote2impl(mote);
	var entries = impl.getAssemblies().getEntries();
        t.setValue(0, y, "Registry"); t.setValue(1, y, entries.length==0 ? "---" : entries.length);
	y += 1;
        for (var i = 0; i < entries.length; i++) {
	    var entry = entries[i];
	    t.setValue(0, y, "  " + entry.getId()); t.setValue(1, y, entry.identity);
	    y += 1;
        }
        t.setValue(0, y, "MOMA-port"); t.setValue(1, y, impl.getUDPPort());
	y += 1;
    }

    if (mote.getClass() === 'udp') {
	var impl = mote.getConnection();
	var ports = [];
        for (var port in impl.getSocks()) {
            ports.push(port);
        }
	t.setValue(0, y, "UDP-ports"); t.setValue(1, y, port.join(", "));
	y += 1;
    }

    return t;
};



// //---------------------------------------------------------------------------------------------------------------
// //
// // RMI Mote functions
// //
// //---------------------------------------------------------------------------------------------------------------

// RMI.exportItem("Sonoran.createMote", true);
// RMI.exportItem("Sonoran.Mote.updatePosition", true, false);
// RMI.exportItem("Sonoran.Mote.updateName", false, false);









//---------------------------------------------------------------------------------------------------------------
//
// Mote Commands
//
//---------------------------------------------------------------------------------------------------------------

/**
 * Mote commands.
 * @class
 * @private
 */
Sonoran.CLI.Commands.Mote = {};


/**
 *  @class 
 * @constructor
 * @private
 */
Sonoran.CLI.Commands.Mote.ResetCommand = function(shell, name) {
    this.description = "Reset a simulated mote. By default, cold reset is peformed.";
    this.spanOpt = new GetOpt.TimeoutOpt("10s");
    this.modeSpec = new GetOpt.Keywords("mode", "Reset mote ('cold', 'warm', 'bod' or 'err'). By default, 'cold'.", [ "cold", "warm", "bad", "err" ]);
    this.modeOpt = new GetOpt.Option("m", "--mode", 0, null, null, this.modeSpec);
    var optSet = new GetOpt.OptionSet([ this.modeOpt, this.spanOpt ]);
    var cmdSpec = new Sonoran.CLI.Spec(name, Sonoran.CLI.DST_MANY_MOTES, [ 'saguaro', 'lip', 'DN' ]);
    CLI.Command.call(this, shell, cmdSpec, [ optSet, new GetOpt.EndOfArgs() ]);
};

/** @private */
Sonoran.CLI.Commands.Mote.ResetCommand.prototype = extend(
    CLI.Command.prototype,
    {
        /** @private */
        exec: function(callback) {
	    var mode = null;
	    if (this.modeOpt.isSet()) {
	        mode = this.modeSpec.getArg();
	    }
	    var motes = this.cmdSpec.getMotes();
	    var descrs = [];
	    for (var i = 0; i < motes.length; i++) {
	        var mote = motes[i];
                var conn = mote.getConnection();
                descrs.push(new Execute.Descr(conn.reset, conn, mote, this.spanOpt.getSpan(), mode));
	    }
	    var f = function(result) {
	        var text = [];
		var results = result.getData();
	        for (var i = 0; i < results.length; i++) {
	            if (results[i].code!=0) {
		        text.push(sprintf("%s: %s", motes[i], results[i].toString()));
	            } else {
		        text.push(sprintf("%s: reset applied", motes[i]));
	            }
	        }
	        callback(new AOP.OK(text.join("\n")));
	    };
	    Execute.OneByOne(descrs, f);
        }
    }
);



/**
 *  @class 
 * @constructor
 * @private
 */
Sonoran.CLI.Commands.Mote.InfoCommand = function(shell, name) {
    this.description =
        "Print information about selected set of motes. Without parameter, prints set of basic information.\n" +
        "Option '-d' prints device information for simulated motes.\n" +
        "Option '-m' prints memory space information for simulated motes.\n" +
        "Option '-r' prints resource information for simulated motes (stack, heap).";
    this.devOpt = new GetOpt.Option("d", "--devices", 0, null, "Print device info for saguaro motes");
    this.memOpt = new GetOpt.Option("m", "--memory", 0, null, "Print memory info for saguaro motes");
    this.resOpt = new GetOpt.Option("r", "--resources", 0, null, "Print resource information for saguaro motes");
    var optSet = new GetOpt.OptionSet([ this.devOpt, this.memOpt, this.resOpt ]);
    var cmdSpec = new Sonoran.CLI.Spec(name, Sonoran.CLI.DST_MANY_MOTES);
    CLI.Command.call(this, shell, cmdSpec, [ optSet, new GetOpt.EndOfArgs() ]);
};

/** @private */
Sonoran.CLI.Commands.Mote.InfoCommand.prototype = extend(
    CLI.Command.prototype,
    {
        /** @private */
        exec: function(callback) {
	    var motes = this.cmdSpec.getMotes();
	    var printDev = this.devOpt.isSet();
	    var printMem = this.memOpt.isSet();
	    var printRes = this.resOpt.isSet();
            if (this.memOpt.isSet()) {
                var txt = "";
	        for (var i = 0; i < motes.length; i++) {
                    var mote = motes[i];
                    if (txt.length!=0) { txt += "\n\n"; }
                    if (mote.getClass() !== 'saguaro') {
                        txt += "Mote " + mote.getUniqueid() + ":\n  No information available for non-simulated mote";
                        continue;
                    }
                    var impl = Saguaro.mote2impl(mote);
                    txt += "Mote " + mote.getUniqueid() + ":\n  ";
                    var t = new Util.Formatter.Table2(2);
                    var memNames = impl.getMemSpaceNames();
                    for (var j = 0; j < memNames.length; j++) {
                        t.setValue(0, j, memNames[j]);
	                var info = impl.getMemSpace(memNames[j]);
                        t.setValue(1, j, JSON.stringify(info, undefined, 4));
	            }
                    txt += t.render().join("\n  ");
                }
                callback(new AOP.OK(txt));
                return;
            }
            if (this.devOpt.isSet()) {
                var txt = "";
	        for (var i = 0; i < motes.length; i++) {
                    var mote = motes[i];
                    if (txt.length!=0) { txt += "\n\n"; }
                    if (mote.getClass() !== 'saguaro') {
                        txt += "Mote " + mote.getUniqueid() + ":\n  No information available for non-simulated mote";
                        continue;
                    }
                    var impl = Saguaro.mote2impl(mote);
                    txt += "Mote " + mote.getUniqueid() + ":\n  ";
                    var t = new Util.Formatter.Table2(2);
                    var devNames = impl.getDeviceNames();
                    for (var j = 0; j < devNames.length; j++) {
                        t.setValue(0, j, devNames[j]);
                        var info = impl.getDeviceInstance(devNames[j]).getInfo();
                        t.setValue(1, j, JSON.stringify(info, undefined, 4));
	            }
                    txt += t.render().join("\n  ");
                }
                callback(new AOP.OK(txt));
                return;
            }
            if (this.resOpt.isSet()) {
                var t = new Util.Formatter.Table2(3);
                t.setTitle("Mote", "Resource", "Value");
                var y = 0;
	        for (var i = 0; i < motes.length; i++) {
                    var mote = motes[i];
                    t.setValue(0, y, mote.getUniqueid());
                    if (mote.getClass() !== 'saguaro') {
                        t.setValue(1, y, "Not simulated");
                        y += 1;
                        continue;
                    }
                    var impl = Saguaro.mote2impl(mote);
                    var result = impl.inspectResources(SCB);
                    if (result.code != 0) {
                        t.setValue(1, y, result.toString());
                        y += 1;
                    } else {
			var data = result.getData().getReplyData();
                        for (var n in data) {
                            t.setValue(1, y, capitalize(n));
                            t.setValue(2, y, data[n].toString());
                            y += 1;
                        }
                    }
                }
	        callback(new AOP.OK(t.render().join("\n")));
                return;
            }
            
	    var txt = "";
	    for (var i = 0; i < motes.length; i++) {
	        if (i>0) { txt += "\n"; }
                var mote = motes[i];
		var t = Sonoran.getMoteInfoAsTable(mote);
                txt += t.render().join("\n");
            }
	    callback(new AOP.OK(txt));
        }
    }
);






/**
 *  @class 
 * @constructor
 * @private
 */
Sonoran.CLI.Commands.Mote.CreateCommand = function(shell, name) {
    this.description = "Register a mote. If a hwport (such as COM1) is given, a mote representing a physical mote is created.\n"+
        "Otherwise, a simulated mote is created. The options allow to create it in wireless mode, to be accessible on\n"+
        "an UDP port, to specify its name and/or unique id in eui64 format.\n"+
        "Examples:\n"+
        "mote-create -p COM1\n"+
        "mote-create -n MyMote -p 40000\n"+
        "mote-create -w\n"+
        "mote-create -d iris\n";
    this.hostSpec = new GetOpt.HostPortSpec(Saguaro.DFLT_PORT, Saguaro.DFLT_HOST);
    this.hostOpt =  new GetOpt.Option("h", "--host", 0, null, "host:port, by default localhost:44044", this.hostSpec);
    this.dllSpec = new GetOpt.Keywords(null,
				       "Name of mote simulation dll ('iris', 'test'). A simulation of the\n"+
				       "specified mote is created. Physical motes attached to this host\n"+
				       "require the `lip' and the -p option to select the hardware port.\n"+
				       "If absent this option defaults to `iris'.",
                                       Sonoran.Resource.getMoteDlls());
    this.dllOpt = new GetOpt.Option("d", "--dll", 0, null, null, this.dllSpec);

    this.hwportSpec = new GetOpt.Simple('hwport',
				        "Connect to a mote attached to this host via the specified port.\n"+
				        "For RS232 or serial over USB specify the serial port name\n"+
				        "(depending on OS it is a name like this: /dev/ttyS1 or COM10).\n"+
				        "For HID devices specify the mote unique id as shown by the\n"+
				        "command `lip-enum'. Could be a comma separated list of ports.\n"+
				        "This requires the option -d to be absent or set to `lip'.\n"+
				        "If 'HID' is given and 'lip-enum' returns one HID device, that is connected.\n"+
				        "if 'SERIAL' is given and 'lip-enum' returns one serial device, that is connected.\n"
				       );
    this.hwportOpt = new GetOpt.Option('p', '--port', 0, null, null, this.hwportSpec);

    this.ipSpec = new GetOpt.HostPortSpec(9999, "192.168.1.102");
    //this.ipSpec = new GetOpt.Simple('ip',
//				        "Create a mote which communicates via UDP to a remote entity.\n" +
//				        "Use '--udp' to specify the remote UDP port.");
    this.ipOpt = new GetOpt.Option('i', '--ipv4', 0, null, null, this.ipSpec);

    this.nameSpec  = new GetOpt.Simple('name',"Mote name");
    this.nameOpt   = new GetOpt.Option('n', '--name', 0, null, null, this.nameSpec);

    this.euiSpec  = new GetOpt.Simple('eui',"Unique id for mote in EUI-64 format.");
    this.euiOpt   = new GetOpt.Option('u', '--uniqueid', 0, null, null, this.euiSpec);

    this.driftSpec = new GetOpt.Number("num", "Positive/negative clock drift in ppm (parts per million).", null, GetOpt.Number.NEGATIVES|GetOpt.Number.ANY_BASE);
    this.driftOpt  = new GetOpt.Option(null, '--drift', 0, null, null, this.driftSpec);

    this.xSpec = new GetOpt.Number("X", "X coordinate.", null, GetOpt.Number.NEGATIVES|GetOpt.Number.ANY_BASE);
    this.xOpt = new GetOpt.Option("x", "--xpos", 0, null, null, this.xSpec);
    this.ySpec = new GetOpt.Number("Y", "Y coordinate.", null, GetOpt.Number.NEGATIVES|GetOpt.Number.ANY_BASE);
    this.yOpt = new GetOpt.Option("y", "--ypos", 0, null, null, this.ySpec);
    this.zSpec = new GetOpt.Number("Z", "Z coordinate.", null, GetOpt.Number.NEGATIVES|GetOpt.Number.ANY_BASE);
    this.zOpt = new GetOpt.Option("z", "--zpos", 0, null, null, this.zSpec);
    this.posSpec = new GetOpt.Simple("x,y[,z]", "X, Y, and Z coordinates.");
    this.posOpt = new GetOpt.Option(null, "--pos", 0, null, null, this.posSpec);

    this.udpPort  = new GetOpt.Number('port');
    this.udpOpt  = new GetOpt.Option(null, '--udp', 0, null,
				     "Create a UDP port for this mote simulating a or connected by a cable connection.", this.udpPort);
    this.wlessOpt  = new GetOpt.Option('w', '--wireless', 0, null,
				       "Create a simulated mote which is wireless. By default, simulated motes\n"+
				       "are attached to a host via a virtual cable (RS232/USB). A wireless mote\n"+
				       "behaves slightly different than a wired mote.", null);

    this.perSpec = new GetOpt.Number("per", "Packet error rate (0-999999).", null, 10);
    this.perSpec.setRange(0, 0, 999999);
    this.perOpt = new GetOpt.Option("e", "--packet-error-rate", 0, null, null, this.perSpec);

    this.inixSpec = new GetOpt.Simple('field:value,..',
				      "Extra parameters passed to simulated mote (must be JSON syntax).");
    this.inixOpt = new GetOpt.Option(null, '--ini-extra', 0, null, null, this.inixSpec);

    this.xdevsSpec = new GetOpt.Simple('xdevdll[,..]',
				       "A list of DLL implementing extra custom devices.");
    this.xdevsOpt = new GetOpt.Option(null, '--xdevs', 0, null, null, this.xdevsSpec);

    this.cstSpec = new GetOpt.Number("moteid", "Mote from which to clone FLASH and persistent state.", null);
    this.cstSpec.setRange(0, 0, 0x7FFF);
    this.cstOpt = new GetOpt.Option(null, "--clone", 0, null, null, this.cstSpec);
    var waitonDflt = "5s";  // slowest is USB - might take some time to attach/register USB device
    this.waitonOpt = new GetOpt.TimeoutOpt(waitonDflt,
					   GetOpt.TimeoutOpt.NONE, "--wait-for-on",
					   null,
					   "Wait at most this amount of time for motes to\n"+
					   "transit to state 'ON'. Defaults to "+waitonDflt+".");

    var optSet = new GetOpt.OptionSet([ this.hostOpt, this.dllOpt, this.hwportOpt, this.ipOpt, this.wlessOpt, 
					this.perOpt, this.inixOpt, this.xdevsOpt, this.udpOpt, this.nameOpt,
					this.euiOpt, this.driftOpt, this.xOpt, this.yOpt, this.zOpt, this.posOpt,
					this.cstOpt, this.waitonOpt ]);
    this.moteCnt = new GetOpt.Number("count", "Number of motes to create, by default 1.", null, null);
        this.moteCnt.setRange(1,1,0x7fff);
    var cmdSpec = new Sonoran.CLI.Spec(name, Sonoran.CLI.DST_ZERO_OR_ONE_CONN);
    CLI.Command.call(this, shell, cmdSpec, [ optSet, this.moteCnt ], 1);
};

/** @private */
Sonoran.CLI.Commands.Mote.CreateCommand.prototype = extend(
    CLI.Command.prototype,
    {
        /** @private */
        exec: function(callback) {
            var _this = this;
            var convert = function(result) {
                if (result.code === 0) {
		    var motes = result.getData();
		    var uniqueids = motes.map(function(mote) { return mote.getUniqueid(); });
		    result.setData(uniqueids);
		}
		callback(result);
            };
	    if (this.ipOpt.isSet()) {
		var host = this.ipSpec.getHost();
 		var port = this.ipSpec.getPort();
		var settings = new Sonoran.MoteSettings();
                settings.clazz = 'udp';
                settings.hostname = host;
                settings.udpport = port;
		if (this.udpOpt.isSet()) {
		    settings.udpport = this.udpPort.getNumber();
		}
		Sonoran.createMote2(settings, 1, this.waitonOpt.getSpan(), convert);

	    } else if (this.hwportOpt.isSet()) {
                // Hardware mote
                var port = this.hwportSpec.getArg();
                var ports = port.split(",");
                var i = 0;
                var motes = [];
                for (i = 0; i < ports.length ; i++){
                    var settings = new Sonoran.MoteSettings();
                    settings.clazz = 'lip';
                    settings.hwport = ports[i];
                    //QUACK(0, "HWPORT: " + settings.hwport);
                    if( this.nameOpt.isSet() ) {
                        settings.name = this.nameSpec.getArg();
                    }
                    var arr = Sonoran.createMote2(settings, 1, this.waitonOpt.getSpan(), BLCK);
                    // if (ret.code != 0) {
                    //     callback(new AOP.ERR("LIP mote creation for '" + ports[i] + "' failed", ret));
                    //     return;
                    // }
                    var mote = arr[0];
		    assert(mote);
                    motes.push(mote); 
                    Thread.sleep(200); 
                }
                convert(new AOP.OK(motes));

            } else {
                // Simulated motes
                var moteCnt = this.moteCnt.getNumber();
                var settings = new Sonoran.MoteSettings();
                var host = null, port = null;
                if (this.hostOpt.isSet()) {
                    host = this.hostSpec.host;
                    port = this.hostSpec.port;
                } else if (this.cmdSpec.getConnection()) {
		    var connection = this.cmdSpec.getConnection();
		    host = connection.host;
		    port = connection.port;
                }
                if (!host) {
                    host = Saguaro.DFLT_HOST;
                    port = Saguaro.DFLT_PORT;
                }
                settings.saghost = host;
                settings.sagport = port;
                settings.clazz = 'saguaro';
                settings.dll = this.dllOpt.isSet() ? this.dllSpec.getSelectedKeyword() : 'imst';
                if( this.wlessOpt.isSet() ) {
                    settings.wireless = true;
                }
                if (settings.wireless && settings.hwport) {
                    callback(new AOP.ERR("Options "+this.hwportOpt.getOptName()+" and "+this.wlessOpt.getOptName()+" are contradicting"));
                    return;
                }
                if( this.udpOpt.isSet() ) {
                    settings.udpport = this.udpPort.getNumber();
                }
                if( this.nameOpt.isSet() ) {
                    settings.name = this.nameSpec.getArg();
                }
                if( this.driftOpt.isSet() ) {
                    settings.drfit = this.driftSpec.getNumber();
                }
                if (this.euiOpt.isSet()) {
                    try {
                        settings.eui64 = Util.UUID.completeEUI(this.euiSpec.getArg());
                    } catch (x) {
                        callback(new AOP.ERR(x.toString()));
                        return;
                    }
                }
                var position = null;
		if( this.posOpt.isSet() ) {
		    var a = this.posSpec.getArg().split(',');
		    position = { x:0, y:0, z:0 };
		    try { position.x = Math.round(new Number(a[0])); } catch (ex) {}
		    try { position.y = Math.round(new Number(a[1])); } catch (ex) {}
		    try { position.z = Math.round(new Number(a[2])); } catch (ex) {}
		}
                if (this.xOpt.isSet()) {
                    position = position || {};
                    position.x = this.xSpec.getNumber();
                }
                if (this.yOpt.isSet()) {
                    position = position || {};
                    position.y = this.ySpec.getNumber();
                }
                if (this.zOpt.isSet()) {
                    position = position || {};
                    position.z = this.zSpec.getNumber();
                }
		settings.position = position;
                if (this.perOpt.isSet()) {
                    settings.packetErrorRate = this.perSpec.getNumber();
                }
                if (this.inixOpt.isSet()) {
		    var obj = null;
		    try {
			eval("obj={"+this.inixSpec.getArg()+"}");
		    } catch (x) {
                        callback(new AOP.ERR(x.toString()));
                        return;
		    }
		    settings.initDefs = obj;
		}
                if (this.xdevsOpt.isSet()) {
		    var a = this.xdevsSpec.getArg().split(/,/);
		    for( var i=0; i<a.length; i++ )
			a[i] = { dll:a[i] };
                    settings.xdevs = a;
                }
                if (this.cstOpt.isSet()) {
		    settings.cloneId = this.cstSpec.getNumber();
		}
                Sonoran.createMote2(settings, moteCnt, this.waitonOpt.getSpan(), convert);
            }
        }
    }
);









/**
 * @class 
 * @constructor
 * @private
 */
Sonoran.CLI.Commands.Mote.PositionCommand = function(shell, name) {
    this.description = "Get/set the position of a mote.";
    this.xSpec = new GetOpt.Number("X", "X coordinate.", null, GetOpt.Number.NEGATIVES|GetOpt.Number.ANY_BASE);
    this.xOpt = new GetOpt.Option("x", "--xpos", 0, null, null, this.xSpec);
    this.ySpec = new GetOpt.Number("Y", "Y coordinate.", null, GetOpt.Number.NEGATIVES|GetOpt.Number.ANY_BASE);
    this.yOpt = new GetOpt.Option("y", "--ypos", 0, null, null, this.ySpec);
    this.zSpec = new GetOpt.Number("Z", "Z coordinate.", null, GetOpt.Number.NEGATIVES|GetOpt.Number.ANY_BASE);
    this.zOpt = new GetOpt.Option("z", "--zpos", 0, null, null, this.zSpec);
    this.posSpec = new GetOpt.Simple("x,y[,z]", "X, Y, and Z coordinates.");
    this.posOpt = new GetOpt.Option(null, "--pos", 0, null, null, this.posSpec);
    var optSet = new GetOpt.OptionSet([ this.xOpt, this.yOpt, this.zOpt, this.posOpt ]);
    var cmdSpec = new Sonoran.CLI.Spec(name, Sonoran.CLI.DST_MANY_MOTES);
    CLI.Command.call(this, shell, cmdSpec, [ optSet, new GetOpt.EndOfArgs() ]);
};

/** @private */
Sonoran.CLI.Commands.Mote.PositionCommand.prototype = extend(
    CLI.Command.prototype,
    {
        /** @private */
        exec: function(callback) {
	    var motes = this.cmdSpec.getMotes();
            var deliverf = function() {
                var t = new Formatter.Table2(4);
		t.setTitle("Mote", "X", "Y", "Z");
	        for (var i = 0; i < motes.length; i++) {
	            var pos = motes[i].getPosition();
	            t.addRow(motes[i].getUniqueid(), pos.x, pos.y, pos.z);
	        }
	        callback(new AOP.OK(t.render().join("\n")));
            };
	    if (!this.posOpt.isSet()&&!this.xOpt.isSet()&&!this.yOpt.isSet()&&!this.zOpt.isSet()) {
                deliverf();
                return;
            }
            var position = {x:0,y:0,z:0};
	    if( this.posOpt.isSet() ) {
		var a = this.posSpec.getArg().split(',');
		try { position.x = Math.round(new Number(a[0])); } catch (ex) {}
		try { position.y = Math.round(new Number(a[1])); } catch (ex) {}
		try { position.z = Math.round(new Number(a[2])); } catch (ex) {}
	    }
	    if (this.xOpt.isSet()) { position.x = this.xSpec.getNumber(); }
	    if (this.yOpt.isSet()) { position.y = this.ySpec.getNumber(); }
	    if (this.zOpt.isSet()) { position.z = this.zSpec.getNumber(); }
	    var descrs = [];
	    for (var i = 0; i < motes.length; i++) {
	        var mote = motes[i];
	        descrs.push(new Execute.Descr(mote.updatePosition, mote, position));
	    }
	    var _this = this;
	    Execute.OneByOne(descrs, function(r) {
	        if (r.code!=0) {
                    callback(r);
                } else {
                    deliverf();
                }
	    });
        }
    }
);


/**
 * @class 
 * @constructor
 * @private
 */
Sonoran.CLI.Commands.Mote.DestroyCommand = function(shell, name) {
    this.description =
        "Remove selected set of motes from the registry. Only hardware motes registered\n"+
        "by a gateway or connected by wire can be removed. Restart a saguaro process to\n"+
        "remove simulated motes.";
    var cmdSpec = new Sonoran.CLI.Spec(name, Sonoran.CLI.DST_MANY_MOTES, [ 'udp', 'lip', 'hardware' ]);
    CLI.Command.call(this, shell, cmdSpec);
};

/** @private */
Sonoran.CLI.Commands.Mote.DestroyCommand.prototype = extend(
    CLI.Command.prototype,
    {
        /** @private */
        exec: function(callback) {
	    var motes = this.cmdSpec.getMotes();
	    for (var i = 0; i < motes.length; i++) {
	        Sonoran.Registry.deregisterMote(motes[i]);
	    }
	    callback(new AOP.OK(motes));
        }
    }
);



/**
 * @class 
 * @constructor
 * @private
 */
Sonoran.CLI.Commands.Mote.NameCommand = function(shell, name) {
    this.description = "Get/Set mote name.";
    this.nameSpec = new GetOpt.Simple("name", "Mote name");
    var cmdSpec = new Sonoran.CLI.Spec(name, Sonoran.CLI.DST_MANY_MOTES, [ 'udp', 'lip', 'hardware' ]);
    CLI.Command.call(this,  shell, cmdSpec, [ this.nameSpec, new GetOpt.EndOfArgs() ]);
};

/** @private */
Sonoran.CLI.Commands.Mote.NameCommand.prototype = extend(
    CLI.Command.prototype,
    {
        /** @private */
        exec: function(callback) {
	    var mote = this.cmdSpec.getMote();
            var n = this.nameSpec.getArg();
            if (n && n.length>0) {
                mote.updateName(n);
            } 
            callback(new AOP.OK(mote.getName()));
        }
    }
);




/**
 * @class 
 * @constructor
 * @private
 */
Sonoran.CLI.Commands.Mote.RegistryCommand = function(shell, name) {
    this.description =
        "List mote registry of simulated motes. Other mote types are ignored.";
    var cmdSpec = new Sonoran.CLI.Spec(name, Sonoran.CLI.DST_MANY_MOTES);
    CLI.Command.call(this, shell, cmdSpec);
};

/** @private */
Sonoran.CLI.Commands.Mote.RegistryCommand.prototype = extend(
    CLI.Command.prototype,
    {
        /** @private */
        exec: function(callback) {
            var motes = this.cmdSpec.getMotes();
	    var listings = [];
	    for (var i = 0; i < motes.length; i++) {
                if (motes[i].getClass() !== 'saguaro') {
                    continue;
                }
                var assemblies = Saguaro.mote2impl(motes[i]).getAssemblies();
                var ev = Sonoran.createAssembliesEvent(motes[i], assemblies, Sonoran.ASSEMBLIES_REFRESH);
                Sonoran.Registry.signalEvent(ev);
                listings.push(assemblies);
            }
            callback(new AOP.OK(listings));
        }
    }
);



/**
 * @class 
 * @constructor
 * @private
 */
Sonoran.CLI.Commands.Mote.SendCommand = function(shell, name) {
    this.description =
        "Send data to a mote.\n" +  
	"Specify target-port source-port hex-data.\n" + 
	"Check event log for any answers by the mote.";
    var cmdSpec = new Sonoran.CLI.Spec(name, Sonoran.CLI.DST_MANY_MOTES);
    //this.bcOpt = new GetOpt.Option("b", "--broadcast", 0, null, null);
    var optSet = new GetOpt.OptionSet([ ]); //this.bcOpt ]);
    this.dstportSpec = new GetOpt.Number("dstport", "Destination port");
    this.srcportSpec = new GetOpt.Number("srcport", "Source port");
    this.dataSpec = new GetOpt.Simple("data", "Data to send");
    this.restOfArgs = new GetOpt.RestOfArgs("...", "Additonal parameters for data string.");
    CLI.Command.call(this, shell,  cmdSpec, [ optSet, this.dstportSpec, this.srcportSpec, this.dataSpec, this.restOfArgs ]);
};

/** @private */
Sonoran.CLI.Commands.Mote.SendCommand.prototype = extend(
    CLI.Command.prototype,
    {
        /** @private */
        exec: function(callback) {
            var motes = this.cmdSpec.getMotes();
	    var dstport = this.dstportSpec.getNumber();
	    var srcport = this.srcportSpec.getNumber();
	    var bytes;
	    try {
	        bytes = Formatter.transcode(this.dataSpec.getArg(), this.restOfArgs.getRestArgs());
            } catch(ex) {
	        callback(Ex2ERR(ERR_GENERIC, ex, "Invalid data format"));
	        return;
            }
	    //if (!this.bcOpt.isSet()) {
	    motes.forEach(function(mote) { mote.send(dstport, srcport, bytes, null); });
	    callback(new AOP.OK());
	    // return;
	    // }

	    // var uuids = [];
	    // motes.forEach(function(mote) {
	    // 	if (!Sonoran.Gateway.isGatewayMote(mote)) {
	    // 	    uuids.push(mote.getUniqueid());
	    // 	}
	    // });
	    // if (uuids.length>0) {
	    // 	callback(new AOP.ERR("No valid gateway mote(s): " + uuids.join(", ")));
	    // 	return;
	    // }
	    // motes.forEach(function(mote) { mote.getGatewayP().broadcast(dstport, srcport, bytes); });
            // callback(new AOP.OK());
        }
    }
);




/**
 * @class 
 * @constructor
 * @private
 */
Sonoran.CLI.Commands.Mote.ConfigCommand = function(shell, name) {
    this.description =
        "Configure event reporting/logging/halting.\n";
    var cmdSpec = new Sonoran.CLI.Spec(name, Sonoran.CLI.DST_MANY_MOTES, [ 'saguaro' ]);
    var optSet = new GetOpt.OptionSet([]);
    var mnemo = "[category{:evname,..}{[+-=][RLH]}..]";
    var descr = 
	"category{:evname,..}{[+-=][RLH]}..\n" +
	"Change flag settings of a category or events in a category.\n" +
	"If no event names are listed then apply to all events\n" +
	"in the specified category. If no operators present then\n" +
	"list the settings of the category and the optional events.\n" +
	"The meaning of the operators and flags are:\n" +
	"    +     set flags\n"+
	"    -     clear flags\n"+
	"    =     set exactly the listed flags\n"+
	"    0     clear all flags (only with operator '=')\n"+
	"    1     set all flags (only with operator '=')\n"+
	"    R     record the event\n"+
	"    L     log the event to connected links\n"+
	"    H     halt the system on this event\n"+
	"Examples:\n"+
	"  vm+R-H            enable R and clear H on all events in category 'vm'\n"+
	"  vm:frameStart+RH  enable R and H on specific event in category 'vm'\n"+
	"  vm                list settings of all events in category 'vm'\n"+
	"  vm:vmStart,vmExit list settings of specfic events in category 'vm'\n" +
	"Configure/query event flags. Without any \n"+
	"argument query the current settings.";
    this.restOfArgs = new GetOpt.RestOfArgs(mnemo, descr);
    CLI.Command.call(this, shell,  cmdSpec, [ optSet, this.restOfArgs ]);
};

/** @private */
Sonoran.CLI.Commands.Mote.ConfigCommand.prototype = extend(
    CLI.Command.prototype,
    {
        /** @private */
        exec: function(callback) {
            var motes = this.cmdSpec.getMotes();
	    var f = function() {
		callback(new AOP.OK(motes.map(function(mote) { return Saguaro.mote2impl(mote).getEvConfigs(); })));
	    };

	    var roa = this.restOfArgs.getRestArgs();
	    if (roa.length===0) {
		f();
		return;
	    } 

	    var descrs = [];
	    for (var i = 0; i < motes.length; i++) {
		var ec = Saguaro.mote2impl(motes[i]).getEvConfigs();
                descrs.push(new Execute.Descr(ec.programFlags, ec, roa));
	    }

	    Execute.OneByOne(descrs, function(result) {
				 if (result.code !== 0) {
				     callback(result);
				 } else {
				     f();
				 }
			     });
        }
    }
);






CLI.commandFactory.addModule("Sonoran.CLI.Commands.Mote");
