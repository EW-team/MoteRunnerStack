//  (C) COPYRIGHT INTERNATIONAL BUSINESS MACHINES CORPORATION 2006-2010
//                       ALL RIGHTS RESERVED
//        IBM Research Division, Zurich Research Laboratory
// --------------------------------------------------------------------
assert(IO);



//==================================================================================================
//
// IO.Exception
//
//==================================================================================================

Exception.extend(
    "IO.Exception",
    /**
     * @lends IO.Exception.prototype
     */
    {
	/**
	 * IO exception class.
	 * @augments Exception
	 * @constructs
	 * @param err       Error description/code/instance
	 * @param message   Optional
	 */
	__constr__: function(/** String|AOP.ERR */message) {
	    assert(message);
	    var code = ERR_IO;
	    var err, cause;

	    if (typeof(message) !== 'string') {
		assert(message instanceof AOP.ERR);
		err = message;
		message = "IO error";
		cause = AOP.mapERR2Ex(err);
	    }

	    Exception.call(this, message, code, undefined, cause);
       }
    }
);






//==================================================================================================
//
// IO.Queue
//
//==================================================================================================




/**
 * IO.Queue implements the base class for IO handling. 
 * IO.TCPSocket, IO.UDPSocket inherit this class to send and receive packets. 
 * IO.Queue can be used in blocking or non-blocking mode. 
 * <ul><li>
 * In non-blocking mode, packets are received in a callback method. 
 * </li><li>
 * In blocking mode, the caller must call the 'recv' method to wait for and retrieve
 * packets. 'canRecv' can be called to check for available packets.
 * </li></ul>
 * @class
 * @augments Core.Queue
 * @constructor
 * @param receiver User of queue
 * @param id       Optional, queue id
 * @private
 */
IO.Queue = function(/** Object */receiver, /** Number */id) {
    Core.Queue.call(this, id);
    this.receiver = receiver;
    assert(receiver.onClose);
    assert(receiver.onBlob);
    assert(receiver.onTimeout);
};

