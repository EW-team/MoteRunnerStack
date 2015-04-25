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

		public static byte[] getBeaconFrame(uint panId, uint saddr, MacCoordinatorState state) {
#if DEBUG
//			Logger.appendString(csr.s2b("getBeaconFrame("));
//			Logger.appendUInt (panId);
//			Logger.appendString(csr.s2b(", "));
//			Logger.appendUInt (saddr);
//			Logger.appendString(csr.s2b(");"));
//			Logger.flush(Mote.INFO);
#endif
			byte[] beacon = new byte[14];
			beacon[0] = beaconFCF;
			beacon[1] = beaconFCA;
			beacon[2] = (byte)state.beaconSequence;
			state.beaconSequence += 1;
			Util.set16(beacon,3,Radio.PAN_BROADCAST);
			Util.set16(beacon, 5, Radio.SADDR_BROADCAST);
			Util.set16(beacon, 7, panId);
			Util.set16(beacon, 9, saddr);
			beacon[11] = (byte)(state.BO << 4 | state.SO);
			if (state.associationPermitted)
	        	beacon[12] = (byte)(state.nSlot << 3 | 1 << 1 | 1);
			else
				beacon[12] = (byte)(state.nSlot << 3 | 1 << 1 | 0);
			if (state.gtsEnabled)
          		beacon[13] = (byte)(state.gtsSlots<<5| 1);
			else
				beacon[13] = (byte)(state.gtsSlots<<5| 0);
			return beacon;
		}

		public static void getBeaconInfo(byte[] beacon, MacUnassociatedState state){
			state.coordinatorSADDR = Util.get16(beacon, 9);
			state.BO = (uint)(beacon [11] & 0xF0) >> 4;
			state.SO = (uint)beacon [11] & 0x0F;
			state.panId = Util.get16 (beacon, 7);
#if DEBUG
			Logger.appendString(csr.s2b("coordinatorSADDR"));
			Logger.appendUInt (state.coordinatorSADDR);
			Logger.appendString(csr.s2b(", "));
			Logger.appendString(csr.s2b("BO"));
			Logger.appendUInt (state.BO);
			Logger.appendString(csr.s2b(", "));
			Logger.appendString(csr.s2b("SO"));
			Logger.appendUInt (state.SO);
			Logger.appendString(csr.s2b(", "));
			Logger.appendString(csr.s2b("panId"));
			Logger.appendUInt (state.panId);
			Logger.flush(Mote.INFO);
#endif
		}

		public static byte[] getCMDAssReqFrame(uint panId, uint saddr, MacState state) {
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
			cmd[2] = (byte)Util.rand8 ();
			Util.set16(cmd, 3, panId);
			Util.set16(cmd, 5, saddr);
			Util.set16(cmd, 7, Radio.SADDR_BROADCAST);
			Mote.getParam(Mote.EUI64, cmd, 9);
			cmd[17] = (byte) 0x01;
			cmd[18] = (byte)(1 << 7 | 1 << 6 | 0 << 4 | 0 << 3 | 0 << 2 | 0 << 1 | 0);
			return cmd;
		}

		public static byte[] getCMDAssRespFrame(byte[] req, uint panId, MacCoordinatorState state) {
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
			cmd[23] = 0x02;
			if (state.associationPermitted) {
				state.lastAssigned += 1;
				Util.set16(cmd,24,state.lastAssigned);
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

		public static void setDataFrame(ref object frame, ref object data, uint panId, uint saddr, uint dsaddr, short seq) {
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
			frame = Util.alloca ((byte)(11 + ((byte[])data).Length), Util.BYTE_ARRAY);
			Util.set16((byte[])frame,2, (uint)seq);
			Util.set16((byte[])frame,0, ((Radio.FCF_DATA | Radio.FCF_ACKRQ)<<8)|Radio.FCA_DST_SADDR | Radio.FCA_SRC_SADDR);
//			((byte[])frame[0]) = Radio.FCF_DATA | Radio.FCF_ACKRQ; // data FCF with request of acknowledge
//			((byte[])frame[1]) = Radio.FCA_DST_SADDR | Radio.FCA_SRC_SADDR; // FCA with destination short address and source short address
//			((byte[])frame[2]) = (byte) seq;
			Util.set16(((byte[])frame),3, panId);
			Util.set16(((byte[])frame), 5, dsaddr);
			Util.set16(((byte[])frame), 7, panId);
			Util.set16(((byte[])frame), 9, saddr);
			Util.copyData(data, 0, frame, 11, (uint)((byte[])data).Length); // Insert data from upper layer into MAC frame
		}
		
		public static byte[] getDataHeader(uint panId, uint saddr, uint dsaddr, short seq) {
#if DEBUG
			Logger.appendString(csr.s2b("getDataHaeder("));
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
			byte[] header = new byte[11];
			header[0] = Radio.FCF_DATA | Radio.FCF_ACKRQ;
			header[1] = Radio.FCA_DST_SADDR | Radio.FCA_SRC_SADDR;
			header[2] = (byte) seq;
			Util.set16(header,3, panId);
			Util.set16(header, 5, dsaddr);
			Util.set16(header, 7, panId);
			Util.set16(header, 9, saddr);
			return header;
		}

		public static uint getLength(byte[] frame) {
			return (uint)frame.Length;
		}

		public static uint getFrameType(byte[] frame) {
			return (uint)frame [0] & 0x07;
		}

		public static uint getCMDType(byte[] cmd) {
			uint srcSaddr = (uint)(cmd[1] & Radio.FCA_SRC_MASK);
			uint dstSaddr = (uint)(cmd[1] & Radio.FCA_DST_MASK);
#if DEBUG
			Logger.appendString(csr.s2b("getCMDType-"));
			Logger.appendString(csr.s2b("srcSaddr"));
			Logger.appendUInt (srcSaddr);
			Logger.appendString(csr.s2b(", "));
			Logger.appendString(csr.s2b("dstSaddr"));
			Logger.appendUInt (dstSaddr);
			Logger.flush(Mote.INFO);
#endif
			if( dstSaddr == Radio.FCA_DST_SADDR && srcSaddr == Radio.FCA_SRC_SADDR)
				return (uint)cmd[11];
			else if((dstSaddr == Radio.FCA_DST_SADDR && srcSaddr == Radio.FCA_SRC_XADDR) || (dstSaddr == Radio.FCA_DST_XADDR && srcSaddr == Radio.FCA_SRC_SADDR))
				return (uint)cmd[17];
			else if (dstSaddr == Radio.FCA_DST_XADDR && srcSaddr == Radio.FCA_SRC_XADDR)
				return (uint)cmd[23];
			else
				SystemException.throwIt (SystemException.NOT_SUPPORTED);
			return 0;
		}
		
		public static uint getPayloadPosition(byte[] data) {
			uint srcSaddr = (uint)(data[1] & Radio.FCA_SRC_MASK);
			uint dstSaddr = (uint)(data[1] & Radio.FCA_DST_MASK);
			if (dstSaddr == Radio.FCA_DST_SADDR && srcSaddr == Radio.FCA_SRC_SADDR)
				return 11;
			else if ((dstSaddr == Radio.FCA_DST_SADDR && srcSaddr == Radio.FCA_SRC_XADDR) ||
					 (dstSaddr == Radio.FCA_DST_XADDR && srcSaddr == Radio.FCA_SRC_SADDR))
				return 17;
			else if (dstSaddr == Radio.FCA_DST_XADDR && srcSaddr == Radio.FCA_SRC_XADDR)
				return 23;
			else
				SystemException.throwIt (SystemException.NOT_SUPPORTED);
			return 0;
		}
	}
}

