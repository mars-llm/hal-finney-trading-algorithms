import Link from 'next/link';

const ALGORITHMS = [
  { href: '/work/avalanche', label: '01. AVALANCHE' },
  { href: '/work/one-way', label: '02. ONE WAY' },
  { href: '/work/merkle', label: '03. MERKLE' },
  { href: '/work/proof-of-work', label: '04. PROOF OF WORK' },
  { href: '/work/elliptic-curve', label: '05. ELLIPTIC CURVE' },
  { href: '/work/zero-knowledge', label: '06. ZERO KNOWLEDGE' },
  { href: '/work/schnorr', label: '07. SCHNORR' },
  { href: '/work/post-quantum', label: '08. POST-QUANTUM' },
];

export default function Home() {
  return (
    <div className="flex-1 flex flex-col items-center justify-center px-5 py-12 sm:px-8 md:py-16">
        <div className="max-w-2xl w-full text-center space-y-10 md:space-y-12">
          <div>
            <p className="mb-4 font-mono text-[10px] uppercase tracking-[0.28em] text-ink-muted">
              A curated study of computational structure
            </p>
            <h1 className="font-serif text-3xl sm:text-4xl md:text-5xl lg:text-6xl tracking-[0.12em] sm:tracking-widest text-white mb-5 uppercase">
              CRYPTOGRAPHIC ARTS
            </h1>
            <p className="font-sans text-ink-muted text-base md:text-xl max-w-md mx-auto leading-relaxed font-light">
              Cryptographic structures rendered as objects of perception.
            </p>
          </div>
          <nav aria-label="Exhibition works">
            <ul className="grid grid-cols-1 sm:grid-cols-2 border-t border-white/15 w-full font-mono text-xs sm:text-sm tracking-widest">
              {ALGORITHMS.map(algo => (
                <li key={algo.href} className="border-b border-white/15 sm:odd:border-r">
                  <Link href={algo.href} className="block px-4 py-4 text-left hover:bg-white/5 focus-visible:bg-white/5 transition-colors">
                    {algo.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
          <Link
            href="/colophon"
            className="inline-block font-mono text-[10px] uppercase tracking-[0.24em] text-ink-muted underline decoration-white/20 underline-offset-4 transition-colors hover:text-white"
          >
            Colophon / Method
          </Link>
        </div>
      </div>
  );
}
