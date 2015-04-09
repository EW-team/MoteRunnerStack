//  (C) COPYRIGHT INTERNATIONAL BUSINESS MACHINES CORPORATION 2006-2010
//                       ALL RIGHTS RESERVED
//        IBM Research Division, Zurich Research Laboratory
// --------------------------------------------------------------------

/**
 * Implements the sonoran command line interface.
 * @namespace Sonoran.CLI 
 */
Sonoran.CLI = {};




/**
 * Helper function. Format addresses by stripping localhost from standard sag and udp addresses.
 * @param addresses
 * @returns {String[]} address strings
 * @private
 */
Sonoran.CLI.formatAddresses = function(/** String[] */addresses) {
    var sagre = new RegExp("sag://"+Saguaro.DFLT_HOST+":");
    var udpre = new RegExp("udp://"+Saguaro.DFLT_HOST+":");
    var ret = [];
    for (var i = 0; i < addresses.length; i++) {
        var s = addresses[i];
        s = s.replace(sagre, "sag:/");
        s = s.replace(udpre, "udp:/");
        ret.push(s);
    }
    return ret;
};



/**
 * This namespace is scanned by the shell to find all available commands. Any function in this
 * namespace or sub-namespaces and whose names end in 'Command' are expected to implement
 * a shell command and be subclasses of Sonoran.CLI.Command.
 * @namespace Sonoran.CLI.Commands
 * @private
 */
Sonoran.CLI.Commands = {};





//---------------------------------------------------------------------------------------------------------------
//
// Sonoran.CLI.Abbreviations
//
//---------------------------------------------------------------------------------------------------------------

/**
 * @class
 * @private
 */
