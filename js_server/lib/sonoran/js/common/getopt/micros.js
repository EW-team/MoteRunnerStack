//  (C) COPYRIGHT INTERNATIONAL BUSINESS MACHINES CORPORATION 2006-2010
//                       ALL RIGHTS RESERVED
//        IBM Research Division, Zurich Research Laboratory
// --------------------------------------------------------------------

/**
 * GetOpt.MicrosSpec inherits GetOpt.Simple to parse a micros string
 * @class 
 * @augments GetOpt.Simple
 * @constructor
 * @param description 
 * @param mnemo
 */
GetOpt.MicrosSpec = function(/** String */mnemo, /** String */description) {
    mnemo = mnemo||"micros";
    description = description||"hours:mins:secs.millis'micros";
    GetOpt.Simple.call(this, mnemo, description, null);
    this.micros = -1;
};

/** Prototype */
GetOpt.MicrosSpec.prototype = extend(
    GetOpt.Simple.prototype,
    /** @lends GetOpt.MicrosSpec.prototype */
    {
	/**
         * Result micros
         * @type Number
         */
	micros: -1,

	/**
         * @returns {Number} micros
         */
	getMicros: function() {
	    return this.micros;
	},

	/**
         * @returns {Object} state
         */
	getState: function(/** GetOpt.Env */env) {
	    return { arg: this.arg, micros: this.micros };
	},

	/**
         * Set state.
         * @param state
         */
	setState: function(/** Object */state) {
	    this.arg = state.arg;
	    this.micros = state.micros;
	},

	/**
         * Reset this spec.
         */
	reset: function() {
	    GetOpt.Simple.prototype.reset.call(this);
	    this.micros = -1;
	},

	/**
         * Test args in environment.
         * @param env
         * @returns {Number} GetOpt.EXACT etc.
         */
	test: function(/** GetOpt.Env */env) {
	    var m = GetOpt.Simple.prototype.test.call(this, env);
	    if (m == GetOpt.NOMATCH) {
		return m;
	    }
	    var arg = env.currArg();
            try {
                Util.str2micros(arg);
            } catch (x) {
                return GetOpt.NOMATCH;
            }
	    return GetOpt.EXACT;
	},

	/**
         * Parse environment args and set state.
         * @param env
         * @returns {Number} GetOpt.EXACT etc.
         */
	parse: function(/** GetOpt.Env */env) {
	    var ret = GetOpt.Simple.prototype.parse.call(this, env);
	    var arg = this.getArg();
            this.micros = Util.str2micros(arg);
	    return GetOpt.EXACT;
	}
    }
);

