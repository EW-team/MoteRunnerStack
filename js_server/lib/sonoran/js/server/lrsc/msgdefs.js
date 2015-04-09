// updated by: make -C ~lrsc/src/xdrc



// =========================================================
// ------------------- DO NOT MODIFY -----------------------
// --------------- This is a copy of: msgdefs.js
// ------- Only modify the original source file! -----------
// ---------------------------------------------------------
// =========================================================



















// DO NOT CHANGE -- AUTOMATICALLY GENERATED BY XDR compiler
Runtime.include("server/lrsc/xdrlib.js");
XDR.msgid = {
    'MSG.cmd_t':	0,	'0':	'MSG.cmd_t',
    'MSG.qlist_t':	1,	'1':	'MSG.qlist_t',
    'MSG.eplist_t':	2,	'2':	'MSG.eplist_t',
    'MSG.euilist_t':	3,	'3':	'MSG.euilist_t',
    'MSG.mev_t':	4,	'4':	'MSG.mev_t',
    'MSG.errtext_t':	5,	'5':	'MSG.errtext_t',
};
XDR.addToNamespace(null, {
    ustime_t: {
        encode: function (cenv, obj) {
            XDR.s8.encode(cenv,XDR .encodeUstime(cenv,obj));
        },
        decode: function (cenv, obj) {
            return XDR .decodeUstime(cenv,XDR.s8.decode(cenv,obj));
        }
    }
    ,
});
XDR.addToNamespace(null, {
    eui_t: {
        encode: function (cenv, obj) {
            XDR.u8.encode(cenv,XDR .encodeEUI(cenv,obj));
        },
        decode: function (cenv, obj) {
            return XDR .decodeEUI(cenv,XDR.u8.decode(cenv,obj));
        }
    }
    ,
});
XDR.addToNamespace('MSG', {
    entity_t: { // superclass: 
        enum$0: {
            MAX_NAME_LEN: 128,	"128": "MAX_NAME_LEN" }
        ,MAX_NAME_LEN: 128
        ,
        decodeSize: 17,
        decodeCheck: function (dec) {
            dec.decodeCheck(17);
        },
        encodedSize: function (obj) {
            var sz = 17 +
            (obj.name==null ? 0 : obj.name.length) +
            7 + 0;
            return sz;
        }
        ,
        encode: function (/*XDR.ENCODER*/cenv,obj) {
            obj = obj||{};
            XDR.u1.encode(cenv,obj.domain);
            XDR.u1.encode(cenv,obj.major);
            XDR.u2.encode(cenv,obj.minor);
            XDR.u4.encode(cenv,obj.build);
            eui_t.encode(cenv,obj.eui);
            XDR.u1.encode(cenv, obj.name==null ? 0 : obj.name.length);
            cenv.encodeArray(obj.name,0,128,XDR.u1.encode);
            cenv.align(8);
        },
        decode: function (/*XDR.DECODER*/cenv,obj) {
            obj = obj||{};
            obj.domain = XDR.u1.decode(cenv);
            obj.major = XDR.u1.decode(cenv);
            obj.minor = XDR.u2.decode(cenv);
            obj.build = XDR.u4.decode(cenv);
            obj.eui = eui_t.decode(cenv);
            obj.name = new Array(XDR.u1.decode(cenv));
            cenv.decodeArray(obj.name,0,128,1,XDR.u1.decode);
            cenv.align(8);
            return obj;
        },
    }
    ,
    epinfo_t: { // superclass: 
        decodeSize: 57,
        decodeCheck: function (dec) {
            dec.decodeCheck(57);
        },
        encodedSize: function (obj) {
            var sz = 57 +
            MSG.entity_t.encodedSize(obj.entity) +
            0;
            return sz;
        }
        ,
        encode: function (/*XDR.ENCODER*/cenv,obj) {
            obj = obj||{};
            MSG.entity_t.encode(cenv,obj.entity);
            XDR.u4.encode(cenv,obj.peerAddr);
            XDR.u2.encode(cenv,obj.peerPort);
            XDR.u2.encode(cenv,obj.flags);
            ustime_t.encode(cenv,obj.lastConnect);
            ustime_t.encode(cenv,obj.lastDisconnect);
            XDR.u4.encode(cenv,obj.pendMsgs);
            XDR.u4.encode(cenv,obj.droppedMsgs);
            XDR.u4.encode(cenv,obj.maxPendMsgs);
            cenv.skip(4);
        },
        decode: function (/*XDR.DECODER*/cenv,obj) {
            obj = obj||{};
            obj.entity = MSG.entity_t.decode(cenv);
            obj.peerAddr = XDR.u4.decode(cenv);
            obj.peerPort = XDR.u2.decode(cenv);
            obj.flags = XDR.u2.decode(cenv);
            obj.lastConnect = ustime_t.decode(cenv);
            obj.lastDisconnect = ustime_t.decode(cenv);
            obj.pendMsgs = XDR.u4.decode(cenv);
            obj.droppedMsgs = XDR.u4.decode(cenv);
            obj.maxPendMsgs = XDR.u4.decode(cenv);
            cenv.skip(4);
            return obj;
        },
    }
    ,
    cmd_t: { // superclass: XDR.msg_t
        decodeSize: 4,
        decodeCheck: function (dec) {
            dec.decodeCheck(4);
        },
        encodedSize: function (obj) {
            var sz = 4;
            return sz;
        }
        ,
        ID: 0,
        encode: function (/*XDR.ENCODER*/cenv,obj) {
            obj = obj||{};
            XDR.u4.encode(cenv,obj.cmdid);
        },
        decode: function (/*XDR.DECODER*/cenv,obj) {
            obj = obj||{};
            obj.cmdid = XDR.u4.decode(cenv);
            return obj;
        },
    }
    ,
    qlist_t: { // superclass: MSG::cmd_t
        decodeSize: 24,
        decodeCheck: function (dec) {
            dec.decodeCheck(24);
        },
        encodedSize: function (obj) {
            var sz = 24;
            return sz;
        }
        ,
        ID: 1,
        encode: function (/*XDR.ENCODER*/cenv,obj) {
            MSG.cmd_t.encode(cenv,obj);
            XDR.u1.encode(cenv,obj.domain);
            XDR.u1.encode(cenv,obj.flags);
            cenv.skip(2);
            XDR.u4.encode(cenv,obj.offset);
            cenv.skip(4);
            eui_t.encode(cenv,obj.qeui);
        },
        decode: function (/*XDR.DECODER*/cenv,obj) {
            obj = MSG.cmd_t.decode(cenv,obj);
            obj.domain = XDR.u1.decode(cenv);
            obj.flags = XDR.u1.decode(cenv);
            cenv.skip(2);
            obj.offset = XDR.u4.decode(cenv);
            cenv.skip(4);
            obj.qeui = eui_t.decode(cenv);
            return obj;
        },
    }
    ,
    eplist_t: { // superclass: MSG::cmd_t
        enum$0: {
            MAX_LEN: 128,	"128": "MAX_LEN" }
        ,MAX_LEN: 128
        ,
        decodeSize: 16,
        decodeCheck: function (dec) {
            dec.decodeCheck(16);
        },
        encodedSize: function (obj) {
            var sz = 16 +
            MSG.cmd_t.encodedSize(obj) +
            function (ary) { var s=0; ary.forEach(function (el) { s += MSG.epinfo_t.encodedSize(el); }); return s; }(obj.list) +
            0;
            return sz;
        }
        ,
        ID: 2,
        encode: function (/*XDR.ENCODER*/cenv,obj) {
            MSG.cmd_t.encode(cenv,obj);
            XDR.u1.encode(cenv,obj.domain);
            cenv.skip(1);
            XDR.u2.encode(cenv,obj.len);
            XDR.u4.encode(cenv,obj.offset);
            XDR.u1.encode(cenv, obj.list==null ? 0 : obj.list.length);
            cenv.skip(3);
            cenv.encodeArray(obj.list,0,128,MSG.epinfo_t.encode);
        },
        decode: function (/*XDR.DECODER*/cenv,obj) {
            obj = MSG.cmd_t.decode(cenv,obj);
            obj.domain = XDR.u1.decode(cenv);
            cenv.skip(1);
            obj.len = XDR.u2.decode(cenv);
            obj.offset = XDR.u4.decode(cenv);
            obj.list = new Array(XDR.u1.decode(cenv));
            cenv.skip(3);
            cenv.decodeArray2(obj.list,0,128,57,MSG.epinfo_t.decode);
            return obj;
        },
    }
    ,
    euilist_t: { // superclass: MSG::cmd_t
        enum$0: {
            MAX_LEN: 256,	"256": "MAX_LEN" }
        ,MAX_LEN: 256
        ,
        decodeSize: 32,
        decodeCheck: function (dec) {
            dec.decodeCheck(32);
        },
        encodedSize: function (obj) {
            var sz = 32 +
            MSG.cmd_t.encodedSize(obj) +
            (obj.euis==null ? 0 : obj.euis.length) * 8 +
            0;
            return sz;
        }
        ,
        ID: 3,
        encode: function (/*XDR.ENCODER*/cenv,obj) {
            MSG.cmd_t.encode(cenv,obj);
            XDR.u1.encode(cenv,obj.domain);
            XDR.u1.encode(cenv,obj.flags);
            XDR.u2.encode(cenv,obj.len);
            XDR.u4.encode(cenv,obj.offset);
            cenv.skip(4);
            eui_t.encode(cenv,obj.qeui);
            XDR.u2.encode(cenv, obj.euis==null ? 0 : obj.euis.length);
            cenv.skip(6);
            cenv.encodeArray(obj.euis,0,256,eui_t.encode);
        },
        decode: function (/*XDR.DECODER*/cenv,obj) {
            obj = MSG.cmd_t.decode(cenv,obj);
            obj.domain = XDR.u1.decode(cenv);
            obj.flags = XDR.u1.decode(cenv);
            obj.len = XDR.u2.decode(cenv);
            obj.offset = XDR.u4.decode(cenv);
            cenv.skip(4);
            obj.qeui = eui_t.decode(cenv);
            obj.euis = new Array(XDR.u2.decode(cenv));
            cenv.skip(6);
            cenv.decodeArray(obj.euis,0,256,8,eui_t.decode);
            return obj;
        },
    }
    ,
    mev_t: { // superclass: XDR.msg_t
        enum$0: {
            SEV_NONE: 0,	"0": "SEV_NONE",
            SEV_EMERG: 1,	"1": "SEV_EMERG",
            SEV_ALARM: 2,	"2": "SEV_ALARM",
            SEV_HEALTH: 3,	"3": "SEV_HEALTH",
            SEV_ERR: 4,	"4": "SEV_ERR",
            SEV_WARN: 5,	"5": "SEV_WARN",
            SEV_NOTICE: 6,	"6": "SEV_NOTICE",
            SEV_INFO: 7,	"7": "SEV_INFO",
            SEV_DEBUG: 8,	"8": "SEV_DEBUG",
            SEV_DEBUG1: 9,	"9": "SEV_DEBUG1",
            SEV_DEBUG2: 10,	"10": "SEV_DEBUG2",
            SEV_DEBUG3: 11,	"11": "SEV_DEBUG3" }
        ,SEV_NONE: 0
        ,SEV_EMERG: 1
        ,SEV_ALARM: 2
        ,SEV_HEALTH: 3
        ,SEV_ERR: 4
        ,SEV_WARN: 5
        ,SEV_NOTICE: 6
        ,SEV_INFO: 7
        ,SEV_DEBUG: 8
        ,SEV_DEBUG1: 9
        ,SEV_DEBUG2: 10
        ,SEV_DEBUG3: 11
        ,
        decodeSize: 24,
        decodeCheck: function (dec) {
            dec.decodeCheck(24);
        },
        encodedSize: function (obj) {
            var sz = 24;
            return sz;
        }
        ,
        ID: 4,
        encode: function (/*XDR.ENCODER*/cenv,obj) {
            obj = obj||{};
            XDR.u1.encode(cenv,obj.evsev);
            XDR.u1.encode(cenv,obj.evedom);
            cenv.skip(6);
            ustime_t.encode(cenv,obj.evtime);
            eui_t.encode(cenv,obj.eveui);
        },
        decode: function (/*XDR.DECODER*/cenv,obj) {
            obj = obj||{};
            obj.evsev = XDR.u1.decode(cenv);
            obj.evedom = XDR.u1.decode(cenv);
            cenv.skip(6);
            obj.evtime = ustime_t.decode(cenv);
            obj.eveui = eui_t.decode(cenv);
            return obj;
        },
    }
    ,
    errtext_t: { // superclass: MSG::mev_t
        enum$0: {
            MAX_TEXT_LEN: 127,	"127": "MAX_TEXT_LEN" }
        ,MAX_TEXT_LEN: 127
        ,
        decodeSize: 26,
        decodeCheck: function (dec) {
            dec.decodeCheck(26);
        },
        encodedSize: function (obj) {
            var sz = 26 +
            MSG.mev_t.encodedSize(obj) +
            (obj.text==null ? 0 : obj.text.length) +
            7 + 0;
            return sz;
        }
        ,
        ID: 5,
        encode: function (/*XDR.ENCODER*/cenv,obj) {
            MSG.mev_t.encode(cenv,obj);
            XDR.u1.encode(cenv,obj.seqno);
            XDR.u1.encode(cenv, obj.text==null ? 0 : obj.text.length);
            cenv.encodeArray(obj.text,0,127,XDR.u1.encode);
            cenv.align(8);
        },
        decode: function (/*XDR.DECODER*/cenv,obj) {
            obj = MSG.mev_t.decode(cenv,obj);
            obj.seqno = XDR.u1.decode(cenv);
            obj.text = new Array(XDR.u1.decode(cenv));
            cenv.decodeArray(obj.text,0,127,1,XDR.u1.decode);
            cenv.align(8);
            return obj;
        },
    }
    ,
});
