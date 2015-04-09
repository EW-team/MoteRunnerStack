#!sonoran

Runtime.include("server/sonoran/sonoran.js");
Runtime.include("tool/mib520eeprom.js");


var TOOL = {};

// format used to print the main results of tools
var FORMAT = "%-25s > %-40s\n";

TOOL.FUSE_CONFIG = {
    dbg:   { hfuse: 0x18, lfuse:0xFF, efuse:0xFF },
    prod:  { hfuse: 0xD8, lfuse:0xFF, efuse:0xFF },
    portf: { hfuse: 0xD8, lfuse:0xFF, efuse:0xFF }
};

TOOL.init = function (argv) {

    this.opts = {   CMD:  null };
    this.opts.helpOpt      = new GetOpt.HelpOpt();
    this.opts.hfuse        = new GetOpt.Number('0xHH', 'High fuse setting.');
    this.opts.hfuseOpt     = new GetOpt.Option('H', '--hfuse', 0, null, null, this.opts.hfuse);
    this.opts.lfuse        = new GetOpt.Number('0xHH', 'Low fuse setting.');
    this.opts.lfuseOpt     = new GetOpt.Option('L', '--lfuse', 0, null, null, this.opts.lfuse);
    this.opts.efuse        = new GetOpt.Number('0xHH', 'Extended fuse setting.');
    this.opts.efuseOpt     = new GetOpt.Option('E', '--efuse', 0, null, null, this.opts.efuse);
    this.opts.fuse         = new GetOpt.Keywords(null,
						 "Choose explicit fuse configuration. Overrides\n"+
						 "default guessed from image filename.",
						 ['dbg','prod','portf']);
    this.opts.fuseOpt      = new GetOpt.Option('f', '--fuse', 0, null, null, this.opts.fuse);
    this.opts.rfuseOpt     = new GetOpt.Option('r', '--rfuse', 0, null, "Read fuse settings (resets mote).");
    this.opts.eui          = new GetOpt.Simple('HH-HH-HH-HH-HH-HH-HH-HH',
					       'Specify a new mote 64-bit EUI using BIG endian. If not specified the EUI is retained.\n'+
					       'If less than 8 bytes specified, the highest byte is set to "02" and the rest if filled with "00".\n'+
					       'For multiple motes a comma sepparated list can be used or a start address which is incremented by 1.\n'+
					       'Example: BB-AA --- is auto-filled with 02-00-00-00-00-00-BB-AA\n'+
    					       'Example: 02-00-00-00-44-33-22-11 --- left unchanged\n'+
        				       'Example: 11,22,33 --- address for 3 motes, expanded as shown above\n');
    this.opts.euiOpt       = new GetOpt.Option('e', '--eui', 0, null, null, this.opts.eui);
    this.opts.baud       = new GetOpt.Keywords(null,
    						 "Choose serial baud profile.",
    						 ['0','1','2']);
    this.opts.baudOpt      = new GetOpt.Option('b','--baud',0,null,null,this.opts.baud);
    this.opts.conn         = new GetOpt.Keywords(null,
						 "Choose a connectivity mode.",
						 ['auto','wired','wireless']);
    this.opts.connOpt      = new GetOpt.Option('c','--connectivity',0,null,null,this.opts.conn);
    this.opts.hwPort       = new GetOpt.Simple('port',
					       "The name of the serial port used for programming or\n"+
					       "or a comma separated list of ports.");
    this.opts.imageFile    = new GetOpt.Simple('image',
					       "The hex image file to be loaded.\n"+
					       "Use filename '-' to avoid burning an image.\n"+
					       "In this case only fuses, EUI, and serial profile are flashed.");
    this.opts.verboseOpt = new GetOpt.Option('v', '--verbose', 0, "--verbose", "Verbose output of individual steps and commands.", null);
    this.opts.defaultOpt = new GetOpt.Option('d', '--default', 0, "--default", "Write a default EEPROM", null);

    this.opts.argSpec      = new GetOpt.Seq(
	[ new GetOpt.OptionSet([ this.opts.helpOpt,
				 this.opts.rfuseOpt,
				 this.opts.hfuseOpt,
				 this.opts.lfuseOpt,
				 this.opts.efuseOpt,
				 this.opts.fuseOpt,
				 this.opts.euiOpt,
				 this.opts.connOpt,
				 this.opts.baudOpt,
				 this.opts.defaultOpt,
				 this.opts.verboseOpt

			       ]),
	  this.opts.hwPort,
	  this.opts.imageFile ], 1);
    this.opts.CMD = new GetOpt.Cmd("mib510", this.opts.argSpec,
			           "Write Mote Runner firmware via MIB510 and MIB520 programming boards\n"+
			           "onto an IRIS mote. Specific the COM port and the hex image\n"+
				   "to be written. Optionally select a fuse configuration.\n"+
				   "Default fuse settings will be derived from the image filename.\n"+
				   "The image file name is checked for the following substrings:\n"+
				   "   dbg:    JTAG enabled\n"+
				   "   prod:   no JTAG enabled\n"+
				   "   portf:  no JTAG enabled\n"+
			           "The default settings can be overriden with fuse options.\n");
    if( !this.opts.CMD.parse(argv) ) {
	Runtime.exit(12);
    }

    var na = this.opts.argSpec.argsPresent();
    if( na <= 1 ) {
        try {
	    Sonoran.LIP.init();
        } catch (x) {
	    printf("Cannot load LIP dll: " + x);
	    Runtime.exit(1);
        }
        var ports = Sonoran.LIP.enumerateHWPORTS();
	if( ports.serial.length==0 ) {
	    printf("No serial ports specified.\nUnable to enumerate or find any eligible serial ports.");
	} else {
            var serial = ports.serial;
	    printf("No serial ports specified.\nAll available serial ports:\n  %s\n", serial.join("\n  "));
            var filt = Sonoran.LIP.filterPorts(ports.serial, "MIB520-FLASH");
            printf("Suggested ports for flashing:\n  %s\n", filt.join(","));
	}
    }
    if( na <= 2 && !this.opts.rfuseOpt.isSet() ) {
	printf("No image specified.\n");
	var b = IO.FileUtils.listDir(".", new RegExp("^build-"));
	if( b.length > 0 ) {
	    var images = [];
	    for( var bi=0; bi<b.length; bi++ ) {
		var bid = IO.FileUtils.listDir(b[bi], new RegExp("^image[.]hex$"));
		for( var bidi=0; bidi<bid.length; bidi++ ) {
		    images.push(bid[bidi]);
		}
	    }
	    if( images.length > 0 ) {
		printf("Found the following images:\n  %s\n", images.join("\n  "));
	    }
	}
	Runtime.exit(1);
    }

    // Check which avrdude is installed, both executable and configuration should be in bin directory
    this.MRBINDIR = REPO_ROOT+"/"+ARCH_NAME+"/bin";
    var adudes = IO.FileUtils.find(this.MRBINDIR, new RegExp("^avrdude[.]conf$"), 1/*only search directory*/);
    if (adudes.length == 0){
	printf("! [avrdude.conf] not found in Mote Runner bin directory !\n\n");
	printf("Please copy the [avrdude.conf] configuration file to \n%s\n\n", this.MRBINDIR);
	printf("Check the Mote Runner documentation for firmware installation prerequisites.");
	Runtime.exit(2);
    }
    var adudes = IO.FileUtils.find(this.MRBINDIR, new RegExp("^avrdude([.]exe)?$"), 1/*only search directory*/);
    if (adudes.length == 0){
	printf("! [avrdude] not found in Mote Runner bin directory !\n\n");
	printf("Please copy the [avrdude] executable to \n%s\n\n", this.MRBINDIR);
	printf("Check the Mote Runner documentation for firmware installation prerequisites.");
	Runtime.exit(2);
    }

    this.XARCH = ARCH_NAME=="cygwin" ? "win32" : ARCH_NAME;
    this.avrdude = REPO_ROOT+"/"+this.XARCH+"/bin/avrdude";

    this.comPorts = this.opts.hwPort.getArg().split(',');
    printf("%s\n",this.comPorts);

    // convert COM ports to format supported by avrdude
    for( var ci=0; ci<this.comPorts.length; ci++ ) {
	var comPort = this.comPorts[ci];
	if( /^COM\d\d+$/.test(comPort) ) {
	    // avrdude cannot cope with COMdd - need a path prefix.
	    this.comPorts[ci] = "//./"+comPort;
	}
	else if( /^ttyUSB/.test(comPort) ) {
	    // Convenience for Linux
	    this.comPorts[ci] = "/dev/"+comPort;
	}
    }

    // Simply read fuses
    if( this.opts.rfuseOpt.isSet() ) {
	var ci = -1;
	var args = ["-PXXX",
		    "-cmib510",
		    "-pm1281",
		    "-C"+REPO_ROOT+"/"+this.XARCH+"/bin/avrdude.conf",
		    "-Uhfuse:r:-:i",
		    "-Ulfuse:r:-:i",
		    "-Uefuse:r:-:i"
		   ];
	var coms = this.comPorts;
	var avr = this.avrdude;
	var _this = this;
	var rdf = function (obj) {
	    if( obj!=null && obj.pexitcode != 0 ) {
		printf("Avrdude failed to read fuses on port '%s'.\n", coms[ci], obj.pexitcode);
		Runtime.exit(1);
	    }
	    if( ++ci == coms.length )
		Runtime.exit(0);
	    args[0] = "-P"+coms[ci];
	    if (_this.opts.verboseOpt.isSet())
		printf("Running avrdude:\n  %s\n", avr +" "+args.join(" "));
	    IO.Process.start(avr, args, rdf, TOOL.dumpProcOut);
	};
	rdf(null);
	return;
    }

    // prefix for temp files with commands for terminal mode
    var d = new Date();
    println(d);
    this.inpre   = sprintf("TMP-MIB510-%d-EEPROM-inp-",d.getTime());
    this.outpre  = sprintf("TMP-MIB510-%d-EEPROM-out-",d.getTime());
    this.errpre  = sprintf("TMP-MIB510-%d-EEPROM-err-",d.getTime());

    this.imageFileName = this.opts.imageFile.getArg();

    // Start by reading the current state of the EEPROMs
    this.readEEPROMs();
};

