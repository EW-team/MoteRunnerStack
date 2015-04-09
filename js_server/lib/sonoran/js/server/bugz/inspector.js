//  (C) COPYRIGHT INTERNATIONAL BUSINESS MACHINES CORPORATION 2006-2010
//                       ALL RIGHTS RESERVED
//        IBM Research Division, Zurich Research Laboratory
// --------------------------------------------------------------------


/**
 * @class Bugz.Inspector
 * @constructor
 * @param mote
 * @param stack
 */
Bugz.Inspector = function(/** Sonoran.Mote */mote, /** Bugz.Stack */stack) {
    assert(mote);
    /**
     * @type Sonoran.Mote
     */
    this.mote = mote;
    /**
     * @type Bugz.Stack
     */
    this.stack = stack;
};

/**
 * Array access conforms to this regexp.
 * @type String
 */
Bugz.Inspector.ARRAY_ACCESS_REGEXP = /(\d+)(-(\d+)?)?/;


/**
 * Access conforms to this regexp.
 * @type RegExp
 * @private
 */
Bugz.Inspector.PATH_ACCESS_REGEXP = /^([\w\d_]+)(\[((\d+)(-(\d+)?)?)\])?(\.)?/;

/**
 * Parse an access expression such as (variable.field1.field2[n]) to an
 * array of access specifiers. Each specifier is either a String or
 * Number (in case of array access).
 * @param expr
 * @returns {String[]}
 * @static
 */
