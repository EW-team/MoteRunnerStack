using System;

namespace MasterSlave
{
	using com.ibm.saguaro.system;
	using com.ibm.saguaro.logger;
	
	public class Master
	{
		internal static byte channel = (byte)1; // channel 11 on IEEE 802.15.4
		internal static uint panid = 0x023E;
		internal static uint slaveSADDR = 0x0C3E;
		internal static uint masterSADDR = 0x303E;
		
		internal static Radio radio = new Radio();
		internal static uint count = 0;
		internal static uint txCount = 0;
		internal static uint txFailedCount = 0;
		internal static uint txLateCount = 0;
		internal static Timer timer = new Timer();
		internal static long span_TICKS = Time.toTickSpan (Time.MILLISECS, 200);
		internal static byte[] buf;
		internal static uint numLeds = LED.getNumLEDs();
		
		static Master ()
		{
			
			// open the radio for sending LED status
            radio.open(Radio.DID,null,0,0);
			radio.setChannel(channel);
			radio.setPanId(panid,false);
			radio.setShortAddr(masterSADDR);
			
			radio.setTxHandler(onTxEvent);
            buf = new byte[13];
            // set up the beacon mesasge
            buf[0] = Radio.FCF_DATA;
            buf[1] = Radio.FCA_DST_SADDR | Radio.FCA_SRC_SADDR;
            buf[2] = (byte)(count+1); // sequence number
			Util.set16(buf, 3, panid);
            Util.set16(buf, 5, slaveSADDR);
			Util.set16(buf, 7, panid);
			Util.set16(buf, 9, masterSADDR);

			timer.setCallback(onTimerAlarm);
			timer.setAlarmBySpan(span_TICKS);
		}
		
		static int onTxEvent (uint flags, byte[] data, uint len, uint info, long time) {
			if(flags == Radio.FLAG_FAILED)
				txFailedCount ++;
			else if(flags == Radio.FLAG_WASLATE)
				txLateCount ++;			
			else
				txCount ++;
			return 1;
		}
		
		static void onTimerAlarm(byte param, long time){
			Util.set16 (buf, 11, count);
			Logger.appendUInt(count);
			Logger.flush(Mote.DEBUG);
//			radio.transmit(Radio.ASAP, buf, 0, 8, Time.currentTicks() + (span_TICKS >> 1));
			radio.transmit(Radio.EXACT, buf, 0, 12, Time.currentTicks() + (span_TICKS >> 1));
			count += 1;
			timer.setAlarmBySpan(span_TICKS);
		}
	}
}

