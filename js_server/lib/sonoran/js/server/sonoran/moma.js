//  (C) COPYRIGHT INTERNATIONAL BUSINESS MACHINES CORPORATION 2006-2010
//                       ALL RIGHTS RESERVED
//        IBM Research Division, Zurich Research Laboratory
// --------------------------------------------------------------------





/**
 * @type String[]
 * @constant
 * @private
 */
Sonoran.MOMA.SEARCH_PATHS  = [];

/**
 * Return additional search paths for moma-load etc.
 * @returns {String[]}
 * @private
 */
Sonoran.MOMA.getSearchPaths = function() {
    return Sonoran.MOMA.SEARCH_PATHS;
};


/**
 * Set additional search paths for moma-load
 * @param searchPaths
 * @private
 */
Sonoran.MOMA.setSearchPaths = function(/** String[] */searchPaths) {
    Sonoran.MOMA.SEARCH_PATHS = searchPaths;
};


/**
 * Delete error status code.
 *  @type Number
 *  @constant
 */
Sonoran.MOMA.ERROR_INVALID_ASSEMBLY = 100;


/**
 * Load error status code.
 *  @type Number
 *  @constant
 */
Sonoran.MOMA.ERROR_DEPENDENT_ASSEMBLIES = 101;


/**
 * Load error status code.
 *  @type Number
 *  @constant
 */
Sonoran.MOMA.ERROR_BUILTIN_ASSEMBLY = 102;


/**
 * MOMA loader version.
 * @type Number
 * @constant
 */
Sonoran.MOMA.LOADER_VERSION = 0;





/**
 * MOMA default timeout.
 * @type Number
 * @constant
 */
Sonoran.MOMA.DFLT_TIMEOUT = 3000;


/**
 * Default dust MOMA timeout.
 * @type Number
 * @constant
 */
Sonoran.MOMA.DUST_TIMEOUT = 5000;




/**
 * MOMA default timeout for reset operations.
 * @type Number
 * @constant
 */
Sonoran.MOMA.DFLT_RESET_TIMEOUT = 10000;

/**
 * MOMA default timeout for reset operations.
 * @type Number
 * @constant
 */
Sonoran.MOMA.DUST_RESET_TIMEOUT = 60000;


/**
 * MOMA default loader chunksize.
 * @type Number
 * @constant
 */
Sonoran.MOMA.DFLT_LOADER_CHUNKSIZE = 100; 

/**
 * MOMA default loader chunksize.
 * @type Number
 * @constant
 */
Sonoran.MOMA.DUST_LOADER_CHUNKSIZE = 60; 



/**
 * Loader rounds all image size to a multiple of this size
 * @type Number
 * @constant
 */
Sonoran.MOMA.LOADER_IMAGE_GRAIN = 512;

/**
 * Loader rounds all image size to a multiple of this size
 * @type Number
 * @constant
 */
Sonoran.MOMA.LOADER_PHEAP_GRAIN = 256;





OPTIONS.add("Sonoran.MOMA.DFLT_LOADER_CHUNKSIZE", "int", "bytes");
OPTIONS.add("Sonoran.MOMA.DFLT_TIMEOUT", "int", "milliseconds");
OPTIONS.add("Sonoran.MOMA.DFLT_RESET_TIMEOUT", "int", "milliseconds");

OPTIONS.add("Sonoran.MOMA.DUST_TIMEOUT", "int", "milliseconds");
OPTIONS.add("Sonoran.MOMA.DUST_LOADER_CHUNKSIZE", "int", "bytes");
OPTIONS.add("Sonoran.MOMA.DUST_RESET_TIMEOUT", "int", "milliseconds");

OPTIONS.add("Sonoran.MOMA.LOADER_IMAGE_GRAIN", "int", "bytes");
OPTIONS.add("Sonoran.MOMA.LOADER_PHEAP_GRAIN", "int", "bytes");



Sonoran.MOMA.LDSC = {};
Errors.define("Sonoran.MOMA.LDSC");

{
    for (var k in SaguaroDEFS) {
	if (/^LDSC_/.test(k)) {
	    if (SaguaroDEFS[k] === 0 || k === "LDSC_ERRORS") {
		continue;
	    }
	    try {
		Errors.define("Sonoran.MOMA.LDSC", SaguaroDEFS[k], k, k);
	    } catch(ex) {
		QUACK(0, "Error code mismatch: " + k + ", " + SaguaroDEFS[k] + ": " + ex);
	    }
	}
    }
}




/**
 * Basic interval when broadcasting chunks. To that, the average duration of the load-stop command
 * is added.
 * @constant
 * @type Number
 */
Sonoran.MOMA.LOADER_BC_BASE_INTERVAL = 50;
OPTIONS.add("Sonoran.MOMA.LOADER_BC_BASE_INTERVAL", 'int', "milliseconds");







/**
 * @param suffix
 * @returns {String}
 * @private
 */
Sonoran.MOMA.getDfltOption = function(/** Sonoran.Mote */mote, /** String */suffix) {
    var s = "Sonoran.MOMA.";
    if ((mote.getClass() === 'DN') || (mote.getClass() === 'saguaro' && mote.getType() === 'dust')) {
	s = s + "DUST_";
    } else {
	s = s + "DFLT_";
    }
    s += suffix;
    //QUACK(0, "CONST: " + s);
    try {
	return Blob.accessGlobalContext(s);
    } catch(ex) {
	assert(false, "Cannot access MOMA constant '" + suffix + "': " + ex);
    }
};






/** This function decodes Mote Runner exceptions created by the function MoteException.encode()
 *  on Mote Runner OS. 
 * @param excode
 * @returns {String}
 */
Sonoran.MOMA.encodedException2String = function(excode) {
    if( excode >= 0x80 && excode <= 0xFF ) {
	var _map;
	if( (_map = Sonoran.MOMA.encodedException2String._MAP) == null ) {
	    _map = Sonoran.MOMA.encodedException2String._MAP = {
		EXID0: [],
		EXIDN: [],
		EXRSN: {}
	    };
	    var xnames = "";
	    for( var k in SaguaroDEFS ) {
		if( /^EXID0_/.test(k) ) {
		    _map.EXID0[SaguaroDEFS[k]] = k.substr(6);
		    xnames += "|"+k.substr(6);
		}
	    }
	    for( var k in SaguaroDEFS ) {
		if( /^EXIDN_/.test(k) )
		    _map.EXIDN[SaguaroDEFS[k]] = k.substr(6);
		    xnames += "|"+k.substr(6);
	    }
	    for( var k in SaguaroDEFS ) {
		var md;
		if( md=(new RegExp("^EXRSN_("+xnames.substr(1)+")_(.*)$")).exec(k) ) {
		    var rsn = _map.EXRSN[md[1]];
		    if( rsn==null )
			_map.EXRSN[md[1]] = rsn = [];
		    rsn[SaguaroDEFS[k]] = md[2];
		}
	    }
	}
	var xno = (excode & SaguaroDEFS.EX_XNO) >> SaguaroDEFS.EX_XNO_SHIFT;
	var rsn = (excode & SaguaroDEFS.EX_RSN) >> SaguaroDEFS.EX_RSN_SHIFT;
	var clsname, reason;
	if( xno==0 ) {
	    if( (clsname = _map.EXID0[rsn]) == null )
		clsname = "EXID0#"+rsn;
	    return clsname;
	}
	if( (clsname = _map.EXIDN[xno]) == null )
	    clsname = "EXIDN#"+xno;
	if( (reason = _map.EXRSN[clsname][rsn]) == null )
	    reason = "reason="+rsn;
	return clsname+"."+reason;
    }
    var clsref = (excode>>16) & 0xFFFF;
    var reason = excode & 0xFFFF;
    return sprintf("c:%04X/reason=%u", clsref, reason);
}







/**
 * Sonoran.MOMA.Options specify options which can be passed to MOMA protocols.
 * @class
 * @constructor       Options object for MOMA methods.
 * @param timeout     Timeout, in milliseconds, per default 3000 (if null or undefined)
 * @param srcport     Optional, source port to use for communication
 * @param chunksize   Optional, chunksize for moma load protocol
 */
Sonoran.MOMA.Options = function(/** Sonoran.Mote */mote, /** Number */timeout, /** Number */srcport, /** Number */chunksize) {
    if (!(mote instanceof Sonoran.Mote)) {
	throw new Exception("API change: mote expected");
    }
   /**
    * Optional property. The source port to use for communication
    * @see Sonoran.Registry#registerPort
    * @type Number
    */
   this.srcport     = srcport;
   /**
    * Optional property. Timeout, in milliseconds, per default 3000.
    * @type Number
    */
   this.timeout     = timeout?timeout:Sonoran.MOMA.getDfltOption(mote, "TIMEOUT");
   /**
    * Optional prioperty. The chunksize used for the moma load protocol.
    * @type Number
    */
   this.chunksize   = chunksize?chunksize:Sonoran.MOMA.getDfltOption(mote, "LOADER_CHUNKSIZE");
    /**
     * Image size for assembly load, in bytes. If < 0, loader queries for right cabin, 0 
     * the mote picks the cabin based on the assembly, > 0 user-specifed image size.
    * @type Number
    */
    this.imageSize = -1;
    /**
     * Pheap size for assembly load, in bytes. If < 0, loader queries for right cabin, 0 
     * the mote picks the cabin based on the assembly, > 0 user-specifed pheap size.
    * @type Number
    */
    this.pheapSize = -1;
};

/** */
Sonoran.MOMA.Options.prototype = {
    /**
     * @private
     */
    toString: function() {
	return sprintf("MOMA-Options: srcport %d, timeout %d, chunksize %d, imageSize %d, pheapSize %d", this.srcport?this.srcport:-1, this.timeout, this.chunksize, this.imageSize, this.pheapSize);
    }
};





 /**
  * Represents the mote manager on a mote.
  * Call the function getMOMA on a mote to get a MOMA instance.
  * @class
  * @constructor Manages MOMA protocol
  * @param mote
  * @see Sonoran.Mote.getMOMA
  */
Sonoran.MOMA.Instance = function(/** Sonoran.Mote */mote) {
   /**
    * The mote of this MOMA
    * @type Sonoran.Mote
    */
   this.mote = mote;
};




