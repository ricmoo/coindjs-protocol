'use strict';

var Errors = require('./errors');

var util = require('util');


// https://github.com/indutny/endian-reader/blob/master/index.js
Buffer.prototype.readUInt64LE = function(offset, noAssert) {
    // @TODO: check that the number will not exceed the possible range for JS
    var a = this.readUInt32LE(offset, noAssert);
    var b = this.readUInt32LE(offset + 4, noAssert);
    return a + b * 0x100000000;
};

Buffer.prototype.readInt64LE = function(offset, noAssert) {
    // @TODO: check that the number will not exceed the possible range for JS
    var a = this.readUInt32LE(offset, noAssert);
    var b = this.readInt32LE(offset + 4, noAssert);
    return a + b * 0x100000000;
};

Buffer.prototype.writeUInt64LE = function(value, offset, noAssert) {
    // @TODO: Test these
    var a = value & 0xffffffff;
    var b = value / 0x100000000;
    this.writeUInt32LE(a, offset, noAssert);
    this.writeUInt32LE(b, offset + 4, noAssert);
}

Buffer.prototype.writeInt64LE = function(value, offset, noAssert) {
    // @TODO: Test these
    var a = value & 0xffffffff;
    var b = value / 0x100000000;
    this.writeInt32LE(a, offset, noAssert);
    this.writeUInt32LE(b, offset + 4, noAssert);
}


// Bytes format type of fixed length
var Bytes = function(length) {
    this.length = length;
}

Bytes.prototype.fromBinary = function(parseState) {
    if (parseState.offset + this.length > parseState.buffer.length) {
        throw Errors(Errors.BufferOverrun), {availableLength: (parseState.buffer.length - parseState.offset), requiredLength: this.length};
    }
    var result = parseState.buffer.slice(parseState.offset, parseState.offset + this.length);
    parseState.offset += this.length;
    return result;
}

Bytes.prototype.toBinary = function(object) {

    // Convert to a buffer if needed
    if (typeof(object) === 'string' || util.isArray(object)) {
        object = new Buffer(object);
    }

    // Make sure it is a buffer of the correct size
    if (!Buffer.isBuffer(object)) {
        throw Errors(Errors.PropertyTypeMismatch, {expectedType: 'Buffer', gotType: typeof(object)});
    } else if (object.length != this.length) {
        throw Errors(Errors.BadPropertyValue, {expectedLength: this.length, gotLength: object.length});
    }

    return object;
}

var Bytes8 = new Bytes(8);
var Bytes32 = new Bytes(32);


// Command format type; always 12 bytes
var Command = {
    fromBinary: function(parseState) {
        if (parseState.offset + 12 > parseState.buffer.length) {
            throw Errors(Errors.BufferOverrun), {availableLength: (parseState.buffer.length - parseState.offset), requiredLength: 12};
        }

        var result = parseState.buffer.slice(parseState.offset, parseState.offset + 12);
        parseState.offset += 12;
        return (new String(result)).replace(/\0*$/, '');
    },
    toBinary: function(object) {
        if (typeof(object) !== 'string') {
            throw Errors(PropertyTypeMismatch, {expectedType: 'string', gotType: typeof(object)});
        }

        // Convert to a buffer to check size
        object = new Buffer(object, 'utf8');
        if (object.length > 12) {
            throw Errors(Errors.InvalidSize, {expectedMaximumLength: 12, gotLength: object.length});
        }

        var result = new Buffer(12);
        result.fill(0);
        object.copy(result);

        return result;
    }
}


// Integer format type; 8, 16, 32, 64 bit; signed or unsigned; little endian
var Integer = function(length, signed, bigEndian) {
    this.length = length;

    // Determine the function on the buffer to read this number type
    var func = (signed ? '': 'U') + 'Int' + (length * 8);
    if (length != 1) {
        if (length != 2 && length != 4 && length != 8) {
            throw Errors(Errors.InvalidSize, {expectedSizeOf: [1, 2, 4, 8]});
        }
        if (bigEndian) {
            func += 'BE';
        } else {
            func += 'LE';
        }
    }

    this.readFunc = 'read' + func;
    this.writeFunc = 'write' + func;
}

Integer.prototype.fromBinary = function(parseState) {
    var result = parseState.buffer[this.readFunc](parseState.offset);
    parseState.offset += this.length;
    return result;
}

