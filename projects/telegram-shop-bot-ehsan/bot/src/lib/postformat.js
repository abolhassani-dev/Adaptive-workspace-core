import { sanitize, truncate, foldDigits } from './text.js';
import { parsePrice, isPriceOnlyLine } from './price.js';

/**
 * Reads a channel post written to the template Ehsan follows
 * (see POSTING-GUIDE.md):
 *
 *   line 1   name
 *   line 2   price
 *   line 3   material
 *   line 4   units per pack
 *   line 5+  description (any number of lines)
 *
 * Position decides which field a line is, because that is the rule Ehsan can
 * actually remember. Two escape hatches keep a slipped line from cascading —
 * one forgotten line would otherwise turn a material into a pack size and a pack
 * size into a description:
 *
 *  - **A label wins over position, anywhere in the post.** «جنس: استیل» on any
 *    line is the material even if it is the seventh line.
 *  - **A dash skips a field.** A line holding only «-» means "this product has
 *    no material" without shifting everything below it.
 *
 * Blank lines are ignored for positioning, so paragraph spacing is harmless.
 */

const LABELS = [
  ['price',       /^(?:قیمت|فی)\s*[:：\-ـ]*\s*/],
  ['material',    /^(?:جنس|متریال|مواد|جنسیت)\s*[:：\-ـ]*\s*/],
  ['pack',        /^(?:در\s*)?(?:تعداد\s*(?:هر\s*)?بسته|تعداد\s*در\s*بسته|هر\s*بسته|بسته‌بندی|بسته|تعداد)\s*[:：\-ـ]*\s*/],
  ['description', /^(?:توضیحات|توضیح|مشخصات)\s*[:：\-ـ]*\s*/],
];

// A field Ehsan wants to leave empty without shifting the lines below it.
const isSkip = (line) => /^[-—–_.\s]*$/.test(line);

// «استعلام قیمت» and friends: line 2 is present and means "no price", so it
// belongs to the price slot rather than sliding down into the material.
const NO_PRICE = /(استعلام|تماس|توافقی|موجود نیست|تلفنی)/;

function labelOf(line) {
  for (const [field, re] of LABELS) {
    if (re.test(line)) return { field, value: line.replace(re, '').trim() };
  }
  return null;
}

// A line that is only a number, like «۷۰۰۰». In the price position, or after a
// «قیمت» label, the number is the price even with no «تومان» written — position
// and label already say what it is. Real captions leave the currency off often.
function bareNumber(line) {
  const folded = foldDigits(String(line));
  const stripped = folded.replace(/[\d.,٬٫\s]/g, '');
  if (stripped.length > 0) return null;               // «۱۲ عدد» is not a price
  const n = Number(folded.replace(/[.,٬٫\s]/g, ''));
  return Number.isFinite(n) && n > 0 ? Math.round(n) : null;
}

// After a «قیمت» label the wording is free, so take the first number on the line.
function labelledPrice(line) {
  const withCurrency = parsePrice(line);
  if (withCurrency !== null) return withCurrency;
  const m = foldDigits(String(line)).match(/(\d{1,3}(?:[.,٬٫]\d{3})+|\d+)/);
  if (!m) return null;
  const n = Number(m[1].replace(/[.,٬٫]/g, ''));
  return Number.isFinite(n) && n > 0 ? Math.round(n) : null;
}

export function parseCaption(raw) {
  const lines = String(raw || '')
    .split('\n')
    .map((l) => l.trim())
    .filter((l) => l.length > 0);

  const out = { title: '', price: null, material: '', pack: '', description: '' };
  if (lines.length === 0) return out;

  const descriptionParts = [];
  const POSITIONAL = ['price', 'material', 'pack'];
  let priceDone = false;
  let slot = 0;

  // A field a label already answered must not be overwritten by the next
  // unlabelled line — that is how «جنس حلب…» got replaced by the pack line.
  const filled = (field) => (field === 'price' ? priceDone : out[field] !== '');
  const nextOpenSlot = () => {
    while (slot < POSITIONAL.length && filled(POSITIONAL[slot])) slot += 1;
    return slot < POSITIONAL.length ? POSITIONAL[slot] : null;
  };

  out.title = sanitize(lines[0]).split('\n')[0].trim();

  for (const line of lines.slice(1)) {
    const labelled = labelOf(line);
    if (labelled) {
      if (labelled.field === 'description') {
        descriptionParts.push(labelled.value);
      } else if (labelled.field === 'price') {
        if (!priceDone) {
          out.price = labelledPrice(line);
          priceDone = true;
        }
      } else if (!out[labelled.field]) {
        out[labelled.field] = labelled.value;
      }
      continue;
    }

    // A dash gives up whichever field is next and leaves it empty.
    if (isSkip(line)) {
      const field = nextOpenSlot();
      if (field === 'price') priceDone = true;
      else if (field) out[field] = ' ';   // marked filled; trimmed to '' at the end
      slot += 1;
      continue;
    }

    const field = nextOpenSlot();

    if (field === 'price') {
      priceDone = true;
      const withCurrency = parsePrice(line);
      if (withCurrency !== null) { out.price = withCurrency; slot += 1; continue; }
      const bare = bareNumber(line);
      if (bare !== null) { out.price = bare; slot += 1; continue; }
      if (NO_PRICE.test(line)) { slot += 1; continue; }
      // Not a price at all: the price line was skipped, so read this line as the
      // next field instead of swallowing it.
      slot += 1;
    }

    // A stray price line further down — a wholesale figure — is noise, not a field.
    if (isPriceOnlyLine(line)) {
      if (out.price === null) out.price = parsePrice(line);
      continue;
    }

    const target = nextOpenSlot();
    if (target) {
      out[target] = line;
      slot += 1;
      continue;
    }
    descriptionParts.push(line);
  }

  if (out.price === null) out.price = parsePrice(raw);

  out.material = truncate(sanitize(out.material.trim()), 120);
  out.pack = truncate(sanitize(out.pack.trim()), 60);
  out.description = truncate(sanitize(descriptionParts.join('\n')), 600);
  return out;
}

// Kept separate so search still indexes the raw wording, digits folded, whatever
// line it happened to sit on.
export const searchableText = (raw) => foldDigits(String(raw || ''));
