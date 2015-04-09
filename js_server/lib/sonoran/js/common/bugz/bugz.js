//  (C) COPYRIGHT INTERNATIONAL BUSINESS MACHINES CORPORATION 2006-2010
//                       ALL RIGHTS RESERVED
//        IBM Research Division, Zurich Research Laboratory
// --------------------------------------------------------------------



/**
 * Bugz implements a saguaro debugger.
 * @namespace Bugz 
 */
Bugz = {};


/**
 * Null reference string "r:0000".
 * @type String
 * @constant
 */
Bugz.NULL_REF = "r:0000";

/**
 * Null reference string "r:0000".
 * @type String
 * @constant
 */
Bugz.NULL_DEL = "d:0000/null";

/**
 * All primitive array type signatures.
 * @type String[]
 * @constant
 */
Bugz.PRIM_ARR_TYPES = [ "z[]", "b[]", "c[]", "s[]", "i[]", "u[]", "l[]" ];

/**
 * All primitive type signatures.
 * @type String[]
 * @constant
 */
Bugz.PRIM_TYPES = [ "z", "b", "c", "s", "i", "u", "l" ];



/**
 * @type RegExp
 * @constant
 */
Bugz.PC_REGEXP = new RegExp("^b:([0-9A-Fa-f]{1,2})\/([0-9A-Fa-f]{1,5})$");
   



/**
 * Bugz.Settings describes the current settings of the Bugz debugger.
 * @class
 * @constructor
 */
Bugz.Settings = function() {
    /**
     * Assembly set by user.
     * @type Sonoran.AsmName
     */
    this.asmName = null;
    /**
     * File set by user.
     * @type String
     */
    this.fileName = null;
    // /**
    //  * Get radio device state on radio-rx. 0 = off, 1 = query, 2 = query and continue.
    //  * @type Number
    //  */
    // this.queryRadioOnRadioRx = 0;
    /**
     * Do not dump stacks/events on interactive shells.
     * @type Boolean
     */
    this.silent = false;
    /**
     * Halt conditions set on newly created motes. Map of category:evname to 0 or 1.
     * @type Object
     */
    this.haltConditions = {};
    /**
     * Additonal search path for moma-load etc.
     * @type String
     */
    this.searchPath = null;
};


/** @private */
Bugz.Settings.prototype = {
    /** @ignore */
    __constr__: "Bugz.Settings",

    /**
     * @param asmName
     */
    setAsmName: function(/** Sonoran.AsmName */asmName) {
        this.asmName = asmName;
    },
    
    /**
     * @returns {Sonoran.AsmName}
     */
    getAsmName: function() {
        return this.asmName;
    },

    /**
     * @param haltConditions
     */
    setHaltConditions: function(/** Object */haltConditions) {
        this.haltConditions = haltConditions;
    },
    
    /**
     * @returns {Object}
     */
    getHaltConditions: function() {
        return this.haltConditions;
    },

    /**
     * @returns {String}
     */
    getFileName: function() {
        return this.fileName;
    },

    /**
     * @param fileName
     */
    setFileName: function(/** String */fileName) {
        this.fileName = fileName;
    },
    
    /**
     * @returns {String}
     */
    getSearchPath: function() {
        return this.searchPath;
    },

    /**
     * @param fileName
     */
    setSearchPath: function(/** String */searchPath) {
        this.searchPath = searchPath;
    },

    /**
     * @returns {Boolean}
     */
    getSilent: function() {
        return this.silent;
    },

    /**
     * @param flag
     */
    setSilent: function(/** Boolean */flag) {
        this.silent = flag;
    },

    /**
     * @returns {String}
     */
    toString: function() {
        var txt = "";
        txt += "Assembly:            " + (this.asmName||"unspecified") + "\n";
        txt += "File:                " + (this.fileName||"unspecified") + "\n";
        txt += "Silent:              " + (this.silent) + "\n";
        txt += "Search-Path:         " + (this.searchPath?this.searchPath:"none") + "\n";
        if (Blob.isEmpty(this.haltConditions)) {
            txt += "Halt-Conditions:     " + "Unspecified";
        } else {
            var sa = [];
            for (var n in this.haltConditions) { sa.push(n + ":" + this.haltConditions[n]); }
            txt += "Halt-Conditions:     " + sa.join(",");
        }
        return txt;
    }
};


