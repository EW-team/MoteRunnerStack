using com.ibm.saguaro.system;
using com.ibm.saguaro.logger;

namespace Mac_Layer
{
	internal class MacAssociatedState : MacUnassociatedState
	{
		internal uint _sleepWait = 4;
		internal uint _activity = 0;

		public MacAssociatedState (Mac mac, uint panId, uint saddr) : base(mac, panId)
		{
			this.coordinatorSADDR = saddr;
			LED.setState ((byte)1, (byte)0);
			LED.setState ((byte)2, (byte)1);
		}
		
//		public override void setNetwork(uint panId, uint saddr){
//			this.coordinatorSADDR = saddr;
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
					case Radio.FCF_BEACON: // look for pending data here
						this.mac.timer1.setParam (Mac.MAC_SLEEP);
						Frame.getBeaconInfo (data, len, this);
						this.mac.timer1.setAlarmTime (time + this.interSlotInterval);
						this.mac.eventHandler (Mac.MAC_BEACON_RXED, data, len, info, time);
						break;
					case Radio.FCF_CMD:
						switch ((uint)data [pos]) {
						case DATA_REQ: // data request handle - coordinator
									//TODO
							break;
						}
						break;
					case Radio.FCF_DATA:
						this.dataPending = false;
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
				switch (data [0] & FRAME_TYPE_MASK) {
				case Radio.FCF_DATA:
					this.mac.txHandler (Mac.MAC_TX_COMPLETE, data, len, info, time);
					break;
				case Radio.FCF_CMD:
					if (data [17] == DATA_REQ) { // data request - not coordinator
						//TODO
					}
					break;
				}
			} else if (modeFlag == Radio.FLAG_FAILED || modeFlag == Radio.FLAG_WASLATE) {
				this._retry += 1;
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
			if (this.dataPending && this.txBuf == null) {
				this.txBuf = Frame.getCMDDataFrame (this.mac.radio.getPanId (), this.coordinatorSADDR, this);
				this._activity = this.slotCount;
			} else if (this.txBuf == null && this.mac.pdu != null) {
				this.txBuf = this.mac.pdu;
				this.mac.pdu = null;
				this._activity = this.slotCount;
			}
			if (this._activity + this._sleepWait <= this.slotCount)
				base.onTimerEvent (param, time);
			else if (this.slotCount < this.nSlot) {
				this.mac.timer1.setParam (Mac.MAC_SLEEP);
				this.mac.timer1.setAlarmTime (time + (this.nSlot - this.slotCount - 1) * this.slotInterval);
			}
		}

		internal void transmit (long time)
		{
			this.mac.radio.stopRx ();
			uint len = (uint)this.mac.pdu.Length;
			this.mac.radio.transmit (Radio.ASAP | Radio.TXMODE_CCA, this.mac.pdu, 0, len, time + this.slotInterval);
//			this.mac.radio.transmit (Radio.ASAP|Radio.TXMODE_CCA,this.mac.header,(uint)this.mac.header.Length,
//										this.mac.pdu,0,len,time+this.slotInterval);
		}
		
	}
}

