//---------------------------------------------------------------------------------------------------------------
//
// MSETUP
//
//---------------------------------------------------------------------------------------------------------------


/**
 * This class installs a set of assemblies on a set of motes.
 * It tries to bring the motes into the described configuration by
 * computing the delta to the current state of each and taking actions to approach
 * the defined configuration. Actions can be deleting assemblies, loading assemblies,
 * or doing a factory reset of motes.
 * This class takes care of dependencies among assemblies and orders delete and load
 * instructions into a correct sequence.
 * @class
 * @constructor
 */
Sonoran.MSETUP = function () {
    // Public fields
    /**
     * Timeout passed along to factory reset of MOMA.
     * If null then defaults to 5 secs.
     * @type Number
     * @see Sonoran.MOMA.factoryReset
     */
    this.factoryResetTimeout = null;
    /**
     * Instead of deleting individual assemblies force a factory reset of the mote
     * and load all mandated assemblies afresh.
     * If null then defaults to false.
     * @type Boolean
     * @see Sonoran.MOMA.factoryReset
     */
    this.forceFactoryReset = null;
    /**
     * If true and a mote holds more than the mandated assemblies then keep them.
     * This options is meaningless if forceFactoryReset is true.
     * If null then defaults to false.
     * @type Boolean
     */
    this.allowExcessAssemblies = null;
    /**
     * This object is passed along to MOMA of each mote during load of assemblies.
     * If null then the default options are effective.
     * @type Sonoran.MOMA.Options
     * @see Sonoran.MOMA.load
     */
    this.loadOptions = null;
    /**
     * This object is passed along to MOMA of each mote during deletion of assemblies.
     * If null then the default options are effective.
     * @type Sonoran.MOMA.Options
     * @see Sonoran.MOMA.del
     */
    this.delOptions = null;

    // Private fields

    // Private
    /**
     * @private
     */
    this.state = null;
    /**
     * @private
     */
    this.motes = null;
    /**
     * @private
     */
    this.dirs = [".", "~mr/gac"];
    /**
     * @private
     */
    this.assemblies = [];
    /**
     * @private
     */
    this.dependencies = [];
    /**
     * @private
     */
    this.asmentries = null;
    /**
     * @private
     */
    this.actions = null;
    /**
     * @private
     */
    this.ignored = [];
};

/**
 * A class describing actions to be performed against a specific mote.
 * @class
 * @constructor
 */
Sonoran.MSETUP.Action = function () {
    /**
    * Assemblies to be loaded onto a mote ordered by dependencies.
    * @type Sonoran.Assembly[]
    */
    this.loadAsms = [];
    /**
    * Assemblies to be deleted from a mote in no particular order.
    * Order of deletion is determined dynamically.
    * @type Sonoran.AsmEntry[]
    */
    this.deleteAsms = [];
    /**
    * List of assemblies left unchanged of a mote.
    * @type Sonoran.AsmEntry[]
    */
    this.nopAsms = [];
};

// /**
//  * A class describing policies for prepare for maintenance.
//  * @class
//  * @constructor
//  * @see Sonoran.MSETUP.prepareForMaintenance()
//  */
// Sonoran.MSETUP.PreparePolicy = function () {
//     /**
//     *  Run the interactive algorithm for collecting motes.
//     *  This is only consiered if maintenence is applied to a simulated gateway mote.
//     *  For physical gateway mote the interactive mode is mandatory because the user has
//     *  to manually handle motes (move, preset reset, power up/down etc).
//     *  The default value is false.
//     * @type Boolean
//     */
//     this.interactive = false;
//     /**
//     *  If collected motes shall receive new EUI addresses then this must specify
//     *  the first address. Address are assigned in a strictly increasing ordering.
//     *  If null then do not change the EUI addresses of detected motes.
//     *  Default value is null.
//     * @type String
//     */
//     this.eui = null;
// };

