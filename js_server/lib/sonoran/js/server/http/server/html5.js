//  (C) COPYRIGHT INTERNATIONAL BUSINESS MACHINES CORPORATION 2006-2010
//                       ALL RIGHTS RESERVED
//        IBM Research Division, Zurich Research Laboratory
// --------------------------------------------------------------------

/**
 * Provides a web socket implementation.
 * @namespace HTML5 
 */
HTML5 = {};

/**
 * Upgrade a connection of a controller request to a HTML5 web socket.
 * @param {HTTP.Request} request
 * @returns {HTML5.Socket} the persistent web socket connection or null if request failed
 */
HTML5.upgradeConnection = function(request) {
    assert(request instanceof HTTP.Request);
    var props = request.properties;
    var draftietfhybithewebsocketprotocol00 = false;


    var s = props['Upgrade'];
    if (!s) {
	request.respondBadRequest();
	return null;
    }
    if (s.toLowerCase() !== "websocket") {
	request.respondBadRequest();
	return null;
    }

    var origin = props['Sec-WebSocket-Origin'];
    if (!origin) {
	origin = props['Origin'];
    }
    var location;
    if (origin) {
	location = origin.replace(/^http/, "ws");
	location += request.uri;
    }
    
    var protocols = props['Sec-WebSocket-Protocol'];
    //assert(protocols);

    var sa = [];
    sa.push("HTTP/1.1 101 Switching Protocols");
    sa.push("Upgrade: websocket");
    sa.push("Connection: Upgrade");
    if (origin) {
	sa.push('Sec-WebSocket-Origin: ' + origin);
    }
    if (location) {
	sa.push('Sec-WebSocket-Location: ' + location);
    }
    var txt;

    var key1 = props['Sec-WebSocket-Key1'];
    if (key1) {
	draftietfhybithewebsocketprotocol00 = true;

	var key2 = props['Sec-WebSocket-Key2'];
	if (!key2) {
	    request.respondBadRequest();
	    return null;
	}
	//QUACK(0, "KEY1: " + key1);
	//QUACK(0, "KEY2: " + key2);
	//QUACK(0, sprintf("BODY: %H", request.body));
	if (!request.body || request.body.length!==8) {
	    request.respondBadRequest();
	    return null;
	}

	var numkey1 = parseInt(key1.replace(/[^\d]/g, ''), 10);
        var numkey2 = parseInt(key2.replace(/[^\d]/g, ''), 10);
        var spaces1 = key1.replace(/[^\ ]/g, '').length;
        var spaces2 = key2.replace(/[^\ ]/g, '').length;
	
	if (spaces1 === 0 || spaces2 === 0 || numkey1 % spaces1 !== 0 || numkey2 % spaces2 !== 0) {
	    request.respondBadRequest();
	    return null;
	}
	//QUACK(0, "NUM+SPACES: " + numkey1 + ", " + spaces1 + ", " + numkey2 + ", " + spaces2);
	numkey1 = parseInt(numkey1/spaces1);
	numkey2 = parseInt(numkey2/spaces2);
	//QUACK(0, "NUM+SPACES: " + numkey1 + ", " + spaces1 + ", " + numkey2 + ", " + spaces2);

	var bytes = Formatter.pack("4u4u", numkey1, numkey2) + request.body;
	s = Clic.md5_s2s(bytes);
	txt = sa.join("\r\n") + "\r\n\r\n" + s;

    } else {


	var version = props['Sec-WebSocket-Version'];
	if (!version || ((version !== "8") && (version !== "13"))) {
	    request.respondBadRequest("Sec-WebSocket-Version: 13, 8");
	    return null;
	}

	var key = props['Sec-WebSocket-Key'];
	if (!key) {
	    request.respondBadRequest();
	    return null;
	}

	s = key + "258EAFA5-E914-47DA-95CA-C5AB0DC85B11";
	s = Clic.sha1_s2b64(s);

	sa.push("Sec-WebSocket-Accept: " + s);
	txt = sa.join("\r\n") + "\r\n\r\n";
    }

    request.respondRaw(101, txt);

    var connection = request.connection;
    return new HTML5.Socket(connection.server, connection.sock, draftietfhybithewebsocketprotocol00);
};






