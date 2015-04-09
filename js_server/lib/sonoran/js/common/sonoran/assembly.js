//  (C) COPYRIGHT INTERNATIONAL BUSINESS MACHINES CORPORATION 2006-2010
//                       ALL RIGHTS RESERVED
//        IBM Research Division, Zurich Research Laboratory
// --------------------------------------------------------------------

//---------------------------------------------------------------------------------------------------------------
//
// AsmName
//
//---------------------------------------------------------------------------------------------------------------

/**
 * Sonoran.AsmName encapsulates name, version and build information of a Mote Runner assembly.
 * An assembly has a name, major version, minor version and build identifier; Sonoran.AsmName encapsulates
 * this information (where build might be an optional attribute) and also carries a property 'identity' which carries
 * this information in an unique string.
 * Sonoran.AsmName can also be used create a filter for assembly identities:
 * "asm-#.#"  (match assemblies name 'asm'),
 * "asm-1.#"  (match all assemblies named 'asm' and major number 1),
 * "asm-1.3"  (all builds of assembly named 'asm' and version 1.3), 
 * "asm-1.3+" (all builds of assembly named 'asm' and version 1.3 or higher minor), 
 * "asm-1.3.12345" (specific build of assembly 'asm', version 1.3).
 * @class
 * @see Sonoran.AsmName.match
 * @see Sonoran.AsmName.filterMatch
 * @constructor 
 * @param args      Sonoran.AsmName (or subclass), a String, or 3-4 individual parameters (String:name, Number:major, Number:minor[, Number:build])
 *                  If only one string is specified is must have the form NAME-MAJOR.MINOR or NAME-MAJOR.MINOR.BUILD.
 */