TOOL.dumpProcOut = function(blob) {
    printf(blob.pdata);
    flush();
};

TOOL.extractBytes = function (values) {
    var g = new Array();
    var j = 0;
    for (var i=0; i<values.length; i++)
	if (values[i] != "")
	    g[j++]=parseInt(values[i],16);
    if (this.opts.verboseOpt.isSet()){
	printf("BYTES:");
	for (var b=0;b<g.length;b++)
	    printf(" 0x%02X", g[b]);
	printf("\n");
    }
    return g;
}

TOOL.readEEPROMs = function() {
    printf("------------------------------------------------------------\n");
    printf("Reading EEPROMs magic (%02X) version (%02X) ...\n", 
	  IRIS_EEPROM.DEFS.EEPROM_CURRENT_MAGIC, 
	   IRIS_EEPROM.DEFS.EEPROM_CURRENT_VERSION);
    printf("------------------------------------------------------------\n");

    // global table with EEPROM bytes for each mote
    this.EEPROMs = []; 

    var args = ["-PXXX",
		"-cmib510",
		"-pm1281",
		"-C"+REPO_ROOT+"/"+this.XARCH+"/bin/avrdude.conf",
		"-q",
		"-q",
		"-t" // terminal mode
	       ];
    if (this.opts.verboseOpt.isSet()) {
	args[4]="-v";args[5]="-v";
    }



    var iordx = this.MRBINDIR + "/_iordx";

    var oneFailed = 0;
    var pdone = 0;
    var results = new Array(this.comPorts.length);
    var tmpf = function(ci, comPort, input, output, error, obj) {
	if( obj.pexitcode != 0 ) {
	    results[ci] = sprintf(FORMAT, comPort, sprintf("avrdude failed: %d\n", obj.pexitcode));
	    oneFailed = 1;
	} else {
	    results[ci] = sprintf(FORMAT, comPort, "avrdude OK");

	    var content = IO.File.readFully(output);
	    var lines = content.split('\n');
	    if (lines.length == 0) {
		results[ci] = sprintf("Error reading EEPROM.\n");
		oneFailed = 1;
	    }
	    else {
		// extract bytes from EEPROM reading using avrdude terminal mode
		var bytes = new Array(); 
		if (this.opts.verboseOpt.isSet()) {
		    for (var k=0; k<lines.length; k++){
			printf("EEPROM LINE:%s\n", lines[k]);
			// ----------------------------------------
			// EXAMPLE OUTPUT from avrdude:
			// 0000  a5 03 32 dd 46 ef 00 00  00 02 00 01 bc 02 c0 a8  |..2.F...........|
			// 0000  e5 70 38 39 00 00 00 02  00                       |.p89.....       |
			// Note: The output is assumed to have a maxium of 16 bytes per line!
		    }
		}
		for (var k=1; k<lines.length; k++){
		    var line = lines[k];
		    if (this.opts.verboseOpt.isSet())
			printf("---EEPROM LINE:%s\n", lines[k]);

		    // ignore the command that we typed in the terminal
		    if (line.match(/read eeprom/)) 
			continue;

		    var eeregex = /((\s{1,2}[a-f0-9]{2}){1,16})/; // at least one byte and at most 16 bytes per line
		    var arr = line.match(eeregex);
		    if (arr == null){
			// ignore lines that do not match
			if (this.opts.verboseOpt.isSet()){
			    printf("!NOMATCH %s\n",line);
			}
			continue;
		    }
		    else {
			var ebytes = new Array();
			ebytes = this.extractBytes(arr[1].split(" "));
			bytes = bytes.concat(ebytes);
			if (this.opts.verboseOpt.isSet()){
			    printf("EBYTES-->:");
			    for (var b=0;b<bytes.length;b++)
				printf(" 0x%02X", bytes[b]);
			    printf("\n");
			}
		    }
		}

		if (bytes.length == 0){
		    results[ci] = sprintf("Error parsing EEPROM!\n");
		    oneFailed = 1;
		}
		else {
		    if (this.opts.verboseOpt.isSet()){
			printf("BYTES-->:");
			for (var b=0;b<bytes.length;b++)
			    printf(" 0x%02X", bytes[b]);
			printf("\n");
		    }
			
		    this.EEPROMs[ci] = bytes;
		    
		    // First check the magic number and version
		    if (!this.opts.defaultOpt.isSet() &&
			bytes[IRIS_EEPROM.DEFS.EEPROM_OFF_VERSION] == IRIS_EEPROM.DEFS.EEPROM_CURRENT_VERSION && 
			bytes[IRIS_EEPROM.DEFS.EEPROM_OFF_MAGIC] == IRIS_EEPROM.DEFS.EEPROM_CURRENT_MAGIC) {
			printf(FORMAT, comPort, "check OK");
		    }
		    else {
			printf(FORMAT, comPort, "using default EEPROM!");
			// copy the default values
			for (var b=0; b<IRIS_EEPROM.DEFS.EEPROM_OFF_END;b++)
			    this.EEPROMs[ci][b] = this.EEPROM_DEFAULT[b];
		    }
		}
	    }
	}

	// clean up temp files
	IO.File.rm(input);
	IO.File.rm(output);
	IO.File.rm(error);

	if( ++pdone == this.comPorts.length ) {
	    //printf("All done!");
	    for( var pi=0; pi<this.comPorts.length; pi++ )
		printf("%s",results[pi]);

	    // --------------------
	    // continue ...
	    if (oneFailed)
		Runtime.exit(7);
	    else
		this.writeFlashFuses();
	}
	else{
	    //printf("Done %d / %d\n", pdone, this.comPorts.length);
	}
    };

    // read EEPROMs in parallel
    for( var ci=0; ci<this.comPorts.length; ci++ ) {
	var input  = this.inpre+ci;
	var output = this.outpre+ci;
	var error  = this.errpre+ci;

	//! we use terminal mode in avrdude because of problems with reading binary data
	var tmpin = IO.File.fopen(input,"w");
	IO.File.fwrite(tmpin, sprintf("read eeprom 0 %d\n", IRIS_EEPROM.DEFS.EEPROM_OFF_TABLE + IRIS_EEPROM.DEFS.EEPROM_TABLE_LEN));
	IO.File.fclose(tmpin);

	var rargs = [input,
		 output,
		 error,
		 this.avrdude];

	var comPort = this.comPorts[ci];
	args[0] = "-P"+comPort;
	var all = rargs.concat(args);
	if (this.opts.verboseOpt.isSet())
	    printf("Running:\n %s\n", iordx + " " + all.join(" "));
	//XXX introduce some small delay - otherwise callback is not always invoked
	//XXX maybe a race condition in Sonoran Thread/Process
	//Thread.sleep(2000);
	IO.Process.start(iordx, all, tmpf.bind(this, ci, comPort, input, output, error), TOOL.dumpProcOut);
    }
};


