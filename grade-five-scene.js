import * as THREE from "three";
import { makeRaccoon } from "./river-world.js";
import { createPaperMap, createAtlasTerrain } from "./grade-five-map-scene.js";
import { drawGeometryDiagram, positionSlidingPiece } from "./grade-five-geometry-scene.js";

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
  const mouth=new THREE.Mesh(new THREE.SphereGeometry(1,12,8),surface(0x50343c));
  mouth.position.set(0,-.176,-.485);
  mouth.scale.set(.086,.015,.023);
  raccoon.head.add(mouth);
  raccoon.body.position.set(3.05,0,.97);
  raccoon.body.scale.setScalar(1.32);
  raccoon.body.rotation.y=Math.PI-.22;
  // The reused ground shadow belongs to the paper surface in this scene.
  raccoon.shadow.position.set(3.05,.012,.97);
  raccoon.shadow.scale.setScalar(1.3);

  const paperMap=createPaperMap(scene);
  const atlas=createAtlasTerrain(scene);
  const home=new THREE.Vector3(3.05,0,.97);
  const mapDepth=1.55;
  const mapHome=new THREE.Vector3(1.37,0,2.66*mapDepth);
  paperMap.map.scale.z=mapDepth;
  const bookCamera=new THREE.Vector3(4.6,13.9,14);
  const mapCamera=new THREE.Vector3(.12,23,10.6);
  const atlasCamera=new THREE.Vector3(2.7,17,12.5);
  const projection=new THREE.Vector3();
  let mapShowing=false, atlasShowing=false, doorLabels=[], atlasLabels=[], journey=null, stops=[];
  let pair=-1;
  function showMap(value,labels=[],theme){
    atlasShowing=false;
    atlas.world.visible=false;
    mapShowing=value;
    doorLabels=labels;
    journey=null;
    paperMap.map.visible=value;
    if(value)stops=paperMap.present(theme);
    book.scale.z=value?mapDepth:1;
    group.visible=!value;
    paperMap.doors.forEach(door=>{door.rotation.y=0;});
    raccoon.body.position.copy(value?mapHome:home);
    raccoon.body.rotation.y=Math.PI-.22;
    raccoon.legs.forEach(leg=>{leg.rotation.x=0;});
    raccoon.arms[1].rotation.x=0;
    raccoon.body.scale.setScalar(value?1.20:1.32);
    if(value&&!last){camera.position.copy(mapCamera);camera.lookAt(0,0,.12);alignDoors();}
  }
  function showAtlas(view,unit,labels){
    showMap(false);
    atlasShowing=true;
    atlas.present(view,unit);
    const indexStops=[[2.75,1.6],[2.65,-1.20],[-2.45,1.5],[-2.1,-1.36]];
    const columns=labels.length>9?4:3;
    atlasLabels=labels.map((label,i)=>{
      const grid=[3.9-(i%columns)*7.65/(columns-1),-1.63+Math.floor(i/columns)*1.68];
      const [x,z]=view==="index"?indexStops[i]:grid;
      return {label,x,z};
    });
    labels.forEach(label=>{label.hidden=true;});
    book.scale.z=1.48;
    group.visible=false;
    raccoon.body.position.set(2.65,0,3.23);
    raccoon.body.rotation.y=Math.PI-.17;
    raccoon.body.scale.setScalar(1.09);
    raccoon.shadow.position.set(2.65,.012,3.23);
    if(!last){camera.position.copy(atlasCamera);camera.lookAt(0,0,.12);}
  }
  function visitDoor(index,onComplete){
    if(reduced){onComplete();return;}
    const stop=stops[index];
    const [x,z]=paperMap.positions[stop];
    const from=raccoon.body.position;
    const corridor=x>0?1.72:-1.72;
    const approach=z<0?-.41:2.30;
    const path=new THREE.CurvePath();
    const waypoints=[[from.x,from.z],[corridor,2.30*mapDepth],[corridor,approach*mapDepth],[x,approach*mapDepth],[x,(z+.55)*mapDepth]];
    for(let i=1;i<waypoints.length;i++){
      const a=new THREE.Vector2(...waypoints[i-1]),b=new THREE.Vector2(...waypoints[i]);
      if(a.distanceToSquared(b)>.001)path.add(new THREE.LineCurve(a,b));
    }
    journey={index:stop,onComplete,started:performance.now(),path};
  }
  function moveMap(now){
    if(journey){
      const {index,started,onComplete,path}=journey;
      const seconds=(now-started)/1000;
      const step=THREE.MathUtils.smoothstep(seconds,0,.82);
      const point=path.getPoint(step);
      const ahead=path.getPoint(Math.min(1,step+.012));
      raccoon.body.position.x=point.x;
      raccoon.body.position.z=point.y;
      if(step<.995)raccoon.body.rotation.y=Math.atan2(point.x-ahead.x,point.y-ahead.y);
      const pace=seconds*27;
      raccoon.legs.forEach((leg,i)=>{leg.rotation.x=Math.sin(pace)*(i?1:-1)*.57*(1-step);});
      raccoon.body.position.y=step<1?Math.abs(Math.sin(pace))*.080*(1-step):0;
      raccoon.arms[1].rotation.x=-THREE.MathUtils.smoothstep(seconds,.72,.92)*.95;
      paperMap.doors[index].rotation.y=-THREE.MathUtils.smoothstep(seconds,.77,1.14)*1.72;
      if(seconds>=1.23){
        journey=null;
        onComplete();
      }
    }
    raccoon.shadow.position.set(raccoon.body.position.x,.012,raccoon.body.position.z);
  }
  function alignDoors(){
    camera.updateMatrixWorld();
    const width=canvas.clientWidth,height=canvas.clientHeight;
    stops.forEach((stop,i)=>{
      const label=doorLabels[i];
      if(!label)return;
      const [x,z]=paperMap.positions[stop];
      projection.set(x,.13,(z+.78)*mapDepth).project(camera);
      label.style.setProperty("--door-x",((projection.x+1)*width/2)+"px");
      label.style.setProperty("--door-y",((1-projection.y)*height/2)+"px");
    });
  }
  function alignAtlas(){
    camera.updateMatrixWorld();
    const width=canvas.clientWidth,height=canvas.clientHeight;
    for(const {label,x,z} of atlasLabels){
      projection.set(x,.38,z*1.48).project(camera);
      label.style.setProperty("--pin-x",((projection.x+1)*width/2)+"px");
      label.style.setProperty("--pin-y",((1-projection.y)*height/2)+"px");
      label.hidden=false;
    }
  }

  const group=new THREE.Group();scene.add(group);
  const reduced=matchMedia("(prefers-reduced-motion: reduce)").matches;
  const hinges=[];
  let current=null, desired=0, fold=0, settle=performance.now(), talking=false, foldStart=0;
  let mode="net", cuboid, cuboidPage;
  let currentLab, labStep, transition, celebrationStart=-Infinity;
  function clear(){
    group.traverse(obj=>{
      if(obj.isMesh){
        obj.geometry.dispose();
        for(const material of [obj.material].flat()){
          material.map?.dispose();
          material.dispose();
        }
      }
    });
    group.clear();hinges.length=0;cuboid=null;pair=-1;transition=null;
  }
  function setDiagram(diagram,lab,step){
    if(mode==="diagram"&&currentLab===lab&&labStep===step)return;
    const animate=mode==="diagram"&&currentLab===lab&&!labStep&&diagram.displacement&&!reduced;
    clear();
    mode="diagram";current=null;currentLab=lab;labStep=step;
    const piece=drawGeometryDiagram(group,diagram);
    if(animate){
      transition={piece,delta:diagram.displacement,started:performance.now()};
      positionSlidingPiece(piece,transition.delta,1);
    }
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
  function setCuboid(page){
    if(mode==="cuboid"&&cuboidPage===page)return;
    clear();mode="cuboid";cuboidPage=page;current=null;desired=fold=0;
    group.position.set(page===4?-1.44:-2.45,1.0,.08);
    const boxSize=page===5?[2.4,1.2,1.8]:[2.35,1.34,1.46];
    cuboid=new THREE.Mesh(new THREE.BoxGeometry(...boxSize),
      [0xce8bbd,0xce8bbd,0xf0b472,0xf0b472,0x9dbfc7,0x9dbfc7].map(color=>surface(color)));
    group.add(cuboid);
    if(page===4){
      box(group,[1.14,1.14,1.14],surface(0xcc9ec8),-2.10,-.33,.05);
    }
  }
  function inspectPair(index){
    pair=index;
    if(cuboid){
      cuboid.material.forEach((material,i)=>{
        material.emissive.setHex(Math.floor(i/2)===index?0x57362a:0);
        material.emissiveIntensity=.65;
        material.opacity=index<0||Math.floor(i/2)===index?1:.28;
        material.transparent=material.opacity<1;
      });
    }
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
      if(cuboid){
        cuboid.rotation.y=pair===0?Math.PI/3:pair===1?.36:pair===2?-.31:reduced?.38:t*.50+foldStart;
        cuboid.rotation.x=pair===1?.37:0;
      }
      if(transition){
        const fraction=1-THREE.MathUtils.smoothstep(now-transition.started,0,540);
        positionSlidingPiece(transition.piece,transition.delta,fraction);
        if(!fraction)transition=null;
      }
      const cue=reduced?0:Math.max(0,1-(now-settle)/800);
      const cheer=reduced?0:Math.max(0,1-(now-celebrationStart)/960);
      const viewpoint=atlasShowing?atlasCamera:mapShowing?mapCamera:bookCamera;
      camera.position.lerp(viewpoint,reduced?1:.17);
      const zoom=atlasShowing?Math.min(.93,(camera.top-camera.bottom)/8.5):1;
      if(camera.zoom!==zoom){camera.zoom=zoom;camera.updateProjectionMatrix();}
      camera.lookAt(0,0,.12);
      if(mapShowing){
        moveMap(now);
        alignDoors();
      }else if(atlasShowing){
        alignAtlas();
      }else{
        raccoon.body.position.x=3.05+(cue?Math.sin(cue*Math.PI)*.40:0);
        raccoon.body.position.y=Math.max(cue*.24,cheer*.74)*Math.sin(Math.max(cue,cheer)*Math.PI);
        raccoon.arms[1].rotation.x=-cheer*1.9;
        raccoon.shadow.position.set(raccoon.body.position.x,.012,raccoon.body.position.z);
      }
      raccoon.head.rotation.x=talking&&!reduced?Math.sin(t*10)*.08:0;
      mouth.scale.y=talking?(reduced?.037:.035+.028*Math.abs(Math.sin(t*12))):.014;
      raccoon.arms[0].rotation.x=-Math.max(cue*1.2,cheer*1.9)+(talking&&!reduced?-.27+Math.sin(t*5)*.18:0);
      renderer.render(scene,camera);
      if(!canvas.hasAttribute("data-rendered"))canvas.setAttribute("data-rendered","");
    }
  });
  return {
    setNet,setCuboid,setDiagram,showMap,showAtlas,visitDoor,inspectPair,
    celebrate(){celebrationStart=performance.now();},
    foldPart(amount){desired=amount;settle=performance.now();},
    fold(next){desired=next?1:0;settle=performance.now();foldStart=next?.8:0;},
    speak(value){talking=value;},
  };
}
