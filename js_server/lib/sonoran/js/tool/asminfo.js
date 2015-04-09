#!sonoran

Runtime.include("server/sonoran/sonoran.js");

var TOOL_CTOR = function (argv) {
    this.opts = {};
    this.opts.helpOpt     = new GetOpt.HelpOpt();
    this.opts.verboseOpt  = new GetOpt.Option('v', '--verbose', 0, null, "Verbose mode. Display more details.", null);
    this.opts.fqnOpt      = new GetOpt.Option('f', '--fqn', 0, null, "Print fully qualified assembly identities (including\nbuild number) of all files.", null);
    this.opts.sbaFiles    = new GetOpt.RestOfArgs('sbafiles..', "List of assembly files (sba) to process.");

   this.opts.argSpec     = new GetOpt.Seq([
					      new GetOpt.OptionSet([ this.opts.helpOpt,
								     this.opts.verboseOpt,
								     this.opts.fqnOpt,
								   ]),
					      this.opts.sbaFiles
					  ]);
    this.opts.CMD = new GetOpt.Cmd('asminfo', this.opts.argSpec, "Display assembly info from a list of sba files.\n");
    if( !this.opts.CMD.parse(argv) ) {
	Runtime.exit(1);
    }
}

TOOL_CTOR.prototype.process = function () {
    var sbafiles = this.opts.sbaFiles.getRestArgs();
    if( sbafiles.length == 0 && !this.opts.fqnOpt.isSet() ) {
	printf("No sba files specified.\n");
	return 1;
    }
    for( var si=0; si < sbafiles.length; si++ ) {
	var data, asm, sbafile = sbafiles[si];
	try {
	    data = OSFile.readFully(sbafile);
	} catch (ex) {
	    // XXX: if file without path try GAC
	    printf("asminfo: %s\n", ex);
	    return 1;
	}
	if( data.length==0 ) {
	    printf("File `%s' is empty.\n", sbafile);
	    return 1;
	}
	try {
	    asm = new Sonoran.Assembly(data);
	} catch (e) {
	    printf("asminfo: Exception while parsing sba file `%s': %s\n", sbafile, e);
	    return 1;
	}
	if( this.opts.fqnOpt.isSet() ) {
	    printf("%s\n", asm.toString());
	} else {
	    if( sbafiles.length > 1 ) {
		printf("%s%s\n", si==0 ? "" : "\n", sbafile);
	    }
            printf("%s", asm.getInfo());
	}
    }
    return 0;
}

var TOOL = new TOOL_CTOR(ARGV);
Runtime.exit(TOOL.process());
