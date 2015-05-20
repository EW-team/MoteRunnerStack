using com.ibm.saguaro.system;
using com.ibm.saguaro.logger;

namespace Mac_Layer
{
	internal abstract class MacState
	{
		
		internal uint state;
		
		
		internal const uint FRAME_TYPE_MASK = 0x07;
		
		// Beacon Positions
		internal const uint FRAME_POS = 0;
		internal const uint ASS_POS = 1;
		internal const uint GTS_POS = 2;
		
		// CMD Commands
		internal const uint ASS_REQ = 0x01;
		internal const uint ASS_RES = 0x02;
		internal const uint DATA_REQ = 0x04;
		
		// CMD Response
		internal const uint ASS_SUCC = 0x00;
		internal const uint ASS_FAIL = 0x01;
		
		internal Mac mac;
		internal bool duringSuperframe;
		
		// Beacon & Superframe Parameters
		public uint nSlot = 15; // n. of time slots in superframe
		public uint beaconSequence = 0; // sequence of beacon
		public uint gtsSlots = 0;
		public bool gtsEnabled = false;
		
		private uint _BO = 8;  // beacon order
		public long beaconInterval; // Beacon Interval = 60sym * nSlot * 2^BO / 20kbps [s] = 3 * nSlot * 2^BO [ms]
		public uint BO {
			get {
				return this._BO;
			}
			set {
				Logger.appendString (csr.s2b ("set BO"));
				Logger.appendUInt (value);
				Logger.flush (Mote.INFO);
				if (value < 15 && value > 0) {
					this._BO = value;
					this.beaconInterval = Time.toTickSpan (Time.MILLISECS, 3 * nSlot * 2 ^ this._BO);
				} else if (value > 15) {
					this._BO = this._SO + 1;
					ArgumentException.throwIt (ArgumentException.TOO_BIG);
				} else {
					this._BO = this._SO + 1;
					ArgumentException.throwIt (ArgumentException.TOO_SMALL);
				}
			}
		}
		
		private uint _SO = 7; // superframe order
		public long slotInterval; // Superframe duration = 60sym * nSlot * 2^SO / 20kbps [s] = 3 * nSlot * 2^SO [ms]
		public uint SO {
			get {
				return this._SO;
			}
			set {
				Logger.appendString (csr.s2b ("set SO"));
				Logger.appendUInt (value);
				Logger.flush (Mote.INFO);
				if (value < 15 && value >= 0 && value < this._BO) {
					this._SO = value;
					this.slotInterval = Time.toTickSpan (Time.MILLISECS, 3 * 2 ^ this._SO);
					this.interSlotInterval = this.slotInterval >> 1;
				} else if (value == 15 && value < this._BO) {// no beacon

				} else if (value > 15 || value > this._BO) {
					this._SO = this._BO - 1;
					ArgumentException.throwIt (ArgumentException.TOO_BIG);
				} else {
					this._SO = this._BO - 1;
					ArgumentException.throwIt (ArgumentException.TOO_SMALL);
				}
			}
		}
		public long interSlotInterval;
		internal short slotCount = 0;
		
		internal bool ackReq = false;
		internal byte[] resp;
		internal bool acked = false;
		
		public bool dataPending = false;
		public uint saddr = 0x0000;
		
		// Scan parameters
		private uint _scanOrder = 10;
		public long aScanInterval;
		public uint scanOrder {
			get {
				return this._scanOrder;
			}
			set {
				if (value < 15 && value > 0) {
					this._scanOrder = value;
					this.aScanInterval = Time.toTickSpan (Time.MILLISECS, 3 * (nSlot + 1) * (2 ^ this._scanOrder + 1));
				} else if (value > 15) {
					this._scanOrder = 5;
					ArgumentException.throwIt (ArgumentException.TOO_BIG);
				} else {
					this._scanOrder = 5;
					ArgumentException.throwIt (ArgumentException.TOO_SMALL);
				}
			}
		}
	
		public MacState (Mac mac)
		{
			this.mac = mac;
			this.mac.radio.setEventHandler (this.onRadioEvent);
			this.mac.radio.setTxHandler (this.onTxEvent);
			this.mac.radio.setRxHandler (this.onRxEvent);
			this.mac.timer1.setCallback (this.onTimerEvent);
			this.beaconInterval = Time.toTickSpan (Time.MILLISECS, 3 * nSlot * 2 ^ this._BO);
			this.slotInterval = Time.toTickSpan (Time.MILLISECS, 3 * 2 ^ this._SO);
			this.aScanInterval = Time.toTickSpan (Time.MILLISECS, 3 * (nSlot + 1) * (2 ^ this._scanOrder + 1));
		}
		
		public abstract void dispose(); // destroy this instance
		
		public abstract int onRxEvent(uint flags, byte[] data, uint len, uint info, long time);
		
		public abstract int onTxEvent(uint flags, byte[] data, uint len, uint info, long time);
		
		public abstract int onRadioEvent(uint flags, byte[] data, uint len, uint info, long time);
		
		public abstract void onTimerEvent(byte param, long time);
	}
}

