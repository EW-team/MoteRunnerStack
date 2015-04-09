




/** 
 * @name Sonoran.Mote
 * @class
 * @description A Sonoran.Mote instance represents a mote, either a simulated or a physical mote, wired or wireless. 
 * Use Sonoran#createMote to create and retrieve a reference to a mote instance on the server. Use
 * the Sonoran.Registry to query for existing motes.
 * @see Sonoran.createMote, Sonoran.Registry 
 */

if (Runtime.runOnServer()) {
    
    /**
     * @constructor
     * @param uniqueid         String, the unique id
     * @param addr             String, an address string representing its communication interface
     * @param clazz            String, the class of the mote
     * @param name             Name
     * @param type             Type
     */
    Sonoran.Mote = function(/** Sonoran.Connection */conn, /** String */uniqueid, /** String */addr, /** String */clazz, /** String */name, /** String */type) {
	assert(arguments.length===6, "API change");
	//assert(typeof(arguments[3] == 'string'));
	assert(conn instanceof Sonoran.Connection);
	this.conn = conn;
	this.state = Sonoran.Mote.OFF;
	this.addresses = [];
	this.name = name||"Noname";
	this.type = type||"Unknown";
	this.clazz = clazz;
	this.position = { x: 0, y: 0, z: 0 };
	this.uid = Sonoran.Mote.UID_NEXT++;
	this.uniqueid = uniqueid;
	assert(uniqueid&&typeof(uniqueid)=='string'&&uniqueid.length>0);
	assert(this.addresses.length===0);
	this.addresses.push(addr);
	this.attributes = {};
	this.assemblies = new Sonoran.AsmListing(this, 'moma');
	this.noMR = false;

	Runtime.blockAccess(this, "impl", "API change: Use Saguaro.mote2impl(mote)!");
	Runtime.blockAccess(this, "getImpl", "API change: Use Saguaro.mote2impl(mote)!");
	Runtime.blockAccess(this, "gateway", "API change: Use Saguaro.mote2impl(mote)!");
    };


} else {

    /** 
     *  @constructor
     *  @param props An object containing the properties of the new mote.  
     */
    Sonoran.Mote = function(/** Sonoran.MoteInfo */props) {
	this.type = (props.type)?props.type.toLowerCase(): "";
	this.clazz = props.clazz;
	this.uniqueid = props.uniqueid;
	this.uid = props.uid; 
	assert(typeof(this.uid) === 'number');
	this.name = props.name || "Mote 0";
	this.state = props.state; 
	assert(this.state);
	this.subState = props.subState; 
	assert(this.subState!==undefined);
	this.position = props.position || { x: 0, y: 0, z: 0 };
	this.addresses = props.addresses || [];
	this.assemblies = new Sonoran.AsmListing(this, 'moma', props.assemblies);
	this.attributes = {};
	this.noMR = false;
    };

}


/**
 * @static
 * @private
 */
Sonoran.Mote._unmarshal = function(obj) {
    var uid = obj.uid;
    assert(uid!==undefined);
    var mote = Sonoran.Registry.lookupMoteByUid(uid);
    //assert(mote);
    if (!mote) {
   	mote = new Sonoran.Mote(obj);
   	Sonoran.Registry.registerMote(mote);
   }
    return mote;
};


