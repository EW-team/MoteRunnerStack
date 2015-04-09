//  (C) COPYRIGHT INTERNATIONAL BUSINESS MACHINES CORPORATION 2006-2010
//                       ALL RIGHTS RESERVED
//        IBM Research Division, Zurich Research Laboratory
// --------------------------------------------------------------------


/**
 * Variable argument list, "category:evname" 0|1, "category:evname" 0|1, ...
 * @returns {Object} halt condition map
 * @private
 */
Bugz.args2conds = function() {
    assert(arguments.length%2===0);
    assert(arguments.length>0);
    var ret = {};
    for (var i = 0; i < arguments.length; i+=2) {
	var name = arguments[i];
	var val = arguments[i+1];
	assert(val===0||val===1);
	ret[name] = val;
    }
    return ret;
};



/**
 * Bugz.Step performs step-into/step-over.
 * @class 
 * @constructor
 * @param mote
 * @param mode
 * @param callback
 */
Bugz.Step = function(/** Sonoran.Mote */mote, /** Number */mode, /** Boolean */ignoreOtherMotes, callback) {
    assert(arguments.length===4);
    /**
     * Debugged mote
     * @type Sonoran.Mote
     * @private
     */
    this.mote = mote;
    /**
     * Debugged saguaro mote implementaion
     * @type Saguaro.MoteImpl
     * @private
     */
    this.impl = Saguaro.mote2impl(mote);
    /**
     * PC before action.
     * @type Bugz.PC
     * @private
     */
    this.pc = null;
    /**
     * Function to return to when step action has finished.
     * @type Function
     * @private
     */
    this.callback = callback;
    /**
     * Stepper mode, OUT, INTO, OVER.
     * @type Number
     * @private
     */
    this.mode = mode;
    assert(mode===Bugz.Step.OUT||mode===Bugz.Step.INTO||mode===Bugz.Step.OVER||mode===Bugz.Step.RESUME);
    /**
     * Ignore breakpoints hit on other motes.
     */
    this.ignoreOtherMotes = ignoreOtherMotes;

    /**
     * @type Number
     * @private
     */
    this.framePushPopCnt = 0;
};



/**
 * @constant
 * @type Number
 * @private
 */
Bugz.Step.OVER = 1;

/**
 * @constant
 * @type Number
 * @private
 */
Bugz.Step.INTO = 2;

/**
 * @constant
 * @type Number
 * @private
 */
Bugz.Step.OUT  = 3;


/**
 * @constant
 * @type Number
 * @private
 */
Bugz.Step.RESUME  = 4;


/** Protoype */
Bugz.Step.prototype = {
    /**
     * Resolve stack
     * @return {Frame[]}
     * @private
     */
    resolveFrames: function() {
        var stack = new Bugz.Stack();
        stack.resolve(this.mote, SCB);
        return stack.getFrames();
    },

    /**
     * @private
     */
    haveStackSource: function(idx) {
	var frames = this.resolveFrames();
	if (frames.length<=idx) {
	    // no stack frame
            return false;
        } 
        var frame = frames[idx];
        var pc = frame.pc;
        if (!pc || !pc.getFile()) {
	    // no source
            return false;
        } 
	return true;
    },



    /**
     * @private
     */
    onMoteDeregister: function(/** Sonoran.Event */ev) {
        if (ev.mote == this.mote) {
            this.close(new AOP.ERR(sprintf("Debugged mote '%s' disappeared", this.mote.getUniqueid())));
        }
    },
    
    /**
     * Returns true if simulation must be continued.
     * @private
     */
    onHaltEvent: function(ev) {
        assert(0);
    },

    
    /**
     * Finish this action. Invoke callback to signal end of operation.
     * @param result
     */
    close: function(/** AOP.OK */result, /** Boolean */_continue) {
        var _this = this;
        if (result.code != 0) {
            Logger.info("Step-Action close with: " + result);
        }
        if (this.callback) {
            Bugz.removeStepper(this);
	    var callback = this.callback;
	    this.callback = null;
	    
	    var conditions = Bugz.args2conds(Saguaro.EV_VM_BCBEFORE, 0, Saguaro.EV_VM_BCAFTER, 0, Saguaro.EV_VM_FRAMESTART, 0, Saguaro.EV_VM_FRAMEEXIT, 0);
	    this.impl.programHaltConditions(conditions, function(status) {
		if (result.code !== 0) {
                    status = result;
		} else {
		    status = new AOP.OK();
		}
		callback(status);
		if (_continue) {
                    Bugz.continueOn(_this.mote, function(result){
			if (result.code != 0) {
                            QUACK(0, "Step.close: continue failed: " + result);
			}
                    });
		}
	    });
        } else {
            QUACK(0, "Step.close: WARNING: closing second time..");
        }
    },


    /**
     * Start the action.
     * @param hconditions  Map of halt conditions to set on start of this step action
     * @returns {Bugz.Step} this
     */
    start: function(hconditions) {
        assert(hconditions);
        var result = Bugz.getCache().getStack(this.mote);
        if (result.code != 0) {
	    var msg = sprintf("Step-Action failed: cannot resolve stack for mote %s:\n%s", this.mote, result);
	    //QUACK(0, msg);
	    result = new AOP.ERR(msg, result);
	    this.close(result);
        } else {
            var stack = result.getData();
            assert(stack);
            this.pc = stack.getPC();
            assert(this.pc);
            result = this.impl.programHaltConditions(hconditions, SCB); 
            if (result.code != 0) {
		this.close(result);
            } else {
		var res = this.impl.getConnection().continueCmd(null, null, null, SCB);
		if (res.code != 0) {
                    this.close(res);
		}
            }
	}
        return this;
    }
};






