#!/usr/bin/env node
/**
 * Orion UI registry build.
 * Emits shadcn registry-item JSON (official schema) with the component source
 * embedded, so the shadcn CLI can consume it straight from the deployed docs URL:
 *   npx shadcn@latest add https://orion-ui.vercel.app/r/<slug>.json
 */
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const OUT_DIR = resolve(ROOT, 'apps/docs/public/r');

/** @type {Array<{ slug: string, title: string, description: string, source: string, target: string, type: string, dependencies: string[] }>} */
const items = [
  { slug: 'empty-state', title: 'Empty State', description: 'Zero-data placeholder with icon, title, description and an action slot — the graceful first impression of every empty screen.', source: 'packages/registry/src/ui/empty-state.tsx', target: 'ui/empty-state.tsx', type: 'registry:ui', dependencies: [] },

  {
    slug: 'button',
    title: 'Button',
    description:
      'Displays a button or a component that looks like a button. Variants: default, secondary, outline, ghost, destructive, link.',
    source: 'packages/registry/src/ui/button.tsx',
    target: 'ui/button.tsx',
    type: 'registry:ui',
    dependencies: ['radix-ui', 'class-variance-authority'],
  },
];

for (const item of items) {
  const content = readFileSync(resolve(ROOT, item.source), 'utf8');
  const json = {
    $schema: 'https://ui.shadcn.com/schema/registry-item.json',
    name: item.slug,
    type: item.type,
    title: item.title,
    description: item.description,
    dependencies: item.dependencies,
    registryDependencies: [],
    files: [
      {
        path: item.target,
        type: item.type,
        content,
      },
    ],
    meta: {
      registry: 'orion-ui',
      license: 'MIT',
    },
  };

  const out = resolve(OUT_DIR, `${item.slug}.json`);
  mkdirSync(dirname(out), { recursive: true });
  writeFileSync(out, `${JSON.stringify(json, null, 2)}\n`);
  console.log(`built ${out}`);
}

console.log(`registry build complete: ${items.length} item(s)`);
