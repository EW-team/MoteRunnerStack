using com.ibm.saguaro.system;
using com.ibm.saguaro.logger;

namespace Mac_Layer
{
	internal class MacAssociatedState : MacUnassociatedState
	{
		
		public MacAssociatedState (Mac mac, uint panId, uint saddr) : base(mac, panId)
		{
			this.coordinatorSADDR = saddr;
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
						this.duringSuperframe = true;
						Frame.getBeaconInfo (data, len, this);
						this.mac.timer1.setParam (Mac.MAC_SLEEP);
						this.mac.timer1.setAlarmTime (time + this.nSlot * this.slotInterval);
						if (this.dataPending) { // receive data
							//request for data and return
							this.requestData (time);
							return 0;
						}
						break;
					case Radio.FCF_CMD:
						switch ((uint)data [pos]) {
						case DATA_REQ: // data request handle - coordinator - it could never happen in this point
										//TODO: replace with coherent cases
							break;
						}
						break;
					case Radio.FCF_DATA:
						this.dataPending = false;
						if ((len - pos) > 0) {
							Logger.appendString(csr.s2b("Pos - Len: "));
							Logger.appendUInt (pos);
							Logger.appendString(csr.s2b(" - "));
							Logger.appendUInt (len);
							Logger.flush (Mote.INFO);
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
				if (this.mac.pdu != null && this.duringSuperframe) { // there's something to transmit
					this.transmit (time);
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
				uint pos = Frame.getPayloadPosition(data);
				switch (data [0] & FRAME_TYPE_MASK) {
				case Radio.FCF_DATA:
					this.mac.txHandler (Mac.MAC_TX_COMPLETE, data, len, info, time);
					this.mac.pdu = null;
					break;
				case Radio.FCF_CMD:
					if ((uint)data [pos] == DATA_REQ) { // data request - not coordinator
						this.mac.radio.startRx (Radio.ASAP | Radio.RX4EVER, 0, 0);
					}
					break;
				}
			} else if (modeFlag == Radio.FLAG_FAILED || modeFlag == Radio.FLAG_WASLATE) {
				if (this.mac.pdu != null && this.duringSuperframe) {
					this.transmit (time);
				} else { // pdu = null || this.slotCounter >= nSlot
					// impostare il risparmio energetico
					//TODO
				}
			} else {
				//TODO
			}
			return 0;
		}
		
		public override int onRadioEvent(uint flags, byte[] data, uint len, uint info, long time){
			//TODO
			return 0;
		}
		
//		public void onTimerEvent(byte param, long time){
//			if (param == Mac.MAC_SLEEP) {
//				this.duringSuperframe = false;
//				this.mac.radio.stopRx ();
//				this.mac.timer1.setParam (Mac.MAC_WAKEUP);
//				this.mac.timer1.setAlarmTime (time + this.beaconInterval -
//											(this.nSlot+1)*this.slotInterval);
//			}
//			else if (param == Mac.MAC_WAKEUP) {
//				this.trackBeacon ();
//			}
//		}
//		
//		// private methods
//		private void trackBeacon() { // nei diagrammi è espresso anche come scanBeacon()
//			this.aScanInterval = Time.toTickSpan(Time.MILLISECS, 3 * (this.nSlot+1) * (2^14+1));
//			this.mac.radio.startRx(Radio.ASAP|Radio.RX4EVER, 0, Time.currentTicks()+this.aScanInterval);
//		}

		internal void transmit (long time)
		{
			if(this.mac.radio.getState() == Radio.S_RXEN)
				this.mac.radio.stopRx ();
			uint len = (uint)this.mac.pdu.Length;
			this.mac.radio.transmit (Radio.ASAP | Radio.TXMODE_CCA, this.mac.pdu, 0, len, time + this.slotInterval);
//			this.mac.radio.transmit (Radio.ASAP|Radio.TXMODE_CCA,this.mac.header,(uint)this.mac.header.Length,
//										this.mac.pdu,0,len,time+this.slotInterval);
		}
		
		
		internal void requestData (long time)
		{
			if(this.mac.radio.getState() == Radio.S_RXEN)
				this.mac.radio.stopRx ();
//			if (LED.getState ((byte)2) == 1)
//				LED.setState ((byte)2, (byte)0);
//			else
//				LED.setState ((byte)2, (byte)1);
			byte[] cmd = Frame.getCMDDataFrame (this.panId, this.coordinatorSADDR, this);
			this.mac.radio.transmit (Radio.ASAP | Radio.TXMODE_CCA, cmd, 0, (uint)cmd.Length, time + this.slotInterval);
		}
	}
}

