//  (C) COPYRIGHT INTERNATIONAL BUSINESS MACHINES CORPORATION 2006-2010
//                       ALL RIGHTS RESERVED
//        IBM Research Division, Zurich Research Laboratory
// --------------------------------------------------------------------


assert(Thread);
assert(Thread.current);





/**
 * Block calling thread for some time based on the system clock.
 * @param timeout   Milliseconds
 */
Thread.sleep = function(/** Number */timeout) {
   var caller = Thread.current();
    if (caller === Event.Registry.eventHandler.tid) {
	throw "Event handlers may not block!\n" + Runtime.getStackTrace().toString();
    }
   var timer = null;
   Thread.start(function() {
      timer = Timer.timeoutIn(timeout, function() {
         try {
            Thread.makeRunnable(caller);   
         } catch (x) {
            SYSTEM_EXC_HANDLER(x, "Thread.makeRunnable on invalid thread id: " + caller);
         }
      });
   });
   Thread.suspend();
   return;
};



/**
 * Non-recursive mutex implementation.
 * @class
 */
Thread.Mutex = function() {
   /**
    * @private
    */
   this.owner = -1;
   /**
    * @private
    */
   this.queue = [];
};


/** Prototype */
Thread.Mutex.prototype = {
   /**
    * @returns {Number} id of owning thread or -1
    */
   getOwner: function() {
      return this.owner;
   },

   /**
    * @returns {Boolean} whether this mutex is locked
    */
   isLocked: function() {
      return this.owner >= 0;
   },

   /**
    * Lock mutex.
    */
   lock: function() {
      var tid = Thread.current();
      assert(tid >= 0);
      assert(this.owner != tid, "Thread.Mutex: invalid state, already owner");
      while(true) {
         if (this.owner < 0) {
            this.owner = tid;
            break;
         }
         assert(this.queue.indexOf(tid) == -1);
         this.queue.push(tid);
         Thread.suspend();
      }
   },

   /**
    * Unlock mutex.
    */
   unlock: function() {
      var tid = Thread.current();
      assert(tid >= 0);
      assert(tid == this.owner, "Thread.Mutex: invalid state, not owner: " + tid + ", " + this.owner);
      this.owner = -1;
      var arr = this.queue;
      this.queue = [];
      for (var i = 0; i < arr.length; i++) {
         tid = arr[i];
         try {
            Thread.makeRunnable(tid);
         } catch (x) {
            SYSTEM_EXC_HANDLER(x, "Thread.makeRunnable on invalid thread id: " + tid);
         }
      }
   }
};







/**
 * A condition variable implementation.
 * @class
 */
Thread.Condition = function() {
   /**
    * @private
    */
   this.queue = [];
};


/** Prototype */
Thread.Condition.prototype = {
   /**
    * Wait on mutex until condition is true (i.e. parameter function returns true).
    * @param mutex    Mutex
    * @param timeout  If > 0, timeout in millis
    * @param func     The condition returning true when thread is allowed to return with mutex hold
    * @returns {AOP.ERR} error in case of timeout or null on success
    */
   wait: function(/** Thread.Mutex */mutex, /** Number */timeout, /** Function */func) {
      var tid = Thread.current();
      assert(tid >= 0);
      var timerObj = null;
      var timerErr = null;
      var _this = this;
      var ontimeoutf = function(err) {
         timerObj = null;
         timerErr = err;
         var idx = _this.queue.indexOf(tid);
         if (idx == -1) {
            // already woken up, ignore
            return;
         } else {
            _this.queue.splice(idx, 1);
            assert(_this.queue.indexOf(tid) == -1);
            Thread.makeRunnable(tid);
         } 
      };
      while(true) {
         assert(mutex.getOwner() == tid, "Thread.Condition: not owner of mutex");
         if (func()) {
            assert(mutex.getOwner() == tid, "Thread.Condition: not owner of mutex");
            return null;
         }
         assert(this.queue.indexOf(tid) == -1);
         this.queue.push(tid);
         if (timeout) {
            if (typeof(timeout) === 'number') {
               timerObj = Timer.timeoutIn(timeout, ontimeoutf);
            } else {
                assert(timeout instanceof Timer.Timer);
               timerObj = timeout;
               timerObj.setCallback(ontimeoutf);
               timerObj.start();
            }
         }
         mutex.unlock();
         Thread.suspend();
         mutex.lock();
         if (timerObj) {
            //timerObj.stop();
             timerObj.cancel();
            timerObj = null;
         }
         if (timerErr) {
            return timerErr;
         }
      }
   },

   /**
    * Wakeup single thread waiting.
    */
   signal: function() {
      if (this.queue.length == 0) {
         return;
      }
      assert(this.queue.indexOf(Thread.current()) == -1);
      if (this.queue.length > 0) {
         var tid = this.queue.splice(0, 1)[0];
         try {
            Thread.makeRunnable(tid);
         } catch (x) {
            SYSTEM_EXC_HANDLER(x, "Thread.Condition: makeRunnable on invalid thread id: " + tid);
         }
      }
   },

   /**
    * Wakeup all waiting threads.
    */
   broadcast: function() {
      if (this.queue.length == 0) {
         return;
      }
      assert(this.queue.indexOf(Thread.current()) == -1);
      var arr = this.queue;
      this.queue = [];
      for (var i = 0; i < arr.length; i++) {
         var tid = arr[i];
         try {
            Thread.makeRunnable(tid);
         } catch (x) {
            SYSTEM_EXC_HANDLER(x, "Thread.makeRunnable on invalid thread id: " + tid);
         }
      }
   }
};







