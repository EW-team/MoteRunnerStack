//  (C) COPYRIGHT INTERNATIONAL BUSINESS MACHINES CORPORATION 2006-2010
//                       ALL RIGHTS RESERVED
//        IBM Research Division, Zurich Research Laboratory
// --------------------------------------------------------------------










//---------------------------------------------------------------------------------------------------------------
//
// Saguaro.Device
//
//---------------------------------------------------------------------------------------------------------------


Class.define(
    "Saguaro.Device",
    /**
     * @lends Saguaro.Device.prototype
     */
    {
	/**
	 * Saguaro.Device provides the base class for simulated devices. Retrieve a device instance
	 * by calling MoteImpl.getDeviceInstance() on a Sonoran.Mote instance of class 'saguaro',
	 * i.e. a simulated mote.
	 * @constructs
	 * @param name Device name
	 */
	__constr__: function(/** String */name) {
	    this.name = name;
	    this.type = null;
	    this.description = null;
	    this.impl = null;
	    this.feedGenerator = null;
	    this.feedListeners = new Util.Listeners();
	    this.cachedState = null;
	    this.cacheSystemtTime = null;
	    this.cacheSaguaroTime = null;
	    this.supportsFeeding = true;
	},

	/**
	 * Device name
	 * @type String
	 * @private
	 */
	name: null,

	/**
	 * Type of device.
	 * @type String
	 * @private
	 */
	type: null,

	/**
	 * Device description.
	 * @type String
	 * @private
	 */
	description: null,

	/**
	 * Target mote
	 * @type Sonoran.MoteImpl
	 * @private
	 */
	impl: null,

	/**
	 * Last state retrieved from device.
	 * @type Saguaro.DeviceState
	 * @private
	 */
	cachedState: null,

	/**
	 * Systemt time when state was retrieved last time.
	 * @type Number
	 * @type private
	 */
	cacheSystemtTime: null,

	/**
	 * Saguaro time when state was retrieved last time.
	 * @type Number
	 * @type private
	 */
	cacheSaguaroTime: null,

	/**
	 * If set, the generator function for data to feed in. Name of feeder is
	 * set in feedGenerator.feedName
	 * @type function
	 * @private
	 */
	feedGenerator: null,

	/**
	 * Listeners registered here are invoked (with an AOP.OK/AOP.ERR instance) when a feeder stops.
	 * @type Util.Listeners
	 * @private
	 */
	feedListeners: null,

	/**
	 * If true feeding is supported.
	 * @type Boolean
	 * @private
	 */
	supportsFeeding: false,
	
	/**
	 * @returns {String} string
	 */
	toString: function() {
            return "Device: name " + this.name + ", type " + this.type + ", mote " + this.impl;
	},

	/**
	 * Returns object with properties 'name', 'type' and 'description'.
	 * @returns {Object}
	 */
	getInfo: function() {
            return {
		name: this.name,
		type: this.type,
		description: this.description
            };
	},

	
	/**
	 * Returns the mote of this device.
	 * @returns {Saguaro.MoteImpl} the mote of this device
	 */
	getImpl: function() {
            return this.impl;
	},

	
	/**
	 * Set the target mote.
	 * @param impl
	 * @private
	 */
	setImpl: function(/** Saguaro.MoteImpl */impl) {
            this.impl = impl;
	},

	
	/**
	 * @returns {String} device name
	 */
	getName: function() {
            return this.name;
	},

	
	/**
	 * Set the name of the device.
	 * @param name
	 * @private
	 */
	setName: function(/** String */name) {
            assert(!this.name||this.name===name);
            this.name = name;
	},

	
	/**
	 * Set type.
	 * @param type
	 * @private
	 */
	setType: function(/** String */type) {
            this.type = type;
	},

	
	/**
	 * Get type.
	 */
	getType: function() {
            return this.type;
	},

	
	/**
	 * Set description.
	 * @param description
	 * @private
	 */
	setDescription: function(/** String */description) {
            this.description = description;
	},

	
	/**
	 * Get description.
	 * @returns {String}
	 */
	getDescription: function() {
            return this.description;
	},


	/**
	 * 'device-set-state' command.
	 *  @param args                     Value to be set
	 *  @param callback                 
	 *  @returns {Saguaro.Response}
	 * @throws {AOP.Exception}
	 */
	setState: function(/** Blob */args, /** DFLT_ASYNC_CB */callback) {
	    if (BC.is(callback)) { return BC.exec(arguments.callee, this, arguments); }
            var impl = this.impl;
            var conn = impl.getConnection();
            var moteid = impl.getMoteId();
            return conn.getDeviceCmd(moteid, this.name, "device-set-state", args).issue1(callback);
	},


	/**
	 * Return cached device state.
	 * @returns {Saguaro.DeviceState}
	 */
	getCachedState: function() {
            return this.cachedState;
	},

	
	/**
	 * Get device state. Returns an AOP.GenOK with data pointing to a state object.
	 * @param callback
	 * @returns {Object}
	 * @throws {AOP.Exception}
	 */
	getState: function(/** DFLT_ASYNC_CB */callback) {
	    assert(arguments.length===1, "API change");
	    if (BC.is(callback)) { return BC.exec(arguments.callee, this, arguments); }

            var conn = this.impl.conn;
	    var moteid = this.impl.moteid;
            var _this = this;

	    conn.getDeviceCmd(moteid, this.name, "device-get-state").issue1(function(result) {
		if (result.code !== 0) {
		    callback(result);
		} else {
		    var reply = result.getData().getReply();
		    var response = result.getData().getResponse();
		    if (!reply.error) {
			var devname = response.device;
			assert(devname && devname === _this.name);
			_this.onState(reply, response.time, true);
		    } 
		    callback(new AOP.OK(_this.cachedState));
		}
	    });
	},

	
	/**
	 * State has been received for this device.
	 * @param reply   Reply as received in Saguaro.Command from mote
	 * @param time    Timee as in Saguaro.Command from mote
	 * @param signal  If true, fire event
	 * @private
	 */
	onState: function(/** Object */reply, /** Number */time, /** Boolean */signal) {
            var state = reply.data;
	    assert(state);
            this.cachedState = state; //new Saguaro.DeviceState(this.mote, this.name, state);
            this.cacheSystemtTime = Clock.get();
            this.cacheSaguaroTime = time;
	},

	/**
	 * Return name of feeder if one is active or null.
	 * @returns {String} generator name
	 */
	getFeederName: function() {
	    return (this.feedGenerator) ? this.feedGenerator.feedName : null;
	},
	
	
	/**
	 * Return feeder function if one is active or null.
	 * @returns {function} generator function
	 */
	getFeederGenerator: function() {
            return this.feedGenerator;
	},

	
	/**
	 * Set the generator function and start feeding data generated by the generator function.
	 * The function is called again when a mote application accesses the sensor and new data is required by the
	 * simulation. The function must return an array of data records. Each data record starts with
	 * a timestamp followed by values for the partical sensor device. The number and range of values
	 * depends on the concrete sensor. Records for the temperature sensor might be for example
	 * [ [ 1000, 500 ], [ 2000, 600 ]].</br>
	 * Note that the simulation linearly interpolates the values between the specified timestamps.</br>
	 * If the generator returns null or an empty array, the feeding process for the device continues, but no
	 * records are fed into the simulation.</br>
	 * If a generator function has already been set before, it is replaced by the
	 * specified parameter and the new function is called to restart the feeding process.
	 * @param generator   Generator function
	 * @param name        Generator name
	 * @param callback    
	 * @throws {AOP.Exception}
	 */
	start: function(/** Saguaro.Device.FEED_GENERATOR_SIGNATURE */generator, /** String */name, /** DFLT_ASYNC_CB */callback) {
            assert((arguments.length==3)&&(typeof(arguments[2])==='function')&&(typeof(arguments[0])==='function'));
            assert(this.impl!=null, "No destination mote set in Saguaro.Device");
	    if (BC.is(callback)) { return BC.exec(arguments.callee, this, arguments); }

            this.feedGenerator = generator;
	    this.feedGenerator.feedName = name;
            
            var _this = this;
            this.generate(0, function(result) {
			      if (result.code != 0) {
				  _this.stop(result);
				  var msg = sprintf("Feeding data to '%s:%s' failed: %s", _this.impl.mote, _this.name, result);
				  Logger.err(msg);
				  callback(new AOP.ERR(msg, result));
			      } else {
				  callback(new AOP.OK());
			      }
			  });
	},


	/**
	 * Stop feeding and deactivate this feeder. Invokes 'listeners' of this instance
	 * with the OK/ERR instance of this call.
	 * @param result AOP.OK or AOP.ERR instance
	 */
	stop: function(/** AOP.OK */result) {
	    this.feedGenerator = null;
	    this.feedListeners.notify(result);
	},


	/**
	 * @param ev
	 * @param eventListeners
	 * @private
	 */
	onNeedMoreDataEvent: function(/** Event */ev, /** Saguaro.Connection.EventListeners */eventListeners) {
	    assert(ev.evname===Sonoran.EV_NAME_NEEDMOREDATA);
	    assert(ev.mote===this.impl.mote && ev.device===this.name);
	    if (!this.feedGenerator) {
		return;
	    }
	    var result = this.generate(ev.time*1000, SCB);
	    if (result.code === 0) {
		eventListeners.setContinue(true).setAbort(true, true);
	    } else {
		this.stop(result);
	    }
	},


	/**
	 * @param ev
	 * @param eventListeners
	 * @private
	 */
	onRadiohwAddrEvent: function(ev, eventListeners) {
	    var _this = this;
	    var conn = eventListeners.getConnection();
	    if (ev.saddr !== undefined) {
		this.cachedState.saddr = ev.saddr;
	    }
	    if (ev.xaddr !== undefined) {
		this.cachedState.xaddr = ev.xaddr;
	    }
	    if (ev.panid !== undefined) {
		this.cachedState.panid = ev.panid;
	    }
	},


	/**
	 * The underlying mote disappeared.
	 * @private
	 */
	onDeregister: function() {
            this.stop(new AOP.OK());
	},

	
	/**
	 * Call generator function and feed records.
	 * @private
	 */
	generate: function(/** Number */nanos, /** DFLT_ASYNC_CB */callback) {
	    if (BC.is(callback)) { return BC.exec(arguments.callee, this, arguments); }
            var _this = this;
            var records = null;
            try {
		records = this.feedGenerator(this.impl.mote, this, nanos);
            } catch (x) {
		var err = Ex2ERR(ERR_GENERIC, x, sprintf("Generator for %s:%s failed", this.impl.mote.getUniqueid(), this.name));
		Logger.err(err.toString());
		QUACK(0, err.toString());
		callback(err);
		return;
            }
            if (records==null || records.length==0) {
		var msg = sprintf("Device '%s': generator returned zero records", this);
		callback(new AOP.ERR(msg));
		QUACK(0, msg);
		Logger.info(msg);
		return;
            }
            this.feedRecords(records, function(result) {
		if (result.code != 0) {
		    var msg = sprintf("Feeding data to '%s:%s' failed: '%s'", _this.impl.mote.getUniqueid(), _this.name, result.toString());
		    QUACK(0, msg);
		    Logger.err(msg);
		}
		callback(result);
	    });
	},
	
	/**
	 * Feed records into simulated device.
	 * @param records Array of records where each record contains a timestamp and values suitable for this device.
	 * @param callback
	 * @throws {AOP.Exception}
	 */
	feedRecords: function(/** Array */records, /** DFLT_ASYNC_CB */callback) {
	    if (BC.is(callback)) { return BC.exec(arguments.callee, this, arguments); }
            var conn = this.impl.conn;
            var moteid = this.impl.moteid;
            return conn.getDeviceCmd(moteid, this.name, "device-feed", records).issue1(callback);
	}
    },
    /**
     * @lends Saguaro.Device
     */
    {	
	/**
	 * Signature of a feed generator function as it is accepted by Saguaro.Device#start. The function
	 * must return an array of records to be fed to saguaro. The format of each record must conform to
	 * the input accepted by the particular device.
	 * @param mote The mote
	 * @param device  The device instance
	 * @param nanos    On halt event, timestamp in nanos from halt event, on first call (i.e. start invocation), 0
	 */
	FEED_GENERATOR_SIGNATURE: function(/** Sonoran.Mote */mote, /** Saguaro.Device */device, /** Number */nanos){}
    }
);









