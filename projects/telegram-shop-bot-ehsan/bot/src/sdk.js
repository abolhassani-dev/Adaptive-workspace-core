import { drizzle } from 'drizzle-orm/d1';

/**
 * `db` and `api` are module-level `let` exports, assigned once per request by
 * init(). ES module live bindings mean every module that did
 * `import { db } from '../sdk.js'` sees the assignment — so the whole project
 * keeps importing them as plain values, with no request context threaded
 * through every function signature.
 *
 * A Worker isolate can serve many requests, so init() runs on each one; the
 * bindings only ever come from the current request's env.
 */
export let db;
export let api;

export class BotApiError extends Error {
  constructor(method, body) {
    super(`${method}: ${body.description || 'Bot API error'}`);
    this.name = 'BotApiError';
    this.method = method;
    this.code = body.error_code;
    this.description = body.description;
    this.parameters = body.parameters;
  }
}

function makeApi(token, base) {
  // A Proxy so every Bot API method works without listing them — the same shape
  // the code was already written against.
  return new Proxy({}, {
    get: (_target, method) => async (params = {}) => {
      const res = await fetch(`${base}/bot${token}/${method}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(params),
      });
      const body = await res.json();
      // The envelope is unwrapped and failures throw, matching how every call
      // site in lib/ already handles the Bot API.
      if (!body.ok) throw new BotApiError(String(method), body);
      return body.result;
    },
  });
}

export function init(env) {
  db = drizzle(env.DB);
  // TELEGRAM_API_BASE is only ever set locally, to point at a stub while
  // exercising the full conversation without touching a real bot.
  api = makeApi(env.BOT_TOKEN, env.TELEGRAM_API_BASE || 'https://api.telegram.org');
}
