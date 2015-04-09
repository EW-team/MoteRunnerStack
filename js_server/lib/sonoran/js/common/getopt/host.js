//  (C) COPYRIGHT INTERNATIONAL BUSINESS MACHINES CORPORATION 2006-2010
//                       ALL RIGHTS RESERVED
//        IBM Research Division, Zurich Research Laboratory
// --------------------------------------------------------------------

/**
 * GetOpt.HostPortSpec inherits GetOpt.Simple to parse a 'host:port' parameter.
 * @class 
 * @augments GetOpt.Simple
 * @constructor
 * @param dfltPort
 * @param dfltHost 
 * @param description 
 * @param mnemo
 */
GetOpt.HostPortSpec = function(/** Number */dfltPort, /** String */dfltHost, /** String */description, /** String */mnemo) {
    mnemo = mnemo||"host:port";
    description = description||"<hostname>:<port>, i.e. 'localhost:50505', 'localhost' or '50505'";
    GetOpt.Simple.call(this, mnemo, description, null);
    this.host = this.dfltHost = dfltHost ? dfltHost : null;
    this.port = this.dfltPort = dfltPort ? dfltPort : -1;
};

/** Prototype */
GetOpt.HostPortSpec.prototype = extend(
    GetOpt.Simple.prototype,
    /** @lends GetOpt.HostPortSpec.prototype */
    {
	/**
         * Result host
         * @type String
         */
	host: null,
	/**
         * Result port
         * @type Number
         */
	port: null,
	/**
         * Default host if set
         * @type String
         */
	dfltHost: null,
	/**
         * Default port if set
         * @type Number
         */
	dfltPort: null,

	/**
         * @returns {String} hostname
         */
	getHost: function() {
	    return this.host;
	},

	/**
         * @returns {Number} port
         */
	getPort: function() {
	    return this.port;
	},

	/**
         * @returns {Object} state
         */
	getState: function(/** GetOpt.Env */env) {
	    return { arg: this.arg, host: this.host, port: this.port };
	},

	/**
         * Set state.
         * @param state
         */
	setState: function(/** Object */state) {
	    this.arg = state.arg;
	    this.host = state.host;
	    this.port = state.port;
	},

	/**
         * Reset this spec.
         */
	reset: function() {
	    GetOpt.Simple.prototype.reset.call(this);
	    this.host = this.dfltHost;
	    this.port = this.dfltPort;
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
	    if (/^\d+$/.test(arg)) {
		return GetOpt.EXACT;
	    }
	    if (/^([\d\w_\.-]+)(:(\d+))?$/.test(arg)) {
		return GetOpt.EXACT;
	    }
	    return GetOpt.NOMATCH;
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
	 * Parse string and modify internal host and port property accordingly.
	 * @param s
	 * @returns {Number} GetOpt.EXACT etc.
	 */
	apply: function(/** String */arg) {
	    var matches = /^(\d+)$/.exec(arg);
	    if (matches) {
		this.host = this.dfltHost;
		this.port = parseInt(matches[1]);
                return GetOpt.EXACT;
	    }
	    matches = /^([\d\w_\.-]+)(:(\d+))?$/.exec(arg);
	    this.host = matches[1] ? matches[1] : this.dfltHost;
	    this.port = matches[3] ? parseInt(matches[3]) : this.dfltPort;
	    return GetOpt.EXACT;
	}
    }
);