/**
 * @class
 * @constructor
 * @param mote
 * @param callback
 */
Bugz.Resume = function(/** Sonoran.Mote */mote, /** Boolean */ignoreOtherMotes, callback) {
    assert(arguments.length===3);
    Bugz.Step.call(this, mote, Bugz.Step.RESUME, ignoreOtherMotes, callback);
};

/** @private */
Bugz.Resume.prototype = extend(
    Bugz.Step.prototype,
    /** @lends Bugz.Resume.prototype */
    {
        /**
         * Returns true if simulation must be continued.
         * @private
         */
        onHaltEvent: function(ev) {
	    var evname = ev.getEvName();
            if (!ev.mote) {
                this.close(new AOP.ERR(sprintf("An unrelated halt event happened during stepping: '%s'", evname)));
                return false;
            }
            if (ev.mote!==this.mote) {
		if (this.ignoreOtherMotes && evname === Saguaro.EV_BREAKPOINTS) { 
		    return true;
		} else {
                    this.close(new AOP.ERR(sprintf("An unrelated halt event happened during stepping: '%s' for mote '%s'", evname, ev.mote)));
                    return false;
		}
            }
	    this.close(new AOP.OK());
	    return false;
	},

        /**
         * Start the action.
         * @returns {Bugz.Step} this
         */
        start: function() {
	    var res = this.impl.getConnection().continueCmd(null, null, null, SCB);
	    if (res.code !== 0) {
                this.close(res);
	    }
	    return this;
	}
    }
);




/**
 * @class
 * @constructor
 * @param mote
 * @param callback
 */
Bugz.StepOverInto = function(/** Sonoran.Mote */mote, /** Number */mode, /** Boolean */ignoreOtherMotes, callback) {
    assert(mode===Bugz.Step.OVER||mode===Bugz.Step.INTO);
    assert(arguments.length===4);
    Bugz.Step.call(this, mote, mode, ignoreOtherMotes, callback);
};

