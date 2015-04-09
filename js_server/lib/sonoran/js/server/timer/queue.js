Class.define(
    "Timer.Queue",
    /**
     * @lends Timer.Queue
     */
    {
        /**
         * Base class for timer queues. Subclasses implement start and cancel methods.
         * @see Timer
         * @see Timer.timeoutIn
         * @see Timer.timeoutAt
         * @constructs
	 * @private
         */
        __constr__: function() {
            this.head = null;
        },

        /**
         * Timer queue.
         * @type Timer.Timer
         * @private
         */
        head: null,


        /**
         * Return head of queue or null
         * @private
         */
        getHead: function() {
            return this.head;
        },

        /**
         * @returns {String} string.
	 * @ignore
         */
        toString: function(/** Boolean */full) {
            var txt = "Timer.Queue";
            if (!full) {
                return txt;
            } else {
                var e = this.head;
                if (!e) {
                    txt += ": empty";
                } else {
                    txt += ":\n";
                    while(e!=null) {
                        txt += e.toString() + "\n";
                        e = e.next;
                    }
                }
            }
            return txt;
        },


        /**
         * Add timer to queue. Timer is not programmed yet.
         * @param t Timer.Timer
         * @returns {Boolean} whether entry t is new head.
	 * @private
         */
        add: function(/** Timer.Timer */t) {
            assert(!this.contains(t), "Timer.Queue.add: timer already queued");
            assert(t.deadline, "Timer.Queue.add: invalid state, timer entry not properly setup");
            if( this.head == null ) {
                this.head = t;    // New head
                return true;
            }
            var p = this.head;
            if (t.deadline.lt(p.deadline)) {
                t.next = p; // New head
                this.head = t;
                return true;
            }
            var n;
            while( (n=p.next) != null ) {
                if (t.deadline.lt(n.deadline)) {
	            break;
                }
                p = n;
            }
            t.next = n;
            p.next = t;
            return false;
        },


        /**
         * Remove timer from queue.
         * @param t   Handle to timer object
         * @returns {Boolean} whether timer was head of queue
	 * @private
         */
        remove: function(/** Timer.Timer */t) {
	    assert(t, "Timer.Queue.remove: Parameter must not be null");
	    assert(t.callback, "Timer.Queue.remove: Parameter must have a defined callback: " + t);
            t.deadline = null;
            t.queue = null;
            var p = this.head;
            if( p == t ) {
                this.head = t.next;
                t.next = null;  // helps GC
                return true;
            }
            var n;
            while( p != null ) {
                if( (n=p.next) == t ) {
	            p.next = t.next;
	            t.next = null;  // helps GC
	            return false;  // was not head
                }
                p = n;
            }
            //QUACK(0, Util.formatData(Runtime.getStackTrace()));
            //QUACK(0, "Timer.Queue.remove: ignore timer not being queued: " + t);
            return false;
        },


        /**
         * Timer contains given entry?
         * @param t   Handle to timer object
         * @returns {Boolean} whether specified entry is on current timer list
	 * @private
         */
        contains: function(/** Timer.Timer */t) {
            assert(t, "Timer.Queue.contains: Parameter must not be null");
            var e = this.head;
            while (e != null) {
                if (e == t) {
                    return true;
                }
                e = e.next;
            }
            return false;
        },


        /**
         * @param timer      Specifies span or deadline
         * @param callback
         * @returns {Timer.Timer}
	 * @private
         */
        start: function(/** Timer.Timer */timer) {
            assert(0);
        },


        /**
         * Remove entry from queue
         * @param entry
	 * @private
         */
        cancel: function(/** Timer.Timer */entry) {
            assert(0);
        },


	/**
	 * Remove all.
	 * @private 
	 */
	removeAll: function() {
	    this.head = null;
	}
    }
);
