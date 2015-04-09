//  (C) COPYRIGHT INTERNATIONAL BUSINESS MACHINES CORPORATION 2013-2013
//                       ALL RIGHTS RESERVED
//        IBM Research Division, Zurich Research Laboratory
// --------------------------------------------------------------------




/**
 * LRSC provides all functionality related to LRSC and Lora motes.
 * @namespace LRSC 
 */
var LRSC = {
    /**
     * @type String
     * @private
     */
    DEFAULT_NWK_EUI: "00-00-00-00-AA-00-00-01",

    /**
     * @type Number
     * @private
     */
    GATEWAY_RECEIVE_WINDOW_SPAN: 250, // in millis

    /**
     * @type Number
     * @private
     */
    MOTE_JOIN_RECEIVE_WINDOW_OFF: 5000, // in millis
    
    /**
     * @type Number
     * @private
     */
    MOTE_DATA_RECEIVE_WINDOW_OFF: 1000, // in millis

    // /**
    //  * Map of gateway eui to object with name and place.
    //  * @private
    //  */
    // gatewayConfiguration:  {},
    
    // /**
    //  * Map of eui to object.
    //  * @private
    //  */
    // moteConfiguration: {},

    /**
     * Return LRSC mote attribute.
     * @param mote Mote or unique id
     * @returns {LRSC.MoteAttr}
     * @throws {Exception}
     * @private
     */
    getMoteAttribute: function(/** Sonoran.Mote|String */mote) {
	if (typeof(mote) == 'string') {
	    var uniqueid = mote;
	    mote = Sonoran.Registry.lookupMoteByUniqueid(uniqueid);
	    if (!mote) {
		throw new Exception(sprintf("No such mote: '%s'", uniqueid));
	    }
	}    
	var attr = mote.getAttribute('lora');
	if (!attr) {
	    throw new Exception(sprintf("Mote '%s' is not a registered LRSC mote.", mote));
	}
	return attr;
    },


    /**
     * @param mode
     * @returns {Object} with properties b, sf, cr and nocrc
     */
    decodeMode: function (mode) {
	var obj = {};
	switch( mode & SaguaroDEFS.LORA_MODE_BW_MASK ) {
	case SaguaroDEFS.LORA_MODE_BW125: obj.bw=125000; break;
	case SaguaroDEFS.LORA_MODE_BW250: obj.bw=250000; break;
	case SaguaroDEFS.LORA_MODE_BW500: obj.bw=500000; break;
	default: throw "Illegal bandwidth";
	}
	switch( mode & SaguaroDEFS.LORA_MODE_SF_MASK ) {
	case SaguaroDEFS.LORA_MODE_FSK:  obj.sf=0; break;
	case SaguaroDEFS.LORA_MODE_SF7:  obj.sf=7; break;
	case SaguaroDEFS.LORA_MODE_SF8:  obj.sf=8; break;
	case SaguaroDEFS.LORA_MODE_SF9:  obj.sf=9; break;
	case SaguaroDEFS.LORA_MODE_SF10: obj.sf=10; break;
	case SaguaroDEFS.LORA_MODE_SF11: obj.sf=11; break;
	case SaguaroDEFS.LORA_MODE_SF12: obj.sf=12; break;
	default: throw "Illegal spreading factor";
	}
	switch( mode & SaguaroDEFS.LORA_MODE_CR_MASK ) {
	case SaguaroDEFS.LORA_MODE_CR_4_5: obj.cr=1; break;
	case SaguaroDEFS.LORA_MODE_CR_4_6: obj.cr=2; break;
	case SaguaroDEFS.LORA_MODE_CR_4_7: obj.cr=3; break;
	case SaguaroDEFS.LORA_MODE_CR_4_8: obj.cr=4; break;
	}
	obj.nocrc = (mode & SaguaroDEFS.LORA_MODE_NOCRC) != 0 ? 1 : 0;
	return obj;
    },

    /**
     * @param obj 
     * @returns {Number}
     */
    encodeMode: function (obj) {
	var mode = 0;
	if( obj.bw != null ) {
	    switch( obj.bw ) {
	    case 125000: mode |= SaguaroDEFS.LORA_MODE_BW125; break;
	    case 250000: mode |= SaguaroDEFS.LORA_MODE_BW250; break;
	    case 500000: mode |= SaguaroDEFS.LORA_MODE_BW500; break;
	    default: throw "Illegal bandwidth: "+obj.bw;
	    }
	} else {
	    mode |= SaguaroDEFS.LORA_MODE_BW125;
	}
	if( obj.sf != null ) {
	    switch( obj.sf ) {
	    case 0:  mode |=SaguaroDEFS.LORA_MODE_FSK ; break;
	    case 7:  mode |=SaguaroDEFS.LORA_MODE_SF7 ; break;
	    case 8:  mode |=SaguaroDEFS.LORA_MODE_SF8 ; break;
	    case 9:  mode |=SaguaroDEFS.LORA_MODE_SF9 ; break;
	    case 10: mode |=SaguaroDEFS.LORA_MODE_SF10; break;
	    case 11: mode |=SaguaroDEFS.LORA_MODE_SF11; break;
	    case 12: mode |=SaguaroDEFS.LORA_MODE_SF12; break;
	    default: throw "Illegal spreading factor: "+obj.sf;
	    }
	} else {
	    mode |=SaguaroDEFS.LORA_MODE_SF7;
	}
	if( obj.cr != null ) {
	    switch( obj.cr ) {
	    case 1: mode |= SaguaroDEFS.LORA_MODE_CR_4_5; break;
	    case 2: mode |= SaguaroDEFS.LORA_MODE_CR_4_6; break;
	    case 3: mode |= SaguaroDEFS.LORA_MODE_CR_4_7; break;
	    case 4: mode |= SaguaroDEFS.LORA_MODE_CR_4_8; break;
	    default: throw "Illegal coding rate: "+obj.cr;
	    }
	}
	if( obj.nocrc != null && obj.nocrc != 0 ) {
	    mode |= SaguaroDEFS.LORA_MODE_NOCRC;
	}
	return mode;
    },


    /**
     * @type Number
     * @private
     */
    F86810: 868100000,
    /**
     * @type Number
     * @private
     */
    F86830: 868300000,
    /**
     * @type Number
     * @private
     */
    F86850: 868500000,
    /**
     * @type Number
     * @private
     */
    F86885: 868850000,
    /**
     * @type Number
     * @private
     */
    F86905: 869050000,
    /**
     * @type Number
     * @private
     */
    F869525: 869525000,

    /**
     * @param frame
     * @returns {String}
     * @private
     */
    frame2str: function(frame) {
	return Util.Formatter.Table2.obj2table(frame, true, { data: function(v) { return Formatter.binToHex(v); } }).join("\n");
    },


    /**
     * @param {String} bytes
     * @returns {Object} object
     */
    unpackJoinPacket: function(bytes) {
	var hdr = bytes.charCodeAt(0);
	var ftype = (hdr&SaguaroDEFS.LORA_HDR_FTYPE);
	assert(ftype == SaguaroDEFS.LORA_HDR_FTYPE_JREQ||ftype == SaguaroDEFS.LORA_HDR_FTYPE_REJOIN);
	var arr =  Formatter.unpack("1u8EL8EL2uL4d", bytes);
	return {
	    hdr: hdr,
	    arteui:  arr[1],      // application eui
	    deveui: arr[2],      // device eui
	    nonce: arr[3],
	    mic: arr[4]
	};
    },


    /**
     * @type Number
     * @private
     */
    ADN_MODE_REPORTTX: 0x01,

    /**
     * @type Number
     * @private
     */
    ADN_MODE_CONFIRMED: 0x02,

    /**
     * @type Number
     * @private
     */
    ADN_MODE_MORE: 0x04,

    /**
     * @type Number
     * @private
     */
    ADN_MODE_SYNCED: 0x08
};





