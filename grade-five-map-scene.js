import * as THREE from "three";

const positions=[[3.28,-1.18],[0,-1.63],[-3.28,-1.18]];
const pathPoints=[[3.28,2.25],[1.65,2.18],[0,1.92],[-1.65,2.18],[-3.28,2.25]];
const palette=[0xc492c0,0x88bdb1,0xe3aa7e];
const floorY=.016;

export function createPaperMap(scene){
  const map=new THREE.Group();
  map.visible=false;
  scene.add(map);
  function card(parent,color,x,y,z,w,h,d){
    const paper=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),new THREE.MeshStandardMaterial({color,roughness:.85}));
    paper.position.set(x,y,z);
    parent.add(paper);
    return paper;
  }
  const dots=[];
  for(let i=0;i<pathPoints.length-1;i++){
    const [x,z]=pathPoints[i];
    const [toX,toZ]=pathPoints[i+1];
    for(let step=0;step<5;step++){
      const f=step/5;
      dots.push([THREE.MathUtils.lerp(x,toX,f),THREE.MathUtils.lerp(z,toZ,f)]);
    }
  }
  const doors=positions.map(([x,z],index)=>{
    const room=new THREE.Group();
    room.position.set(x,floorY,z);map.add(room);
    card(room,palette[index],0,.07,.10,1.69,.13,1.62);
    card(room,0xa6829d,-.65,.72,-.15,.16,1.36,.16);
    card(room,0xa6829d,.65,.72,-.15,.16,1.36,.16);
    card(room,0xe7bb9d,0,1.43,-.15,1.50,.16,.23);
    card(room,0x614a70,0,.71,-.25,1.23,1.26,.10);
    const hinge=new THREE.Group();
    hinge.position.set(-.61,.11,-.04);
    room.add(hinge);
    card(hinge,palette[index],.59,.60,0,1.17,1.17,.065);
    card(hinge,0xf9d690,.96,.57,.061,.10,.095,.07);
    for(let k=0;k<8;k++)dots.push([x,z+.76+(2.15-z-.76)*k/8]);
    return hinge;
  });
  const dashGeometry=new THREE.BoxGeometry(.17,.013,.079);
  const dashMaterial=new THREE.MeshStandardMaterial({color:0xb68caa,roughness:1});
  const path=new THREE.InstancedMesh(dashGeometry,dashMaterial,dots.length);
  const matrix=new THREE.Matrix4();
  dots.forEach(([x,z],i)=>path.setMatrixAt(i,matrix.makeTranslation(x,floorY+.004,z)));
  map.add(path);
  return {map,doors,positions};
}
