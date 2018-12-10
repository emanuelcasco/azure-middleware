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

const CatchedFunction = new MiddlewareHandler()
  .validate(EventSchema)
  .use(() => {
    // eslint-disable-next-line no-throw-literal
    throw 'This is an error';
  })
  .catch((err, context) => {
    context.log.error(err);
    context.done(err);
  })
  .listen();

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

describe('Azure middleware works good', () => {
  it('should handle chained functions', done => {
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
    const message = { event: 'example' };

    const mockContext = {
      ...defaultContext,
      done: err => {
        try {
          expect(err.message).to.equal('Invalid input');
          expect(err.input).to.equal(JSON.stringify(message));
          expect(mockContext.log.info).to.have.not.been.called.with('Im not called');
          expect(mockContext.log.error).to.have.been.called.with({
            message: 'Invalid input',
            input: JSON.stringify(message)
          });
          done();
        } catch (error) {
          done(error);
        }
      }
    };

    InvalidSchemaFunction(mockContext, message);
  });
});
