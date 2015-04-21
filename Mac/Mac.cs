using System;

namespace Mac_Layer
{
	using com.ibm.saguaro.system;
	
	public delegate int MacScanCallback(uint flags, byte[] data, int chn, uint info, long time);
		
	public class Mac
	{
		// Consts
		const uint nSlot = 15; // n. of time slots in superframe
		const uint symRate = 60; // symbol rate
		
		const byte beaconFCF = Radio.FCF_BEACON | Radio.FCF_NSPID;  // FCF header: data-frame & no-SRCPAN
		const byte beaconFCA = Radio.FCA_DST_SADDR | Radio.FCA_SRC_SADDR; // FCA header to use short-addresses
		const byte cmdFCF = Radio.FCF_CMD | Radio.FCF_ACKRQ; // FCF header: CMD + Acq request
		
		const uint MAC_SCAN_ED = Radio.RXMODE_ED;
		const uint MAC_SCAN_PASSIVE = Radio.RXMODE_NORMAL;
		const uint MAC_TX_COMPLETE = 0xE001;
		
		
		// Timer parameters
		private const byte MAC_CMODE = (byte)0;
		private const byte MAC_SLEEP_TILL_BEACON = (byte)1;
		
		
		// Callbacks
		private DevCallback rxHandler;
		private DevCallback txHandler;
		private DevCallback eventHandler;
		private MacScanCallback scanHandler;
		
		
		private bool scanContinue = false;
			
		// Radio
		private Radio radio;
		private uint rChannel; // n. of radio channel
		private uint panId; // id of application PAN
		private byte[] pdu;
		private uint pduLen;
		
		// Pan parameters
		private uint associationPermitted = 1;
		private bool coordinator = false;
		
		// Max number of associations and current associated
		private uint maxAssociated = 5;
		private uint currentAssociated = 0;
		
		// Beacon & Superframe Parameters
		private uint beaconSequence = 0; // sequence of beacon
		private uint slotCounter = 0; // counter of transmitted slots
		private uint gtsSlots = 0;
		private uint gtsEnabled = 0;
		private uint BO = 10; // beacon order
		private uint SO = 7; // superframe order
		private long slotInterval; // Superframe duration = 60sym * nSlot * 2^SO / 20kbps [s] = 3 * nSlot * 2^SO [ms]
		private long beaconInterval; // Beacon Interval = 60sym * nSlot * 2^BO / 20kbps [s] = 3 * nSlot * 2^BO [ms]
		
		private Timer timer1;
		
		public Mac () {
			timer1 = new Timer();
			timer1.setCallback(onTimerEvent);
			
			radio = new Radio();
			radio.setEventHandler(this.onEvent);
			radio.setTxHandler(this.onTxEvent);
			radio.setRxHandler(this.onRxEvent);
		}
		
		public void associate(uint channel, uint panId, uint cSaddr) {
			byte[] assRequest = new byte[13];
			assRequest[0] = Radio.FCF_CMD | Radio.FCF_ACKRQ;
			assRequest[1] = Radio.FCA_DST_SADDR | Radio.FCA_SRC_SADDR;
			assRequest[2] = (byte)Util.rand8();
			Util.set16(assRequest, 3, panId);
			Util.set16(assRequest, 5, cSaddr);
			Util.set16(assRequest, 7, Radio.SADDR_BROADCAST);
			Util.set16(assRequest, 9, this.radio.getShortAddr);
			assRequest[12] = 0 << 7 | 0 << 6 | 0 << 5 | 0 << 4 | 0 << 3 | 0 << 2 | 0 << 1 | 1;
			radio.transmit(Radio.TIMED|Radio.TXMODE_POWER_MAX,assRequest,0,13,Time.currentTicks()+this.slotInterval);
		}
		
		public void createPan(int channel, uint panId) {		
			this.radio.setPanId(panId, true);
			this.radio.setChannel((byte)Radio.std2chnl(channel));
			this.radio.setShortAddr(0x0001);
			this.slotInterval = Time.toTickSpan(Time.MILLISECS, 3*2^SO);
			this.beaconInterval = Time.toTickSpan(Time.MILLISECS, 3*nSlot*2^BO);
			this.coordinator = true;
			this.sendBeacon();
		}
		
		// to define
		public void disassociate( ) {
			
		}
		
		public void enable(bool onOff){
			if (onOff) {
				this.radio.open(Radio.DID,null,0,0);
			}
			else {
				this.timer1.cancelAlarm();
				this.coordinator = false;
				this.radio.close();
			}
			this.slotCounter = 0;
		}
		
