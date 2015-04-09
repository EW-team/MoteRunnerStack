/**
 * Encapsulates information for a field in a row, e.g. a column description.
 * @class
 * @param name
 * @param type
 * @param flags
 * @param table
 */
DBI.Mysql.Field = function(/** String */name, /** Number */type, /** Number */flags, /** String */table) {
   this.name = name;
   this.type = type;
   this.flags = (flags==undefined)?0:flags;
   this.table = table;
};

/** Prototype */
DBI.Mysql.Field.prototype = {
   /**
    * Table name
    * @type String
    * @private
    */
   table: null,

   /**
    * Field name
    * @type String
    * @private
    */
   name: null,

   /**
    * Field type. MYSQL_TYPE_STRING etc.
    * @type Number
    * @private
    */
   type: null,

   /**
    * Mysql field flags
    * @type Number
    * @private
    */
   flags: 0,

   /**
    * @returns {String}
    */
   toString: function() {
      return sprintf("%s:%s:%x:%s", this.name, this.getTypeAsString(), this.flags, this.table);
   },

   /**
    * @returns {String} name
    */
   getName: function() {
      return this.name;
   },

   /**
    * @returns {String} table name
    */
   getTable: function() {
      return this.table;
   },

   /**
    * @returns {Number} type
    */
   getType: function() {
      return this.type;
   },

   /**
    * @returns {Number} flags
    */
   getFlags: function() {
      return this.flags;
   },

    /**
     * Return type as string.
     * @returns {String}
     */
    getTypeAsString: function() {
	switch(this.type) {
	case DBI.Mysql.MYSQL_TYPE_STRING:
	    return "string";
	case DBI.Mysql.MYSQL_TYPE_VAR_STRING:
            return "var_string";
	case DBI.Mysql.MYSQL_TYPE_TINY:
	    return "tiny";
	case DBI.Mysql.MYSQL_TYPE_SHORT:
	    return "short";
	case DBI.Mysql.MYSQL_TYPE_INT24:
	    return "int24";
	case DBI.Mysql.MYSQL_TYPE_LONG:
	    return "long";
	case DBI.Mysql.MYSQL_TYPE_FLOAT:
	    return "float";
	case DBI.Mysql.MYSQL_TYPE_DOUBLE: 
	    return "double";
	case DBI.Mysql.MYSQL_TYPE_TIME:
	    return "time";
	case DBI.Mysql.MYSQL_TYPE_DATE: 
	    return "date";
	case DBI.Mysql.MYSQL_TYPE_DATETIME:
	    return "datetime";
	case DBI.Mysql.MYSQL_TYPE_TIMESTAMP: 
	    return "timestamp";
	default:
            assert(0, "invalid type " + this.type);
	}
	return "invalid";
    }
};