/** @private */
Sonoran.MOMA.Instance.prototype = {
   /**
    * @returns {String} string representation.
    */
   toString: function() {
      return "MOMA-" + this.mote.toString();
   },


   /**
    * @returns {Sonoran.Mote} the mote of this MOMA instance.
    */
   getMote: function() {
      return this.mote;
   },


   /**
    * Generate an error message for a moma operation.
    * @private
    */
   genErrMsg: function(opname, reason) {
      var txt = sprintf("MOMA %s failed for %s", opname, this.mote.getUniqueid());
      if (reason) {
         txt += ": " + reason;
      }
      return txt;
   },
   
   
   /**
    * List assemblies on this mote.
    * The mote is updated with the listing queried by this protocol and a Sonoran.Event.Mote.Assemblies event is fired if the mote
    * state has changed. 
    * @see Sonoran.Mote#getAssemblies
    * @param options Default values are used if null or undefined
    * @param callback
    * @returns {Sonoran.AsmListing} The assembly listing
    * @throws {AOP.Exception}
    */
   list: function(/** Sonoran.MOMA.Options */options, /** DFLT_ASYNC_CB */callback) {
       if (BC.is(callback)) { return BC.exec(arguments.callee, this, arguments); }

      var _this = this;
      var mote = this.mote;
       if (!options) { options = new Sonoran.MOMA.Options(mote); }
      var entries = [];
      var engine = new Sonoran.ProtocolEngine1to1("moma-list", this.mote, 0, options);
      /** @ignore */
      engine.onOpen = function(result) {
         engine.send("uu", SaguaroDEFS.MOMA_LISTASMS_CMD, 0);
      };
      /** @ignore */
      engine.onData = function(data) {
         var ex, dpos = 0;
         if (data.charCodeAt(dpos) != (SaguaroDEFS.MOMA_REPLY_MASK|SaguaroDEFS.MOMA_LISTASMS_CMD)) {
	    engine.closeInvalidData(data, dpos);
	    return;
	 }
	 if (data.length==1) {
            mote.getAssemblies().onListing(entries);
	    engine.close(new AOP.OK(mote.getAssemblies())); //Sonoran.AsmListingOK(_this, mote.getAssemblies()));
	    return;
	 }
         dpos = 1;
         while( dpos+1 < data.length ) {
	    try {
               var arr = Formatter.unpack("uuuUu<d?", data, dpos);
               var asmid = arr[0];
               var major = arr[1];
               var minor = arr[2];
               var build = arr[3];
               var len = arr[4];
               var name = arr[5];
               dpos = arr[6];
               var asmname = new Sonoran.AsmName(name, major, minor, build);
	       entries.push(new Sonoran.AsmEntry(asmname, asmid&0x3f, asmid&0x80));
	    } catch (ex) {
	       engine.closeInvalidData(data, dpos);
	       return;
	    }
	    if (dpos == data.length) {
               mote.getAssemblies().onListing(entries);
		engine.close(new AOP.OK(mote.getAssemblies())); 
	       return;
	    }
         }
         engine.send("uu", SaguaroDEFS.MOMA_LISTASMS_CMD, data.charCodeAt(dpos));
      };
      engine.onClose = function(result) {
         if (result.code!=0) {
            mote.getAssemblies().setOutdated();
         }
         callback(result);
      };
      engine.open(callback);
   },


   /**
    * Function to load an assembly on a mote using MOMA. A Sonoran.Event.Mote.Assembly is fired after a
    * successful upload.
    * If the target mote is a simulated mote and a Sonoran.Resource.Assembly parameter
    * is specified, the method tries to find an sdx file and load that as well.
    *  @param assembly  Assembly to load, either Sonoran.Resource.Assembly or Sonoran.Assembly
    *  @param options   Options for protocol, defaults are used if null or undefined
    *  @param callback
    * @returns {Sonoran.AsmEntry} A assembly entry instance for the loaded assembly
    * @throws {AOP.Exception}
    */
   load: function(/**Sonoran.Resource.Assembly|Sonoran.Assembly */assembly, /** MOMA.Options */options, /** DFLT_ASYNC_CB */callback) {
       assert(assembly, "missing assembly parameter");
       assert((assembly instanceof Sonoran.Assembly) || (assembly instanceof Sonoran.Resource.Assembly));
       if (BC.is(callback)) { return BC.exec(arguments.callee, this, arguments); }

       var loader = new Sonoran.MOMA.SLoader(this.mote, assembly, options);
       loader.perform(callback);
   },
   
   
   /**
    * Function to exchange MOMA_LOADSTOP_CMD with MOMA. In case a load failure, this packet resets the MOMA loader on the mote.
    * @param options  Any options for protocol,  defaults are used if null or undefined
    * @param callback 
    * @throws {AOP.Exception}
    */
   loadStop: function(/** MOMA.Options */options, /** DFLT_ASYNC_CB */callback) {
       if (BC.is(callback)) { return BC.exec(arguments.callee, this, arguments); }

      var _this = this;
      if (!options) { options = new Sonoran.MOMA.Options(this.mote); }

      var engine = new Sonoran.ProtocolEngine1to1("moma-load-stop", this.mote, 0, options);
      engine.onOpen = function(result) {
         engine.send(String.fromCharCode(SaguaroDEFS.MOMA_LOADSTOP_CMD));
      };
      engine.onData = function(data) {
         if ((data.length != 1) || (data.charCodeAt(0) != (SaguaroDEFS.MOMA_LOADSTOP_CMD|SaguaroDEFS.MOMA_REPLY_MASK))) {
	    engine.closeInvalidData(data, 0);
         } else {
            engine.close(new AOP.OK());
         }
      };
      engine.open(callback);
   },
    
   
   /**
    * Function to retrieve the loader status.
    * @param options  Any options for protocol, defaults are used if null or undefined
    * @param callback 
    * @returns {Sonoran.MOMA.LoadStatus}
    * @throws {AOP.Exception}
    */
   loadStatus: function(/** MOMA.Options */options, /** DFLT_ASYNC_CB */callback) {
      assert(typeof(callback) == 'function');
       if (BC.is(callback)) { return BC.exec(arguments.callee, this, arguments); }

      var _this = this;
      if (!options) { options = new Sonoran.MOMA.Options(this.mote); }

      var engine = new Sonoran.ProtocolEngine1to1("moma-load-status", this.mote, 0, options);
      engine.onOpen = function(result) {
         engine.send(String.fromCharCode(SaguaroDEFS.MOMA_LOADSTATUS_CMD));
      };
      engine.onData = function(data) {
         if (data.length != 5) {
	    engine.closeInvalidData(data, 0);
            return;
         }
         var arr = Formatter.unpack("1u2u1u1u", data);
         var cmd = arr[0];
         var seqno = arr[1];
         var state = arr[3];
         var details = arr[2];
         if (cmd !== (SaguaroDEFS.MOMA_LOADSTATUS_CMD|SaguaroDEFS.MOMA_REPLY_MASK)) {
	    engine.closeInvalidData(data, 0);
            return;
         }
         engine.close(new AOP.OK(new Sonoran.MOMA.LoadStatus(this.mote, seqno, state, details)));
      };
      engine.open(callback);
   },






    /**
    *  Function to delete assembly on motes and a Sonoran.Event.Mote.Assembly is fired if the mote state has changed.
    *  @param asmid      Assembly id (Number) or Sonoran.name (AsmName)
    *  @param options    MOMA options, defaults are used if null or undefined
    *  @param callback 
    * @returns {Sonoran.AsmEntry} Sonoran.AsmEntry of deleted assembly
     * @throws {AOP.Exception} 
    */
   del: function(/** Number|Sonoran.AsmName */asmid, /** Sonoran.MOMA.Options */options, /** DFLT_ASYNC_CB */callback) {
      assert(typeof(callback) == 'function');
       if (BC.is(callback)) { return BC.exec(arguments.callee, this, arguments); }

      var _this = this;
      var mote = this.mote;
      if (!options) { options = new Sonoran.MOMA.Options(mote); }

      if (typeof(asmid) != 'number') {
         assert(asmid instanceof Sonoran.AsmName);
         var asmname = asmid;
         var entries = mote.getAssemblies().getEntries();
         var matches = Sonoran.AsmName.filterMatch(asmname, entries);
         if (matches.length==0) {
            callback(new AOP.ERR("Cannot find such assembly to delete on mote: " + asmname));
            return;
         } else if (matches.length>1) {
            callback(new AOP.ERR("Only find multiple candidates to delete on mote: " + matches.jin(", ")));
            return;
         } else {
            asmid = matches[0].getId();
         }
      }
      assert(typeof(asmid) === 'number');


       var asmids = [asmid ];
       var engine = new Sonoran.ProtocolEngine1to1("moma-delete", mote, 0, options);
       /** @ignore */
       engine.requestDel = function() {
           assert(asmids.length>0);
           asmid = asmids[asmids.length-1];
           engine.send("uu", SaguaroDEFS.MOMA_DELASM_CMD, asmid);
       };
       /** @ignore */
       engine.onOpen = function(result) {
           engine.requestDel();
       };
       /** @ignore */
       engine.onData = function(data) {
           if (data.charCodeAt(0) != (SaguaroDEFS.MOMA_REPLY_MASK|SaguaroDEFS.MOMA_DELASM_CMD)) {
	       engine.closeInvalidData(data, 0);
	       return;
           }
           if (data.charCodeAt(1) != asmid) {
	       engine.closeInvalidData(data);
	       return;
           }
           if (data.length == 2) {
               assert(asmid == asmids[asmids.length-1]);
	       var asmEntry = mote.getAssemblies().onRemove(asmid);
               asmids.splice(-1, 1);
               if (asmids.length == 0) {
	           engine.close(new AOP.OK()); 
               } else {
                   engine.requestDel();
               }
	       return;
           }
           if ((data.length==3) ) {
	       if( (data.charCodeAt(2)==0xff) ) {
		   var txt = _this.genErrMsg('delete', sprintf("Invalid assembly '%d'", asmid));
		   engine.close(new AOP.ERR(Sonoran.MOMA.ERROR_INVALID_ASSEMBLY, txt, undefined, asmid));
		   return;
	       }
	       if( (data.charCodeAt(2)==0x00) ) {
		   var txt = _this.genErrMsg('delete', sprintf("Built-in assembly '%d'", asmid));
		   engine.close(new AOP.ERR(Sonoran.MOMA.ERROR_BUILTIN_ASSEMBLY, txt, undefined, asmid));
		   return;
	       }
           }
           for (var i = 2; i < data.length; i++) {
               asmids.push(data.charCodeAt(i));
           }
           engine.requestDel();
       };
       engine.open(callback);
   },



    

   /**
    * Function to factory reset a mote. The function waits until the mote is back and again ready for communication or
    * an error is signaled.
    * delivered.
    * @param timeout  Time to wait in milliseconds for mote to come back, default is 10000 (if null or undefined)
    * @param callback 
    * @throws {AOP.Exception}
    */
   factoryReset: function(/** Number */timeout, /** DFLT_ASYNC_CB */callback) {
       if (BC.is(callback)) { return BC.exec(arguments.callee, this, arguments); }
      if (!timeout) {
         timeout = Sonoran.MOMA.getDfltOption(this.mote, "RESET_TIMEOUT");
      }

      var mote = this.mote;
      var srcport = Sonoran.Registry.registerPort();
      
      var closef = function(result) {
         Sonoran.Registry.deregisterPort(srcport);
         callback(result);
      };
      
      try {
          mote.send(0, srcport, Formatter.pack("uu", [ SaguaroDEFS.MOMA_FACTORYRST_CMD, 0 ]));
	  this.checkReset(mote);
      } catch(ex) {
         closef(new AOP.Ex2ERR(ERR_GENERIC, ex, "Cannot send 'moma-factoryreset' packet"));
         return;
      }

       //(new Timer.Timer(500, mote, function() {
	   mote.waitForState(Sonoran.Mote.ON, timeout, closef);
       //})).start();   // wait a little bit for the OS on the mote to boot ...
   },


   /**
    * Function to reset a mote. Sends 'reset' packet and waits for mote to come back.
    * @param timeout  Time to wait in milliseconds for mote to come back, default is 10000 (if null or undefined)
    * @param callback 
    * @throws {AOP.Exception}
    */
   reset: function(/** Number */timeout, /** DFLT_ASYNC_CB */callback) {
       if (BC.is(callback)) { return BC.exec(arguments.callee, this, arguments); }
      if (!timeout) {
	  timeout = Sonoran.MOMA.getDfltOption(this.mote, "RESET_TIMEOUT");
      }

      var mote = this.mote;
      var srcport = Sonoran.Registry.registerPort();
      
      var closef = function(result) {
         Sonoran.Registry.deregisterPort(srcport);
         callback(result);
      };

      try {
          mote.send(0, srcport, Formatter.pack("uu", [ SaguaroDEFS.MOMA_RESET_CMD, 0 ]));
	  this.checkReset(mote);
      } catch(ex) {
         closef(new AOP.Ex2ERR(ERR_GENERIC, ex, "Cannot send 'moma-reset' packet"));
         return;
      }

      mote.waitForState(Sonoran.Mote.ON, timeout, closef);
   },


    /**
     * @private
     */
    checkReset: function (mote) {
	if (mote.clazz==='udp') {
	    // special case for UDP motes
	    for (var i=0;i<10;i++) {
		// attempt to reach the mote a few times
		var options = new Sonoran.MOMA.Options(mote, 500);
		var res = mote.getMOMA().getEUI64(null, SCB);
		if (res.code === 0)
		    return; // UDP mote is back up
	    }
	    // UDP mote could not be reached ...
	}
	// the normal case
	mote.updateState(Sonoran.Mote.OFF);
   },

   /**
    * List cabins on mote.
    * @param options    Sonoran.MOMA.Options, defaults are used if null or undefined
    * @param callback
    * @returns {Sonoran.MOMA.Cabins[]} A cabins array
    * @throws {AOP.Exception}
    */
   listCabins: function(/** Sonoran.MOMA.Options */options, /** DFLT_ASYNC_CB */callback) {
       if (BC.is(callback)) { return BC.exec(arguments.callee, this, arguments); }

      var _this = this;
      if (!options) { options = new Sonoran.MOMA.Options(this.mote); }
      var cabins = [];

      var engine = new Sonoran.ProtocolEngine1to1("moma-list-cabins", this.mote, 0, options);
      engine.onOpen = function(result) {
         engine.send("uu", SaguaroDEFS.MOMA_LISTCABINS_CMD, 0);
      };
      engine.onData = function(data) {
         var ex, dpos = 0;
         if (data.charCodeAt(dpos) != (SaguaroDEFS.MOMA_REPLY_MASK|SaguaroDEFS.MOMA_LISTCABINS_CMD)) {
	    engine.closeInvalidData(data, dpos);
	    return;
         }
	  //QUACK(0, sprintf("CABIN DATA: %H", data));
         dpos = 1;
         while(dpos+1 < data.length) {
	    try {
	       var arr = Formatter.unpack("uUU", data, dpos);
               var cabid = arr[0];
               var imgsz = arr[1];
               var pheapsz = arr[2];
		var c = new Sonoran.MOMA.Cabin(_this.mote, cabid&0x7f, (cabid&0x80)==0, imgsz, pheapsz);
               cabins.push(c);
	       dpos += 5;
	    } catch (ex) {
	       engine.closeInvalidData(data, dpos);
	       return;
	    }
	    if( dpos === data.length ) {
	       engine.close(new AOP.OK(cabins)); 
	       return;
	    }
         }
	  //QUACK(0, sprintf("CABIN SEND: 0x%x", data.charCodeAt(dpos)));
         engine.send("uu", SaguaroDEFS.MOMA_LISTCABINS_CMD, data.charCodeAt(dpos));
      };
      engine.open(callback);
   },


   /**
    * Query mote information.
    * @param options (default values are used if null or 'undefined')   
    * @param callback
    * @returns {Sonoran.MOMA.Info}
    * @throws {AOP.Exception}
    */
   queryInfo: function(/** Sonoran.MOMA.Options */options, /** DFLT_ASYNC_CB */callback) {
       if (BC.is(callback)) { return BC.exec(arguments.callee, this, arguments); }

      assert(SaguaroDEFS.QUERYINFO_TRANSIENT_HEAP_SIZE==1);
      assert(SaguaroDEFS.QUERYINFO_TRANSIENT_HEAP_FREE==2);
      assert(SaguaroDEFS.QUERYINFO_TRANSIENT_HEAP_UNIT==3);
      assert(SaguaroDEFS.QUERYINFO_VMSTACK_SIZE==4);
      assert(SaguaroDEFS.QUERYINFO_VMSTACK_FREE==5);
      assert(SaguaroDEFS.QUERYINFO_FWVERSION==6);
      assert(SaguaroDEFS.QUERYINFO_FWBUILD==7);
      assert(SaguaroDEFS.QUERYINFO_PLATFORM==8);
      assert(SaguaroDEFS.QUERYINFO_BATTERY_STATUS==9);

      var _this = this;
      if (!options) { options = new Sonoran.MOMA.Options(this.mote); }
      var engine = new Sonoran.ProtocolEngine1to1("moma-query-info", this.mote, 0, options);
      /** @ignore */
      engine.onOpen = function(result) {
         engine.send("uUUUUUUUUUU",
                     SaguaroDEFS.MOMA_QUERYINFO_CMD,
		     0, // RFU
                     SaguaroDEFS.QUERYINFO_TRANSIENT_HEAP_SIZE,
                     SaguaroDEFS.QUERYINFO_TRANSIENT_HEAP_FREE,
                     SaguaroDEFS.QUERYINFO_TRANSIENT_HEAP_UNIT,
                     SaguaroDEFS.QUERYINFO_VMSTACK_SIZE,
                     SaguaroDEFS.QUERYINFO_VMSTACK_FREE,
                     SaguaroDEFS.QUERYINFO_FWVERSION,
                     SaguaroDEFS.QUERYINFO_FWBUILD,
                     SaguaroDEFS.QUERYINFO_PLATFORM,
                     SaguaroDEFS.QUERYINFO_BATTERY_STATUS);
      };
      /** @ignore */
      engine.onData = function(data) {
         if (data.charCodeAt(0) != (SaguaroDEFS.MOMA_REPLY_MASK|SaguaroDEFS.MOMA_QUERYINFO_CMD) || data.length!=21) {
	    engine.closeInvalidData(data, 0);
	    return;
         }
         var arr = Formatter.unpack("uUUUUUUUUUU", data);
         var cmd = arr[0];    // error map XXX:not evaluated but should be!!!
         var mask = arr[1];
         var thsz = arr[2];
         var thfr = arr[3];
         var thun = arr[4];
         var vmstsz = arr[5];
         var vmstfr = arr[6];
         var fwv = arr[7];
         var fwb = arr[8];
         var platf = arr[9];
         var bstat = arr[10];
         var fwmaj = fwv>>8;
         var fwmin = fwv&0xff;
         var pwmain = ((bstat&0x8000) != 0);
         var pwcharging = ((bstat&0x4000) != 0);
         var pwcrit = ((bstat&0x2000) != 0);
         var pwcharge = bstat&0xff;
         engine.close(new AOP.OK(new Sonoran.MOMA.Info(_this.mote, thsz, thfr, thun, vmstsz, vmstfr, fwmaj, fwmin, fwb, pwcharge, pwmain, pwcharging, pwcrit, platf)));
      };
      engine.open(callback);
   },


   /**
    * Query open ports on a mote.
    * @param options    default values are used if null or 'undefined'
    * @param callback
    * @returns {Number[]} Array of port numbers
    * @throws {AOP.Exception}
    */
   queryPorts: function(/** Sonoran.MOMA.Options */options, /** DFLT_ASYNC_CB */callback) {
       if (BC.is(callback)) { return BC.exec(arguments.callee, this, arguments); }

      var _this = this;
      if (!options) { options = new Sonoran.MOMA.Options(this.mote); }
      var ports = [];

      var engine = new Sonoran.ProtocolEngine1to1("moma-query-ports", this.mote, 0, options);
      engine.onOpen = function(result) {
         engine.send("uu", SaguaroDEFS.MOMA_LISTPORTS_CMD, 0);
      };
      engine.onData = function(data) {
         if (data.charCodeAt(0) != (SaguaroDEFS.MOMA_REPLY_MASK|SaguaroDEFS.MOMA_LISTPORTS_CMD)) {
	    engine.closeInvalidData(data, 0);
	    return;
         }
         if (data.length==1) {
            engine.close(new AOP.OK(ports));
            return;
         }
         for (var i = 1; i < data.length-1; i++) {
            ports.push(data.charCodeAt(i));
         }
         if (data.charCodeAt(data.length-1)==0 && ports.length>=1 && ports[0]!=0) {
            engine.send("uu", SaguaroDEFS.MOMA_LISTPORTS_CMD, ports[ports.length-1]);
         } else {
            ports.push(data.charCodeAt(data.length-1));
            engine.close(new AOP.OK(ports));
         }
      };
      engine.open(callback);
   },


   // /**
   //  * Shutdown WLIP.
   //  * @param options    default values are used if null or 'undefined'
   //  * @param callback
   //  * @returns {Number[]} Array of port numbers
   //  * @throws {AOP.Exception}
   //  */
   // shutdownWLIP: function(/** Sonoran.MOMA.Options */options, /** DFLT_ASYNC_CB */callback) {
   //     if (BC.is(callback)) { return BC.exec(arguments.callee, this, arguments); }

   //    var _this = this;
   //    if (!options) { options = new Sonoran.MOMA.Options(this.mote); }
   //    var ports = [];

   //    var engine = new Sonoran.ProtocolEngine1to1("moma-shutdown-wlip", this.mote, 0, options);
   //    engine.onOpen = function(result) {
   //       engine.send("u", SaguaroDEFS.MOMA_WLIPSTOP_CMD, 0);
   //    };
   //    engine.onData = function(data) {
   //       if (data.charCodeAt(0) != (SaguaroDEFS.MOMA_REPLY_MASK|SaguaroDEFS.MOMA_WLIPSTOP_CMD) || data.length!=1 ) {
   // 	    engine.closeInvalidData(data, 0);
   // 	    return;
   //       }
   //       engine.close(new AOP.OK(ports));
   //       return;
   //    };
   //    engine.open(callback);
   // },


   // /**
   //  * Get/set WLIP configuration on a mote.
   //  * @param config     Optional, if unspecified, queries configuration
   //  * @param options    uses default values if null or undefined
   //  * @param callback
   //  * @returns {Sonoran.WLIP.Config}
   //  * @throws {AOP.Exception}
   //  */
   // configureWLIP: function(/** Sonoran.WLIP.Config */config, /** Sonoran.MOMA.Options */options, /** DFLT_ASYNC_CB */callback) {
   //     if (BC.is(callback)) { return BC.exec(arguments.callee, this, arguments); }
   //    if (SaguaroDEFS.WLIP_CFGOFF_PANID!=0||SaguaroDEFS.WLIP_CFGOFF_CHNL!=2||SaguaroDEFS.WLIP_CFGOFF_TXRETRIES!=3||SaguaroDEFS.WLIP_CFGOFF_TXBUFSIZ!=4) {
   //       throw "unexpected WLIP gateway system constants in saguaroDEFS!";
   //    }

   //    var _this = this;
   //     if (!options) { options = new Sonoran.MOMA.Options(this.mote); }

   //    var engine = new Sonoran.ProtocolEngine1to1("moma-configure-wlip", this.mote, 0, options);
   //    engine.onOpen = function(result) {
   //       var data;
   //       if (!config) {
   //          data = String.fromCharCode(SaguaroDEFS.MOMA_WLIPCONFIG_CMD);
   //       } else {
   //          data = Formatter.pack("1u2u1u1u2u", SaguaroDEFS.MOMA_WLIPCONFIG_CMD, config.panid, config.channel, config.txretries, config.txbufsz);  
   //       }
   //       engine.send(data);
   //    };
   //    engine.onData = function(data) {
   //       if (data.charCodeAt(0) != (SaguaroDEFS.MOMA_REPLY_MASK|SaguaroDEFS.MOMA_WLIPCONFIG_CMD)) {
   // 	    engine.closeInvalidData(data, 0);
   // 	    return;
   //       }
   //       var obj = null;
   //       if (data.length>1) {
   //          var arr = Formatter.unpack("1u2u1u1u2u", data);
   //          var cmd = arr[0];
   //          var panid = arr[1];
   //          var chan = arr[2];
   //          var txretries = arr[3];
   //          var txbufsz = arr[4];
   //          obj = new Sonoran.WLIP.Config(panid, chan, txretries, txbufsz);
   //       } 
   //       engine.close(new AOP.OK(obj));
   //    };
   //    engine.open(callback);
   // },


   /**
    * Set eui-64 of a mote using the MOMA protocol.
    * @param eui64      String in EUI-64 format (xx(-xx)+).
    * @param options    uses default values if null or undefined
    * @param callback
    * @throws {AOP.Exception}
    */
   setEUI64: function(/** String */eui64, /** Sonoran.MOMA.Options */options, /** DFLT_ASYNC_CB */callback) {
      eui64 = Util.UUID.eui2preferred(eui64);
       if (BC.is(callback)) { return BC.exec(arguments.callee, this, arguments); }

      var _this = this;
       if (!options) { options = new Sonoran.MOMA.Options(this.mote); }

      var engine = new Sonoran.ProtocolEngine1to1("moma-set-eui64", this.mote, 0, options);
      engine.onOpen = function(result) {
         var bin = reverseString(Formatter.hexToBin(Util.UUID.eui642hex(eui64)));
         var data = String.fromCharCode(SaguaroDEFS.MOMA_EUI64_CMD) + bin;
         engine.send(data);
      };
      engine.onData = function(data) {
         var b = data.charCodeAt(0);
         if ((b&SaguaroDEFS.MOMA_ERROR_MASK) != 0) {
            engine.closeInvalidData(data, 0, "could not access radio");
            return;
         }
         if (b != (SaguaroDEFS.MOMA_REPLY_MASK|SaguaroDEFS.MOMA_EUI64_CMD)) {
	    engine.closeInvalidData(data, 0);
	    return;
         }
         _this.mote.updateUniqueid(eui64);
          //QUACK(0, "UPDATED EUI: " + _this.mote.getUniqueid());
         engine.close(new AOP.OK(_this.mote));
      };
      engine.open(callback);
   },


   /**
    * Get the eui-64 of a mote using the MOMA protocol.
    * @param options  default values are used if null or undefined
    * @param callback
    * @returns {String} The eui64
    * @throws {AOP.Exception}
    */
   getEUI64: function(/** Sonoran.MOMA.Options */options, /** DFLT_ASYNC_CB */callback) {
       if (BC.is(callback)) { return BC.exec(arguments.callee, this, arguments); }

      var _this = this;
      if (!options) { options = new Sonoran.MOMA.Options(this.mote); }

      var engine = new Sonoran.ProtocolEngine1to1("moma-get-eui64", this.mote, 0, options);
       engine.onOpen = function(result) {
         engine.send(String.fromCharCode(SaguaroDEFS.MOMA_EUI64_CMD));
      };
      engine.onData = function(data) {
         var b = data.charCodeAt(0);
         if ((b&SaguaroDEFS.MOMA_ERROR_MASK) != 0) {
            engine.closeInvalidData(data, 0, "could not access radio");
            return;
         }
         if (data.length != 9) {
	    engine.closeInvalidData(data, 0, "invalid length");
	    return;
         }
         var eui64 = data.substring(1);
          eui64 = Util.UUID.hex2eui64(Formatter.binToHex(reverseString(eui64)));
         engine.close(new AOP.OK(eui64));
      };
      engine.open(callback);
   },


    /**
    * Set up to 8 LEDs using MOMA.
    * @param leds      status of first 8 LEDs (bit mask)
    * @param options   default values are used if null or undefined
    * @param callback
    * @throws {AOP.Exception}
    */
   setLEDs: function(/** Number */leds, /** Sonoran.MOMA.Options */options, /** DFLT_ASYNC_CB */callback) {
       if (BC.is(callback)) { return BC.exec(arguments.callee, this, arguments); }


      var _this = this;
      if (!options) { options = new Sonoran.MOMA.Options(this.mote); }

      var engine = new Sonoran.ProtocolEngine1to1("moma-set-leds", this.mote, 0, options);
      engine.onOpen = function(result) {
         engine.send("uu", SaguaroDEFS.MOMA_SETLEDS_CMD, leds);
      };
      engine.onData = function(data) {
         var b = data.charCodeAt(0);
         if ((b&SaguaroDEFS.MOMA_ERROR_MASK) != 0) {
            engine.closeInvalidData(data, 0, "received error byte");
            return;
         }
         engine.close(new AOP.OK());
      };
      engine.open(callback);
   }

    
   // /**
   //  * Set IPv4 configuration for a mote using the MOMA protocol.
   //  * @param ipAddress
   //  * @param mrUdpPort
   //  * @param subnwMask
   //  * @param gwAddress
   //  * @param options uses default values if null or undefined
   //  * @param callback
   //  * @throws {AOP.Exception}
   //  */
   //  setIPv4Config: function(/** String */ipAddress,/**Integer*/mrUdpPort,/** String */subnwMask,/** String */gwAddress,/** Sonoran.MOMA.Options */options, /** DFLT_ASYNC_CB */callback) {
   // 	if (BC.is(callback)) { return BC.exec(arguments.callee, this, arguments); }
	
   // 	var _this = this;
   // 	if (!options) { options = new Sonoran.MOMA.Options(this.mote); }
	
   // 	var engine = new Sonoran.ProtocolEngine1to1("moma-set-ipv4", this.mote, 0, options);
   // 	engine.ipStr2Hex = function (ipString) {
   // 	    var ipregex = /(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})/;
   // 	    var ip = ipString.match(ipregex);
   // 	    if (ip != null){
   // 		ip.splice(0,1); // remove first element, is the entire string if a match
   // 		var tmp = ip.map(function(i){return parseInt(i);});
   // 		if (tmp[0]>255 || tmp[1] > 255 || tmp[2] > 255 || tmp[3] > 255)
   // 		    return null;
   // 		return Formatter.pack("1u1u1u1u",tmp[0],tmp[1],tmp[2],tmp[3]);
   // 	    }
   // 	    return null;
   // 	}
   // 	engine.onOpen = function(result) {
   // 	    var ipConfigBin = "";

   // 	    // first check the input

   // 	    var bin = engine.ipStr2Hex(ipAddress);
   // 	    if (bin == null){
   // 		engine.closeInvalidData(null, 0, "invalid IP configuration");
   // 		return;
   // 	    }
   // 	    ipConfigBin += bin;

   // 	    if (typeof(mrUdpPort)!=typeof(0) || mrUdpPort>0xFFFF) {
   // 		engine.closeInvalidData(null, 0, "invalid mrUdpPort configuration");
   // 		return;
   // 	    }
   // 	    ipConfigBin += Formatter.pack("2u",mrUdpPort);

   // 	    var bin = engine.ipStr2Hex(subnwMask);
   // 	    if (bin == null){
   // 		engine.closeInvalidData(null, 0, "invalid subnwMask configuration");
   // 		return;
   // 	    }
   // 	    ipConfigBin += bin;

   // 	    var bin = engine.ipStr2Hex(gwAddress);
   // 	    if (bin == null){
   // 		engine.closeInvalidData(null, 0, "invalid gwAddress configuration");
   // 		return;
   // 	    }
   // 	    ipConfigBin += bin;

   //          var data = String.fromCharCode(SaguaroDEFS.MOMA_IPV4_CMD) + ipConfigBin;
   // 	    //println(Formatter.binToHex(data));
   //          engine.send(data);
   // 	};
   // 	engine.onData = function(data) {
   //          var b = data.charCodeAt(0);
   //          if ((b&SaguaroDEFS.MOMA_ERROR_MASK) != 0) {
   // 		engine.closeInvalidData(data, 0, "could not set IP configuration");
   // 		return;
   //          }
   //          if (b != (SaguaroDEFS.MOMA_REPLY_MASK|SaguaroDEFS.MOMA_IPV4_CMD)) {
   // 		engine.closeInvalidData(data, 0);
   // 		return;
   //          }
   //          engine.close(new AOP.OK("New IP configuration will take effect upon reset."));
   // 	};
   // 	engine.open(callback);
   //  },

   // /**
   //  * Get the IPv4 configuration of a mote using the MOMA protocol.
   //  * @param options  default values are used if null or undefined
   //  * @param callback
   //  * @returns {Object} The IPv4 configuration with properties ipAddress, gwAddress, netwkMaskBits, udpPort
   //  * @throws {AOP.Exception}
   //  */
   //  getIPv4Config: function(/** Sonoran.MOMA.Options */options, /** DFLT_ASYNC_CB */callback) {
   // 	if (BC.is(callback)) { return BC.exec(arguments.callee, this, arguments); }
	
   // 	var _this = this;
   // 	if (!options) { options = new Sonoran.MOMA.Options(this.mote); }
	
   // 	var engine = new Sonoran.ProtocolEngine1to1("moma-get-ipv4", this.mote, 0, options);
   // 	engine.onOpen = function(result) {
   //          engine.send(String.fromCharCode(SaguaroDEFS.MOMA_IPV4_CMD));
   // 	};
   // 	engine.onData = function(data) {
   //          var b = data.charCodeAt(0);
   //          if ((b&SaguaroDEFS.MOMA_ERROR_MASK) != 0) {
   // 		engine.closeInvalidData(data, 0, "could not get IPv4 configuration");
   // 		return;
   //          }
   //          if (data.length != 15) {
   // 		engine.closeInvalidData(data, 0, "invalid length");
   // 		return;
   //          }
   // 	    //println(Formatter.binToHex(data));
   // 	    var ip = Formatter.unpack("1u1u1u1u",data,1);
   // 	    var ipAddress = sprintf("%d.%d.%d.%d",ip[0],ip[1],ip[2],ip[3]);
   // 	    var mrUdpPort = Formatter.unpack("2u",data,5);
   // 	    var sn = Formatter.unpack("1u1u1u1u",data,7);
   // 	    var subnwMask = sprintf("%d.%d.%d.%d",sn[0],sn[1],sn[2],sn[3]);
   // 	    var gw = Formatter.unpack("1u1u1u1u",data,11);
   // 	    var gwAddress = sprintf("%d.%d.%d.%d",gw[0],gw[1],gw[2],gw[3]);
   //          var ipConfig = {
   // 		ipAddress: ipAddress,
   // 		mrUdpPort: mrUdpPort,
   // 		subnwMask: subnwMask,
   // 		gwAddress: gwAddress,
   // 	    };
   // 	    var txt = sprintf("IP:    %s\n"+
   // 			      "UDP:   %d\n"+
   // 			      "SN:    %s\n"+
   // 			      "GW:    %s", 
   // 			      ipAddress, 
   // 			      mrUdpPort, 
   // 			      subnwMask,
   // 			      gwAddress);	    
   //          engine.close(new AOP.OK(txt));
   // 	};
   // 	engine.open(callback);
   //  }
    
};







