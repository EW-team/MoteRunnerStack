//  (C) COPYRIGHT INTERNATIONAL BUSINESS MACHINES CORPORATION 2006-2010
//                       ALL RIGHTS RESERVED
//        IBM Research Division, Zurich Research Laboratory
// --------------------------------------------------------------------













/**
 * Define, query and set script/program  options.
 * Scripts may retrieve options from this class to allow users 
 * to override these default values from the command line using
 * the 'option'-command.
 * @class
 */
var OPTIONS = {
    /**
     * @private
     */
    _db: {},
    /**
     * Define an option.
     * @param name  Name
     * @param type  'string', 'int', 'bool'
     * @param description
     * @param getfunc Null or function returning value for named option
     * @param setfunc Null or function setting value for named option
     */
    add: function (/** String */name, /** String */type, /** String */description, /** Function */getfunc, /** Function */setfunc) {
	if( getfunc==null || setfunc==null ) {
	    var path = name.split(/\./);
	    var n = path.length-1;
	    if( getfunc==null ) {
		getfunc = function () {
		    var o=GLOBAL_CONTEXT;
		    for( var i=0; i<=n; i++ ) {
			if( o==null )
			    throw "Undefined option: "+this.name;
			o = o[path[i]];
		    }
		    return o;
		};
	    }
	    if( setfunc==null ) {
		setfunc = function (value) {
		    var o=GLOBAL_CONTEXT;
		    for( var i=0; i<n; i++ ) {
			o = o==null ? null : o[path[i]];
		    }
		    if( o==null )
			throw "Undefined option: "+this.name;
		    o[path[n]] = value;
		};
	    }
	}
	this._db[name] = {
	    name: name,
	    get:  getfunc,
	    set:  setfunc,
	    type: type||'string',
	    description: description
	};
    },
    /**
     * Return option.
     * @param name
     * @returns {Object}
     * @private
     */
    get: function (/** String */name) {
	var opt = this._db[name];
	if( opt==null )
	    throw "No such option: "+name;
	return opt;
    },
    /**
     * @returns {String[]} sorted list of option names
     */
    getNames: function () {
	var names = [];
	for( var k in this._db )
	    names.push(k);
	return names.sort(function (a,b) { 
			      a = a.toLowerCase();
			      b = b.toLowerCase();
			      if( a==b ) return 0;
			      return a<b ? -1 : 1;
			  });
	
    },
    /**
     * Return current value of option.
     * @param name
     * @returns {Object} value
     */
    getValue: function (/** String */name) {
	return this.get(name).get();
    },
    /**
     * Set value of option.
     * @param name
     * @param value
     */
    setValue: function (/** String */name, /** Object */value) {
	this.get(name).set(value);
    }
};








/**
 * Create an enumeration object.
 * This class mantains a mapping of member names to numbers.
 * Example:
 * <pre>
 * var ERR = new ENUM("err", "OK", "FAIL", 128, "TIMEOUT");
 * if( status != ERR.OK ) println(ERR.toStr(status));
 * </pre>
 * <pre>
 * var ERR = new ENUM("err", ['toStr','toText'], ["OK","good"], ["FAIL","failure"], 128, "TIMEOUT");
 * if( status != ERR.OK ) println(ERR.toStr(status));
 * </pre>
 * @class
 * @constructor
 * @param enumName Name of the enumeration.
 * @param args..   A sequence of string denoting the member names.
 *                 First member gets value 0, next members increasing values.
 *                 Numbering can be changed by inserting a number before a member name.
 */
var ENUM = function (enumName) {
    /**
    * The name of this enumeration.
    */
    this.enumName = enumName;
//XXX:?:needed?    /**
//XXX:?:needed?    * The list of member names as passed in the constructor.
//XXX:?:needed?    * Each of these names is also a field name in this class unless
//XXX:?:needed?    * is would shadow and API element.
//XXX:?:needed?    */
//XXX:?:needed?    this.memberNames = [];
//XXX:?:needed?    /**
//XXX:?:needed?    * The list of values in the same as the member names in memberNames.
//XXX:?:needed?    */
//XXX:?:needed?    this.memberValues = [];

    this.nameMap = [];
    this.valueMap = {};

    var tolist = arguments[1];
    // Secondary API?
    if( tolist instanceof Array ) {
	if( tolist == null )
	    tolist = ['toStr'];
	var self = this;
	var mkto = function (idx) {
	    return function (num) { return self.nameMap[num][idx] || sprintf("%s#%d", self.enumName, num); }
	}
	for( var i=0; i<tolist.length; i++ ) {
	    this[tolist[i]] = mkto(i);
	}
	var num = 0;
	for( var i=2; i<arguments.length; i++ ) {
	    var ai = arguments[i];
	    if( typeof(ai)==='number' ) {
		num = ai;
	    } else {
		if( ai instanceof Array ) {
		} else {
		    ai = [ai];
		}
		this.nameMap[num] = ai;
		this.valueMap[ai] = num;
		if( this[ai[0]] == null )
		    this[ai[0]] = num;
		num++;
	    }
	}
	return;
    }
	
    var num = 0;
    for( var i=1; i<arguments.length; i++ ) {
	var ai = arguments[i];
	if( typeof(ai)==='number' ) {
	    num = ai;
	} else {
//XXX:?:needed?	    this.memberNames.push(ai);
//XXX:?:needed?	    this.memberValues.push(num);
	    this.nameMap[num] = ai;
	    this.valueMap[ai] = num;
	    if( this[ai] == null )
		this[ai] = num;
	    num++;
	}
    }

    /**
    * Convert a number to a enumeration member name.
    * @param num     An integer number.
    * @returns {String} member name. If there is no name for the number
    *    then return the enumeration name concatenated with '#' and the number.
    */
    this.toStr = function (/**Number*/num) {
	return this.nameMap[num] || sprintf("%s#%d", this.enumName, num);
    };

    /**
    * Convert an enumeration member name to its value.
    * @param str     A member name.
    * @returns {Number} The value of the member name.
    * @exception if str does not denote a valid member name.
    */
    this.toNum = function (/**String*/str) {
	var s = this.valueMap[str];
	if( s == null )
	    throw sprintf("ENUM<%s>: No such member: %s", this.enumName, str);
	return s;
    };
};























/**
 * Create copy of array or copy into a specified destination array.
 * @param src     Source array
 * @param srcoff  If 'undefined', 0 is used
 * @param cnt     If 'undefined', length of source aray is used
 * @param dst     If 'undefined', a new destination array is created
 * @param dstoff  If 'undefined', 0 is used
 * @returns {Array} destination array
*/
function arraycopy(/** Array */src, /** Number */srcoff, /** Number */cnt, /** Array */dst, /**Number */dstoff) {
    assert(src);
    if (srcoff===undefined) { srcoff = 0; }
    if (cnt===undefined) { cnt = src.length; }
    if (dst===undefined) { dst = []; }
    if (dstoff===undefined) { dstoff = 0; }
    for (var i = 0; i < cnt; i++) {
	dst[dstoff+i] = src[srcoff+i];
    }
    return dst;
}


/**
 * Return whether o points to an array.
 * @param a
 * @returns {Boolean}
 */
function isArray(o) {
    return Object.prototype.toString.call(o) === '[object Array]';
}


/**
 * Extend the builtin RegExp class.
 * @class
 */
RegExp = RegExp;

/**
 * Escape a string to be used in a regex.
 * @param {String} text
 * @returns {String} String
 * @static
 */
RegExp.escape = function(/** String */text) {
   if (!arguments.callee.sRE) {
      var specials = [
	 '/', '.', '*', '+', '?', '|',
	 '(', ')', '[', ']', '{', '}', '\\'
      ];
      arguments.callee.sRE = new RegExp(
	 '(\\' + specials.join('|\\') + ')', 'g'
      );
   }
   return text.replace(arguments.callee.sRE, '\\$1');
};











/**
 * Provides utility classes.
 * @namespace 
 */
var Util = {};



/**
 * @see Blob
 */
Util.Blob = Blob;





/**
* Convert an integer number representing nano seconds
* since simulation start into a human readable format.
* @param nanos  Nanoseconds
* @returns {String} the converted time
*/
Util.nanos2str = function (/** Number */nanos) {
   return sprintf("%02d:%02u:%02u.%03u'%03u'%03u",
		  ( nanos/(3600*1000000000)%  24)|0,
		  ( nanos/(  60*1000000000)%  60)|0,
		  ((nanos/      1000000000)%  60)|0,
		  ((nanos/         1000000)%1000)|0,
		  ((nanos/            1000)%1000)|0,
		  ( nanos                  %1000)|0);
};



/**
* Convert an integer number representing micro seconds
* into a human readable format.
* @param micros     Microseconds
* @returns {String} the converted time
*/
Util.micros2str = function (/** Number */micros) {
   return sprintf("%02d:%02u:%02u.%03u'%03u",
		  ( micros/(3600*1000000)%  24)|0,
		  ( micros/(  60*1000000)%  60)|0,
		  ((micros/      1000000)%  60)|0,
		  ((micros/         1000)%1000)|0,
		  ( micros               %1000)|0);
};


