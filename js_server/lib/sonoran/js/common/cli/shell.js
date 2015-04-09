//  (C) COPYRIGHT INTERNATIONAL BUSINESS MACHINES CORPORATION 2006-2010
//                       ALL RIGHTS RESERVED
//        IBM Research Division, Zurich Research Laboratory
// --------------------------------------------------------------------


//---------------------------------------------------------------------------------------------------------------
//
// CLI.Shells
//
//---------------------------------------------------------------------------------------------------------------


/**
 * All created shells are kept in CLI.Shells.
 * @class
 * @static
 * @private
 */
CLI.Shells = {
    /**
     * @private
     */
    ID: 1,

    /**
     * Map of shell id to CLI.Shell instance.
     * @type Object
     * @private
     */
    id2shell: {},

    /**
     * Iteratore over shells.
     * @param f
     * @private
     */
    forEachShell: function(/** Function */f) {
        for (var id in this.id2shell) {
            f(this.id2shell[id]);
        }
    },

    
    /**
     * @param shell
     * @private
     */
    add: function(/** CLI.Shell */shell) {
        var id = this.ID;
        shell.shellsId = id;
        this.id2shell[id] = shell;
        this.ID += 1;
    },

    /**
     * @param shell
     * @private
     */
    remove: function(/** CLI.Shell */shell) {
        if (shell.shellsId < 0) {
            return;
        }
        assert(this.id2shell[shell.shellsId]);
        delete this.id2shell[shell.shellsId];
        shell.shellsId = -1;
    },

    
    /**
     * Dump text on all interactive shells.
     * @param txt
     * @private
     */
    printImmediate: function(/** String */txt) {
        for (var id in this.id2shell) {
            var shell = this.id2shell[id];
            if (shell.inInteractiveMode && shell.enableImmediateMessages) {
                shell.println(txt);
            }
        }
    }
};






//---------------------------------------------------------------------------------------------------------------
//
// CLI.Shell
//
//---------------------------------------------------------------------------------------------------------------


/**
 * A CLI.Shell is capable of executing shell commands implemented by subclasses of CLI.Command. The shell
 * commands may be specified by a command line (String) or reside in a file which is then sourced by the
 * shell. The shell supports files ending with ".mrsh" which are interpreted as a  
 * @class 
 * @constructor
 * @param inInteractiveMode   If true, an interactive shell
 * @param commandFactory      Optional, by default, the property CLI.commandFactory is the default factory
 */
CLI.Shell = function(/** Boolean */inInteractiveMode, /** CLI.CommandFactory */commandFactory) {
   assert(inInteractiveMode!=undefined);
   /**
    * Signals whether shell is in interactive mode.
    * @type Boolean
    * @private
    */
   this.inInteractiveMode = inInteractiveMode;
   /**
    * A map where commands can store objects between invocations.
    * @type Object
    * @private
    */
   this.attrs = {};
   /**
    * Handles command guessing and instantiation for this shell.
    * @type CLI.CommandFactory
    * @private
    */
   this.commandFactory = commandFactory;
   if (!this.commandFactory) {
      this.commandFactory = CLI.commandFactory;
   }
   assert(this.commandFactory);
   /**
    * Input stream. By default, STDIN.
    * @type Object
    * @private
    */
   this.instr = STDIN;
   /**
    * Output stream. By default, STDOUT.
    * @type Object
    * @private
    */
   this.outstr = STDOUT;
   /**
    * Verbose flag.
    * @type Boolean
    * @private
    */
   this.verbose = PROG_PARAMS.verboseFlag;
    /**
     * Global id of shell.
     * @private
     */
    this.shellsId = -1;
    /**
     * @type Boolean
     * @private
     */
    this.enableImmediateMessages = false;
    /**
     * Map of variable name to value.
     * @private
     */
    this.var2value = {};
    this.var2value['HOSTNAME'] = IO.Inet.gethostname();
    if (REPO_ROOT) {
	this.var2value['REPO_ROOT'] = REPO_ROOT;
    }
    /**
     * Background commands.
     * @type CLI.Shell.BGCommands
     * @private
     */
    this.bgCommands = new CLI.Shell.BGCommands(this);

    CLI.Shells.add(this);
    
    if (this.inInteractiveMode) {
        this.enableImmediateMessages = true;
        this.historyBuf = new Util.RingBuffer(64);
        this.historyId = 1;
	this.currCmdModuleName = null;
    }
};


/**
 * Constant. The option "CLI.Shell.BG_TIMEOUT" specifies after what time a command
 * is executed in the background in an interactive shell.
 * @type Number
 * @constant
 */
CLI.Shell.BG_TIMEOUT = 5000;
OPTIONS.add("CLI.Shell.BG_TIMEOUT", 'int', "milliseconds");

