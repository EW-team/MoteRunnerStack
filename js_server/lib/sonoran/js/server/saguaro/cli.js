//  (C) COPYRIGHT INTERNATIONAL BUSINESS MACHINES CORPORATION 2006-2010
//                       ALL RIGHTS RESERVED
//        IBM Research Division, Zurich Research Laboratory
// --------------------------------------------------------------------



//---------------------------------------------------------------------------------------------------------------
//
// Saguaro Commands
//
//---------------------------------------------------------------------------------------------------------------

/**
 * Saguaro commands.
 * @class
 * @private
 */
Sonoran.CLI.Commands.Saguaro = {};


/**
 *  @class 
 * @constructor
 * @private
 */
Sonoran.CLI.Commands.Saguaro.StartCommand = function(shell, name) {
    this.description =
        "Start and connect to a saguaro process on localhost, by default on port 44044.\n" +
        "Any existing saguaro process on this port is terminated.\n" +
        "Examples:\n" +
        "saguaro-start -h localhost:44044\n" +
        "saguaro-start -h 44045\n";
    this.hostSpec = new GetOpt.HostPortSpec(Saguaro.DFLT_PORT, Saguaro.DFLT_HOST);
    this.hostOpt =  new GetOpt.Option("h", "--host", 0, null, "host:port, by default localhost:44044", this.hostSpec);
    var optSet = new GetOpt.OptionSet([ this.hostOpt ]);
    CLI.Command.call(this, shell, name, [ optSet, new GetOpt.EndOfArgs() ]);
};

/** @private */
Sonoran.CLI.Commands.Saguaro.StartCommand.prototype = extend(
    CLI.Command.prototype,
    {
        /** @private */
        exec: function(callback) {
	    var port = this.hostSpec.getPort();
	    if (this.hostOpt.isSet()) {
	        if (this.hostSpec.getHost() != Saguaro.DFLT_HOST) {
	            callback(new AOP.ERR("Remote host specification not yet supported."));
	            return;
	        }
	    }
            Saguaro.startProcess(port, callback);
        }
    }
);




/**
 *  @class 
 * @constructor
 * @private
 */
Sonoran.CLI.Commands.Saguaro.QuitCommand = function(shell, name) {
    this.description =
        "Quit a connected saguaro process by sending it an 'exit' message. Example: 'a sag-quit'.";
    var cmdSpec = new Sonoran.CLI.Spec(name, Sonoran.CLI.DST_ZERO_OR_ONE_CONN);
    CLI.Command.call(this, shell, cmdSpec);
};

/** @private */
Sonoran.CLI.Commands.Saguaro.QuitCommand.prototype = extend(
    CLI.Command.prototype,
    {
        /** @private */
        exec: function(callback) {
	    var conn = this.cmdSpec.getConnection();
	    var _this = this;
            if (!conn) {
                callback(new AOP.ERR("No connection specified"));
                return;
            }
	    conn.exit(function(r) {
	        if (r.code !== 0) {
	            callback(new AOP.ERR("Command failed: " + r.toString()));
	        } else {
	            conn.close(function(resp) { callback(new AOP.OK(sprintf("Connection %s terminated", conn))); });
	        }
	    });
        }
    }
);




/**
 *  @class 
 * @constructor
 * @private
 */
Sonoran.CLI.Commands.Saguaro.HaltCommand = function(shell, name) {
    this.description = "Halt a saguaro process for inspection. All motes go into BREAK state. Example: 'a sag-halt'.";
    var cmdSpec = new Sonoran.CLI.Spec(name, Sonoran.CLI.DST_ONE_CONN);
    CLI.Command.call(this, shell, cmdSpec);
};

/** @private */
Sonoran.CLI.Commands.Saguaro.HaltCommand.prototype = extend(
    CLI.Command.prototype,
    {
        /** @private */
        exec: function(callback) {
	    var conn = this.cmdSpec.getConnection();
	    var _this = this;
	    conn.haltCmd(callback);
        }
    }
);



/**
 *  @class 
 * @constructor
 * @private
 */
Sonoran.CLI.Commands.Saguaro.ContinueCommand = function(shell, name) {
    this.description = "Continue a halted saguaro process. Example: 'a sag-continue'.";
    this.untilSpec = new GetOpt.Number("until", "Milliseconds.");
    this.untilOpt = new GetOpt.Option("u", "--until", 0, null, null, this.untilSpec);
    this.modeSpec = new GetOpt.Keywords(null, "real-time|logic-time", [ "real-time", "logic-time" ]);
    this.modeOpt = new GetOpt.Option("m", "--mode", 0, null, null, this.modeSpec);
    var optSet = new GetOpt.OptionSet([ this.untilOpt, this.modeOpt ]);
    var cmdSpec = new Sonoran.CLI.Spec(name, Sonoran.CLI.DST_ONE_CONN);
    CLI.Command.call(this, shell, cmdSpec, [ optSet, new GetOpt.EndOfArgs() ]);
};

