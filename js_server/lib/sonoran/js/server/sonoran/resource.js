//  (C) COPYRIGHT INTERNATIONAL BUSINESS MACHINES CORPORATION 2006-2010
//                       ALL RIGHTS RESERVED
//        IBM Research Division, Zurich Research Laboratory
// --------------------------------------------------------------------



/**
 * Registered listeners get notified whenever resources are created or removed.
 * @type Util.Listeners
 * @constant
 * @private
 */
Sonoran.Resource.onChangeListeners = new Util.Listeners();


/**
 * RegExp to test a valid configuration or motelet filename.
 * @type RegExp
 * @constant
 * @private
 */
Sonoran.Resource.CONTAINER_NAME_REGEXP =  /^[\w\d_\:\.\-\ ]+$/;



/**
 * Motelet configuration filename.
 * @type String
 * @constant
 * @private
 */
Sonoran.Resource.MOTELET_JSON = "motelet.json";



/**
 * Clean sheet motelet.
 * @type String
 * @constant
 * @private
 */
Sonoran.Resource.CLEANSHEET_MOTELET_NAME = "Clean Sheet";



/**
 * Default store.
 * @type String
 * @constant
 * @private
 */
Sonoran.Resource.DEFAULT_MOTELETS_STORES = [
    REPO_ROOT + '/examples'
];




/**
 * A regexp which matches sba filenames.
 * @type RegExp
 * @constant
 */
Sonoran.Resource.SBA_FILE_NAME_REGEXP = new RegExp("^("+Sonoran.AsmName.IDENTITY_REGEXP+")\\.sba$");


/**
 * A regexp which matches sdx filenames.
 * @type RegExp
 * @constant
 */
Sonoran.Resource.SDX_FILE_NAME_REGEXP = new RegExp("^("+Sonoran.AsmName.IDENTITY_REGEXP+")\\.sdx$");


/**
 * A regexp which matches sba or sdx filenames.
 * @type RegExp
 * @constant
 */
Sonoran.Resource.ASM_FILE_NAME_REGEXP = new RegExp("^("+Sonoran.AsmName.IDENTITY_REGEXP+")(\\.sba|\\.sdx)?$");



/**
 * Return the path to the global assembly cache.
 * @returns {String} directory name
 */
Sonoran.Resource.getGACDir = function() {
   return REPO_ROOT + "/gac";
};



/**
 * Return the architecture-specific names of mote dlls.
 * @returns {String[]} mote dll names
 */
Sonoran.Resource.getMoteDlls = function() {
    var dir = Core.getBinDir();
    var dlls = [];
    var entries = IO.File.listDir(dir);
    var kind = "dev";
    while(true) {
	var re = new RegExp("^(lib)?mote-" + kind + "-(.*)\.(dll|so|dylib)$");
	for (var i = 0; i < entries.length; i++) {
	    var match = re.exec(entries[i]);
	    if (match && match[2]) {
		dlls.push(match[2]);
	    }
	}
	if (dlls.length>0 || kind=="prod") {
	    return dlls;
	}
	kind = "prod";
    }
   assert(0);
};


/**
 * Return the architecture-specific file path to the saguaro binary.
 * @returns {String} file path of saguaro binary
 */
Sonoran.Resource.getSaguaroPath = function() {
    var path = REPO_ROOT + "/" + ARCH_NAME + "/bin/saguaro";
    if (ARCH_NAME=='cygwin'||ARCH_NAME=='win32') {
	path += ".exe";
    }
    return path;
};


/**
 * Return the architecture-specific file path to the sonoran binary.
 * @returns {String} file path of sonoran binary
 */
Sonoran.Resource.getSonoranPath = function() {
    var path = REPO_ROOT + "/" + ARCH_NAME + "/bin/sonoran";
    if (ARCH_NAME=='cygwin'||ARCH_NAME=='win32') {
	path += ".exe";
    }
    return path;
};



/**
 * @private
 */
Sonoran.Resource.scanResources = function(/** String */type, /** String */path) {
   Sonoran.Resource.listResources();
   Sonoran.Resource.onChangeListeners.notify();
};


/**
 * List resources found in share/oasis and the GAC.
 * @param type 'a', 'm' or null
 * @param path Optional
 * @private
 */
Sonoran.Resource.listResources = function(/** String */type) {
   var entries, i;
    var ret = new Sonoran.Resource.Contents();   
    if (!type || type==='a') {
	var assemblies = Sonoran.Resource.GAC.list();
	for (var i = 0; i < assemblies.length; i++) {
            assemblies[i] = new Sonoran.AsmName(assemblies[i]);
	}
	ret.assemblies = assemblies;
    }
    if (!type || type==='m') {
	ret.motelets = [];
	var all = Sonoran.Resource.Motelets.findAll();
	for (var name in all) {
	    ret.motelets.push(all[name]);
	}
    }
    return ret;
};


/**
 * Remove resource found in share/oasis and the GAC.
 * @param name
 * @param path Optional
 * @private
 */