/** Prototype. */
IO.Queue.prototype = extend(
   Core.Queue.prototype,
   /** @lends IO.Queue.prototype */
   {
      /**
       * Timer if send operation was invoked with a timeout specification.
       * @private
       */
      timer: null,

      /**
       * Queue for blocking mode.
       * @private
       */
      queue: null,

      /**
       * Receiver of onOpen, onClose, onBlob, onTimeout.
       * @private
       */
      receiver: null,


      /**
       * Set IO queue options. Before IO.Queue is opened.
       * @param options
       * @returns {IO.Queue} this
       * @private
       */
      setOptions: function(/** IO.Queue.Options */options) {
         if (this.timer!=null||this.queue!=null) {
            throw "Options have already been set or an operation was already undertaken";
         }
         this.forBlockingMode = options.forBlockingMode;
         if (this.forBlockingMode) {
            this.queue = new Thread.Queue("Thread.Queue:" + this.toString(), options.queueSize, options.dropOnOverflow, options.dropCnt);
         } else {
            this.timer = null;
         }
         return this;
      },

      
      /**
       * Set to blocking or non-blocking mode. Override onBlob to receive data in non-blocking mode.
       * Use recv in blocking mode.
       * @param flag
       * @returns {IO.Queue} this
       * @private
       */
      setBlockingMode: function(/** Boolean */flag) {
         this.reset();
         this.setOptions(flag ? IO.Queue.DfltBlockingOptions : IO.Queue.DfltNonBlockingOptions);
         return this;
      },


       /**
	* Install id and this queue at the Core.
	* @private
	*/
       install: function(/** Number */id) {
	   assert(this.id < 0, "IO.Queue already active");
	   this.id = id;
	   Core.addQ(this, this.onBlob);
       },

      /**
       * Resets the queue to non blocking mode, cancels timer and sets queue to null.
       * @private
       */
      reset: function() {
         if (this.timer) {
	    this.timer.cancel();
	    this.timer = null;
	 }
         if (this.queue) {
            this.queue.close();
            this.queue = null;
         }
         this.forBlockingMode = false;
      },
      
      /**
       * @param kind
       * @param para
       * @param callback
       * @private
       */
      open: function(/** Number */kind, /** Object */para, /** Function */callback) {
	  if (this.id >= 0) { throw "IO.Queue already opened"; }
	  if (callback&&BC.is(callback)) { return BC.exec(arguments.callee, this, arguments); }
          this.id = Runtime.allocQueue();
	  var _this = this;
          Core.addQ(this, function(blob) {
              assert(blob.msgtype === IO.P_OPEN);
              var status;
              if (blob.error) {
		  _this.clear();
		  status = new AOP.ERR("Open-operation failed: " + blob.error);
              } else {
		  Core.setQ(_this, _this.onBlob);
		  status = new AOP.OK(blob);
              }
	      callback(status);
          });
          IO.open(this.id, kind, para);
      },

      
      /**
       * Remove queue, set id negative, call reset().
       * @private
       */
      clear: function() {
         assert(this.id > 0);
         Core.removeQ(this);
         this.id = -1;
         this.reset();
      },

      
      /**
       * Close this IO connection. Even if it has been closed before, the callback is invoked.
       * @param status    Optional, an AOP.Result instance signaling the reason for the close operation and forwarded to onClose
       * @param callback  
       * @private
       */
      close: function(/** AOP.Result */status, /** DFLT_ASYNC_CB */callback) {
	  if (callback&&BC.is(callback)) { return BC.exec(arguments.callee, this, arguments); }
         status = status ? status : new AOP.ERR("Resource closed");
         var _this = this;
         if (this.id<0) {
            if (callback) { 
		callback(status); 
	    }
         }  else {
            Core.setQ(this, function(blob) {
               if (blob.msgtype != IO.P_CLOSE) {
                  //QUACK(0, "Ignore packet for queue: " + _this.id + ":\n" + Util.formatData(blob));
                  return;
               }
               _this.clear();
               _this.receiver.onClose(status);
               if (callback) { 
		   callback(status); 
	       }
            });
            IO.close(this.id);
         }
      },

      
       /**
	* Setup timer, used by subclasses on send operations.
	* @private 
	*/
      setupTimer: function(/** Number */timeout) {
          if (timeout) {
              assert(!this.forBlockingMode, "Unsupported timeout for send operation in blocking mode");
              assert(!this.timer, "Send operation with programmed timer already active");
              var _this = this;
	      this.timer = Timer.timeoutIn(timeout, function(status) {
		  _this.timer = null;
		  _this.receiver.onTimeout(status);
              });
	  }
      },

      
      /**
       * @param blob
       * @private 
       */
      onBlob: function(/** Object */blob) {
         if (blob.msgtype == IO.P_CLOSE) {
            this.close();
            return;
         }
	 if (this.timer) {
            assert(!this.forBlockingMode);
	    this.timer.cancel();
	    this.timer = null;
	 }

         if (this.forBlockingMode) {
            this.queue.put(blob);
         }
         this.receiver.onBlob(blob);
      },

      
       /**
        * A packet is ready to pickup without blocking. Only supported by a connection operated in blocking mode.
        * @returns {Boolean} flag
	* @private
        */
      canRecv: function() {
         assert(this.forBlockingMode, "Invalid non-blocking IO queue mode");
         return !this.queue.isEmpty();
      },
      
      
      /**
       * Receive a packet from a IO queue. A TimerException is thrown in case of timeout, an IOException is thrown
       * in case the socket has been closed.
       * @param timeout Timeout in milliseconds; if undefined, indefinite.
       * @returns {Object}
       * @throws {Exception} exception, possibly with ERR_RESOURCE_GONE when queue was closed
       * @throws {Timer.Exception} on timeout
       * @private
       */
      recv: function(/** Number */timeout) {
         assert(this.forBlockingMode, "Invalid non-blocking IO queue mode");
         return this.queue.get(timeout);
      },


       /**
	* @returns {String}
	* @nodoc
	*/
       toString: function() {
	   return "IO.Queue:" + this.id;
       }
   }
);




/**
 * Options for IO.Queue.
 * @class
 * @param forBlockingMode    Enable recv function and blocking read
 * @param queueSize          Maximum number of packets stored in queue, default is 128
 * @param dropOnOverflow     Drop messages on overflow, default is true
 * @param dropCnt            Number of messages dropped on queue overflow, default is queueSize/10
 * @private
 */
