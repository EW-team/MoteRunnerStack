/**
 * Sonoran.Registry instance implements the registry which keeps track of motes, events and ports.
 *
 * The registry knows about all registered motes and provides various function to search for them
 * based on their unique id, name etc.</br>.  
 * The default communication model with Sonoran motes (gateway motes or wireless motes reachable 
 * via the WLIP gateway) is based on ports. The {@link Sonoran.Socket} socket class for instance 
 * uses these ports for the communication where the local allocation and management is handled 
 * by this registry instance.</br>
 * The Sonoran.Registry overrides the Event.Registry for the handling and forwarding
 * of events. See Event.Registry for registering for event notifications.
 * @class
 * @see Event.Registry
 */
Sonoran.Registry = Event.Registry;


/**
 * The motes known to the registry. A mapping of mote uid to mote.
 * @type Sonoran.Mote[]
 * @private
 */
Sonoran.Registry.motes = [];


/**
 * Returns by default an array with all known motes with mote runner installed.
 * @param noMR   Optional, if true, also returns motes with no mote runner installed
 * @returns {Sonoran.Mote[]} known motes
 * @static
 */
Sonoran.Registry.getMotes = function(/** Boolean */noMR) {
    var motes = [];
    this.motes.forEach(function(mote) {
	    if (noMR) {
		motes.push(mote); //[uid] = mote;
	    } else {
		if (mote.hasMR()) {
		    motes.push(mote); //[uid] = mote;
		}
	    }
    });
    return motes;
};


/**
 * @returns {Number} Number of motes
 */
Sonoran.Registry.getMoteCnt = function() {
    return this.motes.length;

};


/**
 * Iterator.
 * @param func Function receiving each mote
 */
Sonoran.Registry.forEachMote = function(/** FUnction */func) {
    this.motes.forEach(func);
};


/**
 * @returns {Number[]} Array of uids of all motes registered
 */
Sonoran.Registry.getMoteUids = function() {
    return this.motes.map(function(mote) { return mote.getUid(); });
};

/**
 * @returns {Object} Map of mote uid to mote object
 */
Sonoran.Registry.getUid2Motes = function() {
    var obj = {};
    this.motes.forEach(function(mote) { obj[mote.getUid()] = mote; });
    return obj;
};

/**
 * @returns {Object} Map of mote uniqueid's to mote object
 */
Sonoran.Registry.getUniqueid2Motes = function() {
    var obj = {};
    this.motes.forEach(function(mote) { obj[mote.getUniqueid()] = mote; });
    return obj;
};


/**
 * Register a new mote. Mote must not be registered yet. Invokes Sonoran.Mote#onRegister.
 * @param mote              Mote
 * @param silent
 * @throws {Exception} in case of mote having been registered for its address or unique id.
 * @static
 */
Sonoran.Registry.registerMote = function(/** Sonoran.Mote */mote, /** Boolean */silent) {
    assert(mote);
    var uniqueid = mote.getUniqueid();
    assert(uniqueid);
    var uid = mote.getUid();
    assert(uid!==undefined);
    if (this.lookupMoteByUniqueid(uniqueid)) {
	throw new Exception(sprintf("Mote uniqueid '%s' already registered in mote registry", uniqueid));
    }
    if (this.lookupMoteByUid(uid)) {
	throw new Exception(sprintf("Mote uid '%d' already registered in mote registry", uid));
    }
    this.motes[uid] = mote; //.push(mote);
    if (silent!==true) {
	mote.onRegister();
    }
    return mote;
};


/**
 * Deregister motes. Invokes Sonoran.Mote#onDeregister on each deregistered mote.
 * @param selector Function which returns true for each mote to be deregistered.
 * @static
 */
Sonoran.Registry.deregisterAddrs = function(/** Function */selector) {
    var arr = [];
    for (var uid in this.motes) {
	var mote = this.motes[uid];
	if (selector(mote)) {
	    arr.push(mote);
	    delete this.motes[uid];
	} 
    }
    for (var i = 0; i < arr.length; i++) {
	arr[i].onDeregister();
    }
};


/**
 * Remove a mote from registry. Invokes Sonoran.Mote#onDeregister.
 * @param mote
 * @returns {Boolean} true if mote has been removed
 * @static
 */
Sonoran.Registry.deregisterMote = function(/** Sonoran.Mote */mote) {
    var uid = mote.getUid();
    if (this.motes[uid]) {
	delete this.motes[uid];
	mote.onDeregister();
	return true;
    }
    return false;
};


/**
 * Remove all motes from registry. Note that saguaro motes cannot be deregistered
 * by this call. Only if the saguaro connection dies, simulated motes may disappear.
 * @throws {Object} in case mote cannot be removed
 * @static
 */
