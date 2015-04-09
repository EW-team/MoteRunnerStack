/**
 * Provides a simple SNMP client.
 * @fileOverview
 */

/**
 * Implemenation of a simple snmp client.
 * @class
 */
var SNMP = {
    V1:     0,
    V2C:    1,
    V3:     3,   //unsupported

    TAG_GETREQUEST_PDU:              0xa0,
    TAG_GETNEXTREQUEST_PDU:          0xa1,
    TAG_RESPONSE_PDU:                0xa2,
    TAG_SETREQUEST_PDU:              0xa3,
    TAG_TRAPV1_PDU:                  0xa4,
    TAG_GETBULKREQUEST_PDU:          0xa5,
    TAG_INFORMREQUEST_PDU:           0xa6,
    TAG_TRAPV2_PDU:                  0xa7,
    TAG_REPORT_PDI:                  0xa8,

    TAG_INTEGER:                     0x02,
    TAG_OCTETSTRING:                 0x04,
    TAG_NULL:                        0x05,
    TAG_OID:                         0x06,
    TAG_SEQUENCE:                    0x30,

    TAG_IPADDRESS:                   0x40,
    TAG_COUNTER32:                   0x41,
    TAG_GAUGE32:                     0x42,
    TAG_UNSIGNED32:                  0x42,
    TAG_TIMETICKS:                   0x43,
    TAG_OPAQUE:                      0x44,
    TAG_COUNTER64:                   0x46,

    TAG_NOSUCHOBJECT:                0x80,
    TAG_NOSUCHINSTANCE:              0x81,
    TAG_ENDOFMIBVIEW:                0x82,


    TRAP_GENERIC_COLD_START:         0x0,
    TRAP_GENERIC_WARM_START:         0x1,
    TRAP_GENERIC_LINK_DOWN:          0x2,
    TRAP_GENERIC_LINK_UP:            0x3,
    TRAP_GENERIC_ENTERPRISE_SPECIFIC:0x6
};


/**
 * Exception class
 * @class 
 */
SNMP.InvalidData = function(msg) {
    this.msg = msg;
    this.toString = function() { return this.msg; };
};

/**
 * Exception class
 * @class 
 */
SNMP.InvalidTag = function(msg) {
    this.msg = msg;
    this.toString = function() { return this.msg; };
};

/**
 * Exception class
 * @class 
 */
SNMP.InvalidLength = function(msg) {
    this.msg = msg;
    this.toString = function() { return this.msg; };
};

/**
 * Exception class
 * @class 
 */
SNMP.InvalidOID = function(msg) {
    this.msg = msg;
    this.toString = function() { return this.msg; };
};






/**
 * Stream reader of ASN1 encoded messages.
 * @class 
 */
SNMP.Reader = function(buf, off, len) {
    IO.BinaryStringReader.call(this, buf, off, len);
};

/** @private */
SNMP.Reader.prototype = new IO.BinaryStringReader();

/** Return hex representation of nternal buffer. */
SNMP.Reader.prototype.toString = function() {
    return Formatter.binToHex(this.buf.substr(this.pos));
};

/** Read and returns next tag and value as array [ tag, value]. */
SNMP.Reader.prototype.readTLV = function() {
    var value;
    var tag = this.readByte();
    if (tag < 0) {
	throw new IO.Exception("EOF");
    }
    var length = this.readByte();
    if (length < 0) {
	throw new IO.Exception("EOF");
    }
    if ((length&0x80)!=0) {
	assert(length != 0xff);
	var cnt = length & 0x7f;
	length = this.readIntegerValue(cnt);
    }
    value = this.readBytes(length);
    if (value == null) {
	throw new IO.Exception("EOF");
    }
    return [ tag, value ];
};

/** Read and returns next sequence in stream. Sequence is returned as SNMP.Reader for
 * the segment of bytes this sequence spans. */
SNMP.Reader.prototype.readSequence = function() {
    var tag = this.readByte();
    if (tag < 0) {
	throw new IO.Exception("EOF");
    }
    assert(tag == SNMP.TAG_SEQUENCE);
    var length = this.readByte();
    if (length < 0) {
	throw new IO.Exception("EOF");
    }
    //println("SEQ: " + length.toString(16));
    if ((length&0x80)!=0) {
	assert(length != 0xff);
	var cnt = length & 0x7f;
    //println("SEQ: " + cnt);
	length = this.readIntegerValue(cnt);
    }
    var ret = new SNMP.Reader(this.getBuf(), this.getPos(), length);
    this.skip(length);
    return ret;
};

