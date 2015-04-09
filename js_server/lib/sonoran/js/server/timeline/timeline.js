//  (C) COPYRIGHT INTERNATIONAL BUSINESS MACHINES CORPORATION 2006-2010
//                       ALL RIGHTS RESERVED
//        IBM Research Division, Zurich Research Laboratory
// --------------------------------------------------------------------


Runtime.include("timeline/timeline.js");



/**
 * Manages the timeline service on the server side.
 * @class
 * @static
 * @private
 */
Dissection.Manager = {
    /**
     * @type Function
     * @private
     */
    listener: null,

    /**
     * Server settings.
     * @type Dissection.ServerSettings
     * @private
     */
    serverSettings: new Dissection.ServerSettings(),

    /**
     * @type Saguaro.Connection
     */
    conn: null,


    /**
     * Restart timeline on server side.
     * @private
     */
    init: function() {
	if (!this.listener) {
	    var conn = Saguaro.Connection.getConnection();
	    this.conn = conn;
	    this.listener = Event.Registry.addListener(this.onEvent.bind(this)); 
	    Dissection.Cruncher.init();
	    assert(Dissection.Cruncher.initStateObj);
	    Channels.Registry.broadcastObject(Dissection.Cruncher.initStateObj, Dissection.CHANNEL_NAME);
	    Channels.Registry.broadcastObject(Dissection.Cruncher.getState(), Dissection.CHANNEL_NAME);
	    this.startEventDeliveryTimer();
	}
    },

    /**
     * Shutdown manager.
     * @private
     */
    fini: function() {
	if (this.listener) {
	    Event.Registry.removeListener(this.listener);
	    this.conn = null;
	    this.listener = null;
	    Dissection.Cruncher.fini();
	    this.timer.cancel();
	   this.timer = null;
	    Channels.Registry.broadcastObject(Dissection.Cruncher.getState(), Dissection.CHANNEL_NAME);
	}
    },

    /**
     * Restart dissection.
     * @private
     */
    restart: function() {
	this.fini();
	this.init();
    },


    /**
     * @returns {Dissection.ServerSettings} Dissection settings.
     * @private
     */
    getServerSettings: function() {
	return this.serverSettings;
    },

    /**
     * Set settings.
     * @param settings
     * @private
     */
    setServerSettings: function(/** Dissection.ServerSettings */settings) {
	this.serverSettings = settings;
    },
    

    /**
     * Event received.
     * @param evt
     * @private
     */
    onEvent: function(/** Event */evt) {
	var category = evt.category;
	var evname = evt.evname;

	if (category===Event.EV_CAT_LOG && !evt.getMote()) {
	    return;
	}

	switch(category) {
	case Sonoran.EV_CAT_SAGUARO: {
	    switch(evname) {
	    case Sonoran.EV_NAME_CONNECT: {
		this.conn = evt.conn;
		Channels.Registry.broadcastObject(this.conn.getInfo(), Dissection.CHANNEL_NAME);
		break;
	    }
	    case Sonoran.EV_NAME_DISCONNECT: {
		this.conn = null;
		Channels.Registry.broadcastObject(new Saguaro.Info(), Dissection.CHANNEL_NAME);
		break;
	    }
	    case Sonoran.EV_NAME_START: {
		Channels.Registry.broadcastObject(this.conn.getInfo(), Dissection.CHANNEL_NAME);
		break;
	    }
	    }
	    break;
	}
	default:
	    var conn = this.conn;
	    if (conn && conn.info.getRunState() !== conn.prevRunState) {
		Channels.Registry.broadcastObject(conn.getInfo(), Dissection.CHANNEL_NAME);
	    }		
	}

	Dissection.Cruncher.addEvent(evt);
    },


    /**
     * Return a DFLT_ASYNC_CB function which logs an error, but otherwise does nothing.
     * @param message
     * @returns {DFLT_ASYNC_CB}
     * @private
     */
    getErrorLoggerCallback: function(/** String */message) {
	return function(result) {
	    if (result.code !== 0) {
		QUACK(0, message + ": " + result.toString());
	    }
	};
    },


    /**
     * @returns {Saguaro.Info}
     * @private
     */
    getSaguaroInfo: function() {
	return this.conn == null ? new Saguaro.Info() : this.conn.getInfo();
    },


    /**
     * @private
     */
    haltConnection: function() {
	if (this.conn) {
	    this.conn.haltCmd(this.getErrorLoggerCallback("Dissection flow control failed: halt failed"));
	}
    },


    /**
     * @private
     */
    contConnection: function() {
	if (this.conn) {
	    this.conn.continueCmd(undefined, undefined, undefined, Dissection.Manager.getErrorLoggerCallback("Dissection flow control failed: continue failed"));
	}
    },


    /**
     * @private
     */
    startEventDeliveryTimer: function() {
	if (this.timer) {
	    this.timer.cancel();
	    this.timer = null;
	}
	var _this = this;
	var timerf = function() {
	    _this.timer = null;
	    _this.pushEvents();
	    _this.timer = new Timer.Timer(_this.getServerSettings().getDeliveryInterval(), undefined, timerf);
	    _this.timer.start();
	};
	timerf();
    },


    /**
     * Deliver events to clients.
     */
    pushEvents: function() {
	var channels = [];
	var clients = Channels.Registry.getClients();
	for (var i = 0; i < clients.length; i++) {
	    var client = clients[i];
	    var ch = client.lookupChannel(Dissection.CHANNEL_NAME);
	    if (ch) {
		channels.push(ch);
	    }
	};
	var queue = Dissection.Cruncher.getDissectedQueue();
	var state = Dissection.Cruncher.getState();
	channels.forEach(function(ch) {
	    ch.pushEvents(queue, state);
	});
    }
};





/**
 * @class
 * @static
 * @private
 */
