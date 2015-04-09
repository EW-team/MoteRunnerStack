//  (C) COPYRIGHT INTERNATIONAL BUSINESS MACHINES CORPORATION 2006-2010
//                       ALL RIGHTS RESERVED
//        IBM Research Division, Zurich Research Laboratory
// --------------------------------------------------------------------


/**
 * Sagaro handles saguaro processes and provides functions to communicate with simulated motes.
  * Sonoran provides the following classes and functions:
 * <ul>
 * <li>{@link Saguaro#startProcess},{@link Saguaro#getProcess}: allow for connecting or starting a simulation process.</li>
 * <li>{@link Saguaro.Connection}: represents a connection to a simulation process allowing to send commands to it.</li>
 * <li>{@link Saguaro.MoteImpl}: implements a mote hosted by a saguaro process and which might be target of simulation-specific commands.</li>
 * <li>{@link Saguaro.Response}: carries the result of requests from the simulation process.</li>
 * <li>{@link Saguaro.Device}: allows to feed in simulated device-data to a saguaro simulation.</li>
 * </ul>
 * @namespace Saguaro
 */
Saguaro = {};


/**
 * Saguaro run state.
 * @type String
 * @constant
 */
Saguaro.RUN_STATE_RUNNING = 'running';

/**
 * Saguaro run state.
 * @type String
 * @constant
 */
Saguaro.RUN_STATE_HALTED = 'halted';

/**
 * CPU_MODES
 * @type String[]
 * @constant
 */
Saguaro.CPU_MODES = [
   "RST",
   "RUN",
   "IDL",
   "HLT",
   "BRK",
   "GDB"
];

/**
 * @type RegEx
 * @constant
 * @private
*/
Saguaro.ASM_ID_REGEX = /^a\:([0-9a-fA-F]+)$/;



/**
 * Entry in a response of a 'sdx-lines' command. Might have properties asmIdentity (String), filename (String),
 * lineno (Number), endline (Number), around (Number) and lines (String[]).
 * @class
 * @constructor
 * @private
 */
Saguaro.SdxInfo = function(/** Blob */blob) {
    for (var k in blob) {
        this[k] = blob[k];
    }
};

/** @private */
Saguaro.SdxInfo.prototype = {
    /** @ignore */
    __constr__: "Saguaro.SdxInfo",

    /**
     * @private
     */
    toString: function() {
        var txt = "";
        if (this.asmIdentity) {
            txt += this.asmIdentity;
        } else if (this.filename) {
            txt += this.filename;
        }
        return txt;
    }
};





// /**
//  * Class encapsulating the state of a device of a simulated mote.
//  * @class
//  * @constructor
//  * @param mote
//  * @param devname
//  * @param state
//  */
// Saguaro.DeviceState = function(/** Sonoran.Mote */mote, /** String */name, /** Object */state) {
//     /**
//      * @type Sonoran.Mote
//      * @private
//      */
//     this.mote = mote;
//     /**
//      * @type String
//      * @private
//      */
//     this.name = name;
//     /**
//      * @type Object
//      * @private
//      */
//    this.state = state;
// };

// /** @private */
// Saguaro.DeviceState.prototype = {
//    /** @ignore */
//    __constr__: "Saguaro.DeviceState",

//     /**
//      * @returns {Sonoran.Mote} the mote
//      */
//     getMote: function() {
//         return this.mote;
//     },

//     /**
//      * @returns {String} the device name
//      */
//     getName: function() {
//         return this.name;
//     },

//     /**
//      * @returns {Object} the device state. Properties depend on the concrete device.
//      */
//     getState: function() {
//         return this.state;
//     },