/** Prototype */
Sonoran.MSETUP.prototype = {
    /**
     * @param mote
     * @returns {Number}
     * @private
     */
    _findMoteIndex: function (/** SOnoran.Mote */mote) {
	var nmotes = this.motes.length;
	var motes = this.motes;
	for( var mi=0; mi<nmotes; mi++ ) {
	    if( mote===motes[mi] ) {
		return mi;
	    }
	}
	throw new Exception("Unknown mote specified in MoteSetup API: "+mote);
    },
    /**
    *  Defines the set of mote this object is operating on.
    *  This call must occur before any methods are called that trigger setup actions.
    *  Any previously registered motes are removed.
    * @param motes The set of motes which are subject to setup operations. To clear set of motes pass null in.
    * @see Sonoran.MSETUP.getMotes()
    */
    setMotes: function (/**Sonoran.Mote[]*/motes) {
	this.motes = motes;
    },
    /**
    *  Defines the set of directories scanned for assemblies.
    *  The default search path is "~mr/gac", that is, only the GAC is scanned.
    * @param dirs The set of directories. Overrides the current setting.
    * @see Sonoran.MSETUP.findAndAddAssembly()
    */
    setDirs: function (/**String[]*/dirs) {
	this.dirs = dirs;
    },
    /** Set the list of currently ignored assemblies.
    * The ignored assemblies are not considered during action computation.
    * They are not subject to deletion or loading.
    * @param asmnames A list of assembly names or patterns.
    */
    setIgnored: function (/**Sonoran.AsmName[]*/asmnames) {
	this.ignored = asmnames;
    },
    /**
    *  Clear list of mandated assemblies.
    */
    clearAssemblies: function () { this.assemblies=[]; this.dependencies=[]; },
    /**
    * @return {Sonoran.Mote[]} The list of currently registered motes.
    */
    getMotes:        function () { return this.motes; },
    /**
    * @return {Sonoran.Assembly[]} The list of mandated assemblies. If none are set return empty array.
    */
    getAssemblies:   function () { return this.assemblies; },
    /**
    * @return {Sonoran.Assembly[]} The list of mandated assemblies. If none are set return empty array.
    */
    getDependencies:   function () { return this.dependencies; },
    /**
    *  Return an array of actions for each registered mote.
    *  The actions are ordered according to the mote order as returned by {@link Sonoran.MSETUP.getMotes()}.
    * @return {Sonoran.MSETUP.Action[]} Array of action objects or null if {@link Sonoran.MSETUP.analyseActions()} has not been called.
    * @see Sonoran.MSETUP.getMotes()
    * @see Sonoran.MSETUP.analyseActions()
    */
    getActions:      function () { return this.actions; },
    /**
    *  Return an array of assembly entries as found on each mote.
    *  The array is ordered according to the mote order as returned by {@link Sonoran.MSETUP.getMotes()}.
    * @return {Array} Array of an array of assembly entries or null if {@link Sonoran.MSETUP.analyseActions()} has not been called.
    * @see Sonoran.MSETUP.getMotes()
    * @see Sonoran.MSETUP.analyseActions()
    */
    getAsmEntries:   function () { return this.asmentries; },
    /**
    *  Return the assembly entries as found on specified mote.
    * @return {Sonoran.AsmEntry[]} Array of assembly entries. This method must not be called before
    *    {@link Sonoran.MSETUP.analyseActions()} has been invoked.
    * @see Sonoran.MSETUP.analyseActions()
    */
    getMoteAsmEntries: function (/**Sonoran.Mote|Number*/mote) {
        if(mote instanceof Number) {
            return this.asmentries[mote];
        } else {
            var l_idx = this._findMoteIndex(mote);
            return this.asmentries[l_idx];
        }
//	return this.asmentries[(mote instanceof Number) ? mote : this._findMoteIndex(mote)];
    },
    /**
    *  Return the assembly entry for the specified assembly filter on specified mote.
    * @param mote The mote to checked.
    * @param asmname A assembly name or filter name.
    * @return {Sonoran.AsmEntry} The found assembly entry.
    *    This method must not be called before {@link Sonoran.MSETUP.analyseActions()} has been invoked.
    * @exception {String} If a matching assembly entry could not be found on the given mote.
    * @see Sonoran.MSETUP.analyseActions()
    */
    getMoteAsmEntry: function (/**Sonoran.Mote*/mote, /**Sonoran.AsmName[]*/asmname) {
	var asments = this.getMoteAsmEntries(mote);
	for( var ai=0; ai<asments.length; ai++ ) {
	    if( Sonoran.AsmName.compare(asments[ai], asmname) >= Sonoran.AsmName.SAME_MINOR )
		return asments[ai];
	}
	throw new Exception(sprintf("Unknown assembly '%s' on mote '%s'", asmname, mote));
    },
    /**
    *  Return the calculated actions for the specified mote.
    *  Must not be called before {@link Sonoran.MSETUP.analyseActions()} has been invoked.
    * @return {Sonoran.MSETUP.Action} Action object or null if {@link Sonoran.MSETUP.analyseActions()} has not been called.
    * @see Sonoran.MSETUP.getActions()
    * @see Sonoran.MSETUP.analyseActions()
    */
    getMoteActions: function (/**Sonoran.Mote|Number*/mote) {
	return this.actions[(mote instanceof Number) ? mote : this._findMoteIndex(mote)];
    },
    /**
    *  Add a list of assemblies to the set of mandated assemblies.
    * @param moreAssemblies The list of assemblies to be added.
    *    Duplicates and assemblies already added before (same minor) are silently dropped.
    */
    addAssemblies: function (/**Sonoran.Assembly[]*/moreAssemblies) {
	var n = this.moreAssemblies.length;
	for( var i=0; i<n; i++ ) {
	    this.addAssembly(moreAssemblies[i]);
	}
    },
    /**
    *  Add an assebmly to the set of mandated assemblies.
    * @param assembly The assembly to be added.
    * @return {Boolean} true if assembly has been added, false if assembly was already added (same minor).
    */
    addAssembly: function (/**Sonoran.Assembly[]*/assembly) {
	var n = this.assemblies.length;
	for( var i=0; i<n; i++ ) {
	    if( Sonoran.AsmName.compare(assembly, this.assemblies[i]) >= Sonoran.AsmName.SAME_MINOR )
		return false;
	}
	this.assemblies.push(assembly);
	return true;
    },
    /**
    *  Add an assebmly to the set of mandated assemblies.
    * @param assembly The assembly to be added.
    * @return {Boolean} true if assembly has been added, false if assembly was already added (same minor).
    * @private
    */
    addDependency: function (/**Sonoran.AsmName*/asmName) {
	var n = this.dependencies.length;
	for( var i=0; i<n; i++ ) {
	    if( Sonoran.AsmName.compare(asmName, this.dependencies[i]) >= Sonoran.AsmName.SAME_MINOR )
		return false;
	}
	this.dependencies.push(asmName);
	return true;
    },
    /**
    *  Find assemblies via registered directories and add them to the set of assemblies maintained by this object.
    * @param asmName  The identity filter of an assembly.
    * @param doNotAddDependencies If present and true then do not automatically find and add dependendies.
    * @returns {Sonoran.Resource.Assembly} Return null if assembly was already present, the located assembly object otherwise.
    * @throws {AOP.ERR} if specified assembly cannot be foundin any of the configured directories.
    * @see Sonoran.MSETUP.setDirs
    * @see Sonoran.MSETUP.getAssemblies
    */
    findAndAddAssembly: function (/**Sonoran.AsmName*/asmName,/**Boolean*/doNotAddDependencies) {
	var filter = new Sonoran.AsmName(asmName.name, asmName.major, asmName.minor, "+");
	var matches = Sonoran.AsmName.filterMatch(filter,this.assemblies);
	if( matches.length > 0 )
	    return null;
	var assemblies = Sonoran.Resource.Assembly.getSBAs(this.dirs, asmName);
	if( assemblies.length == 0 )
	    throw new AOP.ERR(ERR_GENERIC, "Cannot find assembly: "+asmName);
	// Add best match
	var assembly = assemblies[0];
	this.addAssembly(assembly);
	if( !doNotAddDependencies ) {
	    var imports = assembly.getImports();
	    var self = this;
	    imports.forEach(function(importAsmName) {
				var ex;
				try {
				    self.findAndAddAssembly(importAsmName,doNotAddDependencies);
				} catch (ex) {
				    // Ignore if we do not find it - might already be loaded
				    // If not we will fail later when loading.
				    self.addDependency(importAsmName);
				}
			    });
	}
	return assembly;
    },
    /**
    * @param asmNames A list of assembly identities filters to be located.
    * @param doNotAddDependencies If present and true then do not automatically find and add dependendies.
    * @returns {Boolean} Return false if assembly was already present, true otherwise.
    * @throws {AOP.ERR} if specified assembly cannot be foundin any of the configured directories.
    * @see Sonoran.MSETUP.setDirs
    * @see Sonoran.MSETUP.getAssemblies
    */
    findAndAddAssemblies: function (/**Sonoran.AsmName[]*/asmNames,/**Boolean*/doNotAddDependencies) {
	var self = this;
	// First find all explicitely mentioned assemblies (enforces selection of certain minors)
	var assemblies = [];
 	asmNames.forEach(
	    function (asmName) {
		var a = self.findAndAddAssembly(asmName,false);
		if( a != null )
		    assemblies.push(a);
	    });
	// Then go and satisfy all dependencies
 	if( !doNotAddDependencies ) {
 	    assemblies.forEach(
		function (assembly) {
 		    var imports = assembly.getImports();
 		    imports.forEach(
			function(importAsmName) {
 			    var ex;
 			    try {
 				self.findAndAddAssembly(importAsmName,doNotAddDependencies);
 			    } catch (ex) {
 				// Ignore if we do not find it - might already be loaded
 				// If not we will fail later when loading.
				self.addDependency(importAsmName);
 			    }
 			});
		});
	}
    },

    /**
    * Calculate the required actions to bring each registered mote into the specified configuration.
    * This method may be explicitely called before <code>performActions</code> to give
    * an application access to the set of actions. If not called then <code>performActions</code>
    * will call it implicitely.
    * After this call the calculated actions may be queried.
    * @see Sonoran.MSETUP.performActions
    */
    analyseActions: function () {
	// Fetch current assembly listings from all motes/MOMA.
	var self = this;
	var assemblies = this.assemblies;
	var nmotes = this.motes.length;
	var asmlists = new Array(nmotes); // AsmEntry[][]
	var actions = new Array(nmotes);
	var asmentries = this.asmentries = new Array(nmotes);

	// Sort be load order before clone assembly list into asmentries
	Sonoran.Assembly.sortByLoadOrder(assemblies);
        
	for( var mi=0; mi < nmotes; mi++ ) {
	    var mote = this.motes[mi];
	    var moma = mote.getMOMA();
	    var aop  = moma.list(new Sonoran.MOMA.Options(mote), SCB);
	    if( aop.isERR() ) {
		throw new AOP.ERR(ERR_GENERIC, "Failed to list assemblies", aop);
            }
	    asmentries[mi] = assemblies.slice(0); // shallow copy
	    asmlists[mi] = aop.getData().getEntries();
	    // Remove all presumably firmware assemblies
	    asmlists[mi] = asmlists[mi].filter(function (al) { return !/^.+-system$/.test(al.name); });
	    // Remove all ignored assemblies
	    asmlists[mi] = Sonoran.AsmName.filterOutMatch(this.ignored,asmlists[mi]);
	    // Remove all dependent assemblies with no SBA file found
	    asmlists[mi] = Sonoran.AsmName.filterOutMatch(this.dependencies,asmlists[mi]);

	    (actions[mi] = new Sonoran.MSETUP.Action()).loadAsms = assemblies;
	    // Check exess assemblies
	    if( !this.allowExcessAssemblies  )
		actions[mi].deleteAsms = Sonoran.AsmName.filterOutCompare(Sonoran.AsmName.SAME_NAME, assemblies, asmlists[mi]);
	}

	// Run through all configured assemblies and infer required operations per mote.
	// Check if assemblies already loaded
	for( var ai=0; ai < assemblies.length; ai++ ) {
	    var assembly = assemblies[ai];

	    for( var mi=0; mi < this.motes.length; mi++ ) {
		var mote  = this.motes[mi];
		var asmlist = asmlists[mi];
		var mactions = actions[mi];

		var del = asmlist.filter(function (al) {
					     var q = Sonoran.AsmName.compare(assembly, al);
					     if( q==Sonoran.AsmName.SAME_BUILD ) {
						 // Already loaded - remove from load list, add to NOP list
						 mactions.loadAsms = mactions.loadAsms.filter(function (le) { return le!==assembly;});
						 mactions.nopAsms.push(assembly);
						 self.asmentries[mi][ai] = al;  // record asm entry
						 return false;
					     }
					     return q!=Sonoran.AsmName.DIFFERENT;
					 });
		if( del.length > 0 )
		    mactions.deleteAsms = mactions.deleteAsms.concat(del);
	    }
	}
	this.actions = actions;

	for( var mi=0; mi<nmotes; mi++ ) {
	    var mactions = actions[mi];
	    if( mactions.deleteAsms.length > 0 && this.forceFactoryReset ) {
		mactions.factoryReset = true;
		mactions.loadAsms = assemblies;
		mactions.nopAsms = [];
		this.asmentries[mi] = assemblies.slice(0); // shallow copy
	    }
	}

	// XXX: Check out conditions for factory reset
	// XXX: Check out broadcast load
	//
	//  - only possible if all/majority of motes has factoryRest
	//  - no mote has factory reset and deleteAsms
	//
	// Check out unique actions over all motes.
//XXX:TBD	var uniqueAction = {
//XXX:TBD	    deleteAsms: [],
//XXX:TBD	    loadAsms: [],
//XXX:TBD	    factoryReset: actions.every(function (e) { return e.factoryReset; })
//XXX:TBD	};
    },
    /**
    * Execute calculated actions against set of motes.
    * This function will call @{link Sonoran.MSETUP.onProgress} repeatedly to signal performed work steps.
    * If completed successfully, all motes have been chenged to requested assembly configuration.
    * @see Sonoran.MSETUP.analyseActions
    * @see Sonoran.MSETUP.onProgress
    */
    performActions: function () {
	var self = this;
	if( this.actions == null )
	    this.analyseActions();

	for( var mi=0; mi < this.motes.length; mi++ ) {
	    var action = this.actions[mi];
	    var mote  = this.motes[mi];
	    var moma = mote.getMOMA();

	    if( action.factoryReset ) {
		this.onProgress(mote, null, 'factoryreset', 'start');
		var mok = moma.factoryReset((this.factoryResetTimeout||5000),SCB);
		if( mok.isERR() ) {
		    this.onProgress(mote, null, 'factoryreset', 'err', mok);
		    throw mok;  //XXX: special err object?
		}
		this.onProgress(mote, null, 'factoryreset', 'done', mok);
	    }
	    else {
		var da = action.deleteAsms.splice(0);
		var dn = da.length;
		var dels=0, ldels=0, mok;
		while( true ) {
		    for( var di=dn-1; di >= 0; di-- ) {
			var asment = da[di];
			// Assuming assemblies named *-system are builtin
			if( asment!=null ) {
			    this.onProgress(mote, asment, 'delete', 'start');
			    mok = moma.del(asment.getId(), this.delOptions, SCB);
			    var builtin = (mok.getCode() == Sonoran.MOMA.ERROR_BUILTIN_ASSEMBLY);
			    if( mok.isERR() && !builtin) {
				this.onProgress(mote, asment, 'delete', 'err', mok);
			    } else {
				this.onProgress(mote, asment, 'delete', builtin? 'builtin':'done', mok);
				da[di] = null;
				dels++;
			    }
			} else {
			    dels++;
			}
		    }
		    if( dels==dn )
			break;
		    if( ldels==dels )
			throw new AOP.ERR(ERR_GENERIC, "Cannot delete assemblies because of dependencies", mok);
		    ldels = dels;
		}
	    }
	    for( var li=0; li < action.loadAsms.length; li++ ) {
		var assembly = action.loadAsms[li];
		this.onProgress(mote, assembly, 'load', 'start');
		var aok = moma.load(assembly, this.loadOptions, SCB);
		if( aok.isERR() ) {
		    this.onProgress(mote, assembly, 'load', 'err', aok);
		    throw aok;  //XXX: special err object?
		}
		this.onProgress(mote, assembly, 'load', 'done', aok);
		var asmentry = aok.getData(); //asmentry;
		assert(asmentry instanceof Sonoran.AsmEntry);
		var asmentries = self.asmentries[mi];
		for( var ei=0; ei<asmentries.length; ei++ ) {
		    if( Sonoran.AsmName.compare(assembly,asmentries[ei])==Sonoran.AsmName.SAME_BUILD )
			asmentries[ei] = asmentry;
		}
	    }
	}
    },

    /**
    *  Report progress on mote setup.
    *  This method may be overriden by applications.
    *  Default implementation is to do nothing.
    * @param mote    The mote subject of the current setup step.
    * @param obj     The assembly entry being deleted or the assembly currently load,
    *                gateway object when setting configuration,
    *                or null if the progress step does not involve a specific object.
    * @param operation A string describing the current progress. One of: 'factoryreset', 'reset', 'delete', or 'load'.
    * @param status  Status of progress: 'start', 'done', or 'err'.
    * @param aop     Result object of this progress step.
    * @see Sonoran.MSETUP.printOnProgress
    */
    onProgress: function (/**Sonoran.Mote*/mote, /**Sonoran.AsmEntry|Sonoran.Assembly|Sonoran.Gateway*/obj,
    	                  /**String*/operation, /**String*/status, /**AOP.OK*/aop) {
    },

    /**
    *  Candidate function to be bound to onProgress.
    *  This function prints some formatted string about the announced progress.
    * @see Sonoran.MSETUP.onProgress
    */
    printOnProgress: function (mote, asmobj, operation, status, aop) {
    	printf("%s: %6s %-5s %s%s\n",
    	       (mote||"broadcast"),
    	       operation,
    	       status,
    	       (asmobj||""),
    	       status=='err' ? ": "+aop.toString() : "");
    }
};




