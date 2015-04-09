//  (C) COPYRIGHT INTERNATIONAL BUSINESS MACHINES CORPORATION 2006-2010
//                       ALL RIGHTS RESERVED
//        IBM Research Division, Zurich Research Laboratory
// --------------------------------------------------------------------






/**
 * HTTP.Request represents a HTTP request.
 * @class
 * @constructor
 * @param connection
 */
HTTP.Request = function(/** HTTP.Connection */connection) {
    assert(connection);
    this.connection = connection;
    this.response = null;
};


/* Prototype */
HTTP.Request.prototype = {
     /**
     * HTTP connection.
     * @type HTTP.Connection
     */
    connection: null,
    /**
     * HTTP method ("get"..).
     * @type String
     */
    method: null,
    /**
     * URI
     * @type String
     */
    uri: null,
    /**
     * URI path, without parameters.
     * @type String
     */
    path: null,
    /**
     * Object with parameters and values of the HTTP as passed in by the HTTP client.
     * @type Object
     */
    paras: null,
    /**
     * HTTP version
     * @type String
     */
    version: null,
    /**
     * Header key/value pairs.
     * @type HTTP.Request.Properties
     */
    properties: null,
    /**
     * Map of name to HTTP.Cookie
     * @type Object
     */
    cookies: null,
    /**
     * @type String
     * @private
     */
    body: null,
    /**
     * @type Object
     * @private
     */
    bodyObj: null,
      /**
     * @type HTTP.Response
     * @private
     */
    response: null,


    /**
     * @returns {HTTP.Connection} connection
     */
    getConnection: function() {
	return this.connection;
    },

    /**
     * @returns {HTTP.Server} server
     */
    getServer: function() {
	return this.connection.server;
    },


    
    /**
     * Lookup cookie by name
     * @param name
     * @returns {String} cookie or null
     */
    getCookie: function(/** String */name) {
	if (!this.cookies) {
	    return null;
	}
	return this.cookies[name];
    },

    /**
     * Return string.
     * @returns {String} string
     */
    toString: function() {
	var txt = "";
	txt += sprintf("Method:    %s\n", this.method);
	txt += sprintf("Path:      %s\n", this.path);
	txt += sprintf("Version:   %s\n", this.version);
	txt += sprintf("Paras:\n%s\n", Util.formatData(this.paras));
	if (this.properties) {
	    txt += sprintf("Properties:\n%s\n", Util.formatData(this.properties));
	}
	return txt;
    },

    
    /**
     * @returns {Boolean} True if response has not been set yet.
     */
     isOpen: function() {
	 return !this.response;
     },

    
    /**
     * Respond specified object.
     * @param rsp  The http response
     */
    respond: function(/** HTTP.Response */rsp) {
	this.response = rsp;
	this.connection.respond(this); //, rsp);
    },
	
    /**
     * Respond HTTP error. Set HTTP.Response instance and call connection to send response.
     * @param status
     * @param reason
     * @param contentType
     */
    respondHTTP: function(/** Number */status, /** String */reason, /** String */contentType) {
	this.response =  (new HTTP.Response()).setHTTPError(status, reason, contentType);
	this.connection.respond(this); //, rsp);
    },

    /**
     * Respond HTTP bad request error.
     * @param content Optional
     */
    respondBadRequest: function(/** String */content) {
	this.response = (new HTTP.Response()).setBadRequest(content);
	this.connection.respond(this); //, rsp);
    },

    /**
     * Respond HTTP not found error.
     * @param content Optional
     */
    respondNotFound: function(/** String */content) {
	this.response = (new HTTP.Response()).setNotFound(content);
	this.connection.respond(this); //, rsp);
    },
	
    /**
     * Serve application ok/err instance. Set HTTP.Response instance and call connection to send response.
     * @param ok         AOP.Result instance
     * @param httpOpts   Optional, httpOpts.contentType may specify non-default content type
     */
    respondResult:  function(/** AOP.Result */ok, httpOpts) {
	this.response = (new HTTP.Response()).setResult(ok, httpOpts);
	this.connection.respond(this); //, rsp);
    },

    /**
     * Serve application data. Set HTTP.Response instance and call connection to send response.
     * @see HTTP.Response#setData
     * @param data      Optional, object, embedded in server response and converted to JSON
     * @param httpOpts  Optional, httpOpts.contentType may specify non-default content type
     */
    respondData: function(/** Object */data, /** Object */httpOpts) {
	this.response = (new HTTP.Response()).setData(data, httpOpts);
	this.connection.respond(this); //, rsp);
    },
    
    /**
     * @param status
     * @param content
     * @private
     */
    respondRaw: function(/** Number */status, /** String */content) {
	this.response =  (new HTTP.Response()).setRaw(status, content);
	this.connection.respond(this); //, rsp);
    }
};










