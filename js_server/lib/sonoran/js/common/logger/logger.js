//  (C) COPYRIGHT INTERNATIONAL BUSINESS MACHINES CORPORATION 2006-2010
//                       ALL RIGHTS RESERVED
//        IBM Research Division, Zurich Research Laboratory
// --------------------------------------------------------------------

/**
 * Logger allows to issue and control the flow of log events.
 * @class
 */
Logger = {
    /** 
     * Log level
     * @type Number
     * @constant 
     */
    EMERG: 1,
    /** 
     * Log level
     * @type Number
     * @constant 
     */
    ERR: 2,
    /** 
     * Log level
     * @type Number
     * @constant 
     */
    WARN: 3,
    /** 
     * Log level
     * @type Number
     * @constant 
     */
    NOTICE: 4,
    /** 
     * Log level
     * @type Number
     * @constant 
     */
    INFO: 5,
    /** 
     * Log level
     * @type Number
     * @constant 
     */
    DEBUG: 6,
    /** 
     * Log level
     * @type Number
     * @constant 
     */
    DEBUG1: 7,
    /** 
     * Log level
     * @type Number
     * @constant 
     */
    DEBUG2: 8,
    /** 
     * Log level
     * @type Number
     * @constant 
     */
    DEBUG3: 9,
    /** 
     * Symbolic log levels 
     * @type String[]
     * @constant 
     */
    SEVERITIES: [
	"EMERG",
	"ERR",
	"WARN",
	"NOTICE",
	"INFO",
	"DEBUG",
	"DEBUG1",
	"DEBUG2",
	"DEBUG3"
    ],

    /** 
     * Numeric log levels 
     * @type Number[]
     * @constant 
     */
    SEVS: [ 0, 1, 2, 3, 4, 5, 6, 7, 8, 9 ],

    /**
     * Representative for all modules.
     * @type String
     * @constant
     */
    ALL: 'ALL',
    /**
     * Sonoran log module name.
     * @type String
     * @constant
     */
    SONORAN: 'SONORAN',

    /**
     * @type String
     * @constant
     */
    EVENTS: 'EVENTS', 

    /** 
     * Module names which appear in log messages.
     * @type String[]
     * @constant 
     */
    modules: [ "ALL", "SONORAN", "EVENTS" ],


    /**
     * Listeners for modifications to log levels and log modules.
     * @type Util.Listeners
     * @private
     */
    logLevelListeners: new Util.Listeners(),
   


    /**
     * Map of module identifiers to log severity identifiers. Both of type Number.
     * @type Object
     * @private
     */
    logLevels:         {
        'EVENTS': 4,   // EVENTS
        'SONORAN': 5   // SONORAN
    },


    /**
     * Map of Sonoran log module (String) to Sonoran log levels (Number)
     * @type Object
     * @private
     */
    mod2severity4immediate: {
	'EVENTS' : 2,
	'SONORAN' : 2
    },


    /**
     * Signals an error with given message for module SONORAN.
     * @param logmsg Message
     * @static
     */
    err: function(/** String */logmsg) {
	if( arguments.length > 1 )
	    logmsg = svprintf(arguments[0],1,arguments);
        Logger.log(Logger.ERR, Logger.SONORAN, logmsg);
    },

    /**
     * Signals an info message for module SONORAN.
     * @param logmsg Message
     * @static
     */
    info: function(/** String */logmsg) {
	if( arguments.length > 1 )
	    logmsg = svprintf(arguments[0],1,arguments);
        Logger.log(Logger.INFO, Logger.SONORAN, logmsg);
    },

    /***
     * Signals a warning message for module SONORAN.
     * @param logmsg Message
     * @static
     */
    warn: function(/** String */logmsg) {
	if( arguments.length > 1 )
	    logmsg = svprintf(arguments[0],1,arguments);
        Logger.log(Logger.WARN, Logger.SONORAN, logmsg);
    },

    /***
     * Signals a debug message for module SONORAN.
     * @param logmsg Message
     * @static
     */
    debug: function(/** String */logmsg) {
	if( arguments.length > 1 )
	    logmsg = svprintf(arguments[0],1,arguments);
        Logger.log(Logger.DEBUG, Logger.SONORAN, logmsg);
    },

    /***
     * Signals a notice message for module SONORAN.
     * @param logmsg Message
     * @static
     */
    notice: function(/** String */logmsg) {
	if( arguments.length > 1 )
	    logmsg = svprintf(arguments[0],1,arguments);
        Logger.log(Logger.NOTICE, Logger.SONORAN, logmsg);
    },

    
    /**
     * Print on stdout if module and severity are to be logged.
     * @param msg
     * @param mod
     * @param sev
     */
    println: function(msg, mod, sev) {
	if (!sev) { sev = this.DEBUG; }
        if (sev <= this.logLevels[mod]) {
	    println(msg);
	}
    },


    /***
     * Create and signal a log event to all registered listeners at Event.Registry.
     * @param severity Severity
     * @param module   Module name
     * @param logmsg   Message
     * @param time     Optional, milliseconds
     * @param mote     Optional, source mote
     * @static
     */
    log: function(/** Number */severity, /** String */module, /** String */logmsg, /** Number */time, /** Sonoran.Mote */mote) {
        assert(typeof(severity)=='number');
        assert(typeof(module)=='string');
        var blob = {
	    //msgtype: Event.LOG,
	    severity: severity,
	    evname: module,
	    module: module,
	    logmsg: logmsg,
	    time: time ? time : Clock.get()*1000*1000
        };
        if (mote) {
	    blob.srcid = mote;
        }
        var ev = new Event.Log(blob);
        ev.time = (time?time:Clock.get()) * 1000;
	this.signal(ev);
    },


    /**
     * Signal a log event to all registered listeners at Event.Registry.
     * @param ev Event.Log
     */
    signal: function(/** Event.Log */ev) {
	//assert(ev.msgtype===Event.LOG);
	assert(ev.category===Event.EV_CAT_LOG);
	var module = ev.module;
	
	var sev = this.mod2severity4immediate[module];
	assert(sev!==undefined, sprintf("Received log message for unknown module '%s'", module));
	if (ev.severity <= sev) {
	    CLI.Shells.printImmediate(ev.toString());
	}

	var sev = this.logLevels[module];
        assert(sev!==undefined, sprintf("Received log message for unknown module '%s'", module));
	if (ev.severity <= sev) {
	    Logger.HISTORY.onEvent(ev);
	    Event.Registry.signalEvent(ev);
	}
    },



    /**
     * Map severity code to string.
     * @param sev DEBUG, ERR, ..
     * @returns {String} Severity name
     * @static
     */
    severity2string: function(/** Number */sev) {
	assert(sev>=1, "Invalid severity " + sev);
	sev-=1;
	return (sev<this.SEVERITIES.length) ? this.SEVERITIES[sev] : "DEBUG";
    },


    /**
     * Map severity string to number.
     * @param sev   String
     * @returns {Number} severity code
     * @static
     */
    severity2number: function(/** String */sev) {
	var idx = this.SEVERITIES.indexOf(sev);
	if (idx < 0) {
	    throw "Invalid log severity: " + sev;
	}
	return idx+1;
    },


    /**
     * Set log levels. All log-level listeners of the Logger are invoked to act according to
     * the newly set log levels. 
     * @param logLeves   Array of module name followed by severity such as [ "HTTP", "ERR", "SONORAN, "DEBUG" ]
     * @param callback   Optional
     * @static
     */
    setLogLevels: function(/** String[] */logLevels, /** DFLT_ASYNC_CB */callback) {
        assert(logLevels%2!=0, "Invalid number of elements in parameter");
        for (var i = 0; i < logLevels.length; i += 2) {
	    var module = logLevels[i]; 
            var severity  = logLevels[i+1];
	    var sev = this.severity2number(severity);
	    this.setLogLevel(this.logLevels, module, sev);
	    this.setImmediateLogFilter(module, sev);
	}

        this.logLevelListeners.notify();

        if (callback) {
            callback(new AOP.OK(this));
        }
    },


    
    /**
     * As setLogLevels, but does not set the immediate log thresholds.
     * @param logLeves   Array of module name followed by severity such as [ "HTTP", "ERR", "SONORAN, "DEBUG" ]
     * @param callback   Optional
     * @static
     * @private
     */
    setLogLevels2: function(/** String[] */logLevels, /** DFLT_ASYNC_CB */callback) {
	var tmp = Blob.copy(this.mod2severity4immediate);
	this.setLogLevels(logLevels);
	this.mod2severity4immediate = tmp;
        if (callback) {
            callback(new AOP.OK(this));
        }
    },



    /**
     * @returns {Object} Configured log levels, map of module (String) to log severity (Number).
     * @static
     */
    getLogLevels: function() {
	return this.logLevels;
    },


    /**
     * @param module
     * @returns {Number} The configured severity for a module name.
     * @static
     */
    getSeverity: function(/** String */module) {
        var ret = this.logLevels[module];
        assert(ret!==undefined, "No such log module: " + module);
        return ret;
    },


    /**
     * @param module
     * @param severity
     * @returns {Boolean} True if a message of given severity and for given module name would be logged
     * @static
     */
    logs: function(/** String */module, /** Number */severity) {
        var sev = this.logLevels[module];
        return (severity <= sev);
    },


    /**
     * Set log level in an object mapping module names to severity numbers.
     * @param obj      Input object
     * @param module   Module name or 'ALL' for all modules
     * @param severity ERR, ...
     * @static
     * @private
     */
    setLogLevel: function(/** Object */obj, /** String */module, /** Number */severity) {
        assert(typeof(module) === 'string');
        if (module==='ALL') {
	    for (var m in this.logLevels) {
	        obj[m] = severity;
	    }
        } else {
	    obj[module] = severity;
        }
    },



    /**
     * Define a module for which messages can be logged. 
     * @param names     Name(s) of module
     * @param severity Default severity for this module, if unspecified, ERR 
     */
    defineModule: function(/** String|String[] */names, /** Number */severity) {
	if (typeof(names) === 'string') {
	    names = [ names ];   
	}
	var modified = false;
	for (var i = 0; i < names.length; i++) {
	    var name = names[i];
	    var idx = this.modules.indexOf(name);
	    if (idx >= 0) {
		continue;
	    }
	    modified = true;
	    this.modules.push(name);
	    if (severity===undefined) {
		severity = this.ERR;
	    }
	    this.logLevels[name] = severity;
	    this.mod2severity4immediate[name] = severity;
	}

	if (modified) {
	    this.logLevelListeners.notify();
	}
    },


    /**
     * Return currently defined module names.
     * @returns {String[]}
     */
    getModules: function() {
	return this.modules;
    },



    /**
     * Switch on logging of message for given module on all interactive shells starting with given severity.
     * @param module
     * @param severity
     */
    setImmediateLogFilter: function(/** String */module, /** Number */severity) {
	assert(this.modules.indexOf(module) >= 0, "No such log module: " + module);
	if (module === "ALL") {
	    for (module in this.mod2severity4immediate) {
		this.mod2severity4immediate[module] = severity;
	    }
	} else {
            this.mod2severity4immediate[module] = severity;
	}
    },

    /**
     * Reset log message filter.
     */
    resetImmediateLogFilter: function() {
        this.mod2severity4immediate = {};
        for (var mod in this.modules) {
	    this.mod2severity4immediate[mod] = Logger.ERR;
        };
    },

    /**
     * @returns {Object} immediate mapping (Map of module number to severity number).
     */
    getImmediateLogFilter: function() {
        return this.mod2severity4immediate;
    },

    /**
     * @returns {Number} severity of log messages dumped immediately  for a specified module
     */
    getImmediateLogSeverity: function(/** String */module) {
        return this.mod2severity4immediate[module];
    }
};


//Runtime.include("./history.js");



