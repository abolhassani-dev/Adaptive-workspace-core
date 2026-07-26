import { api } from '../sdk.js';
import { getSession, setSession, clearSession, setSetting } from '../lib/session.js';
import { isAdmin, getAdminId, ADMIN_KEY, addToCart } from '../lib/cart.js';
import { BTN, mainMenu } from '../lib/ui.js';
import {
  askForSearch, runSearch, showCart, startCheckout, showMyOrders,
  askForPhone, finishOrder, saveCustomer, ensurePhone, welcome,
} from '../lib/flow.js';
import {
  sendAdminMenu, createProduct, addAlias, findProducts, deleteCandidates,
  aliasScreen, productChoice,
} from '../lib/admin.js';
import { searchProducts } from '../lib/search.js';
import { foldDigits, toPersianDigits, truncate, normalizePhone } from '../lib/text.js';
import { showScreen, setScreenMode } from '../lib/screen.js';

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

  // The customer just typed, so their message is the last thing in the chat: any
  // reply has to be a new message at the bottom, not an edit further up.
  setScreenMode('fresh');

  const admin = await isAdmin(tgId);

  // Telegram's share-contact button — the whole reason a customer never types
  // their number. Only ever trust the contact the sender shared about themself.
  if (message.contact) {
    // Only ever trust a number the sender shared about themself — forwarding
    // someone else's contact card must not register them as this customer.
    if (message.contact.user_id && message.contact.user_id !== tgId) {
      await api.sendMessage({ chat_id: chatId, text: 'لطفاً شماره‌ی خودتان را بفرستید.' });
      return;
    }
    const phone = normalizePhone(message.contact.phone_number);
    const customer = await saveCustomer(tgId, { phone });
    const session = await getSession(tgId);

    if (session.state === 'awaiting_phone') {
      // Shared at checkout: the order was already waiting on it.
      await finishOrder(chatId, tgId, customer);
      return;
    }
    // Shared at the door: this is the point the shop opens for them.
    await welcome(chatId, tgId, `✅ شماره شما ثبت شد.\n\n${WELCOME}`);
    return;
  }

  const text = (message.text || '').trim();
  if (!text) return;

  // ── commands ────────────────────────────────────────────────────────────
  if (text === '/start') {
    await clearSession(tgId);
    if (!(await ensurePhone(chatId, tgId))) return;
    await welcome(chatId, tgId, WELCOME);
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
      await sendAdminMenu(chatId, '', tgId);
    } else if (existing === tgId) {
      await sendAdminMenu(chatId, '', tgId);
    }
    return;
  }

  // ── the phone gate ──────────────────────────────────────────────────────
  // Past this line every path assumes a reachable customer. /start, /id and
  // /setadmin above are deliberately outside it, so a first-time visitor can be
  // greeted and Ehsan can claim the admin role before any number exists.
  if (!(await ensurePhone(chatId, tgId))) return;

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
  if (text === BTN.admin && admin) { await clearSession(tgId); await sendAdminMenu(chatId, '', tgId); return; }

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
      await showScreen(chatId, tgId, {
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
      const digits = normalizePhone(text);
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
      // Adding names to a product that already exists is the common case — a
      // fresh product every time would split one item's posts across duplicates.
      const matches = await findProducts(text);
      if (matches.length > 0) {
        await setSession(tgId, 'admin_product_name', { pendingName: text });
        await showScreen(chatId, tgId, productChoice(text, matches));
        return;
      }
      const product = await createProduct(text);
      await setSession(tgId, 'admin_alias', { productId: product.id, name: product.name });
      await showScreen(chatId, tgId, await aliasScreen(product.id, `✅ کالای «${product.name}» ثبت شد.`));
      return;
    }

    case 'admin_alias': {
      if (!admin) { await clearSession(tgId); return; }
      await addAlias(data.productId, text);
      await showScreen(chatId, tgId, await aliasScreen(data.productId, `➕ «${text}» ثبت شد.`));
      return;
    }

    case 'admin_delete_search': {
      if (!admin) { await clearSession(tgId); return; }
      const groups = await searchProducts(text);
      if (groups.length === 0) {
        await showScreen(chatId, tgId, {
          text: `محصولی با نام «${text}» در حافظه‌ی بات نبود. نام دیگری بنویسید.`,
          reply_markup: { inline_keyboard: [[{ text: '↩️ بازگشت', callback_data: 'adm:menu' }]] },
        });
        return;
      }
      await showScreen(chatId, tgId, deleteCandidates(groups));
      return;
    }

    case 'admin_alias_pick': {
      if (!admin) { await clearSession(tgId); return; }
      const found = await findProducts(text);
      if (found.length === 0) {
        await showScreen(chatId, tgId, {
          text: 'کالایی با این نام پیدا نشد. نام دیگری بنویسید، یا از بخش مدیریت این را به‌عنوان کالای جدید ثبت کنید.',
          reply_markup: { inline_keyboard: [[{ text: '↩️ بازگشت', callback_data: 'adm:unmatched' }]] },
        });
        return;
      }
      await showScreen(chatId, tgId, {
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
