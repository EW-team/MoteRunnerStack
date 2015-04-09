//  (C) COPYRIGHT INTERNATIONAL BUSINESS MACHINES CORPORATION 2006-2010
//                       ALL RIGHTS RESERVED
//        IBM Research Division, Zurich Research Laboratory
// --------------------------------------------------------------------


/**
 * Channels provides means to exchange objects between multiple HTTP client 
 * sessions and the server. Both clients as well as the server can push objects on 
 * channels then received on the other side. Channels are implemented on top of a HTML5
 * web socket implementation. Clients can subscribe to different channels, the server
 * can deny or access such requests. Format of the data exchanged on a channel
 * depends on the concrete channel implementation.
 * @namespace Channels
 */
Channels = {};


 /**
  * Name of the channel which receives channel announcements.
  * @type String
  * @constant
  * @private
  */
 Channels.ANNOUNCEMENT_CHANNEL_NAME = "Announcements";

 /**
  * Name of the channel which receives channel announcements.
  * @type String
  * @constant
  * @private
  */
 Channels.MANAGER_CHANNEL_NAME = "Oasis";
    


/**
 * Generic response for a call on a channel. Wraps sequence number and operation result.
 * @class
 * @constructor
 * @param tick
 * @param result
 * @param finished
 */
Channels.Response = function(/** Number */tick, /** AOP.Result */result, /** Boolean */finished) {
    this.tick = tick;
    this.result = result;
    this.finished = finished;
    if (this.finished===undefined) {
        this.finished = false;
    }
};

/** @private */
Channels.Response.prototype = { 
       /** @ignore */
       __constr__: "Channels.Response",
       /**
        * @type Number
        * @private
        */
	tick: 0,
	/**
       /**
        * @type AOP.Result
        * @private
        */
	result: null,
       /**
        * @type Boolean
        * @private
        */
	finished: false,
        /**
	 * Returns the tick of the command associated with this response.
         * @returns {Number} the tick
         */
	getTick: function() {
	    return this.tick;
	},
        /**
	 * Returns the result of the shell operation.
         * @returns {AOP.OK|AOP.ERR} the result
         */
	getResult: function() {
	    return this.result;
	},
        /**
	 * Returns whether this is the final routput of the associated command
         * @returns {Boolean} whether this is the final routput of the associated command
         */
	getFinished: function() {
	    return this.finished;
	},
        /**
         * @param finished
         */
	setFinished: function(/** Boolean */finished) {
	    this.finished = finished;
	},
	/**
         * @returns {String} the string.
	 * @private
         */
	toString: function() {
	    return "Channels.Response: tick " + this.tick + ", finished " + this.finished + ", code " + this.result.code;
	}
};





