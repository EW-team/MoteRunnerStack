//---------------------------------------------------------------------------------------------------------------
//
// Sonoran.UDP.Mote
//
//---------------------------------------------------------------------------------------------------------------

/**
 * Provides classes handling motes offering a UDP port for communication.
 * @namespace Sonoran.UDP 
 */
Sonoran.UDP = {
    /**
     * @private
     */
    ID: 0
};


Sonoran.Connection.extend(
    "Sonoran.UDP.Connection",
    /**
     * @lends Sonoran.UDP.Connection.prototype
     */
    {
	/**
	 * Sonoran.UDP.Connection connects motes to motes available through an UDP port, e.g.
	 * properly configured simulated motes or libellium mote.
	 * @constructs
	 * @augments Sonoran.Connection
	 * @constructor This method creates the mote and registers it with Sonoran.Registry.
	 * @param hostname
	 * @param port
	 */
	__constr__: function(/** String */hostname, /** Number */port) {
	    Sonoran.Connection.call(this);
	    this.hostname = hostname;
	    var he = IO.Inet.gethostbyname(hostname);
	    assert(he.addresses[0]);
	    this.hostaddr = he.addresses[0];
	    this.hostport = port;
	    var addr = "udp://"+this.hostname+":"+this.hostport;
	    this.uid = Sonoran.UDP.ID++;
	    //var uniqueid = "UDP:"+this.uid;
	    var uniqueid = addr;
	    var name = this.hostname+":"+this.hostport;
	    var mote = new Sonoran.Mote(this, uniqueid, addr, 'udp', this, name, "udp");
	    this.mote = mote;
	    mote.updateState(Sonoran.Mote.ON);
	    this.socks = {};
	    Sonoran.Registry.registerMote(mote);
	    this.registryListener = Sonoran.Registry.addListener(this.onEvent.bind(this));

	    var res = mote.getMOMA().getEUI64(null, SCB);
	    if (res.code !== 0) {
		Logger.err("Could not retrieve eui-64 from UDP mote: " + res);
	    } else {
		mote.updateUniqueid(res.getData());
	    }
	},


        /**
         * Address of hostname in dot notation
         * @type String
         */
        hostaddr: null,
        
        /**
         * The hostname of target mote
         * @type String
         */
        hostname: null,
        
        /**
         * UDP port of target mote
         * @type Number
         */
        hostport: null,
        
        /**
         * Map of sonoran ports to underlying udp sockets
         * @type Object
         */
        socks: null,

        /**
	 * @type Function
         * @private
         */
        registryListener: null,
        
	/**
	 * @returns {String}
	 */
	getHostAddr: function() {
	   return this.hostaddr; 
	},

	/**
	 * @returns {String}
	 */
	getHostPort: function() {
	    return this.hostport;
	},


        /**
         * toString implementation.
         * @returns {String} the unique id
         */
        toString: function() {
            return this.mote.uniqueid;
        },
        

	/**
	 * @returns {Object} Map of sonoran ports to underlying udp sockets
	 * @private 
	 */
	getSocks: function() {
	    return this.socks;
	},


        /**
	 * @param port
	 * @param callback
         * @private
         */
        registerPort: function(port, callback) {
	    //QUACK(0, "HOST <-> UDP register port: " + port);
            var sock = this.socks[port];
            if (sock) {
                callback(new AOP.OK(sock));
                return;
            }
            var _this = this;
            var mote = this.mote;
            sock = new IO.UDPSocket();
            sock.onBlob = function(blob) {
                var data = blob.data;
                var srcport = data.charCodeAt(0);
		Event.Registry.signalEvent(new Sonoran.Event.Media(port, mote, srcport, data.substring(1)));
            };
            sock.open(0, function(result) {
                if (result.code != 0) {
                    callback(new AOP.ERR("Cannot open udp socket", result));
                    return;
                }
                _this.socks[port] = sock;
                callback(new AOP.OK(sock));
            });
        },
        
        
        /**
	 * @param port
	 * @param callback
         * @private
         */
        deregisterPort: function(port, callback) {
	    //QUACK(0, "HOST <-> UDP deregister port: " + port);
            var _this = this;
            var sock = this.socks[port];
            if (!sock) {
                callback(new AOP.OK());
                return;
            }
            sock.close(new AOP.OK(), function(status) {
                if (status.code==0) {
                    _this.socks[port] = null;
                }
                callback(status);
            });
        },
        
        
        /**
         * @private
         */
        close: function() {
            Sonoran.Registry.removeListener(this.registryListener);
            this.registryListener = null;
            for (var p in this.socks) {
                this.socks[p].close(new AOP.OK(), function(status){});
            }
        },
        
        
        /**
         * Handles events received from Sonoran.Registry.
	 * @private
         */
        onEvent: function(ev) {
            switch(ev.category) {
	    case Sonoran.EV_CAT_PORT: {
		//QUACK(0, "PORT event: " + ev);
		if (ev.evname === Sonoran.EV_NAME_DEREGISTER) {
                    this.deregisterPort(ev.port, function(status) {
			if (status.code != 0) {
                            var msg = sprintf("%s: could not release UDP port %d: %s", this.getUniqueid(), ev.port, status);
                            Logger.err(msg);
			}
                    });
		}
                break;
            }
	    case Sonoran.EV_CAT_MOTE: {
		if (ev.evname === Sonoran.EV_NAME_DEREGISTER) {
		    if (ev.mote == this) {
			this.close();
                    }
		}
		break;
	    }
	    }
        },
        
        
        /**
         * Query and refresh mote state. 
         * @param callback    
         * @returns {AOP.OK} an AOP.OK instance on callback invocation
         */
        query: function(callback)  {
            callback(new AOP.OK());
        },
        
        
        /**
         * Send packet to this mote.
         * @param mote
         * @param dstport
         * @param srcport
         * @param payload
         */
        send: function(/** Sonoran.Mote */mote, /** Number */dstport, /** Number */srcport, /** String */payload, /**  Timer.Timer|Timer.Timer[] */timer) {
	    assert(this.mote === mote);
            var _this = this;
            this.registerPort(srcport, function(status) {
                assert(status.code==0, "Could not get any udp port: " + status);
                var sock = _this.socks[srcport];
                assert(_this.socks[srcport]!=null);
                var bytes = String.fromCharCode(dstport) + payload;
		//QUACK(0, "UDP send: " + _this.hostaddr + ", " + _this.hostport + ", " + Formatter.binToHex(bytes));
                sock.send(bytes, _this.hostaddr, _this.hostport);
		if (timer) {
		    Timer.startTimers(timer);
		}
            });
        }
    },
    /**
     * @lends Sonoran.UDP.Connection
     */
    {
	/**
	 * @param hostname
	 * @param port
	 * @returns {Sonoran.Mote}
	 */
	createMote: function(/** String */hostname, /** Number */port) {
            var impl = new Sonoran.UDP.Connection(hostname||'localhost', port);
	    return impl.mote;
	}
    }
);



