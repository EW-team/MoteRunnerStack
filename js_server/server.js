Class.define("MyTestServer",
    {
		__constr__: function() {
		    this.router = null;
		    this.cnt = 0;
		    this.seqnoDn = 0;
		},

		getRouter: function() {
		    return this.router;
		},

		onStart: function() {
		    println("MyTestServer: router started!");
		},

		onStop: function() {
		    println("MyTestServer: router stopped!");
		},

		onDevJoinUp: function(/** String */deveui, /** Object */msg) {
		    println("MyTestServer.onDevJoinUp");
		    println("   deveui: " + deveui);
		    println("   msg   : " + JSON.stringify(msg));
		},

		onArtMsg: function(/** Object */msg) {
	        println("MyTestServer.onAppMsg");
		    printf ("   msg   : %s\n", JSON.stringify(msg));
		}
    }
);


// Network set-up