Sonoran.Resource.removeResource = function(/** String */name) {
    if (Sonoran.AsmName.isAsmIdentity(name)) {
	try {
	    Sonoran.Resource.GAC.remove(name);
	} catch(ex) {
	    throw new Exception("Removing assembly failed", ERR_GENERIC, ex);
	}
	return;
    }

    Sonoran.Resource.Motelets.remove(name);
};







/**
 * Points specified path to a motelet?
 * @returns {Boolean}
 * @private
 */
Sonoran.Resource.isMotelet = function(/** String */path) {
    var fn = path + '/' + Sonoran.Resource.MOTELET_JSON;
    return IO.File.exists(fn) && !IO.File.isDir(fn);
};








/**
 * Sonoran.Resource.Assembly extends Sonoran.Assembly represents a saguaro assembly resource
 * in the filesystem.
 * @class
 * @augments Sonoran.Assembly
 * @constructor
 * @param dir          Either directory or full file path of assembly
 * @param name         Optional, must be a String (filename or basename of an sba/sdx file) or a Sonoran.AsmName if first parameter is a directory
 */
Sonoran.Resource.Assembly = function(/** String */dir, /** String|Sonoran.AsmName */name) {
   if( arguments.length==1 ) {
      if (IO.File.isDir(dir)) {
         throw new Exception(sprintf("Assembly path is directory: %s", dir));
      }
      name = IO.File.basename(dir);
      dir  = IO.File.dirname(dir);
   } else {
      assert(arguments.length==2);
   }
   assert(dir&&name);
   if (!IO.File.exists(dir)) {
      throw new Exception(sprintf("Non-existing directory: %s", dir));
   }
   if (typeof(name)=='string') {
      var md;
      if( !(md=Sonoran.Resource.ASM_FILE_NAME_REGEXP.exec(name)) ) {
         throw new Exception("Invalid assembly identity: " + name);
      }
      // Strip off sba suffix 
      name = md[1];
   }
   
   this.dir = dir;
   this.basename = name;
   var fn = this.getSBAPath();
   if (!IO.File.exists(fn)) {
       throw new Exception(sprintf("No such assembly '%s' in directory '%s'", name, this.dir));
   }
   this.filestats = IO.File.stat(fn);

    var bytes;
    try {
        bytes = IO.File.readFully(fn);
    } catch(ex) {
        throw new Exception(sprintf("Cannot load assembly '%s': %s", fn, ex));
    }
    Sonoran.Assembly.call(this, bytes);
};


/** Prototype */
Sonoran.Resource.Assembly.prototype = extend(
   Sonoran.Assembly.prototype,
   /** @lends Sonoran.Resource.Assembly.prototype */
   {
      /**
       * @ignore
       */
      __constr__: "Sonoran.Resource.Assembly",
      /**
       * Directory where assembly files are stored.
       * @type String
       */
      dir: null,
      /**
       * Object with properties 'size', 'mtime' and 'atime',
       * the file statistics of the sba file if it exists.
       * @type Object
       */
      filestats: null,
      /**
       * Filename, i.e. safely quoted name of assembly plus -major.minor-build
       */
      basename: null,

      /**
       * @returns {Object} file statistics, an object with size, mtime and atime properties
       */
      getFileStats: function() {
         return this.filestats;
      },
   
      /**
       * @returns {String} directory this assembly is stored in
       */
      getDir: function() {
         return this.dir;
      },
   
      /**
       * @returns {String} full path to sba file
       */
      getSBAPath: function() {
         return this.dir + '/' + this.getSBAName();
      },
      
      /**
       * @returns {String} sba filename
       */
      getSBAName: function() {
         return this.basename + ".sba";
      },
   
      /**
       * @returns {Number} size of assembly sba file
       */
      getSize: function() {
         return this.filestats ? this.filestats.size : -1;
      },
      
      /**
       * Return modification time of sba file as date string
       * @returns {String} date string
       */
      getMTimeS: function() {
         if (!this.filestats) {
            return "-";
         }
         var d = new Date(this.filestats.mtime);
         return sprintf("%02d:%02d:%02d-%02d/%02d", d.getHours(), d.getMinutes(), d.getSeconds(), d.getDate(), d.getMonth()+1);
      },

      /**
       * @returns {String} sba filename
       */
      getSDXName: function() {
         return this.basename + ".sdx";
      },
      
      /**
       * Return path to sdx file. 
       * @returns {String} SDA path or null
       */
      getSDXPath: function() {
         var basename = Sonoran.AsmName.requoteName(this.toStringNoBuild());
         var path = this.dir + '/' + basename + ".sdx";
         if (IO.File.exists(path)) {
             return path;
         }
         basename = Sonoran.AsmName.requoteName(this.toString());
         path = this.dir + '/' + basename + ".sdx";
         if (IO.File.exists(path)) {
             return path;
         }
         return null;
      },
      
      /**
       * Store assembly resource.
       * @param dir   Destination directory
       */
      save: function(/** String */dir) {
         assert(arguments.length==1);
         assert(this.bytes);
         Sonoran.Resource.Assembly.saveSBA(this, dir, this.bytes);
      },
      
      /**
       * Remove assembly resource in filesystem.
       */
      remove: function() {
         var path = this.getSBAPath();
         if (IO.File.exists(path)) {
            try {
               IO.File.rm(path);
            } catch(ex) {
               throw new Exception(sprintf("Cannot delete assembly '%s': '%s'", path, ex));
            }
         }
      },
      
      /**
       * @returns {String} info message
       */
      getInfo: function() {
         var info = "";
         info += sprintf("Path                : %s\n", this.getSBAPath());
         info += sprintf("Size                : %d\n", this.filestats.size);
         info += sprintf("MTime               : %s\n", this.getMTimeS());
         info += Sonoran.Assembly.prototype.getInfo.call(this);
         return info;
      }
   }
);