Sonoran.CLI.Abbreviations = {
    /**
     * @private
     */
    CONN_ABBREVS: [ 'a', 'b', 'c', 'd', 'e', 'f' ],

    /**
     * @private
     */
    GATEWAY_ABBREVS: [ 'w', 'x', 'y', 'z', 'm', 'n', 'o', 'p'  ],

    /**
     * @private
     */
    LIP_ABBREV: 'l',

    /**
     * @private
     */
    UDP_ABBREV: 'u',

    /**
     * Map of abbreviation to saguaro connection.
     * @private
     */
    abbrev2conn: null,

    /**
     * Map of saguaro connection (its toString representation) to abbrev.
     * @private
     */
    conn2abbrev: null,

    /**
     * Map of abbreviation to mote uniqueid.
     * @private
     */
    abbrev2uniqueid: null,

    /**
     * Map of uniqueid to fixed abbreviation (over the lifetime of the mote).
     * @private
     */
    uniqueid2fabbrev: null,

    /**
     * Map of uniqueid to  abbreviation for wireless/gateway mote.
     * @private
     */
    uniqueid2wabbrev: null,

    /**
     * @private
     */
    listener: null,

    
    /**
     * Init abbreviations class.
     * @private
     */
    init: function() {
        assert(!this.abbrev2object);
        this.abbrev2conn = {};
        this.conn2abbrev  = {};
        this.abbrev2uniqueid = {};
        this.uniqueid2fabbrev = {};
        this.uniqueid2wabbrev = {};

        this.listener = Sonoran.Registry.addObserver(this.onEvent.bind(this));
    },

    
    /**
     * @private
     */
    isPossibleMoteAbbrev: function(arg) {
        return (/^([a-fA-F])(\d+)$/.test(arg) || /^([w-zW-Zm-pM-P])(\d+)$/.test(arg) || /^u(\d+)$/.test(arg) || /^l(\d+)$/.test(arg));
    },


    /**
     * @private
     */
    isPossibleConnectionAbbrev: function(arg) {
        return (arg.length==1 && /[a-fA-F]/.test(arg));
    },

    
    /**
     * Return connection referenced by an abbreviation
     * @returns {Object} connection or null
     * @private
     */
    resolveConnection: function(/** String */abbrev) {
        return this.abbrev2conn[abbrev];
    },


    /**
     * Return mote referenced by an abbreviation
     * @returns {Object} mote  or null
     * @private
     */
    resolveMote: function(/** String */abbrev) {
        var uniqueid = this.abbrev2uniqueid[abbrev];
        if (uniqueid) {
            return Sonoran.Registry.lookupMoteByUniqueid(uniqueid);
        }
        return null;
    },


    /**
     * Resolve an abbreviation. Throws an exception if the abbrev is formatted like a proper abbrevation, but it cannot
     * resolved to a connection or mote. 
     * @param conns        If a connection is resolved, it is added to this array
     * @param motes        If a motes  resolved, they are  pushed on  this array
     * @returns {Object} object (with properties conn and motes) or null if not a valid abbrev
     * @private
     */
    resolveAbbrev: function(/** String abbrev */abbrev, /** Array */conns, /** Array */motes) {
        var _conn = null;
        var _motes = [];
	var arr;
	if (/[0-9a-fA-F]{16}/.test(abbrev)) {
            var uniqueid = Util.UUID.hex2eui64(abbrev);
            var mote = Sonoran.Registry.lookupMoteByUniqueid(uniqueid);
	    if (!mote) {
                throw "Cannot find mote with uniqueid: " + uniqueid;
	    }
	    _motes.push(mote);
        } else if (Util.UUID.EUI64_REGEX.test(abbrev)) {
            var mote = Sonoran.Registry.lookupMoteByUniqueid(abbrev);
	    if (!mote) {
               throw "Cannot find mote with uniqueid: " + abbrev;
	    }
	    _motes.push(mote);
	} else if (abbrev.charAt(0) == '-') {
	    var eui = abbrev.toUpperCase();
	    var re = new RegExp(eui+"$");
	    var arr = Sonoran.Registry.lookupMotesByFunc(function(mote) { return re.test(mote.getUniqueid()); });
	    if (arr.length>1) {
	        var txt = "EUI ambiguous, matching motes are:\n";
	        for (var i = 0; i < arr.length; i++) {
		    txt += arr[i].getUniqueid() + "\n";
	        }
	        throw txt;
	    } else if (arr.length==1) {
	        _motes.push(arr[0]);
	    } else {
                throw "Cannot find mote with abbreviation: " + abbrev;
            }
	} else if (Sonoran.CLI.Abbreviations.isPossibleMoteAbbrev(abbrev)) {
            var mote = Sonoran.CLI.Abbreviations.resolveMote(abbrev);
            if (!mote) {
                throw "No such registered mote: " + abbrev;
            }
            _motes.push(mote);
        } else if  (Sonoran.CLI.Abbreviations.isPossibleConnectionAbbrev(abbrev)) {
            var conn = Sonoran.CLI.Abbreviations.resolveConnection(abbrev);
	    if (!conn) {
                throw "No such saguaro connection: " + abbrev;
            }
	    _conn = conn;
	} else if ((arr = Sonoran.Registry.lookupMotesByFunc(function(mote) { return mote.getName()===abbrev; })).length > 0) {
	    _motes = _motes.concat(arr);
	} else {
	    var matches = /^([a-fA-F])?(\d+)(-(\d+))?$/.exec(abbrev);
	    if (!matches) {
                // 'abbrev' is not an abbreviation
                return null;
            }
	    var conn = null;
	    if (matches[1]) {
                conn = Sonoran.CLI.Abbreviations.resolveConnection(matches[1]);
	        if (!conn) {
                    throw "No such saguaro connection: " + matches[1];
                }
	    } else {
		conn = Saguaro.Connection.getConnection();
	        if (!conn) {
                    throw "No active saguaro connection!";
                }
	    }
	    if (matches[4]) {
	        var start = parseInt(matches[2]);
                var end = parseInt(matches[4]);
	        for (var i = start; i <= end; i++) {
		    var mote = Sonoran.Registry.lookupMoteByFunc(function(m) {
                        return m.getClass() == 'saguaro' && m.getConnection() == conn && Saguaro.mote2impl(m).getMoteId() == i;
                    });
		    if (!mote) {
		        throw sprintf("No mote with mote id '%d' on saguaro '%s'", i, conn);
		    }
		    _motes.push(mote);
	        }
	    } else {
	        var i = parseInt(matches[2]);
	        var mote = Sonoran.Registry.lookupMoteByFunc(function(m) {
                    return m.getClass() == 'saguaro' && m.getConnection() == conn && Saguaro.mote2impl(m).getMoteId() == i;
                });
	        if (!mote) {
                    throw sprintf("No mote with mote id '%d' on saguaro '%s'", i, conn);
	        }
	        _motes.push(mote);
	    }
	}
        assert(_conn||_motes.length>0);
        var ret = {
            conn: _conn,
            motes: _motes
        };
        if (conns && _conn) {
            conns.push(_conn);
        }
        if (motes && _motes.length>0) {
            _motes.forEach(function(m) { motes.push(m); });
        }
        return ret;
    },
    

    /**
     * Returns abbreviation for a connection.
     * @returns {String} 
     * @private
     */
    getAbbrev4Conn: function(/** Object */conn) {
        return this.conn2abbrev[conn.toString()];
    },


    /**
     * Returns abbreviations for a mote.
     * @param includeUniqueid    Exclude the unique id of the mote as a valid abbreviation
     * @returns {String[]} 
     * @private
     */
    getAbbrevs4Mote: function(/** Object */mote, /** Boolean */excludeUniqueid) {
        var uniqueid = mote.getUniqueid();
        var abbrevs = [];
        var fabbrev = this.uniqueid2fabbrev[uniqueid];
        if (fabbrev && this.abbrev2uniqueid[fabbrev] == uniqueid) {
            abbrevs.push(fabbrev);
        }
        var wabbrev = this.uniqueid2wabbrev[uniqueid];
        if (wabbrev && this.abbrev2uniqueid[wabbrev] == uniqueid) {
            abbrevs.push(wabbrev);
        }
        if (!excludeUniqueid) {
            abbrevs.push(uniqueid);
        }
        return abbrevs;
    },

    
    /**
     * Sonoran registry event listener.
     * @private
     */
    onEvent: function(ev) {
	switch(ev.category) {
	case Sonoran.EV_CAT_SAGUARO: {
	    switch(ev.evname) {
	    case Sonoran.EV_NAME_CONNECT: {
		var conn = ev.conn;
		//QUACK(0, "CLI: SAGUARO CONNECT " + conn);
		var key = conn.toString();
		assert(!this.conn2abbrev[key]);
		for (var i = 0; i < this.CONN_ABBREVS.length; i++) {
                    var abbrev = this.CONN_ABBREVS[i];
                    if (!this.abbrev2conn[abbrev]) {
			this.abbrev2conn[abbrev] = conn;
			this.conn2abbrev[key] = abbrev;
			return false;
                    }
		}
		QUACK(0, "No free abbreviation for saguaro connection available: " + conn);
		Runtime.exit(0);
		break;
	    }
	    case Sonoran.EV_NAME_DISCONNECT: {
		var conn = ev.conn;
		//QUACK(0, "CLI: SAGUARO DISCONNECT " + conn);
		var key = conn.toString();
		var abbrev = this.conn2abbrev[key];
		if (abbrev) {
		    var obj = this.abbrev2conn[abbrev];
		    assert(conn == obj);
		    delete this.abbrev2conn[abbrev];
		    delete this.conn2abbrev[key];
		    //QUACK(0, sprintf("ABBREV: deleted abbrev %s for %s", abbrev, conn));
		}
		break;
	    }
	    }
	    break;
	}
	case Sonoran.EV_CAT_MOTE: {
	    switch(ev.evname) {
	    case Sonoran.EV_NAME_REGISTER: {
		var uid = ev.getUid();
		var mote = Sonoran.Registry.lookupMoteByUid(uid);
		if (!mote) {
		    return;
		}
		//assert(mote);
		var clazz = mote.getClass();
		var abbrev;
		if (clazz == 'saguaro') {
		    var conn = mote.getConnection();
                    abbrev = this.conn2abbrev[conn.toString()];
                    assert(abbrev);
                    abbrev = abbrev + Saguaro.mote2impl(mote).moteid.toString();
		} else if (clazz == 'lip') {
                    abbrev = this.findMoteAbbrev(this.LIP_ABBREV);
		} else if (clazz == 'udp') {
                    abbrev = this.findMoteAbbrev(this.UDP_ABBREV);
		} else {
                    //QUACK(0, sprintf("ABBREV: skip abbrev for mote class", clazz));
                    break;
		}
		var uniqueid = mote.getUniqueid();
		this.abbrev2uniqueid[abbrev] = uniqueid;
		this.uniqueid2fabbrev[uniqueid] = abbrev;
		//QUACK(0, sprintf("ABBREV: new abbrev %s for %s", abbrev, uniqueid));
		//QUACK(0, this.toString());
		break;
            }
            case Sonoran.EV_NAME_DEREGISTER: {
		var mote = ev.getMote();
		var uniqueid = mote.getUniqueid();
		var abbrev = this.uniqueid2fabbrev[uniqueid];
		if (abbrev) {
                    delete this.abbrev2uniqueid[abbrev];
                    delete this.uniqueid2fabbrev[uniqueid];
		}
		//QUACK(0, sprintf("ABBREV: deleted abbrev %s for %s", abbrev, uniqueid));
		//QUACK(0, this.toString());
		break;
            }
	    case Sonoran.EV_NAME_UNIQUEID: {
              var o_eui = ev.o_eui;
              var n_eui = ev.n_eui;
              var abbrev;
              abbrev = this.uniqueid2wabbrev[o_eui];
              if (abbrev) {
                  delete this.uniqueid2wabbrev[o_eui];
                  this.uniqueid2wabbrev[n_eui] = abbrev;
                  if (this.abbrev2uniqueid[abbrev]) {
                      this.abbrev2uniqueid[abbrev] = n_eui;
                  }
              }
              abbrev = this.uniqueid2fabbrev[o_eui];
              if (abbrev) {
                  delete this.uniqueid2fabbrev[o_eui];
                  this.uniqueid2fabbrev[n_eui] = abbrev;
                  if (this.abbrev2uniqueid[abbrev]) {
                      this.abbrev2uniqueid[abbrev] = n_eui;
                  }
              }
              //QUACK(0, sprintf("ABBREV: uniqueid changed: %s -> %s", o_eui, n_eui));
              //QUACK(0, this.toString());
              break;
	    }
	    }
	    break;
	}
	case Sonoran.EV_CAT_GATEWAY: {
	    switch(ev.evname) {
	    case Sonoran.EV_NAME_REGISTER: {
                var uniqueid = ev.getGatewayUniqueid();
                // can we take a cached value for this gateway?
                var wabbrev = this.uniqueid2wabbrev[uniqueid];
                if (wabbrev) {
                    if (!this.abbrev2uniqueid[wabbrev]) {
                        this.abbrev2uniqueid[wabbrev] = uniqueid;
                        //QUACK(0, sprintf("ABBREV: cached abbrev %s for %s", wabbrev, uniqueid));
                        //QUACK(0, this.toString());
                        return false;
                    } //else {
                    //delete this.abbrev2uniqueid[wabbrev];
                    //}
                }
                for (var i = 0; i < this.GATEWAY_ABBREVS.length; i++) {
                    wabbrev = this.GATEWAY_ABBREVS[i] + '0';
                    if (!this.abbrev2uniqueid[wabbrev]) {
                        this.abbrev2uniqueid[wabbrev] = uniqueid;
                        this.uniqueid2wabbrev[uniqueid] = wabbrev;
                        //QUACK(0, sprintf("ABBREV: new abbrev %s for %s", wabbrev, uniqueid));
                        //QUACK(0, this.toString());
                        return false;
                    }
                }
                QUACK(0, "No free abbreviation for gateway  available: " + uniqueid);
                Runtime.exit(0);
		break;
	    }
	    case Sonoran.EV_NAME_DEREGISTER: {
                var uniqueid = ev.getGatewayUniqueid();
                var wabbrev = this.uniqueid2wabbrev[uniqueid];
                if (wabbrev) {
                    var c = wabbrev.charAt(0);
                    for (abbrev in this.abbrev2uniqueid) {
                        if (abbrev.charAt(0) == c) {
                            delete this.abbrev2uniqueid[abbrev];
                        }
                    }
                    //QUACK(0, sprintf("ABBREV: removed abbrev %s for %s", wabbrev, uniqueid));
                    //QUACK(0, this.toString());
                }
		break;
	    }
	    case Sonoran.EV_NAME_HELLO: {
                var gwuuid = ev.getGatewayUniqueid();
                var wluuid = ev.getWirelessUniqueid();
                // can we take a cached value for this wireless mote?
                var gwabbrev = this.uniqueid2wabbrev[gwuuid];
                assert(gwabbrev);
                var wabbrev = this.uniqueid2wabbrev[wluuid];
                if (wabbrev) {
                    if (this.abbrev2uniqueid[wabbrev] == wluuid) {
                        //QUACK(0, sprintf("ABBREV: known abbrev %s for %s", wabbrev, wluuid));
                        return false;
                    } 
                    if ((gwabbrev[0] == wabbrev[0]) && (!this.abbrev2uniqueid[wabbrev])) {
                        this.abbrev2uniqueid[wabbrev] = wluuid;
                        //QUACK(0, sprintf("ABBREV: cached abbrev %s for %s", wabbrev, wluuid));
                        //QUACK(0, this.toString());
                        return false;
                    } 
                    //delete this.abbrev2uniqueid[wabbrev];
                }
                wabbrev = this.findMoteAbbrev(gwabbrev.charAt(0));
                this.abbrev2uniqueid[wabbrev] = wluuid;
                this.uniqueid2wabbrev[wluuid] = wabbrev;
                //QUACK(0, sprintf("ABBREV: new abbrev %s for %s", wabbrev, wluuid));
                //QUACK(0, this.toString());
		break;
            }
	    case Sonoran.EV_NAME_BYE: {
                var gwuuid = ev.getGatewayUniqueid();
                var wluuid = ev.getWirelessUniqueid();
                var wabbrev = this.uniqueid2wabbrev[wluuid];
                if (wabbrev) {
                    delete this.abbrev2uniqueid[wabbrev];
                    //QUACK(0, sprintf("ABBREV: delete abbrev %s for %s", wabbrev, wluuid));
                    //QUACK(0, this.toString());
                }
		break;
	    }
	 
	    }
	}
	}
        return false;
    },


    /**
     * Check x0 to xn until a free abbreviation is found.
     * @private
     */
    findMoteAbbrev: function(c0) {
        var id = 0;
        while(true) {
            var s = c0 + id.toString();
            if (!this.abbrev2uniqueid[s]) {
                return s;
            }
            id += 1;
        }
    },

    
    /**
     * @private
     */
    toString: function() {
        var t = new Formatter.Table2(2);
	t.setTitle("Key", "Value");
        var abbrev, conn, uniqueid, y = 0;
        for (abbrev in this.abbrev2conn) {
	    t.setValue(0, y, abbrev);
	    t.setValue(1, y, this.abbrev2conn[abbrev].toString());
	    y += 1;
        }
        for (abbrev in this.abbrev2uniqueid) {
	    t.setValue(0, y, abbrev);
	    t.setValue(1, y, this.abbrev2uniqueid[abbrev]);
	    y += 1;
        }
        for (conn in this.conn2abbrev) {
	    t.setValue(0, y, conn);
	    t.setValue(1, y, this.conn2abbrev[conn]);
	    y += 1;
        }
        for (uniqueid in this.uniqueid2fabbrev) {
	    t.setValue(0, y, uniqueid);
	    t.setValue(1, y, this.uniqueid2fabbrev[uniqueid]);
	    y += 1;
        }
        for (uniqueid in this.uniqueid2wabbrev) {
	    t.setValue(0, y, uniqueid);
	    t.setValue(1, y, this.uniqueid2wabbrev[uniqueid]);
	    y += 1;
        }
        return t.render().join("\n");
    }
};


