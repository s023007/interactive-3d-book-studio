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

export function createAtlasTerrain(scene){
  const world=new THREE.Group();
  world.visible=false;
  world.scale.z=1.48;
  scene.add(world);
  const inks=new Map();
  const ink=color=>{
    if(!inks.has(color))inks.set(color,new THREE.MeshStandardMaterial({color,roughness:.93}));
    return inks.get(color);
  };
  const rock=ink(0xa58a7e), snow=ink(0xffe4c4), fir=ink(0x587d61), lightFir=ink(0x82a675);
  const khaki=ink(0xc7c893), evergreen=ink(0xa8bd91), ochre=ink(0xd8ac81);
  const peakGeometry=new THREE.ConeGeometry(1,1,5);
  function mesh(geometry,material,x,y,z,sx=1,sy=1,sz=1){
    const part=new THREE.Mesh(geometry,material);
    part.position.set(x,y,z);part.scale.set(sx,sy,sz);
    world.add(part);return part;
  }
  const patch=(shape,material,x,z,sx,sz)=>{
    const object=mesh(shape,material,x,.035,z,sx,sz,1);
    object.rotation.x=-Math.PI/2;
    return object;
  };
  function polygon(){
    const points=[[-1,-.2],[-.8,-.8],[-.32,-.94],[.37,-.86],[.93,-.61],[1,.12],[.71,.72],[.2,.92],[-.43,.76],[-.91,.48]];
    return new THREE.Shape(points.map(([x,y])=>new THREE.Vector2(x,y)));
  }
  const field=new THREE.ExtrudeGeometry(polygon(),{depth:.035,bevelEnabled:false});
  const patches=[
    patch(field,evergreen,2.7,.91,2.22,1.55),
    patch(field,khaki,-2.5,.60,2.23,1.84),
    patch(field,ochre,2.3,-1.38,2.41,1.17),
    patch(field,evergreen,-2.5,-1.48,2.02,1.15),
  ];
  const riverPoints=[[-.08,-2.83],[-.4,-2.17],[-.16,-1.43],[.62,-.83],[.51,-.24],[-.65,.59],[-.92,1.27],[-.42,2.17],[.03,2.83]];
  const river=new THREE.CatmullRomCurve3(riverPoints.map(([x,z])=>new THREE.Vector3(x,.082,z)));
  const river2=river.clone();
  mesh(new THREE.TubeGeometry(river,40,.21,5,false),ink(0x508d95),0,.004,0,1,.48,1);
  mesh(new THREE.TubeGeometry(river2,40,.072,4,false),ink(0x8cbdb3),.026,.045,0,1,.48,1);
  for(const [x,z,h,r] of [[-4.18,-1.94,1.22,.72],[-3.21,-1.77,1.72,.83],[-2.46,-1.87,1.18,.60],[3.44,-1.88,1.57,.78],[4.22,-1.52,1.06,.62],[-3.75,-.85,.82,.56]]){
    mesh(peakGeometry,rock,x,h*.51,z,r,h,r).rotation.y=.22;
    mesh(peakGeometry,snow,x,h*.89,z,r*.36,h*.29,r*.36).rotation.y=.22;
  }
  const leaves=new THREE.ConeGeometry(.26,.50,5);
  const trunk=new THREE.CylinderGeometry(.041,.059,.20,5);
  const bark=ink(0x9e7758);
  for(const [i,[x,z]] of [[2.18,.44],[2.63,.61],[3.1,.03],[3.51,.48],[4.2,.87],[4.38,1.38],[-2.9,.44],[-4.1,.70],[-4.43,1.11],[-3.74,1.32],[-3.38,1.02],[1.55,1.80],[2.02,2.09],[-2.17,1.9]].entries()){
    const scale=.79+(i%4)*.13;
    mesh(trunk,bark,x,.16,z,scale,scale,scale);
    mesh(leaves,i%2?fir:lightFir,x,.41*scale,z,scale,scale,scale);
    mesh(leaves,i%2?lightFir:fir,x,.57*scale,z,scale*.78,scale*.77,scale*.78);
  }
  const trail=ink(0xe6ca9a), track=new THREE.BoxGeometry(.21,.04,.083);
  for(let i=0;i<22;i++){
    const x=-3.84+i*.353;
    mesh(track,trail,x,.12,1.04+.19*Math.cos(x*.82)).rotation.y=.15*Math.sin(x);
  }
  const bridge=ink(0xc38b62);
  for(let i=0;i<6;i++)mesh(new THREE.BoxGeometry(.101,.065,.44),bridge,-.50+i*.12,.136,.90);
  for(const [x,z] of [[2.76,-.55],[-2.05,-.16],[-2.62,1.78],[2.12,1.39]]){
    mesh(new THREE.BoxGeometry(.62,.41,.52),ink(0xf0c187),x,.25,z);
    mesh(new THREE.ConeGeometry(.56,.39,4),ink(0xb37964),x,.62,z).rotation.y=Math.PI/4;
  }
  function present(view,unit){
    world.visible=true;
    const colors=[0xb7b789,0xc5b18d,0xa6c1a1,0xc9b59d];
    patches.forEach((item,index)=>{item.material=ink(view==="index"?[0xa8bd91,0xc7c893,0xd8ac81,0xa8bd91][index]:colors[(unit+index)%4]);});
  }
  return {world,present};
}
