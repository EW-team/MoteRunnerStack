//  (C) COPYRIGHT INTERNATIONAL BUSINESS MACHINES CORPORATION 2006-2010
//                       ALL RIGHTS RESERVED
//        IBM Research Division, Zurich Research Laboratory
// --------------------------------------------------------------------
/**
 * HTTP implementes a simple web framework.
 * @namespace HTTP 
 */
HTTP = {};

/**
 * @type String[]
 * @constant
 * @private
 */
HTTP.CONTENT_TYPES = [
    "htm", "text/html",
    "xml",  "text/xml",
    "xhtm", "text/xhtml+xml",
    "htm",  "text/html",
    "html", "text/html",
    "js",   "application/javascript",
    "css",  "text/css",
    "png",  "image/png",
    "gif",  "image/gif",
    "jpg",  "image/jpeg",
    "jpeg", "image/jpeg",
    "ico",  "image/x-icon",
    "txt",  "text/plain",
    "zip",  "application/zip"
];


/**
 * @type String
 * @constant
 * @private
 */
HTTP.METHOD_GET = "GET";

/**
 * @type String
 * @constant
 * @private
 */
HTTP.METHOD_PUT = "PUT";

/**
 * @type String
 * @constant
 * @private
 */
HTTP.METHOD_POST = "POST";

/**
 * @type String
 * @constant
 * @private
 */
HTTP.MULTIPART_FORM_DATA_KEY = "multipart/form-data";

/**
 * @type String
 * @constant
 * @private
 */
HTTP.APPLICATION_FORM_KEY = "application/x-www-form-urlencoded";

/**
 * @type String
 * @constant
 * @private
 */
HTTP.APPLICATION_JSON_KEY = "application/json";

/**
 * @type String
 * @constant
 * @private
 */
HTTP.CONTENT_TYPE_KEY = "Content-Type";

/**
 * @type String
 * @constant
 * @private
 */
HTTP.BOUNDARY_KEY = "boundary";

/**
 * @type String
 * @constant
 * @private
 */
HTTP.CONTENT_LENGTH_KEY = "Content-Length";

/**
 * @type String
 * @constant
 * @private
 */
HTTP.COOKIE_KEY = "Cookie";

/**
 * @type String
 * @constant
 * @private
 */
HTTP.FORM_DATA_KEY = "form-data";

/**
 * @type String[]
 * @constant
 * @private
 */
HTTP.MIME_PLAIN_CONTENT_TYPES = [
    "text/xml",
    "text/xhtml",
    "text/html",
    "text/css",
    "text/plain",
    "application/octet-stream",
    "application/javascript",
    "application/x-javascript"
];

/**
 * @type String
 * @constant
 * @private
 */
HTTP.MIME_CONTENT_DISPOSITION_KEY = "Content-Disposition";




/**
 * @type String
 * @constant
 */
HTTP.LOGIN_PAGE_PATH = "/lib/web/login.html";

/**
 * @type String
 * @constant
 */
HTTP.PASSWORDS_FILE_DIR = "/lib/sonoran/resources/http";

/**
 * @type String
 * @constant
 */
HTTP.PASSWORDS_FILE_NAME = "passwords.txt";


/**
 * @type String
 * @constant
 */
HTTP.COOKIE_STORE_PATH = "/lib/sonoran/resources/http/cookies";


/**
 * @type Number
 * @constant
 */
HTTP.COOKIE_MAX_AGE = 24 * 60 * 60;




/**
 * Property given by 'key' in 'paras' is treated as a JSON encoded string and a decoded Javascript
 * object is returned. Throws an exception in case of error.
 * @param paras   The parameter object from an HTTP.Request
 * @param key     Name of parameter
 * @returns {Object} Object
 */
HTTP.parseJSON = function(/** Object */paras, /** String */key) {
    var val = paras[key];
    if (!val) {
	throw "Missing parameter for: " + key;
    }
    try {
        return JSON.parse(val);
    } catch (x) {
        throw sprintf("Invalid json format for paramater '%s': %s", key, x); 
    }
};

/**
 * Property given by 'key' in 'paras' is treated as an integer and its decoded value returned.
 * Throws an exception in case of error.
 * @param paras  The parameter object from an HTTP.Request
 * @param key    Name of parameter
 * @param base   Optional
 * @returns {Number} Number
 */
HTTP.parseInt = function(/** Object */paras, /** String */key, /** String */base) {
    var val = paras[key];
    if (typeof(val) == 'undefined') {
	throw "Missing parameter for: " + key;
    }
    return base ? parseInt(val, base) : parseInt(val);
};

/**
 * Property given by 'key' in 'paras' is treated as a bool. 'true' or 'TRUE' return true,
 * false otherwise.
 * Throws an exception in case of error.
 * @param paras  The parameter object from an HTTP.Request
 * @param key    Name of parameter
 * @returns {Boolean} Boolean
 */
HTTP.parseBool = function(/** Object */paras, /** String */key) {
    var val = paras[key];
    if (typeof(val) == 'undefined') {
	throw "Missing parameter for: " + key;
    }
    return val.toLowerCase() == 'true';
};

/**
 * Property given by 'key' in 'paras' is treated as a string and checked to comply with a given
 * RegExp. If not available and dfltVal is set, dfltVal is returned. Throws an exception in case of error.
 * @param paras    The parameter object from an HTTP.Request
 * @param key      Name of parameter
 * @param re       Optional, regular expression
 * @param dfltVal  Optional, default value
 * @returns {String} String
 */
HTTP.parseString = function(/** Object */paras,/** String */key,/** RegExp */re,/** String */dfltVal) {
    var val = paras[key];
    if (!val) {
	if (dfltVal) {
	    return dfltVal;
	} else {
	    throw "Missing parameter for: " + key;
	}
    }
    val = val.trim();
    if (re) {
	if (!re.test(val)) {
	    throw "Invalid parameter: " + key + ", " + val;
	}
    }
    return val;
};

/**
 * Parse parameter and make sure that it matches one of the specified keywords.
 * @param paras         The parameter object from an HTTP.Request
 * @param key           Name of parameter
 * @param keywords      Array of legitimate keywords
 */
HTTP.parseKeyword = function(/** Object */paras,/** String */key,/** String[] */keywords) {
    var s = this.parseString(paras, key, /.+/);
    var idx = keywords.indexOf(s);
    if (idx >= 0) {
        return s;
    } else {
        throw "Invalid parameter: " + key + ", " + val;
    }
};   



/**
 * @param path File path
 * @returns {String} content type
 */
HTTP.mapSuffix2ContentType = function(/** String */path) {
    var suffix = IO.FileUtils.getSuffix(path);
    var ct = "text/plain";
    if (suffix) {
	for(var j = 0; j < HTTP.CONTENT_TYPES.length; j += 2) {
	    if (suffix == HTTP.CONTENT_TYPES[j]) {
	 	ct = HTTP.CONTENT_TYPES[j+1];
	 	break;
	    }
	}
    }
    return ct;
};

Runtime.include("./server/server.js");
Runtime.include("./client/client.js");

