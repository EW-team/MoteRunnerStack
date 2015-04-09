//  (C) COPYRIGHT INTERNATIONAL BUSINESS MACHINES CORPORATION 2006-2010
//                       ALL RIGHTS RESERVED
//        IBM Research Division, Zurich Research Laboratory
// --------------------------------------------------------------------




/**
 * Map of port names to ports.
 * @type Object
 * @private
 */
Sonoran.Registry.ports = {};

/**
 * @type Number
 * @private
 */
Sonoran.Registry.PORT_RANGE_START = 1;

/**
 * @type Number
 * @private
 */
Sonoran.Registry.PORT_RANGE_END = 65536;

/**
 * @type Number
 * @private
 */
Sonoran.Registry.PORT_RANGE_INIT = Math.floor(Math.random() * 256) + Sonoran.Registry.PORT_RANGE_START;

/**
 * Last port allocated.
 * @type Number
 * @private
 */
Sonoran.Registry.lastPort = null;





/**
 * Allocate/reserve a local port for the communication with motes.
 * @param port                  Port to allocate, optional, if undefined, the system picks an available port.
 * @param name                  Optional name for port, by default port itself
 * @returns {Number} the port having been reserved or throws an exception in case of error
 * @static
 * @private
 */
Sonoran.Registry.registerPort = function(/** Number */port, /** String */name) {
    assert(port==undefined || typeof(port)=='number');
    if (!port) {
	if (this.lastPort == null) {
	    this.lastPort = this.PORT_RANGE_INIT;
	} else {
            this.lastPort += 1;
            if (this.lastPort >= this.PORT_RANGE_END) {
                this.lastPort = this.PORT_RANGE_START;
            }
        }
	var p;
	for (p = this.lastPort; p < this.PORT_RANGE_END; p++) {
	    if (!this.ports[p]) {
		port = p;
		break;
	    }
	}
	if (!port) {
	    for (p = this.PORT_RANGE_START; p < this.lastPort; p++) {
		if (!this.ports[p]) {
		    port = p;
		    break;
		}
	    }
	}
	if (!port) {
	    throw new Exception("No free socket port left in Registry");
	}
	this.lastPort = port;
    }
    if (this.ports[port]) {
	throw new Exception(sprintf("Socket port %d already reserved in registry", port));
    }
    this.ports[port] = { port: port, name: name?name:port };
    QUACK(4, "Registry.registerPort", "reserve " + port);
    this.signalEvent(new Sonoran.Event.Port('register', port));
    return port;
};


/**
 * Release a port. Throws an exception in case of error.
 * @param port   Port to release
 * @static
 * @private
 */
Sonoran.Registry.deregisterPort = function(/** Number */port) {
    assert(typeof(port)=='number');
    if (!this.ports[port]) {
	throw new Exception(sprintf("Socket port %d is not reserved", port));
    }
    this.signalEvent(new Sonoran.Event.Port('deregister', port));
    delete this.ports[port];
};


/**
 * Assert a port being reserved.
 * @static
 * @private
 */
Sonoran.Registry.assertPort = function(/** Number */ port) {
    assert(typeof(port)=='number');
    assert(this.ports[port], "port not registered: " + port);
};


/**
 * Return whether port is reserved.
 * @param port Port
 * @returns {String} name of port or null
 * @static
 * @private
 */
Sonoran.Registry.hasPort = function(/** Number */ port) {
    assert(typeof(port)=='number');
    var p = this.ports[port];
    return p?p.name:null;
};


/**
 * Get port number by name.
 * @param name Name
 * @returns {Number} port if registered or null
 * @static
 * @private
 */
Sonoran.Registry.getPort = function(/** String */name) {
    assert(typeof(name)=='string');
    for (var p in this.ports) {
	if (this.ports[p].name == name) {
	    return this.ports[p].port;
	}
    }
    return null;
};


/**
 * @returns {Object} map of port numbers to names. Do not modify the returned object.
 * @static
 * @private
 */
Sonoran.Registry.getPorts = function() {
    return this.ports;
};


















