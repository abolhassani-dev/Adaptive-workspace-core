// Schema DSL + operators.
//
// This is a thin compatibility layer over Drizzle, keeping the column helpers
// the rest of the project already uses. `boolean()` and `json()` are not Drizzle
// primitives — they are sugar over integer/text with a mode, exactly as the
// original platform exposed them. Keeping the names means schema.js and every
// query in lib/ stayed byte-for-byte the same when hosting moved.

import {
  sqliteTable,
  integer as sqliteInteger,
  text as sqliteText,
  real,
  blob,
  index,
  uniqueIndex,
  check,
  primaryKey,
  unique,
} from 'drizzle-orm/sqlite-core';

export const table = sqliteTable;
export const integer = sqliteInteger;
export const text = sqliteText;
export const boolean = (name, opts = {}) => sqliteInteger(name, { ...opts, mode: 'boolean' });
export const json = (name, opts = {}) => sqliteText(name, { ...opts, mode: 'json' });

export { real, blob, index, uniqueIndex, check, primaryKey, unique };

export {
  sql,
  eq, ne, gt, gte, lt, lte,
  like, notLike,
  isNull, isNotNull, and, or, not,
  between, notBetween, inArray, notInArray,
  count, sum, avg, min, max,
  asc, desc,
} from 'drizzle-orm';
