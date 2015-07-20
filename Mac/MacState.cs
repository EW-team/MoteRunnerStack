using com.ibm.saguaro.system;

namespace Mac_Layer
{
	/// <summary>
	/// Abstraction for states that manages the behaviour of Mac.
	/// </summary>
	/// <para>
	/// This class follows the State pattern defined by GoF and the classes that realize this abstraction are states of Mac.
	/// The states should not change the current state of Mac and Mac is responsible to change it.
	/// To know when to change state the classes have to notify Mac calling <see cref="Mac_Layer.Mac.onStateEvent"/> as 
	/// described in the Observer pattern by GoF.
	/// </para>
	internal abstract class MacState
	{
		
		internal const uint FRAME_TYPE_MASK = 0x07;
		
		/// <summary>
		/// The _lock variable blocks the tx/rx when the device attempts to transmit.
		/// </summary>
		internal bool _lock = false;
		/// <summary>
		/// A tx can fail due to radio channel or time constraints; this variable represents the number of failed transmission.;
		/// </summary>
		internal uint _retry = 0;
		/// <summary>
		/// The maximum number of time a frame will be transmitted due to failures.
		/// </summary>
		internal uint _abort = 3;
		/// <summary>
		/// Traces the current number of slot in the superframe.
		/// </summary>
		internal uint slotCount = 0;
		/// <summary>
		/// This variable guarantees the synchronization. It keeps track of the time when an event of the superframe (beacon rx, superframe slot begin/end...)
		/// occurs so that could be always possible to synchronize.
		/// </summary>
		internal long _sync;
		private byte[] _txBuf;

		/// <summary>
		/// Buffer containing the frame that will be transmitted as soon as possible during the superframe if the channel is free.
		/// </summary>
		/// <value>
		/// byte[]
		/// </value>
		internal byte[] txBuf {
			get {
				return this._txBuf;
			}
			set {
				this._txBuf = value;
				this._retry = 0;
			}
		}
		
		//------------- Beacon Positions ---------------- //
		internal const uint FRAME_POS = 0;
		internal const uint ASS_POS = 1;
		internal const uint GTS_POS = 2;
		
		//------------- CMD Commands ---------------//
		internal const uint ASS_REQ = 0x01;
		internal const uint ASS_RES = 0x02;
		internal const uint DATA_REQ = 0x04;
		
		//------------- CMD Response --------------//
		internal const uint ASS_SUCC = 0x00;
		internal const uint ASS_FAIL = 0x01;
		internal Mac mac;
		
		//------------- Beacon & Superframe Parameters -----------//
		
		/// <summary>
		/// The number of time slots in the superframe.
		/// </summary>
		public uint nSlot = 15;
		
		/// <summary>
		/// The beacon sequence.
		/// </summary>
		public uint beaconSequence = 0; // sequence of beacon
		
		/// <summary>
		/// The number of GTS defined by PAN coordinator.
		/// </summary>
		public uint gtsSlots = 0;
		
		/// <summary>
		/// Enable/Disable GTS. Currently GTS logic's not been implemented.
		/// </summary>
		public bool gtsEnabled = false;
		/// <summary>
		/// The beacon interval computed as 60sym * nSlot * 2^BO / 20kbps [s] = 3 * nSlot * 2^BO [ms]
		/// </summary>
		public long beaconInterval; // Beacon Interval = 60sym * nSlot * 2^BO / 20kbps [s] = 3 * nSlot * 2^BO [ms]
		private uint _BO;  // beacon order
		/// <summary>
		/// BO is an unsigned integer that permits to customize the duration of beacon interval.
		/// </summary>
		/// <value>
		/// uint
		/// </value>
		public uint BO {
			get {
				return this._BO;
			}
			set {
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
				this.scanOrder = this._BO + 1;
			}
		}
		
		/// <summary>
		/// The duration of a time slot in the superframe. Computed as: 60sym * nSlot * 2^SO / 20kbps [s] = 3 * nSlot * 2^SO [ms]
		/// </summary>
		public long slotInterval; // Superframe duration = 60sym * nSlot * 2^SO / 20kbps [s] = 3 * nSlot * 2^SO [ms]
		