/**
 * @type String
 * @constant
 * @private
 */
CLI.Shell.MRSH_JS_FILE = "mrsh.js";

/**
 * @type String
 * @constant
 * @private
 */
CLI.Shell.MRSH_RC_FILE = "mrsh.rc";

/**
 * @type String
 * @constant
 * @private
 */
CLI.Shell.MRSH_SUFFIXES = [
   "mrsh",
   "rc"
];

/**
 * @type String[]
 * @constant
  * @private
 */
CLI.Shell.ALL_SUFFIXES = [
   "mrsh",
   "rc",
   "js"
];

/**
 * @type RegExp
 * @constant
  * @private
 */
CLI.Shell.VAR_EVAL_REGEXP = /[^\$]?\$\{([\w\d_]+(\:[^\}]+)?)\}/;

/**
 * @type RegExp
 * @constant
  * @private
 */
CLI.Shell.VAR_NAME_REGEXP = /^[\w\d_]+$/;



/**
 * Returns whether filename denotes a javsscript file, ends in ".js" suffix
 * @returns {Boolean} whether filename denotes a javsscript file, ends in ".js" suffix
 * @static
 */
CLI.Shell.isJSScript = function(filename) {
   return /\.js$/.test(filename);
};

/**
 * Returns whether filename denotes a moterunner file, ends in ".mrsh" suffix etc.
 * @returns {Boolean} whether filename denotes a moterunner file, ends in ".mrsh" suffix etc.
 * @static
 */
CLI.Shell.isMRScript = function(filename) {
   return /\.mrsh$/.test(filename) || /\.rc$/.test(filename) || /\.soash$/.test(filename);
};

/**
 * Returns whether filename denotes something executable by the shell.
 * @returns {Boolean} whether filename denotes something executable by the shell.
 * @static
 */
CLI.Shell.isScript = function(filename) {
   return CLI.Shell.isJSScript(filename) || CLI.Shell.isMRScript(filename);
};

/**
 * Find script (moterunner or javascript) relative to current working directory. Prefer
 * moterunner scripts to javascripts. If not found in current working directory, try
 * on sonoran script path.
 * @param filename     Filename with or without suffix
 * @returns {String} filename or null
 * @static
 */
CLI.Shell.findScript = function(/** String */filename) {
   var s;
   if (IO.File.exists(filename) && !IO.File.isDir(filename)) {
      return filename;
   }
   var suffixes = CLI.Shell.ALL_SUFFIXES;
   for (var i = 0; i < suffixes.length; i++) {
      var re = new RegExp("\." + suffixes[i] + "$");
      if (!re.test(filename)) {
	 s = filename + "." + suffixes[i];
	 if (IO.File.exists(s)) {
	    return s;
	 }
      }
   }
   var filepath = Runtime.search(filename);
   if (filepath) {
      return filepath;
   }
   for (var i = 0; i < suffixes.length; i++) {
      var re = new RegExp("\." + suffixes[i] + "$");
      if (!re.test(filename)) {
	 s = filename + "." + suffixes[i];
	 filepath = Runtime.search(s);
         if (filepath) {
	    return filepath;
	 }
      }
   }
   return null;
};

