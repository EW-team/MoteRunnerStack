//  (C) COPYRIGHT INTERNATIONAL BUSINESS MACHINES CORPORATION 2006-2010
//                       ALL RIGHTS RESERVED
//        IBM Research Division, Zurich Research Laboratory
// --------------------------------------------------------------------

/**
 * @namespace IO.Telnet
 */
IO.Telnet = {};

//==================================================================================================
//
// IO.Telnet.Client
//
//==================================================================================================


/**
 * IO.Telnet.Client encapsulates a telnet connection.
 * @class
 * @constructor
 */
IO.Telnet.Client = function() {
   /**
    * Configuration options with properties host, port, prompt, timeout (in milliseonds), username, password,
    * userlogin, passwordlogin.
    * @type Object
    */
   this.config = null;
   /**
    * @type IO.TCPSocket
    */
   this.sock = null;

   /** @ignore */
   this.CR   = "\015";
   /** @ignore */
   this.LF   = "\012"; 
   /** @ignore */
   this.EOL  = this.CR + this.LF;
   /** @ignore */
   this.NULL = "\000";
      
   /** @ignore */
   this.IAC   = 255; // "\377" # "\xff" # interpret as command
   /** @ignore */
   this.DONT  = 254; // "\376" # "\xfe" # you are not to use option 
   /** @ignore */
   this.DO    = 253; // "\375" # "\xfd" # please, you use option 
   /** @ignore */
   this.WONT  = 252; // "\374" # "\xfc" # I won't use option 
   /** @ignore */
   this.WILL  = 251; // "\373" # "\xfb" # I will use option 
   /** @ignore */
   this.SB    = 250; // "\372" # "\xfa" # interpret as subnegotiation 
   /** @ignore */
   this.GA    = 249; // "\371" # "\xf9" # you may reverse the line 
   /** @ignore */
   this.EL    = 248; // "\370" # "\xf8" # erase the current line 
   /** @ignore */
   this.EC    = 247; // "\367" # "\xf7" # erase the current character 
   /** @ignore */
   this.AYT   = 246; // "\366" # "\xf6" # are you there 
   /** @ignore */
   this.AO    = 245; // "\365" # "\xf5" # abort output--but let prog finish 
   /** @ignore */
   this.IP    = 244; // "\364" # "\xf4" # interrupt process--permanently 
   /** @ignore */
   this.BREAK = 243; // "\363" # "\xf3" # break 
   /** @ignore */
   this.DM    = 242; // "\362" # "\xf2" # data mark--for connect. cleaning 
   /** @ignore */
   this.NOP   = 241; // "\361" # "\xf1" # nop 
   /** @ignore */
   this.SE    = 240; // "\360" # "\xf0" # end sub negotiation 
   /** @ignore */
   this.EOR   = 239; // "\357" # "\xef" # end of record (transparent mode) 
   /** @ignore */
   this.ABORT = 238; // "\356" # "\xee" # Abort process 
   /** @ignore */
   this.SUSP  = 237; // "\355" # "\xed" # Suspend process 
   /** @ignore */
   this.EOF   = 236; // "\354" # "\xec" # End of file 
   /** @ignore */
   this.SYNCH = 242; // "\362" # "\xf2" # for telfunc calls 
   
   /** @ignore */
   this.OPT_BINARY         =   String.fromCharCode(0); //.chr # "\000" # "\x00" # Binary Transmission 
   /** @ignore */
   this.OPT_ECHO           =   1; //.chr # "\001" # "\x01" # Echo 
   /** @ignore */
   this.OPT_SGA            =   3; //.chr # "\003" # "\x03" # Suppress Go Ahead 
   
   /** @private  */
   this.telnetMode = true;
   /** @private  */
   this.binMode = false;
   /** @private  */
   this.sgaOption = false;
   /** @private  */
   this.buffer = "";
   /** @private  */
   this.listener = null;
};