Dissection.Cruncher = {
    /**
     * Nodes or events.
     * @type Object[]
     * @private
     */
    queue: [],
    /**
     * State of system when crunching started.
     * @type Object
     * @private
     */
    initStateObj: null,

    /**
     * Reset queue, timer and start.
     * @private
     */
    init: function() {
	if (this.initStateObj) {
	    return;
	}

	this.fini();
	this.initStateObj = Oasis.getOnConnectState();
	assert(this.initStateObj);
    },

    /**
     * Reset queue and time and stop.
     * @private
     */
    fini: function() {
	this.initStateObj = null;
	this.queue = [];
    },

    /**
     * @returns {Number}
     * @private
     */
    getDissectedCount: function() {
	return this.queue.length;
    },

    /**
     * @returns {Object[]}
     * @private
     */
    getDissectedQueue: function() {
	return this.queue;
    },


    /**
     * @returns {Dissection.State}
     * @private
     */
    getState: function() {
	return new Dissection.State(this.initStateObj!==null, this.queue.length, this.startTimestamp, this.endTimestamp);
    },

    /**
     * Add event to dissect/handle. Stop simulation if necessary.
     * @param evt
     * @private
     */
    addEvent: function(evt) {
	if (evt.category===Sonoran.EV_CAT_SAGUARO && evt.evname===Sonoran.EV_NAME_CONNECT) {
	    Dissection.Manager.restart();
	}
	this.handleEvent(evt, this.queue);
    },


    /**
     * Handle event and push resulting objects on parameter 'events'.
     * @param evt
     * @param events
     * @private
     */
    handleEvent: function(evt, events) {
	if (evt.category===Event.EV_CAT_LOG && !evt.getMote()) {
	    return;
	}

	if (evt.category==="v6lowpan") {
	    return;
	}
	
	//QUACK(0, "EVT: " + evt.category + ", " + evt.evname);

	this.endTimestamp = evt.getTimeInMicros();
	if (this.startTimestamp <= 0) {
	    this.startTimestamp = this.endTimestamp;
	}

	//if (evt.msgtype === Sonoran.Event.SAGUARO_CONNECT) {
	    //Saguaro.Options.setRadioLogMedia(2, Dissection.Manager.getErrorLoggerCallback("Dissection.Cruncher: cannot enable radio reporting"));
	//}

	var c = evt.category;
	var n = evt.evname;
	if ((c===Sonoran.EV_CAT_SAGUARO && (n===Sonoran.EV_NAME_CONNECT||n===Sonoran.EV_NAME_DISCONNECT||n===Sonoran.EV_NAME_START)) ||
	    (c===Sonoran.EV_CAT_MOTE && (n===Sonoran.EV_NAME_REGISTER||n===Sonoran.EV_NAME_DEREGISTER)) ||
	    (c===Sonoran.EV_CAT_HALT)) {
	    events.push(evt);
	    return;
	}

	var mote;
	//try {
	    mote = typeof(evt.getMote) === 'function' ? evt.getMote() : evt.mote;
	//} catch (x) {
	  //  Runtime.dumpException(x);
	    //QUACK(0, "EV: " + evt);
	//}
	if (!mote) {
	    // can happen for motes wihch were deregistered
	    return;
	}
	var uniqueid = mote.getUniqueid();

	try {
	    // XXX:
	    //if (Sonoran.isRadioTxframeEvent(evt)) {
	    if (Dissection.isTxEvent(evt)) {
		var node1 = new Dissection.Node(evt, evt.txbeg);
		Dissection.dissect(node1);
		assert(node1.outputs);
		events.push(node1);

	    } else {

		var tbeg = evt.getTimeInNanos();
		var node = new Dissection.Node(evt, tbeg);
		if (Dissection.dissect(node)) {
		    assert(node.outputs);
		    assert(node.outputs.length>0);
		    events.push(node);
		}
	    }
	} catch(x) {
	    QUACK(0, "Dissecting following event failed:\n" + evt);
	    QUACK(0, Runtime.dumpException(x));
	    return;
	}
    }
};






Channels.Channel.extend(
    "Dissection.ServerChannel",
    /**
     * @lends Dissection.ServerChannel
     */
    {
	/**
	 * @augments Channels.Channel
	 * @constructs
	 * @param name
	 * @param session
	 * @private
	 */
	__constr__: function(/** String */name, /** Channels.Client */client) {
	    assert(arguments.length===2);
	    Channels.Channel.call(this, name, client);
	    this.position = 0;
	    this.pending = false;
	},

	/**
	 * @type Number
	 * @private
	 */
	position: 0,
	/**
	 * @type Boolean
	 * @private
	 */
	penging: 0,

	/**
	 * @returns {Number}
	 * @private
	 */
	getPosition: function() {
	    return this.position;
	},

	/**
	 * Send events to client if possible.
	 * @param events
	 * @param state
	 * @private
	 */
	pushEvents: function(/** Object[] */events, /** Dissection.State */state) {
	    assert(events.length>=0);
	    var position = this.position;
	    if (this.pending && position >= 0 && position < events.length) {
		var num = Dissection.Manager.getServerSettings().getDeliveryCount();
		var end = (position + num > events.length) ? events.length : (position + num);
		//QUACK(0, "Channel.deliverEvents: from pos " + position + ", cnt " + (end - position));
		this.pending = false;
		var data = events.slice(position, end);
		this.push({
			      start: position,
			      end: end,
			      events: data
			  });
	    }
	    this.push(state);
	},

        /**
         * Called when channel is removed from session.
	 * @private
	 * @private
         */
        onClose: function() {
	    this.pending = false;
	    this.position = 0;
        },

        /**
         * @param params      Request parameters
	 * @private
         */
        onRequest: function(/** Object */paras) {
	    if (paras.operation!==undefined) {
		if (paras.operation==="init") {
		    Dissection.Manager.init();
		} else if (paras.operation==="fini") {
		    Dissection.Manager.fini();
		} else if (paras.operation==="restart") {
		    Dissection.Manager.restart();
		} else if (paras.operation==="halt") {
		    Dissection.Manager.haltConnection();
		} else if (paras.operation==="cont") {
		    Dissection.Manager.contConnection();
		}
		return;
	    }
	    if (paras.position!==undefined) {
		assert(typeof(paras.position==="number"));
		var position = parseInt(paras.position, 10); 
		this.position = position;
		this.pending = true;
		//QUACK(0, "Channel.onRequest: pos " + this.position);
	    }
	}
    }
);



Channels.Registry.addFactory(new Channels.Factory(Dissection.CHANNEL_NAME, function(ctx) {
    var chan = new Dissection.ServerChannel(Dissection.CHANNEL_NAME, ctx);
    chan.push(Dissection.Cruncher.getState());
    var initStateObj  = Dissection.Cruncher.initStateObj;
    if (initStateObj) {
	chan.push(initStateObj);
    }
    chan.push(Dissection.Manager.getSaguaroInfo());
    return chan;
}));

















/**
 * @class
 * @private
 */
Sonoran.CLI.Commands.Dissection = {};


/**
 *   @private
 */
Sonoran.CLI.Commands.Dissection.USAGE = "Timeline";

/**
 * @private
 */
