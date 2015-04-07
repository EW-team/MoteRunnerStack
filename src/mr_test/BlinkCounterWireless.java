package mr_test;

import com.ibm.saguaro.system.*;
import com.ibm.saguaro.lrsc.*;

public class BlinkCounterWireless {
	
	private static Timer txTimer = new Timer();
	
	public static int counter = 0;
	
	@Immutable
	public static final int deltaT = 1000;
	
	public void setDelegate() {
		Mac.setRxHandler(new LRSCRxHandler(this) {
            public void invoke (byte port, byte[] paybuf, int payoff, int paylen) {
                ((BlinkCounterWireless)obj).onRxCallback(port,paybuf,payoff,paylen);
            }
        });
        
        txTimer.setCallback(new TimerEvent(this) {
        	public void invoke (byte param, long time) {
        		((BlinkCounterWireless)obj).onTimeCallback(param,time);
        	}
        });
	}

    public void onRxCallback (byte port, byte[] paybuf, int payoff, int paylen) {
        // get counter value from paybuf
        if (paylen > 1)
        	counter = ((paybuf[payoff] & 0xff) << 8) & paybuf[payoff+1];
        else
        	counter = paybuf[payoff];
        
        txTimer.setAlarmTime(txTimer.getAlarmTime()+deltaT);
    }
	
	public void onTimeCallback(byte param, long time) {
		
	}
}