Sonoran.CLI.Abbreviations.init();







//---------------------------------------------------------------------------------------------------------------
//
// Sonoran.CLI.Spec
//
//---------------------------------------------------------------------------------------------------------------

/**
 * Sonoran.CLI.Spec encapsulates a command which requires and parses mote abbreviations,
 * motes of certain class, checks for assembly installations etc.
 * @class 
 * @augments CLI.Spec
 * @constructor
 * @param command           Name of command
 * @param type              Sonoran.CLI.DST_NONE...
 * @param moteClazzes       Array of mote classes, such as [ "saguaro" ]
 * @param asmIdentity       Identity of assembly having been installed on mote
 */
Sonoran.CLI.Spec = function(/** String */command, /** Number */type, /** String[] */moteClazzes, /** String */asmIdentity) {
    assert(!command||typeof(command)==='string');
    assert(arguments.length<=4, "API change");
    assert(!asmIdentity||typeof(asmIdentity)==='string');
    var mnemo = "abbrev";
    var description = "a0 ...";
    CLI.Spec.call(this, mnemo, description);
    this.command = command||"command";
    this.type = type;
    if (!this.type) {
	this.type = Sonoran.CLI.DST_NONE;
    }
    this.moteClazzes = moteClazzes;
    this.asmName = asmIdentity ? new Sonoran.AsmName(asmIdentity) : undefined;
    this.listedMotes = [];
    this.listedConnections = [];
    this.mote = null;
    this.motes = null;
    this.connection = null;
    this.connections = null;
};


