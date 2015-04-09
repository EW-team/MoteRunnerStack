//  (C) COPYRIGHT INTERNATIONAL BUSINESS MACHINES CORPORATION 2006-2010
//                       ALL RIGHTS RESERVED
//        IBM Research Division, Zurich Research Laboratory
// --------------------------------------------------------------------



/**
 * @class
 * @private
 */
CLI.TelnetShell = {};

/**
 * @constant
 * @private
 */
CLI.TelnetShell.DFLT_PORT = parseInt(IO.Process.getenv("SONORAN_TELNET_PORT"));
if (!CLI.TelnetShell.DFLT_PORT) {
    CLI.TelnetShell.DFLT_PORT = 4990;
}

/**
 * @private
 */
CLI.TelnetShell.server = null;

/**
 * Installs the telnet server to listen and acept telnet connections.
 * @param port     Port to use, default 4990
 * @param callback Receives AOP.OK/AOP.ERR instance after server creation sucess or error
 * @static
 * @private
 */
CLI.TelnetShell.install = function(port, /** DFLT_ASYNC_CB */callback) {
    if (BC.is(callback)) { return BC.exec(arguments.callee, this, arguments); }
   var _this = this;
   if (!port) {
      port = CLI.TelnetShell.DFLT_PORT;
   }
   var srv = CLI.TelnetShell.server = new IO.Telnet.Server();
   srv.onAccept = function(conn) {
       var shell = new CLI.Shell(true);
       shell.setIOStreams(conn, conn);
       conn.onClose = function(status) {
	   shell.setIOStreams(null, null);
	   shell.close();
       };
       shell.close = function() {
           CLI.Shell.prototype.close.call(this);
	   if (this.instr) {
               this.instr.close(new AOP.OK());
	   }
       };

       shell.flush = function() {};
       shell.run();
   };
   srv.open(port, function(result) {
      if (result.code!==0) {
	  callback(new AOP.ERR("Cannot install telnet server", result));
      } else {
         callback(result);
      }
   });
};




