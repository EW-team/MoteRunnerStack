/*
 * mac:
 * sudo ifconfig tun0 inet6 fc00:db8:5::ff/8
 *  nc6 -u fc00:db8:5::0200:0000:00AE:2F01 100
 *
 * linux:
 * sudo ifconfig tun0 add fc00:db8:5::ff/8
 * -> ping fc00:db8:5::ff
 * -> ping fc00:db8:5::1
 *  nc6 -u -p 10000 fc00:db8:5::0200:0000:00AE:2F01 100
 *  nc6 -u fc00:db8:5::0200:0000:00AE:2F01 100
 */


/**
 * @class
 * @static
 */
IPv6 = {
    /**
     * @type Boolean
     * @private
     */
    LOG_TRAFFIC: false,

    /**
     * @type Number
     * @private
     */
    NH_HOP_BY_HOP: 0,
    /**
     * @type Number
     * @private
     */
    NH_TCP: 6,
    /**
     * @type Number
     * @private
     */
    NH_UDP: 17,
    /**
     * @type Number
     * @private
     */
    NH_ICMP: 58,

    /**
     * @type Number
     * @private
     */
    ICMP_MLRM_TYPE: 143,  // Version 2 Multicast Listener Report Message
    /**
     * @type Number
     * @private
     */
    ICMP_ECHOREQUEST_TYPE: 128,
    /**
     * @type Number
     * @private
     */
    ICMP_ECHORESPONSE_TYPE: 129,
    /**
     * @type Number
     * @private
     */
    ICMP_UNREACHABLE_TYPE: 1,

     /**
      * @type Number
      */     
     ICMP_NET_UNREACHABLE: 0,
     /**
      * @type Number
      */     
     ICMP_HOST_UNREACHABLE: 1,
     /**
      * @type Number
      */     
     ICMP_PROTOCOL_UNREACHABLE: 2,
     /**
      * @type Number
      */     
     ICMP_PORT_UNREACHABLE: 3,
     /**
      * @type Number
      */     
     ICMP_FRAGMENTATION_NEEDED: 4,
     /**
      * @type Number
      */     
     ICMP_SOURCE_ROUTE_FAILED: 5,

    /**
     * @param s
     * @returns {IPv6.Packet}
     */
    parse: function(/** String */s) {
	assert(s.length>40);
	var arr = Formatter.unpack("1u1u2u2u1u1u16dB16dB", s);
	//println("IPv6 PACKET:\n" + arr.join(','));
	var b1 = arr[0]; 	 
	var b2 = arr[1];
	var vers = (b1>>4)&0xf;
	var trafficClass = (b1&0xf) | ((b2&0xf)<<4);
	var flowLabel = (b2&0xf) | (arr[2]<<4);
	var payloadLength = arr[3];
	var nextHeader = arr[4];
	var hopLimit = arr[5];
	var srcaddr = arr[6];
	var dstaddr = arr[7];
	var headers = [];
	var p = new IPv6.IPPacket(srcaddr, dstaddr, vers, trafficClass, flowLabel, payloadLength, nextHeader, hopLimit, headers);
	//p.bytes = s.substr(0, 40);
	//println("IPv6 PACKET:\n" + p.toString());
	s = s.substr(40);
	assert(s.length===payloadLength);

	var nextHeader = p.nextHeader;
	while(s.length>0) {
	    switch(nextHeader) {
	    case IPv6.NH_HOP_BY_HOP: {
		var arr = Formatter.unpack("1u1u*d", s);
		var hbhp  = new IPv6.IPHopByHopOptions();
		headers.push(hbhp);
		hbhp.nextHeader = arr[0];
		hbhp.hdrExtLen = arr[1];
		var len = 8 + hbhp.hdrExtLen;		 
		hbhp.bytes = s.substr(0, len);
		s = s.substr(len);
		nextHeader = hbhp.nextHeader;
		break;
	    }
	    case IPv6.NH_UDP: {
		var arr = Formatter.unpack("2u2u2u2u", s);
		var srcport = arr[0];
		var dstport = arr[1];
		var length = arr[2];
		assert(length>=8);
		var cksum = arr[3];
		var data = s.substr(8);
		var udp = new IPv6.UDPPacket(dstport, srcport, data, length, cksum);
		headers.push(udp);
		s = s.substr(length);
		break;
	    }
	    case IPv6.NH_ICMP: {
		var arr = this.parseICMP(s);
		if (arr) {
		    
		}
		s = arr[1];
		headers.push(arr[0]);
		break;
	    }
	    default:
		println(sprintf("Drop IP packet with unknwon next-header field: %s\n", nextHeader));
		println(p.toString());
		println(Formatter.genHexTable(s).join("\n"));
		return null;
	    }
	}


	return p;
    },



    /**
     * @param s
     * @returns {String}
     * @private
     */
    parseICMP: function(/** String */s) {
	var type = s.charCodeAt(0);
	switch(type) {
	case IPv6.ICMP_MLRM_TYPE: {
	    var arr = Formatter.unpack("1u1u2u2u2u*d", s);
	    //println("ICMP: " + arr.join(","));
	    var type = arr[0];
	    var reserved = arr[1];
	    var cksum = arr[2];
	    var reserved = arr[3];
	    var nrAddresses = arr[4];
	    //println("ICMP: nrAddresses " + nrAddresses);
	    var multicastAddressRecords = [];
	    s = arr[5];

	    for (var j = 0; j < nrAddresses; j++) {
		var arr = Formatter.unpack("1u1u2u16dB*d", s);
		//println("ICMP: address record " + arr.join(","));
		var recordType = arr[0];
		var auxDataLen = arr[1];
		var numberOfSources = arr[2];
		var multicastAddress = arr[3];
		//println("AR: "+ multicastAddress);
		var sourceAddresses = [];
		s = arr[4];
		for (var i = 0; i < numberOfSources; i++) {
		    var _arr = Formatter.unpack("16dB*d", s);
		    sourceAddresses.push(_arr[0]);
		    s = _arr[1];
		}
		var auxiliaryData = s.substr(0, auxDataLen);
		s = s.substr(auxDataLen);
		var p = new IPv6.IcmpMulticastAddressRecord(recordType, multicastAddress, sourceAddresses, auxiliaryData);
		//println("AR: "+ p.multicastAddress);
		multicastAddressRecords.push(p);
	    }
	    var p = new IPv6.IcmpMulticastListenerReportMessage();
	    p.type = type;
	    p.cksum = cksum;
	    p.multicastAddressRecords = multicastAddressRecords;
	    //println(p);
	    return [ p, s ];
	}
	case IPv6.ICMP_ECHOREQUEST_TYPE: {
	    var arr = Formatter.unpack("1u1u2u2u2u", s);
	    var code = arr[1];
	    var cksum = arr[2];
	    var identifier = arr[3];
	    var seqno = arr[4];
	    var data = s.substr(8);
	    var p = new IPv6.ICMPEchoPacket(type, code, cksum, identifier, seqno, data);
	    s = "";
	    return [ p,s ];
	}
	default:
	    var arr = Formatter.unpack("1u1u2u*d", s);
	    var code = arr[1];
	    var cksum = arr[2];
	    var data = arr[3];
	     var p = new IPv6.IcmpUnknownMessage(type, code, cksum, data);
	    QUACK(0, "ICMP: ignore unsupported ICMP message: " + p);
	    return [ p, "" ];
	}
	return null;
    },


     /**
      * @param buf
      * @param sum
      * @returns {Number}
      * @private
      */
     checksum: function(/** String */buf, /** Number */sum) {
	 var nbytes = buf.length;
	 var i;

	for (i = 0; i < (nbytes & ~1); i += 2) {
	    sum += Formatter.unpack("2u", buf, i)[0]; 
	    if (sum > 0xFFFF) {
		sum -= 0xFFFF;
	    }
	}

	 // checksum last byte
	if (i < nbytes) {
	    sum += (buf.charCodeAt(i) << 8);
	    if (sum > 0xFFFF) {
		sum -= 0xFFFF;
	    }
	}
	 return sum;
     },

     /**
      * @param sum
      * @returns {String}
      * @private
      */
     wrapsum: function(/** Number */sum) {
	sum = ~sum & 0xFFFF;
	return Formatter.pack("2u", sum);
     }
};






