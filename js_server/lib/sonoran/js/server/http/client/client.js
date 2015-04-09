//  (C) COPYRIGHT INTERNATIONAL BUSINESS MACHINES CORPORATION 2006-2010
//                       ALL RIGHTS RESERVED
//        IBM Research Division, Zurich Research Laboratory
// --------------------------------------------------------------------

/**
 * HTTP.Client implements a simple HTTP client.
 * @class
 * @constructor
 */
HTTP.Client = function() {
   this.rq = null;
   this.rsp = null;
   this.timeout = 3000;
   this.version = "1.0";;
};


/** Prototype */
HTTP.Client.prototype = {
   /**
    * Target web host
    * @type String
    */
   host: null,
   /**
    * Target web port
    * @type Number
    */
   port: null,
   /**
    * The underlying TCP socket.
    * @type IO.TCP.Socket
    */
   sock: null,
   /**
    * Current request.
    * @type HTTP.Client.Request
    */
   rq: null,
   /**
    * Current response.
    * @type HTTP.Client.Response
    */
   rsp: null,
   /**
    * Timer for current request.
    * @private
    */
   timer: null,
   /**
    * Timeout for requests, default 3000.
    * @private
    */
   timeout: null,
   /**
    * Version, default "1.0"
    * @private
    */
   version: null,

   /**
    * Open connection
    * @param host
    * @param port
    * @param callback
    */
   open: function(/** String */host, /** Number */port, /** DFLT_ASYNC_CB */callback) {
       if (BC.is(callback)) { return BC.exec(arguments.callee, this, arguments); }
      this.host = host;
      this.port = port;
      this.sock = new IO.TCPSocket();
      this.sock.onBlob = this.onBlob.bind(this);
      this.sock.onClose = this._onClose.bind(this);
      this.sock.open(host, port, callback);
   },

   /**
    * Close this http connection.
    * @param status AOP.OK or AOP.ERR instance
    * @param callback
    */
   close: function(/** AOP.OK */status, /** DFLT_ASYNC_CB */callback) {
       if (BC.is(callback)) { return BC.exec(arguments.callee, this, arguments); }
      if (this.sock) {
         this.sock.close(status, callback);   
      } else {
         if (callback) {
            callback(status);
         }
      }
   },
   
   /**
    * @returns {Number} timeout
    */
   getTimeout: function() {
      return this.timeout;
   },

   /**
    * Set timeout (millis)
    * @param timeout TImeout in milliseconds
    */
   setTimeout: function(/** Number */timeout) {
      this.timeout = timeout;
   },

   /**
    * @returns {String} version
    */
   getVersion: function() {
      return this.version;
   },

   /**
    * Set version to use (1.0 or 1.1).
    * @param version "1.0" or "1.1"
    */
   setVersion: function(/** String */version) {
      assert(version=="1.0"||version=="1.1");
      this.version = version;
   },
   
   /**
    * @return {String} string.
    */
   toString: function() {
      return "HTTPClient:" + this.host + ":" + this.port;
   },

   /**
    * Returns {String} info.
    */
   getInfo: function() {
      return this.toString();
   },

   /** @private */
   onBlob: function(blob) {
      if (this.rq == null) {
	 return;
      }
      var ret = this.rsp.recv(blob.data);
      if (ret) {
         this.deliver(new AOP.OK(this.rsp));
      }
   },

   /** @private */
   _onClose: function(result) {
      this.sock = null;
      if (this.rsp && this.rsp.onClose()) {
	 this.deliver(new AOP.OK(this.rsp));
      } else {
	 this.deliver(new AOP.ERR("Socket closed"));
      }
      this.onClose(result);
   },

   /** @private */
   onTimeout: function() {
      this.timer = null;
      this.deliver(Timeout2ERR("Request timed out"));
   },

   /** @private */
   deliver: function(result) {
      if (this.timer) {
         Timer.remove(this.timer);
         this.timer = null;
      }
      if (this.rsp) {
         var callback = this.rq.callback;
         this.rsp = null;
         this.rq = null;
         // might issue error or positive result
	 callback(result);
      }
   },

   /**
    * Override to get socket close notification.
    */
   onClose: function(/** AOP.OK */result) {
      QUACK(1, "HTTP.Client", sprintf("%s: got closed: %s", this, result));
   },
   
   /**
    * Send an HTTP.Client.Request
    * @param rq HTTP.Client.Request
    */
   send: function(/** HTTP.Client.Request */rq) {
      assert(this.rsp==null, "request still pending");
      this.rq = rq;
      this.rsp = new HTTP.Client.Response();
      this.timer = Timer.timeoutIn(this.timeout, this.onTimeout.bind(this));
      this.sock.send(rq.bytes);
   },

   /**
    * Issue an http request.
    * @param uri      URI
    * @param method   Optional, HTTP.Client.GET etc.
    * @param hdr      Optional, Map of key to value to appear in header
    * @param cookies  Cookies, optional
    * @param paras     Parameter map, optional
    * @param callback Invoked with AOP.OK where 'data' points to a HTTP.Client.Response object 
    */
   request: function(/** String */uri, /** String */method, /** Object */hdr, /** HTTP.Client.Cookie[] */cookies, /** Object */paras, /** DFLT_ASYNC_CB */callback) {
      assert(arguments.length==6);
       if (BC.is(callback)) { return BC.exec(arguments.callee, this, arguments); }
      return this.send(new HTTP.Client.Request(this.host, this.port, uri, method, hdr, cookies, paras, this.version, callback));
   },


   /**
    * Issue an http get request.
    * @param uri      URI
    * @param hdr      Optional, String[] to appear in header
    * @param cookies  Cookies, optional
    * @param paras    Parameter map, optional
    * @param callback Invoked with AOP.OK where 'data' points to a HTTP.Client.Response object 
    */
   get: function(/** String */uri, /** String[] */hdr, /** HTTP.Client.Cookie[] */cookies, /** Object */paras, /** DFLT_ASYNC_CB */callback) {
      assert(arguments.length==5);
       if (BC.is(callback)) { return BC.exec(arguments.callee, this, arguments); }
      return this.send(new HTTP.Client.Request(this.host, this.port, uri, HTTP.Client.GET, hdr, cookies, paras, this.version, callback));
   },

   /**
    * Issue an http post request.
    * @param uri      URI
    * @param hdr      Optional, String[] to appear in header
    * @param cookies  Cookies, optional
    * @param paras    Parameter map, optional
    * @param callback Invoked with AOP.OK where 'data' points to a HTTP.Client.Response object 
    */
   post: function(/** String */uri, /** String[] */hdr, /** HTTP.Client.Cookie[] */cookies, /** Object */paras, /** DFLT_ASYNC_CB */callback) {
      assert(arguments.length==5);
       if (BC.is(callback)) { return BC.exec(arguments.callee, this, arguments); }
      return this.send(new HTTP.Client.Request(this.host, this.port, uri, HTTP.Client.POST, hdr, cookies, paras, this.version, callback));
   }
};


/**
 * @type String
 * @constant
 */
HTTP.Client.GET  = "GET";

/**
 * @type String
 * @constant
 */
HTTP.Client.PUT  = "PUT";

/**
 * @type String
 * @constant
 */
HTTP.Client.POST = "POST";

/**
 * @type Object
 * @constant
 */
HTTP.Client.JSON_HDR = {
   "User-Agent": "Mozilla/5.0 (Macintosh; U; Intel Mac OS X 10_6_1; en-us) AppleWebKit/532.3+ (KHTML, like Gecko) Version/4.0.3 Safari/531.9",
   "Cache-Control": "max-age=0",
   "X-Requested-With": "XMLHttpRequest",
   "Accept": "application/json, text/javascript, */*",
   "Connection": "keep-alive"
};


/**
 * @type Object   
 * @constant
 */
HTTP.Client.HTML_HDR = {
   "User-Agent": "Srv/1.0",
   "Accept": "*/*",
   "Keep-Alive": "300",
   "Connection": "keep-alive",
   "Cache-Control": "max-age=0"
};




Runtime.include("./request.js");
Runtime.include("./response.js");
Runtime.include("./cookie.js");
