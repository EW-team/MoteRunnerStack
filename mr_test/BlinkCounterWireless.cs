using System;

namespace mr_test
{
	using com.ibm.saguaro.system;
	using com.ibm.saguaro.lrsc;
	 
	public class BlinkCounterWireless
	{
		private static Timer txTimer = new Timer();
		private static uint counter = 0;
		private static uint joinedCounter = 0;
		private static uint joiningCounter = 0;
		private static uint defaultCounter = 0;
		private const byte APP_PORT = 10;
		private static byte[] dbuf;
		private static long SPAN_TICKS = Time.toTickSpan (Time.SECONDS, 1 + Util.rand16()%5);
		private static long JOIN_TICKS = Time.toTickSpan (Time.MILLISECS, 500);
		
		static BlinkCounterWireless ()
		{
			txTimer.setCallback (onTimeCallback);
			dbuf = new byte[2];
			for (int i = 0; i < LED.getNumLEDs(); i++) {
				LED.setState ((byte)i, (byte)0);
			}
			Mac.setRxHandler (onRxCallback);
			Mac.setEvHandler (onMacEvent);
			Mac.join ();
			txTimer.setAlarm (onTimeCallback, Time.currentTicks () + SPAN_TICKS);
		}
	
		public static void onMacEvent (uint type, uint para0)
		{
			switch (type) {
			case Mac.EV_JOINED:
				joinedCounter ++;
				txTimer.setAlarm (onTimeCallback, Time.currentTicks () + SPAN_TICKS);
				break;
			case Mac.EV_JOINING:
				joiningCounter ++;
				Mac.sendAlive ();
				break;
			default:
				defaultCounter ++;
				txTimer.setAlarm (onTimeJoin, Time.currentTicks () + JOIN_TICKS);
				break;
			}
		}
		
		private static void onTimeJoin (byte param, long time)
		{
			Mac.join ();
		}
		
	    public static void onRxCallback (byte port, byte[] paybuf, uint payoff, uint paylen) {
	        // get counter value from paybuf
	        if (paylen > 1)
	        	counter = Util.get16(paybuf, payoff) % LED.getNumLEDs();
	        else
	        	counter = (uint)paybuf[payoff] % LED.getNumLEDs();
	        
	        uint tmp = counter;
			uint r;
			for (uint i = 0; i < LED.getNumLEDs(); i++) {
				r = tmp % 2;
				tmp = tmp - r*2^i;
				LED.setState((byte) r, (byte) i);	
			}
			
			txTimer.setAlarm(onTimeCallback, Time.currentTicks() + SPAN_TICKS);
	    }
		
		public static void onTimeCallback(byte param, long time) {
			counter ++;
			Util.set16(dbuf,0,counter);
			Mac.setTxData(false,APP_PORT,dbuf,0,2);
		}
	}
}



