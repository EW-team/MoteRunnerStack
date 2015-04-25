namespace Mac_Layer
{
	using com.ibm.saguaro.system;

	internal class MacConfig
	{

		// Scan parameters
		private uint _scanOrder;
		public long aScanInterval;
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

		public uint coordinatorSADDR;
		
		public MacConfig ()
		{
			// set default values after setter & getter've been defined
			this.scanOrder = 5;
			this.BO = 8;
			this.SO = 5;
		}


	}
}

