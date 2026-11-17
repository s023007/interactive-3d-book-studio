// ورّاق: ملف اختياري لتشغيل صوت شخصية عربية بطابع قصصي طبيعي.
// نشره يتطلب حساب Cloudflare Workers ومفتاح OpenAI API محفوظًا كسرّ.
// لا تضع أي مفاتيح داخل ملفات GitHub Pages أو داخل اللعبة.
const ORIGIN='https://s023007.github.io';
const headers={
  'Access-Control-Allow-Origin':ORIGIN,
  'Access-Control-Allow-Headers':'Content-Type, X-Warraq-Code',
  'Access-Control-Allow-Methods':'POST, OPTIONS',
  'Vary':'Origin',
  'Cache-Control':'no-store'
};
const json=(obj,status=200)=>new Response(JSON.stringify(obj),{status,headers:{...headers,'Content-Type':'application/json; charset=utf-8'}});
export default {
 async fetch(req,env){
  const origin=req.headers.get('origin');
  if(origin!==ORIGIN)return json({error:'Origin not permitted'},403);
  if(req.method==='OPTIONS')return new Response(null,{status:204,headers});
  const path=new URL(req.url).pathname;
  if(path!=='/speak'||req.method!=='POST')return json({error:'POST /speak required'},404);
  if(!env.OPENAI_API_KEY||!env.VOICE_ACCESS_CODE||env.VOICE_ACCESS_CODE.length<16)return json({error:'Voice service not configured'},503);
  if(req.headers.get('X-Warraq-Code')!==env.VOICE_ACCESS_CODE)return json({error:'Access denied'},401);
  let data;
  try{data=await req.json()}catch{return json({error:'Invalid payload'},400)}
  const text=String(data?.text||'').trim();
  const mentor=data?.speaker==='mentor';
  if(text.length<1||text.length>700)return json({error:'Text length 1–700 characters required'},400);
  const notes=mentor?'أدّ هذا النص بالعربية الفصحى الواضحة بصوت معلم رياضيات حماسي ودافئ. اجعل الإيقاع ودودًا، وانطق الأعداد والكسور بوضوح، مع تعبير تمثيلي طبيعي من دون صراخ.':'أدّ هذا النص بالعربية الفصحى الواضحة على لسان شخصية كرتونية أصيلة ولطيفة اسمها لُمى. صوت مرح وطبيعي ودافئ، مع فرح لطيف عند الإنجاز، واهتمام بالتلميحات. لا تقلّد أي شخصية تلفزيونية معروفة. انطق الكسور والقوانين الرياضية بوضوح.';
  try{
   const r=await fetch('https://api.openai.com/v1/audio/speech',{
     method:'POST',
     headers:{Authorization:'Bearer '+env.OPENAI_API_KEY,'Content-Type':'application/json'},
     body:JSON.stringify({
       model:'gpt-4o-mini-tts',
       voice:mentor?'marin':'coral',
       input:text,
       instructions:notes,
       response_format:'mp3',
       speed:1
     })
   });
   if(!r.ok){const status=r.status;return json({error:'Voice provider error',status},502)}
   const body=await r.arrayBuffer();
   if(body.byteLength>3_000_000)return json({error:'Unexpected size'},502);
   return new Response(body,{status:200,headers:{...headers,'Content-Type':'audio/mpeg','Content-Length':String(body.byteLength)}});
  }catch(e){return json({error:'Unexpected voice server error'},500)}
 }
};
