//  (C) COPYRIGHT INTERNATIONAL BUSINESS MACHINES CORPORATION 2012-2012
//                       ALL RIGHTS RESERVED
//        IBM Research Division, Zurich Research Laboratory
// --------------------------------------------------------------------

/**
 * @namespace CLI.MRShell 
 * @private
 */
CLI.MRShell = {};


// Build special response for mrshell in web browser.
CLI.MRShell.mrshellAOP = function (data, shell) {
    assert(shell);
    if (shell.mrshellAOP) {
	// web shell has that method (Channels.CLIShell)
	return shell.mrshellAOP(data);
    } else {
	println("Shell: ignoring mrshell-related command!");
	return new AOP.OK(data);
    }
};

/**
 *  @class 
 * @constructor
 * @private
 */
CLI.MRShell.SourceCommand = function(/** CLI.Shell */shell, /** String */name) {
    this.description =
	"Source a moterunner or javscript script. The name of the script must end in .js or .mrsh. If\n" +
	"file is given without suffix, the command first looks for the javascript and then for the\n" +
	"mrsh variant. One can specify an absolute path or relative path to the current working \n" +
	"directory.";
    this.verboseOpt = new GetOpt.Option("v", "--verbose", 0, null, "Verbose execution.");
    this.restOfArgs = new GetOpt.RestOfArgs("paras", "Script parameters if script is Javascript.");
    var optSet = new GetOpt.OptionSet([ this.verboseOpt ]); 
    this.fileSpec = new GetOpt.Simple("script");
    CLI.Command.call(this, shell, name, [ optSet, this.fileSpec, this.restOfArgs ]);
};

/** @private */
CLI.MRShell.SourceCommand.prototype = extend(
    CLI.Command.prototype,
    {
       /** @ignore */
	exec: function(callback) {
	    var filename = this.fileSpec.getArg();
	    var contents = null;
	    try {
		contents = IO.File.readFully(filename);
	    } catch (ex) {
		var dirname = IO.File.dirname(filename);
		if( !IO.File.isDir(dirname) )
		    callback(new AOP.ERR(ERR_GENERIC, "Cannot open/create file: "+filename));
	    }
            callback(CLI.MRShell.mrshellAOP({cmd:      "mrshell-source", filename: filename, contents: contents}, this.shell));
	}
    }
);


/**
 * @class 
 * @constructor
 * @private
 */
CLI.MRShell.setTitleCommand = function(/** CLI.Shell */shell, /** String */name) {
    this.description = ("Set window title. This command only works \n"+
			"in the web based shell front end 'mrshell'.");
    this.titleSpec = new GetOpt.Simple("string", "Name of window title.");
    CLI.Command.call(this, shell, name, [ this.titleSpec, new GetOpt.EndOfArgs() ]);
};

/** @private */
CLI.MRShell.setTitleCommand.prototype = extend(
   CLI.Command.prototype,
   {
       /** @ignore */
       exec: function (callback) {
           callback(CLI.MRShell.mrshellAOP({cmd:    "mrshell-set-title", title:  this.titleSpec.getArg()}, this.shell));
       }
   }
);

/**
 * @class 
 * @constructor
 * @private
 */
CLI.MRShell.editCommand = function(/** CLI.Shell */shell, /** String */name) {
    this.description = ("Edit specified file. This command only works \n"+
			"in the web based shell front end 'mrshell'.");
    this.fileSpec = new GetOpt.Simple("file", "Name of file to edit.");
    CLI.Command.call(this, shell, name, [ this.fileSpec, new GetOpt.EndOfArgs() ]);
};

/** @private */
CLI.MRShell.editCommand.prototype = extend(
   CLI.Command.prototype,
   {
       /** @ignore */
       exec: function (callback) {
	   var filename = this.fileSpec.getArg();
	   var contents = null;
	   try {
	       contents = IO.File.readFully(filename);
	   } catch (ex) {
	       var dirname = IO.File.dirname(filename);
	       if( !IO.File.isDir(dirname) )
		   callback(new AOP.ERR(ERR_GENERIC, "Cannot open/create file: "+filename));
	   }
           callback(CLI.MRShell.mrshellAOP({cmd: "mrshell-edit", filename: filename, contents: contents}, this.shell));
       }
   }
);

/**
 * @class 
 * @constructor
 * @private
 */