/**
 * Command does not take any target mote or connection.
 * @type Number
 */
Sonoran.CLI.DST_NONE = 0;

/**
 * Command expects a single mote.
 * @type Number
 */
Sonoran.CLI.DST_ONE_MOTE = 1;

/**
 * Command expects at least one mote.
 * @type Number
 */
Sonoran.CLI.DST_MANY_MOTES = 2;


/**
 * Command expects a single connection.
 * @type Number
 */
Sonoran.CLI.DST_ONE_CONN = 3;

/**
 * 'conn' property is set for command, but might be null.
 * @type Number
 */
Sonoran.CLI.DST_ZERO_OR_ONE_CONN = 4;

/**
 * Command takes zero, one or even more motes.
 * @type Number
 */
Sonoran.CLI.DST_ANY_MOTE = 5;

/**
 * Command takes zero, one or even more motes or connections.
 * @type Number
 */
Sonoran.CLI.DST_ANY_MOTE_OR_CONN = 6;


/** Prototype */
Sonoran.CLI.Spec.prototype = extend(
    CLI.Spec.prototype,
   /** @lends Sonoran.CLI.Spec.prototype */
    {
	/**
	 * @returns {Sonoran.Mote} parsed mote 
	 */
	getMote: function() {
	    return this.mote;
	},

	/**
	 * @returns {Sonoran.Mote[]} parsed motes 
	 */
	getMotes: function() {
	    return this.motes;
	},

	/**
	 * @returns {Saguaro.Connection} parsed connection 
	 */
	getConnection: function() {
	    return this.connection;
	},

	/**
	 * @returns {Sonoran.Connection} parsed connections 
	 */
	getConnections: function() {
	    return this.connections;
	},


	/**
	 * A Spec must parse its parameters here and return EXACT_MATCH etc.
	 * @param env
	 * @returns {Number} GetOpt.EXACT etc.
	 */
	parse: function(/** GetOpt.Env */env) { 
	    this.listedMotes = [];
	    this.listedConnections = [];
	    this.mote = null;
	    this.motes = null;
	    this.connection = null;
	    this.connections = null;

	    var arg;
	    while(env.moreConsumableArgs(true)) {
		arg = env.currArg();
		var ret = Sonoran.CLI.Abbreviations.resolveAbbrev(arg, this.listedConnections, this.listedMotes);
		if (!ret) {
		    break;
		} else {
		    env.consumeArg();
		}
	    }
	    //var m = GetOpt.abbrevMatch(GetOpt.IGNORE_CASE, '-', this.command, arg);
	    //if (m.match === GetOpt.NOMATCH) {
	    //	throw "Expected command: " + this.command;
	    //}
	    // also consume the abbreviated command name 
	    env.consumeArg();
	    this.checkAll();
	    return GetOpt.EXACT;	    
	},

	/**
	 * @returns {Object} state of this Spec.
	 */
	getState: function(/** GetOpt.Env */env) { 
	    return;
	},

	/**
	 * Set state of this Spec.
	 * @param state
	 */
	setState: function(/** Object */state) { 
	    return;
	},

	/**
	 * @returns {String} command name
	 */
	getCommand: function() {
	    return this.command;
	},

	/**
	 * @param command
	 */
	setCommand: function(/** String */command) { 
	    this.command = command;
	},
	
	/**
	 * A Spec tests current args in environment for applying and returns EXACT_MATCH etc.
	 * @param env
	 * @returns {Number} GetOpt.EXACT etc.
	 */
	test: function(/** GetOpt.Env */env) { 
	    return env.moreConsumableArgs(0);
	},

	/**
	 * Print this Spec and its expected parameters etc.
	 */
	print: function(/** GetOpt.Env */env, /** Number */mode) { 
	    var pb = env.pb;
	    var type = this.type;
	    if (mode == GetOpt.PrintMode.MNEMO) {
		switch(type) {
		case Sonoran.CLI.DST_NONE: {
		    pb.insert(this.command);
		    break;
		}
		case Sonoran.CLI.DST_ONE_MOTE: {
		    pb.insert("mote-abbrev* " + this.command);
		    break;
		}
		case Sonoran.CLI.DST_MANY_MOTES: {
		    pb.insert("mote-abbrev* " + this.command);
		    break;
		}		
		case Sonoran.CLI.DST_ONE_CONN: {
		    pb.insert("conn-abbrev* " + this.command);
		    break;
		}
		case Sonoran.CLI.DST_ZERO_OR_ONE_CONN: {
		    pb.insert("conn-abbrev* " + this.command);
		    break;
		}
		case Sonoran.CLI.DST_ANY_MOTE: {
		    pb.insert("mote-abbrev* " + this.command);
		    break;
		}
		case Sonoran.CLI.DST_ANY_MOTE_OR_CONN: {
		    pb.insert("(mote-abbrev||conn-abbrev)* " + this.command);
		    break;
		}
		}
		return 0;
	    }	    
	    if (mode == GetOpt.PrintMode.SHORT) {
		pb.insertSoftSpace();
		this.print(env, GetOpt.PrintMode.MNEMO);
		return 0;
	    }
	    if (mode == GetOpt.PrintMode.DETAILS) {
		var mnemo, descr;
		switch(type) {
		case Sonoran.CLI.DST_ONE_MOTE: {
		    mnemo = "mote-abbrev?";
		    descr = "A single mote abbreviation or guessed by shell.";
		    break;
		}
		case Sonoran.CLI.DST_MANY_MOTES: {
		    mnemo = "mote-abbrev*";
		    descr = "One or more mote abbreviations or guessed by shell.";
		    break;
		}		
		case Sonoran.CLI.DST_ONE_CONN: {
		    mnemo = "conn-abbrev?";
		    descr = "One saguaro connection abbreviation or guessed by shell.";
		    break;
		}
		case Sonoran.CLI.DST_ZERO_OR_ONE_CONN: {
		    mnemo = "conn-abbrev*";
		    descr = "An optional saguaro connection abbreviation or guessed by shell.";
		    break;
		}
		case Sonoran.CLI.DST_ANY_MOTE: {
		    mnemo = "mote-abbrev*";
		    descr = "Optional mote abbreviations or guessed by shell.";
		    break;
		}	
		case Sonoran.CLI.DST_ANY_MOTE_OR_CONN: {
		    mnemo = "(mote-abbrev||conn-abbrev)*";
		    descr = "Optional mote/conn abbreviations or guessed by shell.";
		    break;
		}
		}
		if (descr) {
		    pb.insert(mnemo);
		    pb.insert('\n');
		    var ind = pb.addIndent(env.detailsDescIndent);
		    pb.insert(descr);
		    pb.assertEmptyLine();
		    pb.setIndent(ind);
		}
	    }	    
	    return 0;
	},

	
	/**
	 * @param mote
	 * @returns {String} error message or null
	 */
	checkMote: function(/** Sonoran.Mote */mote) {
            var clazzes = this.moteClazzes;
            if (clazzes) {
                if (clazzes.indexOf(mote.getClass()) < 0) {
                    return sprintf("Invalid mote '%s': invalid mote class '%s'.", mote.getUniqueid(), mote.getClass());
                }
            }
            if (this.asmName!==undefined) {
                var entries = mote.getAssemblies().getMatchingEntries(this.asmName);
                if (entries.length == 0) {
                    return sprintf("Invalid mote '%s': does not contain assembly '%s'.", mote.getUniqueid(), this.asmName);
                }
            }
            return null;
	},

	/**
	 * @throws {String}
	 * @private
	 */
	checkAll: function() {
	    var motes = this.listedMotes;
	    var connections = this.listedConnections;
	    var type = this.type;

            if (type===Sonoran.CLI.DST_NONE) {
		if (motes.length!=0) {
                    throw "No mote specification expected.";
		}
		if (connections.length!=0) {
                    throw "No connection specification expected.";
		}
            } else if (type===Sonoran.CLI.DST_ONE_MOTE) {
		if (motes.length==0) {
                    motes = Sonoran.Registry.getMotes();
		}
		if (motes.length==0) {
                    throw "No motes available.";
		}
		if (motes.length>1) {
                    var candidates = [];
                    for (var i = 0; i < motes.length; i++) {
			if (this.checkMote(motes[i]) == null) {
                            candidates.push(motes[i]);
			}
                    }
                    if (candidates.length==0) {
			throw "Command expects the specification of a single target mote.";
                    } else if (candidates.length>1) {
			throw "Multiple mote candidates detected: " + candidates.join(', ');
                    }
                    motes = candidates;
		}
		var msg = this.checkMote(motes[0]);
		if (msg) {
                    throw msg;
		}
		this.mote = motes[0];
            } else if (type===Sonoran.CLI.DST_MANY_MOTES) {
		if (motes.length==0) {
                    motes = Sonoran.Registry.getMotes();
		}
		if (motes.length==0) {
                    throw "No motes available.";
		}
		var msgs = [];
		for (var i = 0; i < motes.length; i++) {
                    var mote = motes[i];
                    var msg = this.checkMote(mote);
                    if (msg) {
			msgs.push(msg);
                    }
		}
		if (msgs.length>0) {
                    throw msgs.join("\n");
		}
		this.motes = motes;
            } else if (type===Sonoran.CLI.DST_ZERO_OR_ONE_CONN) {
		if (connections.length==0) {
                    connections = Saguaro.Connection.getConnections();
		}
		if (connections.length>1) {
                    throw "Expected saguaro connection ambigious: " + connections.join(", ");
		}
		if (connections.length==1) {
                    this.connection = connections[0];
		} else {
                    this.connection = null;
		}
            } else if (type===Sonoran.CLI.DST_ONE_CONN) {
		if (connections.length==0) {
                    connections = Saguaro.Connection.getConnections();
		}
		if (connections.length>1) {
                    throw "Expected saguaro connection ambigious: " + connections.join(", ");
		}
		if (connections.length==0) {
                    throw "Saguaro connection not available.";
		}
		this.connection = connections[0];
            } else if (type===Sonoran.CLI.DST_ANY_MOTE) {
		if (connections.length>0) {
                    throw "Cannot accept saguaro connection: " + connections[0];
		}
		this.motes = this.listedMotes;
            } else if (type===Sonoran.CLI.DST_ANY_MOTE_OR_CONN) {
		//if (connections.length>0) {
                  //  throw "Cannot accept saguaro connection: " + connections[0];
		//}
		this.motes = this.listedMotes;
		this.connections = this.listedConnections;
            }
	}
    }
);



