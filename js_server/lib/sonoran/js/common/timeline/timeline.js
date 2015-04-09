//  (C) COPYRIGHT INTERNATIONAL BUSINESS MACHINES CORPORATION 2006-2010
//                       ALL RIGHTS RESERVED
//        IBM Research Division, Zurich Research Laboratory
// --------------------------------------------------------------------



// --------------------------------------------------------------------
// 
// 
// Dissection
// 
//
// --------------------------------------------------------------------



/**
 * Dissection implements the management and forwarding of events to dissectors.
 * @namespace Dissection 
 */
Dissection = {
    /**
     * @type String
     * @constant
     * @private
     */
    JSON_DISSECTOR_NAME: "Json",

    /**
     * Channel name.
     * @type String
     * @private
     */
     CHANNEL_NAME: "Dissection",

     /**
      * Helper function, map nanos to array, hours, minutes, secs, millis, micros and nanos .
      * @param nanos
      * @returns {Number[]}
      */
     nanos2numbers: function(/** Number */nanos) {
	 return [ ( nanos/(3600*1000000000)     )|0,
		  ( nanos/(  60*1000000000)%  60)|0,
		  ((nanos/      1000000000)%  60)|0,
		  ((nanos/         1000000)%1000)|0,
		  ((nanos/            1000)%1000)|0,
		  ( nanos                  %1000)|0 ];
     },


    /**
     * Helper function, map micros to array, hours, minutes, secs, millis, and micros.
     * @param micros
     * @returns {Number[]}
     */
    micros2numbers: function(/** Number */micros) {
	return 	 [ ( micros/(3600*1000000)     )|0,
		   ( micros/(  60*1000000)%  60)|0,
		   ((micros/      1000000)%  60)|0,
		   ((micros/         1000)%1000)|0,
		   ( micros                  %1000)|0 ];
    },


    /**
     * @returns {Boolean} whether an event covers a time span
     */
    isTxEvent: function(/** Sonoran.Event */e) {
	return (e.txbeg!==undefined && e.txend!== undefined);
    },


    /**
     * @param nanos
     * @returns {String}
     */
    nanos2label: function(/** Number */nanos) {
	var arr = Dissection.nanos2numbers(nanos);
	return sprintf("%02d.%03d'%03d'%03d", arr[2], arr[3], arr[4], arr[5]);
    }
};






// --------------------------------------------------------------------
// 
// 
// Dissection.ServerSettings
// 
//
// --------------------------------------------------------------------


Class.define(
    "Dissection.ServerSettings",
    /**
     * @lends Dissection.ServerSettings.prototype
     */
    {
	/**
	 * @constructs
	 * @private
	 */
	__constr__: function() {
	    this.deliveryInterval = 300;
	    this.deliveryCount = 300;
	},
	
	/**
	 * @type Number
	 * @private
	 */
	deliveryInterval: 300,
	/**
	 * @type Number
	 * @private
	 */
	deliveryCount: 300,

	/**
	 * @returns {Number}
	 * @private
	 */
	getDeliveryInterval: function() {
	    return this.deliveryInterval;
	},

	/**
	 * @param n
	 * @returns {Dissection.ServerSettings}  this
	 * @private
	 */
	setDeliveryInterval: function(/** Number */n) {
	    this.deliveryInterval = n;
	    return this;
	},

	/**
	 * @returns {Number}
	 * @private
	 */
	getDeliveryCount: function() {
	    return this.deliveryCount;
	},

	/**
	 * @param n
	 * @returns {Dissection.ServerSettings}  this
	 * @private
	 */
	setDeliveryCount: function(/** Number */n) {
	    this.deliveryCount = n;
	    return this;
	},


	/**
	 * @returns {String}
	 * @private
	 */
	toString: function() {
	    var sa = [];
	    sa.push("Delivery-Interval:            " + this.deliveryInterval);
	    sa.push("Delivery-Count:               " + this.deliveryCount);
	    return sa.join("\n");
	}
    }
);









// --------------------------------------------------------------------
// 
// 
// Dissection.State
// 
//
// --------------------------------------------------------------------


