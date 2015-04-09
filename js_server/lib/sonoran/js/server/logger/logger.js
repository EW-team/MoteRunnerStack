//  (C) COPYRIGHT INTERNATIONAL BUSINESS MACHINES CORPORATION 2006-2010
//                       ALL RIGHTS RESERVED
//        IBM Research Division, Zurich Research Laboratory
// --------------------------------------------------------------------

Runtime.include("logger/logger.js");
Runtime.include("logger/history.js");


/**
 * Returns a simple logger which dumps all log events using #QUACK (if they are severe
 * enough according to the current logger configuration).
 * @param level  Quack level to use, if undefined, 0
 * @returns {function} A listener function which can be removed from Sonoran by calling Event.Registry#removeListener.
 * @static
 */
Logger.getQuackLogger = function(level) {
    level=level?level:0;
    /** @ignore */
    var func = function(ev) {
	if (ev.category === Event.EV_CAT_LOG) {
	    QUACK(level, ev.toString());
	}
    };
    return Event.Registry.addFilter(func);
};


/**
 * Returns a simple logger which dumps all log events using println (if they are severe
 * enough according to the current logger configuration).
 * @returns {function} A listener function which can be removed from Sonoran by calling Event.Registry#removeListener.
 * @static
 */
Logger.getStdoutLogger = function() {
    /** @ignore */
    var func = function(ev) {
	if (ev.category === Event.EV_CAT_LOG) {
	    println(ev.toString());
	}
    };
    return Event.Registry.addFilter(func);
};



