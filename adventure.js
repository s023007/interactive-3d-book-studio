let THREE;
import { PACKS } from "./game-data.js";

const $=id=>document.getElementById(id), arab=n=>String(n).replace(/[0-9]/g,x=>"٠١٢٣٤٥٦٧٨٩"[+x]);
const game=$("game");
const state={scene:"intro",pack:null,index:0,score:0,tries:0,earned:[],finished:false,muted:false,speaking:false,voiceMode:"device",avatar:"mint",message:""};
let world=null,micStream=null,mediaRecorder=null,clip=null,clipUrl=null,voiceId=0;
const recordings=new Map();
const reduced=matchMedia("(prefers-reduced-motion: reduce)").matches;
const story={
 intro:"مرحبًا أيها البطل! أنا لُمى، مرشدتك في ورّاق. هل أنت مستعد لمغامرة الرياضيات؟",
 grade:"هذه بوابة عوالم الرياضيات. اختر الصف لنبدأ الرحلة!",
 correct:["رائع! إجابة ممتازة! حصلت على نجمة.","يا سلام! أحسنت التفكير. نجمة أخرى لك!","أنت بطل الرياضيات! أبدعت!"],
 retry:"اقتربت! جرّب مرة أخرى. أنا واثقة أنك ستصل للإجابة.",
 map:"أكملت هذا الطريق بنجاح. اختر ما تريد اكتشافه بعد ذلك."
};
const clean=s=>String(s).replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;");
function mathHTML(text){
 const expression=clean(text);
 const fraction=(_,top,bottom)=>'<span class="math-frac" aria-label="'+top+' على '+bottom+'"><span class="top">'+top+'</span><span class="bottom">'+bottom+'</span></span>';
 const limit=expression.match(/^نها س ← ([٠-٩]+) : (.*)$/);
 if(limit){
  const [, target, formula]=limit;
  const tokens=formula.split(/([س])/).map(part=>part==="س"?'<bdi dir="rtl">س</bdi>':part).join("");
  return '<span class="math-lim">نها<small dir="ltr"><bdi>س</bdi> → '+target+'</small></span><span class="math-expression">'+tokens+'</span>';
 }
 return expression.replace(/([٠-٩؟]+)⁄([٠-٩]+)/g,fraction);
}
function sayMath(text){
 return String(text)
  .replace(/نها س ← ([٠-٩]+)\s*:/g,"نهاية الدالة عندما تقترب سين من $1،")
  .replace(/([٠-٩؟]+)⁄([٠-٩]+)/g,"$1 على $2")
  .replace(/س²/g,"سين تربيع").replace(/س(?!ين)/g,"سين")
  .replaceAll("−"," ناقص ").replaceAll("+"," زائد ").replaceAll("÷"," مقسومًا على ").replaceAll("="," يساوي ").replaceAll("؟"," المجهول ");
}
function show(scene,theme){
 state.scene=scene;state.message="";game.dataset.scene=scene;
 game.dataset.theme=theme||state.pack?.id||"fractions";
 for(const id of ["intro","grade","quest","reward","map","avatar"])$(id).hidden=(id!==scene);
 const labels={intro:["بوابة المغامرة","مغامرتك تبدأ هنا"],grade:["اختر عالمك","مغامرتان تجريبيتان"],quest:[state.pack?.world||"عالم الرياضيات",state.pack?.grade||""],reward:["صندوق المكافآت","أحسنت يا بطل"],map:["خريطة التقدم","أنجزت المغامرة"],avatar:["ورشة الأبطال","اصنع مظهرك المفضل"]};
 $("worldTitle").textContent=labels[scene][0];$("levelNote").textContent=labels[scene][1];
 if(world)world.sceneChange(scene,game.dataset.theme);
 const heading=$(scene).querySelector("h1, .question-top, .ribbon");
 if(heading){heading.tabIndex=-1;heading.focus({preventScroll:true});}
}
function recordKey(){
 const pack=state.pack?.id||"all";
 const question=state.pack?.questions[state.index]?.id||"";
 return JSON.stringify([pack,state.scene,question,state.message]);
}
function haltSpeech(){
 voiceId++;state.speaking=false;window.speechSynthesis?.cancel();
 if(clip){clip.pause();clip.removeAttribute("src");clip=null;}
 if(clipUrl){URL.revokeObjectURL(clipUrl);clipUrl=null;}
}
function voiceLabel(text){
 state.message=text;
 if(state.scene==="intro")$("introLine").textContent=text;
 if(state.scene==="quest")$("bubble").textContent=text;
}
function deviceVoice(text,id){
 const synth=window.speechSynthesis;
 const arabic=synth?.getVoices().find(voice=>/^ar(?:[-_]|$)/i.test(voice.lang));
 $("audioSource").textContent=arabic?"المصدر: صوت جهاز اصطناعي بالعربية.":"لا يتوفّر صوت عربي على الجهاز. يمكنك متابعة النص المكتوب.";
 if(!arabic||!window.SpeechSynthesisUtterance)return;
 const speech=new SpeechSynthesisUtterance(text);
 speech.voice=arabic;speech.lang=arabic.lang;speech.rate=.94;
 speech.onstart=()=>{if(id===voiceId)state.speaking=true;};
 speech.onend=()=>{if(id===voiceId)state.speaking=false;};
 speech.onerror=()=>{
  if(id!==voiceId)return;
  state.speaking=false;
  $("audioSource").textContent="تعذّر تشغيل صوت الجهاز. يمكنك متابعة النص المكتوب.";
 };
 synth.speak(speech);
}
function speak(text,mode=state.voiceMode){
 voiceLabel(text);haltSpeech();
 if(state.muted){$("audioSource").textContent="الصوت مكتوم.";return;}
 const id=voiceId,file=recordings.get(recordKey());
 if(mode==="recorded"&&file){
  clipUrl=URL.createObjectURL(file);
  clip=new Audio(clipUrl);
  $("audioSource").textContent="المصدر: التسجيل الذي أرفقته لهذه العبارة.";
  clip.onplay=()=>{if(id===voiceId)state.speaking=true;};
  clip.onended=()=>{if(id===voiceId)haltSpeech();};
  const fallback=()=>{
   if(id!==voiceId)return;
   haltSpeech();deviceVoice(text,voiceId);
  };
  clip.onerror=fallback;clip.play().catch(fallback);
  return;
 }
 deviceVoice(text,id);
}
function setMute(flag){
 state.muted=flag;
 $("mute").textContent=flag?"🔇":"🔊";
 $("mute").setAttribute("aria-pressed",String(flag));
 $("mute").setAttribute("aria-label",flag?"تشغيل الصوت":"كتم الصوت");
 if(flag)haltSpeech();
}
function confetti(){
 if(reduced)return;const host=$("confetti");host.replaceChildren();
 const shapes=["⭐","🌟","✨","💫","✦","🎉"];
 for(let i=0;i<26;i++){
  const node=document.createElement("span");node.textContent=shapes[i%shapes.length];
  node.style.setProperty("--x",(8+Math.random()*84)+"%");
  node.style.setProperty("--size",(15+Math.random()*16)+"px");
  node.style.setProperty("--dur",(1.5+Math.random()*1.1)+"s");
  node.style.setProperty("--dx",(-120+Math.random()*240)+"px");
  node.style.setProperty("--spin",(300+Math.random()*600)+"deg");
  host.append(node);setTimeout(()=>node.remove(),2800);
 }
}
function updateScore(){$("stars").textContent=arab(state.score)}
function beginGrade(){haltSpeech();show("grade");speak(story.grade);}
function startQuest(packId){
 state.pack=PACKS[packId]||PACKS.fractions;state.index=0;state.score=0;state.tries=0;state.earned=[];
 updateScore();show("quest",packId);buildQuestion();
 speak(questionScript());
}
function questionScript(){
 const q=state.pack.questions[state.index];
 return q.lead+" "+sayMath(q.math);
}
function buildQuestion(){
 const q=state.pack.questions[state.index];state.tries=0;state.finished=false;
 $("qProgress").textContent="التحدّي "+arab(state.index+1)+" من "+arab(state.pack.questions.length);
 $("progress").style.width=((state.index+1)/state.pack.questions.length*100)+"%";
 $("lead").textContent=q.lead;$("equation").innerHTML=mathHTML(q.math);$("equation").setAttribute("aria-label",sayMath(q.math));
 $("bubble").textContent="أنصت إلى السؤال، وفكّر قبل الإجابة!";
 $("response").textContent="";$("next").hidden=true;$("hint").disabled=false;
 const box=$("answers");box.replaceChildren();
 q.options.forEach((text,i)=>{
  const b=document.createElement("button");b.type="button";b.className="answer";b.innerHTML=mathHTML(text);b.setAttribute("aria-label",sayMath(text));b.onclick=()=>answer(i);box.append(b);
 });
 if(world)world.questionObjects(q);
}
function answer(i){
 if(state.finished)return;
 const q=state.pack.questions[state.index],buttons=[...$("answers").children];
 if(buttons[i]?.disabled)return;
 if(i===q.correct){
  state.finished=true;state.earned[state.index]=true;state.score++;updateScore();
  buttons.forEach((b,j)=>{b.disabled=true;if(j===q.correct)b.classList.add("correct")});
  $("response").textContent="إجابة صحيحة! "+q.explanation;
  $("next").textContent="استلم نجمتك ←";$("next").hidden=false;$("hint").disabled=true;
  if(world)world.react(true);
  speak(story.correct[state.index%story.correct.length]+" "+q.explanation);
  $("next").focus({preventScroll:true});
 }else{
  buttons[i].disabled=true;buttons[i].classList.add("wrong");state.tries++;
  if(world)world.react(false);
  if(state.tries===1){$("response").textContent="اقتربت! "+q.hint;speak(story.retry+" "+q.hint)}
  else{
   state.finished=true;buttons.forEach((b,j)=>{b.disabled=true;if(j===q.correct)b.classList.add("correct")});
   $("response").innerHTML="الصحيح: "+mathHTML(q.options[q.correct])+" — "+clean(q.explanation);
   $("next").textContent="تابع الرحلة ←";$("next").hidden=false;$("hint").disabled=true;
   $("next").focus({preventScroll:true});
   speak("لنتعلم معًا: "+q.explanation);
  }
 }
}
function moveOn(){
 haltSpeech();
 if(state.index<state.pack.questions.length-1){
  state.index++;show("quest",state.pack.id);buildQuestion();
  speak(questionScript());
 }else finish();
}
function finish(){
 show("map","forest");$("scoreFinal").textContent=arab(state.score);
 $("mapMessage").textContent="أنهيت "+arab(state.pack.questions.length)+" تحديات، وجمعت "+arab(state.score)+" نجوم. شكرًا لمثابرتك!";
 const trail=$("trail");trail.replaceChildren();
 for(let i=0;i<state.pack.questions.length;i++){const pin=document.createElement("span");pin.textContent=state.earned[i]?"🌟":arab(i+1);pin.classList.toggle("locked",!state.earned[i]);trail.append(pin)}
 speak(story.map);confetti();
}
function chooseAvatar(){show("avatar","forest");speak("هذا عالم الأبطال! اختر اللون الذي يعجبك لشخصيتك.");}
function chooseColor(key){
 const colors={mint:"#72ddbd",violet:"#ba8eea",peach:"#ffbd95",blue:"#72baee"};
 if(!colors[key])return;
 state.avatar=key;try{localStorage.setItem("warraq-avatar-color",key)}catch{}
 document.querySelectorAll(".swatch").forEach(b=>b.classList.toggle("active",b.dataset.color===key));
 if(world)world.setAvatar(colors[key]);
}

