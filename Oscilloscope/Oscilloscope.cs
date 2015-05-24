namespace Oscilloscope
{
	using com.ibm.saguaro.system;
	using com.ibm.saguaro.logger;
	using Mac_Layer;
	
	using com.ibm.iris;

	public class Oscilloscope
	{

		static Mac mac;
#if SIM
		static Timer fake;
#else
		static readonly uint MDA100_ADC_CHANNEL_MASK = 0x02;	// Bit associated with the shared ADC
		// channel (channel 1 is shared between
		// temp and light sensor)
		// See ADC class documentation
		// See below
		// Sensors power pins
		internal static readonly byte TEMP_PWR_PIN    = IRIS.PIN_PW0; 	// Temperature sensor power pin
		internal static readonly byte LIGHT_PWR_PIN   = IRIS.PIN_INT5; 	// Temperature sensor power pin (on the doc is INT1 but is not available in com.ibm.iris)  

		// To read sensor values
		static ADC adc ;
		// To power on the sensors
		static GPIO pwrPins;
#endif

		const uint PAYLOAD_SIZE = 3; // 3 bytes flag + 2 bytes data
		
		internal static byte[]	rpdu = new byte[PAYLOAD_SIZE];	// The read PDU 
		
		static long readInterval;	// Read ADC every (Secs)

		// Payload flags
		const byte FLAG_TEMP	= (byte)0x01;	// Flag for temperature data
		const byte FLAG_LIGHT 	= (byte)0x02;	// Flag for light data
	
		

		static Oscilloscope ()
		{	
#if SIM
			fake = new Timer();
			fake.setCallback (new TimerEvent(onFakeTimerEvent));
#else
			//GPIO, power pins
			pwrPins = new GPIO();
			
			//ADC
			adc = new ADC();
			adc.setReadHandler(new DevCallback(adcReadCallback));
			adc.open (/* chmap */ MDA100_ADC_CHANNEL_MASK, /* GPIO power pin*/ GPIO.NO_PIN, /*no warmup*/0, /*no interval*/0);
			
			pwrPins.open(); 
			pwrPins.configureOutput(TEMP_PWR_PIN, GPIO.OUT_SET);  // power on the sensor
			
#endif
			mac = new Mac();
			mac.enable(true);
			mac.setChannel (1);
			mac.setRxHandler (new DevCallback(onRxEvent));
			mac.setTxHandler (new DevCallback(onTxEvent));
			mac.setEventHandler (new DevCallback(onEvent));
			mac.associate(0x0234);

			// convert 2 seconds to the platform ticks
        	readInterval = Time.toTickSpan(Time.SECONDS, 2);
		}
		
#if SIM
		static void onFakeTimerEvent(byte param, long time){
			Util.set16 (rpdu,1,Util.rand16 ());
			mac.send(0x0002, 1, rpdu);
//			Logger.appendString(csr.s2b("Fake data sent"));
//			Logger.flush (Mote.INFO);
			fake.cancelAlarm ();
			fake.setAlarmTime (Time.currentTicks () + readInterval);
		}
#else
		public static int adcReadCallback (uint flags, byte[] data, uint len, uint info, long time) {
			if ( len != 2 || ((flags & Device.FLAG_FAILED) != 0) ) {
				// Can't read sensors
				LED.setState(IRIS.LED_RED,(byte)1);
				return 0;
			} else {
				LED.setState(IRIS.LED_RED,(byte)0);
			}

			Util.copyData(data, 0, rpdu, 1, 2);	// Payload data bytes
			//Transmission  
			mac.send(0x0002, 1, rpdu);
			// Schedule next read
			adc.read(Device.TIMED, 1, Time.currentTicks() + readInterval);
			return 0;
		}
#endif	

		//On transmission blink green led
		public static int onTxEvent (uint flag, byte[] data, uint len, uint info, long time) {
			if (LED.getState (IRIS.LED_GREEN) == 0)
				LED.setState (IRIS.LED_GREEN, (byte)1);
			else
				LED.setState (IRIS.LED_GREEN, (byte)0);
			return 0;
		}
		
		public static int onRxEvent (uint flag, byte[] data, uint len, uint info, long time)
		{
			if (flag == Mac.MAC_DATA_RXED) {
				long interval = Util.get32 (data, 2);
				readInterval = Time.toTickSpan (Time.MILLISECS, interval);
				
//				Logger.appendString(csr.s2b("data = "));
//				for(uint i = 0; i < len; i++)
//					Logger.appendHexByte (data[i]);
//				
//				Logger.appendString(csr.s2b(", readInterval = "));
//				Logger.appendLong(interval);
				
				if (data [0] == FLAG_TEMP) {
					rpdu [0] = FLAG_TEMP;
#if SIM
					
#else
					// Powers ON temperature and ON light sensor
					pwrPins.configureOutput (TEMP_PWR_PIN, GPIO.OUT_SET);
					pwrPins.configureOutput (LIGHT_PWR_PIN, GPIO.OUT_CLR);
#endif
//					Logger.appendString(csr.s2b(", FLAG_TEMP"));
				} else {
					rpdu [0] = FLAG_LIGHT;
#if SIM
					
#else
					// Powers ON light and OFF temperature sensor
					pwrPins.configureOutput (LIGHT_PWR_PIN, GPIO.OUT_SET);
					pwrPins.configureOutput (TEMP_PWR_PIN, GPIO.OUT_CLR);
#endif
//					Logger.appendString(csr.s2b(", FLAG_LIGHT"));
				}
				if ((uint)data [1] == 1) {
#if SIM
					fake.setAlarmBySpan (readInterval);
#else
					adc.open (/* chmap */ MDA100_ADC_CHANNEL_MASK, /* GPIO power pin*/ GPIO.NO_PIN, /*no warmup*/0, /*no interval*/0);
			
					pwrPins.open(); 
					pwrPins.configureOutput(TEMP_PWR_PIN, GPIO.OUT_SET); 
					adc.read(Device.TIMED, 1, Time.currentTicks() + readInterval);
					// Simulation
#endif					
//					Logger.appendString(csr.s2b(", START"));
				} else {
#if SIM
					fake.cancelAlarm ();
#else
					adc.setState (CDev.S_OFF);
					adc.close ();
#endif					
//					Logger.appendString(csr.s2b(", STOP"));
				}
				
//				Logger.flush (Mote.INFO);
				
			} else {
				
			}
			return 0;
		}
		
		public static int onEvent (uint flag, byte[] data, uint len, uint info, long time) {
			switch(flag){
				case Mac.MAC_ASSOCIATED:
//					adc.read(Device.TIMED, 1, Time.currentTicks() + readInterval);
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

