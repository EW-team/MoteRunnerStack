using System;

namespace Mac_Layer
{
	using com.ibm.saguaro.system;
	using com.ibm.saguaro.logger;
	
	public delegate int MacScanCallback(uint flags, byte[] data, int chn, uint info, long time);
		
	public class Mac
	{
		// Consts
		const uint nSlot = 15; // n. of time slots in superframe
		const uint symRate = 60; // symbol rate
		
		const byte beaconFCF = Radio.FCF_BEACON | Radio.FCF_NSPID;  // FCF header: data-frame & no-SRCPAN
		const byte beaconFCA = Radio.FCA_DST_SADDR | Radio.FCA_SRC_SADDR; // FCA header to use short-addresses
		const byte cmdFCF = Radio.FCF_CMD | Radio.FCF_ACKRQ; // FCF header: CMD + Acq request
		
		// MAC scan modes
		public const uint MAC_SCAN_ED = Radio.RXMODE_ED;
		public const uint MAC_SCAN_PASSIVE = Radio.RXMODE_NORMAL;
		
		// MAC Notify codes
		public const uint MAC_TX_COMPLETE = 0xE001;
		public const uint MAC_ASSOCIATED = 0xE002;
		
		
		// Timer parameters
		private const byte MAC_CMODE = (byte)10;
		private const byte MAC_SLEEP_TILL_BEACON = (byte)11;
		private const byte MAC_SLEEP_WAITING_BEACON = (byte)12;
		private const byte MAC_SLEEP = (byte)13;
		
		
		// Callbacks
		private DevCallback rxHandler;
		private DevCallback txHandler;
		private DevCallback eventHandler;
		private MacScanCallback scanHandler;
		
		// Scan parameters
		private bool scanContinue = false;
		private uint scanOrder = 5;
		private long aScanInterval;
			
		// Radio
		private Radio radio;
		private uint rChannel; // n. of radio channel
		private uint panId; // id of application PAN
		private byte[] pdu;
		private uint pduLen;
		
		// Pan parameters
		private uint associationPermitted = 1;
		private bool coordinator = false;
		private uint coordinatorSADDR;
		private uint lastAssigned;
		private bool associated = false;
		
		// Max number of associations and current associated
		private uint maxAssociated = 5;
		private uint currentAssociated = 0;
		private short seq = Util.rand8(); // random sequence number for cmd
		
		// Beacon & Superframe Parameters
		private uint beaconSequence = 0; // sequence of beacon
		private uint slotCounter = 0; // counter of transmitted slots
		private uint gtsSlots = 0;
		private uint gtsEnabled = 0;
		private uint BO = 10; // beacon order
		private uint SO = 7; // superframe order
		private long slotInterval; // Superframe duration = 60sym * nSlot * 2^SO / 20kbps [s] = 3 * nSlot * 2^SO [ms]
		private long beaconInterval; // Beacon Interval = 60sym * nSlot * 2^BO / 20kbps [s] = 3 * nSlot * 2^BO [ms]
		private bool duringSuperframe;
		
		private Timer timer1;
		private Timer timer2;
		
		public Mac () {
			this.timer1 = new Timer();
			this.timer1.setCallback(onTimerEvent);
			this.timer2 = new Timer();
			this.timer2.setParam(MAC_SLEEP);
			this.timer2.setCallback(onTimerEvent);
			
			this.radio = new Radio();
			this.radio.setEventHandler(this.onEvent);
			this.radio.setTxHandler(this.onTxEvent);
			this.radio.setRxHandler(this.onRxEvent);
		}
		
		public void setChannel(uint channel) {
			this.radio.setChannel((byte)channel);	
		}
		
		public void associate(uint pan) {
			this.associated = false;
			this.radio.setPanId(pan, false);
			this.trackBeacon();
		}
		
