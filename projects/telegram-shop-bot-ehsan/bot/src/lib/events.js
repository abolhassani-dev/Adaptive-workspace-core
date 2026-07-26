import { db } from '../sdk.js';
import { events } from '../schema.js';
import { now } from './config.js';
import { truncate } from './text.js';

/**
 * Records a customer footprint. Only three kinds are logged — arrival, search,
 * order — because that is what Ehsan can act on. Logging every button tap would
 * bury the demand signal in noise and grow the table for nothing.
 *
 * Never throws: a failed log must not cost a customer their search.
 */
export async function logEvent(tgId, kind, detail = null, found = null) {
  try {
    await db.insert(events).values({
      tgId,
      kind,
      detail: detail === null ? null : truncate(String(detail), 120),
      found,
      createdAt: now(),
    }).run();
  } catch {
    // swallowed on purpose — see above
  }
}
