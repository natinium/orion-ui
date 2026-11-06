import { DocsLayout } from 'fumadocs-ui/layouts/docs';
import type { ReactNode } from 'react';
import { source } from '@/app/source';

export default function Layout({ children }: { children: ReactNode }) {
  return (
    <DocsLayout
      tree={source.pageTree}
      nav={{
        title: (
          <span className="inline-flex items-center gap-2 font-mono font-semibold">
            <span className="inline-flex -rotate-[24deg] gap-1" aria-hidden>
              <i className="size-2 rounded-[2px] bg-[var(--orion-g1)]" />
              <i className="size-2 rounded-[2px] bg-[var(--orion-g2)] opacity-75" />
              <i className="size-2 rounded-[2px] bg-[var(--orion-g1)] opacity-50" />
            </span>
            orion ui
          </span>
        ),
      }}
    >
      {children}
    </DocsLayout>
  );
}
