import { createRiverAudio } from "./river-sound.js";

const $=id=>document.getElementById(id);
const canvas=$("landscape");
const objective=$("objective");
const hint=$("hint");
const action=$("action");
const slotImage=$("slots");
const log=$("log");
const arabic=new Intl.NumberFormat("ar-OM",{numberingSystem:"arab"});
const saveKey="warraq.river-trail.v1";
const reduced=matchMedia("(prefers-reduced-motion:reduce)").matches;
const steps=[...document.querySelectorAll(".steps li")];
let audio;
let soundEnabled=false;
let checkpoint;
try { checkpoint=JSON.parse(localStorage.getItem(saveKey)); } catch {}
let photo=typeof checkpoint?.photo==="string"&&checkpoint.photo.startsWith("data:image/jpeg;base64,")?checkpoint.photo:null;

function showPhoto() {
  $("photo").hidden=!photo;
  if(photo)$("photo-image").src=photo;
  else $("photo-image").removeAttribute("src");
  $("log-text").textContent=photo
    ?"وجدت الحيوان في الوادي. أكملت الجسر بإضافة ثمنين، فصار مجموع القطع ستة أثمان، أي ثلاثة أرباع."
    :"تظهر صورة الحيوان بعد عبور النهر.";
}
showPhoto();
$("journal").onclick=()=>log.showModal();
$("close-log").onclick=()=>log.close();

