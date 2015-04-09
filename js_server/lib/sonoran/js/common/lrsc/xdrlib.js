



// =========================================================
// ------------------- DO NOT MODIFY -----------------------
// --------------- This is a copy of: xdrlib.js
// ------- Only modify the original source file! -----------
// ---------------------------------------------------------
// =========================================================




















var XDR = {};
XDR.ENCODER = {};
XDR.DECODER = {};
XDR.bytes = (function () {
    var bytes = [];
    for( var i=0; i<256; i++ )
	bytes.push(String.fromCharCode(i));
    return bytes;
})();


XDR.ENCODER = function (dlen) {
    this.wpos = 0;
    this.dlen = dlen;
    this.data = [];
}

XDR.ENCODER.prototype = {
    getData: function () {
	if( this.data.length > this.dlen )
	    return this.data.substr(0,this.dlen).join("");
	return this.data.join("");
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


XDR.provideForNamespace = function (path) {
    path = path.split('.');
    var ns = GLOBAL_CONTEXT;
    while( path.length > 1 ) {
	var p = path.shift();
	if( p in ns ) {
	    ns = ns[p];
	} else {
	    ns = ns[p] = {};
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
XDR.u8 = { encode:function(E,v){ E.encodeInt(v,8);}, decode:function (D){ return D.decodeInt(0,8);}, encodedSize:function(v) { return 8; } }
XDR.s8 = { encode:function(E,v){ E.encodeInt(v,8);}, decode:function (D){ return D.decodeInt(1,8);}, encodedSize:function(v) { return 8; } }
