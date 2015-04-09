// //  (C) COPYRIGHT INTERNATIONAL BUSINESS MACHINES CORPORATION 2006-2010
// //                       ALL RIGHTS RESERVED
// //        IBM Research Division, Zurich Research Laboratory
// // --------------------------------------------------------------------



// Class.define(
//    "Event.Queue",
//    /**
//     * @lends Event.Queue.prototype
//     */
//    {
//       /**
//        * Event.Queue allows to buffer and receive events distributed by Event.Registry in a blocking fashion.
//        * Create the queue and call recv to block for a certain amount of time or until an event is received.
//        * @constructs
//        * @param msgtypes              Array of event 'msgtype' properties
//        * @param size                  Optional, size of internal event queue
//        * @param drop                  Optional, number of events to drop when internal event queue is full
//        */
//       __constr__: function(/** String[] */msgtypes, /** Number */size, /** Number */drop) {
//          this.queue = new Thread.Queue("Event.Queue", size ? size : 512, true, drop ? drop : 32);
//           this.listener = Event.Registry.addFilterForMsgTypes(this.onEvent.bind(this), msgtypes);
//       },

//       /**
//        * Registry event listener
//        * @type Function
//        * @private
//        */
//       listener: null,

//       /**
//        * Thread queue
//        * @type Thread.Queue
//        * @private
//        */
//       queue: null,

//       /**
//        * An event is ready to pickup without blocking?
//        * @returns {Boolean} flag
//        */
//       canRecv: function() {
//          return !this.queue.isEmpty();
//       },

//       /**
//        * Has been closed?
//        * @returns {Boolean}
//        */
//       isClosed: function() {
//          return this.queue.isClosed();
//       },

//       /**
//        * Receive an event.
//        * @param timeout Timeout in milliseconds, optional
//        * @returns {Event}
//        * @throws {IO.Exception} exception, possibly with ERR_RESOURCE_GONE when queue was closed
//        * @throws {Timer.Exception} on timeout
//        */
//       recv: function(/** Number */timeout) {
//           return this.queue.get(timeout);
//       },

//       /**
//        * Close queue. Any waiter is woken up and returns with exception.
//        */
//       close: function() {
//          this.queue.close();
//           Event.Registry.removeFilter(this.listener);
//           this.listener = null;
//       },
      
//       /**
//        * Add to queue.
//        * @private
//        */
//       onEvent: function(/** Event */ev) {
//          this.queue.put(ev);
//       },

//       /**
//        * @returns {String} a string
//        */
//       toString: function() {
//          return "Event.Qeueue";
//       }
//    }
// );



