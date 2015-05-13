

namespace Mac_Layer
{
	using com.ibm.saguaro.system;
	using com.ibm.saguaro.logger;
	
	internal class MacCoordinatorState : MacState
	{	
		
		// Pan parameters
		public bool associationPermitted = true;
		public uint lastAssigned = 0x0100;
		
		private short slotCount = 0;
		
		// Max number of associations and currently associated
		public uint maxAssociated = 5;
		public uint currentlyAssociated = 0;
		public short seq = Util.rand8(); // random sequence number for cmd
		
		public MacCoordinatorState (Mac mac, uint panId, uint saddr) : base(mac)
		{
			this.mac.radio.setPanId (panId, true);
			this.mac.radio.setShortAddr (saddr);
			this.saddr = saddr;
			this.onTimerEvent (Mac.MAC_WAKEUP, Time.currentTicks ());
		}
		
//		public override void setNetwork(uint panId, uint saddr) {
//			this.mac.radio.setPanId (panId, true);
//			this.mac.radio.setShortAddr (saddr);
//			this.onTimerEvent (Mac.MAC_WAKEUP, Time.currentTicks ());
//		}

		public override void dispose ()
		{
			
		}
		
		internal void setNextAddr() {
			this.lastAssigned ++;
		}
		
		internal uint getNextAddr() {
			return this.lastAssigned;
		}
		
		public override int onRxEvent (uint flags, byte[] data, uint len, uint info, long time)
		{
			uint modeFlag = flags & Device.FLAG_MODE_MASK;
			if (modeFlag == Radio.FLAG_ASAP || modeFlag == Radio.FLAG_EXACT || modeFlag == Radio.FLAG_TIMED) {
				if (data != null) {
					uint pos = Frame.getPayloadPosition (data);
					switch (data [0] & FRAME_TYPE_MASK) {
					case Radio.FCF_BEACON: // there's another coordinator in this pan
						break;
					case Radio.FCF_CMD:
						switch ((uint)data [pos]) {
						case ASS_REQ: // association request handle - coordinator
							if (LED.getState ((byte)2) == 0)
								LED.setState ((byte)2, (byte)1);
							else
								LED.setState ((byte)2, (byte)0);	
							this.mac.eventHandler (Mac.MAC_ASS_REQ, data, len, info, time);
							byte[] assRes = Frame.getCMDAssRespFrame (data, this.mac.radio.getPanId (), this);
							this.mac.radio.stopRx ();
							this.mac.radio.transmit (Radio.ASAP | Radio.TXMODE_POWER_MAX, assRes, 0, (uint)assRes.Length,
								                           time + this.slotInterval);
							break;
						case DATA_REQ: // data request handle - coordinator
							this.mac.radio.stopRx ();
							this.mac.radio.transmit (Radio.ASAP | Radio.TXMODE_POWER_MAX, this.mac.pdu, 0, (uint)this.mac.pdu.Length, 
							                        	   time + this.slotInterval);
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
						break;
					}
				}
				if (this.duringSuperframe) { // turn back to receive
					//TODO
//					this.mac.radio.startRx (Radio.ASAP | Radio.RX4EVER, 0, 0);
				} else { // stop receive
					//TODO
				}
			} else if (modeFlag == Radio.FLAG_FAILED || modeFlag == Radio.FLAG_WASLATE) {
				//TODO
			} else {
				//TODO
			}
			return 0;
		}
		
		public override int onTxEvent (uint flags, byte[] data, uint len, uint info, long time)
		{
			uint modeFlag = flags & Device.FLAG_MODE_MASK;		
			if (modeFlag == Radio.FLAG_ASAP || modeFlag == Radio.FLAG_EXACT || modeFlag == Radio.FLAG_TIMED) {
				uint pos = Frame.getPayloadPosition (data);
				switch (data [0] & FRAME_TYPE_MASK) {
				case Radio.FCF_BEACON:
					this.mac.eventHandler (Mac.MAC_BEACON_SENT, data, len, info, time);
					break;
				case Radio.FCF_DATA:
					this.mac.bufTransm = this.mac.bufTransm+1;
					this.mac.txHandler (Mac.MAC_TX_COMPLETE, data, len, info, time);
					break;
				case Radio.FCF_CMD:
					if (data [pos] == ASS_RES) { // association response
						this.setNextAddr ();
						this.mac.txHandler (Mac.MAC_ASS_RESP, data, len, info, time);
					}
					break;
				}
				if (this.duringSuperframe) {
					this.mac.radio.startRx (Radio.ASAP | Radio.RX4EVER, 0, 0);
				}
			} else if (modeFlag == Radio.FLAG_FAILED || modeFlag == Radio.FLAG_WASLATE) {
				switch (data [0] & FRAME_TYPE_MASK) {
				case Radio.FCF_BEACON: // beacon transmission error
					this.onTimerEvent (Mac.MAC_WAKEUP, Time.currentTicks ());
					break;
				case Radio.FCF_DATA: // data transmission error
					if (this.duringSuperframe) {
						this.mac.radio.transmit (Radio.ASAP | Radio.TXMODE_POWER_MAX, this.mac.pdu, 0, (uint)this.mac.pdu.Length, 
							                        	   time + this.slotInterval);
					}
					break;
				}
			} else {
				//TODO
			}		
			return 0;
		}
		
		public override int onRadioEvent(uint flags, byte[] data, uint len, uint info, long time){
			//TODO: add logic to handle radio events
			return 0;
		}
		
		public override void onTimerEvent(byte param, long time){
			if (param == Mac.MAC_SLEEP) {
				this.duringSuperframe = false;
				this.mac.radio.stopRx ();
				this.mac.radio.setState (Radio.S_STDBY);
				this.mac.timer1.setParam (Mac.MAC_WAKEUP);
				this.mac.timer1.setAlarmTime (time + this.beaconInterval-this.nSlot*this.slotInterval);
			}
			else if (param == Mac.MAC_WAKEUP) {
				this.sendBeacon();
				this.mac.timer1.setParam (Mac.MAC_SLEEP);
				this.mac.timer1.setAlarmBySpan (this.nSlot*this.slotInterval);
			}
		}
		
		// protected methods
		private void sendBeacon ()
		{
			byte[] beacon;
			if (LED.getState ((byte)0) == 0)
				LED.setState ((byte)0, (byte)1);
			else
				LED.setState ((byte)0, (byte)0);
			this.duringSuperframe = true;
			if (this.mac.pdu != null) {
				uint saddr = Frame.getDestSAddr (this.mac.pdu);
				beacon = Frame.getBeaconFrame (this.mac.radio.getPanId (), this.mac.radio.getShortAddr (), saddr, this);
			} else {
				beacon = Frame.getBeaconFrame (this.mac.radio.getPanId (), this.mac.radio.getShortAddr (), this);
			}	
			this.mac.radio.transmit (Radio.TIMED | Radio.TXMODE_POWER_MAX, beacon, 0, (uint)beacon.Length, Time.currentTicks () + this.slotInterval);
		}
	}
}

