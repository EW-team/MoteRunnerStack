
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
	
	public class Oscilloscope
	{
#if CFG_dust
#define ADC_CLS DNADC
		const uint IPADDR_LEN = 16;
		//VCC power directly from +5V const byte PWR_PIN    = 23;   // DP4 
		const byte ADC_X      =  0;   // ADC channel for X
		const byte ADC_Y      =  1;   // ADC channel for Y
		const byte ADC_Z      =  2;   // ADC channel for Z
#elif CFG_iris
#define ADC_CLS ADC
		const uint IPADDR_LEN = 4;
		const byte PWR_PIN    = IRIS.PIN_E4;
		const byte ADC_X      =  0;   // ADC channel for X
		const byte ADC_Y      =  1;   // ADC channel for Y
		const byte ADC_Z      =  2;   // ADC channel for Z
#elif CFG_waspmote
#define ADC_CLS ADC
		const uint IPADDR_LEN = 4;
		const byte PWR_PIN    = WASPMOTE.PIN_RESERVED;
		const byte ADC_X      =  1;   // ADC channel for X
		const byte ADC_Y      =  2;   // ADC channel for Y
		const byte ADC_Z      =  3;   // ADC channel for Z
#endif
	
		static Mac mac;
		static byte[] data;
		static Timer timer = new Timer();
		
#if CFG_waspmote || CFG_iris
		static GPIO gpio;
#endif
		// Mote Runner ADC device object
		static ADC_CLS adcDev;

		static Oscilloscope ()
		{
			mac = new Mac();
			mac.enable(true);
			timer.setCallback (onTimeEvent);
			mac.setChannel (1);
			mac.setRxHandler (new DevCallback(onRxEvent));
			mac.setTxHandler (new DevCallback(onTxEvent));
			mac.setEventHandler (new DevCallback(onEvent));
			mac.associate(0x0234);
#if CFG_waspmote || CFG_iris
		    gpio = new GPIO();
		    gpio.open();
		    gpio.configureOutput(PWR_PIN,GPIO.OUT_SET); // power on the sensor
#endif
		    
		    // ADC device object
		    uint chmap = (uint)((1<<ADC_X)|(1<<ADC_Y)|(1<<ADC_Z));
		    adcDev = new ADC_CLS();
		    adcDev.open(chmap, GPIO.NO_PIN, /*no warmup*/0, /*no interval*/0);
		    adcDev.setReadHandler(adcReadCallback);
#if CFG_dust // Dust specific ADC controls
	    	adcDev.configure(chmap, /*offset*/0, /*gain*/0, /*period*/1, /*bypassVga*/1);
#endif
		}
		
		static int adcReadCallback (uint flags, byte[] data, uint len, uint info, long time) {
			
		}
		
		public static void onTimeEvent(byte param, long time) {
			
		}
		
		public static int onTxEvent (uint flag, byte[] data, uint info, uint len, long time) {
			
			return 0;
		}
		
		public static int onRxEvent (uint flag, byte[] data, uint info, uint len, long time) {
			if(flag == Mac.MAC_TX_COMPLETE){
//				LIP.
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

