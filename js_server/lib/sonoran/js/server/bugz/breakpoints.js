//  (C) COPYRIGHT INTERNATIONAL BUSINESS MACHINES CORPORATION 2006-2010
//                       ALL RIGHTS RESERVED
//        IBM Research Division, Zurich Research Laboratory
// --------------------------------------------------------------------

/**
 * Bugz.Breakpoints manages breakpoints and watchpoints.
 * @class
 * @constructor
 */
Bugz.Breakpoints = function() {
    this.bid2point = {};
    this.wid2point = {};
    var conditions = Bugz.getSettings().getHaltConditions();
    if (Bugz.conn && !Blob.isEmpty(conditions)) {
        var impls = Bugz.conn.getImpls(); //Saguaro.getSaguaroMotes();
        for (var i = 0; i < impls.length; i++) {
            //var mote = motes[i];
            var result = impls[i].programHaltConditions(conditions, SCB);
            if (result.code!=0) {
                Logger.err(sprintf("Could not set break conditions on new mote '%s': %s", impls[i], result));
            }
        }
    }
};

/** @private */
Bugz.Breakpoints.prototype = {
    /**
     * Map of id (Number) to breakpoint (Bugz.Breakpoint) 
     * @type Object
     */
    bid2point: null,

    /**
     * Map of id (Number) to watchpoint (Bugz.Watchpoint)
     * @type Object
     */
    wid2point: null,
    
    // /**
    //  * Release resources.
    //  */
    // fini: function() {
    //     var descrs = [];
    //     for (var id in this.bid2point) {
    //         var p = this.bid2point[id];
    //         p.del();
    //     }
    // },


    /**
     * Notify about event.
     * @param ev
     */
    notify: function(/** Event */ev) {
	Sonoran.Registry.signalEvent(ev);
    },


    /**
     * React on mote-deregister event.
     * @param ev
     * @private
     */
    onMoteDeregister: function(/** Sonoran.Event */ev) {
        //assert(ev.msgtype==Sonoran.Event.MOTE_DEREGISTER);
        var mote = ev.mote;
        assert(mote);
        for (var id in this.bid2point) { this.bid2point[id].onMoteDeregister(mote); }
        for (var id in this.wid2point) { this.wid2point[id].onMoteDeregister(mote); }
    },
    

    /**
     * React on watchpoint event.
     * @param ev
     * @private
     */
    onWatchpointEvent: function(/** Sonoran.Event */ev) {
    	var evname = ev.getEvName();
        assert(evname==Saguaro.EV_WATCHPOINTS); 
	assert(ev.watchid!==undefined);
        //QUACK(0, "WP: " + evname + ", " + ev.mote + ", " + ev.watchid + ", " + ev.access + ", " + ev.spec);
        var wp = this.wid2point[ev.watchid];
        if (!wp) {
            var msg = sprintf("Unknown watchpoint '%d' on mote %s halted VM", ev.watchid, ev.mote);
            Logger.err(msg);
            return false;
        }
        //wp.onWatchpointEvent(ev);
	assert(ev.watchid == wp.wpid);
	assert(ev.time);
	wp.evalExpr(ev.mote);
	return true;
    },

    /**
     * @param id
     * @returns {Boolean}
     * @private
     */
    isWatchAndBreak: function(/** Number */id) {
	return this.bid2point[id] && this.wid2point[id];

    },


    /**
     * React on breakpoint event.
     * @param ev
     * @returns {Boolean} true when to continue (i.e. watchpoint was hit)
     * @private
     */
    onBreakpointEvent: function(/** Sonoran.Event */ev) {
//QUACK(0, "BP EV: " + ev);
	var evname = ev.getEvName();
        assert(evname === Saguaro.EV_BREAKPOINTS); 
        var mote = ev.mote;
	assert(ev.at);
        var pc = new Bugz.PC(mote, ev.at);
	assert(ev.breakid!==undefined);

	var bp = this.bid2point[ev.breakid];
	assert(bp);
	//assert(bp.hitsPC(pc, mote));
//QUACK(0, "BP EV: " + bp.forWatchpoint());
//QUACK(0, "BP EV: " + bp.getWPId());
	if (bp.forWatchpoint()) {
	    var wp = this.wid2point[bp.getWPId()];
	    wp.onBreakpointEvent(pc, mote, ev);
	    return true;
	} else {
	    bp.notify(new Bugz.BugzEvent(Bugz.P_HIT_EV, bp, null, mote.getUniqueid()));
            return false;
	}
    },


    /**
     * React on asm loaded event
     * @param impl
     * @param asmid
     * @private
     */
    onAsmLoaded: function(/** Sonoran.Mote */mote, /** Number */asmid) {
        assert(asmid!==undefined);
	var impl = Saguaro.mote2impl(mote);
        var asmEntry = impl.getAssemblies().getEntryById(asmid);
        assert(asmEntry);
        for (var id in this.bid2point) { this.bid2point[id].onAsmLoaded(asmEntry, mote); }
        for (var id in this.wid2point) { this.wid2point[id].onAsmLoaded(asmEntry, mote); }
    },

    
    /**
     * React on asm removed event
     * @param ev
     * @private
     */
    onAsmRemoved: function(/** Sonoran.Mote */mote, /** Sonoran.AsmName */asmName) {
        assert(asmName);
        for (var id in this.bid2point) { this.bid2point[id].onAsmRemoved(asmName, mote); }
        for (var id in this.wid2point) { this.wid2point[id].onAsmRemoved(asmName, mote); }
    },


    /**
     * React on watchpoint obsolete debug event.
     * @param ev
     * @private
     */
    onWatchpointObsolete: function(/** Sonoran.Event */ev) {
        var id = ev.watchid;
        var wp = this.wid2point[id];
        if (wp) {
            wp.onWatchpointObsolete(ev);
        }
    },

    


    /**
     * Add breakpoint.
     * @param asmName
     * @param codeLoc
     */
    addBP: function(/** Sonoran.AsmName */asmName, /** String */codeLoc) { 
	if (!asmName) { 	throw new Error("Missing assembly specification"); }
	if (!codeLoc) { 	throw new Error("Missing code location"); }

        var bp = new Bugz.Breakpoint(asmName, codeLoc, true); 
        assert(bp.bpid < 0);

        bp.bpid = this.findId();
        this.bid2point[bp.bpid] = bp;
	this.notify(new Bugz.BugzEvent());

	var motes = Saguaro.lookupMotesByAsmFilter(asmName);
        if (motes.length > 0) {
            var error = bp.addToMotes(motes);
            if (error) {
                bp.del();
                throw error;
            }
        }
        return bp;
    },



    /**
     * Define watchpoint for future uploads.
     * @param asmName    Assembly
     * @param codeLoc    If set, watchpoint is activated when that line is reached (also on future motes), otherwise might be null
     * @param expr       Watchpoint expression
     * @param motes      Might be null or motes where watchpoint should be set right now
     * @returns {Bugz.Watchpoint} the watch point
     */
    addWP: function(/** String */expr, /** Sonoran.Mote[] */motes, /** Sonoran.AsmName */asmName, /** String */codeLoc) {
	var bp;

	if (codeLoc) {
	    bp = this.addBP(asmName, codeLoc);
	    motes = null;
	}

	var wp = new Bugz.Watchpoint(expr, bp, asmName); 
        assert(wp.getWPId() < 0);

	if (!bp) {
	    if (!motes || motes.length===0) {
		if (!asmName) {
		    throw new Error("Missing assembly or motes specification to identify targets for watch-points");
		}
		motes = Saguaro.lookupMotesByAsmFilter(asmName);
		if (motes.length===0) {
		    throw new Error("No targets for watch-point available!");
		}
	    }
	} 

	var wpid = this.findId();
        wp.wpid = wpid;
        this.wid2point[wpid] = wp;
	Sonoran.Registry.signalEvent(new Bugz.BugzEvent());

	if (bp) {
	    bp.setWPId(wpid);
	}


        if (!motes || motes.length > 0) {
            var error = wp.addToMotes(motes);
            if (error) {
                wp.del();
                throw error;
            }
        }

        return wp;
    },


    
    /**
     * Check a point specification. Make sure its target assembly exists and any code location
     * is correct.
     * @throws an exception with error message if breakpoint is not valid
     */
    checkP: function(/** Bugz.Point */p) {
        var asmName = p.getAsmName();
        var codelocSpec = p.getCodeLocSpec();
        if (!codelocSpec) {
            return;
        }
        var conn = Saguaro.Connection.getConnection();
        if (!conn) {
            throw "No saguaro connection available";
        }
        var sdxManager = conn.getSDXManager();
        var sdxFiles = sdxManager.getSDXFilesForAsmFilter(asmName);
        if (sdxFiles.length===0) {
            throw sprintf("No sdx-files loaded into saguaro matching assembly: %s", asmName);
        }
        // TODO: check all sdx files to be mappable!
        var sdxFile = sdxFiles[0];
        var arr = p.getFileAndLine();
        var file = arr[0];
        var line = arr[1];
        var result = conn.sdxMap(sdxFile.asmName, file, line, SCB);
        if (result.code != 0) {
            throw sprintf("Cannot map code line to code offsets for assembly '%s': %s", asmName, result);
        }
	var data = result.getData().getReplyData();
        if (data.length>0 && data[0].matches && data[0].matches.length>0 && data[0].matches[0].codeloc) {
            // a precise match, the break/watch-point looks good
            ;
        } else if (data.length>0 && data[0].matches && data[0].matches.length>0 && (data[0].matches[0].before || data[0].matches[0].after)) {
            var sa = [];
            if (data[0].matches[0].before) {
                sa.push(data[0].matches[0].before.linebeg);
            }
            if (data[0].matches[0].after) {
                sa.push(data[0].matches[0].after.linebeg);
            }
            throw sprintf("Break-/Watch-point location '%s:%d' invalid, nearby lines: %s", file, line, sa.join(","));
        } else {
            throw sprintf("Break-/Watch-point location '%s:%d' invalid, no info for line-number received by 'sdx-map' command.", file, line);
        }
    },
    

    /**
     * Enable/disable breakpoint (just on motes if specified).
     * @param id       Breakpoint id
     * @param motes 
     * @param enable    Optional, if true or false, explicitly sets the mode the breakpoint should be set in    
     * @returns {Bugz.Breakpoint} the break point
     */
    toggleBP: function(/** Number */id, /** Sonoran.Mote[] */motes, /** Boolean */enable) {
	assert(enable!==undefined);
        var bp = this.bid2point[id]  || this.wid2point[id];
        if (!bp) {
            throw "No such break-/watch-point: " + id;
        }
        var error = bp.toggle(motes, enable);
        if (error) {
            throw error;
        }
        return bp;
    },


    /**
     * Configure breakpoint.
     * @param dynamic   Switch on behaviour on asm-loaded events
     */
    configureBP: function(/** Number */id, /** Boolean */dynamic) {
        var bp = this.bid2point[id];
        if (!bp) {
            throw "No such break-/watch-point: " + id;
        }
        assert(dynamic===true||dynamic===false);
        bp.dynamic = dynamic;

        var ev = new Bugz.BugzEvent(Bugz.BP_UPDATE_EV, bp);
	bp.notify(ev);
        //Sonoran.Registry.signalEvent(ev);
    },


    /**
     * Return break-point.
     * @param breakId
     */
    getBP: function(/** Number */breakId) {
        var bp = this.bid2point[breakId];
        if (!bp) {
            throw "No such break-/watch-point: " + breakId;
        }
        return bp;        
    },

    /**
     * Return break-point.
     * @param breakId
     */
    getWP: function(/** Number */wpid) {
        var p = this.wid2point[wpid];
        if (!p) {
            throw "No such break-/watch-point: " + wpid;
        }
        return p;
    },

    
    /**
     * Delete breakpoint/watchpoint.
     * @param id     <0 -> delete all breakpoints
     */
    delP: function(/** Number */id) {
	if (id < 0) {
	    this.delAllPs();
	    return;
	}
        var p = this.bid2point[id] || this.wid2point[id];
        if (!p) {
            throw "No such break-/watch-point: " + id;
        }
        var msg = p.del();
        if (msg) {
            throw msg;
        }
    },


    /**
     * Delete all break and watch points.
     */
    delAllPs: function() {
	for (var id in this.bid2point) { this.delP(id); }
	for (var id in this.wid2point) { this.delP(id); }
    },


    /**
     * Remove breakpoint instance from map of breakpoints.
     * @param bp The breakpoint
     * @private
     */
    removeP: function(/** Bugz.Breakpoint|Bugz.Watchpoint */p) {
        assert(arguments.length==1);
        var bp = this.bid2point[p.getId()];
        if (bp) {
            delete this.bid2point[p.getId()];
	    this.notify(new Bugz.BugzEvent());
        }
        var wp = this.wid2point[p.getId()];
        if (wp) {
            delete this.wid2point[p.getId()];
	    this.notify(new Bugz.BugzEvent());
        }
    },
    
    
    /**
     * Find a free breakpoint id to use.
     * @private
     */
    findId: function() {
	var id = 1;
	while(true) {
	    if (!this.bid2point[id] && !this.wid2point[id]) {
		return id;
	    }
	    id += 1;
	}
    },


    /**
     * @returns {Bugz.BreakList} current set of breakpoints.
     */
    getBreakList: function() {
        return new Bugz.BreakList(Blob.map(this.bid2point));
    },

    /**
     * @returns {Bugz.WatchList} current set of breakpoints.
     */
    getWatchList: function() {
        return new Bugz.WatchList(Blob.map(this.wid2point));
    },


    /**
     * @returns {String}
     */
    toString: function() {
        return Blob.map(this.bid2point).join("\n");
    }
};
