import * as THREE from "three";
import { makeRaccoon } from "./river-world.js";
import { createPaperMap } from "./grade-five-map-scene.js";

const side = 1.03;
const palette = [0xcd81bd,0xe8a16f,0x84bfc0,0xf4c47c,0xa28eda,0xe29a9c];
const surface = (color,extra={})=>new THREE.MeshStandardMaterial({color,roughness:.76,...extra});
function box(parent,size,material,x,y,z){
  const part=new THREE.Mesh(new THREE.BoxGeometry(...size),material);
  part.position.set(x,y,z);parent.add(part);return part;
}
function lineTexture(){
  const textureCanvas=document.createElement("canvas");
  textureCanvas.width=512;textureCanvas.height=512;
  const ctx=textureCanvas.getContext("2d");
  ctx.fillStyle="#fff0d8";ctx.fillRect(0,0,512,512);
  ctx.strokeStyle="#dabba774";
  for(let y=57;y<484;y+=27){
    ctx.beginPath();ctx.moveTo(35,y);ctx.lineTo(477,y);ctx.stroke();
  }
  ctx.strokeStyle="#bb819b73";ctx.lineWidth=2;
  ctx.beginPath();ctx.moveTo(68,32);ctx.lineTo(68,486);ctx.stroke();
  ctx.strokeStyle="#ccac9285";ctx.strokeRect(24,23,464,465);
  const map=new THREE.CanvasTexture(textureCanvas);
  map.colorSpace=THREE.SRGBColorSpace;
  return map;
}

