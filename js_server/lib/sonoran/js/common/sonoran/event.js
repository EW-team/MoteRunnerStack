//  (C) COPYRIGHT INTERNATIONAL BUSINESS MACHINES CORPORATION 2006-2010
//                       ALL RIGHTS RESERVED
//        IBM Research Division, Zurich Research Laboratory
// --------------------------------------------------------------------

/**
 * @type String
 */
Sonoran.EV_CAT_MOTE = "mote";

/**
 * @type String
 */
Sonoran.EV_CAT_PORT = "port";

/**
 * @type String
 */
Sonoran.EV_NAME_POSITION = "position";
/**
 * @type String
 */
Sonoran.EV_NAME_MEDIA = "media";
/**
 * @type String
 */
Sonoran.EV_NAME_REGISTER = "register";
/**
 * @type String
 */
Sonoran.EV_NAME_DEREGISTER = "deregister";


/**
 * @type String
 */
Sonoran.EV_NAME_UNIQUEID = "uniqueid";

/**
 * @type String
 */
Sonoran.EV_NAME_STATE = "state";

/**
 * @type String
 */
Sonoran.EV_NAME_TYPE = "type";
/**
 * @type String
 */
Sonoran.EV_NAME_NAME = "name";

/**
 * @type String
 */
Sonoran.EV_NAME_ASSEMBLIES = "assemblies";

/**
 * @type String
 */
Sonoran.EV_NAME_ADDRESSES = "addresses";


/**
 * @type String
 */
Sonoran.EV_NAME_CURRENTTRACE = "currentTrace";





/**
 * @type String
 */
Sonoran.EV_CAT_MSETUP = "msetup";

/**
 * @type String
 */
Sonoran.EV_NAME_DETECT = "detect";

/**
 * @type String
 */
Sonoran.EV_NAME_PERFORM = "perform";






/**
 * @type String
 * @constant
 */
Sonoran.EV_CAT_HALT = "halt";

/**
 * @type String
 */
Sonoran.EV_NAME_TIMEOUT = Event.EV_NAME_TIMEOUT;

/**
 * @type String
 * @constant
 */
Sonoran.EV_NAME_NEEDMOREDATA = "needMoreData";

/**
 * @type String
 * @constant
 */
Sonoran.EV_NAME_BYUSER = "byUser";



/**
 * @type String
 * @constant
 */
Sonoran.EV_CAT_RADIOHW = "radiohw";

/**
 * @type String
 * @constant
 */
Sonoran.EV_NAME_RXFRAME = "rxframe";

/**
 * @type String
 * @constant
 */
Sonoran.EV_NAME_TXFRAME = "txframe";





/**
 * @type String
 * @constant
 */
Sonoran.EV_CAT_VM = "vm";

/**
 * @type String
 * @constant
 */
Sonoran.EV_NAME_ASMCTOR = "asmCtor";
/**
 * @type String
 * @constant
 */
Sonoran.EV_NAME_ASMDELETED = "asmDeleted";
/**
 * @type String
 * @constant
 */
Sonoran.EV_NAME_EXTHROW = "exThrow";
/**
 * @type String
 * @constant
 */
Sonoran.EV_NAME_EXCATCH = "exCatch";
/**
 * @type String
 * @constant
 */
Sonoran.EV_NAME_EXUNCAUGHT = "exUncaught";
/**
 * @type String
 * @constant
 */
Sonoran.EV_NAME_BREAKPOINTS = "breakpoints";
/**
 * @type String
 * @constant
 */
Sonoran.EV_NAME_WATCHPOINTS = "watchpoints";
/**
 * @type String
 * @constant
 */
Sonoran.EV_NAME_BCAFTER = "bcAfter";
/**
 * @type String
 * @constant
 */
Sonoran.EV_NAME_BCBEFORE = "bcBefore";
/**
 * @type String
 * @constant
 */
Sonoran.EV_NAME_WATCHPOINTOBSOLETE = "watchPointObsolete";




/**
 * @type String
 */
Sonoran.EV_CAT_LED = "led";

