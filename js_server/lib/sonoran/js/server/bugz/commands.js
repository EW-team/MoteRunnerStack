//  (C) COPYRIGHT INTERNATIONAL BUSINESS MACHINES CORPORATION 2006-2010
//                       ALL RIGHTS RESERVED
//        IBM Research Division, Zurich Research Laboratory
// --------------------------------------------------------------------



/**
 * Sonoran.CLI.Commands.Bugz Debugger commands.
 * @class 
 * @private
 */
Sonoran.CLI.Commands.Bugz = {};

/**
 * @constant
 * @type String
 * @private
 */
Sonoran.CLI.Commands.Bugz.USAGE = "Command-line debugger for simulation.";

/**
 * @constant
 * @type String
 * @private
 */
Sonoran.CLI.Commands.Bugz.DESCRIPTION =
    "Debug mote application on the command line with bugz:\n" +
    "Use 'bugz-break-set' to define a break-point on a mote and assembly or on future upload.\n" +
    "Use 'bugz-watch-set' to define a watch-point on a mote and assembly or on future upload.\n" +
    "Use 'bugz-break-list' to list all defined break-/watch-points.\n" +
    "Use 'bugz-break-del' to delete a break-/watch-point from the list and motes.\n" +
    "Use 'bugz-break-toggle' to enable/disable a break-/watch-point.\n" +
    "Use 'bugz-halt-on' to specify when to halt the simulation on which condition.\n" +
    "Use 'bugz-configure' to configure bugz settings.\n" +
    "Use 'bugz-resume' to continue when in halt state.\n" +
    "Use 'bugz-step-into' to step into when in break state.\n" +
    "Use 'bugz-step-out' to step out when in break state.\n" +
    "Use 'bugz-step-over' to step over when in break state.\n" +
    "Use 'bugz-dump-class' to dump class information.\n" +
    "Use 'bugz-dump-stack' to dump stacks.\n" +
    "Use 'bugz-dump-frame' to dump frames.\n" +
    "Use 'bugz-print' to evaluate an expression and print a variable. object or field.\n";



/**
 * @class
 * @augments Sonoran.CLI.Command
 * @constructor
 * @private
 */
Sonoran.CLI.Commands.Bugz.BaseCmd = function() {
    CLI.Command.apply(this, arguments);
};

/** @private */
Sonoran.CLI.Commands.Bugz.BaseCmd.prototype = extend(
    CLI.Command.prototype,
    /** @lends Sonoran.CLI.Commands.Bugz.BaseCmd.prototype */
    {
        /**
         * Expects properties asmOpt and asmSpec in this and returns an assembly selected by the user.
         * If 'bugz-files' was used, the default assembly might be returned.
         * @returns {Sonoran.AsmName}
         * @private
         */
        getAsmName: function() {
            //assert(this.asmOpt && this.asmSpec);
	    assert(this.asmSpec);
	    assert(this.cmdSpec);
	    var motes = this.cmdSpec.motes;
	    var asm = this.asmSpec.getArg();
            if (asm) {
                var md = Saguaro.ASM_ID_REGEX.exec(asm);
                if (md) {
                    if (!motes || (motes.length==0)) {
                        throw "Missing mote specification to identify target assembly";
                    }
                    var asmid = parseInt(md[1], 16);
                    var asmName;
                    for (var i = 0; i < motes.length; i++) {
			var impl = Saguaro.mote2impl(motes[i]);
                        var asmEntry = impl.getAssemblies().getEntryById(asmid);
                        if (!asmEntry) {
                            throw sprintf("Mote '%s' has no assembly with id %d", motes[i], asmid);
                        }
                        if (!asmName) {
                            asmName = new Sonoran.AsmName(asmEntry);
                        } else {
                            if (!asmName.match(asmEntry)) {
                                throw sprintf("Different assemblies installed on motes for assembly id %d: %s <-> %s", asmid, asmName, asmEntry);
                            }
                        }
                    }
                    asm = asmName;

                } else {
                    asm = new Sonoran.AsmName(asm);
                    var res = Sonoran.Resource.Assembly.getSDXs([ IO.File.getcwd()+"/***", Sonoran.Resource.getGACDir() ], asm);
                    if (res.length==0) {
                        throw sprintf("Cannot find assembly '%s' in GAC or relative to current work directory", asm);
                    }
                }
                return asm;
            }
            asm = Bugz.getSettings().asmName;
            if (!asm) {
                throw "No assembly specified and 'bugz-files' not used";
            }
            return asm;
        },

        
        /**
         * Expects properties locSpec. Returns a code location "file:line".
         * @returns {String}
         * @private
         */
        getCodeLoc: function() {
            assert(this.locSpec);
            var s = this.locSpec.getArg();
            assert(s);
	    //s = File.mappath(s);
            if (/^([a-zA-Z]\:)?[^\:]+\:\d+$/.test(s)) {
                return s;
            } else if (/^\d+$/.test(s)) {
                var l = parseInt(s);
                var f = Bugz.getSettings().fileName;
                if (!f) {
                    throw "No filename specified using 'bugz-files'";
                }
                return f + ":" + s;
            } else {
                //throw "Invalid code location, expected file:line, instead: " + s;
		// form: [class.]method
		return s;
            }
        },

        
        /**
         * @returns {Sonoran.Mote[]} motes specified on command line or array with halted mote (if it exists)
         * @private
         */
        getAnyMotes: function() {
	    assert(this.cmdSpec);
	    var motes = this.cmdSpec.motes;
            if (motes.length == 0) {
                var mote = Bugz.getHaltedMote();
                if (mote) {
                    motes = [ mote ];
                }
            }
            if (motes.length == 0) {
                throw "Missing mote specification and no mote is currently halted";
            }
            var sa = [];
            for (var i = 0; i < motes.length; i++) {
                if (motes[i].getClass() !== 'saguaro') {
                    sa.push(motes[i].getUniqueid());
                }
            }
            if (sa.length > 0) {
                throw "Invalid non-simulated motes: " + sa.join(", ");
            }
            return motes;
        },

        
        /**
         * Make sure debugger is initialized.
         * @private
         */
        init: function(/** Boolean */assertHaltedConn, /** Boolean */assertHaltedMote) {
            var conn = Saguaro.Connection.getConnection();
            if (!conn) {
                throw "Missing running saguaro ";
            }
            if (assertHaltedMote && !Bugz.getHaltedMote()) {
                throw "No mote is in HALT state";
            }
            if (assertHaltedConn && !Bugz.getHaltedEvent()) {
                throw "No connection is in HALT state";
            }
        }
    }
);