		public void createPan(int channel, uint panId) {		
			this.radio.setPanId(panId, true);
			this.radio.setChannel((byte)channel);
			this.radio.setShortAddr(0x0001);
			this.lastAssigned = this.radio.getShortAddr();
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
				this.disassociate();
				this.coordinator = false;
				this.radio.close();
			}
			this.slotCounter = 0;
		}
		
		public void scan(int channel, uint mode) {
			uint scanMode = Radio.TIMED;
			if (mode == MAC_SCAN_ED){
				scanMode = Radio.RXMODE_ED;
				this.radio.setRxMode(Radio.RXMODE_ED);
				this.timer1.setParam((byte)Radio.RXMODE_ED);
			}
			else if (mode == MAC_SCAN_PASSIVE) {
				scanMode = Radio.RXMODE_NORMAL;
//				this.radio.setRxMode(Radio.RXMODE_NORMAL);
				this.timer1.setParam((byte)Radio.RXMODE_NORMAL);	
			}
			else{
				ArgumentException.throwIt(ArgumentException.ILLEGAL_VALUE);
				return;	
			}
			this.radio.setRxHandler(onScanEvent);
			this.aScanInterval = Time.toTickSpan(Time.MILLISECS, 3 * (nSlot+1) * (2^scanOrder+1));
			if (channel == 0) {
				this.scanContinue = true;
			}
			this.radio.setChannel((byte)channel);
			this.radio.startRx(scanMode,Time.currentTicks(),Time.currentTicks()+this.aScanInterval);
		}
		
		public void stopScan() {
			this.scanContinue = false;
			this.timer1.cancelAlarm();
			this.radio.setRxHandler(onRxEvent);
			Logger.appendChar(83);			
			Logger.appendChar(84);		
			Logger.appendChar(79);		
			Logger.appendChar(80);	
			Logger.flush(Mote.INFO);
		}
		
		public void onTimerEvent(byte param, long time){
			if (param == MAC_CMODE) {
				this.radio.startRx(Radio.TIMED|Radio.RXMODE_NORMAL,Time.currentTicks(),time+this.slotInterval);
				this.slotCounter += 1;
			}
			else if (param == MAC_SLEEP_TILL_BEACON) {
				this.sendBeacon();
			}
			else if (param == MAC_SLEEP) { // spegnere tutto
				this.duringSuperframe = false;
				this.timer2.setParam(MAC_SLEEP_WAITING_BEACON);
				this.timer2.setAlarmTime(time+this.beaconInterval-nSlot*this.slotInterval);
			}			
			else if (param == MAC_SLEEP_WAITING_BEACON) {
				this.timer2.setParam(MAC_SLEEP);
				this.trackBeacon();	
			}
			else if ((param == (byte)Radio.RXMODE_ED || 
			          param == (byte)Radio.RXMODE_NORMAL) && this.scanContinue) {
				int chnl = (int)this.radio.getChannel();
				Logger.appendChar(69);
				Logger.appendChar(86);
				Logger.flush(Mote.INFO);
				if (chnl < 27) {
					chnl += 1;
					if(chnl == 27)
						this.scanContinue = false;
					this.radio.setChannel((byte)chnl);
					this.radio.startRx(param,time,Time.currentTicks()+this.aScanInterval);
				}
			}
		}
		
		public int onScanEvent(uint flags, byte[] data, uint len, uint info, long time) {
			uint mode = radio.getRxMode();
			if (mode == Radio.RXMODE_ED) {
				Logger.appendChar(69);
				Logger.appendChar(68);
				Logger.flush(Mote.INFO);
				this.scanHandler(MAC_SCAN_ED,data,Radio.std2chnl(this.radio.getChannel()),info,time);
			}
			else if (mode == Radio.RXMODE_NORMAL) {
				Logger.appendChar(78);
				Logger.appendChar(79);
				Logger.appendChar(82);
				Logger.appendChar(77);
				Logger.flush(Mote.INFO);
				this.scanHandler(MAC_SCAN_PASSIVE,data,this.radio.getChannel(),info,time);
			}
			
			if (!this.scanContinue){
				this.stopScan();
			}
			else
				this.timer1.setAlarmBySpan(this.aScanInterval>>1);
			return 0;
		}
		
