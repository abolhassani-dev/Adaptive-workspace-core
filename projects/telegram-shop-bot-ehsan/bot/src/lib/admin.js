import { db } from '../sdk.js';
import { eq, ne, and, desc, like, count, gte, inArray } from '../db.js';
import {
  products, aliases, unmatched, posts, events, customers, orders, orderItems,
  cartItems, sessions,
} from '../schema.js';
import { showScreen } from './screen.js';
import { now, DAY } from './config.js';
import { normalize, toPersianDigits, truncate } from './text.js';
import { relativeDate } from './dates.js';
import { relinkPosts } from './catalog.js';
import { recentOrders, itemsFor } from './cart.js';
import { formatPriceShort } from './price.js';

export const adminMenu = () => ({
  inline_keyboard: [
    [{ text: '➕ افزودن کالا / اسم‌های دیگر', callback_data: 'adm:addproduct' }],
    [{ text: '📥 جستجوهای بی‌نتیجه', callback_data: 'adm:unmatched' }],
    [{ text: '📈 گزارش مشتری‌ها', callback_data: 'rep:1' }],
    [{ text: '📊 سفارش‌ها', callback_data: 'adm:orders' }],
    [{ text: '🗑 حذف یک محصول', callback_data: 'adm:delprod' }],
    [{ text: '🧹 پاک‌سازی حافظه', callback_data: 'adm:reset' }],
  ],
});

/**
 * Cleanup, because **Telegram never tells a bot that a channel post was deleted.**
 * Only new posts arrive, so the index cannot notice a removal on its own and a
 * product Ehsan took down would keep being offered. This is the only way to take
 * something out of the bot's memory, so it lives in the panel rather than in a
 * database console he cannot use.
 */
/**
 * Removing one product. Needed because Telegram never reports a deleted channel
 * post, so a product Ehsan stops selling would otherwise keep being offered and
 * the only remedy was clearing the whole catalogue.
 *
 * Deletion works on the whole offer group, not the single post that was tapped:
 * a product Ehsan re-posted three times has three rows, and removing only the
 * newest would resurrect the previous price the next time a customer searched.
 */
export function deleteProductPrompt() {
  return {
    text: [
      '🗑 حذف یک محصول',
      '',
      'نام محصولی که می‌خواهید از حافظه‌ی بات برداشته شود را بنویسید:',
      '',
      'همه‌ی پست‌های آن محصول پاک می‌شوند، وگرنه پست قدیمی‌ترش دوباره ظاهر می‌شود.',
      'اسم‌های تعریف‌شده باقی می‌مانند تا اگر بعداً دوباره پستش گذاشتید کار کنند.',
    ].join('\n'),
    reply_markup: { inline_keyboard: [[{ text: '↩️ بازگشت', callback_data: 'adm:menu' }]] },
  };
}

export function deleteCandidates(groups) {
  return {
    text: 'کدام را حذف کنم؟',
    reply_markup: {
      inline_keyboard: [
        ...groups.map((g) => [{
          text: truncate(`${g.title} (${toPersianDigits(g.offers.length)} پست)`, 60),
          callback_data: `dp:${g.best.id}`,
        }]),
        [{ text: '↩️ بازگشت', callback_data: 'adm:menu' }],
      ],
    },
  };
}

export function confirmDelete(group) {
  return {
    text: [
      `🗑 حذف «${group.title}»`,
      '',
      `${toPersianDigits(group.offers.length)} پست این محصول از حافظه‌ی بات پاک می‌شود.`,
      'پست‌های خود کانال دست نمی‌خورند — اگر آن‌ها را هم نمی‌خواهید، جداگانه پاکشان کنید.',
      '',
      'این کار برگشت‌پذیر نیست.',
    ].join('\n'),
    reply_markup: {
      inline_keyboard: [
        [{ text: '✅ بله، حذف کن', callback_data: `dpy:${group.best.id}` }],
        [{ text: '↩️ انصراف', callback_data: 'adm:menu' }],
      ],
    },
  };
}

