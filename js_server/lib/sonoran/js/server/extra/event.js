//  (C) COPYRIGHT INTERNATIONAL BUSINESS MACHINES CORPORATION 2006-2010
//                       ALL RIGHTS RESERVED
//        IBM Research Division, Zurich Research Laboratory
// --------------------------------------------------------------------




/************************************************************************************************************************
/
/ Event.Queue:  allows to buffer and receive events distributed by Event.Registry in a blocking fashion.
/
 ************************************************************************************************************************/



Class.define(
   "Event.Queue",
   /**
    * @lends Event.Queue.prototype
    */
   {
      /**
       * Event.Queue allows to buffer and receive events distributed by Event.Registry in a blocking fashion.
       * Create the queue and call recv to block for a certain amount of time or until an event is received.
       * @constructs
       * @param msgtypes              Array of event 'msgtype' properties
       * @param size                  Optional, size of internal event queue
       * @param drop                  Optional, number of events to drop when internal event queue is full
       */
      __constr__: function(/** String[] */msgtypes, /** Number */size, /** Number */drop) {
         this.queue = new Thread.Queue("Event.Queue", size ? size : 512, true, drop ? drop : 32);
          this.listener = Event.Registry.addFilterForMsgTypes(this.onEvent.bind(this), msgtypes);
      },

      /**
       * Registry event listener
       * @type Function
       * @private
       */
      listener: null,

      /**
       * Thread queue
       * @type Thread.Queue
       * @private
       */
      queue: null,

      /**
       * An event is ready to pickup without blocking?
       * @returns {Boolean} flag
       */
      canRecv: function() {
         return !this.queue.isEmpty();
      },

      /**
       * Has been closed?
       * @returns {Boolean}
       */
      isClosed: function() {
         return this.queue.isClosed();
      },

      /**
       * Receive an event.
       * @param timeout Timeout in milliseconds, optional
       * @returns {Event}
       * @throws {IO.Exception} exception, possibly with ERR_RESOURCE_GONE when queue was closed
       * @throws {Timer.Exception} on timeout
       */
      recv: function(/** Number */timeout) {
          return this.queue.get(timeout);
      },

      /**
       * Close queue. Any waiter is woken up and returns with exception.
       */
      close: function() {
         this.queue.close();
          Event.Registry.removeFilter(this.listener);
          this.listener = null;
      },
      
      /**
       * Add to queue.
       * @private
       */
      onEvent: function(/** Event */ev) {
         this.queue.put(ev);
      },

      /**
       * @returns {String} a string
       */
      toString: function() {
         return "Event.Qeueue";
      }
   }
);












/************************************************************************************************************************
/
/ Event.History: keeps searchable event history
/
 ************************************************************************************************************************/




/**
 * Event.History keeps a history of events.
 * @class
 * @constructor
 * @param capacity
 * @private
 */
Event.History = function(/** Number */capacity) {
    var _this = this;
    if (!capacity) {
        capacity = 1024;
    }
    this.notSeenMap = {};
    this.notSeenCnt = 0;
    
    var buf = this.buf = new Util.RingBuffer(capacity, 2);
    /** @ignore */
    buf.releaseOne = function() {
        assert(0);
    };
    /** @ignore */
    buf.releaseMany = function(cnt) {
        var id1 = buf.getFirst().id;
        var id2 = buf.get(cnt-1).id;
        for (var i = id1; i <= id2; i++) {
            if (_this.notSeenMap[i]) {
                delete _this.notSeenMap[i];
                _this.notSeenCnt -= 1;
                assert(_this.notSeenCnt >= 0);
            }
        }
        Util.RingBuffer.prototype.releaseMany.call(this, cnt);
    };
    /** @ignore */
    var func = function(ev) {
	if (Event.isTimerEvent(ev)) {
	    return;
	}
	if (Event.History.CAT_BLACKLIST[ev.category]) {
            return;
        }
	_this.buf.add(ev);
        _this.notSeenMap[ev.id] = ev;
        _this.notSeenCnt += 1;
    };
    this.listener = Event.Registry.addObserver(func);
};

/**
 * @type String[]
 * @private
 */
