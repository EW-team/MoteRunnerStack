//  (C) COPYRIGHT INTERNATIONAL BUSINESS MACHINES CORPORATION 2013-2013
//                       ALL RIGHTS RESERVED
//        IBM Research Division, Zurich Research Laboratory
// --------------------------------------------------------------------



Class.define(
    "LRSC.MoteAttr",
    /**on
     * @lends LRSC.MoteAttr.prototype
     */
    {
	/**
	 * @constructs
	 * @param nwksrv
	 * @param mote
	 * @param addr
	 * @param arteui
	 * @private
	 */
	__constr__: function(/** Object */nwksrv, /** Sonoran.Mote */mote, /** Number */addr, /** String */arteui) {
	    assert(mote);
	    this.nwksrv = nwksrv;
	    this.mote = mote;
	    this.addr = addr;
	    this.arteui = arteui;
	    this.currContact = null;
	    this.lastConc = null;
	    this.txjobs = [];
	    this.currTxjob = null;
	    this.seqnoDn = 0;
	    this.seqnoUp = 0;
	    this.SEQNO_DN_STEP = 1;

	    var bytes = Formatter.hexToBin(Util.UUID.eui642hex(this.mote.getUniqueid()));
	    var ba = new Array(16);
	    for (var i = 0; i < 16; i++) { ba[i] = 0; }
	    for (var i = 0; i < 8; i++) {
		var b = bytes.charCodeAt(7-i);
		ba[i+0]= String.fromCharCode((b^0xAA)&0xff);
		ba[i+8]= String.fromCharCode((b^0x55)&0xff);
	    }
	    this.devkey = ba.join("");
	    this.artkey = null;
	    this.nwkkey = null;

	    this.pingSlot = new LRSC.MoteAttr.PingSlot(this);
	},

	/**
	 * Object keeping received frames and info of all gateways during a receive window.
	 * received from.
	 * @type Object
	 * @private
	 */
	currContact: null,

	/**
	 * Last concentrator we received a message from.
	 * @type Object
	 * @private
	 */
	lastConc: null,


	/**
	 * Array of transmit jobs.
	 * @type LRSC.MoteAttr.TxJob[]
	 * @private
	 */
	txjobs: null,

	/**
	 * Current job.
	 * @type LRSC.MoteAttr.TxJob
	 * @private
	 */
	currTxjob: null,

	/**
	 * Sequence nuber to send down to mote.
	 * @type Number
	 * @private
	 */
	seqnoDn: 0,

	/**
	 * Last sequence nuber received.
	 * @type Number
	 * @private
	 */
	seqnoUp: 0,


	/**
	 * @returns {String}
	 */
	toString: function() {
	    return this.mote.getUniqueid();
	},


	/**
	 * @returns {Number}
	 */
	getAddr: function() {
	    return this.addr;
	},



	/**
	 * @returns {LRSC.Sim.GwConn} Last gateway we received strongest signal from
	 */
	getLastGateway: function() {
	    return this.lastConc ? this.nwksrv.getGatewayById(this.lastConc.gwid) : null;
	},

	
	/**
	 * @param obj with properties mode, port, payload
	 * @param callback
	 * @private
	 */
	addTxJob: function(/** Object */obj, /** Function */callback) {
	    assert(obj.rqDataConfirm===undefined);
	    if (obj.mode===undefined) {
		obj.mode = 0;
	    }
	    assert(obj.mode!=null, Runtime.getStackTrace());
	    if ((this.txjobs.length>0) && (this.txjobs[this.txjobs.length-1].addPayload(obj, callback))) {
		// previous command is pure mac command, we could add port and payload to it.
		return;
	    }
	    var hdr = (obj.mode&LRSC.ADN_MODE_CONFIRMED) ? SaguaroDEFS.LORA_HDR_FTYPE_DCDN : SaguaroDEFS.LORA_HDR_FTYPE_DADN;  
	    var packet = new LRSC.Packet(this.addr, hdr, 0, this.seqnoDn, "", obj.port, obj.payload, "\0\0\0\0");
	    var txjob = new LRSC.MoteAttr.TxJob(this, this.seqnoDn, packet, null, callback);
	    this.seqnoDn += this.SEQNO_DN_STEP;
	    this.txjobs.push(txjob);
	},
	

	/**
	 * @param opts
	 * @private
	 */
	addMacCommand: function(/** String */opts) {
	    if (this.txjobs.length>0) {
		this.txjobs[this.txjobs.length-1].addOpts(opts);
		return;
	    }
	    var packet = new LRSC.Packet(this.addr, SaguaroDEFS.LORA_HDR_FTYPE_DADN, 0, this.seqnoDn, opts, null, null, "\0\0\0\0");
	    var txjob = new LRSC.MoteAttr.TxJob(this, this.seqnoDn, packet, opts, function() { ; });
	    this.seqnoDn += this.SEQNO_DN_STEP;
	    this.txjobs.push(txjob);
	},

	
	/**
	 * @param sf
	 * @param bw
	 * @param txpow
	 * @private
	 */
	requestAdaptDatarate: function(/** String */sf, /** Number */bw, /** Number */txpow) {
	    assert(bw === 125000 || bw === 250000);
	    assert(sf>=7&&sf<=12);
	    var datarate = LRSC.mapSfBw2Datarate(sf, bw);
	    var pow;
	    if (txpow > 14) {
		pow = 0;
	    } else if (txpow > 11) {
		pow = 1;
	    } else if (txpow > 8) {
		pow = 2;
	    } else if (txpow > 5) {
		pow = 3;
	    } else if (txpow > 2) {
		pow = 4;
	    } else {
		pow = 5;
	    }
	    var opts = Formatter.pack("1u1u2uL", 0x03, (datarate<<4)|(pow), 0);
	    assert(opts.length>0);
	    this.addMacCommand(opts);
	},


	/**
	 * @param maxDCycle 
	 * @private
	 */
	requestTransmitDutyCycle: function(/** Number */maxDCycle) {
	    var opts = Formatter.pack("1u1u", 0x04, maxDCycle);
	    this.addMacCommand(opts);
	},



	


	/**
	 * @param frame
	 * @param gwConn
	 * @private
	 */
	onRxFrame: function(frame, gwConn) {
	    var arrival   = Timer.getTime(this.mote).toMillis();
	    var conc = {
		name  : gwConn.getName(),
		gwid:    gwConn.getId(),
		snr    : frame.snr,
		rssi   : frame.rssi,
		reftime: frame.txend 
	    };

	    if (this.currContact != null) {
		if (frame.data != this.currContact.data) {
		    Logger.warn(sprintf("%s: frame data mismatch '%H' <-> '%H' from gateway '%s'\n", this.mote, frame.data, this.currContact.data, gwConn.getName()));
		    return;
		}
		if ((arrival - this.currContact.arrival) > LRSC.GATEWAY_RECEIVE_WINDOW_SPAN) {
		    Logger.warn(sprintf("%s: received frame data too late from gateway '%s'\n", this.mote, gwConn.getName()));
		    return;
		}
		this.currContact.concs.push(conc);
		return;
	    }

	    this.currContact = {
		arrival  : arrival,
		concs  : [ conc ]
	    };

	    if (this.nwksrv.getGatewayCnt() == 1) {
		this.onRxEnd(frame, new AOP.OK());
	    } else {
		Timer.timeoutIn(LRSC.GATEWAY_RECEIVE_WINDOW_SPAN, this.mote, this.onRxEnd.bind(this, frame));
	    }
	},


	/**
	 * @param frame
	 * @param status
	 * @private
	 */
	onRxEnd: function(frame, status) {
	    var contact = this.currContact;
	    this.currContact = null;
	    var currConc = null;
	    // Find best link among all concentrators that have forwarded this msg
	    var clist = contact.concs; 
	    for (var ci = 0; ci < clist.length; ci++ ) {
		var cc = clist[ci];
		// Select "best" return path:
		// XXX:currently RSSI only, could also consider airtime conflicts etc.
		if (currConc == null || currConc.rssi < cc.rssi) {
		    currConc = cc;
		}
	    }
	    assert(currConc);
	    this.lastConc = currConc;
	    
	    // Sort concentrator receiver list by RSSI
	    contact.concs.sort(function (a,b) { return a.rssi==b.rssi ? 0 : a.rssi>b.rssi ? -1 : 1;});
	    frame.snr = currConc.snr;
	    frame.rssi = currConc.rssi;

	    Logger.println(sprintf("LRSC.Mote.onRxEnd: %s: gwid %d, freq %d, sf %d, bw %d, txpow %d", this, currConc.gwid, frame.freq, frame.sf, frame.bw, frame.txpow), "LORA");

	    var hdr = frame.data.charCodeAt(0);
	    var ftype = (hdr&SaguaroDEFS.LORA_HDR_FTYPE);
	    switch(ftype) {
	    case SaguaroDEFS.LORA_HDR_FTYPE_JREQ: {
		var packet = LRSC.unpackJoinPacket(frame.data);
		this.onJoinPacket(packet, frame, contact, currConc);
		break;
	    }
	    case SaguaroDEFS.LORA_HDR_FTYPE_REJOIN: {
		var packet = LRSC.unpackJoinPacket(frame.data);
		this.onRejoinPacket(packet, frame, contact, currConc);
		break;
	    }
	    default: {
		var packet = this.unpackDataPacket(frame.data);
		this.onDataPacket(packet, frame, contact, currConc);
	    }
	    }
	},


	/**
	 * @private
	 */
	onRejoinPacket: function(packet, frame, contact, conc) {
	    

	},

	
	/**
	 * @private
	 */
	onJoinPacket: function(packet, frame, contact, conc) {
	    assert(this.mote);

	    var appnounce = "\0\0\0";
	    var netid = "\0\0\0";

	    var ret = LRSC.AES.sessKeys(this.devkey, packet.nonce, appnounce, netid);
	    this.nwkkey = ret.nwkkey;
	    this.artkey = ret.artkey;
//	    printf("XXX===========onJoinPacket session keys:%H / %H\n",ret.nwkkey,ret.artkey);//XXX:debug
	    Logger.println(sprintf("LRSC.Mote.onJoinPacket: arteui %s, devkey %H, nwkkey %H, artkey %H", packet.arteui, this.devkey, this.nwkkey, this.artkey), "LORA");
	    
	    var artsrv = this.nwksrv.getArtSrv(packet.arteui);
	    if (artsrv) {
		artsrv.onAjn(this.mote.getUniqueid(), packet.arteui, this.nwksrv.getNwkEui());
	    }

	    var pdu = String.fromCharCode(SaguaroDEFS.LORA_HDR_FTYPE_JACC) + appnounce + netid + Formatter.pack("4uL2uL", this.addr, 0x0);
	    var mic = LRSC.AES.calcMic0(this.devkey, pdu);
	    pdu += Formatter.pack("4uB", mic);
	    //printf("XXX===========onJoinPacket:%H\n",pdu);//XXX:debug
	    pdu = String.fromCharCode(SaguaroDEFS.LORA_HDR_FTYPE_JACC) + LRSC.AES.decrypt(this.devkey, pdu.substr(1));
	    this.sendResponse(this.getLastGateway(), frame, LRSC.MOTE_JOIN_RECEIVE_WINDOW_OFF, pdu); 
	},



	/**
	 * @param packet
	 * @param frame
	 * @param contact
	 * @param conc
	 * @private
	 */
	onDataPacket: function(packet, frame, contact, conc) {
	    Logger.println(sprintf("LRSC.Mote.onDataPacket: %s\n%s", this, packet), "LORA");

	    //var packetOpts = LRSC.MacCommand.parse(packet.opts);
	    
	    // Check whether received packet is ACK for a previous confirm message
	    if (this.currTxjob != null) {
		assert(this.currTxjob.packet.isDCDN());
		if ((packet.fct & SaguaroDEFS.LORA_FCT_ACK_MASK) != 0) {
		    // received ack
		    Logger.println(sprintf("LRSC.Mote.onDataPacket: %s received confirmation", this), "LORA");
		    this.currTxjob.callback(new AOP.OK());
		    this.currTxjob = null;
		}
	    }

	    
	    var artsrv = this.nwksrv.getArtSrv(this.arteui);
	    if (artsrv) {
		if (packet.port!=null) {
		    artsrv.onAup(this.mote.getUniqueid(), packet.seqno, packet.port, packet.payload);
		}
	    }


	    this.seqnoUp = packet.seqno;    // XXX
	    assert(this.seqnoUp >= 0);
	    
	    
	    // if mote sent DATA_CONFIRM, make sure that ACK is sent back with the next packet transmitted to the mote.
	    // if no packet is in txjobs, create one.
	    var mustConfirm = packet.isDCUP();
	    var mustAckadr = packet.requestsAdrAck();
	    if (mustConfirm || mustAckadr) {
		if (this.txjobs.length === 0) {
		    var _this = this;
		    Logger.println(sprintf("LRSC.Mote.onDataPacket: %s: create new packet to transmit an ack for CONFIRM or ADR.", this), "LORA");
		    this.addTxJob({}, function(status) {
			if (status.code !== 0) {
			    Logger.println(sprintf("LRSC.Mote.onRx: %s: ack transmission failed, status: %s", _this, status.toString()), "LORA");
			}
		    });
		}
		if (mustConfirm) {
		    this.txjobs[0].setAck();
		}
	    }

	    var _this = this;
	    this.handleTxjob(function(data, conc) { _this.sendResponse(conc, frame, LRSC.MOTE_DATA_RECEIVE_WINDOW_OFF, data); });

	    this.pingSlot.onDataPacket(packet);
	},

	

	/**
	 * @param {String} pdu
	 * @returns {LRSC.Packet} packet
	 * @private
	 */
	unpackDataPacket: function(pdu) {
	    var arr =  Formatter.unpack("1u4uL1u2uL*d", pdu);
	    var hdr = arr[0];
	    var addr = arr[1];
	    var fct = arr[2];
	    var seqno = arr[3];
	    var data = arr[4];
	    var opts = "";
	    var optlen = (fct & SaguaroDEFS.LORA_FCT_OPTLEN);
	    if (optlen > 0) {
		opts = data.substr(0, optlen);
		data = data.substr(optlen);
	    }
	    assert(data.length>=4);
	    var mic = data.substr(data.length-4);
	    data = data.substr(0, data.length-4);  // port plus payload
	    var port, payload;
	    if (data.length>0) {
		arr = Formatter.unpack("1u*d", data);
		port = arr[0];
		payload = arr[1];

		//Logger.println(sprintf("LRSC.Mote.unpackDataPacket: %s, port %d, payload %H", this, port, payload), "LORA");
		if (payload) {  
		    payload = LRSC.AES.cipher(port == 0 ? this.nwkkey : this.artkey, addr, seqno, false, payload);
		    //payload = LRSC.AES.cipher(this.devkey, addr, seqno, false, payload);
		}
		//Logger.println(sprintf("LRSC.Mote.unpackDataPacket: %s, port %d, payload %H", this, port, payload), "LORA");
	    }
	    var packet = new LRSC.Packet(addr, hdr, fct, seqno, opts, port, payload, mic);
	    //println("PACKET3:\n" + packet);//XXX:debug
	    
	    var mic = Formatter.unpack("4uB", mic);
	    
	    var b = LRSC.AES.verifyMic(this.nwkkey, addr, seqno, false, pdu.substr(0, pdu.length-4), mic);
	    assert(b);
	    return packet;
	},


	
	/**
	 * @param tx_func Called with data and conentrator
	 * @private
	 */
	handleTxjob: function(tx_func) {
	    if (this.currTxjob == null) {
		this.currTxjob = this.txjobs.shift();
		assert(this.currTxjob == null || this.currTxjob.txcnt==0);
	    }
	    if (this.currTxjob == null) {
		return;
	    }
	    assert(this.currTxjob.txcnt!=null);
	    this.currTxjob.txcnt += 1;
	    if (this.currTxjob.txcnt > 4) {  // XXX: use constant
		assert(this.currTxjob.packet.isDCDN());
		Logger.println(sprintf("LRSC.Mote.handleTxjob: %s: give up on retransmissions.", this), "LORA");
		this.currTxjob.callback(new AOP.ERR("Message unconfirmed!"));
		this.currTxjob = null;
		this.handleTxjob();
	    }

	    Logger.println(sprintf("LRSC.Mote.handleTxjob: %s send packet:\n%s", this, this.currTxjob.packet.toString()), "LORA");
	    tx_func(this.currTxjob.packet.pack(), this.getLastGateway());
	    
	    if (!this.currTxjob.packet.isDCDN()) {
		this.currTxjob.callback(new AOP.OK());
		this.currTxjob = null;
	    }
	},

	

	/**
	 * @param 
	 * @private
	 */
	sendResponse: function(conc, frame, rcvwinoffmillis, data) {
	    assert(arguments.length===4);
	    assert(frame.nocrc==0);
	    var f = {
	    	txbeg: (this.lastConc.reftime + 1000 * rcvwinoffmillis),
	    	freq: frame.freq,
	    	bw: frame.bw,
	    	sf: frame.sf,
	    	cr: frame.cr,
	    	ih: frame.ih,
	    	nocrc: 1, 
	    	//gwid: conc.gwid,
	    	data: data
	    };
	    conc.sendFrame(f, this.mote);
	}
    }
);



