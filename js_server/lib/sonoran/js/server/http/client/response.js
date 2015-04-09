//  (C) COPYRIGHT INTERNATIONAL BUSINESS MACHINES CORPORATION 2006-2010
//                       ALL RIGHTS RESERVED
//        IBM Research Division, Zurich Research Laboratory
// --------------------------------------------------------------------


/**
 * HTTP.Client.Response encapsulates an HTTP response.
 * @class 
 * @constructor
 */
HTTP.Client.Response = function() {
   this.code = -1;
   this.contentType = null;
   this.contentLength = null;
   this.hdr = null;
   this.body = null;
   this.bytes = "";
   this.cookies = [];
};

/** Prototype */
HTTP.Client.Response.prototype = {
   /**
    * Status code
    * @type Number
    */
   code: null,
   /**
    * Content type
    * @type String
    */
   contentType: null,
   /**
    * Content length
    * @type Number
    */
   contentLength: null,
   /**
    * Response header
    * @type String
    */
   hdr: null,
   /**
    * Response cookies.
    * @type HTTP.Client.Cookie[]
    */
   cookies: null,
   /**
    * Response body after header
    * @type String
    */
   body: null,

   /**
    * @private
    */
   bytes: null,

   /**
    * @returns {Number} status code
    */
   getCode: function() {
      return this.code;
   },

   /**
    * @returns {String} response body
    */
   getBody: function() {
      return this.body;
   },

   /**
    * @return {String} response header
    */
   getHeader: function() {
      return this.hdr;
   },

    /**
    * @return {HTTP.Client.Cookie[]} response cookies
    */
   getCookies: function() {
      return this.cookies;
   },

   /**
    * @return {String} Response location if set in header
    */
   getLocation: function() {
      return this.location;
   },

   /**
    * @return {String} Response content-length if set in header
    */
   getContentLength: function() {
      return this.contentLength;
   },

   /**
    * @return {String} Response content-type if set in header
    */
   getContentType: function() {
      return this.contentType;
   },
     
   /**
    * @returns {String} string.
    */
   toString: function() {
      return "HTTPResponse:" + this.code + ", " + this.contentType + ", " +  this.contentLength;
   },

   /**
    * @returns {String} info
    */
   getInfo: function() {
      var txt = "HTTP-response:  " + this.code + "\n";
      txt +=    "Content-type:   " + this.contentType + "\n";
      txt +=    "Content-length: " + this.contentLength + "\n";
      txt +=    this.body;
      return txt;
   },

   /** @private */
   recv: function(data) {
      this.bytes += data;
      //QUACK(0, "BYTES:\n" + this.bytes);
      if (this.hdr==null) {
	 var i = 0;
	 while(true) {
	    if (i > this.bytes.length-4) {
	       // no header yet
	       return false;
	    }
            
	    if (this.bytes.charAt(i) == '\r' && this.bytes.charAt(i+1) == '\n' &&
		this.bytes.charAt(i+2) == '\r' && this.bytes.charAt(i+3) == '\n') {
	       this.haveHeader = true;
	       this.hdr = this.bytes.substr(0, i);
	       this.bytes = this.bytes.substr(i+4);
	       break;
	    }
	    i += 1;
	 }
	 var lines = this.hdr.split('\r\n');
	 for (i = 0; i < lines.length; i++) {
	    var l = lines[i];
	    var md = null;
	    if ((md = /HTTP[^ ]+ (\d+)/.exec(l)) != null) {
	       this.code = parseInt(md[1]);
               continue;
	    }
            var v = this.parseHdr(l, "content-length");
            if (v) {
               if ((md = /(\d+)/.exec(v)) != null) {
                  this.contentLength = parseInt(md[1]);
               }
               continue;
            }
            v = this.parseHdr(l, "content-type");
            if (v) {
               if ((md = /([^ ]+)/.exec(v)) != null) {
                  this.contentType = md[1];
               }
               continue;
            }
            v = this.parseHdr(l, "location");
            if (v) {
               if ((md = /([^ ]+)/.exec(v)) != null) {
                  this.location = md[1];
               }
               continue;
            }
            v = this.parseHdr(l, "set-cookie");
            if (v) {
               var cookie = this.parseCookie(v);
               this.cookies.push(cookie);
               continue;
            }
            v = this.parseHdr(l, "transfer-encoding");
            if (v) {
               this.transferEncoding = v.toLowerCase();
               continue;
            }
	 }
      }
       
     if (this.contentLength != null && this.bytes.length >= this.contentLength) {
	  this.body = this.bytes;
	  return true;
      }
      if (this.transferEncoding=='chunked') {
         var s = this.bytes;
	 while(true) {
            if (!s || s.length<3) {
               break;
            }
            var md = /^[\s\r\n]*([0-9a-fA-F]+)\s*\r\n/.exec(s);
            if (!md) {
               this.body = this.bytes;
               return true;
            }
            var cnt = parseInt(md[1], 16);
            if (cnt == 0) {
               this.body = this.bytes;
               return true;
            }
            var l = md[1].length+2;
            s = s.substr(l + cnt);
         }
      }
      return false;
    },

   /**
    * HTTP socket has been closed. Tries to make something out of the data we have so far.
    * @returns {Boolean} true if this is a valid response at close time.
    */
   onClose: function() {
      if (this.hdr != null) {
	 this.body = this.bytes;
	 return true;
      }
      return false;
    },

   /**
    * @private
    */
   parseHdr: function(line, key) {
      //var s = line.toLowerCase();
      var re = new RegExp("^" + RegExp.escape(key+":"), "i");
      if (!re.test(line)) {
         return null;
      }
      return line.trim().substr(key.length+1);
   },


   /**
    * Parse a chunked body.
    * @returns {Object[]} array of chunks or null in case of invalid body
    */
   parseChunkedBody: function() {
      assert(this.transferEncoding=='chunked');
      var s = this.bytes;
      var ret = [];
      while(true) {
         if (!s || s.length<3) {
            return null;
         }
         var md = /^[\s\r\n]*([0-9a-fA-F]+)\s*\r\n/.exec(s);
         if (!md) {
            return null;
         }
         var cnt = parseInt(md[1], 16);
         if (cnt == 0) {
            this.body = this.bytes;
            return ret;
         }
         var l = md[1].length+2;
         var seg = s.substr(l);
         ret.push(seg);
         s = s.substr(l + cnt);
      }
   },

   
   /**
    * @private
    */
   parseCookie: function(s) {
      var sa = s.split(";");
      var c = null;
      for (var i = 0; i < sa.length; i++) {
         var l = sa[i].trim();
         var md = /([^=]+)=(.*)/.exec(l);
         if (!md) {
            return null;
         }
         var n = md[1];
         var v = md[2];
         if (i == 0) {
            c = new HTTP.Client.Cookie(n, v);
            continue;
         }
         if (!c) {
            return null;
         }
         for (var j = 0; j < HTTP.Client.Cookie.ATTRS.length; j++) {
            var attr = HTTP.Client.Cookie.ATTRS[j];
            if (n.toLowerCase() == attr.toLowerCase()) {
               c[attr] = v;
            }
         }
      }
      return c;
   }
};
