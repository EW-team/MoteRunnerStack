

/**
 * Result of fetch operation.
 * @class
 * @param handle
 * @param fields
 * @param rows
 */
DBI.Mysql.FetchResult = function(/** DBI.Mysql.Handle */handle, /** DBI.Mysql.Field[] */fields, /** Object[] */rows) {
    this.handle = handle;
    this.fields = fields;
    this.rows = rows;
    for (var i = 0; i < rows.length; i++) {
	var row = rows[i];
	assert(row.length==fields.length);
	for (var j = 0; j < row.length; j++) {
            var col = row[j];
            if (col) {
		if (fields[j].type == DBI.Mysql.MYSQL_TYPE_TIMESTAMP) {
		    row[j] = DBI.Mysql.parseTimestamp(col);
		}
		if (fields[j].type == DBI.Mysql.MYSQL_TYPE_DATETIME) {
		    row[j] = DBI.Mysql.parseTimestamp(col);
		}
		if (fields[j].type == DBI.Mysql.MYSQL_TYPE_DATE) {
		    row[j] = DBI.Mysql.parseDate(col);
		}
		if (fields[j].type == DBI.Mysql.MYSQL_TYPE_TIME) {
		    row[j] = DBI.Mysql.parseTime(col);
		}
            }
	}
    }
};

/** Prototype */
DBI.Mysql.FetchResult.prototype = {
    /**
     * @type DBI.Mysql.Handle
     * @private
     */
    handle: null,

   /**
    * Field information for each column in the row objects.
    * @type DBI.Mysql.Field[]
    * @private
    */
   fields: null,
   
   /**
    * Array of rows. Each row is an array of values for each column described by a field in 'fields'.
    * @type Object[]
    * @private
    */
   rows: null,

   /**
    * Return fields
    * @returns {DBI.Mysql.Field[]}
    */
   getFields: function() {
      return this.fields;
   },

   /**
    * Return rows. Each row is an array of values for each column described by a field in 'fields' returned by getFields.
    * @returns {Object[]}
    */
   getRows: function() {
      return this.rows;
   },

   /**
    * Returns first row
    * @returns {Object[]}
    */
   get1st: function() {
      return this.rows[0];
   },


   /** 
    * @returns {String}
    */
   toString: function() {
      var hdr = [];
      for (var i = 0; i < this.fields.length; i++) {
         var f = this.fields[i];
         hdr.push(f.name + ":" + f.type);
      }
      var t = new Formatter.Table(hdr);
      if (this.rows.length==0) {
         t.separate('---');
      } else {
         for (var i = 0; i < this.rows.length; i++) {
            var cols = this.rows[i];
            var row = [];
            for (var j = 0; j < cols.length; j++) {
               row.push(cols[j]?cols[j].toString():"NULL");
            }
            t.add(row);
         }
      }
      return t.gen(2);
   },


    /**
     * Map this fetch result into an array of objects (of field name => value pairs). 
     * For each foreign key, an object contains a getX accessor method retrieving the
     * referenced row.
     * @returns {DBI.Mysql.Row[]}
     */
    toObjects: function() {
	var ret = [];
	for (var i = 0; i < this.rows.length; i++) {
            var row = this.rows[i];
            assert(row.length==this.fields.length);
            var obj = new DBI.Mysql.Row(this.handle);
            for (var j = 0; j < this.fields.length; j++) {
		var f = this.fields[j];
		//QUACK(0, "FIELD: " + f);
		obj[f.name] = row[j];
		var re = /(.+)_id/;
		var md = re.exec(f.name);
		if (md) {
		    var tn = md[1];
		    var table = this.handle.getTable(tn);
		    var s = sprintf(
			"f = function() {\n" +
			    "  var table = this.__handle__.getTable('%s');\n" +
			    "  result = table.get(this.%s, undefined, SCB);\n" +
			    "  if (result.code !== 0) {\n" +
			    "    throw result.toString();\n" +
			    "  }\n" +
			    "  return result.getData();\n" +
			    "};\n", tn, f.name);
		    //QUACK(0, s);
		    try {
			var _o = eval(s);
			assert(typeof(_o) == 'function');
			obj["get"+capitalize(tn)] = _o;
		    } catch (x) {
			assert(0, x);
		    }
		}
            }
            ret.push(obj);
	}
	return ret;
    }
};