Sonoran.CLI.Commands.Dissection.DESCRIPTION = 
    "Configure Timeline.";


/**
 * @class 
 * @constructor
 * @private
 */
Sonoran.CLI.Commands.Dissection.ControlCommand = function(shell, name) {
    this.description = 
	"Start/stop or restart the dissection of events: 'dissection-control start|stop'\n" +
	"With -d the interval at which events are delivered to clients can be specified (default: 100ms).";
    this.deliveryIntervalSpec = new GetOpt.TimespanSpec(3000, "Delivery Interval.");
    this.deliveryIntervalOpt = new GetOpt.Option(null, "--delivery-interval", 0, null, null, this.deliveryIntervalSpec);
    this.deliveryCountSpec = new GetOpt.Number(null, "Delivery count per interval.");
    this.deliveryCountOpt = new GetOpt.Option(null, "--delivery-count", 0, null, null, this.deliveryCountSpec);
    this.ctrlSpec = new GetOpt.Keywords("control", "start, stop or restart.", [ "start", "stop", "restart" ]);
    var optSet = new GetOpt.OptionSet([ this.deliveryIntervalOpt, this.deliveryCountOpt ]);
    CLI.Command.call(this, shell, name, [ optSet, this.ctrlSpec, new GetOpt.EndOfArgs() ], 0);
};

/** @private */
Sonoran.CLI.Commands.Dissection.ControlCommand.prototype = extend(
    CLI.Command.prototype,
    {
        /** @private */
        exec: function(callback) {
	    var settings = Dissection.Manager.getServerSettings();
	    if (this.deliveryIntervalOpt.isSet() || this.deliveryCountOpt.isSet()) {
		if (this.deliveryIntervalOpt.isSet()) {
		    settings.setDeliveryInterval(this.deliveryIntervalSpec.getSpan());
		}
		if (this.deliveryCountOpt.isSet()) {
		    settings.setDeliveryCount(this.deliveryCountSpec.getNumber());
		}
		Dissection.Manager.setServerSettings(settings);
	    } 
	    var ctrl = this.ctrlSpec.getArg();
	    if (ctrl==="start") {
		Dissection.Manager.init();
	    } else if (ctrl==="stop") {
		Dissection.Manager.fini();
	    } else if (ctrl==="restart") {
		Dissection.Manager.restart();
	    }
	    callback(new AOP.OK(Dissection.Manager.getServerSettings()));
        }
    }
);




CLI.commandFactory.addModule("Sonoran.CLI.Commands.Dissection");


























/**
 * Name of Ieee802154 frame format.
 * @constant
 * @type String
 */
Dissection.Ieee802154_Frame = "Ieee802154-Frame";

/**
 * Name of Ieee802154 payload  format.
 * @constant
 * @type String
 */
Dissection.Ieee802154_Payload =  "Ieee802154-Payload";





/**
 * Array of dissectors handling events independent of msgtype.
 * @type Dissection.Dissector[]
 * @private
 */
Dissection.anyDissectors = [];


/**
 * Filter function.
 * @type Function
 * @private
 */
Dissection.filterFunc = null;


/**
 * @param dissectors
 * @param name
 * @returns {Number} inde of dissector with specified name or -1
 * @private
 */
Dissection.getDissectorIdx = function(/** Dissection.Dissector[] */dissectors, /** String */name) {
    var ret = null;
    for (var i = 0; i < dissectors.length; i++) {
	if (dissectors[i].getName() === name) {
	    return i;
	}
    }
    return -1;
};


/**
 * @param name
 * @returns {Dissection.Dissector} dissector or null
 * @private
 */
Dissection.getDissectorByName = function(/** String */name) {
    var dissectors = this.anyDissectors;
    for (var i = 0; i < dissectors.length; i++) {
	if (dissectors[i].getName() === name) {
	    return dissectors[i];
	}
    }
    return null;
};


/**
 * Register a dissector for an event type. 
 * @param dissector
 */
Dissection.registerDissector = function(/** Dissection.Dissector */dissector) {
    assert(arguments.length===1, "API change");
    var name = dissector.getName();
    if (this.getDissectorByName(name)) {
	throw "Dissector to add is already registered: " + name;
    }
    if (dissector.getMsgtype) {
	throw "Dissector.getMsgtype() is no longer supported";
    }
    this.anyDissectors.push(dissector);
};

/**
 * Deregister a dissector.
 * @param dissector
 */
Dissection.deregisterDissector = function(/** Dissection.Dissector */d) {
    var name = d.getName();
    if (!this.getDissectorByName(name)) {
	throw "Dissector to deregister is not registered yet: " + name;
    }
    var dissectors = this.anyDissectors;
    var idx = this.getDissectorIdx(dissectors, name);
    if (idx >= 0) {
	dissectors.splice(idx, 1);
    }
};



/**
 * Set a filter function. The function receives a Events.Node object and returns
 * true if the object should not be dissected.
 * @param f
 */
Dissection.setFilter = function(/** Function */f) {
    this.filterFunc = f;
};

/**
 * Ask dissectors to dissect specified node.
 * @param node
 * @returns {Boolean} true if output is available
 * @private
 */
Dissection.dissect = function(/** Events.Node */node) {
    if (this.filterFunc) {
	if (this.filterFunc(node) === true) {
	    return false;
	}
    }
    var context = new Dissection.Context(node);
    var evt = node.getEvent();
    var dissectors = this.anyDissectors;
    var output;
    if (dissectors.length>0) {
	while(true) {
	    output = null;
	    for (var i = 0; i < dissectors.length; i++) {
		try {
		    //QUACK(0, "Dissector dissect: " + dissectors[i].getName());
		    output = dissectors[i].dissect(context);    
		} catch (x) {
		    QUACK(0, "Dissector failed: " + x + "\n" + x.stack);
		    continue;
		}
		if (output) {
		    context.addOutput(output);
		    break;
		}
	    }
	    if (output === null) {
		break;
	    }
	}
    }
    
    var outputs = context.getOutputs();
    node.outputs = outputs;

    // add generic json output
    var context = new Dissection.Context(node);
    try {
	output = Dissection.JsonDissector.dissect(context);   
	outputs.unshift(output); 
    } catch (x) {
	QUACK(0, "Dissector failed: " + x + "\n" + x.stack);
    }

    return true;
};












/**
 * Context passed on dissecting a node. Dissectors typically retrieve the previous dissector and
 * decide upon the format of the left payload whether to accept and dissect a packet.
 * @class
 * @constructor
 * @param node 
 */