/** Prototype */
CLI.Shell.prototype = {
    /**
     * Create a shell inheriting copies of variables from this shell,
     * inheriting I/O streams
     * @param options    Object with property verbose
     * @returns {CLI.Shell} the shell
     */
    getSubShell: function(/** Object */options) {
	var shell = new CLI.Shell(false, this.commandFactory);	
	shell.instr = this.instr;
	shell.outstr = this.outstr;
	shell.verbose = (options && options.verbose!==undefined) ? options.verbose : this.verbose;
	shell.enableImmediateMessages = false;
	shell.var2value = Blob.copy(this.var2value);
	return shell;
    },

    /**
     * Enable/Disable printing of immediate messages.
     * @param flag
     */
    setEnableImmediateMessages: function(/** Boolean */flag) {
       this.enableImmediateMessages = flag;
    },
    
   /**
    * Verbose flag set?
    * @returns {Boolean} verbose flag
    */
   isVerbose: function() {
      return this.verbose;
   },

   /**
    * Set verbose flag.
    * @param verbose
    */
   setVerbose: function(/** Boolean */verbose) {
      this.verbose = verbose;
   },



   /**
    * Return command factory.
    * @returns {CLI.Commandfactory}
    */
   getCommandFactory: function() {
      return this.commandFactory;
   },
   

    /**
     * Returns a progress monitor for this shell.
     * @returns {ProgressMonitor.Base} progress monitor 
     */
    getProgressMonitor: function() {
	return (!this.isInteractive) ? ProgressMonitor.getLoggerMonitor(Logger.SONORAN, Logger.DEBUG) : ProgressMonitor.getShellMonitor(this, this.verbose ? Logger.DEBUG3 : Logger.INFO);
    },

   /**
    * Save attribute. Commands can use this facility to save state between invocations.
    * @param name Attribute name
    * @param value Attribute value
    */
   setAttr: function(/** String */name, /** CLI.Shell.Attr */obj) {
       assert(typeof(obj.onClose)==='function');
       this.attrs[name] = obj;
   },

   /**
    * Return saved attribute.
    * @param name Attribute name
    * @returns {CLI.Shell.Attr} the attribute for this name
    */
   getAttr: function(/** String */name) {
      return this.attrs[name];
   },

    /**
     * Returns the map of variable names to values. Do not modify.
     * @returns {Object} a map of names to values
     */
    getVars: function() {
        return this.var2value;
    },

    /**
     * Return variable value, might be undefined.
     * @param name Variable name
     * @returns {String} value
     */
    getVar: function(/** String */name) {
        return this.var2value[name];
    },

    /**
     * Set variable value and returns previous value.
     * @param name Variable name
     * @param value Variable value
     * @returns {String} previous value or undefined
     */
    setVar: function(/** String */name, /** String */value) {
        var v = this.var2value[name];
        this.var2value[name] = value;
	if (name === 'verbose') {
	    this.setVerbose(/^true$/i.test(value));
	}
        return v;
    },

    /**
     * Delete variable (name and value) and return previous value.
     * @param name Variable name
     * @returns {String} previous value or undefined
     */
    delVar: function(/** String */name) {
        var v = this.var2value[name];
        delete this.var2value[name];
        return v;
    },


    /**
     * Set I/O streams (with print method).
     * @param instr
     * @param outstr
     * @private
     */
    setIOStreams: function(instr, outstr) {
	this.instr = instr;
	this.outstr = outstr;
    },


   /**
    * Forward text to the output stream of this shell.
    * @param s 
    */
   print: function(/** String */s) {
       if (this.outstr) {
	   if (this.outstr===STDOUT) {
	       Stdio.write(s);
	   } else {
	       this.outstr.print(s);     
	   }
       }
   },
   
   /**
    * Forward text to the shell output stream. Append newline.
    * @param s
    */
   println: function(/** String */s) {
       this.print(s + "\n");
   },

   /**
    * Read single line from the input stream of this shell. 
    * @param callback   Invoked with the line read from the input stream
    */
   readln: function(/** DFLT_ASYNC_CB */callback) {
      this.instr.readln(callback);
   },
   
   /**
    * Returns information about available commands.
    * @returns {Object} info, an array of objects with property 'command' (Name of command) and 'description' (Command usage)
    */
   getInfo: function() {
      return this.commandFactory.getInfo(this);
   },

   /**
    * Exit shell and sonoran process.
    * @param exitCode Exit code to return
    */
   exit: function(/** Number */exitCode) {
      if (!exitCode) {
         exitCode = 0;
      }
      Runtime.exit(0);
   },

    /**
     * Return the string to prompt after a command has been executed.
     * @param logMarker Log marker before command started
     * @returns {String} text to print (which might be null)
     * @private
     */
    getPostCommandMessage: function(/** Number */logMarker) {
        var sa = [];
        var newCnt = Logger.HISTORY.getNewlyArrivedCnt(logMarker);
	if (newCnt > 0) {
            sa.push(sprintf("%d new log entries. ", newCnt));
        }
	var unseenCnt = Logger.HISTORY.getNotSeenCnt();
	if (unseenCnt > 0) {
            sa.push(sprintf("%d unseen log entries. ", unseenCnt));
        }
	var pending = this.bgCommands.getPendingIds();
	if (pending.length > 0) {
	    sa.push(sprintf("%d pending in background. ", pending.length));
	}
	var finished = this.bgCommands.getFinishedIds();
	if (finished.length > 0) {
	    sa.push(sprintf("Finished in background: %d. ", finished.join(",")));
	}
        return sa.length>0 ? sa.join("") : null;
    },

    /**
     * Return prompt with post-command message and '>'.
     * @returns {String}
     * @private
     */
    getPrompt: function(/** Number */logMark) {
        var msg = this.getPostCommandMessage(logMark);
        var prompt = msg ? msg + "\n" : "";
	if (this.currCmdModuleName) {
	    prompt += this.currCmdModuleName + " ";
	}
	prompt += "> ";
        return prompt;
    },
    
   /**
    * Close shell. Dont accept any more input in this shell.
    */
   close: function() {
       for (var n in this.attrs) {
           this.attrs[n].onClose(this, this);
       }
       CLI.Shells.remove(this);
    },

   /**
    * Source the user initialization files '.mrsh.js' and '.mrsh.mrsh' if they exist in current directory
    * or user's home.
    * @param callback
    */
   sourceRC: function(/** DFLT_ASYNC_CB */callback) {
       if (BC.is(callback)) { return BC.exec(arguments.callee, this, arguments); }
       var _this = this;
       var msgs = [];
       var f = function(name, callback) {
           var fn = name;
           if (!IO.File.exists(fn)) {
	       fn = HOME_PATH + '/.' + name;
           }
           if (IO.File.exists(fn)) {
	       _this.execFile(fn, undefined, null, function(result) {
				  if (result.code!=0) {
				      msgs.push(sprintf("Executing '%s' failed: %s", fn, result.toString()));
				  }
				  callback(result);
			      });
           } else {
	       callback();
           }
       };
       f(CLI.Shell.MRSH_JS_FILE, function(result) {
             f(CLI.Shell.MRSH_RC_FILE, function(result) {
		   var status = (msgs.length>0) ? (new AOP.ERR(msgs.join("\n"))) : (new AOP.OK());
		   callback(status);
               });
	 });
   },


   /**
    * @returns {String} String
    * @private
    */
   toString: function() {
      return "CLI.Shell";
   },


   /**
    * Is this shell interactive?
    * @returns {Boolean} boolean
    */
   isInteractive: function() {
      return this.inInteractiveMode;
   },



  /**
    * Execute an array of script statements.
    * @param lines    Array of statements (String) 
    * @param idx      Index of line into array of lines to execute
    * @param callback 
    * @returns {Object} Object returned by last command executed
    * @throws {AOP.Exception}
    */
    execLines: function(/** String[] */lines, /** Number */idx, /** DFLT_ASYNC_CB */callback) {
	if (BC.is(callback)) { return BC.exec(arguments.callee, this, arguments); }
	assert(typeof(idx) == 'number', "API change");
	for (var i = idx; i < lines.length; i++) {
	    //if (this.verbose) { 
	    this.println("> " + lines[i]); 
	    //}
	    var result = this.execLine(lines[i], SCB);
	    var s = result.getFullMessage();
	    if (s.length>0) {
		if (s.charAt(s.length-1)!='\n') { s += "\n"; }
		this.println(s);
	    }
	    if (result.code !== 0) {
		callback(new AOP.ERR(sprintf("Executing line %d failed", i), result));
		return;
	    }
	}
	callback(new AOP.OK());
   },


  /**
    * Source a file, either Mote Runner script or Javascript.
    * @param name     Filename
    * @param args     Arguments, if 'undefined', not set for sourced file 
    * @param subShellOpts If set, options to create sub shell (such as verbose:true/false) 
    * @param callback 
    * @throws {AOP.Exception}
    */
   execFile: function(/** String */name, /** Object [] */args, /** Object */subShellOpts, /** DFLT_ASYNC_CB */callback) {
       assert(arguments.length===4);
       if (BC.is(callback)) { return BC.exec(arguments.callee, this, arguments); }
       // find script
       var filepath = name;
       if (!IO.File.exists(filepath) || IO.File.isDir(filepath)) {
           filepath = CLI.Shell.findScript(name);
           if (!filepath) {
               callback(new AOP.ERR(sprintf("Cannot find file '%s'", name)));
               return;
           }
       }

       if (CLI.Shell.isJSScript(filepath)) {
	   var _argv = ARGV;
	   if (args) {
	       ARGV = args;
	   }
           try {
	       Runtime.source(filepath);
	       ARGV = _argv;
	       callback(new AOP.OK());
           } catch(ex) {
	       ARGV = _argv;
	       callback(Ex2ERR(ERR_GENERIC, ex, sprintf("File '%s' failed", filepath)));
           }
           return;
       }
       
       if (CLI.Shell.isMRScript(filepath)) {
           var lines = [];
           try {
               var frdr = new IO.FileReader(filepath);
               var lrdr = new IO.LineReader(frdr);
               var l;
               while((l = lrdr.readLine()) != null) {
		   lines.push(l);
               }
               frdr.close();
           } catch(ex) {
               callback(Ex2ERR(ERR_GENERIC, ex, sprintf("Reading '%s' failed", filepath)));
               return;
           }
           var shell = (subShellOpts) ? this.getSubShell(subShellOpts) : this;
	   if (args) {
	       args.forEach(function(arg, idx) {
		   shell.setVar(idx.toString(), arg.toString());
	       });
	   }
           shell.execLines(lines, 0, function(result) {
		   if (subShellOpts) {
		       shell.close();
		   }
		   if (result.code !== 0) {
		       result = new AOP.ERR(ERR_GENERIC, sprintf("Executing script '%s' failed", name), result);
		   }
		   callback(result);
	   });
           return;
       }

       callback(new AOP.ERR(sprintf("Unsupported file extension in '%s'", filepath)));
   },

   


    /**
     * Execute command entered interactively.
     * @param line
     * @param callback
     */
    execPrompt: function(/** String */line, /** DFLT_ASYNC_CB */callback) {
	if (BC.is(callback)) { return BC.exec(arguments.callee, this, arguments); }
	
	var jsCommand = CLI.Shell.Javascript.parse(line, this);
	var argv = [];

	if (!jsCommand) {
	    try {
		argv = Util.splitCommandLine(line);
	    } catch (x) {
		callback(new AOP.ERR("Command parsing failed: " + x.toString()));
		return;
	    }
	}
	
	if (this.inInteractiveMode && line[0] != '!')  {
            this.historyBuf.add({ id: this.historyId, line: line });
            this.historyId += 1;
	}

	var bgcmd = null;
	var cmd = null;
	var timer = null;
	var _this = this;
	
	var ontimeoutf = function(ev) {
	    timer = null;
	    bgcmd = _this.bgCommands.add(line, cmd);
	    callback(new AOP.OK("Command pushed to background. Use 'bg' to see list of commands executed in the background."));
	};

	var onfinishf = function(result) {
	    if (timer===null&&bgcmd===null) {
		QUACK(0, sprintf("Command '%s' invoked its callback twice: %s", line, result));
		assert(false);
	    }
            if (result.code !== 0) {
		if (cmd.ignoreMode) {
                    result = new AOP.OK("Ignore error: " + result);
		}
            } 
	    var mod = cmd.getModuleName();
	    if (mod && !cmd.isBuiltin()) {
		//_this.currCmdModuleName = mod;
	    }
	    assert(timer!==undefined);
	    if (timer===null) {
		// running in background
		assert(bgcmd);
		bgcmd.result = result;
		//QUACK(0, "Backgorund command finished: '" + bgcmd.line + "': " + result);
		Logger.log(Logger.INFO, "SHELL", sprintf("'%s' finished: %s", bgcmd.line, result.toString()));
		bgcmd = null;
	    } else {
		// running in foreground
		timer.cancel();
		timer = null;
		callback(result);
	    }
	};
	if (!jsCommand) {
	    try {
		cmd = this.createCommand(argv, this.currCmdModuleName);
	    } catch(ex) {
		callback(AOP.Ex2ERR(ERR_GENERIC, ex));
		return;
	    }
	} else {
	    cmd = jsCommand;
	}
	timer = Timer.timeoutIn(CLI.Shell.BG_TIMEOUT, ontimeoutf);
	try {
	    cmd._exec(argv, onfinishf);
	} catch(ex) {
	    onfinishf(AOP.Ex2ERR(ERR_GENERIC, ex));
	    return;
	}
    },


  /**
    * Execute single line. The line is splitted into single arguments and execArgv is called.
    * " and ' maybe used to group multiple words into a single argument. \\, \' etc behave as expected.
    * @param line     Line or statement
    * @param callback 
    * @returns AOP.OK/AOP.ERR instance on callback invocation 
    */
   execLine: function(/** String */line, /** DFLT_ASYNC_CB */callback) {
       if (BC.is(callback)) { return BC.exec(arguments.callee, this, arguments); }
       
       var jsCommand = CLI.Shell.Javascript.parse(line, this);
       var argv = [];

       try {
	   if (!jsCommand) {
               argv = Util.splitCommandLine(line);
	   }
	   if (this.inInteractiveMode && line[0] != '!')  {
	       this.historyBuf.add({ id: this.historyId, line: line });
	       this.historyId += 1;
	   }
	   if (!jsCommand) {
	       this.execArgv(argv, callback);
	   } else {
	       jsCommand._exec(argv, callback);
	   }
       } catch (x) {
           callback(new AOP.ERR("Command parsing failed: " + x.toString()));
           return;
       }
   },


 /**
    * Execute argument vector.
    * @param argv
    * @param callback
    * @returns {Object} Object as returned by command
    * @throws {AOP.Exception}
    */
   execArgv: function(/** String[] */argv, /** DFLT_ASYNC_CB */callback) {
       if (BC.is(callback)) { return BC.exec(arguments.callee, this, arguments); }

       var cmd = null;
       var onexecf = function(result) {
           if (result.code != 0) {
               if (cmd.ignoreMode) {
                   result = new AOP.OK("Ignore error: " + result);
               }
           }
           callback(result);
       };
       try {
	   cmd = this.createCommand(argv);
	   cmd._exec(argv, onexecf);
       } catch(ex) {
	   callback(AOP.Ex2ERR(ERR_GENERIC, ex));
       }
   },




    /**
     * Create command object to be executed.
     * @param argv    
     * @returns {CLI.Command} Command or null (if line is empty etc.)
     * @throws {Exception}
     * @private
     */
    createCommand: function(/** String[] */argv, /** String */prefix) {
	if (argv.length == 0) {
	    return new CLI.Shell.NullCommand(this);
	}
	if (argv[0].charAt(0) == '#') {
	    return new CLI.Shell.NullCommand(this);
	}
	
	var argv0 = argv[0];
	if (this.inInteractiveMode && argv0[0] === '!') {
	    cmd = new CLI.Shell.ExecHistCommand(this, argv);
	    return cmd;
	}

	this.substituteVariables(argv);
	
	for (var i = 0; i < argv.length; i++) {
            if (argv[i] == ';') {
		cmd = new CLI.Shell.CommandSequenceCommand(this, argv);
		return cmd;
            }
	}
	
	var ignoreMode = false;
	argv0 = argv[0];
	if (argv0 == 'ignore') {
            argv.shift();
            ignoreMode = true;
            if (argv.length == 0) {
		throw new Exception("Leading 'ignore' without command specification");
            }
	}
      
	var cmd = null;
	try {
            cmd = this.commandFactory.parseCommand(this, argv, prefix);   
	} catch (ex) {
	    println(Runtime.dumpException(ex));
	    throw new Exception("Command setup failed: " + ex, ERR_GENERIC);
	}

	if (cmd === null) {
	    var path, filepath = argv[0];
	    if (IO.File.exists(filepath)) {
		cmd = new CLI.Shell.ExecFileCommand(this, argv);
	    } else if ((CLI.Shell.findScript(filepath))) {
		cmd = new CLI.Shell.ExecFileCommand(this, argv);
	    } else {
		argv.unshift(argv[0]);
		cmd = new CLI.Builtins.ShCommand(this, argv[0]);
	    }
	}

	cmd.ignoreMode = ignoreMode;

	return cmd;
    },


    /**
     * Variable substitution.
     * @param argv Splitted command line
     * @private
     */
    substituteVariables: function(/** String[] */argv) {
        for (var i = 0; i < argv.length; i++) {
            while(true) {
                var matches = CLI.Shell.VAR_EVAL_REGEXP.exec(argv[i]);
                if (!matches) {
                    break;
                }
		var match = matches[1];
		var sa = match.split(':');
                var name = sa[0];
		var dflt = sa.length > 0 ? sa[1] : null;
                var value = this.var2value[name];
                if (value === undefined) {
		    if (dflt) {
			value = dflt;
		    } else {
			var mote = Sonoran.CLI.Abbreviations.resolveMote(name);
			if (mote) {
			    value = mote.getUniqueid();
			}
                    }
                }
                if (value == null) {
		    value = "";
		}
                //argv[i] = argv[i].replace("\$\{" + name + "\}", value);
		argv[i] = argv[i].replace("\$\{" + match + "\}", value);
            }
        }
    },


    /**
     * Read from prompt and execute shell interactively. Shell must be in interactive mode. 
     * Input is read from shells input stream and written to its output stream.
     */
    run: function() {
	assert(this.inInteractiveMode === true);
        var _this = this;
        this.inInteractiveMode = true;
        var logMark = Logger.HISTORY.getMarker();
        this.print(this.getPrompt(logMark));
        flush();
        /** @ignore */
        var waitForMsgs = function() {
            Timer.timeoutIn(50, function() {
                logMark = Logger.HISTORY.getMarker();
                _this.print(_this.getPrompt(logMark));
                flush();
                readLine();
            });
        };
        /** @ignore */
        var execLine = function(line, listener) {
            _this.execPrompt(line, function(result) {
		var s;
		if (_this.isVerbose() && result.code!==0 && result.getFullMessage()) {
		    s = result.getFullMessage();
		} else {
		    s = result.getMessage();
		}
	        if (s.length>0) {
		    if (s.charAt(s.length-1) != '\n') { s += "\n"; }
		    _this.print(s);
		    flush();
		}
	        waitForMsgs();
            });
        };
        /** @ignore */
        var readLine = function() {
            if (_this.instr == null) {
                // has been closed
                return;
            }
            _this.readln(function(line) {
                execLine(line);
            });
        };
        readLine();
    }
};




