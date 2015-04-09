//  (C) COPYRIGHT INTERNATIONAL BUSINESS MACHINES CORPORATION 2006-2010
//                       ALL RIGHTS RESERVED
//        IBM Research Division, Zurich Research Laboratory
// --------------------------------------------------------------------

/**
 * Implements builtin shell commands.
 * @namespace CLI.Builtins 
 * @private
 */
CLI.Builtins = {};

CLI.Builtins.DESCRIPTION = 
    "Shell builtin commands:\n" +
    "Use 'help' to print command help.\n" + 
    "Use 'usage' to print command usage.\n" + 
    "Use 'apropos' to search for command.\n" + 
    "Use 'close' to close connection to Sonoran.\n" +
    "Use 'source' to source a mrsh or Javascript script.\n" +
    "Use 'echo' to echo text.\n" +
    "Use 'eval' to evaluate a Javascript line.\n" +
    "Use 'history' to show shell history.\n"+
    "Use 'register' to register a command in the shell.\n" +
    "Use 'list-vars' and 'set-var' to list and manipulate shell variables.\n" +
    "Use 'option' to list or manipulate a option.\n" +
    "Use 'bg' to list the commands executed in the background.\n";


/**
 * @private
*/
CLI.Builtins.USAGE = "Shell builtin commands";


/**
 * @class 
 * @constructor
 * @param shell
 * @param name
 * @private
 */
CLI.Builtins.HelpCommand = function(/** CLI.Shell */shell, /** String */name) {
    this.description =
	"Print help. Use \"help 'command'\" to print help for a command 'command'. Print general\n"+
	"help if no command name is given.";
    this.restOfArgs = new GetOpt.RestOfArgs("command", "Optional, print help for given command.");
    CLI.Command.call(this, shell, name, [ this.restOfArgs ]);
};

/** Prototype */
CLI.Builtins.HelpCommand.prototype = extend(
    CLI.Command.prototype,
    {
       /** @ignore */
	exec: function(callback) {
	    var shell = this.shell;
	    var commandFactory = shell.commandFactory;
	    var ra = this.restOfArgs.getRestArgs();
	    var txt;
	    if (ra.length == 0) {
	       txt = "Use 'help builtins' to get a list of all available builtin commands (such as help) and their short usage.\n";
	       txt += "Use 'help commands' to get a list of all available mote runner commands and their short usage.\n";
	       txt += "Use 'help <command-name>' for command details. Example: 'help mote-create'.\n";
	       txt += "Use 'help modules' to get a list of command classes and short description.\n";
	       txt += "Use 'help <module-name>' for more information about a command class. Example: 'help MOMA'.\n";
               txt += "Use '? <command-name>' for command usage. Example: '? mote-create'.";
	       callback(new AOP.OK(txt));
	       return;
	    }
	    var name = ra[0];
	    if (name === 'modules') {
		var modules = commandFactory.getModuleNames();
                txt = "Available command modules:\n";
                for (var i = 0; i < modules.length; i++) {
                    var module = modules[i];
                    var obj = commandFactory.getModuleInstance(module);
		    if (obj && !obj.hidden) {
			txt += sprintf("%-15s %s\n", module.toLowerCase()+":", obj.namespace);
		    }
                }
	    } else if ((name === 'builtins') || (name === 'commands')) {
                var showBuiltins = (name === 'builtins');
                txt = "Commands and short usage:\n";
	        var commands = commandFactory.getCommandNames();
	        var max = 0;
                for (var i = 0; i < commands.length; i++) {
                    var kw = commands[i];
                    if (showBuiltins ^ commandFactory.isBuiltinCommand(kw)) continue;
		    var l = kw.length;
		    if(l > max) max = l;
                }
                for (var i = 0; i < commands.length; i++) {
                    var kw = commands[i];
		    var sa = kw.split('-');
		    if (sa && sa.length>0) {
			var module = commandFactory.getModuleInstance(sa[0]);
			if (module && module.hidden) {
			    continue;
			}
		    }
                    if (showBuiltins ^ commandFactory.isBuiltinCommand(kw)) continue;
                    var cmd = commandFactory.instantiateCommand(kw, shell);
                    var env = new GetOpt.Env([]);
	            cmd.parser.print(env, GetOpt.PrintMode.MNEMO);
                    txt += sprintf("%-*s %s\n", max, kw, env.pb.toString());
                }
                txt += "\n";
            } else {
		var _this = this;
		var resolveModule = function(name) {
		    if (name.indexOf('-') !== -1) {
			return null;
		    }
		    var obj = commandFactory.getModuleInstance(name);
		    if (!obj) {
			return null;
		    }
		    var txt = "";
		    var kws = commandFactory.getModuleCommands(name);
		    if (kws.length === 0) {
			txt += "No command declared in module '"  + name + "'\n";
		    } else {
			kws.forEach(function(kw) {
			    var cmd = commandFactory.instantiateCommand(kw, shell);
			    var env = new GetOpt.Env([]);
			    cmd.parser.print(env, GetOpt.PrintMode.MNEMO);
			    txt += sprintf("%-30s %s\n", kw, env.pb.toString());
			});
                    }
		    return txt;
		};
		var cmd = commandFactory.instantiateCommand(name, shell);
		if (!cmd) {
		    txt = resolveModule(name);
		    if (!txt) {
			txt = "Unknown command/module '"+name +"'";
                    }
               } else if (cmd instanceof Array) {
		   txt = resolveModule(name);
		   if (!txt) {
		     txt = "Ambiguous command '"+name+"': ";
		     txt += cmd.join(",");
                  }
	       } else {
		  var env = new GetOpt.Env(null);
		  env.pb.insert("Usage: ");
		  cmd.parser.print(env,GetOpt.PrintMode.SHORT);
		  env.pb.assertBegLine();
		  var mode = GetOpt.PrintMode.DETAILS;
		  if( mode==GetOpt.PrintMode.DETAILS ) {
		     env.pb.assertEmptyLine();
		     cmd.parser.print(env,mode);
		     if(  cmd.description != null ) {
			env.pb.assertEmptyLine();
			env.pb.insert(cmd.description);
			env.pb.assertBegLine();
    		     }
		  }
		  txt = env.pb.toString();
	       }
            }
	    callback(new AOP.OK(txt));
	}
    }
);




