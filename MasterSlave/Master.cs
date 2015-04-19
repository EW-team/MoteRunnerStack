namespace MasterSlave
{
	using com.ibm.saguaro.system;
	using com.ibm.saguaro.logger;
	
	public class Master
	{
		internal static byte channel = (byte) Radio.std2chnl(1); // channel 11 on IEEE 802.15.4
		internal static uint panid = 0x023E;
		internal static uint slaveSADDR = 0x0C3E;
		internal static uint masterSADDR = 0x303E;
		
		internal static Radio radio = new Radio();
		internal static uint count = 1;
		internal static uint txCount = 0;
		internal static uint txFailedCount = 0;
		internal static uint txLateCount = 0;
		internal static Timer timer = new Timer();
		internal static long span_TICKS = Time.toTickSpan (Time.SECONDS, 1);
		internal static byte[] buf;
		internal static uint numLeds = LED.getNumLEDs();
		
		static Master ()
		{
			// open the radio for sending LED status
            radio.open(Radio.DID,null,0,0);
			radio.setChannel(channel);
			radio.setPanId(panid,true);
			radio.setShortAddr(masterSADDR);
			
			radio.setTxHandler(onTxEvent);
			radio.setRxHandler(onRxEvent);
			
            buf = new byte[14];
            // set up the beacon mesasge
            buf[0] = Radio.FCF_DATA | Radio.FCF_ACKRQ;  // FCF header: data-frame & no-SRCPAN
            buf[1] = Radio.FCA_DST_SADDR | Radio.FCA_SRC_SADDR; // FCA header to use short-addresses
//            Util.set16(buf, 3, RslaveSADDR); // setting the destination pan address to all PANs
			Util.set16(buf, 3, panid); // setting broadcast receiver address
			Util.set16(buf, 5, slaveSADDR);
			Util.set16(buf, 7, radio.getPanId());
			Util.set16(buf, 9,radio.getShortAddr()); // set PAN coordinator address

//			timer.setCallback(onTimerAlarm); // timer callback to transmit and increment the counter
//			timer.setAlarmBySpan(span_TICKS); // programming the timer to raise callback
//			blinkLed();
			radio.transmit(Radio.TIMED|Radio.TXMODE_POWER_MAX, buf, 0, 14, Time.currentTicks() + span_TICKS); // transmit at the specified Time
		}
		
		static int onTxEvent (uint flags, byte[] data, uint len, uint info, long time) {
			if(flags == Radio.FLAG_FAILED) // if the transmission's failed
				txFailedCount ++;
			else if(flags == Radio.FLAG_WASLATE) // if the transmission's late
				txLateCount ++;			
			else // if the transmission's succeeded
			{
				txCount ++;
				radio.transmit(Radio.TIMED|Radio.TXMODE_POWER_MAX, buf, 0, 14, time + span_TICKS); // transmit at the specified Time
			}
			return 0;
		}
		
		static int onRxEvent (uint flags, byte[] data, uint len, uint info, long time) {
			if (flags == Device.FLAG_FAILED) { // reception failed
				Logger.appendUInt(flags);
				Logger.flush(Mote.INFO);
			}	
			else if (data != null) { // received something
				return 0;
			}
			else // end reception or Timed
				timer.setAlarmBySpan(span_TICKS); // reset timer to raise callback again
			return 0;
		}
		
		static void onTimerAlarm(byte param, long time){
			buf[2] = (byte) count; 
			Util.set16(buf, 12, count); // set pdu as counter value: 2 byte
//			radio.transmit(Radio.ASAP, buf, 0, 8, Time.currentTicks() + (span_TICKS >> 1));
			radio.transmit(Radio.TIMED|Radio.TXMODE_POWER_MAX, buf, 0, 14, time + span_TICKS); // transmit at the specified Time
			count += 1;
//			blinkLed();
//			count = count % 10;
			timer.setAlarmTime(time+2*span_TICKS); // reset timer to raise callback again
		}
		
		static void blinkLed() {
			for(int i = 0; i < LED.getNumLEDs(); i++) {
				if(LED.getState((byte)i) == 1)
					LED.setState((byte)i, (byte)0);
				else
					LED.setState((byte)i, (byte)1);
			}
		}
	}
}

