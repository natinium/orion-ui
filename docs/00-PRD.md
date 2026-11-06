# Orion UI — Product Requirements Document (00)

**Version:** 0.1 · **Date:** 2026-11-06 · **Owner:** Natnael Mesele · **Status:** binding scaffold for the wave runs; input to `docs/01-DESIGN.md` (pending), `docs/02-BRAND.md` (parked), BENCHMARKS (pending).

**Evidence legend:** [PP] = `PHASE4-PAIN-POINTS.md` · [CAT] = `PHASE4-CATALOG.md` · [DOS] = `PHASE4-RESEARCH-DOSSIER.md` · [CLN] = `PHASE4-CLONE-ANALYSIS.md` · [CAL] = `PHASE3-MAP-UI-LIBS.md:91` + `PHASE3-IDEAS-AI-DEVTOOLS.md:16` (absolute paths in §12). All evidence fetches dated 2026-11-06. Rules in force: no invented numbers — every count is fetched in the evidence, re-run in the writing session (marked), or quoted from the founder brief; missing evidence is named, not guessed.

## 1. Identity (locked)

- **Comprehensive, NOT agentic** — AI app UI is wave 1 (the trend wedge); the library must cover everything a web app needs [DOS §0 identity rule; locked in TASK-PLAN decision 14, "Agentdeck" rejected as too agentic].
- **Positioning line, wording locked** (BRAND may polish wording only) [DOS §4.2]: "Orion UI — the comprehensive, free (MIT), shadcn-based registry: every component, section and AI-app surface a web app needs, installable by one CLI command — by humans or by agents."
- **Naming facts (binding) [DOS §4.1, §5 R1]:** registry namespace `@orion/<slug>`; hosting `github.com/natinium/orion-ui` (CONTRIBUTING.md:12). npm scope `@orion-ui` is OCCUPIED (fetched 2026-11-06: org exists with 7 stale packages) — no document may call it "zero-collision"; GitHub org `orion-ui/orion-ui` (94★) is off-limits; npm publishing is deferred.

## 2. Problem statement (from [PP], mined 2026-11-06 from shadcn-ui/ui — 782 open issues — plus magicui, HN, r/nextjs)

