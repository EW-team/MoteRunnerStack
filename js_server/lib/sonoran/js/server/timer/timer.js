/**
 * <ul>
 * <li>
 * Timers are represented by Timer.Timer instances, they can be created upfront, passed around and
 * by calling their start method, actuated at a later time.
 * </li>
 * <li>
 * When programming timers associated with simulated motes, it is strongly advised to activate them
 * by passing them in at an invocation of Sonoran.Socket.send.
 * </li>
 * <li>
 * The timer constructor takes a span object which encapsulate a time span and the context in which the
 * timer operates (system clock or simulation time). Timer.getSpan creates such a span object expecting
 * a time span as Number and a context object.
 * </li>
 * <li>
 * Clock.get returns the current system time in milliseconds.
 * </li>
 * </ul>
 * @namespace Timer 
 * @see Clock
 * @see Timer.Timer
 * @see Timer.System
 * @see Saguaro.Timer
 */
Timer = {};


Runtime.include("./value.js");
Runtime.include("./queue.js");
Runtime.include("./universe.js");
Runtime.include("./system.js");




/** 
 * Helper function to start a single or a set of timers.
 * @param timers    Single Timer or array of timers
 */
Timer.startTimers = function (/** Timer.Timer|Timer.Timer[] */timers) {
    if (timers instanceof Timer.Timer) {
        timers = [ timers ];
    }
    for (var i = 0; i < timers.length; i++) {
        var t = timers[i];
        assert(t instanceof Timer.Timer);
	if( !(t instanceof Timer.Timer) )
            throw sprintf("Illegal value: Expecting a Timer.Timer");
        if( t.isQueued() )
            throw sprintf("Timer has already been started: %s", t);
        if( t.hasExpired() )
            throw sprintf("Timer has already been expired: %s", t);
        if( t.getDeadline() )
            throw sprintf("Timer has already a deadline: %s", t);
        if( !t.getCallback() )
            throw sprintf("No callback for timer has been specified: %s", t);
	t.start();
    }
}





