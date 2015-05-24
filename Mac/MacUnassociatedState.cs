using com.ibm.saguaro.system;
using com.ibm.saguaro.logger;
using System;
using Mac_Layer;

namespace Mac_Layer
{
	internal class MacUnassociatedState : MacState
	{
		
		public uint coordinatorSADDR = 0;
		public uint panId;
	
		public MacUnassociatedState (Mac mac, uint id) : base(mac)
		{	
			this.panId = id;
			this.mac.radio.setPanId (this.panId, false);
			this.onTimerEvent (Mac.MAC_WAKEUP, Time.currentTicks ());
			LED.setState ((byte)1, (byte)1);
			LED.setState ((byte)2, (byte)0);
		}
		
//		public override void setNetwork(uint panId, uint saddr){
//			this.mac.radio.setPanId(panId, false);
//			this.panId = panId;
//			this.trackBeacon();
//		}
	
		public override void dispose ()
		{
			
		}
		
		public override int onRxEvent (uint flags, byte[] data, uint len, uint info, long time)
		{
			uint modeFlag = flags & Device.FLAG_MODE_MASK;
			if (modeFlag == Radio.FLAG_ASAP || modeFlag == Radio.FLAG_EXACT || modeFlag == Radio.FLAG_TIMED) {
				if (data != null) {
					uint pos = Frame.getPayloadPosition (data);
					switch (data [0] & FRAME_TYPE_MASK) {
					case Radio.FCF_BEACON:
						this.mac.timer1.setParam (Mac.MAC_SLOT);
						Frame.getBeaconInfo (data, len, this);
						this.mac.timer1.setAlarmTime (time + this.interSlotInterval);
						this.mac.eventHandler (Mac.MAC_BEACON_RXED, data, len, info, time);
						this.txBuf = Frame.getCMDAssReqFrame (this.mac.radio.getPanId (), 
													this.coordinatorSADDR, this);
						break;
					case Radio.FCF_CMD:
						switch ((uint)data [pos]) {
						case ASS_RES: // association response handle - not coordinator
							switch ((uint)data [pos + 3]) {
							case ASS_SUCC: // association successful
								this._lock = true;
								this.mac.radio.stopRx ();
								this.mac.radio.setShortAddr (Util.get16 (data, pos + 1)); // The SAddr have to be setted when radio is not on!
								this.mac.onStateEvent (Mac.MAC_ASSOCIATED, this.coordinatorSADDR);
								break;
							case ASS_FAIL: // association failed
														//TODO
								break;
							}
							break;
						}
						break;
					case Radio.FCF_DATA:
							// handle fcf data
						break;
					}
				}
			} else if (modeFlag == Radio.FLAG_FAILED || modeFlag == Radio.FLAG_WASLATE) {
				this.trackBeacon ();
//				Logger.appendString(csr.s2b("Rx Error"));
//				Logger.flush(Mote.INFO);
			} else {
//				Logger.appendString(csr.s2b("Rx what else?"));
//				Logger.flush(Mote.INFO);
			}
			return 0;
		}
		
		public override int onTxEvent (uint flags, byte[] data, uint len, uint info, long time)
		{
			uint modeFlag = flags & Device.FLAG_MODE_MASK;
			uint pos = Frame.getPayloadPosition (data);
			if (modeFlag == Radio.FLAG_ASAP || modeFlag == Radio.FLAG_EXACT || modeFlag == Radio.FLAG_TIMED) {
				this.txBuf = null;
				switch (data [0] & FRAME_TYPE_MASK) {
				case Radio.FCF_CMD:
					if (data [pos] == ASS_REQ) { // association request - not coordinator
						this.mac.txHandler (Mac.MAC_ASS_REQ, data, len, info, time);
					} else if (data [pos] == DATA_REQ) { // data request - not coordinator

					}
					break;
				case Radio.FCF_ACK:
					break;
				}
			} else if (modeFlag == Radio.FLAG_FAILED || modeFlag == Radio.FLAG_WASLATE) {
				if (this.txBuf == null)
					this.coordinatorSADDR = 0;
			} else {

			}
			this._lock = false;
			return 0;
		}
		
		public override int onRadioEvent (uint flags, byte[] data, uint len, uint info, long time)
		{
			//TODO
			return 0;
		}
		
		public override void onTimerEvent (byte param, long time)
		{
			switch (param) {
			case Mac.MAC_SLEEP:
				if (this.mac.radio.getState () == Radio.S_RXEN)
					this.mac.radio.stopRx ();
				this.mac.radio.setState (Radio.S_STDBY);
				this.mac.timer1.setParam (Mac.MAC_WAKEUP);
				this.mac.timer1.setAlarmTime (time + this.beaconInterval -
											(this.nSlot + 1) * this.slotInterval);
				break;
			case Mac.MAC_WAKEUP:
				this.slotCount = 0;
				this.trackBeacon ();
				this.mac.timer1.setAlarmTime (time + this.aScanInterval + this.interSlotInterval);
				break;
			case Mac.MAC_SLOT:
				this.slotCount += 1;
				if (this.slotCount >= this.nSlot) {
					goto case Mac.MAC_SLEEP;
					// it's the last interval in superframe
				} else {
					this.mac.timer1.setAlarmTime (time + this.slotInterval + this.interSlotInterval);
				}
				if (!this._lock) { // exclusive section - if radio is occupied, ignore the content!
					if (this.txBuf == null) {
						if (this.mac.radio.getState () != Radio.S_RXEN) // if the radio is not receiving then start to receive
							this.mac.radio.startRx (Radio.ASAP | Radio.RX4EVER, 0, 0);
					} else { // there's something to transmit
						this._lock = true; // prevent other action that may cause real-time fail in transmission
						if (this.mac.radio.getState () == Radio.S_RXEN)
							this.mac.radio.stopRx (); // stop receive if receiving
						if (this._retry > this._abort) {
							this.txBuf = null;
						} else {
							this._retry += 1;
							this.mac.radio.transmit (Radio.ASAP | Radio.TXMODE_POWER_MAX, this.txBuf, 0, (uint)this.txBuf.Length, 
										time + this.slotInterval); // transmit in this slot
										
						}
					}
				}
				break;
			}
		}
		
		// protected methods
		internal void trackBeacon ()
		{
			this.mac.radio.startRx (Radio.ASAP, 0, Time.currentTicks () + this.aScanInterval);
		}
	}
}