// /**
//  * Setup a set of motes attached to a wirless gateway according to a specified MSETUP object.
//  * new motes.
//  * @class
//  * @constructor
//  * @param gatewayMote  The edge mote with the WLIP gateway
//  * @param msetup       The MSETUP object to use on wireless motes
//  * @param listener     The listener is invoked to indicate progress with Sonoran.Event.MSETUP instances
//  * @param callback     The callback is invoked when the gateway died, was unregistered or this instance was closed
//  */
// Sonoran.MSETUP.Maintenance = function(/** Sonoran.Gateway */gwMote, /** Sonoran.MSETUP */msetup, /** Function */listener, /** DFLT_ASYNC_CB */callback) {
//     /**
//      * @type Sonoran.Mote
//      */
//     this.gwMote = gwMote;
//     /**
//      * @type Sonoran.MSETUP
//      */
//     this.msetup = msetup;
//     /**
//      * @type Number
//      */
//     this.interval = -1;
//     /**
//      * @type Number
//      */
//     this.count = -1;
//     /**
//      * @type Sonoran.Mote[]
//      */
//     this.candidateMotes = [];
//     /**
//      * @type String[]
//      */
//     this.ignoredUniqueids = [];
//     /**
//      * @type Sonoran.Mote[]
//      */
//     this.performedMotes = [];
//     /**
//      * @type Sonoran.Mote[]
//      */
//     this.whitelistMotes = null;
//     /**
//      * @type Function
//      */
//     this.progressListener = listener;
//     /**
//      * @type DFLT_ASYNC_CB
//      */
//     this.closeCallback = callback;
//     /**
//      * @type Boolean
//      */
//     this.performing = false;
//     /**
//      * @type Function
//      */
//     this.eventListener = null;
//     /**
//      * @type String
//      */
//     this.startEUI = null;
//     /**
//      * @type String
//      */
//     this.lastEUI = null;
// };

