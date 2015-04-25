using System;

namespace Mac_Layer
{
	public class MacUnassociatedState
	{
	
		public MacUnassociatedState (Mac mac, MacConfig config) : base(mac, config)
		{
		}
		
		public void setNetwork(uint panId, uint saddr){
			this.mac.radio.open (Radio.DID, null, 0, 0);
			this.radio.setPanId(pan, false);
			this.config.panId = pan;
			this.trackBeacon();
		};
		
		public int onRxEvent(uint flags, byte[] data, uint len, uint info, long time){
			
		}
		
		public int onTxEvent(uint flags, byte[] data, uint len, uint info, long time){
			
		}
		
		public int onRadioEvent(uint flags, byte[] data, uint len, uint info, long time){
			
		}
		
		public void onTimerEvent(byte param, long time){
			
		}
	}
}