/**
 * Producer/consumer queue.
 * @class
 * @constructor
 * @param name                Name of queue
 * @param size                Maximum sizeof queue; if unspecified, 128
 * @param dropOnOverflow      Whether to drop objects or to block when the queue is full on a put operation
 * @param releaseOnOverflow   Number of objects to drop from queue when queue is full
 */
Thread.Queue = function(/** String */name, /** Number */size, /** Boolean */dropOnOverflow, /** Number */releaseOnOverflow) {
   /**
    * @private
    */
   this.mutex = new Thread.Mutex();
   /**
    * @private
    */
   this.getCond = new Thread.Condition();
   /**
    * @private
    */
   this.putCond = new Thread.Condition();
   /**
    * @private
    */
   this.name = name;
   /**
    * @private
    */
   this.size = size?size:128;
   /**
    * @private
    */
   this.queue = new Util.RingBuffer(this.size, 1);
   /**
    * @private
    */
   this.closedEx = null;
   /**
    * Drop on overflow.
    * @private
    */
   this.dropOnOverflow = dropOnOverflow ? dropOnOverflow : false;
   /**
    * Number of elements to release on overflow.
    * @private 
    */
   this.releaseOnOverflow = releaseOnOverflow ? releaseOnOverflow : 1;

   assert(!this.dropOnOverflow || (this.releaseOnOverflow <= this.size));
};

