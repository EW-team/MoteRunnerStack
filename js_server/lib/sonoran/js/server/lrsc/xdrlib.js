// updated by: make -C ~lrsc/src/xdrc



// =========================================================
// ------------------- DO NOT MODIFY -----------------------
// --------------- This is a copy of: xdrlib.js
// ------- Only modify the original source file! -----------
// ---------------------------------------------------------
// =========================================================




















var XDR = {};
XDR.ENCODER = {};
XDR.DECODER = {};

// For quick conversion of 0..255 numbers to single char strings
XDR.bytes = (function () {
    var bytes = [];
    for( var i=0; i<256; i++ )
	bytes.push(String.fromCharCode(i));
    return bytes;
})();
// For quick conversion of 0..255 numbers to 2-hex digit strings
XDR.hexbytes = (function () {
    var s = "0123456789ABCDEF";
    var hexbytes = [];
    for( var i=0; i<256; i++ )
	hexbytes.push(s.charAt((i>>4)&0xF)+s.charAt(i&0xF));
    return hexbytes;
})();


XDR.ENCODER = function (dlen) {
    this.wpos = 0;
    this.dlen = dlen;
    this.data = [];
}

XDR.ENCODER.prototype = {
    getData: function () {
	var d = this.data.join("");
	if( d.length > this.dlen )
	    throw this;
	return d;
    },

    // Binary string
    encodeBin: function (v, n) {
	this.wpos += n;
	if( v != null ) {
	    if( v.length > n ) {
		this.data.push(v.substr(0,n));
		return;
	    }
	    this.data.push(v);
	    if( (n -= v.length) == 0 )
		return;
	}
	while( --n >= 0 )
	    this.data.push(XDR.bytes[0]);
    },
    
    encodeInt: function (v, n) {
	this.wpos += n;
	if( !v ) {  // covers 0 and null/undefined
	    while( --n >= 0 )
		this.data.push(XDR.bytes[0]);
	    return;
	}
	while( n > 0 ) {
	    this.data.push(XDR.bytes[v & 0xFF]);
	    v /= 256;
	    n--;
	}
    },

    skip: function (n) {
	this.wpos += n;
	while( --n >= 0 )
	    this.data.push(XDR.bytes[0]);
    },
    
    align: function (n) {
	var r = this.wpos & (n-1);
	if( r ) {
	    this.wpos += r = n-r;
	    switch(r) {
	    case 7: this.data.push(XDR.bytes[0]);
	    case 6: this.data.push(XDR.bytes[0]);
	    case 5: this.data.push(XDR.bytes[0]);
	    case 4: this.data.push(XDR.bytes[0]);
	    case 3: this.data.push(XDR.bytes[0]);
	    case 2: this.data.push(XDR.bytes[0]);
	    case 1: this.data.push(XDR.bytes[0]);
	    }
	}
    },

    encodeArray: function (array, minsz, maxsz, func) {
	if( !array ) {
	    for( var i=0; i<minsz; i++ )
		func(this, null);
	    return;
	}
	var n = array.length;
	if( n < minsz || n > maxsz )
	    throw enc;
	if( func == XDR.u1.encode && typeof(array) == 'string' ) {
	    //array = XDR.string2u1array(array);
	    // faster...
	    this.wpos += n;
	    this.data.push(array);
	    return;
	}
	for( var i=0; i<n; i++ )
	    func(this, array[i]);
    },

    encode: function (msg) {
	eval(XDR.msgid[msg.$msgid]).encode(this,msg);
    }
}


XDR.DECODER = function (data, dlen) {
    this.rpos = 0;
    this.dlen = dlen||(data?data.length:0);
    this.data = data;
}

