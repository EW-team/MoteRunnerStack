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
		// constant
		const uint rChannel = 0x01; // n. of radio channel
		const uint panId = 0x0022; // id of application PAN
		const uint nFrame = 15; // n. of time slots in superframe
		const uint symRate = 60; // symbol rate
		
		
		// w\lip setup
//		internal static uint lip;
		
		// Timer object used to re-enable management via WLIP
//        internal static Timer timer;
//		internal const byte PORT = 111;
		
		internal static Radio radio = new Radio();
		
		
		// internal static bool sec = false;
//#if COORDINATOR
		// beacon settings
		
		internal static uint rCount = 0; // counter of transmitted slots
		internal static uint bOrder = 8; // beacon order
		internal static uint sOrder = 7; // superframe order
		internal static byte[] beacon = new byte[15]; // beacon header + payload
		internal static uint bSeq = 0; // sequence of beacon
		internal static uint associationPermitted = 1; // permette di far associare nodi al PANc
		internal static uint gtsCount = 0; // GTS allocated counter
		internal static uint gtsEnabled = 0; // GTS allocated counter
		
		internal static long sInterval = Time.toTickSpan(Time.MILLISECS, 3 * (nFrame+1) * 2^sOrder); // 60sym * nSlot * 2^SO / 20kbps [s] = 3 * nSlot * 2^SO [ms]
		internal static long bInterval = Time.toTickSpan(Time.MILLISECS, 3 * (nFrame+1) * 2^bOrder); // Beacon Interval
		
		internal static uint nGTS = 0; // number of Guaranted Time Slotss
		internal static Timer bTimer = new Timer();
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
		
		static void setSuperframeOrder(uint sOrd) {
			if (sOrd <= 15 && sOrd < bOrder) {
				sOrder = sOrd;
				sInterval = Time.toTickSpan(Time.MILLISECS, 3 * (nFrame+1) * 2^sOrder);
			}
			else
				ArgumentException.throwIt(ArgumentException.TOO_BIG);
		}
		
		static void setBeaconOrder(uint bOrd) {
			if (bOrd < 15 && bOrd > sOrder) {
				bOrder = bOrd;
				bInterval = Time.toTickSpan(Time.MILLISECS, 3 * (nFrame+1) * 2^bOrder); 
			}
			else if (bOrd == 15 && bOrd > sOrder) {
				bOrder = bOrd;
				bInterval = 0; // il beacon può essere trasmesso solo su richiesta
			}
			else if (bOrd < sOrder)
				ArgumentException.throwIt(ArgumentException.TOO_SMALL);
			else
				ArgumentException.throwIt(ArgumentException.TOO_BIG);
		}
		
		static void sendBeacon(byte param, long time) {
			rCount = 1;
			Util.set16(beacon, 2, bSeq);  // sequence number
			uint tmp = bOrder << 11 | sOrder << 7 | nFrame << 3 | 1 << 1 | associationPermitted;
			Util.set16(beacon,10,tmp);
			Util.set16(beacon,12,gtsCount<<5|gtsEnabled);
			radio.transmit(Radio.TIMED|Radio.TXMODE_POWER_MAX,beacon,0,15,time+sInterval);
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
				bTimer.setAlarmBySpan(bInterval-sInterval); // si aspetta l'intervallo di beacon per ritrasmettere il beacon
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
			if(rCount < nFrame) {
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