		/// <summary>
		/// A guard time between two time slot in the super frame.
		/// </summary>
		public long interSlotInterval; // Slot between two slot intervals
		private uint _SO; // superframe order
		/// <summary>
		/// Superframe Order defines the duration of the entire superframe.
		/// </summary>
		/// <value>
		/// uint
		/// </value>
		public uint SO {
			get {
				return this._SO;
			}
			set {
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
		
		//---------- Scan parameters ---------//
		/// <summary>
		/// The duration of a radio scan.
		/// </summary>
		public long aScanInterval;
		private uint _scanOrder;
		/// <summary>
		/// Scan Order is an uint that defines the duration of the interval needed to scan the channel.
		/// </summary>
		/// <value>
		/// uint
		/// </value>
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
		
		/// <summary>
		/// Initializes a new instance of the <see cref="Mac_Layer.MacState"/> class.
		/// </summary>
		/// <param name='mac'>
		/// The mac instance which this instance is the state.
		/// </param>
		public MacState (Mac mac)
		{
			this.mac = mac;
			this.mac.radio.setEventHandler (this.onRadioEvent);
			this.mac.radio.setTxHandler (this.onTxEvent);
			this.mac.radio.setRxHandler (this.onRxEvent);
			this.mac.timer1.setCallback (this.onTimerEvent);
			this.BO = 10;
			this.SO = 8;
			this.txBuf = null;
		}
		
		/// <summary>
		/// Dispose this instance. The exit from the network have to be handled inside this method.
		/// </summary>
		public abstract void dispose ();
		
		/// <summary>
		/// This method is called by radio when a rx occurs. It contains the logic related to the state dependent from frame rx.
		/// </summary>
		/// <returns>
		/// An integer with no meaning.
		/// </returns>
		/// <param name='flags'>
		/// Flag indicates the tipe of event occurred.
		/// </param>
		/// <param name='data'>
		/// The received frame.
		/// </param>
		/// <param name='len'>
		/// Length of the frame.
		/// </param>
		/// <param name='info'>
		/// Info has no meaning.
		/// </param>
		/// <param name='time'>
		/// The time when rx ended. If the frame indicates the need to ack, the delegate is called once the frame's been acked.
		/// </param>
		public abstract int onRxEvent (uint flags, byte[] data, uint len, uint info, long time);
		
		/// <summary>
		/// This method is called by radio when a tx ended. It contains the logic related to the state dependent from frame tx.
		/// </summary>
		/// <returns>
		/// An integer with no meaning.
		/// </returns>
		/// <param name='flags'>
		/// Flag indicates the tipe of event occurred.
		/// </param>
		/// <param name='data'>
		/// The transmitted frame.
		/// </param>
		/// <param name='len'>
		/// Length of the frame.
		/// </param>
		/// <param name='info'>
		/// Info has no meaning.
		/// </param>
		/// <param name='time'>
		/// The time when tx ended. If the frame indicates the need to ack, the delegate is called once the ack is received or after a timeout.
		/// </param>
		public abstract int onTxEvent (uint flags, byte[] data, uint len, uint info, long time);
		
		
		/// <summary>
		/// This method is called by generic radio events.
		/// </summary>
		/// <returns>
		/// An integer with no meaning.
		/// </returns>
		/// <param name='flags'>
		/// Flag indicates the tipe of event occurred.
		/// </param>
		/// <param name='data'>
		/// 
		/// </param>
		/// <param name='len'>
		/// Length of data.
		/// </param>
		/// <param name='info'>
		/// Info has no meaning.
		/// </param>
		/// <param name='time'>
		/// The time when the event occurred.
		/// </param>
		public abstract int onRadioEvent (uint flags, byte[] data, uint len, uint info, long time);
		
		/// <summary>
		/// Manages timer events related to superframe.
		/// </summary>
		/// <param name='param'>
		/// Param indicates the portion of the superframe: beacon rx/tx (MAC_WAKEUP), during superframe (MAC_SLOT), sleep (MAC_SLEEP).
		/// </param>
		/// <param name='time'>
		/// Time when timer expired.
		/// </param>
		public abstract void onTimerEvent (byte param, long time);
		
		/// <summary>
		/// Send the specified data to destination. This function can be overridden if additional logic is required. It's called by Mac when needed sending data.
		/// </summary>
		/// <param name='dstSaddr'>
		/// Destination address.
		/// </param>
		/// <param name='seq'>
		/// Sequence number.
		/// </param>
		/// <param name='data'>
		/// Data to send.
		/// </param>
		internal virtual uint send (uint dstSaddr, short seq, byte[] data)
		{
			byte[] header = Frame.getDataHeader (this.mac.radio.getPanId (), this.mac.radio.getShortAddr (), dstSaddr, seq);
			uint len = (uint)(header.Length + data.Length);

			if (len <= 127) {
				this.mac.pdu = new byte[len];
				Util.copyData (header, 0, this.mac.pdu, 0, (uint)header.Length);
				Util.copyData (data, 0, this.mac.pdu, (uint)header.Length, (uint)data.Length);
			}
			return 0;
		}
	}
}