/**
 * Object with key/value pairs.
 * @class
 * @constructor
 */
HTTP.Request.Properties = function(){ };

/** Prototype */
HTTP.Request.Properties.prototype = {
    /**
     * Parse line:..\r\nline:...\r\n\r\n starting with 'start'.
     * @param data
     * @param start
     * @returns {Number} position
     */
    parseLines: function(/** String */data, /** Number */start) {
        assert(start > 0);
        while(true) {
            var end = data.indexOf("\r\n", start);
            if (end < 0) {
                throw new Exception("Invalid line: " + data);
            }
            var mid = data.indexOf(":", start);
            if (mid < 0 || mid > end) {
                throw new Exception("Invalid line: " + data);
            }
            var key = data.substring(start, mid);
            key = key.trim();
            if (key.length==0) {
                throw new Exception("Invalid line: " + data);
            }
	    var sa = key.split('-');
	    key = sa.map(function(s) { return s.charAt(0).toUpperCase() + s.substring(1); }).join('-');
            var value = data.substring(mid+1, end);
            value = value.trim();
            this[key] = value;
            end += 2;
            if (data.charCodeAt(end) == HTTP.Request.CR && data.charCodeAt(end+1) == HTTP.Request.NL) {
                return end;
            }
            
            start = end;
        } 
    },

    
    /**
     * Parse value of 'key' which consists of key(=value)?; ..
     * @param key
     * @returns {HTTP.Request.Properties} properties
     */
    parseKeyValues2Obj: function(/** String */key) {
        var data = this[key];
        if (!data) {
            throw "Missing header/mime entry: " + key;
        }
        var obj = new HTTP.Request.Properties();
        var re = /([^=]+)(="?([^"]+))?/;
        var sa = data.split(/\s*;\s*/);
        for (var i = 0; i < sa.length; i++) {
            var md = re.exec(sa[i]);
            if (md) {
                var k = md[1];
                var v = md[3] ? md[3] : null;
                obj[k] = v;
            } else {
                throw sprintf("Invalid key=value; expression in: %s", data);
            }
        }
        return obj;
    },



    /**
     * Parse value of 'key' which consists of key(=value)?; ..
     * @param key
     * @returns {Array} 
     */
    parseKeyValues2Arr: function(/** String */key) {
        var data = this[key];
        if (!data) {
            throw "Missing header/mime entry: " + key;
        }
        var arr = [];
        var re = /([^=]+)(="?([^"]+))?/;
        var sa = data.split(/\s*;\s*/);
        for (var i = 0; i < sa.length; i++) {
            var md = re.exec(sa[i]);
            if (md) {
                var k = md[1];
                var v = md[3] ? md[3] : null;
		arr.push(k);
		arr.push(v);
            } else {
                throw sprintf("Invalid key=value; expression in: %s", data);
            }
        }
        return arr;
    },

    
    /**
     * Return integer value for key or null if it does not exist.
     * @returns {Number} number or null if non-existent or invalid
     */
    getInt: function(key) {
        var val = this[key];
        if (val==undefined) {
            return null;
        }
        var n = parseInt(val);
        if (isNaN(n)) {
            return null;
        }
        return n;
    },

    
    /**
     * @returns {String}
     */
    toString: function() {
        return Util.formatData(this);
    }
};






/**
 * HTTP.Request.Parser receives the request data from the socket and parses it.
 * @class
 * @constructor
 * @param connection
 * @private
 */
HTTP.Request.Parser = function(/** HTTP.Connection */connection) {
    assert(connection);
    this.connection = connection;
    this.data = null;
    this.markerPos = 0;
    this.hdrEndPos = -1;
    this.bodyStartPos = -1;
    this.contentLength = -1;
    this.request = null;
};