/** Read integer value consisting of cnt bytes. */
SNMP.Reader.prototype.readIntegerValue = function(cnt) {
    var n = 0;
    for (var i = 0; i < cnt; i++) {
	var b = this.readByte();
	if (b < 0) {
	    throw new IO.Exception("EOF");
	}
	n = n<<8 | b;
    }
    return n;
};

/** @private */
SNMP.Reader.prototype.v2u = function(value) {
    var n = 0;
    for (var i = 0; i < value.length; i++) {
	n = n<<8 | value.charCodeAt(i);
    }
    return n;
};

/** @private */
SNMP.Reader.prototype.v2i = function(value) {
    var n = this.v2u(value);
    if ((value.charCodeAt(0)&0x80) != 0) {
	n -= (1 << (8 * value.length));
    }
    return n;
};

/** Read integer tag and value and return integer. */
SNMP.Reader.prototype.readInteger = function() {
    var tuple = this.readTLV();
    var tag = tuple[0];
    var value = tuple[1];
    assert(tag == SNMP.TAG_INTEGER);
    return this.v2i(value);
};

/** Read timeticks tag and value and return timeticks. */
SNMP.Reader.prototype.readTimeTicks = function() {
    var tuple = this.readTLV();
    var tag = tuple[0];
    var value = tuple[1];
    assert(tag == SNMP.TAG_TIMETICKS);
    return this.v2u(value);
};

/** Read octet string tag and value and return octet string. */
SNMP.Reader.prototype.readOctetString = function() {
    var tuple = this.readTLV();
    var tag = tuple[0];
    var value = tuple[1];
    assert(tag == SNMP.TAG_OCTETSTRING);
    return value;
};

/** Read ip address tag and value and return 32bit ip address. */
SNMP.Reader.prototype.readIpAddress = function() {
    var tuple = this.readTLV();
    var tag = tuple[0];
    var value = tuple[1];
    assert(tag == SNMP.TAG_IPADDRESS);
    assert(value.length == 4);
    return value;
};

/** Read oid tag and value and return object id as string. */
SNMP.Reader.prototype.readOID = function() {
    var tuple = this.readTLV();
    var tag = tuple[0];
    var value = tuple[1];
    assert(tag == SNMP.TAG_OID);
    return this.v2oid(value);
};

/** Decode oid input string to array of integers. */
SNMP.Reader.prototype.v2oid = function(value) {
    var oid;
    if (value.length == 0) {
	oid = [];
    } else {
	var value0 = value.charCodeAt(0);
	if (value0 == 0x2b) {
            oid = [1, 3];
	} else {
            var second = value0 % 40;
            var first = (value0 - second) / 40;
            if (first > 2)
		throw new SNMP.InvalidOID();
            oid = [first, second];
	}
	var n = 0;
	for(var i=1; i < value.length; i++) {
            n = (n<<7) + (value.charCodeAt(i) & 0x7f);
            if (value.charCodeAt(i) < 0x80) {
                oid.push(n);
                n = 0;
            }
	}
    }
    return oid;
};

/** Read snmp message and return SNMP.Message. */
SNMP.Reader.prototype.readMessage = function() {
    var rdr = this.readSequence();
    var version = rdr.readInteger();
    assert(version == SNMP.V1 || version == SNMP.V2C);
    var community = rdr.readOctetString();
    var pdu;
    var tuple = rdr.readTLV();
    var tag = tuple[0];
    var value = tuple[1];
    var rdr2 = new SNMP.Reader(value);
    switch(tag) {
    case SNMP.TAG_GETREQUEST_PDU:
    case SNMP.TAG_GETNEXTREQUEST_PDU:
    case SNMP.TAG_RESPONSE_PDU:
    case SNMP.TAG_SETREQUEST_PDU:
        pdu = rdr2.readPdu(tag);
	break;
    case SNMP.TAG_TRAPV1_PDU:
	assert(version == SNMP.V1);
        pdu = rdr2.readV1Trap();
	break;
    case SNMP.TAG_GETBULKREQUEST_PDU:
	assert(version == SNMP.V2C);
        pdu = rdr2.readPdu(tag);
	break;
    case SNMP.TAG_INFORMREQUEST_PDU:
	assert(version == SNMP.V2C);
        pdu = rdr2.readPdu(tag);
    case SNMP.TAG_TRAPV2_PDU:
	assert(version == SNMP.V2C);
        pdu = rdr2.readPdu(tag);
	break;
    default:
        assert(0);
    }
    return new SNMP.Message(version, community, pdu);
};

