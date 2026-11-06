# ◆◆◆ orion ui

**One registry. Every block your web app needs.**

Orion UI is a comprehensive, free, open-source **shadcn-based registry** — production-grade
components, full app sections, and marketing blocks, installable with the shadcn CLI and
customizable because you own the code.

- AI app UI ships first (wave 1): streaming chat, agent traces, model pickers, token meters.
- Then advanced primitives, app sections, and marketing — 100+ blocks across 4 waves.
- 100% MIT. No paywalled tiers. Built in the open with TDD and published benchmarks.

> Status: **Run 0** — vertical slice (repo + docs + registry + first component, deployed and
> verified end to end) before mass production begins. See the [roadmap](#roadmap).

## Install (once the registry has components)

```bash
npx shadcn@latest add https://orion-ui.vercel.app/r/button.json
```

Components land in your project as source code you own — no runtime dependency, no lock-in.

## Structure

```
apps/docs            → documentation + live previews (Next.js + Fumadocs)
packages/registry    → component sources (the source of truth)
  src/ui/            → registry components (wave files mirrored from the catalog)
  tests/             → Vitest + Testing Library (TDD: the test is written first)
scripts/             → registry build (emits shadcn-schema JSON with embedded source)
```

Monorepo: **Turborepo + Yarn 4** · Docs: **Fumadocs** · Styling: **Tailwind v4**

## Development

```bash
node .yarn/releases/yarn-4.18.1.cjs install
node .yarn/releases/yarn-4.18.1.cjs turbo run test build
```

(Yarn 4 is vendored in `.yarn/releases/` — no global install, no corepack needed.)

## Roadmap

- **Run 0** — vertical slice: docs + registry + Button, deployed and E2E-verified ← *you are here*
- **Wave 1** — AI app UI (~25 blocks): chat, agent traces, model pickers, token meters
- **Wave 2** — advanced primitives (~30)
- **Wave 3** — app sections (~25)
- **Wave 4** — marketing sections (~20)

## Principles

1. **Comprehensive, not agentic.** AI UI is wave 1 — the library covers everything a web app needs.
2. **Free forever.** MIT, no paywalled tiers. Templates may come later; components never.
3. **Benchmarks or it didn't happen.** Install time, bundle size, accessibility score — published.
4. **TDD.** The test is written before the component. Every run. No exceptions.

---

MIT © 2026 [Natnael Mesele](https://github.com/natinium)
