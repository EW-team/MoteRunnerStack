namespace Oscilloscope
{
	using com.ibm.saguaro.system;
	using com.ibm.saguaro.logger;
	using Mac_Layer;
	
	public class Oscilloscope
	{
		internal static Mac mac;
		
		static Oscilloscope ()
		{
			mac = new Mac();
			mac.enable(true);
			mac.setScanHandler(onScan);
			mac.scan (0, Mac.MAC_SCAN_ED);			
		}
		
		
		static int onScan(uint flag, byte[] data, int chn, uint len, long time) {
			Logger.appendInt(chn);
			Logger.flush(Mote.INFO);
			if(chn == 27)
				mac.createPan(1, 0x0234);
			return 0;
		}
		
	}
}

