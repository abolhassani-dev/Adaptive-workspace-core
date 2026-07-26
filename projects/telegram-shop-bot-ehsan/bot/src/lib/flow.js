import { db, api } from '../sdk.js';
import { eq } from '../db.js';
import { customers } from '../schema.js';
import { searchProducts, recordUnmatched } from './search.js';
import { sendProductCard, choiceKeyboard, mainMenu, contactRequestKeyboard } from './ui.js';
import {
  getCart, cartText, cartKeyboard, submitOrder, notifyAdminUnmatched, isAdmin,
  ordersFor, itemsFor,
} from './cart.js';
import { relativeDate } from './dates.js';
import { setSession, clearSession } from './session.js';
import { toPersianDigits } from './text.js';
import { logEvent } from './events.js';
import { showScreen, forgetScreen } from './screen.js';

/**
 * The bot shows nothing until a customer has shared their phone number.
 *
 * Ehsan's whole workflow is phoning people back, so a visitor without a number is
 * a lead he cannot act on. Asking at the door — one tap on Telegram's own share
 * button, no typing — costs the customer less than asking at checkout, and it
 * means every search in the report has a name attached to it.
 *
 * The admin is exempt: he has no reason to share a number with his own bot, and
 * gating him would lock him out of the panel.
 */
export async function ensurePhone(chatId, tgId) {
  if (await isAdmin(tgId)) return true;

  const customer = await db.select().from(customers).where(eq(customers.tgId, tgId)).get();
  if (customer?.phone) return true;

  await setSession(tgId, 'awaiting_entry_phone');
  await forgetScreen(tgId);
  await api.sendMessage({
    chat_id: chatId,
    text: [
      'برای استفاده از فروشگاه، لطفاً شماره تماس خود را ثبت کنید.',
      '',
      'با زدن دکمه‌ی زیر شماره‌تان خودکار فرستاده می‌شود — لازم نیست تایپ کنید.',
      'این شماره فقط برای تماس همکاران ما جهت تأیید سفارش استفاده می‌شود.',
    ].join('\n'),
    reply_markup: contactRequestKeyboard(),
  });
  return false;
}

// Shown once, right after the number is registered.
export async function welcome(chatId, tgId, text) {
  await clearSession(tgId);
  await logEvent(tgId, 'start');
  await api.sendMessage({
    chat_id: chatId,
    text,
    reply_markup: mainMenu(await isAdmin(tgId)),
  });
}

export async function showHome(chatId, tgId, text = 'چه کاری برایتان انجام دهم؟') {
  await clearSession(tgId);
  await showScreen(chatId, tgId, {
    text,
    reply_markup: {
      inline_keyboard: [
        [{ text: '🔍 استعلام کالا', callback_data: 'search' }],
        [{ text: '🛒 سبد خرید من', callback_data: 'cart' }],
        [{ text: '📋 سفارش‌های من', callback_data: 'myorders' }],
      ],
    },
  });
}

export async function askForSearch(chatId, tgId) {
  await setSession(tgId, 'awaiting_search');
  await showScreen(chatId, tgId, {
    text: '🔍 نام کالایی که می‌خواهید را بنویسید:',
    reply_markup: { inline_keyboard: [[{ text: '↩️ بازگشت', callback_data: 'home' }]] },
  });
}

/**
 * One search, one of four outcomes: exactly one product (send the card),
 * several (let the customer pick), or nothing — in which case the phrase is
 * still captured as a lead and queued for Ehsan to teach the bot.
 */
export async function runSearch(chatId, tgId, query) {
  const groups = await searchProducts(query);
  await logEvent(tgId, 'search', query, groups.length > 0);

  if (groups.length === 0) {
    await recordUnmatched(query);
    await notifyAdminUnmatched(query, tgId);
    await clearSession(tgId);
    await showScreen(chatId, tgId, {
      text: `«${query}» در لیست ما نبود؛ درخواست شما ثبت شد و همکاران ما بررسی می‌کنند.\n\nمی‌توانید کالای دیگری را جستجو کنید.`,
      reply_markup: {
        inline_keyboard: [
          [{ text: '🔍 جستجوی دیگر', callback_data: 'search' }],
          [{ text: '↩️ بازگشت', callback_data: 'home' }],
        ],
      },
    });
    return;
  }

  await clearSession(tgId);

  if (groups.length === 1) {
    await sendProductCard(chatId, tgId, groups[0]);
    return;
  }

  await showScreen(chatId, tgId, {
    text: 'چند مورد پیدا شد. کدام را می‌خواهید؟',
    reply_markup: choiceKeyboard(groups),
  });
}