Class.define(
    "IPv6.ICMPEchoPacket",
    /**
     * @lends IPv6.ICMPEchoPacket.prototype
     */
    {
	/**
	 * @constructs
	 * @param type
	 * @param code
	 * @param cksum
	 * @param identifier
	 * @param seqno
	 * @param data
	 */
	__constr__: function(/** Number */type, /** Number */code, /** Number */cksum, /** Number */identifier, /** Number */seqno, /** String */data) {
	    this.nextHeader = IPv6.NH_ICMP;
	    this.type = type;
	    assert((type === IPv6.ICMP_ECHORESPONSE_TYPE) || (type === IPv6.ICMP_ECHOREQUEST_TYPE));
	    this.code = code;
	    this.cksum = cksum;
	    this.identifier = identifier;
	    this.seqno = seqno;
	    this.data = data;
	},
	/**
	 * @type Number
	 */
	nextHeader: 0,
	/**
	 * @type Number
	 */
	type: 0,
	/**
	 * @type Number
	 */
	code: 0,
	/**
	 * @type Number
	 */
	cksum: 0,
	/**
	 * @type Number
	 */
	identifier: 0,
	/**
	 * @type Number
	 */
	seqno: 0,
	/**
	 * @type String
	 */
	data: null,

	/**
	 * @param ip
	 * @returns {String}
	 * @private
	 */
	generate: function(/** IPv6.IPPacket */ip) {
	    var len = 8 + this.data.length;
	    var bytes1 = Formatter.pack("16dB16dB2u2u2u1u1u", ip.srcaddr, ip.dstaddr, 0, len, 0, 0, this.nextHeader);
	    var bytes2 = Formatter.pack("1u1u2u2u2u", this.type, this.code, 0, this.identifier, this.seqno) + this.data;
	    var s = bytes1 + bytes2;
	    var cksum = IPv6.wrapsum(IPv6.checksum(s, 0));
	    s = bytes2.substr(0, 2) + cksum + bytes2.substr(4);
	    return s;
	},
	
	/**
	 * @returns {String}
	 */
	toString: function() {
	    var t = new Util.Formatter.Table2(5);
	    t.setTitle("ICMP-Type", "Code", "Cksum", "Identifier", "Seqno");
	    t.setValue(0, 0, this.type);
	    t.setValue(1, 0, this.code);
	    t.setValue(2, 0, this.cksum.toString(16));
	    t.setValue(3, 0, this.identifier);
	    t.setValue(4, 0, this.seqno);
	    var txt = t.render().join("\n") + "\n" + Formatter.binToHex(this.data);
	    return txt;
	}
    }
);    



