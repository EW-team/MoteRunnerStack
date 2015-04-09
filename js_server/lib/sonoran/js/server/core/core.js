//  (C) COPYRIGHT INTERNATIONAL BUSINESS MACHINES CORPORATION 2006-2010
//                       ALL RIGHTS RESERVED
//        IBM Research Division, Zurich Research Laboratory
// --------------------------------------------------------------------

assert(HOME_PATH!=undefined);
assert(ARGV!=undefined);
assert(REPO_ROOT!=undefined);
assert(QUACK_LEVEL!=undefined);



/**
 * Assert function. If condition is not true, the message and stack trace is passed
 * to the system exception handler.
 * @param {Boolean} x   Condition
 * @param {String} msg  Optional, message
 */
function assert(x, msg) {
   if (!x) {
       msg = "assert failed" + (msg ? ": " + msg : "");
      QUACK(0, msg);
       try {
          throw new Error(msg);
       } catch(ex) {
	  SYSTEM_EXC_HANDLER(ex, msg);
       }
    }
}


/**
 * Log a message to standard out or to a file. A level 0 message is always logged to standard out.
 * The logging of higher levels depend on the quack-parameters Sonoran was started with.
 * @param {Number} level    >= 0
 * @param {String} tag      tag
 * @param {String} message  if undefined or null, tag is the message
 * @private
 */
function QUACK(/** Number */level, /** String */tag, /** String */message) {
    if (level > QUACK_LEVEL) {
        return;
    }
    assert(tag!=undefined);
    if (!message) {
        message = tag;
        tag = "Sonoran";
    }
    Runtime.quack(level, tag, message.toString());
}



//==================================================================================================
//
// Core
//
//==================================================================================================

/**
 * Core class.
 * @class
 * @static
 */