/**
 * Bugz.SlotInfo wraps name, type, value and slot of a resolved variable.
 * @class
 * @constructor
 * @param name
 * @param type
 * @param value
 * @param slot
 */
Bugz.SlotInfo = function(name, type, value, slot) {
    assert(arguments.length==4);
    this.name = name;
    this.type = type;
    this.value = value;
    this.slot = slot;
};

/** @private */
Bugz.SlotInfo.prototype = {
    /** @ignore */
    __constr__: "Bugz.SlotInfo",
    
    /**
     * @returns {String}
     */
    toString: function() {
        return "Slot:" + this.type + ";" + this.name + "=" + this.value;
    },
    
    
    /**
     * @returns {String} name
     */
    getName: function() {
        return this.name;
    },

    
    /**
     * @returns {String} type
     */
    getType: function() {
        return this.type;
    },

    
    /**
     * @returns {Object} value
     */
    getValue: function() {
        return this.value;
    },

    
    /**
     * @returns {Number} slot idx
     */
    getSlot: function() {
        return this.slot;
    },


    /**
     * @param fmt
     * @returns {String} value representation according to format string
     */
    print: function(/** String */fmt) {
        var s = Bugz.format(this.type, this.value, fmt);
        var t = new Util.Formatter.Table2(3);
	t.setTitle("Name", "Type", "Value");
        var name = this.name;
        if (name.indexOf('.') >= 0) {
            var sa = name.split('.');
            name = sa[sa.length-1];
        }
        t.addRow(name, this.type, s);
        return  t.render().join("\n");
    }
};




/**
 * Format a value according to type and fmt.
 * @param type
 * @param value
 * @param fmt
 */
Bugz.format = function(/** String */type, /** String */value, /** String */fmt) {
    var t = this.PRIM_TYPES.indexOf(type);
    if (t < 0) {
        return value;
    }
    if (t == 0) {
        var b = parseInt(value);
        return (b==0) ? "false" : "true";
    }
    var n = parseInt(value);
    if (!fmt) {
        fmt = "%s";
    }
    return sprintf(fmt, n);
};




/**
 * Bugz.ObjectInfo encapsulates an object resolved from saguaro.
 * @class
 * @constructor
 * @param data    As retrieved from saguaro
 */
Bugz.ObjectInfo = function(/** Object */data) {
    //QUACK(0, "Bugz.ObjectInfo: " + Util.formatData(data));
    this.jref = data.jref;
    assert(this.jref);
    var fields = data.fields;
    if (fields) {
	assert(fields instanceof Array);
	assert(fields.length>=0);
	this.fields = [];
	for (var i = 0; i < fields.length; i++) {
            this.fields.push(new Bugz.Fields(fields[i]));
	}
	this.type = (this.fields.length>0) ? ("r:" + this.fields[0].clsname) : "r:com.ibm.saguaro.system.Object";
    } else {
	//QUACK(0, "Bugz.ObjectInfo: no fields->\n" + Util.formatData(data));
	this.type = "r:com.ibm.saguaro.system.Object";
    }
};

/** @private */
Bugz.ObjectInfo.prototype = {
    /** @ignore */
    __constr__: "Bugz.ObjectInfo",

    /**
     * @type String
     */
    jref: null,

     /**
     * @type Bugz.Fields
     */
    fields: null,

    /**
     * @type String
     */
    type: null,

    
    /**
     * @returns {String}
     */
    toString: function() {
        return "Object:" + this.jref;
    },


    /**
     * @param fmt
     * @returns {String} value representation according to format string
     */
    print: function(/** String */fmt) {
        var slots = [];
        for (var i = 0; i < this.fields.length; i++) {
            slots = slots.concat(this.fields[i].getSlots());
        }
        var t = new Util.Formatter.Table2(4);
	t.setTitle("Name", "Slot", "Type", sprintf("Value     JREF:%s", this.jref));
        for (var i = 0; i < slots.length; i++) {
            var slot = slots[i];
            var name = slot.name ? slot.name : "Unknown";
            if (name.indexOf('.') >= 0) {
                var sa = name.split('.');
                name = sa[sa.length-1];
            }
            t.addRow(name, slot.slot, slot.type, Bugz.format(slot.type, slot.value, fmt));
        }
        return  t.render().join("\n");
    }
};



