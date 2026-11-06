# 01 — Orion UI System Design

**Status:** v1 · 2026-11-06 · Maintainer: Natnael Mesele · License: MIT (`LICENSE`)
**Identity (locked, founder):** comprehensive, NOT agentic — a free (MIT), shadcn-based
registry of components **and full sections**; AI app UI ships first as wave 1
(`README.md:9,55`). Branding (`docs/02-BRAND.md`) is intentionally parked — out of scope here.

**Evidence legend** — cited throughout as GEN / CLONE / CENSUS:

- **GEN** = `~/Desktop/career-hq/03-PROJECTS/PHASE4-GENERATOR-DESIGN.md`
- **CLONE** = `~/Desktop/career-hq/03-PROJECTS/PHASE4-CLONE-ANALYSIS.md`
- **CENSUS** = `~/Desktop/career-hq/03-PROJECTS/PHASE4-CENSUS-REGISTRIES.md`
- Repo paths are relative to the repo root. Checks marked ✅ were executed during this
  design pass on 2026-11-06 (commands and outputs listed in §8).

## 1. Architecture — Turborepo + Yarn 4 monorepo

```
orion-ui/
├── apps/docs/                  # deployment surface: Next 16 + Fumadocs docs + /r/*.json
│   ├── app/                    # docs routes (app/docs/[[...slug]], Fumadocs MDX)
│   ├── content/docs/           # MDX pages (index.mdx records the 128-entry catalog)
│   └── public/r/               # ← registry build OUTPUT (created by scripts/build-registry.mjs)
├── packages/registry/          # SOURCE OF TRUTH for every component/section
│   ├── src/ui/                 # registry:ui sources (+ src/lib/utils.ts, src/index.ts)
│   ├── tests/                  # Vitest + Testing Library (test-first)
│   └── package.json            # @orion-ui/registry 0.1.0, workspace-only (never published)
├── scripts/build-registry.mjs  # the registry pipeline (§2)
├── .github/workflows/ci.yml    # CI (§4) — exists; evolution sketched there
├── turbo.json                  # task graph: build → test → lint
└── .yarn/releases/yarn-4.18.1.cjs  # vendored Yarn 4
```

Decisions, each founder-locked or verified in-repo:

1. **Turborepo + Yarn 4, Yarn vendored.** `package.json` pins `"packageManager": "yarn@4.18.1"`;
   `.yarnrc.yml` sets `yarnPath: .yarn/releases/yarn-4.18.1.cjs`, so every command runs the
   vendored binary via `node .yarn/releases/yarn-4.18.1.cjs …` — "no global install, no corepack
   needed" (`README.md:39-43`). Yarn-only is a founder constraint (GEN §0.1).
2. **PnP off.** `.yarnrc.yml` sets `nodeLinker: node-modules` — the shadcn CLI, Next, and
   Playwright ecosystems assume node_modules resolution (GEN §1).
3. **`apps/docs` = Next.js 16 + Fumadocs 16** — verified in `apps/docs/package.json`:
   `next 16.4.5`, `fumadocs-core`/`fumadocs-ui 16.18.1`, `fumadocs-mdx 15.5.0`,
   `react 19.3.1`, `tailwindcss 4.3.4`. Fumadocs is the founder choice with Kibo/Kokonut
   precedent (GEN §0.2). `next.config.mjs` transpiles the workspace registry package.
4. **`packages/registry` is the source of truth; docs consume it as a workspace dependency**
   (`@orion-ui/registry: workspace:*` in `apps/docs/package.json`). One versioned catalog, not
   one npm package per component — the anti-pattern Orion explicitly avoids (Kibo's 41 packages,
   cited in GEN §1 justification).
5. **Task graph** (`turbo.json`): `build` depends on `^build` and caches `.next/**`, `dist/**`,
   `public/r/**`; `test` depends on `^build` (registry JSON is built before tests); `dev` is
   uncached/persistent. Note: `lint` is declared but no workspace defines a `lint` script yet (§8).
6. **Waves.** Catalog of record: 128 entries — wave 1 AI app UI (41), advanced primitives (34),
   app sections (29), marketing (24) (`apps/docs/content/docs/index.mdx`). `README.md:48-52`
   still shows the earlier "100+" rounding — reconcile at catalog freeze (§8).

## 2. The registry pipeline

