//  (C) COPYRIGHT INTERNATIONAL BUSINESS MACHINES CORPORATION 2006-2010
//                       ALL RIGHTS RESERVED
//        IBM Research Division, Zurich Research Laboratory
// --------------------------------------------------------------------



/**
 * Blob provides functions to copy, compare, clone, marshal and
 * unmarshal objects.
 * @class
 */
Blob = {
    /**
     * @type String
     */
    CONSTR_PROP_NAME: "__constr__",

    /**
     * Follow path in specified object and return node at that path.
     * @param path '.'-seperated path
     * @param root  Object to follow, if undefined, the global context
     * @returns {Object}
     */
    peek: function(/** String */path, /** Object */root) {
	if (!root) { root = GLOBAL_CONTEXT; }
	var sa;
	if (typeof(path)==='object'&&(path instanceof Array)) {
	    sa = path;
	} else {
	    assert(typeof(path)==='string', "Unexpected type of parameter 'path'");
	    sa = path.split('.');
	}
	var obj = root;
	//QUACK(0, "PEEK: root " + Blob.map(root, true));
	for (var i = 0; i < sa.length; i++) {
	    //QUACK(0, "PEEK: path " + sa[i]);
            try {
		obj = obj[sa[i]];
            } catch (x) {
		throw sprintf("Cannot access path '%s': %s", path, x);
		//return undefined;
            }
            if (obj===undefined) {
		return undefined;
            }
	}
	return obj;
    },
    

    /**
     * Follow or create path in specified object and set specified value at that
     * path within the specified object.
     * @param path '.'-seperated path
     * @param val
     * @param root  Object to follow, if undefined, the global context
     */
    poke: function(/** String */path, /** Object */val, /** Object */root) {
	assert(typeof(path)==='string');
	if (!root) { root = GLOBAL_CONTEXT; }
	var obj = root;
	//QUACK(0, "POKE: path1 " + path);
	var sa = path.split('.');
	for (var i = 0; i < sa.length-1; i++) {
	    //QUACK(0, "POKE: path2 " + sa[i]);
	    var o;
            try {
		o = obj[sa[i]];
            } catch (x) {
		throw sprintf("Cannot access path '%s': %s", path, x);
		//return undefined;
            }
            if (o===undefined) {
		obj[sa[i]] = o = {};
            }
	    obj = o;
	    //if (typeof(obj) !== 'object') {
	//	throw sprintf("Cannot access path '%s': invalid object tree", path);
	  //  }
	}
	var n = sa[sa.length-1];
	//QUACK(0, "POKE: path3 " + n);	
	//QUACK(0, "POKE: path4 " + Blob.map(obj, true));
	obj[n] = val;
    },




   /**
    * Lookup a path in the global contextand return the property or undefined.
    * @param path
    * @returns {Object} the property referenced by the path or undefined
    */
   accessGlobalContext: function(/** String */path) {
       var sa = path.split('.');
       var obj = GLOBAL_CONTEXT;
       for (var i = 0; i < sa.length; i++) {
           try {
               obj = obj[sa[i]];
           } catch (x) {
	       throw sprintf("Cannot access path '%s': %s", path, x);
               //return undefined;
           }
           if (obj===undefined) {
               return undefined;
           }
       }
       return obj;
   },

   
   /**
    * Returns a generated function f which calls specified method on specified object.
    * If additional parameters are specified, they are also passed to the method when f is invoked. 
    * Any parameters which are specified at the call time of f, are also passed to f.
    * @param {Object}   object      Object to invoke function on, null means global context
    * @param {Function} method      Function to invoke
    * @param ...                    Optional list of additional parameters
    * @returns {Function} function which forwards call to specified object, method and parameters
    * @private
    */
   bind: function(object, method){
       QUACK(0, "API change: Use 'function.bind' instead of bind or Blob.bind");
       QUACK(0, Runtime.getStackTrace().toString());
       Runtime.exit(1);
   },


   /**
    * Create a new object the with properties stored in both specified objects.
    * The properties in o2 overwrite the properties in o1. This method is typically used
    * to create a prototype from two individual prototypes throughout the framework.
    * The prototype of the constructed object points back to the first prototype
    * parameter allowing the use of instanceof for constructed prototype object.
    * @param {Object} o1 Must be a valid prototype or null/undefined
    * @param {Object} o2 Must not be null/undefined
    * @returns {Object} a new object useable as prototype
    */
   extend: function(/** Object */o1, /** Object */o2) {
      if (!o1) {
         o1 = {};
      }
      //var f = function(){};
      //f.prototype = o1;
      //var o = new f();
       var o = Object.create(o1);
      var p;
      for (p in o1) { 
         o[p] = o1[p]; 
      }
      for (p in o2) { 
         o[p] = o2[p]; 
      }
       //o.__super__ = o1;     Needs further suppoert in marshal/unmarshal!!!
      return o;
   },

   
   /**
    * @returns {Boolean} true when an object has no properties.
    * @static
    */
   isEmpty: function(/** Object */obj) {
      for (var p in obj) {
         return false;
      }
      return true;
   },

   
   /**
    * Update object o1 with properties found in o2 recursively. Adds all detected properties
    * and their values to the third parameter which should be an empty object, {}.
    * @param o1     Object
    * @param o2     Object
    * @param diff   Object receiving all differences between o1 and o2
    * @returns {Boolean} a flag (true/false) indicating whether o1 has been updated and modified
    * @static
    */
   update: function(/** Object */o1, /** Object */o2, /** Object */diff) {
      assert((o1) && (typeof o1 === 'object'), typeof(o1));
      if (!o2) { return false; }
      assert((o2) && (typeof o2 === 'object'), typeof(o2));
      var updated = false, k;
      try{
	 for (k in o2) {
	    //assert(typeof(o2[k]) != 'undefined');
	    if (typeof(o1[k]) == 'undefined') {
	       diff[k] = o2[k];
	       o1[k] = o2[k];
	       updated = true;
	    }
	 }
	 for (k in o1) {
	    if (typeof o1[k] === 'function') {
	       continue;
	    }
	    if (o1[k]==null || o1[k]==undefined) {
	       o1[k] = o2[k];

	    } else if (!(typeof o1[k] === 'object')) {
	       if ((typeof(o2[k]) != 'undefined') && (o1[k] != o2[k])) {
		  diff[k] = o2[k];
		  o1[k] = o2[k];
		  updated = true;
	       }

	    } else {
	       var para = null;
	       if (o1[k] instanceof Array) {
		  para = [];
	       } else {
		  para = {};
	       }
	       if (this.update(o1[k], o2[k], para)) {
		  diff[k] = para;
		  updated = true;
	       }
	    }
         }
      }catch(ex) {
	 assert(false, Runtime.dumpException(ex, "fatal error: cannot compare and update two objects"));
      }
      return updated;
   },


   /**
    * Returns a deep copy of specified object. Constructor and prototype property is not preserved, function
    * references are not copied by default.
    * @param src             Source object
    * @param includeFuncs    Optional, default false, if true, function references are also copied
    * @returns {Object} a deep copy (or src if src is of non-object type)
    * @static
    */
   copy: function(/** Object */src, /** Boolean */includeFuncs) {
      if (includeFuncs===undefined) {
         includeFuncs = false;
      }
      var dst = src, k;
      try{
	 if (src && typeof(src) === 'object') {
	    if (src instanceof Array) {
	       dst = new Array(src.length);
	       for (var i = 0; i < src.length; i++) {
                  dst[i] = this.copy(src[i]);
	       }
	    } else {
	       dst = {};
	       for (k in src) {
		  if (!includeFuncs && src[k] && (typeof src[k] === 'function')) {
		     continue;
		  }
		  dst[k] = this.copy(src[k]);
	       }
	    }
	 }
      }catch(ex) {
	 assert(false, Runtime.dumpException(ex, "copy failed"));
      }
      return dst;
   },


   /**
    * Compare two objects recursively.
    * @param o1
    * @param o2
    * @returns {Boolean} true if objects are equal
    * @static
    */
   cmp: function(/** Object */o1, /** Object */o2) {
      assert((o1) && (typeof o1 === 'object'));
      if (!o2) { return false; }
      assert((o2) && (typeof o2 === 'object'));
      var k;
      try{
	 for (k in o2) {
	    if (typeof o2[k] === 'function') { continue; }
	    assert(typeof(o2[k]) != 'undefined');
	    if (typeof(o1[k]) == 'undefined') {
	       return false;
	    }
	 }
	 for (k in o1) {
	    if (typeof o1[k] === 'function') { continue; }
	    assert(typeof(o1[k]) != 'undefined');
	    if (!(typeof o1[k] === 'object')) {
	       if ((typeof(o2[k]) == 'undefined') || (o2[k] != o1[k])) {
		  return false;
	       }
	    } else {
	       if (!this.cmp(o1[k], o2[k])) {
		  return false;
	       }
	    }
         }
      }catch(ex) {
	 assert(false);
      }
      return true;
   },


   /**
    * Map names/values of object properties to an array instance. Properties pointing to 'undefined' or
    * function values are left out.
    * @param obj          Source object
    * @param getPropNames Optional, if true get array of property names instead of values
    * @param getFuncNames Optional, default is false, get function names as well
    * @returns {Object[]} an array of property names or values
    * @static
    */
   map: function(/** Object */obj, /** Boolean */getPropNames, /** Boolean */getFuncNames) {
      getPropNames = getPropNames!=undefined ? getPropNames : false;
      getFuncNames = getFuncNames!=undefined ? getFuncNames : false;
      var ret = [];
      if (getPropNames) {
	 for (var k in obj) {
	    if ((typeof(obj[k]) != 'undefined') && ((typeof(obj[k]) != 'function') || getFuncNames)) {
	       ret.push(k);
	    }
	 }
      } else {
	 for (var k in obj) {
	    if ((typeof(obj[k]) != 'undefined') && ((typeof(obj[k]) != 'function') || getFuncNames)) {
	       ret.push(obj[k]);
	    }
	 }
      }
      return ret;
   },




   /**
    * Marshal an object tree to an object tree suitable of getting converted  to JSON.
    * The function walks the object tree and copies the object state (leaving out function
    * pointers). If an object has a _marshal method it is called and its return
    * value added to the result tree.
    * @param src        Object
    * @param fmf        Optional
    * @returns {Object} the marshalled state
    * @static
    */
   marshal: function(/** Blob */obj, /** Function */fmf) {
       assert(!fmf || typeof(fmf) === 'function');
       if (typeof(obj) === 'function') { throw "Invalid top-level type 'function' to marshal: " + obj; }
       var _map = [];
       var marshalAnyF = function(src) {
   	   var dst = src;
	   if (src===undefined) { return null; }
   	   if (src && (typeof(src) === 'object')) {
   	       _map.forEach(function(o) { if (o === src) throw "Marshal failed: detected cycle for object: " + src; });
   	       var _map_idx = _map.length;
               _map.push(src);

   	       if (src instanceof Date) {
		   return {
		       __constr__: "Blob.Date",
		       value: src.getTime()
		   };

   	       } else if (src instanceof Number) {
		   return {
		       __constr__: "Blob.Number",
		       value: src.valueOf()
		   };
		   
   	       } else if (src instanceof Array) {

   		   dst = new Array(src.length);
   		   for (var i in src) {
   		       if (src[i] && (typeof src[i] === 'function')) {
   			   if (fmf) {
   			       dst[i] = fmf(src[i]);
   			   } else {
   			       throw "Marshal failed: cannot marshal function references in array: " + src;
   			   }
   		       } else {
   			   dst[i] = marshalAnyF(src[i]);
		       }
   		   }

   	       } else {

   		   var f = src._marshal;
   		   if (f && (typeof(f)==='function')) {
   		       dst = src._marshal(_map);
   		   } else {
   		       dst = {};
		       var hasConstr = src["__constr__"];
   		       for (var i in src) {
   			   if (src[i] && (typeof src[i] === 'function')) {
   			       if (!hasConstr && fmf) {
   				   dst[i] = fmf(src[i]);
   			       } else {
				   // skip functions altogether
   			       }
   			   } else {
   			       try {
   				   dst[i] = marshalAnyF(src[i]);
   			       } catch (x) {
   				   var msg = sprintf("Marshal operation failed for '%s': %s", src, x);
   				   QUACK(0, msg);
   				   throw x;
   			       }
			   }
   		       }
   		   }
   	       }

   	       _map.splice(_map_idx, 1);
   	   }

   	   return dst;
       };
       return marshalAnyF(obj);
   },


   /**
    * Unmarshal object state. Returns a copy of object tree. Whenever an object with a __constr__ string
    * property is hit, '._unmarshal' is appended to the classname, and if a function of that name exists, it is called
    * and the object returned by it added to the object tree. If the function does not exist, the default unmarshal
    * mechanism takes place. 
    * @param src   Object
    * @param ctx Context object passed to _unmarshal functions
    * @returns {Object} the unmarshaled object
    * @static
    */
   unmarshal: function(/** Blob */src, /** Object */ctx) {
      assert(typeof(src) != 'function');
      var dst = src, k;
      if ((src) && (typeof(src) === 'object')) {
	 if (src instanceof Array) {
	    dst = new Array(src.length);
	    for (var i in src) {
	       dst[i] = this.unmarshal(src[i], ctx);
	    }
	 } else {
	    var constrName = src.__constr__;
	    if (constrName) {
               var constrObj = this.accessGlobalContext(constrName);
               if (!constrObj) {
                  throw sprintf("Unmarshal-operation failed: Cannot find constructor '%s'",  constrName);
               }
	       var f = constrObj['_unmarshal']; 
	       if ((!f) || (typeof(f) !== 'function')) {
                  // __constr__ Class has no _unmarshal method, create a new default instance
                  try {
                     //var prototype = constrObj.prototype;
                     //this._Clone.prototype = prototype;
                     //dst = new this._Clone();
		      dst = Object.create(constrObj.prototype);
		  } catch(ex) {
		     throw sprintf("Unmarshal failed: Cannot instantiate object calling '%s': %s", constrName, ex);
		  }
                  for (k in src) {
		     if (src[k] && (typeof src[k] === 'function')) {
                        assert(0, "Unmarshal failed: Source object must not have property of type function: " + k);
		     }
		     dst[k] = this.unmarshal(src[k], ctx);
		  }
	       } else {
                  // __constr__ Class has a _unmarshal method
		  try {
		     dst = f(src, ctx);
		  } catch(ex) {
                     var msg = sprintf("Unmarshal failed: constructor '%s' failed: %s", constrName, ex);
		     throw Runtime.dumpException(ex, msg);
		  }
                  if (dst==undefined) {
                     throw sprintf("Unmarshal failed: constructor '%s' returned 'undefined'", constrName);
                  }
               }
	    } else {
               // default unmarshal: just copy properties over
	       dst = {};
	       for (k in src) {
		  if (src[k] && (typeof src[k] === 'function')) {
                     assert(0, "Unmarshal failed: Source object has property of type function: " + k);
		  }
		  dst[k] = this.unmarshal(src[k], ctx);
	       }
	    }
	 }
      }
      return dst;
   },


   /**
    * @private
    */
   _Clone: function() {},


   /**
    * Create a clone of an object where its constructor and prototype property
    * is preserved. If the specified 'copy' flag is true, a deep copy of the
    * object is created.
    * @param obj
    * @param copy
    * @return {Object} a copy
    * @static
    */
   clone: function(/** Object */obj, /** Boolean */copy) {
      //this._Clone.prototype = obj;
      //var clone = new this._Clone();
       var clone = Object.create(obj);
      if (copy) {
         this.update(clone, obj, {});
      }
      return clone;
   },


   /**
    * Instantiate an object for a variable pointing to a constructor (such as
    * 'Sonoran.CLI.HelpCommand' for example). The referenced constructor must be a
    * function and 'constrName'.prototype must be a well defined object.
    * @param constrName    Constructor name
    * @param constrParams  Optional parameters for constructor invocation
    * @static
    */
   instantiate: function(/** String */constrName, /** Object[] */constrParams) {
      var f = this.accessGlobalContext(constrName);
      if (typeof(f) !== 'function') {
	  throw "Invalid constructor function in global context: " + constrName;
      }
      if (!f.prototype) { 
	  throw "Missing prototype for constructor function in global context: " + constrName;
      }
      //this._Clone.prototype = f.prototype;
      //var obj = new this._Clone();
       var obj = Object.create(f.prototype);
      f.apply(obj, constrParams);
      return obj;
   }
};