HTTP.Request.Parser.prototype = {
     /**
     * @type HTTP.Connection
     * @private
     */
    connection: null,
    /**
     * @type String
     * @private
     */
    data: null,
    /**
     * @type Number
     * @private
     */
    markerPos: null,
    /**
     * @type Number
     * @private
     */
    hdrEndPos: null,
    /**
     * @type Number
     * @private
     */
    bodyStartPos: null,
    /**
     * @type HTTP.Request
     * @private
     */
    request: null,


    /**
     * @private
     */
    onData: function(data) {
	if (this.data===null) {
	    this.data = new DataBuffer(data);
	} else {
	    this.data.appendU8Array(data);
	}
	//QUACK(0, "HTTP REQUEST:\n" + this.data);
        data = this.data;
	assert(data instanceof DataBuffer);
	var dataLen = data.getLength();
        if (this.hdrEndPos < 0) {
	    if (dataLen < 4) {
	        return false;
	    }
	    for (var i = this.markerPos; i <= dataLen-4; i++) {
	        var c0 = data.charCodeAt(i), c1 = data.charCodeAt(i+1), c2 = data.charCodeAt(i+2), c3 = data.charCodeAt(i+3);
	        if (c0 == HTTP.Request.CR && c1 == HTTP.Request.NL && c2 == HTTP.Request.CR && c3 == HTTP.Request.NL) {
		    this.hdrEndPos = i+2;
		    this.bodyStartPos = i+4;
		    break;
	        }
	    }
	    if (this.hdrEndPos < 0) {
	        if (data[this.markerPos] == '\r' || data[this.markerPos] == '\n') {
		    this.markerPos = 0;    // we do not want to get confused
	        }
	        return false;
	    }

	    this.request = new HTTP.Request(this.connection);
	    var pos = this.parseTitle(data, 0, this.request);
            assert(pos > 0);
            
	    var properties = new HTTP.Request.Properties();
            pos = properties.parseLines(data, pos);
            assert(pos == this.hdrEndPos);
	    this.request.properties = properties;
            
            // parsed header is complete
	    if (properties[HTTP.COOKIE_KEY]) {
		//println("COOKIES: " + properties[HTTP.COOKIE_KEY]);
		var arr = properties.parseKeyValues2Arr(HTTP.COOKIE_KEY);
		var cookies = {};
		for (var i = 0; i < arr.length; i+=2) {
		    var name = arr[i];
		    var value = arr[i+1];
		    cookies[name] = value;
		    this.request.cookies = cookies;
		}
	    }

            var contentLength = properties.getInt(HTTP.CONTENT_LENGTH_KEY);
            if (contentLength == null) {
                if (dataLen == this.bodyStartPos) {
                    return true;
                } else {
		    this.request.body = this.data.substring(this.bodyStartPos, dataLen);
		    //QUACK(0, sprintf("Save additional body bytes in request: %H", this.request.body));
		    //throw sprintf("Request received with too much data: %d <-> %d", dataLen, this.bodyStartPos);
		    return true;
                }
            }

            this.contentLength = contentLength;
            if (this.request.method != HTTP.METHOD_POST) {
                throw "Request with content does not carry POST method";
            }
            var contentType = properties[HTTP.CONTENT_TYPE_KEY];
            if (!contentType) {
                throw "Missing 'Content-Type' in post request";   
            }
        }

        var expectedLen = this.bodyStartPos + this.contentLength;
        if (dataLen > expectedLen) {
            throw sprintf("Request received with too much data: %d <-> %d", dataLen, expectedLen);
        }
        
        if (dataLen < expectedLen) {
            return false;
        }

        this.parseBody();

        return true;
    },


    /**
     * Parse first line of http request.
     * @param data
     * @param pos
     * @param rq   Target request object to be filled out
     * @returns {Number} position on next line start
     * @private
     */
    parseTitle: function(/** String */data, /** Number */pos, /** HTTP.Request */rq) {
	var dataLen = data.getLength();

 	// Request might have leading CR NL!!
 	while( pos+2 < dataLen
 	       && data.charCodeAt(pos  )==HTTP.Request.CR
 	       && data.charCodeAt(pos+1)==HTTP.Request.NL ) {
 	    pos += 2;
 	}

        var start = pos;
	while(true) {
	    if (pos >= dataLen) {
		throw sprintf("Invalid HTTP request line: missing end of method");
	    }
	    var c = data.charCodeAt(pos);
	    if (c == HTTP.Request.SPACE) {
		break;
	    }
	    pos += 1;
	}
        var method = data.substring(start, pos);
        if (method != HTTP.METHOD_GET && method != HTTP.METHOD_PUT && method != HTTP.METHOD_POST) {
            throw sprintf("Unsupported method '%s'", method);
        }
	pos = HTTP.Request.skipWhiteSpace(data, pos);
	start = pos;
	var uri;
	while(true) {
	    if (pos >= dataLen) {
		throw sprintf("Invalid HTTP request line: missing end of uri");
	    }
	    var c = data.charCodeAt(pos);
	    if (c == HTTP.Request.SPACE) {
		uri = data.substring(start, pos);
		break;
	    }
	    pos += 1;
	}
	pos = HTTP.Request.skipWhiteSpace(data, pos);
	start = pos;
	var version;
	while(true) {
	    if (pos >= dataLen) {
		throw sprintf("Invalid HTTP request line: missing end of HTTP version");
	    }
	    if (data.charCodeAt(pos) == HTTP.Request.CR && data.charCodeAt(pos+1) == HTTP.Request.NL) {
		version = data.substring(start, pos);
		break;
	    }
	    pos += 1;
	}
	rq.paras = {};
	rq.uri = uri;
	rq.method = method;
	rq.version = version;
	this.parseURI(rq);
	return pos + 2;
    },


    /**
     * Parse body. For now, only multipart/form-data is supported with a boundary enclosing mime
     * plain text content types.
     * @private
     */
    parseBody: function() {
	//println(Util.formatData(this.request.properties));
        var contentTypeProperties = this.request.properties.parseKeyValues2Obj('Content-Type');
        if (contentTypeProperties[HTTP.APPLICATION_FORM_KEY] === null) {
	    var data = this.data.substring(this.bodyStartPos).trim();
	    this.parseURIParas(this.request.paras, data , 0);
	    return;

	}
        if (contentTypeProperties[HTTP.APPLICATION_JSON_KEY] === null) {
            // eval json and set bodyObj of request
            var obj = null;
            try {
                obj = JSON.parse(this.data.substring(this.bodyStartPos));
            } catch (x) {
                throw sprintf("Invalid json data: "+x.toString());
            }
	    this.request.bodyObj = obj;
	    return;
        }
	
        if (contentTypeProperties[HTTP.MULTIPART_FORM_DATA_KEY] !== null) {
	    // Pass along - controller must decide if it wants to handle this
 	    this.request.bodyObj = this.data.substring(this.bodyStartPos);
 	    return;
        }

        var boundary = contentTypeProperties[HTTP.BOUNDARY_KEY];
        if (!boundary) {
            throw sprintf("No boundary given in content-type");
        }

	var arr = [];
	var end = this.parseBoundaries(this.data, this.bodyStartPos, boundary, arr);
	
	for (var i = 0; i < arr.length; i++)  {
	    var start = arr[i][0];
	    var end = arr[i][1];
	    var mime = new HTTP.Request.Properties();
            var off = mime.parseLines(this.data, start);
	    var dispositionProperties = mime.parseKeyValues2Obj(HTTP.MIME_CONTENT_DISPOSITION_KEY);
	    var name = dispositionProperties['name'];
	    if (name) {
		this.request.paras[name] = this.data.substring(off+2, end);
	    }
	}
	//println(Util.formatData(this.request.paras));
    },
  


    /**
     * @param data
     * @param pos
     * @param boundary
     * @param arr
     * @returns {Number}
     * @private
     */
    parseBoundaries: function(/** String */data, /** Number */pos, /** String */boundary, /** Array */arr) {
        var s = "--" + boundary + "\r\n";
        var start = data.indexOf(s, pos);
        if (start < 0) {
            throw sprintf("Cannot find mime start boundary: %s", boundary);
        }
        start += s.length;
	
	while(true) {
            var end = this.data.indexOf(s, start);
            if (end < 0) {
		break;
            }
            if (data.charCodeAt(end-2) != HTTP.Request.CR && this.data.charCodeAt(end-1) == HTTP.Request.NL) {
		throw "Missing \\r\\n before mime boundary";
            }
	    arr.push([ start, end-2 ]);
	    start = end + s.length;
	}
	
	
        s = "--" + boundary + "--\r\n";
        var end = this.data.indexOf(s, start);
        if (end < 0) {
            throw sprintf("Cannot find mime end boundary: %s", boundary);
        }
        if (data.charCodeAt(end-2) != HTTP.Request.CR && this.data.charCodeAt(end-1) == HTTP.Request.NL) {
            throw "Missing \\r\\n before end boundary";
        }
	arr.push([ start, end-2 ]);
	
        return end + s.length;
    },

    
    /**
     * Parse uri in first line and fill in fields in this.
     * @param data
     * @param pos
     * @param paras   Object to fill with parameters and their values
     * @private
     */
    parseURI: function(/** HTTP.Request */rq) {
	var path, start, pos;
	var data = rq.uri;
	start = 0;
	pos = data.indexOf("?", pos);
	if (pos == -1) {
	    rq.path = data;
	    rq.query = "";
	    return;
	}
	assert(data.charCodeAt(pos) == HTTP.Request.QUESTIONMARK);
	rq.path = path = data.substring(start, pos);
	rq.query = data.substring(pos);
        pos += 1;
        if (data.charCodeAt(pos) == HTTP.Request.SPACE) {
            return;
        }
	this.parseURIParas(rq.paras, data, pos);
    },

    /**
     * @private
     */
    parseURIParas: function(/** Object */paras, /** String */data, /** Number */pos) {
	// XXX: eir: this parsing is broken...
	var start, key, value;
	while(true) {
	    start = pos;
	    pos = data.indexOf("=", pos);
	    if (pos == -1) {
	        key = this.decodeURIComponent(data.substring(start));
	        paras[key] = null;
	        break;
	    } 
            key = this.decodeURIComponent(data.substring(start, pos));
	    pos += 1;
	    start = pos;
	    pos = data.indexOf("&", pos);
	    if (pos == -1) {
                value = this.decodeURIComponent(data.substring(start));
	        paras[key] = value;
		break;
	    }
            value = this.decodeURIComponent(data.substring(start, pos));
	    paras[key] = value;
            pos += 1;
	}
	//QUACK(0, "PARAS: " + Util.formatData(paras));
    },

    /**
     * Decode uri component.
     * @param comp
     * @returns {String}
     * @private
     */
    decodeURIComponent: function(/** String */comp) {
        comp = comp.replace(/\+/g, ' ');
        comp = decodeURIComponent(comp);
        return comp;
    }
};




