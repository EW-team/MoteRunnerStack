//  (C) COPYRIGHT INTERNATIONAL BUSINESS MACHINES CORPORATION 2006-2010
//                       ALL RIGHTS RESERVED
//        IBM Research Division, Zurich Research Laboratory
// --------------------------------------------------------------------


/**
 * Convert camel-case to snake-case, such as camelCase to camel-case or
 * CCamelCaseAnotherATest to ccamel-case-another-atest
 * @param s
 * @returns {String} string in snake-case 
 */
function camel2snakeCase(/** String */s) {
   var r = s.replace(/([^A-Z])([A-Z])/g, "$1-$2");
   var sa = r.split('-');
   for (var i = 0; i < sa.length; i++) {
      sa[i] = sa[i].toLowerCase();
   }
   return sa.join("-");
}


/**
 * Convert snake-case to camel-case, such as camel-case to CamelCase.
 * @param s
 * @param sep   Optional, separation character, by default '_'
 * @returns {String} string in camel case
 */
function snake2camelCase(/** String */s, /** String */sep) {
    if (!sep) {
        sep = "-";
    }
    var sa = s.split(sep);
    assert(sa);
    if (sa.length==0) {
        return s;
    }
    var arr = [];
    for (var i = 0; i < sa.length; i++) {
        arr.push(capitalize(sa[i]));
    }
    return arr.join("");
}


/**
* Capitalize string.
* @param str    String
* @returns {String} capitalized string
*/
function capitalize(/** String */str) {
    if (str.length===0) {
	return str;
    }
    var ret = str[0].toUpperCase();
    if (str.length > 1) {
	ret += str.substr(1);
    }
    return ret;
}


/**
* Reverse string.
* @param str    String to reverse
* @returns {String} reversed string.
*/
function reverseString(/** String */str) {
    var arr = [];
    for (var i = str.length-1; i>= 0; i--) {
	arr.push(str.charAt(i));
    }
    return arr.join('');
}

/**
 * @param str
 * @param prefix
 * @returns {Boolean}
 */
function stringStartsWith(/** String */str, /** String */prefix) {
    return str.indexOf(prefix) === 0;
}

/**
 * @param str
 * @param prefix
 * @returns {Boolean}
 */
function stringEndsWith(/** String */str, /** String */suffix) {
    return str.match(suffix+"$")==suffix;
}



/**
 * @param str
 * @param chunkSize
 * @returns {String[]}
 */
function string2chunks(/** String */str, /** Number */chunkSize) {
    var chunks = [];
    while (str) {
	if (str.length < chunkSize) {
            chunks.push(str);
            break;
	}
	else {
            chunks.push(str.substr(0, chunkSize));
            str = str.substr(chunkSize);
	}
    }
    return chunks;
};




/**
 * Format arguments according to format specification.
 * @param format Printf like format string
 * @param args   variable number of arguments
 * @returns {String} the formatted string
 */
function sprintf (/**String*/format,/**...*/args) {
    return svprintf(arguments[0],1,arguments);
}


/**
 * Format arguments according to format specification. Supported format specifiers
 * are c,d,u,f,o,s,x,X,q,Q (sql string) and H (hex string for binary data).
 * @param format Printf-like format string
 * @param ai     The index of the first argument in the arguments object.
 * @param args   Object holding arguments. First argument is args[ai].
 * @returns {String} the formatted string.
 */
function svprintf (/**String*/fmt,/**int*/ai,/**Object[]*/args) {
    return fmt.replace
    (/%([0\+\-]*)(\d+|\*)?(\.(\d+|\*)?)?(%|c|d|u|f|o|s|x|X|H|q|Q)/g,
     function (match,p1,p2,p3,p4,p5,offset,fullstr) {
	 var flags = p1;
	 var width = p2;
	 var prec  = p4;
	 var type  = p5;

	 /**/ if( width=='*'  ) { width = parseInt(args[ai++]); }
	 else if( width!=null ) { width = parseInt(width); }
	 else                   { width = -1; }

	 /**/ if( prec=='*'  ) { prec = parseInt(args[ai++]); }
	 else if( prec!=null ) { prec = parseInt(prec); }
	 else                  { prec = -1; }

	 if( type=='%' )
	     return "%";

	 var arg = args[ai++];
	 if( arg===undefined )
	     return "(undefined)";
	 if( arg==null ) 
	     return (type === 'Q') ? "NULL" : "(null)";

         switch(type) {
         case 'c':
	     arg = String.fromCharCode(arg);
	     break;
         case 'e':
	     arg = arg.toExponential(prec<0 ? 1 : prec);
	     break;
         case 'f':
	     arg = prec < 0 ? arg.toString() : arg.toFixed(prec);
	     break;
         case 's':
	     if( prec >= 0 )
		 arg = arg.substr(0,prec);
	     break;
         case 'q':
	     if( prec >= 0 )
		 arg = arg.substr(0,prec);
	     arg.replace("'", "''");
	     break;
         case 'Q':
	     if( prec >= 0 )
		 arg = arg.substr(0,prec);
	     arg = "'" + arg.replace("'", "''") + "'";
	     break;
         case 'd':
	     arg = parseInt(arg).toString(10);
	     break;
         case 'u':
	     arg = Math.abs(parseInt(arg));
	     break;
         case 'o':
	     arg = parseInt(arg).toString(8);
	     break;
	 case 'X':
         case 'x':
	     arg = parseInt(arg);
	     if( arg < 0 ) {
		 var p = 0x100000000 + arg; // 32 bit
		 if( p < 0 ) { 
		     p = 0x1000000000000 + arg; // 48 bit
		     if( p < 0 ) {
			 p = 0x10000000000000000 + arg; // 64 bit
		     }
		 }
		 arg = p;
	     }
	     arg = arg.toString(16);
	     if( type=='x' )
		 arg = arg.toLowerCase();
	     else
		 arg = arg.toUpperCase();
	     break;
         case 'H':
	     arg = Formatter.binToHex(arg);
	     break;
         }

	 var str = arg.toString();
	 if( flags.indexOf('+') >= 0 && "duoxXf".indexOf(type) >= 0 && arg >= 0 ) {
	     str = '+'+str;
	 }
	 var len = str.length;
	 if( width > len ) {
	     // Padding
	     var padchar = flags.indexOf('0') >= 0 ? '0':' ';
	     var pad = (new Array(width-len+1)).join(padchar);
	     var alignleft = (flags.indexOf('-') >= 0);
	     if( alignleft && padchar=='0' && str.charAt(0)=='-' && "duoxXf".indexOf(type) >= 0 ) {
		 str = '-'+pad+str.substr(1);
	     } else {
		 str = alignleft ? str+pad : pad+str;
	     }
	 }
	 return str;
     });
}





if ( typeof String.prototype.startsWith != 'function' ) {
    String.prototype.startsWith = function( str ) {
	return this.substring( 0, str.length ) === str;
    };
};

if ( typeof String.prototype.endsWith != 'function' ) {
    String.prototype.endsWith = function( str ) {
	return this.substring( this.length - str.length, this.length ) === str;
    };
};

