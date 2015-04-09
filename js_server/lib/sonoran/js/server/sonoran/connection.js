//  (C) COPYRIGHT INTERNATIONAL BUSINESS MACHINES CORPORATION 2006-2010
//                       ALL RIGHTS RESERVED
//        IBM Research Division, Zurich Research Laboratory
// --------------------------------------------------------------------



Class.define(
    "Sonoran.Connection",
    /**
     * @lends  Sonoran.Connection.prototype
     */
    {
	/**
	 * @constructs
	 */
	__constr__: function() {},


	/**
	 * Mote has been deregistered.
	 */
	onDeregister: function(/** Sonoran.Mote */mote) { assert(false); },

	/**
	 * Reset mote.	
	 * @param mote
	 * @param timeout
	 * @param mode
	 */
	reset: function(/** Sonoran.Mote */mote, /** Number */timeout, /** String */mode, /** DFLT_ASYNC_CB */callback) {
	    assert(false);
	},

	/**
	 * Send a packet to this mote. 
	 * @param dstport   Destination port
	 * @param srcport   Source port
	 * @param payload   Binary string
	 * @param timer     Optional
	 * @throws {Exception} 
	 * @private
	 */
	send: function(/** Sonoran.Mote */mote, /** Number */dstport, /** Number */srcport, /** String */payload, /** Timer.Timer */timer) {
	    assert(false);
	},

	/**
	 * Initiates update of position and signals operation end by invoking the specified callback.
	 * @param position   Object with properties x, y, z
	 * @param callback   
	 * @throws {AOP.Exception}
	 */
	updatePosition: function(/** Sonoran.Mote */mote, /** Object */position, /** DFLT_ASYNC_CB */callback) {
	    if (BC.is(callback)) { return BC.exec(arguments.callee, this, arguments); }
            mote.setPosition(position);
            callback(new AOP.OK());
	},

	/**
         * Sleep micros on this mote
         * @param micros
	 * @throws {AOP.Exception}
         */
	sleepOn: function(/** Sonoran.Mote */mote, /** Number */micros, /** DFLT_ASYNC_CB */callback) {
	    if (BC.is(callback)) { return BC.exec(arguments.callee, this, arguments); }
            var timer = new Timer.Timer(Timer.System.getSpan(micros/1000));
            return timer.start(callback);
	}

    }
);
    
