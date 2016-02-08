var message = require('./message.js');

module.exports = {
    format: message.format,

    defineMessage: message.defineMessage,
    firstAvailableMessageLength: message.firstAvailableMessageLength,
    messageFromBinary: message.messageFromBinary,

    messages: message.messages,
}
