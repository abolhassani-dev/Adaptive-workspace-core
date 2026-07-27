# State — PerfectScob + Sequence Indicator
Updated: 2026-07-27

## Phase
v004 written: stochastic signal filter added. Waiting for the owner to paste it into
TradingView and confirm it compiles and behaves as expected.

## Done
- Read and mapped the full v003 logic (two engines, three models, HTF gate, simulator).
- Added the stochastic filter as a single gate inside `f_emit()` — covers Models 1, 2, 3
  and raw scob labels at once.
- Settings live in a Persian group "فیلترِ استوکاستیک": on/off, %K Length, %K Smoothing,
  %D Smoothing, overbought level, oversold level, which lines must be inside the zone,
  polarity invert.
- Default is OFF, so v003 behavior is bit-for-bit preserved until the owner enables it.
- Two rows added to the debug panel (%K/%D of the trigger candle, and the buy/sell gate state).

## Next
1. Owner pastes `perfect-scob-sequence.pine` into TradingView → confirm it compiles.
2. Turn the filter on and eyeball a few signals against the debug panel (%K/%D values
   should be inside the zone for every surviving label).
3. Run the simulator on one fixed date range, filter OFF vs ON, and compare
   Net R / win rate / MFE. Then repeat with "معکوس‌کردنِ قطبیت" enabled to settle
   the continuation-vs-reversal question with numbers instead of opinion.
4. Only after that: the Heikin Ashi variant the owner asked for.

## Blockers / waiting on
- Pine cannot be compiled outside TradingView. Compilation and visual verification
  are the owner's step; nothing here can substitute for it.
</content>