//---------------------------------------------------------------------------------------------------------------
//
// Sonoran.CLI.CommandFactory
//
//---------------------------------------------------------------------------------------------------------------


/**
 * Parse command line and instantiate command ready for execution.
 * @param shell
 * @param argv
 * @param module
 * @returns Sonoran.CLI.Command ready to call exec on or null if no command given in args
 * @throws {Object} in case command is ambigious or could not be instantiated
 */
CLI.commandFactory.parseCommand = function(/** Sonoran.CLI.Shell */shell, /** String */argv, /** String */module) {
    assert(argv.length>0);
    var motes = [];
    var connections = [];
    var cmdName = null;
    var idx;
    for (idx = 0; idx < argv.length; idx++) {
        var arg = argv[idx];
        if (arg.length==0) {
            continue;
        }
        var ret = Sonoran.CLI.Abbreviations.resolveAbbrev(arg, connections, motes);
        if (ret) {
            if (ret.conn && arg.length==1 && idx==argv.length-1) {
                throw sprintf("Ambiguous '%s': saguaro connection or command possible!", arg);
            }
            continue;
        }
        var guesses = CLI.guessKeyword(module + '-' + arg, this.keywords, '-');    
	if (guesses.length===0) {
	    guesses = CLI.guessKeyword(arg, this.keywords, '-');    
	}
        if (guesses.length==0) {
	    var func = Blob.peek(arg);
	    if (!func || typeof(func) !== 'function') {
		return null;
	    }
	    var newCallSemantics = false;
	    var spec = Blob.peek(arg+".CLI_SPEC");
	    if (!spec) {
		spec = Blob.peek(arg+".SHELL_SPEC");
		if (spec!=null) { newCallSemantics = true; }
	    }
	    if (spec && ((spec instanceof Array) || (typeof(spec)==="number"))) {
		spec = (spec instanceof Array) ? Blob.instantiate("Sonoran.CLI.Spec", [ arg ].concat(spec)) : new Sonoran.CLI.Spec(arg, spec);
	    } else {
		spec = new Sonoran.CLI.Spec(arg, Sonoran.CLI.DST_ANY_MOTE);
	    }
	    spec.setCommand(arg);
	    var cmd = new CLI.Builtins.InvokeCommand(shell, spec, newCallSemantics);
	    var arr = CLI.Builtins.InvokeCommand.parseInvocation(argv, idx);
	    cmd.funcDst = arr[0];
	    cmd.funcThis = arr[1];
	    cmd.funcArgs = arr[2];
	    //cmd.funcArgs = argv.slice(idx + 1);
	    //cmd.funcDst = func;
	    return cmd;
        }
        if (guesses.length>1) {
            var txt = sprintf("Ambiguous command '%s', possible completions:\n%s", arg, guesses.join("\n"));
            if (ret) {
                txt += "\n<Destination specification>";
            }
            throw txt;
        }
        if (guesses.length==1) {
            if (ret) {
                throw sprintf("Ambiguous command '%s': denotes command destination and command name '%s'", arg, guesses[0]);
            }
	    var name = guesses[0];
	    var fn = this.keyword2factory[name];
	    assert(fn);
	    return Blob.instantiate(fn, [ shell, name ]);
        }
    }

    throw sprintf("Missing command/script/function specification!");
};