		public void scan(int channel, uint mode) {
			if (mode == MAC_SCAN_ED)
				this.scanEd(channel);
			else if (mode == MAC_SCAN_PASSIVE)
				this.scanPassive(channel);
			else
				ArgumentException.throwIt(ArgumentException.ILLEGAL_VALUE);
		}
		
		public void stopScan() {
			this.scanContinue = false;
		}
		
		public void onTimerEvent(byte param, long time){
			if (param == MAC_CMODE) {
				this.radio.startRx(Radio.TIMED|Radio.RXMODE_NORMAL,time,time+this.slotInterval);
				slotCounter += 1;
			}
			else if (param == MAC_SLEEP_TILL_BEACON) {
				this.sendBeacon();
			}
		}
		
		public int onScanEvent(uint flags, byte[] data, uint len, uint info, long time) {
			uint mode = radio.getRxMode();
			if (mode == Radio.RXMODE_ED) {
				scanHandler(MAC_SCAN_ED,data,Radio.chnl2std(this.radio.getChannel()),info,time);
			}
			else if (mode == Radio.RXMODE_NORMAL) {
				scanHandler(MAC_SCAN_PASSIVE,data,Radio.chnl2std(this.radio.getChannel()),info,time);
			}
			return 0;
		}
		
		public int onRxEvent(uint flags, byte[] data, uint len, uint info, long time) {
			if (flags == Radio.FLAG_ASAP || flags == Radio.FLAG_EXACT || flags == Radio.FLAG_TIMED) {
				if (this.coordinator) { // the device is transmitting beacons
					if (this.slotCounter < nSlot)
						this.timer1.setAlarmBySpan(time+slotInterval);
					else { // superframe is ended
						this.slotCounter = 0;
						this.timer1.setParam(MAC_SLEEP_TILL_BEACON);
						this.timer1.setAlarmBySpan(time+beaconInterval-nSlot*slotInterval);
					}
				}
				else if (data[0] >> 4 == Radio.FCF_BEACON >> 4) { //beacon received
					if (this.pdu != null  && this.slotCounter < nSlot) { // there's something to transmit
						this.radio.transmit(Radio.ASAP|Radio.TXMODE_CCA,this.pdu,0,this.pduLen,time+slotInterval);
					}
					else if (this.pdu == null) { // nothing to transmit -> back to sleep
						
					}
				}
			}
			else if (flags == Radio.FLAG_FAILED) {
				
			}
			else if (flags == Radio.FLAG_WASLATE) {
				
			}
			return 0;
		}
		
		public int onTxEvent(uint flags, byte[] data, uint len, uint info, long time) {
			if (flags == Radio.FLAG_ASAP | flags == Radio.FLAG_EXACT | flags == Radio.FLAG_TIMED) {
				if (data[0] == beaconFCF) {
					this.slotCounter += 1;
					this.timer1.setParam((byte)MAC_CMODE);
					this.timer1.setAlarmBySpan(time);
				}
				else if (data[0] >> 4 == Radio.FCF_DATA >> 4) {
					this.txHandler(MAC_TX_COMPLETE,data,len,info,time);
				}
			}						
			else if (flags == Radio.FLAG_FAILED) {
				if (this.pdu != null && this.slotCounter < nSlot) {
					this.radio.transmit(Radio.ASAP|Radio.TXMODE_CCA,this.pdu,0,this.pduLen,time+this.slotInterval);
				}
				return 0;
			}
			else if (flags == Radio.FLAG_WASLATE) {
				if (this.pdu != null  && this.slotCounter < nSlot) {
					this.radio.transmit(Radio.ASAP|Radio.TXMODE_CCA,this.pdu,0,this.pduLen,time+this.slotInterval);
				}
				return 0;
			}
			else {
				
			}
			return 0;
		}
		
		public int onEvent(uint flags, byte[] data, uint len, uint info, long time) {
			
			return 0;
		}
		
		public void setScanHandler(MacScanCallback callback) {
			this.scanHandler = callback;
		}
		
		public void setTxHandler(DevCallback callback) {
			this.txHandler = callback;
		}
		
		public void setRxHandler(DevCallback callback) {
			this.rxHandler = callback;
		}
		
		public void setEventHandler(DevCallback callback) {
			this.eventHandler = callback;
		}
		