Event.History.CAT_BLACKLIST = {};
Event.History.CAT_BLACKLIST[Event.EV_CAT_TIMER] = true;
Event.History.CAT_BLACKLIST[Event.EV_CAT_LOG] = true;

/** @private */
Event.History.prototype = {
    /**
     * @type Util.RingBuffer
     * @private
     */
    buf: null,

    /**
     * @type Object
     * @private
     */
    notSeenMap: null,

    /**
     * @type Number
     * @private
     */
    notSeenCnt: 0,

    /**
     * Registry listener
     * @type Util.Listeners
     * @private
     */
    listener: null,
    
    /**
     * @returns {Number}  a marker for last log entry.
     * @private
     */
    getMarker: function() {
        return (this.buf.getUsed()==0) ? 0 : this.buf.getLast().id;
    },

    /**
     * @returns {Number} number of events not yet seen
     * @private
     */
    getNotSeenCount: function() {
        return this.notSeenCnt;
    },

    /**
     * Set all events having been seen.
     * @private
     */
    resetNotSeenCnt: function() {
        this.notSeenCnt = 0;
        this.notSeenMap = {};
    },

    /**
     * Clear history.
     * @private
     */
    reset: function() {
        this.notSeenMap = {};
        this.notSeenCnt = 0;
        this.buf.removeAll();
    },

    /**
     * Close this history buffer. Stop recording events.
     * @private
     */
    close: function() {
        Event.Registry.removeListener(this.listener);
        this.buf = null;
        this.notSeenCnt = 0;
        this.notSeenMap = null;
    },
    
    /**
     * Match entries against filter and return result set.
     * @param cnt       Maximum number of events to return
     * @param marker    Stop when this marker is reached
     * @param filter
     * @private
     */
    filter: function(/** Number */cnt, /** Number */marker, /** Event.Filter */filter) {
        var set = new Event.Set();
        assert(filter);
        if (cnt==undefined) {
	    cnt = this.buf.getUsed();
        }
        if (this.buf.getUsed() < cnt) {
	    cnt = this.buf.getUsed();
        }
        if (cnt==0) {
	    return set;
        }
        var pos = this.buf.getUsed()-1;
        //var entries = [];
        while(cnt>0 && pos>=0) {
	    var entry = this.buf.get(pos);
            if (marker && entry.id == marker) {
                break;
            }
            if (filter.match(entry, set)) {
	        //entries.push(entry);
                if (this.notSeenMap[entry.id]) {
                    this.notSeenCnt -= 1;
                    assert(this.notSeenCnt >= 0);
                    delete this.notSeenMap[entry.id];
                }
	        cnt -= 1;
            }
	    pos -= 1;
        }
        return set;
    },

    /**
     * Find event matching given PropertyFilter.
     * @param filter
     * @private
     */
    find: function(/** Util.PropertyFilter */filter) {
        var pos = this.buf.getUsed()-1;
        while(pos>=0) {
	    var entry = this.buf.get(pos);
            if (filter.match(entry)) {
                return entry;
            }
            pos -= 1;
        }
        return null;
    },


    /**
     * @returns {String} string
     * @private
     */
    toString: function() {
        return "Event.History";
    }
};




/**
 * Event.Filter filters events from Event.History
 * @class
 * @constructor
 * @param tags
 * @param intervals
 * @private
 */
Event.Filter = function(/** String[] */tags, /** Object */intervals) {
    /**
     * Tags to match in events
     * @type String[]
     * @private
     */
    this.tags = (tags&&tags.length>0) ? tags : null;
      /**
     * Array of intervals to match, each entry is an object with start and end properties (microseconds).
     * @type Object[]
     * @private
     */
    this.intervals = (intervals&&intervals.length>0) ? intervals : null;
};

