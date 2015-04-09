//  (C) COPYRIGHT INTERNATIONAL BUSINESS MACHINES CORPORATION 2006-2010
//                       ALL RIGHTS RESERVED
//        IBM Research Division, Zurich Research Laboratory
// --------------------------------------------------------------------



/**
 * The signature of the callback parameter for functions allowing a blocking or non-blocking execution.
 * In non-blocking mode, the callback is invoked with an instance of type {@link AOP.Result} after the
 * the operation has been finished.</br>
 * The 'code'  property of an AOP.Result instance signals the success of the operation (if 0) or otherwise an error code.  
 * On success, the instance is of the subtype AOP.OK, in case of error, of the subtype AOP.ERR. 
 * In case of an AOP.OK instance, the type of its 'data' property depends on the concrete operation.<br/>
 * <pre>
 * Saguaro.startProcess(null, function(result) {     
 *     if (result.code != 0) {                             
 *         ... // handle error
 *     }
 *     var conn = result.getData(); // of type Saguaro.Connection
 * </pre>
 * On the browser, functions expecting a DFLT_ASYNC_CB can be executed in a blocking manner.
 * If one of the special symbols SCB and BLCK are provided for a DFLT_ASYNC_CB callback 
 * parameter, the operation is executed in a blocking manner and the result of the operation
 * is returned to the caller of the operation. SCB leads to the AOP.Result instance received
 * by the caller, BLCK leads to the 'data' property received by a caller (and a thrown exception in case
 * of an error). See SCB and BLCK for details.<br/>
 * All functions are documented as being called with parameter BLCK.
 * @see BLCK
 * @see SCB
 * @see AOP.Result
 * @see AOP.OK
 * @see AOP.ERR
 * @param result The result of the operation, an instance of AOP.Result
 */
var DFLT_ASYNC_CB = function(/** AOP.Result */result) {
   assert(0);
};

/**
 * A DFLT_ASYNC_CB function callback which logs an error message using Logger.err
 * if the callback received an AOP.ERR object.
 * @param result
 */
var VOID = function(/** AOP.Result */result) {
    if (result.code !== 0) {
	Logger.err("VOID: received error result: " + result.getFullMessage());
    }
};



Errors.define("", 
	      1, "ERR_GENERIC", "Generic error",
	      2, "ERR_TIMEOUT", "Timeout",
	      3, "ERR_INVALID_DATA", "Invalid data",
	      4, "ERR_RESOURCE_GONE", "Resource unavailable",
	      5, "ERR_IO", "IO error",
	      6, "ERR_MRSHELL_ONLY", "Command must be run from web based mrshell"
	     );
assert(ERR_GENERIC===0x10001);
assert(ERR_TIMEOUT===0x10002);
assert(ERR_INVALID_DATA===0x10003);
assert(ERR_RESOURCE_GONE===0x10004);

/**
 * AOP implements the result and error objects delivered to 
 * callbacks conforming to the signature of DFLT_ASYNC_CB.
 * @namespace AOP
 * @see AOP.OK
 * @see AOP.ERR
 * @see AOP.Result
 * @see DFLT_ASYNC_CB
 */
var AOP = {};

/**
 * Base class for objects passed to callbacks conforming to the signature of DFLT_ASYNC_CB.
 * @class
 * @param code    A successful operation is signaled by a code of value zero
 * @see AOP.OK
 * @see AOP.ERR
 */
AOP.Result =  function(/** Number */code) {
    assert(arguments.length===1);
    this.code = code;
};

/** Prototype */
AOP.Result.prototype = {
   /** @ignore */
   __constr__: "AOP.Result",
    /**
     * Status code, 0 signals a successful operation.
     * @type Number
     */
    code: 0,
    /**
     * @returns {Number} the status code
     */
    getCode: function() {
	return this.code;
    },
    /**
     * @returns {Boolean} if code is zero
     */
    isOK: function() {
	return (this.code===0);
    },
    /**
     * @returns {Boolean} if code is not zero
     */
    isERR: function() {
	return (this.code!==0);
    },
    /**
     * @returns {String} A message string
     */
    getMessage: function() {
	assert(0);
    },
    /**
     * @returns {String} The string representation
     */
    toString: function() {
	assert(0);
    },
    /**
     * @returns {String} A more detailed message if available
     */
    getFullMessage: function() {
	assert(0);
    }
};


/**
 * Instances of the class AOP.OK signal a successful operation. The type of the 'data' property,
 * if specified, depends on the operation.
 * @class
 * @augments AOP.Result
 * @param {Object} data     Optional, the data associated with the operation
 */
AOP.OK = function(/** Object */data) {
    assert(arguments.length<=1);
    AOP.Result.call(this, 0);
    this.data = data;
};