/**
 * Apropos command 
 * @class 
 * @constructor
 * @param shell
 * @param name
 * @private
 */
CLI.Builtins.AproposCommand = function(/** CLI.Shell */shell, /** String */name) {
    this.description =
	"Search command help and print command names where specified parameter appears.";
    this.rebuildOpt = new GetOpt.Option('r', '--rebuild', 0, null, "Rebuild index.");
    var optSet = new GetOpt.OptionSet([ this.rebuildOpt ]);
    this.restOfArgs = new GetOpt.RestOfArgs("...", "Search terms.");
    CLI.Command.call(this, shell, name, [ optSet, this.restOfArgs ]);
};

/**
 * @private
 */
CLI.Builtins.AproposCommand.DB = null;
   
/** Prototype */
CLI.Builtins.AproposCommand.prototype = extend(
    CLI.Command.prototype,
    {
       /** @private */
	exec: function(callback) {
           if (CLI.Builtins.AproposCommand.DB==null || this.rebuildOpt.isSet()) {
              CLI.Builtins.AproposCommand.DB = {};
              var db = CLI.Builtins.AproposCommand.DB;
              var commands = this.shell.commandFactory.getCommandNames();
              for (var i = 0; i < commands.length; i++) {
                 var kw = commands[i];
                 if (/^debug/.test(kw)) {
                    continue;
                 }
                 var cmd = this.shell.commandFactory.instantiateCommand(kw, this.shell);
                 var env = new GetOpt.Env([]);
	         cmd.parser.print(env, GetOpt.PrintMode.SHORT);
                 var txt = kw + " ";
                 txt += " " + env.pb.toString();
                 env = new GetOpt.Env(null);
		 cmd.parser.print(env,GetOpt.PrintMode.SHORT);
		 txt += " " + env.pb.toString();
                 db[kw] = txt;
              }
           }
           var roa = this.restOfArgs.getRestArgs();
           if (roa.length==0) {
               callback(new AOP.OK("No search terms given."));
               return;
           }
           var res = [];
           for (var i = 0; i < roa.length; i++) {
              res.push(new RegExp(roa[i]));
           }
           var db = CLI.Builtins.AproposCommand.DB;
           var kws = [];
           for (var kw in db) {
              var txt = db[kw];
              var i = 0;
              for (; i < res.length; i++) {
                 if (!res[i].test(txt)) {
                    break;
                 }
              }
              if (i == res.length) {
                 kws.push(txt);
              }
           }
           var txt;
           if (kws.length>0) {
              txt = sprintf("Found %d matches:\n%s", kws.length, kws.join("\n"));
           } else {
              txt += "No matches found.";
           }
           callback(new AOP.OK(txt));
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
CLI.Builtins.UsageCommand = function(/** CLI.Shell */shell, /** String */name) {
    this.description = "Print usage, a short synopsis of how to invoke a command.";
    this.restOfArgs = new GetOpt.RestOfArgs("command", "Print command usage.");
    CLI.Command.call(this, shell, name, [ this.restOfArgs ]);
};

/** Prototype */
CLI.Builtins.UsageCommand.prototype = extend(
    CLI.Command.prototype,
    {
       /** @private */
	exec: function(callback) {
	   var ra = this.restOfArgs.getRestArgs();
	   if (ra.length == 0) {
	   	// Same as this command:
	   	this.shell.execArgv(["help","commands"],callback);
	   	return;
	   }
	   var name = ra[0];
	   var txt;
	   var cmd = this.shell.commandFactory.instantiateCommand(name, this.shell);
	    if (cmd == null) {
		txt = "Unknown command '"+name;
	    } else if (cmd instanceof Array) {
		txt = "Ambiguous command '"+name+"': ";
		txt += cmd.join(",");
	    } else {
		var env = new GetOpt.Env(null);
		//env.pb.insert(cmd.name);
		cmd.parser.print(env,GetOpt.PrintMode.SHORT);
		txt = env.pb.toString();
	    }
	    callback(new AOP.OK(txt));
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
CLI.Builtins.CloseCommand = function(/** CLI.Shell */shell, /** String */name) {
   this.description =
      "Close shell, only affects telnet connections. Use 'quit' to exit this process.";
    CLI.Command.call(this,  shell, name);
};

/** @private */
CLI.Builtins.CloseCommand.prototype = extend(
   CLI.Command.prototype,
   {
      /** @private */
      exec: function(callback) {
	 this.shell.close();
         callback(new AOP.OK());
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
CLI.Builtins.SourceCommand = function(/** CLI.Shell */shell, /** String */name) {
    this.description =
	"Source a moterunner or javscript script. The name of the script must end in .js or .mrsh. If\n" +
	"file is given without suffix, the command first looks for the javascript and then for the\n" +
	"mrsh variant. One can specify an absolute path or relative path to the current working \n" +
	"directory.";
    this.verboseOpt = new GetOpt.Option("v", "--verbose", 0, null, "Verbose execution.");
    this.restOfArgs = new GetOpt.RestOfArgs("paras", "Script parameters if script is Javascript.");
    var optSet = new GetOpt.OptionSet([ this.verboseOpt ]); 
    this.fileSpec = new GetOpt.Simple("script");
    CLI.Command.call(this, shell, name, [ optSet, this.fileSpec, this.restOfArgs ]);
};

/** @private */
CLI.Builtins.SourceCommand.prototype = extend(
    CLI.Command.prototype,
    {
       /** @private */
	exec: function(callback) {
	    var fn = this.fileSpec.getArg();
	    if( this.shell.toString() == "CLI.HTTP.Shell" ) {
		// If web front end of mrshell then return file contents for single stepping
		try {
		    var contents = IO.File.readFully(fn);
		    callback(CLI.MRShell.mrshellAOP({cmd:      "mrshell-source",
						     filename: fn,
						     contents: contents}));
		    return;
		} catch (ex) { }
		// FALL THRU
	    }
	    var options = undefined;
	    if (this.verboseOpt.isSet()) {
		options = { verbose: true };
	    }
	    this.shell.execFile(fn, this.restOfArgs.getRestArgs(), options, callback);
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
CLI.Builtins.EchoCommand = function(/** CLI.Shell */shell, /** String */name) {
    this.description = "Echo specified text on standard out.";
    this.restOfArgs = new GetOpt.RestOfArgs("text", "Text to echo");
    CLI.Command.call(this, shell, name, [ this.restOfArgs ]);
};

/** @private */
CLI.Builtins.EchoCommand.prototype = extend(
   CLI.Command.prototype,
   {
      /** @private */
      exec: function(callback) {
	 var txt = this.restOfArgs.getRestArgs().join(' ');
	 this.shell.println(txt);
	 callback(new AOP.OK());
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
CLI.Builtins.EvalCommand = function(/** CLI.Shell */shell, /** String */name) {
    this.description = "Evaluate remainder of line as Javascript code";
    this.restOfArgs = new GetOpt.RestOfArgs("code", "Javascript code to evaluate");
    CLI.Command.call(this, shell, name, [ this.restOfArgs ]);
};

/** @private */
CLI.Builtins.EvalCommand.prototype = extend(
   CLI.Command.prototype,
   {
      /** @private */
      exec: function(callback) {
	 var txt = this.restOfArgs.getRestArgs().join(' ');
          try {
              var obj = eval(txt);
              callback(new AOP.OK("eval() returned: " + obj));
          } catch (x) {
              callback(new AOP.ERR("eval() failed: " + x));
          }
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
CLI.Builtins.HistoryCommand = function(/** CLI.Shell */shell, /** String */name) {
    this.description = "Show shell history.";
    CLI.Command.call(this, shell, name);
};

/** @private */
CLI.Builtins.HistoryCommand.prototype = extend(
   CLI.Command.prototype,
   {
      /** @private */
      exec: function(callback) {
         var hbuf = this.shell.historyBuf;
         if (hbuf.getUsed() > 0) {
             hbuf.pop();
            this.shell.historyId -= 1;
         }
         var arr = [];
         for (var i = 0; i < hbuf.getUsed(); i++) {
            var ele = hbuf.get(i);
            arr.push(sprintf("%3d: %s", ele.id, ele.line));
         }
         callback(new AOP.OK(arr.join("\n")));
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
CLI.Builtins.ListVarsCommand = function(/** CLI.Shell */shell, /** String */name) {
    this.description = "List all defined variables.";
    CLI.Command.call(this, shell, name);
};

/** @private */
CLI.Builtins.ListVarsCommand.prototype = extend(
   CLI.Command.prototype,
   {
       /** @private */
       exec: function(callback) {
           var t = new Formatter.Table2(2);
	   t.setTitle("Name", "Variable");
	   var y = 0;
           for (var n in this.shell.var2value) {
	       var v = this.shell.var2value[n];
	       t.setValue(0, y, n);
	       t.setValue(1, y, v);
	       y += 1;
           }
           callback(new AOP.OK(t.render().join("\n")));
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
CLI.Builtins.SetVarCommand = function(/** CLI.Shell */shell, /** String */name) {
   this.description =
        "Define a value for a variable or use '-d' to delete a variable definition. Examples:\n" +
        "set-var var1 ksksksk\n" +
        "set-var var2 100\n" +
        "echo ${var2}\n" +
	"\n" +
	"Builtin variables:\n" +
	"HOSTNAME   String:     name of host machine\n" +
	"verbose    true/false: verbose mode of shell";
    this.delOpt  =  new GetOpt.Option("d", "--delete", 0, null, "Delete specified variable");
    this.leaveOpt  =  new GetOpt.Option("l", "--leave", 0, null, "Do not overwrite if variable already exists");
    this.evalOpt =  new GetOpt.Option("e", "--eval", 0, null,
				      "Value is evaluated as Javascript expression\n"+
				      "and the result is assigned.");
    var optSet = new GetOpt.OptionSet([ this.delOpt, this.evalOpt, this.leaveOpt ]);
    this.nameSpec = new GetOpt.Identifier(CLI.Shell.VAR_NAME_REGEXP, "name", "Variable name");
    this.valueSpec = new GetOpt.Simple("value", "Variable value");
    CLI.Command.call(this, shell, name, [ optSet, this.nameSpec, this.valueSpec ], 1);
};

/** @private */
CLI.Builtins.SetVarCommand.prototype = extend(
   CLI.Command.prototype,
   {
       /** @private */
       exec: function(callback) {
           var name = this.nameSpec.getIdentifier();
           var value = this.valueSpec.getArg();
           if (this.delOpt.isSet()) {
               this.shell.delVar(name);
           } else {
               if (!value) {
                   callback(new AOP.ERR("Missing value for variable"));
                   return;
               }
	       if (this.evalOpt.isSet()) {
		   value = eval(value);
	       }
	       if (value != null) {
		   if (!this.leaveOpt.isSet() || (this.shell.getVar(name)===undefined)) {
		       this.shell.setVar(name, value.toString());
		   }
	       }
           }
           callback(new AOP.OK());
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
CLI.Builtins.OptionCommand = function(/** CLI.Shell */shell, /** String */name) {
    this.description = "Query and set option database. Options are used to tweak system behavior.";
    this.optValue = new GetOpt.Simple("value", "If present set the option to this value.");
    this.optSpec = new GetOpt.Simple("optspec", "Part of the name of an option.");
    this.argSeq = new GetOpt.Seq([this.optSpec, this.optValue], 0);
    CLI.Command.call(this, shell, name, [ this.argSeq ]);
};

/** @private */
CLI.Builtins.OptionCommand.prototype = extend(
    CLI.Command.prototype,
    {
	/** @private */
	exec: function (callback) {
	    var names = OPTIONS.getNames();
	    var n = this.argSeq.argsPresent();
	    if( n >= 1 ) {
		var filter = this.optSpec.getArg().toLowerCase();
		var filtered = [];
		for( var i=0; i<names.length; i++ ) {
		    if( names[i].toLowerCase().indexOf(filter) >= 0 )
			filtered.push(names[i]);
		}
		if( filtered.length==0 ) {
		    callback(new AOP.ERR("No such option: " + filter));
		    return;
		}
		if( n==2 ) {
		    if( filtered.length > 1 ) {
			callback(new AOP.ERR("Option `"+filter+"' is ambiguos - cannot set value."));
			return;
		    }
		    var ex, value = this.optValue.getArg();
		    var opt = OPTIONS.get(filtered[0]);
		    if( opt.type == 'bool' ) {
			if( !value.match(/^(true|false)$/) ) {
			    callback(new AOP.ERR("Wrong value for option `"+opt.name+"': true | false"));
			    return;
			}
			value = eval(value);
		    }
		    else if( opt.type == 'int' ) {
			if( !value.match(/^(0x[0-9a-f]+|-?[0-9]+)$/i) ) {
			    callback(new AOP.ERR("Wrong value for option `"+opt.name+"': Specify an integer value (hex or decimal)"));
			    return;
			}
			value = parseInt(value);
		    }
		    else if( opt.type == 'string' ) {
			// NOP
		    } else {
			try {
			    value = eval(value);
			} catch (ex) {}
		    }
		    // XXX: Check type!!
		    OPTIONS.setValue(filtered[0], value);
		    callback(new AOP.OK());
		    return;
		}
		names = filtered;
	    }
	    var t = new Util.Formatter.Table2(4);
	    for( var i=0; i<names.length; i++ ) {
		var opt = OPTIONS.get(names[i]);
		t.setValue(0,i,opt.name);
		t.setValue(1,i,sprintf("(%s)", opt.type));
		t.setValue(2,i,sprintf("%s", opt.get()));
		t.setValue(3,i,opt.description||"");
	    }
            callback(new AOP.OK(t.render().join("\n")));
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
CLI.Builtins.BGCommand = function(/** CLI.Shell */shell, /** String */name) {
    this.description = 
	"Prints information about commands running in the background.\n" +
	"The shell puts commands exceeding a certain time limit autmatically into the background.\n" +
	"Use 'opt CLI.Shell.BG_TIMEOUT 10000' to modify the time limit.\n" +
	"With 'log-conf -i SHELL INFO' the shell immediately dumps the results of commands performed\n" +
	"in the background, 'bg' may not be invoked then.";
    CLI.Command.call(this, shell, name, [ new GetOpt.EndOfArgs() ]);
};

/** @private */
CLI.Builtins.BGCommand.prototype = extend(
    CLI.Command.prototype,
    {
	/** @ignore */
	exec: function (callback) {
	    var commands = this.shell.bgCommands.strip();
	    callback(new AOP.OK(commands.join("\n")));
	}
    }
);










/**
 * @class 
 * @constructor
 * @param shell
 * @param name
 * @param expr
 * @private
 */
CLI.Builtins.JavascriptCommand = function(/** CLI.Shell */shell, /** String */name, /** String */expr) {
    this.description =  
	"Execute Javascript code. Use ' with following Javascript code to " +
	"execute Javascript code directly in the shell.";
    CLI.Command.call(this, shell, name, [ new GetOpt.EndOfArgs() ]);
    this.expr = expr;
};

/** @private */
CLI.Builtins.JavascriptCommand.prototype = extend(
    CLI.Command.prototype,
    {
	/** @private */
	exec: function (callback) {
	    var ret = CLI.Shell.Javascript.exec(this.expr, this.shell);
	    callback(new AOP.OK(Util.formatData(ret)));
	}
    }
);