export async function deleteGroup(group) {
  const ids = group.offers.map((o) => o.id);
  if (ids.length === 0) return 0;
  await db.delete(posts).where(inArray(posts.id, ids)).run();
  return ids.length;
}

export async function resetMenu() {
  const counted = await db.select({ n: count() }).from(posts).get();
  return {
    text: [
      '🧹 پاک‌سازی حافظه',
      '',
      `الان ${toPersianDigits(counted?.n ?? 0)} پست در حافظه‌ی بات است.`,
      '',
      'تلگرام حذف شدن پست‌های کانال را به بات خبر نمی‌دهد، پس اگر پستی را از کانال',
      'پاک کردید، از این‌جا حافظه را هم پاک کنید و دوباره پست بگذارید.',
    ].join('\n'),
    reply_markup: {
      inline_keyboard: [
        [{ text: '🗑 پاک کردن محصولات', callback_data: 'rst:posts' }],
        [{ text: '♻️ ریست کامل (برای تست)', callback_data: 'rst:all' }],
        [{ text: '↩️ بازگشت', callback_data: 'adm:menu' }],
      ],
    },
  };
}

export function confirmReset(kind) {
  const what = kind === 'all'
    ? [
        '♻️ ریست کامل',
        '',
        'همه‌ی این‌ها پاک می‌شوند:',
        '· محصولات و پست‌ها',
        '· اسم‌های تعریف‌شده',
        '· مشتری‌ها و شماره‌هایشان',
        '· سفارش‌ها و سبدهای خرید',
        '· گزارش‌ها و جستجوهای بی‌نتیجه',
        '',
        'مدیر بودن شما باقی می‌ماند. این کار برگشت‌پذیر نیست.',
      ]
    : [
        '🗑 پاک کردن محصولات',
        '',
        'همه‌ی پست‌های کانال از حافظه‌ی بات پاک می‌شوند.',
        'مشتری‌ها، سفارش‌ها و اسم‌های تعریف‌شده دست نمی‌خورند.',
        '',
        'این کار برگشت‌پذیر نیست.',
      ];
  return {
    text: what.join('\n'),
    reply_markup: {
      inline_keyboard: [
        [{ text: '✅ بله، پاک کن', callback_data: `rst:${kind}:yes` }],
        [{ text: '↩️ انصراف', callback_data: 'adm:reset' }],
      ],
    },
  };
}

export async function runReset(kind, adminTgId) {
  const before = await db.select({ n: count() }).from(posts).get();
  await db.delete(posts).run();

  if (kind === 'all') {
    await db.delete(products).run();
    await db.delete(aliases).run();
    await db.delete(unmatched).run();
    await db.delete(cartItems).run();
    await db.delete(orderItems).run();
    await db.delete(orders).run();
    await db.delete(events).run();
    await db.delete(customers).run();
    // Keep the admin's own session so the panel he is looking at survives; the
    // `settings` row holding his id is never touched, so he stays admin.
    await db.delete(sessions).where(ne(sessions.tgId, adminTgId)).run();
  }
  return before?.n ?? 0;
}

export async function createProduct(name) {
  const inserted = await db.insert(products)
    .values({ name: truncate(name, 120), searchName: normalize(name) })
    .returning();
  const product = inserted[0];
  await relinkPosts(product.id);
  return product;
}

export async function addAlias(productId, aliasText) {
  const alias = normalize(aliasText);
  if (!alias) return 0;

  const existing = await db.select().from(aliases)
    .where(and(eq(aliases.productId, productId), eq(aliases.alias, alias)))
    .get();
  if (!existing) {
    await db.insert(aliases).values({ productId, alias }).run();
  }
  // Re-link immediately: an alias that only affected future posts would miss the
  // very posts that prompted Ehsan to add it.
  return relinkPosts(productId);
}