/**
 * HTML5.Socket represents a web socket. Returned by HTML5.upgradeConnection. </br>
 * @class
 * @constructor
 * @param server  The server of this connection
 * @param sock    TCP socket
 * @param draftietfhybithewebsocketprotocol00
 */
HTML5.Socket = function(/** HTTP.Server */server, /** TCP.Socket */sock, /** Boolean */draftietfhybithewebsocketprotocol00) { 
    this.server = server;
    this.sock = sock;
    //this.receiver = null;
    this.buf = new DataBuffer(16384);
    this.draftietfhybithewebsocketprotocol00 = draftietfhybithewebsocketprotocol00;
    var _this = this;
    this.sock.onClose = function(status) {
        QUACK(1, "HTML5.Socket closed: " + _this.sock);
	_this.close();
    };
    this.sock.onBlob = function(blob) {
	assert(blob.data instanceof U8Array);
	//QUACK(0, sprintf("DATA: %d", blob.data.length));
	_this.buf.appendU8Array(blob.data);

	//QUACK(0, sprintf("DATA:\n%s", _this.buf));
	var buf = _this.buf;

	if (_this.draftietfhybithewebsocketprotocol00) {
	    while(true) {
		if (buf.getLength() < 2) {
		    break;
		}
		var start = 0;
		if (buf.getAt(start) !== 0) {
		    _this.close();
		    return;
		}
		start += 1;
		var end = start;
		while(true) {
		    if (end === buf.getLength()) {  // need more data
			return;
		    }
		    var c = buf.getAt(end);
		    if (c === 0xff) {
			break;
		    }
		    end += 1;
		}
		var payload = buf.getBuffer(start, end-len);
		buf.setOff(end + 1);
		//_this.session.access();		
		
		_this.onText(1, payload);
	    }

	    //if (buf.getLength() === 0) {
	    //	_this.buf = null;
	    //} else {
	    buf.reshift();
	    //}
	    return;
	}

	while(true) {
	    if (buf.getLength() < 2) {
		break;
	    }
 	    var b = buf.charCodeAt(0);
	    var fin = b&0x80;
	    var opc = b&0xf;
	    b = buf.charCodeAt(1);
	    var mask = b&0x80;
	    var len1 = b&0x7f;
	    //QUACK(0, sprintf("HDR: buf len %d, opc %s, fin %d, mask %d, len1 %d", buf.getLength(), HTML5.Socket.OPCODES[opc], fin, mask, len1));
	    var pos = 2;
	    var len = len1;
	    if (len1===126) {
		if (buf.getLength() < 4) {
		    break;
		}
		len = ((buf.getAt(2)&0xff)<<8) + (buf.getAt(3)&0xff);
		pos = 4;
	    } else if (len1===127) {
		if (buf.getLength() < 10) {
		    break;
		}
		// XXX: TODOXX
		var arr = Formatter.unpack("8uB", buf, 2);
		len = arr[0];
		pos = 10;
	    }
	    
	    //QUACK(0, sprintf("RQ: buf len %d, buf 0ff %d, pckt len %d, len1 %d, pos %d", buf.getLength(), buf.off, len, len1, pos));
	    
	    if (mask) {
		if (buf.getLength() < pos + 4) {
		    break;
		}
		mask = new U8Array(4);
		for (var j = pos; j < pos+4; j++) {
		    mask[j - pos] = buf.charCodeAt(j)&0xff;
		}
		pos += 4;
	    }
	    
	    if (buf.getLength() < pos + len) {
		//QUACK(0, "Missing data..");
		break;
	    }
	    
	    if (mask) {
		//QUACK(0, "MASKING: " + (buf.getLength() - pos));
 		var i = pos;
		while(true) {
		    if (i >= (pos + len)) {
			break;
		    }
		    var j = (i-pos)%4;
		    var c = (buf.charCodeAt(i)&0xff) ^ mask[j];
		    buf.setAt(i, c);
		    i += 1;
		}
	    } 
	    
	    
	    var payload = buf.getBuffer(pos, len);
	    //QUACK(0, buf.toString());
	    //QUACK(0, sprintf("PAYLOAD:\n" + payload));
	    
	    buf.setOff(pos + len);

	    //QUACK(0, "After setOff: " + buf.off + ", " + buf.len);
	    //QUACK(0, buf.toString());

	    switch(opc) {
	    case 1:
		_this.onText(fin, payload);
		break;
	    case 2:
		_this.onBinary(fin, payload);
		break;
	    case 8:
		_this.close(1002, payload);
		break;
	    default:
		var msg = sprintf("HTML5.Socket: received unsupported opcode %d in %H", opc, buf);
		QUACK(0, msg);
		assert(false, msg);
	    }
	}

	buf.reshift();
    };
};



