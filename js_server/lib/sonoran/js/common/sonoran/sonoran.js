//  (C) COPYRIGHT INTERNATIONAL BUSINESS MACHINES CORPORATION 2006-2010
//                       ALL RIGHTS RESERVED
//        IBM Research Division, Zurich Research Laboratory
// --------------------------------------------------------------------


/**
 * Namespace Sonoran implementes the Sonoran API. 
 * Sonoran provides the following base namespaces and classes:
 * <ul>
 * <li>{@link Sonoran.Mote}: represents a mote, use {@link Sonoran.createMote} for example to create a simulated mote.</li>
 * <li>{@link Sonoran.Socket}: socket class to communicate with a mote.</li>
 * <li>{@link Sonoran.Assembly},{@link Sonoran.AsmName},{@link Sonoran.AsmEntry},{@link Sonoran.AsmListing}: provide access to assemblies, assembly naming, assembly listing on motes.</li>
 * <li>{@link Sonoran.MOMA}: mote manager implementation to list, load and delete applications on a mote.</li>
 * <li>{@link Sonoran.Registry}: manages and distributes all events popping up in Sonoran.</li>
 * <li>{@link Sonoran.Event} and subclasses: the events distributed by the registry to registered listeners.</li>
 * <li>{@link Sonoran.Gateway}, {@link Sonoran.WLIP.Gateway}: implement gateway functionality to communicate with wireless motes using MOMA.</li>
 * <li>{@link Sonoran.Resource}: wraps access to resources stored in the filsystem such as {@link Sonoran.Resource.Assembly}.</li>
 * <li>{@link Sonoran.LIP}: implements Sonoran.LIP.MoteImpl which represents a physically connected mote.</li>
 * <li>{@link Sonoran.HW}: implements Sonoran.HW.MoteImpl} which represents a physical, wireless mote connected via a gateway.</li>
 * </ul>
 * Use {@link Saguaro.startProcess} to create a saguaro simulation process.
 * Use {@link Sonoran.createMote} to create a mote, i.e. a simulated mote.
 * Use {@link Sonoran.createSocket} to create a socket to communicate with motes.
 * @namespace Sonoran 
 */
var Sonoran = {};






//-----------------------------------------------------------------------------------------------------------------------------------------------
//
// Sonoran.LIPEnumeration
//
//-----------------------------------------------------------------------------------------------------------------------------------------------


/**
 * Enumares the serial and USB motes attached to the Sonran server.
 * @class
 * @constructor
 * @param serial
 * @param hid
 */
Sonoran.LIPEnumeration = function(/** String[] */serial, /** String[] */hid) {
   this.serial = serial;
   this.hid = hid;
};

/** @private */
Sonoran.LIPEnumeration.prototype = {
   /** @ignore */
   __constr__: "Sonoran.LIPEnumeration",

    /**
     * Return array of serial ports.
     * @returns {String[]}
     * @private
     */
    getSerial: function() {
        return this.serial;
    },

    /**
     * Return array of USB hid ports.
     * @returns {String[]}
     * @private
     */
    getHid: function() {
        return this.hid;
    },

    /**
    * @returns {String} a string
     * @private
    */
   toString: function() {
      return "Serial-Devices: " + this.serial.join(",") + 
	   "\nHID-Devices:    " + this.hid.join(", ");
   }
};





//-----------------------------------------------------------------------------------------------------------------------------------------------
//
// Sonoran.MoteInfo
//
//-----------------------------------------------------------------------------------------------------------------------------------------------


/**
 * Sonoran.MoteInfo.
 * @class
 * @constructor
 * @param mote    Sonoran.Mote
 */
