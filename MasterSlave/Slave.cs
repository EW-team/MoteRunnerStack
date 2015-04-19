namespace MasterSlave
{
	using com.ibm.saguaro.system;
	using com.ibm.saguaro.logger;
	
	public class Slave
	{
		internal static byte channel = (byte)1; // channel 11 on IEEE 802.15.4
		internal static uint panid = 0x023E;
		internal static uint slaveSADDR = 0x0C3E;
		internal static uint masterSADDR = 0x303E;
		
		internal static Radio radio = new Radio();
		internal static uint count = 0;
		internal static Timer timer = new Timer();
		internal static long span_TICKS;
		internal static uint numLeds = LED.getNumLEDs();
		internal static long rx_TICKS = Time.toTickSpan (Time.MILLISECS, 100);
		
		static Slave ()
		{
			
			setLeds(); // set all leds off since count is 0
			
			// prepare the radio
			radio.open(Radio.DID,null,0,0);
			radio.setChannel(channel);
			radio.setPanId(panid,false);
			radio.setShortAddr(slaveSADDR);
			
			Logger.appendUInt(panid);
			Logger.flush(Mote.INFO);
			
			radio.setRxHandler(onMessageRx);
			receive(Radio.TIMED|Radio.RXMODE_ED, Time.currentTicks());
		}
		
		static int onMessageRx(uint flags, byte[] data, uint len, uint info, long time) {
			if (flags == Device.FLAG_FAILED) { // reception failed
				Logger.appendUInt(flags);
				Logger.flush(Mote.INFO);
			}	
			else if (data != null) { // received something
				byte[] msg = new byte[2];
				uint i = 12;
				msg[0] = data[i];
				msg[1] = data[i+1];
				Util.get16(msg,count);			
				setLeds();
			}
			Logger.appendByte(data[0]);
			Logger.flush(Mote.INFO);
			Logger.appendUInt(Radio.FLAG_TIMED|Radio.RXMODE_ED);
			Logger.flush(Mote.INFO);
			if (data == null && info != Radio.S_RXTXING)
				receive(Radio.TIMED|Radio.RXMODE_ED, time);
			return 0;
		}
		
		static void receive(uint mode, long time) {
			radio.startRx(mode, time, time+rx_TICKS);
		}
		
		static void setLeds () {
            // set leds
			int num = (int)count;
			int r;
			for (int i = 0; i < numLeds; i++) {
				r = num % 2;
				num -= r*2^i;
				LED.setState((byte)i, (byte)r);
			}
		}
	}
}

