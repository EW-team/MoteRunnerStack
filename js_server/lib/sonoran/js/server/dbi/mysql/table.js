
/**
 * Encapsulates a table. Use DBI.MYSQL.Connection#getTable to get a table instance.
 * @class
 * @param handle
 * @param name
 */
DBI.Mysql.Table = function(/** DBI.Mysql.Handle */handle, /** String */name) {
   this.handle = handle;
   this.name = name;
};

/** Prototype */
DBI.Mysql.Table.prototype = {
   /**
    * Mysql connection
    * @type DBI.Mysql.Handle
    * @private
    */
   handle: null,

   /**
    * Table name
    * @type String
    * @private
    */
   name: null,

   /**
    * Schema,
    * @type DBI.Mysql.Schema
    * @private
    */
   schema: null,


    /**
     * @returns {DBI.Mysql.Handle} handle
     */
    getHandle: function() {
	return this.handle;
    },


    /**
     * @returns {String} name
     */
    getName: function() {
	return this.name;
    },

    /**
     * @returns {DBI.Mysql.Schema} the schema
     */
    getSchema: function() {
	return this.schema;
    },

   
   /**
    * Insert row. 
    * @param row   An object with name/value pairs
    * @param callback
    * @returns {Object} The input object but with property 'id'
    */
   insert: function(/** Object */row, callback) {
	if (BC.is(callback)) { return BC.exec(arguments.callee, this, arguments); }
       var s = "insert into " + this.name + " set " + this.getSchema().genSetClause(row);
       //QUACK(0, "Mysql.Table.insert", s);
       var _this = this;
       var handle = this.handle;
       handle.query(s, function(result) {
	   if (result.code != 0) {
	       callback(result);
	   } else {
	       handle.insertId(function(result) {
		   assert(result.code===0, result.toString());
		   row.id = result.getData();
		   assert(row.id!==undefined);
		   callback(new AOP.OK(row));
	       });
	   }
       });
   },

   
   /**
    * Returns a select object for this table.
    * @param expr      Select expression, if unspecified, * is used
    * @returns {DBI.Mysql.Select}
    */
    select: function(/** String */expr) {
	if (!expr) { expr = "*"; }
	return new DBI.Mysql.Select(this.handle, expr).from(this);
   },

   
   /**
    * Get record identified by integer key, typically primary key.
    * @param id     key value 
    * @param col    optional, column name, default is 'id'
    * @param callback
    * @returns {DBI.Mysql.Row} An object containing the row or null if not found
    */
    get: function(/** Integer */id, /** String */col, callback) {
	if (BC.is(callback)) { return BC.exec(arguments.callee, this, arguments); }
	col = col||"id";
	var s = "select * from " + this.name + " where " + col + "=" + id;
	//QUACK(0, "Mysql.Table.get", s);
	var _this = this;
	this.handle.query(s, function(result) {
	    if (result.code != 0) {
		callback(result);
	    } else {
		_this.handle.fetchObjects(2, function(result) {
		    if (result.code != 0) {
			callback(result);
		    } else {
			var rows = result.getData();
			if (rows.length==0) {
			    callback(new AOP.OK(null));
			} else if (rows.length>1) {
			    callback(new AOP.ERR(ERR_GENERIC, "Multiple rows with id: " + id));
			} else {
			    callback(new AOP.OK(rows[0]));
			}
		    }
		});
	    }
	});
   },


   /**
    * Delete record identified by integer key, typically primary key.
    * @param id     key value 
    * @param col    optional, column name, default is 'id'
    */
   deleteOne: function(/** Integer */id, /** String */col, /** DFLT_ASYNC_CB */callback) {
       col = col||"id";
       var s = "delete from " + this.name + " where " + col + "=" + id;
       QUACK(1, "Mysql.Table.delete", s);
       this.handle.query(s, callback);
   },


   /**
    * Returns a DBI.Mysql.Delete instance to delete many rows.
    * @returns {DBI.Mysql.Delete}
    */
   deleteMany: function() {
       return new DBI.Mysql.Delete(this);
   },

   
   /**
    * Generic update for a single column identified by column name and integer value 
    * @param obj       object with name/value pairs to update
    * @param id        selection criteria of column
    * @param col       name of column for selection criteria, default 'id' 
    */
   updateOne: function(/** Object */obj, /** Number */id, /** String */col, /** DFLT_ASYNC_CB */callback) {
       var s = "update " + this.name + " set " + this.schema.genSetClause(obj);
       col = col||"id";
       s += " where " + col + "=" + id;
       QUACK(1, "Mysql.Table.update", s);
       return this.handle.query(s, callback);
   },

   
   /**
    * Update many rows.
    * @param obj    object with name/value pairs
    * @returns {DBI.Mysql.Update}
    */
   updateMany: function() {
       return new DBI.Mysql.Update(this, obj);
   },

   
   /**
    * Return multi-line table string for given rows (Array) or row (Object).
    * If no parameter is given, the whole table is dumped.
    * @param rows
    * @returns String
    */
   dump: function(/** DBI.Mysql.Row[] */rows) {
       assert(rows);
       var fns = this.schema.getFieldNames();
       var t = new Util.Formatter.Table2(fns.length);
       t.setTitle(fns);
       if (!(rows instanceof Array)) {
	   rows = [ rows ];
       }
       for (var i = 0; i < rows.length; i++) {
	   var row = rows[i];
           for (var j = 0; j < fns.length; j++) {
               t.setValue(j, i, (row[fns[j]]!=undefined) ? row[fns[j]].toString() : "---");
           }
       }
       return t.render().join("\n");
   },

   
   /**
    * Returns a select query object. Its perform method is overridden to make sure that exactly one or no object
    * is found, thus 'perform' returns an object or null if not found.
    * The perform() does not take a 'cnt' parameter.
    * @returns {DBI.Mysql.Select}
    */
   find: function() {
       var _this = this;
       var sel = new DBI.Mysql.Select(this.handle, "*").from(this);
       sel.perform = function(callback) {
	   if (BC.is(callback)) { return BC.exec(arguments.callee, this, arguments); }
	   DBI.Mysql.Select.prototype.perform.call(this, 2, function(result) {
	       if (result.code !== 0) {
		   callback(result);
		   return;
	       }
	       var rows = result.getData();
	       if (rows.length==0) {
		   callback(new AOP.OK(null));
	       } else if (rows.length>1) {
		   callback(new AOP.ERR(ERR_GENERIC, "Multiple rows with id: " + id));
	       } else {
		   callback(new AOP.OK(rows[0]));
	       }
	   });
       };
       return sel;
   },
   

   /**
    * Return string.
    */
   toString: function() {
      return "DBI.Mysql.Table: " + this.name + ", " + this.schema;
   }
};




