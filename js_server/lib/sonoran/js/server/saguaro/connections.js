// //  (C) COPYRIGHT INTERNATIONAL BUSINESS MACHINES CORPORATION 2006-2010
// //                       ALL RIGHTS RESERVED
// //        IBM Research Division, Zurich Research Laboratory
// // --------------------------------------------------------------------

// /**
//  * Sonoran.Saguaro.Connections manages all open saguaro connections.
//  * @class
//  */
// Saguaro.Connections = {
//    /**
//     * @type Saguaro.Connection[]
//     * @private
//     */
//    connections: [],

//     /**
//      * Returns the saguaro connection where the specified function returns true.
//      * @param func Function
//      * @returns {Saguaro.Connectio}  connection or null
//      * @static
//      */
//     lookupByFunc: function(/** function */func) {
//        var ret = [];
//        for (var i = 0; i < this.connections.length; i++) {
//           var conn = this.connections[i];
//           if (func(conn)) {
//              ret.push(conn);
//           }
//        }
//        assert(ret.length<=1);
//        return ret.length==0 ? null : ret[0];
//     },


//    /**
//     * Add a new connection.
//     * @param conn The new connection
//     * @static
//     * @private
//     */
//    add: function(/** Sonoran.Saguaro.Connection */conn) {
//       for (var i = 0; i < this.connections.length; i++) {
//          var c = this.connections[i];
//          if (c == conn) {
//             throw "Connection already registered: " + c;
//          }
//          if (c.host == conn.host && c.port == conn.port) {
//             throw "Connection to specified host and port already exists: " + conn;
//          }
//       }
//       this.connections.push(conn);
//       Sonoran.Registry.signalEvent(new Sonoran.Event.Saguaro(Sonoran.EV_NAME_CONNECT, conn, conn.getInfo()));
//    },


//    /**
//     * Remove a connection. The connections must have been closed before.
//     * @param conn The connection to remove
//     * @static
//     * @private
//     */
//    remove: function(/** Sonoran.Saguaro.Connection */conn) {
//       for (var i = 0; i < this.connections.length; i++) {
//          var c = this.connections[i];
//          if (c == conn) {
//             this.connections.splice(i, 1);
//             //Sonoran.Registry.signalEvent(new Sonoran.Event.SaguaroDisconnect(conn));
// 	     Sonoran.Registry.signalEvent(new Sonoran.Event.Saguaro(Sonoran.EV_NAME_DISCONNECT, conn, null));
//             return;
//          }
//       }
//       //QUACK(0, "Ignore non-existing connection: " + conn);
//    },


//    /**
//     * Return saguaro connection matching specified host and port.
//     * @param host
//     * @param port
//     * @returns {Saguaro.Connection} connection or null
//     * @static
//     */
//     lookupByHostPort: function(/** String */host, /** Number */port) {
//        for (var i = 0; i < this.connections.length; i++) {
//           var conn = this.connections[i];
//           if (conn.host==host && conn.port==port) {
//              return conn;
//           }
//        }
//        return null;
//     },


//     /**
//      * Return all known saguaro connections. Returned object is read-only.
//      * @returns {Saguaro.Connection[]}
//     *  @static
//      */
//     getAll: function() {
//        return this.connections;
//     },


//    /**
//      * Lookup saguaro connection for Saguaro.DFLT_HOST and Saguaro.DFLT_PORT (localhost, 44044).
//      * @returns {Saguaro.Connection} null or Saguaro.Connection
//      * @static
//      */
//     getDefault: function() {
//        return this.lookupByHostPort(Saguaro.DFLT_HOST, Saguaro.DFLT_PORT);
//     },


//    /**
//      * Return the single connection if only one connection has been setup.
//      * @returns {Saguaro.Connection} null or Saguaro.Connection
//      * @throws {Exception} if multiple connections are available
//      * @static
//      */
//     getSingle: function() {
// 	if (this.connections.length===0) {
// 	    return null;
// 	}
// 	if (this.connections.length===1) {
// 	    return this.connections[0];
// 	}
// 	throw new Exception("Multiple Saguaro connections are available");
//     },


//     /**
//      * Does an active connection exist?
//      * @returns {Boolean} flag
//      * @static
//      */
//     have: function() {
//        return this.connections.length>0;
//     },


//    /**
//     * Close all current connections and quit their associated saguaro processes.
//     * @param callback
//     * @param conns   Optional
//     * @param idx     Optional
//     * @static
//     * @private
//     */
//    exitAll: function(/** DFLT_ASYNC_CB */callback, /** Saguaro.Connection[] */conns, /** Number */idx) {
//       var _this = this;
//       if (idx==undefined) {
//          conns = arraycopy(this.connections);
//          idx = -1;
//       }
//       idx += 1;
//       if (idx == conns.length) {
//          assert(this.connections.length==0, "Saguaro connections werent all closed, new one appeared in between!");
//          callback(new AOP.OK());
//          return;
//       }
//       var conn = conns[idx];
//       conn.exit(function(status) {
//          if (status.code != 0) {
//             callback(new AOP.ERR("Cannot close and exit current saguaro connection(s)", undefined, status));
//          } else {
//             _this.exitAll(callback, conns, idx);
//          }
//       });
//    }
// };



// /*
//  * Listener for log level changes. These are forwarded to all connections.
//  */
// Logger.logLevelListeners.add(function() {
//     var logLevels = Logger.getLogLevels();
//     var descrs = [];
//     var conns = Saguaro.Connections.getAll();
//     for (var i = 0; i < conns.length; i++) {
// 	var conn = conns[i];
// 	descrs.push(new Execute.Descr(conn.logConfig, conn, logLevels));
//     }
//     if (descrs.length>0) {
// 	Execute.OneByOne(descrs, function(status) {
//             if (status.code != 0) {
//                 Logger.err("Could not modify log levels on saguaro processes: " + status);
//             }
//         });
//     }
// });