/**
 * @class 
 * @constructor
 * @private
 */
Sonoran.CLI.Commands.Bugz.FilesCommand = function(/** CLI.Shell */shell, /** String */name) {
    this.description =
        "Define the context for break/watch points. Specify assembly name and file name break and watch point commands relate to.";
    this.asmSpec = new GetOpt.Simple("assembly", "Assembly specification such as logger-#.# or logger-1.0.25432");
    this.fileSpec = new GetOpt.FileSpec("filename", "File name such as blink.cs", undefined, true);
    Sonoran.CLI.Commands.Bugz.BaseCmd.call(this, shell, name, [ this.asmSpec, this.fileSpec, new GetOpt.EndOfArgs() ], 0);
};

/** @private */
Sonoran.CLI.Commands.Bugz.FilesCommand.prototype = extend(
    Sonoran.CLI.Commands.Bugz.BaseCmd.prototype,
    {
        /** @private */
        exec: function(callback) {
            this.init(false, false);
            var settings = Bugz.getSettings();
            var asm = this.asmSpec.getArg();
            var file = this.fileSpec.getPath();
            if (asm==null && file==null) {
                callback(new AOP.OK(settings));
                return;
            }
            asm = new Sonoran.AsmName(asm);
            var resources = Sonoran.Resource.Assembly.getSBAs([ IO.File.getcwd()+"/***", Sonoran.Resource.getGACDir() ], asm);
            if (resources.length==0) {
                callback(new AOP.ERR(sprintf("Cannot find assembly '%s' in GAC or relative to current work directory", asm)));
                return;
            }
            settings.setAsmName(asm);
            settings.setFileName(file);
            callback(new AOP.OK(settings));
        }
    }
);






/**
 * @class 
 * @constructor
 * @private
 */
Sonoran.CLI.Commands.Bugz.LinesCommand = function(/** CLI.Shell */shell, /** String */name) {
    this.description = "Get source code. Specify optionally assembly name and filename.";
    this.asmSpec = new GetOpt.Simple("assembly", "Assembly specification such as logger-#.# or logger-1.0.25432");
    //this.asmOpt = new GetOpt.Option("a", "--assembly", 0, null, null, this.asmSpec);
    this.fileSpec = new GetOpt.FileSpec("filename", "File name such as blink.cs", undefined, false);
    //var optSet = new GetOpt.OptionSet([ this.asmOpt ]);
    var cmdSpec = new Sonoran.CLI.Spec(name, Sonoran.CLI.DST_ONE_CONN);
    Sonoran.CLI.Commands.Bugz.BaseCmd.call(this, shell, cmdSpec, [ this.asmSpec, this.fileSpec, new GetOpt.EndOfArgs() ], 1);
};

