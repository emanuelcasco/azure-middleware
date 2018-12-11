const Joi = require('joi');

class MiddlewareHandler {
  constructor() {
    this.stack = [];
    this.schema = Joi.any();
  }

  validate(schema) {
    const fn = (ctx, input) => {
      const { error } = Joi.validate(input, schema);
      if (error) {
        const errorMessage = {
          message: 'Invalid input',
          input: JSON.stringify(input)
        };
        ctx.next(errorMessage);
        throw errorMessage;
      }
      ctx.next();
    };
    this.stack = [{ fn }, ...this.stack];
    return this;
  }

  use(fn) {
    this.stack.push({ fn });
    return this;
  }

  catch(fn) {
    this.stack.push({ fn, error: true });
    return this;
  }

  listen() {
    const self = this;
    return (context, inputs) => self._handle(context, inputs);
  }

  _handle(ctx, input) {
    const originalDoneImplementation = ctx.done;
    const stack = this.stack;
    let index = 0;

    ctx.done = (...args) => {
      index = stack.length;
      originalDoneImplementation(...args);
    };

    ctx.next = err => {
      try {
        const layer = stack[index++];
        if (!layer) return;
        if (err && layer.error) return layer.fn(err, ctx, input);
        if (err) return ctx.next(err);
        return layer.fn(ctx, input);
      } catch (e) {
        return ctx.next(e);
      }
    };
    return ctx.next();
  }
}

module.exports = MiddlewareHandler;