Class.define(
    "Dissection.State",
    /**
     * @lends Dissection.State.prototype
     */
    {
	/**
	 * @constructs
	 * @private
	 */
	__constr__: function(/** Boolean */active, /** Number */totalEventsCount, /** Number */timeStartMicros, /** Number */timeEndMicros) {
	    this.active = active;
	    this.totalEventsCount = totalEventsCount;
	    this.timeStartMicros = timeStartMicros;
	    this.timeEndMicros = timeEndMicros;
	},
	/**
	 * @type Boolean
	 * @private
	 */
	active: false,
	/**
	 * @type Number
	 * @private
	 */
	totalEventsCount: -1,
	/**
	 * @type Number
	 * @private
	 */
	timeStartMicros: -1,
	/**
	 * @type Number
	 * @private
	 */
	timeEndMicros: -1,
	/**
	 * @returns {Boolean}
	 * @private
	 */
	isActive: function() {
	    return this.active;
	},
	/**
	 * @returns {Number}
	 * @private
	 */
	getTotalEventsCount: function() {
	    return this.totalEventsCount;
	},
	/**
	 * @returns {Number}
	 * @private
	 */
	getTimeStartMicros: function() {
	    return this.timeStartMicros;
	},
	/**
	 * @returns {Number}
	 * @private
	 */
	getTimeEndMicros: function() {
	    return this.timeEndMicros;
	}
    }
);




// --------------------------------------------------------------------
// 
// 
// Dissection.ControlsView
// 
//
// --------------------------------------------------------------------
Class.define(
    "Dissection.ControlsView",
    /**
     * @lends Dissection.ControlsView.prototype
     */

    {

	/**
	 * @constructs
	 * @param divId
	 * @private
	 */
	__constr__: function(/** String */divId) { 
	    this.divId = divId;
	    this.state = null;
	    this.info = null;
	    this.eventCounter = -1;
	},

	/**
	 * @param f
	 * @private
	 */
	setStartStopAction: function(/** Function */f) {
	    var _this = this;
	    $(this.divId + " input.StartStop").click(function() {
		var state = _this.state;
		f((!state || !state.active) ? "init" : "fini");
	    });
	},
	
	/**
	 * @param f
	 * @private
	 */
	setSaguaroControlAction: function(/** Function */f) {
	    var _this = this;
	    $(this.divId + " input.SaguaroControl").click(function() {
		var info = _this.info;
		if (!info) { return; }
		var runState = info.getRunState();
		if (!runState) { return; }
		f(info.isRunning() ? "halt" : "cont");
	    });
	},

	/**
	 * @returns {Dissection.State}
	 * @private
	 */
	getState: function() {
	    return this.state;
	},

	/**
	 * @param state
	 * @private
	 */
	render1: function(/** Dissection.State */state) {
	    if (!this.state || this.state.totalEventsCount !== state.totalEventsCount) {
		var s = state.totalEventsCount.toString();
		$(this.divId + " span.EventRatioServer").text(s); 
	    }
	    if (!this.state || this.state.timeStartMicros !== state.timeStartMicros) {
		var s = state.timeStartMicros<0 ? "---" : Util.micros2str(state.timeStartMicros);
		$(this.divId + " span.StartTime").text(s);
	    }
	    if (!this.state || this.state.timeEndMicros !== state.timeEndMicros) {
		var s = state.timeEndMicros<0 ? "---" : Util.micros2str(state.timeEndMicros);
		$(this.divId + " span.EndTime").text(s);
	    }
	    if (!this.state || this.state.active !== state.active) {
		$(this.divId + " input.StartStop").attr("value", state.active ? "Stop" : "Start");
	    }
	    this.state = state;
	},

	/**
	 * @param eventCounter
	 * @private
	 */
	render2: function(/** Number */eventCounter) {
	    if (this.eventCounter !== eventCounter) {
		this.eventCounter = eventCounter;
		var s = this.eventCounter.toString();
		$(this.divId + " span.EventRatioClient").text(s); 
	    }
	},

	/**
	 * @param info
	 * @private
	 */
	render3: function(/** Saguaro.Info */info) {
	    this.info = info;
	    var runState = info.getRunState();
	    if (!runState) {
		$(this.divId + ' input.SaguaroControl').attr("value", "None");
	    } else {
		$(this.divId + ' input.SaguaroControl').attr("value", info.isRunning() ? "Halt" : "Cont");
	    }
	}

    }
);



