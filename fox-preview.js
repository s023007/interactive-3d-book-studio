const canvas = document.querySelector("#character");
const status = document.querySelector("#status");
const input = document.querySelector("#recording");
const speak = document.querySelector("#speak");
const walk = document.querySelector("#walk");
let context;
let playback;

const gate = document.querySelector("#reef-gate");
const shell = document.querySelector("#shell-board");
const missing = document.querySelector("#missing");
const feedback = document.querySelector("#feedback");
const replay = document.querySelector("#replay");
const choices = [...document.querySelectorAll("[data-piece]")];
let act = () => {};

for (const choice of choices) {
  choice.addEventListener("click", () => {
    if (!replay.hidden) return;
    choices.forEach(button => button.setAttribute("aria-pressed",String(button===choice)));
    if(choice.dataset.piece!=="1"){
      feedback.textContent = choice.dataset.piece==="2"
        ? "النصف يساوي ربعين. معنا ربعان بالفعل، ونحتاج ربعًا واحدًا فقط."
        : "هذه ثلاثة أرباع وحدها. لدينا ربعان، فابحث عن قطعة أصغر.";
      act("sit");
      return;
    }
    missing.classList.add("filled");
    shell.ariaLabel = "ثلاثة أرباع من الصدفة";
    gate.classList.add("open");
    feedback.textContent = "فُتحت البوابة! نصف الصدفة يساوي ربعين، ومع ربع آخر يصبح المجموع ثلاثة أرباع.";
    replay.hidden = false;
    replay.focus({preventScroll:true});
    choices.forEach(button => { button.disabled = true; });
    act("jump");
  });
}
replay.onclick = () => {
  choices.forEach(button => {
    button.disabled = false;
    button.removeAttribute("aria-pressed");
  });
  gate.classList.remove("open");
  missing.classList.remove("filled");
  shell.ariaLabel = "ربعان من أربعة";
  feedback.textContent = "انظر إلى الأرباع الأربعة، ثم اختر القطعة الناقصة.";
  replay.hidden = true;
  choices[0].focus({preventScroll:true});
  act("idle");
};

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
