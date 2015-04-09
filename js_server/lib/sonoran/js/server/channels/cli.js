//  (C) COPYRIGHT INTERNATIONAL BUSINESS MACHINES CORPORATION 2006-2010
//                       ALL RIGHTS RESERVED
//        IBM Research Division, Zurich Research Laboratory
// --------------------------------------------------------------------


/**
 * Name to use for Shell channel.
 * @type String
 * @private
 */
Channels.shellChannelName = "Shell";

/**
 * Name to use for Terminal channel.
 * @type String
 * @private
 */
Channels.terminalChannelName = "Terminal";



/**
 * Channels.CLIShell wraps a CLI.Shell to be accessible from a browser client
 * @class 
 * @augments CLI.Shell
 * @constructor
 * @private
 */
Channels.CLIShell  = function() {
    CLI.Shell.call(this, false);
};

/** Prototype */
Channels.CLIShell.prototype = extend(
    CLI.Shell.prototype,
    /** @lends Channels.CLIShell.prototype */
    {
        /**
         * Execute a line.
	 * @param channel   Channel
	 * @param tick      Sequence number from client
	 * @param line      Command line
	 * @param callback  Optional
	 * @private
         */
        execRemoteLine: function(/** Channels.Channel */channel, /** Number */tick, /** String */line, callback) {
            var _this = this;
            CLI.Shell.prototype.execLine.call(this, line, function(result) {
                var resp = new Channels.Response(tick, result, true);
                channel.push(resp);
                if (callback) {
                    callback(result);
                }
            });
        },
        

	/**
	 * A web shell has special mrshell commands.
	 */
	mrshellAOP: function(data) {
	    return new AOP.ERR(AOP.ERR.MRSHELL_ONLY,  // trigger interpretation of result data
			       // If called from non-web based shell this gets printed
			       "Command must be run in web based mrshell",
			       new AOP.Result(0),
			       data);
	},

        /**
         * @returns {String} string
	 * @private
         */
        toString: function() {
            return "Channels.CLIShell";
        },
        
        /**
	 * @param txt
	 * @private
         */
        println: function(/** String */txt) {},

        /**
	 * @param txt
	 * @private
         */
        print: function(/** String */txt) {},
        
        /**
         * Unsupported.
	 * @private
         */
        readln: function(callback) {
            QUACK(0, "Channels.CLIShell: readln not supported!");
            callback(new AOP.OK("Channels.CLIShell: readln not supported!"));
        }
    }
);



/**
 * Channels.CLITerminal wraps a CLI.Shell to be accessible from a browser client
 * @class 
 * @augments CLI.Shell
 * @constructor
 * @private
 */
Channels.CLITerminal  = function() {
    CLI.Shell.call(this, true);
    assert(this.inInteractiveMode == true);
    this.instr = this;
    this.outstr = this;
    this.logMark = Logger.HISTORY.getMarker();
    this.channel = null;
    this.tick = null;
};

/** Prototype */
Channels.CLITerminal.prototype = extend(
    CLI.Shell.prototype,
    /** @lends Channels.CLITerminal.prototype */
    {
        /**
         * Execute a line.
	 * @param channel   Channel
	 * @param tick      Sequence number from client
	 * @param line      Command line
	 * @param callback  Optional
	 * @private
         */
        execRemoteLine: function(/** Channels.Channel */channel, /** Number */tick, /** String */line, /** Function */callback) {
            this.channel = channel;
            this.tick = tick;
            var _this = this;
            CLI.Shell.prototype.execLine.call(this, line, function(result) {
                var message = (result.code != 0) ? result.toString() : result.getMessage();
                var resp1 = new Channels.Response(tick, new AOP.OK(message), false);

                Timer.timeoutIn(50, function() {
                    message = _this.getPostCommandMessage(_this.logMark);
                    _this.logMark = Logger.HISTORY.getMarker();
                    if (!message) {
                        resp1.finished = true;
                        channel.push(resp1);
                    } else {
                        channel.push(resp1);
                        var resp2 = new Channels.Response(tick, new AOP.OK(message), true);
                        channel.push(resp2);
                    }
                });
                
                if (callback) {
                    callback(result);
                }
            });
        },
        
        /** 
	 * Send result of operation to browser 
	 * @param result
	 * @private
	 */
        send: function(/** AOP.Result */result) {
            if (this.tick) {
                result.tick = this.tick;
                this.channel.push(result);
            }
        },
        
        /**
         * @returns {String} string
	 * @private
         */
        toString: function() {
            return "Channels.CLITerminal";
        },
        
        /**
         * Send text printed by command to browser
	 * @param txt
	 * @private
         */
        println: function(/** String */txt) {
            if (this.tick) {
                var resp = new Channels.Response(this.tick, new AOP.OK(txt), false);
                this.channel.push(resp);
            }
        },

        /**
         * Send text printed by command to browser
	 * @param txt
	 * @private
         */
        print: function(/** String */txt) {
            this.println(txt);
        },

        /**
         * @private
         */
        readln: function(/** DFLT_ASYNC_CB */callback) {
            QUACK(0, "Channels.CLITerminal: readln not supported!");
            callback(new AOP.OK(this, "Channels.CLITerminal: readln not supported!"));
        }
    }
);





