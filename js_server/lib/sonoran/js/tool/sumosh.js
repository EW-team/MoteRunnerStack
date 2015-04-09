Runtime.include("server/dbi/sqlite3/sqlite3.js");

Sumosh = {
    main: function() {
	var helpOpt = new GetOpt.HelpOpt();
	var optSet = new GetOpt.OptionSet([ helpOpt ]);
	var roa = new GetOpt.RestOfArgs("[script.js [script-args]]",
	    "Script name (suffix .js may be omitted). Items following\n" +
	    "script name are along to script as it arguments.");
	var cmd  = new GetOpt.Cmd(PROG_NAME, new GetOpt.Seq([ optSet, roa ]), "Start sqlite3 sumosh");
	if( !cmd.parse(ARGV) ) {
	    Runtime.exit(1);
	}

	ARGV = roa.getRestArgs();    
	Core.run(true);
    }
};



Sumosh.main();
