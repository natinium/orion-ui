#!/usr/bin/env node
/**
 * Orion UI — arg-driven component/section generator (the run-card scaffolder).
 *
 * Usage:
 *   node scripts/generate.mjs component <slug> --title "Chat Stream" \
 *     --description "Streaming chat surface" --category "chat" \
 *     --builds-on "message,badge" --wave 1
 *   node scripts/generate.mjs section <slug> --title "Hero" ... --wave 4
 *
 * Flags:
 *   --title        Display name (required)
 *   --description  One-line description (required)
 *   --category     Catalog category, e.g. chat, tools, state, hero (default: general)
 *   --builds-on    Comma-separated shadcn base items the entry composes (default: none)
 *   --deps         Comma-separated npm dependencies the registry item declares (default: none)
 *   --wave         Catalog wave number (default: 1)
 *   --dry-run      Print the file plan without writing
 *
 * Follows the TDD run card: the generated test is the contract; the generated
 * implementation is the quality floor you extend. Registers the item in
 * scripts/build-registry.mjs so the registry JSON includes it on next build.
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const REG_ITEMS_FILE = resolve(ROOT, 'scripts/build-registry.mjs');
const PASCAL = (s) =>
  s
    .split('-')
    .map((p) => p.charAt(0).toUpperCase() + p.slice(1))
    .join('');

// ── args ─────────────────────────────────────────────────────────────────────
const args = process.argv.slice(2);
const kind = args[0];
const slug = args[1];
const flag = (name, fallback) => {
  const i = args.indexOf(`--${name}`);
  if (i === -1) return fallback;
  const v = args[i + 1];
  return v && !v.startsWith('--') ? v : true;
};

const FAIL = (msg) => {
  console.error(`✗ ${msg}`);
  process.exit(1);
};

if (kind !== 'component' && kind !== 'section')
  FAIL('first argument must be "component" or "section"');
if (!slug || !/^[a-z0-9]+(-[a-z0-9]+)*$/.test(slug))
  FAIL(`slug must be kebab-case, got: "${slug ?? ''}"`);
const title = flag('title');
if (typeof title !== 'string' || !title.trim()) FAIL('--title is required');
const description =
  typeof flag('description') === 'string' ? flag('description') : `${title} block.`;
const category = typeof flag('category') === 'string' ? flag('category') : 'general';
const buildsOn =
  typeof flag('builds-on') === 'string'
    ? flag('builds-on')
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean)
    : [];
const deps =
  typeof flag('deps') === 'string'
    ? flag('deps')
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean)
    : [];
const wave = Number(flag('wave', 1));
const dryRun = args.includes('--dry-run');
const Pascal = PASCAL(slug);
const tag = kind === 'section' ? 'section' : 'div';

const paths = {
  component: resolve(ROOT, `packages/registry/src/ui/${slug}.tsx`),
  test: resolve(ROOT, `packages/registry/tests/${slug}.test.tsx`),
  docs: resolve(ROOT, `apps/docs/content/docs/ui/${slug}.mdx`),
};

for (const [k, p] of Object.entries(paths)) if (existsSync(p)) FAIL(`${k} already exists: ${p}`);

const depsLiteral = JSON.stringify(deps);
const itemLine =
  `  { slug: '${slug}', title: '${title.replace(/'/g, "\\'")}', description: '${description.replace(/'/g, "\\'")}', ` +
  `source: 'packages/registry/src/ui/${slug}.tsx', target: 'ui/${slug}.tsx', type: 'registry:ui', dependencies: ${depsLiteral} },\n`;

console.log(`Orion generator — ${kind} "${slug}" (wave ${wave}, category ${category})`);
console.log(`  title:       ${title}`);
console.log(`  description: ${description}`);
console.log(`  builds on:   ${buildsOn.join(', ') || '—'}`);
console.log(`  deps:        ${deps.join(', ') || '—'}`);
if (dryRun) {
  console.log('files that would be written:');
  for (const p of Object.values(paths)) console.log('  -', p);
  console.log('  - patch: scripts/build-registry.mjs (register item)');
  process.exit(0);
}

// ── 1. component skeleton (quality floor — extend, don't rewrite) ────────────
const componentTsx = `import * as React from 'react';

import { cn } from '../lib/utils';

/**
 * ${title} — ${description}
 *
 * [TODO implement the real behavior. This skeleton passes the floor contract:
 * data-slot trio, className merge, forwards all native props. Extend variants
 * via cva when the component earns them.]
 *
 * @example
 * <${Pascal}>${title} content</${Pascal}>
 */
function ${Pascal}({ className, ...props }: React.ComponentProps<'${tag}'>) {
  return (
    <${tag}
      data-slot="${slug}"
      className={cn('relative flex flex-col gap-2', className)}
      {...props}
    />
  );
}

export { ${Pascal} };
`;

// ── 2. the test-first contract ───────────────────────────────────────────────
const testTsx = `import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ${Pascal} } from '../src/ui/${slug}';

// Floor contract for ${slug} — extend these as real behavior lands.
describe('${Pascal}', () => {
  it('renders with the data-slot attribute', () => {
    render(<${Pascal}>Content</${Pascal}>);
    expect(screen.getByText('Content')).toHaveAttribute('data-slot', '${slug}');
  });

  it('merges custom className without losing the base classes', () => {
    render(<${Pascal} className="mt-2">C</${Pascal}>);
    const el = screen.getByText('C');
    expect(el).toHaveClass('mt-2');
    expect(el).toHaveClass('relative');
  });

  it('forwards native props', () => {
    render(<${Pascal} data-testid="${slug}-el">P</${Pascal}>);
    expect(screen.getByTestId('${slug}-el')).toBeInTheDocument();
  });
});
`;

// ── 3. docs page with live preview ───────────────────────────────────────────
const docsMdx = `---
title: ${title}
description: ${description}
---

import { ${Pascal} } from '@orion-ui/registry';

## Preview

<div className="not-prose flex py-6">
  <${Pascal}>${title} content</${Pascal}>
</div>

## Install

\`\`\`bash
npx shadcn@latest add https://orion-registry.vercel.app/r/${slug}.json
\`\`\`
`;

// ── write ────────────────────────────────────────────────────────────────────
for (const p of Object.values(paths)) {
  mkdirSync(dirname(p), { recursive: true });
  if (p === paths.component) writeFileSync(p, componentTsx);
  if (p === paths.test) writeFileSync(p, testTsx);
  if (p === paths.docs) writeFileSync(p, docsMdx);
}

// ── 4. register in the registry build ────────────────────────────────────────
const regSrc = readFileSync(REG_ITEMS_FILE, 'utf8');
if (regSrc.includes(`slug: '${slug}'`)) FAIL('item already registered in build-registry.mjs');
const anchor = 'const items = [';
if (!regSrc.includes(anchor)) FAIL('could not find the items array in build-registry.mjs');
writeFileSync(REG_ITEMS_FILE, regSrc.replace(anchor, `${anchor}\n${itemLine}`));

console.log(`\n✓ generated ${kind} "${slug}":`);
for (const p of Object.values(paths)) console.log('  +', p.replace(ROOT + '/', ''));
console.log('  + registered in scripts/build-registry.mjs');
console.log(`
Run card next steps:
  1. implement the real behavior in packages/registry/src/ui/${slug}.tsx (skeleton is the floor)
  2. extend the test contract, keep it green:  yarn turbo run test
  3. polish the docs page + live preview
  4. build the registry:  yarn registry:build
  5. one atomic commit:   feat(registry): add ${slug} …
`);
