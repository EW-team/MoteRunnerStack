//  (C) COPYRIGHT INTERNATIONAL BUSINESS MACHINES CORPORATION 2006-2010
//                       ALL RIGHTS RESERVED
//        IBM Research Division, Zurich Research Laboratory
// --------------------------------------------------------------------


/**
 * Saguaro.Timer implements point in time and time spans for saguaro simulations.
 * @class
 * @private
 */
Saguaro.Timer = {};

Timer.Universe.extend(
    "Saguaro.Timer.Universe",
    /**
     * @lends Saguaro.Timer.Universe
     * @private
     */
    {
        /**
         * @augments Timer.Universe
         * @constructs
         * @private
         */
        __constr__: function() {
            Timer.Universe.call(this);
        },

        /**
         * @returns {String}
         * @private
         */
        toString: function() {
            return "Saguaro.Timer.Universe";
        },

        /**
         * @param context
         * @returns {Timer.Time}
         * @private
         */
        getTime: function(context) {
            var isConn = (context instanceof Saguaro.Connection);
            var isMote = (context instanceof Sonoran.Mote);
            if (!isConn && !isMote) {
                return null;
            }
            var conn;
            if (isConn) {
                conn = context;
            } else if (isMote && context.getClass() === 'saguaro') {
                conn = Saguaro.mote2impl(context).getConnection();
            }
            if (!conn) {
                return Timer.getTime();
            }
            var result = conn.timeCmd(SCB);
            if (result.code != 0) {
                var msg = sprintf("Get time from saguaro '%s' failed: %s", conn, result);
                QUACK(0, msg);
                throw new AOP.Exception(new AOP.ERR(msg, result));
            }
	    var data = result.getData().getReplyData();
            var nanos = data.time;
            assert(nanos>=0);
            return Saguaro.Timer.nanos2Time(nanos, conn);
        },

        /**
         * @param span    Millis
         * @param context Context
         * @returns {Timer.Span}
         * @private
         */
        getSpan: function(/** Number */span, /** Object */context) {
            var isConn = (context instanceof Saguaro.Connection);
            var isMote = (context instanceof Sonoran.Mote);
            if (!isConn && !isMote) {
                return null;
            }
            if (isConn || (isMote && context.getClass() === 'saguaro')) {
                return Saguaro.Timer.millis2Span(span, context);
            } else {
                return Timer.getSpan(span);
            }
        }
    }
);

/**
 * @type Sonoran.Timer.Universe
 * @private
 */
Saguaro.Timer.universe = new Saguaro.Timer.Universe();
Timer.universes.push(Saguaro.Timer.universe);


Timer.Value.extend(
    "Saguaro.Timer.Value",
    /**
     * @lends Saguaro.Timer.Value
     * @private
     */
    {
        /**
         * Instances of this class keep a virtualized point in time or time span of a simulation. Use
         * the factory methods to create instance instead of directly this constructor.
         * @constructs
         * @param value
         * @param queue
         * @see Saguaro.Timer.nanos2Time
         * @see Saguaro.Timer.millis2Time
         * @see Saguaro.Timer.micros2Time
         * @see Saguaro.Timer.nanos2Span
         * @see Saguaro.Timer.millis2Span
         * @see Saguaro.Timer.micros2Span
         * @private
         */
        __constr__: function(/** Number */value, /** Object */queue) {
            value = value * 1000 * 1000;
            Timer.Value.call(this, value, queue);
        },

        /**
         * @returns {Number}
         * @private
         */
        toMillis: function() {
            return this.value/(1000*1000);
        },

        /**
         * @returns {Number}
         * @private
         */
        toMicros: function() {
            return this.value/1000;
        },

        /**
         * @returns {Number}
         * @private
         */
        toNanos: function() {
            return this.value;
        },

        /**
         * Adds specified value to this value and returns this.
         * @param tv
         * @returns {Timer.Value} this
         * @private
         */
        add: function(/** Timer.Value */tv) {
            var ret = new Saguaro.Timer.Value(0, this.queue);
            ret.value = this.value + tv.value;
            return ret;
        },

        /**
         * Subtracts specified value from this value and returns this.
         * @param tv
         * @returns {Timer.Value} new instance
         * @private
         */
        sub: function(/** Timer.Value */tv) {
            var ret = new Saguaro.Timer.Value(0, this.queue);
            ret.value = this.value - tv.value;
            return ret;
        },

        /**
         * @returns {String}
         * @private
         */
        toString: function() {
            return '"' + Util.nanos2str(this.value) + "\"@" + this.queue.conn.toString();
        }
    }
);


