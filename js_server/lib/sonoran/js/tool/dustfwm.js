#!mrsh

var TOOL = {};

TOOL.PROGNAME = "dustfwm";
TOOL.SEQUENTIAL = true;

TOOL.cleanTmpFiles = function () {
    // Clean up any temp files
    try {
	var tmpStuff = IO.FileUtils.find(this.FWDIR, new RegExp("^TMP-ESP-"), 1/*only search directory*/);
	tmpStuff.forEach(function (f) { IO.File.rm(f); });
    } catch (ex) {}
}

TOOL.exit = function (status) {
    TOOL.cleanTmpFiles();
    Runtime.exit(status);
}

TOOL.readAndRemove = function (file) {
    var t = "";
    if( IO.File.exists(file) ) {
	t = IO.File.readFully(file);
	IO.File.rm(file);
    }
    return t;
}

TOOL.makeFilename = function (args) {
    var sep = REPO_ROOT.match(/\\/) ? "\\" : "/";
    var fn = arguments[0];
    for( var i=1; i<arguments.length; i++ )
	fn += sep + arguments[i];
    return fn;
}


TOOL.dumpProcOut = function(blob) {
    printf(blob.pdata);
    flush();
}


TOOL.check = function () {
    this.BINDIR = TOOL.makeFilename(REPO_ROOT, ARCH_NAME=="cygwin" ? "win32" : ARCH_NAME, "bin");
    this.IORDX  = TOOL.makeFilename(this.BINDIR, "_iordx");
    this.FWDIR  = TOOL.makeFilename(REPO_ROOT, "firmware");

    TOOL.cleanTmpFiles();

    var ftcspiDll = IO.FileUtils.find(this.BINDIR, new RegExp("^ftcspi.dll$","i"), 1/*only search directory*/);
    if( ftcspiDll.length == 0 ) {
	printf("Mandatory FTDI DLL not installed. Please download FTCSPI.dll from\n"+
	       "ftdichip.com website and put it into the directory `%s'.\n"+
	       "To locate the DLL try this search query:\n"+
	       "   http://www.google.com/search?q=download%%20ftcspi%%20dll%%20site%%3A.ftdichip.com\n",
	       this.BINDIR);
	TOOL.exit(1);
    }
    var espProgs = IO.FileUtils.find(this.BINDIR, new RegExp("^ESP\.exe$","i"), 1/*only search directory*/).sort();
    if( espProgs.length == 0 ) {
	printf("ESP programming tool from DustNetworks is missing. Check the technical\n"+
	       "material for your development kit or check DustNetworks online information.\n"+
	       "The program ESP.exe is expected to be found in the directory:\n"+
	       "   %s\n",
	       this.BINDIR);
	TOOL.exit(1);
    }
    this.ESPEXE = espProgs[espProgs.length-1];
}

TOOL.findDefaultFirmware = function (pattern) {
    var fws = IO.FileUtils.find(this.FWDIR, new RegExp(pattern,"i"), /*only search directory*/1);
    if( fws.length == 0 ) {
	printf("%s: No firmware matching: %s\n", TOOL.PROGNAME, pattern);
	TOOL.exit(1);
    }
    // Assum the alphabetically last is the most recent one.
    var fw = fws[fws.length-1];
    if( fws.length > 1 ) {
	printf("(warning) Multiple matching firmware found:\n"+
	       "  %s (default)\n"+
	       "If you want to load a different version specify\n"+
	       "path to bin file explicitely.\n",
	       fws.join("\n  "));
    }
    return fw;
}

TOOL.printf = function (args) {
    if( this.dots != 0 ) {
	this.dots = 0;
	print("\n");
    }
    print(svprintf(arguments[0], 1, arguments));
}

TOOL.progress = function () {
    this.dots++;
    print(".");
    flush();
    this.timer = Timer.timeoutIn(1000, null, this.progress.bind(this));
}
TOOL.startProgress = function () {
    this.timer = Timer.timeoutIn(2000, null, this.progress.bind(this));
}

TOOL.stopProgress = function () {
    this.timer.cancel();
    this.timer = null;
}