/** @private */
Bugz.StepOverInto.prototype = extend(
    Bugz.Step.prototype,
    /** @lends Bugz.StepOverInto.prototype */
    {
        /**
         * Returns true if simulation must be continued.
         * @private
         */
        onHaltEvent: function(ev) {
	    assert(ev.event===undefined);
	    var evname = ev.getEvName();
            if (!ev.mote) {
                this.close(new AOP.ERR(sprintf("An unrelated halt event happened during stepping: '%s'", evname)));
                return false;
            }
            if (ev.mote!==this.mote) {
		if (this.ignoreOtherMotes && evname===Saguaro.EV_BREAKPOINTS) { 
		    //QUACK(0, "StepOverInto: ignore other breakpoint on mote: " + ev.mote);
		    return true;
		} else {
                    this.close(new AOP.ERR(sprintf("An unrelated halt event happened during stepping: '%s' for mote '%s'", evname, ev.mote)));
                    return false;
		}
            }
            switch(evname) {
              case Saguaro.EV_FRAMESTART: {
                  //QUACK(0, "StepOverInto: start-frame ..");
                  assert(this.framePushPopCnt>=0);
                  this.framePushPopCnt += 1;
                  if (this.mode===Bugz.Step.OVER) {
                      //QUACK(0, "StepOverInto: start-frame for step-over");
		      var conditions = Bugz.args2conds(Saguaro.EV_VM_BCBEFORE, 0, Saguaro.EV_VM_BCAFTER, 0, Saguaro.EV_VM_FRAMESTART, 1, Saguaro.EV_VM_FRAMEEXIT, 1);
                      var result = this.impl.programHaltConditions(conditions, SCB); 
                      if (result.code != 0) {
                          this.close(result);
                          return false;
                      }
                  }
                  return true;
              }
              case Saguaro.EV_FRAMEEXIT: {
                  //QUACK(0, "StepOverInto: exit-frame ..");
                  this.framePushPopCnt -= 1;
		  if (this.framePushPopCnt<=0) {
                      if (!this.haveStackSource(1)) {
			  //QUACK(0, "StepOverInto: no source to return to..");
			  this.close(new AOP.OK(), true);
			  return false;
                      }
		  }
                  if (this.framePushPopCnt<=0) {
                      //QUACK(0, "StepOverInto: exit-frame ..");
		      var conditions = Bugz.args2conds(Saguaro.EV_VM_BCBEFORE, 1, Saguaro.EV_VM_BCAFTER, 0, Saguaro.EV_VM_FRAMESTART, 1, Saguaro.EV_VM_FRAMEEXIT, 1);
                      var result = this.impl.programHaltConditions(conditions, SCB);
                      if (result.code != 0) {
                          this.close(result);
                          return false;
                      }
                  }
                  return true;
              }
              case Saguaro.EV_BCBEFORE: {
                  assert(ev.at!==undefined);
                  var _pc = new Bugz.PC(ev.mote, ev.at);
                  var _line = _pc.getLine();
                  var _file = _pc.getFile();
                  //QUACK(0, "StepOverInto: before-bytecode: " + _line + ", " + _file + ", framePushPop " + this.framePushPopCnt);

                  if (this.mode===Bugz.Step.INTO && this.framePushPopCnt>0) { 
		      if (!this.haveStackSource(0)) {
			  this.mode = Bugz.Step.OVER;
			  var conditions = Bugz.args2conds(Saguaro.EV_VM_BCBEFORE, 0, Saguaro.EV_VM_BCAFTER, 0, Saguaro.EV_VM_FRAMESTART, 1, Saguaro.EV_VM_FRAMEEXIT, 1);
			  var result = this.impl.programHaltConditions(conditions, SCB); 
			  if (result.code != 0) {
                              this.close(result);
                              return false;
			  }
			  return true;
		      } 
		      //QUACK(0, "StepOverInto: step into closing as stepped in...");
		      this.close(new AOP.OK());
                      return false;
                  }
                  
                  assert(this.framePushPopCnt<=0);
                  if (this.framePushPopCnt<0) {
                      this.close(new AOP.OK());
                      return false;
                  }
                  this.framePushPopCnt = 0;
                  
                  if (!_file||!_line) {
                      this.close(new AOP.OK(), true);
                      return false;
                  }
                  
                  var line = this.pc.getLine();
                  var file = this.pc.getFile();
                  if (line!=_line || file!=_file) {
                      this.close(new AOP.OK());
                      return false;
                  } else {
                      return true;
                  }
                  assert(0);
              }
              case Saguaro.EV_BREAKPOINTS: {
                  this.close(new AOP.ERR(sprintf("Debugged mote '%s' hit another breakpoint", this.mote.getUniqueid())));
                  return false;
              }
              case Saguaro.EV_EXUNCAUGHT: {
                  this.close(new AOP.ERR(sprintf("Debugged mote '%s' catched an uncaught exception", this.mote.getUniqueid())));
                  return false;
              }
            default:
                this.close(new AOP.ERR(sprintf("Debugged mote '%s' catched another halt event '%s'", this.mote.getUniqueid(), evname)));
                return false;
            }
            assert(0);
        },
        
        /**
         * Start the action.
         * @returns {Bugz.Step} this
         */
        start: function() {
	    var conditions = Bugz.args2conds(Saguaro.EV_VM_BCBEFORE, 1, Saguaro.EV_VM_BCAFTER, 0, Saguaro.EV_VM_FRAMESTART, 1, Saguaro.EV_VM_FRAMEEXIT, 1);
            return Bugz.Step.prototype.start.call(this, conditions);
        }
    }
);





