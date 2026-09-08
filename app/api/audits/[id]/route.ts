import { env } from 'cloudflare:workers';

export async function GET(_request:Request,{params}:{params:Promise<{id:string}>}){
  const {id}=await params; if(!/^[0-9a-f-]{36}$/i.test(id))return Response.json({error:'INVALID_ID'},{status:400});
  const db=env.DB; if(!db)return Response.json({error:'DATABASE_UNAVAILABLE'},{status:503});
  const audit=await db.prepare("SELECT a.id,a.completed_at AS collectedAt,b.name,b.activity,b.website_url AS url,p.value AS poviraScore,p.method_version AS scoreVersion FROM audits a JOIN businesses b ON b.id=a.business_id LEFT JOIN scores p ON p.audit_id=a.id AND p.key='povira' WHERE a.id=?").bind(id).first();
  if(!audit)return Response.json({error:'NOT_FOUND'},{status:404});
  const [scores,pages,findings]=await Promise.all([
    db.prepare("SELECT key,value,applicable,confidence FROM scores WHERE audit_id=? AND key!='povira' ORDER BY value DESC").bind(id).all(),
    db.prepare('SELECT url,status_code AS statusCode,title,description,h1_count AS h1Count,word_count AS wordCount,raw FROM audit_pages WHERE audit_id=?').bind(id).all(),
    db.prepare('SELECT f.category,f.severity,f.evidence_type AS evidenceType,f.confidence,f.title,f.observation,f.why_it_matters AS whyItMatters,r.fix,r.impact,r.effort FROM findings f LEFT JOIN recommendations r ON r.finding_id=f.id WHERE f.audit_id=? ORDER BY CASE f.severity WHEN \'high\' THEN 3 WHEN \'medium\' THEN 2 WHEN \'low\' THEN 1 ELSE 0 END DESC').bind(id).all(),
  ]);
  return Response.json({audit,scores:scores.results,pages:pages.results.map((page)=>({...page,raw:typeof page.raw==='string'?JSON.parse(page.raw):page.raw})),findings:findings.results},{headers:{'Cache-Control':'no-store'}});
}