/**
 * Skip characters as long as they are space.
 * @param data
 * @param pos
 * @returns {Number} position of non-space character
 * @private
 */
HTTP.Request.skipWhiteSpace = function(data, pos) {
    if (data.charCodeAt(pos) != HTTP.Request.SPACE) {
        throw sprintf("Invalid request: expected whitespace at position '%d'", pos);
    }
    var dataLen = data.getLength();
    while(true) {
        if (pos >= dataLen) {
	    throw sprintf("Invalid request: missing end at skipping whitespaces");
        }
        if (data.charCodeAt(pos) != HTTP.Request.SPACE) {
	    break;
        }
        pos += 1;
    }
    return pos;
};




/**
 * @constant
 * @type Number
 * @private
 */
HTTP.Request.CR = 13;
/**
 * @constant
 * @type Number
 * @private
 */
HTTP.Request.NL = 10;
/**
 * @constant
 * @type Number
 * @private
 */
HTTP.Request.SPACE = 32;
/**
 * @constant
 * @type Number
 * @private
 */
HTTP.Request.COLON = 58;
/**
 * @constant
 * @type Number
 * @private
 */
HTTP.Request.SEMICOLON = 59;
/**
 * @constant
 * @type Number
 * @private
 */
HTTP.Request.QUESTIONMARK = 63;
/**
 * @constant
 * @type Number
 * @private
 */
