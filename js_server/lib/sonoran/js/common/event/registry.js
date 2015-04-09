//  (C) COPYRIGHT INTERNATIONAL BUSINESS MACHINES CORPORATION 2006-2010
//                       ALL RIGHTS RESERVED
//        IBM Research Division, Zurich Research Laboratory
// --------------------------------------------------------------------




/**
 * Events are signaled to interested listeners using the Event.Registry instance.
 * 
 * Use addListener and removeListener to add or remove an event listener function.
 * An event listener function is not allowed to block using SCB or BLCK.
 * <pre>
 * var f = function(evt) {
 *   println(evt);
 * };
 * var listener = Sonoran.Registry.addListener(f);
 * </pre>
 * @class
 * @static
 * @see DFLT_ASYNC_CB
 * 
 */
Event.Registry = {
    /**
     * Events handlers. Categories are observers, filters and listeners. 
     * @type Util.Listeners[]
     * @private
     */
    handlers: [ new Util.Listeners(), new Util.Listeners(), new Util.Listeners() ],
    
    /**
     * Add filter. A filter receives an event and should not block other events.
     * @param func
     * @param msgtypes  Array of msgtype's or variable argument list
     * @static
     * @private
     */
    addFilter: function(/** Function */func) {
        return this.addHandler(this.handlers[1], func);
    },

    /**
     * Remove a filter.
     * @param func Function to remove
     * @static
     * @private
     */
    removeFilter: function(/** function */func) {
        return this.removeHandler(func);
    },

    /**
     * Add observer. An observer gets an event before any filter is invoked
     *  and the event might be consumed.
     * @param func
     * @param msgtypes  Array of msgtype's or variable argument list
     * @static
     * @private
     */
    addObserver: function(/** Function */func) {
        return this.addHandler(this.handlers[0], func);
    },

    /**
     * Remove an observer.
     * @param func Function to remove
     * @static
     * @private
     */
    removeObserver: function(/** function */func) {
        return this.removeHandler(func);
    },

    /**
     * Add a listener which receives instances of Event.
     * @param func
     * @returns {function} the registered function
     * @static
     */
    addListener: function(/** function */func) {
        assert(arguments.length===1);
        return this.addHandler(this.handlers[2], func);
    },
    
    /**
     * Remove a registered listener. 
     * @param func Function to remove
     * @static
     */
    removeListener: function(/** function */func) {
        this.removeHandler(func);
    },

    /**
     * Ask the registry to forward an event to registered listeners.
     * @param blob Event
     * @static
     * @private
     */
    signalBlob: function(/** Event */blob) {
        QUACK(0, "API change: rename to signalEvent..");
        this.signalEvent(blob);
    },
    
    /**
     * @private
     * @static
     */
    addHandler:  function(listeners, func) {
        //filter.add("msgtype", msgtypes);
        listeners.add(func);
        return func;
    },
    
    /**
     * @static
     * @private
     */
    removeHandler: function(func) {
        var found = false;
        for (var i = 0; i < this.handlers.length; i++) {
            var ret = this.handlers[i].remove(func);
            if (ret) {
                found = true;
            }
        }

        if (!found) {
	    QUACK(0, "Event.Registry", "Listener function not found: " + func);
	    QUACK(0, "Event.Registry", Util.formatData(Runtime.getStackTrace()));
        }
    }
};







// /**
//  * @class
//  * @private
//  */
// Event.ShellDump = {
//     /**
//      * @type Function
//      * @private
//      */
//     filterFunc: null,
	
//     /**
//      * @type Object
//      * @private
//      */
//     filterSpec: {
// 	"vm":  { 
// 	    "exception-uncaught": true,
// 	    "breakpoint": true,
// 	    "watchpoint": true,
// 	    "asm-loaded": true,
// 	    "asm-removed": true,
// 	    "radio-rx": true,
// 	    "radio-rx-filtered": true,
// 	    "before-bytecode": true,
// 	    "after-bytecode": true,
// 	    "start-frame": true,
// 	    "exit-frame": true
// 	}
//     },

//     /**
//      * @private
//      */
//     init: function() {
// 	this.filterFunc = this.onEvent.bind(this);
// 	Event.Registry.addFilter(this.filterFunc);
//     },

//     /**
//      * @returns {Object}
//      * @private
//      */
//     getFilterSpec: function() {
// 	return this.filterSpec;
//     },

//     /**
//      * @param cat2name2bool
//      * @private
//      */
//     addFilterSpec: function(/** Object */cat2name2bool) {
// 	for (var cat in cat2name2bool) {
// 	    if (!this.filterSpec[cat]) {
// 		this.filterSpec[cat] = {};
// 	    }
// 	    var name2bool = cat2name2bool[cat];
// 	    for (var name in name2bool) {
// 		this.filterSpec[cat][name] = true;
// 	    }
// 	}
//     },

//     /**
//      * @param cat2name2bool
//      * @private
//      */
//     delFilterSpec: function(/** Object */cat2name2bool) {
// 	for (var cat in cat2name2bool) {
// 	    if (!this.filterSpec[cat]) {
// 		continue;
// 	    }
// 	    var name2bool = cat2name2bool[cat];
// 	    for (var name in name2bool) {
// 		if (this.filterSpec[cat][name]) {
// 		    delete this.filterSpec[cat][name];
// 		}
// 	    }
// 	    if (Blob.isEmpty(this.filterSpec[cat])) {
// 		delete this.filterSpec[cat];
// 	    }
// 	}
//     },


//     /**
//      * @param ev
//      * @private
//      */
//     onEvent: function(ev) {
// 	var o = this.filterSpec[ev.category];
// 	if (o && o[ev.evname]) {
// 	    CLI.Shells.printImmediate(ev.toString());
// 	}
//     },

//     /**
//      * Enable/disable shell event dump.
//      * @private
//      */
//     setEnabled: function(/** Boolean */b) {
// 	if (b) {
// 	    if (!this.filterFunc) {
// 		this.filterFunc = this.onEvent.bind(this);
// 		Event.Registry.addFilter(this.filterFunc);
// 	    }
// 	} else {
// 	    if (this.filterFunc) {
// 		Event.Registry.removeFilter(this.filterFunc);
// 		this.filterFunc  = null;
// 	    }
// 	}
//     }
// };



// Event.ShellDump.init();