/**
 * @param imageSize
 * @returns {Number}
 * @private
 * 
 */
Sonoran.MOMA.roundCabinSize = function(/** Assembly */assembly, /** Number */size, /** Boolean */forImageSize) {
    var rnd = function (num, grain) {
	num += grain-1;
	num -= num % grain;
	return num;
    };
    if (size === 0) {
	// no rounding of user specified 0 for pheap or image
	return 0;
    }
    if (size===undefined || size < 0) {
	if (Sonoran.MOMA.LOADER_IMAGE_GRAIN !== 0) {
	    var grain = forImageSize ? Sonoran.MOMA.LOADER_IMAGE_GRAIN : Sonoran.MOMA.LOADER_PHEAP_GRAIN;
	    size = forImageSize ? assembly.imageSize : assembly.idataSize;
	    return rnd(rnd(size,grain),SaguaroDEFS.ALIGN_SIZEINFO)/SaguaroDEFS.ALIGN_SIZEINFO;	
	} else {
	    return 0;
	}
    } else {
	return rnd(size,SaguaroDEFS.ALIGN_SIZEINFO)/SaguaroDEFS.ALIGN_SIZEINFO;
    }
};


/**
 * Split assembly into packets to download.
 * @param assembly
 * @param chunksize
 * @returns {String[]}
 * @private
 */