var Core = {
    /**
    * Id of process queue.
    * @constant
    * @private
    */
   PROC_QUEUE: 1,

   /**
    * Id of stdout queue.
    * @constant
    * @private
    */
   STDOUT_QUEUE: 2,

   /**
    * Id of stdin queue.
    * @constant
    * @private
    */
   STDIN_QUEUE: 3,

   /**
    * Id of timer queue.
    * @constant
    * @private
    */
   TIMER_QUEUE: 4,

   /**
    * Map of queue id to queue instance.
    * @private
    */
    qid2Queue: {},

    /**
     * The shell the Core started if requested.
     * @type CLI.Shell 
     * @private
     */
    shell: null,

    
   /**
    * @private
    */
   main: function() {
       Runtime.SCRIPT_PATHS = Runtime.SCRIPT_PATHS.concat(IO.FileUtils.parsePath(PROG_PARAMS.scriptPath));

      if (!PROG_PARAMS.noStdinFlag) {
          STDIN = new IO.StdinConnector();
	  var ioqueue = STDIN.ioqueue;
          Core.addQ(ioqueue, ioqueue.onBlob);
      }
      STDOUT = new IO.StdoutConnector();
      Core.addQ(STDOUT);
      
      IO.Process.queue.id = Core.PROC_QUEUE;
      Core.addQ(IO.Process.queue, IO.Process.queue.onBlob);

      Clock.queue.id = Core.TIMER_QUEUE;
      Core.addQ(Clock.queue, Clock.queue.onBlob); 

       IO.FAIO.install();

      if (PROG_PARAMS.verboseFlag) {
	 QUACK(0, sprintf("ARGV: %s\nREPO: %s\nARCH: %s\n", ARGV.join(","), REPO_ROOT, ARCH_NAME));
      }
       
       var path = REPO_ROOT+"/.arch";
       if (!File.exists(path)) {
	   var p = REPO_ROOT+"/bin/arch";
	   var a = null;
	   if( IO.File.isDir(p) ) {
	       p = IO.File.realpath(p).split(/\/|\\/);
	       if( p.length > 0 && p[p.length-1] != 'arch' )
		   a = p[p.length-1];
	   }
	   if( a == null )
	       printf("WARN: Could not find file '.arch' in '%s'. Continue with architecture '%s'\n", REPO_ROOT, ARCH_NAME);
	   ARCH_NAME = a;
       } else {
	   try {
	       var s = IO.File.readFully(REPO_ROOT+"/.arch");
	       ARCH_NAME = s.trim();
	   } catch (x) {
	       printf("WARN: Could not find file '.arch' in '%s'. Continue with architecture '%s'\n", REPO_ROOT, ARCH_NAME);
	   }
       }

       var binDir = Core.getBinDir();
       if (ARCH_NAME == 'macosx') {
	   path = IO.Process.getenv('DYLD_LIBRARY_PATH');
	   path = (path) ? (binDir+":"+path) : binDir;
	   IO.Process.setenv('DYLD_LIBRARY_PATH', path);
       } else if (ARCH_NAME == 'cygwin') {
	   path = IO.Process.getenv('LD_LIBRARY_PATH');
	   path = (path) ? (binDir+":"+path) : binDir;
	   IO.Process.setenv('LD_LIBRARY_PATH', path);
       } else if (ARCH_NAME == 'win32') {
	   path = IO.Process.getenv('PATH');
	   path = (path) ? (binDir+";"+path) : binDir;
	   IO.Process.setenv('PATH', path);
       } else if ((ARCH_NAME == 'linux') || (ARCH_NAME == 'linux64') || (/^arm/.test(ARCH_NAME))) {
	   path = IO.Process.getenv('LD_LIBRARY_PATH');
	   path = (path) ? (binDir+":"+path) : binDir;
	   IO.Process.setenv('LD_LIBRARY_PATH', path);
       } else {
	   throw "Missing initialization code for architecture: " + ARCH_NAME;
       }

       if (PROG_PARAMS.verboseFlag) {
	   QUACK(0, "Main", "ARGV:\n" + Util.formatData(ARGV));
       }

       if (PROG_PARAMS.noSonoran) {
	   if (ARGV.length == 0) {
               QUACK(0, "Missing name of script to execute. Use option -h/--help for help.");
               Runtime.exit(1);
           }
           var scriptname = ARGV[0];
           if (!/\.js$/.test(scriptname)) {
               scriptname += ".js";
           }
           ARGV.splice(0, 1);
	   Core.run(false, false, scriptname);
	   return;
       }

       var progName = PROG_NAME.replace(/\.exe$/, "");
       if (/mrsh$/.test(progName) || /sonoran$/.test(progName)) {
	   try {
	       Runtime.include(JS_ROOT_SERVER_DIR + "/sonoran/main.js");
           } catch (x) {
	       println(Runtime.dumpException(x, sprintf("Cannot start '%s'", progName)));
	       Runtime.exit(1);
           }
           return;
       }
       
       //var toolfn = JS_ROOT_SERVER_DIR + "/tool/" + progName + ".js"; 
       var toolfn = "tool/" + progName + ".js"; 
       if (Runtime.search(toolfn)) {
	   Core.run(false, false, toolfn);
           return;
       }


       var paths = [
	   JS_ROOT + "/" + progName + "/main.js",
	   REPO_ROOT + "/lib/" + progName + "/main.js",
	   REPO_ROOT + "/lrsc/lib/" + progName + "/main.js"
       ];
       for (var i = 0; i < paths.length; i++) {
	   path = paths[i];
	   //println(path);
	   if (IO.File.exists(path)) {
	       try {
		   Runtime.include(path);
               } catch (x) {
		   println(Runtime.dumpException(x, sprintf("Cannot source '%s'", path)));
		   Runtime.exit(1);
               }
               return;
	   }
       }

       println(sprintf("Cannot find Javascript files for '%s'", progName));
       Runtime.exit(1);
   },


   /**
    * Message from native code to JS queue.
    * @param qid
    * @param para
    * @private
    */
    onBlob: function(/** Number */qid, /** Object */para) {
      var ele = this.qid2Queue[qid];
      if (!ele) {
         return;
      }
      try {
         ele.func.call(ele.queue, para);   
      } catch (x) {
         println(Runtime.dumpException(x, "Javascript invocation failed: " + x));
      }
   },

   /**
    * Add a new queue. 
    * @returns {Number} allocated or used queue id
    * @private
    */
   addQ: function(/** Core.Queue */queue, /** Function */func) {
      var qid = queue.id;
       if (qid===undefined || qid < 0) {
	   qid = Runtime.allocQueue();
       }
       assert(qid>=0);
       assert(!this.qid2Queue[qid]);
       if (!func) {
	   func = queue.onBlob;
       }
       assert(func);
       this.qid2Queue[qid] = { queue: queue, func: func };
       queue.id = qid;
       return qid;
   },

   /**
    * Set callback function for existing queue.
    * @private
    */
   setQ: function(/** Core.Queue */queue, /** Function */func) {
      var qid = queue.id;
      assert(qid>=0);
      assert(func);
      var ele = this.qid2Queue[qid];
      assert(ele);
      assert(ele.queue == queue);
      ele.func = func;
   },

   /**
    * Return queue.
    * @private
    */
   getQ: function(/** Number */qid) {
      return this.qid2Queue[qid];
   },

   /**
    * Remove queue.
    * @private
    */
   removeQ: function(/** Core.Queue */queue) {
      assert(queue instanceof Core.Queue);
      var qid = queue.id;
      assert(qid>=0);
      assert(this.qid2Queue[qid]);
      assert(this.qid2Queue[qid].queue==queue);
      delete this.qid2Queue[qid];
   },

    
   /**
    * @private
    */
   toString: function() {
      return "Core";
   },


   /**
    * Start shell or run main script or do both.
    * @param isInteractive
    * @param isMrsh          Optional, make interactive if no script is found
    * @param scriptname      Optional, otherwisee ARGV[0]
    * @private 
    */
    run: function(/** Boolean */isInteractive, /** Boolean */isMrsh, /** String */scriptname) {
	var scriptpath = null;
	//var scriptname = null;
	if (isMrsh===undefined) { isMrsh = false; }
	if (ARGV.length == 0 && !scriptname && !isInteractive && !isMrsh) {
	    println("Missing name of script to execute.");
	    Runtime.exit(1);
	}
	if (!scriptname) {
	    if (ARGV.length > 0) {
		scriptname = ARGV[0];
		ARGV.splice(0, 1);
	    }
	}
	if (!scriptname && isMrsh) {
	    isInteractive = true;
	}
	var startShell = isInteractive||isMrsh;   // do I have to create a CLI.Shell instance?
	if (scriptname) {
	    scriptpath = CLI.Shell.findScript(scriptname);
	    if (scriptpath == null) {
		println(sprintf("Cannot find script file '%s'", scriptname));
		Runtime.exit(1);
	    }
	    if (CLI.Shell.isMRScript(scriptpath)) {
		startShell = true;
	    } else {
		if (!CLI.Shell.isJSScript(scriptpath)) {
		    println(sprintf("Script name must end in .mrsh or .js: %s", scriptname));
		    Runtime.exit(1);
		}
	    }
	}

	var exitf = function(result) {
	    if (result.code != 0) {
		println(sprintf("Executing script file '%s' failed:", scriptname));
		println(result.toString());
		println(result.getFullMessage());
	    }

	    V8DebuggerAgent.start();

	    if (isInteractive) {
		Core.shell.run();
	    } else {
		if ((scriptpath && CLI.Shell.isMRScript(scriptpath)) || (result.code!==0)) {
		    Runtime.exit(result.code);
		}
	    }
	};

	var execf = function() {
	    try {
		Runtime.source(scriptpath, V8DebuggerAgent.isConfigured());
		exitf(new AOP.OK());
	    } catch(ex) {
		//QUACK(0, "SONORAN.js: " + ex);
		//QUACK(0, "SONORAN.js: " + ex.stack);
		exitf(Ex2ERR(ERR_GENERIC, ex));
	    }
	};
    
	if (!startShell) {
	    Logger.getStdoutLogger();
	    execf();
	} else {
	    Core.shell = new CLI.Shell(isInteractive);
	    if (!isInteractive) {
		Logger.getStdoutLogger();
	    }
	    var result = Core.shell.sourceRC(SCB);
	    if (result.code != 0) {
		println("Ignoring the following errors when sourcing '.mrsh.js' and '.mrsh.rc':");
		println(result.toString());
	    }
	    if (scriptpath==null) {
		exitf(new AOP.OK());
	    } else if (CLI.Shell.isMRScript(scriptpath)) {
		Core.shell.execFile(scriptpath, ARGV, null, exitf);
	    } else {
		execf();
	    }
	}
    }
};