$("begin").onclick=beginGrade;
document.querySelectorAll("[data-pack]").forEach(b=>b.onclick=()=>startQuest(b.dataset.pack));
$("hint").onclick=()=>{if(state.finished)return;world?.react(false);const q=state.pack.questions[state.index];speak("تلميح: "+q.hint);$("response").textContent=q.hint};
$("sayQuestion").onclick=()=>{if(state.pack){const q=state.pack.questions[state.index];speak(q.lead+" "+sayMath(q.math))}};
$("questBack").onclick=beginGrade;
$("avatarBack").onclick=finish;
$("next").onclick=()=>{
 if(!state.earned[state.index]){moveOn();return;}
 const q=state.pack.questions[state.index];
 show("reward",state.pack.id);
 const reward="حصلت على نجمة. "+q.explanation;
 $("rewardText").textContent=reward;
 speak(reward);
 $("continue").textContent=state.index===state.pack.questions.length-1?"شاهد خريطتك ←":"أكمل المغامرة ←";
 world?.react(true);confetti();
};$("continue").onclick=moveOn;$("replay").onclick=()=>startQuest(state.pack?.id||"fractions");
$("chooseGrade").onclick=beginGrade;$("customize").onclick=chooseAvatar;$("avatarDone").onclick=()=>startQuest(state.pack?.id||"fractions");
document.querySelectorAll(".swatch").forEach(b=>b.onclick=()=>chooseColor(b.dataset.color));
document.querySelectorAll("[data-say]").forEach(b=>b.onclick=()=>speak(story[b.dataset.say]||state.message));
$("mute").onclick=()=>setMute(!state.muted);

