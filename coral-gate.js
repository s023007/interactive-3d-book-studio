const stage = document.querySelector("#stage");
const fish = document.querySelector("#fish");
const canvas = document.querySelector("#puppet");
const gate = document.querySelector("#gate");
const status = document.querySelector("#status");
const shellContainer = document.querySelector("#shells");
const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
const quarterLocations = [[.25,.32],[.55,.18],[.36,.64],[.72,.70]];
const gateLocation = [.81,.28];
const start = [.18,.77];
const targetQuarters = 3;
const digits = "٠١٢٣٤";
let position, destination, quarters, won, frame, previous, facing, model;

function announce(message) {
  if (status.textContent !== message) status.textContent = message;
}
function updateFraction() {
  document.querySelector("#count").textContent = digits[quarters];
  document.querySelector("#fraction").ariaLabel = digits[quarters] + " من أربعة";
  document.querySelectorAll("#pieces i").forEach((piece,index) => piece.classList.toggle("filled",index<quarters));
}
function reset() {
  cancelAnimationFrame(frame);
  frame = null;
  previous = null;
  position = [...start];
  destination = null;
  quarters = 0;
  won = false;
  facing = 1;
  gate.setAttribute("aria-pressed","false");
  shellContainer.replaceChildren(...quarterLocations.map((spot,index) => {
    const shell = document.createElement("button");
    shell.type = "button";
    shell.className = "shell";
    shell.style.left = spot[0]*100+"%";
    shell.style.top = spot[1]*100+"%";
    shell.ariaLabel = "السباحة إلى جزء الصدفة " + digits[index+1];
    shell.onclick = () => swim(...spot);
    return shell;
  }));
  updateFraction();
  paint();
  announce("المس أي مكان ليسبح فُقّاع إليه، أو استخدم مفاتيح الأسهم.");
}
function paint() {
  fish.style.left = position[0]*100+"%";
  fish.style.top = position[1]*100+"%";
  fish.style.scale = facing+" 1";
  model?.draw(position,facing,won);
}
function arrived(x,y,radius) {
  return Math.hypot(position[0]-x,position[1]-y)<radius;
}
function interact() {
  quarterLocations.forEach(([x,y],index) => {
    const shell = shellContainer.children[index];
    if (shell.hidden || !arrived(x,y,.062)) return;
    if (quarters===targetQuarters) {
      announce("مع فُقّاع ثلاثة أرباع. اترك الربع الرابع واسبح إلى البوابة.");
      return;
    }
    shell.hidden = true;
    quarters++;
    updateFraction();
    announce(quarters===targetQuarters ? "جمعت ثلاثة أرباع من الصدفة! اسبح إلى البوابة." : "جمعت "+digits[quarters]+" من أصل أربعة أجزاء متساوية.");
  });
  if (!arrived(...gateLocation,.075)) return;
  if (quarters<targetQuarters) {
    announce("البوابة تحتاج ثلاثة أرباع. بقي لجمعها "+digits[targetQuarters-quarters]+" من الأجزاء.");
    return;
  }
  gate.setAttribute("aria-pressed","true");
  won = true;
  announce("فتحت البوابة! ثلاثة أجزاء من أصل أربعة تساوي ثلاثة أرباع. أحسنت!");
}
function animate(now) {
  frame = null;
  if (!destination || won) return;
  const elapsed = previous===null ? 16 : Math.min(45,now-previous);
  previous = now;
  const dx = destination[0]-position[0], dy = destination[1]-position[1];
  const distance = Math.hypot(dx,dy);
  if (Math.abs(dx)>.015) facing = Math.sign(dx);
  const step = Math.min(1,elapsed*.00125/Math.max(distance,.001));
  position[0] += dx*step;
  position[1] += dy*step;
  interact();
  paint();
  if (step<1 && !won) frame=requestAnimationFrame(animate);
  else previous=null;
}
function swim(x,y) {
  if (won) return;
  destination=[Math.min(.91,Math.max(.09,x)),Math.min(.90,Math.max(.10,y))];
  if (reduced) {
    facing = Math.sign(destination[0]-position[0]) || facing;
    position = destination;
    interact();
    paint();
  } else if (!frame) frame=requestAnimationFrame(animate);
}
const arrows = {ArrowLeft:[-1,0],ArrowRight:[1,0],ArrowUp:[0,-1],ArrowDown:[0,1]};
document.addEventListener("keydown", event => {
  const delta = arrows[event.key];
  if (!delta || event.altKey || event.metaKey || event.ctrlKey) return;
  event.preventDefault();
  swim(position[0]+delta[0]*.14,position[1]+delta[1]*.14);
});
stage.addEventListener("click",event => {
  if (event.target.closest("button")) return;
  const bounds=stage.getBoundingClientRect();
  swim((event.clientX-bounds.left)/bounds.width,(event.clientY-bounds.top)/bounds.height);
});
gate.onclick=()=>swim(...gateLocation);
document.querySelector("#reset").onclick=reset;
reset();

if (window.WebGL2RenderingContext) import("three").then(THREE => {
  const renderer = new THREE.WebGLRenderer({canvas,alpha:true,antialias:true,powerPreference:"low-power"});
  const scene = new THREE.Scene();
  const camera = new THREE.OrthographicCamera(-1,1,1,-1,.1,200);
  camera.position.z = 15;
  scene.add(new THREE.HemisphereLight(0xfffae4,0x416e7e,2));
  const key = new THREE.DirectionalLight(0xffffff,2.5);
  key.position.set(3,5,7);
  scene.add(key);
  const swimmer = new THREE.Group();
  scene.add(swimmer);
  function ball(color,x,y,z,w,h,d) {
    const mesh = new THREE.Mesh(new THREE.SphereGeometry(1,20,16),new THREE.MeshStandardMaterial({color}));
    mesh.position.set(x,y,z);
    mesh.scale.set(w,h,d);
    swimmer.add(mesh);
    return mesh;
  }
  ball(0xef8862,0,0,0,28,23,22);
  ball(0xffd79d,3,-10,10,19,10,13);
  const tail = ball(0x29ba9d,-29,-3,-1,12,12,4);
  tail.rotation.z = -.4;
  const fin = ball(0x29ba9d,-7,-8,21,11,6,4);
  ball(0xfff5db,13,6,17,9,10,5);
  ball(0x16263e,16,7,21,5,6,2);
  ball(0xffffff,17,9,23,1.8,1.8,1);
  ball(0x9a4d46,23,-4,9,6,2.8,5);
  model = {draw([x,y],direction,opened) {
    const {width,height} = stage.getBoundingClientRect();
    swimmer.position.set((x-.5)*width,(.5-y)*height,0);
    swimmer.rotation.y = .22*direction;
    const size = opened ? 1.23 : 1;
    swimmer.scale.set(size*direction,size,size);
    const beat = reduced ? 0 : Math.sin(performance.now()/55);
    tail.rotation.y = beat*.5;
    fin.rotation.z = beat*.35;
    renderer.render(scene,camera);
  }};
  const resize = () => {
    const {width,height} = stage.getBoundingClientRect();
    camera.left=-width/2; camera.right=width/2; camera.top=height/2; camera.bottom=-height/2;
    camera.position.z=80;
    camera.updateProjectionMatrix();
    renderer.setPixelRatio(Math.min(devicePixelRatio,1.3));
    renderer.setSize(width,height,false);
    paint();
  };
  canvas.addEventListener("webglcontextlost", () => {model=null;stage.classList.remove("has-model");observer.disconnect();});
  const observer = new ResizeObserver(resize);
  observer.observe(stage);
  resize();
  stage.classList.add("has-model");
}).catch(() => {});
