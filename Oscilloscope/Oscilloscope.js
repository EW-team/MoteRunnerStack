var TestOscilloscope = {

	exit: function(message, code) {
		if (message) {
		    println(message);
		}
		Runtime.exit(code);
    }
};

