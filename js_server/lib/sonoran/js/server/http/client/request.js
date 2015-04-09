//  (C) COPYRIGHT INTERNATIONAL BUSINESS MACHINES CORPORATION 2006-2010
//                       ALL RIGHTS RESERVED
//        IBM Research Division, Zurich Research Laboratory
// --------------------------------------------------------------------

/**
 * HTTP.Client.Request Encapsulates HTTP request data
 * @class 
 * @constructor
 * @param host
 * @param port
 * @param uri
 * @param method
 * @param hdr
 * @param paras
 * @param cookies
 * @param callback
 */
HTTP.Client.Request = function(/** String */host, /** Number */port, /** String */uri, /** String */method, /** Object */hdr, /** HTTP.Client.Cookie[] */cookies, /** Object */paras, /** String */version, /** DFLT_ASYNC_CB */callback) {
   assert(arguments.length==9);
   var lines = [];
   this.method = method ? method : HTTP.Client.GET;
   this.uri = uri;
   var s = this.method + ' ';
   if (uri.charAt(0) != '/') {
       s += '/';
   }
   s += uri;
   if (method==HTTP.Client.GET) {
      if (paras) {
         var sa = [];
         for (var k in paras) {
            sa.push(encodeURIComponent(k) + "=" + encodeURIComponent(paras[k]));
         }
         s += '?' + sa.join('&');
      }
   }
   s += " HTTP/" + version;
   lines.push(s);
   lines.push("Host: " + host);
   if (!hdr) {
      hdr = HTTP.Client.HTML_HDR;
   }
   for (var k in hdr) {
      var v = hdr[k];
      lines.push(k + ": " + v);
   }
   var body = "";
   if (method==HTTP.Client.POST) {
      assert(paras!=undefined);
      var sa = [];
      for (var k in paras) {
         sa.push(encodeURIComponent(k) + "=" + encodeURIComponent(paras[k]));
      }
      body = sa.join('&');
      if (!hdr['Content-Type']) {
         lines.push("Content-Type: application/x-www-form-urlencoded");
      }
      if (!hdr['Content-Length']) {
         lines.push(sprintf("Content-Length: %d", body.length));
      }
   }
   this.cookies = cookies;
   if (this.cookies) {
      var sa = [];
      for (var i = 0; i < this.cookies.length; i++) {
         sa.push(this.cookies[i].name + "=" + this.cookies[i].value);
      }
      lines.push("Cookie: " + sa.join("; "));
   }
   this.header = lines;
   this.bytes = lines.join("\r\n") + "\r\n\r\n";
   this.bytes += body;
   //QUACK(0, "REQUEST:\n" + this.bytes);
   this.callback = callback;
};

/** Prototype */
HTTP.Client.Request.prototype = {
   /**
    * GET, POST etc.
    * @type String
    */
   method: null,
   /**
    * URI
    * @type String
    */
   uri: null,
   /**
    * Header sent
    * @type String
    */
   header: null,
   /**
    * Generated HTTP request string
    * @type String
    */
   bytes: null,
   /**
    * Callback function
    * @type DFLT_ASYNC_CB
    */
   callback: null,
   /**
    * @return {String} string
    */
   toString: function() {
      return "HTTPRequest:" + this.method + ',' + this.uri;
   },
   /**
    * @returns {String} info.
    */
   getInfo: function() {
      var txt = "HTTP-request:" + this.method + ',' + this.uri  + "\n";
      txt += this.header.join("\n");
      return txt;
   }
};

