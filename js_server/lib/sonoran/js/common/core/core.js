//  (C) COPYRIGHT INTERNATIONAL BUSINESS MACHINES CORPORATION 2006-2010
//                       ALL RIGHTS RESERVED
//        IBM Research Division, Zurich Research Laboratory
// --------------------------------------------------------------------



/**
 * Provides access to global context.
 * @private
 */
GLOBAL_CONTEXT = this;





/**
 * Defines error names and codes.
 * @class
 */
var Errors = {
    /**
     * Maps error name to number (module + code).
     * @type Object
     * @static
     * @private
     */
    name2error: {},

    /**
     * Maps error number (module + code) to name.
     * @type Object
     * @static
     * @private
     */
    error2name: {},

    /**
     * Maps error name to description.
     * @type Object
     * @static
     * @private
     */
    name2descr: {},

    /**
     * @type Number
     * @static
     * @private
     */
    MOD_SHIFT: 16,

    /**
     * @type Number
     * @static
     * @private
     */
    CODE_MASK: 0xffff,

    /**
     * Define an error module and error codes. If the error module already exists,
     * the new error codes are added.
     * <pre>
     * Errors.define("My.Module", "ERR_1", "ERR_1 description...", 3, "ERR_2", "ERR_2 description..");
     * if (ret == My.Module.ERR_1) { 
     *   ...
     * </pre>
     * @param ns Error module name, a valid Javascript namespace
     * @param args..   A sequence of string denoting the error names.
     *                 First member gets value 1, next members increasing values.
     *                 Numbering can be changed by inserting a number before a member name.
     */
    define: function(/** String */ns) {
	assert(arguments.length>=1);

	//QUACK(0, "DEFINE: " + ns);
	var root;
	if (!ns) {
	    ns = "";
	    root = GLOBAL_CONTEXT;
	} else {
	    root = Blob.peek(ns);
	    if (root === undefined) {
		Blob.poke(ns, {});
		root = Blob.peek(ns);
	    }
	}
	//QUACK(0, "DEFINE2: " + Blob.map(root, true));

	var mod, code, error;

	error = this.name2error[ns];
	if (error !== undefined) {
	    var arr = this.splitError(error);
	    mod = arr[0];
	    code = arr[1];
	    if (code !== 0) {
		throw sprintf("Symbol '%s' points to an already defined error!", ns);
	    }
	    // module exists
	    code = this.findFreeCode(ns);
	    
	} else {
	    // module does not exist
	    mod = this.findFreeMod();
	    error = this.genError(mod, 0);
	    this.name2error[ns] = error;
	    this.error2name[error] = ns;
	    code = 1;
	}
	assert(code !== undefined);

	//QUACK(0, "DEFINE3: " + ns + ", " + mod + ", " + code);
	var i = 1;
	while(i < arguments.length) {
	    var descr;
	    var ai = arguments[i];
	    if (typeof(ai)==='number') {
		code = ai;
		assert(code>=1, "Error codes must be greater than zero");
		i += 1;
	    } 
	    var ai = arguments[i];
	    assert(ai && ai.length>0, "Missing argument");
	    assert(typeof(ai)==='string', "Invalid order of arguments: code name description ...");
	    var name = (ns.length>0) ? ns + "." + ai : ai;
	    error = this.genError(mod, code);
	    i += 1;

	    var ai = arguments[i];
	    assert(ai && ai.length>0, "Missing argument");
	    assert(typeof(ai)==='string', "Invalid order of arguments: code name description ...");
	    descr = ai;
	    i += 1;
	    
	    if (this.name2error[name]) {
		throw sprintf("Error '%s' already defined", name);
	    }
	    if (this.error2name[error]) {
		throw sprintf("Error code 0x%x already defined by '%s'", error, this.error2name[error]);
	    }

	    this.name2error[name] = error;
	    this.error2name[error] = name;
	    this.name2descr[name] = descr;

	    //QUACK(0, "DEFINE3: " + name + ", " + error + ", " + descr);
	    Blob.poke(name, error); 
	    code++;
	}
    },


    /**
     * @returns {Number}
     * @private
     */
    findFreeMod: function() {
	var mod = 1;
	var code = 0;
	while(true) {
	    var error = this.genError(mod, code);
	    if (this.error2name[error]===undefined) {
		return mod;
	    }
	    mod += 1;
	}
    },


    /**
     * @param module
     * @returns {Number}
     * @private
     */
    findFreeCode: function(/** String */module) {
	var code = 0;
	var re = new RegExp(RegExp.escape(module) + "\.");
	for (var name in this.name2error) {
	    if (re.test(name)) {
		var error = this.name2error[name];
		var arr = this.splitError(error);
		var _code = arr[1];
		if (_code > code) {
		    code = _code;
		}
	    }
	}
	code += 1;
	return code;
    },


    /**
     * Create error from module identifier and code.
     * @param mod  Module id or name
     * @param code Error code without module masked in
     * @returns {Number} unique error code
     * @private
     */
    genError: function(/** Number|String */mod, /** Number */code) {
	if (typeof(mod)==='string') {
	    var error = this.name2error[mod];
	    if (error === undefined) {
		throw "No such namespace: " + mod;
	    }
	    var arr = this.splitError(error);
	    mod = arr[0];
	    if (arr[1] !== 0) {
		throw sprintf("Module name points to error: '%s'", mod);
	    }
	    return this.genError(mod, code);
	}
	return (mod << this.MOD_SHIFT) | code;
    },


    /**
     * Split unqique error code in module and code.
     * @returns {Number[]} module id and error code
     * @private
     */
    splitError: function(/** Number */error) {
	return [ (error >> Errors.MOD_SHIFT) & Errors.CODE_MASK, error & Errors.CODE_MASK ];
    },


    /**
     * Returns module name for a specified error.
     * @param error  Error containing module and code
     * @returns {String} module name or empty string
     */
    getModuleName: function(/** Number */error) {
	var arr = this.splitError(error);
	var mod = arr[0]; var code = arr[1];
	var modName = this.error2name[this.genError(mod, 0)];
	return (modName===undefined) ? "" : modName;
    },


    /**
     * Returns the name of the error in its defining module.
     * @param error  Error containing module and code
     * @returns {String} error code name (without module name) or empty string
     */
    getCodeName: function(/** Number */error) {
	var codeName = this.error2name[error];
	return codeName===undefined ? "" : codeName;
    },



    /**
     * Format a global error.
     * <pre>
     * Errors.define("My.Module", "ERR_1", 3, "ERR_2");
     * var str = Errors.format(My.Module.ERR_1);   // -> "My.Module:ER_1"
     * </pre>
     * @param error  Value of an error constant as generated by Errors.define
     * @param shortText  Short or long version
     * @returns {String}
     */
    format: function(/** Number */error, /** Boolean */shortText) {
	var arr = this.splitError(error);
	var mod = arr[0]; var code = arr[1];
	var modName = this.error2name[this.genError(mod, 0)];
	if (modName===undefined) {
	    return sprintf("%2x:%2x", mod, code);
	}
	var codeName = this.error2name[error];

	if (shortText) {
	    if (codeName===undefined) {
		return (modName.length==0) ? sprintf("%2x", code) : sprintf("%s:%2x", modName, code);
	    }
	    var sa = codeName.split(".");
	    return sa.length>0 ? sa[sa.length-1] : codeName;

	} else {
	    if (codeName===undefined) {
		return (modName.length==0) ? sprintf("%2x", code) : sprintf("%s:%2x", modName, code);
	    }
	    var sa = codeName.split(".");
	    return (modName.length==0) ? sprintf("%s:%x", sa[sa.length-1], error) : sprintf("%s:%s:%x", modName, sa[sa.length-1], error);
	}
    },


    /**
     * Returns name of error module and code.
     * <pre>
     * Errors.define("My.Module", "ERR_1", 3, "ERR_2");
     * var arr = Errors.resolve(My.Module.ERR_1);   // -> [ "My.Module", "ERR_1" ]
     * </pre>
     * @param error  Value of an error constant as generated by Errors.define
     * @returns {String[]} Array with name of error module and name of error code
     */
    resolve: function(/** Number */error) {
	//QUACK(0, "RESOLVE: " + error);
	var arr = this.splitError(error);
	var mod = arr[0]; var code = arr[1];
	//QUACK(0, "RESOLVE: " + mod + ", " + code);

	var modName = this.error2name[this.genError(mod, 0)];
	if (modName===undefined) {
	    throw sprintf("No such registered module for: %2x:%2x", mod, code); 
	}
	var codeName = this.error2name[error];
	if (codeName===undefined) {
	    throw sprintf("No such registered code for: %s:%2x", modName, code); 
	}
	var sa = codeName.split(".");
	return [ modName, sa[sa.length-1] ];
    },


    /**
     * Returns all defined error modules.
     * @returns {String[]} List of error module names
     */
    getModules: function() {
	var names = [];
	for (var name in this.name2error) {
	    var error = this.name2error[name];
	    var a = this.splitError(error);
	    var mod = a[0]; var code = a[1];
	    if (code === 0) {
		names.push(name);
	    }
	}
	return names.sort(function (a,b) { 
	    return (a===b) ? 0 : (a<b ? -1 : 1);
	});
    },

    /**
     * @private
     */
    isModule: function(/** String */name) {
	if (name.length===0) {
	    return true;
	}
	var error = this.name2error[name];
	var a = this.splitError(error);
	var mod = a[0]; var code = a[1];
	return (code === 0);
    },


    /**
     * Returns for a module a map of error name to error value. The module
     * name is not part of the returned error names.
     * @returns {Object} Map of error name to error value. 
     */
    getName2Error: function(/** String */module) {
	if (!module) {
	    module = "";
	}
	var ret = {};
	if (module.length===0) {
	    for (var name in this.name2error) {
		if (!this.isModule(name) && (name.indexOf('.') < 0)) {
		    var error = this.name2error[name];
		    ret[name] = error;
		}
	    }
	    return ret;
	} else {
	    var re = new RegExp(RegExp.escape(module) + "\.");
	    for (var name in this.name2error) {
		if (re.test(name)) {
		    var error = this.name2error[name];
		    var s = name.substr(module.length+1);
		    ret[s] = error;
		}
	    }
	}
	return ret;
    },


    /**
     * @returns {String}
     */
    toString: function() {
	var modules = this.getModules();
	var lines = [];
	var name, error;
	var name2err = this.getName2Error("");
	for (var i = 0; i < modules.length; i++) {
	    var module = modules[i];
	    error = this.name2error[module];
	    lines.push(sprintf("%-40s %x", module.length===0?"Core":module, error));
	    name2err = this.getName2Error(module);
	    for (name in name2err) {
		error = name2err[name];
		lines.push(sprintf("\t%-40s %x", name, error));
	    }
	}
	return lines.join("\n");
    }
};



































