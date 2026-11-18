const canvas = document.querySelector("#character");
const status = document.querySelector("#status");
const input = document.querySelector("#recording");
const speak = document.querySelector("#speak");
const walk = document.querySelector("#walk");
let context;
let playback;

const gate = document.querySelector("#reef-gate");
const shell = document.querySelector("#shell-board");
const feedback = document.querySelector("#feedback");
const replay = document.querySelector("#replay");
const next = document.querySelector("#next-gate");
const restart = document.querySelector("#restart");
const title = document.querySelector("#mission-title");
const choiceGroup = document.querySelector("#choices");
const progress = document.querySelector("#gate-progress");
const line = document.querySelector("#mission-line");
const number = new Intl.NumberFormat("ar-OM", {numberingSystem:"arab"});
const checkpoint = "warraq.fox-coral.gate.v1";
let act = () => {};

// Each option describes the same-size cells used by the gate and its display fraction.
const missions = [
  {
    name:"بوابة الأرباع", whole:4, initial:2, target:3,
    line:"معنا نصف الصدفة. أي قطعة تكمل ثلاثة أرباع؟",
    options:[[1,4,"ربع"],[1,2,"نصف"],[3,4,"ثلاثة أرباع"]],
    success:"نصف الصدفة يساوي ربعين، ومع ربع آخر يصبح المجموع ثلاثة أرباع.",
  },
  {
    name:"بوابة السداسيات", whole:6, initial:3, target:5,
    line:"معنا نصف الصدفة، أي ثلاثة أسداس. أي قطعة تكمل خمسة أسداس؟",
    options:[[1,6,"سدس واحد"],[1,3,"ثلث"],[1,2,"نصف"]],
    success:"الثلث يساوي سدسين. ثلاثة أسداس وسدسان تساوي خمسة أسداس.",
  },
  {
    name:"بوابة الأثمان", whole:8, initial:2, target:5,
    line:"معنا ربع الصدفة، أي ثمنان. أي قطعة تكمل خمسة أثمان؟",
    options:[[1,2,"نصف"],[1,4,"ربع"],[3,8,"ثلاثة أثمان"]],
    success:"الربع يساوي ثمنين. ثمنان وثلاثة أثمان تساوي خمسة أثمان.",
  },
];

function readCheckpoint(){
  try {
    const saved = Number(localStorage.getItem(checkpoint));
    if(Number.isInteger(saved)&&saved>=0&&saved<missions.length)return saved;
  }catch{}
  return 0;
}
let stageIndex = readCheckpoint();

function paintShell(cells){
  const mission = missions[stageIndex];
  const filled = mission.initial+cells;
  shell.ariaLabel = mission.whole===4 ? (cells?"ثلاثة أرباع من الصدفة":"ربعان من أربعة")
    : number.format(filled)+" من "+number.format(mission.whole);
  shell.replaceChildren(...Array.from({length:mission.whole},(_,index)=>{
    const cell=document.createElement("i");
    if(index<mission.initial)cell.className="half";
    else if(index<filled)cell.className="filled";
    return cell;
  }));
}

function selectPiece(cells,button){
  const mission = missions[stageIndex];
  const missing = mission.target-mission.initial;
  for(const choice of choiceGroup.children)choice.setAttribute("aria-pressed",String(choice===button));
  if(cells!==missing){
    feedback.textContent = stageIndex===0 ? "معنا ربعان بالفعل، ونحتاج ربعًا واحدًا فقط." :
      "تغطي هذه القطعة "+number.format(cells)+" من الأجزاء المتساوية. نحتاج "+number.format(missing)+" منها.";
    act("sit");
    return;
  }
  paintShell(cells);
  gate.classList.add("open");
  const isLast = stageIndex===missions.length-1;
  feedback.textContent = (isLast?"أكملت رحلة المرجان! ":"فُتحت البوابة! ")+mission.success;
  for(const choice of choiceGroup.children)choice.disabled=true;
  next.hidden=isLast;
  replay.hidden=false;
  (isLast?replay:next).focus({preventScroll:true});
  act("jump");
}

function renderMission(focus=false){
  const mission = missions[stageIndex];
  try{localStorage.setItem(checkpoint,String(stageIndex));}catch{}
  title.textContent=mission.name;
  line.textContent=mission.line;
  restart.hidden=stageIndex===0;
  progress.replaceChildren(...missions.map((item,index)=>{
    const step=document.createElement("li");
    step.textContent=number.format(index+1);
    step.title=item.name;
    if(index===stageIndex)step.setAttribute("aria-current","step");
    if(index<stageIndex)step.className="completed";
    return step;
  }));
  paintShell(0);
  gate.classList.remove("open");
  next.hidden=replay.hidden=true;
  feedback.textContent="اختر القطعة الناقصة لتفتح البوابة.";
  choiceGroup.replaceChildren(...mission.options.map(([numerator,denominator,label])=>{
    const button=document.createElement("button");
    button.type="button";
    button.ariaLabel=label;
    button.innerHTML='<span class="fraction"><b>'+number.format(numerator)+'</b><span>'+number.format(denominator)+'</span></span>';
    button.onclick=()=>selectPiece(numerator*mission.whole/denominator,button);
    return button;
  }));
  act("idle");
  if(focus)title.focus({preventScroll:true});
}
next.onclick=()=>{stageIndex++;renderMission(true);};
replay.onclick=()=>{renderMission();choiceGroup.firstElementChild.focus({preventScroll:true});};
restart.onclick=()=>{stageIndex=0;renderMission(true);};
renderMission();

