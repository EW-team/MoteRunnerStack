namespace Oscilloscope
{
	using com.ibm.saguaro.system;
#if IRIS
	using com.ibm.iris;
#elif AVRRAVEN
	using com.ibm.avrraven;
#elif DUST
	using com.ibm.dust;
#endif
	
#if DEBUG
	using com.ibm.saguaro.logger;
#endif
	
	public class Mac
	{
		internal static Radio radio = new Radio();
		
		// internal static bool sec = false;
#if COORDINATOR
		// beacon settings
		internal static byte[] beacon = new byte[127];
		internal static uint bSeq = 0;
		internal static long bInterval; // Beacon Interval
		internal static long sInterval; // Beacon slot superframe duration
		internal static uint nGTS = 0; // number of Guaranted Time Slotss
#endif
		
		static Mac ()
		{
#if COORDINATOR
			beacon[0] = Radio.FCF_BEACON | Radio.FCF_NSPID;  // FCF header: data-frame & no-SRCPAN
            beacon[1] = Radio.FCA_DST_SADDR | Radio.FCA_SRC_SADDR; // FCA header to use short-addresses
			beacon[2] = bSeq;  // sequence number
            Util.set16(beacon, 3, radio.getPanId()); // setting the destination pan address to all PANs
			Util.set16(beacon, 5, Radio.SADDR_BROADCAST); // setting the destination mote address to slave one
			Util.set16 (beacon, 7, radio.getShortAddr());
#endif
		}
		
		
	}
}

