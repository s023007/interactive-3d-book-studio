import * as THREE from "three";
import { PACKS } from "./game-data.js";

const $=id=>document.getElementById(id), arab=n=>String(n).replace(/[0-9]/g,x=>"٠١٢٣٤٥٦٧٨٩"[+x]);
const game=$("game");
const state={scene:"intro",pack:null,index:0,score:0,tries:0,finished:false,muted:false,speaking:false,voiceMode:"device",avatar:"mint",message:""};
let world=null,recording=null,micStream=null,mediaRecorder=null,clip=null,utterance=null,voices=new Map(),voiceSrc=null,voiceCtx=null,analyser=null;
let audioMeter=new Uint8Array(64),soundTimeout=null,voiceId=0;
const reduced=matchMedia("(prefers-reduced-motion: reduce)").matches;
const story={
 intro:"مرحبًا أيها البطل! أنا لُمى، مرشدتك في ورّاق. هل أنت مستعد لمغامرة الرياضيات؟",
 grade:"هذه بوابة عوالم الرياضيات. اختر الصف لنبدأ الرحلة!",
 correct:["رائع! إجابة ممتازة! حصلت على نجمة.","يا سلام! أحسنت التفكير. نجمة أخرى لك!","أنت بطل الرياضيات! أبدعت!"],
 retry:"اقتربت! جرّب مرة أخرى. أنا واثقة أنك ستصل للإجابة.",
 map:"أكملت هذا الطريق بنجاح. اختر ما تريد اكتشافه بعد ذلك."
};
const clean=s=>String(s).replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;");
function mathHTML(s){return clean(s).replace(/([٠-٩]+)⁄([٠-٩]+)/g,(_,a,b)=>'<span class="math-frac" aria-label="'+a+' على '+b+'"><span class="top">'+a+'</span><span class="bottom">'+b+'</span></span>').replace(/نها س ← ([٠-٩]+)\s*:/g,(_,a)=>'<span class="math-lim">نها<small>س ← '+a+'</small></span>');}
function sayMath(s){return String(s).replace(/([٠-٩]+)⁄([٠-٩]+)/g,"$1 على $2").replace(/نها س ← ([٠-٩]+)\s*:/g,"نهاية الدالة عندما سين تقترب من $1،");}
function show(scene,theme){
 state.scene=scene;game.dataset.scene=scene;
 if(theme)game.dataset.theme=theme;
 for(const id of ["intro","grade","quest","reward","map","avatar"])$(id).hidden=(id!==scene);
 const labels={intro:["بوابة المغامرة","مغامرتك تبدأ هنا"],grade:["اختر عالمك","مغامرتان تجريبيتان"],quest:[state.pack?.world||"عالم الرياضيات",state.pack?.grade||""],reward:["صندوق المكافآت","أحسنت يا بطل"],map:["خريطة التقدم","أنجزت المغامرة"],avatar:["ورشة الأبطال","اصنع مظهرك المفضل"]};
 $("worldTitle").textContent=labels[scene][0];$("levelNote").textContent=labels[scene][1];
 if(world)world.sceneChange(scene,theme||state.pack?.id||"fractions");
}
function sceneKey(){return [state.pack?.id||"all",state.scene,state.scene==="quest"||state.scene==="reward"?state.index:""].join(":");}
function recordKey(){return sceneKey();}
function startAudioMeter(el){
 try{
  if(!voiceCtx){const Audio=window.AudioContext||window.webkitAudioContext;if(!Audio)return;voiceCtx=new Audio();}
  const src=voiceCtx.createMediaElementSource(el),node=voiceCtx.createAnalyser();node.fftSize=128;
  src.connect(node);node.connect(voiceCtx.destination);voiceSrc=src;analyser=node;
 }catch(err){console.warn("Audio meter",err);analyser=null}
}
function haltSpeech(){
 voiceId++;state.speaking=false;try{speechSynthesis.cancel()}catch{}
 if(clip){clip.pause();clip.src="";clip=null}
 analyser=null;voiceSrc=null;
 clearTimeout(soundTimeout);
}
function voiceLabel(text){state.message=text; if(state.scene==="intro")$("introLine").textContent=text;else if(state.scene==="quest")$("bubble").textContent=text;}
function speak(text){
 voiceLabel(text);haltSpeech();
 if(state.muted)return;
 const id=voiceId,file=recording?.get(recordKey());
 if(state.voiceMode==="recorded"&&file){
  clip=new Audio(URL.createObjectURL(file));clip.onplay=()=>{if(id===voiceId)state.speaking=true};
  clip.onended=()=>{if(id===voiceId)state.speaking=false;URL.revokeObjectURL(clip.src)};
  startAudioMeter(clip);
  clip.play().catch(()=>{state.speaking=false});
  return;
 }
 // A built-in device voice is only a fallback. Actor-recorded clips sound more natural.
 if(!("speechSynthesis" in window))return;
 try{
  const speech=new SpeechSynthesisUtterance(text),vs=speechSynthesis.getVoices().filter(v=>/^ar[-_]/i.test(v.lang));
  vs.sort((a,b)=>(/(neural|natural|Google|Microsoft)/i.test(b.name)?2:0)-( /(neural|natural|Google|Microsoft)/i.test(a.name)?2:0));
  if(vs[0])speech.voice=vs[0];
  speech.lang=vs[0]?.lang||"ar-SA";speech.rate=.94;speech.pitch=1.05;
  speech.onstart=()=>{if(voiceId===id)state.speaking=true};
  speech.onend=()=>{if(voiceId===id)state.speaking=false};
  speech.onerror=()=>{if(voiceId===id)state.speaking=false};
  utterance=speech;speechSynthesis.speak(speech);
 }catch(err){console.warn("Arabic voice unavailable",err);}
}
function setMute(flag){state.muted=flag;$("mute").textContent=flag?"🔇":"🔊";if(flag)haltSpeech();}
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
 state.pack=PACKS[packId]||PACKS.fractions;state.index=0;state.score=0;state.tries=0;
 updateScore();buildQuestion();show("quest",packId);
 speak(state.pack.welcome+" السؤال الأول. "+sayMath(state.pack.questions[0].math));
}
function buildQuestion(){
 const q=state.pack.questions[state.index];state.tries=0;state.finished=false;
 $("qProgress").textContent="التحدّي "+arab(state.index+1)+" من "+arab(state.pack.questions.length);
 $("progress").style.width=((state.index+1)/state.pack.questions.length*100)+"%";
 $("lead").textContent=q.lead;$("equation").innerHTML=mathHTML(q.math);
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
  state.finished=true;state.score++;updateScore();
  buttons.forEach((b,j)=>{b.disabled=true;if(j===q.correct)b.classList.add("correct")});
  $("response").textContent="إجابة صحيحة! "+q.explanation;
  $("next").textContent=state.index===state.pack.questions.length-1?"افتح خريطة المكافآت ←":"السؤال التالي ←";$("next").hidden=false;$("hint").disabled=true;
  if(world)world.react(true);
  confetti();speak(story.correct[state.index%story.correct.length]+" "+q.explanation);
  setTimeout(()=>{if(state.scene==="quest"&&state.finished){show("reward",state.pack.id);$("rewardTitle").textContent="أحسنت! 🌟";$("rewardText").textContent="حصلت على نجمة. "+q.explanation;$("continue").textContent=state.index===state.pack.questions.length-1?"شاهد خريطتك ←":"أكمل المغامرة ←"}},1150);
 }else{
  buttons[i].disabled=true;buttons[i].classList.add("wrong");state.tries++;
  if(world)world.react(false);
  if(state.tries===1){$("response").textContent="اقتربت! "+q.hint;speak(story.retry+" "+q.hint)}
  else{
   state.finished=true;buttons.forEach((b,j)=>{b.disabled=true;if(j===q.correct)b.classList.add("correct")});
   $("response").textContent="الصحيح: "+q.options[q.correct]+" — "+q.explanation;
   $("next").hidden=false;$("hint").disabled=true;
   speak("لنتعلم معًا: "+q.explanation);
  }
 }
}
function moveOn(){
 haltSpeech();
 if(state.index<state.pack.questions.length-1){
  state.index++;buildQuestion();show("quest",state.pack.id);
  speak("هيا إلى التحدّي التالي. "+state.pack.questions[state.index].lead+" "+sayMath(state.pack.questions[state.index].math));
 }else finish();
}
function finish(){
 show("map","forest");$("scoreFinal").textContent=arab(state.score);
 $("mapMessage").textContent="أنهيت "+arab(state.pack.questions.length)+" تحديات، وجمعت "+arab(state.score)+" نجوم. شكرًا لمثابرتك!";
 const trail=$("trail");trail.replaceChildren();
 for(let i=0;i<state.pack.questions.length;i++){const pin=document.createElement("span");pin.textContent=i<state.score?"🌟":arab(i+1);pin.classList.toggle("locked",i>=state.score);trail.append(pin)}
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
$("hint").onclick=()=>{if(state.finished)return;const q=state.pack.questions[state.index];speak("تلميح: "+q.hint);$("response").textContent=q.hint};
$("sayQuestion").onclick=()=>{if(state.pack){const q=state.pack.questions[state.index];speak(q.lead+" "+sayMath(q.math))}};
$("next").onclick=moveOn;$("continue").onclick=moveOn;$("replay").onclick=()=>startQuest(state.pack?.id||"fractions");
$("chooseGrade").onclick=beginGrade;$("customize").onclick=chooseAvatar;$("avatarDone").onclick=()=>startQuest(state.pack?.id||"fractions");
document.querySelectorAll(".swatch").forEach(b=>b.onclick=()=>chooseColor(b.dataset.color));
document.querySelectorAll("[data-say]").forEach(b=>b.onclick=()=>speak(story[b.dataset.say]||state.message));
$("mute").onclick=()=>setMute(!state.muted);

// Voice actor recordings can be attached to the current scene or recorded in the browser.
recording=new Map();
$("audioSettings").onclick=()=>{$("voiceNote").textContent="اربط صوتًا بالمشهد الحالي: "+recordKey();$("voiceDialog").showModal()};
$("closeVoice").onclick=()=>$("voiceDialog").close();
$("saveVoice").onclick=()=>{const selected=document.querySelector('input[name="voiceMode"]:checked');state.voiceMode=selected?.value||"device";$("voiceDialog").close();speak(state.message||story.intro)};
$("testVoice").onclick=()=>{state.voiceMode=document.querySelector('input[name="voiceMode"]:checked')?.value||"device";speak(state.message||story.intro)};
$("voiceFile").onchange=e=>{
 const f=e.target.files?.[0];if(!f||!f.type.startsWith("audio/")||f.size>16*1024*1024){$("voiceNote").textContent="اختر ملفًا صوتيًا صالحًا أقل من ١٦ ميجابايت.";return}
 recording.set(recordKey(),f);$("voiceNote").textContent="تم ربط التسجيل بهذا المشهد. اختر «تسجيلات بشرية» ثم جرّب الصوت.";
};
$("record").onclick=async()=>{
 try{
  if(!navigator.mediaDevices?.getUserMedia||!window.MediaRecorder)throw Error("المتصفح لا يدعم التسجيل");
  micStream=await navigator.mediaDevices.getUserMedia({audio:true});const chunks=[];
  mediaRecorder=new MediaRecorder(micStream);
  mediaRecorder.ondataavailable=e=>{if(e.data.size)chunks.push(e.data)};
  const key=recordKey();mediaRecorder.onstop=()=>{
   if(chunks.length)recording.set(key,new Blob(chunks,{type:mediaRecorder.mimeType||"audio/webm"}));
   micStream?.getTracks().forEach(t=>t.stop());micStream=null;
   $("voiceNote").textContent="تم تسجيل صوت بشري للمشهد "+key+". اختر تسجيلات بشرية ثم جرّبه.";
   $("record").disabled=false;$("stopRecord").disabled=true;
  };
  mediaRecorder.start();$("record").disabled=true;$("stopRecord").disabled=false;
  $("voiceNote").textContent="🔴 جارٍ تسجيل صوتك. تحدث كما لو كنت شخصية مرشدة ثم اضغط إيقاف.";
 }catch(e){$("voiceNote").textContent="تعذّر بدء التسجيل. اسمح باستخدام الميكروفون أو جرّب Chrome."}
};
$("stopRecord").onclick=()=>{if(mediaRecorder?.state==="recording")mediaRecorder.stop()};
window.addEventListener("pagehide",()=>{haltSpeech();micStream?.getTracks().forEach(t=>t.stop());world?.dispose()});

// Original procedural art, not AdaptedMind's artwork or character assets.
const mat=(c,rough=.66,extras={})=>new THREE.MeshStandardMaterial({color:c,roughness:rough,...extras});
const addBall=(parent,r,x,y,z,m,s=[1,1,1])=>{const o=new THREE.Mesh(new THREE.SphereGeometry(r,22,14),m);o.position.set(x,y,z);o.scale.set(...s);parent.add(o);return o};
const addBox=(p,w,h,d,x,y,z,m)=>{const o=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),m);o.position.set(x,y,z);p.add(o);return o};
const addCyl=(p,rTop,rBottom,h,x,y,z,m,n=12)=>{const o=new THREE.Mesh(new THREE.CylinderGeometry(rTop,rBottom,h,n),m);o.position.set(x,y,z);p.add(o);return o};
const addCone=(p,r,h,x,y,z,m,n=10)=>{const o=new THREE.Mesh(new THREE.ConeGeometry(r,h,n),m);o.position.set(x,y,z);p.add(o);return o};
function canvasLabel(text,fg="#243f75",bg="#fff5d5",width=320){
 const c=document.createElement("canvas");c.width=width;c.height=145;const ctx=c.getContext("2d");
 ctx.fillStyle=bg;ctx.beginPath();ctx.roundRect(6,6,c.width-12,c.height-12,24);ctx.fill();
 ctx.strokeStyle="#ffffff";ctx.lineWidth=7;ctx.stroke();
 ctx.textAlign="center";ctx.textBaseline="middle";ctx.fillStyle=fg;
 let size=54;if(text.length>14)size=30;else if(text.length>8)size=39;
 ctx.font=`900 ${size}px Tahoma, Arial`;ctx.fillText(text,c.width/2,c.height/2, c.width-18);
 const t=new THREE.CanvasTexture(c);t.colorSpace=THREE.SRGBColorSpace;
 const m=new THREE.MeshBasicMaterial({map:t,transparent:true,side:THREE.DoubleSide});
 return new THREE.Mesh(new THREE.PlaneGeometry(2.0,.90),m);
}
class AdventureWorld{
 constructor(){
  this.canvas=$("stage3d");this.renderer=new THREE.WebGLRenderer({canvas:this.canvas,alpha:true,antialias:true,powerPreference:"low-power"});
  this.renderer.setPixelRatio(Math.min(devicePixelRatio||1,1.5));this.renderer.outputColorSpace=THREE.SRGBColorSpace;
  this.scene=new THREE.Scene();this.scene.add(new THREE.HemisphereLight(0xffffff,0x566eaa,2.7));
  const d=new THREE.DirectionalLight(0xfff5df,2.8);d.position.set(-4,8,8);this.scene.add(d);
  this.camera=new THREE.PerspectiveCamera(44,1,.1,80);this.camera.position.set(0,2.0,10.3);this.camera.lookAt(0,1,0);
  this.environment=new THREE.Group();this.scene.add(this.environment);
  this.hero=new THREE.Group();this.scene.add(this.hero);
  this.tokens=new THREE.Group();this.scene.add(this.tokens);
  this.motion=[];this.time=0;this.last=0;this.reaction=0;this.actor=null;
  this.makeActor();this.sceneChange("intro","fractions");
  this.resize();this.resizer=new ResizeObserver(()=>this.resize());this.resizer.observe(this.canvas);
  this.tick=this.tick.bind(this);this.frame=requestAnimationFrame(this.tick);
 }
 makeActor(){
  const g=this.hero;
  const green=mat(0x75d9bd,.53),cream=mat(0xfaf4e6),pink=mat(0xef94b1),black=mat(0x1d3559,.23),white=new THREE.MeshBasicMaterial({color:0xffffff});
  const body=addBall(g,.84,0,.88,0,green,[.98,1.18,.77]);this.body=body;
  addBall(g,1.0,0,1.99,.07,green,[1.05,.91,.94]);addBall(g,.68,0,1.52,.79,cream,[.91,.58,.29]);
  for(const s of [-1,1]){
   const ear=addBall(g,.51,s*.79,2.81,-.1,green,[.48,1.22,.53]);ear.rotation.z=s*-.34;
   const inside=addBall(g,.36,s*.81,2.86,.2,pink,[.42,1.1,.29]);inside.rotation.z=s*-.34;
   const eye=addBall(g,.23,s*.37,2.08,.89,white,[.9,1.1,.43]);this.eyeParts=this.eyeParts||[];this.eyeParts.push(eye);
   addBall(g,.155,s*.36,2.06,1.06,black,[.9,1.0,.55]);
   addBall(g,.055,s*.36-.04,2.13,1.18,white);
   addBall(g,.21,s*.70,1.72,.75,pink,[.9,.65,.35]);
   const arm=addBall(g,.31,s*.84,1.10,.12,green,[.57,1.1,.6]);arm.rotation.z=-s*.45;
   addBall(g,.35,s*.43,.12,.05,green,[1,.53,1.17]);
  }
  addBall(g,.14,0,1.84,1.05,pink,[1,.76,.6]);
  this.mouth=addBall(g,.27,0,1.54,.92,mat(0x6d405d),[1,.19,.14]);
  addCyl(g,.054,.07,.46,0,3.11,.05,green);
  const crown=addBall(g,.18,0,3.43,.06,new THREE.MeshBasicMaterial({color:0xffdc79}),[1,.9,.6]);this.crown=crown;
  const chest=addBall(g,.21,0,1.1,.71,mat(0xffcd75,.24,{emissive:0xaa7833,emissiveIntensity:.3}),[1,.7,.4]);
  this.hero.position.set(0,-.15,2.7);
 }
 clear(group){group.traverse(o=>{if(o.geometry)o.geometry.dispose();if(o.material)(Array.isArray(o.material)?o.material:[o.material]).forEach(m=>{m.map?.dispose();m.dispose()})});group.clear()}
 sceneChange(scene,theme){
  this.clear(this.environment);this.clear(this.tokens);this.motion=[];
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
  } else if(scene==="grade" || scene==="reward"){
   const wall=m(0x8ad7ce),floor=m(0x368db5),coral=m(0xec9c6b),gold=m(0xffe69b);
   addBox(e,18,10,.4,0,2,-10,wall);addBox(e,17,.3,20,0,-.78,-3,floor);
   for(let i=0;i<7;i++){const z=3-i*2.7;addBox(e,17,.12,.22,0,-.59,z,gold)}
   addBox(e,3.8,4.5,.6,0,1.2,-9.4,coral);
   for(let x of [-5.4,5.4])for(let i=0;i<3;i++)addBox(e,.2,3,.2,x,1.5,3-i*5,gold);
   this.hero.position.set(-2.6,-.1,2.7);this.hero.scale.setScalar(.85);
  }else if(scene==="quest" && theme==="limits"){
   const ground=m(0x323c83),planet=m(0x977ee0),light=m(0xffb9dc);
   addCyl(e,7.1,7.0,.7,0,-1.38,-1.8,ground,48);
   addCyl(e,7.1,7.1,.12,0,-.98,-1.8,light,48);
   for(let i=0;i<24;i++){
    const a=i*2.4,x=Math.sin(a)*6,y=.4+(i%6)*.9,z=-3-(i%4);
    const sp=addBall(e,.055,x,y,z,light);this.motion.push({o:sp,y,s:i*.7,t:0});
   }
   for(let i=0;i<5;i++){
    const a=i*Math.PI*2/5,pt=addBall(e,.5,Math.sin(a)*5,1.6+(i%3),-5,planet,[1.2,1,1]);this.motion.push({o:pt,y:pt.position.y,s:i*1.2,t:1});
   }
   this.hero.position.set(-2.45,-.03,2.65);this.hero.scale.setScalar(.85);
  }else if(scene==="quest"){
   const sand=m(0xe9c881),shell=m(0xec9b89),kelp=m(0x1b9a8c),seawall=m(0x1b81bb);
   addCyl(e,7.3,6.7,.83,0,-1.46,-1.8,sand,48);
   for(let i=0;i<14;i++){
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
    const body=addBall(fish,.23,0,0,0,shell,[1.7,.75,.5]);
    addCone(fish,.18,.36,-.34,0,0,shell).rotation.z=-Math.PI/2;
    this.motion.push({o:fish,y:fish.position.y,s:i*.8,t:2});
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
  this.resize();
 }
 questionObjects(q){
  this.clear(this.tokens);
  if(state.scene!=="quest")return;
  const g=this.tokens,strings=q.math.match(/[٠-٩]+(?:⁄[٠-٩]+)?/g)||[];
  const parts=strings.slice(0,3);
  const positions=[-.40,1.90,3.7];const props=mat(0x6cce8d),blue=mat(0x98bbea);
  parts.forEach((txt,i)=>{
   const node=new THREE.Group();node.position.set(positions[i]-1.45,.44,-.2);g.add(node);
   const body=addBall(node,.52,0,.2,0,i%2?blue:props,[.85,.9,.7]);
   addBall(node,.11,-.18,.35,.40,new THREE.MeshBasicMaterial({color:0xffffff}));
   addBall(node,.11,.18,.35,.40,new THREE.MeshBasicMaterial({color:0xffffff}));
   addBall(node,.05,-.18,.35,.50,mat(0x213a5d));addBall(node,.05,.18,.35,.50,mat(0x213a5d));
   const label=canvasLabel(txt);label.position.set(0,.04,.55);label.scale.set(.68,.69,1);node.add(label);
   this.motion.push({o:node,y:node.position.y,s:i*.85,t:0});
  });
 }
 setAvatar(hex){this.body.material.color.set(hex);const head=this.hero.children.find(o=>o.position.y===1.99);if(head)head.material.color.set(hex)}
 react(correct){this.reaction=performance.now()+900;this.isCorrect=correct}
 resize(){
  const r=this.canvas.getBoundingClientRect(),w=Math.max(100,r.width),h=Math.max(100,r.height);
  this.renderer.setSize(w,h,false);this.camera.aspect=w/h;this.camera.fov=w<700?47:40;
  this.camera.position.set(0,w<700?2.5:2.1,w<700?10.8:11.3);
  this.camera.lookAt(0,w<700?1.0:1.3,0);this.camera.updateProjectionMatrix();
 }
 tick(t){
  this.frame=requestAnimationFrame(this.tick);
  if(document.hidden||(this.last&&t-this.last<33))return;this.last=t;
  const seconds=t/1000,amp=state.speaking?(0.35+Math.abs(Math.sin(seconds*13))*.55):.17;
  if(analyser&&clip&&!clip.paused){
   analyser.getByteTimeDomainData(audioMeter);
   let sum=0;for(const v of audioMeter)sum+=Math.abs(v-128);
   this.mouth.scale.y=Math.max(.12,Math.min(.85,sum/32));
  }else this.mouth.scale.y=amp;
  if(!reduced){
   this.hero.position.y=this.hero.position.y<-.25?this.hero.position.y:-.1+Math.sin(seconds*2.3)*.06;
   this.hero.rotation.z=Math.sin(seconds*.82)*.022;
   this.crown.rotation.y+=.015;
   const blinking=Math.sin(seconds*1.55+1.6)>.996?.15:1;
   this.eyeParts?.forEach(o=>o.scale.y=blinking*1.1);
   for(const x of this.motion){
    if(x.t===2)x.o.position.x+=.004;
    else x.o.position.y=x.y+Math.sin(seconds*(x.t===1?.45:1.0)+x.s)*.10;
   }
  }
  if(this.reaction>t){this.hero.rotation.z=Math.sin(seconds*(this.isCorrect?17:6))*(this.isCorrect?.12:.05)}
  this.renderer.render(this.scene,this.camera);
 }
 dispose(){cancelAnimationFrame(this.frame);this.resizer.disconnect();this.clear(this.environment);this.clear(this.tokens);this.clear(this.hero);this.renderer.dispose()}
}
try{world=new AdventureWorld();world.sceneChange("intro","fractions")}catch(err){console.error("3D fallback",err);$("sceneError").hidden=false;game.classList.add("no-webgl")}
try{const color=localStorage.getItem("warraq-avatar-color");if(color)chooseColor(color)}catch{}
show("intro");voiceLabel(story.intro);
