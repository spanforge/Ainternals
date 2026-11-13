'use server';
import { updateTag } from 'next/cache';
import { providerCacheTag, refreshModelPrices } from '@/lib/pricing/fetch-official';
export async function refreshPrices() {
  try {
    const result = await refreshModelPrices();
    for (const provider of result.updatedProviders) updateTag(providerCacheTag(provider));
    return { ok: true as const, ...result };
  } catch {
    return { ok: false as const, message: 'The pricing source could not be checked. Existing prices are unchanged. Please try again in five minutes or use the official provider links.' };
  }
}
