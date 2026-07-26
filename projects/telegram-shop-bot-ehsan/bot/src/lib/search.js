import { db } from '../sdk.js';
import { eq, and, gte, like, inArray } from '../db.js';
import { posts, products, aliases, unmatched } from '../schema.js';
import { normalize, tokenize } from './text.js';
import { now, DAY, FRESHNESS_DAYS, POST_MAX_AGE_DAYS, MAX_RESULTS } from './config.js';

export const isFresh = (postedAt) => now() - postedAt <= FRESHNESS_DAYS * DAY;

// Most recently posted first; a post with no readable price sorts last so it is
// still reachable when the newest post happens to omit the number.
const newestFirst = (a, b) => {
  if ((a.price === null) !== (b.price === null)) return a.price === null ? 1 : -1;
  return b.postedAt - a.postedAt;
};

// Which canonical products does this query name? This is the layer that lets a
// customer type «کاسه ۸.۵» and reach posts that only ever say «قالب کیک یزدی».
async function productIdsForQuery(q) {
  const ids = new Set();

  for (const a of await db.select().from(aliases).all()) {
    if (!a.alias) continue;
    if (q.includes(a.alias) || a.alias.includes(q)) ids.add(a.productId);
  }
  for (const p of await db.select().from(products).all()) {
    if (!p.searchName) continue;
    if (q.includes(p.searchName) || p.searchName.includes(q)) ids.add(p.id);
  }
  return [...ids];
}

/**
 * Resolve a customer's free-text query into product groups, each with its
 * offers sorted cheapest-first.
 *
 * Two layers, deliberately in this order: raw normalized text search over every
 * indexed post (works on day one with an empty catalogue), widened by the alias
 * table wherever Ehsan has taught it something.
 */
export async function searchProducts(rawQuery) {
  const q = normalize(rawQuery);
  const tokens = tokenize(rawQuery);
  if (tokens.length === 0) return [];

  const cutoff = now() - POST_MAX_AGE_DAYS * DAY;
  const base = [eq(posts.active, true), gte(posts.postedAt, cutoff)];

  // Every token must appear — narrowing beats drowning the customer in matches.
  const byText = await db.select().from(posts)
    .where(and(...base, ...tokens.map((t) => like(posts.searchText, `%${t}%`))))
    .all();

  let byProduct = [];
  const productIds = await productIdsForQuery(q);
  if (productIds.length > 0) {
    byProduct = await db.select().from(posts)
      .where(and(...base, inArray(posts.productId, productIds)))
      .all();
  }

  const seen = new Set();
  const candidates = [];
  for (const p of [...byText, ...byProduct]) {
    if (seen.has(p.id)) continue;
    seen.add(p.id);
    candidates.push(p);
  }
  if (candidates.length === 0) return [];

  // Group posts that describe the same thing. A linked product is authoritative;
  // failing that, an identical normalized title is a strong enough signal that
  // two shops are selling the same item.
  const groups = new Map();
  for (const p of candidates) {
    const key = p.productId
      ? `p:${p.productId}`
      : (p.title ? `t:${normalize(p.title)}` : `m:${p.id}`);
    if (!groups.has(key)) groups.set(key, { key, title: p.title || rawQuery, offers: [] });
    groups.get(key).offers.push(p);
  }

  const productNames = new Map(
    (await db.select().from(products).all()).map((p) => [p.id, p]),
  );

  const result = [];
  for (const g of groups.values()) {
    // Cheapest first, but only among priced offers; unpriced ones sort last so
    // they are still reachable when nobody published a number.
    g.offers.sort(newestFirst);

    // Newest wins, not cheapest. The channel is Ehsan's own catalogue, so a
    // later post for the same product IS the current price — including when he
    // raises it. Picking the cheapest would quote a superseded price back at him.
    g.best = g.offers.find((o) => o.price !== null) || g.offers[0];

    const linked = g.key.startsWith('p:') ? productNames.get(g.best.productId) : null;
    if (linked) {
      g.title = linked.name;
      if (linked.photoId) g.pinnedPhotoId = linked.photoId;
    }
    result.push(g);
  }

  // Exact-ish title matches first, then whatever has a fresh price.
  result.sort((a, b) => {
    const at = normalize(a.title), bt = normalize(b.title);
    const aExact = at === q ? 0 : (at.includes(q) ? 1 : 2);
    const bExact = bt === q ? 0 : (bt.includes(q) ? 1 : 2);
    if (aExact !== bExact) return aExact - bExact;
    const aFresh = a.best?.price !== null && isFresh(a.best?.postedAt) ? 0 : 1;
    const bFresh = b.best?.price !== null && isFresh(b.best?.postedAt) ? 0 : 1;
    if (aFresh !== bFresh) return aFresh - bFresh;
    return (b.best?.postedAt || 0) - (a.best?.postedAt || 0);
  });

  return result.slice(0, MAX_RESULTS);
}

/**
 * Rebuild the offer group around one post — every other post selling the same
 * thing, cheapest first. Used when a customer taps a specific result and when an
 * order is placed, so Ehsan's notification can list the runner-up suppliers.
 */
export async function getGroupForPost(postId) {
  const post = await db.select().from(posts).where(eq(posts.id, postId)).get();
  if (!post) return null;

  const cutoff = now() - POST_MAX_AGE_DAYS * DAY;
  const siblings = post.productId
    ? await db.select().from(posts)
        .where(and(eq(posts.active, true), gte(posts.postedAt, cutoff),
                   eq(posts.productId, post.productId)))
        .all()
    : (await db.select().from(posts)
        .where(and(eq(posts.active, true), gte(posts.postedAt, cutoff)))
        .all())
        .filter((p) => p.title && normalize(p.title) === normalize(post.title));

  const offers = siblings.length > 0 ? siblings : [post];
  offers.sort(newestFirst);

  let title = post.title;
  let pinnedPhotoId;
  if (post.productId) {
    const linked = await db.select().from(products).where(eq(products.id, post.productId)).get();
    if (linked) {
      title = linked.name;
      if (linked.photoId) pinnedPhotoId = linked.photoId;
    }
  }

  // The tapped post stays the offer being quoted — the customer chose it, and
  // silently swapping it for a cheaper sibling would show a different card than
  // the one they tapped.
  return { key: `post:${postId}`, title, offers, best: post, pinnedPhotoId };
}

// Record a search that found nothing, so it lands in Ehsan's learning queue.
// Repeats bump a counter instead of piling up rows — the phrase five customers
// asked for should be the one he sees first.
export async function recordUnmatched(rawQuery) {
  const searchPhrase = normalize(rawQuery);
  if (!searchPhrase) return;

  const existing = await db.select().from(unmatched)
    .where(eq(unmatched.searchPhrase, searchPhrase)).get();

  if (existing) {
    await db.update(unmatched)
      .set({ hits: (existing.hits || 1) + 1, lastAt: now(), resolved: false })
      .where(eq(unmatched.id, existing.id))
      .run();
    return;
  }
  await db.insert(unmatched)
    .values({ phrase: String(rawQuery).slice(0, 120), searchPhrase, hits: 1, lastAt: now() })
    .run();
}
