//  (C) COPYRIGHT INTERNATIONAL BUSINESS MACHINES CORPORATION 2006-2010
//                       ALL RIGHTS RESERVED
//        IBM Research Division, Zurich Research Laboratory
// --------------------------------------------------------------------


/**
 * Sonoran.Resource handles Sonoran resources such as 
 * mote runner scripts, assemblies and web applications.
 * @namespace Sonoran.Resource
 */
Sonoran.Resource = {};



/**
 * A Sonoran.Resource.Contents instance lists the assemblies, scripts and motelets known
 * to the server.
 * @class
 * @constructor
 * @private
 */
Sonoran.Resource.Contents = function() {
   /**
    * @type Sonoran.AsmName[]
    * @private
    */
   this.assemblies = null;
   /**
    * @type String[]
    * @private
    */
   this.scripts = null;
   /**
    * Configuration descriptors.
    * @type Sonoran.Resource.Configuration[]
    * @private
    */
   this.configurations = null;
   /**
    * Motelet descriptors.
    * @type Sonoran.Resource.Motelet[]
    * @private
    */
   this.motelets = null;
};


/** @private */
Sonoran.Resource.Contents.prototype = {
   /** @ignore */
   __constr__: "Sonoran.Resource.Contents",
   
   /**
    * @returns {String} a string
    * @ignore
    */
   toString: function() {
      var txt = "";
      if (this.assemblies) {
         txt += "Assemblies:\n\t";
         txt += this.assemblies.join("\n\t");
         txt += "\n";
      }
      if (this.scripts) {
         txt += "Scripts:\n\t";
         txt += this.scripts.join("\n\t");
         txt += "\n";
      }
      if (this.configurations) {
         txt += "Configurations:\n\t";
         txt += this.configurations.map(function(c) { return c.name; }).join("\n\t");
         txt += "\n";
      }
      if (this.motelets) {
         txt += "Motelets:\n\t";
         txt += this.motelets.map(function(c) { return c.name; }).join("\n\t");
         txt += "\n";
      }
      return txt;
   }
};



/**
 * A Sonoran.Resource.Configuration instance describes a configuration of a motelet.
 * @class
 * @constructor
 */
Sonoran.Resource.Configuration = function(/** String */name, /** String */description, /** String */script, /** String */uri, /** String */argv) {
    assert(arguments.length===5);
    this.name = name;
    this.description = description;
    this.script = script;
    this.uri = uri;
    this.argv = argv;
};

/** Prototype */
Sonoran.Resource.Configuration.prototype = {
   /** @ignore */
   __constr__: "Sonoran.Resource.Configuration",

   /**
    * Returns the configuration name.
    * @returns {String} the name
    */
   getName: function() {
       return this.name;
   },

   
   /**
    * Returns the configuration uri.
    * @returns {String} the uri
    */
   getUri: function() {
       return this.uri;
   },


   /**
    * Returns the configuration script entry.
    * @returns {String} the main script to execute
    */
   getScript: function() {
       return this.script;
   },


   /**
    * Returns the configuration description.
    * @returns {String} the description
    */
   getDescription: function() {
       return this.description;
   },

    /**
    * Returns the configuration script parameters.
     * @returns String[] 
     */
    getArgv: function() {
	return this.argv;
    },


   /**
    * @returns {String} string
    */
   toString: function() {
      return "Configuration: " + this.name + ", " + this.uri + ", " + this.script;
   }
};




/**
 * A Sonoran.Resource.Motelet instance describes a motelet. A motelet is a web-app which bundles
 * HTML resources with client- and server-side Javascript and Mote Runner resources like assemblies.
 * @class
 * @constructor
 * @param path
 * @param name
 * @param category
 * @param tags
 * @param description
 * @param configurations
 */
Sonoran.Resource.Motelet = function(/** String */path, /** String */name, /** String */category, /** String */tags, /** String */description, /** Sonoran.Resource.Configuration[] */configurations) {
    assert(arguments.length===6);
    this.path = path;
    this.name = name;
    this.category = category;
    this.tags = tags;
    this.description = description;
    this.configurations = configurations;
};

/** Prototype */
Sonoran.Resource.Motelet.prototype = {
   /** @ignore */
   __constr__: "Sonoran.Resource.Motelet",

   /**
    * Returns motelet name
    * @returns {String} the name
    */
   getName: function() {
       return this.name;
   },


   /**
    * Returns motelet description.
    * @returns {String} the description
    */
   getDescription: function() {
       return this.description;
   },

   
   /**
    * Returns motelet category.
    * @returns {String} the category
    */
   getCategory: function() {
       return this.category;
   },


   /**
    * Returns motelet tags.
    * @returns {String[]} the tags or null
    */
   getTags: function() {
       return this.tags;
   },


   /**
    * Returns motelet path.
    * @returns {String} the path
    */
   getPath: function() {
       return this.path;
   },


   /**
    * Returns the motelet configurations.
    * @returns {Sonoran.Resource.Configuration[]} the configurations
    */
   getConfigurations: function() {
       return this.configurations;
   },


   /**
    * Returns the motelet configuration or null if not found.
    * @returns {Sonoran.Resource.Configuration} the configuration or null
    */
   getConfiguration: function(/** String */name) {
      var configurations = this.configurations;
      for (var i = 0; i < configurations.length; i++) {
          if (configurations[i].name === name) {
             return configurations[i];
          }
      }
      return null;
   },


    /**
     * Return object as to be dumped for motelet.json.
     * @returns {Object}
     */
    getMoteletJson: function() {
	var obj = {
	    name: this.name,
	    description: this.description?this.description:"No description.",
	    configurations: []
	};
	for (var i = 0; i < this.configurations.length; i++) {
	    var c = this.configurations[i];
	    obj.configurations.push({
		name: c.name,
		description: c.description?c.description:"No description.",
		script: c.script,
		uri: c.uri
	    });
	}
	return obj;
    },

   /**
    * @returns {String} string
    */
   toString: function() {
      var s = this.configurations.map(
	  function(c) { 
	      return c.getName() + ':' + c.getUri() + ":" + (c.getScript()?c.getScript():"null");
	  }
      ).join("\n  ");
      return "Motelet: " + this.name + "@" + this.path + "\nConfigurations:\n  " + s;
   }
};