/**
 * Bugz.ArrayInfo encapsulates an array resolved from saguaro.
 * @class
 * @constructor
 * @param data    As returned by saguaro
 */
Bugz.ArrayInfo = function(data) {
    /**
     * @type String
     */
    this.jref = data.jref;
    /**
     * @type String
     */
    this.type = data.type;
    /**
     * @type Number
     */
    this.size = data.size;
    /**
     * @type String
     */
    this.clsref = data.clsref;
    /**
     * @type String
     */
    this.clsname = data.clsname;
    assert(data.slots.length==2);
    /**
     * @type String[]
     */
    this.slots = data.slots[1];
    /**
     * Optional offset which describes the offset of this array into its parent array
     * @type Number
     */
    this.offset = data.offset;
};

/** @private */
Bugz.ArrayInfo.prototype = {
    /** @ignore */
    __constr__: "Bugz.ArrayInfo",

    /**
     * @returns {String}
     */
    toString: function() {
        return "Array: " + this.jref + "," + this.type + "," + this.size + "," + this.clsref + "," + this.clsname + "," + this.offset + ": " + this.slots.join(":");
    },


    /**
     * Return element type
     * @returns {String}
     */
    getEleType: function() {
        return this.type.substring(0, this.type.length-2);
    },

    
    /**
     * @returns {String} value representation according to format string
     */
    print: function(/** String */fmt) {
        var eleType = this.getEleType();
        var slots = [ "S", "V" ];
        while(slots.length<17) {
            slots.push("");
        }
        var offset = this.offset|0;
        var table= new Formatter.Table2(17);
        for (var i = 0; i < this.slots.length; i += 16) {
            slots = [ (offset+i).toString()+":" ];
            for (var j = 0; j < 16; j++) {
                if (i+j >= this.slots.length) {
                    slots.push("");
                } else {
                    slots.push(Bugz.format(eleType, this.slots[i+j], fmt));
                }
            }
            //if (!table) {
              //  table = new Formatter.Table2(slots.length);
		//table.setTitle(slots);
                //table.setLines(0, 0, 0);
            //} else {
                table.addRow(slots);
            //}
        }
        //return table.gen();
        return  table.render().join("\n");
    }
};








/**
 * Bugz.DelegateInfo encapsulates info about a delegate reference.
 * @class
 * @constructor
 * @param data    As returned by saguaro
 */
Bugz.DelegateInfo = function(data) {
    /**
     * @type String
     */
    this.del = data.del;
    /**
     * @type String
     */
    this.type = data.type;
    /**
     * @type String
     */
    this.asmidentity = data.asmidentity;
    /**
     * @type String
     */
    this.clsname = data.clsname;
    /**
     * @type String
     */
    this.method = data.method;
    /**
     * @type String
     */
    this.file = data.file;
    /**
     * @type Number
     */
    this.line = data.line;
};

/** @private */
Bugz.DelegateInfo.prototype = {
    /** @ignore */
    __constr__: "Bugz.DelegateInfo",

    /**
     * @returns {String}
     */
    toString: function() {
        return "Delegate: " + this.del + "," + this.type + "," + this.clsname + "," + this.method;
    },
    
    /**
     * @returns {String} value representation according to format string
     */
    print: function(/** String */fmt) {
	return "del:" + this.type + ":" + this.clsname + ":" + this.method;
    }
};



/**
 * Bugz.Fields is used by Bugz.Object and Bugz.Statics and wraps the fields of
 * a resolved object or assembly.
 * @class
 * @constructor
 * @param fields  As returned by saguaro
 */
Bugz.Fields = function(blob) {
    assert(blob.clsref);
    assert(blob.clsname!==undefined);
    /**
     * @type String
     */
    this.clsref = blob.clsref;
    /**
     * @type String
     */
    this.clsname = blob.clsname;
    /**
     * @type Bugz.Slot[]
     */
    this.ints = [];
    for (var i = 0; i < blob.ints.length; i++) {
        this.ints.push(Bugz.Slot.fromBlob(blob.ints[i]));
    }
    /**
     * @type Bugz.Slot[]
     */
    this.refs = [];
    for (var i = 0; i < blob.refs.length; i++) {
        this.refs.push(Bugz.Slot.fromBlob(blob.refs[i]));
    }
    /**
     * @type Bugz.Slot[]
     */
    this.all = this.refs.concat(this.ints);
};