HTTP.Request.EQUALS = 61;
/**
 * @constant
 * @type Number
 * @private
 */
HTTP.Request.AMPERSAND = 38;
/**
 * @constant
 * @type Number
 * @private
 */
HTTP.Request.END_OF_STR = 512;

















// /**
//  * HTTP.Request.Parser receives the request data from the socket and parses it.
//  * @class
//  */

// HTTP.Request.Parser = function() {
//     this.data = "";
//     this.markerPos = 0;
//     this.hdrEndPos = -1;
//     this.bodyStartPos = -1;
//     this.contentLength = -1;
//     this.request = null;
// };

// HTTP.Request.Parser.prototype = {
//     /**
//      * @type String
//      * @private
//      */
//     data: null,
//     /**
//      * @type Number
//      * @private
//      */
//     markerPos: null,
//     /**
//      * @type Number
//      * @private
//      */
//     hdrEndPos: null,
//     /**
//      * @type Number
//      * @private
//      */
//     bodyStartPos: null,
//     /**
//      * @type HTTP.Request
//      * @private
//      */
//     request: null,

  

    // /**
    //  * Returns start and end position between content segmented by boundary.
    //  * @param data
    //  * @param pos
    //  * @param boundary
    //  * @private
    //  */
    // getBoundaries: function(/** String */data, /** Number */pos, /** String */boundary) {
    //     var s;
    //     s = "--" + boundary + "\r\n";
    //     var start = data.indexOf(s, pos);
    //     if (start < 0) {
    //         throw sprintf("Cannot find mime start boundary: %s", boundary);
    //     }
    //     start += s.length;
    //     s = "--" + boundary + "--\r\n";
    //     var end = this.data.indexOf(s, start);
    //     if (end < 0) {
    //         throw sprintf("Cannot find mime end boundary: %s", boundary);
    //         }
    //     if (data.charCodeAt(end-2) != HTTP.Request.CR && this.data.charCodeAt(end-1) == HTTP.Request.NL) {
    //         throw "Missing \\r\\n before end boundary";
    //     }
    //     end -= 2;
    //     return [ start, end];
    // },

