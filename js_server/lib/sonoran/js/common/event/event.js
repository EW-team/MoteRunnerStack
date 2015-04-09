//  (C) COPYRIGHT INTERNATIONAL BUSINESS MACHINES CORPORATION 2006-2010
//                       ALL RIGHTS RESERVED
//        IBM Research Division, Zurich Research Laboratory
// --------------------------------------------------------------------


/************************************************************************************************************************
/
/ Event
/
 ************************************************************************************************************************/

Class.construct(
    "Event",
    null,
    /**
     * @lends Event.prototype
     */
    {
	/**
	 * Event implements the base class for Events distributed by Event.Registry to all of its listeners.
	 * Event instances must be treated as read-only objects.
	 * @constructs
	 * @param category  Event category
	 * @param evname    Event name
	 * @param time      Timestamp in microseconds, if unspecified Clock.get is called to retrieve a current timestamp
	 */
	__constr__: function(/** String */category, /** String */evname, /** Number */time) {
	    assert(typeof(category)=='string');
	    assert(typeof(evname)=='string');
	    //Runtime.blockAccess(this, "msgtype");
	    this.category = category;
	    this.evname = evname;
	    this.id = Event.ID;
	    Event.ID += 1;
	    this.time = time||(Clock.get()*1000);
	    assert(typeof(this.time)==='number');
	},

	/**
	 * @type String
	 */
	category: null,

	/**
	 * @type String
	 */
	evname: null,

	/**
	 * Timestamp in microseconds.
	 * @type Number
	 */
	time: null,

	/**
	 * Event id.
	 * @type Number
	 */
	id: null,

	/**
	 * Returns a unique event id for this event.
	 * @returns {Number}  a unique event id for this event.
	 */
	getId: function() {
            return this.id;
	},

	/**
	 * @returns {String}
	 */
	getCategory: function() {
	    return this.category;
	},
	
	/**
	 * @returns {String}
	 */
	getEvName: function() {
	    return this.evname;
	},

	/**
	 * @returns {Number} timestamp in millis
	 */
	getTimeInMillis: function() {
            return parseInt(this.time/1000); 
	},
	
	/**
	 * @returns {Number} timestamp in micros
	 */
	getTimeInMicros: function() {
            return this.time;
	},
	
	/**
	 * @returns {Number} timestamp in nanos
	 */
	getTimeInNanos: function() {
            return this.time*1000;
	},
	
	/**
	 * @returns {Date} timestamp as date object
	 */
	getTimeAsDate: function() {
            return new Date(parseInt(this.time/1000));
	},
	
	
	/**
	 * @returns {String} String
	 */
	toString: function() {
	    return Event.Formatter.toText(this).join("\n");
	}
    },
    /**
     * @lends Event
     */
    {
	/**
	 * @type Number
	 * @private
	 */
	ID: 1
    },
    true
);



/**
 * @type String
 */
Event.EV_CAT_TIMER = "timer";

/**
 * @type String
 */
Event.EV_CAT_LOG = "log";

/**
 * @type String
 */
Event.EV_NAME_TIMEOUT = "timeout";



Event.extend(
    "Event.Timeout",
    /**
     * @lends Event.Timeout.prototype
     */
    {
	/**
	 * Event.Timeout signal a timeout event.
	 * @constructs
	 * @augments Event
	 * @param timer Timer
	 * @param err   Error instance
	 */
	__constr__: function(/** Timer.Timer */timer, /** AOP.ERR */err) {
	    assert(arguments.length===2);
	    var time = timer.getDeadline().toMicros();
	    Event.call(this, Event.EV_CAT_TIMER, Event.EV_NAME_TIMEOUT, time);
	    this.timer = timer;
	    this.err = err;
	    assert(timer.getCallback());
	    assert(!timer.isQueued());
	    assert(!timer.next);
	},

	/**
	 * Timer instance.
	 * @type Timer.Timer
	 */
	timer: null,
	/**
	 * Eror associated with this timer.
	 * @type AOP.ERR
	 */
	err: null,

	/**
	 * @returns {Timer.Timer}  timer
	 */
	getTimer: function() {
            return this.timer;
	},

	/**
	 * @returns {AOP.ERR} err
	 */
	getERR: function() {
            return this.err;
	}
    }
);

Event.isTimerEvent = function(evt) {
    return evt.category === Event.EV_CAT_TIMER;
};



Event.extend(
    "Event.Log",
    /**
     * @lends Event.Log.prototype
     */
    {
	/**
	 * Event.Log carries a log event. Properties include severity, module, logmsg, time and mote.
	 * time.
	 * @constructs
	 * @augments Event
	 * @param blob   Carries the properties of the log message
	 */
	__constr__: function(/** Object */blob) {
	    assert(!blob.msgtype);
	    assert(blob.evname);
	    var time = blob.time;
	    if (time) { time = time/1000; }
	    Event.call(this, Event.EV_CAT_LOG, blob.evname, time);
	    for (var p in blob) {
		this[p] = blob[p];
	    }
	    if (time) {
		this.time = time;
	    }
	    this.category = Event.EV_CAT_LOG;
	    this.evname = blob.evname;
	},

	/**
	 * @returns {Sonoran.Mote} or null
	 */
	getMote: function() {
	    return this.srcid;
	}
    }
);








/************************************************************************************************************************
/
/ Event.Formatter
/
/************************************************************************************************************************/



/**
 * Event formatter.
 * @class
 * @private
 */
Event.Formatter = {
    /**
     * Returns formatted event for text rendering.
     * @returns {String[]} Text lines for ascii renderer
     * @private
     */
    toText: function(/** Event */evt) {
	var t = new Util.Formatter.Object();
	t.addObj(evt, undefined, 
	    function(k, v, obj) {
		return (k!=="__constr__");
	    },
	    function(obj, k, v) {
		if (obj===evt && k==="time") {
		    return Util.micros2str(evt.getTimeInMicros());
		}
		var p = obj[k];
		if (!p) {
		    return undefined;
		}
		if (p.__constr__ !== undefined) {
		    return p.toString();
		} else {
		    return undefined;
		}
	    }
	);
	return t.toText();
    }
};