/** @private */
Sonoran.CLI.Commands.Bugz.LinesCommand.prototype = extend(
    Sonoran.CLI.Commands.Bugz.BaseCmd.prototype,
    {
        /** @private */
        exec: function(callback) {
            this.init(false, false);
            var asmIdentity = this.asmSpec.getArg();
            var file = this.fileSpec.getPath();
	    var connection = this.cmdSpec.connection;
            var arr = connection.sdxManager.lines(asmIdentity, file);
            callback(new AOP.OK(arr));
        }
    }
);






/**
 * @class 
 * @constructor
 * @private
 */
Sonoran.CLI.Commands.Bugz.ConfigureCommand = function(/** CLI.Shell */shell, /** String */name) {
    this.description =
        "Configure certain settings of the Bugz debugger. Without parameter, the current settings are listed.\n" +
        "'-s' switches on/off dumping events on interactive shells.";
    //this.radioSpec = new GetOpt.Keywords("off|query|continue", "off|query|continue", [ "off", "query", "continue" ]);
    //this.radioOpt = new GetOpt.Option("r", "--radio-device-update", 0, null, "Switch on querying the radio device state when 'rx-receive' is handled.", this.radioSpec);
    this.silentSpec = new GetOpt.Keywords("on|off", "on|off", [ "on", "off" ]);
    this.silentOpt = new GetOpt.Option("s", "--silent", 0, null, "Switch on/off dumping halt events on interactive shells.", this.silentSpec);
    this.searchSpec = new GetOpt.Simple("searchpath", "Additional search paths for moma-load etc.");
    this.optSet = new GetOpt.OptionSet([ this.silentOpt ]);
    Sonoran.CLI.Commands.Bugz.BaseCmd.call(this, shell, name, [ this.optSet, this.searchSpec ], 0);
};

/** @private */
Sonoran.CLI.Commands.Bugz.ConfigureCommand.prototype = extend(
    Sonoran.CLI.Commands.Bugz.BaseCmd.prototype,
    {
        /** @private */
        exec: function(callback) {
            //this.init(false, false);
            var settings = Bugz.getSettings();
            //if (this.radioOpt.isSet()) {
              //  settings.setQueryOnRadioRx(this.radioSpec.getSelectedKeywordIndex());
            //}
            if (this.silentOpt.isSet()) {
                var silent = this.silentSpec.getSelectedKeyword() == 'on';
                settings.setSilent(silent);
		//Event.Registry.setImmediateEnablement(!silent);
		//Event.ShellDump.setEnabled(!silent); //Registry.setImmediateEnablement(!silent);
            }
            var searchPath = this.searchSpec.getArg();
            if (searchPath) {
                Sonoran.MOMA.setSearchPaths(IO.FileUtils.parsePath(searchPath));
                settings.setSearchPath(searchPath);
            }
            callback(new AOP.OK(settings));
        }
    }
);







/**
 * @class 
 * @constructor
 * @private
 */
Sonoran.CLI.Commands.Bugz.BreakSetCommand = function(/** CLI.Shell */shell, /** String */name) {
    this.description =
        "Define a breakpoint. Without parameter, lists all break-points.\n" +
	"Otherwise, requires the specification of an assembly name and a code location (file:line).\n" +
        "The break-point is installed on all motes which have this assembly installed.\n" +
        "The break-point is also installed whenever the assembly is installed on a new mote.\n" +
        "If bugz-files was used before, the specification of the line number is sufficient.\n" +
        "Example: b-b-s blink-cs-#.# blink.cs:63\n";
    this.asmSpec = new GetOpt.Simple("assembly", "Assembly specification such as logger-#.# or logger-1.0.25432");
    this.locSpec = new GetOpt.Simple("location", "File:Line");
    var cmdSpec = new Sonoran.CLI.Spec(name, Sonoran.CLI.DST_ANY_MOTE);
    Sonoran.CLI.Commands.Bugz.BaseCmd.call(this, shell, cmdSpec, [ this.asmSpec, this.locSpec, new GetOpt.EndOfArgs() ], 0);
};

/** @private */
Sonoran.CLI.Commands.Bugz.BreakSetCommand.prototype = extend(
    Sonoran.CLI.Commands.Bugz.BaseCmd.prototype,
    {
        /** @private */
        exec: function(callback) {
	    this.init(false, false);
	    if (!this.locSpec.getArg()) {
		callback(new AOP.OK(Bugz.getBreakpoints().getBreakList()));
	    } else {
		var asm = this.getAsmName();
		var loc = this.getCodeLoc();
		var bp = Bugz.getBreakpoints().addBP(asm, loc); 
		callback(new AOP.OK(bp));
	    }
        }
    }
);









/**
 * @class 
 * @constructor
 * @private
 */