TOOL.unique = 1;

TOOL.startEspTool2 = function (writeCmd, callback, procsArgs) {
    var self = this;
    var procResults = [];
    var failedCount = 0;
    var doneCount = 0;
    var procCount = procsArgs.length;

    var startProc = function (index) {
	var d = new Date().getTime();
	var outf = TOOL.makeFilename(self.FWDIR, sprintf("TMP-ESP-%d-out-%d", d, TOOL.unique));
	var errf = TOOL.makeFilename(self.FWDIR, sprintf("TMP-ESP-%d-err-%d", d, TOOL.unique));
	var args = procsArgs[index];
	TOOL.unique++;

	if( self.opts.xOpt.isSet() ) {
	    var xargs = self.opts.xargs.getArg().split(",");
	    args = xargs.concat(args);
	}
	args.unshift(self.ESPEXE);
	var execArgs = ["-", outf, errf].concat(args);

	if( self.opts.verboseOpt.isSet() || self.opts.cmdsOpt.isSet() ) 
	    self.printf("%s%s\n", args.join(" "), writeCmd && self.opts.cmdsOpt.isSet() ? " (not executed)" : "");
	if( self.opts.cmdsOpt.isSet() && writeCmd ) {
	    // Do not execute write commands if show-only
	    procResults[index] = {args: args,
				  out:  "",
				  err:  "",
				  exitcode: 0
				 };
	    if( ++doneCount == procCount ) {
		self.stopProgress();
		callback(failedCount, procResults);
		return;
	    }
	    if( TOOL.SEQUENTIAL )
		startProc(++index);
	} else {
	    IO.Process.start(self.IORDX, execArgs, function (obj) {
				 var out = TOOL.readAndRemove(outf);
				 var err = TOOL.readAndRemove(errf);
				 procResults[index] = {args: args,
						       out:  out,
						       err:  err,
						       exitcode: obj.pexitcode
						      };
				 if( obj.pexitcode != 0 || err != "") {
				     self.printf("%s%s\n"+
						 "%s: Failed to run program `%s': Exit code %d.\n",
						 out, err, TOOL.PROGNAME, self.ESPEXE, obj.pexitcode);
				     failedCount++;
				 }
				 if( ++doneCount == procCount ) {
				     self.stopProgress();
				     callback(failedCount, procResults);
				     return;
				 }
				 if( TOOL.SEQUENTIAL )
				     startProc(++index);
			     }, TOOL.dumpProcOut);
	}
    }
    this.startProgress();
    if( TOOL.SEQUENTIAL ) {
	startProc(0);
    } else {
	for( var i=0; i<procCount; i++ )
	    startProc(i);
    }
}


TOOL.listMotes = function (actionFunc) {
    var self = this;

    var procDone = function(failedCount, procResults) {
	if( failedCount != 0 )
	    TOOL.exit(1);
	var out = procResults[0].out;
	// Sample output
	//  locID[0] = 0x34321, devString = Quad RS232-HS A
	//  locID[1] = 0x344321, devString = Dust Huron A
	//  locID[2] = 0x344341, devString = Dust Huron A
	//  locID[3] = 0x34322, devString = Quad RS232-HS B
	//  locID[4] = 0x344322, devString = Dust Huron B
	//  locID[5] = 0x344342, devString = Dust Huron B
	//
	// Collect all location IDs of all devices ending with B
	var lines = out.split(/\r?\n/);
	self.foundMotes = [];
	self.filteredMotes = [];
	var moteid = self.opts.moteid.getArg();
	var exclid = self.opts.exclude.getArg();

	for( var i=0; i<lines.length; i++ ) {
	    var md = lines[i].match(/locID\[\d+\] = 0x([0-9A-Fa-f]+), devString = (.*B$)/);
	    if( md ) {
		var obj = {locid:md[1], name:md[2], remark:""};
		if( exclid == md[1] ) {
		    obj.remark += "(excluded)";
		}
		else if( moteid == md[1] ) {
		    obj.remark = "(selected)";
		    self.filteredMotes.push(obj);
		}
		else if( moteid == null ) {
		    self.filteredMotes.push(obj);
		}
		if( md[2] == "Quad RS232-HS B" ) {
		    // Very old motes
		    obj.remark += " requires: -x \"-t,4\"";
		}
		self.foundMotes.push(obj);
	    }
	}
	if( self.foundMotes.length == 0 ) {
	    printf("%s: No DustNetworks motes found.\n", TOOL.PROGNAME);
	    TOOL.exit(1);
	}
	if( self.filteredMotes.length == 0 ) {
	    printf("%s: No eligible DustNetworks motes found.\n", TOOL.PROGNAME);
	    TOOL.exit(1);
	}
	if( actionFunc == null || self.opts.verboseOpt.isSet() ) {
	    // Default action is to list all motes
	    var nmotes = self.foundMotes.length;
	    var text = sprintf("Found %d motes:\n", nmotes);
	    for( var i=0; i<nmotes; i++ ) {
		var m = self.foundMotes[i];
		text += sprintf("%10s : %s %s\n", m.locid, m.name, m.remark);
	    }
	    self.printf("%s", text)
	    if( actionFunc == null ) {
		self.printf("Before flashing Mote Runner firmware consider backup of original firmware.\n"+
			    "To start flashing specify the keyword `mr' or a specific firmware image file.\n");
		TOOL.exit(0);
	    }
	}
	actionFunc();
    }
    this.startEspTool2(false, procDone, [["-l"]]);
}