//---------------------------------------------------------------------------------------------------------------
//
// Sonoran.CLI.Commands: command implementations
//
//---------------------------------------------------------------------------------------------------------------

//---------------------------------------------------------------------------------------------------------------
//
// Builtin Command to call a Javascript func
//
//---------------------------------------------------------------------------------------------------------------
/**
 * @class 
 * @constructor
 * @param shell
 * @param name
 * @private
 */
CLI.Builtins.InvokeCommand = function(/** CLI.Shell */shell, /** Sonoran.CLI.Spec */cmdSpec, /** Boolean */newCallSemantics) {
    this.description = 
	"Helper command to call a Javascript function. Example:\n" +
        "a0 a1 MyShellFunc arg0 arg1                           \n" +
	"...looks for the Javascript function...               \n" +
	"MyShellFunc = function(motes, arg0, arg1) { ... }     \n" +
	"... calls it and prints its result.";
    this.restOfArgs = new GetOpt.RestOfArgs("args", "Args for Javascript function.");
    CLI.Command.call(this, shell, cmdSpec, [ this.restOfArgs ]);
    this.funcThis = null;
    this.funcArgs = [];
    this.funcDst = null;
    this.newCallSemantics = newCallSemantics;
};

/** @private */
CLI.Builtins.InvokeCommand.prototype = extend(
   CLI.Command.prototype,
   {
       /** @ignore */
       exec: function(callback) {
	   var motes, mote, data;
	   if (!this.newCallSemantics) {
	       if (typeof(this.cmdSpec.getMotes) === 'function') {
		   motes = this.cmdSpec.getMotes();
		   mote = this.cmdSpec.getMote();
		   motes = motes ? motes : (mote ? [ mote ] : []);
	       } 
	       if (this.funcDst === null) {
		   var args = this.restOfArgs.getRestArgs();
		   var arr = CLI.Builtins.InvokeCommand.parseInvocation(args);
		   this.funcDst = arr[0];
		   this.funcThis = arr[1];
		   this.funcArgs = arr[2];
	       }
	       assert(this.funcArgs instanceof Array);
	       assert(typeof(this.funcDst) === 'function');
	       this.funcArgs.unshift(motes);
	       this.funcDst.apply(this.funcThis, this.funcArgs);
	   } else {
	       var context = {
		   shell: this.shell,
		   motes: this.cmdSpec.getMote() ? [ this.cmdSpec.getMote() ] : this.cmdSpec.getMotes(),
		   connections: this.cmdSpec.getConnection() ? [ this.cmdSpec.getConnection() ] : this.cmdSpec.getConnections()
	       };
	       if (this.funcDst === null) {
		   var args = this.restOfArgs.getRestArgs();
		   var arr = CLI.Builtins.InvokeCommand.parseInvocation(args);
		   this.funcDst = arr[0];
		   this.funcThis = arr[1];
		   this.funcArgs = arr[2];
	       }
	       assert(this.funcArgs instanceof Array);
	       assert(typeof(this.funcDst) === 'function');
	       this.funcDst.call(this.funcThis, context, this.funcArgs);
	   }
	   callback(new AOP.OK(data));
       }
   }
);