Sonoran.CLI.Commands.Bugz.WatchSetCommand = function(/** CLI.Shell */shell, /** String */name) {
    this.description =
        "Define a watch-point. If no expression is given, the list of wtch points is returned.\n" +
	"If an expression is specified, it must lead to the memory\n" +
        "location to watch (e.g. a[1].field or logger-#.#.fieldname).\n" +
	"By default, the watch-point is set on all motes specified on the command line.\n" +
	"If a code location is specified (file:line), an assembly must be specified, too, and\n" +
	"a break-point is then associated with the watch-point. When the break-point is hit on a mote, the\n" +
	"watch-point is set on the mote.\n" +
        "If bugz-files was used before, the specification of the line number is sufficient.\n" +
        "Examples:\n" + 
	"b-w-s -a blink-cs-#.# -l 133 Blink.ba[0-10]\n" +
	"b-w-s -a blink-cs-#.# Blink.ba[0-10]\n" +
	"a0 b-w-s Blink.ba[0-10]\n";
    this.asmSpec = new GetOpt.Simple("assembly", "Assembly specification such as logger-#.# or logger-1.0.25432");
    this.asmOpt = new GetOpt.Option("a", "--assembly", 0, null, null, this.asmSpec);
    this.locSpec = new GetOpt.Simple("location", "File:Line");
    this.locOpt = new GetOpt.Option("l", "--location", 0, null, null, this.locSpec);
    var optSet = new GetOpt.OptionSet([ this.asmOpt, this.locOpt ]);
    this.exprSpec = new GetOpt.Simple("expression", "Variable access expression");
    var cmdSpec = new Sonoran.CLI.Spec(name, Sonoran.CLI.DST_ANY_MOTE);
    Sonoran.CLI.Commands.Bugz.BaseCmd.call(this, shell, cmdSpec, [ optSet, this.exprSpec, new GetOpt.EndOfArgs() ], 0);
};

/** @private */
Sonoran.CLI.Commands.Bugz.WatchSetCommand.prototype = extend(
    Sonoran.CLI.Commands.Bugz.BaseCmd.prototype,
    {
        /** @private */
        exec: function(callback) {
            this.init(false, false);
	    if (this.exprSpec.getArg() === null) {
		callback(new AOP.OK(Bugz.getBreakpoints().getWatchList()));
	    } else {
		var motes = this.cmdSpec.motes;
		var loc = this.locOpt.isSet() ? this.getCodeLoc() : null;
		var asm = this.asmOpt.isSet() ? this.getAsmName() : null;
		var expr = this.exprSpec.getArg();
		//var onCurrent = this.currentOpt.isSet();
		//var wp = Bugz.getBreakpoints().addWP(asm, loc, expr, onCurrent, motes);
		var wp = Bugz.getBreakpoints().addWP(expr, motes, asm, loc);
		callback(new AOP.OK(wp));
	    }
        }
    }
);







/**
 * @class 
 * @constructor
 * @private
 */
Sonoran.CLI.Commands.Bugz.BreakDeleteCommand = function(/** CLI.Shell */shell, /** String */name) {
    this.description =
        "Delete break-/watch-point. It is deleted from all motes it is currently set\n" +
        "on and removed from the list of break-/watch-points. If no break/watch id is\n" +
	"given, all break-/watch-points are removed.";
    this.idSpec = new GetOpt.Number("id", "Breakpoint/Watchpoint id.", null, null);
    this.idSpec.setRange(-1, 1, 1024);
    Sonoran.CLI.Commands.Bugz.BaseCmd.call(this, shell, name, [ this.idSpec, new GetOpt.EndOfArgs()  ], 1);
};

/** @private */
Sonoran.CLI.Commands.Bugz.BreakDeleteCommand.prototype = extend(
    Sonoran.CLI.Commands.Bugz.BaseCmd.prototype,
    {
        /** @private */
        exec: function(callback) {
	    var id = this.idSpec.getNumber();
	    Bugz.getBreakpoints().delP(id);
	    callback(new AOP.OK());
        }
    }
);





/**
 * @class 
 * @constructor
 * @private
 */
Sonoran.CLI.Commands.Bugz.BreakToggleCommand = function(/** CLI.Shell */shell, /** String */name) {
    this.description =
        "Enable/Disable break-/watch-point on motes.\n" +
        "By default, the break-/watch-point is enabled/disabled on the specified motes.\n" +
        "If no mote is specified, the break-/watch-point is enabled/disabled on all motes with the assembly installed.\n" +
        "-f on|off switches on/off the setting of the breakpoint on a new upload and an asm-loaded halt event.";
    this.dynamicOpt = new GetOpt.Option("f", "--future", 0, null, null);
    var optSet = new GetOpt.OptionSet([ this.dynamicOpt ]);
    this.idSpec = new GetOpt.Number("breakid", "Breakpoint id.", null, null);
    this.modeSpec = new GetOpt.Keywords(null, "enable|disable", [ "enable", "disable" ]);
    var cmdSpec = new Sonoran.CLI.Spec(name, Sonoran.CLI.DST_ANY_MOTE);
    Sonoran.CLI.Commands.Bugz.BaseCmd.call(this, shell, cmdSpec, [ optSet, this.idSpec, this.modeSpec, new GetOpt.EndOfArgs() ]);
};