// --------------------------------------------------------------------
// 
// 
// Dissection.TerminalView
// 
//
// --------------------------------------------------------------------

/**
 * Terminal view.
 * @class
 * @constructor
 * @param divId
 * @param iconId
 * @private
 */
Dissection.TerminalView = function(/** String */divId, /** String */iconId) {
    this.divId = divId;
    this.iconId = iconId;
    var channel = this.getChannel();
    channel.onData = this.update.bind(this);
    this.seqno = 1;
    $(this.iconId).click(this.toggle.bind(this));
    $(this.getCloseId()).click(this.close.bind(this));
    $(this.getClearId()).click(this.clear.bind(this));
    $(this.getSendId()).click(this.send.bind(this));
    var _this = this;
    $(this.getInputId()).keyup(function(e) {
				   if (e.keyCode == 27) {
				       _this.close();
				   } else if (e.keyCode == 13) {
				       _this.send();
				   }
			       });
    $(window).bind('keydown', function(evt) {
	if (evt.keyCode == 27 /* ESC */) {
	    return false; // do nothing
        }
	var shiftDown = (evt.shiftKey > 0);
	var altDown   = (evt.altKey > 0);
	var ctrlDown   = (evt.ctrlKey > 0);
	if (altDown && evt.keyCode===84) {
	    _this.toggle();
	    return false;
	}
        return true;
    });


};

/** @private */
Dissection.TerminalView.prototype = {
    /**
     * @type String
     * @private
     */
    divId: null,

    /**
     * @type String
     * @private
     */
    iconId: null,

    

    /**
     * Return terminal channel.
     * @returns {Channels.Channel}
     * @private
     */
    getChannel: function() {
	var channel = Channels.Registry.lookupChannel('Terminal');
	if (!channel) {
	    channel =  new Channels.Channel('Terminal');
	}
	//assert(channel);
	return channel;
    },

    /**
     * @returns {String} Id of close image button
     * @private
     */
    getCloseId: function() {
	return this.divId + " > div.Command > button.Close";
    },

    /**
     * @returns {String} Id of clear image button
     * @private
     */
    getClearId: function() {
	return this.divId + " > div.Command > button.Clear";
    },

    /**
     * @returns {String} Id of send image button
     * @private
     */
    getSendId: function() {
	return this.divId + " > div.Command > button.Send";
    },

    /**
     * @returns {String} Id of command div
     * @private
     */
    getCommandId: function() {
	return this.divId + " > div.Command";
    },

    /**
     * @returns {String} Id of command input text line
     * @private
     */
    getInputId: function() {
	return this.divId + " > div.Command > input.Text";
    },

    /**
     * @returns {String}
     * @private
     */
    getOutputId: function() {
	return this.divId + " > div.Output";
    },

    /**
     * Clear output part of view.
     * @private
     */
    clear: function() {
	$(this.getOutputId()).empty();
    },

    /**
     * Hide terminal view.
     * @private
     */
    close: function() {
	this.toggle();
    },

    /**
     * Send terminal command
     * @private
     */
    send: function() {
	var cmd = $(this.getInputId()).val();
	if (!cmd) {
	    return false;
	}
	cmd = jQuery.trim(cmd);
	if (!cmd) {
	     return false;
	}
	var channel = this.getChannel();
        var _seqno = this.seqno;
        this.seqno += 1;

        channel.push({ line: cmd, tick: _seqno });

	$(this.getInputId()).val("");
	var s = "<p class='to'>&gt; " + Util.HTML.quoteHTML(cmd) + "</p>";
	$(this.getOutputId()).prepend(s);

	return false;
    },

    /**
     * Hide/show view.
     * @private
     */
    toggle: function() {
	if (!$(this.divId).is(':visible') ) {
	    this.map();
	    $(this.divId).show();
	    $(this.getInputId()).focus();
	} else {
	    $(this.divId).hide();
	}
    },

    /**
     * Add terminal output to window.
     * @param result
     * @private
     */
    update: function(/** AOP.Result */result) {
	var res = result.getResult().toString();
	var msg = "<p class='from'>" + Util.HTML.mapLines(res) + "</p>";
	$(this.getOutputId()).prepend(msg);
    },

    /**
     * Terminal has been resized.
     * @private
     */
    reposition: function() {
	if ($(this.divId).is(':visible') ) {
	    this.map();
	}
    },

    /**
     * Map and/or resize terminal view.
     * @private
     */
    map: function() {
	var l = 200; 
	var w = $(window).width() - 2*l; 
	var t = 20; 
	var h = 400;
	var div = this.divId;
	$(div).css({ position: 'absolute', top: t + 'px', left: l + 'px' });
	$(div).css({ 'z-index': '10' });
	$(div).width(w);
	$(div).height(h);
	
	div = this.getCommandId();
	$(div).width(w);
	$(div).height(20);
	
	div = this.getOutputId();
	$(div).width(w);
	$(div).height(h-20);
    }
};













