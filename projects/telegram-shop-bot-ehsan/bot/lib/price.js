import { foldDigits, toPersianDigits } from 'lib/text';

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
 * Parse the price out of a free-form Persian caption.
 *
 * Deliberately conservative: if a caption yields several DIFFERENT prices
 * (wholesale vs retail, a range, two variants), this returns null rather than
 * guessing. A missing price shows «نیاز به استعلام» and Ehsan quotes by phone;
 * a wrong price reaches a customer as fact. The asymmetry is the whole point.
 */
export function parsePrice(caption) {
  if (!caption) return null;
  const text = foldDigits(String(caption));
  const found = new Set();

  PRICE_RE.lastIndex = 0;
  let m;
  while ((m = PRICE_RE.exec(text)) !== null) {
    const n = toNumber(m[1], m[2], m[3]);
    // Below 1000 Toman is almost always a stray number that happened to sit
    // next to a "ت" — not a real price in this trade.
    if (n !== null && n >= 1000) found.add(n);
  }

  if (found.size !== 1) return null;
  return [...found][0];
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
