import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';

const inter = Inter({
  subsets: ['latin'],
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'BEGA AI Product Finder',
  description: 'AI-powered architectural lighting advisor for BEGA luminaires and outdoor furniture.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="h-full">
      <body className={`${inter.className} h-full bg-white text-bega-text-1 antialiased`}>
        {children}
      </body>
    </html>
  );
}