Class.define(
    "Timer.Timer",
    /**
     * @lends Timer.Timer.prototype
     */
    {
        /**
         * Instances of this class specify the properties of a timer, a time span after which the timer expires and
         * a callback function which is invoked on expiration.
         * The time span encapsulates the context in which the timer is active. A timer span object is created by:
         * <pre>
         *   var span = Timer.getSpan(number, context);
         * </pre>
         * If context is null or undefined, a time span associated with the system clock is created. If a simulated mote
         * or connection is specified, a span associated with the connection is created.
         * A timer is created then using:
         * <pre>
         *   var timer = new Timer.Timer(Timer.get(span, context), callback);
         * </pre>
         * The constructor also supports the following variation creating the Timer.Span object:
         * <pre>
         *   var timer = new Timer.Timer(number, context, callback);
         * </pre>
         * The constructor allows to specify an absoulte time as deadline. The span parameter must be left undefined,
         * and a point in time must be defined based on Timer.getTime:
         * <pre>
         *   var time = Timer.getTime(context);     // current time in specified context
         *   var span = Timer.getSpan(100, context);  
         *   time.add(span);                          
         *   var timer = new Timer.Timer(undefined, time, callback);
         * </pre>
         * The callback function might be left out and added later:
         * <pre>
         *   var timer = new Timer.Timer(span, context);     
         *   timer.setCallback(callback);                    
         * </pre>
         * In case of simulated motes, timers should be started by passing them into Sonoran.Socket.send:
         * <pre>
         *   var timer = new Timer.Timer(100, mote, callback);    
         *   socket.send(data, mote, 0, timer);                   
         * </pre>
         * On expiration, the callback is invoked with an AOP.ERR instance and the timer instance having expired.</br>
         * Timer.cancel can be used to cancel a timer.</br>
         * Timer instances should never be reused, but always newly created.</br>
         * A timer carries a uniqueid which can be used for housekeeping timers:
         * <pre>
         *   var timer = new Timer.Timer(100, mote, callback);     
         *   timers = {};                                          
         *   timers[timer.getId()] = timer;                        
         *   delete timers[timer.getId()];                        
         * </pre>
         * @class
         * @constructs
         * @param span         Time span, either a Timer.Span or number (milliseconds)
         * @param deadline     Optional, a context (if span is a number); a deadline (Timer.Time); a callback (if function)
         * @param callback     Callback
         */
        __constr__: function(/** Number|Timer.Span */span, /** Object|Timer.Time */deadline, /** DFLT_ASYNC_CB */callback) {
            assert(deadline != -1);
            if (typeof(span) === 'number') {
                var context = deadline;
                deadline = undefined;
                assert(!context || !(context instanceof Timer.Time));
                span = Timer.getSpan(span, context);
            } else {
                assert(!span || (span instanceof Timer.Value));
                assert(!deadline || (deadline instanceof Timer.Value));
            }
            this.span = span;
            if (deadline && typeof(deadline) === 'function') {
                assert(!callback);
                this.deadline = null;
                this.callback = deadline;
            } else {
                this.deadline = deadline;
                this.callback = callback;
            }
            assert(this.span||this.deadline);
            if (this.span&&this.deadline) {
                assert(this.span.getQueue() == this.deadline.getQueue());
            }
            this.queue = this.span ? this.span.getQueue() : this.deadline.getQueue();
            assert(this.queue);
            this.tid = Timer.getTID();
        },

        /**
         * Global ID useful for debugging
         * @type Number
         * @private
         */
        tid: -1,

        /**
         * The timeout span, migt be undefined.
         * @type Timer.Span
         * @private
         */
        span: null,

        /**
         * The timeout specified the expiration time
         * @type Timer.Time
         * @private
         */
        deadline: null,

        /**
         * User-defined callback function
         * @type Function
         * @private
         */
        callback: null,

        /**
         * The queue is set to null when the timer is removed or expires.
         * @type Timer.Queue
         * @private
         */
        queue: null,

        /**
         * @type Timer.Entry
         * @private
         */
        next: null,

         /**
         * Return the timer id.
         * @returns {Number} the timer id
         */
        getId: function() {
            return this.tid;
        },

        /**
         * Return the timer queue.
         * @returns {Object} the timer queue
         * @private
         */
        getQueue: function() {
            return this.queue;
        },

        /**
         * Is this timer queued? I.e. has it been started already?
         * @returns {Boolean}
         */
        isQueued: function() {
            return (this.queue!=null && this.queue.contains(this));
        },

        /**
         * Has the timer already expired?
         * @returns {Boolean}
         * @private
         */
        hasExpired: function() {
            return (this.queue==null);
        },
        
        /**
         * Return the deadline.
         * @returns {Timer.Time} the deadline
         */
        getDeadline: function() {
            return this.deadline;
        },

        /**
         * Set the deadline
         * @param deadline
         * @private
         */
        setDeadline: function(/** Timer.Time */deadline) {
            assert(deadline != -1);
            this.deadline = deadline;
        },

        /**
         * Return time span
         * @returns {Timer.Span} the deadline
         */
        getSpan: function() {
            return this.span;
        },

        /**
         * Get the callback.
         * @returns {DFLT_ASYNC_CB}
         */
        getCallback: function() {
            return this.callback;
        },

        /**
         * Set the callback.
         * @param callback
         */
        setCallback: function(/** DFLT_ASYNC_CB */callback) {
            this.callback = callback;
        },

        /**
         * Fire the callback.
         * @param err
         * @private
         */
        notify: function(/** AOP.ERR */err, /** Timer.Time */now) {
            this.next = null;
            this.queue = null;
            try {
	        this.callback(err, this, now);
            }catch(ex) {
                QUACK(0, Runtime.dumpException(ex));
	        SYSTEM_EXC_HANDLER(ex, "Timer expiration callback failed: " + ex);
            }
        },

        /**
         * Cancel this timer. A timer having not been started yet or having already 
         * expired is ignored. If the timer is active, i.e. queued on a timer queue,
         * it is removed from the queue. The timer cannot be reused after a cancel
         * operation.
         * @returns {Timer.Timer} this
         */
        cancel: function() {
            if (!this.queue) {
                //QUACK(0, "WARN: Timer.cancel: ignore timer having expired: " + this);
		this.callback = null;
                return this;
            }
            this.queue.cancel(this);
            assert(!this.queue);
            return this;
        },

        /**
         * Start this timer.
         * @param callback    Optional, callback
         * @returns {Timer.Timer} this
         */
        start: function(/** DFLT_ASYNC_CB */callback) {
            assert(this.queue, "Timer has already been used or is in use: " + this);
            assert((callback&&!this.callback)||(this.callback&&!callback), "Callback must be set in either start or constructor method");
            if (callback) {
                this.callback = callback;
            }
            this.queue.start(this);
            return this;
        },

        /**
         * @returns {String} string
         */
        toString: function() {
            var txt = "Timer:" + this.tid;
            if (this.span) {
                txt += ";span:" + this.span;
            }
            if (this.deadline) {
                txt += ";deadline:" + this.deadline;
            }
            return txt;
        }
    }
);





/**
 * Returns the current time in the specified context. If the context is undefined or null,
 * a time object representing the current system time is returned. If a sagauro connection or a
 * simulated mote is presented, a time object based on the simulation is returned.
 * @param context Context
 * @returns {Timer.Time}
 */
Timer.getTime = function(/** Object */context) {
    for (var i = 0; i < Timer.universes.length; i++) {
        var time = Timer.universes[i].getTime(context);
        if (time) {
            return time;
        }
    }
    throw "Cannot get time for unknown time context: " + context;
};