//     /**
//      * @private
//      */
//     onData: function(data) {
//         this.data = this.data.concat(data);
//         data = this.data;
//         if (this.hdrEndPos < 0) {
// 	    if (data.length < 4) {
// 	        return false;
// 	    }
// 	    for (var i = this.markerPos; i <= data.length-4; i++) {
// 	        var c0 = data.charCodeAt(i), c1 = data.charCodeAt(i+1), c2 = data.charCodeAt(i+2), c3 = data.charCodeAt(i+3);
// 	        if (c0 == HTTP.Request.CR && c1 == HTTP.Request.NL && c2 == HTTP.Request.CR && c3 == HTTP.Request.NL) {
// 		    this.hdrEndPos = i+2;
// 		    this.bodyStartPos = i+4;
// 		    break;
// 	        }
// 	    }
// 	    if (this.hdrEndPos < 0) {
// 	        if (data[this.markerPos] == '\r' || data[this.markerPos] == '\n') {
// 		    this.markerPos = 0;    // we do not want to get confused
// 	        }
// 	        return false;
// 	    }

// 	    this.request = new HTTP.Request();
// 	    var pos = this.parseTitle(data, 0, this.request);
//             assert(pos > 0);
            
// 	    var properties = new HTTP.Request.Properties();
//             pos = properties.parseLines(data, pos);
//             assert(pos == this.hdrEndPos);
// 	    this.request.properties = properties;
            
//             // parsed header is complete
// 	    if (properties[HTTP.COOKIE_KEY]) {
// 		var arr = properties.parseKeyValues2Arr(HTTP.COOKIE_KEY);
// 		var cookies = {};
// 		for (var i = 0; i < arr.length; i+=2) {
// 		    var name = arr[i];
// 		    var value = arr[i+1];
// 		    cookies[name] = value;
// 		    this.request.cookies = cookies;
// 		}
// 	    }

//             var contentLength = properties.getInt(HTTP.CONTENT_LENGTH_KEY);
//             if (contentLength == null) {
//                 if (this.data.length == this.bodyStartPos) {
//                     return true;
//                 } else {
//                     throw "Request received with too much data";
//                 }
//             }

//             this.contentLength = contentLength;
//             if (this.request.method != HTTP.METHOD_POST) {
//                 throw "Request with content does not carry POST method";
//             }
//             var contentType = properties[HTTP.CONTENT_TYPE_KEY];
//             if (!contentType) {
//                 throw "Missing 'Content-Type' in post request";   
//             }
//         }

//         var expectedLen = this.bodyStartPos + this.contentLength;
//         if (this.data.length > expectedLen) {
//             throw "Request received with too much data";
//         }
        
//         if (this.data.length < expectedLen) {
//             return false;
//         }

//         this.parseBody();

//         return true;
//     },


//     /**
//      * Parse first line of http request.
//      * @param data
//      * @param pos
//      * @param rq   Target request object to be filled out
//      * @returns {Number} position on next line start
//      * @private
//      */
//     parseTitle: function(/** String */data, /** Number */pos, /** HTTP.Request */rq) {
//         var start = pos;
// 	while(true) {
// 	    if (pos >= data.length) {
// 		throw sprintf("Invalid HTTP request line: missing end of method");
// 	    }
// 	    var c = data.charCodeAt(pos);
// 	    if (c == HTTP.Request.SPACE) {
// 		break;
// 	    }
// 	    pos += 1;
// 	}
//         var method = data.substring(start, pos);
//         if (method != HTTP.METHOD_GET && method != HTTP.METHOD_PUT && method != HTTP.METHOD_POST) {
//             throw sprintf("Unsupported method '%s'", method);
//         }
// 	pos = HTTP.Request.skipWhiteSpace(data, pos);
// 	start = pos;
// 	var uri;
// 	while(true) {
// 	    if (pos >= data.length) {
// 		throw sprintf("Invalid HTTP request line: missing end of uri");
// 	    }
// 	    var c = data.charCodeAt(pos);
// 	    if (c == HTTP.Request.SPACE) {
// 		uri = data.substring(start, pos);
// 		break;
// 	    }
// 	    pos += 1;
// 	}
// 	pos = HTTP.Request.skipWhiteSpace(data, pos);
// 	start = pos;
// 	var version;
// 	while(true) {
// 	    if (pos >= data.length) {
// 		throw sprintf("Invalid HTTP request line: missing end of HTTP version");
// 	    }
// 	    if (data.charCodeAt(pos) == HTTP.Request.CR && data.charCodeAt(pos+1) == HTTP.Request.NL) {
// 		version = data.substring(start, pos);
// 		break;
// 	    }
// 	    pos += 1;
// 	}
// 	var paras = {};
// 	var path = this.parseURI(uri, 0, paras);

