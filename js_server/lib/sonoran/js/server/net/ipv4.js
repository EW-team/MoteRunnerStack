/**
 * @class
 * @static
 */
 IPv4 = {
     /**
      * @type Number
      */     
     PROTO_ICMP: 0x1,
     /**
      * @type Number
      */     
     PROTO_UDP: 0x11,
     /**
      * @type Number
      */     
     PROTO_UNKNOWN: 0xff,

     /**
      * @type Number
      */     
     ICMP_ECHO_TYPE: 0x8,
     /**
      * @type Number
      */     
     ICMP_ECHOREPLY_TYPE: 0x0,
     /**
      * @type Number
      */     
     ICMP_UNREACHABLE_TYPE: 0x3,
     
	 
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
      * @returns {IPv4.Packet}
      */
     parse: function(/** String */s) {
	 return IPv4.IPPacket.parse(s);
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
    "IPv4.IPPacket",
    /**
     * @lends IPv4.IPPacket.prototype
     */
    {
	/**
	 * @constructs
	 * @param dstaddr
	 * @param srcaddr
	 * @param nestedPacket 
	 */
	__constr__: function(/** Number */dstaddr, /** Number */srcaddr, /** Object */nestedPacket) {
	    assert(arguments.length===3);
	    this.dstaddr = dstaddr;
	    assert(typeof(this.dstaddr) === 'number');
	    this.srcaddr = srcaddr;
	    assert(typeof(this.srcaddr) === 'number');
	    this.nestedPacket = nestedPacket;
	    assert(this.nestedPacket);

	    this.vers = 4;
	    this.internetHeaderLength = 5;
	    this.typeOfService = 0;
	    this.totalLength = -1;
	    this.identification = 0;
	    this.flags = 0;
	    this.fragOff = 0;
	    this.ttl = 16;
	    this.protocol = this.nestedPacket.getProtocol();
	    assert(this.protocol === IPv4.PROTO_UDP || this.protocol === IPv4.PROTO_ICMP); 
	    this.cksum = 0;
	},


	/**
	 * @type Number 
	 */
	vers: 0,
	/**
	 * @type Number 
	 */
	internetHeaderLength: 0,
	/**
	 * @type Number 
	 */
	typeOfService: 0,
	/**
	 * @type Number 
	 */
	totalLength: 0,
	/**
	 * @type Number 
	 */
	identification: 0,
	/**
	 * @type Number 
	 */
	flags: 0,
	/**
	 * @type Number 
	 */
	fragOff: 0,
	/**
	 * @type Number 
	 */
	ttl: 0,
	/**
	 * @type Number 
	 */
	protocol: 0,
	/**
	 * @type Number 
	 */
	cksum: 0,
	/**
	 * @type String
	 */
	bytes: null,
	/**
	 * @type Number 
	 */
	srcaddr: 0,
	/**
	 * @type Number 
	 */
	srcaddr: 0,
	/**
	 * @type Number 
	 */
	dstaddr: 0,
	/**
	 * @type Object
	 */
	nestedPacket: null,

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
	 * @returns {Number}
	 */
	getProtocol: function() {
	    return this.protocol;
	},

	/**
	 * @returns {String}
	 */
	getBytes: function() {
	    return this.bytes;
	},

	/**
	 * @returns {Number}
	 */
	getTotalLength: function() {
	    return this.totalLength;
	},

	/**
	 * @returns {Number}
	 */
	getInternetHeaderLength: function() {
	    return this.internetHeaderLength;
	},

	/**
	 * @returns {Object}
	 */
	getNestedPacket: function() {
	    return this.nestedPacket;
	},

	/**
	 * @returns {String}
	 */
	generate: function() {
	    assert(this.dstaddr);
	    assert(this.srcaddr);
	    assert(this.nestedPacket);
	    var p = this.nestedPacket;

	    this.totalLength = 20 + 8 + p.data.length;
	    this.ttl = 64;

	    var b0 = this.vers<<4 | this.internetHeaderLength;
	    var u2 = this.flags<<13|this.fragOff;
	    var s1 = Formatter.pack("1u1u2u2u2u1u1u2u4u4u", b0, this.typeOfService, this.totalLength, this.identification, u2, this.ttl, this.protocol, this.cksum, this.srcaddr, this.dstaddr); 

	    var cksum = IPv4.wrapsum(IPv4.checksum(s1, 0));
	    s1 = s1.substr(0, 10) + cksum + s1.substr(12);

	    assert((this.protocol === IPv4.PROTO_ICMP) || (this.protocol == IPv4.PROTO_UDP));
	    var s2 = this.nestedPacket.generate(this, s1);

	    this.bytes = s1 + s2;
	    return this.bytes;
	},

	/**
	 * @returns {String}
	 */
	toString: function() {
	    var t = new Util.Formatter.Table2(12);
	    t.setTitle("Vers", "IHL", "TOS", "TL", "Id", "Flags", "FragOff", "TTL", "Proto", "Cksum", "Source", "Dest");
	    t.setValue(0, 0, this.vers);
	    t.setValue(1, 0, this.internetHeaderLength);
	    t.setValue(2, 0, this.typeOfService.toString(16));
	    t.setValue(3, 0, this.totalLength);
	    t.setValue(4, 0, this.identification);
	    t.setValue(5, 0, this.flags.toString());
	    t.setValue(6, 0, this.fragOff);
	    t.setValue(7, 0, this.ttl);
	    t.setValue(8, 0, this.protocol.toString(16));
	    t.setValue(9, 0, this.cksum.toString(16));
	    t.setValue(10, 0, this.srcaddr.toString(16));
	    t.setValue(11, 0, this.dstaddr.toString(16));
	    var txt = t.render().join("\n");
	    if (this.nestedPacket) {
		txt += "\n" + this.nestedPacket.toString();
	    }
	    return txt;
	}
    },
    {
	/**
	 * @param bytes
	 * @returns {IPv4.IPPacket}
	 */
	parse: function(/** String */bytes) {
	    var arr = Formatter.unpack("1u1u2u2u2u1u1u2u4u4u", bytes);
	    var b = arr[0];
	    var vers = (b>>4)&0xf;
	    assert(vers==0x4);
	    var internetHeaderLength = (b>>0)&0xf;
	    var typeOfService = arr[1];
	    var totalLength = arr[2];
	    var identification = arr[3];
	    var u2 = arr[4];
	    var flags = (u2>>13)&0x7;
	    var fragOff = u2&((1<<14)-1);
	    var ttl = arr[5];
	    var protocol = arr[6];
	    var cksum = arr[7];
	    var srcaddr = arr[8];
	    var dstaddr = arr[9];
		
	    var cnt = internetHeaderLength*4;
	    var s = bytes.substr(cnt, totalLength-cnt);
	
	    var nestedPacket;
	    if (protocol === IPv4.PROTO_UDP) {
		nestedPacket = IPv4.UDPPacket.parse(s);
	    } else if (protocol === IPv4.PROTO_ICMP) {
		nestedPacket = IPv4.parseICMP(s);
	    } 
	    if (!nestedPacket) {
		nestedPacket = new IPv4.UnknownPacket(s);
	    }
	    
	    var p = new IPv4.IPPacket(dstaddr, srcaddr, nestedPacket);

	    p.internetHeaderLength = internetHeaderLength;
	    p.typeOfService = typeOfService;
	    p.totalLength = totalLength;
	    p.identification = identification;
	    p.flags = flags;
	    p.fragOff = fragOff;
	    p.ttl = ttl;
	    p.protocol = protocol;
	    p.cksum = cksum;
	    p.bytes = bytes.substr(0, p.totalLength);
	    return p;
	}
    }
);    



Class.define(
    "IPv4.UDPPacket",
    /**
     * @lends IPv4.UDPPacket.prototype
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
	getProtocol: function() {
	    return IPv4.PROTO_UDP;
	},

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
	 * @param s1  Binary representation of ip packet
	 * @returns {String}
	 * @private
	 */
	generate: function(/** IPv4.IPPacket */ip, /** String */s1) {
	    var s2 = Formatter.pack("2u2u2u2u", this.srcport, this.dstport, this.length, 0) + this.data;
	    var cksum1 =  IPv4.checksum(s1.substr(12, 8), IPv4.PROTO_UDP + this.length);
	    var cksum2 =  IPv4.checksum(this.data, cksum1);
	    var cksum3 =  IPv4.checksum(s2.substr(0, 8), cksum2);
	    var cksum = IPv4.wrapsum(cksum3);
	    s2 = s2.substr(0, 6) + cksum + s2.substr(8);
	    return s2;
	},

	/**
	 * @returns {String}
	 */
	toString: function() {
	    var t = new Util.Formatter.Table2(5);
	    t.setTitle("SrcPort", "DstPort", "Len", "Cksum", "Data");
	    t.setValue(0, 0, this.srcport);
	    t.setValue(1, 0, this.dstport);
	    t.setValue(2, 0, this.length);
	    t.setValue(3, 0, this.cksum.toString(16));
	    t.setValue(4, 0, Formatter.binToHex(this.data));
	    return t.render().join("\n");
	}
    },
    {
	/**
	 * @param s
	 * @returns {IPv4.UDPPacket}
	 * @private
	 */
	parse: function(/** String */s) {
	    var arr = Formatter.unpack("2u2u2u2u", s);
	    var srcport = arr[0];
	    var dstport = arr[1];
	    var length = arr[2];
	    var cksum = arr[3];
	    var data = s.substr(8);
	    var p = new IPv4.UDPPacket(dstport, srcport, data, length, cksum);
	    return p;
	}
    }
);    



