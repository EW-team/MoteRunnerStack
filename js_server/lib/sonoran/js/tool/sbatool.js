#!sonoran

Runtime.include("server/sonoran/sonoran.js");

//
// Create system image from sba files.
//

var LOADER_BYTECODES = [
    // BEGIN -- BC-DEFS-SBATOOL -- DO NOT CHANGE! bytecodes.pm TOOL
        { bcname:'nop'             , vmopc: 31, ldopc:  0, args:[]             },
        { bcname:'ret'             , vmopc:248, ldopc:  1, args:[]             },
        { bcname:'ret.r'           , vmopc:245, ldopc:  2, args:[]             },
        { bcname:'ret.i'           , vmopc:241, ldopc:  3, args:[]             },
        { bcname:'ret.l'           , vmopc:242, ldopc:  4, args:[]             },
        { bcname:null              , vmopc: -1, ldopc: -1, args:null           },
        { bcname:'throw'           , vmopc:246, ldopc:  6, args:[]             },
        { bcname:'del.this'        , vmopc:229, ldopc:  7, args:[]             },
        { bcname:'pop'             , vmopc:120, ldopc:  8, args:[]             },
        { bcname:'pop2'            , vmopc:121, ldopc:  9, args:[]             },
        { bcname:'dup'             , vmopc:122, ldopc: 10, args:[]             },
        { bcname:'dup2'            , vmopc:123, ldopc: 11, args:[]             },
        { bcname:'swap'            , vmopc: 88, ldopc: 12, args:[]             },
        { bcname:'swap2'           , vmopc: 89, ldopc: 13, args:[]             },
        { bcname:'cmp'             , vmopc: 80, ldopc: 14, args:[]             },
        { bcname:'cmp.l'           , vmopc:112, ldopc: 15, args:[]             },
        { bcname:'ldc.0'           , vmopc:  9, ldopc: 16, args:[]             },
        { bcname:'ldc.1'           , vmopc: 10, ldopc: 17, args:[]             },
        { bcname:'ldc.2'           , vmopc: 11, ldopc: 18, args:[]             },
        { bcname:'ldc.3'           , vmopc: 12, ldopc: 19, args:[]             },
        { bcname:'ldc.4'           , vmopc: 13, ldopc: 20, args:[]             },
        { bcname:'ldc.5'           , vmopc: 14, ldopc: 21, args:[]             },
        { bcname:'ldc.6'           , vmopc: 15, ldopc: 22, args:[]             },
        { bcname:'ldc.m1'          , vmopc:  8, ldopc: 23, args:[]             },
        { bcname:'lda.len'         , vmopc:174, ldopc: 24, args:[]             },
        { bcname:null              , vmopc: -1, ldopc: -1, args:null           },
        { bcname:'i2ui'            , vmopc: 29, ldopc: 26, args:[]             },
        { bcname:'sxb'             , vmopc: 24, ldopc: 27, args:[]             },
        { bcname:'zxb'             , vmopc: 25, ldopc: 28, args:[]             },
        { bcname:'sxi'             , vmopc: 26, ldopc: 29, args:[]             },
        { bcname:'zxi'             , vmopc: 27, ldopc: 30, args:[]             },
        { bcname:'l2i'             , vmopc: 28, ldopc: 31, args:[]             },
        { bcname:'ld.0'            , vmopc:  0, ldopc: 32, args:[]             },
        { bcname:'ld.1'            , vmopc:  1, ldopc: 33, args:[]             },
        { bcname:'ld.2'            , vmopc:  2, ldopc: 34, args:[]             },
        { bcname:'ld.3'            , vmopc:  3, ldopc: 35, args:[]             },
        { bcname:'ld.4'            , vmopc:  4, ldopc: 36, args:[]             },
        { bcname:'ld.5'            , vmopc:  5, ldopc: 37, args:[]             },
        { bcname:'ld.6'            , vmopc:  6, ldopc: 38, args:[]             },
        { bcname:'ld.7'            , vmopc:  7, ldopc: 39, args:[]             },
        { bcname:'st.0'            , vmopc: 16, ldopc: 40, args:[]             },
        { bcname:'st.1'            , vmopc: 17, ldopc: 41, args:[]             },
        { bcname:'st.2'            , vmopc: 18, ldopc: 42, args:[]             },
        { bcname:'st.3'            , vmopc: 19, ldopc: 43, args:[]             },
        { bcname:'st.4'            , vmopc: 20, ldopc: 44, args:[]             },
        { bcname:'st.5'            , vmopc: 21, ldopc: 45, args:[]             },
        { bcname:'st.6'            , vmopc: 22, ldopc: 46, args:[]             },
        { bcname:'st.7'            , vmopc: 23, ldopc: 47, args:[]             },
        { bcname:'ld.l.0'          , vmopc: 32, ldopc: 48, args:[]             },
        { bcname:'ld.l.1'          , vmopc: 33, ldopc: 49, args:[]             },
        { bcname:'ld.l.2'          , vmopc: 34, ldopc: 50, args:[]             },
        { bcname:'ld.l.3'          , vmopc: 35, ldopc: 51, args:[]             },
        { bcname:'st.l.0'          , vmopc: 48, ldopc: 52, args:[]             },
        { bcname:'st.l.1'          , vmopc: 49, ldopc: 53, args:[]             },
        { bcname:'st.l.2'          , vmopc: 50, ldopc: 54, args:[]             },
        { bcname:'st.l.3'          , vmopc: 51, ldopc: 55, args:[]             },
        { bcname:null              , vmopc: -1, ldopc: -1, args:null           },
        { bcname:null              , vmopc: -1, ldopc: -1, args:null           },
        { bcname:null              , vmopc: -1, ldopc: -1, args:null           },
        { bcname:null              , vmopc: -1, ldopc: -1, args:null           },
        { bcname:null              , vmopc: -1, ldopc: -1, args:null           },
        { bcname:null              , vmopc: -1, ldopc: -1, args:null           },
        { bcname:null              , vmopc: -1, ldopc: -1, args:null           },
        { bcname:'illegal'         , vmopc:253, ldopc: 63, args:[]             },
        { bcname:'lda.r'           , vmopc:160, ldopc: 64, args:[]             },
        { bcname:'lda.b'           , vmopc:161, ldopc: 65, args:[]             },
        { bcname:'lda'             , vmopc:162, ldopc: 66, args:[]             },
        { bcname:'lda.l'           , vmopc:163, ldopc: 67, args:[]             },
        { bcname:null              , vmopc: -1, ldopc: -1, args:null           },
        { bcname:null              , vmopc: -1, ldopc: -1, args:null           },
        { bcname:null              , vmopc: -1, ldopc: -1, args:null           },
        { bcname:null              , vmopc: -1, ldopc: -1, args:null           },
        { bcname:'newa.b'          , vmopc:224, ldopc: 72, args:[]             },
        { bcname:'newa.i'          , vmopc:227, ldopc: 73, args:[]             },
        { bcname:'newa.r'          , vmopc:228, ldopc: 74, args:[]             },
        { bcname:'newa.l'          , vmopc:225, ldopc: 75, args:[]             },
        { bcname:'newa.d'          , vmopc:226, ldopc: 76, args:[]             },
        { bcname:null              , vmopc: -1, ldopc: -1, args:null           },
        { bcname:null              , vmopc: -1, ldopc: -1, args:null           },
        { bcname:null              , vmopc: -1, ldopc: -1, args:null           },
        { bcname:'sta.r'           , vmopc:176, ldopc: 80, args:[]             },
        { bcname:'sta.b'           , vmopc:177, ldopc: 81, args:[]             },
        { bcname:'sta'             , vmopc:178, ldopc: 82, args:[]             },
        { bcname:'sta.l'           , vmopc:179, ldopc: 83, args:[]             },
        { bcname:'sta.d'           , vmopc:191, ldopc: 84, args:[]             },
        { bcname:'ceq'             , vmopc: 81, ldopc: 85, args:[]             },
        { bcname:'clt'             , vmopc: 82, ldopc: 86, args:[]             },
        { bcname:'cle'             , vmopc: 83, ldopc: 87, args:[]             },
        { bcname:'cne'             , vmopc: 85, ldopc: 88, args:[]             },
        { bcname:'cge'             , vmopc: 86, ldopc: 89, args:[]             },
        { bcname:'cgt'             , vmopc: 87, ldopc: 90, args:[]             },
        { bcname:'clt.u'           , vmopc:114, ldopc: 91, args:[]             },
        { bcname:'cle.u'           , vmopc:115, ldopc: 92, args:[]             },
        { bcname:'cge.u'           , vmopc:118, ldopc: 93, args:[]             },
        { bcname:'cgt.u'           , vmopc:119, ldopc: 94, args:[]             },
        { bcname:null              , vmopc: -1, ldopc: -1, args:null           },
        { bcname:'shl'             , vmopc:128, ldopc: 96, args:[]             },
        { bcname:'shl.l'           , vmopc:129, ldopc: 97, args:[]             },
        { bcname:'shr'             , vmopc:130, ldopc: 98, args:[]             },
        { bcname:'shr.l'           , vmopc:131, ldopc: 99, args:[]             },
        { bcname:'shr.u'           , vmopc:132, ldopc:100, args:[]             },
        { bcname:'lnot'            , vmopc:152, ldopc:101, args:[]             },
        { bcname:null              , vmopc: -1, ldopc: -1, args:null           },
        { bcname:null              , vmopc: -1, ldopc: -1, args:null           },
        { bcname:'and'             , vmopc:134, ldopc:104, args:[]             },
        { bcname:'and.l'           , vmopc:135, ldopc:105, args:[]             },
        { bcname:'or'              , vmopc:136, ldopc:106, args:[]             },
        { bcname:'or.l'            , vmopc:137, ldopc:107, args:[]             },
        { bcname:'xor'             , vmopc:138, ldopc:108, args:[]             },
        { bcname:'xor.l'           , vmopc:139, ldopc:109, args:[]             },
        { bcname:'not'             , vmopc:140, ldopc:110, args:[]             },
        { bcname:'not.l'           , vmopc:141, ldopc:111, args:[]             },
        { bcname:'add'             , vmopc:142, ldopc:112, args:[]             },
        { bcname:'add.l'           , vmopc:143, ldopc:113, args:[]             },
        { bcname:'sub'             , vmopc:144, ldopc:114, args:[]             },
        { bcname:'sub.l'           , vmopc:145, ldopc:115, args:[]             },
        { bcname:'mul'             , vmopc:150, ldopc:116, args:[]             },
        { bcname:'mul.l'           , vmopc:151, ldopc:117, args:[]             },
        { bcname:null              , vmopc: -1, ldopc: -1, args:null           },
        { bcname:'div'             , vmopc:146, ldopc:119, args:[]             },
        { bcname:'div.l'           , vmopc:147, ldopc:120, args:[]             },
        { bcname:'div.u'           , vmopc:148, ldopc:121, args:[]             },
        { bcname:'rem'             , vmopc:154, ldopc:122, args:[]             },
        { bcname:'rem.l'           , vmopc:155, ldopc:123, args:[]             },
        { bcname:'rem.u'           , vmopc:156, ldopc:124, args:[]             },
        { bcname:null              , vmopc: -1, ldopc: -1, args:null           },
        { bcname:'neg'             , vmopc:158, ldopc:126, args:[]             },
        { bcname:'neg.l'           , vmopc:159, ldopc:127, args:[]             },
        { bcname:'ld.l'            , vmopc: 41, ldopc:128, args:['l']          },
        { bcname:'st.l'            , vmopc: 56, ldopc:129, args:['l']          },
        { bcname:'call.del'        , vmopc:230, ldopc:130, args:['l']          },
        { bcname:'inc.l'           , vmopc: 55, ldopc:131, args:['l','s']      },
        { bcname:'ld'              , vmopc: 74, ldopc:132, args:['l']          },
        { bcname:'st'              , vmopc: 90, ldopc:133, args:['l']          },
        { bcname:'lda.ref'         , vmopc:202, ldopc:134, args:['o']          },
        { bcname:'inc'             , vmopc: 54, ldopc:135, args:['l','s']      },
        { bcname:null              , vmopc: -1, ldopc: -1, args:null           },
        { bcname:'ldc.b'           , vmopc: 43, ldopc:137, args:['u']          },
        { bcname:'dupx'            , vmopc: 91, ldopc:138, args:['q']          },
        { bcname:'ckcasta.p'       , vmopc:217, ldopc:139, args:['h']          },
        { bcname:'isinsta.p'       , vmopc:218, ldopc:140, args:['h']          },
        { bcname:'asinsta.p'       , vmopc:219, ldopc:141, args:['h']          },
        { bcname:'ret.sub'         , vmopc: 63, ldopc:142, args:['l']          },
        { bcname:'goto'            , vmopc: 84, ldopc:143, args:['d']          },
        { bcname:'bzeq'            , vmopc: 64, ldopc:144, args:['d']          },
        { bcname:'bzne'            , vmopc: 65, ldopc:145, args:['d']          },
        { bcname:'bzlt'            , vmopc: 68, ldopc:146, args:['d']          },
        { bcname:'bzge'            , vmopc: 69, ldopc:147, args:['d']          },
        { bcname:'bzgt'            , vmopc: 70, ldopc:148, args:['d']          },
        { bcname:'bzle'            , vmopc: 71, ldopc:149, args:['d']          },
        { bcname:'beq'             , vmopc: 72, ldopc:150, args:['d']          },
        { bcname:'bne'             , vmopc: 73, ldopc:151, args:['d']          },
        { bcname:'blt'             , vmopc: 76, ldopc:152, args:['d']          },
        { bcname:'bge'             , vmopc: 77, ldopc:153, args:['d']          },
        { bcname:'bgt'             , vmopc: 78, ldopc:154, args:['d']          },
        { bcname:'ble'             , vmopc: 79, ldopc:155, args:['d']          },
        { bcname:'blt.u'           , vmopc: 92, ldopc:156, args:['d']          },
        { bcname:'bge.u'           , vmopc: 93, ldopc:157, args:['d']          },
        { bcname:'bgt.u'           , vmopc: 94, ldopc:158, args:['d']          },
        { bcname:'ble.u'           , vmopc: 95, ldopc:159, args:['d']          },
        { bcname:'asm.obj'         , vmopc:247, ldopc:160, args:['p']          },
        { bcname:'ldc.l'           , vmopc: 44, ldopc:161, args:['ssss']       },
        { bcname:'call.asm'        , vmopc:235, ldopc:162, args:['mm']         },
        { bcname:'del.asm'         , vmopc:187, ldopc:163, args:['mm']         },
        { bcname:'ldc.r'           , vmopc: 42, ldopc:164, args:['ss']         },
        { bcname:'call.sub'        , vmopc: 62, ldopc:165, args:['l','ww']     },
        { bcname:null              , vmopc: -1, ldopc: -1, args:null           },
        { bcname:null              , vmopc: -1, ldopc: -1, args:null           },
        { bcname:null              , vmopc: -1, ldopc: -1, args:null           },
        { bcname:null              , vmopc: -1, ldopc: -1, args:null           },
        { bcname:'call.loc'        , vmopc:232, ldopc:170, args:['ww']         },
        { bcname:'del.loc'         , vmopc:185, ldopc:171, args:['ww']         },
        { bcname:'call.sys'        , vmopc:239, ldopc:172, args:['zz']         },
        { bcname:'del.sys'         , vmopc:186, ldopc:173, args:['zz']         },
        { bcname:'ldc'             , vmopc: 42, ldopc:174, args:['ss']         },
        { bcname:'goto.w'          , vmopc:116, ldopc:175, args:['ww']         },
        { bcname:'bzeq.w'          , vmopc: 96, ldopc:176, args:['ww']         },
        { bcname:'bzne.w'          , vmopc: 97, ldopc:177, args:['ww']         },
        { bcname:'bzlt.w'          , vmopc:100, ldopc:178, args:['ww']         },
        { bcname:'bzge.w'          , vmopc:101, ldopc:179, args:['ww']         },
        { bcname:'bzgt.w'          , vmopc:102, ldopc:180, args:['ww']         },
        { bcname:'bzle.w'          , vmopc:103, ldopc:181, args:['ww']         },
        { bcname:'beq.w'           , vmopc:104, ldopc:182, args:['ww']         },
        { bcname:'bne.w'           , vmopc:105, ldopc:183, args:['ww']         },
        { bcname:'blt.w'           , vmopc:108, ldopc:184, args:['ww']         },
        { bcname:'bge.w'           , vmopc:109, ldopc:185, args:['ww']         },
        { bcname:'bgt.w'           , vmopc:110, ldopc:186, args:['ww']         },
        { bcname:'ble.w'           , vmopc:111, ldopc:187, args:['ww']         },
        { bcname:'blt.u.w'         , vmopc:124, ldopc:188, args:['ww']         },
        { bcname:'bge.u.w'         , vmopc:125, ldopc:189, args:['ww']         },
        { bcname:'bgt.u.w'         , vmopc:126, ldopc:190, args:['ww']         },
        { bcname:'ble.u.w'         , vmopc:127, ldopc:191, args:['ww']         },
        { bcname:'ldf.r'           , vmopc:192, ldopc:192, args:['cc','f']     },
        { bcname:'ldf.r.this'      , vmopc:196, ldopc:193, args:['cc','f']     },
        { bcname:'stf.r'           , vmopc:208, ldopc:194, args:['cc','f']     },
        { bcname:'stf.r.this'      , vmopc:212, ldopc:195, args:['cc','f']     },
        { bcname:'ldf'             , vmopc:194, ldopc:196, args:['cc','f']     },
        { bcname:'ldf.this'        , vmopc:198, ldopc:197, args:['cc','f']     },
        { bcname:'stf'             , vmopc:210, ldopc:198, args:['cc','f']     },
        { bcname:'stf.this'        , vmopc:214, ldopc:199, args:['cc','f']     },
        { bcname:'ldf.l'           , vmopc:195, ldopc:200, args:['cc','f']     },
        { bcname:'ldf.l.this'      , vmopc:199, ldopc:201, args:['cc','f']     },
        { bcname:'stf.l'           , vmopc:211, ldopc:202, args:['cc','f']     },
        { bcname:'stf.l.this'      , vmopc:215, ldopc:203, args:['cc','f']     },
        { bcname:'ldf.b.ref'       , vmopc:200, ldopc:204, args:['o','cc','f'] },
        { bcname:'ldf.l.ref'       , vmopc:201, ldopc:205, args:['o','cc','f'] },
        { bcname:'ldf.i.ref'       , vmopc:203, ldopc:206, args:['o','cc','f'] },
        { bcname:'ldf.r.ref'       , vmopc:204, ldopc:207, args:['o','cc','f'] },
        { bcname:'ldf.r.asm'       , vmopc:164, ldopc:208, args:['p','f']      },
        { bcname:'ldf.asm'         , vmopc:166, ldopc:209, args:['p','f']      },
        { bcname:'ldf.l.asm'       , vmopc:167, ldopc:210, args:['p','f']      },
        { bcname:'stf.r.asm'       , vmopc:180, ldopc:211, args:['p','f']      },
        { bcname:'stf.asm'         , vmopc:182, ldopc:212, args:['p','f']      },
        { bcname:'stf.l.asm'       , vmopc:183, ldopc:213, args:['p','f']      },
        { bcname:null              , vmopc: -1, ldopc: -1, args:null           },
        { bcname:null              , vmopc: -1, ldopc: -1, args:null           },
        { bcname:null              , vmopc: -1, ldopc: -1, args:null           },
        { bcname:null              , vmopc: -1, ldopc: -1, args:null           },
        { bcname:null              , vmopc: -1, ldopc: -1, args:null           },
        { bcname:null              , vmopc: -1, ldopc: -1, args:null           },
        { bcname:'tswtch'          , vmopc: 58, ldopc:220, args:['tttt']       },
        { bcname:'tswtch.l'        , vmopc: 59, ldopc:221, args:['tttt']       },
        { bcname:'lswtch'          , vmopc: 60, ldopc:222, args:['tttt']       },
        { bcname:'lswtch.l'        , vmopc: 61, ldopc:223, args:['tttt']       },
        { bcname:'new'             , vmopc:238, ldopc:224, args:['kk']         },
        { bcname:'ckcast'          , vmopc:205, ldopc:225, args:['kk']         },
        { bcname:'isinst'          , vmopc:206, ldopc:226, args:['kk']         },
        { bcname:'asinst'          , vmopc:207, ldopc:227, args:['kk']         },
        { bcname:'newa'            , vmopc:237, ldopc:228, args:['kk']         },
        { bcname:'ckcasta'         , vmopc:221, ldopc:229, args:['kk']         },
        { bcname:'isinsta'         , vmopc:222, ldopc:230, args:['kk']         },
        { bcname:'asinsta'         , vmopc:223, ldopc:231, args:['kk']         },
        { bcname:'ld.b.ref'        , vmopc:168, ldopc:232, args:['o','l']      },
        { bcname:'ld.l.ref'        , vmopc:169, ldopc:233, args:['o','l']      },
        { bcname:'ld.d.ref'        , vmopc:170, ldopc:234, args:['o','l']      },
        { bcname:'ld.i.ref'        , vmopc:171, ldopc:235, args:['o','l']      },
        { bcname:'ld.r.ref'        , vmopc:172, ldopc:236, args:['o','l']      },
        { bcname:null              , vmopc: -1, ldopc: -1, args:null           },
        { bcname:null              , vmopc: -1, ldopc: -1, args:null           },
        { bcname:null              , vmopc: -1, ldopc: -1, args:null           },
        { bcname:'call.virt'       , vmopc:233, ldopc:240, args:['cc','u','v'] },
        { bcname:'del.virt'        , vmopc:189, ldopc:241, args:['cc','v']     },
        { bcname:'call.ifc'        , vmopc:231, ldopc:242, args:['kk','u','v'] },
        { bcname:'del.ifc'         , vmopc:188, ldopc:243, args:['kk','v']     },
        { bcname:'call.inst'       , vmopc:234, ldopc:244, args:['kk','cc','v']},
        { bcname:null              , vmopc: -1, ldopc: -1, args:null           },
        { bcname:null              , vmopc: -1, ldopc: -1, args:null           },
        { bcname:null              , vmopc: -1, ldopc: -1, args:null           },
        { bcname:null              , vmopc: -1, ldopc: -1, args:null           },
        { bcname:null              , vmopc: -1, ldopc: -1, args:null           },
        { bcname:null              , vmopc: -1, ldopc: -1, args:null           },
        { bcname:null              , vmopc: -1, ldopc: -1, args:null           },
        { bcname:'escape'          , vmopc: -2, ldopc:252, args:['u']          },
        { bcname:'mhdr'            , vmopc: -2, ldopc:253, args:[]             },
        { bcname:null              , vmopc: -1, ldopc: -1, args:null           },
        { bcname:null              , vmopc: -1, ldopc: -1, args:null           },
    // END -- BC-DEFS-SBATOOL -- DO NOT CHANGE!

];