/**
 * @type Number
 */
LRSC.BEACON_INTERVAL_SECS = 128;

/**
 * @type Number
 */
LRSC.BEACON_INTERVAL_us = 128 * 1000000;

/**
 * @type Number
 */
LRSC.BEACON_GUARD_us      = 3000000;

/**
 * @type Number
 */
LRSC.BEACON_RESERVE_us    = 2120000;

/**
 * @type Number
 */
LRSC.BEACON_SLOT_SPAN_us  =   30000;







/**
 * Datarate
 * @type Number
 */
LRSC.DR_FSK = 7;
/**
 * Datarate
 * @type Number
 */
LRSC.DR_SF7_BW250 = 6;
/**
 * Datarate
 * @type Number
 */
LRSC.DR_SF7 = 5;
/**
 * Datarate
 * @type Number
 */
LRSC.DR_SF8 = 4;
/**
 * Datarate
 * @type Number
 */
LRSC.DR_SF9 = 3;
/**
 * Datarate
 * @type Number
 */
LRSC.DR_SF10 = 2;
/**
 * Datarate
 * @type Number
 */
LRSC.DR_SF11 = 1;
/**
 * Datarate
 * @type Number
 */
LRSC.DR_SF12 = 0;

/**
 * Datarate
 * @type Number
 */