IO.Queue.Options = function(/** Boolean */forBlockingMode, /** Number */queueSize, /** Number */dropOnOverflow, /** Number */dropCnt) {
   this.forBlockingMode = (forBlockingMode==undefined||forBlockingMode==null) ? false : forBlockingMode;
   this.queueSize = queueSize ? queueSize : 128;
   this.dropOnOverflow = (dropOnOverflow==undefined||dropOnOverflow==null) ? true : false;
   this.dropCnt = dropCnt ? dropCnt : parseInt(queueSize/10);
   this.dropCnt = (this.dropCnt<=0) ? 1 : this.dropCnt;
};


/**
 * Default options object for an IO.Queue in non-blocking mode.
 * @type IO.Queue.Options
 * @private
 */
IO.Queue.DfltNonBlockingOptions = new IO.Queue.Options(false);


/**
 * Default options object for an IO.Queue in blocking mode.
 * @type IO.Queue.Options
 * @private
 */
IO.Queue.DfltBlockingOptions = new IO.Queue.Options(true);




//==================================================================================================
//
// StringReader
//
//==================================================================================================

/**
 * IO.BinaryStringReader treats a binary string as stream.
 * @class
 * @constructor
 * @param buf      Input buffer
 * @param off      Optional, default 0
 * @param len      Optional, default length of input buffer
 */
IO.BinaryStringReader = function(/** String */buf, /** Number */off, /** Number */len) {
    if (!buf) {
	return;
    }
    this.buf = buf;
    this.off = (off||(off==0)) ? off : 0;
    this.pos = this.off;
    this.len = (len||(len==0)) ? len : this.buf.length;
};

/** Close stream. */
IO.BinaryStringReader.prototype.close = function() {};

/**
 * Read byte (0<=b<=255). EOF leads to return value of -1.
 * @returns {Number} the read byte
 */
IO.BinaryStringReader.prototype.readByte = function() {
    if (this.pos >= this.off+this.len) {
	return -1;
    }
    return this.buf.charCodeAt(this.pos++);
};

/**
 * Read up to 'cnt' bytes. EOF leads to return value of null.
 * @param cnt Number of bytes to read
 * @returns {String} the read 'cnt' bytes
 */
IO.BinaryStringReader.prototype.readBytes = function(cnt) {
    if (this.pos >= this.off+this.len) {
	return null;
    }
    if (this.pos+cnt >= this.off+this.len) {
	cnt = this.len-(this.pos-this.off);
    }
    var ret = this.buf.substr(this.pos, cnt);
    this.pos += cnt;
    return ret;
};

/**
 * Return current position in buffer.
 * @returns {Number} the current position
 */
IO.BinaryStringReader.prototype.getPos = function() {
    return this.pos;
};

/**
 * Return internal buffer.
 * @returns {String} the internal buffer
 */
IO.BinaryStringReader.prototype.getBuf = function() {
    return this.buf;
};

/**
 * Skip 'cnt' bytes in stream.
 * @param cnt Number of bytes to skip
 */
IO.BinaryStringReader.prototype.skip = function(cnt) {
    this.pos += cnt;
};





//==================================================================================================
//
//LineReader
//
//==================================================================================================

/**
 * IO.LineReader reads lines from an underlying stream, e.g. an IO.FileReader stream.
 * @class
 * @constructor
 * @param rdr A reader instance such as IO.FileReader
 */
IO.LineReader = function(/** Object */rdr) {
    this.rdr = rdr;
    this.buf = "";
    this.number = -1;
    this.lines = [];
};

/**
 * Close this reader and the underlying stream.
 */
IO.LineReader.prototype.close = function() {
    if (this.rdr) {
	this.rdr.close();
	this.rdr = null;
    }
};

/**
 * Return next line or null at EOF.
 * @returns {String} the next line or null in case of EOF
 */