/**
 * Return filepath without suffix leading to an assembly resource.
 * @param dir      Directory
 * @param asmName  Assembly name
 * @static
 */
Sonoran.Resource.Assembly.getFilePath = function(/** String */dir, /** Sonoran.AsmName */asmName) {
   return dir + '/' + Sonoran.AsmName.requoteName(asmName.toString());
};


/**
 * Contains the specified directory any SBAs?
 * @param dir Directory
 * @returns {Boolean} boolean
 * @static
 */
Sonoran.Resource.Assembly.hasSBAs = function(/** String */dir) {
   var re = Sonoran.Resource.SBA_FILE_NAME_REGEXP;
   var dentries = IO.File.listDir(dir);
   for (var i = 0; i < dentries.length; i++) {
      if (re.test(dentries[i])) {
         return true;
      }
   }
   return false;
};



/**
 * Save assembly sba data to specified directory for specified assembly name. Might throw an exception.
 * @param name  Sonoran.AsmName
 * @param dir   Directory
 * @param bytes  Binary data
 * @static
 */
Sonoran.Resource.Assembly.saveSBA = function(/** Sonoran.AsmName */asmName, /** String */dir, /** String */bytes) {
   var path = Sonoran.Resource.Assembly.getFilePath(dir, asmName) + ".sba";
   if (!IO.File.exists(dir)) {
       throw new Exception("Non-existing directory: " + dir);
   }
   try {
      IO.File.writeFully(path, bytes);
   } catch(ex) {
      throw new Exception("Cannot write assembly contents to '" + path + "': " + ex);
   }
};






 /**
  * Find saguaro assembly binaries in the specified filesystem directory and in its subdirectories up to
  * the specified depth. Optionally, specify a Sonoran.AsmName filter instance against which the
  * found binaries are matched to.
  * @param dir     Directory
  * @param deoth   Optional, maximum depth, >= 1, 1 just searches in given directory
  * @param asmName Optional, filter
  * @returns {Sonoran.Resource.Assembly[]} assembly resources, ordered by age, youngest first
  * @static
  */
Sonoran.Resource.Assembly.findSBAs = function(/** String */dir, /** Number */depth, /** Sonoran.AsmName|Sonoran.AsmName[] */asmName) {
   var entries = [];
   var files = IO.FileUtils.find(dir, Sonoran.Resource.SBA_FILE_NAME_REGEXP, depth);
   for (var i = 0; i < files.length; i++) {
      entries.push(new Sonoran.Resource.Assembly(files[i]));
   }
   if (asmName) {
      entries = Sonoran.AsmName.filterMatch(asmName, entries);    
   }
   // youngest assemblies first
   entries.sort(function(a1, a2) { return a2.filestats.mtime - a1.filestats.mtime; });
   return entries;
};




 /**
  * Find saguaro assembly binaries in the specified filesystem directories and their subdirectories.
  * Each specified path must denote a directory. Trailing '*' in the path denote the depth of directories
  * to search assemblies. A single '*' star leads to a search in the whole directory tree, otherwies the
  * number of stars specifies the number of directories to descend. No '*' just leads to a lookup in the
  * specified path. Optionally, a filter may be specified against which the found binaries are matched.
  * @param paths     Directory specifications
  * @param asmName Optional, filter
  * @returns {Sonoran.Resource.Assembly[]} assembly resources, ordered by age, youngest first
  * @static
  */
Sonoran.Resource.Assembly.getSBAs = function(/** String|String[] */paths, /** Sonoran.AsmName|Sonoran.AsmName[] */filter) {
    var ret = [];
   if (typeof(paths)==='string') {
      paths = [ paths ];
   }
   for (var i = 0; i < paths.length; i++) {
       try {
	   var files = IO.FileUtils.find(paths[i], Sonoran.Resource.SBA_FILE_NAME_REGEXP);
	   for (var j = 0; j < files.length; j++) {
               try {
		   var asmres = new Sonoran.Resource.Assembly(files[j]);
		   ret.push(asmres);
               } catch (ex) {
		   Logger.err(sprintf("Ignoring invalid assembly resource '%s': %s", files[j], ex));
               }
	   }
       } catch (ex) {
	   // Silently ignore invalid paths
       }
   }
    if (filter) {
	ret = Sonoran.AsmName.filterMatch(filter, ret);
    } 
    ret.sort(function(a1, a2) {
		 if( a2.major != a1.major )
		     return a2.major - a1.major;
		 if( a2.minor != a1.minor )
		     return a2.minor - a1.minor;
		 return a2.filestats.mtime - a1.filestats.mtime;
	     });
    //QUACK(0, ret.join("\n"));
    return ret;
};









 /**
  * Return file paths to sdx files found in the filesystem. Optionally, a filter can be specified.
  * @param paths     Directory specifications, if null, mote runner installation, GAC and relative to working directory is searched
  * @param asmName   Optional, filter
  * @returns {Object[]}  a tuple with array of filepaths and array of assembly names
  * @static
  */