Dissection.Context = function(/** Dissection.Node */node) {
    this.node = node;
    this.outputs = [];  
};

/** */
Dissection.Context.prototype = {
    /**
     * The event node to dissect.
     * @returns {Dissection.Node}
     */
    getNode: function() {
	return this.node;
    },

    /**
     * @param output If 'undefined', last output in current list of outputs
     * @returns {Dissection.Output}
     */
    getPreviousOutput: function(/** Dissection.Output */output) {
	if (this.outputs.length===0) {
	    return null;
	}
	if (output) {
	    var idx = this.outputs.indexOf(output);
	    return (idx >= 1) ? this.outputs[idx-1] : null;
	}
	return this.outputs[this.outputs.length-1];
    },

    /**
     * @param output If 'undefined', last dissector in current list of outputs
     * @returns {Dissection.Dissector}
     */
    getPreviousDissector: function(/** Dissection.Output */output) {
	output = this.getPreviousOutput(output);
	return (output) ? output.getDissector() : null;
    },

    /**
     * Searches for an output attribute in the chain of outputs starting with specified
     * one (or last one in current chain if unspecified).
     */
    findAttribute: function(/** String */name, /** Dissection.Output */output) {
	var idx;
	if (output) {
	    idx = this.outputs.indexOf(output);
	    if (idx < 0) {
		throw "Cannot find specified 'output' instance in current list";
	    }
	} else {
	    idx = this.outputs.length-1;
	}
	for (var i = idx; i >= 0; i--) {
	    var attr = this.outputs[i].getAttribute(name);
	    if (attr) {
		return attr;
	    }
	}
	return null;
    },

    /**
     * @returns {Dissection.Output[]}
     */
    getOutputs: function() {
	return this.outputs;
    },

    /**
     * @param output
     * @private
     */
    addOutput: function(/** Dissection.Output */output) {
	this.outputs.push(output);
    },


    /**
     * @returns {Dissection.InfoTree} info tree to fill dissected data in
     */
    getInfoTree: function() {
	return new Dissection.InfoTree();
    }
};






/**
 * Template of a dissector. A dissector must provide a name and
 * implement a dissect function.
 * @class
 * @constructor
 * @param name Name of constructor.
 */
Dissection.Dissector = function(/** String */name) {
    this.name = name;
};

Dissection.Dissector.prototype = {
    /**
     * Name of dissector
     * @type String
     */
    name: null,

    /**
     * @returns {String} Name of dissector
     */
    getName: function() {
	return this.name;
    },

    /**
     * Dissect a packet or event and return a Dissection.Output object.
     * If a packet or event is not accepted, this method must return null.
     * The specified 'context' delivers the output of the previous dissector
     * and in case of radio messages the left payload and its format.
     * @param context
     * @returns {Dissection.Output} output or null
     */
    dissect: function(/** Dissection.Context */context) {
	assert(0);
    }
};













/**
 * Dissector for watch-point events. Override its dissect method if 
 * special handling is required.
 * @class
 * @private
 */
Dissection.WatchPointDissector = {
    /**
     * @type String[]
     * @private
     */
    COLORS: [ "brown" ],

    /**
     * @type String
     * @private
     */
    name: "WatchPoint",

    /**
     * @returns {String}
     * @private
     */
    getName: function() {
	return this.name;
    },

    /**
     * @param context
     * @returns {Dissection.Output} output or null
     * @private
     */
    dissect: function(context) {
	if (context.getPreviousOutput()) {
	    return null;
	}
	var color = this.COLORS[0];
	var node = context.getNode();
	var evt = node.getEvent();
	if (evt.category !== Sonoran.EV_CAT_BUGZ) {
	    return null;
	}
	if (evt.evname !== Bugz.WP_HIT_EV) {
	    return null;
	}

	var output = new Dissection.Output(this);

	var tags = [
	    "wp",  evt.getPid()
	];
	var wp = Bugz.getBreakpoints().getWP(evt.getPid());
	var info = context.getInfoTree();
	info.addRow("Watchpoint", evt.getPid());
	if (evt.getError()) {
	    info.addRow("Error", evt.getError());
	}
	var slots = evt.getSlots();
	if (slots && slots.length>0) {
	    for (var i = 0; i < slots.length; i++) {
		var slot = slots[i];
		assert(slot.constructor!==Array);
		//info.addRow(slot.getName(), slot.print());
//QUACK(0, "SLOT: " + slot);
		//info.addRow(wp.getExpr(), slot.print());
		//info.addObj(slot, wp.getExpr());
		Dissection.addJsonInfoTree4Event(info, slot, wp.getExpr());
	    };
	    tags.push(slots[0].toString());
	}
	output.forTimeline(info, color, tags);

	// By default, no animation or netview output for watch-point events
	// if (slots && slots.length>0) {
	//     var actions = output.forNetviewActions(evt.getMote());
	//     var txt = slots[0].print();
	//     actions.add("update", "clabel-w", "content:"+txt, "fillStyle:black");
	// }

	return output;
    }
};

Dissection.registerDissector(Dissection.WatchPointDissector);










/**
 * Dissector for log events.
 * @class
 * @private
 */
Dissection.LogDissector = {
    /**
     * @type String[]
     * @private
     */
    COLORS: [ "lightblue" ],
    
    /**
     * @type String
     * @private
     */
    name: "Log",

    /**
     * @returns {String}
     * @private
     */
    getName: function() {
	return this.name;
    },

    /**
     * @param context
     * @returns {Dissection.Output} output or null
     * @private
     */
    dissect: function(context) {
	if (context.getPreviousOutput()) {
	    return null;
	}
	var color = this.COLORS[0];
	var node = context.getNode();
	var evt = node.getEvent();
	if (evt.category !== Event.EV_CAT_LOG) {
	    return null;
	}
	var info = context.getInfoTree();
	info.addRow("Severity", evt.severity);
	info.addRow("Module", evt.module);
	info.addRow("WTime", evt.wtime);
	info.addRow("Message", evt.logmsg);

	var tags = [
	    "log"
	];
	return (new Dissection.Output(this)).forTimeline(info, color, tags);
    }
};

Dissection.registerDissector(Dissection.LogDissector);





/**
 * Dissector for mote events.
 * @class
 * @static
 * @private
 */
