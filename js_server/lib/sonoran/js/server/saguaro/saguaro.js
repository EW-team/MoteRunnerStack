//  (C) COPYRIGHT INTERNATIONAL BUSINESS MACHINES CORPORATION 2006-2010
//                       ALL RIGHTS RESERVED
//        IBM Research Division, Zurich Research Laboratory
// --------------------------------------------------------------------




Runtime.include("saguaro/saguaro.js");
Runtime.include("saguaro/saguaro-defs.js");
Runtime.include("saguaro/platforms.js");

//Runtime.include("./connections.js");
Runtime.include("./connection.js");
Runtime.include("./timer.js");
Runtime.include("./command.js");
Runtime.include("./mote.js");
Runtime.include("./process.js");
Runtime.include("./device.js");
Runtime.include("./util.js");
Runtime.include("./cli.js");




/**
 * Returns mote implementation offering Saguaro functionality.
 * @param mote
 * @returns {Saguaro.MoteImpl}
 */
Saguaro.mote2impl = function(/** Sonoran.Mote */mote) {
    var impl = mote.getAttribute(Saguaro.IMPL_MOTE_ATTR_NAME);
    assert(impl);
    return impl;
};



/**
 * Returns connection offering Saguaro functionality.
 * @param mote
 * @returns {Saguaro.Connection}
 */
Saguaro.mote2conn = function(/** Sonoran.Mote */mote) {
    return Saguaro.mote2impl(mote).conn;
};



/**
 * @type Number
 * @private
 */
Saguaro.IMPL_MOTE_ATTR_NAME = "Saguaro";


/**
 * Default host for saguaro connection.
 * @type String
 * @constant
 */
Saguaro.DFLT_HOST = 'localhost';

/**
 * Default port for saguaro connection.
 * @type Number
 * @constant
 */
Saguaro.DFLT_PORT = parseInt(IO.Process.getenv("SAGUARO_PORT"));
if (!Saguaro.DFLT_PORT) {
    Saguaro.DFLT_PORT = 44044;
}
OPTIONS.add("Saguaro.DFLT_PORT","number");



/**
 * Default port for saguaro library.
 * @type Number
 * @constant
 */
Saguaro.DLL_PORT = 5010;

/**
 * Id of controller in a saguaro process.
 * @type Number
 * @constant
 * @private
 */
Saguaro.CONTROLLER_ID = 1;

/**
 * Device name of simuated LEDs.
 * @type String
 * @constant
 */
Saguaro.DEVN_LEDs = "LEDs";

/**
 * Device name of simuated radio.
 * @type String
 * @constant
 */
Saguaro.DEVN_RADIO = "RADIOHW";


/**
 * Device name of simuated lip device.
 * @type String
 * @constant
 */
Saguaro.DEVN_LIP = "UARTLIPHW";

/**
 * Power device name.
 * @type String
 * @constant
 */
Saguaro.DEVN_POWER = "POWER";

/**
 * Saguaro message type.
 *  @type Number
 *  @constant
 * @private
 */
Saguaro.LIP_DATA = 1;

/**
 * Saguaro message type.
 *  @type Number
 *  @constant
 * @private
 */
Saguaro.CONTROLLER_CMD = 2;

/**
 * Saguaro message type.
 *  @type Number
 *  @constant
 * @private
 */
Saguaro.CONTROLLER_REPLY = 3;

/**
 * Saguaro message type.
 *  @type Number
 *  @constant
 * @private
 */
Saguaro.MOTE_CMD = 4;

/**
 * Saguaro message type.
 *  @type Number
 *  @constant
 * @private
 */
Saguaro.MOTE_REPLIES = 5;

/**
 * Saguaro message type.
 *  @type Number
 *  @constant
 * @private
 */
Saguaro.HALT_EVENT = 6;

/**
 * Saguaro message type.
 *  @type Number
 *  @constant
 * @private
 */
Saguaro.START_EVENT = 7;

/**
 * Saguaro message type.
 *  @type Number
 *  @constant
 * @private
 */
Saguaro.LOG_EVENT = 8;

/**
 * Saguaro message type.
 *  @type Number
 *  @constant
 * @private
 */
