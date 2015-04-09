//  (C) COPYRIGHT INTERNATIONAL BUSINESS MACHINES CORPORATION 2006-2010
//                       ALL RIGHTS RESERVED
//        IBM Research Division, Zurich Research Laboratory
// --------------------------------------------------------------------



//
// Not included on server side
// 



/**
 * @private
 * @nodoc
 */
Saguaro.Connection = {};

/**
 * @private
 * @nodoc
 */
Saguaro.Connection._unmarshal = function(obj) {
   var host = obj.host;
   assert(host);
   var port = obj.port;
   assert(port);
   return "sag://" + host + "/" + port;
};



/**
 * @namespace Timer namespace allows to program timers based on the system clock in the same way as on the server
 */
Timer = {};

/**
 * Wraps timer start and cancel to window.setTimeout and clearTimeout.
 * @class 
 * @param millis
 * @param unused
 * @param callback
 */
Timer.Timer = function(millis, unused, callback) {
    this.millis = millis;
    this.callback = callback;
    this.id = -1;
};

/** */
Timer.Timer.prototype = {
    /**
     * Start timer.
     * @returns {Timer.Timer} this
     */
    start: function() {
	this.id = window.setTimeout(this.callback, this.millis);
	return this;
    },

    /**
     * Cancel timer.
     * @returns {Timer.Timer} this
     */
    cancel: function() {
	window.clearTimeout(this.id);
	return this;
    }
};

/**
 * Start timer and return it.
 * @param millis
 * @param unused
 * @param callback
 * @returns {Timer.Timer}
 */
Timer.timeoutIn = function(millis, unused, callback) {
    return (new Timer.Timer(millis, unused, callback)).start();
};





