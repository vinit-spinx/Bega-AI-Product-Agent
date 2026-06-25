import type { Metadata } from 'next';
import { Inter, Source_Serif_4 } from 'next/font/google';
import './globals.css';

const inter = Inter({
  subsets: ['latin'],
  display: 'swap',
});

const sourceSerif = Source_Serif_4({
  subsets: ['latin'],
  weight: ['500', '600'],
  display: 'swap',
  variable: '--font-serif',
});

export const metadata: Metadata = {
  title: 'BEGA AI Product Finder',
  description: 'AI-powered architectural lighting advisor for BEGA luminaires and outdoor furniture.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="h-full">
      <body className={`${inter.className} ${sourceSerif.variable} h-full bg-white text-bega-text-1 antialiased`}>
        {children}
      </body>
    </html>
  );
}