/**
 * @class
 * @static
 * @private
 */
Sonoran.UDP.Bridges = {
    /** 
     * Map of mote uid to bridge
     * @type Object
     * @private 
     */
    bridges: {},

    /**
     * @param bridge
     * @private
     */
    addBridge: function(/** Sonoran.UDB.Bridge */bridge) {
	var mote = bridge.mote;
        assert(mote);
	var uid = mote.getUid();
        this.bridges[uid] = bridge;
    },

    /**
     * @param bridge
     * @private
     */
    removeBridge: function(/** Sonoran.UDB.Bridge */bridge) {
        var mote = bridge.mote;
        assert(mote);
	var uid = mote.getUid();
        delete this.bridges[uid];
    },

    /**
     * Return UDP port for a mote or 0 if it does not export one.
     * @returns {Number} UDP port
     * @private
     */
    getPort: function(/** Sonoran.Mote */mote) {
	var uid = mote.getUid();
        var bridge = this.bridges[uid];
        if (bridge) {
            return bridge.sock.getPort();
        } else {
	    return (mote.getClass() == 'saguaro') ? Saguaro.mote2impl(mote).getUDPPort() : 0;
	}
    },

    /**
     * Returns array of two-element arrays (with mote and port) for all motes
     * currently registered and which are accessible using UDP.
     * @returns {Object[] } port information
     * @private
     */
    getPorts: function() {
        var motes = Sonoran.Registry.getMotes();
        var ret = [];
        for (var i = 0; i < motes.length; i++) {
            var mote = motes[i];
            var port = this.getPort(mote);
            if (port>0) {
                ret.push([ mote, port ]);
            }
        }
        return ret;
    }
};




