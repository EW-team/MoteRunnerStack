/**
 * GetOpt.OptionSet spec manages a set of options.
 * @class 
 * @augments GetOpt.Spec
 * @constructor
 * @param options      Array of option specs
 * @param mode         null or STOP_AT_UNKNOWN
 * @param mnemo        optional
 * @param description  optional
 */
GetOpt.OptionSet = function(/** GetOpt.Option[] */options, /** Number  */mode, /** String */mnemo, /**String */description) {
    GetOpt.Spec.call(this, mnemo, description, options);
    this.mode = mode||0;
};

/** Prototype */
GetOpt.OptionSet.prototype = extend(
    GetOpt.Spec.prototype,
   /** @lends GetOpt.OptionSet.prototype */
    {
	/**
         * Mode
         * @type Number
         */
	mode: null,

	/**
         * @returns {GetOpt.Option[]} options.
         */
	getOptions: function() {
	    return this.children;
	},


	/**
         * Test args in environment.
         * @param env
         * @returns {Number} GetOpt.EXACT etc.
         */
	test: function(/** GetOpt.Env */env) {
	    return env.moreConsumableArgs(0);
	},

	/**
         * Parse args in environment.
         * @param env
         * @returns {Number} GetOpt.EXACT etc.
         */
	parse: function(/** GetOpt.Env */env) {
	    //QUACK(0, "OptionSet.parse: ...");
	    while(true) {
		if (!env.moreConsumableArgs(1)) {
		    break;
		}
		var a = env.currArg();
		var abbrevMatches = 0;
		var matchOpt = null;
		var match;
		for (var i = 0; i < this.getOptions().length; i++) {
		    var opt = this.getOptions()[i];
		    if ((match = opt.test(env)) != GetOpt.NOMATCH) {
			matchOpt = opt;
			if (match == GetOpt.EXACT) {
			    break;
			}
			abbrevMatches += 1;
		    }
		}
		if (matchOpt==null) {
		    // No option did match
		    if (((this.mode&GetOpt.OptionSet.STOP_AT_UNKNOWN) != 0) ||  // any unknown option stops processing
			(a.charAt(0)!='-') || (a.length==1)) {        // doesn't look like an option - stop
			break;
		    }
		    this.complain(env, a, 0);
		    // NOT REACHED
		}
		if( matchOpt==null || abbrevMatches>1 ) {
		    this.complain(env, a, abbrevMatches);
		    // NOT REACHED
		}
		matchOpt.parse(env);
	    }
	    // We're done
	    return GetOpt.EXACT;
	},
	
	/**
         * Throw error
         * @private
         */
	complain: function(/** GetOpt.Env */env, /** String*/arg, /** Number */ambi) {
	    var pb = env.pb;
	    var m = this.getMnemo();
	    pb.insert(ambi==0 ? "Illegal" : "Ambiguous");
	    pb.insert(" option");
	    if( m!=null ) {
		pb.insert(" for option set <"+m+">");
	    }
	    pb.insert(": ");
	    if (arg.charAt(0)=='-' && arg.charAt(1)!='-' && arg.length!=1) {
		pb.insert(arg.charAt(1));
	    } else {
		var l=0;
		while(l<arg.length && arg.charAt(l)!='=') l++;
		pb.insert(arg.substr(0, l));
	    }
	    if (ambi!=0) {
		pb.insert("\nCould be one of:\n");
		var options = this.getOptions();
		for (var i = 0; i < options.length; i++) {
		    var opt = options[i];
		    if (opt.test(env)==GetOpt.ABBREV) {
			pb.insert("  ");
			pb.insert(opt.getLongOpt());
		    }
		}
	    }
	    throw "OPTERROR";
	},


	/**
         * Print this spec.
         * @param env
         * @param mode
         */
	print: function(/** GetOpt.Env */env, /** GetOpt.PrintMode */mode) {
	    var options = this.getOptions();
	    var pb = env.pb;
	    var m = this.getMnemo();
	    if (mode==GetOpt.PrintMode.MNEMO) {
		if (m!=null ) {
		    pb.insert(m);
		} else {
		    for (var i = 0; i < options.length; i++) {
			var opt = options[i];
			pb.insert('[');
			opt.print(env, GetOpt.PrintMode.MNEMO);
			pb.insert(']');
		    }
		}
		return 0;
	    }
	    if (mode==GetOpt.PrintMode.SHORT) {
		if (m==null) {
		    var p1 = pb.pos;
		    pb.insertSoftSpace();
		    pb.insert('{');
		    var p2 = pb.pos;
		    for (var i = 0; i < options.length; i++) {
			var opt = options[i];
			opt.print(env, GetOpt.PrintMode.SHORT);
		    }
		    if( p2 == pb.pos ) {
			// Option set was empty - do not insert {}
			pb.buf.splice(p1,p2-p1,"");
			pb.pos = p1;
		    } else {
			pb.insert('}');
		    }
		} else {
		    pb.insertSoftSpace();
		    pb.insert(m);
		    var pos = pb.getCharPos();
		    pb.setCharPos(pb.getLength());
		    var ind = pb.setIndent(0);
		    pb.assertEmptyLine();
		    pb.insert("where "+m+":\n");
		    pb.setIndent(env.detailsDescIndent);
		    for (var i = 0; i < options.length; i++) {
			var opt = options[i];
			opt.print(env, GetOpt.PrintMode.SHORT);
		    }
		    pb.setIndent(ind);
		    pb.setCharPos(pos);
		}
		return 0;
	    }
	    if (mode==GetOpt.PrintMode.DETAILS ) {
		var d = this.getDescription();
		if (m!=null && d!=null) {
		    var ind = pb.addIndent(env.detailsDescIndent);
		    pb.insert(""+m+"\f\n"+d+"\f\n");
		    pb.setIndent(ind);
		}
		for (var i = 0; i < options.length; i++) {
		    var opt = options[i];
		    opt.print(env,mode);
		}
		return 0;
	    }
	    return 0;
	}
    }
);


/** 
 * Parse mode.
 * @type Number
 * @constant 
 */
GetOpt.OptionSet.STOP_AT_UNKNOWN = 0x01;