XDR.DECODER.prototype = {
    // Binary string
    decodeBin: function (n) {
	var off = this.rpos += n;
	if( off > this.dlen )
	    throw this;
	return this.data.substr(off-n,n)
    },
    
    decodeInt: function (signed, n) {
	var off = this.rpos += n;
	if( off > this.dlen )
	    throw this;
	var value = this.data.charCodeAt(off-1) & 0xFF;
	if( signed && value >= 128 )
	    value = -1 * 256 + value;
	for( var i=2; i<=n; i++ )
	    value = value*256 + (this.data.charCodeAt(off-i) & 0xFF);
	return value;
    },

    decodeCheck: function (n) {
	if( this.rpos+n > this.dlen )
	    throw this;
    },
    
    skip: function (n) {
	this.rpos += n;
	if( this.rpos > this.dlen )
	    throw this;
    },
    
    align: function (n) {
	this.rpos = (this.rpos + n - 1) & ~(n - 1);
	if( this.rpos > this.dlen )
	    throw this;
    },

    // Array of variable sized elements
    decodeArray2: function (array, minsz, maxsz, fixSize, func) {
	var n = array.length;
	if( n < minsz || n > maxsz )
	    throw this;
	for( var i=0; i<n; i++ ) {
	    this.decodeCheck(fixSize);
	    array[i] = func(this);
	}
    },


    // Array of fixed sized elements
    decodeArray: function (array, minsz, maxsz, fixSize, func) {
	var n = array.length;
	if( n < minsz || n > maxsz )
	    throw this;
	this.decodeCheck(fixSize*n);
	for( var i=0; i<n; i++ )
	    array[i] = func(this);
    },
    
    decode: function (msgid) {
	var qn = eval(XDR.msgid[msgid]);
	this.decodeCheck(qn.decodeSize);
	var m = qn.decode(this);
	m.$msgid = msgid;
	return m;
    }
}


XDR.u1array2string = function (a) {
    var a2 = new Array(a.length);
    for( var i=0; i<a.length; i++ )
	a2[i] = XDR.bytes[(a[i]||0)&0xFF];
    return a2.join("");
}


XDR.string2u1array = function (s, pos1, pos2) {
    if( pos2 == null ) {
	if( pos1 == null ) {
	    pos1 = 0;
	    pos2 = s.length;
	} else {
	    pos2 = pos1;
	    pos1 = 0;
	}
    }
    var a = [];
    while( pos1 < pos2 )
	a.push(s.charCodeAt(pos1++)&0xFF);
    return a;
}


XDR.encodedSize = function (msg) {
    return eval(XDR.msgid[msg.$msgid]).encodedSize(msg);
}


XDR.makeMsg = function (msgid) {
    var qn = XDR.msgid[msgid];
    if( !qn ) return null;
    // XXX: have CTOR to make all fields?
    return { $msgid:msgid };
}


XDR.addToNamespace = function (path, obj) {
    var ns = XDR.makeNamespace(path);
    for( var key in obj )
	ns[key] = obj[key];
    return ns;
}

XDR.makeNamespace = function (path) {
    var ns = GLOBAL_CONTEXT;
    if( path ) {
	path = path.split('.');
	while( path.length > 0 ) {
	    var p = path.shift();
	    if( p in ns ) {
		ns = ns[p];
	    } else {
		ns = ns[p] = {};
	    }
	}
    }
    return ns;
}

XDR.u1 = { encode:function(E,v){ E.encodeInt(v,1);}, decode:function (D){ return D.decodeInt(0,1);}, encodedSize:function(v) { return 1; } }
XDR.s1 = { encode:function(E,v){ E.encodeInt(v,1);}, decode:function (D){ return D.decodeInt(1,1);}, encodedSize:function(v) { return 1; } }
XDR.u2 = { encode:function(E,v){ E.encodeInt(v,2);}, decode:function (D){ return D.decodeInt(0,2);}, encodedSize:function(v) { return 2; } }
XDR.s2 = { encode:function(E,v){ E.encodeInt(v,2);}, decode:function (D){ return D.decodeInt(1,2);}, encodedSize:function(v) { return 2; } }
XDR.u4 = { encode:function(E,v){ E.encodeInt(v,4);}, decode:function (D){ return D.decodeInt(0,4);}, encodedSize:function(v) { return 4; } }
XDR.s4 = { encode:function(E,v){ E.encodeInt(v,4);}, decode:function (D){ return D.decodeInt(1,4);}, encodedSize:function(v) { return 4; } }
XDR.u8 = {
    encode:     function (E,v){ E[typeof(v) == 'string' ? 'encodeBin' : 'encodeInt'](v,8); },
    decode:     function (D)  { return D.decodeBin(  8);},
    encodedSize:function (v)  { return 8; }
}
XDR.s8 = XDR.u8;