// /** @private */
// Sonoran.MSETUP.Maintenance.prototype = {
//     /**
//      * Switch on/off dynamic mode.
//      * @param interval Millisconds or -1 to disable; when set, the motes appearing within the specified interval,  are setup automatically
//      */
//     setInterval: function(/** Number */interval) {
//         this.interval = interval>0 ? interval : -1;
//         if (this.timer) {
//             this.cancelTimer();
//             if (interval > 0) {
//                 this.startTimer();
//             }
//         }
//     },
//     /**
//      * Switch on/off mote count barrier. Number or -1 to disable. when set, the setup procedure is applied
//      * automatically as soon as 'count' motes appear (even if the current interval has not yet been expired).
//      * @param count 
//      */
//     setCount: function(/** Number */count) {
//         this.count = count>0?count:-1;
//     },
//     /**
//      * If an eui is set, all motes being performed are set to a new eui.
//      * @param eui
//      */
//     setEUI: function(/** String */eui) {
//         this.startEUI = eui;
//         this.lastEUI = eui;
//     },
//     /**
//      * Start maintenance.
//      */
//     start: function() {
//         assert(this.eventListener==null);
//         this.startTimer();
//         //var filter = new Util.PropertyFilter('msgtype', 'gateway-ev', 'event', [ 'hello', 'deregistered' ], 'gwUUID', this.gwMote.getUniqueid());
//         //this.eventListener = Sonoran.Registry.addListenerWithMask(this.onGatewayEvent.bind(this), filter);
// 	this.eventListener = Sonoran.Registry.addListener(this.onGatewayEvent.bind(this));
//     },
//     /**
//      * @returns {Sonoran.Mote[]} the current set of candidate motes
//      */
//     getCandidateMotes: function() {
//         return this.candidateMotes;
//     },
//     /**
//      * @returns {String[]} the set of mote unique ids currently ignored
//      */
//     getIgnoredUniqueids: function() {
//         return this.ignoredUniqueids;
//     },
//     /**
//      * @returns {Sonoran.Mote[]} the set of motes which has been setup so far
//      */
//     getPerformedMotes: function() {
//         return this.performedMotes;
//     },
//     /**
//      * @returns {String}
//      */
//     toString: function() {
//         var txt = "";
//         txt += sprintf("candidates:    %s\n", this.candidateMotes.join(","));
//         txt += sprintf("performed:     %s\n", this.performedMotes.join(","));
//         txt += sprintf("ignored:       %s\n", this.ignoredUniqueids.join(","));
//         return txt;
//     },
//     /**
//      * @private
//      */
//     startTimer: function() {
//         if (!this.timer && this.interval>0) {
//             this.timer = Timer.timeoutIn(this.interval, this.gwMote, this.onTimeout.bind(this));
//         }
//     },
//     /**
//      * @private
//      */
//     cancelTimer: function() {
//         if (this.timer) {
//             this.timer.cancel();
//             this.timer = null;
//         }
//     },
//     /**
//      * Clear internal information about pending motes etc.
//      * @param onlyPerformedMotes Clear performed motes
//      */
//     clear: function(/** Boolean */onlyPerformedMotes) {
//         this.performedMotes = [];
//         if (onlyPerformedMotes===true) {
//             return;
//         }
//         this.candidateMotes.forEach(function(m) {
//             m.getMOMA().setLEDs(0x0,null,SCB);   // turn off LEDs
//         });
//         this.candidateMotes = [];
//         this.ignoredUniqueids = [];
//         this.whitelistMotes = null;
//     },
//     /**
//      * Close this maintenance and call registered callback.
//      * @param result
//      */
//     close: function(/** AOP.ERR */result) {
//         if (this.eventListener) {
//             Sonoran.Registry.removeListener(this.eventListener);
//             this.eventListener = null;
//             this.cancelTimer();
//             this.clear();
//             this.closeCallback(result);
//         }
//     },
//     /**
//      * Add set of uniqueids or uniqueid to set of uniqueids to ignore.
//      * @param uniqueids
//      */
//     ignore: function(/** String|String[] */uniqueids) {
//         if (typeof(uniqueids) === 'string') {
//             uniqueids = [ uniqueids ];
//         }
//         var _this = this;
//         uniqueids.forEach(function(uniqueid) {
//             _this.candidateMotes = _this.candidateMotes.filter(function(m) {
//                 if (m.getUniqueid() != uniqueid) {
//                     return true;
//                 } else {
//                     m.getMOMA().setLEDs(0x0,null,SCB);   // turn off LEDs
//                     return false;
//                 }
//             });
//             _this.ignoredUniqueids.push(uniqueid);
//         });
//     },
//     /**
//      * @private
//      */
//     onTimeout: function() {
//         this.timer = null;
//         if (this.candidateMotes.length == 0){
//             this.startTimer();
//         } else {
//             //while(this.candidateMotes.length > 0) {
//             this.perform();
//             //}
//         }
//     },
//     /**
//      * Perform mote setup on current set of candidate motes. 
//      */
//     perform: function() {
//         if (this.candidateMotes.length === 0) {
//             return;
//         }
//         assert(this.performing===false);
//         this.cancelTimer();
//         this.performing = true;

// 	this.performThread();
//     },
//     /**
//      * @private
//      */
//     onGatewayEvent: function(/** Sonoran.Event.Gateway */ev) {
// 	if (ev.category !== Sonoran.EV_CAT_GATEWAY) {
// 	    return;
// 	}
// 	if (ev.gwUUID !== this.gwMote.getUniqueid()) {
// 	    return;
// 	}
//         if (ev.evname === Sonoran.EV_NAME_DEREGISTER) {
//             this.close(new AOP.ERR("Gateway has disappeared: " + this.gwMote));
//             return;
//         }
//         if (ev.evname !== Sonoran.EV_NAME_HELLO) {
// 	    return;
// 	}
//         var mote = Sonoran.Registry.lookupMoteByUniqueid(ev.wlUUID);
//         assert(mote);
//         if (this.candidateMotes.indexOf(mote) >= 0) {
//             //this.notify(new Sonoran.Event.MSETUP('detect', mote, null, this.gwMote, "Skip detected mote which is already candidate"));
//             return;
//         }
//         if (this.ignoredUniqueids.indexOf(mote.getUniqueid()) >= 0) {
//             //this.notify(new Sonoran.Event.MSETUP('detect', mote, null, this.gwMote, "Skip detected mote on ignored list"));
//             return;
//         }
//         if (this.performedMotes.indexOf(mote) >= 0) {
//             //this.notify(new Sonoran.Event.MSETUP('detect', mote, null, this.gwMote, "Skip detected mote already setup"));
//             return;
//         }
//         if (this.whitelistMotes && this.whitelistMotes.indexOf(mote) < 0) {
//             //this.notify(new Sonoran.Event.MSETUP('detect', mote, null, this.gwMote, "Skip detected mote already setup"));
//             return;
//         }
//         this.candidateMotes.push(mote);
//         //var result = mote.sleepOn(50*1000, SCB);
//         var result = mote.getMOMA().setLEDs(0x02,null,function(result){}); // turn on first/second LED
//         this.notify(new Sonoran.Event.MSETUP('detect', mote, null, this.gwMote));
//         if (this.count>0 && this.candidateMotes.length>=this.count && !this.performing) {
//             this.perform();
//         }
//     },
//     /**
//      * Reset simulated motes or invoke appeal to get a set of motes to setup. If motes are specified, these
//      * motes are detected and build the candidate set for the next perform.
//      * @param motes     Optional, if gather does not find this specified set of motes it throws an exception 
//      */
//     gather: function(motes) {
//         this.candidateMotes = [];
//         this.whitelistMotes = motes ? motes : null;
//         var _this = this;
//         var error;
//         var count = this.count;
//         this.count = -1;
//         this.cancelTimer();
// 	if (this.gwMote.getClass() != "saguaro") {
//             var result = gateway.appeal(SCB);
//             if (result.code != 0) {
//                 error = "WLIP appeal failed: " + result;
//             }
//         } else {
//             motes = motes ? motes : Sonoran.MSETUP.getAllWirelessMotes(this.gwMote);
//             Sonoran.MSETUP.layoutEarshot(this.gwMote, motes);
//             motes.forEach(function(mote) {
//                 Saguaro.mote2impl(mote).reset(1000, 'cold', SCB);
//                 var result = _this.gwMote.sleepOn(200*1000, SCB);
//                 //this.onProgress(mote, null, 'reset', 'done');
//             });
//         }
//         var result = this.gwMote.sleepOn(1000*1000, SCB);
//         var msgs = [];
//         var ignoredUniqueids = this.ignoredUniqueids;
//         var performedMotes = this.performedMotes;
//         var candidateMotes = this.candidateMotes;
//         if (!error && motes) {
//             motes.forEach(function(mote) {
//                 var uniqueid = mote.getUniqueid();
//                 if ((candidateMotes.indexOf(mote) < 0) && (ignoredUniqueids.indexOf(uniqueid) < 0) && (performedMotes.indexOf(mote) < 0)) {
//                     var msg = sprintf("Mote %s did not say HELLO", mote);
//                     msgs.push(msg);
//                     _this.notify(new Sonoran.Event.MSETUP('detect', mote, null, _this.gwMote, null, msg));
//                 }
//             });
//             if (msgs.length>0) {
//                 error = msgs.join("\n");
//             }
//         }
//         this.count = count;
//         this.startTimer();
//         if (error) {
//             this.notify(new Sonoran.Event.MSETUP('detect', null, null, this.gwMote, null, error));
//             throw error;
//         }
//     },
//     /**
//      * @private
//      */
//     notify: function(ev) {
//         assert(ev.gwmote);
//         if (this.progressListener) {
//             this.progressListener(ev);
//         }
// 	Sonoran.Registry.signalEvent(ev);
//     },


//     /**
//      * @private
//      */
//     performThread: function() {
// 	assert(this.performing===true);
// 	var candidateMotes = arraycopy(this.candidateMotes);
// 	assert(candidateMotes.length>0);
//         this.candidateMotes = [];
// 	var _this = this;

// 	Thread.start(function() {
// 	    while(true) {
// 		candidateMotes[0].sleepOn(50*1000, SCB); 

