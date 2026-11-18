const canvas = document.querySelector("#character");
const status = document.querySelector("#status");
const input = document.querySelector("#recording");
const speak = document.querySelector("#speak");
const walk = document.querySelector("#walk");
let context;
let playback;

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
  const clips = Object.fromEntries(["idle","walk"].map(name => {
    const clip = THREE.AnimationClip.findByName(model.animations,name).clone();
    clip.tracks = clip.tracks.filter(track => !track.name.startsWith("Jaw."));
    return [name,mixer.clipAction(clip)];
  }));
  const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
  let moving = false;
  let previous = 0;
  let openness = 0;
  clips.idle.play();

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
    mixer.update(reduced&&!moving ? 0 : delta);
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
  walk.onclick = () => {
    const from = moving ? clips.walk : clips.idle;
    const to = moving ? clips.idle : clips.walk;
    to.reset().play();
    if(reduced) from.stop();
    else from.crossFadeTo(to,.2,false);
    moving = !moving;
    walk.setAttribute("aria-pressed",String(moving));
    walk.textContent = moving ? "أوقف المشي" : "جرّب المشي";
  };
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
