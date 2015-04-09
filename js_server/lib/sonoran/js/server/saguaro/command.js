//  (C) COPYRIGHT INTERNATIONAL BUSINESS MACHINES CORPORATION 2006-2010
//                       ALL RIGHTS RESERVED
//        IBM Research Division, Zurich Research Laboratory
// --------------------------------------------------------------------

/**
 * Representation of a Saguaro command.
 * The constructor builds the json object to send to the sagaro process and handles the response.
 * @class
 * @constructor
 * @private
 */
Saguaro.Command = function(/** Saguaro.Connection */conn, /** Number */timeout, /** Object */request) {
    this.conn = conn;
    if (conn && !timeout) {
        this.timeout = this.getCommandTimeout();
    } else {
        this.timeout = timeout;
    }
    this.request = request;
};


/** @private */
Saguaro.Command.prototype = {
   /**
    * The object sent to the saguaro process in json encoding.
    * @type Object
    * @private
    */
   request: null,
   /**
    * Callback
    * @type function
    * @private
    */
   callback: null,
   /**
    * Saguaro connection.
    * @type Saguaro.Connection
    * @private
    */
   conn: null,
   /**
    * Timer
    * @type Object
    * @private
    */
   timer: null,
   /**
    * Saguaro time from response. Might be undefined.
    * @type Number
    * @private
    */
   time: null,
   /**
    * Saguaro time from response. Might be undefined.
    * @type Number
    * @private
    */
   until: null,
   /**
    * Saguaro time from response. Might be undefined.
    * @type Number
    * @private
    */
   timeout: null,

   /**
    * @returns {String} string representation.
    * @private
    */
   toString: function() {
      return "Saguaro.Command: " + this.request.cmd;
   },


   /**
    * Close this command on response or timeout.
    * @param result
    * @private
    */
   close: function(/** AOP.Result */result) {
      this.conn.removeCommand(this);
      if (this.timer) {
          Timer.remove(this.timer);
          this.timer = null;
      }
      if (this.evaluator) {
         result = this.evaluator(result);
      }
      this.callback(result);
   },


    /**
     * Issue command to saguaro and return result (Saguaro.CommandOK/AOP.ERR) in the callback.
     * @param callback      
     * @returns {Saguaro.Response}
     * @throws {AOP.Exception}
     * @private
     */
    issue1: function(/** DFLT_ASYNC_CB */callback){
        return this.issue2(undefined, null, callback);
    },

    
    /**
     * Issue command to saguaro and return response or error.
     * @param evaluator     If not null, a function called before the callback is invoked which can inspect/change the result
     * @param callback      
     * @returns {Saguaro.Response}
     * @throws {AOP.Exception}
     * @private
     */
    issue4: function(/** Function */evaluator, /** DFLT_ASYNC_CB */callback){
	return this.issue2(undefined, evaluator, callback);
    },


   /**
     * Issue command to saguaro and return response or error.
     * @param transmitMsgtype
     * @param callback      
     * @returns {Saguaro.Response}
     * @throws {AOP.Exception}
     * @private
     */
    issue3: function(/** Number */transmitMsgtype, /** DFLT_ASYNC_CB */callback){
	return this.issue2(transmitMsgtype, null, callback);
    },


    
  /**
     * Issue command to saguaro and return response or error.
     * @param transmitMsgtype
     * @param evaluator     If not null, a function called before the callback is invoked which can inspect/change the result
     * @param callback      
     * @returns {Saguaro.Response}
     * @throws {AOP.Exception}
     * @private
     */
    issue2: function(/** Number */transmitMsgtype, /** Function */evaluator, /** DFLT_ASYNC_CB */callback){
	if (BC.is(callback)) {  return BC.exec(arguments.callee, this, arguments);  }
        //assert(this.conn);
        //assert(this.request);
        //assert(this.timeout);
        this.evaluator = evaluator;
        this.callback = callback;
        //assert(!this.timer);
        
        this.conn.addCommand(this);
        try {
            this.conn.transmit(this.request, transmitMsgtype);
        } catch (x) {
            this.close(Ex2ERR(ERR_GENERIC, x, "Could not transmit saguaro command"));
	    return;
        }
        var _this = this;
        this.timer = Timer.timeoutIn((this.timeout&&this.timeout>0) ? this.timeout : this.conn.getCommandTimeout(), function() {
            _this.timer = null;
            _this.close(Timeout2ERR(sprintf("Command '%s' failed", _this.request.cmd)));
        });
    },




    
   /**
    * Handles response of saguaro process.
    * @param response
    * @private
    */
   onBlob: function(/** Object */response) {
      assert(this.request.msgid == response.msgid);
       
      // if (response.cmd != 'mote-list' && response.msgtype == Saguaro.MOTE_REPLIES) {
      //    for (var i = 0; i < response.parts.length; i++) {
      //       var moteid = response.parts[i].moteid;
      //       var mote = Saguaro.lookupMote(this.conn, moteid);
      //       if (!mote) {
      //           this.close(new AOP.ERR("Cannot find mote for mote id: " + moteid));
      //           return;
      //       }
      //    }
      // }

      var replies;
      if (response.msgtype == Saguaro.MOTE_REPLIES) {
	 replies = response.parts;
      } else {
	 replies = [response];
      }

      var status = 0;
      for (var i = 0; i < replies.length; i++) {
	 if (replies[i].error != null) {
	    status = 1;
	 }
      }

      if (response.time!=undefined) {
         this.time = response.time;
      }
      if (response.timeout) {
         this.timeout = response.timeout;
      }
      if (response.until) {
          this.until = response.until;
      }

      assert(replies.length>=0);
      assert(status || (status==0));
      var result = null;
      if (status == 0) {
	  result = new AOP.OK(new Saguaro.Response(response, replies)); 
      } else {
	 var lines = [];
	 for (i = 0; i < replies.length; i++) {
            var source = (replies[i].moteid != null) ? sprintf("<mote#%d>", replies[i].moteid) : "<controller>";
            var txt = replies[i].error ? replies[i].error : Util.formatData(replies[i]);
	    lines.push(sprintf("Saguaro %s: %s", source, txt));
	 }
	  var msg = sprintf("Saguaro command '%s' failed:\n  %s", this.request.cmd, lines.join("\n  "));
	 result = new AOP.ERR(msg); 
      }
      this.close(result);
   }
};