function align (num, align) {
    var n;
    if( (n=num%align) != 0 )
	n = align-n;
    return num+n;
}


// List of SBA objects.
var REGISTRY = [];


var NODE = function (sba, type, name) {
    this.sbaObj      = sba;
    this.sbaOff      = sba.rdOff;
    this.sbaLen      = 0;
    this.outSegment  = sba.outSegment;
    this.outOff      = sba.outOff;
    this.outLen      = 0;
    this.parentNode  = null;
    this.nodeName    = name;  // maybe null
    this.nodeType    = type;
    this.baseType    = null;  // one of u1/u2/u4/uN or null
    this.childNodes  = [];
};


// SBA object representing one asembly.
var SBA = function () {
    this.asmid     = 0;
    this.rootNode  = null;
    this.filename  = null;
    this.fileBytes = null;
    this.rdOff     = 0;
    this.staticsCls = null;        // com.ibm.saguaro.system.$tatics class
    this.publicClsinfoNodes = [];  // for linking from other assemblies only
    this.publicIfcinfoNodes = [];  //  ditto
    this.mhdrNodes          = [];
    this.exblockNodes       = [];
    this.clsinfoNodesByOff  = {};  // cls/ifc info structures
    this.mhdrNodesByOff     = {};
    this.exblockNodesByOff  = {};
    this.opcodesByOff       = {};
    // Output control
    this.outSegment = null;   // 'a', 'i', 'd', 't', or null
    this.outOff     = 0;
    this.output     = null;   // points to some output segment
    // Data segments
    this.ctentry    = null;   // outSegment: t  cabin table entry (size: SIZE_cabin_t)
    this.prelude    = null;   // outSegment: a  (size: REG_SIZE+SIZE_padded_asmname_t)
    this.imageSize  = 0;
    this.image      = null;   // outSegment: i
    this.idataSize  = 0;
    this.idata      = null;   // outSegment: d 
    this.codeSize   = 0;      // size of prelude and image padded to multiples of cabin atoms
    this.outmap     = null;
    // Errors/problems found during parsing/validation
    this.textByFoff = {};   // annotationg text from sasm
    this.findings   = [];   // validation/error remarks
    // Resolving structures
    this.import2asmid  = []; // map import ids to asmids
    this.segm2PrefBase = {}; // map segment id to pref base address
}


SBA.prototype.reportError = function (node, fmt, args) {
    var m = svprintf(fmt,2,arguments);
    if( !m.match(/\n$/) )
	m += "\n";
    var loc = node==null ? 'Error:\n  ' : sprintf("f:%04X\n  ", node.sbaOff);
    this.findings.push(loc+m.replace(/\n(.)/g, "\n  \1"));
}


SBA.isRefType = function (type) {
    return !/^[zbcuild]$/.test(type);
}

SBA.prototype.parseSDX = function () {
    var sdxfile = this.filename.replace(/\.sba$/,".sdx");
    var lines;
    try {
	lines = OSFile.readFully(sdxfile).split(/\r?\n/);
    } catch (e) {
	// Ignore not sdx file - it is only purpose is to augment output with
	// textual representation of image elements
	if( TOOL.isVerbose() ) {
	    printf("%s - No debug symbols present.\n", this.filename);
	}
	return;
    }
    // XXX: check build number!!!!

    var self = this;
    // Map SDX coff to class object
    var coff2clsobj = function (coff) {
	// coff: c:HHHH
	var outOff = parseInt(coff.substr(2),16) * SaguaroDEFS.ALIGN_CLSINFO;
	var clsobj = self.clsinfoNodesByOff[outOff];
	if( clsobj==null )
	    self.reportError(null, "SDX class spec %s does not match any in this SBA file - no class at i:%04X\n", coff, outOff);
	return clsobj;
    }

    var clsobj = null;

    for( var ln=0; ln<lines.length; ln++ ) {
	var line = lines[ln];
	if( line.length == 0 )
	    continue;
	var lcode =  line[0].charAt(0);
	if( lcode==';' )
	    continue;
	var argv;
	if( lcode=='S' ) {
	    // Special line - filename might contain <tab>
	    // S<flags> <filename>
	    var i = line.indexOf("\t");
	    var flags = line.substr(1,i);
	    var filename = line.substr(i+1);
	    // Nothing to be done with it
	}
	else {
	    var argv = line.split("\t");
	    if( argv.length < 2 || argv[0].length==0 ) {
		this.reportError(null, "Bad SDX syntax: file `%s' in line %d", sdxfile, ln+1);
		return;
	    }
	    if( lcode=='A' ) {
		var fv = parseFloat(argv[2]);
		if( fv < 2.0 || fv >=2.1 ) {
		    printf("%s - SDX has wrong version (not 2.x): %s\n", this.filename, argv[2]);
		    return;
		}
		continue;
	    }
	    if( lcode=='C' ) {
		if( (clsobj = coff2clsobj(argv[1])) == null )
		    return;
		clsobj.symbolicName = argv[2];
	    }
	    else if( lcode=='m' || lcode=='M' ) {
		var moff = parseInt(argv[3].substr(2),16) * SaguaroDEFS.ALIGN_METHHDR;
		var mhdrobj = this.mhdrNodesByOff[moff];
		if( mhdrobj==null ) {
		    this.reportError(null, "Method token %s did not match any mhdr item in SBA file", argv[2]);
		    continue;
		}
		mhdrobj.symbolicName = argv[1];
		mhdrobj.belongsToClsinfo = clsobj;
		mhdrobj.category = lcode=='M' ? 'static' : 'virtual';
		if( lcode=='m' ) {
		    mhdrobj.vidx = parseInt(argv[6]);
		}
	    }
	    else if( lcode=='f' || lcode=='F' || lcode=='r' || lcode=='R' ) {
		var fld = {
		    clsobj: clsobj,
		    name:   argv[1],
		    type:   argv[2],
		    slot:   parseInt(argv[4]),
		    isRef:  lcode=='r'||lcode=='R'
		};
		var a = (lcode=='f' || lcode=='r' ? 'instanceFields' : 'staticFields');
		if( clsobj[a]==null )
		    clsobj[a] = [];
		clsobj[a].push(fld);
	    }
	    else if( lcode=='G' || lcode=='H' ) {
		var fld = {
		    clsobj: clsobj,
		    name:   argv[1],
		    type:   argv[2],
		    value:  argv[4],
		    isRef:  lcode=='H'
		};
		if( clsobj['constFields']==null )
		    clsobj['constFields'] = [];
		clsobj['constFields'].push(fld);
	    }
	}
    }
}


SBA.prototype.init = function (fileData, filename) {
    this.asmid = REGISTRY.length;
    REGISTRY.push(this);
    this.filename = filename;
    this.fileData = fileData;
    this.fileBytes = new Array(fileData.length);
    for( var i=0, n=this.fileBytes.length; i<n; i++ )
	this.fileBytes[i] = fileData.charCodeAt(i)&0xFF;
    this.outmap = { 't': this.ctentry = new Array(SaguaroDEFS.SIZE_cabin_t),
		    'a': this.prelude = new Array(SaguaroDEFS.REG_SIZE + SaguaroDEFS.SIZE_padded_asmname_t),
		    'i': this.image   = new Array(fileData.length*2),
		    'd': this.idata   = new Array(fileData.length)
		  };
    this.rootNode = this.makeNode('root', filename);
    this.rdAssembly(this.rootNode);
    this.parseSDX();
}

    
SBA.prototype.makeNode = function (type, name) {
    return new NODE(this, type, name);
}


SBA.prototype.appendChild = function (parentNode, childNode, name) {
    childNode.parentNode = parentNode;
    if( parentNode.childNodes == null )
	parentNode.childNodes = [];
    parentNode.childNodes.push(childNode);
    if( name!=null ) {
	parentNode[name] = childNode;
	childNode.nodeName = name;
    }
    return this;
}


// Assert that n bytes of data left in assembly.
SBA.prototype.assertData = function (n) {
    if( this.rdOff+n > this.fileBytes.length )
	throw "Not enough data for "+n+" bytes at offset "+this.rdOff;
}


// Write n zero bytes.
SBA.prototype.wrZeros = function (n) {
    var node = this.makeNode('zero', n);
    delete node.childNodes;
    node.baseType = 'uN';
    node.sbaLen = 0;
    if( this.outSegment ) {
	for( var i=0; i<n; i++ ) {
	    this.output[node.outOff + i] = 0;
	}
	this.outOff += (node.outLen = n);
    }
    return node;
}