/**
 * @param args
 * @param idx
 * @returns {Object}
 * @private
 */
CLI.Builtins.InvokeCommand.parseInvocation = function(/** String[] */args, /** Number */idx) {
    if (idx == null) { idx = 0; }
    var funcDst = Blob.peek(args[idx]);
    if (!funcDst || typeof(funcDst) !== 'function') {
	throw new Exception("No such function: " + args[idx]);
    }
    var funcThis = null;
    var off = args[idx].lastIndexOf('.');
    if (off >= 0) {
	var path = args[idx].substr(0, off);
	funcThis = Blob.peek(path);
    }
    var funcArgs = args.slice(idx + 1);
    return [ funcDst, funcThis, funcArgs ];
};









//---------------------------------------------------------------------------------------------------------------
//
// Asm Commands
//
//---------------------------------------------------------------------------------------------------------------


/**
 * Asm commands.
 *  @class
 * @private
 */
Sonoran.CLI.Commands.Asm = {};


/**
 * @private
 * @class Asm info command.
 * @constructor
     */
Sonoran.CLI.Commands.Asm.InfoCommand = function(/** CLI.Shell */shell, /** String */name) {
    this.description =
        "If -l is specified, the contents of the Global Assembly Cache are listed.\n" +
        "If a filename or an assembly identity is specified, assembly information is printed. Examples:\n" +
        "asm-info logger-#.#\n" +
        "asm-info logger-1.0";
    this.gacOpt = new GetOpt.Option("l", "--list-gac", 0, null, "List contents of gac");
    var optSet = new GetOpt.OptionSet([ this.gacOpt ]);
    this.fileSpec = new GetOpt.Simple("assembly", "Assembly identity specification or filename.");
    CLI.Command.call(this, shell, name, [ optSet, this.fileSpec ], 0);
};

