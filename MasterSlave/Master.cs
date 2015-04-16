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
		
		internal static ADC adc = new ADC();
		internal static Radio radio = new Radio();
		internal static uint count = 0;
		internal static uint txCount = 0;
		internal static uint txFailedCount = 0;
		internal static uint txLateCount = 0;
		internal static Timer timer = new Timer();
		internal static long span_TICKS = Time.toTickSpan (Time.MILLISECS, 400);
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
			radio.setRxHandler(onRxEvent);
			
            buf = new byte[11];
            // set up the beacon mesasge
            buf[0] = Radio.FCF_DATA | Radio.FCF_NSPID;  // FCF header: data-frame & no-SRCPAN
            buf[1] = Radio.FCA_DST_SADDR | Radio.FCA_SRC_SADDR; // FCA header to use short-addresses
			buf[2] = 1;  // sequence number
            Util.set16(buf, 3, Radio.PAN_BROADCAST); // setting the destination pan address to all PANs
			Util.set16(buf, 5, slaveSADDR); // setting the destination mote address to slave one
			Util.set16 (buf, 7, masterSADDR); // setting the source address

			timer.setCallback(onTimerAlarm); // timer callback to transmit and increment the counter
			timer.setAlarmBySpan(span_TICKS); // programming the timer to raise callback
			blinkLed();
		}
		
		static int onTxEvent (uint flags, byte[] data, uint len, uint info, long time) {
			if(flags == Radio.FLAG_FAILED) // if the transmission's failed
				txFailedCount ++;
			else if(flags == Radio.FLAG_WASLATE) // if the transmission's late
				txLateCount ++;			
			else // if the transmission's succeeded
			{
				txCount ++;
			}
			return 1;
		}
		
		static int onRxEvent (uint flags, byte[] data, uint len, uint info, long time) {
			if (flags == Device.FLAG_FAILED) { // reception failed
				Logger.appendUInt(flags);
				Logger.flush(Mote.INFO);
			}	
			else if (data != null) { // received something
				return 1;
			}
			else // end reception or Timed
				timer.setAlarmBySpan(span_TICKS); // reset timer to raise callback again
			return 0;
		}
		
		static void onTimerAlarm(byte param, long time){
			Util.set16(buf, 9, count); // set pdu as counter value: 2 byte
//			radio.transmit(Radio.ASAP, buf, 0, 8, Time.currentTicks() + (span_TICKS >> 1));
			radio.transmit(Radio.EXACT, buf, 0, 12, Time.currentTicks() + (span_TICKS)); // transmit at the specified Time
			count += 1;
			blinkLed();
//			count = count % 10;
			timer.setAlarmBySpan(span_TICKS); // reset timer to raise callback again
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