/** @private */
Sonoran.CLI.Commands.Bugz.BreakToggleCommand.prototype = extend(
    Sonoran.CLI.Commands.Bugz.BaseCmd.prototype,
    {
        /** @private */
        exec: function(callback) {
            this.init(false, false);
            var motes = this.cmdSpec.motes;
            var bid = this.idSpec.getNumber();
            var mode = (this.modeSpec.getSelectedKeyword() === "enable");
            if (this.dynamicOpt.isSet()) {
                Bugz.getBreakpoints().configureBP(bid, mode);
            } else {
                Bugz.getBreakpoints().toggleBP(bid, motes, mode);
            }
            callback(new AOP.OK(Bugz.getBreakpoints().getBreakList()));
        }
    }
);





// /**
//  *  @class 
//  * @constructor
//  * @private
//  */
// Sonoran.CLI.Commands.Bugz.BreakListCommand = function(/** CLI.Shell */shell, /** String */name) {
//     this.description = "List all break-/watch-points.";
//     Sonoran.CLI.Commands.Bugz.BaseCmd.call(this, shell, name);
// };

// /** @private */
// Sonoran.CLI.Commands.Bugz.BreakListCommand.prototype = extend(
//     Sonoran.CLI.Commands.Bugz.BaseCmd.prototype,
//     {
//         /** @private */
//         exec: function(callback) {
//             callback(new AOP.OK(Bugz.getBreakpoints().getBreakList()));
//         }
//     }
// );



// /**
//  *  @class 
//  * @constructor
//  * @private
//  */
// Sonoran.CLI.Commands.Bugz.BreakInfoCommand = function(/** CLI.Shell */shell, /** String */name) {
//     this.description = "Print break-/watch-point info.";
//     this.idSpec = new GetOpt.Number("breakid", "Breakpoint id.", null, null);
//     this.idSpec.setRange(1, 1, 1024);
//     Sonoran.CLI.Commands.Bugz.BaseCmd.call(this, shell, name, [ this.idSpec, new GetOpt.EndOfArgs()  ]);
// };

// /** @private */
// Sonoran.CLI.Commands.Bugz.BreakInfoCommand.prototype = extend(
//     Sonoran.CLI.Commands.Bugz.BaseCmd.prototype,
//     {
//         /** @private */
//         exec: function(callback) {
//             this.init(false, false);
//             var p = Bugz.getBreakpoints().getP(this.idSpec.getNumber());
//             callback(new AOP.OK(p));
//         }
//     }
// );







/**
 * @class 
 * @constructor
 * @private
 */
Sonoran.CLI.Commands.Bugz.HaltOnCommand = function(/** CLI.Shell */shell, /** String */name) {
    this.description =
        "Lists the halt conditions for a mote. If halt conditions are specified, the current conditions\n" +
        "on all or the selected motes are overwritten.\n" +
        "-d allows to manipulate the halt conditions for motes created in the future.";
    this.resetOpt = new GetOpt.Option(null, "--reset", 0, null, "Reset halt conditions to defaults.");
    this.dynamicOpt = new GetOpt.Option("d", "--dynamic", 0, null, "Define halt conditions for future motes.");
    var optSet = new GetOpt.OptionSet([ this.resetOpt, this.dynamicOpt ]);
    var cmdSpec = new Sonoran.CLI.Spec(name, Sonoran.CLI.DST_ANY_MOTE, [ 'saguaro' ]);
    this.restOfArgs = new GetOpt.RestOfArgs("...", "<category>:<evname> [0|1] ...");
    Sonoran.CLI.Commands.Bugz.BaseCmd.call(this, shell, cmdSpec, [ optSet, this.restOfArgs ]);
};