/**
 * The names screen for one product: what it already answers to, and an invitation
 * to add another.
 *
 * Replaces a flow that always created a **new** product and ended with the admin
 * typing `/done`. Both were wrong for this user: typing a slash command is not
 * something to ask of someone whose only skill is Telegram, and always creating
 * meant a second visit to the same product silently produced a duplicate that
 * split its posts across two entries.
 */
export async function aliasScreen(productId, note = '') {
  const product = await db.select().from(products).where(eq(products.id, productId)).get();
  if (!product) return { text: 'این کالا پیدا نشد.', reply_markup: backOnly() };

  const rows = await db.select().from(aliases)
    .where(eq(aliases.productId, productId)).orderBy(aliases.id).all();
  const linked = await db.select({ n: count() }).from(posts)
    .where(and(eq(posts.active, true), eq(posts.productId, productId))).get();

  const lines = [];
  if (note) lines.push(note, '');
  lines.push(`🏷 اسم‌های «${product.name}»`, '');
  if (rows.length === 0) {
    lines.push('هنوز اسم دیگری ثبت نشده.');
  } else {
    // Aliases are stored normalized, which folds digits to Latin for matching.
    // Render them back so Ehsan reads «کاسه ۸.۵», not «کاسه 8.5».
    rows.forEach((a, i) => lines.push(`${toPersianDigits(i + 1)}. ${toPersianDigits(a.alias)}`));
  }
  lines.push('', `📦 ${toPersianDigits(linked?.n ?? 0)} پست به این کالا وصل است.`);
  lines.push('', 'اسم دیگری که مشتری‌ها این کالا را با آن صدا می‌کنند بنویسید.');

  return {
    text: lines.join('\n'),
    reply_markup: {
      inline_keyboard: [
        [{ text: '✅ تمام شد', callback_data: 'alias:done' }],
        ...(rows.length > 0
          ? [[{ text: '🗑 حذف آخرین اسم', callback_data: `alias:del:${productId}` }]]
          : []),
      ],
    },
  };
}

export async function removeLastAlias(productId) {
  const last = await db.select().from(aliases)
    .where(eq(aliases.productId, productId)).orderBy(desc(aliases.id)).get();
  if (!last) return null;
  await db.delete(aliases).where(eq(aliases.id, last.id)).run();
  return last.alias;
}

// Offered when the typed name already matches something, so a second visit adds
// names to the existing product instead of creating a rival copy of it.
export function productChoice(name, matches) {
  return {
    text: [
      `«${name}»`,
      '',
      'این کالا از قبل ثبت شده. اسم‌های تازه را به کدام اضافه کنم؟',
    ].join('\n'),
    reply_markup: {
      inline_keyboard: [
        ...matches.map((p) => [{ text: truncate(`🏷 ${p.name}`, 60), callback_data: `apick:${p.id}` }]),
        [{ text: '🆕 نه، یک کالای جدید است', callback_data: 'anew' }],
        [{ text: '↩️ بازگشت', callback_data: 'adm:menu' }],
      ],
    },
  };
}

export const findProducts = (query, limit = 5) =>
  db.select().from(products)
    .where(like(products.searchName, `%${normalize(query)}%`))
    .limit(limit)
    .all();

export const pendingUnmatched = (limit = 10) =>
  db.select().from(unmatched)
    .where(eq(unmatched.resolved, false))
    .orderBy(desc(unmatched.hits), desc(unmatched.lastAt))
    .limit(limit)
    .all();

export async function unmatchedList() {
  const rows = await pendingUnmatched();
  if (rows.length === 0) {
    return { text: '📥 جستجوی بی‌نتیجه‌ای در انتظار نیست.', reply_markup: backOnly() };
  }
  const text = [
    '📥 جستجوهایی که مشتری‌ها زدند و پیدا نشد:',
    '',
    'روی هرکدام بزنید تا به یک کالا وصلش کنید.',
  ].join('\n');

  return {
    text,
    reply_markup: {
      inline_keyboard: [
        ...rows.map((r) => [{
          text: truncate(`${r.phrase} (${toPersianDigits(r.hits)} بار)`, 60),
          callback_data: `um:${r.id}`,
        }]),
        [{ text: '↩️ بازگشت', callback_data: 'adm:menu' }],
      ],
    },
  };
}