// --------------------------------------------------------------------
// 
// 
// Dissection.Output
// 
//
// --------------------------------------------------------------------


Class.define(
    "Dissection.Output", 
    /**
     * @lends Dissection.Output.prototype
     */
    {
	/**
	 * Stores the output of a dissection of an event by a single dissector.
	 * @constructs
	 * @param dissector         The dissector name
	 * @param outputFormat      In case of radio message, name of the format of the output data left for next dissector or null
	 * @param outputData        In case of radio message, the output data left for next dissector or null
	 */
	__constr__: function(/** Dissection.Dissector|String */dissector, /** String */outputFormat, /** String */outputData) {
	    assert(arguments.length <= 3, "API changed");
	    if (typeof(dissector) === 'string') {
		    this.dissectorName = dissector;
	    } else {
		this.dissectorName = dissector.getName();
	    }
	    this.outputFormat = outputFormat;
	    this.outputData = outputData;

	    this.attributes = {};

	    this.timeline = {};
	    this.network = {
		animations: [],
		actions: []
	    };
	},

	/**
	 * Return name of dissector.
	 * @returns {String}
	 */
	getDissectorName: function() {
	    return this.dissectorName;
	},

	/**
	 * Return output format name returned by dissector.
	 * @returns {String}
	 */
	getOutputFormat: function() {
	    return this.outputFormat;
	},

	/**
	 * Return output data (such as a payload) if left by dissector (or null).
	 * @returns {String}
	 */
	getOutputData: function() {
	    return this.outputData;
	},

	/**
	 * Retrieve an attribute from this output object (or null).
	 * @param name Attribute name
	 * @returns {String}
	 */
	getAttribute: function(/** String */name) {
	    return this.attributes[name];
	},

	/**
	 * Store an attribute to this output object to be used by following dissectors.
	 * @param name
	 * @param value
	 * @returns {String}
	 */
	setAttribute: function(/** String */name, /** String */value) {
	    this.attributes[name] = value;
	},

	/**
	 * Add the output data for the timeline browser client.</br>
	 * If color, tags or info is not specified by a dissector, the timeline
	 * picks the attribute to show from any previous dissector having provided it.</br>
	 * The 'infoTree' describes the output rendered on the left side for an event,
	 * 'canvasColor' the color of the rendered box in the canvas, 'canvasTags' the
	 * tags rendered in the box.
	 * @param infoTree          Info tree to show in info tab on left or null if not available
	 * @param canvasColor       Color to use in canvas or null if not specified by this dissector
	 * @param canvasTags        Tags to show in canvas or null
	 * @param outputFormat      In case of radio message, format of output data left for next dissector or null
	 * @param outputData        In case of radio message, output data left for next dissector or null
	 * @returns {Object} this
	 */
	forTimeline: function(/** Dissection.InfoTree */infoTree, /** String */canvasColor, /** String[] */canvasTags, /** String */outputFormat, /** String */outputData) {
	    assert(!infoTree || infoTree instanceof Dissection.InfoTree);
	    this.timeline.infoTree = infoTree;
	    this.timeline.canvasColor = canvasColor;
	    this.timeline.canvasTags = canvasTags;
	    return this;
	},

	/**
	 * Return canvas color to be used in the timeline.
	 * @returns {String}
	 */
	getTimelineCanvasColor: function() {
	    return this.timeline.canvasColor;
	},

	/**
	 * Set canvas color to be used in the timeline.
	 * @param col
	 */
	setTimelineCanvasColor: function(/** String */col) {
	    this.timeline.canvasColor = col;
	},

	/**
	 * Set info shown in netview and timeline on left side.
	 * @returns {Dissection.InfoTree}
	 */
	getTimelineInfoTree: function() {
	    return this.timeline.infoTree;
	},

	/**
	 * Return info shown in netview and timeline on left side.
	 * @param infoTree
	 */
	setTimelineInfoTree: function(/** Dissection.InfoTree */infoTree) {
	    this.timeline.infoTree = infoTree;
	},

	/**
	 * Return tags shows on node in timeline.
	 * @returns {String[]}
	 */
	getTimelineCanvasTags: function() {
	    return this.timeline.canvasTags;
	},

	/**
	 * Set tags shows on node in timeline.
	 * @param tags
	 */
	setTimelineCanvasTags: function(/** String[] */tags) {
	    this.timeline.canvasTags = tags;
	},


	/**
	 * @nodoc
	 */
	toString: function() {
	    var txt = sprintf("Output: %s\n", this.dissectorName);
	    if (this.outputFormat) {
		txt += sprintf("Format: %s\n", this.outputFormat);
	    }
	    txt += sprintf("Attributes: %s\n", Util.formatData(this.attributes));
	    txt += sprintf("Timeline: %s\n", Util.formatData(this.timeline));
	    return txt;
	}
    },
    /**
     * @lends Dissection.Output
     */
    {
	/**
	 * @param node
	 * @returns {Dissection.Output}
	 * @private
	 */
	findTimelineColorProvider: function(/** Dissection.Node */node) {
	    var outputs = node.getOutputs();
	    for (var i = outputs.length-1; i >= 0; i--) {
		if (outputs[i].getTimelineCanvasColor()) {
		    return outputs[i];
		}
	    }
	    throw "Could not find color for event in dissector outputs chain"; 
	},


	/**
	 * @param node
	 * @returns {Dissection.Output}
	 * @private
	 */
	findTimelineTagsProvider: function(/** Dissection.Node */node) {
	    var outputs = node.getOutputs();
	    for (var i = outputs.length-1; i >= 0; i--) {
		if (outputs[i].getTimelineCanvasTags()) {
		    return outputs[i];
		}
	    }
	    throw "Could not find tags for event in dissector outputs chain"; 
	},


	/**
	 * Returns the info html for all outputs defined for specified node,
	 * ready to be added to left info column in web page.
	 * @param node Node or event
	 * @returns {Object[]}  Number of divs and HTML string
	 * @private
	 */
	genTimelineInfoHtmls: function(/** Dissection.Node|Event */node) {
	    var evt, tbeg;
	    if (node instanceof Dissection.Node) {
		evt = node.getEvent();
		tbeg = node.getBeginTime();
	    } else {
		evt = node;
		tbeg = evt.getTimeInNanos();
	    }
	    var html = 
		'<div class="Node Dissector"><h4>Event</h4>'+
		'<table><tbody>';
		//'<tr><td>Event:</td><td>' + evt.msgtype + '</td></tr>';
	    //if (evt.category) {
		html += '<tr><td>Category:</td><td>' + evt.category + '</td></tr>';
		html += '<tr><td>EvName:</td><td>' + evt.evname + '</td></tr>';
	    //}
	    html +=
		'<tr><td>Begin:</td><td>' + Util.nanos2str(tbeg) + '</td></tr>' +
		'</tbody></table>' +
		'</div>';
	    if (node instanceof Dissection.Node) {
		//var tbeg = node.getBeginTime();
		var htmls = [ html ]; 
		var outputs = node.getOutputs();
		for (var i = 0; i < outputs.length; i++) {
		    var op = outputs[i];
		    var tree = op.getTimelineInfoTree();
		    if (tree) {
			html = '<div class="Node Dissector"><h4>' + op.getDissectorName() + '</h4>'+ tree.toHtml() + '</div>';
			htmls.push(html);
		    }
		};
		return [ htmls.length, htmls.join("\n") ];
	    } else {
		var htmls = [ html ]; 
		var tree = Dissection.getJsonInfoTree4Event(evt);
		html = '<div class="Node Dissector"><h4>JSONDissector</h4>'+ tree.toHtml() + '</div>';
		htmls.push(html);
		return [ htmls.length, htmls.join("\n") ];
	    }
	}
    }
);