/**
 * A time span for a simulation is represented by a Saguaro.Timer.Value.
 * @class
 * @see Saguaro.Timer.Value
 * @private
 */
Saguaro.Timer.Time = Saguaro.Timer.Value;

/**
 * A point in time for a simulation is represented by a Saguaro.Timer.Value.
 * @class
 * @see Saguaro.Timer.Value
 * @private
 */
Saguaro.Timer.Span = Saguaro.Timer.Value;


/**
 * Return a saguaro point in time.
 * @param nanos
 * @param context   Must be a saguaro mote or a saguaro connection
 * @returns {Saguaro.Timer.Time}
 * @private
 */
Saguaro.Timer.nanos2Time = function(/** Number */nanos, /** Object */context) {
    var t = new Saguaro.Timer.Value(0, Saguaro.Timer.getTimerQueue(context));
    t.value = nanos;
    return t;
};


/**
 * Return a saguaro point in time.
 * @param millis
 * @param context   Must be a saguaro mote or a saguaro connection
 * @returns {Timer.Time}
 * @private
 */
Saguaro.Timer.millis2Time = function(/** Number */millis, /** Object */context) {
    var t = new Saguaro.Timer.Value(0, Saguaro.Timer.getTimerQueue(context));
    t.value = millis*1000*1000;
    return t;
};

/**
 * Return a saguaro point in time.
 * @param micros
 * @param context   Must be a saguaro mote or a saguaro connection
 * @returns {Saguaro.Timer.Time}
 * @private
 */
Saguaro.Timer.micros2Time = function(/** Number */micros, /** Object */context) {
    var t = new Saguaro.Timer.Value(0, Saguaro.Timer.getTimerQueue(context));
    t.value = micros*1000;
    return t;
};

/**
 * Return a saguaro time span.
 * @param nanos
 * @param context   Must be a saguaro mote or a saguaro connection
 * @returns {Saguaro.Timer.Span}
 * @private
 */
Saguaro.Timer.nanos2Span = Saguaro.Timer.nanos2Time;

/**
 * Return a saguaro time span.
 * @param millis
 * @param context   Must be a saguaro mote or a saguaro connection
 * @returns {Saguaro.Timer.Span}
 * @private
 */
Saguaro.Timer.millis2Span = Saguaro.Timer.millis2Time;

/**
 * Return a saguaro time span.
 * @param micros
 * @param context   Must be a saguaro mote or a saguaro connection
 * @returns {Saguaro.Timer.Span}
 * @private
 */
Saguaro.Timer.micros2Span = Saguaro.Timer.micros2Time;


/**
 * @param context
 * @returns {Saguaro.TimerQueue}
 * @private
 */
Saguaro.Timer.getTimerQueue = function(/** Object */context) {
    var conn = context;
    var mote = context;
    var isConn = (conn instanceof Saguaro.Connection);
    var isMote = (mote instanceof Sonoran.Mote);
    assert(isConn||(isMote&&mote.getClass()==='saguaro'));
    var queue = (isConn ? conn : Saguaro.mote2impl(mote).getConnection()).getTimerQueue();
    return queue;
};




