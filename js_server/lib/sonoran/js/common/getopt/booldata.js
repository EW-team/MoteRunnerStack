//  (C) COPYRIGHT INTERNATIONAL BUSINESS MACHINES CORPORATION 2006-2010
//                       ALL RIGHTS RESERVED
//        IBM Research Division, Zurich Research Laboratory
// --------------------------------------------------------------------

/**
 * GetOpt.BoolData identifies various versions of true and false.
 * @class 
 * @augments GetOpt.Simple
 * @constructor
 * @param mnemo
 * @param description
 * @param allValues
 */
GetOpt.BoolData = function(/** String */mnemo, /** String */description,/** bool */allValues) {
    GetOpt.Simple.call(this, mnemo, description);
    this.bool = false;
    this.allValues = allValues==true?true:false;
};

/** Prototype */
GetOpt.BoolData.prototype = extend(
   GetOpt.Simple.prototype,
   /** @lends GetOpt.BoolData.prototype */
    {
       /**
        * Value of this option.
	* @private
        */
	bool: false,
       /**
        * Accept any parameter?
	* @private
        */
       allValues: false,

	/**
         * Reset this spec.
         */
	reset: function() {
	    GetOpt.Simple.prototype.reset.call(this);
	    this.bool = false;
	},

	/**
         * @returns {Object} state
         */
       getState: function() {
	   return {bool:this.bool, arg:this.arg};
       },

	/**
         * Set state.
         * @param state
         */
	setState: function(/** Object */state) {
	    this.arg = state.arg;
	    this.bool = state.bool;
	},

	/**
         * @returns {Boolean} the evaluated parameter of this spec.
         */
	getBool: function() {
	    return this.bool;
	},

	/**
         * Test next argument in environment.
         * @param env
         * @returns {Number} GetOpt.EXACT etc.
         */
	test: function(/** GetOpt.Env */env) {
	    if( !env.moreArgs() )
		return GetOpt.NOMATCH;
	    var b = GetOpt.BoolData.parseBoolData(env.argv[0]);
	    return b!==undefined ? GetOpt.EXACT : allValue ? GetOpt.ABBREV : GetOpt.NOMATCH;
	},

	/**
         * Saves the parameter and consumes it in the environment.
         * @param env
         * @returns {Number} GetOpt.EXACT etc.
         */
	parse: function(/** Env */env) {
	    GetOpt.Simple.prototype.parse.call(this,env);
	    var s = this.getArg();
	    var bool = GetOpt.BoolData.parseBoolData(s);
	    if( bool===undefined ) {
		if( !this.allValues ) {
		    env.pb.insert("%s: Illegal boolean value: %s", this.getMnemo(), this.getArg());
		    throw "OPTERROR";
		}
		bool = false;
	    }
	    this.bool = bool;
	    return GetOpt.EXACT;
	},

	/**
         * @returns {String} a debug string
         */
	toString: function() {
	    return "BoolData: " + this.mnemo + ", " + this.description;
	}
    }
);

/**
 * Parse a string against possible true/false values.
 * @param str
 */
GetOpt.BoolData.parseBoolData = function (/** String */str) {
    if( str!=null && str.match(/^(enable|true|on|yes|1)$/i) ) {
	return true;
    }
    if( str!=null && str.match(/^(disable|false|off|no|0)$/i) ) {
	return false;
    }
    return undefined;
};


