"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
var interfaces_1 = require("./interfaces");
var uuid_1 = require("uuid");
var safe_json_stringify_1 = __importDefault(require("safe-json-stringify"));
var utils_1 = require("./utils");
var backoff_web_1 = __importDefault(require("backoff-web"));
var superagent_1 = __importDefault(require("superagent"));
var LOG_LEVELS = Object.keys(interfaces_1.LogLevels);
var PAYLOAD_TOO_LARGE = 413;
var MAX_LOG_SIZE = 14500;
var ENVIRONMENTS = [
    'mypurecloud.com',
    'mypurecloud.com.au',
    'mypurecloud.jp',
    'mypurecloud.de',
    'mypurecloud.ie',
    'usw2.pure.cloud',
    'cac1.pure.cloud',
    'euw2.pure.cloud',
    'apne2.pure.cloud'
];
var Logger = /** @class */ (function () {
    function Logger(opts) {
        this.opts = opts;
        this.logBufferSize = 0;
        this.logBuffer = [];
        this.backoffActive = false;
        this.failedLogAttempts = 0;
        this.reduceLogPayload = false;
        Object.defineProperty(this, 'clientId', {
            value: uuid_1.v4(),
            writable: false
        });
        var logLevel = opts.logLevel;
        if (LOG_LEVELS.indexOf(logLevel) === -1) {
            if (logLevel) {
                this.warn("Invalid log level: '" + logLevel + "'. Default '" + interfaces_1.LogLevels.info + "' will be used instead.", true);
            }
            this.opts.logLevel = interfaces_1.LogLevels.info;
        }
    }
    Logger.prototype.initializeServerLogging = function () {
        var _this = this;
        if (!this.opts.environment) {
            var err = new Error('An environment must be provided to do server logging.');
            this.error(err, null, true);
            this.warn('Possible environments: ', ENVIRONMENTS, true);
            return;
        }
        if (!ENVIRONMENTS.includes(this.opts.environment)) {
            this.warn('Unknown environment', null, true);
        }
        this.backoff = backoff_web_1.default.exponential({
            randomisationFactor: 0.2,
            initialDelay: 500,
            maxDelay: 5000,
            factor: 2
        });
        this.backoff.failAfter(20);
        this.backoff.on('backoff', function () {
            _this.backoffActive = true;
            return _this.sendLogs.call(_this);
        });
        this.backoff.on('ready', function () {
            _this.backoff.backoff();
        });
        this.backoff.on('fail', function () {
            _this.backoffActive = false;
        });
    };
    Logger.prototype.log = function (message, details, skipServer) {
        this.processLog(interfaces_1.LogLevels.log, message, details, skipServer);
    };
    Logger.prototype.debug = function (message, details, skipServer) {
        this.processLog(interfaces_1.LogLevels.debug, message, details, skipServer);
    };
    Logger.prototype.info = function (message, details, skipServer) {
        this.processLog(interfaces_1.LogLevels.info, message, details, skipServer);
    };
    Logger.prototype.warn = function (message, details, skipServer) {
        this.processLog(interfaces_1.LogLevels.warn, message, details, skipServer);
    };
    Logger.prototype.error = function (message, details, skipServer) {
        this.processLog(interfaces_1.LogLevels.error, message, details, skipServer);
    };
    Logger.prototype.processLog = function (level, message, details, skipServer) {
        level = (level || interfaces_1.LogLevels.log).toString().toLowerCase();
        if (message instanceof Error) {
            details = details || message;
            message = message.message;
        }
        // immediately log it locally
        console[level]("[" + this.opts.logTopic + "] " + message, details);
        if (skipServer ||
            this.opts.localOnly ||
            LOG_LEVELS.indexOf(level) < LOG_LEVELS.indexOf(this.opts.logLevel.toString())) {
            return;
        }
        var log = {
            clientTime: new Date().toISOString(),
            clientId: this.clientId,
            message: message,
            details: details
        };
        var logContainer = {
            topic: "purecloud-webrtc-sdk",
            level: level.toUpperCase(),
            message: safe_json_stringify_1.default(log)
        };
        var logMessageSize = utils_1.calculateLogMessageSize(logContainer);
        var exceedsMaxLogSize = this.logBufferSize + logMessageSize > MAX_LOG_SIZE;
        if (exceedsMaxLogSize) {
            this.info('Log size limit reached, sending immediately', null, true);
            this.notifyLogs(true);
        }
        this.logBuffer.push(logContainer);
        this.logBufferSize += logMessageSize;
        if (!exceedsMaxLogSize) {
            this.notifyLogs(); // debounced call
        }
    };
    Logger.prototype.notifyLogs = function (sendImmediately) {
        if (this.sendLogTimer) {
            clearTimeout(this.sendLogTimer);
        }
        if (sendImmediately) {
            if (!this.backoffActive) {
                return this.tryToSendLogs.call(this);
            }
            else {
                this.info('Tried to send logs immeidately but a send request is already pending. Waiting for pending request to finish', null, true);
            }
        }
        this.sendLogTimer = setTimeout(this.tryToSendLogs.bind(this), this.opts.uploadDebounceTime);
    };
    Logger.prototype.tryToSendLogs = function () {
        if (!this.backoffActive && this.backoff) {
            this.backoff.backoff();
        }
    };
    Logger.prototype.sendLogs = function () {
        var _this = this;
        var traces = this.getLogPayload();
        this.logBufferSize = utils_1.calculateLogBufferSize(this.logBuffer);
        var payload = {
            app: {
                appId: this.opts.logTopic,
                appVersion: this.opts.appVersion
            },
            traces: traces
        };
        if (traces.length === 0) {
            return Promise.resolve();
        }
        return this.requestApi.call(this, '/diagnostics/trace', {
            method: 'post',
            contentType: 'application/json; charset=UTF-8',
            data: JSON.stringify(payload)
        }).then(function () {
            _this.log('Log data sent successfully', null, true);
            _this.resetBackoffFlags.call(_this);
            _this.backoff.reset();
            if (_this.logBuffer.length) {
                _this.log('Data still left in log buffer, preparing to send again', null, true);
                _this.backoff.backoff();
            }
        }).catch(function (error) {
            _this.failedLogAttempts++;
            if (error.status === PAYLOAD_TOO_LARGE) {
                _this.error(error, null, true);
                // If sending a single log is too big, then scrap it and reset backoff
                if (traces.length === 1) {
                    _this.resetBackoffFlags();
                    _this.backoff.reset();
                    return;
                }
                _this.reduceLogPayload = true;
            }
            else {
                _this.error('Failed to post logs to server', traces, true);
            }
            // Put traces back into buffer in their original order
            var reverseTraces = traces.reverse(); // Reverse traces so they will be unshifted into their original order
            reverseTraces.forEach(function (log) { return _this.logBuffer.unshift(log); });
            _this.logBufferSize = utils_1.calculateLogBufferSize(_this.logBuffer);
        });
    };
    Logger.prototype.getLogPayload = function () {
        var traces;
        if (this.reduceLogPayload) {
            var bufferDivisionFactor = this.failedLogAttempts || 1;
            traces = this.getReducedLogPayload(bufferDivisionFactor);
        }
        else {
            traces = this.logBuffer.splice(0, this.logBuffer.length);
        }
        return traces;
    };
    Logger.prototype.getReducedLogPayload = function (reduceFactor) {
        var reduceBy = reduceFactor * 2;
        var itemsToGet = Math.floor(this.logBuffer.length / reduceBy) || 1;
        var traces = this.logBuffer.splice(0, itemsToGet);
        return traces;
    };
    Logger.prototype.resetBackoffFlags = function () {
        this.backoffActive = false;
        this.failedLogAttempts = 0;
        this.reduceLogPayload = false;
    };
    Logger.prototype.buildUri = function (path, version) {
        if (version === void 0) { version = 'v2'; }
        path = path.replace(/^\/+|\/+$/g, ''); // trim leading/trailing /
        return "https://api." + this.opts.environment + "/api/" + version + "/" + path;
    };
    ;
    Logger.prototype.requestApi = function (path, reqOpts) {
        if (reqOpts === void 0) { reqOpts = {}; }
        var req = superagent_1.default[reqOpts.method || 'get'](this.buildUri.call(this, path, this.opts.appVersion));
        req.set('Authorization', "Bearer " + this.opts.accessToken);
        req.type(reqOpts.contentType || 'json');
        return req.send(reqOpts.data);
    };
    ;
    return Logger;
}());
exports.Logger = Logger;
