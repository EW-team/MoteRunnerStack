//  (C) COPYRIGHT INTERNATIONAL BUSINESS MACHINES CORPORATION 2006-2010
//                       ALL RIGHTS RESERVED
//        IBM Research Division, Zurich Research Laboratory
// --------------------------------------------------------------------

// ----------------------------------------------------------------------------------------------
//
// GetOpt
// 
// ----------------------------------------------------------------------------------------------

/**
 * Implements the GetOpt package.
 * @namespace GetOpt
 */
GetOpt = {
    /**
     * No match.
     * @constant
     * @type Number
     */
    NOMATCH:     0,
    /**
     * Abbreviation.
     * @constant
     * @type Number
     */
    ABBREV:      1,
    /**
     * Exact match.
     * @constant
     * @type Number
     */
    EXACT:       2,
    /**
     * May match.
     * @constant
     * @type Number
     */
    MAYMATCH:    3,

    /**
     * Operation mode for {@link GetOpt.abbrevMatch}.
     *  An equal character is considered the end of the argument string.
     *  This can be used to match option argument against their names while
     *  some parameter is attached (e.g. option name --abc-def would match
     *  --a-d=value).
     * @constant
     * @type Number
     */
    CHECK_EQUAL: 0x01,
    /**
     * Operation mode for {@link GetOpt.abbrevMatch}.
     *  Ignore character case during comparision.
     * @constant
     * @type Number
     */
    IGNORE_CASE: 0x02,
    /**
     * Operation mode for {@link GetOpt.abbrevMatch}.
     *  Reject any abbreviations as not matching.
     * @constant
     * @type Number
     */
    EXACT_ONLY:  0x04,

    /**
     * Match arg against def and returns the status of the match.
     * The definition and argument string are split up into syllables according to separating chars.
     * Each syllable can be abbreviated separately. E.g. the definition abc-def-ghi is match by the
     * following arguments: a, ab, ab-d, a-d-g, a--g.
     * @param mode      Operation modes: {@link GetOpt.IGNORE_CASE}, {@link GetOpt.CHECK_EQUAL}, {@link GetOpt.EXACT_ONLY}.
     * @param sepChars  A string defining which characters act as separators.
     * @param def       The definition string.
     * @param arg       The possibly abbreviated argument string.
     * @returns {{match:int,matchlen:int}} Return the status of the match as member 'match'.
     *     The following values are returned: {@link NOMATCH}, {@link ABBREV}, {@link EXACT}.
     *     The member 'matchlen' holds the length of the matched characters in arg.
     */
    abbrevMatch: function (/** Number */mode, /** String */sepChars, /** String */def, /** String*/arg) {
	var defi = 0;
	var argi = 0;
	var ckeq = ((mode & GetOpt.CHECK_EQUAL) != 0);
	var mtch = GetOpt.NOMATCH;
	block: {
	    while(1) {
		var oc = def.charAt(defi);
		var ac = arg.charAt(argi);
		if( ac=='' || (ckeq && ac=='=') )
		    break;
		if( sepChars.indexOf(ac) >= 0 ) {
		    while( oc!=ac ) {
			if( oc=='' )
			    break block;
			oc = def.charAt(++defi);
			if( ckeq && oc=='=' )
			    oc = '';
		    }
		} else if( ac!=oc &&
			   (mode&GetOpt.IGNORE_CASE) == 0 ||
			   ac.toLowerCase()!=oc.toLowerCase() ) {
		    break block;
		}
		argi++;
		defi++;
	    } // while
	    mtch = (oc=='' && argi==defi)
		? GetOpt.EXACT
		: (mode&GetOpt.EXACT_ONLY)==0
		? GetOpt.ABBREV
		: GetOpt.NOMATCH;
	} // block
	return { match:mtch, matchlen:argi };
    }
};


// ----------------------------------------------------------------------------------------------
// GetOpt.PrintMode
// ----------------------------------------------------------------------------------------------

/**
 * Lists constants.
 * @class
 */