Sonoran.Resource.Assembly.getSDXs = function(/** String|String[] */paths, /** Sonoran.AsmName */filter) {
    if (!paths) {
        paths = [];
        paths.push(Sonoran.Resource.getGACDir());
        paths.push(IO.File.getcwd()+"/***");
    } else if (typeof(paths)==='string') {
        paths = [ paths ];
    }
    var files = [], asmNames = [], _filter;
    if (filter) {
	_filter = filter.toStringNoBuild();
    }
    for (var i = 0; i < paths.length; i++) {
        try {
	    var _files = IO.FileUtils.find(paths[i], Sonoran.Resource.SDX_FILE_NAME_REGEXP);
            for (var j = 0; j < _files.length; j++) {
                var identity = File.basename(_files[j]);
		identity = identity.substring(0, identity.length-4);
		if (_filter) {
		    if (_filter !== identity.substr(0, _filter.length)) {
			continue;
		    }
		}
		var _asmName = new Sonoran.AsmName(identity);
		if (!_asmName.build) {
		    _asmName = Sonoran.Resource.Assembly.loadSDXIdentity(_files[j]);
		}
		if (filter) {
		    if (!filter.match(_asmName)) {
			continue;
		    }
		}
		files.push(_files[j]);
		asmNames.push(_asmName);
            }
        } catch (ex) {
	    // Silently ignore invalid paths
	    //QUACK(0, "EX: " + ex);
        }
    }
    var file2stat = {};
    files.forEach(function(fn) { file2stat[fn] = IO.File.stat(fn); });
    files.sort(function(fn1, fn2) { return file2stat[fn2].mtime - file2stat[fn1].mtime; });
    //QUACK(0, files.join("\n"));
    return [ files, asmNames ];
};


/**
 * Load sdx and parse assembly identity.
 * @returns {Sonoran.AsmName}
 */
Sonoran.Resource.Assembly.loadSDXIdentity = function(/** String */path) {
    var bytes;
    try {
	bytes = IO.File.readFully(path);
    } catch(ex) {
	throw new Exception(sprintf("Invalid sdx-file '%s': %s", path, ex));
    }
    var md = /^A!\s+(.+)\-(\d+)\.(\d+)\.(\d+)/.exec(bytes);
    if (!md) {
	throw new Exception(sprintf("Invalid sdx-file '%s': invalid assembly info", path));
    }
    var n = md[1];
    var maj = md[2];
    var min = md[3];
    var bld = md[4];
    var asmName = new Sonoran.AsmName(n, maj, min, bld);
    return asmName;
};























/**
 * Sonoran.Resource.Motelets  lists, loads, removes moteletsstored in a directory.
 * @class
 */