**Flow:** source in `packages/registry/src` → `scripts/build-registry.mjs` → official
shadcn registry-item JSON with source embedded → served statically from the docs app at
`/r/<slug>.json` → consumed by anyone via the shadcn CLI by URL:

```bash
npx shadcn@latest add https://orion-ui.vercel.app/r/button.json   # README.md:19
```

**Build script (current, verified):** `scripts/build-registry.mjs` reads each source file
(`button.tsx`), emits one JSON per item into `apps/docs/public/r/` (`scripts/build-registry.mjs:13`),
with `$schema`, `name`, `type`, `title`, `description`, `dependencies`, `registryDependencies`,
and `files[0].content` holding the full source (lines 29-54). ✅ Executed this session:
`node scripts/build-registry.mjs` → exit 0, `apps/docs/public/r/button.json` written;
**full draft-07 validation against the live-fetched `https://ui.shadcn.com/schema/registry-item.json`
PASSED** (schema fetched 10,075 B — byte-size matches CENSUS §1's record; validator: Python
`jsonschema` draft-07). Because the docs app is deployed, `public/r/*` ships on the same origin
as the docs — no npm, no API, no server (GEN §1; kokonut raw-URL pattern, GEN §0.3).

**Upgrade path — two steps, in order, per the shadcn blueprint (CLONE §3):**

1. **Zod validation before emit.** shadcn's own build validates every base against the registry
   schema (zod, from `shadcn/schema`) _before emitting_ and fails fast on drift
   (CLONE §3, their `build-registry.mts:886-894`). Orion's current guard is a jq smoke check in CI
   (`.github/workflows/ci.yml`, "Validate registry JSON" step); the planned upgrade is zod
   validation inside `build-registry.mjs` — already pre-registered as the example commit
   `build(scripts): zod-validate registry items before emit` (`CONTRIBUTING.md:96-99`).
2. **sha256 caching.** shadcn keys a transform cache on implementation+registry+style hashes
   with a manifest (CLONE §3, their lines 597-663). Orion adopts the same idea only when build
   time demands it (single source today, 128 at wave scale).

**Also planned as the registry grows (CLONE quality bar, §6):** auto-inject `dependencies` by
scanning file imports (CLONE §3 step 5 — `shadcn add` must never miss a package); emit an
`index.json` with per-item `meta.links` (CLONE §8.4); sharded lazy maps for docs previews once
the catalog passes ~100 components (CLONE §8.3); `llms.txt` / LLM surface generated in the same
build (CLONE §4; GEN §5 "`.md` twin for agents").

**Namespacing status (decision pending).** GEN §0.3 locks a namespaced `@orion/<name>` backbone
(coss/cult/reui converge on it); Run 0 currently emits **plain names** (`name: "button"`,
verified above) consumed by URL — the same shape shadcn itself emits (CLONE §8.2). Plain-name +
URL is sufficient for launch; whether to switch entry names to `@orion/*` is an open founder
decision, not silently assumed either way here.

## 3. Component anatomy contract

Every `registry:ui` component follows the shadcn v4 anatomy recorded in CLONE §2 and already
implemented by the reference implementation, `packages/registry/src/ui/button.tsx`:

| Rule                                                                          | Why (CLONE §2 evidence)                                                                                    | Button proof                                                            |
| ----------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------- |
| **No `forwardRef`** — plain function, `React.ComponentProps<'el'>` props      | shadcn v4 dropped forwardRef/interface-extends; React 19 passes `ref` as a prop                            | `button.tsx:53-62`                                                      |
| **`data-slot` + `data-variant` + `data-size` on every rendered element**      | styling/test hooks for descendants                                                                         | `button.tsx:67-69`                                                      |
| **cva variants with consumer `className` merged LAST**                        | consumer overrides win                                                                                     | `button.tsx:70` — `cn(buttonVariants({ variant, size, className }))`    |
| **`radix-ui` monopackage** for primitives (`import { Slot } from 'radix-ui'`) | shadcn v4 imports Slot from the monopackage, not per-package                                               | `button.tsx:2`; dep `radix-ui 1.8.1` (`packages/registry/package.json`) |
| **JSDoc on every component and every exported variant fn**                    | shadcn ships **zero** JSDoc, magicui ships full prop docs — Orion closes the gap deliberately (CLONE §7.4) | `button.tsx:7-10,38-52`                                                 |
| Export both component and `<x>Variants`                                       | consumers compose custom elements                                                                          | `button.tsx:76`                                                         |

