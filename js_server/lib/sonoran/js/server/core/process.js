//  (C) COPYRIGHT INTERNATIONAL BUSINESS MACHINES CORPORATION 2006-2010
//                       ALL RIGHTS RESERVED
//        IBM Research Division, Zurich Research Laboratory
// --------------------------------------------------------------------
assert(IO.Process);



/**
 * @type Number
 * @constant
 * @private
 */
IO.Process.DIED = 1;

/**
 * @type Number
 * @constant
 * @private
 */
IO.Process.OUTPUT = 2;


/**
 * Map of pid's to IO.Process.Descr.
 * @type Object
 * @private
 */
IO.Process.pid2descr = {};

/**
 * Search paths to find executables.
 * @type String[]
 * @private
 */
IO.Process.searchPaths = function() {
    var paths;
    if (Win32.runOnWindows()) {
	paths = [ Core.getBinDir(), "/cygwin/bin", "/cygwin/usr/bin" ];
    } else {
	paths = [ Core.getBinDir(), "/bin", "/usr/bin" ];
	var sa = IO.Process.getenv("PATH").split(/\:/);
	if (sa.length > 0) {
	    paths = sa.concat(paths);
	}
    }
    return paths;
}();


/**
 * Signature of function called on process exit.
 * @param evt
 */
IO.Process.onExitFunc = function(/** IO.Process.ExitEvent */evt){};




/**
 * Signature of function called on process output on stdout/stderr.
 * @param evt
 */
IO.Process.onOutputFunc = function(/** IO.Process.OutputEvent */evt){};




/**
 * Search executable. If found, path is returned, otherwise the input parameter
 * name.
 */
IO.Process.searchExecutable = function(/** String */name) {
    if (IO.File.exists(name)) {
	return name;
    }
    var paths = IO.Process.searchPaths;
    for (var i = 0; i < paths.length; i++) {
	var p = paths[i] + '/' + name;
	if (IO.File.exists(p)) {
	    return p;
	}
	p += ".exe";
	if (IO.File.exists(p)) {
	    return p;
	}
    }
    return name;
};



/**
 * Start a process. If a listener function is specified, it is called when the process dies. 
 * @param path           Path to program
 * @param argv           Argument vector (excluding the path to the program)
 * @param onExitFunc Listener function for process exit
 * @param onOutputFunc Receives process output
 * @throws {Object} in case the program cannot be started
 * @returns {Number} Process pid
 */
IO.Process.start = function(/** String */path, /** String[] */argv, /** IO.Process.onExitFunc */onExitFunc, /** IO.Process.onOutputFunc */onOutputFunc) {
    var pid;
    path = IO.Process.searchExecutable(path);
    var argvv = [].concat(argv); // make a copy first
    argvv.unshift(path);
    if (!Win32.runOnWindows()) {
	pid  = this.create(argvv);
    } else {
	var cmdline  = argvv.map(function(arg) { return '"' + arg.replace('"', '\\"') + '"'; }).join(" ");
	pid  = this.create(cmdline);
    }
    //QUACK(1, "IO.Process", "started pid " + pid);
    this.pid2descr[pid] = new IO.Process.Descr(pid, path, argv, onExitFunc, onOutputFunc);
    return pid;
};


/**
 * Start a process specified by the program path and command line arguments.
 * This function waits the specified amount of time for the process to die. In this case
 * an error is returned. Otherwise, the listener function is notified when the process dies.
 * @param path
 * @param argv
 * @param timeout   If 'undefined', 300ms
 * @param onExitFunc
 * @param onOutputFunc Receives process output
 * @param callback
 * @returns {Number} pid
 */
IO.Process.start2 = function(/** String */path, /** String[] */argv, /** Number */timeout, /** IO.Process.onExitFunc */onExitFunc, /** IO.Process.onOutputFunc */onOutputFunc, /** DFLT_ASYNC_CB */callback) {
    if (BC.is(callback)) { return BC.exec(arguments.callee, this, arguments); }
    timeout=timeout?timeout:300;
    var timer = null;
    var pid = null;
    var _this = this;
    var closef = function(result) {
	if (timer) {
	    timer.cancel();
	    timer = null;
	}
	//QUACK(0, "start2: " + result);
	if (result.code === 0) {
	    var proc = _this.pid2descr[pid];
	    assert(proc);
	    proc.onExitFunc = onExitFunc;
	}
	callback(result);
    };
    var timeoutf = function() {
	timer = null;
	closef(new AOP.OK(pid));
    };
    var listenerf = function(obj) {
	assert(obj.phandle!==undefined);
	if (obj.phandle === pid) {
	    var msg = sprintf("Process %d, '%s' died early", pid, path);
	    //QUACK(0, msg);
	    closef(new AOP.ERR(ERR_GENERIC, msg, undefined, obj));
	}
    };
    timer = Timer.timeoutIn(timeout, timeoutf);
    try {
	pid = IO.Process.start(path, argv, listenerf, onOutputFunc);
    } catch (ex) {
	closef(Ex2ERR(ERR_GENERIC, ex, sprintf("Cannot start process '%s'", path)));
    }
};