/**
 * @type String
 */
Sonoran.EV_NAME_ON = "on";


/**
 * @type String
 */
Sonoran.EV_NAME_OFF = "off";




/**
 * @type String
 */
Sonoran.EV_CAT_SAGUARO = "saguaro";

/**
 * @type String
 */
Sonoran.EV_NAME_CONNECT = "connect";

/**
 * @type String
 */
Sonoran.EV_NAME_DISCONNECT = "disconnect";

/**
 * @type String
 */
Sonoran.EV_NAME_INFO = "info";

/**
 * @type String
 */
Sonoran.EV_NAME_START = "start";



/**
 * @type String
 */
Sonoran.EV_CAT_BUGZ = "bugz";




/**
 * @type String
 */
Sonoran.EV_CAT_SONORAN = "sonoran";

/**
 * @type String
 */
Sonoran.EV_NAME_MOTELET = "motelet";




/**
 * @type String
 */
Sonoran.EV_CAT_GATEWAY = "gateway";

/**
 * @type String
 */
Sonoran.EV_NAME_HELLO = "hello";

/**
 * @type String
 */
Sonoran.EV_NAME_BYE = "bye";









/**
 * Events specific to Sonoran.
 * @namespace Sonoran.Event 
 */
Sonoran.Event = {};




/**
 * @param evt
 * @returns {Boolean}
 */
Sonoran.isRadioTxframeEvent = function(evt) {
    return (evt.category==='radiohw' && evt.evname==='txframe');
};

/**
 * @param evt
 * @returns {Boolean}
 */
Sonoran.isRadioRxframeEvent = function(evt) {
    return (evt.category==='radiohw' && evt.evname==='rxframe');
};

/**
 * @param evt
 * @returns {Boolean}
 */
Sonoran.isMotePositionEvent = function(evt) {
    return (evt.category==='mote' && evt.evname==='position');
};


/**
 * @param evt
 * @returns {Boolean}
 */
Sonoran.isRadioAddrEvent = function(evt) {
    return (evt.category==='radiohw' && evt.evname==='addr');
};


/**
 * @param mote
 * @param x
 * @param y
 * @param z
 * @param time Optional
 * @returns {Sonoran.Event.Generic} Event with properties mote, x, y, and z
 */
Sonoran.createPositionEvent = function(/** Sonoran.Mote */mote, /** Number */x, /** Number */y, /** Number */z, /** Number */time) {
    if (!time) { time = Sonoran.Mote.estimateCurrentTime(mote); }
    var ev = new Sonoran.Event.Generic({
	category: "mote",
	evname: "position",
	time: time,
	mote: mote,
	x: x,
	y: y,
	z: z
    });
    return ev;
};


/**
 * @param mote
 * @param state
 * @param subState
 * @param time        Optional
 * @returns {Sonoran.Event.Generic} Event with properties mote, state and subState
 */
Sonoran.createStateEvent = function(/** Sonoran.Mote */mote, /** String */state, /** Number */subState, /** Number */time) {
    assert(state===Sonoran.Mote.ON||state===Sonoran.Mote.OFF||state===Sonoran.Mote.RESET||state===Sonoran.Mote.PENDING);
    if (!time) { time = Sonoran.Mote.estimateCurrentTime(mote); }
    var ev = new Sonoran.Event.Generic({
	category: "mote",
	evname: "state",
	time: time,
	mote: mote,
	state: state,
	subState: subState?subState:0
    });
    return ev;
};

/**
 * @param mote
 * @param evname  "name" or "type"
 * @param time    Optional
 * @returns {Sonoran.Event.Generic} Event with properties name, type and clazz
 */
Sonoran.createInfoEvent = function(/** Sonoran.Mote */mote, /** String */evname, /** Number */time) {
    if (!time) { time = Sonoran.Mote.estimateCurrentTime(mote); }
    var ev = new Sonoran.Event.Generic({
	category: "mote",
	evname: evname,
	time: time,
	mote: mote,
	name: mote.getName(),
	type: mote.getType(),
	clazz: mote.getClass()
    });
    return ev;
};


