# PerfectScob + Sequence — Indicator

## Goal
Maintain and extend a TradingView Pine v6 indicator that combines two engines:
PerfectScob (candle-pattern liquidity sweeps: SCOB2 / SCOB3 / Medium SCOB3) and
Sequence Candle (directional candle counting + liquidity lines). Their intersection
produces three signal models, plus an HTF gate and a built-in money-management
simulator with a report panel. The objective of the project is to add and validate
signal filters that raise signal quality, each measurable through the simulator's
own backtest report on the same date range.

## Nature
Software (single-file Pine Script v6) + quantitative validation. No backend,
no data pipeline, no deployment — the deliverable is a `.pine` file the owner
pastes into TradingView.

## Architecture (what a future session must know)

- **Two engines, one file.** Module 1 = PerfectScob detection (untouched, MPL-2.0,
  (c) aliamirafshar). Module 2 = Sequence Candle. They are glued through two
  event registries (`memBar/memDir/memCnt` = sequence membership, `frzBar/frzDir` =
  frozen liquidity lines) — no index arithmetic.
- **Model 1** = swept candle belongs to a same-direction sequence (count >= `seqThreshold`),
  or a same-direction line froze on the scob event itself.
- **Model 2** = swept candle belongs to an opposite sequence (count >= `m2MinCount`),
  or an opposite line froze on the event.
- **Model 3** = price re-crosses a level where a Model 1/2 label previously landed,
  plus an extreme scob. Priority: 3 > 2 > 1.
- **`f_emit()` is the single funnel.** All six detection blocks (SCOB2 high/low,
  SCOB3 high/low, Medium high/low) end in `f_emit()`. Any global signal gate belongs
  there — that is where the stochastic filter lives. Gating there also suppresses
  the Model 3 level registration, so a filtered-out signal cannot seed a new level.
- **`f_htfPass()`** is the higher-timeframe gate (independent buy/sell levels, monotonic).
- **Simulator** runs on `barstate.isconfirmed`, enters at the open of the bar after the
  trigger candle, locks dollar risk per attempt, and reports R-multiples, hit rates,
  MFE and daily target statistics.
- **Repaint discipline.** Everything decides on confirmed candles. The scob trigger
  candle is always `bar_index - 1`, so any external filter must read that bar
  (offset `[1]`), never the live bar.

## Dimensions
### Essential
- Software (Pine v6) — the indicator itself is the whole deliverable.
- Quantitative validation — a filter is only worth keeping if the simulator report
  improves on the same range; opinion is not evidence.
- Documentation — the owner is not a programmer; every option needs a plain-language
  tooltip in Persian inside the indicator settings.

### Optional
- Alerts — not requested yet; the tool is used visually and through the simulator.

### Deferred
- Heikin Ashi variant — explicitly requested as the next step: re-check the same
  logic on HA candles. Trigger: after the stochastic filter is validated on normal candles.
- Strategy conversion (`strategy()` with real orders) — trigger: only if the owner
  ever wants TradingView's native backtester or automation.

### Irrelevant
- Backend, database, hosting, CI — a Pine file has none of these.

## Capability gaps
- None open. Pine authoring and logic review are built-in capabilities. No MCP,
  plugin or external tool is needed, and none was adopted.

## Toolbox (this project)
Empty by design. TradingView itself is the runtime; the owner pastes the file in.

## Open questions
- Polarity of the stochastic filter: the owner asked for buy-only-in-overbought /
  sell-only-in-oversold (continuation logic). Implemented as the default, with an
  invert toggle so the classic reversal reading can be tested on the same range.
  Which one actually performs better is an empirical question, still unanswered.
</content>
