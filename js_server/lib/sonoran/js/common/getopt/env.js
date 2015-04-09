//  (C) COPYRIGHT INTERNATIONAL BUSINESS MACHINES CORPORATION 2006-2010
//                       ALL RIGHTS RESERVED
//        IBM Research Division, Zurich Research Laboratory
// --------------------------------------------------------------------

/**
 * Environment object for GetOpt parsing.
 * @class 
 * @constructor
 * @param argv
 */
GetOpt.Env = function(/** String[] */argv) {
    this.argv = argv;
    this.pb = new GetOpt.PrintBuffer();
    this.detailsDescIndent = 4;
};


/** Prototype */
GetOpt.Env.prototype = {
    /**
     * More args available in this environment?
     * @returns {Boolean} whether more arguments are available
     */
    moreArgs: function() {
	return this.argv.length>0;
    },

    /**
     * Consumes an argument.
     * @returns {String} null or argument
     */
    consumeArg: function() {
	if (this.argv.length == 0) {
	    return null;
	}
	var arg = this.argv.splice(0, 1)[0];
	//QUACK(0, "consume " + arg);
	return arg;
    },

   
   /**
    * Check if no more consumable arguments.
    * A sequence of arguments can be explicitly terminated by an '--' argment
    * or by the end of all arguments.
    * @param consume  false: check only, true: consume the '--' arguments id present
    * @returns {Boolean} false: no more consumable arguments, true: there are more arguments.
    */
    moreConsumableArgs: function(/** Boolean */consume) {
	if (this.argv.length == 0) { return null; }
	var arg = this.argv[0];
	if (arg.charAt(0) == '-' && arg.charAt(1) == '-' && arg.length == 2) {
	    if (consume) {
		this.consumeArg();
		return false;
	    }
	}
	return true;
    },

    /**
     * @returns {String} the first element in the available argv vector or null.
     */
    currArg: function() {
	if (this.argv.length == 0) {
	    return null;
	}
	return this.argv[0];
    },

    /**
     * Eat given number of characters in current argument. If none
     * are left over, the element is fully removed from the vector.
     */
    consumeChars: function(/** Number */cnt) {
	this.argv[0] = this.argv[0].substring(cnt); //, -1);
	if (this.argv[0].length==0) {
	    this.argv.splice(0, 1);
	}
    },

    /**
     * Replace cnt characters in the first argument by the repl string.
     * @param cnt
     * @param repl
     */
    replaceChars: function(/** Number */cnt, /** String */repl) {
	this.argv[0] = repl + this.argv[0].substring(cnt);
	assert(this.argv[0].length>=2);
    }
};