Saguaro.DEBUG_EVENT = 9;

/**
 * Saguaro message type.
 *  @type Number
 *  @constant
 * @private
 */
Saguaro.MEDIA_EVENT = 10;

/**
 * Saguaro message type.
 *  @type Number
 *  @constant
 * @private
 */
//Saguaro.UPDATE_EVENT = 11;

/**
 * Saguaro message type.
 *  @type Number
 *  @constant
 * @private
 */
Saguaro.JSON_EVENT = 12;

/**
 * Saguaro message type.
 *  @type Number
 *  @constant
 * @private
 */
Saguaro.MOTE_EVENT = 13;

/**
 * Saguaro message type.
 *  @type Number
 *  @constant
 * @private
 */
Saguaro.GENERIC_EVENT = 14;

/**
 * Saguaro message type.
 *  @type Number
 *  @constant
 * @private
 */
Saguaro.EVENT_LIST = 15;






/**
 * Saguaro message type.
 *  @type Number
 *  @constant
 * @private
 */
Saguaro.MSGTYPE_NAMES = {
    1: "LIP_DATA",
    2: "CONTROLLER_CMD",
    3: "CONTROLLER_REPLY",
    4: "MOTE_CMD",
    5: "MOTE_REPLIES",
    6: "HALT_EVENT",
    7: "START_EVENT",
    8: "LOG_EVENT",
    9: "DEBUG_EVENT",
    10: "MEDIA_EVENT",
    11: "UPDATE_EVENT",
    12: "JSON_EVENT",
    13: "MOTE_EVENT",
    14: "GENERIC_EVENT",
    15: "EVENT_LIST"
};





// /**
//  * The number of IO packets in system queue from which on the
//  *  saguaro process should be halted until pending events are consumed.
//  *  @type Number
//  *  @constant
//  * @private
//  */
// Saguaro.FLOWCONTROL_QUEUE_LEN = 100;
// OPTIONS.add("Saguaro.FLOWCONTROL_QUEUE_LEN", "int", "Number of packets");



/**
 * HALT, RECORD, LOG event.
 * @type String
 * @constant
 */
Saguaro.EV_CONF_FLAGS = "HRL";

// /**
//  * @type String[]
//  * @constant
//  */
// Saguaro.CATEGORIES = [
//     Saguaro.EV_CAT_HALT,
//     Saguaro.EV_CAT_RADIOHW,
//     Saguaro.EV_CAT_VM
// ];




/**
 * @type String
 * @constant
 */
Saguaro.EV_RADIOHW_SETRAS = "radiohw:setras"; // radio state changes

/**
 * @type String
 * @constant
 */
Saguaro.EV_RADIOHW_ADDR = "radiohw:addr"; // radio state changes


/**
 * @type String
 * @constant
 */
Saguaro.EV_RADIOHW_TXFRAME = "radiohw:txframe"; // radio state changes

/**
 * @type String
 * @constant
 */
Saguaro.EV_RADIOHW_RXFRAME = "radiohw:rxframe"; // radio state changes


/**
 * @type String
 * @constant
 */
Saguaro.EV_LED_OFF = "led:off";


/**
 * @type String
 * @constant
 */
Saguaro.EV_LED_ON = "led:on";


/**
 * @type String
 * @constant
 */
Saguaro.EV_VM_ASMCTOR = "vm:asmCtor"; // Assembly constructor (ASMCTOR) is about to be executed

/**
 * @type String
 * @constant
 */
Saguaro.EV_VM_ASMDELETED = "vm:asmDeleted";       // Assembly is about to be deleted.

/**
 * @type String
 * @constant
 */
Saguaro.EV_VM_ASMCTORSFAIL = "vm:asmCtorsFail";     // System start up failed due to ASMCTOR uncaught exception

/**
 * @type String
 * @constant
 */
Saguaro.EV_VM_ASMCTORSDONE = "vm:asmCtorsDone";    // All ASMCTORs successfully completed on system start up

/**
 * @type String
 * @constant
 */
Saguaro.EV_VM_FRAMEEXIT = "vm:frameExit";

/**
 * @type String
 * @constant
 */
