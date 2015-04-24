using System;

namespace Mac_Layer
{
	using com.ibm.saguaro.system;
	using com.ibm.saguaro.logger;

	public delegate int MacScanCallback(uint flags, byte[] data, int chn, uint info, long time);

	public class Mac
	{
		// MAC scan modes
		public const byte MAC_SCAN_PASSIVE = (byte)0x00;
		public const byte MAC_SCAN_ED = (byte)0x01;

		// Timer parameters
		private const byte MAC_CMODE = (byte)0x10;
		private const byte MAC_SLEEP_TILL_BEACON = (byte)0x11;
		private const byte MAC_SLEEP_WAITING_BEACON = (byte)0x12;
		private const byte MAC_SLEEP = (byte)0x13;

		// MAC Flags codes
		public const uint MAC_TX_COMPLETE = 0xE001;
		public const uint MAC_ASSOCIATED = 0xE002;

		//----------------------------------------------------------------------//
		//-------------------------    RESTART HERE    -------------------------//
		//----------------------------------------------------------------------//

		// Instance Variables
		private Radio radio;
		private Timer timer1;
		private Timer timer2;
		private byte[] pdu;

		// Internal logic parameters
		private uint slotCounter = 0; // counter of transmitted slots
		private bool duringSuperframe;
		private bool scanContinue = false;
		public bool associated = false;
		public bool coordinator = false;

		// Callbacks
		public DevCallback rxHandler;
		public DevCallback txHandler;
		public DevCallback eventHandler;
		public MacScanCallback scanHandler;

		// Configuration
		private MacConfig config;

		public Mac () {
			this.config = new MacConfig ();

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
			this.config.rChannel = channel;
		}

		public void associate(uint pan) {
			this.associated = false;
			this.radio.setPanId(pan, false);
			this.config.panId = pan;
			this.trackBeacon();
		}

		public void createPan(int channel, uint panId, uint saddr) {	
			this.radio.setPanId(panId, true);
			this.radio.setChannel((byte)channel);
			this.radio.setShortAddr(saddr);
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
				this.timer1.setParam(MAC_SCAN_ED);
			}
			else if (mode == MAC_SCAN_PASSIVE) {
				scanMode = Radio.RXMODE_NORMAL;
				//				this.radio.setRxMode(Radio.RXMODE_NORMAL);
				this.timer1.setParam(MAC_SCAN_PASSIVE);	
			}
			else{
				ArgumentException.throwIt(ArgumentException.ILLEGAL_VALUE);
				return;	
			}
			this.radio.setRxHandler(onScanEvent);
//			this.aScanInterval = Time.toTickSpan(Time.MILLISECS, 3 * (nSlot+1) * (2^scanOrder+1));
			if (channel == 0) {
				this.scanContinue = true;
			}
			this.radio.setChannel((byte)channel);
			this.radio.startRx(scanMode,Time.currentTicks(),Time.currentTicks()+config.aScanInterval);
		}

		public void stopScan() {
			this.scanContinue = false;
			this.timer1.cancelAlarm();
			this.radio.setRxHandler(onRxEvent);
		}

		public void onTimerEvent(byte param, long time){
			if (param == MAC_CMODE) {
				this.radio.startRx(Radio.TIMED|Radio.RXMODE_NORMAL,Time.currentTicks(),time+config.slotInterval);
				this.slotCounter += 1;
			}
			else if (param == MAC_SLEEP_TILL_BEACON) {
				this.sendBeacon();
			}
			else if (param == MAC_SLEEP) { // spegnere tutto
				this.duringSuperframe = false;
				this.timer2.setParam(MAC_SLEEP_WAITING_BEACON);
				this.timer2.setAlarmTime(time+config.beaconInterval-config.nSlot*config.slotInterval);
			}			
			else if (param == MAC_SLEEP_WAITING_BEACON) {
				this.timer2.setParam(MAC_SLEEP);
				this.trackBeacon();	
			}
			else if ((param == MAC_SCAN_ED || 
			          param == MAC_SCAN_PASSIVE) && this.scanContinue) {
				int chnl = (int)this.radio.getChannel();
				if (chnl < 27) {
					chnl += 1;
					if(chnl == 27)
						this.scanContinue = false;
					this.radio.setChannel((byte)chnl);
					this.radio.startRx(param,time,Time.currentTicks()+config.aScanInterval);
				}
			}
		}

		public int onScanEvent(uint flags, byte[] data, uint len, uint info, long time) {
			uint mode = radio.getRxMode();
			if (mode == Radio.RXMODE_ED) {
				this.scanHandler(MAC_SCAN_ED,data,Radio.std2chnl(this.radio.getChannel()),info,time);
			}
			else if (mode == Radio.RXMODE_NORMAL) {
				this.scanHandler(MAC_SCAN_PASSIVE,data,this.radio.getChannel(),info,time);
			}

			if (!this.scanContinue){
				this.stopScan();
			}
			else
				this.timer1.setAlarmBySpan(config.aScanInterval>>1);
			return 0;
		}