/** @private */
Event.Filter.prototype = {
    /**
     * Configure tags for this filter.
     * @param tags
     * @private
     */
    setTags: function(/** String[] */tags) {
        this.tags = tags;
    },

    /**
     * Configure time intervals  for this filter.
     * @param tags
     * @private
     */
    setIntervals: function(/** Object[] */intervals) {
        this.intervals = intervals;
    },

    /**
     * Match event and add to result on match.
     * @param ev
     * @param result      If given, ev is added to it on match
     * @returns {Boolean} whether filter matched
     * @private
     */
    match: function(/** Event */ev, /** Event.Set */result) {
	assert(result);
        var tags;
        var interval;
        if (this.tags||this.intervals) {
            if (this.tags) {
		var lines = Event.Formatter.toText(ev);
                tags = this.findTags(this.tags, lines);
                if (tags.length == 0) {
                    return false;
                }
            }
            if (this.intervals) {
                var time = ev.time;
                if (!time) {
                    return false;
                }
                for (interval = 0; interval < this.intervals.length; interval++) {
                    var d = this.intervals[interval];
                    if (time >= d.start && time < d.end) {
                        break;
                    }
                };
                if (interval == this.intervals.length) {
                    return false;
                }
            }
        }
        if (result) {
            result.add(ev);
        }
        return true;
    },

    /**
     * Find tags in event matching this filter tags.
     * @param thisTags
     * @param lines
     * @private
     */
    findTags: function(/** String[] */thisTags, /** String[] */lines) {
        var tags = [];
        for (var i = 0; i < thisTags.length; i++) {
            var thisTag = thisTags[i];
            for (var j = 0; j < lines.length; j++) {
                var l = lines[j];
		if (l.indexOf(thisTag) >= 0) {
		    tags.push(thisTag);
                }
            }
        }
        return tags;
    }
};







/**
 * Event.Set carries a set of filtered events.
 * @class
 * @constructor
 * @private
 */
Event.Set = function() {
    /**
     * Matched events.
     * @type Event[]
     * @private
     */
    this.entries = [];
};

/** @private */
Event.Set.prototype = {
    /** @ignore */
   __constr__: "Event.Set",

    /**
     * Add a match to this set
     * @param ev
     * @private
     */
    add: function(/** Event */ev) {
        this.entries.push(ev);
    },

    /**
     * Render tables with matched entries.
     * @returns {String}
     * @private
     */
    toString: function() {
        var entries = this.entries.reverse();
        var width = -1;
	var segments = [];
        for (var i = 0; i < entries.length; i++) {
            var evt = entries[i];
	    var lines = Event.Formatter.toText(evt);
	    if (lines.length>0) {
		lines.forEach(function(line) { if (line.length>width) { width = line.length; } });
		segments.push(lines);
	    }
	}
	var separator = width>0 ? "\n" + Util.multiplyString("-", width) : "";
	var s = "";
	segments.forEach(function(seg) {
	    s += seg.join("\n");
	    s += separator;
	    s += "\n";
	});
	return s;
    }
};







 


/************************************************************************************************************************
/
/ Event.ShellDump: Dump events on all shells
/
 ************************************************************************************************************************/




/**
 * @class
 * @private
 */