/**
 * Return architecture-specific bin directory in the sonoran installation such
 * as .../../win32/bin.
 * @returns {String} directory name
 */
Core.getBinDir = function() {
    return REPO_ROOT + '/' + ARCH_NAME + '/bin';
};


/**
 * Return architecture-specific lib directory in the sonoran installation such
 * as ../../lib/win32.
 * @returns {String} directory name
 */
Core.getLibDir = function() {
    return REPO_ROOT + '/lib/' + ARCH_NAME;
};


/**
 * @returns {String} lib/sonoran/js/server
 */
Core.getJSServerDir = function() {
    return JS_ROOT + '/' + JS_ROOT_SERVER_DIR;
};

/**
 * @returns {String} lib/sonoran/js/common
 */
Core.getJSCommonDir = function() {
    return JS_ROOT + '/' + JS_ROOT_COMMON_DIR;
};


/**
 * @returns {String} lib/sonoran/resources
 */
Core.getResourcesDir = function() {
    return REPO_ROOT + '/lib/sonoran/resources';
};




//==================================================================================================
//
// Core.Queue
//
//==================================================================================================


/** 
 * Base class for classes exchanging messages from native code. TCPSocket, UDPSocket, TCPServer,
 * LIP handles are all classes using Core.Queue for the message-based communication with the
 * native code.
 * @class
 * @constructor
 * @param id Optional
 * @private
 */
