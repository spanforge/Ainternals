import { defaultWorkload, workloadError, type Workload } from './estimate.ts';
export type BoardState = { workload: Workload; query: string; provider: string; selected: string[]; sort: 'provider' | 'displayName' | 'input' | 'output' | 'monthly'; ascending: boolean };
export function parseBoardState(params: URLSearchParams, modelIds: string[], providerNames: string[]): BoardState {
  const w = { ...defaultWorkload };
  for (const key of ['input', 'output', 'requests'] as const) {
    const raw = params.get(key);
    if (raw !== null && /^\d{1,10}$/.test(raw)) w[key] = Number(raw);
  }
  for (const key of ['processing', 'region', 'period', 'kimiTtl'] as const) {
    const raw = params.get(key);
    const allowed = { processing: ['standard', 'batch'], region: ['singapore', 'us', 'eu'], period: ['peak', 'off-peak'], kimiTtl: ['5m', '1h'] };
    if (raw && allowed[key].includes(raw)) Object.assign(w, { [key]: raw });
  }
  if (workloadError(w)) Object.assign(w, defaultWorkload);
  const sort = params.get('sort');
  return { workload: w, query: (params.get('q') ?? '').slice(0, 100), provider: providerNames.includes(params.get('provider') ?? '') ? params.get('provider')! : 'All providers', selected: [...new Set((params.get('compare') ?? '').split(','))].filter(id => modelIds.includes(id)).slice(0, 4), sort: ['provider', 'displayName', 'input', 'output', 'monthly'].includes(sort ?? '') ? sort as BoardState['sort'] : 'provider', ascending: params.get('order') !== 'desc' };
}
export function serializeBoardState(state: BoardState): string {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(state.workload)) params.set(key, String(value));
  if (state.query) params.set('q', state.query);
  if (state.provider !== 'All providers') params.set('provider', state.provider);
  if (state.selected.length) params.set('compare', state.selected.join(','));
  params.set('sort', state.sort); params.set('order', state.ascending ? 'asc' : 'desc');
  return params.toString();
}
export function csvCell(value: unknown): string {
  let text = value === null || value === undefined ? '' : String(value);
  if (/^[\s]*[=+@-]/.test(text)) text = `'${text}`;
  return `"${text.replaceAll('"', '""')}"`;
}
export function makeCsv(rows: unknown[][]): string { return '\uFEFF' + rows.map(row => row.map(csvCell).join(',')).join('\r\n'); }
