// //  (C) COPYRIGHT INTERNATIONAL BUSINESS MACHINES CORPORATION 2011-2011
// //                       ALL RIGHTS RESERVED
// //        IBM Research Division, Zurich Research Laboratory
// // --------------------------------------------------------------------



// /**
//  * Dust handles the communication with dust motes.
//  * @namespace Dust 
//  */
// var Dust = {};





// Class.define(
//     "Dust.DeviceHealthReport",
//     /**
//      * @lends Dust.DeviceHealthReport.prototype
//      */
//     {
//         /**
//          * @constructs
//          */
//         __constr__: function() {},

//         /**
//          * @type String
//          */
//         mac: null,
//         /**
//          * @type Number
//          */
//         charge: -1,
//         /**
//          * @type Number
//          */
//         QOcc: -1,
//         /**
//          * @type Number
//          */
//         temperature: -1,
//         /**
//          * @type Number
//          */
//         batteryVolt: -1,
//         /**
//          * @type Number
//          */
//         numTxOk: -1,
//         /**
//          * @type Number
//          */
//         numTxFail: -1,
//         /**
//          * @type Number
//          */
//         numRxOk: -1,
//         /**
//          * @type Number
//          */
//         numRxLost: -1,
//         /**
//          * @type Number
//          */
//         numMacDrop: -1,
//         /**
//          * @type Number
//          */
//         numTxBad: -1,
//         /**
//          * @type Number
//          */
//         badLink_frameId: -1,
//         /**
//          * @type Number
//          */
//         badLink_slot: -1,
//         /**
//          * @type Number
//          */
//         badLink_offset: -1,

// 	toString: function() {
// 	    return sprintf("DeviceHealthReport: mac %s, charge %d, QOcc %d, temperature %d, batteryVolt %d, numTxOk %d, numTxFail %d, numRxOk %d, numRxLost %d, numMacDrop %d, numTxBad %d, badLink_frameId %d, badLink_slot %d, badLink_offset %d",
// 			   this.mac, this.charge, this.QOcc,
// 			   this.temperature, this.batteryVolt,
// 			   this.numTxOk, this.numTxFail, this.numRxOk, this.numRxLost, this.numMacDrop, this.numTxBad,
// 			   this.badLink_frameId, this.badLink_slot, this.badLink_offset
// 			  );
// 	}
//     }
// );

// Class.define(
//     "Dust.NeighborHealthReport",
//     /**
//      * @lends Dust.NeighborHealthReport.prototype
//      */
//     {
//         /**
//          * @constructs
//          */
//         __constr__: function() {},

//         /**
//          * @type Number
//          */
//         nbrId: -1,
//         /**
//          * @type Number
//          */
//         nbrFlag: -1,
//         /**
//          * @type Number
//          */
//         rsl: -1,
//         /**
//          * @type Number
//          */
//         numTxPk: -1,
//         /**
//          * @type Number
//          */
//         numTxFail: -1,
//         /**
//          * @type Number
//          */
//         numRxPk: -1,

// 	toString: function() {
// 	    return sprintf("NeighborHealthReport: nbrId %d, nbrFlag %d, rsl %d, numTxPk %d, numTxFail %d, numRxPk %d",
// 			   this.nbrId, this.nbrFlag, this.rsl,
// 			   this.numTxPk, this.numTxFail, this.numRxPk
// 			  );
// 	}
//     }
// );



// Class.define(
//     "Dust.NeighborDiscovery",
//     /**
//      * @lends Dust.NeighborDiscovery.prototype
//      */
//     {
//         /**
//          * @constructs
//          */
//         __constr__: function() {},

//         /**
//          * @type Number
//          */
//         nbrId: -1,
//         /**
//          * @type Number
//          */
//         rsl: -1,
//         /**
//          * @type Number
//          */
//         numRx: -1,

