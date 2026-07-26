import { foldDigits, toPersianDigits } from './text.js';

// Prices are stored as whole Toman.

// A number, optionally with thousands separators, optionally "هزار", followed by
// a currency word. The currency marker is what makes it a price rather than a
// weight, a diameter or a pack count.
//
// No \b anywhere: JavaScript word boundaries are defined over [A-Za-z0-9_], so
// after a Persian letter \b never matches and the whole pattern silently fails.
// The trailing lookahead does the job instead — it stops the bare "ت" from
// matching inside a word like «۲۰۰۰ تایی» and inventing a price out of a
// pack size.
const PRICE_RE =
  /(\d{1,3}(?:[.,٬٫]\d{3})+|\d+(?:[.,٬٫]\d+)?)\s*(هزار|میلیون)?\s*(تومان|تومن|ت|ریال|ريال)ی?(?![؀-ۿ])/gi;

function toNumber(raw, multiplierWord, currency) {
  let s = raw;
  // A separator followed by exactly three digits is a thousands separator
  // ("۱۸۵٫۰۰۰" = 185000). Anything else is a decimal point ("8.5").
  s = s.replace(/[.,٬٫](?=\d{3}\b)/g, '');
  s = s.replace(/[٬٫]/g, '.');
  let n = Number(s);
  if (!Number.isFinite(n)) return null;

  const w = (multiplierWord || '').trim();
  if (w === 'هزار') n *= 1000;
  else if (w === 'میلیون') n *= 1000000;

  const c = (currency || '').trim();
  if (c === 'ریال' || c === 'ريال' || c === 'ر') n /= 10;

  if (n <= 0) return null;
  return Math.round(n);
}

/**
 * Parse the price out of a Persian caption: **the first price written wins.**
 *
 * This used to return null whenever a caption held two different prices, so a
 * perfectly ordinary «تکی … / عمده …» post ended up with no price at all and the
 * card read «نیاز به استعلام». With a posting template in place (POSTING-GUIDE.md
 * — name on line 1, price on line 2, description after) position carries the
 * meaning, so scanning line by line and taking the first price is both
 * unambiguous and easy to explain: the first price you write is the price your
 * customers see.
 *
 * A caption with no currency marker anywhere still yields null, and the card then
 * says «نیاز به استعلام» — which is how a deliberately price-less post works.
 */
export function parsePrice(caption) {
  if (!caption) return null;

  for (const line of foldDigits(String(caption)).split('\n')) {
    PRICE_RE.lastIndex = 0;
    const m = PRICE_RE.exec(line);
    if (!m) continue;
    const n = toNumber(m[1], m[2], m[3]);
    // Below 1000 Toman is almost always a stray number that happened to sit
    // next to a "ت" — not a real price in this trade.
    if (n !== null && n >= 1000) return n;
  }
  return null;
}

// Words that carry no information once the price itself has been removed.
const PRICE_WORDS = /(قیمت|تومان|تومن|ریال|ريال|هزار|میلیون|فی|نقدی|عمده|تکی|تک)/g;

/**
 * Is this line nothing but a price? Such lines are dropped from the description,
 * because the card already shows the price in its own block — repeating it
 * reads as a mistake, and for posts whose caption is just a name and a price it
 * would make the description a duplicate of the price line.
 */
export function isPriceOnlyLine(line) {
  if (!line) return false;
  const folded = foldDigits(String(line));
  PRICE_RE.lastIndex = 0;
  const hasPrice = PRICE_RE.test(folded);
  PRICE_RE.lastIndex = 0;
  if (!hasPrice) return false;

  const rest = folded
    .replace(PRICE_RE, ' ')
    .replace(PRICE_WORDS, ' ')
    .replace(/[^\p{L}]+/gu, '');
  return rest.length < 3;
}

// One canonical rendering everywhere, whatever the supplier wrote.
export function formatPrice(toman) {
  if (toman === null || toman === undefined) return null;
  const grouped = String(Math.round(toman)).replace(/\B(?=(\d{3})+(?!\d))/g, '٫');
  return `${toPersianDigits(grouped)} تومان`;
}

export function formatPriceShort(toman) {
  if (toman === null || toman === undefined) return '—';
  const grouped = String(Math.round(toman)).replace(/\B(?=(\d{3})+(?!\d))/g, '٫');
  return `${toPersianDigits(grouped)} ت`;
}
