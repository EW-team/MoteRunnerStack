#!sonoran

Runtime.include("server/sonoran/sonoran.js");
Runtime.include("tool/mib520eeprom.js");

var TOOL = {};

TOOL.EEPROM_DEFAULT = [
    IRIS_EEPROM.DEFS.EEPROM_CURRENT_MAGIC,
    IRIS_EEPROM.DEFS.EEPROM_CURRENT_VERSION,
    0xFF,0xFF,0xFF,0xFF,0xFF,0xFF,0xFF,0xFF, // mote will generate a random address
    IRIS_EEPROM.DEFS.CONNECTIVITY_AUTO,
    IRIS_EEPROM.DEFS.EEPROM_BATTERY_ADC4MIN>>8,
    IRIS_EEPROM.DEFS.EEPROM_BATTERY_ADC4MIN&0xFF,
    IRIS_EEPROM.DEFS.EEPROM_BATTERY_SCALE,
    192,168,1,200, // default IP address
    39,15,         // default UDP port  9999
    255,255,255,0, // default subnet mask
    192,168,1,1    // default gateway
];

TOOL.init = function (argv) {
    this.opts              = {   CMD:  null };
    this.opts.helpOpt      = new GetOpt.HelpOpt();
    this.opts.eui          = new GetOpt.Simple('HH-HH-HH-HH-HH-HH-HH-HH',
					       'Specify a new mote 64-bit EUI using BIG endian.\n'+
    					       'Example: 02-00-00-00-44-33-22-11\n');
    this.opts.euiOpt       = new GetOpt.Option('e', '--eui', 0, null, null, this.opts.eui);
    this.opts.ip           = new GetOpt.Simple('a.b.c.d',
					       'Specify the IP address for an Ethernet mote.\n'+
					       'Used by Waspmote PRO with an Ethernet module.\n'+
    					       'Example: 192.168.1.200\n');
    this.opts.ipOpt        = new GetOpt.Option('i', '--ip', 0, null, null, this.opts.ip);
    this.opts.gw           = new GetOpt.Simple('a.b.c.d',
					       'Specify the address for the default IP Gateway.\n'+
					       'Used by Waspmote PRO with an Ethernet module.\n'+
    					       'Example: 192.168.1.1\n');
    this.opts.gwOpt        = new GetOpt.Option('g', '--gateway', 0, null, null, this.opts.gw);
    this.opts.sub          = new GetOpt.Simple('a.b.c.d',
					       'Specify the IP subnet mask.\n'+
					       'Used by Waspmote PRO with an Ethernet module.\n'+
    					       'Example: 255.255.248.0\n');
    this.opts.subOpt       = new GetOpt.Option('s', '--subnet', 0, null, null, this.opts.sub);
    this.opts.port         = new GetOpt.Simple('0-65535',
    					       'Specify the port number for an Ethernet mote.\n'+
					       'Used by Waspmote PRO with an Ethernet module.\n'+
    					       'Example: 9999\n');
    this.opts.portOpt      = new GetOpt.Option('p', '--port', 0, null, null, this.opts.port);

    this.opts.argSpec      = new GetOpt.Seq(
	[ new GetOpt.OptionSet([ this.opts.helpOpt,
				 this.opts.euiOpt,
				 this.opts.ipOpt,
				 this.opts.gwOpt,
				 this.opts.subOpt,
				 this.opts.portOpt
			       ])], 
	1);
    this.opts.CMD = new GetOpt.Cmd("mreeprom", this.opts.argSpec,
				   "Generate EEPROM settings in Intel HEX format, used by the Mote Runner firmware.\n" +
				   "Simply redirect or copy the output to/into a file, e.g., myeeprom.hex.\n\n" +
				   "Afterwards, use the tool of your choice to program the EEPROM."
			          );

    if( !this.opts.CMD.parse(argv) ) {
	Runtime.exit(12);
    }

    if (this.opts.euiOpt.isSet()){
	var eui = this.opts.eui.getArg();
	if (eui.match(/^(\d\d-){7}\d\d$/)) {
	    bytes = eui.split("-");
	    for (i=0;i<bytes.length;i++)
		this.EEPROM_DEFAULT[2+i]=bytes[i];
	}
	else {
	    printf("Invalid EUI-64!\n" + 
		   "Expected input must be in the format HH-HH-HH-HH-HH-HH-HH-HH.\n");
	    Runtime.exit(-1);
	}
    }

    if (this.opts.ipOpt.isSet()){
	var ip = this.opts.ip.getArg();
	if (ip.match(/^(\d{1,3}\.){3}\d{1,3}$/)) {
	    bytes = ip.split(".");
	    for (i=0;i<bytes.length;i++)
		this.EEPROM_DEFAULT[IRIS_EEPROM.DEFS.EEPROM_OFF_ETHERNET_ADDR+i]=bytes[i];
	}
	else {
	    printf("Invalid IP address format!\n" + 
		   "Expected input must be in the format a.b.c.d\n");
	    Runtime.exit(-1);
	}
    }

    if (this.opts.gwOpt.isSet()){
	var gw = this.opts.gw.getArg();
	if (gw.match(/^(\d{1,3}\.){3}\d{1,3}$/)) {
	    bytes = gw.split(".");
	    for (i=0;i<bytes.length;i++)
		this.EEPROM_DEFAULT[IRIS_EEPROM.DEFS.EEPROM_OFF_ETHERNET_GWAR+i]=bytes[i];
	}
	else {
	    printf("Invalid IP address format!\n" + 
		   "Expected input must be in the format a.b.c.d\n");
	    Runtime.exit(-1);
	}
    }

    if (this.opts.subOpt.isSet()){
	var sub = this.opts.sub.getArg();
	if (sub.match(/^(\d{1,3}\.){3}\d{1,3}$/)) {
	    bytes = sub.split(".");
	    for (i=0;i<bytes.length;i++)
		this.EEPROM_DEFAULT[IRIS_EEPROM.DEFS.EEPROM_OFF_ETHERNET_SUBR+i]=bytes[i];
	}
	else {
	    printf("Invalid IP subnet mask format!\n" + 
		   "Expected input must be in the format a.b.c.d\n");
	    Runtime.exit(-1);
	}
    }

    if (this.opts.portOpt.isSet()){
	var port = this.opts.port.getArg();
	if (port.match(/^\d{1,5}$/)) {
	    port = parseInt(port);
	    //printf("---%04X\n",port);
	    this.EEPROM_DEFAULT[IRIS_EEPROM.DEFS.EEPROM_OFF_ETHERNET_PORT+0]=port/256;
	    this.EEPROM_DEFAULT[IRIS_EEPROM.DEFS.EEPROM_OFF_ETHERNET_PORT+1]=(port&0xFF);
	}
	else {
	    printf("Invalid IP address format!\n" + 
		   "Expected input must be in the format a.b.c.d\n");
	    Runtime.exit(-1);
	}
    }
    
    // --------------------------------------------------------------------------------
    // For details regarding the format check: http://en.wikipedia.org/wiki/Intel_HEX
    var checksum = 0;
    var newline = true;
    var len = this.EEPROM_DEFAULT.length;
    len = (len+16-len%16); // padd with zeroes
    var addr = 0;
    for (addr=0; addr<len; addr++) {
	if (addr!=0 && addr%16==0) {
	    //printf("A:%02X\n",addr);
	    checksum += 16+(addr-16)+0; // add address bytes
	    checksum &= 0xFF;
	    checksum = 0x100-checksum;  // 2's complement
	    checksum &= 0xFF;
	    printf("%02X\n", checksum);
	    newline = true;
	    checksum = 0;
	}
	if (newline) {
	    var count= len-addr;
	    // we use 16 bytes per line and have data records (type=0x00)
	    if (count<16) // padding
		for (var k=0;k<count;k++) printf("00");
	    count = 16;
	    printf(":%02X%04X00",count,addr);
	    newline = false;
	}
	var byte = this.EEPROM_DEFAULT[addr];
	//printf(typeof(byte));
	//printf(typeof(checksum));
	byte = parseInt((byte)? byte:0);
	printf("%02X", byte);
	add = checksum + byte;
	c = checksum
	checksum += byte;
	checksum &= 0xFF;
	//printf("  --  %02X --- %d+%d=%d\n", checksum, c,byte,add);
    }
    checksum += 16+(addr-16)+0; // add address bytes
    checksum &= 0xFF;
    checksum = 0x100-checksum;  // 2's complement
    checksum &= 0xFF;
    printf("%02X\n", checksum);
    println(":00000001FF"); // end of file

    Runtime.exit(0);
}

TOOL.init(ARGV);
