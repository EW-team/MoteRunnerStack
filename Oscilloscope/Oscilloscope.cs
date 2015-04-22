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
			mac.setChannel(1);
//			mac.scan(0,Mac.MAC_SCAN_ED);
#if MASTER
			mac.createPan(1, 0x0234);			
#endif
#if SLAVE
//			mac.setEventHandler(onMacEvent);
			mac.associate();
			byte[] data = new byte[2];
			data[0] = 0xFF;
			data[1] = 0xCA;
			mac.transmit(0x0001,1,data);
#endif
		}
		
		static int onMacEvent(uint flag, byte[] data, uint info, uint len, long time) {
//			if (flag == Mac.MAC_ASSOCIATED) {
//				
//			}
			return 0;
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