// 	toString: function() {
// 	    return sprintf("NeighborDiscovery: nbrId %d, rsl %d, numRx %d",
// 			   this.nbrId, this.rsl, this.numRx);
// 	}
//     }
// );






// Class.define(
//     "Dust.SysInfo",
//     /**
//      * @lends Dust.SysInfo.prototype
//      */
//     {
//         /**
//          * @constructs
//          */
//         __constr__: function() {},

//         /**
//          * @type String
//          */
//         mac: null,
//         /**
//          * @type Number
//          */
//         hwModel: -1,
//         /**
//          * @type Number
//          */
//         hwRev: -1,
//         /**
//          * @type Number
//          */
//         swMajor: -1,
//         /**
//          * @type Number
//          */
//         swMinor: -1,
//         /**
//          * @type Number
//          */
//         swPatch: -1,
//         /**
//          * @type Number
//          */
//         swBuild: -1,

// 	toString: function() {
// 	    return sprintf("System-Info: mac %s, hw %d:%d, sw: %d:%d:%d:%d", this.mac, this.hwModel, this.hwRev, this.swMajor, this.swMinor, this.swPatch, this.swBuild);
// 	}
//     }
// );




// Class.define(
//     "Dust.MoteInfo",
//     /**
//      * @lends Dust.MoteInfo.prototype
//      */
//     {
//         /**
//          * @constructs
//          */
//         __constr__: function() {},

//         /**
//          * @type String
//          */
//         mac: null,
//         /**
//          * @type Number
//          */
//         state: -1,
//         /**
//          * @type Number
//          */
//         numNbrs: -1,
//         /**
//          * @type Number
//          */
//         numGoodNbrs: -1,
//         /**
//          * @type Number
//          */
//         requestedBw: -1,
//         /**
//          * @type Number
//          */
//         totalNeedBw: -1,
//         /**
//          * @type Number
//          */
//         assignedBw: -1,
//         /**
//          * @type Number
//          */
//         packetsReceived: -1,
//         /**
//          * @type Number
//          */
//         packetsLost: -1,
//         /**
//          * @type Number
//          */
//         avgLatency: -1,

// 	toString: function() {
// 	    return sprintf("%s: state 0x%x, numNbrs %d, numGoodNbrs %d, requestedBw %d, totalNeedBw %d, assignedBw %d, packetsReceived %d, packetsLost %d, avgLatency %d", this.mac, this.state, this.numNbrs, this.numGoodNbrs, this.requestedBw, this.totalNeedBw, this.assignedBw, this.packetsReceived, this.packetsLost, this.avgLatency);
// 	}
//     }
// );


// Class.define(
//     "Dust.MoteInfos",
//     /**
//      * @lends Dust.MoteInfos.prototype
//      */
//     {
//         /**
//          * @constructs
//          */
//         __constr__: function(/** Dust.MoteInfo[] */infos) {
// 	    this.infos = infos||[];
// 	},

//         /**
//          * @type Dust.MoteInfo[]
//          */
//         infos: null,


// 	toString: function() {
// 	    var t = new Formatter.Table2(10);
// 	    t.setTitle("mac", "state", "numNbrs", "numGoodNbrs", "requestedBw", "totalNeedBw", "assignedBw", "packetsReceived", "packetsLost", "avgLatency");
// 	    for (var i = 0; i < this.infos.length; i++) {
// 		var info = this.infos[i];
// 		t.setValue(0, i, info.mac);
// 		t.setValue(1, i, info.state);
// 		t.setValue(2, i, info.numNbrs);
// 		t.setValue(3, i, info.numGoodNbrs);
// 		t.setValue(4, i, info.requestedBw);
// 		t.setValue(5, i, info.totalNeedBw);
// 		t.setValue(6, i, info.assignedBw);
// 		t.setValue(7, i, info.packetsReceived);
// 		t.setValue(8, i, info.packetsLost);
// 		t.setValue(9, i, info.avgLatency);
// 	    }
// 	    return t.render().join("\n");
// 	}
//     }
// );







