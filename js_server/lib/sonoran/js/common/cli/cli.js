//  (C) COPYRIGHT INTERNATIONAL BUSINESS MACHINES CORPORATION 2006-2010
//                       ALL RIGHTS RESERVED
//        IBM Research Division, Zurich Research Laboratory
// --------------------------------------------------------------------

/**
 * Implements the sonoran command line interface.
 * @namespace CLI 
 */
CLI = {};



/**
 * @namespace CLI.Commands
 * @private
 */
CLI.Commands = {};



//=====================================================================================================
//
// CLI.guessKeyword
//
//=====================================================================================================


/**
 * Guess keyword. Matches a string such as "ab-cd" against
 * an array of keywords such as [ "abcd-efgh", "abab-cdcd" ] to
 * find possible completions such as "abab-cdcd".
 * @param s        Input
 * @param keywords Possible completions
 * @param sep      A single separating character such as '-'
 * @returns {String[]} array with 0 elements (no match), 1 element (exact match), >1 element (possible completions).
 */
CLI.guessKeyword = function(/** String */s, /** String[] */keywords, /** String */sep) {
   if (!sep) {
      sep = '-';
   }
   var exactMatches = [];
   var abbrevMatches = [];
   for (var i = 0; i < keywords.length; i++) {
      var m = GetOpt.abbrevMatch(GetOpt.IGNORE_CASE, sep, keywords[i], s);
      if (m.match == GetOpt.EXACT) {
	 exactMatches.push(keywords[i]);
      } else if (m.match == GetOpt.ABBREV) {
	 abbrevMatches.push(keywords[i]);
      }
   }
   assert(exactMatches.length<=1);
   if (exactMatches.length>0) {
      return exactMatches;
   }
   return abbrevMatches;
};






//=====================================================================================================
//
// CLI.Spec
//
//=====================================================================================================



/**
 * A CLI.Spec inherits from GetOpt.Spec to parse the command name. A Shell CLI.Command instance 
 * has a CLI.Spec to identify a command name and parse the beginning of a command line up to
 * the command. Typically, the CLI.Spec instance is created in a command constructor and 
 * passed to the base command class. </br>
 * A command may use a derived CLI.Spec instance to implement custom behaviour such as 
 * mote abbreviations in the Sonoran shell. 
 * <pre>
 * CLI.Builtins.cdCommand = function(shell, name) {
 *   this.description = "Change current working directory.";
 *   this.cmdSpec = new CLI.Spec(name);
 *   this.dirSpec = new GetOpt.Simple("directory", "Name of directory.");
 *   CLI.Command.call(this, shell, name, [ this.cmdSpec, this.dirSpec, new GetOpt.EndOfArgs() ]);
 * };
 * </pre>
 * @class 
 * @augments GetOpt.Spec
 * @constructor
 * @param command       Command name to be guessed by shell
 * @param mnemo         Might be 'undefined'
 * @param description   Might be 'undefined'
 */
CLI.Spec = function(/** String */command, /** String */mnemo, /** String */description) {
    assert(command);
    if (!mnemo) {
	mnemo = command;
    }
    if (!description) {
	description = "Command '" + command + "'";
    }
    GetOpt.Spec.call(this, mnemo, description);
    this.command = command;
};

