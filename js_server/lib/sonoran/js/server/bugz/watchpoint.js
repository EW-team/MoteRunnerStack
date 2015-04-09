//  (C) COPYRIGHT INTERNATIONAL BUSINESS MACHINES CORPORATION 2006-2010
//                       ALL RIGHTS RESERVED
//        IBM Research Division, Zurich Research Laboratory
// --------------------------------------------------------------------


/**
 * Notify about event.
 * @param ev
 */
Bugz.Watchpoint.prototype.notify = function(/** Event */ev) {
    Sonoran.Registry.signalEvent(ev);
};




/**
 * Toggle breakpoint between enabeld/disabled state or add/remove to/from motes if
 * motes are specified
 * @param motes
 * @param enable   Enable or disable on motes
 * @returns {String} error or null
 */
Bugz.Watchpoint.prototype.toggle = function(/** Sonoran.Mote[] */motes, /** Boolean */enable) {
    assert(enable!==undefined);
    if (!this.enabled) {
	this.enabled = true;
    }
    var error;
    motes =  (motes && motes.length>0) ? motes : null;
    if (enable) {
	error = this.addToMotes(motes);
    } else {
	error = this.removeFromMotes(motes);
    } 
    this.notify(new Bugz.BugzEvent(Bugz.WP_UPDATE_EV, this, error));
    return error;
};


/**
 * Remove this watchpoint from its motes and from manager.
 * @returns {String} error message if operation failed or null on success
 */
Bugz.Watchpoint.prototype.del = function() {
    assert(arguments.length==0);
    var error = this.removeFromMotes(null);
    if (!error) {
	try {
 	    Bugz.getBreakpoints().delP(this.bpid);
 	} catch(ex) {
 	    error = sprintf("Debugger: deleting breakpoint %d after setting watchpoint %d failed:\n%s", this.bpid, this.wpid, ex);
 	}
	if (!error) {
            Bugz.getBreakpoints().removeP(this);
	    this.onDel();
	}
    }
    return error;
};


/**
 * Callback when watchpoint is deleted.
 */
Bugz.Watchpoint.prototype.onDel = function() {};


/**
 * @param mote
 * @returns {String}
 * @private
 */
Bugz.Watchpoint.prototype.mapExpr2WPAccess = function(/** Sonoran.Mote */mote) {
    var result = Bugz.getCache().getStack(mote);
    var stack = result.code==0 ? result.getData() : null;
    var inspector = new Bugz.Inspector(mote, stack);
    var tree = inspector.resolveSlotsTree(this.paths);
    var leafs = tree.getLeafs();
    var slots = leafs.map(function(n) { return n.getData(); });
    if (leafs.length!==1) {
	throw sprintf("Watchpoint expression does not resolve to unique slot: %s: %s", this.expr, slots.join(","));
    }
    var slot = slots[0];
    var parent = leafs[0].getParent();
    if (parent) {
	parent = parent.getData();
    }

    if (!parent) {
        assert(slot.jref);
	return slot.jref;
    }
    if ((slot instanceof Bugz.Object) || (slot instanceof Bugz.Statics)) {
        assert(slot.jref);
        return slot.jref;
    }
    if (slot instanceof Bugz.Array) {
        if (parent instanceof Bugz.Array) {
	    //QUACK(0, "resolveSlot2: " + parent);
	    //QUACK(0, "resolveSlot2: " + slot);
            assert(parent.jref);
	    return parent.jref + '[' + this.paths[this.paths.length-1] + ']';
        } else {
            assert(slot.jref);
	    return slot.jref;
        }
    }
    if ((parent instanceof Bugz.Object) || (parent instanceof Bugz.Statics)) {
        assert(parent.jref);
	return parent.jref+"."+slot.name;
    }
    assert(parent instanceof Bugz.Array);
    assert(parent.jref);
    //QUACK(0, "resolveSlot1: " + parent);
    //QUACK(0, "resolveSlot1: " + slot);
    return parent.jref + "[" + slot.name + "]";
};




