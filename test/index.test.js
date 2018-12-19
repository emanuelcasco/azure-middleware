const chai = require('chai');
const Joi = require('joi');
const spies = require('chai-spies');

const MiddlewareHandler = require('../index');

const { expect } = chai;
chai.use(spies);

const myPromise = (delayInMilliseconds, cb) => {
  setTimeout(() => {
    cb();
  }, delayInMilliseconds);
};

const EventSchema = Joi.object({
  event: Joi.string()
    .valid('example')
    .required(),
  payload: Joi.object()
    .keys({
      text: Joi.string()
    })
    .required()
}).required();

const handler = context => {
  context.log.info('Im called first');
  context.next();
};

const defaultContext = {
  log: chai.spy.interface('log', ['info', 'error', 'warn']),
  bindings: () => ({})
};

describe('Azure middleware basic functionality works good', () => {
  it('should handle chained functions', done => {
    const ChainedFunction = new MiddlewareHandler()
      .use(handler)
      .use(context => {
        myPromise(1, () => {
          context.log.info('Im called second');
          context.next();
        });
      })
      .use(context => {
        context.log.info('Im called third');
        context.done(null, { status: 200 });
      })
      .listen();

    const message = {
      event: 'example',
      payload: { text: 'holamundo' }
    };
    const mockContext = {
      ...defaultContext,
      done: (err, res) => {
        try {
          expect(err).to.equal(null);
          expect(res).to.deep.equal({ status: 200 });
          expect(mockContext.log.info).to.have.been.called.with('Im called first');
          expect(mockContext.log.info).to.have.been.called.with('Im called second');
          expect(mockContext.log.info).to.have.been.called.with('Im called third');
          done();
        } catch (error) {
          done(error);
        }
      }
    };
    ChainedFunction(mockContext, message);
  });

  it('should handle error in catch', done => {
    const CatchedFunction = new MiddlewareHandler()
      .use(() => {
        throw 'This is an error';
      })
      .use(context => {
        context.log.info('Im not called');
        context.done();
      })
      .catch((err, context) => {
        context.log.error(err);
        context.done(err);
      })
      .listen();

    const message = {
      event: 'example',
      payload: { text: 'holamundo' }
    };

    const mockContext = {
      ...defaultContext,
      done: err => {
        try {
          expect(err).to.equal('This is an error');
          expect(mockContext.log.error).to.have.been.called.with('This is an error');
          done();
        } catch (error) {
          done(error);
        }
      }
    };

    CatchedFunction(mockContext, message);
  });

  it('should handle invalid schema inputs', done => {
    const message = {};

    const InvalidSchemaFunction = new MiddlewareHandler()
      .validate(EventSchema)
      .use(context => {
        context.log.info('Im not called');
        context.done();
      })
      .catch((err, context) => {
        context.log.error(err);
        context.done(err);
      })
      .listen();

    const mockContext = {
      ...defaultContext,
      done: err => {
        try {
          expect(err.message).to.include('Invalid input');
          expect(err.input).to.equal(JSON.stringify(message));
          expect(mockContext.log.info).to.have.not.been.called.with('Im not called');
          expect(mockContext.log.error).to.have.been.called();
          done();
        } catch (error) {
          done(error);
        }
      }
    };

    InvalidSchemaFunction(mockContext, message);
  });

  it('should handle when done in called early', done => {
    const message = {
      event: 'example',
      payload: { text: 'holamundo' }
    };

    const DoneEarlyFunction = new MiddlewareHandler()
      .use(context => {
        const predicate = true;
        if (predicate) {
          context.log.info('Im called');
          context.done(null);
        }
        context.next();
      })
      .use(context => {
        context.log.info('Im not called');
        context.done();
      })
      .catch((err, context) => {
        context.log.error(err);
        context.done(err);
      })
      .listen();

    const mockContext = {
      ...defaultContext,
      done: err => {
        try {
          expect(err).to.equal(null);
          expect(mockContext.log.info).to.have.been.called.with('Im called');
          expect(mockContext.log.info).to.have.not.been.called.with('Im not called');
          done();
        } catch (error) {
          done(error);
        }
      }
    };

    DoneEarlyFunction(mockContext, message);
  });

  it('should handle data spreading', done => {
    const message = {
      event: 'example',
      payload: { text: 'holamundo' }
    };

    const SpreadDataFunction = new MiddlewareHandler()
      .use(context => {
        context.myData = 'some info';
        context.next();
      })
      .use(context => {
        context.log.info('Im not called');
        context.done(null, { data: context.myData });
      })
      .catch((err, context) => {
        context.log.error(err);
        context.done(err);
      })
      .listen();

    const mockContext = {
      ...defaultContext,
      done: (err, response) => {
        try {
          expect(err).to.equal(null);
          expect(response.data).to.equal('some info');
          done();
        } catch (error) {
          done(error);
        }
      }
    };

    SpreadDataFunction(mockContext, message);
  });
});
describe('Azure middleware optional chaining works good', () => {
  it('should handle when optional chaining function handlers', done => {
    const message = {
      event: 'example',
      payload: { text: 'holamundo' }
    };

    const OptionalFunction = new MiddlewareHandler()
      .use(context => {
        context.data = [];
        context.next();
      })
      .optionalUse(
        msg => msg.event === 'example',
        context => {
          context.data.push(1);
          context.next();
        }
      )
      .use(context => {
        context.data.push(2);
        context.next();
      })
      .optionalUse(
        msg => msg.event !== 'example',
        context => {
          context.data.push(3);
          context.next();
        }
      )
      .use(context => {
        context.data.push(4);
        context.done(null, context.data);
      })
      .catch((err, context) => {
        context.done(err);
      })
      .listen();

    const mockContext = {
      ...defaultContext,
      done: (err, data) => {
        try {
          expect(err).to.equal(null);
          expect(data).to.deep.equal([1, 2, 4]);
          done();
        } catch (error) {
          done(error);
        }
      }
    };

    OptionalFunction(mockContext, message);
  });
});