- **The base is incomplete, so users scrape code from comment threads.** shadcn/ui #66 "Multi select?" — open since 2023-02-08, 306 reactions, 108 comments; full implementations pasted into the thread and copy-installed; still-open asks include bottom nav (#8847), tab nav (#5975), Sankey (#8090) [PP §1, Critical].
- **Version churn breaks installs, and docs rot follows.** Tailwind v4 changes stranded installs (#6843, 130 rxn; top workaround comment 304 rxn; magicui #548/#592: "tailwind.config.ts is no longer a thing in Tailwind v4 but Magic UI still expects it"), and installed code diverges from the docs site (#8359) [PP §2 Critical, §6 High].
- **Quality gates are left to the user.** Dark-mode bugs (#5552 hydration error, 99 rxn, plus steady per-component dark bugs), form a11y gaps (#8431/#8377/#9249), and overlays breaking inside Dialog/Sheet/portal (#1647, 43 cmts) [PP §3, §7, §12].
- **Distribution is fragile and updates are silent.** CLI/registry outages (#9400, 68 cmts; #4712, 41 cmts), `--overwrite` flag ignored (#7672), dependency majors land unowned (react-day-picker v9 broke Calendar three times, #4366, 97 rxn) [PP §4, §5].
- **The customization model fights users** — HN "The Overcomplexity of the Shadcn Radio Button": 528 points, 333 comments ("200+ lines of code for a radio button and 7 imports … code rot") [PP §9].
- **The finished sections people want are paywalled** — Aceternity gates sections/templates at $169–1,990 tiers, Magic UI Pro sells 50+ sections at $199 lifetime, Shadcnblocks $149–399, 21st.dev meters free copies at 2/day [PP §10; DOS §1].
- **AI-app UI is either pattern-sized or runtime-locked.** The official base carries chat basics only (`message`, `bubble`, `trace`… in the 65-item index), Vercel AI Elements is being deprecated into shadcn/ui as 21 pattern-sized items, and the interesting AI chrome (cost/quota, supervision) exists only inside runtime-locked libraries [CAT §0; DOS §1, §2].

**→ Orion's thesis:** a comprehensive, free-MIT, Tailwind-v4-native registry that treats the twelve mined pains as product requirements (§9), with AI app UI as the wave-1 wedge — not the identity.

## 3. Target users

- **Primary — product engineers on Next.js/TS** shipping real applications with shadcn conventions. Grounding: the entire pain set was mined from exactly this population (shadcn/ui issues, r/nextjs threads [PP]); the install surface is one CLI command into their app (README:19-22); the quickstart-matrix commitment covers Next/Vite/TanStack/Remix/Astro [PP §11 fix].
- **Secondary — AI-app builders** who need complete chat/agent surfaces, not atoms. Grounding: wave 1 exists for them; the official set is pattern-sized and cost/supervision chrome is runtime-locked [DOS §1 gaps (b)(c), §2].
- **Tertiary — agencies / freelancers** assembling client marketing and app sections, who today pay for section packs by seat or lifetime licence [DOS §1 "where the rivals' money actually flows"; PP §10].

## 4. Goals

- **G1 — 128 catalog entries across 4 waves, TDD-gated.** Every entry goes through the 7-step run card; component #20 must cost the same as component #1 [CAT; DOS §3].
- **G2 — Wave 1 = AI app UI in 3 rings, Ring 1 first** [DOS §4.3, §2].
- **G3 — Docs that cannot lie.** Live preview, code block, and CLI payload generated from one artifact per release [PP §6 fix; DOS §3 step 4].
- **G4 — CI quality gates per component.** RED-first tests (render, variants, keyboard, axe, dark hook), light+dark visual captures, brand-token check; a dark-mode bug is a release blocker [DOS §3 steps 1–3; PP §3 fix].
- **G5 — Free-MIT everything + agent-readable distribution** — llms.txt, `.md` twins, per-item "Copy prompt", MCP under monitored uptime [DOS §4.10, §1 pattern 5].
- **G6 — Publish four benchmarks** — registry install time vs a fetched comparator set, weekly docs Lighthouse, per-item quality gate, freshness/status [DOS §4.4].
- **G7 — Deliver the ten launch commitments** of §9 as written, or publicly re-scope them.

## 5. NON-goals

- **N1 — Not agentic.** No agent framework, runtime, SDK, or orchestration; AI UI ships as installable surfaces only [DOS §0; TASK-PLAN 14].
- **N2 — No npm runtime packages / no runtime dependency.** Consumers own the source; npm publishing deferred [DOS §4.1; README:22].
- **N3 — Never paywall components, sections, blocks, or copies.** Later monetization = full templates only, with founder sign-off [DOS §4.10].
- **N4 — No Tailwind v3 support.** v4-native only: CSS-first `@theme`, keyframes embedded per item, no `tailwind.config` anywhere [PP §2 fix; README:34].
- **N5 — No multi-base/multi-style matrix at v0.** One base, one style; the token axis is designed-in for later [CLN §7.6].
- **N6 — Bundle size is not a headline metric.** Install time and per-item source weight are [DOS §4.4]. (README:57 still lists bundle size — see §11.5.)
- **N7 — Branding parked.** `02-BRAND` ships only after the founder approves the single-file HTML preview [DOS §4.8; founder brief].
- **N8 — No fabricated metrics.** Public counts are fetched-and-dated; vendor self-claims stay labeled as claims [DOS §5 R8].
- **N9 — No random-catalog inspiration.** Steal lists come only from the five analyzed top-tier sets [DOS §4.9].

## 6. Success metrics (honest bands)

| Metric | Target | Source / method |
|---|---|---|
| GitHub stars @ 6 months | **300–800 = median launch; 1,000–1,500 = excellent** (requires an HN front-page hit + an unowned wedge). 10k in 6 months is not a credible target — the only sub-1-year 10k case is Vercel-backed shadcn itself. | Calibration [CAL:91, PHASE3-IDEAS-AI-DEVTOOLS.md:16]. Measured monthly from launch, published, dated. |
| Registry installs via CLI | Measured from server-side `/r/*.json` request counts plus install smoke tests. **Numeric targets not yet calibrated** — founder decision; never reported as inference. | DOS §3 step 7 (hourly `/r` + sitemap uptime curl). |
| Accessibility pass rate | **100%** — a gate, not a vanity number: the axe assertion is part of the RED-first test per component; a failing axe blocks the run. | DOS §3 step 1; PP §12 fix. |
| Registry install time | Published: cold `npx shadcn add` vs shadcn/ui, Magic UI, Kibo, coss ui (the fetched comparator set). Thresholds belong to BENCHMARKS. | DOS §4.4 (1). |
| Docs Lighthouse | Weekly CI run, published. Thresholds belong to BENCHMARKS. | DOS §4.4 (2), the assistant-ui discipline. |
| Per-item quality gate | 100% of shipped entries pass: axe + light/dark visual + brand tokens. | DOS §4.4 (3); the run card. |
| Freshness/status | Public status line: `/r`, sitemap, MCP uptime; pushed-at freshness. No peer publishes one today. | DOS §4.4 (4); PP §5 mitigation. |

## 7. Scope

**7.1 Done — Run 0 (vertical slice).** Monorepo (Turborepo + Yarn 4 vendored, node-modules resolution), `apps/docs` (Next.js + Fumadocs), `packages/registry`, `scripts/build-registry.mjs`, and **Button** shipped test-first (`packages/registry/src/ui/button.tsx`, `packages/registry/tests/button.test.tsx` — file presence verified 2026-11-06). README:13-15 records Run 0 as current status, "deployed and verified end to end"; its gate was the 8 exit criteria [DOS §3]. *Caveat:* this local checkout contains no `.git` (git log fails), so I verified file presence — not history or CI.

**7.2 Next — Wave 1, Ring 1 first.** Ring-1 themes [DOS §2]: chat shell, composer, message pair, streaming states, markdown/code, error, empty, model selector. Instantiated in catalog slugs: `chat-shell` #1 (which itself carries the empty + connection states), `message-pair` #7, `message-error` #10, `streaming-states` #11, `markdown-message` #12, `prompt-input` #31, `model-selector` #27. *The catalog tags rings by theme, not per-row; exact Ring-1 membership (e.g. whether #8, #9, #32 ride Ring 1) is fixed at wave-1 kickoff in 01-DESIGN.*

**Why Ring 1 first:** the official 21 AI patterns define the comparison floor users will judge against [DOS §2, citing AI-SECTIONS §8].

**7.3 The three rings (wave 1 = 41 entries) [CAT §1; DOS §2]:**

- **Ring 1 — chat basics**, building on the official 21 patterns (the floor).
- **Ring 2 — agent apps**: tool cards, reasoning, citations, approvals + diff review, thread list, context chrome.
- **Ring 3 — differentiators nobody free covers**: cost meter, quota, subagent, background runs, elicitation, permission grants, kill switch, voice, artifact/sandbox.

## 8. Wave plan (verified: re-run 2026-11-06 → `w1=41 w2=34 w3=29 w4=24 total=128`)

| Wave | Theme | Entries | ★ gap entries |
|---|---|---|---|
| 1 | AI app UI — 3 rings | 41 | 15 |
| 2 | Advanced primitives — data, planning, files, editing, social, states, settings, media, charts, motion | 34 | 5 |
| 3 | App sections — auth, settings, billing, team, dashboard, compliance, account | 29 | 3 |
| 4 | Marketing sections — hero, features, social proof, pricing, content, nav, conversion | 24 | 2 |
| | **Total** | **128** | **25** |

Scope rules: variants ride entries as free example sub-pages and are never counted separately [CAT §0.1]; a section wave lands only after its component wave is stable [DOS §3]; a deferred backlog is named for wave 5 [CAT §5]. The 25 ★ entries and their verified gap bases are ledgered in [CAT §6].

## 9. Launch commitments (the ten promises, intent verbatim from [PP "The Launch Promises"])

1. **The 25 most-requested components ship on day one** — multi-select, keyboard/range date picker, bottom nav, tab nav included (shadcn #66, 306 rxn). ⚠ Reconciliation needed — see §11.3a.
2. **Tailwind v4-native, forever** — CSS-first `@theme` tokens, keyframes embedded per component, zero `tailwind.config`, opinionated defaults stated openly, never inherited silently.
3. **Docs that can't lie** — preview, code block, and CLI payload generated from the same artifact per release; what you preview is byte-for-byte what you install.
4. **Dark mode is a release gate** — every component screenshot-tested light + dark; per-framework theme snippet kills FOUC/hydration flash; hardcoded colors banned by lint.
5. **Dependencies disclosed and pinned** — each component page shows dep count and tested version ranges; per-component changelogs; `orion diff` previews update changes.
6. **The registry never holds you hostage** — static CDN + GitHub fallback; full source always copy-pasteable; `--overwrite` works; CLI errors name the exact config they expected.
7. **Composition-tested overlays** — every select/combobox/popover ships verified inside Dialog, Sheet, and Shadow DOM; mobile sidebar auto-wires its DialogTitle and closes on navigate.
8. **AI-app shell kit in the first wave** — shell combos, chat panel layout, command palette, mobile nav as free composable sections. ⚠ Partial mapping — see §11.3b.
9. **Customize without forking** — real variant APIs (size/tone/radius/layout) + `cssVars` on every component; trivial tweaks never mean editing 200 lines.
10. **100% MIT. Everything. No pro tier, no email gate, no licence asterisk.**

## 10. Risks carried forward [DOS §5]

- **R2 — official absorption:** shadcn/ui already absorbed Vercel AI Elements (21 patterns + base AI items); further official expansion would compress wave 1. Mitigation: differentiate on screens, orphans, supervision, cost chrome.
- **R3 — capacity:** 128 TDD-gated entries vs one maintainer at 10–20 h/wk [CAL:91]; wave gating + variants-not-entries keep scope honest; a cadence break would make Orion the next Kibo/Tremor (stale 6/13 months, fetched).
- **R5 — endpoint rot:** Kibo's MCP 500 open ~2 months is the cautionary tale; the hourly uptime workflow is the mitigation and a permanent ops burden.
- **R6 — free-forever economics:** unlimited free copies undercut the industry's paywalls; sustainability rests on unproven later template monetization.

## 11. Open items

1. `docs/01-DESIGN.md` does not exist yet, but CONTRIBUTING.md:117 references it — the DESIGN writer fills this; this PRD's §4/§5 bind it.
2. The full 128-entry catalog lives in the evidence vault, not yet in-repo. CONTRIBUTING.md:119 expects a slug appendix in this PRD; port the catalog verbatim to `docs/03-CATALOG.md` before wave-1 run #1 and link it here.
3. **Promise ↔ catalog reconciliation (founder decision before any launch copy):** (a) promise 1 names multi-select (→ `input-extras` #71, wave 2), keyboard/range date picker, bottom nav, and tab nav — the latter three are **not rows in the 128 catalog**; either add entries or re-scope the promise. (b) Promise 8's command palette is #55 (wave 2) and sidebar+topbar combos map to `dashboard-shell` #95 (wave 3); wave 1 covers `chat-shell` #1, `thread-list` #2, `copilot-side-panel` #3, `chat-mobile-sheet` #4.
4. Encode promise 5's `orion diff` and promise 7's overlay-composition matrix as explicit run-card gates in 01-DESIGN — both are commitments, not yet run-card steps [DOS §3].
5. README touch-ups: roadmap counts are the stale sketch ("Wave 1 ~25" etc., README:46-51) vs the catalog's 41/34/29/24, and README:57 lists bundle size as a headline, which N6 contradicts.
6. Fallback npm scope (if npm is ever activated) is an open founder decision [DOS R1].
7. The PRD precedes 01-DESIGN / 02-BRAND / BENCHMARKS; those documents must not contradict §1, §4, §5.

## 12. Evidence index (all fetched 2026-11-06 unless noted)

- `~/Desktop/career-hq/03-PROJECTS/PHASE4-PAIN-POINTS.md` — [PP]
- `~/Desktop/career-hq/03-PROJECTS/PHASE4-CATALOG.md` — [CAT]
- `~/Desktop/career-hq/03-PROJECTS/PHASE4-RESEARCH-DOSSIER.md` — [DOS]
- `~/Desktop/career-hq/03-PROJECTS/PHASE4-CLONE-ANALYSIS.md` — [CLN]
- `~/Desktop/career-hq/03-PROJECTS/PHASE3-MAP-UI-LIBS.md:91` + `PHASE3-IDEAS-AI-DEVTOOLS.md:16` — [CAL] star calibration
- `~/Desktop/orion-ui/README.md`, `~/Desktop/orion-ui/CONTRIBUTING.md` — repo state and workflow; repo source files checked via `find` 2026-11-06
