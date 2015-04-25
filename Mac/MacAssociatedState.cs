using com.ibm.saguaro.system;
using com.ibm.saguaro.logger;

namespace Mac_Layer
{
	internal class MacAssociatedState : MacUnassociatedState
	{
		public MacAssociatedState (Mac mac, MacConfig config) : base(mac, config)
		{
		}
		
		public override void setNetwork(uint panId, uint saddr){
			this.trackBeacon();
		}
		
		public override int onRxEvent(uint flags, byte[] data, uint len, uint info, long time){
			uint modeFlag = flags & Device.FLAG_MODE_MASK;
			if (modeFlag == Radio.FLAG_ASAP || modeFlag == Radio.FLAG_EXACT || modeFlag == Radio.FLAG_TIMED) {	
				if (data != null) {
					switch(Frame.getFrameType (data)) {
						case Radio.FCF_BEACON: // look for pending data here
							this.duringSuperframe = true;
							this.mac.timer1.setParam (Mac.MAC_SLEEP);
							this.mac.timer1.setAlarmTime(time+this.config.nSlot*this.config.slotInterval);
							Frame.getBeaconInfo (data, this.config);
							this.mac.radio.stopRx();
							if (this.mac.pdu != null  && this.duringSuperframe) { // there's something to transmit
								this.mac.radio.transmit(config.txMode,this.mac.pdu,0,Frame.getLength (this.mac.pdu),time+config.slotInterval);
							}
							break;
						case Radio.FCF_CMD:
							switch(Frame.getCMDType (data)){
								case 0x04: // data request handle - coordinator
									break;
							}
							break;
						case Radio.FCF_DATA:
							// handle fcf data
							break;
					}
				}
			}
			else if (modeFlag == Radio.FLAG_FAILED || modeFlag == Radio.FLAG_WASLATE) {
				Logger.appendString(csr.s2b("Rx Error"));
				Logger.flush(Mote.INFO);
			}
			else{
				Logger.appendString(csr.s2b("Rx what else?"));
				Logger.flush(Mote.INFO);
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
				}
			}
			else {

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
//				this.mac.timer1.setAlarmTime (time + this.config.beaconInterval -
//											(this.config.nSlot+1)*this.config.slotInterval);
//			}
//			else if (param == Mac.MAC_WAKEUP) {
//				this.trackBeacon ();
//			}
//		}
//		
//		// private methods
//		private void trackBeacon() { // nei diagrammi è espresso anche come scanBeacon()
//			this.config.aScanInterval = Time.toTickSpan(Time.MILLISECS, 3 * (this.config.nSlot+1) * (2^14+1));
//			this.mac.radio.startRx(Radio.ASAP|Radio.RX4EVER, 0, Time.currentTicks()+this.config.aScanInterval);
//		}

		internal void transmit(long time) {
			this.mac.radio.transmit(config.txMode,this.mac.pdu,0,Frame.getLength (this.mac.pdu),time+config.slotInterval);
		}
		
	}
}
