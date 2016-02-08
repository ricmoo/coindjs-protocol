'use strict';

var format = require('./format');
var Errors = require('./errors');

var crypto = require('crypto');

function sha256(data) {
    var hasher = crypto.createHash('sha256');
    hasher.update(data);
    return hasher.digest()
}

function hash256(data) {
    return sha256(sha256(data));
}

/**
 *  Given a binary payload return the number of bytes that yield exactly one
 *  message, or null if there is not a complete message
 */
function firstAvailableMessageLength(binaryData) {
    if (binaryData.length < 20) {
        return null;
    }

    var length = binaryData.readUInt32LE(16) + 24;
    if (binaryData.length < length) {
        return null;
    }
    //console.log('MESSAGE', binaryData.length, length);
    return length;
}


/**
 *  Given a binary payload, determine the message type and extract the details.
 */
function messageFromBinary(binaryData, messageTypes) {
    if (!messageTypes) {
        messageTypes = StandardMessageTypes;
    }

    var command = format.Command.fromBinary({buffer: binaryData, offset: 4});

    var result = null;

    var messageType = messageTypes[command];
    if (messageType) {
        result = messageType.fromBinary(binaryData);
    }

    return result;
}


/**
 *  defineMessage meta-class
 *  This generates classes that represent messages with a given command and
 *  set of properties, each with a property type.
 */
function defineMessage(command, properties) {

    /**
     * Constructs a new message from values
     */
    var message = function(values) {
        this.command = command;
        this.values = {};
        if (values) {
            for (var i = 0; i < properties.length; i++) {
                var propertyName = properties[i][0];
                var propertyFormat = properties[i][1];

                var value = values[propertyName]; //propertyFormat.verify(values[propertyName]);

                try {
                    propertyFormat.toBinary(value);
                } catch (error) {
                    console.log(propertyName, error);
                    throw error;
                }

                if (value === null) {
                    throw Errors(Errors.MissingProperty, {command: command, property: propertyName});
                }

                this.values[propertyName] = value;
            }

            // @TODO: Complain is unknown properties are passed in
        }
    };

    message.command = command;

    /**
     *  Extracts the semantic details from a binary representation of a message.
     */
    message.fromBinary = function(binaryData) {

        var result = new message();

        // The state machine for parsing; offset is updated within each fromBinary call
        var parseState = {buffer: binaryData, offset: 0};

        // Read the magic number and command
        result.magic = format.MagicNumber.fromBinary(parseState);
        result.command = format.Command.fromBinary(parseState);

        // The payload length
        var length = format.UInt32.fromBinary(parseState);
        if (length + 24 !== binaryData.length) {
            throw Errors(Errors.WrongMessageLength, {providedLength: length, availableLength: (binaryData.length - 24)});
        }

        //console.log(result.command, binaryData.slice(0, length + 24).toString('hex'));


        // Now we can focus on the message payload
        parseState.buffer = binaryData.slice(24, 24 + length);
        parseState.offset = 0;

        // Check the checksum matches
        var checksum = hash256(parseState.buffer).slice(0, 4);
        if (!checksum.equals(binaryData.slice(20, 24))) {
            throw Errors(Errors.BadChecksum, {checksumComputed: checksum, checksumRequired: binaryData.slice(20, 24)});
        }

        // Extract and convert each property
        for (var i = 0; i < properties.length; i++) {
            var propertyName = properties[i][0];
            var propertyFormat = properties[i][1];

            result.values[propertyName] = propertyFormat.fromBinary(parseState)
        }

        return result;
    }

    /**
     *  Returns a binary representation of a message
     */
    message.prototype.toBinary = function(magicNumber) {
        if (!Buffer.isBuffer(magicNumber) || magicNumber.length !== 4) {
            throw Errors(Errors.BadMagicNumber, {magicNumber: magicNumber});
        }

        // Convert the payload to a binary representation
        var payload = [];
        for (var i = 0; i < properties.length; i++) {
            var propertyName = properties[i][0];
            var propertyFormat = properties[i][1];

            payload.push(propertyFormat.toBinary(this.values[propertyName]));
        }

        payload = Buffer.concat(payload);

        // Add the header (magic number, command, length and checksum)
        var result = [
            new Buffer(magicNumber),
            format.Command.toBinary(this.command),
            format.UInt32.toBinary(payload.length),
            hash256(payload).slice(0, 4),
            payload,
        ]

        return Buffer.concat(result);
    }

    // Register the message by its command
    //MessageTypes[command] = message;

    return message;
}


// Some common property sets

var propertiesInventory = [
    ['inventory', new format.FormatList(format.InventoryVector, null, 50000)],
];

var propertiesNonce = [
    ['nonce', format.Bytes8],
];

var propertiesLocate = [
    ['version', format.UInt32],
    ['block_locator_hash', (new format.FormatList(format.Bytes32, 1))],
    ['hash_stop', format.Bytes32],
];