Saguaro.EV_VM_FRAMESTART = "vm:frameStart";

/**
 * @type String
 * @constant
 */
Saguaro.EV_VM_EXUNCAUGHT = "vm:exUncaught";

/**
 * @type String
 * @constant
 */
Saguaro.EV_VM_EXCATCH = "vm:exCatch";

/**
 * @type String
 * @constant
 */
Saguaro.EV_VM_EXTHROW = "vm:exThrow";

/**
 * @type String
 * @constant
 */
Saguaro.EV_VM_BREAKPOINTS = "vm:breakpoints";

/**
 * @type String
 * @constant
 */
Saguaro.EV_VM_WATCHPOINTS = "vm:watchpoints";

/**
 * @type String
 * @constant
 */
Saguaro.EV_VM_BCBEFORE = "vm:bcBefore";

/**
 * @type String
 * @constant
 */
Saguaro.EV_VM_BCAFTER = "vm:bcAfter";

/**
 * @type String
 * @constant
 */
Saguaro.EV_VM_VMSTART = "vm:vmStart";

/**
 * @type String
 * @constant
 */
Saguaro.EV_VM_VMEXIT = "vm:vmExit";



/**
 * Default halt conditions object.
 * @type Object
 */
Saguaro.DFLT_HALT_CONDITIONS = {};

Saguaro.DFLT_HALT_CONDITIONS[Saguaro.EV_VM_ASMCTOR]      = 0;
Saguaro.DFLT_HALT_CONDITIONS[Saguaro.EV_VM_ASMDELETED]   = 0;
Saguaro.DFLT_HALT_CONDITIONS[Saguaro.EV_VM_ASMCTORSFAIL] = 0;
Saguaro.DFLT_HALT_CONDITIONS[Saguaro.EV_VM_ASMCTORSDONE] = 0;
Saguaro.DFLT_HALT_CONDITIONS[Saguaro.EV_VM_FRAMEEXIT]    = 0;
Saguaro.DFLT_HALT_CONDITIONS[Saguaro.EV_VM_FRAMESTART]   = 0;
Saguaro.DFLT_HALT_CONDITIONS[Saguaro.EV_VM_EXUNCAUGHT]   = 1;
Saguaro.DFLT_HALT_CONDITIONS[Saguaro.EV_VM_EXCATCH]      = 0;
Saguaro.DFLT_HALT_CONDITIONS[Saguaro.EV_VM_EXTHROW]      = 0;
Saguaro.DFLT_HALT_CONDITIONS[Saguaro.EV_VM_BREAKPOINTS]  = 1;
Saguaro.DFLT_HALT_CONDITIONS[Saguaro.EV_VM_WATCHPOINTS]  = 0;
Saguaro.DFLT_HALT_CONDITIONS[Saguaro.EV_VM_BCBEFORE]     = 0;
Saguaro.DFLT_HALT_CONDITIONS[Saguaro.EV_VM_BCAFTER]      = 0;
Saguaro.DFLT_HALT_CONDITIONS[Saguaro.EV_VM_VMSTART]      = 0;
Saguaro.DFLT_HALT_CONDITIONS[Saguaro.EV_VM_VMEXIT]       = 0;








/**
 * @type String
 * @constant
 */
Saguaro.EV_SETRAS = "setras"; // radio state change


/**
 * @type String
 * @constant
 */
Saguaro.EV_ADDR = "addr"; // radio state change


/**
 * @type String
 * @constant
 */
Saguaro.EV_ASMCTOR = "asmCtor"; // Assembly constructor (ASMCTOR) is about to be executed

/**
 * @type String
 * @constant
 */
Saguaro.EV_ASMDELETED = "asmDeleted";       // Assembly is about to be deleted.

/**
 * @type String
 * @constant
 */
Saguaro.EV_ASMCTORSFAIL = "asmCtorsFail";     // System start up failed due to ASMCTOR uncaught exception

/**
 * @type String
 * @constant
 */
Saguaro.EV_ASMCTORSDONE = "asmCtorsDone";    // All ASMCTORs successfully completed on system start up

/**
 * @type String
 * @constant
 */
Saguaro.EV_FRAMEEXIT = "frameExit";