Class.define(
    "IPv6.ICMPUnreachablePacket",
    /**
     * @lends IPv6.ICMPUnreachablePacket.prototype
     */
    {
	/**
	 * @constructs
	 * @param code
	 * @param cksum
	 * @param data
	 */
	__constr__: function(/** Number */code, /** Number */cksum, /** String */data) {
	    this.nextHeader = IPv6.NH_ICMP;
	    this.type = IPv6.ICMP_UNREACHABLE_TYPE;
	    this.code = code;
	    this.cksum = cksum;
	    this.data = data;
	},
	/**
	 * @type Number
	 */
	nextHeader: 0,
	/**
	 * @type Number
	 */
	type: 0,
	/**
	 * @type Number
	 */
	code: 0,
	/**
	 * @type Number
	 */
	cksum: 0,
	/**
	 * @type String
	 */
	data: null,
	/**
	 * @param ip  IP Packet
	 * @returns {String}
	 * @private
	 */
	generate: function(/** IPv6.IPPacket */ip) {
	    var bytes2 = Formatter.pack("1u1u2u4u", this.type, this.code, 0, 0) + this.data;
	    
	    var bytes1 = Formatter.pack("16dB16dB2u2u2u1u1u", ip.srcaddr, ip.dstaddr, 0, bytes2.length, 0, 0, this.nextHeader);

	    var s = bytes1 + bytes2;
	    var cksum = IPv6.wrapsum(IPv6.checksum(s, 0));
	    s = bytes2.substr(0, 2) + cksum + bytes2.substr(4);
	    return s;
	},
	
	/**
	 * @returns {String}
	 */
	toString: function() {
	    var t = new Util.Formatter.Table2(3);
	    t.setTitle("ICMP-Type", "Code", "Cksum");
	    t.setValue(0, 0, this.type);
	    t.setValue(1, 0, this.code);
	    t.setValue(2, 0, this.cksum.toString(16));
	    var txt = t.render().join("\n") + "\n" + Formatter.binToHex(this.data);
	    return txt;
	}
    }
);    


