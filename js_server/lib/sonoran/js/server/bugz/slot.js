//  (C) COPYRIGHT INTERNATIONAL BUSINESS MACHINES CORPORATION 2006-2010
//                       ALL RIGHTS RESERVED
//        IBM Research Division, Zurich Research Laboratory
// --------------------------------------------------------------------



/**
 * Bugz.Slot inherits from Bugz.SlotInfo and wraps name, type, value and slot.
 * Bugz.Object, Bugz.Statics and Bugz.Array provide the same methods
 * print and access to allow for resolving expression paths.
 * @class
 * @augments Bugz.SlotInfo
 * @constructor
 * @param name
 * @param type
 * @param value
 * @param slot
 */
Bugz.Slot = function(name, type, value, slot) {
    Bugz.SlotInfo.call(this, name, type, value, slot);
};

/** @private */
Bugz.Slot.prototype = extend(
    Bugz.SlotInfo.prototype,
    /** @lends Bugz.Slot.prototype */
    {
        /**
         * Throws an exception as a slot only covers a primitive type, delegate type or null ref
         * when this method is supposed to be called.
         * @param inspector
         * @param name    Name to resolve or undefined
         * @returns {Bugz.Slot[]}
         */
        access: function(/** Bugz.Inspector */inspector, /** String */name) {
            assert(name);
            throw sprintf("Cannot access '%s' in: %s", name, this);
        },
        
        
        /**
         * Resolve an object or array instance if referenced by this slot. Otherwise,
         * returns this.
         * @returns {Object} this Bugz.Slot instance or resolved Bugz.Object/Bugz.Array instance
         */
        resolve: function(/** Bugz.Inspector */inspector) {
            var type = this.type;
            if (Bugz.PRIM_ARR_TYPES.indexOf(type)>=0) {
                return inspector.resolveArray(this.value);
            } else if (/^[rd].+\[\]$/.test(type) && this.value != Bugz.NULL_REF) {
                return inspector.resolveArray(this.value);
            } else if (type[0] === "r" && this.value != Bugz.NULL_REF) {
                return inspector.resolveObject(this.value);
            } else if (type[0] === "d" && this.value != Bugz.NULL_DEL) {
                return inspector.resolveDelegate(this.value);
            } else {
                return this;
            }
        }
    }
);


/**
 * Create slot from blob received from saguaro.
 * @param blob
 * @returns {Bugz.Slot}
 */
Bugz.Slot.fromBlob = function(/** Object */blob) {
    assert(arguments.length==1);
    var name = blob.name;
    var type = blob.type;
    var value = blob.value;
    var slot = blob.slot;
    return new Bugz.Slot(name, type, value, slot);
};





// -------------------------------------------------------------------------------------
//
// Bugz.Statics
//
// -------------------------------------------------------------------------------------


/**
 * Bugz.Statics inherits from Bugz.StaticsInfo and encapsulates a statics object
 * resolved from saguaro.
 * @class
 * @augments  Bugz.ObjectInfo
 * @constructor
 * @param data    As retrieved from saguaro
 */
Bugz.Statics = function(/** Object */data) {
    Bugz.ObjectInfo.call(this, data);
};

/** @private */
Bugz.Statics.prototype = extend(
    Bugz.ObjectInfo.prototype,
    /** @lends Bugz.Statics.prototype */
    {
        /**
         * Resolve a field in this statics object.
         * @param inspector
         * @param name
         * @returns {Bugz.Slot[]}
         */
        access: function(/** Bugz.Inspector */inspector, /** String */name) {
            assert(name);
            var nameRE = new RegExp(name + "$");
            var slots = [];
            for (var i = 0; i < this.fields.length; i++) {
                var slot = this.fields[i].lookup(name);
                if (slot) {
                    slots.push(slot);
                    continue;
                }
                var _slots = this.fields[i].getMatches(nameRE);
                if (_slots.length > 0) {
                    slots = slots.concat(_slots);
                }
            }
            if (slots.length == 0) {
                throw "No such class field: " + name;
            }
            return slots.map(function(slot) { return slot.resolve(inspector); });
        }
    }
);




// -------------------------------------------------------------------------------------
//
// Bugz.Object
//
// -------------------------------------------------------------------------------------


/**
 * Bugz.Object inherits from Bugz.ObjectInfo and encapsulates an object
 * resolved from saguaro.
 * @class
 * @augments Bugz.ObjectInfo
 * @constructor
 * @param blob    As returned by saguaro
 */
Bugz.Object = function(blob) {
    Bugz.ObjectInfo.call(this, blob);
};

/** @private */
Bugz.Object.prototype = extend(
    Bugz.ObjectInfo.prototype,
    /** @lends Bugz.Object.prototype */
    {
        /**
         * Resolve a field in this object.
         * @param inspector
         * @param name
         * @returns {Bugz.Slot[]}
         */
        access: function(/** Bugz.Inspector */inspector, /** String */name) {
            assert(name);
            var slots = [], slot;
            var nameRE = new RegExp(name + "$");
            for (var i = 0; i < this.fields.length; i++) {
                slot = this.fields[i].lookup(name);
                if (slot) {
                    slots.push(slot);
                    continue;
                }
                var _slots = this.fields[i].getMatches(nameRE);
                if (_slots.length > 0) {
                    slots = slots.concat(_slots);
                }
            }
            if (slots.length == 0) {
                throw "No such instance field: " + name;
            }
            return slots.map(function(slot) { return slot.resolve(inspector); });
        }
    }
);



/**
 * Create an object reference covering 'r:0000'.
 * @function
 * @returns {Bugz.Object}
 *
 */
Bugz.Object4Null = function() {
    return new Bugz.ObjectInfo({
	jref: "r:0000",
	fields: []
    });
};




// -------------------------------------------------------------------------------------
//
// Bugz.Array
//
// -------------------------------------------------------------------------------------



/**
 * Bugz.Array inherits from Bugz.ArayInfo and encapsulates an array resolved from saguaro.
 * @class
 * @augments Bugz.ArrayInfo
 * @constructor
 * @param data    As returned by saguaro
 */
Bugz.Array = function(data) {
    Bugz.ArrayInfo.call(this, data);
};

/** @private */
Bugz.Array.prototype = extend(
    Bugz.ArrayInfo.prototype,
    /** @lends Bugz.Array.prototype */
    {
        /**
         * Resolve elemements in this array object.
         * @param inspector
         * @param name
         * @returns {Bugz.Slot[]}
         */
        access: function(/** Bugz.Inspector */inspector, /** String */name) {
            assert(name);
            var eleType = this.getEleType();
            var md = Bugz.Inspector.ARRAY_ACCESS_REGEXP.exec(name);
            if (!md) {
                throw "Invalid array access specifier: " + name;
            }
            var start = parseInt(md[1]);
            var end = start;
            if (md[3]) {
                end = parseInt(md[3]);
            } else if (md[2]) {
                end = this.slots.length - 1;
            } 
            if (start < 0 || start >= this.slots.length || (start > end)) {
                throw sprintf("Array index out of bounds: %d - %d <-> %d", start, end, this.slots.length);
            }
            if (start == end) {
                return [ (new Bugz.Slot(start.toString(), eleType, this.slots[start], start)).resolve(inspector) ];
            }
            return [
                new Bugz.Array({
                    jref: this.jref,
                    type: this.type,
                    size: end - start + 1,
                    clsref: this.clsref,
                    clsname: this.clsname,
                    slots: [ 0, this.slots.slice(start, end+1) ],
                    offset: start
                })
            ];
        }
    }
);









