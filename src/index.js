const Joi = require('joi');

const validateSchema = schema => (ctx, input) => {
  const { error } = Joi.validate(input, schema);
  return ctx.next(
    error
      ? {
          message: `Invalid input, ${error.message}`,
          details: JSON.stringify(error.details),
          input: JSON.stringify(input)
        }
      : null
  );
};

class FunctionMiddlewareHandler {
  constructor() {
    this.stack = [];
  }

  validate(schema) {
    if (!schema) {
      throw Error('schema should not be empty!');
    }
    this.stack = [{ fn: validateSchema(schema) }, ...this.stack];
    return this;
  }

  use(fn) {
    this.stack.push({ fn });
    return this;
  }

  useIf(predicate, fn) {
    this.stack.push({ fn, predicate, optional: true });
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
        if (!layer) return ctx.done(err);
        if (err && layer.error) return layer.fn(err, ctx, input, ...args);
        if (err) return ctx.next(err);
        if (layer.optional) {
          if (!layer.predicate(ctx, input)) return ctx.next();
        }
        return layer.fn(ctx, input, ...args);
      } catch (e) {
        return ctx.next(e);
      }
    };
    return ctx.next();
  }
}

module.exports = FunctionMiddlewareHandler;
