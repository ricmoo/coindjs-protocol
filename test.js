var protocol = require('./index.js');

var timestamp = (new Date()).getTime();
var versionMessage = new protocol.messages.version({
    version: 1,
    services: 1,
    timestamp: timestamp,
    addr_recv: {
        timestamp: timestamp,
        services: 1,
        address: '127.0.0.1',
        port: 8883
    },
    addr_from: {
        timestamp: timestamp,
        services: 1,
        address: '127.0.0.1',
        port: 8883
    },
    nonce: (new Buffer('0123456789abcdef', 'hex')),
    user_agent: "SomeAgent/0.9",
    start_height: 100000
});

var bitcoinMagicNumber = new Buffer('f9beb4d9', 'hex');
console.log(versionMessage.toBinary(bitcoinMagicNumber).toString('hex'))

var pingHex = new Buffer('3132333470696e6700000000000000000800000070912a883031323334353637', 'hex');
console.log(protocol.messages.ping.fromBinary(pingHex));

//var getblocksHex = new Buffer('31323334676574626c6f636b73000000650000001801d1880200000002333433343334333433343334333433343334333433343334333433343334333434353435343534353435343534353435343534353435343534353435343534353132313231323132313231323132313231323132313231323132313231323132', 'hex');
//var getblocksMessage = protocol.messages.getblocks.fromBinary(getblocksHex);
//console.log('a', getblocksMessage);
//console.log('b', getblocksMessage.toBinary(bitcoinMagicNumber).toString('hex'));


var getblocksMessage = new Buffer('f9beb4d9676574626c6f636b73000000650000001801d1880200000002333433343334333433343334333433343334333433343334333433343334333434353435343534353435343534353435343534353435343534353435343534353132313231323132313231323132313231323132313231323132313231323132', 'hex');
console.log(protocol.messageFromBinary(getblocksMessage, protocol.messages))