/**
 * Returns a time span object for the specified context. If the context is undefined or null,
 * a time span object based on system time is returned. If a sagauro connection or a simulated
 * mote is presented, a Sonoran time span object is returned.
 * @param span    Milliseconds
 * @param context Context
 * @returns {Timer.Span}
 */
Timer.getSpan = function(/** Number */span, /** Object */context) {
    for (var i = 0; i < Timer.universes.length; i++) {
        var obj = Timer.universes[i].getSpan(span, context);
        if (obj) {
            return obj;
        }
    }
    throw "Cannot get time span for unknown time context: " + context;
};



/**
 * @type Number
 * @private
 */
Timer.TID = 0;

/**
 * Get next global timer id.
 * @returns {Number}
 * @private
 */
Timer.getTID = function() {
    this.TID += 1;
    return this.TID;
};


/**
 * Program timer to elapse after specified time span. If 'span' is a number and the second parameter is the callback
 * function, a timer based on the system time is created and started.  If 'span' is a number and the second parameter
 * is not a function, it is used as context in the call Timer.getSpan(span, context) to create a Timer.Span
 * object. The third parameter must then be the callback function.</br>
 * If the first parameter is of type Timer.Span, the second parameter must be the callback function.</br>
 * Examples:
 * <pre>
 * var timer1 = Timer.timeoutIn(100, function(status) { ... });                 // Timer based on system clock
 * var timer2 = Timer.timeoutIn(1000, mote, function(status) { ... });          // Timer based on mote clock
 * var timer3 = Timer.timeoutIn(1000, connection, function(status) { ... });    // Timer based on connection clock
 * </pre>
 * @param span        Number or Timer.Span object
 * @param context     Context for span or callback function
 * @param callback    If not specified before, callback function, otherwise must be undefined
 * @returns {Timer.Timer} timer handle
 */
Timer.timeoutIn = function(/** Number|Timer.Span */span, /** Object */context, /** Function */callback) {
    assert(arguments.length==2||arguments.length==3, "API signature changed");
    if (typeof(span) === 'number') {
        if (typeof(context)==='function') {
            callback = context;
            context = undefined;
        }
        span = Timer.getSpan(span, context);
    } else {
        assert(span instanceof Timer.Value);
    }
    assert(typeof(callback) === 'function');
    assert(span.toMillis() < 1E9, "Timespan too large: " + span.toMillis());
    var timer = new Timer.Timer(span, undefined, callback);
    timer.start();
    return timer;
};


/**
 * Program timer to elapse at specified point in time. If deadline is a number, a timer based on system
 * time is started.
 * @param deadline    Number (millis) or Timer.Time object
 * @param callback    Callback function
 * @returns {Timer.Timer} timer handle
 */
Timer.timeoutAt = function(/** Number|Timer.Time */deadline, /** Function */callback) {
    assert(arguments.length == 2, "API signature changed");
    assert(typeof(callback) === 'function');
    if (typeof(deadline) === 'number') {
        deadline = new Timer.System.Time(deadline);
    };
    assert(deadline instanceof Timer.Time);
    var timer = new Timer.Timer(undefined, deadline, callback);
    timer.start();
    return timer;
};


/**
 * Cancel a timer and remove it from its queue. If parameter is null, undefined, has not been
 * started yet or has already be expired, it is ignored.
 * @param handle       Timer handle
 */
Timer.remove = function(/** Timer.Timer */handle) {
    if (!handle) {
	//QUACK(0, "WARNING: timer is not queued " + handle);
        return;
    }
    var queue = handle.getQueue();
    if (!queue) {
	//QUACK(0, "WARNING: timer is not queued " + handle);
	return;
    }
    queue.cancel(handle);
};




// /**
//  * Thread forwarding timeout events, decoupled from event registry thread..
//  * @private
//  */
// Timer.eventHandler = new Thread.Consumer("Timer.EventHandler", 1024, function(/** Event.Timeout */blob) {
//      var timer = blob.getTimer();

//     var deadline = timer.getDeadline();
//     assert(deadline);
//     var queue = deadline.getQueue();
//     assert(queue);
    
//     var err = blob.getERR();
//     assert(err);
//     queue.onEvent(timer, err);
// });



Exception.extend(
    "Timer.Exception",
    /**
     * @lends Timer.Exception.prototype
     */
    {
	/**
	 * Timer exception class.
	 * @class
	 * @augments Exception
	 * @constructs
	 * @param err       Error instance
	 * @param message   Optional
	 */
	__constr__: function(/** AOP.ERR */err, /** String */message) {
	    message = message ? message : (err ? err.message : "Timeout");
	    var stack = err?err.stack:undefined;
	    Exception.call(this, message, ERR_TIMEOUT, stack);
       }
    }
);



