/**
 * A mysql handle.
 * @class
 * @see DBI.Mysql.getHandle
 * @param queue    The queue to exchange data with the native thread
 * @param hid      Native mysql handle id
 */
DBI.Mysql.Handle = function(/** Core.Queue */queue, /** Number */hid) {
    this.queue = queue;
    this.hid = hid;
    this.name2table = {};
};

/** Prototype */
DBI.Mysql.Handle.prototype = {
    /**
     * @type Core.Queue
     * @private
     */
    queue: null,

    /**
     * @type Number
     * @private
     */
    hid: -1,

    /**
     * @type Object
     * @private
     */
    name2table: null,
    
    
    /**
     * Close handle and free resources.
     * @param callback
     */
    close: function(/** DFLT_ASYNC_CB */callback) {
	if (BC.is(callback)) { return BC.exec(arguments.callee, this, arguments); }
	var hid = this.hid;
	DBI.Mysql.removeHandle(this);
	this.hid = -1;
	var _this = this;
	var cmd = this.queue.getCmd(DBI.Mysql.OP_MYSQL_CLOSE, hid, callback, function(blob) {
	    assert(blob.code === 0);
	    callback(new AOP.OK());
	});
	this.queue.issue(cmd);
    },


    /**
     * Has handle been closed?
     * @returns {Boolean}
     */
    isClosed: function() {
	return this.hid < 0;
    },


    /**
     * List databases.
     * @param wildcard May be null
     * @param callback
     * @returns {String[]} The database names
     */
    listDatabases: function(/** String */wildcard, /** DFLT_ASYNC_CB */callback) {
	if (BC.is(callback)) { return BC.exec(arguments.callee, this, arguments); }
	if (!wildcard) {
	    wildcard = null;
	}
	var _this = this;
	var cmd = this.queue.getCmd(DBI.Mysql.OP_MYSQL_LIST_DATABASES, this.hid, callback, function(blob) {
	    assert(blob.code === 0);
	    var databases = blob.databases;
	    callback(new AOP.OK(databases));
	});
	this.queue.issue(cmd, wildcard);
    },


    /**
     * List tables.
     * @param wildcard May be null
     * @param callback
     * @returns {String[]} The table names
     */
    listTables: function(/** String */wildcard, /** DFLT_ASYNC_CB */callback) {
	if (BC.is(callback)) { return BC.exec(arguments.callee, this, arguments); }
	if (!wildcard) {
	    wildcard = null;
	}
	var _this = this;
	var cmd = this.queue.getCmd(DBI.Mysql.OP_MYSQL_LIST_TABLES, this.hid, callback, function(blob) {
	    assert(blob.code === 0);
	    var tables = blob.tables;
	    callback(new AOP.OK(tables));
	});
	this.queue.issue(cmd, wildcard);
    },


    /**
     * Connect to mysql.
     * @param host
     * @param user May be null
     * @param password May be null
     * @param database May be null
     */
    connect: function(/** String */host, /** String */user, /** String */password, /** String */database, /** DFLT_ASYNC_CB */callback) {
	if (BC.is(callback)) { return BC.exec(arguments.callee, this, arguments); }
	if (!user) { user = null; }
	if (!password) { password = null; }
	if (!database) { database = null; }
	var _this = this;
	var cmd = this.queue.getCmd(DBI.Mysql.OP_MYSQL_CONNECT, this.hid, callback, function(blob) {
	    assert(blob.code === 0);
	    if (database) {
		try {
		    _this.retrieveTables();
		} catch(ex) {
		    callback(new AOP.ERR(ERR_GENERIC, "Could not retrieve tables: " + ex));
		    return;
		}
	    } 
	    callback(new AOP.OK());
	});
	this.queue.issue(cmd, host, user, password, database);
    },


    /**
     * Select database.
     * @param name
     * @param callback
     */
    selectDatabase: function(/** String */name, /** DFLT_ASYNC_CB */callback) {
	assert(name);
	if (BC.is(callback)) { return BC.exec(arguments.callee, this, arguments); }
	var _this = this;
	var cmd = this.queue.getCmd(DBI.Mysql.OP_MYSQL_SELECT_DATABASE, this.hid, callback, function(blob) {
	    assert(blob.code === 0);
	    try {
		_this.retrieveTables();
	    } catch(ex) {
		callback(new AOP.ERR(ERR_GENERIC, "Could not retrieve tables: " + ex));
		return;
	    }
	    callback(new AOP.OK());
	});
	this.queue.issue(cmd, name);
    },


    /**
     * Insert id.
     * @param callback
     * @returns {Number} The inserted id
     */
    insertId: function(/** DFLT_ASYNC_CB */callback) {
	if (BC.is(callback)) { return BC.exec(arguments.callee, this, arguments); }
	var _this = this;
	var cmd = this.queue.getCmd(DBI.Mysql.OP_MYSQL_INSERT_ID, this.hid, callback, function(blob) {
	    assert(blob.code === 0);
	    var n = blob.n;
	    callback(new AOP.OK(n));
	});
	this.queue.issue(cmd);
    },


    /**
     * Field count operation.
     * @param callback
     * @returns {Number} The field count
     */
    fieldCount: function(/** DFLT_ASYNC_CB */callback) {
	if (BC.is(callback)) { return BC.exec(arguments.callee, this, arguments); }
	var _this = this;
	var cmd = this.queue.getCmd(DBI.Mysql.OP_MYSQL_FIELD_COUNT, this.hid, callback, function(blob) {
	    assert(blob.code === 0);
	    var n = blob.n;
	    callback(new AOP.OK(n));
	});
	this.queue.issue(cmd);
    },


    /**
     * Escape string.
     * @param s
     */
    escape: function(/** String */s) {
	return DBI.Mysql.escape(this.hid, s);
    },


    /**
     * Quote value for specified field.
     * @param f
     * @param v
     * @returns {String}
     */
    quote: function(/** DBI.Mysql.Field */f, /** Object */v) {
	var s = null;
	switch(f.type) {
	case DBI.Mysql.MYSQL_TYPE_STRING:
	case DBI.Mysql.MYSQL_TYPE_VAR_STRING:
            s = sprintf("'%s'", this.escape(v.toString()));
            break;
	case DBI.Mysql.MYSQL_TYPE_TINY:
	case DBI.Mysql.MYSQL_TYPE_SHORT:
	case DBI.Mysql.MYSQL_TYPE_INT24:
	case DBI.Mysql.MYSQL_TYPE_LONG:
            s = sprintf("%d", v);
            break;
	case DBI.Mysql.MYSQL_TYPE_FLOAT:
	case DBI.Mysql.MYSQL_TYPE_DOUBLE: {
            s = v.toString();
            break;
	}
	case DBI.Mysql.MYSQL_TYPE_TIME:
            assert(v instanceof Date);
            s = sprintf("'%s'", DBI.Mysql.genTime(v));
            break;
	case DBI.Mysql.MYSQL_TYPE_DATE: 
            assert(v instanceof Date);
            s = sprintf("'%s'", DBI.Mysql.genDate(v));
            break;
	case DBI.Mysql.MYSQL_TYPE_DATETIME:
	case DBI.Mysql.MYSQL_TYPE_TIMESTAMP: 
            assert(v instanceof Date);
            s = sprintf("'%s'", DBI.Mysql.genTimestamp(v));
            break;
	default:
            assert(0, "invalid type " + f.type);
	}
	return s;
   },


   /**
    * Create a database.
    * @param database
    * @param ifNotExists
    * @param callback
    */
   createDatabase: function(/** String */database, /** Bool */ifNotExists, callback) {
	if (BC.is(callback)) { return BC.exec(arguments.callee, this, arguments); }
      var s = "create database ";
      if (ifNotExists) {
         s += "if not exists ";
      }
      s += database;
      this.query(s, callback);
   },

   
   /**
    * Has database?
    * @param name
    * @param callback
    * @returns {Boolean}
    */
   hasDatabase: function(/** String */name, callback) {
	if (BC.is(callback)) { return BC.exec(arguments.callee, this, arguments); }
       this.listDatabases(null, function(result) {
	   if (result.code != 0) {
	       callback(result);
	   } else {
	       var databases = result.getData();
	       var exists = databases.indexOf(name) >= 0;
	       callback(new AOP.OK(exists));
	   }
       });
   },

   
   /**
    * Create a table.
    * @param name        table name
    * @param ifNotExists flag
    * @param colDefs     array of column definitions
    * @param callback
    * @returns {DBI.Mysql.Table}
    */
   createTable: function(/** String */name, /** Bool */ifNotExists, /** DBI.Mysql.ColumnDef[] */colDefs, callback) {
	if (BC.is(callback)) { return BC.exec(arguments.callee, this, arguments); }
       assert(colDefs instanceof Array);
       var s = "create table ";
       if (ifNotExists) {
           s += "if not exists ";
       }
       s += name + " (" + DBI.Mysql.ColumnDef.gen(colDefs) + ")";
       var _this = this;
       this.query(s, function(result) {
	   if (result.code != 0) {
	       callback(result);
	   } else {
	       _this.retrieveTable(name, callback);
	   }
       });
   },

   
   /**
    * Drop table.
    * @param ifExists flag
    * @param tables table name
    * @param callback
    */
   dropTable: function(/** Bool */ifExists, /** String|String[] */tables, callback) {
	if (BC.is(callback)) { return BC.exec(arguments.callee, this, arguments); }
       assert(arguments.length>=2);
       var s = "drop table ";
       if (ifExists) {
           s += "if exists ";
       }
       if (typeof(tables) === 'string') {
	   tables = [ tables ];
       }
       s += tables.join(', ');
       var _this = this;
       this.query(s, function(result) {
	   if (result.code != 0) {
	       callback(result);
	       return;
	   }
	   for (var i = 0; i < tables.length; i++) {
	       delete _this.name2table[tables[i]];
	   }
       });
   },


   /**
    * Has table?
    * @param name
    * @returns {Boolean}
    */
   hasTable: function(/** String */name) {
       return this.name2table[name] !== undefined;
   },


   /**
    * 
    * @param name
    * @returns {DBI.Mysql.Table} table or null
    */
   getTable: function(/** String */name) {
       return this.name2table[name];
   },


   /**
    * 
    * @returns {DBI.Mysql.Table[]}
    */
   getTables: function() {
       var tables = [];
       for (var n in this.name2table) {
	   tables.push(this.name2table[n]);
       }
       return tables;
   },


   /**
    * 
    * @param name
    * @param callback
    * @returns {DBI.Mysql.Table}
    * @private
    */
   retrieveTable: function(/** String */name, callback) {
	if (BC.is(callback)) { return BC.exec(arguments.callee, this, arguments); }
       var table = this.name2table[name];
       if (table) {
	   //QUACK(0, "DBI.Mysql.Handle.retrieveTable: delete existing table " + name);
	   delete this.name2table[name];
       }
       table = new DBI.Mysql.Table(this, name);
       var _this = this;
       this.fetchSchema(name, function(result) {
	   if (result.code != 0) {
	       callback(result);
	       return;
	   }
	   var fields = result.getData();
	   table.schema = new DBI.Mysql.Schema(table, fields);
	   _this.name2table[name] = table;
	   callback(new AOP.OK(table));
       });
   },


    /**
     * @private 
     */
    retrieveTables: function(callback) {
	this.name2table = {};
	var tableNames = this.listTables(null, BLCK);
	for (var i = 0; i < tableNames.length; i++) {
	    this.retrieveTable(tableNames[i], BLCK);
	}
    },
    
   
   /**
    * Return schme for table.
    * @param tableName
    * @param callback
    * @returns {DBI.Mysql.Field[]}
    * @private
    */
   fetchSchema: function(/** String */name, callback) {
	if (BC.is(callback)) { return BC.exec(arguments.callee, this, arguments); }
       var s = sprintf("select * from %s limit 1", name);
       var _this = this;
       this.query(s, function(result) {
	   if (result.code != 0) {
	       callback(result);
	       return;
	   }
	   _this.fetchResults(0, function(result) {
	       if (result.code != 0) {
		   callback(result);
		   return;
	       }
	       result = result.getData();
	       var fields = result.getFields();
	       callback(new AOP.OK(fields));
	   });
       });
   },


   /**
    * Execute mysql_query().
    * @param s
    * @param callback
    */
    query: function(/** String */s, /** DFLT_ASYNC_CB */callback) {
	if (BC.is(callback)) { return BC.exec(arguments.callee, this, arguments); }
	var _this = this;
	var cmd = this.queue.getCmd(DBI.Mysql.OP_MYSQL_QUERY, this.hid, callback, function(blob) {
	    assert(blob.code === 0);
	    callback(new AOP.OK());
	});
	this.queue.issue(cmd, s);
   },

   
   /**
    * Calls mysql_fetch_results() and returns an array with objects where each object represents a row.
    * The properties of the object are the column names which point to the column values.
    * @param cnt     -1 => all results
    * @returns {DBI.MYSQL.Row[]}
    */
   fetchObjects: function(/** Number */cnt, callback) {
	if (BC.is(callback)) { return BC.exec(arguments.callee, this, arguments); }
       var _this = this;
       this.fetchResults(cnt, function(result) {
	   if (result.code != 0) {
	       callback(result);
	       return;
	   }
	   result = result.getData();
	   callback(new AOP.OK(result.toObjects()));
       });
   },

   
   /**
    * 
    * @param cnt  number of rows to return, if 'undefined', default is -1 to return all rows
    * @param callback
    * @returns {DBI.Mysql.FetchResult}
    */
   fetchResults: function(/** Number */cnt, callback) {
	if (BC.is(callback)) { return BC.exec(arguments.callee, this, arguments); }
       if (cnt===undefined) { cnt = -1; }
       var _this = this;
       var cmd = this.queue.getCmd(DBI.Mysql.OP_MYSQL_FETCH_RESULTS, this.hid, callback, function(blob) {
	   assert(blob.code === 0);
	   assert(blob.rows);
	   callback(new AOP.OK(new DBI.Mysql.FetchResult(_this, blob.fields, blob.rows)));
       });
       this.queue.issue(cmd, cnt);
   },


    /**
     * Return a select perform object.
     * @returns {DBI.Mysql.Select}
     */
    select: function(/** String */s) {
	return new DBI.Mysql.Select(this, s);
    },

    /**
     * @private
     */
    toString: function() {
	return "DBI.Mysql.Handle:" + this.hid;
    }
};















