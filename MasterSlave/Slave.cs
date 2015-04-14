using System;

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
		internal static long rx_TICKS = Time.toTickSpan (Time.MILLISECS, 200);
		
		public Slave ()
		{
			// set all leds off
			setLeds();
			radio.open(Radio.DID,null,0,0);
			radio.setChannel(channel);
			radio.setPanId(panid,true);
			radio.setShortAddr(slaveSADDR);
			
			radio.setRxHandler(onMessageRx);
			radio.startRx(Radio.TIMED, Time.currentTicks() + (rx_TICKS >> 1), Time.currentTicks()+(rx_TICKS));
		}
		
		static int onMessageRx(uint flags, byte[] data, uint len, uint info, long time) {
			if (data != null) {
				byte[] msg = new byte[2];
				uint i = 11;
				msg[0] = data[i];
				msg[1] = data[i+1];
				Util.get16(msg,count);
				Logger.appendUInt(count);
				Logger.flush(Mote.INFO);
				setLeds();
			}
			else
				radio.startRx(Radio.TIMED, Time.currentTicks() + rx_TICKS-(rx_TICKS >> 1),
			              Time.currentTicks()+(rx_TICKS + rx_TICKS >> 1));
			return 1;
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

