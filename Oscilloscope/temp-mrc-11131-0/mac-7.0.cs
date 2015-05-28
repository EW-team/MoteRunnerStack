namespace Mac_Layer {

[com.ibm.saguaro.system.Slot(0)]
public class Mac {
	public const byte MAC_SCAN_PASSIVE = 0;
	public const byte MAC_SCAN_ED = 1;
	public const uint MAC_TX_COMPLETE = 57345;
	public const uint MAC_ASSOCIATED = 57346;
	public const uint MAC_BEACON_SENT = 57347;
	public const uint MAC_ASS_REQ = 57348;
	public const uint MAC_ASS_RESP = 57349;
	public const uint MAC_BEACON_RXED = 57350;
	public const uint MAC_DATA_RXED = 57351;

	[com.ibm.saguaro.system.Slot(0)]
	public Mac(){}

	[com.ibm.saguaro.system.Slot(1)]
	public void setChannel(uint channel){}

	[com.ibm.saguaro.system.Slot(2)]
	public void associate(uint panId){}

	[com.ibm.saguaro.system.Slot(3)]
	public void createPan(int channel, uint panId, uint saddr){}

	[com.ibm.saguaro.system.Slot(4)]
	public void disassociate(){}

	[com.ibm.saguaro.system.Slot(5)]
	public void enable(bool onOff){}

	[com.ibm.saguaro.system.Slot(6)]
	public void setTxHandler(com.ibm.saguaro.system.DevCallback callback){}

	[com.ibm.saguaro.system.Slot(7)]
	public void setRxHandler(com.ibm.saguaro.system.DevCallback callback){}

	[com.ibm.saguaro.system.Slot(8)]
	public void setEventHandler(com.ibm.saguaro.system.DevCallback callback){}

	[com.ibm.saguaro.system.Slot(9)]
	public void transmit(uint dstSaddr, int seq, byte[] data){}

	[com.ibm.saguaro.system.Slot(10)]
	public static int onMockEvent(uint flags, byte[] data, uint len, uint info, long time){return 0;}
}
}