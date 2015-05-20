

namespace Mac_Layer
{
	using com.ibm.saguaro.system;
	using com.ibm.saguaro.logger;
	
	internal class MacCoordinatorState : MacState
	{	
		private const uint S_ASS_REQ = 1;
		private const uint S_ASS_RES = 2;
		private const uint S_DATA_REQ = 3;
		private const uint S_DATA_ACK = 4;
		private const uint S_RESP_ACK = 5;
		
		// Pan parameters
		public bool associationPermitted = true;
		public uint lastAssigned = 0x0100;
		
		// Max number of associations and currently associated
		public uint maxAssociated = 5;
		public uint currentlyAssociated = 0;
		public short seq = Util.rand8(); // random sequence number for cmd
		
		public MacCoordinatorState (Mac mac, uint panId, uint saddr, uint bo, uint so, uint scanO) : base(mac)
		{
			this.mac.radio.setPanId (panId, true);
			this.mac.radio.setShortAddr (saddr);
			this.saddr = saddr;
			this.BO = bo;
			this.SO = so;
			this.scanOrder = scanO;
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
		
		internal void setNextAddr ()
		{
			this.lastAssigned ++;
		}
		
		internal uint getNextAddr ()
		{
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
//							blink (2);
							this.mac.eventHandler (Mac.MAC_ASS_REQ, data, len, info, time);
							this.resp = Frame.getCMDAssRespFrame (data, this.mac.radio.getPanId (), this);
							this.state = S_ASS_RES;
							break;
						case DATA_REQ: // data request handle - coordinator
//							blink (2);
							if (this.mac.pdu != null && this.duringSuperframe) {
								this.resp = this.mac.pdu;
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
						break;
					case Radio.FCF_ACK:
						switch (this.state) {
						case S_ASS_RES:
							this.setNextAddr ();
							this.resp = null;
							break;
						case S_DATA_ACK:
							this.mac.pdu = null;
							break;
						case S_RESP_ACK:
							this.resp = null;
							break;
						}
						break;
					}
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
					this.state = S_DATA_ACK;
					this.mac.txHandler (Mac.MAC_TX_COMPLETE, data, len, info, time);
					break;
				case Radio.FCF_CMD:
					if (data [pos] == ASS_RES) { // association response
						this.state = S_ASS_RES;
						this.mac.txHandler (Mac.MAC_ASS_RESP, data, len, info, time);
					}
					break;
				}
			} else if (modeFlag == Radio.FLAG_FAILED || modeFlag == Radio.FLAG_WASLATE) {
				switch (data [0] & FRAME_TYPE_MASK) {
				case Radio.FCF_BEACON: // beacon transmission error
					this.onTimerEvent (Mac.MAC_WAKEUP, Time.currentTicks ());
					break;
				case Radio.FCF_DATA: // data transmission error
					if (this.duringSuperframe) {
//						blink (2);
//						this.mac.radio.transmit (Radio.ASAP | Radio.TXMODE_POWER_MAX, this.mac.pdu, 0, (uint)this.mac.pdu.Length, 
//							                        	   time + this.slotInterval);
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
		
		public override void onTimerEvent (byte param, long time)
		{
			switch (param) {
			case Mac.MAC_SLEEP:
//				blink (2);
				this.duringSuperframe = false;
				this.mac.radio.setState (Radio.S_STDBY);
				this.mac.timer1.setParam (Mac.MAC_WAKEUP);
				this.mac.timer1.setAlarmTime (time + this.beaconInterval - this.nSlot * this.slotInterval);
				break;
			case Mac.MAC_WAKEUP:
//				blink (1);
				this.sendBeacon (time);
				this.slotCount = 1;
				this.mac.timer1.setParam (Mac.MAC_SLOT);
				this.mac.timer1.setAlarmTime (time + this.slotInterval);
				break;
			case Mac.MAC_SLOT:
//				blink (0);
				this.mac.timer1.setAlarmTime (time + this.slotInterval + this.interSlotInterval);
				this.slotCount += 1;
				if (this.slotCount == this.nSlot) {
					this.mac.timer1.setParam (Mac.MAC_SLEEP);
				}
				if (this.resp == null) {
//					blink (1);
					this.mac.radio.startRx (Radio.TIMED | Radio.RXMODE_NORMAL, time, time + this.slotInterval);
				} else {
					this.mac.radio.transmit (Radio.ASAP | Radio.TXMODE_POWER_MAX, this.resp,
			                         0, (uint)this.resp.Length, time + this.slotInterval);
				}
				break;
			}
		}

		// protected methods
		private void sendBeacon (long time)
		{
			byte[] beacon;
			this.duringSuperframe = true;
			if (this.mac.pdu != null) {
				uint saddr = Frame.getDestSAddr (this.mac.pdu);
				beacon = Frame.getBeaconFrame (this.mac.radio.getPanId (), this.mac.radio.getShortAddr (), saddr, this);
			} else {
				beacon = Frame.getBeaconFrame (this.mac.radio.getPanId (), this.mac.radio.getShortAddr (), this);
			}	
			this.mac.radio.transmit (Radio.ASAP | Radio.TXMODE_POWER_MAX, beacon, 0, (uint)beacon.Length, time + this.slotInterval);
		}
		
		internal static void blink (uint led)
		{
			if (LED.getState ((byte)led) == 0)
				LED.setState ((byte)led, (byte)1);
			else
				LED.setState ((byte)led, (byte)0);
		}
	}
}

