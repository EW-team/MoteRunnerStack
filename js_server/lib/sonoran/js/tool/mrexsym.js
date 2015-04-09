#!sonoran


var OUT_csharp = function () {
    this.accessMap = {
	true:  "public",
	false: "internal"
    };

    this.typeMap = {
	'b': 'byte',
	's': 'signed byte',
	'u': 'uint',
	'i': 'int',
	'l': 'long'
    };

    this.testFilename = function (fileName) {
	return /[.]cs$/.exec(fileName) != null;
    };

    this.begNs = function (nsPath) {
	if( nsPath==null )
	    return null;
	return sprintf("namespace %s {\n", nsPath.join("."));
    };

    this.endNs = function (nsPath) {
	if( nsPath==null )
	    return null;
	return "}\n";
    };

    this.begCls = function (nsPath, clsPub, clsName) {
	return sprintf("    %s class %s {\n", this.accessMap[clsPub], clsName);
    };

    this.endCls = function (nsPath, clsName) {
	return "    };\n";
    };

    this.constVar = function (nsPath, clsPub, clsName, varPub, varName, varType, varValue) {
	return sprintf("        %s %s %s = %d;\n", this.accessMap[varPub], this.typeMap[varType], varName, varValue);
    };

    this.constArray = function (nsPath, pubCls, clsName, pubVar, varName, varType, varValues) {
	return sprintf("        %s %s[] %s = { %s };\n", this.accessMap[varPub], this.typeMap[varType], varName, varValues.join(","));
    };
};

var OUT_java = function () {
    this.accessMap = {
	true:  "public",
	false: ""
    };

    this.typeMap = {
	'b': 'byte',
	's': 'byte',
	'u': 'int',
	'i': 'int',
	'l': 'long'
    };

    this.testFilename = function (fileName) {
	return /[.]java$/.exec(fileName) != null;
    };

    this.begNs = function (nsPath) {
	if( nsPath==null )
	    return null;
	return sprintf("package %s;\n", nsPath.join("."));
    };

    this.endNs = function (nsPath) {
	return null;
    };

    this.begCls = function (nsPath, clsPub, clsName) {
	return sprintf("%s class %s {\n", this.accessMap[clsPub], clsName);
    };

    this.endCls = function (nsPath, clsName) {
	return "};\n";
    };

    this.constVar = function (nsPath, clsPub, clsName, varPub, varName, varType, varValue) {
	return sprintf("    %s %s %s = %d;\n", this.accessMap[varPub], this.typeMap[varType], varName, varValue);
    };

    this.constArray = function (nsPath, pubCls, clsName, pubVar, varName, varType, varValues) {
	return sprintf("    %s %s[] %s = { %s };\n", this.accessMap[varPub], this.typeMap[varType], varName, varValues.join(","));
    };
};

var OUT_javascript = function () {
    this.testFilename = function (fileName) {
	return /[.]js$/.exec(fileName) != null;
    };

    this.begNs = function (nsPath) {
	if( nsPath==null )
	    return null;
	var prefix = nsPath[0];
	var t = "var "+prefix+" = {};\n";
	for( var ni=1; ni < nsPath.length; ni++ ) {
	    t += sprintf("%s.%s = {};\n", prefix, nsPath[ni]);
	    prefix += nsPath[ni];
	}
	return t;
    };

    this.endNs = function (nsPath) {
	return null;
    };

    this.begCls = function (nsPath, clsPub, clsName) {
	if( nsPath==null )
	    return sprintf("var %s = {\n", clsName);
	return sprintf("%s.%s = {\n", nsPath.join("."), clsName);
    };

    this.endCls = function (nsPath, clsName) {
	return "};\n";
    };

    this.constVar = function (nsPath, clsPub, clsName, varPub, varName, varType, varValue) {
	return sprintf("    %s: %d,\n", varName, varValue);
    };

    this.constArray = function (nsPath, pubCls, clsName, pubVar, varName, varType, varValues) {
	return sprintf("    %s: [%s],\n", varName, varValues.join(","));
    };
};


