//  (C) COPYRIGHT INTERNATIONAL BUSINESS MACHINES CORPORATION 2013-2013
//                       ALL RIGHTS RESERVED
//        IBM Research Division, Zurich Research Laboratory
// --------------------------------------------------------------------







/**
 * @class
 * @static
 * @private
*/
CLI.LRSC = {};


/**
 * @class 
 * @constructor
 * @private
 */
CLI.LRSC.ServerCommand =  function(/** CLI.Shell */shell, /** String */name) {
    this.description = "Start and control a simulated network server.";
    
    this.nwkeuiSpec = new GetOpt.EuiSpec();
    this.nwkeuiOpt = new GetOpt.Option("n", "--nwkeui", 0, null, "Network server eui.", this.nwkeuiSpec);
    
    this.simulOpt = new GetOpt.Option("s", "--simulation", 0, null, "Start network server for simulation. Obsolete.");
    
    this.beaconSpec = new GetOpt.Number("beacon", "Interval for beacon.", null, null);
    this.beaconSpec.setRange(128, 16, 3600);
    this.beaconOpt = new GetOpt.Option("b", "--beacon-interval", 0, null, "Interval for beacon. Obsolete.", this.beaconSpec);
    
    this.optSet = new GetOpt.OptionSet([ this.nwkeuiOpt, this.beaconOpt, this.simulOpt ]);

    this.actionSpec = new GetOpt.Keywords(null, "Start, stop or info.", [ "start", "stop", "info" ]);
    this.endOfArgs = new GetOpt.EndOfArgs();

    CLI.Command.call(this, shell, name, [ this.optSet, this.actionSpec, this.endOfArgs ], 1); 
};

/** @private */
CLI.LRSC.ServerCommand.prototype = extend(
    CLI.Command.prototype,
    {
        /** @private */
        exec: function(callback) {
	    var action = this.actionSpec.getSelectedKeyword();
	    if (action == "start") {
		if (LRSC.nwkServer != null) {
		    throw new Exception("Network server already started!");
		}
		var simulated = true || this.simulOpt.isSet();
		var config = new LRSC.Configuration();
		if (this.nwkeuiOpt.isSet()) {
		    // simulation mote
		    config.nwkeui = this.nwkeuiSpec.getEui();
		}
		var server = new LRSC.NwkServer(simulated, config);
		assert(LRSC.nwkServer == server);
		callback(new AOP.OK(server.toString()));
		return;
	    }
	    if (action == "stop") {
		if (LRSC.nwkServer == null) {
		    throw new Exception("No network server running!");
		}
		LRSC.nwkServer.close();
		callback(new AOP.OK());
		return;
	    }
	    if (LRSC.nwkServer == null) {
		throw new Exception("No network server running!");
	    }
	    callback(new AOP.OK(LRSC.nwkServer.getInfo()));
	}
    }
);




/**
 * @class 
 * @constructor
 * @private
 */
CLI.LRSC.GatewayRegisterCommand =  function(/** CLI.Shell */shell, /** String */name) {
    this.description = "Register a gateway to be used with a simulated network server.";
    this.euiSpec = new GetOpt.Simple("eui", "Eui gateay is sending for identiciation.", null, null);
    
    this.nameSpec = new GetOpt.Simple("name", "Gateway name.");
    this.nameOpt = new GetOpt.Option("n", "--name", 0, null, "Name tag.", this.nameSpec);

    this.posSpec = new GetOpt.Simple("pos", ".gpx or .kml");
    this.posOpt = new GetOpt.Option("p", "--pos", 0, null, "Position.", this.posSpec);

    this.xSpec = new GetOpt.Number("x-pos", "x-Coordinate.");
    this.xOpt = new GetOpt.Option("x", "--x", 0, null, "Position.", this.xSpec);
    this.ySpec = new GetOpt.Number("y-pos", "y-Coordinate.");
    this.yOpt = new GetOpt.Option("y", "--y", 0, null, "Position.", this.ySpec);
    this.zSpec = new GetOpt.Number("z-pos", "z-Coordinate.");
    this.zOpt = new GetOpt.Option("z", "--z", 0, null, "Position.", this.zSpec);

    this.optSet = new GetOpt.OptionSet([ this.posOpt, this.nameOpt, this.xOpt, this.yOpt, this.zOpt ]);

    this.endOfArgs = new GetOpt.EndOfArgs();

    CLI.Command.call(this, shell, name, [ this.optSet, this.euiSpec, this.endOfArgs ], 1); 
};

