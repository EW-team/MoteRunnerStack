//  (C) COPYRIGHT INTERNATIONAL BUSINESS MACHINES CORPORATION 2006-2010
//                       ALL RIGHTS RESERVED
//        IBM Research Division, Zurich Research Laboratory
// --------------------------------------------------------------------


Runtime.include("common/channels/channels.js");

Runtime.include("./channel.js");
Runtime.include("./registry.js");
Runtime.include("./html5.js");
Runtime.include("./cli.js");


/**
 * Legacy.
 * @see Channels.Registry
 */
Channels.Manager = Channels.Registry;

