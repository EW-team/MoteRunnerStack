using System;

namespace Mac_Layer
{
	using com.ibm.saguaro.system;
	using com.ibm.saguaro.logger;

	internal class Frame
	{

		const byte beaconFCF = Radio.FCF_BEACON | Radio.FCF_NSPID;  // FCF header: data-frame & no-SRCPAN
		const byte beaconFCA = Radio.FCA_DST_SADDR | Radio.FCA_SRC_SADDR; // FCA header to use short-addresses
		const byte cmdFCF = Radio.FCF_CMD | Radio.FCF_ACKRQ; // FCF header: CMD + Acq request

		static Frame ()
		{
		}

		public static byte[] getBeaconFrame(uint panId, uint saddr, MacConfig config) {
#if DEBUG
			Logger.appendString(csr.s2b("getBeaconFrame("));
			Logger.appendUInt (panId);
			Logger.appendString(csr.s2b(", "));
			Logger.appendUInt (saddr);
			Logger.appendString(csr.s2b(");"));
			Logger.flush(Mote.INFO);
#endif
			byte[] beacon = new byte[13];
			beacon[0] = beaconFCF;
			beacon[1] = beaconFCA;
			beacon[2] = (byte)config.beaconSequence;
			config.beaconSequence += 1;
			Util.set16(beacon,3,Radio.PAN_BROADCAST);
			Util.set16(beacon, 5, Radio.SADDR_BROADCAST);
			Util.set16(beacon, 7, panId);
			Util.set16(beacon, 9, saddr);
			beacon[10] = (byte)(config.BO << 4 | config.SO);
			if (config.associationPermitted)
	        	beacon[11] = (byte)(config.nSlot << 3 | 1 << 1 | 1);
			else
				beacon[11] = (byte)(config.nSlot << 3 | 1 << 1 | 0);
			if (config.gtsEnabled)
          		beacon[12] = (byte)(config.gtsSlots<<5| 1);
			else
				beacon[12] = (byte)(config.gtsSlots<<5| 0);
			return beacon;
		}

		public static void getBeaconInfo(byte[] beacon, MacConfig config){
			config.coordinatorSADDR = Util.get16 (beacon, 9);
			config.BO = (uint)(beacon [10] & 0xF0) >> 4;
			config.SO = (uint)beacon [10] & 0x0F;
			config.panId = Util.get16 (beacon, 7);
#if DEBUG
			Logger.appendString(csr.s2b("coordinatorSADDR"));
			Logger.appendUInt (config.coordinatorSADDR);
			Logger.appendString(csr.s2b(", "));
			Logger.appendString(csr.s2b("BO"));
			Logger.appendUInt (config.BO);
			Logger.appendString(csr.s2b(", "));
			Logger.appendString(csr.s2b("SO"));
			Logger.appendUInt (config.SO);
			Logger.appendString(csr.s2b(", "));
			Logger.appendString(csr.s2b("panId"));
			Logger.appendUInt (config.panId);
			Logger.flush(Mote.INFO);
#endif
		}

		public static byte[] getCMDAssReqFrame(uint panId, uint saddr, MacConfig config) {
#if DEBUG
			Logger.appendString(csr.s2b("getCMDAssReqFrame("));
			Logger.appendUInt (panId);
			Logger.appendString(csr.s2b(", "));
			Logger.appendUInt (saddr);
			Logger.appendString(csr.s2b(");"));
			Logger.flush(Mote.INFO);
#endif
			byte[] cmd = new byte[19];
			cmd[0] = Radio.FCF_CMD | Radio.FCF_ACKRQ;
			cmd[1] = Radio.FCA_DST_SADDR | Radio.FCA_SRC_XADDR;
			cmd[2] = (byte)config.seq;
			Util.set16(cmd, 3, panId);
			Util.set16(cmd, 5, saddr);
			Util.set16(cmd, 7, Radio.SADDR_BROADCAST);
			Mote.getParam(Mote.EUI64, cmd, 9);
			cmd[17] = (byte) 0x01;
			cmd[18] = (byte)(1 << 7 | 1 << 6 | 0 << 4 | 0 << 3 | 0 << 2 | 0 << 1 | 0);
			return cmd;
		}

		public static byte[] getCMDAssRespFrame(byte[] req, uint panId, MacConfig config) {
#if DEBUG
			Logger.appendString(csr.s2b("getCMDAssRespFrame("));
			Logger.appendUInt (panId);
			Logger.appendString(csr.s2b(");"));
			Logger.flush(Mote.INFO);
#endif
			byte[] cmd = new byte[27];
			cmd[0] = req[0];
			cmd[1] = Radio.FCA_SRC_XADDR | Radio.FCA_DST_XADDR;
			cmd[2] = Util.rand8();
			Util.set16(cmd,3,panId);
			Util.copyData((object)req, 9, (object)cmd, 5, 8);
			Util.set16(cmd,13,panId);
            Mote.getParam(Mote.EUI64, cmd, 15);

			if (config.associationPermitted) {
				config.lastAssigned += 1;
				Util.set16(cmd,24,config.lastAssigned);
				cmd[26] = (byte)0x00;
			}
			else{
				cmd[26] = (byte)0x01;
			}
			return cmd;
		}

		public static byte[] getCMDDataFrame(uint panId, uint saddr) {
			byte[] cmd = new byte[10];

			return cmd;
		}

		public static byte[] getDataFrame(byte[] data, uint panId, uint saddr, uint dsaddr, short seq) {
#if DEBUG
			Logger.appendString(csr.s2b("getDataFrame("));
			Logger.appendUInt (panId);
			Logger.appendString(csr.s2b(", "));
			Logger.appendUInt (saddr);
			Logger.appendString(csr.s2b(", "));
			Logger.appendUInt (dsaddr);
			Logger.appendString(csr.s2b(", "));
			Logger.appendInt (seq);
			Logger.appendString(csr.s2b(");"));
			Logger.flush(Mote.INFO);
#endif
			uint dataLen = (uint)data.Length;
			uint headerLen = 11; // lunghezza del header del pdu dati
			if (dataLen + headerLen > 127) {
				ArgumentException.throwIt (ArgumentException.TOO_BIG);
				return null; // throw exception
			}
			byte[] frame = new byte[dataLen + headerLen];
//			this.pdu = (byte[])Util.alloca((byte)this.pduLen, Util.BYTE_ARRAY); // messo a max size, ma va variato in base alla dimensione dell'header e dei dati ricevuti
			frame[0] = Radio.FCF_DATA | Radio.FCF_ACKRQ; // data FCF with request of acknowledge
			frame[1] = Radio.FCA_DST_SADDR | Radio.FCA_SRC_SADDR; // FCA with destination short address and source short address
			frame[2] = (byte) seq;
			Util.set16(frame,3, panId); // NOTA: panId potrebbe essere rimosso dagli attributi di classe essendo recuperabile da radio
			Util.set16(frame, 5, dsaddr);
			Util.set16(frame, 7, panId);
			Util.set16(frame, 9, saddr);
			Util.copyData((object)data, 0, (object)frame, headerLen+1, dataLen); // Insert data from upper layer into MAC frame
			return frame;
		}

		public static uint getLength(byte[] frame) {
			return (uint)frame.Length;
		}

		public static uint getFrameType(byte[] frame) {
			return (uint)frame [0] & 0x07;
		}

		public static uint getCMDType(byte[] cmd) {
			return (uint)cmd[17];
		}
	}
}