/** @private */
CLI.LRSC.GatewayRegisterCommand.prototype = extend(
    CLI.Command.prototype,
    {
        /** @private */
        exec: function(callback) {
            var shell = this.shell;
            var eui = this.euiSpec.getArg();
	    try {
		eui = Util.UUID.completeEUI(eui);
	    } catch(ex) {
		callback(new AOP.ERR(sprintf("Invalid EUI '%s': %s", eui, ex)));
		return;
	    }
	    var obj = {
		name: eui,
		place: { x: 0, y: 0, z: 0 }
	    };
	    if (this.nameOpt.isSet()) {
		obj.name = this.nameSpec.getArg();
	    } 
	    if (this.posOpt.isSet()) {
		var arg = this.posSpec.getArg();
		var place;
		if (arg.indexOf(".kml") > 0) {
		    var places = GPS.kml2places(arg);
		    if( places.length == 0 )
			throw new AOP.ERR(sprintf("File `%s' does not contain any places", arg));
		    place = places[0];
		} else {
		    place = GPS.gpx2point(arg, 0);
		}
		obj.place = place;
	    }
	    if (this.xOpt.isSet() || this.yOpt.isSet() || this.zOpt.isSet()) {
		obj.place = { x: this.xSpec.getNumber()||0, y: this.ySpec.getNumber()||0, z: this.zSpec.getNumber()||0 };
		println(Util.formatData(obj.place));
	    }
	    var nwksrv = LRSC.getNwkServer();
	    if (!nwksrv) {
		callback(new AOP.ERR("Network server must be started before gateway is regisered!"));
		return;
	    }
	    //LRSC.gatewayConfiguration[eui] = obj;
	    nwksrv.registerGateway(eui, obj.name, obj.place);
	    callback(new AOP.OK());
	}
    }
);






/**
 * @class 
 * @constructor
 * @private
 */
CLI.LRSC.ArtClientRegisterCommand =  function(/** CLI.Shell */shell, /** String */name) {
    this.description =
	"Register an application with an application router. The application router might be external\n" +
	"to this Sonoran process and be reached by a TCP connection. Use '-h' to specify the remote application router.\n" +
	"If the application router has been started before in this Sonoran process for the simulation, use '-l'.\n" +
	"Use --ssl to connect to an external, secured ART. The command searches for <arteui>.CLIENT.cert and \n" +
	"<arteui>.CLIENT.key in the current directory and subdirectories. If stored elsewhere, use '--ssl-dir'.\n\n" +
	"Example: art-client-register --local AA-AA-AA-AA-11-11-11-11 AppHandler\n" +
	"Creates an AppHandler instance and connects that to the local, simulated application router for the specified EUI.\n" +
	"Example: art-client-register -h dev.lrsc.ch AA-AA-AA-AA-11-11-11-11 AppHandler\n" +
	"Creates an AppHandler instance and connects that to the remote application router for the  specified EUI.\n" +
	"Example: art-client-register --ssl -h dev.lrsc.ch AA-AA-AA-AA-11-11-11-11 AppHandler\n" +
	"Creates an AppHandler instance and connects that to the remote application router using SSL client authentication";
    this.arthostSpec = new GetOpt.HostPortSpec(LRSC.DEFAULT_PORT.ART_APP, "localhost", "Application router server address and TCP port."); 
    this.arthostOpt = new GetOpt.Option("h", "--host", 0, null, "Network server address.", this.arthostSpec);
    this.localOpt = new GetOpt.Option("l", "--local", 0, null, "Run against simulated art server.");
    this.arteuiSpec = new GetOpt.EuiSpec("arteui", "Application router eui.");
    this.handlerSpec = new GetOpt.Simple("handler", "Application handler class name.");
    this.sslOpt = new GetOpt.Option("s", "--ssl", 0, null, "Connect using SSL and client authentication.");
    this.sslDirSpec = new GetOpt.FileSpec("dir", "Directory with client certificater and key.", REPO_ROOT + "/lib/sonoran/resources", true, true);
    this.sslDirOpt = new GetOpt.Option(null, "--ssl-dir", 0, null, "Directory with client certificater and key.", this.sslDirSpec);
    this.endOfArgs = new GetOpt.EndOfArgs();
    this.optSet = new GetOpt.OptionSet([ this.arthostOpt, this.localOpt, this.sslOpt, this.sslDirOpt ]);
    CLI.Command.call(this, shell, name, [ this.optSet, this.arteuiSpec, this.handlerSpec, this.endOfArgs ]);
};