/** @private */
Sonoran.CLI.Commands.Bugz.HaltOnCommand.prototype = extend(
    Sonoran.CLI.Commands.Bugz.BaseCmd.prototype,
    {
        /** @private */
        exec: function(callback) {
            //this.init(false, false);
            var motes = this.cmdSpec.motes;

	    if (this.resetOpt.isSet()) {
                Saguaro.Options.setHaltConditions(Saguaro.DFLT_HALT_CONDITIONS, true, SCB);
                Bugz.getSettings().setHaltConditions(Saguaro.Options.getHaltConditionsAsMap());
		callback(new AOP.OK());
		return;
	    } 

	    var conditions = null;
	    var roa = this.restOfArgs.getRestArgs();
	    if (roa.length > 0) {
		if (roa.length%2!==0) {
		    callback(new AOP.ERR("Invalid number of halt condition parameters"));
		    return;
		}
		conditions = {};
		for (var i = 0; i < roa.length; i+= 2) {
		    var c = roa[i];    // XXX: check c???
		    var v = roa[i+1];
		    v = (v === "1") ? 1 : ((v === "0") ? 0 : undefined);
		    if (v===undefined) {
			callback(new AOP.ERR(sprintf("Expected 0 or 1 instead of '%s'", roa[i+1])));
			return;
		    }
		    conditions[c] = v;
		}
	    }
            if (this.dynamicOpt.isSet()) {
		if (!conditions) {
		    callback(new AOP.ERR("Missing halt condition parameters"));
		    return;
		}
                Saguaro.Options.setHaltConditions(conditions, false, SCB);
                Bugz.getSettings().setHaltConditions(Saguaro.Options.getHaltConditionsAsMap());
                conditions = null;
            } 
            if (motes.length==0) {
                motes = Saguaro.getSaguaroMotes();
            }
            var entries = motes.map(function(mote) {
		var impl = Saguaro.mote2impl(mote);
		if (conditions) {
		    var result = impl.programHaltConditions(conditions, SCB);
		    if (result.code != 0) {
			throw sprintf("Cannot set halt-condition on mote %s: %s", mote.getUniqueid(), result);
		    }
		}
		return new Bugz.HaltCondition(mote, impl.getHaltConditions());
	    });
            callback(new AOP.OK(entries));
        }
    }
);





/**
 *  @class 
 * @constructor
 * @private
 */
Sonoran.CLI.Commands.Bugz.StepOverCommand = function(/** CLI.Shell */shell, /** String */name) {
    this.description = "Continue until next line is reached. Skip method invocations in between.";
    this.ignoreOpt = new GetOpt.Option("i", "--ignore-other-motes", 0, null, "Ignore breakpoints hit on other motes.");
    this.optSet = new GetOpt.OptionSet([ this.ignoreOpt ]);
    Sonoran.CLI.Commands.Bugz.BaseCmd.call(this, shell, name, [ this.optSet, new GetOpt.EndOfArgs() ]);
};

/** @private */
Sonoran.CLI.Commands.Bugz.StepOverCommand.prototype = extend(
    Sonoran.CLI.Commands.Bugz.BaseCmd.prototype,
    {
        /** @private */
        exec: function(callback) {
            this.init(false, true);
            Bugz.createStepper(Bugz.Step.OVER, this.ignoreOpt.isSet(), callback);
        }
    }
);




/**
 *  @class 
 * @constructor
 * @private
 */
Sonoran.CLI.Commands.Bugz.StepIntoCommand = function(/** CLI.Shell */shell, /** String */name) {
    this.description = "Continue until next line is reached. Break at any method invocation.";
    this.ignoreOpt = new GetOpt.Option("i", "--ignore-other-motes", 0, null, "Ignore breakpoints hit on other motes.");
    this.optSet = new GetOpt.OptionSet([ this.ignoreOpt ]);
    Sonoran.CLI.Commands.Bugz.BaseCmd.call(this, shell, name, [ this.optSet, new GetOpt.EndOfArgs() ]);
};

/** @private */
Sonoran.CLI.Commands.Bugz.StepIntoCommand.prototype = extend(
    Sonoran.CLI.Commands.Bugz.BaseCmd.prototype,
    {
        /** @private */
        exec: function(callback) {
            this.init(false, true);
            Bugz.createStepper(Bugz.Step.INTO, this.ignoreOpt.isSet(), callback);
        }
    }
);


/**
 *  @class 
 * @constructor
 * @private
 */
Sonoran.CLI.Commands.Bugz.StepOutCommand = function(/** CLI.Shell */shell, /** String */name) {
    this.description = "Continue until next line is reached. Break at any method invocation.";
    this.ignoreOpt = new GetOpt.Option("i", "--ignore-other-motes", 0, null, "Ignore breakpoints hit on other motes.");
    this.optSet = new GetOpt.OptionSet([ this.ignoreOpt ]);
    Sonoran.CLI.Commands.Bugz.BaseCmd.call(this, shell, name, [ this.optSet, new GetOpt.EndOfArgs() ]);
};

/** @private */
Sonoran.CLI.Commands.Bugz.StepOutCommand.prototype = extend(
    Sonoran.CLI.Commands.Bugz.BaseCmd.prototype,
    {
        /** @private */
        exec: function(callback) {
            this.init(false, true);
            Bugz.createStepper(Bugz.Step.OUT, this.ignoreOpt.isSet(), callback);
        }
    }
);





/**
 *  @class 
 * @constructor
 * @private
 */
