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
  ['pack',        /^(?:تعداد\s*(?:هر\s*)?بسته|تعداد\s*در\s*بسته|هر\s*بسته|بسته‌بندی|بسته|تعداد)\s*[:：\-ـ]*\s*/],
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

export function parseCaption(raw) {
  const lines = String(raw || '')
    .split('\n')
    .map((l) => l.trim())
    .filter((l) => l.length > 0);

  const out = { title: '', price: null, material: '', pack: '', description: '' };
  if (lines.length === 0) return out;

  const descriptionParts = [];
  // Slots are filled in template order by any line that isn't labelled.
  const POSITIONAL = ['price', 'material', 'pack'];
  let slot = 0;

  out.title = sanitize(lines[0]).split('\n')[0].trim();

  for (const line of lines.slice(1)) {
    const labelled = labelOf(line);
    if (labelled) {
      if (labelled.field === 'description') descriptionParts.push(labelled.value);
      else if (labelled.field === 'price') {
        // Keep the whole line: parsePrice needs the currency word to be sure.
        if (out.price === null) out.price = parsePrice(line);
        if (slot === 0) slot = 1;
      } else if (!out[labelled.field]) {
        out[labelled.field] = labelled.value;
      }
      continue;
    }

    // A dash consumes its slot and leaves the field empty.
    if (isSkip(line)) {
      if (slot < POSITIONAL.length) slot += 1;
      continue;
    }

    // The price slot: filled by a line that carries a price, or by a «استعلام
    // قیمت»-style line. Anything else means Ehsan skipped the price line, so the
    // slot is given up and this line is read as the next field instead of being
    // swallowed as a price.
    if (slot === 0) {
      slot = 1;
      const p = parsePrice(line);
      if (p !== null) { out.price = p; continue; }
      if (NO_PRICE.test(line)) continue;
      // falls through: this line is the material
    }

    // Any further line that is nothing but a price — a wholesale figure, say — is
    // noise, not a field. Without this it would land in the material and push
    // every later field down a slot.
    if (isPriceOnlyLine(line)) {
      if (out.price === null) out.price = parsePrice(line);
      continue;
    }

    if (slot < POSITIONAL.length) {
      out[POSITIONAL[slot]] = line;
      slot += 1;
      continue;
    }

    descriptionParts.push(line);
  }

  // A price written outside line 2 and without a label still counts, rather than
  // the product silently losing its price.
  if (out.price === null) out.price = parsePrice(raw);

  out.material = truncate(sanitize(out.material), 120);
  out.pack = truncate(sanitize(out.pack), 60);
  out.description = truncate(sanitize(descriptionParts.join('\n')), 600);
  return out;
}

// Kept separate so search still indexes the raw wording, digits folded, whatever
// line it happened to sit on.
export const searchableText = (raw) => foldDigits(String(raw || ''));
