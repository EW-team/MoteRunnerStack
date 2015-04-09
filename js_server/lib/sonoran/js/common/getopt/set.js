//  (C) COPYRIGHT INTERNATIONAL BUSINESS MACHINES CORPORATION 2006-2010
//                       ALL RIGHTS RESERVED
//        IBM Research Division, Zurich Research Laboratory
// --------------------------------------------------------------------

/**
 * GetOpt.Set  
 * @class 
 * @augments GetOpt.Spec
 * @constructor
 * @param paramSpec
 * @param mode            optional
 * @param mnemo           optional
 * @param description     optional
 */
GetOpt.Set = function(/**Spec*/paramSpec, /**Number*/mode, /**String*/mnemo, /**String*/description) {
   mnemo = mnemo ? mnemo : null;
   description = description ? description : null;
   this.param = [ paramSpec, null ];
   GetOpt.Spec.call(this, mnemo, description, this.param);
   this.mode = mode;
   this.rst();
};

/**
 * @constant
 * @type Number
 */
GetOpt.Set.STOP_AT_OPTION = 0x1;

/** Prototype */
GetOpt.Set.prototype = extend(
    GetOpt.Spec.prototype,
   /** @lends GetOpt.Set.prototype */
    {
       /**
        * Mode
        * @type Number
        */
	mode: null,

       /**
        * Parsed state: array with 'param.getState' objects with properties such as arg, index etc.
        * @type Object[]
        */
       states: null,
       
       /**
	* Reset this spec.
        * @private 
        */
       rst: function() {
          this.states = [];
          this.allowUpdates = true;
       },

       /**
        * @returns {Object[]} array with paramState objects with properties such as arg, index etc.
        */
       getState: function() {
          if (this.states.length==0) {
             return null;
          }
          this.allowUpdates = false;     // disable updates via parse (reset required)
          return this.states;
       },

       /**
        * Set state. Parameter is Array of paramState objects
        */
       setState: function(/** Object */state) {
          this.states = state;
          this.allowUpdates = false;        // disable updates via parse (reset required)
       },
       
	/**
         * Get size of set.
         */
	getSize: function() {
	    return this.states.length;
	},

       
	/**
         * Param to ith state
         */
	setTo: function (i) {
	    return this.param[0].setState(this.states[i]);
	},

       
	/**
         * Reset this spec.
         */
	reset: function() {
	   GetOpt.Spec.prototype.reset.call(this);
	   this.rst();
	},

       
	/**
         * Test args in environment.
         * @param env
         * @returns {Number} GetOpt.EXACT etc.
         */
	test: function(/** Env */env) {
           return env.moreConsumableArgs(false) &&
              ((this.mode&GetOpt.Set.STOP_AT_OPTION)==0 || env.argv[0][0]!='-');
	},

       
	/**
         * Parse args in environment.
         */
	parse: function(/** Env */env) {
           assert(this.allowUpdates);
           while (env.moreConsumableArgs(true) &&
                  ((this.mode&GetOpt.Set.STOP_AT_OPTION)==0 || env.argv[0][0]!='-') ) {
              this.param[0].reset();
              this.param[0].parse(env);
              var paramState = this.param[0].getState(env);
              this.states.push(paramState);
           }
           return GetOpt.EXACT;
	},

       
	/**
         * Print this spec.
         */
	print: function(/** Env */env, /** PrintMode */mode) {
	   var children = this.children;
	   var pb = env.pb;
	   var m = this.getMnemo();
	   if (mode == GetOpt.PrintMode.DETAILS) {
              var d = this.getDescription();
              if( m!=null && d!=null ) {
                 var ind = pb.getIndent();
                 pb.setIndent(ind+env.detailsDescIndent);
                 pb.insert("%s\n%s", m, d);
                 pb.assertEmptyLine();
                 pb.setIndent(ind);
              }
              for (var i = 0; i < this.children.length; i++ ) {
                 if (this.children[i]!=null) {
                    this.children[i].print(env, GetOpt.PrintMode.DETAILS);
                 }
              }
              return 0;
           }
           if (mode==GetOpt.PrintMode.MNEMO) {
              if (m!=null) {
                 pb.insert(m);
              } else {
                 pb.insert('{');
                 this.param[0].print(env,GetOpt.PrintMode.MNEMO);
                 pb.insert("}..");
              }
              return 0;
           }
	   // mode==GetOpt.PrintMode.SHORT
           var pos, ind;
           if (m!=null) {
              pb.insertSoftSpace();
              pb.insert(m);
              pos = pb.setCharPosEnd();
              ind = pb.setIndent(0);
              pb.assertEmptyLine();
              pb.insert("where %s:\n", m);
              pb.setIndent(env.detailsDescIndent);
              this.param[0].print(env, GetOpt.PrintMode.SHORT);
              pb.setCharPos(pos);
              pb.setIndent(ind);
              return 0;
           }
           pb.insert('{');
           this.param[0].print(env, GetOpt.PrintMode.SHORT);
           pb.insert("}..");
           return 0;
        },

	/**
         * @returns {String} debug string.
         */
	toString: function() {
	    return "Set: " + this.mnemo + ", " + this.description + ", " + this.children.length;
	}
    }
);