export const backOnly = () => ({
  inline_keyboard: [[{ text: '↩️ بازگشت', callback_data: 'adm:menu' }]],
});

export function unmatchedActions(row) {
  return {
    text: `«${row.phrase}»\n\n${toPersianDigits(row.hits)} بار جستجو شده.\nمی‌خواهید چه کار کنیم؟`,
    reply_markup: {
      inline_keyboard: [
        [{ text: '🔗 اسم دیگرِ یک کالای موجود است', callback_data: `uml:${row.id}` }],
        [{ text: '🆕 یک کالای جدید است', callback_data: `umn:${row.id}` }],
        [{ text: '🚫 نادیده بگیر', callback_data: `umi:${row.id}` }],
        [{ text: '↩️ بازگشت', callback_data: 'adm:unmatched' }],
      ],
    },
  };
}

export const resolveUnmatched = (id) =>
  db.update(unmatched).set({ resolved: true }).where(eq(unmatched.id, id)).run();

export async function ordersSummary() {
  const rows = await recentOrders(10);
  if (rows.length === 0) {
    return { text: '📊 هنوز سفارشی ثبت نشده.', reply_markup: backOnly() };
  }

  const label = { new: '🆕 جدید', working: '🔄 در حال پیگیری', closed: '✅ انجام شد', cancelled: '❌ منتفی' };
  const lines = ['📊 آخرین سفارش‌ها', ''];
  for (const o of rows) {
    const items = await itemsFor(o.id);
    const names = items.map((i) => `${i.title} ×${toPersianDigits(i.qty)}`).join('، ');
    lines.push(`#${toPersianDigits(o.id)} — ${label[o.status] || o.status} — ${relativeDate(o.createdAt)}`);
    lines.push(`   ${o.customerName || '—'} ${o.customerPhone || ''}`);
    lines.push(`   ${truncate(names, 90)}`);
    if (o.total) lines.push(`   جمع تقریبی: ${formatPriceShort(o.total)}`);
    lines.push('');
  }
  return { text: lines.join('\n'), reply_markup: backOnly() };
}

// Daily-ish liveness signal. If Ehsan stops forwarding, the index quietly ages
// into wrong prices — so silence has to be visible rather than assumed fine.
export async function indexHealth() {
  const counted = await db.select({ n: count() }).from(posts)
    .where(eq(posts.active, true)).get();
  const total = counted?.n ?? 0;
  const recent = await db.select().from(posts)
    .where(eq(posts.active, true))
    .orderBy(desc(posts.postedAt))
    .limit(1)
    .get();

  const last = recent ? relativeDate(recent.postedAt) : 'هیچ‌وقت';
  return `📦 ${toPersianDigits(total)} پست فعال در حافظه بات.\n🕒 آخرین پست: ${last}`;
}

export async function sendAdminMenu(chatId, extra = '', tgId = chatId) {
  const health = await indexHealth();
  await showScreen(chatId, tgId, {
    text: `${extra ? `${extra}\n\n` : ''}🛠 بخش مدیریت\n\n${health}`,
    reply_markup: adminMenu(),
  });
}

const WINDOWS = { 1: '۲۴ ساعت گذشته', 7: '۷ روز گذشته', 30: '۳۰ روز گذشته' };

const windowButtons = (active) => [
  Object.keys(WINDOWS).map((d) => ({
    text: `${Number(d) === active ? '• ' : ''}${WINDOWS[d]}`,
    callback_data: `rep:${d}`,
  })),
];