/** Read snmp v1 trap  and return SNMP.V1Trap. */
SNMP.Reader.prototype.readV1Trap = function() {
    var oid = this.readOID();
    var enterprise = new SNMP.OID(oid);
    var str = this.readIpAddress();
    var agent_addr = new SNMP.IpAddress(str);
    var generic_trap = this.readInteger();
    var specific_trap = this.readInteger();
    var timestamp = new SNMP.TimeTicks(this.readInteger());
    var vars = this.readVars();
    return new SNMP.V1Trap(enterprise, agent_addr, generic_trap, specific_trap, timestamp, vars);
};

/** Read pdu and return SNMP.PDU. */
SNMP.Reader.prototype.readPdu = function(tag) {
    assert(tag);
    var rqid = this.readInteger();
    var errstatus = this.readInteger();
    var errindex = this.readInteger();
    var vars = this.readVars();
    return new SNMP.Pdu(tag, rqid, vars, errstatus, errindex);
};

/** Read variables and return SNMP.Vars. */
SNMP.Reader.prototype.readVars = function() {
    var rdr = this.readSequence();
    var vars = [];
    while(true) {
	try {
	    var v = rdr.readVar();
	    //println("VAR: " + v);
	    vars.push(v);
	} catch(ex) {
	   QUACK(1, "SNMP.readVars", "exception " + ex.toString());
	   break;
	}
    }
    return new SNMP.Vars(vars);
};

/** Read a variable (name and valu) and return SNMP.Var. */
SNMP.Reader.prototype.readVar = function() {
    var rdr = this.readSequence();
    var oid = rdr.readOID();
    var name = new SNMP.OID(oid);
    var value = rdr.readVal();
    return new SNMP.Var(name, value);
};

/** Read a variable value and return the appropriate object. */
SNMP.Reader.prototype.readVal = function() {
    var tuple = this.readTLV();
    var tag = tuple[0];
    var value = tuple[1];
    switch(tag) {
    case SNMP.TAG_INTEGER:
	return new SNMP.Integer(this.v2i(value));
    case SNMP.TAG_OCTETSTRING:
	return new SNMP.OctetString(value);
    case SNMP.TAG_NULL:
	return SNMP.Null;
    case SNMP.TAG_OID:
	return new SNMP.OID(this.v2oid(value));
    case SNMP.TAG_IPADDRESS:
	return new SNMP.IpAddress(value);
    case SNMP.TAG_COUNTER32:
	return new SNMP.Counter32(this.v2i(value));
    case SNMP.TAG_GAUGE32:
	return new SNMP.Gauge32(this.v2i(value));
    case SNMP.TAG_TIMETICKS:
	return new SNMP.TimeTicks(this.v2u(value));
    case SNMP.TAG_OPAQUE:
	return new SNMP.Opaque(value);
    case SNMP.TAG_COUNTER64:
	return new SNMP.Counter64(this.v2i(value));
    case SNMP.TAG_NOSUCHOBJECT:
	return SNMP.NoSuchObject;
    case SNMP.TAG_NOSUCHINSTANCE:
	return SNMP.NoSuchInstance;
    case SNMP.TAG_ENDOFMIBVIEW:
	return SNMP.EndOfMibView;
    default:
	assert(0);
    }
    return null;
};






/**
 * Converts javascript objects into SNMP asn1 encoded entities.
 * @class
 */
