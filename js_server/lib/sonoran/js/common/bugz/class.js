//  (C) COPYRIGHT INTERNATIONAL BUSINESS MACHINES CORPORATION 2006-2010
//                       ALL RIGHTS RESERVED
//        IBM Research Division, Zurich Research Laboratory
// --------------------------------------------------------------------

/**
 * @class Bugz.Class
 * @constructor
 * @param blob   As returned by saguaro
 */
Bugz.Class = function(/** Object */blob) {
    assert(blob.asmIdentity!=undefined);
    this.asmname = new Sonoran.AsmName(blob.asmIdentity);
    assert(this.asmname!=undefined);
    assert(blob.classname!=undefined);
    this.classname = blob.classname;
    this.superclsref = blob.superclsref;
    assert(blob.clsref!=undefined);
    this.clsref = blob.clsref;
    var keys = [ "instIntVars", "instRefVars", "staticIntVars", "staticRefVars" ];
    for (var j = 0; j < keys.length; j++) {
        var k = keys[j];
        assert(blob[k]);
        this[k] = [];
        for (var i = 0; i < blob[k].length; i++) {
            this[k].push(new Bugz.Class.Field(blob[k][i]));
        };
    }
    var keys = [ "instMethods", "staticMethods" ];
    for (var j = 0; j < keys.length; j++) {
        var k = keys[j];
        assert(blob[k]);
        this[k] = [];
        for (var i = 0; i < blob[k].length; i++) {
            this[k].push(new Bugz.Class.Method(blob[k][i]));
        };
    }
};

/** @private */
Bugz.Class.prototype = {
    /** @ignore */
    __constr__: "Bugz.Class",

    /**
     * @type Sonoran.AsmName
     */
    asmname: null,
    /**
     * @type String
     */
    classname: null,
    /**
     * @type String
     */
    superclsref: null,
    /**
     * @type String
     */
    clsref: null,
    /**
     * @type Bugz.Class.Field[]
     */
    instIntVars: null,
    /**
     * @type Bugz.Class.Field[]
     */
    instRefVars: null,
    /**
     * @type Bugz.Class.Field[]
     */
    staticIntVars: null,
    /**
     * @type Bugz.Class.Field[]
     */
    staticRefVars: null,
    /**
     * @type Bugz.Class.Field[]
     */
    constants: null,
    /**
     * @type Bugz.Class.Method[]
     */
    instMethods: null,
    /**
     * @type Bugz.Class.Method[]
     */
    staticMethods: null,

    /**
     * @returns {String}
     */
    toString: function() {
        return this.getInfo();
    },

    /**
     * @returns {Sonoran.AsmName}
     */
    getAsmName: function() {
        return this.asmname;
    },

    /**
     * @returns {String}
     */
    getAsmIdentity: function() {
        return this.asmname.identity;
    },

    /**
     * @returns {String}
     */
    getClassName: function() {
        return this.classname;
    },

    /**
     * @returns {String}
     */
    getClassRef: function() {
        return this.clsref;
    },

    /**
     * @returns {String}
     */
    getSuperClassRef: function() {
        return this.superclsref;
    },
    
    /**
     * @returns {String}
     */
    getInfo: function() {
	var t = new Formatter.Table2(5);
	t.setTitle("Kind", "Name", "Type", "Slot", "Info");
        t.addRow("C", this.classname, this.clsref, this.clsref, this.asmname);
        if (this.instIntVars.length > 0) {
            t.addSeparator();
            this.instIntVars.forEach(function(f) { f.addInfo("Fip", t); });
        }
        if (this.instRefVars.length > 0) {
            t.addSeparator();
            this.instRefVars.forEach(function(f) { f.addInfo("Fir", t); });
        }
        if (this.staticIntVars.length > 0) {
            t.addSeparator();
            this.staticIntVars.forEach(function(f) { f.addInfo("Fsp", t); });
        }
        if (this.staticRefVars.length > 0) {
            t.addSeparator();
            this.staticRefVars.forEach(function(f) { f.addInfo("Fsr", t); });
        }
        if (this.instMethods.length > 0) {
            t.addSeparator();
            this.instMethods.forEach(function(m) { m.addInfo("Mi", t); });
        }
        if (this.staticMethods.length > 0) {
            t.addSeparator();
            this.staticMethods.forEach(function(m) { m.addInfo("Ms", t); });
        }
        return t.render().join("\n");
    }
};






/**
 * Bugz.Class.Field
 * @class 
 * @constructor
 * @param blob     As returned by saguaro
 */
Bugz.Class.Field = function(/** Object */blob) {
    this.name = blob.name;
    assert(this.name);
    this.type = blob.type;
    assert(this.type);
    this.slot = blob.slot;
    assert(this.slot!=undefined);
};

/** @private */
Bugz.Class.Field.prototype = {
    /** @ignore */
    __constr__: "Bugz.Class.Field",

    /**
     * @type String
     */
    name: null,

    /**
     * @type String
     */
    type: null,

    /**
     * @type Number
     */
    slot: null,

    /**
     * @returns {String}
     */
    toString: function() {
        return "Field: " + this.name + ", " + this.type + ", slot " + this.slot;
    },

    /**
     * Add field information to table.
     */
    addInfo: function(/** String */kind, /** Util.Formatter.Table2 */t) {
        t.addRow(kind, this.name, this.type, this.slot, "");
    }
};






/**
 * Bugz.Class.Method
 * @class 
 * @constructor
 * @param blob     As returned by saguaro
 */
Bugz.Class.Method = function(/** Object */blob) {
    this.name = blob.name;
    assert(this.name);
    this.slot = blob.slot;
    assert(this.slot!=undefined);
    this.flag = blob.flag;
    assert(this.flag);
    this.methref = blob.methref;
    assert(this.methref);
    this.codeoff = blob.codeoff;
    assert(this.codeoff);
    this.codelen = blob.codelen;
    assert(this.codelen);
};

/** @private */
Bugz.Class.Method.prototype = {
    /** @ignore */
    __constr__: "Bugz.Class.Method",
    
    /**
     * @type String
     */
    name: null,

    /**
     * @type Number
     */
    slot: null,

    /**
     * @type Number
     */
    flag: null,

    /**
     * @type String
     */
    methref: null,

    /**
     * @type Number
     */
    codeoff: null,

    /**
     * @type Number
     */
    codelen: null,

    /**
     * @returns {String}
     */
    toString: function() {
        return "Method: " + this.name + ", " + this.methref + ", flag " + this.flag + ", slot " + this.slot + ", off " + this.codeoff + ", len " + this.codelen;
    },

    /**
     * Add method information to table.
     * @param kind
     * @param t
     */
    addInfo: function(/** String */kind, /** Util.Formatter.Table2 */t) {
        t.addRow(kind, this.name, this.methref, this.slot, "flag:" + this.flag + ";off:" + this.codeoff + ";len:" + this.codelen);
    }
};




