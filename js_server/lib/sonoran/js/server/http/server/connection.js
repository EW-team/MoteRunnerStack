//  (C) COPYRIGHT INTERNATIONAL BUSINESS MACHINES CORPORATION 2006-2010
//                       ALL RIGHTS RESERVED
//        IBM Research Division, Zurich Research Laboratory
// --------------------------------------------------------------------



/**
 * HTTP.Connection represents an HTTP client connection.
 * @class
 * @constructor
 * @param server The server of this connection
 * @param sock    TCP socket
 */
HTTP.Connection = function(/** HTTP.Server */server, /** TCP.Socket */sock) {
    var _this = this;
    this.server = server;
    this.parser = null;
    this.queue = [];
    this.sock = sock;
    this.sock.onClose = function(status) {
        QUACK(1, "HTTP.Connection.onClose: " + _this.sock);
    };
    this.sock.onBlob = this.onBlob.bind(this);
};

/** Prototype */
HTTP.Connection.prototype = {
    /**
     * HTTP server instance.
     * @type HTTP.Server
     * @private
     */
    server: null,
    /**
     * Array of outstanding request/response pairs. 
     * @type Array
     * @private
     */
    queue: null,
    /**
     * Request parser.
     * @type HTTP.Request.Parser
     */
    parser: null,
    /**
     * TCP socket
     * @type IO.TCPSocket
     */
    sock: null,
    
    /**
     * Return server.
     * @returns {HTTP.Server}
     */
    getServer: function() {
        return this.server;
    },

    /**
     * @param blob
     * @private
     */
    onBlob: function(/** Object */blob) {
        if (!this.parser) {
	    this.parser = new HTTP.Request.Parser(this);
        }
        var flag;
        try {
            flag = this.parser.onData(blob.data);
        } catch (x) {
            QUACK(0, Runtime.dumpException(x, "HTTP request parsing failed: " + x));
            this.respond(new HTTP.Request(), HTTP.Response.getBadInstance());
            this.parser = null;
            return;
        }
        if (flag) {
	    var request = this.parser.request;
            this.parser = null;
            try {
		this.queue.push({ rq: request, rsp: null });
	        this.server.onRequest(request);
            } catch(x) {
                QUACK(0, Runtime.dumpException(x, "HTTP request execution failed: " + x));
                this.respond(new HTTP.Request(), HTTP.Response.getBadInstance());
            }
	    
        }
    },
    
    
    /**
     * Add response to the request pipeline of this connection. Responses are
     * sent according to the arrival of their requests.
     * @param rq   The http request
     * @private
     */
    respond: function(/** HTTP.Request */rq) { //, /** HTTP.Response */rsp) {
	assert(arguments.length==1);
	var rsp = rq.response;
        assert(rsp.status);
        assert(rsp.content);
	
        var queue = this.queue;
        for (var i = 0; i < queue.length; i++) {
	    var entry = queue[i];
	    if (entry.rq == rq) {
	        entry.rsp = rsp;
	        break;
	    }
        }
        
        // Try to write responses.
        while(queue.length>0) {
	    var entry = queue[0];
	    rsp = entry.rsp;
	    if (rsp == null) {
                break;
            }
	    //QUACK(0, "HTTP-Response", "id: " + this.sock.id + ", " + entry.rsp.toString());
	    if (QUACK_LEVEL >= 1) {
                QUACK(1, "HTTP-Response", "id: " + this.sock.id + ", " + rsp.toString());
	    }
	    queue.shift();
	    if (this.sock.id < 0) {
                QUACK(1, "HTTP-Connection", "ignore write to closed connection " + this.sock.id);
	    } else {
                //QUACK(0, "HTTP-Response", "id: " + this.sock.getId() + ", " + rsp.content);
                assert(rsp.content);
		try {
	            this.sock.send(rsp.content);
                    var fp = rsp.filepath;
                    if (fp) {
			this.sock.send(fp, true);
                    }
		} catch(ex) {}
            }
        }
        if (queue.length>0) {
	    QUACK(0, "HTTP.Connection", "detected pipeline with pending responses..");
        }
    },


    /**
     * Respond HTTP error. Set HTTP.Response instance and call connection to send response.
     * @param request
     * @param status
     * @param reason
     * @param contentType
     */
    respondHTTP: function(/**  HTTP.Request */request, /** Number */status, /** String */reason, /** String */contentType) {
	request.respondHTTP(status, reason, contentType);
    },

    
    /**
     * Respond HTTP bad request error.
     * @param request
     * @param content Optional
     */
    respondBadRequest: function(/**  HTTP.Request */request, /** String */content) {
	request.respondBadRequest(content);
    },
    
	
    /**
     * Serve application ok/err instance. Set HTTP.Response instance and call connection to send response.
     * @param request
     * @param ok         AOP.Result instance
     * @param httpOpts   Optional, httpOpts.contentType may specify non-default content type
     */
    respondResult:  function(/**  HTTP.Request */request, /** AOP.Result */ok, httpOpts) {
	request.respondResult(ok, httpOpts);
    },
    
	
    /**
     * Serve application data. Set HTTP.Response instance and call connection to send response.
     * @see HTTP.Response#setData
     * @param request
     * @param data      Optional, object, embedded in server response and converted to JSON
     * @param httpOpts  Optional, httpOpts.contentType may specify non-default content type
     */
    respondData: function(/** HTTP.Request */request, /** Object */data, /** Object */httpOpts) {
	request.respondData(data, httpOpts);
    },
    
    
    /**
     * @param request
     * @param status
     * @param content
     * @private
     */
    respondRaw: function(/**  HTTP.Request */request, /** Number */status, /** String */content) {
	request.respondRaw(status, content);
    }
};









/**
 * HTTP.Cookie
 * @class
 * @constructor
 */
HTTP.Cookie = function(/** String */name, /** String */value) {
    this.name = name;
    this.value = value;
    this.path = "/";
    this.maxage = -1;
    this.domain = null;
    this.expires = -1;
};

/** Prototype */
HTTP.Cookie.prototype = {
    /**
     * @nodoc
     */
    __constr__: "HTTP.Cookie",

    /**
     * @param domain
     */
    setDomain: function(/** String */domain) {
	this.domain = domain;
    },    
	
    /**
     * @returns {String}
     */
    getDomain: function() {
	return this.domain;
    },

    /**
     * @param name
     */
    setName: function(/** String */name) {
	this.name = name;
    },    
	
    /**
     * @returns {String}
     */
    getName: function() {
	return this.name;
    },

    /**
     * @param value
     */
    setValue: function(/** String */value) {
	this.value = value;
    },    
	
    /**
     * @returns {String}
     */
    getValue: function() {
	return this.value;
    },

    /**
     * @param path
     */
    setPath: function(/** String */path) {
	this.path = path;
    },    
	
    /**
     * @returns {String}
     */
    getPath: function() {
	return this.path;
    },

    /**
     * @param maxage
     */
    setMaxAge: function(/** Number */maxage) {
	assert(maxage>0);
	this.maxage = maxage;
	this.expires = Clock.get() + this.maxage*1000;
    },    
	
    /**
     * @returns {Number}
     */
    getMaxAge: function() {
	return this.maxage;
    },

    /**
     * @returns {Boolean}
     */
    hasExpired: function() {
	return (this.expires > 0 && Clock.get() > this.expires);
    },

    /**
     * @returns {String}
     */
    toString: function() {
	var sa = [];
	sa.push(this.name + '=' + this.value);
	sa.push("Path=" + this.path);
	if (this.maxage>0) {
	    sa.push("Max-age=" + this.maxage);
	}
	return sa.join("; ");
    }
};
