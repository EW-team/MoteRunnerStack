//  (C) COPYRIGHT INTERNATIONAL BUSINESS MACHINES CORPORATION 2006-2010
//                       ALL RIGHTS RESERVED
//        IBM Research Division, Zurich Research Laboratory
// --------------------------------------------------------------------

/**
 * GetOpt.TimespanSpec inherits GetOpt.Simple to parse a time span spec (100ms, 10s, 10m).
 * @class 
 * @augments GetOpt.Simple
 * @constructor
 * @param dfltMillis      (in millis)
 * @param description 
 * @param mnemo
 */
GetOpt.TimespanSpec = function(dflt, description, mnemo) {
    assert(dflt, "missing timespan default");
    var dfltUnit = "ms";
    var md = /^(\d+)(ms|s|m)?$/.exec(dflt);
    if( !md )
	throw "Illegal time span default";
    if( md[2] )
	dfltUnit = md[2];
    dflt = parseInt(md[1]);
    mnemo = mnemo || "num[ms|s|m]";
    description = description||("Time span with an optional unit (ms=milliseconds, s=seconds, m=minutes)\n"+
				"Missing units default to "+dfltUnit+". Default span: "+dflt+".");
    GetOpt.Simple.call(this, mnemo, description, null);
    this.dfltUnit = dfltUnit;
    this.dflt = dflt;
    this.span = dflt * (dfltUnit=="s"?1000:dfltUnit=="m"?60*1000:1);
};

/** Prototype */
GetOpt.TimespanSpec.prototype = extend(
   GetOpt.Simple.prototype,
   /** @lends GetOpt.TimespanSpec.prototype */
   {
      /**
       * Result timespan
       * @type Number
       */
      span: null,
      /**
       * Default span
       * @type Number
       */
      dflt: null,
	
      /**
       * @returns {Number} time span in millis
       */
      getSpan: function() {
	 return this.span;
      },

      /**
       * @returns {Object} state
       */
      getState: function(/** GetOpt.Env */env) {
	 return { arg: this.arg, span: this.span };
      },

      /**
       * Set state.
       * @param state
       */
      setState: function(/** Object */state) {
	 this.arg = state.arg;
	 this.span = state.span;
      },

      /**
       * Reset this spec.
       */
      reset: function() {
	 GetOpt.Simple.prototype.reset.call(this);
	 this.span = this.span;
      },

      /**
       * Test args in environment.
       * @param env
       * @returns {Number} GetOpt.EXACT etc.
       */
      test: function(/** GetOpt.Env */env) {
	 var m = GetOpt.Simple.prototype.test.call(this, env);
	 if (m == GetOpt.NOMATCH) {
	    return m;
	 }
	 var arg = env.currArg();
	 if (/\d+(s|ms|m)?/.test(arg)) {
	    return GetOpt.EXACT;
	 }
	 return GetOpt.NOMATCH;
      },

      /**
       * Parse environment args and set state.
       * @param env
       * @returns {Number} GetOpt.EXACT etc.
       */
      parse: function(/** GetOpt.Env */env) {
	  var ret = GetOpt.Simple.prototype.parse.call(this, env);
	  var arg = this.getArg();
	  var md = /^(\d+)(ms|s|m)?$/.exec(arg);
	  if (!md) {
	      env.pb.insert("%s: Illegal time span: %s", this.getMnemo(), arg);
	      throw "OPTERROR";
	  }
          var span = parseInt(md[1]);
	  var unit = md[2];
          if (!unit)
	      unit = this.dfltUnit;
	  if (unit == 's') {
              span *= 1000;
          } else if (unit == 'm') {
              span *= (60*1000);
          }
	  this.span = span;
	  return GetOpt.EXACT;
      }
   }
);

