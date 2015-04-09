//  (C) COPYRIGHT INTERNATIONAL BUSINESS MACHINES CORPORATION 2006-2010
//                       ALL RIGHTS RESERVED
//        IBM Research Division, Zurich Research Laboratory
// --------------------------------------------------------------------


/*
 * Dummy file to document native functions. Dont include in core.js!
 */

/**
 * Contains script parameters passed on command line.
 * @type String[]
 */
ARGV = null;

/**
 * Top directory of program installation.
 * @type String
 * @private
 */
REPO_ROOT = null;

/**
 * Architecure (macosx, cygwin, linux, linux64, win32).
 * @type String
 * @private
 */
ARCH_NAME = null;


/**
 * Name of program starting sonoran.
 * @type String
 * @private
 */
PROG_NAME = null;

/**
 * Top directory of system js files.
 * @type String
 * @private
 */
JS_ROOT = null;

/**
 * Name of Javascript engine
 * @type String
 * @private
 */
JSVM_NAME = null;

/**
 * Home directory of user.
 * @type String
 * @private
 */
HOME_PATH = null;

/**
 * Quack level.
 * @type Number
 * @private
 */
QUACK_LEVEL = null;

/**
 * Contains parameters passed to sonoran binary and framework:
 * <ul>
 * <li>verboseFlag:        Number, verbose parameter passed to sonoran program</li>
 * <li>scriptPath:         String, script path passed to sonoran program</li>
 * <li>noExitOnErrorFlag:  Boolean, log errors, but do not exit process</li>
 * <li>noStdin:            Boolean, no provisioning of standard input</li>
 * <li>dbgport:            Number, debug port for v8 agent</li>
 * <li>dbgstop:            Boolean, whether v8 agent should stop execution when started</li>
 * </ul>
 * @type Object
 * @private
 */
PROG_PARAMS = null;







/**
 * Thread provides support functions for a cooperative threading model.
 * A thread - once running - continues execution until yield is called and another
 * thread is runnnable or the thread returns from JavaScript and another thread
 * is runnable.
 * @class
 */
var Thread = {
   /**
    * Suspend current thread. System searches for a runnable thread to activate or
    * creates a new thread handling incoming IO packets.
    * @static
    */
   suspend: function(){},

   /**
    * Create a new thread and make it runnable, the current thread continues.
    * @param func   Function to execute in new thread.
    * @returns {Number} the thread id of the newly created thread
    * @static
    */
   start: function(/** Function */func){},

   /**
    * Make a thread runnable. If the target thread is suspended, it is put on runnable queue.
    * If target thread is runnable, the request is ignored. If target thread is running (i.e
    * curent thread), yield() is called.
    * @param Thread id
    * @throws {Object} if target thread is dead or does not exist. 
    * @static
    */
   makeRunnable: function(/** Number */id) {},

   /**
    *  Switch to another runnable thread or continue running.
    * @static
    */
   yield: function(){},
   
   /**
    * @return {Number} thread id of the current running thread
    * @static
    */
   current: function(){}
};





/**
 * Module to communicate with the v8 debugger.
 * @class
 * @private
 */
var V8DebuggerAgent = {
    /**
     * @returns {Boolean}
     * @private
     */
    isEnabled: function() {},

   /**
    * Enable v8 debugging support. Specify the port the remote debugger (chromedevtools)
    * should attach to. The second parameter specifies whether to wait for the debugger
    * or should continue.
    * @param port
    * @param stop   True, v8 stops until debugger attaches
    * @private
    */
   enable: function(/** Number */port, /** Boolean */stop) {}
};




/**
 * Send text to stdout/stderr.
 * @class
 * @private
 */
var Stdio = {
   /**
    * @param text
    * @private
    */
   write: function(/** String*/text) {},

    /**
     * Flush sdtio.
     * @private
     */
   flush: function() {}
};



/**
 * Runtime provides support functions for the Javascript engine.
 * @class 
 */
var Runtime = {
   /**
    * Create a new queue to exchange data with native code.
    * @static
    * @private
    */
   allocQueue: function() {},
   
   /**
    * Sources specified javascript file (absolute path or relative to current directory).
    * @param name filename
    * @static
    * @private
    */
   sourceFile: function(/** String */name) {},

   /**
    * Terminates sonoran with given exit code. Runtime.exit is the preferred way to exit sonoran.
    * @param exitCode
    * @static
    * @private
    */
   _exit: function(/** Number */exitCode) {},

   /**
    * Quack a message into the sonoran log file.
    * @param level    log level, 0 ..n
    * @param str      message
    * @static
    * @private
    */
   quack: function(/** Number */level, /** String */str) {},

   /**
    * Load a native library and invoke function identified by given symbol name.
    * @param dllname    Name of DLL
    * @param symname    Name of symbol
    * @param para       Object passed to native code
    * @static
    * @private
    */
   load: function(/** String */dllname, /** String */symname, /** Object */para){},

    /**
     * Return current stack trace. Each entry contains properties function, line, script.
     * @returns {Object[]} array of frames
     * @private
     */
    _getStackTrace: function() {}
};