/** @private */
Bugz.Fields.prototype = {
    /** @ignore */
    __constr__: "Bugz.Fields",
    
    /**
     * @returns {Bugz.Slot[]}
     */
    getSlots: function() {
        return this.all;
    },
    
    /**
     * @param name Field name
     * @returns {Bugz.Slot} a slot
     */
    lookup: function(/** String */name) {
        for (var i = 0; i < this.all.length; i++) {
            var slot = this.all[i];
            if (slot.getName() === name) {
                return slot;
            }
        }
        return null;
    },

    /**
     * @returns {Bugz.Slot[]} matching slots
     */
    getMatches: function(re) {
        var slots = [];
        for (var i = 0; i < this.all.length; i++) {
            var slot = this.all[i];
            if (re.test(slot.getName())) {
                slots.push(slot);
            }
        }
        return slots;
    }
};





/**
 * Bugz.StackInfo wraps the information resolved from saguaro.
 * @class 
 * @constructor
 */
Bugz.StackInfo = function() {
    /**
     * @type Sonoran.Mote
     */
    this.mote = null;
    /**
     * @type Bugz.Frame[]
     */
    this.frames = null;
    /**
     * @type Bugz.PC
     */
    this.pc = null;
    /**
     * @type String[]
     */
    this.lines = null;
    /**
     * @type Number
     */
    this.around = 1;
};

Bugz.StackInfo.prototype = {
    /** @ignore */
    __constr__: "Bugz.StackInfo",

    /**
     * @returns current pc.
     * @type Bugz.PC
     */
    getPC: function() {
        return this.pc;
    },
    
    /**
     * @returns frames
     * @type Bugz.Frame[]
     */
    getFrames: function() {
        return this.frames;
    },
    
    /**
     * @returns frame
     * @type Bugz.Frame
     */
    getFrame: function(idx) {
        return this.frames[idx];
    },
    
    /**
     * @returns mote
     * @type Sonoran.Mote
     */
    getMote: function() {
        return this.mote;
    },

    /**
     * @returns {String} multi-line string
     */
    toString: function() {
        var uniqueid = this.mote.getUniqueid();
        if (this.frames.length==0) {
            return uniqueid + ": No stack";
        }
        var txt = "";
        {
	    var t = new Formatter.Table2(7);
	    t.setTitle("F#", "PC", "Name", "Value", "Slot", "Type", "Class    " + this.mote.getUniqueid());
            for (var i = 0; i < this.frames.length; i++) {
                this.frames[i].addInfo(t);
            }
	    txt = t.render().join("\n") + "\n";
        }
        {
            var line = this.pc.getLine();
	    var t = new Formatter.Table2(2);
	    t.setTitle("Line-Number", this.pc.getFile() + ":" + line);
            var lno = line - this.around;
            var lines = this.lines;
            if (!lines) {
                t.addRow("--> " + line, "Unknown");
            } else {
                for (var i = 0; i < this.lines.length; i++) {
                    var s1 = ((lno==line) ? "--> " : "    ") + lno.toString();
                    var s2 = this.lines[i];
                    t.addRow(s1, s2);
                    lno += 1;
                }
            }
	    txt +=  t.render().join("\n");
        }
        return txt;
    }
};






/**
 * Bugz.HaltCondition encapsulates a break condition for a mote.
 * @class
 * @constructor
 * @param mote               Mote
 * @param condition2state    Map of "category:evname" to 0|1
 */
Bugz.HaltCondition = function(/** Sonoran.Mote */mote, /** Object */condition2state) {
    /**
     * Unique id of mote
     * @type String
     */
    this.uniqueid = mote.getUniqueid();
    /**
     * Conditions to On/Off (1/0)
     * @type Object
     */
    this.condition2state = condition2state;
};