/**
 * Defines a tree of key/value pairs to describe the details of a dissection.
 * In the browser, this tree is shown on the left site, after mapping it
 * to html.</br>
 * See Util.Formatter.Object for more information about this class.
 * @class
 * @see Util.Formatter.Object;
 */
Dissection.InfoTree = Util.Formatter.Object;


/**
 * Format of data in an info tree.
 * @see Dissection.InfoTree
 * @type String
 * @constant
 */
Dissection.TXT =       Util.Formatter.Object.TXT;

/**
 * Format of data in an info tree.
 * @see Dissection.InfoTree
 * @type String
 * @constant
 */
Dissection.HEX =       Util.Formatter.Object.HEX;

/**
 * Format of data in an info tree.
 * @see Dissection.InfoTree
 * @type String
 * @constant
 */
Dissection.DEC =        Util.Formatter.Object.DEC;

/**
 * Format of data in an info tree.
 * @see Dissection.InfoTree
 * @type String
 * @constant
 */
Dissection.NANOS =       Util.Formatter.Object.NANOS;

/**
 * Format of data in an info tree.
 * @see Dissection.InfoTree
 * @type String
 * @constant
 */
Dissection.MHZ =       Util.Formatter.Object.MHZ;

/**
 * Format of data in an info tree.
 * @see Dissection.InfoTree
 * @type String
 * @constant
 */
