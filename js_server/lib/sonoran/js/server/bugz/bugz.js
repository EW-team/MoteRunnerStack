//  (C) COPYRIGHT INTERNATIONAL BUSINESS MACHINES CORPORATION 2006-2010
//                       ALL RIGHTS RESERVED
//        IBM Research Division, Zurich Research Laboratory
// --------------------------------------------------------------------




Runtime.include("bugz/bugz.js");
Runtime.include("bugz/class.js");
Runtime.include("bugz/frame.js");
Runtime.include("bugz/pc.js");

Runtime.include("./slot.js");
//Runtime.include("./object.js");
Runtime.include("./stack.js");
Runtime.include("./breakpoints.js");
Runtime.include("./breakpoint.js");
Runtime.include("./watchpoint.js");
Runtime.include("./step.js");
Runtime.include("./cache.js");
Runtime.include("./inspector.js");
Runtime.include("./commands.js");


/**
 * Caches stacks, assemblies, classes.
 * @type Bugz.Cache
 * @private
 */
Bugz.cache = null;

/**
 * Breakpoints manager
 * @type Bugz.Breakpoints
 * @private
 */
Bugz.breakpoints = null;

/**
 * Event registry listener.
 * @type Object
 * @private
 */
Bugz.eventFilter = null;

/**
 * The current halted mote or null
 * @type Sonoran.Mote
 * @private
 */
Bugz.haltedMote = null;

/**
 * The current halt event or null
 * @type Sonoran.Event
 * @private
 */
Bugz.haltedEvent = null;

/**
 * Current step action.
 * @type Bugz.Step
 * @private
 */
Bugz.stepper = null;

/**
 * Object with properties asmName and fileName.
 * @type Bugz.Settings
 * @private
 */
Bugz.settings = null;

/**
 * Debugged saguaro connection.
 * @type Saguaro.Connection
 * @private
 */
Bugz.conn = null;


/**
 * Categories of halt events which are not dumped even if not silent.
 * @type Object
 * @private
 */
Bugz.keepQuietCategories = {
    "lora": true
};


/**
 * @returns {Bugz.Settings} Bugz settings
 */
Bugz.getSettings = function() {
    return this.settings;
};


/**
 * Returns cache manager
 * @returns {Bugz.Cache}
 */
Bugz.getCache = function() {
    return this.cache;
};


/**
 * Returns breakpoints manager
 * @returns {Bugz.Breakpoints}
 */
Bugz.getBreakpoints = function() {
    return this.breakpoints;
};


/**
 * @returns {Saguaro.Connection} or null
 */
Bugz.getConnection = function() {
    return this.conn;
};

/**
 * Return halted mote.
 * @returns {Sonoran.Mote}
 */
Bugz.getHaltedMote = function() {
    return this.haltedMote;
};


/**
 * Return halted event
 * @returns {Sonoran.Event}
 */
Bugz.getHaltedEvent = function() {
    return this.haltedEvent;
};




/**
 * @param ev
 * @private
 */
Bugz.onRegistryEvent = function(/** Event */ev) {
    assert(this === Bugz);
    switch(ev.category) {
    case Sonoran.EV_CAT_SAGUARO: {
	switch(ev.evname) {
	case Sonoran.EV_NAME_DISCONNECT: {
	    assert(!this.stepper);
            this.cache.onSaguaroDisconnect(ev, ev.conn);
	    break;
	}
	}
	break;
    }
    case Sonoran.EV_CAT_MOTE: {
	switch(ev.evname) {
	case Sonoran.EV_NAME_DEREGISTER: {
	    var mote = ev.mote;
            assert(mote);
            if (mote.getClass() === 'saguaro') {
		if (this.stepper) {
		    this.stepper.onMoteDeregister(ev);
		}
		this.breakpoints.onMoteDeregister(ev);
		this.cache.onMoteDeregister(ev);
            }
	    break;
	}
	}
	break;
    }
    }
};



/**
 * Called by saguaro.
 * @param ev
 * @param eventListeners
 * @private
 */