Additional standing rules: `asChild` via Slot (`button.tsx:63`); semantic tokens only
(`bg-primary`, `ring-ring/50`) — never hardcoded hex/palette classes in sources (GEN §2 step 3
checklist; CLONE §6.3); axe-checked with an a11y note per component (CLONE §7.5); typed props,
dark/light parity, WCAG AA keyboard+focus (`CONTRIBUTING.md:127-133` definition of done).

⚠ Supersedes GEN §3.1: the generator template still shows the forwardRef-era skeleton; the
shipped Run 0 anatomy above is authoritative. The generator (`gen.mjs`, GEN §3) must be updated
to this contract before its first run.

## 4. CI design

**Exists today** (`.github/workflows/ci.yml`, verified): on `push→main` + every PR →
checkout → `setup-node@v4` (node 22) → `node .yarn/releases/yarn-4.18.1.cjs install` →
`turbo run test` (TDD gate) → `turbo run build` (registry + docs) → jq smoke-validation of
every `apps/docs/public/r/*.json` (`.name and .type and .files[0].content`).

**Evolution (target state, GEN §4):** one `verify` pipeline in dependency order —
`lint typecheck test --affected` → `validate:registry` (official-schema + lint: names unique,
`categories` from controlled vocabulary, `meta.wave` set, `cssVars` shape `{theme,light,dark}`
when present — CENSUS §1.2 for the cssVars shape) → `build` → `test:visual` (Playwright,
`webServer = next start`) → Vercel docs-preview + PR comment. `fetch-depth: 0` enables
`turbo --affected`. On merge to `main`, `release.yml` runs changesets: version PR → tag →
`vercel --prod` → uptime curls of `/r/registry.json` + sitemap; a weekly cron adds Lighthouse +
link checks. The uptime check is non-negotiable positioning: Kibo's months-old 500 and broken
sitemap are the cautionary tale (GEN §2 step 7). Turbo order is enforced via `dependsOn`
(`turbo.json:3-15`; GEN §4 order: test → validate → build → visual).

**Commit protocol is part of CI's contract:** conventional commits with fixed scopes
(`registry`, `docs`, `scripts`, `ci`, `deps`, `repo`, `brand`), atomic commits (component +
test ship together), each commit green (`CONTRIBUTING.md:18-113`). Branch protection on `main`,
PR-only landings (`CONTRIBUTING.md:20-21`) — requires the GitHub repo to exist (§8: not yet a
git repository on this machine).

## 5. The TDD run card — 7 steps per component/section

Canonical checklist (GEN §2); `CONTRIBUTING.md:117` points here. A failing gate = stop.

| #   | Step                                                                                                                                                                   | Gate command                                 | Status in repo today                                                                                                                       |
| --- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------ |
| 0   | **GEN** — scaffold files + card (`yarn gen component <slug> --wave N`; designed GEN §3, not yet built — Run 0 was manual)                                              | files exist, RED test in place               | gen.mjs absent                                                                                                                             |
| 1   | **RED** — test written first: render, variants, keyboard, axe, dark hook                                                                                               | `yarn vitest run` → **fails**                | vitest 5.1.0 + RTL configured; Button has 5 passing-by-design cases (`packages/registry/tests/button.test.tsx`) — not run this session, §8 |
| 2   | **GREEN** — implement on the shadcn base (§3 contract)                                                                                                                 | same command → **passes**                    | proven by Button                                                                                                                           |
| 3   | **VISUAL** — light+dark screenshots at 1280px (sections also 768/375); 5-point brand-token check (chroma-0 neutrals, one accent, parity, no hardcoded hex, focus ring) | `yarn playwright test … && yarn check:brand` | Playwright + check-brand not yet in repo                                                                                                   |
| 4   | **DOCS** — MDX page with live preview + auto-generated code (never hand-maintained)                                                                                    | `yarn build && open /docs/components/<slug>` | Button MDX live-renders via workspace import (`content/docs/ui/button.mdx`); `ComponentPreview` reading `/r/*.json` not yet built          |
| 5   | **REGISTRY** — entry validates: official schema + lint                                                                                                                 | `yarn validate:registry`                     | jq smoke check in CI ✅; zod validate:registry pending (§2)                                                                                |
| 6   | **RELEASE** — changeset stub, semver: new item = minor, variant/example = patch, breaking = major                                                                      | `yarn changeset status`                      | `.changeset/` not yet set up                                                                                                               |
| 7   | **SHIP** — PR CI green → docs preview URL → merge → release tags + prod deploy                                                                                         | CI green; tag exists                         | CI exists; release/uptime workflows pending                                                                                                |

