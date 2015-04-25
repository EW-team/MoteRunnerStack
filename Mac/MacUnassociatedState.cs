using com.ibm.saguaro.system;
using com.ibm.saguaro.logger;

namespace Mac_Layer
{
	
	internal class MacUnassociatedState : MacState
	{
		
		public uint coordinatorSADDR;
		public uint panId;
	
		public MacUnassociatedState (Mac mac) : base(mac)
		{
		}
		
		public override void setNetwork(uint panId, uint saddr){
			this.mac.radio.open (Radio.DID, null, 0, 0);
			this.mac.radio.setPanId(panId, false);
			this.panId = panId;
			this.trackBeacon();
		}
		
		public override int onRxEvent(uint flags, byte[] data, uint len, uint info, long time){
			uint modeFlag = flags & Device.FLAG_MODE_MASK;
			if (modeFlag == Radio.FLAG_ASAP || modeFlag == Radio.FLAG_EXACT || modeFlag == Radio.FLAG_TIMED) {
				if (data != null) {
					switch(Frame.getFrameType (data)) {
						case Radio.FCF_BEACON:
							this.duringSuperframe = true;
							this.mac.timer1.setParam (Mac.MAC_SLEEP);
							this.mac.timer1.setAlarmTime(time+this.nSlot*this.slotInterval);
							Frame.getBeaconInfo (data, this);
							this.mac.radio.stopRx();
							this.mac.radio.setPanId (this.panId, false);
							byte[] assRequest = Frame.getCMDAssReqFrame (this.mac.radio.getPanId (), 
													this.coordinatorSADDR, this);
							this.mac.radio.transmit(Radio.ASAP | Radio.RXMODE_NORMAL,assRequest,0,
													Frame.getLength (assRequest),time+this.slotInterval);
							break;
						case Radio.FCF_CMD:
							switch(Frame.getCMDType (data)){
								case 0x02: // association response handle - not coordinator
									Logger.appendString(csr.s2b("Received Association Response"));
									Logger.flush(Mote.INFO);
									switch(data[26]){
										case 0x00: // association successful
											this.mac.radio.setShortAddr (Util.get16 (data, 24));
//											this.associated = true;
// ---------------------------------------> Change state to Associated and start associated behaviour
											this.trackBeacon ();
											break;
										case 0x01: // association failed
											//TODO 
											break;
									}
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
					case Radio.FCF_CMD:
						if (data [17] == 0x01) { // association request - not coordinator
							this.mac.radio.startRx (Radio.ASAP | Radio.RXMODE_NORMAL, Time.currentTicks (), time + this.slotInterval);
						} else if (data [17] == 0x04) { // data request - not coordinator

						}
						break;
					case Radio.FCF_ACK:
						break;
				}
			}						
			else if (modeFlag == Radio.FLAG_FAILED || modeFlag == Radio.FLAG_WASLATE) {
				
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
				this.mac.timer1.setAlarmTime (time + this.beaconInterval -
											(this.nSlot+1)*this.slotInterval);
			}
			else if (param == Mac.MAC_WAKEUP) {
				this.trackBeacon ();
			}
		}
		
		// protected methods
		internal void trackBeacon() { // nei diagrammi è espresso anche come scanBeacon()
			this.aScanInterval = Time.toTickSpan(Time.MILLISECS, 3 * (this.nSlot+1) * (2^14+1));
			this.mac.radio.startRx(Radio.ASAP|Radio.RX4EVER, 0, Time.currentTicks()+this.aScanInterval);
		}
	}
}