SNMP.Generator = {
    /** Encode length. */
    encodeLength: function(length) {
	assert(length > 0);
	if (length < 0x80) {
            return String.fromCharCode(length);
	} else {
	    var data = this.i2b(length);
            return String.fromCharCode(data.length|0x80) + data;
	}
    },

    /** Encode integer. */
    encodeInteger: function(value, tag) {
	if (!tag) {
	    tag = SNMP.TAG_INTEGER;
	}
	var data;
	if (value > 0 && value < 0x80)
	    data = String.fromCharCode(value);
	else {
	    data = this.i2b(value);
            if (value > 0 && data.charCodeAt(0) > 0x7f) {
		data = "\000" + data;
	    } else if (value < 0 && data.charCodeAt(0) < 0x80) {
		data = "\377" + data;
	    }
	}
	return this.encodeTLV(tag, data);
    },

    /** Encode null. */
    encodeNull: function() {
	return String.fromCharCode(SNMP.TAG_NULL) + "\000";
    },

    /** Encode string. */
    encodeException: function(tag) {
	return String.fromCharCode(tag)  + "\000";
    },

    /** Return ccorrectly encoded string tag, length and data for given value data. */
    encodeTLV: function(tag, value) {
	var data = String.fromCharCode(tag) + this.encodeLength(value.length);
	data += value;
	return data;
    },

    /** Encode sequence where value is the encoded data of the sequence. */
    encodeSequence: function(value) {
	return this.encodeTLV(SNMP.TAG_SEQUENCE, value);
    },

    /** Encode oid string in . notation into tag, length, value bytes string. */
    encodeOID: function(value) {
	assert(value.length >= 1);
	assert(value[0] <= 2);
	var data = "";
	if (value.length == 1) {
	    data += String.fromCharCode(40*value[0]);
	} else if (value.length > 1) {
	    assert(value[1] <= 128, value);
	    data += String.fromCharCode(40*value[0] + value[1]);
	    for(var i = 2; i < value.length; i++) {
		if (value[i] < 0x80) {
		    data += String.fromCharCode(value[i]);
		} else {
		    var octets = "";
		    var n = value[i];
                    while(true) {
			octets = String.fromCharCode((n&0x7f)|0x80) + octets;
			n = n >> 7;
			if (n == 0) {
			    break;
			}
                    };
		    data += octets.substr(0, octets.length-1);
		    data += String.fromCharCode(octets.charCodeAt(octets.length-1)&0x7f);
		}
	    }
	}
	//QUACK(0, "OID: " + value + ", " + Formatter.binToHex(data));
	return this.encodeTLV(SNMP.TAG_OID, data);
    },

    /** @private */
    i2b: function(i) {
	assert(typeof(i) == "number");
	var done =  (i >= 0) ? 0 : -1;
	var octets = "";
	//println("i done: " + i + ", " + done);
	do {
	    octets = String.fromCharCode(i&0xff) + octets;
            i = i >> 8;
	    //println("i done: " + i + ", " + done);
	} while(i != done);
	return octets;
    }
};












/**
 * Encapsulates SNMP integers.
 *  @class 
 */
SNMP.Integer = function(val) {
    this.val = val;
};

/** Return asn1 type. */
SNMP.Integer.prototype.getAsn1Type = function() {
    return 'Integer';
};

/** Return string representation. */
SNMP.Integer.prototype.toString = function() {
    return 'Integer:' + this.val;
};

/** Encode this object. */
SNMP.Integer.prototype.encode = function() {
    return SNMP.Generator.encodeInteger(this.val);
};




/**
 * Encapsulates SNMP 32bit counters.
 *  @class 
 */
SNMP.Counter32 = function(val) {
    SNMP.Integer.call(this, val);
};

/** @private */
SNMP.Counter32.prototype = new SNMP.Integer();

/** Return string representation. */
SNMP.Counter32.prototype.encode = function() {
    return SNMP.Generator.encodeInteger(this.val, SNMP.TAG_COUNTER32);
};

/** Return asn1 type. */
SNMP.Counter32.prototype.getAsn1Type = function() {
    return 'Counter32';
};

/** Return string representation. */
SNMP.Counter32.prototype.toString = function() {
    return 'Counter32:' + this.val;
};




/**
 * Encapsulates SNMP 64bit counters.
 *  @class 
 */
SNMP.Counter64 = function(val) {
    SNMP.Integer.call(this, val);
};

/** @private */
SNMP.Counter64.prototype = new SNMP.Integer();

/** Encode this object. */
SNMP.Counter64.prototype.encode = function() {
    return SNMP.Generator.encodeInteger(this.val, SNMP.TAG_COUNTER64);
};

/** Return asn1 type. */
SNMP.Counter64.prototype.getAsn1Type = function() {
    return 'Counter64';
};

/** Return string representation. */
SNMP.Counter64.prototype.toString = function() {
    return 'Counter64:' + this.val;
};



/**
 * Encapsulates SNMP 32bit gauges.
 *  @class 
 */
SNMP.Gauge32 = function(val) {
    SNMP.Integer.call(this, val);
};

/** @private */
SNMP.Gauge32.prototype = new SNMP.Integer();

/** Encode this object. */
SNMP.Gauge32.prototype.encode = function() {
    return SNMP.Generator.encodeInteger(this.val, SNMP.TAG_GAUGE32);
};

