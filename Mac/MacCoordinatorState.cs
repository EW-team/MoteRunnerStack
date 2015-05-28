

namespace Mac_Layer
{
	using com.ibm.saguaro.system;
	using com.ibm.saguaro.logger;
	
	internal class MacCoordinatorState : MacState
	{	

		// Pan parameters
		public bool associationPermitted = true;
		public uint lastAssigned = 0x0101;
		
		// Max number of associations and currently associated
		public uint maxAssociated = 5;
		public uint currentlyAssociated = 0;
		public short seq = Util.rand8 (); // random sequence number for cmd
		
		public MacCoordinatorState (Mac mac, uint panId, uint saddr) : base(mac)
		{
			this.mac.radio.setPanId (panId, true);
			this.mac.radio.setShortAddr (saddr);
			this.onTimerEvent (Mac.MAC_WAKEUP, Time.currentTicks ());
		}

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
							this.mac.eventHandler (Mac.MAC_ASS_REQ, data, len, info, time);
							this.txBuf = Frame.getCMDAssRespFrame (data, this.mac.radio.getPanId (), this);
							break;
						case DATA_REQ: // data request handle - coordinator
							if (LED.getState ((byte)2) == 0)
								LED.setState ((byte)2, (byte)1);
							else
								LED.setState ((byte)2, (byte)0);
							if (this.mac.pdu != null) {
								uint saddr = Frame.getDestSAddr (this.mac.pdu);
								uint rSaddr = Frame.getSrcSADDR (data);
								if (saddr == rSaddr || saddr == Radio.SADDR_BROADCAST) {
									this.txBuf = this.mac.pdu;
								}
							}
							break;
						}
						break;
					case Radio.FCF_DATA:
						LED.setState ((byte)0, (byte)0);
						if ((len - pos) > 0) {
							byte[] pdu = new byte[len - pos];
							Util.copyData (data, pos, pdu, 0, len - pos);
							this.mac.rxHandler (Mac.MAC_DATA_RXED, pdu, len - pos, 
								                    Frame.getSrcSADDR (data), time);
						} else
							this.mac.rxHandler (Mac.MAC_DATA_RXED, null, 0, 
								                    Frame.getSrcSADDR (data), time);
									//TODO
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
				this.txBuf = null;
				uint pos = Frame.getPayloadPosition (data);
				switch (data [0] & FRAME_TYPE_MASK) {
				case Radio.FCF_BEACON:
					LED.setState ((byte)0, (byte)1);
					this.mac.timer1.setParam (Mac.MAC_SLOT);
					this._sync = time;
					this.mac.timer1.setAlarmTime (this._sync + 2 * this.interSlotInterval);
					this.mac.eventHandler (Mac.MAC_BEACON_SENT, data, len, info, time);
					break;
				case Radio.FCF_DATA:
					if (LED.getState ((byte)1) == 0)
						LED.setState ((byte)1, (byte)1);
					else
						LED.setState ((byte)1, (byte)0);
					this.mac.pdu = null;
					this.mac.txHandler (Mac.MAC_TX_COMPLETE, data, len, info, time);
					break;
				case Radio.FCF_CMD:
					if ((uint)data [pos] == ASS_RES) { // association response
						if (data [pos + 3] == (byte)MacState.ASS_SUCC)
							this.setNextAddr ();
						this.mac.txHandler (Mac.MAC_ASS_RESP, data, len, info, time);
					}
					break;
				}
			} else if (modeFlag == Radio.FLAG_FAILED || modeFlag == Radio.FLAG_WASLATE) {
				if ((data [0] & FRAME_TYPE_MASK) == Radio.FCF_BEACON) {
					this.mac.timer1.setParam (Mac.MAC_WAKEUP);
				}
			} else {
				//TODO
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
				this.mac.timer1.cancelAlarm ();
				this._sync = time + this.beaconInterval - this.nSlot * this.slotInterval;
				this.mac.timer1.setAlarmTime (this._sync);
				break;
			case Mac.MAC_WAKEUP:
				this.slotCount = 0;
				this.sendBeacon ();
				break;
			case Mac.MAC_SLOT:
				this.slotCount += 1;
				if (this.slotCount > this.nSlot) {
					goto case Mac.MAC_SLEEP;
				} else {
					this._sync = time + this.slotInterval + this.interSlotInterval;
					this.mac.timer1.setAlarmTime (this._sync);
				}
				if (!this._lock) { // exclusive section - if radio is occupied, ignore the content!
					if (this.txBuf == null) {
						if (this.mac.radio.getState () != Radio.S_RXEN) { // if the radio is not receiving then start to receive
							this.mac.radio.startRx (Radio.ASAP | Radio.RX4EVER, 0, 0);
						}
					} else { // there's something to transmit
						this._lock = true; // prevent other action that may cause real-time fail in transmission
						if (this.mac.radio.getState () == Radio.S_RXEN)
							this.mac.radio.stopRx (); // stop receive if receiving
						if (this._retry > this._abort) {
							this.txBuf = null;
						} else {
							this._retry += 1;
							this.mac.radio.transmit (Radio.ASAP | Radio.TXMODE_CCA, this.txBuf, 0, (uint)this.txBuf.Length, 
										time + this.slotInterval); // transmit in this slot
										
						}
					}
				}
				break;
			}
		}
		
		// protected methods
		private void sendBeacon ()
		{
			this._lock = true;
			byte[] beacon;
			if (this.mac.pdu != null) {
				uint saddr = Frame.getDestSAddr (this.mac.pdu);
				beacon = Frame.getBeaconFrame (this.mac.radio.getPanId (), this.mac.radio.getShortAddr (), saddr, this);
			} else {
				beacon = Frame.getBeaconFrame (this.mac.radio.getPanId (), this.mac.radio.getShortAddr (), this);
			}
			this.mac.radio.transmit (Radio.ASAP | Radio.TXMODE_POWER_MAX, beacon, 0, (uint)beacon.Length, Time.currentTicks () + this.slotInterval);
		}
	}
}

