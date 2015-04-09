// //  (C) COPYRIGHT INTERNATIONAL BUSINESS MACHINES CORPORATION 2006-2010
// //                       ALL RIGHTS RESERVED
// //        IBM Research Division, Zurich Research Laboratory
// // --------------------------------------------------------------------









// /**
//  * CLI.Commands.Events
//  * @class
//  * @private
//  */
// CLI.Commands.Event = {};

// /**
//  * @constant
//  * @type String
//  */
// CLI.Commands.Event.USAGE = "Show event history.";

// /**
//  * @constant
//  * @type String
//  */
// CLI.Commands.Event.DESCRIPTION =
//     "Use event-show to show/search past events or configure events dumped on the shell.\n"  +
//     "Use event-wait to wait for a particular event.";




// /**
//  * Implements a shell attribute.
//  * @class
//  * @augments CLI.Shell.Attr
//  * @constructor
//  * @private
//  */
// CLI.Commands.Event.MarkerAttr = function() {
//     this.name = "CLI.Commands.Event.MarkerAttr";
//     this.marker = 1;
//     this.onClose = function() {
// 	;
//     };
// };


// /**
//  * Creaete or get shell marker attribute
//  * @private
//  */
// CLI.Commands.Event.MarkerAttr.get = function(shell) {
//     var attr = shell.getAttr("CLI.Commands.Event.MarkerAttr");
//     if (!attr) {
//         attr = new CLI.Commands.Event.MarkerAttr();
//         shell.setAttr("CLI.Commands.Event.MarkerAttr", attr);
//     }
//     return attr;
// };
    


// /**
//  * @class 
//  * @constructor
//  * @private
//  */
// CLI.Commands.Event.ShowCommand =  function(/** CLI.Shell */shell, /** String */name) {
//     this.description =
//         "Show/search past events. Without parameters, shows all events in the history " +
// 	"having occured since last call.\n" +
//         "If tags are specified (-t), the events are matched against these tags.\n" +
//         "Time intervals  may be specified to select events using --time.\n" +
// 	"'ev-show' must be called once to initialize the event history.\n " +
//         "Examples:\n" +
//         "ev-show                           Initalize event history or show events since last call.\n" +
//         "ev-show -a                        Show all events.\n" +
//         "ev-show -a -t register            Show events containing 'register'.\n" +
//         "ev-show -c 10\n                   Show last 'cnt' events." +
//         "--clear clears all events currently stored in the history buffer.\n" +
//         "--imm-list list all event categories and names dummped immediately on shells.\n" +
//         "--imm-add adds event category and name to dummp immediately on shells.\n" +
//         "--imm-del removes event category and name to dummp immediately on shells.\n"
//     ;
//     this.cntSpec = new GetOpt.Number("count", "Show up to 'count' events", null, null);
//     this.cntSpec.setRange(1, 1, 1024);
//     this.cntOpt = new GetOpt.Option("c", "--cnt", 0, null, null, this.cntSpec);
//     this.allOpt = new GetOpt.Option("a", "--all", 0, null, "Show all events in history");

//     this.stSpec = new GetOpt.MicrosSpec(null, "Start-time for interval: hours:mins:secs.millis'micros");
//     this.etSpec = new GetOpt.MicrosSpec(null, "End-time for interval: hours:mins:secs.millis'micros");
//     this.tseq = new GetOpt.Seq([ this.stSpec, this.etSpec ], 2);
//     this.tset = new GetOpt.Set(this.tseq, 0);

//     this.timeOpt = new GetOpt.Option(null, "--time", 0, null, "Specify time intervals to search in: hours:mins:secs.millis'micros hours:mins:secs.millis'micros", this.tset);

//     this.tagSpec = new GetOpt.Simple("tag", "Search tag.");
//     this.tagOpt = new GetOpt.Option("t", "--tag", 0, null, "Search tag", this.tagSpec);
    
//     this.clearOpt = new GetOpt.Option(null, "--clear", 0, null, "Clear all events in history");