//     /**
//      * Return text representation of device state.
//      * @returns {String[]} text representation of device state
//      */
//     formatState: function() {
//         var name = this.name;
//         var state = this.state;
//         if (name === 'LIP') {
//             var t = new Formatter.Table2(2);
//             t.setValue(0, 0, "Name");
//             t.setValue(1, 0, name);
//             var y = 1;
//             for (var n in state) {
//                 t.setValue(0, y, n);
//                 var str, val = state[n];
//                 if (n!=='received' || !val) {
//                     str = val;
//                 } else {
//                     val = val.join("");
//                     str = Util.Formatter.genHexTable(val, 0, 4, true).join("\n");
//                 }
//                 t.setValue(1, y, str);
//                 y += 1;
//             }
//             return t.render();
//         }
//         if (name === 'RADIO') {
//             var t = new Formatter.Table2(2);
//             t.setValue(0, 0, "Name");
//             t.setValue(1, 0, name);
//             var y = 1;
//             for (var n in state) {
//                 t.setValue(0, y, n);
//                 var str;
//                 if (n !== 'channelState') {
//                     str = state[n];
//                 } else {
//                     var _t = new Formatter.Table2(2);
//                     var chanstate = state[n];
//                     var _y = 0;
//                     for (var _n in chanstate) {
//                         _t.setValue(0, _y, _n);
//                         var val = chanstate[_n];
//                         _t.setValue(1, _y, (_n !== 'data') ? val : (Util.Formatter.genHexTable(val, 0, 4, true)).join("\n"));
//                         _y += 1;
//                     }
//                     str = _t.render().join("\n");
//                 }
//                 t.setValue(1, y, str);
//                 y += 1;
//             }
//             return t.render();
//         }
        
//         var sa = Util.formatData(state).split(/\r?\n/);
//         var lines = [ sprintf("%s=%s", name, sa[0]) ];
//         for (var i = 1; i < sa.length; i++) {
//             lines.push("  " + sa[i]);
//         }
//         return lines;
//     },
    
//    /**
//     * @returns {String}
//     */
//    toString: function() {
//        return "DeviceState: " + this.mote + ", " + this.name + " -->\n" + this.formatState().join("\n");
//    }
// };






/**
 * Encapsulates the response from a 'info' command, i.e. the state a saguaro process is in.
 * @class
 * @constructor
 * @param conn     The connection
 * @param runState    Run state
 * @param runMode  Run mode
 * @param ev       Halt event or null
 */
Saguaro.Info = function(/** Saguaro.Connection */conn, /** String */runState, /** String */runMode, /** Sonoran.Event */event) {
    /**
     * Connection
     * @type Saguaro.Connection
     * @private
     */
    this.conn = conn;
    /**
     * Saguaro.RUN_STATE_HALTED or Saguaro.RUN_STATE_RUNNING
     * @type String
     * @private
     */
    this.runState = runState;
    /**
     * 'logic-time', 'real-time'
     * @type String
     * @private
     */
    this.runMode = runMode;
    /**
     * Event leading to the halt.
     * @type Sonoran.Event
     * @private
     */
    this.event = event;
    /**
     * If no saguaro process is running, false. Otherwise true.
     * @type Boolean
     */
    this.isAlive = (conn!==null&&conn!==undefined);
};

/** @private */
Saguaro.Info.prototype = {
   /** @ignore */
   __constr__: "Saguaro.Info",

    /**
     * Returns the run state.
     * @returns {String} the run state
     */
    getRunState: function() {
	return this.runState;
    },


    /**
     * Returns the saguaro connection
     * @returns {Object}
     */
    getConnection: function() {
	return this.conn;
    },


    /**
     * Returns the run mode.
     * @returns {String} the run mode
     */
    getRunMode: function() {
	return this.runMode;
    },


    /**
     * Returns the halt event.
     * @returns {Event}
     */
    getEvent: function() {
	return this.event;
    },

    /**
     * @returns {Boolean} whether saguaro is in running state (state "running").
     */
    isRunning: function() {
        return this.runState === Saguaro.RUN_STATE_RUNNING;
    },

    /**
     * Return whether described run state is current run state.
     * @param runState
     * @param runMode Optional
     * @returns {Bolean}
     * @private
     */
    hasRunState: function(/** String */runState, /** String */runMode) {
        if (this.runState !== runState) {
            return false;
        }
        if (runMode!==undefined && this.runMode!==runMode) {
            return false;
        }
        return true;
    },


    /**
     * Set run-state, run-mode.
     * @param runState
     * @param runMode Optional
     * @private
     */
    setRunState: function(/** String */runState, /** String */runMode) {
        this.runState = runState;
	if (runMode!==undefined) {
	    this.runMode = runMode;
        }
    },


    /**
     * @returns {String} String
     */
    toString: function() {
        var txt;
        if (!this.isAlive) {
            txt = "No saguaro process running";
        } else if (this.runState == "running") {
	    txt = sprintf("System is running in mode `%s'.\nTo halt the system try: saguaro-halt", this.runMode);
	} else if (this.runState == "halted" ) {
	    txt = sprintf("System halted: state=%s  runmode=%s", this.runState, this.runMode);
            if (this.event) {
                txt += "\n" + this.event;
            }
	} else {
	    txt = sprintf("State: %s\nRun-Mode: %s", this.runState, this.runMode);
        }
        return txt;
    }
};




