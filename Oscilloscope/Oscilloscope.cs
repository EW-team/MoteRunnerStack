namespace Oscilloscope
{
	using com.ibm.saguaro.system;
	using com.ibm.saguaro.logger;
	using Mac_Layer;

	#if CFG_iris
		using com.ibm.iris;
	#endif

	public class Oscilloscope
	{

		static Mac mac;
		static byte[] data;
		static Timer timer = new Timer();

		static uint PAYLOAD = 9;

		const uint PAYLOAD_SIZE = 5; // 3 bytes flag + 2 bytes data

		static readonly int READ_INTERVAL = 2;	// Read ADC every (Secs)

		static readonly int MDA100_ADC_CHANNEL_MASK = 0x02;	// Bit associated with the shared ADC
		// channel (channel 1 is shared between
		// temp and light sensor)
		// See ADC class documentation
		// See below

		// Payload flags
		internal static readonly byte[] FLAG_TEMP	 = csr.s2b("TMP");	// Flag for temperature data
		internal static readonly byte[] FLAG_LIGHT	 = csr.s2b("LGT");	// Flag for light data
		#if CFG_iris
		// Sensors power pins
		internal static readonly byte TEMP_PWR_PIN    = IRIS.PIN_PW0; 	// Temperature sensor power pin
		internal static readonly byte LIGHT_PWR_PIN   = IRIS.PIN_INT5; 	// Temperature sensor power pin (on the doc is INT1 but is not available in com.ibm.iris)  
		#endif
		// To read sensor values
		internal static ADC	adc = new ADC();
		// To power on the sensors
		internal static GPIO pwrPins = new GPIO();
		


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
		    
			#if CFG_iris
				//GPIO, power pins
				pwrPins.open(); 
				pwrPins.configureOutput(TEMP_PWR_PIN, GPIO.OUT_SET);  // power on the sensor
				//ADC
				adc.open(/* chmap */ MDA100_ADC_CHANNEL_MASK,/* GPIO power pin*/ GPIO.NO_PIN, /*no warmup*/0, /*no interval*/0);
				adc.setReadHandler(adcReadCallback);
			#endif
		}
		
		static int adcReadCallback (uint flags, byte[] data, uint len, uint info, long time) {
			if ( len != 2 || ((flags & Device.FLAG_FAILED) != 0) ) {
				// Can't read sensors
				LED.setState(IRIS.LED_RED,(byte)1);
				return 0;
			}
			int dataOffset;
			byte[] dataFlag;
			// We alternate between powering the temperature and the light sensor
			// Temperature values are at offset 0.
			// Light values are at offset 2.
			if (pwrPins.doPin(GPIO.CTRL_READ,TEMP_PWR_PIN) != 0) {	// Temperature sensor is ON -> temperature read
				dataOffset = 0;
				dataFlag = FLAG_TEMP;
				// Powers ON light and OFF temperature sensor
				pwrPins.configureOutput(LIGHT_PWR_PIN,GPIO.OUT_SET);
				pwrPins.configureOutput(TEMP_PWR_PIN,GPIO.OUT_CLR);
			}
			else {	// Light read
				dataOffset = 2;
				dataFlag = FLAG_LIGHT;
				// Powers ON temperature and ON light sensor
				pwrPins.configureOutput(TEMP_PWR_PIN,GPIO.OUT_SET);
				pwrPins.configureOutput(LIGHT_PWR_PIN,GPIO.OUT_CLR);		
			}

			// Sends data
			uint flagLength = (uint)dataFlag.Length;
			Util.copyData((object)dataFlag, 0, (object)data, PAYLOAD, flagLength);		// Payload flag bytes, FLAG_TEMP || FLAG_LIGHT
			Util.copyData((object)data, 0, (object)data, PAYLOAD+flagLength, 2);	// Payload data bytes
			//Transmission  
			mac.transmit(0x0002, 1, data);

			// Schedule next read
			adc.read(Device.TIMED, 1, Time.currentTicks()+Time.toTickSpan(Time.SECONDS,READ_INTERVAL));
			return 0;
		}
		
		public static void onTimeEvent(byte param, long time) {
			
		}
		//On transmission blink green led
		public static int onTxEvent (uint flag, byte[] data, uint len, uint info, long time) {
			LED.setState(IRIS.LED_GREEN, (byte) ~(flag & Device.FLAG_FAILED));
			return 0;
		}
		
		public static int onRxEvent (uint flag, byte[] data, uint len, uint info, long time) {
			if(flag == Mac.MAC_TX_COMPLETE){
//				LIP.
			}
			return 0;
		}
		
		public static int onEvent (uint flag, byte[] data, uint len, uint info, long time) {
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

