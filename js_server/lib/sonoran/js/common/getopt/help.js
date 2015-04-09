//  (C) COPYRIGHT INTERNATIONAL BUSINESS MACHINES CORPORATION 2006-2010
//                       ALL RIGHTS RESERVED
//        IBM Research Division, Zurich Research Laboratory
// --------------------------------------------------------------------


//---------------------------------------------------------------------------------------------------------------
//
// Help/Usage Option
//
//---------------------------------------------------------------------------------------------------------------

/**
 * GetOpt.HelpOpt class. If recognized, this option aborts parsing of arguments with an exception.
 * Code catching this exception can then print usage/help.
 * @class
 * @augments GetOpt.Option
 * @constructor
 * @param shortOpt
 * @param longOpt
 * @param mode
 * @param description
 */
GetOpt.HelpOpt = function(/** Char */shortOpt, /** String */longOpt, /** Number */mode, /**String */description) {
    GetOpt.Option.call(this, shortOpt||'?', longOpt||'--help', 0, null, description||'Print short usage or detailed help.', null);
};


/**
 * @constant
 * @type String
 */
GetOpt.HelpOpt.OPTHELP_SHORT = "OPTHELP_SHORT";


/**
 * @constant
 * @type String
 */
GetOpt.HelpOpt.OPTHELP_LONG  = "OPTHELP_LONG";


/** @private */
GetOpt.HelpOpt.prototype = extend(
    GetOpt.Option.prototype,
   /** @lends GetOpt.HelpOpt.prototype */
    {
       /**
        * Throws exception (OPTHELP_SHORT or OPTHELP_LONG) if help option has been reached or returns GetOpt.NOMATCH.
        * @returns {Number} GetOpt.NOMATCH or throws exception
        */
       parse: function(/** GetOpt.Env */env) {
	  if( GetOpt.Option.prototype.parse.call(this,env) == GetOpt.NOMATCH )
	     return GetOpt.NOMATCH;
	  var opt = this.opts[this.opts.length-1];
	  throw opt.arg==this.shortOpt ? GetOpt.HelpOpt.OPTHELP_SHORT : GetOpt.HelpOpt.OPTHELP_LONG;
       }
    }
);
