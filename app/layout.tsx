import type { Metadata } from 'next';
import { Analytics } from '@vercel/analytics/next';
import Nav from '@/components/Nav';
import Footer from '@/components/Footer';
import './globals.css';
const title = 'AInternals — AI Agents That Work Beyond the Demo';
const description = 'Engineering Agentic AI for Enterprise Reality. AInternals focuses on the engineering, operational, and economic challenges of enterprise AI agents.';
export const metadata: Metadata = { metadataBase: new URL('https://ainternals.com'), title, description, alternates: { canonical: '/' }, openGraph: { title, description, type: 'website', siteName: 'AInternals', locale: 'en_US', url: '/' }, twitter: { card: 'summary', title, description }, robots: { index: true, follow: true } };
export default function RootLayout({ children }: {
    children: React.ReactNode;
}) { return <html lang="en"><body><a href="#main-content" className="skip-to-content">Skip to content</a><Nav /><main id="main-content">{children}</main><Footer /><Analytics /></body></html>; }
