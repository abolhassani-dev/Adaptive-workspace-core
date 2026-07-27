# CHANGELOG — perfect-scob-sequence.pine

## v004 — 2026-07-27 — Stochastic signal filter
Added a stochastic gate that filters every signal the tool emits.

**Settings group: `فیلترِ استوکاستیک`**

| Option | Default | Meaning |
|---|---|---|
| فعال‌سازیِ فیلترِ استوکاستیک | off | master switch; off = v003 behavior, unchanged |
| %K Length | 14 | same as the standard TradingView Stochastic |
| %K Smoothing | 1 | same |
| %D Smoothing | 3 | same |
| سطحِ اشباعِ خرید | 80 | upper band |
| سطحِ اشباعِ فروش | 20 | lower band |
| کدام خط‌ها در ناحیه باشند | هر دو خط | both lines / %K only / at least one |
| معکوس‌کردنِ قطبیت | off | off = buy in overbought, sell in oversold (continuation). on = classic reversal reading |

**Behavior.** With the filter on, a buy signal survives only if the stochastic is in the
overbought zone on the trigger candle, and a sell signal only if it is in the oversold
zone (inverted when the polarity toggle is on). Everything else is removed — Model 1,
Model 2, Model 3 and raw scob labels alike — and blocked signals never enter the simulator.

**Implementation.**
- `stochK` / `stochD` computed exactly as the standard Stochastic:
  `ta.sma(ta.stoch(close, high, low, periodK), smoothK)` and `ta.sma(k, periodD)`.
- `stochK1` / `stochD1` = the values on the trigger candle (`bar_index - 1`). No repaint.
- `f_stochPass(dir)` returns `true` when the filter is off.
- The gate is applied once, at the top of `f_emit()`, before Model 3 evaluation. A blocked
  signal yields `_mod = 0`: label deleted, no simulator entry, and no Model 3 level
  registered. Existing Model 3 state is left untouched, so an armed setup stays armed.
- Debug panel grew from 11 to 13 rows: `استوک K / D` and `گیتِ استوک (خرید/فروش)`.

Detection logic of both engines is untouched.

## v003 — 2026-06-13 — HTF threshold made monotonic
Independent buy/sell higher-timeframe levels. (Inherited; documented from the file header.)
</content>
