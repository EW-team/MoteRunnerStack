//  (C) COPYRIGHT INTERNATIONAL BUSINESS MACHINES CORPORATION 2013-2013
//                       ALL RIGHTS RESERVED
//        IBM Research Division, Zurich Research Laboratory
// --------------------------------------------------------------------



/**
 * @class
 * @static
*/
LRSC.Sim = {

    /**
     * @type Number
     * @constant
     * @private
     */
    STD_PREAMBLE_LEN: 8,

    /**
     * @type String[]
     * @constant
     * @private
     */
    SIM_M2G_FRAME_KEYS: [ 'freq', 'bw', 'sf', 'cr', 'ih', 'nocrc', 'txbeg', 'txend', 'txpow', 'data' ], 

    /**
     * @type Number
     * @private
     */
    SIM_FRAME_ID: 0x10000,

    /**
     * @type Number
     * @private
     */
    ATTENUATION_C: -22,

    /**
     * @type Number
     * @private
     */
    ATTENUATION_L: 18,

    /**
     * @param rxpos
     * @param txpos
     * @param attenC
     * @param attenL
     */
    calcAttenuation: function(rxpos, txpos, txpow, attenC, attenL) {
	var dx = (rxpos[0]-txpos[0])/100.0;  // cm to meters
	var dy = (rxpos[1]-txpos[1])/100.0;
	var dz = (rxpos[2]-txpos[2])/100.0;
	var distance = Math.sqrt(dx*dx + dy*dy + dz*dz);
	if( distance==0 )
	    distance = 0.001;
	// Input/output dBm values are scaled by 1000
	// Simplified formula:
	//   Prx_dBm = Ptx_dBm - C - L log(d)
//QUACK(0,"txpow="+txpow);
	//REQUIRED?assert(txpow >= 1000 && txpow <= 20000);

	var rxpow = ( (parseFloat(txpow)/1000.0 - attenC - attenL * Math.log(distance)) * 1000.0 );
	return rxpow;
    },


    /**
     * Calculate air time of a frame using LoRa modulation.
     * @param bw
     * @param sf
     * @param plen
     * @param cr
     * @param ih
     * @param crc
     * @param dro
     * @param npreamble
     * @returns {Number}
     * @public
     */
    calcAirTime: function (/** Number */bw, /** Number */sf, /** Number */plen, /** Number */cr, ih, /** Number */crc, /** Number */dro, /** Number */npreamble) {

	if( sf == 0 ) {
	    // FSK: 100kbit/s
	    // XXX:preamble 6 bytes - guess
	    return (plen + 6) * 8000000 / 100000;
	}
	if( npreamble == null )
	    npreamble = this.STD_PREAMBLE_LEN;
	if( dro == null )
	    dro = 0;

	assert(bw==125000 || bw==250000 || bw==500000);
	assert(sf>=7 && sf<=12);
	assert(plen>=0 && plen<=255);
	assert(cr>=1 && cr<=4);
	assert((ih>=0&&ih<=255) && (crc==0||crc==1) && (dro==-1||dro==0||dro==1));

	if( (sf==11 || sf==12) && dro==0 )
	    dro = 1;  // mandatory for SF11/SF12 if dro==0 means use default, -1 means force off
	// Symbol rate / time for one symbol (secs)
	var Rs = parseFloat(bw) / (1<<sf);
	var Ts = 1/Rs;
	// Length/time of preamble
	var Tpreamble = (npreamble + 4.25) * Ts;
	// Symbol length of payload and time
	var tmp = Math.ceil(parseFloat((8*plen - 4*sf + 28 + 16*crc - (ih?20:0))) / (4*sf-(dro>0?8:0))) * (cr+4);
	//QUACK(0, "TMP1: " + tmp);
	var npayload = 8 + (tmp > 0 ? tmp : 0);
	var Tpayload = npayload * Ts;
	// Time on air 
	var Tonair = Tpreamble + Tpayload;
	// return us secs
	return Math.ceil(Tonair*1E6);
    },


    /**
     * @returns {Sonoran.Mote[]}
     * @private
     */
    getAllSimuLoraMotes: function() {
	return Sonoran.Registry.filterMotes(function(mote) { return ((mote.isSimulated()) && (Saguaro.mote2impl(mote).getDeviceInstance("LORA"))); });
    }
};






