//  (C) COPYRIGHT INTERNATIONAL BUSINESS MACHINES CORPORATION 2006-2008
//                       ALL RIGHTS RESERVED
//        IBM Research Division, Zurich Research Laboratory
// --------------------------------------------------------------------



Class.define(
    "DBI.Sqlite3.Rows",
    /**
     * @lends DBI.Sqlite3.Rows.prototype
     */
    {
	/**
	 * Keeps type and values of a number of fetched rows.
	 * @constructs
	 * @param columns  Column type information
	 * @param rows  Array of row values, each row value is an aray of column values
	 */
	__constr__: function(/** Object[] */columns, /** Array[] */rows) {
	    this.columns = columns;
	    this.rows = rows;
	},
	
	/**
	 * @type Object[]
	 * @private
	 */
	columns: null,

	/**
	 * @type Array[]
	 * @private
	 */
	rows: null,

	/**
	 * Return number of rows.
	 * @returns {Number}
	 */
	getRowCnt: function() {
	    return this.rows.length;
	},

	/**
	 * Return number of columns.
	 * @returns {Number}
	 */
	getColumnCnt: function() {
	    return this.columns.length;
	},

	/**
	 * Return column information. Each element contains column type, name of column, name of originating table and
	 * name of database.
	 * @returns {Array}
	 */
	getColumns: function() {
	    return this.columns;
	},


	/**
	 * Returs array of array of column values.
	 * @returns {Object[]}
	 */
	getRows: function() {
	    return this.rows;
	},

	/**
	 * @param withTableNames  Return table name of column in header
	 * @returns {String}
	 */
	toString: function(/** Boolean */withTableNames) {
	    if (this.rows.length === 0) {
		return "";
	    }
	    var columns = this.columns;
	    var t = new Util.Formatter.Table2(columns.length);
	    var sa = [];
	    for (var i = 0; i < columns.length; i++) {
		var c = columns[i];
		if (withTableNames) {
		    sa.push(sprintf("%s%s", c.table ? c.table+":" : "", c.column ? c.column+":" : ""));    
		} else {
		    sa.push(c.column ? c.column+":" : "");
		}
	    }
	    t.setTitle(sa);
	    var y = 0;
	    for (var x = 0; x < columns.length; x++) {
		t.setValue(x, y, DBI.Sqlite3.columnType2Str(columns[x].type));
	    }
	    var rows = this.rows;
	    for (y = 0; y < rows.length; y++) {
		var row = rows[y];
		for (var x = 0; x < row.length; x++) {
		    var cell = row[x];
		    var s = (cell!=null) ? cell.toString() : "null";
		    t.setValue(x, y + 1, s);
		}
	    }
	    return t.render().join("\n");
	}
    }
);