/**
 * Field value in assemblies event.
 * @type String
 */
Sonoran.ASSEMBLIES_LOAD = "load";
/**
 * Field value in assemblies event.
 * @type String
 */
Sonoran.ASSEMBLIES_DELETE = "delete";
/**
 * Field value in assemblies event.
 * @type String
 */
Sonoran.ASSEMBLIES_REFRESH = "refresh";


/**
 * @param mote
 * @param listing
 * @param reason  Sonoran.
 * @param time    Optional
 * @returns {Sonoran.Event.Generic} Event with properties reason, origin, listing
 */
Sonoran.createAssembliesEvent = function(/** Sonoran.Mote */mote, /** Sonoran.AsmListing */listing, /** String */reason,  /** Number */time) {
    if (!time) { time = Sonoran.Mote.estimateCurrentTime(mote); }
    var origin = listing.getOrigin();
    assert(origin==='saguaro'||origin==='moma');
    assert(reason===Sonoran.ASSEMBLIES_LOAD||reason===Sonoran.ASSEMBLIES_DELETE||reason===Sonoran.ASSEMBLIES_REFRESH);
    var ev = new Sonoran.Event.Generic({
	category: "mote",
	evname:  Sonoran.EV_NAME_ASSEMBLIES,
	mote: mote,
	time: time,
	reason: reason,
	origin: origin,
	listing: listing
    });
    return ev;
};


/**
 * @param mote
 * @param addrs
 * @param time    Optional
 * @returns {Sonoran.Event.Generic} Event with properties addrs
 */
Sonoran.createAddressesEvent = function(/** Sonoran.Mote */mote, /** String[] */addrs, /** Number */time) {
    if (!time) { time = Sonoran.Mote.estimateCurrentTime(mote); }
    var ev = new Sonoran.Event.Generic({
	category: "mote",
	evname:  Sonoran.EV_NAME_ADDRESSES,
	mote: mote,
	time: time,
	addrs: addrs
    });
    return ev;
};


/**
 * Returns mote deregister event.
 * @param mote
 * @param time    Optional
 * @returns {Sonoran.Event.Generic} Event with property mote
 */
Sonoran.createDeregisterEvent = function(/** Sonoran.Mote */mote, /** Number */time) {
    if (!time) { time = Sonoran.Mote.estimateCurrentTime(mote); }
    var ev = new Sonoran.Event.Generic({
	category: "mote",
	evname:  Sonoran.EV_NAME_DEREGISTER,
	time: time,
	mote: mote
    });
    return ev;
};






Event.extend(
    "Sonoran.Event.Media",
    /**
     * @lends Sonoran.Event.Media.prototype
     */
    {
	/**
	 * Sonoran.Event.Media instances contain the Packets received from motes and routed within Sonoran.
	 * Especially, Sonoran.Socket receives and forwards instances of Sonoran.Event.Media.
	 * @constructs
	 * @augments Event
	 * @param dstport Destination port
	 * @param mote    Source mote
	 * @param srcport Source port
	 * @param data    Payload
	 * @param time    In microseconds
	 */
	__constr__: function(/** Number */dstport, /** Sonoran.Mote */mote, /** Number */srcport, /** String */data, /** Number */time) {
	    Event.call(this, Sonoran.EV_CAT_MOTE, Sonoran.EV_NAME_MEDIA, time);
	    this.dstport = dstport;
	    this.mote = mote;
	    this.srcport = srcport;
	    this.data = data;
	    //Runtime.blockAccess(this, "src");
	},

	/**
	 * Destination port
	 * @type Number
	 */
	dstport: 0,
	/**
	 * Source mote
	 * @type Sonoran.Mote
	 */
	mote: null,
	/**
	 * Source port
	 * @type Number
	 */
	srcport: 0,
	/**
	 * Payload
	 * @type String
	 */
	data: 0,

	/**
	 * @returns {Number}  source port
	 */
	getSrcPort: function() {
            return this.srcport;
	},

	/**
	 * @returns {Number}  destination port
	 */
	getDstPort: function() {
            return this.dstport;
	},

	/**
	 * @returns {String}  packet data
	 */
	getData: function() {
            return this.data;
	},

	/**
	 * @returns {Sonoran.Mote}  source mote
	 */
	getSrcMote: function() {
	    assert(false, "Use getMote");
            return this.mote;
	},

	/**
	 * @returns {Sonoran.Mote}  source mote
	 */
	getMote: function() {
            return this.mote;
	},

	/**
	 * Return formatted output for a message.
	 * @param date   Optional, point int time when packet was received
	 * @returns {String} formatted message output
	 */
	format: function(/** Date */date) {
            var txt = "";
            if (date) {
		txt += sprintf("%02d:%02d:%03d: ", date.getHours(), date.getMinutes(), date.getMilliseconds());
            }
            txt += sprintf("DSTPORT %-5d  SRCPORT %-5d SRC %s\n", this.dstport, this.srcport, this.mote);
            txt += Formatter.genHexTable(this.data).join("\n");
            return txt+"\n";
	}
    }
);