/**
 * Table schema. 
 * @class
 * @param table
 * @param fields
 */
DBI.Mysql.Schema = function(/** DBI.Mysql.Table */table, /** DBI.Mysql.Field[] */fields) {
    this.table = table;
    this.fields = fields;
};


/** Prototype */
DBI.Mysql.Schema.prototype = {
    /**
     * @type DBI.Mysql.Table
     * @private
     */
    table: null,


   /**
     * @type DBI.Mysql.Field[]
     * @private
     */
    fields: null,


    /**
     * @returns {DBI.Mysql.Table} table
     */
    getTable: function() {
	return this.table;
    },


   /**
    * Get column fields.
    * @returns {DBI.Mysql.Field[]}
    */
   getFields: function() {
      return this.fields;
   },

   
   /**
    * Get column field names.
    * @returns {String[]}
    */
   getFieldNames: function() {
       var fieldNames = [];
       for (var i = 0; i < this.fields.length; i++) {
	   fieldNames.push(this.fields[i].name);
       }
       return fieldNames;
   },

   
   /**
    * Get field by name or throw exception
    * @returns {DBI.Mysql.Field}
    */
   getField: function(/** String */name) {
      for (var i = 0; i < this.fields.length; i++) {
         if (this.fields[i].name == name) {
            return this.fields[i];
         }
      }
       throw sprintf("Missing column '%s' in table '%s'", name, this.table.getName());
   },

   
   /**
    * Lookup field by name or return null
    * @returns {DBI.Mysql.Field}
    */
   lookupField: function(/** String */name) {
      for (var i = 0; i < this.fields.length; i++) {
         if (this.fields[i].name == name) {
            return this.fields[i];
         }
      }
       return null;
   },
    

    /**
     * Helper function creating 'name1=val1,name2=val2,..' for obj where obj
     * is a row (or parts of a row) described by the table schema. The values
     * are quoted according to the field type of the object property of the same name.
     * @param obj
     * @returns {String}
     */
    genSetClause: function(/** Object */obj) {
	var lines = [];
	var handle = this.table.handle;
	for (var name in obj) {
	   if (/^__/.test(name)) {
               continue;
	   }
	   var value = obj[name];
	    if (value === undefined) {
		throw sprintf("Missing value for property: '%s'", name);
	    }
	   if (typeof(value) === 'function') {
               continue;
	   }
            var f = this.getField(name);
            var s = sprintf("%s=%s", name, handle.quote(f, value));
            lines.push(s);
	};
	return lines.join(",");
    },


    /**
     * 
     */
    toString: function() {
	return "DBI.Mysql.Schema:" + this.table.getName() + ", " + this.fields.join(',');
    }
};









/**
 * DBI.Mysql.Column defines a column in a db table row.
 * @class 
 * @param name
 * @param type   DBI.Mysql.MYSQL_TYPE_XXX
 */
