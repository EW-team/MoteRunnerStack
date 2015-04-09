//  (C) COPYRIGHT INTERNATIONAL BUSINESS MACHINES CORPORATION 2006-2010
//                       ALL RIGHTS RESERVED
//        IBM Research Division, Zurich Research Laboratory
// --------------------------------------------------------------------



/**
 * @namespace CLI.Commands.Log
 * @private
 */
CLI.Commands.Log = {};


/**
 * @constant
 * @type String
 * @private
 */
CLI.Commands.Log.USAGE = "Control and output log messages.";

/**
 * @constant
 * @type String
 * @private
 */
CLI.Commands.Log.DESCRIPTION =
    "Log messages are buffered by the shell and can be controlled and viewed by various log commands.\n" +
    "Use 'log-config' to specify what kind of log messages at what severity level should be logged.\n" +
    "Use 'log-show' to view messages buffered by the shell and the log history.\n" +
    "Use 'log-info' to view statistics of the log buffer\n" +
    "Use 'log-message' to issue a log message from the command line.";



/**
 * Log config command.
 * @class 
 * @constructor
 * @param shell
 * @param name
 * @private
 */
CLI.Commands.Log.ConfigCommand = function(/** CLI.Shell */shell, /** String */name) {
    this.description =
        "Configure the output of log messages. 'log-config module level..' allows to specify the severity of a\n" +
        "message from a module at which it is logged. 'log-show' can be used to view log messages.\n"+
        "Additionally, -i can be used to specify the severity at which messages are also immediately\n"+
        "dumped on the terminal (by default, ERR level).\n" +
        "Use 'log-config ALL <level>' to specify a severity level for all modules.\n"+
        "Use 'log-config' to view the current settings.\n"+
        "Example: log-config HTTP DEBUG SONORAN INFO\n" +
        "         log-config ALL ERR\n" +
        "         log-config -i HTTP INFO\n" +
        "A list of modules and description:\n" +
        "SONORAN:          Messages from sonoran. Level DEBUG logs messages from/to motes.\n" +
        "EVENTS:           Log messages for Sonoran events. At level DEBUG, all events are logged.\n" +
        "GATEWAY:          Messages from Sonoran.Gateway and Sonoran.WLIP.Gateway.\n"+
        "HWPORT:           Messages related to serial and USB motes.\n"+
        "LIP:              LIP messages occuring in the simulation.\n" +
        "RADIO:            Radio messages occuring in the simulation.\n" +
        "MAPP:             Messages from mote applications.\n" +
        "MEDIA:            Media messages in the simulation.\n" +
        "CURRENT:          Messages regarding current and power Media messages in the simulation.\n" +
        "MOTE:             Messages from the simulation related to motes.\n" +
        "HAL:              Messages from the HAL implementations in the simulation.\n"+
        "IO:               Messages from the simulation related to IO.\n" +
        "HTTP:             Messages from the simulation related to HTTP.\n" +
        "THREAD:           Messages from the simulation related to threads.\n" +
        "VMDEBUG:          Messages from the simulation related to debugging.\n" +
        "DEVICE:           Messages related to mote devices.\n";
    this.immediateOpt = new GetOpt.Option("i", "--immediate", 0, null, "Dump immediately on standard out\n");
    this.optSet = new GetOpt.OptionSet([ this.immediateOpt ]);
    var modules = Logger.getModules();
    var severities = Logger.SEVERITIES;
    this.modSpec = new GetOpt.Keywords("module", "Module name: " + modules.join(','), modules, null, GetOpt.IGNORE_CASE);
    this.sevSpec = new GetOpt.Keywords("severity", "Severity name: " + severities.join(','), severities, null, GetOpt.IGNORE_CASE);
    this.seq = new GetOpt.Seq([ this.modSpec, this.sevSpec ], 2);
    this.set = new GetOpt.Set(this.seq, 0);
    CLI.Command.call(this, shell, name, [ this.optSet, this.set ]);
};

/** @private */
CLI.Commands.Log.ConfigCommand.prototype = extend(
    CLI.Command.prototype,
    {
        /** 
	 * @private 
	 */
        exec: function(callback) {
            var info = function() {
                var t = new Formatter.Table2(3);
                t.setTitle("Module", "Log Severity", "Immediate Severity");
                var logLevels = Logger.getLogLevels();
		var y = 0;
                for (var m in logLevels) {
	            var s = logLevels[m];
		    t.setValue(0, y, m);
		    t.setValue(1, y, Logger.severity2string(s));
		    t.setValue(2, y, Logger.severity2string(Logger.getImmediateLogSeverity(m)));
		    y += 1;
                }
	        return t.render().join("\n");
            };
	    var _this = this;
            var seqState = this.set.getState();
            if (seqState == null) {
                callback(new AOP.OK(info()));
                return;
            }
            var ldescr = [];
	    var modules = Logger.getModules();
	    var severities = Logger.SEVERITIES;
	    for (var i = 0; i < seqState.length; i++) {
                var setState = seqState[i];
                var modname = modules[setState[0].index];
                var sevname = severities[setState[1].index];
	        ldescr.push(modname, sevname);
            }
	    if (this.immediateOpt.isSet()) {
                this.shell.setEnableImmediateMessages(true);
	        for (var i = 0; i < ldescr.length; i += 2) {
	            Logger.setImmediateLogFilter(ldescr[i], Logger.severity2number(ldescr[i+1]));
	        }
	        ldescr = [];
	        var ll = Logger.getImmediateLogFilter(); 
	        for (var module in ll) {
	            var sev = ll[module];
	            if (sev > Logger.getLogLevels()[module]) {
		        ldescr.push(module);
		        ldescr.push(Logger.severity2string(sev));
	            }
	        }
	    }
	    if (ldescr.length==0) {
	        callback(new AOP.OK(info()));
	        return;
	    }
	    var cb = function(result) {
	        var txt = "";
	        if (result.code!=0) {
	            txt = "Setting log levels failed: " + result.toString() + "\n";
	        }
                txt += info();
	        callback(new AOP.OK(txt));
	    };
	    try {
	        Logger.setLogLevels2(ldescr, cb);
	    } catch(ex) {
	        callback(new Ex2ERR(ERR_GENERIC, ex));
	    }
        }
    }
);