SBA.wrIntToBuffer = function (buffer, atOff, value, n) {
    if( SaguaroDEFS.BYTEORDER_LITTLE ) {
	atOff += n-1;
	while( --n >= 0 ) {
	    buffer[atOff-n] = value & 0xFF;
	    value /= 256;
	}
    } else {
	while( --n >= 0 ) {
	    buffer[atOff+n] = value & 0xFF;
	    value /= 256;
	}
    }
}

// Replace int (used for resolving)
SBA.prototype.replaceInt = function (node, value) {
    if( node.outLen==0 )
	return;
    SBA.wrIntToBuffer(this.outmap[node.outSegment], node.outOff, value, node.outLen);
}

// Write int
SBA.prototype.wrInt = function (value, n) {
    var node = this.makeNode('u'+n);
    delete node.childNodes;
    node.nodeType = node.baseType = 'u'+n;
    node.value = value;
    node.sbaLen = 0;
    if( this.outSegment ) {
	node.outSegment = this.outSegment;
	node.outOff = this.outOff;
	node.outLen = n;
	SBA.wrIntToBuffer(this.output, this.outOff, value, n);
	this.outOff += n;
    }
    return node;
}



// Read n binary bytes.
SBA.prototype.mkPad = function (n) {
    if( n==null || n==0 ) {
	printf("Internal error: padding is zero or not defined!\n");
	Runtime.exit(101);
    }
    var node = this.makeNode('pad', n);
    delete node.childNodes;
    node.baseType = 'uN';
    node.padValue = n;
    node.sbaLen = 0;
    if( this.outSegment ) {
	var p = 0;
	// Create padding in image
	while( ((node.outOff+p)%n)!=0 ) {
	    this.output[node.outOff + p++] = 0;
	}
	this.outOff += (node.outLen = p);
    }
    return node;
}

// Read n binary bytes.
SBA.prototype.rdUn = function (n, type) {
    this.assertData(n);
    var node = this.makeNode(type||'uN');
    delete node.childNodes;
    node.baseType = 'uN';
    node.sbaLen = n;
    this.rdOff += n;
    if( this.outSegment ) {
	node.outLen = n;
	for( var i=0; i<n; i++ )
	    this.output[node.outOff+i] = this.fileBytes[node.sbaOff+i];
	this.outOff += n;
    }
    var chrs = [];
    for( var i=0; i<n; i++ )
	chrs.push(String.fromCharCode(this.fileBytes[node.sbaOff+i]));
    node.value = chrs.join('');
    return node;
}

// Read n bytes integer in big endian byte order.
SBA.prototype.rdMsbN = function (n, type) {
    this.assertData(n);
    var v = 0;
    for( var i=0; i<n; i++ )
	v = v*256 + this.fileBytes[this.rdOff+i];
    var node = this.makeNode(type||('u'+n));
    delete node.childNodes;
    node.baseType = 'u'+n;
    node.value  = v;
    node.sbaLen = n;
    this.rdOff += n;
    if( this.outSegment ) {
	node.outLen = n;
	for( var i=0; i<n; i++ )
	    this.output[node.outOff + (SaguaroDEFS.BYTEORDER_LITTLE ? n-i-1 : i)] = this.fileBytes[node.sbaOff+i];
	this.outOff += n;
    }
    return node;
}
SBA.prototype.rdU1 = function (type) { return this.rdMsbN(1,type); }
SBA.prototype.rdU2 = function (type) { return this.rdMsbN(2,type); }
SBA.prototype.rdU4 = function (type) { return this.rdMsbN(4,type); }

SBA.prototype.rdFwd = function (scale) {
    var node = this.rdU2('fwd'+scale);
    if( node.value == 0 ) {
	node.comment = '-> none';
    } else {
	node.destOff = node.outOff + node.value*scale;
	node.comment = TOOL.isVerbose()
	    ? sprintf('i:%04X+%d*0x%X -> i:%04X', node.outOff, scale, node.value, node.destOff)
	    : sprintf('-> i:%04X', node.destOff);
    }
    return node;
}

SBA.prototype.rdMethref = function (local) {
    var node = this.rdU2('methref');
    if( local ) {
	node.destOff = (node.outOff + node.value) & 0xFFFF;
	node.comment = TOOL.isVerbose()
	    ? sprintf("i:%04X+0x%X -> m:%04X", node.outOff, node.value, node.destOff)
	    : sprintf("-> m:%04X", node.destOff);
	return node;
    }
    node.importIdx = (node.value & SaguaroDEFS.MR_ASM_MASK) >> SaguaroDEFS.MR_ASM_MASK_SHIFT;
    var methnum = node.value & SaguaroDEFS.MR_OFF_MASK;
    node.destOff = methnum * 2;  // only if local
    node.methIdx = methnum-SaguaroDEFS.SIZE_asmhdr_t/2;
    node.destSymbol = sprintf("%d/meth%s", node.importIdx, node.methIdx);
    return node;
}


// csiref = clsref or ifcref
SBA.prototype.rdCsiref = function (name) {
    var node = this.rdClsref(name);
    node.nodeType = 'csiref';
    return node;
}

// ifcref - points only to a ifcinfo structure
SBA.prototype.rdIfcref = function (name) {
    var node = this.rdClsref(name);
    node.nodeType = 'ifcref';
    return node;
}

// point only to a clsinfo structure
SBA.prototype.rdClsref = function (name) {
    var node = this.rdU2('clsref');
    if( name!=null )
	node.nodeName = name;
    node.maybeNull = (this.outSegment==null);
    if( node.value==0 ) {
	node.destOff = 0;
	node.comment = 'null';
    } else {
	node.importIdx = (node.value & SaguaroDEFS.CR_ASM_MASK) >> SaguaroDEFS.CR_ASM_MASK_SHIFT;
	var clsnum = node.value & SaguaroDEFS.CR_OFF_MASK;
	if( node.importIdx==0 ) {
	    node.destOff = SaguaroDEFS.ALIGN_CLSINFO*clsnum;
	    var clsinfo = this.clsinfoNodesByOff[node.destOff];
	    var type = clsinfo!=null && clsinfo.flags.ISIF ? 'ifc':'cls';
	    node.comment = TOOL.isVerbose()
		? sprintf("local %s %d*0x%X -> i:%04X", type, SaguaroDEFS.ALIGN_CLSINFO, clsnum, node.destOff)
		: sprintf("-> i:%04X", node.destOff);
	} else {
	    if( clsnum >= SaguaroDEFS.CR_IF_MARKER ) {
		node.ifcIdx = clsnum-SaguaroDEFS.CR_IF_MARKER;
		node.destSymbol = sprintf("%d/ifc%d", node.importIdx, node.ifcIdx);
	    } else {
		node.clsIdx = clsnum;
		node.destSymbol = sprintf("%d/cls%d", node.importIdx, node.clsIdx);
	    }
	    node.comment = '-> '+node.destSymbol;
	}
    }
    return node;
}


SBA.prototype.rdSwtch = function (bcnode, bcname) {
    if( bcname == 'lswtch' || bcname == 'lswtch.l' ) {
	var lng = (bcname == 'lswtch.l');
	var num = this.rdU2();
	this.appendChild(bcnode, num, 'num');
	for( var i=0; i<num.value; i++ ) {
	    var val = lng ? this.rdU4() : this.rdU2();
	    this.appendChild(bcnode, val, 'val'+i);
	    this.appendChild(bcnode, this.rdFwd(1));
	}			
	this.appendChild(bcnode, this.rdFwd(1), 'default');
    }
    else { // tswtch | tswtch.l
	this.appendChild(bcnode,
			 bcname == 'tswtch' ? this.rdU2() : this.rdU4(),
			 'low');
	var num = this.rdU2();
	this.appendChild(bcnode, num, 'num');
	this.appendChild(bcnode, this.rdFwd(1), 'default');
	for( var i=0; i<num.value; i++ )
	    this.appendChild(bcnode, this.rdFwd(1), 'case'+i);
    }
}


SBA.prototype.rdOpcode = function (bcodes) {
    this.assertData(1);
    var opc = this.fileBytes[this.rdOff];
    var bcdef = LOADER_BYTECODES[opc];  // peek ahead
    var bcname = bcdef.bcname;
    this.outSegment = (bcdef.vmopc >= 0) ? 'i' : null;

    if( bcdef.ldopc < 0 )
	throw sprintf("Illegal loader opcode detected: %02X\n", opc);

    var node = this.rdU1('opc');
    this.appendChild(bcodes, node);
    this.opcodesByOff[node.outOff] = node;
    node.bcdef = bcdef;
    node.nodeName = bcname;
    node.comment = '';
    if( bcdef.vmopc >= 0 ) {
	// VM byte code - change opcode
	this.output[node.outOff] = bcdef.vmopc;
	for( var i=0; i<bcdef.args.length; i++ ) {
	    var a = bcdef.args[i];
	    if( a == 'tttt' ) {
		this.rdSwtch(node, bcname);
	    } else {
		var arg;
		if( a=='cc' ) {
		    // cc elements is transient clsref - used only for linking
		    this.outSegment = null;
		    arg = this.rdClsref(a);
		    this.outSegment = 'i'; 
		}
		else if ( a=='kk' ) {
		    if( bcname=='call.ifc' || bcname=='del.ifc' ) {
			arg = this.rdIfcref(a);
		    } else {
			if( /^(newa|(ckcast|isinst|asinst)a?)$/.test(bcname) ) {
		    	    arg = this.rdCsiref(a);  // clsref | ifcref
			} else {
		    	    arg = this.rdClsref(a);
			}
		    }
		}
		else if( a=='mm' ) {
		    arg = this.rdMethref(false);
		    node.comment += arg.destSymbol;
		}
		else if( a=='ww' && (bcname=="call.loc" || bcname=="del.loc") ) {
		    // assembly local method reference
		    arg = this.rdMethref(true);
		    node.comment += sprintf("m:%04X", arg.destOff);
		}
		else if( a=='d' || a=='ww' ) {
		    arg = this.rdMsbN(a.length, 'rel'+(a=='d'?8:16));
		    var v = arg.value;
		    if( a=='d' && arg.value > 127 )
			v = arg.value|0xFF00;
		    node.destOff = arg.destOff = (arg.outOff + v) & 0xFFFF;
		    arg.nodeName = TOOL.isVerbose()
			? sprintf("(i:%04X+0x%X)->i:%04X", arg.outOff, v, node.destOff)
			: sprintf("->i:%04X", node.destOff);
		    node.comment += sprintf("i:%04X", node.destOff);
		}
		else {
		    arg = this.rdMsbN(a.length, a);
		}
		this.appendChild(node, arg);
	    }
	}
    } else {
	// Loader only byte code - signals structured embedded in bytecode.
	if( bcname == 'escape' ) {
	    // Read next byte
	    this.assertData(1);
	    var param = this.rdU1();
	    this.appendChild(node, param, 'param');
	    this.outSegment = 'i';
	    if( param.value == SaguaroDEFS.ESC_EXBLK ) {
		node.comment += "exception block";
		this.appendChild(node, this.rdExblock());
	    }
	    else if( param.value == SaguaroDEFS.ESC_EOC ) {
		// End of code
		node.comment += "END OF CODE";
		return false;
	    }
	    else {
		throw sprintf("Internal error - unknown parametr to escape: %02X\n", param.value);
	    }
	}
	else if( bcname == 'mhdr' ) {
	    this.outSegment = 'i';
	    this.mhdrNodes.push(node);
	    this.appendChild(node, this.mkPad(2));
	    this.appendChild(node, this.rdU1(), 'nargs');
	    this.appendChild(node, this.rdU1(), 'locals');
	    this.appendChild(node, this.rdU1(), 'maxstack');
	    node.destOff = node.nargs.outOff;
	    this.mhdrNodesByOff[node.destOff] = node;
	}
	else {
	    throw "Internal error - unknown virtual bytecode: "+bcname;
	}
    }
    return true;
}