// Class.define(
//     "Dust.ManagerStats",
//     /**
//      * @lends Dust.ManagerStats.prototype
//      */
//     {
//         /**
//          * @constructs
//          */
//         __constr__: function() {},

//         /**
//          * @type Number
//          */
//         serTxCnt: -1,
//         /**
//          * @type Number
//          */
//         serRxCnt: -1,
//         /**
//          * @type Number
//          */
//         serRxOverruns: -1,
//         /**
//          * @type Number
//          */
//         serCRCErr: -1,
//         /**
//          * @type Number
//          */
//         apiEstabConn: -1,
//         /**
//          * @type Number
//          */
//         apiDroppedConn: -1,
//         /**
//          * @type Number
//          */
//         apiTxFail: -1,
//         /**
//          * @type Number
//          */
//         apiTxErr: -1,
//         /**
//          * @type Number
//          */
//         apiTxOk: -1,
//         /**
//          * @type Number
//          */
//         apiRxProtErr: -1,
//         /**
//          * @type Number
//          */
//         apiRxOk: -1,

// 	toString: function() {
// 	    return sprintf("Manager: serTxCnt %d, serRxCnt %d, serCRCErr %d, serRxOverruns %d, apiEstabConn %d, apiDroppedConn %d, apiTxOk %d, apiTxFail %d, apiTxErr %d, apiRxOk %d, apiRxProtErr %d", this.serTxCnt, this.serRxCnt, this.serCRCErr, this.serRxOverruns, this.apiEstabConn, this.apiDroppedConn, this.apiTxOk, this.apiTxFail, this.apiTxErr, this.apiRxOk, this.apiRxProtErr);
// 	}
//     }
// );



// Class.define(
//     "Dust.MoteConfig",
//     /**
//      * @lends Dust.MoteConfig.prototype
//      */
//     {
//         /**
//          * @constructs
//          */
//         __constr__: function() {},

//         /**
//          * @type String
//          */
//         mac: null,
//         /**
//          * @type Number
//          */
//         moteId: -1,
//         /**
//          * @type Number
//          */
//         isAP: -1,
//         /**
//          * @type Number
//          */
//         state: -1,
//         /**
//          * @type Number
//          */
//         mobilityType: -1,
//         /**
//          * @type Number
//          */
//         isRouting: -1,

// 	toString: function() {
// 	    return sprintf("%s: moteId %d, state 0x%x, isAP %d, mobilityType %d, isRouting  %d", this.mac, this.moteId,  this.state, this.isAP, this.mobilityType, this.isRouting);
// 	}
//     }
// );






// Class.define(
//     "Dust.MoteConfigs",
//     /**
//      * @lends Dust.MoteConfigs.prototype
//      */
//     {
//         /**
//          * @constructs
//          */
//         __constr__: function(/** Dust.MoteConfig[] */configs) {
// 	    this.configs = configs||[];
// 	},

//         /**
//          * @type Dust.MoteInfo[]
//          */
//         infos: null,


// 	toString: function() {
// 	    var t = new Formatter.Table2(6);
// 	    t.setTitle("mac", "moteId", "isAP", "state", "mobilityType", "isRouting");
// 	    for (var i = 0; i < this.configs.length; i++) {
// 		var config = this.configs[i];
// 		t.setValue(0, i, config.mac);
// 		t.setValue(1, i, config.moteId);
// 		t.setValue(2, i, config.isAP);
// 		t.setValue(3, i, config.state);
// 		t.setValue(4, i, config.mobilityType);
// 		t.setValue(5, i, config.isRouting);
// 	    }
// 	    return t.render().join("\n");
// 	}
//     }
// );








// Class.define(
//     "Dust.NotifyData",
//     /**
//      * @lends Dust.NotifyData.prototype
//      */
//     {
//         /**
//          * @constructs
//          */
//         __constr__: function() {},

