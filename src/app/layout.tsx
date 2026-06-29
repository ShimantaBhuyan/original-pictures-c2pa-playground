import type { Metadata } from 'next';
import { Sanchez, League_Spartan, JetBrains_Mono } from 'next/font/google';
import './globals.css';

const sanchez = Sanchez({
  subsets: ['latin'],
  weight: ['400'],
  variable: '--font-sanchez',
  display: 'swap',
});

const spartan = League_Spartan({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-spartan',
  display: 'swap',
});

const jetbrains = JetBrains_Mono({
  subsets: ['latin'],
  weight: ['400', '500'],
  variable: '--font-jetbrains',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'Original Pictures Evidence Lab',
  description: 'C2PA Evidence Tamper Lab — local-first provenance workflow',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${sanchez.variable} ${spartan.variable} ${jetbrains.variable}`}>
      <body className="min-h-screen bg-paper antialiased">
        <nav className="border-b border-slate-200 bg-paper/80 backdrop-blur-sm sticky top-0 z-10">
          <div className="max-w-6xl mx-auto px-8 py-4 flex items-center justify-between">
            <a href="/" className="text-lg font-semibold text-ink font-[family-name:var(--font-display)] tracking-tight">
              Original Pictures{' '}
              <span className="text-mist font-normal font-[family-name:var(--font-sans)]">Evidence Lab</span>
            </a>
            <div className="flex gap-6 text-sm">
              <NavLink href="/">Upload</NavLink>
              <NavLink href="/records">Records</NavLink>
              <NavLink href="/tamper">Tamper</NavLink>
              <NavLink href="/verify">Verify</NavLink>
            </div>
          </div>
        </nav>
        <main className="max-w-5xl mx-auto px-8 py-16">
          {children}
        </main>
      </body>
    </html>
  );
}

function NavLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <a href={href} className="text-mist hover:text-ink transition-colors duration-[var(--duration-default)] font-[family-name:var(--font-sans)]">
      {children}
    </a>
  );
}