/**
 * Sonoran.UDP.Bridge exchanges data with a registered mote using an UDP port. </br>
 * Packets from the mote are sent back to the last remote socket having sent something to this UDP socket.
 * Incoming packets on this UDP socket are forwarded to the bridged mote.</br>
 * Packets exchanged always contain in the first byte the source/target port on the mote.
 * @class
 * @constructor
 * @param mote    The mote to bridge
 */
Sonoran.UDP.Bridge = function(/** Sonoran.Mote */mote) {
    var _this = this;
    /**
     * The bridged mote.
     * @type Sonoran.Mote
     */
    this.mote = mote;
    /**
     * Remote address which should receive packets.
     * @type String
     */
    this.rmtaddr = null;
    /**
     * The remote port which should receive packets.
     * @type Number
     */
    this.rmtport = -1;
    /**
     * @type IO.UDPSocket
     */
    this.sock = null;
    /**
     * The local Sonoran socket port used.
     * @type Number
     */
    this.srcport = null;
};

/** Prototype. */
Sonoran.UDP.Bridge.prototype = {
    /**
     * @param rmtaddr
     * @param rmtport
     */
    setRemote: function(/** String */rmtaddr, /** Number */rmtport) {
	this.rmtaddr = rmtaddr;
	this.rmtport = rmtport;
    },

    /**
     * Open bridge.
     * @param port Local UDP port to use for this bridge.
     */
    open: function(/** Number */port, /** DFLT_ASYNC_CB */callback) {
	if (BC.is(callback)) { return BC.exec(arguments.callee, this, arguments); }
        assert(this.sock==null, "Bridge already open");
        var _this = this;
        this.srcport = Sonoran.Registry.registerPort();
        var registryf = function(ev) {
	    if (ev.category === Sonoran.EV_CAT_MOTE) {
		switch(ev.evname) {
		case Sonoran.EV_NAME_DEREGISTER: {
                    if (ev.mote == _this.mote) {
			Logger.debug("Closing mote bridge for mote " + ev.mote.getUniqueid());
			_this.sock.close(new AOP.OK(), function(status){});
                    }
                    break;
		}
		case Sonoran.EV_NAME_MEDIA: {
		    //QUACK(0, "UDP.bridge: event " + ev);
                    if (ev.mote == _this.mote && ev.dstport == _this.srcport) {
			_this.send2Remote(ev);
                    }
                    break;
		}
		}
	    }
        };
        this.sock = new IO.UDPSocket();
        this.sock.onBlob = function(blob) {
            _this.onBlob(blob);
        };
        this.sock.onClose = function(status) {
            Sonoran.UDP.Bridges.removeBridge(_this);
            Sonoran.Registry.removeListener(registryf);
            Sonoran.Registry.deregisterPort(_this.srcport);
        };
        this.sock.open(port, function(result) {
            if (result.code != 0) {
                callback(new AOP.ERR(sprintf("Cannot open udp socket: %s", result)));
                return;
            }
            Sonoran.Registry.addListener(registryf);
            Sonoran.UDP.Bridges.addBridge(_this);
            callback(new AOP.OK(_this));
        });
    },


    /**
     * Close bridge and sockets.
     */
    close: function() {
	this.sock.close(new AOP.OK(), SCB);
    },


    /**
     * @returns {String} a string
     */
    toString: function() {
        return "UDP-bridge:" + this.mote.getUniqueid();
    },

    
    /**
     * Forward a message to the remote UDP port.
     * @param ev Sonoran.Event.Media
     * @private
     */
    send2Remote: function(ev) {
        if (this.rmtaddr != null) {
            var srcport = ev.srcport;
            var data = String.fromCharCode(srcport) + ev.data;
	    //QUACK(0, "UDPBridge.send2Remote: " + this.rmtaddr + ":" + this.rmtport + ", " + srcport + ", " + Formatter.binToHex(data));
            Logger.debug(sprintf("Bridge: send packet to %s:%d: %H", this.rmtaddr, this.rmtport, data));
            this.sock.send(data, this.rmtaddr, this.rmtport);
        }
    },

    
    /**
     * A message from the udp socket is to be forwarded to the mote
     * @param blob The packet as received on the UDP socket.
     * @private
     */
    onBlob: function(blob) {
	QUACK(0, "UDPBridge.onBlob: " + Util.formatData(blob));
        this.rmtaddr = blob.srcaddr;
        this.rmtport = blob.srcport;
        var data = blob.data;
        if (data.length<1) {
            Logger.debug(sprintf("Bridge: skip packet from %s:%d with invalid length %d", this.rmtaddr, this.rmtport, data.length));         
            return;
        }
        var dstport = data.charCodeAt(0);
        var payload = data.substring(1);
        if (!payload) {
            payload = "";
        }
        Logger.debug(sprintf("Bridge: forward packet from %s:%d to mote: %d %H", this.rmtaddr, this.rmtport, dstport, payload));
        this.mote.send(dstport, this.srcport, payload);
    }
};