/** @private */
CLI.LRSC.ArtClientRegisterCommand.prototype = extend(
    CLI.Command.prototype,
    {
        /** @private */
        exec: function(callback) {
	    var arteui = this.arteuiSpec.getEui();
	    var arthost = this.arthostSpec.getHost();
	    var artport = this.arthostSpec.getPort();
	    if (this.localOpt.isSet()) {
		arthost = artport = null;
	    }
	    var app;
	    try {
		app = Blob.instantiate(this.handlerSpec.getArg(), []);
	    } catch(ex) {
		callback(AOP.Ex2ERR(ERR_GENERIC, ex, sprintf("Cannot instantiate server application: '%s'", this.handlerSpec.getArg())));
		return;
	    }

	    var f = function(path, suffix) {
		var fn1 = arteui.toLowerCase() + ".client" + suffix;
		var re = new RegExp(RegExp.escape(fn1));
		var paths = IO.FileUtils.find(path, re, 2);
		if (paths.length == 1) {
		    return paths[0];
		} else if (paths.length > 1) {
		    throw new Exception(sprintf("Found multiple '%s' Files: %s", sufix, paths.join(",")));
		} 
		assert(paths.length==0);
		var fn2 = arteui.toUpperCase() + ".CLIENT" + suffix;
		re = new RegExp(RegExp.escape(fn2));
		paths = IO.FileUtils.find(path, re, 2);
		if (paths.length == 1) {
		    return paths[0];
		} else if (paths.length > 1) {
		    throw new Exception(sprintf("Found multiple '%s' files [Please create separate directories]: %s", suffix, paths.join(",")));
		} else {
		    throw new Exception(sprintf("Cannot find required SSL credential relative to '%s': '%s' or '%s'", path, fn1, fn2));
		}
	    };

	    var sslCTX = null;
	    if (this.sslOpt.isSet()) {
		var certfn, keyfn;
		var path = this.sslDirSpec.getPath();

		certfn = f(path, ".cert");
		keyfn = f(path, ".key");
		sslCTX = SSL.getContext(false, certfn, keyfn);
	    }
	    
	    var router = new LRSC.ArtCl(arteui, app, arthost, artport, { sslctx: sslCTX });
	    callback(new AOP.OK());
	}
    }
);





/**
 * @class 
 * @constructor
 * @private
 */
CLI.LRSC.ArtServerRegisterCommand =  function(/** CLI.Shell */shell, /** String */name) {
    this.description = 
	"Create an application router for a specified EUI for a simulated network server.\n" +
	"Example: art-server-register <appeui>\n" +
	"Creates an application router and connects that to the local network server.";
    this.arteuiSpec = new GetOpt.EuiSpec("arteui", "Application router eui.");
    this.portSpec = new GetOpt.Number("port", "TCP port for this application router.", null, null);
    this.portSpec.setRange(LRSC.DEFAULT_PORT.ART_APP, 0, 65536);
    this.portOpt = new GetOpt.Option("p", "--port", 0, null, "ART TCP port.", this.portSpec);
    this.endOfArgs = new GetOpt.EndOfArgs();
    this.optSet = new GetOpt.OptionSet([ this.portOpt ]);
    CLI.Command.call(this, shell, name, [ this.optSet, this.arteuiSpec, this.endOfArgs ]);
};