Event.extend(
    "Sonoran.Event.Generic",
    /**
     * @lends Sonoran.Event.Generic.prototype
     */
    {
	/**
	 * A generic event related to a mote or saguaro connection. Property mote or conn
	 * is always set, otherwise the properties depend on category and evname.
	 * @augments Event
	 * @constructs
	 * @param blob   Object to be imported
	 * @param conn   Optional
	 */
	__constr__: function(/** Object */blob, /** Saguaro.Connection */conn) {
	    assert(blob.category);
	    assert(blob.evname);
	    Event.call(this, blob.category, blob.evname, blob.time);
	    assert(blob.conn===undefined);
	    //Runtime.blockAccess(this, "conn");
	    //this.conn = conn;
	    for (var p in blob) {
		if (p === "msgtype") {
		    continue;
		}
		this[p] = blob[p];
	    }
	    if (blob.time) {
		this.time = blob.time/1000;
	    }
	    if (conn && !this.mote) {
		this.conn = conn;
	    }
	    assert(this.conn ||this.mote);
	},

	/**
	 * @returns {Sonoran.Mote}
	 */
	getMote: function() {
	    //assert(this.mote);
	    return this.mote;
	},

	/**
	 * @returns {Saguaro.Connection}
	 */
	getConn: function() {
	    //assert(this.mote);
	    return this.conn ? this.conn : (this.mote ? this.mote.getConnection() : null);
	}

    }
);









Event.extend(
"Sonoran.Event.Saguaro",
/**
 * @lends Sonoran.Event.Saguaro.prototype
 */
{
    /**
     * Sonoran.Event.Saguaro signals an event from the simulation, i.e.
     * "start" (saguaro is resuming after a halt), "connect", "disconnect"
     * @augments Event
     * @constructs
     * @param evname    "start", "connect", "disconnect"
     * @param conn
     * @param info
     */
    __constr__: function(/** String */evname, /** Saguaro.Connection */conn, /** Saguaro.Info */info) {
	Event.call(this, Sonoran.EV_CAT_SAGUARO, evname);
	assert(arguments.length===3);
	this.conn = conn;
	this.info = info;
    },

    /**
     * @type Saguaro.Connection
     * @private
     */
    conn: null,

    /**
     * @type Saguaro.Info
     * @private
     */
    info: null,

    /**
     * @returns {Saguaro.Info}
     */
    getInfo: function() {
	return this.info;
    }
}
);





/************************************************************************************************************************


 ************************************************************************************************************************/