// Messages

var addr = defineMessage('addr', [
    ['addr_list', (new format.FormatList(format.NetworkAddress, null, 1000))],
]);

var alert = defineMessage('alert', [
    ['payload', format.VarString],
    ['signature', format.VarString],
])
alert.prototype.verify = function(publicKey) {
    throw Errors(Errors.NotImplmented, {object: 'alert', method: 'verify'});
}

alert.prototype.info = function() {
    throw Errors(Errors.NotImplmented, {object: 'alert', method: 'info'});
}

var block = defineMessage('block', [
    ['version', format.UInt32],
    ['prev_block', format.Bytes32],
    ['merkle_root', format.Bytes32],
    ['timestamp', format.UInt32],
    ['bits', format.UInt32],
    ['nonce', format.UInt32],
    ['txns', new format.FormatList(format.Tx)],
])

var getaddr = defineMessage('getaddr', []);

var getblocks = defineMessage('getblocks', propertiesLocate);

var getdata = defineMessage('getdata', propertiesInventory);

var getheaders = defineMessage('getheaders', propertiesLocate);

var headers = defineMessage('headers', [
    ['headers', new format.FormatList(format.BlockHeader)],
]);

var inv = defineMessage('inv', propertiesInventory);

var mempool = defineMessage('mempool', [])

var notfound = defineMessage('notfound', propertiesInventory);

var ping = defineMessage('ping', propertiesNonce);

var pong = defineMessage('pong', propertiesNonce);

var reject = defineMessage('reject', [
    ['message', format.VarString],
    ['ccode', format.UInt8],
    ['reason', format.VarString],
]);

var tx = defineMessage('tx', [
    ['version', format.UInt32],
    ['tx_in', new format.FormatList(format.TxIn, 1)],
    ['tx_out', new format.FormatList(format.TxOut, 1)],
    ['lock_time', format.UInt32],
]);

var verack = defineMessage('verack', []);

var version = defineMessage(
    'version',
    [
        ['version', format.Int32],
        ['services', format.UInt64],
        ['timestamp', format.Int64],
        ['addr_recv', format.NetworkAddressWithoutTimestamp],
        ['addr_from', format.NetworkAddressWithoutTimestamp],
        ['nonce', format.Bytes8],
        ['user_agent', format.VarString],
        ['start_height', format.Int32],
//        ['relay', FormatVarString()],
    ]
);


// Some slightly special messages required for AuxPoW
var auxpow_headers = defineMessage('headers', [
    ['headers', new format.FormatList(format.BlockHeaderDetectAuxPoW)],
]);


// Public Interface
module.exports = {
    defineMessage: defineMessage,

    firstAvailableMessageLength: firstAvailableMessageLength,
    messageFromBinary: messageFromBinary,

    messages: {
        addr: addr,
        alert: alert,
        block: block,
        getaddr: getaddr,
        getblocks: getblocks,
        getdata: getdata,
        getheaders: getheaders,
        headers: headers,
        inv: inv,
        mempool: mempool,
        notfound: notfound,
        ping: ping,
        pong: pong,
        reject: reject,
        tx: tx,
        verack: verack,
        version: version,

        auxpow_headers: auxpow_headers,
    },

    format: format,
}


// Test Harness
if (require.main == module) {
    var fs = require('fs');

    var header = new Buffer(fs.readFileSync('test.txt', {encoding: 'utf8'}).replace(/\n/, ''), 'hex');
    console.log('HEADER', header);

    var messages = [
        // Ping
//        new Buffer('3132333470696e6700000000000000000800000070912a883031323334353637', 'hex'),

        // Get Blocks
//        new Buffer('31323334676574626c6f636b73000000650000001801d1880200000002333433343334333433343334333433343334333433343334333433343334333434353435343534353435343534353435343534353435343534353435343534353132313231323132313231323132313231323132313231323132313231323132', 'hex'),

        // Address
//        new Buffer('313233346164647200000000000000003d0000000cb1e4d902b14c3b55080000000000000000000000000000000000ffff7f00000105d2b14c3b55030000000000000020010db8000000000000ff00004283290035', 'hex'),

        header,
    ];

    for (var i = 0; i < messages.length; i++) {
        var m = messages[i];
        //console.log("Message: ", m.toString('hex'));
        var v = messageFromBinary(m);
        //console.log("Value: ", v.values.headers);
        var b = v.toBinary(new Buffer('f9beb4fe', 'hex'));
        //console.log("Binary: ", b.toString('hex'));
        console.log(b.slice(0, 100).toString('hex'), b.length);
        console.log(m.slice(0, 100).toString('hex'), m.length);
        //v = MessageFromBinary(b);
        //var b = v.toBinary(new Buffer('f9beb4fe', 'hex'));
    }

}
