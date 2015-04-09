//  (C) COPYRIGHT INTERNATIONAL BUSINESS MACHINES CORPORATION 2006-2010
//                       ALL RIGHTS RESERVED
//        IBM Research Division, Zurich Research Laboratory
// --------------------------------------------------------------------


/**
 * @param motes Motes array or null
 * @returns {String} error message or null
 * @private
 */
Bugz.Breakpoint.prototype.removeFromMotes = function(/** Sonoran.Mote[] */motes) {
    if (!motes || motes.length==0) {
        motes = this.getBreakMotes();
    }
    var errors = [];
    for (var i = 0; i < motes.length; i++) {
        var mote = motes[i];
        var uniqueid = mote.getUniqueid();
        var result = Saguaro.mote2impl(mote).breakPointDel(this.bpid, SCB);
        var msg = null;
        if (result.code == 0) {
            delete this.uniqueid2mote[uniqueid];
        } else {
            msg = sprintf("Cannot delete breakpoint on mote '%s':\n%s", uniqueid, result);
            errors.push(msg);
        }
    }
    return errors.length==0 ? null : errors.join("\n");
};


/**
 * @param motes
 * @returns {String} error message or null
 * @private
 */
Bugz.Breakpoint.prototype.addToMotes = function(/** Sonoran.Mote[] */motes) {
    if (!motes || motes.length==0) {
        motes = Saguaro.lookupMotesByAsmFilter(this.getAsmName());
    }
    if (motes.length == 0) {
        return null;
    }
    var errors = [];
    for (var i = 0; i < motes.length; i++) {
        var msg = this.setBP(motes[i]);
        if (msg) {
            errors.push(msg);
        }
    }
    return errors.length==0 ? null : errors.join("\n");
};


/**
 * Remove mote from list of motes this bp is installed on. 
 * @param mote
 * @private
 */
Bugz.Breakpoint.prototype.onMoteDeregister = function(/** Sonoran.Mote */mote) {
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
Bugz.Breakpoint.prototype.onAsmLoaded = function(/** Sonoran.AsmName */asmName, /** Sonoran.Mote */mote) {
    if (!this.isEnabled() || !this.isDynamic() || !this.asmName.match(asmName)) {
        return;
    }
    var msg = this.setBP(mote);
};


/**
 * Remove mote from list of motes this bp is installed on. if assembly is target assembly.
 * @param asmName
 * @param mote
 * @private
 */
Bugz.Breakpoint.prototype.onAsmRemoved = function(/** Sonoran.AsmName */asmName, /** Sonoran.Mote */mote) {
    if (!this.asmName.match(asmName)) {
        return;
    }
    var uniqueid = mote.getUniqueid();
    if (this.uniqueid2mote[uniqueid]) {
        delete this.uniqueid2mote[uniqueid];
        this.notify(new Bugz.BugzEvent(Bugz.BP_UPDATE_EV, this));
    }
};




/**
 * Toggle breakpoint between enabeld/disabled state or add/remove to/from motes if
 * motes are specified
 * @param motes
 * @param enable   Enable or disable on motes
 * @returns {String} error or null
 */
Bugz.Breakpoint.prototype.toggle = function(/** Sonoran.Mote[] */motes, /** Boolean */enable) {
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
    this.enabled = enable;
    this.notify(new Bugz.BugzEvent(Bugz.BP_UPDATE_EV, this, error));
    return error;
};


/**
 * Remove this breakpoint on its motes and from manager.
 * @returns {String} error message if operation failed or null on success
 */
Bugz.Breakpoint.prototype.del = function() {
    assert(arguments.length==0);
    var error = this.removeFromMotes(null);
    if (!error) {
        Bugz.getBreakpoints().removeP(this);
	this.onDel();
    }
    return error;
};


/**
 * Callback when breakpoint is deleted.
 */
Bugz.Breakpoint.prototype.onDel = function() {};


/**
 * Notify about event.
 * @param ev
 */
Bugz.Breakpoint.prototype.notify = function(/** Event */ev) {
    Sonoran.Registry.signalEvent(ev);
};


/**
 * Set this breakpoint on specified mote.
 * @param mote
 * @returns {String} error message if operation failed or null on success
 */
Bugz.Breakpoint.prototype.setBP = function(/** Sonoran.Mote */mote) {
    assert(arguments.length==1);
    if (!this.enabled) {
        return null;
    }
    
    var uniqueid = mote.getUniqueid();
    if (this.uniqueid2mote[uniqueid]) {
        return null;
    }
    
    var result = Saguaro.mote2impl(mote).breakPointSet(this.bpid, this.getBreakLoc(), SCB);
    var msg;
    if (result.code == 0) {
        this.uniqueid2mote[uniqueid] = uniqueid;
        msg = null;
    } else {
        msg = sprintf("Setting breakpoint %d on mote %s failed:\n%s", this.bpid, uniqueid, result.toString());
        Logger.info(msg);
        this.enabled = false;
    }
    this.notify(new Bugz.BugzEvent(Bugz.BP_UPDATE_EV, this, msg));
    return msg;
};


/**
 * Delete this breakpoint on specified mote.
 * @param mote
 * @returns {String} error message if operation failed or null on success
 */
Bugz.Breakpoint.prototype.delBP = function(/** Sonoran.Mote */mote) {
    this.enabled = true;
    //if (!this.enabled) {
    //  return null;
    //}
    
    var uniqueid = mote.getUniqueid();
    if (!this.uniqueid2mote[uniqueid]) {
        return null;
    }

    var impl = Saguaro.mote2impl(mote);
    var result = impl.breakPointDel(this.bpid, SCB);
    var msg;
    if (result.code == 0) {
        delete this.uniqueid2mote[uniqueid];
        msg = null;
    } else {
        msg = sprintf("Deleting breakpoint %d on mote %s failed:\n%s", this.bpid, uniqueid, result.toString());
        Logger.info(msg);
        this.enabled = false;
    }
    this.notify(new Bugz.BugzEvent(Bugz.BP_UPDATE_EV, this, msg));
    return msg;
};



// /**
//  * Has mote our assembly loaded?
//  * @param mote
//  * @returns {Boolean}
//  */
// Bugz.Breakpoint.prototype.hasTargetAssembly = function(/** Sonoran.Mote */mote) {
//     var asmEntry = Saguaro.getMoteAssemblyEntry(mote, this.asmName);
//     return asmEntry != null;
// };

        
     




























