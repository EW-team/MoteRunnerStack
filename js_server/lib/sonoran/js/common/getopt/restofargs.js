//  (C) COPYRIGHT INTERNATIONAL BUSINESS MACHINES CORPORATION 2006-2010
//                       ALL RIGHTS RESERVED
//        IBM Research Division, Zurich Research Laboratory
// --------------------------------------------------------------------

/**
 * GetOpt.RestOfArgs gathers all remaining strings on a command line.
 * @class 
 * @augments GetOpt.Simple
 * @constructor
 * @param mnemo
 * @param description
 */
GetOpt.RestOfArgs = function(/** String */mnemo, /**String */description) {
    mnemo = mnemo ? mnemo : "...";
    GetOpt.Simple.call(this, mnemo, description, null);
    this.rest = [];
};


/** Prototype */
GetOpt.RestOfArgs.prototype = extend(
    GetOpt.Simple.prototype,
   /** @lends GetOpt.RestOfArgs.prototype */
    {
       /**
        * Array of remaining args.
        * @type String[]
        */
	rest: null,

	/**
         * @returns {String} remaing args.
         */
	getRestArgs: function() {
	    return this.rest;
	},

	/**
         * Reset this spec.
         */
	reset: function() {
	    this.rest = [];
	},

	/**
         * @returns {Object} state
         */
	getState: function(/** GetOpt.Env */env) {
	    return this.rest;
	},

	/**
         * Set state.
         * @param state
         */
	setState: function(/** Object */state) {
	    this.rest = state;
	},

	/**
         * Test environment args.
         * @param env
         * @returns {Number} GetOpt.EXACT etc.
         */
	test: function(/** GetOpt.Env */env) {
	    return GetOpt.EXACT;
	},

	/**
         * Parse and save environment args.
         * @param env
         * @returns {Number} GetOpt.EXACT etc.
         */
	parse: function(/** GetOpt.Env */env) {
	    this.rest = env.argv;
	    env.argv = []; // consume all args
	    return GetOpt.EXACT;
	}
    }
);