		public int onRxEvent(uint flags, byte[] data, uint len, uint info, long time) {
			uint modeFlag = flags & Device.FLAG_MODE_MASK;		
			if (modeFlag == Radio.FLAG_ASAP || modeFlag == Radio.FLAG_EXACT || modeFlag == Radio.FLAG_TIMED) {
				if (this.coordinator) { // the device is transmitting beacons
//					Logger.appendString(csr.s2b("I'm a fucking coordinator!"));
//					Logger.flush(Mote.INFO);
					if (this.slotCounter <= nSlot)
						this.timer1.setAlarmBySpan(slotInterval>>1);
					else { // superframe is ended
						this.slotCounter = 0;
						this.timer1.setParam(MAC_SLEEP_TILL_BEACON);
						this.timer1.setAlarmBySpan(time+beaconInterval-nSlot*slotInterval);
					}
				}

				if (data != null) {
					if (Radio.FCF_BEACON == (byte)(data[0] & 0x07) && !this.coordinator) { //beacon received
						this.radio.stopRx();
						this.setBeaconParameter((data[10] & 0xF0) >> 4, data[10] & 0x0F);
						this.timer2.setAlarmTime(time+nSlot*slotInterval);
						this.duringSuperframe = true;
						this.radio.setPanId(Util.get16(data,7),false);
						this.coordinatorSADDR = Util.get16(data,9);
						if (!this.associated) {
							byte[] assRequest = new byte[19];
							Logger.appendString(csr.s2b("Associate Begin"));
							Logger.flush(Mote.INFO);
							assRequest[0] = Radio.FCF_CMD | Radio.FCF_ACKRQ;
							assRequest[1] = Radio.FCA_DST_SADDR | Radio.FCA_SRC_XADDR;
							assRequest[2] = (byte)seq;
							Util.set16(assRequest, 3, this.radio.getPanId());
							Util.set16(assRequest, 5, 0x0001);
							Util.set16(assRequest, 7, Radio.SADDR_BROADCAST);
							Mote.getParam(Mote.EUI64, assRequest, 9);
							assRequest[17] = (byte) 0x01;
							assRequest[18] = (byte)(1 << 7 | 1 << 6 | 0 << 4 | 0 << 3 | 0 << 2 | 0 << 1 | 0);
							this.radio.transmit(Radio.TIMED,assRequest,0,19,time+this.slotInterval);
						}
						else if (this.pdu != null  && this.duringSuperframe) { // there's something to transmit
							this.radio.transmit(Radio.ASAP|Radio.TXMODE_CCA,this.pdu,0,this.pduLen,time+slotInterval);
						}
						else if (this.pdu == null) { // nothing to transmit -> back to sleep
							
						}
					}
					else if((data[0] & 0x07) == Radio.FCF_CMD) {
						if (data[17] == 0x01) { // association request handle - coordinator
							Logger.appendString(csr.s2b("Received Association Request"));
							Logger.flush(Mote.INFO);
							byte[] assRes = new byte[27];
							assRes[0] = data[0];
							assRes[1] = Radio.FCA_SRC_XADDR | Radio.FCA_DST_XADDR;
							assRes[2] = Util.rand8();
							Util.set16(assRes,3,this.radio.getPanId());
							Util.copyData((object)data, 9, (object)assRes, 5, 8);
							Util.set16(assRes,13,this.radio.getPanId());
							Mote.getParam(Mote.EUI64, assRes, 15);
							
							if (this.associationPermitted == 1) {
								this.lastAssigned += 1;
								Util.set16(assRes,24,this.lastAssigned);
								assRes[26] = 0x00;
								if(this.eventHandler != null)
									this.eventHandler(MAC_ASSOCIATED,data,len,info,time);
							}
							else{
								assRes[26] = 0x01;
							}
							this.radio.transmit(Radio.ASAP,assRes,0,27,time+(this.slotInterval>>1));
						}
						else if (data[17] == 0x04) { // data request handle - coordinator
							
						}
						else if (data[17] == 0x02) { // association response handle - not coordinator
							Logger.appendString(csr.s2b("Received Association Response"));
							Logger.flush(Mote.INFO);
							if (data[26] == 0x00) { // association successful
								this.radio.setShortAddr(Util.get16(data,24));
								this.associated = true;
								this.trackBeacon();
							}
							else if (data[26] == 0x01) {
								this.associated = false;
							}
							else {
								
							}
						}
					}
					else if((data[0] & 0x07) == Radio.FCF_DATA) {
						// notificare rxHandler	
					}
					else if (data == null) {
						
					}
				}
			}
			else if (flags == Radio.FLAG_FAILED || flags == Radio.FLAG_WASLATE) {
				Logger.appendString(csr.s2b("Rx Error"));
				Logger.flush(Mote.INFO);
			}
			return 0;
		}
		
