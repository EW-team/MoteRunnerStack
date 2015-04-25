using System;
using com.ibm.saguaro.system;

namespace Mac_Layer
{
	internal abstract class MacState
	{
		internal Mac mac;
		internal MacConfig config;
		internal bool duringSuperframe;
//		internal Radio radio;
	
		public MacState (Mac mac, MacConfig config)
		{
			this.mac = mac;
			this.config = config;
//			this.radio = new Radio();
		}
		
		public abstract void setNetwork(uint panId, uint saddr);
		
		public abstract int onRxEvent(uint flags, byte[] data, uint len, uint info, long time);
		
		public abstract int onTxEvent(uint flags, byte[] data, uint len, uint info, long time);
		
		public abstract int onRadioEvent(uint flags, byte[] data, uint len, uint info, long time);
		
		public abstract void onTimerEvent(byte param, long time);
	}
}

