import { assertSafePublicUrl } from './url-safety';
import { calculatePoviraScore, type ScoreInput } from './scoring';

export type EvidenceType = 'MEASURED' | 'OBSERVED' | 'INFERRED' | 'UNAVAILABLE';
export type AuditFinding = { id:string; category:string; severity:'high'|'medium'|'low'|'info'; title:string; observation:string; whyItMatters:string; fix:string; impact:'high'|'medium'|'low'; effort:'low'|'medium'|'high'; evidenceType:EvidenceType; confidence:'high'|'medium'|'low'; sourceUrl:string };
export type PageAnalysis = { url:string; statusCode:number; title:string|null; description:string|null; h1Count:number; h1:string|null; wordCount:number; canonical:string|null; viewport:boolean; schemaCount:number; imageCount:number; imagesWithoutAlt:number; internalLinks:string[]; favicon:string|null; logo:string|null; colors:string[]; hasCta:boolean; hasFaq:boolean; hasTestimonials:boolean; hasPricing:boolean; lang:string|null };
export type AuditResult = { id:string; business:{name:string;activity:string;url:string}; collectedAt:string; durationMs:number; pages:PageAnalysis[]; findings:AuditFinding[]; scores:Array<ScoreInput & { label:string }>; poviraScore:number; scoreVersion:string; robots:{available:boolean;allowed:boolean}; sitemap:{available:boolean}; providers:{search:'unavailable';ai:'unavailable';reputation:'unavailable';screenshots:'unavailable'}; sources:Array<{label:string;url:string;collectedAt:string;evidenceType:EvidenceType}>; persistence:'saved'|'unavailable' };

