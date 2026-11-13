import type { FeaturedModel } from '../../config/featured-models.ts';

export type BillingTier = {
  id: string; label: string; input: number; output: number;
  minInput: number; maxInput: number | null; processing: 'standard' | 'batch';
  region: 'default' | 'singapore' | 'us' | 'eu'; period: 'any' | 'peak' | 'off-peak';
  cacheWrite5m?: number; cacheWrite1h?: number;
};
export type OfficialRate = { input: number; output: number; scope: string; notes: string[]; validUntil?: string; tiers?: BillingTier[]; evidenceText?: string; contextWindow?: number; maxOutput?: number };
function tier(id: string, input: number, output: number, options: Partial<BillingTier> = {}): BillingTier {
  return { id, label: 'Standard uncached text tokens', input, output, minInput: 0, maxInput: null, processing: 'standard', region: 'default', period: 'any', ...options };
}
function requireValue<T>(value: T | undefined | null | false, label: string): T {
  if (value === undefined || value === null || value === false) throw new Error(`Unrecognized official pricing: ${label}`);
  return value;
}
export function plain(text: string): string {
  return text.replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, '').replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, '').replace(/<sup\b[^>]*>[\s\S]*?<\/sup>/gi, '').replace(/<[^>]+>/g, ' ').replace(/&nbsp;|&#160;/g, ' ').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&#36;/g, '$').replace(/\s+/g, ' ').trim();
}
export function money(text: string): number {
  const cleaned = plain(text.replace(/~~[\s\S]*?~~/g, '')).replace(/\\\$/g, '$');
  const matches = [...cleaned.matchAll(/\$\s*((?:\d{1,3}(?:,\d{3})+|\d+)(?:\.\d+)?)(?![\w.,])/g)];
  requireValue(matches.length === 1, 'one explicit USD rate per cell');
  const value = Number(matches[0][1].replaceAll(',', ''));
  requireValue(Number.isFinite(value) && value >= 0, 'finite nonnegative USD rate');
  return value;
}
function sliceSection(text: string, start: string, end?: string) {
  const index = text.indexOf(start);
  requireValue(index >= 0, start);
  const rest = text.slice(index + start.length);
  const endIndex = end ? rest.indexOf(end) : -1;
  return endIndex >= 0 ? rest.slice(0, endIndex) : rest;
}
export function markdownRows(text: string): string[][] {
  return text.split('\n').map(line => line.replace(/^\s*>\s?/, '').trim()).filter(line => line.startsWith('|') && !/^\|[\s:|-]+\|$/.test(line)).map(line => line.replace(/^\||\|$/g, '').split('|').map(cell => plain(cell.replace(/\*\*/g, '').replace(/\\\$/g, '$')).trim()));
}
function oneRow(rows: string[][], predicate: (row: string[]) => boolean) {
  const found = rows.filter(predicate);
  requireValue(found.length === 1, 'unique model/tier row');
  return found[0];
}
function anthropicBatch(result: OfficialRate, model: FeaturedModel, document: string): OfficialRate {
  if (!document.includes('### Batch processing')) return result;
  const rows = markdownRows(sliceSection(document, '### Batch processing', '\n### '));
  requireValue(rows[0]?.[1] === 'Batch input' && rows[0]?.[2] === 'Batch output', 'Anthropic batch columns');
  const base = result.tiers ?? [tier('standard', result.input, result.output)];
  const batch = base.map(t => {
    const label = model.modelId === 'claude-haiku-5-5' ? `${model.displayName} (for prompts ${t.minInput ? 'over' : 'up to'} 100,000 tokens)` : model.displayName;
    const row = oneRow(rows, r => r[0] === label);
    result.evidenceText = `${result.evidenceText ?? ''}\nBatch: ${row.join(' | ')}`;
    return { ...t, id: t.id.replace('standard', 'batch'), label: t.label.replace('Standard', 'Batch'), processing: 'batch' as const, input: money(row[1]), output: money(row[2]) };
  });
  return { ...result, tiers: [...base, ...batch] };
}
export function htmlTables(html: string): { context: string; rows: string[][] }[] {
  return [...html.matchAll(/<table\b[^>]*>([\s\S]*?)<\/table>/gi)].map(table => {
    const headings: string[] = [];
    for (const heading of html.slice(0, table.index).matchAll(/<h([234])\b[^>]*>([\s\S]*?)<\/h\1>/gi)) {
      const level = Number(heading[1]) - 2;
      headings.length = level + 1;
      headings[level] = plain(heading[2]);
    }
    const spans = new Map<number, { value: string; remaining: number }>();
    const rows = [...table[1].matchAll(/<tr\b[^>]*>([\s\S]*?)<\/tr>/gi)].map(row => {
      const cells: string[] = [];
      let col = 0;
      function carry() {
        while (spans.has(col)) {
          const span = spans.get(col)!;
          cells[col++] = span.value;
          span.remaining--;
          if (!span.remaining) spans.delete(col - 1);
        }
      }
      for (const cell of row[1].matchAll(/<t[dh]\b([^>]*)>([\s\S]*?)<\/t[dh]>/gi)) {
        carry();
        const width = Number(cell[1].match(/colspan=["']?(\d+)/i)?.[1] ?? 1);
        const height = Number(cell[1].match(/rowspan=["']?(\d+)/i)?.[1] ?? 1);
        requireValue(width > 0 && width <= 30 && height > 0 && height <= 100, 'bounded table span');
        for (let i = 0; i < width; i++) {
          const value = plain(cell[2]);
          cells[col] = value;
          if (height > 1) spans.set(col, { value, remaining: height - 1 });
          col++;
        }
      }
      carry();
      return cells;
    });
    return { context: headings.join(' / '), rows };
  });
}
function rate(input: string, output: string, scope: string, notes: string[] = []): OfficialRate {
  return { input: money(input), output: money(output), scope, notes };
}
export function datedPrice(cell: string, now: Date): { value: number; note?: string; validUntil?: string } {
  const schedule = [...cell.matchAll(/\$(\d+(?:\.\d+)?)\s+(through|starting)\s+([A-Z][a-z]+ \d{1,2}, \d{4})/g)];
  if (!schedule.length) return { value: money(cell) };
  requireValue(schedule.length === 2 && schedule[0][2] === 'through' && schedule[1][2] === 'starting', 'supported price schedule');
  const end = Date.parse(`${schedule[0][3]} 00:00:00 GMT`) + 86_400_000;
  const start = Date.parse(`${schedule[1][3]} 00:00:00 GMT`);
  requireValue(Number.isFinite(start) && end === start, 'contiguous dated rates');
  return { value: Number(now.getTime() < start ? schedule[0][1] : schedule[1][1]), validUntil: now.getTime() < start ? new Date(start).toISOString() : undefined, note: now.getTime() < start ? `Published next rate: $${schedule[1][1]} / 1M from ${schedule[1][3]}.` : undefined };
}
export function parseOfficialRate(model: FeaturedModel, document: string, now = new Date()): OfficialRate {
  const id = model.apiModelId ?? model.modelId;
  switch (model.provider) {
    case 'OpenAI': {
      const rows = markdownRows(sliceSection(document, '### Standard pricing data', '### Batch pricing data'));
      requireValue(rows[0]?.[1] === 'Short context input' && rows[0]?.[2] === 'Short context output', 'OpenAI standard columns');
      const row = oneRow(rows, row => row[0] === id);
      const longInput = money(row[6]), longOutput = money(row[7]);
      const result = rate(row[1], row[2], 'Standard; up to 272K input tokens.', [`Long-context published rates: input $${longInput} / output $${longOutput} per 1M. Caching, faster service tiers and tools are separate.`]);
      result.tiers = [tier('standard-short', result.input, result.output, { label: 'Standard · up to 272K input', maxInput: 272000 }), tier('standard-long', longInput, longOutput, { label: 'Standard · above 272K input', minInput: 272001 })];
      const batchRows = markdownRows(sliceSection(document, '### Batch pricing data', '### Fast pricing data'));
      const batch = batchRows.filter(r => r[0] === id)[0];
      if (batch && batchRows[0]?.[1] === 'Short context input') {
        result.tiers.push(tier('batch-short', money(batch[1]), money(batch[2]), { label: 'Batch · up to 272K input', processing: 'batch', maxInput: 272000 }), tier('batch-long', money(batch[6]), money(batch[7]), { label: 'Batch · above 272K input', processing: 'batch', minInput: 272001 }));
      }
      return { ...result, contextWindow: 1050000, maxOutput: 128000, evidenceText: `Standard:\n${rows[0].join(' | ')}\n${row.join(' | ')}${batch ? `\nBatch:\n${batch.join(' | ')}` : ''}` };
    }
    case 'Anthropic': {
      const rows = markdownRows(sliceSection(document, '## Model pricing', '\n## '));
      requireValue(rows[0]?.[1] === 'Base input tokens' && rows[0]?.[5] === 'Output tokens', 'Anthropic base vs cache columns');
      const row = oneRow(rows, row => model.displayName === 'Claude Haiku 5.5' ? row[0] === 'Claude Haiku 5.5 (for prompts up to 100,000 tokens)' : row[0] === model.displayName);
      if (id === 'claude-haiku-5-5') {
        const high = oneRow(rows, row => row[0] === 'Claude Haiku 5.5 (for prompts over 100,000 tokens)');
        const result = rate(row[1], row[5], 'Standard; up to 100K input tokens.', [`Above 100K: input $${money(high[1])} / output $${money(high[5])} per 1M.`]);
        return anthropicBatch({ ...result, contextWindow: 1000000, maxOutput: 128000, evidenceText: [rows[0], row, high].map(r => r.join(' | ')).join('\n'), tiers: [tier('standard-short', result.input, result.output, { label: 'Standard · up to 100K input', maxInput: 100000 }), tier('standard-long', money(high[1]), money(high[5]), { label: 'Standard · above 100K input', minInput: 100001 })] }, model, document);
      }
      const result = rate(row[1], row[5], 'Standard text API; uncached input.');
      return anthropicBatch({ ...result, contextWindow: 1000000, maxOutput: 128000, evidenceText: [rows[0], row].map(r => r.join(' | ')).join('\n') }, model, document);
    }
    case 'Google': {
      const section = sliceSection(document, `## ${model.displayName} `, '\n## ');
      const standard = sliceSection(section, '{% tab title="Standard" %}', '{% /tab %}');
      requireValue(standard.includes('Paid Tier, per 1M tokens in USD'), 'Google paid USD tier');
      const cells = (label: string, tab = standard) => {
        const chunk = requireValue(tab.split(/\n\s*---\s*\n/).find(chunk => chunk.includes(`* ${label}`)), label);
        const bullets = [...chunk.matchAll(/^\s*\*\s+/gm)];
        requireValue(bullets.length === 3, 'Google feature/free/paid columns');
        return chunk.slice(bullets[2].index + bullets[2][0].length).trim();
      };
      const input = datedPrice(cells('Input price'), now);
      const output = datedPrice(cells('Output price'), now);
      const tiers = [tier('standard', input.value, output.value, { label: 'Standard paid tier; billed thinking tokens included' })];
      let evidenceText = `Standard paid tier\nInput: ${cells('Input price')}\nOutput: ${cells('Output price')}`;
      if (section.includes('{% tab title="Batch" %}')) {
        const batch = sliceSection(section, '{% tab title="Batch" %}', '{% /tab %}');
        requireValue(batch.includes('Paid Tier, per 1M tokens in USD'), 'Google batch paid USD tier');
        tiers.push(tier('batch', datedPrice(cells('Input price', batch), now).value, datedPrice(cells('Output price', batch), now).value, { processing: 'batch', label: 'Batch paid tier; billed thinking tokens included' }));
        evidenceText += `\nBatch paid tier\nInput: ${cells('Input price', batch)}\nOutput: ${cells('Output price', batch)}`;
      }
      return { input: input.value, output: output.value, tiers, contextWindow: 1000000, evidenceText, scope: 'Standard paid tier; uncached input; output includes thinking tokens.', validUntil: [input.validUntil, output.validUntil].filter((s): s is string => Boolean(s)).sort()[0], notes: [input.note && `Input: ${input.note}`, output.note && `Output: ${output.note}`].filter((n): n is string => Boolean(n)) };
    }
    case 'xAI': {
      requireValue(document.includes('`grok-4.7`'), 'xAI model identity');
      const rows = markdownRows(sliceSection(document, '## Pricing', '## Rate limits'));
      requireValue(rows[0]?.[1].includes('< 200k') && rows[0]?.[1].includes('per 1M tokens'), 'xAI short-context boundary');
      const input = oneRow(rows, row => row[0] === 'Input'), output = oneRow(rows, row => row[0] === 'Output');
      const result = rate(input[1], output[1], 'Standard; fewer than 200K prompt tokens.', [`At 200K or more: input $${money(input[2])} / output $${money(output[2])} per 1M for the full request.`]);
      const tiers = [tier('standard-short', result.input, result.output, { label: 'Standard · below 200K input', maxInput: 199999 }), tier('standard-long', money(input[2]), money(output[2]), { label: 'Standard · at least 200K input', minInput: 200000 })];
      if (/20% discount to standard rates/.test(document)) tiers.push(...tiers.map(t => ({ ...t, id: t.id.replace('standard', 'batch'), label: t.label.replace('Standard', 'Batch'), processing: 'batch' as const, input: t.input * .8, output: t.output * .8 })));
      return { ...result, contextWindow: 500000, tiers, evidenceText: [rows[0], input, output].map(r => r.join(' | ')).join('\n') };
    }
    case 'DeepSeek': {
      const table = requireValue(htmlTables(document).find(t => t.rows[0]?.includes('MODEL')), 'DeepSeek model table');
      const col = table.rows[0].findIndex(c => c === id);
      requireValue(col >= 0, 'DeepSeek API identity');
      const find = (label: RegExp, period: string) => oneRow(table.rows, row => row.some(c => label.test(c)) && row.includes(period))[col];
      const peakInput = find(/1M INPUT TOKENS.*CACHE MISS/, 'PEAK'), peakOutput = find(/1M OUTPUT TOKENS/, 'PEAK');
      const offInput = find(/1M INPUT TOKENS.*CACHE MISS/, 'OFF-PEAK'), offOutput = find(/1M OUTPUT TOKENS/, 'OFF-PEAK');
      const result = rate(peakInput, peakOutput, 'Peak period; uncached text input.', [`Off-peak: input $${money(offInput)} / output $${money(offOutput)} per 1M. Provider UTC schedule and holiday rules apply.`]);
      return { ...result, contextWindow: 1000000, maxOutput: 384000, tiers: [tier('peak', result.input, result.output, { label: 'Peak · uncached input', period: 'peak' }), tier('off-peak', money(offInput), money(offOutput), { label: 'Off-peak · uncached input', period: 'off-peak' })], evidenceText: `Uncached input peak: ${peakInput}; off-peak: ${offInput}\nOutput peak: ${peakOutput}; off-peak: ${offOutput}` };
    }
    case 'Mistral': {
      requireValue(document.includes('Status: GA') && document.split('\n').find(line => line.startsWith('- API names:'))?.includes('`' + id + '`'), 'Mistral GA API identity');
      const line = requireValue(document.split('\n').find(line => line.startsWith('- Pricing:')), 'Mistral pricing');
      const input = requireValue(line.match(/Pricing: Input (\$[\d.]+) \/M Tokens/), 'Mistral input');
      const output = requireValue(line.match(/; Output (\$[\d.]+) \/M Tokens/), 'Mistral output');
      const context = document.match(/Context length: (\d+(?:\.\d+)?)(M|k)/);
      return { ...rate(input[1], output[1], 'Standard text API; uncached input.'), contextWindow: context ? Number(context[1]) * (context[2] === 'M' ? 1000000 : 1000) : undefined, evidenceText: line };
    }
    case 'Alibaba Cloud': {
      const tables = htmlTables(document).filter(t => /Singapore/.test(t.context) && (id.endsWith('-max') ? /Qwen-Max/.test(t.context) : /Qwen-Flash/.test(t.context)));
      const table = requireValue(tables.find(t => t.rows.some(row => row[0]?.split(' ')[0] === id)), 'Alibaba Singapore table');
      const header = table.rows[0];
      const inputCol = header.findIndex(c => c.startsWith('Input price (per 1 million tokens)'));
      const outputCol = header.findIndex(c => c.startsWith('Output price (per 1 million tokens)'));
      requireValue(inputCol >= 0 && outputCol >= 0, 'Alibaba USD columns');
      const row = oneRow(table.rows, row => row[0]?.split(' ')[0] === id && row[1] === 'International');
      requireValue(row.some(c => /0\s*<\s*Token\s*≤\s*1M/.test(c)), 'Alibaba reviewed token range');
      const result = rate(row[inputCol], row[outputCol], 'Singapore endpoint; International deployment; uncached input.', ['Regional and deployment-scope prices differ. Free quotas, subscriptions, caching and tool fees are excluded.']);
      const tiers = [tier('singapore', result.input, result.output, { label: 'Singapore · International', region: 'singapore', maxInput: 1000000 })];
      let evidenceText = `Singapore / International:\n${header.join(' | ')}\n${row.join(' | ')}`;
      for (const region of [{ id: 'us' as const, heading: /US \(Virginia\)/, scope: 'US' }, { id: 'eu' as const, heading: /Germany \(Frankfurt\)/, scope: 'EU' }]) {
        const candidates = htmlTables(document).filter(t => region.heading.test(t.context) && (id.endsWith('-max') ? /Qwen-Max/.test(t.context) : /Qwen-Flash/.test(t.context)));
        for (const candidate of candidates) {
          const regional = candidate.rows.filter(r => r[0]?.split(' ')[0] === id && r[1] === region.scope);
          const i = candidate.rows[0].findIndex(c => c.startsWith('Input price (per 1 million tokens)'));
          const o = candidate.rows[0].findIndex(c => c.startsWith('Output price (per 1 million tokens)'));
          if (regional.length === 1 && i >= 0 && o >= 0) { tiers.push(tier(region.id, money(regional[0][i]), money(regional[0][o]), { label: `${region.scope} regional deployment`, region: region.id, maxInput: 1000000 })); evidenceText += `\n${region.scope}:\n${regional[0].join(' | ')}`; break; }
        }
      }
      return { ...result, tiers, evidenceText };
    }
    case 'Moonshot AI': {
      // Read literal data from the official page's embedded pricing component. Never execute it.
      const block = sliceSection(document, 'groups:[{title:`Base tokens`', 'rows:');
      requireValue(block.includes('title:`Input`') && block.includes('title:`Output`'), 'Kimi base-token columns');
      const escapedId = id.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const pattern = new RegExp('children:\\x60' + escapedId + '\\x60\\}\\),\\x60(\\$[\\d.]+ / MTok)\\x60,\\x60(\\$[\\d.]+ / MTok)\\x60,\\x60(\\$[\\d.]+ / MTok)\\x60,\\x60(\\$[\\d.]+ / MTok)\\x60,\\x60(\\$[\\d.]+ / MTok)\\x60');
      const found = [...document.matchAll(new RegExp(pattern.source, 'g'))];
      requireValue(found.length === 1, 'Kimi literal model rate row');
      const result = rate(found[0][1], found[0][2], 'Standard API; uncached input base; cache writes billed separately.', [`Cache writes: 5m $${money(found[0][4])} / 1h $${money(found[0][5])} per 1M. Automatic caching can add these input-related charges.`]);
      const tiers = [tier('standard', result.input, result.output, { cacheWrite5m: money(found[0][4]), cacheWrite1h: money(found[0][5]) })];
      return { ...result, tiers, contextWindow: 1048576, evidenceText: `Model | Input | Output | Cached input | 5m writes | 1h writes\n${id} | ${found[0].slice(1).join(' | ')}` };
    }
    case 'MiniMax': {
      const section = sliceSection(document, '## LLM', '## Video');
      const standard = id === 'MiniMax-M3' ? sliceSection(section, '> [tab] Standard', '> [tab] Priority') : section.split('> [tab] Standard')[0];
      const rows = markdownRows(standard);
      requireValue(rows[0]?.[1].startsWith('Input') && rows[0]?.[2].startsWith('Output'), 'MiniMax input/output columns');
      const row = oneRow(rows, row => id === 'MiniMax-M3' ? row[0].startsWith('MiniMax-M3 ≤ 512k') : row[0] === id);
      if (id === 'MiniMax-M3') {
        const high = oneRow(rows, row => row[0].startsWith('MiniMax-M3 > 512k'));
        const result = rate(row[1], row[2], 'Standard; up to 512K input tokens.', [`Above 512K: input $${money(high[1])} / output $${money(high[2])} per 1M. Priority pricing is separate.`]);
        return { ...result, tiers: [tier('standard-short', result.input, result.output, { label: 'Standard · up to 512K input', maxInput: 512000 }), tier('standard-long', money(high[1]), money(high[2]), { label: 'Standard · above 512K input', minInput: 512001 })], evidenceText: [rows[0], row, high].map(r => r.join(' | ')).join('\n') };
      }
      return { ...rate(row[1], row[2], 'Standard pay-as-you-go; uncached input.'), evidenceText: [rows[0], row].map(r => r.join(' | ')).join('\n') };
    }
    case 'Z.ai': {
      const rows = markdownRows(sliceSection(document, '### Latest Models', '### Text Models'));
      requireValue(rows[0]?.[1] === 'Input' && rows[0]?.[4] === 'Output', 'Z.ai uncached vs cache columns');
      const row = oneRow(rows, row => row[0].toLowerCase() === id.toLowerCase());
      return { ...rate(row[1], row[4], 'Standard API; uncached input.', ['Coding Plan subscriptions, cache fees and web-search charges are separate.']), evidenceText: [rows[0], row].map(r => r.join(' | ')).join('\n') };
    }
  }
}