GetOpt.PrintMode = {
    /**
     * Print MNEMO only - a short description of current argument specification.
     * @constant
     * @type Number
     */
    MNEMO:   0,
    /**
     * Print short usage of current argument specification.
     * @constant
     * @type Number
     */
    SHORT:   1,
    /**
     * Print details on all elements of current argument specification.
     * @constant
     * @type Number
     */
    DETAILS: 2, 
    /**
     * Print some info. Not used in GetOpt package but elsewhere.
     * @constant
     * @type Number
     */
    INFO:    3  
};






// ----------------------------------------------------------------------------------------------
//
// GetOpt.Spec
// 
// ----------------------------------------------------------------------------------------------

/**
 * GetOpt.Spec implements the base class for specification of command line arguments.
 * @class 
 * @constructor
 * @param mnemo       optional
 * @param description optional
 * @param children     optional
 */
GetOpt.Spec = function(/** String */mnemo, /**String */description, /** Array of Spec */children) {
    this.mnemo = mnemo ? mnemo : null;
    this.description = description ? description : null;
    this.children = children ? children : null;
};

/**
 * Prototype.
 */
GetOpt.Spec.prototype = {
    /**
     * Mnemo
     * @type String
     */
    mnemo: null,

    /**
     * Description
     * @type String
     */
    description: null,

    /**
     * Children
     * @type Object[]
     */
    children: null,

    /**
     * Reset this Spec.
     */
    reset: function() {
       if (this.children) {
	  for (var i = 0; i < this.children.length; i++) {
             if (this.children[i] == null) {
                break;
             }
	     this.children[i].reset();
	  }
       }
    },

    /**
     * @returns {String} mnemo
     */
    getMnemo: function() { return this.mnemo; },

    /**
     * @returns {String} description
     */
    getDescription: function() { return this.description; },

    /**
     * A Spec must parse its parameters here and return EXACT_MATCH etc.
     * @param env
     * @returns {Number} GetOpt.EXACT etc.
     */
    parse: function(/** GetOpt.Env */env) { assert(0, "missing implementation"); },

    /**
     * @returns {Object} state of this Spec.
     */
    getState: function(/** GetOpt.Env */env) { assert(0, "missing implementation"); },

    /**
     * Set state of this Spec.
     * @param state
     */
    setState: function(/** Object */state) { assert(0, "missing implementation"); },

    /**
     * A Spec tests current args in environment for applying and returns EXACT_MATCH etc.
     * @param env
     * @returns {Number} GetOpt.EXACT etc.
     */
    test: function(/** GetOpt.Env */env) { assert(0, "missing implementation"); },

    /**
     * Print this Spec and its expected parameters etc.
     */
    print: function(/** GetOpt.Env */env, /** Number */printMode) { assert(0, "missing implementation"); }
};







// ----------------------------------------------------------------------------------------------
//
// GetOpt.Simple
// 
// ----------------------------------------------------------------------------------------------

/**
 * GetOpt.Simple expects a simple String parameter
 * @class 
 * @augments GetOpt.Spec
 * @constructor
 * @param mnemo
 * @param description
 */
GetOpt.Simple = function(/** String */mnemo, /**String */description) {
    GetOpt.Spec.call(this, mnemo, description, null);
    this.arg = null;
};