Integer.prototype.toBinary = function(object) {
    if (typeof(object) !== 'number' || parseInt(object) != object) {
        throw Errors(Errors.BadPropertyValue, {expectedType: 'integer', gotType: typeof(object), gotValue: object});
    }
    var result = new Buffer(this.length);
    result[this.writeFunc](object, 0);
    return result;
}

// Some common integer configurations

var UInt8 = new Integer(1, false, false);

var UInt16 = new Integer(2, false, false);

var UInt16BE = new Integer(2, false, true);

var Int32 = new Integer(4, true, false);
var UInt32 = new Integer(4, false, false);

var Int64 = new Integer(8, true, false);
var UInt64 = new Integer(8, false, false);



// VarInt format type; a variable width integer
var VarInt = {
    fromBinary: function(parseState) {
        // @TODO: add bounds check
        var result = parseState.buffer.readUInt8(parseState.offset++);
        switch (result) {
            case 0xfd:
                result = parseState.buffer.readUInt16LE(parseState.offset);
                parseState.offset += 2;
                break;
            case 0xfe:
                result = parseState.buffer.readUInt32LE(parseState.offset);
                parseState.offset += 4;
                break;
            case 0xff:
                result = parseState.buffer.readUInt64LE(parseState.offset);
                parseState.offset += 8;
                break;
        }
        return result;
    },
    toBinary: function(object) {
        if (typeof(object) != 'number' || parseInt(object) != object) {
            throw Errors(Errors.BadPropertyValue, {expectedType: 'integer', gotType: typeof(object), gotValue: object});
        }
        object = parseInt(object);

        var result;

        if (object < 0xfd) {
            result = new Buffer(1);
            result.writeUInt8(object, 0);
        } else if (object <= 0xffff) {
            result = new Buffer(3);
            result[0] = 0xfd;
            result.writeUInt16LE(object, 1);
        } else if (object <= 0xffffffff) {
            result = new Buffer(5);
            result[0] = 0xfe;
            result.writeUInt32LE(object, 1);
        } else {
            result = new Buffer(9);
            result[0] = 0xff;
            result.writeUInt64LE(object, 1);
        }
        return result;
    }
}


// VarString format type; a variable length string
var VarString = {
    fromBinary: function(parseState) {
        var length = VarInt.fromBinary(parseState);
        if (parseState.offset + length > parseState.buffer.length) {
            throw Errors(Errors.BufferOverrun, {availableLength: (parseState.buffer.length - parseState.offset), requiredLength: length});
        }
        var result = parseState.buffer.slice(parseState.offset, parseState.offset + length);
        parseState.offset += length;
        return result;
    },
    toBinary: function(object) {
        if (typeof(object) === 'string') {
            object = new Buffer(object, 'utf8');
        }
        if (!Buffer.isBuffer(object)) {
            throw Errors(Errors.BadPropertyValue, {expectedType: 'string', gotType: typeof(object)});
        }
        object = new Buffer(object, 'utf8')
        return Buffer.concat([VarInt.toBinary(object.length), object])
    }
}


// List format type
var List = function(childFormat, minLength, maxLength) {
    this.childFormat = childFormat;
    this.minLength = minLength;
    this.maxLength = maxLength;
}

List.prototype.fromBinary = function(parseState) {
    var result = [];

    // Check size requirements
    var count = VarInt.fromBinary(parseState);
    if (this.minLength !== null && count < this.minLength) {
        throw Errors(Errors.InvalidSize, {expectedMinimumLength: this.minLength, gotLength: count});
    }
    if (this.maxLength !== null && count > this.maxLength) {
        throw Errors(Errors.InvalidSize, {expectedMaximumLength: this.maxLength, gotLength: count});
    }

    // Extract each item
    for (var i = 0; i < count; i++) {
        var item = this.childFormat.fromBinary(parseState)
        result.push(item);
    }

    return result;
}

List.prototype.toBinary = function(object) {
    if (!util.isArray(object)) {
        throw Errors(Errors.PropertyTypeMismatch, {expectedType: 'array', gotType: typeof(object)});
    }

    // Check size requirements
    if (this.minLength !== null && object.length < this.minLength) {
        throw Errors(Errors.InvalidSize, {expectedMinimumLength: this.minLength, gotLength: object.length});
    }
    if (this.maxLength !== null && object.length > this.maxLength) {
        throw Errors(Errors.InvalidSize, {expectedMaximumLength: this.maxLength, gotLength: object.length});
    }

    var result = [VarInt.toBinary(object.length)];
    for (var i = 0; i < object.length; i++) {
        result.push(this.childFormat.toBinary(object[i]));
    }

    return Buffer.concat(result);
}

