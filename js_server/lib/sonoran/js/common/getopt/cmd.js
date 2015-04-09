//  (C) COPYRIGHT INTERNATIONAL BUSINESS MACHINES CORPORATION 2006-2010
//                       ALL RIGHTS RESERVED
//        IBM Research Division, Zurich Research Laboratory
// --------------------------------------------------------------------

/**
 * GetOpt.Cmd wraps error handling for argument parsing by a command
 * @class 
 * @constructor
 * @param name
 * @param spec
 * @param description
 */
GetOpt.Cmd = function (/** String */name, /**ArgSpec*/spec, /**String*/description) {
    this.name = name;
    this.spec = spec;
    this.description = description;
};


/** Prototype */
GetOpt.Cmd.prototype = {
    /** 
     * Name 
     * @type String
     */
    name: null,

    /** 
     * Specification 
     * @type GetOpt.Spec
     */
    spec: null,

    /** 
     * Description 
     * @type String
     */
    description: null,

    /**
     * @returns {String} command info
     */
    getInfo: function (/**GetOpt.PrintMode*/mode) {
	var env = new GetOpt.Env(null);
	env.pb.insert("usage: ");
	env.pb.insert(this.name);
	this.spec.print(env,GetOpt.PrintMode.SHORT);
	env.pb.assertBegLine();
	
	if( mode==GetOpt.PrintMode.DETAILS ) {
	    env.pb.assertEmptyLine();
	    this.spec.print(env,mode);
	    if(  this.description != null ) {
		env.pb.assertEmptyLine();
		env.pb.insert(this.description);
		env.pb.assertBegLine();
    	    }
	}
	return env.pb.toString();
    },

    /**
     * Called on parse error.
     * @param msg
     */
    onParseError: function (/**String*/msg) {
	printf("%s: %s\n", this.name, msg);
    },

    /**
     * Called on help option exception
     * @param mode
     */
    onHelpOpt: function (/**GetOpt.PrintMode*/mode) {
	print(this.getInfo(mode));
    },

    /**
     * Parse routine
     * @param argv
     */
    parse: function (/**String[]*/argv) {
	var ex;
	var env = new GetOpt.Env(argv);
	try {
	    this.spec.parse(env);
	    return true;
	} catch (ex) {
           if (typeof(ex) == 'string' ) {
	      if( ex == GetOpt.HelpOpt.OPTHELP_SHORT ) {
		 this.onHelpOpt(GetOpt.PrintMode.SHORT);
		 return false;
	      }
	      if( ex == GetOpt.HelpOpt.OPTHELP_LONG ) {
		 this.onHelpOpt(GetOpt.PrintMode.DETAILS);
		 return false;
	      }
	      if( ex == "OPTERROR" ) {
		 this.onParseError(env.pb.toString());
		 return false;
	      }
	   }
	    throw ex;
        }
    }
};