// 		if (_this.startEUI) {
// 		    try {
// 			_this.performEUIs(candidateMotes);
// 		    } catch (x) {
// 			_this.performing = false;
// 			var error = "Performing eui actions failed: " + x;
// 			_this.notify(new Sonoran.Event.MSETUP('perform', null, null, _this.gwMote, null, error));
// 			throw error;
// 		    }
// 		}
		
// 		try {
// 		    _this.performMSetup(candidateMotes);
// 		} catch(x) {
// 		    _this.msetup.setMotes([]);
// 		    _this.performing = false;
// 		    var error = "Performing msetup actions failed: " + x + "\n" + Runtime.dumpException(x);
// 		    _this.notify(new Sonoran.Event.MSETUP('perform', null, null, _this.gwMote, null, error));
// 		    throw error;
// 		}
		
// 		if (_this.candidateMotes.length>0 && this.interval < 0) {
// 		    candidateMotes = arraycopy(_this.candidateMotes);
// 		    _this.candidateMotes = [];
// 		} else {
// 		    _this.performing = false;
// 		    _this.startTimer();
// 		    break;
// 		}
// 	    }
// 	});
//     },

    
//     /**
//      * @private
//      */
//     performEUIs: function() {
//         var _this = this;
//         var changed = false;
// 	var candidateMotes = this.candidateMotes;
//         var blacklistMap = {};
//         var candidateMap = {};
//         var nextEUI = function() {
// 	    var hex = Util.UUID.eui642hex(_this.lastEUI);
// 	    var hi = parseInt(hex.substr(0,8),16);
// 	    var lo = parseInt(hex.substr(8,8),16);
// 	    while(true) {
// 	        if ((lo = (lo+1)&0xFFFFFFFF) == 0) {
// 		    hi += 1;
//                 }
// 	        _this.lastEUI = Util.UUID.hex2eui64(sprintf("%08X%08X", hi, lo));
// 	        if (!blacklistMap[_this.lastEUI]) {
//                     return _this.lastEUI;
//                 }
// 	    }
//         };
//         this.performedMotes.forEach(function(mote) {
//             var uniqueid = mote.getUniqueid();
//             blacklistMap[uniqueid] = uniqueid;
//         });
//         this.ignoredUniqueids.forEach(function(uniqueid) {
//             blacklistMap[uniqueid] = uniqueid;
//         });
//         candidateMotes.forEach(function(mote) {
//             var eui = _this.lastEUI;
//             var matches = candidateMotes.some(function(mote) { return mote.getUniqueid() === eui; });
//             if (matches.length>0) {
//                 assert(matches.length==0);
//             } else {
//                 candidateMap[eui] = mote;
//             }
//             nextEUI();
//         });
// 	for (eui in candidateMap) {
// 	    var mote = candidateMap[eui];
//             var moma = mote.getMOMA();
//             QUACK(0, "EUI: " + eui + " --> " + mote.getUniqueid());
// 	    var result = moma.setEUI64(eui, null, SCB);
//             if (result.code != 0) {
//                 throw sprintf("Could not set eui on %s: %s", mote, result.toString());
//             }
// 	    var result = moma.reset(10000, SCB);
//             if (result.code != 0) {
//                 throw sprintf("Could not reset mote %s: %s", mote, result.toString());
//             }
// 	    changed = true;
// 	}
// 	if (changed) {
//             this.gather();
// 	    var diff = candidateMotes.length - this.candidateMotes.length;
// 	    if (diff != 0)
// 		throw sprintf("Failed to changed EUIs - %d motes missing after APPEAL", diff);
// 	}
//     },

//     /**
//      * @private
//      */
//     performMSetup: function(candidateMotes) {
//         var motes = candidateMotes;
// 	assert(motes.length>0);
//         this.msetup.setMotes(motes);
// 	this.msetup.analyseActions();
// 	this.msetup.performActions();
// 	var _this = this;
// 	motes.forEach(function(mote) {
//             mote.getMOMA().setLEDs(0x0,null, SCB);    // turn off LEDs
//             _this.performedMotes.push(mote);
//             var assemblies = _this.msetup.getMoteAsmEntries(mote);
//             _this.notify(new Sonoran.Event.MSETUP('perform', mote, assemblies, _this.gwMote, null));
// 	});
//     }
// };





/**
*  Helper function to retrieve all wireless motes from a simulation given
*  a gateway mote.
* @param gatewayMote A mote which is associated to a WLIP gateway.
* @returns {Sonoran.Mote[]} All wireless motes.
*/
Sonoran.MSETUP.getAllWirelessMotes = function(/** Sonoran.Mote */gatewayMote) {
    if( gatewayMote.getGatewayP() == null)
	throw new Exception(sprintf("Mote <%s> is not a gateway", gatewayMote));
    var gateway = gatewayMote.getGatewayP();
    if( !(gateway instanceof Sonoran.WLIP.Gateway) )
	throw new Exception("Unknown type of gateway: "+gateway);
    if( gatewayMote.getClass() != "saguaro" )
	throw new Exception("Cannot handle this class of gateway mote: "+gatewayMote.getClass());
    return gateway.getGatedMotes();
};


/**
 * Place all subject motes along concentric hexagons. The innermost hexagon has a circumference
 * of six distances. The next 12 and so one. Motes are placed at the specfied distance.
 * @param center   The center mote.
 * @param motes    The motes to be place within earshot of the center.
 * @param distance The basic circumference unit of the hexagons (default 1000).
 */
Sonoran.MSETUP.layoutHexagon = function (/**Sonoran.Mote*/center, /**Sonoran.Mote[]*/motes, /**Number*/distance) {
    if( distance==null ) distance = 1000;
    var angle60 = Math.PI*2/6; // 60 degree angle
    var cpos = center.getPosition();
    var moteidx = 0;
    // Move all wireless motes close to gateway
    var populateRing = function (level) {
	var dist = level*distance;
	for( var hex=0; hex<6; hex++ ) {
	    var spikedir = angle60*hex;
	    var sx = cpos.x + Math.floor(Math.cos(spikedir)*dist);
	    var sy = cpos.y + Math.floor(Math.sin(spikedir)*dist);
	    for( var li=0; li<level; li++ ) {
		var linedir = spikedir - Math.PI*2/3; // 120 degree angle off from spike
		var away = li*distance;
		var mx = sx + Math.floor(Math.cos(linedir)*away);
		var my = sy + Math.floor(Math.sin(linedir)*away);
		motes[moteidx].updatePosition({x:mx,y:my,z:0},SCB);
		if( ++moteidx >= motes.length )
		    return;
	    }
	}
	populateRing(level+1);
    }
    populateRing(1);
};


/**
 * Place all subject motes one after the other within a random distance not exceeding
 * distance at a random angle from any one of the previously poisitioned motes.
 * Motes are placed in concentric circles around the center.
 * @param center   The center mote.
 * @param motes    The motes to be place within earshot of the center.
 * @param distance The maximum distance from the random anchor mote.
 */
Sonoran.MSETUP.layoutRandomCentered = function (/**Sonoran.Mote*/center, /**Sonoran.Mote[]*/motes, /**Number*/distance) {
    if( distance==null ) distance = 1000;
    var cpos = center.getPosition();
    var mpos = [cpos];
    for( var mi=0; mi<motes.length; mi++ ) {
	var mp = mpos[Math.floor(Math.random()*mi)];
	var di = Math.random()*distance;
	var an = Math.random()*Math.PI*2;
	mpos.push({x: mp.x + Math.floor(Math.cos(an)*di),
		   y: mp.y + Math.floor(Math.sin(an)*di), z:0});
    }
    for( var mi=0; mi<motes.length; mi++ ) {
	motes[mi].updatePosition(mpos[mi],SCB);
    }
};

/**
 * Place all subject motes within earshot of the center.
 * Motes are placed in concentric circles around the center.
 * @param center   The center mote.
 * @param motes    The motes to be place within earshot of the center.
 * @param startRadius The radius of innermost circle (default 100).
 * @param maxRadius The maximum distance motes maybe placed from the center mote (default 1200).
 * @param stepRadius Radius increases by this distance until maxRadius exceeded (default 100).
 * @param startMoteCnt The number of motes on the innermost circle. This number grows proportially with the radius (default 10).
 */
