using System;
using System.Diagnostics;
using System.IO.IsolatedStorage;
using System.Runtime.Remoting.Messaging;

/// <summary>
/// Mac.
/// </summary>
namespace Mac_Layer
{
	using com.ibm.saguaro.system;
	using com.ibm.saguaro.logger;

	/// <summary>
	/// Mac.
	/// </summary>
	public class Mac
	{
		// MAC scan modes
		/// <summary>
		/// Constant MA c_ SCA n_ PASSIV.
		/// </summary>
		public const byte MAC_SCAN_PASSIVE = (byte)0x00;
		/// <summary>
		/// Constant MA c_ SCA n_ E.
		/// </summary>
		public const byte MAC_SCAN_ED = (byte)0x01;

		// Timer parameters
		/// <summary>
		/// Constant MA c_ WAKEU.
		/// </summary>
		internal const byte MAC_WAKEUP = (byte)0x10;
		/// <summary>
		/// Constant MA c_ SLEE.
		/// </summary>
		internal const byte MAC_SLEEP = (byte)0x11;
		/// <summary>
		/// Constant MA c_ SLO.
		/// </summary>
		internal const byte MAC_SLOT = (byte)0x12;

		// MAC Flags codes
		/// <summary>
		/// Constant MA c_ T x_ COMPLET.
		/// </summary>
		public const uint MAC_TX_COMPLETE = 0xE001;
		/// <summary>
		/// Constant MA c_ ASSOCIATE.
		/// </summary>
		public const uint MAC_ASSOCIATED = 0xE002;
		/// <summary>
		/// Constant MA c_ BEACO n_ SEN.
		/// </summary>
		public const uint MAC_BEACON_SENT = 0xE003;
		/// <summary>
		/// Constant MA c_ AS s_ RE.
		/// </summary>
		public const uint MAC_ASS_REQ = 0xE004;
		/// <summary>
		/// Constant MA c_ AS s_ RES.
		/// </summary>
		public const uint MAC_ASS_RESP = 0xE005;
		/// <summary>
		/// Constant MA c_ BEACO n_ RXE.
		/// </summary>
		public const uint MAC_BEACON_RXED = 0xE006;
		/// <summary>
		/// Constant MA c_ DAT a_ RXE.
		/// </summary>
		public const uint MAC_DATA_RXED = 0xE007;

		//----------------------------------------------------------------------//
		//-------------------------    RESTART HERE    -------------------------//
		//----------------------------------------------------------------------//

		// Instance Variables
		internal Radio radio;
		internal Timer timer1;
//		internal Timer timer2;
		
		/// <summary>
		/// The pdu.
		/// </summary>
		public byte[] pdu;
//		private byte[] _pdu;
//		public byte[] pdu {
//			get {
//				return this._pdu;
//			}
//			set {
//				if (value == null && this.buffer [this._bufTransm] != null)
//					this._pdu = (byte[])this.buffer [this._bufTransm];
//				else if (value != null)
//					this._pdu = value;
//				else
//					this._pdu = null;
//			}
//		}
//		internal byte[] header;
//		
//		public uint bufferLength = 8;
//		public object[] buffer;
//		
//		private uint _bufCount = 0;
//		public uint bufCount {
//			get {
//				return this.bufCount;
//			}
//			set {
//#if DEBUGGINO
//			Logger.appendString(csr.s2b("Buffer status: "));
//			Logger.appendUInt (this._bufTransm);
//			Logger.appendString(csr.s2b(" -> "));
//			Logger.appendUInt (this._bufCount);
//#endif
//				if (value == this._bufTransm)
//					this._bufTransm += 1;
//				this._bufCount = value % bufferLength;
//			}
//		}
//		
//		private uint _bufTransm = 0;
//		public uint bufTransm {
//			get {
//				return this._bufTransm;
//			}
//			set {
//#if DEBUGGINO
//			Logger.appendString(csr.s2b("Buffer status: "));
//			Logger.appendUInt (this._bufTransm);
//			Logger.appendString(csr.s2b(" -> "));
//			Logger.appendUInt (this._bufCount);
//#endif
//				if (this._bufTransm != this._bufCount)
//					this._bufTransm = value % bufferLength;
//			}
//		}

//		// Internal logic parameters
//		private bool scanContinue = false;

		// Callbacks
		internal DevCallback rxHandler = new DevCallback (onMockEvent);
		internal DevCallback txHandler = new DevCallback (onMockEvent);
		internal DevCallback eventHandler = new DevCallback (onMockEvent);
//		internal MacScanCallback scanHandler;

		// Configuration
		internal MacState state;
		
