CoinDJs - Protocol
==================

This is the *protocol* component of **CoinDJs**, a bitcoin (namecoin and ilk) full node and library.

This includes the necessary libraries to serialize and deserialize the binary format to send over the wire.

Install
-------

```
npm install coindjs-protocol
```

Build a Message
---------------

This is the method *bitcoind* uses today, which operates against a list of trusted DNS seeds included in the *bitcoind* source code.

```javascript
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

// When we create the message, we specify the magic number to put in the header
var bitcoinMagicNumber = new Buffer('f9beb4d9', 'hex');
console.log(versionMessage.toBinary(bitcoinMagicNumber).toString('hex'))
```


Parse a Binary Message
----------------------

```javascript
var getblocksMessage = new Buffer('f9beb4d9676574626c6f636b73000000650000001801d1880200000002333433343334333433343334333433343334333433343334333433343334333434353435343534353435343534353435343534353435343534353435343534353132313231323132313231323132313231323132313231323132313231323132', 'hex');
console.log(protocol.messageFromBinary(getblocksMessage, protocol.messages))
```


Converting a Message from Binary
--------------------------------

```javascript
var pingHex = new Buffer('3132333470696e6700000000000000000800000070912a883031323334353637', 'hex');
console.log(protocol.messages.ping.fromBinary(pingHex));
```


Defining a Custom Format
------------------------

As a quick example of using the format primitives to define a new message definition, here is the format to read the raw blocks from the *blk????.dat* files from the bitcoind *datadir*:

```javascript
var BlockMessage = new format.FormatCompound([
    ['version', format.UInt32],
    ['prev_block', format.Bytes32],
    ['merkle_root', format.Bytes32],
    ['timestamp', format.UInt32],
    ['bits', format.UInt32],
    ['nonce', format.UInt32],
    ['txns', new format.FormatList(format.Tx, 1)],
])
```


Testing
-------

For now, there is a `test.js` that does basic/manual sanity checks... More testing coming soon.


Donations?
----------

Obviously, it's all licensed under the MIT license, so use it as you wish; but if you'd like to buy me a coffee, I won't complain. =)

- Bitcoin - `1EMFpt82U3XHLYTXwZZhKnK4erqAyDf5SW`
- Dogecoin - `DFXSxgGRpNvAFH6LLXMjgvtZhcexr4TH4i`
- Testnet3 - `n4S2tas4vKDPMrV32TE4rebyToi65hHDN1`