Event.ShellDump = {
    /**
     * @type Function
     * @private
     */
    filterFunc: null,
	
    /**
     * @type Object
     * @private
     */
    filterSpec: {
	"vm":  { 
	    "exception-uncaught": true,
	    "breakpoint": true,
	    "watchpoint": true,
	    "asm-loaded": true,
	    "asm-removed": true,
	    "radio-rx": true,
	    "radio-rx-filtered": true,
	    "before-bytecode": true,
	    "after-bytecode": true,
	    "start-frame": true,
	    "exit-frame": true
	}
    },

    /**
     * @private
     */
    init: function() {
	this.filterFunc = this.onEvent.bind(this);
	Event.Registry.addFilter(this.filterFunc);
    },

    /**
     * @returns {Object}
     * @private
     */
    getFilterSpec: function() {
	return this.filterSpec;
    },

    /**
     * @param cat2name2bool
     * @private
     */
    addFilterSpec: function(/** Object */cat2name2bool) {
	for (var cat in cat2name2bool) {
	    if (!this.filterSpec[cat]) {
		this.filterSpec[cat] = {};
	    }
	    var name2bool = cat2name2bool[cat];
	    for (var name in name2bool) {
		this.filterSpec[cat][name] = true;
	    }
	}
    },

    /**
     * @param cat2name2bool
     * @private
     */
    delFilterSpec: function(/** Object */cat2name2bool) {
	for (var cat in cat2name2bool) {
	    if (!this.filterSpec[cat]) {
		continue;
	    }
	    var name2bool = cat2name2bool[cat];
	    for (var name in name2bool) {
		if (this.filterSpec[cat][name]) {
		    delete this.filterSpec[cat][name];
		}
	    }
	    if (Blob.isEmpty(this.filterSpec[cat])) {
		delete this.filterSpec[cat];
	    }
	}
    },


    /**
     * @param ev
     * @private
     */
    onEvent: function(ev) {
	var o = this.filterSpec[ev.category];
	if (o && o[ev.evname]) {
	    CLI.Shells.printImmediate(ev.toString());
	}
    },

    /**
     * Enable/disable shell event dump.
     * @private
     */
    setEnabled: function(/** Boolean */b) {
	if (b) {
	    if (!this.filterFunc) {
		this.filterFunc = this.onEvent.bind(this);
		Event.Registry.addFilter(this.filterFunc);
	    }
	} else {
	    if (this.filterFunc) {
		Event.Registry.removeFilter(this.filterFunc);
		this.filterFunc  = null;
	    }
	}
    }
};



Event.ShellDump.init();




/************************************************************************************************************************
/
/ CLI.Commands.Event: commands to log/search events.
/
 ************************************************************************************************************************/



/**
 * CLI.Commands.Events
 * @class
 * @private
 */
CLI.Commands.Event = {};

/**
 * @constant
 * @type String
 */
CLI.Commands.Event.USAGE = "Show event history.";

/**
 * @constant
 * @type String
 */
CLI.Commands.Event.DESCRIPTION =
    "Use event-show to show/search past events or configure events dumped on the shell.\n"  +
    "Use event-wait to wait for a particular event.";




/**
 * Implements a shell attribute.
 * @class
 * @augments CLI.Shell.Attr
 * @constructor
 * @private
 */
CLI.Commands.Event.MarkerAttr = function() {
    this.name = "CLI.Commands.Event.MarkerAttr";
    this.marker = 1;
    this.onClose = function() {
	;
    };
};


/**
 * Creaete or get shell marker attribute
 * @private
 */
CLI.Commands.Event.MarkerAttr.get = function(shell) {
    var attr = shell.getAttr("CLI.Commands.Event.MarkerAttr");
    if (!attr) {
        attr = new CLI.Commands.Event.MarkerAttr();
        shell.setAttr("CLI.Commands.Event.MarkerAttr", attr);
    }
    return attr;
};
    


/**
 * @class 
 * @constructor
 * @private
 */