/** Prototype */
CLI.Spec.prototype = extend(
    GetOpt.Spec.prototype,
   /** @lends CLI.Spec.prototype */
    {
	/**
	 * @returns {String} the command name
	 */
	getCommand: function() {
	    return this.command;
	},

	/**
	 * A Spec must parse its parameters here and return EXACT_MATCH etc.
	 * @param env
	 * @returns {Number} GetOpt.EXACT etc.
	 */
	parse: function(/** GetOpt.Env */env) { 
	    //var arg = env.currArg();
	    //var m = GetOpt.abbrevMatch(GetOpt.IGNORE_CASE, '-', this.command, arg);
	    //if (m.match === GetOpt.NOMATCH) {
	    //throw sprintf("Unexpected prefix for command '%s': %s", this.command, arg);
	    //}
	    // consumes any name which led to this command
	    env.consumeArg();
	    return GetOpt.EXACT;	    
	},

	/**
	 * @returns {Object} state of this Spec.
	 */
	getState: function(/** GetOpt.Env */env) { 
	    return;
	},

	/**
	 * Set state of this Spec.
	 * @param state
	 */
	setState: function(/** Object */state) { 
	    return;
	},
	
	/**
	 * A Spec tests current args in environment for applying and returns EXACT_MATCH etc.
	 * @param env
	 * @returns {Number} GetOpt.EXACT etc.
	 */
	test: function(/** GetOpt.Env */env) { 
	    return env.moreConsumableArgs(0);
	},

	/**
	 * Print this Spec and its expected parameters etc.
	 * @param env
	 * @param mode
	 */
	print: function(/** GetOpt.Env */env, /** Number */mode) { 
	    var pb = env.pb;
	    if (mode == GetOpt.PrintMode.MNEMO) {
		pb.insert(this.command);
		return 0;
	    }	    
	    if (mode == GetOpt.PrintMode.SHORT) {
		pb.insertSoftSpace();
		this.print(env, GetOpt.PrintMode.MNEMO);
		return 0;
	    }
	    if (mode == GetOpt.PrintMode.DETAILS) {
		;
	    }	    
	    return 0;
	}
    }
);











//=====================================================================================================
//
// CLI.Command
//
//=====================================================================================================


/**
 * CLI.Command implements the base class for commands executed by a shell instance.
 * Subclasses must override  'exec' and setup the command parser properly by
 * calling this constructor with proper parameters.
 * <pre>
 * CLI.Builtins.cdCommand = function(shell, name) {
 *   this.description = "Change current working directory.";
 *   this.cmdSpec = new CLI.Spec(name);
 *   this.dirSpec = new GetOpt.Simple("directory", "Name of directory.");
 *   CLI.Command.call(this, shell, name, [ this.cmdSpec, this.dirSpec, new GetOpt.EndOfArgs() ]);
 * };
 * </pre>
 * The 'cmdSpec' parameter may just be the name as passed in by the CommandFactory when the
 * command is created.<br/>
 * 'seqArgList' contains the array of parameter specs as provided by the GetOpt package.<br/>
 * A command subclass must set the 'description' property of a command.
 * @class 
 * @constructor
 * @param shell            Shell
 * @param cmdSpec          Identifies the command and command name
 * @param seqArgList       GetOpt::Spec[], identifies the comman options and parameters
 * @param mandatoryArgsCnt Optional, see GetOpt::Seq, the number of command parameters required by this command
 * @see GetOpt::Seq
 */
CLI.Command = function(/** CLI.Shell */shell, /** String|CLI.Spec */cmdSpec, /** GetOpt::Spec[] */seqArgList, /** Number */mandatoryArgsCnt) {
    assert(arguments.length>=2, "API change: commands get a shell and name parameter");
    assert(arguments.length<=4, "API change: commands get a shell and name parameter");
    assert(shell instanceof CLI.Shell);
    assert(typeof(cmdSpec) === 'string' || (cmdSpec instanceof CLI.Spec));
    if (seqArgList==null) {
	seqArgList = [ new GetOpt.EndOfArgs() ];
    }
    assert(seqArgList.length>0);
    assert(!(seqArgList[0] instanceof CLI.Spec), "API change: first object in seqArgList may not be a CLI.Spec");
    if (cmdSpec instanceof CLI.Spec) {
	this.name = cmdSpec.getCommand();
    } else {
	this.name = cmdSpec;
	cmdSpec = new CLI.Spec(cmdSpec);
    }
    this.cmdSpec = cmdSpec;
    seqArgList = [ cmdSpec ].concat(seqArgList);
    this.shell = shell;
    if (mandatoryArgsCnt!==undefined) {
	mandatoryArgsCnt += 1;
    }
    this.parser = new GetOpt.Seq(seqArgList, mandatoryArgsCnt);
};