IO.LineReader.prototype.readLine = function() {
    if (this.lines.length === 0) {
	while(true) {
	    var s = this.rdr.readBytes(80);
	    if (s === null) {
		if (this.buf.length === 0) {
		    return null;
		}
		var sa = this.buf.split(/\r?\n/);
		this.lines = this.lines.concat(sa);
		this.buf = "";
		break;
	    } else {
		this.buf += s;
		var sa = this.buf.split(/\r?\n/);
		if (sa.length > 1) {
		    var last = sa.length-1;
		    this.buf = sa[last];
		    for (var i = 0; i < last; i++) {
			this.lines.push(sa[i]);
		    }
		    break;
		}
	    }
	}
    }
    assert(this.lines.length>0);
    this.number += 1;
    return this.lines.splice(0, 1)[0];
};

/**
 * Return last read line number.
 * @returns {Number} the current line number
 */
IO.LineReader.prototype.getNumber = function() {
    return this.number;
};







//==================================================================================================
//
//DataBuffer
//
//==================================================================================================


U8Array = Uint8Array;
I8Array = Int8Array;

Uint8Array.prototype.toBinaryString = function(/** Number */off, /** Number */cnt) {
    if (!off) { off = 0; }
    if (!cnt) { cnt = this.length; }
    return PrimArray.toBinaryString(this, off, cnt);
};




/**
 * Wraps a U8Array to provide a binary, resizeable buffer class.  Bytes can be added
 * and manipulated freely. Additonally, the class provides few methods like 'substr'
 * similar to the String class.
 * @class
 * @constructor
 * @param bytes  If array, consumed by this buffer; if number, length of array internally created
 * @param off
 * @param len
 */
DataBuffer = function(/** String|U8Array|Number */bytes, /** Number */off, /** Number */len) {
    if (typeof(bytes) === 'string') {
	this.bytes = new U8Array(bytes.length);
	this.off = 0;
	this.len = 0;
	this.appendBinaryString(bytes);
    } else if (typeof(bytes) === 'number') {
	this.off = 0;
	this.len = 0;
	this.bytes = new U8Array(bytes);
    } else {
	this.bytes = bytes;
	this.off = off?off:0;
	this.len = len?len:this.bytes.length;
    }
    assert((this.bytes instanceof U8Array) || (this.bytes instanceof I8Array));
};