CLI.Commands.Event.ShowCommand =  function(/** CLI.Shell */shell, /** String */name) {
    this.description =
        "Show/search past events. Without parameters, shows all events in the history " +
	"having occured since last call.\n" +
        "If tags are specified (-t), the events are matched against these tags.\n" +
        "Time intervals  may be specified to select events using --time.\n" +
	"'ev-show' must be called once to initialize the event history.\n " +
        "Examples:\n" +
        "ev-show                           Initalize event history or show events since last call.\n" +
        "ev-show -a                        Show all events.\n" +
        "ev-show -a -t register            Show events containing 'register'.\n" +
        "ev-show -c 10\n                   Show last 'cnt' events." +
        "--clear clears all events currently stored in the history buffer.\n" +
        "--imm-list list all event categories and names dummped immediately on shells.\n" +
        "--imm-add adds event category and name to dummp immediately on shells.\n" +
        "--imm-del removes event category and name to dummp immediately on shells.\n"
    ;
    this.cntSpec = new GetOpt.Number("count", "Show up to 'count' events", null, null);
    this.cntSpec.setRange(1, 1, 1024);
    this.cntOpt = new GetOpt.Option("c", "--cnt", 0, null, null, this.cntSpec);
    this.allOpt = new GetOpt.Option("a", "--all", 0, null, "Show all events in history");

    this.stSpec = new GetOpt.MicrosSpec(null, "Start-time for interval: hours:mins:secs.millis'micros");
    this.etSpec = new GetOpt.MicrosSpec(null, "End-time for interval: hours:mins:secs.millis'micros");
    this.tseq = new GetOpt.Seq([ this.stSpec, this.etSpec ], 2);
    this.tset = new GetOpt.Set(this.tseq, 0);

    this.timeOpt = new GetOpt.Option(null, "--time", 0, null, "Specify time intervals to search in: hours:mins:secs.millis'micros hours:mins:secs.millis'micros", this.tset);

    this.tagSpec = new GetOpt.Simple("tag", "Search tag.");
    this.tagOpt = new GetOpt.Option("t", "--tag", 0, null, "Search tag", this.tagSpec);
    
    this.clearOpt = new GetOpt.Option(null, "--clear", 0, null, "Clear all events in history");


    this.listimmOpt = new GetOpt.Option(null, "--imm-list", 0, null, "List events dumped immediately on shells");
    this.addimmSpec = new GetOpt.Simple("category:evname", "Category and event name");

    this.addimmOpt = new GetOpt.Option(null, "--imm-add", 0, null, "Add 'category:evname' to events dumped immediately on shells.", this.addimmSpec);
    this.delimmSpec = new GetOpt.Simple("category:evname", "Category and event name");
    this.delimmOpt = new GetOpt.Option(null, "--imm-del", 0, null, "Delete 'category:evname' from events dumped immediately on shells.", this.delimmSpec);

    this.optSet = new GetOpt.OptionSet([ this.allOpt, this.cntOpt, this.tagOpt, this.timeOpt, this.clearOpt, this.listimmOpt, this.addimmOpt, this.delimmOpt  ]);


    this.endOfArgs = new GetOpt.EndOfArgs();

    CLI.Command.call(this, shell, name, [ this.optSet, this.endOfArgs ], 1); //, 1);
};

/** @private */
CLI.Commands.Event.ShowCommand.prototype = extend(
    CLI.Command.prototype,
    {
        /** @private */
        exec: function(callback) {
            var shell = this.shell;
            var attr = CLI.Commands.Event.MarkerAttr.get(shell);
            var intervals = [];
            var tags = [];
            var marker;
            var cnt;

            var imm2info = function() {
                var t = new Util.Formatter.Table2(2);
		var cat2name2bool = Event.ShellDump.getFilterSpec();
                var y = 0;
                for (var cat in cat2name2bool) {
                    var name2bool = cat2name2bool[cat];
		    for (var name in name2bool) {
			t.setValue(0, y, cat);
			t.setValue(1, y, name);
			y += 1;
		    }
                }
                return t.render().join("\n");
            };

	    if (this.listimmOpt.isSet()) {
		callback(new AOP.OK(imm2info()));
		return;
	    }

	    var opt = this.addimmOpt.isSet() ? this.addimmOpt : (this.delimmOpt.isSet() ? this.delimmOpt : null);
	    if (opt) {
		var opts = opt.getState();
		var cat2name = {};
                for (var i = 0; i < opts.length; i++) {
                    var s = opts[i].paramState;
		    var sa = s.split(':');
		    if (sa.length!==2) {
			throw sprintf("Expected categpry:evname instead of '%s'", s);
		    }
		    var cat = sa[0], name = sa[1];
		    if (!cat2name[cat]) {
			cat2name[cat] = {};
		    }
		    cat2name[cat][name] = true;
                }
		if (opt === this.addimmOpt) {
		    Event.ShellDump.addFilterSpec(cat2name);
		} else {
		    Event.ShellDump.delFilterSpec(cat2name);
		}
		callback(new AOP.OK(imm2info()));
		return;
	    }

	    if (!Event.HISTORY) {
		Event.HISTORY = new Event.History(4096);
	    }

	    if (this.clearOpt.isSet()) {
		Event.HISTORY.reset();
		var marker = Event.HISTORY.getMarker();
                CLI.Shells.forEachShell(function(shell) {
                    var attr = CLI.Commands.Event.MarkerAttr.get(shell);
                    attr.marker = marker;
                });
                callback(new AOP.OK());
                return;
	    }
            
            if (this.allOpt.isSet()) {
                marker = undefined;
            } else if (this.cntOpt.isSet()) {
                cnt = this.cntSpec.getNumber();
            } else {
                marker = attr.marker;
            }
            
            var tseqState = this.tset.getState();
            if (tseqState != null) {
	        for (var i = 0; i < tseqState.length; i++) {
                    var tsetState = tseqState[i];
                    var st = tsetState[0].micros;
                    var et = tsetState[1].micros;
                    if (et <= st) {
                        throw "Invalid time specification: end before start in interval";
                    }
                    intervals.push({ start: st, end: et });
                }
            }
            
            if (this.tagOpt.isSet()) {
                var opts = this.tagOpt.getState();
                for (var i = 0; i < opts.length; i++) {
                    tags.push(opts[i].paramState);
                }
            }
            
            var result = Event.HISTORY.filter(cnt, marker, new Event.Filter(tags, intervals));

            attr.marker = Event.HISTORY.getMarker();

	    callback(new AOP.OK(result));
        }
    }
);