//---------------------------------------------------------------------------------------------------------------
//
// Saguaro.CLI.Commands.Device
//
//---------------------------------------------------------------------------------------------------------------

/**
 * @private
 */
Sonoran.CLI.Commands.Device = {};

/**
 * @private
 * @class Device Power command
 * @constructor
 */
Sonoran.CLI.Commands.Device.PowerCommand = function(/** CLI.Shell */shell, /** String */name) {
    this.description =
        "Set/Get the power charge and/or power capacity of a simulated mote.\n" +
        "Parameters take the following units: [munpf]{C|A[sh]}  where\n" +
        "  m  milli       C    Coulomb (1C=1As)\n" +
        "  u  micro       As   Ampere second\n" +
        "  n  nano        Ah   Ampere hour\n" +
        "  p  pico\n" +
        "  f  fempto\n";
    this.capacitySpec = new GetOpt.Simple('capacity',"Capacity specification: num[unit]");
    this.capacityOpt = new GetOpt.Option('p', '--capacity', 0, null, null, this.capacitySpec);
    this.chargeSpec = new GetOpt.Simple('charge', "Charge specification: num[unit]");
    this.chargeOpt = new GetOpt.Option('g', '--charge', 0, null, null, this.chargeSpec);
    var optSet = new GetOpt.OptionSet([ this.chargeOpt, this.capacityOpt ]);
    var cmdSpec = new Sonoran.CLI.Spec(name, Sonoran.CLI.DST_MANY_MOTES, 'saguaro');
    CLI.Command.call(this, shell, cmdSpec, [ optSet, new GetOpt.EndOfArgs() ]);
};


