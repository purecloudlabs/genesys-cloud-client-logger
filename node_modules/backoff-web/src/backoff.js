const WildEmitter = require('wildemitter');

class Backoff extends WildEmitter {
  constructor (backoffStrategy) {
    super();
    this.backoffStrategy_ = backoffStrategy;
    this.maxNumberOfRetry_ = -1;
    this.backoffNumber_ = 0;
    this.backoffDelay_ = 0;
    this.timeoutID_ = -1;

    this.handlers = {
      backoff: this.onBackoff_.bind(this)
    };
  }

  failAfter (maxNumberOfRetry) {
    if (typeof maxNumberOfRetry !== 'undefined' && maxNumberOfRetry <= 0) {
      throw new Error('Expected a maximum number of retry greater than 0 but got ' + maxNumberOfRetry);
    }

    this.maxNumberOfRetry_ = maxNumberOfRetry;
  }

  backoff (err) {
    if (this.timeoutID_ !== -1) {
      throw new Error('Backoff in progress');
    }
    if (this.backoffNumber_ === this.maxNumberOfRetry_) {
      this.emit('fail', err);
      this.reset();
    } else {
      this.backoffDelay_ = this.backoffStrategy_.next();
      this.timeoutID_ = setTimeout(this.handlers.backoff, this.backoffDelay_);
      this.emit('backoff', this.backoffNumber_, this.backoffDelay_, err);
    }
  }

  onBackoff_ () {
    this.timeoutID_ = -1;
    this.emit('ready', this.backoffNumber_, this.backoffDelay_);
    this.backoffNumber_++;
  }

  reset () {
    this.backoffNumber_ = 0;
    this.backoffStrategy_.reset();
    clearTimeout(this.timeoutID_);
    this.timeoutID_ = -1;
  }
}

module.exports = Backoff;