Sonoran.CLI.Commands.Bugz.ResumeCommand = function(/** CLI.Shell */shell, /** String */name) {
    this.description = "Continue halted simulation.";
    this.ignoreOpt = new GetOpt.Option("i", "--ignore-other-motes", 0, null, "Ignore breakpoints hit on other motes.");
    this.optSet = new GetOpt.OptionSet([ this.ignoreOpt ]);
    Sonoran.CLI.Commands.Bugz.BaseCmd.call(this, shell, name, [ this.optSet, new GetOpt.EndOfArgs() ]);
};

/** @private */
Sonoran.CLI.Commands.Bugz.ResumeCommand.prototype = extend(
    Sonoran.CLI.Commands.Bugz.BaseCmd.prototype,
    {
        /** @private */
        exec: function(callback) {
            this.init(false, false);
	    if (Bugz.getHaltedMote()) {
		Bugz.createStepper(Bugz.Step.RESUME, this.ignoreOpt.isSet(), callback);
	    } else {
		Bugz.continueAll(callback);
	    }
        }
    }
);





/**
 *  @class 
 * @constructor
 * @private
 */
Sonoran.CLI.Commands.Bugz.PrintCommand = function(/** CLI.Shell */shell, /** String */name) {
    this.description =
        "Evaluate and expression and print the resulting value:\n"  +
        "b-p Blink.field1                          Prints a static field of a class Blink\n" +
        "b-p local                                 Print a local variable\n" +
        "b-p local.object.field                    Follow an object graph and print field" +
        "b-p array[1]                              Print first element of array\n" +
        "b-p array[1-3]                            Print three elements starting with first including third element\n" +
        "b-p array[1-]                             Print from first until last\n";
    this.fmtSpec = new GetOpt.Simple('format', "%x|%d..");
    this.exprSpec = new GetOpt.Simple("Expression");
    var cmdSpec = new Sonoran.CLI.Spec(name, Sonoran.CLI.DST_ANY_MOTE);
    Sonoran.CLI.Commands.Bugz.BaseCmd.call(this, shell, cmdSpec, [ this.fmtSpec, this.exprSpec, new GetOpt.EndOfArgs() ], 1);
};