TOOL.incEUI = function(euiBytes){
    if (this.opts.verboseOpt.isSet())
	printf("EUI: %s\n", euiBytes);
    var carry = 1; // we increment with one
    var nbytes = new Array();
    for (var i=0; i<8; i++){ // little endian
	var bv = euiBytes[i];
	nbytes[i] = (bv + carry) % 256;
	//var bv = parseInt(euiBytes[i], 16);
	//nbytes[i] = sprintf("%02x", (bv + carry) % 256);
	carry = (bv + carry > 256)? 1:0;
    }
    //printf("New inc EUI: %s\n", nbytes);
    return  nbytes;
};

TOOL.parseEUI = function (eui) {
    // extract the EUI
    var bytes = eui.split("-");
    var num = bytes.length;
    if (num > 8){
	printf("\n\nFailed, specified EUI %s has more than 8 bytes\n\n",euis[i]);
	Runtime.exit(-1);
	}
    if (num == 0){
	printf("\n\nFailed, specified EUI %s 0 bytes\n\n",euis[i]);
	Runtime.exit(-1);
    }
    // revert it
    bytes.reverse();
    if (num < 8){
	// padd with 00-00-..-02
	//printf("... bytes = %s\n", bytes);
	for (var j=num; j<7;j++)  bytes.push("00");
	bytes.push("02");
    }
    if (this.opts.verboseOpt.isSet())
	printf("Parsed EUI %d bytes: %s\n", num, bytes);
    var ret = [];
    for (var b=0;b<8;b++) {
	ret[b] = parseInt(bytes[b],16);
	if (isNaN(ret[b])) {
	    printf("\n\nFailed, incorrect EUI %s!!!\n\n",eui);
	    Runtime.exit(-1);
	}
    }
    return ret;
};

