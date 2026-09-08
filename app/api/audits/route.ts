import { z } from 'zod';
import { analyzeBusiness } from '@/lib/analyzer';
import { safeUrlSchema } from '@/lib/url-safety';
import { getAuditHistory, saveAudit } from '@/db/audit-store';

const auditRequest=z.object({name:z.string().trim().min(1).max(120),url:safeUrlSchema,activity:z.string().trim().min(2).max(180),mode:z.enum(['quick','complete']).default('quick')});

export async function POST(request:Request){
  const parsed=auditRequest.safeParse(await request.json().catch(()=>null));
  if(!parsed.success)return Response.json({error:'INVALID_AUDIT_REQUEST',message:'Vérifiez le nom, l’activité et utilisez une URL publique HTTP(S).',issues:z.treeifyError(parsed.error)},{status:400});
  try{
    const result=await analyzeBusiness(parsed.data);
    try{await saveAudit(result);result.persistence='saved';}catch(error){console.error(JSON.stringify({module:'persistence',success:false,error:error instanceof Error?error.message:'unknown'}));}
    return Response.json(result,{headers:{'Cache-Control':'no-store'}});
  }catch(error){return Response.json({error:'AUDIT_FAILED',message:error instanceof Error?error.message:'Audit impossible.'},{status:422});}
}

export async function GET(){
  try{return Response.json({audits:await getAuditHistory()},{headers:{'Cache-Control':'no-store'}});}catch{return Response.json({audits:[],warning:'Historique indisponible.'});}
}
