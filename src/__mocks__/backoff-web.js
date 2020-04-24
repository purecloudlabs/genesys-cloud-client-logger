class FakeBackoff {
  constructor () {
    this.handlers = {};
    this.on = this.addHandler.bind(this);
    this.failAfter = jest.fn();
    this.backoff = jest.fn();
  }

  addHandler (name, fn) {
    const handlers = this.handlers[name] || [];
    handlers.push(fn);

    this.handlers[name] = handlers;
  }

  triggerEvent (name) {
    const handlers = this.handlers[name] || [];

    handlers.forEach(fn => fn());
  }
}

const exponential = () => new FakeBackoff();

module.exports = {
  exponential
};