// This allows us to create format types that are simply a bunch of other
// format types
function Compound(properties) {
    this.properties = properties;
}

Compound.prototype.fromBinary = function(parseState) {
    var result = {};
    for (var i = 0; i < this.properties.length; i++) {
        var propertyName = this.properties[i][0];
        var propertyFormat = this.properties[i][1];

        result[propertyName] = propertyFormat.fromBinary(parseState);
    }
    return result;
}

Compound.prototype.toBinary = function(object) {
    var result = [];

    for (var i = 0; i < this.properties.length; i++) {
        var propertyName = this.properties[i][0];
        var propertyFormat = this.properties[i][1];

        result.push(propertyFormat.toBinary(object[propertyName]));
    }

    // @TODO: Make sure they don't provide any extras

    return Buffer.concat(result);
}

// Network Address: an IPv4 or IPv6 address

var IPv4Prefix = new Buffer([0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 255, 255]);
var IPAddress = {
    fromBinary: function(parseState) {
        if (parseState.offset + 16 > parseState.buffer.length) {
            throw Errors(Errors.BufferOverrun), {availableLength: (parseState.buffer.length - parseState.offset), requiredLength: 16};
        }

        var result = null;

        // IPv4 vs IPv6
        if (parseState.buffer.slice(parseState.offset, parseState.offset + 12).equals(IPv4Prefix)) {
            var groups = [];
            for (var i = 12; i < 16; i++) {
                groups.push(parseState.buffer.readUInt8(parseState.offset + i));
            }
            result = groups.join('.');
        } else {
            var groups = [];
            for (var i = 0; i < 16; i += 2) {
                groups.push(parseState.buffer.readUInt16BE(parseState.offset + i).toString(16));
            }
            result = groups.join(':');
        }

        parseState.offset += 16;
        return result
    },
    toBinary: function(object) {
        if (typeof(object) !== 'string') {
            throw Errors(Errors.BadPropertyValue, {expectedType: 'string', gotType: typeof(object)});
        }

        var result = null;

        // Try IPv4
        var groups = object.split('.');
        if (groups.length == 4) {
            result = new Buffer(4);
            for (var i = 0; i < 4; i++) {
                result.writeUInt8(parseInt(groups[i]), i);
            }
            result = Buffer.concat([IPv4Prefix, result]);

        // Try IPv6
        } else {
            var groups = object.split(':');
            if (groups.length >= 3 && groups.length <= 8) {

                // Ugh... IEEE weirdness... IPv6 have complicated abbreviations
                var expanded = object.split('::');
                if (expanded.length == 2) {

                    // Make sure we start/end with a 0
                    if (expanded[0] == '') { expanded[0] = '0'; }
                    if (expanded[1] == '') { expanded[1] = '0'; }

                    // Fill in 0's for the middle groups where the double-colon happened
                    var fill = [];
                    while (fill.length < 8 - groups.length + 1) {
                        fill.push(0);
                    }

                    // Reconstruct the expanded form
                    groups = (expanded[0] + ":" + fill.join(':') + ':' + expanded[1]).split(':');
                } else if (expanded.length > 2) {
                    throw Errors(Errors.BadPropertyValue, {expectedType: 'IP Address IPv6', gotValue: object});
                }

                result = new Buffer(16);
                for (var i = 0; i < 8; i++) {
                    result.writeUInt16BE(parseInt(groups[i], 16), i * 2);
                }
            }
        }

        if (result === null) {
            throw Errors(Errors.BadPropertyValue, {expectedType: 'IP Address', gotValue: object});
        }

        return result;
    }
}

var NetworkAddress = new Compound([
    ['timestamp', UInt32],
    ['services', UInt64],
    ['address', IPAddress],
    ['port', UInt16BE],
]);

var NetworkAddressWithoutTimestamp = new Compound([
    ['services', UInt64],
    ['address', IPAddress],
    ['port', UInt16BE],
]);


var InventoryVector = new Compound([
    ['type', UInt32],
    ['hash', Bytes32],
]);
InventoryVector.types = {
    error: 0,            //'ERROR',
    transaction: 1,      //'MSG_TX',
    block: 2,            //'MSG_BLOCK',
    filteredBlock: 3,    //'MSG_FILTERED_BLOCK',
}