/**
 * @class
 * @private
 * @static
 */
Blob.Date = {
    /**
     * @param obj
     * @returns {Date}
     * @private
     */
    _unmarshal: function(/** Object */obj) {
	assert(obj.__constr__ === "Blob.Date");
	assert(typeof(obj.value) === "number");
	return new Date(obj.value);
    }
};


/**
 * @class
 * @private
 * @static
 */
Blob.Number = {
    /**
     * @param obj
     * @returns {Number}
     * @private
     */
    _unmarshal: function(/** Object */obj) {
	assert(obj.__constr__ === "Blob.Number");
	assert(typeof(obj.value) === "number");
	return new Number(obj.value);
    }
};


/**
 * @see Blob.bind
 * @ignore
 */
bind = Blob.bind;



/**
 * @see Blob.extend
 * @ignore
 */
extend = Blob.extend;




//
// Faster version of Blob.marshal using Map (supported in Firefox and v8).
//
if (typeof(Map) !== "undefined") {
    Blob.marshal = function(/** Blob */obj, /** Function */fmf) {
	assert(!fmf || typeof(fmf) === 'function');
	if (typeof(obj) === 'function') { throw "Invalid top-level type 'function' to marshal: " + obj; }
	var _map = new Map();
	var marshalAnyF = function(src) {
   	    var dst = src;
	    if (src===undefined) { return null; }
   	    if (src && (typeof(src) === 'object')) {
   		if (_map.get(src) !== undefined) { throw "Marshal failed: detected cycle for object: " + src; };
		_map.set(src, true);

   	       if (src instanceof Date) {
		   return {
		       __constr__: "Blob.Date",
		       value: src.getTime()
		   };

   	       } else if (src instanceof Number) {
		   return {
		       __constr__: "Blob.Number",
		       value: src.toString()
		   };
		   
   	       } else if (src instanceof Array) {

   		    dst = new Array(src.length);
   		    for (var i in src) {
   			if (src[i] && (typeof src[i] === 'function')) {
   			    if (fmf) {
   				dst[i] = fmf(src[i]);
   			    } else {
   				throw "Marshal failed: cannot marshal function references in array: " + src;
   			    }
   			} else {
   			    dst[i] = marshalAnyF(src[i]);
			}
   		    }

   		} else {

   		    var f = src._marshal;
   		    if (f && (typeof(f)==='function')) {
   			dst = src._marshal(_map);
   		    } else {
   			dst = {};
			var hasConstr = src["__constr__"];
   			for (var i in src) {
   			    if (src[i] && (typeof src[i] === 'function')) {
   				if (!hasConstr && fmf) {
   				    dst[i] = fmf(src[i]);
   				} else {
				    // skip functions altogether
   				}
   			    } else {
   				try {
   				    dst[i] = marshalAnyF(src[i]);
   				} catch (x) {
   				    var msg = sprintf("Marshal operation failed for '%s': %s", src, x);
   				    QUACK(0, msg);
   				    throw x;
   				}
			    }
   			}
   		    }
   		}

   		_map.delete(src);
   	    }

   	    return dst;
	};
	return marshalAnyF(obj);
    };
}