// Read assembly identity.
SBA.prototype.rdAsmIdentity = function () {
    var node = this.makeNode('asmIdentity');
    this.appendChild(node, this.rdU1(), 'minor');
    this.appendChild(node, this.rdU1(), 'major');
    this.appendChild(node, this.rdU1(), 'nameLen');
    var len = node.nameLen.value;
    var child = this.rdUn(len);
    var qname = (this.fileData.substr(child.sbaOff, len)
		 .replace(/[%\"\\\u0000-\u001F\u007F-\uFFFF]/g,
			  function (match, p1, p2, offset, str) {
			      var code = match.charCodeAt(0);
			      return "%"+
				  "0123456789ABCDEF".charAt((code>> 4)&0xF)+
				  "0123456789ABCDEF".charAt( code     &0xF);
			  }));
    child.comment = '"'+qname+'"';
    this.appendChild(node, child, 'name');
    node.quotedName = qname;
    node.identity = sprintf("%s-%d.%d", qname, node.major.value, node.minor.value);
    return node;
}


// Read initialized array.
SBA.prototype.rdIniAry = function () {
    var node = this.makeNode('iniary');
    this.appendChild(node, this.mkPad(SaguaroDEFS.ALIGN_OBJ), 'pad');
    var ohdr = this.rdU2();
    this.appendChild(node, ohdr, 'typeLen');
    var typeLen = ohdr.value;
    var type = (typeLen >> 14) & 3;
    var len = typeLen & 0x3FFF;
    node.elemType = (['u1','u2','u4','coref'])[type];
    node.elemSize = ([1,2,4,2])[type];
    node.arrayLen = len;
    ohdr.comment  = node.elemType+'['+len+']';
    // Create object header in image instead of 'typeLen' field:
    //     0-1  | 2-3
    //    hi lo |
    //   sta|rfu| len
    var lo = SaguaroDEFS.BYTEORDER_LITTLE ? 0 : 1;
    var hi = lo^1;
    ohdr.outLen = 4;
    this.outOff += 2;
    this.output[ohdr.outOff+lo] = 0;
    this.output[ohdr.outOff+hi] = ([SaguaroDEFS.OT_BYTE,
				    SaguaroDEFS.OT_INT,
				    SaguaroDEFS.OT_LONG,
				    SaguaroDEFS.OT_REFARY])[type];
    this.output[ohdr.outOff+2+lo] = (len      & 0xFF);
    this.output[ohdr.outOff+2+hi] = (len/256) & 0xFF;
    node.ohdr = ohdr;      // direct link to ohdr (skips pad child)
    ohdr.childNodes = [];  // make sure we have childNodes field even if the array has length zero
    for( var elemi=0; elemi<len; elemi++ ) {
	var ie = this.rdMsbN(node.elemSize,node.elemType);
	if( node.elemType=='coref' )
	    ie.comment = 'iniary'+ie.value;
	this.appendChild(ohdr, ie, 'slot'+elemi);
    }
    return node;
}


// Read assembly header.
SBA.prototype.rdAsmHeader = function () {
    var node = this.makeNode('asmHeader');
    this.appendChild(node, this.rdU2(),   'build');
    this.appendChild(node, this.rdFwd(2), 'asmCtor');
    this.appendChild(node, this.rdFwd(1), 'firstExBlock');
    this.appendChild(node, this.rdFwd(1), 'firstIf');
    this.appendChild(node, this.rdU2(),   'numMethods');
    node.build.comment = sprintf("decimal=%d",node.build.value);
    return node;
}


SBA.prototype.rdVtok = function () {
    var vtok = this.makeNode('vtok');
    this.outSegment = null;
    this.appendChild(vtok, this.rdClsref(),   'clsref');  // type cc: transient class ref - just to resolve vidx
    this.outSegment = 'i';
    this.appendChild(vtok, this.rdU1('vidx'), 'vidx');
    return vtok;
}


// Read class info interface map.
SBA.prototype.rdIfmap = function (ifmaps) {
    var node = this.makeNode('ifmap');
    this.appendChild(ifmaps, node);

    this.appendChild(node, this.mkPad(2));
    this.appendChild(node, this.rdIfcref(),     'ifc');
    this.appendChild(node, this.rdU1(),         'mapCnt');
    var map = this.makeNode();
    this.appendChild(node, map,                 'map');
    for( var i=0; i<node.mapCnt.value; i++ )
	this.appendChild(map, this.rdVtok());
    return node;
}


// Read class info structure.
SBA.prototype.rdClsinfo = function (classtable) {
    var node = this.makeNode('clsinfo');
    this.appendChild(classtable, node);

    this.appendChild(node, this.rdU1(),         'flags');
    // Unfold flags
    node.flags.PUBLIC = ((node.flags.value & (1<<7))!=0);
    node.flags.XASM   = ((node.flags.value & (1<<6))!=0);
    node.flags.ISIF   = ((node.flags.value & (1<<5))!=0);
    node.flags.ENDCT  = ((node.flags.value & (1<<1))!=0);
    node.flags.LASTCL = ((node.flags.value & (1<<0))!=0);
    node.flags.RFU    = ( node.flags.value & 0x1C);

    node.flags.comment = ((node.flags.PUBLIC ? "PUBLIC " : "") +
			  (node.flags.XASM   ? "XASM "   : "") +
			  (node.flags.ISIF   ? "ISIF "   : "") +
			  (node.flags.LASTCL ? "LASTCL " : "") +
			  (node.flags.ENDCT  ? "ENDCT "  : ""));

    this.clsinfoNodesByOff[node.outOff] = node;

    if( node.flags.ISIF ) {
	if( node.flags.PUBLIC ) {
	    // For external linking
	    node.ifcIdx = this.publicIfcinfoNodes.length;
	    node.nodeName = 'ifc'+node.ifcIdx;
	    this.publicIfcinfoNodes.push(node);
	}
	node.typeName = 'ifinfo';
	this.appendChild(node, this.rdU1(),         'superIfcCnt');
	var iftable = this.makeNode();
	this.appendChild(node, iftable,             'superIfTable');
	for( var i=0; i<node.superIfcCnt.value; i++ )
	    this.appendChild(iftable, this.rdIfcref());
    } else {
	if( node.flags.PUBLIC ) {
	    // For external linking
	    node.clsIdx = this.publicClsinfoNodes.length;
	    node.nodeName = 'cls'+node.clsIdx;
	    this.publicClsinfoNodes.push(node);
	}
	if( node.flags.XASM ) {
	    this.outSegment = null;
	    var lnkref = this.rdClsref();
	    this.outSegment = 'i';
	    this.appendChild(node, lnkref, 'lnkref');
	}
	this.appendChild(node, this.rdU1(),         'ifCnt');
	this.appendChild(node, this.rdClsref(),     'superClass');   node.superClass.maybeNull = true;
	this.appendChild(node, this.rdU1(),         'refFldCnt');
	this.appendChild(node, this.rdU1(),         'dataFldCnt');
	this.appendChild(node, this.rdU1(),         'vbase');
	this.appendChild(node, this.rdU1(),         'methodCnt');
	this.outSegment = null;
	this.appendChild(node, this.rdU1(),         'overridden');
	this.outSegment = 'i';

	var vtoks = this.makeNode();
	this.appendChild(node, vtoks,               'overrideVidxs');
	for( var i=0; i<node.overridden.value; i++ )
	    this.appendChild(vtoks, this.rdVtok());
	var newvidxs = this.makeNode();
	this.appendChild(node, newvidxs,            'newVidxs');
	var nnew = node.methodCnt.value-node.overridden.value;
	for( var i=0; i<nnew; i++ )
	    this.appendChild(newvidxs, this.rdU1('vidx'), 'new'+i);

	this.appendChild(node, this.mkPad(2));
	var meths = this.makeNode();
	this.appendChild(node, meths,               'methods');
	for( var i=0; i<node.methodCnt.value; i++ )
	    this.appendChild(meths, this.rdFwd(2));
	
	var ifmaps = this.makeNode();
	this.appendChild(node, ifmaps,              'ifmaps');
	for( var i=0; i<node.ifCnt.value; i++ )
	    this.rdIfmap(ifmaps);
    }
    this.appendChild(node, this.mkPad(SaguaroDEFS.ALIGN_CLSINFO));
    return node;
}


// Read exception block.
SBA.prototype.rdExblock = function () {
    var node = this.makeNode('exblock');
    this.exblockNodes.push(node);
    this.appendChild(node, this.mkPad(4));
    this.appendChild(node, this.rdFwd(1),   'next');
    node.destOff = node.next.outOff;
    this.exblockNodesByOff[node.destOff] = node;
    var exri = -1;
    while( true ) {
	var exrange = this.makeNode('exrange');
	this.appendChild(node, exrange, 'exrange'+(++exri));
	var xbeg = this.rdU2();
	xbeg.destOff = node.outOff+xbeg.value;
	xbeg.comment = TOOL.isVerbose()
	    ? sprintf("i:%04X+0x%X -> i:%04X", node.outOff, xbeg.value, xbeg.destOff)
	    : sprintf("-> i:%04X", xbeg.destOff);
	this.appendChild(exrange, xbeg,       'xbeg');
	if( xbeg.value==0 )
	    break;
	var hcntrlen = this.rdU2();
	this.appendChild(exrange, hcntrlen,   'hcntrlen');
	hcntrlen.HCNT = (hcntrlen.value >> 11);
	hcntrlen.RLEN = (hcntrlen.value & 0x3FF);
	hcntrlen.comment = sprintf("hcnt=%d rlen=0x%X [i:%04X-i:%04X]", hcntrlen.HCNT, hcntrlen.RLEN, xbeg.destOff, xbeg.destOff+hcntrlen.RLEN-1);
	var excatch = this.makeNode('excatch');
	this.appendChild(exrange, excatch,    'catchs');
	for( var i=0; i<hcntrlen.HCNT; i++ ) {
	    this.appendChild(excatch, this.rdClsref(), 'clsref');
	    this.appendChild(excatch, this.rdFwd(1),   'exhcode');
	}
    }
    return node;
}


SBA.prototype.rdAssembly = function (rootNode) {
    var num, node;

    // ----------------------------------------
    // Prelude section

    this.outSegment = null;
    this.appendChild(rootNode, node=this.makeNode(), 'prelude');
    // prelude
    this.appendChild(node, this.rdU4(), 'magic');
    this.appendChild(node, this.rdU2(), 'lffVersion');
    if( node.magic.value != SaguaroDEFS.LOADFILE_MAGIC )
	throw "Not an SBA file";
    if( node.lffVersion.value != 0x0100 )
	throw sprintf("Unsuppored load file version: 0x%04X", node.lffVersion.value);
    // directory
    this.appendChild(node, this.rdU1(), 'numIniObjs');
    this.appendChild(node, this.rdU1(), 'numImports');
    this.appendChild(node, this.rdU2(), 'imageSize');
    this.appendChild(node, this.rdU2(), 'idataSize');
    // imports
    var ino = this.makeNode();
    this.appendChild(node, ino, 'imports');
    num = node.numImports.value;
    for( var i=0; i<num; i++ ) {
	this.appendChild(node.imports, this.rdAsmIdentity(), "import"+(i+1));
    }
    // Reconstruct in core table created by linker to map from import index
    // to actual assembly ids. First entry is own asmid. List is terminated by 0xFF.
    // This list is only used during linking and we could skip it here.
    // We do it just to make images look exacyl the same as done with on-mote linker.
    this.outSegment = ino.outSegment = 'a';
    this.output = this.prelude;
    this.outOff = ino.outLen = num+2;
    this.output[0] = this.asmid; 
    this.output[num+1] = 0xFF;
    for( var i=0; i<num; i++ ) {
	// Write import index for now.
	// Later we will replace it by asmid.
	this.output[i+1] = i+1;
    }

    // assembly identity
    this.appendChild(node, this.mkPad(SaguaroDEFS.REG_SIZE));
    this.appendChild(node, this.rdAsmIdentity(), 'name');
    this.appendChild(node, this.mkPad(SaguaroDEFS.REG_SIZE+SaguaroDEFS.SIZE_padded_asmname_t));

    // ----------------------------------------
    // Iniary section
    this.outSegment = 'd';
    this.output = this.idata;
    this.outOff = 0;  // reset offset for idata section
    this.appendChild(rootNode, node=this.makeNode(), 'iniarys');
    num = rootNode.prelude.numIniObjs.value;
    if( num > 0 ) {
	for( var i=0; i<num; i++ )
	    this.appendChild(rootNode.iniarys, this.rdIniAry(), 'iniary'+i);
	this.appendChild(rootNode.iniarys, this.mkPad(SaguaroDEFS.ALIGN_CABIN), 'cabinPadding');
    } else {
	// at least one atom must be used
	this.appendChild(rootNode.iniarys, this.wrZeros(SaguaroDEFS.ALIGN_CABIN), 'cabinPadding');
	rootNode.iniarys.cabinPadding.comment = 'default atom';
    }
    this.idataSize = this.outOff;  // size of idata section

    // ----------------------------------------
    // Image section

    // reset offset for code image section
    this.outSegment = 'i';
    this.output = this.image;
    this.outOff = 0;

    this.appendChild(rootNode, node=this.makeNode(), 'image');
    // assembly header 
    this.appendChild(node, this.rdAsmHeader(), 'asmHeader');
    // method table
    this.appendChild(node, this.makeNode(), 'methodTable');
    num = node.asmHeader.numMethods.value;
    for( var i=0; i<num; i++ )
	this.appendChild(node.methodTable, this.rdFwd(2), 'meth'+i);
    // class/interface table
    this.appendChild(node, this.mkPad(SaguaroDEFS.ALIGN_CLSINFO));
    var classTable = this.makeNode();
    this.appendChild(node, classTable, 'classTable');
    var cont = true;
    while(cont) {
	var info = this.rdClsinfo(classTable);
	cont = !info.flags.ENDCT;
    }
    // Bytecodes
    var bcodes = this.makeNode();
    this.appendChild(node, bcodes, 'bcodes');
    while( this.rdOpcode(bcodes) ) { }
    this.imageSize = this.outOff;
    // Padding to make image a multiple of ALIGN_CABIN
    this.codeSize = this.prelude.length + this.outOff;
    if( (this.codeSize % SaguaroDEFS.ALIGN_CABIN) != 0 )
	this.codeSize += SaguaroDEFS.ALIGN_CABIN - (this.codeSize % SaguaroDEFS.ALIGN_CABIN);
    this.appendChild(node, this.mkPad(this.codeSize-this.prelude.length), 'cabinPadding');

    // Create cabin table entry
    this.outSegment = 't';
    this.output = this.ctentry;
    this.outOff = 0;
    // Create entries for fields: status/imageEnd/pheapBeg
    var ctentry = this.makeNode();
    var prevImageEnd, prevPheapBeg;
    var currImageEnd, currPheapBeg;
    if( this.asmid==0 ) {
	prevImageEnd = 0;
	prevPheapBeg = SaguaroDEFS.CABIN_SPACE_SIZE_ATOMS;
    } else {
	var pcte = REGISTRY[this.asmid-1].rootNode.cabinTableEntry;
	prevImageEnd = pcte.imageEnd.value;
	prevPheapBeg = pcte.pheapBeg.value;
    }
    currImageEnd = prevImageEnd + this.codeSize/SaguaroDEFS.ALIGN_CABIN;
    currPheapBeg = prevPheapBeg - this.idataSize/SaguaroDEFS.ALIGN_CABIN;
    if( currPheapBeg < currImageEnd ) {
	this.reportError(null, "CABIN_SPACE too small to hold this sba: %s", this.filename);
    }

    this.appendChild(rootNode, ctentry, 'cabinTableEntry');
    if( SaguaroDEFS.OFF_cabin_status != 0 || SaguaroDEFS.OFF_cabin_imageEnd != 2 || SaguaroDEFS.OFF_cabin_pheapBeg != 4 )
	throw "Internal error: struct cabin_t layout changed - adjust sbatool code";
    this.appendChild(ctentry, this.wrInt(SaguaroDEFS.CABIN_OCCUPIED^SaguaroDEFS.CABIN_ERASED_U2,2), 'status');
    this.appendChild(ctentry, this.wrInt(prevImageEnd + this.codeSize/SaguaroDEFS.ALIGN_CABIN,  2), 'imageEnd');
    this.appendChild(ctentry, this.wrInt(prevPheapBeg - this.idataSize/SaguaroDEFS.ALIGN_CABIN, 2), 'pheapBeg');
    this.segm2PrefBase['d'] = SaguaroDEFS.CABIN_SPACE_BEG_PREF + (ctentry.pheapBeg.value * SaguaroDEFS.ALIGN_CABIN);
    this.segm2PrefBase['a'] = SaguaroDEFS.CABIN_SPACE_BEG_PREF + (prevImageEnd           * SaguaroDEFS.ALIGN_CABIN);
    this.segm2PrefBase['i'] = this.segm2PrefBase['a'] + this.prelude.length;
    this.segm2PrefBase['t'] = SaguaroDEFS.CABIN_TABLE_SPACE_BEG_PREF + this.asmid * SaguaroDEFS.SIZE_cabin_t;
}


// Is clsref pointing to an class info structure.
SBA.prototype.validateMethref = function (node) {
    if( node.importIdx == null ) {
	// Local method - rel16
	if( this.mhdrNodesByOff[node.destOff]==null )
	    this.reportError(node, "Illegal reference to a local method");
    }
    else {
	if( node.importIdx==0 ) {
	    // Local method addressed via method table
	    if( node.methIdx >= this.rootNode.image.asmHeader.numMethods )
		this.reportError(node, "Illegal method reference - method index too big: %s", node.destSymbol);
	}
    }
}

// Is clsref pointing to an class info structure.
SBA.prototype.validateClsref = function (node) {
    if( node.destOff != null ) {
	if( node.destOff == 0 ) {
	    if( !node.maybeNull )
		this.reportError(node, "Illegal null clsinfo reference - null clsrefs not allowed here");
	    return;
	}
	// Local reference
	var d = this.clsinfoNodesByOff[node.destOff];
	if( d==null ) {
	    this.reportError(node, "Illegal local clsinfo reference - does not address a clsinfo structure");
	}
	else if( d.flags.ISIF && node.nodeType!='csiref' ) {
	    this.reportError(node, "Illegal clsref - points to a local ifcinfo structure: i:%04X", node.destOff);
	}
    } else {
	if( node.destSymbol==null )
	    this.reportError(node, "Internal error: destSymbol property is null");
	if( node.destSymbol.indexOf('cls') < 0 && node.nodeType!='csiref' ) {
	    this.reportError(node, "Expecting an class reference but found reference to %s", node.destSymbol);
	}
    }
}


// Is clsref pointing to an interface.
SBA.prototype.validateIfcref = function (node, maybeNull) {
    if( node.destOff != null ) {
	if( node.destOff == 0 ) {
	    if( !maybeNull )
		this.reportError(node, "Illegal null ifcinfo reference - null ifcrefs not allowed here");
	    return;
	}
	// Local reference
	var d = this.clsinfoNodesByOff[node.destOff];
	if( d==null ) {
	    this.reportError(node, "Illegal local ifcinfo reference - does not address ifcinfo structure");
	}
	else if( !d.flags.ISIF ) {
	    this.reportError(node, "Illegal ifcref - points to a local clsinfo structure: i:%04X", node.destOff);
	}
    } else {
	if( node.destSymbol==null )
	    this.reportError(node, "Internal error: destSymbol property is null");
	if( node.destSymbol.indexOf('ifc') < 0 ) {
	    this.reportError(node, "Expecting an interface reference but found reference to %s", node.destSymbol);
	}
    }
}


SBA.prototype.validateExblock = function (exblock) {
    if( exblock.next.value != 0 ) {
	if( this.exblockNodesByOff[exblock.next.destOff] == null )
	    findings.push(sprintf("f:%04X\n  Next link of exblock does not refer to an exblock structure\n", exblock.sbaOff));
    }
    var nb = exblock.childNodes.length;
    if( nb <= 1 )  // next, exrange0, ..., exrange(last)
	findings.push(sprintf("f:%04X\n  Exception block should have at least one exrange structure\n", exblock.sbaOff));
	
    var endRegion = exblock.next.value == 0 ? sba.imageSize : exblock.next.destOff;
    var begRegion = exblock.childNodes[nb-1].outOff + exblock.childNodes[nb-1].outLen;
    var lastBeg = begRegion;
    for( var ni=1; ni<nb-1; ni++ ) {
	// Loop over xbeg
	var exrange = exblock.childNodes[ni];
	if( exrange.xbeg.destOff < lastBeg )
	    findings.push(sprintf("f:%04X\n  Exception block exrange (xbeg) not correctly ordered (increasing start addresses)\n", exrange.xbeg.sbaOff));
	if( exrange.RLEN == 0 )
	    findings.push(sprintf("f:%04X\n  Exception block exrange has zero length (rlen)\n", exrange.hcntrlen.sbaOff));
	if( exrange.HCNT == 0 )
	    findings.push(sprintf("f:%04X\n  Exception block exrange with no catch handlers (hcnt)\n", exrange.hcntrlen.sbaOff));
	if( exrange.xbeg.destOff + exrange.hcntrlen.RLEN > endRegion )
	    findings.push(sprintf("f:%04X\n  Exception block exrange end i:%04X beyond next exception block or end of image: i%04X\n",
				  exrange.hcntrlen.sbaOff, exrange.xbeg.destOff + exrange.hcntrlen.RLEN, endRegion));
	var cn = exrange.childNodes.length;
	for( ci=0; ci<cn; ci++ ) {
	    var ch = exrange.childNodes[ci];
	    // Only last entry allowed to be zero (finally)
	    if( ci+1 < cn || ch.clsref.value!=0 )
		this.validateClsref(ch.clsref);
	    if( this.opcodesByOff[ch.exhcode.destOff] == null )
		findings.push(sprintf("f:%04X\n  Exception handler does not point to an opcode: i:%04X\n",
				      ch.exhcode.sbaOff, ch.exhcode.destOff));
	    if( ch.exhcode.destOff < begRegion || ch.exhcode.destOff >= endRegion )
		findings.push(sprintf("f:%04X\n  Exception handler refers to bytecode outside of current exblock: i:%04X not i:%04X-i:%04X\n",
				      ch.exhcode.sbaOff, ch.exhcode.destOff, begRegion, endRegion));
	}
    }
}


// Validate assembly structures.
SBA.prototype.validate = function () {
    var findings = this.findings;
    var ASI = SaguaroDEFS.ALIGN_SIZEINFO;
    var prelude = this.rootNode.prelude;
    var v, n, l, r;

    if( (v=(n=prelude.magic).value) != SaguaroDEFS.LOADFILE_MAGIC )
	findings.push(sprintf("f:%04X\n  Unknown loadfile magic number: %08X vs expected %08X\n",
			      n.sbaOff, v, SaguaroDEFS.LOADFILE_MAGIC));
    if( (v=(n=prelude.lffVersion).value) != (SaguaroDEFS.LOADFILE_MAJOR*256+SaguaroDEFS.LOADFILE_MINOR) )
	findings.push(sprintf("f:%04X\n  Unsupported load file version: %d.%d (supported %d.%d)\n",
			      n.sbaOff, v/256, v%256, SaguaroDEFS.LOADFILE_MAJOR, SaguaroDEFS.LOADFILE_MINOR));
    // numIniObjs implicitely verified - it was used to parse iniary section.
    // CR_MAXASM total # of assemblies - loaded one => max imports
    if( (v=(n=prelude.numImports).value) >= SaguaroDEFS.CR_MAXASM-1 )
	findings.push(sprintf("f:%04X\n  Illegal number of imported assemblies: %d (max %d)\n",
			      n.sbaOff, v, SaguaroDEFS.CR_MAXASM-1));
    l = align(r = this.imageSize-this.rootNode.image.cabinPadding.outLen, ASI);
    if( (v=(n=prelude.imageSize).value * ASI) != l ) {
	if( v < l ) {
	    findings.push(sprintf("f:%04X %s\n  Announced imageSize in header is %s than actual amount of code: \n"+
				  "           imageSize=%d * unit=%d => announced size in bytes: %d\n"+
				  "           actual code size %d bytes => rounded to multiple of units: %d\n",
				  n.sbaOff, 
				  v < l ? "":"(warning)", 
				  v < l ? "smaller":"greater", 
				  v/ASI, ASI, v, r, l));
	}
	// else XXX: no way to report warnings - all findings abort processing
    }
    l = align(r = this.idataSize-this.rootNode.iniarys.cabinPadding.outLen, ASI);
    if( (v=(n=prelude.idataSize).value * ASI) != l ) {
	if( v==0 )
	    v = SaguaroDEFS.ALIGN_CABIN / ASI;
	if( v < l ) {
		// Assembler doesn't know about ALIGN_OBJ and thus does some
		// default alignment - don'r complain if announced size is bigger.
	    findings.push(sprintf("f:%04X\n  Announced idataSize in header is %s than actual amount of idata: \n"+
				  "           idataSize=%d * unit=%d => announced size in bytes: %d\n"+
				  "           actual code size %d bytes => rounded to multiple of units: %d\n",
				  n.sbaOff, 
				  v < l ? "smaller":"greater", 
				  v/ASI, ASI, v,
				  r, l));
	}
    }
    for( var i=0; i<prelude.numImports; i++ ) {
	var imp = prelude.imports[i];
	if( imp.nameLen==0 || imp.nameLen > SaguaroDEFS.ASM_NAME_MAXLEN ) {
	    findings.push(sprintf("f:%04X\n  Imported assembly name is zero or too long: %d (max %d)\n",
				  imp.sbaOff, imp.nameLen, SaguaroDEFS.ASM_NAME_MAXLEN));
	}
    }
    if( prelude.name.nameLen==0 || prelude.name.nameLen > SaguaroDEFS.ASM_NAME_MAXLEN ) {
	findings.push(sprintf("f:%04X\n  Assembly's name is zero or too long: %d (max %d)\n",
			      prelude.name.sbaOff, prelude.name.nameLen, SaguaroDEFS.ASM_NAME_MAXLEN));
    }
   
    // iniarys - check that coref only link to previous initialized objects.
    var iniarys = this.rootNode.iniarys;
    for( var i=0; i<iniarys.childNodes.length; i++ ) {
	var ia = iniarys.childNodes[i];
	if( ia.elemType == 'coref' ) {
	    // Make sure the elements of the array reference only iniary upto i
	    for( var si=0; si<ia.arrayLen; si++ ) {
		var elem = ia.ohdr.childNodes[si];
		if( elem.value >= i ) {
		    findings.push(sprintf("f:%04X\n  Illegal coref value in iniary%d - %s: coref=%d\n",
					  elem.sbaOff, i,
					  i==0 ? "no previous iniary elements" : sprintf("can only reference previous iniarys 0-%d", i-1),
					  elem.value));
		}
	    }
	}
    }

    // Assembly header
    var asmhdr = this.rootNode.image.asmHeader;
    if( this.mhdrNodesByOff[asmhdr.asmCtor.destOff] == null )
	findings.push(sprintf("f:%04X\n  Wrong ASMCTOR entry - does not target mhdr structure\n", asmhdr.asmCtor.sbaOff));
    if( asmhdr.firstIf.value!=0 && ((v = this.clsinfoNodesByOff[asmhdr.firstIf.destOff]) == null || !v.flags.ISIF) )
	findings.push(sprintf("f:%04X\n  Wrong firstIf entry - does not target ifinfo structure\n", asmhdr.firstIf.sbaOff));
    if( asmhdr.firstExBlock.value!=0 && ((v = this.exblockNodesByOff[asmhdr.firstExBlock.destOff]) == null || this.exblockNodes[0]!=v) )
	findings.push(sprintf("f:%04X\n  Wrong firstExblock entry - does not target 1st exblock structure\n", asmhdr.firstExBlock.sbaOff));

    // Method table
    var methtable = this.rootNode.image.methodTable;
    for( var i=0; i<methtable.childNodes.length; i++ ) {
	if( this.mhdrNodesByOff[methtable.childNodes[i].destOff] == null )
	    findings.push(sprintf("f:%04X\n  Wrong address in method table - does not target mhdr structure\n", methtable.childNodes[i].sbaOff));
    }

    // Class table
    var classtable = this.rootNode.image.classTable;
    var lastxcls = null;
    var firstIfc = null;
    var firstIfcIdx = null;
    for( var i=0; i<classtable.childNodes.length; i++ ) {
	var mixed = false;
	n = classtable.childNodes[i];
	if( n.flags.ISIF ) {
	    // Validate ifcinfo structure
	    if( firstIfc==null ) {
		// Very first interface
		firstIfc = n;
		if( this.rootNode.image.asmHeader.firstIf.destOff != firstIfc.flags.outOff )
		    findings.push(sprintf("f:%04X\n  First interface is not correctly referenced in asmHeader at offset f:%04X\n",
					  firstIfc.sbaOff, this.rootNode.image.asmHeader.firstIf.sbaOff));
		firstIfcIdx = i;
	    }
	    mixed = (n.flags.ISIF==0);
	    var sn = n.superIfcCnt.value;
	    for( var si=0; si<sn; si++ )
		this.validateIfcref(n.superIfTable.childNodes[si]);
	} else {
	    // Validate clsinfo structure
	    mixed = (firstIfcIdx!=null);
	    this.validateClsref(n.superClass, true);
	    if( n.lnkref != null )
		this.validateClsref(n.lnkref, true);
	    if( n.ifCnt.value > 0 ) {
		var sn = n.ifCnt.value;
		for( var si=0; si<sn; si++ )
		    this.validateIfcref(n.ifmaps.childNodes[si].ifc);
	    }
	    // Check that vidx is strictly increasing
	    var mn = n.methodCnt.value;
	    for( var mi=0; mi<mn; mi++ ) {
		var methref = n.methods.childNodes[mi];
		if( this.mhdrNodesByOff[methref.destOff] == null )
		    findings.push(sprintf("f:%04X\n  Virtual method reference does not address mhdr structure\n", methref.sbaOff));
	    }
	    
	}
	if( mixed )
	    findings.push(sprintf("f:%04X\n  clsinfo and ifcinfo not separated\n", n.sbaOff));
    }
    n = classtable.childNodes.length-1;
    if( n < 0 || (firstIfcIdx!=null && firstIfcIdx==0) )
	findings.push(sprintf("f:%04X\n  There must be at least one clsinfo stucture (statics class, subclass of system Assembly class)\n",
			      classtable.sbaOff));
    if( !classtable.childNodes[n].flags.ENDCT )
	findings.push(sprintf("f:%04X\n  Last element in class table not flagged with ENDCT\n",
			      classtable.childNodes[n].sbaOff));
    if( firstIfcIdx > 0 )
	n = firstIfcIdx-1;
    if( !classtable.childNodes[n].flags.LASTCL )
	findings.push(sprintf("f:%04X\n  Last clsinfo element in class table not flagged with LASTCL\n",
			      classtable.childNodes[n].sbaOff));
    // XXX: Check some more - ordering of clsinfo: all local subclasses follow the class with the external superclass?
    
    // Check code section
    var bcodes = this.rootNode.image.bcodes;
    n = bcodes.childNodes.length;
    for( var i=0; i<n; i++ ) {
	var node = bcodes.childNodes[i];
	if( node.nodeType == 'exblock' ) {
	    this.validateExblock(node);
	}
	else if( node.bcdef.bcname == 'mhdr' ) {
	    if( node.nargs.value+node.locals.value > 256-3 )
		findings.push(sprintf("f:%04X\n  Method exceeds argument/local var limit: nargs=%d + locals=%d is not <= 256-3\n",
				      node.sbaOff, node.nargs.value, node.locals.value));
	}
	else if( node.childNodes!=null ) {
	    // Go throuh parameters
	    var np = node.childNodes.length;
	    for( var ni=0; ni<np; ni++ ) {
		var param = node.childNodes[ni];
 		if( param.nodeType=='ifcref' ) {
		    this.validateIfcref(param);
		}
 		else if( param.nodeType=='clsref' ) {
		    this.validateClsref(param, param.maybeNull);
		}
		else if( param.nodeType.indexOf('fwd')==0 || param.nodeType.indexOf('rel')==0 ) {
		    if( this.opcodesByOff[param.destOff]==null )
			findings.push(sprintf("f:%04X\n  Opcode parameter <%s> does not point to a valid opcode: i:%04X\n",
					      param.sbaOff, param.nodeType, param.destOff));
		}
 		else if( param.nodeType=='methref' ) {
		    this.validateMethref(param);
		}
	    }
	}
    }
}


SBA.mkResolvedClsref = function (asmid, off) {
    return ((asmid << SaguaroDEFS.CR_ASM_MASK_SHIFT)|
	    (off/SaguaroDEFS.ALIGN_CLSINFO) );
}


SBA.prototype.resolveClsref = function (clsrefNode) {
    if( clsrefNode.value==0 ) {
	clsrefNode.resolved = {
	    asmobj: null,
	    clsobj: null
	};
	return;  // null will not change
    }
    var asmobj, tcls;
    if( clsrefNode.importIdx==0 ) {
	asmobj = this;
	tcls = this.clsinfoNodesByOff[clsrefNode.destOff];
    } else {
	// Points into other assembly
	var tasmid = this.import2asmid[clsrefNode.importIdx];
	if( (asmobj = REGISTRY[tasmid]) == null ) {
	    this.reportError(node, "Illegal import index: %d (asmid=%s)", clsrefNode.importIdx, tasmid);
	    return;
	}
	if( clsrefNode.clsIdx != null ) {
	    tcls = asmobj.publicClsinfoNodes[clsrefNode.value & SaguaroDEFS.CR_OFF_MASK];
	} else {
	    tcls = asmobj.publicIfcinfoNodes[(clsrefNode.value & SaguaroDEFS.CR_OFF_MASK)-SaguaroDEFS.CR_IF_MARKER];
	}
    }
    if( tcls==null ) {
	this.reportError(clsrefNode, "Failed to resolve clsref.");
	return;
    }
    clsrefNode.resolved = {
	asmobj: asmobj,
	clsobj: tcls
    };
    // Local clsref - offset part already correct, just fix asmid
    this.replaceInt( clsrefNode, SBA.mkResolvedClsref(clsrefNode.resolved.asmobj.asmid,
						      clsrefNode.resolved.clsobj.outOff) );
}


SBA.prototype.resolveMethref = function (node) {
    if( node.importIdx==null ) {
	node.resolved = {
	    asmobj: this,
	    mhdr: this.mhdrNodesByOff[node.destOff]
	};
	return; // no fixup for assembly internal relative methref
    }
    // Exchange import id for asmid
    var asmid = this.import2asmid[node.importIdx];
    var asmobj = REGISTRY[asmid];
    var mhdrobj = asmobj.rootNode.image.methodTable.childNodes[node.methIdx];
    if( mhdrobj != null ) {
	node.resolved = {
	    asmobj: asmobj,
	    mhdr: mhdrobj
	};
	this.replaceInt(node, ((asmid << SaguaroDEFS.MR_ASM_MASK_SHIFT)
			       | (node.value & SaguaroDEFS.MR_OFF_MASK)));
    } else {
	this.reportError(node, "Cannot resolve method reference");
    }
}


SBA.prototype.resolveVtok = function (vtokNode) {
    this.resolveClsref(vtokNode.clsref);
    var fixed = vtokNode.vidx.value;
    if( vtokNode.clsref.resolved.clsobj != null )
	fixed += vtokNode.clsref.resolved.clsobj.resolved.vbase;
    if( fixed > 255 )
	this.reportError(vtokNode,
			 "Resolved virtual method index too big: vbase=%d + vidx=%d => %d > 255\n",
			 vtokNode.clsref.resolved.vbase, vtokNode.vidx.value, fixed);
    this.replaceInt(vtokNode.vidx, fixed);
}


SBA.prototype.resolveCoref = function (coref) {
    var coobjNode = this.rootNode.iniarys.childNodes[coref.value];
    if( coobjNode==null || coobjNode.nodeType != 'iniary' ) {
	this.reportError(coref, "Failed to lookup initialized object iniary%d", coref.value);
    } else {
	var pref = this.segm2PrefBase[coobjNode.outSegment] +  coobjNode.typeLen.outOff;
	var jref = conv_pref2jref(pref);
	coobjNode.pref = pref;
	coobjNode.jref = jref;
	this.replaceInt(coref,jref);
    }
}

// Retrieve system Assembly object must be first public class in system assembly
// - which is first in registry.
SBA.getAssemblyClsinfo = function () {
    return REGISTRY[0].publicClsinfoNodes[0];
}

SBA.prototype.resolve = function () {
    var prelude = this.rootNode.prelude;

    // Create mapping from import id to assembly ids
    var asmid = this.asmid;
    this.import2asmid[0] = this.prelude[0] = asmid;
    for( var i=0; i<prelude.numImports.value; i++ ) {
	var imp = prelude.imports.childNodes[i];
	var bestminor = -1;
	var bestasmid = -1;
	for( var ai=0; ai<asmid; ai++ ) {
	    var other = REGISTRY[ai].rootNode.prelude.name;
	    if( imp.quotedName == other.quotedName &&
		imp.major.value == other.major.value &&
		imp.minor.value <= other.minor.value &&
		other.minor.value > bestminor ) {
		    bestminor = other.minor.value;
		    bestasmid = ai;
		}
	}
	if( bestasmid < 0 )
	    throw sprintf("Assembly <%s> has unresolved dependency to assembly <%s>",
			  prelude.name.identity, imp.identity);
	this.import2asmid[i+1] = this.prelude[i+1] = bestasmid;
	
    }


    var iniarys = this.rootNode.iniarys;
    for( var ii=0; ii<iniarys.childNodes.length; ii++ ) {
	var iniary = iniarys.childNodes[ii];
	if( iniary.elemType == 'coref' ) {
	    // Make sure the elements of the array reference only iniary upto i
	    for( var si=0; si<iniary.arrayLen; si++ )
		this.resolveCoref(iniary.ohdr.childNodes[si]);
	}
    }

    var AssemblyClsinfo = SBA.getAssemblyClsinfo();
    var classtable = this.rootNode.image.classTable;
    var ctxt = {
	lnkobj:   null,
	fintbase: 0,
	frefbase: 0,
	vbase:    0,
    };
    for( var ci=0; ci<classtable.childNodes.length; ci++ ) {
	var cls = classtable.childNodes[ci];

	if( cls.flags.ISIF ) {
	    cls.resolved = {
		// Use by call.ifc to resolve interface vidx
		vbase: 0
	    };
	    for( var i=0; i < cls.superIfTable.childNodes.length; i++ )
		this.resolveClsref(cls.superIfTable.childNodes[i]);
	} else {
	    var lnkref = null;
	    this.resolveClsref(cls.superClass);
	    if( cls.superClass.resolved.clsobj == SBA.getAssemblyClsinfo() )
		this.staticsCls = cls;
	    if( cls.lnkref!=null ) {
		// Special link ref
		this.resolveClsref(lnkref = cls.lnkref);
	    } else {
		// Superclass is link ref only if it is external.
		// Otherwise, reuse last external superclass.
		// Internal subclass relations have been resolved already.
		// XXX: Exception is for system the superclass Assembly for statics object.
		if( cls.superClass.resolved.asmobj==null ) {
		    // Superclass is object - clear values.
		    ctxt.lnkobj = null;
		    ctxt.fintbase = ctxt.frefbase = ctxt.vbase = 0;
		}
		else if( cls.superClass.resolved.asmobj!=this ) {
		    lnkref = cls.superClass;
		}
		else if( REGISTRY[0]==this && cls.superClass.resolved.clsobj==AssemblyClsinfo ) {
		    // We are linking the system and superclass is Assembly - that is current clsinfo
		    // is the statics object - in this case accept local superclass as lnkref.
		    lnkref = cls.superClass;
		}
	    }
	    if( lnkref!=null ) {
		if( lnkref.resolved.clsobj==null ) {
		    this.reportError(cls, "Link context is null");
		} else {
		    ctxt.lnkobj   = lnkref.resolved.clsobj;
		    ctxt.fintbase = lnkref.resolved.clsobj.resolved.dataFldCnt;
		    ctxt.frefbase = lnkref.resolved.clsobj.resolved.refFldCnt;
		    ctxt.vbase    = lnkref.resolved.clsobj.resolved.vbase;
		}
	    }
	    cls.resolved = {
		lnkobj:     ctxt.lnkobj,
		refFldCnt:  ctxt.frefbase + cls.refFldCnt.value,
		dataFldCnt: ctxt.fintbase + cls.dataFldCnt.value,
		vbase:      ctxt.vbase    + cls.vbase.value,
	    };
	    if( cls.resolved.refFldCnt > 255 ||
		cls.resolved.dataFldCnt > 255 ||
		cls.resolved.vbase + cls.methodCnt.value > 255 )
		this.reportError(cls, "Too many field/reference slots or too many virtual methods");
	    this.replaceInt(cls.refFldCnt,  cls.resolved.refFldCnt);
	    this.replaceInt(cls.dataFldCnt, cls.resolved.dataFldCnt);
	    this.replaceInt(cls.vbase,      cls.resolved.vbase);
	    // Adjust new virtual idx
	    var newvidxs = cls.newVidxs;
	    for( var ni=0; ni<newvidxs.childNodes.length; ni++ ) {
		var vidx = newvidxs.childNodes[ni];
		var fixed = ctxt.vbase + vidx.value;
		if( fixed > 255 )
		    this.reportError(cls, "Internal error"); // should not happen - we checked vbase + methodCnt
		this.replaceInt(vidx, fixed);
	    }
	    // Resolve overriden methods
	    var overridevidxs = cls.overrideVidxs;
	    for( var oi=0; oi<overridevidxs.childNodes.length; oi++ ) {
		this.resolveVtok(overridevidxs.childNodes[oi]);
	    }
	    // Resolve interface maps
	    var ifmaps = cls.ifmaps;
	    for( var ii=0; ii<ifmaps.childNodes.length; ii++ ) {
		var ifmap = ifmaps.childNodes[ii];
		this.resolveClsref(ifmap.ifc);
		var map = ifmap.map;
		for( var i=0; i<map.childNodes.length; i++ )
		    this.resolveVtok(map.childNodes[i]);
	    }
	}
	cls.resolved.clsref = SBA.mkResolvedClsref(this.asmid, cls.flags.outOff);
    }
    // Go through image and fix all clsref, fields etc.
    var self = this;
    var an = REGISTRY[0].rootNode.prelude.name.quotedName;
    if( !an.match(/-system$/) )
	throw "First assembly must be a system assembly: "+an;
    var ctxtcls = null;
    var fixFunc = function (node) {
	var match;
	if( node.nodeType=='clsref' || node.nodeType=='csiref' || node.nodeType=='ifcref' ) {
	    self.resolveClsref(node);
	    ctxtcls = node.resolved.clsobj;
	}
	else if( node.nodeType=='methref' ) {
	    self.resolveMethref(node);
	}
	else if( node.nodeType=='v' ) {
	    if( ctxtcls!=null ) {
		self.replaceInt(node, node.value+ctxtcls.resolved.vbase);
	    }
	}
	else if( node.nodeType=='p' ) {
	    self.replaceInt(node, self.import2asmid[node.value]);
	    ctxtcls = AssemblyClsinfo;
	}
	else if( node.nodeType=='opc' && node.nodeName=='ldc.r' ) {
	    self.resolveCoref(node.childNodes[0]);
	}
	else if( node.nodeType=='opc' && node.nodeName.match(/^(ld|st)\.l\.(\d)$/) ) {
	    // On platforms where stack grows to low address lower word for long stack cells.
	    // This implicitely is the base address of the 32-bit element. No adjustment at runtime needed.
	    if( SaguaroDEFS.VMSTACK_GROW_TO_LOW )
		self.replaceInt(node, node.bcdef.vmopc+1);
	}
	else if( node.nodeType=='l'  &&  node.parentNode.nodeName.match(/^((ld|st|inc)\.l|ld\.l\.ref|call\.del)$/) ) {
	    if( SaguaroDEFS.VMSTACK_GROW_TO_LOW )
		self.replaceInt(node, node.value+1);
	}
	else if( node.nodeType=='f' ) {
	    // Field reference - distinguish between ref/int
	    if( ctxtcls!=null ) {
		var refField = node.parentNode.nodeName.match(/^(ld|st)f\.r(\.this|\.ref|\.asm)?$/);
		self.replaceInt(node, node.value + (refField
						    ? ctxtcls.resolved.refFldCnt
						    : ctxtcls.resolved.dataFldCnt));
	    }
	}
	if( node.childNodes != null ) {
	    for( var i=0; i<node.childNodes.length; i++ ) {
		fixFunc(node.childNodes[i]);
	    }
	}
    }
    fixFunc(this.rootNode.image.bcodes);
}


SBA.prototype.dumpForSimulation = function () {
    // Convert binary data to a string constant.
    var toStrData = function (addr, data, len) {
	var bytes = [sprintf("  { AC_PMEM, 0x%X, 0x%X, (const u1_t*)\"", addr, len)];
	if( len > 6 )
	    bytes.push("\"\n\"");
	for( var i=0; i<len; i++ ) {
	    bytes.push(sprintf("\\x%02x", data[i]));
	    if( i%16 == 15 )
		bytes.push("\"\n\"");
	}
	bytes.push(sprintf("\" },\n"));
	return bytes.join("");
    }
    return (toStrData(this.segm2PrefBase['t'],
		      this.ctentry,
		      this.ctentry.length)
	    +
	    toStrData(this.segm2PrefBase['a'],
		      this.prelude.concat(this.image),
		      this.codeSize)
	    +
	    toStrData(this.segm2PrefBase['d'],
		      this.idata,
		      this.idataSize)
	   );
}

SBA.dumpForIar = function  (cpu, addr, data, len) {
    // Note: The scheme initialized array with placement
    // did not work on ARM tool chain because of a problem with the IAR linker!
    var bytes = [
	cpu=='avr'
	    ? sprintf("const __root __flash char INI_DATA_P_%X[] @ 0x%X = {\n", addr, addr)
	    : cpu=='msp430'
	    ? sprintf("const __root char INI_DATA_P_%X[] @ 0x%X = {\n", addr, addr)
	    : sprintf("//ICF:place at address mem:0x%X { readonly section INI_%X};\n"+
		      "#pragma location=\"INI_%X\"\n"+
		      "const __root char INI_DATA_P_%X[] = {\n", addr, addr, addr, addr, addr)];
    for( var i=0; i<len; i++ ) {
	bytes.push(sprintf("0x%02x,", data[i]));
	if( i%16 == 15 )
	    bytes.push("\n");
    }
    bytes.push(sprintf("};\n"));
    return bytes.join("");
}

SBA.prototype.dumpForIar_X_C = function (cpu) {
    return (SBA.dumpForIar(cpu, this.segm2PrefBase['t'], this.ctentry,                    this.ctentry.length) +
 	    SBA.dumpForIar(cpu, this.segm2PrefBase['a'], this.prelude.concat(this.image), this.codeSize) +
 	    SBA.dumpForIar(cpu, this.segm2PrefBase['d'], this.idata,                      this.idataSize)
 	   );
}

SBA.prototype.dumpForIarAvrC = function () {
    return this.dumpForIar_X_C('avr');
}

SBA.prototype.dumpForIarMsp430C = function () {
    return this.dumpForIar_X_C('msp430');
}

SBA.prototype.dumpForIarArmC = function (start, flash) {
    return this.dumpForIar_X_C('arm');
    // Write to binary flash image file
    var writeData = function (addr, data, len) {
	if( addr < start && addr+len-start > flash.length )
	    this.reportError(data, "Initialization data exceeds flash size!");
	for( var i=0; i<len; i++ )
	    flash[addr-start+i] = data[i];
    }
    writeData(this.segm2PrefBase['t'], this.ctentry, this.ctentry.length);
    writeData(this.segm2PrefBase['a'], this.prelude.concat(this.image), this.codeSize);
    writeData(this.segm2PrefBase['d'], this.idata, this.idataSize);
}

SBA.prototype.dumpForBinaryImage = function (start, flash) {
    // Write to binary flash image file
    var writeData = function (addr, data, len) {
	if( addr < start && addr+len-start > flash.length )
	    this.reportError(data, "Initialization data exceeds flash size!");
	for( var i=0; i<len; i++ )
	    flash[addr-start+i] = data[i];
    }
    writeData(this.segm2PrefBase['t'], this.ctentry, this.ctentry.length);
    writeData(this.segm2PrefBase['a'], this.prelude.concat(this.image), this.codeSize);
    writeData(this.segm2PrefBase['d'], this.idata, this.idataSize);
}

SBA.prototype.dumpForGCCPosix = function () {
    // Convert binary data to a string constant.
    var toStrData = function (addr, data, len) {
	var bytes = [sprintf("  memcpy((unsigned char*)0x%X,\n         \"", addr)];
	for( var i=0; i<len; i++ ) {
	    bytes.push(sprintf("\\x%02x", data[i]));
	    if( i%16 == 15 )
		bytes.push("\"\n         \"");
	}
	bytes.push(sprintf("\", %d);\n",len));
	return bytes.join("");
    }
    return (toStrData(this.segm2PrefBase['t'],
		      this.ctentry,
		      this.ctentry.length)
	    +
	    toStrData(this.segm2PrefBase['a'],
		      this.prelude.concat(this.image),
		      this.codeSize)
	    +
	    toStrData(this.segm2PrefBase['d'],
		      this.idata,
		      this.idataSize)
	   );
}


SBA.prototype.dumpForGCCSegment = function () {
    // Convert binary data to a string constant.
    var toStrData = function (addr, data, len) {
	var bytes = [sprintf("//LD:          . += ABSOLUTE(0x%08X)-ABSOLUTE(.); KEEP(*(.rodata.INI_%08X))\n"+
			     "const unsigned char INI_%08X[] = {\n",
			     addr, addr, addr)];
	for( var i=0; i<len; i++ ) {
	    bytes.push(sprintf("0x%02x,", data[i]));
	    if( i%16 == 15 )
		bytes.push("\n    ");
	}
	bytes.push(sprintf("};\n"));
	return bytes.join("");
    }
    return (toStrData(this.segm2PrefBase['t'],
		      this.ctentry,
		      this.ctentry.length)
	    +
	    toStrData(this.segm2PrefBase['a'],
		      this.prelude.concat(this.image),
		      this.codeSize)
	    +
	    toStrData(this.segm2PrefBase['d'],
		      this.idata,
		      this.idataSize)
	   );
}


// Constant definitions as javascript programm.
SBA.prototype.dumpC4JS = function () {
    var classtable = this.rootNode.image.classTable;
    var consts = [];
    for( var ci=0; ci<classtable.childNodes.length; ci++ ) {
	var cls = classtable.childNodes[ci];
	if( cls.constFields!=null ) {
	    for( var fi=0; fi<cls.constFields.length; fi++ ) {
		var cfld = cls.constFields[fi];
		var name = cls.symbolicName+"."+cfld.name;
		consts.push(cfld.isRef 
			    ? sprintf("%s = [%s];\n", name, cfld.value)
			    : sprintf("%s = %s;\n", name, cfld.value));
	    }
	}
    }
    return consts.join('');
}


SBA.prototype.dumpSystemH = function () {
    var asmidtag = this.asmid==0?"":this.asmid.toString();
    var clslines = [];
    var consts = [];
    var sfields = [];
    var ifields = [];
    var inis = [];
    var classtable = this.rootNode.image.classTable;
    var ctxt = {
	lnkobj:   null,
	fintbase: 0,
	frefbase: 0,
	vbase:    0,
    };
    var mangleName = function (nm) {
	nm = nm.replace(/^com\.ibm\.saguaro\.system\./, "");
	nm = nm.replace(/[^A-Za-z0-9]/g,"_");
	return nm;
    };

    // Insert name of assembly
    var ai = this.rootNode.prelude.name;
    var qn = ai.name.value;
    qn = qn.replace(/[^a-zA-Z0-9]/g,"_");
    clslines.push(sprintf("#define ASMNAME_%s       %d\n", qn, this.asmid));
    clslines.push(sprintf("#define ASMNAME_%s_%d    %d\n", qn, ai.major.value, this.asmid));
    clslines.push(sprintf("#define ASMNAME_%s_%d_%d %d\n", qn, ai.major.value, ai.minor.value, this.asmid));


    for( var ci=0; ci<classtable.childNodes.length; ci++ ) {
	var cls = classtable.childNodes[ci];
	var nm  = cls.symbolicName;
	if( nm == "com.ibm.saguaro.system.DEFS" )
	    continue; 
	// Massage class name
	if( nm != null ) {
	    cls.mangledSymbolicName = nm = mangleName(nm);    
	    clslines.push(sprintf("#define CLSREF%s_%-28s 0x%04X\n", asmidtag, nm, cls.resolved.clsref));

	    var isEx = nm.match(/^(\w+)Exception$/);
	    if( cls.constFields!=null ) {
		for( var fi=0; fi<cls.constFields.length; fi++ ) {
		    var cfld = cls.constFields[fi];
		    if( isEx ) {
			var exnm = isEx[1];
			exnm = exnm.replace(/([a-z0-9])([A-Z])/g,"$1_$2");
			consts.push(sprintf("#define EX%s_%-28s 0x%04X\n", asmidtag, exnm.toUpperCase()+"_"+cfld.name.toUpperCase(), cfld.value));
		    } else {
			consts.push(sprintf("#define CONST%s_%-28s 0x%04X\n", asmidtag, nm+"_"+cfld.name, cfld.value));
		    }
		}
	    }
	    if( cls.symbolicName != "com.ibm.saguaro.system.$tatics" ) {
		if( cls.instanceFields!=null ) {
		    ifields.push(sprintf("#define RFLDCNT%s_%-28s %d\n",
					 asmidtag, nm, cls.resolved.refFldCnt));
		    for( var fi=0; fi<cls.instanceFields.length; fi++ ) {
			var ifld = cls.instanceFields[fi];
			ifields.push(sprintf("#define %sFLDSLOT%s_%-28s 0x%04X\n",
					     ifld.isRef ? "R":"I",
					     asmidtag, 
					     nm+"_"+ifld.name,
					     ifld.slot));
		    }
		}
		if( cls.staticFields!=null && cls.symbolicName != "com.ibm.saguaro.system.$tatics" ) {
		    var AssemblyClsinfo = SBA.getAssemblyClsinfo();
		    for( var fi=0; fi<cls.staticFields.length; fi++ ) {
			var sfld = cls.staticFields[fi];
			// Write INT fields fully resolved since we know $tatics is a sealed class
			// (no further subclassing).
			var fixup = (sfld.isRef
				     ? AssemblyClsinfo.resolved.refFldCnt
				     : AssemblyClsinfo.resolved.dataFldCnt + this.staticsCls.resolved.refFldCnt);
			sfields.push(sprintf("#define SFLDSLOT%s_%-28s 0x%04X\n",
					     asmidtag, 
					     nm+"_"+sfld.name,
					     // Fix static slot with fields from Assembly class.
					     // Statics object of an Assembly is a subclass of Assembly class.
					     sfld.slot + fixup));
		    }
		}
	    }
	}
    }
    var smeth = [];
    var vmethslot = []; 
    var smethslot = [];
    for( var mi=0; mi<this.mhdrNodes.length; mi++ ) {
	var mhdrobj = this.mhdrNodes[mi];
	// mangle method name
	if( mhdrobj.belongsToClsinfo==null )
	    continue;
	var nm = mhdrobj.belongsToClsinfo.mangledSymbolicName+'_'+mhdrobj.symbolicName;
	if( nm != null ) {
	    // Remove common qualifier
	    nm = nm.replace(/\bcom\.ibm\.saguaro\.(system\.)?/g, '');
	    // delete non_virt$
	    nm = nm.replace(/non_virt\$/g, '');
	    // r:ABC ==> rABC
	    nm = nm.replace(/:/g, '');
	    // delete closing brace
	    nm = nm.replace(/\)$/g, '');
	    // b[] ==> bA
	    nm = nm.replace(/\[\]/g, 'A');
	    // b& ==> bA
	    nm = nm.replace(/\&/g, 'R');
	    // Replace all non-alphanum by _ (e.g. . $)
	    nm = nm.replace(/[^A-Za-z0-9]/g, '_');
	    // Detect CTOR calls and abbrev
	    nm = nm.replace(/^(\w+)_\1_r\1/, 'CTOR_$1');
	    // Remove trailing _ (if empty parameter list)
	    nm = nm.replace(/_$/,'');
	    mhdrobj.mangledSymbolicName = nm;
	    if( mhdrobj.category=='static' ) {
		if( mhdrobj.smethSlot != null )
		    smethslot.push(sprintf("#define SMETHSLOT%s_%-28s 0x%04X\n",
					   asmidtag, nm, (mhdrobj.smethSlot+SaguaroDEFS.SIZE_asmhdr_t/2)|0));
		smeth.push(sprintf("#define SMETH%s_%-28s 0x%04X\n",
				   asmidtag, nm, (mhdrobj.destOff/SaguaroDEFS.ALIGN_METHHDR)|0));
	    } else {
		vmethslot.push(sprintf("#define METHSLOT%s_%-28s 0x%04X\n",
				       asmidtag, nm, mhdrobj.vidx+mhdrobj.belongsToClsinfo.resolved.vbase));
	    }
	}
    }
    var iniarys = this.rootNode.iniarys;
    for( var ii=0; ii<iniarys.childNodes.length; ii++ ) {
	var iniary = iniarys.childNodes[ii];
	if( 'jref' in iniary ) {
	    inis.push(sprintf("#define INI%s_%d_JREF 0x%04X\n"+
			      "#define INI%s_%d_PREF ((pref_t)0x%X)\n",
			      asmidtag, ii, iniary.jref,
			      asmidtag, ii, iniary.pref));
	}
    }
    return (clslines.join('')  +
	    consts.join('')    +
	    sfields.join('')   +
	    ifields.join('')   +
	    smeth.join('')     +
	    smethslot.join('') +
	    vmethslot.join('') +
	    inis.join('')      );
}



