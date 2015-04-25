using com.ibm.saguaro.system;

namespace Mac_Layer
{
	internal abstract class MacState
	{
		internal Mac mac;
//		internal MacConfig config;
		internal bool duringSuperframe;
		
		// Beacon & Superframe Parameters
		public uint nSlot = 15; // n. of time slots in superframe
		public uint beaconSequence = 0; // sequence of beacon
		public uint gtsSlots = 0;
		public bool gtsEnabled = false;
		public long beaconInterval; // Beacon Interval = 60sym * nSlot * 2^BO / 20kbps [s] = 3 * nSlot * 2^BO [ms]
		private uint _BO;  // beacon order
		public uint BO {
			get{
				return this._BO;
			}
			set{
				if (value < 15 && value > 0) {
					this._BO = value;
					this.beaconInterval = Time.toTickSpan (Time.MILLISECS, 3 * nSlot * 2 ^ this._BO);
				} else if (value > 15) {
					this._BO = 8;
					ArgumentException.throwIt (ArgumentException.TOO_BIG);
				} else {
					this._BO = 8;
					ArgumentException.throwIt (ArgumentException.TOO_SMALL);
				}
			}
		}
		public long slotInterval; // Superframe duration = 60sym * nSlot * 2^SO / 20kbps [s] = 3 * nSlot * 2^SO [ms]
		private uint _SO; // superframe order
		public uint SO {
			get{
				return this._SO;
			}
			set{
				if (value < 15 && value >= 0 && value < this._BO) {
					this._SO = value;
					this.slotInterval = Time.toTickSpan (Time.MILLISECS, 3 * 2 ^ this._SO);
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
		
		// Scan parameters
		public long aScanInterval;
		private uint _scanOrder;
		public uint scanOrder {
			get {
				return this._scanOrder;
			}
			set {
				if (value < 15 && value > 0) {
					this._scanOrder = value;
					this.aScanInterval = Time.toTickSpan (Time.MILLISECS, 3 * (nSlot + 1) * (2 ^ scanOrder + 1));
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
			this.mac.radio.setEventHandler(this.onRadioEvent);
			this.mac.radio.setTxHandler(this.onTxEvent);
			this.mac.radio.setRxHandler(this.onRxEvent);
			this.mac.timer1.setCallback (this.onTimerEvent);
			this.scanOrder = 10;
			this.BO = 8;
			this.SO = 5;
		}
		
		public abstract void dispose(); // destroy this instance
		
		public abstract int onRxEvent(uint flags, byte[] data, uint len, uint info, long time);
		
		public abstract int onTxEvent(uint flags, byte[] data, uint len, uint info, long time);
		
		public abstract int onRadioEvent(uint flags, byte[] data, uint len, uint info, long time);
		
		public abstract void onTimerEvent(byte param, long time);
	}
}

