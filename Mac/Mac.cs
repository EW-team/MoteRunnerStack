using System;
using System.Diagnostics;
using System.IO.IsolatedStorage;
using System.Runtime.Remoting.Messaging;

/// <summary>
/// Mac.
/// </summary>
namespace Mac_Layer
{
	using com.ibm.saguaro.system;
	using com.ibm.saguaro.logger;

	/// <summary>
	/// Mac.
	/// </summary>
	public class Mac
	{
		//---------- MAC scan modes -----------//
		
		/// <summary>
		/// Indicates the passive scan mode.
		/// </summary>
		public const byte MAC_SCAN_PASSIVE = (byte)0x00;
		/// <summary>
		/// Indicates the energy detection scan mode.
		/// </summary>
		public const byte MAC_SCAN_ED = (byte)0x01;

		// Timer parameters
		internal const byte MAC_WAKEUP = (byte)0x10;
		internal const byte MAC_SLEEP = (byte)0x11;
		internal const byte MAC_SLOT = (byte)0x12;

		//---------- MAC Flags codes ------------//
		
		/// <summary>
		/// Indicate the successful completion of a transmission.
		/// </summary>
		public const uint MAC_TX_COMPLETE = 0xE001;
		/// <summary>
		/// Indicates a successful association.
		/// </summary>
		public const uint MAC_ASSOCIATED = 0xE002;
		/// <summary>
		/// Indicates a successful transmision of a beacon.
		/// </summary>
		public const uint MAC_BEACON_SENT = 0xE003;
		/// <summary>
		/// Indicates the reception of an association request frame.
		/// </summary>
		public const uint MAC_ASS_REQ = 0xE004;
		/// <summary>
		/// Indicates the reception of an association response frame.
		/// </summary>
		public const uint MAC_ASS_RESP = 0xE005;
		/// <summary>
		/// Indicates the reception of a beacon frame.
		/// </summary>
		public const uint MAC_BEACON_RXED = 0xE006;
		/// <summary>
		/// Indicates the reception of a data frame.
		/// </summary>
		public const uint MAC_DATA_RXED = 0xE007;

		//----------------------------------------------------------------------//
		//-------------------------    RESTART HERE    -------------------------//
		//----------------------------------------------------------------------//

		// Instance Variables
		internal Radio radio;
		internal Timer timer1;
		
		/// <summary>
		/// The buffer containing the pdu to transmit.
		/// </summary>
		public byte[] pdu;
		
//		// Internal logic parameters
//		private bool scanContinue = false;

		// Callbacks
		internal DevCallback rxHandler = new DevCallback (onMockEvent);
		internal DevCallback txHandler = new DevCallback (onMockEvent);
		internal DevCallback eventHandler = new DevCallback (onMockEvent);

		// Configuration
		internal MacState state;
		
		/// <summary>
		/// Initializes a new instance of the <see cref="Mac_Layer.Mac"/> class.
		/// </summary>
		public Mac ()
		{
			this.timer1 = new Timer ();
			this.radio = new Radio ();
			this.pdu = null;
		}
		
		/// <summary>
		/// This method is called internally when a state event occurs.
		/// </summary>
		/// <returns>
		/// The state event.
		/// </returns>
		/// <param name='flag'>
		/// A flag that notifies the occurred event.
		/// </param>
		/// <param name='param'>
		/// A parameter related to the event.
		/// </param>
		internal uint onStateEvent (uint flag, uint param)
		{
			if (flag == MAC_ASSOCIATED) {
				LED.setState ((byte)0, (byte)1);
				LED.setState ((byte)1, (byte)1);
				LED.setState ((byte)2, (byte)0);
				this.timer1.cancelAlarm ();
				this.state = new MacAssociatedState (this, this.radio.getPanId (), param);
				this.eventHandler (MAC_ASSOCIATED, null, 0, this.radio.getShortAddr (), Time.currentTicks ());
			}
			return 0;
		}

		/// <summary>
		/// Sets the radio channel.
		/// </summary>
		/// <param name='channel'>
		/// Radio channel.
		/// </param>
		public void setChannel (uint channel)
		{
			this.radio.setChannel ((byte)channel);
		}
		