Bugz.onSaguaroEvent = function(/** Sonoran.Event */ev, /** Saguaro.Connection.EventListeners */eventListeners, /** Boolean */haltState) {
    assert(this === Bugz);
    var _conn = eventListeners.getConnection();
    if (this.conn !== _conn) {
	this.conn = _conn;
    }

    var category = ev.category;
    var evname = ev.evname;
    //QUACK(0, "BUGZ.onSaguaroEvent: haltState: " + (haltState?"HALTED":"RUNNING"));
    
    if (category === Sonoran.EV_CAT_VM) {
	switch(evname) {
	case Saguaro.EV_ASMCTOR: {
	    //QUACK(0, "BUGZ EV_VM_ASMCTOR:..");
	    this.breakpoints.onAsmLoaded(ev.mote, Saguaro.parseEventAsmId(ev.asmid));
	    break;
	}
	case Saguaro.EV_ASMDELETED: {
	    //QUACK(0, "BUGZ EV_VM_ASMDELETED: " + ev.mote + ", " + ev.asmIdentity);
	    if (ev.asmIdentity) {
		// XXX: asmIdentity is null when broken assembly is deleted
		this.breakpoints.onAsmRemoved(ev.mote, new Sonoran.AsmName(ev.asmIdentity));
	    }
	    break;
	}
	case Sonoran.EV_NAME_WATCHPOINTOBSOLETE: {
	    this.breakpoints.onWatchpointObsolete(ev);
	    break;
	}
	}
    }

    if (haltState) {
	if (this.stepper) {
	    var ret = this.stepper.onHaltEvent(ev);
            if (ret) {
		eventListeners.setContinue(true).setAbort(true, true);
		return;  // stepper consumed event
            }
	}
    
	var mote = ev.mote;
	this.haltedEvent = ev;
	this.haltedMote = mote;
	this.cache.onHaltEvent(ev);
    
	if (!mote) {
	    // pretty much a halt on user request
	    return;
	}

	if (category===Sonoran.EV_CAT_VM) {
	    if (ev.evname === Saguaro.EV_WATCHPOINTS) { 
		// leads to watchpoint event, continue process
		this.breakpoints.onWatchpointEvent(ev);
		eventListeners.setContinue(true).setAbort(true, true);

	    } else if (ev.evname === Saguaro.EV_BREAKPOINTS) { 
		var ret = this.breakpoints.onBreakpointEvent(ev);
		if (ret) {
		    // if watchpoint was hit, continue
		    eventListeners.setContinue(true).setAbort(true, true);
		}
	    }
	}
    
	if (!this.settings.silent) {
	    if (!Bugz.keepQuietCategories[ev.category]) {
		var text = "Event:\n" + ev.toString() + "\n";
		var result = this.cache.getStack(this.haltedMote);
		text += result.getMessage();
		CLI.Shells.printImmediate(text);
	    }
	}
	
	return;
    }

    if (ev.category===Sonoran.EV_CAT_SAGUARO && ev.evname===Sonoran.EV_NAME_START) {
	this.haltedMote = null;
	this.haltedEvent = null;
	this.cache.onStartEvent(ev);
	if (this.stepper!=null&&this.stepper.mode!==Bugz.Step.RESUME) {
	    eventListeners.setAbort(true, true);
	}
	return;
    }
};





/**
 * Create stepper instance.
 * @param mode
 * @param ignoreOtherMotes
 * @param callback
 * @throws {AOP.Exception}
 * @private
 */
Bugz.createStepper = function(/** Number */mode, /** Boolean */ignoreOtherMotes, /** DFLT_ASYNC_CB */callback) {
    if (BC.is(callback)) { return BC.exec(arguments.callee, this, arguments); }
    assert(arguments.length===3);
    assert(mode===Bugz.Step.OVER||mode===Bugz.Step.OUT||mode===Bugz.Step.INTO||mode===Bugz.Step.RESUME);
    if (!this.haltedMote) { 
        callback(new AOP.ERR("No halted saguaro process"));
        return;
    }
    if (this.stepper) {
        callback(new AOP.ERR("'step-in/over/out' already in progress"));
        return;
    }
    if (mode === Bugz.Step.RESUME) {
        this.stepper = new Bugz.Resume(this.haltedMote, ignoreOtherMotes, callback);
    } else if (mode === Bugz.Step.OUT) {
        this.stepper = new Bugz.StepOut(this.haltedMote, ignoreOtherMotes, callback);
    } else {
        this.stepper = new Bugz.StepOverInto(this.haltedMote, mode, ignoreOtherMotes, callback);
    }
    this.stepper.start();
};


/**
 * Called by stepper to remove its instance when finished.
 * @param stepper
 * @private
 */
Bugz.removeStepper = function(/** Sonoran.Debugger.Step */stepper) {
    assert(stepper==this.stepper);
    this.stepper = null;
};


/**
 * Continue with saguaro execution.
 * @param mote 
 * @param callback Optional
 */
Bugz.continueOn = function(/** Sonoran.Mote */mote, /** DFLT_ASYNC_CB */callback) {
    assert(!this.stepper);
    if (callback&&BC.is(callback)) { return BC.exec(arguments.callee, this, arguments); }
    mote.getConnection().continueCmd(null, null, null, function(result) {
	if (result.code != 0) {
	    var msg = sprintf("Debugger: continue for mote '%s' failed: %s", mote, result);
	    Logger.err(msg);
	}
	if (callback) {
	    callback(result);
	}
    });
};


/**
 * Continue all halted saguaros.
 * @param callback
 */