Dissection.MoteDissector = {
    /**
     * @type Object
     * @private
     */
    COLORS: {},

    /**
     * @private
     */
    initialize: function() {
	this.COLORS[Sonoran.EV_NAME_POSITION] = "#a040a0";
	this.COLORS[Sonoran.EV_CAT_LED] = "lightblue";
	this.COLORS.other = "#a040a0";
	Dissection.registerDissector(this);
    },
    
    /**
     * @type String
     * @private
     */
    name: "Mote",

    /**
     * @returns {String}
     * @private
     */
    getName: function() {
	return this.name;
    },

    /**
     * @param context
     * @returns {Dissection.Output} output or null
     * @private
     */
    dissect: function(context) {
	if (context.getPreviousOutput()) {
	    return null;
	}
	var node = context.getNode();
	var evt = node.getEvent();
	var evname = evt.evname;
	var color = this.COLORS[evname];
	if (!color) {
	    color = this.COLORS.other;
	}
	var info = context.getInfoTree();

	switch(evt.category) {
	case Sonoran.EV_CAT_LED: {
	    color = this.COLORS[Sonoran.EV_CAT_LED];
	    info.addRow("no", evt.ledno);
	    info.addRow("event", evt.evname);
	    info.addRow("state", Formatter.binToHex(evt.states));
	    var tags = [ "led" + evt.ledno ];
	    return (new Dissection.Output(this)).forTimeline(info, color, tags);
	    break;
	}
	case Sonoran.EV_CAT_VM: {
	    switch(evt.evname) {
	    case  Sonoran.EV_NAME_ASMCTOR: {
		info.addRow("operation", evt.operation);
		info.addRow("asmid", evt.asmid);
		info.addRow("asmIdentity", evt.asmIdentity);
		var tags = [ "asmCtor" ];
		return (new Dissection.Output(this)).forTimeline(info, color, tags);
	    }
	    }
	    break;
	}
	case Sonoran.EV_CAT_MOTE: {
	    switch(evt.evname) {
	    case  Sonoran.EV_NAME_POSITION: {
		info.addRow("X", evt.x);
		info.addRow("Y", evt.y);
		info.addRow("Z", evt.z);
		var tags = [ "pos" ];
		return (new Dissection.Output(this)).forTimeline(info, color, tags);
	    }
	    case Sonoran.EV_NAME_NAME:
	    case Sonoran.EV_NAME_TYPE: {
		 info.addRow("Event", evname);
		info.addRow("Name", evt.name);
		info.addRow("Type", evt.type);
		var tags = [ "info" ];
		return (new Dissection.Output(this)).forTimeline(info, color, tags);
	    }
	    case Sonoran.EV_NAME_STATE: {
		info.addRow("Event", evname);
		info.addRow("State", evt.state);
		info.addRow("Flags", evt.subState.toString(16));
		var tags = [ "state" ];
		return (new Dissection.Output(this)).forTimeline(info, color, tags);
	    }
	    case Sonoran.EV_NAME_ASSEMBLIES: {
		info.addRow("Event", evname);
		info.addRow("Origin", evt.origin);
		var t = info.newTree("Assemblies");
		var listing = evt.listing;
		var entries = listing.getEntries();
		for (var i = 0; i < entries.length; i++) {
		    t.addRow(entries[i].getId(), entries[i].identity);
		}
		var tags = [ "asms" ];
		return (new Dissection.Output(this)).forTimeline(info, color, tags);
	    }
	    case Sonoran.EV_NAME_ADDRESSES: {
		info.addRow("Event", evname);
		var addrs = evt.addrs;
		for (var i = 0; i < addrs.length; i++) {
		    info.addRow(i.toString(), addrs[i]);
		}
		var tags = [ "addrs" ];
		return (new Dissection.Output(this)).forTimeline(info, color, tags);
	    }
	    }
	    break;
	}
	}

	if (evt.category !== Sonoran.EV_CAT_MOTE) {
	     return null;
	}

	// any other mote event is handled here for now..
	info.addRow("event", evname);
	var tags = [
	    evname
	];
	return (new Dissection.Output(this)).forTimeline(info, color, tags);
    }
};


Dissection.MoteDissector.initialize();









/**
 * Dissector for mote events.
 * @class
 * @static
 * @private
 */
Dissection.GatewayDissector = {
    /**
     * @type Object
     * @private
     */
    COLORS: [ "lightblue" ],

    /**
     * @type String
     * @private
     */
    name: "Gateway",

    /**
     * @returns {String}
     * @private
     */
    getName: function() {
	return this.name;
    },

    /**
     * @param context
     * @returns {Dissection.Output} output or null
     * @private
     */
    dissect: function(context) {
	if (context.getPreviousOutput()) {
	    return null;
	}
	var node = context.getNode();
	var evt = node.getEvent();
	if (evt.category !== Sonoran.EV_CAT_GATEWAY) {
	    return null;
	}

	var evname = evt.evname;
	var color = this.COLORS[0];
	var mote = evt.getMote();

	var output = new Dissection.Output(this);
	var info = context.getInfoTree();
	
	if (evname === Sonoran.EV_NAME_REGISTER) {
	    info.addRow("Type", evname);
	    info.addRow("Gateway", evt.getGatewayUniqueid());
	    var tags = [
		"GW-R"
	    ];
	    output.forTimeline(info, color, tags);
	    //var actions = output.forNetviewActions(mote);
	    //actions.add("update", "clabel-n", "content:WLIP-Gateway", "fillStyle:black");
	    return output;
	}
	if (evname === Sonoran.EV_NAME_DEREGISTER) {
	    info.addRow("Type", evname);
	    info.addRow("Gateway", evt.getGatewayUniqueid());
	    var tags = [
		"GW-D"
	    ];
	    output.forTimeline(info, color, tags);
	    return output;
	}
	if (evname === Sonoran.EV_NAME_HELLO) {
	    info.addRow("Type", evname);
	    info.addRow("Gateway", evt.getGatewayUniqueid());
	    info.addRow("Wireless", evt.getWirelessUniqueid());
	    var tags = [
		"GW-H"
	    ];
	    output.forTimeline(info, color, tags);
	    return output;
	}
	if (evname === Sonoran.EV_NAME_BYE) {
	    info.addRow("Type", evname);
	    info.addRow("Gateway", evt.getGatewayUniqueid());
	    info.addRow("Wireless", evt.getWirelessUniqueid());
	    var tags = [
		"GW-B"
	    ];
	    output.forTimeline(info, color, tags);
	    return output;
	}
	return null;
    }
};

Dissection.registerDissector(Dissection.GatewayDissector);







/**
 * Generic dissector for events.
 * @class
 * @private
 */
