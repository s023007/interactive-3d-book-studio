import * as THREE from 'three';
import { PACKS } from './game-data.js';

const $ = id => document.getElementById(id);
const ar = v => String(v).replace(/\d/g, d => '٠١٢٣٤٥٦٧٨٩'[Number(d)]);
const state = {pack:null,index:0,score:0,tries:0,revealed:false,muted:false,talking:false,celebrationUntil:0};
let stage=null, voiceTurn=0, audioCtx=null, lastMsg='';
const prefersReduced = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
function escapeMath(value){return String(value).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;')}
function typesetMath(value){
 let content=escapeMath(value);
 content=content.replace(/([٠-٩]+)⁄([٠-٩]+)/g,(_,top,bottom)=>'<span class="math-frac" aria-label="'+top+' على '+bottom+'"><span class="top">'+top+'</span><span class="bottom">'+bottom+'</span></span>');
 content=content.replace(/نها س ← ([٠-٩]+)\s*:/g,(_,n)=>'<span class="math-lim">نها<small>س ← '+n+'</small></span>');
 return content;
}
function mathSpeech(value){
 return String(value).replace(/([٠-٩]+)⁄([٠-٩]+)/g,'$1 على $2').replace(/نها س ← ([٠-٩]+)\s*:/g,'نهاية الدالة عندما سين تقترب من $1:');
}

const color = v => new THREE.Color(v);

function show(which) {
 for(const id of ['startPanel','questionPanel','finishPanel']) $(id).hidden=(id!==which);
}
function pickPack() { return PACKS[$('pack').value] || PACKS.fractions; }
function updateScore(){ $('score').textContent=ar(state.score); }
function guide(text){
 lastMsg=text;
 $('guideLine').textContent=text;
}
const voiceConfig={mode:'device',uri:'',pace:.95,endpoint:'',code:''};
let currentClip=null,clipUrl=null,voiceController=null;
function refreshVoices(){
 const select=$('nativeVoice');
 if(!select)return;
 const voices=('speechSynthesis' in window)?window.speechSynthesis.getVoices():[];
 const current=voiceConfig.uri;
 const arabic=voices.filter(v=>v.lang&&v.lang.toLowerCase().startsWith('ar'));
 select.replaceChildren();
 const defaultOpt=document.createElement('option');defaultOpt.value='';defaultOpt.textContent='تلقائي — أفضل صوت عربي متاح';select.appendChild(defaultOpt);
 arabic.forEach(v=>{const opt=document.createElement('option');opt.value=v.voiceURI;opt.textContent=v.name+' ('+v.lang+')';select.appendChild(opt)});
 select.value=arabic.some(v=>v.voiceURI===current)?current:'';
}
function chooseArabicVoice(){
 if(!('speechSynthesis' in window))return null;
 const voices=window.speechSynthesis.getVoices().filter(v=>v.lang&&v.lang.toLowerCase().startsWith('ar'));
 return voices.find(v=>v.voiceURI===voiceConfig.uri)||voices.sort((a,b)=>{
  const rank=v=>(/Google|Microsoft|Neural|Natural|Enhanced|Premium|Samsung/i.test(v.name)?10:0)+(v.localService?1:3);
  return rank(b)-rank(a);
 })[0]||null;
}
function cancelVoice(){
 voiceTurn++;
 state.talking=false;
 try{if('speechSynthesis' in window)window.speechSynthesis.cancel()}catch{}
 if(voiceController){voiceController.abort();voiceController=null}
 if(currentClip){currentClip.pause();currentClip.src='';currentClip=null}
 if(clipUrl){URL.revokeObjectURL(clipUrl);clipUrl=null}
}
function deviceTalk(text,key){
 if(state.muted||!('speechSynthesis' in window))return;
 try{
  const utter=new SpeechSynthesisUtterance(text);
  const voice=chooseArabicVoice();
  utter.lang=voice?.lang||'ar-SA';
  utter.voice=voice;
  utter.rate=voiceConfig.pace;
  utter.pitch=1.01;
  utter.volume=1;
  utter.onstart=()=>{if(key===voiceTurn)state.talking=true};
  utter.onend=()=>{if(key===voiceTurn)state.talking=false};
  utter.onerror=()=>{if(key===voiceTurn)state.talking=false};
  window.speechSynthesis.speak(utter);
 }catch(e){console.warn('Device voice failed',e);state.talking=false}
}
async function studioTalk(text,key){
 let endpoint;
 try {
  endpoint=new URL(voiceConfig.endpoint);
  if(endpoint.protocol!=='https:'||!voiceConfig.code)throw Error('not configured');
 }catch{
  $('voiceStatus').textContent='خدمة الاستوديو غير مفعلة. استخدمت صوت الهاتف مؤقتًا.';
  deviceTalk(text,key);return;
 }
 const controller=new AbortController();voiceController=controller;
 try{
  const res=await fetch(endpoint.href,{method:'POST',headers:{'Content-Type':'application/json','X-Warraq-Code':voiceConfig.code},body:JSON.stringify({text:text.slice(0,700),speaker:state.pack?.id==='limits'?'mentor':'luma'}),signal:controller.signal});
  if(!res.ok)throw new Error('HTTP '+res.status);
  const audio=await res.blob();
  if(!audio.type.startsWith('audio/'))throw new Error('unsupported audio');
  if(key!==voiceTurn)return;
  clipUrl=URL.createObjectURL(audio);
  const media=new Audio(clipUrl);currentClip=media;
  media.onplay=()=>{if(key===voiceTurn)state.talking=true};
  media.onended=()=>{if(key===voiceTurn)state.talking=false};
  media.onerror=()=>{if(key===voiceTurn)state.talking=false};
  await media.play();
 }catch(err){
  if(controller.signal.aborted)return;
  console.warn('Studio narration unavailable',err);
  if(key===voiceTurn){
   $('voiceStatus').textContent='تعذّر تشغيل الصوت الاحترافي، تم الرجوع لصوت الجهاز.';
   deviceTalk(text,key);
  }
 }finally{if(voiceController===controller)voiceController=null}
}
function speak(text){
 guide(text);
 cancelVoice();
 if(state.muted)return;
 const key=voiceTurn;
 if(voiceConfig.mode==='studio')void studioTalk(text,key);
 else deviceTalk(text,key);
}
function readVoiceSettings(){
 try{const saved=JSON.parse(localStorage.getItem('warraq-game-voice-v1')||'{}');
  voiceConfig.mode=saved.mode==='studio'?'studio':'device';
  voiceConfig.uri=typeof saved.uri==='string'?saved.uri:'';
  voiceConfig.pace=Number(saved.pace)||.95;
  voiceConfig.endpoint=typeof saved.endpoint==='string'?saved.endpoint:'';
 }catch{}
 $('voiceMode').value=voiceConfig.mode;
 $('voicePace').value=String(voiceConfig.pace);
 $('voicePaceValue').textContent=ar(voiceConfig.pace.toFixed(2));
 $('voiceEndpoint').value=voiceConfig.endpoint;
 refreshVoices();updateModeFields();
}
function updateModeFields(){
 const studio=$('voiceMode').value==='studio';
 $('studioOptions').hidden=!studio;
 $('nativeOptions').hidden=studio;
}
function saveVoiceSettings(){
 voiceConfig.mode=$('voiceMode').value;
 voiceConfig.uri=$('nativeVoice').value;
 voiceConfig.pace=Number($('voicePace').value)||.95;
 voiceConfig.endpoint=$('voiceEndpoint').value.trim();
 voiceConfig.code=$('voiceCode').value.trim();
 try{localStorage.setItem('warraq-game-voice-v1',JSON.stringify({mode:voiceConfig.mode,uri:voiceConfig.uri,pace:voiceConfig.pace,endpoint:voiceConfig.endpoint}))}catch{}
 $('voiceStatus').textContent=voiceConfig.mode==='studio'&&!voiceConfig.code?'للتفعيل أدخل رمز خادم الصوت الخاص بك أولاً.':'تم حفظ إعدادات الصوت.';
}
function playNotes(type){
 if(state.muted)return;
 try{
  const Audio=window.AudioContext||window.webkitAudioContext;
  if(!Audio)return;
  if(!audioCtx)audioCtx=new Audio();
  if(audioCtx.state==='suspended')audioCtx.resume();
  const t=audioCtx.currentTime+.03;
  const notes=type==='success'?[[523.25,0,.13],[659.25,.14,.13],[783.99,.28,.21]]:[[310,0,.11],[255,.14,.14]];
  notes.forEach(([freq,delay,duration])=>{
   const osc=audioCtx.createOscillator(),gain=audioCtx.createGain();
   osc.type='sine';osc.frequency.value=freq;
   gain.gain.setValueAtTime(.0001,t+delay);
   gain.gain.exponentialRampToValueAtTime(.12,t+delay+.025);
   gain.gain.exponentialRampToValueAtTime(.0001,t+delay+duration);
   osc.connect(gain);gain.connect(audioCtx.destination);
   osc.start(t+delay);osc.stop(t+delay+duration+.025);
  });
 }catch(err){console.warn('Sound unavailable',err)}
}
function setMuted(next){
 state.muted=next;
 $('muteIcon').textContent=next?'🔇':'🔊';
 $('mute').setAttribute('aria-label',next?'تشغيل الصوت':'إيقاف الصوت');
 if(next)cancelVoice();
 else speak(lastMsg||'مرحبًا بك في مغامرة الرياضيات!');
}
function setWorld(pack){
 $('worldName').textContent=pack.world;
 document.body.classList.toggle('limits-world',pack.id==='limits');
 if(stage)stage.setTheme(pack.id);
}
function setProgress(){
 const len=state.pack.questions.length;
 $('progressFill').style.width=((state.index+1)/len*100)+'%';
 $('questionCounter').textContent='السؤال '+ar(state.index+1)+' من '+ar(len);
 $('gradeLabel').textContent=state.pack.grade;
}
function markButton(btn,cls){btn.classList.add(cls);if(cls==='correct')btn.setAttribute('aria-label',btn.textContent+'، إجابة صحيحة')}
function drawAnswers(q){
 const box=$('choices');box.replaceChildren();
 q.options.forEach((answer,i)=>{
  const button=document.createElement('button');
  button.type='button';button.className='choice';button.textContent=answer;
  button.addEventListener('click',()=>answerQuestion(i));
  box.append(button);
 });
}
function currentQuestion(){return state.pack.questions[state.index]}
function showQuestion(announce=false) {
 state.revealed=false;state.tries=0;
 const q=currentQuestion();
 $('questionLead').textContent=q.lead;
 $('math').innerHTML=typesetMath(q.math);
 $('feedback').textContent='';
 $('next').hidden=true;
 $('hint').disabled=false;
 drawAnswers(q);setProgress();
 if(announce) {
  const message=state.index===0?state.pack.welcome+' السؤال الأول: '+q.lead+' '+mathSpeech(q.math):
    'والآن السؤال '+ar(state.index+1)+'. '+q.lead+' '+mathSpeech(q.math);
  speak(message);
 }
}
function celebrate() {
 state.celebrationUntil=performance.now()+1700;
 if(prefersReduced)return;
 const host=$('confetti');host.replaceChildren();
 const icons=['⭐','✨','🌟','✦','💫'];
 for(let i=0;i<24;i++){
  const el=document.createElement('span');el.className='confetti-bit';el.textContent=icons[i%icons.length];
  el.style.setProperty('--x',(7+Math.random()*84)+'%');
  el.style.setProperty('--size',(16+Math.random()*15)+'px');
  el.style.setProperty('--dur',(1.35+Math.random()*.6)+'s');
  el.style.setProperty('--delay',(Math.random()*.3)+'s');
  el.style.setProperty('--dx',(-110+Math.random()*220)+'px');
  el.style.setProperty('--rot',Math.floor(Math.random()*670-335)+'deg');
  el.addEventListener('animationend',()=>el.remove(),{once:true});
  host.appendChild(el);
 }
}
function answerQuestion(index){
 if(state.revealed)return;
 const q=currentQuestion(),buttons=[...$('choices').children];
 if(buttons[index]?.disabled)return;
 if(index===q.correct){
  state.revealed=true;state.score++;updateScore();
  buttons.forEach((button,i)=>{button.disabled=true;if(i===q.correct)markButton(button,'correct')});
  $('feedback').textContent='ممتاز! '+q.explanation;
  speak('أحسنت! إجابة صحيحة. حصلت على نجمة! '+q.explanation);
  playNotes('success');celebrate();
  $('next').textContent=state.index===state.pack.questions.length-1?'شاهد نتيجتك ★':'السؤال التالي ←';
  $('next').hidden=false;$('hint').disabled=true;
 }else{
  state.tries++;markButton(buttons[index],'incorrect');buttons[index].disabled=true;
  playNotes('try');
  if(state.tries===1){
   $('feedback').textContent='حاول مرة ثانية. '+q.hint;
   speak('اقتربت! إليك تلميحًا: '+q.hint);
  }else{
   state.revealed=true;
   buttons.forEach((button,i)=>{button.disabled=true;if(i===q.correct)markButton(button,'correct')});
   $('feedback').textContent='الإجابة الصحيحة: '+q.options[q.correct]+'. '+q.explanation;
   speak('لا بأس. لنتعلم معًا. '+q.explanation);
   $('next').textContent=state.index===state.pack.questions.length-1?'شاهد نتيجتك ★':'السؤال التالي ←';
   $('next').hidden=false;$('hint').disabled=true;
  }
 }
}
function startGame(){
 cancelVoice();
 state.pack=pickPack();state.index=0;state.score=0;state.tries=0;state.revealed=false;
 updateScore();setWorld(state.pack);show('questionPanel');showQuestion(true);
}
function nextQuestion(){
 cancelVoice();
 if(!state.revealed)return;
 if(state.index>=state.pack.questions.length-1){finish();return}
 state.index++;showQuestion(true);
}
function getBest(packId) {
 try{return Math.max(0,Number(localStorage.getItem('warraq-play-best-'+packId)||0))}catch{return 0}
}
function saveBest(packId,n){
 try{localStorage.setItem('warraq-play-best-'+packId,String(n))}catch{}
}
function finish(){
 show('finishPanel');
 const best=Math.max(getBest(state.pack.id),state.score);
 saveBest(state.pack.id,best);
 $('finalScore').textContent=ar(state.score);
 $('bestScore').textContent='أفضل نتيجة لك في هذه المغامرة: '+ar(best)+' من '+ar(state.pack.questions.length);
 const fraction=state.score/state.pack.questions.length;
 const msg=fraction===1?'رائع! أتقنت جميع أسئلة المغامرة. أنت نجم الرياضيات!':
 fraction>=.5?'أحسنت! تقدمت كثيرًا، وجرب مرة أخرى لتحصل على جميع النجوم.':
 'أكملت المغامرة! أعد المحاولة وتذكر التلميحات؛ كل محاولة فرصة للتعلم.';
 $('resultText').textContent=msg;speak(msg);if(state.score>0){celebrate();playNotes('success')}
}
function resetToStart(){
 cancelVoice();state.pack=null;state.score=0;updateScore();show('startPanel');
 setWorld(pickPack());guide('أهلًا بك! أنا لُمى. اختر صفك، ولنبدأ اللعب معًا.');
}
$('pack').onchange=()=>{const p=pickPack();setWorld(p);guide(p.welcome)};
$('start').onclick=startGame;
$('next').onclick=nextQuestion;
$('again').onclick=startGame;
$('change').onclick=resetToStart;
$('hint').onclick=()=>{
 if(state.revealed)return;
 const message='تلميح: '+currentQuestion().hint;
 $('feedback').textContent=message;speak(message);
};
$('repeat').onclick=()=>{
 const q=currentQuestion();speak('استمع إلى السؤال مرة أخرى. '+q.lead+' '+mathSpeech(q.math));
};
$('listen').onclick=()=>speak(lastMsg||'أهلًا بك في وادي النجوم.');
$('mute').onclick=()=>setMuted(!state.muted);

$('voiceSetup').onclick=()=>{$('voiceDialog').showModal();refreshVoices()};
$('closeVoice').onclick=()=>$('voiceDialog').close();
$('voiceMode').onchange=updateModeFields;
$('voicePace').oninput=()=>{$('voicePaceValue').textContent=ar(Number($('voicePace').value).toFixed(2))};
$('voiceTest').onclick=()=>{saveVoiceSettings();speak('مرحبًا يا أبطال! أنا لُمى. هيا نلعب ونتعلم الرياضيات معًا!')};
$('saveVoice').onclick=()=>{saveVoiceSettings();$('voiceDialog').close()};
readVoiceSettings();
if('speechSynthesis' in window)window.speechSynthesis.onvoiceschanged=refreshVoices;

window.addEventListener('pagehide',cancelVoice);

// All 3D materials, characters, and worlds below are original procedural geometry.
function material(hex,roughness=.7,extra={}){
 return new THREE.MeshStandardMaterial({color:hex,roughness,...extra});
}
function mesh(geo,mat,x,y,z){
 const obj=new THREE.Mesh(geo,mat);obj.position.set(x,y,z);return obj;
}
function ball(parent,r,x,y,z,mat,sx=1,sy=1,sz=1){
 const obj=mesh(new THREE.SphereGeometry(r,22,16),mat,x,y,z);
 obj.scale.set(sx,sy,sz);parent.add(obj);return obj;
}
function cylinder(parent,r1,r2,height,x,y,z,mat,radial=18){
 const obj=mesh(new THREE.CylinderGeometry(r1,r2,height,radial),mat,x,y,z);
 parent.add(obj);return obj;
}
function cone(parent,rad,h,x,y,z,mat,n=9){
 const obj=mesh(new THREE.ConeGeometry(rad,h,n),mat,x,y,z);
 parent.add(obj);return obj;
}
function makeStar(parent,x,y,z,s,mat){
 const shape=new THREE.Shape(),points=10;
 for(let i=0;i<points;i++){
  const a=i*Math.PI/5-Math.PI/2,r=i%2===0?s:s*.43;
  const px=Math.cos(a)*r,py=Math.sin(a)*r;
  if(i===0)shape.moveTo(px,py);else shape.lineTo(px,py);
 }
 shape.closePath();
 const geo=new THREE.ExtrudeGeometry(shape,{depth:.045,bevelEnabled:false,steps:1});
 const obj=mesh(geo,mat,x,y,z);parent.add(obj);return obj;
}
class World3D {
 constructor(canvas){
  const scene=new THREE.Scene();
  this.scene=scene;this.canvas=canvas;this.theme='fractions';
  this.clock=new THREE.Clock();this.floats=[];this.sparkles=[];this.eyes=[];this.mouth=null;
  this.renderer=new THREE.WebGLRenderer({canvas,alpha:true,antialias:true,powerPreference:'low-power'});
  this.renderer.setPixelRatio(Math.min(window.devicePixelRatio||1,1.4));
  this.renderer.outputColorSpace=THREE.SRGBColorSpace;
  this.renderer.toneMapping=THREE.ACESFilmicToneMapping;
  this.renderer.toneMappingExposure=1.35;
  this.camera=new THREE.PerspectiveCamera(44,1,.1,130);
  this.camera.position.set(0,3.3,12.6);
  this.camera.lookAt(0,.72,0);
  scene.add(new THREE.HemisphereLight(0xffffff,0x538a9a,2.7));
  const sunlight=new THREE.DirectionalLight(0xfffbdf,2.4);sunlight.position.set(-4,9,7);scene.add(sunlight);
  const fill=new THREE.PointLight(0x7ef4e4,42,20);fill.position.set(3,3,3);scene.add(fill);
  this.group=new THREE.Group();scene.add(this.group);
  this.base=new THREE.Group();this.group.add(this.base);
  this.makeTerrain();this.makeGuide();
  this.resize();
  this.observer=new ResizeObserver(()=>this.resize());
  this.observer.observe(canvas);
  this.last=0;this.raf=null;
  this.animate=this.animate.bind(this);
  this.raf=requestAnimationFrame(this.animate);
 }
 makeTerrain(){
  const island=new THREE.Group();this.base.add(island);
  const cliff=cylinder(island,4.6,3.52,.85,0,-1.35,-1.5,material(0x9c7f63),48);
  const grass=cylinder(island,4.66,4.66,.14,0,-.85,-1.5,material(0x7acb83),48);
  this.grass=grass;this.cliff=cliff;
  // Islands in the distance create depth, without heavy image assets.
  const backColors=[0x6db7ba,0x95d590,0x9eb4d3];
  for(let i=0;i<3;i++){
   const x=[-6.3,6.1,0][i],z=[-6.8,-7.4,-10.2][i],y=[-.45,-.6,.5][i];
   const plate=cylinder(this.base,1.8,1.13,.55,x,y,z,material(backColors[i]),16);plate.rotation.y=i*.4;
   this.floats.push({object:plate,y,speed:.45+i*.12,phase:i*.9});
  }
  const forest=material(0x237f70),trunk=material(0x765c43),leaf=material(0x4bc594);
  const tree=(x,z,scale)=>{
   const group=new THREE.Group();group.position.set(x,-.78,z);this.base.add(group);
   cylinder(group,.12,.17,.8,0,.25,0,trunk,8);
   for(let k=0;k<3;k++)cone(group,.65-k*.10,.82,0,.7+k*.34,0,(k%2?leaf:forest),9);
   group.scale.setScalar(scale);
  };
  tree(-3,-2.3,1.15);tree(-3.8,-.75,.66);tree(3.2,-2.8,1.17);tree(3.75,-.6,.68);
  const flowerMat=material(0xffca91,{roughness:.55}.roughness);
  for(let i=0;i<15;i++){
   const x=Math.cos(i*2.399)*2.9,z=Math.sin(i*2.399)*1.95-1.5;
   ball(this.base,.08,x,-.67,z,flowerMat,.7,1.7,.7);
  }
  const rainbow=new THREE.Group();rainbow.position.set(0,.25,-4.5);this.base.add(rainbow);
  const colors=[0xffbd80,0xffe293,0x93d7bc,0x80b7e2];
  colors.forEach((c,i)=>{
   const arc=new THREE.Mesh(new THREE.TorusGeometry(2.1-i*.18,.053,7,56,Math.PI),new THREE.MeshStandardMaterial({color:c,emissive:c,emissiveIntensity:.23}));
   arc.rotation.z=Math.PI;arc.position.y=0;rainbow.add(arc);
  });
  this.rainbow=rainbow;
  const clouds=material(0xffffff,.9,{transparent:true,opacity:.86});
  for(const [x,y,z,scale] of [[-4,3.8,-5,1.15],[4.2,4.5,-7,1.45],[-.4,5.3,-9,.9]]){
   const c=new THREE.Group();c.position.set(x,y,z);this.base.add(c);
   for(const [cx,cy,sz] of [[-.6,0,.6],[0,.2,.83],[.65,0,.62]])ball(c,.6,cx,cy,0,clouds,sz*1.6,sz*.7,sz*.85);
   c.scale.setScalar(scale);this.floats.push({object:c,y,speed:.24,phase:x});
  }
  const sparkleMat=new THREE.MeshBasicMaterial({color:0xffedbd});
  for(let i=0;i<23;i++){
   const a=i*2.4,r=2.2+(i%5)*.68,z=-2.4-(i%3)*1.1;
   const obj=makeStar(this.base,Math.cos(a)*r,(i%6)*.65+.5,z,.08+(i%4)*.036,sparkleMat);
   this.sparkles.push({obj,offset:i*.73});
  }
  // Floating golden crystals around the platform.
  const gemMat=new THREE.MeshStandardMaterial({color:0xfce28e,emissive:0xe1ad4c,emissiveIntensity:.34,metalness:.23,roughness:.27});
  for(let i=0;i<7;i++){
   const a=i*Math.PI*2/7,geo=new THREE.OctahedronGeometry(.19,0),gem=mesh(geo,gemMat,Math.cos(a)*2.35,-.3,Math.sin(a)*1.45-.8);
   this.base.add(gem);this.sparkles.push({obj:gem,offset:i*1.3,gem:true});
  }
 }
 makeGuide(){
  const g=new THREE.Group();g.position.set(0,-.52,2.2);this.group.add(g);this.guide=g;
  const body=material(0x54b5a6,.51),head=material(0x70d6b5,.48),inner=material(0xf29fb7,.64),cream=material(0xf8f0df,.65),iris=material(0x163c5d,.22),shine=new THREE.MeshBasicMaterial({color:0xffffff});
  ball(g,.83,0,.45,0,body,.92,1.12,.75);
  // Long ears, eye highlights, cheeks and antenna: an original companion named Luma.
  const ears=[[-.84,1], [.84,-1]];
  for(const [x,sign] of ears){
   const ear=ball(g,.49,x,2.03,-.12,head,.47,1.32,.5);ear.rotation.z=sign*.37;
   const inside=ball(g,.35,x*1.045,2.06,.21,inner,.42,1.20,.32);inside.rotation.z=sign*.37;
  }
  ball(g,.98,0,1.58,.04,head,1.04,1,.91);
  ball(g,.64,0,1.22,.70,cream,.96,.59,.27);
  for(const x of [-.39,.39]){
   const eg=new THREE.Group();eg.position.set(x,1.73,.85);g.add(eg);
   ball(eg,.20,0,0,0,cream,.95,1.16,.34);
   ball(eg,.135,x<0?-.018:.018,0,.155,iris,.86,1.12,.65);
   ball(eg,.052,-.04,.07,.23,shine,.95,.95,.6);
   this.eyes.push(eg);
   ball(g,.22,x*1.78,1.37,.61,inner,1,.62,.30);
  }
  ball(g,.13,0,1.47,.91,material(0xe17f9f,.42),1.16,.68,.65);
  const mouth=ball(g,.28,0,1.18,.85,material(0x533f51,.9),1,.17,.17);
  this.mouth=mouth;
  const antenna=cylinder(g,.048,.063,.45,0,2.62,.04,body,8);
  const star=makeStar(g,0,2.99,.06,.23,new THREE.MeshBasicMaterial({color:0xffde80}));star.rotation.z=.3;
  for(const sign of [-1,1]){
   const arm=ball(g,.27,sign*.77,.52,.14,body,.55,1.17,.64);arm.rotation.z=-sign*.36;
   ball(g,.33,sign*.42,-.30,.18,body,1.05,.52,1.20);
  }
  const scarf=ball(g,.68,0,.96,.15,material(0xffd382,.6),1,.20,.9);
  const gemstone=ball(g,.2,0,.93,.67,new THREE.MeshStandardMaterial({color:0xf9e7a2,emissive:0xedaf47,emissiveIntensity:.25,metalness:.1,roughness:.22}),1,.7,.35);
  this.antennaStar=star;
 }
 setTheme(id){
  this.theme=id;
  if(id==='limits'){
   this.grass.material.color.set(0x859bcc);
   this.cliff.material.color.set(0x565a9c);
   this.rainbow.visible=false;
   this.scene.fog=new THREE.FogExp2(0x5368aa,.015);
  }else{
   this.grass.material.color.set(0x7acb83);
   this.cliff.material.color.set(0x9c7f63);
   this.rainbow.visible=true;
   this.scene.fog=null;
  }
 }
 resize(){
  const r=this.canvas.getBoundingClientRect();
  const w=Math.max(10,r.width),h=Math.max(10,r.height);
  this.renderer.setSize(w,h,false);
  this.camera.aspect=w/h;
  this.camera.fov=w<500?48:43;
  this.camera.position.z=w<500?11.1:12.6;
  this.camera.position.y=w<500?2.75:3.3;
  this.camera.lookAt(0,w<500?1.05:.8,0);
  this.camera.updateProjectionMatrix();
 }
 animate(now){
  if(!this.renderer)return;
  this.raf=requestAnimationFrame(this.animate);
  // 30 fps is sufficient for a talking 3D guide and gentler on mobile batteries.
  if(document.hidden || (this.last && now-this.last<33))return;
  this.last=now;
  const elapsed=this.clock.getElapsedTime(),celebrating=now<state.celebrationUntil;
  const bob=(prefersReduced?0:Math.sin(elapsed*2.6)*.075);
  this.guide.position.y=-.52+bob+(celebrating?Math.abs(Math.sin(elapsed*11))*.40:0);
  this.guide.rotation.z=celebrating?Math.sin(elapsed*14)*.08:(prefersReduced?0:Math.sin(elapsed*.9)*.026);
  this.guide.rotation.y=prefersReduced?0:Math.sin(elapsed*.65)*.085;
  const lip=state.talking?.14+.23*Math.abs(Math.sin(elapsed*17)):.18;
  this.mouth.scale.set(1,lip,.17);
  const blink=(Math.sin(elapsed*1.5+1.4)>.997)?Math.max(.1,1-(Math.sin(elapsed*1.5+1.4)-.997)*330):1;
  this.eyes.forEach(e=>e.scale.y=blink);
  this.antennaStar.rotation.z+=.012;
  for(const item of this.floats)if(!prefersReduced)item.object.position.y=item.y+Math.sin(elapsed*item.speed+item.phase)*.12;
  for(const item of this.sparkles){
   if(item.gem){item.obj.rotation.y=elapsed*.8+item.offset;item.obj.position.y=-.3+(prefersReduced?0:Math.sin(elapsed*1.6+item.offset)*.19)}
   else if(!prefersReduced){const scale=.8+.19*Math.sin(elapsed*1.8+item.offset);item.obj.scale.setScalar(scale)}
  }
  this.renderer.render(this.scene,this.camera);
 }
 destroy(){
  cancelAnimationFrame(this.raf);this.observer.disconnect();
  this.scene.traverse(o=>{
   if(o.geometry)o.geometry.dispose();
   if(o.material)(Array.isArray(o.material)?o.material:[o.material]).forEach(m=>m.dispose());
  });
  this.renderer.dispose();
 }
}

try{
 stage=new World3D($('worldCanvas'));
 stage.setTheme('fractions');
 $('sceneStatus').textContent='عالم ثلاثي الأبعاد';
}catch(err){
 console.warn('3D visual fallback',err);
 const canvas=$('worldCanvas');canvas.hidden=true;
 $('worldFallback').hidden=false;
 $('sceneStatus').textContent='وضع رسومي مبسط';
}
show('startPanel');
setWorld(pickPack());
guide('مرحبًا! أنا لُمى. اختر مغامرتك الرياضية ثم اضغط ابدأ.');
window.addEventListener('pagehide',()=>{if(stage){stage.destroy();stage=null}});
