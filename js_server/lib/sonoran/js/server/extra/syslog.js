var Syslog = {
    
   MONTHS: [
      "Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"
   ],

   EMERGENCY: 0,
   ALERT: 1,
   CRITICAL: 2,
   ERROR: 3,
   WARNING: 4,
   NOTICE: 5,
   INFORMATIONAL: 6,
   DEBUG: 7
};


Syslog.Device = function(/** String */host, /** Number */port, /** DFLT_ASYNC_CB */callback) {
    if (BC.is(callback)) { return BC.exec(arguments.callee, this, arguments); }
    if (/(\d+\.)+\.\d+/.test(host)) {
	this.rmthost = host;
    } else {
	var info = IO.Inet.gethostbyname(host);
	if (!info || info.addresses.length==0) {
	    throw "Invalid host: " + host;
	}
	this.rmthost = info.addresses[0];
    } 
    this.rmtport = port;
    if (!this.rmtport) {
        this.rmtport = 514;
    }
    this.lochost = Inet.gethostname();
    var _this = this;
    this.socket = new IO.UDPSocket();
    this.socket.open(0, function(result) {
        if (result.code != 0) {
            callback(result);
        } else {
            callback(new AOP.OK(_this));
        }
    });
};

Syslog.Device.prototype = {
    toString: function() {
	return "SyslogClient:" + this.rmthost + ":" + this.rmtport;
    },

    send: function(content, tag, severity, facility) {
       if (!facility) {
          facility = 16;
       }
       if (!severity) {
          severity = Syslog.NOTICE;
       }
       if (!tag) {
          tag = "Sonoran";
       }
        if (facility>23) {
            throw "Invalid facility: " + facility;
        }
        if (severity>7) {
            throw "Invalid severity: " + severity;
        }
        var pri = facility*8 + severity;
        var msg = "<" + pri + ">";
        var d = new Date();
        msg += sprintf("%s %2d %02d:%02d:%02d", Syslog.MONTHS[d.getMonth()], d.getDate(), d.getHours(), d.getMinutes(), d.getSeconds());
        msg += " " + this.lochost;
        msg += " " + tag + ": ";
        msg += content;
        //QUACK(0, "MSG: " + msg);
        //QUACK(0, "DST: " + this.rmthost + ", " + this.rmtport);
        this.socket.send(msg, this.rmthost, this.rmtport);
    },

    close: function(callback) {
        if (this.socket) {
            this.socket.close(new AOP.OK(), callback);
            this.socket = null;
        } else {
            callback(new AOP.OK());
        }
    }
};

