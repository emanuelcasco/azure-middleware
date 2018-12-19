# Azure Middleware 

Handle express-like middlewares in Azure Functions.

The responsability of this middleware handler is expose a simple API to handle this use cases:

- Validate input schema (using Joi.js).
- Separate the logic in smaller pieces of code, easier to tests.
- Provide a simple way to catch errors.


Inspired in: https://github.com/christopheranderson/func-middleware

## First steps

### Installing

Simply run:

> npm install azure-middleware

### API

```js
const MiddlewareHandler = require('../index');

const middlewareHandler = new MiddlewareHandler();
```

#### middlewareHandler.use

You can add a middleware using `use`. The order which handlers are added to the handler determines the order in which they'll be executed in the runtime.

```js
const handler = context => {
  context.log.info('Im called first');
  context.next();
};

const ChainedFunction = middlewareHandler
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
```

#### middlewareHandler.validate

You can define a schema validation to your function input. We use [Joi]() to create and validate schemas.

```js
const SchemaFunction = new MiddlewareHandler()
  .validate(JoiSchema)
  .use(context => {
    context.log.info('Im called only if message is valid');
    context.done();
  })
  .catch((err, context) => {
    context.log.error(err);
    context.done();
  })
  .listen();
```

#### middlewareHandler.catch

Error handling functions will only be executed if there an error has been thrown or returned to the context.next method, described later, at which point normal Function Handler methods will stop being executed.

```js
const CatchedFunction = new FunctionMiddlewareHandler()
  .validate(EventSchema)
  .use(() => {
    throw 'This is an error';
  })
  .catch((err, context) => {
    context.log.error(err);
    context.done(err);
  })
  .listen();
```

#### context.next

The context.next method triggers the next middleware to start. If an error is passed as a parameter, it will trigger the next Error Function Handler or, if there is none, call context.done with the error passed along.

## Contributing

1. Fork it
2. Create your feature branch (`git checkout -b my-new-feature`)
3. Commit your changes (`git commit -am 'Add some feature'`)
4. Push to the branch (`git push origin my-new-feature`)
5. Create new Pull Request

## About

This project is maintained by [Emanuel Casco](https://github.com/emanuelcasco).

## License

**express-js-bootstrap** is available under the MIT [license](LICENSE.md).

    Copyright (c) 2018 Emanuel Casco

    Permission is hereby granted, free of charge, to any person obtaining a copy
    of this software and associated documentation files (the "Software"), to deal
    in the Software without restriction, including without limitation the rights
    to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
    copies of the Software, and to permit persons to whom the Software is
    furnished to do so, subject to the following conditions:

    The above copyright notice and this permission notice shall be included in
    all copies or substantial portions of the Software.

    THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
    IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
    FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
    AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
    LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
    OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
    THE SOFTWARE.