/** Prototype */
GetOpt.Simple.prototype = extend(
    GetOpt.Spec.prototype,
   /** @lends GetOpt.Simple.prototype */
    {
	/**
         * Result
         * @type String
         */
	arg: null,

	/**
         * Reset this spec.
         */
	reset: function() {
	    GetOpt.Spec.prototype.reset.call(this);
	    this.arg = null;
	},

	/**
         * @returns {Object} the state.
         */
	getState: function() {
	    return this.arg;
	},

	/**
         * Set state.
         * @param state
         */
	setState: function(/** Object */state) {
	    this.arg = state;
	},

	/**
         * A GetOpt.Simple spec expects a String
         * @returns {Number} GetOpt.EXACT etc.
         */
	test: function(/** GetOpt.Env */env) {
	    return (env.moreArgs()) ? GetOpt.EXACT : GetOpt.NOMATCH;
	},

	/**
         * Returns the parameter of this spec.
         * @returns {String} the user specified parameter
         */
	getArg: function() {
	    return this.arg;
	},

	/**
         * Saves the parameter and consumes it in the environment.
         * @param env
         * @returns {Number} GetOpt.EXACT etc.
         */
	parse: function(/** GetOpt.Env */env) {
	    if (!env.moreArgs()) {
		env.pb.insert("Mandatory argument '");
		this.print(env, GetOpt.PrintMode.MNEMO);
		env.pb.insert("' is missing.");
		throw "OPTERROR";
	    }
	    this.arg = env.consumeArg();
	    assert(this.arg != null);
	    return GetOpt.EXACT;
	},

	/**
         * Print this spec.
         */
	print: function(/** GetOpt.Env */env, /** GetOpt.Number */mode) {
	    var pb = env.pb;
	    var m = this.getMnemo();
	    if (mode == GetOpt.PrintMode.MNEMO) {
		pb.insert((m==null)?"arg":m);
		return 0;
	    }
	    if (mode == GetOpt.PrintMode.SHORT) {
		pb.insertSoftSpace();
		this.print(env, GetOpt.PrintMode.MNEMO);
		return 0;
	    }
	    if (mode == GetOpt.PrintMode.DETAILS) {
		var d = this.getDescription();
		if (d != null) {
		    this.print(env, GetOpt.PrintMode.MNEMO);
		    pb.insert('\n');
		    var ind = pb.addIndent(env.detailsDescIndent);
		    pb.insert(d);
		    pb.assertEmptyLine();
		    pb.setIndent(ind);
		    return 0;
		}
	    }
	    return 0;
	},

	/**
         * @returns {String} a debug string
         */
	toString: function() {
	    return "Simple: " + this.mnemo + ", " + this.description;
	}
    }
);







// ----------------------------------------------------------------------------------------------
//
// GetOpt.Option
// 
// ----------------------------------------------------------------------------------------------



/**
 * A Option spec implements an option which is typically part of an OptionSet, can be set by
 * a short flag (-c) or long keyword (--cecile-leceil) and expects a certain parameter spec.
 * @class 
 * @augments GetOpt.Spec
 * @constructor
 * @param shortOpt    character such 'c' or null
 * @param longOpt     string or null
 * @param mode        SINGLE, PREFEQ, AUTO_MNEMO or null
 * @param mnemo       optional
 * @param description optional
 */
GetOpt.Option = function(/** Char */shortOpt, /** String */longOpt, /** Number */mode, /** String */mnemo, /**String */description, /** Spec */param) {
   GetOpt.Spec.call(this, mnemo, description);
    this.mode          = mode ? mode : 0;
    this.shortOpt      = (shortOpt==null || shortOpt.length==0) ? null : "-"+shortOpt.charAt(0);
    this.longOpt       = longOpt;
    this.param         = param ?  param : null;
    this.curr          = null;
    this.opts = null;

    if (shortOpt==null && longOpt!=null && longOpt.charAt(0)!='-' ) {
	this.mode |= GetOpt.Option.PREFEQ;
    }

    if (this.mnemo==null ) {
        var pb = new GetOpt.PrintBuffer();
	if (shortOpt!=null) {
	    pb.insert('-'+shortOpt);
            if (longOpt != null) {
		pb.insert('|');
	    }
        }
	if (longOpt != null) {
            pb.insert(longOpt);
        }
	this.mnemo = pb.toString();
	this.mode |= GetOpt.Option.AUTO_MNEMO;
       assert(this.mnemo);
    }
    this.rst();
};

