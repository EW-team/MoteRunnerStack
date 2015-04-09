//  (C) COPYRIGHT INTERNATIONAL BUSINESS MACHINES CORPORATION 2006-2010
//                       ALL RIGHTS RESERVED
//        IBM Research Division, Zurich Research Laboratory
// --------------------------------------------------------------------



Class.define(
    "Timer.Universe",
    /**
     * @lends Timer.Universe
     */
    {
        /**
         * Abstract class for timer universes. A timer universe creates span and time objects
         * based on contexts provided by the user.
         * @constructs
         * @private
         */
        __constr__: function() {},

        /**
         * @returns {Timer.Time}
	 * @private
         */
        getTime: function(context) {},

        /**
         * @returns {Timer.Span}
	 * @private
         */
        getSpan: function(/** Number */span, /** Object */context) {}
    }
);



/**
 * @type Timer.Universes[]
 * @private
 */
Timer.universes = [];