if (!Function.prototype.bind) {  
  Function.prototype.bind = function (oThis) {  
    if (typeof this !== "function") {  
      // closest thing possible to the ECMAScript 5 internal IsCallable function  
      throw new TypeError("Function.prototype.bind - what is trying to be bound is not callable");  
    }  
  
    var aArgs = Array.prototype.slice.call(arguments, 1),   
        fToBind = this,   
        fNOP = function () {},  
        fBound = function () {  
          return fToBind.apply(this instanceof fNOP  
                                 ? this  
                                 : oThis || window,  
                               aArgs.concat(Array.prototype.slice.call(arguments)));  
        };  
  
    fNOP.prototype = this.prototype;  
    fBound.prototype = new fNOP();  
  
    return fBound;  
  };  
}  










/**
 * Implements a prototyp-based inheritance system supporting object serialization/deserialization
 * between client and server.
 * @class
 * @static
 */
Class = {
    /**
     * Defines class with name 'className' in the global context, inheriting from specified parent.
     * <ul>
     * <li>
     * The specified 'properties' must have a function __constr__ which implements the constructor for the class.
     * </li>
     * <li>
     * The class defines a property __constr__ in each instance for internal use.
     * </li>
     * <li>
     * The class constructor function (i.e. class name) receives a property __super__ which points to the prototpe of the specified parent
     * </li>
     * <li>
     * If 'statics' are provided, its properties are added to the class constructor function
     * </li>
     * <ul>
     * @param className       Name of class, the constructor function for the class is bound under that name in the global context
     * @param superConstrFunc Identifies the super class, the name  of the super class constructor function; if null, the class inherits from Object
     * @param properties      Map of properties to add to new class instances
     * @param statics      Map of properties to add to class constructor
     * @param overwrite
     * @returns {Function} Class constructor function
     * @private
     */
    construct: function(/** String */className, /** Function */parent, /** Object */properties, /** Object */statics, /** Boolean */overwrite) {
	assert(properties, "No properties for class specified: " + className);
	assert(typeof(properties)==='object', "Require object type for properties for class: " + className);
	var parentProto;
	if (!parent) {
	    parentProto = Object.prototype;
	    parent = Object;
	} else {
	    assert(typeof(parent)==='function', "Require function type for parent for class: " + className);
	    parentProto = parent.prototype;
	    assert(parentProto);
	    assert(typeof(parentProto)==='object');
	}
	
	var sa = className.split('.');
	var ns = GLOBAL_CONTEXT;
	for (var i = 0; i < sa.length-1; i++) {
	    if (sa[i].length===0) {
		throw "Invalid class name: " + className;
	    }
            ns = ns[sa[i]];
            if (!ns) {
		throw "Namespace path to class name is not fully defined: " + className + ", " + sa[i];
            }
	}
	var cn = sa[sa.length-1];
	if (ns[cn] && !overwrite) {
            throw "A symbol for the classname is already defined: " + className;
	}

	var __constr__ = properties['__constr__'];
	if (!__constr__ || (typeof(__constr__) !== 'function')) {
            throw "No or invalid __constr__ function specified in properties for class: " + className;
	}

	var child = ns[cn] = __constr__;
	delete properties['__constr__'];
	
	child.prototype = Object.create(parentProto);
	child.__super__ = parentProto;
	var p;
	for (p in properties) {
	    var v = properties[p]; 
	    child.prototype[p] = v;
	}
	child.prototype["__constr__"] = className;

	child.extend = function(name, properties, statics) {
	    Class.construct(name, child, properties, statics);
	};

	if (statics) {
	    for (p in statics) {
		var v = statics[p];
		child[p] = v;
	    }
	}
	return child;
    },


    /**
     * Class.extend creates a class and sets the constructor function at the specified path
     * in the global context.<br/>
     * Instances of the class contain the property "__clazz__" pointing to the class name. The
     * constructor function gets a function property with the name "extend" which can be used to create
     * a derived class from the generated class. 'Class.extend' generates a constructor
     * function for instances inheriting the Object prototype.<br/>
     * The specified properties parameter for the class contains the properties added to the 
     * target prototype. It must contain a function property __constr__ which defines the 
     * constructor function for the target class.<br/>
     * The __clazz__ property of the instances of the target class are used for instance in
     * Blob.marshal and Blob.unmarshal to map object types to JSON data and vice versa.<br/>
     * The constructor function at the specified class name gets a property __super__ which
     * points to the super constructor function.<br/>
     * If 'statics' are provided, its properties are added to the class constructor function.
     * <pre>
     * Class.extend("Modul.A", {
     *   prop1: 1,
     *   __constr__: function() {
     *    ...
     *   },
     *   m1: function() {
     *     ...
     *   }
     * ...
     * Modul.A.extend("Modul.B", {
     *   prop2: 1,
     *   __constr__: function() {
     *     Modul.A.call(this);
     *   },
     * ...
     * var a = new Modul.A();
     * var b = new Modul.B();
     * <pre/>
     * @param className
     * @param properties  Instance properties, requires __constr__ to point to constructor
     * @param statics     Static properties, added to class constructor function
     * @returns {Function} Class constructor function
     */
    extend: function(/** String */className, /** Object */properties, /** Object */statics) {
	return this.construct(className, Object, properties, statics);
    },


    /**
     * Define a class. 
     * @param className
     * @param properties
     * @param statics
     * @see Class#extend
     * @returns {Function} Class constructor function
     */
    define: function(/** String */className, /** Object */properties, /** Object */statics) {
	return Class.extend(className, properties, statics);
    },


    /**
     * Iterate over all non-function properties of an object created from a class.
     */
    forEachField: function(/** Object */obj, /** Function */f) {
	assert(obj.__constr__);
	for (var name in obj) {
	    if (name === "__constr__") {
		continue;
	    }
	    var value = obj[name];
	    if (typeof(value)==='function') {
		continue;
	    }
	    f(name, value);
	}
    }
};