Class.define(
    "IPv6.IcmpMulticastAddressRecord",
    /**
     * @lends IPv6.IcmpMulticastAddressRecord.prototype
     */
    {
	/**
	 * @constructs
	 */
	__constr__: function(/** Number */recordType, /** String */multicastAddress, /** String[] */sourceAddresses, /** String */auxiliaryData) {
	    this.recordType = recordType;
	    this.multicastAddress = multicastAddress;
	    this.sourceAddresses = sourceAddresses;
	    this.auxiliaryData = auxiliaryData;
	},

	/**
	 * @type Number
	 */
	recordType: 0,
	/**
	 * @type String
	 */
	multicastAddress: null,
	/**
	 * @type String[]
	 */
	sourceAddresses: null,
	/**
	 * @type String
	 */
	auxiliaryData: null,
	/**
	 * @returns {String}
	 */
	toString: function() {
	    var t = new Util.Formatter.Table2(4);
	    t.setTitle("RT", "MulticastAddress", "SourceAddresses", "AuxiliaryData");
	    t.setValue(0, 0, this.recordType);
	    t.setValue(1, 0, Formatter.binToHex(this.multicastAddress));
	    
	    t.setValue(2, 0, this.sourceAddresses.map(function(addr) { return Formatter.binToHex(addr); }).join(","));
	    t.setValue(3, 0, this.auxiliaryData ? Formatter.binToHex(this.auxiliaryData) : "");
	    var txt = t.render().join("\n");
	    return txt;
	}
    }
);


Class.define(
    "IPv6.IcmpMulticastListenerReportMessage",
    /**
     * @lends IPv6.IcmpMulticastListenerReportMessage.prototype
     */
    {
	/**
	 * @constructs
	 */
	__constr__: function() {
	    this.nextHeader = IPv6.NH_ICMP;
	    this.type = 0;
	    this.cksum = 0;
	    this.multicastAddressRecords = null;
	},
	/**
	 * @type Number
	 */
	nextHeader: 0,
	/**
	 * @type Number
	 */
	type: 0,
	/**
	 * @type Number
	 */
	cksum: 0,
	/**
	 * @type IPv6.IcmpMulticastAddressRecord[]
	 */
	multicastAddressRecords: null,
	
	/**
	 * @param ip
	 * @returns {String}
	 */
	generate: function(/** IPv6.IPPacket */ip) {
	  assert(0);
	},

	/**
	 * @returns {String}
	 */
	toString: function() {
	    var txt = "IPv6.IcmpMulticastListenerReportMessage:\n";
	    txt += this.multicastAddressRecords.join("\n");
	    return txt;
	}
    }
);    






