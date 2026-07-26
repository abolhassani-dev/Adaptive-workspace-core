import { db, api, BotApiError } from '../sdk.js';
import { eq } from '../db.js';
import { sessions } from '../schema.js';
import { truncate } from './text.js';
import { now } from './config.js';

/**
 * One evolving message per customer.
 *
 * Every step of the flow rewrites the same message rather than adding another, so
 * a customer who searches five things is left with one card instead of fifteen
 * messages. Telegram limits what an edit can do, and those limits shape this:
 *
 *  - A text message cannot become a photo message, or the reverse. When the kind
 *    changes the old message is deleted and a new one replaces it.
 *  - Edits accept inline keyboards only, never the bottom reply keyboard. The
 *    main menu is therefore sent once, separately, and stays put.
 *  - The customer's own typed messages cannot be removed by a bot in a private
 *    chat. Their side of the conversation remains — only the bot's side collapses.
 */

async function readScreen(tgId) {
  const row = await db.select().from(sessions).where(eq(sessions.tgId, tgId)).get();
  return row ? { id: row.screenId, kind: row.screenKind } : { id: null, kind: null };
}

async function writeScreen(tgId, id, kind) {
  await db.insert(sessions)
    .values({ tgId, screenId: id, screenKind: kind, updatedAt: now() })
    .onConflictDoUpdate({
      target: sessions.tgId,
      set: { screenId: id, screenKind: kind, updatedAt: now() },
    })
    .run();
}

const notModified = (err) =>
  err instanceof BotApiError && err.code === 400 && /not modified/i.test(err.description || '');

/**
 * Draw a screen. Pass `photo` (a Telegram file_id) for a card, or omit it for a
 * plain text screen.
 */
export async function showScreen(chatId, tgId, { text, photo = null, reply_markup = null }) {
  const kind = photo ? 'photo' : 'text';
  const prev = await readScreen(tgId);

  if (prev.id && prev.kind === kind) {
    try {
      if (kind === 'text') {
        await api.editMessageText({ chat_id: chatId, message_id: prev.id, text, reply_markup });
      } else {
        await api.editMessageMedia({
          chat_id: chatId,
          message_id: prev.id,
          media: { type: 'photo', media: photo, caption: truncate(text, 1000) },
          reply_markup,
        });
      }
      return prev.id;
    } catch (err) {
      // Tapping the same button twice is not an error worth showing anyone.
      if (notModified(err)) return prev.id;
      // Anything else (message too old to edit, deleted by the customer) falls
      // through to sending a fresh one.
    }
  }

  if (prev.id) {
    await api.deleteMessage({ chat_id: chatId, message_id: prev.id }).catch(() => {});
  }

  const sent = photo
    ? await api.sendPhoto({ chat_id: chatId, photo, caption: truncate(text, 1000), reply_markup })
    : await api.sendMessage({ chat_id: chatId, text, reply_markup });

  await writeScreen(tgId, sent.message_id, kind);
  return sent.message_id;
}

// Used when the next message genuinely must be a new one (the bottom menu, or a
// prompt that needs Telegram's share-contact keyboard).
export async function forgetScreen(tgId) {
  await writeScreen(tgId, null, null);
}