/** Prototype */
AOP.OK.prototype = extend(
    AOP.Result.prototype, 
    /** @lends AOP.OK.prototype */
    {
	/** @ignore */
	__constr__: "AOP.OK",

	/**
	 * Result data, might be undefined
	 * @type Object
	 * @private
	 */
	data: undefined,

	/**
	 * @returns {Object} The data property
	 */
	getData: function() {
	    return this.data;
	},

	/**
	 * @param data
	 */
	setData: function(/** Object */data) {
	    this.data = data;
	},

	/**
	 * @returns {String} A string representation
	 */
	getMessage: function() {
	    if (this.data===undefined) {
		return "";
	    } else if (this.data===null) {
		return "null";
	    } else if (this.data instanceof Array) {
		var sa = [];
		for (var i = 0; i < this.data.length; i++) {
		    var s = this.data[i].toString();
		    if (s.length) {
			sa.push(s);
		    }
		}
                return sa.join("\n");
	    } else if (this.data.toString) {
		return this.data.toString();
            } else {
		return "";
	    }
	},

	/**
	 * @returns {String} A string representation
	 */
	toString: function() {
	    return this.getMessage();
	},
	/**
	 * @returns {String} A string representation
	 */
	getFullMessage: function() {
	    return this.getMessage();
	},




	/** @private */
	conn: function(){},

	/** @private */
	motes: function(){},

	/** @private */
	mote: function() {},
	
	/** @private */
	asmentry: function() {},

	/** @private */
	asmListing: function() {},
	
	/** @private */
	asmid: function() {},

	/** @private */
	ports: function(){}, 
	
	/** @private */
	cabins: function() {},
	
	/** @private */
	asmentries: function() {},

	/** @private */
	appeared: function() {},

	/** @private */
	replies: function() {},
	
	/** @private */
	getConn: function() { 
	    QUACK(0, "API change: replace OK.getConn with OK.getData");
	    assert(this.data instanceof Saguaro.Connection);
	    return this.data;
	},
	
	/** @private */
	getMotes: function() { 
	    QUACK(0, "API change: replace OK.getMotes with OK.getData");
	    assert(this.data instanceof Array);
	    if (this.data.length>0) {
		assert(this.data[0] instanceof Sonoran.Mote);
	    }
	    return this.data;
	},


	/** @private */
	getMote: function() { 
	    QUACK(0, "API change: replace OK.getMote with OK.getData");
	    assert(this.data instanceof Sonoran.Mote);
	    return this.data;
	},

	/** @private */
	getAsmEntry: function(){  
	    //QUACK(0, Runtime.getStackTrace().join("\n"));
	    QUACK(0, "API change: replace OK.getAsmEntry with OK.getData()");
	    assert(this.data instanceof Sonoran.AsmEntry);
	    return this.data;
	},
	
	
	/** @private */
	getAsmEntries: function(){ 
	    QUACK(0, "API change: replace OK.getAsmEntries with OK.getData().getEntries");
	    assert(this.data instanceof Sonoran.AsmListing);
	    return this.data.getEntries();
	},
	
	/** @private */
	getAsmId: function() { assert(0); },

	/** @private */
	getEvent: function() { assert(0); },
	
	/** @private */
	getAsmListing: function() { 
	    QUACK(0, "API change: replace OK.getAsmListing with OK.getData()");
	    assert(this.data instanceof Sonoran.AsmListing);
	    return this.data;
	},
	
	/** @private */
	getCabins: function(){ assert(0); },
	
	/** @private */
	getReply: function() { 
	    QUACK(0, "API change: replace OK.getReply with OK.getData.getReply");
	    assert(this.data instanceof Sonoran.Saguaro.Response);
	    return this.data.getReply();
	    
	},
	
	/** @private */
	getReplies: function() { 
	    QUACK(0, "API change: replace OK.getReplies with OK.getData.getReplies");
	    assert(this.data instanceof Sonoran.Saguaro.Response);
	    return this.data.getReplies();
	},
	
	/** @private */
	getResults: function() { 
	    QUACK(0, "API change: replace OK.getResults with OK.getData");
	    assert(this.data instanceof Array);
	    if (this.data.length>0) {
		assert(this.data[0] instanceof AOP.Result);
	    }
	    return this.data;
	}
    }
);














/**
 * AOP.ERR signals an error for an operation.
 * @class
 * @augments AOP.Result
 * @param code     Error code, must not be zero
 * @param message  The error message
 * @param origin   Optional, the error which lead to this error
 * @param data     Optional, an object associated with this errror
 * @param stack    Optional, stack trace
 */
AOP.ERR = function(/** Number */code, /** String */message, /** AOP.ERR */origin, /** Object */data, /** String */stack) {
    if (typeof(code)==='string') {
	data = origin;
	origin = message;
	message = code;
	code = ERR_GENERIC;
    }
    if (code===undefined) {
	code = ERR_GENERIC;
    }
    assert(typeof(code)==='number' && code!==0, "Error code must be defined and of type 'number'!");
    assert(typeof(message) === 'string', "Error message must be defined and of type 'string'!");
    assert(origin===undefined || (origin instanceof AOP.Result));
    AOP.Result.call(this, code);
    this.message = message;
    this.origin = origin;
    this.data = data;
    //this.stack = Runtime.getCurrentStack().toString();
    if (stack) {
	this.stack = stack;
    } else {
	Error.captureStackTrace(this, AOP.ERR);
	assert(this.stack);
    }
};