CLI.MRShell.widgetCommand = function(/** CLI.Shell */shell, /** String */name) {
    this.description = ("Start a widget to display additional live information of\n"+
			"simulated or real motes. This command only works \n"+
			"in the web based shell front end 'mrshell'.");
    this.nameSpec = new GetOpt.Simple("name|?",
				      "Name of the widget. If ? is specified then list\n"+
				      "all available widgets.");
    this.restOfArgs = new GetOpt.RestOfArgs("arguments", "Arguments supplied to the widget.");
    
    CLI.Command.call(this, shell, name, [ this.nameSpec, this.restOfArgs ]);
};

/** @private */
CLI.MRShell.widgetCommand.prototype = extend(
    CLI.Command.prototype,
    {
	/** @ignore */
       exec: function (callback) {
	   var name = this.nameSpec.getArg();
	   if( name == "?" ) {
	       var list = IO.FileUtils.listDir("~mr/lib/web", /^widget-.+/, false);
	       if( list.length==0 ) {
		   callback(new AOP.ERR("No widgets available"));
		   return;
	       }
	       for( var i=0; i<list.length; i++ )
		   list[i] = list[i].replace("widget-","");
               callback(new AOP.OK(list.join("\n")));
	       return;
	   }
	   if( name.indexOf("/") >= 0 || 
	       name.indexOf("\\") >= 0 || 
	       !IO.File.isDir("~mr/lib/web/widget-"+name) ) {
	       callback(new AOP.ERR(ERR_GENERIC, "Not a valid widget name: "+name));
	       return;
	   }
           callback(CLI.MRShell.mrshellAOP({cmd:  "mrshell-widget", name: name, uri:  "/web/widget-"+name+"/index.html", args: this.restOfArgs.getRestArgs()}, this.shell));
       }
   }
);

/**
 * @class 
 * @constructor
 * @private
 */
CLI.MRShell.clearScriptCommand = function(/** CLI.Shell */shell, /** String */name) {
    this.description = ("Clear preview of next script commands. This command\n"+
			"only works in the web based shell front end 'mrshell'.");
    CLI.Command.call(this, shell, name, [ new GetOpt.EndOfArgs() ]);
};

/** @private */
CLI.MRShell.clearScriptCommand.prototype = extend(
   CLI.Command.prototype,
   {
       /** @ignore */
       exec: function (callback) {
           callback(CLI.MRShell.mrshellAOP({cmd: "mrshell-clear-script"}, this.shell));
       }
   }
);



/**
 * @class 
 * @constructor
 * @private
 */
CLI.MRShell.uploadFileCommand = function(/** CLI.Shell */shell, /** String */name) {
    this.description = ("Upload the specified local file(s) to a remote mrsh server (in its current working directory).\n" +
			"This command only works in the web based shell front end 'mrshell'.");
    CLI.Command.call(this, shell, name, [ new GetOpt.EndOfArgs() ]);
};

/** @private */
CLI.MRShell.uploadFileCommand.prototype = extend(
   CLI.Command.prototype,
   {
       /** @ignore */
       exec: function (callback) {
           callback(CLI.MRShell.mrshellAOP({cmd: "mrshell-upload-file"}, this.shell));
       }
   }
);

/**
 * @class 
 * @constructor
 * @private
 */
CLI.MRShell.downloadFileCommand = function(/** CLI.Shell */shell, /** String */name) {
    this.description = ("Download a remote file from a remote mrsh server to the specified local directory.\n" + 
			"This command only works in the web based shell front end 'mrshell'.");
    CLI.Command.call(this, shell, name, [ new GetOpt.EndOfArgs() ]);
};

/** @private */
CLI.MRShell.downloadFileCommand.prototype = extend(
   CLI.Command.prototype,
   {
       /** @ignore */
       exec: function (callback) {

           var dir = IO.File.getcwd();
           if (!IO.File.isDir(dir)) {
               callback(new AOP.ERR("No such directory: " + dir));
               return;
           }
           var filenames = IO.File.listDir(dir);
           var table = new Util.Formatter.Table2(1);
           table.setTitle("Download Link");
           for (var i = 0; i < filenames.length; i++) {
               var path = dir + '/' + filenames[i];
	       var idx = path.indexOf("examples"); // for now restrict the download to the examples folder
	       if (idx < 0)
		   continue;
	       var name = path.substr(idx);
	       var fname = sprintf("<a href='/%s' download='%s' target='_blank'>%s</a>",name,name,name,name);
	       table.setValue(0, i, fname);
           }
	   var result = table.render().join("\n");
           callback(CLI.MRShell.mrshellAOP({cmd: "mrshell-download-file", links:result}, this.shell));
       }
   }
);


CLI.commandFactory.addModule("CLI.MRShell");
