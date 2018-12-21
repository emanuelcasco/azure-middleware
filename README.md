>  Node.js middleware engine for Azure Functions

[![](https://img.shields.io/github/languages/code-size/badges/shields.svg)](https://github.com/emanuelcasco/azure-middleware) [![](https://img.shields.io/david/:user/:repo.svg)](https://github.com/emanuelcasco/azure-middleware) [![](https://img.shields.io/node/v/:packageName.svg)](https://github.com/emanuelcasco/azure-middleware) [![](https://img.shields.io/npm/v/npm/next.svg)](https://github.com/emanuelcasco/azure-middleware) [![](https://img.shields.io/github/issues-raw/badges/shields.svg)](https://github.com/emanuelcasco/azure-middleware)

<p align="center">
  <img width="150" height="150" src="./assets/logo.png">
</p>

# Azure Middleware Engine 🔗

Azure Middleware Engine is developed inspired in web framworks like [express](http://expressjs.com/), [fastify](http://fastify.io/), [hapi](https://hapijs.com/), etc. to provide an easy-to-use api to use middleware patter in [Azure Functions](https://azure.microsoft.com/en-us/services/functions/).

But, less talk and let see some code.

For example:

```js
// index.js

const { someFunctionHandler } = require('./handlers');
const schema = require('../schemas');

const ChainedFunction = new MiddlewareHandler()
   .validate(schema)
   .use(someFunctionHandler)
   .use(ctx => {
      Promise.resolve(1).then(() => {
         ctx.log.info('Im called second');
         ctx.next();
      });
   })
   .use(ctx => {
      ctx.log.info('Im called third');
      ctx.done(null, { status: 200 });
   })
   .listen();
```

## Install

Simply run:

```bash
npm install azure-middleware-engine
```


## Motivation

Biggest benefit of serverless arquitectures is that you can focus on implementing business logic. The problem is that when you are writing a function handler, you have to deal with some common technical concerns outside business logic, like input parsing and validation, output serialization, error handling, api calls, and more.

Very often, all this necessary code ends up polluting the pure business logic code in your handlers, making the code harder to read and to maintain.

Web frameworks, like [express](http://expressjs.com/), [fastify](http://fastify.io/) or [hapi](https://hapijs.com/), has solved this problem using the [middleware pattern](https://www.packtpub.com/mapt/book/web_development/9781783287314/4/ch04lvl1sec33/middleware).

This pattern allows developers to isolate these common technical concerns into *"steps"* that *decorate* the main business logic code. 

Separating the business logic in smaller steps allows you to keep your code clean, readable and easy to maintain.

Having not found an option already developed, I decided to create my own middleware engine for Azure Functions. 

## Usage

If you are familiar with Functional programming you will notice that behavior is similar to a pipeline. You can attach function handlers to the chain and them will be executed sequentially, 

#### middlewareHandler.use

You can add a middleware using `use`. The order which handlers are added to the handler determines the order in which they'll be executed in the runtime.

```javascript
const ChainedFunction = new MiddlewareHandler()
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

module.exports = ChainedFunction;
```

#### middlewareHandler.useIf

Similar to `use`, but you can define a predicate as first argument. If predicates resolves in a `false` then function handler won't be executed.

```javascript
const OptionalFunction = new MiddlewareHandler()
   .use(ctx => {
      ctx.log.info('I will be called');
      ctx.next();
   })
   .useIf(
      msg => false, // function won't be executed
      ctx => {
      	ctx.log.info('I won\'t be called');
         ctx.next();
      }
   )
   .catch((err, ctx) => {
      ctx.done(err);
   })
  .listen()

module.exports = OptionalFunction;
```

#### middlewareHandler.validate

You can define a schema validation to your function input. We use [Joi](https://www.npmjs.com/package/azure-middleware) to create and validate schemas.

```javascript
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

```javascript
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

##### middlewareHandler.listen

Creates a function which can be exported as an Azure Function module.


## API

#### Function types

##### FunctionHandler - (context, input): any

A Function Handler is the normal syntax for an Azure Function. Any existing Node.js Functions could be used in this place. Note that you have to use the `context.next` method to trigger the next piece of middleware, which would require changes to any existing code that was used with func-middleware.

##### ErrorFunctionHandler - (err, context, input): any

Same as a normal Function Handler, but the first parameter is instead a context object.

##### Predicate - (input): boolean

Predicates are functions that have to return a boolean value. They are used to define a condition by which a FunctionHandler is executed or not.

#### Next & Done

##### context.next(err?: Error)

The `context.next` method triggers the next middleware to start. If an error is passed as a parameter, it will trigger the next ErrorFunctionHandler or, if there is none, call context.done with the error passed along.

##### context.done(err?: Error, output: any)

The `context.done` method works the same as normal, but it's been wrapped by the library to prevent multiple calls.


## About

This project is maintained by [Emanuel Casco](https://github.com/emanuelcasco).

## License

**azure-middleware-engine** is available under the MIT [license](https://github.com/emanuelcasco/azure-middleware/blob/HEAD/LICENSE.md).

```
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
```