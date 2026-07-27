# State — PerfectScob + Sequence Indicator
Updated: 2026-07-27

## Phase
v005 written: stochastic signal filter, polarity corrected to the classic reversal
reading after the owner verified v004 on a live EURUSD 1m chart. Waiting for the owner
to reload it in TradingView and confirm the signals now sit on the right side.

## Done
- Read and mapped the full v003 logic (two engines, three models, HTF gate, simulator).
- v004: added the stochastic filter as a single gate inside `f_emit()` — covers
  Models 1, 2, 3 and raw scob labels at once, reads the trigger candle at `[1]`,
  no repaint, defaults to off.
- Settings group "فیلترِ استوکاستیک": on/off, %K Length, %K Smoothing, %D Smoothing,
  overbought level, oversold level, which lines must be inside the zone, filter logic.
- Debug panel shows %K/%D of the trigger candle and the buy/sell gate state.
- v005: polarity contradiction in the original request resolved against the owner's own
  chart. Buy now requires the oversold zone, sell requires the overbought zone.
  The old boolean toggle became a dropdown that names both readings explicitly.

## Next
1. Owner reloads `perfect-scob-sequence.pine` (v005) and confirms: surviving buy labels
   sit where the stochastic is below 20, sell labels where it is above 80.
2. Fixed date range, simulator on: filter OFF vs ON → compare Net R / win rate / MFE.
3. Same range with "ادامه‌دهنده" selected, to test the continuation hypothesis with
   numbers rather than intuition.
4. Only after that: the Heikin Ashi variant the owner asked for.

## Blockers / waiting on
- Pine cannot be compiled or backtested outside TradingView. Verification is the
  owner's step; nothing here substitutes for it.

## Note for future sessions
The owner reads charts, not code. When an option's behavior can be read two ways,
name both readings in the option itself — do not rely on a tooltip.
