//  (C) COPYRIGHT INTERNATIONAL BUSINESS MACHINES CORPORATION 2006-2010
//                       ALL RIGHTS RESERVED
//        IBM Research Division, Zurich Research Laboratory
// --------------------------------------------------------------------

/**
 * GetOpt.Identifier inherits GetOpt.Simple to match against a certain regex
 * @class 
 * @augments GetOpt.Simple
 * @constructor
 * @param regex  
 * @param mnemo
 * @param description
 */
GetOpt.Identifier = function(/** RegExp */regex, /** String */mnemo, /** String */description) {
    mnemo = mnemo||"identifier";
    description = description||"identifier matching " + regex;
    GetOpt.Simple.call(this, mnemo, description, null);
    this.regex = regex;
    this.identifier = null;
};

/** @private */
GetOpt.Identifier.prototype = extend(
    GetOpt.Simple.prototype,
    /** @lends GetOpt.Identifier.prototype */
    {
	/**
         * @type RegExp
         */
	regex: null,
	/**
         * Result identifier
         * @type String
         */
	identifier: null,

	/**
         * @returns {String} identifier
         */
	getIdentifier: function() {
	    return this.identifier;
	},

	/**
         * @returns {Object} state
         */
	getState: function(/** GetOpt.Env */env) {
	    return { arg: this.arg, identifier: this.identifier };
	},

	/**
         * Set state.
         * @param state
         */
	setState: function(/** Object */state) {
	    this.arg = state.arg;
	    this.identifier = state.identifier;
	},

	/**
         * Reset this spec.
         */
	reset: function() {
	    GetOpt.Simple.prototype.reset.call(this);
	    this.identifier = null;
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
	    return (regex.test(arg)) ? GetOpt.EXACT : GetOpt.NOMATCH;
	},

	/**
         * Parse environment args and set state.
         * @param env
         * @returns {Number} GetOpt.EXACT etc.
         */
	parse: function(/** GetOpt.Env */env) {
	    var ret = GetOpt.Simple.prototype.parse.call(this, env);
	    var arg = this.getArg();
	    if (!this.regex.test(arg)) {
		env.pb.insert("Invalid ");
		this.print(env, GetOpt.PrintMode.MNEMO);
		throw "OPTERROR";
	    }
	    this.identifier = arg;
	    return GetOpt.EXACT;
	}
    }
);
	
	







/**
 * GetOpt.EuiSpec inherits GetOpt.Simple to parse an EUI.
 * @class 
 * @augments GetOpt.Simple
 * @constructor
 * @param description 
 * @param mnemo
 */
GetOpt.EuiSpec = function(dflt, description, mnemo) {
    mnemo = mnemo || "eui";
    description = description||"EUI";
    GetOpt.Simple.call(this, mnemo, description, null);
};

/** Prototype */
GetOpt.EuiSpec.prototype = extend(
   GetOpt.Simple.prototype,
   /** @lends GetOpt.EuiSpec.prototype */
   {
      /**
       * Result.
       * @type Number
       */
      eui: null,
	
      /**
       * @returns {String}
       */
      getEui: function() {
	 return this.eui;
      },

      /**
       * @returns {Object} state
       */
      getState: function(/** GetOpt.Env */env) {
	 return { arg: this.arg, eui: this.eui };
      },

      /**
       * Set state.
       * @param state
       */
      setState: function(/** Object */state) {
	 this.arg = state.arg;
	 this.eui = state.eui;
      },

      /**
       * Reset this spec.
       */
      reset: function() {
	 GetOpt.Simple.prototype.reset.call(this);
	 this.eui = this.eui;
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
	   try {
	       var arg = env.currArg();
	       Util.UUID.completeEUI(arg);
	   }catch(ex) {
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
	  var eui = Util.UUID.completeEUI(arg);
	  this.eui = eui;
	  return GetOpt.EXACT;
      }
   }
);