/**
 * Response from a saguaro command executed in a saguaro process.
 * @class
 * @constructor
 * @param response
 * @param replies
 */
Saguaro.Response = function(/** Object */response, /** Object[] */replies) {
    this.response = response;
    this.replies = replies;
};

/** @private */
Saguaro.Response.prototype = {
    /** @ignore */
    __constr__: "Saguaro.Response",
    
    /**
     * Return single reply in array of replies from saguaro.
     * @returns {Object}
     * @throws {Exception} if zero or more than one replies are contained in saguaro response
     */
    getReply: function() {
	if (this.replies.length !== 1) {
	    throw new Exception("Expected single reply in response from saguaro, but received " + this.replies.length);
	}
	return this.replies[0];
    },

    /**
     * Return data portion of single reply in array of replies from saguaro.
     * @returns {Object}
     * @throws {Exception} if zero or more than one replies are contained in saguaro response or no data property is defined
     */
    getReplyData: function() {
	var reply = this.getReply();
	var data = reply.data;
	if (data===undefined) {
	    throw new Exception("Expected data portion in single reply in response from saguaro, but received none");
	}
	return data;
    },

    /**
     * Return replies from saguaro commands.
     * @returns {Object[]}
     * @throws {Exception} if zero or more than one replies are contained in saguaro response
     */
    getReplies: function() {
	return this.replies;
    },

    /**
     *  Full response object received from saguaro command.
     * @returns {Object}
     */    
    getResponse: function() {
	return this.response;
    },

    /**
     * @returns {String}
     */
    toString: function() {
	return Util.formatData(this.replies);
    }
};








/**
 * @class
 * @private
 * @constructor
 * @param mote
 */
Saguaro.EvConfigs = function(/** Sonoran.Mote */mote) {
    this.mote = mote;
    this.name2category = {};
};