LRSC.GwConn.extend(
    "LRSC.Sim.GwConn",
    /**
     * @lends LRSC.Sim.GwConn.prototype
     */
    {
	/**
	 * @constructs
	 * @augments LRSC.GwConn
	 * @param nwksrv
	 * @param gwid
	 * @param eui
	 */
	__constr__:function (/** LRSC.NwkServer */nwksrv, /** Number */gwid, /** String */eui) {
	    LRSC.GwConn.call(this, nwksrv, gwid, eui);
	    this.tid2timer = {};
	    this.sens = -117000; // milli dBm
	    this.aC = LRSC.Sim.ATTENUATION_C;
	    this.aL = LRSC.Sim.ATTENUATION_L;
	    this.txpow = 20;
	},

	/**
	 *
	 */
	close: function() {
	    for (var tid in this.tid2timer) {
		var timer = this.tid2timer[tid];
		timer.cancel();
	    }
	    this.nwksrv.onGatewayClose(this, new AOP.OK());
	},

	/**
	 * @param ev
	 * @param frame
	 * @param mote
	 * @returns {Object} frame to forward if received by this gateway
	 */
	onMote2gwEvent: function(/** Sonoran.Event */ev, /** Object */frame, /** Sonoran/Mote */mote) {
	    //QUACK(0,"XXX =======================onMote2gwEvent: freq="+frame.freq+"\n");//XXX:debug
	    var rxpos = [ frame["pos-x"], frame["pos-y"], frame["pos-z"] ];
	    var txpos = [ this.position.x,  this.position.y, this.position.z ]; 
	    var txpow = 1000 * frame.txpow;
	    if (txpow >= 20000) 
		txpow = 20000;
	    var rssi = LRSC.Sim.calcAttenuation(rxpos, txpos, txpow, this.aC, this.aL);
	    if (rssi < this.sens) {
		// drop packet
		Logger.println("Drop frame: " + Util.formatData(frame), "LORA");
		return;
	    }

	    var data = {};
	    for (var i = 0; i < LRSC.Sim.SIM_M2G_FRAME_KEYS.length; i++) {
		var key = LRSC.Sim.SIM_M2G_FRAME_KEYS[i];
		assert(frame[key] !== undefined, "Key: " + key);
		data[key] = frame[key];
	    }
	    data.rssi = rssi/1000;
	    data.snr = rssi/1000;
	    //QUACK(0, "onFrame: txend " + data.txend + ", " + Util.micros2str(data.txend));
	    this.nwksrv.onEvent('data', this.gwid, data);
	},


	/**
	 * Send frame at time specified in frame. Uses a Saugaro.Timer.
	 * @param frame
	 * @param mote
	 * @private
	 */
	sendFrame: function(/** Object */frame, /** Sonoran.Mote */mote) {
	    //QUACK(0,"XXX =======================send\n");//XXX:debug
	    assert(mote);
	    var txbeg = frame.txbeg; // micros!
	    frame = this.completeFrame(frame);
	    var simConn = this.nwksrv.simConn;
	    assert(simConn);
	    var deadline = Saguaro.Timer.micros2Time(txbeg, simConn);
	    var tid2timer = this.tid2timer;
	    var timer = new Timer.Timer(null, deadline, function() {
		tid2timer[timer.getId()] = null;
		var txt = sprintf("Sim.GwConn.send: txbeg %s, freq %d, sf %d, data %H", Util.micros2str(frame.txbeg), frame.freq, frame.sf, frame.data);
		Logger.println(txt, "LORA");
		var impl = Saguaro.mote2impl(mote);
		simConn.sendMedia(impl, frame);
		//QUACK(0,"XXX =======================simConn.sendMedia frame.freq="+frame.freq+"\n");//XXX:debug
	    });
	    this.tid2timer[timer.getId()] = timer;
	    timer.start();
	},



	/**
	 * @param frame
	 * @private
	 */
	sendBeacon: function(frame,seconds) {
	    var simConn = this.nwksrv.simConn;
	    assert(simConn);

	    frame.data = this.nwksrv.getBeaconPdu(seconds);
	    frame = this.completeFrame(frame);
	    //QUACK(0, "Beacon: " + Util.formatData(frame));
	    var motes = LRSC.Sim.getAllSimuLoraMotes();
	    for( var i=0; i< motes.length; i++ ) {
		var impl = Saguaro.mote2impl(motes[i]);
		simConn.sendMedia(impl, frame);
	    }
	},


	/**
	 * @private
	 */
	completeFrame: function(frame) {
	    frame.media = "g2m/lora";
	    assert(frame.txbeg!=null);

	    assert(!frame.interval, "Beacon should be set differently!");
	    assert(frame.freq);
	    assert(frame.bw);
	    assert(frame.sf);
	    if (frame.cr    == null) frame.cr    = 1;
	    if (frame.ih    == null) frame.ih    = 0;
	    if (frame.nocrc == null) frame.nocrc = 0;
	    if (frame.txpow == null) frame.txpow = this.txpow;
	    assert(frame.data != null);

	    if( frame.bw!=125000 && frame.bw!=250000 && frame.bw!=500000 )
		throw "Illegal bandwidth (must be one of 125000,250000,500000): "+frame.bw;
	    if( frame.sf!=/*FSK*/0 && !(frame.sf>=7 && frame.sf<=12) )
		throw "Illegal spreading factor (must be one of 0,7-12): "+frame.sf;
	    if( frame.cr < 1 && frame.cr > 4 )
		throw "Illegal coding rate (must be one 1-4): "+frame.cr;
	    if( frame.ih != 0 && frame.ih != 1 )
		throw "Illegal implicit header value (must be 0 or 1): "+frame.ih;
	    if( frame.nocrc != 0 && frame.nocrc != 1 )
		throw "Illegal no CRC value (must be 0 or 1): "+frame.nocrc;

	    frame.txend = frame.txbeg + LRSC.Sim.calcAirTime(frame.bw, frame.sf, frame.data.length, frame.cr, frame.ih, !frame.nocrc);
	    frame.txbeg *= 1000;
	    frame.txend *= 1000;
	    
	    frame.frameid = LRSC.Sim.SIM_FRAME_ID;
	    LRSC.Sim.SIM_FRAME_ID += 1;

	    frame.device = "LORA";
	    frame["pos-x"] = this.position.x;
	    frame["pos-y"] = this.position.y;
	    frame["pos-z"] = this.position.z;
	    return frame;
	},


	/**
	 * @param mote
	 * @param freq
	 * @param dr
	 * @param txbeg
	 * @param data
	 * @private
	 */
	sendNow: function(/** Sonoran.Mote */mote, /** Number */freq, /** Numbe */dr, /** Number */txbeg, /** String */data) {
	    var txpow = 14;
	    var cr = 1; // -> SaguaroDEFS.LORA_MODE_CR_4_5;
	    var ih = 0;
	    var obj = LRSC.mapDatarate2SfBw(dr);
	    var frame = {
	    	txbeg: txbeg,
	    	freq: freq,
	    	bw: obj.bw,
	    	sf: obj.sf,
	    	cr: cr,
	    	ih: ih,
	    	nocrc: 1, 
	    	gwid: this.gwid,
	    	data: data
	    };
	    frame = this.completeFrame(frame);
	    var conn = this.nwksrv.simConn;
	    assert(conn);
	    var impl = Saguaro.mote2impl(mote);
	    //var txt = sprintf("Sim.GwConn.sendImmediately: txbeg %s, freq %d, sf %d, data %H", Util.micros2str(frame.txbeg), frame.freq, frame.sf, frame.data);
	    //println(txt);
	    conn.sendMedia(impl, frame);
	}
    }
);