/**
* Parse string representing micros to number
* @param str String
* @returns {Number} the converted time
*/
Util.str2micros = function (/** String */str) {
    //          1      3      5       7      9
    var re = /(\d+)(:(\d+)(:(\d+)(\.(\d+)(\'(\d+))?)?)?)?/;
    var md = re.exec(str);
    if (!md) {
        throw "Invalid time format string: " + str;
    }
    var hours = parseInt(md[1]);
    var mins = md[3] ? parseInt(md[3]) : 0;
    if (mins<0||mins>=60) {
        throw "Invalid minutes specification: " + md[3];
    }
    var secs = md[5] ? parseInt(md[5]) : 0;
    if (secs<0||secs>=60) {
        throw "Invalid seconds specification: " + md[5];
    }
    var millis = md[7] ? parseInt(md[7]) : 0;
    if (millis<0||millis>=1000) {
        throw "Invalid milliseconds specification: " + md[7];
    }
    var micros = md[9] ? parseInt(md[9]) : 0;
    if (micros<0||micros>=1000) {
        throw "Invalid miscroseconds specification: " + md[9];
    }
    //QUACK(0, "DATE: " + hours + ", " + mins + ", " + secs + ", " + millis + ", " + micros);
    var date = new Date(0);
    date.setHours(hours);
    date.setMinutes(mins);
    date.setSeconds(secs);
    date.setMilliseconds(millis);
    var time = date.getTime();
    micros = time * 1000 + micros;
    return micros;
};






/** 
 * Date utility functions.
 * @class 
 */
Util.Date = {
    /** Formats the passed date according to the supplied pattern.  The tokens that are substituted in the pattern are as follows:
<pre>
    yyyy: 4-digit year
    yy:   2-digit year
    MMMM: full name of the month
    MMM:  abbreviated name of the month
    MM:   month number as a 0-filled
    M:    month number
    dd:   day in the month as a 0-filled
    d:    day in the month
    a:    AM or PM
    HH:   24-hour clock hour in the day, 0-filled field
    H:    24-hour clock hour in the day
    hh:   12-hour clock hour in the day, 0-filled field
    h:    12-hour clock hour in the day
    mm:   minutes in the hour, 0-filled field
    m:    minutes in the hour
    ss:   seconds in the minute, 0-filled field
    s:    seconds in the minute
    S:    milliseconds in the second, 0-filled 3 digit field
    SSS:  milliseconds in the second, 0-filled field
    UUU:  microseconds in the second, 0-filled field (separately supplied)
</pre>
     *  @param date The date to be formatted.
     *  @param pattern The pattern to format the date into. Any characters not matching pattern tokens are copied as-is to the result.
     *  @returns {String} The formatted date.
     */
    format: function(/** Date */ date, /** String */ pattern, /** Number */micros) {
	var result = [];
	while (pattern.length > 0) {
	    this.patternParts.lastIndex = 0;
	    var matched = this.patternParts.exec(pattern);
	    if (matched) {
		if( matched[0]=='UUU' ) {
		    result.push(this.patternValue.UUU.call(this,micros));
		} else {
		    result.push(this.patternValue[matched[0]].call(this,date));
		}
		pattern = pattern.slice(matched[0].length);
	    } else {
		result.push(pattern.charAt(0));
		pattern = pattern.slice(1);
	    }
	}

	return result.join('');
    },


    /** 
     * @private 
     */
    toFixedWidth: function(value, length, fill) {
	var result = value.toString();
	var padding = length-result.length;
	fill = fill || '0';

	if (padding < 0)
	    result = result.substr(-padding);
	else {
	    for (var n = 0; n < padding; n++)
		result = fill + result;
	}

	return result;
    },


    /** @private */ patternParts: /^(yy(yy)?|M(M(M(M)?)?)?|d(d)?|EEE(E)?|a|H(H)?|h(h)?|m(m)?|s(s)?|S(SS)?|UUU)/,
    /** @private */ monthNames:   [ 'January','February','March','April','May','June','July', 'August','September','October','November','December' ],
    /** @private */ dayNames:     [ 'Sunday','Monday','Tuesday','Wednesday','Thursday','Friday', 'Saturday' ],
    /** @private */ patternValue: {
    /** @private */	yy:   function(date) { return this.toFixedWidth(date.getFullYear(), 2); },
    /** @private */	yyyy: function(date) { return date.getFullYear().toString(); },
    /** @private */	MMMM: function(date) { return this.monthNames[date.getMonth()]; },
    /** @private */	MMM:  function(date) { return this.monthNames[date.getMonth()].substr(0, 3); },
    /** @private */	MM:   function(date) { return this.toFixedWidth(date.getMonth()+1, 2); },
    /** @private */	M:    function(date) { return date.getMonth()+1; },
    /** @private */	dd:   function(date) { return this.toFixedWidth(date.getDate(), 2); },
    /** @private */	d:    function(date) { return date.getDate(); },
    /** @private */	EEEE: function(date) { return this.dayNames[date.getDay()]; },
    /** @private */	EEE:  function(date) { return this.dayNames[date.getDay()].substr(0, 3); },
    /** @private */	HH:   function(date) { return this.toFixedWidth(date.getHours(), 2); },
    /** @private */	H:    function(date) { return date.getHours(); },
    /** @private */	hh:   function(date) { var hours = date.getHours();
					       return this.toFixedWidth((hours > 12) ? hours-12 : hours, 2); },
    /** @private */	h:    function(date) { return date.getHours()%12; },
    /** @private */	mm:   function(date) { return this.toFixedWidth(date.getMinutes(), 2); },
    /** @private */	m:    function(date) { return date.getMinutes(); },
    /** @private */	ss:   function(date) { return this.toFixedWidth(date.getSeconds(), 2); },
    /** @private */	s:    function(date) { return date.getSeconds(); },
    /** @private */	S:    function(date) { return this.toFixedWidth(date.getMilliseconds(), 3); },
    /** @private */   SSS:    function(date) { return this.toFixedWidth(date.getMilliseconds(), 3); },
    /** @private */   UUU:  function(micros) { return this.toFixedWidth(micros, 3); },
    /** @private */	a:    function(date) { return date.getHours() < 12 ? 'AM' : 'PM'; }
		    }
};

























/**
 * Aux data for formatData
 * @private
 */
Util.FMT = {};

/**
 * Aux data for formatData
 * @private
 */
Util.FMT.regularAttributeRegExp = /^[a-zA-Z_]\w*$/;

/**
 * * Aux data for formatData
 * @private
  */
Util.FMT.indentPad = "                                        ";

/**
 * Aux data for formatData
 * @private
 */
Util.FMT.quoteJSstring = /[\'\\\u0000-\u001F\u007F-\uFFFF]/g;

/**
 * Aux data for formatData
 * @private
 */
Util.FMT.defaultIndent = 4;



/**
* Return a string of non-recursive data structures in formatted form.
* @param obj The object to format.
* @param indent The indent level
* @param pos  Optional
* @returns {String} formatted form
*/
Util.formatData = function (/** Object */obj, /** Number */indent, /** Number */pos,/**Object*/ocache) {
    var checkCache = function (obj, ocache) {
	for( var i=0; i<ocache.length; i++ ) {
	    if( ocache[i] === obj )
		return true;
	}
	ocache.push(obj);
	return false;
    }

    if( pos===undefined )
	pos = 0;
    if( indent===undefined )
	indent = Util.FMT.defaultIndent;
    
    if( obj===undefined )
        return 'undefined';
    if( obj===null )
        return 'null';
    
    var to = typeof(obj);
    
    if( to=='string' ) {
	return "'"+obj.replace(Util.FMT.quoteJSstring, function (match, p1, p2, offset, str) {
				   var code = match.charCodeAt(0);
				   return "\\u"+
				       "0123456789ABCDEF".charAt((code>>12)&0xF)+
				       "0123456789ABCDEF".charAt((code>> 8)&0xF)+
				       "0123456789ABCDEF".charAt((code>> 4)&0xF)+
				       "0123456789ABCDEF".charAt( code     &0xF);
			       })+"'";
    }
    
    if( to=='number' ) {
	return obj;
    }
    
    if( to=='boolean' ) {
	return obj;
    }
    
    if( to=='function' ) {
	return 'function(){}';
    }
    
    if( to=='object' ) {
	if( obj instanceof Number ) {
	    return obj;
	}
	var pad = '';
	var ind = '';
	var nl = '';

	if( indent ) {
	    if( pos+indent > Util.FMT.indentPad.length )
		Util.FMT.indentPad += Util.FMT.indentPad;
	    pad = Util.FMT.indentPad.substring(0,pos+indent);
	    ind = Util.FMT.indentPad.substring(0,indent-1);
	    nl = "\r\n";
	}
	if( !pos )
	    pos = 0;

	var a,d,t;
	if( obj instanceof Array ) {
	    if( ocache == undefined )
		ocache = [];
	    if( checkCache(obj, ocache) === true )
		return "..."; 
	    var len = obj.length;
	    t = '[';
	    d = '';
	    for(var i=0; i<len; i++ ) {
		t += d+nl+pad+Util.formatData(obj[i],indent,pos+indent,ocache);
		d = ',';
	    }
	    return t+']';
	}
	if( obj instanceof Object ) {
	    if( ocache == undefined )
		ocache = [];
	    if( checkCache(obj, ocache) === true )
		return "..."; 
	    t = '{';
	    d = '';
	    for( a in obj ) {
		t += d+nl+pad;
		if( Util.FMT.regularAttributeRegExp.test(a) )
		    t += a;
		else
		    t += Util.formatData(a.toString());
		t += ':' + Util.formatData(obj[a],indent,pos+indent,ocache);
		d = ',';
	    }
	    return t+'}';
	}
    }
    throw "Illegal type of object: "+to;
};


/**
* Like formatData, but uses SPACE instead of newline.
* @param obj The object to format.
* @param indent The indent level
* @param pos  Optional
* @returns {String} formatted form
*/
Util.formatData2 = function (/** Object */obj, /** Number */indent, /** Number */pos) {
    return Util.formatData(obj, indent, pos).replace(/(\r\n|\n|\r)/gm, "").replace(/(\s\s+)/gm, " ");
};

/**
 * @type String
 * @private
 */
Util.SPACES = null;

/**
 * @returns {String} consisting of 'cnt' spaces
 */
Util.getSpaces = function(cnt) {
    assert(cnt < 16384);
    if (!Util.SPACES) {
        Util.SPACES = Util.multiplyString(" ", 16384);
    }
    return Util.SPACES.substr(0, cnt);
};


/**
 * @param str   The string
 * @param cnt  
 * @returns {String} input string concatenated cnt times
 */
Util.multiplyString = function(/** String */str, /** Number */cnt) {
    var sa = [];
    for (var i = 0; i < cnt; i++) {
        sa.push(str);
    }
    return sa.join("");
};



/**
 * Split a command line where parameters and arguments may be quoted.
 * @param s
 * @returns {String[]}
 */
Util.splitCommandLine = function(/** String */s) {
    /** @ignore */
    var isWhitespace = function(c) {
	return (c === ' ' || c === '\t' || c === '\r' || c === '\n');
    };
    /** @ignore */
    var mapBackslashed = function(c) {
	if (c === 'n') {
	    return "\n";
	} else if (c === 't') {
	    return "\t";
	} else if (c === 'r') {
	    return "\r";
	} else if (c === '\\') {
	    return "\\";
	} else if (c === '"') {
	    return "\"";
	} else if (c === '\'') {
	    return "'";
	} else {
	    return "\\" + c;
	}
    };
    var CMD_SEP = ';';
    var pos = 0;
    var SKIP_SPACE = 1;
    var START_ARG = 2;
    var mode = SKIP_SPACE;
    var argv = [];
    var arg = null;
    var c;
    while(pos < s.length) {
	if (mode === SKIP_SPACE) {
	    for (; pos < s.length; pos++) {
	        c = s.charAt(pos);
                if (c === CMD_SEP) {
                    argv.push(CMD_SEP);
                    continue;
                }
	        if (!isWhitespace(c)) { 
		    mode = START_ARG;
		    break;
	        }
	    }
	} else {
	    if (arg === null) { arg = ""; }
	    c = s.charAt(pos);
	    if (c === '"' || c === "'") {
		var sep = c, prev = c;
		pos += 1;
		for (; pos < s.length; pos++) {
		    c = s.charAt(pos);
		    if (prev !== "\\" && c === sep) {
			argv.push(arg);
			arg = null;
			pos += 1;
			mode = SKIP_SPACE;
			break;
		    }
		    if (prev === "\\") {
			arg += mapBackslashed(c); c=0;
		    } else {
			if (c !== "\\") { arg += c; }
		    }
		    prev = c;
		}
		if (mode == START_ARG) { throw sprintf("Separator '%s' not closed", sep); }
	    } else {
		var prev = ' ';
		for (; pos < s.length; pos++) {
		    c = s.charAt(pos);
		    if ((prev !== "\\") && (isWhitespace(c) || (c === CMD_SEP))) { 
			argv.push(arg);
                        if (c === CMD_SEP) {
			    argv.push(CMD_SEP);
			    pos += 1;
                        }
			arg = null;
			mode = SKIP_SPACE;
			break;
		    }
		    if (prev === "\\") {
			arg += mapBackslashed(c); c=0;
		    } else {
			if (c !== "\\") { arg += c; }
		    }
		    prev = c;
		}
	    }
	}
    }
    if (arg != null) {
	argv.push(arg);
    }
    return argv;
};



//=====================================================================================================
//
// Formatter
//
//=====================================================================================================
/**
 * Util.Formatter provides functions for formatting/handling binary data.
 * @class
 */
Util.Formatter = {
    /**
     * <pre>
     * Pack array to binary string.
     * Syntax of one format specifier:
     *    ?
     *    [NUM] FMT [ENDIAN]
     *
     * ?        - pack (ignored),unpack: return byte position in data string
     *
     * NUM
     *   {0-9}* - size of this element
     *   *      - length of rest of data string, pack: length of input element (string)
     *   <      - preceding element is size for this element (must be Number)
     * FMT:
     *   s|u    - signed|unsigned int (NUM defaults to 1)
     *   S|U    - signed|unsigned int (NUM defaults to 2)
     *   d      - binary data of length NUM
     *   x      - binary data of length NUM extracted as hex string
     *   f      - float value will be encoded as IEEE 754 float 32-bit single precission
     * ENDIAN:
     *   B      - big endian (default)
     *   L      - little endian
     * </pre>
     *
     * @param fmtstr    Format
     * @param args      Array, if !Array, function arguments are taken as parameters to fmtstr
     * @returns {String} binary string
     * @static
    */
    pack: function(/** String */fmtstr, /** Array */args) {
	if( typeof(args)!='object' || !(args instanceof Array) ) {
	    args = arraycopy(arguments, 1);
	}
        var ret = this._pack(fmtstr, args);
        return ret[1];
    },


    /**
     * Unpack a binary string to an array.
     * @see Util.Formatter#pack
     * @param fmtstr    format
     * @param datastr   binary string
     * @param pos       optional, index into datastr
     * @returns {Object[]} Array of unpacked items
     */
    unpack: function (/** String */fmtstr, /** String */datastr, /** Number */dpos) {
	var flen = fmtstr.length;
	var fpos = 0;
	var dlen = datastr.length;
	var ary = [];

	if( dpos==undefined )
	    dpos = 0;
	while( fpos < flen ) {
	    var signed, bigend=true;
	    var c, d, n;

	    if( (c = fmtstr.charAt(fpos++)) == '?' ) {
		ary.push(dpos);
		continue;
	    }
	    if( c == '*' ) {
		n = dlen-dpos;
		c = -1;
	    }
	    else if( c == '<' ) {
		if( ary.length==0 )
		    throw new Exception("Illegal format element '<' - not preceeding element");
		n = ary[ary.length-1];
		if( typeof(n) != 'number' && (typeof(n) != 'object' || !(n instanceof Number)) )
		    throw new Exception("Preceeding element is not a number");
		c = -1;
	    }
	    else if( c >= '0' && c <= '9' ) {
		n = 0;
		do {
		    n = n*10 + parseInt(c);
		} while( (c=fmtstr.charAt(fpos++)) >= '0' && c <= '9' );
	    }
	    else {
		n = (c=='U' || c=='S') ? 2 : (c=='f')? 4 : 1;
	    }
	    if( c < 0 )
		c = fmtstr.charAt(fpos++);

	    if( dpos + n > dlen )
		throw new Exception("Not enough binary data");

	    if( (d=fmtstr.charAt(fpos))=='B' || d=='L' ) {
		bigend = (d=='B');
		//println(bigend);
		fpos++;
	    }
	    if( c=='d' || c=='x' || c=='E' || c=='f') {
		//println(n);
		d = datastr.substr(dpos,n);
		if( !bigend )
		    d = reverseString(d);
		if( c=='x' || c=='E' )
		    d = Util.Formatter.binToHex(d,0,n);
		if( c=='E' )
		    d = Util.UUID.hex2eui64(d);
		if( c=='f' )
		    d = Util.Formatter.hex2Float(d);
		ary.push(d);
	    } else {
		signed = (c=='s' || c=='S');
		var value;
		if( bigend ) {
		    value = datastr.charCodeAt(dpos) & 0xFF;
		    if( signed && value >= 128 )
			value = -1 * 256 + value;
		    for( var di=1; di<n; di++ )
			value = value*256 + (datastr.charCodeAt(dpos+di) & 0xFF);
		} else {
		    value = datastr.charCodeAt(dpos+n-1) & 0xFF;
		    if( signed && value >= 128 )
			value = -1 * 256 + value;
		    for( var di=n-2; di>=0; di-- )
			value = value*256 + (datastr.charCodeAt(dpos+di) & 0xFF);
		}
		ary.push(value);
	    }
	    dpos += n;
	}
	return ary;
    },

    float2Hex: function (fval) {
	// we perform operations on binary strings ...
	var bin  = fval.toString(2);
	var v10  = parseFloat(bin);
	//println(fval);
	//println(v10);
	var binStr = v10.toString();
	//println(binStr);

	// compute the exponent
	var comma = binStr.indexOf("."); 
	//println(comma);
	var one   = binStr.indexOf("1"); 
	//println(one);
	if (one == 0)
	    var exp = comma - one - 1;
	else
	    var exp = comma - one;
	//println(exp);
	var bexp = 0x7F + exp;
	//printf("Biased exponent [bits:23-30] = %02X\n", bexp);

	// compute the mantissa
	var tmp = binStr.replace(".","");
	if (one != 0)
	    var mant = tmp.substr(one);
	else
	    var mant = tmp.substr(1);
	//println(mant);
	while(mant.length<23)
	    mant += "0";
	//println(mant);
	var mantissa = parseInt(mant,2);
	//printf("Mantissa        [bits:0-22]  = %08X\n", mantissa);
	var sign = (fval<0)? 1:0;
	//printf("Sign            [bits:31]    = %01X\n", sign);
	var encoded = (sign<<31) | (bexp<<23) | mantissa;
	//printf("Encoded result: %04X\n", encoded);
	return Util.Formatter.pack("4uB",encoded);
    },

    /*
     * IEEE 754 floating-point single precission (32-bits)
     * standard format 
     * ----------------------------------------
     * 0-22  fraction ( must be interpreted as 1.f)
     * 23-30 base 2 exponent (including sign) 
     * 31    sign (-1/1)
     * ----------------------------------------
     * @param hexLongArray   a string-encoded array of bytes, interpretted as big-endian
     * @returns Float        value = sign * fraction * 2^exponent
     */
    hex2Float: function (hexLongArray) {
	// var end = (bigend==true)? "B":"L";
	// var format = "4u"+end;
	var format = "4uB"
	//println(format);
	//printf("%H\n",hexLongArray);
	var a = Formatter.unpack(format,hexLongArray);
	var hex = a[0];
	var fra = ((hex & 0x7FFFFF)|0x800000)/ parseFloat(0x800000);
	var exp = ((hex >> 23) & 0xFF) - 127;
	var sig = (((hex >> 31) & 0x1)==1)? -1:1;
	var f = sig * fra * Math.pow(2,exp);
	//printf("%08X: %d * %f * 2^ %d --> %f\n", hex, sig, fra, exp, f);
	return f;
    },

    /**
     * Unpack a binary string to an object.
     * <p>
     * Example:
     *   Formatter.unpackObj("0123",0,"a","1u","b","3u")
     * @see Util.Formatter#pack
     * @param data      binary string
     * @param pos       index into data
     * @param args..    sequence of arguments specifying field name and format of element.
     * @returns Object with the specified fields and their parsed values.
     */
    unpackObj: function (/** String */data, /** Number */pos) {
	var fmts = [];
	var names = [];
	if (isArray(arguments[2])) {
	    var arr = arguments[2];
	    for( var i=0; i<arr.length; i+=2 ) {
		names.push(arr[i]);
		fmts.push(arr[i+1]);
	    }
	} else {
	    for( var i=2; i<arguments.length; i+=2 ) {
		names.push(arguments[i]);
		fmts.push(arguments[i+1]);
	    }
	}
	var a = Formatter.unpack(fmts.join(''), data, pos||0);
	var o = {};
	for( var i=0; i<names.length; i++ ) 
	    o[names[i]] = a[i];
	return o;
    },


    /**
     * Unpack a binary string to a given object.
     * <p>
     * Example:
     *   Formatter.unpackObj2(obj, "0123",0,"a","1u","b","3u")
     * @see Util.Formatter#pack
     * @param data      binary string
     * @param pos       index into data
     * @param args..    sequence of arguments specifying field name and format of element.
     * @returns {Object} input object
     */
    unpackObj2: function (/** Object */obj,/** String */data,/** Number */pos) {
	var fmts = [];
	var names = [];
	for( var i=3; i<arguments.length; i+=2 ) {
	    names.push(arguments[i]);
	    fmts.push(arguments[i+1]);
	}
	var a = Formatter.unpack(fmts.join(''), data, pos||0);
	for (var i=0; i<names.length; i++) {
	    if (names[i] != null) {
		if (obj[names[i]]===undefined) {
		    throw new Exception("Object has no defined property:"+names[i]); 
		}
 	    }
	    obj[names[i]] = a[i];
	}
	return obj;
    },

    /**
     * Method shared between pack and transcode.
     * @param fmtstr    Format
     * @param args      Array, if !Array, function arguments are taken as parameters to fmtstr
     * @returns {Array} with position in args where pack ended and created binary string
     * @private
     */
    _pack: function(/** String */fmtstr, /** Array */ary) {
	var flen = fmtstr.length;
	var fpos = 0;
	var apos = 0;
	var binary = [];
	var args = ary;
       
	if( typeof(args)!='object' || !(args instanceof Array) ) {
	    args = arguments;
	    apos = 1; // skip first arg (format string)
	}

	while( fpos < flen ) {
	    var signed, bigend=true;
	    var d, c, n, star=false;

	    if( (c = fmtstr.charAt(fpos++)) == '?' )
		continue;

	    if( apos >= args.length )
		throw new Exception("Not enough data elements");

	    if( c == '*' ) {
		n = args[apos].length;
		c = -1;
		star = true;
	    }
	    else if( c == '<' ) {
		if( apos==0 )
		    throw new Exception("Illegal format element '<' - not preceeding element");
		n = args[apos-1];
		if( typeof(n) != 'number' && (typeof(n) != 'object' || !(n instanceof Number)) )
		    throw new Exception("Preceeding element is not a number");
		c = -1;
	    }
	    else if( c >= '0' && c <= '9' ) {
		n = 0;
		do {
		    n = n*10 + parseInt(c);
		} while( (c = fmtstr.charAt(fpos++)) >= '0' && c <= '9' );
	    }
	    else {
		n = (c=='U' || c=='S') ? 2 : (c=='f')? 4 : 1;
	    }
	    if( c < 0 )
		c = fmtstr.charAt(fpos++);
	    if( (d=fmtstr.charAt(fpos))=='B' || d=='L' ) {
		bigend = (d=='B');
		fpos++;
	    }
	    var value = args[apos++];
	    if( c=='d' || c=='x' || c=='E') {
		var blen = binary.length;
		if( typeof(value)!='string' && (typeof(value)!='object' || !(value instanceof String)) )
		    throw new Exception("Data element is not a string");
		if( c=='E' ) {
		    value = Util.UUID.eui642hex(value);
		    c = 'x';
		}
		if( c=='x' ) {
		    var dlen = value.length;
		    if( !/([0-9A-Fa-f]{2})+/.test(value) )
			throw new Exception("Malformed hexdigit string");
		    if( star )
			n = (n/2)|0;
		    if( dlen > 2*n )
			dlen = 2*n;
		    if( bigend ) {
			for( var di=0; di<dlen; di+=2 )
			    binary.push(String.fromCharCode(parseInt(value.substr(di,2),16)));
			if( dlen < 2*n ) {
			    for( var di=dlen/2; di<n; di++ )
				binary.push('\u0000');
			}
		    } else {
			if( dlen < 2*n ) {
			    for( var di=dlen/2; di<n; di++ )
				binary.push('\u0000');
			}
			for( var di=dlen-2; di>=0; di-=2 )
			    binary.push(String.fromCharCode(parseInt(value.substr(di,2),16)));
		    }
		} else {
		    if( value.length != n ) {
			// Not required length - truncate/pad
			if( value.length > n ) {
			    binary.push(value.substring(0,n));
			} else {
			    binary.push(value);
			    for( var di=value.length; di<n; di++ )
				binary.push('\u0000');
			}
		    } else {
			binary.push(value);
		    }
		}
	    } else {
		if( typeof(value)!='number' && (typeof(value)!='object' || !(value instanceof Number)) )
		    throw new Exception("Data element is not a number");
		if ( c=='f' ) {
		    var hex = Util.Formatter.float2Hex(value);
		    println(bigend);
		    if (!bigend)
			hex = reverseString(hex);
		    binary.push(hex);
		    continue;
		}
		if( bigend ) {
		    var sf = Math.pow(2, (n-1)*8);
		    for( var di=n-1; di>=0; di-- ) {
			binary.push(String.fromCharCode((value/sf)&0xFF));
			sf /= 0x100;
		    }
		} else {
		    for( var di=0; di<n; di++ ) {
			binary.push(String.fromCharCode(value&0xFF));
			value /= 0x100;
		    }
		}
	    }
	}
	return [ apos, binary.join('') ];
    },


   

    /**
    * Return hex representation of number with 'dgts' digits.
    * @param num    Number to convert
    * @param dgts   Number of digits to convert
    * @returns {String} hexadecimal string
     * @static
    */
    numToHex: function(/** Number */num, /** Number */dgts) {
	var s = '';
	while( --dgts >= 0 ) {
	    s = "0123456789ABCDEF".charAt(num&0xF)+s;
	    num /= 16;
	}
	return s;
    },


    /**
     * Convert binary string to hex representation.
     * @param datastr binary data to be converted to ASCII hex
     * @param from    optional - start at this character (default 0)
     * @param len     optional - convert that many chars (default rest of string)
     * @return {String} string with sequence of ASCII hex characters.
     * @static
     */
    binToHex: function(/** String */datastr, /** Number */from, /** Number */len) {
	if( from==undefined ) from = 0;
	var end = len==undefined ? datastr.length : from+len;
	var s = new Array(2*(end-from));
	var alpha = "0123456789ABCDEF";
	for( var di=from; di<end; di++ ) {
	    var v = datastr.charCodeAt(di);
	    s.push(alpha.charAt((v>>4)&0xF));  // push is faster than append
	    s.push(alpha.charAt(v&0xF));
	}
	return s.join('');
    },


    /**
     * Convert string in hex notation to number.
     * @param s string in hex notation
     * @returns {Number} number
     * @static
     */
    hexToNum: function(s) {
	s = s.toUpperCase();
	var v =  0;
        var ccA = 'A'.charCodeAt(0);
        var ccF = 'F'.charCodeAt(0);
        var cc0 = '0'.charCodeAt(0);
        var cc9 = '9'.charCodeAt(0);

	for (var i = 0; i < s.length; i++) {
	    var c = s.charCodeAt(i);
	    if (c >= cc0 && c <= cc9) {
		v += (c-cc0)  + (v<<8);
	    } else if (c>= ccA && c <= ccF) {
		v += (c-ccA)  + (v<<8);
	    } else {
		assert(0, "Invalid parameter");
	    }
	}
	return v;
    },


    /**
     * Generate a table for given binary string with rows of format 'offset': raw bytes...' 'ascii characters...'
     * @param s            Binary string
     * @param indent       Indent, optiona, default 0
     * @param cnt2row      Number of bytes per row
     * @param skipAscii    Skip printable characters section
     * @returns {String[]} generated rows
     * @static
     */
    genHexTable: function(/** String */s, /** Number */indent, /** Number */cnt2row, /** Boolean */skipAscii) {
	if (!indent) { indent=0; }
	if (!cnt2row) { cnt2row = 16; }
	if (skipAscii===undefined) { skipAscii = false; }
	var digits = "0123456789ABCDEF";
	var addrlen = s.length >= 256 ? 4 : 2;
	var ret = [];
	var i, j;
	for (i = 0; i < s.length; i += cnt2row) {
	    var arr = [];
	    arr.push(sprintf("%*s%0*X: ", indent, "", addrlen, i));
	    var ascii = [];
	    for (j = 0; j < cnt2row; j++) {
		var k = i+j;
		if (k>=s.length) {
		    arr.push(sprintf("%*s", (cnt2row-j)*3, ""));
		    break;
		}
		var n = s.charCodeAt(k);
		arr.push(sprintf("%02X ",n));
                if (!skipAscii) {
		    ascii.push((n>=32&&n<=126) ? String.fromCharCode(n) : '.');
                }
	    }
	    ret.push(arr.join('') + ascii.join(''));
	}
	return ret;
    },


    /**
     * Convert hex representation to binary string.
     * @param s Hexadecimal string
     * @returns {String} binary string
     * @static
    */
    hexToBin: function(s) {
	var cca = 'a'.charCodeAt(0);
	var ccA = 'A'.charCodeAt(0);
	var ccf = 'f'.charCodeAt(0);
	var ccF = 'F'.charCodeAt(0);
	var cc0 = '0'.charCodeAt(0);
	var cc9 = '9'.charCodeAt(0);
	var h2b = function(s, i) {
	    var c = s.charCodeAt(i);
	    if (c >= cc0 && c <= cc9) {
		return (c-cc0);
	    } else if (c >= cca && c <= ccf) {
		return (c-cca+10);
	    } else if (c >= ccA && c <= ccF) {
		return (c-ccA+10);
	    }
	    throw new Exception("Invalid character " + c);
	};
	var bytes = [];
	if (s.length%2 != 0) {
	    throw new Exception("Invalid hex-string input length " + s.length);
	}
	for (var i = 0; i < s.length; i += 2) {
	    var b = (h2b(s,i)<<4) + h2b(s,i+1);
	    bytes.push(String.fromCharCode(b));
	}
	return bytes.join('');
    },


    /**
    * Convert a binary string to ascii where each non-printable character is represented by a '.'
    * @param s Binary string
    * @returns {String} ascii string
     * @static
    */
    binToPrintable: function(/** String */s) {
	var arr = [];
	for (var i = 0; i < s.length; i++) {
	    var b = s.charCodeAt(i)&0xff;
	    if (b>=32&&b<=126) {
		arr.push(String.fromCharCode(b));
	    } else {
		arr.push('.');
	    }
	}
	return arr.join('');
    },



    /**
     * <pre>
     * Convert parameter string to binary string. String is a sequence of hexadecimal characters,
     * ascii characters and control characters |, (, # and ). Until a first control characters
     * is hit, characters are interpreted as hexadecimal characters and converted to
     * binary representation. The control characters are:
     * |:      toggles interpretation between ascii and hex mode. in ascii mode, the ascii codes of
     *         characters are added to the output string. use \ to escape \,|,(,),# in ascii mode.
     * (...):  parentheses allows to include a format string and parameters as described in pack()
     *         example: (u1u1:255,10). Parameters to the format string may appear in the () expression
     *         or are otherwise taken from the arguments from the pack invocation.
     * #(...): the number of bytes of the expression in parentheses is inserted at the position of #
     *         in the target string.
     * Examples:
     * Formatter.transcode("(1u1u:7,9)(1u1u)", 254, 253);
     * Formatter.transcode("#(010203)");
     * Formatter.transcode("000300|||aaaa");
     * </pre>
     *
     * @param fmt  format string
     * @param argv parameters for format string
     * @returns {String} binary string
     * @static
     */
    transcode: function(/** String */fmt, /** Array */argv) {
       if (argv == undefined || argv == null) {
          argv = [];
       } else if (!(argv instanceof Array)) {
          argv = arraycopy(arguments, 1);
       } else {
          argv = arraycopy(argv);
       }

       var len = fmt.length;
       var bin = [];
       var pos = 0;
       var ascii = false;
       var apos = 0;
       var lengthStack = [];   // stack of positions into bin were to add length for #{}
       while(pos < len) {
          var c = fmt.charAt(pos);
          if (ascii) {
             switch(c) {
              case '\\': {
        	 if (pos+2>len) {
        	    throw new Exception("Invalid \\ at position " + pos);
        	 }
        	 c = fmt.charAt(pos+1);
        	 if ((c!='\\') && (c!='#') && (c!='(') && (c!=')') && (c!='|')) {
        	    throw new Exception("Invalid character escape for '" + c + "' at position: " + pos);
        	 }
        	 bin.push(c);
        	 pos += 2;
        	 continue;
              }
              case '(':
              case ')':
              case '#':
              case '|':
        	break;
             default:
        	bin.push(c);
        	pos += 1;
        	continue;
             }
          }
          switch(c) {
           case '(': {
              var start = pos+1;
              var end = start;
              while(fmt.charAt(end) != ')') {
        	 if (end >= len) {
        	    throw new Exception("( without closing ) at position: " + pos);
        	 }
        	 end += 1;
              }
              var paras = fmt.substring(start, end).split(/[:,]/);
              if (paras.length==0) {
        	 throw new Exception("() without format specification at position: " + pos);
              }
              var _fmt = paras.shift();
              for (var i = 0; i < paras.length; i++) {
                 paras[i] = parseInt(paras[i]);
                 if (isNaN(paras[i])) {
                    throw new Exception("Invalid number parameter position: " + pos);
                 }
              }
              argv = paras.concat(argv);
              var ret = Util.Formatter._pack(_fmt, argv);
              apos = ret[0];
              argv = argv.slice(apos);
              bin.push(ret[1]);
              pos = end+1;
              break;
           }
           case '#': {
              if (pos+2>=len || fmt.charAt(pos+1)!='(') {
        	 throw new Exception("# without following ) at position: " + pos);
              }
              pos += 2;
              lengthStack.unshift(bin.length);
              bin.push(String.fromCharCode(-1)); // placeholder
              break;
           }
           case ')': {
              var binIdx = lengthStack.shift();
              if (binIdx==undefined) {
        	 throw new Exception(") without #{ at position: " + pos);
              }
              var arr = [];
              for (var i = binIdx+1; i < bin.length; i++) {
        	 arr.push(bin[i]);
              }
              var b = arr.join('');
              if (b.length>255) {
        	 throw new Exception("Length does not fit in single byte at position: " + binIdx);
              }
              bin[binIdx] = String.fromCharCode(b.length);
              pos += 1;
              break;
           }
           case '|': {
              ascii = !ascii;
              pos += 1;
              break;
           }
          default:
             if (pos+1==len) {
        	throw new Exception("Missing hex characer at position: " + pos);
             }
             var s = fmt.substr(pos, 2);
             var n = parseInt(s, 16);
             if (isNaN(n)) {
        	throw new Exception("Invalid characters " + s + " at position: " + pos);
             }
             bin.push(String.fromCharCode(n));
             pos += 2;
          }
       }
       if (lengthStack.length!=0) {
          throw new Exception("Missing ) for #(");
       }
       return bin.join('');
    },


    /**
     * Indent a string with lines separated by '\n'.
     * @param str
     * @param spaces
     * @returns {String}
     */
    indent: function(/** String */str, /** Number */spaces) {
        var sep = sprintf("%"+spaces+"s", " ");
        return sep + str.replace(/\n/g, "\n"+sep);
    }
};






/**
 * @see Util.Formatter
 * @ignore
 */
Formatter = Util.Formatter;







//=====================================================================================================
//
// Util.Formatter.Table2
//
//=====================================================================================================


/**
 * Util.Formatter.Table2 renders an ascii table.
 * <ul>
 * <li>
 * The constructor takes the number of columns
 * </li>
 * <li>
 * Use setTitle to specify the column titles
 * </li>
 * <li>
 * Use setValue to populate cells
 * </li>
 * <li>
 * Use setPadding to specify padding properties
 * </li>
 * <li>
 * Use render to retrieve the formatted text as array of lines
 * </li>
 * </ul>
 * 
 * @class
 * @constructor
 * @param nx     Number of columns in table
 */
Util.Formatter.Table2 = function(/** Number */nx) {
    assert(nx > 0);
    this.nx = nx;
    this.matrix = [];
    this.haveTitle = false;
    this.padding = Util.Formatter.Table2.DFLT_PADDING;
};

/**
 * @private
 */
Util.Formatter.Table2.DFLT_PADDING = [ 0, 1, 0, 1 ];

/**
 * @private
 */
Util.Formatter.Table2.pad = function(lines, padding) {
    if (padding[1] >= 0) {
        var spaces = Util.getSpaces(padding[1]);
        for (var i = 0; i < lines.length; i++) {
            lines[i] += spaces;
        }
    }
    if (padding[3] >= 0) {
        var spaces = Util.getSpaces(padding[3]);
        for (var i = 0; i < lines.length; i++) {
            lines[i] = spaces + lines[i];
        }
    }
    if (padding[0] >= 0) {
        if (lines.length > 0) {
            var width = lines[0].length;
            var spaces = Util.getSpaces(width);
            var sa = [];
            for (var i = 0; i < padding[0]; i++) { sa.push(spaces); };
            lines = sa.concat(lines);
        }
    }
    if (padding[2] >= 0) {
        if (lines.length > 0) {
            var width = lines[0].length;
            var spaces = Util.getSpaces(width);
            var sa = [];
            for (var i = 0; i < padding[2]; i++) { sa.push(spaces); };
            lines = lines.concat(sa);
        }
    }
    return lines;
};


/**
 * @param obj
 * @returns {String[]}
 * @private
 */
Util.Formatter.Table2.obj2table = function(/** Object */obj, /** Boolean */withTitle, /** Object */key2formatter) {
    var names = Blob.map(obj, true, false);
    var values = Blob.map(obj, false, false);
    var t = new Util.Formatter.Table2(values.length);
    if (withTitle) {
	t.setTitle(names);
    }
    for (var i = 0; i < values.length; i++) {
	var s;
	if (key2formatter && key2formatter[names[i]]) {
	    s = key2formatter[names[i]](values[i]);
	} else {
	    s = values[i];
	}
	t.setValue(i, 0, s);
    }
    return t.render();
};


/** Prototype */
Util.Formatter.Table2.prototype = {
    /**
     * @returns {Number} Number of columns 
     */
    getColumnCnt: function() {
	return this.nx;
    },

    /**
     * @returns {Number} Number of rows
     */
    getRowCnt: function() {
	return this.matrix.length - (this.haveTitle?1:0);
    },

    /**
     * Set column titles.
     * @param args  Column titles, as array of strings or variable argument list
     */
    setTitle: function(/** Array */args) {
	assert(!this.haveTitle, "Title already set");
        var arr = (args instanceof Array) ? args : arguments;
        assert(arr.length==this.nx, "column count does not match table");
        this.haveTitle = true;
        for (var i = 0; i < arr.length; i++) {
            var cell = new Util.Formatter.Table2.Cell(this, i, 0, arr[i]);
            this.setCell(i, 0, cell);
            cell.setBorder(false, false, true, false);
        }
    },

    /**
     * Add a value for cell at position x,y spanning nx*ny cells.
     * @param x
     * @param y
     * @param val        toString is called on val to get string representation
     * @param nx         Optional, default is 1
     * @param ny         Optional, default is 1
     * @param maxWidth   Optional, max width for this cell
     */
    setValue: function(/** Number */x,/** Number */y,/** Object */val,/** Number */nx,/** Number */ny, /** Number */maxWidth) {
        if (!nx) { nx = 1; }
        if (!ny) { ny = 1; }
        if (this.haveTitle) {
            y += 1;
        }
        var cell = new Util.Formatter.Table2.Cell(this, x, y, val, nx, ny, maxWidth);
        for (var _x = x; _x < x + nx; _x++) {
            for (var _y = y; _y < y + ny; _y++) {
                this.setCell(_x, _y, cell);
            }
        }
        return cell;
    },

    /**
     * @private
     */
    setCell: function(/** Number */x,/** Number */y,/** Util.Formatter.Table2.Cell */cell) {
        assert(x < this.nx);
        var matrix = this.matrix;
        while(matrix.length <= y) {
            var _y = matrix.length;
            var row = new Array(this.nx);
            for (var _x = 0; _x < this.nx; _x++) {
                row[_x] = new Util.Formatter.Table2.Cell(this, _x, _y);
            }
            matrix.push(row);
        }
        matrix[y][x] = cell;
    },


    /**
     * Add a new row. Values are specified in varable argument list or in array parameter;
     */
    addRow: function() {
	var arr;
	if (arguments.length===1 && (arguments[0] instanceof Array)) {
	    arr = arguments[0];
	} else {
	    arr = arguments;
	}
	assert(arr.length>0, "Missing row values");
	var y = this.getRowCnt();
	for (var x = 0; x < arr.length; x++) {
	    this.setValue(x, y, arr[x]);
	}
    },


    /**
     * Adds a border below the current last row.
     */
    addSeparator: function() {
	assert(this.matrix.length>1, "Missing rows");
	var y = this.matrix.length-1;
	var row = this.matrix[y];
	for (var x = 0; x < row.length; x++) {
	    var cell = row[x];
	    assert(cell);
	    cell.setBorder(false, false, true, false);
	}
    },

    /**
     * @returns {Number[]} the four padding integers
     * @private
     */
    getPadding: function() {
        return this.padding;
    },


    /**
     * Set padding.
     * @param padding Padding for top, right, bottom, left
     */
    setPadding: function(/** Number[] */padding) {
        this.padding = padding;
    },


    /**
     * Render the table
     * @returns {String[]} array of rendered lines
     */
    render: function() {
        var x, y;

        var matrix = this.matrix;
        var ny = matrix.length;
        
        for (x = 0; x < this.nx; x++) {
            var width = -1;
            for (y = 0; y < ny; y++) {
                var cell = matrix[y][x];
                var w = cell.calcWidth(x, y);
                if (w > width) {
                    width = w;
                }
            }
            for (y = 0; y < ny; y++) {
                var cell = matrix[y][x];
                cell.setWidth(width, x, y);
            }
        }

        for (y = 0; y < ny; y++) {
            var height = -1;
            for (x = 0; x < this.nx; x++) {
                var cell = matrix[y][x];
                var h = cell.calcHeight(x, y);
                if (h > height) {
                    height = h;
                }
            }
            for (x = 0; x < this.nx; x++) {
                var cell = matrix[y][x];
                cell.setHeight(height, x, y);
            }
        }

        var lines = [];
        for (x = 0; x < this.nx; x++) {
            var _lines = [];
            for (var y = 0; y < matrix.length; y++) {
                var cell = matrix[y][x];
                _lines = _lines.concat(cell.getLines(x, y));
            }
            for (var i = 0; i < _lines.length; i++) {
                if (!lines[i]) {
                    lines[i] = _lines[i];
                } else {
                    lines[i] += _lines[i];
                }
            }
        }
        return lines;
    }
};





/**
 * Util.Formatter.Table2.Cell
 * @class
 * @constructor
 * @param table
 * @param x
 * @param y
 * @param value
 * @param nx
 * @param ny
 * @param maxWidth
 * @private
 */
Util.Formatter.Table2.Cell = function(/** Util.Formatter.Table2 */table, /** Number */x, /** Number */y, /** Object */value, /** Number */nx, /** Number */ny, /** Number */maxWidth) {
    if (!nx) { nx = 1; }
    if (!ny) { ny = 1; }
    this.table = table;
    this.x = x;
    this.y = y;
    this.value = (value===undefined||value===null)?"":value;
    this.heights = [];
    this.widths = [];
    this.nx = nx;
    this.ny = ny;
    this.lines = this.value.toString().split(/\r?\n/);
    var b = this.lines.some(function(l) { return l.length > maxWidth; });
    if (b) {
        this.lines = this.lines.map(function(l) {
            if (l.length > maxWidth) {
                if (/[^\s]/.test(l)) {
                    l = l.substr(0, maxWidth-2) + "..";
                } else {
                    l = l.substr(0, maxWidth);
                }
            }
            return l;
        });
    }
    this.lines = Util.Formatter.Table2.pad(this.lines, this.table.getPadding());
    this.baseHeight = this.lines.length;
    var width = -1;
    this.lines.forEach(function(line) { if (line.length > width) { width = line.length; } });
    this.baseWidth = width;
};
    
/** @private */
Util.Formatter.Table2.Cell.prototype = {
    /**
     * Limit width.
     * @param width
     * @private
     */
    setMaxWidth: function(/** Number */width) {
        var b = this.lines.some(function(l) { return l.length > width; });
        if (!b) {
            return;
        }
        var lines = [];
        for (var i = 0; i < this.lines.length; i++) {
            var l = this.lines[i];
            if (l.length > width) {
                if (/[^ ]/.test(l)) {
                    l = l.substr(0, width-2) + "..";
                } else {
                    l = l.substr(0, width);
                }
            }
            lines.push(l);
        }
        this.lines = lines;
        this.baseHeight = this.lines.length;
        this.baseWidth = width;
    },
    
    /**
     * Set border on this cell.
     * @param top
     * @param right
     * @param bottom
     * @param left
     * @private
     */
    setBorder: function(top, right, bottom, left) {
        this.borderTop = top;
        this.borderRight = right;
        this.borderBottom = bottom;
        this.borderLeft = left;
        if (top) { this.baseHeight += 1; }
        if (bottom) { this.baseHeight += 1; }
        if (left) { this.baseWidth += 1; }
        if (right) { this.baseWidth += 1; }
    },
    
    /**
     * Set width
     * @param width
     * @param x
     * @param y
     * @private
     */
    setWidth: function(width, x, y) {
        assert(x>=this.x && x<this.x+this.nx);
        var idx = x-this.x;
        this.widths[idx] = width;
        //QUACK(0, "SET W: " + idx + ", " + this.widths[idx]);
    },

    /**
     * Set height
     * @param height
     * @param x
     * @param y
     * @private
     */
    setHeight: function(height, x, y) {
        assert(y>=this.y && y<this.y+this.ny);
        var idx = y-this.y;
        this.heights[idx] = height;
        //QUACK(0, "SET H: " + idx + ", " + this.heights[idx]);
    },

    /**
     * @return {String[]}
     * @private
     */
    getLines: function(x, y) {
        assert(y>=this.y && y<this.y+this.ny);
        assert(x>=this.x && x<this.x+this.nx);
        var height = this.heights[y-this.y];
        var width = this.widths[x-this.x];

        var doBorderBottom = this.borderBottom && (y==this.y+this.ny-1);
        var start = 0;
        for (var i = 0; i < (y - this.y); i++) { start += this.heights[i]; }
        var end = start + height;
        var lines = [];
        if (this.borderTop) {
            start -= 1;
            end -= 1;
        }
        if (doBorderBottom) {
            end -= 1;
        }
        for (var i = start; i < end; i++) {
            if (i == -1) {
                var border = Util.multiplyString("-", width);
                lines.push(border);
                continue;
            }
            var l = this.lines[i];
            lines.push(!l ? Util.getSpaces(width) : l);
        }
        if (doBorderBottom) {
            var border = Util.multiplyString("-", width);
            lines.push(border);
        }

        var start = 0;
        for (var i = 0; i < (x - this.x); i++) { start += this.widths[i]; }
        for (var i = 0; i < lines.length; i++) {
            var l = lines[i].substr(start, width);
            if (!l) {
                l = Util.getSpaces(width);
            } else if (l.length < width) {
                l = l + Util.getSpaces(width-l.length);
            }
            //QUACK(0, "LENGTH: " + width + ", '" + l + "'" + ", " + l.length);
            if (this.borderRight) { l = l + '|'; }
            if (this.borderLeft) { l = '|' + l; }
            lines[i] = l;
        }
        return lines;
    },

    /**
     * Calculate width of cell.
     * @returns {Number}
     * @private
     */
    calcWidth: function(x, y) {
        //QUACK(0, "X: " + this.x + ", " + this.nx + ", " + x + ", " + y);
        assert(x>=this.x && x<this.x+this.nx);
        var width;
        if (this.nx == 1) {
            width = this.baseWidth;
        } else if (x != (this.x + this.nx - 1)) {
            width = 1;
        } else {
            var n = 0;
            this.widths.forEach(function(w) { n += w; });
            //QUACK(0, "N: " + n);
            width = this.baseWidth - n;
            if (width <= 0) {
                width = 0;
            }
            //QUACK(0, "W: " + width);
        }
        return width;
    },

    /**
     * Calculate height of cell.
     * @returns {Number}
     * @private
     */
    calcHeight: function(x, y) {
        //QUACK(0, "H: " + x + ", " + y);
        //QUACK(0, "H THIS: " +this.y + ", " + this.ny);
        assert(y>=this.y && y<this.y+this.ny);
        var height;
        if (this.ny == 1) {
            height = this.baseHeight;
        } else if (y != (this.y + this.ny - 1)) {
            height = 1;
        } else {
            var n = 0;
            this.heights.forEach(function(h) { n += h; });
            //QUACK(0, "N: " + n);
            height = this.baseHeight - n;
            if (height <= 0) {
                height = 1;
            }
            //QUACK(0, "H: " + height);
        }
        return height;
    },

    /**
     * @returns {String}
     * @private
     */
    toString: function() {
        return sprintf("Cell:%d,%d", this.x, this.y);
    }
};







//=====================================================================================================
//
// Util.Formatter.Object
//
//=====================================================================================================



Class.define(
    "Util.Formatter.Object",
    /**
     * @lends Util.Formatter.Object.prototype
     */
    {
	/**
	 * Renders an object to a HTML or text table. Key/value pairs can either be added
	 * individually or by calling addObj and specifying an object. The object is then
	 * traversed and properties and sub-tables are added recursively.</br>
	 * If HTML is to be generated, one can specify the following attributes in 'attrs'.
	 * <ul>
	 * <li>'clazz': Specifies the class tag created in the html</li>
	 * <li>'name': Specifies the name tag created in the html</li>
	 * <li>'id': Specifies the id tag created in the html</li>
	 * </ul>
	 * @constructs
	 * @param attrs  Optional
	 */
	__constr__: function(/** Object */attrs) {
	    this.label = null;
	    this.rows = [];
	    this.attrs = Util.Formatter.Object.getDefaultAttrs();
	    if (attrs) {
		for (var p in attrs) {
		    if (this.attrs[p]===undefined) {
			throw new Exception("Unsupported attribute: " + p);
		    }
		    this.attrs[p] = attrs[p];
		}
	    }
	},

	/**
	 * Add a key/value pair/row to this formatter.</br>
	 * When a number is added, it is by default rendered to decimal representation. Use the 'attrs' paramater
	 * with 'format' Util.Formatter.Object.DEC or Util.Formatter.Object.NANOS to represent decimal or as nanos.</br>
	 * The format of strings may either be Util.Formatter.Object.TXT, Util.Formatter.Object.DEC or Util.Formatter.Object.HEX
	 * where the default is Util.Formatter.Object.TXT.
	 * <ul>
	 * <li>'format': One of Util.Formatter.Object.TXT, Util.Formatter.Object.DEC, Util.Formatter.Object.HEX, Util.Formatter.Object.NANOS
	 * <li>'tooltip': Tooltip text</li>
	 * </ul>
	 * @param key
	 * @param value
	 * @param attrs
	 * 
	 */
	addRow: function(/** String */key, /** Number|String|Object */value, /** Object */attrs) {
	    var row = new Util.Formatter.Object.Row(key, value, attrs);
	    this.rows.push(row);
	},

	/**
	 * Add and return a new object formatter to this tree. If a label is specified,
	 * it is placed on top of the output of the new object formatter.
	 * @param label Optional
	 * @returns {Util.Formatter.Object}
	 */
	newTree: function(/** String */label) {
	    var tree = new Util.Formatter.Object();
	    tree.label = label;
	    this.rows.push(tree);
	    return tree;
	},

	/**
	 * Add an existing object formatter to this tree. The specified label is placed on top
	 * of the added object formatter.
	 * @param tree Util.Formatter.Object
	 */
	addTree: function(/** String */label, /** Util.Formatter.Object */tree) {
	    tree.label = label;
	    this.rows.push(tree);
	},

	/**
	 * Adds rows and subtrees in a generic manner to recursively cover all of the properties 
	 * of an object.<br/>
	 * A filter function f(propertyName, propertyValue, enclosingObject) may be specified
	 * to return false when a property of an object should not be rendered.<br/>
	 * A mapper function f(enclosingObject, propertyName, propertyValue) may be specified to
	 * return a string for a property to be rendered.
	 * @param obj
	 * @param label     Optional, label on top of the new object formatter to be added 
	 * @param filter    Optional
	 * @param mapper
	 * @return {Object} this
	 */
	addObj: function(/** Object */obj, /** String */label, /** Function */filter, /** Function */mapper) {
	    function add2tree(k, v, tree) {
		if (filter && !filter(k, v, obj)) {
		    return;
		}
		if (mapper) {
		    var mv = mapper(obj, k, v);
		    if (mv) {
			tree.addRow(k, mv);
			return;
		    }
		}
		var typ = typeof(v);
		if (typ === 'function') {
		    return;
		}
		if (v === undefined || v === null) {
		    tree.addRow(k, v);
		} else if (typ === 'number') {
		    tree.addRow(k, v);
		} else if (typ === 'string') {
		    tree.addRow(k, v);
		} else {
		    tree.addTree(k, obj2tree(v));
		}
	    };
	    function obj2tree(o, tree) {
		if (!tree) {
		    tree = new Util.Formatter.Object();
		}
		if (o instanceof Array) {
		    for (var i in o) {
			add2tree(i.toString(), o[i], tree);
		    }
		} else {
		    for (var k in o) {
			add2tree(k, o[k], tree);
		    }
		}  
		return tree;
	    };
	    if (label) {
		 var tree = obj2tree(obj);
		this.addTree(label, tree);
	    } else {
		obj2tree(obj, this);	
	    }
	    return this;
	},

	/**
	 * Render to HTML.
	 * @returns {String} HTML
	 */
	toHtml: function() {
	    var colCnt = 2;
	    var sa = [];
	    sa.push("<table");
	    if (this.attrs.clazz) {
		sa.push(" class='" + this.attrs.clazz + "'");
	    }
	    if (this.attrs.id) {
		sa.push(" id='" + this.attrs.id + "'");
	    }
	    if (this.attrs.name) {
		sa.push(" name='" + this.attrs.name + "'");
	    }
	    sa.push("><tbody>");
	    for (var i = 0; i < this.rows.length; i++) {
		var row = this.rows[i];
		if (row instanceof Util.Formatter.Object) {
		    if (row.label) {
			sa.push(sprintf("<tr><td colspan=\"%d\">", colCnt));
			sa.push(Util.HTML.quoteHTML(row.label) + ":");
			sa.push("</td></tr>");
		    }
		    sa.push(sprintf("<tr><td colspan=\"%d\">", colCnt));
		    sa.push(row.toHtml());
		    sa.push("</td></tr>");
		} else {
		    sa.push(row.toHtml());
		}
	    }
	    sa.push("</tbody></table>");
	    return sa.join("\n");
	},


	/**
	 * Render to text.
	 * @returns {String[]} Array of text lines
	 */
	toText: function() {
		var t = new Util.Formatter.Table2(2);
		var y = 0;
		for (var i = 0; i < this.rows.length; i++) {
		    var row = this.rows[i];
		    if (row instanceof Util.Formatter.Object) {
			if (row.label) {
			    var cell = t.setValue(0, y, row.label+":", 1, 2); 
			    y += 1;
			}
			var lines = row.toText();
			var cell = t.setValue(0, y, lines.join("    \n"), 1, 2); 
			y += 1;
		    } else {
			var cell = t.setValue(0, y, row.key+":"); 
			var cell = t.setValue(1, y, row.v2text());
			y += 1;
		    }
		}
		return t.render(); 
	}
    },
    /**
     * @lends Util.Formatter.Object
     */
    {
	/**
	 * @returns {Object}
	 * @private
	 */
	getDefaultAttrs: function() {
	    return {
		clazz: null,
		name: null,
		id: null
	    };
	},


	/**
	 * Format an object into table.
	 * @return {String}
	 */
	toString: function(/** Object */obj) {
	    var f =  new Util.Formatter.Object();
	    f.addObj(obj, undefined, function(k) { return k!=="__constr__"; });
	    return f.toText().join("\n");
	}
    }

);


/**
 * Format of data in an info tree.
 * @see Util.Formatter.Object
 * @type String
 * @constant
 */
Util.Formatter.Object.TXT =       0x1;

/**
 * Format of data in an info tree.
 * @see Util.Formatter.Object
 * @type String
 * @constant
 */
Util.Formatter.Object.HEX =       0x2;

/**
 * Format of data in an info tree.
 * @see Util.Formatter.Object
 * @type String
 * @constant
 */
Util.Formatter.Object.DEC =        0x4;

/**
 * Format of data in an info tree.
 * @see Util.Formatter.Object
 * @type String
 * @constant
 */
Util.Formatter.Object.NANOS =       0x5;

/**
 * Format of data in an info tree.
 * @see Util.Formatter.Object
 * @type String
 * @constant
 */
Util.Formatter.Object.MHZ =       0x6;

/**
 * Format of data in an info tree.
 * @see Util.Formatter.Object
 * @type String
 * @constant
 */
Util.Formatter.Object.KHZ =       0x7;

/**
 * Format of data in an info tree.
 * @see Util.Formatter.Object
 * @type String
 * @constant
 */
Util.Formatter.Object.FLOAT =       0x8;




Class.define(
    "Util.Formatter.Object.Row",
    /**
     * @lends Util.Formatter.Object.Row.prototype
     */
    {
	/**
	 * @param key
	 * @param value
	 * @param attrs
	 * @constructs
	 * @private
	 */
	__constr__: function(/** String */key, /** String|Number|Object */value, /** Object */attrs) {
	    this.key = key;
	    this.value = value;
	    if (this.value === undefined) {
		this.value = 'undefined';
	    } else if (this.value === null) {
		this.value = 'null';
	    } else if ((this.value === true) || (this.value === false)) {
		this.value = this.value.toString();
	    }
	    if ((typeof(this.value) !== 'string') && (typeof(this.value) !== 'number')) {
		this.value = this.value.toString();
	    }
	    this.attrs = Util.Formatter.Object.Row.getDefaultAttrs(value);
	    if (attrs) {
		for (var p in attrs) {
		    if (this.attrs[p]===undefined) {
			throw new Exception("Unsupported attribute: " + p);
		    }
		    this.attrs[p] = attrs[p];
		}
	    }
	    if (typeof(value) === 'number' && this.attrs.format===Util.Formatter.Object.TXT) {
		throw new Exception("Invalid format for Number: must be Util.Formatter.Object.DEC or Util.Formatter.Object.HEX");
	    }
	},

	/**
	 * @type String
	 * @private
	 */
	key: null,

	/**
	 * @type Object
	 * @private
	 */
	value: null,

	/**
	 * @type Object
	 * @private
	 */
	attrs: null,

	/**
	 * @returns {String}
	 * @private
	 */
	toHtml: function() {
	    var format = this.attrs.format;
	    if (typeof(this.value) === 'number') {
		var value;
		if (format===Util.Formatter.Object.HEX) {
		    value = this.value.toString(16);
		} else if (format===Util.Formatter.Object.DEC) {
		    value = this.value.toString();
		} else if (format===Util.Formatter.Object.NANOS) {
		    value = Util.nanos2str(this.value);
		} else if (format===Util.Formatter.Object.MHZ) {
		    value = (parseFloat(this.value)/(1000*1000)).toFixed(1) + "MHz";
		} else if (format===Util.Formatter.Object.KHZ) {
		    value = (parseFloat(this.value)/1000).toFixed(1) + "KHz";
		} else if (format===Util.Formatter.Object.FLOAT) {
		    value = this.value.toString();
		} else {
		    assert(0);
		}
		return this.kv2html(this.key, Util.HTML.quoteHTML(value), 1);
	    }
	    assert(typeof(this.value) === 'string');
	    if (format===Util.Formatter.Object.HEX||format===Util.Formatter.Object.DEC) {
		return this.bin2html(format);
	    }
	    assert(format===Util.Formatter.Object.TXT);
	    return this.txt2html();
	},

	/**
	 * @param format
	 * @returns {String}
	 * @private
	 */
	bin2html: function(/** Number */format) {
	    assert(typeof(this.value) === 'string');
	    assert(format===Util.Formatter.Object.HEX||format===Util.Formatter.Object.DEC);
	    var value = Util.HTML.binary2table(this.value, undefined, format===Util.Formatter.Object.DEC);
	    return this.kv2html(this.key, value, 2);
	},

	/**
	 * @returns {String}
	 * @private
	 */
	txt2html: function() {
	    var isProbablyBin = function(/** String */s) {
	    for (var i = 0; i < s.length; i++) {
		var cc = s.charCodeAt(i);
		if (cc < 0x20 || cc > 0x7e) {
		    return true;
		}
	    }
	    return false;
	    };

	    assert(this.attrs.format===Util.Formatter.Object.TXT);
	    if (isProbablyBin(this.value)) {
		return this.bin2html(Util.Formatter.Object.HEX);
	    }
	    assert(typeof(this.value) === 'string');
	    if (this.value.length < 30) {
		return this.kv2html(this.key, Util.HTML.quoteHTML(this.value), 1);
	    } else {
		var s = "<p style=\"word-wrap:break-word;\">" + Util.HTML.quoteHTML(this.value) + "</p>";
		return this.kv2html(this.key, s, 2);
	    }
	},

	/**
	 * @param key         Will be quoted
	 * @param value       Must be properly quoted html
	 * @param colspan     
	 * @returns {String}
	 * @private
	 */
	kv2html: function(key, value, colspan) {
	    var sa = [];
	    sa.push("<tr>");
	    sa.push(sprintf("<td colspan=\"%d\">", colspan));
	    sa.push(Util.HTML.quoteHTML(key) + ":");
	    sa.push("</td>");
	    if (colspan===2) {
		sa.push("</tr><tr>");
	    }
	    sa.push(sprintf("<td colspan=\"%d\">", colspan));
	    sa.push(value);
	    sa.push("</td></tr>");
	    return sa.join("\n");
	},


	/**
	 * @returns {String}
	 * @private
	 */
	v2text: function() {
	    var isProbablyBin =  function(/** String */s) {
		for (var i = 0; i < s.length; i++) {
		    var cc = s.charCodeAt(i);
		    if (cc===10 || cc===13 || cc===9) {
			continue;
		    }
		    if (cc < 0x20 || cc > 0x7e) {
			return true;
		    }
		}
		return false;
	    };
	    var format = this.attrs.format;
	    if (typeof(this.value) === 'number') {
		var value;
		if (format===Util.Formatter.Object.HEX) {
		    value = this.value.toString(16);
		} else if (format===Util.Formatter.Object.DEC) {
		    value = this.value.toString();
		} else if (format===Util.Formatter.Object.NANOS) {
		    value = Util.nanos2str(this.value);
		} else {
		    assert(0);
		}
		return value;
	    }
	    assert(typeof(this.value) === 'string');
	    if (format===Util.Formatter.Object.HEX||format===Util.Formatter.Object.DEC) {
		var sa = Util.Formatter.genHexTable(this.value, 0, 8, false);
		return sa.join("\n");
	    }
	    assert(format===Util.Formatter.Object.TXT);
	    assert(this.attrs.format===Util.Formatter.Object.TXT);
	    if (isProbablyBin(this.value)) {
		var sa = Util.Formatter.genHexTable(this.value, 0, 8, false);
		return sa.join("\n");
	    }
	    return this.value;
	}
    },
    /**
     * @lends Util.Formatter.Object.Row
     */
    {
	/**
	 * @param value
	 * @returns {Object}
	 * @private
	 */
	getDefaultAttrs: function(/** Object */value) {
	    var attrs = {
		format: Util.Formatter.Object.TXT,
		tooltip: null
	    };
	    if (typeof(value) === 'number') {
		attrs.format = Util.Formatter.Object.HEX;
	    }
	    return attrs;
	}
    }
);




//=====================================================================================================
//
// Util.FormattedData
//
//==================================================================================================


Class.define(
    "Util.FormattedData",
    /**
     * @lends Util.FormattedData.prototype
     */
    {
	/**
	 * Pack and unpack structures of data specified by order, name and 
	 * pack format such as u1, u2 etc.
	 * <pre>
	 * DESCRS = [ { name: "f1", format: "u1" },  { name: "f2", format: "u2", spec: "%d" } ]
	 * var obj = (new Util.FormattedData(DESCRS)).unpack(binaryString);
	 * println("f1: " + obj.f1);
	 * println("f2: " + obj.f2);
	 * var binaryString = obj.pack();
	 * </pre>
	 * @constructs
	 * @param descrs Array with objects with properties name and format
	 */
	__constr__: function(/** Object[] */descrs) {
	    this.descrs = descrs;
	    for (var i = 0; i < descrs.length; i++) {
		var name = descrs[i].name;
		this[name] = 0;
	    }
	},

	/**
	 * @returns {String}
	 */
	toString: function() {
	    var t = new Util.Formatter.Table2(2);
	    t.setTitle("Variable", "Value");
	    var descrs = this.descrs;
	    for (var i = 0; i < descrs.length; i++) {
		var name = descrs[i].name;
		t.setValue(0, i, name);
		t.setValue(1, i, this[name]);
	    }
	    return t.render().join("\n");
	},

	/**
	 * @returns {String}
	 */
	toNameList: function(/** String */sep) {
	    if (!sep) { sep = ", "; }
	    var descrs = this.descrs;
	    var sa = [];
	    for (var i = 0; i < descrs.length; i++) {
		sa.push(descrs[i].name);
	    }
	    return sa.join(sep);
	},

	/**
	 * @returns {String}
	 */
	toSpecList: function(/** String */sep) {
	    if (!sep) { sep = ", "; }
	    var descrs = this.descrs;
	    var sa = [];
	    for (var i = 0; i < descrs.length; i++) {
		sa.push(descrs[i].spec);
	    }
	    return sa.join(sep);
	},


	/**
	 * @returns {Object[]}
	 */
	toValues: function() {
	    var descrs = this.descrs;
	    var ret = [];
	    for (var i = 0; i < descrs.length; i++) {
		ret.push(this[descrs[i].name]);
	    }
	    return ret;
	},

	/**
	 * @returns {Object}
	 */
	toObject: function() {
	    var descrs = this.descrs;
	    var ret = {};
	    for (var i = 0; i < descrs.length; i++) {
		var name = descrs[i].name;
		ret[name] = this[name];
	    }
	    return ret;
	},

	/**
	 * @returns {String}
	 */
	pack: function() {
	    var fmts = [];
	    var values = [];
	    var descrs = this.descrs;
	    for (var i = 0; i < descrs.length; i++) {
		var d = descrs[i];
		values.push(this[d.name]);
		fmts.push(d.format);
	    }
	    var fmt = fmts.join("");
	    //QUACK(0, "FORMAT: " + fmt + "\nVALUES: " + values.join(","));
	    var bytes = Formatter.pack(fmt, values);
	    return bytes;
	},

	/**
	 * @param data
	 * @param pos
	 * @returns {Util.FormattedData}
	 */
	unpack: function(/** String */data, /** Number */pos) {
	    //QUACK(0, "DATA: " + Formatter.binToHex(data));
	    var sa = [];
	    var descrs = this.descrs;
	    for (var i = 0; i < descrs.length; i++) {
		sa.push(descrs[i].format);
	    }
	    var fmt = sa.join("");
	    var arr = Formatter.unpack(fmt, data, pos);
	    for (var i = 0; i < descrs.length; i++) {
		var name = descrs[i].name;
		this[name] = arr[i];
	    }
	    return this;
	}
    }
);







//=====================================================================================================
//
// Util.PropertyFilter
//
//=====================================================================================================
/**
 * Class to match the properties of an arbitrary object against a filter.
 * The constructor takes a variable argument list where each pair if forwarded to 'add'
 * to define a property filter.
 * @class
 * @constructor
 * @param key     Optional
 * @param values  Optional
 */
Util.PropertyFilter = function(/** String */key, /** String|String[] */values) {
    this.filter = {};
    if (arguments.length%2!=0) {
        throw new Exception("Invalid number of arguments, exptected: key value key value...");
    }
    for (var i = 0; i < arguments.length; i+= 2) {
        this.add(arguments[i], arguments[i+1]);
    }
};

Util.PropertyFilter.prototype = {
    /**
     * @returns {Boolean} whether this filter matches against the specified key
     */
    have: function(/** String */key) {
        return this.filter[key] !== undefined;
    },

    /**
     * Returns the values this filter has for the specified property. If undefined is returned,
     * the filter does not match against this property. If null is returned, the filter accepts an
     * object as long as it has this property. Otherwise the whitelist is returned which the filter expects for
     * this property. 
     * @returns {String[]} undefined, null or array of values
     */
    get: function(/** String */key) {
        var values = this.filter[key];
        if (values===null || values===undefined) {
            return values;
        }
        return Blob.map(values, true);
    },

    /**
     * Add filter for property 'key' where supported values are null (i.e. match all), a single value
     * or array of values (a whitelist).
     * @param key
     * @param values
     */
    add: function(/** String */key, /** String|String[] */values) {
        assert(key);
        if (!values) {
            //QUACK(0, "PROPERTY FILTER: allow any value..");
            this.filter[key] = null;
            return;
        }
        var obj = {};
        if (!(values instanceof Array)) {
            obj[values] = true;
        } else {
            assert(values instanceof Array);
            values.forEach(function(v) { obj[v] = true; });
        }
        values = obj;

        var _values = this.filter[key];
        if (!_values) {
            _values = this.filter[key] = {};
        }
        for (var v in values) {
            _values[v] = true;
        }
        return;
    },

    /**
     * Remove parts or the whole filter. If values is undefined or null, the filter does not match against
     * the specified key anymore. Otherwise, the specified set of values is removed from the current whitelist
     * for the specified key.
     * @param key
     * @param values
     */
    remove: function(/** String */key, /** String|String[] */values) {
        if (!values) {
            delete this.filter[key];
            return;
        }
        var obj = {};
        if (!(values instanceof Array)) {
            obj[values] = true;
        } else {
            assert(values instanceof Array);
            values.forEach(function(v) { obj[v] = true; });
        }
        values = obj;

        var _values = this.filter[key];
        if (!_values) {
            return;
        }
        for (var v in values) {
            delete _values[v];
        }
    },

    /**
     * Match this filter against an object. Each property in this filter is matched against the object.
     * If the object does not contain one of the filter properties, the match fails.
     * If the object contains a property, and null has been configured for the filter property,
     * the object matches this property. If a whitelist has been specified for the filter, the object
     * value of this property must be in this list or the match fails.
     * @returns {Boolean}
     */
    match: function(/** Object */obj) {
        var filter = this.filter;
        for (var key in filter) {
            var values = filter[key];
            var value = obj[key];
            if (value===undefined) {
                return false;
            }
            if (values===null) {
                continue;
            }
            if (!values[value]) {
                return false;
            }
        }
        return true;
    },

    /**
     * @returns {String}
     */
    toString: function() {
        var t = new Util.Formatter.Table2(2);
        var y = 0;
        for (var key in this.filter) {
            t.setValue(0, y, key);
            var values = this.filter[key];
            if (values===null) {
                t.setValue(1, y, "Any");
            } else {
                t.setValue(1, y, Blob.map(values, true).join(","));
            }
            y += 1;
        }
        return t.render().join("\n");
    }
};




//=====================================================================================================
//
// Execute.Parallel, Execute.Sequential, Execute.OneByOne
//
//=====================================================================================================

/**
 * Util.Execute provides methods to control the execution of a set of functions returning
 * AOP.Result instances in a callback. The function calls can be initiated in parallel, sequential
 * (where the execution aborts on an error), or one by one (where execution errors dont abort the
 * total operation) order.
 * @class
 */
Util.Execute = {
    /**
     * Invoke methods specified in an array of Util.Execute.Descr and wait for their completion.
     * If all methods succeed, the function returns an array of AOP.OK instances.
     * If at least one fails, the resulting exception contains a data property pointing to
     * the array of AOP.Result instances.
     * @param descrs   Array of Util.Execute.Descr
     * @returns {AOP.Result[]}
     * @throws AOP.Exception
     * @static
     */
    Parallel: function(/** Util.Execute.Descr[] */descrs, /** DFLT_ASYNC_CB */callback) {
	if (BC.is(callback)) { return BC.exec(arguments.callee, this, arguments); }
	assert(descrs.length>0, "Parameter 'descrs' must not be empty");
	var _this = new Util.Execute.Context(callback, descrs);
	/** @ignore */
	var onExecution = function(i, result) {
	    assert(result.code||(result.code===0), "Missing code field in Result instance");
	    _this.results[i] = result;
	    _this.idx += 1;
	    if (_this.idx < _this.descrs.length) {
		return;
	    }
	    _this.callManyBack();
	};
	for (var i = 0; i < descrs.length; i++) {
	    var d = descrs[i];
	    assert(d.params);
	    d.params.push(onExecution.bind(undefined, i));
	    try {
		// d.this undefined => global context
		d.func.apply(d._this, d.params);
	    } catch(ex) {
		onExecution(i, Ex2ERR(ERR_GENERIC, ex));
	    }
	}
    },


    /**
     * Invoke methods specified in an array of Util.Execute.Descr, one after the other,
     * but stop the invocation chain as soon as one method fails.
     * If all methods succeed, the function returns an array of AOP.OK instances.
     * If at least one fails, the resulting exception originated from the failing
     * method invocation.
     * @param descrs   Array of objects with func:function, _this:object, params:array
     * @returns {AOP.Result[]}
     * @throws AOP.Exception
     * @static
     */
    Sequential: function(/** Util.Execute.Descr[] */descrs, /** DFLT_ASYNC_CB */callback) {
	if (BC.is(callback)) { return BC.exec(arguments.callee, this, arguments); }
	assert(descrs.length > 0, "Array parameter is empty");
	assert(typeof(callback) == 'function');
	var _this = new Util.Execute.Context(callback, descrs);
	/** @ignore */
	var onExecution = function(result) {
	    if (result.code!==0) {
		_this.callback(result);
		return;
	    }
	    _this.results[_this.idx] = result;
	    _this.idx += 1;
	    if (_this.idx < _this.descrs.length) {
		var d = _this.descrs[_this.idx];
		assert(d.params);
		d.params.push(onExecution);
		try {
		    // d.this undefined => global context
		    d.func.apply(d._this, d.params);
		} catch(ex) {
		    onExecution(Ex2ERR(ERR_GENERIC, ex));
		}
		return;
	    }
	    _this.callback(new AOP.OK(_this.results));
	};
	var d = descrs[0];
	assert(d.params);
	d.params.push(onExecution);
	// d.this undefined => global context
	try {
	    d.func.apply(d._this, d.params);
	} catch(ex) {
	    onExecution(Ex2ERR(ERR_GENERIC, ex));
	}
    },


    /**
     * Like 'Execute.Sequential', but execution is not aborted in case one function failing.
     * Return values are the same as in Eceute.Parallel.
     * @param descrs   Array of Util.Execute.Descr instances
     * @returns {AOP.Result[]}
     * @throws AOP.Exception
     * @static
     */
   OneByOne: function(/** Util.Execute.Descr[] */descrs, callback) {
       if (BC.is(callback)) { return BC.exec(arguments.callee, this, arguments); }
       assert(descrs.length > 0, "Array parameter is empty");
       assert(typeof(callback) === 'function');
       var _this = new Util.Execute.Context(callback, descrs);
	/** @ignore */
	var onExecution = function(result) {
	    _this.results[_this.idx] = result;
	    _this.idx += 1;
	    if (_this.idx < _this.descrs.length) {
		var d = _this.descrs[_this.idx];
		assert(d.params);
		d.params.push(onExecution);
		// d.this undefined => global context
		try {
		    d.func.apply(d._this, d.params);
		} catch(ex) {
		    onExecution(Ex2ERR(ERR_GENERIC, ex));
		}
		return;
	    }
	    _this.callManyBack();
	};
	var d = descrs[0];
	assert(d.params);
	d.params.push(onExecution);
	// d.this undefined => global context
       try {
	   d.func.apply(d._this, d.params);
       } catch(ex) {
	   onExecution(Ex2ERR(ERR_GENERIC, ex));
       }
       return;
    },


    /**
     * Retry an operation a number of times with specified pauses until the operation
     * succeeds or the number of retries has been reached.
     * @param descr    Desribes the target and operation
     * @param retries  Number of retries, if 'undefined' or 'null', 10
     * @param timeout  Milliseconds, if 'undefined' or 'null', 200ms
     * @param callback
     * @returns {Object} return value of invoked function in case of success
     * @throws {AOP.Exception} 
     * @private
     */
    retry: function(/** Util.Execute.Descr */descr, /** Number */retries, /** Number */ timeout, /** DFLT_ASYNC_CB */callback) {
	if (BC.is(callback)) { return BC.exec(arguments.callee, this, arguments); }
	if (!retries) {
	    retries = 10;
	}
	if (!timeout) {
	    timeout = 200;
	}
	descr.params.push(function(result) {
	    retries -= 1;
	    if (result.code != 0) {
                if (retries>0) {
                    Timer.timeoutIn(timeout, function() { 
			descr.func.apply(descr._this, descr.params);
		    });
                } else {
		    callback(result);
                }
	    } else {
		callback(result);
	    }
	});
	descr.func.apply(descr._this, descr.params);
    }
};


/**
 * @see Util.Execute
 * @private
 */
Execute = Util.Execute;

/**
 * A target descriptor for operations in Util.Execute.
 * @class
 * @constructor
 * @param func    Function to call
 * @param _this   Object to call the function; if null or undefined, the global context is used
 * @param args    Additional parameters for the function call
 */
Util.Execute.Descr = function(/** Function */func, /** Object */_this) {
   assert(typeof(func) === 'function');
   /**
    * Function to call.
    * @type function
    */
   this.func = func;
   /**
    * Object to call function for.
    * @type Object
    */
   this._this = _this ? _this : null;
   /**
    * Parameters for function.
    * @type Object[]
    */
   this.params = [];
   for (var i = 2; i < arguments.length; i++) {
      this.params.push(arguments[i]);
   }
};



/**
 * Keeps state during parallel or sequential execution.
 * @class
 * @constructor
 * @param callback
 * @param descrs
 * @private
 */
Util.Execute.Context = function(/** DFLT_ASYNC_CB */callback, /** Util.Execute.Descr[] */descrs) {
    this.callback = callback;
    this.descrs = descrs;
    this.results = new Array(descrs.length);
    this.idx = 0;
    this.callManyBack = function() {
	var code = 0;
	for (var i = 0; i < this.results.length; i++) {
	    if (this.results[i].code!==0) {
		code = ERR_GENERIC;
		break;
	    }
	}

	if (code===0) {
	    this.callback(new AOP.OK(this.results));
	} else {
	    var msg = "Operations partly failed:\n\t" + this.results.join("\n\t");
	    this.callback(new AOP.ERR(code, msg, undefined, this.results));
	}
    };
};













//=====================================================================================================
//
// Listeners
//
//=====================================================================================================

/**
 * Util.Listeners bundles a set of callbacks. An invocation of notify leads to the invocation
 * of all registerd listeners. 
 * @class 
 * @constructor
 * @param consumeMode Optional; if true, a listener returning true stops the notification of the listener chain 
 */
Util.Listeners = function(/** Boolean */consumeMode) {
    this.listeners = [];
    this.consumeMode = consumeMode||false;
};

/** Prototype */
Util.Listeners.prototype = {
    /**
     * Array of functions
     * @type Util.Listener[]
     * @private
     */
   listeners: null,
    /**
     * If true, listeners can return true to consume an event
     * @type Boolean
     * @private
     */
   consumeMode: false,


    /**
     * @private
     */
    setConsumeMode: function(/** Boolean */b) {
        this.consumeMode = b;
    },
    
    /**
     * @returns {Util.Listener[]} the listeners
     * @private
     */
    getListeners: function() {
        return this.listeners;
    },
    
    /**
     * Add a listener to the end of the current set. 
     * @param listener     Callback.
     * @param mask         Optional, a filter
     * @returns {function} the listener function passed in 
     */
    add: function(/** Function */listener, /** Util.PropertyFilter */mask) {
        assert(!mask || (mask instanceof Util.PropertyFilter));
	assert(listener);
	assert(!this.contains(listener), "Listeners.add: listener already added");
        this.listeners.push(new Util.Listener(listener, mask));
	return listener;
    },


    /**
     * Add a listener to the beginning of the current set. 
     * @param listener     Callback.
     * @param mask         Optional, a filter
     * @returns {function} the listener function passed in 
     */
    unshift: function(/** Function */listener, /** Util.PropertyFilter */mask) {
        assert(!mask || (mask instanceof Util.PropertyFilter));
	assert(listener);
	assert(!this.contains(listener), "Listeners.add: listener already added");
        this.listeners.unshift(new Util.Listener(listener, mask));
	return listener;
    },

    /**
     * Remove a listener from the current set.
     * @param listener        Listener in the current set
     * @returns {Boolean} true if listener existed in current set and has been removed.
     */
    remove: function(/** function */l) {
	assert(l, "No listener specified");
	for (var i = 0; i < this.listeners.length; i++) {
            if (this.listeners[i].func == l) {
		this.listeners.splice(i, 1);
		assert(this.contains(l) == false);
		return true;
	    }
	}
	return false;
    },

    /**
     * Remove all listeners from the current set.
     */
    removeAll: function() {
	this.listeners = [];
    },

    /**
     * Contains current set the specified listener?
     * @param listener        Function
     * @returns {Boolean} whether specified listener is stored in this set
     */
    contains: function(/** function */l) {
	for (var i = 0; i < this.listeners.length; i++) {
            if (this.listeners[i].func == l) {
		return true;
	    }
	}
	return false;
    },

    /**
     * Notify all listeners. All parameters passed to this function are forwarded to the listeners.
     * If consume mode has been switched on (for instance in the constructor) and if a listener
     * returns true, the call chain is stopped, and this function returns true.
     * If a listener returns false or undefined, the call chain is continued.
     * @returns {Boolean} true if in consume mode and call chain was canceled
     */
    notify: function() {
        if (this.listeners.length==0) {
            return false;
        }
	var listeners = arraycopy(this.listeners);
	for (var i = 0; i < listeners.length; i++) {
            var l = listeners[i];
            var ret = l.notify.apply(l, arguments);
            if (this.consumeMode&&ret===true) {
                return ret;
            }
	}
        return false;
    }
};



/**
 * @class
 * @constructor
 * @param func
 * @param mask
 * @private
 */
Util.Listener = function(/** Function */func, /** Util.PropertyFilter */mask) {
    /**
     * @type Function
     * @private
     */
    this.func = func;
    /**
     * @type Util.PropertyFilter
     * @private
     */
    this.mask = mask;
    assert(!mask || (mask instanceof Util.PropertyFilter));
};

/** @private */
Util.Listener.prototype = {
    /**
     * @returns {String}
     * @private
     */
    toString: function() {
        return "Util.Listener";
    },
    
    // /**
    //  * Accept call? Check parameter against the mask of this listener.
    //  * @param para
    //  * @returns {Boolean}
    //  */
    // accepts: function(para) {
    //     //if (para && this.mask) {
    //         //QUACK(0, "MATCH:\n" + para);
    //         //QUACK(0, "MATCH:\n" + this.mask);
    //         //QUACK(0, "MATCH:\n" + this.mask.match(para));
    //     //}
    //     return !this.mask || (para===undefined) || this.mask.match(para);
    // },
    
    /**
     * @private
     */
    notify: function() {
        var para = arguments.length>0 ? arguments[0] : undefined;
        if (!this.mask || (para===undefined) || this.mask.match(para)) {
            return this.func.apply(null, arguments);
        } else {
            return false;
        }
    }

    // /**
    //  * @private
    //  */
    // invoke: function() {
    //     return this.func.apply(null, arguments);
    // }

};


/**
 * @ignore
 */
Listeners = Util.Listeners;






//=====================================================================================================
//
// UUID
//
//=====================================================================================================


/**
 * Util.UUID provides functions to handle various UUID formats.
 * @class 
 */
Util.UUID = {
   /**
    * Generate random GUID. A sequence of hex characters separated by '-'.
    * Sample: d57fa6af-6165-e1e7-55c4-a7b3a40f
    * @returns {String} random GUID
    * @static
    */
   createGUID: function() {
      var s4 = function() {
	 return (((1+Math.random())*0x10000)|0).toString(16).substring(1);
      };
      return (s4()+s4()+"-"+s4()+"-"+s4()+"-"+s4()+"-"+s4()+s4());
   },

   /**
    * Generate random GUID, but seed in timestamp.
    * @returns {String} random GUID
    * @static
    */
    createGUID2: function(){
	var d = new Date().getTime();
	var uuid = 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
	    var r = (d + Math.random()*16)%16 | 0;
	    d = d/16 | 0;
	    return (c=='x' ? r : (r&0x7|0x8)).toString(16);
	});
	return uuid;
    },
    

   /**
    * @constant
    * @type RegExp
    */
   EUI64_REGEX:  /^([a-fA-F0-9]{2}[-:]){7}[a-fA-F0-9]{2}$/,


   /**
    * @constant
    * @type RegExp
    */
    EUI64_PARTIAL_REGEX: /^([a-fA-F0-9]{2})?([-:][a-fA-F0-9]{2}){0,7}$/,
    

   /**
    * Map a 64bit number (as string in hexadecimal notation) to eui format (xx-xx-xx...).
    * @param s       String, in hexadecimal notation, without any '-' or ':', length of 16 hex characters
    * @returns {String} an EUI string in preferred notation (using '-' and upper case hex digits)
    * @static
    */
   hex2eui64: function(/** String */s) {
      if (!/^[a-fA-F0-9]+$/.test(s))
	  throw "Invalid EUI-64 hex-string (bad characters): "+s;
      if (s.length!=16)
	  throw "Invalid EUI-64 hex-string (bad length): "+s;
      var eui = [];
      for (var i = 0; i < s.length; i += 2) {
	 if (i != 0) {
	    eui.push("-");
	 };
	 eui.push(s.charAt(i));
	 eui.push(s.charAt(i+1));
      }
      return eui.join('');
   },

   /**
    * Map 64bit number, little endian, to eui string (xx-xx-xx...).
    * @param n       Number
    * @returns {String} an EUI string in preferred notation (using '-' and upper case hex digits)
    * @static
    */
   num2eui64: function(/** Number */n) {
       return Util.UUID.hex2eui64("00000000"+Formatter.numToHex(n,8));
   },

   /**
    * Remove '-' or ':' from a string in EUI64 format (xx-xx...xx).
    * @returns {String} a string in hex notation  
    * @static
    */
   eui642hex:  function(/** String */eui) {
      if (!this.EUI64_REGEX.test(eui))
	 throw "Invalid EUI: "+eui;
      return eui.replace(/[-:]/g, '');
   },

   /**
    * Map EUI to preferred notation using '-' as separator and upper case hex digits.
    * @param eui Input EUI-64
    * @returns {String} normalized EUI-64.
    */
   eui2preferred: function (/**String*/eui) {
      if (!this.EUI64_REGEX.test(eui))
	 throw "Invalid EUI: "+eui;
       return eui.replace(':','-').toUpperCase();
   },

   /**
    * Complete a partial EUI string with xx-(xx-)* until a full EUI64 sequence is created. It also
    * converts to the eui64 notation preferred in Sonoran, i.e. based on '-' as separator and in uppercase.
    * @returns {String} an EUI string
    * @static
    */
   completeEUI: function(/** String */eui) {
       if (!/^([a-fA-F0-9]{2})?([-:][a-fA-F0-9]{2}){0,7}$/.test(eui))
	 throw "Invalid partial EUI: " + eui;
      var completion = '02-00-00-00-00-00-00-00';
      eui = eui.replace(':','-').toUpperCase();
      var l = 8*2+7-eui.length;
      return l==0 ? eui : completion.substr(0,l)+eui;
   }
};


//=====================================================================================================
//
// HTML template handling
//
//=====================================================================================================

/**
 * HTML related utility functions.
 * @class
 */
Util.HTML = {
    /**
     * @private
     */
    quoteRegExps: {
	html: [/&/g,"&"+"amp;", /</g,"&"+"lt;", />/g,"&"+"gt;"],  // ampersand first!
	query: [/%/g,"%25", /&/g,"%26", / /g,"%20", /[+]/g,"%2B", /=/g,"%3D", /;/g,"%3B"],
	cdata: [/\"/g,"&quot;"],
	js:    [/[\'\\\u0000-\u001F\u007F-\uFFFF]/g, function (match, p1, p2, offset, str) {
		    var code = match.charCodeAt(0);
		    return "\\u"+
			"0123456789ABCDEF".charAt((code>>12)&0xF)+
			"0123456789ABCDEF".charAt((code>> 8)&0xF)+
			"0123456789ABCDEF".charAt((code>> 4)&0xF)+
			"0123456789ABCDEF".charAt( code     &0xF);
		}],
	nbsp:  [/ /g,"&nbsp;"]
    },

    /**
     * Quote a string
     * @param s
     * @param p
    * @returns {String}
     * @private
     */
    genericQuote: function(/** String */s, /** Array */p) {
	if( s==null ) return null;
	if( typeof(s)!='string' ) s=s.toString();
	for( var i=0; i<p.length; i+=2 )
	    s = s.replace(p[i],p[i+1]);
	return s;
    },
    
    /** 
     * Make sure some JavaScript string appears in HTML as is.
     * @param s
    * @returns {String}
     */
    quoteHTML: function (s) { return Util.HTML.genericQuote(s,Util.HTML.quoteRegExps.html); },

    /**
     * Convert all spaces into non-breaking spaces
     * @param s
    * @returns {String}
     */
    quoteSPACE: function (s) { return Util.HTML.genericQuote(s,Util.HTML.quoteRegExps.nbsp); },

    /**
     * Make sure some JavaScript string appears in HTML as is.
     * @param s
    * @returns {String}
     * */
    quoteQUERY: function (s) { return Util.HTML.genericQuote(s,Util.HTML.quoteRegExps.query); },

    /**
     * Make sure some JavaScript string appears in HTML as CDATA (e.g. src="string").
     * @param s
    * @returns {String}
     */
    quoteCDATA: function (s) { return Util.HTML.genericQuote(s,Util.HTML.quoteRegExps.cdata); },

    /**
     * Make sure some JavaScript string can be evaluated as '-quoted JavaScript string
     * @param s
    * @returns {String}
    * */
    quoteJS: function (s) { return Util.HTML.genericQuote(s,Util.HTML.quoteRegExps.js); },

    /**
     * Replace strings of the form
     * <pre>
     * _NAME_{FLAGS}_
    *   %NAME_{FLAGS}%
    *   %NAME:{FLAGS}%
    * </pre>
    * where NAME is either a number 1..k referring to the nth argument in args
    * or a field name in args[0]. Flags is optional and if present
    * denotes a sequence of quotation schemes to apply.
    * @param str
    * @param args ...
    * @returns {String}
    */
    fillTemplate: function (/** String */str, /** Arguments */args) {
	var arglist = arguments; // save a ref to argments for nested function
	return str.replace(/[%_]([0-9a-zA-Z]+)([:_][HCJSQqU]+)[%_]/g,
			   function (match, p1, p2, offset, str) {
			       var a = (args&&(p1 in args)) ? args[p1] : arglist[new Number(p1)+1];
			       if( a==null ) return "";
			       if( p2 ) {
				   var n = p2.length;
				   for( var i=1; i<n; i++ ) {
				       var c = p2.charAt(i);
				       /**/ if( c=='H' ) a = Util.HTML.quoteHTML(a);
				       else if( c=='C' ) a = Util.HTML.quoteCDATA(a);
				       else if( c=='J' ) a = Util.HTML.quoteJS(a);
				       else if( c=='S' ) a = Util.HTML.quoteSPACE(a);
				       else if( c=='Q' ) a = "'"+a+"'";
				       else if( c=='q' ) a = '"'+a+'"';
				       // else U - unquoted
				   }
			       }
			       return a;
			   });
    },

    /**
     * @param str
     * @returns {String}
     * @private
     */
    encodeHtmlEntities: function (/** String */str) {
	return str.replace(/[\u0080-\uFFFF]/,
			   function (match, offset, str) {
			       return '&#'+match.charCodeAt(0)+';';
			   }
			  );
    },


    /**
     * Map '\r?\n' separated lines to quoted htmlseparated by </br>.
     * @param s
     * @returns {String}
     */
    mapLines: function(/** String */s) {
	var sa = s.split(/\r?\n/);
	return sa.map(function(s) { return Util.HTML.quoteHTML(s); }).join("<br/>");

    },


    /**
     * Map binary string to html table.
     * @param s
     * @param cnt2row Optional, number of elements per row
     * @param dec     Optional, if true, decimal
     * @returns {String}
     */
    binary2table: function(/** String */s, /** Number */cnt2row, /** Boolean */dec) {
	if (!cnt2row) { cnt2row = 8; }
	if (!dec) { dec = false; }
	var addrlen = s.length >= 256 ? 4 : 2;
	var ret = [];
	ret.push("<table><tbody>");
	var i, j;
	for (i = 0; i < s.length; i += cnt2row) {
	    ret.push(sprintf("<tr><td>%0*X:</td>", addrlen, i));
	    for (j = 0; j < cnt2row; j++) {
		var k = i + j;
		if (k >= s.length) {
		    for (var l = 0; l < (cnt2row-j); l++) {
			ret.push("<td></td>");	
		    }
		    break;
		}
		if (dec) {
		    ret.push(sprintf("<td>%d</td>", s.charCodeAt(k)));
		} else {
		    ret.push(sprintf("<td>%02X</td>", s.charCodeAt(k)));
		}
	    }
	    ret.push("</tr>");
	}
	ret.push("</tbody></table>");
	return ret.join('');;
    }
};




//=====================================================================================================
//
// RingBuffer
//
//=====================================================================================================



/**
 * Util.RingBuffer provides a ring buffer implementation
* @class 
* @constructor
* @param cnt     Capacity of buffer, default 64
* @param reaper  Optional, number of elements removed when buffer is full
 */
Util.RingBuffer =  function(/** Number */capacity, /** Number */reapCnt) {
   this.capacity = !capacity ? 64 : capacity;
   this.entries = new Array(this.capacity);
   this.start = 0;
   this.pos = 0;
   this.free = capacity;
   this.used = 0;
   this.reapCnt = 1;
   assert(!reapCnt || typeof(reapCnt)==='number', "API change");
   if (!reapCnt) {
      reapCnt = parseInt(this.capacity/8);
   }
   this.reapCnt = reapCnt==0 ? 1 : reapCnt;
};

/** Prototype */
Util.RingBuffer.prototype = {
   /**
    * @private
   */
   capacity: -1,
   /**
    * @private
    */
   entries: null,
   /**
    * @private
    */
   start: -1,
   /**
    * @private
    */
   pos: -1,
   /**
    * @private
    */
   free: -1,
   /**
    * @private
    */
   used: -1,
   /**
    * @private
    */
   reapCnt: -1,
   
   /**
    * Add element to ringbuffer.
    * @param ele
    */
   push: function(/** Object */ele) {
      this.add(ele);
   },

   /**
    * Remove top element.
    * @returns {Object}
    */
   pop: function() {
      assert(this.used>0);
      this.pos -= 1;
      if (this.pos < 0) {
         this.pos = this.entries.length-1;
      }
      this.free += 1;
      this.used -= 1;
      return this.entries[this.pos];
   },

   /**
    * Add element to ringbuffer.
    * @param ele
    */
   add: function(/** Object */ele) {
      assert(ele != null);
      assert(this.entries.length==this.capacity);
      assert(this.free >= 0);
      assert(this.free+this.used==this.entries.length);
      if (this.free==0) {
         this.reap();
      }
      assert(this.free>0);
      this.entries[this.pos] = ele;
      this.pos += 1;
      if (this.pos >= this.entries.length) {
         this.pos = 0;
      }
      this.free -= 1;
      this.used += 1;
   },

   /**
    * @returns {Number} the number of elements stored in buffer.
    */
   length: function() {
      return this.used;
   },

   /**
    * @returns {Number} the  number of elements stored in buffer.
    */
   getUsed: function() {
      return this.used;
   },

   /**
    * @returns {Number} the capcity of this buffer.
    */
   getCapacity: function() {
      return this.capacity;
   },

   /**
    * @returns {Number} the number of elements to add before buffer is full.
    */
   getFree: function() {
      return this.free;
   },

   /**
    * @returns {Object} the last element in buffer.
    */
   getLast: function() {
      assert(this.used>=1);
      return this.get(this.used-1);
   },

    /**
    * @returns {Object} the first element in buffer.
    */
   getFirst: function() {
      assert(this.used>=1);
      return this.get(0);
   },

   /**
    * Returns first element and removes it from buffer.
    * @returns {Object}
    */
   shift: function() {
      var obj = this.getFirst();
      this.releaseOne();
      return obj;
   },
   
   /**
    * @private
    */
   reap: function() {
      assert(this.free==0);
      assert(this.pos==this.start);
      this.releaseMany(this.reapCnt);
   },

   /**
    * Remove all elemets and return them.
    * @returns {Object[]}
    */
   removeAll: function(cnt) {
      var used = this.used;
      var res = [];
      for (var i = 0; i < used; i++) {
         var o = this.get(i);
         assert(o);
         res.push(o);
      }
      this.releaseMany(used);
      assert(this.used == 0);
      return res;
   },

   /**
    * @private
    */
   releaseOne: function() {
      this.start += 1;
      if (this.start >= this.entries.length) {
         this.start = 0;
      }
      this.free += 1;
      this.used -= 1;
   },

   /**
    * @private
    */
   releaseMany: function(cnt) {
      assert(cnt <= this.used);
      this.used -= cnt;
      this.free += cnt;
      this.start = (this.start + cnt) % this.entries.length;
      this.pos = (this.start + this.used) % this.entries.length;
   },

   /**
    * Get idx'th element in buffer.
    * @param idx Index
    * @returns {Object} element
    */
   get: function(/** Number */idx) {
      assert(idx < this.used);
      var off = (this.start + idx) % this.entries.length;
      return this.entries[off];
   },

   /**
    * Iterate over elements in buffer. Given function is called with each element
    * stored in the RingBuffer.
    * @param func function
    */
   forEach: function(/** Function */func) {
      if (this.used==0) {
         return;
      }
      var pos = this.start;
      while(true) {
         func(this.entries[pos]);
         pos += 1;
         if (pos >= this.entries.length) {
	    pos = 0;
         }
         if (pos == this.pos) {
	    break;
         }
      }
   },

   /**
    * Return array with up to cnt elements starting at idx.
    * @param idx Start index
    * @param cnt Number of elements
    * @returns {Object[]} range of elements
    */
   slice: function(/** Number */idx, /** Number */cnt) {
      assert((idx>=0) && (cnt>=0));
      assert(idx<this.used);
      if (idx+cnt >= this.used) {
         cnt = this.used - idx;
      }
      if (cnt == 0) {
         return [];
      }
      var ret;
      if (this.pos > this.start) {
         var i = this.start+idx;
         ret = this.entries.slice(i, i+cnt);
      } else if (idx < this.entries.length-this.start) {
         var i = this.start+idx;
         var c = (this.entries.length-i>=cnt) ? cnt : (this.entries.length-i);
         ret = this.entries.slice(i, i+c);
         if (cnt - c > 0) {
	    ret = ret.concat(this.entries.slice(0, cnt-c));
         }
      } else {
         var i = idx-(this.entries.length-this.start);
         ret = this.entries.slice(i, i+cnt);
      }
      assert(ret.length>0);
      return ret;
   },

   /**
    * Return debug info for this RingBuffer.
    * @returns {String} multi-line string
    */
   toString: function(full) {
      if (!full) {
         full = false;
      }
      var s = "start " + this.start + ", pos " + this.pos + ", free " + this.free + ", used " + this.used + ", ";
      if (full) {
         s += "\n";
         for (var i = 0; i < this.entries.length; i++) {
	    var e = this.entries[i];
	    if (e) {
	       s += "Entry " + i + ": " + e.msgtype;
	    }
         }
      }
      return s;
   }
};




//=====================================================================================================
//
// WIN32
//
//=====================================================================================================
/**
 * @class
 * @private
 */
Win32 = {
    /**
     * @returns {Boolean} if sonoran is running in cygwin or win32 installation
     * @private
     */
    runOnWindows:  function() {
	return (ARCH_NAME === 'win32' || ARCH_NAME === 'cygwin');
    },

    /**
     * @returns {String} path to ../Documents And Settings/All Users
     * @private
     */
    getAllUsersProfilePath: function() {
	if (!this.runOnWindows()) { throw "No windows platform: " + ARCH_NAME; }
	var s = IO.Process.getenv('ALLUSERSPROFILE');
	if (s) {
	    return s;
	}
	s = 'c:/Documents And Settings/All Users';
	if (IO.File.exists(s)) {
	    return s;
	}
	throw "Cannot retrieve location of 'Documents And Settings/All Users'";
    },


    /**
     * @returns {String} path to ../Documents And Settings/<user>
     * @private
     */
    getUserProfilePath: function() {
	if (!this.runOnWindows()) { throw "No windows platform: " + ARCH_NAME; }
	var s = IO.Process.getenv('USERPROFILE');
	if (s) {
	    return s;
	}
	throw "Cannot retrieve location of user profile in 'Documents And Settings'";
    }
};




//=====================================================================================================
//
// Util.Benchmark
//
//=====================================================================================================

/**
 * Benchmark specified function. Returns object with properties 'time' (milliseonds) and 'description'.
 * @private
 */
Util.benchmark = function(/** Function */f, /** String */prefix) {
   var tstart = Clock.get();
   f();
   var tend = Clock.get();
   var millis = tend - tstart;
   var hours = Math.floor(millis/(3600*1000));
   var mins = Math.floor(millis/(60*1000))%60;
   var secs = Math.floor(millis/1000)%60;
   millis = millis%1000;
   return {
      time: millis,
      description: prefix + ": " + sprintf("%d:%d:%d.%d", hours, mins, secs, millis)
   };
};



//=====================================================================================================
//
// ProgressMonitor
//
//=====================================================================================================



Class.define(
    "Util.ProgressMonitor",
    /**
     * @lends Util.ProgressMonitor.prototype
     */
    {
	/**
	 * Defines the base class for progress monitors. Use the static functions to create
	 * progress monitors using log messages or standard output to signal progress. 
	 * @constructs
	 */
	__constr__: function() {},

	/**
	 * Notification of progress, default implementation is empty.
	 * @param text
	 */
	onProgress: function(/** String */text) {},
	
	/**
	 * Notification of a message dring the operation, default implementation calls
	 * onProgress.
	 * @param text
	 */
	onMessage: function(/** Number */severity, /** String */text) {
	    this.onProgress(text);
	}
    }
);


/**
 * Returns monitor ignoring messages.
 * @returns {Util.ProgressMonitor}
 */
Util.ProgressMonitor.getNullMonitor = function() {
    return new Util.ProgressMonitor();
};


/**
 * Returns monitor sending messages to stdout.
 * @returns {ProgressMonitor}
 */
Util.ProgressMonitor.getDfltMonitor = function() {
    return new Util.ProgressMonitor.Stdout();
};


/**
 * Returns monitor sending messages to stdout.
 * @returns {ProgressMonitor}
 */
Util.ProgressMonitor.getStdoutMonitor = function() {
    return new Util.ProgressMonitor.Stdout();
};


/**
 * Returns monitor sending messages to Logger.
 * @param module
 * @param severity
 * @returns {Util.ProgressMonitor}
 */
Util.ProgressMonitor.getLoggerMonitor = function(/** String */module, /** Number */severity) {
    return new Util.ProgressMonitor.Logger(module, severity);
};


/**
 * Returns monitor sending messages to shell.
 * @param shell
 * @returns {Util.ProgressMonitor}
 */
Util.ProgressMonitor.getShellMonitor = function(/** CLI.Shell */shell, /** Number */severity) {
    return new Util.ProgressMonitor.Shell(shell, severity);
};




Util.ProgressMonitor.extend(
    "Util.ProgressMonitor.Stdout",
    /**
     * @lends Util.ProgressMonitor.Stdout.prototype
     * @private
     */
    {
	/**
	 * Dump proress on stdout.
	 * @augments Util.ProgressMonitor
	 * @constructs
	 * @private
	 */
	__constr__: function() {
	    Util.ProgressMonitor.call(this);
       },

	/**
	 * Notification of progress, this implementation uses println to 
	 * output the text.
	 * @param text
	 * @private
	 */
	onProgress: function(/** String */text) {
	    println(text);
	}
    }
);


Util.ProgressMonitor.extend(
    "Util.ProgressMonitor.Logger",
    /**
     * @lends Util.ProgressMonitor.Logger.prototype
     * @private
     */
    {
	/**
	 * Dump proress using Logger.
	 * @augments Util.ProgressMonitor
	 * @constructs
	 * @param module
	 * @param severity
	 * @private
	 */
	__constr__: function(/** String */module, /** Number */severity) {
	    Util.ProgressMonitor.call(this);
	    this.module = module;
	    this.severity = severity;
       },

	/**
	 * Notification of progress, this implementation uses println to 
	 * output the text.
	 * @param text
	 * @private
	 */
	onProgress: function(/** String */text) {
	    Logger.log(this.severity, this.module, text);
	},

	/**
	 * Notification of a message dring the operation, default implementation calls
	 * onProgress.
	 * @param text
	 * @private
	 */
	onMessage: function(/** Number */severity, /** String */text) {
	    Logger.log(severity, this.module, text);
	}
    }
);


Util.ProgressMonitor.extend(
    "Util.ProgressMonitor.Shell",
    /**
     * @lends Util.ProgressMonitor.Shell.prototype
     * @private
     */
    {
	/**
	 * Dump progress for an interactive Shell.
	 * @augments Util.ProgressMonitor
	 * @constructs
	 * @param shell
	 * @param severity
	 * @private
	 */
	__constr__: function(/** CLI.Shell */shell, /** Number */severity) {
	    Util.ProgressMonitor.call(this);
	    this.shell = shell;
	    this.severity = severity||Logger.DEBUG3;
	    assert(this.onProgress ===  Util.ProgressMonitor.Shell.prototype.onProgress);
       },

	/**
	 * Notification of progress, this implementation uses println to 
	 * output the text.
	 * @param text
	 * @private
	 */
	onProgress: function(/** String */text) {
	    this.shell.println(text);
	},

	/**
	 * Notification of a message dring the operation, default implementation calls
	 * onProgress.
	 * @param severity
	 * @param text
	 * @private
	 */
	onMessage: function(/** Number */severity, /** String */text) {
	    if (severity <= this.severity) {
		this.shell.println(text);
	    }
	}
    }
);



/**
 * Legacy.
 * @ignore
 */
ProgressMonitor = Util.ProgressMonitor;



//=====================================================================================================
//
// SLList
//
//=====================================================================================================


/**
 * A very simple single linked list implementation.
 * @class
 * @constructor
 */
Util.SLList = function() {
    this.first = null;
    this.last = null;
    this.cnt = 0;
};

/** @private */
Util.SLList.prototype = {
    /**
     * Add object to end of list.
     * @param obj
     */
    add: function(/** Object */obj)  {
	assert(obj);
	var node = new Util.SLList.Node(obj);
	if (!this.first) {
	    this.first = this.last = node;
	} else {
	    this.last.next = node;
	    this.last = node;
	}
	assert(node.obj);
	this.cnt += 1;
    },

    /**
     * @returns {Object} first object in list
     */
    shift: function() {
	var node = this.first;
	if (node === null) {
	    return null;
	}
	assert(node.obj);
	if (this.first === this.last) {
	    assert(this.cnt === 1);
	    this.first = this.last = null;
	} else {
	    this.first = this.first.next;
	}
	this.cnt -= 1;
	return node.obj;
    },

    /**
     * @returns {Number} number of elements in list
     */
    getCnt: function() {
	return this.cnt;
    },

    /**
     * @returns {Number} number of elements in list
     */
    getUsed: function() {
	return this.cnt;
    },

    /**
     * @returns {Boolean} whether list is empty
     */
    isEmpty: function() {
	return this.cnt === 0;
    }
};

/**
 * Element in single linked list.
 * @class
 * @constructor
 * @param obj
 * @private
 */
Util.SLList.Node = function(/** Object */obj) {
    this.obj = obj;
    this.next = null;
};









//=====================================================================================================
//
// JSON
//
//=====================================================================================================



/**
 * @ignore
 * @nodoc
 */
JSON2 = {
   /**
    * Map object to JSON representation.
    * @returns string
    * @type String
    * @ignore
    * @nodoc
    */
   stringify: function(/** Object */o) {
      var escapeable = /["\\\x00-\x1f\x7f-\xff]/g;

      var meta = {
         '\b': '\\b',
         '\t': '\\t',
         '\n': '\\n',
         '\f': '\\f',
         '\r': '\\r',
         '"' : '\\"',
         '\\': '\\\\'
      };

      var quoteString = function(string) {
         if (string.match(escapeable)) {
            string = string.replace(escapeable, function (a) {
               var c = meta[a];
               if (c != undefined) {
                  return c;
               }
               c = a.charCodeAt();
               return '\\u00' + Math.floor(c / 16).toString(16) + (c % 16).toString(16);
            });
         }
         return '"' + string + '"';
      };
      
      if (o === null) {
         return "null";
      }

      var type = typeof(o);
      switch(type) {
       case "undefined": {
          return undefined;
       }
       case 'number':
       case 'boolean': {
          return "" + o;
       }
       case "string": {
          return quoteString(o);
       }
       case 'object': {
          if (o.constructor === Date) {
             return sprintf("\"%04d-%02d-%02dT%02d:%02d:%02d.%3dZ\"", o.getUTCFullYear(), o.getUTCMonth() + 1, o.getUTCDate(),  o.getUTCHours(), o.getUTCMinutes(),  o.getUTCSeconds(), o.getUTCMilliseconds());
          }
          if (o.constructor === Array) {
             var ret = [];
             for (var i = 0; i < o.length; i++) {
                ret.push(JSON2.stringify(o[i]) || "null" );
             }
             return "[" + ret.join(",") + "]";
          }
          var pairs = [];
          for (var k in o) {
             var name;
             var val = o[k];
             if (typeof(val) == "function") {
                continue;
             }
             var t = typeof(k);
             if (t == "number") {
                name = '"' + k + '"';
             } else if (t == "string") {
                name = quoteString(k);
             } else {
                continue;
             }
              pairs.push(name + ":" + (JSON2.stringify(val)||"null"));
          }
          return "{" + pairs.join(", ") + "}";
       }
      default:
         ;
      }
   }
};









//=====================================================================================================
//
// Tree
//
//=====================================================================================================
Class.define(
    "Util.Tree",
    /**
     * @lends Util.Tree.prototype
     */
    {
	/**
	 * Create root node.
	 * @constructs
	 * @param parent Optional
	 * @param data   Optional
	 */
	__constr__: function(/** Util.Tree */parent, /** Object */data) {
	    this.parent = parent?parent:null;
	    this.children = [];
	    this.data = data;
	},

	/**
	 * @returns {Util.Tree}
	 */
	getParent: function() {
	    return this.parent;
	},

	/**
	 * @returns {Util.Tree[]}
	 */
	getChildren: function() {
	    return this.children;
	},

	/**
	 * @returns {Object}
	 */
	getData: function() {
	    return this.data;
	},

	/**
	 * @param data
	 */
	setData: function(/** Object */data) {
	    this.data = data;
	},

	/**
	 * @param data
	 * @returns {Util.Tree}
	 */
	addChild: function(/** Object */data) {
	    var tree = new Util.Tree(this, data);
	    this.children.push(tree);
	    return tree;
	},

	/**
	 * @returns {Util.Tree}
	 */
	getNext: function() {
	    if (this.parent === null) {
		return undefined;
	    }
	    var idx = this.parent.lookupChildIndex(this);
	    return this.parent[idx+1];
	},

	/**
	 * @returns {Util.Tree}
	 */
	getPrev: function() {
	    if (this.parent === null) {
		return undefined;
	    }
	    var idx = this.parent.lookupChildIndex(this);
	    return this.parent[idx-1];
	},

	/**
	 * @returns {Util.Tree}
	 */
	getFirst: function() {
	    return this.children[0];
	},


	/**
	 * @returns {Util.Tree}
	 */
	getLast: function() {
	    return this.children[this.children.length-1];
	},

	/**
	 * @param arr Optional
	 * @returns {Util.Tree[]}
	 */
	getLeafs: function(/** Array */arr) {
	    if (!arr) {
		arr = [];
	    }
	    if (this.children.length===0) {
		arr.push(this);
		return arr;
	    }
	    for (var i = 0; i < this.children.length; i++) {
		arr = this.children[i].getLeafs(arr);
	    }
	    return arr;
	},

	/**
	 * @returns {Util.Tree[]}
	 */
	getPath2Root: function() {
	    var arr = [];
	    var tree = this;
	    while(tree) {
		arr.push(tree);
		tree = tree.parent;
	    }
	    return arr.reverse();
	},

	/**
	 * @param tree
	 * @returns {Number}
	 */
	lookupChildIndex: function(/** Util.Tree */tree) {
	    for (var idx = 0; idx < this.children.length; idx++) {
		if (this.children[idx] ===  tree) {
		    return idx;
		}
	    }
	    return -1;
	},


	/**
	 * @param f
	 */
	visit: function(/** Function */f) {
	    this.children.forEach(function(child) {
		f(child, child.data);
	    });
	    this.children.forEach(function(child) {
		child.visit(f);
	    });
	},


	toString: function(/** Number */indent) {
	    if (!indent) { indent = 4; }
	    var txt = Util.getSpaces(indent) + this.data + "\n";
	    for (var i = 0; i < this.children.length; i++) {
		txt += this.children[i].toString(indent+4);
	    }
	    return txt;
	}
    }
);


    
