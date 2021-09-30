import { Context, HttpRequest } from '@azure/functions';

export type AzureMiddlewareDoneFn = ((
  err?: string | Error | null | undefined,
  result?: any,
) => void) &
  ((err?: string | Error | null | undefined, result?: any) => void);

export type AzureMiddlewareNextFn = (error?: any) => void;

export type ExtendedContext = Context & {
  next: AzureMiddlewareNextFn;
  done: AzureMiddlewareDoneFn;
};

export type MiddlewareFn = (
  ctx: ExtendedContext,
  input: HttpRequest,
  ...args: any[]
) => void;

export type MiddlewareFnWithError = (
  error: any | null,
  ctx: ExtendedContext,
  input: HttpRequest,
  ...args: any[]
) => void;

export type MiddlewareFnType<T> = T extends MiddlewareFnWithError
  ? MiddlewareFnWithError
  : MiddlewareFn;

export type MiddlewareStack = {
  fn: MiddlewareFn | MiddlewareFnWithError;
  predicate?: any;
  optional?: boolean;
  error?: boolean;
}[];

export type IteratorFnArgument = {
  ctx: ExtendedContext;
  input: HttpRequest;
  args: any[];
};

export type PredicateFn = (ctx: ExtendedContext, input: HttpRequest) => boolean;
