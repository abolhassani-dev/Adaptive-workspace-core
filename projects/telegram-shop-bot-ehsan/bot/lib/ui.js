import { api } from 'sdk';
import { formatPrice, formatPriceShort } from 'lib/price';
import { relativeDate } from 'lib/dates';
import { truncate } from 'lib/text';
import { isFresh } from 'lib/search';

// No parse_mode anywhere in this bot. Supplier captions and customer names are
// arbitrary text; feeding them through a Markdown or HTML parser turns a stray
// underscore into a failed send. Structure is carried by emoji and line breaks.

export const BTN = {
  search: '🔍 استعلام کالا',
  cart: '🛒 سبد خرید من',
  orders: '📋 سفارش‌های من',
  contact: '☎️ ارتباط با ما',
  admin: '🛠 مدیریت',
};

export function mainMenu(isAdmin = false) {
  const rows = [
    [{ text: BTN.search }],
    [{ text: BTN.cart }, { text: BTN.orders }],
    [{ text: BTN.contact }],
  ];
  if (isAdmin) rows.push([{ text: BTN.admin }]);
  return { keyboard: rows, resize_keyboard: true };
}

export const cardButtons = (postId) => ({
  inline_keyboard: [
    [{ text: '➕ افزودن به سبد خرید', callback_data: `add:${postId}` }],
    [{ text: '🔍 استعلام جنس جدید', callback_data: 'search' }],
    [{ text: '↩️ بازگشت', callback_data: 'home' }],
  ],
});

// One tap for the common quantities, typing for anything else.
export const qtyButtons = () => ({
  inline_keyboard: [
    [1, 2, 5, 10].map((n) => ({ text: String(n), callback_data: `qty:${n}` })),
    [{ text: '↩️ انصراف', callback_data: 'home' }],
  ],
});

export const contactRequestKeyboard = () => ({
  keyboard: [[{ text: '📱 ارسال شماره من', request_contact: true }]],
  resize_keyboard: true,
  one_time_keyboard: true,
});

// Deep link to a post inside Ehsan's channel. Private channels use the /c/ form,
// which works for anyone who is a member — Ehsan is admin, so it always resolves.
export function postLink(chatId, messageId) {
  const s = String(chatId);
  if (!s.startsWith('-100')) return null;
  return `https://t.me/c/${s.slice(4)}/${messageId}`;
}

/**
 * Render the product card body. Always the same four blocks in the same order —
 * name, price, date, description — with missing fields omitted rather than
 * reordered. That fixed shape is what makes eight differently-written supplier
 * posts read as one shop.
 */
export function cardText(group) {
  const offer = group.best;
  const lines = [`🧁 ${group.title}`, ''];

  if (offer.price !== null && isFresh(offer.postedAt)) {
    lines.push(`💰 قیمت: ${formatPrice(offer.price)}`);
    lines.push(`📅 به‌روزرسانی: ${relativeDate(offer.postedAt)}`);
  } else if (offer.price !== null) {
    // Past the freshness window: show it, but never as a firm quote.
    lines.push(`💰 قیمت آخرین بار: ${formatPrice(offer.price)} (${relativeDate(offer.postedAt)})`);
    lines.push('⚠️ این قیمت به‌روز نیست و هنگام تماس استعلام می‌شود.');
  } else {
    lines.push('💰 قیمت: نیاز به استعلام');
    lines.push('همکاران ما قیمت و موجودی را هنگام تماس اعلام می‌کنند.');
  }

  if (offer.description) {
    lines.push('', `ℹ️ ${truncate(offer.description, 500)}`);
  }
  return lines.join('\n');
}

/**
 * Send the card. A single photo carries its caption and buttons in one message.
 * An album cannot carry buttons at all — Telegram does not allow reply_markup on
 * sendMediaGroup — so the photos go first and the text with its buttons follows
 * immediately, which reads as one card in the chat.
 */
export async function sendProductCard(chatId, group) {
  const offer = group.best;
  const photos = [];
  if (group.pinnedPhotoId) photos.push(group.pinnedPhotoId);
  for (const id of (Array.isArray(offer.photoIds) ? offer.photoIds : [])) {
    if (!photos.includes(id)) photos.push(id);
  }

  const text = cardText(group);
  const reply_markup = cardButtons(offer.id);

  if (photos.length === 0) {
    await api.sendMessage({ chat_id: chatId, text, reply_markup });
    return;
  }

  if (photos.length === 1) {
    // Caption limit is 1024; the card is well under it, but truncate defensively
    // rather than let a long supplier description fail the whole send.
    await api.sendPhoto({
      chat_id: chatId,
      photo: photos[0],
      caption: truncate(text, 1000),
      reply_markup,
    });
    return;
  }

  await api.sendMediaGroup({
    chat_id: chatId,
    media: photos.slice(0, 10).map((id) => ({ type: 'photo', media: id })),
  });
  await api.sendMessage({ chat_id: chatId, text, reply_markup });
}

// Ambiguous search: let the customer pick rather than guessing for them.
// Keyed by post id, not by list position — callback data has to stay valid even
// if the customer taps an older message after searching again.
export function choiceKeyboard(groups) {
  return {
    inline_keyboard: [
      ...groups.map((g) => [{
        text: truncate(`${g.title} — ${formatPriceShort(g.best.price)}`, 60),
        callback_data: `pick:${g.best.id}`,
      }]),
      [{ text: '🔍 جستجوی دیگر', callback_data: 'search' }],
    ],
  };
}
