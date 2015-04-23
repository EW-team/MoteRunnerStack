namespace Oscilloscope
{
	using com.ibm.saguaro.system;
	using com.ibm.saguaro.logger;
	using Mac_Layer;
	
	using com.ibm.iris;
	
	public class Oscilloscope
	{
		internal static Mac mac;
		
		// Fixed MR port for this application (LIP Protocol)
		const byte MR_APP_PORT   =  126;
		
		static uint PAYLOAD = 9; //see example adc-adxl335
		
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
		
		// Sensors power pins
			internal static readonly byte TEMP_PWR_PIN    = IRIS.PIN_PW0; 	// Temperature sensor power pin
			internal static readonly byte LIGHT_PWR_PIN   = IRIS.PIN_INT5; 	// Temperature sensor power pin (on the doc is INT1 but is not available in com.ibm.iris)  
		
		// To read sensor values
		internal static ADC	adc = new ADC();
		// To power on the sensors
		internal static GPIO pwrPins = new GPIO();
		
		static Oscilloscope ()
		{
			mac = new Mac();
			mac.enable(true);
			mac.setScanHandler(onScan);
			mac.scan(0,Mac.MAC_SCAN_ED);
//			mac.createPan(1, 0x0234);	
			
			
		
				//GPIO
				//pwrPins.open(); 
				//pwrPins.configureOutput(TEMP_PWR_PIN, GPIO.OUT_SET);  // power on the sensor
				//ADC
				//adc.open(/* chmap */ MDA100_ADC_CHANNEL_MASK,/* GPIO power pin*/ GPIO.NO_PIN, /*no warmup*/0, /*no interval*/0);
			    //adc.setReadHandler(adcReadCallback);
				
			 	//invio pacchetto con lettura
			
				//mac.setTxHandler(onTxPdu);
		
		
		
		
				 // Register a method for network message directed to this assembly.
		    	//Assembly.setDataHandler(onLipData);
		    	// Handle system events
		    	//Assembly.setSystemInfoCallback(onSysInfo);
		    	// Open specific fixed LIP port
		    	//LIP.open(MR_APP_PORT);
				
				//ricezione pacchetto con lettura
				//mac.setRxHandler(onRxPdu);
			
				//invio tramite LIP

			
			
			//			mac.setScanHandler(onScan);
						mac.setChannel(1);
			//			mac.scan(0,Mac.MAC_SCAN_ED);
			
			#if MASTER
						mac.createPan(1, 0x0234);
			#endif
			#if SLAVE
						mac.setEventHandler(onMacEvent);
						mac.associate(0x0234);
						byte[] data = new byte[2];
						data[0] = 0xFF;
						data[1] = 0xCA;
						
			#endif
		}
		
		static int onMacEvent(uint flag, byte[] data, uint info, uint len, long time) {
			if (flag == Mac.MAC_ASSOCIATED) {
				mac.transmit(0x0001,1,data);
			}
			return 0;
		}
		
		
		static int onScan(uint flag, byte[] data, int chn, uint len, long time) {
			Logger.appendInt(chn);
			Logger.flush(Mote.INFO);
			if(chn == 10) {
				Logger.appendChar(76);			
				Logger.appendChar(79);		
				Logger.appendChar(71);		
				Logger.flush(Mote.INFO);
				mac.stopScan();
				mac.createPan(chn, 0x0234);
			}
			return 0;
		}
		
		private static int onTxPdu (int flags, byte[] data, int len, int info, long time) {
				LED.setState(IRIS.LED_GREEN, (byte) ~(flags & Device.FLAG_FAILED)); //turn on led if trasmission is successful
			return 0;
		}
		
		private static int onRxPdu (int flags, byte[] data, int len, int info, long time) {
			// Data forwarding
			//byte[] sender = new byte[2];		// Buffer containing the sender address
			
			//Util.copyData(data, SRCADDR, sender, 0, 2);
			//int payloadLen = len - PAYLOAD;
			//byte[] payload = new byte[payloadLen];	// Buffer containing the rest of the message (flag + data)
			//Util.copyData(data, PAYLOAD, payload, 0, payloadLen);
		    //LIP.send(sender, payload,payloadLen);	// Forwards data to the assembly which manages LIP
			return 0;
		}
	
		/// ADC callback
		private static int adcReadCallback(int flags, byte[] data, int len, int info, long time) {
		if ( ((flags & Device.FLAG_FAILED) != 0) /*TODO: set len.. || len != 2*/) {
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
		

		// Schedule next read
		adc.read(Device.TIMED, 1, Time.currentTicks()+Time.toTickSpan(Time.SECONDS,READ_INTERVAL));
		return 0;
	}
		
		
	}
}