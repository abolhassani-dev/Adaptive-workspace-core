// Persian text handling: normalization for search, and sanitization of supplier
// captions before anything is shown to a customer.

const PERSIAN_DIGITS = '۰۱۲۳۴۵۶۷۸۹';
const ARABIC_DIGITS = '٠١٢٣٤٥٦٧٨٩';
const LATIN_DIGITS = '0123456789';

// Fold Arabic/Persian digit forms to Latin so "۸.۵" and "8.5" are the same string.
export function foldDigits(s) {
  let out = '';
  for (const ch of s) {
    const p = PERSIAN_DIGITS.indexOf(ch);
    if (p >= 0) { out += LATIN_DIGITS[p]; continue; }
    const a = ARABIC_DIGITS.indexOf(ch);
    if (a >= 0) { out += LATIN_DIGITS[a]; continue; }
    out += ch;
  }
  return out;
}

// Render Latin digits back as Persian for anything the user reads.
export function toPersianDigits(s) {
  return String(s).replace(/[0-9]/g, (d) => PERSIAN_DIGITS[Number(d)]);
}

// The single normalizer used for BOTH indexed posts and customer queries.
// Both sides must go through this or matching silently fails.
export function normalize(input) {
  if (!input) return '';
  let s = foldDigits(String(input));
  s = s
    .replace(/‌/g, ' ')          // ZWNJ — "قالب‌کیک" and "قالب کیک" must match
    .replace(/[​‎‏﻿]/g, '')
    .replace(/[يى]/g, 'ی')            // Arabic yeh forms
    .replace(/[ك]/g, 'ک')             // Arabic kaf
    .replace(/[ۀة]/g, 'ه')
    .replace(/[أإآا]/g, 'ا')
    .replace(/[ؤ]/g, 'و')
    .replace(/[ً-ْ]/g, '')  // harakat
    .replace(/[ـ]/g, '')              // tatweel
    .toLowerCase();
  // punctuation → space, so tokens split cleanly. Keep . and / inside numbers (8.5, 1/2).
  s = s.replace(/[^\p{L}\p{N}./]+/gu, ' ');
  return s.replace(/\s+/g, ' ').trim();
}

// Tokens worth searching on. Single characters are dropped as noise, but any
// token containing a digit is kept — "8.5" is exactly the kind of term that
// distinguishes one قالب from another.
export function tokenize(input) {
  return normalize(input)
    .split(' ')
    .filter((t) => t.length > 1 || /\d/.test(t));
}

const URL_RE = /(https?:\/\/\S+|t\.me\/\S+|telegram\.me\/\S+|www\.\S+)/gi;
const USERNAME_RE = /@[A-Za-z0-9_]{3,}/g;
// Iranian mobile/landline shapes, after digits are folded to Latin.
const PHONE_RE = /(?:\+?98|0)\d{2,3}[\s.-]?\d{3,4}[\s.-]?\d{4}/g;

// Lines that exist to route the reader to the supplier. If a line contains one
// of these AND a contact token, the whole line goes — a half-cleaned "برای سفارش
// تماس بگیرید با" is worse than no description.
const CONTACT_HINTS = [
  'تماس', 'سفارش', 'ایدی', 'آیدی', 'ادمین', 'واتساپ', 'واتس اپ',
  'شماره', 'تلگرام', 'کانال', 'پیج', 'اینستاگرام', 'ارسال به سراسر',
];

function hasContactHint(line) {
  const n = normalize(line);
  return CONTACT_HINTS.some((h) => n.includes(normalize(h)));
}

// Strip every trace of the supplier from a caption before a customer sees it.
// This is the safeguard that enforces "the customer never learns the supplier";
// with supplier photos and text reaching customers, it is load-bearing, not polish.
export function sanitize(input) {
  if (!input) return '';
  const kept = [];
  for (const rawLine of String(input).split('\n')) {
    const line = foldDigits(rawLine);
    const hadContact = URL_RE.test(line) || USERNAME_RE.test(line) || PHONE_RE.test(line);
    URL_RE.lastIndex = 0; USERNAME_RE.lastIndex = 0; PHONE_RE.lastIndex = 0;

    // A contact token next to a call-to-action means the line's purpose is
    // redirection. Drop it whole rather than leaving a mangled fragment.
    if (hadContact && hasContactHint(line)) continue;

    const cleaned = line
      .replace(URL_RE, ' ')
      .replace(USERNAME_RE, ' ')
      .replace(PHONE_RE, ' ')
      .replace(/[ \t]+/g, ' ')
      .trim();

    if (!cleaned) continue;
    // Whatever is left of a contact line after stripping is usually a stub
    // ("برای سفارش با") — not worth showing.
    if (hadContact && cleaned.length < 12) continue;
    kept.push(cleaned);
  }
  // Digits were folded to Latin so the phone/URL patterns could match. The
  // customer must not see the result of that: fold them back, which also makes
  // any Latin digits the supplier typed match the Persian digits used for
  // prices and dates everywhere else on the card.
  return toPersianDigits(kept.join('\n').trim());
}

// The product name: first line of the caption that reads like a name.
export function extractTitle(caption, isPriceOnlyLine = () => false) {
  const clean = sanitize(caption);
  for (const line of clean.split('\n')) {
    const t = line.trim();
    if (t.length < 2) continue;
    if (isPriceOnlyLine(t)) continue;   // a price is not a name
    return t.length > 80 ? `${t.slice(0, 79)}…` : t;
  }
  return '';
}

/**
 * Store phone numbers the way Ehsan will dial them. Telegram hands back
 * "989123456789" with no plus; as-is that is neither tappable nor recognisable.
 * Latin digits are deliberate — Telegram only turns a number into a tap-to-call
 * link when it is written in Latin digits, and calling the customer IS the job.
 */
export function normalizePhone(raw) {
  let d = foldDigits(String(raw || '')).replace(/[^\d+]/g, '').replace(/^\+/, '');
  if (d.startsWith('98') && d.length === 12) d = `0${d.slice(2)}`;
  return d;
}

export function truncate(s, max) {
  if (!s) return '';
  return s.length <= max ? s : `${s.slice(0, max - 1)}…`;
}