/** Prototype */
GetOpt.Option.prototype = extend(
    GetOpt.Spec.prototype,
   /** @lends GetOpt.Option.prototype */
    {
       /**
        * Mode
        * @type Number
        */
	mode: null,
       /**
        * Mnemo
        * @type String
        */
       mnemo: null,
       /**
        * Short option
        * @type String
        */
       shortOpt: null,
       /**
        * Long option
        * @type String
        */
       longOpt: null,
       /** 
	* @private 
	*/
       param: null,
       /** 
	* @private 
	*/
       curr: null,
       /** 
	* @private 
	*/
       opts: null,

	/** 
	 * @private 
	 */
	rst: function() {
	    this.opts = [];
	    this.curr = null;
	},

	/**
	 * @returns {String} the short opt
	 */
       getShortOpt: function() {
          return this.shortOpt;
       },

	/**
	 * @returns {String} the long opt
	 */
       getLongOpt: function() {
          return this.longOpt;
       },

	/**
	 * @returns {String} the name
	 */
       getOptName: function() {
	   return this.shortOpt || this.longOpt;
       },
       

	/**
	 * @returns {Object}  object with code: EXACT|NOMATCH, arg: <what is matching on line>
	 * @private
	 */
	testOrParse: function(/** GetOpt.Env */env, /** GetOpt.PrintBuffer */pb, /** Boolean */testIt) {
	    var arg = env.currArg();
	    //QUACK(0, "Option.testOrParse " + testIt + ", " + this.shortOpt + ", " + this.longOpt + ", " + arg);
	    
	    if (!arg) {
		//QUACK(0, "no arg");
		return { code: GetOpt.NOMATCH, arg: null };
	    }
	    
	    if( this.shortOpt!=null ) {
		if (arg.charAt(0) == '-' && arg.charAt(1) == this.shortOpt.charAt(1)) {
		    if (testIt) {
			return { code: GetOpt.EXACT };
		    }
		    if (arg.length==2) {
			env.consumeArg();
			return { code: GetOpt.EXACT, arg: arg };
		    } else {
			if (this.param != null) {
			    env.consumeChars(2);
			} else {
			    env.replaceChars(2, "-");
			}
		    }
		    return { code: GetOpt.EXACT, arg: this.shortOpt };
		}
	    }
	    
	    if (this.longOpt!=null) {
		var ret = GetOpt.abbrevMatch(GetOpt.CHECK_EQUAL|this.mode,"-",this.longOpt,arg);
		var match = ret.match;
		var matchlen = ret.matchlen;
		if (match!=GetOpt.NOMATCH) {
		    if (matchlen == arg.length) {
			if (testIt) {
			    return { code: match };
			}
			// Option uses arg of its own - move to next
			if (this.longOpt.charAt(0) != '-') {
			    // If long option does not start with - then parameters
			    // *must* be specified in the form: opt=value
			    pb.insert("Option requires a parameter: "+this.longOpt+"=...");
			    throw "OPTERROR";
			}
			env.consumeArg();
			return { code: match, arg: arg };
		    }
		    //QUACK(0, "CHECK: " + arg.charAt(matchlen));
		    if (arg.charAt(matchlen) == '=') {
			
			if (testIt) {
			    return { code: match };
			}
			if (this.param==null) {
			    pb.insert("Option `"+this.longOpt+"' does not take a parameter: "+arg);
			    throw "OPTERROR";
			}
			env.consumeChars(matchlen+1);
			return { code: match, arg: arg.substr(0, matchlen) };
		    }
		}
	    }
	    //QUACK(0, "Option.testOrParse: no match");
	    return { code: GetOpt.NOMATCH, arg: null};
	},


	/** 
	 * Test match
         * @param env
         * @returns {Object}  object with 'code': EXACT|NOMATCH, 'arg': <what is matching on line> 
	 */
       test: function(/** GetOpt.Env */env) {
	    return this.testOrParse(env, env.pb, true).code;
	},


	/** 
	 * Parse match and eventually, invoke parameter parse step.
         * @param env
         * @returns {Number} GetOpt.NOMATCH etc.
	 */
	parse: function(/** GetOpt.Env */env) {
	    var pb = env.pb;
	    var ret = this.testOrParse(env, env.pb, false);
	    var match = ret.code;
	    var arg = ret.arg;
	    if (match==GetOpt.NOMATCH) {
		return match;
	    }
	    
	    if ((this.opts.length >= 1) && ((this.mode&GetOpt.Option.SINGLE) != 0)) {
		pb.insert("Option `"+arg+"' specified more than once.");
		throw "OPTERROR";
	    }
	    if (this.param!=null ) {
		var param = this.param;
		var param_match;
		try {
		    param.reset();
		    param_match = param.parse(env);
		} catch (param_ex) {
		    pb.setCharPos(0);
		    pb.insert("Option `"+arg+"': ");
		    pb.setCharPos(pb.getLength());
		    throw param_ex;
		}
		if (param_match==GetOpt.NOMATCH ) {
		    pb.insert("Option `"+arg+"' failed to parse parameter `"+this.param.getMnemo()+"'.");
		    throw "OPTERROR";
		}
	    }
	    
	    //this.curr = new GetOpt.OptionState(arg, this.param ? this.param.getState(env) : null);
	    this.curr = { arg: arg, paramState: this.param ? this.param.getState(env) : null };
	    this.opts.push(this.curr);
	    //QUACK(0, "PUSH: " + this.shortOpt);
	    return match;
	},


	/** 
	 * Print spec.
         * @param env
         * @param pmode
	 */
	print: function(/** GetOpt.Env */env, /** GetOpt.PrintMode */pmode) {
	    var pb = env.pb;
	    if (pmode==GetOpt.PrintMode.DETAILS) {
		var d = this.getDescription();
		var pd = this.param==null ? null : this.param.getDescription();
		if (d==null)
		    d = pd;
		if (d!=null ) {
		    var ind = pb.getIndent();
		    this.print(env, GetOpt.PrintMode.MNEMO);
		    pb.insert('\n');
		    pb.setIndent(ind+env.detailsDescIndent);
		    var l = d.length;
		    var marker = GetOpt.Option.ADD_PARAM_DESCRIPTION;
		    var ml = marker.length;
		    if (d!=pd && l>=ml && d.substr(-ml)==marker && pd!=null) {
			pb.insert(d.substr(0,l-ml));
			pb.insert(pd);
		    } else {
			pb.insert(d);
		    }
		    pb.assertBegLine();
		    pb.setIndent(ind);
		}
		return 0;
	    }
	    var m = this.getMnemo(); // must not be NULL
           assert(m);
	    if (pmode==GetOpt.PrintMode.SHORT ) {
		pb.insertSoftSpace();
		pb.insert('[');
	    }
	    pb.insert(m);
	    if (this.param!=null) {
		pb.insert((this.mode&GetOpt.Option.PREFEQ)==0 ? ' ' : '=');
		this.param.print(env,pmode);
	    }
	    if (pmode==GetOpt.PrintMode.SHORT) {
		pb.insert(']');
	    }
	    return 0;
	},


	/** 
	 * Reset this spec. 
	 */
	reset: function() {
	    GetOpt.Spec.prototype.reset.call(this);
	    this.rst();
	},


	/** 
	 * @returns {Object} parse state. 
	 */
	getState: function(/** Env */env) {
	    return this.opts.length==0 ? null : this.opts;
	},


	/** 
	 * Set parse state.
         * @param state
	 */
	setState: function(/** Object */state) {
           if (state != null) {
	      this.curr = /** OptionState */state;
	      if (this.param != null) {
	         if (this.curr.paramState==null) {
		    this.param.reset();
	         } else {
		    this.param.setState(this.curr.paramState);
	         }
	      }
	      this.arg = this.curr.arg;
           } else {
	      if (this.param != null) {
	         this.param.reset();
	      }
           }
	},


	/** 
	 * @returns {Boolean} whether this option has been set
	 */
	isSet: function() {
	    return this.opts.length>0;
	},

   
       /**
        * Set state to ith occurence of option.
        * @param ith
        */
       setTo: function(/** Number */ith) {
          if( ith >= this.opts.length )
	     throw "Option not repeated "+ith+" times";
          this.setState(this.opts[ith]);
       }
    }

);


/**
 * If option description ends with this string
 * the description of the parameter is added.
 * @constant
 * @type Number
 */
GetOpt.Option.ADD_PARAM_DESCRIPTION = "\n";

/**
 * @constant
 * @type Number
 */
GetOpt.Option.SINGLE = 0x0100;

/**
 * @constant
 * @type Number
 */
GetOpt.Option.PREFEQ = 0x0200;

/**
 * @constant
 * @type Number
 */
GetOpt.Option.AUTO_MNEMO = 0x10000;