/** @private */
Sonoran.CLI.Commands.Device.PowerCommand.prototype = extend(
    CLI.Command.prototype,
    {
        /** @private */
        exec: function(callback) {
	    var _this = this;
            var descrs = [];
	    var motes = this.cmdSpec.getMotes();
            if (this.chargeOpt.isSet() || this.capacityOpt.isSet()) {
                if (this.chargeOpt.isSet()) {
                    var charge = this.chargeSpec.getArg();
                    for (var i = 0; i < motes.length; i++) {
                        var impl = Saguaro.mote2impl(motes[i]);
                        descrs.push(new Execute.Descr(impl.powerCharge, impl, charge));
                    }
                }
                if (this.capacityOpt.isSet()) {
                    var capacity = this.capacitySpec.getArg();
                    for (var i = 0; i < motes.length; i++) {
                        var impl = Saguaro.mote2impl(motes[i]);
                        descrs.push(new Execute.Descr(impl.powerCapacity, impl, capacity));
                    }
                }
            } else {
                for (var i = 0; i < motes.length; i++) {
		    var impl = Saguaro.mote2impl(motes[i]);
                    descrs.push(new Execute.Descr(impl.powerCharge, impl, null));
                }
            }
            Execute.OneByOne(descrs, callback);
        }
    }
);





