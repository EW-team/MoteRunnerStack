//
//  (C) COPYRIGHT INTERNATIONAL BUSINESS MACHINES CORPORATION 2006-2009
//                       ALL RIGHTS RESERVED
//        IBM Research Division, Zurich Research Laboratory
//                         
// --------------------------------------------------------------------

// --------------------------------------------------------------------
//
// Simple module to declare constants in different languages
//                         
// --------------------------------------------------------------------


/**
 * @class
 * @static
 */
Source = {
    /**
     * @type String
     */
    CS_DFLT_VISIBILITY_SPEC: "internal",


    /**
     * @param defs
     * @param filename
     * @param prefix
     */
    dumpC: function(/** Sorce.Def[] */defs, /** String */filename, /** String */prefix) {
	var lines = [];    
	defs.forEach(function(def) { def.toC(prefix, lines); });
	IO.File.writeFully(filename, lines.join("\n"));
    },


    /**
     * @param defs
     * @param filename
     * @param namespace
     * @param classname
     */
    dumpCS: function(/** Source.Def[] */defs, /** String */filename, /** String */namespace, /** String */classname) {
	var lines = [];    
	lines.push("namespace " + namespace + " {");
	//lines.push("public class " + classname + " {");
	lines.push(Source.CS_DFLT_VISIBILITY_SPEC + " class " + classname + " {");
	defs.forEach(function(def) { def.toCS(lines); });
	lines.push("}");
	lines.push("}");
	IO.File.writeFully(filename, lines.join("\n"));
    },

    /**
     * @param defs
     * @param filename
     * @param classname
     */
    dumpJS: function(/** Source.Def[] */defs, /** String */filename, /** String */classname) {
	var lines = [];    
	lines.push(classname + " = {");
	for (var i = 0; i < defs.length - 1; i++) {
	    defs[i].toJS(lines, true);
	}
	defs[defs.length-1].toJS(lines, false);
	lines.push("};");
	IO.File.writeFully(filename, lines.join("\n"));
    },

    /**
     * @param defs
     * @param filename
     * @param pkgname
     * @param classname
     */
    dumpJava: function(/** Source.Def[] */defs, /** String */filename, /** String */pkgname, /** String */classname) {
	var lines = [];    
	lines.push("package " + pkgname + ";");
	lines.push("");
	lines.push("public interface " + classname + " {");
	defs.forEach(function(def) { def.toJava(lines); });
	lines.push("}");
	IO.File.writeFully(filename, lines.join("\n"));
    }
};