Sonoran.MOMA.splitAssembly = function(/** Boolean */broadcast, /** Sonoran.Assembly */assembly, /** Number */chunksize, /** Number */imageCabinSz, /** Number */pheapCabinSz) {
    assert(assembly instanceof Sonoran.Assembly);
    var asmBytes = assembly.bytes;
    var asmLen = asmBytes.length;
    if (asmLen < 20) {
	throw "Invalid assembly: expected more data";
    }
    var chunks = [];
    imageCabinSz = Sonoran.MOMA.roundCabinSize(assembly, imageCabinSz, true);
    pheapCabinSz = Sonoran.MOMA.roundCabinSize(assembly, pheapCabinSz, false);

    //QUACK(0, sprintf("MOMA.splitAssembly: imgsz %d 0x%x, pheapsz %d 0x%x", imageCabinSz, imageCabinSz, pheapCabinSz, pheapCabinSz));
    var seqno = Math.floor(32767*Math.random()); 
    var cmd = SaguaroDEFS.MOMA_LOADSTART_CMD;
    if (broadcast) {
	cmd |= SaguaroDEFS.MOMA_NORPDU_MASK;
    }
    var bytes = Formatter.pack("uuUUU", cmd, Sonoran.MOMA.LOADER_VERSION, seqno, imageCabinSz, pheapCabinSz);
    chunks.push([ seqno, bytes ]);
    //QUACK(0, sprintf("1st CHUNK: %d %H", seqno, bytes));
    var asmPos = 0;
    while(asmPos < asmLen) {
        assert(asmPos < asmLen, "Mismatch: " + asmPos + " <-> " + asmLen);
        var cnt = (asmPos + chunksize > asmLen) ? asmLen - asmPos : chunksize;
	cmd = SaguaroDEFS.MOMA_LOADDATA_CMD;
	if (broadcast) {
	    cmd |= SaguaroDEFS.MOMA_NORPDU_MASK;
	}
        bytes = Formatter.pack("uU", cmd, seqno) + asmBytes.slice(asmPos, asmPos+cnt);
	chunks.push([ seqno, bytes ]);
	//QUACK(0, sprintf("Nth CHUNK: %d, %H", seqno, bytes));
        asmPos += cnt;
	seqno += 1;
    }
    return chunks;
};


/**
 * @param cabins
 * @param aseembly
 * @returns {Sonoran.MOMA.Cabin}
 * @private
 */
Sonoran.MOMA.findCabin2Load = function(/** Sonoran.MOMA.Cabin[] */cabins, /** Sonoran.Assembly */assembly) {
    var cabin = null;
    for (var j = 0; j < cabins.length; j++) {
	var c = cabins[j];
	if (!c.occupied) {
	    if ((assembly.imageSize <= c.imgsz && assembly.imageSize > c.imgsz - Sonoran.MOMA.LOADER_IMAGE_GRAIN) &&
		(assembly.idataSize <= c.pheapsz && assembly.idataSize > c.pheapsz - Sonoran.MOMA.LOADER_PHEAP_GRAIN)) {
		if (cabin===null) {
		    cabin = c;
		} else {
		    if (c.imgsz < cabin.imgsize) {
			cabin = c;
		    }
		}
	    }
	}
    }
    return cabin;
};



/**
 * Creates AOP.ERR object pointing to a Sonoran.MOMA.LoadError instance
 * @param uniqueid
 * @param asmName
 * @param data
 * @param msg
 * @param state
 * @param details
 * @returns {AOP.ERR} error object
 * @private
 */
Sonoran.MOMA.createLoadError = function(/** String */uniqueid, /** Sonoran.AsmName */asmName, /** String */data, /** String */msg, /** Number */state, /** Number */details) {
    assert(typeof(uniqueid)==='string', "API change");
    var code;
    var txt = sprintf("load on %s failed", uniqueid);
    if (state===undefined) {
	code = ERR_GENERIC;
	txt += sprintf(": %s: '%s' (packet %H)", asmName.toString(), msg, data);
    } else {
	code = Errors.genError("Sonoran.MOMA.LDSC", state);
	if (typeof(details)==='number') {
	    for (var l in SaguaroDEFS) {
		if (SaguaroDEFS[l]===details && /^LDSC_INVALID/.test(l)) {
		    details = l.substring(5);
		    break;
		}
	    }
	}
	txt += sprintf(": %s: '%s' (details %s, packet %H)", asmName.toString(), msg, details, data);
    }
    return new AOP.ERR(code, txt, undefined, new Sonoran.MOMA.LoadError(asmName, data, state, details));
};



/**
 * @class
 * @constructor
 * @param mote
 * @param assembly
 * @param options

 */
Sonoran.MOMA.SLoader = function(/** Sonoran.Mote */mote, /** Sonnoran.Assembly */assembly, /** Object */options) {
    this.mote = mote;
    this.assembly = assembly;
    this.asmName = new Sonoran.AsmName(assembly);
    this.chunks = null;
    this.chunkIdx = -1;
    this.callback = null;
    this.options = options ? options: new Sonoran.MOMA.Options(mote);
    this.monitor = (options&&options.monitor) ? options.monitor : ProgressMonitor.getLoggerMonitor(Logger.SONORAN, Logger.DEBUG);
};


/** */
Sonoran.MOMA.SLoader.prototype = {
    /**
     * Perform the download protocol, but list the cabins on the mote before and try to find a cabin which
     * matches well the size of the assembly to download.
     * @param callback
     * @returns {Sonoran.AsmEntry}
     */
    perform: function(/** DFLT_ASYNC_CB */callback) {
	if (BC.is(callback)) { return BC.exec(arguments.callee, this, arguments); }
	var _this = this;
	this.callback = callback;
	var mote = this.mote;

	if (this.options.imageSize >= 0) {
	    if (this.options.pheapSize < 0) {
		throw new Exception("Both imageSize and pheapSize in Load-Options-Instance must match");
	    }
	    this.load(callback);
	    return;
	} 

	mote.getMOMA().listCabins(this.options, function(result) {
	    if (result.code !== 0) {
		callback(result);
		return;
	    }
	    var cabin = Sonoran.MOMA.findCabin2Load(result.getData(), _this.assembly);
	    if (cabin !== null) {
		_this.options.imageSize = cabin.imgsz;
		_this.options.pheapSize = cabin.pheapsz;
	    }
	    _this.load(callback);
	});
    },


    /**
     * Downloads assembly content.
     * @param callback
     * @returns {Sonoran.AsmEntry}
     */
    load: function(/** DFLT_ASYNC_CB */callback) {   
	if (BC.is(callback)) { return BC.exec(arguments.callee, this, arguments); }
	var _this = this;
	var assembly = this.assembly;
	var asmName = this.asmName;
	var mote = this.mote;
	var options = this.options;
	assert(options.chunksize);
	var chunks = Sonoran.MOMA.splitAssembly(false, assembly, options.chunksize, options.imageSize, options.pheapSize);
	var chunkIdx = -1;
	
	// // in case of halt with successful load, finish protocol
	// var eventListener = function(ev) {
        //     assert(ev.msgtype===Sonoran.Event.HALT);
	//     var evname = ev.getEvName();
        //     assert(evname!==undefined);
	//     if ((evname===Saguaro.EV_ASMCTOR) && (ev.mote==mote) && (ev.asmIdentity==asmName.identity)) {    
	// 	    // on halt and right assembly loaded, load is finished
	// 	assert(ev.asmid !== undefined);
	// 	engine.onSuccess(Saguaro.parseEventAsmId(ev.asmid));
        //     }
	// };
	//var filter = new Util.PropertyFilter();
	//filter.add("msgtype", Sonoran.Event.HALT);
	//filter.add("event", Saguaro.HALT_EVENT_ASM_LOADED);
	//Sonoran.Registry.addFilterWithMask(eventListener, filter);
	var eventListener = function(ev) {
	    if (ev.category===Sonoran.EV_CAT_HALT && ev.evname===Saguaro.EV_ASMCTOR && ev.mote==mote && ev.asmIdentity==asmName.identity) {    
		    // on halt and right assembly loaded, load is finished
		assert(ev.asmid !== undefined);
		engine.onSuccess(Saguaro.parseEventAsmId(ev.asmid));
            }
	};
	Sonoran.Registry.addFilter(eventListener);

	var sendChunk = function() {
	    chunkIdx += 1;
	    if (chunkIdx >= chunks.length) {
		engine.close(Sonoran.MOMA.createLoadError(mote.getUniqueid(), asmName, "", "No more data available"));
		return;
	    }
	    //_this.monitor.onMessage(Logger.DEBUG, sprintf("Send chunk: %H", chunks[chunkIdx][1]));
	    engine.send(chunks[chunkIdx][1]);
	};

	var engine = new Sonoran.ProtocolEngine1to1("moma-load", mote, 0, options);
	
	engine.onOpen = function(result) { sendChunk(); };
	
	engine.on1stResponse = function(data) {
	    assert(chunkIdx === 0);
            if ((data.length === 1) && (data.charCodeAt(0) === (SaguaroDEFS.MOMA_LOADSTART_CMD|SaguaroDEFS.MOMA_REPLY_MASK))) {
		engine.setRecvFunc(engine.onNthResponse);
		sendChunk();
		return;
            }

	    var err = null;
            if (data.length >= 3) {
		var cmd = data.charCodeAt(0);
		var state = data.charCodeAt(1);
		if (state == SaguaroDEFS.LDSC_WRONG_PROTO_VERSION) {
		    var no = data.charCodeAt(2);
		    var details = "Expected loader version: " + (no>>8);
		    err = Sonoran.MOMA.createLoadError(mote.getUniqueid(), asmName, data, "Wrong protocol version", state, details);
		} else if (state == SaguaroDEFS.LDSC_LOAD_IN_PROGRESS) {
		    var no = (data.charCodeAt(2)&0xff)<<8 + data.charCodeAt(3);
		    var details = "Expected sequence number " + no;
		    err = Sonoran.MOMA.createLoadError(mote.getUniqueid(), asmName, data, "Load in progress, use 'moma-load -a' to reset loader", state, details);
		} 
            } 
	    if (err === null) {
		err = Sonoran.MOMA.createLoadError(mote.getUniqueid(), asmName, data, "Invalid initial response");
	    }
            engine.close(err);
	};

	engine.onNthResponse = function(data) {
	    //_this.monitor.onMessage(Logger.DEBUG, sprintf("Response: %H", data));
            if (data.length != 5) {
		Logger.log(Logger.WARN, "MOTE", sprintf("Unexpected response during moma-load: %H", data));
		return;
            }
            var arr = Formatter.unpack("uUuu", data);
            var cmd = arr[0];
            var no = arr[1];
            var state = arr[2];
            var details = arr[3];
            if (no != chunks[chunkIdx][0]) {
		var msg = "Invalid sequence number: received=" + no + " <-> expected=" + chunks[chunkIdx][0];
		Logger.log(Logger.WARN, "MOTE", msg);
		//XXX: duplication on DustNetworks: engine.close(Sonoran.MOMA.createLoadError(mote.getUniqueid(), asmName, data, msg, state, details));
		return;
            }
            switch(state) {
            case SaguaroDEFS.LDSC_MORE_DATA: {
		sendChunk();
		break;
            }
            case SaguaroDEFS.LDSC_DATA_DONE:
            case SaguaroDEFS.LDSC_ASM_CTOR_DONE: {
		engine.onSuccess(details);
		break;
            }
            case SaguaroDEFS.LDSC_MISSING_DEPENDENCY: {
		// Details specifies an index into imports table of assembly - refers to missing assembly
		var imp = assembly.imports[details];
		var msg = sprintf("Missing dependency %s-%d.%d", imp.name, imp.major, imp.minor);
		engine.close(Sonoran.MOMA.createLoadError(mote.getUniqueid(), asmName, data, msg, state, details));
		break;
            }
            default: 
		engine.close(Sonoran.MOMA.createLoadError(mote.getUniqueid(), asmName, data, "Load failed", state, details));
            }
	};

	engine.onSuccess = function(asmid) {
            Sonoran.Registry.removeFilter(eventListener);
            var asmEntry = mote.getAssemblies().onAdd(asmid, asmName);
            engine.close(new AOP.OK(asmEntry)); 
	};
	
	if ((assembly instanceof Sonoran.Resource.Assembly) && (mote.getClass() === 'saguaro')) {
            mote.getConnection().sdxManager.loadSDXForAsmResource(assembly);
	}

	engine.setRecvFunc(engine.on1stResponse);
	engine.open(callback);
    }
};