TOOL.backupMotes = function () {
    var self = this;
    var files = [];
    var evalFlashMem = function (failedCount, procResults) {
	if( failedCount ) {
	    for( var i=0; i<files.length; i++ ) {
		var file = files[i];
		if( IO.File.exists(file) ) {
		    IO.File.rm(file);
		}
	    }
	    self.printf("%s: Backup failed! Failed to read flash of %s motes.\n",
			TOOL.PROGNAME, failedCount==files.length ? "all" : "some");
	    TOOL.exit(1);
	}
	for( var i=0; i<files.length; i++ ) {
	    var file = files[i];
	    var flashmem = IO.File.readFully(file);
	    // Find EUI-64 in flash: 00-17-0d-..  is DustNetworks prefix
	    if( !(md = flashmem.match(/1mote\.cfg\x00\x00\x00\x08\x08(\x00\x17\x0d.....)/)) ) {
		self.printf("Cannot backup mote locid=%s: Cannot find EUI-64 in flash.\n", self.filteredMotes[i].locid);
		IO.File.rm(file);
	    }
	    else {
		var eui64 = sprintf("%H", md[1]);
		var newfile = TOOL.makeFilename(self.FWDIR, "dust-"+eui64+".bin");
		if( IO.File.exists(newfile) ) {
		    self.printf("Mote locid=%s already backed up - file exists: %s\n", self.filteredMotes[i].locid, newfile);
		    IO.File.rm(file);
		} else {
		    IO.File.cp(file, newfile);
		    IO.File.rm(file);
		    self.printf("Mote locid=%s backed up: %s\n", self.filteredMotes[i].locid, newfile);
		}
	    }
	}
	TOOL.exit(0);
    }
    var listedMotesFunc = function () {
	backupProcs = [];
	for( var i=0; i<self.filteredMotes.length; i++ ) {
	    var locid = self.filteredMotes[i].locid;
	    var file = TOOL.makeFilename(self.FWDIR, "dust-locid-"+locid+".bin");
	    var args = ["-i", locid, "-r", file];
	    files.push(file);
	    backupProcs.push(args);
	}
	self.startEspTool2(false, evalFlashMem, backupProcs);
    }
    this.listMotes(listedMotesFunc);
}

