#if CFG_dust
    using com.ibm.dust;
#elif CFG_iris
    using com.ibm.iris;
#elif CFG_waspmote
    using com.ibm.waspmote;
#else

#endif

namespace Oscilloscope
{
	using com.ibm.saguaro.system;
	using com.ibm.saguaro.logger;
	using Mac_Layer;
	
	public class MasterOscilloscope
	{
#if CFG_dust
		const uint IPADDR_LEN = 16;
		const byte ALARM_PIN  = 21;
#elif CFG_iris
		const uint IPADDR_LEN = 4;
		const byte PWR_PIN    = IRIS.PIN_PW1;
		const byte ALARM_PIN  = IRIS.PIN_E4;
#elif CFG_waspmote
		const uint IPADDR_LEN = 4;
		const byte PWR_PIN    = WASPMOTE.PIN_DIGITAL1;
		const byte ALARM_PIN  = WASPMOTE.PIN_RESERVED;
#else
		const uint IPADDR_LEN = 4;
#endif
		// Fixed MR port for this application.
		const byte MR_APP_PORT   =  126;
		// Fixed service receiver port
		const uint UDP_SRV_PORT  =  2123;
		// Payload const positions
		const uint ROFF_UDP_PORT = IPADDR_LEN;
		const uint ROFF_MR_PORT  = ROFF_UDP_PORT+2;
		const uint ROFF_MSG_TAG  = ROFF_UDP_PORT+3;
		const uint ROFF_TIME     = ROFF_UDP_PORT+4;
		const uint ROFF_SADDR  	 = ROFF_TIME+4;
		const uint ROFF_PAYLOAD  = ROFF_SADDR+2;
		
		// Payload flags
		const byte FLAG_NO_DATA  = (byte)0x00;
		const byte FLAG_TEMP	 = (byte)0x01;	// Flag for temperature data
		const byte FLAG_LIGHT	 = (byte)0x02;	// Flag for light data
		
		
		static byte[] header;
		
		const uint headerLength = ROFF_SADDR+2;
		
		static Mac mac;
		
		static MasterOscilloscope ()
		{			
//			// Register a method for network message directed to this assembly.
			Assembly.setDataHandler (onLipData);
		    // Handle system events
			Assembly.setSystemInfoCallback (new SystemInfo (onSysInfo));
			// Open specific fixed LIP port
			LIP.open (MR_APP_PORT);
	    	
			header = new byte[headerLength];
#if CFG_dust
		    DN.setIpv6AllRoutersMulticast(header, 0);
#else
			Util.set32 (header, 0, (192 << 24) | (168 << 16) | (0 << 8) | (1 << 0));		
#endif
			Util.set16 (header, ROFF_UDP_PORT, UDP_SRV_PORT);
			header [ROFF_MR_PORT] = MR_APP_PORT;
			
			mac = new Mac ();
			mac.enable (true);
			mac.setRxHandler (new DevCallback (onRxEvent));
			mac.setTxHandler (new DevCallback (onTxEvent));
			mac.setEventHandler (new DevCallback (onEvent));
			mac.setChannel (1);
			mac.createPan (0x0234, 0x0002);
			
			byte[] cmd = new byte[7];
			cmd [0] = FLAG_TEMP;
			cmd [1] = (byte)1;
			Util.set32 (cmd, 2, 500); // dal quarto al settimo byte l'intervallo di lettura
			mac.send (0x0100, Util.rand8 (), cmd);
		}
		
		public static int onTxEvent (uint flag, byte[] data, uint len, uint saddr, long time) {
			
			return 0;
		}
		
		
		public static int onRxEvent (uint flag, byte[] data, uint len, uint saddr, long time)
		{
			if (flag == Mac.MAC_DATA_RXED) {
				if (data == null)
					header [ROFF_MSG_TAG] = (byte)FLAG_NO_DATA;
				else
					header [ROFF_MSG_TAG] = data [0];
				Util.set32 (header, ROFF_TIME, time);

				Util.set16 (header, ROFF_SADDR, saddr); // 0 if XADDR	
				
				LIP.send (header, headerLength, data, 1, (uint)data.Length);
			}
			blink (2);
			
			return 0;
		}
		
		public static int onEvent (uint flag, byte[] data, uint len, uint saddr, long time) {
			
			return 0;
		}
		
		internal static void blink(uint led)
		{
			if(LED.getState ((byte)led) == 0)
				LED.setState ((byte)led,(byte)1);
			else
				LED.setState ((byte)led,(byte)0);
		}
		
		static int onSysInfo (int type, int info)
		{
			if (type == Assembly.SYSEV_DELETED) {
				try {
					LIP.close (MR_APP_PORT);
				} catch {
				}
			}
			if (type == Assembly.SYSEV_ISUP) {
				// Initialize device from last persistent state
			}
			return 0;
		}
		
		static int onLipData (uint info, byte[] buf, uint len)
		{
			blink (2);
			uint cmdoff = LIP.getPortOff () + 1;
			if (cmdoff >= len)
				return 0;
			else if (len - cmdoff > 6 && buf [cmdoff] == (byte)1) { // primo byte a 1 indica il comando
				blink (2);
				byte[] cmd = new byte[6];
				if ((short)buf [cmdoff + 1] == 1) { // secondo byte attivazione/disattivazione
					if ((short)buf [cmdoff + 2] == 1) // terzo byta tipo di lettura
						cmd [0] = FLAG_TEMP;
					else
						cmd [0] = FLAG_LIGHT;
					cmd [1] = (byte)1;
				} else
					cmd [1] = (byte)0;
				Util.copyData (buf, cmdoff + 3, cmd, 2, 4); // dal quarto al settimo byte l'intervallo di lettura
				mac.send (0x0100, Util.rand8 (), cmd);
			}
			
			Util.set32 (header, ROFF_TIME, Time.currentTicks ());
			Util.copyData (buf, 0, header, 0, headerLength);
			return (int)headerLength + 2;
		}
		
	}
}