Dissection.JsonDissector = {
    /**
     * @type String[]
     * @private
     */
    COLORS: [ "yellow" ],
    
    /**
     * @type String
     * @private
     */
    name: Dissection.JSON_DISSECTOR_NAME,

    /**
     * @returns {String}
     * @private
     */
    getName: function() {
	return this.name;
    },

    /**
     * @param context
     * @returns {Dissection.Output} output or null
     * @private
     */
    dissect: function(context) {
	if (context.getPreviousOutput()) {
	    return null;
	}
	var node = context.getNode();
	var evt = node.getEvent();
	//QUACK(0, "EVT: " + evt.category + ", " + evt.evname + ", " + evt.msgtype);
	var color = this.COLORS[0];
	var tag = evt.evname ? evt.evname : evt.msgtype;
	var tags = [ tag ];
	var info = Dissection.getJsonInfoTree4Event(evt);
	return (new Dissection.Output(this)).forTimeline(info, color, tags);
    }
};















/**
 * Dissector for IEEE802154 frames. Returns Output instances with payload type "Ieee802154-Payload",
 * and an output attribte "Ieee802154-Frame" of type IEEE802154.Frame.
 * @class
 * @private
 */
IEEE802154.Dissector = {
    /**
     * @type String
     * @private
     */
    name:  "IEEE802154",

    /**
     * @type String[]
     * @private
     */
    COLORS: [ "lightblue", "lightyellow", "lightgreen", "lightred" ],
    
    /**
     * @returns {String}
     * @private
     */
    getName: function() {
	return this.name;
    },

    /**
     * @param context
     * @returns {Dissection.Output} output or null
     * @private
     */
    dissect: function(/** Dissection.Context */context) {
	var output = context.getPreviousOutput();
	if (output && output.getOutputFormat() !== Dissection.Ieee802154_Frame) {
	    return null;
	}
	var node = context.getNode();
	var evt = node.getEvent();

	if (!Sonoran.isRadioRxframeEvent(evt) && !Sonoran.isRadioTxframeEvent(evt)) {
	    return null;
	}
	
	var tbeg = evt.txbeg; 
	var tend = evt.txend; 
	var nanos = tend - tbeg;
	var frame = new IEEE802154.Frame(evt.data);

	var info = context.getInfoTree();
	info.addRow("Duration", nanos, { format: Dissection.NANOS });
	info.addRow("End", tend, { format: Dissection.NANOS });
	info.addRow("FCF", frame.getFCF().toString(16));
	info.addRow("Flags", frame.getFlagsAsStr());
	info.addRow("Type:", frame.getTypeAsStr());
	info.addRow("Seqno", frame.getSeqno());
	var src = frame.getSrc();
	if (src) {
	    info.addRow("Src", src.toString());
	}
	var dst = frame.getDst();
	if (dst) {
	    info.addRow("Dst", dst.toString());
	}
	var payload = frame.getPayload();
	    if (payload && payload.length > 0) {
	    info.addRow(sprintf("Payload (%d)", payload.length), payload, { format: Dissection.HEX });
	}

	var type = frame.getType();

	if (Sonoran.isRadioRxframeEvent(evt)) {
	    var tags = [
		"RX"
	    ];
	    
	    output = new Dissection.Output(this);
	    output.forTimeline(info, "lightgreen", tags);
	    //var anim = output.forNetviewAnimation(evt.getMote());
	    //var content = "RSSI:" + evt.rssi;
	    //anim.getRuntimeActions().add(
	//	"update", "dot-ne", "fillStyle:red", 
	//	"update", "clabel-e", "content:"+content, "fillStyle:red");
	    return output;
	}


	if (!Sonoran.isRadioTxframeEvent(evt)) {
	    return null;
	}

	var color = this.COLORS[type];

	//var arr = Dissection.nanos2numbers(tbeg);
	//tbeg = sprintf("%02d.%03d'%03d'%03d", arr[2], arr[3], arr[4], arr[5]);
	tbeg = Dissection.nanos2label(tbeg);
	//var arr = Dissection.nanos2numbers(tend);
	//tend = sprintf("%02d.%03d'%03d'%03d", arr[2], arr[3], arr[4], arr[5]);
	tend = Dissection.nanos2label(tend);

	var tags = [
	    "TX",
	    sprintf("%s;%s;%d", frame.getTypeAsStr(), frame.getFlagsAsStr(), frame.getSeqno()),
	    "B:" + tbeg,
	    "E:" + tend
	];


	output = new Dissection.Output(this, Dissection.Ieee802154_Payload, frame.payload);
	output.setAttribute(Dissection.Ieee802154_Frame, frame);

	output.forTimeline(info, color, tags);

	// var fcf = frame.getFCF();
	// if ((fcf&IEEE802154.FCF_TYPE) === IEEE802154.FCF_ACK) {
	//     //var anim = output.forNetviewAnimation(evt.getMote());
	//     //anim.getRuntimeActions().add(
	// //	"update", "center", "strokeStyle:green", "fillStyle:green", 
	// //	"update", "clabel-n", "content:ACK", "fillStyle:green" 
	//   //  );
	// } else {
	//     var txt = sprintf("FCF:%s Flags:%s Type:%s Seqno:%d", frame.getFCF().toString(16), frame.getFlagsAsStr(), frame.getTypeAsStr(), frame.getSeqno());
	//     if (payload) {
	// 	txt += "\n" + string2chunks(Formatter.binToHex(payload), 8).join("\n");
	//     }
	//     var anim = output.forNetviewAnimation(evt.getMote());
	//     var actions = anim.getRuntimeActions();
	//     var mote;
	//     if (dst && (mote = Saguaro.findMoteByRadioConf(dst.getPan(), dst.getAddr()))) {
	// 	actions.add(
	// 	    "update", "sphere", "strokeStyle:none", "fillStyle:rgba(0,196,0,0.05)", 
	// 	    "update", "join-"+mote.getUid(), "content:"+txt, "strokeStyle:green", "fillStyle:green"   
	// 	);
	//     } else {
	// 	actions.add(
	// 	    "update", "sphere", "strokeStyle:none", "fillStyle:rgba(0,196,0,0.05)", 
	// 	    "update", "clabel-n", "content:"+txt 
	// 	);

	//     }
	// }

//QUACK(0, "RADIO-Dissection: " + output);

	return output;
    }
};




Dissection.registerDissector(IEEE802154.Dissector);














/**
 * Dissectors of WLIP messages
 * @namespace Dissection.WLIP 
 */