Sonoran.MSETUP.layoutEarshot = function (/**Sonoran.Mote*/center, /**Sonoran.Mote[]*/motes,
    /**Number*/startRadius, /**Number*/maxRadius, /**Number*/stepRadius, /**Number*/startMoteCnt) {
    if( startRadius==null )  startRadius = 200;
    if( maxRadius==null )    maxRadius = 1200;
    if( stepRadius==null )   stepRadius = 100;
    if( startMoteCnt==null ) startMoteCnt = 10;

    // Move all wireless motes close to gateway
    var cpos = center.getPosition();
    var nmotes = motes.length;
    var maxNodes = startMoteCnt;
    var radius = startRadius;
    var moteidx = 0;
    while( nmotes > 0 ) {
	var n = radius+stepRadius < maxRadius && nmotes > maxNodes ? maxNodes : nmotes;
	var angle = Math.PI*2/n;
	for( var i=0; i<n; i++ ) {
	    var mote = motes[moteidx+i];
	    mote.updatePosition({x:cpos.x+Math.floor(Math.cos(angle*i)*radius),
				 y:cpos.y+Math.floor(Math.sin(angle*i)*radius),
				 z:cpos.z}, SCB);
	}
	radius += stepRadius;
	maxNodes = Math.floor(radius/startRadius * startMoteCnt + 0.5);
	moteidx += n;
	nmotes -= n;
    }
};


/**
 * Place all subject motes in a rectangular grid layout. The gateway mote and its position can be specified.
 *
 * @param gateway  The gateway mote which. Use gwPos to specify the position of the dateway.
 * @param motes    The array of motes to be placed.
 * @param corner   The object with x, y and z coordinates for the start corner. If null defaults to 0,0,0.
 * @param num      Number of rows or columns depending on mode. If null it defaults to sqrt(motes.length).
 * @param mode     Fill mode: 'row' or 'column' wise. If null it defaults 'row'.
 * @param deltax  The distance on the X axis between motes. If null defaults to 100.
 * @param deltay  The distance on the Y axis between motes. If null same as dx.
 * @param gwPos    The object with x, y and z coordinates where to place the gateway.
 *                 When null gateway is placed in the center of the rectangle.
 */
Sonoran.MSETUP.layoutRectangle = function(/**Sonoran.Mote*/gateway,
                                          /**Sonoran.Mote[]*/motes,
                                          /**{x:Number,y:Number,z:Number}*/corner,
                                          /**Number*/ num,
                                          /**String*/ mode,
                                          /**Number*/ deltax,
                                          /**Number*/ deltay,
                                          /**{x:Number,y:Number,z:Number}*/gwPos){
    corner = (corner == null) ? {x:0,y:0,z:0} : corner;
    num    = (num    == null) ? Math.floor(Math.sqrt(motes.length)) : num;
    deltax = (deltax == null) ? 100 : deltax;
    deltay = (deltay == null) ? deltax : deltay;
    if (mode == 'column'){
        for (var i=0; i<motes.length; i++){
            var mote = motes[i];
            mote.updatePosition({
                    x: corner.x + (i % num) * deltax,
                    y: corner.y + Math.floor(i / num) * deltay,
                        z: corner.z}, SCB);
        }
        gwPos  = (gwPos  == null) ? {x:corner.x + Math.floor(num / 2) * deltax,
                                     y:corner.y + Math.floor(motes.length / num) * deltay,
                                     z:corner.z} : gwPos;
    }
    else {
        /*Default 'row'*/
        for (var i = 0; i < motes.length; i++){
            var mote = motes[i]
            mote.updatePosition({
                    x: corner.x + Math.floor(i / num) * deltax,
                    y: corner.y + (i % num) * deltay,
                        z: corner.z}, SCB);
        }
        gwPos  = (gwPos  == null) ? {x:corner.x + Math.floor(motes.length / num) * deltax,
                                     y:corner.y + Math.floor(num / 2) * deltay,
                                     z:corner.z} : gwPos;
    }
    // position the gateway
    gateway.updatePosition(gwPos, SCB);
};





/**
 * Place all subject motes one after the other in a chain.
 * @param left   The left mote in the chain.
 * @param motes    The motes to be place within earshot of the center.
 * @param distance Distance between two motes
 */
Sonoran.MSETUP.layoutChain = function (/**Sonoran.Mote*/left, /**Sonoran.Mote[]*/motes, /**Number*/distance) {
    if( distance==null ) distance = 1000;
    var mpos = [];
    var lpos = left.getPosition();
    for( var mi=1; mi<=motes.length; mi++ ) {
	mpos.push({x: lpos.x + distance * mi, y: lpos.y });
    }
    for( var mi=0; mi<motes.length; mi++ ) {
	motes[mi].updatePosition(mpos[mi],SCB);
    }
};






/**
 * @namespace Sonoran.CLI.Commands.MSETUP
 * @private
 */
Sonoran.CLI.Commands.MSETUP = {};


/**
 * @private
 */
Sonoran.CLI.Commands.MSETUP.USAGE = "Setup and manage a set of motes.";

/**
 * @private
 */
Sonoran.CLI.Commands.MSETUP.DESCRIPTION =
    "The 'msetup' commands help to manage a set of motes and easily\n"+
    "establish a known configuration on those motes:\n" +
    " msetup-setup         Load and install assembly and its dependencies on multiple motes at once.\n"  +
    " msetup-apply         Specify a set of assemblies and control the process of installing on set of wireless motes.\n"  +
    " msetup-layout        Position a set of motes.\n";


/**
 * MSETUP setup command
 * @private
 * @class
 * @constructor
 */
Sonoran.CLI.Commands.MSETUP.SetupCommand = function(shell, name) {
    this.description =
	"Ensure that a set of assemblies is available on a set of motes. The command\n" +
	"takes care of removing assemblies that would conflict with the loaded\n"+
	"ones and loads the new assemblies in the proper order.";
    this.vOpt      = new GetOpt.Option("v", "--verbose", 0, null, "Print info about actions.");
    this.depOpt    = new GetOpt.Option("D", "--no-auto-dependencies", 0, null, "Do not automatically load any dependendent assemblies.");
    this.frstOpt   = new GetOpt.Option("f", "--factory-reset", 0, null, "Perform factory reset instead of assembly delete.");
    this.excaOpt   = new GetOpt.Option("E", "--excess", 0, null, "Allow excess assemblies.");
    this.dirSpec   = new GetOpt.Simple("dir");
    this.dirOpt    = new GetOpt.Option("d", "--dir", 0, null,
				       "Look for assemblies in the specified directories (comma separated).\n"+
				       "A trailing '/*' means scan whole subtree." + 
				       "Two or more trailing stars means scan only upto the number of stars deep.\n"+
				       "To scan the GAC specify '~mr/gac' as directory name." +
				       "To scan the current directory use '.'"
				       ,
				       this.dirSpec);
    this.depthSpec = new GetOpt.Number("num", "Examine directories num levels deep for assemblies.", null, 1);
    this.depthOpt  = new GetOpt.Option("n", "--depth", 0, null, null, this.depthSpec);
    var optSet = new GetOpt.OptionSet([ this.vOpt, this.depOpt, this.frstOpt, this.excaOpt, this.depthOpt, this.dirOpt  ]);
    this.asmSpec = new GetOpt.Simple("assembly-spec", "Assembly specifier.");
    this.asmSpecSet = new GetOpt.Set(this.asmSpec);
    var cmdSpec = new Sonoran.CLI.Spec(name, Sonoran.CLI.DST_MANY_MOTES);
    CLI.Command.call(this, shell, cmdSpec, [ optSet, this.asmSpecSet ]);
};