		public int onRxEvent(uint flags, byte[] data, uint len, uint info, long time) {
			uint modeFlag = flags & Device.FLAG_MODE_MASK;
			if (modeFlag == Radio.FLAG_ASAP || modeFlag == Radio.FLAG_EXACT || modeFlag == Radio.FLAG_TIMED) {
				if (this.coordinator) { // the device is transmitting beacons
					if (this.slotCounter <= config.nSlot)
						this.timer1.setAlarmBySpan(config.slotInterval>>1);
					else { // superframe is ended
						this.slotCounter = 0;
						this.timer1.setParam(MAC_SLEEP_TILL_BEACON);
						this.timer1.setAlarmBySpan(time+config.beaconInterval-config.nSlot*config.slotInterval);
					}
				}
				if (data != null) {
					switch(Frame.getFrameType (data)) {
						case Radio.FCF_BEACON:
							if(!this.coordinator) {
								this.timer2.setAlarmTime(time+config.nSlot*config.slotInterval);
								Frame.getBeaconInfo (data, this.config);
								this.handleBeaconReceived (time);
							}
							break;
						case Radio.FCF_CMD:
							switch(Frame.getCMDType (data)){
								case 0x01: // association request handle - coordinator
									Logger.appendString (csr.s2b ("Received Association Request"));
									Logger.flush (Mote.INFO);
									byte[] assRes = Frame.getCMDAssRespFrame (data, this.radio.getPanId (), this.config);
									this.radio.transmit (config.txMode, assRes, 0, Frame.getLength (assRes), time + (config.slotInterval >> 1));
									break;
								case 0x04: // data request handle - coordinator
									break;
								case 0x02: // association response handle - not coordinator
									Logger.appendString(csr.s2b("Received Association Response"));
									Logger.flush(Mote.INFO);
									switch(data[26]){
										case 0x00: // association successful
											this.radio.setShortAddr (Util.get16 (data, 24));
											this.associated = true;
											this.trackBeacon ();
											break;
										case 0x01:
											this.associated = false;
											break;
										default:
											return 0;
									}
									break;
								default:
									return 0;
							}
							break;
						case Radio.FCF_DATA:
							
							break;
						default:
							return 0;
					}
				}
			}
			else if (flags == Radio.FLAG_FAILED || flags == Radio.FLAG_WASLATE) {
				Logger.appendString(csr.s2b("Rx Error"));
				Logger.flush(Mote.INFO);
			}
			else{
				Logger.appendString(csr.s2b("Rx what else?"));
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
						this.radio.startRx(config.rxMode, Time.currentTicks (), time+config.slotInterval);
					}
					else if (data[17] == 0x04) { // data request - not coordinator

					}
				}
			}						
			else if (flags == Radio.FLAG_FAILED || flags == Radio.FLAG_WASLATE) {
				if (this.pdu != null && this.duringSuperframe) {
					this.radio.transmit(config.txMode,this.pdu,0,Frame.getLength (this.pdu),time+config.slotInterval);
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

		public void transmit(uint dstSaddr, short seq, byte[] data) {
			this.pdu = Frame.getDataFrame (data,this.radio.getPanId (),this.radio.getShortAddr (),dstSaddr, seq);
		}

		public uint getCoordinatorSADDR() {
			return config.coordinatorSADDR;
		}

		// static methods
		static void setParameters(long cXaddr, uint cSaddr, uint Saddr) {

		}

		// private methods
		private void trackBeacon() { // nei diagrammi è espresso anche come scanBeacon()
			config.aScanInterval = Time.toTickSpan(Time.MILLISECS, 3 * (config.nSlot+1) * (2^14+1));
			this.radio.startRx(Radio.ASAP|Radio.RX4EVER, 0, Time.currentTicks()+config.aScanInterval);
		}

		private void sendBeacon() {
			byte[] beacon = Frame.getBeaconFrame (this.radio.getPanId (), this.radio.getShortAddr (), this.config);
			this.radio.transmit(Radio.TIMED|Radio.TXMODE_POWER_MAX, beacon, 0, Frame.getLength (beacon),Time.currentTicks()+config.slotInterval);
		}

		private void handleBeaconReceived(long time) {
			this.radio.stopRx();
			this.radio.setPanId (config.panId, false);
			this.duringSuperframe = true;
			if (!this.associated) {
				byte[] assRequest = Frame.getCMDAssReqFrame (this.radio.getPanId (), config.coordinatorSADDR, config);
				this.radio.transmit(config.txMode,assRequest,0,Frame.getLength (assRequest),time+config.slotInterval);
			}
			else if (this.pdu != null  && this.duringSuperframe) { // there's something to transmit
				this.radio.transmit(config.txMode,this.pdu,0,Frame.getLength (this.pdu),time+config.slotInterval);
			}
			else if (this.pdu == null) { // nothing to transmit -> back to sleep

			}
		}

		private void handleDataReceived(byte[] data) {

		}
	}
}