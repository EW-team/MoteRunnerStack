//  (C) COPYRIGHT INTERNATIONAL BUSINESS MACHINES CORPORATION 2006-2010
//                       ALL RIGHTS RESERVED
//        IBM Research Division, Zurich Research Laboratory
// --------------------------------------------------------------------

/**
 * HTTP.Response represents a HTTP response.
 * @class
 * @constructor
 */
HTTP.Response = function() {
   this.status = -1;
   this.content = null;
   this.filepath = null;
};

/** Prototype */
HTTP.Response.prototype = {
   /**
    * HTTP status code
    * @type Number
    */
   status: -1,
   /**
    * String to return to client, the ful http response
    * @type String
    */
   content: null,
   /**
    * Path to file for static content. Content keeps the header then.
    * @type String
    */
   filepath: null,


   /**
    * Response already set?
    * @returns {Boolean} flag
    */
   isSet: function() {
      return (this.status!=-1);
   },
   
   /**
    * Set HTTP error response.
    * @param status      HTTP error status code
    * @param reason      HTTP reason string
    * @param contentType HTTP content type
    * @param content     Optional content added to response
    * @returns {HTTP.Response} this
    */
   setHTTPError: function(/** Number */status, /** String */reason, /** String */contentType, /** String */content) {
       assert(status>=0);
       assert(reason);
       if (!contentType) {
           contentType = "text/plain";
       }
       if (!content) {
	   content = reason;
       }
       this.status = status;
       this.content = this.genHeader(status, reason, contentType, content.length+2) + content + "\r\n";
       return this;
   },

   /**
    * Set http error 'Bad request'.
    * @param content Optional
    * @returns {HTTP.Response} this
    */
   setBadRequest: function(/** String */content) {
       return this.setHTTPError(400, "Bad request", undefined, content);
   },


    /**
    * Set http error 'Not Found'.
    * @param content Optional
    * @returns {HTTP.Response} this
    */
   setNotFound: function(/** String */content) {
       return this.setHTTPError(404, "Not Found", undefined, content);
   },


   /**
    * Set status and content.
    * @returns {HTTP.Response} this
    * @private
    */
   setRaw: function(/** Number */status, /** String */content) {
       this.status = status;
       this.content = content;
       return this;
   },


    /**
     * @param path
     * @param httpOpts
     * @private
     */
    setRedirect: function(path, httpOpts) {
	var cookies = (httpOpts && httpOpts.cookies) ? httpOpts.cookies : undefined;
	var status = 301;
	var reason = "Moved permanently";
	var contentType = "text/plain";
	var contentLength = 0;
	var txt =  "HTTP/1.1 " + status + " " + reason + "\r\n";
	txt +=     "content-type: " + contentType + "\r\n";
	txt +=     "content-length: " + contentLength + "\r\n";
	txt +=     "cache-control: no-cache\r\n";
	txt +=     "location: " + path + "\r\n";
	if (cookies) {
	    cookies.forEach(function(cookie) {
		txt += "set-cookie: " + cookie + "\r\n";
	    });
	}
	txt +=     "\r\n";
	this.status = status;
	this.content = txt;
	return this;
    },

   /**
    * Set static file response.
    * @param contentType
    * @param filepath
    * @returns {HTTP.Response} this
    */
   setFilepath: function(/** String */contentType, /** String */filepath, /** Object */ httpOpts) {
       this.status = 200;
       var stat = IO.File.stat(filepath);
       var cookies = (httpOpts && httpOpts.cookies) ? httpOpts.cookies : undefined;
       this.content = this.genHeader("200", "ok", contentType, stat.size, cookies);
       this.filepath = filepath;
       return this;
   },


    /**
    * Set content of a 200 response.
    * @param contentType
    * @param content
    * @param httpOpts
    * @returns {HTTP.Response} this
    */
   setContent: function(/** String */contentType, /** String */content, /** Object */httpOpts) {
       this.status = 200;
       if (httpOpts && httpOpts.contentType) {
           contentType = httpOpts.contentType;
       }
       var cookies = (httpOpts && httpOpts.cookies) ? httpOpts.cookies : undefined;
       this.content = this.genHeader("200", "ok", contentType, content.length, cookies) + content;
       return this;
   },


    /**
     * @private
     */
    genHeader: function(/** String */status, /** String */reason, /** String */contentType, /** Number */contentLength, /** HTTP.Cookie[] */cookies) {
	var txt =  "HTTP/1.1 " + status + " " + reason + "\r\n";
	txt +=     "content-type: " + contentType + "\r\n";
	txt +=     "content-length: " + contentLength + "\r\n";
	txt +=     "cache-control: no-cache\r\n";
	if (cookies) {
	    cookies.forEach(function(cookie) {
		txt += "set-cookie: " + cookie + "\r\n";
	    });
	}
	txt +=     "\r\n";
	return txt;
    },


   /**
    * Serve application data. The user-provided data object is embedded in the standard
    * response object returned by the server. A property 'code' is added with value 0
    * to indicate success. Thus, 'code' should not be used in the data object.
    * @param data      Optional, application data, if undefined, a standard ok response is returned by the
    * server
    * @param httpOpts  Optional, response options, its property 'contentType' may override the default
    * content type of the response
    * @returns {HTTP.Response} this
    */
   setData: function(/** Object */data, /** Object */httpOpts) {
       this.status = 200;
       // if( !(data!=null && 'code' in data) ) {
       // 	   var content = { code: 0 };
       //     for (var p in data) {
       //         content[p] = data[p];
       //     }
       // 	   data = content;
       // }
       var contentType = 'application/json';
       var s = JSON2.stringify(data);
       return this.setContent(contentType, s, httpOpts);
   },
    
    /**
     * Serve an application AOP.Result instance. The object is marshalled and set in this
     * Response object.
     * @param err       AOP.Result instance
    * @param httpOpts  Optional, response options, its property 'contentType' may override the default
    * content type of the response
    * @returns {HTTP.Response} this
    */
   setResult: function(/** AOP.Result */result, /** Object */httpOpts) {
       assert(typeof(result.code)=='number');
       this.status = 200;
       var content;
       try {
           content = Util.Blob.marshal(result);   
       } catch (x) {
           QUACK(0, Runtime.dumpException(x, "Marshal failed for: " + result));
           Runtime.exit(1);
       }
       var contentType = 'application/json';
       var s = JSON2.stringify(content);
       return this.setContent(contentType, s, httpOpts);
   },

   
   /**
    * @returns {String} string.
    */
   toString: function() {
      return "HTTP.Response: " + this.status;
   }
};


// /**
//  * @constant
//  * @type HTTP.Response
//  * @private
//  */
// HTTP.Response.BAD_INSTANCE = null;

    
// /**
//  * @constant
//  * @type HTTP.Response
//  * @private
//  */
// HTTP.Response.getBadInstance = function() {
//     if (HTTP.Response.BAD_INSTANCE == null) {
//        HTTP.Response.BAD_INSTANCE = (new HTTP.Response()).setBadRequest();
//     }
//     return HTTP.Response.BAD_INSTANCE;
// };


