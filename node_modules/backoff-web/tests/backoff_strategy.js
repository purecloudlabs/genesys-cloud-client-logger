const sinon = require('sinon');
const BackoffStrategy = require('../src/strategy/strategy');

class SampleBackoffStrategy extends BackoffStrategy { }

SampleBackoffStrategy.prototype.next_ = function () {
  return this.getInitialDelay();
};

SampleBackoffStrategy.prototype.reset_ = function () {};

exports['BackoffStrategy'] = {
  setUp: function (callback) {
    this.random = sinon.stub(Math, 'random');
    callback();
  },

  tearDown: function (callback) {
    this.random.restore();
    callback();
  },

  'the randomisation factor should be between 0 and 1': function (test) {
    test.throws(function () {
      const strategy = new BackoffStrategy({
        randomisationFactor: -0.1
      });
      return strategy;
    });

    test.throws(function () {
      const strategy = new BackoffStrategy({
        randomisationFactor: 1.1
      });
      return strategy;
    });

    test.doesNotThrow(function () {
      const strategy = new BackoffStrategy({
        randomisationFactor: 0.5
      });
      return strategy;
    });

    test.done();
  },

  'the raw delay should be randomized based on the randomisation factor': function (test) {
    const strategy = new SampleBackoffStrategy({
      randomisationFactor: 0.5,
      initialDelay: 1000
    });
    this.random.returns(0.5);

    const backoffDelay = strategy.next();

    test.equals(backoffDelay, 1000 + (1000 * 0.5 * 0.5));
    test.done();
  },

  'the initial backoff delay should be greater than 0': function (test) {
    test.throws(function () {
      const strategy = new BackoffStrategy({
        initialDelay: -1
      });
      return strategy;
    });

    test.throws(function () {
      const strategy = new BackoffStrategy({
        initialDelay: 0
      });
      return strategy;
    });

    test.doesNotThrow(function () {
      const strategy = new BackoffStrategy({
        initialDelay: 1
      });
      return strategy;
    });

    test.done();
  },

  'the maximal backoff delay should be greater than 0': function (test) {
    test.throws(function () {
      const strategy = new BackoffStrategy({
        maxDelay: -1
      });
      return strategy;
    });

    test.throws(function () {
      const strategy = new BackoffStrategy({
        maxDelay: 0
      });
      return strategy;
    });

    test.done();
  },

  'the maximal backoff delay should be greater than the initial backoff delay': function (test) {
    test.throws(function () {
      const strategy = new BackoffStrategy({
        initialDelay: 10,
        maxDelay: 10
      });
      return strategy;
    });

    test.doesNotThrow(function () {
      const strategy = new BackoffStrategy({
        initialDelay: 10,
        maxDelay: 11
      });
      return strategy;
    });

    test.done();
  }
};