/** Prototype */
Bugz.HaltCondition.prototype = {
    /** @ignore */
    __constr__: "Bugz.HaltCondition",
    
    /**
     * @returns {String} mote unique id
     */
    getUniqueid: function() {
        return this.uniqueid;
    },

    /**
     * @returns {Object} map of condition name to state
     */
    getCondition2State: function() {
        return this.condition2state;
    },

    /**
     * @returns {String}
     */
    toString: function() {
        var txt = this.uniqueid + ": " + Util.formatData(this.condition2state);
        return txt;
    }
};








Class.define(
    "Bugz.Point",
    /**
     * @lends Bugz.Point.prototype
     */
    {
	/**
	 * @constructs
	 */
	__constr__: function(/** Sonoran.AsmName */asmName) {
	    this.bpid = -1;
	    this.wpid = -1;
	    this.asmName = asmName;
	    this.enabled = true;
	    this.uniqueid2mote = {};
	},

	/**
	 * Breakpoint id, >= 0 if watchpoint is associated with breakpoint or this object is breakpoint.
	 * @type Number
	 */
	bpid: -1,
	/**
	 * Watchpoint id, >= 0 if breakpoint is associated with watchpoint or this object is watchpoint.
	 * @type Number
	 */
	wpid: -1,
	/**
	 * Assembly name
	 * @type Sonoran.AsmName
	 */
	asmName: null,
	/**
	 * @type Boolean
	 */
	enabled: true,
	/**
	 * Map of uniqueid to uniqueid for each mote which has breakpoint set.
	 * @type Object
	 */
	uniqueid2mote: null,

	/**
	 * @returns {Number}
	 */
	getId: function() {
	    assert(0);
            return -1;
	},

	/**
	 * @returns {Number}
	 */
	getBPId: function() {
            return this.bpid;
	},

	/**
	 * @returns {Number}
	 */
	getWPId: function() {
            return this.wpid;
	},

	/**
	 * @returns {Boolean}
	 */
	isEnabled: function() {
            return this.enabled;
	},

	/**
	 * @returns {Sonoran.AsmName} assembly name
	 */
	getAsmName: function() {
            return this.asmName;
	}
    }
);