/** @private */
Sonoran.CLI.Commands.Asm.InfoCommand.prototype = extend(
    CLI.Command.prototype,
    {
        /** @private */
        exec: function(callback) {
            if (this.gacOpt.isSet()) {
                var ret = Sonoran.Resource.listResources("a");
                callback(new AOP.OK(ret));
                return;
            } 
	    var spec = this.fileSpec.getArg();
            if (!spec) {
                callback(new AOP.ERR("Missing assembly specification"));
                return;
            }
            var resources = null;
            try {
                resources = [ new Sonoran.Resource.Assembly(spec) ];
            } catch (x) { ; }
            if (!resources) {
                var asmname = new Sonoran.AsmName(spec);
                resources = Sonoran.Resource.Assembly.getSBAs([ IO.File.getcwd()+"/***", Sonoran.Resource.getGACDir() ], asmname);
            }
            if (resources.length == 0) {
                callback(new AOP.ERR(sprintf("Cannot find assembly '%s'!", spec)));
	        return;
            }
            var txt = "";
            for (var i = 0; i < resources.length; i++) {
                txt += resources[i].getInfo();
                txt += "\n\n";
            }
	    callback(new AOP.OK(txt));
        }
    }
);




CLI.commandFactory.addModule("Sonoran.CLI.Commands.Asm");






//---------------------------------------------------------------------------------------------------------------
//
// Network Commands
//
//---------------------------------------------------------------------------------------------------------------


/**
 * Network commands.
 * @class
 * @private
 */
Sonoran.CLI.Commands.Network = {};

/**
 *  @class 
 * @constructor
 * @private
 */
Sonoran.CLI.Commands.Network.ListCommand = function(shell, name) {
    this.description = "List available simulations, motes, serial connections etc.";
    this.asmsOpt = new GetOpt.Option('a', '--assemblies', 0, null, "Include cached assembly listings for motes.");
    var optSet = new GetOpt.OptionSet([ this.asmsOpt ]);
    CLI.Command.call(this, shell, name, [ optSet, new GetOpt.EndOfArgs() ]);
};

/** @private */
Sonoran.CLI.Commands.Network.ListCommand.prototype = extend(
    CLI.Command.prototype,
    {
        /** @private */
        exec: function(callback) {
	    var text = "", i;
	    var conn = Saguaro.Connection.getConnection();
	    if (!conn) {
	        text += "No simulation started.\n\n";
	    } else if (conn.getMotes().length == 0) {
		var t = new Formatter.Table2(4);
		t.setTitle("Saguaro-Abbrev", "Saguaro Connection", "State", "Mode");
                var abbrev = Sonoran.CLI.Abbreviations.getAbbrev4Conn(conn);
	        t.addRow(abbrev, conn.toString(), conn.getRunState(), conn.getRunMode());
	        text = t.render().join("\n");
		text += "\n\n";
            }
	    var motes = Sonoran.Registry.getMotes(true);
	    if (motes.length==0) {
	        text += "No motes registered.";
	    } else {
	        var table = new Formatter.Table2(6);
		table.setTitle("Mote-Abbrev", "Name", "State", "Connection", "Uniqueid", "Addresses");
	        for (i = 0; i < motes.length; i++) {
	            var mote = motes[i];
	            var abbrevs = Sonoran.CLI.Abbreviations.getAbbrevs4Mote(mote, true).join(",");
	            var connection = null;
		    //var sink = mote.getSink();
		    switch(mote.getClass()) {
                    case 'lip':
                        connection = mote.getConnection().getDevice().toString();
                        break;
                    case 'udp':
                        connection = 'UDP:' + mote.getConnection().getHostAddr() + ":" + mote.getConnection().getHostPort();
                        break;
		    case "hardware":
			connection = mote.getConnection().toString();
			break;
		    case "saguaro":
			connection = mote.getConnection().toString();
			break;
                    default:
                        connection = "("+mote.getClass()+")";
			break;
                    }
	            table.addRow(abbrevs, mote.getName().substr(0, 12), mote.getState(), connection, mote.getUniqueid(), Sonoran.CLI.formatAddresses(mote.getAddresses()).join('  '));
	        }
	        text += table.render().join("\n");
	    }
            if (this.asmsOpt.isSet() && motes.length>0) {
                text += "\n\nMOMA Assemblies Cache:\n";
                var table = new Formatter.Table2(7);
		table.setTitle("Mote-Id", "Outdated", "State", "Assembly", "Id", "Version", "Mote-Address");
                for (i = 0; i < motes.length; i++) {
	            if (i != 0) {
		        table.addSeparator();
	            }
                    motes[i].getAssemblies().toTable(table);
	        }
                text += table.render().join("\n");
                table = new Formatter.Table2(7);
		table.setTitle("Mote-Id", "Outdated", "State", "Assembly", "Id", "Version", "Mote-Address");
                text += "\nSaguaro Registries:\n";
                motes = motes.filter(function(m) { return m.getClass() == 'saguaro'; });
                for (i = 0; i < motes.length; i++) {
	            if (i != 0) {
		        table.addSeparator();
	            }
                    Saguaro.mote2impl(motes[i]).getAssemblies().toTable(table);
	        }
                text += table.render().join("\n");
            }
            callback(new AOP.OK(text));
        }
    }
);




CLI.commandFactory.addModule("Sonoran.CLI.Commands.Network");