/** @private */
CLI.LRSC.ArtServerRegisterCommand.prototype = extend(
    CLI.Command.prototype,
    {
        /** @private */
        exec: function(callback) {
	    var arteui = this.arteuiSpec.getEui();
	    var nwksrv = LRSC.getNwkServer();
	    nwksrv.registerArtSrv(arteui, this.portSpec.getNumber());
	    callback(new AOP.OK());
	}
    }
);








/**
 * @class 
 * @constructor
 * @private
 */
CLI.LRSC.AppSendCommand =  function(/** CLI.Shell */shell, /** String */name) {
    this.description = 
	"Ask an application router to queue a packet for a destination mote with the network server.\n" +
	"The application router client must have been created before with 'lrsc-art-client-register' command.\n" +
	"Example: lrsc-app-send -c 27-71-0A-04-13-06-33-1C 10 000001\n" +
	"Send specified payload to the specified device expecting a conformation.\n" +
	"Example: lrsc-app-send -c -1C 10 000001\n" +
	"Same as above, device with matching EUI is searched.";
    this.deveuiSpec = new GetOpt.Simple("deveui", "Device EUI.");
    this.portSpec = new GetOpt.Number("port", "Port");
    this.dataSpec = new GetOpt.Simple("data", "Payload");
    this.restOfArgs = new GetOpt.RestOfArgs("If data is a Formatter.pack format string, parameters for pack() function call.");
    this.confirmOpt = new GetOpt.Option("-c", "--confirm", 0, null, "Require confirmation from mote.");
    var optSet = new GetOpt.OptionSet([ this.confirmOpt ]);
    CLI.Command.call(this, shell, name, [ optSet, this.deveuiSpec, this.portSpec, this.dataSpec, this.restOfArgs ], 0);

};

/** @private */
CLI.LRSC.AppSendCommand.prototype = extend(
    CLI.Command.prototype,
    {
        /** @private */
        exec: function(callback) {
	    var confirm = this.confirmOpt.isSet();
	    var port = this.portSpec.getNumber();
	    var payload;
	    try {
		payload = Formatter.hexToBin(this.dataSpec.getArg());
	    } catch(ex) {
		try {
		    payload = Formatter.pack(this.dataSpec.getArg(), this.restOfArgs.getRestArgs().map(function(s) { return parseInt(s); }));
		} catch(ex) {
		    throw new Exception(sprintf("Invalid payload: %s %s", this.dataSpec.getArg(), this.restOfArgs.getRestArgs().join(" ")));
		}
	    }

	    var deveui = this.deveuiSpec.getArg();
	    if (!Util.UUID.EUI64_PARTIAL_REGEX.test(deveui)) {
		throw new Exception(sprintf("Invalid partial device EUI: %s", deveui));
	    }
	    var obj = LRSC.ArtCl.lookupDeviceByEui(deveui);
	    var art = LRSC.ArtCl.get(obj.arteui);
	    assert(art);
	    var mode = confirm ? LRSC.ADN_MODE_CONFIRMED : 0;
	    art.sendDnData(obj.deveui, mode, 0, port, payload);
	    callback(new AOP.OK());
	}
    }
);






/**
 * @class 
 * @constructor
 * @private
 */
CLI.LRSC.AppInfoCommand =  function(/** CLI.Shell */shell, /** String */name) {
    this.description = 
	"Print information about an application router.\n" +
	"If no application EUI is given, all known application routers are queried.";
    this.arteuiSpec = new GetOpt.EuiSpec("arteui", "Application router eui.");
    var optSet = new GetOpt.OptionSet([  ]);
    CLI.Command.call(this, shell, name, [ optSet, this.arteuiSpec ], 0);

};

/** @private */
CLI.LRSC.AppInfoCommand.prototype = extend(
    CLI.Command.prototype,
    {
        /** @private */
        exec: function(callback) {
	    var arteui = this.arteuiSpec.getEui();
	    var arts;
	    if (arteui) {
		var art = LRSC.ArtCl.get(arteui);
		if (!art) {
		    callback(new AOP.ERR("No such ART: " + arteui));
		    return;
		}
		arts = [ art ];
	    } else {
		arts = LRSC.ArtCl.getAll();
	    }
	    var txt = arts.map(function(art) { return art.getInfo(); }).join("\n");
	    callback(new AOP.OK(txt));
	}
    }
);