/**
 * @class
 * @constructor
 * @param mote
 * @param callback
 */
Bugz.StepOut = function(/** Sonoran.Mote */mote, /** Boolean */ignoreOtherMotes, callback) {
    assert(arguments.length===3);
    Bugz.Step.call(this, mote, Bugz.Step.OUT, ignoreOtherMotes, callback);
};

/** @private */
Bugz.StepOut.prototype = extend(
    Bugz.Step.prototype,
    /** @lends Bugz.StepOut.prototype */
    {
        /**
	 * Returns true if simulation must be continued.
         * @private
         */
        onHaltEvent: function(ev) {
	    var evname = ev.getEvName();
            if (!ev.mote) {
                this.close(new AOP.ERR(sprintf("An unrelated halt event happened during stepping: '%s'", evname)));
                return false;
            }
            if (ev.mote!==this.mote) {
		if (this.ignoreOtherMotes && evname===Saguaro.EV_BREAKPOINTS) { 
		    //QUACK(0, "StepOut: ignore other breakpoint on mote: " + ev.mote);
		    return true;
		} else {
                    this.close(new AOP.ERR(sprintf("An unrelated halt event happened during stepping: '%s' for mote '%s'", evname, ev.mote)));
                    return false;
		}
            }
            switch(evname) {
              case Saguaro.EV_FRAMESTART: {
                  assert(this.framePushPopCnt>=0);
                  this.framePushPopCnt += 1;
                  return true;
              }
              case Saguaro.EV_FRAMEEXIT: {
                  assert(this.framePushPopCnt>=0);
                  this.framePushPopCnt -= 1;
                  if (this.framePushPopCnt < 0) {
                      if (!this.haveStackSource(1)) {
			  this.close(new AOP.OK(), true);
			  return false;
                      }
		      var conditions = Bugz.args2conds(Saguaro.EV_VM_BCBEFORE, 1, Saguaro.EV_VM_BCAFTER, 0, Saguaro.EV_VM_FRAMESTART, 0, Saguaro.EV_VM_FRAMEEXIT, 0);
                      var result = this.impl.programHaltConditions(conditions, SCB); 
                      if (result.code != 0) {
                          this.close(result);
                          return false;
                      }
                  }
                  return true;
              }
              case Saguaro.EV_BCBEFORE: { 
                  assert(ev.at!=undefined);
                  var _pc = new Bugz.PC(ev.mote, ev.at);
                  var _line = _pc.getLine();
                  var _file = _pc.getFile();
                  //QUACK(0, "StepOut: line " + _line + ", file " + _file + ", framePushPop " + this.framePushPopCnt);
                  assert(this.framePushPopCnt<0);
                  this.close(new AOP.OK());
                  return false;
              }
              case Saguaro.EV_BREAKPOINTS: { 
                  return true;
              }
              case Saguaro.EV_EXUNCAUGHT: { 
                  this.close(new AOP.ERR(sprintf("Debugged mote '%s' catched an uncaught exception", this.mote.getUniqueid())));
                  return false;
              }
            default:
                this.close(new AOP.ERR(sprintf("Debugged mote '%s' catched another halt event '%s'", this.mote.getUniqueid(), evname)));
                return false;
            }
            assert(0);
        },

        
        /**
         * Start the action.
         * @returns {Bugz.Step} this
         */
        start: function() {
	    var conditions = Bugz.args2conds(Saguaro.EV_VM_BCBEFORE, 0, Saguaro.EV_VM_BCAFTER, 0, Saguaro.EV_VM_FRAMESTART, 1, Saguaro.EV_VM_FRAMEEXIT, 1);
            return Bugz.Step.prototype.start.call(this, conditions);
        }

    }
);



