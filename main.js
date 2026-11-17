import { PageFlip } from 'https://cdn.jsdelivr.net/npm/page-flip@2.0.7/dist/js/page-flip.module.js';
import * as pdfjs from 'https://cdn.jsdelivr.net/npm/pdfjs-dist@4.10.38/build/pdf.mjs';
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

pdfjs.GlobalWorkerOptions.workerSrc = 'https://cdn.jsdelivr.net/npm/pdfjs-dist@4.10.38/build/pdf.worker.min.mjs';

const el = (id) => document.getElementById(id);
const arabic = (v) => String(v).replace(/\d/g, (d) => '٠١٢٣٤٥٦٧٨٩'[+d]);
const byId = (name) => el(name);
const MAX_PAGES = 120;
const MAX_FILE_SIZE = 65 * 1024 * 1024;
const defaults = {
  0: { narration: 'مرحبًا بكم في درس القياس الدائري. يمكنكم تقليب الصفحات واستكشاف المجسمات.', shape: 'sector' },
  1: { narration: 'الزاوية المركزية رأسها في مركز الدائرة، وضلعَاها نصفا قطر.', shape: 'sector' },
  2: { narration: 'افتح القطاع الدائري ثلاثي الأبعاد، وغيّر قياس زاويته باستخدام المنزلق.', shape: 'sector' },
  3: { narration: 'الآن اختبر نفسك: كم قياس الدورة الكاملة؟', shape: 'sector', quiz: { question: 'كم قياس الدورة الكاملة بالدرجات؟', choices: ['٩٠ درجة', '١٨٠ درجة', '٣٦٠ درجة'], correct: 2 } }
};
const shapeNames = { sector: ['قطاع دائري', 'غيّر الزاوية باستخدام المنزلق وتعرّف على شكل القطاع.'], cube: ['مكعب', '٦ أوجه مربعة متطابقة.'], sphere: ['كرة', 'جميع النقاط على السطح تبعد مسافة متساوية عن المركز.'], cylinder: ['أسطوانة', 'قاعدتان دائريتان وسطح جانبي منحني.'], cone: ['مخروط', 'قاعدة دائرية ورأس واحد.'] };
let flip = null, pdf = null, pages = [], current = 0, bookType = 'demo', bookId = 'demo-v1', records = {}, generation = 0, currentSound = null, viewer3d = null, toastTimer = null;
const audioByPage = new Map();
const pending = new Map();