/**
 * @private
 */
LRSC.createMoteAttr = function(nwksrv, mote, addr, arteui) {
    return new LRSC.MoteAttr(nwksrv, mote, addr, arteui);
};





Class.define(
    "LRSC.MoteAttr.PingSlot",
    /**
     * @lends LRSC.MoteAttr.PingSlot.prototype
     */
    {
	/**
	 * @constructs
	 * @param {LRSC.MoteAttr} moteAttr
	 * @private
	 */
	__constr__: function(/** LRSC.MoteAttr */moteAttr) {
	    this.moteAttr = moteAttr;
	    this.macCmd = null;
	    this.windowEnd = 0;
	    this.windowBeg = 0;
	    this.freq = LRSC.F869525;
	    this.timer = null;
	},

	/**
	 * @private
	 */
	cancel: function() {
	    if (this.timer != null) { this.timer.cancel(); }
	    this.timer = null;
	    this.macCmd = null;
	    this.windowEnd = 0;
	    this.windowBeg = 0;
	    this.freq = LRSC.F869525;
	},


	/**
	 * @param packet
	 * @private
	 */
	onDataPacket: function(packet) {
	    var infoPingSlotMacCmd = LRSC.MacCommand.parse(packet.opts)[0x10];
	    if (!infoPingSlotMacCmd) {
		this.cancel();
		return;
	    } 

	    if (this.macCmd!=null && this.macCmd.periodicity==infoPingSlotMacCmd.periodicity && this.macCmd.datarate==infoPingSlotMacCmd.datarate) {
		assert(this.timer != null);
		return;
	    }

	    this.cancel();
		
	    this.macCmd = infoPingSlotMacCmd;
	    assert(this.macCmd.datarate==LRSC.DR_SF9);

	    this.onTimeout(null);
	},


	/**
	 * @param status
	 * @private
	 */
	onTimeout: function(status) {
	    var mote = this.moteAttr.mote;
	    var conn = Saguaro.mote2impl(mote).getConnection();
	    var res = conn.timeCmd(BLCK);
	    var nowMicros = parseInt(res.getReplyData().time/1000);

	    if (status) {
		var freq = this.freq;
		var datarate = this.macCmd.datarate;
		this.moteAttr.handleTxjob(function(data, conc) {
		    conc.sendNow(mote, freq, datarate, nowMicros, data);
		});
	    }
		
	    var micros = this.calcNextPingTime(nowMicros+1);
	    this.timer = new Timer.Timer(null, Saguaro.Timer.micros2Time(micros, conn), this.onTimeout.bind(this));
	    this.timer.start();
	},
	
	
	/**
	 * @param now Micros
	 * @private
	 */
	calcNextPingTime: function(now) {
	    var pingIntvExp = this.macCmd.periodicity;
	    
	    var intv = LRSC.BEACON_SLOT_SPAN_us * (1<<(5+pingIntvExp));
	    
	    if( now > this.windowEnd ) {
		var noff = this.moteAttr.nwksrv.getNwkid() * 1000000;
		var odd = (now - noff) % LRSC.BEACON_INTERVAL_us;
		this.windowBeg = now - odd + LRSC.BEACON_RESERVE_us;
		this.windowEnd = this.windowBeg + LRSC.BEACON_INTERVAL_us - LRSC.BEACON_RESERVE_us - LRSC.BEACON_GUARD_us - intv;
		
		//printf("nextPingTime: noff %d, odd %s, windowBeg %s, windowEnd %s\n", noff, Util.micros2str(odd), Util.micros2str(pingInfo.windowBeg), Util.micros2str(pingInfo.windowEnd));

		while(true) {
		    var t = parseInt((this.windowBeg - LRSC.BEACON_RESERVE_us) / 1000000);
		    var key = "\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0";
		    var buf = Formatter.pack("4uL4uL", t, this.moteAttr.addr) + "\0\0\0\0\0\0\0\0";
		    var obj = AES.aes(LRSC.AES.ENCRYPT, key, null, buf);
		    buf = obj.buf;
		    var u = Formatter.unpack("2uL", obj.buf)[0];
		    var off = LRSC.BEACON_SLOT_SPAN_us * (u & (0x0FFF >> (7-pingIntvExp)));
		    //printf("nextPingTime: off %d, windowBeg %s, windowEnd %s\n", off, Util.micros2str(pingInfo.windowBeg), Util.micros2str(pingInfo.windowEnd));
		    if( now > this.windowEnd+off ) {
			this.windowBeg += LRSC.BEACON_INTERVAL_us;
			this.windowEnd += LRSC.BEACON_INTERVAL_us;
			continue;
		    }
		    this.windowBeg += off;
		    this.windowEnd += off;
		    break;
		}
	    }

	    // if (now > pingInfo.windowBeg) {
	    // 	printf("nextPingTime: now %s, now-pingInfo.windowBeg %s, %intv %d, intv %d\n", Util.micros2str(now), Util.micros2str(now-pingInfo.windowBeg), 
	    // 	       ((now-pingInfo.windowBeg) % intv), intv);
	    // }
	    
	    var next = (now <= this.windowBeg) ? this.windowBeg : now - ((now-this.windowBeg) % intv) + intv;
	    assert(next <= this.windowEnd);

	    //var lastBeaconMicros = this.nwksrv.beaconTransmitter.lastBeaconMicros;
	    //var nextBeaconMicros = this.nwksrv.beaconTransmitter.nextBeaconMicros;
	    //printf("nextPingTime: beacon-last %s, beacon-next %s, next %s\n", Util.micros2str(lastBeaconMicros), Util.micros2str(nextBeaconMicros), Util.micros2str(next));
	    //printf("nextPingTime: next ping slot %s\n", Util.micros2str(next));
	    return next;
	}
    }
);