/** @private */
Sonoran.CLI.Commands.Bugz.PrintCommand.prototype = extend(
    Sonoran.CLI.Commands.Bugz.BaseCmd.prototype,
    {
        /** @private */
        exec: function(callback) {
            this.init(false, false);
            var motes = this.getAnyMotes();
            assert(motes);
            var fmt = this.fmtSpec.getArg();
            var expr = this.exprSpec.getArg();
            if (!expr) {
                expr = fmt;
                fmt = undefined;
            }
            var txt = "";
            var cache = Bugz.getCache();
            for (var i = 0; i < motes.length; i++) {
                var result = cache.getStack(motes[i]);
                var stack = result.code==0 ? result.getData() : null;
                var inspector = new Bugz.Inspector(motes[i], stack);
		var slots = inspector.resolveSlots(expr);
                if (slots.length == 0) {
                    txt += sprintf("Expression could not be resolved: '%s'\n", expr);
                } else {
                    txt += slots.map(function(s) { return s.print(fmt); }).join("\n");
                }
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
Sonoran.CLI.Commands.Bugz.ResolveCommand = function(/** CLI.Shell */shell, /** String */name) {
    this.description =
        "Evaluate and expression and print the resulting value:\n"  +
        "b-p Blink.field1                          Prints a static field of a class Blink\n" +
        "b-p local                                 Print a local variable\n" +
        "b-p local.object.field                    Follow an object graph and print field" +
        "b-p array[1]                              Print first element of array\n" +
        "b-p array[1-3]                            Print three elements starting with first including third element\n" +
        "b-p array[1-]                             Print from first until last\n";
    this.delOpt = new GetOpt.Option("d", "--del", 0, null, null);
    var optSet = new GetOpt.OptionSet([ this.delOpt ]);
    this.exprSpec = new GetOpt.Simple("Expression");
    var cmdSpec = new Sonoran.CLI.Spec(name, Sonoran.CLI.DST_ONE_MOTE);
    Sonoran.CLI.Commands.Bugz.BaseCmd.call(this, shell, cmdSpec, [ optSet, this.exprSpec, new GetOpt.EndOfArgs() ], 1);
};

/** @private */
Sonoran.CLI.Commands.Bugz.ResolveCommand.prototype = extend(
    Sonoran.CLI.Commands.Bugz.BaseCmd.prototype,
    {
        /** @private */
        exec: function(callback) {
            this.init(false, false);
            var mote = this.cmdSpec.getMote();
            assert(mote);
            var expr = this.exprSpec.getArg();
            var cache = Bugz.getCache();
            var result = cache.getStack(mote);
            var stack = result.code==0 ? result.getData() : null;
            var inspector = new Bugz.Inspector(mote, stack);
            if (this.delOpt.isSet()) {
		var di = inspector.resolveDelegate(expr);
		callback(new AOP.OK(di));
		return;
	    }
            var slots = inspector.resolveSlots(expr);
            if (slots.length>1) {
                throw "Ambigous path: " + expr;
            }
            callback(new AOP.OK(slots[0]));
        }
    }
);





/**
 *  @class 
 * @constructor
 * @private
 */
Sonoran.CLI.Commands.Bugz.DumpStackCommand = function(/** CLI.Shell */shell, /** String */name) {
    this.description = "Dump mote stacks.";
    var cmdSpec = new Sonoran.CLI.Spec(name, Sonoran.CLI.DST_MANY_MOTES, [ 'saguaro' ]);
    CLI.Command.call(this, shell, cmdSpec);
};

/** @private */
Sonoran.CLI.Commands.Bugz.DumpStackCommand.prototype = extend(
    Sonoran.CLI.Commands.Bugz.BaseCmd.prototype,
    {
        /** @private */
        exec: function(callback) {
            this.init(true, false);
	    var motes = this.cmdSpec.motes;
            var stackMap = Bugz.getCache().getStacks(motes);
            callback(new AOP.OK(stackMap));
        }
    }
);





/**
 * @class 
 * @constructor
 * @private
 */
Sonoran.CLI.Commands.Bugz.DumpFrameCommand = function(/** CLI.Shell */shell, /** String */name) {
    this.description = "Dump mote frames.";
    this.idxSpec = new GetOpt.Number("frameidx", "Frame number, 0 is current frame.", null, null);
    this.idxSpec.setRange(0, 0, 32);
    this.idxOpt = new GetOpt.Option("i", "--index", 0, null, null, this.idxSpec);
    var optSet = new GetOpt.OptionSet([ this.idxOpt ]);
    var cmdSpec = new Sonoran.CLI.Spec(name, Sonoran.CLI.DST_MANY_MOTES, [ 'saguaro' ]);
    CLI.Command.call(this, shell, cmdSpec);
};

/** @private */
Sonoran.CLI.Commands.Bugz.DumpFrameCommand.prototype = extend(
    Sonoran.CLI.Commands.Bugz.BaseCmd.prototype,
    {
        /** @private */
        exec: function(callback) {
            this.init(true, false);
            var _this = this;
            var motes = this.cmdSpec.motes;
            var idx = this.idxSpec.getNumber();
            var stackMap = Bugz.getCache().getStacks(motes);
            
            var results = [];
            for (var i = 0; i < motes.length; i++) {
                var result = stackMap.getResult(motes[i].getUniqueid());
                if (result.code != 0) {
                    results.push(result);
                } else {
                    var stack = result.getData();
                    var frame = stack.getFrame(idx);
                    if (!frame) {
                        results.push(new AOP.ERR(motes[i] + ": has no frame with index " + idx));
                    } else {
                        results.push(new AOP.OK(frame));
                    }
                }
            }
            callback(new AOP.OK(new Bugz.Uniqueid2Result(motes, results)));
        }
    }
);




/**
 * @class 
 * @constructor
 * @private
 */
Sonoran.CLI.Commands.Bugz.DumpClassCommand = function(/** CLI.Shell */shell, /** String */name) {
    this.description = "Dump class information.";
    this.asmSpec = new GetOpt.Simple("assembly", "Assembly specification such as logger-#.# or logger-1.0.25432");
    this.asmOpt = new GetOpt.Option("a", "--assembly", 0, null, null, this.asmSpec);
    var optSet = new GetOpt.OptionSet([ this.asmOpt ]);
    this.nameSpec = new GetOpt.Simple("classname", "Class name.");
    var cmdSpec = new Sonoran.CLI.Spec(name, Sonoran.CLI.DST_ANY_MOTE);
    Sonoran.CLI.Commands.Bugz.BaseCmd.call(this, shell, cmdSpec, [ optSet, this.nameSpec, new GetOpt.EndOfArgs() ]);
};

/** @private */
Sonoran.CLI.Commands.Bugz.DumpClassCommand.prototype = extend(
    Sonoran.CLI.Commands.Bugz.BaseCmd.prototype,
    {
        /** @private */
        exec: function(callback) {
            this.init(false, false);
            var motes = this.getAnyMotes();
            var name = this.nameSpec.getArg();
            var asm;
            if (this.asmOpt.isSet()) {
                asm = this.getAsmName();
            }
            var clazzes = Bugz.getCache().loadClasses(name, asm, motes[0]);
            if (clazzes.length==0) {
                callback(new AOP.ERR("No classes found for name: " + name));
                return;
            } 
            callback(new AOP.OK(clazzes));
        }
    }
);



CLI.commandFactory.addModule("Sonoran.CLI.Commands.Bugz", true);