/**
 * Set this watchpoint on specified mote.
 * @param mote
 * @param notify   True if listeners should be notified
 * @returns {String} error message if operation failed or null on success
 */
Bugz.Watchpoint.prototype.setWP = function(/** Sonoran.Mote */mote) {
    assert(arguments.length==1);
    //QUACK(0, "Bugz.Watchpoint.prototype.setWP: " + this);

    if (!this.enabled) {
        return null;
    }

    var uniqueid = mote.getUniqueid();
    if (this.uniqueid2mote[uniqueid]) {
        return null;
    }

    var targetSpec;
    try {
	targetSpec = this.mapExpr2WPAccess(mote);
    } catch (x) {
        var msg = sprintf("Disable watchpoint %d as resolving path '%s' on mote %s failed:\n%s", this.wpid, this.expr, uniqueid, x);
        Logger.err(msg);
        this.enabled = false;
        this.notify(new Bugz.BugzEvent(Bugz.WP_UPDATE_EV, this, msg));
        return msg;
    }

    var impl = Saguaro.mote2impl(mote);
    var result = impl.watchPointSet(this.wpid, targetSpec, null, SCB);
    if (result.code != 0) {
        var msg = sprintf("Disable watchpoint %d as setting on mote %s failed:\n%s", this.wpid, uniqueid, result.toString());
        Logger.err(msg);
        this.enabled = false;
        this.notify(new Bugz.BugzEvent(Bugz.WP_UPDATE_EV, this, msg));
        return msg;
    }
    this.uniqueid2mote[uniqueid] = uniqueid;

    // if watchpoint activated by breakpoint, remove it
    if (this.bpid >= 0) {
	msg = Bugz.getBreakpoints().getBP(this.bpid).delBP(mote);
	if (msg) {
	    msg = sprintf("Debugger: deleting breakpoint %d after setting watchpoint %d failed:\n%s", this.bpid, this.wpid, msg);
	    Logger.err(msg);
	}
    }

    this.notify(new Bugz.BugzEvent(Bugz.WP_UPDATE_EV, this));

    try {
	this.evalExpr(mote);
    } catch(ex) {
        var msg = sprintf("Evaluating watchpoint %d after setting on mote %s failed:\n%s", this.wpid, uniqueid, ex);
        Logger.err(msg);
    }

    return null;
};



/**
 * @param mote
 * @returns {String} error message if operation failed or null on success
 * @private
 */
Bugz.Watchpoint.prototype.delWP = function(/** Sonoran.Mote */mote) {
    var uniqueid = mote.getUniqueid();
    var errors = [];
    if (this.uniqueid2mote[uniqueid]) {
	var impl = Saguaro.mote2impl(mote);
        var result = impl.watchPointDel(this.wpid, SCB);
        if (result.code == 0) {
            delete this.uniqueid2mote[uniqueid];
        } else {
            var msg = sprintf("Cannot delete watchpoint %d on mote '%s':\n%s", this.wpid, uniqueid, result);
            Logger.info(msg);
            errors.push(msg);
        }
    }

    // if watchpoint activated by breakpoint, remove it
    if (this.bpid >= 0) {
	msg = Bugz.getBreakpoints().getBP(this.bpid).delBP(mote);
	if (msg) {
	    msg = sprintf("Debugger: deleting breakpoint %d after setting watchpoint %d failed:\n%s", this.bpid, this.wpid, msg);
	    Logger.err(msg);
	}
    }

    var msg = errors.length==0 ? null : errors.join("\n");
    this.notify(new Bugz.BugzEvent(Bugz.WP_UPDATE_EV, this, msg));
    return msg;
}; 



/**
 * Set watch point on set of motes
 * @param motes
 * @returns {String} error or null
 */
Bugz.Watchpoint.prototype.addToMotes = function(/** Sonoran.Mote[] */motes) {
    if (!motes || motes.length==0) {
        motes = Saguaro.lookupMotesByAsmFilter(this.asmName);
    }
    if (motes.length == 0) {
        return null;
    }
    var errors = [];
    var msg;
    for (var i = 0; i < motes.length; i++) {
	if (this.bpid >= 0) {
	    msg = Bugz.getBreakpoints().getBP(this.bpid).setBP(motes[i]);
	} else {
            msg = this.setWP(motes[i]);
	}
        if (msg) {
            errors.push(msg);
        }
    }
    return errors.length==0 ? null : errors.join("\n");
};