/** Prototype */
IO.Telnet.Client.prototype = {
   /** 
    * Open a telnet connection. Parameter config should/may contain properties
    * host, port, prompt, timeout (in milliseonds), username, password,
    * userlogin, passwordlogin. If username is undefined, no login to
    * the telnet server is performed.
    * @param config     Object with properties host, port, prompt, timeout, username,
    * password, userlogin, passwordlogin
    * @param callback   Invoked with AOP.OK or AOP.ERR
    * @throws {AOP.Exception}
    */
   open: function(/** Object */config, /** DFLT_ASYNC_CB */callback) {
       if (BC.is(callback)) { return BC.exec(arguments.callee, this, arguments); }
      assert(this.config == null, "telnet connection already open");
      config = config ? config : {};
      this.config = config;
      config.host = config.host ? config.host : "127.0.0.1";
      config.port = config.port ? config.port : 23;
      config.prompt = config.prompt ? config.prompt : ">";
      config.timeout = config.timeout ? config.timeout : 20000;
      var _this = this;
      this.sock = new IO.TCPSocket();
      /** @ignore */
      this.sock.onBlob = function(blob) {
	 _this.onBlob(blob);
      };
      /** @ignore */
      this.sock.onClose = function(status) {
         _this.config = null;
         _this.buffer = "";
         _this.listener = null;
	 _this.onClose(status);
      };
      this.sock.open(config.host, config.port, function(status) {
	 if (status.code != 0) {
	    callback(status);
	    return;
	 } 
	 if (_this.config.username==undefined) {
	    callback(new AOP.OK(_this));
	    return;
	 }
	 assert(_this.config.password!=undefined, "no password is set");
	 _this.login(function(result) {
	    if (result.code!=0) {
	       callback(new AOP.ERR("Telnet login failed", result));
	       return;
	    }
	    callback(new AOP.OK(_this));
	 });
      });
   },

   /** 
    * Handles data from underlying tcp socket.
    * @private 
    */
   onBlob: function(blob) {
      var str = blob.data;

      if (this.telnetMode) {
	 // combine CR+NULL into CR
	 str = str.replace(new RegExp(this.CR+this.NULL), "\n");
      }
      if (!this.binMode) {
	 // combine EOL into "\n"
	 str = str.replace(new RegExp(this.EOL), "\n") ;
      }
      
      var arr = [];
      var pos = 0;
      while(pos < str.length) {
	 var c = str.charCodeAt(pos++);
	 if (c == this.IAC) {
	    if (pos==str.length) {
	       break;
	    }
	    c = str.charCodeAt(pos++);
	    if (c == this.IAC) {
	       arr.push(String.fromCharCode(this.IAC));
	       continue;
	    }
	    if (c == this.AYT) {     //  respond to "IAC AYT" (are you there)
	       this.write("nobody here but us pigeons" + this.EOL);
	       continue;
	    }
	    if (pos==str.length) {
	       break;
	    }	
	    if (c == this.DO) {   // # respond to "IAC DO x"
	       c = str.charCodeAt(pos++);
	       if (c==this.OPT_BINARY) {
		  this.write(String.fromCharCode(this.IAC) + String.fromCharCode(this.WILL) + String.fromCharCode(this.OPT_BINARY));
		  assert(0, "unimplemented");
	       } else {
		  this.write(String.fromCharCode(this.IAC) + String.fromCharCode(this.WONT) + String.fromCharCode(c));
	       }
	       continue;
	    }
	    if (c == this.DONT) {   //  respond to "IAC DON'T x" with "IAC WON'T x"
	       c = str.charCodeAt(pos++);
	       this.write(String.fromCharCode(this.IAC) + String.fromCharCode(this.WONT) + String.fromCharCode(s));
	       continue;
	    }
	    if (c == this.WILL) {   //   # respond to "IAC WILL x"
	       c = str.charCodeAt(pos++);
	       if (c==this.OPT_BINARY) {
		  this.write(String.fromCharCode(this.IAC) + String.fromCharCode(this.DO) + String.fromCharCode(this.OPT_BINARY));		    
	       } else if (c==this.OPT_ECHO) {
		  this.write(String.fromCharCode(this.IAC) + String.fromCharCode(this.DO) + String.fromCharCode(this.OPT_ECHO));		    
	       } else if (c==this.OPT_SGA) {
		  this.sgaOption = true;
		  this.write(String.fromCharCode(this.IAC) + String.fromCharCode(this.DO) + String.fromCharCode(this.OPT_SGA));		    
	       } else {
		  this.write(String.fromCharCode(this.IAC) + String.fromCharCode(this.DONT) + String.fromCharCode(c));
	       }
	       continue;
	    }
	    if (c == this.WONT) {   //   # respond to "IAC WONT x"
	       c = str.charCodeAt(pos++);
	       if (c==this.OPT_ECHO) {
		  this.write(String.fromCharCode(this.IAC) + String.fromCharCode(this.DONT) + String.fromCharCode(this.OPT_ECHO));		    
	       } else if (c==this.OPT_SGA) {
		  this.sgaOption = false;
		  this.write(String.fromCharCode(this.IAC) + String.fromCharCode(this.DONT) + String.fromCharCode(this.OPT_SGA));		    
	       } else {
		  this.write(String.fromCharCode(this.IAC) + String.fromCharCode(this.DONT) + String.fromCharCode(c));
	       }
	       continue;
	    }
	    continue;
	 } 
         
	 // default, no decoding
	 arr.push(String.fromCharCode(c));
      }
      str = arr.join('');
      this.buffer += str;
      //QUACK(0, sprintf("TELNET BLOB: %d '%s'", str.length, str));
      //QUACK(0, sprintf("BLOB: '%s'", str));
      // notify the one waiting for data
      if (this.listener) {
	 this.listener();
      }
   },


   /** 
    * Closes unserlying IO.TCP.Socket and connection.
    * @param status   
    * @param callback Invoked after underlying socket has been closed.
    */
   close: function(/** AOP.Result */status, /** DFLT_ASYNC_CB */callback) {
       if (callback&&BC.is(callback)) { return BC.exec(arguments.callee, this, arguments); }
       this.sock.close(status, callback);
   },
   
   
   /** 
    * Invoked when the underlying socket is closed.
    * @param status AOP.OK or AOP.ERR
    */
   onClose: function(/** AOP.OK */status) {
      QUACK(0, "Telnet.Client", sprintf("%s closed with '%s'", this, status.toString()));
   },


   /** 
    * Write bytes unmodified to underlying socket connection.
    * @param line String
    */
   write: function(/** String */line) {
      this.sock.send(line);
   },


   /** 
    * Send echo-on/off to server.
    * @param on Boolean
    */
   echo: function(/** Boolean */on) {
      if (on) {
	 this.write(String.fromCharCode(this.IAC) + String.fromCharCode(this.DO) + String.fromCharCode(this.OPT_ECHO));
      } else {
	 this.write(String.fromCharCode(this.IAC) + String.fromCharCode(this.DONT) + String.fromCharCode(this.OPT_ECHO));
      }
   },


   /** 
    * Transfer a line accordng to telnet protocol.
    * @param line String
    */
   print: function(/** String */line) {
      assert(!this.binMode);
      if (this.telnetMode) {
	 line = line.replace(new RegExp(this.IAC), this.IAC+this.IAC); 
      }
      if (this.sgaOption) {
	 line = line.replace(/\n/, this.CR+this.NULL);
      } else {
	 // NONE send EOL --> CR+LF
	 line = line.replace(/\n/, this.EOL);
      }
      //QUACK(0, sprintf("WRITE: %H", line));
      this.write(line);
   },


   /**
    * @returns {String} string.
    */
   toString: function() {
      return "telnet://" + this.config.host + ":" + this.config.port;
   },


   /** 
    * Wait for String/RegEx to appear in input. Any input before given String/RegEx is discarded from
    * internal buffer and returned in the 'data' property of the AOP.OK instance in the callback.
    * After that, the internal buffer contains everything after the matched text.
    * @param waitFor     String or RegEx, the text to wait for
    * @function callback Function called with a AOP.OK or AOP.ERR instance
    */
   waitFor: function(/** Object */waitFor, /** DFLT_ASYNC_CB */callback) {
       if (BC.is(callback)) { return BC.exec(arguments.callee, this, arguments); }
      var timeout = this.config.timeout;
      var _this = this;
      var timer = null;
      var timeoutf = function() {
	 QUACK(2, "Telnet.Client", "waitFor: timout in waitFor at " + Timer.get());
	 _this.listener=null;
	 callback(Timeout2ERR());
	 return;
      };
      var dataf = function() {
	 var str = _this.buffer;
	 var txt = null;
	 if (waitFor instanceof RegExp) {
	    var match = waitFor.exec(str);
	    if (!match) {
	       return false;
	    }
	    txt = match[1];
	    assert(txt);
	 } else {
	    txt = waitFor;
	 }
	 assert(typeof(txt)=='string');
	 var idx = str.indexOf(txt);
	 if (idx < 0) {
	    return false;
	 }
	 _this.listener=null;
	 if (timer) {
	    QUACK(2, "Telnet.Client", "waitFor timer deleted at " + Timer.get());
	    Timer.remove(timer);
	 }
	 var resp = _this.buffer.substr(0, idx);
	 _this.buffer = _this.buffer.substring(idx+txt.length);
	 _this.buffer = _this.buffer.trimLeft();
	 callback(new AOP.OK(resp.trim()));
	 return true;
      };
      if (dataf()) {
	 QUACK(2, "Telnet.Client", "waitFor got immediate answer");
	 return;
      }
      QUACK(2, "Telnet.Client", "waitFor timout programmed at " + Timer.get());
      timer = Timer.timeoutIn(timeout, timeoutf);
      assert(this.listener==null);
      this.listener = dataf;
   },


   /** 
    * Wait for prompt or return timeout. Uses waitFor internaly, the prompt
    * is configured at the time the method open is called.
    * @param callback
    */
   waitForPrompt: function(/** DFLT_ASYNC_CB */callback) {
       if (BC.is(callback)) { return BC.exec(arguments.callee, this, arguments); }
      assert(this.config.prompt, "no prompt specified in open");
      var re = new RegExp("(\n"+this.config.prompt+"\s*)");
      this.waitFor(re, callback);
   },


   /** 
    * Login into server. 'username' etc is specified at the time the open method is called.
    * @param callback
    */
   login: function(/** DFLT_ASYNC_CB */callback) {
       if (BC.is(callback)) { return BC.exec(arguments.callee, this, arguments); }
      assert(this.config.userlogin);
      assert(this.config.passwordlogin);
      assert(this.config.username);
      assert(this.config.password);
      var username = this.config.username;
      var password = this.config.password;
      //QUACK(0, "LOGIN...");
      var _this = this;
      var promptf = function() {
	 _this.waitForPrompt(function(status) {
	    if (status.code!=0) {
	       callback(new AOP.ERR("Invalid username/password: no prompt"));
	       return;
	    }      
	    callback(status);
	 });
      };
      var passwordf = function() {
	 _this.waitFor(_this.config.passwordlogin, function(status) {
	    if (status.code!=0) {
	       callback(new AOP.ERR("Did not receive password prompt", status));
	       return;
	    }
	    //QUACK(0, "Write password...");
	    _this.print(password+"\n");
	    promptf();
	 });
      };
      var userf = function() {
	 _this.waitFor(_this.config.userlogin, function(status) {
	    if (status.code!=0) {
	       callback(new AOP.ERR("Did not receive username prompt", status));
	       return;
	    }
	    //QUACK(0, "Write username...");
	    _this.print(username+"\n");
	    passwordf();
	 });
      };
      userf();
   },


   /** 
    * Send command and wait for prompt. The response of the command is stored in the 'data'
    * property of the AOP.OK instance on callback invocation.
    * @param command     Command to send
    * @param stripPrompt Remove prompt from response
    * @param callback
    */
   exchange: function(/** String */command, /** Boolean */stripPrompt, /** DFLT_ASYNC_CB */callback) {
       if (BC.is(callback)) { return BC.exec(arguments.callee, this, arguments); }
      var _this = this;
      var f = function(result) {
	 if (result.code!=0) {
	    callback(result);
	    return;
	 }
	 var resp = result.getData();
	 if (stripPrompt) {
	    var re = new RegExp("(^.+[\n\r])");
	    var match = re.exec(resp);
	    if (match) {
	       var text = match[1];
	       assert(text);
	       if (text.indexOf(command)>=0) {
		  //QUACK(0, "TEXT: '" + text + "'");
		  var idx = resp.indexOf(text);
		  assert(idx>=0);
		  resp = resp.substr(idx+text.length);
	       }
	    }
	 }
	 QUACK(2, "Telnet.Client", command + " ----> \n" + resp);
	 callback(new AOP.OK(resp));
      };
      this.print(command+"\n");
      this.waitForPrompt(f);
   }
};











