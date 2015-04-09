//  (C) COPYRIGHT INTERNATIONAL BUSINESS MACHINES CORPORATION 2006-2010
//                       ALL RIGHTS RESERVED
//        IBM Research Division, Zurich Research Laboratory
// --------------------------------------------------------------------


/**
 * @namespace IEEE802154
 */
IEEE802154 = {
    /**
     * @type Number
     * @constant
     */
    FCF_TYPE:	0x7,

    /**
     * @type Number
     * @constant
     */
    FCF_RFU:    0x04,
    /**
     * @type Number
     * @constant
     */
    FCF_SEC:	0x8,
    /**
     * @type Number
     * @constant
     */
    FCF_PEND:	0x10,
    /**
     * @type Number
     * @constant
     */
    FCF_ACKRQ:	0x20,
    /**
     * @type Number
     * @constant
     */
    FCF_NSPID:	0x40,
    /**
     * @type Number
     * @constant
     */
    FCF_RFU7:	0x80,
    
    /**
     * @type Number
     * @constant
     */
    FCA_DST_MASK:	0xC,
    /**
     * @type Number
     * @constant
     */
    FCA_SRC_MASK:  0xC0,
    /**
     * @type Number
     * @constant
     */
    FCA_DST_NONE:	0x0,
    /**
     * @type Number
     * @constant
     */
    FCA_DST_SADDR: 0x08,
    /**
     * @type Number
     * @constant
     */
    FCA_DST_XADDR: 0x0C,
    /**
     * @type Number
     * @constant
     */
    FCA_SRC_NONE:   0x00,
    /**
     * @type Number
     * @constant
     */
    FCA_SRC_RFU:  0x40,
    /**
     * @type Number
     * @constant
     */
    FCA_SRC_SADDR: 0x80,
    /**
     * @type Number
     * @constant
     */
    FCA_SRC_XADDR: 0xC0,

    /**
     * @type String[]
     * @constant
     */
    FCF_TYPES: { 
	0: 'B', // beacon
	1: 'D', // data
	2: 'A', // ack
	3: 'C'  // command
    },
    /**
     * @type Number
     * @constant
     */
    FCF_BEACON: 0x0,
    /**
     * @type Number
     * @constant
     */
    FCF_DATA:   0x01,
    /**
     * @type Number
     * @constant
     */
    FCF_ACK:    0x02,
    /**
     * @type Number
     * @constant
     */
    FCF_CMD: 0x03,

    /**
     * @type Object
     * @constant
     */
    FCA_ADDRMODE: { 0: '-', 2: 's', 3: 'x' }
};


/**
 * Mac frame.
 * @class
 * @constructor
 * @param data Radio message data
 */
IEEE802154.Frame = function(/** String */data) {
    if (!data) {

	this.fcf = 0;
	this.fca = 0;
	this.seqno = 0;
	this.dst = null;
	this.src = null;
	this.payload = null;

    } else {

	var arr = Formatter.unpack("1u1u1u", data);
	var fcf   = arr[0];
	var fca   = arr[1];
	var seqno = arr[2];

	var nspid   = (fcf & IEEE802154.FCF_NSPID);
	var dstmode = (fca & IEEE802154.FCA_DST_MASK) >> 2;
	var srcmode = (fca & IEEE802154.FCA_SRC_MASK) >> 6;

	var pidx = 3;
	var parseAddress = function(data, mode, rdpid) {
	    var pan, addr, arr;
	    if (rdpid) {
		arr = Formatter.unpack("2uL", data, pidx);
		pan = arr[0];
		pidx += 2;
	    } 
	    var alen = (mode == 2) ? 2 : 8;
	    if (alen === 8) {
		arr = Formatter.unpack("8xL", data, pidx);
	    } else {
		arr = Formatter.unpack("2uL", data, pidx);
	    }
	    pidx += alen;
	    addr = arr[0];
	    return new IEEE802154.Address(pan, addr);
	};
	
	var src, dst;
	if (dstmode) {
	    dst = parseAddress(data, dstmode, 1);
	}
	if (srcmode) {
	    src = parseAddress(data, srcmode, !(nspid && dstmode));
	}
	
	this.fcf = fcf;
	this.fca = fca;
	this.seqno = seqno;
	this.dst = dst;
	this.src = src;
	this.payload = data.substr(pidx);
    }
};


