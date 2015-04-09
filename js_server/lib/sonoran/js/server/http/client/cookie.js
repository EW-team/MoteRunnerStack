//  (C) COPYRIGHT INTERNATIONAL BUSINESS MACHINES CORPORATION 2006-2010
//                       ALL RIGHTS RESERVED
//        IBM Research Division, Zurich Research Laboratory
// --------------------------------------------------------------------


/**
 * HTTP.Client.Cookie represents a cookie
 * @class
 * @constructor
 */
HTTP.Client.Cookie = function(name, value, path) {
   /**
    * Cookie name
    * @type String
    */
   this.name = name;
   /**
    * Cookie value
    * @type String
    */
   this.value = value;
   /**
    * Cookie path
    * @type String
    */
   this.path = path;
};

/**
 * @constant
 */
HTTP.Client.Cookie.ATTRS = [
   "Version",
   "Expires",
   "Max-age",
   "Domain",
   "Path",
   "Port",
   "Comment",
   "CommentURL",
   "Secure",
   "HttpOnly",
   "Discard"
];

/** Prototype */
HTTP.Client.Cookie.prototype = {
   /** @returns {String} string */
   toString: function() {
      var s = this.name + "=" + this.value;
      var attrs = [];
      for (var j = 0; j < HTTP.Client.Cookie.ATTRS.length; j++) {
         var attr = HTTP.Client.Cookie.ATTRS[j];
         if (this[attr]) {
            attrs.push(attr + "=" + this[attr]);
         }
      }
      if (attrs.length>0) {
         s += "(" + attrs.join(",") + ")";
      }
      return s;
   }
};

