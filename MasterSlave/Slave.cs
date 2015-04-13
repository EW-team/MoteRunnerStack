using System;

namespace MasterSlave
{
	using com.ibm.saguaro.system;
	using com.ibm.saguaro.logger;
	
	public class Slave
	{
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
			radio.setRxHandler(onMessageRx);
			radio.startRx(Device.RX4EVER, Time.currentTicks() + (rx_TICKS >> 1), Time.currentTicks()+(rx_TICKS));
		}
		
		static int onMessageRx(uint flags, byte[] data, uint len, uint info, long time) {
			radio.startRx(Device.RX4EVER, Time.currentTicks() + rx_TICKS-(rx_TICKS >> 1),
			              Time.currentTicks()+(rx_TICKS + rx_TICKS >> 1));
			Util.set16(data,7,count);
			setLeds();
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