// 	rq.method = method;
// 	rq.path = path;
// 	rq.version = version;
// 	rq.paras = paras;
// 	return pos + 2;
//     },


//     /**
//      * Parse body. For now, only multipart/form-data is supported with a boundary enclosing mime
//      * plain text content types.
//      * @private
//      */
//     parseBody: function() {
//         var contentTypeProperties = this.request.properties.parseKeyValues2Obj('Content-Type');
//         if (contentTypeProperties[HTTP.APPLICATION_JSON_KEY] === null) {
//             // eval json and add to paras object of request
//             var obj = null;
//             try {
//                 obj = JSON.parse(this.data.substring(this.bodyStartPos));
//             } catch (x) {
//                 throw sprintf("Invalid json data");
//             }
//             var paras = this.request.paras;
//             for(var k in obj) {
//                 paras[k] = obj[k];
//             }
//             return;
//         }

//         // file upload
//         if (contentTypeProperties[HTTP.MULTIPART_FORM_DATA_KEY] !== null) {
//             throw sprintf("Unsupported content type: " + Util.formatData(contentTypeProperties));
//         }
//         var boundary = contentTypeProperties[HTTP.BOUNDARY_KEY];
//         if (!boundary) {
//             throw sprintf("No boundary given in content-type");
//         }

//         var arr = this.getBoundaries(this.data, this.bodyStartPos, boundary);
//         var start = arr[0];
//         var end = arr[1];
//         var mime = new HTTP.Request.Properties();
//         start = mime.parseLines(this.data, start);
//         start += 2;

//         var mimeContentType = mime[HTTP.CONTENT_TYPE_KEY];
//         var idx = HTTP.MIME_PLAIN_CONTENT_TYPES.indexOf(mime[HTTP.CONTENT_TYPE_KEY]);
//         if (idx < 0) {
//             throw sprintf("Unsupported mime-type '%s'", mime[HTTP.CONTENT_TYPE_KEY]);
//         }
//         var dispositionProperties = mime.parseKeyValues2Obj(HTTP.MIME_CONTENT_DISPOSITION_KEY);
//         var name = dispositionProperties['name'];
//         var filename = dispositionProperties['filename'];
//         if (!name || !filename || (dispositionProperties[HTTP.FORM_DATA_KEY] !== null)) {
//             throw "Invalid Content-Disposition attribute";
//         }
//         this.request.paras.file = {
//             fileName: filename,
//             fileData: this.data.substring(start, end)
//         };
//     },
    

//     /**
//      * Returns start and end position between content segmented by boundary.
//      * @param data
//      * @param pos
//      * @param boundary
//      * @private
//      */
//     getBoundaries: function(/** String */data, /** Number */pos, /** String */boundary) {
//         var s;
//         s = "--" + boundary + "\r\n";
//         var start = data.indexOf(s, pos);
//         if (start < 0) {
//             throw sprintf("Cannot find mime start boundary: %s", boundary);
//         }
//         start += s.length;
//         s = "--" + boundary + "--\r\n";
//         var end = this.data.indexOf(s, start);
//         if (end < 0) {
//             throw sprintf("Cannot find mime end boundary: %s", boundary);
//             }
//         if (data.charCodeAt(end-2) != HTTP.Request.CR && this.data.charCodeAt(end-1) == HTTP.Request.NL) {
//             throw "Missing \\r\\n before end boundary";
//         }
//         end -= 2;
//         return [ start, end];
//     },

    
//     /**
//      * Parse uri in first line.
//      * @param data
//      * @param pos
//      * @param paras   Object to fill with parameters and their values
//      * @returns {String} uri path
//      * @private
//      */
//     parseURI: function(/** String */data, /** Number */pos, /** Object */paras) {
// 	var path, start = pos;
// 	pos = data.indexOf("?", pos);
// 	if (pos == -1) {
// 	    return data;
// 	}
// 	assert(data.charCodeAt(pos) == HTTP.Request.QUESTIONMARK);
// 	path = data.substring(start, pos);
//         pos += 1;
//         if (data.charCodeAt(pos) == HTTP.Request.SPACE) {
//             return path;
//         }
// 	this.parseURIParas(paras, data, pos);