Bugz.Point.extend(
    "Bugz.Breakpoint",
    /**
     * @lends Bugz.Breakpoint.prototype
     */
    {
	/**
	 * Bugz.Breakpoint encapsulates information of a breakpoint.
	 * @constructs
	 * @augments Bugz.Point
	 * @param asmName      Assembly name
	 * @param codelocSpec  File:Line
	 * @param dynamic      Breakpoint is set on motes at some later time (on load etc).
	 */
	__constr__: function(/** Sonoran.AsmName */asmName, /** String */codelocSpec, /** Boolean */dynamic) {
	    Bugz.Point.call(this, asmName);
	    /**
	     * file:line
	     * @type String
	     */
	    this.codelocSpec = codelocSpec;
	    //assert(!codelocSpec || /^([a-zA-Z]\:)?[^\:]+\:\d+$/.test(codelocSpec) || /^\d+$/.test(codelocSpec));
	    /**
	     * If true, a breakpoint is automatically activated on asm-loaded events.
	     * @type Boolean
	     */
	    this.dynamic = dynamic;
	},

	/**
	 * file:line
	 * @type String
	 */
	codelocSpec: null,

	/**
	 * If true, a breakpoint is automatically activated on asm-loaded events.
	 * @type Boolean
	 */
	dynamic: true,

	/**
	 * @returns {Number}
	 */
	getId: function() {
            return this.bpid;
	},

	/**
	 * @param wpid
	 */
	setWPId: function(/** Number */wpid) {
	    assert(wpid>=0);
	    assert(this.wpid<0);
	    this.wpid = wpid;
	},

	/**
	 * @returns {Boolean}
	 */
	forWatchpoint: function() {
            return this.wpid >= 0;
	},

	/**
	 * @returns {Boolean}
	 */
	isDynamic: function() {
            return this.dynamic;
	},

	/**
	 * @returns {String} code location or null
	 */
	getCodeLocSpec: function() {
            return this.codelocSpec;
	},

	/**
	 * Return motes which have this breakpoint currently set.
	 * @returns {Sonoran.Mote[]} motes
	 */
	getBreakMotes: function() {
            var motes = [];
            for (var u in this.uniqueid2mote) {
		var mote = Sonoran.Registry.lookupMoteByUniqueid(u);
		assert(mote);
		motes.push(mote);
            }
            return motes;
	},

	/**
	 * Returns string as required by saguaro for setting a breakpoint.
	 * @returns {String} string
	 * @private
	 */
	getBreakLoc: function() {
            var maj = this.asmName.major;
            var min = this.asmName.minor;
            var breakLoc = this.asmName.name;
            if (maj) {
		breakLoc += sprintf("-%s.%s", maj, min);
            }
            breakLoc += ";";
            breakLoc += this.codelocSpec;
            return breakLoc; 
	},


	/**
	 * Returns array with element file (String) and line (Number)
	 * @returns {Array}
	 */
	getFileAndLine: function() {
	    var md = /^(([a-zA-Z]\:)?[^\:]+):(\d+)$/.exec(this.codelocSpec);
            if (!md) {
		throw "Invalid file:line specification: " + this.codelocSpec;
            }
            return [ md[1], parseInt(md[3]) ];
	},
	

	/**
	 * @param shortString
	 * @returns {String}
	 */
	toString: function(/** Boolean */shortString) {
	    var s = "BP: " + this.bpid + "@" + this.getBreakLoc();
            if (!shortString) {
		var uniqueids = Blob.map(this.uniqueid2mote, true);
		if (uniqueids && (uniqueids.length > 0)) {
		    s += " " + uniqueids.join(",");
		}
	    }
            return s;
	},

	/**
	 * Wether this breakpoint has hit a certain location.
	 * @param pc
	 * @param mote
	 * @returns {Boolean}
	 */
	hitsPC: function(/** Bugz.PC */pc, /** Sonoran.Mote */mote) {
            if (this.isEnabled() && this.uniqueid2mote[mote.getUniqueid()] && pc.asmname && this.asmName.match(pc.asmname)) {
		var re = new RegExp(RegExp.escape(this.codelocSpec)+"$");
		if (pc.file && pc.line) {
                    if (re.test(pc.file+":"+pc.line)) {
			return true;
                    }
		}
		if (pc.clsname && pc.method) {
                    if (re.test(pc.clsname+"."+pc.method)) {
			return true;
                    }
		}
            }
            return false;
	}
    }
);





Bugz.Point.extend(
    "Bugz.Watchpoint",
    /**
     * @lends Bugz.Watchpoint.prototype
     */
    {
	/**
	 * Bugz.Watchpoint
	 * @constructs
	 * @augments Bugz.Point
	 * @param expr
	 * @param breakpoint
	 * @param asmName
	 */
	__constr__: function(/** String */expr, /** Bugz.Breakpoint */breakpoint, /** Sonoran.AsmName */asmName) {
	    Bugz.Point.call(this, asmName);
	    this.paths = Bugz.Inspector.parseExpr(expr);
	    this.expr = expr;
	    this.bpid = breakpoint ?  breakpoint.getBPId() : -1;
	    this.slots = null;

	    if (breakpoint) {
		var _this = this;
		breakpoint.onDel = function() {
		    _this.bpid = -1;
		};
	    }
	},

	/**
	 * Expression paths; the individual paths generated from the 'expr' property.
	 * @type String[]
	 */
	paths: null,

	 /**
	  * Expression path
	  * @type String
	  */
	expr: null,

	/**
	 * Map of mote uid to last resolved slots for this watch-point.
	 * @type Object
	 */
	uniqueid2slots: {},

	/**
	 * @returns {Number}
	 */
	getId: function() {
            return this.wpid;
	},

	/**
	 * @returns {String}
	 */
	getExpr: function() {
	    return this.expr;
	},

	/**
	 * Return motes which have this watchpoint currently set.
	 * @returns {Sonoran.Mote[]} motes
	 */
	getWatchMotes: function() {
            var motes = [];
            for (var u in this.uniqueid2mote) {
		var mote = Sonoran.Registry.lookupMoteByUniqueid(u);
		assert(mote);
		motes.push(mote);
            }
            return motes;
	},

	/**
	 * @param shortString
	 * @returns {String}
	 */
	toString: function(/** Boolean */shortString) {
	    var s = "WP: " + this.wpid + "@" + this.expr;
            if (!shortString) {
		var uniqueids = Blob.map(this.uniqueid2mote, true);
		if (uniqueids && (uniqueids.length > 0)) {
		    s += " " + uniqueids.join(",");
		}
	    }
            return s;
	}
    }
);










