# Decisions — YouTube Cooking Channel (English)

## 2026-07-24 — Project created
Nature: content strategy + research + paid media (not software). Scoped in: content
strategy, algorithm research, Google Ads planning, analytics, revenue model. Scoped
out for now: production automation, sponsorship outreach (deferred with triggers).
No external tools adopted — built-in research/analysis suffices at this stage.

## 2026-07-24 — Ads positioned as subscriber accelerator, not watch-time shortcut
Ruled OUT: using Google Ads to "buy" the 4,000 watch hours. Paid-traffic watch time
is excluded from YPP validity, so ad spend targets In-Feed subscriber acquisition on
organically proven videos only. Watch hours must be built organically via 8–12 min
long-form videos.

## 2026-07-24 — Recommended budget scenario: balanced (~$300–400/mo × 3 months)
Ruled OUT: aggressive scenario ($700–1,000/mo × 2 months) — subscribers would outpace
organic watch hours, wasting spend before monetization is reachable. Economy scenario
kept as fallback if owner's budget is tighter. Awaiting owner confirmation.

## 2026-07-24 — Workspace placement corrected
The plan was initially committed as a standalone root file on an orphan branch,
outside workspace conventions. Rebuilt the branch on the workspace base and moved the
work into `projects/youtube-cooking-channel/` per the `new-project` protocol.

## 2026-07-24 — Intake answers locked; niche resolved by pillar testing
Owner has no single concept (wants Persian food, healthy, desserts, breakfast).
Decision: do NOT force one sub-niche up front. Umbrella concept = "modern Persian home
kitchen" with four content pillars (Persian classics / healthy & light / desserts &
cakes / breakfast), rotated for 8 weeks; per-pillar CTR + retention decides which 1–2
pillars become the channel's core. Ruled OUT: fully mixed channel with no umbrella
identity — the 2026 algorithm rewards a clear, consistent topic.

## 2026-07-24 — Format locked: no voice, English text overlay, ambient sound
Fits owner's language comfort and equipment, removes accent/fluency risk, and matches
a proven "silent cooking / ASMR kitchen" genre. Trade-off accepted: slightly weaker
viewer bonding vs. voiceover; mitigated with strong on-screen writing and sound design.

## 2026-07-24 — Budget locked: $400/month for 3 months (starting ~week 9)
Owner approved. Effective media spend depends on Turkish VAT decision (see PROJECT.md).

## 2026-07-24 — Monetization must route through Turkey, not Iran
Iran is excluded from YPP/AdSense/Google Ads under sanctions. All account, billing,
tax, and payout setup will use Turkey (YPP-eligible). Ruled OUT: any workaround using
misrepresented country info on an Iranian-based setup — high ban risk, violates terms.

## 2026-07-24 — VPS-only workaround assessed and ruled out as a substitute
Owner proposed running everything through a VPS to solve the Iran restriction.
Assessment: a Turkish VPS is fine (even helpful) as a stable connectivity layer ON TOP
of a genuine Turkish setup, but cannot substitute for it — Google's binding signals
are payment method, billing address, AdSense identity/address verification, tax info,
and payout bank account, not IP. Failure point would be AdSense verification right
after monetization, risking loss of the channel's accumulated revenue. Decision:
start production now (needs nothing); resolve a real Turkish footing (short-stay
residency + bank, or a fully trusted Turkey-resident partner holding AdSense) by
month 3–4, before the ad phase and YPP application.
