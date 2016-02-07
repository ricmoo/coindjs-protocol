'use strict';

var util = require('util');

var ErrorCodes = {
    InvalidAlertSignature:      'Invalid Alert Signature',

    BadMagicNumber:             'Bad Magic Number',
    WrongMessageLength:         'Wrong Message Length',
    BadChecksum:                'Bad Checksum',

    MissingProperty:            'Missing Property',
    ExtraneousProperty:         'Extraneous Property',

    NotImplmented:              'Not Implemented',

    BufferOverrun:              'BufferOverrun',
    PropertyTypeMismatch:       'Property Type Mismatch',
    BadPropertyValue:           'Bad Property Value',
    InvalidSize:                'Invalid Size',
}

function MakeError(errorCode, details) {
    var message = util.format('<%s (%j)>', ErrorCodes[errorCode], details);
    var error = new Error(message);
    error.errorCode = errorCode;
    for (var detail in details) {
        error[detail] = details[detail];
    }
    return error;
}

for (var errorCode in ErrorCodes) {
    MakeError[errorCode] = errorCode;
}

module.exports = MakeError