		/// <summary>
		/// Tells the Mac to begin association handshake for a specified pan.
		/// </summary>
		/// <param name='panId'>
		/// Pan identifier.
		/// </param>
		public void associate (uint panId)
		{
			this.state = new MacUnassociatedState (this, panId);
		}
		
		/// <summary>
		/// Creates a pan.
		/// </summary>
		/// <param name='panId'>
		/// Pan identifier for the new Pan.
		/// </param>
		/// <param name='saddr'>
		/// The Short Address for the Pan Coordinator
		/// </param>
		public void createPan (uint panId, uint saddr)
		{
			this.state = new MacCoordinatorState (this, panId, saddr);
		}
		
		/// <summary>
		/// Disassociate this instance from the current Pan.
		/// </summary>
		public void disassociate ()
		{
			//TODO
		}
		
		/// <summary>
		/// Enable the specified onOff.
		/// </summary>
		/// <param name='onOff'>
		/// On off.
		/// </param>
		public void enable (bool onOff)
		{
			if (onOff) {
				this.radio.open (Radio.DID, null, 0, 0);
			} else {
				this.timer1.cancelAlarm ();
				this.disassociate ();
				this.radio.close ();
			}
		}
		
//		public void setScanHandler(MacScanCallback callback) {
//			this.scanHandler = callback;
//		}
		
		/// <summary>
		/// Sets the function that will handle transmission events.
		/// </summary>
		/// <param name='callback'>
		/// The transmission event handler.
		/// </param>
		public void setTxHandler (DevCallback callback)
		{
			this.txHandler = callback;
		}
		
		/// <summary>
		/// Sets the function that will handle reception events.
		/// </summary>
		/// <param name='callback'>
		/// The reception event handler.
		/// </param>
		public void setRxHandler (DevCallback callback)
		{
			this.rxHandler = callback;
		}
		
		/// <summary>
		/// Sets the function that will handle MAC events.
		/// </summary>
		/// <param name='callback'>
		/// The event handler.
		/// </param>
		public void setEventHandler (DevCallback callback)
		{
			this.eventHandler = callback;
		}
		
		/// <summary>
		/// Sends the specified data with sequence seq to dstSaddr.
		/// </summary>
		/// <param name='dstSaddr'>
		/// Destination short address.
		/// </param>
		/// <param name='seq'>
		/// Sequence number.
		/// </param>
		/// <param name='data'>
		/// An array of byte. The maximum length of a frame is 127 byte.
		/// </param>
		public uint send (uint dstSaddr, short seq, byte[] data)
		{
#if DBG
			Logger.appendString(csr.s2b("send("));
			Logger.appendUInt (dstSaddr);
			Logger.appendString(csr.s2b(", "));
			Logger.appendUInt ((uint)seq);
			Logger.appendString(csr.s2b(")"));
			Logger.flush(Mote.INFO);
#endif
			return this.state.send (dstSaddr, seq, data);
		}
		
		//------------- static methods --------------
		
		/// <summary>
		/// Static method called when other event handler've been setted.
		/// </summary>
		/// <returns>
		/// An integer with no meanings.
		/// </returns>
		/// <param name='flags'>
		/// Flags.
		/// </param>
		/// <param name='data'>
		/// Data.
		/// </param>
		/// <param name='len'>
		/// Length.
		/// </param>
		/// <param name='info'>
		/// Info.
		/// </param>
		/// <param name='time'>
		/// Time.
		/// </param>
		public static int onMockEvent (uint flags, byte[] data, uint len, uint info, long time)
		{
			
			return 0;
		}
		
		/// <summary>
		/// Permits to set Mac parameters. Currently not implemented.
		/// </summary>
		/// <param name='cXaddr'>
		/// C xaddr.
		/// </param>
		/// <param name='cSaddr'>
		/// C saddr.
		/// </param>
		/// <param name='Saddr'>
		/// Saddr.
		/// </param>
		static void setParameters (long cXaddr, uint cSaddr, uint Saddr)
		{
			//TODO
		}

	}
}
