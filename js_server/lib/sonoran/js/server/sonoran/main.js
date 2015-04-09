Runtime.include("./sonoran.js");



/**
 * The main function to start shell, server or sonoran script..
 * @private
 */
Sonoran.main = function() {
    var params =  {
	restricted: false,
	http: true,
	telnet: false, 
	daemon: false,
	interactive: true,
	lip: true,
	motelet: null,
	config: null,
	progname: null,
	client: false,
	ssl: false
    };

    var httpPortSpec = new GetOpt.Number("port", "HTTP server port.", null, null);
    httpPortSpec.setRange(5000, 1, 65535);
    var httpPortOpt = new GetOpt.Option(null, "--http-port", 0, null, "HTTP server port.", httpPortSpec);
    var clientOpt = new GetOpt.Option("C", "--client-mode", 0, null, "No server ports.");
    var restrictedOpt = new GetOpt.Option(null, "--restricted", 0, null, "Require web login.");
    var telnetOpt = new GetOpt.Option(null, "--telnet", 0, null, "Start telnet server.");
    var noHttpOpt = new GetOpt.Option(null, "--no-http", 0, null, "No http server.");
    var noLipOpt = new GetOpt.Option(null, "--no-lip", 0, null, "Do not link lip dll.");
    var sslOpt = new GetOpt.Option(null, "--ssl", 0, null, "Support server-side ssl.");
    var daemonOpt = new GetOpt.Option("d", "--daemon", 0, null, "Dont expect script, start telnet and http server.");
    var interactiveOpt = new GetOpt.Option("i", "--interactive", 0, null, "Drop into a shell after having sourced any files.");
    var modules = [ "ALL" ].concat(Logger.getModules());
    var severities = Logger.SEVERITIES;
    var moteletSpec = new GetOpt.Simple("motelet");
    var moteletOpt = new GetOpt.Option("m", "--motelet", 0, null, "Name of motelet to activate immediately.", moteletSpec);
    var configSpec = new GetOpt.Simple("motelet-config");
    var configOpt = new GetOpt.Option("c", "--config", 0, null, "Name of motelet config to activate immediately.", configSpec);
    var modSpec = new GetOpt.Keywords("module", "Module name: " + modules.join(','), modules, null, GetOpt.IGNORE_CASE);
    var sevSpec = new GetOpt.Keywords("severity", "Severity name: " + severities.join(','), severities, null, GetOpt.IGNORE_CASE);
    var logSeq = new GetOpt.Seq([ modSpec, sevSpec ], 2);
    var logOpt = new GetOpt.Option("l", "--logging", 0, null, "Log module and severities(dumped in non-interactive mode/logged in interactive mode).", logSeq);
    var helpOpt = new GetOpt.HelpOpt();
    var optSet = new GetOpt.OptionSet([ helpOpt, telnetOpt, noHttpOpt, httpPortOpt, clientOpt, restrictedOpt, noLipOpt, daemonOpt, sslOpt, interactiveOpt, logOpt, moteletOpt, configOpt ]);
    var restOfArgs = new GetOpt.RestOfArgs("[script.js [script-args]]",
					   "Script name (suffix .js may be omitted). Items following\n" +
					   "script name are along to script as it arguments.");
    var cmd  = new GetOpt.Cmd(PROG_NAME, new GetOpt.Seq([ optSet, restOfArgs ]), "Start sonoran");
    if( !cmd.parse(ARGV) ) {
	//QUACK(0, "PARSE ERROR:..");
	Runtime.exit(1);
    }

    if (logOpt.isSet()) {
	var opts = logOpt.getState();
        var ldescr = [];
	for (var i = 0; i < opts.length; i++) {
	    //QUACK(0, "OPT: " + Util.formatData(opts[i]));
            var modname = opts[i].paramState[0].arg;
            var sevname = opts[i].paramState[1].arg;
	    ldescr.push(modname, sevname);
        }
	//QUACK(0, "LDESCR: " + Util.formatData(ldescr));
	Logger.setLogLevels(ldescr, function(x){});
    }

    if (moteletOpt.isSet()) {
	if (noHttpOpt.isSet()) {
	    throw "Motelet option requires an HTTP server.";
	}
	params.motelet = moteletSpec.getArg();
	if (configOpt.isSet()) {
	    params.config = configSpec.getArg();
	}
    }

    params.http = !noHttpOpt.isSet();
    params.telnet = telnetOpt.isSet();
    params.daemon = daemonOpt.isSet();
    params.interactive = interactiveOpt.isSet();
    params.lip = !noLipOpt.isSet();
    params.ssl = sslOpt.isSet();
    params.restricted = restrictedOpt.isSet();
    if (params.restricted) {
	params.telnet = false;
    }
    params.client = clientOpt.isSet();
    if (params.client) {
	params.http = false;
	params.telnet = false;
    }

    ARGV = restOfArgs.getRestArgs();    
    
    params.progname = (PROG_NAME.replace(/\.exe$/, "")).replace(/^_/, "");   // -> mrsh or sonoran
    if (params.daemon && params.interactive) {
	println("Contradicting 'daemon' and 'interactive' mode.");
	Runtime.exit(1);
    }
    
    if (params.lip) {
        try {
	    Sonoran.LIP.init(); 
        } catch (x) {
	    var msg = "Cannot load LIP dll: " + x;
	    QUACK(0, msg);
            Runtime.exit(1);
	}
    }

    if (params.telnet) {
	//QUACK(0, "START telnet..");
        var result = CLI.TelnetShell.install(null, SCB);
	if (result.code != 0) {
	    println("WARN: Installation of the telnet server failed: " + result.toString());
	    println("WARN: Another instance running?");
	    params.http = false;
	    params.motelet = false;
	} 
    }

    if (params.http) {
	if (Win32.runOnWindows()) {
	    try {
		Process.Mutex.lock("Sonoran-"+Oasis.httpPort);
	    } catch(x) {
		println("WARN: Could not create process mutex: " + x);
		println("WARN: Another instance running?");
		params.http = false;
		params.motelet = false;
	    }
	}
	try {
	    var options = new HTTP.Server.Options(); 
	    options.loginRequired = params.restricted;
	    options.useSSL = params.ssl;
	    if (httpPortOpt.isSet()) {
		Oasis.httpPort = httpPortSpec.getNumber();
	    }
	    Oasis.start(options);
	} catch (x) {
	    println(Runtime.dumpException(x));
	    println("WARN: Installation of the http server failed: " + x);
	}
    }

    var motelet = params.motelet;
    if (motelet) {
	if (!params.http) {
	    throw "Cannot start motelet with http/oasis disabled!";
	}
	var result = Sonoran.Resource.Motelets.start(motelet, params.config, SCB);
	if (result.code !== 0) {
	    QUACK(0, "WARN: Starting motelet failed: " + result);
	}
    }


    if (params.daemon) { // start in daemon mode
	if (ARGV.length > 0) {
	    println("Ignoring parameters in daemon mode supported. Use option -h/--help for help.");
        }
	println("HTTP PORT:    " + Oasis.httpPort);
	return;
    };
    
    Core.run(params.interactive, (params.progname==="mrsh"));
};




Sonoran.main();
