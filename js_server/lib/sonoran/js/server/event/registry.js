//  (C) COPYRIGHT INTERNATIONAL BUSINESS MACHINES CORPORATION 2006-2010
//                       ALL RIGHTS RESERVED
//        IBM Research Division, Zurich Research Laboratory
// --------------------------------------------------------------------





/**
 * Ask the registry to forward an event to registered listeners.
 * @param blob Event
 * @static
 */
Event.Registry.signalEvent = function(/** Event */blob) {
    if (this.enable4immediate && this.msgtype2filter4immediate) {
	var filter = this.msgtype2filter4immediate[blob.msgtype];
	if (filter) {
	    //QUACK(0, "FILTER: " + filter);
	    if (filter.match(blob)) {
		CLI.Shells.printImmediate(blob.toString());
	    }
	}
    }

    Event.Registry.eventHandler.addObject(blob);
};


/**
 * The thread delivering events. This thread should never block for too long as 
 * event delivery should be reasonable smooth within the system.
 * @type Thread.Consumer
 */
Event.Registry.eventHandler = new Thread.Consumer("Event.Registry.Queue", 1024, function(ev) { 
    if (ev.category==="saguaro" && ev.evname==="blob") {
	assert(ev.dispatcher);
	ev = ev.dispatcher.handleBlob(ev);
	if (!ev) {
	    return;
	}
    }

    //QUACK(0, "Event.Registry.eventHandler: " + ev.category + ", " + ev.evname);
    var handlers = Event.Registry.handlers;
    try {
	// observers
	var ret = handlers[0].notify(ev);
	// filters
	var ret = handlers[1].notify(ev);
	// listeners
	var ret = handlers[2].notify(ev);
    } catch (x) {
	QUACK(0, Runtime.dumpException(x, "Event callback failed"));
    }
    //QUACK(0, "Event.Registry.eventHandler return");
});




/**
 * @param tid If undefined, current thread
 * @returns {Boolean}
 * @param tid
 * @private
 */
Event.Registry.runOnHandlerThread = function(/** Number */tid) {
    if (!tid) { tid = Thread.current(); }
    return Event.Registry.eventHandler.getTid() === tid;
};

