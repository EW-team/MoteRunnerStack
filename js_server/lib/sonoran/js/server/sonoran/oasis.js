//  (C) COPYRIGHT INTERNATIONAL BUSINESS MACHINES CORPORATION 2006-2010
//                       ALL RIGHTS RESERVED
//        IBM Research Division, Zurich Research Laboratory
// --------------------------------------------------------------------


/**
 * @constant
 * @type RegExp
 * @private
 */
Oasis.ANY_REGEXP =  /^.+$/;

/**
 * @constant
 * @type RegExp
 * @private
 */
Oasis.FILE_NAME_REGEXP =  /^[\w\d_\:\.\-\ ]+$/;

/**
 * The http server.
 * @type HTTP.Server
 * @private
 */
Oasis.httpServer = null;

/**
 * The http port.
 * @type Number
 * @private
 */
Oasis.httpPort = parseInt(IO.Process.getenv("SONORAN_HTTP_PORT"));
if (!Oasis.httpPort) {
    Oasis.httpPort = 5000;
}

/**
 * Storage channel name
 * @type String
 * @private
 */
Oasis.storageChannelName = 'Storage';

/**
 * Console channel name
 * @type String
 * @private
 */
Oasis.consoleChannelName = 'Console';

/**
 * Event channel name
 * @type String
 * @private
 */
Oasis.eventsChannelName = 'Events';


/**
 * Event channel name
 * @type String
 * @private
 */
Oasis.moteletChannelName = 'Motelet';





/**
 * Boot sequence for oasis.
 * @param options HTTP.Server.Options
 * @private
 */
 Oasis.start = function(/** HTTP.Server.Options */options) {
     assert(Oasis.httpPort, "Oasis.httpPort: " + Oasis.httpPort);
     if (!options) { options = new HTTP.Server.Options(); }
     
     var httpServer = Oasis.httpServer = new HTTP.Server(options);
     if( IO.File.isDir(REPO_ROOT+"/gac") ) {
	 // We're in a Mote Runner environment
	 httpServer.addFileHandler(REPO_ROOT+"/examples", "/examples");
	 httpServer.addFileHandler(REPO_ROOT+"/lib/web",  "/web");
	 httpServer.addFileHandler(REPO_ROOT+"/lib/web",  "/mrshell",   "mrshell.html");
	 httpServer.addFileHandler(REPO_ROOT+"/lib/web",  "/timeline",  "timeline.html");
	 httpServer.addFileHandler(REPO_ROOT+"/lib/web",  "/netview",  "netview.html");
	 httpServer.addFileHandler(REPO_ROOT+"/lib/web",  "/launchpad", "launchpad.html");
	 httpServer.addFileHandler(REPO_ROOT+"/doc",      "/doc");
	 httpServer.addFileHandler(REPO_ROOT+"/firmware", "/firmware");
	 httpServer.addFileHandler(REPO_ROOT+"/gac",      "/gac",       "gac.htm");
     }
     
    // scan resources and motelets
    Sonoran.Resource.Motelets.Current.getDescr();

     // On first connection, do
     var onacceptf = function() {
	 var registry = Channels.Registry;
	 // Broadcast events on channels
	 Sonoran.Registry.addListener(function(ev) { 
	     if (ev.category===Sonoran.EV_CAT_SONORAN && ev.evname===Sonoran.EV_NAME_MOTELET) {
		 registry.broadcastObject(ev, Oasis.moteletChannelName);
	     } else {
		 registry.broadcastObject(ev, Oasis.eventsChannelName);
	     }
	 });
	 
         // Broadcast resource change on storage channel
	 Sonoran.Resource.onChangeListeners.add(function() {
             registry.broadcastObject({}, Oasis.storageChannelName);
	 });
	 
         // Broadcast console messages
         CONSOLE_LISTENERS.add(function(text) {
             registry.broadcastObject(new AOP.OK(text), Oasis.consoleChannelName);
         });
         
         // Log system exception
	 Runtime.addSystemExceptionHandler(function(ex, msg) {
	     var s = "Unhandled exception catched: ";
	     s += Runtime.dumpException(ex, msg);
	     Logger.log(Logger.ERR, Logger.SONORAN, s);
	 });
     };

     httpServer.onAccept = function(conn) {
	 httpServer.onAccept = function(){};
	 onacceptf();
     };

     httpServer.onRequest = function(request) {
	 if (httpServer.callRequestHandlers(request)) {
	     return;
	 }
	 request.respond((new HTTP.Response()).setRedirect("/launchpad"));
     };


     
     var status = httpServer.open(Oasis.httpPort, SCB);
     if (status.code !== 0) {
	 throw sprintf("Could not start HTTP server on port %d: %s", Oasis.httpPort, status);
     }

     Channels.Registry.addFactory(new Channels.Factory(Oasis.storageChannelName));
     Channels.Registry.addFactory(new Channels.Factory(Oasis.consoleChannelName));
     Channels.Registry.addFactory(new Channels.Factory(Channels.shellChannelName, function(ctx) {
	     return new Channels.CLIChannel(Channels.shellChannelName, ctx);
     }));
     Channels.Registry.addFactory(new Channels.Factory(Channels.terminalChannelName, function(ctx) {
	     return new Channels.CLIChannel(Channels.terminalChannelName, ctx);
     }));
     // var msgtypes = Sonoran.Event.NAMES.concat([ "dust-ev", Event.LOG ]);
     // if (typeof(KTV) !== 'undefined') {  // if someone uses ktv
     // 	 msgtypes.push(KTV.EVENT_MSGTYPE);
     // }
     // for (var i = 0; i < msgtypes.length; i++) {
     // 	     if (msgtypes[i] === Sonoran.Event.MOTE_REGISTER) {
     // 	     Channels.Registry.addFactory(new Channels.Factory(Sonoran.Event.MOTE_REGISTER, function(client) {
     // 		 var chan = new Channels.Channel(Sonoran.Event.MOTE_REGISTER, client);
     // 		 chan.push(Oasis.getOnConnectState());
     // 		 return chan;
     // 	     }));
     // 	 } else {
     // 	     Channels.Registry.addFactory(new Channels.Factory(msgtypes[i])); 
     // 	 }
     // }
     
     Channels.Registry.addFactory(new Channels.Factory(Oasis.eventsChannelName, function(client) {
	     //var chan = new Channels.Channel(Oasis.eventsChannelName, client);
	     var chan = new Oasis.EventsChannel(Oasis.eventsChannelName, client);
	     chan.push(Oasis.getOnConnectState());
	     return chan;
     }));

     Channels.Registry.addFactory(new Channels.Factory(Oasis.moteletChannelName, function(client) {
	     var chan = new Channels.Channel(Oasis.moteletChannelName, client);
	     return chan;
     }));

     //Oasis.httpServer.addController("Oasis", "Oasis.Controllers.Oasis");
     httpServer.addHandler("/Oasis", this.onOasisRequest.bind(Oasis));

     httpServer.addWebsocket("/Oasis/createWebSocket", function(websock) {
	 //println("Create channels client!");
	 var client = new Channels.HTML5Client(websock);
	 client.setCloseListener(function(client) {
	     //println("Client closed.");
	 });
     });
 };