/** @private */
Sonoran.CLI.Commands.MSETUP.SetupCommand.prototype = extend(
    CLI.Command.prototype,
    {
	/** @private */
	exec: function (callback) {
	    var motes = this.cmdSpec.getMotes();
            assert(motes.length);

	    var self = this;
	    var MS = new Sonoran.MSETUP();
	    var ex;
	    MS.setMotes(motes);
	    MS.forceFactoryReset =     this.frstOpt.isSet() ? true : false;
	    MS.allowExcessAssemblies = this.excaOpt.isSet() ? true : false;

	    if( this.dirOpt.isSet() )
		MS.setDirs(this.dirSpec.getArg().split(/[,;]/));
	    var n = this.asmSpecSet.getSize();
	    var asmnames = [];
	    for( var i=0; i<n; i++ ) {
		this.asmSpecSet.setTo(i);
		asmnames.push(new Sonoran.AsmName(this.asmSpec.getArg()));
	    }
	    MS.findAndAddAssemblies(asmnames, this.depOpt.isSet());
	    var assemblies = MS.getAssemblies();
	    if( this.vOpt.isSet() ) {
		printf("Table of resolved assembly specifiers:\n"+
		       "             Filter spec |           Found assembly | SBA filename  \n"+
		       "-------------------------+--------------------------+----------------------------\n");
		for( var i=0; i<assemblies.length; i++ )
		    printf("%24s | %24s | %s\n",
			   asmnames[i]==null ? "automatic dependency" : asmnames[i],
			   assemblies[i],
			   assemblies[i].getSBAPath());
		var dependencies = MS.getDependencies();
		for( var i=0; i<dependencies.length; i++ )
		    this.shell.print(sprintf("%24s | %24s | %s\n",
			                     "import dependency",
			                     dependencies[i],
			                     "--not-avalable--"));
	    }
	    MS.analyseActions();

	    if( this.vOpt.isSet() ) {
		println("");
		var motes = MS.getMotes();
		var actions = MS.getActions();
		for( var ai=0; ai<actions.length; ai++ ) {
		    printf("Actions scheduled for mote <%s>:\n", motes[ai]);
		    var a = actions[ai];
		    if( a.factoryReset ) {
			printf("   factoryReset\n");
		    } else {
			if( a.deleteAsms.length > 0 )
			    printf("   delete:  %s\n", a.deleteAsms.join(", "));
			if( a.nopAsms.length > 0 )
			    printf("   nop:     %s\n", a.nopAsms.join(", "));
		    }
		    printf("   load:    %s\n", a.loadAsms.join(", "));
		}
		println("");
	    }

	    if( self.vOpt.isSet() )
		MS.onProgress = MS.printOnProgress;

	    MS.performActions();

	    if( this.vOpt.isSet() ) {
		printf("\nTable of asmid per mote:\n");
		var div = "-------------------------+";
		var sep = "";
		for( var ai=assemblies.length-1; ai>=0; ai-- ) {
		    printf("%*s |%s\n", 24+7+ai*7, assemblies[ai], sep);
		    sep += "      |";
		    div += "------+";
		}
		println(div);
		var motes = MS.getMotes();
		for( var mi=0; mi<motes.length; mi++ ) {
		    var asmentries = MS.getMoteAsmEntries(motes[mi]);
		    printf("%24s | %s |\n",
			   motes[mi],
			   asmentries.map(function(e) { return sprintf("a:%02X",e.getId()); }).join(" | "));
		}
		println("");
	    }

	    callback(new AOP.OK("MoteSetup completed"));
	}
    }
);


/**
 * MSETUP layout motes
 * @private
 * @class
 * @constructor
 */
Sonoran.CLI.Commands.MSETUP.LayoutCommand = function(/** CLI.Shell */shell, /** String */name) {
    this.description =
	"Put simulated motes into a specified layout.";
    this.algoParams = new GetOpt.Simple("params",
					"Parameter for the selected algorithm:\n"+
					" hexagon: edgelength\n"+
					"    The edge length of the innermost hexagon.\n"+
					"     (default 1000)\n"+
					" rndc: maxdistance\n"+
					"    The maximum random distance (default 1000).\n"+
					" earshot: start,max,step,cnt\n"+
					"    Start radius, max radius, step radius, number of\n"+
					"    motes on start circle (default: 200,1200,100,10).\n"+
					" rectangle: deltaX,deltaY\n"+
                                        "    Horizontal/vertical distances (can be negative)\n"+
                                        "    (default: 1000,1000)\n",
					" chain: distance\n"+
                                        "    Horizontal distance\n"+
                                        "    (default: 1000)\n",
					
					null, null);
    this.algoSpec = new GetOpt.Keywords(null, "Layout of motes.",
					[ "hexagon",
					  "rndc",
					  "earshot",
                                          "rectangle",
					  "chain" ],
					[ "Concentric hexgons of specified edge length (--distance).\n"+
					  "Gateway is the center.",
					  "Random direction at most distance away from any previously\n"+
					  "placed mote.",
					  "Place all motes within earshot of the center",
                                          "Rectangle with default gateway in the center",
                                          "Chain with default gateway on the left"
					]);
    this.vOpt = new GetOpt.Option("v", "--verbose", 0, null, "Print info about actions.");
    var optSet = new GetOpt.OptionSet([ this.vOpt ]);
    var argSeq = [ optSet, this.algoSpec, this.algoParams ];
    var cmdSpec = new Sonoran.CLI.Spec(name, Sonoran.CLI.DST_MANY_MOTES);
    CLI.Command.call(this, shell, cmdSpec, [new GetOpt.Seq(argSeq, 2) ]);
};

/** @private */
Sonoran.CLI.Commands.MSETUP.LayoutCommand.prototype = extend(
    CLI.Command.prototype,
    {
	/** @private */
	exec: function (callback) {
	    var motes = this.cmdSpec.getMotes();
	    var wmotes, anchor;
	    if( motes.length<=1 )  {
		callback(new AOP.ERR(ERR_GENERIC, "Not enough motes specified."));
		return;
	    }
	    // if( motes.length==1 ) {
	    // 	anchor = motes[0];
	    // 	wmotes = Sonoran.MSETUP.getAllWirelessMotes(anchor);
	    // 	if( wmotes.length == 0 ) {
	    // 	    callback(new AOP.ERR(ERR_GENERIC, "No wireless motes found."));
	    // 	    return;
	    // 	}
	    // } else {
		anchor = motes.shift();
		wmotes = motes;
	    //}
	    var algo = this.algoSpec.getSelectedKeyword();
	    var params = this.algoParams.getArg();
	    if( algo == "hexagon" ) {
		if( params==null )
		    params = "1000";
		if( !params.match(/^\d+$/) )
		    throw new Exception("Bad hexagon algorithm parameter - expecting a number.");
		Sonoran.MSETUP.layoutHexagon(anchor, wmotes, parseInt(params));
	    }
	    else if( algo == "rndc" ) {
		if( params==null )
		    params = "1000";
		if( !params.match(/^\d+$/) )
		    throw new Exception("Bad rndc algorithm parameter - expecting a number.");
		Sonoran.MSETUP.layoutRandomCentered(anchor, wmotes, parseInt(params));
	    }
	    else if( algo == "earshot" ) {
		if( params==null )
		    params = "200,1200,100,10";
		if( !params.match(/^\d+,\d+,\d+,\d+$/) )
		    throw new Exception("Bad earshot algorithm parameter - expecting 4 numbers separated by comma.");
		params = params.split(",");
		Sonoran.MSETUP.layoutEarshot(anchor, wmotes, parseInt(params[0]), parseInt(params[1]), parseInt(params[2]), parseInt(params[3]));
	    }
	    else if( algo == "rectangle" ) {
		if( params==null )
		    params = "1000,1000";
		if( !params.match(/^-?\d+,-?\d+(,\d+)?$/) )
		    throw new Exception("Bad rectangle algorithm parameter - expecting 2/3 numbers separated by comma.");
		params = params.split(",");
		Sonoran.MSETUP.layoutRectangle(anchor, wmotes, null/**corner*/,(params.length==2 ? null : parseInt(params[2]))/**num*/, null/**mode*/,
                                               parseInt(params[0]), parseInt(params[1]), null /**gwPos*/);
	    } else if( algo == "chain" ) {
		if( params==null )
		    params = "1000";
		if( !params.match(/^\d+$/) )
		    throw new Exception("Bad chain algorithm parameter - expecting positive number.");
		Sonoran.MSETUP.layoutChain(anchor, wmotes, parseInt(params));
	    }
	    else {
		callback(new AOP.ERR(ERR_GENERIC, "Unknown layout algorithm: "+this.algoSpec.getSelectedKeyword()));
		return;
	    }
	    callback(new AOP.OK());
	}
    }
);







// /**
//  * MSETUP handle command
//  * @private
//  * @class
//  * @constructor
//  */
// Sonoran.CLI.Commands.MSETUP.ApplyCommand = function(/** CLI.Shell */shell, /** String */name) {
//     this.description =
// 	"Manage a process which loads a set of assemblies onto a set of wireless motes which register with a gateway. The command\n" +
// 	"takes care of removing assemblies that would conflict with the loaded ones and loads the new assemblies in the proper order.\n" +
//         "The command takes a mote - a properly setup wlip gateway - and a parameter 'action' which specifies the action for the process to take.\n" +
//         "'on' starts the process and expects a number of assemblies which should be loaded on the wireless motes. 'list' prints the motes which\n" +
//         "are currently known to the wirless gateway and the maintenance process. 'perform' performs the operation on the current set of\n" +
//         "motes registered with the gateway. 'gather' lets the process look for new hardware motes in range or move simulated motes in range.\n" +
//         "'off' closes the current setup process. 'ignore' allows to specify motes to be ignored by the setup process.\n" +
//         "'on' supports a -i specification, an interval after which the setup process is started automatically on each wireless mote having been\n" +
//         "detected in this interval.";
    