/** Return asn1 type. */
SNMP.Gauge32.prototype.getAsn1Type = function() {
    return 'Gauge32';
};

/** Return string representation. */
SNMP.Gauge32.prototype.toString = function() {
    return 'Gauge32:' + this.val;
};





/**
 * Encapsulates SNMP 32bit unsigneds.
 *  @class 
 */
SNMP.Unsigned32 = function(val) {
    SNMP.Integer.call(this, val);
};

/** @private */
SNMP.Unsigned32.prototype = new SNMP.Integer();

/** Encode this object. */
SNMP.Unsigned32.prototype.encode = function() {
    return SNMP.Generator.encodeInteger(this.val, SNMP.TAG_UNSIGNED32);
};

/** Return asn1 type. */
SNMP.Unsigned32.prototype.getAsn1Type = function() {
    return 'Unsigned32';
};

/** Return string representation. */
SNMP.Unsigned32.prototype.toString = function() {
    return 'Unsigned32:' + this.val;
};



/**
 * Encapsulates SNMP timeticks.
 * @class 
 */
SNMP.TimeTicks = function(val) {
    SNMP.Integer.call(this, val);
};

/** @private */
SNMP.TimeTicks.prototype = new SNMP.Integer();

/** Encode this object. */
SNMP.TimeTicks.prototype.encode = function() {
    return SNMP.Generator.encodeInteger(this.val, SNMP.TAG_TIMETICKS);
};

/** Return asn1 type. */
SNMP.TimeTicks.prototype.getAsn1Type = function() {
    return 'TimeTicks';
};

/** Return string representation. */
SNMP.TimeTicks.prototype.toString = function() {
    return 'TimeTicks:' + this.val;
};




/**
* Encapsulates SNMP octet strings.
 * @class 
 * @param {String} val
 */
SNMP.OctetString = function(val) {
    this.val = val;
};

/** Return asn1 type. */
SNMP.OctetString.prototype.getAsn1Type = function() {
    return 'OctetString';
};

/** Encode this object. */
SNMP.OctetString.prototype.encode = function() {
    return SNMP.Generator.encodeTLV(SNMP.TAG_OCTETSTRING, this.val);
};

/** Return string representation. */
SNMP.OctetString.prototype.toString = function() {
    return 'OctetString:' + Formatter.binToHex(this.val);
};




/**
 * Encapsulates SNMP opaque data.
 * @class 
 */
SNMP.Opaque = function(val) {
    this.val = val;
};

/** Encode this object. */
SNMP.Opaque.prototype.encode = function() {
    return SNMP.Generator.encodeTLV(SNMP.TAG_OPAQUE, this.val);
};

/** Return asn1 type. */
SNMP.Opaque.prototype.getAsn1Type = function() {
    return 'Opaque';
};

/** Return string representation. */
SNMP.Opaque.prototype.toString = function() {
    return 'Opaque:' + Formatter.binToHex(this.val);
};





/**
 * Encapsulates SNMP opaque data.
 * @class 
 */
SNMP.OID = function(oid) {
    if (oid instanceof Array) {
	this.oid = oid;
    } else {
	assert(typeof(oid) == 'string');
	this.oid = oid.split('.').map(function(s) { return parseInt(s); });
    }
};

/** Return asn1 type. */
SNMP.OID.prototype.getAsn1Type = function() {
    return 'OID';
};

/** Encode this object. */
SNMP.OID.prototype.encode = function() {
    return SNMP.Generator.encodeOID(this.oid);
};

/** Return string representation. */
SNMP.OID.prototype.toString = function() {
    return 'OID:' + this.oid.join('.');
};

/** Compare two oids. */
SNMP.OID.prototype.isSubtreeOf = function(parent) {
    var poid = parent.oid;
    var toid = this.oid;
    if (poid.length > toid.length) {
	return false;
    }
    for (var i = 0; i < poid.length; i++) {
	if (poid[i] != toid[i]) {
	    return false;
	}
	return true;
    };
};

/** Compare two oids. */
SNMP.OID.prototype.equals = function(that) {
    if (this.oid.length!=that.oid.length) {
	return false;
    }
    for (var i = 0; i < this.oid.length; i++) {
	if (this.oid[i] != that.oid[i]) {
	    return false;
	}
    }
    return true;
};

// /** @private */
// SNMP.OID.prototype.index = function(parent) {
//     var poid = parent.oid;
//     var toid = this.oid;
//     assert(this.isSubtreeOf(parent));
//     assert(poid.length != toid.length);
//     return new SNMP.OID(toid.slice(poid.length));
// };