Sonoran.MoteInfo = function(/** Sonoran.Mote */mote) {
    /**
     * Type of mote
     * @type String
     */
    this.type = mote.getType();
    /**
     * Name of mote
     * @type String
     */
    this.name = mote.getName();
    /**
     * Unique id of mote
     * @type String
     */
    this.uniqueid = mote.getUniqueid();
    /**
     * Unique id of mote
     * @type Number
     */
    this.uid = mote.getUid();
    /**
     * State mote is in
     * @type String
     */
    this.state = mote.getState();
    /**
     * State mote is in
     * @type Number
     */
    this.subState = mote.getSubState();
    /**
     * Class of mote ('lip', 'saguaro')
     * @type String
     */
    this.clazz = mote.getClass();
    /**
     * Addresses of mote
     * @type String[]
     */
    this.addresses = mote.getAddresses();
    /**
     * Position of mote
     * @type Object
     */
    this.position = mote.getPosition();
    /**
     * Device infos.
     * @type Array
     */
    this.devices = (mote.getClass()==='saguaro') ? Saguaro.mote2impl(mote).getDeviceInfos() : {};
};

/** */
Sonoran.MoteInfo.prototype = {
   /** @ignore */
   __constr__: "Sonoran.MoteInfo",
   /**
    * @returns {String} the unique id of the mote
    */
   toString: function() {
      return this.uniqueid;
   }
};










//-----------------------------------------------------------------------------------------------------------------------------------------------
//
// Sonoran.MoteInfo
//
//-----------------------------------------------------------------------------------------------------------------------------------------------


/**
 * Sonoran.MoteInfo.
 * @class
 * @constructor
 * @param mote    Sonoran.Mote
 */
Sonoran.MoteInfo = function(/** Sonoran.Mote */mote) {
    /**
     * Type of mote
     * @type String
     */
    this.type = mote.getType();
    /**
     * Name of mote
     * @type String
     */
    this.name = mote.getName();
    /**
     * Unique id of mote
     * @type String
     */
    this.uniqueid = mote.getUniqueid();
    /**
     * Unique id of mote
     * @type Number
     */
    this.uid = mote.getUid();
    /**
     * State mote is in
     * @type String
     */
    this.state = mote.getState();
    /**
     * State mote is in
     * @type Number
     */
    this.subState = mote.getSubState();
    /**
     * Class of mote ('lip', 'saguaro')
     * @type String
     */
    this.clazz = mote.getClass();
    /**
     * Addresses of mote
     * @type String[]
     */
    this.addresses = mote.getAddresses();
    /**
     * Position of mote
     * @type Object
     */
    this.position = mote.getPosition();
    /**
     * Device infos.
     * @type Array
     */
    this.devices = (mote.getClass()==='saguaro') ? Saguaro.mote2impl(mote).getDeviceInfos() : {};
    /**
     * Assembly entries.
     * @type Sonoran.AsmEntry[]
     */
    this.assemblies = (mote.getClass()==='saguaro') ? Saguaro.mote2impl(mote).getAssemblies().getEntries() : mote.getAssemblies().getEntries();
};

/** */
Sonoran.MoteInfo.prototype = {
   /** @ignore */
   __constr__: "Sonoran.MoteInfo",
   /**
    * @returns {String} the unique id of the mote
    */
   toString: function() {
      return this.uniqueid;
   }
};




/**
 * Implements the Sonoran web server
 * @namespace Oasis 
 */
var Oasis = {};



Class.define(
    "Oasis.Info",
    /**
     * @lends Oasis.Info.prototype
     */
    {
	/**
	 * The initial state a web client receives from the Oasis web server.
	 * @constructs
	 * @param moteTypes
	 * @param moteList
	 * @param saguaroInfo
	 * @private
	 */
	__constr__: function(/** String[] */moteTypes, /** Sonoran.MoteInfo */moteList, /** Saguaro.Info */saguaroInfo) {
	    this.moteTypes = moteTypes;
	    this.moteList = moteList;
	    this.saguaroInfo = saguaroInfo;
	},
	
	/**
	 * @type String[]
	 * @private
	 */
	moteTypes: null,

	/**
	 * @type Sonoran.MoteInfo[]
	 * @private
	 */
	moteList: null,

	/**
	 * @type Saguaro.Info
	 * @private
	 */
	saguaroInfo: null
    }
);
