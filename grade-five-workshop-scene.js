import * as THREE from "three";
import {panelColors} from "./grade-five-workshop-data.js";

const unit=.96;
const clamp=THREE.MathUtils.clamp;
const numbers=new Intl.NumberFormat("ar",{numberingSystem:"arab"});
const mat=(color,extra={})=>new THREE.MeshStandardMaterial({color,roughness:.86,...extra});

function solid(parent,geometry,material,x,y,z){
  const object=new THREE.Mesh(geometry,material);
  object.position.set(x,y,z);
  parent.add(object);
  return object;
}

function makeArtisan(root){
  const figure=new THREE.Group();
  figure.position.set(1.40,.02,-.60);
  figure.scale.setScalar(1.17);
  figure.rotation.y=-.38;
  root.add(figure);
  const wool=mat(0xd8af8e), inner=mat(0xe3958e), cream=mat(0xf8dec4), ink=mat(0x433038);
  const apron=mat(0x387b70), brass=mat(0xf1bd68);
  function ellipsoid(parent,material,x,y,z,a,b,c){
    const object=solid(parent,new THREE.SphereGeometry(1,12,8),material,x,y,z);
    object.scale.set(a,b,c);
    return object;
  }
  ellipsoid(figure,wool,0,.68,0,.32,.44,.25);
  ellipsoid(figure,apron,0,.68,.13,.28,.32,.18);
  const pocket=solid(figure,new THREE.BoxGeometry(.24,.137,.037),brass,0,.66,.299);
  pocket.rotation.z=.06;
  const head=new THREE.Group();
  head.position.y=1.12;
  figure.add(head);
  ellipsoid(head,wool,0,0,0,.345,.29,.265);
  for(const side of [-1,1]){
    ellipsoid(head,wool,side*.16,.37,-.045,.105,.28,.091).rotation.z=-side*.21;
    ellipsoid(head,inner,side*.16,.38,.007,.066,.20,.049).rotation.z=-side*.21;
    ellipsoid(head,ink,side*.13,.045,.224,.044,.058,.024);
    ellipsoid(head,cream,side*.085,-.088,.221,.10,.073,.075);
    ellipsoid(figure,wool,side*.16,.16,.04,.116,.11,.158);
  }
  ellipsoid(head,inner,0,-.061,.293,.049,.035,.026);
  const mouth=ellipsoid(head,ink,0,-.135,.259,.042,.014,.032);
  const arm=new THREE.Group();
  arm.position.set(-.27,.93,.045);
  figure.add(arm);
  ellipsoid(arm,wool,-.04,-.15,.014,.090,.191,.083);
  ellipsoid(figure,wool,.31,.755,.06,.093,.165,.083).rotation.z=.26;
  return {
    animate(time,speaking,pointing,reduced){
      const rhythm=reduced?0:Math.sin(time*12);
      mouth.scale.y=speaking?.040+.021*Math.abs(rhythm):.012;
      head.rotation.z=pointing?.12:0;
      head.rotation.x=speaking?rhythm*.062:0;
      arm.rotation.z=pointing?1.0+rhythm*.06:.19;
    }
  };
}

function numberMark(mesh,id){
  const board=document.createElement("canvas");
  board.width=96;board.height=96;
  const pen=board.getContext("2d");
  pen.fillStyle="#fff2d8";
  pen.beginPath();pen.arc(48,48,29,0,Math.PI*2);pen.fill();
  pen.fillStyle="#463338";
  pen.font="bold 50px Tahoma, sans-serif";
  pen.textAlign="center";pen.textBaseline="middle";
  pen.fillText(numbers.format(id+1),48,52);
  const map=new THREE.CanvasTexture(board);
  map.colorSpace=THREE.SRGBColorSpace;
  const glyph=solid(mesh,new THREE.PlaneGeometry(.54,.54),new THREE.MeshBasicMaterial({map,transparent:true,depthWrite:false,side:THREE.DoubleSide}),0,.026,0);
  glyph.rotation.x=-Math.PI/2;
  const reverse=solid(mesh,new THREE.PlaneGeometry(.54,.54),new THREE.MeshBasicMaterial({map,transparent:true,depthWrite:false}),0,-.026,0);
  reverse.rotation.x=Math.PI/2;
  reverse.rotation.z=Math.PI;
}

