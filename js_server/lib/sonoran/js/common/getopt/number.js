//  (C) COPYRIGHT INTERNATIONAL BUSINESS MACHINES CORPORATION 2006-2010
//                       ALL RIGHTS RESERVED
//        IBM Research Division, Zurich Research Laboratory
// --------------------------------------------------------------------

/**
 * GetOpt.Number parses numbers of different base (such as hex) or in different units (such as 100mm).
 * @class 
 * @augments GetOpt.Simple
 * @constructor
 * @param mnemo        mnemo or null
 * @param description  description or null
 * @param units        null or array with objects with weight (Number such as 100) and unit (String such as 'mm', 'cm')
 * @param base         optional, base
 */
GetOpt.Number = function(/** String */mnemo, /**String */description, /** Array of Unit */units, /** Number */base) {
    mnemo = mnemo ? mnemo : "num";
    GetOpt.Simple.call(this, mnemo, description, null);
    this.units = units ? units : null;
    this.base = base ? base : GetOpt.Number.ANY_BASE|GetOpt.Number.NO_UNITS;
    this.defaultNumber = 0;
    this.minmum = 0;
    this.maxmum = 0;
    this.unitIndex = -1;
    this.number = this.defaultNumber;
};

/** Prototype */
GetOpt.Number.prototype = extend(
    GetOpt.Simple.prototype,
   /** @lends GetOpt.Number.prototype */
    {
	/**
         * Units. Null or array with objects with properties weight (Number such as 100) abd unit (String such as 'mm', 'cm').
         * @type Object[]
         */
	units: null,
	/**
         * Unit index
         * @type Number
         */
	unitIndex: -1,
	/**
         * Base
         * @type Number
         */
	base: null,
	/**
         * Default number
         * @type Number
         */
	defaultNumber: 0,
	/**
         * Minimum
         * @type Number
         */
	minmum: 0,
	/**
         * Maximum
         * @type Number
         */
	maxmum: 0,
	/**
         * Result
         * @type Number
         */
	number: 0,

	/**
         * @returns {Object[] } configured units.
         */
	getUnits: function() {
	    return this.units;
	},

	/**
         * @returns {Number} parsed number.
         */
	getNumber: function() {
	    return this.number;
	},

	/**
         * @returns {Number} parsed number, but multiplied with the weight defined by its unit.
         */
	getWeightedNumber: function() {
	    return this.number*(this.units==null ? 1 : this.units[this.unitIndex].weight);
	},

	/** @private */
	rst: function() {
	    this.unitIndex = -1;
	    this.number = this.defaultNumber;
	},
	
	/** @private */
	codea: 'a'.charCodeAt(0),
	/** @private */
	codeA: 'A'.charCodeAt(0),
	/** @private */
	codez: 'z'.charCodeAt(0),
	/** @private */
	codeZ: 'Z'.charCodeAt(0),
	/** @private */
	code9: '9'.charCodeAt(0),
	/** @private */
	code0: '0'.charCodeAt(0),
	
	/** 
	 * @private 
	 */
	getDigitValue: function(/** Char */c, /** Number */base) {
	    var d;
	    if (c>=this.code0 && c <= this.code9) {
		d = (c-this.code0);
	    } else if( c>=this.codea && c<=this.codez ) {
		d = (c-this.codea)+10;
	    } else if( c>=this.codeA && c<=this.codeZ ) {
		d = (c-this.codeA)+10;
	    } else {
		return -1;
	    }
	    if( d>=base ) {
		return -1;
	    }
	    return d;
	},

	/**
	 * Parse number in string at offset and returns { num: Number, off: Number }
         * @private
	 */
	parseNum: function(/** String */s, /** Number */off, /** Number */base) {
	    if( (base & GetOpt.Number.FLOATS) != 0 ) {
		var m;
		if( !(m = /^([0-9]*[.][0-9]+|[0-9]+([.][0-9]*)?)([eE][-+]?[0-9]+)?/.exec(s.substr(off))) )
		    return -1;
		return { num: eval(m[0]), off: off + m[0].length + m.index };
	    }
	    var v, d;
	    v = d = 0;
	    // Check prefix
	    if ((base&0xFF)==GetOpt.Number.ANY_BASE) {
		base = 10;
		if (s.charAt(off) == '0') {
		    base = 8;
		    if (s.charAt(off+1)=='x' || s.charAt(off+1)=='X') {
			base = 16;
			off += 2;
			d = -1; // must see at least one digit
		    }
		}
	    }
	    while(off < s.length) {
		var c = s.charCodeAt(off);
		if ((c = this.getDigitValue(c, base)) < 0 ) {
		    break;
		}
		v = v*base + c;
		d = 0;
		off += 1;
	    }
	    var ret = { num: v, off: -1 };
	    if (d >= 0) {  // there was at least one digit
		ret.off = off;
	    }
	    //QUACK(0, "Number.parseNum: " + v);
	    return ret;
	},

	/**
         * Configure a minimum and maximum for number to parse.
         * @param defaultNumber
         * @param minnum
         * @param maxnum
         */
	setRange: function(/** Number */defaultNumber, /** Number */minnum, /** Numer */maxnum) {
	    this.defaultNumber = defaultNumber;
	    this.minnum = minnum;
	    this.maxnum = maxnum;
	    this.rst();
	},
	
	/**
         * @returns {Object} state
         */
	getState: function(/** GetOpt.Env */env) {
	    //QUACK(0, "Number.getState: " + this.arg);
	    return { arg: this.arg, unitIndex: this.unitIndex, number: this.number };
	},

	/**
         * Set state.
         * @param state
         */
	setState: function(/** Object */state) {
	    assert(state.arg);
	    this.arg = state.arg;
	    this.unitIndex = state.unitIndex;
	    this.number = state.number;
	    //QUACK(0, "Number.setState: " + this.arg);
	},

	/**
         * Reset state.
         */
	reset: function() {
	    GetOpt.Simple.prototype.reset.call(this);
	    this.rst();
	},

	/**
         * Parse args in environment.
         * @param env
         * @returns {Number} GetOpt.EXACT etc.
         */
	parse: function(/** GetOpt.Env */env) {
	    var units = this.units;
	    var pb = env.pb;
	    //QUACK(0, "Number.parse: ...");
	    GetOpt.Simple.prototype.parse.call(this, env);
	    var a = this.getArg();
	    var isnegative = false;
	    var aoff = 0;
	    
	    if ((this.base&GetOpt.Number.NEGATIVES)!=0 && a.charAt(aoff)=='-' ) {
		isnegative = true;
		aoff += 1;
	    }
	    var ret = this.parseNum(a, aoff, this.base);
	    this.number = ret.num;
	    aoff = ret.off;
	    if ((isnegative&&aoff==1) || (units==null && aoff!=a.length)) {
		pb.insert("%s: %s: %s",
			  this.getMnemo(),
			  (this.base&0xFF)==16 && /^0[xX]/.test(a)
			  ? "Expecting only raw hexdigits; `0x' prefix is illegal"
			  : "Illegal number",
			  this.getArg());
		throw "OPTERROR";
	    }
	    if (isnegative) {
		this.number = 0-this.number;
	    }
	    
	    //QUACK(0, "Number.parse: " + this.number);
	    if (units!=null) {
		var arem = a.substring(aoff);
		this.unitIndex = -1;
		for (var i = 0; i < units.length; i++) {
		    var us = units[i].unit;
		    if ((((this.base&GetOpt.Number.ICASE_UNITS)!=0) && (arem==us)) || (arem.toLowerCase()==us.toLowerCase())) {
			this.unitIndex = i;
			break;
		    }
		}
		if (this.unitIndex == -1) {
		    if (aoff==a.length) {
			pb.insert("%s: Number must be followed by a unit:", this.getMnemo());
			for (var j = 0; j < units.length; j++ ) {
			    pb.insert('|');
			    pb.insert(units[j].unit);
			}
		    } else {
			pb.insert("%s: Illegal number/unit: %s", this.getMnemo(), arem);
		    }
		    throw "OPTERROR";
		}
	    }
	    if (this.minnum!=0 || this.maxnum!=0 ) {
		var m = null;
		if (this.number<this.minnum) {
		    m = "small";
		}
		if (this.number > this.maxnum) {
		    m = "big";
		}
		if (m!=null) {
		    pb.insert(sprintf("%s: Number is too %s - legal range: %d..%d", this.getMnemo(), m, this.minnum, this.maxnum));
		    throw "OPTERROR";
		}
	    }
	    return GetOpt.EXACT;
	},


	/**
         * Print spec.
         */
	print: function(/** GetOpt.Env */env, /** GetOpt.PrintMode */mode) {
	    var units = this.units;
	    var pb = env.pb;
	    var m = this.getMnemo();
	    
	    if (mode==GetOpt.PrintMode.MNEMO || mode==GetOpt.PrintMode.SHORT ) {
		pb.insert(m);
		if ((this.mode&GetOpt.Number.NO_UNITS)==0 && units!=null) {
		    var close;
		    if (units.length==1) {
			pb.insert('[');
			close = ']';
		    } else {
			pb.insert('{');
			close = '}';
		    }
		    for (var i = 0; i < units.length; i++) {
			if (i != 0) {
			    pb.insert('|');
			}
			pb.insert(units[i].unit);
		    }
		    pb.insert(close);
		}
		return 0;
	    }
	    return GetOpt.Simple.prototype.print.call(this, env,mode);
	}
    }
);


/**
 * @constant
 * @type Number
 */
GetOpt.Number.ANY_BASE = 0;

/**
 * @constant
 * @type Number
 */
GetOpt.Number.NO_UNITS = 0x100;

/**
 * @constant
 * @type Number
 */
GetOpt.Number.ICASE_UNITS = 0x200;

/**
 * @constant
 * @type Number
 */
GetOpt.Number.NEGATIVES = 0x400;

/**
 * @constant
 * @type Number
 */
GetOpt.Number.FLOATS = 0x800;