// /**
//  * Device Radio command
//  * @private
//  * @class 
//  * @constructor
//  * @private
//  */
// Sonoran.CLI.Commands.Device.RadioCommand = function(shell, name) {
//     this.description = "Switch on/off reporting of radio messages.";
//     this.radioSpec = new GetOpt.Number("logmedia", "Mode to report radio messages (0: switch off, 1: log read, 2: log read and write).", null, 10);
//     this.radioSpec.setRange(0, 0, 3);
//     this.radioOpt = new GetOpt.Option("r", "--report-radio", 0, null, null, this.radioSpec);
//     var optSet = new GetOpt.OptionSet([ this.radioOpt ]);
//     CLI.Command.call(this, shell, name, [ optSet, new GetOpt.EndOfArgs() ]);
// };


// /** @private */
// Sonoran.CLI.Commands.Device.RadioCommand.prototype = extend(
//     CLI.Command.prototype,
//     {
//         /** @private */
//         exec: function(callback) {
//             if (!this.radioOpt.isSet()) {
//                 callback(new AOP.OK(Saguaro.Options.radio.logmedia));
//                 return;
//             }
//             var logmedia = this.radioSpec.getNumber();
//             Saguaro.Options.setRadioLogMedia(logmedia, function(result) {
// 						 if (result.code===0) {
// 						     result = new AOP.OK(Saguaro.Options.radio.logmedia);
// 						 }
// 						 callback(result);
// 					     });
//         }
//     }
// );