// Recordings stay in memory and are keyed to the exact displayed line.
const dialog=$("voiceDialog");
const selectedVoice=()=>document.querySelector('input[name="voiceMode"]:checked').value;
function stopMicrophone(){
 if(mediaRecorder?.state==="recording")mediaRecorder.stop();
 micStream?.getTracks().forEach(track=>track.stop());
 micStream=null;
}
$("audioSettings").onclick=()=>{
 haltSpeech();
 $("voiceScript").textContent=state.message;
 $("voiceNote").textContent=recordings.has(recordKey())?"يوجد تسجيل مرفق بهذه العبارة.":"أرفق أو سجّل العبارة المعروضة. يبقى التسجيل في الصفحة الحالية.";
 $("audioSource").textContent="";
 $("voiceFile").value="";
 document.querySelectorAll('input[name="voiceMode"]').forEach(input=>input.checked=input.value===state.voiceMode);
 dialog.showModal();
};
$("closeVoice").onclick=()=>dialog.close();
dialog.addEventListener("close",()=>{stopMicrophone();haltSpeech();});
$("saveVoice").onclick=()=>{state.voiceMode=selectedVoice();dialog.close();};
$("testVoice").onclick=()=>speak(state.message,selectedVoice());
$("voiceFile").onchange=event=>{
 const file=event.target.files?.[0];
 if(!file)return;
 if(!file.type.startsWith("audio/")||file.size>16*1024*1024){
  $("voiceNote").textContent="اختر ملفًا صوتيًا صالحًا لا يتجاوز ١٦ ميجابايت.";
  return;
 }
 recordings.set(recordKey(),file);
 $("voiceNote").textContent="أُرفق التسجيل بهذه العبارة. اختر التسجيلات البشرية وجرّب الصوت.";
};
$("record").onclick=async()=>{
 const key=recordKey();
 $("record").disabled=true;
 haltSpeech();
 try{
  if(!navigator.mediaDevices?.getUserMedia||!window.MediaRecorder)throw Error("Microphone unavailable");
  const stream=await navigator.mediaDevices.getUserMedia({audio:true});
  if(!dialog.open){stream.getTracks().forEach(track=>track.stop());return;}
  micStream=stream;
  const recorder=new MediaRecorder(stream);
  mediaRecorder=recorder;
  const chunks=[];
  recorder.ondataavailable=event=>{if(event.data.size)chunks.push(event.data);};
  recorder.onstop=()=>{
   const audio=new Blob(chunks,{type:recorder.mimeType||"audio/webm"});
   if(audio.size&&audio.size<=16*1024*1024)recordings.set(key,audio);
   $("voiceNote").textContent=audio.size>16*1024*1024?"تجاوز التسجيل ١٦ ميجابايت.":"انتهى التسجيل. اختر التسجيلات البشرية وجرّب الصوت.";
   stream.getTracks().forEach(track=>track.stop());
   $("record").disabled=false;$("stopRecord").disabled=true;
  };
  recorder.start();$("stopRecord").disabled=false;
  $("voiceNote").textContent="جارٍ التسجيل. اقرأ العبارة ثم اضغط إيقاف.";
 }catch{
  stopMicrophone();
  $("voiceNote").textContent="تعذّر بدء التسجيل. تحقّق من إذن الميكروفون أو أرفق تسجيلًا جاهزًا.";
  $("record").disabled=false;
 }finally{
  if(!dialog.open)$("record").disabled=false;
 }
};
$("stopRecord").onclick=stopMicrophone;
window.addEventListener("pagehide",event=>{haltSpeech();stopMicrophone();if(!event.persisted)world?.dispose();});