Class.define(
    "IPv6.IcmpUnknownMessage",
    /**
     * @lends IPv6.IcmpUnknownMessage.prototype
     */
    {
	/**
	 * @constructs
	 */
	__constr__: function(/** Number */type, /** Number */code, /** Number */cksum, /** String */data) {
	    this.nextHeader = IPv6.NH_ICMP;
	    this.type = type;
	    this.code = code;
	    this.cksum = cksum;
	    this.data = data;
	},
	/**
	 * @type Number
	 */
	nextHeader: 0,
	/**
	 * @type Number
	 */
	type: 0,
	/**
	 * @type Number
	 */
	cksum: 0,
	/**
	 * @type Number
	 */
	code: 0,
	/**
	 * @type String
	 */
	data: 0,
	
	/**
	 * @param ip
	 * @returns {String}
	 */
	generate: function(/** IPv6.IPPacket */ip) {
	  assert(0);
	},

	/**
	 * @returns {String}
	 */
	toString: function() {
	    var txt = sprintf("IPv6.IcmpUnknownMessage: %d, %d, %H", this.type, this.code, this.data);
	    return txt;
	}
    }
);    








Class.define(
    "IPv6.IPHopByHopOptions",
    /**
     * @lends IPv6.IPHopByHopOptions.prototype
     */
    {
	/**
	 * @constructs
	 */
	__constr__: function() {
	    this.nextHeader = 0;
	    this.hdrExtLen = 0;
	    this.bytes = null;
	},
	/**
	 * @type Number 
	 */
	nextHeader: 0,
	/**
	 * @type Number 
	 */
	hdrExtLen: 0,
	/**
	 * @type String
	 */
	bytes: null,

	/**
	 * @returns {String}
	 */
	getBytes: function() {
	    return this.bytes;
	},

	/**
	 * @param ip
	 * @returns {String}
	 */
	generate: function(/** IPv6.IPPacket */ip) {
	  assert(0);
	},

	/**
	 * @returns {String}
	 */
	toString: function() {
	    var t = new Util.Formatter.Table2(3);
	    t.setTitle("Hop-by-Hop NH", "HdrExtLen", "Bytes");
	    t.setValue(0, 0, this.nextHeader);
	    t.setValue(1, 0, this.hdrExtLen);
	    t.setValue(2, 0, Formatter.binToHex(this.bytes));
	    var txt = t.render().join("\n");
	    return txt;
	}
    }
);    



Class.define(
    "IPv6.IPPacket",
    /**
     * @lends IPv6.IPPacket.prototype
     */
    {
	/**
	 * @constructs
	 * @param srcaddr
	 * @param dstaddr
	 * @param headers
	 */
	__constr__: function(/** String */srcaddr, /** String */dstaddr, /** Number */version, /** Number */trafficClass, /** Number */flowLabel, /** Number */payloadLength, /** Number */nextHeader, /** Number */hopLimit, /** Object[] */headers) {
	    assert(arguments.length===9);
	    this.dstaddr = dstaddr;
	    assert(typeof(this.dstaddr) === 'string');
	    this.srcaddr = srcaddr;
	    assert(typeof(this.srcaddr) === 'string');
	    this.headers = headers;
	    //assert(this.headers);
	    
	    this.vers = version||6;
	    this.trafficClass = trafficClass||0;
	    this.flowLabel = flowLabel||0;
	    this.payloadLength = payloadLength||0;
	    this.nextHeader = (nextHeader==null)?-1:nextHeader;
	    this.hopLimit = hopLimit||64;
	},
	/**
	 * @type Number 
	 */
	vers: 0,
	/**
	 * @type String
	 */
	srcaddr: 0,
	/**
	 * @type String
	 */
	dstaddr: 0,
	/**
	 * @type Number 
	 */
	trafficClass: 0,
	/**
	 * @type Number 
	 */
	flowLabel: 0,
	/**
	 * @type Number 
	 */
	payloadLength: 0,
	/**
	 * @type Number 
	 */
	nextHeader: 0,
	/**
	 * @type Number 
	 */
	hopLimit: 0,

	/**
	 * @returns {Number}
	 */
	getSrcAddr: function() {
	    return this.srcaddr;
	},
	    
	/**
	 * @returns {Number}
	 */
	getDstAddr: function() {
	    return this.dstaddr;
	},

	/**
	 * @returns {String}
	 */
	generate: function() {
	    var u4 = (this.vers<<28) | (this.trafficClass<<20) | (this.flowLabel);

	    var payload = "";
	    for (var i = 0; i < this.headers.length; i++) {
		payload += this.headers[i].generate(this);
	    };

	    this.payloadLength = payload.length;
	    this.nextHeader = this.headers[0].nextHeader;

	    var s = Formatter.pack("4uB2u1u1u16dB16dB", u4, payload.length, this.headers[0].nextHeader, this.hopLimit, this.srcaddr, this.dstaddr) + payload;
	    return s;
	},

	/**
	 * @returns {String}
	 */
	toString: function() {
	    var t = new Util.Formatter.Table2(8);
	    t.setTitle("IPv6-Vers", "TC", "FL", "PL", "NH", "HL", "Source", "Dest");
	    t.setValue(0, 0, this.vers);
	    t.setValue(1, 0, this.trafficClass.toString(16));
	    t.setValue(2, 0, this.flowLabel.toString(16));
	    t.setValue(3, 0, this.payloadLength);
	    t.setValue(4, 0, this.nextHeader);
	    t.setValue(5, 0, this.hopLimit);
	    t.setValue(6, 0, Formatter.binToHex(this.srcaddr));
	    t.setValue(7, 0, Formatter.binToHex(this.dstaddr));
	    var txt = t.render().join("\n");
	    if (this.headers) {
		//this.headers.forEach(function(hdr) { txt += "\n" + hdr.toString(); });
		txt += "\n" + this.headers.join("\n");
	    }
	    return txt;
	}
    }
);    






