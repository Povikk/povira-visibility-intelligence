import { z } from 'zod';
import { safeUrlSchema } from '@/lib/url-safety';
import { calculatePoviraScore } from '@/lib/scoring';

const auditRequest = z.object({ name:z.string().trim().min(1).max(120), url:safeUrlSchema, activity:z.string().trim().min(2).max(180), mode:z.enum(['quick','complete']).default('quick') });
export async function POST(request:Request) {
  const parsed = auditRequest.safeParse(await request.json().catch(()=>null));
  if(!parsed.success) return Response.json({ error:'INVALID_AUDIT_REQUEST', issues:z.treeifyError(parsed.error) },{status:400});
  const id=crypto.randomUUID();
  const scores=calculatePoviraScore([{key:'technicalSeo',value:0,applicable:true,confidence:'low'},{key:'conversion',value:0,applicable:true,confidence:'low'},{key:'local',value:0,applicable:false,confidence:'low'}]);
  return Response.json({ id, status:'queued', mode:parsed.data.mode, demo:false, stages:['DISCOVERY','CRAWLING','SEO','BRAND','ANALYSIS','SCORING','REPORT'], scoreMethod:scores.version, note:'Les scores restent indisponibles tant que les mesures ne sont pas collectées.' },{status:202});
}
