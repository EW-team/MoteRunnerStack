
CLI.Builtins.DESCRIPTION += 
    "Use 'help' to print command help.\n" + 
    "Use 'usage' to print command usage.\n" + 
    "Use 'apropos' to search for command.\n" + 
    "Use 'close' to close connection to Sonoran.\n" +
    "Use 'pause' to wait for user input.\n"+
    "Use 'sleep' to wait for timeout.\n"+
    "Use 'cd' and 'pwd' to manipulate and list the current working directory.\n" +
    "Use 'ls' to list a directory.\n" +
    "Use 'jobs' to list running Javascript jobs.\n" +
    "Use 'sh' to execute a sub process.\n";





/**
 * @class 
 * @constructor
 * @param shell
 * @param name
 * @private
 */
CLI.Builtins.QuitCommand = function(/** CLI.Shell */shell, /** String */name) {
    this.description = "Quit moterunner shell and process.";
    CLI.Command.call(this, shell, name);
};

/** @private */
CLI.Builtins.QuitCommand.prototype = extend(
   CLI.Command.prototype,
   {
      /** @ignore */
      exec: function(callback) {
	 this.shell.exit(0);
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
CLI.Builtins.DebuggerCommand = function(/** CLI.Shell */shell, /** String */name) {
    this.description = "Drop into debugger.";
    CLI.Command.call(this, shell, name);
};

/** @private */
CLI.Builtins.DebuggerCommand.prototype = extend(
   CLI.Command.prototype,
   {
      /** @ignore */
      exec: function(callback) {
	  debugger;
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
CLI.Builtins.PauseCommand = function(/** CLI.Shell */shell, /** String */name) {
    this.description = "Pause until line is read from stdin.";
    this.restOfArgs = new GetOpt.RestOfArgs("...", "Any text");
    CLI.Command.call(this, shell, name, [ this.restOfArgs ]);
};

/** @private */
CLI.Builtins.PauseCommand.prototype = extend(
   CLI.Command.prototype,
   {
      /** @ignore */
      exec: function(callback) {
	 var _this = this;
          var restOfArgs = this.restOfArgs.getRestArgs();
          if (restOfArgs.length>0) {
              this.shell.println(restOfArgs.join(' '));
          }
	 this.shell.readln(function(line) {
	    callback(new AOP.OK(line));
	 });
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
CLI.Builtins.SleepCommand = function(/** CLI.Shell */shell, /** String */name) {
    var dflt = "1000ms";
    this.description = "Sleep specified amount of time. Without time span sleep "+dflt+".";
    this.nSpec = new GetOpt.TimespanSpec(dflt, "Time to sleep.");
    CLI.Command.call(this, shell, name, [ this.nSpec ], 0);
};

/** @private */
CLI.Builtins.SleepCommand.prototype = extend(
   CLI.Command.prototype,
   {
      /** @ignore */
      exec: function(callback) {
	 var _this = this;
         Timer.timeoutIn(this.nSpec.getSpan(), function() {
			     Thread.start(function() {
					      callback(new AOP.OK());
					  });
			 });
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
CLI.Builtins.cdCommand = function(/** CLI.Shell */shell, /** String */name) {
    this.description = "Change current working directory.";
    this.dirSpec = new GetOpt.Simple("directory", "Name of directory.");
    CLI.Command.call(this, shell, name, [ this.dirSpec, new GetOpt.EndOfArgs() ]);
};

/** @private */
CLI.Builtins.cdCommand.prototype = extend(
   CLI.Command.prototype,
   {
       /** @ignore */
       exec: function(callback) {
           try {
               IO.File.chdir(this.dirSpec.getArg());
           } catch (x) {
               callback(new AOP.ERR("Cannot change directory: " + x));
               return;
           }
           callback(new AOP.OK(IO.File.getcwd()));
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
CLI.Builtins.pwdCommand = function(/** CLI.Shell */shell, /** String */name) {
    this.description = "Print current working directory.";
    CLI.Command.call(this, shell, name);
};

/** @private */
CLI.Builtins.pwdCommand.prototype = extend(
   CLI.Command.prototype,
   {
       /** @ignore */
       exec: function(callback) {
           callback(new AOP.OK(IO.File.getcwd()));
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
CLI.Builtins.lsCommand = function(/** CLI.Shell */shell, /** String */name) {
    this.description = "Print contents of given directory, if no argument is given, of current working directory.";
    this.dirSpec = new GetOpt.Simple("directory", "Name of directory.");
    CLI.Command.call(this, shell, name, [ this.dirSpec, new GetOpt.EndOfArgs() ], 0);
};

/** @private */
CLI.Builtins.lsCommand.prototype = extend(
   CLI.Command.prototype,
   {
       /** @ignore */
       exec: function(callback) {
           var dir = this.dirSpec.getArg();
           if (!dir) {
               dir = IO.File.getcwd();
           }
           if (!IO.File.isDir(dir)) {
               callback(new AOP.ERR("No such directory: " + dir));
               return;
           }
           var filenames = IO.File.listDir(dir);
           var table = new Util.Formatter.Table2(4);
           table.setTitle("Name", "Size", "Modified", "Accessed");
           for (var i = 0; i < filenames.length; i++) {
               var path = dir + '/' + filenames[i];
               var stats = IO.File.stat(path);
               table.setValue(0, i, filenames[i]);
               table.setValue(1, i, stats.size);
               var d = new Date(stats.mtime);
               var s = sprintf("%02d:%02d:%02d", d.getHours(), d.getMinutes(), d.getSeconds());
               table.setValue(2, i, s);
               var d = new Date(stats.atime);
               var s = sprintf("%02d:%02d:%02d", d.getHours(), d.getMinutes(), d.getSeconds());
               table.setValue(3, i, s);
           }
           callback(new AOP.OK(table.render().join("\n")));
       }
   }
);



// /**
//  * @class
//  * @constructor
//  * @param shell
//  * @param name
//  * @private
//  */
// CLI.Builtins.JobsCommand = function(/** CLI.Shell */shell, /** String */name) {
//     this.description = 
// 	"Without parameter, lists running jobs.\n" +
// 	"With first parameter being a job id, the referenced job is terminated.\n" +
// 	"With first parameter being a function name, a job is created and started.\n" +
// 	"The first parameter must then be the name of the job on start function,\n" +
// 	"the second parameter must then be the name of the job on exit function,\n" +
// 	"all other parameters are passed on to the jobs on start function.";
//     var paraDescr = "Empty, job class or job id";
//     this.paraSpec = new GetOpt.Simple("job", paraDescr);
//     this.restOfArgs = new GetOpt.RestOfArgs("argv", "Job parameters in case a job is started.");
//     CLI.Command.call(this, shell, name, [ this.paraSpec, this.restOfArgs ], 0);
// };

// /** @private */
// CLI.Builtins.JobsCommand.prototype = extend(
//     CLI.Command.prototype,
//     {
// 	/** @ignore */
// 	exec: function (callback) {
// 	    var para = this.paraSpec.getArg();
// 	    if (para === null) {
// 		var txt = Job.Manager.toString();
// 		Job.Manager.prune();
// 		callback(new AOP.OK(txt));
// 		return;
// 	    }
// 	    if (/^\d+$/.test(para)) {
// 		var jid = parseInt(para);
// 		Job.Manager.exit(jid);
// 		callback(new AOP.OK());
// 		return;
// 	    }

// 	    var roa = [ para ].concat(this.restOfArgs.getRestArgs());
// 	    if (roa.length<2) {
// 		callback(new AOP.ERR("Missing parameters"));
// 		return;
// 	    }
// 	    var funcs = [];
// 	    for (var i = 0; i < 2; i++) {
// 		var name = roa.shift();
// 		try {
// 		    funcs[i] = Blob.peek(name);
// 		} catch(ex) {
// 		    callback(new AOP.ERR("Invalid job function: " + name));
// 		    return;
// 		}
// 		if (typeof(funcs[i]) !== 'function') {
// 		    callback(new AOP.ERR("Invalid job function: " + name));
// 		    return;
// 		}
// 	    }
// 	    var job = Job.Manager.create(funcs[0], undefined, roa, funcs[1]);
// 	    job.start();
// 	    callback(new AOP.OK(job));
// 	}
//     }
// );






/**
 * @class 
 * @constructor
 * @param shell
 * @param name
 * @private
 */
CLI.Builtins.ShCommand = function(/** CLI.Shell */shell, /** String */name) {
    this.description = 
	"Execute program and wait until its termination.\n" +
	"The option '-o' allows to specify a file receiving stdout (and stderr if '-e' is not used).n" +
	"Examples:\n" +
	"sh ls                                Execute 'ls' and dump its output in shell.\n" +
	"sh -o out.txt ls                     Execute 'ls' and dump stdout and stderr to out.txt.\n"+
	"sh -e stderr.txt ls                  Execute 'ls' and dump stdout to shell and stderr to stderr.txt.\n"+
	"sh -o stdout.txt -e stderr.txt ls    Execute 'ls' and dump stdout to stdout.txt and stderr to stderr.txt.";
    this.stdoutSpec = new GetOpt.FileSpec("stdout", "Filename to receive stdout (and stderr).", "stdout.txt", false);
    this.stderrSpec = new GetOpt.FileSpec("stderr", "Filename to receive stderr.", "stderr.txt", false);
    this.stdoutOpt = new GetOpt.Option("o", '--stdout', 0, null, null, this.stdoutSpec);
    this.stderrOpt = new GetOpt.Option("e", '--stderr', 0, null, null, this.stderrSpec);
    this.pathSpec = new GetOpt.Simple("path", "Path to program");
    this.restOfArgs = new GetOpt.RestOfArgs("argv", "Program parameters.");
    var optSet = new GetOpt.OptionSet([ this.stdoutOpt, this.stderrOpt ]);
    CLI.Command.call(this, shell, name, [ optSet, this.pathSpec, this.restOfArgs ]);
};

/** @private */
CLI.Builtins.ShCommand.prototype = extend(
    CLI.Command.prototype,
    {
	/** @ignore */
	exec: function (callback) {
	    var path = this.pathSpec.getArg();
	    var argv = this.restOfArgs.getRestArgs();
	    var stdoutFile, stderrFile;
	    if (this.stdoutOpt.isSet()) {
		try {
		    stdoutFile = IO.File.fopen(this.stdoutSpec.getPath(), "w");
		} catch (x) {
		    callback(new AOP.ERR(sprintf("Cannot open '%s' for writing: %s", this.stdoutSpec.getPath(), x)));
		    return;
		}
	    }
	    if (this.stderrOpt.isSet()) {
		try {
		    stderrFile = IO.File.fopen(this.stderrSpec.getPath(), "w");
		} catch (x) {
		    callback(new AOP.ERR(sprintf("Cannot open '%s' for writing: %s", this.stderrSpec.getPath(), x)));
		    return;
		}
	    }

	    var txt = "";
	    var onexitf = function(obj) {
		if (obj.pexitcode !== 0) {
		    txt += sprintf("%s: exit code '%d'", obj.ppath, obj.pexitcode);
		}
		if (stdoutFile) { IO.File.fclose(stdoutFile); }
		if (stderrFile) { IO.File.fclose(stderrFile); }
		callback(new AOP.OK(txt));
	    };
	    var onoutpf = function(obj) {
		var stderr = obj.stderr;
		var data = obj.pdata;
		assert(stderr!==undefined);
		if (stderr===true && stderrFile) {
		    IO.File.fwrite(stderrFile, data);
		} else if (stdoutFile) {
		    IO.File.fwrite(stdoutFile, data);
		} else {
		    txt += data;
		}
	    };
	    IO.Process.start(path, argv, onexitf, onoutpf);
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
CLI.Builtins.InvokeCommand = function(/** CLI.Shell */shell, /** Sonoran.CLI.Spec */cmdSpec, /** Boolean */newCallSemantics) {
    this.description = 
	"Helper command to call a Javascript function. Example:\n" +
        "MyShellFunc arg0 arg1                                 \n" +
	"...looks for the Javascript function...               \n" +
	"MyShellFunc = function(contex, arg0, arg1) { ... }    \n" +
	"... calls it and prints its result.";
    this.restOfArgs = new GetOpt.RestOfArgs("args", "Args for Javascript function.");
    CLI.Command.call(this, shell, cmdSpec, [ this.restOfArgs ]);
    this.funcThis = null;
    this.funcArgs = [];
    this.funcDst = null;
};

/** @private */
CLI.Builtins.InvokeCommand.prototype = extend(
   CLI.Command.prototype,
   {
       /** @ignore */
       exec: function(callback) {
	   var motes, mote, data;
	   var context = {
	       shell: this.shell
	   };
	   if (this.funcDst === null) {
	       var args = this.restOfArgs.getRestArgs();
	       var arr = CLI.Builtins.InvokeCommand.parseInvocation(args);
	       this.funcDst = arr[0];
	       this.funcThis = arr[1];
	       this.funcArgs = arr[2];
	   }
	   assert(this.funcArgs instanceof Array);
	   assert(typeof(this.funcDst) === 'function');
	   this.funcDst.call(this.funcThis, context, this.funcArgs);
	   callback(new AOP.OK(data));
       }
   }
);



/**
 * @param args
 * @param idx
 * @returns {Object}
 * @private
 */
CLI.Builtins.InvokeCommand.parseInvocation = function(/** String[] */args, /** Number */idx) {
    if (idx == null) { idx = 0; }
    var funcDst = Blob.peek(args[idx]);
    if (!funcDst || typeof(funcDst) !== 'function') {
	throw new Exception("No such function: " + args[idx]);
    }
    var funcThis = null;
    var off = args[idx].lastIndexOf('.');
    if (off >= 0) {
	var path = args[idx].substr(0, off);
	funcThis = Blob.peek(path);
    }
    var funcArgs = args.slice(idx + 1);
    return [ funcDst, funcThis, funcArgs ];
};










/**
 * @class 
 * @constructor
 * @param shell
 * @param name
 * @private
 */
CLI.Builtins.catCommand = function(/** CLI.Shell */shell, /** String */name) {
    this.description = "Dump file contents.";
    this.filenameSpec = new GetOpt.Simple("filename", "Name of file.");
    CLI.Command.call(this, shell, name, [ this.filenameSpec, new GetOpt.EndOfArgs() ]);
};

/** @private */
CLI.Builtins.catCommand.prototype = extend(
   CLI.Command.prototype,
   {
       /** @ignore */
       exec: function(callback) {
	   var fn = this.filenameSpec.getArg();
	   var txt;
           try {
               txt = IO.File.readFully(fn);
           } catch (x) {
               callback(new AOP.ERR(sprintf("Cannot read file '%s': %s", fn, x)));
	       return;
	   }
           callback(new AOP.OK(txt));
       }
   }
);

