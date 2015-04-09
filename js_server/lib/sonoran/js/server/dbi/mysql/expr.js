

/**
 * Select operation
 * @class
 * @param handle
 * @param selectExpr  Optional
 */
DBI.Mysql.Select = function(/** DBI.Mysql.Handle */handle, /** String */selectExpr) {
    this.handle = handle;
    this.selectExprs = [];
    if (selectExpr) {
	this.selectExprs.push(selectExpr);
    }
    this.fromTables = [];
    this.where = DBI.Mysql.WhereClause.create(this, [ "perform", "limit" ], [ "orderby" ]);
    this.orderby = DBI.Mysql.OrderClause.create(this, [ "perform", "limit" ], []);
    this.limitCount=undefined;
};

/** @private */
DBI.Mysql.Select.prototype = {
    /**
     * @type DBI.Mysql.Handle
     * @private
     */
    handle: null,

    /**
     * @type DBY.Mysql.WhereClause 
     * @private
     */
    where: null,


    /**
     * @type DBY.Mysql.OrderClause 
     * @private
     */
    orderby: null,


    /**
     * @returns {DBI.Mysql.Handle}
     */
    getHandle: function() {
	return this.handle;
    },

    /**
     * Returns tables selected by from.
     * @returns {DBI.Mysql.Table[]}
     */
    getTables: function() {
	return this.fromTables;
    },


    /**
     * Add a select expression
     * @param expr
     */
    select: function(/** String */expr) {
	this.selectExprs.push(expr);
    },


    /**
     * Add tables to from expression.
     * @param tableNames
     * @returns {DBI.Mysql.Select} this
     */
    from: function(/** String|String[]|Table|Table[]*/tableNames) {
	if (typeof(tableNames) === 'string') {
	    tableNames = [ tableNames ];
	}
	if (tableNames instanceof DBI.Mysql.Table) {
	    tableNames = [ tableNames ];
	}
	for (var i = 0; i < tableNames.length; i++) {
	    var n = tableNames[i];
	    var table = (typeof(n) === 'string') ? this.handle.getTable(n) : n;
	    if (!table || !(table instanceof DBI.Mysql.Table)) {
		throw sprintf("Unknown or invalid table: '%s'", n);
	    }
	    this.fromTables.push(table);
	}
	return this;
    },


    /**
     * Execute query and fetch objects
     * @param cnt
     */
    perform: function(/** Number */cnt, /** DFLT_ASYNC_CB */callback) {
	if (BC.is(callback)) { return BC.exec(arguments.callee, this, arguments); }
	var s = this.gen();
	var handle = this.handle;
	handle.query(s, function(result) {
	    if (result.code != 0) {
		callback(result);
	    } else {
		handle.fetchObjects(cnt, callback);
	    }
	});
    },


    /**
     * Set select limit.
     * @param limitCount
     */
    limit: function(/** Number */limitCount) {
	this.limitCount = limitCount;
	return this;
    },

    
    /**
     * @returns {String} the generated query string
     * @private
     */
    gen: function() {
	var sb = "";
	sb += "select ";
	assert(this.selectExprs.length>0, "Missing select expression: select...");
	sb += this.selectExprs.join(",");
	if (this.fromTables.length>0) {
	    sb += " from ";
	    sb += this.fromTables.map(function(t) { return t.getName(); }).join(",");
	}

	var s = this.where.gen();
	if (s.length > 0) {
	    sb += " where " + s;
	}
	s = this.orderby.gen();
	if (s.length > 0) {
	    sb += " " + s;
	}
	if (this.limitCount !== undefined) {
	    sb += " limit " + this.limitCount;
	}
	//QUACK(0, "SELECT: " + sb);
	return sb;
    },

    /**
     * @returns {String} string
     */
    toString: function() {
	return "DBI.Mysql.Select";	
    }
};








/**
 * Update
 * @class
 * @param table   Table
 * @param object  Key/value pairs
 */
DBI.Mysql.Update = function(/** DBI.Mysql.Table */table, /** Object */obj) {
    this.table = table;
    this.handle = table.getHandle();
    this.obj = obj;
    this.whereClause = null;
    this.orderClause = null;
};

/** @private */
DBI.Mysql.Update.prototype = {
    /**
     * @type DBI.Mysql.Handle
     * @private
     */
    handle: null,

    /**
     * @returns {DBI.Mysql.Handle}
     */
    getHandle: function() {
	return this.handle;
    },

    /**
     * Execute query.
     * @param cnt
     */
    perform: function(/** Number */cnt, /** DFLT_ASYNC_CB */callback) {
	var s = this.gen();
	return this.handle.query(s, callback);
    },

    /**
     * Returns tables.
     * @returns {DBI.Mysql.Table[]}
     * @private
     */
    getTables: function() {
	return [ this.table ];
    },

    
    /**
     * Return where clause.
     * @returns {DBI.Mysql.WhereClause}
     */
    where: function() {
	assert(!this.whereClause, "where clause already specified");
	this.whereClause = DBI.Mysql.WhereClause.create(this, [ "perform", "order" ], [ this.table ]);
	return this.whereClause;
    },


    /**
     * Return order clause.
     * @returns {DBI.Mysql.OrderClause}
     */
    order: function() {
	assert(!this.orderClause, "order clause already specified");
	this.orderClause = DBI.Mysql.OrderClause.create(this, [ "perform" ], [ this.table ]);
	return this.orderClause;
    },
    
    /**
     * @returns {String} generated query string
     * @private
     */
    gen: function() {
	var sb = "update " + this.table.getName() + " set " + this.tabdle.getSchema().genSetClause(obj);
	if (this.whereClause) {
	    sb += " where " + this.whereClause.gen();
	}	
	if (this.orderClause) {
	    sb += " " + this.orderClause.gen();
	}
	//QUACK(0, "Update: " + sb);
	return sb;
    }
};