Timer.Queue.extend(
   "Saguaro.Timer.Queue",
   /**
    * Timer queue implementation for saguaro.
    * @lends Saguaro.Timer.Queue
    * @private
    */
   {
      /**
       * @type Saguaro.Connection
       * @private
       */
      conn: null,
       /**
        * Last deadline sent to connection (in nanos).
        * @type Number
        * @private
        */
       deadlineNanos: null,
       /**
	* Timers which have been expired but havent been invoked yet.
	* @type Timer.Timer[]
	* @private
	*/
       expiredTimers: [],

      /**
       * Saguaro.Timer.Queue manages the timers for a saguaro connection.
       * @constructs
       * @augments Timer.Queue
       * @param conn         Saguaro connection
       * @private
       */
      __constr__: function(/** Saguaro.Connection */conn) {
          Timer.Queue.call(this);
          this.conn = conn;
          this.deadlineNanos = null;
      },



      /**
       * Update this.deadlineNanos based on timer queue.
       * @returns {Number} nanos to use for continue or set-halt-at saguaro call
       * @private
       */
      updateDeadline: function() {
          assert(arguments.length==0);
          var deadlineNanos;
          if (this.head) {
              this.deadlineNanos = deadlineNanos = this.head.deadline.toNanos();
              assert(deadlineNanos>0);
          }  else {
	      deadlineNanos = -1;
	      this.deadlineNanos = 0;
	  }
	  return deadlineNanos;
      },



       /**
        * @private
        */
       start: function(/** Timer.Timer */timer) {
           var conn = this.conn;
           assert(!this.contains(timer));
           assert(arguments.length==1);
           assert(timer.span||timer.deadline);

           if (!timer.deadline) {
               var spanMillis = timer.span.toMillis();
               if (spanMillis <= 0) {
                   throw new "Invalid timeout span specification: " + spanMillis;
               }
	       var prevDeadlineNanos = this.deadlineNanos;
	       assert(this.deadlineNanos>=0);
	       var until = this.deadlineNanos;
               var _this = this;
               var command = this.conn.getControllerCmd("set-halt-at", { until: until, timeout: spanMillis });
               command.issue4(null, function(result) {
                   if (result.code === 0) {
                       _this.attach([ timer ], result.getData().getResponse(), (prevDeadlineNanos!=_this.deadlineNanos));
                   } else {
                       QUACK(0,"Saguaro.Timer.start: 'set-halt-at' operation failed: " + result);
                   }
               });
               return timer;
           }

           assert(timer.deadline);
           if (timer.span) {
               timer.deadline = timer.deadline.add(timer.span);
           }
           this.add(timer);
           assert(this.contains(timer));

	   this.conn.setHaltAtCmd(this.updateDeadline(), function(result) {
	         if (result.code !== 0) {
		     var msg = "Saguaro.Timer: 'set-halt-at' failed: " + result;
		     QUACK(0, msg);
		     Logger.err(msg);
		 }
	    });

           return timer;
       },






       /**
        * Program timer and send lip data to mote.
        * @param dst
        * @param dstport
        * @param srcport
        * @param data
        * @param timers
        * @private
        */
       send: function(/** Sonoran.Saguaro.Mote */dst, /** Number */dstport, /** Number */srcport, /** String */data, /** Timer.Timer[] */timers) {
           assert(timers instanceof Array);
           assert(timers.length>0);
	   var spanMillis = null;
           for (var i = 0; i < timers.length; i++) {
               var t = timers[i];
               if (t.isQueued()) {
                   throw sprintf("LIP.Mote.send: timer has already been started: %s", t);
               } else if (t.hasExpired()) {
                   throw sprintf("LIP.Mote.send: timer has already been expired: %s", t);
               }
	       var ms = t.getSpan().toMillis();
	       if (spanMillis === null) {
		   spanMillis = ms;
	       } else if (ms < spanMillis) {
		   spanMillis = ms;
	       }
           }

	   var prevDeadlineNanos = this.deadlineNanos;
	   assert(this.deadlineNanos>=0);
           var until = this.deadlineNanos; 
           var extras = { timeout: spanMillis, until: until };

           var _this = this;
           var command = this.conn.getMediaSendCmd(dst, dstport, srcport, data, extras);
           command.issue4(null,  function(result) {
               if (result.code != 0) {
                   var msg = "Saguaro.Timer: invoking 'send-lip' failed: " + result;
                   QUACK(0, msg);
                   Logger.err(msg);
                   return;
	       }
               _this.attach(timers, result.getData().getResponse(), (prevDeadlineNanos!=_this.deadlineNanos));
	   });
       },





       /**
        * Attach  a timer after a send-lip or set-halt-at. The attached timer is immediately queried for expiration.
	* @param timer
	* @param response
	* @param deadlineChanged Between the send call and its response, the deadline and timer queue was changed
        * @private
        */
       attach: function(/** Timer.Timer[] */timer, /** Saguaro.Response */response, /** Boolean */deadlineChanged) {
	   assert(deadlineChanged!==undefined);
           if (timer instanceof Timer.Timer) {
               timer = [ timer ];
           }
           var timers = timer;
           assert(timers.length>0);

           //var nowNanos = command.time;
	   assert(response);
	   assert(response.time);
	   var nowNanos = response.time;

           for (var i = 0; i < timers.length; i++) {
               timer = timers[i];
               assert(!timer.deadline, "Invalid absolute deadline set in Timer object: " + timer);

               var span = timer.getSpan();
               var spanNanos = span.toNanos();

	       if (!timer.queue) {
	           //QUACK(0, "Timer.attach: has been removed from queue before send-lip returned: " + timer);
                   continue;
	       }

               assert(!this.contains(timer));
               timer.deadline = Saguaro.Timer.nanos2Time(nowNanos + spanNanos, this.conn);
               this.add(timer);

	       //var s = "Timer.attach: after send-lip: now " + Util.nanos2str(nowNanos) + ", timer " + timer;
	       //QUACK(0, s);
           }

	   if (this.head === null) {
	       // if timer was not attached as it has been removed in between
	       this.deadlineNanos = 0;
	       return;
	   }

	   this.deadlineNanos = this.head.deadline.toNanos();
	   var lastTimestampNanos = this.conn.lastTimestamp;
	   //QUACK(0, "Timer.attach: lastTimestamp " + Util.nanos2str(lastTimestampNanos));
	   //QUACK(0, "Timer.attach: deadline " + ((deadlineChanged) ? "changed" : "unchanged"));

	   if (this.updateExpiredTimers(lastTimestampNanos) || (deadlineChanged)) {
	       this.conn.setHaltAtCmd(this.updateDeadline(), function(result) {
		    if (result.code !== 0) {
			var msg = "Saguaro.Timer: 'set-halt-at' failed: " + result;
			QUACK(0, msg);
			Logger.err(msg);
		    }
	       });
	   }
	   this.invokeExpiredTimers();
       },


       /**
        * @private
        */
       cancel: function(/** Timer.Entry */entry) {
           var b = this.remove(entry);
           // we let saguaro stop even if that entry would be the next deadline,
           // but its just too difficult to sync up with saguaro
           return entry;
       },


       /**
        * Called by Saguaro.Connection. A timeout occured.
	* @param blob   Halt event, saguaro blob as received on connection
        * @private
        */
      onHalt: function(blob) {
          assert(blob.msgtype==Saguaro.HALT_EVENT);
          //assert(conn===this.conn);
	  var nowNanos = blob.time;
          var haveExpired = this.updateExpiredTimers(nowNanos);
	  //QUACK(0, "HALT-EV: timer, continue..");
	  this.invokeExpiredTimers();
	  
	  this.conn.dispatcher.continueCmd1(undefined, this.updateDeadline(), undefined);
      },


       /**
        * Called by connection when it disappears.
       * @private
       */
      onDisconnect: function(ev) {
          this.close(new AOP.ERR(ERR_RESOURCE_GONE, "Saguaro connection disappeared."));
      },


      /**
       * @private
       */
      close: function(err) {
	  //this.checkTimedout(Number.MAX_VALUE, err);
	  this.updateExpiredTimers(Number.MAX_VALUE, err);
	  this.invokeExpiredTimers();
       },




       /**
        * Request delivery of timeouts for a specified timestamp. Returns true if
        * one of the timer expired.
	* @returns {Boolean}
        * @private
        */
       updateExpiredTimers: function(/** Number */nowNanos,  /** AOP.ERR */err) {
	   assert(typeof(nowNanos)==='number'); 
           var entry = this.head;
	   var ret = false;

           while(entry != null) {
               var deadlineNanos = entry.deadline.toNanos();
               if (deadlineNanos > nowNanos) {
                   break;
               } 

	       ret = true;

               this.head = entry.next;
               // mark entry as unqueued before delivering timeout
	       entry.queue = null;
	       entry.next = null;
	       //QUACK(0, "Saguaro.checkTimed: " + entry);
	       this.expiredTimers.push(entry);
	       //if (!err) {
		 //  err = new AOP.ERR(ERR_TIMEOUT, "Timeout: " + entry); 
	       //}
	       //Sonoran.Registry.signalEvent(new Event.Timeout(entry, err));

               entry = this.head;
           }
	   return ret;
       },


       /**
	* Call expired timers.
	* @private
	*/
       invokeExpiredTimers: function() {
	   var entries = this.expiredTimers;
	   this.expiredTimers = [];
	    while(entries.length > 0) {
		var entry = entries.shift();
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
       }


       
       // /**
       // 	* Timeout event was delivered, invoke timer callback if that one still exists.
       // 	* @param timer
       // 	* @param err
       // 	* @private
       // 	*/
       // onEvent: function(/** Timer.Timer */timer, /** AOP.ERR */err) {
       // 	   var t = this.expiredTimers.shift();
       // 	   assert(t === timer);
       // 	   assert(err);
       // 	   var callback = timer.getCallback();
       // 	   if (!callback) {
       // 	       // cancelled after the timer expired but before the event was forwarded by the event handler thread
       // 	       // QUACK(0, "Saguaro timer on event: ignore " + timer);
       // 	   } else {
       // 	       timer.setCallback(null);
       // 	       //QUACK(0, "Saguaro timer on event: call " + timer);
       // 	       callback(err, timer); 
       // 	   }

       // 	   //if (this.expiredTimers.length===0) {
       // 	       //this.program(true);
       // 	   //}
       // }
   }
);