/**
 * Delete watchpoint on specified set of motes
 * @param motes
 * @returns {String} error or null
 */
Bugz.Watchpoint.prototype.removeFromMotes = function(motes) {
    if (!motes || motes.length==0) {
        motes = this.getWatchMotes(); //.concat(this.getBreakMotes());
	// if associated with breakpoint, also add all motes breakpoint is active on
    }
    var errors = [];
    for (var i = 0; i < motes.length; i++) {
        var msg = this.delWP(motes[i]);
        if (msg) {
            errors.push(msg);
        }
    }
    return errors.length==0 ? null : errors.join("\n");
};


/**
 * Remove mote from list of motes and delete this mote if unused and it is not a dynamic one.
 * @param mote
 * @private
 */
Bugz.Watchpoint.prototype.onMoteDeregister = function(/** Sonoran.Mote */mote) {
    var uniqueid = mote.getUniqueid();
    if (this.uniqueid2mote[uniqueid]) {
        delete this.uniqueid2mote[uniqueid];
    }
};


/**
 * An asm loaded halt event
 * @param asmName
 * @param mote
 * @private
 */
Bugz.Watchpoint.prototype.onAsmLoaded = function(/** Sonoran.AsmName */asmName, /** Sonoran.Mote */mote) {
    if (this.bpid < 0 && this.asmName.match(asmName)) {
	var msg = this.setWP(mote);
    }
};


/**
 * An asm removed event
 * @param asmName
 * @param mote
 * @private
 */
Bugz.Watchpoint.prototype.onAsmRemoved = function(/** Sonoran.AsmName */asmName, /** Sonoran.Mote */mote) {
    // we do not know in general whether watch-point belongs to this assembly
    return;
};


/**
 * React on watchpoint obsolete debug event.
 * @param ev
 * @private
 */
Bugz.Watchpoint.prototype.onWatchpointObsolete = function(/** Sonoran.Event */ev) {
    var mote = ev.mote;
    assert(mote);
    var uniqueid = mote.getUniqueid();
    if (this.uniqueid2mote[uniqueid]) {
        delete this.uniqueid2mote[uniqueid];
        this.notify(new Bugz.BugzEvent(Bugz.WP_UPDATE_EV, this));
    }
};

/**
 * An breakpoint event. Check whether watchpoint has to bet set.
 * @param pc
 * @param mote
 */
Bugz.Watchpoint.prototype.onBreakpointEvent = function(/** Bugz.PC */pc, /** Sonoran.Mote */mote, /** Sonoran.Event */ev) {
    // associated breakpoint was hit, install watch-point
//QUACK(0, "Bugz.Watchpoint.prototype.onBreakpointEvent...");
    this.setWP(mote);
};





/**
 * Evaluate the expression and return the slots.
 * @param mote
 * @returns {Bugz.Slot[]}
 * @private
 */
Bugz.Watchpoint.prototype.evalExpr = function(/** SOnoran.Mote */mote) {
    var result = Bugz.getCache().getStack(mote);
    var stack = result.code==0 ? result.getData() : null;
    var inspector = new Bugz.Inspector(mote, stack);
    var slots = inspector.resolveSlots(this.expr);
    this.uniqueid2slots[mote.getUniqueid()] = slots;
//QUACK(0, "Bugz.Watchpoint.prototype.evalExpr: " + this.expr + ", " + slots);
    if (slots.length === 0) {
	var msg = sprintf("Expression could not be resolved: '%s'\n", this.expr);
	this.notify(new Bugz.BugzEvent(Bugz.WP_HIT_EV, this, msg, mote.getUniqueid()));
    } else {
	this.notify(new Bugz.BugzEvent(Bugz.WP_HIT_EV, this, null, mote.getUniqueid(), slots));
    }
    return slots;
};

















