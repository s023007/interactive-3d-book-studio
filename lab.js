import * as THREE from 'three';
import {OrbitControls} from 'three/addons/controls/OrbitControls.js';
import * as pdfjs from 'https://cdn.jsdelivr.net/npm/pdfjs-dist@4.10.38/build/pdf.mjs';
pdfjs.GlobalWorkerOptions.workerSrc='https://cdn.jsdelivr.net/npm/pdfjs-dist@4.10.38/build/pdf.worker.min.mjs';
const $=id=>document.getElementById(id);
const ar=n=>String(n).replace(/\d/g,d=>'٠١٢٣٤٥٦٧٨٩'[+d]);
let source=null,preview=$('preview'),clip=null,pdf=null,sourceName='',explanation='',currentKind='graph_area',sceneKit=null,sceneData=null,timer;
const initialText='هذا مثال تعليمي على تمثيل المنطقة بين المنحنيين في مستوى س ص بسمك افتراضي، لإظهار شكلها عند تدوير المشهد. إضافة السمك لا تغيّر المعنى الرياضي للتكامل ولا تحوّل الشكل إلى حجم دوران.';
const nameMap={graph_area:'منطقة بين منحنيين',sector:'قطاع دائري',cube:'مكعب',sphere:'كرة',cone:'مخروط',cylinder:'أسطوانة',unknown:'رسم يحتاج إلى مراجعة'};
const kindText={
 graph_area:initialText,
 sector:'القطاع الدائري جزء من قرص تحدّه قطعتان مستقيمتان تمثلان نصفي قطر، وقوس من الدائرة. يعرض هنا بشكل ثلاثي الأبعاد لتوضيح حدوده.',
 cube:'للمكعب ستة أوجه مربعة متطابقة، واثنا عشر حرفًا وثمانية رؤوس.',
 sphere:'الكرة جسم ثلاثي الأبعاد، جميع نقاط سطحه على مسافة ثابتة من مركزه.',
 cone:'المخروط جسم ذو قاعدة دائرية ورأس واحد، يمكن تدويره لفهم العلاقة بين القاعدة والارتفاع.',
 cylinder:'الأسطوانة لها قاعدتان دائريتان متوازيتان وسطح جانبي منحني.'
};
const demoSamples=Array.from({length:65},(_,i)=>{const x=3*i/64,f=x*x-2*x,g=x+Math.sin(Math.PI*x);return{x,upper:Math.max(f,g),lower:Math.min(f,g),f,g}});
function toast(m){const node=$('labToast');node.textContent=m;node.classList.add('visible');clearTimeout(timer);timer=setTimeout(()=>node.classList.remove('visible'),4200)}
function setText(title,text,caution){$('analysisTitle').textContent=title;$('analysisText').textContent=text;$('accuracy').textContent=caution;explanation=text}
function showSource(canvas,label){
 if(!canvas||!canvas.width||!canvas.height)return;
 source=canvas; sourceName=label;clip=null;drawPreview();
 $('imageInfo').textContent='المصدر: '+label+'. الصورة محفوظة مؤقتًا في المتصفح فقط إلى أن تختار التحليل الآلي.';
}
function drawPreview(){
 const scale=Math.min(1,1100/source.width,950/source.height);
 preview.width=Math.max(1,Math.round(source.width*scale));preview.height=Math.max(1,Math.round(source.height*scale));
 preview.getContext('2d',{alpha:false}).drawImage(source,0,0,preview.width,preview.height);
 $('emptyImage').hidden=true;
 $('cropMarker').style.display='none';
}
async function readImage(file){
 if(!file)return;
 if(!/^image\/(jpeg|png|webp)$/.test(file.type)){toast('اختر صورة بصيغة JPG أو PNG أو WebP.');return}
 if(file.size>15*1024*1024){toast('اختر صورة يقل حجمها عن ١٥ ميجابايت.');return}
 try{
  const bitmap=await createImageBitmap(file);
  const c=document.createElement('canvas');c.width=bitmap.width;c.height=bitmap.height;
  c.getContext('2d',{alpha:false}).drawImage(bitmap,0,0);bitmap.close();showSource(c,file.name);
 }catch(e){console.error(e);toast('تعذر فتح هذه الصورة.')}
}
async function readPDF(file){
 if(!file)return;
 if(file.size>65*1024*1024){toast('هذا الإصدار يدعم PDF بحد أقصى ٦٥ ميجابايت.');return}
 try{
  const bytes=new Uint8Array(await file.arrayBuffer());
  pdf=await pdfjs.getDocument({data:bytes}).promise;
  sourceName=file.name;$('pdfCount').textContent=ar(pdf.numPages)+' صفحة';
  $('pdfNum').max=String(pdf.numPages);$('pdfControls').hidden=false;
  await renderPdf();
 }catch(e){console.error(e);toast('لم أتمكن من فتح ملف PDF.')}
}
async function renderPdf(){
 if(!pdf)return;
 const idx=Math.min(pdf.numPages,Math.max(1,Number($('pdfNum').value)||1));
 $('pdfNum').value=idx;$('renderPdf').disabled=true;$('imageInfo').textContent='جاري قراءة الصفحة ...';
 try{
  const page=await pdf.getPage(idx);
  const viewport=page.getViewport({scale:1});
  const factor=Math.min(2.2,1200/viewport.width,1600/viewport.height);
  const view=page.getViewport({scale:factor});
  const c=document.createElement('canvas');c.width=Math.ceil(view.width);c.height=Math.ceil(view.height);
  await page.render({canvasContext:c.getContext('2d',{alpha:false}),viewport:view}).promise;
  showSource(c,sourceName+'، صفحة '+ar(idx));page.cleanup();
 }catch(e){console.error(e);toast('تعذّر رسم صفحة PDF.')}
 finally{$('renderPdf').disabled=false}
}
function previewCrop(){
 if(!source)return null;
 const c=document.createElement('canvas');
 const rect=clip||{x:0,y:0,w:preview.width,h:preview.height};
 const x=Math.floor(rect.x*source.width/preview.width),y=Math.floor(rect.y*source.height/preview.height);
 const w=Math.max(1,Math.ceil(rect.w*source.width/preview.width)),h=Math.max(1,Math.ceil(rect.h*source.height/preview.height));
 const scale=Math.min(1,1100/w,1100/h);c.width=Math.max(1,Math.floor(w*scale));c.height=Math.max(1,Math.floor(h*scale));
 c.getContext('2d',{alpha:false}).drawImage(source,x,y,w,h,0,0,c.width,c.height);
 return c;
}
let start=null;
function coordinate(e){
 const r=preview.getBoundingClientRect();
 return {x:Math.max(0,Math.min(preview.width,(e.clientX-r.left)/r.width*preview.width)),
 y:Math.max(0,Math.min(preview.height,(e.clientY-r.top)/r.height*preview.height))};
}
preview.addEventListener('pointerdown',e=>{if(!source)return;start=coordinate(e);preview.setPointerCapture(e.pointerId)});
preview.addEventListener('pointerup',e=>{
 if(!start||!source)return;
 const end=coordinate(e);const x=Math.min(start.x,end.x),y=Math.min(start.y,end.y),w=Math.abs(start.x-end.x),h=Math.abs(start.y-end.y);
 start=null;
 if(w<18||h<18){clip=null;$('cropMarker').style.display='none';return}
 clip={x,y,w,h};
 const imgR=preview.getBoundingClientRect(),boxR=preview.parentElement.getBoundingClientRect(),mark=$('cropMarker');
 mark.style.left=(imgR.left-boxR.left+x/preview.width*imgR.width)+'px';
 mark.style.top=(imgR.top-boxR.top+y/preview.height*imgR.height)+'px';
 mark.style.width=w/preview.width*imgR.width+'px';mark.style.height=h/preview.height*imgR.height+'px';
 mark.style.display='block';toast('تم تحديد جزء الرسم للتحليل.');
});
$('clearCrop').onclick=()=>{clip=null;$('cropMarker').style.display='none';toast('سيُستخدم كامل الرسم.')};
function makeDemoImage(){
 const c=document.createElement('canvas');c.width=840;c.height=570;const x=c.getContext('2d');
 x.fillStyle='#f5fcff';x.fillRect(0,0,c.width,c.height);
 const X=v=>145+v*170,Y=v=>420-v*90;
 x.lineWidth=2;x.strokeStyle='#74858d';
 x.beginPath();x.moveTo(85,Y(0));x.lineTo(760,Y(0));x.moveTo(X(0),35);x.lineTo(X(0),525);x.stroke();
 for(let i=0;i<demoSamples.length;i++){
  const p=demoSamples[i]; if(i===0){x.beginPath();x.moveTo(X(p.x),Y(p.g));}else x.lineTo(X(p.x),Y(p.g));
 }
 x.strokeStyle='#2f7e91';x.lineWidth=4;x.stroke();
 for(let i=0;i<demoSamples.length;i++){const p=demoSamples[i];if(i===0){x.beginPath();x.moveTo(X(p.x),Y(p.f));}else x.lineTo(X(p.x),Y(p.f))}
 x.strokeStyle='#a56839';x.stroke();
 x.beginPath();demoSamples.forEach((p,i)=>i?x.lineTo(X(p.x),Y(p.upper)):x.moveTo(X(p.x),Y(p.upper)));
 for(let i=demoSamples.length-1;i>=0;i--){const p=demoSamples[i];x.lineTo(X(p.x),Y(p.lower))}
 x.closePath();x.fillStyle='#8dc2b36b';x.fill();x.strokeStyle='#276a60';x.lineWidth=1;x.stroke();
 x.font='28px Arial';x.fillStyle='#183d4e';x.fillText('f(x) = x² − 2x',450,100);x.fillText('g(x) = x + sin(πx)',440,145);
 x.fillText('0',120,448);x.fillText('3',635,448);x.fillText('y',116,47);x.fillText('x',775,429);
 showSource(c,'رسم تعليمي تجريبي، وليس رسمًا مستخرجًا من كتابك');
 $('figureKind').value='graph_area';
}
function stop3d(){
 if(!sceneKit)return;
 cancelAnimationFrame(sceneKit.raf);sceneKit.observer.disconnect();sceneKit.controls.dispose();
 sceneKit.group.traverse(o=>{if(o.geometry)o.geometry.dispose();if(o.material)(Array.isArray(o.material)?o.material:[o.material]).forEach(m=>m.dispose())});
 sceneKit.renderer.dispose();sceneKit.renderer.domElement.remove();sceneKit=null;
}
function install3d(){
 stop3d();
 const host=$('modelCanvas'),scene=new THREE.Scene(),camera=new THREE.PerspectiveCamera(40,1,.05,150);
 camera.position.set(4,3.2,6.3);
 const renderer=new THREE.WebGLRenderer({antialias:true,alpha:true,powerPreference:'low-power'});
 renderer.setPixelRatio(Math.min(window.devicePixelRatio||1,2));
 host.replaceChildren(renderer.domElement);
 const hemi=new THREE.HemisphereLight(0xffffff,0x6e9890,2.4);scene.add(hemi);
 const key=new THREE.DirectionalLight(0xffffff,2.3);key.position.set(4,7,5);scene.add(key);
 const grid=new THREE.GridHelper(10,20,0xb5ceca,0xd2e5e2);grid.position.y=-1.85;scene.add(grid);
 const group=new THREE.Group();scene.add(group);
 const controls=new OrbitControls(camera,renderer.domElement);controls.enableDamping=true;controls.enablePan=false;controls.minDistance=2;controls.maxDistance=18;
 const resize=()=>{const w=Math.max(host.clientWidth,50),h=Math.max(host.clientHeight,50);renderer.setSize(w,h,false);camera.aspect=w/h;camera.updateProjectionMatrix()};
 const observer=new ResizeObserver(resize);observer.observe(host);resize();
 sceneKit={scene,group,camera,renderer,observer,controls,raf:null};
 function animate(){if(!sceneKit)return;sceneKit.raf=requestAnimationFrame(animate);controls.update();renderer.render(scene,camera)}
 animate();
}
function line(points,color){
 const geo=new THREE.BufferGeometry().setFromPoints(points.map(a=>new THREE.Vector3(a[0],a[1],a[2])));
 return new THREE.Line(geo,new THREE.LineBasicMaterial({color,linewidth:2}));
}
function addGraph(group,samples,depth){
 const safe=samples.filter(p=>Number.isFinite(p.x)&&Number.isFinite(p.upper)&&Number.isFinite(p.lower)).sort((a,b)=>a.x-b.x);
 if(safe.length<4)throw Error('لا توجد نقاط كافية لإنشاء نموذج المنحنيين');
 const xs=safe.map(p=>p.x),ys=safe.flatMap(p=>[p.upper,p.lower]);
 const minX=Math.min(...xs),maxX=Math.max(...xs),minY=Math.min(...ys),maxY=Math.max(...ys);
 if(maxX-minX<.01||maxY-minY<.01)throw Error('القيم المكتشفة لا تمثل منطقة واضحة');
 const sx=4/(maxX-minX),sy=3.6/Math.max(.1,maxY-minY),cx=(minX+maxX)/2,cy=(minY+maxY)/2;
 const fx=p=>(p.x-cx)*sx, fy=y=>(y-cy)*sy;
 const verts=[],colors=[];
 function tri(a,b,c){for(const v of [a,b,c])verts.push(...v)}
 function quad(a,b,c,d){tri(a,b,c);tri(a,c,d)}
 for(let i=0;i<safe.length-1;i++){
  const p=safe[i],q=safe[i+1],x1=fx(p),x2=fx(q),u1=fy(p.upper),l1=fy(p.lower),u2=fy(q.upper),l2=fy(q.lower),z=depth/2;
  quad([x1,u1,z],[x2,u2,z],[x2,l2,z],[x1,l1,z]);
  quad([x1,l1,-z],[x2,l2,-z],[x2,u2,-z],[x1,u1,-z]);
  quad([x1,u1,z],[x1,u1,-z],[x2,u2,-z],[x2,u2,z]);
  quad([x1,l1,-z],[x1,l1,z],[x2,l2,z],[x2,l2,-z]);
 }
 const first=safe[0],last=safe[safe.length-1],a=fx(first),b=fx(last),z=depth/2;
 quad([a,fy(first.upper),z],[a,fy(first.lower),z],[a,fy(first.lower),-z],[a,fy(first.upper),-z]);
 quad([b,fy(last.lower),z],[b,fy(last.upper),z],[b,fy(last.upper),-z],[b,fy(last.lower),-z]);
 const geo=new THREE.BufferGeometry();geo.setAttribute('position',new THREE.Float32BufferAttribute(verts,3));geo.computeVertexNormals();
 group.add(new THREE.Mesh(geo,new THREE.MeshStandardMaterial({color:0x38a69c,side:THREE.DoubleSide,metalness:.07,roughness:.44,transparent:true,opacity:.78})));
 group.add(line(safe.map(p=>[fx(p),fy(p.upper),z+.018]),0x19596b));
 group.add(line(safe.map(p=>[fx(p),fy(p.lower),z+.018]),0xb57242));
 group.add(line([[-2.3,fy(0),0],[2.3,fy(0),0]],0x4d6971));
 group.add(line([[fx(0),-1.8,0],[fx(0),1.8,0]],0x4d6971));
}
function addSector(group,depth){
 const s=new THREE.Shape(),r=1.5,angle=Math.PI*1.5;
 s.moveTo(0,0);s.lineTo(r,0);
 for(let i=0;i<=50;i++)s.lineTo(r*Math.cos(angle*i/50),r*Math.sin(angle*i/50));
 s.lineTo(0,0);
 const geom=new THREE.ExtrudeGeometry(s,{depth,bevelEnabled:true,bevelSize:.03,bevelThickness:.03,bevelSegments:2});
 const mesh=new THREE.Mesh(geom,new THREE.MeshStandardMaterial({color:0x38a69c,roughness:.38,side:THREE.DoubleSide}));
 mesh.rotation.x=-Math.PI/2;group.add(mesh);
}
function create3d(kind,data){
 if(!sceneKit)install3d();
 sceneKit.group.traverse(o=>{if(o.geometry)o.geometry.dispose();if(o.material)(Array.isArray(o.material)?o.material:[o.material]).forEach(m=>m.dispose())});
 sceneKit.group.clear();
 const group=sceneKit.group,depth=Number($('depthSlider').value),mat=new THREE.MeshStandardMaterial({color:0x318e88,metalness:.05,roughness:.4,side:THREE.DoubleSide});
 if(kind==='graph_area')addGraph(group,data?.samples?.length>3?data.samples:demoSamples,depth);
 else if(kind==='sector')addSector(group,depth);
 else{
  let g;
  if(kind==='cube')g=new THREE.BoxGeometry(2,2,2);
  else if(kind==='sphere')g=new THREE.SphereGeometry(1.4,42,32);
  else if(kind==='cone')g=new THREE.ConeGeometry(1.35,2.5,50);
  else if(kind==='cylinder')g=new THREE.CylinderGeometry(1.15,1.15,2.5,48);
  if(g){group.add(new THREE.Mesh(g,mat));const edge=new THREE.LineSegments(new THREE.EdgesGeometry(g),new THREE.LineBasicMaterial({color:0x175d59,transparent:true,opacity:.4}));group.add(edge)}
 }
 sceneData=data||null;currentKind=kind;$('depthValue').textContent=ar(depth.toFixed(1));
}
function createManual(){
 const kind=$('figureKind').value;
 try {create3d(kind,{samples:demoSamples})}
 catch(e){console.error(e);toast('تعذّر إنشاء المشهد.');return}
 setText(nameMap[kind],kindText[kind],'نموذج توضيحي مختار يدويًا — لم يتم تحليل الصورة آليًا.');
 toast('تم إنشاء النموذج. اسحب داخل المشهد لتدويره.');
}
function sampleValidator(v){
 if(!Array.isArray(v))return[];
 return v.slice(0,90).map(p=>({x:Number(p.x),upper:Number(p.upper),lower:Number(p.lower)})).filter(p=>[p.x,p.upper,p.lower].every(n=>Number.isFinite(n)&&Math.abs(n)<=10000));
}
async function analyze(){
 if(!source){toast('ارفع صورة أو اختر صفحة PDF أولًا.');return}
 const url=$('workerUrl').value.trim();
 if(!/^https:\/\/[^ \\/]+\\/.*/.test(url)){toast('أضف رابط HTTPS صالحًا لخادم التحليل.');return}
 try{localStorage.setItem('warraq-worker-url',url)}catch{}
 const image=previewCrop();
 const button=$('analyze');button.disabled=true;button.textContent='جاري قراءة الرسم ...';
 try{
  const response=await fetch(url,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({image:image.toDataURL('image/jpeg',.82),source:sourceName})});
  if(!response.ok)throw Error('الخادم أعاد HTTP '+response.status);
  const data=await response.json();
  const kind=nameMap[data.kind]?data.kind:'unknown';
  const title=String(data.title_ar||nameMap[kind]).slice(0,160),text=String(data.explanation_ar||'').slice(0,2800);
  if(kind==='unknown'||data.confidence==='low'){
    setText(title,text||'الرسم غير واضح بما يكفي.', 'لا يوجد تحويل تلقائي موثوق؛ راجع الرسم مع المعلم قبل إنشاء مجسم.');
    toast('لم تُحدد هندسة موثوقة للصورة.');return;
  }
  if(kind==='graph_area' && sampleValidator(data.samples).length<4)throw Error('لم يقدم النموذج نقاط المنحنيين بشكل كافٍ');
  create3d(kind,{samples:sampleValidator(data.samples)});
  setText(title,text,'تحليل آلي بدرجة ثقة '+String(data.confidence||'غير محددة')+'، يحتاج مراجعة المصطلحات والمعادلات قبل استخدامه في التدريس.');
  toast('تم إنشاء تمثيل ثلاثي الأبعاد من اقتراح الخدمة. راجع صحته.');
 }catch(e){console.error(e);toast('فشل التحليل: '+e.message)}
 finally{button.disabled=false;button.textContent='تحليل الصورة وإنشاء المشهد'}
}
function speak(){
 if(!('speechSynthesis'in window)){toast('المتصفح لا يدعم القراءة الصوتية.');return}
 speechSynthesis.cancel();
 const msg=new SpeechSynthesisUtterance(explanation||initialText);msg.lang='ar-OM';msg.rate=.88;
 const v=speechSynthesis.getVoices().find(v=>v.lang?.toLowerCase().startsWith('ar'));if(v)msg.voice=v;
 speechSynthesis.speak(msg);
}
$('drawingFile').onchange=e=>{pdf=null;$('pdfControls').hidden=true;void readImage(e.target.files?.[0]);e.target.value=''};
$('pdfFile').onchange=e=>{void readPDF(e.target.files?.[0]);e.target.value=''};
$('renderPdf').onclick=()=>void renderPdf();
$('sample').onclick=()=>{makeDemoImage();createManual()};
$('build').onclick=createManual;
$('analyze').onclick=()=>void analyze();
$('speakExplanation').onclick=speak;
$('stopExplanation').onclick=()=>speechSynthesis?.cancel();
$('resetView').onclick=()=>{if(sceneKit){sceneKit.camera.position.set(4,3.2,6.3);sceneKit.controls.target.set(0,0,0);sceneKit.controls.update()}};
$('depthSlider').oninput=()=>create3d(currentKind,sceneData);
document.querySelectorAll('input[name="mode"]').forEach(i=>i.onchange=()=>{const ai=document.querySelector('input[name="mode"]:checked').value==='ai';$('aiPanel').hidden=!ai;$('manualPanel').hidden=ai});
try{$('workerUrl').value=localStorage.getItem('warraq-worker-url')||''}catch{}
try{
 const stored=sessionStorage.getItem('warraq-drawing-preview');
 if(stored?.startsWith('data:image/')){
  const img=new Image();img.onload=()=>{const c=document.createElement('canvas');c.width=img.naturalWidth;c.height=img.naturalHeight;c.getContext('2d',{alpha:false}).drawImage(img,0,0);showSource(c,'صفحة أرسلتها من قارئ الكتاب');};img.src=stored;
  sessionStorage.removeItem('warraq-drawing-preview');
 }
}catch{}
try {install3d();makeDemoImage();createManual()}catch(e){console.error(e);toast('يتطلب العرض 3D متصفحًا يدعم WebGL.')}
window.addEventListener('beforeunload',()=>{if('speechSynthesis'in window)speechSynthesis.cancel();stop3d()});
