//  (C) COPYRIGHT INTERNATIONAL BUSINESS MACHINES CORPORATION 2006-2010
//                       ALL RIGHTS RESERVED
//        IBM Research Division, Zurich Research Laboratory
// --------------------------------------------------------------------

Runtime.include("event/event.js");
Runtime.include("event/registry.js");
Runtime.include("event/history.js");

Runtime.include("./queue.js");
Runtime.include("./registry.js");




/************************************************************************************************************************
/
/ Event.Collector: collect and wait for events
/
 ************************************************************************************************************************/


Class.define(
    "Event.Collector",
    /**
     * @lends Event.Collector.prototype
     */
    {
	/**
	 * Allows to collect events and wait for a particular event. Example:
	 * <pre>
	 *  var collector = new Event.Collector();
	 *  var filter = function(ev) { return (ev.category==='mote'); }
	 *  var settings = new Sonoran.MoteSettings();
	 *  Sonoran.createMote(settings, 1, SCB);
	 *  result = collector.wait4(filter, new Timer.Timer(1000, undefined), SCB);
	 * </pre>
	 * @constructs
	 * @param capacity    Optional
	 */
	__constr__: function(/** Number */capacity) {
	    if (!capacity) { capacity = 1024; }
	    this.buf = new Util.RingBuffer(capacity, 2);
	    this.filter = null;
	    this.callback = null;
	    this.timer = null;
	    var _this = this;
	    /** @ignore */
	    var func = function(ev) {
		if (ev.category===Event.EV_CAT_LOG) {
		    return;
		}
		_this.buf.add(ev);
		if (_this.callback) {
		    assert(_this.filter);
		    if (_this.filter(ev)) {
			_this.notify(new AOP.OK(ev));
		    }
		}
	    };
	    this.listener = Event.Registry.addObserver(func);
	},

	/**
	 * Wait until timeout occurs or event has been received.
	 * @param filter     Return true if received event matches 
	 * @param timer      Timer instance, without a callback set
	 * @param callback
	 * @returns {Event}
	 * @throws {AOP.Exception}
	 */
	wait4: function(/** Function */filter, /** Timer.Timer */timer, /** DFLT_ASYNC_CB */callback) {
	    if (BC.is(callback)) { return BC.exec(arguments.callee, this, arguments); }
	    if (this.filter||this.callback||this.timer) {
		throw "Event.Collector.wait4 already active!";
	    }
	    if (filter instanceof Util.PropertyFilter) {
		var propFilt = filter;
		filter = function(ev) {
		    return propFilt.match(ev);
		};
	    };
	    assert(!timer.getCallback(), "Timer has already been started");
	    this.filter = filter;
	    this.callback = callback;
	    for (var i = 0; i < this.buf.getUsed(); i++) {
		var ev = this.buf.get(i);
		if (filter(ev)) {
		    this.notify(new AOP.OK(ev));
		    return;
		}
	    }
	    var _this = this;
	    this.timer = timer;
	    timer.setCallback(this.notify.bind(this));
	    timer.start();
	},

	/**
	 * @param result
	 * @private
	 */
	notify: function(/** AOP.Result */result) {
	    if (this.timer) {
		//QUACK(0, "NOTIFY: cancel timer " + this.timer);
		this.timer.cancel();
		this.timer = null;
	    } else {
		//QUACK(0, "NOTIFY: no timer..");
	    }
	    if (this.filter) {
		this.filter = null;
	    }
	    if (this.callback) {
		var callback = this.callback;
		this.callback = null;
		callback(result);
	    }
	},
	
	/**
	 * Close this event collector.
	 */
	close: function() {
	    if (this.callback) {
		this.notify(new AOP.ERR(ERR_GENERIC, "Event.Collector was closed"));
	    }
	    if (this.listener) {
		Event.Registry.removeObserver(this.listener);
		this.listener = null;
	    }
	}
    }
);



/**
 * Wait for event to arrive. Any event is forwarded to the  filter function which should return
 * true if the event has arrived. The callback is then invoked with an AOP.OK instance pointing
 * to that event. If no event matches, the callback is invoked with an AOP.ERR instance.
 * @param filter
 * @param timer
 * @param callback
 */
Event.wait4 = function(/** Function */filter, /** Timer.Timer */timer, /** DFLT_ASYNC_CB */callback) {
    if (BC.is(callback)) { return BC.exec(arguments.callee, this, arguments); }
    var collector = new Event.Collector();
    collector.wait4(filter, timer, function(res) {
	collector.close();
	callback(res);
    });
};
