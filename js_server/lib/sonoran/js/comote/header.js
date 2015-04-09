//  (C) COPYRIGHT INTERNATIONAL BUSINESS MACHINES CORPORATION 2006-2010
//                       ALL RIGHTS RESERVED
//        IBM Research Division, Zurich Research Laboratory
// --------------------------------------------------------------------



//
// Not included on server side
// 


/**
 * Emulate STDIN, not yet supported.
 * @type Object
 */
STDIN = null;


/**
 * Emulate STDOUT, not yet supported.
 * @type Object
 */
STDOUT = null;


/**
 * @type Object
 * @private
 */
PROG_PARAMS = {
    verbose: false
};


/**
 * @type Number
 * @constant
 * @private
 * @nodoc
 */
QUACK_LEVEL = 0;



/**
 * @private
 * @nodoc
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
    var txt = tag + ": " + message.toString();
    Comote.trace(txt, Logger.EMERG);
}




/**
 * Assert function. 
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
         if (ex.stack) {
            QUACK(0, ex.stack);
         }
      }
   }
}


/**
 * @class
 * @static
 */
Runtime = {
    /**
     * @param ex
     * @param msg
     * @returns {String}
     */
   dumpException: function(/** Exception */ex, /** String */msg) {
      var s = (msg ? msg + ": " : "") + ex.toString();
      if (ex.stack) {
         s += "\n" + ex.stack;
      }
      return s;
   },

    /**
     * @returns {Boolean} false
     */
    runOnServer: function() {
	return false;
    },

    blockAccess: function() {
    }
};



/**
 * @class
 * @static
 */
Clock = {
    /**
     * @returns {Number} milliseconds
     */
    get: function() {
	return (new Date()).getTime();
    }
};


/**
 * @namespace IO
 */
IO = {
    /**
     * @class
     * @static
     */
    Inet: {
	/**
	 * @returns {String} 'localhost'
	 */
	gethostname: function() { return "localhost"; }
    }
};


/**
 * @private
 */
BC = {
    /**
     * @returns {Boolea} false
     * @private
     */
    is: function() { return false; }
};





