# Decisions — PerfectScob + Sequence Indicator

## 2026-07-27 — Project created
Nature: single-file Pine v6 software + quantitative validation. The owner arrived with
a working v003 indicator and one concrete request (stochastic signal filter), and a
stated next step (Heikin Ashi variant). Scoped as a long-lived indicator project rather
than a one-off edit, because more filters and variants are clearly coming.
Ruled OUT of scope: converting to `strategy()`, alerts, and any external tooling —
none was needed for the request and none would be used.

## 2026-07-27 — Stochastic filter placed inside `f_emit()`, not in the six detection blocks
The alternative was to AND the gate into `m1`/`m2` in each of the six scob blocks, next
to the existing HTF gate. Rejected: that path leaves Model 3 unfiltered (Model 3 is
decided inside `f_emit`, independently of m1/m2), so filtered-out signals would still
appear as yellow Model 3 labels — contradicting the owner's "show nothing else".
`f_emit` is the single funnel all six blocks pass through, so one gate there covers
Models 1, 2, 3 and raw scob labels, and it also blocks the Model 3 level registration
so a suppressed signal cannot seed a future level.

## 2026-07-27 — Stochastic read on the trigger candle (`[1]`), not the live bar
Every scob condition requires `perv_control_candle._time == bar_index - 1`, and the
simulator enters at the open of the current bar. Reading %K/%D at offset `[1]` means
the gate uses the closed candle the pattern was confirmed on: deterministic, no repaint,
and consistent with the rest of the tool. Rejected reading the live bar — it would
repaint intrabar and make backtest numbers unreproducible.

## 2026-07-27 — Filter defaults to OFF
Same convention as the HTF gate. Guarantees v003 behavior is unchanged until the owner
explicitly enables the option, so the before/after comparison is clean.

## 2026-07-27 — Polarity implemented as requested, with an invert toggle
The owner asked for buys only while the stochastic is in the OVERBOUGHT zone and sells
only in oversold — continuation logic, the opposite of the textbook reading. Implemented
exactly as asked and set as the default. Added one toggle ("معکوس‌کردنِ قطبیت") instead of
arguing about it: the simulator can now settle continuation-vs-reversal on the same date
range with numbers. Rejected silently "correcting" the polarity — that would have
delivered something other than what was asked for.

## 2026-07-27 — No plot of the stochastic on the chart
The indicator is `overlay = true`; drawing %K/%D on price would be meaningless, and the
80/20 band + fill from the source snippet cannot be reproduced on a price overlay.
Instead the debug panel shows the two live values and the gate state, which is what is
actually needed to verify a signal. Rejected adding a second pane — Pine cannot mix
overlay and separate-pane plots in one script.
</content>
