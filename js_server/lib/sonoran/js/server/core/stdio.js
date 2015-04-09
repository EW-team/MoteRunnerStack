//  (C) COPYRIGHT INTERNATIONAL BUSINESS MACHINES CORPORATION 2006-2010
//                       ALL RIGHTS RESERVED
//        IBM Research Division, Zurich Research Laboratory
// --------------------------------------------------------------------


assert(Stdio);

/**
 * Reference to IO.StdoutConnector.
 * @type IO.StdoutConnector
 * @private
 */
STDOUT = null;


/**
 * Reference to IO.StdinConnector.
 * @type IO.StdinConnector
 * @private
 */
STDIN = null;



/**
 * Convenience function. Send string to standard out.
 * @param {String} str
 */
function print(str) {
    STDOUT.print(str);
}


/**
 * Convenience function. Send string to standard out and append newline.
 * @param {String} str
 */
function println(str) {
    STDOUT.print(str+"\n");
}



/**
 * Convenience function. Flush stdout.
 */
function flush() {
    STDOUT.flush();
}


/**
 * Convenience function. Read line(s) from stdin. If a callback function is specified,
 * it is called with the next line getting available on stdin. Call readln again, if
 * you are interested in further input from stdin. If no callback is specified
 * or a number is given, the function call blocks until input is available and returns
 * with an array of lines made available on stdin. If a number is specified, it is
 * interpreted as timeout specification which leads to a timer exception on expiration.
 * @param {Function} callback Optional, callback or timeout specification, if unspecified, blocking call
 * @returns {String[]} lines read (either on callback invocation or on return from this call)
 */
function readln(/** Function|Number */callback) {
    return STDIN.readln(callback);
}


/**
 * Print formatted string to standard out.
 * @param {String} str  format string
 * @param ...           arguments to be formatted
 */
function printf (str) {
    STDOUT.print(svprintf(arguments[0],1,arguments));
}



//==================================================================================================
//
// Stdout Connector
//
//==================================================================================================

/**
 * IO.StdoutConnector represents the connection to stdout managed by the IO thread.
 * Use the functions flush and write to send data to stdout.
 * @class
 * @augments Core.Queue
 * @constructor
 * @private
 */
IO.StdoutConnector = function() {
   Core.Queue.call(this, Core.STDOUT_QUEUE);
   this.flushWaiters = [];
};

/** */
IO.StdoutConnector.prototype = extend(
   Core.Queue.prototype,
   /** @lends IO.StdoutConnector.prototype */
   {
      /**
       * @param blob 
       * @private 
       */
      onBlob: function(/** Object */blob) {
         var tids = this.flushWaiters;
         this.flushWaiters = [];
         for (var i = 0; i < tids.length; i++) {
            Thread.makeRunnable(tids[i]);
         }
      },
      /**
       * Send line to standard out
       * @param line String
       * @private
       */
      print: function(/** String */line) {
          CONSOLE_LISTENERS.notify(line);
	  if (line != null) {
              Stdio.write(line.toString());
	  }
      },
      /**
       * Send line to standard out where a newline is added
       * @param line String
       * @private
       */
      println: function(/** String */line) {
         this.print(line+"\n");
      },
      /**
       * Send data to stdout.
       * @param data String
       * @private
       */
      write: function(/** String */line) {
         this.print(line);
      },
      /**
       * Flush the standard out stream. Returns when stream has been flushed.
       * @private
       */
      flush: function() {
         Stdio.flush();
//Bug on rivoli(eir) - synchronous flush leads to: ReleaseSemaphore failed: (6) The handle is invalid.
//         var tid = Thread.current();
//         this.flushWaiters.push(tid);
//         Thread.suspend();
      },
       /**
        * @private
        */
      toString: function() {
         return "IO.StdoutConnector";
      }
   }
);



//==================================================================================================
//
// Stdin Connector
//
//==================================================================================================

/**
 * IO.StdinConnector represents the connection to stdin managed by the IO thread.
 * @class
 * @augments IO.Queue
 * @constructor
 * @private
 */
IO.StdinConnector = function() {
    this.ioqueue = new IO.Queue(this, Core.STDIN_QUEUE);
    this.readlnCB = null;
};

/** @private */
IO.StdinConnector.prototype = { 
    /**
     * @type String
     * @private
     */
    buf: null,
    /**
     * @type IO.Queue
     * @private
     */
    ioqueue: null,
    
    /**
     * @private
     */
    onClose: function() {
	QUACK(0, sprintf("%s: onClose..", this));
    },
    
    
    /**
     * @private
     */
    onTimeout: function(/** AOP.ERR */status) {
       	this.close(status);
    },

    
    /**
     * @returns {Boolean} whether stdin is still alive
     * @private
     */
    isAlive: function() {
	return this.ioqueue.isAlive();
    },

    
    /**
     * Receives data from IO thread, scans for line and distributes them to listener.
     * @private
     */
    onBlob: function(/** Object */blob) {
	if (this.readlnCB) {
            var s = blob.data;
	    assert(s);
	    this.buf += s;
            var lines = this.scanLines();
            if (lines.length > 0) {
		var callback = this.readlnCB;
		this.readlnCB = null;
                for (var i = 0; i < lines.length; i++) {
                    callback(lines[i]);
                }
            }
	}
    },

      
    /**
     * Install specified callback to receive the next line entered on stdin. Before the callback
     * is invoked with a line, it is removed from this instance. The client has to
     * call readln again to receive another line from stdin. Note that this instance
     * does not allow for multiple listeners to register at the same time.
     * @param callback
     * @returns {String} line on callback invocation
     * @private
     */
    readln: function(callback) {
        this.buf = "";
        if (!callback || (typeof(callback) === 'number')) {
            this.ioqueue.setBlockingMode(true);
            while(true) {
		try {
                    var blob = this.ioqueue.recv(callback);
                    var s = blob.data;
	            assert(s);
	            this.buf += s;
                    var lines = this.scanLines();
                    if (lines.length > 0) {
			this.ioqueue.reset();
			return lines;
                    }
		} catch (x) {
                    this.ioqueue.reset();
                    throw x;
		}
            }
        } else {
            assert(this.readlnCB===null, "Invalid StdinConnector state: read operation is already in progress");
            this.ioqueue.setBlockingMode(false);
	    this.readlnCB = callback;
            return undefined;
        }
        assert(0);
    },

    
    /**
     * @returns {String[]} lines
     * @private
     */
    scanLines: function() {
        var lines = [];
        while(true) {
	    var idx = this.buf.indexOf('\n');
	    if (idx < 0) {
		break;
	    }
	    var line = this.buf.substr(0, idx);
	    if (idx+1 < this.buf.length) {
		this.buf = this.buf.substr(idx+1);
	    } else {
		this.buf = "";
	    }
	    if ((line.length > 0) && (line.charCodeAt(line.length-1) == '\r')) {
		line = line.substr(0, line.length-1);
	    }
            assert(typeof(line)==='string');
            lines.push(line);
        }
        return lines;
    },

    /**
     * @private
     */
    toString: function() {
        return "IO.StdinConnector";
    }
};
