namespace Oscilloscope
{
	using Mac_Layer;
	
	public class Oscilloscope
	{
		internal static Mac mac;
		
		static Oscilloscope ()
		{
			mac = new Mac();
			mac.enable(true);
			mac.createPan(1, 0x0234);
			
		}
		
		
	}
}

