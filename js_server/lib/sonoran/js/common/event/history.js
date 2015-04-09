// //  (C) COPYRIGHT INTERNATIONAL BUSINESS MACHINES CORPORATION 2006-2010
// //                       ALL RIGHTS RESERVED
// //        IBM Research Division, Zurich Research Laboratory
// // --------------------------------------------------------------------



// /**
//  * Event.History keeps a history of events.
//  * @class
//  * @constructor
//  * @param capacity
//  * @private
//  */
// Event.History = function(/** Number */capacity) {
//     var _this = this;
//     if (!capacity) {
//         capacity = 1024;
//     }
//     this.notSeenMap = {};
//     this.notSeenCnt = 0;
    
//     var buf = this.buf = new Util.RingBuffer(capacity, 2);
//     /** @ignore */
//     buf.releaseOne = function() {
//         assert(0);
//     };
//     /** @ignore */
//     buf.releaseMany = function(cnt) {
//         var id1 = buf.getFirst().id;
//         var id2 = buf.get(cnt-1).id;
//         for (var i = id1; i <= id2; i++) {
//             if (_this.notSeenMap[i]) {
//                 delete _this.notSeenMap[i];
//                 _this.notSeenCnt -= 1;
//                 assert(_this.notSeenCnt >= 0);
//             }
//         }
//         Util.RingBuffer.prototype.releaseMany.call(this, cnt);
//     };
//     /** @ignore */
//     var func = function(ev) {
// 	if (Event.isTimerEvent(ev)) {
// 	    return;
// 	}
// 	if (Event.History.CAT_BLACKLIST[ev.category]) {
//             return;
//         }
// 	_this.buf.add(ev);
//         _this.notSeenMap[ev.id] = ev;
//         _this.notSeenCnt += 1;
//     };
//     this.listener = Event.Registry.addObserver(func);
// };

// /**
//  * @type String[]
//  * @private
//  */
// Event.History.CAT_BLACKLIST = {};
// Event.History.CAT_BLACKLIST[Event.EV_CAT_TIMER] = true;
// Event.History.CAT_BLACKLIST[Event.EV_CAT_LOG] = true;

// /** @private */
// Event.History.prototype = {
//     /**
//      * @type Util.RingBuffer
//      * @private
//      */
//     buf: null,

//     /**
//      * @type Object
//      * @private
//      */
//     notSeenMap: null,

//     /**
//      * @type Number
//      * @private
//      */
//     notSeenCnt: 0,

//     /**
//      * Registry listener
//      * @type Util.Listeners
//      * @private
//      */
//     listener: null,
    
//     /**
//      * @returns {Number}  a marker for last log entry.
//      * @private
//      */
//     getMarker: function() {
//         return (this.buf.getUsed()==0) ? 0 : this.buf.getLast().id;
//     },

//     /**
//      * @returns {Number} number of events not yet seen
//      * @private
//      */
//     getNotSeenCount: function() {
//         return this.notSeenCnt;
//     },

//     /**
//      * Set all events having been seen.
//      * @private
//      */
//     resetNotSeenCnt: function() {
//         this.notSeenCnt = 0;
//         this.notSeenMap = {};
//     },

//     /**
//      * Clear history.
//      * @private
//      */
//     reset: function() {
//         this.notSeenMap = {};
//         this.notSeenCnt = 0;
//         this.buf.removeAll();
//     },

//     /**
//      * Close this history buffer. Stop recording events.
//      * @private
//      */
//     close: function() {
//         Event.Registry.removeListener(this.listener);
//         this.buf = null;
//         this.notSeenCnt = 0;
//         this.notSeenMap = null;
//     },
    
//     /**
//      * Match entries against filter and return result set.
//      * @param cnt       Maximum number of events to return
//      * @param marker    Stop when this marker is reached
//      * @param filter
//      * @private
//      */
//     filter: function(/** Number */cnt, /** Number */marker, /** Event.Filter */filter) {
//         var set = new Event.Set();
//         assert(filter);
//         if (cnt==undefined) {
// 	    cnt = this.buf.getUsed();
//         }
//         if (this.buf.getUsed() < cnt) {
// 	    cnt = this.buf.getUsed();
//         }
//         if (cnt==0) {
// 	    return set;
//         }
//         var pos = this.buf.getUsed()-1;
//         //var entries = [];
//         while(cnt>0 && pos>=0) {
// 	    var entry = this.buf.get(pos);
//             if (marker && entry.id == marker) {
//                 break;
//             }
//             if (filter.match(entry, set)) {
// 	        //entries.push(entry);
//                 if (this.notSeenMap[entry.id]) {
//                     this.notSeenCnt -= 1;
//                     assert(this.notSeenCnt >= 0);
//                     delete this.notSeenMap[entry.id];
//                 }
// 	        cnt -= 1;
//             }
// 	    pos -= 1;
//         }
//         return set;
//     },