Class.define(
    "LRSC.MoteAttr.TxJob",
    /**
     * @lends LRSC.MoteAttr.TxJob.prototype
     */
    {
	/**
	 * @constructs
	 * @param {LRSC.MoteAttr} mattr, 
	 * @param {Number} seqnoDn
	 * @param {LRSC.Packet} packet
	 * @param {String} opts
	 * @param {Function} callback
	 * @private
	 */
	__constr__: function(/** LRSC.MoteAttr */mattr, /** Number */seqnoDn, /** LRSC.Packet */packet, /** String */opts, /** Function */callback) {
	    this.mattr = mattr;
	    this.seqnoDn = seqnoDn;
	    this.packet = packet;
	    this.commands = [];
	    if (opts) { this.commands.push(opts); }
	    this.callback = callback;
	    this.encryptPayload();
	    this.updateMic();
	    this.txcnt = 0;
	},

	/**
	 * @private
	 */
	setAck: function() {
	    var packet = this.packet;
	    packet.fct |= SaguaroDEFS.LORA_FCT_ACK_MASK;
	    this.updateMic();
	},

	/**
	 * @param {String} opts
	 * @private
	 */
	addOpts: function(opts) {
	    this.packet.opts += opts;
	    this.commands.push(opts);
	    assert(this.packet.opts.length > 0);
	    assert(this.packet.opts.length < 5);
	    this.updateMic();
	},
	
	/**
	 * @param {Object} obj
	 * @param {Function} callback
	 * @private
	 */
	addPayload: function(/** Object */obj, /** Function */callback) {
	    assert(obj.mode!=null);
	    var packet = this.packet;
	    if ((packet.port==null) && (!packet.payload)) {
		packet.hdr = (obj.mode&LRSC.ADN_MODE_CONFIRMED) ? SaguaroDEFS.LORA_HDR_FTYPE_DCDN : SaguaroDEFS.LORA_HDR_FTYPE_DADN;
		packet.port = obj.port;
		packet.payload = obj.payload;
		this.callback = callback;
		this.encryptPayload();
		this.updateMic();
		return true;
	    }
	    return false;
	},

	/**
	 * @private
	 */
	encryptPayload: function() {
	    var packet = this.packet;
	    if (packet.payload) {
		packet.payload = LRSC.AES.cipher(packet.port == 0 ? this.mattr.nwkkey : this.mattr.artkey, this.mattr.addr, this.seqnoDn, true, packet.payload);
	    }
	},

	/**
	 * @private
	 */
	updateMic: function() {
	    var packet = this.packet;
	    var bytes = packet.pack();
	    var pdu = bytes.substr(0, bytes.length - 4);
	    //printf("MIC: pdu without mic: %H\n", pdu);
	    var mic = LRSC.AES.calcMic(this.mattr.nwkkey, this.mattr.addr, this.seqnoDn, true, pdu);
	    packet.mic = Formatter.pack("4uB", mic);
	    assert(packet.mic.length==4);
	    //printf("MIC: %H\n", packet.mic);
	}
    }
);