export async function showCart(chatId, tgId) {
  const items = await getCart(tgId);
  await showScreen(chatId, tgId, {
    text: cartText(items),
    reply_markup: cartKeyboard(items),
  });
}

/**
 * Checkout. Name and phone are asked once, ever — a returning customer goes
 * straight from cart to confirmation, which is most of why this bot is usable
 * by people who will not fill in forms.
 */
export async function startCheckout(chatId, tgId) {
  const items = await getCart(tgId);
  if (items.length === 0) {
    await api.sendMessage({ chat_id: chatId, text: 'سبد خرید شما خالی است.' });
    return;
  }

  const customer = await db.select().from(customers).where(eq(customers.tgId, tgId)).get();
  if (customer?.name && customer?.phone) {
    await finishOrder(chatId, tgId, customer);
    return;
  }

  await setSession(tgId, 'awaiting_name');
  await showScreen(chatId, tgId, {
    text: 'برای ثبت سفارش، لطفاً نام و نام خانوادگی خود را بنویسید:',
    reply_markup: { inline_keyboard: [[{ text: '↩️ انصراف', callback_data: 'cart' }]] },
  });
}

export async function askForPhone(chatId, tgId) {
  await setSession(tgId, 'awaiting_phone');
  // Telegram's share-contact button only exists on a reply keyboard, and edits
  // cannot carry one — so this step is a genuine new message.
  await forgetScreen(tgId);
  await api.sendMessage({
    chat_id: chatId,
    text: 'حالا شماره تماس خود را بفرستید.\nبا زدن دکمه‌ی زیر، شماره‌تان خودکار ارسال می‌شود.',
    reply_markup: contactRequestKeyboard(),
  });
}

export async function finishOrder(chatId, tgId, customer) {
  const order = await submitOrder(tgId, customer);
  await clearSession(tgId);

  if (!order) {
    await api.sendMessage({ chat_id: chatId, text: 'سبد خرید شما خالی است.' });
    return;
  }

  await logEvent(tgId, 'order', `#${order.id}`);
  await showScreen(chatId, tgId, {
    text: `✅ سفارش شما با شماره #${toPersianDigits(order.id)} ثبت شد.\nهمکاران ما به‌زودی برای تأیید نهایی با شما تماس می‌گیرند.`,
    reply_markup: {
      inline_keyboard: [
        [{ text: '🔍 استعلام کالای دیگر', callback_data: 'search' }],
        [{ text: '↩️ بازگشت', callback_data: 'home' }],
      ],
    },
  });
}

export async function showMyOrders(chatId, tgId) {
  const rows = await ordersFor(tgId, 5);
  const back = {
    inline_keyboard: [
      [{ text: '🔍 استعلام کالا', callback_data: 'search' }],
      [{ text: '↩️ بازگشت', callback_data: 'home' }],
    ],
  };
  if (rows.length === 0) {
    await showScreen(chatId, tgId, { text: 'هنوز سفارشی ثبت نکرده‌اید.', reply_markup: back });
    return;
  }
  const label = {
    new: '🆕 ثبت شده',
    working: '🔄 در حال پیگیری',
    closed: '✅ انجام شد',
    cancelled: '❌ منتفی شد',
  };
  const lines = ['📋 سفارش‌های شما', ''];
  for (const o of rows) {
    lines.push(`#${toPersianDigits(o.id)} — ${label[o.status] || o.status} — ${relativeDate(o.createdAt)}`);
    for (const i of await itemsFor(o.id)) {
      lines.push(`   • ${i.title} — ${toPersianDigits(i.qty)} عدد`);
    }
    lines.push('');
  }
  await showScreen(chatId, tgId, { text: lines.join('\n'), reply_markup: back });
}

export async function saveCustomer(tgId, patch) {
  await db.insert(customers)
    .values({ tgId, ...patch })
    .onConflictDoUpdate({ target: customers.tgId, set: patch })
    .run();
  return db.select().from(customers).where(eq(customers.tgId, tgId)).get();
}