/**
* @class
 * @static
 * @private
 */
CLI.Shell.Javascript = {
    /**
     * @private
     */
    contexts: [ {} ],

    /**
     * @type Function
     * @private
     */
    func: null,

    /**
     * @param line     Script line
     * @param shell     Shell instance
     * @returns {String} Javascript expression or null
     */
    parse: function(/** String */line, /** CLI.Shell */shell) {
	var re = /^\s*\`\s*(.+)$/;
	var md = re.exec(line);
	if (!md) {
	    return null;
	}
	return new CLI.Builtins.JavascriptCommand(shell, "'", md[1]);
    },


   /**
     * @param shell     Shell instance
     * @param line     Script line
     * @returns {String} Javascript expression or null
     */
    exec: function(/** String */expr, /** CLI.Shell */shell) {
	var txt = sprintf("CLI.Shell.Javascript.func = function(){ %s };", expr);
	try {
	    Runtime.sourceString("CLI.Shell.Javascript", txt);
	} catch(ex) {
	    throw new Exception(sprintf("Cannot execute expression '%s': %s", expr, ex));
	}
	var f = Blob.peek("CLI.Shell.Javascript.func");
	if (!f || (typeof(f) !== 'function')) {
	    throw new Exception(sprintf("Cannot execute expression '%s': cannot bind function", expr));
	}
	var context = this.contexts[0];
	var ret = f.call(context);
	return ret;
    }
};






//---------------------------------------------------------------------------------------------------------------
//
// Shell attribute base class
//
//---------------------------------------------------------------------------------------------------------------

/**
 * Attributes associated with a shell must implement this interface.
 * @class
 * @constructor
 */
CLI.Shell.Attr = function() {};

/** @private */
CLI.Shell.Attr.prototype = {
    /**
     * Called when the shell is closed.
     */
    onClose: function(/** CLI.Shell */shell, /** CLI.Shell.Attr */self) {}
};






/**
 * @class 
 * @constructor
 * @private
 */
CLI.Shell.CommandSequenceCommand = function(/** CLI.Shell */shell, /** String[] */argv) {
    this.description = "Helper command to execute multiple statements on a command line";
    var name = argv.join(' ');
    CLI.Command.call(this, shell, name, [ new GetOpt.EndOfArgs() ]);
    this.argv = argv;
};

/** @private */
CLI.Shell.CommandSequenceCommand.prototype = extend(
   CLI.Command.prototype,
   {
       /**
	* Invoked by shell to parse and execute command.
	* @param argv
	* @param callback
	* @private
	*/    
       _exec: function(/** String[] */argv, /** DFLT_ASYNC_CB */callback) {
	   assert(this.argv.length===argv.length);
	  var argva = [];
	  var argvai = 0;
	  for (var i = 0; i < this.argv.length; i++) {
	      if (this.argv[i]===';') {
		  argvai += 1;
	      } else {
		  if (!argva[argvai]) { argva[argvai] = []; }
		  argva[argvai].push(this.argv[i]);
	      }
	  }
	   var shell = this.shell;
	  argvai = 0;
	  var f = function(result) {
	      if (result.code!==0) {
		  callback(result);
		  return;
	      }
	      argvai += 1;
	      if (argvai >= argva.length) {
		  callback(result);
		  return;
	      }
	      if (shell.isInteractive()) {
		  shell.println(result.toString());
	      }
	      shell.execArgv(argva[argvai], f);
	  };	  
	  shell.execArgv(argva[argvai], f);
      }
   }
);




/**
 * @class 
 * @constructor
 * @private
 */
CLI.Shell.ExecFileCommand = function(/** CLI.Shell */shell, /** String[] */argv) {
    this.description = "Helper command to execute a script.";
    var name = argv.join(" ");
    CLI.Command.call(this, shell, name, [ new GetOpt.EndOfArgs() ]);
    this.argv = argv;
};

/** @private */
CLI.Shell.ExecFileCommand.prototype = extend(
    CLI.Command.prototype,
    {
	/**
	 * Invoked by shell to parse and execute command.
	 * @param argv
	 * @param callback
	 * @private
	 */    
	_exec: function(/** String[] */argv, /** DFLT_ASYNC_CB */callback) {
	    assert(this.argv.length===argv.length);
	    var filename = CLI.Shell.findScript(this.argv[0]);
	    if (!filename) {
		callback(new AOP.ERR(sprintf("Cannot resolve command/script in: '%s'", argv.join(" "))));
		return;
	    }
	    this.shell.execFile(filename, this.argv.slice(1), { verbose: this.shell.isVerbose() }, callback);
	    // if (CLI.Shell.isJSScript(filename)) {
	    // 	this.shell.sourceFile(filename, this.argv.slice(1), callback);
	    // } else {
	    // 	this.shell.execFile(filename, this.shell.isVerbose(), true, callback);
	    // }
	}
    }
);





/**
 * @class 
 * @constructor
 * @private
 */
CLI.Shell.ExecHistCommand = function(/** CLI.Shell */shell, /** String[] */argv) {
    this.description = "Helper command to execute a command in the history.";
    var name = argv.join(" ");
    CLI.Command.call(this, shell, name, [ new GetOpt.EndOfArgs() ]);
    this.argv = argv;
};

/** @private */
CLI.Shell.ExecHistCommand.prototype = extend(
    CLI.Command.prototype,
    {
	/**
	 * Invoked by shell to parse and execute command.
	 * @param argv
	 * @param callback
	 * @private
	 */    
	_exec: function(/** String[] */argv, /** DFLT_ASYNC_CB */callback) {
	    assert(this.argv.length===argv.length);
	    var argv0 = this.argv[0];
	    assert(argv0[0] === '!');
	    if (argv0.length == 1) {
		callback(new AOP.ERR("Invalid use of !"));
		return;
            }
	    var historyBuf = this.shell.historyBuf;
            if (historyBuf.getUsed() == 0) {
		callback(new AOP.ERR("History empty!"));
		return;
            }
            var first = historyBuf.getFirst();
            var last = historyBuf.getLast();
            var ele;
            if (argv0[1] == '!') {
		ele = last;
            } else {
		var idx = parseInt(argv0.substring(1), 10); 
		var firstId = first.id;
		var lastId = last.id;
		if (idx < 0) {
		    idx = lastId +1 + idx;
		}
		if (idx < firstId || idx > lastId) {
                    callback(new AOP.ERR("Invalid history selection: " + idx));
                    return;
		}
		idx -= firstId;
		ele = historyBuf.get(idx);
            }
            this.shell.execLine(ele.line, callback);
	}
    }
);







/**
 * @class 
 * @constructor
 * @private
 */
CLI.Shell.NullCommand = function(/** CLI.Shell */shell) {
    this.description = "Helper command to execute an empty line.";
    CLI.Command.call(this, shell, "NullCommand", [ new GetOpt.EndOfArgs() ]);
};

/** @private */
CLI.Shell.NullCommand.prototype = extend(
    CLI.Command.prototype,
    {
	/**
	 * Invoked by shell to parse and execute command.
	 * @param argv
	 * @param callback
	 * @private
	 */    
	_exec: function(/** String[] */argv, /** DFLT_ASYNC_CB */callback) {
	    callback(new AOP.OK());
	}
    }
);






/**
 * @class
 * @constructor
 * @param command
 * @private
 */
CLI.Shell.BGCommands = function(/** CLI.Shell */shell) {
    this.shell = shell;
    this.commands = [];
    this.id = 1;
};



/** */
CLI.Shell.BGCommands.prototype = {
    /**
     * @param line
     * @param command
     * @returns {CLI.Shell.BGCommand}
     * @private
     */
    add: function(/** String */line, /** CLI.Command */command) {
	var id = this.id;
	this.id += 1;
	var cmd = new CLI.Shell.BGCommand(id, line, cmd);
	this.commands.push(cmd);
	if (this.commands.length > 256) {
	    // unlikely, but who knows
	    this.commands = this.commands.slice(this.commands.length-256);
	}
	return cmd;
    },

    /**
     * @returns {CLI.Shell.BGCommand[]}
     */
    strip: function() {
	var commands = this.commands;
	this.commands = [];
	for (var i = 0; i < commands.length; i++) {
	    var command = commands[i];
	    if (!command.result) {
		this.commands.push(command);
	    } 
	}
	return commands;
    },

    /**
     * Get the ids of oustanding commands.
     * @returns {Number[]}
     * @private
     */
    getPendingIds: function() {
	return this.commands.filter(function(cmd) { return cmd.result===null; }).map(function(cmd) { return cmd.id; });
    },

    /**
     * Get the ids of finished commands.
     * @returns {Number[]}
     * @private
     */
    getFinishedIds: function() {
	return this.commands.filter(function(cmd) { return cmd.result!==null; }).map(function(cmd) { return cmd.id; });
    }

};






/**
 * @class
 * @constructor
 * @param command
 * @private
 */
CLI.Shell.BGCommand = function(/** Number */id, /** String */line, /** CLI.Command */command) {
    this.id = id;
    this.line = line;
    this.command = command;
    this.result = null;
};

/** */
CLI.Shell.BGCommand.prototype = {
    /**
     * @private
     */
    toString: function() {
	var txt = sprintf("%4d: %10s: '%s'", this.id, this.result?"FINISHED":"PENDING", this.line);
	if (this.result) {
	    var s = this.result.toString();
	    if (s.length>0) {
		txt += "\n" + s;
	    }
	}
	return txt;
    }
};




if (Runtime.runOnServer()) {
    Logger.defineModule("SHELL", Logger.INFO);
}