//     /**
//      * Find event matching given PropertyFilter.
//      * @param filter
//      * @private
//      */
//     find: function(/** Util.PropertyFilter */filter) {
//         var pos = this.buf.getUsed()-1;
//         while(pos>=0) {
// 	    var entry = this.buf.get(pos);
//             if (filter.match(entry)) {
//                 return entry;
//             }
//             pos -= 1;
//         }
//         return null;
//     },


//     /**
//      * @returns {String} string
//      * @private
//      */
//     toString: function() {
//         return "Event.History";
//     }
// };




// /**
//  * Event.Filter filters events from Event.History
//  * @class
//  * @constructor
//  * @param tags
//  * @param intervals
//  * @private
//  */
// Event.Filter = function(/** String[] */tags, /** Object */intervals) {
//     /**
//      * Tags to match in events
//      * @type String[]
//      * @private
//      */
//     this.tags = (tags&&tags.length>0) ? tags : null;
//       /**
//      * Array of intervals to match, each entry is an object with start and end properties (microseconds).
//      * @type Object[]
//      * @private
//      */
//     this.intervals = (intervals&&intervals.length>0) ? intervals : null;
// };

// /** @private */
// Event.Filter.prototype = {
//     /**
//      * Configure tags for this filter.
//      * @param tags
//      * @private
//      */
//     setTags: function(/** String[] */tags) {
//         this.tags = tags;
//     },

//     /**
//      * Configure time intervals  for this filter.
//      * @param tags
//      * @private
//      */
//     setIntervals: function(/** Object[] */intervals) {
//         this.intervals = intervals;
//     },

//     /**
//      * Match event and add to result on match.
//      * @param ev
//      * @param result      If given, ev is added to it on match
//      * @returns {Boolean} whether filter matched
//      * @private
//      */
//     match: function(/** Event */ev, /** Event.Set */result) {
// 	assert(result);
//         var tags;
//         var interval;
//         if (this.tags||this.intervals) {
//             if (this.tags) {
// 		var lines = Event.Formatter.toText(ev);
//                 tags = this.findTags(this.tags, lines);
//                 if (tags.length == 0) {
//                     return false;
//                 }
//             }
//             if (this.intervals) {
//                 var time = ev.time;
//                 if (!time) {
//                     return false;
//                 }
//                 for (interval = 0; interval < this.intervals.length; interval++) {
//                     var d = this.intervals[interval];
//                     if (time >= d.start && time < d.end) {
//                         break;
//                     }
//                 };
//                 if (interval == this.intervals.length) {
//                     return false;
//                 }
//             }
//         }
//         if (result) {
//             result.add(ev);
//         }
//         return true;
//     },

//     /**
//      * Find tags in event matching this filter tags.
//      * @param thisTags
//      * @param lines
//      * @private
//      */
//     findTags: function(/** String[] */thisTags, /** String[] */lines) {
//         var tags = [];
//         for (var i = 0; i < thisTags.length; i++) {
//             var thisTag = thisTags[i];
//             for (var j = 0; j < lines.length; j++) {
//                 var l = lines[j];
// 		if (l.indexOf(thisTag) >= 0) {
// 		    tags.push(thisTag);
//                 }
//             }
//         }
//         return tags;
//     }
// };







// /**
//  * Event.Set carries a set of filtered events.
//  * @class
//  * @constructor
//  * @private
//  */
// Event.Set = function() {
//     /**
//      * Matched events.
//      * @type Event[]
//      * @private
//      */
//     this.entries = [];
// };

// /** @private */
// Event.Set.prototype = {
//     /** @ignore */
//    __constr__: "Event.Set",

//     /**
//      * Add a match to this set
//      * @param ev
//      * @private
//      */
//     add: function(/** Event */ev) {
//         this.entries.push(ev);
//     },

//     /**
//      * Render tables with matched entries.
//      * @returns {String}
//      * @private
//      */
//     toString: function() {
//         var entries = this.entries.reverse();
//         var width = -1;
// 	var segments = [];
//         for (var i = 0; i < entries.length; i++) {
//             var evt = entries[i];
// 	    var lines = Event.Formatter.toText(evt);
// 	    if (lines.length>0) {
// 		lines.forEach(function(line) { if (line.length>width) { width = line.length; } });
// 		segments.push(lines);
// 	    }
// 	}
// 	var separator = width>0 ? "\n" + Util.multiplyString("-", width) : "";
// 	var s = "";
// 	segments.forEach(function(seg) {
// 	    s += seg.join("\n");
// 	    s += separator;
// 	    s += "\n";
// 	});
// 	return s;
//     }
// };







 

