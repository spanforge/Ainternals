# Model selection review — 13 November 2026

The dashboard selects current general text API models listed in official provider catalogs. It is not exhaustive or an automatically updated frontier ranking. Review these catalogs when updating the selection, then run `npm run verify:pricing`. That command fetches the official pricing documents directly and requires valid rates for every selected model. Model availability and new releases still require editorial review of the official catalogs.

Prices below are a review snapshot in USD per million text tokens, not hardcoded dashboard values. Runtime prices come directly from official provider documents; provider terms control actual billing. Model selection review is separate from each provider's successful fetch timestamp. All 23 rows have passed live direct-source adapter validation.

| Provider | Current selected model | Input | Output | Applicable scope |
| --- | --- | ---: | ---: | --- |
| OpenAI | GPT-6 Astra | 10.00 | 50.00 | Standard, prompts ≤272K input tokens |
| OpenAI | GPT-6.1 Sol | 2.00 | 10.00 | Standard, prompts ≤272K input tokens |
| OpenAI | GPT-6.1 Terra | 1.00 | 5.00 | Standard, prompts ≤272K input tokens |
| OpenAI | GPT-6 Luna | 0.10 | 0.50 | Standard, prompts ≤272K input tokens |
| Anthropic | Claude Fable 5.2 | 8.00 | 40.00 | Standard |
| Anthropic | Claude Opus 5.5 | 4.00 | 20.00 | Standard |
| Anthropic | Claude Sonnet 5.5 | 2.00 | 10.00 | Standard |
| Anthropic | Claude Haiku 5.5 | 0.10 | 0.50 | Prompts ≤100K input tokens |
| Google | Gemini 4 Carbon | 2.00 | 10.00 | Standard paid-tier promotion through 30 Nov 2026 |
| Google | Gemini 4 Argon | 2.00 | 10.00 | Standard paid-tier promotion through 30 Nov 2026 |
| Google | Gemini 4 Hydrogen | 1.50 | 7.50 | Standard paid tier |
| xAI | Grok 4.7 | 2.00 | 6.00 | Standard tier, prompts strictly below 200K input tokens |
| DeepSeek | V4.1 Flash (`deepseek-flash`) | 0.30 | 1.20 | Peak; uncached input |
| DeepSeek | V4 Pro (`deepseek-v4-pro`) | 1.32 | 3.96 | Peak; uncached input |
| Mistral | Mistral Large 4 | 0.70 | 2.10 | Standard |
| Mistral | Mistral Small 4 | 0.15 | 0.60 | Standard |
| Alibaba Cloud | Qwen 3.8 Max | 2.00 | 6.00 | Singapore endpoint; International deployment |
| Alibaba Cloud | Qwen 3.8 Flash | 0.15 | 0.47 | Singapore endpoint; International deployment |
| Moonshot AI | Kimi K3.1 Pro | 2.00 | 10.00 | Standard uncached-input base; separate cache-write fees excluded |
| MiniMax | MiniMax M3 | 0.30 | 1.20 | Standard; prompts ≤512K input tokens |
| MiniMax | MiniMax M3.1 Flash | 0.15 | 0.60 | Standard |
| Z.ai | GLM 5.3 | 1.40 | 4.40 | Standard uncached input |
| Z.ai | GLM 5.3 Flash | 0.15 | 0.50 | Standard uncached input |

Official references reviewed:

- [OpenAI model catalog](https://developers.openai.com/api/docs/models), [pricing](https://developers.openai.com/api/docs/pricing), and individual model pages. Above 272K input tokens, input rates double and output rates increase by 50% for the full request.
- [Anthropic current lineup](https://platform.claude.com/docs/en/models/overview) and [pricing](https://platform.claude.com/docs/en/about-claude/pricing). Haiku's >100K rates are $0.50 input / $2.50 output.
- [Google model catalog](https://ai.google.dev/gemini-api/docs/models) and [pricing](https://ai.google.dev/gemini-api/docs/pricing). Carbon and Argon list $4 input / $20 output from 1 December 2026. Configuration expires the reviewed promotional scope at that boundary, so a new normalization will suppress it pending review. Output rates include thinking tokens.
- [xAI current model](https://docs.x.ai/developers/models/grok-4.7) and [model catalog](https://docs.x.ai/developers/models). The base tier applies strictly below 200K prompt tokens; requests at or above 200K use the higher published rate for the full request.
- [DeepSeek current models and pricing](https://api-docs.deepseek.com/quick_start/pricing/). Flash currently resolves to V4.1-Flash-1017; Pro to V4-Pro-0813. Off-peak rates are half the peak rates, with provider-defined UTC hours and Chinese holiday rules. Legacy Flash model aliases were removed from our selection.
- [Mistral model catalog](https://docs.mistral.ai/models), [Large 4](https://docs.mistral.ai/models/mistral-large-4-0), and [Small 4](https://docs.mistral.ai/models/mistral-small-4-0-26-03).

The cache key hashes the curated configuration, official source URLs and adapter version. There is a separate one-hour cache entry per provider. Unknown or changed pricing structures produce an adapter failure, preserving the last successful official snapshot as stale where available, otherwise showing N/A. The app has no fallback pricing feed.

## Provider expansion

The selection now covers 23 models from 10 providers. Additions were chosen to broaden direct-provider price comparisons while retaining current-generation models:

- **Alibaba Cloud / Qwen:** a current pay-as-you-go Max/Flash pair. [Official pricing](https://www.alibabacloud.com/help/en/model-studio/model-pricing) confirms Singapore/International rates. [The catalog](https://www.alibabacloud.com/help/en/model-studio/models) also lists Qwen 4 Max Preview, but its Token Plan subscription is outside this per-token board. Other deployment regions/scopes are not interchangeable with these rates.
- **Moonshot AI / Kimi:** current K3.1 Pro, confirmed in [its official model guide](https://platform.kimi.ai/docs/guide/kimi-k3-1-pro-quickstart). The adapter reads literal table data embedded in the [official pricing page](https://platform.kimi.ai/docs/pricing/chat), including input, output and separate cache-write TTL charges. It validates column identities and reads the data without executing page JavaScript. The bare Markdown version omits this table and is not used.
- **MiniMax:** current M3 and M3.1 Flash. [Official pricing](https://platform.minimax.io/docs/pricing/overview) confirms the listed rates. M3 doubles input and output rates above 512K input tokens; priority is 1.5× Standard.
- **Z.ai / GLM:** latest GLM 5.3 and its Flash option, confirmed by [official pricing](https://docs.z.ai/guides/overview/pricing). Coding Plan subscriptions, caching and web-search fees are separate.

All additions use the developer's direct API entry, not a third-party hosting quote for that model. Cohere was reviewed but deferred from this expansion: its current Command A+ public API is free within rate limits, while production Model Vault is separately priced ([official model documentation](https://docs.cohere.com/docs/command-a-plus)). Hosted-model marketplaces and cloud resellers would need a separate hosting-comparison scope. The board is a curated selection, not complete market coverage.