Run 0 exit criteria (clean-clone install, RED commit in history, deployed `/r` curl, throwaway
install test, `yarn verify` alias) are listed in GEN §1b and remain the bar before wave
production. Sections (`registry:block`) reuse the same card with differences per GEN §6:
multi-file `src/blocks/<slug>/`, upward-only `registryDependencies` (validated against the five
address forms, CENSUS §1.2), content-slot tests + anti-drift smoke test, 6 screenshots
(3 widths × light/dark), and wave gating (a section wave lands only after its component wave).

## 6. Deployment — Vercel, free tier

- **Only `apps/docs` deploys** — it is the entire public surface: docs, live previews, and
  `public/r/*.json` registry JSON on one origin (GEN §1; build output verified above).
- Install URL of record: `https://orion-ui.vercel.app/r/<slug>.json` (`README.md:19`).
- Hobby (free) tier is the founder's stated plan; **quota specifics were never verified** —
  GEN's sources explicitly leave Vercel Hobby limits unclaimed. Bandwidth risk grows with the
  registry JSON payload and screenshot traffic; revisit if `/r` traffic or weekly uptime curls
  approach unverified limits.
- `vercel-action` with `github-comment: true` posts preview URLs per PR (GEN §4, step 7).

## 7. npm deferral decision (recorded)

**npm publishing is deferred.** The URL-based registry needs no npm packages at launch —
consumers install source code via `npx shadcn@latest add <URL>` and own it with zero runtime
dependency (README.md:18-23; GEN §1 "npm publishing stays deferred — founder rule: free, no
runtime dependency"). Founder decision (this ask, 2026-11-06): the `@orion-ui` npm scope is
**not claimable now**; the fallback scope (if runtime packages like shadcn's `@shadcn/react`
are ever warranted, CLONE §6.14) is deferred for the founder to decide later. The workspace-only
`@orion-ui/registry` / `@orion-ui/docs` package names (private, `workspace:*`) are internal and
unaffected. Revisit only for complex interactive logic worth a runtime package.

## 8. Current state vs. this design (honest gaps, checked 2026-11-06)

✅ **Checks run this session** (exact commands):

- `node scripts/build-registry.mjs` → exit 0, `built …/apps/docs/public/r/button.json`,
  "registry build complete: 1 item(s)".
- `curl -s https://ui.shadcn.com/schema/registry-item.json` → 10,075 bytes; then
  `python3 -I` + `jsonschema.validate` → **"FULL draft-07 VALIDATION PASSED"** for
  `button.json` (name `button`, type `registry:ui`, deps `radix-ui`+`class-variance-authority`,
  2,609-char embedded source).
- Read: all files in §legend plus `packages/registry/{package.json,tests/*}`,
  `apps/docs/{package.json,next.config.mjs,source.config.ts,content/**}`, `.gitignore`,
  `.github/workflows/ci.yml`, `.yarnrc.yml`.

❌ **Not verified / not done:**

- **Not a git repository yet** — `git log` fails ("fatal: not a git repository"). CI,
  branch protection, RED-commit history, and the Run 0 clean-clone criterion all presuppose the
  GitHub repo (`github.com/natinium/orion-ui`, `CONTRIBUTING.md:12`).
- **No install state** — no `yarn.lock`, no `node_modules`; `yarn turbo run test` fails with
  "run yarn install to update the lockfile". **Tests were NOT run this session.**
- Not yet built: `gen.mjs`, Playwright visual step, `check:brand`, `validate:registry` (zod),
  changesets, `release.yml`/uptime cron, `ComponentPreview`, `docs/00-PRD.md` (referenced by
  `CONTRIBUTING.md:119`), `docs/02-BRAND.md` (parked).
- Catalog numbers differ (README "100+"/"~25 wave 1" vs index.mdx "128"/41) — reconcile once.

## 9. Sources

GEN / CLONE / CENSUS as defined above (all their external values were fetched 2026-11-06 by
earlier passes and are quoted there; the secondhand claims this doc inherits — Fumadocs
precedent, Kibo uptime incident, Vercel Hobby limits — are flagged at point of use). Repo
claims cite in-repo files by path:line. Schema validity was re-verified live this session (§8).