/** @private */
Thread.Queue.prototype = {
   /**
    * Ready to pickup some data?
    * @returns {Boolean} whether caller can pickup something without blocking
    */
   isEmpty: function() {
      return this.queue.getUsed() == 0;
   },

   /**
    * Has been closed?
    * @returns {Boolean}
    */
   isClosed: function() {
      return this.closedEx != null;
   },
   
   /**
    * Put an item into the queue.
    * @param result
    * @throws {Exception} with ERR_RESOURCE_GONE when queue was closed
    */
   put: function(/** Object */result) {
      assert(result!=undefined&&result!=null, "Missing 'result' parameter");
      assert(this.queue.getUsed() <= this.size);

      if (this.closedFlag) {
         throw this.closedEx;
      }
      
      this.mutex.lock();
      
      if (this.queue.getFree() == 0) {
         if (this.dropOnOverflow) {
            this.queue.releaseMany(this.releaseOnOverflow);
         } else {
            var _this = this;
            this.putCond.wait(this.mutex, 0, function() {
               return (_this.queue.getFree() > 0) || this.closedEx;
            });
         }
      }
      var res = null;
      if (this.closedEx) {
         this.mutex.unlock();
         throw this.closedEx;
      }
      
      assert(this.queue.getUsed() < this.size);
      this.queue.add(result);
      this.getCond.signal();
      this.mutex.unlock();
   },

   /**
    * Retrieve an item or block until item is available or a timeout occured.
    * @param timeout   Optional
    * @returns {Object} object
    * @throws {Exception} exception, possibly with code ERR_RESOURCE_GONE when queue was closed
    * @throws {Timer.Exception} on timeout
    */
   get: function(/** Number */timeout) {
      var _this = this;
      var res;
      
      // Uninterruptible actions
      if (this.queue.getUsed() > 0) {
         return this.queue.shift();
      }
      if (this.closedEx) {
         throw this.closedEx;
      }

      this.mutex.lock();

      if (this.queue.getUsed() > 0) {
         res = this.queue.shift();
         this.putCond.signal();
         this.mutex.unlock();
         return res;
      } 

      res = this.getCond.wait(this.mutex, timeout, function() {
         return (_this.queue.getUsed() > 0) || _this.closedEx;
      });
      if (res != null) {
          var ex = AOP.mapERR2Ex(res);
         this.mutex.unlock();
         throw ex;
      }

      if (this.queue.getUsed() > 0) {
         res = this.queue.shift();
         this.putCond.signal();
         this.mutex.unlock();
         return res;
      }

      assert(this.closedEx);
      this.mutex.unlock();
      throw this.closedEx;
   },

   /**
    * Close this queue.
    * @param err  Error object propagated in exception to any callers
    */
   close: function(/** AOP.ERR */err) {
      this.mutex.lock();
      var message = this.name + " closed";
      this.closedEx = AOP.mapERR2Ex(new AOP.ERR(ERR_RESOURCE_GONE, message, err));
      this.getCond.broadcast();
      this.putCond.broadcast();
      this.mutex.unlock();
   },

   /**
    * @returns {String} string
    */
   toString: function() {
      return this.name;
   }
};






/**
 * SCB is a special function symbol which can be used to execute non-blocking functions in Sonoran in
 * a blocking fashion.
 * SCB can be passed to a function expecting a parameter of type DFLT_ASYNC_CB. In this case, 
 * a thread is spawned which carries out the operation for the caller thread. The caller thread
 * is blocked until the operation has been finished. The caller thread receives the same object as it
 * is received by the callback in a non-blocking fashion. Example:
 * <pre>
 * var result = Saguaro.startProcess(null, SCB);     
 * if (result.code != 0) {                             
 *    ... // handle error
 * </pre>
 * is the blocking version of:
 * <pre>
 * Saguaro.startProcess(null, function(result) {     
 *     if (result.code != 0) {                             
 *         ... // handle error
 * </pre>
 * A call to  'result.getData()' returns the 'data' property of the AOP.OK instance. The type of that instance
 * is the type as documented for the return type of that function.
 * <pre>
 * var result = Saguaro.startProcess(null, SCB);     
 * assert(result.code === 0);
 * assert(result.getData() instanceof Saguaro.Connection);
 * </pre>
 * @param result
 * @see BLCK
 * @see DFLT_ASYNC_CB
 */
var SCB = function(/** AOP.Result */result) {
   assert(0, "Invalid specification of SCB callback in a function invocation: Operation does probably not support synchronous invocation yet!");
};



/**
 * BLCK is a special function symbol which can be used to execute many non-blocking methods in Sonoran in
 * a blocking fashion.
 * BLCK can be passed to most methods expecting a function of type DFLT_ASYNC_CB.
 * In this case, a thread is spawned which carries out the operation for the caller thread, and the caller thread
 * is blocked until the operation has been finished. If the operation was successful, the caller receives
 * an object of the type as documented for the operation (the 'data' property of the AOP.OK instance). 
 * In case of failure, the function throws an AOP.Exception.
 * <pre>
 * try {
 *     var conn = Saguaro.startProcess(null, BLCK);     
 * } catch(ex) {
 *    ... // handle error
 * }
 * </pre>
 * @param result
 * @see SCB
 * @see DFLT_ASYNC_CB
 */

var BLCK = function(/** AOP.Result */result) {
   assert(0, "Invalid specification of BLCK callback in a function invocation: Operation does probably not support synchronous invocation yet!");
};



/**
 * @private
 */
