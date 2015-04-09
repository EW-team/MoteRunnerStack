//  (C) COPYRIGHT INTERNATIONAL BUSINESS MACHINES CORPORATION 2006-2010
//                       ALL RIGHTS RESERVED
//        IBM Research Division, Zurich Research Laboratory
// --------------------------------------------------------------------

/**
 * GetOpt.Seq parses args in an environment against a list of GetOpt.Spec's.
 * @class 
 * @augments GetOpt.Spec
 * @constructor
 * @param specs
 * @param mandatoryArgs   optional
 * @param mnemo           optional
 * @param description     optional
 */
GetOpt.Seq = function(/**Spec[]*/specs, /**Number*/mandatoryArgs, /**String*/mnemo, /**String*/description) {
    mnemo = mnemo ? mnemo : null;
    description = description ? description : null;
    GetOpt.Spec.call(this, mnemo, description, specs);
    this.mandatoryArgs = (mandatoryArgs!=undefined&&mandatoryArgs!=null) ? mandatoryArgs : specs.length;
    this.args = -1;
};

/** Prototype */
GetOpt.Seq.prototype = extend(
    GetOpt.Spec.prototype,
   /** @lends GetOpt.Seq.prototype */
    {
       /**
        * @type Number
        * @private
        */
	mandatoryArgs: null,
       /**
        * @type Number
        * @private
        */
       args: -1,

       /**
        * @returns {Number} number of parsed specs or -1 if parse has never been called.
        */
       argsPresent: function() {
          return this.args;
       },

       /**
        * @returns {GetOpt.Spec[]} the specifications of the arguments.
        */
       getSpecs: function() {
          return this.specs;
       },

       /**
        * @returns {Number} the number of mandatory arguments.
        */
        getMandatoryArgs: function() {
           return this.mandatoryArgs;
        },

       /**
        * @returns {Object} state
        */
       getState: function(env) {
          var state = [];
          for(var i = 0; i < this.children.length; i++) {
             state.push(this.children[i].getState(env));
          }
          return state;          
       },

       /**
        * Set state.
        * @param state
        */
       setState: function(/** Object */state) {
          for(var i = 0; i < this.children.length; i++) {
             this.children[i].setState(state[i]);
          }
       },

	/**
         * Reset this spec.
         */
	reset: function() {
	    GetOpt.Spec.prototype.reset.call(this);
	    this.args = -1;
	},

	/**
         * Test args in environment.
         * @param env
         * @returns {Number} GetOpt.EXACT etc.
         */
	test: function(/** GetOpt.Env */env) {
	    return env.moreArgs();
	},

	/** 
	 * Parse args in environment. 
	 * @param env
	 */
	parse: function(/** GetOpt.Env */env) {
	    //QUACK(0, "SEQ.parse: ...");
	    this.args = 0;
	    for (var i = 0; i < this.children.length; i++) {
		if (i >= this.mandatoryArgs && !env.moreConsumableArgs(1)) {
		    break;
		}
		this.children[i].parse(env);
		this.args++;
	    }
	    return GetOpt.EXACT;
	},

	/**
         * Print this spec.
         * @param env
         * @param mode
         */
	print: function(/** GetOpt.Env */env, /** GetOpt.PrintMode */mode) {
	    var children = this.children;
	    var pb = env.pb;
	    var m = this.getMnemo();
	    if (mode == GetOpt.PrintMode.DETAILS) {
		var d = this.getDescription();
		if (m!=null && d!=null) {
		    var ind = pb.addIndent(env.detailsDescIndent);
		    pb.insert(""+m+"\n"+d+"");
		    pb.assertEmptyLine();
		    pb.setIndent(ind);
		}
		for(var i=0; i<children.length; i++ ) {
		    children[i].print(env, mode);
		}
		return 0;
	    }
	    if (m!=null) {
		if (mode==GetOpt.PrintMode.SHORT) {
		    pb.insertSoftSpace();
		}
		pb.insert(m);
	    }
	    if (m==null || (mode==GetOpt.PrintMode.SHORT && m!=null)) {
		var i;
		for (i=0; i < children.length; i++) {
		    if (i>0)
			pb.insert(' ');
		    if (i >= this.mandatoryArgs)
			pb.insert('[');
		    children[i].print(env,mode);
		}
		
		if ((i-=this.mandatoryArgs) > 0) {
		    var s;
		    switch(i) {
		    case 1:  s="]";    break;
		    case 2:  s="]]";   break;
		    case 3:  s="]]]";  break;
		    case 4:  s="]]]]"; break;
		    default: s="]..]"; break;
		    }
		    pb.insert(s);
		}
	    }
	    return 0;
	},

	/**
         * @returns {String} debug string.
         */
	toString: function() {
	    return "Seq: " + this.mnemo + ", " + this.description + ", " + this.children.length;
	}
    }
);
