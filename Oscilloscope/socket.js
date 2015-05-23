/**
* Javascript socket.
*
* In Sonoram you can bind the object socket to a LIP socket by typing
*	source socket.js
*	socket-bind socket
* 
* Once the socket is bound Sonoram will forward every command you issue to one of the callbacks
* of the socket interface. Make sure your socket exposes the interface Sonoram expects.
* Type "help socket-bind" in Sonoram shell for info about this interface.
*
* See the documentation of Sonoram API for more abour the Sonoram Javascript framework
*
*/

var FLAG_TEMP = 0x01;
var FLAG_LIGHT = 0x02;

var osciSocket = {
	/**                                                   
	* Evaluate arguments for a 'socket-send' and act accordingly. 
	* @param dstport  Destination port specified by user  
	* @param dstmotes Destination motes specified in command       
	* @param argv     String[] specified by user after dstport on the command line
	* @returns message to be sent to given mote or null if caller should handle this.
	*/                                                     
	send: function(dstport, dstmote, argv) {
		println("socket-send: called..");
		// argv format: cmd:on/off:flag:
		var cmd = argv[0]; // 1 byte
		var on = argv[1]; // 1 byte
		var flag = argv[2]; // 1 byte
		var time = argv[3]; // 4 byte
		var saddr = argv[4];
		// var msg = 0101010300;
		println(parseInt(cmd))
		var msg = Util.Formatter.transcode('(1uL)(1uL)(1uL)(4uL)(2uL)', parseInt(cmd), parseInt(on),parseInt(flag), parseInt(time), parseInt(saddr));
		println('...');
		println(msg);
		return msg;
	},

	/**                                                   
	* Evaluate arguments for a 'socket-broadcast' and act accordingly. 
	* @param dstmote  The mote which does the broadcast. Must have a gateway installed and running.
	* @param dstport  Destination port on all motes to broadcast to. 
	* @param argv     String[] specified by user after dstport on the command line.
	* @returns message to be sent to given mote or null if caller should handle this.
	*/                                                     
	broadcast: function(dstmote, dstport, argv) {
		println("socket-send: called..");
		return argv;
	},

	/**
	* See lib/web/js/sonoram.js#Util.Formatter
	* Data has been received for this socket.
	* @param blob  Message with properties src (Sonoran.Mote), srcport (Number), dstport (Number)
	*              and data (Binary String)
	* @returns a String to be loged to a file or stdout by caller
	*/
	onData: function(blob) {
       	var srcPort = blob.getSrcPort();
       	var data = blob.data;
       	var len = data.length
		println('.....')
      	//Unpack a binary string to an array
		// var arr = Formatter.unpack("u2xL3dUL", data);
		var arr = Formatter.unpack("uL4bL2xL2uL", data);
		// var arr = Formatter.unpack("SLUL4xLuL", data);

		
		var flagData = arr[0];
		var time = arr[1];
		var srcAddr = arr[2];
		var sensorValue = arr[3];
		if (flagData == 0x00){
			return sprintf("socket-onData: %s:%d --> No data available\n", srcAddr, srcPort);
		}
		else if (flagData == FLAG_TEMP) {
			if (sensorValue > 1023)
				sensorValue = 1023;
			var rThr = 10000*(1023 - sensorValue)/sensorValue;
			// println(rThr);
			var logRThr = Math.log(rThr);
			sensorValue = 1/(0.001010024 + 0.000242127*logRThr + 0.000000146*(logRThr^3));
			return sprintf("%d - temp data: %d from %s\n", time, sensorValue, srcAddr);
		}
		else if (flagData == FLAG_LIGHT){
			return sprintf("%d - light data: %d from %s\n", time, sensorValue, srcAddr);
		}
		else
			return sprintf("---------------------------");
	},

	/** Called when this socket is closed. */
	onClose: function(status) {
		println("socket-onClose: called..");
	},
	
	onBind: function(status) {
		println("socket-onBind:: called..");

	}
};
