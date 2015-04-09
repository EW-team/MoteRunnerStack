/**
 * The queue to exchange packets with native thread.
 * @class
 * @augments Core.Queue
 * @private
 */
DBI.Mysql.Queue = function() {
    Core.Queue.call(this);
    this.commandMap = {};
};

/** Prototype. */
DBI.Mysql.Queue.prototype = extend(
   Core.Queue.prototype,
   /** @lends DBI.Mysql.Queue.prototype */
   {
       /**
	* Map of command id to Command instance
	* @type Object
	* @private
	*/
       commandMap: null,

       /**
	* Packet from native code, a command response.
	* @private
	*/
       onBlob: function(/** Object */blob) {
	   //QUACK(0, "DBI.Mysql.Queue.onBlob: " + Util.formatData(blob));
	   var cid = blob.cid;
	   var cmd = this.commandMap[cid];
	   if (!cmd) {
	       QUACK(0, "Ignore command response: " + Util.formatData(blob));
	       return;
	   }
	   delete this.commandMap[cid];

	   if (blob.code !== 0) {
	       cmd.callback(new AOP.ERR(ERR_GENERIC, sprintf("Operation failed: code %d, hid %d, errnum %d, msg '%s'", blob.code, blob.hid, blob.errnum, blob.msg)));
	   } else {
	       cmd.evaluator(blob);
	   }
       },

       /**
	* Create a command.
	* @param cop   Command operation
	* @param hid   Handle id
	* @param callback
	* @param evaluator
	* @returns {DBI.Mysql.Command}
	* @private
	*/
       getCmd: function(/** Number */cop, /** Number */hid, /** Function */callback, /** Function */evaluator) {
	   assert(typeof(callback) === 'function', "Missing callback function");
	   assert(typeof(evaluator) === 'function', "Missing evaluator function");
	   return new DBI.Mysql.Command(this.id, cop, hid, callback, evaluator);
       },
       
       /**
	* Issue a command.
	* @param cmd
	* @param args Variable argument list
	* @private 
	*/
       issue: function(/** DBI.Mysql.Command */cmd) {
	   var args = [ cmd.qid, cmd.cop, cmd.cid, cmd.hid ];
	   for (var i = 1; i < arguments.length; i++) {
	       args.push(arguments[i]);
	   }
	   assert(!this.commandMap[cmd.cid]);
	   this.commandMap[cmd.cid] = cmd;
	   DBI.Mysql.issue.apply(null, args);
       },

       /**
	* @private
	*/
       toString: function() {
	   return "Mysql";
       }
   }
);



/**
 * Command.
 * @class
 * @param qid   Queue id
 * @param cop   Command operation id
 * @param hid   Handle id
 * @param callback
 * @param evaluator
 * @private
 */
DBI.Mysql.Command = function(/** Number */qid, /** Number */cop, /** Number */hid, /** DFLT_ASYNC_CB */callback, /** Function */evaluator) {
    this.qid = qid;
    this.cop = cop;
    this.hid = hid;
    this.cid = DBI.Mysql.Command.ID;
    DBI.Mysql.Command.ID += 1;
    this.callback = callback;
    this.evaluator = evaluator;
    assert(typeof(callback) === 'function', "Missing callback function");
    assert(typeof(evaluator) === 'function', "Missing evaluator function");
};

/**
 * Next command id to use.
 * @type Number
 * @private
 */
DBI.Mysql.Command.ID = 1;



DBI.Mysql.queue = new DBI.Mysql.Queue();
Core.addQ(DBI.Mysql.queue);
assert(DBI.Mysql.queue.id>=6);
