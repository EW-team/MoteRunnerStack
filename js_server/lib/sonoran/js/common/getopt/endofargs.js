//  (C) COPYRIGHT INTERNATIONAL BUSINESS MACHINES CORPORATION 2006-2010
//                       ALL RIGHTS RESERVED
//        IBM Research Division, Zurich Research Laboratory
// --------------------------------------------------------------------

/**
 * GetOpt.EndOfArgs makes sure that all arguements on the command line  are used.
 * @class 
 * @augments GetOpt.Simple
 * @constructor
 */
GetOpt.EndOfArgs = function() {
    GetOpt.Simple.call(this, null, null, null);
};

/** Prototype */
GetOpt.EndOfArgs.prototype = extend(
    GetOpt.Simple.prototype,
   /** @lends GetOpt.EndOfArgs.prototype */
    {
	/** @private */
	checkArgs: function(/** GetOpt.Env */env) {
	    if (!env.moreArgs()) {
		return GetOpt.EXACT;
	    }
	    var argv = env.argv;
	    if (argv.length==1) {
		env.pb.insert("Excess argument found: %s\n", argv[0]);
	    } else {
		env.pb.insert("Excess arguments (%d): %.20s...\n", argv.length, argv[0]);
	    }
	    throw "OPTERROR";
	},

	/**
         * Parse and consume args in environment.
         * @param env
         * @returns {Number} GetOpt.EXACT etc.
         */
	parse: function(/** GetOpt.Env */env) {
	    return this.checkArgs(env);
	},

	/**
         * Print this spec.
         * @param env
         * @param mode
         */
	print: function(/** GetOpt.Env */env, /** GetOpt.PrintMode */mode) {
	    return 0;
	},

	/**
         * Test args in environment.
         * @param env
         * @returns {Number} GetOpt.EXACT etc.
         */
	test: function(/** GetOpt.Env */env) {
	    return GetOpt.MAYMATCH;
	}
    }
);