/**
 * Provides IO-related classes and functions.
 * @namespace IO 
 */
var IO = {
    /**
     * @constant
     * @private
     */
    P_OPEN: 1,

    /**
     * @constant
     * @private
     */
    P_CLOSE: 2,

    /**
     * @constant
     * @private
     */
    P_DATA: 3,

    /**
     * Type of Connector.
     * @constant
     * @type Number
     * @private
     */
    CONN_UDPSOCKET: 1,
    /**
     * Type of Connector.
     *  @constant
     *  @type Number
     * @private
     */
    CONN_TCPSOCKET: 2,
    /**
     * Type of Connector.
     *  @constant
     *  @type Number
     * @private
     */
    CONN_TCPSERVER: 3,
    /**
     * Type of Connector.
     *  @constant
     *  @type Number
     * @private
     */
    CONN_PIPE: 4,
    /**
     * Type of Connector.
     *  @constant
     *  @type Number
     * @private
     */
    CONN_FILE: 5,
    /**
     * Type of Connector.
     *  @constant
     *  @type Number
     * @private
     */
    CONN_SSLSOCKET: 6,

    /**
     * Type of Connector.
     *  @constant
     *  @type Number
     * @private
     */
    CONN_SAGUARO: 7,

    
   /**
    * Close an IO connector. Used by IO.Manager.
    * @param seqno         Sequence number
    * @param conn          Connection id
    * @private
    */
   close: function(/** Number */seqno, /** Number */conn) {},

   /**
    * Open an IO connector. Used by IO.Manager.
    * @param seqno         Sequence number
    * @param kind          Connection type
    * @param params        Object wth connection setup data
    * @private
    */
   open: function(/** Number */seqno, /** Number */kind, /** Object */params) {},

   /**
    * Shutdowns all IO connections, IO connections are not notified!
    * @private
    */
   shutdown: function() {},

   /**
    * Send data on an tcp socket.
    * @param id            Connection id
    * @param data
    * @private
    */
   sendTcpData: function(/** Number */qid, /** String */data) {},
   /**
    * Send file on an tcp socket.
    * @param id            Connection id
    * @param path          Path to file
    * @private
    */
   sendTcpFile: function(/** Number */qid, /** String */path) {},
   /**
    * Send data on a udp socket
    * @param id            Connection id
    * @param dst
    * @param dstport
    * @param data
    * @private
    */
   sendUdpData: function(/** Number */qid, /** String */dst, /** Number */dstport, /** String */data) {}
};





/**
 * Allows to  retrieve the current system time in milliseconds.
 * @class
 */
var Clock = {
   /**
    * Returns system time in milliseconds.
    * @returns {Number} the system time
    * @static
    */
   get: function() {},

   /**
    * Program timer.
    * @param millis    absolute time when timeout should occur (0 disables timer)
    * @param callback  function to call
    * @static
    * @private
    */
   set: function(/** Number */millis) {}
};



/**
 * IO.Inet provides functionality IP address lookup functions.
 * Also available as Inet in the global namespace.
 * @class
 */
IO.Inet = {
   /**
    * Resolve host by name.
    * @param name Name of host
    * Returns hostent structure with properties
    * <ul>
    * <li>name: String</li>
    * <li>aliases: String[], name of aliases</li>
    * <li>addresses: String[], addresses in dot notation</li>
    * </ul>
    * @returns {Object} hostent structure
    * @static
    */
   gethostbyname: function(/** String */name) {},
   
   /**
    * Resolve host by address.
    * @param addr Address in dot notation
    * Returns hostent structure with properties
    * <ul>
    * <li>name: String</li>
    * <li>aliases: String[], name of aliases</li>
    * <li>addresses: String[], addresses in dot notation</li>
    * </ul>
    * @returns {Object} hostent structure
    * @static
    */
   gethostbyaddr: function(/** String */addr) {},

    /**
     * @returns {String} host name
     * @static
     */
    gethostname: function() {}
};



/**
 * IO.File provides file related native functionality.
 * Most functions may throw an exception in case of error.
 * @class
 */
