//  (C) COPYRIGHT INTERNATIONAL BUSINESS MACHINES CORPORATION 2006-2010
//                       ALL RIGHTS RESERVED
//        IBM Research Division, Zurich Research Laboratory
// --------------------------------------------------------------------

/**
 * Sonoran.LIP handles hardware motes connected via serial or USB.
 * A native code library is used to implement the LIP communication protocol between
 * hardware mote and Sonoran. A mote representing a LIP mote is implemented by
 * an instance of Sonoran.LIP.Connection.
 * @namespace Sonoran.LIP
 */
Sonoran.LIP = {
    /**
     * @constant
     * @type Number
     * @private
     */
    AUX_UNIQUE: 0,

   /**
    * Reset has been sent to the mote but no answer yet received.
    * @type Number
    * @constant
    * @private
    */
   STATE_RST_PEND:  1,
   /**
    * Mote is up and responding.
    * @type Number
    * @constant
    * @private
    */
   STATE_MOTE_UP:   2,
   /**
    * Device is closed
    * @type Number
    * @constant
    * @private
    */
   STATE_CLOSED:    3,
   /**
    * Handle to underlying native library is disposed
    * @type Number
    * @constant
    * @private
    */
   STATE_DISPOSED: 4,

    /**
     * @constant
     * @type Object
     */
    STATE2STR: {
	1: "STATE_RST_PEND",
	2: "STATE_MOTE_UP",
	3: "STATE_CLOSED",
	4: "STATE_DISPOSED"
    },


   /**
    * LIP event type
    * @type Number
    * @constant
    * @private
    */
   EV_NOTHING: 0,
   /**
    * LIP event type
    * @type Number
    * @constant
    * @private
    */
   EV_MOTE_ALIVE: 1,
   /**
    * LIP event type
    * @type Number
    * @constant
    * @private
    */
   EV_LOG_HOST: 2,
   /**
    * LIP event type
    * @type Number
    * @constant
    * @private
    */
   EV_LOG_MOTE: 3,
   /**
    * LIP event type
    * @type Number
    * @constant
    * @private
    */
   EV_DATA_FRAME: 4,
   /**
    * LIP event type
    * @type Number
    * @constant
    * @private
    */
   EV_DEVICE_CLOSED: 5,
   /**
    * LIP event type
    * @type Number
    * @constant
    * @private
    */
   EV_DEVICE_OPENED: 6,
   /**
    * LIP event type
    * @type Number
    * @constant
    * @private
    */
   EV_MOTE_RESET: 7,
   /**
    * LIP event type
    * @type Number
    * @constant
    * @private
    */
   EV_MOTE_LOST: 8,
   EV_EXDEV_FRAME: 9,

   /**
    * Parameter for native call.
    * @type Number
    * @constant
    * @private
    */
   PARA_LOGLVL_HOST: 1,
   /**
    * Parameter for native call.
    * @type Number
    * @constant
    * @private
    */
   PARA_LOGLVL_MOTE: 2,
   /**
    * Parameter for native call.
    * @type Number
    * @constant
    * @private
    */
   PARA_LOGLVL_MAPP: 3,

   /**
    * Parameter for native call.
    * @type Number
    * @constant
    * @private
    */
   LOG_ALL: 0,
   /**
    * Parameter for native call.
    * @type Number
    * @constant
    * @private
    */
   LOG_DEBUG: 1,
   /**
    * Parameter for native call.
    * @type Number
    * @constant
    * @private
    */
   LOG_INFO: 2,
   /**
    * Parameter for native call.
    * @type Number
    * @constant
    * @private
    */
   LOG_WARN: 3,
   /**
    * Parameter for native call.
    * @type Number
    * @constant
    * @private
    */
   LOG_ERROR: 4,
   /**
    * Parameter for native call.
    * @type Number
    * @constant
    * @private
    */
   LOG_NONE: 7,

   /**
    * @private
    * @constant
    */
   SRC_HOST: 0x80,
   /**
    * @private
    * @constant
    */
   SRC_MOTE: 0x40,
   /**
    * @private
    * @constant
    */
   SRC_MAPP: 0x20,
   /**
    * @private
    * @constant
    */
   SEV_MASK: 0x07,
   /**
    * @private
    * @constant
    */
   SRC_MASK: 0xF8,

   /**
    * Status code of native calls.
    * @type Number
    * @constant
    * @private
    */
   OK: 0,

   /**
    * @private
    * @constant
    */
   SEVERITIES: [
      "ALL",
      "DEBUG",
      "INFO",
      "WARN",
      "ERROR"
   ],



   /**
    * Handle log event from local or remote lip.
    * @param blob
    */
   handleLogEvent: function(/** Object */blob) {
       assert(blob.event&&(blob.event===Sonoran.LIP.EV_LOG_HOST||blob.event===Sonoran.LIP.EV_LOG_MOTE));
       var sev = blob.severity;
       var err = blob.error;
       var orig = sev&this.SRC_MASK;
       sev = sev&this.SEV_MASK;
       var severity = null;
       var module = Sonoran.Logger.HWPORT;

       switch(sev) {
       case this.LOG_DEBUG: severity = Logger.DEBUG; break;
       case this.LOG_INFO: severity = Logger.INFO; break;
       case this.LOG_WARN: severity = Logger.WARN; break;
       case this.LOG_ERROR: severity = Logger.ERR; break;
       default:
           severity = Logger.ERR;
       }
       var txt = "";
       if (orig == this.SRC_HOST) {
           txt += "HOST: ";
       } else if (orig == this.SRC_MOTE) {
           txt += "MOTE: ";
	   module = 'MOTE';
       } else if (orig == this.SRC_MAPP) {
           txt += "MAPP: ";
	   module = 'MAPP';
       } else {
           txt += "UNKNOWN: ";
       }
       txt += blob.msg;
       if (err!=undefined&&err!=0) {
           txt += ", ERROR: " + err;
       }

       //QUACK(0, "LOG-EV: " + severity + ", " + module + ", " + txt);

       
       Logger.log(severity, module, txt);

   },

   /**
    * Queue id.
    * @type Number
    * @private
    */
   id: -1,

   /**
    * Map of LIP ids to receiver object (Sonoran.LIP.Connection or object with onLIPEvent and optionally resetLogLevel).
    * @type Object
    * @private
    */
   lid2rcv: {},


   /**
    * Initialization function. Called when sonoran is loaded.
    * @private
    */
    init: function() {
	var self = this;
	var queue = {
	    id: Runtime.allocQueue()
	};
	var func = function(blob) {
	    var lid = blob.lid;
	    assert(lid!=undefined);
	    assert(typeof(lid)==='number');
	    //QUACK(0, "ONBLOB: " + lid + ", " + Util.formatData(blob));
	    if (blob.event&&(blob.event===Sonoran.LIP.EV_LOG_HOST||blob.event===Sonoran.LIP.EV_LOG_MOTE)) {
		Sonoran.LIP.handleLogEvent(blob);
		return;
	    }
	    var rcv = self.lid2rcv[lid];
	    if (!rcv) {
		Logger.err("Disposed lip connection: " + lid);
	    } else {
		//QUACK(0, "LOG-EV: " + Util.formatData(blob));
		rcv.onLIPEvent(blob);
	    }
	};
	Core.addQ(queue, func);
	Runtime.load("jslip", "", queue.id);
	var _this = this;
	Logger.logLevelListeners.add(function() {
            for (var lid in _this.lid2rcv) {
		var rcv = _this.lid2rcv[lid];
		if (typeof(lid.resetLogLevel) === 'function') {
		    var res = rcv.resetLogLevel(SCB);
		}
            }
	});
    },




   /**
    * Dispose the native resource for a physical LIP mote
    * @param lid
    * @private
    */
   onDeviceDispose: function(/** Number */lid) {
       delete this.lid2rcv[lid];
   },

   /**
    * Returns attached usb and serial devices by name.
    * @returns {Sonoran.LIPEnumeration}  
    */
   enumerateHWPORTS: function() {
       var obj = Sonoran.LIP.Native.enumerate();
       assert(obj.serial);
       assert(obj.hid);
       return new Sonoran.LIPEnumeration(obj.serial, obj.hid);
   },


    /**
     * Connect to LIP interface and return motes is found. If LIP device is
     * already used, the mote for that interface is returned.
     * @param hwport
     * @param name
     * @param callback
     * @returns {Sonoran.Mote[]} Array with one element of type Sonoran.Mote
     */
    createMote: function(/** String */hwport, /** String */name, /** DFLT_ASYNC_CB */callback) {
	if (BC.is(callback)) { return BC.exec(arguments.callee, this, arguments); }

	var devenum = Sonoran.LIP.Native.enumerate();
	
	var p = hwport.toUpperCase();
	if (p === "HID") {
	    var hids = devenum.hid;
	    if (hids.length == 0) throw new Exception("No HID device found!");
	    if (hids.length !== 1) throw new Exception("Multiple HID devices found: " + hids.join(", "));
	    hwport = hids[0];
	} else if (p === "SERIAL") {
	    var serials = devenum.serial;
	    if (serials.length === 0) throw new Exception("No serial device found!");
	    if (serials.length !== 1)  throw new Exception("Multiple serial devices found: " + serials.join(", "));
	    hwport = serials[0];
	}
	
	var hwprofile = 0;
	var off = hwport.indexOf(':');
	if (hwport.indexOf(':') != -1) {
            hwprofile = parseInt(hwport.substring(off+1), 10);
            if (isNaN(hwprofile)) {
		throw "Invalid hwport specification: " + hwport;
            }
            hwport = hwport.substr(0, off);
	}

	var isHid = false, regexp = null;
	try {
	    /* hwport = */ Util.UUID.completeEUI(hwport); // use completion to check whether it is a HID
	    isHid = true;
	} catch (x) {
	    hwport = hwport.replace(/^\/\/.\//,"\\\\.\\");
	    regexp = new RegExp("^(|\\\\\\\\\.\\\\|/dev/|/dev/tty)"+RegExp.escape(hwport)+"$");
	}

	if (isHid) {
	    // try to complete hwport to match existing usb device
	    var hids = devenum.hid;
	    loop: {
		for (i = 0; i < hids.length; i++) {
		    var hid = hids[i];
		    if (hid.substr(hid.length-hwport.length) == hwport) {
			hwport = hid;
			break loop;
		    }
		}
		callback(new AOP.ERR(sprintf("Specified port '%s'is not available", hwport)));
		return;
	    }
	}

	
	// do we know this mote?
	var motes = Sonoran.Registry.getMotes();
	for (var i = 0; i < motes.length; i++) {
	    var mote = motes[i];
	    if (mote.getClass() !== 'lip') {
		continue;
	    }
	    var conn = mote.conn;
	    if ((isHid && conn.getHWPORT() === hwport) || (!isHid && regexp.test(conn.getHWPORT()))) {
		if (mote.getState() !== Sonoran.Mote.ON) {
		    conn.reset(mote, undefined, undefined, function(status) { callback(new AOP.OK([ mote ])); });
		} else {
		    callback(new AOP.OK([ mote ]));
		}
		return;
	    } 
	}

	// check that the serial port exists
	if (!isHid) {
	    loop2: {
		var serials = devenum.serial;
		for (i = 0; i < serials.length; i++) {
		    if (regexp.test(serials[i])) {
			hwport = serials[i];
			break loop2;
		    }
		}
		//callback(new AOP.ERR(sprintf("Specified port '%s'is not available", hwport)));
		//return;
	    }
	}

	// finally open port for the new mote
	var obj = Sonoran.LIP.Native.create();
	assert(obj.data>=0);
	if (obj.err != Sonoran.LIP.OK) {
	    callback(new AOP.ERR(obj.err, Sonoran.LIP.formatErr(hwport, obj)));
	    return;
	}
	var lid = obj.data;

	var device = new Sonoran.LIP.Device(hwport, hwprofile, lid);
	var uniqueid = device.getHWPORT();
        var conn = new Sonoran.LIP.Connection(device, uniqueid, name);
	var mote = conn.mote;
	assert(mote);

	//assert(impl.lid >= 0);
	assert(!this.lid2rcv[lid]);
	this.lid2rcv[lid] = conn;

	conn.open(function(result) {
	    callback(new AOP.OK([ mote ]));
	});
    },




    /**
     * Open non-mote LIP device.
     * @param hwport 
     * @param rcv
     * @param callback
     * @returns {Sonoran.LIP.Device} LIP device
     */
    openDevice: function(/** String */hwport, /** Object */rcv, /** DFLT_ASYNC_CB */callback) {
	if (BC.is(callback)) { return BC.exec(arguments.callee, this, arguments); }

	var hwprofile = 0;
	var off = hwport.indexOf(':');
	if (hwport.indexOf(':') != -1) {
            hwprofile = parseInt(hwport.substring(off+1), 10);
            if (isNaN(hwprofile)) {
		throw "Invalid hwport specification: " + hwport;
            }
            hwport = hwport.substr(0, off);
	}

	// check that the port exists
	var e = Sonoran.LIP.Native.enumerate();
	var p = null, i;
	for (i = 0; i < e.hid.length; i++) {
	    if (e.hid[i] === hwport) {
		p = e.hid[i];
		break;
	    }
	}
	if (!p) {
	    for (i = 0; i < e.serial.length; i++) {
		//if (reg.test(e.serial[i])) {
		if (e.serial[i] === hwport) {
		    p = e.serial[i];
		    break;
		}
	    }
	}

	if (!p) {
	    callback(new AOP.ERR("Specified port is not available"));
	    return;
	}
	hwport = p;

	// finally open port for the new mote
	var obj = Sonoran.LIP.Native.create();
	assert(obj.data>=0);
	if (obj.err != Sonoran.LIP.OK) {
	    callback(new AOP.ERR(obj.err, Sonoran.LIP.formatErr(hwport, obj)));
	    return;
	}
	var lid = obj.data;
	assert(!this.lid2rcv[lid]);
	this.lid2rcv[lid] = rcv;

	var dev = new Sonoran.LIP.Device(hwport, hwprofile, lid);
	dev.open(callback);
    },



   /**
    * Format a message for an error object returned by native code.
    * @param hwport
    * @param obj
    * @returns {String}
    * @private
    */
   formatErr: function(/** String */hwport, /** Object */obj) {
       var txt = 
	   "LIP mote is not up!\nEnsure the communication port is correct.\n"+
	   "Did you press the RESET button on the programming board?\n";
      return sprintf("Error on hwport '%s': errno %d: '%s'\n", hwport, obj.err, obj.msg) + txt;
   }
};








/**
 * @class
 * @constructor
 * @param hwport
 * @param hwprofile
 * @param lid
 * @private
 */
Sonoran.LIP.Device = function(/** String */hwport, /** Number */hwprofile, /** Number */lid) {
    this.lid = lid;
    this.hwport = hwport;
    this.hwprofile = hwprofile;
};

Sonoran.LIP.Device.prototype = {
    /**
     * @returns {String}
     * @private
     */
    getHWPORT: function() {
	return this.hwport;
    },

    /**
     * @returns {Number}
     * @private
     */
    getHWPROFILE: function() {
	return this.hwprofile;
    },

    /**
     * @returns {Number}
     * @private
     */
    getLid: function() {
	return this.lid;
    },

    /**
     * @param err
     * @returns {AOP.Result}
     */
    err2aop: function(/** Object */ret) {
	assert(ret.err != Sonoran.LIP.OK);
	return new AOP.ERR(ret.err, Sonoran.LIP.formatErr(this.hwport, ret));
    },

    /**
     * @param callback
     * @private
     */
    open: function(/** DFLT_ASYNC_CB */callback) {
	if (BC.is(callback)) { return BC.exec(arguments.callee, this, arguments); }
        var ret = Sonoran.LIP.Native.open(this.lid, this.hwport, this.hwprofile);
	callback((ret.err != Sonoran.LIP.OK) ? this.err2aop(ret) : new AOP.OK(this));
    },

    /**
     * @param callback
     * @private
     */
    close: function(/** DFLT_ASYNC_CB */callback) {
	if (BC.is(callback)) { return BC.exec(arguments.callee, this, arguments); }
        var ret = Sonoran.LIP.Native.close(this.lid);
	callback((ret.err != Sonoran.LIP.OK) ? this.err2aop(ret) : new AOP.OK(this));
    },


    /**
     * @param callback
     * @private
     */
    dispose: function(/** DFLT_ASYNC_CB */callback) {
	if (BC.is(callback)) { return BC.exec(arguments.callee, this, arguments); }
        var ret = Sonoran.LIP.Native.dispose(this.lid);
	Sonoran.LIP.onDeviceDispose(this.lid);
	callback((ret.err != Sonoran.LIP.OK) ? this.err2aop(ret) : new AOP.OK(this));
    },



    /**
     * @param callback
     * @private
     */
    reset: function(/** DFLT_ASYNC_CB */callback) {
	assert(arguments.length===1);
	if (BC.is(callback)) { return BC.exec(arguments.callee, this, arguments); }
        var ret = Sonoran.LIP.Native.reset(this.lid);
	callback((ret.err != Sonoran.LIP.OK) ? this.err2aop(ret) : new AOP.OK(this));
    },


    /**
     * @param callback
     * @returns {Number}
     * @private
     */
    getState: function(/** DFLT_ASYNC_CB */callback) {
	if (BC.is(callback)) { return BC.exec(arguments.callee, this, arguments); }
        var ret = Sonoran.LIP.Native.getState(this.lid);
        if (ret.err != Sonoran.LIP.OK) {
	    callback(this.err2aop(ret));
        } else {
            var state = ret.data;
	    callback(new AOP.OK(state));
	}
    },

    /**
     * @param bytes
     * @param callback
     * @private
     */
    send: function(/** String */bytes, /** DFLT_ASYNC_CB */callback) {
	if (BC.is(callback)) { return BC.exec(arguments.callee, this, arguments); }
        var ret = Sonoran.LIP.Native.send(this.lid, bytes);
	callback((ret.err != Sonoran.LIP.OK) ? this.err2aop(ret) : new AOP.OK(this));
    },

    /**
     * Return current log level for LIP.PARA_LOGLVL_HOST, LIP.PARA_LOGLVL_MOTE or LIP.PARA_LOGLVL_MAPP.
     * @param para LIP.PARA_LOGLVL_HOST ..
     * @returns {Number} the current log level
     * @private
     */
    getLogLevel: function(/** Number */para, /** DFLT_ASYNC_CB */callback) {
	if (BC.is(callback)) { return BC.exec(arguments.callee, this, arguments); }
        var ret = Sonoran.LIP.Native.getLogLevel(this.lid, para);
        if (ret.err != Sonoran.LIP.OK) {
	    callback(this.err2aop(ret));
        } else {
            var loglevel = ret.data;
	    callback(new AOP.OK(loglevel));
	}
    },
    
    /**
     * Set log level for LIP.PARA_LOGLVL_HOST..
     * @param para LIP.PARA_LOGLVL_HOST..
     * @param loglevel  LIP.LOG_ALL ..
     * @throws {Object} in case of the operation having failed
     * @private
     */
    setLogLevel: function(/** Number */para, /** Number */loglevel, /** DFLT_ASYNC_CB */callback) {
	if (BC.is(callback)) { return BC.exec(arguments.callee, this, arguments); }
        var ret = Sonoran.LIP.Native.setLogLevel(this.lid, para, loglevel);
	callback((ret.err != Sonoran.LIP.OK) ? this.err2aop(ret) : new AOP.OK(loglevel));
    },
    

    /**
     * @returns {String}
     * @ignore
     * @private
     */
    toString: function() {
	return sprintf("LIP:%d:%s", this.lid, this.hwport);
    }
};




Sonoran.Connection.extend(
    "Sonoran.LIP.Connection",
    /**
     * @lends Sonoran.LIP.Connection.prototype
     */
    {
	/**
	 * @constructs
	 * @augments Sonoran.Connection
	 * @param device
	 * @param uniqueid
	 * @param name
	 */
	__constr__: function(/** Object  */device, /** String */uniqueid, /** String */name) {
	    assert(arguments.length===3);
	    assert(name);
	    this.device = device;
	    Sonoran.Connection.call(this);
	    var addr = "lip:" + device.getHWPORT();
	    var mote = this.mote = new Sonoran.Mote(this, uniqueid, addr, 'lip', name, "lip");
	    //Sonoran.MoteImpl.call(this, mote);
	    //assert(this.mote == mote);
	    //assert(this.mote.uniqueid);
	    mote.setState(Sonoran.Mote.OFF);
	    Sonoran.Registry.registerMote(mote);
	},

	
       /**
	* @type Object
       * @private
       */
      device: null,

      /**
       * @returns {String} string
       */
      toString: function() {
         return this.mote.getUniqueid();
      },

      /**
       * Returns the device name this mote is attached to.
       * @returns {String} device name
       */
      getHWPORT: function() {
         return this.device.getHWPORT();
      },

      /**
       * @returns {Object}
       */
      getDevice: function() {
	  return this.device;
      },

      /**
       * Handle event from native code.
       * @private
       */
      onLIPEvent: function(blob) {
	  //QUACK(0, "LIP_EV: " + Util.formatData(blob));
          var mote = this.mote;
	  var msg;
          switch(blob.event) {
          case Sonoran.LIP.EV_MOTE_LOST: {
	      msg = "EV_MOTE_LOST: for " + this;
              mote.updateState(Sonoran.Mote.OFF);
              break;
          }
          case Sonoran.LIP.EV_MOTE_RESET: {
	      msg = "EV_MOTE_RESET: for " + this;
              mote.updateState(Sonoran.Mote.OFF);
              break;
          }
          case Sonoran.LIP.EV_MOTE_ALIVE: {
	      msg = "EV_MOTE_ALIVE: for " + this.device;
	      var uniqueid = this.mote.getUniqueid();
	      if (!Util.UUID.EUI64_REGEX.test(uniqueid)) {
		  // serial might require retrieving the unique id
		  mote.updateState(Sonoran.Mote.OFF);
		  this.send(this.mote, 0, 0xDEAD, Formatter.pack("u", SaguaroDEFS.MOMA_EUI64_CMD));
	      } else {
		  mote.updateState(Sonoran.Mote.ON);
	      }
              break;
          }
          case Sonoran.LIP.EV_DEVICE_OPENED: {
	      msg = "EV_DEVICE_OPENED: for " + this;
              mote.updateState(Sonoran.Mote.OFF);
              break;
          }
          case Sonoran.LIP.EV_DEVICE_CLOSED: {
	      msg = "EV_DEVICE_CLOSED: for " + this;
              mote.updateState(Sonoran.Mote.OFF);
              break;
          }
          case Sonoran.LIP.EV_DATA_FRAME: {
	      var data = blob.data;
              if (data.length < 7) {
                  Logger.err("Received invalid LIP data frame: len=" + data.length + ", " + blob.data);
                  return;
              }
              var arr = Formatter.unpack("4u2u1u", data);
              var addr = arr[0];
              var dstport = arr[1];
              var srcport = arr[2];
              var time = blob.time;
	      if( srcport == 0 && dstport==0xDEAD && data.length == 7+1+8 && data.charCodeAt(7)==(SaguaroDEFS.MOMA_REPLY_MASK|SaguaroDEFS.MOMA_EUI64_CMD) ) {
		  // Pick up EUI-64 if it's flying by
		  var arr = Formatter.unpack("8EL", data, 7+1);
		  mote.updateUniqueid(arr[0]);
		  mote.updateState(Sonoran.Mote.ON);
		  return;
	      }
	      Event.Registry.signalEvent(new Sonoran.Event.Media(dstport, mote, srcport, data.substring(7), time));
              break;
          }
	  default:
	      assert(0, sprintf("Unexpected lip event: %s", Util.formatData(blob)));
          }
	  if (msg) {
	      //QUACK(0, msg);
	      Logger.log(Logger.INFO, Sonoran.Logger.HWPORT, msg);
	  }
      },

      /**
       * Open the LIP device of this mote.
       * @throws {Object} in case of open having failed
       * @private
       */
      open: function(callback) { 
	  if (BC.is(callback)) { return BC.exec(arguments.callee, this, arguments); }
	  var _this = this;
	  var f2 = function(result) {
	      _this.resetLogLevel(callback);
	  };
	  var f1 = function(result) {
	      _this.device.open(f2);
	  };
	  this.device.close(f1);
      },


      /**
       * Close the underlying LIP device. Use Sonoran.Registry#deregisterMote
       * to remove a LIP mote and get the underlying device closed.
       * @throws {Object} in case of the operation having failed
       * @private
       */
      close: function(callback) {
	  if (BC.is(callback)) { return BC.exec(arguments.callee, this, arguments); }
	  this.device.close(callback);
      },


      /**
       * Set log level according to current Logger configuration for this mote. Called whenever
       * the logger settings have changed.
       * @private
       */
      resetLogLevel: function(/** DFLT_ASYNC_CB */callback) {
	  if (BC.is(callback)) { return BC.exec(arguments.callee, this, arguments); }
	  
	  var logLevels = Logger.getLogLevels();
        var hwportLevel = logLevels[Sonoran.Logger.HWPORT];
        var sev = Sonoran.LIP.LOG_DEBUG;
        switch(hwportLevel) {
        case Logger.EMERG:
	case Logger.ERR:
	    sev = Sonoran.LIP.LOG_ERROR;
            break;
        case Logger.NOTICE:
        case Logger.INFO:
            sev = Sonoran.LIP.LOG_INFO;
            break;
        case Logger.WARN:
            sev = Sonoran.LIP.LOG_WARN;
            break;
        }
	var _this = this;
	var f3 = function(result) {
	    if (result.code !== 0) {
		Logger.err(sprintf("%s: could not set log level: %s", this, result));
	    }
	    callback(result);
	};
	var f2 = function(result) {
	    if (result.code !== 0) {
		Logger.err(sprintf("%s: could not set log level: %s", this, result));
	    }
	    _this.device.setLogLevel(Sonoran.LIP.PARA_LOGLVL_MAPP, sev, f3);
	};
	var f1 = function(result) {
	    if (result.code !== 0) {
		Logger.err(sprintf("%s: could not set log level: %s", this, result));
	    }
	    _this.device.setLogLevel(Sonoran.LIP.PARA_LOGLVL_MOTE, sev, f2);
	};
	_this.device.setLogLevel(Sonoran.LIP.PARA_LOGLVL_HOST, sev, f1);
      },


      /**
       * Send packet to the LIP mote.
       * @param mote mote
       * @param dstport   Destination port
       * @param srcport   Source port
       * @param payload   Binary string
       * @param timer     Optional
       * @private
       */
	send: function(/** Sonoran.Mote */ mote, /** Number */dstport, /** Number */srcport, /** String */payload, /** Timer.Timer|Timer.Timer[] */timer) {
	    assert(mote === this.mote);
	    var _this = this;
            var bytes = Formatter.pack("4u2u1u", 0, srcport, dstport) + payload;
	    this.device.send(bytes, function(status) {
		if (status.code !== 0) {
		    QUACK(0, sprintf("%s: 'send' command failed: %s", _this, status));
		}
		if (timer) {
		    Timer.startTimers(timer);
		}
 	    });
	},


      /**
       * Mote was deregistered from registry.
       * @private
       */
      onDeregister: function(/** Sonoran.Mote */mote) {
	  var _this = this;
	  this.close(function(status) {
	      if (status.code !== 0) {
		  var msg = sprintf("%s: disposing mote failed: close failed: %s", _this, status);
		  Logger.err(msg);
		  QUACK(0, msg);
	      }
	      _this.device.dispose(function(status) {
		  if (status.code !== 0) {
		      var msg = sprintf("%s: disposing mote failed: dispose failed: %s", _this, status);
		      QUACK(0, msg);
		      Logger.err(msg);
		  }
	      });
	  });
      },


      /**
       * Invoke reset on the underlying LIP interface and wait up to specified number of
       * milliseconds for the mote to get live again.
       * @param timeout  Ignored
       * @param mode     Ignored
       * @param callback 
       * @throws {AOP.Exception}
       */
	reset: function(/** Sonoran.Mote */mote, /** Number */timeout, mode, /** DFLT_ASYNC_CB */callback) {
	    if (BC.is(callback)) { return BC.exec(arguments.callee, this, arguments); }
	    assert(this.mote === mote);
            var _this = this;

	  var listenerf = function(ev) {
	      //QUACK(0, "EV: " + ev);
	      if ((ev.category === Sonoran.EV_CAT_MOTE) && (ev.mote === mote) && (mote.getState() === Sonoran.Mote.ON)) {
		  closef(new AOP.OK());
	      }
	  };
	  Sonoran.Registry.addListener(listenerf); 

	  var closef = function(result) {
	      if (!timer) {
		  return;
	      }
	      timer.cancel();
	      timer = null;
	      Sonoran.Registry.removeListener(listenerf);
	      callback(result);
	  };

	  var timer = new Timer.Timer(5000, undefined, closef);
	  var hwport = this.device.getHWPORT();

	  var doReset = function() {
	      mote.updateState(Sonoran.Mote.OFF);

	      timer.start();

	      _this.device.reset(function(status) {
		  if (status.code !== 0) {
		      Logger.err(sprintf("%s: reset command failed: %s", _this, status));
		      closef(status);
		  }
	      });
	  };

	  if (hwport.match(/^([0-9a-fA-F][0-9a-fA-F]-){7}[0-9a-fA-F][0-9a-fA-F]$/)){
	      
	      doReset();

          } else if (hwport.match(/^(COM|\/dev\/ttyUSB)\d+|\/dev\/tty.usb.+$/)){

	       this.device.getState(function(result) {
		   if (result.code != 0) {
		       closef(result);
		   } else {
		       var state = result.getData();
		       doReset();
		   }
	       });
	      
          } else {
	      throw new Exception(sprintf("Unexpected hardware port specification: %s", hwport));
	  }
      },


      /**
       * Wait until specified time elapses or connected mote is alive.
       * @param timeout Time to wait in millis, must be at least 3000
       * @param callback
       * @throws {AOP.Exception}
       */
      waitFor: function(/** Number */timeout, /** DFLT_ASYNC_CB */callback) {
	  if (BC.is(callback)) { return BC.exec(arguments.callee, this, arguments); }
          var state = Sonoran.LIP.STATE_MOTE_UP;
          assert(timeout >= 3000);
          var interval = 500;
          var end = Clock.get() + timeout;
          var _this = this;
	  var onState = function(result) {
	     if (result.code !== 0) {
		 callback(result);
		 return;
             }
             if (result.getData() === state) {
		 callback(new AOP.OK(state));
		 return;
             }
	     if (result.getData() === Sonoran.LIP.STATE_CLOSED) {
                 _this.open(getState);
              } else {
		  Timer.timeoutIn(interval, getState);
	      }
	 };
	  var getState = function() {
	      if (Clock.get() > end) {
                  callback(Timeout2ERR("LIP mote is not up!\n"+
                                       "Ensure the communication port is correct.\n"+
                                       "Ensure the mote is properly attached onto the programming board.\n"+
                                       "Did you press the RESET button on the programming board?\n"));
                  return;
              }
	      _this.device.getState(onState);
	  };
	  getState();
      },


      /**
       * Query and refresh mote state.
       * @param callback
       * @returns {Sonoran.MoteImpl} this
       * @throws {AOP.Exception}
       */
      query: function(/** DFLT_ASYNC_CB */callback) {
	  if (BC.is(callback)) { return BC.exec(arguments.callee, this, arguments); }
         var _this = this;
         var mote = this.mote;
         var f2 = function(result) {
	     if (result.code !== 0) {
		 callback(result);
		 return;
             }
             var state = result.getData();
             switch(state) {
             case Sonoran.LIP.STATE_RST_PEND:
		 mote.updateState(Sonoran.Mote.RESET);
		 Timer.timeoutIn(500, f1);
		 break;
             case Sonoran.LIP.STATE_MOTE_UP:
		 mote.updateState(Sonoran.Mote.ON);
		 callback(new AOP.OK(_this));
		 break;
             case Sonoran.LIP.STATE_CLOSED:
		 mote.updateState(Sonoran.Mote.OFF);
		 _this.open(function(status) { ; });
		 Timer.timeoutIn(1000, f1);
		 break;
             default:
		 assert(0);
             }
	 };
         var f1 = function() {
	     _this.device.getState(f2);
         };
         f1();
      }
    }
);













// /**
//  * Filter serial ports based on specified filter.
//  * @param serialPorts 
//  * @param filter "MIB520-COM" (default), "MIB520-FLASH"
//  * @returns {String[]} Suggested ports
//  */
// Sonoran.LIP.filterPorts = function(/** String[] */serialPorts, /** String */filter) {
//     filter = (filter==null)? "MIB520-COM":filter;

//     var filt = [];

//     if (ARCH_NAME == "macosx"){
//         // A - flashing
//         // B - communication
//         for( var i=0; i<serialPorts.length; i++ ){
//             if (filter == "MIB520-COM"   && /.*B$/.test(serialPorts[i])) filt.push(serialPorts[i]);
//             if (filter == "MIB520-FLASH" && /.*A$/.test(serialPorts[i])) filt.push(serialPorts[i]);
//         }
//     }
//     else {
//         var prefix;
//         if (ARCH_NAME == "win32" || ARCH_NAME == "cygwin")
//             prefix = "COM";
//         else if (ARCH_NAME == "linux" || ARCH_NAME == "linux64")
//             prefix = "/dev/ttyUSB";

//         // extract COM port number
//         var coms = [];
//         // enumerate all COM port numbers, do not select HID ports
//         for( var i=0; i<serialPorts.length; i++ ){
//             // try matching COM ports
//             var commstr = /.*(COM|ttyUSB)(\d+)/;
//             var g = serialPorts[i].match(commstr);
//             if (g != null){
//                 var num = parseInt(g[2]);
//                 coms.push(num);
//             }
//         }

//         // sort com ports
//         coms = coms.sort(function(a,b){return a-b;});

//         var pair = 0; // we are looking for pairs
//         for( var i=0; i<coms.length; i++ ){
//             if (pair == 0 && coms[i] == coms[i+1]-1){
//                 pair = 1; // we found a pair
//                 continue;
//             }
//             if (pair == 1){
//                 pair = 0; // we look for pairs again
//                 // lower port  - flashing
//                 // higher port - communication
//                 if (filter == "MIB520-COM")   filt.push(prefix + coms[i]);
//                 if (filter == "MIB520-FLASH") filt.push(prefix + coms[i-1]);
//             }
//             else {
//                 filt.push(prefix + coms[i]);
//             }
//         }
//     }

//     return filt;
// }


// /**
//  * Reset a hardware mote attached to a programming board. The function uses the
//  * avrdude utility, which must be installed, to read the fuses and casue a mote
//  * reset.
//  * @param hwPort the serial port (communication or flash) for the programming board
//  * @param isFlash If "false" the function then inferrs the flash port. If "true"
//  * the mote uses the "hwPort" to read the fuses using avrdude
//  * @param callback 
//  * @return
//  * @throws {AOP.Exception}
//  */
// Sonoran.LIP.resetHwMote = function (hwPort, isFlash, callback) {
//     if (BC.is(callback)) { return BC.exec(arguments.callee, this, arguments); }

//     var progPort = "NONE";

//     if (isFlash == null || isFlash == false){
//         // reset a HW Iris mote connected to an MIB520 using avrdude

//         if (Win32.runOnWindows()) {
// 	    var g = hwPort.match(/^COM(\d+)(:\d+)*$/);
// 	    var comPort = 0;
// 	    if (g){
//                 comPort = parseInt(g[1]);
//                 //printf("%s %d %s\n", comPort, comPort, typeof comPort);
// 	    }
// 	    else{
//                 //this.failed("Invalid COM port specification!\n ");
// 	    }
// 	    var progComPort = comPort - 1;
// 	    progPort = "//./COM"+progComPort;
//         }
//         else if (ARCH_NAME == "linux" || ARCH_NAME == "linux64"){
// 	    var g = hwPort.match(/^\/dev\/ttyUSB(\d+)(:\d+)*$/);
// 	    var comPort = 0;
// 	    if (g){
//                 comPort = parseInt(g[1]);
//                 //printf("%s %d %s\n", comPort, comPort, typeof comPort);
// 	    }
// 	    else{
//                 //this.failed("Invalid COM port specification!\n ");
// 	    }
// 	    var progComPort = comPort - 1;
// 	    progPort = "/dev/ttyUSB"+progComPort;
//         }
//         else if (ARCH_NAME == "macosx"){
// 	    progPort = hwPort.replace(/B$/,"A");
//         }
//     }
//     else{
// 	// try to reset the mote using exactly the specified port
// 	// this assumes it is the single port of an MIB510 or the flash port of an MIB520
// 	    progPort = hwPort;
//     }

//     //FIXME: write the fuses to a temporary file
//     var avrdude = REPO_ROOT.replace(/\\/g,"/") + "/" + ARCH_NAME + "/bin/avrdude";
//     var args = ["-cmib510",
// 		"-P"+progPort,
// 		"-pm1281",
// 		"-C"+REPO_ROOT.replace(/\\/g,"/")+"/"+ARCH_NAME+"/bin/avrdude.conf",
// 		"-U",
// 		"hfuse:r:-:i",
// 		"-q",
// 		"-q"];

//     printf("Running avrdude: '%s'\n", avrdude+" "+args.join(" "));
//     var pid = IO.Process.start(avrdude, args, function (obj) {
// 	//QUACK(0, "EXITC: " + obj.pexitcode);
// 	//XXX: WIN32 !!! if the COM port does not exist the avrdude process
//         //     terminates immediatly and the callback is never invoked!
// 	if( obj.pexitcode != 0 ) {
// 	    //printf("Avrdude failed: %d\n", obj.pexitcode);
// 	    callback(new AOP.ERR(sprintf("Avrdude failed: %d", obj.pexitcode)));
// 	} else {
// 	    callback(new AOP.OK());
// 	}
//     });
// };








/**
 * Name of default serial device.
 * @type String
 * @constant
 */
Sonoran.LIP.DEFAULT_SERIALPORT = "/dev/ttyS";
OPTIONS.add("Sonoran.LIP.DEFAULT_SERIALPORT");
if (ARCH_NAME=='macosx') {
   Sonoran.LIP.DEFAULT_SERIALPORT = '/dev/tty.usb';
} else if (ARCH_NAME=='win32') {
   Sonoran.LIP.DEFAULT_SERIALPORT = 'COM';
} else {
   Sonoran.LIP.DEFAULT_SERIALPORT = "/dev/ttyS";
}
if (IO.Process.getenv("SONORAN_LIP_SERIALPORT")) {
    Sonoran.LIP.DEFAULT_SERIALPORT = IO.Process.getenv("SONORAN_LIP_SERIALPORT");
    println("Picking default serial port from environment: " + Sonoran.LIP.DEFAULT_SERIALPORT);
}














//---------------------------------------------------------------------------------------------------------------
//
// LIP Shell Commands
//
//---------------------------------------------------------------------------------------------------------------
/**
 * @private
 */
Sonoran.CLI.Commands.LIP = {};



/**
 * @class 
 * @constructor
 * @private
 */
Sonoran.CLI.Commands.LIP.WaitCommand = function(shell, name) {
    this.description =
        "Wait for a serial LIP mote to be ready for communication. Issue this\n" +
        "command and manually reset the mote to setup the proper communication\n" +
        "over the serial line.";
    this.timeoutOpt   = new GetOpt.TimeoutOpt("10s");
    var optSet = new GetOpt.OptionSet([ this.timeoutOpt ]);
    var cmdSpec = new Sonoran.CLI.Spec(name, Sonoran.CLI.DST_ONE_MOTE, 'lip');
    CLI.Command.call(this, shell, cmdSpec, [ optSet, new GetOpt.EndOfArgs() ]);
};

/** @private */
Sonoran.CLI.Commands.LIP.WaitCommand.prototype = extend(
    CLI.Command.prototype,
    {
        /** @private */
        exec: function(callback) {
	    var _this = this;
	    var mote = this.cmdSpec.getMote();
	    mote.getConnection().waitFor(this.timeoutOpt.getSpan(), function(result) {
                if (result.code != 0) {
		    result = new AOP.OK(sprintf("mote %s: %s", mote.getUniqueid(), result));
                } else {
		    result = new AOP.OK(sprintf("mote %s: state '%s'", mote.getUniqueid(), mote.getState()));
                }
                callback(result);
	    });
        }
    }
);



/**
 * @class 
 * @constructor
 * @private
 */
Sonoran.CLI.Commands.LIP.EnumerateCommand = function(shell, name) {
    this.description = "Enumerate all connected HID and serial devices.";
    this.irisOpt     = new GetOpt.Option(null, "--iris", 0, null, "Detect IRIS programming board MIB510");
    this.waspmoteOpt = new GetOpt.Option(null, "--waspmote", 0, null, "Detect WASPMOTE attached via USB cable");
    this.timeoutOpt  = new GetOpt.TimeoutOpt("10s");
    this.waitOpt     = new GetOpt.Option("w", "--wait", 0, null, "Wait for devices being attached.");
    var optSet = new GetOpt.OptionSet([ this.waitOpt, this.timeoutOpt, this.irisOpt, this.waspmoteOpt ]);
    var cmdSpec = new Sonoran.CLI.Spec(name, Sonoran.CLI.DST_NONE, 'lip');
    CLI.Command.call(this, shell, cmdSpec, [ optSet, new GetOpt.EndOfArgs() ]);
};

/** @private */
Sonoran.CLI.Commands.LIP.EnumerateCommand.prototype = extend(
    CLI.Command.prototype,
    {
        /** @private */
        exec: function(callback) {
	    var obj = Sonoran.LIP.enumerateHWPORTS();
	    if( !this.waitOpt.isSet() ) {
		callback(new AOP.OK(obj));
		return;
	    }
	    var serialMap = {};
	    var hidMap = {};
	    for( var i=0; i<obj.serial.length; i++ )
		serialMap[obj.serial[i]] = 1;
	    for( var i=0; i<obj.hid.length; i++ )
		hidMap[obj.hid[i]] = 1;
	    var endTime = Clock.get() + 10000; //this.timeoutOut.getSpan();
	    while( Clock.get() < endTime ) {
		var newSerials = [];
		var newHids = [];
		obj = Sonoran.LIP.enumerateHWPORTS();
		for( var i=0; i<obj.serial.length; i++ ) {
		    var sdev = obj.serial[i];
		    if( serialMap[sdev] != 1 )
			newSerials.push(sdev);
		}
		for( var i=0; i<obj.hid.length; i++ ) {
		    var hdev = obj.hid[i];
		    if( hidMap[hdev] != 1 )
			newHids.push(hdev);
		}
		if(  newSerials.length != 0 || newHids.length != 0 ) {
		    var text = "";
		    // ----------------------------------------
		    if( this.irisOpt.isSet() ) {
			if( newSerials.length < 2 )
			    continue;
			if( newSerials.length != 2 ) {
			    callback(new AOP.ERR("More than two serial ports appeared: "+newSerials.join(" ")+"\n"+
						 "An attached IRIS mote should add only two ports."));
			    return;
			}
			if (newSerials[0].match(/^COM/)){
			    // Windows requires special sort using actual port number (! not alphabetical string)
			    var s0 = newSerials[0];
			    var s1 = newSerials[1];
			    var p0 = parseInt(newSerials[0].substr(3));
			    var p1 = parseInt(newSerials[1].substr(3));
			    if (p1<p0){
				// swap
				newSerials[0]=s1;
				newSerials[1]=s0;
			    }
			}
			else
			    newSerials.sort();
			text += ("Flash programming port (mib510): "+newSerials[0]+"\n"+
				 "Mote Runner port  (mote-create): "+newSerials[1]);
			this.shell.setVar("MIB520_FLASH_PORT", newSerials[0]);
			this.shell.setVar("MIB520_MR_PORT", newSerials[1]);
		    } 
		    // ----------------------------------------
		    else if (this.waspmoteOpt.isSet()){
			if( newSerials.length < 1 )
			    continue;
			if( newSerials.length != 1 ) {
			    callback(new AOP.ERR("More than one serial ports appeared: "+newSerials.join(" ")+"\n"+
						 "An attached WASPMOTE mote should add only one port."));
			    return;
			}
			text += ("Mote Runner port  (mote-create): "+newSerials[0]);
			this.shell.setVar("WASPMOTE_MR_PORT", newSerials[0]);		
		    }
		    else {
			if( newSerials.length > 0 ) {
			    var s = newSerials.join(" ");
			    text += "Device serial ports: "+s;
			    this.shell.setVar("ENUM_SERIAL_PORTS", s);
			}
			if( newHids.length > 0 ) {
			    var s = newHids.join(" ");
			    text += "HID device attached: "+s;
			    this.shell.setVar("ENUM_HID", s);
			}
		    }
		    var res = {
			hid: newHids,
			serial: newSerials,
			toString: function () { return text; }
		    };
		    callback(new AOP.OK(text));
		    return;
		}
		
	    }
	    callback(new AOP.ERR("No serial or HID devices have been attached."));
        }
    }
);






CLI.commandFactory.addModule("Sonoran.CLI.Commands.LIP");