/** @private */
Sonoran.CLI.Commands.Saguaro.ContinueCommand.prototype = extend(
    CLI.Command.prototype,
    {
        /** @private */
        exec: function(callback) {
	    var conn = this.cmdSpec.getConnection();
	    var _this = this;
            var mode = this.modeOpt.isSet() ? this.modeSpec.getSelectedKeyword(): null;
            var until = this.untilOpt.isSet() ? this.untilSpec.getNumber(): null;
	    conn.continueCmd(mode, until, null, callback);
        }
    }
);



/**
 * @class 
 * @constructor
 * @private
 */
Sonoran.CLI.Commands.Saguaro.InfoCommand = function(shell, name) {
    this.description =
        "Print information about state of simulation processes.\n" +
        "If '-t' is specified, the current saguaro time of the selected connection is printed.\n" +
        "Otherwise the running state of the selected saguaro connection is printed.";
    this.timeOpt = new GetOpt.Option("t", "--time", 0, null, "Print current saguaro time");
    this.optSet = new GetOpt.OptionSet([ this.timeOpt ]);
    var cmdSpec = new Sonoran.CLI.Spec(name, Sonoran.CLI.DST_ZERO_OR_ONE_CONN);
    CLI.Command.call(this, shell, cmdSpec, [ this.optSet, new GetOpt.EndOfArgs() ]);
};

/** @private */
Sonoran.CLI.Commands.Saguaro.InfoCommand.prototype = extend(
    CLI.Command.prototype,
    {
        /** @private */
        exec: function(callback) {
	    var connection = this.cmdSpec.getConnection();
            if (this.timeOpt.isSet()) {
	        if (!connection) {
                    callback(new AOP.ERR("Missing connection specification"));
                    return;
                }
                var _this = this;
	        connection.timeCmd(function(r) {
	            if (r.code != 0) {
	                callback(new AOP.ERR("Command failed: " + r.toString()));
	            } else {
			var data = r.getData().getReplyData();
	                var time = data.time;
	                var txt = Util.nanos2str(time);
                        callback(new AOP.OK(txt));
                    }
	        });
                return;
            }
            if (!connection) {
                callback(new AOP.OK(new Saguaro.Info(null, null, null, null)));
            } else {
                connection.infoCmd(callback);
            }
        }
    }
);




/**
 * @class 
 * @constructor
 * @private
 */
Sonoran.CLI.Commands.Saguaro.CmdCommand = function(shell, name) {
    this.description =
        "Issue a saguaro command to a saguaro process. Example:\n" +
        "a saguaro-cmd help";
    this.restOfArgs = new GetOpt.RestOfArgs("cmdline", "Command line for saguaro process");
    var cmdSpec = new Sonoran.CLI.Spec(name, Sonoran.CLI.DST_ONE_CONN);
    CLI.Command.call(this, shell, cmdSpec, [ this.restOfArgs ]);
};

/** @private */
Sonoran.CLI.Commands.Saguaro.CmdCommand.prototype = extend(
    CLI.Command.prototype,
    {
        /** @private */
        exec: function(callback) {
	    // XXX: add code to send mote-specific commands to motes listed on command line 
	    var conn = this.cmdSpec.getConnection();
	    var ra = this.restOfArgs.getRestArgs();
            conn.argvCmd(ra, callback);
        }
    }
);



/**
 * @class 
 * @constructor
 * @private
 */
Sonoran.CLI.Commands.Saguaro.EvListCommand = function(shell, name) {
    this.description =
        "List recorded saguaro events.\n";
    this.startArg = new GetOpt.Number("num", "Start event number. Oldest event if omitted.");
    this.startOpt = new GetOpt.Option("s", "--start", 0, null, null, this.startArg);
    this.endArg   = new GetOpt.Number("num", "End event number. Newest event if omitted.");
    this.endOpt   = new GetOpt.Option("e", "--end", 0, null, null, this.endArg);
    this.numArg   = new GetOpt.Number("num", "Number of events to display.");
    this.numOpt   = new GetOpt.Option("n", "--num", 0, null, null, this.numArg);
    var optSet = new GetOpt.OptionSet([ this.startOpt, this.endOpt, this.numOpt ]);
    var cmdSpec = new Sonoran.CLI.Spec(name, Sonoran.CLI.DST_ONE_CONN);
    CLI.Command.call(this, shell, cmdSpec, [ optSet, new GetOpt.EndOfArgs() ]);
};

/** @private */
Sonoran.CLI.Commands.Saguaro.EvListCommand.prototype = extend(
    CLI.Command.prototype,
    {
        /** @private */
        exec: function(callback) {
	    var conn = this.cmdSpec.getConnection();
	    conn.evList(this.startOpt.isSet() ? this.startArg.getNumber() : null,
			this.endOpt.isSet()   ? this.endArg.getNumber()   : null,
			this.numOpt.isSet()   ? this.numArg.getNumber()   : null,
			callback);
        }
    }
);


/**
 * @class 
 * @constructor
 * @private
 */
