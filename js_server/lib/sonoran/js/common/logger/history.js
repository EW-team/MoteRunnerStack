//  (C) COPYRIGHT INTERNATIONAL BUSINESS MACHINES CORPORATION 2006-2010
//                       ALL RIGHTS RESERVED
//        IBM Research Division, Zurich Research Laboratory
// --------------------------------------------------------------------


/**
 * Logger.History keeps the history of log messages.
 * @class
 * @constructor
 * @param capacity
 * @private
 */
Logger.History = function(capacity) {
    var _this = this;
    if (!capacity) { capacity = 1024; };
    this.notSeenMap = {};
    this.notSeenCnt = 0;
    var buf = this.buf = new Util.RingBuffer(capacity, 2);
    /** @ignore */
    buf.releaseOne = function() {
        assert(0);
    };
    /** @ignore */
    buf.releaseMany = function(cnt) {
        var id1 = buf.getFirst().id;
        var id2 = buf.get(cnt-1).id;
        for (var i = id1; i <= id2; i++) {
            if (_this.notSeenMap[i]) {
                delete _this.notSeenMap[i];
                _this.notSeenCnt -= 1;
                assert(_this.notSeenCnt >= 0);
            }
        }
        Util.RingBuffer.prototype.releaseMany.call(this, cnt);
    };
};


/** @private */
Logger.History.prototype = {
    /**
     * @type Util.RingBuffer
     * @private
     */
    buf: null,
    /**
     * Number of log messages not having retrieved yet.
     * @type Number
     * @private
     */
    notSeenCnt: 0,
    /**
     * @type Object
     * @private
     */
    notSeenMap: null,


    /**
     * @private
     */
    onEvent: function(/** Event.Log */ev) {
	this.buf.add(ev);
        this.notSeenMap[ev.id] = ev;
	this.notSeenCnt += 1;
    },


    /**
     * @returns {Number}  A marker for last log entry.
     * @private
     */
    getMarker: function() {
        return (this.buf.getUsed()==0) ? 0 : this.buf.getLast().id;
    },

    /**
     * @param marker
     * @returns {Number} Number of new events relative to this marker
     * @private
     */
    getNewlyArrivedCnt: function(/** Number */marker) {
        var pos = this.buf.getUsed() - 1;
        var cnt = 0;
        while(pos >= 0) {
	    var ev = this.buf.get(pos);
            if (ev.id <= marker) {
                break;
            }
            cnt += 1;
            pos -= 1;
        }
        return cnt;
    },
    
    /**
     *  @returns {Number} Count of messages since last low marker.
     * @private
     */
    getNotSeenCnt: function() {
        return this.notSeenCnt;
    },

    /**
     * Mark all log messages as seen.
     * @private
     */
    resetNotSeenCnt: function() {
        this.notSeenCnt = 0;
        this.notSeenMap = {};
    },

    /**
     * Return cnt messages from this cache.
     * @param cnt  Optional, number of messages to return
     * @param ll   Optional, map of module number to severity number determining which messages to log
     * @returns {String}
     * @private
     */
    getLog: function(/** Number */cnt, /** Object */ll) {
        var getNotSeen = false;
        if (cnt==undefined) {
	    getNotSeen = true;
	    cnt = this.buf.getUsed();
        }
        if (this.buf.getUsed() < cnt) {
	    cnt = this.buf.getUsed();
        }
        if (cnt==0) {
	    return "";
        }
        var pos = this.buf.getUsed()-1;
        var entries = [];
        while(cnt>0 && pos>=0) {
	    var ev = this.buf.get(pos);
	    if (ll) {
	        if (ll[ev.module]==undefined || ll[ev.module]<ev.severity) {
	            pos -= 1;
	            continue;
	        }
	    }
	    if (getNotSeen) {
                if (!this.notSeenMap[ev.id]) {
	            pos -= 1;
	            continue;
	        }
	    }
	    entries.push(ev);
            if (this.notSeenMap[ev.id]) {
                this.notSeenCnt -= 1;
                assert(this.notSeenCnt >= 0);
                delete this.notSeenMap[ev.id];
            }
	    cnt -= 1;
	    pos -= 1;
        }
        var _this = this;
        return entries.reverse().map(function(ev) { return _this.toText(ev); }).join("\n");
    },

    /**
     * @returns {String} 
     * @private
     */
    toString: function() {
        return "Logger.History";
    },

    /**
     * @returns {Object} Map of module name to severity number to number of messages
     * @private
     */
    getStats: function() {
        var used = this.buf.getUsed();
        var stats = {};
        for (var i = 0; i < used; i++) {
	    var e = this.buf.get(i);
	    var mod = e.module;
	    var sev = e.severity;
	    if (!stats[mod]) {
	        stats[mod] = {};
	    }
	    if (stats[mod][sev]==undefined) {
	        stats[mod][sev] = 0;
	    }
	    stats[mod][sev] += 1;
        }
        return stats;
    },


    /**
     * Default function to convert a log message to text.
     * @param ev         Log event
     * @returns {String} The message text
     * @private
     */
    toText: function(/** Event.Log */ev) {
	var txt = sprintf("%s  %-18s", Util.micros2str(ev.time), ev.module.toString() + ":" + Logger.severity2string(ev.severity));
	if (ev.mote) {
	    txt += sprintf("  %s", ev.mote.getUniqueid());
	}
	if (ev.logmsg) {
            txt += "\n    " + ev.logmsg.trimRight();
	}
	return txt;
    }
};


Logger.HISTORY = new Logger.History();