Dissection.KHZ =       Util.Formatter.Object.KHZ;

/**
 * Format of data in an info tree.
 * @see Dissection.InfoTree
 * @type String
 * @constant
 */
Dissection.FLOAT =       Util.Formatter.Object.FLOAT;




/**
 * Create InfoTree object for any event including all of its properties
 * recursively.
 * @param evt
 * @returns {Dissection.InfoTree} 
 */
Dissection.getJsonInfoTree4Event = function(/** Event */evt) {
    var info = new Util.Formatter.Object();
    info.addObj(evt, undefined, 
	    function(k, v) {
		return (k === '__constr__' || k === 'msgtype') ? false : true;
	    },
	    function(obj, k, v) {
		if (v && (v instanceof Sonoran.Mote)) {
		    return v.getUniqueid();
		}
		//if (v && (v instanceof Saguaro.Connection)) {
		  //  return v.toString();
		//}
		return undefined;
	    }
	);
    return info;
};




/**
 * Add to InfoTree object an object including all of its properties
 * recursively.
 * @param info
 * @param obj   An object
 * @param label Optional
 * @returns {Dissection.InfoTree} 
 */
Dissection.addJsonInfoTree4Event = function(/** Dissection.InfoTree */info, /** Object */obj, /** String */label) {
    info.addObj(obj, label,
	    function(k, v) {
		return (k === '__constr__' || k === 'msgtype') ? false : true;
	    },
	    function(obj, k, v) {
		if (v && (v instanceof Sonoran.Mote)) {
		    return v.getUniqueid();
		}
		return undefined;
	    }
	);
    return info;
};



// --------------------------------------------------------------------
// 
// 
// Dissection.Node
// 
//
// --------------------------------------------------------------------

