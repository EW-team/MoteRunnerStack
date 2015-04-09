//  (C) COPYRIGHT INTERNATIONAL BUSINESS MACHINES CORPORATION 2006-2010
//                       ALL RIGHTS RESERVED
//        IBM Research Division, Zurich Research Laboratory
// --------------------------------------------------------------------



/**
 * Caches stacks, classes and listings for Bugz.
 * @class
 * @constructor
 */
Bugz.Cache = function() {
    this.uniqueid2stacks = {};
    this.conn2asmid2name2class = {};
};

/** @prototype */
Bugz.Cache.prototype = {
    /**
     * Map of uniqueid to ok/err of resolving stack
     * @type Object
     */
    uniqueid2stacks: null,

    /**
     * Map of connection name to assembly identity to class name to Bugz.Class.
     * @type Object
     */
    conn2asmid2name2class: null,

    
    /**
     * Delete stacks on halt event.
     * @private
     */
    onHaltEvent: function(ev) {
        this.uniqueid2stacks = {};
    },

    
    /**
     * Delete stacks on start event.
     * @private
     */
    onStartEvent: function(ev) {
        this.uniqueid2stacks = {};
    },


    /**
     * A mote has disappeared.
     * @private
     */
    onMoteDeregister: function(ev) {
        //assert(ev.msgtype == Sonoran.Event.MOTE_DEREGISTER);
        var uniqueid = ev.mote.getUniqueid();
        delete this.uniqueid2stacks[uniqueid];
    },


    /**
     * A connection has disappeared.
     * @private
     */
    onSaguaroDisconnect: function(ev, conn) {
        delete this.conn2asmid2name2class[conn.toString()];
    },


    /**
     * @returns {AOP.OK|AOP.ERR} result of stack resolve operation or null, getData delivers Bugz.Stack
     */
    getStack: function(/** Sonoran.Mote */mote) {
        var uniqueid = mote.getUniqueid();
        var result = this.uniqueid2stacks[uniqueid];
	if (result && result.code===0) {
            return result;
        }
        var stack = new Bugz.Stack();
        result = stack.resolve(mote, SCB);
        this.uniqueid2stacks[uniqueid] = result;
        return result;
    },


    /**
     * @returns {Bugz.Uniqueid2Result} map of uniqueid to stack resolve result (AOP.OK|AOP.ERR}
     */
    getStacks: function(/** Sonoran.Mote[] */motes) {
        var _this = this;
        var results = motes.map(function(mote) { return _this.getStack(mote); });
        return new Bugz.Uniqueid2Result(motes, results);
    },



    /**
     * Load class info.
     * @param classname
     * @param asmName
     * @param mote
     * @returns {Bugz.Class[]}
     */
    loadClasses: function(/** String */classname, /** Sonoran.AsmName */asmName, /** Sonoran.Mote */mote) {
        assert(arguments.length==3);
        assert(mote);
        var clazzes = this.lookupClasses(classname, asmName);
        if (clazzes.length>0) {
            return clazzes;
        }
        var conn = mote.getConnection();
        var asmIdentity = asmName ? asmName.identity : null;
        var result = conn.sdxClass(classname, asmIdentity, SCB);
        if (result.code != 0) {
            throw "Cannot load class: " + result;
        }
        var reply = result.getData().getReply();
        var data = reply.data;
        if (!data || data.length==0) {
            return [];
        }
        for (var i = 0; i < data.length; i++) {
            var clazz = new Bugz.Class(data[i]);
            var connkey = conn.toString();
            var asmkey = clazz.asmname.identity;
            if (!this.conn2asmid2name2class[connkey]) {
                this.conn2asmid2name2class[connkey] = {};
            }
            if (!this.conn2asmid2name2class[connkey][asmkey]) {
                this.conn2asmid2name2class[connkey][asmkey] = {};
            }
            this.conn2asmid2name2class[connkey][asmkey][clazz.classname] = clazz;
        }
        return this.lookupClasses(classname, asmName);
    },


    /**
     * Lookup class
     * @param mote
     * @param asmname
     * @param classname
     * @returns {Bugz.Class[]}
     */
    lookupClasses: function(/** String */classname, /** Sonoran.AsmName */asmName) {
        var ret = [];
        var re = new RegExp(RegExp.escape(classname)+"$");
        if (!asmName) {
            for (var conn in this.conn2asmid2name2class) {
                var asmid2name2class = this.conn2asmid2name2class[conn];
                for (var asmid in asmid2name2class) {
                    var name2class = asmid2name2class[asmid];
                    for (var n in name2class) {
                        var c = name2class[n];
                        if (re.test(n)) {
                            ret.push(c);
                        }
                    }
                }
            }
        } else {
            for (var conn in this.conn2asmid2name2class) {
                var asmid2name2class = this.conn2asmid2name2class[conn];
                var name2class = asmid2name2class[asmName.identity];
                if (!name2class) {
                    return null;
                }
                for (var n in name2class) {
                    var c = name2class[n];
                    if (re.test(n)) {
                        ret.push(c);
                    }
                }
            }
        }
        return ret;
    },

    
    /**
     * Release resources.
     */
    fini: function() {
        this.uniqueid2stacks = {};
    }
};