AOP.ERR.MRSHELL_ONLY = 0xFFFF1234;

/** ERR prototype */
AOP.ERR.prototype = extend(
    AOP.Result.prototype, 
    /** @lends AOP.ERR.prototype */
    {
	/** @ignore */
	__constr__: "AOP.ERR",
	/**
	 * Message. 
	 * @type String
	 */
	message: null,
	/**
	 * Original error if available.
	 * @type AOP.ERR
	 */
	origin: null,
	/**
	 * Stack trace when the error instance was generated.
	 * @type String
	 */
	stack: null,
	/**
	 * Optional data associated with this error.
	 * @type Object
	 */
	data: null,
	/**
	 * @returns {String} Error message
	 */
	getMessage: function() {
	    var txt;
	    if (this.code!==ERR_GENERIC) {
		txt = Errors.format(this.code, true) + ": ";
	    } else {
		txt = "";
	    }
	    txt += this.message;
	    var indent = 2;
	    var o = this.origin;
	    while(o) {
		txt += sprintf(":\n->%"+indent+"s%s", "", o.message);
		indent += 2;
		o = o.origin;
	    }
	    return txt;
	},
	/**
	 * @returns {String} Error message
	 */
	toString: function() {
	    return this.getMessage();
	},
	/**
	 * @returns {String} Extended message including stack
	 */
	getFullMessage: function() {
	    var msg = this.getMessage();
	    msg += "\nFull message:\n" + this.stack;
	    if (this.data) {
		msg += "\n" + this.data.toString();
	    }
	    return msg;
	},
	/**
	 * @returns {Object}
	 */
	getData: function() {
	    return this.data;
	}
    }
);




/**
 * @see AOP.ExERR
 * @private
 */
ExERR = AOP.ExERR;


/**
 * Creates an AOP.ERR instance for a thrown exception. The error object inherits its stack trace
 * from the exception instance. 
 * @param code     Status code, not 0
 * @param ex       Exception object
 * @param message  Message, optional
 * @param data     Data, optional
 * @returns {AOP.ERR} An AOP.ERR instance
 */
AOP.Ex2ERR = function(/** Number */code, /** Exception */ex, /** String */message, /** Object */data) {
    assert(code!==0);
    if (!message) {
	message = "" + ex;
    } else {
	message = message + ": " + ex;
    }
    var err = new AOP.ERR(code, message, undefined, data, ex.stack?ex.stack:undefined);
    return err;
};


/**
 * @see AOP.Ex2ERR
 * @private
 */
Ex2ERR = AOP.Ex2ERR;




/**
 * Creates an ERR instance with code ERR_TIMEOUT.
 * @param message   Message, optional, appended with ": Operation timed out!"
 * @returns {AOP.ERR} An AOP.ERR instance
 * @private
 */
AOP.Timeout2ERR = function(/** String */message) {
    assert(arguments.length<=1);
    if (message) {
	message += ": Operation timed out!";
    } else {
	message = "Operation timed out!";
    }
    return new AOP.ERR(ERR_TIMEOUT, message);
};


/**
 * @see AOP.Timeout2ERR
 * @private
 */
Timeout2ERR = AOP.Timeout2ERR;









/**
 * An instance of AOP.InvalidData can be passed to the AOP.ERR constructor to
 * signal the offset of invalid data in a buffer.
 * @class
 * @constructor  
 * @param data
 * @param pos
 */
AOP.InvalidData = function(/** String */data, /** Number */pos) {
    assert(arguments.length>=1);
    this.data = data;
    this.pos = pos||0;
};

/** Prototype */
AOP.InvalidData.prototype = {
    /** @ignore */
    __constr__: "AOP.InvalidData",
    /**
     * Unexpected/invalid data
     * @type String
     */
    data: null,
    /**
     * Position in data which led to error
     * @type Number
     */
    pos: 0,
    /**
     * @returns {String} data
     */
    getData: function() {
	return this.data;
    },
    /**
     * @returns {Number} position
     */
    getPos: function() {
	return this.pos;
    },
    /**
     * @returns {String}
     */
    toString: function() {
	return sprintf("Offending position %d in %H", this.pos, this.data);
    }
};






/**
 * Throw an exception created from an AOP.ERR instance.
 * @param err
 * @throws {Exception}
 */
AOP.throwERR = function(/** AOP.ERR */err) {
    throw AOP.mapERR2Ex(err);
};


/**
 * Maps an AOP.ERR instance to an Exception instance.
 * @param err
 * @returns {Exception}
 */
AOP.mapERR2Ex = function(/** AOP.ERR */err) {
    var errs = [];
    var _err = err;
    while(true) {
	errs.push(_err);
	if (!_err.origin) {
	    break;
	}
	_err = _err.origin;
    }
    errs.reverse();
    var ex = undefined;
    while(errs.length>0) {
	err = errs.shift();
	var msg = Errors.format(err.code, true) + ": " + err.message;
	if (err.code===ERR_TIMEOUT) {
	    ex = new Timer.Exception(err);
	} else {
	    ex = new Exception(msg, err.code, err.stack, ex, err.getData());
	}
    }
    return ex;
};