var WalkCtxt = function (sba, onNodeFunc) {
    this.lines  = [];
    this.indent = 2;
    this.indent = 2;
    this.level  = 0;
    this.sba    = sba;
    this.output = this.image;
    this.outOff = 0;
    if( onNodeFunc )
	this.onNode = onNodeFunc;
    this.bytesPerLine = 4;
    var paddrw = SaguaroDEFS.CABIN_TABLE_SPACE_BEG_PREF > 0xFFFF ? 8 : 6;
    this.columnDefs = [
	{ minWidth: 6 },                    // 0   f:addr
	{ minWidth: this.bytesPerLine*3 },  // 1   f:data bytes
	{ minWidth: paddrw},                // 2   p:addr
	{ minWidth: 6 },                    // 3   i:image addr
	{ minWidth: this.bytesPerLine*3 },  // 4   i:data bytes
	{ },                                // 5   domtree node description
	null                                // 6   sdt file text
    ];
    if( TOOL.usePersistentAddr() ) {
	this.columnDefs[0] = this.columnDefs[1] = null;
    } else {
	this.columnDefs[2] = null;
    }
}

WalkCtxt.prototype.onNode = function (node) {
    var colDatas = [];
    var bpl = this.bytesPerLine;

    if( this.level==0 ) {
	this.lines.push(sprintf("--------\n%s\n\n", node.nodeName));
	return;
    }

    if( node.sbaLen > 0 ) {
	colDatas[0] = DumpHelper.formatAddr("f:%04X",           node.sbaOff, node.sbaLen, bpl);
	colDatas[1] = DumpHelper.formatData(this.sba.fileBytes, node.sbaOff, node.sbaLen, bpl);
    }
    
    if( node.outSegment != null  &&  node.outLen > 0 ) {
	var segm = node.outSegment;
	var data = this.sba.outmap[segm];
	var off = node.outOff;
	var len = node.outLen;
	var pref = this.sba.segm2PrefBase[segm]+off;
	colDatas[3] = DumpHelper.formatAddr(segm+":%04X", off,  len, bpl);
	colDatas[4] = DumpHelper.formatData(data,         off,  len, bpl);
	colDatas[2] = DumpHelper.formatAddr(      "p:%X", pref, len, bpl);
    }
    var text = sprintf("%*s%s%s %s",
		       (this.level-1)*this.indent, "",
		       node.nodeType ? node.nodeType+':' : "",
		       node.nodeName||"-",
		       node.comment||"");
    if( node.symbolicName != null )
	text += node.symbolicName;
    if( node.resolved != null ) {
	if( node.resolved.clsobj != null && node.resolved.clsobj.symbolicName != null )
	    text += ' ->'+node.resolved.clsobj.symbolicName;
	if( node.resolved.mhdr != null && node.resolved.mhdr.symbolicName != null )
	    text += ' ->'+node.resolved.mhdr.symbolicName;
    }
    colDatas[5] = [ text ];
    
    this.lines.push(DumpHelper.formatColumns(this.columnDefs, colDatas));
}