Sonoran.Resource.Motelets = {
    /**
     * Find all motelets.
     * @returns {Object} Map of motelet name to Sonoran.Resource.Motelet
     * @private
     */
    findAll: function() {
	var httpServer = Oasis.getHTTPServer();
	//var fileController;
	if (!httpServer) {
	    QUACK(0, "WARN: Motelets require an active HTTP server");
	    //throw new Exception("Motelets require an active HTTP server");
	} else {
	    ///fileController = httpServer.getFileController();
	}

	var paths = [];
	for (var i = 0; i < Sonoran.Resource.DEFAULT_MOTELETS_STORES.length; i++) {
	    var path = Sonoran.Resource.DEFAULT_MOTELETS_STORES[i];
	    if( IO.File.isDir(path) ) {
		var entries = IO.FileUtils.listDirs(path, 3);
		for (var j = 0; j < entries.length; j++) {
		    if (Sonoran.Resource.isMotelet(entries[j])) {
			paths.push(entries[j]);
		    }
		}
	    }
	}
	var ret = {};
	for(var i = 0; i < paths.length; i++) {
	    try {
		var motelet = this.load(paths[i]);
		var name = motelet.getName();
		if (ret[name]) {
		    var msg = sprintf("Ignore motelet appearing twice: %s, %s", name, paths[i]);
		    Logger.err(msg);
		} else {
		    ret[name] = motelet;
		}

		var moteletPath = motelet.getPath();
		//if (fileController) {
		  //  fileController.addRoot(moteletPath, "/motelets/"+IO.File.basename(moteletPath));
		//}
		if (httpServer && !httpServer.isRegistered(moteletPath)) {
		    httpServer.addFileHandler(moteletPath, "/motelets/"+IO.File.basename(moteletPath));
		}

	    } catch (x) {
		var msg = sprintf("Cannot load motelet '%s': %s", paths[i], x);
		Logger.err(msg);
	    }
	}
	return ret;
    },


    /**
     * Find a motelet.
     * @param name         Motelet name 
     * @throws {Exception} if motelet is not properly setup.
     * @returns {Sonoran.Resource.Motelet} motelet or null if not found
     */
    findByName: function(/** String */name) {
	var all = this.findAll();
	var motelet = all[name];
	if (!motelet) {
	    var msg = sprintf("No such motelet '%s'", name);
	    throw new Exception(msg);
	}
	return motelet;
    },


    /**
     * Load a motelet from its directory.
     * @param name         Motelet path
     * @throws {Exception} if motelet does not exist or is not properly setup.
     * @returns {Sonoran.Resource.Motelet}
     */
    load: function(/** String */path) {
	var fp = path + '/' + Sonoran.Resource.MOTELET_JSON;
	if( !IO.File.exists(fp) ) {
            throw new Exception(sprintf("Motelet definition file does not exist: %s", fp));
	}
	var descr;
	try {
            descr = eval("("+IO.File.readFully(fp)+")");
	    if( typeof(descr)==="function" )
		descr = descr();
	} catch(ex) {
            throw new Exception(sprintf("Invalid motelet.json '%s': %s", fp, ex));
	}
	var name = descr.name;
	var description = descr.description;
	var category = descr.category;
	var tags = descr.tags;

	if (!name) {
            throw new Exception(sprintf("Invalid motelet '%s': missing 'name'", path));
	}
	if (!description) {
	    description = "No description.";
	}
	if (category) {
	    if (typeof(category) !== 'string') {
		throw new Exception(sprintf("Invalid motelet '%s': invalid category string", path));
	    }
	}
	var configurations = [];
	if (!descr.configurations) {
            throw new Exception(sprintf("Invalid motelet '%s': missing 'configurations'", path));
	}
	for (var i = 0; i < descr.configurations.length; i++) {
	    var c = descr.configurations[i];
	    if (!c.name || typeof(c.name) !== 'string') {
		throw new Exception(sprintf("Invalid motelet '%s': missing 'name' in configuration", path));
	    }
	    if (!c.description) {
		c.description = "No description.";
	    }
	    //if (!c.script || typeof(c.script) !=='string') {
	//	QUACK(0, sprintf("Motelet '%s' '%s' does not have a script entry!", name, c.name));
	  //  }
	    if (!c.uri || typeof(c.uri) !=='string') {
		throw new Exception(sprintf("Invalid motelet '%s': missing 'uri' in configuration", path));
	    }
	    if (!Sonoran.Resource.CONTAINER_NAME_REGEXP.test(c.name)) {
		throw new Exception(sprintf("Invalid motelet '%s': invalid characters in configuration name '%s'", path, c.name));
	    }
	    var argv = c.argv;
	    if (!argv) {
		argv = [];
	    } else {
		if (!(argv instanceof Array)) {
		    throw new Exception(sprintf("Invalid motelet '%s': invalid 'argv' in configuration '%s'", path, c.name));
		}
	    }
	    // confScript: absolute or relative to this directory
	    if (c.script) {
		var sp = this.resolveScriptPath(path,  c.script);
		if (sp===null) {
		    throw new Exception(sprintf("Invalid motelet '%s': cannot find configuration script '%s'", path, c.script));
		}
	    }
	    var uri = this.resolveUriPath(path, c.uri);
	    if (uri===null) {
		throw new Exception(sprintf("Invalid motelet '%s': cannot find entry page '%s'", path, c.uri));
	    }
	    var conf = new Sonoran.Resource.Configuration(c.name, c.description, c.script, uri, argv);
	    configurations.push(conf);
	}
	return new Sonoran.Resource.Motelet(path, name, category, tags, description, configurations);
    },



    /**
     * Activate motelet specified by motelet name and optionally configuration name.
     * @param name1    Motelet name
     * @param name2    Configuration name, if null, first is picked
     * @param callback
     */
    start: function(/** String */name1, /** String */name2, /** DFLT_ASYNC_CB */callback) {
	if (BC.is(callback)) { return BC.exec(arguments.callee, this, arguments); }
	assert(name1 !== Sonoran.Resource.CLEANSHEET_MOTELET_NAME);

	var motelet;
	try {
	    motelet = this.findByName(name1);
	} catch(ex) {
	    Sonoran.Resource.Motelets.Current.updateStatus(Ex2ERR(ERR_GENERIC, ex, "Loading motelet failed"), callback);
	    return;
	}

	var config = null;
	if (!name2) {
	    var configs = motelet.getConfigurations();
	    if (configs.length !== 1) {
		Sonoran.Resource.Motelets.Current.updateStatus(new AOP.ERR("Motelet has multiple configurations: " + configs.join(", ")), callback);
		return;
	    }
	    config = configs[0];
	} else {
	    config = motelet.getConfiguration(name2);
	}
	if (config === null) {
	    Sonoran.Resource.Motelets.Current.updateStatus(new AOP.ERR("Motelet does not have config: " + name2), callback);
	    return;
	}

	if (Sonoran.Resource.Motelets.Current.getMotelet() !== null) {
	    var result = Sonoran.restartProcess(name1, name2, SCB);
	    assert(result.code !== 0);
	    var status = new AOP.ERR("Could not restart server: " + result);
	    Sonoran.Resource.Motelets.Current.updateStatus(status, callback);
	    return;
	}

	Sonoran.Resource.Motelets.Current.reset();
	Sonoran.Resource.Motelets.Current.motelet = motelet.getName();
	Sonoran.Resource.Motelets.Current.config = config.getName();
	Sonoran.Resource.Motelets.Current.uri = config.getUri();
	
	var _this = this;
	Sonoran.Resource.Motelets.activate(motelet, config, function(result) {
	    if (result.code != 0) {
		result = new AOP.ERR("Restoring configuration failed", result);
	    } else {
		result = new AOP.OK("Motelet up and running");
	    }
	    Sonoran.Resource.Motelets.Current.updateStatus(result, callback);
	});
    },


    /**
     * Activate a motelet.
     * @param motelet
     * @param conf
     * @param callback
     * @private
     */
    activate: function(/** Sonoran.Resource.Motelet */motelet, /** Sonoran.Resource.Configuration */conf, /** DFLT_ASYNC_CB */callback) {
	if (BC.is(callback)) { return BC.exec(arguments.callee, this, arguments); }

	var httpServer = Oasis.getHTTPServer();
	if (!httpServer) {
	    Sonoran.Resource.Motelets.Current.updateStatus(new AOP.ERR("No active HTTP server"), callback);
	    return;
	}
	//var fileController = httpServer.getFileController();

	var moteletPath = motelet.getPath();
	var scriptPath;
	if (conf.getScript()) {
	    scriptPath = this.resolveScriptPath(moteletPath, conf.getScript());
	    if (!scriptPath) {
		QUACK(0, sprintf("Motelet '%s' '%s' does not have a script entry!", motelet.getName(), conf.getName()));
	    }
	}

	try {
	    IO.File.chdir(moteletPath);
	} catch (x) {
	    Sonoran.Resource.Motelets.Current.updateStatus(
		Ex2ERR(ERR_GENERIC, x,
		       sprintf("Motelet <%s> cannot change working directory to `%s': %s",
			       motelet.getName(), moteletPath, x.toString())),
		callback);
	    return;
	}

	var finishf = function(result) {
	    assert(typeof(result.code)==='number');
	    Sonoran.Resource.Motelets.Current.status = result;
            callback(result);
	};
	var scriptf = function() {
	    // Map current motelet dir under uri: /motelet/
	    //fileController.addRoot(moteletPath, "/motelet");
	    if (httpServer && !httpServer.isRegistered(moteletPath)) {
		httpServer.addFileHandler(moteletPath, "/motelet");
	    }
	    if (!scriptPath) {
		finishf(new AOP.OK());
	    } else {
		var f = function(result) {
		    if (result.code !== 0) {
			result = new AOP.ERR("Execution of configuration script failed", result);
		    } else {
			result = new AOP.OK(motelet);
		    }
		    finishf(result);
		};
		var shell = new CLI.Shell(false);
		shell.execFile(scriptPath, conf.getArgv(), null, f);
	    }
	};
	Sonoran.cleanSheet(function(result) {
			       if (result.code !== 0) {
				   finishf(result);
			       } else {
				   scriptf();
			       }
			   });
    },


    /**
     * Delete motelet directory and all of its contents.
     * @param name
     */
    remove: function(/** String */name) {
	var motelet = this.findByName(name);
	var path = motelet.getPath();
	try {
            IO.FileUtils.rm_r(path);
	} catch(ex) {
            throw new Exception(sprintf("Cannot delete motelet directory '%s': %s", path, ex));
	}
	Sonoran.Resource.onChangeListeners.notify();
    },


    /**
     * Resolve full path to a configuration script.
     * @param motelet
     * @param conf
     * @private
     */
    resolveScriptPath: function(/** Sonoran.Resource.Motelet */moteletPath, /** String */scriptPath) {
	assert(typeof(scriptPath) === 'string');
	assert(typeof(moteletPath) === 'string');
	if (!/^(([a-zA-z]:)?[\/\\]|~\w*\/)/.exec(scriptPath))
	    scriptPath = moteletPath + '/' + scriptPath; // relative to where motelet lives
	if (IO.File.exists(scriptPath))
	    return scriptPath;
	return null;
    },


    /**
     * Resolve full path to a configuration script.
     * @param motelet
     * @param conf
     * @private
     */
    resolveUriPath: function(/** Sonoran.Resource.Motelet */moteletPath, /** String */uri) {
	assert(typeof(uri) === 'string');
	assert(typeof(moteletPath) === 'string');
	var path;
	if( uri.indexOf("/")==0 ) {
	    return uri;
	}
	path = moteletPath + '/' + uri;
	if (IO.File.exists(path)) {
	    return "/motelets/" + IO.File.basename(moteletPath) + '/' + uri;
	}
	return null;
    }
};