/**
 * Encapsulates SNMP ip address (4 bytes ipv4 address).
 * @class 
 */
SNMP.IpAddress = function(val) {
    this.val = val;
    if (this.val.length>4)
	this.val = this.parse(val);
    assert(this.val.length == 4);
};

/** Return asn1 type. */
SNMP.IpAddress.prototype.getAsn1Type = function() {
    return 'IpAddress';
};

/** Encode this object. */
SNMP.IpAddress.prototype.encode = function() {
    return SNMP.Generator.encodeTLV(SNMP.TAG_IPADDRESS, this.val);
};

/** Parse ip address from string in dot notation. */
SNMP.IpAddress.prototype.parse = function(s) {
    var parts = s.split(".");
    assert(parts.length==4);
    var ret = "";
    for (var i = 0; i < parts.length; i++) {
        var octet = parseInt(parts[i]);
	assert(octet<256 && octet>=0);
	ret += String.fromCharCode(octet);
    }
    return ret;
};

/** Return string representation. */
SNMP.IpAddress.prototype.toString = function() {
    return 'IpAddress:' + Formatter.binToHex(this.val);
};



/**
* Encapsulates SNMP null.
 * @class
 */
SNMP.Null = {
    /** Return asn1 type. */
    getAsn1Type: function() {
	return 'Null';
    },
    /** Encode this object. */
    encode: function() {
	return SNMP.Generator.encodeNull();
    },
    /** Return string representation. */
    toString: function() {
	return this.getAsn1Type();
    }
};




/**
 * Encapsulates SNMP error.
 * @class
 */
SNMP.NoSuchObject = {
    /** Return asn1 type. */
    getAsn1Type: function() {
	return 'NoSuchObject';
    },
    /** Encode this object. */
    encode: function() {
	return SNMP.Generator.encodeException(SNMP.TAG_NOSUCHOBJECT);
    },
    /** Return string representation. */
    toString: function() {
	return this.getAsn1Type();
    }
};


/**
 * Encapsulates SNMP error.
 * @class 
 */
SNMP.NoSuchInstance = {
    /** Return asn1 type. */
    getAsn1Type: function() {
	return 'NoSuchInstance';
    },
    /** Encode this object. */
    encode: function() {
	return SNMP.Generator.encodeException(SNMP.TAG_NOSUCHINSTANCE);
    },
    /** Return string representation. */
    toString: function() {
	return this.getAsn1Type();
    }
};





/**
 * Encapsulates end of mib view.
 * @class 
 */
SNMP.EndOfMibView = {
     /** Return asn1 type. */
    getAsn1Type: function() {
	return 'EndOfMibView';
    },
    /** Encode this object. */
    encode: function() {
	return SNMP.Generator.encodeException(SNMP.TAG_ENDOFMIBVIEW);
    },
    /** Return string representation. */
    toString: function() {
	return this.getAsn1Type();
    }
};






/**
 * Encapsulates a SNMP variable.
 * @class 
 */
SNMP.Var = function(name, value) {
    if (typeof(name) == 'string') {
	name = new SNMP.OID(name);
    } else if (name instanceof Array) {
	name = new SNMP.OID(name);
    }
    this.name = name;
    assert(this.name.encode);
    this.value = value ? value : SNMP.Null;
};

/** Return asn1 type. */
SNMP.Var.prototype.getAsn1Type = function() {
    return 'Var';
};

/** Encode this object. */
SNMP.Var.prototype.encode = function() {
    var d = this.name.encode() + this.value.encode();
    return SNMP.Generator.encodeSequence(d);
};

/** Return string representation. */
SNMP.Var.prototype.toString = function() {
    return this.name.toString() + "|" + this.value;
};



/**
 * Encapsulates a SNMP variables.
 * @class 
 */
SNMP.Vars = function(vars) {
    /** Array of SNMP.Var's. */
    this.vars = [];
    if (vars) {
	for (var i = 0; i < vars.length; i++) {
	    this.addVar(vars[i]);
	}
    }
};

/** Return SNMP.Var */
SNMP.Vars.prototype.getVar = function(idx) {
    return this.vars[idx];
};

/** Return contained SNMP.Var's */
SNMP.Vars.prototype.getVars = function(idx) {
    return this.vars;
};

/** Add SNMP.Var */
SNMP.Vars.prototype.addVar = function(v) {
    if (typeof(v) == 'string') {
	v = new SNMP.Var(v);
    }
    this.vars.push(v);
};

