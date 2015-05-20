using com.ibm.saguaro.system;
using com.ibm.saguaro.logger;
using System;
using Mac_Layer;

namespace Mac_Layer
{
	
	internal class MacUnassociatedState : MacState
	{
		
		private const uint S_ASS_REQ = 1;
		private const uint S_DATA_REQ = 2;
		
		public uint coordinatorSADDR;
		public uint panId;
	
		public MacUnassociatedState (Mac mac, uint id) : base(mac)
		{	
			this.panId = id;
			this.saddr = this.mac.radio.getShortAddr ();
			this.mac.radio.setPanId (this.panId, false);
			this.mac.timer1.setParam (Mac.MAC_WAKEUP);
			this.mac.timer1.setAlarmTime (Time.currentTicks ());
		}
		
//		public override void setNetwork(uint panId, uint saddr){
//			this.mac.radio.setPanId(panId, false);
//			this.panId = panId;
//			this.trackBeacon();
//		}
	
		public override void dispose ()
		{
			
		}
		
		public override int onRxEvent (uint flags, byte[] data, uint len, uint info, long time)
		{
			uint modeFlag = flags & Device.FLAG_MODE_MASK;
			if (modeFlag == Radio.FLAG_ASAP || modeFlag == Radio.FLAG_EXACT || modeFlag == Radio.FLAG_TIMED) {
				if (data != null) {
					uint pos = Frame.getPayloadPosition (data);
					switch (data [0] & FRAME_TYPE_MASK) {
					case Radio.FCF_BEACON:
						this.mac.timer1.cancelAlarm ();
//						blink (2);
						this.duringSuperframe = true;
						Frame.getBeaconInfo (data, this);
						this.mac.timer1.setParam (Mac.MAC_SLOT);
						this.slotCount = 2;
						this.mac.timer1.setAlarmTime (time + this.slotInterval);
						this.mac.eventHandler (Mac.MAC_BEACON_RXED, data, len, info, time);
						this.resp = Frame.getCMDAssReqFrame (this.mac.radio.getPanId (), 
													this.coordinatorSADDR, this);
						break;
					case Radio.FCF_CMD:
						switch ((uint)data [pos]) {
						case ASS_RES: // association response handle - not coordinator
							switch ((uint)data [pos + 3]) {
							case ASS_SUCC: // association successful
								this.mac.radio.setShortAddr (Util.get16 (data, pos + 1)); // The SAddr have to be setted when radio is not on!
								this.mac.onStateEvent (Mac.MAC_ASSOCIATED, this.coordinatorSADDR);
								break;
							case ASS_FAIL: // association failed
														//TODO
								break;
							}
							break;
						}
						break;
					case Radio.FCF_DATA:
						if ((len - pos) > 0) {
							byte[] pdu = new byte[len - pos];
							Util.copyData (data, len, pdu, 0, len - pos);
							this.mac.rxHandler (Mac.MAC_DATA_RXED, pdu, len - pos, 
								                    Frame.getSrcSADDR (data), time);
						} else
							this.mac.rxHandler (Mac.MAC_DATA_RXED, null, 0, 
								                    Frame.getSrcSADDR (data), time);
									//TODO
						break;
					case Radio.FCF_ACK:
						switch (this.state) {
						case S_ASS_REQ:
							this.resp = null;
							break;
						case S_DATA_REQ:
							break;
						}
						break;
					}
				}
			} else if (modeFlag == Radio.FLAG_FAILED || modeFlag == Radio.FLAG_WASLATE) {
				blink (1);
//				Logger.appendString(csr.s2b("Rx Error"));
//				Logger.flush(Mote.INFO);
			} else {
//				Logger.appendString(csr.s2b("Rx what else?"));
//				Logger.flush(Mote.INFO);
			}
			return 0;
		}
		
		public override int onTxEvent (uint flags, byte[] data, uint len, uint info, long time)
		{
			uint modeFlag = flags & Device.FLAG_MODE_MASK;		
			uint pos = Frame.getPayloadPosition (data);
			if (modeFlag == Radio.FLAG_ASAP || modeFlag == Radio.FLAG_EXACT || modeFlag == Radio.FLAG_TIMED) {
				switch (data [0] & FRAME_TYPE_MASK) {
				case Radio.FCF_CMD:
					if (data [pos] == ASS_REQ) { // association request - not coordinator
						this.mac.txHandler (Mac.MAC_ASS_REQ, data, len, info, time);
						this.state = S_ASS_REQ;
						this.resp = null;
					} else if (data [pos] == DATA_REQ) { // data request - not coordinator
						this.state = S_DATA_REQ;
					}
					break;
				case Radio.FCF_ACK:
					break;
				}
			} else if (modeFlag == Radio.FLAG_FAILED || modeFlag == Radio.FLAG_WASLATE) {
				blink (1);
			} else {

			}
			return 0;
		}
		
		public override int onRadioEvent (uint flags, byte[] data, uint len, uint info, long time)
		{
			blink (0);
			//TODO
			return 0;
		}
		
		public override void onTimerEvent (byte param, long time)
		{
			switch (param) {
			case Mac.MAC_SLEEP:
//				blink (2);
				this.duringSuperframe = false;
				this.mac.radio.stopRx ();
				this.mac.radio.setState (Radio.S_STDBY);
				this.mac.timer1.setParam (Mac.MAC_WAKEUP);
				this.mac.timer1.setAlarmTime (time + this.beaconInterval - (this.nSlot + 1) * this.slotInterval);
				break;
			case Mac.MAC_WAKEUP:
//				blink (1);
				this.trackBeacon (time);
//				this.slotCount = 2;
				this.mac.timer1.setParam (Mac.MAC_WAKEUP);
				this.mac.timer1.setAlarmTime (time + this.aScanInterval + this.slotInterval);
				break;
			case Mac.MAC_SLOT:
//				blink (0);
				this.mac.timer1.setAlarmTime (time + this.slotInterval + this.interSlotInterval);
				this.slotCount += 1;
				if (this.slotCount == this.nSlot) {
					this.mac.timer1.setParam (Mac.MAC_SLEEP);
				}
				if (this.resp == null) {
					blink (1);
					if (this.mac.radio.getState () == Radio.S_RXEN)
						this.mac.radio.startRx (Radio.RX4EVER, time, time + this.slotInterval);
				} else {
					this.mac.radio.stopRx ();
					this.mac.radio.transmit (Radio.ASAP | Radio.TXMODE_POWER_MAX, this.resp,
			                         0, (uint)this.resp.Length, time + this.slotInterval);
				}
				break;
			}
		}
		
		// protected methods
		internal void trackBeacon (long time)
		{ // nei diagrammi è espresso anche come scanBeacon()
			this.mac.radio.startRx (Radio.ASAP | Radio.RXMODE_NORMAL, Time.currentTicks (), time + this.aScanInterval);
		}

		internal static void blink (uint led)
		{
			if (LED.getState ((byte)led) == 0)
				LED.setState ((byte)led, (byte)1);
			else
				LED.setState ((byte)led, (byte)0);
		}
		
	}
}

