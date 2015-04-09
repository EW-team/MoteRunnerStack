/**
 * Return a connection to an existing, running saguaro process. If no process is running, an error is
 * returned. Otherwise a newly established or existing connection is provided.
 * @param host                 Default is 'localhost' if null
 * @param port                 Default is 44044 if null
 * @param callback             
 * @returns {Saguaro.Connection}
 * @throws {AOP.Exception}
 */
Saguaro.connectProcess = function(/** String */host, /** Number */port, /** DFLT_ASYNC_CB */callback) {
    if (BC.is(callback)) { return BC.exec(arguments.callee, this, arguments); }
    
    if (!port) { port = Saguaro.DFLT_PORT; }
    if (!host) { host = Saguaro.DFLT_HOST; }
    var connectf = function(retries) {
	(new Saguaro.Connection(host, port)).open(function(r) {
	    if (r.code==0) {
		callback(r);
	    } else if (retries==0) {
		callback(r);
	    } else {
		Timer.timeoutIn(50, function() { connectf(retries-1); });
	    }
	});
    };
    var conn = Saguaro.Connection.getConnection();
    if (conn && conn.connectsTo(host, port)) {
	callback(new AOP.OK(conn));
    } else if (!conn) {
	connectf(10);
    } else {
	conn.exit(function(result) {
	    if (result.code!==0) {
		callback(new AOP.ERR(sprintf("Could not quit existing saguaro process: %s", result)));
	    } else {
		connectf(10);
	    }
	});
    }
};



/**
 * Return connection to a saguaro process, existing  or newly started. If a saguaro process is running,
 * this function behaves like Saguaro#connectProcess and returns a connection. Otherwise,
 * a process is started and a conection to this new process is returned.
 * @param port                 Default is 44044 if null
 * @param callback             
 * @returns {Saguaro.Connection}
 * @throws {AOP.Exception}
 */
Saguaro.getProcess = function(/** Number */port, /** DFLT_ASYNC_CB */callback) {
    if (BC.is(callback)) { return BC.exec(arguments.callee, this, arguments); }

   if (!port) { port = Saguaro.DFLT_PORT; }
   var host = Saguaro.DFLT_HOST;
   var connectf = function(retries) {
      (new Saguaro.Connection(host, port)).open(function(r) {
	 if (r.code==0) {
	    callback(r);
	 } else if (retries==0) {
	    callback(r);
	 } else {
	    Timer.timeoutIn(50, function() { connectf(retries-1); });
	 }
      });
   };
   var execf = function() {
      Saguaro.execProcess(port, function(status) {
         if (status.code != 0) {
            callback(status);
         } else {
            connectf(5);
         }
      });
   };
   Saguaro.connectProcess(host, port, function(result) {
      if (result.code == 0) {
         callback(result);
      } else {
         execf();
      }
   });
};



/**
 * Return connection to a newly started saguaro process. If a process is running, it is terminated.
 * If a connection to that process currently exists, it is closed. A new process is started
 * and a connection to that process is returned.
 * @param port                 Default is 44044 if null
 * @param callback             
 * @returns {Saguaro.Connection}
 * @throws {AOP.Exception}
 */
Saguaro.startProcess = function(/** Number */port, /** DFLT_ASYNC_CB */callback) {
    if (BC.is(callback)) { return BC.exec(arguments.callee, this, arguments); }

   if (!port) { port = Saguaro.DFLT_PORT; }
   var host = Saguaro.DFLT_HOST;
   var connectf = function(retries) {
      (new Saguaro.Connection(host, port)).open(function(r) {
	 if (r.code==0) {
	    callback(r);
	 } else if (retries==0) {
	    callback(r);
	 } else {
	    Timer.timeoutIn(50, function() { connectf(retries-1); });
	 }
      });
   };
   var execf = function() {
      Saguaro.execProcess(port, function(status) {
         if (status.code != 0) {
            callback(status);
         } else {
            connectf(5);
         }
      });
   };
    var conn = Saguaro.Connection.getConnection();
   if (conn) {
       conn.exit(function(result) {
	   if (result.code!==0) {
		   callback(new AOP.ERR(sprintf("Could not quit existing saguaro process: %s", result)));
	   } else {
	       execf();
	   }
       });
   } else {
      Saguaro.execProcess(port, function(result) {
         if (result.code===0) {
            connectf(3);
         } else {
	     var data = result.getData();
	     if (data === undefined) {
		 callback(result);
		 return;
	     }
	     assert(data!==undefined);
	     assert(data.phandle!==undefined);
	     assert(data.pexitcode!==undefined);
            var exitCode = data.pexitcode;
            if (exitCode == 22) {
               (new Saguaro.Connection(host, port, true)).open(function(r) {
	          if (r.code !== 0) {
	             callback(new AOP.ERR(sprintf("Inexisting/Unresponsive saguaro process at port %d", port), undefined, r));
                     return;
	          }
                  var conn = r.getData();
		   conn.exit(execf);
               });
            } else {
               callback(new AOP.ERR(sprintf("Saguaro process exited with unexpected exit code %d", exitCode)));
            }
	 }
      });
   }
};


/**
 * Execute saguaro process.
 * @param port    Port for saguaro process to listen on
 * @param callback
 * @returns {Number} Process pid
 * @throws AOP.Exception
 * @private
 */
Saguaro.execProcess = function(/** Number */port, /** DFLT_ASYNC_CB */callback) {
    if (BC.is(callback)) { return BC.exec(arguments.callee, this, arguments); }
    assert(port);
    var onExitFunc = function(procExitEvent) {
	assert(procExitEvent.pexitcode!==undefined);
	if (procExitEvent.pexitcode !== 0) {
	    var msg = sprintf("Saguaro process '%d' died unxpectedly with exit code: %d", procExitEvent.phandle, procExitEvent.pexitcode);
	    QUACK(0, msg);
	    Logger.err(msg);
	}
    };
    IO.Process.start2(Sonoran.Resource.getSaguaroPath(), [ "-p", port.toString(), "--silent", "--no-stdin" ], undefined, onExitFunc, undefined, callback);
};