/**
 * Download assembly using broadcast.
 * @class
 * @constructor
 * @param mote
 * @param assembly
 * @param options       Optional object with properties: 'timeout', Number, interval in milliseconds for broadcasting assembly chunks; 'monitor', ProgressMonitor.Base, a progress monitor
 */
Sonoran.MOMA.BCLoader = function(/** Sonoran.Mote */mote, /** Sonnoran.Assembly */assembly, /** Object */options) {
    assert(Sonoran.Gateway.isGatewayMote(mote), "Not a gateway mote");
    this.mote = mote;
    this.assembly = assembly;
    this.asmname = new Sonoran.AsmName(assembly);
    this.chunksize = (options&&options.chunksize&&options.chunksize>0) ? options.chunksize : Sonoran.MOMA.getDfltOption(mote, "LOADER_CHUNKSIZE");
    this.chunkIdx = -1;
    this.uuid2failure = {};
    this.uuid2success = {};
    this.options = options ? options: new Sonoran.MOMA.Options(mote);
    this.monitor = (options&&options.monitor) ? options.monitor : ProgressMonitor.getStdoutMonitor();
    this.interval = -1;
};


/** */
Sonoran.MOMA.BCLoader.prototype = {
    /**
     * Gateway mote
     * @type Sonoran.Mote
     * @private
     */
    mote: null,

    /**
     * Assembly
     * @type Sonoran.Assembly
     * @private
     */
    assembly: null,

    /**
     * Assembly name
     * @type Sonoran.AsmName
     * @private
     */
    asmname: null,

    /**
     * Chunks to stream
     * @type String[]
     * @private
     */
    chunks: null,

    /**
     * Current chunk broadcasted
     * @type Number
     * @private
     */
    chunkIdx: null,

    /**
     * Picked chunk size.
     * @type Number
     * @private
     */
    chunksize: null,

    /**
     * Callback
     * @type DFLT_ASYNC_CB
     * @private
     */
    callback: null,

    /**
     * Map of uuid to AOP.ERR
     * @type Object
     */
     uuid2failure: null,

    /**
     * Map of uuid to AOP.OK with assembly listing
     * @type Object
     */
     uuid2success: null,

    /**
     * Progress monitor.
     * @type ProgressMonitor
     */
     monitor: null,



    /**
     * Perform the broadcast download protocol
     * @param callback
     * @returns {Sonoran.MOMA.BCLoaderResult}
     */
    perform: function(/** DFLT_ASYNC_CB */callback) {
	if (BC.is(callback)) { return BC.exec(arguments.callee, this, arguments); }
	var _this = this;
	this.callback = callback;
	var gateway = this.mote.getGatewayP();
	var motes = [];
	var skip = [];
	gateway.getGatedMotes().forEach(function(mote) {
	    if (mote.getState() === Sonoran.Mote.ON) {
		motes.push(mote);
	    } else {
		skip.push(mote);
	    }
	});
	if (skip.length>0) {
	    this.monitor.onMessage(Logger.ERR, sprintf("Skip non-reachable motes: %s", skip.map(function(m) { return m.getUniqueid(); }).join(",")));
	}
	if (motes.length===0) {
	    callback(new AOP.ERR(sprintf("No reachable motes attached to gateway '%s'", gateway)));
	    return;
	}

	this.socket = new Sonoran.Socket();
	this.socket.open(undefined, BLCK);
	this.socket.onData = function(ev) {
	    var data = ev.data;
	    QUACK(0, sprintf("BCLoader.onSocketData: received: %s, chunk idx %d, data %H", ev.src, this.chunkIdx, data));
	};

	this.checkMotes(motes, function(result) {
	    if (result.code!==0) {
		_this.close(result);
		return;
	    }

	    //var cabin = result.getData();
	    //assert(cabin===null || cabin instanceof Sonoran.MOMA.Cabin);

	    _this.streamChunksIn(function(result) {	
		assert(result.code===0);
		_this.finishDownloads(motes, function(result) {
		    _this.close(result);
		});
	    });
	});
    },


    /**
     * First, stop loader on each mote, then gather assembly listings and check that
     * they are all the same.
     * @param motes
     * @param callback
     */
    checkMotes: function(/** Sonoran.Mote[] */motes, /** DFLT_ASYNC_CB */callback) {
	assert(callback);
	var _this = this;
	this.checkLoader(motes, function(result) {
	    if (result.code!==0) {
		callback(result);
		return;
	    }
	    _this.checkListings(motes, function(result) {
		if (result.code!==0) {
		    callback(result);
		    return;
		}
		_this.checkCabins(motes, callback);
	    });
	});
    },


    /**
     * @private
     */
    checkLoader: function(/** Sonoran.Mote[] */motes, /** DFLT_ASYNC_CB */callback) {
	assert(motes.length>0);
	var midx = 0;
	var stime;
	var results = [];
	var durations = [];
	var _this = this;
	var error = false;
	var f = function(result) {
	    if (result) {
		results.push(result);
		midx += 1;
		if (result.code===0) {
		    var etime = Clock.get();
		    durations.push(etime-stime);
		} else {
		    error = true;
		}
	    }
	    if (midx >= motes.length) {
		var sum = 0;
		durations.forEach(function(d) { sum += d; });
		var avg = (sum/durations.length)/2.0;
		_this.monitor.onMessage(Logger.INFO, sprintf("Average time for load-stop: %d", avg));
		_this.interval = 2 * Math.ceil(avg) + Sonoran.MOMA.LOADER_BC_BASE_INTERVAL;
		_this.monitor.onMessage(Logger.INFO, sprintf("Picking interval: %d", _this.interval));
		callback(error ? new AOP.ERR(ERR_GENERIC, "Initial loader stop operation (partly) failed", result) : new AOP.OK(results));
	    } else {
		stime = Clock.get();
		motes[midx].getMOMA().loadStop(undefined, f);
	    }
	};
	_this.monitor.onMessage(Logger.INFO, "Querying MOMA loader statuses..");
	f(null);
    },


    /**
     * @private
     */
    checkListings: function(/** Sonoran.Mote[] */motes, /** DFLT_ASYNC_CB */callback) {
	this.monitor.onMessage(Logger.INFO, "Querying MOMA assembly listings..");
	var _this = this;
	this.performMomaList(motes, function(result) {
	    if (result.code!==0) {
		callback(new AOP.ERR(ERR_GENERIC, "Intial assembly list  operation (partly) failed", result));
		return;
	    }
	    var results = result.getData();
	    
	    var list2uuids = Sonoran.AsmListing.sortFor(motes);
	    var lists = Blob.map(list2uuids, true);
	    if (lists.length>1) {
		var msg = "Assemblies mismatch on target motes:\n";
		lists.forEach(function(l) {
		    var uuids = list2uuids[l];
		    msg += uuids + ":\n";
		    msg += l;
		});
		callback(new AOP.ERR(ERR_GENERIC, msg));
		return;
	    }
	    // if target assembly is already on one of the motes
	    var asmname = new Sonoran.AsmName(_this.asmname.name, _this.asmname.major);
	    if (motes[0].getAssemblies().getMatchingEntries(asmname).length >= 1) {
		callback(new AOP.ERR(ERR_GENERIC, "Assembly already installed on all motes"));
		return;
	    }
	    callback(new AOP.OK());
	});
    },

    
    /**
     * @private
     */
    checkCabins: function(/** Sonoran.Mote[] */motes, /** DFLT_ASYNC_CB */callback) {
	this.monitor.onMessage(Logger.INFO, "Querying MOMA cabin listings..");
	var _this = this;
	this.performMomaListCabins(motes, function(result) {
	    if (result.code!==0) {
		callback(new AOP.ERR(ERR_GENERIC, "Initial cabin list operation (partly) failed", result));
		return;
	    }
	    _this.monitor.onMessage(Logger.INFO, sprintf("Assembly sizes: image %d, pheap %d", _this.assembly.imageSize, _this.assembly.idataSize));
	    var cabin = null;
	    var results = result.getData();
	    _this.monitor.onMessage(Logger.DEBUG, sprintf("Available cabins:\n%s", results.toString()));
	    for (var i = 0; i < results.length; i++) {
		var mote = motes[i];
		var cabins = results[i].getData();
		if (cabin===null) {
		    // find smallest cabin to use on this mote for assembly
		    cabin = Sonoran.MOMA.findCabin2Load(cabins, _this.assembly);
		} else {
		    // check that the selected cabin is also on this mote
		    for (var j = 0; j < cabins.length; j++) {
			var c = cabins[j];
			if (c.cabid===cabin.cabid) {
			    if (c.occupied) {
				var txt = sprintf("Cabin mismatch: picked cabin %d, occupied on %s", cabin.cabid, mote);
				callback(new AOP.ERR(ERR_GENERIC, txt));
			    }
			    if (c.imgsz < cabin.imgsz || c.pheapsz < cabin.pheapsz) {
				var txt = sprintf("Cabin mismatch: picked cabin %d, too small on %s", cabin.cabid, mote);
				callback(new AOP.ERR(ERR_GENERIC, txt));
			    }
			}
		    }
		}
	    }
	    _this.monitor.onMessage(Logger.INFO, sprintf("Preferred cabin %s", cabin?cabin:"None"));
	    if (cabin) {
		_this.options.imageSize = cabin.imgsize;
		_this.options.pheapsz = cabin.pheapsz;
	    } else {
		_this.options.imageSize = -1;
		_this.options.pheapsz = -1;
	    }
	    callback(new AOP.OK());
	});
    },



    /**
     * Stream chunks per broadcast into motes.
     * @private
     */
    streamChunksIn: function(/** DFLT_ASYNC_CB */callback) {
	this.monitor.onMessage(Logger.INFO, "Streaming in chunks..");
	var _this = this;
	var gatewayMote = this.mote;
	this.chunkIdx = 0;
	//var imgsz = cabin?cabin.imgsz:-1;
	//var pheapsz = cabin?cabin.pheapsz:-1;
	//QUACK(0, sprintf("STREAM SIZES: %d %d", this.options.imageSize, this.options.pheapSize));
	this.chunks = Sonoran.MOMA.splitAssembly(true, this.assembly, this.chunksize, this.options.imageSize, this.options.pheapSize);
	var timer;
	var f = function(ev) {
	    if (_this.chunkIdx >= _this.chunks.length) {
		callback(new AOP.OK());
		return;
	    }
	    timer = new Timer.Timer(_this.interval, gatewayMote, f);
	    _this.socket.broadcast(_this.chunks[_this.chunkIdx][1], gatewayMote, 0, timer);
	    _this.chunkIdx += 1;
	};
	f(null);
    },


    /**
     * After streaming down the chunks, the loader status on all motes is checked.
     * If no status can be retrieved, the mote is put on the failure list. Otherwise,
     * if the status is OK, the mote is checked if it contains the assembly. If not,
     * it is added to the repeat list. If the load status is not okay, it is also
     * added to the repeat list. Then, the assembly is downloaded on each mote on the
     * repeat list by a one to one download.
     * @private
     */
    finishDownloads: function(/** Sonoran.Mote[] */motes, /** DFLT_ASYNC_CB */callback) {
	this.monitor.onMessage(Logger.INFO, "Checking loader statuses again..");
	var _this = this;
	var okMotes = [];
	var failedMotes = [];
	this.performMomaLoadStatus(motes, function(result) {
	    var results = result.getData();
	    for (var i = 0; i < results.length; i++) {
		var mote = motes[i];
		if (results[i].code !== 0) {
		    _this.uuid2failure[mote.getUniqueid()] = results[i];
		} else {
		    var ls = results[i].getData();
		    var lst = ls.getStatus();
		    if (lst === SaguaroDEFS.LDSC_DATA_DONE || lst === SaguaroDEFS.LDSC_ASM_CTOR_DONE) {
			var asmEntry = mote.getAssemblies().onAdd(ls.getDetails(), _this.asmname);
			_this.uuid2success[mote.getUniqueid()] = new AOP.OK(asmEntry);
			okMotes.push(motes[i]);
		    } else {
			failedMotes.push(motes[i]);
			_this.monitor.onProgress(sprintf("Broadcast load failure for %s: %s", motes[i], ls));
		    } 
		}
	    }
//	    if (failedMotes.length > 0) {
//		_this.monitor.onProgress(sprintf("Broadcast load success for:\n%s", okMotes.map(function(m) { return m.getUniqueid(); }).join("\n")));
//		_this.monitor.onProgress(sprintf("Broadcast load failure for:\n%s", failedMotes.map(function(m) { return m.getUniqueid(); }).join("\n")));
//	    }
	    _this.singleDownloads(failedMotes, function(result) {
		callback(result);
	    });
	});
    },


    /**
     * Download assembly to motes, one by one.
     * @param motes
     * @param callback
     * @private
     */
    singleDownloads: function(/** Sonoran.Mote[] */motes, /*** DFLT_ASYNC_CB */callback) {
	var _this = this;
	if (motes.length===0) {
	    callback(new AOP.OK());
	    return;
	}
	this.monitor.onMessage(Logger.INFO, "Downloading assembly on missed motes..");
	this.performMomaStopLoad(motes, function(result) {
	    var results = result.getData();
	    var _motes = [];
	    for (var i = 0; i < results.length; i++) {
		if (results[i].code !== 0) {
		    _this.uuid2failure[motes[i].getUniqueid()] = results[i];
		} else {
		    _motes.push(motes[i]);
		}
	    }
	    motes = _motes;
	    if (motes.length===0) {
		callback(new AOP.OK());
		return;
	    }
	    var descrs = motes.map(function(mote) { var moma = mote.getMOMA(); return new Execute.Descr(moma.load, moma, _this.assembly, undefined); });
	    Execute.OneByOne(descrs, function(result) {
	    	var results = result.getData();
		for (var i = 0; i < results.length; i++) {
		    if (results[i].code !== 0) {
			_this.uuid2failure[motes[i].getUniqueid()] = results[i];
		    } else {
			var asmEntry = results[i].getData();
			_this.uuid2success[motes[i].getUniqueid()] = new AOP.OK(asmEntry);
		    }
		}
		callback(new AOP.OK());
	    });
	});
    },



    /**
     * Operation has finished.
     * @param result
     * @private
     */
    close: function(/** AOP.Result */result) {
	if (result.code===0) {
	    result = new AOP.OK(new Sonoran.MOMA.BCLoaderResult(this.uuid2success, this.uuid2failure));
	}
	this.socket.close(result);
	this.callback(result);
    },


    /**
     * @private
     */
    performMomaStopLoad: function(motes, callback) {
	var descrs = motes.map(function(mote) { var moma = mote.getMOMA(); return new Execute.Descr(moma.loadStop, moma, undefined); });
	Execute.OneByOne(descrs, callback);	
    },

    /**
     * @private
     */
    performMomaLoadStatus: function(motes, callback) {
	var descrs = motes.map(function(mote) { var moma = mote.getMOMA(); return new Execute.Descr(moma.loadStatus, moma, undefined); });
	Execute.OneByOne(descrs, callback);	
    },

    /**
     * @private
     */
    performMomaList: function(motes, callback) {
	var descrs = motes.map(function(mote) { var moma = mote.getMOMA(); return new Execute.Descr(moma.list, moma, undefined); });
	Execute.OneByOne(descrs, callback);	
    },

    /**
     * @private
     */
    performMomaListCabins: function(motes, callback) {
	var descrs = motes.map(function(mote) { var moma = mote.getMOMA(); return new Execute.Descr(moma.listCabins, moma, undefined); });
	Execute.OneByOne(descrs, callback);	
    },

    // /**
    //  * @private
    //  */
    // onSocketData: function(ev) {
    // 	var data = ev.data;
    // 	QUACK(0, sprintf("BCLoader.onSocketData: received: %s, chunk idx %d, data %H", ev.src, this.chunkIdx, data));

	// if (this.chunkIdx===1) {
	//     if ((data.length==1) && (data.charCodeAt(0) == (SaguaroDEFS.MOMA_LOADSTART_CMD|SaguaroDEFS.MOMA_REPLY_MASK))) {
	// 	QUACK(0, "1st RESP: ok");
	// 	return;
	//     }
	    
	//     if (data.length>=3) {
	// 	var cmd = data.charCodeAt(0);
	// 	var state = data.charCodeAt(1);
	// 	if (state == SaguaroDEFS.LDSC_WRONG_PROTO_VERSION) {
	// 	    var no = data.charCodeAt(2);
	// 	    var details = "Expected loader version: " + (no>>8);
	// 	    var err = Sonoran.MOMA.createLoadError(this.gatewayMote.getUniqueid(), this.assembly, data, "Wrong protocol version", state, details);
	// 	    QUACK(0, "1st RESP: " + err);
	// 	    return;
	// 	} else if (state == SaguaroDEFS.LDSC_LOAD_IN_PROGRESS) {
	// 	    var no = (data.charCodeAt(2)&0xff)<<8 + data.charCodeAt(3);
	// 	    var details = "Expected sequence number " + no;
	// 	    var err = Sonoran.MOMA.createLoadError(this.gatewayMote.getUniqueid(), this.assembly, data, "Load already in progress, try moma-stop-load to cancel old upload", state, details);
	// 	    QUACK(0, "1st RESP: " + err);
	// 	    return;
	// 	}
	//     }
	    
	// 	QUACK(0, sprintf("1st RESP: invalid %H", data));
	//     return;
	// } 
	
	
        // if (data.length != 5) {
	//     QUACK(0, sprintf("Nth RESP: unexpected %H", data));
	//     return;
        // }
        // var arr = Formatter.unpack("uUuu", data);
        // var cmd = arr[0];
        // var no = arr[1];
        // var state = arr[2];
        // var details = arr[3];
	// var d = this.chunks[this.chunkIdx-1];
	// var arr = Formatter.unpack("uU", data);
        // var seqno = arr[1];
        // if (no != seqno) {
	//     var msg = sprintf("Invalid sequence number: received=0x%x <-> expected=%x", no, this.chunkIdx);
	//     Logger.log(Logger.WARN, "MOTE", msg);
	//     QUACK(0, sprintf("Nth RESP: %s", msg));
	//     return;
        // }
        // switch(state) {
        // case SaguaroDEFS.LDSC_MORE_DATA: {
	//     return;
        // }
        // case SaguaroDEFS.LDSC_DATA_DONE:
        // case SaguaroDEFS.LDSC_ASM_CTOR_DONE: {
	//     return;
        // }
        // case SaguaroDEFS.LDSC_MISSING_DEPENDENCY: {
	//     // Details specifies an index into imports table of assembly - refers to missing assembly
	//     var imp = this.assembly.imports[details];
	//     var msg = sprintf("Missing dependency %s-%d.%d", imp.name, imp.major, imp.minor);
	//     QUACK(0, sprintf("Nth RESP: %s", msg));
	//     break;
        // }
        // default: 
	//     err = Sonoran.MOMA.createLoadError(this.gatewayMote.getUniqueid(), this.assembly, data, "Load failed", state, details);
	//     QUACK(0, sprintf("Nth RESP: %s", err.toString()));
        // }
    //}
};