var OutPoint = new Compound([
    ['hash', Bytes32],
    ['index', UInt32],
]);

var TxIn = new Compound([
    ['previous_output', OutPoint],
    ['signature_script', VarString],
    ['sequence', UInt32],
])

var TxOut = new Compound([
    ['value', Int64],
    ['pk_script', VarString],
]);

var Tx = new Compound([
    ['version', UInt32],
    ['tx_in', new List(TxIn, 1)],
    ['tx_out', new List(TxOut, 1)],
    ['lock_time', UInt32],
]);


var BlockHeader = new Compound([
    ['version', UInt32],
    ['prev_block', Bytes32],
    ['merkle_root', Bytes32],
    ['timestamp', UInt32],
    ['bits', UInt32],
    ['nonce', UInt32],
    ['txn_count', VarInt],
]);

var BlockHeaderWithoutTransactionCount = new Compound([
    ['version', UInt32],
    ['prev_block', Bytes32],
    ['merkle_root', Bytes32],
    ['timestamp', UInt32],
    ['bits', UInt32],
    ['nonce', UInt32],
]);

var MerkleBranch = new Compound([
    ['branch_hash', new List(Bytes32)],
    ['branch_side_mask', Int32],
]);

var BlockHeaderAuxPoW = new Compound([
    ['version', UInt32],
    ['prev_block', Bytes32],
    ['merkle_root', Bytes32],
    ['timestamp', UInt32],
    ['bits', UInt32],
    ['nonce', UInt32],
    ['coinbase_txn', Tx],
    ['block_hash', Bytes32],
    ['coinbase_branch', MerkleBranch],
    ['blockchain_branch', MerkleBranch],
    ['parent_block', BlockHeaderWithoutTransactionCount],
    ['txn_count', VarInt],
]);


var BlockHeaderDetectAuxPoW = {
    fromBinary: function(parseState) {
        var version = parseState.buffer.readUInt32LE(parseState.offset);
        if (version & (1 << 8)) {
            return BlockHeaderAuxPoW.fromBinary(parseState);
        }
        return BlockHeader.fromBinary(parseState);
    },
    toBinary: function(object) {
        if (object.version & (1 << 8)) {
            return BlockHeaderAuxPoW.toBinary(object);
        }
        return BlockHeader.toBinary(object);
    }
}

// Public Interface
module.exports = {
    FormatBytes: Bytes,
    FormatCompound: Compound,
    FormatInteger: Integer,
    FormatList: List,

    Bytes8: Bytes8,
    Bytes32: Bytes32,

    Command: Command,
    MagicNumber: (new Bytes(4)),

    VarInt: VarInt,
    VarString: VarString,

    IPAddress: IPAddress,
    NetworkAddress: NetworkAddress,
    NetworkAddressWithoutTimestamp: NetworkAddressWithoutTimestamp,

    MerkleBranch: MerkleBranch,

    BlockHeader: BlockHeader,
    BlockHeaderAuxPoW: BlockHeaderAuxPoW,
    BlockHeaderDetectAuxPoW: BlockHeaderDetectAuxPoW,
    BlockHeaderWithoutTransactionCount: BlockHeaderWithoutTransactionCount,

    InventoryVector: InventoryVector,

    Tx: Tx,
    TxOut: TxOut,
    TxIn: TxIn,
    OutPoint: OutPoint,

    UInt8: UInt8,
    UInt16: UInt16,
    UInt16BE: UInt16BE,
    Int32: Int32,
    UInt32: UInt32,
    Int64: Int64,
    UInt64: UInt64,
}


// Test Harness
if (require.main == module) {
    // @TODO: add more tests

    var s = 'hello world';
    var vs = VarString.toBinary(s);
    var s2 = VarString.fromBinary({buffer: vs, offset: 0});
    console.log(s, vs, s2);

    // Test for IPv6

    // http://jsperf.com/expand-ipv6
    var tests = ['::', '1::', '::1', '1111::2', '1111:2:3:4::5', '1111:2222:3333:4444:5555:6666:7777:8888', '1:2:3:4:5:6:7:8', '1111::2222', '01:2:33:004::0005'];

    for (var i = 0; i < tests.length; i++) {
        var bin = IPAddress.toBinary(tests[i]);
        var parseState = {buffer: bin, offset: 0};
        var conv = IPAddress.fromBinary(parseState);
        console.log(tests[i], bin, conv);
    }
    console.log(VarString.toBinary('Hello'));
}

