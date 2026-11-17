// Optional AI backend for Warraq Image Lab — deploy separately to Cloudflare Workers.
// Never put OPENAI_API_KEY or WARRAQ_ACCESS_CODE in GitHub Pages client-side code.
const ALLOWED_DEFAULT='https://s023007.github.io';
const KINDS=['graph_area','sector','cube','sphere','cylinder','cone','unknown'];
function reply(data,status=200,origin=ALLOWED_DEFAULT){
 return new Response(JSON.stringify(data),{status,headers:{
  'Content-Type':'application/json; charset=utf-8',
  'Cache-Control':'no-store',
  'Access-Control-Allow-Origin':origin,
  'Access-Control-Allow-Headers':'Content-Type, X-Warraq-Code',
  'Access-Control-Allow-Methods':'POST, OPTIONS',
  'Vary':'Origin'
 }});
}
const schema={
 type:'object',additionalProperties:false,
 properties:{
  kind:{type:'string',enum:KINDS},
  title_ar:{type:'string'},
  explanation_ar:{type:'string'},
  confidence:{type:'string',enum:['high','medium','low']},
  samples:{type:'array',items:{type:'object',additionalProperties:false,properties:{x:{type:'number'},upper:{type:'number'},lower:{type:'number'}},required:['x','upper','lower']}}
 },
 required:['kind','title_ar','explanation_ar','confidence','samples']
};
const systemText=[
 'أنت خبير تعليم رياضيات ورؤية حاسوبية. حلل صورة من كتاب تعليمي بالعربية أو الإنجليزية.',
 'ابدأ بوصف ما يظهر فعلًا، ولا تتخيل معادلات أو نقاط تقاطع أو أبعادًا مفقودة.',
 'أعِد JSON فقط بالمخطط المطلوب. إن لم تكن البيانات مقروءة بوضوح اختر unknown وثقة low وعينات [].',
 'إذا كانت الصورة منطقة مظللة بين منحنيين وكان يمكن استنباط الدوال والمجال بصورة معقولة، اختر graph_area.',
 'لعنصر graph_area قدم نحو 25 نقطة مرتبة تصاعديًا حسب x في المجال الظاهر للمنطقة فقط؛ upper أكبر من lower لكل نقطة.',
 'لا تقدم نقاطًا عددية إذا لم تكن العلاقات الرياضية والمجال واضحين في الرسم والنص.',
 'لمجسم هندسي واضح يمكن اختيار sector cube sphere cylinder cone مع samples فارغة.',
 'الشرح العربي موجز (70 إلى 120 كلمة) يوضح الرسم والفرق بين التمثيل الثلاثي الأبعاد والبيانات الأصلية.',
 'لا تساوِ بين مساحة المنطقة وحجم الدوران. إظهار سمك لسطح ثنائي الأبعاد هو توضيح بصري فحسب.',
 'لصور الأجسام غير الرياضية، الخرائط، التشريح، أو الصور المعقدة اختر unknown؛ يحتاج إنشاؤها إلى خط 3D متخصص.',
 'إذا لم يكن واضحًا ما يمثله الرسم أو كانت البيانات ناقصة، صرّح بعدم اليقين.',
].join('\n');
export default {
 async fetch(request,env){
  const configured=env.ALLOWED_ORIGIN||ALLOWED_DEFAULT;
  const origin=request.headers.get('Origin')||'';
  if(origin!==configured)return reply({error:'Origin not allowed'},403,configured);
  if(request.method==='OPTIONS')return reply({ok:true},200,configured);
  const path=new URL(request.url).pathname;
  if(request.method!=='POST'||path!=='/analyze')return reply({error:'Only POST /analyze is supported'},404,configured);
  if(!env.OPENAI_API_KEY||!env.WARRAQ_ACCESS_CODE||env.WARRAQ_ACCESS_CODE.length<16)return reply({error:'Server secrets are not configured'},503,configured);
  if(request.headers.get('X-Warraq-Code')!==env.WARRAQ_ACCESS_CODE)return reply({error:'Access code rejected'},401,configured);
  const contentLength=Number(request.headers.get('content-length')||0);
  if(contentLength>4_000_000)return reply({error:'Image too large'},413,configured);
  let body;
  try{body=await request.json()}catch{return reply({error:'Invalid JSON'},400,configured)}
  const img=body?.image;
  if(typeof img!=='string'||img.length>4_000_000||!/^data:image\/(jpeg|png|webp);base64,[a-z0-9+/=]+$/i.test(img))return reply({error:'Invalid image format'},400,configured);
  try{
   const upstream=await fetch('https://api.openai.com/v1/responses',{
    method:'POST',
    headers:{'Authorization':'Bearer '+env.OPENAI_API_KEY,'Content-Type':'application/json'},
    body:JSON.stringify({
      model:env.VISION_MODEL||'gpt-4.1-mini',
      store:false,max_output_tokens:2700,
      input:[
       {role:'system',content:[{type:'input_text',text:systemText}]},
       {role:'user',content:[{type:'input_text',text:'حلل الرسم التعليمي. العينة ليست معلومات موثوقة إن لم تستطع قراءة الدوال والمحاور.'},{type:'input_image',image_url:img,detail:'high'}]}
      ],
      text:{format:{type:'json_schema',name:'warraq_scene',strict:true,schema}}
    })
   });
   if(!upstream.ok){return reply({error:'Vision provider unavailable',status:upstream.status},502,configured)}
   const result=await upstream.json();
   const content=result.output?.flatMap(item=>item.content||[]).filter(c=>c.type==='output_text').map(c=>c.text).join('')||result.output_text||'';
   let scene;
   try{scene=JSON.parse(content)}catch{return reply({error:'Could not parse vision response'},502,configured)}
   if(!KINDS.includes(scene.kind)||!['high','medium','low'].includes(scene.confidence))return reply({error:'Invalid model classification'},502,configured);
   const samples=Array.isArray(scene.samples)?scene.samples.slice(0,90).map(s=>({x:Number(s.x),upper:Number(s.upper),lower:Number(s.lower)})).filter(s=>[s.x,s.upper,s.lower].every(n=>Number.isFinite(n)&&Math.abs(n)<10000)):[];
   if(scene.kind==='graph_area'&&(samples.length<4||scene.confidence==='low'))scene.kind='unknown';
   return reply({kind:scene.kind,confidence:scene.confidence,title_ar:String(scene.title_ar||'رسم تعليمي').slice(0,170),explanation_ar:String(scene.explanation_ar||'').slice(0,3000),samples:scene.kind==='graph_area'?samples:[]},200,configured);
  }catch(err){return reply({error:'Unexpected server error'},500,configured)}
 }
};