//XXX: avrdude has problems with stk500_paged_load when reading/writting to EEPROM !!!
//WorkAround: Use terminal mode and files to read/write individual bytes in EEPROM 
TOOL.writeEEPROMs = function() {
    printf("------------------------------------------------------------\n");
    printf("Writing EEPROM ...\n");
    printf("------------------------------------------------------------\n");

    // we deal with the individual EEPROM configuration options individually

    // ----------------------------------------
    // EUI
    if (this.opts.euiOpt.isSet()){
	var eui = this.opts.eui.getArg();
	var euis = eui.split(",");
	if (euis.length != this.comPorts.length){
	    if (euis.length == 1 && this.comPorts.length > 1){
		// we start with the specified eui and increment by one
		var euiBytes = TOOL.parseEUI(euis[0]);
		euis[0] = euiBytes;
		for (var h = 1; h < this.comPorts.length; h++){
		    euiBytes = TOOL.incEUI(euiBytes);
		    euis.push(euiBytes);
		    if (this.opts.verboseOpt.isSet())
			printf("INC EUI : %s\n", euiBytes);
		}
		// replace the EEPROM tables
		for (var i=0;i<euis.length;i++){
		    for (var j=0; j<8; j++)
			this.EEPROMs[i][IRIS_EEPROM.DEFS.EEPROM_OFF_EUI+j] = euis[i][j];
		}
	    }
	    else {
		printf("\n\nSpecified %d EUIs and %d ports.\n" +
		       "Number of ports must match number of EUIs!\n", euis.length, this.comPorts.length);
		printf("Failed to write EUIs!\n\n", euis.length, this.comPorts.length);
		Runtime.exit(-1);
	    }
	}
	else{ // each port has a specified EUI
	    for (var i=0;i<euis.length;i++){
		var eui = TOOL.parseEUI(euis[i]);
		if (this.opts.verboseOpt.isSet())
		    printf("EUI:%s\n", eui);
		for (var j=0; j<8; j++)
		    this.EEPROMs[i][IRIS_EEPROM.DEFS.EEPROM_OFF_EUI+j] = eui[j];
	    }
	}
    }


    // ----------------------------------------
    // CONNECTIVITY
    if (this.opts.connOpt.isSet()){
	var c = IRIS_EEPROM.DEFS.CONNECTIVITY_AUTO;
	switch( this.opts.conn.getSelectedKeywordIndex() ) {
	case 1: c = IRIS_EEPROM.DEFS.CONNECTIVITY_WIRED; break;
	case 2: c = IRIS_EEPROM.DEFS.CONNECTIVITY_WIRELESS; break
	}
	for (var i=0; i<this.comPorts.length; i++){
	    this.EEPROMs[i][IRIS_EEPROM.DEFS.EEPROM_OFF_CONNECTIVITY] = c;
	}
    }

    
    // ----------------------------------------
    // Invoke avrdude in parallel threads
    var args = ["-PXXX",
		"-cmib510",
		"-pm1281",
		"-C"+REPO_ROOT+"/"+this.XARCH+"/bin/avrdude.conf",
		"-q",
		"-q",
		"-t" // terminal mode
	       ];
    if (this.opts.verboseOpt.isSet()) {
	args[4]="-v";args[5]="-v";
    }

    var iordx = this.MRBINDIR + "/_iordx"; // used for redirecting input/outpur/error
    var oneFailed = 0;
    var pdone = 0;
    var results = new Array(this.comPorts.length);
    var tmpf = function(ci, comPort, input, output, error, obj) {
	if( obj.pexitcode != 0 ) {
	    results[ci] = sprintf(FORMAT, comPort, sprintf("avrdude failed %d", obj.pexitcode));
	    oneFailed = 1;
	} else {
	    // var eeprom = this.EEPROMs[ci];
	    // var i=0;
	    // eeprom.forEach(function(item){eeprom[i++]=item.toUpperCase();});
	    var eeprom = "";
	    for (var b=0;b<IRIS_EEPROM.DEFS.EEPROM_OFF_END;b++)
		eeprom += sprintf(" %02X", this.EEPROMs[ci][b]);
	    results[ci] = sprintf(FORMAT, comPort, sprintf("avrdude OK | EEPROM: %s", eeprom));
	}
	// clean up temp files
	IO.File.rm(input);
	IO.File.rm(output);
	IO.File.rm(error);
	if( ++pdone == this.comPorts.length ) {
	    for( var pi=0; pi<this.comPorts.length; pi++ )
		printf("%s",results[pi]);
	    Runtime.exit(oneFailed);
	}
    };
    for( var ci=0; ci<this.comPorts.length; ci++ ) {
	var input  = this.inpre+ci;
	var output = this.outpre+ci;
	var error  = this.errpre+ci;
	var tmpin = IO.File.fopen(input,"w");

	// create the avrdude terminal command with the EEPROM bytes we want to write
	var writeCmd = "write eeprom 0"; // we start at offset 0
	for (var b=0; b<IRIS_EEPROM.DEFS.EEPROM_OFF_END; b++) {
	    if (b>0&&b%8==0){
		writeCmd+="\nwrite eeprom "+b;
	    }
	    writeCmd += sprintf(" 0x%02X", this.EEPROMs[ci][b]);
	    //printf("0x%02X  ---  0x%02X\n", this.EEPROM_DEFAULT[b], this.EEPROMs[ci][b]);
	}
	writeCmd += "\n";

	if (this.opts.verboseOpt.isSet())
	    printf("%s\n", writeCmd);

	IO.File.fwrite(tmpin, writeCmd);
	IO.File.fclose(tmpin);

	var rargs = [input,
		 output,
		 error,
		 this.avrdude];

	var comPort = this.comPorts[ci];
	args[0] = "-P"+comPort;
	var all = rargs.concat(args);
	if (this.opts.verboseOpt.isSet()) {
	    printf("inp-----------\n%s\n",writeCmd);
	    printf("Running:\n %s\n", iordx + " " + all.join(" "));	    
	}
	    
	//XXX introduce some small delay - otherwise callback is not always invoked
	//XXX maybe a race condition in Sonoran Thread/Process
	Thread.sleep(100);
	IO.Process.start(iordx, all, tmpf.bind(this, ci, comPort, input, output, error), TOOL.dumpProcOut);
    }
};