/**
 * @private
 * @class Device get state command
 * @constructor
 */
Sonoran.CLI.Commands.Device.GetStateCommand = function(/** CLI.Shell */shell, /** String */name) {
    this.description =
        "Get device state for device(s) of saguaro mote. If no device names\n"+
	"are specified, the state of all devices of the mote is returned.";
    this.restOfArgs = new GetOpt.RestOfArgs();
    var cmdSpec = new Sonoran.CLI.Spec(name, Sonoran.CLI.DST_MANY_MOTES);
    CLI.Command.call(this, shell, cmdSpec, [ this.restOfArgs ]);
    };


/** @private */
Sonoran.CLI.Commands.Device.GetStateCommand.prototype = extend(
    CLI.Command.prototype,
    {
        /** @private */
        exec: function(callback) {
	    var _this = this;
            var descrs = [];
            var devnames;
            var roa = this.restOfArgs.getRestArgs();
            if (roa.length>0) {
                devnames = roa;
            }
	    var motes = this.cmdSpec.getMotes();
            for (var i = 0; i < motes.length; i++) {
                var mote = motes[i];
                if (mote.getClass() === 'saguaro') {
                    var impl = Saguaro.mote2impl(mote);
                    if (!devnames) { devnames = impl.getDeviceNames(); }
                    for (var j = 0; j < devnames.length; j++) {
                        var dev = impl.getDeviceInstance(devnames[j]);
                        if (!dev) {
                            callback(new AOP.ERR(sprintf("Mote '%s' does not have device: %s", mote, devnames[j])));
                            return;
                        }
                        descrs.push(new Execute.Descr(dev.getState, dev));
                    }
                }
            }
            if (descrs.length == 0) {
                callback(new AOP.OK());
                return;
            }
            Execute.OneByOne(descrs, function(result) {
                if (result.code!==0) {
                    callback(result);
                } else {
                    var results = result.getData();
                    var arr = [];
                    for (var i = 0; i < results.length; i++) {
                        arr.push(results[i].getData());
                    }
                    callback(new AOP.OK(Util.formatData(arr))); 
                }
            });
        }
    }
);

/**
 * @private
 * @class Device set state command
 * @constructor
 */
Sonoran.CLI.Commands.Device.SetStateCommand = function(/** CLI.Shell */shell, /** String */name) {
    this.description =
        "Change parameters of simulated devices.\n";
    this.restOfArgs = new GetOpt.RestOfArgs("params...",
					    "Each parameter argument must have the form:\n"+
					    "   PARAM:JSTERM or PARAM=JSTERM\n"+
					    "where PARAM denotes the parameter to changed and JSTERM is a \n"+
					    "Javascript expression specifying the new value.\n");
    this.devname = new GetOpt.Simple("devname", "The name of the device.");
    var cmdSpec = new Sonoran.CLI.Spec(name, Sonoran.CLI.DST_MANY_MOTES);
    CLI.Command.call(this, shell, cmdSpec, [ this.devname, this.restOfArgs ], 1);
    };