Dissection.WLIP = {};


/**
 * Name of WLIP port attribute. When dissecting an event after a WLIP dissector,
 * this attribute exists.
 * @constant
 * @type String
 */
Dissection.Wlip_Port = "Wlip-Port";


/**
 * Name of wlip payload format. When dissecting a radio event after the WLIP dissector,
 * this payoad format may exists.
 * @constant
 * @type String
 */
Dissection.Wlip_Payload = "Wlip-Payload";



/**
 * Base dissector of WLIP messages.
 * @class
 * @private
 */
Dissection.WLIP.Dissector = {
    /**
     * @type String
     * @private
     */
    name:  "WLIP",
    
    /**
     * @type String[]
     * @private
     */
    COLORS: [ "lightblue", "lightyellow", "lightgreen", "lightred" ],
    
    /**
     * PANID to check for.
     * @type {Number}
     * @private
     */
    panId: SaguaroDEFS.WLIP_DEFAULT_PANID,

    /**
     * @returns {String}
     * @private
     */
    getName: function() {
	return this.name;
    },


    /**
     * @param context
     * @returns {Dissection.Output} output or null
     * @private
     */
    dissect: function(/** Dissection.Context */context) {
	var output = context.getPreviousOutput();
	if (!output) {
	    return null;
	}
	if (output.getOutputFormat() !== Dissection.Ieee802154_Payload) {
	    return null;
	}
	var payload = output.getOutputData();
	var frame = output.getAttribute(Dissection.Ieee802154_Frame);
	assert(frame);
	var node = context.getNode();
	var evt = node.getEvent();

	if (!this.panId) {
	    this.panId = SaguaroDEFS.WLIP_DEFAULT_PANID;
	}

	if ((frame.getSrc() && frame.getSrc().getPan() !== this.panId) ||  (frame.getDst() && frame.getDst().getPan() !== this.panId)) {
	    return null;
	}

	var fcf = frame.getFCF();
	var fca = frame.getFCA();
	var cmd = frame.getSeqno();

	if ((fcf & (IEEE802154.FCF_TYPE | IEEE802154.FCF_SEC | IEEE802154.FCF_NSPID)) != (IEEE802154.FCF_DATA | IEEE802154.FCF_NSPID)) {
	    return null;
	}

	if ((fca & (IEEE802154.FCA_DST_MASK|IEEE802154.FCA_SRC_MASK)) === (IEEE802154.FCA_SRC_NONE|IEEE802154.FCA_DST_XADDR) ) {
	    if (cmd === SaguaroDEFS.WLIP_CMD_FORWARD) {
		return this.dissectForward(context, frame, payload, frame.getDst(), undefined);
	    }
	    return null;
	}

	if ((fca & (IEEE802154.FCA_DST_MASK|IEEE802154.FCA_SRC_MASK)) != (IEEE802154.FCA_DST_NONE|IEEE802154.FCA_SRC_XADDR) ) {
	    return null;
	}

	if ((cmd === SaguaroDEFS.WLIP_CMD_HELLO) || (cmd === SaguaroDEFS.WLIP_CMD_BYE)) {
	    var info = context.getInfoTree();
	    info.addRow("Command", cmd === SaguaroDEFS.WLIP_CMD_HELLO ? "HELLO" : "BYE");
	    var tags = [ cmd === SaguaroDEFS.WLIP_CMD_HELLO ? "HELLO" : "BYE" ];
	    output = new Dissection.Output(this);
	    output.forTimeline(info, null, tags);


	    //var mote = evt.getMote();
	    // var anim = output.forNetviewAnimation(mote);
	    // var actions = anim.getRuntimeActions();
	    // var content = "content:"+(SaguaroDEFS.WLIP_CMD_HELLO ? "HELLO" : "BYE");
	    // var gateway = mote.getSink();
	    // if (gateway) {
	    // 	actions.add(
	    // 	    "update", "sphere", "strokeStyle:green", "fillStyle:rgba(0,196,0,0.05)", 
	    // 	    "update", "join-"+gateway.getMote().getUid(), content, "strokeStyle:green", "fillStyle:green"   
	    // 	);
	    // } else {
	    // 	actions.add(
	    // 	    "update", "sphere", "strokeStyle:green", "fillStyle:rgba(0,196,0,0.05)", 
	    // 	    "update", "clabel-n", content
	    // 	);
	    // }
	    return output;
	}

	if (cmd === SaguaroDEFS.WLIP_CMD_FORWARD) {
	    return this.dissectForward(context, frame, payload, undefined, frame.getSrc());
	}

	return null;
    },

    /**
     * Dissect a gateway forward packet.
     * @param context
     * @param frame
     * @param payload
     * @param dst Destination address string or undefined
     * @param src Source address string or undefined
     * @private
     */
    dissectForward: function(/** Dissection.Context */context, /** IEEE802154.Frame */frame, /** String */payload, /** IEEE802154.Address */dst, /** IEEE802154.Address */src) {
	var addr = dst ? dst.getAddr().toString() : src.getAddr().toString();
	var arr = Formatter.unpack("4u2u1u*d", payload);
	var haddr = arr[0];
	var hport = arr[1];
	var port = arr[2];
	var data = arr[3];

	var info = context.getInfoTree();
	info.addRow("Command", "FORWARD");
	info.addRow(dst ? "Dst:" : "Src:", addr + ":" + port);
	info.addRow("Host:" , haddr.toString(16) + ":" + hport);
	if (data.length > 0) {
	    info.addRow(sprintf("Payload (%d)", data.length), data, { format: Dissection.HEX });
	}
	var tags = [
	    "FORWARD",
	    "HOST:" + haddr.toString(16) + ":" + hport,
	    (dst?"DST: ":"SRC: ") + addr + ":" + port.toString()
	];
	var output = (new Dissection.Output(this));
	output.setAttribute(Dissection.Wlip_Port, port);
	output.forTimeline(info, null, tags, Dissection.Wlip_Payload, data);

	var node = context.getNode();
	var evt = node.getEvent();
	var mote = evt.getMote();
	var dstMote;
	if (dst) {
	    dstMote = Saguaro.findMoteByRadioConf(dst.getPan(), dst.getAddr());
	} else {
	    var gateway = mote.getSink();
	    if (gateway) {
		dstMote = gateway.getMote();
	    } else {
		QUACK(0, "No WLIP gateway found for source mote: " + mote.getUniqueid());
	    }	    
	}
	//if (!dstMote) {
	  //  QUACK(0, "No destination mote: " + Formatter.binToHex(data));
	    //QUACK(0, "Dst: " + dst);
	    //QUACK(0, "src: " + src);
	//}
	
	var content = "content:FORWARD";
	if (data.length>0) {
	    content += "\n" + string2chunks(Formatter.binToHex(data), 8).join("\n");
	}
	// var actions = output.forNetviewAnimation(mote).getRuntimeActions();
	// actions.add(
	//     "update", "sphere", "strokeStyle:green", "fillStyle:rgba(0,196,0,0.05)"
	// );
	// if (dstMote) {
	//     actions.add(
	// 	"update", "join-"+dstMote.getUid(), content, "strokeStyle:green", "fillStyle:green"   
	//     );
	// }
	return output;
    }
};



