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
		const uint panId = 0x0022;
		
		// internal static bool sec = false;
//#if COORDINATOR
		// beacon settings
		const uint nFrame = 16;
		internal static uint rCount = 0;
		
		internal static byte[] beacon = new byte[32];
		internal static uint bSeq = 0;
		
		internal static long sInterval = Time.toTickSpan(Time.MILLISECS, 384); // Beacon slot superframe duration
		internal static long bInterval = 2 * nFrame * sInterval; // Beacon Interval
		
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
            Util.set16(beacon, 4, Radio.SADDR_BROADCAST); // setting broadcast receiver address
			Util.set16(beacon, 6,radio.getShortAddr()); // set PAN coordinator address
			
			radio.setTxHandler(onTxEvent);
			radio.setRxHandler(onRxEvent);
			radio.setEventHandler(onRadioEvent);
			
			bTimer.setCallback(sendBeacon);			
			bTimer.setAlarmBySpan(sInterval);
//#endif
		}
		
		static void setBeaconInterval(long bInt) {
			if (bInt < nFrame * sInterval)
				bInterval = bInt;
			else
				ArgumentException.throwIt(ArgumentException.TOO_SMALL);
		}
		
		static void sendBeacon(byte param, long time) {
			rCount = 1;
			Util.set16(beacon, 2, bSeq);  // sequence number
			radio.transmit(Radio.TIMED|Radio.TXMODE_POWER_MAX,beacon,0,32,time+sInterval);
			bSeq += 1;
		}
		
		static int onTxEvent (uint flags, byte[] data, uint len, uint info, long time) {
			if(flags == Radio.FLAG_FAILED) { // if the transmission's failed
				Logger.appendUInt(Radio.FLAG_FAILED);
				Logger.flush(Mote.INFO);
				return 0;
			}
			else if(flags == Radio.FLAG_WASLATE) { // if the transmission's late
				Logger.appendUInt(Radio.FLAG_WASLATE);
				Logger.flush(Mote.INFO);
				return 0;
			}
			else { // if the transmission's succeeded
//				bTimer.cancelAlarm();
				bTimer.setAlarmBySpan(bInterval); // si aspetta l'intervallo di beacon per ritrasmettere il beacon
				radio.startRx(Radio.ASAP|Radio.RXMODE_NORMAL,time, time + sInterval);
				rCount ++;
				return 0;
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
			if(rCount < 16) {
				radio.startRx(Radio.ASAP|Radio.RXMODE_NORMAL,time, time + sInterval);
				rCount ++;
			}
			return 0;
		}
		
		static int onRadioEvent (uint flags, byte[] data, uint len, uint info, long time) {
			Logger.appendUInt(flags);
			Logger.flush(Mote.INFO);
			return 0;
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

