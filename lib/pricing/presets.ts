import type { Workload } from './estimate.ts';
export const workloadPresets = [
  { id: 'short-chat', label: 'Short chat', input: 800, output: 300, requests: 10000, description: 'Example only: 800 input tokens and 300 billed output tokens per request, with 10,000 requests per month.' },
  { id: 'document-summary', label: 'Document summary', input: 8000, output: 600, requests: 1000, description: 'Example only: 8,000 input tokens and 600 billed output tokens per request, with 1,000 requests per month.' },
] as const;
export type PresetId = typeof workloadPresets[number]['id'] | 'custom';
export function matchingPreset(workload: Workload): PresetId {
  return workloadPresets.find(preset => preset.input === workload.input && preset.output === workload.output && preset.requests === workload.requests)?.id ?? 'custom';
}
export function applyPreset(workload: Workload, id: PresetId): Workload {
  const preset = workloadPresets.find(preset => preset.id === id);
  return preset ? { ...workload, input: preset.input, output: preset.output, requests: preset.requests } : workload;
}
