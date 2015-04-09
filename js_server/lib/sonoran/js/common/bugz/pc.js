//  (C) COPYRIGHT INTERNATIONAL BUSINESS MACHINES CORPORATION 2006-2010
//                       ALL RIGHTS RESERVED
//        IBM Research Division, Zurich Research Laboratory
// --------------------------------------------------------------------

/**
 * @class Bugz.PC encapsulates a program counter.
 * @constructor
 * @param mote
 * @param at     As returned by saguaro
 */
Bugz.PC = function(/** Sonoran.Mote */mote, /** Object */at) {
    this.mote = mote;
    this.pc = at.pc;
    this.file = at.file;
    //if (this.file) {
//	this.file = File.mappath(this.file);
  //  }
    this.line = at.line;
    if (this.line) {
        this.line = parseInt(this.line);
    }
    this.method = at.method;
    this.methoff = at.methoff;
    this.clsname = at.clsname;
    var matches = this.pc.match(Bugz.PC_REGEXP);
    assert(matches, sprintf("Malformed code location (expecting c:HH/HHHH): '%s'", this.pc));
    this.asmid = parseInt(matches[1], 16);
    this.codeoff = matches[2];
    this.asmname = null;
    var asmentry = Saguaro.mote2impl(mote).getAssemblies().getEntryById(this.asmid);
    if (asmentry == null) {
        var msg = sprintf("Cannot get assembly information for mote '%s' assembly id '%d'", mote.getUniqueid(), this.asmid);
        Logger.warn(msg);
    } else {
        this.asmname = new Sonoran.AsmName(asmentry);
    }
};

/** @private */
Bugz.PC.prototype = {
    /** @ignore */
    __constr__: "Bugz.PC",

    /**
     * @type Sonoran.Mote
     */
    mote: null,
    /**
     * @type Number
     */
    asmid: 0,
    /**
     * @type Sonoran.Asmname
     */
    asmname: null,
    /**
     * @type Number
     */
    codeoff: null,
    /**
     * @type String
     */
    pc: null,
    /**
     * @type String
     */
    file: null,
    /**
     * @type Number
     */
    line: null,
    /**
     * @type String
     */
    method: null,
    /**
     * @type Number
     */
    methoff: null,
    /**
     * @type String
     */
    clsname: null,
    

    /**
     * @returns {Sonoran.AsmName} assembly name.
     */
    getAsmName: function() {
        return this.asmname;
    },


    /**
     * @returns {String} associated line.
     */
    getLine: function() {
        return this.line;
    },


    /**
     * @returns {String} associated file.
     */
    getFile: function() {
        return this.file;
    },


    /**
     * Returns object with properties 'fspec', 'cspec' and 'pc'.
     * @returns {Object}
     */
    getInfo: function() {
        var ret = {
            pc: this.pc,
            fspec: null,
            cspec: null
        };
        if (this.clsname) {
            ret.cspec = this.clsname;
            var sa = ret.cspec.split(/\./);
            if (sa && sa.length>0) {
                ret.cspec = sa[sa.length-1];
            }
            if (this.method) {
                ret.cspec += ":" + this.method;
            }
        }
        if (this.file) {
            var file = this.file;
            var sa = file.split(/\\|\//);
            if (sa && sa.length>0) {
                file = sa[sa.length-1];
            }
            ret.fspec = file;
            if (this.line) {
                ret.fspec += ":" + this.line;
            }
        }
        return ret;
    },
    
    /**
     * @returns {String} string.
     */
    toString: function() {
        var txt = "PC: " + this.pc;
        var info = this.getInfo();
        if (info.cspec) {
            txt += "  " + info.cspec;
        }
        if (info.fspec) {
            txt += "  " + info.fspec;
        }
        if (this.asmname) {
            txt += "  " + this.asmname.identity;
        }
        return txt;
    }
};