Class.define(
    "IPv6.UDPPacket",
    /**
     * @lends IPv6.UDPPacket.prototype
     */
    {
	/**
	 * @constructs
	 * @param dstport
	 * @param srcport
	 * @param data
	 * @param length
	 * @param cksum
	 */
	__constr__: function(/** Number */dstport, /** Number */srcport, /** String */data, /** Number */length, /** Number */cksum) {
	    this.nextHeader = IPv6.NH_UDP;
	    this.dstport = dstport;
	    this.srcport = srcport;
	    this.data = data;
	    this.length = (length!=null) ? length : (8 + this.data.length);
	    this.cksum = cksum||0;
	},
	/**
	 * @type Number
	 */
	srcport: 0,
	/**
	 * @type Number
	 */
	dstport: 0,
	/**
	 * @type Number
	 */
	length: 0,
	/**
	 * @type Number
	 */
	cksum: 0,
	/**
	 * @type String
	 */
	data: null,

	/**
	 * @returns {Number}
	 */
	getSrcPort: function() {
	    return this.srcport;
	},

	/**
	 * @returns {Number}
	 */
	getDstPort: function() {
	    return this.dstport;
	},

	/**
	 * @returns {Number}
	 */
	getData: function() {
	    return this.data;
	},

	/**
	 * @param ip  IP Packet
	 * @returns {String}
	 * @private
	 */
	generate: function(/** IPv6.IPPacket */ip) {
	    var bytes1 = Formatter.pack("16dB16dB4u2u1u1u", ip.srcaddr, ip.dstaddr, this.length, 0, 0, this.nextHeader);
	    var bytes2 = Formatter.pack("2u2u2u2u", this.srcport, this.dstport, this.length, 0) + this.data;
	    
	    var s = bytes1 + bytes2;
	    var cksum = IPv6.wrapsum(IPv6.checksum(s, 0));

	    return bytes2.substr(0, 6) + cksum + bytes2.substr(8);
	},

	/**
	 * @returns {String}
	 */
	toString: function() {
	    var t = new Util.Formatter.Table2(5);
	    t.setTitle("UDP SrcPort", "DstPort", "Len", "Cksum", "Data");
	    t.setValue(0, 0, this.srcport);
	    t.setValue(1, 0, this.dstport);
	    t.setValue(2, 0, this.length);
	    t.setValue(3, 0, this.cksum.toString(16));
	    t.setValue(4, 0, Formatter.binToHex(this.data));
	    return t.render().join("\n");
	}
    }
);    







/**
 * @type String
 * @constant
 */
