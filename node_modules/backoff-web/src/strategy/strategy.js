function isDef (value) {
  return value !== undefined && value !== null;
}

// class defining the skeleton for the backoff strategies. Accepts an
// object holding the options for the backoff strategy:
//
//  * `randomisationFactor`: The randomisation factor which must be between 0
//     and 1 where 1 equates to a randomization factor of 100% and 0 to no
//     randomization.
//  * `initialDelay`: The backoff initial delay in milliseconds.
//  * `maxDelay`: The backoff maximal delay in milliseconds.
class BackoffStrategy {
  constructor (options) {
    options = options || {};

    if (isDef(options.initialDelay) && options.initialDelay < 1) {
      throw new Error('The initial timeout must be greater than 0.');
    }
    if (isDef(options.maxDelay) && options.maxDelay < 1) {
      throw new Error('The maximal timeout must be greater than 0.');
    }

    this.initialDelay_ = options.initialDelay || 100;
    this.maxDelay_ = options.maxDelay || 10000;

    if (this.maxDelay_ <= this.initialDelay_) {
      throw new Error('The maximal backoff delay must be ' +
                            'greater than the initial backoff delay.');
    }

    if (isDef(options.randomisationFactor) &&
            (options.randomisationFactor < 0 || options.randomisationFactor > 1)) {
      throw new Error('The randomisation factor must be between 0 and 1.');
    }

    this.randomisationFactor_ = options.randomisationFactor || 0;
  }

  getMaxDelay () {
    return this.maxDelay_;
  }

  getInitialDelay () {
    return this.initialDelay_;
  }

  next () {
    const backoffDelay = this.next_();
    const randomisationMultiple = 1 + Math.random() * this.randomisationFactor_;
    const randomizedDelay = Math.round(backoffDelay * randomisationMultiple);
    return randomizedDelay;
  }

  next_ () {
    throw new Error('Not implemented');
  }

  reset () {
    this.reset_();
  }

  reset_ () {
    throw new Error('Not implemented');
  }
}

module.exports = BackoffStrategy;