WalkCtxt.prototype.onNodeDone = function (node) {
}

WalkCtxt.prototype.startWalk = function () {
    this.walkSubtree(this.sba.rootNode);
}


WalkCtxt.prototype.walkSubtree = function (node) {
    this.onNode(node);
    if( node.childNodes!=null && node.childNodes.length > 0 ) {
	this.level++;
	for( var i=0; i<node.childNodes.length; i++ )
	    this.walkSubtree(node.childNodes[i]);
	this.level--;
    }
    this.onNodeDone(node);
}

WalkCtxt.prototype.getLines = function () {
    var t = this.lines.join('');
    this.lines = [];
    return t;
}



var DumpHelper = {
    
    formatAddr: function (fmt, address, len, perLine) {
	var lines = [];
	for( var off = 0; off<len; off+=perLine )
	    lines.push(sprintf(fmt, address+off));
	return lines;
    },

    formatData: function (data, beg, len, perLine) {
	var lines = [];
	for( var off = 0; off<len; off+=perLine ) {
	    var n = off+perLine > len ? len-off : perLine;
	    var t = [];
	    var i;
	    for( i=0; i<n; i++ ) {
		t.push(sprintf("%02X ", data[beg+off+i]));
	    }
	    while( i++ < perLine ) {
		t.push("__ ");
	    }
	    lines.push(t.join(''));
	}
	return lines;
    },

    formatColumns: function (colDefs, colDatas) {
	// colDefs[i]:
	//    null   => not printed
	//    { minWidth: N,   => column layout
	//      maxWidth: M,
	//      overflow: 'truncate'|'wrap'
	//     }
	// colData[i]: null  =>  empty
	//             [..]  =>  text lines
	var lno = 0;
	var output = [];
	while( true ) {
	    var nocontents = true;
	    var outline = [];
	    for( var ci=0; ci<colDefs.length; ci++ ) {
		var colDef = colDefs[ci];
		if( colDef!=null ) {
		    var colData = colDatas[ci];
		    var line;
		    if( colData instanceof Array ) {
			line = colData[lno];
		    } else {
			line = lno==1 && colData!=null ? colData.toString() : null;
		    }
		    if( line == null ) {
			line = "";
		    } else {
			nocontents = false;
		    }
		    if( 'maxWidth' in colDef && line.length > colDef.maxWidth )
			line = line.substr(0,colDef.maxWidth-2)+'..';
		    outline.push(sprintf("%s%-*s", outline.length==0 ? "":" | ", colDef.minWidth||0, line));
		}
	    }
	    if( nocontents )
		break;
	    lno++;
	    outline.push("\n");
	    output.push(outline.join(""));
	}
	return output.join("");
    },
};