Sonoran.Registry.deregisterAllMotes = function() {
    while(this.motes.length>0) {
        var mote = this.motes.shift();
        if (mote.getClass() === 'saguaro') {
	    throw new Exception(sprintf("Cannot remove simulated mote '%s' from registry", mote));
        }
        mote.onDeregister();
    }
};


/**
 * Lookup mote by uid.
 * @param uid Number
 * @returns {Sonoran.Mote} mote or null
 * @static
 */
Sonoran.Registry.lookupMoteByUid = function(/** Number */uid) {
    return this.motes[uid];
};


/**
 * Lookup mote by address.
 * @param addr         Address
 * @returns {Sonoran.Mote} mote or null
 * @static
 */
Sonoran.Registry.lookupMoteByAddr = function(/** String */addr) {
    for (var uid in this.motes) {
	var mote = this.motes[uid];
	var addresses = mote.getAddresses();
        for (var j = 0; j < addresses.length; j++) {
	    if (addresses[j] == addr) { 
		return mote;
	    }
        }
    }
    return null;
};


/**
 * Lookup motes by unique ids.
 * @param uniqueids    Array of unique ids
 * @returns {Sonoran.Mote[]} List of matched mote objects. If no match then returns an empty array.
 * @static
 */
Sonoran.Registry.lookupMotesByUniqueids = function(/** String[] */uniqueids) {
    var ret = [];
    for (var uid in this.motes) {
	var mote = this.motes[uid];
	var uniqueid = mote.getUniqueid();
	for (var j = 0; j < uniqueids.length; j++) {
	    if (uniqueids[j] == uniqueid) {
		ret.push(mote);
	    }
	}
    }
    return ret;
};


/**
 * Lookup motes by uid's.
 * @param uniqueids    Array of uid's.
 * @returns {Sonoran.Mote[]} List of matched mote objects. If no match then returns an empty array.
 * @static
 */
Sonoran.Registry.lookupMotesByUids = function(/** Number[] */uids) {
    var ret = [];
    for (var uid in this.motes) {
	var mote = this.motes[uid];
	for (var j = 0; j < uids.length; j++) {
	    if (uids[j] === uid) {
		ret.push(mote);
	    }
	}
    }
    return ret;
};


/**
 * Lookup mote by unique id.
 * @param uniqueid    String
 * @returns {Sonoran.Mote} the mote or null
 * @static
 */
Sonoran.Registry.lookupMoteByUniqueid = function(/** String */uniqueid) {
    for (var uid in this.motes) {
	var mote = this.motes[uid];
	if (uniqueid == mote.getUniqueid()) {
	    return mote;
	}
    }
    return null;
};


/**
 * Lookup mote by unique id.
 * @param uniqueid    String
 * @returns {Sonoran.Mote} the mote or null
 * @static
 */
Sonoran.Registry.moteForUniqueid = function(/** String */uniqueid) {
    for (var uid in this.motes) {
	var mote = this.motes[uid];
	if (uniqueid == mote.getUniqueid()) {
	    return mote;
	}
    }
    return null;
};


/**
 * Lookup mote by name.
 * @param name    String
 * @returns {Sonoran.Mote} first Sonoran.Mote with specified name
 * @static
 */
Sonoran.Registry.lookupMoteByName = function(/** String */name) {
    for (var uid in this.motes) {
	var mote = this.motes[uid];
	if (name == mote.getName()) {
	    return mote;
	}
    }
    return null;
};


/**
 * Return mote where specified function returns true.
 * @param func
 * @returns {Sonoran.Mote} the mote or null
 * @static
 */
Sonoran.Registry.lookupMoteByFunc = function(/** Function */func) {
    for (var uid in this.motes) {
	var mote = this.motes[uid];
	if (func(mote)) {
	    return mote;
	}
    }
    return null;
};


/**
 * Return all motes where function returns true.
 * @param func
 * @returns {Sonoran.Mote[]} the motes
 * @static
 */
Sonoran.Registry.lookupMotesByFunc = function(/** Function */func) {
    var ret = [];
    for (var uid in this.motes) {
	var mote = this.motes[uid];
	if (func(mote)) {
	    ret.push(mote);
	}
    }
    return ret;
};


/**
 * Return array with motes where filter returns true.
 * @param func function
 * @returns {Sonoran.Mote[]} the motes
 * @static
 */
Sonoran.Registry.filterMotes = function(/** function */func) {
    return this.lookupMotesByFunc(func);
};


/**
 * List registry contents.
 * @returns {String} string with registered motes
 * @static
 */
Sonoran.Registry.toString = function(full) {
    var s = "Registry.Motes:";
    this.motes.forEach(function(mote) { s += mote.toString()+","; });
    return s;
};