Class.define(
    "LRSC.Sim.BeaconTransmitter",
    /**
     * @lends LRSC.Sim.BeaconTransmitter.prototype
     */
    {
	/**
	 * @constructs
	 * @param nwksrv
	 * @private
	 */
	__constr__: function(/** LRSC.NwkServer */nwksrv) {
	    this.nwksrv = nwksrv;
	    this.intervalSecs = LRSC.BEACON_INTERVAL_SECS;
	    this.txparams = {
		freq:869525000, //868500000, 868100000,
		bw:125000,
		sf:9,
		cr:1,
		ih:1,
		nocrc:1,
		txpow:127
	    };
	    this.timer = null;
	    //QUACK(0, "INTERVAL_SECS: " + this.intervalSecs);
	    this.lastBeaconMicros = 0;
	    this.nextBeaconMicros = 0;
	},

	/**
	 * @private
	 */
	start: function() {
	    if (this.timer) {
		this.stop();
		assert(!this.timer);
	    }
	    var simConn = this.nwksrv.simConn;
	    assert(simConn);
	    simConn.haltCmd(BLCK);
	    var res = simConn.timeCmd(BLCK);
	    var nanos = res.getReplyData().time;
	    var now = parseInt(nanos/1000);
	    var noff = this.nwksrv.getNwkid() * 1000000;
	    var odd = (now - noff) % LRSC.BEACON_INTERVAL_us;
	    var micros = now - odd + LRSC.BEACON_INTERVAL_us;
	    this.nextBeaconMicros = micros;
	    this.lastBeaconMicros = this.nextBeaconMicros - LRSC.BEACON_INTERVAL_us;
	    this.timer = new Timer.Timer(null, Saguaro.Timer.micros2Time(micros, simConn), this.onTimeout.bind(this));
	    this.timer.start();
	    simConn.continueCmd(null, null, null, BLCK);
	},

	/**
	 * @private
	 */
	stop: function() {
	    if (this.timer) {
		this.timer.cancel();
		this.timer = null;
	    }
	},


	/**
	 * @private
	 */
	onTimeout: function() {
	    var frame = Blob.copy(this.txparams);
	    frame.txbeg = this.timer.getDeadline().toMicros();
	    //QUACK(0, "Beacon at: " + frame.txbeg + ", " + Util.micros2str(frame.txbeg));

	    // make sure we insert seconds in the beacon
	    var simConn = this.nwksrv.simConn;
	    assert(simConn);
	    var res = simConn.timeCmd(BLCK);
	    var time = res.getReplyData().time;
	    var seconds = time / 1e9;
	    var gwConns = this.nwksrv.gwConns;
	    for (var i = 0; i < gwConns.length; i++) {
		var gwConn = gwConns[i];
		if (gwConn.isSimulated()) {
		    gwConn.sendBeacon(frame, seconds);
		}
	    }


	    var simConn = this.nwksrv.simConn;
	    assert(simConn);
	    
	    var res = simConn.timeCmd(BLCK);
	    var time = res.getReplyData().time;
	    //QUACK(0, "Time: " + time);
	    //var micros = Saguaro.Timer.micros2Time(time/1000, simConn);
	    
	    var micros = parseInt(time/1000  + this.intervalSecs * 1000 * 1000);
	    this.lastBeaconMicros = this.nextBeaconMicros;
	    this.nextBeaconMicros = micros;
	    
	    this.timer = new Timer.Timer(null, Saguaro.Timer.micros2Time(micros, simConn), this.onTimeout.bind(this));
	    this.timer.start();
	}
    }
);