/**
 *  @class 
 * @constructor
 * @param shell
 * @param name
 * @private
 */
CLI.Commands.Log.ShowCommand = function(/** CLI.Shell */shell, /** String */name) {
    this.description =
        "Show log messages. Without any parameter, all messages since the last time the command\n" +
        "was executed are shown.";
    this.cntSpec = new GetOpt.Number("count", "Number of messages to show", null, null);
    this.cntSpec.setRange(1, 1, 1024);
    this.cntOpt = new GetOpt.Option("c", "--cnt", 0, null, null, this.cntSpec);
    var modules = Logger.getModules();
    var severities = Logger.SEVERITIES;
    this.modSpec = new GetOpt.Keywords("module", "Module name: " + modules.join(','), modules, null, GetOpt.IGNORE_CASE);
    this.sevSpec = new GetOpt.Keywords("severity", "Severity name: " + severities.join(','), severities, null, GetOpt.IGNORE_CASE);
    this.seq = new GetOpt.Seq([ this.modSpec, this.sevSpec ], 2);
    this.set = new GetOpt.Set(this.seq, GetOpt.Set.STOP_AT_OPTION);
    this.logOpt = new GetOpt.Option("l", "--log", 0, null, "Module Severity ..", this.set);
    this.rstOpt = new GetOpt.Option("r", "--reset", 0, null, "Reset number of messages not seen yet");
    this.optSet = new GetOpt.OptionSet([ this.rstOpt, this.cntOpt, this.logOpt ]);
    CLI.Command.call(this, shell, name, [ this.optSet, new GetOpt.EndOfArgs() ], 0);
};

/** @private */
CLI.Commands.Log.ShowCommand.prototype = extend(
    CLI.Command.prototype,
    {
        /** 
	 * @private 
	 */
        exec: function(callback) {
	    if (this.rstOpt.isSet()) {
	        Logger.HISTORY.resetNotSeenCnt();
	    }
	    var ll = null;
            if (this.logOpt.isSet()) {
                var seqState = this.set.getState();
                if (seqState == null) {
                    callback(new AOP.ERR("Missing module severity .."));
                    return;
                }
		var modules = Logger.getModules();
		var severities = Logger.SEVERITIES;
                ll = {};
	        for (var i = 0; i < seqState.length; i++) {
                    var setState = seqState[i];
                    var modname = modules[setState[0].index];
                    var sevname = severities[setState[1].index];
	            var sevcode = Logger.severity2number(sevname);
	            Logger.setLogLevel(ll, modname, sevcode);
	        }
	    }
	    var cnt = this.cntOpt.isSet()?this.cntSpec.getNumber():undefined;
	    callback(new AOP.OK(Logger.HISTORY.getLog(cnt, ll)));
        }
    }
);







/**
 * @class 
 * @constructor
 * @param shell
 * @param name
 * @private
 */
CLI.Commands.Log.MessageCommand = function(/** CLI.Shell */shell, /** String */name) {
    this.description =
        "Log a message.";
    this.cntSpec = new GetOpt.Number("cnt", "Number of times to issue message");
    this.cntSpec.setRange(1, 1, 65536);
    this.cntOpt = new GetOpt.Option("c", "--cnt", 0, null, null, this.cntSpec);
    var optSet = new GetOpt.OptionSet([ this.cntOpt ]);
    var modules = Logger.getModules();
    var severities = Logger.SEVERITIES;
    this.modSpec = new GetOpt.Keywords("module", "Module name: " + modules.join(','), modules, null, GetOpt.IGNORE_CASE);
    this.sevSpec = new GetOpt.Keywords("severity", "Severity name: " + severities.join(','), severities, null, GetOpt.IGNORE_CASE);
    this.restOfArgs = new GetOpt.RestOfArgs("...", "Message to log.");
    CLI.Command.call(this, shell, name, [ optSet, this.modSpec, this.sevSpec, this.restOfArgs ]);
};

/** @private */
CLI.Commands.Log.MessageCommand.prototype = extend(
    CLI.Command.prototype,
    {
        /** @private */
        exec: function(callback) {
            var mod = this.modSpec.getSelectedKeyword();
            var sev = Logger.severity2number(this.sevSpec.getSelectedKeyword());
            var msg = this.restOfArgs.getRestArgs().join(' ');
            var cnt = this.cntSpec.getNumber();
            for (var i = 0; i < cnt; i++) {
                Logger.log(sev, mod, msg);
            }
	    callback(new AOP.OK());
        }
    }
);


CLI.commandFactory.addModule("CLI.Commands.Log");
