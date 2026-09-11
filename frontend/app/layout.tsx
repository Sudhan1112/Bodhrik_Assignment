import type { Metadata } from 'next';
import { Fraunces, DM_Sans } from 'next/font/google';
import { AppShell } from '@/components/AppShell';
import './globals.css';

const display = Fraunces({
  subsets: ['latin'],
  variable: '--font-display',
  display: 'swap',
});

const sans = DM_Sans({
  subsets: ['latin'],
  variable: '--font-sans',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'Ledger — find & request services',
  description:
    'Discover providers, compare real reviews, and request appointments that fit your schedule.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={display.variable + ' ' + sans.variable}>
      <body className="font-sans antialiased">
        <AppShell>{children}</AppShell>
      </body>
    </html>
  );
}