/**
 * @type String
 * @constant
 */
Saguaro.EV_FRAMESTART = "frameStart";

/**
 * @type String
 * @constant
 */
Saguaro.EV_EXUNCAUGHT = "exUncaught";

/**
 * @type String
 * @constant
 */
Saguaro.EV_EXCATCH = "exCatch";

/**
 * @type String
 * @constant
 */
Saguaro.EV_EXTHROW = "exThrow";

/**
 * @type String
 * @constant
 */
Saguaro.EV_BREAKPOINTS = "breakpoints";

/**
 * @type String
 * @constant
 */
Saguaro.EV_WATCHPOINTS = "watchpoints";

/**
 * @type String
 * @constant
 */
Saguaro.EV_BCBEFORE = "bcBefore";

/**
 * @type String
 * @constant
 */
Saguaro.EV_BCAFTER = "bcAfter";

/**
 * @type String
 * @constant
 */
Saguaro.EV_VMSTART = "vmStart";

/**
 * @type String
 * @constant
 */
Saguaro.EV_VMEXIT = "vmExit";



















/**
 * Saguaro.Options implements options which are taken into account
 * when a mote is created. 
 * @class
 * @private
 */
Saguaro.Options = {
    /**
     * BugZ settings
     * @type Object
     * @private
     */
    bugz: {
        breakConditions: {
            "breakpoint":0,
            "watchpoint":0,
            "exception-uncaught":0
        },
        haltConditions: {
            "vm:breakpoints":1,
            "vm:exUncaught":1
        },
        handleAsmLoaded: true
    },

    /**
    * Configure halt conditions. Currently set halt conditions are overwritten with
    * specified ones.
    * @param haltConditions   Map of halt condition category:evname to number (0:off, 1:on)
    * @param callback
    * @throws {AOP.Exception}
    * @private
    */
   setHaltConditions: function(/** Object */haltConditions, /** boolean */setOnCurrentMotes, /** DFLT_ASYNC_CB */callback) {
       if (BC.is(callback)) { return BC.exec(arguments.callee, this, arguments); }
       assert(typeof(haltConditions) === 'object');
       for (var n in haltConditions) {
           Saguaro.Options.bugz.haltConditions[n] = haltConditions[n];
       }
       haltConditions = Saguaro.Options.bugz.haltConditions;
       var motes = Saguaro.getSaguaroMotes();
       if (!setOnCurrentMotes || (motes.length===0)) {
           callback(new AOP.OK());
           return;
       }
       var descrs = [];
       for (var i = 0; i < motes.length; i++) {
           var mote = motes[i];
           var impl = Saguaro.mote2impl(mote);
           descrs.push(new Execute.Descr(impl.programHaltConditions, impl, haltConditions));
       }
       Execute.OneByOne(descrs, function(result) {
           if (result.code != 0) {
               callback(result);
           } else {
               callback(new AOP.OK());
           }
       });
   },

    
    /**
     * @private
     */
    getBreakConditionsAsMap: function() {
        return Saguaro.Options.bugz.breakConditions;
    },

    
    /**
     * @private
     */
    getBreakConditionsAsArray: function() {
        var arr = [];
        for (var n in Saguaro.Options.bugz.breakConditions) {
            var v = Saguaro.Options.bugz.breakConditions[n];
            arr.push(n);
            arr.push(v);
        }
        return arr;
    },


    /**
     * @private
     */
    getHaltConditionsAsMap: function() {
        return Saguaro.Options.bugz.haltConditions;
    },

    
    /**
     * @private
     */
    getHaltConditionsAsArray: function() {
        var arr = [];
        for (var n in Saguaro.Options.bugz.haltConditions) {
            var v = Saguaro.Options.bugz.haltConditions[n];
            arr.push(n);
            arr.push(v);
        }
        return arr;
    },


    /**
     * Map halt conditions to ["vm:bcAfter+H", "vm:bcBefore-H"] etc
     * @private
     */
    getHaltConditionsAsSaguaroArgs: function() {
	assert(Saguaro.Options.bugz.haltConditions);
	return Saguaro.haltConditons2saguaroArgs(Saguaro.Options.bugz.haltConditions);
    }
};


