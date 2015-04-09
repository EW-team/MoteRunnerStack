/**
 * Base class for rows fetched from the database. 
 * @class
 * @param handle
 */
DBI.Mysql.Row = function(handle) {
   this.__handle__ = handle;
};


/** Prototype */
DBI.Mysql.Row.prototype = {
   /**
    * @returns {DBI.Mysql.Handle} the data base handle
    */
   getHandle: function() {
      return this.__handle__;
   },

   
   /**
    * Call func for each column-name/value pair. The function signature must be
    * function(String name, Object value).
    * @param func
    */
   forEach: function(/** Function */func) {
       var names = this.getFieldNames();
       for (var i = 0; i < names.length; i++) {
	   var n = names[i];
	   func(n, this[n]);
       }
   },


   /**
    * @returns {Object}
    */
   _marshal: function() {
       var obj = {};
       var names = this.getFieldNames();
       for (var i = 0; i < names.length; i++) {
	   var n = names[i];
	   obj[n] = this[n];
       }
       return Blob.marshal(obj);
   },
   
   /**
    * @returns {String[]}
    * @private
    */
    getFieldNames: function() {
	var fns = [];
	for (var n in this) {
	   if (/^__/.test(n) || (typeof(this[n]) === 'function')) { continue; }
	   fns.push(n);
	}
	return fns;
    },
   
   /**
    * @returns {String} string
    */
   toString: function() {
       var sa = [];
       this.forEach(function(name, value) {
	   var s = sprintf("%s='%s'", name, value?value.toString():value);
           sa.push(s);
       });
       return "row:" + sa.join(",");
   }
};