const decode = (value:string) => value.replace(/&amp;/g,'&').replace(/&quot;/g,'"').replace(/&#39;/g,"'").replace(/\s+/g,' ').trim();
const textContent = (html:string) => decode(html.replace(/<script[\s\S]*?<\/script>/gi,' ').replace(/<style[\s\S]*?<\/style>/gi,' ').replace(/<[^>]+>/g,' '));
const attr = (tag:string,name:string) => tag.match(new RegExp(`${name}\\s*=\\s*["']([^"']+)["']`,'i'))?.[1] ?? null;
const meta = (html:string,name:string) => { const tags=html.match(/<meta\b[^>]*>/gi) ?? []; const tag=tags.find((item)=>[attr(item,'name'),attr(item,'property')].some((v)=>v?.toLowerCase()===name.toLowerCase())); return tag ? attr(tag,'content') : null; };
const linkRel = (html:string,rel:string) => { const tags=html.match(/<link\b[^>]*>/gi) ?? []; const tag=tags.find((item)=>attr(item,'rel')?.toLowerCase().split(/\s+/).includes(rel)); return tag ? attr(tag,'href') : null; };
const absolute = (value:string|null,base:string) => { if(!value) return null; try { return new URL(value,base).href; } catch { return null; } };
const normalizeUrl = (value:string,base:string) => { try { const url=new URL(value,base); url.hash=''; for(const key of url.searchParams.keys()) if(key.startsWith('utm_')||['fbclid','gclid'].includes(key)) url.searchParams.delete(key); return url.href; } catch { return null; } };

async function safeFetch(input:string) {
  let current=input;
  for(let redirect=0;redirect<4;redirect++){
    assertSafePublicUrl(current);
    const response=await fetch(current,{redirect:'manual',headers:{'User-Agent':'PoviraAudit/1.0 (+https://povira.example; respectful-site-audit)','Accept':'text/html,application/xhtml+xml;q=0.9,text/plain;q=0.5'},signal:AbortSignal.timeout(12_000)});
    if(response.status>=300&&response.status<400){ const location=response.headers.get('location'); if(!location) return response; current=new URL(location,current).href; continue; }
    return response;
  }
  throw new Error('Trop de redirections.');
}

export function parsePage(html:string,url:string,statusCode:number):PageAnalysis {
  const title=decode(html.match(/<title\b[^>]*>([\s\S]*?)<\/title>/i)?.[1] ?? '') || null;
  const h1Matches=[...html.matchAll(/<h1\b[^>]*>([\s\S]*?)<\/h1>/gi)];
  const images=html.match(/<img\b[^>]*>/gi) ?? [];
  const links=html.match(/<a\b[^>]*href\s*=\s*["'][^"']+["'][^>]*>/gi) ?? [];
  const origin=new URL(url).origin;
  const candidates=links.flatMap((tag)=>{const item=normalizeUrl(attr(tag,'href')??'',url);return item?[item]:[]});
  const internalLinks=[...new Set(candidates.filter((item)=>new URL(item).origin===origin&&['http:','https:'].includes(new URL(item).protocol)))];
  const colorMatches=html.match(/#[0-9a-f]{6}\b/gi) ?? [];
  const colors=[...new Set(colorMatches.map((value)=>value.toUpperCase()))].slice(0,6);
  const lower=textContent(html).toLowerCase();
  const logoTag=images.find((tag)=>/logo/i.test(`${attr(tag,'alt')??''} ${attr(tag,'class')??''} ${attr(tag,'src')??''}`));
  return { url,statusCode,title,description:meta(html,'description'),h1Count:h1Matches.length,h1:h1Matches[0]?textContent(h1Matches[0][1]).slice(0,180):null,wordCount:textContent(html).split(/\s+/).filter(Boolean).length,canonical:absolute(linkRel(html,'canonical'),url),viewport:Boolean(meta(html,'viewport')),schemaCount:(html.match(/application\/ld\+json/gi)??[]).length,imageCount:images.length,imagesWithoutAlt:images.filter((tag)=>!attr(tag,'alt')?.trim()).length,internalLinks,favicon:absolute(linkRel(html,'icon'),url),logo:absolute(logoTag?attr(logoTag,'src'):null,url),colors,hasCta:/(contact|devis|réserver|acheter|commander|prendre rendez-vous|demander|commencer|essai)/i.test(lower),hasFaq:/(faq|questions fréquentes|foire aux questions)/i.test(lower),hasTestimonials:/(témoignages?|avis clients?|ils nous font confiance|testimonials?)/i.test(lower),hasPricing:/(tarifs?|prix|pricing|à partir de\s*\d|€)/i.test(lower),lang:html.match(/<html\b[^>]*lang=["']([^"']+)/i)?.[1] ?? null };
}

function finding(page:PageAnalysis,partial:Omit<AuditFinding,'id'|'sourceUrl'>):AuditFinding { return { id:crypto.randomUUID(),sourceUrl:page.url,...partial }; }

export function buildFindings(pages:PageAnalysis[]):AuditFinding[]{
  const home=pages[0]; const all:AuditFinding[]=[];
  const add=(condition:boolean,data:Omit<AuditFinding,'id'|'sourceUrl'>)=>{if(condition)all.push(finding(home,data));};
  add(!home.title||home.title.length<20,{category:'SEO',severity:'high',title:'Titre de page absent ou trop court',observation:home.title?`Le titre contient ${home.title.length} caractères.`:'Aucune balise title détectée.',whyItMatters:'Le titre aide les moteurs et les visiteurs à comprendre la page.',fix:'Rédiger un titre descriptif de 35 à 60 caractères.',impact:'high',effort:'low',evidenceType:'MEASURED',confidence:'high'});
  add(!home.description,{category:'SEO',severity:'medium',title:'Meta description absente',observation:'Aucune meta description détectée sur la page principale.',whyItMatters:'Elle permet de maîtriser le résumé proposé dans les résultats de recherche.',fix:'Ajouter une description spécifique de 140 à 160 caractères.',impact:'medium',effort:'low',evidenceType:'MEASURED',confidence:'high'});
  add(home.h1Count!==1,{category:'Contenu',severity:'high',title:'Structure H1 à corriger',observation:`${home.h1Count} titre H1 détecté${home.h1Count>1?'s':''}.`,whyItMatters:'Un titre principal clair structure la proposition de valeur.',fix:'Conserver un H1 unique qui précise l’offre et son public.',impact:'high',effort:'low',evidenceType:'MEASURED',confidence:'high'});
  add(!home.viewport,{category:'Technique',severity:'high',title:'Viewport mobile non détecté',observation:'La balise viewport est absente.',whyItMatters:'Sans viewport, l’affichage mobile peut être illisible.',fix:'Ajouter une balise viewport adaptée dans le head.',impact:'high',effort:'low',evidenceType:'MEASURED',confidence:'high'});
  add(!home.canonical,{category:'SEO',severity:'medium',title:'URL canonique absente',observation:'Aucune balise canonical détectée.',whyItMatters:'La canonical aide à consolider les variantes d’URL.',fix:'Déclarer l’URL canonique absolue de la page.',impact:'medium',effort:'low',evidenceType:'MEASURED',confidence:'high'});
  add(home.schemaCount===0,{category:'Données structurées',severity:'medium',title:'Aucune donnée Schema.org détectée',observation:'Aucun bloc JSON-LD présent sur la page principale.',whyItMatters:'Les données structurées facilitent l’interprétation de l’entité et des offres.',fix:'Ajouter Organization et un type métier pertinent en JSON-LD.',impact:'high',effort:'medium',evidenceType:'MEASURED',confidence:'high'});
  add(home.imageCount>0&&home.imagesWithoutAlt>0,{category:'Accessibilité',severity:'medium',title:'Images sans texte alternatif',observation:`${home.imagesWithoutAlt} image(s) sur ${home.imageCount} sans attribut alt utile.`,whyItMatters:'Les alternatives textuelles servent l’accessibilité et la compréhension des images.',fix:'Ajouter un alt descriptif aux images informatives et un alt vide aux décoratives.',impact:'medium',effort:'low',evidenceType:'MEASURED',confidence:'high'});
  add(!home.hasCta,{category:'Conversion',severity:'high',title:'Appel à l’action peu explicite',observation:'Aucun terme d’action commerciale courant n’a été détecté.',whyItMatters:'Le visiteur doit savoir immédiatement comment avancer.',fix:'Ajouter un CTA visible et spécifique au résultat attendu.',impact:'high',effort:'low',evidenceType:'OBSERVED',confidence:'medium'});
  add(!home.hasFaq,{category:'Contenu',severity:'low',title:'FAQ non détectée',observation:'Aucune section FAQ identifiable dans les pages explorées.',whyItMatters:'Une FAQ traite les objections et enrichit la couverture sémantique.',fix:'Créer une FAQ issue des vraies questions clients.',impact:'medium',effort:'medium',evidenceType:'OBSERVED',confidence:'medium'});
  add(pages.length<3,{category:'Contenu',severity:'medium',title:'Profondeur de site limitée',observation:`Seulement ${pages.length} page(s) HTML accessible(s) explorée(s).`,whyItMatters:'Des pages dédiées permettent d’expliquer chaque offre en profondeur.',fix:'Créer des pages d’offres distinctes lorsque cela correspond réellement à l’activité.',impact:'high',effort:'high',evidenceType:'MEASURED',confidence:'medium'});
  return all;
}

export function scorePages(pages:PageAnalysis[],robots:boolean,sitemap:boolean){
  const home=pages[0]; const altRatio=home.imageCount?1-home.imagesWithoutAlt/home.imageCount:1;
  const technical=Math.round((home.url.startsWith('https://')?15:0)+(home.statusCode===200?15:0)+(home.title?15:0)+(home.description?10:0)+(home.h1Count===1?10:0)+(home.canonical?10:0)+(home.viewport?10:0)+(robots?5:0)+(sitemap?5:0)+altRatio*5);
  const content=Math.round(Math.min(35,home.wordCount/12)+(pages.length>=3?20:pages.length*5)+(home.hasFaq?15:0)+(home.hasTestimonials?15:0)+(home.hasPricing?15:0));
  const brand=Math.round((home.favicon?25:0)+(home.logo?25:0)+(home.colors.length>=2?25:home.colors.length*10)+(metaLike(home)?25:0));
  const conversion=Math.round((home.h1?25:0)+(home.hasCta?30:0)+(home.hasTestimonials?20:0)+(home.hasPricing?15:0)+(pages.some((p)=>/contact|devis|book|rendez-vous/i.test(p.url))?10:0));
  const scores:Array<ScoreInput & {label:string}>=[{key:'technicalSeo',label:'SEO technique',value:technical,applicable:true,confidence:'high'},{key:'content',label:'Qualité du contenu',value:content,applicable:true,confidence:'medium'},{key:'brand',label:'Cohérence de marque',value:brand,applicable:true,confidence:'medium'},{key:'conversion',label:'Préparation conversion',value:conversion,applicable:true,confidence:'medium'}];
  return scores;
}
function metaLike(page:PageAnalysis){return Boolean(page.description&&page.title);}

export async function analyzeBusiness(input:{name:string;url:string;activity:string;mode:'quick'|'complete'}):Promise<AuditResult>{
  const started=Date.now(); const root=new URL(assertSafePublicUrl(input.url)); root.hash=''; const collectedAt=new Date().toISOString();
  const robotsUrl=new URL('/robots.txt',root).href; const sitemapUrl=new URL('/sitemap.xml',root).href;
  const [robotsResponse,sitemapResponse]=await Promise.all([safeFetch(robotsUrl).catch(()=>null),safeFetch(sitemapUrl).catch(()=>null)]);
  const robotsText=robotsResponse?.ok?await robotsResponse.text():''; const disallowed=robotsText.split(/\r?\n/).some((line)=>/^disallow:\s*\/$/i.test(line.trim()));
  if(disallowed) throw new Error('Le fichier robots.txt interdit l’exploration de ce site.');
  const limit=input.mode==='complete'?10:5; const queue=[root.href]; const seen=new Set<string>(); const pages:PageAnalysis[]=[];
  while(queue.length&&pages.length<limit){ const url=queue.shift()!; if(seen.has(url))continue; seen.add(url); try{ const response=await safeFetch(url); const type=response.headers.get('content-type')??''; if(!response.ok||!type.includes('text/html'))continue; const declared=Number(response.headers.get('content-length')??0); if(declared>2_000_000)continue; const html=(await response.text()).slice(0,2_000_000); const page=parsePage(html,response.url,response.status); pages.push(page); for(const link of page.internalLinks){if(!seen.has(link)&&queue.length<limit*5)queue.push(link);} }catch{continue;} }
  if(!pages.length) throw new Error('Aucune page HTML publique n’a pu être analysée.');
  const findings=buildFindings(pages); const scores=scorePages(pages,Boolean(robotsResponse?.ok),Boolean(sitemapResponse?.ok)); const aggregate=calculatePoviraScore(scores);
  return {id:crypto.randomUUID(),business:{name:input.name,activity:input.activity,url:root.href},collectedAt,durationMs:Date.now()-started,pages,findings,scores,poviraScore:aggregate.value,scoreVersion:aggregate.version,robots:{available:Boolean(robotsResponse?.ok),allowed:true},sitemap:{available:Boolean(sitemapResponse?.ok)},providers:{search:'unavailable',ai:'unavailable',reputation:'unavailable',screenshots:'unavailable'},sources:pages.map((page)=>({label:'Page du site',url:page.url,collectedAt,evidenceType:'MEASURED'})),persistence:'unavailable'};
}