Sonoran.CLI.Commands.Saguaro.EvConfigCommand = function(shell, name) {
    this.description =
        "Configure simulation events to log/halt/record it's occurrences.";
    this.restOfArgs = new GetOpt.RestOfArgs("category{:evname,..}{[+-=][RLH]}",
					    "Change flag settings of a category or events in a category.\n"+
					    "If no event names are listed then apply to all events\n"+
					    "in the specified category. If no operators present then\n"+
					    "list the settings of the category and the optional events.\n"+
					    "The meaning of the operators and flags are:\n"+
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
					    "  vm:vmStart,vmExit list settings of specfic events in category 'vm'\n"+
					    "");
    var cmdSpec = new Sonoran.CLI.Spec(name, Sonoran.CLI.DST_MANY_MOTES);
    CLI.Command.call(this, shell, cmdSpec, [ this.restOfArgs ]);
};

/** @private */
Sonoran.CLI.Commands.Saguaro.EvConfigCommand.prototype = extend(
    CLI.Command.prototype,
    {
        /** @private */
        exec: function(callback) {
	    var conn = null;
	    var motes = this.cmdSpec.getMotes();
	    var moteids = [];
            for (var i = 0; i < motes.length; i++) {
		var mote = motes[i];
                if (mote.getClass() !== 'saguaro') {
                    callback(new AOP.ERR(sprintf("Command can only be applied to simulated motes: %s", mote)));
		    return;
		}
                var impl = Saguaro.mote2impl(motes[i]);
		var c = impl.getConnection();
		if( conn == null ) {
		    conn = c;
		} else {
		    if( conn !== c ) {
			callback(new AOP.ERR(sprintf("Command can only be applied to motes from one simulation: %s vs %s", conn, c)));
			return;
		    }
		}
		moteids.push(impl.getMoteId());
	    }
	    var defs = this.restOfArgs.getRestArgs();
	    var result = conn.evConfig(moteids, defs.length==0 ? null : defs, SCB);
	    if( result.isOK() ) {
		var t = "";
		var r = result.getData().getReplies();
		if( defs.length == 0 ) {
		    // Print available events and their current settings
		    for( var i=0; i<motes.length; i++ ) {
			assert(Saguaro.mote2impl(motes[i]).getMoteId()==r[i].moteid);
			t += sprintf("\n<mote#%d> - %s\n", r[i].moteid, motes[i]);
			var evcat = r[i].data;
			for( var ci=0; ci<evcat.length; ci++ ) {
			    var cat = evcat[ci];
			    t += sprintf("%s %s %s %s\n",
					 cat.name,
					 "________________________________".substring(0,21-cat.name.length),
					 cat.text,
					 "____________________________________________________________".substring(0,60-cat.text.length));
			    
			    var evl = cat.evlist;
			    for( var li=0; li<evl.length; li++ ) {
				var ev = evl[li];
				t += sprintf("     %s %-15s %s\n", ev.flags, ev.name, ev.text);
			    }
			}
		    }
		} else {
		    for( var ri=0; ri<defs.length; ri++ ) {
			var mixed = 0;
			var v1 = r[0].data[ri];     //
			for( var i=1; i<motes.length; i++ ) {
			    var vi = r[i].data[ri];
			    if( !mixed && v1 != vi ) {
				// mixed results
				mixed = 1;
				if( v1 != null )
				    t += sprintf("%s :: %s : %s\n", motes[0], defs[ri], v1);
			    }
			    if( mixed && vi != null )
				t += sprintf("%s :: %s : %s\n", motes[i], defs[ri], vi);
			}
			if( !mixed && v1 != null )
			    t += sprintf("%s : %s\n", defs[ri], vi);
		    }
		}
		result = new AOP.OK(t);
	    }
	    callback(result);
        }
    }
);






/**
 *  @class 
 * @constructor
 * @private
 */
Sonoran.CLI.Commands.Saguaro.ConnectCommand = function(shell, name) {
    this.description = "Connect to a saguaro process. Without any option, the command tries to\n" +
        "connect to the default saguaro port 44044";
    this.hostSpec = new GetOpt.HostPortSpec(44044, "localhost");
    this.hostOpt =  new GetOpt.Option("h", "--host", 0, null, null, this.hostSpec);
    var optSet = new GetOpt.OptionSet([ this.hostOpt ]);
    CLI.Command.call(this, shell, name, [ optSet, new GetOpt.EndOfArgs() ]);
};

/** @private */
Sonoran.CLI.Commands.Saguaro.ConnectCommand.prototype = extend(
    CLI.Command.prototype,
    {
        /** @private */
        exec: function(callback) {
	    var _this = this;
	    var host = this.hostSpec.host;
	    var port = this.hostSpec.port;
            Saguaro.connectProcess(host, port, function(status) {
                if (status.code != 0) {
                    callback(new AOP.ERR("Could not connect to saguaro process", status));
                } else {
                    callback(new AOP.OK());
                }
            });
        }
    }
);








CLI.commandFactory.addModule("Sonoran.CLI.Commands.Saguaro");