/** @private */
Sonoran.CLI.Commands.Device.SetStateCommand.prototype = extend(
    CLI.Command.prototype,
    {
        /** @private */
        exec: function(callback) {
	    var _this = this;
            var descrs = [];
            var devname = this.devname.getArg();
            var roa = this.restOfArgs.getRestArgs();
	    var params = {};
            for (var i = 0; i < roa.length; i++) {
		var p = roa[i];
		var ex, md, val;
		if( !(md = /^([^=:]+)[:=](.*)$/.exec(p)) ) {
                    callback(new AOP.ERR(sprintf("Illegal device parameter `%s': Expecting NAME:JSTERM or NAME=JSTERM", p)));
                    return;
		}
		try {
		    // Encapsulate in round braces
		    // Otherwise top level {} would not be recognized as object
		    val = eval("("+md[2]+")");
		} catch (ex) {
                    callback(new AOP.ERR(sprintf("Evaluation of parameter value `%s' failed: %s", md[2], ex)));
                    return;
		}
		params[md[1]] = val;
	    }
	    var motes = this.cmdSpec.getMotes();
            for (var i = 0; i < motes.length; i++) {
                var mote = motes[i];
                if (mote.getClass() === 'saguaro') {
                    var impl = Saguaro.mote2impl(mote);
                    var dev = impl.getDeviceInstance(devname);
                    if (!dev) {
                        callback(new AOP.ERR(sprintf("Mote '%s' does not have device: %s", mote, devname)));
                        return;
                    }
                    descrs.push(new Execute.Descr(dev.setState, dev, params));
                }
            }
            if (descrs.length == 0) {
                callback(new AOP.OK());
                return;
            }
            Execute.OneByOne(descrs, function(result) {
                if (result.code!==0) {
                    callback(result);
		    return;
		}
		callback(new AOP.OK()); 
            });
        }
    }
);






/**
 * @class 
 * @constructor
 * @private
 */
Sonoran.CLI.Commands.Device.FeedCommand = function(shell, name) {
    this.description =
        "Feed data into device. If no mote is specified, all current simulated motes are targeted.\n" +
	"The parameters for the command are 'devname value' or 'devname timestamp value ...'.\n" +
	"The value elements are device specific. timestamp is an integer number describing either a nanosecond time stamp\n" +
	"or milliseconds until next value becomes effective.\n";
    this.devSpec = new GetOpt.Simple("device", "Device name"); 
    this.restOfArgs = new GetOpt.RestOfArgs("values", "<value> or <timestamp value ...> See command description.");
    var cmdSpec = new Sonoran.CLI.Spec(name, Sonoran.CLI.DST_ANY_MOTE, 'saguaro');
    CLI.Command.call(this, shell, cmdSpec, [ this.devSpec, this.restOfArgs ]);
};

/** @private */
Sonoran.CLI.Commands.Device.FeedCommand.prototype = extend(
    CLI.Command.prototype,
    {
        /** @private */
        exec: function(callback) {
            var devName = this.devSpec.getArg();
	    assert(devName);
	    var motes = this.cmdSpec.getMotes();
            if (motes.length==0) {
                motes = Saguaro.getSaguaroMotes();
            }
            if (motes.length==0) {
                callback(new AOP.ERR("No simulated motes active"));
                return;
	    }
	    
	    var v = [];
	    var roa = this.restOfArgs.getRestArgs();
	    if (roa.length===0) {
		callback(new AOP.ERR("Missing data to feed"));
		return;
	    }
	    if (roa.length===1) {
		try {
		    v.push(parseFloat(roa[0]));
		} catch(ex) {
		    callback(new AOP.ERR(sprintf("Invalid value: '%s'", roa[0])));
		    return;
		}
	    } else {
		if (roa.length%2 !== 0) {
		    callback(new AOP.ERR("Invalid number of values to feed in"));
		    return;
		}
		for (var i = 0; i < roa.length; i += 2) {
		    try {
			v.push(parseInt(roa[i]));
		    } catch(ex) {
			callback(new AOP.ERR(sprintf("Invalid timestamp: '%s'", roa[i])));
			return;
		    }
		    try {
			v.push(parseFloat(roa[i+1]));
		    } catch(ex) {
			callback(new AOP.ERR(sprintf("Invalid value: '%s'", roa[i+1])));
			return;
		    }
		}
	    }
            for (var i = 0; i < motes.length; i++) {
                var impl = Saguaro.mote2impl(motes[i]);
                var dev = impl.getDeviceInstance(devName);
		if (!dev) {
		    this.shell.println(sprintf("Ignore mote '%s' not having device: %s", motes[i], devName));
		}
		var res = dev.feedRecords(v, SCB);
		if (res.code !== 0) {
                    callback(new AOP.ERR(sprintf("Mote '%s' did not accept data: %s", motes[i], res)));
                    return;
                }
            }

            callback(new AOP.OK());
        }
    }
);





