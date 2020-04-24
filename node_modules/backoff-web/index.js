//      Copyright (c) 2012 Mathieu Turcotte
//      Licensed under the MIT license.

const Backoff = require('./src/backoff');
const ExponentialBackoffStrategy = require('./src/strategy/exponential');
const FibonacciBackoffStrategy = require('./src/strategy/fibonacci');
const FunctionCall = require('./src/function_call.js');

module.exports.Backoff = Backoff;
module.exports.FunctionCall = FunctionCall;
module.exports.FibonacciStrategy = FibonacciBackoffStrategy;
module.exports.ExponentialStrategy = ExponentialBackoffStrategy;

// Constructs a Fibonacci backoff.
module.exports.fibonacci = function (options) {
  return new Backoff(new FibonacciBackoffStrategy(options));
};

// Constructs an exponential backoff.
module.exports.exponential = function (options) {
  return new Backoff(new ExponentialBackoffStrategy(options));
};

// Constructs a FunctionCall for the given function and arguments.
module.exports.call = function (...args) {
  const fn = args[0];
  const vargs = args.slice(1, args.length - 1);
  const callback = args[args.length - 1];
  return new FunctionCall(fn, vargs, callback);
};