async function init() {
  const T=await import("three");
  const world=await import("./river-world.js");
  const {riverNear,riverFar,bridgeHalf,spawn,tracks,stock,lock,lookout,animalSite,elevation}=world;
  const renderer=new T.WebGLRenderer({canvas,antialias:true,powerPreference:"low-power"});
  renderer.outputColorSpace=T.SRGBColorSpace;
  renderer.toneMapping=T.ACESFilmicToneMapping;
  renderer.toneMappingExposure=1.17;
  const scene=new T.Scene();
  const camera=new T.PerspectiveCamera(49,1,.1,140);
  const view=world.buildWorld(scene);
  const actor=view.actor;
  const cameraTarget=new T.Vector3();
  const cameraPosition=new T.Vector3();
  const projected=new T.Vector3();
  const groundPlane=new T.Plane(new T.Vector3(0,1,0),0);
  const hit=new T.Vector3();
  const ray=new T.Raycaster();
  const keys=new Set();
  const pressed=new Map();
  const directionStart=new WeakMap();
  const regions={trace:0,stock:1,carry:1,cross:2,done:3};
  const directions={up:[0,-1],down:[0,1],left:[-1,0],right:[1,0]};
  const keyDirections={ArrowUp:"up",KeyW:"up",ArrowDown:"down",KeyS:"down",ArrowLeft:"left",KeyA:"left",ArrowRight:"right",KeyD:"right"};
  let phase="trace";
  let traces=0;
  let carrying=0;
  let bridgeOpen=false;
  let position=[...spawn];
  let route=null;
  let cue=null;
  let previous=0;
  let lastTime=0;
  let buttons=[];
  let walkClock=0;
  let motion=0;
  let capturing=false;

  function save(){
    try {localStorage.setItem(saveKey,JSON.stringify({bridgeOpen,photo}));} catch {}
  }
  function message(value){if(objective.textContent!==value)objective.textContent=value;}
  function progress() {
    const step=regions[phase];
    steps.forEach((item,i)=>{
      if(step===i)item.setAttribute("aria-current","step");
      else item.removeAttribute("aria-current");
      item.classList.toggle("done",i<step);
    });
  }
  function math(){
    $("bridge-math").hidden=phase==="trace";
    $("addition").textContent=bridgeOpen?"٢":carrying?arabic.format(carrying):"؟";
    const comparison=$("comparison");
    comparison.textContent=bridgeOpen?"=":"←";
    comparison.ariaLabel=bridgeOpen?"يساوي":"الهدف";
    slotImage.ariaLabel=bridgeOpen?"ست خانات مركبة من أصل ثمان":carrying
      ?"أربع خانات مركبة، وتحمل قطعة تغطي "+arabic.format(carrying)+" من الخانات."
      :"أربع خانات مركبة من أصل ثمان";
    slotImage.replaceChildren(...Array.from({length:8},(_,index)=>{
      const slot=document.createElement("i");
      if(index<4)slot.className="installed";
      else if(index<4+(bridgeOpen?2:carrying))slot.className="add";
      return slot;
    }));
  }
  function setTargets(){
    const specs=phase==="trace" ? [{id:"track",point:tracks[traces],label:"أثر أقدام",symbol:"✦"}] :
      phase==="stock" ? stock.map((point,i)=>({id:"plank-"+(i+1),point,label:arabic.format(i+1)+(i===0?" خانة":" خانات"),symbol:"▪"})) :
      phase==="carry" ? [{id:"lock",point:lock,label:"قفل الجسر",symbol:"◇"}] :
      phase==="cross" ? [{id:"lookout",point:lookout,label:"موقع التصوير",symbol:"◉"}] : [];
    buttons=specs.map(spec=>{
      const el=document.createElement("button");
      el.type="button";el.className="target";el.dataset.target=spec.id;
      const icon=document.createElement("span");icon.ariaHidden="true";icon.textContent=spec.symbol;
      el.append(icon,document.createTextNode(spec.label));
      el.onclick=()=>goTo(spec);
      return {...spec,el};
    });
    $("targets").replaceChildren(...buttons.map(item=>item.el));
    action.textContent={trace:"تابع الأثر",stock:"أقرب قطعة",carry:"جرّب القطعة",cross:"اتجه للتصوير",done:"افتح الدفتر"}[phase];
    view.wildlife.deer.visible=phase==="cross"||phase==="done";
    view.stacks.forEach((stack,i)=>{stack.visible=phase!=="trace"&&carrying!==i+1;});
    view.prints.forEach((print,i)=>{print.visible=phase==="trace"&&i>=traces;});
    actor.plank.visible=carrying>0;
    actor.plank.scale.x=carrying*.58;
    for(let i=4;i<6;i++)view.crossing.board[i].material=bridgeOpen?view.crossing.brass:view.crossing.board[7].material;
    progress();
    math();
  }
  function goTo(target){
    const [x,z]=target.point;
    cue=target;
    route=target.id==="lookout"&&position[1]>riverNear ? [[0,.6],[0,-16],target.point] : [[x,z]];
  }
  function visit(target) {
    if(target.id==="track"){
      traces++;
      if(traces===tracks.length){
        phase="stock";
        message("وصلت إلى الجسر. أربع خانات مركبة من ثمانٍ. اختر قطعة تكملها إلى ست.");
      }else message("أثر جديد قرب ضفة النهر. اتبع العلامة التالية.");
    }else if(target.id.startsWith("plank")){
      carrying=Number(target.id.slice(-1));
      phase="carry";
      message("التقطت قطعة تغطي "+arabic.format(carrying)+(carrying===1?" خانة.":" خانات.")+" جرّبها عند قفل الجسر.");
      audio?.cue("pick");
    }else if(target.id==="lock"){
      if(carrying===2){
        carrying=0;
        bridgeOpen=true;
        phase="cross";
        save();
        audio?.cue("open");
        message("انفتح الجسر! أربعة أثمان مع ثمنين تساوي ستة أثمان، أي ثلاثة أرباع. اعبر إلى موقع التصوير.");
      }else{
        message(carrying<2?"تبقى خانة فارغة. أعِد القطعة واختر قطعة تغطي خانتين.":"هذه القطعة أطول من الفراغ بخانة. جرّب قطعة تغطي خانتين.");
        carrying=0;
        phase="stock";
      }
    }else {
      takePhoto();
    }
    setTargets();
  }
  const distance=([x,z])=>Math.hypot(x-position[0],z-position[1]);
  function handleAction(){
    if(phase==="done"){log.showModal();return;}
    const target=buttons.reduce((nearest,item)=>!nearest||distance(item.point)<distance(nearest.point)?item:nearest,null);
    if(target)goTo(target);
  }
  function takePhoto(){
    phase="done";
    action.textContent="افتح الدفتر";
    capturing=true;
    audio?.cue("photo");
    const flash=$("flash");
    flash.classList.add("flash");
    flash.addEventListener("animationend",()=>flash.classList.remove("flash"),{once:true});
    message("التقطت صورة الظبي وأكملت الرحلة. افتح دفتر الرحلة لمشاهدتها.");
  }
  function saveFrame(){
    const frame=document.createElement("canvas");
    frame.width=480;frame.height=300;
    frame.getContext("2d").drawImage(canvas,0,0,480,300);
    photo=frame.toDataURL("image/jpeg",.83);
    save();showPhoto();capturing=false;
  }
  function start(resume=false){
    phase="trace";traces=0;carrying=0;bridgeOpen=false;
    position=[...spawn];route=null;cue=null;keys.clear();pressed.clear();
    actor.body.rotation.y=Math.PI-.42;
    if(resume&&checkpoint?.bridgeOpen===true){
      bridgeOpen=true;
      phase=photo?"done":"cross";
      position=[...(photo?lookout:[0,2])];
    }
    const initial=phase==="done"?"أكملت الرحلة. صورتك محفوظة في دفتر الرحلة.":
      phase==="cross"?"عدت إلى الجسر المفتوح. تابع إلى موقع التصوير.":
      "تحرّك نحو آثار الأقدام في الممر أو المس العلامة ليتجه إليها الراكون.";
    view.crossing.moving.rotation.x=bridgeOpen?0:1.1;
    setTargets();
    message(initial);
  }
  function canWalk(x,z){
    if(x<-13||x>13||z<-29||z>22)return false;
    if(z>=riverNear||z<=riverFar)return true;
    return bridgeOpen&&Math.abs(x)<bridgeHalf-.23;
  }
  function tickMovement(delta){
    let dx=0,dz=0;
    for(const dir of new Set([...keys,...pressed.values()])){
      dx+=directions[dir][0];dz+=directions[dir][1];
    }
    if(dx||dz){route=null;cue=null;}
    if(route?.length){
      dx=route[0][0]-position[0];dz=route[0][1]-position[1];
      if(Math.hypot(dx,dz)<.22){
        route.shift();
        if(!route.length){
          const target=cue;
          route=null;cue=null;
          if(target)visit(target);
          return false;
        }
        dx=route[0][0]-position[0];dz=route[0][1]-position[1];
      }
    }
    const length=Math.hypot(dx,dz);
    if(!length)return false;
    const step=Math.min(delta*6.6,length);
    const x=position[0]+dx/length*step,z=position[1]+dz/length*step;
    if(!canWalk(x,z)){
      route=null;cue=null;
      message(bridgeOpen?"اعبر النهر فوق الجسر الخشبي.":"النهر أمامك. أصلح الجسر قبل العبور.");
      return false;
    }
    position=[x,z];
    const angle=Math.atan2(-dx,-dz);
    const turn=Math.atan2(Math.sin(angle-actor.body.rotation.y),Math.cos(angle-actor.body.rotation.y));
    actor.body.rotation.y+=turn*Math.min(1,delta*12);
    return true;
  }
  function updateTargets(){
    const width=canvas.clientWidth,height=canvas.clientHeight;
    const topLimit=width<560?document.querySelector(".mission").getBoundingClientRect().bottom+52:202;
    for(const [index,item] of buttons.entries()){
      const [x,z]=item.point;
      projected.set(x,elevation(x,z)+.86,z).project(camera);
      const left=(projected.x+1)*width/2,top=(1-projected.y)*height/2;
      let displayX=Math.max(46,Math.min(width-46,left));
      if(phase==="stock"){
        const column=width/3;
        displayX=Math.max(index*column+43,Math.min((index+1)*column-43,left));
      }
      item.el.style.left=displayX+"px";
      item.el.style.top=Math.max(topLimit,Math.min(height-155,top))+"px";
    }
  }
  function resize(){
    const width=canvas.clientWidth,height=canvas.clientHeight;
    if(!width||!height)return;
    camera.aspect=width/height;
    camera.fov=width<560?55:47;
    renderer.setPixelRatio(Math.min(devicePixelRatio||1,1.4,Math.sqrt(850000/(width*height))));
    camera.updateProjectionMatrix();
    renderer.setSize(width,height,false);
  }
  new ResizeObserver(resize).observe(canvas);
  resize();
  function animate(time){
    if(time-lastTime<25)return;
    lastTime=time;
    const delta=previous?Math.min(.10,(time-previous)/1000):.016;
    previous=time;
    const moving=!log.open&&tickMovement(delta);
    const elapsed=time/1000;
    const [x,z]=position;
    const deck=z<.75&&z>-15.2&&Math.abs(x)<bridgeHalf&&bridgeOpen;
    const ground=deck?.23:elevation(x,z);
    motion=T.MathUtils.lerp(motion,moving?1:0,delta*10);
    if(moving)walkClock+=delta*12;
    actor.body.position.set(x,ground+(reduced?0:Math.abs(Math.sin(walkClock))*.075*motion),z);
    actor.shadow.position.set(x,ground+.015,z);
    actor.legs.forEach((leg,i)=>{leg.rotation.x=reduced?0:(i?1:-1)*Math.sin(walkClock)*.69*motion;});
    actor.arms.forEach((arm,i)=>{arm.rotation.x=carrying?.93:(reduced?0:(i?-1:1)*Math.sin(walkClock)*.35*motion);});
    actor.tail.rotation.y=reduced?0:Math.sin(elapsed*3)*(.13+motion*.21);
    actor.head.rotation.x=reduced?0:Math.sin(elapsed*2.4)*.035;
    view.wildlife.head.rotation.y=reduced?0:Math.sin(elapsed*1.5)*.23;
    view.water.time.value=reduced?0:elapsed;
    view.crossing.moving.rotation.x=T.MathUtils.lerp(view.crossing.moving.rotation.x,bridgeOpen?0:1.1,reduced?1:delta*3.8);
    const mobile=canvas.clientWidth<560;
    cameraPosition.set(x+(mobile?3.2:5),ground+(mobile?8.1:8.8),z+(mobile?10.5:11.4));
    cameraTarget.set(x-(mobile?.75:0),.55,z-(mobile?4.3:5.5));
    camera.position.lerp(cameraPosition,reduced||!camera.userData.initialized?1:Math.min(1,delta*5));
    camera.userData.initialized=true;
    camera.lookAt(cameraTarget);
    audio?.update(z,moving,deck);
    if(capturing){
      const [ax,az]=animalSite;
      actor.body.visible=actor.shadow.visible=false;
      const journalCamera=new T.PerspectiveCamera(33,1.6,.1,140);
      journalCamera.position.set(ax-3.4,2.7,az+7);
      journalCamera.lookAt(ax,1,az);
      renderer.setPixelRatio(1);
      renderer.setSize(480,300,false);
      renderer.render(scene,journalCamera);
      saveFrame();
      actor.body.visible=actor.shadow.visible=true;
      resize();
    }
    renderer.render(scene,camera);
    updateTargets();
  }
  canvas.addEventListener("pointerup",event=>{
    const rect=canvas.getBoundingClientRect();
    ray.setFromCamera({x:(event.clientX-rect.left)/rect.width*2-1,y:1-(event.clientY-rect.top)/rect.height*2},camera);
    if(ray.ray.intersectPlane(groundPlane,hit)){
      route=[[T.MathUtils.clamp(hit.x,-13,13),T.MathUtils.clamp(hit.z,-29,22)]];
      cue=null;
    }
  });
  window.addEventListener("keydown",event=>{
    if(log.open||event.ctrlKey||event.metaKey||event.altKey)return;
    const dir=keyDirections[event.code];
    if(dir){event.preventDefault();keys.add(dir);}
    if(event.code==="Space"&&event.target.tagName!=="BUTTON"){
      event.preventDefault();
      if(!event.repeat)handleAction();
    }
  });
  window.addEventListener("keyup",event=>{if(keyDirections[event.code])keys.delete(keyDirections[event.code]);});
  window.addEventListener("blur",()=>{keys.clear();pressed.clear();});
  for(const el of document.querySelectorAll("[data-dir]")){
    el.onpointerdown=event=>{
      directionStart.set(el,performance.now());el.setPointerCapture(event.pointerId);pressed.set(event.pointerId,el.dataset.dir);
    };
    el.onlostpointercapture=()=>{for(const [id,dir] of pressed)if(dir===el.dataset.dir)pressed.delete(id);};
    el.onclick=event=>{
      if(event.detail!==0&&performance.now()-(directionStart.get(el)||0)>130)return;
      const [dx,dz]=directions[el.dataset.dir];
      route=[[position[0]+dx*.9,position[1]+dz*.9]];
      cue=null;
    };
  }
  $("journal").addEventListener("click",()=>{keys.clear();pressed.clear();route=null;cue=null;});
  action.onclick=handleAction;
  hint.onclick=()=>{
    const text={trace:"اتبع العلامة الذهبية. يمكنك لمسها ليتجه الراكون إليها.",stock:"معنا ٤ خانات والهدف ٦. اختر القطعة التي تغطي خانتين.",carry:"وصّل القطعة إلى قفل الجسر. يجب أن يصل عدد الخانات المركبة إلى ٦.",
      cross:"اتبع علامة التصوير. سيعبر الراكون فوق الجسر ويمشي نحو السهل.",done:"ستجد الصورة والنتيجة في دفتر الرحلة."};
    message(text[phase]);
  };
  $("restart").onclick=()=>{
    photo=null;save();showPhoto();log.close();
    start();save();
  };
  $("sound").onclick=async()=>{
    const control=$("sound");
    control.disabled=true;
    try {
      audio??=createRiverAudio();
      await audio.enable(!soundEnabled);
      soundEnabled=!soundEnabled;
      control.setAttribute("aria-pressed",String(soundEnabled));
      control.textContent=soundEnabled?"اكتم البيئة":"صوت البيئة";
    }catch{
      message("الصوت غير متاح في هذا المتصفح. يمكنك متابعة الرحلة.");
    }finally{control.disabled=false;}
  };
  canvas.addEventListener("webglcontextlost",()=>{
    renderer.setAnimationLoop(null);
    action.disabled=hint.disabled=true;
    message("توقف العرض ثلاثي الأبعاد. حدّث الصفحة، أو عُد إلى مغامرات ورّاق.");
  });
  start(true);
  action.disabled=hint.disabled=$("sound").disabled=false;
  renderer.setAnimationLoop(animate);
}
init().catch(()=>{
  objective.textContent="تعذّر تحميل الوادي. تحتاج اللعبة إلى WebGL واتصال لتحميل العرض ثلاثي الأبعاد. يمكنك العودة إلى مغامرات ورّاق.";
});
