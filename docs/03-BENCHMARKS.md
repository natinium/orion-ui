# 03 — Benchmarks: the numbers Orion publishes

Orion's principle 3: "Benchmarks or it didn't happen. Install time, bundle size,
accessibility score — published." (README.md:58). This doc fixes the five
benchmarks Orion commits to: what each measures, the command, the comparator,
where it is published, and its status today.

**Status: Run 0** — one component (Button) exists; no comparator has been
measured by us yet; benchmark scripts land in Wave 1. Numbers marked **[seed]**
were hand-measured on 2026-11-06 only to pin the method — they are not the
published record (see "The honesty rule").

## Run 0 scoreboard (honest states, 2026-11-06)

| #   | Benchmark              | Target                                                 | Status today                                             |
| --- | ---------------------- | ------------------------------------------------------ | -------------------------------------------------------- |
| 1   | Registry install time  | median ≤ official shadcn median + run noise; published | not measured (no script)                                 |
| 2   | Bundle size per item   | published vs shadcn equivalent; >5% regression gated   | [seed] Button 10,859 B gzip (hand-run, not CI)           |
| 3   | axe-core violations    | 0, whole catalog, light + dark                         | not wired; vitest suite cannot start (unmet `vite` peer) |
| 4   | Docs Lighthouse        | all 4 categories ≥ 95                                  | not run; no Lighthouse step in CI                        |
| 5   | TS strict + zero `any` | 0 errors · 0 `any`                                     | `any`: 0 ✓ · strict: 3 errors, published as broken       |

## The honesty rule (applies to all five)

1. Every published number is emitted by a CI script into
   `apps/docs/public/benchmarks/*.json`. Humans never type numbers into docs,
   README, or badges; a PR that edits a number by hand is rejected.
2. Each number and each badge on `/docs/benchmarks` links to the workflow run
   that produced it (run URL is part of the emitted JSON).
3. A benchmark that cannot run shows the badge state `not measured` — no
   placeholders, no stale numbers: the page renders what the latest green run
   wrote, or nothing.
4. Comparator numbers come from the same script, machine, network, interleaved runs
   — never quoted from third-party pages.
5. Failures are published, not hidden; regressions open a `perf:`/`fix:` issue
   (CONTRIBUTING.md:50 already requires benchmarks in every `perf` commit body).

## 1. Registry install time

- **What:** wall-clock seconds of a full real install — `npx shadcn@latest add
  <url>` from a throwaway app, end to end (URL/name addressing verified:
  PHASE4-CENSUS-REGISTRIES.md §1.3).
- **Method (command):** `node scripts/bench-install.mjs --runs 5` (Wave 1; CI
  job `benchmarks-install`). Per run: fresh temp dir, cold npx cache, scaffolded
  Vite React-TS app + `components.json`, CLI invocation timed. Targets run
  interleaved A/B/A/B to cancel network drift; runner region + CLI version
  recorded in the run JSON.
- **Comparator:** (a) official shadcn — `npx shadcn@latest add button`
  (new-york-v4); (b) MagicUI — `npx shadcn@latest add
  "https://magicui.design/r/border-beam"`. Pinned refs recorded per run.
- **Target:** publish the 5-run median per target. Orion's median must be within
  the interleaved runs' noise band (max−min) of the official shadcn median —
  both sides are static JSON fetched by the same CLI, so parity is the
  expectation; any gap is investigated, never explained away.
- **Published at:** `/docs/benchmarks` table + badge
  `install | orion Xs · shadcn Ys · magicui Zs` (shields endpoint badge reading
  `benchmarks/install.json`).
- **Status:** not measured. `scripts/` contains only `build-registry.mjs`.

## 2. Component bundle size per item

- **What:** gzip kB of a minified browser bundle importing only the item —
  the code a user's app gains by installing that one component.
- **Method (command):** `node scripts/bench-bundle.mjs` (Wave 1; CI job
  `benchmarks-bundle`). Entry file re-exports the item only
  (`export { Button } from '@orion-ui/registry/src/ui/button'`), bundled with
  `esbuild --bundle --minify --format=esm --platform=browser --external:react`,
  then `gzip -9`. react stays external — it is shared runtime, not item cost.
- **Comparator:** the shadcn equivalent source (pinned SHA), bundled through the
  identical pipeline with the same externals. Fairness note from the [seed]
  finding: the shared `cn` layer (clsx + tailwind-merge) dominates item size,
  and shadcn v4 components carry the same layer (they import the published `cn`
  package — PHASE4-CLONE-ANALYSIS.md §2), so both sides include it.
- **[seed] measured 2026-11-06 by hand (method-pinning, not CI):**
  - Button item (react external): 33,178 B raw · **10,859 B gzip** —
    `node_modules/.bin/esbuild <entry.ts> --bundle --minify --format=esm
    --platform=browser --external:react` → `gzip -9 -c | wc -c`.
  - `cn` util alone: 27,773 B raw · 8,553 B gzip → item-unique cost ≈ 2.3 kB
    gzip (Slot + cva + component code).
- **Target:** per-item gzip published next to the shadcn equivalent. Between
  releases, an item's gzip must not regress >5% without a `perf(registry):`
  commit whose body carries the benchmark.
- **Published at:** per-component docs badge (`gzip: 10.9 kB`) + full table on
  `/docs/benchmarks` (`benchmarks/bundle.json`).
- **Status:** seed only; CI script and comparator runs not yet built.

## 3. Accessibility — axe-core violations = 0