/**
 * The footprint report: who came in, what they asked for, what they ordered.
 *
 * Windows are rolling (last N days), not calendar days — a calendar "today"
 * needs a timezone, and getting that wrong silently reports the wrong day.
 * The labels say «گذشته» so the number always matches what is counted.
 */
export async function reportView(days = 1) {
  const cutoff = now() - days * DAY;

  const rows = await db.select().from(events)
    .where(gte(events.createdAt, cutoff))
    .orderBy(desc(events.id))
    .all();

  const searches = rows.filter((r) => r.kind === 'search');
  const visitors = new Set(rows.map((r) => r.tgId));
  const orderCount = rows.filter((r) => r.kind === 'order').length;
  const misses = searches.filter((r) => !r.found).length;

  const fresh = await db.select().from(customers)
    .where(gte(customers.createdAt, cutoff)).all();

  const ids = [...visitors];
  const people = ids.length > 0
    ? await db.select().from(customers).where(inArray(customers.tgId, ids)).all()
    : [];
  const nameOf = new Map(people.map((c) => [c.tgId, c.name || c.phone || 'بدون نام']));

  const lines = [`📈 گزارش — ${WINDOWS[days] || `${toPersianDigits(days)} روز گذشته`}`, ''];
  lines.push(`👥 ${toPersianDigits(visitors.size)} مشتری فعال (${toPersianDigits(fresh.length)} نفر جدید)`);
  lines.push(`🔍 ${toPersianDigits(searches.length)} استعلام` +
    (misses > 0 ? ` — ${toPersianDigits(misses)} مورد پیدا نشد` : ''));
  lines.push(`🛒 ${toPersianDigits(orderCount)} سفارش`);

  if (searches.length > 0) {
    lines.push('', 'آخرین استعلام‌ها:');
    for (const s of searches.slice(0, 12)) {
      const who = nameOf.get(s.tgId) || 'ناشناس';
      lines.push(`${s.found ? '✅' : '❌'} ${truncate(s.detail || '', 30)} — ${truncate(who, 22)} (${relativeDate(s.createdAt)})`);
    }
  } else {
    lines.push('', 'در این بازه استعلامی ثبت نشده.');
  }

  return {
    text: lines.join('\n'),
    reply_markup: {
      inline_keyboard: [
        ...windowButtons(days),
        [{ text: '👥 فهرست مشتری‌ها', callback_data: 'rep:people' }],
        [{ text: '↩️ بازگشت', callback_data: 'adm:menu' }],
      ],
    },
  };
}

// Every customer who ever registered, most recent first, with what they did.
export async function peopleView() {
  const people = await db.select().from(customers).orderBy(desc(customers.id)).limit(15).all();
  if (people.length === 0) {
    return { text: '👥 هنوز مشتری‌ای ثبت نشده.', reply_markup: backOnly() };
  }

  const ids = people.map((c) => c.tgId);
  const rows = await db.select().from(events).where(inArray(events.tgId, ids)).all();
  const orderRows = await db.select().from(orders).where(inArray(orders.tgId, ids)).all();

  const lines = ['👥 مشتری‌ها', ''];
  for (const c of people) {
    const mine = rows.filter((r) => r.tgId === c.tgId);
    const s = mine.filter((r) => r.kind === 'search').length;
    const o = orderRows.filter((r) => r.tgId === c.tgId).length;
    const last = mine.length > 0 ? Math.max(...mine.map((r) => r.createdAt)) : c.createdAt;
    lines.push(`${c.name || 'بدون نام'} — ${c.phone || '—'}`);
    lines.push(`   ${toPersianDigits(s)} استعلام · ${toPersianDigits(o)} سفارش · آخرین بازدید ${relativeDate(last)}`);
  }
  return {
    text: lines.join('\n'),
    reply_markup: {
      inline_keyboard: [
        [{ text: '📈 بازگشت به گزارش', callback_data: 'rep:1' }],
        [{ text: '↩️ بخش مدیریت', callback_data: 'adm:menu' }],
      ],
    },
  };
}