// Default Saguaro defs if none specified.
var DefaultSaguaroDEFS = {
    // Portable (defined by loadfile format):
    LOADFILE_MAGIC: 0x5EEDCA5E,
    LOADFILE_MAJOR: 0x1,
    LOADFILE_MINOR: 0x0,
    ASM_NAME_MAXLEN: 16,
    SIZE_padded_asmname_t: /*minor/major/len*/3+/*max namel len*/16+/*pad 4n*/1,
    CR_MAXASM: 64,
    CR_OFF_MASK: 0x03FF,
    CR_ASM_MASK: 0xFC00,
    CR_ASM_MASK_SHIFT: 10,
    CR_IF_MARKER: 0x3C0,
    MR_ASM_MASK: 0xFC00,
    MR_ASM_MASK_SHIFT: 10,
    MR_OFF_MASK: 0x03FF,
    ALIGN_SIZEINFO: 0x8,
    ALIGN_CLSINFO: 4,
    ALIGN_METHHDR: 2,
    ESC_EXBLK: 0x01,
    ESC_EOC: 0x02,
    // Target specific:
    BYTEORDER_LITTLE: 0,
    REG_SIZE: 64,
    ALIGN_OBJ: 4,
    OT_BYTE:   0x0,
    OT_INT:    0x3,
    OT_LONG:   0x1,
    OT_REFARY: 0x4,
    CABIN_OCCUPIED:  0x03,
    CABIN_ERASED_U2: 0x0000,
    SIZE_asmhdr_t: 0xA,
    SIZE_cabin_t:       6,
    OFF_cabin_status:   0,
    OFF_cabin_imageEnd: 2,
    OFF_cabin_pheapBeg: 4,
    ALIGN_CABIN: 8,
    CABIN_SPACE_SIZE_ATOMS:     0x1000,  // * ALIGN_CABIN => 32K
    CABIN_SPACE_BEG_PREF:       0x8000,
    CABIN_TABLE_SPACE_BEG_PREF: 0x7E00,
    ALIGN_OBJTAREA_LOG2: 1,
    ALIGN_OBJ_LOG2: 1,
    TAREA_BEG_XREF: 0x1000,
    TAREA_END_XREF: 0x2000,
    THEAP_BEG_XREF: 0x2000,
    THEAP_END_XREF: 0x3000,
    PHEAP_MIN_PREF: 0x8000,
};

var DEFINES = {};


