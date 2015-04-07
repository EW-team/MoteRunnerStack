using System;

namespace mr_test
{
	using com.ibm.saguaro.system;
	using com.ibm.saguaro.lrsc;
	
	public class BlinkCounterWireless
	{
		
		private static Timer txTimer = new Timer();
		private static int counter = 0;
		private static long SPAN_TICKS = Time.toTickSpan (Time.SECONDS, 5 + Util.rand16()%5);
		
		public BlinkCounterWireless ()
		{
			Mac.setRxHandler(onRxCallback); 
			txTimer.setCallback(onTimeCallback);
		}
	
	    public static void onRxCallback (byte port, byte[] paybuf, uint payoff, uint paylen) {
	        // get counter value from paybuf
	        if (paylen > 1)
	        	counter = ((paybuf[payoff] & 0xff) << 8) & paybuf[payoff+1];
	        else
	        	counter = paybuf[payoff];
	        
	        txTimer.setAlarmTime(Time.currentTicks() + SPAN_TICKS);
	    }
		
		public static void onTimeCallback(byte param, long time) {
			counter ++;
		}
	}
}



