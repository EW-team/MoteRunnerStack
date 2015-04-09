//  (C) COPYRIGHT INTERNATIONAL BUSINESS MACHINES CORPORATION 2006-2010
//                       ALL RIGHTS RESERVED
//        IBM Research Division, Zurich Research Laboratory
// --------------------------------------------------------------------


/**
 * Mote manager functionality
 * @namespace Sonoran.MOMA 
 */
Sonoran.MOMA = {};




Class.define(
    "Sonoran.MOMA.LoadError",
    /**
     * @lends Sonoran.MOMA.LoadError.prototype
     */
    {
	/**
	 * Details of an error returned by Sonoran.MOMA.load if the error code is an Sonoran.MOMA.LDSC error.
	 * @constructs
	 * @param asm     Name of offending asssembly
	 * @param data    Packet leading to error
	 * @param state  Optional, state loader returned
	 * @param details Optional, details loader returned
	 */
	__constr__: function(/** Sonoran.AsmName */asmName, /** String */data, /** Number */state, /** Number */details) {
	    assert(!(asmName instanceof Sonoran.Assembly));
	    this.asmName = asmName;
	    this.state = state;
	    this.details = details;
	    this.data = data;
	},

      /**
       * State (if set)
       * @type Number
       */
      state: null,
      /**
       * Details  (if set)
       * @type Number
       */
      details: null,
      /**
       * Last data packet
       * @type String
       */
      data: null,
      /**
       * Name of assembly.
       * @type Sonoran.AsmName
       */
      asmName: null,
      /**
       * @returns {Sonoran.AsmName} name of assembly
       */
      getAsmName: function() {
         return this.asmName;
      },
      /**
       * @returns {Number} details in loader response
       */
      getDetails: function() {
	 return this.details;
      },
      /**
       * @returns {Number} statein loader response
       */
      getState: function() {
	 return this.state;
      },
      /**
       * @returns {String} packet leading to error.
       */
      getData: function() {
	 return this.data;
      }
    }
);







Class.define(
   "Sonoran.MOMA.LoadStatus",
   /**
    * @lends Sonoran.MOMA.LoadStatus.prototype
    */
   {
       /**
	* @see Sonoran.MOMA.loadStatus
	* @constructs
	* @param mote
	* @param seqno
	* @param status
	* @param details
	*/
       __constr__: function(/** Sonoran.Mote */mote, /** Number */seqno, /** Number */status, /** Number */details) {
	   this.mote = mote;
	   this.seqno = seqno;
	   this.status = status;
	   this.details = details;
       },
       /**
	* Sequence number
	* @type Number
	* @private
	*/
       seqno: -1,

       /**
	* Status
	* @type Number
	* @private
	*/
       status: 0,
       
       /**
	* Details
	* @type Number
	* @private
	*/
       details: 0,

       /**
	* @returns {Number}
	*/
       getStatus: function() {
	   return this.status;
       },


       /**
	* @returns {Number}
	*/
       getDetails: function() {
	   return this.details;
       },


       /**
	* @returns {String}
	*/
       toString: function() {
	   var txt = "Loader-State: ";
	   var status = this.status;
	   var details = this.details;
	   assert(typeof(details)==='number');
	   assert(typeof(status)==='number');
	   for (var l in SaguaroDEFS) {
	       if (SaguaroDEFS[l]===details && /^LDSC_INVALID/.test(l)) {
		   details = l.substring(5);
		   break;
	       }
	   }
	   for (var l in SaguaroDEFS) {
	       if (SaguaroDEFS[l]===status && /^LDSC_/.test(l) && !(/^LDSC_INVALID/.test(l))) {
		   status = l.substring(5);
		   break;
	       }
	   }
	   txt += sprintf("status %s, seqno %d, details 0x%x", status, this.seqno, details);
	   return txt;
       }
   }
);






Class.define(
    "Sonoran.MOMA.Cabin",
    /**
     * @lends Sonoran.MOMA.Cabin.prototype
     */
    {
	/**
	 * Sonoran.MOMA.Cabin encapsulates cabin information
	 * @constructs
	 * @param cabid
	 * @param occupied
	 * @param imgsz
	 * @param pheapsz
	 */
	__constr__: function(/** Sonoran.Mote */mote, /** Number */cabid, /**Boolean */occupied, /** Number */imgsz, /** Number */pheapsz) {
	    assert(mote instanceof Sonoran.Mote, "API change: Sonoran.MOMA.Cabin takes mote instance as first parameter");
	    this.mote = mote;
	    this.cabid = cabid;
	    this.occupied = occupied;
	    this.imgsz = imgsz * SaguaroDEFS.ALIGN_SIZEINFO;
	    this.pheapsz = pheapsz * SaguaroDEFS.ALIGN_SIZEINFO;
	},

	/**
	 * @type Sonoran.Mote
	 */
	mote: null,
	/**
	 * @type Number
	 */
	cabid: -1,
	/**
	 * @type Boolean
	 */
	occupied: false,
	/**
	 * @type Number
	 */
	imgsz: -1,
	/**
	 * @type Number
	 */
	pheapsz: -1,
	
	/**
	 * @returns {String} string
	 */
	toString: function() {
	    return sprintf("%s-Cabin:<id %d, occupied %s, imgsz %d, pheapsz %d>", this.mote, this.cabid, this.occupied.toString(), this.imgsz, this.pheapsz);
	}
    }
);