Event.extend(
    "Sonoran.Event.Gateway",
    /**
     * @lends Sonoran.Event.Gateway.prototype
     */
    {
	/**
	 * Sonoran.Gateway event signals a gateway event, i.e. a new gateway has been connected/disconnected or a new mote
	 * has appeared/disappeared.
	 * @augments Event
	 * @constructs
	 * @param evname
	 * @param gwUUID  uniqueid of gateway
	 * @param wlMote
	 * @param existedBefore
	 */
	__constr__: function(/** String */evname, /** String */gwUUID, /** Sonoran.Mote */wlMote, /** Boolean */existedBefore) {
	    
	    var time = Sonoran.Mote.estimateCurrentTime(wlMote ? wlMote : gwUUID);
	    Event.call(this, Sonoran.EV_CAT_GATEWAY, evname, time);
	    this.gwUUID = gwUUID; 
	    this.wlUUID = wlMote ? wlMote.getUniqueid() : null;
	    this.existedBefore = existedBefore||false;
	},

        /**
         * @type String
         */
        gwUUID: null,

        /**
         * @type String
         */
        wlUUID: null,


	/**
	 * Returns the gateway mote.
	 */
	getMote: function() {
	    return Sonoran.Registry.lookupMoteByUid(this.gwUUID);
	},

        /**
         * Returns unqueid of gateway mote.
         * @returns {String} the unique id of the involved gateway mote
         */
        getGatewayUniqueid: function() {
            return this.gwUUID;
        },

        /**
         * Returns unqueid of wireless mote.
         * @returns {String} the unique id of the involved wireless mote or null
         */
        getWirelessUniqueid: function() {
            return this.wlUUID;
        },


        /**
         * In case of 'hello', returns the flag indicating whether the wireless mote was already known to the gateway before.
         * @returns {Boolean} flag
         */
        getExistedBeforeFlag: function() {
            return this.existedBefore;
        }
    }
);







Event.extend(
    "Sonoran.Event.MoteRegister",
    /**
     * @lends Sonoran.Event.MoteRegister.prototype
     */
    {
	/**
	 * Sonoran.Event.MoteRegister signals a new mote having been registered in 
	 * the mote registry "Sonoran.Registry".
	 * @augments Event
	 * @constructs
	 * @param mote
	 */
	__constr__: function(/** Sonoran.Mote */mote) {
	    var time = Sonoran.Mote.estimateCurrentTime(mote);
	    Event.call(this, Sonoran.EV_CAT_MOTE, Sonoran.EV_NAME_REGISTER, time);
	    this.uniqueid = mote.getUniqueid();
	    this.uid = mote.getUid();
	    this.clazz = mote.getClass();
	    this.type = mote.getType();
	    this.name = mote.getName();
	    this.state = mote.getState();
	    this.subState = mote.getSubState();
	},

      /**
       * The unique id of the mote having been registered
       * @type String
       */
      uniqueid: null,

      /**
       * A unique session id
       * @type Number
       */
      uid: -1,

       /**
       * The mote class.
       * @type String
       */
      clazz: null,

       /**
       * The mote name
       * @type String
       */
      name: null,

       /**
        * The mote type
        * @type String
        */
       type: null,

       /**
        * The mote state
        * @type String
        */
       state: null,

       /**
        * The mote state
        * @type Number
        */
       subState: null,


       /**
       * @returns {String} unique id
       */
      getUniqueid: function() {
         return this.uniqueid;
      },

       /**
       * @returns {Number} unique id for session
       */
      getUid: function() {
         return this.uid;
      },

       /**
       * @returns {String} mote class
       */
      getClass: function() {
         return this.clazz;
      },

       /**
       * @returns {String} mote name
       */
      getName: function() {
         return this.name;
      },

       /**
       * @returns {String} mote class
       */
      getType: function() {
         return this.type;
      },

       /**
       * @returns {String} mote state
       */
      getState: function() {
         return this.state;
      },

      /**
       * Return mote sub state.
       * @returns {Number} mote sub state
       */
      getSubState: function() {
          return this.subState;
      }
   }
);