/** @private */
DataBuffer.prototype = {
    /**
     * Append contents of other buffer.
     * @param other
     */
    appendBuffer: function(/** DataBuffer */other) {
	assert(other instanceof DataBuffer);
	var capacity = this.off + this.len + other.len;
	if (capacity > this.bytes.length) {
	    this.resize(capacity);
	}
	PrimArray.copy(this.bytes, this.off + this.len, other.bytes, other.off, other.len);
	this.len += other.len;
    },

    /**
     * Add contents of specified array.
     * @param other
     */
    appendU8Array: function(/** U8Array */other) {
	assert(other instanceof U8Array);
	var capacity = this.off + this.len + other.length;
	if (capacity > this.bytes.length) {
	    this.resize(capacity);
	}
	PrimArray.copy(this.bytes, this.off + this.len, other, 0, other.length);
	this.len += other.length;
    },


    /**
     * Add string where string points to a binary string.
     * @param s
     */
    appendBinaryString: function(/** String */s) {
	for (var i = 0; i < s.length; i++) {
	    this.appendU8(0xff&s.charCodeAt(i));
	}
    },


    /**
     * Add byte to this buffer.
     * @param n
     */
    appendU8: function(/** Number */n) {
	var dstCapacity = this.off + this.len + 1;
	if (dstCapacity > this.bytes.length) {
	    this.resize(dstCapacity);
	}
	this.bytes[this.off+this.len] = n;
	this.len += 1;
    },


    /**
     * Resize internal buffer for at least 'dstCapacity' bytes.
     * @param dstCapacity
     * @private
     */
    resize: function(/** Number */dstCapacity) {
	assert(dstCapacity>this.bytes.length);
	var capacity = 8;
	while(capacity<dstCapacity) {
	    capacity *= 2;
	}
	assert(capacity>this.bytes.length);
	var bytes = new U8Array(capacity);
	PrimArray.copy(bytes, 0, this.bytes, this.off, this.len);
	this.bytes = bytes;
	this.off = 0;
    },




    /**
     * @private
     */
    concat: function() {
	assert(0);

    },

    /**
     * String compatibility function. 
     * @returns {Number} at index
     */
    charCodeAt: function(/** Number */idx) {
	return this.getAt(idx);
    },


    /**
     * @param idx
     * @returns {Number}
     */
    getAt: function(/** Number */idx) {
	if (idx >= this.len) {
	    throw new Exception(sprintf("Out of bounds: %d <-> %d", idx, this.len));
	}
	var b = this.bytes[this.off + idx];
	return b;
    },


    /**
     * Set byte at index.
     * @param idx
     * @param value
     */
    setAt: function(/** Number */idx, /** Number */value) {
	if (idx >= this.len) {
	    throw new Exception(sprintf("Out of bounds: %d <-> %d", idx, this.len));
	}
	this.bytes[this.off + idx] = value;
    },

    
    /**
     * Parse JSON text at specified offset.
     * @param off
     * @param len
     * @returns {Object} Object resolved from JSON data
     */
    toJson: function(/** Number */off, /** Number */len) {
	if (off===undefined) { off = 0; }
	if (len===undefined) { len = this.len; }
	if (off < 0 || len < 0) { throw new Exception("Negative parameter"); }
	if (off + len > this.len) { throw new Exception("Out of bounds"); }
	return JSON3.parse(this.bytes, this.off + off, len);
    },

    /**
     * @private
     */
    reshift: function() {
	if (this.off === 0) {
	    return;
	}
	PrimArray.copy(this.bytes, 0, this.bytes, this.off, this.len);
	this.off = 0;
    },
    
    /**
     * Binary string compatibility function, see String.substring.
     * @param i1
     * @param i2
     * @returns {String}
     */
    substring: function(/** Number */i1, /** Number */i2) {
	if (i2 === undefined) {
	    i2 = this.len;
	}
	if (i1 < 0) { i1 = 0; }
	if (i2 < 0) { i2 = 0; }
	if (i1 > this.len) { i1 = this.len; }
	if (i2 > this.len) { i2 = this.len; }
	if (i1 === i2) {
	    return "";
	}
	if (i1 > i2) {
	    var tmp = i2;
	    i2 = i1;
	    i1 = tmp;
	}
	assert((this.bytes instanceof U8Array) || (this.bytes instanceof I8Array));
	var s = PrimArray.toBinaryString(this.bytes, this.off + i1, i2 - i1);
	//QUACK(0, "SUBSTR: " + s);	
	return s;
    },
    
    /**
     * Binary string compatibility function, see String.substring.
     * @param s
     * @param fromIndex
     * @returns {Number}
     */
    indexOf: function(/** String */s, /** Number */fromIndex) {
	assert(typeof(s) === 'string');
	var slen = s.length;
	if (!fromIndex) { fromIndex = 0; }
	if (fromIndex < 0 || fromIndex >= this.len) {
	    throw new Exception(sprintf("Index out of bounds: %d <-> %d", fromIndex, this.len));
	}
	var off = this.off + fromIndex;
	for (; off < this.off+this.len; off++) {
	    var match = true;
	    for (var j = 0; j < slen; j++) {
		if (off + j >= this.len) {
		    return -1;
		}
		if (this.bytes[off+j] !== s.charCodeAt(j)) {
		    match = false;
		    break;
		}
	    }
	    if (match) {
		return off - this.off;
	    }
	}
	return -1;
    },


    /**
     * Return binary string for bytes starting at 'off', 'len' bytes long.
     * @param off
     * @param len
     * @returns {String}
     */
    getBinaryString: function(/** Number */off, /** Number */len) {
	if (!len) { len = this.len;	   }
	if (!off) { off = 0;	   }
	if (off < 0) { off = 0; }
	if (off > this.len) { off = this.len; }
	if (off + len > this.len) { len = this.len - off; }
	if (len === 0) {
	    return "";
	}
	var s = PrimArray.toBinaryString(this.bytes, this.off + off, len);
	//QUACK(0, "SUBSTR: " + s);	
	return s;
    },

    /**
     * Return number of stored bytes.
     * @returns {Number}
     */
    getLength: function() {
	return this.len;
    },


    // /**
    //  * @returns {U8Array}
    //  * @private
    //  */
    // getBytes: function() {
    // 	return this.bytes;
    // },


    /**
     * @param off
     * @private
     */
    setOff: function(/** Number */off) {
	if (off < 0) { throw new Exception("Negative parameter"); }
	if (off > this.len) { throw new Exception("Out of bounds"); }
	this.off = this.off + off;
	this.len = this.len - off;
    },


    /**
     * Create new buffer for the bytes stored in this buffer.
     * @param off
     * @param len
     * @returns {IO.DateBuffer}
     */
    getBuffer: function(/** Number */off, /** Number */ len) {
	if (off < 0) { throw new Exception("Negative parameter"); }
	if (len < 0) { throw new Exception("Negative parameter"); }
	if (off+len > this.len) { throw new Exception("Out of bounds"); }
	return new DataBuffer(this.bytes, this.off+off, len);
    },

    /**
     * @nodoc
     */
    toString: function() {
	return Util.Formatter.genHexTable(this.substring(0), 0, 16, false).join("\n");
    }
};