//         /**
//          * @type String
//          */
//         mac: null,
//         /**
//          * @type Number
//          */
//         srcPort: -1,
//         /**
//          * @type Number
//          */
//         dstPort: -1,
//         /**
//          * @type Number
//          */
//         timeFmt: -1,
//         /**
//          * @type Number
//          */
//         secs: -1,
//         /**
//          * @type Number
//          */
//         usecs: -1,
//         /**
//          * @type String
//          */
//         data: -1,

// 	toString: function() {
// 	    var micros = this.secs*1000*1000+this.usecs;
// 	    return sprintf("%s: timeFmt %d, %s, %d->%d:%H", this.mac, this.timeFmt, Util.micros2str(micros), this.srcPort, this.dstPort, this.data);
// 	}
//     }
// );





// Class.define(
//     "Dust.NotifyLog",
//     /**
//      * @lends Dust.NotifyLog.prototype
//      */
//     {
//         /**
//          * @constructs
//          */
//         __constr__: function() {},

//         /**
//          * @type String
//          */
//         mac: null,
//         /**
//          * @type String
//          */
//         msg: -1,

// 	toString: function() {
// 	    return sprintf("%s: %s", this.mac, this.msg);
// 	}
//     }
// );



// Class.define(
//     "Dust.PingResp",
//     /**
//      * @lends Dust.PingResp.prototype
//      */
//     {
//         /**
//          * @constructs
//          */
//         __constr__: function() {},

//         /**
//          * @type Number
// 	 * @private
//          */
//         callbackId: null,

//         /**
//          * @type String
//          */
//         mac: null,

//         /**
//          * @type Number
//          */
//         delay: -1,

//         /**
//          * @type Number
//          */
//         voltage: -1,

//         /**
//          * @type Number
//          */
//         temperature: -1,

// 	toString: function() {
// 	    return sprintf("%s: delay %d, voltage %dmV, t %dC", this.mac, this.delay, this.voltage, this.temperature);
// 	}
//     }
// );






// Class.define(
//     "Dust.PathInfo",
//     /**
//      * @lends Dust.PathInfo.prototype
//      */
//     {
//         /**
//          * @constructs
//          */
//         __constr__: function() {},

//         /**
//          * @type Number
//          */
//         pathId: -1,

//         /**
//          * @type String
//          */
//         source: null,

//         /**
//          * @type String
//          */
//         dest: null,

//         /**
//          * @type Number
//          */
//         direction: -1,

//         /**
//          * @type Number
//          */
//         numLinks: -1,

//         /**
//          * @type Number
//          */
//         quality: -1,

//         /**
//          * @type Number
//          */
//         rssiSrcDest: -1,

//         /**
//          * @type Number
//          */
//         rssiDestSrc: -1,

// 	toString: function() {
// 	    return sprintf("%s<->%s: direction %d, numLinks %d, quality %d, rssiSrcDest %d, rssiDestSrc %d", this.source, this.dest, this.direction, this.numLinks, this.quality, this.rssiSrcDest, this.rssiDestSrc) + ((this.pathId>=0) ? (", id " + this.pathId) : "");
// 	}
//     }
// );









// Class.define(
//     "Dust.PathInfos",
//     /**
//      * @lends Dust.PathInfos.prototype
//      */
//     {
//         /**
//          * @constructs
//          */
//         __constr__: function() {
// 	    this.eui2pathInfo = {};
// 	},

//         /**
//          * @type Object
// 	 * @private
//          */
//         eui2pathInfo: null,