/** Prototype */
Sonoran.Mote.prototype = {
    /**
     * State mote is in. Sonoran.Mote.OFF etc.
     * @type String
     * @private
     */
    state: Sonoran.Mote.OFF,
    /**
     * Sub state, e.g. BREAK.
     * @type Number
     * @private
     */
    subState: 0,
    /**
     * Array of mote addresses, each a string as sag://.....
     * @type String[]
     * @private
     */
    addresses: [],
    /**
     * Mote namev
     * @type String
     * @private
     */
    name: "Noname",
    /**
     * Mote type/dll such as 'iris', 'test'.
     * @type String
     * @private
     */
    type: "Unknown",
    /**
     * Class of mote, i.e. 'saguaro', 'hardware', 'lip'.
     * @type String
     * @private
     */
    clazz: null,
    /**
     * Assemblies installed on this mote.
     * @type Sonoran.AsmListing
     * @private
     */
    assemblies: null,
    /**
     * Position, object with properties x, y and z.
     * @type Object
     * @private
     */
    position: { x: 0, y: 0, z: 0 },
    /**
     * Unique mote identifier
     * @type String
     * @private
     */
    uniqueid: null,
    /**
     * Attributes for this mote.
     * @type Object
     * @private
     */
    attributes: {},
    /**
     * @ignore
     */
    __constr__: "Sonoran.Mote",
    /**
     * True if no Mote Runner on this mote
     * @type Boolean
     * @private
     */
    noMR: false,



    /**
     * @private
     */
    _marshal: function() {
        return { 
	    __constr__: this.__constr__, 
	    uniqueid: this.uniqueid, 
	    uid: this.uid,
 	    clazz: this.clazz,
	    type: this.type,
	    name: this.name,
	    state: this.state,
	    subState: this.subState
	};
    },


    /**
     * Returns mote id valid for this session.
     * @returns {Number}  mote id valid for this session.
     */
    getUid: function() {
	return this.uid;
    },


    /**
     * Returns true if mote runner is known to bee installed on this mote.
     * @returns {Boolean}
     */
    hasMR: function() {
	return !this.noMR;
    },

    /**
     * @returns {Boolean} whether this mote is a simulated mote
     */
    isSimulated: function() {
	return this.getClass() === "saguaro";
    },
    

    /**
     * @returns {String} the unique id of a mote.
     */
    toString: function(full) {
	return this.getUniqueid();
    },

    
    /**
     * Return attributes (key/value pairs) stored in this mote.
     * @returns {Object} the attributes object.
     */
    getAttributes: function() {
        return this.attributes;
    },


    /**
     * Set an attribute.
     * @param name
     * @param value
     * @returns {Object} the previously set attribute.
     */
    setAttribute: function(/** String */name, /** Object */value) {
        var ret = this.attributes[name];
        this.attributes[name] = value;
        return ret;
    },

    /**
     * Get an attribute.
     * @param name
     * @returns {Object} the attribute.
     */
    getAttribute: function(/** String */name) {
        return this.attributes[name];
    },

    /**
     * Delete an attribute.
     * @param name
     * @returns {Object} the attribute.
     */
    delAttribute: function(/** String */name) {
	var attr = this.attributes[name];
	delete this.attributes[name];
        return attr;
    },

    
    /**
     * Return the first address of this mote.
     * @returns {String} first address
     */
    getAddr: function() {
	assert(this.addresses.length>0);
	return this.addresses[0];
    },


    /**
     * Returns the mote class (e.g. 'saguaro', 'lip', 'hw').
     * @returns {String} mote class
     */
    getClass: function() {
	return this.clazz;
    },


    /**
     * Return addresses.
     * @returns {String} addresses
     */
    getAddresses: function() {
        return this.addresses;
    },
    

    /**
     * Return mote state.
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
    },


    /**
     * Returns the unique id of a mote (typically EUI-64 format).
     * @returns {String} the unique id of mote.
     */
    getUniqueid: function() {
	return this.uniqueid;
    },


    /**
     * Returns the name of the mote.
     * @returns {String} the name of the mote.
     */
    getName: function() {
        return this.name;
    },


    /**
     * Returns the type of a mote, e.g. 'iris'.
     * @returns {String} the type of mote, e.g. 'iris'.
     */
    getType: function() {
        return this.type;
    },
    

    /**
     * Returns the cached assembly listing.
     * @returns {Sonoran.AsmListing} the cached assemble listing
     */
    getAssemblies: function() {
        return this.assemblies;
    },


    /**
     * Set mote name (and optionally type). No update event is fired.
     * @param name   Name
     * @param type   Optional
     */
    setName: function(/** String */name, /** String */type) {
        assert(name);
        this.name = name;
        if (type) {
            this.type = type;
        }
    },


    /**
     * Set mote state. No update event is fired.
     * @param state
     */
    setState: function(/** String */state) {
	assert(state===Sonoran.Mote.ON||state===Sonoran.Mote.OFF||state===Sonoran.Mote.RESET||state===Sonoran.Mote.PENDING);
	this.state = state;
    },


    /**
     * Returns whether this mote is in break state
     * @returns {Boolean} whether this mote is in break state
     */
    inBreakState: function() {
	return ((this.subState&Sonoran.Mote.BREAK) !== 0);
    },


    /**
     * returns whether this mote is in specified sub state
     * @param mask
     * @returns {Boolean} whether this mote is in specified sub state
     */
    inSubState: function(/** Number */mask) {
	return ((this.subState&mask) !== 0);
    },

    
    /**
     * Return mote position { x: Number, y: Number, z: Number }.
     * @returns {Object} copy of position attribute
     */
    getPosition: function() {
        return { x: this.position.x, y: this.position.y,  z: this.position.z };
    }
};







/**
 * Mote state. Mote is currently unreachable.
 *  @type String
 *  @constant
 */
Sonoran.Mote.OFF = "off";

/**
 * Mote state. Mote is reachable.
 *  @type String
 *  @constant
 */
Sonoran.Mote.ON = "on";

/**
 * Mote state. Mote is resetting or in reset state.
 *  @type String
 *  @constant
 */
Sonoran.Mote.RESET = "reset";

/**
 * Mote state. Mote is temporarily unavailable and is expected to come back.
 *  @type String
 *  @constant
 */
Sonoran.Mote.PENDING = "pending";

/**
 * Mote sub state. Mote is halted.
 *  @type Number
 *  @constant
 */
Sonoran.Mote.BREAK = 1;