Dissection.registerDissector(Dissection.WLIP.Dissector);








Dissection.LoRa = {
    COLORS: {
	"lora": {
	    "mote2gw"  : "#8AECEA",
	    "mote2mote": "#8AECEA",
	    "gw2mote"  : "#CBF3F2",
	    "ras"      : "#F7F6D5"
	},
	"loraGW": {
	    "mote2gw": "#8AECEA",
	    "gw2mote": "#CBF3F2",
	    "gw2nwk": "#D8F2E4"
	}
    },

    initialize: function() {
	Dissection.registerDissector(this);
    },
    
    /**
     * @type String
     * @private
     */
    name: "LoRa",

    /**
     * @returns {String}
     * @private
     */
    getName: function() {
	return this.name;
    },

    /**
     * @param context
     * @returns {Dissection.Output} output or null
     * @private
     */
    dissect: function(context) {
	if (context.getPreviousOutput()) {
	    return null;
	}
	var node = context.getNode();
	var evt = node.getEvent();
	var evname = evt.evname;
	var category = evt.category;
	if (category !== "lora" && category !== "loraGW") {
	    return null;
	}
	var info = null; //context.getInfoTree();
	var tags = [ evname ];
	switch(category) {
	case "lora": {
	    switch(evname) {
	    case "mote2gw": {
		info = context.getInfoTree();
		var media = evt.media;
		assert(media);
		info.addRow("Begin", media.txbeg, { format: Dissection.NANOS });
		info.addRow("End", media.txend, { format: Dissection.NANOS });
		info.addRow("Duration", media.txend - media.txbeg, { format: Dissection.NANOS });
		info.addRow("Txpow", media.txpow, { format: Dissection.DEC });
		info.addRow("Freq", media.freq, { format: Dissection.MHZ });
		info.addRow("BW", media.bw, { format: Dissection.KHZ });
		info.addRow("SF", media.sf, { format: Dissection.DEC });
		info.addRow("CR", media.cr, { format: Dissection.DEC });
		info.addRow(sprintf("Data (%d)", media.data.length), media.data, { format: Dissection.HEX });
		break;
	    }
	    case "ras": {
		info = context.getInfoTree();
		info.addRow("Device", evt.device);
		info.addRow("RAS", evt.ras);
		break;
	    }
	    case "gw2mote": {
		tags.push("B:"+Dissection.nanos2label(evt.txbeg));
		tags.push("E:"+Dissection.nanos2label(evt.txend));
		tags.push("frq:" + (parseFloat(evt.freq)/(1000*1000)).toFixed(1));
		tags.push("bw:" + (parseFloat(evt.bw)/1000).toFixed(1));
		tags.push("sf:"+evt.sf);
		tags.push("cr:"+evt.cr);
		info = context.getInfoTree();
		info.addRow("Duration", evt.txend - evt.txbeg, { format: Dissection.NANOS });
		info.addRow("End", evt.txend, { format: Dissection.NANOS });
		info.addRow("Freq", evt.freq, { format: Dissection.MHZ });
		info.addRow("BW", evt.bw, { format: Dissection.KHZ });
		info.addRow("SF", evt.sf, { format: Dissection.DEC });
		info.addRow("CR", evt.cr, { format: Dissection.DEC });
		info.addRow("RSSI", parseFloat(evt.rssi), { format: Dissection.FLOAT });
		info.addRow("SNR", parseFloat(evt.snr), { format: Dissection.FLOAT });
		info.addRow(sprintf("Data (%d)", evt.data.length), evt.data, { format: Dissection.HEX });
		break;
	    }
	    }
	    break;
	}
	case "loraGW": {
	    switch(evname) {
	    case "gw2nwk": {
		info = context.getInfoTree();
		var media = evt.media;
		assert(media);
		info.addRow("Begin", media.txbeg, { format: Dissection.NANOS });
		info.addRow("End", media.txend, { format: Dissection.NANOS });
		info.addRow(sprintf("Data (%d)", media.data.length), media.data, { format: Dissection.HEX });
		break;
	    }
	    case "mote2gw": {
		tags.push("B:"+Dissection.nanos2label(evt.txbeg));
		tags.push("E:"+Dissection.nanos2label(evt.txend));
		tags.push("frq:" + (parseFloat(evt.freq)/(1000*1000)).toFixed(1));
		tags.push("bw:" + (parseFloat(evt.bw)/1000).toFixed(1));
		tags.push("sf:"+evt.sf);
		tags.push("cr:"+evt.cr);
		info = context.getInfoTree();
		info.addRow("Duration", evt.txend - evt.txbeg, { format: Dissection.NANOS });
		info.addRow("End", evt.txend, { format: Dissection.NANOS });
		info.addRow("Freq", evt.freq, { format: Dissection.MHZ });
		info.addRow("BW", evt.bw, { format: Dissection.KHZ });
		info.addRow("SF", evt.sf, { format: Dissection.DEC });
		info.addRow("CR", evt.cr, { format: Dissection.DEC });
		info.addRow("RSSI", parseFloat(evt.rssi), { format: Dissection.FLOAT });
		info.addRow("SNR", parseFloat(evt.snr), { format: Dissection.FLOAT });
		info.addRow(sprintf("Data (%d)", evt.data.length), evt.data, { format: Dissection.HEX });
		break;
	    }
	    case "gw2mote": {
		break;
	    }
	    }
	    break;
	}
	}
	if (!info) {
	    info = context.getInfoTree();
	    Dissection.addJsonInfoTree4Event(info, evt);
	}
	var output = new Dissection.Output(this);
	var color = this.COLORS[category][evname];
	assert(color, "Missing color for: " + category + ", " + evname);
	output.forTimeline(info, color, tags);
	return output;
    }
};

Dissection.LoRa.initialize();