/**
 * @param haltConditions
 * @returns {String[]}
 * @private
 */
Saguaro.haltConditons2saguaroArgs = function(/** Object */haltConditions) {
    var sa = [];
    for (var name in haltConditions) {
	if (haltConditions[name]) {
	    sa.push(name + "+H");
	} else {
	    sa.push(name + "-H");
	}
    }
    return sa;
};






/**
 * @private
 */
Saguaro.IPv6ADDR_LINK_LOCAL_ALL_ROUTERS = Formatter.hexToBin("FF020000000000000000000000000001");


/**
 * @private
 */
Saguaro.DUST_TYPE = "dust";

/**
 * @private
 */
Saguaro.AVRRAVEN_TYPE = "avrraven";


/**
 * @constant
 * @type Number
 * @private
 */
Saguaro.LOG_MOD_ALL = 0;

/**
 * @constant
 * @type Number
 * @private
 */
Saguaro.LOG_MOD_IO = 1;

/**
 * @constant
 * @type Number
 * @private
 */
Saguaro.LOG_MOD_HTTP = 2;

/**
 * @constant
 * @type Number
 * @private
 */
Saguaro.LOG_MOD_THREAD = 3;

/**
 * @constant
 * @type Number
 * @private
 */
Saguaro.LOG_MOD_MOTE = 4;

/**
 * @constant
 * @type Number
 * @private
 */
Saguaro.LOG_MOD_HAL = 5;

/**
 * @constant
 * @type Number
 * @private
 */
Saguaro.LOG_MOD_LIP = 6;

/**
 * @constant
 * @type Number
 * @private
 */
Saguaro.LOG_MOD_RADIO = 7;

/**
 * @constant
 * @type Number
 * @private
 */
Saguaro.LOG_MOD_MEDIA = 8;

/**
 * @constant
 * @type Number
 * @private
 */
Saguaro.LOG_MOD_SERIAL = 9;

/**
 * @constant
 * @type Number
 * @private
 */
Saguaro.LOG_MOD_MAPP = 10;

/**
 * @constant
 * @type Number
 * @private
 */
Saguaro.LOG_MOD_CURRENT = 11;

/**
 * @constant
 * @type Number
 * @private
 */
Saguaro.LOG_MOD_VMDEBUG = 12;

/**
 * @constant
 * @type Number
 * @private
 */
Saguaro.LOG_MOD_DEVICE = 13;

/**
 * @constant
 * @type Number
 * @private
 */
Saguaro.LOG_MOD_LORA = 14;

/**
 * @constant
 * @type Number
 * @private
 */
Saguaro.LOG_MOD_UNKNOWN = 15;

/**
 * @constant
 * @type Number
 * @private
 */
Saguaro.LOG_MOD_UNUSED = 16;


/**
 * Saguaro log module names, ordered according to saguaro log module id.
 * Keep in sync with saguaro.
 * @constant
 * @type String[]
 * @private
 */
Saguaro.LOG_MODULES = [
    'ALL',
    'IO',
    'HTTP',
    'THREAD',
    'MOTE',
    'HAL',
    'LIP',
    'RADIO',
    'MEDIA',
    'SERIAL',
    'MAPP',
    'CURRENT',
    'VMDEBUG',
    'DEVICE',
    'LORA',
    'UNKNOWN'
];


/**
 * @returns {String} Module name for saguaro module id
 * @private
 */
Saguaro.mapLogModId2Name = function(/** Number */modid) {
    assert(modid >= 0 && modid < Saguaro.LOG_MOD_UNUSED, "Received invalid log module identifier from saguaro: " + modid);
    return Saguaro.LOG_MODULES[modid];
};

/**
 * @returns {Number} Module id or -1
 * @private
 */
Saguaro.mapLogModName2Id = function(/** String */name) {
    var idx = Saguaro.LOG_MODULES.indexOf(name);
    return idx;
};


Logger.defineModule(Saguaro.LOG_MODULES);

Logger.setLogLevels([ 'MAPP', 'INFO' ]);
Logger.setImmediateLogFilter('MAPP', Logger.INFO);