/**
 * Delete
 * @class
 * @param table   Table
 */
DBI.Mysql.Delete = function(/** DBI.Mysql.Table */table) {
    this.table = table;
    this.handle = table.getHandle();
    this.whereClause = null;
    this.orderClause = null;
    this.limitCount=undefined;
};

/** @private */
DBI.Mysql.Delete.prototype = {
    /**
     * @type DBI.Mysql.Handle
     * @private
     */
    handle: null,

    /**
     * @returns {DBI.Mysql.Handle}
     */
    getHandle: function() {
	return this.handle;
    },

    /**
     * Execute 
     * @param callback
     */
    perform: function(/** DFLT_ASYNC_CB */callback) {
	var s = this.gen();
	return this.handle.query(s, callback);
    },

    /**
     * Returns tables.
     * @returns {DBI.Mysql.Table[]}
     * @private
     */
    getTables: function() {
	return [ this.table ];
    },

    
    /**
     * Return where clause.
     * @returns {DBI.Mysql.WhereClause}
     */
    where: function() {
	assert(!this.whereClause, "where clause already specified");
	this.whereClause = DBI.Mysql.WhereClause.create(this, [ "perform", "order", "limit" ], [ this.table ]);
	return this.whereClause;
    },


    /**
     * Return order clause.
     * @returns {DBI.Mysql.OrderClause}
     */
    order: function() {
	assert(!this.orderClause, "order clause already specified");
	this.orderClause = DBI.Mysql.OrderClause.create(this, [ "perform", "limit" ], [ this.table ]);
	return this.orderClause;
    },
    
    /**
     * Set select limit.
     * @param limitCount
     */
    limit: function(/** Number */limitCount) {
	this.limitCount = limitCount;
	return this;
    },

    /**
     * @returns {String} generated query string
     * @private
     */
    gen: function() {
	var sb = "delete from " + this.table.getName();
	if (this.whereClause) {
	    sb += " where " + this.whereClause.gen();
	}
	if (this.orderClause) {
	    sb += " " + this.orderClause.gen();
	}
	if (this.limitCount !== undefined) {
	    sb += " limit " + this.limitCount;
	}
	//QUACK(0, "Delete: " + sb);
	return sb;
    }
};







/**
 * Where clause implementation. Examples:
 * <pre>
 * table.select("*").where.i1.gt(0).and.i1.lte(10).perform(1, BLCK);
 * </pre>
 * @class
 */
DBI.Mysql.WhereClause = {};


/**
 * Returns object on which where clause can be formulated.
 * @param parent
 * @param returnFunctions
 * @param returnProperties
 * @returns {Object} 
 */