//---------------------------------------------------------------------------------------------------------------
//
// MOMA Commands
//
//---------------------------------------------------------------------------------------------------------------


/**
 * MOMA commands.
 * @class
 * @private
 */
Sonoran.CLI.Commands.MOMA = {};

/**
 * @param cmd
 * @param mote
 * @returns Sonoran.MOMA.Options
 * @private
 */
Sonoran.CLI.Commands.MOMA.getMoteOptions = function(/** Object */cmd, /** Sonoran/Mote */mote) {
    assert(cmd.spanOpt);
    assert(mote instanceof Sonoran.Mote);
    var opts = new Sonoran.MOMA.Options(mote);
    if (cmd.spanOpt.isSet()) {
	opts.timeout = cmd.spanOpt.getSpan();
    }
    if (cmd.cabinImageSzOpt && cmd.cabinImageSzOpt.isSet()) {
	opts.imageSize = cmd.cabinImageSzSpec.getNumber();
    }
    if (cmd.cabinPheapSzOpt && cmd.cabinPheapSzOpt.isSet()) {
	opts.pheapSize = cmd.cabinPheapSzSpec.getNumber();
    }
    opts.monitor = cmd.shell.getProgressMonitor();
    return opts;
};


/**
 * @class 
 * @constructor
 * @private
 */
Sonoran.CLI.Commands.MOMA.LoadCommand = function(shell, name) {
    this.description =
        "Upload saguaro binary assemblies on motes or query the load status.\n" +
        "If no parameter is specified, the status of the loader on the selected motes is queried.\n" +
        "If -a is specified, any load in progress on the selected set of motes is aborted.\n" +
        "If a filename is given and a file of that name exists (absolute or in current working directory)\n" +
        "it is loaded. Otherwise, it is searched in the global assembly cache and relative to the current working\n" +
        "directory. If multiple assemblies are found, the most recent one is picked for the upload.\n" +
        "By default, the upload is carried out one by one onto the selected set of motes.\n" +
	"'-b' allows to broadcast the assembly to a set of wireless motes. When using '-b'\n" +
	"the mote specified on the command line must be a gateway mote.\n" +
	"By default, the loader queries the cabins on the mote and allocates a larger space to avoid\n" +
	"fragmentation during development. Use --imgsz=0 and --pheapsz=0 to disable this behaviour.\n" +
	"With sizes larger than 0, the cabin size can be explicitly defined. Use 'opt' to\n" +
	"manipulate the variables Sonoran.MOMA.LOADER_IMAGE_GRAIN and Sonoran.MOMA.LOADER_PHEAP_GRAIN which\n" +
	"specify the granularity of the loader cabin allocation policy.\n" +
        "Examples:\n" +
        "a0 a1 moma-load wlip-gateway-1.0.8020\n" +
        "moma-load wlip-gateway\n" +
	"w0 moma-load -b wlip-gateway";
    this.spanOpt = new GetOpt.TimeoutOpt("3s");
    this.statusOpt = new GetOpt.Option("s", "--status", 0, null, "Query loader state on mote");
    this.abortOpt = new GetOpt.Option("a", "--abort", 0, null, "Reset loader state on mote");
    this.bcOpt = new GetOpt.Option("b", "--broadcast", 0, null, "Broadcast mode, specified mote must be gateway");
    this.parallelOpt = new GetOpt.Option("p", "--parallel", 0, null, "Issue load pdus in parallel");
    this.cabinImageSzSpec = new GetOpt.Number("sz", "Cabin image size in bytes (rounded to ALIGN_SIZEINFO).");
    this.cabinImageSzSpec.setRange(0, 0, 65535);
    this.cabinImageSzOpt = new GetOpt.Option(null, '--imgsz', 0, null, null, this.cabinImageSzSpec);
    this.cabinPheapSzSpec = new GetOpt.Number("sz", "Cabin pheap size in bytes (rounded to ALIGN_SIZEINFO).");
    this.cabinPheapSzSpec.setRange(0, 0, 65535);
    this.cabinPheapSzOpt = new GetOpt.Option(null, '--pheapsz', 0, null, null, this.cabinPheapSzSpec);

    this.driftOpt  = new GetOpt.Option(null, '--drift', 0, null, null, this.driftSpec);

    var optSet = new GetOpt.OptionSet([ this.spanOpt, this.abortOpt, this.statusOpt, this.parallelOpt, this.bcOpt, this.cabinImageSzOpt, this.cabinPheapSzOpt ]);
    var fileDescr = "Assembly filename specification (with or without major, minor and build)";
    this.fileSpec = new GetOpt.Simple("assembly", fileDescr);
    var cmdSpec = new Sonoran.CLI.Spec(name, Sonoran.CLI.DST_MANY_MOTES);
    CLI.Command.call(this, shell, cmdSpec, [ optSet, this.fileSpec, new GetOpt.EndOfArgs() ], 0);
};

/** @private */
Sonoran.CLI.Commands.MOMA.LoadCommand.prototype = extend(
    CLI.Command.prototype,
    {
        /** @private */
        exec: function(callback) {
            var name = this.fileSpec.getArg();
            var abort = this.abortOpt.isSet();
            var status = this.statusOpt.isSet();
            var motes = this.cmdSpec.getMotes();
            var descrs = [];

	    if (status) {
                if (name) {
                    callback(new AOP.ERR("Contradicting 'status'-option and 'name'-specification"));
                    return;
                }
            	for (var i = 0; i < motes.length; i++) {
	            var moma = motes[i].getMOMA();
	            descrs.push(new Execute.Descr(moma.loadStatus, moma, Sonoran.CLI.Commands.MOMA.getMoteOptions(this, motes[i])));
	        }
            } else if (abort) {
                if (name) {
                    callback(new AOP.ERR("Contradicting 'abort'-option and 'name'-specification"));
                    return;
                }
            	for (var i = 0; i < motes.length; i++) {
	            var moma = motes[i].getMOMA();
	            descrs.push(new Execute.Descr(moma.loadStop, moma, Sonoran.CLI.Commands.MOMA.getMoteOptions(this, motes[i])));
	        }

            } else if (!name) {
	        for (var i = 0; i < motes.length; i++) {
	            var moma = motes[i].getMOMA();
	            descrs.push(new Execute.Descr(moma.loadStatus, moma, Sonoran.CLI.Commands.MOMA.getMoteOptions(this, motes[i])));
	        }

            } else {
	        var asmres = null;
                var resources = null;
                try {
                    resources = [ new Sonoran.Resource.Assembly(name) ];
                } catch (x) { ; }
                if (!resources) {
                    var asmname = new Sonoran.AsmName(name);
                    var paths = [];
                    Sonoran.MOMA.getSearchPaths().forEach(function(p) { paths.push(p + "/***"); });
                    paths.push(IO.File.getcwd()+"/***");
                    paths.push(Sonoran.Resource.getGACDir());
                    resources = Sonoran.Resource.Assembly.getSBAs(paths, asmname);
                }
                if (resources.length == 0) {
                    callback(new AOP.ERR(sprintf("Cannot find assembly '%s'!", name)));
	            return;
                }
                asmres = resources[0];
                this.shell.println("Loading sba '" + asmres.getSBAPath() + "'...");
		if (this.bcOpt.isSet()) {
		    if (motes.length!==1) {
			callback(new AOP.ERR("In broadcast mote, one gateway mote must be specified"));
			return;
		    }
		    var mote = motes[0];
		    if (!Sonoran.Gateway.isGatewayMote(mote)) {
			callback(new AOP.ERR("Mote is not a gateway mote"));
			return;
		    }
		    var loader = new Sonoran.MOMA.BCLoader(mote, asmres, Sonoran.CLI.Commands.MOMA.getMoteOptions(this, mote));
		    loader.perform(callback);
		    return;
		} 


	        for (var i = 0; i < motes.length; i++) {
	            var moma = motes[i].getMOMA();
	            descrs.push(new Execute.Descr(moma.load, moma, asmres, Sonoran.CLI.Commands.MOMA.getMoteOptions(this, motes[i])));
	        }
            }
            
	    if (this.parallelOpt.isSet()) {
		Execute.Parallel(descrs, callback);
	    } else {
		Execute.OneByOne(descrs, callback);
	    }
        }
    }
);





