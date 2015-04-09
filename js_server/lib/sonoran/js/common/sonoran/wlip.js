// //  (C) COPYRIGHT INTERNATIONAL BUSINESS MACHINES CORPORATION 2006-2010
// //                       ALL RIGHTS RESERVED
// //        IBM Research Division, Zurich Research Laboratory
// // --------------------------------------------------------------------


// /**
//  * Sonoran.WLIP implements the Sonoran.WLIP.Gateway
//  * @namespace Sonoran.WLIP
//  */
// Sonoran.WLIP = function() {};


// /**
//  * @private
//  */
// Sonoran.WLIP.INFO_CMDS = {};

// /**
//  * @private
//  */
// Sonoran.WLIP.INFO_ERRS = {};


// Sonoran.WLIP.INFO_CMDS[SaguaroDEFS.WLIP_CMD_FORWARD]    = "FORWARD";
// Sonoran.WLIP.INFO_CMDS[SaguaroDEFS.WLIP_CMD_ATTACH]     = "ATTACH";
// Sonoran.WLIP.INFO_CMDS[SaguaroDEFS.WLIP_CMD_DETACH]     = "DETACH";
// Sonoran.WLIP.INFO_CMDS[SaguaroDEFS.WLIP_CMD_CONFIG]     = "CONFIG";
// Sonoran.WLIP.INFO_CMDS[SaguaroDEFS.WLIP_CMD_STARTRADIO] = "STARTRADIO";
// Sonoran.WLIP.INFO_CMDS[SaguaroDEFS.WLIP_CMD_STOPRADIO]  = "STOPRADIO";
// Sonoran.WLIP.INFO_CMDS[SaguaroDEFS.WLIP_CMD_APPEAL]     = "APPEAL";
// Sonoran.WLIP.INFO_CMDS[SaguaroDEFS.WLIP_CMD_BROADCAST]  = "BROADCAST";
// Sonoran.WLIP.INFO_CMDS[SaguaroDEFS.WLIP_CMD_TXFAIL]     = "TXFAIL";
// Sonoran.WLIP.INFO_CMDS[SaguaroDEFS.WLIP_CMD_HELLO]      = "HELLO";
// Sonoran.WLIP.INFO_CMDS[SaguaroDEFS.WLIP_CMD_BYE]        = "BYE";

// Sonoran.WLIP.INFO_ERRS[SaguaroDEFS.WLIP_ERR_BADCMDLEN]  = "Bad command length";
// Sonoran.WLIP.INFO_ERRS[SaguaroDEFS.WLIP_ERR_UNKNOWNCMD] = "Unknown command";
// Sonoran.WLIP.INFO_ERRS[SaguaroDEFS.WLIP_ERR_RADIOBUSY]  = "Radio is busy";
// Sonoran.WLIP.INFO_ERRS[SaguaroDEFS.WLIP_ERR_EXCEPTION]  = "Unexpected exception";
// Sonoran.WLIP.INFO_ERRS[SaguaroDEFS.WLIP_ERR_G2ERR]      = "Another gateway detected";






// /**
//  * @class
//  * @constructor
//  * @param appeared    All motes having said HELLO during the appeal operation
//  * @param disappeared All motes having been known before but which did not respond to the HELLO
//  */
// Sonoran.WLIP.AppealInfo = function(/** Sonoran.Mote[] */appeared, /** Sonoran.Mote[] */disappeared) {
//    this.appeared = appeared;
//    this.disappeared = disappeared;
// };

// /** Prototype */
// Sonoran.WLIP.AppealInfo.prototype = {
//     /** @ignore */
//     __constr__: "Sonoran.WLIP.AppealInfo",
//     /**
//      * All motes having said HELLO during the appeal interval
//      * @type Sonoran.Mote[]
//      */
//     appeared: null,
//     /**
//      * All motes having been known before but which did not respond with a HELLO
//      * to the appeal broadcasts.
//      * @type Sonoran.Mote[]
//      */
//     disappeared: null,

//     /**
//      * @returns { Sonoran.Mote[]} The appeared motes
//      */
//     getAppeared: function() {
// 	return this.appeared;
//     },

//     /**
//      * @returns { Sonoran.Mote[]} The disappeared motes
//      */
//     getDisappeared: function() {
// 	return this.disappeared;
//     },

//     /**
//      * @returns {String} string
//      */
//     toString: function() {
//         var txt = "Appeared: " ;
//         txt += this.appeared.length==0 ? "none" : this.appeared.join(",");
//         txt += "; Disappeared: ";
//         txt += this.disappeared.length==0 ? "none" : this.disappeared.join(",");
// 	return txt;
//     },
//     /**
//      * @returns {String} message
//      */
//     getMessage: function() {
//         return this.toString();
//     }
// };





// /**
//  * WLIP gateway configuration parameters. Any undefined or null parameter leads to a default
//  * value for the associated property.
//  * @class
//  * @constructor
//  * @param panid     if absent use a default value
//  * @param channel   if absent use a default value
//  * @param txretries if absent use a default value 
//  * @param txbufsz   if absent use a default value
//  */
// Sonoran.WLIP.Config = function(/** Number */panid, /** Number */channel, /** Number */txretries, /** Number */txbufsz) {
//     this.panid = panid==null ? SaguaroDEFS.WLIP_DEFAULT_PANID : panid;
//     this.channel = channel==null ? SaguaroDEFS.WLIP_DEFAULT_CHNL : channel;
//     this.txretries = txretries==null ? SaguaroDEFS.WLIP_DEFAULT_TXRETRIES : txretries;
//     this.txbufsz = txbufsz==null ? SaguaroDEFS.WLIP_DEFAULT_TXBUFSIZ : txbufsz;
// };

// /** Prototype */
// Sonoran.WLIP.Config.prototype = {
//    /**
//     * Pan Id.
//     * @type Number
//     */
//    panid: -1,
//    /**
//     * Channel
//     * @type Number
//     */
//     channel: -1,
//     /**
//      * Tx retries
//      * @type Number
//      */
//     txretries: -1,
//     /**
//      * Tx buffer size
//      * @type Number
//      */
//     txbufsz: -1,
   
//     /**
//     * @returns {Boolean} True if this and other describe the same configuration.
//     */
//     equals: function(other) {
// 	return other!=null &&
// 	    this.panid==other.panid &&
// 	    this.channel==other.channel &&
// 	    this.txretries==other.txretries &&
// 	    this.txbufsz==other.txbufsz;
//     },
//     /**
//     *  Encode WLIP protocol configuration.
//     * @returns {String} A binary string
//     */
//     encode: function () {
// 	return Formatter.pack("2u1u1u2u",
// 			      this.panid,
// 			      this.channel,
// 			      this.txretries,
// 			      this.txbufsz);
//     },
//     /**
//     * @returns {String} A multiline text describing WLIP protocol configuration.
//     */
//     toString: function () {
// 	return sprintf("PANID      : 0x%04X\n"+
// 		       "channel    : %d\n"+
// 		       "TX retries : %d\n"+
// 		       "TX buffer  : %d bytes\n",
// 		       this.panid,
// 		       this.channel,
// 		       this.txretries,
// 		       this.txbufsz);
//     }
// };



// /**
//  *  Parse a binary representation of WLIP protocol parameters.
//  * @param data
//  * @returns {Sonoran.WLIP.Config} Created WLIP configuration object.
//  */
// Sonoran.WLIP.Config.decode = function (/** String */data) {
//     var arr = Formatter.unpack("2u1u1u2u", data);
//     return new Sonoran.WLIP.Config(arr[0], arr[1], arr[2], arr[3]);
// };
