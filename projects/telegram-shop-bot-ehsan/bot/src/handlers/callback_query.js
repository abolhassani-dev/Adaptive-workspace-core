import { db, api, BotApiError } from '../sdk.js';
import { eq } from '../db.js';
import { orders, unmatched } from '../schema.js';
import { getSession, setSession, clearSession } from '../lib/session.js';
import { isAdmin, addToCart, removeCartItem } from '../lib/cart.js';
import { getGroupForPost } from '../lib/search.js';
import { sendProductCard, qtyButtons, cardPhotos } from '../lib/ui.js';
import { showHome, askForSearch, showCart, startCheckout, ensurePhone, showMyOrders } from '../lib/flow.js';
import {
  sendAdminMenu, unmatchedList, unmatchedActions, resolveUnmatched,
  ordersSummary, createProduct, addAlias, reportView, peopleView,
  resetMenu, confirmReset, runReset,
  deleteProductPrompt, confirmDelete, deleteGroup,
} from '../lib/admin.js';
import { showScreen } from '../lib/screen.js';
import { toPersianDigits } from '../lib/text.js';

export default async function (cb) {
  const tgId = cb.from?.id;
  const chatId = cb.message?.chat?.id;
  const data = cb.data || '';
  if (!tgId || !chatId) return;

  const ack = (text) => api.answerCallbackQuery({ callback_query_id: cb.id, text }).catch(() => {});

  try {
    // Buttons from an older message can still be tapped by someone who never
    // registered a number — the gate has to hold here too, not only on text.
    if (!(await ensurePhone(chatId, tgId))) { await ack(); return; }

    // ── customer actions ──────────────────────────────────────────────────
    if (data === 'home') { await ack(); await showHome(chatId, tgId); return; }
    if (data === 'search') { await ack(); await askForSearch(chatId, tgId); return; }
    if (data === 'cart') { await ack(); await clearSession(tgId); await showCart(chatId, tgId); return; }
    if (data === 'checkout') { await ack(); await startCheckout(chatId, tgId); return; }

    if (data.startsWith('pick:')) {
      await ack();
      const group = await getGroupForPost(Number(data.slice(5)));
      if (!group) { await api.sendMessage({ chat_id: chatId, text: 'این کالا دیگر در دسترس نیست.' }); return; }
      await sendProductCard(chatId, tgId, group);
      return;
    }

    if (data.startsWith('add:')) {
      await ack();
      const postId = Number(data.slice(4));
      const group = await getGroupForPost(postId);
      if (!group) { await api.sendMessage({ chat_id: chatId, text: 'این کالا دیگر در دسترس نیست.' }); return; }
      await setSession(tgId, 'awaiting_qty', {
        postId,
        title: group.title,
        price: group.best.price ?? null,
      });
      await showScreen(chatId, tgId, {
        text: `«${group.title}»\nچه تعداد می‌خواهید؟`,
        reply_markup: qtyButtons(),
      });
      return;
    }

    if (data.startsWith('qty:')) {
      const session = await getSession(tgId);
      if (session.state !== 'awaiting_qty') { await ack('این گزینه منقضی شده.'); return; }
      const d = session.data || {};
      const qty = Number(data.slice(4));
      await addToCart(tgId, { id: d.postId, price: d.price ?? null }, d.title, qty);
      await clearSession(tgId);
      await ack('به سبد خرید اضافه شد');
      await showScreen(chatId, tgId, {
        text: `✅ «${d.title}» — ${toPersianDigits(qty)} عدد به سبد خرید اضافه شد.`,
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

    if (data.startsWith('pics:')) {
      await ack();
      const group = await getGroupForPost(Number(data.slice(5)));
      const photos = group ? cardPhotos(group).slice(1, 10) : [];
      if (photos.length === 0) return;
      // The album is a genuine extra message; it is not the screen, so the next
      // navigation step still rewrites the card rather than this.
      await api.sendMediaGroup({
        chat_id: chatId,
        media: photos.map((id) => ({ type: 'photo', media: id })),
      });
      return;
    }

    if (data.startsWith('del:')) {
      await removeCartItem(Number(data.slice(4)), tgId);
      await ack('حذف شد');
      await showCart(chatId, tgId);
      return;
    }

    // ── everything below is Ehsan's ───────────────────────────────────────
    if (!(await isAdmin(tgId))) { await ack(); return; }

    if (data.startsWith('ord:')) {
      const [, status, idRaw] = data.split(':');
      const orderId = Number(idRaw);
      await db.update(orders).set({ status }).where(eq(orders.id, orderId)).run();

      const label = {
        working: '🔄 در حال پیگیری',
        closed: '✅ انجام شد',
        cancelled: '❌ منتفی شد',
      }[status] || status;

      await ack(label);
      // Rewrite the notification so the thread shows live state instead of a
      // stack of orders that all still look new.
      const original = (cb.message.text || '').split('\n─── وضعیت:')[0];
      await api.editMessageText({
        chat_id: chatId,
        message_id: cb.message.message_id,
        text: `${original}\n─── وضعیت: ${label}`,
        reply_markup: cb.message.reply_markup,
      }).catch(() => {});
      return;
    }

    if (data === 'myorders') { await ack(); await showMyOrders(chatId, tgId); return; }

    if (data === 'adm:menu') { await ack(); await clearSession(tgId); await sendAdminMenu(chatId, '', tgId); return; }

    if (data === 'adm:addproduct') {
      await ack();
      await setSession(tgId, 'admin_product_name');
      await showScreen(chatId, tgId, {
        text: 'نام اصلی کالای جدید را بنویسید:\n(مثلاً: قالب کیک یزدی)',
        reply_markup: { inline_keyboard: [[{ text: '↩️ بازگشت', callback_data: 'adm:menu' }]] },
      });
      return;
    }

    if (data === 'adm:unmatched') {
      await ack();
      await clearSession(tgId);
      const view = await unmatchedList();
      await showScreen(chatId, tgId, view);
      return;
    }

    if (data === 'adm:orders') {
      await ack();
      const view = await ordersSummary();
      await showScreen(chatId, tgId, view);
      return;
    }

    if (data === 'adm:delprod') {
      await ack();
      await setSession(tgId, 'admin_delete_search');
      await showScreen(chatId, tgId, deleteProductPrompt());
      return;
    }

    if (data.startsWith('dp:')) {
      await ack();
      const group = await getGroupForPost(Number(data.slice(3)));
      if (!group) { await sendAdminMenu(chatId, 'این محصول دیگر در حافظه نیست.', tgId); return; }
      await showScreen(chatId, tgId, confirmDelete(group));
      return;
    }

    if (data.startsWith('dpy:')) {
      const group = await getGroupForPost(Number(data.slice(4)));
      if (!group) { await ack(); await sendAdminMenu(chatId, 'این محصول دیگر در حافظه نیست.', tgId); return; }
      const title = group.title;
      const removed = await deleteGroup(group);
      await clearSession(tgId);
      await ack('حذف شد');
      await sendAdminMenu(chatId, `🗑 «${title}» حذف شد (${toPersianDigits(removed)} پست).`, tgId);
      return;
    }

    if (data === 'adm:reset') {
      await ack();
      await showScreen(chatId, tgId, await resetMenu());
      return;
    }

    if (data === 'rst:posts' || data === 'rst:all') {
      await ack();
      await showScreen(chatId, tgId, confirmReset(data.slice(4)));
      return;
    }

    if (data === 'rst:posts:yes' || data === 'rst:all:yes') {
      const kind = data.split(':')[1];
      const removed = await runReset(kind, tgId);
      await ack('پاک شد');
      await sendAdminMenu(
        chatId,
        kind === 'all'
          ? `♻️ ریست کامل انجام شد. ${toPersianDigits(removed)} پست پاک شد.`
          : `🗑 ${toPersianDigits(removed)} پست از حافظه پاک شد.`,
        tgId,
      );
      return;
    }

    if (data.startsWith('rep:')) {
      await ack();
      const which = data.slice(4);
      const view = which === 'people' ? await peopleView() : await reportView(Number(which) || 1);
      await showScreen(chatId, tgId, view);
      return;
    }

    if (data.startsWith('um:')) {
      await ack();
      const row = await db.select().from(unmatched).where(eq(unmatched.id, Number(data.slice(3)))).get();
      if (!row) return;
      const view = unmatchedActions(row);
      await showScreen(chatId, tgId, view);
      return;
    }

    if (data.startsWith('uml:')) {
      await ack();
      const id = Number(data.slice(4));
      const row = await db.select().from(unmatched).where(eq(unmatched.id, id)).get();
      if (!row) return;
      await setSession(tgId, 'admin_alias_pick', { unmatchedId: id, phrase: row.phrase });
      await api.sendMessage({
        chat_id: chatId,
        text: `«${row.phrase}» اسم دیگرِ کدام کالاست؟\nنام آن کالا را بنویسید:`,
      });
      return;
    }

    if (data.startsWith('umn:')) {
      await ack();
      const id = Number(data.slice(4));
      const row = await db.select().from(unmatched).where(eq(unmatched.id, id)).get();
      if (!row) return;
      const product = await createProduct(row.phrase);
      await addAlias(product.id, row.phrase);
      await resolveUnmatched(id);
      await setSession(tgId, 'admin_alias', { productId: product.id, name: product.name });
      await api.sendMessage({
        chat_id: chatId,
        text: `✅ «${product.name}» به‌عنوان کالای جدید ثبت شد.\n\nاگر اسم‌های دیگری هم دارد یکی‌یکی بفرستید، وگرنه /done را بزنید.`,
      });
      return;
    }

    if (data.startsWith('umi:')) {
      await resolveUnmatched(Number(data.slice(4)));
      await ack('نادیده گرفته شد');
      const view = await unmatchedList();
      await showScreen(chatId, tgId, view);
      return;
    }

    if (data.startsWith('uma:')) {
      const [, umId, productId] = data.split(':');
      const linked = await addAlias(Number(productId), await phraseOf(Number(umId)));
      await resolveUnmatched(Number(umId));
      await clearSession(tgId);
      await ack('ثبت شد');
      await sendAdminMenu(chatId, `✅ ثبت شد. الان ${toPersianDigits(linked)} پست به این کالا وصل است.`, tgId);
      return;
    }

    await ack();
  } catch (err) {
    // A failed callback must never leave the spinner turning on the customer's
    // screen — acknowledge, then say plainly that it didn't work.
    await ack();
    if (err instanceof BotApiError) {
      await api.sendMessage({ chat_id: chatId, text: 'انجام نشد، دوباره تلاش کنید.' }).catch(() => {});
    } else {
      throw err;
    }
  }
}

async function phraseOf(unmatchedId) {
  const row = await db.select().from(unmatched).where(eq(unmatched.id, unmatchedId)).get();
  return row ? row.phrase : '';
}
