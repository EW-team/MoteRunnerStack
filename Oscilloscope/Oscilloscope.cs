using com.ibm.iris;
using System.Reflection;

namespace Oscilloscope
{
	using com.ibm.saguaro.system;
	using com.ibm.saguaro.logger;
	using Mac_Layer;
	
	public class Oscilloscope
	{
		static Mac mac;
#if !MASTER
		static Timer timer = new Timer();
#endif
		static Oscilloscope ()
		{
			mac = new Mac();
			mac.enable(true);
//			mac.setScanHandler(new MacScanCallback(Oscilloscope.onScan));
//			mac.scan(4,Mac.MAC_SCAN_PASSIVE);
#if MASTER
			LIP.open (IRIS.DID_UART);
			mac.createPan(1, 0x0234, 0x0002);
#else
			timer.setCallback (onTimeEvent);
			mac.setChannel (1);
			mac.setRxHandler (new DevCallback(onRxEvent));
			mac.setTxHandler (new DevCallback(onTxEvent));
			mac.setEventHandler (new DevCallback(onEvent));
			mac.associate(0x0234);
#endif
		}
		
		public static void onTimeEvent(byte param, long time) {
			
		}
		
		public static int onTxEvent (uint flag, byte[] data, uint info, uint len, long time) {
			
			return 0;
		}
		
		public static int onRxEvent (uint flag, byte[] data, uint info, uint len, long time) {
#if MASTER
			
#endif
			if(flag == Mac.MAC_TX_COMPLETE){
				LIP.
			}
			return 0;
		}
		
		public static int onEvent (uint flag, byte[] data, uint info, uint len, long time) {
			switch(flag){
				case Mac.MAC_ASSOCIATED:
					byte[] pdu = new byte[4];
					Util.set16 (pdu,0,111);
					mac.transmit (0x0002, 1, pdu);
					break;
				default:
					return 0;
			}
			return 0;
		}
		
//		public static int onScan(uint flag, byte[] data, int chn, uint len, long time) {
//			Logger.appendInt(chn);
//			Logger.flush(Mote.INFO);
//			if(chn == 27)
//				mac.createPan(1, 0x0234, 0x0002);
//			return 0;
//		}
		
	}
}