//---------------------------------------------------------------------------------------------------------------
//
// UDP Commands
//
//---------------------------------------------------------------------------------------------------------------


/**
 * @private
 */
Sonoran.CLI.Commands.UDP = {};



// /**
//  * @class
//  * @constructor
//  * @private
//  */
// Sonoran.CLI.Commands.UDP.CreateCommand = function(shell, name) {
//     this.description = "Create a mote communicating via UDP to a remote mote.";
//     this.hostSpec = new GetOpt.HostPortSpec(50505, "localhost");
//     this.nameSpec  = new GetOpt.Simple('name',"Mote name");
//     this.nameOpt   = new GetOpt.Option('n', '--name', 0, null, null, this.nameSpec);
//     var optSet = new GetOpt.OptionSet([ this.nameOpt ]);
//     CLI.Command.call(this, shell, name, [ optSet, this.hostSpec, new GetOpt.EndOfArgs() ]);
// };

// /** @private */
// Sonoran.CLI.Commands.UDP.CreateCommand.prototype = extend(
//     CLI.Command.prototype,
//     {
//         /** @private */
//         exec: function(callback) {
// 	    var _this = this;
//             var host = this.hostSpec.host;
// 	    var port = this.hostSpec.port;
//             var mote = null;
//             try {
//                 var impl = new Sonoran.UDP.MoteImpl(host, port);
//                 mote = impl.mote;
//             } catch(ex) {
//                 callback(Ex2ERR(ERR_GENERIC, ex));
//                 return;
//             }
//             callback(new AOP.OK(mote.getUniqueid()));
//         }
//     }
// );


/**
 * @class 
 * @constructor
 * @private
 */
Sonoran.CLI.Commands.UDP.BridgeCommand = function(shell, name) {
    this.description = "Bridge in and outgoing packet to an existing mote in this Sonoran process via a UDP socket.";
    this.portSpec = new GetOpt.Number("port", "UDP port number to allocate.", null, null);
    var cmdSpec = new Sonoran.CLI.Spec(name, Sonoran.CLI.DST_ONE_MOTE);
    CLI.Command.call(this, shell, cmdSpec, [ this.portSpec, new GetOpt.EndOfArgs() ]);
};

/** @private */
Sonoran.CLI.Commands.UDP.BridgeCommand.prototype = extend(
    CLI.Command.prototype,
    {
        /** @private */
        exec: function(callback) {
	    var _this = this;
            var mote = this.cmdSpec.getMote();
            var bridge = new Sonoran.UDP.Bridge(mote);
            bridge.open(this.portSpec.getNumber(), function(status) {
                if (status.code!=0) {
                    callback(status);
                } else {
                    callback(new AOP.OK(bridge.toString()));
                }
            });
        }
    }
);


CLI.commandFactory.addModule("Sonoran.CLI.Commands.UDP");
