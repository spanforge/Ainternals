export type CapabilityReview={structuredOutput:boolean;imageInput:boolean;textInput:boolean;sourceUrl:string;reviewedOn:string};
// Reviewed from model-specific official pages, not inferred from provider or model names.
// Unlisted models remain unknown; these are capability facts, not image-price quotes.
export const modelCapabilities:Record<string,CapabilityReview>=Object.fromEntries(
  ['gpt-6-astra','gpt-6.1-sol','gpt-6.1-terra','gpt-6-luna'].map(id=>[id,{
    structuredOutput:true,imageInput:true,textInput:true,
    sourceUrl:`https://developers.openai.com/api/docs/models/${id}`,reviewedOn:'2026-11-14',
  }]),
);