Class.define(
    "Dissection.Node",
    /**
     * @lends Dissection.Node.prototype
     */
    {
	/**
	 * Wraps an event from Sonoran with the outputs created by the dissectors.
	 * @constructs
	 * @param evt
	 * @param tbeg
	 * @private
	 */
	__constr__: function(/** Event */evt, /** Number */tbeg) {
	    this.evt = evt;
	    this.tbeg = tbeg;
	    this.outputs = null;
	},

	/**
	 * @type Number
	 * @private
	 */
	tbeg: 0,
	/**
	 * Main event
	 * @type Event
	 * @private
	 */
	evt: null,
	/**
	 * Outputs of dissectors.
	 * @type Dissection.Output[]
	 * @private
	 */
	outputs: null,

	/**
	 * @returns {Dissection.Output}
	 * @private
	 */
	getLastOutput: function() {
	    return this.outputs[this.outputs.length-1];
	},

	/**
	 * @returns {Dissection.Output[]}
	 * @private
	 */
	getOutputs: function() {
	    return this.outputs;
	},

	/**
	 * @returns {Number}
	 * @private
	 */
	getBeginTime: function() {
	    return this.tbeg;	
	},

	/**
	 * @param tbeg
	 * @private
	 */
	setBeginTime: function(/** Number */tbeg) {
	    this.tbeg = tbeg;
	},

	/**
	 * @returns {Comote.Mote}
	 * @private
	 */
	getMote: function() {
	    return this.evt.getMote();
	},

	/**
	 * @returns {String}
	 * @private
	 */
	getUniqueid: function() {
	    assert(this.evt.getMote());
	    return this.getMote().getUniqueid();
	},

	/**
	 * @returns {Event}
	 * @private
	 */
	getEvent: function() {
	    return this.evt;
	},

	/**
	 * @return {Boolean}
	 * @private
	 */
	isRadioTx: function() {
	    return Dissection.isTxEvent(this.evt);
	    //return Sonoran.isRadioTxframeEvent(this.evt);
	},

	/**
	 * @return {Boolean}
	 * @private
	 */
	isRadioStartTx: function() {
	    return this.isRadioTx() && this.tbeg===this.evt.txbeg;
	},

	/**
	 * @return {Boolean}
	 * @private
	 */
	isRadioEndTx: function() {
	    return this.isRadioTx() && this.tbeg===this.evt.txend;
	},

	/**
	 * @return {Number}
	 * @private
	 */
	getRadioStartTime: function() {
	    return this.evt.txbeg;
	},

	/**
	 * @return {Number}
	 * @private
	 */
	getRadioEndTime: function() {
	    return this.evt.txend;
	},

	/**
	 * @private
	 * @ignore
	 */
	toString: function() {
	    return "Dissection.Node: " + this.evt.category + ":" + this.evt.evname + ", " + this.tbeg; // + ", " + this.tend;
	}
    },
    /**
     * @lends Dissection.Node
     */
    {
	/**
	 * Check whether these two nodes are begin and end of a radio message.
	 * @param node1
	 * @param node2
	 * @returns {Boolean}
	 * @private
	 */
	isRadioPair: function(/** Dissection.Node */node1, /** Dissection.Node */node2) {
		return  (((node1.isRadioStartTx() && node2.isRadioEndTx()) || (node2.isRadioStartTx() && node1.isRadioEndTx())) && (node1.getEvent() === node2.getEvent()));
	},


	/**
	 * Insert node into array according to begin time.
	 * @param nodes
	 * @param node
	 * @returns {Dissection.Node[]}
	 * @private
	 */
	insert: function(/** Dissection.Node[] */nodes, /** Dissection.Node */node) {
	    for (var i = 0; i < nodes.length; i++) {
		var n = nodes[i];
		if (node.getBeginTime() < n.getBeginTime()) {
		    nodes.splice(i, 0, node);
		    return nodes;
		}
	    }
	    nodes.push(node);
	    return nodes;
	},


	/**
	 * Check array to be sorted according to begin time.
	 * @private
	 */
	check: function(/** Dissection.Node[] */nodes) {
	    var prevNode;
	    for (var i = 0; i < nodes.length; i++) {
		var currNode = nodes[i];
		if (prevNode) {
		    assert(prevNode.getBeginTime() <= currNode.getBeginTime());
		}
		currNode = prevNode;
	    }
	}
    }
);