export function createWorkshopScene(scene){
  const room=new THREE.Group();
  room.visible=false;
  scene.add(room);
  const board=mat(0xd6a774),rim=mat(0x43837a),wood=mat(0x88604d),gold=mat(0xe4af58);
  const tray=new THREE.Group();
  tray.position.set(-2.55,.05,.20);
  room.add(tray);
  const piece=(parent,material,x,y,z,w,h,d)=>solid(parent,new THREE.BoxGeometry(w,h,d),material,x,y,z);
  piece(tray,wood,0,.07,0,4.98,.18,3.74);
  piece(tray,rim,0,.17,0,4.91,.11,3.66);
  piece(tray,board,0,.23,0,4.77,.045,3.51);
  for(const x of [-2.28,2.31]){
    for(const z of [-1.62,1.62])solid(tray,new THREE.CylinderGeometry(.055,.055,.035,8),gold,x,.26,z);
  }
  const shelf=piece(room,wood,-1.46,.12,-2.43,4.28,.16,.49);
  shelf.rotation.y=.015;
  for(const [x,w,h,color] of [[-3.31,.29,.26,0xd49165],[-2.91,.41,.44,0x9b76a4],[-2.35,.37,.34,0xe8b25e],[-1.8,.42,.48,0x58918a],[-.99,.40,.29,0xbe776d]]){
    piece(room,mat(color),x,.20+h/2,-2.46,w,h,.33);
    piece(room,gold,x,.20+h/2,-2.276,.09,.026,.013);
  }
  piece(room,rim,.57,.08,.78,.78,.12,.76);
  const sample=solid(room,new THREE.IcosahedronGeometry(.245,0),gold,.57,.34,.78);
  sample.rotation.y=.28;
  const artisan=makeArtisan(room);
  const reward=new THREE.Group();
  reward.position.set(-2.67,.35,.26);
  reward.visible=false;
  room.add(reward);
  const chest=mat(0xc47450),band=mat(0xf1c477),lining=mat(0x694048);
  for(const x of [-.48,.48])piece(reward,chest,x,.43,0,.064,.85,1.01);
  for(const z of [-.48,.48])piece(reward,chest,0,.43,z,1.00,.85,.064);
  piece(reward,lining,0,.015,0,1.0,.12,1.0);
  const lid=new THREE.Group();
  lid.position.set(0,.86,-.5);
  reward.add(lid);
  piece(lid,chest,0,.015,.5,1.04,.12,1.05);
  for(const x of [-.32,.32])piece(lid,band,x,.08,.5,.12,.046,1.06);
  const token=solid(reward,new THREE.CylinderGeometry(.29,.29,.096,8),band,0,.48,0);
  const badge=solid(token,new THREE.BoxGeometry(.24,.035,.24),mat(0x734a77),0,.071,0);
  badge.rotation.y=Math.PI/4;
  const net=new THREE.Group();
  net.position.y=.27;
  tray.add(net);
  const ray=new THREE.Raycaster();
  const cursor=new THREE.Vector2();
  let faces, parts=[], targets=[], angles=[], warnings=new Set(), litSpeaker="", cueSpeaker="", cueAt=0, openedAt=0, won=false, slideAt=0, puzzleHidden=false;

  function setPlan(plan){
    if(faces!==plan){
      const textures=new Set();
      net.traverse(asset=>{
        if(asset.isMesh){
          asset.geometry.dispose();
          if(asset.material.map)textures.add(asset.material.map);
          asset.material.dispose();
        }
      });
      textures.forEach(texture=>texture.dispose());
      net.clear();
      faces=plan;
      const minX=Math.min(...plan.map(face=>face.cell[0])), maxX=Math.max(...plan.map(face=>face.cell[0]));
      const minZ=Math.min(...plan.map(face=>face.cell[1])), maxZ=Math.max(...plan.map(face=>face.cell[1]));
      net.position.x=-(minX+maxX)/2*unit;
      net.position.z=-(minZ+maxZ)/2*unit;
      parts=[];
      const surfaces=[];
      for(const {id,parent,dx,dz} of plan){
        let anchor=net;
        let hinge;
        if(parent!==null){
          hinge=new THREE.Group();
          hinge.position.set(dx*unit/2,0,dz*unit/2);
          surfaces[parent].add(hinge);
          anchor=new THREE.Group();
          anchor.position.copy(hinge.position);
          hinge.add(anchor);
        }
        surfaces.push(anchor);
        const tile=piece(anchor,mat(panelColors[id]),0,0,0,unit-.036,.044,unit-.036);
        numberMark(tile,id);
        parts.push({tile,hinge,dx,dz});
      }
    }
    won=false;warnings=new Set();puzzleHidden=false;
    net.visible=true;reward.visible=false;
    angles=plan.map(()=>0);targets=plan.map(()=>0);
    slideAt=performance.now();
  }
  function mark(conflicts,complete){
    warnings=conflicts;
    if(complete&&!won)openedAt=performance.now();
    won=complete;
    for(const [i,{tile}] of parts.entries()){
      tile.material.emissive.setHex(warnings.has(i)?0xb63337:0x000000);
      tile.material.emissiveIntensity=warnings.has(i)?.66:0;
    }
  }
  return {
    room,setPlan,mark,
    hidePuzzle(){puzzleHidden=true;net.visible=false;},
    turn(id,progress){targets[id]=progress;},
    say(speaker){cueSpeaker=speaker;cueAt=performance.now();},
    speak(speaker){litSpeaker=speaker;},
    pick(clientX,clientY,canvas,camera){
      if(!room.visible||won)return null;
      const bounds=canvas.getBoundingClientRect();
      cursor.set((clientX-bounds.left)/bounds.width*2-1,1-(clientY-bounds.top)/bounds.height*2);
      ray.setFromCamera(cursor,camera);
      const tiles=parts.map(part=>part.tile);
      const hit=ray.intersectObjects(tiles,false)[0];
      const id=hit?tiles.indexOf(hit.object):0;
      return id>0?id:null;
    },
    animate(now,reduced){
      if(!room.visible)return;
      const emerge=reduced?1:THREE.MathUtils.smoothstep(now-slideAt,0,460);
      tray.position.y=.035+.075*emerge;
      shelf.position.y=.12+.09*emerge;
      const speaking=litSpeaker==="artisan";
      artisan.animate(now/1000,speaking,cueSpeaker==="artisan"&&(speaking||now-cueAt<1200),reduced);
      let gap=false;
      const last=[...warnings].at(-1);
      for(const [i,{hinge,dx,dz}] of parts.entries()){
        if(!hinge)continue;
        const target=warnings.size&&i===last?Math.min(targets[i],.83):targets[i];
        angles[i]+= (target-angles[i])*(reduced?1:.34);
        gap||=Math.abs(target-angles[i])>.03;
        hinge.rotation.z=dx*angles[i]*Math.PI/2;
        hinge.rotation.x=-dz*angles[i]*Math.PI/2;
      }
      reward.visible=won&&!gap;
      net.visible=!puzzleHidden&&!reward.visible;
      if(reward.visible){
        const reveal=reduced?1:THREE.MathUtils.smoothstep(now-openedAt,140,760);
        lid.rotation.x=-reveal*1.32;
        token.position.y=.43+.61*reveal;
        token.rotation.z=.18;
        token.rotation.y=reduced?.5:now*.001;
      }
    },
  };
}
