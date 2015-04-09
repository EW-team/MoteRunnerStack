//  (C) COPYRIGHT INTERNATIONAL BUSINESS MACHINES CORPORATION 2006-2010
//                       ALL RIGHTS RESERVED
//        IBM Research Division, Zurich Research Laboratory
// --------------------------------------------------------------------

/**
 * Constructor. GetOpt.FileSpec inherits GetOpt.Simple to accept a filepath.
 * The file must exist otherwise parsing fails.
 * @class 
 * @augments GetOpt.Simple
 * @constructor
 * @param mnemo           Optional, mnemo
 * @param description     Otional, description
 * @param path            Optional, default value
 * @param mustExist            Optional
 * @param mustBeDir            Otional
 */
GetOpt.FileSpec = function(/** String */mnemo, /** String */description, /** String */path, /** Boolean */mustExist, /** Boolean */mustBeDir) {
    mnemo = mnemo ? mnemo : "filename";
    description = description ? description : "Filename";
    GetOpt.Simple.call(this, mnemo, description, null);
    this.dflt = path ? path : null;
    this.path = this.dflt;
    this.mustExist = mustExist ? true : false;
    this.mustBeDir = mustBeDir ? true : false;
};

/** Prototype */
GetOpt.FileSpec.prototype = extend(
    GetOpt.Simple.prototype,
   /** @lends GetOpt.FileSpec.prototype */
    {
	/**
         * Default file result
         * @type String
         */
	dflt: null,

	/**
         * Result file
         * @type String
         */
	path: null,

	/**
         * Specified file must exist
         * @type Boolean
         */
	mustExist: false,


	/**
         * @returns {Object} state.
         */
	getState: function(/** GetOpt.Env */env) {
	    return { arg: this.arg, path: this.path };
	},

	/**
         * Set state.
         * @param state
         */
	setState: function(/** Object */state) {
	    this.arg = state.arg;
	    this.path = state.path;
	},

	/**
         * Reset this spec.
         */
	reset: function() {
	    GetOpt.Simple.prototype.reset.call(this);
	    this.path = this.dflt;
	},

	/**
         * @returns {String} file path.
         */
	getPath: function() {
	    return this.path;
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
	    if (this.mustExist && !IO.File.exists(arg)) {
		return GetOpt.NOMATCH;
	    }
	    return GetOpt.EXACT;
	},

	/**
         * Parse args in environment.
         * @param env
         * @returns {Number} GetOpt.EXACT etc.
         */
	parse: function(/** GetOpt.Env */env) {
	    var ret = GetOpt.Simple.prototype.parse.call(this, env);
	    var path = GetOpt.Simple.prototype.getArg.call(this);
	    path = path ? IO.File.mappath(path) : null;
	    if (this.mustExist && !IO.File.exists(path)) {
		env.pb.insert(sprintf("No such file: '%s'", path));
		throw "OPTERROR";
	    }
	    if (this.mustBeDir && !IO.File.isDir(path)) {
		env.pb.insert(sprintf("Not a directory: '%s'", path));
		throw "OPTERROR";
	    }
	    this.path = path;
	    return GetOpt.EXACT;
	}
    }
);
	
	
	









// /**
//  * Constructor. GetOpt.FileSpec inherits GetOpt.Simple to accept a filepath.
//  * The file may or may not exist.
//  * @class 
//  * @augments GetOpt.Simple
//  * @constructor
//  * @param mnemo           optional, mnemo
//  * @param description     optional, description
//  * @param dflt            optional, default value
//  */
// GetOpt.AnyFileSpec = function(/** String */mnemo, /** String */description, /** String */dflt) {
//     mnemo = mnemo ? mnemo : "filename";
//     description = description ? description : "Filename";
//     GetOpt.Simple.call(this, mnemo, description, null);
//     if (dflt) {
// 	dflt = IO.File.mappath(dflt);
//     }
//     this.dflt = dflt ? dflt : null;
//     this.path = this.dflt;
// };

// /** Prototype */
// GetOpt.AnyFileSpec.prototype = extend(
//     GetOpt.Simple.prototype,
//    /** @lends GetOpt.AnyFileSpec.prototype */
//     {
// 	/**
//          * Default file result
//          * @type String
//          */
// 	dflt: null,

// 	/**
//          * Result file
//          * @type String
//          */
// 	path: null,

// 	/**
//          * @returns {Object} state.
//          */
// 	getState: function(/** GetOpt.Env */env) {
// 	    return { arg: this.arg, path: this.path };
// 	},

// 	/**
//          * Set state.
//          * @param state
//          */
// 	setState: function(/** Object */state) {
// 	    this.arg = state.arg;
// 	    this.path = state.path;
// 	},

// 	/**
//          * Reset this spec.
//          */
// 	reset: function() {
// 	    GetOpt.Simple.prototype.reset.call(this);
// 	    this.path = this.dflt;
// 	},

// 	/**
//          * @returns {String} absolute file path.
//          */
// 	getPath: function() {
// 	    return this.path;
// 	},

// 	/**
//          * Test args in environment.
//          * @param env
//          * @returns {Number} GetOpt.EXACT etc.
//          */
// 	test: function(/** GetOpt.Env */env) {
// 	    var m = GetOpt.Simple.prototype.test.call(this, env);
// 	    if (m == GetOpt.NOMATCH) {
// 		return m;
// 	    }
// 	    var arg = env.currArg();
// 	    // TODO: match for valid filename?
// 	    return GetOpt.EXACT;
// 	},

// 	/**
//          * Parse args in environment.
//          * @param env
//          * @returns {Number} GetOpt.EXACT etc.
//          */
// 	parse: function(/** GetOpt.Env */env) {
// 	    var ret = GetOpt.Simple.prototype.parse.call(this, env);
// 	    var path = GetOpt.Simple.prototype.getArg.call(this);
// 	    this.path = path ? IO.File.mappath(path) : null;
// 	    return GetOpt.EXACT;
// 	}
//     }
// );
	
	
	