//==================================================================================================
//
// IO.FileReader
//
//==================================================================================================


/**
 * An IO.FileReader instance allows to treat a file as stream.
 * @class 
 * @constructor
 * @param name Filename to open in read mode
 */
IO.FileReader = function(/** String */name) {
    this.file = IO.File.fopen(name, "r");
};

/**
 * Close file.
 */
IO.FileReader.prototype.close = function() {
    if (this.file) {
	IO.File.fclose(this.file);
	this.file = null;
    }
};

/**
 * Read byte (0<=b<=255). EOF leads to a return value of -1.
 * Native code might throw an exception.
 * @returns {Number} the read byte
 */
IO.FileReader.prototype.readByte = function() {
    var s = IO.File.fread(this.file, 1);
    if (!s) {
	return -1;
    }
    assert(s.length==1);
    return s.charCodeAt(0);
};

/**
 * Read up to 'cnt' bytes. EOF leads to a return value of null.
 * Native code might throw an exception.
 * @param cnt Number of bytes to read
 * @returns {String} the read bytes
 */
IO.FileReader.prototype.readBytes = function(cnt) {
    var s = IO.File.fread(this.file, cnt);
    if (!s) {
	return null;
    }
    return s;
};




//==================================================================================================
//
// IO.FileUtils
//
//==================================================================================================


/**
 * IO.File.Utils provides utilities based on IO.File functions.
 * @class
 */
