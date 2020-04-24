"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.calculateLogBufferSize = function (arr) {
    return arr.reduce(function (size, trace) { return size + exports.calculateLogMessageSize(trace); }, 0);
};
exports.calculateLogMessageSize = function (trace) {
    var str = JSON.stringify(trace);
    // http://stackoverflow.com/questions/5515869/string-length-in-bytes-in-javascript
    // Matches only the 10.. bytes that are non-initial characters in a multi-byte sequence.
    var m = encodeURIComponent(str).match(/%[89ABab]/g);
    return str.length + (m ? m.length : 0);
};
