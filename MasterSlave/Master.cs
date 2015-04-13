using System;

namespace MasterSlave
{
	using com.ibm.saguaro.system;
	using com.ibm.saguaro.logger;
	
	public class Master
	{
		internal static Radio radio = new Radio();
		internal static uint count = 0;
		internal static Timer timer = new Timer();
		internal static long span_TICKS = Time.toTickSpan (Time.MILLISECS, 200);
		internal static byte[] buf;
		internal static uint numLeds = LED.getNumLEDs();
		
		static Master ()
		{
			// open the radio for sending LED status
            radio.open(Radio.DID,null,0,0);
            buf = new byte[12];
            // set up the beacon mesasge
            buf[0] = Radio.FCF_BEACON;
            buf[1] = Radio.FCA_DST_SADDR | Radio.FCA_SRC_SADDR;
            buf[2] = (byte)(count+1); // sequence number
//            Util.set16le(buf, 3, Radio.PAN_BROADCAST /*panid*/);
            Util.set16le(buf, 3, Radio.SADDR_BROADCAST /*short address*/);
			Util.set16le (buf, 5, radio.getShortAddr());
			
			Logger.appendLong(span_TICKS);
			Logger.flush(Mote.INFO);
			timer.setCallback(onTimerAlarm);
			timer.setAlarmBySpan(span_TICKS);
		}

		
		static void onTimerAlarm(byte param, long time){
			Util.set16le (buf, 7, count);
			Logger.appendUInt(count);
			Logger.flush(Mote.INFO);
			radio.transmit(Device.EXACT, buf, 0, 8, Time.currentTicks() + (span_TICKS >> 1));
			count += 1;
			timer.setAlarmBySpan(span_TICKS);
		}
	}
}

