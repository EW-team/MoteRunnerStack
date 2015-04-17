namespace Oscilloscope
{
	using com.ibm.saguaro.system;
//#if IRIS
//	using com.ibm.iris;
//#elif AVRRAVEN
//	using com.ibm.avrraven;
//#elif DUST
//	using com.ibm.dust;
//#endif
	
#if DEBUG
	using com.ibm.saguaro.logger;
#endif
	
	public class Mac
	{
		
		// w\lip setup
//		internal static uint lip;
		
		// Timer object used to re-enable management via WLIP
//        internal static Timer timer;
//		internal const byte PORT = 111;
		
		internal static Radio radio = new Radio();
		const uint rChannel = 0x01;
		const uint panId = 0x010D;
		
		// internal static bool sec = false;
//#if COORDINATOR
		// beacon settings
		const uint nFrame = 16;
		internal static byte[] beacon = new byte[127];
		internal static uint bSeq = 0;
		
		internal static long sInterval = Time.toTickSpan(Time.MILLISECS, 384); // Beacon slot superframe duration
		internal static long bInterval = nFrame * sInterval; // Beacon Interval
		
		internal static uint nGTS = 0; // number of Guaranted Time Slotss
		internal static Timer bTimer = new Timer();
		internal static Timer sTimer = new Timer(); // sleep timer
//#endif
		
		static Mac ()
		{
			// MANAGEMENT LIP SETUP
			// Register for system events
//	    	Assembly.setSystemInfoCallback(onSysEvent);
            // open a LIP port and register callback
//	    	Assembly.setDataHandler(onLIPEvent);
//	    	LIP.open(PORT);
			
//#if COORDINATOR
			
			radio.open(Radio.DID,null,0,0); // ricordare di chiudere la radio quando termina il beacon interval
			radio.setPanId(panId,true);
			radio.setChannel((byte)rChannel);
			
			beacon[0] = Radio.FCF_BEACON | Radio.FCF_NSPID;  // FCF header: data-frame & no-SRCPAN
            beacon[1] = Radio.FCA_DST_SADDR | Radio.FCA_SRC_SADDR; // FCA header to use short-addresses
			Util.set16(beacon, 2, bSeq);  // sequence number
            Util.set16(beacon, 4, radio.getPanId()); // setting the destination pan address to all PANs
			Util.set16(beacon, 6, Radio.SADDR_BROADCAST); // setting the destination mote address to slave one
			Util.set16 (beacon, 8, radio.getShortAddr());
			
			radio.setTxHandler(onTxEvent);
			radio.setRxHandler(onRxEvent);
			
			bTimer.setCallback(sendBeacon);
			sTimer.setCallback(endSuperframe);
			
			bTimer.setAlarmBySpan(sInterval);
			sTimer.setAlarmBySpan(16*sInterval);
//#endif
		}
		
		static void setBeaconInterval(long bInt) {
			if (bInt < nFrame * sInterval)
				bInterval = bInt;
			else
				ArgumentException.throwIt(ArgumentException.TOO_SMALL);
		}
		
		static void sendBeacon(byte param, long time) {
			radio.transmit(Radio.TIMED,beacon,0,127,Time.currentTicks()+sInterval);
			bSeq += 1;
		}
		
		static void endSuperframe(byte param, long time) {
			bTimer.cancelAlarm();
			radio.stopRx();
			bTimer.setAlarmBySpan(bInterval); // si aspetta l'intervallo di beacon per ritrasmettere il beacon
		}
		
		static int onTxEvent (uint flags, byte[] data, uint len, uint info, long time) {
			if(flags == Radio.FLAG_FAILED) { // if the transmission's failed
				Logger.appendUInt(Radio.FLAG_FAILED);
				Logger.flush(Mote.INFO);
				return (int)Radio.FLAG_FAILED;
			}
			else if(flags == Radio.FLAG_WASLATE) { // if the transmission's late
				Logger.appendUInt(Radio.FLAG_WASLATE);
				Logger.flush(Mote.INFO);
				return (int)Radio.FLAG_WASLATE;
			}
			else { // if the transmission's succeeded
				
				radio.startRx(Radio.TIMED,time, time + sInterval);
				return -1;
			}
		}
		
		static int onRxEvent (uint flags, byte[] data, uint len, uint info, long time) {
			if (data != null) {
				if( LED.getState((byte)0) == 0)
					LED.setState((byte)0, (byte)1);
				else
					LED.setState((byte)0, (byte)0);
				return 0;
			}
			if(flags == Radio.FLAG_TIMED || data == null)
				radio.startRx(Radio.TIMED,time, time + sInterval);
			return -1;
		}
		
		
		
		// procedures to handle LIP in MAC LAYER
//		internal static int onSysEvent(int type, int info){
//			
//			return 0;
//		}
//		
//		internal static int onLIPEvent(uint flags, byte[] data, uint len){
//			return -1;
//		}
	}
}