/**
 * @class
 * @static
*/
LRSC.MacCommand = {
  
    // /**
    //  * @param chmask
    //  * @param sf
    //  * @param bw
    //  * @param txpow
    //  */
    // packLinkAdrReq: function(/** Number */chmask, /** Number */sf, /** Number */bw, /** Number */txpow) {
    // 	assert(bw === 125000 || bw === 250000);
    // 	assert(sf>=7&&sf<=12);
    // 	var datarate = -1;
    // 	if (bw===250000) {
    // 	    assert(sf===7);
    // 	    datarate = 6;
    // 	} else {
    // 	    switch(sf) {
    // 	    case 12: datarate = 0; break;
    // 	    case 11: datarate = 1; break;
    // 	    case 10: datarate = 2; break;
    // 	    case 9: datarate = 3; break;
    // 	    case 8: datarate = 4; break;
    // 	    case 7: datarate = 5; break;
    // 	    }
    // 	}
    // 	assert(datarate>=0);
    // 	var pow;
    // 	if (txpow > 14) {
    // 	    pow = 0;
    // 	} else if (txpow > 11) {
    // 	    pow = 1;
    // 	} else if (txpow > 8) {
    // 	    pow = 2;
    // 	} else if (txpow > 5) {
    // 	    pow = 3;
    // 	} else if (txpow > 2) {
    // 	    pow = 4;
    // 	} else {
    // 	    pow = 5;
    // 	}
	
    // 	return Formatter.pack("1u1u2uL", 0x03, (datarate<<4)|(pow), chmask);
    // },


    /**
     * @param bytes
     * @returns {Objec} Map of command tag to commad specific object
     */
    parse: function(/** String */bytes) {
	var off = 0;
	var ret = {};
	if (bytes.length==0) {
	    return ret;
	}
	try {
	    while(off < bytes.length) {
		var cmd = bytes.charCodeAt(off);
		if (cmd == 0x3) {
		    if (bytes.length==2) {
			var arr = Formatter.unpack("1u1u", bytes, off);
			ret[cmd] = { cmd: 0x3, datarate: (arr[1]>>4)&0xf, pow: (arr[1]&0xff) };
			off += 2;
		    } else {
			var arr = Formatter.unpack("1u1u2uL", bytes, off);
			ret[cmd] = { cmd: 0x3, datarate: (arr[1]>>4)&0xf, pow: (arr[1]&0xff), chmask: arr[2] };
			off += 4;
		    }
		} else if (cmd == 0x10) {
		    var arr = Formatter.unpack("1u1u", bytes, off);
		    ret[cmd] = { cmd: 0x10, periodicity:  (arr[1]>>4)&0xf, datarate: (arr[1]&0xf) };
		    off += 2;
		} else {
		    assert(false);
		}
	    }
	} catch(ex) {
	    throw new Exception(sprintf("MacCommand.parse failed: options '%H', offset %d, message: %s", bytes, off, ex));
	}
	return ret;
    }
};