Class.define(
    "Source.Def", 
    /**
     * @lends Source.Def.prototype
     */
    {
	/**
	 * Simple class to dump constant declarations in C, CS, JS and Java.
	 * @constructs
	 * @param name
	 * @param type
	 * @param dflt
	 * @param vfmt
	 * @param desc
	 */
	__constr__: function(/** String */name, /** String */type, /** String */dflt, /** String */vfmt, /** String */desc) {
	    assert(arguments.length===5);
	    this.name = name;
	    this.type = type;
	    this.dflt = dflt;
	    assert(typeof(dflt) === 'number');
	    this.vfmt = vfmt;
	    this.desc = desc;
	},
	
	/**
	 * @param lines
	 * @returns {Boolean}
	 */
	handleSep: function(/** String[] */lines) {
	    if (this.name != "#") {
		return false;
	    }
	    for (var i = 0; i < this.dflt; i++) {
		lines.push("\n");
	    }
	    return true;
	},

	/**
	 * @param prefix
	 * @param lines
	 */
	toC: function(/** String */prefix, /** String[] */lines) {
	    if (this.handleSep(lines)) {
		return;
	    }
	    if (this.desc) {
		lines.push("/*");
		lines.push(" * " + this.desc);
		lines.push(" */");
	    }
	    var name = (prefix) ? (prefix+'_'+this.name) : this.name;
	    assert(name.length<60);
	    lines.push(sprintf("#define %-60s " + this.vfmt, name, this.dflt));
	},

	/**
	 * @param lines
	 * @param needComma
	 */
	toJS: function(/** String[] */lines, /** Boolean */needComma) {
	    if (this.handleSep(lines)) {
		return;
	    }
	    if (this.desc) {
		lines.push("/**");
		lines.push(" * " + this.desc);
		lines.push(" * @type Number");
		lines.push(" */");
	    }
	    assert(this.name.length<60);
	    var s = sprintf("%-60s " + this.vfmt, this.name+":", this.dflt);
	    if (needComma) {
		s += ",";
	    }
	    lines.push(s);
	},

	/**
	 * @param lines
	 */
	toCS: function(/** String[] */lines) {
	    if (this.handleSep(lines)) {
		return;
	    }
	    if (this.desc) {
		lines.push("/// <summary>");
		lines.push("/// " + this.desc);
		lines.push("/// </summary>");
	    }
	    assert(this.name.length<60);
	    //lines.push(sprintf("public const %s %-60s = " + this.vfmt + ";", this.type, this.name, this.dflt));
	    var s = Source.CS_DFLT_VISIBILITY_SPEC + sprintf(" const %s %-60s = " + this.vfmt + ";", this.type, this.name, this.dflt);
	    lines.push(s);
	},

	/**
	 * @param lines
	 */
	toJava: function(/** String[] */lines) {
	    if (this.handleSep(lines)) {
		return;
	    }
	    if (this.desc) {
		lines.push("/**");
		lines.push(" * " + this.desc);
		lines.push(" */");
	    }
	    assert(this.name.length<60);
	    var type = this.type;
	    if (/int/.test(type)) {
		type = "int";
	    } else if (/long/.test(type)) {
		type = "int";
	    } else {
		assert(/byte/.test(type));
	    }
	    lines.push(sprintf("static final %s %s = (%s)" + this.vfmt + ";", type, this.name, type, this.dflt));
	},

	/**
	 * @returns {String}
	 */
	toString: function() {
	    return this.name + ": " + this.type + ", " + this.dflt + ", " + this.vfmt + ": " + this.desc;
	}
    },
    /**
     * @lends Source.Def
     */
    {

	/**
	 * @return {Object} Value associated with specified name
	 */
	getDflt: function(/** Def[] */defs, /** String */name) {
	    for (var i = 0; i < defs.length; i++) {
		if (defs[i].name === name) {
		    return defs[i].dflt;
		}
	    }
	    throw new Exception("No such defined symbol: " + name);
	    return -1;
	}
    }
);



Source.Def.dumpC = Source.dumpC;
Source.Def.dumpCS = Source.dumpCS;
Source.Def.dumpJS = Source.dumpJS;
Source.Def.dumpJava = Source.dumpJava;


