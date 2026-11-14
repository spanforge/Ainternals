import type { Metadata } from 'next';
import Nav from '@/components/Nav';
import Footer from '@/components/Footer';
import './globals.css';

const title = 'AInternals | The Economics of Intelligence.';
const description = 'AInternals is an early-stage AI economics startup exploring the costs, value, and long-term economic sustainability of artificial intelligence.';

export const metadata: Metadata = {
  metadataBase: new URL('https://ainternals.com'),
  title,
  description,
  alternates: { canonical: '/' },
  openGraph: {
    title,
    description,
    type: 'website',
    siteName: 'AInternals',
    locale: 'en_US',
    url: '/',
  },
  twitter: { card: 'summary', title, description },
  robots: { index: true, follow: true },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <a href="#main-content" className="skip-to-content">Skip to content</a>
        <Nav />
        <main id="main-content">{children}</main>
        <Footer />
      </body>
    </html>
  );
}
