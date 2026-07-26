import { db } from '../sdk.js';
import { eq, and, desc, like, count, gte, inArray } from '../db.js';
import { products, aliases, unmatched, posts, events, customers, orders } from '../schema.js';
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
  ],
});

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