//==================================================================================================
//
// IO.Telnet.Server
//
//==================================================================================================


/**
 * IO.Telnet.Server encapsulates a simple telnet server.
 * @class
 * @constructor
 */
IO.Telnet.Server = function() {};


/** Prototype */
IO.Telnet.Server.prototype = {
   /**
    * @type IO.TCPServer
    */
   serverSocket: null,
   /** 
    * Create telnet server listening at specified port.
    * @param port      TCP port, must be > 0
    * @param callback  
    * @throws {AOP.Exception}
    */
   open: function(/** Number */port, /** DFLT_ASYNC_CB */callback) {
       if (BC.is(callback)) { return BC.exec(arguments.callee, this, arguments); }
      var _this = this;
      this.serverSocket = new IO.TCPServer();
      /** @ignore */
      this.serverSocket.onClose = function(status) {
	 _this.onClose(status);
      };
      /** @ignore */
      this.serverSocket.onAccept = function(sock) {
         _this.onAccept(new IO.Telnet.Server.Client(sock, _this));
      };
      this.serverSocket.open(port, callback);
   },

    /**
     * Close telnet server
     * @private
     */
    close: function(/** DFLT_ASYNC_CB */callback) {
	if (BC.is(callback)) { return BC.exec(arguments.callee, this, arguments); }
	this.serverSocket.close(new AOP.OK(), callback);
    },

   /** 
    * Invoked when the underlying socket is closed.
    * @param status AOP.OK/AOP.ERR instance
    */
   onClose: function(/** AOP.OK */status) {
      QUACK(1, "Telnet.Server", "got closed: " + status.toString());
   },

   /** 
    * Invoked when a new telnet client connection has been established.
    * @param tconn   Telnet.Server.Client
    */
   onAccept: function(/** Telnet.Server.Client */tconn) {}
  
};

