import type { Metadata } from 'next';
import Calculator from '@/components/tco/Calculator';
export const metadata: Metadata = {
  title: 'AI TCO Calculator | AInternals',
  description: 'A free, browser-local three-year AI workflow cost calculator. Explore tokens, people, infrastructure and successful-task economics.',
  alternates: {canonical:'/tools/ai-tco-calculator'},
};
export default function Page() { return <Calculator/>; }
