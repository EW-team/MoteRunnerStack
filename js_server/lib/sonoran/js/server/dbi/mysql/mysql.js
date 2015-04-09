//  (C) COPYRIGHT INTERNATIONAL BUSINESS MACHINES CORPORATION 2006-2008
//                       ALL RIGHTS RESERVED
//        IBM Research Division, Zurich Research Laboratory
// --------------------------------------------------------------------


/**
 * @namespace DBI
 */
if (typeof(DBI) === "undefined") {
    DBI = {};
}



/**
 * @namespace DBI.Mysql 
 */
DBI.Mysql = {
   /** 
    * RegExp a mysql timestamp adheres to. 
    * @type String
    */
   TIMESTAMP_RE: /(\d\d\d\d)-(\d\d)-(\d\d) (\d\d):(\d\d):(\d\d)/,

   /** 
    * RegExp a mysql date adheres to. 
    * @type String
    */
   DATE_RE: /(\d\d\d\d)-(\d\d)-(\d\d)/,

   /** RegExp a mysql time adheres to. */
   TIME_RE: /(\d\d):(\d\d):(\d\d)/,

   /**
    * Parse timestamp as returned by mysql.
    * @param ts
    * @returns Date
    */
   parseTimestamp: function(/** String */ts) {
      var re = DBI.Mysql.TIMESTAMP_RE;
      assert(re.test(ts));
      var md = re.exec(ts);
      var d = new Date();
      d.setFullYear(parseInt(md[1]), 10);
      d.setMonth(parseInt(md[2], 10)-1);
      d.setDate(1+parseInt(md[3], 10)-1);
      d.setHours(parseInt(md[4], 10));
      d.setMinutes(parseInt(md[5], 10));
      d.setSeconds(parseInt(md[6], 10));
      d.setMilliseconds(0);
      return d;
   },

   /**
    * Parse date as returned by mysql.
    * @param ds
    * @returns Date
    */
   parseDate: function(/** String */ds) {
      var re = DBI.Mysql.DATE_RE;
      assert(re.test(ds));
      var md = re.exec(ds);
      var d = new Date();
      d.setFullYear(parseInt(md[1], 10));
      d.setMonth(parseInt(md[2], 10)-1);
      d.setDate(1+parseInt(md[3], 10)-1);
      d.setHours(0);
      d.setMinutes(0);
      d.setSeconds(0);
      d.setMilliseconds(0);
      return d;
   },

   /**
    * Parse time as returned by mysql.
    * @param ts
    * @returns Date
    */
   parseTime: function(/** String */ts) {
      var re = DBI.Mysql.TIME_RE;
      assert(re.test(ts));
          var md = re.exec(ts);
      var d = new Date();
      d.setHours(parseInt(md[1], 10));
      d.setMinutes(parseInt(md[2], 10));
      d.setSeconds(parseInt(md[3], 10));
      d.setMilliseconds(0);
      return d;
   },

   /**
    * Generate from Date timestamp string as expected by mysql.
    * @param d
    * @returns {String}
    */
   genTimestamp: function(/** Date */d) {
      return sprintf("%04d-%02d-%02d %02d:%02d:%02d", d.getUTCFullYear(), d.getMonth()+1, d.getDate(), d.getHours(), d.getMinutes(), d.getSeconds());
   },

   /**
    * Generate from Date date string as expected by mysql.
    * @param d
    * @returns {String}
    */
   genDate: function(/** Date */d) {
      return sprintf("%04d-%02d-%02d", d.getUTCFullYear(), d.getMonth()+1, d.getDate());
   },

   /**
    * Generate from Date time string as expected by mysql.
    * @param d
    * @returns {String}
    */
   genTime: function(/** Date */d) {
      return sprintf("%02d:%02d:%02d", d.getHours(), d.getMinutes(), d.getSeconds());
   },

   
   /**
    * Dump all native mysql constants in DBI.Mysql using println.
    */
   dumpConstants: function() {
      for (var p in DBI.Mysql) {
         var v = DBI.Mysql[p];
         if (typeof(v) == 'number') {
            println(sprintf("%-50s= %d;", "DBI.Mysql."+p, v));
         }
      }
   },


    /**
     * Queue to communicate with native thread.
     * @private
     */
    queue: null,


    /**
     * Map of handle id to handle objects
     * @private
     */
    handles: {},


    /**
     * Initialize a mysql handle.
     * @param callback
     * @returns {DBI.Mysql.Handle}
     */
    getHandle: function(/** DFLT_ASYNC_CB */callback) {
	if (BC.is(callback)) { return BC.exec(arguments.callee, this, arguments); }
	var _this = this;
	var cmd = this.queue.getCmd(DBI.Mysql.OP_MYSQL_INIT, 0, callback, function(blob) {
	    if (blob.code !== 0) {
		callback(new AOP.ERR(ERR_GENERIC, sprintf("Operation failed: %d, %d, %s", blob.code, blob.errnum, blob.msg)));
		return;
	    } 
	    var hid = blob.hid;
	    if (_this.handles[hid]) {
		callback(new AOP.ERR(ERR_GENERIC, "Internal error. Handle already used."));
		return;
	    }
	    var handle = new DBI.Mysql.Handle(_this.queue, hid);
	    _this.handles[hid] = handle;
	    callback(new AOP.OK(handle));
	});
	this.queue.issue(cmd);
    },

    /**
     * @private
     */
    removeHandle: function(/** DBI.Mysql.Handle */handle) {
	var hid = handle.hid;
	assert(this.handles[hid]);
	delete this.handles[hid];
    }
};


Runtime.include("./queue.js");
Runtime.include("./handle.js");
Runtime.include("./table.js");
Runtime.include("./fetch_result.js");
Runtime.include("./field.js");
Runtime.include("./row.js");
Runtime.include("./expr.js");




Runtime.load("jsmysql", "jsmysql_init", DBI.Mysql);