/**
 * Describes the currently running motelet and configuration.
 * @class
 */
Sonoran.Resource.Motelets.Current = {
    /**
     * Last started motelet.
     * @type String
     * @private
     */
    motelet: null,

    /**
     * Last started config.
     * @type String
     * @private
     */
    config: null,

    /**
     * Last started config uri.
     * @type String
     * @private
     */
    uri: null,

    /**
     * Error or OK for last started motelet
     * @type AOP.Result
     * @private
     */
    status: null,

    
    /**
     * @returns {String} Name of running motelet or null
     */
    getMotelet: function() {
	return this.motelet;
    },


    /**
     * @returns {String} Name of last started config or null
     */
    getConfig: function() {
	return this.config;
    },


    /**
     * @returns {String} Uri of last started config or null
     */
    getUri: function() {
	return this.uri;
    },


    /**
     * @returns {AOP.Result}
     */
    getStatus: function() {
	return this.status;
    },


   /**
    * Returns object with available motelets, current motelet, config and status.
    * @returns {Object} with properties motelets, motelet, config, status
    */
    getDescr: function() {
	var ret = {
	    motelets: Sonoran.Resource.listResources("m").motelets,
	    motelet: this.motelet,
	    config: this.config,
	    uri: this.uri,
	    status: this.status
	};
	return ret;
    },

    /**
     * @private
     */
    updateStatus: function(/** AOP.Result */result, /** DFLT_ASYNC_CB */callback) {
	if (result === null) {
	    assert(this.motelet===null);	    
	    result = new AOP.OK();
	} else {
	    if (result.code !== 0) {
		result = new AOP.ERR(ERR_GENERIC, result.getMessage());
	    }
	    this.status = result;
	}
	var ev = new Sonoran.Event.Motelet(this.motelet, this.config, this.uri, this.status);
	Sonoran.Registry.signalEvent(ev);

	callback(result);
    },

    /**
     * @private
     */
    reset: function() {
	this.motelet = null;
	this.config = null;
	this.status = null;
    }
};





