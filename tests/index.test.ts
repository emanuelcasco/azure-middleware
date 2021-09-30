import chai from 'chai';
import Joi from 'joi';
import spies from 'chai-spies';
import { AzureMiddleware } from '../src';

const { expect } = chai;
chai.use(spies);

const EventSchema = Joi.object({
  event: Joi.string().valid('example').required(),
  payload: Joi.object()
    .keys({
      text: Joi.string(),
    })
    .required(),
}).required();

const handler = (ctx: any): void => {
  ctx.log.info('Im called first');
  ctx.next();
};

const defaultCtx = {
  log: chai.spy.interface('log', ['info', 'error', 'warn']),
  bindings: (): {} => ({}),
};

// TODO: review all any types in this file
describe('AzureMiddelware class', function () {
  it('should handle chained functions', function (done) {
    const ChainedFunction = new AzureMiddleware()
      .use(handler)
      .use(
        (ctx: { log: { info: (arg0: string) => void }; next: () => void }) => {
          Promise.resolve(1).then(() => {
            ctx.log.info('Im called second');
            ctx.next();
          });
        },
      )
      .use(
        (ctx: {
          log: { info: (arg0: string) => void };
          done: (arg0: any, arg1: { status: number }) => void;
        }) => {
          ctx.log.info('Im called third');
          ctx.done(null, { status: 200 });
        },
      )
      .listen();

    const message: any = {
      event: 'example',
      payload: { text: 'holamundo' },
    };
    const mockCtx: any = {
      ...defaultCtx,
      done: (err: any, res: any): void => {
        try {
          expect(err).to.equal(null);
          expect(res).to.deep.equal({ status: 200 });
          expect(mockCtx.log.info).to.have.been.called.with('Im called first');
          expect(mockCtx.log.info).to.have.been.called.with('Im called second');
          expect(mockCtx.log.info).to.have.been.called.with('Im called third');
          done();
        } catch (error) {
          done(error);
        }
      },
    };
    ChainedFunction(mockCtx, message);
  });

  it('should handle error in catch', function (done) {
    const CatchedFunction = new AzureMiddleware()
      .use(() => {
        // eslint-disable-next-line @typescript-eslint/no-throw-literal -- previous test
        throw 'This is an error';
      })
      .use(
        (ctx: { log: { info: (arg0: string) => void }; done: () => void }) => {
          ctx.log.info('Im not called');
          ctx.done();
        },
      )
      .catch(
        (
          err: any,
          ctx: {
            log: { error: (arg0: any) => void };
            done: (arg0: any) => void;
          },
        ) => {
          ctx.log.error(err);
          ctx.done(err);
        },
      )
      .listen();

    const message: any = {
      event: 'example',
      payload: { text: 'holamundo' },
    };

    const mockCtx: any = {
      ...defaultCtx,
      done: (err: any): void => {
        try {
          expect(err).to.equal('This is an error');
          expect(mockCtx.log.error).to.have.been.called.with(
            'This is an error',
          );
          done();
        } catch (error) {
          done(error);
        }
      },
    };

    CatchedFunction(mockCtx, message);
  });

  it('should handle valid schema inputs', function (done) {
    const message: any = {
      event: 'example',
      payload: { text: 'holamundo' },
    };

    const ValidSchemaFunction = new AzureMiddleware()
      .validate(EventSchema)
      .use(
        (ctx: { log: { info: (arg0: string) => void }; done: () => void }) => {
          ctx.log.info('Im called');
          ctx.done();
        },
      )
      .catch(
        (
          err: any,
          ctx: {
            log: { error: (arg0: any) => void };
            done: (arg0: any) => void;
          },
        ) => {
          ctx.log.error(err);
          ctx.done(err);
        },
      )
      .listen();

    const mockCtx: any = {
      ...defaultCtx,
      done: (err: any): void => {
        try {
          expect(err).to.equal(undefined);
          expect(mockCtx.log.info).to.have.been.called.with('Im called');
          done();
        } catch (error) {
          done(error);
        }
      },
    };

    ValidSchemaFunction(mockCtx, message);
  });

  it('should handle invalid schema inputs', function (done) {
    const message: any = {};

    const InvalidSchemaFunction = new AzureMiddleware()
      .validate(EventSchema)
      .use(
        (ctx: { log: { info: (arg0: string) => void }; done: () => void }) => {
          ctx.log.info('Im not called');
          ctx.done();
        },
      )
      .catch(
        (
          err: any,
          ctx: {
            log: { error: (arg0: any) => void };
            done: (arg0: any) => void;
          },
        ) => {
          ctx.log.error(err);
          ctx.done(err);
        },
      )
      .listen();

    const mockCtx: any = {
      ...defaultCtx,
      done: (err: { message: any; input: any }): void => {
        try {
          expect(err.message).to.include('Invalid input');
          expect(err.input).to.equal(JSON.stringify(message));
          expect(mockCtx.log.info).to.have.not.been.called.with(
            'Im not called',
          );
          expect(mockCtx.log.error).to.have.been.called();
          done();
        } catch (error) {
          done(error);
        }
      },
    };

    InvalidSchemaFunction(mockCtx, message);
  });

  it('should handle when done in called early', function (done) {
    const message: any = {
      event: 'example',
      payload: { text: 'holamundo' },
    };

    const DoneEarlyFunction = new AzureMiddleware()
      .use(
        (ctx: {
          log: { info: (arg0: string) => void };
          done: (arg0: any) => void;
          next: () => void;
        }) => {
          const predicate = true;
          if (predicate) {
            ctx.log.info('Im called');
            ctx.done(null);
          }
          ctx.next();
        },
      )
      .use(
        (ctx: { log: { info: (arg0: string) => void }; done: () => void }) => {
          ctx.log.info('Im not called');
          ctx.done();
        },
      )
      .catch(
        (
          err: any,
          ctx: {
            log: { error: (arg0: any) => void };
            done: (arg0: any) => void;
          },
        ) => {
          ctx.log.error(err);
          ctx.done(err);
        },
      )
      .listen();

    const mockCtx: any = {
      ...defaultCtx,
      done: (err: any): void => {
        try {
          expect(err).to.equal(null);
          expect(mockCtx.log.info).to.have.been.called.with('Im called');
          expect(mockCtx.log.info).to.have.not.been.called.with(
            'Im not called',
          );
          done();
        } catch (error) {
          done(error);
        }
      },
    };

    DoneEarlyFunction(mockCtx, message);
  });

  it('should handle data spreading', function (done) {
    const message: any = {
      event: 'example',
      payload: { text: 'holamundo' },
    };

    const SpreadDataFunction = new AzureMiddleware()
      .use(((ctx: { myData: string; next: () => void }) => {
        ctx.myData = 'some info';
        ctx.next();
      }) as any)
      .use(((ctx: {
        log: { info: (arg0: string) => void };
        done: (arg0: any, arg1: { data: any }) => void;
        myData: any;
      }) => {
        ctx.log.info('Im not called');
        ctx.done(null, { data: ctx.myData });
      }) as any)
      .catch(
        (
          err: any,
          ctx: {
            log: { error: (arg0: any) => void };
            done: (arg0: any) => void;
          },
        ) => {
          ctx.log.error(err);
          ctx.done(err);
        },
      )
      .listen();

    const mockCtx: any = {
      ...defaultCtx,
      done: (err: any, response: { data: any }): void => {
        try {
          expect(err).to.equal(null);
          expect(response.data).to.equal('some info');
          done();
        } catch (error) {
          done(error);
        }
      },
    };

    SpreadDataFunction(mockCtx, message);
  });

  it('should handle when optional chaining function handlers', function (done) {
    const message: any = {
      event: 'example',
      payload: { text: 'holamundo' },
    };

    const OptionalFunction = new AzureMiddleware()
      .use(((ctx: { data: any[]; next: () => void }) => {
        ctx.data = [];
        ctx.next();
      }) as any)
      .useIf(
        ((ctx: any, msg: { event: string }) => msg.event === 'example') as any,
        ((ctx: { data: number[]; next: () => void }) => {
          ctx.data.push(1);
          ctx.next();
        }) as any,
      )
      .use(((ctx: { data: number[]; next: () => void }) => {
        ctx.data.push(2);
        ctx.next();
      }) as any)
      .useIf(
        ((ctx: any, msg: { event: string }) => msg.event !== 'example') as any,
        ((ctx: { data: number[]; next: () => void }) => {
          ctx.data.push(3);
          ctx.next();
        }) as any,
      )
      .use(((ctx: { data: number[]; done: (arg0: any, arg1: any) => void }) => {
        ctx.data.push(4);
        ctx.done(null, ctx.data);
      }) as any)
      .catch((err: any, ctx: { done: (arg0: any) => void }) => {
        ctx.done(err);
      })
      .listen();

    const mockCtx: any = {
      ...defaultCtx,
      done: (err: any, data: any): void => {
        try {
          expect(err).to.equal(null);
          expect(data).to.deep.equal([1, 2, 4]);
          done();
        } catch (error) {
          done(error);
        }
      },
    };

    OptionalFunction(mockCtx, message);
  });

  it('should handle empty argument in validation and throw error', function (done) {
    try {
      new AzureMiddleware()
        .validate()
        .use(handler)
        .catch((err: any, ctx: { done: (arg0: any) => any }) => ctx.done(err))
        .listen();
      done('should throw!');
    } catch (e: any) {
      expect(e.message).to.equal('schema should not be empty!');
      done();
    }
  });

  it('should handle function in the same order when chaining function handlers', function (done) {
    const message: any = {
      event: 'example',
      payload: { text: 'holamundo' },
    };

    const NextFunction = new AzureMiddleware()
      .use(
        (ctx: { log: { info: (arg0: string) => void }; next: () => void }) => {
          ctx.log.info('Im called first');
          ctx.next();
        },
      )
      .use(
        (ctx: {
          log: { info: (arg0: string) => void };
          next: (arg0: any) => void;
        }) => {
          ctx.log.info('Im called second');
          ctx.next(null);
        },
      )
      .listen();

    const mockCtx: any = {
      ...defaultCtx,
      done: (err: any): void => {
        try {
          expect(err).to.equal(null);
          expect(mockCtx.log.info).to.have.been.called.with('Im called first');
          expect(mockCtx.log.info).to.have.been.called.with('Im called second');
          done();
        } catch (error) {
          done(error);
        }
      },
    };

    NextFunction(mockCtx, message);
  });
});
