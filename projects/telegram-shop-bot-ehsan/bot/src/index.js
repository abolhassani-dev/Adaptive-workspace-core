import { init } from './sdk.js';
import onMessage from './handlers/message.js';
import onCallbackQuery from './handlers/callback_query.js';
import onChannelPost from './handlers/channel_post.js';

// Telegram sends one update per POST. Each update type maps to the handler that
// was already written for it; the payload passed in is the same shape as before.
const ROUTES = [
  ['message', onMessage],
  ['callback_query', onCallbackQuery],
  ['channel_post', onChannelPost],
];

export default {
  async fetch(request, env, ctx) {
    if (request.method !== 'POST') {
      // A plain GET is how you check the Worker is alive without a token.
      return new Response('ok');
    }

    // Anyone who learns the Worker URL could otherwise post fake updates —
    // fake orders, fake admin taps. Telegram echoes this header on every
    // delivery, and it is set when the webhook is registered (see README).
    const expected = env.WEBHOOK_SECRET;
    if (expected && request.headers.get('X-Telegram-Bot-Api-Secret-Token') !== expected) {
      return new Response('forbidden', { status: 403 });
    }

    let update;
    try {
      update = await request.json();
    } catch {
      return new Response('bad request', { status: 400 });
    }

    init(env);

    // Always answer 200, even on failure. A non-200 makes Telegram retry the
    // same update indefinitely, which would replay orders and re-notify Ehsan.
    try {
      for (const [key, handler] of ROUTES) {
        if (update[key]) {
          await handler(update[key], { update });
          break;
        }
      }
    } catch (err) {
      console.error('update failed', err?.stack || String(err));
    }

    return new Response('ok');
  },
};