var TOOL_CTOR = function (argv) {

    this.opts = {   CMD:  null };
    this.opts.helpOpt        = new GetOpt.HelpOpt();
    this.opts.verboseOpt     = new GetOpt.Option('v', '--verbose', 0, null, "Verbose mode. More details in dump of internal node tree", null);
    this.opts.publicsOnlyOpt = new GetOpt.Option('p', '--publics-only', 0, null, "Only export public symbols.", null);
    this.opts.dropNsOpt      = new GetOpt.Option(null, '--drop-namespace', 0, null, "Do not use a namespace on generated output.", null);
    this.opts.thisNamespace  = new GetOpt.Simple('namespace','Use this namespace instead of the ones found in the SDX file.\n'+
						'This might lead to name clashes on class names.');
    this.opts.useNsOpt       = new GetOpt.Option(null, '--use-namespace', 0, null, null, this.opts.thisNamespace);
    this.opts.filterout      = new GetOpt.Simple('regexp','Do not export variables that match this filter.');
    this.opts.filteroutOpt   = new GetOpt.Option(null, '--filter-out', 0, null, null, this.opts.filterout);
    this.opts.filter         = new GetOpt.Simple('regexp','Export only variables that match this filter.');
    this.opts.filterOpt      = new GetOpt.Option(null, '--filter', 0, null, null, this.opts.filter);
    this.opts.encoderFile    = new GetOpt.Simple('file.js','A javascript file defining an output module.');
    this.opts.encoderOpt     = new GetOpt.Option(null, '--encoder', 0, null, null, this.opts.encoderFile);
    this.opts.sdxFile        = new GetOpt.Simple('file.sdx','Debug file of assembly containing all constant symbols.');
    this.opts.outFiles       = new GetOpt.RestOfArgs('outfile..', "List of output files. Language is determined from file suffix.");

    this.opts.argSpec     = new GetOpt.Seq(
	[ new GetOpt.OptionSet(
	      [ this.opts.helpOpt,
		this.opts.verboseOpt,
		this.opts.publicsOnlyOpt,
		this.opts.useNsOpt,
		this.opts.dropNsOpt,
		this.opts.filterOpt,
		this.opts.filteroutOpt,
		this.opts.encoderOpt]),
	  this.opts.sdxFile,
	  this.opts.outFiles
	],
	2);
    this.opts.CMD = new GetOpt.Cmd('mrexsym', this.opts.argSpec, "Export constant symbols from an SDX file of an assembly\n"+
								 "into various other languages.\n");
		       
    if( !this.opts.CMD.parse(argv) ) {
	Runtime.exit(12);
    }
    if( this.opts.useNsOpt.isSet() && this.opts.dropNsOpt.isSet() ) {
	printf("mrexsym: Conflicting options - cannot use both %s and %s\n",
	       this.opts.useNsOpt.getOptName(),
	       this.opts.dropNsOpt.getOptName());
	Runtime.exit(12);
    }

    this.filterRegexp = null;
    if( this.opts.filterOpt.isSet() ) {
	var regexp = this.opts.filter.getArg();
	try {
	    this.filterRegexp = new RegExp(regexp);
	} catch (ex) {
	    printf("mrexsym: Bad filter regexp `%s': %s\n", regexp, ex);
	    Runtime.exit(12);
	}
    }

    this.filteroutRegexp = null;
    if( this.opts.filteroutOpt.isSet() ) {
	var regexp = this.opts.filterout.getArg();
	try {
	    this.filteroutRegexp = new RegExp(regexp);
	} catch (ex) {
	    printf("mrexsym: Bad filter-out regexp `%s': %s\n", regexp, ex);
	    Runtime.exit(12);
	}
    }

    var sdxFile = this.opts.sdxFile.getArg();
    var sdxContents = null;
    try {
	sdxContents = IO.File.readFully(sdxFile);
    } catch (ex) {
	printf("mrexsym: Cannot read SDX file `%s': %s\n", sdxFile, ex);
	return 1;
    }
    var clsList = this.parseSdx(sdxContents);

    var ENCODERS = [new OUT_csharp(), new OUT_java(), new OUT_javascript()];
    if( this.opts.encoderOpt.isSet() ) {
	var code, encoderFile = this.opts.encoderFile.getArg();
	try {
	    code = IO.File.readFully(encoderFile);
	} catch (ex) {
	    printf("mrexsym: Cannot read encoder file `%s': %s\n", encoderFile, ex);
	    return 1;
	}
	try {
	    eval("ENCODERS.push(new ("+code+"));");
	    //var func = eval(code);
	    //ENCODERS.push(new func());
	} catch (ex) {
	    printf("mrexsym: Cannot evaluate encoder: %s\n", ex);
	    return 1;
	}
    }

    var self = this;
    var outfiles = this.opts.outFiles.getRestArgs();
    if( outfiles.length == 0 ) {
	printf("mrexsym: No output files specified.\n");
	return 1;
    }
    outfiles.forEach(function (file) {
			 if( !ENCODERS.some(function (encoder) {
						if( encoder.testFilename(file) ) {
						    self.processFile(clsList, file, encoder);
						    return true;
						}}) ) {
			     printf("mrexsym: Cannot infer output format for file `%s' - ignored.\n", file);
			 }
		     });
};

