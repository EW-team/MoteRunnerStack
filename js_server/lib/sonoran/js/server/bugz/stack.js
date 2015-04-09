//  (C) COPYRIGHT INTERNATIONAL BUSINESS MACHINES CORPORATION 2006-2010
//                       ALL RIGHTS RESERVED
//        IBM Research Division, Zurich Research Laboratory
// --------------------------------------------------------------------

/**
 * Bugz.Stack encapsulates a stacktrace.
 * @class 
 * @augments Bugz.StackInfo
 * @constructor
 */
Bugz.Stack = function() {
    Bugz.StackInfo.call(this);
};

/** @private */
Bugz.Stack.prototype = extend(
    Bugz.StackInfo.prototype,
    /** @lends Bugz.Stack.prototype */
    {
        /**
         * Resolve current mote stack.
         * @param mote The target mote
         * @param callback
	 * @throws {AOP.Exception}
         */
        resolve: function(/** Sonoran.Mote */mote, /** DFLT_ASYNC_CB */callback) {
	    if (BC.is(callback)) { return BC.exec(arguments.callee, this, arguments); }
            var _this = this;
            this.mote = mote;
            this.frames = [];
            this.pc = null;
	    var impl = Saguaro.mote2impl(mote);
            var resolveLine = function() {
                var pc = _this.pc;
                //QUACK(0, "Stack.resolve: " + pc.getAsmName() + ", " + pc.getFile() + ", " + pc.getLine());
                if (!pc.getFile()) {
                    callback(new AOP.OK(_this));
                } else {
		    var conn = Saguaro.mote2impl(mote).getConnection();
                    conn.sdxLines(pc.getAsmName(), pc.getFile(), pc.getLine(), 0, _this.around, function(result) {
                        if (result.code == 0) {
                            //QUACK(0, "Stack.resolve: " + Util.formatData(result.getReply().data));
			    var data = result.getData().getReplyData();
                            _this.lines = data[0].lines;
                        }
                        callback(new AOP.OK(_this));
                    });
                }
            };
            var resolveFrames = function(data, i) {
                if (i >= data.length) {
                    assert(_this.pc == null);
                    assert(_this.frames.length>0);
                    _this.pc = _this.frames[0].pc;
                    resolveLine();
                    return;
                }
                var at = data[i];
                var locals = [];
                var pc = new Bugz.PC(mote, at); 
                var frame = new Bugz.Frame(mote, i/2, pc, locals);
                if (data[i+1] != null) {
                    for (var j = 0; j < data[i+1].length; j++) {
                        var slot = Bugz.Slot.fromBlob(data[i+1][j]);
                        frame.locals.push(slot);
                    }
                }
                _this.frames.push(frame);
                resolveFrames(data, i+2);
            };
            impl.inspectVMStack(function(result) {
                if (result.code != 0) {
                    callback(result);
                    return;
                }
		var data = result.getData().getReplyData();
	        if(data != null) {
                    if (data.error) {
                        callback(new AOP.ERR(sprintf("Mote '%s' has no/empty stack", mote.getUniqueid())));
                    } else {
                        assert(data.length%2==0);
                        resolveFrames(data, 0);
                    }
                } else {
                    callback(new AOP.ERR(sprintf("Mote '%s' has no/empty stack", mote.getUniqueid())));
                }
            });
        },
        

        /**
         * Find local with name, starting with specified optional frame index.
         * @param inspector
         * @param name
         * @param idx    Optional, frame index
         * @returns {Bugz.Slot[]}
         */
        access: function(/** Bugz.Inspector */inspector, /** String */name, /** Number */idx) {
            if (!idx) { idx = 0; }
            var frames = this.frames;
            var mote = this.mote;
            var nameRE = new RegExp(name + "$");
            var slots = [];
            for (var i = idx; i < frames.length; i++) {
                var locals = frames[i].getLocals();
                for (var j = 0; j < locals.length; j++) {
                    var n = locals[j].getName();
                    if (!n) {
                        continue;
                    }
                    if ((n === name) || (nameRE.test(n))) {
                        slots.push(locals[j]);
                    }
                }
            }
            return slots.map(function(slot) { return slot.resolve(inspector); });
        }
    }
);


