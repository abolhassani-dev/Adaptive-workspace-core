import { db } from '../sdk.js';
import { eq, and, lt } from '../db.js';
import { posts, products, aliases } from '../schema.js';
import { normalize, sanitize, extractTitle, truncate } from './text.js';
import { parsePrice, isPriceOnlyLine } from './price.js';
import { now, DAY, POST_MAX_AGE_DAYS } from './config.js';

// Largest available size of each photo — Telegram sends an array of sizes.
function largestPhotoId(photo) {
  if (!Array.isArray(photo) || photo.length === 0) return null;
  return photo[photo.length - 1].file_id;
}

// Best-effort. Null for hand-posted items, which is fine: every order line links
// to the post in Ehsan's channel, so he can always see the source himself.
function supplierFrom(post) {
  const origin = post.forward_origin;
  if (!origin) return null;
  if (origin.type === 'channel' && origin.chat) return origin.chat.title || null;
  if (origin.type === 'user' && origin.sender_user) {
    return origin.sender_user.first_name || null;
  }
  if (origin.type === 'hidden_user') return origin.sender_user_name || null;
  return null;
}

function buildFields(caption) {
  const cleanCaption = sanitize(caption || '');
  const title = extractTitle(caption || '', isPriceOnlyLine);
  // The description is what the caption says beyond its name and its price,
  // minus anything that pointed at the supplier. The card renders price and
  // date in their own blocks, so repeating them here is pure noise.
  const description = cleanCaption
    .split('\n')
    .filter((l) => l.trim() && l.trim() !== title && !isPriceOnlyLine(l))
    .join('\n');
  return {
    caption: caption || '',
    title,
    description: truncate(description, 600),
    // Search over the ORIGINAL caption, not the sanitized one: a stripped phone
    // number never helps a search, but a stripped product word would hurt one.
    searchText: normalize(caption || ''),
    price: parsePrice(caption || ''),
  };
}

/**
 * Index one channel post. Albums arrive as several updates sharing a
 * media_group_id, with the caption usually — but not always — on the first.
 * So this both appends photos to an existing group row and backfills the
 * caption if it turns up on a later message of the group.
 */
export async function indexPost(post) {
  const photoId = largestPhotoId(post.photo);
  const groupId = post.media_group_id || null;

  if (groupId) {
    const existing = await db.select().from(posts)
      .where(and(eq(posts.mediaGroupId, groupId), eq(posts.chatId, post.chat.id)))
      .get();

    if (existing) {
      const photoIds = Array.isArray(existing.photoIds) ? [...existing.photoIds] : [];
      if (photoId && !photoIds.includes(photoId)) photoIds.push(photoId);

      const patch = { photoIds };
      // Caption arrived on a later message of the album — fill it in now.
      if (post.caption && !existing.caption) {
        Object.assign(patch, buildFields(post.caption));
        patch.productId = await resolveProduct(patch.searchText);
      }
      await db.update(posts).set(patch).where(eq(posts.id, existing.id)).run();
      return existing.id;
    }
  }

  const fields = buildFields(post.caption);
  const productId = await resolveProduct(fields.searchText);

  const inserted = await db.insert(posts).values({
    messageId: post.message_id,
    chatId: post.chat.id,
    mediaGroupId: groupId,
    photoIds: photoId ? [photoId] : [],
    supplier: supplierFrom(post),
    postedAt: post.date || now(),
    active: true,
    productId,
    ...fields,
  }).returning();

  return inserted[0]?.id;
}

// Which canonical product does this post text describe? Matches on any alias or
// on the product's own name. Null when the catalogue doesn't know yet — the post
// is still fully searchable by raw text, which is what makes day one work.
export async function resolveProduct(searchText) {
  if (!searchText) return null;

  const allAliases = await db.select().from(aliases).all();
  // Longest alias first: "قالب کیک یزدی" should win over a bare "قالب".
  const sorted = [...allAliases].sort((a, b) => b.alias.length - a.alias.length);
  for (const a of sorted) {
    if (a.alias && searchText.includes(a.alias)) return a.productId;
  }

  const allProducts = await db.select().from(products).all();
  const byName = [...allProducts].sort((a, b) => b.searchName.length - a.searchName.length);
  for (const p of byName) {
    if (p.searchName && searchText.includes(p.searchName)) return p.id;
  }
  return null;
}

/**
 * Re-link existing posts after Ehsan adds a product or an alias. Without this,
 * a new alias would only affect posts added from that moment on — and the whole
 * point of the learning queue is that it fixes what is already indexed.
 *
 * Returns the TOTAL number of posts now attached to the product, not the number
 * newly changed. Ehsan reads this number as "did that work?", and a truthful
 * "0 newly linked" after the product name had already matched everything reads
 * as failure.
 */
export async function relinkPosts(productId) {
  const productAliases = await db.select().from(aliases)
    .where(eq(aliases.productId, productId)).all();
  const product = await db.select().from(products)
    .where(eq(products.id, productId)).get();

  const needles = productAliases.map((a) => a.alias).filter(Boolean);
  if (product?.searchName) needles.push(product.searchName);
  if (needles.length === 0) return 0;

  const candidates = await db.select().from(posts).where(eq(posts.active, true)).all();
  let attached = 0;
  for (const p of candidates) {
    if (p.productId === productId) { attached += 1; continue; }
    if (needles.some((n) => p.searchText && p.searchText.includes(n))) {
      await db.update(posts).set({ productId }).where(eq(posts.id, p.id)).run();
      attached += 1;
    }
  }
  return attached;
}

// Age out old posts so the index never serves a price from last season.
export async function pruneOldPosts() {
  const cutoff = now() - POST_MAX_AGE_DAYS * DAY;
  await db.update(posts).set({ active: false })
    .where(and(eq(posts.active, true), lt(posts.postedAt, cutoff)))
    .run();
}