/**
 * Implements a shell attribute.
 * @class
 * @augments CLI.Shell.Attr
 * @constructor
 * @private
 */
CLI.Commands.Event.WaitAttr = function() {
    this.name = "CLI.Commands.Event.WaitAttr";
    this.collector = null;
    this.filter = null;
    this.onClose = function() {
	;
    };
};


/**
 * Creaete or get shell marker attribute
 * @private
 */
CLI.Commands.Event.WaitAttr.get = function(shell) {
    var attr = shell.getAttr("CLI.Commands.Event.WaitAttr");
    if (!attr) {
        attr = new CLI.Commands.Event.WaitAttr();
        shell.setAttr("CLI.Commands.Event.WaitAttr", attr);
    }
    return attr;
};


/**
 * @class 
 * @constructor
 * @private
 */
CLI.Commands.Event.WaitCommand = function(/** CLI.Shell */shell, /** String */name) {
    this.description = 
	"Wait for an event to arrive or search for event having occured in the past. A property list specifies\n" +
	"the mask against which an event is matched. On a subsequent call, the command checks whether such an\n" +
	"event has occured in the past or waits for such an event until a timeout occurs. Example:\n" +
	"event-wait category:mote evname:register uid:0\n" +
	"sag-start\n" +
	"mote-create\n" +
	"event-wait\n";
    this.propSpec = new GetOpt.Simple("mask", "property:value,property2:value2.. Match event against specified properties");
    this.propSet = new GetOpt.Set(this.propSpec);
    this.timeoutOpt = new GetOpt.TimeoutOpt('10s');
    var optSet = new GetOpt.OptionSet([ this.timeoutOpt ]);
    CLI.Command.call(this, shell, name, [ optSet, this.propSet ], 0);
};

/** @private */
CLI.Commands.Event.WaitCommand.prototype = extend(
    CLI.Command.prototype,
    {
        /** @private */
        exec: function(callback) {
            var shell = this.shell;
            var attr = CLI.Commands.Event.WaitAttr.get(shell);
	    var span = this.timeoutOpt.getSpan();
            var setState = this.propSet.getState();
            if (setState == null) {
		if (!attr.collector) {
                    callback(new AOP.ERR("No event mask has been specified in a previous invocation!"));
		    return;
		}
		attr.collector.wait4(attr.filter, new Timer.Timer(span, undefined), callback);
                return;
            }
            var filter = new Util.PropertyFilter();;
            for (var i = 0; i < setState.length; i++) {
                var spec = setState[i];
                var sa = spec.split(":");
                var key = sa[0];
                var values = null;
                if (sa[1]) {
                    sa = sa[1].split(",");
                    assert(sa instanceof Array);
                    if (sa.length > 0) {
                        values = sa;
                    }
                }
                filter.add(key, values);
            }
	    if (attr.collector) {
		attr.collector.close();
	    }
	    attr.filter = filter;
	    attr.collector = new Event.Collector();
	    callback(new AOP.OK());
        }
    }
);



CLI.commandFactory.addModule("CLI.Commands.Event");
