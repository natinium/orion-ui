# Orion UI — 04 · Launch Kit

**Date:** 2026-11-06 · **Branding:** parked (02-BRAND) — copy below is brand-neutral; scope wording follows the locked positioning line (DOSSIER §4.2). Numbering follows the doc slots referenced in `CONTRIBUTING.md` (00-PRD, 01-DESIGN, 02-BRAND, 03-BENCHMARKS — siblings not yet in-repo).

**Repo state when written:** Run 0 — Button is the only shipped component (`packages/registry/src/ui/button.tsx`, docs page `apps/docs/content/docs/ui/button.mdx`); install today is raw-URL only (`README.md:19`).
**Evidence sources** (all mined/fetched 2026-11-06, paths under `~/Desktop/career-hq/03-PROJECTS/`):
`PHASE4-PAIN-POINTS.md` ("PAIN-POINTS") · `PHASE4-RESEARCH-DOSSIER.md` ("DOSSIER") · `PHASE4-CLONE-ANALYSIS.md` ("CLONE") · `PHASE3-SCOUT-HN.md` ("HN-SCOUT").

---

## 1 · Launch Promises — the top 10

One sentence each, with the pain it answers linked. Counts are as of the 2026-11-06 mine — re-verify on launch day (see Notes).

1. **The most-requested missing components ship first** — multi-select, keyboard/range date picker, bottom nav, tab nav — so nobody has to copy code out of a GitHub comment thread again.
   → [shadcn-ui/ui#66 "Multi select?"](https://github.com/shadcn-ui/ui/issues/66): 306 reactions, 108 comments, open since 2023-02-08 (PAIN-POINTS §1).

2. **Tailwind v4-native, forever** — CSS-first `@theme` tokens, keyframes embedded per item, zero `tailwind.config` dependency, and opinionated defaults stated openly instead of inherited silently.
   → [#6843](https://github.com/shadcn-ui/ui/issues/6843) (130 rxn), [#6446](https://github.com/shadcn-ui/ui/issues/6446) (69 rxn), magicui [#548](https://github.com/magicuidesign/magicui/issues/548) — "tailwind.config.ts is no longer a thing in Tailwind v4 but Magic UI still expects it" (PAIN-POINTS §2).

3. **Dark mode is a release gate** — every component is screenshot-tested in light AND dark in CI, and a dark-mode bug blocks the release.
   → [#5552](https://github.com/shadcn-ui/ui/issues/5552) (99 rxn, hydration), [#8640](https://github.com/shadcn-ui/ui/issues/8640) (select popup white in dark), [#7233](https://github.com/shadcn-ui/ui/issues/7233), [#7646](https://github.com/shadcn-ui/ui/issues/7646) (calendar dropdown invisible in dark) (PAIN-POINTS §3).

4. **The registry never holds you hostage** — `/r` is served from a static CDN with a GitHub-raw fallback, and every component's full source stays copy-pasteable on its docs page, so a CLI or CDN outage costs nothing.
   → [#9400](https://github.com/shadcn-ui/ui/issues/9400) (68 comments; the registry URL itself 404ing), [#4712](https://github.com/shadcn-ui/ui/issues/4712) (41 comments), [#7672](https://github.com/shadcn-ui/ui/issues/7672) (`--overwrite` ignored) (PAIN-POINTS §5).

5. **Preview = installed artifact** — the live preview, the code block, and the CLI payload are generated from the same registry artifact per release, with "last updated" + tested-with versions on every docs page.
   → [#8359](https://github.com/shadcn-ui/ui/issues/8359) — "the generated code differs from the version shown on the documentation site" (PAIN-POINTS §6).

6. **100% free sections** — marketing, dashboard and AI-app sections are MIT with no email gate, no pro tier, no licence asterisk.
   → Aceternity gates the wanted sections behind Pro (~$169/yr individual, redistribution-restricted licence) (PAIN-POINTS §10; the sections-tier-is-the-paid-product pattern: DOSSIER §1, §4.10).

7. **Namespaced installs** — every item installs as `npx shadcn@latest add @orion/<slug>`, so Orion pieces can't collide with shadcn's or another registry's inside a multi-registry project.
   → Namespace-limitation pain documented via the official namespace docs + issue [#2525](https://github.com/shadcn-ui/ui/issues/2525) (PAIN-POINTS lines 189–190; that file notes the keyword search timed out and findings came from these sources instead); `@orion/` verified unused by every fetched competitor (DOSSIER §4.1); namespaced `@namespace/item` addresses are part of the official CLI schema (CENSUS lines 38, 59).

8. **Documented like a library, not a gist** — JSDoc on every exported prop plus generated props tables, because copy-paste hands you code you now own, and shadcn's own components ship zero JSDoc.
   → "JSDoc density: zero in shadcn components (12 comment lines in 729-line sidebar.tsx)" / "Orion: TSDoc on every prop + generated props tables in docs" (CLONE lines 39, 113); already true in the shipped Button (`packages/registry/src/ui/button.tsx:38-52`).

9. **Accessibility is a matrix, not a footnote** — axe-core runs in CI per component, form primitives wire `aria-invalid`/`aria-describedby`/`aria-required` automatically, and docs pages carry keyboard + screen-reader notes.
   → [#8431](https://github.com/shadcn-ui/ui/issues/8431), [#8377](https://github.com/shadcn-ui/ui/issues/8377), [#9249](https://github.com/shadcn-ui/ui/issues/9249), [#5746](https://github.com/shadcn-ui/ui/issues/5746) (49 rxn — mobile Sidebar crashes without a manually-added DialogTitle) (PAIN-POINTS §12).

10. **Freshness is published, not implied** — per-item "last updated" and tested-with versions plus a public status/uptime line for `/r`, sitemap and MCP, because a registry you can't tell is alive isn't a registry.
    → Kibo pushed 2026-05-04 (stale ~6 mo), Tremor 2025-10-10 (fetched push dates: DOSSIER §0 table, §1); "no peer publishes a status line" (DOSSIER §4.4, R5); "last updated" on docs (PAIN-POINTS §6 fix).

---

## 2 · Show HN post draft

**Title** (80 chars; number-in-title per HN-SCOUT line 55: "a number in the title ('53% → 99%') is instant credibility — benchmarks ARE the marketing on HN"):

> Show HN: Orion UI – free MIT shadcn registry starting with the 306-reaction fix

**Body** (143 words; plain text, links inline on HN):

```
Orion UI is a free (MIT), shadcn-based registry of components and full
sections, installed with the shadcn CLI you already use.

It started from the issue tracker. shadcn/ui's most-reacted open issue is a
missing component — multi-select: 306 reactions, 108 comments, open since Feb
2023, with people copy-pasting implementations out of the thread. Orion ships
that first, plus the other most-wanted pieces, then full app sections and
AI-app UI.

How it's different: Tailwind v4-native only (CSS-first @theme, no
tailwind.config); every component screenshot-tested in light and dark before
release; docs previews generated from the exact artifact the CLI installs;
every prop JSDoc-documented; sections 100% free — no pro tier, no email gate.

Status: early — Button is live, more components land wave by wave. Benchmarks
(install time, axe a11y, light/dark visual parity) publish as they run.

Repo: <link>. Docs: <link>. Feedback welcome — especially on the AI wave.
```

**Pre-flight gate — all must be true before posting:**

- [ ] Every component the body names is live and installable on the docs site (today: Button only — verified 2026-11-06).
- [ ] The 306/108 counts re-fetched day-of (drift; source numbers are from the 2026-11-06 mine, PAIN-POINTS line 3).
- [ ] `<link>`s point at the final repo/docs URLs.
- [ ] First comment carries the promises list + the four published benchmarks (install time, Lighthouse, per-item quality gate, freshness/status — DOSSIER §4.4); "Benchmarks or it didn't happen" is a project principle (README line 57).

---

## 3 · Product Hunt copy

**Tagline / one-liner** (60 chars, sized to PH's tagline cap — platform convention, not re-verified today):

> Free (MIT) shadcn registry: components, sections & AI app UI

**Description:**

> Orion UI is a free, MIT-licensed, shadcn-based registry: production components, full app sections and AI-app UI, installed with the shadcn CLI you already use (`npx shadcn@latest add @orion/<slug>`). It starts from the gaps shadcn users have waited on for years — the multi-select request has 306 reactions and has been open since Feb 2023 — and commits to Tailwind v4-native code, light+dark screenshot gates, docs generated from the exact installed artifact, and 100% free sections. No pro tier, no email gate.

**Notes:** scope claims are the locked positioning line, narrowed only to fit the tagline cap (DOSSIER §4.2 allows wording polish, not scope change). "Waited on for years" is date arithmetic from the linked issue (2023-02-08 → 2026), not a survey claim. Post at the same gate as the HN draft.

---

## 4 · README "Why Orion?" — paste-ready

````markdown
## Why Orion?

shadcn/ui's most-reacted open issue is a missing component —
[multi-select (#66)](https://github.com/shadcn-ui/ui/issues/66): 306 reactions,
108 comments, open since Feb 2023, with people copy-pasting implementations out
of the thread. Orion exists so the most-wanted pieces ship as first-class
registry items instead. Every wave is held to these commitments:

1. **The most-requested components ship first** — multi-select, keyboard/range
   date picker, bottom nav, tab nav — so nobody scrapes a comment thread for UI.
2. **Tailwind v4-native, forever.** CSS-first `@theme` tokens, keyframes embedded
   per item, zero `tailwind.config` dependency; opinionated defaults are stated,
   not inherited silently.
3. **Docs that can't lie.** The live preview, the code block, and the CLI payload
   are built from the same registry artifact per release — what you preview is
   what you install.
4. **Dark mode is a release gate.** Every component is screenshot-tested in light
   and dark; a dark-mode bug blocks the release.
5. **The registry never holds you hostage.** Static CDN with a GitHub fallback,
   and full source always copy-pasteable on the docs page — a CLI outage costs
   you nothing.
6. **Namespaced installs.** `npx shadcn@latest add @orion/<slug>` — Orion items
   can't collide with shadcn's or another registry's in the same project.
7. **Documented like a library, not a gist.** JSDoc on every exported prop and
   generated props tables in the docs — you own the code, so the code explains
   itself.
8. **Accessibility is a matrix, not a footnote.** axe-core in CI per component,
   `aria-invalid`/`aria-describedby` wired into form primitives, keyboard and
   screen-reader notes on every docs page.
9. **Freshness, published.** Per-item "last updated" and tested-with versions,
   plus a public status line — a registry you can't trust to be alive isn't one.
10. **100% MIT. Everything.** Sections, dashboard and AI-app surfaces included —
    no pro tier, no email gate, no licence asterisk.

> Status today: **Run 0** — the vertical slice (repo, docs, registry pipeline,
> Button) is live; waves land per the [roadmap](#roadmap). The promises above are
> the bar each wave must clear before it ships.
````

---

## 5 · Notes & open flags (truth rules)

- **Only Button ships today** — verified 2026-11-06 by repo listing (`packages/registry/src/ui/button.tsx` is the sole file in `src/ui/`, with `tests/button.test.tsx` and docs `ui/button.mdx`). All launch copy is gated on the promised components actually existing.
- **Catalog-count discrepancy to reconcile before copy ships:** the README roadmap says ~100 blocks (`README.md:48-51`: ~25/~30/~25/~20) while the verified catalog counts **128 entries across 4 waves** (41/34/29/24 — DOSSIER §2, grep re-run documented there). Founder decides which number public copy uses; do not mix them.
- **Raw-URL vs namespaced install:** the repo currently exposes raw-URL install only (`README.md:19`); `@orion/<slug>` becomes the primary command once the namespaced index ships (DOSSIER §4.3). Promise 7 is a commitment, not current behavior — launch copy should not present it as live until then.
- **All counts drift.** 306/108 (#66), 782 open issues, star counts — every number in this file is as of the 2026-11-06 mine; re-verify day-of (PAIN-POINTS line 3; HN-SCOUT line 5).
- **Vendor claims stay flagged.** Competitor marketplace counts (Shadcnblocks 2,636 self-claimed, etc.) are excluded from all copy above per DOSSIER R4/R8.
- **Branding parked.** All copy is deliberately brand-neutral; final voice pass happens after the founder approves the brand preview and 02-BRAND is written (DOSSIER §4.8).