/**
 * @param s
 * @returns {Object}
 * @private
 */
IPv4.parseICMP = function(/** String */s) {
    var type = s.charCodeAt(0);
    if ((type === IPv4.ICMP_ECHO_TYPE) || (type === IPv4.ICMP_ECHOREPLY_TYPE)) {
	var arr = Formatter.unpack("1u1u2u2u2u", s);
	var code = arr[1];
	var cksum = arr[2];
	var identifier = arr[3];
	var seqno = arr[4];
	var data = s.substr(8);
	var p = new IPv4.ICMPEchoPacket(type, code, cksum, identifier, seqno, data);
	return p;
    }
    if (type === IPv4.ICMP_UNREACHABLE_TYPE) {
	var arr = Formatter.unpack("1u1u2u4u", s);
	var code = arr[1];
	var cksum = arr[2];
	var unused = arr[3];
	var data = s.substr(8);
	var p = new IPv4.ICMPUnreachablePacket(code, cksum, data);
	return p;
    }
    return null;
};


Class.define(
    "IPv4.ICMPEchoPacket",
    /**
     * @lends IPv4.ICMPEchoPacket.prototype
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
	    this.type = type;
	    assert((type === IPv4.ICMP_ECHO_TYPE) || (type === IPv4.ICMP_ECHOREPLY_TYPE));
	    this.code = code;
	    this.cksum = cksum;
	    this.identifier = identifier;
	    this.seqno = seqno;
	    this.data = data;
	},
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
	 * @returns {Number}
	 */
	getProtocol: function() {
	    return IPv4.PROTO_ICMP;
	},

	/**
	 * @param ip  IP Packet
	 * @param s1  Binary representation of ip packet
	 * @returns {String}
	 * @private
	 */
	generate: function(/** IPv4.IPPacket */ip, /** String */ips) {
	    var s = Formatter.pack("1u1u2u2u2u", this.type, this.code, 0, this.identifier, this.seqno) + this.data;
	    var cksum = IPv4.wrapsum(IPv4.checksum(s, 0));
	    s = s.substr(0, 2) + cksum + s.substr(4);
	    return s;
	},
	
	/**
	 * @returns {String}
	 */
	toString: function() {
	    var t = new Util.Formatter.Table2(5);
	    t.setTitle("Type", "Code", "Cksum", "Identifier", "Seqno");
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
    "IPv4.ICMPUnreachablePacket",
    /**
     * @lends IPv4.ICMPUnreachablePacket.prototype
     */
    {
	/**
	 * @constructs
	 * @param code
	 * @param cksum
	 * @param data
	 */
	__constr__: function(/** Number */code, /** Number */cksum, /** String */data) {
	    this.type = IPv4.ICMP_UNREACHABLE_TYPE;
	    this.code = code;
	    this.cksum = cksum;
	    this.data = data;
	},
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
	 * @returns {Number}
	 */
	getProtocol: function() {
	    return IPv4.PROTO_ICMP;
	},

	/**
	 * @param ip  IP Packet
	 * @param s1  Binary representation of ip packet
	 * @returns {String}
	 * @private
	 */
	generate: function(/** IPv4.IPPacket */ip, /** String */ips) {
	    var s = Formatter.pack("1u1u2u4u", this.type, this.code, 0, 0) + this.data;
	    var cksum = IPv4.wrapsum(IPv4.checksum(s, 0));
	    s = s.substr(0, 2) + cksum + s.substr(4);
	    return s;
	},
	
	/**
	 * @returns {String}
	 */
	toString: function() {
	    var t = new Util.Formatter.Table2(3);
	    t.setTitle("Type", "Code", "Cksum");
	    t.setValue(0, 0, this.type);
	    t.setValue(1, 0, this.code);
	    t.setValue(2, 0, this.cksum.toString(16));
	    var txt = t.render().join("\n") + "\n" + Formatter.binToHex(this.data);
	    return txt;
	}
    }
);    



Class.define(
    "IPv4.UnknownPacket",
    /**
     * @lends IPv4.UnknownPacket.prototype
     */
    {
	/**
	 * @constructs
	 * @param data
	 */
	__constr__: function(/** String */data) {
	    this.data = data;
	},
	/**
	 * @type String
	 */
	data: null,

	/**
	 * @returns {Number}
	 */
	getProtocol: function() {
	    return IPv4.PROTO_UNKNOWN;
	},

	/**
	 * @param ip  IP Packet
	 * @param s1  Binary representation of ip packet
	 * @returns {String}
	 * @private
	 */
	generate: function(/** IPv4.IPPacket */ip, /** String */ips) {
	    assert(false, "Unsupported");
	},
	
	/**
	 * @returns {String}
	 */
	toString: function() {
	    return "IPv4.PROTO_UNKNOWN: " + Formatter.binToHex(this.data);
	}
    }
);    








/**
 * @type String
 */
IPv4.OSX_TUN_ENDPOINT_ADDR =    "192.168.5.2";
/**
 * @type String
 */
IPv4.OSX_TUN_STARTPOINT_ADDR =  "192.168.5.1";
/**
 * @type String
 */
IPv4.OSX_TUN_NETWORK_RANGE =    "10.1.2.1/16";
/**
 * @type String
 */
IPv4.LINUX_TUN_NETWORK_RANGE =    "10.1.3.1/16";

/**
 * @type String
 */
IPv4.TUN_DEV_NAME = "tun0";

/**
 * @class
 * @static
 */
IPv4.Tun = {
    /**
     * @type String[]
     * @private
     */
    OSX_ARGVS_DEFAULT: [
	[ "ifconfig", "tun0", IPv4.OSX_TUN_STARTPOINT_ADDR, IPv4.OSX_TUN_ENDPOINT_ADDR ],
	[ "route", "add", IPv4.OSX_TUN_NETWORK_RANGE, IPv4.OSX_TUN_ENDPOINT_ADDR ],
	[ "route", "add", IPv4.OSX_TUN_STARTPOINT_ADDR, "127.0.0.1" ]
    ],


    /**
     * @type String[]
     * @private
     */
    LINUX_ARGVS_DEFAULT: [
	[ "ip", "link", "set", "tun0", "up" ],
	[ "ip", "addr", "add", IPv4.LINUX_TUN_NETWORK_RANGE, "dev", "tun0" ]
    ],
	

    /**
     * @returns {IPv4.Tun.If}
     */
    open: function() {
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

	var devname, argvs;
	var file = file = new UNIX.File();
	if (ARCH_NAME === "macosx") {
	    argvs = this.OSX_ARGVS_DEFAULT;
	    devname = "/dev/" + IPv4.TUN_DEV_NAME;
	    var result = file.open(devname, IO.File.O_RDWR, null, SCB);
	    if (result.code !== 0) {
		throw new Exception(sprintf("Cannot open tunnel device '%s': %s", devname, result.toString()));
	    }
	    
	} else if (/^linux/.test(ARCH_NAME)) {
	    argvs = this.LINUX_ARGVS_DEFAULT;
	    devname = "/dev/net/" + IPv4.TUN_DEV_NAME;
	    var obj = Inet.openTunnel(IPv4.TUN_DEV_NAME);
	    var result = file.open(devname, IO.File.O_RDWR, obj.fd, SCB);
	    if (result.code !== 0) {
		throw new Exception(sprintf("Cannot open tunnel device '%s': %s", devname, result.toString()));
	    }
	} else {
	    throw "Unsupported platform: " + ARCH_NAME;    
	}
	var tunif = new IPv4.Tun.If(devname, file);
	for (var i = 0; i < argvs.length; i++) {
	    execf(argvs[i]);
	}
	return tunif;
    }
};

Class.define(
    "IPv4.Tun.If",
    /**
     * @lends IPv4.Tun.If
     */
    {
	/**
	 * @constructs
	 * @param name
	 * @param file
	 * @param callback Receives data read from interface
	 */
	__constr__: function(/** String */name, /** Number */file) {
	    this.name = name;
	    this.file = file;
	    var _this = this;
	    file.onBlob = function(blob) {
		//QUACK(0, "BLOB: " + Util.formatData(blob));
		var bytes = blob.data;
		//QUACK(0, "\nINCOMING READ:\n" + Formatter.genHexTable(bytes).join("\n"));
	    	var inp = IPv4.parse(bytes);
	    	//QUACK(0, "\nINCOMING IP:\n" + inp.toString());
	    	var protocol = inp.getProtocol();
	    	try {
	    	    switch(protocol) {
	    	    case IPv4.PROTO_UDP:
	    		_this.onUdp(inp, inp.getNestedPacket());
	    		break;
	    	    case IPv4.PROTO_ICMP:
	    		_this.onIcmp(inp, inp.getNestedPacket());
	    		break;
	    	    case IPv4.PROTO_UNKNOWN:
	    		_this.onUnknown(inp, inp.getNestedPacket());
	    		break;
	    	    default:
	    		assert(false);
	    	    }
	    	} catch (x) {
	    	    var msg = "Tunnel callback failed: " + Runtime.dumpException(x);
	    	    QUACK(0, msg);
	    	    Logger.err(msg);
	    	}
	    };
	},

	/**
	 * @returns {String}
	 */
	toString: function() {
	    return this.name;
	},

	/**
	 * @param ip
	 */
	send: function(/** IPv4.IPPacket */ip) {
	    var _this = this;
	    //QUACK(0, "\nOUTGOING UDP IP:\n" + ip.toString()); 
	    var s = ip.generate();
	    //QUACK(0,  "\nSEND:\n" + Formatter.genHexTable(s).join("\n"));
	    this.file.send(s);
	    
	},

	/**
	 * @param inp
	 */
	sendUnreachableFor: function(/** IPv4.IPPacket */inp) {
	    var inbytes = inp.getBytes();
	    var dstaddr = inp.getDstAddr();
	    var srcaddr = inp.getSrcAddr();

	    var data = inbytes.substr(0, 4*inp.getInternetHeaderLength() + 8);
	    var icmpp = new IPv4.ICMPUnreachablePacket(IPv4.ICMP_HOST_UNREACHABLE, 0, data);
	    var outp = new IPv4.IPPacket(srcaddr, dstaddr, icmpp);
	    this.send(outp);
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
	onIcmp: function(/** IPv4.IPPacket */inp, /** IPv4.ICMPEchoPacket */inicmp) {
	    QUACK(0, "\nINCOMING ICMP IP:\n" + inp.toString()); 
	},

	/**
	 * @param inp
	 * @param inudp
	 */
	onUdp: function(/** IPv4.IPPacket */inp, /** IPv4.UDPPacket */inudp) {
	    QUACK(0, "\nINCOMING UDP IP:\n" + inp.toString()); 
	},

	/**
	 * @param inp
	 * @param inunknownp
	 */
	onUnknown: function(/** IPv4.IPPacket */inp, /** IPv4.UnknownPacket */inunknownp) {
	    QUACK(0, "\nINCOMING UNKNOWN IP:\n" + inp.toString()); 
	}
    }
);