//     this.vOpt      = new GetOpt.Option("v", "--verbose", 0, null, "Print info about actions.");
//     this.depOpt    = new GetOpt.Option("D", "--no-auto-dependencies", 0, null, "Do not automatically load any dependendent assemblies.");
//     this.frstOpt   = new GetOpt.Option("f", "--factory-reset", 0, null, "Perform factory reset instead of assembly delete.");
//     this.excaOpt   = new GetOpt.Option("E", "--excess", 0, null, "Allow excess assemblies.");
//     this.dirSpec   = new GetOpt.Simple("dir");
//     this.dirOpt    = new GetOpt.Option("d", "--dir", 0, null,
// 				       "Look for assemblies in this directory (can be specified repeatedly).\n"+
// 				       "A trailing '/*' means scan whole subtree. Two or more trailing stars\n"+
// 				       "means scan only upto the number of stars deep. To scan the GAC specify\n"+
// 				       "'~gac' as directory name.",
// 				       this.dirSpec);
//     this.depthSpec = new GetOpt.Number("num", "Examine directories num levels deep for assemblies.", null, 1);
//     this.depthOpt  = new GetOpt.Option("n", "--depth", 0, null, null, this.depthSpec);
//     this.intervalSpec = new GetOpt.TimespanSpec(3000);
//     this.intervalOpt = new GetOpt.Option("i", "--interval", 0, null, "Do mote setup automatically on new motes arriving in this interval", this.intervalSpec);
//     this.countSpec = new GetOpt.Number();
//     this.countOpt = new GetOpt.Option("c", "--count", 0, null, "Do mote setup as soon as count motes arrive in an interval", this.countSpec);
//     this.euiSpec   = new GetOpt.Simple("eui");
//     this.euiOpt    = new GetOpt.Option("e", "--eui", 0, null, "Install user defined EUIs on all wireless motes.", this.euiSpec);

//     var optSet = new GetOpt.OptionSet([ this.vOpt, this.depOpt, this.frstOpt, this.excaOpt, this.depthOpt, this.dirOpt, this.intervalOpt, this.countOpt, this.euiOpt  ]);
//     this.actions = [
//         "on",
//         "off",
//         "perform",
//         "list",
//         "gather",
//         "clear",
//         "ignore"
//     ];
//     this.actionsDescr = [
//         "on asm-identity...  Initialize mote-setup to load specified assemblies and start maintenance\n",
//         "off                 Switch off maintenance\n",
//         "perform             Perform maintenance on current list of detected motes\n",
//         "list                List current set of detected and ignored motes\n",
//         "gather              Repeat scan of motes to possibly setup\n",
//         "clear               Clear set of candidates and ignored motes\n",
//         "ignore EUI..        Ignore motes with one of the specified EUIs"
//     ];
//     this.actionSpec = new GetOpt.Keywords("action", this.actions.join("|"), this.actions, this.actionsDescr, GetOpt.IGNORE_CASE);
//     this.restOfArgs = new GetOpt.RestOfArgs();
//     var cmdSpec = new Sonoran.CLI.Spec(name, Sonoran.CLI.DST_ONE_MOTE);
//     CLI.Command.call(this, shell, cmdSpec, [ optSet, this.actionSpec, this.restOfArgs ]);
// };

// /**
//  * @private
//  */
// Sonoran.CLI.Commands.MSETUP.CurrentMaintainer = null;

// /** @private */
// Sonoran.CLI.Commands.MSETUP.ApplyCommand.prototype = extend(
//     CLI.Command.prototype,
//     {
// 	/** @private */
// 	exec: function (callback) {
// 	    var mote = this.cmdSpec.getMote();
// 	    if(mote.getGatewayP() == null) {
// 		callback(new AOP.ERR(sprintf("Not a WLIP gateway mote: %s"), mote));
// 		return;
// 	    }
//             var _this = this;
//             var roa = this.restOfArgs.getRestArgs();
//             var action = this.actionSpec.getArg();
//             var currentMaintainer = Sonoran.CLI.Commands.MSETUP.CurrentMaintainer;

//             if (action != "on" && !currentMaintainer) {
//                 callback(new AOP.ERR("No maintainenance in progress"));
//                 return;
//             }
            
//             if (action != null) {
//                 if (action == "on") {
//                     if (currentMaintainer) {
//                         callback(new AOP.ERR("Maintainenance already in progress"));
//                         return;
//                     }
// 	            var MS = new Sonoran.MSETUP();
// 	            MS.setMotes([]);
// 	            MS.forceFactoryReset =     this.frstOpt.isSet() ? true : false;
// 	            MS.allowExcessAssemblies = this.excaOpt.isSet() ? true : false;
// 		    if( this.dirOpt.isSet() )
// 			MS.setDirs(this.dirSpec.getArg().split(/[,;]/));
//                     if (roa.length == 0) {
//                         callback(new AOP.ERR("Missing assembly specifications"));
//                         return;
//                     }
// 	            var asmnames = roa.map(function(s) { return new Sonoran.AsmName(s); });
// 	            MS.findAndAddAssemblies(asmnames, this.depOpt.isSet());
// 	            var assemblies = MS.getAssemblies();
// 	            if( this.vOpt.isSet() ) {
// 		        this.shell.print("Table of resolved assembly specifiers:\n"+
// 		                         "             Filter spec |           Found assembly | SBA filename  \n"+
// 		                         "-------------------------+--------------------------+----------------------------\n");
// 		        for( var i=0; i<assemblies.length; i++ )
// 		            this.shell.print(sprintf("%24s | %24s | %s\n",
// 			                             asmnames[i]==null ? "automatic dependency" : asmnames[i],
// 			                             assemblies[i],
// 			                             assemblies[i].getSBAPath()));
// 			var dependencies = MS.getDependencies();
// 		        for( var i=0; i<dependencies.length; i++ )
// 		            this.shell.print(sprintf("%24s | %24s | %s\n",
// 			                             "import dependency",
// 			                             dependencies[i],
// 			                             "--not-avalable--"));
// 	            }
// 	            if(this.vOpt.isSet() )
// 		        MS.onProgress = MS.printOnProgress;

//                     var listenerf = function(ev) {
//                         _this.shell.println(ev);
//                     };
//                     var closef = function(result) {
//                         _this.shell.println("Maintenance closed.");
//                     };
//                     currentMaintainer = new Sonoran.MSETUP.Maintenance(mote, MS, listenerf, closef);
//                     Sonoran.CLI.Commands.MSETUP.CurrentMaintainer = currentMaintainer;
//                     if (this.intervalOpt.isSet()) {
//                         currentMaintainer.setInterval(this.intervalSpec.getSpan());
//                     }
//                     if (this.countOpt.isSet()) {
//                         currentMaintainer.setCount(this.countSpec.getNumber());
//                     }
//                     if (this.euiOpt.isSet()) {
// 		        var ex, eui;
// 		        try {
// 		            eui = Util.UUID.completeEUI(this.euiSpec.getArg());
// 		        } catch (ex) {
// 		            callback(new AOP.ERR("Invalid eui: " + ex.toString()));
// 		            return;
// 		        }
//                         currentMaintainer.setEUI(eui);
//                     }
//                     currentMaintainer.start();
//                     callback(new AOP.OK());
//                     return;
//                 } else if (action == "off") {
//                     currentMaintainer.close(new AOP.OK());
//                     Sonoran.CLI.Commands.MSETUP.CurrentMaintainer = currentMaintainer = null;
//                     callback(new AOP.OK());
//                     return;
//                 } if (action == "perform") {
//                     currentMaintainer.perform();
//                 } if (action == "list") {
//                     ;
//                 } if (action == "gather") {
//                     currentMaintainer.gather();
//                 } if (action == "clear") {
//                     currentMaintainer.clear();
//                 } else if (action == "ignore") {
//                     if (roa.length==0) {
//                         callback(new AOP.ERR("Missing eui"));
//                         return;
//                     }
//                     var uniqueids = roa.map(function(s) {
//                         var ex;
// 		        try {
//                             return Util.UUID.completeEUI(s);
//                         } catch(ex) {
//                             throw new Exception("Invalid uniqueid: " + s);
//                         }
//                     });
//                     currentMaintainer.ignore(uniqueids);
//                 }
// 	    }
//             callback(new AOP.OK(currentMaintainer.toString()));
//         }
//     }
// );





CLI.commandFactory.addModule("Sonoran.CLI.Commands.MSETUP");
