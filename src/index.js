const Joi = require('joi');

const defaultSchema = Joi.any();

function validateSchema(schema) {
  return function validate(ctx, input) {
    const { error } = Joi.validate(input, schema);
    if (error) {
      ctx.next({
        message: `Invalid input, ${error.message}`,
        details: JSON.stringify(error.details),
        input: JSON.stringify(input)
      });
    } else {
      ctx.next();
    }
  };
}

class FunctionMiddlewareHandler {
  constructor() {
    this.stack = [];
  }

  validate(schema = defaultSchema) {
    const fn = validateSchema(schema);
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
    return (context, inputs, ...args) => self._handle(context, inputs, ...args);
  }

  _handle(ctx, input, ...args) {
    const originalDoneImplementation = ctx.done;
    const stack = this.stack;
    let index = 0;
    let doneWasCalled = false;

    ctx.done = (...params) => {
      if (doneWasCalled) return;
      doneWasCalled = true;
      originalDoneImplementation(...params);
    };

    ctx.next = err => {
      try {
        const layer = stack[index++];
        if (!layer) return;
        if (err && layer.error) return layer.fn(err, ctx, input, ...args);
        if (err) return ctx.next(err);
        return layer.fn(ctx, input, ...args);
      } catch (e) {
        return ctx.next(e);
      }
    };
    return ctx.next();
  }
}

module.exports = FunctionMiddlewareHandler;