Event.extend(
    "Sonoran.Event.MoteUniqueid",
    /**
     * @lends Sonoran.Event.MoteUniqueid.prototype
     */
    {
	/**
	 * Sonoran.Event.MoteUniqueid signals the change of a mote unique id.
	 * @augments Event
	 * @constructs
	 * @param mote
	 */
	__constr__: function(/** String */n_eui, /** String */ o_eui) {
	    var mote = Sonoran.Registry.lookupMoteByUniqueid(n_eui);
	    var time = (mote) ? Sonoran.Mote.estimateCurrentTime(mote, "uuid") : Sonoran.Mote.estimateCurrentTime(o_eui, "uuid");
	    Event.call(this, Sonoran.EV_CAT_MOTE, Sonoran.EV_NAME_UNIQUEID, time);
	    this.n_eui = n_eui;
	    this.o_eui = o_eui;
	},
	
	/**
	 * The new unique id
	 * @type String
	 */
	n_eui: null,
	
	/**
	 * The new unique id
	 * @type String
	 */
	o_eui: null
    }
);







Event.extend(
    "Sonoran.Event.Motelet",
    /**
     * @lends Sonoran.Event.Motelet.prototype
     */
    {
	/**
	 * Sonoran.Event.Motelet signals a change in the current motelet state.
	 * @augments Event
	 * @constructs
	 * @param motelet Name of current motelet or null
	 * @param config  Name of current config or null
	 * @param uri     Uri
	 * @param status  Status object for current motelet activation
	 */
	__constr__: function(/** String */motelet, /** String */config, /** String */uri, /** AOP.Result */status) {
	    Event.call(this, Sonoran.EV_CAT_SONORAN, Sonoran.EV_NAME_MOTELET);
	    assert(arguments.length===4);
	    this.motelet = motelet;
	    this.config = config;
	    this.uri = uri;
	    this.status = status;
	},

	/**
	 * Motelet name
	 * @type String
	 */
	motelet: null,
	/**
	 * Config name
	 * @type String
	 */
	config: null,
	/**
	 * Uri
	 * @type String
	 */
	uri: null,
	/**
	 * Motelet status
	 * @type AOP.Result
	 */
	status: null,

       /**
	* @returns {String} Name of running motelet or null
	*/
       getMotelet: function() {
	   return this.motelet;
       },
       
       /**
	* @returns {String} Name of last started config or null
	*/
       getConfig: function() {
	   return this.config;
       },
       
       /**
	* @returns {AOP.Result}
	*/
       getStatus: function() {
	   return this.status;
       }
   }
);






Event.extend(
    "Sonoran.Event.MSETUP",
    /**
     * @lends Sonoran.Event.MSETUP.prototype
     */
    {
	/**
	 * Signals a maintenance and mote-setup event.
	 *  @augments Event
	 * @constructs
	 */
	__constr__: function(/** String */evname, /** Sonoran.Mote */mote, /** Sonoran.AsmEntry */assemblies, /** Sonoran.Mote */gwmote, /** String */message, /** String */error) {
	    assert(evname=='detect' || evname =='perform');
	    var time = undefined;
	    if (mote||gwmote) {
		time = Sonoran.Mote.estimateCurrentTime(mote||gwmote);
	    }
	    Event.call(this, Sonoran.EV_CAT_MSETUP, evname, time);
	    //Runtime.blockAccess(this, "event");
	    this.mote = mote;
	    this.assemblies = assemblies;
	    this.gwmote = gwmote;
	    this.message = message;
	    this.error = error;
	},

        /**
         * The mote in question, might be null.
         * @type Sonoran.Mote
         */
        mote: null,
        /**
           * The assemblies if a mote-setup occured.
         * @type Sonoran.AsmEntry[]
         */
        assemblies: null,
        /**
         * Non-null if error.
         * @type String
         */
        error: null,
        /**
         * Timestamp.
         * @type Number
         */
        time: null
    }
);











Event.extend(
    "Sonoran.Event.Port",
    /**
     * @lends Sonoran.Event.Port
     */
    {
	/**
	 * Signals a port having been registered or deregisterd in Sonora.Registry.
	 * @augments Event
	 * @constructs
	 */
	__constr__: function(/** String */evname, /** Number */port) {
	    assert(evname=='register' || evname =='deregister');
	    Event.call(this, 'port', evname);
	    this.port = port;
	},
        /**
         * @type Number
         */
        port: null
    }
);