/**
 *  @class 
 * @constructor
 * @private
 */
Sonoran.CLI.Commands.MOMA.ListCommand = function(shell, name) {
    this.description =
        "List saguaro binary assemblies installed on a mote. Lists assembly id, major, minor, build,\n" +
        "name and status. If status is not OK, the assembly construtor has failed.";
    this.spanOpt = new GetOpt.TimeoutOpt("3s");
    var optSet = new GetOpt.OptionSet([ this.spanOpt ]);
    var cmdSpec = new Sonoran.CLI.Spec(name, Sonoran.CLI.DST_MANY_MOTES);
    CLI.Command.call(this, shell, cmdSpec,  [ optSet, new GetOpt.EndOfArgs() ]);
};

/** @private */
Sonoran.CLI.Commands.MOMA.ListCommand.prototype = extend(
    CLI.Command.prototype,
    {
        /** @private */
        exec: function(callback) {
	    var motes = this.cmdSpec.getMotes();
	    var descrs = [];
	    for (var i = 0; i < motes.length; i++) {
	        var moma = motes[i].getMOMA();
	        descrs.push(new Execute.Descr(moma.list, moma, Sonoran.CLI.Commands.MOMA.getMoteOptions(this, motes[i])));
	    }
	    var _this = this;
	    /** @ignore */
	    var f = function(r) {
		var results = r.getData();
	        var table;
	        var errors = [];
	        for (var i = 0; i < results.length; i++) {
                    if (results[i].code != 0) {
                        errors.push(results[i].toString());
                    } else {
			if (!table) {
			    table = new Formatter.Table2(7);
			    table.setTitle("Mote-Id", "Outdated", "State", "Assembly", "Id", "Version", "Mote-Address");
			}
                        motes[i].getAssemblies().toTable(table);
			if (i !== results.length-1) {
			    table.addSeparator();
			}
                    }
	        }
		var txt = "";
		if (table) {
	            txt += table.render().join("\n") + "\n";
		}
	        if (errors.length>0) {
	            txt += (errors.length==1) ? "Error: " + errors.join('') : "Errors:\n" + errors.join("\n");
	        }
	        callback(new AOP.OK(txt));
	    };
	    Execute.OneByOne(descrs, f);
        }
    }
);




/**
 * @class
 * @constructor
 * @private
 */
Sonoran.CLI.Commands.MOMA.DeleteCommand = function(shell, name) {
    this.description = "Delete an assembly on a single or multiple motes.";
    this.spanOpt = new GetOpt.TimeoutOpt("3s");
    var optSet = new GetOpt.OptionSet([ this.spanOpt ]);
    this.asmSpec = new GetOpt.Simple("asmid", "Id or name of assembly on mote.");
    var cmdSpec = new Sonoran.CLI.Spec(name, Sonoran.CLI.DST_MANY_MOTES);
    CLI.Command.call(this, shell, cmdSpec, [ optSet, this.asmSpec ]);
};

/** @private */
Sonoran.CLI.Commands.MOMA.DeleteCommand.prototype = extend(
    CLI.Command.prototype,
    {
        /** @private */
        exec: function(callback) {
	    var motes = this.cmdSpec.getMotes();
            var asmspec = this.asmSpec.getArg();
            var asmid = undefined;
            if (/^\d+$/.test(asmspec)) {
                asmid = parseInt(asmspec);
                if (asmid<=00 || isNaN(asmid)) {
                    callback(new AOP.ERR("Invalid assembly specification: " + asmspec));
                    return;
                }
            } else {
                asmid = new Sonoran.AsmName(asmspec);  
            }
	    var _this = this;
	    var descrs = [];
	    for (var i = 0; i < motes.length; i++) {
	        var moma = motes[i].getMOMA();
	        descrs.push(new Execute.Descr(moma.del, moma, asmid, Sonoran.CLI.Commands.MOMA.getMoteOptions(this, motes[i])));
	    }
	    Execute.OneByOne(descrs, callback);
        }
    }
);



/**
 *  @class 
 * @constructor
 * @private
 */
Sonoran.CLI.Commands.MOMA.FactoryResetCommand = function(shell, name) {
    this.description = "Execute a 'factory reset' on a single or multiple motes. The command returns\n"+
        "when the mote has returned and is ready again or a timeout occured.";
    this.spanOpt = new GetOpt.TimeoutOpt("3s"); 
    var optSet = new GetOpt.OptionSet([ this.spanOpt ]);
    var cmdSpec = new Sonoran.CLI.Spec(name, Sonoran.CLI.DST_MANY_MOTES);
    CLI.Command.call(this, shell, cmdSpec, [ optSet, new GetOpt.EndOfArgs() ]);
};

/** @private */
Sonoran.CLI.Commands.MOMA.FactoryResetCommand.prototype = extend(
    CLI.Command.prototype,
    {
        /** @private */
        exec: function(callback) {
	    var motes = this.cmdSpec.getMotes();
            var _this = this;
	    var descrs = [];
	    for (var i = 0; i < motes.length; i++) {
	        var moma = motes[i].getMOMA();
		var timeout = this.spanOpt.isSet() ? this.spanOpt.getSpan() : undefined;
	        descrs.push(new Execute.Descr(moma.factoryReset, moma, timeout));
	    }
	    Execute.OneByOne(descrs, callback);
        }
    }
);






/**
 *  @class 
 * @constructor
 * @private
 */
Sonoran.CLI.Commands.MOMA.ResetCommand = function(shell, name) {
    this.description =
        "Send a 'mote-reset' packet to a single or multiple motes. The command returns\n"+
        "when the mote has returned and is ready again or a timeout occured.";
    this.spanOpt = new GetOpt.TimeoutOpt("10s"); 
    var optSet = new GetOpt.OptionSet([ this.spanOpt ]);
    var cmdSpec = new Sonoran.CLI.Spec(name, Sonoran.CLI.DST_MANY_MOTES);
    CLI.Command.call(this, shell, cmdSpec, [ optSet, new GetOpt.EndOfArgs() ]);
};

/** @private */
Sonoran.CLI.Commands.MOMA.ResetCommand.prototype = extend(
    CLI.Command.prototype,
    {
        /** @private */
        exec: function(callback) {
	    var motes = this.cmdSpec.getMotes();
            var _this = this;
	    var descrs = [];
	    for (var i = 0; i < motes.length; i++) {
	        var moma = motes[i].getMOMA();
		var timeout = this.spanOpt.isSet() ? this.spanOpt.getSpan() : undefined;
                descrs.push(new Execute.Descr(moma.reset, moma, timeout));
	    }
	    Execute.OneByOne(descrs, callback);
        }
    }
);





/**
 *  @class 
 * @constructor
 * @private
 */
Sonoran.CLI.Commands.MOMA.LEDsCommand = function(shell, name) {
    this.description =
        "Program LEDs on mote using MOMA.";
    this.spanOpt = new GetOpt.TimeoutOpt("10s");
    var optSet = new GetOpt.OptionSet([ this.spanOpt ]);
    this.ledSpec = new GetOpt.Number("LEDs", "8-Bit mask LEDs 1 to 8 on mote.");
    this.ledSpec.setRange(0, 0, 255);
    var cmdSpec = new Sonoran.CLI.Spec(name, Sonoran.CLI.DST_MANY_MOTES);
    CLI.Command.call(this, shell, cmdSpec, [ optSet, this.ledSpec, new GetOpt.EndOfArgs() ]);
};

/** @private */
Sonoran.CLI.Commands.MOMA.LEDsCommand.prototype = extend(
        CLI.Command.prototype,
    {
        /** @private */
        exec: function(callback) {
	    var motes = this.cmdSpec.getMotes();
            var _this = this;
	    var descrs = [];
	    for (var i = 0; i < motes.length; i++) {
	        var moma = motes[i].getMOMA();
		var options = Sonoran.CLI.Commands.MOMA.getMoteOptions(this, motes[i]);
                descrs.push(new Execute.Descr(moma.setLEDs, moma, this.ledSpec.getNumber(), options));
	    }
	    Execute.OneByOne(descrs, callback);
        }
    }
);





/**
 * @class 
 * @constructor
 * @private
 */
Sonoran.CLI.Commands.MOMA.CabinCommand = function(shell, name) {
    this.description = "List cabin information info about motes. Cabins store assemblies on the motes and\n"+
        "this command helps to identify fragmentation issues on motes.";
    this.spanOpt = new GetOpt.TimeoutOpt("3s"); 
    var optSet = new GetOpt.OptionSet([ this.spanOpt ]);
    var cmdSpec = new Sonoran.CLI.Spec(name, Sonoran.CLI.DST_MANY_MOTES);
    CLI.Command.call(this, shell, cmdSpec, [ optSet, new GetOpt.EndOfArgs() ]);
};

/** @private */
Sonoran.CLI.Commands.MOMA.CabinCommand.prototype = extend(
    CLI.Command.prototype,
    {
        /** @private */
        exec: function(callback) {
	    var motes = this.cmdSpec.getMotes();
	    var descrs = [];
	    for (var i = 0; i < motes.length; i++) {
	        var moma = motes[i].getMOMA();
		var options = Sonoran.CLI.Commands.MOMA.getMoteOptions(this, motes[i]);
	        descrs.push(new Execute.Descr(moma.listCabins, moma, options));
	    }
	    var _this = this;
	    /** @ignore */
	    var f = function(r) {
		var results = r.getData();
		var table = new Formatter.Table2(6);
		table.setTitle("Uniqueid", "Cabin-Id", "Occupied", "PHeap-Size", "Image-Size", "Mote");
	        var txt="", err=[], y=0;
	        for (var i = 0; i < results.length; i++) {
	            var result = results[i];
	            var mote = descrs[i]._this.getMote();
	            if (result.code !== 0) {
		        err.push(result.toString());
	            } else {
		        var cabins = result.getData();
		        for (var j = 0; j < cabins.length; j++) {
		            var cab = cabins[j];
		            var prefix = (j!=0) ? "" : mote.getUniqueid();
		            var suffix = (j!=0) ? "" : mote.toString();
			    table.addRow(prefix, cab.cabid, cab.occupied?1:0, cab.pheapsz, cab.imgsz, suffix);
		        }
	            }
	        }
	        txt += table.render().join("\n");
                if (err.length>0) {
	            if (err.length==1) {
                        txt += "Error: " + err.join("");
                    } else {
	                txt += "Errors:\n" + err.join("\n");
                    }
	        }
	        callback(new AOP.OK(txt));
	    };
	    Execute.OneByOne(descrs, f);
        }
    }
);






/**
 * @class 
 * @constructor
 * @private
 */
Sonoran.CLI.Commands.MOMA.InfoCommand = function(shell, name) {
    this.description = "Query and print various MOMA information about heap, stack, firmware version and battery status.";
    this.spanOpt = new GetOpt.TimeoutOpt("3s");
    var optSet = new GetOpt.OptionSet([ this.spanOpt ]);
    var cmdSpec = new Sonoran.CLI.Spec(name, Sonoran.CLI.DST_MANY_MOTES);
    CLI.Command.call(this, shell, cmdSpec, [ optSet, new GetOpt.EndOfArgs() ]);
};

/** @private */
Sonoran.CLI.Commands.MOMA.InfoCommand.prototype = extend(
    CLI.Command.prototype,
    {
        /** @private */
        exec: function(callback) {
	    var motes = this.cmdSpec.getMotes();
            var descrs = [];
	    for (var i = 0; i < motes.length; i++) {
	        var moma = motes[i].getMOMA();
		var options = Sonoran.CLI.Commands.MOMA.getMoteOptions(this, motes[i]);
	        descrs.push(new Execute.Descr(moma.queryInfo, moma, options));
	    }

	    var _this = this;
	    /** @ignore */
	    var f = function(r) {
		var results = r.getData();
		var table = new Formatter.Table2(9);
		table.setTitle("Uniqueid", "THeap\nSize", "THeap\nFree", "THeap\nUnit", "VMStack\nSize", "VMStack\nFree", "Firmware", "Battery\nStatus (M:C:L)", "Platform");
	        var txt="", err=[];
	        for (var i = 0; i < results.length; i++) {
	            var result = results[i];
	            var mote = descrs[i]._this.getMote();
	            if (result.code != 0) {
		        err.push(result.toString());
	            } else {
                        var info = result.getData();
		        table.addRow(mote.getUniqueid(), info.theap_size, info.theap_free, info.theap_unit, info.vmstack_size, info.vmstack_free, info.getFirmware(), info.getBatteryStatus(), info.getPlatformInfo());
	            }
	        }
	        txt += table.render().join("\n");
                if (err.length>0) {
	            if (err.length==1) {
                        txt += "\nError: " + err.join("");
                    } else {
	                txt += "\nErrors:\n" + err.join("\n");
                    }
	        }
	        callback(new AOP.OK(txt));
	    };

	    Execute.OneByOne(descrs, f);
        }
    }
);