/**
 * Oasis request handler.
 * @param request
 * @private
 */
Oasis.onOasisRequest = function(/** HTTP.Request */request) {
    var paras = request.paras;
    var path = request.path.replace(/\/+$/, "");
    //println("Oasis.onOasisRequest: " + path);

    if (path == "/Oasis/createSession") {
	var uuid = Util.UUID.createGUID2();
	request.respondData({ sessionid: uuid });
	return;
    }

    if (path == "/Oasis/closeSession") {
	request.respondData({});
	return;
    }

    if (path == "/Oasis/isAlive") {
	var data = Sonoran.Resource.Motelets.Current.getDescr();
	request.respondResult(new AOP.OK(data));
	return;
    }

    if (path == "/Oasis/exit") {
	QUACK(0, "Oasis.onOasisRequest", "exit on http exit request.");
	Runtime.exit(50);
    }
};




/**
 * @returns {HTTP.Server} the oasis http server
 * @private
 */
Oasis.getHTTPServer = function() {
    return Oasis.httpServer;
};



/**
 * @returns {Oasis.Info} the state returned when a client connects to Sonoran
 * @private
 */
Oasis.getOnConnectState = function() {
    var saguaroInfo;
    var moteTypes;
    moteTypes = Sonoran.Resource.getMoteDlls();
    var conn = Saguaro.Connection.getConnection();
    saguaroInfo = conn ? conn.getInfo() : new Saguaro.Info();
    var moteList = Sonoran.Registry.getMotes().map(function(m) { return new Sonoran.MoteInfo(m); });
    return new Oasis.Info(moteTypes, moteList, saguaroInfo);
};









Channels.Channel.extend(
    "Oasis.EventsChannel",
    /**
     * @lends Oasis.EventsChannel.prototype
     */
    {
	/**
	 * @augments Channels.Channel
	 * @constructs
	 * @param name
	 * @param client
	 * @private
	 */
	__constr__: function(/** String */name, /** Channels.Client */client) {
	    assert(name);
	    assert(client);
	    Channels.Channel.call(this, name, client);
	    this.evCat2NameFilter = null;
	},

        /**
         * Called when channel is removed from session.
	 * @private
         */
        onClose: function(/** String */reason) {},

	/**
	 * @param ev
	 * @param obj
	 * @returns {Boolean} whether channel or client connection filtered the event or true if sent 
	 */
	addObject: function(/** Object */ev, /** Object */obj) {
	    if (this.evCat2NameFilter) {
		var category = ev.category;
		var name = this.evCat2NameFilter[category];
		if (!name) {
		    return;
		}
		if (name !== true) {
		    if (typeof(name) === 'string') {
			if (name !== ev.evname) {
			    return;
			}
		    } 
		    if (!name[ev.evname]) {
			return;
		    }
		}
	    }
	    Channels.Channel.prototype.addObject.call(this, ev, obj);
	},

        /**
         * A http request on a channel from a client. Return data to return to caller or null for simple ack.
         * @param params      Request parameters
	 * @private
         */
        onRequest: function(/** Object */paras) {
	    //QUACK(0, "onRequest: " + Util.formatData(paras));
	    if (paras.evCat2NameFilter) {
		this.evCat2NameFilter = paras.evCat2NameFilter;
	    }
        },


	/**
	 * @private
	 */
	toString: function() {
	    return "Oasis.EventsChannel";
	}
    }
);



