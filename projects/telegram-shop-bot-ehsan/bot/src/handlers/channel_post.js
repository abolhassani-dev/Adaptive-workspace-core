import { indexPost, pruneOldPosts } from '../lib/catalog.js';

/**
 * Every post Ehsan forwards into his reference channel lands here. The bot is
 * admin there, so Telegram pushes these — nothing polls and nothing idles.
 *
 * Posts without a photo are still indexed: a text-only price update is perfectly
 * searchable, it just shows a card with no image.
 */
export default async function (post) {
  if (!post || !post.chat) return;

  // Albums arrive as several updates sharing one media_group_id; indexPost folds
  // them into a single product row.
  await indexPost(post);

  // Cheap enough to run inline, and it keeps stale prices from ever surfacing.
  // Roughly one post in twenty pays the cost.
  if ((post.message_id || 0) % 20 === 0) {
    await pruneOldPosts();
  }
}