Sonoran.AsmName = function(/** Sonoran.AsmName|Sonoran.Assembly|String */args) {
   if (args instanceof Sonoran.AsmName) {
      this.name  = args.name;
      this.major = args.major;
      this.minor = args.minor;
      this.build = args.build;
      this.orBetter = args.orBetter;
   } else if (typeof(args) == 'string' && arguments.length==1 ) {
       var md = new RegExp("^"+Sonoran.AsmName.IDENTITY_REGEXP+"$").exec(args);
       if( !md ) {
	   // Parse AsmName filter specifier
	   md = /^(.+)\-(\d+|#)\.(#|(\d+)(\+))?$/.exec(args);
           if (!md) {
               this.name = args;
	       this.major = null;
	       this.minor = null;
	       this.build = null;
	       this.orBetter = false;
           } else {
	       if (md[2]=="#" && md[3]!="#")
	           throw "Illegal assembly identity syntax: "+args;
	       this.name  = md[1]; 
	       this.major = md[2]=='#' ? null : parseInt(md[2], 10);
	       this.minor = md[3]=='#' ? null : parseInt(md[4], 10);
	       this.build = null;
	       this.orBetter = (md[5]!=null);  // for filters only
           }
       } else {
	   this.name  = md[1]; 
	   this.major = parseInt(md[2], 10);
	   this.minor = parseInt(md[3], 10);
	   this.build = md[5] ? parseInt(md[5], 10) : null;
       }
   } else {
       this.name  = arguments[0];
       this.major = arguments[1];
       this.minor = arguments[2];
       if( arguments[3] == '+' ) {  // no build specified but orBetter filter pattern
	   this.build = null;
	   this.orBetter = true;
       } else {
	   this.build = arguments[3];
       }
   }
   this.identity =  this.toStringNoBuild();
   if (this.build) {
      this.identity += sprintf(".%05d", this.build);
   }
   if (this.name==null || this.major >= 256 || this.minor >= 256 || (this.build!=null && this.build>=65536) ) {
       throw "Illegal assembly identity: "+this.identity;
   }
};


/** Prototype */
Sonoran.AsmName.prototype = {
   /** @ignore */
   __constr__: "Sonoran.AsmName",
   /**
    * Assembly name.
    * @type String
    */
   name: null,
   /**
    * Assembly major version.
    * @type Integer
    */
   major: null,
   /**
    * Assembly minor version.
    * @type Integer
    */
   minor:null,
   /**
    * Assembly build identifier.
    * This number uniquely identifies a specific build for this
    * major/minor version of the assembly. If absent this value is null.
    * @type Integer
    */
   build: null,
   /**
    * Flag indicating filter property.
    * @type Boolean
    * @private
    */
   orBetter: false,
   /**
    * Unique assembly string, i.e. the basename of the assembly file.
    * @type String
    */
   identity: null,

   /**
    * @returns {String} the identity string of the assembly (name-major.minor.build).
    */
   toString: function () {
      return this.identity;
   },

   /**
    * @returns {String} the identity string of the assembly without build number (name-major.minor).
    */
   toStringNoBuild: function () {
       return sprintf("%s-%s.%s%s",
		      this.name,
		      this.major==null ? '#' : this.major,
		      this.minor==null ? '#' : this.minor,
		      this.orBetter ? "+" : "");
   },

   /**
    * Check if this assembly identity matches an assembly item.
    * @param item   an assembly item (or subclass thereof).
    * @returns {String} null if filter does not match or a string representing the quality of the
    *   match. The returned string is suitable for comparisions. Alpabetically higher values represent
    *   better matches. A match is better if it has a higher major or minor number, or if the modification
    *   time in case of a {@link Sonoran.Resource.Assembly} is higher (younger file).
    */
    match: function(/** Sonoran.AsmName */item) {
	if( this.name != item.name ||
	    (this.major != null &&  this.major != item.major) ||
	    (this.minor != null &&  (this.orBetter ? (this.minor > item.minor) : (this.minor != item.minor))) ||
	    (this.build != null &&  this.build != item.build) )
	    return null; // no match
	// Calculate quality of match. Can do comparisions on results.
	return sprintf("%02X-%02X-%016X",
		       item.major, item.minor,
		       (item instanceof Sonoran.Resource.Assembly ? item.getFileStats().mtime : 0));
    }
};


/**
 * Change quoting of an assembly name.
 * First string any quoting and reapply quoting with new set of chars.
 * If extra chars is absent or null the it defaults to the following set which makes
 * the string safe for use in filenames:
 *      :, /, \, ', " (colon, slash, backslash, single quote, double quote).
 * @param name    Quotes assembly identity.
 * @param xquotes Additional chars on top of non-printable ASCII chars to be quoted
 *                (if absent defaults to file safe char set).
 * @returns {String} requoted assembly identity
 */
Sonoran.AsmName.requoteName = function (/**String*/name, /**String*/xquotes) {
    return Sonoran.AsmName.quoteName(Sonoran.AsmName.unquoteName(name.toString()), "\\/:\"'");
};


/**
 * Remove quoting from an assembly identifier.
 * @returns {String} unquoted binary name
 */
Sonoran.AsmName.unquoteName = function (/**String*/name) {
    return name.toString().replace(/%[0-9A-Fa-f]{2}/g,
				   function (match, p1, p2, offset, str) {
				       return String.fromCharCode(parseInt(match.substr(1),16));
				   });
};


/**
 * @returns {Boolean} if identity marks a valid assembly identity
 */
Sonoran.AsmName.isAsmIdentity = function(/** String */identity) {
    return (new RegExp("^"+Sonoran.AsmName.IDENTITY_REGEXP+"$")).test(identity);
};


/**
 * Quote the given assembly name so that it can be safely displayed.
 * The name is treated as a sequence of bytes.
 * All bytes representing non printable ASCII chars are quoted by %HH where
 * HH is the ASCII encoding of the character.
 * @param name    The name of the assembly. A binary string of bytes of upto 16 chars.
 * @param xquotes (OPTIONAL) More chars to quote.
 * @returns {String} quoted name
 */
Sonoran.AsmName.quoteName = function (/**String*/name, /**String*/xquotes) {
    var re;
    if( xquotes!=null ) {
	xquotes = xquotes.replace(/[-\\\[\]]/g, "\\$&");
	re = new RegExp("["+xquotes+"%\\u0000-\\u001F\\u007F-\\uFFFF]","g");
    } else {
	re = /[%\u0000-\u001F\u007F-\uFFFF]/g;
    }
    name = name.toString();
    var r = '';
    var i = name.lastIndexOf('-');
    if( i > 0 ) {
	r = name.substr(i);
	name = name.substr(0,i);
    }
    return name.replace(re,
			function (match, p1, p2, offset, str) {
			    var code = match.charCodeAt(0);
			    return "%"+
				"0123456789ABCDEF".charAt((code>> 4)&0xF)+
				"0123456789ABCDEF".charAt( code     &0xF);
			})
	+ r;
};


/**
 * Regular expression matching an assembly where major, minor and optionally build are specified.
 * @type String
 * @constant
 */
Sonoran.AsmName.IDENTITY_REGEXP = "(.+)\\-(\\d+)\\.(\\d+)(\\.(\\d+))?";


/**
 * Regular expression for an assembly filter.
 * @type String
 * @constant
 */
Sonoran.AsmName.FILTER_REGEXP = "^(.+)\\-(\\d+|#)\\.(#|(\\d+)(\\+))?$";


/**
 * Return value for compare: both assembly names are identical including build number.
 * @type Number
 * @constant
 * @see Sonoran.AsmName.compare
 */
Sonoran.AsmName.SAME_BUILD   = 4;


/**
 * Return value for compare: assembly names and versions are identical but build number differs.
 * @type Number
 * @constant
 * @see Sonoran.AsmName.compare
 */
Sonoran.AsmName.SAME_MINOR   = 3;


/**
 * Return value for compare: assembly names and major versions are identical but different minor numbers.
 * @type Number
 * @constant
 * @see Sonoran.AsmName.compare
 */
Sonoran.AsmName.SAME_MAJOR   = 2;


/**
 * Return value for compare: assembly names are identical but major versions.
 * @type Number
 * @constant
 * @see Sonoran.AsmName.compare
 */
Sonoran.AsmName.SAME_NAME    = 1;


/**
 * Return value for compare: assembly names are different.
 * @type Number
 * @constant
 * @see Sonoran.AsmName.compare
 */
Sonoran.AsmName.DIFFERENT    = 0;


/**
 * Compare two assembly names.
 * Use the result value in the following way:
 * <pre>
 *  Sonoran.AsmName.compare(a1,a2) >= Sonoran.AsmName.SAME_MINOR
 * </pre>
 * to express that two names should have at least the same minor or even the same build.
 * @param a1 assembly name or assembly object
 * @param a2 assembly name or assembly object
 * @returns {Number} one of the values (having descending values): SAME_BUILD, SAME_MINOR, SAME_MAJOR, SAME_NAME, DIFFERENT
 * @see Sonoran.AsmName.SAME_BUILD
 * @see Sonoran.AsmName.SAME_MINOR
 * @see Sonoran.AsmName.SAME_MAJOR
 * @see Sonoran.AsmName.SAME_NAME
 * @see Sonoran.AsmName.DIFFERENT
 */
Sonoran.AsmName.compare = function(/** Sonoran.AsmName */a1, /** Sonoran.AsmName */a2) {
    if( a1.name != a2.name )
	return Sonoran.AsmName.DIFFERENT;
    if( a1.major != a2.major )
	return Sonoran.AsmName.SAME_NAME;
    if( a1.minor != a2.minor )
	return Sonoran.AsmName.SAME_MAJOR;
    if( a1.build != a2.build )
	return Sonoran.AsmName.SAME_MINOR;
    return Sonoran.AsmName.SAME_BUILD;
};


/**
 * Return subset of items which share with the given assembly identity or any of the given assembly identities.
 * @param sameness one of the values (having descending values): SAME_BUILD, SAME_MINOR, SAME_MAJOR, SAME_NAME, DIFFERENT
 * @param asmname the assembly identity or identities to compare against all items
 * @param items   list of assembly name of subclasses thereof.
 * @returns {Sonoran.AsmName[]} subset of input items.
 */
Sonoran.AsmName.filterCompare = function(/** Number */sameness, /** Sonoran.AsmName|Sonoran.AsmName[] */asmname, /** Sonoran.AsmName[] */items) {
    if( asmname instanceof Array )
	return items.filter(function (i) { return asmname.some(function (a) { return Sonoran.AsmName.compare(i,a) >= sameness; }); });
    else 
	return items.filter(function (i) { return Sonoran.AsmName.compare(i,asmname) >= sameness; });
};


/**
 * Return subset of items which do not share with the given assembly identity or with any of the given assembly identities.
 * @param sameness one of the values (having descending values): SAME_BUILD, SAME_MINOR, SAME_MAJOR, SAME_NAME, DIFFERENT
 * @param asmname the assembly identity or identities to compare against all items
 * @param items   list of assembly name of subclasses thereof.
 * @returns {Sonoran.AsmName[]} subset of input items.
 */
Sonoran.AsmName.filterOutCompare = function(/** Number */sameness, /** Sonoran.AsmName|Sonoran.AsmName[] */asmname, /** Sonoran.AsmName[] */items) {
    if( asmname instanceof Array )
	return items.filter(function (i) { return !asmname.some(function (a) { return Sonoran.AsmName.compare(i,a) >= sameness; }); });
    else 
	return items.filter(function (i) { return Sonoran.AsmName.compare(i,asmname) < sameness; });
};


/**
 * Return all items matching filters in the order of match quality.
 * Highest quality first.
 * @param filter      an assemby name acting as a filter or an array thereof.
 * @param items       an array of assembly items (or subclasses thereof).
 * @returns {Sonoran.AsmName[]}
 *   A subset of the input items. Return empty array if no matches.
 */
Sonoran.AsmName.filterMatch = function(/** Sonoran.AsmName|Sonoran.AsmName[] */filter, /** Sonoran.AsmName[] */items) {
    var matches = [];
    for( var ii=0; ii<items.length; ii++ ) {
	var ia = items[ii];
	if( filter instanceof Array ) { 
	    for( var fi=0; fi < filter.length; fi++ ) {
		var q = filter[fi].match(ia);
		if( q!=null ) {
		    matches.push({e:ia,q:q});
		    break;
		}
	    }
	} else {
	    var q = filter.match(ia);
	    if( q!=null ) {
		matches.push({e:ia,q:q});
	    }
	}
    }
    matches.sort(function(a,b) {
		     if( a.q==b.q ) return 0;
		     return a.q < b.q ? 1 : -1;
		 });
    for( var ii=0; ii<matches.length; ii++ ) {
	matches[ii] = matches[ii].e;
    }
    return matches;
};


/**
 * Return an array with all assembly items removes that match the filter or any of the filter if an array is passed in.
 * @param filter      an assembly name acting as a filter or an array thereof.
 * @param items       an array of assembly items (or subclasses thereof).
 * @returns {Sonoran.AsmName[]}
 *   A new array possiblty a subset of the input items.
 */
Sonoran.AsmName.filterOutMatch = function(/** Sonoran.AsmName|Sonoran.AsmName[] */filter, /** Sonoran.AsmName[] */items) {
   if( filter instanceof Array )
      return items.filter(function (ia) { return !filter.some(function (f) { return f.match(ia)!=null; }); });
   else
      return items.filter(function (ia) { return filter.match(ia)==null; });
};


//---------------------------------------------------------------------------------------------------------------
//
// Assembly
//
//---------------------------------------------------------------------------------------------------------------

/**
 * Sonoran.Assembly represents a Mote Runner binary asssembly (data of a sba file). Use
 * the subclass Sonoran.Resource.Assembly to load an assembly from the filesystem.
 * @see Sonoran.Resource.Assembly
 * @class
 * @augments Sonoran.AsmName
 * @param bytes      SBA binary data, a Sonoran.AsmName instance, an assembly name or an assembly identity
 */
Sonoran.Assembly = function(/** String */bytes) {
   assert(arguments.length==1);
   this.magic = 0;
   this.lffVersion = 0;
   this.numIniObjs = 0;
   this.imageSize = 0;
   this.idataSize = 0;
   this.imports = null;
   this.parse(bytes);
};

/** @private */
Sonoran.Assembly.prototype = extend(
   Sonoran.AsmName.prototype,
   /** @lends Sonoran.Assembly.prototype */
   {
      /**
       * @ignore
       */
      __constr__: "Sonoran.Assembly",

      /**
       * Binary data of assembly.
       * @type String
       * @private
       */
      bytes: null,

      /**
       * Magic.
       * @type Number
       * @private
       */
      magic: 0,

      /**
       * Load file format version.
       * @type Number
       * @private
       */
      lffVersion: 0,

      /**
       * Number of initialized objects.
       * @type Number
       * @private
       */
      numIniObjs: 0,

      /**
       * Size of image after linking.
       * @type Number
       * @private
       */
      imageSize: 0,

      /**
       * Size of initialized objects data.
       * @type Number
       * @private
       */
      idataSize: 0,

      /**
       * The identities of all imported assemblies.
       *  @type Sonoran.AsmName[]
       * @private
       */
      imports: null,

      /**
       * @returns {String} assembly binary data (i.e. the sba data)
       */
      getBytes: function() {
         return this.bytes;
      },
      
      /**
       * Return the load file format version.
       * @returns {Number} the load file format version.
       */
      getLoadFileFormatVersion: function() {
         return this.lffVersion;
      },

      /**
       * @returns {Number} number of initialized objects.
       * @type Number
       */
      getNumInitObjs: function() {
         return this.numIniObjs;
      },

      /**
       * @returns {Number} size of image after linking.
       */
      getImageSize: function() {
         return this.imageSize;
      },
      
      /**
       * @returns {Number} Size of initialized objects data.
       */
      getInitObjsSize: function() {
         return this.idataSize;
      },

      /**
       * @returns {Sonoran.AsmName[]} the identities of all imported assemblies.
       *   This returns AsmName objects initialized as filter objects. They specify
       *   the name, major, and minor numbers of the import dependency plus the filter
       *   option or better minor.
       */
      getImports: function() {
         return this.imports;
      },
      
      /**
       * Check if this assembly has a dependency on the specified assembly identity.
       * @param asmname assembly identity to link to.
       * @returns {String} A non-null string if this assembly would link to the specified assembly identity.
       *     This means that asmname is referenced in the import list of this assembly.
       *     The string encodes the quality of the match.
       *     If there is not match return null.
       * @see Sonoran.AsmName.match
       */
      linksTo: function (/** Sonoran.AsmName */asmname) {
	  for( var ai=0; ai<this.imports.length; ai++ ) {
	      var s = this.imports[ai].match(asmname);
	      if( s ) return s;
          }
          return null;
      },

      /**
       * Return assembly information.
       * @returns {String} a multiline string describing properties of the assembly.
       */
      getInfo: function () {
         return sprintf("Magic               : %08X\n"+
		        "Load file version   : %u.%u\n"+
		        "Ini objects         : %u\n"+
		        "Image size          : %u bytes\n"+
		        "Ini data size       : %u bytes\n"+
		        "Assembly identity   : %s-%u.%u (build %u=0x%04X)\n"+
		        "Import dependencies : %s\n"+
		        "",
		        this.magic,
		        (this.lffVersion>>8), this.lffVersion&0xFF,
		        this.numIniObjs,
		        this.imageSize,
		        this.idataSize,
		        this.name, this.major, this.minor, this.build, this.build,
		        this.imports.join(" "));
      },

      /**
       * @private
       */
      parse: function(bytes) {
         if (this.imports!=null) {
            throw "Sonoran.Assemply.parse(): already invoked before";
         }
         var ex, len, dpos=0;
         try {
	    var name, major, minor, build;

            var arr = Formatter.unpack("4u2u1u1u2u2u?", bytes, 0 );
            this.magic = arr[0];      // 4
            this.lffVersion = arr[1]; // 2
            this.numIniObjs = arr[2]; // 1
            this.numImports = arr[3]; // 1
            this.imageSize  = arr[4]; // 2
            this.idataSize  = arr[5]; // 2
            dpos = arr[6];
            
	    this.imports = new Array(this.numImports);
	    for( var i=0; i<this.numImports; i++ ) {
               arr = Formatter.unpack("1u1u1u<d?", bytes, dpos);
               minor = arr[0];
               major = arr[1];
               len = arr[2];
               name = arr[3];
               dpos = arr[4];
	       this.imports[i] = new Sonoran.AsmName(name,major,minor,"+");
	    }
            
            arr = Formatter.unpack("1u1u1u<d?", bytes, dpos);
            minor = arr[0]; // 1
            major = arr[1]; // 1
            len = arr[2];
            name = Sonoran.AsmName.quoteName(arr[3]);  // N
            dpos = arr[4];
            
	    if( this.numIniObjs > 0 ) {
	       for( var i=0; i<this.numIniObjs; i++ ) {
		  // Skip initialization data
	          arr = Formatter.unpack("2u", bytes, dpos);
                  len = arr[0];
	          dpos += 2 + (len & 0x3FFF) * (
		     len >= 0xC000 ? 2 :     // cref
		     len >= 0x8000 ? 4 :     // long
		     len >= 0x4000 ? 2 : 1); // int / byte
                  
	       }
	    }
	    arr = Formatter.unpack("2u", bytes, dpos);
            build = arr[0];
         } catch (ex) {
	    throw "Cannot parse assembly file (offset "+dpos+"): "+ex;
         }

         if (this.name) {
            if (this.name != name) {
               throw sprintf("Name mismatch for assembly %s: file name %s != content %s", this.name, this.name, name);
            }
            if (this.major != major) {
               throw sprintf("Name mismatch for assembly %s: file major %d != content %d", this.name, this.major, major);
            }
            if (this.minor != minor) {
               throw sprintf("Name mismatch for assembly %s: file minor %d != content %d", this.name, this.minor, minor);
            }
            if (this.build) {
               if (this.build != build) {
                  throw sprintf("Name mismatch for assembly %s: file build %d != content %d", this.name, this.build, build);
               }
            } else {
               this.build = build;
            }
         } else {
            Sonoran.AsmName.call(this, name, major, minor, build);
         }

         this.bytes = bytes;
         if( this.magic != Sonoran.Assembly.MAGIC ) {
	    throw sprintf("Invalid magic: %08X - expecting %08X", this.magic, Sonoran.Assembly.MAGIC);
         }
         this.imageSize *= SaguaroDEFS.ALIGN_SIZEINFO;  // convert to bytes
         this.idataSize *= SaguaroDEFS.ALIGN_SIZEINFO;  // ditto
      }
   }
);
   
/**
 * Sonoran assembly MAGIC constant.
 * @type Number
 * @constant
 */
Sonoran.Assembly.MAGIC = 0x5EEDCA5E;

/**
 * @param {Sonoran.Assembly[]} assemblies List of assemblies to load onto a mote.
 * @returns {Sonoran.Assembly[]}
 *     Same array sorted so that assemblies dependent on others
 *     get listed later. The order of unrelated assemblies is unspecified.
 * @see Sonoran.Assembly.linksTo
 */
Sonoran.Assembly.sortByLoadOrder = function (/** Sonoran.Assembly[] */ assemblies) {
    if( assemblies.length <= 1 )
	return;
    var sorted = [];
    var rest = assemblies.splice(0);
    while( rest.length > 0 ) {
	var re = null;
	for( var ri=0; ri<rest.length; ri++ ) {
	    re = rest[ri];
	    for( var qi=0; qi<rest.length; qi++ ) {
		var qe = rest[qi];
		if( ri != qi && re.linksTo(qe) ) {
		    re = null;
		    break;
		}
	    }
	    if( re != null ) {
		sorted.push(re);
		rest.splice(ri,1);
		break;
	    }
	}
	if( re==null )
	    throw "Cyclic dependencies in assembly load list: "+assemblies.join(" "); // Unlikely to happen
    }
    for( var ei=0; ei<sorted.length; ei++ )
	assemblies[ei] = sorted[ei];
}




//---------------------------------------------------------------------------------------------------------------
//
// AsmEntry
//
//---------------------------------------------------------------------------------------------------------------

/**
 * Sonoran.AsmEntry represents an assembly entry in an assembly listing of a mote.
 * @class
 * @augments Sonoran.AsmName
 * @param asmname   Assembly name
 * @param asmid     Assembly id on mote
 * @param flags     optional, flag of value 0x80 means constructor failed
 * @param asmobj    optional, object reference to assembly object in saguaro
 */
Sonoran.AsmEntry = function(/** Sonoran.AsmName */asmname, /** Number */asmid, /** Number */flags, /** String */asmobj) {
    assert(asmname instanceof Sonoran.AsmName, "API change: expecting Sonoran.AsmName to be first parameter");
    Sonoran.AsmName.call(this, asmname);
    assert(asmid>=0);
    this.asmid = asmid;
    this.flags = flags?flags:0;
    this.asmobj = asmobj;
};

/** Prototype */
Sonoran.AsmEntry.prototype = extend(
   Sonoran.AsmName.prototype,
   /** @lends Sonoran.AsmEntry.prototype */
   {
      /**
       * @ignore
       */
      __constr__: "Sonoran.AsmEntry",
      /**
       * Id of assembly on mote.
       * @type Number
       * @private
       */
      asmid: null,
      /**
       * Flags
       * @type Number
       * @private
       */
      flags: 0,
      
      /**
       * @returns {String} string
       */
      toString: function() {
          var s = sprintf("%s(a:%02X)", this.identity, this.asmid);
          if (this.asmobj) {
              s += this.asmobj;
          }
	  return s;
      },
      
      /**
       * @returns {Number} assembly id.
       */
      getId: function() {
         return this.asmid;
      },
      
      /**
       * @returns {String} assembly object reference.
       */
      getObj: function() {
          return this.asmobj;
      },

       /**
       * @returns {Number} assembly flags.
       */
      getFlags: function() {
         return this.flags;
      },
      
      /**
       * Returns true if parameter points to same name, version, build and assembly id on mote.
       * @returns {Boolean} boolean
       */
      equals: function(/** Sonoran.AsmEntry */other) {
         return (this.asmid==other.asmid && this.flags==other.flags && Sonoran.AsmName.compare(this, other)==Sonoran.AsmName.SAME_BUILD);
      }
   }
);



//---------------------------------------------------------------------------------------------------------------
//
// AsmListing
//
//---------------------------------------------------------------------------------------------------------------

/**
 * Sonoran.AsmListing encapsulates an assembly listing of a mote.
 * @class
 *  @param mote         The mote
 *  @param origin       'saguaro' or 'moma'
 *  @param entries      Optional
 */
Sonoran.AsmListing = function(/** Sonoran.Mote */mote, /** String */origin, /** Sonoran.AsmEntry[]  */entries) {
    assert(origin=='moma'||origin==='saguaro');
    this.mote = mote;
    this.entries = entries||[];
    this.timestamp = Clock.get();
    this.outdated = false;
    this.origin = origin;
};

/** Prototype */
Sonoran.AsmListing.prototype = {
   /**
    * @ignore
    */
   __constr__: "Sonoran.AsmListing",
   /**
    * The mote.
    * @type Sonoran.Mote
    * @private
    */
   mote: null,
   /**
    * The assembly entries.
    * @type Sonoran.AsmEntry[]
    * @private
    */
   entries: null,
   /**
    * Timestamp of last update
    * @type Number
    * @private
    */
   timestamp: null,
   /**
    * Listing still valid?
    * @type Boolean
    * @private
    */
   outdated: false,
         
   /**
    * @returns {Sonoran.Mote} the mote
    */
   getMote: function() {
      return this.mote;
   },
   
   /**
    * @returns {Sonoran.AsmEntry[]} the entries
    */
   getEntries: function() {
      return this.entries;
   },
   
   /**
    * @param asmid   Id of assembly entry on mote
    * @returns {Sonoran.AsmEntry} the entry for this id or null
    */
   getEntryById: function(/** Number */asmid) {
      var len = this.entries.length;
      for (var i = 0; i < len; i++) {
         var e = this.entries[i];
         if (e.asmid === asmid) {
            return e;
         }
      }
      return null;
   },
   
   /**
    * @returns {Boolean} the outdated flag
    */
   isOutdated: function() {
      return this.outdated;
   },

   /**
    * Updates outdated flag and fires update event if state has changed.
    * @param flag   Optional, default is true
    * @returns {Boolean} whether state has changed
    */
   setOutdated: function(flag) {
       if (flag===undefined) {
           flag = true;
       }
       assert(flag===true||flag===false);
       if (this.outdated !== flag) {
           this.updateListing(this.entries, Sonoran.ASSEMBLIES_REFRESH, flag);
           return true;
       }
       return false;
   },


    /**
     * Return kind of assembly listing, 'saguaro' means this is a listing updated by
     * simulation events, 'moma' means this listing is updated by MOMA actions.
     */
    getOrigin: function(/** String */) {
        return this.origin;
    },

    /**
     * Return matching assembly entries.
     * @returns {Sonoran.AsmEntry[]} matches
     */
    getMatchingEntries: function(/** Sonoran.AsmName */filter) {
        return Sonoran.AsmName.filterMatch(filter, this.entries);
    },
    
   
   /**
    * Add assembly to listing. Fires mote update event.
    * @param newAsmId     If for assembly on mote
    * @param newAsmName   Name of new assembly
    * @param newAsmObj    Assembly object id string, optional
    * @returns {Sonoran.AsmEntry} the newly created assembly entry
    */
   onAdd: function(/** Number */newAsmId, /** AsmName|Assembly */newAsmName, /** String */newAsmObj) {
      var entries = this.entries;
      if (newAsmName instanceof Sonoran.Assembly) {
	 newAsmName = new Sonoran.AsmName(newAsmName);
      }
      var e = new Sonoran.AsmEntry(newAsmName, newAsmId, 0, newAsmObj);
      var i = 0;
      for (; i < entries.length; i++) {
	 if (entries[i].getId() === newAsmId) {
	    entries[i] = e;
	    break;
	 }
      }
      if (i === entries.length) {
	 entries.push(e);
      }
      this.updateListing(entries, Sonoran.ASSEMBLIES_LOAD);
      return e;
   },

    /**
     * Remove an assembly from this listing. Fires event if assembly has been listed before.
     * @param asmid               Assembly id on mote
     * @returns {Sonoran.AsmEntry} entry if it exists for this id and has been removed
     */
    onRemove: function(/** Number */asmid) {
       var entries = this.entries;
       for (var i = 0; i < entries.length; i++) {
	  if (entries[i].getId() === asmid) {
	     var entry = entries.splice(i, 1)[0];
             this.updateListing(entries, Sonoran.ASSEMBLIES_DELETE);
	     return entry;
	  }
       }
       return null;
    },

    /**
     * Update listing. Fires assemblies event.
     * @param assemblies
     */
    onListing: function(/** Sonoran.AsmEntry[] */entries) {
       if (entries.length===0) {
	  Logger.debug(sprintf("Received empty assembly listing for mote %s", this));
       }
        this.updateListing(entries, Sonoran.ASSEMBLIES_REFRESH);
    },

   /**
    * Set listing, update outdated flag and timestamp, fire update event.
    * @private
    */
    updateListing: function(/** Sonoran.AsmEntry[] */entries, /** Sting */reason, /** Boolean */outdated) {
        this.entries = entries;
        this.outdated = (outdated!==undefined) ? outdated : false;
        this.timestamp = Clock.get();
        //Sonoran.Registry.signalEvent(new Sonoran.Event.Mote.Assemblies(this.mote, this, reason));
	Sonoran.Registry.signalEvent(Sonoran.createAssembliesEvent(this.mote, this, reason));
    },




   /**
    * @returns {String} String (table with mote, outdated, state, assembly ids, versions and names).
    */
   toString: function() {
       var table = new Formatter.Table2(7);
       table.setTitle("Mote-Id", "Outdated", "State", "Assembly", "Id", "Version", "Mote-Address");
       this.toTable(table);
       return table.render().join("\n");
   },


   /**
    * Add string representation to specified Util.Formatter.Table (which must have a header with
    * "Mote-Id", "Outdated", "State", "Assembly", "Id", "Version", "Mote-Address").
    * @param table
    */
    toTable: function(/** Util.Formatter.Table2 */table) {
	assert(table instanceof Formatter.Table2);
        var mote = this.mote;
        var uniqueid = mote.getUniqueid();
        var addrs = mote.getAddresses();
        var entries = this.entries;
	var y = table.getRowCnt();
        if (entries.length==0) {
	    table.setValue(0, y, uniqueid);
	    table.setValue(1, y, "*");
	    table.setValue(2, y, "ERR");
	    table.setValue(6, y, addrs[0]);
	    y += 1;
	    for (var j = 1; j < addrs.length; j++) {
		table.setValue(6, y, addrs[j]);
		y += 1;
            }
        } else {
	    for (var j = 0; j < entries.length; j++) {
	        var e = entries[j];
		table.setValue(0, y, (j!=0) ? "" : uniqueid);
		table.setValue(1, y, (j==0&&this.outdated) ? "*" : "");
		table.setValue(2, y, e.flags?"ERR":"OK");
		table.setValue(3, y, e.name);
		table.setValue(4, y, e.asmid);
		table.setValue(5, y, sprintf("%d.%d.%05d", e.major, e.minor, e.build));
		table.setValue(6, y, (j<addrs.length) ? addrs[j] : "");
		y += 1;
	    }
	    for (var j = entries.length; j < addrs.length; j++) {
		table.setValue(6, y, addrs[j]);
		y += 1;
            }
        }
    }

};





/**
 * Returns a map of assembly listings (as text) to array of motes which share that listing.
 * @param motes
 * @returns {Object}
 */
Sonoran.AsmListing.sortFor = function(/** Sonoran.Mote[] */motes) {
    var text2uuids = {};
    motes.forEach(function(mote) {
	var s = "";
	//QUACK(0, "ENTRIES: " + mote.getAssemblies().getEntries().join(","));
	var asmListing = mote.getAssemblies();
	asmListing.getEntries().forEach(function(e) {
	    s += sprintf("%d: %s-%d.%d\n", e.getId(), e.name, e.major, e.minor);
	});
	//QUACK(0, "L: " + s);
	if (!text2uuids[s]) {
	    text2uuids[s] = [];
	}
	text2uuids[s].push(mote.getUniqueid());
    });
    return text2uuids;    
};

