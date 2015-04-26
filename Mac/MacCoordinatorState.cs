

namespace Mac_Layer
{
	using com.ibm.saguaro.system;
	using com.ibm.saguaro.logger;
	
	internal class MacCoordinatorState : MacState
	{	

		// Pan parameters
		public bool associationPermitted = true;
		public uint lastAssigned = 0x0100;
		
		// Max number of associations and currently associated
		public uint maxAssociated = 5;
		public uint currentlyAssociated = 0;
		public short seq = Util.rand8(); // random sequence number for cmd
		
		public MacCoordinatorState (Mac mac, uint panId, uint saddr) : base(mac)
		{
			this.mac.radio.setPanId (panId, true);
			this.mac.radio.setShortAddr (saddr);
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
		
		public override int onRxEvent(uint flags, byte[] data, uint len, uint info, long time){
			uint modeFlag = flags & Device.FLAG_MODE_MASK;
			if (modeFlag == Radio.FLAG_ASAP || modeFlag == Radio.FLAG_EXACT || modeFlag == Radio.FLAG_TIMED) {
				if (data != null) {
					switch(Frame.getFrameType (data)) {
						case Radio.FCF_BEACON: // there's another coordinator in this pan
							break;
						case Radio.FCF_CMD:
							switch(Frame.getCMDType (data)){
								case 0x01: // association request handle - coordinator
									this.mac.eventHandler(Mac.MAC_ASS_REQ,data,len,info,time);
									byte[] assRes = Frame.getCMDAssRespFrame (data, this.mac.radio.getPanId(), this);
									this.mac.radio.stopRx ();
									this.mac.radio.transmit (Radio.ASAP|Radio.TXMODE_POWER_MAX, assRes, 0, Frame.getLength (assRes), time + this.slotInterval);
									break;
								case 0x04: // data request handle - coordinator
									break;
							}
							break;
						case Radio.FCF_DATA:
//							uint dataPos = Frame.getPayloadPosition (data);
//							byte[] payload = (byte[])Util.alloca ((byte)(data.Length-dataPos+1), Util.BYTE_ARRAY);
//							Util.copyData ((object)data, dataPos, (object)payload, 0, (uint)data.Length);
							this.mac.rxHandler(Mac.MAC_DATA_RXED, data, Frame.getPayloadPosition (data), Frame.getSrcSADDR (data), time);
							break;
					}
				}
				if (this.duringSuperframe) { // turn back to receive
					
				}
				else { // stop receive
					
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
		
		public override int onTxEvent (uint flags, byte[] data, uint len, uint info, long time)
		{
			uint modeFlag = flags & Device.FLAG_MODE_MASK;		
			if (modeFlag == Radio.FLAG_ASAP || modeFlag == Radio.FLAG_EXACT || modeFlag == Radio.FLAG_TIMED) {
				switch (Frame.getFrameType (data)) {
					case Radio.FCF_BEACON:					
						this.mac.eventHandler (Mac.MAC_BEACON_SENT, data, len, info, time);
						break;
					case Radio.FCF_DATA:
						this.mac.txHandler (Mac.MAC_TX_COMPLETE, data, len, info, time);
						break;
					case Radio.FCF_CMD:
						if (data [17] == 0x02) { // association response
							this.setNextAddr ();
							this.mac.txHandler(Mac.MAC_ASS_RESP,data,len,info,time);
						}
						break;
				}
				if(this.duringSuperframe){
					this.mac.radio.startRx (Radio.ASAP | Radio.RX4EVER, 0, 0);
				}
			}						
			else if (modeFlag == Radio.FLAG_FAILED || modeFlag == Radio.FLAG_WASLATE) {
				if (Frame.getFrameType (data) == Radio.FCF_BEACON){
					this.onTimerEvent (Mac.MAC_WAKEUP, Time.currentTicks ());
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
		
		public override void onTimerEvent(byte param, long time){
			if (param == Mac.MAC_SLEEP) {
				this.duringSuperframe = false;
				this.mac.radio.stopRx ();
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
		private void sendBeacon() {
			this.duringSuperframe = true;
			byte[] beacon = Frame.getBeaconFrame (this.mac.radio.getPanId (), this.mac.radio.getShortAddr (), this);
			this.mac.radio.transmit(Radio.TIMED|Radio.TXMODE_POWER_MAX, beacon, 0, Frame.getLength (beacon),Time.currentTicks()+this.slotInterval);
		}
	}
}