/** @private */
IEEE802154.Frame.prototype = {
    /**
     * @type Number
     */
    fcf: 0,

    /**
     * @type Number
     */
    fca: 0,

    /**
     * @type Number
     */
    seqno: 0,

    /**
     * @type IEEE802154.Address
     */
    dst: null,

    /**
     * @type IEEE802154.Address
     */
    src: null,

    /**
     * @type String
     */
    payload: null,

    /**
     * @returns {Number}
     */
    getFCF: function() {
	return this.fcf;
    },

    /**
     * @returns {Number}
     */
    getFCA: function() {
	return this.fca;
    },

    /**
     * @returns {IEEE802154.Address}
     */
    getSrc: function() {
	return this.src;
    },

    /**
     * @returns {IEEE802154.Address}
     */
    getDst: function() {
	return this.dst;
    },

    /**
     * @returns {Number}
     */
    getSeqno: function() {
	return this.seqno;
    },

    /**
     * @returns {String}
     */
    getPayload: function() {
	return this.payload;
    },

    /**
     * @returns {Number}
     */
    getType: function() {
	return this.fcf & IEEE802154.FCF_TYPE;
    },

    /**
     * @returns {String}
     */
    getTypeAsStr: function() {
	return IEEE802154.FCF_TYPES[this.fcf & IEEE802154.FCF_TYPE];
    },

    /**
     * @returns {String}
     */
    getFlagsAsStr: function() {
	var fcf = this.fcf;
	var flags = ((fcf & IEEE802154.FCF_SEC)    ? 'S' : '-') + 
    	    ((fcf & IEEE802154.FCF_PEND)   ? 'P' : '-') + 
    	    ((fcf & IEEE802154.FCF_ACKRQ)  ? 'A' : '-') +
    	    ((fcf & IEEE802154.FCF_NSPID)  ? 'C' : '-');
	return flags;

    },


    /**
     * @returns {String} binary data
     */
    gen: function() {
	var pdu = Formatter.pack("1u1u1u", this.fcf, this.fca, this.seqno);
	if ((this.fca&IEEE802154.FCA_DST_XADDR) !== 0) {
	    if (!this.dst.isXAddr()) {
		throw "Missing extended address for destination address";
	    }
	    pdu += Formatter.pack("2u8xL", this.dst.getPan(), this.dst.getAddr());
	} else if ((this.fca&IEEE802154.FCA_DST_SADDR) !== 0) {
	    if (this.dst.isXAddr()) {
		throw "Missing short address for destination address";
	    }
	    pdu += Formatter.pack("2u2u", this.dst.getPan(), this.dst.getAddr());
	}
	if ((this.fcf&IEEE802154.FCF_NSPID) === 0) {
	    pdu += Formatter.pack("2u", this.src.getPan());
	}
	if ((this.fca&IEEE802154.FCA_SRC_XADDR) !== 0) {
	    if (!this.src.isXAddr()) {
		throw "Missing extended address for source address";
	    }
	    pdu += Formatter.pack("8xL", this.src.getAddr());
	} else if ((this.fca&IEEE802154.FCA_SRC_SADDR) !== 0) {
	    if (this.src.isXAddr()) {
		throw "Missing short address for source address";
	    }
	    pdu += Formatter.pack("2u", this.src.getAddr());
	}
	if (this.payload) {
	    pdu += this.payload;
	}
	return pdu;
    },


    /**
     * @returns {String}
     */
    toString: function() {
	var txt = "IEEE802154: " + this.getTypeAsStr() + ":" + this.getFlagsAsStr() + ":";
	if (this.src) {
	    txt += this.src.toString();
	} else {
	    txt += "-/-";
	}
	txt += ":";
	if (this.dst) {
	    txt += this.dst.toString();
	} else {
	    txt += "-/-";
	}
	txt += ":" + this.seqno;
	txt += ":" + Formatter.binToHex(this.payload);
	return txt;
    }
};


/**
 * Address
 * @class
 * @constructor
 */
IEEE802154.Address = function(/** Number */pan, /** Number|String */addr) {
    this.pan = pan;
    this.addr = addr;
};
IEEE802154.Address.prototype = {
    /**
     * @type Number
     */
    pan: null,

    /**
     * @type Number|String
     */
    addr: null,

    /**
     * @returns {Boolean}
     */
    isXAddr: function() {
	return typeof(this.addr)==="string";
    },

    /**
     * @returns {Number}
     */
    getPan: function() {
	return this.pan;
    },

    /**
     * @returns {Number|String} 16-bit short address or 8-byte string extended address
     */
    getAddr: function() {
	return this.addr;
    },

    /**
     * @returns {String}
     */
    toString: function() {
	var txt = ((this.pan) ? Formatter.numToHex(this.pan, 4) : "-") + "/";
	if (typeof(this.addr) === 'string') {
	    txt += this.addr.toString();
	} else {
	    txt += Formatter.numToHex(this.addr, 4);
	}
	return txt;
    }
};






/**
 * Create an IEEE802154 instance.
 * @param fcf  
 * @param fca 
 * @param seqno
 * @param srcaddr  If null, IEEE802154.FCA_SRC_NONE is set in fca
 * @param dstaddr  If null, IEEE802154.FCA_DST_NONE is set in fca
 * @param payload
 */
IEEE802154.create1 = function(/** Number */fcf, /** Number */fca, /** Number */seqno, /** IEEE802154.Address */srcaddr, /** IEEE802154.Address */dstaddr, /** String */payload) {
    if (!srcaddr) {
	if (((fca&IEEE802154.FCA_SRC_SADDR) !== 0) || ((fca&IEEE802154.FCA_SRC_XADDR) !== 0)) {
	    throw "Source address not specified, but IEEE802154.FCA_SRC_SADDR/IEEE802154.FCA_SRC_XADDR set in FCA"; 
	}
    } else {
	if (((fca&IEEE802154.FCA_SRC_SADDR) === 0) || ((fca&IEEE802154.FCA_SRC_XADDR) === 0)) {
	    throw "Source address specified, but neither IEEE802154.FCA_SRC_SADDR or IEEE802154.FCA_SRC_XADDR set in FCA"; 
	}
    }
    if (!dstaddr) {
	if (((fca&IEEE802154.FCA_DST_SADDR) !== 0) || ((fca&IEEE802154.FCA_DST_XADDR) !== 0)) {
	    throw "Source address not specified, but IEEE802154.FCA_DST_SADDR/IEEE802154.FCA_DST_XADDR set in FCA"; 
	}
    } else {
	if (((fca&IEEE802154.FCA_DST_SADDR) === 0) || ((fca&IEEE802154.FCA_DST_XADDR) === 0)) {
	    throw "Source address specified, but neither IEEE802154.FCA_DST_SADDR or IEEE802154.FCA_DST_XADDR set in FCA"; 
	}
    }
    var frame = new IEEE802154.Frame();
    frame.fcf = fcf;
    frame.fca = fca;
    frame.seqno = seqno;
    frame.src = srcaddr;
    frame.dst = dstaddr;
    frame.payload = payload;
    return frame;
}; 
