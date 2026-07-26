import { api } from 'sdk';
import { getSession, setSession, clearSession, setSetting } from 'lib/session';
import { isAdmin, getAdminId, ADMIN_KEY, addToCart } from 'lib/cart';
import { BTN, mainMenu } from 'lib/ui';
import {
  askForSearch, runSearch, showCart, startCheckout,
  askForPhone, finishOrder, saveCustomer,
} from 'lib/flow';
import { sendAdminMenu, createProduct, addAlias, findProducts } from 'lib/admin';
import { foldDigits, toPersianDigits, truncate } from 'lib/text';
import { ordersFor, itemsFor } from 'lib/cart';
import { relativeDate } from 'lib/dates';

const WELCOME = [
  'سلام 👋',
  'به فروشگاه لوازم قنادی خوش آمدید.',
  '',
  'برای دیدن قیمت و ثبت سفارش، دکمه‌ی «🔍 استعلام کالا» را بزنید',
  'یا همین‌جا نام کالایی که می‌خواهید را بنویسید.',
].join('\n');

export default async function (message) {
  const tgId = message.from?.id;
  const chatId = message.chat?.id;
  if (!tgId || !chatId) return;
  // The storefront is one-to-one. Group chats are not a supported surface and
  // answering in them would leak one customer's order to everyone present.
  if (message.chat.type !== 'private') return;

  const admin = await isAdmin(tgId);

  // Telegram's share-contact button — the whole reason a customer never types
  // their number. Only ever trust the contact the sender shared about themself.
  if (message.contact) {
    const session = await getSession(tgId);
    if (session.state === 'awaiting_phone') {
      if (message.contact.user_id && message.contact.user_id !== tgId) {
        await api.sendMessage({
          chat_id: chatId,
          text: 'لطفاً شماره‌ی خودتان را بفرستید.',
        });
        return;
      }
      const customer = await saveCustomer(tgId, { phone: foldDigits(message.contact.phone_number) });
      await finishOrder(chatId, tgId, customer);
      return;
    }
    return;
  }

  const text = (message.text || '').trim();
  if (!text) return;

  // ── commands ────────────────────────────────────────────────────────────
  if (text === '/start') {
    await clearSession(tgId);
    await api.sendMessage({ chat_id: chatId, text: WELCOME, reply_markup: mainMenu(admin) });
    return;
  }

  if (text === '/id') {
    await api.sendMessage({
      chat_id: chatId,
      text: `شناسه‌ی عددی شما: ${tgId}`,
    });
    return;
  }

  // One-time bootstrap: whoever runs this first becomes the admin, and only
  // while no admin exists. Run it immediately after deploying, before the bot
  // is given to anyone — see README.
  if (text === '/setadmin') {
    const existing = await getAdminId();
    if (existing === null) {
      await setSetting(ADMIN_KEY, tgId);
      await api.sendMessage({
        chat_id: chatId,
        text: '✅ شما به‌عنوان مدیر ثبت شدید.',
        reply_markup: mainMenu(true),
      });
      await sendAdminMenu(chatId);
    } else if (existing === tgId) {
      await sendAdminMenu(chatId);
    }
    return;
  }

  // ── main menu ───────────────────────────────────────────────────────────
  if (text === BTN.search) { await askForSearch(chatId, tgId); return; }
  if (text === BTN.cart) { await clearSession(tgId); await showCart(chatId, tgId); return; }
  if (text === BTN.orders) { await clearSession(tgId); await showMyOrders(chatId, tgId); return; }
  if (text === BTN.contact) {
    await clearSession(tgId);
    await api.sendMessage({
      chat_id: chatId,
      text: '☎️ برای هماهنگی، همکاران ما پس از ثبت سفارش با شما تماس می‌گیرند.\nاگر سوالی دارید همین‌جا بنویسید.',
    });
    return;
  }
  if (text === BTN.admin && admin) { await clearSession(tgId); await sendAdminMenu(chatId); return; }

  // ── stateful steps ──────────────────────────────────────────────────────
  const session = await getSession(tgId);
  const data = session.data || {};

  switch (session.state) {
    case 'awaiting_qty': {
      const qty = Number(foldDigits(text).replace(/[^\d]/g, ''));
      if (!Number.isFinite(qty) || qty < 1 || qty > 10000) {
        await api.sendMessage({ chat_id: chatId, text: 'لطفاً فقط تعداد را به عدد بنویسید. مثلاً: ۱۲' });
        return;
      }
      await addToCart(tgId, { id: data.postId, price: data.price ?? null }, data.title, qty);
      await clearSession(tgId);
      await api.sendMessage({
        chat_id: chatId,
        text: `✅ «${data.title}» — ${toPersianDigits(qty)} عدد به سبد خرید اضافه شد.`,
        reply_markup: {
          inline_keyboard: [
            [{ text: '🛒 مشاهده سبد خرید', callback_data: 'cart' }],
            [{ text: '🔍 استعلام جنس جدید', callback_data: 'search' }],
            [{ text: '↩️ بازگشت', callback_data: 'home' }],
          ],
        },
      });
      return;
    }

    case 'awaiting_name': {
      await saveCustomer(tgId, { name: truncate(text, 80) });
      await askForPhone(chatId, tgId);
      return;
    }

    case 'awaiting_phone': {
      const digits = foldDigits(text).replace(/[^\d+]/g, '');
      if (digits.replace(/\D/g, '').length < 10) {
        await api.sendMessage({
          chat_id: chatId,
          text: 'شماره درست وارد نشد. لطفاً دکمه‌ی «📱 ارسال شماره من» را بزنید یا شماره را کامل بنویسید.',
        });
        return;
      }
      const customer = await saveCustomer(tgId, { phone: digits });
      await finishOrder(chatId, tgId, customer);
      return;
    }

    case 'admin_product_name': {
      if (!admin) { await clearSession(tgId); return; }
      const product = await createProduct(text);
      await setSession(tgId, 'admin_alias', { productId: product.id, name: product.name });
      await api.sendMessage({
        chat_id: chatId,
        text: `✅ کالای «${product.name}» ثبت شد.\n\nحالا اسم‌های دیگری که این کالا در کانال‌ها دارد را یکی‌یکی بفرستید.\nوقتی تمام شد /done را بزنید.`,
      });
      return;
    }

    case 'admin_alias': {
      if (!admin) { await clearSession(tgId); return; }
      if (text === '/done') {
        await clearSession(tgId);
        await sendAdminMenu(chatId, '✅ ثبت اسم‌ها تمام شد.');
        return;
      }
      const linked = await addAlias(data.productId, text);
      await api.sendMessage({
        chat_id: chatId,
        text: `➕ «${text}» به‌عنوان اسم دیگرِ «${data.name}» ثبت شد.\n${toPersianDigits(linked)} پست با این اسم پیدا و وصل شد.\n\nاسم بعدی را بفرستید یا /done را بزنید.`,
      });
      return;
    }

    case 'admin_alias_pick': {
      if (!admin) { await clearSession(tgId); return; }
      const found = await findProducts(text);
      if (found.length === 0) {
        await api.sendMessage({
          chat_id: chatId,
          text: 'کالایی با این نام پیدا نشد. نام دیگری بنویسید، یا از بخش مدیریت این را به‌عنوان کالای جدید ثبت کنید.',
        });
        return;
      }
      await api.sendMessage({
        chat_id: chatId,
        text: `«${data.phrase}» اسم دیگرِ کدام کالاست؟`,
        reply_markup: {
          inline_keyboard: [
            ...found.map((p) => [{
              text: truncate(p.name, 60),
              callback_data: `uma:${data.unmatchedId}:${p.id}`,
            }]),
            [{ text: '↩️ بازگشت', callback_data: 'adm:unmatched' }],
          ],
        },
      });
      return;
    }

    default:
      break;
  }

  // ── anything else is a search ───────────────────────────────────────────
  // Customers type the product name straight into the chat far more often than
  // they tap a menu button first.
  await runSearch(chatId, tgId, text);
}

async function showMyOrders(chatId, tgId) {
  const rows = await ordersFor(tgId, 5);
  if (rows.length === 0) {
    await api.sendMessage({ chat_id: chatId, text: 'هنوز سفارشی ثبت نکرده‌اید.' });
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
    const items = await itemsFor(o.id);
    lines.push(`#${toPersianDigits(o.id)} — ${label[o.status] || o.status} — ${relativeDate(o.createdAt)}`);
    for (const i of items) {
      lines.push(`   • ${i.title} — ${toPersianDigits(i.qty)} عدد`);
    }
    lines.push('');
  }
  await api.sendMessage({ chat_id: chatId, text: lines.join('\n') });
}
