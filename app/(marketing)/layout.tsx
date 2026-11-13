import { connection } from 'next/server';
import ModelPriceTicker from '@/components/ModelPriceTicker';

// Informational routes share this ticker; tools such as /prices stay outside this group.
export default async function MarketingLayout({ children }: { children: React.ReactNode }) {
  await connection();
  return <><ModelPriceTicker />{children}</>;
}
