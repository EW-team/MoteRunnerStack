using System;

namespace mr_test
{
	using com.ibm.saguaro.system;
	public class MacPacket
	{
		[Immutable]
		public static uint maxFrame = 13;
		
		static MacPacket ()
		{
		}
		
		public static byte[] getDataFrame(byte seqno, uint panid, uint dstaddr, uint srcaddr, uint payload){
			byte[] frame = new byte[11];
			frame[0] = Radio.FCF_DATA | Radio.FCF_ACKRQ | Radio.FCF_NSPID;
			frame[1] = Radio.FCA_SRC_SADDR | Radio.FCA_DST_SADDR;
			frame[2] = seqno;
			Util.set16(frame, 3, panid);
			Util.set16(frame, 5, dstaddr);
			Util.set16(frame, 7, srcaddr);
			Util.set16(frame, 9, payload);
			return frame;
		}
	}
}