/**
 * Start a process specified by the program path and command line arguments and
 * run until its completion.
 * @param path
 * @param argv
 * @param callback
 * @returns {Object}  Object with pid, pexitcode and poutput
 */
IO.Process.start3 = function(/** String */path, /** String[] */argv, /** DFLT_ASYNC_CB */callback) {
    if (BC.is(callback)) { return BC.exec(arguments.callee, this, arguments); }
    var pid = null;
    var poutput = "";
    var _this = this;
    var onoutf = function(obj) {
	poutput += obj.pdata;
    };
    var onexitf = function(obj) {
	assert(obj.phandle!==undefined);
	if (obj.phandle === pid) {
	    var data = {
		pid: pid,
		poutput: poutput,
		pexitcode: obj.pexitcode
	    };
	    callback(new AOP.OK(data));
	}
    };
    try {
	pid = IO.Process.start(path, argv, onexitf, onoutf);
    } catch (ex) {
	closef(Ex2ERR(ERR_GENERIC, ex, sprintf("Cannot start process '%s'", path)));
    }
};







/**
 * Send data to process.
 * @param pid 
 * @param data
 */
IO.Process.send = function(/** Number */pid, /** String */bytes) {
    var descr = this.pid2descr[pid];
    if (!descr) {
	throw new Exception("No such process: " + pid);
    }
    IO.Process._send(pid, bytes);
};




/**
 * @private
 */
IO.Process.queue = {
    /**
     * @private
     * @type Number
     */
    id: -1,


    /** 
     * @private 
     */
    onBlob: function(blob) {
	var pid2descr = IO.Process.pid2descr;
	var phandle = blob.phandle;
	var msgtype = blob.msgtype;
	var p = pid2descr[phandle];
	if (p) {
	    if (msgtype === IO.Process.DIED) {
		var pexitcode = blob.pexitcode;
		delete pid2descr[phandle];
		//QUACK(0, "IO.Process", "died " + phandle + ", " + p.path);
		if (p.onExitFunc) {
		    p.onExitFunc(new IO.Process.ExitEvent(phandle, p.path, pexitcode));
		}
	    } else if (msgtype === IO.Process.OUTPUT) {
		if (p.onOutputFunc) {
		    p.onOutputFunc(new IO.Process.OutputEvent(phandle, p.path, blob.pdata, blob.stderr));
		}
	    } else {
		assert(false);
	    }
	}
    }
};



/**
 * Restart this sonoran process.
* @param pipePath
* @param addArgs
 * @private
 */
IO.Process.restart = function(/** String */pipePath, /** String[] */addArgs) {
    Timer.System.reset();
    IO.shutdown();
    
    var binDir = Core.getBinDir();
    var progName = PROG_NAME.replace(/\.exe$/, "");
    if (Win32.runOnWindows()) {
	progName += ".exe";
    }
    var argv = [ binDir + '/' + progName, "-i" ];
    argv = argv.concat(addArgs);
    var bytes;
    if (!Win32.runOnWindows()) {
	bytes = Formatter.pack("1u", argv.length);
	for (var i = 0; i < argv.length; i++) {
	    var s = argv[i];
	    bytes += Formatter.pack("1u", s.length);
	    bytes += s;
	}
    } else {
	argv = argv.map(function(arg) { return '"' + arg.replace('"', '\\"') + '"'; });
	bytes = argv.join(" ");
    }
    try {
	Process._restart(pipePath, bytes);    
    } catch (ex) {
	QUACK(0, "Could not restart: " + ex);
	callback(Ex2ERR(ERR_GENERIC, ex));
    }
    assert(false);
};


/**
 * Event on process exit.
 * @class
 * @constructor
 * @param phandle
 * @param pexitcode
 * @param ppath
 * 
 */
IO.Process.ExitEvent = function(/** Number */phandle, /** String */ppath, /** Number */pexitcode) {
    this.msgtype = IO.Process.DIED;
    this.phandle = phandle;
    this.ppath = ppath;
    this.pexitcode = pexitcode;
};


/**
 * Event on process exit.
 * @class
 * @constructor
 * @param phandle
 * @param pdata
 * @param stderr
 * @param ppath
 */
IO.Process.OutputEvent = function(/** Number */phandle, /** String */ppath, /** String */pdata, /** Number */stderr) {
    this.msgtype = IO.Process.OUTPUT;
    this.phandle = phandle;
    this.ppath = ppath;
    this.pdata = pdata;
    this.stderr = stderr;
};



/**
 * Descriptor for started process.
 * @class
 * @constructor
 * @param pid
 * @param path
 * @param argv
 * @param onExitFunc
 * @param onOutputFunc
 * @private
 */
IO.Process.Descr = function(/** Number */pid, /** String */path, /** String[] */argv, /** IO.Process.onExitFunc */onExitFunc, /** IO.Process.onOutputFunc */onOutputFunc) {
    this.pid = pid;
    this.path = path;
    this.argv = argv;
    this.onExitFunc = onExitFunc;
    this.onOutputFunc = onOutputFunc;
};


