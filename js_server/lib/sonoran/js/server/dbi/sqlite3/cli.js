//  (C) COPYRIGHT INTERNATIONAL BUSINESS MACHINES CORPORATION 2006-2008
//                       ALL RIGHTS RESERVED
//        IBM Research Division, Zurich Research Laboratory
// --------------------------------------------------------------------


/**
 * @namespace DBI.Sqlite3.Commands
 * @private
 */
DBI.Sqlite3.Commands = { 
    /**
     * @type DBI.Sqlite3.Handle
     * @private
     */
    handle: null,


    /**
     * @returns DBI.Sqlite3.Handle
     */
    getHandle: function() {
	return this.handle;
    },


    /**
     * @param handle
     */
    setHandle: function(/** DBI.Sqlite3.Handle */handle) {
	this.handle = handle;;
    }
};


/**
 * @namespace DBI.Sqlite3.Commands.Sqlite3
 * @private
 */
DBI.Sqlite3.Commands.Sqlite3 = {};




/**
 * @class 
 * @constructor
 * @private
 */
DBI.Sqlite3.Commands.Sqlite3.OpenCommand = function(shell, name) {
    this.description = "Open sqlite3 database.";
    this.filenameSpec = new GetOpt.Simple("filename", "Location of database.");
    CLI.Command.call(this, shell, name, [ this.filenameSpec, new GetOpt.EndOfArgs() ]);
};

/** @private */
DBI.Sqlite3.Commands.Sqlite3.OpenCommand.prototype = extend(
    CLI.Command.prototype,
    {
        /** @private */
        exec: function(callback) {
	    if (DBI.Sqlite3.Commands.getHandle()) {
		throw new Exception("SQL connection already open!");
	    }
	    var filename = this.filenameSpec.getArg();
	    var result = DBI.Sqlite3.open(filename, DBI.Sqlite3.SQLITE_OPEN_READWRITE | DBI.Sqlite3.SQLITE_OPEN_CREATE, null, SCB);
	    if (result.code !== 0) {
		callback(result);
	    } else {
		DBI.Sqlite3.Commands.setHandle(result.getData());
		callback(new AOP.OK());
	    }
	}
    }
);

/**
 * @class 
 * @constructor
 * @private
 */
DBI.Sqlite3.Commands.Sqlite3.CloseCommand = function(shell, name) {
    this.description = "Closesqlite3 database.";
    CLI.Command.call(this, shell, name, [ new GetOpt.EndOfArgs() ]);
};

/** @private */
DBI.Sqlite3.Commands.Sqlite3.CloseCommand.prototype = extend(
    CLI.Command.prototype,
    {
        /** @private */
        exec: function(callback) {
	    var handle = DBI.Sqlite3.Commands.getHandle();
	    if (handle) {
		DBI.Sqlite3.Commands.setHandle(null);
		handle.close(BLCK);
	    }
	    callback(new AOP.OK());
	}
    }
);

/**
 * @class 
 * @constructor
 * @private
 */
DBI.Sqlite3.Commands.Sqlite3.ExecCommand = function(shell, name) {
    this.description = "Execute sql command and fetch all rows.";
    this.roa = new GetOpt.RestOfArgs("query", "The sql query.");
    CLI.Command.call(this, shell, name, [ this.roa ]);
};

/** @private */
DBI.Sqlite3.Commands.Sqlite3.ExecCommand.prototype = extend(
    CLI.Command.prototype,
    {
        /** @private */
        exec: function(callback) {
	    var handle = DBI.Sqlite3.Commands.getHandle();
	    if (!handle) {
		throw new Exception("No open SQL connection!");
	    }
	    var s = this.roa.getRestArgs().join(" ");
	    var statement = handle.prepare(s, BLCK);
	    var rows = statement.fetchManyRows(-1, BLCK);
	    statement.finalize(BLCK);
	    callback(new AOP.OK(rows.toString()));
	}
    }
);



/**
 * @class 
 * @constructor
 * @private
 */
DBI.Sqlite3.Commands.Sqlite3.ListCommand = function(shell, name) {
    this.description = 
	"'sqlite3-list databases' lists all databases.\n" +
	"'sqlite3-list database \"dbname\"' lists all tables of database 'dbname'.\n" +
	"'sqlite3-list table \"tname\"' prints info about table 'tname'.\n";
    this.modeSpec = new GetOpt.Keywords("keyword", "databases, database or table", [ "databases", "database", "table" ]);
    this.roa = new GetOpt.RestOfArgs("para", "Parameter for 'tables' and 'table'.");
    CLI.Command.call(this, shell, name, [ this.modeSpec, this.roa ]);
};

/** @private */
DBI.Sqlite3.Commands.Sqlite3.ListCommand.prototype = extend(
    CLI.Command.prototype,
    {
        /** @private */
        exec: function(callback) {
	    var handle = DBI.Sqlite3.Commands.getHandle();
	    if (!handle) {
		throw new Exception("No open SQL connection!");
	    }
	    var objs;
	    switch(this.modeSpec.getSelectedKeywordIndex()) {
	    case 0: {
		objs = handle.listDatabases();
		break;
	    }
	    case 1: {
		var roa = this.roa.getRestArgs();
		if (roa.length===0) {
		    roa = [ "main" ];
		}
		if (roa.length === 1) {
		    objs = handle.listTables(roa[0]);
		} else {
		    objs = roa.map(function(r) { return handle.listTables(r); });
		}
		break;
	    }
	    case 2: {
		var roa = this.roa.getRestArgs();
		if (roa.length===0) {
		    throw new Exception("Missing table specifier.");
		}
		if (roa.length === 1) {
		    objs = handle.getTableInfo(roa[0]);
		} else {
		    objs = roa.map(function(r) { return handle.getTableInfo(r); });
		}
		break;
	    }
	    default:
		assert(false);
	    }
	    callback(new AOP.OK(Util.formatData(objs)));
	}
    }
);




CLI.commandFactory.addModule("DBI.Sqlite3.Commands.Sqlite3");