IPv6.TUN_DEV_NAME = "tun0";

/**
 * @type String
 * @constant
 */
IPv6.TUN_HOST = "127.0.0.1";

/**
 * @type String
 * @constant
 */
IPv6.TUN_PORT = 23212;

/**
 * @class
 * @static
 */
IPv6.Tun = {
    /**
     * @param prefix
     * @returns {IPv6.Tun.If}
     */
    open: function() {
	
	// var devname, argvs;
	// var file = file = new UNIX.File();
	// if (ARCH_NAME === "macosx") {
	//     argvs = this.OSX_ARGVS_DEFAULT;
	//     devname = "/dev/" + IPv6.TUN_DEV_NAME;
	//     var result = file.open(devname, IO.File.O_RDWR, null, SCB);
	//     if (result.code !== 0) {
	// 	throw new Exception(sprintf("Cannot open tunnel device '%s': %s", devname, result.toString()));
	//     }
	    
	// } else if (/^linux/.test(ARCH_NAME)) {
	//     argvs = this.LINUX_ARGVS_DEFAULT;
	//     devname = "/dev/net/" + IPv6.TUN_DEV_NAME;
	//     var obj = Inet.openTunnel(IPv6.TUN_DEV_NAME);
	//     var result = file.open(devname, IO.File.O_RDWR, obj.fd, SCB);
	//     if (result.code !== 0) {
	// 	throw new Exception(sprintf("Cannot open tunnel device '%s': %s", devname, result.toString()));
	//     }
	// } else {
	//     throw "Unsupported platform: " + ARCH_NAME;    
	// }

	// var devname = "/tmp/6lowpan-t2m";
	// var file = file = new UNIX.File();
	// var result = file.open(devname, IO.File.O_RDONLY, null, SCB);
	// if (result.code !== 0) {
	//     throw new Exception(sprintf("Cannot open tunnel device '%s': %s", devname, result.toString()));
	// }

	// var devname = "/tmp/6lowpan-m2t";
	// var file2 = new UNIX.File();
	// var result = file2.open(devname, IO.File.O_WRONLY, null, SCB);
	// if (result.code !== 0) {
	//     throw new Exception(sprintf("Cannot open tunnel device '%s': %s", devname, result.toString()));
	// }
	// assert(file2.isAlive());

	var devname = "Tunnel";
	var sock = new IO.UDPSocket();
	var result = sock.open(undefined, SCB);
	if (result.code !== 0) {
	     throw new Exception(sprintf("Cannot open udp socket to tunnel device: %s", result.toString()));
	}
	var tunif = new IPv6.Tun.If(IPv6.TUN_HOST, IPv6.TUN_PORT, sock);
	return tunif;
    }
};