IO.FileUtils = {
   /**
    * List directory entries matching given regexp. Returns array
    * of matched filename entries where each filename might include
    * the originating directory path dependent on parameter fullPaths
    * @param dir       Directory to list
    * @param regex     Regex for filenames to match
    * @param fullPaths Optional, default true, function returns array with full paths of entries
    * @returns {String[]} an array with matching filenames
    * @static
    */
    listDir: function(/** String */dir, /** RegEx */regex, /** Boolean */fullPaths) {
	if (fullPaths == undefined) {
	    fullPaths = true;
	}
	if (typeof(regex) == 'string') {
	    regex = new RegExp(regex);
	}
	assert(regex instanceof RegExp);
	var entries = IO.File.listDir(dir);
	var ret = [];
	for (var i = 0; i < entries.length; i++) {
	    var e = entries[i];
	    if (regex.test(e)) {
		if (fullPaths) {
		    ret.push(dir+'/'+e);
		} else {
		    ret.push(e);
		}
	    }
	}
	return ret;
    },


    /**
     * Copy all files from srcdir to dstdir. If dstdir does not exist, it is created.
     * Throws exception in case of error.
     * @param srcdir  Source directory, must exist
     * @param dstdir  Destination directory, may not exist
     * @static
     */
    cp_r: function(/** String */srcdir, /** String */dstdir) {
	if (!IO.File.exists(srcdir) || !IO.File.isDir(srcdir)) {
	    throw "Invalid source directory " + srcdir;
	}
	if (IO.File.exists(dstdir)) {
	    if (!IO.File.isDir(dstdir)) {
		throw "Invalid destination directory " + dstdir;
	    }
	} else {
	    IO.File.mkdir_p(dstdir);
	}
	IO.File.listDir(srcdir).forEach(function(srcfn) {
					   var srcfp = srcdir+'/'+srcfn;
					   var dstfp = dstdir+'/'+srcfn;
					   if (srcfn=='.'||srcfn=='..') {
					       return;
					   }
					   if (IO.File.isDir(srcfp)) {
					       IO.FileUtils.cp_r(srcfp, dstfp);
					       return;
					   }
					   IO.File.cp(srcfp, dstfp);
				       });
    },


    /**
     * Parse a path spec such as 'c:/hfhfh;/hdhdhd;/jdjdjd' and return an array of individual
     * path elements. Can handle both windows and unix style of paths.
     * @param path Path
     * @returns {String[]} an array of individual path entries
     * @static
     */
    parsePath: function(/** String */path) {
	var paths = [];
	var curr = "";
	for (var pos = 0; pos < path.length; pos++) {
	    var c = path.charAt(pos);
	    if (c == ',' || c == ';' || (c == ':' && curr.length>1)) {
		if (curr.length==0) {
		    continue;
		}
		paths.push(curr);
		curr = "";
	    } else {
		curr += c;
	    }
	}
	if (curr.length>0) {
	    paths.push(curr);
	}
	return paths;
    },


    /**
     * Remove files recursively.
     * @param filepath   file/directory to remove
     * @static
     */
    rm_r: function(/** String */filepath) {
	if (!IO.File.exists(filepath)) {
	    throw "Inexisting file " + filepath;
	}
	if (!IO.File.isDir(filepath)) {
	    IO.File.rm(filepath);
	    return;
	}
	var fns = IO.File.listDir(filepath);
	for (var i = 0; i < fns.length; i++) {
	    var fn = fns[i];
	    if (fn=='.'||fn=='..') {
		return;
	    }
	    var fp = filepath + '/' + fn;
	    IO.FileUtils.rm_r(fp);
	}
	IO.File.rmdir(filepath);
    },


   /**
    * Find all files in dir and its subdirectories matching given regex. Trailing '*' in dir
    * denote the depth of directories to search for. A single '*' star leads to a search in the
    * whole directory tree, otherwies the number of stars specifies the number of directories
    * to descend. No '*' just leads to a lookup in the specified path. '*s' take precedence
    * over a specified parameter 'depth'.
    * @param dir     Directory to start with
    * @param regexp  Regex
    * @param depth   Optional, maximum depth, >= 1, 1 just searches in given directory
    * @returns {String[]} an array of matching filenames
    * @static
    */
   find: function(/** String */dir, /** RegEx */regexp, /** Number */depth) {
      dir = dir.replace(/[\\\/]\*+$/, function (match, p1, p2, offset, str) {
			    depth = match.length==2 ? 1000 : match.length-1;
			    return "";
			 });
      if( depth==null )
	  depth = 1;

      var ret = [];
      if (!IO.File.exists(dir) && !IO.File.isDir(dir)) {
	 throw sprintf("Invalid directory parameter: '%s'", dir);
      }
      var forEachFunc = function(filename) {
	 if (filename=='.'||filename=='..') {
	    return;
	 }
	 var filepath = dir + '/' + filename;
	 if (!regexp || regexp.test(filename)) {
	    ret.push(filepath);
	 }
	 if (IO.File.isDir(filepath) && depth>1) {
	    ret = ret.concat(IO.FileUtils.find(filepath, regexp, depth-1));
	 }
      };
      IO.File.listDir(dir).forEach(forEachFunc);
      return ret;
   },

   
   /**
    * Search directories recursively and return list of these directories.
    * @param dir     Directory to start with
    * @param depth   Maximum depth, >= 1, 1 just search given directory
    * @returns {String[]} an array of directory names
    * @static
    */
   listDirs: function(/** String */dir, /** Number */depth) {
      var ret = [];
      depth -= 1;
      if (depth < 0) {
	 return ret;
      }
      if (!IO.File.exists(dir) & !IO.File.isDir(dir)) {
	 throw sprintf("Invalid directory parameter: '%s'", dir);
      }
      var forEachFunc = function(filename) {
	 if (filename=='.'||filename=='..') {
	    return;
	 }
	 var filepath = dir + '/' + filename;
	  try {
	      if (IO.File.isDir(filepath)) {
		  ret.push(filepath);
		  ret = ret.concat(IO.FileUtils.listDirs(filepath, depth));
              }
	  } catch (x) {}
      };
      IO.File.listDir(dir).forEach(forEachFunc);
      return ret;
   },

   
    /**
     * Return filename suffix excluding the dot.
     * @param path
     * @returns {String} filename suffix or null
     * @static
     */
    getSuffix: function(/** String */path) {
	var matches = /.+\.([^\.]+)$/.exec(path);
	return matches ? matches[1] : null;
    }
};






