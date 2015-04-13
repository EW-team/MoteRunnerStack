using System;

namespace mr_test
{
	using com.ibm.saguaro.system;
	
	public class BlinkCounterWireless
	{
		private static Timer txTimer = new Timer();
		private static Radio radio = new Radio();
		private static uint counter = 0;
		private static long SPAN_TICKS = Time.toTickSpan (Time.SECONDS, 1 + Util.rand16()%5);
		private static long LISTEN_TICKS = Time.toTickSpan (Time.MILLISECS, 200);
		
		static BlinkCounterWireless ()
		{
			txTimer.setCallback (onTimeCallback);
			for (int i = 0; i < LED.getNumLEDs(); i++) {
				LED.setState ((byte)i, (byte)0);
			}
			radio.setRxHandler(onRxCallback);
			txTimer.setAlarm (onTimeCallback, Time.currentTicks () + SPAN_TICKS);
		}
		
	    public static int onRxCallback (uint flags, byte[] data, uint len, uint info, long time) {
			if(len > 0 || counter == 0) {
		        counter ++;
		        uint tmp = counter;
				uint r;
				for (uint j = 0; j < LED.getNumLEDs(); j++) {
					r = tmp % 2;
					tmp = tmp - r*2^j;
					LED.setState((byte) r, (byte) j);
				}
				counter = Util.get16(data,0);
				txTimer.setAlarm(onTimeCallback, Time.currentTicks() + SPAN_TICKS);
				return 1;
			}
			else {
				txTimer.setAlarm(onClockWakeUp, Time.currentTicks() + LISTEN_TICKS);
				return 0;
			}
	    }
		
		public static byte[] getDataFrame(byte seqno, uint panid, uint dstaddr, uint srcaddr, uint payload){
			byte[] frame = new byte[11];
			frame[0] = Radio.FCF_DATA | Radio.FCF_ACKRQ | Radio.FCF_NSPID;
			frame[1] = Radio.FCA_SRC_SADDR | Radio.FCA_DST_SADDR;
			frame[2] = seqno;
			Util.set16(frame, 3, panid);
			Util.set16(frame, 5, dstaddr);
			Util.set16(frame, 7, srcaddr);
			Util.set16(frame, 9, payload);
			return frame;
		}
		
		public static void onTimeCallback(byte param, long time) {
			byte[] pkt = getDataFrame(0,Radio.PAN_BROADCAST,Radio.SADDR_BROADCAST,radio.getShortAddr(),counter);
			radio.transmit(Device.ASAP,pkt,10,12,0);
			radio.startRx(Device.ASAP,0, Time.currentTicks() + LISTEN_TICKS);
			txTimer.setAlarm(onClockWakeUp, Time.currentTicks() + LISTEN_TICKS);
		}
		
		public static void onClockWakeUp(byte param, long time) {
			radio.startRx(Device.ASAP,0, Time.currentTicks() + LISTEN_TICKS);	
		}
	}
}



