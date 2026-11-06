# Contributing to Orion UI

First: thank you. This project is built in the open, and every merge makes it better.

This guide defines **how we commit**. It is not optional — the commit history IS the
changelog, the audit trail, and the release pipeline. If a change can't be described
by a clean conventional commit, it isn't ready.

## Getting started

```bash
git clone https://github.com/natinium/orion-ui
cd orion-ui
node .yarn/releases/yarn-4.18.1.cjs install   # Yarn 4 is vendored — no global install
node .yarn/releases/yarn-4.18.1.cjs turbo run test
```

## Branches

- `main` is protected. All changes land via PR (or atomic push sequences by the maintainer).
- Branch names: `<type>/<scope>-<slug>` — e.g. `feat/registry-chat-stream`, `fix/docs-install-url`.

## Atomic commits

**One commit = one logical change.** If a commit needs "and" to describe it, split it.

- A component and its test ship in the SAME commit (TDD pair — the test proves the change).
- Never mix concerns: a dependency bump is its own commit, not a rider on a feature.
- Never commit commented-out code, TODO-only stubs, or unrelated formatting.
- Each commit must leave the repo green: `turbo run test` passes at that commit.

## Conventional Commits

Format:

```
<type>(<scope>): <subject>

[optional body: what and why]

[optional footer(s): BREAKING CHANGE, refs]
```

### Types

| Type       | Meaning                                                   | Version impact |
| ---------- | --------------------------------------------------------- | -------------- |
| `feat`     | New component, section, or capability                     | MINOR          |
| `fix`      | Bug fix in existing code                                  | PATCH          |
| `perf`     | Performance improvement (benchmarks in body)              | PATCH          |
| `docs`     | Documentation only (README, docs site content)            | —              |
| `test`     | Tests only (adding/adjusting tests, no production change) | —              |
| `refactor` | Code change that is neither feat nor fix                  | —              |
| `style`    | Formatting, class order — no logic change                 | —              |
| `build`    | Build system, registry build script, dependency changes   | —              |
| `ci`       | CI/workflow changes                                       | —              |
| `chore`    | Maintenance that touches no src or test files             | —              |
| `revert`   | Reverts a previous commit                                 | —              |

### Scopes (defined — always use one for registry/docs/build changes)

| Scope      | Covers                                                     |
| ---------- | ---------------------------------------------------------- |
| `registry` | `packages/registry/**` — components, sections, their tests |
| `docs`     | `apps/docs/**` — the Fumadocs site and its content         |
| `scripts`  | `scripts/**` — registry build, codegen                     |
| `ci`       | `.github/**`, deploy config                                |
| `deps`     | Package manifest changes across the monorepo               |
| `repo`     | Root config: turbo, yarn, license, README                  |
| `brand`    | `docs/02-BRAND.md` and visual-identity assets              |

### Subject rules

- Imperative mood: "add", not "added" or "adds".
- Lowercase. No trailing period. **≤ 72 characters.**
- Reference issues in the footer: `Refs #12`, `Closes #12`.

## Examples (from this repo's actual history — follow them)

```
feat(registry): add chat-stream component with streaming and error states

Renders tokens as they arrive, tool-call cards, citations, and a retry
surface. Test-first: 9 cases covering streaming cursor, a11y roles, and
dark/light parity. Part of wave 1 (AI app UI).
```

```
fix(docs): correct registry URL in button install command

The install snippet pointed at the apex domain instead of the deployed
docs project.
```

```
build(scripts): zod-validate registry items before emit

Matches the shadcn build guarantees (schema-checked output) while keeping
the pipeline under 200 lines.
```

```
chore(deps): pin tailwind to 4.3.4 (4.3.5 quarantined on npm)
```

### Anti-examples — these get rejected

```
update stuff                        ← no type, no scope, no meaning
fix(registry): fixed the button     ← past tense, vague, what was wrong?
feat(registry): add button and bump deps and fix CI   ← not atomic
feat: asdf                          ← noise commits are deleted, not fixed
```

## Component contributions (the run card)

Registry components follow the TDD run card (see `docs/01-DESIGN.md` §5):

1. Pick the slug from the catalog (`docs/00-PRD.md` appendix).
2. Write the failing test first: render, variants, a11y/keyboard, dark/light parity.
3. Implement on the shadcn base until green.
4. Add the docs MDX page with a live preview.
5. Run `node scripts/build-registry.mjs` — the registry JSON must validate.
6. One atomic commit: `feat(registry): add <slug> …` (test + component + docs together).
7. PR → CI must be green → merge.

## Definition of done (every registry component)

- [ ] Typed props, `data-slot`/`data-variant`/`data-size` attributes
- [ ] Variants via cva, consumer `className` merged last
- [ ] Dark/light parity · WCAG AA keyboard + focus
- [ ] Test-first suite green · docs page with live preview · registry JSON valid

## Tooling

- **Biome** (lint + format — not ESLint/Prettier): `yarn lint` checks, `yarn format` fixes.
  Config: `biome.json`. CI and pre-commit both run it; a red check blocks the merge.
- **Git hooks (husky)**: `pre-commit` runs lint-staged (Biome on staged files);
  `commit-msg` runs commitlint — a non-conventional message is rejected on the spot.
- **commitlint**: scopes are enforced (see the table above); unknown scopes fail.
- **Generator** — scaffold a new catalog entry (component or section) with one command:

  ```bash
  yarn gen component chat-shell --title "Chat Shell" \
    --description "Full-page chat layout with thread list and streaming" \
    --category "chat" --builds-on "message,message-scroller" --wave 1
  yarn gen section hero --title "Hero" --description "Landing hero" \
    --category "hero" --wave 4
  ```

  It writes the test (contract), the implementation skeleton (quality floor), the docs
  page, and registers the item in the registry build — then you implement. Flags:
  `--title` (required), `--description` (required), `--category`, `--builds-on`,
  `--deps` (npm dependencies to declare), `--wave`, `--dry-run`.
