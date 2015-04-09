//  (C) COPYRIGHT INTERNATIONAL BUSINESS MACHINES CORPORATION 2006-2010
//                       ALL RIGHTS RESERVED
//        IBM Research Division, Zurich Research Laboratory
// --------------------------------------------------------------------

/**
 * GetOpt.Date.
 * @class 
 * @augments GetOpt.Simple
 * @constructor
 * @param dfltDate
 * @param description 
 * @param mnemo
 */
GetOpt.DateSpec = function(/** String */dfltDate, /** String */description, /** String */mnemo) {
    mnemo = mnemo||"date";
    description = description||"'date string', see new Date('date string')";
    GetOpt.Simple.call(this, mnemo, description, null);
    this.date = this.dfltDate = dfltDate;
};

/** Prototype */
GetOpt.DateSpec.prototype = extend(
    GetOpt.Simple.prototype,
    /** @lends GetOpt.HostPortSpec.prototype */
    {
	/**
         * @type String
         */
	date: null,
	/**
         * Default date if set
         * @type String
         */
	dfltDate: null,

	/**
         * @returns {Date}
         */
	getDate: function() {
	    return new Date(this.date);
	},

	/**
         * @returns {Object} state
         */
	getState: function(/** GetOpt.Env */env) {
	    return { arg: this.arg, date: this.date };
	},

	/**
         * Set state.
         * @param state
         */
	setState: function(/** Object */state) {
	    this.arg = state.arg;
	    this.date = state.date;
	},

	/**
         * Reset this spec.
         */
	reset: function() {
	    GetOpt.Simple.prototype.reset.call(this);
	    this.date = this.dfltDate;
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
		var d = new Date(arg);
		return GetOpt.EXACT;
	    } catch(ex) {
		return GetOpt.NOMATCH;
	    }
	},

	/**
         * Parse environment args and set state.
         * @param env
         * @returns {Number} GetOpt.EXACT etc.
         */
	parse: function(/** GetOpt.Env */env) {
	    var ret = GetOpt.Simple.prototype.parse.call(this, env);
	    var arg = this.getArg();
	    return this.apply(arg);
	},


	/**
	 * Parse string.
	 * @param s
	 * @returns {Number} GetOpt.EXACT etc.
	 */
	apply: function(/** String */arg) {
	    try {
		this.date = arg;
		var d = new Date(arg);
		return GetOpt.EXACT;
	    } catch(ex) {
		assert(false);
	    }
	}
    }
);

