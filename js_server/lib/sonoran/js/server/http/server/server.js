//  (C) COPYRIGHT INTERNATIONAL BUSINESS MACHINES CORPORATION 2006-2010
//                       ALL RIGHTS RESERVED
//        IBM Research Division, Zurich Research Laboratory
// --------------------------------------------------------------------



Runtime.include("./connection.js");
//Runtime.include("./controller.js");
//Runtime.include("./session.js");
Runtime.include("./request.js");
Runtime.include("./response.js");
Runtime.include("./html5.js");
//Runtime.include("./login.js");





Class.define(
    "HTTP.Server",
    /**
     *  @lends HTTP.Server.prototype
     */
    {
	/**
	 * @constructs
	 *  @param options
	 */
	__constr__: function(/** HTTP.Server.Options */options) {
	    this.options = options;
	    this.handlerTab = [];
	},

	/**
	 * The local port.
	 * @type Number
	 * @private
	 */
	port: -1,
	/**
	 * TCP server instance
	 * @type IO.TCPServer
	 * @private
	 */
	tcpserver: null,
	/**
	 * @type HTTP.Server.Options
	 * @private
	 */
	options: null,
	/**
	 * @type Array
	 * @private
	 */
	handlerTab: {},

	
	/**
	 * Create and start the HTTP server.
	 * @param port       Local port
	 * @param callback   Callback
	 * @throws {AOP.Exception}
	 */
	open: function(/** Number */port, /** DFLT_ASYNC_CB */callback) {
	    assert(arguments.length===2, "API change");
	    if (BC.is(callback)) { return BC.exec(arguments.callee, this, arguments); }
	    assert(!this.tcpServer, "HTTP server already started");
	    var _this = this;
	    if (this.options.useSSL) {
		this.tcpServer = SSL.Server.create(this.options.sslOptions);
	    } else {
		this.tcpServer = new IO.TCPServer();  
	    }
	    //this.tcpServer.setBinMode(false);
	    this.tcpServer.onAccept = function(sock) {
		var c = new HTTP.Connection(_this, sock);
		_this.onAccept(c);
	    };
	    this.tcpServer.open(port, function(status) {
		if (status.code === 0) {
		    HTTP.Server.ALL.push(_this);
		}
		callback(status);
	    });
	},


	/**
	 * Close http server
	 * @private
	 */
	close: function(/** DFLT_ASYNC_CB */callback) {
	    if (BC.is(callback)) { return BC.exec(arguments.callee, this, arguments); }
	    var idx = HTTP.Server.ALL.indexOf(this);
	    if (idx >= 0) {
		HTTP.Server.ALL.splice(idx, 1);
	    }
	    this.tcpServer.close(new AOP.OK(), callback);
	},

	
	/**
	 * Return string representation.
	 * @returns {String} string
	 */
	toString: function() {
	    return "HTTPServer:" + this.port;
	},
	
	/**
	 * Called when a new connection has arrived. Override if required.
	 * @param conn     The newly created HTTP connection
	 */
	onAccept: function(/** HTTP.Connection */conn) {},


	/**
	 * @returns {Boolean} True if any handler for prefix is regeistered.
	 */
	isRegistered: function(/** String */prefix) {
	    for (var i = 0; i < this.handlerTab.length; i++) {
		var tuple = this.handlerTab[i];
		if (tuple[0] == prefix) {
		    return true;
		}
	    }
	    return false;
	},
	
	/**
	 * Add handler. Multiple handlers for prefix can be registered.
	 * @param {String} prefix
	 * @param {Function} handler Handler receiving HTTP.Request
	 * @returns {Function} The handler function which can be removed later
	 */
	addHandler: function(prefix, handler) {
	    assert(arguments.length==2);
	    this.handlerTab.push([ prefix, handler ]);
	    return handler;
	},


	/**
	 * Add Websocket handler. 
	 * @param {String} path
	 * @param {Function} onAcceptFunc Called with HTML5.Socket when new socket has been established
	 * @param {Function} onCheckFunc Called with HTML5.Socket when new socket connection is requested; return false when socket is to be rejected
	 * @returns {Function} The handler function which can be removed later
	 */
	addWebsocket: function(path, onAcceptFunc, onCheckFunc) {
	    assert(arguments.length >= 2);
	    var handler = function(request) {
		//println("HTTPServer.addWebsocket: " + path + ", " + request.path);
		if (request.path === path) {
		    if (onCheckFunc && !onCheckFunc(request)) {		    	
			request.respondNotFound();
			return;
		    }
		    var websock = HTML5.upgradeConnection(request);
		    if (websock === null) { // failed, error sent back to browser
			return;
		    }
		    onAcceptFunc(websock);
		}
	    };
	    this.handlerTab.push([ path, handler ]);
	    return handler;
	},

	
	/**
	 * Forward request on connection to controller.
	 * @param request
	 * @private
	 */
	onRequest: function(/** HTTP.Request */request) {
            var path = request.path;
	    //println("HTTPServer.onRequest: path: " + path + ", uri: " + request.uri);
	    if (this.callRequestHandlers(request)) {
		return;
	    }
	    //println("HTTPServer.onRequest: unhandled request: path: " + path + ", uri: " + request.uri);
	    request.respondNotFound();
	},



	/**
	 * Call request handlers to respond to request.
	 * @param request
	 * @returns {Boolean} True if handler responded
	 * @private
	 */
	callRequestHandlers: function(/** HTTP.Request */request) {
	    var path = request.path;
	    assert(path);
	    for (var i = 0; i < this.handlerTab.length; i++) {
		var tuple = this.handlerTab[i];
		if (path.indexOf(tuple[0]) == 0) {
		    tuple[1](request);
		}
		if (!request.isOpen()) {
		    return true;                    // request handled
		}
	    }
	    return false;
	},


	
	/**
	 * @param dir        Root directory to be served
	 * @param prefix     URI prefix (must start with '/')
	 * @param defaultDoc Optional, 'index.html' by default
	 * @returns {Function} Handler 
	 */
	addFileHandler: function(/** String */dir, /** String */prefix, /** String */defaultDoc) {
	    assert(prefix != "/");
	    //println("addFileHandler: " + dir + ", " + prefix);
	    if (!IO.File.isDir(dir)) {
		throw new Exception(sprintf("Invalid 'dir' parameter, not a directory: '%s'", dir));
	    }
	    if (!prefix || (prefix != "/" && (prefix.indexOf("/")!=0 || prefix.charAt(prefix.length-1) == '/')) ) {
		throw new Exception("Invalid file handler prefix - must start with a '/': " + prefix);
	    }
	    if( !defaultDoc ) {
		defaultDoc = "index.html";
	    }
	    var dirpathPrefixesFilepath = function(dir, path) {
		var re = /(\\|\/)+/;
		var dirsa = dir.split(re);
		var pathsa = dir.split(re);
		if (dirsa.length<pathsa.length) {
		    return false;
		}
		for (var i = 0; i < dirsa.length; i++) {
		    if (dirsa[i] != pathsa[i]) {
			return false;
		    }
		}
		return true;
	    };
	    var dir2html = function(/** String */path, /** HTTP.Request */request) {
		var entries = IO.File.listDir(path);
		var sa = [];
		sa.push("<html><head><meta content=\"text/html; charset=UTF-8\" http-equiv=\"content-type\">");
		sa.push(sprintf("<title>Index of file: %s</title>", Util.HTML.quoteHTML(path)));
		sa.push("</head><body>");
		sa.push("<div>");
		sa.push("<p style='margin:10px 0px 10px 0px;font-size=large;'>");
		sa.push(sprintf("Index of file: %s", Util.HTML.quoteHTML(path)));
		sa.push("</p>");
		sa.push("</div>");
		sa.push("<div>");
		sa.push("<ul>");
		entries.forEach(function(e) { 
		    var href = Util.HTML.quoteJS(request.path + '/' + e);
		    var name = Util.HTML.quoteHTML(e);
		    sa.push(sprintf("<li><a href=\"%s\">%s</a></li>", href, name)); 
		});
		sa.push("</ul>");
		sa.push("</div>");
		sa.push("</body>");
		return sa.join("\n");
	    };
	    var handler = function(request) {
		var path = request.path;
		var spec = prefix;
		assert(path.indexOf(prefix) == 0);
		if (path == prefix) {
		    request.respond((new HTTP.Response()).setRedirect(prefix+"/"+request.query));
		    return;
		}
		path = path.substring(prefix.length);
		if (path.indexOf("/") != 0) {
		    return;
		}
		if (/\/+/.test(path)) {
		    if (IO.File.exists(dir + path + defaultDoc)) { // index.html has precedence
			path += defaultDoc;
		    }
		}
		path = dir + path;
		if ((path.charAt(path.length-1) === '/') || (path.charAt(path.length-1) === '\\')) {
		    path = path.substr(0, path.length-1);
		}
		if (IO.File.exists(path)) {
		    if (!dirpathPrefixesFilepath(dir, File.realpath(path))) {
			request.respondBadRequest();
			return;
		    }
		    if (IO.File.isDir(path)) {
			request.respond((new HTTP.Response()).setContent("text/html", dir2html(path, request)));
		    } else {
			var ct = HTTP.mapSuffix2ContentType(path);
			request.respond((new HTTP.Response()).setFilepath(ct, path));
		    }
		}
	    };
	    this.addHandler(prefix, handler);
	}
    },
    
    /**
     *  @lends HTTP.Server
     */
    {
	/** 
	 * Keeps all open HTTP server instances.
	 * @type HTTP.Server[]
	 * @private
	 */
	ALL: []
    }
);







/**
 * Options for HTTP server constructor.
 * @class
 * @constructor
 * @param index
 * @param loginRequired 
 */
HTTP.Server.Options = function(/** String */index, /** Boolean */loginRequired) {
    /**
     * @type Boolean
     */
    this.useSSL = false;
    /**
     * @type Boolean
     */
    this.sslOptions = SSL.Server.DFLT_OPTS;
};