Class.define(
    "IPv6.Tun.If",
    /**
     * @lends IPv6.Tun.If
     */
    {
	/**
	 * @constructs
	 * @param name
	 * @param file
	 * @param callback Receives data read from interface
	 */
	__constr__: function(/** String */host, /** Number */port, /** UNIX.File */file) {
	    this.host = host;
	    this.port = port;
	    this.file = file;
	    var _this = this;
	    file.onBlob = function(blob) {
		//QUACK(0, "BLOB: " + Util.formatData(blob));
		//QUACK(0, "BLOB: " + Formatter.binToHex(blob.data));

		var bytes = blob.data;

		if (IPv6.LOG_TRAFFIC) {
		    QUACK(0, "\nINCOMING BYTES:\n" + Formatter.genHexTable(bytes).join("\n"));
		}

		var ip = IPv6.parse(bytes);
		if (!ip) {
		    return;
		}

		if (IPv6.LOG_TRAFFIC) {
		    QUACK(0, "\nINCOMING PACKET:\n" + ip);
		}

		if (!_this.isReachable(ip.dstaddr)) {
		    var data = bytes.substr(0, 40) + bytes.substr(40, 8);
		    var icmp = new IPv6.ICMPUnreachablePacket(IPv6.ICMP_HOST_UNREACHABLE, 0, data);
		    var outp = new IPv6.IPPacket(ip.dstaddr, ip.srcaddr, 0, 0, 0, 0, 0, 0, [ icmp ]);
		    _this.send(outp);
		    return;
		}

		var lp = ip.headers[ip.headers.length-1];
		if (lp) {
		    switch(lp.nextHeader) {
		    case IPv6.NH_ICMP:
			_this.onIcmp(ip, lp);
			return;
		    case IPv6.NH_UDP:
			_this.onUdp(ip, lp);
			return;
		    }
		}
		
		_this.onOther(ip);
	    };
	    this.file.send("", this.host, this.port);
	},


	/**
	 * @param lines
	 */
	configure: function(/** String[][]*/argvs) {
	    return;


	    var execf = function(argv) {
		var res = IO.Process.start3("sudo", argv, SCB);
		if (res.code !== 0) {
		    AOP.throwERR(res);
		}
		var data = res.getData();
		if (data.pexitcode !== 0) {
		    var msg = "'" + argv.join(" ") + "' failed: exit code " + data.pexitcode + "\n";
		    msg += data.poutput;
		    println(msg);
		    throw new Exception(msg);
		}
	    };
	    for (var i = 0; i < argvs.length; i++) {
		execf(argvs[i]);
	    }
	},



	/**
	 * @returns {String}
	 */
	toString: function() {
	    return this.host+":"+this.port;
	},

	/**
	 * @param ip
	 */
	send: function(/** IPv6.IPPacket */ip) {
	    var _this = this;
	    var s = ip.generate();
	    if (IPv6.LOG_TRAFFIC) {
		QUACK(0, "\nOUTGOING PACKET:\n" + ip.toString()); 
		QUACK(0,  "\nOUTGOING BYTES:\n" + Formatter.genHexTable(s).join("\n"));
	    }
	    //QUACK(0, "\nOUTGOING PACKET:\n" + ip.toString()); 
	    this.file.send(s, this.host, this.port);
	},

	/**
	 * @returns {Boolean} true if destination address is reachable
	 */
	isReachable: function(/** String */dstaddr) {
	    return true;
	},

	/**
	 * @param err
	 */
	onReadFailed: function(/** AOP.ERR */err) {
	    QUACK(0, "Tunnel read operation failed: " + err);
	},

	/**
	 * @param inp
	 * @param inicmp
	 */
	onIcmp: function(/** IPv6.IPPacket */inp, /** Object */inicmp) {
	    if (IPv6.LOG_TRAFFIC) {
		QUACK(0, "\nINCOMING ICMP IP:\n" + inp.toString()); 
	    }
	    if (inicmp.type === IPv6.ICMP_ECHOREQUEST_TYPE) {
		var outicmp = new IPv6.ICMPEchoPacket(IPv6.ICMP_ECHORESPONSE_TYPE, inicmp.code, 0, inicmp.identifier, inicmp.seqno, inicmp.data);
		var outp = new IPv6.IPPacket(inp.dstaddr, inp.srcaddr, 0, 0, 0, 0, 0, 0, [ outicmp ]);
		this.send(outp);
	    } else {
		println("Drop unknown ICMP packet:\n" + inp.toString()); 
	    }
	},

	/**
	 * @param inp
	 * @param inudp
	 */
	onUdp: function(/** IPv6.IPPacket */inp, /** IPv6.UDPPacket */inudp) {
	    if (IPv6.LOG_TRAFFIC) {
		QUACK(0, "\nINCOMING UDP IP:\n" + inp.toString()); 
	    }

	    var outudp = new IPv6.UDPPacket(inudp.srcport, inudp.dstport, inudp.data);
	    var outp = new IPv6.IPPacket(inp.dstaddr, inp.srcaddr, 0, 0, 0, 0, 0, 0, [ outudp ]);
	    this.send(outp);
	},

	/**
	 * @param inp
	 * @param inunknownp
	 */
	onOther: function(/** IPv4.IPPacket */inp) {
	    QUACK(0, "\nINCOMING UNKNOWN IP:\n" + inp.toString()); 
	}
    }
);