Class.define(
    "Source.Struct", 
    /**
     * @lends Source.Struct.prototype
     */
    {
	/**
	 * @constructs
	 * @param descrs
	 */
	__constr__: function(/** String */name, /** String */prefix, /** Object[] */descrs) {
	    assert(isArray(descrs));
	    this.name = name;
	    this.prefix = prefix;
	    this.descrs = descrs;
	    this.length = 0;
	    var offset = 0;
	    for (var i = 0; i < descrs.length; i++) {
		assert(descrs[i].name, "Missing name in: " + Util.formatData(descrs[i]));
		assert(descrs[i].format, "Missing format in: " + Util.formatData(descrs[i]));
		assert(descrs[i].spec, "Missing spec in: " + Util.formatData(descrs[i]));
		descrs[i].offset = offset;
		if (descrs[i].format.charAt(0) == "*") {
		    if (i !== descrs.length-1) {
			throw new Exception("'*' format expected in last descriptor");
		    }
		} else {
		    var n = parseInt(descrs[i].format);
		    assert((typeof(n) === 'number') && (n >= 0), "Invalid format in: " + Util.formatData(descrs[i]));
		    offset += n;
		}
	    }
	    this.length = offset;
	},

	/**
	 * @param prefix
	 * @param lines
	 */
	toC: function(/** String */prefix, /** String[] */lines) {
	    lines.push("\n\n");
	    lines.push("/**");
	    lines.push(" * " + this.name);
	    lines.push("*/");
	    var s;
	    var pre = (this.prefix ? (this.prefix+"_") : "");
	    if (!pre) {
		pre = (this.name ? (this.name+"_") : "");
	    }
	    for (var i = 0; i < this.descrs.length; i++) {
		var d = this.descrs[i];
		var offMacro = pre + d.name.toUpperCase() + "_OFF";
		s = sprintf("#define %-60s %d", offMacro, d.offset);
		lines.push(s);

		var n = pre + "GET_" + d.name.toUpperCase() + "(p)";
		if (d.format.charAt(0) == "*") {
		    s = sprintf("#define %-60s  BUF_GET_PTR(p, %s)", n, offMacro);
		} else {
		    s = sprintf("#define %-60s  BUF_GET_%s(p, %s)", n, d.format.toUpperCase(), offMacro);
		}
		lines.push(s);

		var n = pre + "SET_" + d.name.toUpperCase() + "(p, val)";
		if (d.format.charAt(0) != "*") {
		    s = sprintf("#define %-60s  BUF_SET_%s(p, %s, val)", n, d.format.toUpperCase(), offMacro);
		    lines.push(s);
		}
	    }

	    var txt = pre + "LENGTH";
	    s = sprintf("#define %-60s %d", txt, this.length);
	    lines.push(s);
	},

	/**
	 * @param lines
	 * @param needComma
	 */
	toJS: function(/** String[] */lines, /** Boolean */needComma) {
	    lines.push("/**");
	    lines.push(" * " + this.name);
	    lines.push(" * @type Object[]");
	    lines.push(" */");
	    var s = sprintf("%s: %s", this.name, JSON.stringify(this.descrs));
	    if (needComma) {
		s += ",";
	    }
	    lines.push(s);
	},

	/**
	 * @param lines
	 */
	toCS: function(/** String[] */lines) {
	    var prefix = (this.prefix ? (this.prefix+"_") : "") + this.name + "_";
	    for (var i = 0; i < this.descrs.length; i++) {
		var d = this.descrs[i];
		var s = prefix + d.name.toUpperCase() + "_OFF";
		lines.push("/// <summary>");
		lines.push("/// " + s);
		lines.push("/// </summary>");
		var s = Source.CS_DFLT_VISIBILITY_SPEC + sprintf(" const uint %-60s = %d;", s, d.offset);
		lines.push(s);
	    }
	    var s = prefix + "_LENGTH";
	    lines.push("/// <summary>");
	    lines.push("/// " + s);
	    lines.push("/// </summary>");
	    var s = Source.CS_DFLT_VISIBILITY_SPEC + sprintf(" const uint %-60s = %d;", s, this.length);
	    lines.push(s);
	},

	/**
	 * @param lines
	 */
	toJava: function(/** String[] */lines) {
	    var prefix = (this.prefix ? (this.prefix+"_") : "") + this.name + "_";
	    for (var i = 0; i < this.descrs.length; i++) {
		var d = this.descrs[i];
		var s = prefix + d.name.toUpperCase() + "_OFF";
		lines.push("/**");
		lines.push(" * " + s);
		lines.push(" */");
		var s = sprintf("static final int %s = %d;", s, d.offset);
		//var s = Source.CS_DFLT_VISIBILITY_SPEC + sprintf(" const uint %-60s = %d;", s, d.offset);
		lines.push(s);
	    }
	    var s = prefix + "_LENGTH";
	    lines.push("/**");
	    lines.push(" * " + s);
	    lines.push(" */");
	    var s = sprintf("static final int %s = %d;", s, this.length);
	    //var s = Source.CS_DFLT_VISIBILITY_SPEC + sprintf(" const uint %-60s = %d;", s, this.length);
	    lines.push(s);
	},

	/**
	 * @returns {String}
	 */
	toString: function() {
	    return this.name + ": " + Util.formatData(this.descrs);
	}
    }
);
