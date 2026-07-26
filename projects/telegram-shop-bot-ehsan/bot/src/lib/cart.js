import { db, api } from '../sdk.js';
import { eq, and, desc } from '../db.js';
import { cartItems, orders, orderItems, customers } from '../schema.js';
import { getGroupForPost, isFresh } from './search.js';
import { formatPrice, formatPriceShort } from './price.js';
import { relativeDate } from './dates.js';
import { postLink } from './ui.js';
import { toPersianDigits, truncate } from './text.js';
import { now } from './config.js';
import { getSetting } from './session.js';

export const ADMIN_KEY = 'admin_tg_id';

export async function getAdminId() {
  const v = await getSetting(ADMIN_KEY);
  return v ? Number(v) : null;
}

export async function isAdmin(tgId) {
  const admin = await getAdminId();
  return admin !== null && admin === tgId;
}

export async function addToCart(tgId, post, title, qty) {
  await db.insert(cartItems).values({
    tgId,
    postId: post.id,
    title: truncate(title || post.title || 'کالا', 120),
    qty,
    unitPrice: post.price,
    addedAt: now(),
  }).run();
}

export const getCart = (tgId) =>
  db.select().from(cartItems).where(eq(cartItems.tgId, tgId)).all();

export const clearCart = (tgId) =>
  db.delete(cartItems).where(eq(cartItems.tgId, tgId)).run();

export const removeCartItem = (id, tgId) =>
  db.delete(cartItems).where(and(eq(cartItems.id, id), eq(cartItems.tgId, tgId))).run();

// Only priced lines contribute. A cart of entirely unpriced items shows no
// total at all rather than a misleading zero.
export function cartTotal(items) {
  const priced = items.filter((i) => i.unitPrice !== null && i.unitPrice !== undefined);
  if (priced.length === 0) return null;
  return priced.reduce((sum, i) => sum + i.unitPrice * i.qty, 0);
}

export function cartText(items) {
  if (items.length === 0) return '🛒 سبد خرید شما خالی است.';

  const lines = ['🛒 سبد خرید شما', ''];
  items.forEach((item, idx) => {
    const qty = toPersianDigits(item.qty);
    const line = item.unitPrice !== null && item.unitPrice !== undefined
      ? `${toPersianDigits(idx + 1)}. ${item.title} — ${qty} عدد — ${formatPriceShort(item.unitPrice * item.qty)}`
      : `${toPersianDigits(idx + 1)}. ${item.title} — ${qty} عدد — نیاز به استعلام`;
    lines.push(line);
  });

  const total = cartTotal(items);
  lines.push('────────────────');
  if (total !== null) {
    lines.push(`جمع تقریبی: ${formatPrice(total)}`);
    const anyUnpriced = items.some((i) => i.unitPrice === null || i.unitPrice === undefined);
    if (anyUnpriced) lines.push('(بدون کالاهای نیازمند استعلام)');
  } else {
    lines.push('جمع: پس از استعلام اعلام می‌شود');
  }
  // Ehsan confirms every price by phone. A total that looks binding is an
  // argument he has to win later, so it is labelled before it is ever sent.
  lines.push('قیمت نهایی پس از تماس همکاران ما تأیید می‌شود.');
  return lines.join('\n');
}

export function cartKeyboard(items) {
  const rows = [];
  if (items.length > 0) {
    rows.push([{ text: '✅ ثبت سفارش', callback_data: 'checkout' }]);
    // Two delete buttons per row — any more and the titles are unreadable on a phone.
    const shown = items.slice(0, 8);
    for (let i = 0; i < shown.length; i += 2) {
      rows.push(shown.slice(i, i + 2).map((it) => ({
        text: `🗑 ${truncate(it.title, 18)}`,
        callback_data: `del:${it.id}`,
      })));
    }
  }
  rows.push([{ text: '➕ افزودن کالا', callback_data: 'search' }]);
  rows.push([{ text: '↩️ بازگشت', callback_data: 'home' }]);
  return { inline_keyboard: rows };
}

/**
 * Turn the cart into an order and tell Ehsan. Prices are snapshotted onto the
 * order lines: the index keeps moving as new posts arrive, and an order has to
 * record what the customer was actually quoted.
 */