- **What:** zero axe-core violations across the whole catalog, matrix per
  component, light AND dark. This is a merge gate, not a display score.
  Evidence it is a real differentiator: shadcn form-a11y issues #8431/#8377/#9249
  with fix "axe-core checks in CI per component" (PHASE4-PAIN-POINTS.md #12),
  and "No a11y audit artifacts anywhere" among competitors
  (PHASE4-CLONE-ANALYSIS.md §7.5).
- **Method (command):** Vitest + axe-core. `packages/registry/tests/a11y/*.a11y.test.tsx`
  renders every variant of the item inside light and dark theme wrappers and
  asserts `await axe(container)` has no violations; the specs run inside
  `node .yarn/releases/yarn-4.18.1.cjs turbo run test`, so a violation fails CI.
  `node scripts/bench-a11y-report.mjs` (Wave 1) assembles the
  component × theme × violations matrix into `benchmarks/a11y.json`.
- **Comparator:** none — the bar is absolute (0). Overlay components
  additionally render inside Dialog/Sheet/Popover compositions
  (PHASE4-PAIN-POINTS.md #7 launch gate), and dark-mode bugs are release
  blockers per the same file (#3).
- **Target:** 0 violations · every component · both themes · every commit.
- **Published at:** `/docs/benchmarks` matrix + badge
  `a11y | 0 violations · N components`.
- **Status:** axe not wired yet. The TDD suite already asserts roles
  (`packages/registry/tests/button.test.tsx` uses `getByRole`) and the
  definition of done requires "Dark/light parity · WCAG AA keyboard + focus"
  (CONTRIBUTING.md:131). Honest blocker: in this environment `turbo run test`
  fails at startup — vitest@5.1.0 declares peer `vite ^6–8` but the lockfile
  has no `vite` entry (Yarn YN0002); `@testing-library/dom` (RTL 16 peer) is
  also absent. Published as debt, not assumed green.

## 4. Docs-site Lighthouse

- **What:** Lighthouse Performance / Accessibility / Best-Practices / SEO,
  each ≥ 95, on the deployed docs site. Routine precedent: assistant-ui runs
  docs Lighthouse in CI weekly (PHASE4-ANALYSIS-MIDTIER.md §7, §9.8).
- **Method (command):** Lighthouse CI against the production docs build —
  `next build && next start`, then `npx -y @lhci/cli@<pinned> autorun`;
  `lighthouserc` pins audited URLs (`/`, `/docs`, `/docs/ui/<item>` of the latest
  wave), asserts all four categories ≥ 95, and stores the HTML report as artifact.
- **Comparator:** none — absolute bar.
- **Target:** ≥ 95 in all four categories on every audited page. A dip fails
  the release job until fixed or explicitly waived in a `docs:` commit saying why.
- **Published at:** `/docs/benchmarks` + four badges from
  `benchmarks/lighthouse.json`.
- **Status:** not run. `.github/workflows/ci.yml` today runs test → build →
  jq registry validation only; no Lighthouse step exists.

## 5. TypeScript strict-clean + zero `any`

- **What:** two counters, both must read zero, both CI-enforced:
  (a) `tsc --noEmit` errors across `packages/registry` (`strict: true` is
  already set in `packages/registry/tsconfig.json`);
  (b) count of `any` in `packages/registry/src/**` and `scripts/**`
  (scan below; `@typescript-eslint/no-explicit-any` takes over when ESLint lands).
- **Method (command):** CI job `typecheck`:

  ```
  node node_modules/typescript/bin/tsc --noEmit -p packages/registry/tsconfig.json
  grep -rnE ':\s*any\b|as any\b|<any>|any\[\]' packages/registry/src/ scripts/ | wc -l   # must be 0
  ```

  The script writes the count to `benchmarks/types.json`; the badge reads that
  file — the docs page never hand-edits it.
- **Comparator:** none — absolute bar. Context: shadcn ships no component-level tests
  and leans on types (PHASE4-CLONE-ANALYSIS.md §5); strict types are the floor, our TDD suite the ceiling.
- **Target:** 0 strict errors · 0 `any`, every commit.
- **Published at:** badge `types | strict · any: 0` + row on `/docs/benchmarks`.
- **Status (measured this session, 2026-11-06):**
  - `any` scan: **0 matches** in `packages/registry/src/`, `tests/`, `scripts/` ✓
  - strict: **fails today** — `tsc --noEmit -p packages/registry/tsconfig.json`
    exits 2 with 3 errors: `src/ui/button.tsx:66` (`Comp` JSX type — the
    `radix-ui` monopackage namespace `Slot` where shadcn's anatomy uses
    `Slot.Root`, PHASE4-CLONE-ANALYSIS.md §2) and `tests/button.test.tsx:2`
    (`screen` typing — RTL 16 peer `@testing-library/dom` not installed).
    CI does not run tsc yet; per the honesty rule the baseline is published as
    broken, and the fixes land before the badge exists.

## Publication & enforcement, concretely

- CI gains benchmark jobs in Wave 1: install time (release + nightly), bundle
  size (every registry PR), a11y matrix (every PR), Lighthouse (release +
  weekly cron), typecheck/`any` (every PR).
- Scripts write `apps/docs/public/benchmarks/*.json`; `/docs/benchmarks` renders
  from those files; badges are shields endpoint badges over the deployed JSON;
  every number links to its workflow run. A number without a green run behind it
  does not exist — `not measured` is the only alternative state.

## What this doc does not claim

- No Orion-vs-comparator numbers exist yet. Install time and bundle-size
  comparators are unmeasured; [seed] numbers are hand-run one-offs from this
  machine, included to pin the method, not as the record.
- Third-party figures in the PHASE4 research files (stars, registry sizes,
  peers' CI habits) are context, never Orion benchmarks.
- The scripts and CI jobs named are Wave 1 commitments, not present code —
  except `scripts/build-registry.mjs`, already jq-validated in CI.