/**
 * Helper routines for crypto.
 * @class
 * @static
 * @private
*/
LRSC.AES = {
    /**
     * @type Number
     * @private
     */
    ENCRYPT: 0,
    /**
     * @type Number
     * @private
     */
    DECRYPT: 1,
    /**
     * @type Number
     * @private
     */
    MIC: 2,
    /**
     * @type Number
     * @private
     */
    CTR: 4,
    
    
    /**
     * @param {String} devkey
     * @param {Number} devnonce
     * @param {String} artnounce
     * @param {String} netid
     * @returns {String}
     * @private
     */
    sessKeys: function(/** String */devkey, /** Number */devnonce, /** String */artnonce, /** String */netid) {
	assert(artnonce.length==SaguaroDEFS.LORA_LEN_APPNONCE);
	assert(netid.length==SaguaroDEFS.LORA_LEN_NETID);
	assert(devkey.length==16);
	var nwkkey = "\1" + artnonce + netid + Formatter.pack("2uL", devnonce) + "\0\0\0\0\0\0\0";
	assert(nwkkey.length==16);
	var obj = AES.aes(this.ENCRYPT, devkey, null, nwkkey);
	//printf("sessKeys: nwkkey %H\n", obj.buf);
	var ret = {
	    nwkkey: obj.buf
	};
	var artkey = "\2" + artnonce + netid + Formatter.pack("2uL", devnonce) + "\0\0\0\0\0\0\0";
	assert(artkey.length==16);
	var obj = AES.aes(this.ENCRYPT, devkey, null, artkey);
	//printf("sessKeys: artkey %H\n", obj.buf);
	ret.artkey = obj.buf;
	return ret;
    },

    
    /**
     * @param {String} devkey
     * @param {String} bytes
     * @returns {Number}
     * @private
     */
    calcMic0: function(devkey, bytes) {
	var ret = AES.aes(this.MIC, devkey, null, bytes);
	//printf("MIC=%08X\n",ret.mic);
	return ret.mic;
    },


    /**
     * @param {String} devkey
     * @param {String} bytes
     * @returns {String}
     * @private
     */
    decrypt: function(devkey, bytes) {
	var ret = AES.aes(this.DECRYPT, devkey, null, bytes);
	return ret.buf;
    },

    
    /**
     * @param {String} key
     * @param {Number} addr
     * @param {Number} seqno
     * @param {Boolean} dndir
     * @param {String} payload
     * @returns {String}
     * @private
     */
    cipher: function(key, addr, seqno, dndir, payload) {
	assert(payload.length>0);

	var aux = Formatter.pack("1uL4u1uL4uL4uL1u1uL", 1, 0, dndir?1:0, addr, seqno, 0, 1);
	assert(aux.length==16);
	//Logger.println(sprintf("AES.cipher: key %H, aux %H", key, aux), "LORA");
	var ret = AES.aes(this.CTR, key, aux, payload);
	return ret.buf;
    },

    
    /**
     * @param {String} key
     * @param {Number} addr
     * @param {Number} seqno
     * @param {Boolean} dndir
     * @param {String} pdu
     * @param {Number} mic
     * @returns {Boolean}
     * @private
     */
    verifyMic: function(key, addr, seqno, dndir, pdu, mic) {
	var aux = Formatter.pack("1uL4u1uL4uL4uL1u1uL", 0x49, 0, dndir?1:0, addr, seqno, 0, pdu.length);
	assert(aux.length==16);
	var ret = AES.aes(this.MIC, key, aux, pdu);
	return ret.mic == mic;
    },

    
    /**
     * @param {String} key
     * @param {Number} addr
     * @param {Number} seqno
     * @param {Boolean} dndir
     * @param {String} bytes
     * @returns {String}
     * @private
     */
    calcMic: function(key, addr, seqno, dndir, bytes) {
	var aux = Formatter.pack("1uL4u1uL4uL4uL1u1uL", 0x49, 0, dndir?1:0, addr, seqno, 0, bytes.length);
	assert(aux.length==16);
	var ret = AES.aes(this.MIC, key, aux, bytes);
	return ret.mic;
    }
};