/** Prototype */
CLI.Command.prototype = {
    __constr__: "CLI.Command",
   /**
    * Reference to shell having created and executing this command.
    * @type CLI.Shell
    * @private
    */
   shell: null,
   /**
    * Name of command.
    * @type String
    * @private
    */
   name: null,
   /**
    * Parser instance parsing command arguments.
    * @type GetOpt.Seq
    * @private
    */
   parser: null,
   /**
    * Description for this command. Printed by CLI.Builtins.HelpCommand.
    * Must be set by subclasses.
    * @type String
    */
   description: "",
    /**
     * Command spec.
     * @type CLI.Spec
     * @private
     */
    cmdSpec: null,
    /**
     * Set by the shell to true, if errors on command execution should be ignored.
     * @type Boolean
     * @private
     */
    ignoreMode: false,

    /**
     * @returns {String}
     */
    getModuleName: function() {
	var sa = this.name.split('-');
	if (sa.length <= 1) {
	    return null;
	}
	var s = snake2camelCase(sa[0]);
	return s;
    },

    /**
     * @returns {Boolean}
     */
    isBuiltin: function() {
	return this.shell.getCommandFactory().isBuiltinCommand(this.name);
    },

   /**
    * @returns {String} string.
    */
   toString: function() {
      return "CLI.Command: " + this.name;
   },
   
   /**
    * Forward string to shell's print method.
    * @param s 
    */
   print: function(/** String */s) {
      this.shell.print(s);
   },
   
   /**
    * Forward string to shell's println method.
    * @param s 
    */
   println: function(/** String */s) {
      this.shell.println(s);
   },

   /**
    * Invoked by shell to parse and execute command.
    * @param argv
    * @param callback
    * @private
    */    
   _exec: function(/** String[] */argv, /** DFLT_ASYNC_CB */callback) {
      assert(this.shell&&this.name);
      var env = new GetOpt.Env(argv);
      try {
	 this.parser.reset();
	 this.parser.parse(env);
	 // All arguments must have been consumed
	 GetOpt.EndOfArgs.prototype.checkArgs(env);
      } catch(ex) {
	 if (ex === "OPTERROR") {
	    callback(new AOP.ERR(env.pb.toString()));
	    return;
	 } else {
	    //SYSTEM_EXC_HANDLER(ex);
            callback(Ex2ERR(ERR_GENERIC, ex, "Command parsing failed"));
            return;
	 }
      }
       var name = this.name;
      this.exec(function(result) {
	  if (result.code !== 0) {
	      result = new AOP.ERR(ERR_GENERIC, sprintf("'%s' failed", name), result);
	  }
	  callback(result);
      });
   },
   
   /**
    * Abstract method called by the shell to execute the command.
    * The result of the command is returned by invokding the 
    * specified callback.</br>
    * All command parameters have been parsed before and 
    * are accessible on the GetOpt.Spec instances. 
    * @param callback
    */
   exec: function(/** DFLT_ASYNC_CB */callback) {
      assert(0, "Missing command implementaton!");
   }
};



//=====================================================================================================
//
// CLI.Module
//
//=====================================================================================================


/**
 * A module containing shell commands.
 * @class
 * @constructor
 * @param namespace  Namespace name where commands are stored
 * @param module     Name of module, last segment in namespace name
 * @param obj        The resolved namespace
 * @param hidden
 * @private
 */
CLI.Module = function(/** String */namespace, /** String */module, /** Object */obj, /**Boolean */hidden) {
    /**
     * @type String
     * @private
     */
    this.namespace = namespace;
    /**
     * @type String
     * @private
     */
    this.module = module;
    /**
     * @type Object
     * @private
     */
    this.obj = obj;
    /**
     * @type Boolean
     * @private
     */
    this.hidden = hidden;
}; 





//=====================================================================================================
//
// CLI.CommandFactory
//
//=====================================================================================================

/**
 * A shell uses a CLI.CommandFactory instance to gather all available command modules and command classes.
 * It also uses a CommandFactory instance to instantiate a command before executing it. The 
 * CLI.CommadFactory instance can be specified when calling the CLI.Shell
 * constructor.
 * @class
 * @constructor
 */
CLI.CommandFactory = function() {
    assert(arguments.length===0);
    this.scan();
};

