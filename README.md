CoinDJs - Protocol
==================

This is the *protocol* component of **CoinDJs**, a bitcoin (namecoin and ilk) full node and library.

This includes the necessary libraries to serialize and deserialize the binary format to send over the wire.

Install
-------

```
npm install coindjs-protocol
```

Converting a Message to Binary
------------------------------

This is the method *bitcoind* uses today, which operates against a list of trusted DNS seeds included in the *bitcoind* source code.

```javascript
```

Converting a Message from Binary
--------------------------------

This method is no longer used by the *Bitcoin* network, but is still popular with alt-coins that were forked from *bitcoind* quite early on, such as *Namecoin*.
 
```javascript
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
