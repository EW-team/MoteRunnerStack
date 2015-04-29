namespace Oscilloscope
{
	using com.ibm.saguaro.system;
	using com.ibm.saguaro.logger;
	using Mac_Layer;

	
	using com.ibm.iris;
	
	public class Oscilloscope
	{

		static Mac mac;
		static Timer timer;


		const uint PAYLOAD_SIZE = 3; // 3 bytes flag + 2 bytes data
		
		internal static byte[]	rpdu = new byte[PAYLOAD_SIZE];	// The read PDU 
		
		
		static long READ_INTERVAL;	// Read ADC every (Secs)

		static readonly uint MDA100_ADC_CHANNEL_MASK = 0x02;	// Bit associated with the shared ADC
		// channel (channel 1 is shared between
		// temp and light sensor)
		// See ADC class documentation
		// See below

		// Payload flags
		const byte FLAG_TEMP	= (byte)0x01;	// Flag for temperature data
		const byte FLAG_LIGHT 	= (byte)0x02;	// Flag for light data
	
		// Sensors power pins
		internal static readonly byte TEMP_PWR_PIN    = IRIS.PIN_PW0; 	// Temperature sensor power pin
		internal static readonly byte LIGHT_PWR_PIN   = IRIS.PIN_INT5; 	// Temperature sensor power pin (on the doc is INT1 but is not available in com.ibm.iris)  
	
		// To read sensor values
		static ADC adc ;
		// To power on the sensors
		static GPIO pwrPins;
		


		static Oscilloscope ()
		{
			timer = new Timer();
			mac = new Mac();
			timer.setCallback (new TimerEvent(onTimeEvent));
			mac.enable(true);
			mac.setRxHandler (new DevCallback(onRxEvent));
			mac.setTxHandler (new DevCallback(onTxEvent));
			mac.setEventHandler (new DevCallback(onEvent));
			mac.associate(0, 0x0234);
		    	
			// convert 2 seconds to the platform ticks
        	READ_INTERVAL = Time.toTickSpan(Time.SECONDS, 2);
	
			//GPIO, power pins
			pwrPins = new GPIO();
			
			pwrPins.open(); 
			pwrPins.configureOutput(TEMP_PWR_PIN, GPIO.OUT_SET);  // power on the sensor
			
			//ADC
			adc = new ADC();
			
			
			adc.open(/* chmap */ MDA100_ADC_CHANNEL_MASK,/* GPIO power pin*/ GPIO.NO_PIN, /*no warmup*/0, /*no interval*/0);
			
			adc.setReadHandler(adcReadCallback);
		}
		
		static int adcReadCallback (uint flags, byte[] data, uint len, uint info, long time)
		{
			if (len != 2 || ((flags & Device.FLAG_FAILED) != 0)) {
				// Can't read sensors
				LED.setState ((byte)2, (byte)1);
				LED.setState ((byte)2, (byte)0);
				LED.setState ((byte)2, (byte)1);
				LED.setState ((byte)2, (byte)0);
				LED.setState ((byte)2, (byte)1);
				LED.setState ((byte)2, (byte)0);
				return 0;
			}
			
//			byte[] dataFlag;
			// We alternate between powering the temperature and the light sensor
			
			if (pwrPins.doPin (GPIO.CTRL_READ, TEMP_PWR_PIN) != 0) {	// Temperature sensor is ON -> temperature read
				rpdu [0] = FLAG_TEMP;
				// Powers ON light and OFF temperature sensor
				pwrPins.configureOutput (LIGHT_PWR_PIN, GPIO.OUT_SET);
				pwrPins.configureOutput (TEMP_PWR_PIN, GPIO.OUT_CLR);
			} else {	// Light read
				
				rpdu [0] = FLAG_LIGHT;
				// Powers ON temperature and ON light sensor
				pwrPins.configureOutput (TEMP_PWR_PIN, GPIO.OUT_SET);
				pwrPins.configureOutput (LIGHT_PWR_PIN, GPIO.OUT_CLR);		
			}

			// Sends data
//			uint flagLength = (uint)dataFlag.Length;
//			Util.copyData(dataFlag, 0, rpdu, 0, flagLength);		// Payload flag bytes, FLAG_TEMP || FLAG_LIGHT
			Util.copyData (data, 0, rpdu, 1, 2);	// Payload data bytes
			//Transmission  
			mac.send (0x0002, 1, rpdu);
			// Schedule next read
			adc.read (Device.TIMED, 1, Time.currentTicks () + READ_INTERVAL);
			return 0;
		}
		
		static void onTimeEvent(byte param, long time) {
			
		}
		//On transmission blink green led
		static int onTxEvent (uint flag, byte[] data, uint len, uint info, long time)
		{
//			for (int i=1; i<=6; i++)
//				LED.setState (IRIS.LED_GREEN, (byte)(i % 2));
			LED.setState ((byte)1, (byte)1);
			LED.setState ((byte)1, (byte)0);
			LED.setState ((byte)1, (byte)1);
			LED.setState ((byte)1, (byte)0);
			LED.setState ((byte)1, (byte)1);
			LED.setState ((byte)1, (byte)0);
			
			return 0;
		}
		
		static int onRxEvent (uint flag, byte[] data, uint len, uint info, long time)
		{
			if (flag == Mac.MAC_BEACON_RXED) {
//				for (int i=1; i<=6; i++)
//					LED.setState (IRIS.LED_YELLOW, (byte)(i % 2));
				if (LED.getState (IRIS.LED_YELLOW) == 0)
					LED.setState (IRIS.LED_YELLOW, (byte)1);
				else
					LED.setState (IRIS.LED_YELLOW, (byte)0);
			} else {
				
			}
			return 0;
		}
		
		static int onEvent (uint flag, byte[] data, uint len, uint info, long time)
		{
			switch (flag) {
			case Mac.MAC_ASSOCIATED:
				LED.setState ((byte)1, (byte)1);
				LED.setState ((byte)1, (byte)0);
				LED.setState ((byte)1, (byte)1);
				LED.setState ((byte)1, (byte)0);
				LED.setState ((byte)1, (byte)1);
				LED.setState ((byte)1, (byte)0);
				adc.read (Device.TIMED, 1, Time.currentTicks () + READ_INTERVAL);
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