// 	// var key, value;
// 	// while(true) {
// 	//     start = pos;
// 	//     pos = data.indexOf("=", pos);
// 	//     if (pos == -1) {
// 	//         key = this.decodeURIComponent(data.substring(start));
// 	//         paras[key] = null;
// 	//         break;
// 	//     } 
//         //     key = this.decodeURIComponent(data.substring(start, pos));
// 	//     pos += 1;
// 	//     start = pos;
// 	//     pos = data.indexOf("&", pos);
// 	//     if (pos == -1) {
//         //         value = this.decodeURIComponent(data.substring(start));
// 	//         paras[key] = value;
// 	// 	break;
// 	//     }
//         //     value = this.decodeURIComponent(data.substring(start, pos));
// 	//     paras[key] = value;
//         //     pos += 1;
// 	// }
// 	QUACK(0, "PARAS: " + Util.formatData(paras));
// 	return path;
//     },

//     /**
//      * @private
//      */
//     parseURIParas: function(/** Object */paras, /** String */data, /** Number */pos) {
// 	// XXX: eir: this parsing is broken...
// 	var start, key, value;
// 	while(true) {
// 	    start = pos;
// 	    pos = data.indexOf("=", pos);
// 	    if (pos == -1) {
// 	        key = this.decodeURIComponent(data.substring(start));
// 	        paras[key] = null;
// 	        break;
// 	    } 
//             key = this.decodeURIComponent(data.substring(start, pos));
// 	    pos += 1;
// 	    start = pos;
// 	    pos = data.indexOf("&", pos);
// 	    if (pos == -1) {
//                 value = this.decodeURIComponent(data.substring(start));
// 	        paras[key] = value;
// 		break;
// 	    }
//             value = this.decodeURIComponent(data.substring(start, pos));
// 	    paras[key] = value;
//             pos += 1;
// 	}
// 	//QUACK(0, "PARAS: " + Util.formatData(paras));
//     },

//     /**
//      * Decode uri component.
//      * @param comp
//      * @returns {String}
//      * @private
//      */
//     decodeURIComponent: function(/** String */comp) {
//         comp = comp.replace(/\+/g, ' ');
//         comp = decodeURIComponent(comp);
//         return comp;
//     }
// };




// /**
//  * Skip characters as long as they are space.
//  * @param data
//  * @param pos
//  * @returns {Number} position of non-space character
//  * @private
//  */
// HTTP.Request.skipWhiteSpace = function(data, pos) {
//     if (data.charCodeAt(pos) != HTTP.Request.SPACE) {
//         throw sprintf("Invalid request: expected whitespace at position '%d'", pos);
//     }
//     while(true) {
//         if (pos >= data.length) {
// 	    throw sprintf("Invalid request: missing end at skipping whitespaces");
//         }
//         if (data.charCodeAt(pos) != HTTP.Request.SPACE) {
// 	    break;
//         }
//         pos += 1;
//     }
//     return pos;
// };




// /**
//  * @constant
//  * @type Number
//  * @private
//  */
// HTTP.Request.CR = 13;
// /**
//  * @constant
//  * @type Number
//  * @private
//  */
// HTTP.Request.NL = 10;
// /**
//  * @constant
//  * @type Number
//  * @private
//  */
// HTTP.Request.SPACE = 32;
// /**
//  * @constant
//  * @type Number
//  * @private
//  */
// HTTP.Request.COLON = 58;
// /**
//  * @constant
//  * @type Number
//  * @private
//  */
// HTTP.Request.SEMICOLON = 59;
// /**
//  * @constant
//  * @type Number
//  * @private
//  */
// HTTP.Request.QUESTIONMARK = 63;
// /**
//  * @constant
//  * @type Number
//  * @private
//  */
// HTTP.Request.EQUALS = 61;
// /**
//  * @constant
//  * @type Number
//  * @private
//  */
// HTTP.Request.AMPERSAND = 38;
// /**
//  * @constant
//  * @type Number
//  * @private
//  */
// HTTP.Request.END_OF_STR = 512;



























