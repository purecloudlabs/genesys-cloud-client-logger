const BackoffStrategy = require('./strategy');

// Exponential backoff strategy.
class ExponentialBackoffStrategy extends BackoffStrategy {
  constructor (options) {
    super(options);

    this.backoffDelay_ = 0;
    this.nextBackoffDelay_ = this.getInitialDelay();
    this.factor_ = ExponentialBackoffStrategy.DEFAULT_FACTOR;

    if (options && options.factor !== undefined) {
      if (options.factor < 1) {
        throw new Error('Exponential factor should be greater than 1 but got %s.');
      }
      this.factor_ = options.factor;
    }
  }

  next_ () {
    this.backoffDelay_ = Math.min(this.nextBackoffDelay_, this.getMaxDelay());
    this.nextBackoffDelay_ = this.backoffDelay_ * this.factor_;
    return this.backoffDelay_;
  }

  reset_ () {
    this.backoffDelay_ = 0;
    this.nextBackoffDelay_ = this.getInitialDelay();
  }
}

ExponentialBackoffStrategy.DEFAULT_FACTOR = 2;

module.exports = ExponentialBackoffStrategy;