//     this.listimmOpt = new GetOpt.Option(null, "--imm-list", 0, null, "List events dumped immediately on shells");
//     this.addimmSpec = new GetOpt.Simple("category:evname", "Category and event name");

//     this.addimmOpt = new GetOpt.Option(null, "--imm-add", 0, null, "Add 'category:evname' to events dumped immediately on shells.", this.addimmSpec);
//     this.delimmSpec = new GetOpt.Simple("category:evname", "Category and event name");
//     this.delimmOpt = new GetOpt.Option(null, "--imm-del", 0, null, "Delete 'category:evname' from events dumped immediately on shells.", this.delimmSpec);

//     this.optSet = new GetOpt.OptionSet([ this.allOpt, this.cntOpt, this.tagOpt, this.timeOpt, this.clearOpt, this.listimmOpt, this.addimmOpt, this.delimmOpt  ]);


//     this.endOfArgs = new GetOpt.EndOfArgs();

//     CLI.Command.call(this, shell, name, [ this.optSet, this.endOfArgs ], 1); //, 1);
// };

// /** @private */
// CLI.Commands.Event.ShowCommand.prototype = extend(
//     CLI.Command.prototype,
//     {
//         /** @private */
//         exec: function(callback) {
//             var shell = this.shell;
//             var attr = CLI.Commands.Event.MarkerAttr.get(shell);
//             var intervals = [];
//             var tags = [];
//             var marker;
//             var cnt;

//             var imm2info = function() {
//                 var t = new Util.Formatter.Table2(2);
// 		var cat2name2bool = Event.ShellDump.getFilterSpec();
//                 var y = 0;
//                 for (var cat in cat2name2bool) {
//                     var name2bool = cat2name2bool[cat];
// 		    for (var name in name2bool) {
// 			t.setValue(0, y, cat);
// 			t.setValue(1, y, name);
// 			y += 1;
// 		    }
//                 }
//                 return t.render().join("\n");
//             };

// 	    if (this.listimmOpt.isSet()) {
// 		callback(new AOP.OK(imm2info()));
// 		return;
// 	    }

// 	    var opt = this.addimmOpt.isSet() ? this.addimmOpt : (this.delimmOpt.isSet() ? this.delimmOpt : null);
// 	    if (opt) {
// 		var opts = opt.getState();
// 		var cat2name = {};
//                 for (var i = 0; i < opts.length; i++) {
//                     var s = opts[i].paramState;
// 		    var sa = s.split(':');
// 		    if (sa.length!==2) {
// 			throw sprintf("Expected categpry:evname instead of '%s'", s);
// 		    }
// 		    var cat = sa[0], name = sa[1];
// 		    if (!cat2name[cat]) {
// 			cat2name[cat] = {};
// 		    }
// 		    cat2name[cat][name] = true;
//                 }
// 		if (opt === this.addimmOpt) {
// 		    Event.ShellDump.addFilterSpec(cat2name);
// 		} else {
// 		    Event.ShellDump.delFilterSpec(cat2name);
// 		}
// 		callback(new AOP.OK(imm2info()));
// 		return;
// 	    }

// 	    if (!Event.HISTORY) {
// 		Event.HISTORY = new Event.History(4096);
// 	    }

// 	    if (this.clearOpt.isSet()) {
// 		Event.HISTORY.reset();
// 		var marker = Event.HISTORY.getMarker();
//                 CLI.Shells.forEachShell(function(shell) {
//                     var attr = CLI.Commands.Event.MarkerAttr.get(shell);
//                     attr.marker = marker;
//                 });
//                 callback(new AOP.OK());
//                 return;
// 	    }
            
//             if (this.allOpt.isSet()) {
//                 marker = undefined;
//             } else if (this.cntOpt.isSet()) {
//                 cnt = this.cntSpec.getNumber();
//             } else {
//                 marker = attr.marker;
//             }
            
