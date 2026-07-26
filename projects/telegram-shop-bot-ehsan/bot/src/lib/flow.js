import { db, api } from '../sdk.js';
import { eq } from '../db.js';
import { customers } from '../schema.js';
import { searchProducts, recordUnmatched } from './search.js';
import { sendProductCard, choiceKeyboard, mainMenu, contactRequestKeyboard } from './ui.js';
import { getCart, cartText, cartKeyboard, submitOrder, notifyAdminUnmatched, isAdmin } from './cart.js';
import { setSession, clearSession } from './session.js';
import { toPersianDigits } from './text.js';

export async function showHome(chatId, tgId, text = 'چه کاری برایتان انجام دهم؟') {
  await clearSession(tgId);
  await api.sendMessage({
    chat_id: chatId,
    text,
    reply_markup: mainMenu(await isAdmin(tgId)),
  });
}

export async function askForSearch(chatId, tgId) {
  await setSession(tgId, 'awaiting_search');
  await api.sendMessage({
    chat_id: chatId,
    text: '🔍 نام کالایی که می‌خواهید را بنویسید:',
  });
}

/**
 * One search, one of four outcomes: exactly one product (send the card),
 * several (let the customer pick), or nothing — in which case the phrase is
 * still captured as a lead and queued for Ehsan to teach the bot.
 */
export async function runSearch(chatId, tgId, query) {
  const groups = await searchProducts(query);

  if (groups.length === 0) {
    await recordUnmatched(query);
    await notifyAdminUnmatched(query, tgId);
    await clearSession(tgId);
    await api.sendMessage({
      chat_id: chatId,
      text: 'این کالا در لیست ما نبود؛ درخواست شما ثبت شد و همکاران ما بررسی می‌کنند.\n\nمی‌توانید کالای دیگری را جستجو کنید.',
      reply_markup: mainMenu(await isAdmin(tgId)),
    });
    return;
  }

  await clearSession(tgId);

  if (groups.length === 1) {
    await sendProductCard(chatId, groups[0]);
    return;
  }

  await api.sendMessage({
    chat_id: chatId,
    text: 'چند مورد پیدا شد. کدام را می‌خواهید؟',
    reply_markup: choiceKeyboard(groups),
  });
}

export async function showCart(chatId, tgId) {
  const items = await getCart(tgId);
  await api.sendMessage({
    chat_id: chatId,
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
  await api.sendMessage({
    chat_id: chatId,
    text: 'برای ثبت سفارش، لطفاً نام و نام خانوادگی خود را بنویسید:',
  });
}

export async function askForPhone(chatId, tgId) {
  await setSession(tgId, 'awaiting_phone');
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

  await api.sendMessage({
    chat_id: chatId,
    text: `✅ سفارش شما با شماره #${toPersianDigits(order.id)} ثبت شد.\nهمکاران ما به‌زودی برای تأیید نهایی با شما تماس می‌گیرند.`,
    reply_markup: mainMenu(await isAdmin(tgId)),
  });
}

export async function saveCustomer(tgId, patch) {
  await db.insert(customers)
    .values({ tgId, ...patch })
    .onConflictDoUpdate({ target: customers.tgId, set: patch })
    .run();
  return db.select().from(customers).where(eq(customers.tgId, tgId)).get();
}