/**
 * Bugz.BreakList encapsulates a set of Breakpoint instances.
 * @class
 * @constructor
 * @param breakpoints
 */
Bugz.BreakList = function(/** Bugz.Breakpoint[] */breakpoints) {
    /**
     * @type Bugz.Breakpoint[]
     */
    this.breakpoints = breakpoints;
};


/** @private */
Bugz.BreakList.prototype = {
    /** @ignore */
    __constr__: "Bugz.BreakList",
    
    /**
     * @returns {String}
     */
    toString: function() {
        var t = new Util.Formatter.Table2(6);
        t.setTitle("ID", "WP", "Location", "Enabled", "Dynamic", "Motes");
        var y = 0;
        this.breakpoints.forEach(function(bp) {
            var codelocSpec = bp.codelocSpec||"";
            var uniqueids = bp.getBreakMotes().map(function(m) { return m.getUniqueid(); }).join("\n");
            t.setValue(0, y, bp.getBPId());
            t.setValue(1, y, bp.getWPId());
            t.setValue(2, y, bp.asmName + ":" + codelocSpec);
            t.setValue(3, y, bp.isEnabled());
            t.setValue(4, y, bp.isDynamic());
            t.setValue(5, y, uniqueids);
            y += 1;
        });
        return t.render().join("\n");
    }
};







/**
 * Bugz.WatchList encapsulates a set of WatchList instances.
 * @class
 * @constructor
 * @param watchpoints
 */
Bugz.WatchList = function(/** Bugz.Watchpoints[] */watchpoints) {
    /**
     * @type Bugz.Watchpint[]
     */
    this.watchpoints = watchpoints;
};


/** @private */
Bugz.WatchList.prototype = {
    /** @ignore */
    __constr__: "Bugz.WatchList",
    
    /**
     * @returns {String}
     */
    toString: function() {
        var t = new Util.Formatter.Table2(6);
        t.setTitle("ID", "Expr", "Enabled", "BP", "Assembly", "Mote:Value");
        var y = 0;
        this.watchpoints.forEach(function(wp) {
	    var sa = [];
	    wp.getWatchMotes().forEach(function(mote) {
		var uniqueid = mote.getUniqueid();
		var slots = wp.uniqueid2slots[uniqueid];
		if (slots&&slots.length>0) {
		    sa.push(uniqueid+":"+slots[0]);
		} else {
		    sa.push(uniqueid);
		}
	    });
            var uniqueids = wp.getWatchMotes().map(function(m) { return m.getUniqueid(); }).join("\n");
            t.setValue(0, y, wp.getWPId());
            t.setValue(1, y, wp.expr);
            t.setValue(2, y, wp.enabled);
            t.setValue(3, y, wp.getBPId());
            t.setValue(4, y, wp.asmName);
            t.setValue(5, y, sa.join("\n"));
            y += 1;
        });
        return t.render().join("\n");
    }
};









/**
 * Event type. The list of break/watch points has been updated as a break/watch point
 * has been added or removed. 
 * @type String
 */
Bugz.L_UPDATE_EV = "list-update";

/**
 * Event type. A break/watch point has been updated, i.e. as
 * a mote has added/removed, it has been disabled/enabled.
 * @type String
 */
Bugz.BP_UPDATE_EV = "break-point-update";

/**
 * Event type. A breakpoint/watchpoint has been hit.
 * @type String
 */
Bugz.BP_HIT_EV = "break-point-hit";

/**
 * Event type. A break/watch point has been updated, i.e. as
 * a mote has added/removed, it has been disabled/enabled.
 * @type String
 */
Bugz.WP_UPDATE_EV = "watch-point-update";

/**
 * Event type. A breakpoint/watchpoint has been hit.
 * @type String
 */
Bugz.WP_HIT_EV = "watch-point-hit";