XDR.encodeEUI = function (cenv, obj) {
    if( obj == null )
	return "\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000";
    
    if( !obj.match(/^[0-9a-fA-F][0-9a-fA-F](-[0-9a-fA-F][0-9a-fA-F]){7}/) &&
	!obj.match(/^[0-9a-fA-F][0-9a-fA-F](:[0-9a-fA-F][0-9a-fA-F]){7}/) )
	throw cenv;  // Encoding error
    
    var hex2bin = function (chr) {
	return chr >= 0x41 && chr <= 0x46 ? chr-0x37
	    :  chr >= 0x61 && chr <= 0x66 ? chr-0x57
	    : /*chr >= 0x30 && chr <= 0x39*/ chr-0x30;
    }
    return (XDR.bytes[(hex2bin(obj.charCodeAt(21))<<4) + hex2bin(obj.charCodeAt(22))] +
	    XDR.bytes[(hex2bin(obj.charCodeAt(18))<<4) + hex2bin(obj.charCodeAt(19))] +
	    XDR.bytes[(hex2bin(obj.charCodeAt(15))<<4) + hex2bin(obj.charCodeAt(16))] +
	    XDR.bytes[(hex2bin(obj.charCodeAt(12))<<4) + hex2bin(obj.charCodeAt(13))] +
	    XDR.bytes[(hex2bin(obj.charCodeAt( 9))<<4) + hex2bin(obj.charCodeAt(10))] +
	    XDR.bytes[(hex2bin(obj.charCodeAt( 6))<<4) + hex2bin(obj.charCodeAt( 7))] +
	    XDR.bytes[(hex2bin(obj.charCodeAt( 3))<<4) + hex2bin(obj.charCodeAt( 4))] +
	    XDR.bytes[(hex2bin(obj.charCodeAt( 0))<<4) + hex2bin(obj.charCodeAt( 1))] );
}


XDR.decodeEUI = function (cenv, obj) {
    return (XDR.hexbytes[obj.charCodeAt(7)&0xFF] + '-' +
	    XDR.hexbytes[obj.charCodeAt(6)&0xFF] + '-' +
	    XDR.hexbytes[obj.charCodeAt(5)&0xFF] + '-' +
	    XDR.hexbytes[obj.charCodeAt(4)&0xFF] + '-' +
	    XDR.hexbytes[obj.charCodeAt(3)&0xFF] + '-' +
	    XDR.hexbytes[obj.charCodeAt(2)&0xFF] + '-' +
	    XDR.hexbytes[obj.charCodeAt(1)&0xFF] + '-' +
	    XDR.hexbytes[obj.charCodeAt(0)&0xFF] );
}


XDR.encodeUstime = function (cenv, obj) {
    var v = obj==null ? 0 : typeof(obj)=='number' ? obj : obj.getTime()*1000;
    var a = [];
    for( var i=0; i<8; i++ ) {
	a[i] = XDR.bytes[0|(v%256)];
	v /= 256;
    }
    return a.join("");
}


XDR.decodeUstime = function (cenv, obj) {
    var v = 0;
    for( var i=7; i>=0; i-- )
	v = v*256 + (obj.charCodeAt(i)&0xFF);
    return new Date(v/1000);
}