Core.Queue = function(id) {
   this.id = (id===undefined) ? -1 : id;
};

/** Prototype */
Core.Queue.prototype = {
   /**
    * Id of this queue.
    * @type Number
    * @private
    */
   id: -1,

    /**
     * Return the queue id.
     * @returns {Number} connector id
     * @private
     */
    getId: function() {
	return this.id;
    },

    /**
     * Data has been received from native code.
     * @param blob a queue specific object
     * @private
     */
    onBlob: function(/** Object */blob) { assert(0); },

   /**
    * Is this connection still alive?
    * @returns {Boolean}
    * @private
    */
   isAlive: function() {
      return this.id >= 0;
   },

   /**
    * Is this connection closed?
    * @returns {Boolean} 
    * @private
    */
   isClosed: function() {
      return this.id < 0;
   },

    /**
     * @returns {String}
     * @private
     */
   toString: function() {
      return "Core.Queue:" + this.id;
   }
};




//==================================================================================================
//
// V8DebuggerAgent
//
//==================================================================================================
/**
 * @returns {Boolean}
 * @private
 */
V8DebuggerAgent.isConfigured = function() {
    return PROG_PARAMS.dbgport > 0;
};

/**
 * 
 * Start debugger agent if requested by program parameters.
 * @returns {Boolean} whether debugger agent has been started
 * @private
 */
V8DebuggerAgent.start = function() {
    if (PROG_PARAMS.dbgport <= 0) {
	return false;
    }
    if (V8DebuggerAgent.isEnabled()) {
	return false;
    }
    QUACK(0, "Enabling V8 debug port: " + PROG_PARAMS.dbgport);
    var queue = {};
    Core.addQ(queue, function() { ; });
    assert(queue.id);
    
    V8DebuggerAgent.enable(PROG_PARAMS.dbgport, queue.id); 
    return true;
};


//==================================================================================================
//
// IO.File
//
//==================================================================================================
assert(IO.File);


/**
 * Default abbreviation supported in a sonoran file path.
 * @type String
 * @private
 */
IO.File.MR_HOME_ABBREV = /^~mr/;

/**
 * Convert file path to os file path.
 * @param path
 * @returns {String} converted path
 * @private
 */
IO.File.jsPath2osPath = function(path) {
   return path.replace(IO.File.MR_HOME_ABBREV, REPO_ROOT);
};

/**
 * List directory entries. Throws exception in case of error.
 * @param path     Directory
 * @returns {String[]} a sorted array of directory entries
 */
IO.File.listDir = function(/** String */path) {
   path = IO.File.jsPath2osPath(path);
   return IO.File._listDir(path).sort();
};

/**
 * Return real path for given path.
 * @param path
 * @returns {String} real path
 */
IO.File.realpath = function(/** String */path) {
   path = IO.File.jsPath2osPath(path);
   return IO.File._realpath(path);
};


/**
 * Map a file path from \-notation to /-notation.
 * @param path
 * @returns {String} path with \ replaced by /
 */
