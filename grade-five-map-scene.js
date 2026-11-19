import * as THREE from "three";

const positions=[[3.45,-1.65],[0,-1.65],[-3.45,-1.65],[3.45,.94],[0,.94],[-3.45,.94]];
const palettes=[0xb46d93,0x568d83,0xd18447,0x6f8b56,0x8572b4,0x3e818a];
const paperY=.025;

export function createPaperMap(scene){
  const map=new THREE.Group();
  map.visible=false;
  scene.add(map);
  const materials=new Map();
  function piece(parent,shape,color,x,y,z){
    if(!materials.has(color))materials.set(color,new THREE.MeshStandardMaterial({color,roughness:.87}));
    const paper=new THREE.Mesh(shape,materials.get(color));
    paper.position.set(x,y,z);parent.add(paper);return paper;
  }
  function card(parent,color,x,y,z,w,h,d){
    return piece(parent,new THREE.BoxGeometry(w,h,d),color,x,y,z);
  }
  function terrain(color,x,z,width,depth,turn){
    const outline=new THREE.Shape();
    for(let i=0;i<=12;i++){
      const angle=i/12*Math.PI*2;
      const r=1+.07*Math.sin(angle*3+turn);
      const p=[Math.cos(angle)*width*r,Math.sin(angle)*depth*r];
      if(i===0)outline.moveTo(...p);
      else outline.lineTo(...p);
    }
    outline.closePath();
    const patch=piece(map,new THREE.ExtrudeGeometry(outline,{depth:.049,bevelEnabled:false}),color,x,paperY,z);
    patch.rotation.set(-Math.PI/2,0,turn);
  }
  terrain(0xbbcba1,-3.1,-.82,1.84,1.87,-.12);
  terrain(0xb5c6ac,3.16,-.98,1.66,1.8,.19);
  terrain(0xd4c1ad,-.82,-1.65,1.61,1.27,.16);
  terrain(0xd4d6a6,2.98,1.53,1.78,1.14,.14);
  terrain(0xe1c28f,-2.52,1.28,2.2,.84,-.07);
  const mountain=new THREE.ConeGeometry(1,1,5);
  for(const [x,z,height,radius,color] of [[-2.25,-2.39,1.72,.69,0x967c9e],[-1.61,-2.50,1.36,.56,0xb293a9],[-4.36,-2.22,1.27,.53,0x8c839f],[2.46,-2.38,1.58,.64,0xa186a8]]){
    const base=piece(map,mountain,color,x,paperY+height/2,z);
    base.scale.set(radius,height,radius);base.rotation.y=.24;
    const peak=piece(map,mountain,0xffe6cc,x,paperY+height*.88,z);
    peak.scale.set(radius*.31,height*.28,radius*.31);peak.rotation.y=.24;
  }
  const trunk=new THREE.CylinderGeometry(.045,.064,.23,5);
  const crown=new THREE.ConeGeometry(.25,.55,5);
  const trees=[[4.42,-.65,.85],[4.71,-1.01,1.15],[2.17,-.67,.89],[-4.54,.22,1.08],[-4.77,.51,.73],[-2.07,2.36,1.15],[-2.34,2.27,.72],[1.08,2.55,.70],[4.34,2.23,.80],[4.68,2.41,.94],[-.86,-2.37,.73]];
  trees.forEach(([x,z,s],index)=>{
    piece(map,trunk,0xaf8568,x,paperY+.12*s,z).scale.setScalar(s);
    piece(map,crown,index%2?0x73905f:0x5d8066,x,paperY+.46*s,z).scale.setScalar(s);
    piece(map,crown,0x88a571,x,paperY+.63*s,z).scale.setScalar(s*.77);
  });
  const iconColors=[0xffe2a8,0xddf3d3,0xffd8ac,0xf9e6ad,0xf3d9ed,0xd4e8ea];
  const doors=positions.map(([x,z],index)=>{
    const room=new THREE.Group();
    room.position.set(x,paperY+.054,z);map.add(room);
    card(room,palettes[index],0,.038,.13,1.4,.075,1.15);
    card(room,0xccac96,-.53,.54,-.13,.115,1.04,.12);
    card(room,0xccac96,.53,.54,-.13,.115,1.04,.12);
    card(room,0x9b806d,0,1.13,-.13,1.20,.13,.19);
    card(room,0x55464f,0,.54,-.235,1.06,1.00,.06);
    const hinge=new THREE.Group();
    hinge.position.set(-.48,.075,-.03);room.add(hinge);
    card(hinge,palettes[index],.48,.47,0,.94,.94,.065);
    card(hinge,iconColors[index],.72,.42,.05,.10,.10,.055);
    return hinge;
  });
  const dots=[];
  for(const z of [-.41,2.30]){
    for(let k=0;k<45;k++)dots.push([-4.01+k*.182,z,0]);
  }
  for(const x of [-1.72,1.72]){
    for(let k=0;k<15;k++)dots.push([x,-.37+k*.181,Math.PI/2]);
  }
  const dashGeometry=new THREE.BoxGeometry(.10,.013,.065);
  const dashMaterial=new THREE.MeshStandardMaterial({color:0xb08578,roughness:1});
  const path=new THREE.InstancedMesh(dashGeometry,dashMaterial,dots.length);
  const dummy=new THREE.Object3D();
  dots.forEach(([x,z,angle],i)=>{
    dummy.position.set(x,paperY+.06,z);dummy.rotation.y=angle;dummy.updateMatrix();
    path.setMatrixAt(i,dummy.matrix);
  });
  map.add(path);
  return {map,doors,positions};
}