/**
 * @see Class.construct
 * @ignore
 */
construct = Class.construct;


















if (typeof(Error.captureStackTrace) === "undefined") {
    Error.captureStackTrace = function(obj, clazz) {
	var callstack = [];
	var isCallstackPopulated = false;
	try {
	    i.dont.exist += 0; 
	} catch(e) {
	    if (e.stack) { //Firefox
		var lines = e.stack.split('\n');
		for (var i=0, len=lines.length; i < len; i++) {
		    if (lines[i].match(/^\s*.+\:\d+$/)) {
			callstack.push(lines[i]);
		    }
		}
		//Remove call to printStackTrace()
		callstack.shift();
		isCallstackPopulated = true;
	    }
	}
	if (!isCallstackPopulated) { //IE and Safari
	    var currentFunction = arguments.callee.caller;
	    while (currentFunction) {
		var fn = currentFunction.toString();
		var fname = fn.substring(fn.indexOf('function') + 8, fn.indexOf('')) || 'anonymous';
		callstack.push(fname);
		currentFunction = currentFunction.caller;
	    }
	}
	obj.stack = callstack.join("\n");
    };
}













Class.construct(
   "Exception",
   Error,
   /**
    * @lends Exception.prototype
    * @private
    */
   {
       /**
	* The base class for exceptions.
	* @augments Error
	* @constructs
	* @param message    Error message
	* @param code       Error code, if 'undefined', ERR_GENERIC
	* @param stack      Stacktrace, if 'undefined', current stack trace is retrieved
	* @param cause      Optional exception having led to this exception
	* @param data       Optional data property
	*/
       __constr__: function(/** String */message, /** Number */code, /** String */stack, /** Exception */cause, /** Object */data) {
	   assert(message);
	   Exception.__super__.constructor.call(this, message);
           //Error.call(this, message);
	   if (!stack) {
	       Error.captureStackTrace(this, Exception);
	   } else {
	       this.stack = stack;
	   }
	   this.message = message;
	   this.code = code;
	   if (this.code===undefined) {
	       this.code = ERR_GENERIC;
	   }
	   this.cause = cause;
	   assert(!this.cause||(this.cause instanceof Exception));
	   this.name = this['__constr__'];
	   this.data = data;
       },

       /**
	* Error code
	* @type Number
	* @private
	*/
       code: 1,
       /**
	* Error message
	* @type String
	* @private
	*/
       message: "",
       /**
	* Exception class name
	* @type String
	* @private
	*/
       name: "",
       /**
	* Stack trace
	* @type String
	* @private
	*/
       stack: null,
       /**
	* Origin
	* @type Exception
	* @private
	*/
       cause: null,
       /**
	* Optional data property.
	* @type Object
	* @private
	*/
       data: null,
       /**
	* The error code.
	* @returns {Number} error code
	*/
       getCode: function() {
	   return this.code;
       },
       /**
	* Returns cause
	* @returns {Exception}
	*/
       getCause: function() {
	   return this.errObj;
       },
       /**
	* Returns the stacktrace associated with this exception.
	* @returns {String} The stacktrace associated with this exception.
	*/
       getStack: function() {
	   return this.stack;
       },
       /**
	* @returns {String} The exception message.
	*/
       getMessage: function() {
	   return this.message;
       },
       /**
	* @returns {Object} the optional data property
	*/
       getData: function() {
	   return this.data;
       },
       /**
	* Set the optional data property.
	* @param data
	*/
       setData: function(/** Object */data) {
	   this.data = data;
       },
       /**
	* @param indent     Optional
	* @returns {String} A detailed message including the stacktrace
	*/
       getFullMessage: function(/** Number */indent) {
	   if (!indent) { indent = 0; }
	   var message = this.message;
	   if (this.stack) {
	       message = message + "\n" + this.stack;
	   }
	   if (this.cause) {
	       message += "\n" + this.cause.getFullMessage(indent+4);
	   }
	   return Formatter.indent(message, indent);
       },
       /**
	* @returns {String}
	*/
       toString: function() {
	   return this.getMessage();
       }
   }
);