		/// <summary>
		/// Initializes a new instance of the <see cref="Mac_Layer.Mac"/> class.
		/// </summary>
		public Mac ()
		{
			this.timer1 = new Timer ();
			this.radio = new Radio ();
			this.pdu = null;
		}
		
		/// <summary>
		/// Ons the state event.
		/// </summary>
		/// <returns>
		/// The state event.
		/// </returns>
		/// <param name='flag'>
		/// Flag.
		/// </param>
		/// <param name='param'>
		/// Parameter.
		/// </param>
		internal uint onStateEvent (uint flag, uint param)
		{
			if (flag == MAC_ASSOCIATED) {
				LED.setState ((byte)0, (byte)1);
				LED.setState ((byte)1, (byte)1);
				LED.setState ((byte)2, (byte)0);
				this.timer1.cancelAlarm ();
				this.state = new MacAssociatedState (this, this.radio.getPanId (), param);
				this.eventHandler (MAC_ASSOCIATED, null, 0, this.radio.getShortAddr (), Time.currentTicks ());
			}
			return 0;
		}

/// <summary>
/// Sets the channel.
/// </summary>
/// <param name='channel'>
/// Channel.
/// </param>
		public void setChannel (uint channel)
		{
			this.radio.setChannel ((byte)channel);
		}
		
		/// <summary>
		/// Associate the specified panId.
		/// </summary>
		/// <param name='panId'>
		/// Pan identifier.
		/// </param>
		public void associate (uint panId)
		{
			this.state = new MacUnassociatedState (this, panId);
		}
		
		/// <summary>
		/// Creates the pan.
		/// </summary>
		/// <param name='panId'>
		/// Pan identifier.
		/// </param>
		/// <param name='saddr'>
		/// Saddr.
		/// </param>
		public void createPan (uint panId, uint saddr)
		{
			this.state = new MacCoordinatorState (this, panId, saddr);
		}
		
		/// <summary>
		/// Sets the state.
		/// </summary>
		/// <param name='state'>
		/// State.
		/// </param>
		internal void setState (MacState state)
		{
			this.state = state;
		}
		
		/// <summary>
		/// Disassociate this instance.
		/// </summary>
		public void disassociate ()
		{
			//TODO
		}
		
		/// <summary>
		/// Enable the specified onOff.
		/// </summary>
		/// <param name='onOff'>
		/// On off.
		/// </param>
		public void enable (bool onOff)
		{
			if (onOff) {
				this.radio.open (Radio.DID, null, 0, 0);
			} else {
				this.timer1.cancelAlarm ();
				this.disassociate ();
				this.radio.close ();
			}
		}
		
//		public void setScanHandler(MacScanCallback callback) {
//			this.scanHandler = callback;
//		}
		
		/// <summary>
		/// Sets the tx handler.
		/// </summary>
		/// <param name='callback'>
		/// Callback.
		/// </param>
		public void setTxHandler (DevCallback callback)
		{
			this.txHandler = callback;
		}
		
		/// <summary>
		/// Sets the rx handler.
		/// </summary>
		/// <param name='callback'>
		/// Callback.
		/// </param>
		public void setRxHandler (DevCallback callback)
		{
			this.rxHandler = callback;
		}
		
		/// <summary>
		/// Sets the event handler.
		/// </summary>
		/// <param name='callback'>
		/// Callback.
		/// </param>
		public void setEventHandler (DevCallback callback)
		{
			this.eventHandler = callback;
		}
		
		/// <summary>
		/// Send the specified data with sequence seq to dstSaddr.
		/// </summary>
		/// <param name='dstSaddr'>
		/// Destination short address.
		/// </param>
		/// <param name='seq'>
		/// Sequence number.
		/// </param>
		/// <param name='data'>
		/// Data.
		/// </param>
		public uint send (uint dstSaddr, short seq, byte[] data)
		{
#if DBG
			Logger.appendString(csr.s2b("send("));
			Logger.appendUInt (dstSaddr);
			Logger.appendString(csr.s2b(", "));
			Logger.appendUInt ((uint)seq);
			Logger.appendString(csr.s2b(")"));
			Logger.flush(Mote.INFO);
#endif
			return this.state.send (dstSaddr, seq, data);
		}
		
		// static methods
		public static int onMockEvent (uint flags, byte[] data, uint len, uint info, long time)
		{
			
			return 0;
		}
		
		/// <summary>
		/// Permits to set Mac parameters. Currently not implemented.
		/// </summary>
		/// <param name='cXaddr'>
		/// C xaddr.
		/// </param>
		/// <param name='cSaddr'>
		/// C saddr.
		/// </param>
		/// <param name='Saddr'>
		/// Saddr.
		/// </param>
		static void setParameters (long cXaddr, uint cSaddr, uint Saddr)
		{
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