LRSC.DR0 = LRSC.DR_SF12;
/**
 * Datarate
 * @type Number
 */
LRSC.DR1 = LRSC.DR_SF11;
/**
 * Datarate
 * @type Number
 */
LRSC.DR2 = LRSC.DR_SF10;
/**
 * Datarate
 * @type Number
 */
LRSC.DR3 = LRSC.DR_SF9;
/**
 * Datarate
 * @type Number
 */
LRSC.DR4 = LRSC.DR_SF8;
/**
 * Datarate
 * @type Number
 */
LRSC.DR5 = LRSC.DR_SF7;
/**
 * Datarate
 * @type Number
 */
LRSC.DR6 = LRSC.DR_SF7_BW250;
/**
 * Datarate
 * @type Number
 */
LRSC.DR7 = LRSC.DR_FSK;

/**
 * @param sf
 * @param bw
 * @returns {Number}
*/
LRSC.mapSfBw2Datarate = function(/** Number */sf, /** Number */bw) {
    assert(bw == 250000 || bw == 125000);
    if (sf == 0) {
	return LRSC.DR0;
    }
    if (bw == 250000) {
	return LRSC.DR_SF7_BW250;
    }
    switch(sf) {
    case 7:
	return LRSC.DR_SF7;
    case 8:
	return LRSC.DR_SF8;
    case 9:
	return LRSC.DR_SF9;
    case 10:
	return LRSC.DR_SF10;
    case 11:
	return LRSC.DR_SF11;
    case 12:
	return LRSC.DR_SF12;
    default:
	assert(false);
    }
};

/**
* @param dr
* @returns {Object} with sf and bw
*/
LRSC.mapDatarate2SfBw = function(/** Number */dr) {
    switch(dr) {
    case LRSC.DR_FSK: return { sf: 0, bw: 125000 };
    case LRSC.DR_SF7_BW250: return { sf: 7, bw: 250000 };
    case LRSC.DR_SF7: return { sf: 7, bw: 125000 };
    case LRSC.DR_SF8: return { sf: 8, bw: 125000 };
    case LRSC.DR_SF9: return { sf: 9, bw: 125000 };
    case LRSC.DR_SF10: return { sf: 10, bw: 125000 };
    case LRSC.DR_SF11: return { sf: 11, bw: 125000 };
    case LRSC.DR_SF12: return { sf: 12, bw: 125000 };
    default:
	assert(false);
    }
};















Runtime.include("../../common/lrsc/lrsc.js");
Runtime.include("./nwkserver.js");
Runtime.include("./sim.js");
Runtime.include("./mote.js");
Runtime.include("./app.js");
Runtime.include("./cli.js");
Runtime.include("./link.js");
Runtime.include("./mac.js");




CLI.commandFactory.addModule("CLI.LRSC");