/** Return asn1 type. */
SNMP.Vars.prototype.getAsn1Type = function() {
    return 'Vars';
};

/** Encode this object. */
SNMP.Vars.prototype.encode = function() {
    var data = "";
    for (var i = 0; i < this.vars.length; i++) {
	data += this.vars[i].encode();
    }
    return SNMP.Generator.encodeSequence(data);
};

/** Return string representation. */
SNMP.Vars.prototype.toString = function() {
    var data = "";
    for (var i = 0; i < this.vars.length; i++) {
	if (i != 0) {
	    data += ", ";
	}
	data += this.vars[i].toString();
    }
    return data;
};





/**
 * Encapsulates a SNMP message.
 * @class 
 */
SNMP.Message = function(version, community, pdu) {
    this.version = version;
    this.community = community;
    this.pdu = pdu;
    assert(version == SNMP.V1 || version == SNMP.V2C);
};

/** Encode this object. */
SNMP.Message.prototype.encode = function() {
    var data = SNMP.Generator.encodeInteger(this.version);
    data += SNMP.Generator.encodeTLV(SNMP.TAG_OCTETSTRING, this.community);
    data += this.pdu.encode();
    return SNMP.Generator.encodeSequence(data);
};

/** Return string representation. */
SNMP.Message.prototype.toString = function() {
    return "Message: " + this.version + ", " + this.community + ", " + this.pdu.toString();
};





/**
 * Encapsulates a SNMP pdu.
 * @class 
 * @param tag
 * @param rqid
 * @param errstatus   = non repeaters in case of TAG_GETBULKREQUEST_PDU
 * @param errindex    = or repetitions in case of TAG_GETBULKREQUEST_PDU
 */
SNMP.Pdu = function(tag, rqid, vars, errstatus, errindex) {
    this.tag = tag;
    this.rqid = rqid;
    this.vars = vars;
    this.errstatus = errstatus ? errstatus : 0;
    this.errindex = errindex ? errindex : 0;
};

/** Encode this object. */
SNMP.Pdu.prototype.encode = function() {
    var data = SNMP.Generator.encodeInteger(this.rqid);
    data += SNMP.Generator.encodeInteger(this.errstatus);
    data += SNMP.Generator.encodeInteger(this.errindex);
    data += this.vars.encode();
    return SNMP.Generator.encodeTLV(this.tag, data);
};

/** Return string representation. */
SNMP.Pdu.prototype.toString = function() {
    return "Pdu: tag " + this.tag.toString(16) + ", rqid " + this.rqid + ", es " + this.errstatus + ", ei " + this.errindex + ", vars " + this.vars;
};






/**
 * Encapsulates a SNMP v1 trap.
 * @class 
 * @param {SNMP.OID} enterprise
 * @param {SNMP.IpAddress} agent_addr
 * @param {Number} generic_trap
 * @param {Number} specific_trap
 * @param {SNMP.TimeTicks} timestamp
 * @param {SNMP.Vars} vars
 */
SNMP.V1Trap = function(enterprise, agent_addr, generic_trap, specific_trap, timestamp, vars) {
    assert(enterprise && (enterprise instanceof SNMP.OID));
    assert(agent_addr);
    assert(generic_trap!=null);
    assert(specific_trap!=undefined);
    assert(timestamp instanceof SNMP.TimeTicks);
    assert(vars);
    this.enterprise = enterprise;
    this.agent_addr = agent_addr;
    this.generic_trap = generic_trap;
    this.specific_trap = specific_trap;
    this.timestamp = timestamp;
    this.vars = vars;
};

/** Encode this object. */
SNMP.V1Trap.prototype.encode = function() {
    var data = this.enterprise.encode() + this.agent_addr.encode() + SNMP.Generator.encodeInteger(this.generic_trap) + SNMP.Generator.encodeInteger(this.specific_trap) + this.timestamp.encode() + this.vars.encode();
    return SNMP.Generator.encodeTLV(SNMP.TAG_TRAPV1_PDU, data);
};






/**
 * Handles and stores results of SNMP commands.
 * Commands exchanged with SNMP agent.
 * The source and data property of AOP.OK objects in SNMP.Socket.exchange are of type SNMP.Command.
 * @class
 */
