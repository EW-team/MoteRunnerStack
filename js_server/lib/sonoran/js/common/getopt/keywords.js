//  (C) COPYRIGHT INTERNATIONAL BUSINESS MACHINES CORPORATION 2006-2010
//                       ALL RIGHTS RESERVED
//        IBM Research Division, Zurich Research Laboratory
// --------------------------------------------------------------------

/**
 * GetOpt.Keywords extends GetOpt.Simple to match an arg against a list of keywords.
 * @class 
 * @augments GetOpt.Simple
 * @constructor
 * @param mnemo         mnemo or null
 * @param description   description or null
 * @param keywords      array of keywords
 * @param descrs        null or array of keyword descriptors for detailed help
 * @param mode          parameter to GetOpt.abbrevMatch
 * @param separator     separator character
 */
GetOpt.Keywords = function(/** String */mnemo, /**String */description, /** String[] */keywords, /** String[] */kwdescrs, /** Number */mode, /** Char */separator) {
    GetOpt.Simple.call(this, mnemo, description, null);
    this.separator = separator ? separator : "-";
    this.mode = mode ? mode : 0;
    this.kwdescrs = kwdescrs ? kwdescrs : null;
    this.keywords = keywords;
    assert(keywords);
    this.keywordIndex = -1;
};

/** Prototype */
GetOpt.Keywords.prototype = extend(
    GetOpt.Simple.prototype,
   /** @lends GetOpt.Keywords.prototype */
    {
	/**
         * Keyword separator
         * @type String
         */
	separator: "-",
	/**
         * Parse mode
         * @type Number
         */
	mode: 0,
	/**
         * Array of keyword descriptors or null
         * @type String[]
         */
	kwdescrs: null,
	/**
         * Array of keywords
         * @type String[]
         */
	keywords: null,
	/**
         * Result keyword index
         * @type Number
         */
	keywordIndex: -1,

	/**
         * @returns {String[] configured keywords
         */
	getKeywords: function() {
	    return this.keywords;
	},

	/**
         * @returns {String[]} configured keyword descriptions
         */
	getKeywordDescriptions: function() {
	    return this.kwdescrs;
	},

	/**
         * @returns {Number} index of selected keyword
         */
	getSelectedKeywordIndex: function() {
	    return this.keywordIndex;
	},

	/**
         * @returns {String} selected keyword
         */
	getSelectedKeyword: function() {
	    return this.keywordIndex < 0 ? null : this.keywords[this.keywordIndex];
	},

	/**
         * @returns {Object} spec state
         */
	getState: function(/** GetOpt.Env */env) {
	    return { arg: this.arg, index: this.keywordIndex };
	},

	/**
         * Set spec state.
         * @param state
         */
	setState: function(/** Object */state) {
	    assert(state.arg);
	    this.arg = state.arg;
	    this.keywordIndex = state.keywordIndex;
	},

	/**
         * Reset state.
         */
	reset: function() {
	    GetOpt.Simple.prototype.reset.call(this);
	    this.keywordIndex = -1;
	},
	
	/**
         * Test environment args against this spec.
         * @param env
         * @returns {Number} GetOpt.EXACT etc.
         */
	test: function(/** GetOpt.Env */env) {
	    var m = GetOpt.Simple.prototype.test.call(this, env);
	    if (m == GetOpt.NOMATCH) {
		return m;
	    }
	    var arg = env.currArg();
	    for (var i = 0; i < this.keywords.length; i++) {
		var kw = this.keywords[i];
		m = GetOpt.abbrevMatch(this.mode, this.separator, kw, arg).match;
		if (m==GetOpt.EXACT || m==GetOpt.ABBREV) {
		    return m;
		}
	    }
	    return GetOpt.NOMATCH;
	},

	/**
         * Parse environment args against this spec.
         * @param env
         * @returns {Number} GetOpt.EXACT etc.
         */
	parse: function(/** GetOpt.Env */env) {
	    var ret = this.test(env);
	    if (ret == GetOpt.NOMATCH) {
		env.pb.insert("Keyword argument '");
		this.print(env, GetOpt.PrintMode.MNEMO);
		env.pb.insert("' is missing.");
		throw "OPTERROR";
	    }
	    ret = GetOpt.Simple.prototype.parse.call(this, env);
	    var a = this.getArg();
	    var m, cnt=0;
	    var keywords = this.keywords;
	    var i;
	    for (i=0; i < keywords.length; i++) {
		var kw = keywords[i];
		m = GetOpt.abbrevMatch(this.mode, this.separator, kw, a).match;
		if (m==GetOpt.EXACT) {
		    this.keywordIndex = i;
		    return ret;
		}
		if (m==GetOpt.ABBREV ) {
		    this.keywordIndex = i;
		    cnt += 1;
		}
	    }
	    var pb = env.pb;
	    if (cnt==0) {
		pb.insert("Illegal keyword: %s", a);
		throw "OPTERROR";
	    }
	    if (cnt>1) {
		pb.insert("%s is ambiguous - matches the following keywords:", a);
		for (i=0; i < keywords.length; i++) {
		    var kw = keywords[i];
		    if (GetOpt.abbrevMatch(this.mode, this.separator, kw, a).match == GetOpt.ABBREV) {
			pb.insert(' ');
			pb.insert(kw);
			cnt -= 1;
		    }
		}
		throw "OPTERROR";
	    }
	    return ret;
	},
	
	/**
         * Print spec.
         */
	print: function(/** GetOpt.Env */env, /** GetOpt.PrintMode */mode) {
	    var pb = env.pb;
	    var m = this.getMnemo();
	    var kwn = this.getKeywords();
	    var kwd = this.getKeywordDescriptions();
	    if (mode==GetOpt.PrintMode.MNEMO) {
		if (m!=null) {
		    pb.insert(m);
		} else {
		    for(var i = 0; i < kwn.length; i++) {
			if (i>0)
			    pb.insert('|');
			pb.insert(kwn[i]);
		    }
		}
		return 0;
	    }
	    if( mode==GetOpt.PrintMode.SHORT ) {
		pb.insertSoftSpace();
		this.print(env, GetOpt.PrintMode.MNEMO);
		// if (m!=null) {
		//     //var pos = pb.getLength();
		//     var ind = pb.setIndent(0);
		//     pb.assertEmptyLine();
		//     pb.insert("where " + m + " is one of the following keywords:\n");
		//     pb.setIndent(env.detailsDescIndent);
		//     pb.insertSoftSpace();
		//     for (var i=0; i < kwn.length; i++) {
		// 	if (i>0)
		// 	    pb.insert('|');
		// 	pb.insert(kwn[i]);
		//     }
		//     pb.assertBegLine();
		//     pb.setIndent(ind);
		//     //pb.setCharPos(pos);
		// }
		return 0;
	    }
	    GetOpt.Simple.prototype.print.call(this, env, mode);
/*	    if (kwd != null) {
		var ind1 = pb.addIndent(env.detailsDescIndent);
		for (var i = 0; i < kwn.length; i++) {
		    pb.insert(kwn[i]);
		    var ind2 = pb.addIndent(env.detailsDescIndent);
		    pb.insert("\n");
		    pb.insert(kwd[i]);
		    pb.assertBegLine();
		    pb.setIndent(ind2);
		}
		pb.setIndent(ind1);
	    }
*/
	    return 0;
	}
    }
);
