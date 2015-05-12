using System;
using System.Diagnostics;
using System.IO.IsolatedStorage;
using System.Runtime.Remoting.Messaging;

namespace Mac_Layer
{
	using com.ibm.saguaro.system;
	using com.ibm.saguaro.logger;

//	public delegate int MacScanCallback(uint flags, byte[] data, int chn, uint info, long time);

	public class Mac
	{
		// MAC scan modes
		public const byte MAC_SCAN_PASSIVE = (byte)0x00;
		public const byte MAC_SCAN_ED = (byte)0x01;

		// Timer parameters
		internal const byte MAC_WAKEUP = (byte)0x10;
		internal const byte MAC_SLEEP = (byte)0x11;
		internal const byte MAC_SLEEP_WAITING_BEACON = (byte)0x12;

		// MAC Flags codes
		public const uint MAC_TX_COMPLETE = 0xE001;
		public const uint MAC_ASSOCIATED = 0xE002;
		public const uint MAC_BEACON_SENT = 0xE003;
		public const uint MAC_ASS_REQ = 0xE004;
		public const uint MAC_ASS_RESP = 0xE005;
		public const uint MAC_BEACON_RXED = 0xE006;
		public const uint MAC_DATA_RXED = 0xE007;

		//----------------------------------------------------------------------//
		//-------------------------    RESTART HERE    -------------------------//
		//----------------------------------------------------------------------//

		// Instance Variables
		internal Radio radio;
		internal Timer timer1;
//		internal Timer timer2;
		internal byte[] pdu;
		internal byte[] header;

//		// Internal logic parameters
//		private bool scanContinue = false;

		// Callbacks
		internal DevCallback rxHandler = new DevCallback(onMockEvent);
		internal DevCallback txHandler = new DevCallback(onMockEvent);
		internal DevCallback eventHandler = new DevCallback(onMockEvent);
//		internal MacScanCallback scanHandler;

		// Configuration
		internal MacState state;

		public Mac () {
			this.timer1 = new Timer();
			this.radio = new Radio();
		}

		internal void onStateEvent (uint flag, uint param)
		{
			if (flag == MAC_ASSOCIATED) {
				if (LED.getState ((byte)2) == 0)
					LED.setState ((byte)2, (byte)1);
				else
					LED.setState ((byte)2, (byte)0);	
				this.timer1.cancelAlarm ();
				this.state = new MacAssociatedState (this, this.radio.getPanId (), param);
				this.eventHandler (MAC_ASSOCIATED, null, 0, this.radio.getShortAddr (), Time.currentTicks ());
			}
		}

		public void setChannel(uint channel) {
			this.radio.setChannel((byte)channel);
		}

		public void associate(uint panId) {
			this.state = new MacUnassociatedState(this, panId);
		}

		public void createPan(uint panId, uint saddr) {
			this.state = new MacCoordinatorState(this, panId, saddr);
		}

		// to define
		public void disassociate( ) {
			//TODO
		}

		public void enable(bool onOff){
			if (onOff) {
				this.radio.open(Radio.DID,null,0,0);
			}
			else {
				this.timer1.cancelAlarm();
				this.disassociate();
				this.radio.close();
			}
		}
		
//		public void setScanHandler(MacScanCallback callback) {
//			this.scanHandler = callback;
//		}

		public void setTxHandler(DevCallback callback) {
			this.txHandler = callback;
		}

		public void setRxHandler(DevCallback callback) {
			this.rxHandler = callback;
		}

		public void setEventHandler(DevCallback callback) {
			this.eventHandler = callback;
		}

		public void send(uint dstSaddr, short seq, byte[] data) {
			byte[] header = Frame.getDataHeader(this.radio.getPanId (),this.radio.getShortAddr (),dstSaddr, seq);
//			this.pdu = (byte[])Util.alloca((byte)(header.Length+data.Length),(byte)Util.BYTE_ARRAY);
			uint headLen = (uint) header.Length;
			uint dataLen = (uint) data.Length;
			this.pdu = new byte[headLen+dataLen];
			Util.copyData(header,0,this.pdu,0,headLen);
			Util.copyData(data,0,this.pdu,headLen,dataLen);
		}
		
		// static methods
		public static int onMockEvent(uint flags, byte[] data, uint len, uint info, long time){
			
			return 0;
		}
		
