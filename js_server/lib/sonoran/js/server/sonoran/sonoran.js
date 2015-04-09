//  (C) COPYRIGHT INTERNATIONAL BUSINESS MACHINES CORPORATION 2006-2010
//                       ALL RIGHTS RESERVED
//        IBM Research Division, Zurich Research Laboratory
// --------------------------------------------------------------------

Runtime.include("../channels/channels.js");
//Runtime.include("../rmi/rmi.js");
Runtime.include("../telnet/telnet.js");

Runtime.include("sonoran/sonoran.js");
Runtime.include("saguaro/saguaro-defs.js");
Runtime.include("sonoran/radio.js");
Runtime.include("sonoran/event.js");
Runtime.include("sonoran/assembly.js");
Runtime.include("sonoran/mote.js");
Runtime.include("sonoran/moma.js");
//Runtime.include("sonoran/wlip.js");
Runtime.include("sonoran/resource.js");
Runtime.include("sonoran/registry.js");


Runtime.include("./cli.js");
Runtime.include("./mote.js");
Runtime.include("./connection.js");
Runtime.include("./registry.js");
Runtime.include("./moma.js");
Runtime.include("./socket.js");
Runtime.include("./registry.js");
Runtime.include("./protocol.js");
Runtime.include("./msetup.js");
Runtime.include("./resource.js");
//Runtime.include("./gateway.js");
Runtime.include("./lip.js");
Runtime.include("./udp.js");
//Runtime.include("./wlip.js");
Runtime.include("./oasis.js");
//Runtime.include("./dust.js");    
Runtime.include("../lrsc/lrsc.js");    

Runtime.include("../saguaro/saguaro.js");
Runtime.include("../bugz/bugz.js");

Runtime.include("../timeline/timeline.js");    




/**
 * @private
 */
Sonoran.Logger = {}; 


/**
 * @private
 */
Sonoran.Logger.GATEWAY = 'GATEWAY';


/**
 * @private
 */
Sonoran.Logger.HWPORT = 'HWPORT';


Logger.defineModule([
    Sonoran.Logger.GATEWAY,
    Sonoran.Logger.HWPORT
]);






/**
 * The Saguaro namespace is also available as Sonoran.Saguaro.
 */
Sonoran.Saguaro = Saguaro;


/**
 * The global assembly cache (GAC). This object allows to list
 * in and load assemblies from the GAC.
 * @type Sonoran.Resource.GAC
 */
Sonoran.GAC = Sonoran.Resource.GAC;


/**
 * @private
 */
Sonoran.restartProcess = function(/** String */motelet, /** String */config, /**DFLT_ASYNC_CB */callback) {
    if (BC.is(callback)) { return BC.exec(arguments.callee, this, arguments); }

    var pipePath = Process.getenv("PILOT_PROC_PIPENAME");
    if (!pipePath) {
	var msg = "Missing environment entry: PILOT_PROC_PIPENAME";
	QUACK(0, msg);
	callback(new AOP.ERR(msg));
	return;
    }
    try {
	if (Oasis.httpServer) {
	    Oasis.httpServer.close(BLCK);		
	}
    } catch (x) {}
    try {
	if (CLI.TelnetShell.server) {
	    CLI.TelnetShell.server.close(BLCK);
	}
    } catch (x) {}
    try {
	Sonoran.cleanSheet(BLCK);
    } catch (x) {}

    var argv = [ "--motelet", motelet ];
    if (config) {
    	argv.push("--config");
    	argv.push(config);
    }
    IO.Process.restart(pipePath, argv);
    return;
};

/**
 * @private
 */
Sonoran.cleanSheet = function(/** DFLT_ASYNC_CB */callback) {
    if (BC.is(callback)) { return BC.exec(arguments.callee, this, arguments); }
    var conn = Saguaro.Connection.getConnection();
    if (conn) {
	conn.exit(function(result) {
	    if (result.code !== 0) {
		callback(new AOP.ERR("Destroying saguaro connections failed", result));
	    } else {
		try {
		    Sonoran.Registry.deregisterAllMotes();
		} catch (x) {
		    callback(Ex2ERR(ERR_GENERIC, x, "Cannot remove all existing motes"));
		    return;
		}
		callback(result);
	    }
	});
    } else {
	callback(new AOP.OK());
    }
};





// //
// //
// // Exported RMI items by Sonoran 
// //
// //
// RMI.exportItem("Sonoran.Resource.Motelets.start", true);