/**
 * @class 
 * @constructor
 * @private
 */
Sonoran.CLI.Commands.MOMA.PortsCommand = function(shell, name) {
    this.description = "List all the ports open on mote(s).";
    this.spanOpt = new GetOpt.TimeoutOpt("3s");
    var optSet = new GetOpt.OptionSet([ this.spanOpt ]);
    var cmdSpec = new Sonoran.CLI.Spec(name, Sonoran.CLI.DST_MANY_MOTES);
    CLI.Command.call(this, shell, cmdSpec, [ optSet, new GetOpt.EndOfArgs() ]);
};

/** @private */
Sonoran.CLI.Commands.MOMA.PortsCommand.prototype = extend(
    CLI.Command.prototype,
    {
        /** @private */
        exec: function(callback) {
	    var motes = this.cmdSpec.getMotes();
            var descrs = [];
	    for (var i = 0; i < motes.length; i++) {
	        var moma = motes[i].getMOMA();
		var options = Sonoran.CLI.Commands.MOMA.getMoteOptions(this, motes[i]);
	        descrs.push(new Execute.Descr(moma.queryPorts, moma, options));
	    }
	    var _this = this;
	    /** @ignore */
	    var f = function(r) {
	        var results = r.getData();
                var txt="", err=[];
	        for (var i = 0; i < results.length; i++) {
	            var result = results[i];
	            var mote = descrs[i]._this.getMote();
	            if (result.code != 0) {
		        err.push(result.toString());
	            } else {
                        var ports = result.getData();
                        if (ports.length==0) {
                            txt += sprintf("%s: %s\n", mote.getUniqueid(), "No open ports");
                        } else {
                            txt += sprintf("%s: Ports %s\n", mote.getUniqueid(), result.getData().join(", "));
                        }
	            }
	        }
                if (err.length>0) {
	            if (err.length==1) {
                        txt += "Error: " + err.join("");
                    } else {
	                txt += "Errors:\n" + err.join("\n");
                    }
	        }
	        callback(new AOP.OK(txt));
	    };

	    Execute.OneByOne(descrs, f);
        }
    }
);





// /**
//  * @class 
//  * @constructor
//  * @private
//  */
// Sonoran.CLI.Commands.MOMA.WlipCommand = function(shell, name) {
//     this.description =
//         "Show or configure the current WLIP settings of a single or multiple motes.\n"+
//         "If no option is set, the current WLIP configuration is shown. Otherwise, the\n"+
//         "specified settings are applied.";
//     this.shutdownOpt = new GetOpt.Option(null,"--shutdown", 0, null,
// 					 "Shutdown WLIP if mote is using it. This releases the radio\n"+
// 					 "and, thus, might trigger activation of applications.");
//     this.spanOpt = new GetOpt.TimeoutOpt("3s");
//     this.panSpec = new GetOpt.Number("panid", "PAN id, hex, default 0x4040.", null, 16);
//     this.panSpec.setRange(SaguaroDEFS.WLIP_DEFAULT_PANID, 0, 65535);
//     this.panOpt = new GetOpt.Option("p", "--panid", 0, null, null, this.panSpec);
//     this.chanSpec = new GetOpt.Number("chan", "Channel, decimal, default 0.", null, 10);
//     this.chanSpec.setRange(SaguaroDEFS.WLIP_DEFAULT_CHNL, 0, 256);
//     this.chanOpt = new GetOpt.Option("c", "--channel", 0, null, null, this.chanSpec);
//     this.retriesSpec = new GetOpt.Number("retries", "TX retries, decimal, default 3.", null, 10);
//     this.retriesSpec.setRange(SaguaroDEFS.WLIP_DEFAULT_TXRETRIES, 0, 256);
//     this.retriesOpt = new GetOpt.Option("r", "--retries", 0, null, null, this.retriesSpec);
//     this.bufszSpec = new GetOpt.Number("bufsz", "Buffer size, decimal, default 1270.", null, 10);
//     this.bufszSpec.setRange(1270, 0, 65536);
//     this.bufszOpt = new GetOpt.Option("s", "--size", 0, null, null, this.bufszSpec);
//     var optSet = new GetOpt.OptionSet([ this.shutdownOpt,
// 					this.spanOpt,
// 					this.panOpt,
// 					this.chanOpt,
// 					this.retriesOpt,
// 					this.bufszOpt ]);
//     var cmdSpec = new Sonoran.CLI.Spec(name, Sonoran.CLI.DST_MANY_MOTES);
//     CLI.Command.call(this, shell, cmdSpec, [ optSet, new GetOpt.EndOfArgs() ]);
// };

// /** @private */
// Sonoran.CLI.Commands.MOMA.WlipCommand.prototype = extend(
//     CLI.Command.prototype,
//     {
//         /** @private */
//         exec: function(callback) {
// 	    var motes = this.cmdSpec.getMotes();
//             var config = null;

//             if (this.panOpt.isSet()||this.chanOpt.isSet()||this.retriesOpt.isSet()||this.bufszOpt.isSet()) {
// 		if( this.shutdownOpt.isSet() ) {
//                     callback(new AOP.ERR(this.shutdownOpt.getLongOpt()+" is incompatible with other options - specify it alone."));
// 		    return;
// 		}
//                 config = new Sonoran.WLIP.Config(
//                     this.panSpec.getNumber(),
//                     this.chanSpec.getNumber(),
//                     this.retriesSpec.getNumber(),
//                     this.bufszSpec.getNumber()
//                 );
//             }
// 	    if( this.shutdownOpt.isSet() ) {
// 		var descrs = [];
// 		for (var i = 0; i < motes.length; i++) {
// 	            var moma = motes[i].getMOMA();
// 		    var options = Sonoran.CLI.Commands.MOMA.getMoteOptions(this, motes[i]);
// 	            descrs.push(new Execute.Descr(moma.shutdownWLIP, moma, options));
// 		}
// 		var _this = this;
// 		/** @ignore */
// 		var f = function(r) {
// 		    var results = r.getData();
//                     var txt="", err=[];
// 	            for (var i = 0; i < results.length; i++) {
// 			var result = results[i];
// 			var mote = descrs[i]._this.getMote();
// 			if (result.code != 0) {
// 		            err.push(result.toString());
// 			} else {
//                             txt += "WLIP turned off.\n";
// 			}
// 	            }
//                     if (err.length>0) {
// 			if (err.length==1) {
//                             txt += "Error: " + err.join("");
// 			} else {
// 	                    txt += "Errors:\n" + err.join("\n");
// 			}
// 	            }
// 	            callback(new AOP.OK(txt));
// 		};
// 		Execute.OneByOne(descrs, f);
// 		return;
// 	    }
//             var descrs = [];
// 	    for (var i = 0; i < motes.length; i++) {
// 	        var moma = motes[i].getMOMA();
// 		var options = Sonoran.CLI.Commands.MOMA.getMoteOptions(this, motes[i]);
// 	        descrs.push(new Execute.Descr(moma.configureWLIP, moma, config, options));
// 	    }

// 	    var _this = this;
// 	    /** @ignore */
// 	    var f = function(r) {
// 	        var results = r.getData();
//                 var txt="", err=[];
// 	        for (var i = 0; i < results.length; i++) {
// 	            var result = results[i];
// 	            var mote = descrs[i]._this.getMote();
// 	            if (result.code != 0) {
// 		        err.push(result.toString());
// 	            } else {
//                         var c = result.getData();
//                         if (c==null) {
//                             txt += sprintf("%s: A\n%s\n", mote.getUniqueid(), config.toString());
//                         } else {
//                             txt += sprintf("%s: B\n%s\n", mote.getUniqueid(), c.toString());
//                         }
// 	            }
// 	        }
//                 if (err.length>0) {
// 	            if (err.length==1) {
//                         txt += "Error: " + err.join("");
//                     } else {
// 	                txt += "Errors:\n" + err.join("\n");
//                     }
// 	        }
// 	        callback(new AOP.OK(txt));
// 	    };

// 	    Execute.OneByOne(descrs, f);
//         }
//     }
// );



/**
 * @class 
 * @constructor
 * @private
 */
Sonoran.CLI.Commands.MOMA.EUI64Command = function(shell, name) {
    this.description =
        "Get or set the unique id of a mote (in eui-64 format) using the mote manager (MOMA). Example:\n" +
        "moma-eui\n" +
        "moma-eui 02-00-00-00-00-41-A6-30\n";
    this.spanOpt = new GetOpt.TimeoutOpt("3s");
    var optSet = new GetOpt.OptionSet([ this.spanOpt ]);
    this.eui64Spec = new GetOpt.Simple("eui64", "Partial or complete EUI-64 mote id.");
    var cmdSpec = new Sonoran.CLI.Spec(name, Sonoran.CLI.DST_MANY_MOTES);
    CLI.Command.call(this, shell, cmdSpec, [ optSet, this.eui64Spec ], 0);
};

/** @private */
Sonoran.CLI.Commands.MOMA.EUI64Command.prototype = extend(
    CLI.Command.prototype,
    {
        /** @private */
        exec: function(callback) {
            var motes = this.cmdSpec.getMotes();
            var eui64 = this.eui64Spec.getArg();
            if (eui64) {
                if (motes.length > 1) {
                    callback(new AOP.ERR("Specify a single mote to set its EUI-64 unique id."));
                    return;
                }
                try {
                    eui64 = Util.UUID.completeEUI(eui64);
                } catch (x) {
                    callback(new AOP.ERR("Invalid EUI-64: " + x));
                    return;
                }
		var options = Sonoran.CLI.Commands.MOMA.getMoteOptions(this, motes[0]);
                motes[0].getMOMA().setEUI64(eui64, options, callback);
                return;
            }

            var descrs = [];
	    for (var i = 0; i < motes.length; i++) {
	        var moma = motes[i].getMOMA();
		var options = Sonoran.CLI.Commands.MOMA.getMoteOptions(this, motes[i]);
	        descrs.push(new Execute.Descr(moma.getEUI64, moma, options));
	    }

	    var _this = this;
	    /** @ignore */
	    var f = function(r) {
		var results = r.getData();
                var txt="", err=[];
	        for (var i = 0; i < results.length; i++) {
	            var result = results[i];
	            var mote = descrs[i]._this.getMote();
	            if (result.code != 0) {
		        err.push(result.toString());
	            } else {
                        txt += sprintf("EUI-64: mote %s\n", mote.getUniqueid());
	            }
	        }
                if (err.length>0) {
	            if (err.length==1) {
                        txt += "Error: " + err.join("");
                    } else {
	                txt += "Errors:\n" + err.join("\n");
                    }
	        }
	        callback(new AOP.OK(txt));
	    };
	    Execute.OneByOne(descrs, f);
        }
    }
);


// /**
//  * @class 
//  * @constructor
//  * @private
//  */
// Sonoran.CLI.Commands.MOMA.IPv4Command = function(shell, name) {
//     this.description =
//         "Get or set the IPv4 configuration of a mote. Example:\n" +
//         "moma-ipv4\n" +
//         "moma-ipv4 192.168.1.2\n" +
// 	"moma-ipv4 --ip 192.158.1.2 --subnwMask 255.255.255.0 --gateway 192.168.1.1 --udp 9999\n";
    
//     this.spanOpt = new GetOpt.TimeoutOpt("3s");
//     this.optSpecIpAddress = new GetOpt.Simple("iii.iii.iii.iii", "IPv4 address and subnet mask bits. Example 192.168.1.123");
//     this.option4IpAddress = new GetOpt.Option('i','--ip', 0, null, null, this.optSpecIpAddress);
//     this.optSpecMrUdpPort = new GetOpt.Number("u", "UDP port to be used for MOMA communication. Example 12345");
//     this.option4MrUdpPort = new GetOpt.Option('u','--udp', 0, null, null, this.optSpecMrUdpPort);
//     this.optSpecSubnwMask = new GetOpt.Simple("sss.sss.sss.sss", "gateway IPv4 address used for routing. Example 255.255.255.0");
//     this.option4SubnwMask = new GetOpt.Option('s','--subnwMask', 0, null, null, this.optSpecSubnwMask);
//     this.optSpecGwAddress = new GetOpt.Simple("ggg.ggg.ggg.ggg", "gateway IPv4 address used for routing. Example 192.168.1.1");
//     this.option4GwAddress = new GetOpt.Option('g','--gateway', 0, null, null, this.optSpecGwAddress);

//     var cmdSpec = new Sonoran.CLI.Spec(name, Sonoran.CLI.DST_MANY_MOTES);
//     var optSet = new GetOpt.OptionSet([ this.spanOpt,
// 					this.option4IpAddress, 
// 					this.option4MrUdpPort,
// 					this.option4GwAddress,
// 					this.option4SubnwMask ]);
//     CLI.Command.call(this, shell, cmdSpec, [ optSet ], 0);    
// };

// /** @private */
// Sonoran.CLI.Commands.MOMA.IPv4Command.prototype = extend(
//     CLI.Command.prototype,
//     {
//         /** @private */
//         exec: function(callback) {
//             var motes = this.cmdSpec.getMotes();
//             if (motes.length != 1) {
// 		callback(new AOP.ERR("Specify a single mote."));
//                 return;
// 	    }

// 	    var options = Sonoran.CLI.Commands.MOMA.getMoteOptions(this, motes[0]);

// 	    var ipAddress = this.optSpecIpAddress.getArg();
// 	    var mrUdpPort = this.optSpecMrUdpPort.getNumber();
// 	    var gwAddress = this.optSpecGwAddress.getArg();
// 	    var subnwMask = this.optSpecSubnwMask.getArg();

// 	    if (!ipAddress && !mrUdpPort && !gwAddress && !subnwMask) {
// 		motes[0].getMOMA().getIPv4Config(options, callback);
// 		return;
// 	    }

// 	    if (!ipAddress || 
// 		!mrUdpPort ||
// 		!gwAddress ||
// 		!subnwMask) {
// 		callback(new AOP.ERR("Specify the complete IP configuration."));
// 		return;
// 	    }


//             motes[0].getMOMA().setIPv4Config(ipAddress, mrUdpPort, subnwMask, gwAddress, options, callback);
//         }
//     }
// );




CLI.commandFactory.addModule("Sonoran.CLI.Commands.MOMA");