//==================================================================================================
//
// IO.Telnet.Server.Client
//
//==================================================================================================
/**
 * @class IO.Telnet.Server.Client encapsulates the socket representing a connection to the telnet server
 * @constructor
 * @param sock   IO.TCPSocket
 * @param server IO.Telnet.Server
 */
IO.Telnet.Server.Client = function(/** IO.TCPSocket */sock, /** IO.TCPServer */server) {
   var _this = this;
   /** IO.TCPSocket */
   this.sock = sock;
   /** IO.Telnet.Server */
   this.server = server;
   /** @private */
   this.buf = "";
   /** @private */
   this.listener = null;
   /** @ignore */
   this.sock.onClose = function(status) {
      _this.onClose(status);
   };
   /** @ignore */
   this.sock.onBlob = function(blob) {
       var data = blob.data;
       if (data.length === 0) {
	   return;
       }
       var s = blob.data.toBinaryString(0, data.length);
      _this.buf += s;
      var idx = _this.buf.indexOf('\n');
      if (idx < 0) {
	 return;
      }
      var line = _this.buf.substr(0, idx);
      if (idx+1 < _this.buf.length) {
	 _this.buf = _this.buf.substr(idx+1);
      } else {
	 _this.buf = "";
      }
      if ((line.length > 0) && (line.charCodeAt(line.length-1) == '\r')) {
	 line = line.substr(0, line.length-1);
      }
      if (_this.listener) {
         var cb = _this.listener;
         _this.listener = null;
         cb(line);
      }
   };
};

/** Prototype */
IO.Telnet.Server.Client.prototype = {
   /**
    * Send line to client.
    * @param line
    */
   write: function(/** String */line) {
      this.print(line);
   },
   /**
    * Send line to client
    * @param line
    */
   print: function(/** String */line) {
      line = line.replace(/\n/g, "\r\n");
      this.sock.send(line);
   },
   /**
    * Send line to client where newline is added.
    * @param line
    */
   println: function(/** String */line) {
      line += "\n";
      this.print(line);
   },
   /**
    * Close underlying socket.
    * @param AOP.OK or AOP.ERR instance
    */
   close: function(/** AOP.OK */status) {
      this.sock.close(status, function(status){ ; });
   },
   /** 
    * Invoked when a telnet client connection was closed.
    * @param status  AOP.ERR or AOP.OK instance
    */
   onClose: function(/** AOP.OK */status) {
      QUACK(0, "Telnet.Client", "got closed: " + status.toString());
   },
   /**
    * Forward the next line received to specified callback. After that, the listener is removed.
    * To receive another line, the callback must be installed again by calling readln.
    * @param callback   Function to receive the line from the client
    */
   readln: function(callback) {
      assert(!this.listener, "invalid state: telnet readln callback already set");
      this.listener = callback;
   }
};