// Original procedural art, not AdaptedMind's artwork or character assets.
const mat=(c,rough=.66,extras={})=>new THREE.MeshStandardMaterial({color:c,roughness:rough,...extras});
const addBall=(parent,r,x,y,z,m,s=[1,1,1])=>{const o=new THREE.Mesh(new THREE.SphereGeometry(r,18,12),m);o.position.set(x,y,z);o.scale.set(...s);parent.add(o);return o};
const addBox=(p,w,h,d,x,y,z,m)=>{const o=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),m);o.position.set(x,y,z);p.add(o);return o};
const addCyl=(p,rTop,rBottom,h,x,y,z,m,n=12)=>{const o=new THREE.Mesh(new THREE.CylinderGeometry(rTop,rBottom,h,n),m);o.position.set(x,y,z);p.add(o);return o};
const addCone=(p,r,h,x,y,z,m,n=10)=>{const o=new THREE.Mesh(new THREE.ConeGeometry(r,h,n),m);o.position.set(x,y,z);p.add(o);return o};
function canvasLabel(text,fg="#243f75",bg="#fff5d5",width=320){
 const c=document.createElement("canvas");c.width=width;c.height=145;const ctx=c.getContext("2d");
 ctx.fillStyle=bg;ctx.beginPath();ctx.roundRect(6,6,c.width-12,c.height-12,24);ctx.fill();
 ctx.strokeStyle="#ffffff";ctx.lineWidth=7;ctx.stroke();
 ctx.textAlign="center";ctx.textBaseline="middle";ctx.fillStyle=fg;
 let size=54;if(text.length>14)size=30;else if(text.length>8)size=39;
 const fraction=text.match(/^([٠-٩]+)⁄([٠-٩]+)$/);
 if(fraction){
  ctx.font="900 48px Tahoma, Arial";
  ctx.fillText(fraction[1],c.width/2,43);
  ctx.fillRect(c.width/2-28,70,56,5);
  ctx.fillText(fraction[2],c.width/2,105);
 }else{
  ctx.font=`900 ${size}px Tahoma, Arial`;
  ctx.fillText(text,c.width/2,c.height/2,c.width-18);
 }
 const t=new THREE.CanvasTexture(c);t.colorSpace=THREE.SRGBColorSpace;
 const m=new THREE.MeshBasicMaterial({map:t,transparent:true,side:THREE.DoubleSide});
 return new THREE.Mesh(new THREE.PlaneGeometry(2.0,.90),m);
}
class AdventureWorld{
 constructor(){
  this.canvas=$("stage3d");this.renderer=new THREE.WebGLRenderer({canvas:this.canvas,alpha:true,antialias:true,powerPreference:"low-power"});
  this.renderer.setPixelRatio(Math.min(devicePixelRatio||1,innerWidth<700?1.25:1.5));this.renderer.outputColorSpace=THREE.SRGBColorSpace;
  this.scene=new THREE.Scene();this.scene.add(new THREE.HemisphereLight(0xffffff,0x566eaa,2.7));
  const d=new THREE.DirectionalLight(0xfff5df,2.8);d.position.set(-4,8,8);this.scene.add(d);
  this.camera=new THREE.PerspectiveCamera(44,1,.1,80);this.camera.position.set(0,2.0,10.3);this.camera.lookAt(0,1,0);
  this.environment=new THREE.Group();this.scene.add(this.environment);
  this.hero=new THREE.Group();this.scene.add(this.hero);
  this.tokens=new THREE.Group();this.scene.add(this.tokens);
  this.motion=[];this.time=0;this.last=0;this.reaction=0;this.arms=[];this.eyes=[];this.aim=new THREE.Vector3();
  this.makeActor();
  this.canvas.addEventListener("webglcontextlost", event=>{event.preventDefault();cancelAnimationFrame(this.frame);showSceneFallback();});
  this.canvas.addEventListener("webglcontextrestored", ()=>{this.resize();this.frame=requestAnimationFrame(this.tick);$("sceneError").hidden=true;game.classList.remove("no-webgl");});
  this.resize();this.resizer=new ResizeObserver(()=>this.resize());this.resizer.observe(this.canvas);
  this.tick=this.tick.bind(this);this.frame=requestAnimationFrame(this.tick);
 }
 makeActor(){
  const bodyRoot=this.hero;
  const g=new THREE.Group();bodyRoot.add(g);this.actor=g;
  const green=mat(0x75d9bd,.53),cream=mat(0xfaf4e6),pink=mat(0xef94b1),black=mat(0x1d3559,.23),white=new THREE.MeshBasicMaterial({color:0xffffff});
  const body=addBall(g,.84,0,.88,0,green,[.98,1.18,.77]);this.body=body;
  addBall(g,1.0,0,1.99,.07,green,[1.05,.91,.94]);addBall(g,.68,0,1.52,.79,cream,[.91,.58,.29]);
  for(const s of [-1,1]){
   const ear=addBall(g,.51,s*.79,2.81,-.1,green,[.48,1.22,.53]);ear.rotation.z=s*-.34;
   const inside=addBall(g,.36,s*.81,2.86,.2,pink,[.42,1.1,.29]);inside.rotation.z=s*-.34;
   const eye=new THREE.Group();eye.position.set(s*.37,2.08,.89);g.add(eye);this.eyes.push(eye);
   addBall(eye,.23,0,0,0,white,[.9,1.1,.43]);
   addBall(eye,.155,-s*.01,-.02,.17,black,[.9,1,.55]);
   addBall(eye,.055,-.04,.05,.29,white);
   addBall(g,.21,s*.70,1.72,.75,pink,[.9,.65,.35]);
   const arm=new THREE.Group();arm.position.set(s*.72,1.28,.12);g.add(arm);
   addBall(arm,.36,0,-.25,.05,green,[.55,1.2,.65]);
   addBall(arm,.15,0,-.51,.15,cream,[1,.75,1]);
   this.arms.push({arm,s});
   addBall(g,.35,s*.43,.12,.05,green,[1,.53,1.17]);
  }
  addBall(g,.14,0,1.84,1.05,pink,[1,.76,.6]);
  this.mouth=addBall(g,.27,0,1.54,.92,mat(0x6d405d),[1,.19,.14]);
  addCyl(g,.054,.07,.46,0,3.11,.05,green);
  const crown=addBall(g,.18,0,3.43,.06,new THREE.MeshBasicMaterial({color:0xffdc79}),[1,.9,.6]);this.crown=crown;
  const badge=mat(0xffcd75,.24,{emissive:0xaa7833,emissiveIntensity:.3});
  const scarf=mat(0x215989,.78);
  addBall(g,.58,0,1.37,.28,scarf,[1,.28,1.04]);
  addBox(g,.24,.46,.07,.24,1.12,.75,scarf).rotation.z=.24;
  addBall(g,.17,0,1.30,.88,badge,[1,1,.45]);
  this.hero.position.set(0,-.15,2.7);
 }
 clear(group){group.traverse(o=>{if(o.geometry)o.geometry.dispose();if(o.material)(Array.isArray(o.material)?o.material:[o.material]).forEach(m=>{m.map?.dispose();m.dispose()})});group.clear()}
 sceneChange(scene,theme){
  if(this.currentScene===scene&&this.theme===theme)return;
  this.clear(this.environment);this.clear(this.tokens);this.motion=[];this.theme=theme;this.currentScene=scene;this.transition=performance.now();
  const e=this.environment;const m=mat;
  this.hero.visible=true;this.hero.scale.setScalar(1);
  if(scene==="intro"){
   const wall=m(0x56b8ba),trim=m(0x305fbc),floor=m(0x2b79bd),purple=m(0x803cb6),gold=m(0xfbe4a0);
   addBox(e,16,8,.3,0,2,-10,wall);addBox(e,.3,8,24,-5,2,-3,wall);addBox(e,.3,8,24,5,2,-3,wall);
   addBox(e,11,.22,21,0,-.56,-3,floor);
   for(let i=0;i<8;i++){
    const z=4-i*2.25;addBox(e,11,.035,.30,0,-.42,z,gold);
    addBox(e,.12,6,.13,-4.8,2,z,trim);addBox(e,.12,6,.13,4.8,2,z,trim);
   }
   addBox(e,3.2,4,.3,0,1.3,-9.7,purple);addBox(e,2.0,3.4,.5,0,.96,-9.4,trim);
   for(let i=0;i<4;i++){
    const z=3-i*2.9, size=1.0;
    addBox(e,.14,1.7,.12,-4.69,2,z,gold);
    addBox(e,.14,1.7,.12,4.69,2,z,gold);
    addBall(e,.35,0,4.35,z,gold,[1,.5,1]);
   }
   this.hero.position.set(0,-.08,2.55);
  } else if(scene==="grade"){
   const wall=m(0x8ad7ce),floor=m(0x368db5),coral=m(0xec9c6b),gold=m(0xffe69b);
   addBox(e,18,10,.4,0,2,-10,wall);addBox(e,17,.3,20,0,-.78,-3,floor);
   for(let i=0;i<7;i++){const z=3-i*2.7;addBox(e,17,.12,.22,0,-.59,z,gold)}
   addBox(e,3.8,4.5,.6,0,1.2,-9.4,coral);
   for(let x of [-5.4,5.4])for(let i=0;i<3;i++)addBox(e,.2,3,.2,x,1.5,3-i*5,gold);
   this.hero.position.set(-2.6,-.1,2.7);this.hero.scale.setScalar(.85);
  }else if((scene==="quest"||scene==="reward") && theme==="limits"){
   const ground=m(0x323c83),planet=m(0x977ee0),light=m(0xffb9dc);
   addCyl(e,7.1,7.0,.7,0,-1.38,-1.8,ground,48);
   addCyl(e,7.1,7.1,.12,0,-.98,-1.8,light,48);
   const dome=new THREE.Mesh(new THREE.TorusGeometry(2.1,.045,8,52),m(0xc5a9ff,.5,{emissive:0x6531b5,emissiveIntensity:.6}));
   dome.position.set(2,2.4,-5);e.add(dome);
   const ring=dome.clone();ring.rotation.y=1;ring.rotation.z=.8;e.add(ring);
   for(let i=0;i<24;i++){
    const a=i*2.4,x=Math.sin(a)*6,y=.4+(i%6)*.9,z=-3-(i%4);
    const sp=addBall(e,.055,x,y,z,light);this.motion.push({o:sp,y,s:i*.7,t:0});
   }
   for(let i=0;i<5;i++){
    const a=i*Math.PI*2/5,pt=addBall(e,.5,Math.sin(a)*5,1.6+(i%3),-5,planet,[1.2,1,1]);this.motion.push({o:pt,y:pt.position.y,s:i*1.2,t:1});
   }
   this.hero.position.set(-2.45,-.03,2.65);this.hero.scale.setScalar(.85);
  }else if(scene==="quest"||scene==="reward"){
   const sand=m(0xe9c881),shell=m(0xec9b89),kelp=m(0x1b9a8c),seawall=m(0x1b81bb);
   addCyl(e,7.3,6.7,.83,0,-1.46,-1.8,sand,48);
   const reef=m(0xf58991,.85);
   for(const x of [-4.7,3.7,5]){
    for(let j=0;j<4;j++){
     const branch=addCyl(e,.07,.16,.9+j*.18,x+(j-1.5)*.22,-.65+j*.13,-3,reef,7);
     branch.rotation.z=(j-1.5)*.28;
    }
   }
   for(let i=0;i<9;i++){
    const a=i*2.42,x=Math.cos(a)*(3.6+i%3),z=Math.sin(a)*2.6-1.8;
    const plant=new THREE.Group();plant.position.set(x,-1.0,z);e.add(plant);
    for(let j=0;j<4;j++)addBall(plant,.25,Math.sin(j*.8)*.13,.3+j*.38,0,kelp,[.65,1.15,.52]);
   }
   for(let i=0;i<16;i++){
    const a=i*1.38,x=Math.cos(a)*5.5,y=.6+(i%5)*.68,z=-4.1-(i%3);
    const bubble=addBall(e,.09,x,y,z,new THREE.MeshBasicMaterial({color:0xc8f8ff,transparent:true,opacity:.55}),[1.1,1.25,1]);
    this.motion.push({o:bubble,y,s:i*.8,t:0});
   }
   for(let i=0;i<6;i++){
    const fish=new THREE.Group();fish.position.set(-5+i*1.8,1.5+(i%3)*.7,-5-(i%2));e.add(fish);
    addBall(fish,.23,0,0,0,shell,[1.7,.75,.5]);
    addCone(fish,.18,.36,-.34,0,0,shell).rotation.z=-Math.PI/2;
    this.motion.push({o:fish,x:fish.position.x,y:fish.position.y,s:i*.8,t:2});
   }
   const chest=m(0xa66a4d),gold=m(0xffd278);
   addBox(e,1.5,.7,.83,3.5,-.62,-1.0,chest);addBox(e,1.55,.15,.90,3.5,-.17,-1.0,gold);
   this.hero.position.set(-2.55,-.08,2.55);this.hero.scale.setScalar(.80);
  }else if(scene==="map"||scene==="avatar"){
   const ground=m(0x77b581),pink=m(0xce64ad),stone=m(0xf0d4a0),forest=m(0x317e78);
   addCyl(e,7,6.3,.9,0,-1.28,-2,ground,32);
   for(let i=0;i<11;i++){
    const a=i*2.19,x=Math.sin(a)*5.1,z=Math.cos(a)*3.3-2.7;
    addCyl(e,.14,.17,.7,x,-.43,z,stone);
    addCone(e,.65,1.5,x,.55,z,i%2?forest:pink);
   }
   for(let i=0;i<5;i++){const x=i*1.8-3.6;addCyl(e,.45,.49,.12,x,-.59,-1.5,m(0xe9b965));}
   this.hero.position.set(-2.6,-.12,2.7);this.hero.scale.setScalar(.82);
  }
  if(scene==="quest"){
   this.hero.position.set(-1.12,-1.25,2.2);
   this.hero.scale.setScalar(.77);
  }
  if(scene==="avatar"||scene==="reward"){
   this.hero.position.set(0,-1.04,2.3);
   this.hero.scale.setScalar(.76);
  }
  this.resize();
 }
 questionObjects(q){
  this.motion=this.motion.filter(item=>item.o.parent!==this.tokens);
  this.clear(this.tokens);
  if(state.scene!=="quest")return;
  const g=this.tokens,strings=q.math.match(/[٠-٩]+(?:⁄[٠-٩]+)?/g)||[];
  const parts=state.pack.id==="limits"?[strings[0]]:strings.filter(value=>value.includes("⁄")).slice(0,2);
  const positions=[.6,1.85];const props=mat(0x6cce8d),blue=mat(0x98bbea);
  parts.forEach((txt,i)=>{
   const node=new THREE.Group();node.position.set(positions[i],-.5,i*.25);g.add(node);
   addBall(node,.52,0,.2,0,i%2?blue:props,[.85,.9,.7]);
   addBall(node,.11,-.18,.35,.40,new THREE.MeshBasicMaterial({color:0xffffff}));
   addBall(node,.11,.18,.35,.40,new THREE.MeshBasicMaterial({color:0xffffff}));
   addBall(node,.05,-.18,.35,.50,mat(0x213a5d));addBall(node,.05,.18,.35,.50,mat(0x213a5d));
   const label=canvasLabel(txt);label.position.set(0,.04,.55);label.scale.set(.68,.69,1);node.add(label);
   this.motion.push({o:node,y:node.position.y,s:i*.85,t:0});
  });
 }
 setAvatar(hex){this.body.material.color.set(hex)}
 react(correct){this.reaction=performance.now()+1000;this.isCorrect=correct}
 resize(){
  const r=this.canvas.getBoundingClientRect(),w=Math.max(100,r.width),h=Math.max(100,r.height);
  this.renderer.setSize(w,h,false);this.camera.aspect=w/h;this.camera.fov=w<700?47:40;
  const quest=["quest","avatar","reward"].includes(this.currentScene);
  this.camera.position.set(0,quest?1.25:2.3,quest?8.8:11);
  this.aim.set(0,quest?.45:1.25,0);
  this.camera.lookAt(this.aim);this.camera.updateProjectionMatrix();
 }
 tick(t){
  this.frame=requestAnimationFrame(this.tick);
  if(document.hidden||(this.last&&t-this.last<33))return;this.last=t;
  const seconds=t/1000,amp=state.speaking?(0.35+Math.abs(Math.sin(seconds*13))*.55):.17;
  this.mouth.scale.y=reduced?.17:amp;
  if(!reduced){
   const pulse=Math.max(0,(this.reaction-t)/1000);
   const gesture=state.speaking ? Math.sin(seconds*4)*.24 : 0;
   const bounce=this.isCorrect?pulse*Math.sin(pulse*Math.PI*3)**2:0;
   this.actor.position.y=Math.sin(seconds*2.4)*.055+bounce*.43;
   this.actor.rotation.z=Math.sin(seconds*1.4)*.025+(this.isCorrect?0:Math.sin(pulse*15)*pulse*.1);
   this.actor.rotation.y=Math.sin(seconds*.9)*.08+(this.isCorrect?0:-pulse*.18);
   this.crown.scale.y=.9+Math.sin(seconds*2)*.12+bounce*.3;
   const blink=Math.max(.1,Math.min(1,Math.abs(seconds%3.8-3.5)*10));
   for(const eye of this.eyes)eye.scale.y=blink;
   for(const {arm,s} of this.arms){
    arm.rotation.z=s*(.28+gesture+(this.isCorrect?bounce*1.5:pulse*.3));
    arm.rotation.x=-.16+(state.speaking?gesture:0);
   }
   for(const item of this.motion){
    if(item.t===2)item.o.position.x=item.x+Math.sin(seconds*.48+item.s)*.7;
    item.o.position.y=item.y+Math.sin(seconds*(item.t===1?.45:1)+item.s)*.12;
   }
   const offset=Math.max(0,1-(t-this.transition)/700);
   this.camera.position.x=offset*offset*.42;
   this.camera.lookAt(this.aim);
  }
  this.renderer.render(this.scene,this.camera);
 }
 dispose(){cancelAnimationFrame(this.frame);this.resizer.disconnect();this.clear(this.environment);this.clear(this.tokens);this.clear(this.hero);this.renderer.dispose()}
}
try{const color=localStorage.getItem("warraq-avatar-color");if(color)chooseColor(color)}catch{}
show("intro");voiceLabel(story.intro);
const showSceneFallback=()=>{
 $("sceneError").hidden=false;
 game.classList.add("no-webgl");
};
if (!window.WebGL2RenderingContext) showSceneFallback();
else import("three").then(module=>{
 THREE=module;
 world=new AdventureWorld();
 world.sceneChange(state.scene,game.dataset.theme);
 if(state.scene==="quest")world.questionObjects(state.pack.questions[state.index]);
 chooseColor(state.avatar);
}).catch(showSceneFallback);
