//  (C) COPYRIGHT INTERNATIONAL BUSINESS MACHINES CORPORATION 2006-2010
//                       ALL RIGHTS RESERVED
//        IBM Research Division, Zurich Research Laboratory
// --------------------------------------------------------------------


Class.define(
    "Timer.Value",
    /**
     * @lends Timer.Value
     */
    {
        /**
         * Encapsulates a point in time or a time span valid for a certain context.
         * Use Timer.getTime or Timer.getSpan to create a span or time instance.
         * Use toMillis, toMicros etc. to retrieve the value as absolute Number.
         * @constructs
         * @param value     The constructor accepts milliseconds by default
         * @param queue     Object
         * @see Timer.getTime
         * @see Timer.getSpan
         */
        __constr__: function(/** Number */value, /** Object */queue) {
            this.value = value;
            this.queue = queue;
        },

        /**
	 * @type Number
         * @private
         */
        value: null,
        
        /**
	 * @type Object
         * @private
         */
        queue: null,
        

        /**
         * @returns {Object}
         * @private
         */
        getQueue: function() {
            return this.queue;
        },

        /**
         * @returns {String}
         */
        toString: function() {
            return Util.micros2str(this.value*1000);
        },
        
        /**
         * @returns {Number}
         */
        toMillis: function() {
            return this.value;
        },

        /**
         * @returns {Number}
         */
        toMicros: function() {
            return this.value * 1000;
        },

        /**
         * @returns {Number}
         */
        toNanos: function() {
            return this.value * 1000 * 1000;
        },

        /**
         * Adds specified value to this value and returns this.
         * @param tv
         * @returns {Timer.Value} this
         */
        add: function(/** Timer.Value */tv) {
            var ret = new Timer.Value(this.value, this.queue);
            ret.value += tv.value;
            return ret;
        },
        
        /**
         * Subtracts specified value from this value and returns this.
         * @param tv
         * @returns {Timer.Value} this
         */
        sub: function(/** Timer.Value */tv) {
            var ret = new Timer.Value(this.value, this.queue);
            ret.value -= tv.value;
            return ret;
        },

        /**
         * @param tv
         * @returns {Boolean}
         */
        eq: function(/** Timer.Value */tv) {
            return this.value == tv.value;
        },
        /**
         * @param tv
         * @returns {Boolean}
         */
        lt: function(/** Timer.Value */tv) {
            return this.value < tv.value;
        },
        /**
         * @param tv
         * @returns {Boolean}
         */
        lte: function(/** Timer.Value */tv) {
            return this.value <= tv.value;
        },
        /**
         * @param tv
         * @returns {Boolean}
         */
        gt: function(/** Timer.Value */tv) {
            return this.value > tv.value;
        },
        /**
         * @param tv
         * @returns {Boolean}
         */
        gte: function(/** Timer.Value */tv) {
            return this.value >= tv.value;
        }
    }
);




/**
 * Wraps a point in time.
 * @class
 * @see Timer.Value
 */
Timer.Time = Timer.Value;

/**
 * Wraps a time span.
 * @class
 * @see Timer.Value
 */
Timer.Span = Timer.Value;
