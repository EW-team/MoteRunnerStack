
//---------------------------------------------------------------------------------------------------------------
//
// Timeout Option Pack
//
//---------------------------------------------------------------------------------------------------------------

/**
 * GetOpt.TimeoutOpt class. Frequently used option with time span parameter.
 * @class
 * @augments GetOpt.Option
 * @constructor
 * @param defaultSpan
 * @param shortOpt use GetOpt.TimeoutOpt.NONE if there is no short option. Null specifies default short option (-t).
 * @param longOpt use GetOpt.TimeoutOpt.NONE if there is no long option. Null specifies default short option (--timeout).
 * @param mnemo
 * @param description
 */
GetOpt.TimeoutOpt = function(/** String */defaultSpan, /** Char */shortOpt, /** String */longOpt, /** String */mnemo, /**String */description) {
    this.timeoutSpan = new GetOpt.TimespanSpec(defaultSpan, null, mnemo);
    GetOpt.Option.call(this,
		       shortOpt==GetOpt.TimeoutOpt.NONE ? null : (shortOpt || 't'),
		       longOpt==GetOpt.TimeoutOpt.NONE ? null : (longOpt || '--timeout'),
		       0,
		       null,
		       description || ('Timeout period (defaults to '+defaultSpan+' if omitted).'),
		       this.timeoutSpan);
};


/**
 * @constant
 * @type String
 */
GetOpt.TimeoutOpt.NONE = {};


/** @private */
GetOpt.TimeoutOpt.prototype = extend(
    GetOpt.Option.prototype,
   /** @lends GetOpt.TimeoutOpt.prototype */
    {
       /**
        * @returns {TimespanSpec} return embedded option param specifier.
        */
	getTimespanSpec: function () { return this.timeoutSpan; },
       /**
        * @returns {Number} Return specified or default timeout span in millis.
        */
	getSpan: function () { return this.timeoutSpan.getSpan(); }
    }
);
