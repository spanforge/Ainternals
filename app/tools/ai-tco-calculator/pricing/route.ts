import { getModelPrices } from '@/lib/pricing/fetch-official';

export async function GET() {
  try {
    const data=await getModelPrices();
    const models=data.models.map(model=>{const publicModel={...model};delete publicModel.evidence;return publicModel;});
    return Response.json({models,status:data.status,fetchedAt:data.fetchedAt,issues:data.issues},{headers:{'Cache-Control':'no-store'}});
  }catch{
    return Response.json({models:[],status:'unavailable',message:'Price Watch could not be loaded. Manual pricing remains available.'},{status:503,headers:{'Cache-Control':'no-store'}});
  }
}
