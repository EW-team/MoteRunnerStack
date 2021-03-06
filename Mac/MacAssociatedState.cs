using com.ibm.saguaro.system;
using com.ibm.saguaro.logger;

namespace Mac_Layer
{
	internal class MacAssociatedState : MacUnassociatedState
	{
	
		// Retry control
		internal uint _sleepWait = 4;
		internal uint _activity = 0;

		public MacAssociatedState (Mac mac, uint panId, uint saddr) : base(mac, panId)
		{
			this.coordinatorSADDR = saddr;
			this.mySaddr = this.mac.radio.getShortAddr ();
			
			Logger.appendString (csr.s2b ("My Short Address: "));
			Logger.appendUInt (this.mySaddr);
			Logger.flush (Mote.INFO);
		}
		
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
					case Radio.FCF_BEACON: // look for pending data here
						this.mac.timer1.cancelAlarm ();
						
						this.mac.timer1.setParam (Mac.MAC_SLOT);
						this.mac.timer1.setAlarmTime (time + 2 * this.interSlotInterval);
						
						if (Frame.getBeaconInfo (data, len, this) == 1) {
							this.mac.eventHandler (Mac.MAC_BEACON_RXED, data, len, info, time);
							if (this.dataPending == true) {
								this.txBuf = Frame.getCMDDataFrame (this.mac.radio.getPanId (), 
													this.coordinatorSADDR, this);
							} else if (this.txBuf == null && this.mac.pdu != null) {
								this.txBuf = this.mac.pdu;
								this.mac.pdu = null;
							}
						}
						break;
					case Radio.FCF_CMD:
						switch ((uint)data [pos]) {
						case DATA_REQ: // data request handle - coordinator
									//TODO
							break;
						}
						break;
					case Radio.FCF_DATA:
						LED.setState ((byte)1, (byte)0);
						if ((len - pos) > 0) {
							byte[] pdu = new byte[len - pos];
							Util.copyData (data, pos, pdu, 0, len - pos);
							this.mac.rxHandler (Mac.MAC_DATA_RXED, pdu, len - pos, 
								                    Frame.getSrcSADDR (data), time);
						} else
							this.mac.rxHandler (Mac.MAC_DATA_RXED, null, 0, 
								                    Frame.getSrcSADDR (data), time);
						break;
					}
				}
			} else if (modeFlag == Radio.FLAG_FAILED || modeFlag == Radio.FLAG_WASLATE) {
				if (this.slotCount == 0)
					this.onTimerEvent (Mac.MAC_WAKEUP, Time.currentTicks ());
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
				case Radio.FCF_DATA:
					if (LED.getState ((byte)0) == 0)
						LED.setState ((byte)0, (byte)1);
					else
						LED.setState ((byte)0, (byte)0);

					this.mac.txHandler (Mac.MAC_TX_COMPLETE, data, len, info, time);
					break;
				case Radio.FCF_CMD:
					if (data [pos] == (byte)DATA_REQ) { // data request - not coordinator
						if (LED.getState ((byte)2) == 1)
							LED.setState ((byte)2, (byte)0);
						else
							LED.setState ((byte)2, (byte)1);
					}
					break;
				}
			} else if (modeFlag == Radio.FLAG_FAILED || modeFlag == Radio.FLAG_WASLATE) {
				this._retry += 1;
				LED.setState ((byte)0, (byte)0);
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
	}
}