/**
 * Sonoran.Resource.GAC provides convenience access to the GAC.
 * @class
 */
Sonoran.Resource.GAC = {
   /**
    * Lookup assembly resources in the gac. 
    * @param name  Assembly identity or name
    * @param path  Optional
    * @returns {Sonoran.Resource.Assembly[]} assembly resources or null
    */
   lookup: function(/** String|Sonoran.AsmName */name, /** String */path) {
      if (!path) {
         path = Sonoran.Resource.getGACDir();
      }
      if (typeof(name) === 'string') {
         name = new Sonoran.AsmName(name);
      }
      var resources = Sonoran.Resource.Assembly.getSBAs(path, name);
      return resources;
   },

   /**
    * List assembly resources in GAC.
    * @param path Optional, path to GAC, default path is GAC in mote runner installation
    * @returns {Sonoran.Resource.Assembly} assembly resouces
    */
   list: function(/** String */path) {
      if (!path) {
         path = Sonoran.Resource.getGACDir();
      }
      var resources = Sonoran.Resource.Assembly.getSBAs(path);
      return resources;
   },

   
   /**
    * Remove assemblies matching pattern specified by name.
    * @param name   Assembly identity (String) or assembly name
    * @param path   Optional, path to GAC
    */
   remove: function(/** String|Sonoran.AsmName */name, /** String */path) {
       if (!path) {
           path = Sonoran.Resource.getGACDir();
       }
       if (typeof(name) === 'string') {
           name = new Sonoran.AsmName(name);
       }
       var resources = Sonoran.Resource.Assembly.getSBAs(path, name);
       for (var i = 0; i < resources.length; i++) {
           resources[i].remove();
           Sonoran.Resource.onChangeListeners.notify();
      }
   }
};



























/**
 * Commands.Resource
 * @namespace Sonoran.CLI.Commands.Resource
 * @private
 */
Sonoran.CLI.Commands.Resource = {};

/**
 * @private
 */
Sonoran.CLI.Commands.Resource.USAGE = "Save, restore and manage resources in the GAC or share folder.";

/**
 * @private
 */
Sonoran.CLI.Commands.Resource.DESCRIPTION =
    "The 'resource'-commands allow to save and manage a set of scripts and assemblies.\n" +
    "Use 'resource-info' to print information about available motelets and assemblies.\n" +
    "Use 'resource-remove' to remove a resource.\n" +
    "Use 'resource-list' to list available resources.\n" +
    "Use 'resource-activate' to start a motelet or script.";
   





/**
 * Resourced info command
 * @class
 * @private
 */
Sonoran.CLI.Commands.Resource.InfoCommand = function(/** CLI.Shell */shell, /** String */name) {
    this.description = 
	"Print information about a resource. If the specified name is 'gac', the contents of the gac are listed,\n" +
	"otherwise the contents of the motelet of that name is listed.";
    this.nameSpec = new GetOpt.Simple("name");
    CLI.Command.call(this, shell, name, [ this.nameSpec, new GetOpt.EndOfArgs() ]);
};

