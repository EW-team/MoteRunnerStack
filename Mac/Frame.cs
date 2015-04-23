using System;

namespace Mac
{
	using com.ibm.saguaro.system;

	internal class Frame
	{

		static Frame ()
		{
		}

		static byte[] getBeaconFrame(uint panId, uint saddr) {
			byte[] beacon = new byte[13];
			beacon[0] = MacConfig.beaconFCF;
			beacon[1] = MacConfig.beaconFCA;
			beacon[2] = (byte)MacConfig.beaconSequence;
			Util.set16(beacon,3,Radio.PAN_BROADCAST);
			Util.set16(beacon, 5, Radio.SADDR_BROADCAST);
			Util.set16(beacon, 7, panId);
			Util.set16(beacon, 9, saddr);
			beacon[10] = (byte)(MacConfig.BO << 4 | MacConfig.SO);
			beacon[11] = (byte)(MacConfig.nSlot << 3 | 1 << 1 | MacConfig.associationPermitted);
			beacon[12] = (byte)(MacConfig.gtsSlots<<5|MacConfig.gtsEnabled);
			return beacon;
		}

		static byte[] getCMDAssReqFrame(uint panId, uint saddr) {

		}

		static byte[] getCMDAssRespFrame(uint panId, uint saddr) {

		}

		static bute[] getCMDDataFrame(uint panId, uint saddr) {

		}

		static byte[] getDataFrame(uint panId, uint saddr) {

		}
	}
}

