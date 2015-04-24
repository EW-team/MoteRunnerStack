using System;

namespace Oscilloscope
{
	using com.ibm.saguaro.system;
	using com.ibm.saguaro.logger;
	using Mac_Layer;
	
	public class Oscilloscope
	{
		static Mac mac;

		static Oscilloscope ()
		{
			mac = new Mac();
			mac.enable(true);
			mac.setScanHandler(new MacScanCallback(Oscilloscope.onScan));
//			mac.scan(4,Mac.MAC_SCAN_PASSIVE);
			mac.createPan(1, 0x0234, 0x0002);
		}
		
		
		public static int onScan(uint flag, byte[] data, int chn, uint len, long time) {
			Logger.appendInt(chn);
			Logger.flush(Mote.INFO);
			if(chn == 27)
				mac.createPan(1, 0x0234, 0x0002);
			return 0;
		}
		
	}
}