export function createBookScene(canvas){
  const renderer=new THREE.WebGLRenderer({canvas,alpha:true,antialias:true,powerPreference:"low-power"});
  const scene=new THREE.Scene();
  const camera=new THREE.OrthographicCamera(-6,6,3.6,-3.6,.1,120);
  camera.position.set(4.6,13.9,14);
  camera.lookAt(0,0,.12);
  scene.add(new THREE.HemisphereLight(0xffedcd,0x766685,2.4));
  const lamp=new THREE.DirectionalLight(0xffd2b6,2.2);
  lamp.position.set(-3,9,5);scene.add(lamp);
  const book=new THREE.Group();
  scene.add(book);
  const cover=surface(0x584071);
  const edges=surface(0xe1c2a5);
  const paper=surface(0xffffff,{map:lineTexture()});
  box(book,[11,.22,6.4],cover,0,-.32,.02);
  box(book,[.55,.17,6.5],surface(0xa67ab7),0,-.43,.02);
  for(const offset of [-2.64,2.64]){
    for(let layer=0;layer<4;layer++)box(book,[5.22,.038,6.08],edges,offset,-.186+layer*.043,0);
    const page=new THREE.Mesh(new THREE.PlaneGeometry(5.21,6.06),paper);
    page.rotation.x=-Math.PI/2;page.position.set(offset,-.015,0);book.add(page);
  }
  box(book,[.037,.008,5.90],surface(0xc9a68e),0,.006,0);
  box(book,[.27,.034,1.30],surface(0xd67483),2.22,-.057,3.01);
  const raccoon=makeRaccoon(scene);
  raccoon.body.position.set(3.05,0,.97);
  raccoon.body.scale.setScalar(1.32);
  raccoon.body.rotation.y=Math.PI-.22;
  // The reused ground shadow belongs to the paper surface in this scene.
  raccoon.shadow.position.set(3.05,.012,.97);
  raccoon.shadow.scale.setScalar(1.3);

  const paperMap=createPaperMap(scene);
  const home=new THREE.Vector3(3.05,0,.97);
  const mapHome=new THREE.Vector3(2.64,0,2.13);
  const bookCamera=new THREE.Vector3(4.6,13.9,14);
  const mapCamera=new THREE.Vector3(.40,14.8,14.6);
  const projection=new THREE.Vector3();
  let mapShowing=false, doorLabels=[], journey=null;
  function showMap(value,labels=[]){
    mapShowing=value;
    doorLabels=labels;
    journey=null;
    paperMap.map.visible=value;
    group.visible=!value;
    paperMap.doors.forEach(door=>{door.rotation.y=0;});
    raccoon.body.position.copy(value?mapHome:home);
    raccoon.body.rotation.y=Math.PI-.22;
    raccoon.legs.forEach(leg=>{leg.rotation.x=0;});
    raccoon.arms[1].rotation.x=0;
    raccoon.body.scale.setScalar(value?1.06:1.32);
    if(value&&!last){camera.position.copy(mapCamera);camera.lookAt(0,0,.12);alignDoors();}
  }
  function visitDoor(index,onComplete){
    if(reduced){onComplete();return;}
    const [x,z]=paperMap.positions[index];
    journey={index,onComplete,started:performance.now(),from:raccoon.body.position.clone(),x,z};
  }
  function moveMap(now){
    if(journey){
      const {index,from,x,z,started,onComplete}=journey;
      const seconds=(now-started)/1000;
      const step=THREE.MathUtils.clamp(seconds/.67,0,1);
      const across=THREE.MathUtils.smoothstep(step,0,.43);
      const along=THREE.MathUtils.smoothstep(step,.36,1);
      raccoon.body.position.x=THREE.MathUtils.lerp(from.x,x,across);
      raccoon.body.position.z=THREE.MathUtils.lerp(from.z,z+.70,along);
      const heading=step<.4?(x<from.x?Math.PI/2:-Math.PI/2):0;
      raccoon.body.rotation.y=heading;
      const pace=seconds*25;
      raccoon.legs.forEach((leg,i)=>{leg.rotation.x=Math.sin(pace)*(i?1:-1)*.57*(1-step);});
      raccoon.body.position.y=step<1?Math.abs(Math.sin(pace))*.095*(1-step):0;
      raccoon.arms[1].rotation.x=-THREE.MathUtils.smoothstep(seconds,.60,.82)*.95;
      paperMap.doors[index].rotation.y=-THREE.MathUtils.smoothstep(seconds,.64,1.01)*1.72;
      if(seconds>=1.10){
        journey=null;
        onComplete();
      }
    }
    raccoon.shadow.position.set(raccoon.body.position.x,.012,raccoon.body.position.z);
  }
  function alignDoors(){
    camera.updateMatrixWorld();
    const width=canvas.clientWidth,height=canvas.clientHeight;
    paperMap.positions.forEach(([x,z],i)=>{
      const label=doorLabels[i];
      if(!label)return;
      projection.set(x,.11,z+.82).project(camera);
      label.style.setProperty("--door-x",((projection.x+1)*width/2)+"px");
      label.style.setProperty("--door-y",((1-projection.y)*height/2)+"px");
    });
  }

  const group=new THREE.Group();scene.add(group);
  const reduced=matchMedia("(prefers-reduced-motion: reduce)").matches;
  const hinges=[];
  let current=null, desired=0, fold=0, settle=performance.now(), talking=false, foldStart=0;
  let mode="net", cuboid;
  function clear(){
    group.traverse(obj=>{
      if(obj.isMesh){
        obj.geometry.dispose();
        for(const material of [obj.material].flat())material.dispose();
      }
    });
    group.clear();hinges.length=0;cuboid=null;
  }
  function setNet(cells){
    if(current===cells&&mode==="net")return;
    clear();current=cells;mode="net";fold=desired=0;
    const flat=new Set(cells.map(([x,z])=>x+","+z));
    const visited=new Set();
    const [originX,originZ]=cells[0];
    group.position.set(-2.3-(Math.min(...cells.map(c=>c[0]))+Math.max(...cells.map(c=>c[0]))-2*originX)*side/2,.06,
      -.35-(Math.min(...cells.map(c=>c[1]))+Math.max(...cells.map(c=>c[1]))-2*originZ)*side/2);
    function addFace(parent,x,z,depth){
      visited.add(x+","+z);
      box(parent,[side-.026,.042,side-.026],surface(palette[visited.size-1]),0,0,0);
      for(const [dx,dz] of [[1,0],[-1,0],[0,1],[0,-1]]){
        const next=(x+dx)+","+(z+dz);
        if(!flat.has(next)||visited.has(next))continue;
        const hinge=new THREE.Group();hinge.position.set(dx*side/2,0,dz*side/2);parent.add(hinge);
        const leaf=new THREE.Group();leaf.position.set(dx*side/2,0,dz*side/2);hinge.add(leaf);
        hinges.push({hinge,dx,dz,depth});
        addFace(leaf,x+dx,z+dz,depth+1);
      }
    }
    addFace(group,originX,originZ,0);
  }
  function setCuboid(){
    clear();mode="cuboid";current=null;desired=fold=0;
    group.position.set(-2.45,1.0,.08);
    cuboid=new THREE.Mesh(new THREE.BoxGeometry(2.35,1.34,1.46),
      [0xce8bbd,0xce8bbd,0xf0b472,0xf0b472,0x9dbfc7,0x9dbfc7].map(color=>surface(color)));
    group.add(cuboid);
  }
  function resize(){
    const {width,height}=canvas.getBoundingClientRect();
    if(!width||!height)return;
    const aspect=width/height;
    const halfWidth=6.1*Math.max(1,aspect/2.6);
    camera.left=-halfWidth;camera.right=halfWidth;
    camera.top=halfWidth/aspect;camera.bottom=-halfWidth/aspect;
    camera.updateProjectionMatrix();
    renderer.setPixelRatio(Math.min(devicePixelRatio||1,1.5,Math.sqrt(600000/(width*height))));
    renderer.setSize(width,height,false);
  }
  new ResizeObserver(resize).observe(canvas);
  resize();
  let last=0;
  renderer.setAnimationLoop(now=>{
    if(now-last<32)return;
    last=now;
    if(!document.hidden){
      const t=now/1000;
      if(reduced)fold=desired;
      else fold+=(desired-fold)*.16;
      for(const {hinge,dx,dz,depth} of hinges){
        const delay=Math.min(.55,depth*.11);
        const amount=Math.max(0,Math.min(1,(fold-delay)/(1-delay)));
        const angle=(Math.PI/2)*THREE.MathUtils.smoothstep(amount,0,1);
        hinge.rotation.z=dx*angle;hinge.rotation.x=-dz*angle;
      }
      if(cuboid)cuboid.rotation.y=reduced?.38:t*.50+foldStart;
      const cue=reduced?0:Math.max(0,1-(now-settle)/800);
      camera.position.lerp(mapShowing?mapCamera:bookCamera,reduced?1:.17);
      camera.lookAt(0,0,.12);
      if(mapShowing){
        moveMap(now);
        alignDoors();
      }else{
        raccoon.body.position.x=3.05+(cue?Math.sin(cue*Math.PI)*.40:0);
        raccoon.body.position.y=cue*Math.sin(cue*Math.PI)*.24;
        raccoon.shadow.position.set(raccoon.body.position.x,.012,raccoon.body.position.z);
      }
      raccoon.head.rotation.x=talking&&!reduced?Math.sin(t*10)*.08:0;
      raccoon.arms[0].rotation.x=-cue*1.2 + (talking&&!reduced?-.27+Math.sin(t*5)*.18:0);
      renderer.render(scene,camera);
    }
  });
  return {
    setNet,setCuboid,showMap,visitDoor,
    fold(next){desired=next?1:0;settle=performance.now();foldStart=next?.8:0;},
    speak(value){talking=value;},
  };
}