function toast(message) {
  const box = el('toast');
  box.textContent = message; box.classList.add('visible');
  clearTimeout(toastTimer); toastTimer = setTimeout(() => box.classList.remove('visible'), 3800);
}
function status(message) { el('status').textContent = '● ' + message; }
function safeStored() {
  try { const data = JSON.parse(localStorage.getItem('warraq:' + bookId) || '{}'); return data && typeof data === 'object' ? data : {}; }
  catch { return {}; }
}
function saveStored() {
  try { localStorage.setItem('warraq:' + bookId, JSON.stringify(records)); }
  catch { toast('تعذّر تخزين الملاحظات في هذا المتصفح.'); }
}
function pageInfo(i = current) {
  if (!records[i]) records[i] = structuredClone(bookType === 'demo' ? (defaults[i] || {}) : {});
  return records[i];
}
function stopSound() {
  if ('speechSynthesis' in window) window.speechSynthesis.cancel();
  if (currentSound) { currentSound.pause(); currentSound = null; }
}
function clearAudio() {
  stopSound();
  for (const url of audioByPage.values()) URL.revokeObjectURL(url);
  audioByPage.clear();
}
function makePage(content, i, type = '') {
  const node = document.createElement('div');
  node.className = 'page ' + type;
  node.dataset.page = String(i);
  node.innerHTML = content; // Only static app-authored markup; user input uses textContent.
  return node;
}
const circleSvg = `<svg class="circle-art" viewBox="0 0 290 220" aria-label="قطاع زاوية مركزية ٩٠ درجة"><circle cx="146" cy="107" r="85" fill="none" stroke="#5f9d9a" stroke-width="3"/><path d="M146 107 L231 107 A85 85 0 0 0 146 22 Z" fill="#eacb9b" stroke="#bf9757" stroke-width="2"/><line x1="46" y1="107" x2="250" y2="107" stroke="#c0cac3"/><line x1="146" y1="6" x2="146" y2="211" stroke="#c0cac3"/><text x="172" y="74" font-size="18" fill="#315c62">٩٠°</text></svg>`;
function demoPages() {
  return [
    makePage('<div class="page-inner cover"><div class="cover-emblem">✦</div><div><small>إصدار تعليمي تفاعلي</small><h2>عالم الهندسة<br>والقياس الدائري</h2><p>شاهد · حرّك · استمع · اختبر نفسك</p></div><small>ورّاق — نسخة تجريبية</small></div>',0),
    makePage('<div class="page-inner"><span class="page-id">الدرس ١ — اكتشف المفهوم</span><h3>ما الزاوية المركزية؟</h3><p>الزاوية المركزية رأسها في مركز الدائرة، وضلعاها نصفا قطر.</p>' + circleSvg + '<div class="formula">٩٠° = ربع دورة</div><div class="page-foot"><span>القياس الدائري</span><span>ورّاق</span></div></div>',1),
    makePage('<div class="page-inner"><span class="page-id">الدرس ٢ — الاستكشاف</span><h3>من الورق إلى المجسم</h3><p>تخيّل قطاعًا دائريًا له سُمك. افتح النموذج وغيّر زاويته بنفسك.</p><div class="formula">دوران 3D + زاوية قابلة للتغيير</div><button class="page-cta" data-action="3d">◈ افتح المجسم</button><div class="page-foot"><span>استكشف بالنظر واللمس</span><span>ورّاق</span></div></div>',2),
    makePage('<div class="page-inner"><span class="page-id">الدرس ٣ — تحقق من فهمك</span><h3>جرّب اختبارًا سريعًا</h3><p>هل تتذكر قياس الدورة الكاملة؟</p><div class="formula">دورة كاملة = ؟</div><button class="page-cta" data-action="quiz">✓ ابدأ الاختبار</button><div class="page-foot"><span>تقويم وتغذية راجعة</span><span>ورّاق</span></div></div>',3)
  ];
}
function pdfPages(count) {
  return Array.from({length:count}, (_, i) => makePage('<div class="pdfview"><span class="loading-page">جاري تجهيز الصفحة ' + arabic(i+1) + '</span><canvas aria-label="صفحة ' + arabic(i+1) + '"></canvas></div><div class="pdf-actions"><button data-action="3d">◈ مجسم</button><button data-action="voice">♫ صوت</button><button data-action="quiz">✓ سؤال</button></div>',i,'pdfpage'));
}
function destroyBook() {
  generation++; clearAudio(); pending.clear();
  const stage = el('dropzone');
  if (flip) { try { flip.destroy(); } catch (err) { console.warn(err); } flip = null; }
  // StPageFlip.destroy() removes its root element entirely.
  // Re-create the root so switching to a demo or a new PDF never leaves a blank reader.
  let root = el('flipbook');
  if (!root) {
    root = document.createElement('div');
    root.id = 'flipbook';
    root.className = 'flipbook';
    stage.insertBefore(root, el('dropTip'));
  } else {
    root.replaceChildren();
  }
  pages = []; pdf = null;
}
function mount(nextPages) {
  const container = el('flipbook');
  container.replaceChildren(...nextPages);
  pages = nextPages;
  flip = new PageFlip(container, { width: 400, height: 560, size: 'stretch', minWidth: 205, maxWidth: 470, minHeight: 290, maxHeight: 660, usePortrait: true, showCover: bookType === 'demo', flippingTime: 620, drawShadow: true, maxShadowOpacity: 0.32, autoSize: true, mobileScrollSupport: false, disableFlipByClick: false });
  const token = generation;
  flip.on('flip', e => { if (token === generation) selectPage(Number(e.data)); });
  flip.loadFromHTML(nextPages);
  selectPage(0);
  el('dropTip').textContent = bookType === 'pdf' ? 'اسحب طرف الصفحة للتقليب، أو استخدم الأسهم أدناه' : 'اسحب طرف الورقة للتقليب، أو ارفع ملف PDF من جهازك';
}
function selectPage(i) {
  current = Math.max(0, Math.min(pages.length-1, Number.isFinite(i) ? i : 0));
  el('current').textContent = arabic(current + 1);
  el('total').textContent = arabic(pages.length);
  el('prev').disabled = current === 0; el('next').disabled = current >= pages.length - 1;
  const data = pageInfo();
  el('narration').value = data.narration || '';
  el('shape').value = shapeNames[data.shape] ? data.shape : 'sector';
  el('question').value = data.quiz?.question || '';
  for(let j=0;j<3;j++) el('choice'+j).value = data.quiz?.choices?.[j] || '';
  el('correct').value = String(data.quiz?.correct ?? 0);
  el('audioInfo').textContent = audioByPage.has(current) ? 'تم إضافة تسجيل لهذه الصفحة ✓' : 'يمكن استخدام ملف صوتي من جهازك مؤقتًا';
  if (bookType === 'pdf') drawNearby();
}
function loadDemo() {
  destroyBook(); bookType = 'demo'; bookId = 'demo-v1'; records = safeStored();
  el('title').textContent = 'كتاب الرياضيات التفاعلي';
  el('subtitle').textContent = 'تجربة القياس الدائري، والتقليب ثلاثي الأبعاد، والصوت، والتقويم.';
  mount(demoPages()); status('الكتاب التجريبي جاهز');
}
async function loadFile(file) {
  if (!file || (!file.name.toLowerCase().endsWith('.pdf') && file.type !== 'application/pdf')) { toast('اختر ملف PDF صالحًا.'); return; }
  if (file.size > MAX_FILE_SIZE) { toast('الحد الأقصى لحجم الملف ٦٥ ميجابايت في هذا الإصدار.'); return; }
  status('جاري فتح PDF...');
  try {
    const data = new Uint8Array(await file.arrayBuffer());
    const doc = await pdfjs.getDocument({data}).promise;
    destroyBook(); pdf = doc; bookType = 'pdf';
    bookId = 'pdf:' + (doc.fingerprints?.[0] || (file.name + ':' + file.size));
    records = safeStored();
    el('title').textContent = file.name.replace(/\.pdf$/i,'');
    el('subtitle').textContent = 'كتاب PDF من جهازك — ' + arabic(doc.numPages) + ' صفحة';
    const count = Math.min(doc.numPages, MAX_PAGES);
    mount(pdfPages(count));
    status('الكتاب جاهز للتصفح');
    if (doc.numPages > MAX_PAGES) toast('تظهر أول ' + arabic(MAX_PAGES) + ' صفحة فقط في هذه النسخة التجريبية.');
    else toast('تم فتح كتابك بنجاح.');
  } catch(err) { console.error(err); status('تعذّر فتح PDF'); toast('تعذر قراءة هذا الملف. تحقق من سلامته أو كلمة مروره.'); }
}
async function renderPage(index, token) {
  if (!pdf || token !== generation || index < 0 || index >= pages.length) return;
  const canvas = pages[index]?.querySelector('canvas');
  if (!canvas || canvas.dataset.loaded === 'true') return;
  if (pending.has(index)) return pending.get(index);
  const job = (async () => {
    try {
      const page = await pdf.getPage(index+1);
      if (token !== generation) return;
      const view = page.getViewport({scale:1});
      const scale = Math.min(1.6, 850/view.width, 1100/view.height);
      const viewport = page.getViewport({scale});
      canvas.width = Math.round(viewport.width); canvas.height = Math.round(viewport.height);
      const ctx = canvas.getContext('2d',{alpha:false});
      await page.render({canvasContext:ctx,viewport}).promise;
      if (token !== generation) return;
      canvas.dataset.loaded = 'true';
      pages[index].querySelector('.loading-page')?.remove();
      page.cleanup();
    } catch(err) {
      console.error('PDF render:',err);
      const hint = pages[index]?.querySelector('.loading-page');
      if(hint) hint.textContent = 'تعذّر عرض الصفحة';
    }
  })();
  pending.set(index,job);
  try { await job; } finally { pending.delete(index); }
}
function drawNearby() {
  if (!pdf) return;
  const token = generation;
  for(let i=Math.max(0,current-2);i<=Math.min(pages.length-1,current+3);i++) void renderPage(i,token);
  for(let i=0;i<pages.length;i++) {
    if(Math.abs(i-current)<=8 || pending.has(i)) continue;
    const canvas = pages[i]?.querySelector('canvas');
    if(canvas?.dataset.loaded==='true') {
      canvas.width=1; canvas.height=1; delete canvas.dataset.loaded;
      const hint=document.createElement('span'); hint.className='loading-page'; hint.textContent='صفحة '+arabic(i+1);
      pages[i].querySelector('.pdfview')?.prepend(hint);
    }
  }
}
function stop3d() {
  if(!viewer3d) return;
  cancelAnimationFrame(viewer3d.raf);
  viewer3d.resize.disconnect();
  viewer3d.controls.dispose();
  viewer3d.group.traverse(o=>{
    if(o.geometry) o.geometry.dispose();
    if(o.material) (Array.isArray(o.material)?o.material:[o.material]).forEach(m=>m.dispose());
  });
  viewer3d.renderer.dispose();
  viewer3d.renderer.domElement.remove();
  viewer3d=null;
}
function newShape() {
  if (!viewer3d) return;
  const {group} = viewer3d;
  for(const obj of [...group.children]) {
    obj.traverse(o=>{if(o.geometry)o.geometry.dispose();if(o.material)(Array.isArray(o.material)?o.material:[o.material]).forEach(m=>m.dispose())});
    group.remove(obj);
  }
  const kind = el('shape').value, angle = Number(el('angle').value);
  const material = new THREE.MeshStandardMaterial({color:0x248b83,metalness:.12,roughness:.36,side:THREE.DoubleSide});
  let geom;
  if(kind==='sector') {
    const sector=new THREE.Shape(), radius=1.4;
    sector.moveTo(0,0);sector.lineTo(radius,0);
    const n=Math.max(32,Math.ceil(angle/3));
    for(let i=1;i<=n;i++){const a=angle*Math.PI/180*i/n;sector.lineTo(Math.cos(a)*radius,Math.sin(a)*radius)}
    sector.lineTo(0,0);
    geom=new THREE.ExtrudeGeometry(sector,{depth:.26,bevelEnabled:true,bevelThickness:.02,bevelSize:.02,bevelSegments:2});
    const m=new THREE.Mesh(geom,material);m.rotation.x=-Math.PI/2;group.add(m);
  } else {
    if(kind==='cube') geom=new THREE.BoxGeometry(1.8,1.8,1.8);
    if(kind==='sphere') geom=new THREE.SphereGeometry(1.2,42,28);
    if(kind==='cylinder') geom=new THREE.CylinderGeometry(1.1,1.1,2.2,48);
    if(kind==='cone') geom=new THREE.ConeGeometry(1.2,2.2,48);
    const mesh=new THREE.Mesh(geom,material);group.add(mesh);
    const edges=new THREE.LineSegments(new THREE.EdgesGeometry(geom),new THREE.LineBasicMaterial({color:0x185353,transparent:true,opacity:.4}));group.add(edges);
  }
  el('shapeTitle').textContent=shapeNames[kind][0];
  el('shapeInfo').textContent=shapeNames[kind][1];
  el('angleRow').hidden=kind!=='sector';
  el('angleOutput').textContent=arabic(angle)+'°';
}
function init3d() {
  stop3d();
  const host=el('viewer'), scene=new THREE.Scene(), camera=new THREE.PerspectiveCamera(42,1,.1,100);
  camera.position.set(3.6,3.3,4.8);
  const renderer=new THREE.WebGLRenderer({antialias:true,alpha:true,powerPreference:'low-power'});
  renderer.setPixelRatio(Math.min(devicePixelRatio||1,2));renderer.outputColorSpace=THREE.SRGBColorSpace;
  host.replaceChildren(renderer.domElement);
  scene.add(new THREE.HemisphereLight(0xffffff,0x607877,2.4));
  const light=new THREE.DirectionalLight(0xffffff,2.7);light.position.set(4,7,6);scene.add(light);
  const grid=new THREE.GridHelper(6.8,12,0xcbdad4,0xd3e2da);grid.position.y=-1.35;scene.add(grid);
  const controls=new OrbitControls(camera,renderer.domElement);controls.enableDamping=true;controls.enablePan=false;controls.minDistance=2.5;controls.maxDistance=12;
  const group=new THREE.Group();scene.add(group);
  const resize=()=>{const w=Math.max(60,host.clientWidth),h=Math.max(60,host.clientHeight);renderer.setSize(w,h,false);camera.aspect=w/h;camera.updateProjectionMatrix()};
  const observer=new ResizeObserver(resize);observer.observe(host);resize();
  viewer3d={group,scene,camera,renderer,controls,resize:observer,raf:0};
  const animate=()=>{if(!viewer3d)return;viewer3d.raf=requestAnimationFrame(animate);controls.update();renderer.render(scene,camera)};
  newShape();animate();
}
function open3d(i=current) {
  current=Math.max(0,Math.min(i,pages.length-1));const data=pageInfo(current);
  el('shape').value=shapeNames[data.shape]?data.shape:'sector';
  el('shapeDialog').showModal();
  requestAnimationFrame(()=>{try{init3d()}catch(e){console.error(e);stop3d();el('shapeDialog').close();toast('لا يمكن تشغيل WebGL على هذا الجهاز.')}});
}
function speak(i=current) {
  stopSound();
  if(audioByPage.has(i)) {
    currentSound=new Audio(audioByPage.get(i));
    currentSound.play().catch(()=>toast('تعذر تشغيل التسجيل الصوتي.'));return;
  }
  const content=(pageInfo(i).narration||'').trim();
  if(!content){toast('اكتب النص المراد نطقه أو أضف تسجيلًا للصفحة.');return}
  if(!('speechSynthesis'in window)){toast('متصفحك لا يدعم النطق الآلي.');return}
  const item=new SpeechSynthesisUtterance(content);
  item.lang='ar-OM';item.rate=.92;
  const voice=speechSynthesis.getVoices().find(v=>v.lang.toLowerCase().startsWith('ar'));
  if(voice)item.voice=voice;
  speechSynthesis.speak(item);
}
function openQuiz(i=current) {
  const quiz=pageInfo(i).quiz;
  if(!quiz?.question?.trim() || !Array.isArray(quiz.choices) || quiz.choices.length!==3 || quiz.choices.some(v=>!v.trim())) {
    toast('اكتب سؤالًا وثلاثة خيارات من أدوات الصفحة أولًا.');el('question').focus();return;
  }
  el('qPage').textContent='سؤال الصفحة '+arabic(i+1);
  el('qTitle').textContent=quiz.question;
  el('feedback').textContent='';el('qChoices').replaceChildren();
  quiz.choices.forEach((choice,j)=>{
    const btn=document.createElement('button');btn.className='quiz-option';btn.textContent=arabic(j+1)+'. '+choice;
    btn.onclick=()=>{
      for(const [k,item] of [...el('qChoices').children].entries()){item.disabled=true;if(k===Number(quiz.correct))item.classList.add('correct');else if(k===j)item.classList.add('incorrect')}
      el('feedback').textContent=j===Number(quiz.correct)?'أحسنت! الإجابة صحيحة ✓':'الإجابة الصحيحة: '+quiz.choices[Number(quiz.correct)];
    };el('qChoices').append(btn);
  });
  el('retry').onclick=()=>openQuiz(i);
  if(!el('quizDialog').open)el('quizDialog').showModal();
}
function saveQuiz() {
  const question=el('question').value.trim(), choices=[0,1,2].map(j=>el('choice'+j).value.trim());
  if(!question || choices.some(v=>!v)){toast('أكمل نص السؤال والخيارات الثلاثة.');return}
  pageInfo().quiz={question,choices,correct:Number(el('correct').value)};
  saveStored();toast('تم حفظ السؤال للصفحة '+arabic(current+1));openQuiz();
}
function pageFromButton(target) {
  const n=Number(target.closest('[data-page]')?.dataset.page);
  return Number.isFinite(n)?Math.max(0,Math.min(pages.length-1,n)):current;
}
function register() {
  el('demo').onclick=loadDemo;
  el('file').onchange=e=>{const file=e.target.files?.[0];if(file)void loadFile(file);e.target.value=''};
  el('prev').onclick=()=>flip?.flipPrev();
  el('next').onclick=()=>flip?.flipNext();
  el('sendDrawing').onclick=async()=>{
    if(bookType==='pdf' && pdf){
      try{
        await renderPage(current,generation);
        const canvas=pages[current]?.querySelector('canvas');
        if(canvas&&canvas.width>8&&canvas.height>8){
          // Save a short-lived preview for the lab within the same browser tab.
          sessionStorage.setItem('warraq-drawing-preview',canvas.toDataURL('image/jpeg',0.76));
        }
      }catch(err){console.warn('Could not transfer page preview',err)}
    }else{
      try{sessionStorage.removeItem('warraq-drawing-preview')}catch{}
    }
    window.location.href='./lab.html';
  };
  el('open3d').onclick=()=>open3d();
  el('showshape').onclick=()=>open3d();
  el('openquiz').onclick=()=>openQuiz();
  el('speak').onclick=()=>speak();
  el('stop').onclick=stopSound;
  el('savequiz').onclick=saveQuiz;
  el('narration').addEventListener('input',e=>{pageInfo().narration=e.target.value;saveStored()});
  el('shape').onchange=e=>{pageInfo().shape=e.target.value;saveStored();if(viewer3d)newShape()};
  el('angle').oninput=newShape;
  el('reset3d').onclick=()=>{if(viewer3d){viewer3d.camera.position.set(3.6,3.3,4.8);viewer3d.controls.target.set(0,0,0);viewer3d.controls.update()}};
  el('shapeDialog').addEventListener('close',stop3d);
  document.querySelectorAll('[data-close]').forEach(b=>b.onclick=()=>el(b.dataset.close).close());
  el('audio').onchange=e=>{const file=e.target.files?.[0];if(!file)return;if(!file.type.startsWith('audio/') || file.size>20*1024*1024){toast('اختر ملفًا صوتيًا حتى ٢٠ ميجابايت.');return}const old=audioByPage.get(current);if(old)URL.revokeObjectURL(old);audioByPage.set(current,URL.createObjectURL(file));el('audioInfo').textContent='تم إرفاق: '+file.name;toast('التسجيل متاح حتى إعادة تحميل الصفحة.');e.target.value=''};
  // Delegate from a stable parent; the flipbook DOM node is replaced when a book changes.
  el('dropzone').addEventListener('click',e=>{
    const btn=e.target.closest('[data-action]');if(!btn)return;
    e.preventDefault();e.stopPropagation();
    const i=pageFromButton(btn);
    if(btn.dataset.action==='3d')open3d(i);
    else if(btn.dataset.action==='quiz')openQuiz(i);
    else if(btn.dataset.action==='voice')speak(i);
  });
  document.addEventListener('keydown',e=>{if(['INPUT','TEXTAREA','SELECT'].includes(document.activeElement?.tagName) || document.querySelector('dialog[open]'))return;if(e.key==='ArrowLeft'){e.preventDefault();flip?.flipNext()}if(e.key==='ArrowRight'){e.preventDefault();flip?.flipPrev()}});
  const zone=el('dropzone');
  zone.addEventListener('dragover',e=>{e.preventDefault();zone.classList.add('dragging')});
  zone.addEventListener('dragleave',()=>zone.classList.remove('dragging'));
  zone.addEventListener('drop',e=>{e.preventDefault();zone.classList.remove('dragging');const file=e.dataTransfer?.files?.[0];if(file)void loadFile(file)});
  window.addEventListener('beforeunload',clearAudio);
}
register();
loadDemo();
window.__warraqReady=true;
