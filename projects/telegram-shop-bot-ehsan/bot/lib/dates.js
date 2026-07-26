import { toPersianDigits } from 'lib/text';
import { now, DAY } from 'lib/config';

// Relative dates only — a raw timestamp tells Ehsan's customers nothing, while
// "۳ روز پیش" tells them exactly how much to trust the price.
export function relativeDate(unixSeconds) {
  if (!unixSeconds) return '';
  const days = Math.floor((now() - unixSeconds) / DAY);
  if (days <= 0) return 'امروز';
  if (days === 1) return 'دیروز';
  if (days < 30) return `${toPersianDigits(days)} روز پیش`;
  const months = Math.floor(days / 30);
  return `${toPersianDigits(months)} ماه پیش`;
}
