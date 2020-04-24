const WildEmitter = require('wildemitter');

const Backoff = require('./backoff');
const FibonacciBackoffStrategy = require('./strategy/fibonacci');

class FunctionCall extends WildEmitter {
  constructor (fn, args, callback) {
    super();

    if (typeof fn !== 'function') {
      throw new Error('Expected first argument to be a function');
    }
    if (!Array.isArray(args)) {
      throw new Error('Expected second argument to be an array');
    }
    if (typeof callback !== 'function') {
      throw new Error('Expected third (last) arugment to be a function');
    }

    this.function_ = fn;
    this.arguments_ = args;
    this.callback_ = callback;
    this.lastResult_ = [];
    this.numRetries_ = 0;

    this.backoff_ = null;
    this.strategy_ = null;
    this.failAfter_ = -1;
    this.retryPredicate_ = FunctionCall.DEFAULT_RETRY_PREDICATE_;

    this.state_ = FunctionCall.State_.PENDING;
  }

  isPending () {
    return this.state_ === FunctionCall.State_.PENDING;
  }

  isRunning () {
    return this.state_ === FunctionCall.State_.RUNNING;
  }

  isCompleted () {
    return this.state_ === FunctionCall.State_.COMPLETED;
  }

  isAborted () {
    return this.state_ === FunctionCall.State_.ABORTED;
  }

  // Sets the backoff strategy to use. Can only be called before the call is
  // started otherwise an exception will be thrown.
  setStrategy (strategy) {
    if (!this.isPending()) {
      throw new Error('FunctionCall is in progress');
    }
    this.strategy_ = strategy;
    return this; // Return this for chaining.
  }

  // Sets the predicate which will be used to determine whether the errors
  // returned from the wrapped function should be retried or not, e.g. a
  // network error would be retriable while a type error would stop the
  // function call.
  retryIf (retryPredicate) {
    if (!this.isPending()) {
      throw new Error('FunctionCall in progress');
    }
    this.retryPredicate_ = retryPredicate;
    return this;
  }

  // Returns all intermediary results returned by the wrapped function since
  // the initial call.
  getLastResult () {
    return this.lastResult_.concat();
  }

  getNumRetries () {
    return this.numRetries_;
  }

  // Sets the backoff limit.
  failAfter (maxNumberOfRetry) {
    if (!this.isPending()) {
      throw new Error('FunctionCall in progress');
    }
    this.failAfter_ = maxNumberOfRetry;
    return this; // Return this for chaining.
  }

  abort () {
    if (this.isCompleted() || this.isAborted()) {
      return;
    }

    if (this.isRunning()) {
      this.backoff_.reset();
    }

    this.state_ = FunctionCall.State_.ABORTED;
    this.lastResult_ = [new Error('Backoff aborted.')];
    this.emit('abort');
    this.doCallback_();
  }

  // Initiates the call to the wrapped function. Accepts an optional factory
  // function used to create the backoff instance; used when testing.
  start (backoffFactory) {
    if (this.isAborted()) {
      throw new Error('FunctionCall is aborted');
    }
    if (!this.isPending()) {
      throw new Error('FunctionCall already started');
    }

    const strategy = this.strategy_ || new FibonacciBackoffStrategy();

    this.backoff_ = backoffFactory
      ? backoffFactory(strategy)
      : new Backoff(strategy);

    this.backoff_.on('ready', this.doCall_.bind(this, true /* isRetry */));
    this.backoff_.on('fail', this.doCallback_.bind(this));
    this.backoff_.on('backoff', this.handleBackoff_.bind(this));

    if (this.failAfter_ > 0) {
      this.backoff_.failAfter(this.failAfter_);
    }

    this.state_ = FunctionCall.State_.RUNNING;
    this.doCall_(false /* isRetry */);
  }

  // Calls the wrapped function.
  doCall_ (isRetry) {
    if (isRetry) {
      this.numRetries_++;
    }
    this.emit('call', ...this.arguments_);
    const callback = this.handleFunctionCallback_.bind(this);
    this.function_.call(null, ...this.arguments_, callback);
  }

  // Calls the wrapped function's callback with the last result returned by the
  // wrapped function.
  doCallback_ () {
    this.callback_.apply(null, this.lastResult_);
  }

  // Handles wrapped function's completion. This method acts as a replacement
  // for the original callback function.
  handleFunctionCallback_ () {
    if (this.isAborted()) {
      return;
    }

    // TODO: verify
    var args = Array.prototype.slice.call(arguments);
    this.lastResult_ = args; // Save last callback arguments.

    this.emit('callback', ...args);

    var err = args[0];
    if (err && this.retryPredicate_(err)) {
      this.backoff_.backoff(err);
    } else {
      this.state_ = FunctionCall.State_.COMPLETED;
      this.doCallback_();
    }
  }

  // Handles the backoff event by reemitting it.
  handleBackoff_ (number, delay, err) {
    this.emit('backoff', number, delay, err);
  }
}

// States in which the call can be.
FunctionCall.State_ = {
  // Call isn't started yet.
  PENDING: 0,
  // Call is in progress.
  RUNNING: 1,
  // Call completed successfully which means that either the wrapped function
  // returned successfully or the maximal number of backoffs was reached.
  COMPLETED: 2,
  // The call was aborted.
  ABORTED: 3
};

// The default retry predicate which considers any error as retriable.
FunctionCall.DEFAULT_RETRY_PREDICATE_ = function (/* err */) {
  return true;
};

module.exports = FunctionCall;
