using com.ibm.saguaro.system;
using com.ibm.saguaro.logger;

namespace Mac_Layer
{
	internal class MacAssociatedState : MacUnassociatedState
	{
		
		public MacAssociatedState (Mac mac,uint panId, uint saddr) : base(mac, panId)
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
		
		public override int onRxEvent(uint flags, byte[] data, uint len, uint info, long time){
			uint modeFlag = flags & Device.FLAG_MODE_MASK;
			if (modeFlag == Radio.FLAG_ASAP || modeFlag == Radio.FLAG_EXACT || modeFlag == Radio.FLAG_TIMED) {	
				if (data != null) {
					switch(Frame.getFrameType (data)) {
						case Radio.FCF_BEACON: // look for pending data here
							this.duringSuperframe = true;
							this.mac.timer1.setParam (Mac.MAC_SLEEP);
							this.mac.timer1.setAlarmTime(time+this.nSlot*this.slotInterval);
							Frame.getBeaconInfo (data, this);
							if (this.mac.pdu != null  && this.duringSuperframe) { // there's something to transmit
								this.transmit(time);
							}
							break;
						case Radio.FCF_CMD:
							switch(Frame.getCMDType (data)){
								case 0x04: // data request handle - coordinator
									//TODO
									break;
							}
							break;
						case Radio.FCF_DATA:
							// handle fcf data
							//TODO
							break;
					}
				}
			}
			else if (modeFlag == Radio.FLAG_FAILED || modeFlag == Radio.FLAG_WASLATE) {
				//TODO
			}
			else{
				//TODO
			}
			return 0;
		}
		
		public override int onTxEvent(uint flags, byte[] data, uint len, uint info, long time){
			uint modeFlag = flags & Device.FLAG_MODE_MASK;		
			if (modeFlag == Radio.FLAG_ASAP || modeFlag == Radio.FLAG_EXACT || modeFlag == Radio.FLAG_TIMED) {
				switch (data [0] & 0x07) {
					case Radio.FCF_DATA:
						this.mac.txHandler (Mac.MAC_TX_COMPLETE, data, len, info, time);
						this.mac.pdu = null;
						break;
					case Radio.FCF_CMD:
						if (data [17] == 0x04) { // data request - not coordinator
							//TODO
						}
						break;
				}
			}						
			else if (modeFlag == Radio.FLAG_FAILED || modeFlag == Radio.FLAG_WASLATE) {
				if (this.mac.pdu != null && this.duringSuperframe) {
					this.transmit (time);
				}
				else { // pdu = null || this.slotCounter >= nSlot
					// impostare il risparmio energetico
					//TODO
				}
			}
			else {
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

		internal void transmit(long time) {
			this.mac.radio.stopRx();
			uint len = (uint)this.mac.pdu.Length;
			this.mac.radio.transmit(Radio.ASAP|Radio.TXMODE_CCA, this.mac.pdu,0,len, time+this.slotInterval);
//			this.mac.radio.transmit (Radio.ASAP|Radio.TXMODE_CCA,this.mac.header,(uint)this.mac.header.Length,
//										this.mac.pdu,0,len,time+this.slotInterval);
		}
		
	}
}