CLI.commandFactory.addModule("Sonoran.CLI.Commands.Device");






//---------------------------------------------------------------------------------------------------------------
//
// Saguaro.CLI.COmmands.Feed
//
//---------------------------------------------------------------------------------------------------------------

/**
 * Feed commands.
 * @class
 * @private
 */
Sonoran.CLI.Commands.Feed = {};


/**
 * @returns {String}
 * @private
 */
Sonoran.CLI.Commands.Feed.renderCurrentFeedsTable = function() {
    var motes = Sonoran.Registry.lookupMotesByFunc(function(mote) { return mote.getClass() === 'saguaro'; });
    var table;
    var y = 0;
    for (var i = 0; i < motes.length; i++) {
	var impl = Saguaro.mote2impl(motes[i]);
        var devNames = impl.getDeviceNames();
        for (var j = 0; j < devNames.length; j++) {
            var dev = impl.getDeviceInstance(devNames[j]);
            var name = dev.getFeederName();
            if (name) {
		if (!table) {
		    table = new Util.Formatter.Table2(3);
		    table.setTitle("Mote", "Device", "Function");
		}
                table.setValue(0, y, motes[i]);
                table.setValue(1, y, devNames[j]);
                table.setValue(2, y, name);
                y += 1;
            }
        }
    }
    return (table) ? table.render().join("\n") : "No active feeders";
};


/**
 * @class 
 * @constructor
 * @private
 */
Sonoran.CLI.Commands.Feed.StartCommand = function(shell, name) {
    this.description =
        "Without any parameter, this command lists the currently running feeders, listed by mote and device.\n" +
        "If the name of a device and feeder function is specified, that function is installed for\n" +
        "the specified device, either on the specified mote or all current simulated motes.";
    this.devSpec = new GetOpt.Simple("device", "Device name");
    this.feedSpec = new GetOpt.Simple("name|array|func",
				      "Generator function name or Javascript expression that evaluates\n"+
				      "to an array of literal data or to a function object implementing the\n"+
				      "feeder API. A function name must be a sequence of field names\n"+
				      "starting at the global object.");
    this.fileSpec = new GetOpt.Simple("file", "A script file to source before the function is searched");
    this.fileOpt = new GetOpt.Option("f", "--file", 0, null, "Script file to include", this.fileSpec);
    this.optSet = new GetOpt.OptionSet([ this.fileOpt ]);
    var cmdSpec = new Sonoran.CLI.Spec(name, Sonoran.CLI.DST_ANY_MOTE, 'saguaro');
    CLI.Command.call(this, shell, cmdSpec, [ this.optSet, this.devSpec, this.feedSpec ], 0);
};