//==================================================================================================
//
// IO.FAIO
//
//==================================================================================================


assert(IO.FAIO);
assert(IO.FAIO.open);
assert(IO.FAIO.close);


/**
 * @param fp
 * @param cnt
 * @param callback
 * @returns {String}
 * @throws {Exception}
 * @private
 */
IO.FAIO.read = function(/** Object */fp, /** Number */cnt, /** DFLT_ASYNC_CB */callback) {
    if (BC.is(callback)) { return BC.exec(arguments.callee, this, arguments); }
    var cmdId = this.getCmd(fp, 0, callback);
    IO.FAIO._read(cmdId, fp, cnt);
};



/**
 * @param fp
 * @param callback
 * @returns {String}
 * @throws {Exception}
 * @private
 */
IO.FAIO.readFully = function(/** Object */fp, /** DFLT_ASYNC_CB */callback) {
    if (BC.is(callback)) { return BC.exec(arguments.callee, this, arguments); }
    var blocks = [];
    var f = function(result) {
	if (result.code !== 0) {
	    callback(result);
	    return;
	}
	var block = result.getData();
	if (block.length===0) {
	    callback(new AOP.OK(blocks.join("")));
	    return;
	}
	blocks.push(block);
	IO.FAIO.read(fp, 4096, f);
    };
    IO.FAIO.read(fp, 4096, f);
};


/**
 * @param fp
 * @param data
 * @param callback
 * @returns {String}
 * @throws {Exception}
 * @private
 */
IO.FAIO.write = function(/** Object */fp, /** String */data, /** DFLT_ASYNC_CB */callback) {
    if (BC.is(callback)) { return BC.exec(arguments.callee, this, arguments); }
    var cmdId = this.getCmd(fp, 1, callback);
    IO.FAIO._write(cmdId, fp, data);
};


/**
 * @param fp
 * @param callback
 * @returns {String}
 * @throws {Exception}
 * @private
 */
IO.FAIO.flush = function(/** Object */fp, /** DFLT_ASYNC_CB */callback) {
    if (BC.is(callback)) { return BC.exec(arguments.callee, this, arguments); }
    var cmdId = this.getCmd(fp, 2, callback);
    IO.FAIO._flush(cmdId, fp);
};


/**
 * @param fp
 * @param op
 * @param callback
 * @returns {Number} command id
 * @private
 */
IO.FAIO.getCmd = function(/** Object */fp, /** Number */op, /** DFLT_ASYNC_CB */callback) {
    var cmdId = this.cmdId;
    this.cmdId += 1;
    this.cmdMap[cmdId] = {
	fp: fp,
	op: op,
	callback: callback
    };
    return cmdId;
};


/**
 * @private
 */
IO.FAIO.install = function() {
    assert(!this.queue);
    var _this = this;
    this.queue = new Core.Queue();
    this.queue.onBlob = function(blob) {
	assert(blob.cmd);
	var cmd = _this.cmdMap[blob.cmd];
	assert(cmd);
	delete _this.cmdMap[blob.cmd];
	if (blob.error) {
	    cmd.callback(new AOP.ERR(ERR_GENERIC, blob.error));
	    return;
	}
	switch(cmd.op) {
	case 0: {
	    assert(blob.data!==undefined);
	    cmd.callback(new AOP.OK(blob.data));
	    break;
	}
	case 1:
	case 2: {
	    cmd.callback(new AOP.OK());
	    break;
	}
	default:
	    assert(false, "FAIO: invalid response command type: " + cmd.op);
	}
    };
    Core.addQ(this.queue);
    var qid = this.queue.getId();
    IO.FAIO._install(this.queue.getId());
    
    this.cmdMap = {};
    this.cmdId = 1;
};