Bugz.Inspector.parseExpr = function(/** String */expr) {
    var paths = [];
    var seg = expr.trim();
    var md;
    var md1 = /^a\:\d+\.?/.exec(seg);
    var md2 = /^r\:[0-9a-fA-F]{4}\.?/.exec(seg);
    var md3 = /^(.+)\-(\d+|#)\.(#|(\d+)(\+))?\.?/.exec(seg);
    if (md1 || md2 || md3) {
        var md = (md1) ? md1 : (md2 ? md2 : md3);
        paths.push(seg.substr(0, md[0].length));
        seg = seg.substring(md[0].length);
        if (!seg || seg.length==0) {
            return paths;
        }
    }

    var re = Bugz.Inspector.PATH_ACCESS_REGEXP;
    while(true) {
        var md = re.exec(seg);
        if (!md) {
            throw sprintf("Invalid path in expression: '%s' %s'", expr, seg);
        }
        var matched = md[0];
        seg = seg.substring(matched.length);
        paths.push(md[1]);
        if (md[3]) {
            paths.push(md[3]);
        }
        if (md[7]) {
            // we got the dot
        } else {
            if (!seg.length==0) {
                throw sprintf("Invalid path in expression: '%s' %s'", expr, seg);
            }
            break;
        }
    }
    //QUACK(0, "PATHS: " + paths.join("->"));
    return paths;
};


/** Prototype */
Bugz.Inspector.prototype = {
    /**
     * @returns {String} string
     */
    toString: function() {
        return "DebuggerInspector:" + this.mote.getUniqueid();
    },


    /**
     * @returns {Sonoran.Mote} mote
     */
    getMote: function() {
        return this.mote;
    },


    /**
     * @param expr The access expression such as 'name.field[0]' or array or path elements
     * @returns {Bugz.Slot[]} All slots being resolved for specified expression
     */
    resolveSlots: function(/** String|String[] */expr) {
	var slots = this.resolveSlotsTree(expr).getLeafs().map(function(n) { return n.getData(); });
	assert(slots.length===0||slots[0].constructor!==Array);
	return slots;
    },



    /**
     * @param expr The access expression such as 'name.field[0]' or array or path elements
     * @returns {Bugz.Slot[]} All slots being resolved for specified expression
     */
    resolveSlotsTree: function(/** String|String[] */expr) {
	var paths = typeof(expr)==='string' ?  Bugz.Inspector.parseExpr(expr) : expr;
	var initial = paths[0];

	var tree = new Util.Tree();

	var matches = /^(.+)\-(\d+|#)\.(#|(\d+)(\+))?/.exec(initial);

	if (matches) {

	    var identity = initial.substr(0, matches[0].length);
	    var impl = Saguaro.mote2impl(this.mote);
	    var entries = impl.getAssemblies().getMatchingEntries(new Sonoran.AsmName(identity));
	    if (entries.length!==1) {
		throw new Exception("Cannot resolve assembly name: " + identity);
	    }
            tree.addChild(this.resolveAssembly(entries[0].getId()));

	} else if ((matches = /^a\:(\d+)/.exec(initial))) {

	    var asmid = parseInt(matches[1]);
	    tree.addChild(this.resolveAssembly(asmid));

	} else if ((matches = /^r\:([0-9a-fA-F]+)/.exec(initial))) {

	    tree.addChild(this.resolveObject(initial));
	    
	} else {
		    
	    if (this.stack) {
		this.stack.access(this, initial, 0).forEach(function(slot) {
		    tree.addChild(slot);
		});
	    }
	    var clazzes = Bugz.getCache().loadClasses(initial, undefined, this.mote);
	    for (var i = 0; i < clazzes.length; i++) {
		tree.addChild(this.resolveStatics(clazzes[i]));
	    }

	}

	if (tree.getChildren().length===0) {
	    throw sprintf("Could not resolve expression: %s", initial);
	}

	for (var i = 1; i < paths.length; i++) {
	    var nodes = tree.getLeafs();
            for (var j = 0; j < nodes.length; j++) {
		var node = nodes[j];
		var slot = node.getData();
		slot.access(this, paths[i]).forEach(function(slot) {
		    node.addChild(slot);
		});
            }
        }
	
	//QUACK(0, "TREE: " + tree);
	return tree;
    },


    
    /**
     * @param jref
     * @returns {Bugz.Object}
     */
    resolveObject: function(/** String */jref) {
	if (jref == Bugz.NULL_REF) {
	    throw "Object reference is NULL";
	}
	//QUACK(0, "Inspector.resolveObject: " + jref);
	var impl = Saguaro.mote2impl(this.mote);
        var result = impl.inspectObject(jref, undefined, SCB);
        if (result.code != 0) {
            throw sprintf("Mote '%s' cannot inspect object %s: %s", this.mote, jref, result);
        }
	var data = result.getData().getReplyData();
	//QUACK(0, "Inspector.resolveObject: " + Util.formatData(result.getReply().data));
        if (data.length != 1) {
            throw sprintf("Mote '%s' cannot inspect object %s: unexpected response '%s'", this.mote, jref, Util.formatData(data));
        }
        data = data[0];
        if (data.error) {
            throw sprintf("Mote '%s' cannot inspect object %s: %s", this.mote, jref, data.error);
        }
        if (data.type && /\[\]$/.test(data.type)) {
            // its an array, resolve that fully
            return this.resolveArray(jref);
        } else {
            return new Bugz.Object(data);
        }
    },
    

    /**
     * @param asmid
     * @returns {Bugz.Statics}
     */
    resolveAssembly: function(/** Number */asmid) {
	//QUACK(0, "Inspector.resolveAssembly: " + asmid);
        var mote = this.mote;
        var jref = Saguaro.getMoteAssemblyObject(mote, asmid);
	if (jref == Bugz.NULL_REF) {
	    return Bugz.Object4Null();
	}
	//QUACK(0, "Inspector.resolveAssembly: " + jref);
	var impl = Saguaro.mote2impl(this.mote);
        var result = impl.inspectObject(jref, undefined, SCB);
        if (result.code !== 0) {
            throw sprintf("Mote '%s' cannot inspect object %s: %s", mote, jref, result);
        }
	//QUACK(0, "Inspector.resolveAssembly: " + Util.formatData(result.getReply().data[0]));
        return new Bugz.Statics(result.getData().getReplyData()[0]);
    },

    
    /**
     * @param clazz
     * @returns {Bugz.Statics}
     */
    resolveStatics: function(/** Bugz.Class */clazz) {
        var result;
        var mote = this.mote;
        var impl = Saguaro.mote2impl(mote);
        var listing = impl.getAssemblies();
        var asmName = clazz.getAsmName();
        var entries = listing.getMatchingEntries(asmName);
        if (entries==null || entries.length==0) {
            throw sprintf("Mote '%s' has no such assembly: %s", mote, asmName);
        }
        assert(entries.length==1);
        var asmEntry = entries[0];
        return this.resolveAssembly(asmEntry.getId());
    },

    
    /**
     * @param jref
     * @returns {Bugz.Array}
     */
    resolveArray: function(/** String */jref) {
	if (jref == Bugz.NULL_REF) {
	    throw "Array reference is NULL";
	}
	//if (/[rd]\:0000\[\]/.test(jref)) {
	  //  throw "Array reference is NULL";
	//}
	var impl = Saguaro.mote2impl(this.mote);
        var result = impl.inspectObject(jref, [[0,-1]], SCB);
        if (result.code != 0) {
            throw sprintf("Mote '%s' cannot inspect object %s: %s", this.mote, jref, result);
        }
        //QUACK(0, "resolveArray: jref " + jref + ", data " + Util.formatData(result.getData()));
	var data  = result.getData().getReplyData()[0];
	if (data.error) {
	    //QUACK(0, "resolveArray: jref " + jref + ", data " + Util.formatData(result.getData()));
            throw sprintf("Mote '%s' cannot inspect object %s: %s", this.mote, jref, data.error);
	}
        return new Bugz.Array(data); //result.getData().getReplyData()[0]);
    },



    /**
     * @param del
     * @returns {Bugz.DelegateInfo}
     */
    resolveDelegate: function(/** String */del) {
	if (del === Bugz.NULL_DEL) { ///d\:0000/.test(del)) {
	    throw "Delegate reference is NULL";
	}
	var impl = Saguaro.mote2impl(this.mote);
        var result = impl.inspectDelegate(del, SCB);
        if (result.code != 0) {
            throw sprintf("Mote '%s' cannot inspect delegate %s: %s", this.mote, del, result);
        }
        //QUACK(0, "resolveDelegate: jref " + jref + ", data " + Util.formatData(result.getData()));
	var data  = result.getData().getReplyData()[0];
	if (data.error) {
	    //QUACK(0, "resolveArray: jref " + jref + ", data " + Util.formatData(result.getData()));
            throw sprintf("Mote '%s' cannot inspect object %s: %s", this.mote, jref, data.error);
	}
        return new Bugz.DelegateInfo(data); //result.getData().getReplyData()[0]);
    }

};