Channels.Channel.extend(
    "Channels.CLIChannel",
    /**
     * @lends Channels.CLIChannel.prototype
     */
    {
    /**
     * A CLI channel forwards http client requests to a shell and signals the responses
     * back to the clients.
     * @augments Channels.Channel
     * @constructs
     * @param name
     * @param client
     * @private
     */
	__constr__: function(/** String */name, /** Channels.Client */client) {
	    assert(arguments.length===2);
	    Channels.Channel.call(this, name, client);
	    assert(this.name==Channels.shellChannelName || this.name==Channels.terminalChannelName);
	    this.shell = null;
	},

        /**
         * Return Channels.Shell or Channels.CLITerminal shell.
	 * @returns {Channels.CLIShell}
	 * @private
         */
        getShell: function() {
            if (!this.shell) {
                if (this.name == Channels.shellChannelName) {
                    this.shell = new Channels.CLIShell();
                } else {
                    this.shell = new Channels.CLITerminal(); 
                }
            }
            return this.shell;
        },

        
        /**
         * Called when channel is removed from session.
	 * @private
         */
        onClose: function() {
            QUACK(1, "Channels.CLIChannel.onClose: " + this);
            if (this.shell) {
                this.shell.close();
            }
        },


        /**
         * A http request on the shell channel from a client. Initiate the execution of the command
	 * by calling Channels.CLIShell.execLine or Channels.CLITerminal.execLine.
         * @param params      Request parameters
	 * @private
         */
        onRequest: function(/** Object */paras) {
            var line = paras['line'];
            if (line !== undefined) {
                line = HTTP.parseString(paras, "line", /^.+$/);
                var tick = HTTP.parseInt(paras, "tick");
                assert(paras['textMode'] === undefined);
                var shell = this.getShell();
                shell.execRemoteLine(this, tick, line);
                return null;
            }
            var paras = paras['paras'];
            if (paras) {
                paras = this.parseJSON(paras, "paras");
                if (!paras.length || paras.length==0) {
                    throw "Invalid 'paras' parameter: empty or not array";
                }
                for (var i = 0; i < paras.length; i++) {
                    if (!paras[i].channel && typeof(paras[i].channel) !== 'string') {
                        throw "Invalid 'paras' parameter: missing or invalid channel";
                    }
                    if (!paras[i].tick && typeof(paras[i].tick) !== 'number') {
                        throw "Invalid 'paras' parameter: missing or invalid tick";
                    }
                    if (!paras[i].line && typeof(paras[i].line) !== 'string') {
                        throw "Invalid 'paras' parameter: missing or invalid line";
                    }
                }
                var shell = this.getShell();
                var descrs = []; 
                for (var i = 0; i < paras.length; i++) {
                    var d = paras[i];
                    descrs.push(new Util.Execute.Descr(shell.execRemoteLine, shell, this, d.tick, d.line));
                }
                Util.Execute.OneByOne(descrs, function(result) {});
                return null;
            }
            throw "No such shell channel operation";
        }
    }
);