TOOL.restoreMotes = function () {
    var self = this;
    var files = [];
    var restoreDone = function (failedCount, procResults) {
	var nmotes = self.filteredMotes.length;
	if( failedCount!=0 || procResults.length < nmotes ) {
	    self.printf("Restore failed for %d out of %d motes.\n", failedCount, nmotes);
	    TOOL.exit(5);
	} else {
	    self.printf("All %d motes restored successfully.\n", nmotes);
	    TOOL.exit(0);
	}
    }
    var evalFlashMem = function (failedCount, procResults) {
	if( failedCount ) {
	    for( var i=0; i<files.length; i++ ) {
		var file = files[i];
		if( IO.File.exists(file) ) {
		    IO.File.rm(file);
		}
	    }
	    self.printf("%s: Restore failed! Failed to read flash of %s motes.\n",
			TOOL.PROGNAME, failedCount==files.length ? "all" : "some");
	    TOOL.exit(1);
	}
	var restoreProcs = [];
	for( var i=0; i<files.length; i++ ) {
	    var file = files[i];
	    var locid = self.filteredMotes[i].locid;
	    var flashmem = TOOL.readAndRemove(file);
	    // Find EUI-64 in flash: 00-17-0d-..  is DustNetworks prefix
	    if( !(md = flashmem.match(/1mote\.cfg\x00\x00\x00\x08\x08(\x00\x17\x0d.....)/)) ) {
		self.printf("Cannot restore mote locid=%s: Unable to determine EUI-64 from current flash contents.\n", locid);
	    }
	    else {
		var eui64 = sprintf("%H", md[1]);
		var backupfile = TOOL.makeFilename(self.FWDIR, "dust-"+eui64+".bin");
		if( !IO.File.exists(backupfile) ) {
		    self.printf("No backup found for mote locid=%s - file missing: %s\n", locid, backupfile);
		} else {
		    restoreProcs.push(["-i", locid, "-P", backupfile, "0"]);
		}
	    }
	}
	self.eraseMotes(function () { self.startEspTool2(true, restoreDone, restoreProcs); });
    }
    var listedMotesFunc = function () {
	var dumpProcs = [];
	for( var i=0; i<self.filteredMotes.length; i++ ) {
	    var locid = self.filteredMotes[i].locid;
	    var file = TOOL.makeFilename(self.FWDIR, "TMP-ESP-"+locid+".bin");
	    var args = ["-i", locid, "-R", file, "40000", "36800"];
	    files.push(file);
	    dumpProcs.push(args);
	}
	self.startEspTool2(false, evalFlashMem, dumpProcs);
    }
    this.listMotes(listedMotesFunc);
}

TOOL.eraseMotes = function (afterEraseFunc) {
    var self = this;
    var eraseDone = function (failedCount, procResults) {
	var nmotes = self.filteredMotes.length;
	if( failedCount!=0 || procResults.length < nmotes ) {
	    self.printf("Flash erase failed for %d out of %d motes.\n", failedCount, nmotes);
	    TOOL.exit(7);
	}
	afterEraseFunc();
    }
    var eraseProcs = [];
    for( var i=0; i<self.filteredMotes.length; i++ ) {
	var mote = self.filteredMotes[i];
	eraseProcs.push(["-i", mote.locid, "-E"]);
    }
    self.startEspTool2(true, eraseDone, eraseProcs);
}

TOOL.flashImage = function (allMode, imageFile) {
    var self = this;
    var imageSansFuses = null;
    var imageFiles = null;
    var flashDone = function (failedCount, procResults) {
	var nmotes = self.filteredMotes.length;
	if( failedCount!=0 || procResults.length < nmotes ) {
	    self.printf("Flashing failed for %d out of %d motes.\n", failedCount, nmotes);
	    TOOL.exit(7);
	}
	self.printf("All %d motes flashed successfully.\n", nmotes);
	TOOL.exit(0);
    }
    var eraseDone = function () {
	var flashProcs = [];
	for( var i=0; i<self.filteredMotes.length; i++ ) {
	    var mote = self.filteredMotes[i];
	    flashProcs.push(allMode
			    ? ["-i", mote.locid, "-P", imageFile, "0"]
			    : ["-i", mote.locid, "-P", imageFile, "800"]);
	}
	self.startEspTool2(true, flashDone, flashProcs);
    }
    var listedMotesFunc = function () {
	self.eraseMotes(eraseDone);
    }
    this.listMotes(listedMotesFunc);
}