/** Prototype */
CLI.CommandFactory.prototype = {
   /**
    * Map of module name to namespace (CLI.Module) where commands are found.
    * @type Object
    * @private
    */
   module2descr: {},
   /**
    * Array of known command names.
    * @type String
    * @private
    */
   keywords: [],
   /**
    * Map of keyword to command factory method (i.g. its class name).
    * @type Object
    * @private
    */
   keyword2factory: {},

   /**
    * Build up this.keywords and this.keyword2factory to keep all known commands.
    * @private
    */
   scan: function() {
       this.keywords = [];
       this.keyword2factory = {};
       var matches, factory, keyword, cmdname;
       for (cmdname in CLI.Builtins) {
       	   matches = /(.+)Command$/.exec(cmdname);
       	   if (matches) {
       	       factory = "CLI.Builtins." + cmdname;
       	       keyword = camel2snakeCase(matches[1]); 
       	       this.register(keyword, factory);
       	   }
       }
       for (var module in this.module2descr) {
	   var descr = this.module2descr[module];
	   for (cmdname in descr.obj) {
	       matches = /(.+)Command$/.exec(cmdname);
	       if (matches) {
	           factory = descr.namespace + "." + cmdname;
                   keyword = module.toLowerCase() + '-' + camel2snakeCase(matches[1]);
	           this.register(keyword, factory);
	       }
	   }
       }
       this.register('?', "CLI.Builtins.UsageCommand");
   },
   
   /**
    * Register a command for the given keyword by specifying the name of its constructor. The shell
    * issues 'new -factoryName-()' to create a command instance. See
    * CLI.Command for the interface of a command.
    * @param keyword       Keyword to use for command
    * @param factoryName   Function name of command constructor (the class name of the command)
    * @private
    */
   register: function(/** String */keyword, /** String */factoryName) {
       if (this.keyword2factory[keyword]) {
	   throw "Command already registerd: " + keyword;
       }
       this.keywords.push(keyword);
       this.keywords = this.keywords.sort(function(a,b) {
           return (a < b) ? -1 : ((a > b) ? 1 : 0);
       });
       this.keyword2factory[keyword] = factoryName;
   },

   /**
    * Instantiate command by guessing it. Returns array of guesses, null (if no command is applicable)  or
    * instantiated command if command could be uniquely identified and instantiated.
    * @param s     Possible command name
    * @param shell The shell object issuing this command
    * @returns {CLI.Command|String[]}
    * @private
    */
   instantiateCommand : function(/** String */s, /** CLI.Shell */shell) {
      var guesses = CLI.guessKeyword(s, this.keywords, '-');
      if (guesses.length != 1) {
	 if (guesses.length==0) {
	    return null;
	 } else {
	    return guesses;
	 }
      }
      var keyword = guesses[0];
      var fn = this.keyword2factory[keyword];
      assert(fn, "Missing command: " + keyword);
      var cmd = Blob.instantiate(fn, [ shell, keyword]);
      assert(cmd.exec, "Missing exec method in command object");
      return cmd;
   },

   /**
    * @returns {Object[]} An array of objects with  'command' (command name) and 'description' (the command usage)
    */
   getInfo: function(/** CLI.Shell */shell) {
      var ret = [];
      for (var i = 0; i < this.keywords.length; i++) {
	 var keyword = this.keywords[i];
	 var cmd = this.instantiateCommand(keyword, shell);
	 assert(cmd && !(cmd instanceof Array));
	 var env = new GetOpt.Env([]);
	 cmd.parser.print(env, GetOpt.PrintMode.MNEMO);
	 var descr = keyword + ' ' + env.pb.toString();
	 ret.push({ command: keyword, description: descr });
      }
      return ret;
   },

   
   /**
    * @returns {Object} Map of keyword (String) to instantiated command (CLI.Command).
    * @private
    */
    getCommands: function(/** CLI.Shell */shell) {
       var ret = {};
       for (var i = 0; i < this.keywords.length; i++) {
	  var keyword = this.keywords[i];
	  var cmd = this.instantiateCommand(keyword, shell);
	  assert(cmd && !(cmd instanceof Array));
	  ret[keyword] = cmd;
      }
      return ret;
   },

    
   /**
    * Returns array of available command names.
    * @returns {String[]} Array of available command names.
    */
    getCommandNames: function() {
        return this.keywords;
   },


    /**
     * Returns the command factory name, i.e. the name of the constructor function of the command.
     * @param keyword
     * @returns {String} The command factory name, i.e. the name of the constructor function of the command
     */
    getCommandFactory: function(/** String */keyword) {
        return this.keyword2factory[keyword];
   },


    /**
     * Returns whether the specified keyword points to a builtin command
     * @param keyword
     * @returns {Boolean} Whether the specified keyword points to a builtin command
     * @private
     */
    isBuiltinCommand: function(/** String */keyword) {
        var factory = this.keyword2factory[keyword];
        if (!factory) {
            return false;
        }
        return /\.Builtins\./.test(factory);
    },
    
    
    /**
     * Add module and its commands. The command factory scans all classes in the
     * specified namespace for command classes and adds them. Command classes
     * are namespace properties pointing to constructor functions and ending in 'Command'.
     * <pre>
     * CLI.commandFactory.addModule("CLI.Commands.Event");
     * </pre>
     * @param namespace  Namespace where commands can be found
     * @param hidden     Do not list in shell
     */
    addModule: function(/** String */namespace, /** Boolean */hidden) {
	var sa = namespace.split('.');
	if (!sa || sa.length<1) {
	    throw "Invalid namespace: " + namespace;
	}
	var module = sa[sa.length-1];
	var obj = undefined;
	try {
	    obj = Blob.peek(namespace);
	} catch(ex) {
	    throw "Invalid Javascript namespace: " + ex;
	}
	if (!obj || typeof(obj) !== 'object') {
	    throw "Invalid Javascript namespace: " + namespace;
	}
	var m = new CLI.Module(namespace, module, obj, hidden);
	this.module2descr[module] = m;
	this.scan();
    },


    
   /**
    * Returns array of module names
    * @returns {String[]} Array of module names
    */
    getModuleNames: function() {
        var ret = [];
        for (var module in this.module2descr) {
            ret.push(module);
        }
        ret = ret.sort(function(a,b) {
            return (a < b) ? -1 : ((a > b) ? 1 : 0);
        });
        return ret;
   },


   /**
    * @param name Module name
    * @returns {CLI.Module}
    * @private
    */
    getModuleInstance: function(/** String */name) {
	for (var n in this.module2descr) {
	    var obj = this.module2descr[n];
	    if (n.toLowerCase() === name.toLowerCase()) {
		return obj;
	    }
	}
	return null; 
   },


    
   /**
    * Lookup the command names available for the module specified by name.
    * @param name Module name such as MOMA
    * @returns {String[]} Array of command names
    */
   getModuleCommands: function(/** String */name) {
	for (var n in this.module2descr) {
	    var descr = this.module2descr[n];
	    if (n.toLowerCase() !== name.toLowerCase()) {
		continue;
	    }
	     var ret = [];
             for (var cmdname in descr.obj) {
		 var matches = /(.+)Command$/.exec(cmdname);
		 if (matches) {
		     var kw = name.toLowerCase()+'-'+camel2snakeCase(matches[1]);
		     ret.push(kw);
		 }
             }
	     return ret;
	}
   },
		



   /**
    * Parse command line and instantiate command ready for execution.
    * @param shell
    * @param argv
    * @param module
    * @returns CLI.Command ready to call exec on or null if no command given in args
    * @throws {Object} in case command is ambigious or could not be instantiated
    * @private
    */
    parseCommand: function(/** CLI.Shell */shell, /** String */argv, /** String */module) {
       var arg = argv[0];
       var guesses = CLI.guessKeyword(arg, this.keywords, '-');    
       if (guesses.length==0) {
	   return null;
       }
       if (guesses.length>1) {
           var txt = sprintf("Ambiguous command '%s', possible completions:\n%s", arg, guesses.join("\n"));
           throw txt;
       }
       var cmdName = guesses[0];
       var fn = this.keyword2factory[cmdName];
       assert(fn);
       var cmd = Blob.instantiate(fn, [ shell, cmdName ]);
       return cmd;
   }
};




/**
 * The default command factory for sonoran commands. Any instantiated shell without a specific
 * command factory uses this instance to search for and create commands. Use 'addModule'
 * to add all command classes of a namespace to the command factory.
 * <pre>
 * CLI.commandFactory.addModule("CLI.Commands.Event");
 * </pre>
 * @type CLI.CommandFactory
 */
CLI.commandFactory = new CLI.CommandFactory();