var TOOL_CTOR = function (argv) {
    this.opts = {   CMD:  null };
    this.opts.helpOpt        = new GetOpt.HelpOpt();
    this.opts.verboseOpt     = new GetOpt.Option('v', '--verbose', 0, null, "Verbose mode. More details in dump of internal node tree", null);
    this.opts.dumpFile       = new GetOpt.Simple('file');
    this.opts.dumpOpt        = new GetOpt.Option('d', '--dump',    0, null, "Dump internal node tree", this.opts.dumpFile);
    this.opts.persAddrOpt    = new GetOpt.Option('p', '--pers',    0, null, "Display persistent addresses instead of sba offset/data", null);
    this.opts.linkOpt        = new GetOpt.Option('l', '--link',    0, null, "Link SBA files and create image files for target platforms", null);
    this.opts.defineValue    = new GetOpt.Simple('name[=value]', 'A variable definition with an optional value.');
    this.opts.defineOpt      = new GetOpt.Option('D', '--define', 0, null, null, this.opts.defineValue);
    this.opts.simFile        = new GetOpt.Simple('file','The assembly image data for include into Saguaro build env.');
    this.opts.simOpt         = new GetOpt.Option(null, '--sim', 0, null, null, this.opts.simFile);
    this.opts.iaravrcFile    = new GetOpt.Simple('file','C language output for IAR AVR C-compiler.');
    this.opts.iaravrcOpt     = new GetOpt.Option(null, '--iaravrc', 0, null, null, this.opts.iaravrcFile);
    this.opts.iarmsp430cFile = new GetOpt.Simple('file','C language output for IAR MSP430 C-compiler.');
    this.opts.iarmsp430cOpt  = new GetOpt.Option(null, '--iarmsp430c', 0, null, null, this.opts.iarmsp430cFile);
    this.opts.iararmcFile    = new GetOpt.Simple('file','C language output for IAR ARM C-compiler.');
    this.opts.iararmcOpt     = new GetOpt.Option(null, '--iararmc', 0, null, null, this.opts.iararmcFile);
    this.opts.gccposixFile   = new GetOpt.Simple('file','C language output for standard C language environment.');
    this.opts.gccposixOpt    = new GetOpt.Option(null, '--gccposix', 0, null, null, this.opts.gccposixFile);
    this.opts.gccsegmentFile = new GetOpt.Simple('file','C language output for standard C with GCC segment attribute.');
    this.opts.gccsegmentOpt  = new GetOpt.Option(null, '--gccsegment', 0, null, null, this.opts.gccsegmentFile);
    this.opts.sysFile        = new GetOpt.Simple('file','C header file with class/method/field tokens from image.');
    this.opts.sysOpt         = new GetOpt.Option(null, '--sys', 0, null, null, this.opts.sysFile);
    this.opts.defsFile       = new GetOpt.FileSpec('saguaro-defs.js','The system definitions for a particular target platform.');
    this.opts.defsOpt        = new GetOpt.Option(null, '--saguarodefs', 0, null, null, this.opts.defsFile);
    this.opts.c4jsFile       = new GetOpt.Simple('outdefs.js','The file receiving constant definitions (SDX file required).');
    this.opts.c4jsOpt        = new GetOpt.Option(null, '--c4js', 0, null, null, this.opts.c4jsFile);
    this.opts.jrefFile       = new GetOpt.FileSpec('jref.js','The platform specific algorithm to convert pref into a jref.');
    this.opts.jrefOpt        = new GetOpt.Option(null, '--jref', 0, null, null, this.opts.jrefFile);
    this.opts.sbaFiles       = new GetOpt.RestOfArgs('sbafiles..', "List of assembly files (sba) to process.");

   this.opts.argSpec     = new GetOpt.Seq([
      new GetOpt.OptionSet([ this.opts.helpOpt,
			     this.opts.defineOpt,
			     this.opts.dumpOpt,
			     this.opts.persAddrOpt,
			     this.opts.linkOpt,
			     this.opts.verboseOpt,
			     this.opts.iaravrcOpt,
			     this.opts.iarmsp430cOpt,
			     this.opts.iararmcOpt,
			     this.opts.gccposixOpt,
			     this.opts.gccsegmentOpt,
			     this.opts.simOpt,
			     this.opts.sysOpt,
			     this.opts.c4jsOpt,
			     this.opts.jrefOpt,
			     this.opts.defsOpt ]),
      this.opts.sbaFiles
   ]);
    this.opts.CMD = new GetOpt.Cmd('sbatool', this.opts.argSpec, "Load a sequence of sba files and process them.\n");
		       
    if( !this.opts.CMD.parse(argv) ) {
	Runtime.exit(12);
    }
    if( this.opts.defineOpt.isSet() ) {
	for( var di=0, dn=this.opts.defineOpt.isSet(); di<dn; di++ ) {
	    this.opts.defineOpt.setTo(di);
	    var def = this.opts.defineValue.getArg();
	    var eqi;
	    if( (eqi = def.indexOf('=')) >= 0 ) {
		DEFINES[def.substr(0,eqi)] = def.substr(eqi+1);
	    } else {
		DEFINES[def] = 1;
	    }
	}
    }
    if( this.opts.linkOpt.isSet() ) {
	if( !this.opts.defsOpt.isSet() ) {
	    printf("sbatool: Linking mandates a --saguarodefs=FILE.js for a target platform.");
	    Runtime.exit(1);
	}
	if( !DEFINES.CFG_simulation && !this.opts.jrefOpt.isSet() ) {
	    printf("sbatool: Linking against a target system (aka not simulation) mandates a pref to jref algorithm.\n"+
		   "  Specify using the --jref=FILE.js option.\n");
	    Runtime.exit(1);
	}
    }
    if( this.opts.defsOpt.isSet() ) {
	var ex;
	try {
	    Runtime.include(this.opts.defsFile.getArg());
	} catch (ex) {
	    printf("sbatool: Failed to load Saguaro definitions file: "+ex);
	    Runtime.exit(1);
	}
    } else {
	var e;
	try {
	    // Try loading defs - if already loaded won't do anything
	    Runtime.include("server/saguaro/saguaro-defs.js");
	} catch (e) {}
	// If still not defined use internal defaults
	if( SaguaroDEFS==null )
	    SaguaroDEFS = DefaultSaguaroDEFS;
    }
    var funcname = 'conv_pref2jref';
    if( this.opts.jrefOpt.isSet() ) {
	var ex, file=this.opts.jrefFile.getArg();
	try {
	    Runtime.include(file);
	} catch (ex) {
	    printf("sbatool: Failed to load jref algorithm file: "+ex);
	    Runtime.exit(1);
	}
	if( GLOBAL_CONTEXT[funcname] == null ) {
	    printf("sbatool: File `%s' did not define a function named: %s\n", file, funcname);
	    Runtime.exit(1);
	}
    } else {
	GLOBAL_CONTEXT[funcname] = function (pref) {
	    var MAX_FAKES = (SaguaroDEFS.CR_MAXASM+/*null*/1+/*natives*/1)
	    var MAX_TAREA = (((SaguaroDEFS.TAREA_END_XREF - SaguaroDEFS.TAREA_BEG_XREF)>>SaguaroDEFS.ALIGN_OBJTAREA_LOG2)+MAX_FAKES)
	    var MAX_THEAP = (((SaguaroDEFS.THEAP_END_XREF - SaguaroDEFS.THEAP_BEG_XREF)>>SaguaroDEFS.ALIGN_OBJ_LOG2)     +MAX_TAREA)
	    return ((pref-SaguaroDEFS.PHEAP_MIN_PREF)>>SaguaroDEFS.ALIGN_OBJ_LOG2) + MAX_THEAP;
	}
    }
}

TOOL_CTOR.prototype.isVerbose = function () {
    return this.opts.verboseOpt.isSet();
}

// True: link set of SBA files, false: validate individual SBA files
TOOL_CTOR.prototype.doLink = function () {
    return this.opts.linkOpt.isSet();
}

TOOL_CTOR.prototype.usePersistentAddr = function () {
    return this.opts.persAddrOpt.isSet();
}


TOOL_CTOR.prototype.checkFindings = function (sba) {
    // Validate only
    if( sba.findings.length == 0 ) {
	if( this.isVerbose() )
	    printf("%s - ok\n", sba.filename);
	return false;
    }
    // In case of errors - dump node tree
    var ctxt = new WalkCtxt(sba);
    ctxt.startWalk();
    print(ctxt.getLines());
    
    printf("\nValidation results for: %s\n%s",
	   sba.filename, sba.findings.join(''));
    return true;
}

TOOL_CTOR.prototype.walkAndDump = function (sba) {
    if( this.opts.dumpOpt.isSet() ) {
	var ctxt = new WalkCtxt(sba);
	ctxt.startWalk();
	try {
	    OSFile.writeFully(this.opts.dumpFile.getArg(), ctxt.getLines());
	} catch (e) {
	    printf("sbatool: Failed to write file: "+e);
	    Runtime.exit(1);
	}
    }
}

TOOL_CTOR.prototype.process = function () {
    var e, ex;
    var sbafiles = this.opts.sbaFiles.getRestArgs();
    if( sbafiles.length == 0 ) {
	printf("No sba files specified.\n");
	return 1;
    }
    for( var si=0; si < sbafiles.length; si++ ) {
	var data, sba, sbafile = sbafiles[si];
	    printf("sbafile: %s\n", sbafile);
	try {
	    data = OSFile.readFully(sbafile);
	} catch (ex) {
	    printf("sbatool: %s\n", ex);
	    printf("%s\n", Runtime.dumpException(ex));
	    return 1;
	}
	if( data.length==0 ) {
	    printf("File `%s' is empty.\n", sbafile);
	    return 1;
	}
	try {
	    sba = new SBA();
	} catch (e) {
	    sba.reportError(null, "Exception while parsing sba file `%s': %s", sbafile, e);
	    ex = e;
	}
	sba.init(data, sbafile);
	if( !this.doLink() ) {
	    this.walkAndDump(sba);
	    if( ex!=null ) {
		printf("%s: Failed to fully read assembly: %s\n", sbafile, ex);
		return 1;
	    }
	}
	sba.validate();
	if( !this.doLink() ) {
	    // Validate only
	    this.checkFindings(sba);
	    continue;
	}
	// Validate and link
	sba.resolve();
	if( sba.findings.length > 0 ) {
	    this.checkFindings(sba);
	    return 1;
	}
	this.walkAndDump(sba);
    }
    // Generate specific dump files 
    if( this.opts.simOpt.isSet() ) {
	var filename = this.opts.simFile.getArg();
	var t = [];
	for( var asmid=0; asmid < REGISTRY.length; asmid++ ) {
	    t.push(REGISTRY[asmid].dumpForSimulation());
	}
	try {
	    OSFile.writeFully(filename, t.join(""));
	} catch (e) {
	    printf("sbatool: Failed to write file `%s': %s\n", filename, e);
	    return 1;
	}
    }
    if( this.opts.iaravrcOpt.isSet() ) {
	var filename = this.opts.iaravrcFile.getArg();
	var t = [];
	for( var asmid=0; asmid < REGISTRY.length; asmid++ ) {
	    t.push(REGISTRY[asmid].dumpForIarAvrC());
	}
	try {
	    OSFile.writeFully(filename, t.join(""));
	} catch (e) {
	    printf("sbatool: Failed to write file `%s': %s\n", filename, e);
	    return 1;
	}
    }
    if( this.opts.iarmsp430cOpt.isSet() ) {
	var filename = this.opts.iarmsp430cFile.getArg();
	var t = [];
	for( var asmid=0; asmid < REGISTRY.length; asmid++ ) {
	    t.push(REGISTRY[asmid].dumpForIarMsp430C());
	}
	try {
	    OSFile.writeFully(filename, t.join(""));
	} catch (e) {
	    printf("sbatool: Failed to write file `%s': %s\n", filename, e);
	    return 1;
	}
    }
    if( this.opts.iararmcOpt.isSet() ) {
	var filename = this.opts.iararmcFile.getArg();
	if( filename.substr(-4) == ".img" ) {
	    var start = SaguaroDEFS.CABIN_TABLE_SPACE_BEG_PREF;
	    var end   = SaguaroDEFS.CABIN_SPACE_END_PREF;
	    var flash = new Array(end-start);
	    for( var i=0; i<flash.length; i++ )
		flash[i] = SaguaroDEFS.HAL_FLASH_ERASED_BYTE;
	    for( var asmid=0; asmid < REGISTRY.length; asmid++ )
		REGISTRY[asmid].dumpForBinaryImage(start,flash);
	    try {
		for( var i=0; i<flash.length; i++ )
		    flash[i] = String.fromCharCode(flash[i]);
		OSFile.writeFully(filename, flash.join(""));
	    } catch (e) {
		printf("sbatool: Failed to write file `%s': %s\n", filename, e);
		return 1;
	    }
	} else if( filename.substr(-6) == ".img.c" ) {
	    var start = SaguaroDEFS.CABIN_TABLE_SPACE_BEG_PREF;
	    var end   = SaguaroDEFS.CABIN_SPACE_END_PREF;
	    var flash = new Array(end-start);
	    for( var i=0; i<flash.length; i++ )
		flash[i] = SaguaroDEFS.HAL_FLASH_ERASED_BYTE;
	    for( var asmid=0; asmid < REGISTRY.length; asmid++ )
		REGISTRY[asmid].dumpForBinaryImage(start,flash);
	    try {
		OSFile.writeFully(filename, SBA.dumpForIar('arm', start, flash, flash.length));
	    } catch (e) {
		printf("sbatool: Failed to write file `%s': %s\n", filename, e);
		return 1;
	    }
	} else {
	    var t = [];
	    for( var asmid=0; asmid < REGISTRY.length; asmid++ ) {
		t.push(REGISTRY[asmid].dumpForIarArmC());
	    }
	    try {
		OSFile.writeFully(filename, t.join(""));
	    } catch (e) {
		printf("sbatool: Failed to write file `%s': %s\n", filename, e);
		return 1;
	    }
	}
    }
    if( this.opts.gccposixOpt.isSet() ) {
	var filename = this.opts.gccposixFile.getArg();
	var t = [];
	for( var asmid=0; asmid < REGISTRY.length; asmid++ ) {
	    t.push(REGISTRY[asmid].dumpForGCCPosix());
	}
	try {
	    OSFile.writeFully(filename, t.join(""));
	} catch (e) {
	    printf("sbatool: Failed to write file `%s': %s\n", filename, e);
	    return 1;
	}
    }
    if( this.opts.gccsegmentOpt.isSet() ) {
	var filename = this.opts.gccsegmentFile.getArg();
	var t = [];
	for( var asmid=0; asmid < REGISTRY.length; asmid++ ) {
	    t.push(REGISTRY[asmid].dumpForGCCSegment());
	}
	try {
	    OSFile.writeFully(filename, t.join(""));
	} catch (e) {
	    printf("sbatool: Failed to write file `%s': %s\n", filename, e);
	    return 1;
	}
    }
    if( this.opts.sysOpt.isSet() ) {
	var filename = this.opts.sysFile.getArg();
	var t = [];
	for( var asmid=0; asmid < REGISTRY.length; asmid++ ) {
	    t.push(REGISTRY[asmid].dumpSystemH());
	}
	try {
	    OSFile.writeFully(filename, t.join(""));
	} catch (e) {
	    printf("sbatool: Failed to write file `%s': %s\n", filename, e);
	    return 1;
	}
    }
    if( this.opts.c4jsOpt.isSet() ) {
	var filename = this.opts.c4jsFile.getArg();
	var t = [];
	for( var asmid=0; asmid < REGISTRY.length; asmid++ ) {
	    t.push(REGISTRY[asmid].dumpC4JS());
	}
	try {
	    OSFile.writeFully(filename, t.join(""));
	} catch (e) {
	    printf("sbatool: Failed to write file `%s': %s\n", filename, e);
	    return 1;
	}
    }
    return 0;
}

try {
    var TOOL = new TOOL_CTOR(ARGV);
    Runtime.exit(TOOL.process());
} catch(ex) {
    println(Runtime.dumpException(ex));
    Runtime.exit(1);
}


