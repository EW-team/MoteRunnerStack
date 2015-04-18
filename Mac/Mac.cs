using System;

namespace Mac
{
	using com.ibm.saguaro.system;
	
	public delegate int MacCallback(uint flags, byte[] data, uint len, uint info, long time);
		
	public class Mac
	{
		// Consts
		const uint nFrame = 15; // n. of time slots in superframe
		const uint symRate = 60; // symbol rate
		const byte beaconFCF = Radio.FCF_BEACON | Radio.FCF_NSPID;  // FCF header: data-frame & no-SRCPAN
		const byte beaconFCA = Radio.FCA_DST_SADDR | Radio.FCA_SRC_SADDR; // FCA header to use short-addresses
		const byte cmdFCF = Radio.FCF_CMD | Radio.FCF_ACKRQ; // FCF header: CMD + Acq request
		
		const uint MAC_SCAN_ED = Radio.RXMODE_ED;
		const uint MAC_SCAN_PASSIVE = Radio.RXMODE_NORMAL;
		
		
		// Callbacks
		private MacCallback rxHandler;
		private MacCallback txHandler;
		private MacCallback eventHandler;
		
		
		private bool scanContinue = false;
			
		// Radio
		private Radio radio;
		private uint rChannel; // n. of radio channel
		private uint panId; // id of application PAN
		
		public Mac () {
			radio = new Radio();
		}
		
		public void associate(uint channel, uint panId, uint cSaddr) {
			
		}
		
		public void createPan(uint channel, uint panId) {
			
		}
		
		// to define
		public void disassociate( ) {
			
		}
		
		public void enable(bool onOff){
			
		}
		
		public void scan(uint channel, uint mode) {
			if(mode == MAC_SCAN_ED)
				this.scanEd(channel);
			else if(mode == MAC_SCAN_PASSIVE)
				this.scanPassive(channel);
			else
				ArgumentException.throwIt(ArgumentException.ILLEGAL_VALUE);
		}
		
		public int onRxEvent(uint flags, byte[] data, uint len, uint info, long time) {
			
			return 0;
		}
		
		public int onTxEvent(uint flags, byte[] data, uint len, uint info, long time) {
			
			return 0;
		}
		
		public int onEvent(uint flags, byte[] data, uint len, uint info, long time) {
			
			return 0;
		}
		
		public void setTxHandler(MacCallback callback) {
			
		}
		
		public void setRxHandler(MacCallback callback) {
			
		}
		
		public void setEventHandler(MacCallback callback) {
			
		}
		
		public void transmit(uint dstSaddr, byte[] data) {
			
		}
		
		// static methods
		static void setParameters(long cXaddr, uint cSaddr, uint Saddr) {
			
		}
		
		static void stopScan() {
			
		}
		
		// private methods
		private void trackBeacon() { // da definire, nei diagrammi è espresso anche come scanBeacon()
			
		}
		
		private void sendBeacon() {
			
		}
		
		private void scanEd(uint channel) {
			this.scanContinue = true;
			this.radio.open(Radio.DID,null,0,0);
			if(channel == 0) {
				for(int i=1; i <=27 && this.scanContinue; i++){
					this.radio.setChannel((byte)i);
					
				}
			}
			else {
				
			}
		}
		
		private void scanPassive(uint channel) {
			this.scanContinue = true;
			if(channel == 0) {
				for(int i=0; i <=27 && this.scanContinue; i++){
					
				}
			}
			else {
				
			}
			
		}
	}
}