Class.define(
    "Sonoran.MOMA.Info",
    /**
     * @lends Sonoran.MOMA.Info.prototype
     */
    {
	/**
	 * Sonoran.MOMA.Info encapsulates the information one can query from a mote.
	 * @constructs  
	 * @param mote       mote
	 * @param theap_size
	 * @param theap_free
	 * @param theap_unit
	 * @param vmstack_size
	 * @param vmstack_free
	 * @param fwmajor
	 * @param fwminor
	 * @param fwbuild
	 * @param platform
	 * @param battery_status
	 */
	__constr__: function(mote, theap_size, theap_free, theap_unit, vmstack_size, vmstack_free, fwmajor, fwminor, fwbuild, pwcharge, pwmain, pwcharging, pwcrit, platform) {
	    this.mote = mote;
	    this.theap_size = theap_size;
	    this.theap_free = theap_free;
	    this.theap_unit = theap_unit;
	    this.vmstack_size = vmstack_size;
	    this.vmstack_free = vmstack_free;
	    this.fwmajor = fwmajor;
	    this.fwminor = fwminor;
	    this.fwbuild = fwbuild;
	    this.platform = platform;
	    this.pwcharging = pwcharging;
	    this.pwcharge = pwcharge;
	    this.pwmain = pwmain;
	    this.pwcrit = pwcrit;
	},

	/**
	 * @type Sonoran.Mote
	 */
	mote: null,
	/**
	 * @type Number
	 */
	theap_size: -1,
	/**
	 * @type Number
	 */
	theap_free: -1,
	/**
	 * @type Number
	 */
	theap_unit: -1,
	/**
	 * @type Number
	 */
	vmstack_size: -1,
	/**
	 * @type Number
	 */
	vmstack_free: -1,
	/**
	 * @type Number
	 */
	fwmajor: -1,
	/**
	 * @type Number
	 */
	fwminor: -1,
	/**
	 * @type Number
	 */
	fwbuild: -1,
	/**
	 * @type Number
	 */
	platform: -1,
	/**
	 * @type Number
	 */
	pwcharge: 0,
	/**
	 * @type Boolean
	 */
	pwmain: false,
	/**
	 * @type Boolean
	 */
	pwcrit: false,
	/**
	 * @type Boolean
	 */
	pwcharging: false,

	/**
	 * @returns {Sonoran.Mote} the mote
	 */
	getMote: function() {
	    return this.mote;
	},
	/**
	 * @returns {String} firmware string
	 */
	getFirmware: function() {
	    return sprintf("%d.%d.%d", this.fwmajor, this.fwminor, this.fwbuild);
	},
	/**
	 * @returns {String} battery status
	 */
	getBatteryStatus: function() {
	    var s= "Unknown";
	    if (this.pwcharge>=0) {
		s = Math.round(this.pwcharge*(100.0/255.0)).toString() + '%';
	    }
	    return sprintf("%s:%s:%s %s", (this.pwmain?'M':'-'), (this.pwcharging?'C':'-'), (this.pwcrit?'L':'-'), s);
	},
	/**
	 * @returns {String} platform info as String from MOTE_RUNNER_PLATFORMS
	 */
	getPlatformInfo: function() {
	    for (var i = 0; i < MOTE_RUNNER_PLATFORMS.length; i++) {
		if (this.platform==MOTE_RUNNER_PLATFORMS[i].id) {
		    return MOTE_RUNNER_PLATFORMS[i].info;
		}
	    }
	    return "Unknown";
	},
	/**
	 * @returns {String} string
	 */
	toString: function() {
	    return sprintf("%s: thsize %d, thfree %d, thunit %d, stacksize %d, stackfree %d, firmware %d.%d.%d, platform %d, pw charge %d, pw main %d, pw charging %d, pw critical %d", this.mote.getUniqueid(), this.theap_size, this.theap_free, this.theap_unit,this.vmstack_size, this.vmstack_free, this.fwmajor, this.fwminor, this.fwbuild, this.platform, this.pwcharge, this.pwmain, this.pwcharging, this.pwcrit);
	}
    }
);










Class.define(
   "Sonoran.MOMA.BCLoaderResult",
   /**
    * @lends Sonoran.MOMA.BCLoaderResult.prototype
    */
   {
       /**
	* @see Sonoran.MOMA.BCLoader
	* @constructs
	* @param uuid2success
	* @param uuid2failure
	*/
       __constr__: function(/** Object */uuid2success, /** Object */uuid2failure) {
	   this.uuid2success = uuid2success;
	   this.uuid2failure = uuid2failure;
       },

       /**
	* Map of uuid to AOP.ERR
	* @type Object
	*/
       uuid2failure: null,
       
       /**
	* Map of uuid to AOP.OK with downloaded Sonoran.AsmEntry
	* @type Object
	*/
       uuid2success: null,
       
       /**
	* @returns {String}
	*/
       toString: function() {
	   var lines = [];
	   for (var uuid in this.uuid2failure) {
	       lines.push(sprintf("%s: %s", uuid, this.uuid2failure[uuid]));
	   }
	   var motes = [];
	   for (var uuid in this.uuid2success) {
	       lines.push(sprintf("%s: %s", uuid, this.uuid2success[uuid]));
	   }
	   return lines.join("\n");
       }
   }
);