DBI.Mysql.WhereClause.create = function(/** Object */parent, /** String[] */returnFunctions, /** String[] */returnProperties) {
    var obj = {
	proxy: null,
	parent: parent,
	returnFunctions: returnFunctions,
	returnProperties: returnProperties,
	sb: "",
	table: null,
	field: null,
	/** @private  */
	toString: function() {
	    return this.sb;
	},
	/** @private  */
	get: function(/** String */name) {
	    var returnFunctions = this.returnFunctions;
	    if (returnFunctions.indexOf(name) >= 0) {
		return this.parent[name].bind(this.parent); 
	    }
	    var returnProperties = this.returnProperties;
	    if (returnProperties.indexOf(name) >= 0) {
		return this.parent[name];
	    }

	    switch(name) {
	    case "is":
		return this.op.bind(this, "=");
	    case "gt":
		return this.op.bind(this, ">");
	    case "gte":
		return this.op.bind(this, ">=");
	    case "lt":
		return this.op.bind(this, "<");
	    case "lte":
		return this.op.bind(this, "<=");
	    case "and":
	    case "or": 
		this.sb += " " + name + " ";
		return this.proxy; 
	    case "open":
		this.sb += ' (';
		return this.proxy;
	    case "close": 
		this.sb += ' )';
		return this.proxy;
	    case "in":
	    case "_in":
		return obj._in.bind(obj);
	    case "toString":
	    case "gen":
		return obj[name].bind(obj);
	    }

	    assert(!this.field, "field has already been specified, missing operator");
	    var tables = this.parent.getTables();
	    if (!tables) {
		throw new Exception("No tables have been selected!");
	    }
	    var table = this.table;
	    var field;
	    if (tables.length==1) {
		table = tables[0];
	    }
	    if (table) {
		field = table.getSchema().lookupField(name);
		if (!field) {
		    throw new Exception(sprintf("No such field %s in table %s", name, table.getName()));
		}
		this.field = field;
	    } else {
		for (var i = 0; i < tables.length; i++) {
		    if (tables[i].getName() === name) {
			table = tables[i];
			break;
		    }
		}
		if (!table) {
		    throw new Exception(sprintf("No such table '%s'", name));
		}
		this.table = table;
	    }
	    return this.proxy;
	},
	/** @private  */
	op: function(/** String */op, /** Object */val) {
	    var field = this.field;
	    var table = this.table;
	    assert(field, "no field specified before to compare to");
	    if (table) {
		this.sb += table.getName() + ".";
	    }
	    this.sb += field.name;
	    this.sb += op;
	    this.sb += this.parent.getHandle().quote(field, val);
	    this.field = null;
	    this.table = null;
	    return this.proxy;
	},
	/** @private  */
	_in: function(/** Object[] */arr) {
	    var table = this.table;
	    var field = this.field;
	    assert(field, "no field specified before to compare to");
	    assert(arr.length>0, "empty array parameter");
	    if (table) {
		this.sb += table.getName() + ".";
	    }
	    this.sb += field.name;
	    this.sb += " in (";
	    var sa = [];
	    for (var i = 0; i < arr.length; i++) {
		sa.push(this.parent.getHandle().quote(field, arr[i]));
	    }
	    this.sb += sa.join(",");
	    this.sb += ")";
	    this.field = null;
	    this.table = null;
	    return this.proxy;
	},
	/** @private */
	gen: function() {
	    return this.sb;
	}
    };
    var proxy = Proxy.create({
	get: function(receiver, name) {
	    return obj.get(name);
	},
	set: function(receiver, name, val) {
	    throw new Exception("Operation 'set' unsupported on WhereClause proxy");
	}
    });
    obj.proxy = proxy;
    return proxy;
};




/**
 * Order clause implementation. 
 * @class
 */
DBI.Mysql.OrderClause = {};


/**
 * Returns object on which where clause can be formulated.
 * @param parent 
 * @param returnFunctions
 * @param returnProperties
 * @returns {Object} 
 */
DBI.Mysql.OrderClause.create = function(/** Object */parent, /** String[] */returnFunctions, /** String[] */returnProperties) {
    var obj = {
	proxy: null,
	parent: parent,
	returnFunctions: returnFunctions,
	returnProperties: returnProperties,
	sb: "",
	fields: [],
	ascFlag: null,
	/** @private  */
	toString: function() {
	    return "DBI.Mysql.OrderClause";
	},
	/**  @private  */
	get: function(/** String */name) {
	    var returnFunctions = this.returnFunctions;
	    if (returnFunctions.indexOf(name) >= 0) {
		return this.parent[name].bind(this.parent); 
	    }
	    var returnProperties = this.returnProperties;
	    if (returnProperties.indexOf(name) >= 0) {
		return this.parent[name];
	    }

	    switch(name) {
	    case "asc":
		this.ascFlag = true;
		return this.proxy;
	    case "desc":
		this.ascFlag = false;
		return this.proxy;
	    case "toString":
	    case "gen":
		return obj[name].bind(obj);
	    }
	    var re = /([^\.]+)\.(.+)/;
	    var md = re.exec(name);
	    var tables = this.parent.getTables();
	    var field;
	    if (md) {
		var tn = md[1];
		var fn = md[2];
		var table = this.getHandle().getTable(tn);
		if (!table) {
		    throw "No such table: " + tn;
		}
		field = tables[i].lookupField(fn);
		if (!field) {
		    throw sprintf("No such field %s in table %s", tn, fn);
		}
	    } else {
		if (tables.length == 0) {
		    throw "Missing table to access field: " + name;
		}
		var fields = [];
		for (var i = 0; i < tables.length; i++) {
		    var f = tables[i].getSchema().lookupField(name);
		    if (f) {
			fields.push(f);
		    }
		}
		if (fields.length==0) {
		    throw sprintf("No such field '%s' in specified tables", name);
		}
		if (fields.length>1) {
		    throw sprintf("Multiple fields for specifier '%s' in specified tables", name);
		}
		field = fields[0];
	    }
	    this.fields.push(field);
	    return this.proxy;
	},
	/** @private */
	gen: function() {
	    if (this.fields.length==0) {
		return "";
	    }
	    var sb = "order by " + this.fields.map(function(f) { return f.getName(); }).join(",");
	    if (this.ascFlag !== null) {
		sb += (this.ascFlag?" asc":" desc");
	    }
	    return sb;
	}
    };

    var proxy = Proxy.create({
	get: function(receiver, name) {
	    return obj.get(name);
	},
	set: function(receiver, name, val) {
	    throw new Exception("Operation 'set' unsupported on WhereClause proxy");
	}
    });
    obj.proxy = proxy;
    return proxy;
};







