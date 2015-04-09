
//==================================================================================================
//
// 
//
//==================================================================================================
if(typeof LRSC === 'undefined') LRSC = {};  // in case only common/lsrc is used in comote

LRSC.IO = {};
LRSC.EV = {};

LRSC.DEFAULT_PORT = {
    SAGUARO_AIRIF : 53019 ,  // UDP for air interface of saguaro
    NCCSIM_AIRIF  : 53018 ,  // UDP for air interface of NCC
    NWK_GW        : 53017 ,  // TCP server port of NWK: accepts gateway connections
    NWK_ART       : 53016 ,  // TCP server port of NWK: ping NWK to open a reverse link
    ART_APP       : 53014 ,  // TCP server port of ART: accepts application connections
    NCC           : 53054 ,  // TCP server port of NCC for LRSC controlled network components
    NCC_APP       : 53058 ,  // TCP server port of NCC for attaching applications (JSON link)
    APP           : 53055 ,  // TCP server port of ART for applications
    SIM_JSON      : 53057    // Simulator command interface 
};


LRSC.IO.MAGIC_BIN  = Util.Formatter.hexToBin("0500FF23AF452156");
LRSC.IO.MAGIC_JSON = "JSON_000";

LRSC.IO.EUIDOM = new ENUM("euidom", "APP", "NWK", "ART", "GW", "NCC", "DEV", "SIM", "ANY");

LRSC.IO.MY_ENTITY = {    // some default entity
    eui   : "FF-00-00-00-00-00-00-00",
    euidom: LRSC.IO.EUIDOM.APP,
    major : 1,
    minor : 0,
    build : 0,
    name  : "Sonoran LRSC"
};

LRSC.EV.SRC = new ENUM("evsrc", "APP", "NWK", "ART", "GW", "NCC", "DEV", "SIM");
LRSC.EV.SEV = new ENUM("evsev", null, "EMERG", "ALARM", "HEALTH", "ERR","WARN","NOTICE","INFO","DEBUG");

LRSC.IO.MSGTAG = new ENUM('msgtag',
			  1,
			  "hello"   ,
			  "gup"     , "gdn"    , 
			  "ajr_O1"  , "aja_O1" ,
			  "aup"     , "adn"    ,
			  "ajn"     , "adni"   ,
			  "gwpos"   , "gwbcn"  ,
			  "arxinfo" , "prejoin", 
			  "pctrl"   , "gwcmd"  ,
			  "apos"    , "gwrcnf_O1" ,
			  "gwhello" ,
			  "cmdreq"  , "cmdresp",
			  "gscmd"   , "gwinfo" ,
			  "tracert" ,
			  "qlist"   , "euilist", 
			  "adevinfo", "eplist" ,
			  "devctrl" ,
			  "aja"     , "ajr"    ,
			  "appjn"   , "ajc"    ,
			  "gwrcnf"  ,
			  "ndevinfo",
			  "cmderr"  ,
			  1024,
			  "EV_BASE"       ,
			  "specCond"      ,  
			  "lostFrame"     ,  
			  null            ,  
			  "drChange"      ,  
			  "frameXair"     ,  
			  "joininfo_O1"   ,  
			  "joininfo"      ,  
			  "gwchgpos"      ,  
			  "pjstatus"      ,  
			  "dfinfo"        ,
			  "spe3Cond"      ,
			  "dataXapp"      ,
			  "adrDecision"   ,
			  "devCond"       ,
			  "devPos"
			 );



