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
			mac.scan(0,Mac.MAC_SCAN_ED);
//			mac.createPan(1, 0x0234);			
		}
		
		
		static int onScan(uint flag, byte[] data, int chn, uint len, long time) {
			Logger.appendInt(chn);
			Logger.flush(Mote.INFO);
			if(chn == 10) {
				Logger.appendChar(76);			
				Logger.appendChar(79);		
				Logger.appendChar(71);		
				Logger.flush(Mote.INFO);
				mac.stopScan();
				mac.createPan(chn, 0x0234);
			}
			return 0;
		}
		
	}
}