		public void transmit(uint dstSaddr, uint seq, byte[] data) {
			uint dataLen = (uint)data.Length;
			uint headerLen = 11; // lunghezza del header del pdu dati
			if (dataLen + headerLen > 127)
				return; // throw exception
			this.pduLen = (uint)(dataLen + headerLen);
			this.pdu = (byte[])Util.alloca((byte)this.pduLen, Util.BYTE_ARRAY); // messo a max size, ma va variato in base alla dimensione dell'header e dei dati ricevuti
			this.pdu[0] = Radio.FCF_DATA | Radio.FCF_ACKRQ; // data FCF with request of acknowledge
			this.pdu[1] = Radio.FCA_DST_SADDR | Radio.FCA_SRC_SADDR; // FCA with destination short address and source short address
			this.pdu[2] = (byte) seq;
			Util.set16(this.pdu,3,this.radio.getPanId()); // NOTA: panId potrebbe essere rimosso dagli attributi di classe essendo recuperabile da radio
			Util.set16(this.pdu, 5, dstSaddr);
			Util.set16(this.pdu, 7, this.radio.getPanId());
			Util.set16(this.pdu, 9, this.radio.getShortAddr());
			Util.copyData((object)data, 0, (object)this.pdu, headerLen+1, dataLen); // Insert data from upper layer into MAC frame
		}
		
		// static methods
		static void setParameters(long cXaddr, uint cSaddr, uint Saddr) {
			
		}
		
		// private methods
		private void trackBeacon() { // da definire, nei diagrammi è espresso anche come scanBeacon()
			this.radio.startRx(Radio.ASAP, 0, Time.currentTicks()+nSlot*slotInterval*(2^14+1));
		}
		
		private void sendBeacon() {
			byte[] beacon = new byte[13];
			beacon[0] = beaconFCF;
			beacon[1] = beaconFCA;
			beacon[2] = (byte)this.beaconSequence;
			this.beaconSequence += 1;
			Util.set16(beacon,3,Radio.PAN_BROADCAST);
			Util.set16(beacon, 5, Radio.SADDR_BROADCAST);
			Util.set16(beacon, 7, this.radio.getPanId());
			Util.set16(beacon, 9, this.radio.getShortAddr());
			beacon[10] = (byte)(this.BO << 4 | this.SO);
			beacon[11] = (byte)(nSlot << 3 | 1 << 1 | this.associationPermitted);
			beacon[12] = (byte)(this.gtsSlots<<5|this.gtsEnabled);
			this.radio.transmit(Radio.TIMED|Radio.TXMODE_POWER_MAX, beacon, 0, 10,Time.currentTicks()+slotInterval);
		}
		
		private void scanEd(int channel) {
			this.scanContinue = true;
			this.radio.open(Radio.DID,null,0,0);
			this.radio.setRxHandler(onScanEvent);
			long aScanInterval = Time.toTickSpan(Time.MILLISECS, 3 * (nSlot+1) * 2^14);
			if (channel == 0) {
				for(int i=1; i <=27 && this.scanContinue; i++){
					this.radio.setChannel((byte)Radio.std2chnl(i));
					this.radio.startRx(Radio.TIMED|Radio.RXMODE_ED,Time.currentTicks(),Time.currentTicks()+aScanInterval);
				}
			}
			else {
				this.radio.setChannel((byte)Radio.std2chnl(channel));
				this.radio.startRx(Radio.TIMED|Radio.RXMODE_ED,Time.currentTicks(),Time.currentTicks()+aScanInterval);
			}
			this.radio.setRxHandler(onRxEvent);
		}
		
		private void scanPassive(int channel) {
			this.scanContinue = true;
			this.radio.open(Radio.DID,null,0,0);
			this.radio.setRxHandler(onScanEvent);
			long aScanInterval = Time.toTickSpan(Time.MILLISECS, 3 * (nSlot+1) * 2^14);
			if (channel == 0) {
				for(int i=1; i <=27 && this.scanContinue; i++){
					this.radio.setChannel((byte)Radio.std2chnl(i));
					this.radio.startRx(Radio.TIMED|Radio.RXMODE_NORMAL,Time.currentTicks(),Time.currentTicks()+aScanInterval);
				}
			}
			else {
				this.radio.setChannel((byte)Radio.std2chnl(channel));
				this.radio.startRx(Radio.TIMED|Radio.RXMODE_NORMAL,Time.currentTicks(),Time.currentTicks()+aScanInterval);
			}
			this.radio.setRxHandler(onRxEvent);
		}
	}
}