HTML5.Socket.prototype = {
    /**
     * @type HTTP.Server
     * @private
     */
    server: null,

    /**
     * @type TCP.Socket
     * @private
     */
    sock: null,

    /**
     * @type IO.DataBuffer
     * @private
     */
    buf: null,
    

    /**
     * Send data to client.
     * @param opc   HTML5.Socket.OPC_TEXT etc.
     * @param data  If not a string, JSON.stringify is called on it
     */
    send: function(/** Number */opc, /** String|Object */data) {
	if (typeof(data) !== 'string') {
	    assert(opc === HTML5.Socket.OPC_TEXT);
	    data = JSON2.stringify(data);
	} 
	var frame;

	if (this.draftietfhybithewebsocketprotocol00) {

	    frame = String.fromCharCode(0) + data + String.fromCharCode(0xff);

	} else {

	    if (data.length >= 126 && data.length < 65536) {
		frame = Formatter.pack("1u1u2u", 0x80|opc, 126, data.length);
	    } else if (data.length >= 65536) {
		assert(data.length < 1024 * 1024 * 10);
		frame = Formatter.pack("1u1u4u4u", (0x80|opc), 127, 0, data.length);
	    } else {
		frame = Formatter.pack("1u1u", 0x80|opc, data.length);
	    }
	    frame += data;	

	}

	try {
	    this.sock.send(frame);
	} catch(ex) {
	    QUACK(1, Runtime.dumpException(ex, "Web socket send failed"));
	    this.close(1002);
	}
    },

    /**
     * Close this socket. 
     * @param code    If 'undefined', 1002
     * @param payload Optional, incoming packet which led to this close operation
     */
    close: function(/** Number */code, /** IO.DataBuffer */payload) {
	if (!code) {
	    code = 1002;
	}
	//QUACK(0, sprintf("HTML5.Socket.close(): code %d", code));
	if (this.sock.isAlive()) {
	    this.send(HTML5.Socket.OPC_CLOSE, Formatter.pack("2u", code)); 
	    this.sock.close(new AOP.OK(), function(status) {});
	}
	this.onClose(payload);
    },

    /**
     * Text was received on web socket. This function uses JSON.parse to create
     * a Javascript object and invokes onJson.
     * @param fin   FIN bit in http5 web socket frame indicating last packet
     * @param buf  The received data
     */
    onText: function(/** Number */fin, /** DataBuffer */buf) {
	assert(buf instanceof DataBuffer);
	try {
	    var obj = buf.toJson();
	    this.onJson(obj);
	} catch(ex) {
	    printf("HTML5.Socket: could not parse JSON string: %s\n'%s'\n", ex, buf);
	}
    },

    /**
     * Binary data was received on web socket.
     * @param fin   FIN bit in http5 web socket frame indicating last packet
     * @param buf  The received data
     */
    onBinary: function(/** Number */fin, /** DataBuffer */buf) {},

     /**
     * Incoming JSON text was parsed and object forwarded to this function.
     * @param obj The received object
     */
    onJson: function(/** Object */obj) {},
    
    /** 
     * Connection was closed.
     * @param data Optional, packet which led to close
     */
    onClose: function(data) {}
};


/**
 * @type Number
 * @constant
 */
HTML5.Socket.OPC_TEXT = 1;

/**
 * @type Number
 * @constant
 */
HTML5.Socket.OPC_BINARY = 2;

/**
 * @type Number
 * @constant
 */
HTML5.Socket.OPC_CLOSE = 8;

/**
 * @type Number
 * @constant
 */
HTML5.Socket.OPCODES = [
    "RESERVED",
    "TEXT",
    "BINARY",
    "RESERVED",
    "RESERVED",
    "RESERVED",
    "RESERVED",
    "RESERVED",
    "CLOSE",
    "PING",
    "PONG"
];


