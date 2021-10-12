import { HttpRequest } from '@azure/functions';
import { Schema } from 'joi';
import {
  ExtendedContext,
  IteratorFnArgument,
  MiddlewareFn,
  MiddlewareFnWithError,
  MiddlewareStack,
  PredicateFn,
} from './types/azure-middleware.type';

export class AzureMiddleware {
  private stack: MiddlewareStack = [];

  public validate(schema?: Schema): this {
    if (!schema) {
      throw Error('schema should not be empty!');
    }

    this.stack = [{ fn: this.validateSchema(schema) }, ...this.stack];

    return this;
  }

  public use(fn: MiddlewareFn): this {
    this.stack.push({ fn });
    return this;
  }

  public iterate(
    args: IteratorFnArgument[],
    iterator: (arg: IteratorFnArgument) => MiddlewareFn | MiddlewareFnWithError,
  ): this {
    args.forEach((arg) => {
      this.stack.push({ fn: iterator(arg) });
    });

    return this;
  }

  public useIf(predicate: PredicateFn, fn: MiddlewareFn): this {
    this.stack.push({ fn, predicate, optional: true });

    return this;
  }

  public catch(fn: MiddlewareFnWithError): this {
    this.stack.push({ fn, error: true });

    return this;
  }

  public listen(): MiddlewareFn {
    const self = this;

    return (
      context: ExtendedContext,
      inputs: HttpRequest,
      ...args: any[]
    ): void => self._handle(context, inputs, ...args);
  }

  private _handle(
    ctx: ExtendedContext,
    input: HttpRequest,
    ...args: any[]
  ): void {
    const originalDoneImplementation = ctx.done;
    const stack = this.stack;
    let index = 0;
    let doneWasCalled = false;

    ctx.done = (...params): void => {
      if (doneWasCalled) return;

      doneWasCalled = true;
      originalDoneImplementation(...params);
    };

    ctx.next = (err): void => {
      try {
        const layer = stack[index++];
        // No more layers to evaluate
        // Call DONE
        if (!layer) return ctx.done(err);
        // Both next called with err AND layers is error handler
        // Call error handler
        if (err && layer.error)
          return (layer.fn as MiddlewareFnWithError)(err, ctx, input, ...args);
        // Next called with err OR layers is error handler, but not both
        // Next layer
        if (err || layer.error) return ctx.next(err);
        // Layer is optional and predicate resolves to false
        // Next layer
        if (layer.optional && !layer.predicate(ctx, input)) return ctx.next();

        // Call function handler
        return (layer.fn as MiddlewareFn)(ctx, input, ...args);
      } catch (e) {
        return ctx.next(e);
      }
    };
    ctx.next();
  }

  private validateSchema(
    schema: Schema,
  ): (ctx: ExtendedContext, input: HttpRequest) => void {
    return (ctx: ExtendedContext, input: HttpRequest): void => {
      const { error } = schema.validate(input);
      return ctx.next(
        error
          ? {
              message: `Invalid input, ${error.message}`,
              details: JSON.stringify(error.details),
              input: JSON.stringify(input),
            }
          : null,
      );
    };
  }
}
