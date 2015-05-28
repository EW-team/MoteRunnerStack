namespace Oscilloscope
{
	using com.ibm.saguaro.system;
	using com.ibm.iris;
	using Mac_Layer;
	
	public class OscilloscopeSensor
	{
		static Mac mac;
		
		static OscilloscopeSensor ()
		{
			mac = new Mac ();
			mac.enable (true);
			mac.setRxHandler (new DevCallback (onRxEvent));
			mac.setTxHandler (new DevCallback (onTxEvent));
			mac.setEventHandler (new DevCallback (onEvent));
			mac.associate (14, 0x0234);
		}
		
		//On transmission blink green led
		static int onTxEvent (uint flag, byte[] data, uint len, uint info, long time)
		{
			
			return 0;
		}
		
		static int onRxEvent (uint flag, byte[] data, uint len, uint info, long time)
		{
			
			return 0;
		}
		
		static int onEvent (uint flag, byte[] data, uint len, uint info, long time)
		{
			if (flag == Mac.MAC_ASSOCIATED)
				LED.setState ((byte)1, (byte)1);
			return 0;
		}
	}
}