TOOL.init = function (argv) {
    this.dots = 0;

    this.opts = {   CMD:  null };
    this.opts.helpOpt      = new GetOpt.HelpOpt();
    this.opts.verboseOpt   = new GetOpt.Option('v', '--verbose', 0, null,
					       "Display the command lines of the underlying ESP\n"+
					       "tool invocations.", null);
    this.opts.cmdsOpt      = new GetOpt.Option('s', '--show-cmds', 0, null,
					       "Show the intended modifying actions but do not run them.\n"+
					       "The firmware of the motes is not modified.", null);
    this.opts.exclude      = new GetOpt.Simple('locid',
					       "Exclude this mote from processing. This is useful to avoid\n"+
					       "flashing the manager mote which must not carry Mote Runner firmware.\n");
    this.opts.excludeOpt   = new GetOpt.Option('e', '--exclude', 0, null, null, this.opts.exclude);
    this.opts.moteid       = new GetOpt.Simple('locid',
					       "Flash only this mote. This is useful to load firmware on a\n"+
					       "single mote excluding any other candidates.\n");
    this.opts.moteidOpt    = new GetOpt.Option('m', '--mote', 0, null, null, this.opts.moteid);
    this.opts.xargs        = new GetOpt.Simple('args,..',
					       "Extra arguments, comma separated, for ESP tool.");
    this.opts.xOpt         = new GetOpt.Option('x', '--extra', 0, null, null, this.opts.xargs);
    this.opts.imageFile    = new GetOpt.Simple('mr|backup|restore|image-file',
					       "The binary image file to be flashed. If one of the following keywords\n"+
					       "is specified then find the most recent firmware in the Mote Runner\n"+
					       "installation:\n"+
					       "  mr         : Mote Runner firmware\n"+
					       "  backup     : backup firmware images\n"+
					       "  restore    : restore original firmware images\n"+
					       "If this argument does not specifiy one of the keywords above\n"+
					       "it must name a specific firmware file.\n");
    this.opts.argSpec      = new GetOpt.Seq(
	[ new GetOpt.OptionSet([ this.opts.helpOpt,
				 this.opts.verboseOpt,
				 this.opts.cmdsOpt,
				 this.opts.excludeOpt,
				 this.opts.moteidOpt,
				 this.opts.xOpt
			       ]),
	  this.opts.imageFile ], 1);
    this.opts.CMD = new GetOpt.Cmd(TOOL.PROGNAME, this.opts.argSpec,
				   "Without arguments display motes and useful information.\n"+
			           "Otherwise perform the action requested by the command keyword.\n");
    if( !this.opts.CMD.parse(argv) ) {
	TOOL.exit(12);
    }

    if( this.opts.moteidOpt.isSet() && this.opts.excludeOpt.isSet() && this.opts.moteid.getArg()==this.opts.exclude.getArg() ) {
	this.printf("%s: Conflicting options: -e/-m applied to same location id.\n", TOOL.PROGNAME);
	TOOL.exit(1);
    }

    if( this.opts.argSpec.argsPresent() <= 1 ) {
	this.listMotes(null);
	return;
    }
    var keyword = this.opts.imageFile.getArg();
    if( keyword == "backup" ) {
	TOOL.backupMotes();
	return;
    }
    else if( keyword == "restore" ) {
	TOOL.restoreMotes();
	return;
    }
    else if( keyword == "mr" ) {
	this.IMAGE = TOOL.findDefaultFirmware("^dust-mr-.*\\.bin$");
    } else {
	this.IMAGE = keyword;
	if( !IO.File.exists(this.IMAGE) ) {
	    this.printf("%s: No such file: %s\n", TOOL.PROGNAME, this.IMAGE);
	    TOOL.exit(1);
	}
    }
    var size = IO.File.stat(this.IMAGE).size;
    if( size != 0x80000 && size != 0x80000-0x800 ) {
	this.printf("%s: Strange image file `%s': Does not have an expected size (510KiB or 512KiB)\n",
		    TOOL.PROGNAME, this.IMAGE);
	TOOL.exit(1);
    }
    this.flashImage(size==0x80000, this.IMAGE);
    return;
};

TOOL.check();
TOOL.init(ARGV);
