import Link from 'next/link';

const belt = (
  <span className="inline-flex -rotate-[24deg] gap-1.5" aria-hidden>
    <i className="size-3 rounded-[3px] bg-[var(--orion-g1)]" />
    <i className="size-3 rounded-[3px] bg-[var(--orion-g2)] opacity-75" />
    <i className="size-3 rounded-[3px] bg-[var(--orion-g1)] opacity-50" />
  </span>
);

export default function Home() {
  return (
    <main className="relative flex min-h-svh flex-col items-center justify-center overflow-hidden px-6 text-center">
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            'radial-gradient(800px 340px at 15% -10%, color-mix(in srgb, var(--orion-g1) 30%, transparent), transparent 70%), radial-gradient(900px 380px at 90% 110%, color-mix(in srgb, var(--orion-g2) 22%, transparent), transparent 70%)',
        }}
      />
      <div className="relative z-10 flex flex-col items-center">
        {belt}
        <h1 className="mt-6 text-5xl font-semibold tracking-tight">
          Orion <span className="text-[var(--orion-g1)]">UI</span>
        </h1>
        <p className="mt-4 max-w-xl text-balance text-lg text-zinc-400">
          The comprehensive, free (MIT), shadcn-based registry — every component, section and
          AI-app surface a web app needs.
        </p>
        <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
          <Link
            href="/docs"
            className="rounded-lg px-5 py-2.5 text-sm font-medium text-black"
            style={{ background: 'linear-gradient(135deg, var(--orion-g1), var(--orion-g2))' }}
          >
            Read the docs
          </Link>
          <a
            href="https://github.com/natinium/orion-ui"
            target="_blank"
            rel="noreferrer"
            className="rounded-lg border border-zinc-700 px-5 py-2.5 text-sm font-medium hover:bg-zinc-800/60"
          >
            GitHub
          </a>
        </div>
        <p className="mono mt-10 font-mono text-xs text-zinc-500">
          Run 0 · vertical slice · registry + docs live
        </p>
      </div>
    </main>
  );
}