// 	/**
// 	 * @param eui
// 	 * @param infos
// 	 */
// 	addPathInfos: function(/** String */eui, /** Dust.PathInfo[]*/infos) {
// 	    if (!this.eui2pathInfo[eui]) {
// 		this.eui2pathInfo[eui] = [];
// 	    }
// 	    this.eui2pathInfo[eui] = this.eui2pathInfo[eui].concat(infos);
// 	},

   
// 	toString: function() {
// 	    var t = new Formatter.Table2(9);
// 	    t.setTitle("Mote", "Path-Id", "Src", "Dest", "Direction", "Num Links", "Quality", "RSSI Src->Dest", "RSSI Dest->Src");
// 	    var y = 0;
// 	    for (var eui in this.eui2pathInfo) {
// 		var paths = this.eui2pathInfo[eui];
// 		t.setValue(0, y, eui);
// 		for (var i = 0; i < paths.length; i++) {
// 		    var path = paths[i];
// 		    t.setValue(1, y, path.pathId.toString());
// 		    t.setValue(2, y, path.source);
// 		    t.setValue(3, y, path.dest);
// 		    t.setValue(4, y, path.direction);
// 		    t.setValue(5, y, path.numLinks);
// 		    t.setValue(6, y, path.quality);
// 		    t.setValue(7, y, path.rssiSrcDest);
// 		    t.setValue(8, y, path.rssiDestSrc);
// 		}
// 		y += 1;
// 	    }
// 	    return t.render().join("\n");
// 	}
//     }
// );




// Class.define(
//     "Dust.NetworkInfo",
//     /**
//      * @lends Dust.NetworkInfo.prototype
//      */
//     {
//         /**
//          * @constructs
//          */
//         __constr__: function() {},

//         /**
//          * @type Number
//          */
//         numMotes: -1,

//         /**
//          * @type Number
//          */
//         asnSize: -1,

//         /**
//          * @type Number
//          */
// 	advertisementState: -1,

//         /**
//          * @type Number
//          */
//         numLinks: -1,

//         /**
//          * @type Number
//          */
//         downFrameState: -1, 

//         /**
//          * @type Number
//          */
//         netReliability: -1,

//         /**
//          * @type Number
//          */
//         netPathStability: -1, 

//         /**
//          * @type Number
//          */
//         netLatency: -1, 

//         /**
//          * @type Number
//          */
//         netState: -1, 

// 	toString: function() {
// 	    return sprintf("numMotes %d, asnSize %d, advertisementState %d, downFrameState %d, netReliability %d; netPathStability %d, netLatency %d, netState %d", this.numMotes, this.asnSize, this.advertisementState, this.downFrameState, this.netReliability, this.netPathStability, this.netLatency, this.netState);
// 	}
//     }
// );











// Class.define(
//     "Dust.NetworkConfig",
//     /**
//      * @lends Dust.NetworkConfig.prototype
//      */
//     {
//         /**
//          * @constructs
//          */
//         __constr__: function() {},

//         /**
//          * @type Number
//          */
// 	networkId: -1, 

//         /**
//          * @type Number
//          */
// 	apTxPower: -1, 

//         /**
//          * @type Number
//          */
// 	frameProfile: -1,

//         /**
//          * @type Number
//          */
// 	maxMotes: -1, 

//         /**
//          * @type Number
//          */
// 	baseBandwidth: -1, 

//         /**
//          * @type Number
//          */
// 	downFrameMultVal: -1,

//         /**
//          * @type Number
//          */
// 	numParents: -1,

//         /**
//          * @type Number
//          */
// 	enableCCA: -1,

//         /**
//          * @type Number
//          */
// 	channelList: -1,

//         /**
//          * @type Number
//          */
// 	autoStartNetwork: -1,

//         /**
//          * @type Number
//          */
// 	locMode: -1,

//         /**
//          * @type Number
//          */
// 	bbMode: -1,

//         /**
//          * @type Number
//          */
// 	bbSize: -1,

//         /**
//          * @type Number
//          */
// 	isRadioTest: -1,

//         /**
//          * @type Number
//          */
// 	bwMult: -1,

//         /**
//          * @type Number
//          */
// 	oneChannel: -1,