// --------------------------------------------------------------------
// 
// 
// Dissection.Channel
// 
//
// --------------------------------------------------------------------



Class.define(
    "Dissection.Channel",
    /**
     * @lends Dissection.Channel.prototype
     */
    {

	/**
	 * @constructs
	 * @private
	 */
	__constr__: function(/** Dissection.ControlsView */controlsView) {
	    this.channel = new Channels.Channel(Dissection.CHANNEL_NAME);
	    this.channel.onData = this.onTimelineData.bind(this);
	    this.position = 0;
	    this.view = controlsView;
	    assert(this.view instanceof Dissection.ControlsView);
	    var _this = this;
	    this.view.setStartStopAction(function(op) {
		_this.requestOperation(op);
	    });
	    this.view.setSaguaroControlAction(function(op) {
		_this.requestOperation(op);
	    });
	},

	/**
	 * Channel receiving the timeline events.
	 * @type Channels.Channel
	 * @private
	 */
	channel: null,

	/**
	 * @type Number
	 * @private
	 */
	position: 0,

	/**
	 * Object received from server.
	 * @param obj
	 * @private
	 */
	onTimelineData: function(/** Object */obj) {
	    if (obj instanceof Oasis.Info) {
		//QUACK(0, "onTimelineData: " + Util.formatData(obj.moteList));
		// the first object received when connecting to server and dissecting starts
		Sonoran.Registry.init4Motes(obj, false);
		this.requestEvents(0);
		this.onOasisInfo(obj);
		return;
	    }

	    if (obj instanceof Saguaro.Info) {
		this.view.render3(obj);
		return;
	    }

	    if (obj instanceof Dissection.State) {
		this.view.render1(obj);
		this.onDissectionState(obj);
		return;
	    }

	    assert(obj.start!==undefined);
	    assert(obj.end!==undefined);
	    assert(obj.events!==undefined);
	    assert(obj.start===this.position);
	    assert(obj.end===obj.start+obj.events.length);

	    this.onEvents(obj.events);

	    this.position = obj.end;

	    // get next events
	    this.requestEvents();
	},

	/**
	 * Called when dissection has been restarted.
	 * @param state
	 * @private
	 */
	onOasisInfo: function(/** Object */state) {},

	/**
	 * Called when new dissection state is received.
	 * @param state
	 * @private
	 */
	onDissectionState: function(/** Dissection.State */state) {},


	/**
	 * Called when dissected events are received.
	 * @param events
	 * @param callback
	 * @private
	 */
	onEvents: function(/** Object[] */events, /** Function */callback) {},

	/**
	 * Request events.
	 * @param position   Optional
	 * @private
	 */
	requestEvents: function(/** Number */position) {
	    if (position!==undefined) {
		this.position = position;
	    }
	    var obj = { position: this.position };
	    this.channel.push(obj);
	},

	/**
	 * @param operation Must be 'init', 'fini', 'halt' or 'continue'
	 * @private
	 */
	requestOperation: function(/** String */operation) {
	    this.channel.push({ operation: operation });
	}
    }
);



// --------------------------------------------------------------------
// 
// Timeline
//
// --------------------------------------------------------------------

/**
 * @namespace Timeline
 */
Timeline  =  {};



Class.define(
    "Timeline.ClientSettings",
    /**
     * @lends Timeline.ClientSettings.prototype
     */
    {
	/**
	 * @constructs
	 */
	__constr__: function() {
	    this.dfltFontName = "Helvetica";   // Geneva, Courier, Arial, Lucida Sans, Trebuchet, Courier New
	},
	
	/**
	 * @type String
	 * @private
	 */
	dfltFontName: null,

	/**
	 * Return the default font name to use in the canvas.
	 * @returns {String}
	 */
	getDfltFontName: function() {
	    return this.dfltFontName;
	},

	/**
	 * @returns {String}
	 * @nodoc
	 */
	toString: function() {
	    var txt = "Default-Font:               " + this.dfltFontName + "\n";
	    return txt;
	}
    }
);