export async function submitOrder(tgId, customer) {
  const items = await getCart(tgId);
  if (items.length === 0) return null;

  const total = cartTotal(items);
  const inserted = await db.insert(orders).values({
    tgId,
    customerName: customer.name,
    customerPhone: customer.phone,
    status: 'new',
    total,
    createdAt: now(),
  }).returning();

  const order = inserted[0];

  const detailed = [];
  for (const item of items) {
    const group = item.postId ? await getGroupForPost(item.postId) : null;
    const post = group?.best || null;

    await db.insert(orderItems).values({
      orderId: order.id,
      title: item.title,
      qty: item.qty,
      unitPrice: item.unitPrice,
      supplier: post?.supplier || null,
      postMessageId: post?.messageId || null,
      postedAt: post?.postedAt || null,
    }).run();

    detailed.push({ item, post });
  }

  await clearCart(tgId);
  await notifyAdmin(order, detailed);
  return order;
}

function orderText(order, detailed) {
  const lines = [
    `🔔 سفارش جدید #${toPersianDigits(order.id)}`,
    `👤 ${order.customerName || '—'} — ${order.customerPhone || '—'}`,
    '',
  ];

  detailed.forEach(({ item, post }, idx) => {
    lines.push(`${toPersianDigits(idx + 1)}. ${item.title} — ${toPersianDigits(item.qty)} عدد`);
    if (item.unitPrice !== null && item.unitPrice !== undefined) {
      const supplier = post?.supplier ? ` — ${post.supplier}` : '';
      const when = post?.postedAt ? ` (${relativeDate(post.postedAt)})` : '';
      const stale = post && !isFresh(post.postedAt) ? ' ⚠️ قیمت قدیمی' : '';
      lines.push(`   💰 ${formatPriceShort(item.unitPrice)}${supplier}${when}${stale}`);
    } else {
      lines.push('   💰 نیاز به استعلام');
    }
  });

  if (order.total !== null && order.total !== undefined) {
    lines.push('', `جمع تقریبی: ${formatPrice(order.total)}`);
  }
  return lines.join('\n');
}

function orderKeyboard(order, detailed) {
  const rows = [];
  const links = detailed
    .filter((d) => d.post?.messageId)
    .slice(0, 4)
    .map((d, i) => {
      const url = postLink(d.post.chatId, d.post.messageId);
      return url ? { text: `↗️ پست ${toPersianDigits(i + 1)}`, url } : null;
    })
    .filter(Boolean);

  if (links.length > 0) rows.push(links);
  rows.push([
    { text: '🔄 در حال پیگیری', callback_data: `ord:working:${order.id}` },
    { text: '✅ انجام شد', callback_data: `ord:closed:${order.id}` },
  ]);
  rows.push([{ text: '❌ منتفی شد', callback_data: `ord:cancelled:${order.id}` }]);
  return { inline_keyboard: rows };
}

export async function notifyAdmin(order, detailed) {
  const adminId = await getAdminId();
  if (!adminId) return;
  await api.sendMessage({
    chat_id: adminId,
    text: orderText(order, detailed),
    reply_markup: orderKeyboard(order, detailed),
  });
}

// A search nobody could answer is still a lead — Ehsan may well be able to
// source it by phone, so he hears about it immediately rather than at review time.
export async function notifyAdminUnmatched(phrase, tgId) {
  const adminId = await getAdminId();
  if (!adminId) return;
  const customer = await db.select().from(customers).where(eq(customers.tgId, tgId)).get();
  const who = customer?.name
    ? `${customer.name} — ${customer.phone || ''}`
    : 'مشتری (هنوز مشخصات ثبت نکرده)';
  await api.sendMessage({
    chat_id: adminId,
    text: `🔎 جستجوی بی‌نتیجه\n«${phrase}»\n${who}\n\nدر بخش «جستجوهای بی‌نتیجه» می‌توانید این را به یک کالا وصل کنید.`,
  });
}

export const recentOrders = (limit = 10) =>
  db.select().from(orders).orderBy(desc(orders.id)).limit(limit).all();

export const ordersFor = (tgId, limit = 10) =>
  db.select().from(orders).where(eq(orders.tgId, tgId)).orderBy(desc(orders.id)).limit(limit).all();

export const itemsFor = (orderId) =>
  db.select().from(orderItems).where(eq(orderItems.orderId, orderId)).all();