		static void setParameters(long cXaddr, uint cSaddr, uint Saddr) {
			//TODO
		}

//		public void scan(int channel, uint mode) {
//			uint scanMode = Radio.TIMED;
//			if (mode == MAC_SCAN_ED){
//				scanMode = Radio.RXMODE_ED;
//				this.radio.setRxMode(Radio.RXMODE_ED);
//				this.timer1.setParam(MAC_SCAN_ED);
//			}
//			else if (mode == MAC_SCAN_PASSIVE) {
//				scanMode = Radio.RXMODE_NORMAL;
//				//				this.radio.setRxMode(Radio.RXMODE_NORMAL);
//				this.timer1.setParam(MAC_SCAN_PASSIVE);	
//			}
//			else{
//				ArgumentException.throwIt(ArgumentException.ILLEGAL_VALUE);
//				return;	
//			}
//			this.radio.setRxHandler(onScanEvent);
////			this.aScanInterval = Time.toTickSpan(Time.MILLISECS, 3 * (nSlot+1) * (2^scanOrder+1));
//			if (channel == 0) {
//				this.scanContinue = true;
//			}
//			this.radio.setChannel((byte)channel);
//			this.radio.startRx(scanMode,Time.currentTicks(),Time.currentTicks()+config.aScanInterval);
//		}
//
//		public void stopScan() {
//			this.scanContinue = false;
//			this.timer1.cancelAlarm();
//			this.radio.setRxHandler(onRxEvent);
//		}
//
//		public void onTimerEvent(byte param, long time){
////			if (param == MAC_CMODE) {
//////				this.radio.startRx(Radio.ASAP|Radio.RXMODE_PROMISCUOUS,Time.currentTicks(),time+config.slotInterval);
//////				this.slotCounter += 1;
////				this.duringSuperframe = false;
////				this.radio.stopRx ();
////				this.timer1.setParam (MAC_SLEEP_TILL_BEACON);
////				this.timer1.setAlarmBySpan (this.config.beaconInterval-this.config.nSlot*this.config.slotInterval);
////			}
////			else if (param == MAC_SLEEP_TILL_BEACON) {
////				this.sendBeacon();
////				this.slotCounter = 1;
////				this.timer1.setParam ((byte)MAC_CMODE);
////				this.timer1.setAlarmBySpan (this.config.nSlot*this.config.slotInterval);
////				this.duringSuperframe = true;
////			}
////			else if (param == MAC_SLEEP) { // spegnere tutto
////				this.duringSuperframe = false;
////				this.timer2.setParam(MAC_SLEEP_WAITING_BEACON);
////				this.timer2.setAlarmTime(time+config.beaconInterval-config.nSlot*config.slotInterval);
////			}			
////			else 
//			if (param == MAC_SLEEP_WAITING_BEACON) {
//				this.timer2.setParam(MAC_SLEEP);
//				this.trackBeacon();	
//			}
//			else if ((param == MAC_SCAN_ED || 
//			          param == MAC_SCAN_PASSIVE) && this.scanContinue) {
//				int chnl = (int)this.radio.getChannel();
//				if (chnl < 27) {
//					chnl += 1;
//					if(chnl == 27)
//						this.scanContinue = false;
//					this.radio.setChannel((byte)chnl);
//					this.radio.startRx(param,time,Time.currentTicks()+config.aScanInterval);
//				}
//			}
//		}
//
//		public int onScanEvent(uint flags, byte[] data, uint len, uint info, long time) {
//			uint mode = radio.getRxMode();
//			if (mode == Radio.RXMODE_ED) {
//				this.scanHandler(MAC_SCAN_ED,data,Radio.std2chnl(this.radio.getChannel()),info,time);
//			}
//			else if (mode == Radio.RXMODE_NORMAL) {
//				this.scanHandler(MAC_SCAN_PASSIVE,data,this.radio.getChannel(),info,time);
//			}
//
//			if (!this.scanContinue){
//				this.stopScan();
//			}
//			else
//				this.timer1.setAlarmBySpan(config.aScanInterval>>1);
//			return 0;
//		}

//		public int onRxEvent(uint flags, byte[] data, uint len, uint info, long time) {
//			uint modeFlag = flags & Device.FLAG_MODE_MASK;
//			if (modeFlag == Radio.FLAG_ASAP || modeFlag == Radio.FLAG_EXACT || modeFlag == Radio.FLAG_TIMED) {
//				if (this.coordinator) { // the device is transmitting beacons
//					if (this.slotCounter <= config.nSlot)
//						this.timer1.setAlarmBySpan(config.slotInterval>>1);
//					else { // superframe is ended
//						this.slotCounter = 0;
//						this.timer1.setParam(MAC_SLEEP_TILL_BEACON);
//						this.timer1.setAlarmBySpan(time+config.beaconInterval-config.nSlot*config.slotInterval);
//					}
//				}
//	
//				if (data != null) {
//					switch(Frame.getFrameType (data)) {
//						case Radio.FCF_BEACON:
//							if(!this.coordinator) {
//								this.timer2.setAlarmTime(time+config.nSlot*config.slotInterval);
//								Frame.getBeaconInfo (data, this.config);
//								this.handleBeaconReceived (time);
//							}
//							break;
//						case Radio.FCF_CMD:
//							switch(Frame.getCMDType (data)){
//								case 0x01: // association request handle - coordinator
//									Logger.appendString (csr.s2b ("Received Association Request"));
//									Logger.flush (Mote.INFO);
//									byte[] assRes = Frame.getCMDAssRespFrame (data, this.radio.getPanId (), this.config);
////									this.radio.stopRx ();
//									this.radio.send (config.txMode, assRes, 0, Frame.getLength (assRes), time + this.config.slotInterval);
//									break;
//								case 0x04: // data request handle - coordinator
//									break;
//								case 0x02: // association response handle - not coordinator
//									Logger.appendString(csr.s2b("Received Association Response"));
//									Logger.flush(Mote.INFO);
//									switch(data[26]){
//										case 0x00: // association successful
//											this.radio.setShortAddr (Util.get16 (data, 24));
//											this.associated = true;
//											this.trackBeacon ();
//											break;
//										case 0x01:
//											this.associated = false;
//											break;
//									}
//									break;
//							}
//							break;
//						case Radio.FCF_DATA:
//							// handle fcf data
//							break;
//					}
//				}
//			}
//			else if (modeFlag == Radio.FLAG_FAILED || modeFlag == Radio.FLAG_WASLATE) {
//				Logger.appendString(csr.s2b("Rx Error"));
//				Logger.flush(Mote.INFO);
//			}
//			else{
//				Logger.appendString(csr.s2b("Rx what else?"));
//				Logger.flush(Mote.INFO);
//			}
//			return 0;
//		}

//		public int onTxEvent(uint flags, byte[] data, uint len, uint info, long time) {
//			uint modeFlag = flags & Device.FLAG_MODE_MASK;		
//			if (modeFlag == Radio.FLAG_ASAP || modeFlag == Radio.FLAG_EXACT || modeFlag == Radio.FLAG_TIMED) {
//				switch (data [0] & 0x07) {
//					case Radio.FCF_BEACON:
//						this.radio.startRx (Radio.ASAP|Radio.RX4EVER,0,0);
//						this.eventHandler (MAC_BEACON_SENT, data, len, info, time);
//						break;
//					case Radio.FCF_DATA:
//						this.txHandler (MAC_TX_COMPLETE, data, len, info, time);
//						break;
//					case Radio.FCF_CMD:
//						if (data [17] == 0x01) { // association request - not coordinator
//							this.radio.startRx (config.rxMode, Time.currentTicks (), time + config.slotInterval);
//						} else if (data [17] == 0x04) { // data request - not coordinator
//
//						}
//						break;
//				}
//			}						
//			else if (modeFlag == Radio.FLAG_FAILED || modeFlag == Radio.FLAG_WASLATE) {
//				if (this.pdu != null && this.duringSuperframe) {
//					this.radio.transmit(config.txMode,this.pdu,0,Frame.getLength (this.pdu),time+config.slotInterval);
//				}
//				else { // pdu = null || this.slotCounter >= nSlot
//					// impostare il risparmio energetico
//				}
//			}
//			else {
//
//			}
//			return 0;
//		}

//		public int onEvent(uint flags, byte[] data, uint len, uint info, long time) {
//
//			return 0;
//		}

//		public uint getCoordinatorSADDR() {
//			return config.coordinatorSADDR;
//		}

		

//		// private methods
//		private void trackBeacon() { // nei diagrammi è espresso anche come scanBeacon()
//			config.aScanInterval = Time.toTickSpan(Time.MILLISECS, 3 * (config.nSlot+1) * (2^14+1));
//			this.radio.startRx(Radio.ASAP|Radio.RX4EVER, 0, Time.currentTicks()+config.aScanInterval);
//		}
//
//		private void sendBeacon() {
//			byte[] beacon = Frame.getBeaconFrame (this.radio.getPanId (), this.radio.getShortAddr (), this.config);
//			this.radio.transmit(Radio.TIMED|Radio.TXMODE_POWER_MAX, beacon, 0, Frame.getLength (beacon),Time.currentTicks()+config.slotInterval);
//		}

//		private void handleBeaconReceived(long time) {
//			this.radio.stopRx();
//			this.radio.setPanId (config.panId, false);
//			this.duringSuperframe = true;
//			if (!this.associated) {
//				byte[] assRequest = Frame.getCMDAssReqFrame (this.radio.getPanId (), config.coordinatorSADDR, config);
//				this.radio.transmit(config.txMode,assRequest,0,Frame.getLength (assRequest),time+config.slotInterval);
//			}
//			else if (this.pdu != null  && this.duringSuperframe) { // there's something to transmit
//				this.radio.transmit(config.txMode,this.pdu,0,Frame.getLength (this.pdu),time+config.slotInterval);
//			}
//			else if (this.pdu == null) { // nothing to transmit -> back to sleep
//
//			}
//		}
//		//
//		private void handleDataReceived(byte[] data) {
//
//		}
	}
}
