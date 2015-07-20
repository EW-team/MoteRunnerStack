namespace Oscilloscope
{
	using com.ibm.saguaro.system;
	using com.ibm.saguaro.logger;
	using Mac_Layer;
	
	using com.ibm.iris;
	
	/// <summary>
	/// The class that reads value from sensors and sends them with Mac to MasterOscilloscope.
	/// </summary>
	public class Oscilloscope
	{
		
		/// <summary>
		/// Instance of Mac used to send data.
		/// </summary>
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
		internal static readonly byte TEMP_PWR_PIN = IRIS.PIN_PW0; 	// Temperature sensor power pin
		internal static readonly byte LIGHT_PWR_PIN = IRIS.PIN_INT5; 	// Temperature sensor power pin (on the doc is INT1 but is not available in com.ibm.iris)  

		// To read sensor values
		static ADC adc ;
		// To power on the sensors
		static GPIO pwrPins;
#endif
		
		/// <summary>
		/// Size of data to send MasterOscilloscope.
		/// </summary>
		const uint PAYLOAD_SIZE = 3; // 3 bytes flag + 2 bytes data
		
		internal static byte[]	rpdu = new byte[PAYLOAD_SIZE];	// The read PDU 
		
		/// <summary>
		/// The interval of readings.
		/// </summary>
		static long readInterval;	// Read ADC every (Secs)

		// Payload flags
		
		/// <summary>
		/// Constant flag for temperature readings.
		/// </summary>
		const byte FLAG_TEMP = (byte)0x01;	// Flag for temperature data
		/// <summary>
		/// Constant flag for light readings.
		/// </summary>
		const byte FLAG_LIGHT = (byte)0x02;	// Flag for light data
	
		/// <summary>
		/// Initializes the <see cref="Oscilloscope.Oscilloscope"/> class. Prepares the mac associating to a PAN.
		/// </summary>
		static Oscilloscope ()
		{	

			mac = new Mac ();
			mac.enable (true);
			mac.setChannel (1);
			mac.setRxHandler (new DevCallback (onRxEvent));
			mac.setTxHandler (new DevCallback (onTxEvent));
			mac.setEventHandler (new DevCallback (onEvent));
			mac.associate (0x0234);

			// convert 2 seconds to the platform ticks
			readInterval = Time.toTickSpan (Time.MILLISECS, 500);
			
#if SIM
			fake = new Timer();
			fake.setCallback (new TimerEvent(onFakeTimerEvent));
#else
			//GPIO, power pins
			pwrPins = new GPIO ();
			
			//ADC
			adc = new ADC ();
			adc.setReadHandler (new DevCallback (adcReadCallback));
			adc.open (/* chmap */ MDA100_ADC_CHANNEL_MASK, /* GPIO power pin*/ GPIO.NO_PIN, /*no warmup*/0, /*no interval*/0);
			
			pwrPins.open (); 
			pwrPins.configureOutput (TEMP_PWR_PIN, GPIO.OUT_SET);  // power on the sensor
			
			rpdu [0] = FLAG_TEMP;
			
//			adc.read (Device.TIMED, 1, Time.currentTicks () + readInterval);
			
#endif
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
/// <summary>
/// Method called when adc completes sensor reading.
/// </summary>
/// <returns>
/// The read callback.
/// </returns>
/// </param>
		public static int adcReadCallback (uint flags, byte[] data, uint len, uint info, long time)
		{
//			if (len != 2 || ((flags & Device.FLAG_FAILED) != 0)) {
//				// Can't read sensors
//				LED.setState (IRIS.LED_RED, (byte)1);
//				return 0;
//			} else {
//				LED.setState (IRIS.LED_RED, (byte)0);
//			}

			Util.copyData (data, 0, rpdu, 1, 2);	// Payload data bytes
			//Transmission  
			LED.setState ((byte)2, (byte)1);
			mac.send (0x0002, 1, rpdu);
			// Schedule next read
			adc.read (Device.TIMED, 1, Time.currentTicks () + readInterval);
			return 0;
		}
#endif	

		//On transmission blink green led
		
		/// <summary>
		/// Mac tx event.
		/// </summary>
		/// <returns>
		/// An int with no meaning.
		/// </returns>
		/// <param name='flag'>
		/// Flag that indicates the event.
		/// </param>
		/// <param name='data'>
		/// Data transmitted
		/// </param>
		/// <param name='len'>
		/// Length of data.
		/// </param>
		/// <param name='info'>
		/// Info.
		/// </param>
		/// <param name='time'>
		/// The end of transmission.
		/// </param>
		public static int onTxEvent (uint flag, byte[] data, uint len, uint info, long time)
		{
			return 0;
		}
		
		
		/// <summary>
		/// Mac rx event.
		/// </summary>
		/// <returns>
		/// An int with no meaning.
		/// </returns>
		/// <param name='flag'>
		/// Flag that indicates the event.
		/// </param>
		/// <param name='data'>
		/// Data received.
		/// </param>
		/// <param name='len'>
		/// Length of data.
		/// </param>
		/// <param name='info'>
		/// Info.
		/// </param>
		/// <param name='time'>
		/// The end of reception.
		/// </param>
		public static int onRxEvent (uint flag, byte[] data, uint len, uint info, long time)
		{
			if (flag == Mac.MAC_DATA_RXED && data != null) {
				uint interval = Util.get16le (data, 2);
				readInterval = Time.toTickSpan (Time.MILLISECS, interval);
				
				Logger.appendString (csr.s2b ("Oscilloscope RX Event - "));
				Logger.appendString (csr.s2b ("Interval: "));
				Logger.appendLong (interval);
				Logger.flush (Mote.INFO);
				
				if (data [0] == FLAG_TEMP) {
					rpdu [0] = FLAG_TEMP;
#if SIM
					
#else
					Logger.appendString (csr.s2b (", FLAG_TEMP "));
					// Powers ON temperature and ON light sensor
					pwrPins.configureOutput (TEMP_PWR_PIN, GPIO.OUT_SET);
					pwrPins.configureOutput (LIGHT_PWR_PIN, GPIO.OUT_CLR);
#endif
					
				} else {
					rpdu [0] = FLAG_LIGHT;
#if SIM
					
#else
					// Powers ON light and OFF temperature sensor
					pwrPins.configureOutput (LIGHT_PWR_PIN, GPIO.OUT_SET);
					pwrPins.configureOutput (TEMP_PWR_PIN, GPIO.OUT_CLR);
					Logger.appendString (csr.s2b (", FLAG_LIGHT "));
#endif
				}
				if ((uint)data [1] == 1) {
#if SIM
					fake.setAlarmBySpan (readInterval);
#else				
					if (adc.getState () == CDev.S_CLOSED)
						adc.open (/* chmap */ MDA100_ADC_CHANNEL_MASK, /* GPIO power pin*/ GPIO.NO_PIN, /*no warmup*/0, /*no interval*/0);
					if (pwrPins.getState () == CDev.S_CLOSED)
						pwrPins.open (); 
					pwrPins.configureOutput (TEMP_PWR_PIN, GPIO.OUT_SET); 
					adc.read (Device.TIMED, 1, Time.currentTicks () + readInterval);
					// Simulation
#endif					
				} else {
#if SIM
					fake.cancelAlarm ();
#else
					if (pwrPins.getState () != CDev.S_CLOSED)
						pwrPins.close ();
					if (adc.getState () != CDev.S_CLOSED)
						adc.close ();
//					adc.setState (CDev.S_OFF);
#endif				
				}
				Logger.flush (Mote.INFO);
				
				
			} else {
				Logger.appendString (csr.s2b ("DATA NULL"));
				Logger.flush (Mote.INFO);
			}
			return 0;
		}
		
		/// <summary>
		/// Handles Mac generic events.
		/// </summary>
		/// <returns>
		/// A value with no meaning.
		/// </returns>
		/// <param name='flag'>
		/// Flag that indicates the event.
		/// </param>
		/// <param name='data'>
		/// Data associated to event.
		/// </param>
		/// <param name='len'>
		/// Length of data.
		/// </param>
		/// <param name='info'>
		/// Info.
		/// </param>
		/// <param name='time'>
		/// The time when the event occurred.
		/// </param>
		public static int onEvent (uint flag, byte[] data, uint len, uint info, long time)
		{
			switch (flag) {
			case Mac.MAC_ASSOCIATED:
//					adc.read(Device.TIMED, 1, 	Time.currentTicks() + readInterval);
				break;
			case Mac.MAC_BEACON_RXED:
				
				break;
			default:
				return 0;
			}
			return 0;
		}
		
	}
}