async function load() {
  const THREE = await import("three");
  const { GLTFLoader } = await import("three/addons/loaders/GLTFLoader.js");
  const renderer = new THREE.WebGLRenderer({canvas, alpha:true, antialias:true, powerPreference:"low-power"});
  renderer.setPixelRatio(Math.min(1.5,devicePixelRatio));
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(33,1,.01,100);
  scene.add(new THREE.HemisphereLight(0xffefd9,0x489692,2.2));
  const key = new THREE.DirectionalLight(0xffeed8,2.4);
  key.position.set(4,6,4);
  scene.add(key);

  const model = await new GLTFLoader().loadAsync("./assets/vuena/animal_fox.glb");
  model.scene.getObjectByName("fox_LOD0").visible = false;
  const bounds = new THREE.Box3().setFromObject(model.scene.getObjectByName("fox_LOD1"));
  const center = bounds.getCenter(new THREE.Vector3());
  const size = bounds.getSize(new THREE.Vector3()).length();
  const zoom = size*1.75;
  camera.position.copy(center).add(new THREE.Vector3(zoom*.40,zoom*.18,zoom*.81));
  camera.lookAt(center);
  scene.add(model.scene);

  const jaw = model.scene.getObjectByName("Jaw");
  const rest = jaw.quaternion.clone();
  const opened = rest.clone();
  const candidate = rest.clone();
  const callTrack = THREE.AnimationClip.findByName(model.animations,"call").tracks.find(track => track.name==="Jaw.quaternion");
  for(let index=0;index<callTrack.values.length;index+=4){
    candidate.fromArray(callTrack.values,index);
    if(rest.angleTo(candidate)>rest.angleTo(opened)) opened.copy(candidate);
  }

  // The body clip animates limbs and lids. The decoded recording drives the jaw.
  const mixer = new THREE.AnimationMixer(model.scene);
  const clips = Object.fromEntries(["idle","walk","sit","jump"].map(name => {
    const clip = THREE.AnimationClip.findByName(model.animations,name).clone();
    clip.tracks = clip.tracks.filter(track => !track.name.startsWith("Jaw."));
    return [name,mixer.clipAction(clip)];
  }));
  const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
  let active = "idle";
  let previous = 0;
  let openness = 0;
  clips.idle.play();
  for(const name of ["jump","sit"]){
    clips[name].setLoop(THREE.LoopOnce,1);
  }
  act = (name) => {
    if(reduced&&(name==="sit"||name==="jump")) return;
    const current = clips[active];
    const next = clips[name];
    next.reset().play();
    if(current!==next){
      if(reduced)current.stop();
      else current.crossFadeTo(next,.17,false);
    }
    active = name;
    walk.setAttribute("aria-pressed",String(name==="walk"));
    walk.textContent = name==="walk"?"أوقف المشي":"جرّب المشي";
  };
  mixer.addEventListener("finished",event=>{
    if(clips[active]===event.action)act("idle");
  });

  function resize(){
    const {width,height} = canvas.getBoundingClientRect();
    camera.aspect = width/height;
    camera.updateProjectionMatrix();
    renderer.setSize(width,height,false);
  }
  new ResizeObserver(resize).observe(canvas);
  resize();
  renderer.setAnimationLoop(time=>{
    const delta = Math.min((time-previous)/1000,.05);
    previous = time;
    mixer.update(reduced&&active!=="walk" ? 0 : delta);
    let target = 0;
    if(playback){
      playback.analyser.getFloatTimeDomainData(playback.samples);
      const energy = playback.samples.reduce((sum,value)=>sum+value*value,0)/playback.samples.length;
      target = Math.min(1,Math.sqrt(energy)*5);
    }
    openness += (target-openness)*.45;
    jaw.quaternion.copy(rest).slerp(opened,openness);
    renderer.render(scene,camera);
  });
  walk.disabled = false;
  walk.onclick = () => act(active==="walk"?"idle":"walk");
  status.textContent = "الثعلب جاهز. جرّب المشي أو أرفق تسجيلًا لتحريك الفك.";
  speak.disabled = !input.files.length;
  input.onchange = () => { speak.disabled = !input.files.length || Boolean(playback); };
  speak.onclick = async () => {
    const file = input.files[0];
    if(!file||playback) return;
    speak.disabled = true;
    try {
      const Audio = window.AudioContext || window.webkitAudioContext;
      context ??= new Audio();
      await context.resume();
      const buffer = await context.decodeAudioData(await file.arrayBuffer());
      const source = context.createBufferSource();
      const analyser = context.createAnalyser();
      analyser.fftSize = 512;
      source.buffer = buffer;
      source.connect(analyser).connect(context.destination);
      playback = {analyser,samples:new Float32Array(analyser.fftSize)};
      source.onended = () => {
        source.disconnect();
        analyser.disconnect();
        playback = null;
        speak.disabled = !input.files.length;
        status.textContent = "انتهى التسجيل. يمكنك إعادة تشغيله.";
      };
      source.start();
      status.textContent = "يعمل التسجيل الآن، ويتحرك الفك بحسب شدة الصوت.";
    } catch {
      playback = null;
      speak.disabled = !input.files.length;
      status.textContent = "تعذّر تشغيل الملف الصوتي. جرّب تسجيلًا بصيغة WAV أو MP3.";
    }
  };
}

load().catch(() => {
  status.textContent = "تعذّر تحميل الشخصية. تحتاج المعاينة إلى WebGL واتصال يسمح بتحميل Three.js.";
});
