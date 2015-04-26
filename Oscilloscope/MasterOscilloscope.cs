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
		// Fixed MR port for this application.
		const byte MR_APP_PORT   =  126;
		
		static Mac mac;
		
		static MasterOscilloscope ()
		{
			LIP.open (IRIS.DID_UART);
			
			mac = new Mac();
			mac.enable(true);
			mac.createPan(1, 0x0234, 0x0002);		
		}
	}
}

