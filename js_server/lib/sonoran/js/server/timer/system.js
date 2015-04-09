//  (C) COPYRIGHT INTERNATIONAL BUSINESS MACHINES CORPORATION 2006-2010
//                       ALL RIGHTS RESERVED
//        IBM Research Division, Zurich Research Laboratory
// --------------------------------------------------------------------


/**
 * Timers based on the system clock.
 * @class
 * @static
 * @private
 */
Timer.System = {};


Timer.Value.extend(
    "Timer.System.Value",
    /**
     * @lends Timer.System.Value
     */
    {
        /**
         * Timer.System.Value inherits from Timer.Value to represent time and time spans based on system time.
         * @augments Timer.Value
         * @constructs
         * @param value
	 * @private
         */
        __constr__: function(/** Number */value) {
            Timer.Value.call(this, value, Timer.System.queue);
        }
    }
);

/**
 * A time span for system timers is represented by a Timer.System.Value.
 * @see Timer.System.Value
 * @private
 */
Timer.System.Span = Timer.System.Value;

/**
 * A point in time for system timers is represented by a Timer.System.Value.
 * @see Timer.System.Value
 * @private
 */
Timer.System.Time = Timer.System.Value;


/**
 * @returns {Timer.System.Value} the current time as a Timer.Value object
 * @private
 */
Timer.System.getTime = function() {
    return new Timer.System.Time(Clock.get());
};

/**
 * @param span
 * @returns {Timer.System.Value} a Timer.Value object for the specified time span
 * @private
 */
Timer.System.getSpan = function(/** Number */span) {
    return new Timer.System.Span(span);
};





Timer.Queue.extend(
    "Timer.System.Queue",
    /**
     * @lends Timer.System.Queue.prototype
     */
    {
        /**
         * Queue of timers for system clock.
         * @augments Timer.Queue
         * @constructs
	 * @private
         */
        __constr__: function() {
            Timer.Queue.call(this);
        },

        /**
         * @private
         */
        program: function() {
            var deadline = (this.head == null) ? 0 : this.head.deadline.toMillis();
            Clock.set(deadline);
        },

        /**
         * Start timer.
         * @param timer
         * @returns {Timer.Timer}
	 * @private
         */
        start: function(/** Timer.Timer */timer) {
            assert(!this.contains(timer));
            if (!timer.deadline) {
                assert(timer.span);
                timer.deadline = Timer.System.getTime();
            }
            if (timer.span) {
                timer.deadline = timer.deadline.add(timer.span);
            }
            if (this.add(timer)) {
                this.program();
            }
            return timer;
        },

        
        /**
         * Invokes callbacks of elapsed timers and programs next timer.
         * @returns {Boolean} whether a timer was elapsed and invoked
         * @private
         */
        onElapse: function(/** Timer.time */now) {
            var entries = [];
            var entry = this.head;
            while((entry != null) && (entry.deadline.lte(now))) {
                entries.push(entry);
                this.head = entry.next;

                entry.queue = null;
		entry.next = null;
		//QUACK(0, "NOTIFY: " + entry);
		//Event.Registry.signalEvent(new Event.Timeout(entry, new AOP.ERR(ERR_TIMEOUT, "Timeout: " + entry)));

                entry = this.head;
            }

            this.program();

	    while(entries.length > 0) {
		entry = entries.shift();
		var cb = entry.getCallback();
		assert(cb);
		entry.setCallback(null);
		try {
		    var err = new AOP.ERR(ERR_TIMEOUT, "Timeout: " + entry);
		    cb(err, entry);
		} catch(ex) {
		    var msg = Runtime.dumpException(ex, "Timer call back failed");
		    QUACK(0, msg);
		    Logger.err(msg);
		}
	    }
        },


        /**
         * Cancel a timer.
	 * @param entry
	 * @private
         */
        cancel: function(/** Timer.Entry */entry) {
            var b = this.remove(entry);
            if (b) {
                this.program();
            }
            return entry;
        },

        /**
         * @returns {String}
	 * @ignore
         */
        toString: function() {
            return "Timer.System.queue";
        }


	// /**
	//  * @param timer
	//  * @param err
	//  * @private
	//  */
	// onEvent: function(/** Timer.Timer */timer, /** AOP.ERR */err) {
	//     var callback = timer.getCallback();
	//     if (!callback) {
	// 	// cancelled after the timer expired but before the event was forwarded by the event handler thread
	// 	//QUACK(0, "WARN: ignore expired, but cancelled system timer: " + timer);
	// 	return;
	//     }
	//    assert(err);
	//     timer.setCallback(null);
	//     callback(err, timer);
	// }
    }
);


/**
 * System timer queue.
 * @type Timer.Queue
 * @private
 */
Timer.System.queue = new Timer.System.Queue();

/**
 * Remove all timers based on system queue. Useful when sonoran process is exited. 
 * @private
 */
Timer.System.reset = function() {
    Timer.System.queue.removeAll();
    Clock.set(0);
};


construct(
    "Timer.System.Universe",
    Timer.Universe,
    /**
     * @lends Timer.System.Universe
     */
    {
        /**
         * Timer.System.Universe implements the time universe methods for the system clock.
         * @augments Timer.Universe
         * @constructs
	 * @private
         */
        __constr__: function() {
            Timer.Universe.call(this);
        },

	/**
	 * @returns {String}
	 * @ignore
	 */
        toString: function() {
            return "Timer.System.Universe";
        },

        /**
         * @returns {Timer.Time}
	 * @private
         */
        getTime: function(context) {
            return (context == undefined || context == null) ? Timer.System.getTime() : null;
        },
        
        /**
         * @returns {Timer.Span}
	 * @private
         */
        getSpan: function(/** Number */span, /** Object */context) {
            return (context == undefined || context == null) ? new Timer.System.Span(span) : null;
        }
    }
);


assert(Clock);

/**
 * The timer core queue receives the timer events from the native code.
 * @class
 * @private
 */
Clock.queue = {
   /**
    * Core queue id.
    * @private
    */
   id: -1,

   /**
    * @private
    */
   onBlob: function(/** Number */now) {
       now = new Timer.System.Time (now);
       Timer.System.queue.onElapse(now);
   }
};




Timer.System.universe = new Timer.System.Universe();
Timer.universes.push(Timer.System.universe);