/** */
Saguaro.EvConfigs.prototype = {
    /** @ignore */
    __constr__: "Saguaro.EvConfigs",

    /**
     * @param f
     */
    forEach: function(f) {
	var name2category = this.name2category;
	for (var catname in name2category) {
	    var category = name2category[catname];
	    assert(category);
	    var name2config = category.name2config;
	    for (var confname in name2config) {
		var config = name2config[confname];
		assert(config);
		f(category, config);
	    }
	}
    },
    
    /**
     * @param data
     * @private
     */
    onData: function(data) {
	assert(data instanceof Array);
	this.name2category = {};
	for (var i = 0; i < data.length; i++) {
	    var cat = data[i];
	    assert(cat.name&&cat.text);
	    var evlist = cat.evlist;
	    assert(evlist);
	    if (!this.name2category[cat.name]) {
		this.name2category[cat.name] = new Saguaro.EvConfigs.Category(cat.name, cat.text);
	    }
	    cat = this.name2category[cat.name];
	    for (var j = 0; j < evlist.length; j++) {
		var evle = evlist[j];
		assert(evle.name&&evle.text&&evle.flags);
		cat.update(evle.name, evle.text, evle.flags);
	    }
	}
    },

     /**
     * @returns {Boolean}
     */
    isLogged: function(/** String */cat, /** String */name) {
	var cfg = this.getEvConfig(cat, name);
	return cfg.flags.indexOf('L') >= 0;
    },

    /**
     * @returns {Boolean}
     */
    isRecorded: function(/** String */cat, /** String */name) {
	var cfg = this.getEvConfig(cat, name);
	return cfg.flags.indexOf('R') >= 0;
    },
    
    /**
     * @returns {Boolean}
     */
    causesHalt: function(/** String */cat, /** String */name) {
	var cfg = this.getEvConfig(cat, name);
	return cfg.flags.indexOf('H') >= 0;
    },
    

    /** 
     * @param cat
     * @param names
     * @param flag   'R', 'H' or 'L'
     * @param callback
     * @private
    */
    setFlag: function(/** String */cat, /** String|String[] */names, /** String */flag, /** Boolean */value, /** DFLT_ASYNC_CB */callback) {
	if (BC.is(callback)) { return BC.exec(arguments.callee, this, arguments); }
	assert(flag.length===1, "Invalid flag parameter: " + flag);
	assert(Saguaro.EV_CONF_FLAGS.indexOf(flag.charAt(0)) >= 0, "Invalid flag parameter: " + flag);
	if (typeof(names) === 'string') {
	    names = [ names];
	}
	var sym = value ? '+' : "-";
	var args = [ cat + ":" + names.join(",") + sym + flag ];
	var impl = Saguaro.mote2impl(this.mote);
	var cmd = impl.getMoteCmd("ev-config", args);
	var _this = this;
	cmd.issue1(function(result) {
		       if (result.code !== 0) {
			   callback(result);
		       } else {
			   _this.update(callback);
		       }
		   });
    },


    /** 
     * @param args  Example ["vm:bcAfter+H", "vm:bcBefore-H"]
     * @private
    */
    programFlags: function(/** String[] */args, /** DFLT_ASYNC_CB */callback) {
	if (BC.is(callback)) { return BC.exec(arguments.callee, this, arguments); }
	var impl = Saguaro.mote2impl(this.mote);
	var cmd = impl.getMoteCmd("ev-config", args);
	var _this = this;
	cmd.issue1(function(result) {
		       if (result.code !== 0) {
			   callback(result);
		       } else {
			   _this.update(callback);
		       }
		   });
    },

    /** 
     * @param cat
     * @param names
     * @param flags  Combination of 'R', 'H', 'L' or '0' or '1'
     * @private
    */
    setFlags: function(/** String */cat, /** String|String[] */names, /** String */flags, /** DFLT_ASYNC_CB */callback) {
	if (BC.is(callback)) { return BC.exec(arguments.callee, this, arguments); }
	if (typeof(names) === 'string') {
	    names = [ names];
	}
	var args = [ cat + ":" + names.join(",") + '=' + flags ];
	var impl = Saguaro.mote2impl(this.mote);
	var cmd = impl.getMoteCmd("ev-config", args);
	var _this = this;
	cmd.issue1(function(result) {
		       if (result.code !== 0) {
			   callback(result);
		       } else {
			   _this.update(callback);
		       }
		   });
    },

    /**
     * @param callback
     * @private
     */
    update: function(/** DFLT_ASYNC_CB */callback) {
	if (BC.is(callback)) { return BC.exec(arguments.callee, this, arguments); }
	var impl = Saguaro.mote2impl(this.mote);
	var cmd = impl.getMoteCmd("ev-config");
	var _this = this;
	cmd.issue1(function(result) {
		       if (result.code !== 0) {
			   callback(result);
		       } else {
			   var response = result.getData();
			   _this.onData(response.getReply().data);
			   callback(result);
		       }
		   });
    },

    /**
     * @param cat
     * @param name
     * @returns {Saguaro.EvConfigs.Config} config or throws Error
     * @throws {Error}
     */
    getEvConfig: function(/** String */cat, /** String */name) {
	var cfg = this.lookupEvConfig(cat, name);
	if (!cfg) {
	    throw new Error("No event available for: " + cat + ":" + name);
	}
	return cfg;
    },

    /**
     * @param cat
     * @param name
     * @returns {Saguaro.EvConfigs.Config}
     */
    lookupEvConfig: function(/** String */cat, /** String */name) {
	var cat = this.name2category[cat];
	if (!cat) {
	    return null;
	}
	return cat.lookupConfig(name);
    },

    /**
     * @nodoc
     */
    toString: function() {
	var txt = "";
	for (var name in this.name2category) {
	    txt += this.mote.getUniqueid()  + ": " + this.name2category[name].toString();
	    txt += "\n";
	}
	return txt;
    }
};