BC = {
    /**
     * @returns {Boolean} whether this is a blocking call
     * @private
     */
    is: function(/** DFLT_ASYNC_CB */callback) {
	assert(typeof(callback)==='function', "Function expects SCB, BLCK or callback parameter");
	return callback===SCB||callback===BLCK;
    },

    /**
     * Execute a blocking call. Replace SCB or BLCK in params, call function in new thread and
     * return result to calling thread.
     * @private
     */
    exec: function(/** Function */operation, /** Object */obj, /** Array */params) {
	var callback = params[params.length-1];
	assert(callback===SCB||callback===BLCK);

	var tid = Thread.current();
	var result = undefined;
	var delivered = false;
	    
	//if (tid === Event.Registry.eventHandler.tid) {
	  //  QUACK(0, "Event handlers may not block!\n" + Runtime.getStackTrace().toString());
	    //throw "Event handlers may not block!\n" + Runtime.getStackTrace().toString();
	//}

	var args = arraycopy(params);
	args[args.length-1] = function(r) {
	    assert(r instanceof AOP.Result, "Wrong argument type for callback, must be AOP.Result");
	    assert(delivered===false, "Callback invoked twice!");
	    result = r;
	    delivered = true;
	    try {
		Thread.makeRunnable(tid);
	    } catch (x) {
		SYSTEM_EXC_HANDLER(x, "Block.call: Thread.makeRunnable on invalid thread id: " + tid);
	    }
	};
	
	Thread.start(function() {
	    try {
		operation.apply(obj, args);
	    } catch(ex) {
		args[args.length-1](AOP.Ex2ERR(ERR_GENERIC, ex));
	    }
	});

	while(result===undefined) {
	    Thread.suspend();
	}

	if (callback === SCB) {
	    return result;
	}

	if (result.code===0) {
	    return result.data;    // may be undefined or the 'data' property of the AOP.OK instance
	} else {
	    var ex = AOP.mapERR2Ex(result);
	    assert(ex instanceof Exception);
	    throw ex;
	}
    }
};






/**
 * A buffer whose entries are consumed by an internal thread and a specified consumer function.
 * @class
 * @param name      Name of queue
 * @param size      Size of internal ring buffer, entries are dropped if incoming rate is too high 
 * @param callback  Consumer function receiving one entry at a time
 * @private
 */
Thread.Consumer = function(/** String */name, /** Number */size, /** Function */callback) {
    this.name = name;
    if (!size) {
        size = 1024;
    }
    //this.queue = new Util.RingBuffer(size, 1);
    this.queue = new Util.SLList();
    this.tid = Thread.start(this.run.bind(this));
    this.wakeup = false;
    this.callback = callback;
    this.terminated = false;
};

/** @private */
Thread.Consumer.prototype = {
    /**
     * @returns {Number}
     * @private
     */
    getTid: function() {
	return this.tid;
    },

    // /**
    //  * @returns {Util.RingBuffer}
    //  * @private
    //  */
    // getBuffer: function() {
    // 	return this.buffer;
    // },

    /**
     * Add object.
     * @param obj
     * @private
     */
    addObject: function(/** Object */obj) {
        this.queue.add(obj);
        if (this.wakeup) {
            Thread.makeRunnable(this.tid);
        }
    },

    /**
     * Add array of object.
     * @param obj
     * @private
     */
    addArray: function(/** Object[] */arr) {
        assert(arr instanceof Array);
        for (var i = 0; i < arr.length; i++) {
            this.queue.add(arr[i]);
        }
        if (this.wakeup) {
            Thread.makeRunnable(this.tid);
        }
    },

    /**
     * Close buffer and terminate consumer thread.
     * @private
     */
    close: function() {
        this.terminated = true;
        if (this.wakeup) {
            Thread.makeRunnable(this.tid);
        }
    },
    
    /**
     * Thread routine.
     * @private
     */
    run: function() {
        while(true) {
            while(this.queue.getUsed() > 0) {
                var obj = this.queue.shift();
                try {
                    this.callback(obj);  
                } catch (x) {
                    QUACK(0, "Upcall for object in Thread.Consumer failed: " + x);
                    QUACK(0, Runtime.dumpException(x));
                }
            }
            if (this.terminated) {
                return;
            }
            this.wakeup = true;
            Thread.suspend();
            this.wakeup = false;
        }
    }
};





