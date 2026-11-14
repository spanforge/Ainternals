import type { Metadata } from 'next';
import UserGuide from '@/components/tco/UserGuide';

export const metadata: Metadata = {
  title: 'AI TCO Calculator User Guide | AInternals',
  description: 'A practical, plain-language guide to all 33 AI TCO calculator fields: why each matters, what to enter, examples and common mistakes.',
  alternates: {canonical:'/tools/ai-tco-calculator/user-guide'},
};
export default function Page(){return <UserGuide/>;}