// 	toString: function() {
// 	    return sprintf("networkId %d, apTxPower %d, frameProfile %d, maxMotes %d, baseBandwidth %d, downFrameMultVal %d, numParents %d, enableCCA %d, channelList %d, autoStartNetwork %d, locMode %d, bbMode %d, bbSize %d, isRadioTest %d, bwMult %d, oneChannel %d", this.networkId, this.apTxPower, this.frameProfile, this.maxMotes, this.baseBandwidth, this.downFrameMultVal, this.numParents, this.enableCCA, this.channelList, this.autoStartNetwork, this.locMode, this.bbMode, this.bbSize, this.isRadioTest, this.bwMult, this.oneChannel);
// 	}
//     }
// );






// Class.define(
//     "Dust.IPConfig",
//     /**
//      * @lends Dust.IPConfig.prototype
//      */
//     {
//         /**
//          * @constructs
//          */
//         __constr__: function() {},

//         /**
//          * @type String
//          */
// 	ip6addr: null,

//         /**
//          * @type String
//          */
// 	mask: null, 


// 	toString: function() {
// 	    return sprintf("ip6addr %H, mask %H", this.ip6addr, this.mask);
// 	}
//     }
// );






// Class.define(
//     "Dust.TimeInfo",
//     /**
//      * @lends Dust.TimeInfo.prototype
//      */
//     {
//         /**
//          * @constructs
//          */
//         __constr__: function() {},

//         /**
// 	 * In seconds.
//          * @type Number 
//          */
// 	uptime: null,

//         /**
// 	 * In seconds.
//          * @type Number 
//          */
// 	utcSecs: null,
	
//         /**
// 	 * In microseconds.
//          * @type Number 
//          */
// 	utcMicros: null,
	
//         /**
//          * @type Number
//          */
// 	asn: null,

//         /**
//          * @type Number
//          */
// 	asnOffset: null,

// 	toString: function() {
// 	    return sprintf("uptime %s, utc %s, asn %d, asnOffset %d",
// 			   Util.micros2str(this.uptime*1000*1000),
// 			   Util.micros2str(this.utcSecs*1000*1000 + this.utcMicros),
// 			   this.asn,
// 			   this.asnOffset);
// 	}
//     }
// );









// /**
//  * @type String
//  * @constant
//  */
// Dust.EVENT_NAME = "dust-ev";
// //Sonoran.Event.DUST = "dust-ev";



// Event.extend(
//     "Dust.Event",
//     /**
//      * @lends Dust.Event.prototype
//      */
//     {
// 	/**
// 	 * Dust.Event, base class for dust mote events.
// 	 * @augments Event
// 	 * @constructs
// 	 * @param dustType Dust event type
// 	 */
// 	__constr__: function(/** Number */dustType) {
// 	    Event.call(this, Dust.EVENT_NAME);
// 	    this.dustType = dustType;
// 	},

//        /**
// 	*  Dust event type such as Dust.EVTYPE.PATH_CREATE
// 	* @type Dust.EVTYPE
// 	*/
//        dustType: -1
//     }
// );



// Dust.Event.extend(
//     "Dust.PathEvent",
//     /**
//      * @lends Dust.PathEvent.prototype
//      */
//     {
// 	/**
// 	 * Path event. A path between two dust motes has been added/removed.
// 	 * @augments Event
// 	 * @constructs
// 	 * @param dustType Dust event type, Dust.EVTYPE.PATH_CREATE or Dust.EVTYPE.PATH_DELETE
// 	 */
// 	__constr__: function(/** Number */dustType, /** String */src, /** String */dst, /** Number */direction) {
// 	    Dust.Event.call(this, dustType);
// 	    this.src = src;
// 	    this.dst = dst;
// 	    this.direction = direction;
// 	},

//        /**
// 	* Source uniqueid.
// 	* @type String
// 	*/
//        src: null,

//        /**
// 	* Destination uniqueid.
// 	* @type String
// 	*/
//        dst: null,

//        /**
// 	* @type Number
// 	*/
//        direction: -1
//    }
// );
