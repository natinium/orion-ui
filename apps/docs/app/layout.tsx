import { RootProvider } from 'fumadocs-ui/provider/next';
import type { ReactNode } from 'react';
import './globals.css';

export const metadata = {
  title: 'Orion UI',
  description:
    'The comprehensive, free (MIT), shadcn-based registry: every component, section and AI-app surface a web app needs.',
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="flex min-h-screen flex-col">
        <RootProvider>{children}</RootProvider>
      </body>
    </html>
  );
}