/** @private */
Sonoran.CLI.Commands.Feed.StartCommand.prototype = extend(
    CLI.Command.prototype,
    {
        /** @private */
        exec: function(callback) {
            var devName = this.devSpec.getArg();
            if (devName) {
                devName = devName.toUpperCase();
                var motes = this.cmdSpec.getMotes();
                if (motes.length===0) {
                    motes = Saguaro.getSaguaroMotes();
                }
                if (motes.length===0) {
                    callback(new AOP.ERR("No simulated motes active"));
                    return;
                }
                for (var i = 0; i < motes.length; i++) {
                    var impl = Saguaro.mote2impl(motes[i]);
                    var dev = impl.getDeviceInstance(devName);
                    if (!dev) {
			this.shell.println(sprintf("Ignore mote '%s' not having device: %s", motes[i], devName));
                    }
                }
                var funcName = this.feedSpec.getArg();
                if (!funcName) {
                    callback(new AOP.ERR("Missing feeder specification"));
                    return;
                }
                if (this.fileOpt.isSet()) {
                    var scriptName = this.fileSpec.getArg();
		    var result = this.shell.execFile(scriptName, undefined, null, SCB);
                    if (result.code != 0) {
                        callback(new AOP.ERR("Cannot source script: " + result));
                        return;
                    }
                }
                var ex, func = null;
		if( ! /^[a-zA-Z][a-zA-Z\d_\.]*$/.test(funcName) ) {
		    var ex=null, data=null;
		    try {
			data = eval(funcName);
		    } catch (ex) {}
		    if( ex!=null || data==null || !( data instanceof Array  ||  typeof(data)=='function' ) ) {
                        callback(new AOP.ERR("Illegal feed specifier: Expression does not evaluate to an array or function object."));
			return;
		    }
		    func = typeof(data)=='function' ? data : function () { return data; };
		} else {
                    try {
			func = Blob.accessGlobalContext(funcName);
                    } catch (x) {
			callback(new AOP.ERR(sprintf("Generator '%s' does not exist or is not a function", funcName)));
			return;
                    }
                    if (!func || typeof(func) !== "function") {
			callback(new AOP.ERR(sprintf("Generator '%s' does not exist or is not a function", funcName)));
			return;
                    }
		}
                for (var i = 0; i < motes.length; i++) {
                    var impl = Saguaro.mote2impl(motes[i]);
                    var dev = impl.getDeviceInstance(devName);
		    if (dev) {
			var res = dev.start(func, funcName, SCB);
			if (res.code !== 0) {
                            callback(new AOP.ERR(sprintf("Mote '%s' could not start feed: %s", motes[i], res)));
                            return;
			}
		    }
                }
            }

            callback(new AOP.OK(Sonoran.CLI.Commands.Feed.renderCurrentFeedsTable()));
        }
    }
);





/**
 * @class 
 * @constructor
 * @private
 */
Sonoran.CLI.Commands.Feed.StopCommand = function(shell, name) {
    this.description =
        "Stops the feed for the specified device on the specified motes. If no device is specified,\n" +
        "all current device feeds are stopped on the specified motes.";
    this.devSpec = new GetOpt.Simple("device", "Device name");
    var cmdSpec = new Sonoran.CLI.Spec(name, Sonoran.CLI.DST_ANY_MOTE, 'saguaro');
    CLI.Command.call(this, shell, cmdSpec, [ this.devSpec, new GetOpt.EndOfArgs() ]);
};

/** @private */
Sonoran.CLI.Commands.Feed.StopCommand.prototype = extend(
    CLI.Command.prototype,
    {
        /** @private */
        exec: function(callback) {
            var motes = this.cmdSpec.getMotes();
            if (motes.length==0) {
		motes = Saguaro.getSaguaroMotes();
            }
            if (motes.length==0) {
                callback(new AOP.ERR("No simulated motes active"));
                return;
            }
            var devName = this.devSpec.getArg();
            if (devName) {
                devName = devName.toUpperCase();
                for (var i = 0; i < motes.length; i++) {
                    var impl = Saguaro.mote2impl(motes[i]);
                    var dev = impl.getDeviceInstance(devName);
                    if (dev) {
			dev.stop(new AOP.OK());
		    }
                }
            } else {
                for (var i = 0; i < motes.length; i++) {
		    var impl = Saguaro.mote2impl(motes[i]);
                    var devNames = impl.getDeviceNames();
                    for (var j = 0; j < devNames.length; j++) {
                        var dev = impl.getDeviceInstance(devNames[j]);
                        var name = dev.getFeederName();
                        if (name) {
                            dev.stop(new AOP.OK());
                        }
                    }
                }
            }

            callback(new AOP.OK(Sonoran.CLI.Commands.Feed.renderCurrentFeedsTable()));
        }
    }
);


CLI.commandFactory.addModule("Sonoran.CLI.Commands.Feed");