TOOL.writeFlashFuses = function () {
    printf("------------------------------------------------------------\n");
    printf("Writing Image & Fuses ...\n");
    printf("------------------------------------------------------------\n");

    var fuseConfigName = this.opts.fuse.getSelectedKeyword();
    var fuseConfig = TOOL.FUSE_CONFIG[fuseConfigName] || {};
    if( fuseConfigName==null ) {
	if( /\bdbg\b/.test(this.imageFileName) )
	    fuseConfig = TOOL.FUSE_CONFIG.dbg;
	else if( /\bprod\b/.test(this.imageFileName) )
	    fuseConfig = TOOL.FUSE_CONFIG.prod;
	else if( /\bportf\b/.test(this.imageFileName) )
	    fuseConfig = TOOL.FUSE_CONFIG.portf;
        else
            fuseConfig = TOOL.FUSE_CONFIG.prod; // default to prod

    }
    if( this.opts.hfuseOpt.isSet() )
	fuseConfig.hfuse = this.opts.hfuse.getNumber();
    if( this.opts.lfuseOpt.isSet() )
	fuseConfig.lfuse = this.opts.lfuse.getNumber();
    if( this.opts.efuseOpt.isSet() )
	fuseConfig.efuse = this.opts.efuse.getNumber();

    var args = ["-PXXX",
		"-cmib510",
		"-pm1281",
		"-C"+REPO_ROOT+"/"+this.XARCH+"/bin/avrdude.conf"
	       	//"-D" // do not do a chip erase
	       ];
    if( this.imageFileName != '-' ) {
	args.push("-U");
	args.push("flash:w:"+this.imageFileName);
    }
    if( 'hfuse' in fuseConfig ) {
	args.push("-U");
	args.push("hfuse:w:"+fuseConfig.hfuse+":m");
    }
    if( 'lfuse' in fuseConfig ) {
	args.push("-U");
	args.push("lfuse:w:"+fuseConfig.lfuse+":m");
    }
    if( 'efuse' in fuseConfig ) {
	args.push("-U");
	args.push("efuse:w:"+fuseConfig.efuse+":m");
    }

    if (this.opts.verboseOpt.isSet()) {
	args.push("-v");
	args.push("-v");	
    }
    else {
	// always use quiet mode for avrdude
	args.push("-q");
	args.push("-q");	
    }


    var oneFailed = 0;
    var pdone = 0;
    var results = new Array(this.comPorts.length);
    var tmpf = function(ci, comPort, obj) {
	if( obj.pexitcode != 0 ) {
	    results[ci] = sprintf(FORMAT, comPort, sprintf("avrdude failed %d", obj.pexitcode));
	    oneFailed = 1;
	} else {
	    results[ci] = sprintf(FORMAT, comPort, "avrdude OK");
	}
	if( ++pdone == this.comPorts.length ) {
	    for( var pi=0; pi<this.comPorts.length; pi++ )
		printf("%s",results[pi]);

	    // --------------------
	    // continue ...
	    if (oneFailed)
		Runtime.exit(7);
	    else
		this.writeEEPROMs();
	}
    };
    for( var ci=0; ci<this.comPorts.length; ci++ ) {
	var comPort = this.comPorts[ci];
	args[0] = "-P"+comPort;
	if (this.opts.verboseOpt.isSet())
	    printf("Running avrdude:\n  %s\n", this.avrdude+" "+args.join(" "));
	IO.Process.start(this.avrdude, args, tmpf.bind(this, ci, comPort), TOOL.dumpProcOut);
    }
};

TOOL.EEPROM_DEFAULT = [
    IRIS_EEPROM.DEFS.EEPROM_CURRENT_MAGIC,
    IRIS_EEPROM.DEFS.EEPROM_CURRENT_VERSION,
    0xFF,0xFF,0xFF,0xFF,0xFF,0xFF,0xFF,0xFF, // mote will generate a random address
    IRIS_EEPROM.DEFS.CONNECTIVITY_AUTO,
    IRIS_EEPROM.DEFS.EEPROM_BATTERY_ADC4MIN>>8,
    IRIS_EEPROM.DEFS.EEPROM_BATTERY_ADC4MIN&0xFF,
    IRIS_EEPROM.DEFS.EEPROM_BATTERY_SCALE,
    192,168,1,200, // default IP address
    39,15,         // default UDP port  9999
    255,255,255,0, // default subnet mask
    192,168,1,1    // default gateway
];

TOOL.init(ARGV);