DBI.Mysql.ColumnDef = function(/** String */name, /** Number */type) {
   this._name = name;
   this._type = type;
   this._primary_key = undefined;
   this._auto_increment = undefined;
   this._not_null = undefined;
   this._witdh = undefined;
};


/**
 * Concatenate all strings generated by specified 'colDefs' to a single, comma-separated string.
 * @param {DBI.Mysql.ColumnDef[]} colDefs
 * @returns {String}
 * @private
 */
DBI.Mysql.ColumnDef.gen = function(/** DBI.Mysql.ColumnDef[] */colDefs) {
   var sa = [];
   for (var i = 0; i < colDefs.length; i++) {
      sa.push(colDefs[i].gen());
   }
   return sa.join(", ");
};


/** Prototype */
DBI.Mysql.ColumnDef.prototype = {
   /**
    * Column name
    * @type String
    * @private
    */
   _name: null,

   /**
    * Column type. DBI.MYSQL.TYPE_STRING etc.
    * @type Number
    * @private
    */
   _type: null,

   /**
    * Primary key?
    * @type Boolean
    * @private
    */
   _primary_key: undefined,

   /**
    * Auto increment?
    * @type Boolean
    * @private
    */
   _auto_increment: undefined,

   /**
    * Not null?
    * @type Boolean
    * @private
    */
   _not_null: undefined,

   /**
    * Width.
    * @type Number
    * @private
    */
   _witdh: undefined,

   
   /**
    * @returns {String}
    */
   toString: function() {
      return sprintf("column: name %s, type %d", this._name, this._type);
   },

   
   /**
    * Set object property
    * @param name
    * @returns {DBI.Mysql.ColumnDef} this
    */
   name: function(/** String */name) {
      this._name = name;
      return this;
   },

   
   /**
    * Set object property
    * @param type
    * @returns {DBI.Mysql.ColumnDef} this
    */
   type: function(/** Number */type) {
      this._type = type;
      return this;
   },

   
   /**
    * Set object property
    * @param primary_key
    * @returns {DBI.Mysql.ColumnDef} this
    */
   primary_key: function(/** Bolean */primary_key) {
      if (primary_key==undefined) { primary_key = true; }
      this._primary_key = primary_key;
      return this;
   },

   
   /**
    * Set object property
    * @param auto_increment
    * @returns {DBI.Mysql.ColumnDef} this
    */
   auto_increment: function(/** Boolean */auto_increment) {
      if (auto_increment==undefined) { auto_increment = true; }
      this._auto_increment = auto_increment;
      return this;
   },

   
   /**
    * Set object property
    * @param not_null
    * @returns {DBI.Mysql.ColumnDef} this
    */
   not_null: function(/** Boolean */not_null) {
      if (not_null==undefined) { not_null = true; }
      this._not_null = not_null;
      return this;
   },

   
   /**
    * Set object property
    * @param width
    * @returns {DBI.Mysql.ColumnDef} this
    */
   width: function(/** Number */width) {
      this._width = width;
      return this;
   },

   
   /**
    * Set a standard id column. Name 'id', int, auto increment, not null, primary.
    * @returns {DBI.Mysql.ColumnDef} this
    */
   id: function() {
      this._name = 'id';
      this._type = DBI.Mysql.MYSQL_TYPE_INT;
      this._primary_key = true;
      this._auto_increment = true;
      this._not_null = true;
      return this;
   },

   
   /**
    * Set a standard foreign key column. Name 'name'_id, type int.
    * @returns {DBI.Mysql.ColumnDef} this
    */
   fk: function(name) {
      this._name = name+'_id';
      this._type = DBI.Mysql.MYSQL_TYPE_INT;
      return this;
   },

   
   /**
    * Generate mysql column definition.
    * @returns {String} the column definition for a mysql create table call
    */
   gen: function() {
      var s = this._name;
      switch(this._type) {
       case DBI.Mysql.MYSQL_TYPE_INT: {
          s += " int";
          break;
       }
       case DBI.Mysql.MYSQL_TYPE_STRING: {
          s += " char";
          break;
       }
       case DBI.Mysql.MYSQL_TYPE_TIMESTAMP: {
          s += " timestamp";
          break;
       }
       case DBI.Mysql.MYSQL_TYPE_DATETIME: {
          s += " datetime";
          break;
       }
       case DBI.Mysql.MYSQL_TYPE_DATE: {
          s += " date";
          break;
       }
       case DBI.Mysql.MYSQL_TYPE_TIME: {
          s += " time";
          break;
       }
       case DBI.Mysql.MYSQL_TYPE_FLOAT: {
          s += " float";
          break;
       }
      default:
         throw "No support for column definition type " + this._type;
      }
      if (this._not_null) { s += " not null"; }
      if (this._auto_increment) { s += " auto_increment"; }
      if (this._primary_key) { s += " primary key"; }
      if (this._width) { s += sprintf("(%d)", this._width); }
      return s;
   }
};