IO.File.mappath = function(/** String */path) {
    return path.replace(/\\/g, '/');
};


/**
 * Splits path at \ or /.
 * @param path
 * @returns {String[]} 
 */
IO.File.splitpath = function(/** String */path) {
    return path.split(/\\|\//);
};


/**
 * See 'man basename'.
 * @param path
 * @returns {String} basename
 */
IO.File.basename = function(/** String */path){
   path = IO.File.jsPath2osPath(path);
   return IO.File._basename(path);
};

/**
 * See 'man dirname'.
  * @param path
 * @returns {String} dirname
 */
IO.File.dirname = function(/** String */path){
   path = IO.File.jsPath2osPath(path);
   return IO.File._dirname(path);
};

/**
 * See 'man fopen'.
  * @param path
 * @returns {Object} an opaque file handle or throws exception in case of error.
 */
IO.File.fopen = function(/** String */path, /** String */mode) {
   path = IO.File.jsPath2osPath(path);
   return IO.File._fopen(path, mode);
};

/**
 * Return file contents. File contents are treated as binary data.
 * @param path     Absolute or relative file path
 * @throws {Object} an exception in case of error
 * @returns {String} file contents
 */
IO.File.readFully = function(/** String */path) {
   path = IO.File.jsPath2osPath(path);
   return IO.File._readFully(path);

};

/**
 * Write file. Note that specified bytes are treated as binary data.
 * @param path        Absolute or relative file path
 * @param bytes       Binary data
 * @throws  {Object} an exception in case of error
 */
IO.File.writeFully = function(/** String */path, /** String */bytes) {
   path = IO.File.jsPath2osPath(path);
   return IO.File._writeFully(path, bytes);
};

/**
 * Create directory path.
 * @param path      Directory path
 * @throws  {Object} an exception in case of error
 */
IO.File.mkdir_p = function(/** String */path) {
   path = IO.File.jsPath2osPath(path);
   return IO.File._mkdir_p(path);
};

/**
 * Remove drirectory.
 * @param path      Directory path
 * @throws  {Object} an exception in case of error
 */
IO.File.rmdir = function(/** String */path) {
   path = IO.File.jsPath2osPath(path);
   return IO.File._rmdir(path);
};

/**
 * File exists?
 * @param path     File path
 * @returns {Bolean} whether file exists
 */
IO.File.exists = function(/** String */path) {
   path = IO.File.jsPath2osPath(path);
   return IO.File._exists(path);
};

/**
 * Is directory?
 * @param path  File path
 * @returns {Boolean} whether file denotes a directory
 */
IO.File.isDir = function(/** String */path) {
    //QUACK(0, "STACK:\n" + Runtime.getStackTrace().join("\n"));
   path = IO.File.jsPath2osPath(path);
   return IO.File._isDir(path);
};

/**
 * Copy file from source path to dest path. Both parameters must be file, not directory paths.
 * @param srcpath     Source path
 * @param dstpath     Destination path
 * @throws {Object} an exception in case of error
 */
IO.File.cp = function(/** String */srcpath, /** String */dstpath) {
   srcpath = IO.File.jsPath2osPath(srcpath);
   dstpath = IO.File.jsPath2osPath(dstpath);
   return IO.File._cp(srcpath, dstpath);
};

/**
 * Remove file.
 * @param path    File path
 * @throws {Object} an exception in case of error
 * @returns {Number} 0 on success
 */
IO.File.rm = function(/** String */path) {
   path = IO.File.jsPath2osPath(path);
   return IO.File._rm(path);
};

/**
 * Change current working directory.
 * @param path Directory path
 * @throws {Object} an exception in case of error
 */
IO.File.chdir = function(/** String */path){
   path = IO.File.jsPath2osPath(path);
   return IO.File._chdir(path);
};

/**
 * Return file statistics.
 * @param path
 * @returns {Object} an object with properties size (Number), mtime (Number) and atime (Number).
 */
IO.File.stat = function(/** String */path){
   path = IO.File.jsPath2osPath(path);
   return IO.File._stat(path);
};








//==================================================================================================
//
// Runtime
//
//==================================================================================================
assert(Runtime);


/**
 * Map of absolute script paths already sourced.
 * @type Object
 * @private
 */
Runtime.SCRIPT_SOURCES= {};

/**
 * Directory where current script is sourced from.
 * @type String
 */
SCRIPT_ORIGIN  = JS_ROOT + "/server/core";
assert(IO.File.exists(SCRIPT_ORIGIN + "/core.js"));
[ "core.js" ].forEach(function(name) {
    var path = SCRIPT_ORIGIN + "/" + name;
    path = IO.File._realpath(path);
    Runtime.SCRIPT_SOURCES[path] = path;
});

assert(!Runtime.SCRIPT_PATHS);
assert(PROG_PARAMS.scriptPath!=undefined, "Missing global script path");
assert(JS_ROOT);
/**
 * Paths sonoran is looking for scripts.
 * @type String[]
 * @private
 */
Runtime.SCRIPT_PATHS = [ JS_ROOT+"/common", JS_ROOT ]; 

/**
 * The system exception handlers.
 * @private
 */
Runtime.SYSTEM_EXC_HANDLERS = {};


/**
 * The global error handler function is called with an exception object when the
 * invocation of a Javascript function failed, i.e. on any exception uncatched
 * by user code. It calls by default Runtime#handleSystemException to dump the exception
 * and exit the process.
 * @param ex  exception object
 * @param msg optional, msg to use instead of ex.message
 * @private
 */
SYSTEM_EXC_HANDLER = function(/** Object */ex, /** String */msg) {
    Runtime.handleSystemException(ex, msg);
};


/**
 * The system exception handlers.
 * @private
 */
Runtime.SYSTEM_EXC_HANDLERS = {};




/**
 * Source a script. If sourced before, it is sourced again and the function returns true.
 * @param path   Path of script
 * @param debug  Leave 'undefined'
 * @returns {Boolean} true if script has been sourced before
 * @private
 */
Runtime.source = function(/** String */path, /** Boolean */debug) {
    if (!IO.File.exists(path)) {
        throw "No such script file: " + path;
    }
    path = IO.File.realpath(path);

    var contents;
    try {
	contents = IO.File.readFully(path);
    } catch (x) {
	throw "Cannot read script contents: " + x;
    }

    if (contents.charAt(0)==='#' && contents.charAt(1)==='!') {
	contents = "//" + contents.substr(2);
    }
    if (debug===true && V8DebuggerAgent.isConfigured()) {
	contents = "V8DebuggerAgent.start();" + contents;
    }

    var _SCRIPT_ORIGIN = SCRIPT_ORIGIN;
    var dir = IO.File.dirname(path);
    SCRIPT_ORIGIN = dir;

    var sourcedBefore = Runtime.SCRIPT_SOURCES[path];
    Runtime.SCRIPT_SOURCES[path] = path;

    try {
	Runtime.sourceString(path, contents);
    } catch (x) {
	SCRIPT_ORIGIN = _SCRIPT_ORIGIN;
	throw x;
    }
    SCRIPT_ORIGIN = _SCRIPT_ORIGIN;
    return sourcedBefore;
};


/**
 * @returns {Boolean} whether this code runs on the server
 */
Runtime.runOnServer = function() {
    return true;
};


/**
 * Include source file found first on the current sonoran search path. If the script has been
 * sourced before, the function returns false. If an error occurs, an exception is thrown.
 * @param s source filename
 *  @returns {Boolean} false if script has been sourced before
 */
Runtime.include = function(/** String */s) {
    //QUACK(0, "INCLUDE: " + s);
    if (!/\.js$/.test(s)) { s += ".js"; }
    var path = Runtime.search(s);
    if (!path) { 
	throw new Exception(sprintf("Cannot find file '%s'", s)); 
    }
    if (!IO.File.exists(path)) { 
	throw new Exception("No such script file: " + path); 
    }
    
    path = IO.File.realpath(path);
    if (Runtime.SCRIPT_SOURCES[path]) {
        //QUACK(0, "Runtime.include: ignore already sourced file " + path);
        return false;
    }

    Runtime.source(path);
    return true;
};



/**
 * Find a file on the sonoran search path and return absolute filename or null.
 * @param s filename
 * @returns {String} absolute filename of found file or null
 */
Runtime.search = function(/** String */s) {
    var path = SCRIPT_ORIGIN + '/' + s;
    if (IO.File.exists(path) && !IO.File.isDir(path)) {
	return path;
    }
   if (IO.File.exists(s) && !IO.File.isDir(s)) {
      return s;
   }
   for (var i = 0; i < Runtime.SCRIPT_PATHS.length; i++) {
      var f = Runtime.SCRIPT_PATHS[i] + '/' + s;
      if (IO.File.exists(f) && !IO.File.isDir(f)) {
	 return f;
      }
   }
   return null;
};


/**
 * Exit this sonoran process.
 * @param code exit code
 */
Runtime.exit = function(/** Number */code) {
    //Jobs.shutdown();
   
    if (PROG_PARAMS.verboseFlag) {
	var txt = "Source of Runtime.exit invocation:\n" + stack.toString();
        QUACK(0, "Runtime.exit", txt);
    }

    IO.shutdown();

    Runtime._exit(code);
};



/**
 * Parse exception stack and return array of line information (Runtime.PC).
 * @param ex exception object
 * @returns {Runtime.PC[]} Array of PCs
 */
Runtime.parseException = function(/** Exception */ex) {
    var pcs = [];
    if (ex.stack && typeof(ex.stack)==='string') {
	var lines = ex.stack.split(/[\n\r]/);
	for (var i = 0; i < lines.length; i++) {
	    var l = lines[i];
	    if (!l) { continue; }
	    l = l.trim();
	    if (!l) { continue; }
	    var md = /^\s*at\s+([^\s]+)\s+\(([a-zA-Z]:)?([^:]+):(\d+):(\d+)\)/.exec(l);
	    if (md) {
		var obj = new Runtime.PC(md[1], md[3], md[4], md[5]); 
		pcs.push(obj);
	    } else {
		md = /^\s*at\s+([a-zA-Z]:)?([^:]+):(\d+):(\d+)/.exec(l);
		if (md) {
		    var obj = new Runtime.PC(md[2], md[3], md[4]);
		    pcs.push(obj);
		} else {
		    //QUACK(0, "WARN: could not parse exception line: " + l);
		}
	    }
	}
    }
    return new Runtime.Stack(pcs);
};


/**
 * Return standard exception message and stacktrace as string
 * @param ex  Exception object
 * @param msg Optional, message to include, default excetion message
 * @returns {String} multi-line string
 */
Runtime.dumpException = function(/** Exception */ex, /** String */msg) {
    var s = "";
    if (ex instanceof Exception) {
	if (msg) {
	    s = msg + "\n";
	} 
	s += ex.getFullMessage();
    } else {
	if (msg) {
	    s = msg + ": ";
	} 
	s += ex.toString(); 
	if (ex.stack) {
	    s += "\n" + Runtime.parseException(ex).join("\n");
	} 
    }
    return s;
};




/**
 * Add a function which receives any uncatched exceptions in the framework.
 * @param f
 */
Runtime.addSystemExceptionHandler = function(/** Function */f) {
    Runtime.SYSTEM_EXC_HANDLERS[f] = f;
};


/**
 * Remove function from table of system exception handlers.
 */
Runtime.removeSystemExceptionHandler = function(/** Function */f) {
    delete Runtime.SYSTEM_EXC_HANDLERS[f];
};


/**
 * Handle system exception. Call registered handlers and dump exception. Optionally,
 * exit process (if PROG_PARAMS.noExitOnErrorFlag is not set).
 * @private
 */
 Runtime.handleSystemException = function(/** Exception */ex, /** String */msg) {
    for (var k in Runtime.SYSTEM_EXC_HANDLERS) {
	var f = Runtime.SYSTEM_EXC_HANDLERS[k];
	try {
	    f(ex, msg);
	}catch(x) {
	   var txt = "System exception handler failed with: " + x;
	   txt = Runtime.dumpException(x, msg);
           if (STDOUT) {
              println(txt);   
           }
	   QUACK(1, "SystemExceptionHandler", txt);
	}
    }
    var s = Runtime.dumpException(ex, msg);
    if (PROG_PARAMS.noExitOnErrorFlag) {
	QUACK(0, "SystemExceptionHandler", s);
    } else {
       //QUACK(0, s);
       if (STDOUT) {
          println(s);
       } else {
          QUACK(0, s);
       }
       Runtime.exit(1);
    }
};

/**
 * Return current stack.
 * @returns {Runtime.Stack}
 */
Runtime.getStackTrace = function() {
    var arr = Runtime._getStackTrace();
    var pcs = [];
    for (var i = 1; i < arr.length; i++) {
	var funcName = arr[i]['funcName'];
	var fileName = arr[i]['fileName'];
	var lineNo = arr[i]['lineNo'];
	var charPos = arr[i]['charPos'];
	var isConstructor = arr[i]['isConstructor'];
	var isEval = arr[i]['isEval'];
	pcs.push(new Runtime.PC(funcName, fileName, lineNo, charPos, isConstructor, isEval));
    }
    return new Runtime.Stack(pcs);
};



/**
 * Runtime.PC encapsulates an element in a stacktrace.
 * @class 
 * @constructor
 * @param funcName
 * @param fileName
 * @param lineNo
 * @param charPos
 * @param isConstructor
 * @param isEval
 * @see Runtime.parseException
 */
Runtime.PC = function(/** String */funcName, /** String */fileName, /** Number */lineNo, /** Number */charPos, /** Boolean */isConstructor, /** Boolean */isEval) {
    this.funcName = funcName;
    this.fileName = fileName;
    this.lineNo = lineNo;
    this.charPos = charPos;
    this.isConstructor = isConstructor;
    this.isEval = isEval;
};

/** @private */
Runtime.PC.prototype = {
    /** 
     * Function name 
     * @type String
     */
    funcName: null,
    /** 
     * File name 
     * @type String
     */
    fileName: null,
    /** 
     * Line number 
     * @type Number
     */
    lineNo: -1,
    /** 
     * Character position in line 
     * @type Number
     */
    charPos: -1,
    /**
     * @type Boolean
     */
    isConstructor: false,
    /**
     * @type Boolean
     */
    isEval: false,

    /**
     * @returns {String} string representation
     */
    toString: function() {
	var s = "  at ";
	if (this.funcName) { s += this.funcName + " "; };
	s += this.fileName + ":" + this.lineNo;
	if (this.charPos) { s += ":" + this.charPos; };
	return s;
    }
};


/**
 * @class
 * @constructor
 * @param pcs
 */
Runtime.Stack = function(/** Runtime.PC[] */pcs) {
    this.pcs = pcs;

};

/** @private */
Runtime.Stack.prototype = {
    /**
     * @type Runtime.PC[]
     */
    pcs: null,

    /**
     * @param sep  Optional, default is '\n'
     * @returns {String}
     */
    toString: function() {
	if (this.pcs.length===0) {
	    return "";
	} else {
	    return this.pcs.join("\n");
	}
    },

    /**
     * @param sep  Optional, default is '\n'
     * @returns {String}
     */
    join: function(/** String */sep) {
	if (this.pcs.length===0) {
	    return "Empty stack";
	} else {
	    return this.pcs.join(sep);

	}
    }
};






//==================================================================================================
//
// Include everything else
//
//==================================================================================================


Runtime.include("common/core/core.js");
Runtime.include("common/core/blob.js");
Runtime.include("common/core/aop.js");
Runtime.include("common/core/util.js");
Runtime.include("common/core/string.js");
Runtime.include("common/core/crc16.js");


/**
 * Console output listeners.
 * @type Util.Listeners
 * @private
*/
CONSOLE_LISTENERS = new Util.Listeners();


Runtime.include("./thread.js");
Runtime.include("./io.js");
Runtime.include("./stdio.js");
Runtime.include("./process.js");
Runtime.include("./udp.js");
Runtime.include("./tcp.js");
Runtime.include("./pipe.js");
//Runtime.include("./job.js");
Runtime.include("./util.js");

Runtime.include("../getopt/getopt.js");
Runtime.include("../timer/timer.js");
Runtime.include("../logger/logger.js");
Runtime.include("../cli/cli.js");
Runtime.include("../http/http.js");
Runtime.include("../event/event.js");


/**
 * @see IO.File
 * @ignore
 */
File = IO.File;

/**
 * @see IO.Process
 * @ignore
 */
Process = IO.Process;

/**
 * @see IO.Inet
 * @ignore
 */
Inet = IO.Inet;


/**
 * @see IO.File
 * @ignore
 */
IO.OSFile = IO.File;


/**
 * @see IO.File
 * @ignore
 */
OSFile = IO.File;






