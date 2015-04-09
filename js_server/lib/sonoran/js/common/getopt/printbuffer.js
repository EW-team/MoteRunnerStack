//  (C) COPYRIGHT INTERNATIONAL BUSINESS MACHINES CORPORATION 2006-2010
//                       ALL RIGHTS RESERVED
//        IBM Research Division, Zurich Research Laboratory
// --------------------------------------------------------------------

/**
 * GetOpt.PrintBuffer implementation.
 * @class 
 * @constructor
 */
GetOpt.PrintBuffer = function() {
    this.buf = [];
    this.indent = 0;
    this.pos = 0;
};

/** Prototype */
GetOpt.PrintBuffer.prototype = {
    /**
     * Internal buffer
     * @type String[]
     */
    buf: null,
    /**
     * Indent to use
     * @type Number
     */
    indent: 0,
    /**
     * Position in internal buffer
     * @type Number
     */
    pos: 0,

    /**
     * Clear content.
     */
    clear: function() {
	this.buf = [];
	this.indent = 0;
	this.pos = 0;
    },

    /**
     * @returns {Number} length of current buffer. 
     */
    getLength: function() {
	return this.buf.length;
    },

    /**
     * Set insert marker to given position.
     * @param pos
     */
    setCharPos: function(/** Number */pos) {
	var i = this.pos;
	this.pos = pos;
	return i;
    },


   /**
    * Set current character position to end of buffer.
    * @returns {Number} character position before change.
    */
    setCharPosEnd: function() {
       var i = this.pos;
       this.pos = this.buf.length;
       return i;
    },

    /**
     * Insert a string at current insert position.
     * @param s
     */
    insert: function(/** String */s) {
	if( s==undefined )
	    s = "(undefined)";
	else if( s==null )
	s = "(null)";
	else if (arguments.length > 1)
	s = svprintf(arguments[0], 1, arguments);

	var buf = this.buf;
	var len = s.toString().length;
	for (var i = 0; i < len; i++ ) {
            var c = s.charAt(i);
	    if (c=='\f') {
		if (this.pos>0 && buf[this.pos-1]!='\n' ) {
                    // Not at the beginning of a new-line
		    buf.splice(this.pos, 1, '\n');
		    this.pos += 1;
		}
		continue;
            }
	    if (this.indent>0 && c!='\n' && (this.pos==0 || this.buf[this.pos-1]=='\n') ) {
		// We're at the beginning of a new line
		// Avoid indenting on empty lines.
		this.insertIndent();
            }
	    this.buf.splice(this.pos, 0, c);
	    this.pos += 1;
	}
    },

    /**
     * Insert space if required.
     */
    insertSoftSpace: function() {
	var buf = this.buf;
	if ((this.pos > 0) && (" \t\r\n[]{}|.=".indexOf(buf[this.pos-1]) == -1)) {
	    this.insert(' ');
	}
    },

    /**
     * Add indent.
     * @param i
     */
    addIndent: function(/*** Number */i) {
	var old = this.indent;
	this.indent += i;
	return old;
    },

    /**
     * Set indent.
     * @param i
     */
    setIndent: function(/*** Number */i) {
	var old = this.indent;
	this.indent = i;
	return old;
    },

    /**
     * @returns {Number} indent.
     */
    getIndent: function() {
	return this.indent;
    },

    /**
     * @private
     */
    assertBegLine: function() {
	if (this.pos==0 || this.buf[this.pos-1]=='\n')
            return 0;
	this.insert('\n');
	return 1;
    },

    /**
     * @private
     */
    assertEmptyLine: function() {
	var buf = this.buf;
	if ((this.pos == 0) || (this.pos==1 && buf[0]=='\n') ||
	    (this.pos>1 && buf[this.pos-1]=='\n' && buf[this.pos-2]=='\n')) {
	    return 0;
	}
	// invariant: ipos>0
	this.insert(buf[this.pos-1]=='\n' ? "\n" : "\n\n");
	return 1;
    },

    /**
     * @returns {String} string contents of internal buffer.
     */
    toString: function() {
	return this.buf.join("");
    },

    /**
     * Insert indent into buffer.
     */
    insertIndent: function() {
	for (var j = 0; j < this.indent; j++) {
	    this.buf.splice(this.pos, 0, ' ');
	    this.pos += 1;
	}
    }
};