/**
 * @class
 * @constructor
 * @param name
 * @param text
 */
Saguaro.EvConfigs.Category = function(/** String */name, /** String */text) {
    assert(arguments.length===2);
    this.name = name;
    this.text = text;
    this.name2config = {};
};

/** */
Saguaro.EvConfigs.Category.prototype = {
    /** @ignore */
    __constr__: "Saguaro.EvConfigs.Category",

    /**
     * @returns {String}
     */
    getName: function() {
	return this.name;
    },
    /**
     * @param name
     * @param text
     * @param flags
     */
    update: function(/** String */name, /** String */text, /** String */flags) {
	var config = this.name2config[name];
	if (!config) {
	    config = this.name2config[name] = new Saguaro.EvConfigs.Config(name, text, flags);
	} else {
	    config.text = text;
	    config.flags = flags;
	}
    },

    /**
     * @param name
     * @returns {Saguaro.EvConfigs.Config}
     */
    lookupConfig: function(/** String */name) {
	return this.name2config[name];
    },

    /**
     * @returns {Saguaro.EvConfigs.Config[]}
     */
    getConfigs: function() {
	var configs = [];
	for (var name in this.name2config) {
	    configs.push(this.name2config[name]);
	}
	return configs;
    },

    /**
     * @nodoc
     */
    toString: function() {    
	return this.name + ": " + this.text + "\n" + this.getConfigs().join("\n");
    }
};



/**
 * @class
 * @constructor
 * @param name
 * @param text
 * @param flags
 */
Saguaro.EvConfigs.Config = function(/** String */name, /** String */text, /** String */flags) {
    assert(arguments.length===3);
    this.name = name;
    this.text = text;
    this.flags = flags;
};

/** */
Saguaro.EvConfigs.Config.prototype = {
    /** @ignore */
    __constr__: "Saguaro.EvConfigs.Config",

    /**
     * @returns {String}
     */
    getName: function() {
	return this.name;
    },
     /**
     * @returns {Boolean}
     */
    isLogged: function(/** String */cat, /** String */name) {
	return this.flags.indexOf('L') >= 0;
    },

    /**
     * @returns {Boolean}
     */
    isRecorded: function(/** String */cat, /** String */name) {
	return this.flags.indexOf('R') >= 0;
    },
    
    /**
     * @returns {Boolean}
     */
    causesHalt: function(/** String */cat, /** String */name) {
	return this.flags.indexOf('H') >= 0;
    },

    /**
     * @nodoc
     */
    toString: function() {    
	return sprintf("%s:%25s %s", this.flags, this.name, this.text);
    }
};

/**
 * @class
 * @constructor
 * @param name
 * @param text
 * @param flags
 */
Saguaro.encodedExceptionToString = function(/** Number */excode) {
    if( excode < 256 ) {
	// Internal compact encoding
	var rsn = (excode & SaguaroDEFS.EX_RSN) >> SaguaroDEFS.EX_RSN_SHIFT;
	var xno = (excode & SaguaroDEFS.EX_XNO) >> SaguaroDEFS.EX_XNO_SHIFT;
	if( xno == 0 ) {
	    for( var n in SaguaroDEFS ) {
		if( n.indexOf("EXID0_") == 0 )
		    return n.substr(6);
	    }
	    return sprintf("EXID0=%d", rsn);
	}
	for( var n in SaguaroDEFS ) {
	    if( n.indexOf("EXIDN_") == 0  && SaguaroDEFS[n] == xno ) {
		var xnm = n.substr(6);
		var pre = "EXRSN_"+xnm+"_";
		for( var n in SaguaroDEFS ) {
		    if( n.indexOf(pre) == 0  && SaguaroDEFS[n] == rsn )
			return sprintf("ex=%s rsn=%s", xnm, n.substr(pre.length));
		}
		return sprintf("ex=%s rsn=%d", xnm, rsn);
	    }
	}
	return sprintf("XNO=%d rsn=%d", xno, rsn);
    }
    return sprintf("clsref=%04X reason=%d", (excode>>16) & 0xFFFF, excode & 0xFFFF); 
};
