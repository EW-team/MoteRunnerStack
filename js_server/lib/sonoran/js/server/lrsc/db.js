//  (C) COPYRIGHT INTERNATIONAL BUSINESS MACHINES CORPORATION 2013-2013
//                       ALL RIGHTS RESERVED
//        IBM Research Division, Zurich Research Laboratory
// --------------------------------------------------------------------




/**
 * @class
 * @static
 * @private
 */
LRSC.DB = {
    /**
     * @type String
     * @private
     */
    tableName: "frames",

    /**
     * @type Array
     * @private
     */
    tableColumns: [
	[ "gwid", "int" ], 
	[ "freq", "int" ], 
	[ "bw", "int" ],
	[ "sf", "int" ],
	[ "cr", "int" ],
	[ "txend", "int" ],
	[ "rssi", "float" ],
	[ "snr", "float" ],	
	[ "data",  "text" ]
    ],

    /**
     * @type DBI.Sqlite3
     * @private
     */
    db: null,

    /**
     * @type LRSC.NwkServer
     * @private
     */
    nwksrv: null,

    /**
     * @type Function
     * @private
     */
    listener: null,


    /**
     * @param nwksrv
     * @param filename Sqlite3 database filename or null
     * @private
     */
    start: function(/** LRSC.NwkServer */nwksrv, /** String */filename) {
	this.nwksrv = nwksrv;
	this.listener = this.onLoraFrame.bind(this);
	nwksrv.addFrameListener(this.listener);

	if (!filename) {
	    filename = "./lora-frames-" + (new Date()).toISOString() + ".sql";
	}
	var sql3 = DBI.Sqlite3;
	//QUACK(0, "FILENAME: " + filename);
	this.db = sql3.open(filename, sql3.SQLITE_OPEN_READWRITE|sql3.SQLITE_OPEN_CREATE, null, BLCK);
	var ret = this.db.exec(sprintf("drop table if exists %s", this.tableName), BLCK);
	assert(ret == null);
	var s = this.tableColumns.map(function(c) { return c.join(" "); }).join(",");
	ret = this.db.exec(sprintf("create table %s (%s)", this.tableName, s), BLCK);
	assert(ret === null);
    },


    /**
     * @private
     */
    stop: function() {
	this.nwksrv.removePacketListener(this.listener);
	this.db.close(BLCK);
    },


    /**
     * @private
     */
    onLoraFrame: function(/** Object */frame, /** Object */gwConn) {
	var names = [];
	var values = [];
	for (var i = 0; i < this.tableColumns.length; i++) {
	    var c = this.tableColumns[i];
	    var cn = c[0];
	    var ct = c[1];
	    names.push(cn);
	    if (ct == "int") {
		values.push(frame[cn].toString());
	    } else if (ct == "float") {
		values.push(frame[cn].toFixed(2).toString());
	    } else {
		assert(ct == "text");
		values.push("'" + Formatter.binToHex(frame[cn]) + "'");
	    }
	}
	var s = sprintf("insert into %s (%s) VALUES (%s)", this.tableName, names.join(", "), values.join(","));
	//QUACK(0, s);
	var ret = this.db.exec(s, BLCK);
	assert(ret === null);
    }
};





