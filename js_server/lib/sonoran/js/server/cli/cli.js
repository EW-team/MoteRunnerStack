//  (C) COPYRIGHT INTERNATIONAL BUSINESS MACHINES CORPORATION 2006-2010
//                       ALL RIGHTS RESERVED
//        IBM Research Division, Zurich Research Laboratory
// --------------------------------------------------------------------

Runtime.include("cli/cli.js");
Runtime.include("cli/shell.js");
Runtime.include("cli/builtins.js");
Runtime.include("cli/event.js");


Runtime.include("./builtins.js");
Runtime.include("./log.js");
Runtime.include("./telnet.js");
Runtime.include("./mrshell.js");


CONSOLE_LISTENERS.add(function(text) {
    var id2shell = CLI.Shells.id2shell;
    for (var id in id2shell) {
	var shell = id2shell[id];
	if (shell.inInteractiveMode && shell.enableImmediateMessages) {
	    if (shell.outstr !== STDOUT) {
		shell.println(text);
	    }
        }
    }
});




 
/**
 * Parse command line and instantiate command ready for execution.
 * @param shell
 * @param argv
 * @param module
 * @returns CLI.Command ready to call exec on or null if no command given in args
 * @throws {Object} in case command is ambigious or could not be instantiated
 */
CLI.commandFactory.parseCommand = function(/** CLI.Shell */shell, /** String */argv, /** String */module) {
    try {
    assert(argv.length>0);
    var arg = argv[0];
    var guesses = CLI.guessKeyword(arg, this.keywords, '-');
    if (guesses.length==0) {
	var func = Blob.peek(arg);
	if (!func || typeof(func) !== 'function') {
	    return null;
	}
	var spec = new CLI.Spec(arg);
	var cmd = new CLI.Builtins.InvokeCommand(shell, spec);
	var arr = CLI.Builtins.InvokeCommand.parseInvocation(argv, 0);
	cmd.funcDst = arr[0];
	cmd.funcThis = arr[1];
	cmd.funcArgs = arr[2];
	return cmd;
    }
    if (guesses.length>1) {
        var txt = sprintf("Ambiguous command '%s', possible completions:\n%s", arg, guesses.join("\n"));
        throw txt;
    }
    var cmdName = guesses[0];
    var fn = this.keyword2factory[cmdName];
    assert(fn);
    var cmd = Blob.instantiate(fn, [ shell, cmdName ]);
	return cmd;
    } catch(ex) {
	println(Runtime.dumpException(ex));
	Runtime.exit(14);
    }
};