Bugz.continueAll = function(/** DFLT_ASYNC_CB */callback) {
    if (BC.is(callback)) { return BC.exec(arguments.callee, this, arguments); }
    var conn = Saguaro.Connection.getConnection();
    if (!conn || conn.getRunState() != Saguaro.RUN_STATE_HALTED) {
        callback(new AOP.ERR("No saguaro connection in halt state"));
        return;
    }
    var descrs = conns.map(function(conn) { return new Execute.Descr(conn.continueCmd, conn, null, null, null); });
    Execute.OneByOne(descrs, function(result) {
	if (result.code==0) {
	    result = new AOP.OK();
	}
	callback(result);
    });
};





/**
 * @returns {String}
 */
Bugz.toString = function() {
    return "Bugz";
};












/**
 * @type String
 * @constant
 */
Bugz.CHANNEL_NAME = "bugz-eclipse";



/**
 * Manages the debugger channel for the eclipse debugger plugin.
 * @class
 * @static
 * @private
 */
Bugz.Eclipse = {
    /**
     * @type Function
     * @private
     */
    eventListener: null,

    /**
     * @private
     */
    init: function() {
	Channels.Registry.addFactory(new Channels.Factory(Bugz.CHANNEL_NAME, function(client) {
	    //QUACK(0, "ECLIPSE: push on connect..");
	    var chan = new Channels.Channel(Bugz.CHANNEL_NAME, client);
	    var oasisInfo = Oasis.getOnConnectState();
	    var saguaroInfo = oasisInfo.saguaroInfo;
	    oasisInfo.saguaroInfo = null;
	    chan.push(oasisInfo);
	    chan.push(saguaroInfo);
	    return chan;
	}));
	
	var _this = this;
	if (!this.eventListener) {
	    this.eventListener = Sonoran.Registry.addListener(function(ev) { 
		switch(ev.category) {
		case Sonoran.EV_CAT_SAGUARO: {
		    switch(ev.evname) {
		    case Sonoran.EV_NAME_DISCONNECT: 
			_this.conn = null;
			break;
		    case Sonoran.EV_NAME_CONNECT:
			_this.conn = ev.conn;
			break;
		    }
		    break;
		}
		case Sonoran.EV_CAT_MOTE: {
		    switch(ev.evname) {
		    case Sonoran.EV_NAME_NAME:
		    case Sonoran.EV_NAME_TYPE:
		    case Sonoran.EV_NAME_STATE:
		    case Sonoran.EV_NAME_REGISTER:
		    case Sonoran.EV_NAME_DEREGISTER:
		    case Sonoran.EV_NAME_ASSEMBLIES:
		    case Sonoran.EV_NAME_UNIQUEID:
			break;
		    default:
			return;
		    }
		    break;
		}
		case Sonoran.EV_CAT_HALT: 
		case Sonoran.EV_CAT_BUGZ: {
		    break;
		}
		case Sonoran.EV_CAT_VM: {
		    switch(ev.evname) {
		    case Sonoran.EV_NAME_ASMCTOR:
		    case Sonoran.EV_NAME_ASMDELETED:
		    case Sonoran.EV_NAME_EXTHROW:
		    case Sonoran.EV_NAME_EXCATCH:
		    case Sonoran.EV_NAME_EXUNCAUGHT:
		    case Sonoran.EV_NAME_BREAKPOINTS:
		    case Sonoran.EV_NAME_BCAFTER:
		    case Sonoran.EV_NAME_BCBEFORE:
			break;
		    default:
			//QUACK(0, "ECLIPSE: Skip generic-ev: " + ev.category + ", " + ev.evname);
			return;
		    }
		    break;
		}
		default:
		    return;
		}

		var haltState = false; 
		//var conn = Bugz.getConnection();
		if (_this.conn) {
		    var info = _this.conn.getInfo();
		    if (info.getRunState() === Saguaro.RUN_STATE_HALTED && info.getEvent() === ev) {
			//QUACK(0, "ECLIPSE: transport_msgtype: HALT");
			haltState = true;
		    } 
		}

		//QUACK(0, "ECLIPSE: push event: "  + ev);
		var obj = {
		    __constr__: "Event.Container",
		    event: ev, 
		    haltState: haltState
		};
		Channels.Registry.broadcastObject(obj, Bugz.CHANNEL_NAME);
	    });
	}
    }
};




/**
 * Initialize the debugger.
 * @private
 */
Bugz.init = function() {
    if (this.cache) {
        return;
    }
    this.conn = Saguaro.Connection.getConnection();
    
    this.settings = new Bugz.Settings();
    this.settings.setHaltConditions(Saguaro.Options.getHaltConditionsAsMap());
    this.settings.setSearchPath(Sonoran.MOMA.getSearchPaths().join(":"));

    this.breakpoints = new Bugz.Breakpoints();
    this.cache = new Bugz.Cache();

    this.eventFilter = Sonoran.Registry.addFilter(this.onRegistryEvent.bind(this)); 
};


Bugz.init();




Bugz.Eclipse.init();