SNMP.Command = function(socket, rqid, message, bytes, callback) {
    /** The SNMP.Socket */
    this.socket = socket;
    /** The request id Number. */
    this.rqid = rqid;
    /** The input SNMP.Message. */
    this.message = message;
    /** The encoded bytes of the input message. */
    this.bytes = bytes;
    /** Function to call on response. */
    this.callback = callback;
    /** The SNMP.Message response. */
    this.response = null;
    /** @private */
    this.counter = 0;
};

/** @private */
SNMP.Command.prototype = {};

/**
 * @private
 */
SNMP.Command.prototype.send = function() {
    this.timer = Timer.timeoutIn(this.socket.timeout, this.onTimeout.bind(this), this);
    this.counter += 1;
    this.socket.send(this.bytes);
};

/**
 * @private
 */
SNMP.Command.prototype.onTimeout = function() {
    this.timer = null;
    if (this.counter == this.socket.retries) {
	this.close(ERR_TIMEOUT, "timeout");
    } else {
	this.send();
    }
};

/**
 * @private
 */
SNMP.Command.prototype.recv = function(response) {
    assert(this.message.pdu.rqid == response.pdu.rqid);
    this.response = response;
    this.close(0, this);
};

/**
 * @private
 */
SNMP.Command.prototype.close = function(code, data) {
    if (this.timer) {
	Timer.remove(this.timer);
	this.timer = null;
    }
    this.socket.remove(this.rqid);

    var result = (code == 0) ? new AOP.OK(data) : new AOP.ERR(code, "SNMP-command failed: " + data);
    this.callback(result);
};

/**
 * @private
 */
SNMP.Command.prototype.toString = function(response) {
    var s = this.message.toString();
    if (this.response) {
	s += " <--> " + this.response.toString();
    }
    return s;
};






/**
 * Constructor. Sends/Receive snmp packets on an udp socket. Supports retransmissions.
 *  @class 
 */
SNMP.Socket = function(config, callback) {
    this.dstaddr = null;
    this.dstport = null;
    this.community = null;
    this.version = null;
    this.timeout = null;
    this.retries = null;
    this.socket = null;
    this.rqid = 0x10000001;
    this.commands = {};
};

/** 
 * Initialize the SNMP manager.
 * The parameter config may contain:
 * <ul>
 * <li>dstaddr: ip address in dot notation</li>
 * <li>dstport: port, by default 5000</li>
 * <li>community: community name, by default public</li>
 * <li>version: by default, SNMP.V2C</li>
 * <li>timeout: in milliseconds</li>
 * <li>retries: number of retries, by default 5</li>
 * </ul>
 * @param config configuration options
 * @param callback
 * @returns {Object} this
 */
SNMP.Socket.prototype.init = function(/** Object */config, callback) {
    config = config ? config : {};
    this.dstaddr = config.dstaddr ? config.dstaddr : '127.0.0.1';
    this.dstport = config.dstport ? config.dstport : 161;
    this.community = config.community ? config.community : 'public';
    this.version = config.version ? config.version : SNMP.V2C;
    this.timeout = config.timeout ? config.timeout : 1 * 1000;
    this.retries = config.retries ? config.retries : 5;
    var _this = this;
    this.socket = new IO.UDPSocket();
    this.socket.open(0, BLCK);
    /** @private */
    this.socket.onBlob = function(blob) {
	//println("Manager.onBlob: " + Util.formatData(blob));
	//println(Formatter.genHexTable(blob.data));
	var rdr = new SNMP.Reader(blob.data);
	var msg = rdr.readMessage();
	//println("Manager.onBlob: " + msg.toString());
	//println("Manager.onBlob: " + msg.pdu.rqid);
	assert(msg.pdu.tag == SNMP.TAG_RESPONSE_PDU);
	var rqid = msg.pdu.rqid;
	if (_this.commands[rqid]) {
	    _this.commands[rqid].recv(msg);
	}
    };
    return this;
};

/** Exchange message with snmp agent. */
SNMP.Socket.prototype.exchange = function(message, callback) {
    var rqid = this.rqid;
    message.pdu.rqid = rqid;
    this.rqid += 1;
    //println("Manager.exchange: " + message);
    var bytes = message.encode();
    //println(Formatter.genHexTable(bytes));
    var cmd = new SNMP.Command(this, rqid, message, bytes, callback);
    this.commands[rqid] = cmd;
    cmd.send();
};

/**  @private */
SNMP.Socket.prototype.send = function(bytes) {
    this.socket.send(bytes, this.dstaddr, this.dstport);
};

/**  @private */
SNMP.Socket.prototype.remove = function(rqid) {
    delete this.commands[rqid];
};

















