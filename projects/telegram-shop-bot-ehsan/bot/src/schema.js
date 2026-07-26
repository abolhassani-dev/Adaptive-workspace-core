import { table, integer, text, boolean, json, index, sql } from './db.js';

// All timestamps are plain unix seconds (integers), never Date objects — keeps
// comparisons with Telegram's `date` field direct and avoids conversion surprises.

// One row per indexed post from Ehsan's reference channel.
// An album (several photos, one product) is ONE row: extra photos append to `photoIds`.
export const posts = table('posts', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  messageId: integer('message_id').notNull(),
  chatId: integer('chat_id').notNull(),
  mediaGroupId: text('media_group_id'),
  caption: text('caption').default(''),
  // normalized, lowercased, digit-folded text used for searching
  searchText: text('search_text').default(''),
  // first line of the caption, sanitized — the product name we show
  title: text('title').default(''),
  // caption minus title, price lines and any supplier contact info
  description: text('description').default(''),
  photoIds: json('photo_ids'),
  price: integer('price'),
  // From the posting template: line 3 and line 4. Shown as their own labelled
  // rows on the product card rather than buried in the description.
  material: text('material'),
  pack: text('pack'),
  // original channel name, when the post was forwarded. Best-effort: may be null
  // for hand-posted items, which is fine — notifications always link to the post.
  supplier: text('supplier'),
  productId: integer('product_id'),
  postedAt: integer('posted_at').notNull(),
  active: boolean('active').default(true),
}, (t) => ({
  groupIdx: index('idx_posts_group').on(t.mediaGroupId),
  msgIdx: index('idx_posts_msg').on(t.messageId),
  productIdx: index('idx_posts_product').on(t.productId),
  postedIdx: index('idx_posts_posted').on(t.postedAt),
}));

// Canonical products. Empty on day one — the bot works without them (raw text
// search) and this table grows from the unmatched-search queue, one tap at a time.
export const products = table('products', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  name: text('name').notNull(),
  searchName: text('search_name').notNull(),
  photoId: text('photo_id'),
  createdAt: integer('created_at').default(sql`(unixepoch())`),
});

// The many names one product goes by across different shops.
export const aliases = table('aliases', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  productId: integer('product_id').notNull(),
  alias: text('alias').notNull(),
  createdAt: integer('created_at').default(sql`(unixepoch())`),
}, (t) => ({
  productIdx: index('idx_aliases_product').on(t.productId),
  aliasIdx: index('idx_aliases_alias').on(t.alias),
}));

export const customers = table('customers', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  tgId: integer('tg_id').notNull().unique(),
  name: text('name'),
  phone: text('phone'),
  createdAt: integer('created_at').default(sql`(unixepoch())`),
});

// Cart lines live per telegram user until the order is submitted.
export const cartItems = table('cart_items', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  tgId: integer('tg_id').notNull(),
  postId: integer('post_id'),
  title: text('title').notNull(),
  qty: integer('qty').notNull(),
  unitPrice: integer('unit_price'),
  addedAt: integer('added_at').default(sql`(unixepoch())`),
}, (t) => ({
  ownerIdx: index('idx_cart_owner').on(t.tgId),
}));

// status: 'new' | 'working' | 'closed'  — exactly three, each one tap for Ehsan.
export const orders = table('orders', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  tgId: integer('tg_id').notNull(),
  customerName: text('customer_name'),
  customerPhone: text('customer_phone'),
  status: text('status').default('new'),
  total: integer('total'),
  createdAt: integer('created_at').default(sql`(unixepoch())`),
}, (t) => ({
  statusIdx: index('idx_orders_status').on(t.status),
}));

export const orderItems = table('order_items', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  orderId: integer('order_id').notNull(),
  title: text('title').notNull(),
  qty: integer('qty').notNull(),
  unitPrice: integer('unit_price'),
  supplier: text('supplier'),
  postMessageId: integer('post_message_id'),
  postedAt: integer('posted_at'),
}, (t) => ({
  orderIdx: index('idx_order_items_order').on(t.orderId),
}));

// The learning loop: searches that found nothing or looked ambiguous.
export const unmatched = table('unmatched', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  phrase: text('phrase').notNull(),
  searchPhrase: text('search_phrase').notNull(),
  hits: integer('hits').default(1),
  resolved: boolean('resolved').default(false),
  lastAt: integer('last_at').default(sql`(unixepoch())`),
}, (t) => ({
  resolvedIdx: index('idx_unmatched_resolved').on(t.resolved),
}));

// Conversation state. One row per telegram user.
export const sessions = table('sessions', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  tgId: integer('tg_id').notNull().unique(),
  state: text('state').default('idle'),
  data: json('data'),
  // The one message the bot keeps rewriting instead of posting a new one each
  // step. `screenKind` records whether it currently holds a photo or plain text,
  // because Telegram cannot convert one into the other by editing.
  screenId: integer('screen_id'),
  screenKind: text('screen_kind'),
  updatedAt: integer('updated_at').default(sql`(unixepoch())`),
});

// Customer footprints. Deliberately coarse: who appeared, what they searched,
// what they ordered — enough for Ehsan to see demand, without logging every tap.
// kind: 'start' | 'search' | 'order'
export const events = table('events', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  tgId: integer('tg_id').notNull(),
  kind: text('kind').notNull(),
  detail: text('detail'),
  // for a search: did it match anything? null for other kinds
  found: boolean('found'),
  createdAt: integer('created_at').default(sql`(unixepoch())`),
}, (t) => ({
  createdIdx: index('idx_events_created').on(t.createdAt),
  ownerIdx: index('idx_events_owner').on(t.tgId),
}));

// Small key/value store for runtime settings (e.g. the admin's telegram id,
// so it never has to be hard-coded or committed).
export const settings = table('settings', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  key: text('key').notNull().unique(),
  value: text('value'),
});
