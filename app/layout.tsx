import type { Metadata } from 'next';
import { MotionProvider } from '../components/MotionProvider';
import { Nav } from '../components/Nav';
import './globals.css';

export const metadata: Metadata = {
  title: 'Cryptographic Arts',
  description: 'Cryptographic structures rendered as objects of perception.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="antialiased">
      <body className="min-h-[100dvh] flex flex-col font-sans selection:bg-accent selection:text-white bg-canvas text-ink">
        <MotionProvider>
          <Nav />
          <main id="main-content" className="flex-1 flex flex-col min-h-0 relative overflow-x-hidden">
            {children}
          </main>

          <footer className="py-3 md:min-h-12 border-t border-white/10 px-4 md:px-8 flex flex-col md:flex-row items-center justify-between text-[9px] font-mono text-ink-muted uppercase tracking-[0.2em] shrink-0 bg-canvas gap-2 md:gap-0">
            <div className="flex gap-4 md:gap-8">
              <a href="https://x.com/marsmensch" target="_blank" rel="noreferrer" className="hover:text-white transition-colors">X: @marsmensch</a>
              <a href="mailto:marsmensch@pm.me" className="hover:text-white transition-colors">marsmensch@pm.me</a>
            </div>
            <div className="text-center md:text-right opacity-50 flex gap-4 md:gap-8 items-center flex-col sm:flex-row">
              <span>Developed by Mars Mensch, 2026.</span>
              <span className="hidden sm:inline">Inspired by Hal Finney, 1993</span>
            </div>
          </footer>
        </MotionProvider>
      </body>
    </html>
  );
}