/**
 * Bugz.WatchEvent
 * @class
 * @augments Event
 * @constructor
 * @param evname    Type of event
 * @param id       Break-/Watch-point
 * @param error    Error message if an operation failed
 * @param uniqueid Mote uniqueid in case of hit
 * @param slots    Values originating from watchpoint (SlotInfo,ObjectInfo,ArrayInfo)
 */
Bugz.BugzEvent = function(/** String */evname, /** Bugz.Point */point, /** String */error, /** String */uniqueid, /** Bugz.SlotInfo[] */slots) {
    if (!evname) { evname = Bugz.L_UPDATE_EV; }
    var time = Bugz.getConnection().getLastTimestampAsMicros();
    Event.call(this, Sonoran.EV_CAT_BUGZ, evname, time);
    assert(point||(evname === Bugz.L_UPDATE_EV));
    this.pid = point ? point.getId() : -1;
    this.uniqueid = uniqueid;
    this.error = error;
    this.slots = slots;
    assert(!slots||slots.constructor===Array);
    //Runtime.blockAccess(this, "event");
};

Bugz.BugzEvent.forListUpdate = function() {
    return new Bugz.BugzEvent(Bugz.L_UPDATE_EV);
};


/** Prototype */
Bugz.BugzEvent.prototype = extend(
   Event.prototype,
   /** @lends Bugz.BugzEvent.prototype */
   {
       /** @ignore */
       __constr__: "Bugz.BugzEvent",

       /**
	* @type String
	*/
       error: null,

       /**
	* @type String
	*/
       uniqueid: null,

       /**
	* @type Bugz.Slot[]
	*/
       slots: null,

       /**
	* @type Number
	*/
       pid: -1,

       /**
	* @returns {String}
	*/
       getEvent: function() {
	   assert(false);
	   return this.event;
       },

       /**
	* @returns {String}
	*/
       getError: function() {
	   return this.error;
       },

       /**
	* @returns {String}
	*/
       getUniqueid: function() {
	   return this.uniqueid;
       },

       /**
	* @returns {Sonoran.Mote}
	*/
       getMote: function() {
	   return Sonoran.Registry.lookupMoteByUniqueid(this.uniqueid);
       },

       /**
	* @returns {Bugz.Slot[]}
	*/
       getSlots: function() {
	   return this.slots;
       },

       /**
	* @returns {Number}
	*/
       getPid: function() {
	   return this.pid;
       }
   }
);









/**
 * Bugz.Uniqueid2Result maps a mote uniqueid to a AOP.GenOK/AOP.ERR instance
 * @class
 * @constructor
 * @param motes      Motes
 * @param results    Results
 */
Bugz.Uniqueid2Result = function(/** Sonoran.Mote[] */motes, /** AOP.Result */results) {
    /**
     * Map of Sonoran.Mote unique id to AOP.GenOK instance
     * @type Object 
     */
    this.uniqueid2result = {};
    if (!motes) {
        return;
    }
    assert(results.length==motes.length);
    for (var i = 0; i < motes.length; i++) {
        this.uniqueid2result[motes[i].getUniqueid()] = results[i];
    }
};


/** @private */
Bugz.Uniqueid2Result.prototype = {
    /** @ignore */
    __constr__: "Bugz.Uniqueid2Result",

    /**
     * @returns {Object}
     */
    getResult: function(/** String */uniqueid) {
        return this.uniqueid2result[uniqueid];
    },

    
    /**
     * @return  {Bugz.Uniqueid2Result}
     */
    getSubset: function(/** Sonoran.Mote[] */motes) {
        var uniqueid2result = {};
        var _this = this;
        motes.forEach(function(mote) {
            var uniqueid = mote.getUniqueid();
            var result = _this.uniqueid2result[uniqueid];
            if (result) {
                uniqueid2result[uniqueid] = result;
            }
        });
        var ret = new Bugz.Uniqueid2Result();
        ret.uniqueid2result = uniqueid2result;
        return ret;
    },
    
    /**
     * @returns {String}
     */
    toString: function() {
        var txt = "";
        for (var u in this.uniqueid2result) {
            var result = this.uniqueid2result[u];
            if (result.code != 0) {
                txt += u + "  " + result + "\n";
            } else {
                txt += result.getData() + "\n";
            }
        }
        return txt;
    }
};



