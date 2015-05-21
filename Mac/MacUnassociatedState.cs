using com.ibm.saguaro.system;
using com.ibm.saguaro.logger;
using System;
using Mac_Layer;

namespace Mac_Layer
{
	
	internal class MacUnassociatedState : MacState
	{
		
		public uint coordinatorSADDR;
		public uint panId;
	
		public MacUnassociatedState (Mac mac, uint id) : base(mac)
		{	
			this.panId = id;
			this.saddr = this.mac.radio.getShortAddr ();
			this.mac.radio.setPanId (this.panId, false);
			this.trackBeacon ();
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
						if (LED.getState ((byte)2) == 0)
							LED.setState ((byte)2, (byte)1);
						else
							LED.setState ((byte)2, (byte)0);
						this.duringSuperframe = true;
						this.mac.timer1.setParam (Mac.MAC_SLEEP);
						Frame.getBeaconInfo (data, this);
						this.mac.timer1.setAlarmTime (time + this.nSlot * this.slotInterval);
						this.mac.eventHandler (Mac.MAC_BEACON_RXED, data, len, info, time);
						this.mac.radio.stopRx ();
						byte[] assRequest = Frame.getCMDAssReqFrame (this.mac.radio.getPanId (), 
													this.coordinatorSADDR, this);
						this.mac.radio.transmit (Radio.ASAP | Radio.RXMODE_NORMAL, assRequest, 0,
													(uint)assRequest.Length, time + this.slotInterval);
						break;
					case Radio.FCF_CMD:
						switch ((uint)data [pos]) {
							case ASS_RES: // association response handle - not coordinator
								switch ((uint)data [pos + 3]) {
								case ASS_SUCC: // association successful
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
						if ((len - pos) > 0) {
							byte[] pdu = new byte[len - pos];
							Util.copyData (data, len, pdu, 0, len - pos);
							this.mac.rxHandler (Mac.MAC_DATA_RXED, pdu, len - pos, 
								                    Frame.getSrcSADDR (data), time);
						} else
							this.mac.rxHandler (Mac.MAC_DATA_RXED, null, 0, 
								                    Frame.getSrcSADDR (data), time);
									//TODO
						break;
					}
				} else {
					this.trackBeacon ();
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
			if (this.duringSuperframe)
				this.mac.radio.startRx (Radio.ASAP | Radio.RX4EVER, 0, 0);
			uint modeFlag = flags & Device.FLAG_MODE_MASK;		
			uint pos = Frame.getPayloadPosition (data);
			if (modeFlag == Radio.FLAG_ASAP || modeFlag == Radio.FLAG_EXACT || modeFlag == Radio.FLAG_TIMED) {
				switch (data [0] & FRAME_TYPE_MASK) {
				case Radio.FCF_CMD:
					if (data [pos] == ASS_REQ) { // association request - not coordinator
						this.mac.txHandler (Mac.MAC_ASS_REQ, data, len, info, time);
						this.mac.radio.startRx (Radio.ASAP | Radio.RX4EVER, 0, 0);
					} else if (data [pos] == DATA_REQ) { // data request - not coordinator

					}
					break;
				case Radio.FCF_ACK:
					break;
				}
			} else if (modeFlag == Radio.FLAG_FAILED || modeFlag == Radio.FLAG_WASLATE) {
				
			} else {

			}
			return 0;
		}
		
		public override int onRadioEvent(uint flags, byte[] data, uint len, uint info, long time){
			//TODO
			return 0;
		}
		
		public override void onTimerEvent(byte param, long time){
			if (param == Mac.MAC_SLEEP) {
				this.duringSuperframe = false;
				if(this.mac.radio.getState() == Radio.S_RXEN)
					this.mac.radio.stopRx ();
				LED.setState ((byte)0, (byte)0);
				this.mac.radio.setState (Radio.S_STDBY);
				this.mac.timer1.setParam (Mac.MAC_WAKEUP);
				this.mac.timer1.setAlarmTime (time + this.beaconInterval -
											(this.nSlot+1)*this.slotInterval);
			}
			else if (param == Mac.MAC_WAKEUP) {
				LED.setState ((byte)0, (byte)1);
				this.trackBeacon ();
			}
		}
		
		// protected methods
		internal void trackBeacon() { // nei diagrammi è espresso anche come scanBeacon()
			this.mac.radio.startRx(Radio.ASAP|Radio.RX4EVER, 0, 0);
		}
	}
}

