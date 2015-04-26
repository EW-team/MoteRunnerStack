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

var socket = {
	/**                                                   
	* Evaluate arguments for a 'socket-send' and act accordingly. 
	* @param dstport  Destination port specified by user  
	* @param dstmotes Destination motes specified in command       
	* @param argv     String[] specified by user after dstport on the command line
	* @returns message to be sent to given mote or null if caller should handle this.
	*/                                                     
	send: function(dstport, dstmote, argv) {
		println("socket-send: called..");
		return argv;
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
		var srcId = blob.src.getUniqueid();
       	var srcPort = blob.srcport;
       	var dstPort = blob.dstport;
      	var data = blob.data;

      	//Unpack a binary string to an array
		var arr = Formatter.unpack("u2xL3dUL", data);
	},

	/** Called when this socket is closed. */
	onClose: function(status) {
		println("socket-onClose: called..");
	}
};