IO.File = {
   /**
    * Closes a file.
    * @param handle   File handle
    */
   fclose: function(/** Object */handle) {},

   /**
    * Flush file handle.
    * @param handle   File handle
    */
   fflush: function(/** Object */handle) {},

   /**
    * Writes string contents to file. String is treated as binary data.
    * @param handle    File handle
    * @param bytes     Binary string
    * @throws {Object} an exception in case of error
    */
   fwrite: function(/** Object */handle, /** String */bytes) {},

   /**
    * Read cnt bytes from file.
    * @param handle   File handle  
    * @param cnt      Number of bytes to read
    * @throws {Object} an exception in case of error
    * @returns {String} up to 'cnt' bytes
    */
   fread: function(/** Object */handle, /** Number */cnt) {},
   
   /**
    * Get current working directory.
    * @throws {Object} an exception in case of error
    * @returns {String} current working directory
    */
   getcwd: function(){},

    /**
     * SEEK_SET, see fseek.
     * @type Number
     * @constant 
     */
    SEEK_SET: 1,
    /**
     * SEEK_CUR, see fseek.
     * @type Number
     * @constant 
     */
    SEEK_CUR: 2,
    /**
     * SEEK_END, see fseek.
     * @type Number
     * @constant 
     */
    SEEK_END: 3,

    /**
     * See stdlib C function fseek.
     * @param handle
     * @param offset
     * @param whence
     */
    fseek: function(/** Object */handle, /** Number */offset, /** Number */whence){},

    /**
     * See stdlib C function ftell.
     * @param handle
     * @returns {Number}
     */
    ftell: function(/** Object */handle) {} ,

    /**
     * See stdlib C function rewind.
     * @param handle
     */
    rewind: function(/** Object */handle) {} 

};


   
/**
 * IO.Process offers basic OS-process related functions.
 * Use IO.Process to start a process and to register a listener for its termination.
 * @class
 */
IO.Process = {

   /**
    * Start a process.
    * @param arg  On Windows, command line, on UNIX, path
    * @param argv  Only on UNIX, array of args
    * @returns {Number} process pid
    * @static
    * @private
    */
   create: function(/** String */arg, /** String[] */args) {},

   /**
    * Kill a process.
    * @param pid Process pid
    * @static
    */
   kill: function(/** Number */pid){},

   /**
    * Set environment variable
    * @param name  Environment variable name
    * @param value Value
    * @static
    */
   setenv: function(/** String */name, /** String */value) {},

   /**
    * Get value of environment variable
    * @param name Environment variable name
    * @returns {String} value of environment variable
    * @static
    */
   getenv: function(/** String */name) {},

   /**
    * Remove variable from environment.
    * @param name Environment variable name
    * @static
    */
   unsetenv: function(/** String */name) {},

   /**
    * Return process environment.
    * @returns {String[]} environment variable
    * @static
    */
   environ: function(/** String */name) {},

    /**
     * Invoke 'exec()'.
     * @param path
     * @param argv
     * @returns {Number} return value of exec() if failed
     */
    exec:     function(/** String */path, /** String[] */argv) {},

    /**
     * Restart using pilot.
     * @param pipeName  Name of pipe to pilot
     * @param bytes     Data to write into pipe before exit
     * @private
     */
    _restart:     function(/** String */pipeName, /** String[] */bytes) {}
};








/**
 * File IO handled by background thread.
 * @class
 * @private
 */
IO.FAIO = {
   /**
    * Open file.
    * @returns {Object} file handle
    * @static
    * @private
    */
   open: function(/** String */name, /** String */mode) {},

   /**
    * Close file.
    * @param file File handle
    * @static
    * @private
    */
   close: function(/** Object */file) {},

   /**
    * Close file.
    * @param cmdif  Command id to match reponse
    * @param file   File handle
    * @static
    * @private
    */
   _flush: function(/** Number */cmdid, /** Object */file) {},

   /**
    * Write to file.
    * @param cmdif  Command id to match reponse
    * @param file   File handle
    * @param data
    * @static
    * @private
    */
   _write: function(/** Number */cmdid, /** Object */file, /** String */data) {},

   /**
    * REad from file.
    * @param cmdif  Command id to match reponse
    * @param file   File handle
    * @param cnt
    * @static
    * @private
    */
   _read: function(/** Number */cmdid, /** Object */file, /** Number */cnt) {}
};



/**
 * Wraps a native byte (signed 8 bit) array to a Javascript object. Elements can ge retreived 
 * and set using [] accessors.
 * @class
 * @constructor
 * @param cnt
 */
I8Array = function(/** Number */cnt) {};

I8Array.prototype = {
    /**
     * Number of elements
     * @type Number
     */
    length: 0,
    /**
     * Bytes per element.
     * @type Number
     */
    BYTES_PER_ELEMENT: 0,

    /**
     * Convert to binary string.
     * @returns {String} binary string representation
     */
    toBinaryString: function() {
	return null;
    },

    /**
     * Convert to UTF8.
     * @returns {String} UTF8 representation
     */
    toUtf8String: function() {
	return null;
    }
};



/**
 * Wraps a native byte (unsigned 8 bit) array to a Javascript object. Elements can ge retreived 
 * and set using [] accessors.
 * @class
 * @constructor
 * @see Int8Array
 */
U8Array = function() {};



/**
 * @class
 * @static
 * @private
 */
PrimArray = {
    /**
     * @private
     */
    copy: function(/** U8Array */dst, /** Number */dstoff, /** U8Array */src, /** Number */srcoff, /** Number */cnt){}
};



/**
 * @namespace SSL
 * @private
 */
SSL = {};