//             var tseqState = this.tset.getState();
//             if (tseqState != null) {
// 	        for (var i = 0; i < tseqState.length; i++) {
//                     var tsetState = tseqState[i];
//                     var st = tsetState[0].micros;
//                     var et = tsetState[1].micros;
//                     if (et <= st) {
//                         throw "Invalid time specification: end before start in interval";
//                     }
//                     intervals.push({ start: st, end: et });
//                 }
//             }
            
//             if (this.tagOpt.isSet()) {
//                 var opts = this.tagOpt.getState();
//                 for (var i = 0; i < opts.length; i++) {
//                     tags.push(opts[i].paramState);
//                 }
//             }
            
//             var result = Event.HISTORY.filter(cnt, marker, new Event.Filter(tags, intervals));

//             attr.marker = Event.HISTORY.getMarker();

// 	    callback(new AOP.OK(result));
//         }
//     }
// );












// /**
//  * Implements a shell attribute.
//  * @class
//  * @augments CLI.Shell.Attr
//  * @constructor
//  * @private
//  */
// CLI.Commands.Event.WaitAttr = function() {
//     this.name = "CLI.Commands.Event.WaitAttr";
//     this.collector = null;
//     this.filter = null;
//     this.onClose = function() {
// 	;
//     };
// };


// /**
//  * Creaete or get shell marker attribute
//  * @private
//  */
// CLI.Commands.Event.WaitAttr.get = function(shell) {
//     var attr = shell.getAttr("CLI.Commands.Event.WaitAttr");
//     if (!attr) {
//         attr = new CLI.Commands.Event.WaitAttr();
//         shell.setAttr("CLI.Commands.Event.WaitAttr", attr);
//     }
//     return attr;
// };


// /**
//  * @class 
//  * @constructor
//  * @private
//  */
// CLI.Commands.Event.WaitCommand = function(/** CLI.Shell */shell, /** String */name) {
//     this.description = 
// 	"Wait for an event to arrive or search for event having occured in the past. A property list specifies\n" +
// 	"the mask against which an event is matched. On a subsequent call, the command checks whether such an\n" +
// 	"event has occured in the past or waits for such an event until a timeout occurs. Example:\n" +
// 	"event-wait category:mote evname:register uid:0\n" +
// 	"sag-start\n" +
// 	"mote-create\n" +
// 	"event-wait\n";
//     this.propSpec = new GetOpt.Simple("mask", "property:value,property2:value2.. Match event against specified properties");
//     this.propSet = new GetOpt.Set(this.propSpec);
//     this.timeoutOpt = new GetOpt.TimeoutOpt('10s');
//     var optSet = new GetOpt.OptionSet([ this.timeoutOpt ]);
//     CLI.Command.call(this, shell, name, [ optSet, this.propSet ], 0);
// };

// /** @private */
// CLI.Commands.Event.WaitCommand.prototype = extend(
//     CLI.Command.prototype,
//     {
//         /** @private */
//         exec: function(callback) {
//             var shell = this.shell;
//             var attr = CLI.Commands.Event.WaitAttr.get(shell);
// 	    var span = this.timeoutOpt.getSpan();
//             var setState = this.propSet.getState();
//             if (setState == null) {
// 		if (!attr.collector) {
//                     callback(new AOP.ERR("No event mask has been specified in a previous invocation!"));
// 		    return;
// 		}
// 		attr.collector.wait4(attr.filter, new Timer.Timer(span, undefined), callback);
//                 return;
//             }
//             var filter = new Util.PropertyFilter();;
//             for (var i = 0; i < setState.length; i++) {
//                 var spec = setState[i];
//                 var sa = spec.split(":");
//                 var key = sa[0];
//                 var values = null;
//                 if (sa[1]) {
//                     sa = sa[1].split(",");
//                     assert(sa instanceof Array);
//                     if (sa.length > 0) {
//                         values = sa;
//                     }
//                 }
//                 filter.add(key, values);
//             }
// 	    if (attr.collector) {
// 		attr.collector.close();
// 	    }
// 	    attr.filter = filter;
// 	    attr.collector = new Event.Collector();
// 	    callback(new AOP.OK());
//         }
//     }
// );



// CLI.commandFactory.addModule("CLI.Commands.Event");