/** @private */
Sonoran.CLI.Commands.Resource.InfoCommand.prototype = extend(
    CLI.Command.prototype,
    {
	/** @private */
       exec: function(callback) {
           var name = this.nameSpec.getArg();
           var txt;
	   if (name === 'gac') {
               var resources = Sonoran.Resource.GAC.list();
	       var t = new Formatter.Table2(4);
	       t.setTitle("Index", "Name", "Size", "Date");
               for (var i = 0; i < resources.length; i++) {
		   t.addRow(i, resources[i].basename, resources[i].getSize(), resources[i].getMTimeS());
               }
               txt = t.render().join("\n");
           } else {
               var resource = resource = Sonoran.Resource.Motelets.findByName(name);
               txt = resource.toString();
               txt += "\nContents:\n\t";
	       txt += IO.File.listDir(resource.getPath()).join("\n\t");
           }
	   callback(new AOP.OK(txt));
       }
   }
);





/**
 * Resource remove command
 * @class
 * @private
 */
Sonoran.CLI.Commands.Resource.RemoveCommand = function(/** CLI.Shell */shell, /** String */name) {
   this.description = "Remove a resource from the repository, either a script, assembly or motelet";
   this.nameSpec = new GetOpt.Simple("name");
   CLI.Command.call(this, shell, name, [ this.nameSpec, new GetOpt.EndOfArgs() ]);
};

/** @private */
Sonoran.CLI.Commands.Resource.RemoveCommand.prototype = extend(
   CLI.Command.prototype,
   {
      /** @private */
      exec: function(callback) {
         var name = this.nameSpec.getArg();
         Sonoran.Resource.removeResource(name);
	 callback(new AOP.OK());
      }
   }
);




/**
 * Configuration list command
 * @class
 * @private
 */
Sonoran.CLI.Commands.Resource.ListCommand = function(/** CLI.Shell */shell, /** String */name) {
   this.description = "List resources stored in the 'share' folder and gac.";
   this.typeSpec = new GetOpt.Keywords(null, "configuration|motelet|script|assembly", [ "c", "m", "s", "a" ]);
   CLI.Command.call(this, shell, name, [ this.typeSpec, new GetOpt.EndOfArgs() ], 0);
};

/** @private */
Sonoran.CLI.Commands.Resource.ListCommand.prototype = extend(
   CLI.Command.prototype,
   {
      /** @private */
      exec: function(callback) {
         var type = this.typeSpec.getSelectedKeyword();
         var ret = Sonoran.Resource.listResources(type);
	 callback(new AOP.OK(ret));
      }
   }
);




/**
 * Configuration scan command
 * @class
 * @private
 */
Sonoran.CLI.Commands.Resource.ScanCommand = function(/** CLI.Shell */shell, /** String */name) {
   this.description = "Scan resources stored in the 'share' folder and gac and fire an update event.";
   CLI.Command.call(this, shell, name);
};

/** @private */
Sonoran.CLI.Commands.Resource.ScanCommand.prototype = extend(
   CLI.Command.prototype,
   {
      /** @private */
      exec: function(callback) {
         var ret = Sonoran.Resource.scanResources();
	 callback(new AOP.OK(ret));
      }
   }
);



/**
 * Restore configuration, script or motelet.
 * @class
 * @private
 */
Sonoran.CLI.Commands.Resource.ActivateCommand = function(/** CLI.Shell */shell, /** String */name) {
    this.description =
	"Activate script or motelet:\n" +
	"r-a script.mrsh\n" +
	"r-a motelet_name configuration_name\n" + 
	"r-a motelet_name\n";
    this.name1Spec = new GetOpt.Simple("Resource-Name");
    this.name2Spec = new GetOpt.Simple("Resource-Name");
    CLI.Command.call(this, shell, name, [ this.name1Spec, this.name2Spec, new GetOpt.EndOfArgs() ], 0);
};

/** @private */
Sonoran.CLI.Commands.Resource.ActivateCommand.prototype = extend(
   CLI.Command.prototype,
   {
      /** @private */
      exec: function(callback) {
          var name1 = this.name1Spec.getArg();
          var name2 = this.name2Spec.getArg();
	  if (!name1) {
	      callback(new AOP.OK(Sonoran.Resource.Motelets.currentMotelet));
	      return;
	  }

          if (CLI.Shell.isScript(name1)) {
              var path = Sonoran.Resource.Scripts.get(name1);
              if (!path) {
		  callback(new AOP.ERR("No such script found: " + name1));
		  return;
              }
              this.shell.execFile(path, undefined, { verbose: false }, function(result) {
		  if (result.code !== 0) {
		      result = new AOP.ERR(ERR_GENERIC, "Executing script failed", result);
		  }
		  callback(result);
	      });
              return;
          }

	  Sonoran.Resource.Motelets.start(name1, name2, callback);
      }
   }
);


CLI.commandFactory.addModule("Sonoran.CLI.Commands.Resource", true);