		public int onTxEvent(uint flags, byte[] data, uint len, uint info, long time) {
			uint modeFlag = flags & Device.FLAG_MODE_MASK;		
			if (modeFlag == Radio.FLAG_ASAP || modeFlag == Radio.FLAG_EXACT || modeFlag == Radio.FLAG_TIMED) {
				if ((data[0] & 0x07) == (int)Radio.FCF_BEACON) {
					this.slotCounter = 1;
					this.timer1.setParam((byte)MAC_CMODE);
					this.timer1.setAlarmTime(Time.currentTicks());
				}
				else if ((data[0] & 0x07) == Radio.FCF_DATA) {
					this.txHandler(MAC_TX_COMPLETE,data,len,info,time);
				}
				else if((data[0] & 0x07) == Radio.FCF_CMD) {
					if (data[17] == 0x01) { // association request - not coordinator
						Logger.appendString(csr.s2b("Waiting Response"));
						Logger.flush(Mote.INFO);
						this.radio.startRx(Radio.TIMED, time, time+slotInterval);
					}
					else if (data[17] == 0x04) { // data request - not coordinator
						
					}
				}
			}						
			else if (flags == Radio.FLAG_FAILED || flags == Radio.FLAG_WASLATE) {
				if (this.pdu != null && this.duringSuperframe) {
					this.radio.transmit(Radio.ASAP|Radio.TXMODE_CCA,this.pdu,0,this.pduLen,time+this.slotInterval);
				}
				else { // pdu = null || this.slotCounter >= nSlot
					// impostare il risparmio energetico
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
		
		public uint getCoordinatorSADDR() {
			return this.coordinatorSADDR;
		}
		
		// static methods
		static void setParameters(long cXaddr, uint cSaddr, uint Saddr) {
			
		}
		
		// private methods
		private void trackBeacon() { // nei diagrammi è espresso anche come scanBeacon()
			this.aScanInterval = Time.toTickSpan(Time.MILLISECS, 3 * (nSlot+1) * (2^14+1));
			this.radio.startRx(Radio.ASAP|Radio.RX4EVER, 0, Time.currentTicks()+this.aScanInterval);
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
			Util.set16(beacon, 9, 0x0001);
			beacon[10] = (byte)(this.BO << 4 | this.SO);
			beacon[11] = (byte)(nSlot << 3 | 1 << 1 | this.associationPermitted);
			beacon[12] = (byte)(this.gtsSlots<<5|this.gtsEnabled);
			this.radio.transmit(Radio.TIMED|Radio.TXMODE_POWER_MAX, beacon, 0, 13,Time.currentTicks()+slotInterval);
		}
		
		private void setBeaconParameter(int Bo, int So) {
			this.BO = (uint) BO;
			this.SO = (uint) SO;
			this.slotInterval = Time.toTickSpan(Time.MILLISECS, 3*2^SO);
			this.beaconInterval = Time.toTickSpan(Time.MILLISECS, 3*nSlot*2^BO);
		}
	}
}