TOOL_CTOR.prototype.parseSdx = function (sdxContents) {
    var lines = sdxContents.split(/\r?\n/);
    var clsList = [];
    var varList;

    for( var li=0; li<lines.length; li++ ) {
	var fields = lines[li].split(/\t/);
	if( fields[0].match(/^C/) ) {
	    if( fields[2].indexOf('$tatics') >= 0 )
		continue;
	    var md      = fields[2].match(/^((\w+[.])*(\w+))[.](\w+)$/); // split fully qualified class name
	    var nsName  = md[1];  // classes must always have a namespace
	    var clsName = md[4];
	    var ispub   = (fields[0].indexOf("!") > 0);
	    if( this.opts.publicsOnlyOpt.isSet() && ispub  )
		continue;  // ignore non-public symbols
	    clsList.push({
			     ispub:   ispub,
			     nsName:  nsName,
			     clsName: clsName,
			     varList: varList=[]
			 });
	}
	else if( fields[0].match(/^[GH]/) ) {
	    var name  = fields[1];
	    var type  = fields[2];
	    var value = fields[4];
	    var ispub = (fields[0].indexOf("!") > 0);
	    var array = false;
	    if( this.opts.publicsOnlyOpt.isSet() && ispub  )
		continue;  // ignore non-public symbols
	    if( fields[0].match(/^H/) ) {
		type  = type.replace(/\[\]/,"");
		value = value.split(/,/);
		array = true;
	    }
	    varList.push({
			     name:  name,
			     ispub: ispub,
			     type:  type,
			     array: array,
			     value: value
			 });
	}
    }
    clsList.sort(function (a,b) {
		     if( a.nsName==b.nsName ) {
			 if( a.clsName==b.clsName )
			     return 0;
			 return a.clsName < b.clsName ? -1 : 1;
		     }
		     return a.nsName < b.nsName ? -1 : 1;
		 });
    clsList.forEach(function (cls) {
			cls.varList.sort(function (a,b) {
					     if( a.name==b.name )
						 return 0;
					     return a.name < b.name ? -1 : 1;
					 });
		    });
    return clsList;
}

TOOL_CTOR.prototype.processFile = function (clsList, file, encoder) {
    var self = this;
    var lines = [];
    var lastNs = null;
    var currNs = null;
    var dropns = self.opts.dropNsOpt.isSet();
    var usens = this.opts.useNsOpt.isSet();
    var thisns = null;

    if( usens ) {
	currNs = this.opts.thisNamespace.getArg().split(/[.]/);
	if( 'begNs' in encoder )
	    lines.push(encoder.begNs(currNs));
    }
    clsList.forEach(function (clsObj) {
			var varList = clsObj.varList;
			if( self.filterRegexp != null )
			    varList = varList.filter(function (v) { return self.filterRegexp.exec(v.name)!=null; });
			if( self.filteroutRegexp != null )
			    varList = varList.filter(function (v) { return self.filteroutRegexp.exec(v.name)==null; });
			if( varList.length > 0 ) {
			    if( !usens && lastNs != clsObj.nsName ) {
				if( currNs != null && 'endNs' in encoder )
				    encoder.endNs(currNs);
				if( !dropns ) {
				    lastNs = clsObj.nsName;
				    currNs = lastNs.split(/[.]/);
				}
				if( 'begNs' in encoder )
				    lines.push(encoder.begNs(currNs));
			    }
			    if( 'begCls' in encoder )
				lines.push(encoder.begCls(currNs, clsObj.ispub, clsObj.clsName));
			    varList.forEach(function (varObj) {
						var meth = varObj.array ? "constArray" : "constVar";
						if( meth in encoder )
						    lines.push(encoder[meth](currNs, clsObj.ispub, clsObj.clsName,
									     varObj.ispub, varObj.name, varObj.type, varObj.value));
					    });
			    if( 'endCls' in encoder )
				lines.push(encoder.endCls(currNs, clsObj.ispub, clsObj.clsName));
			}
		    });
    if( !dropns && 'endNs' in encoder )
	lines.push(encoder.endNs(currNs));
    lines = lines.filter(function(e) { return e!=null; });

    try {
	IO.File.writeFully(file, lines.join(""));
    } catch (ex) {
	printf("mrexsym: Failed to write file `%s': %s\n", file, e);
	Runtime.exit(1);
    }
}

var TOOL = new TOOL_CTOR(ARGV);
Runtime.exit(0);
