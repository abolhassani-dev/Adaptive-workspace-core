import { db } from '../sdk.js';
import { eq } from '../db.js';
import { sessions, settings } from '../schema.js';
import { now } from './config.js';

// Conversation state. States used:
//   idle
//   awaiting_search        — customer typed «استعلام کالا»
//   awaiting_qty           — data: { postId, title, price }
//   awaiting_name          — first order only
//   awaiting_phone         — first order only
//   admin_product_name     — admin is adding a product
//   admin_alias            — data: { productId } — admin is adding alias(es)
//   admin_alias_pick       — data: { unmatchedId, phrase } — resolving a search

export async function getSession(tgId) {
  const row = await db.select().from(sessions).where(eq(sessions.tgId, tgId)).get();
  return row || { tgId, state: 'idle', data: null };
}

export async function setSession(tgId, state, data = null) {
  await db.insert(sessions)
    .values({ tgId, state, data, updatedAt: now() })
    .onConflictDoUpdate({
      target: sessions.tgId,
      set: { state, data, updatedAt: now() },
    })
    .run();
}

export async function clearSession(tgId) {
  await setSession(tgId, 'idle', null);
}

export async function getSetting(key) {
  const row = await db.select().from(settings).where(eq(settings.key, key)).get();
  return row ? row.value : null;
}

export async function setSetting(key, value) {
  await db.insert(settings)
    .values({ key, value: String(value) })
    .onConflictDoUpdate({ target: settings.key, set: { value: String(value) } })
    .run();
}
