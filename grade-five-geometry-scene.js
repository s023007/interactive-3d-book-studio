import * as THREE from "three";

const scale = .605;
const toX = x => (x - 2.78) * scale;
const toZ = y => (2.63 - y) * scale;

export function drawGeometryDiagram(group,diagram) {
  group.position.set(-2.73,.055,.10);
  const moving = new THREE.Group();
  group.add(moving);

  function mesh(geometry,color,y,x=0,z=0,move=false) {
    const material = new THREE.MeshStandardMaterial({color,roughness:.84});
    const object = new THREE.Mesh(geometry,material);
    object.position.set(x,y,z);
    (move?moving:group).add(object);
    return object;
  }
  const base = mesh(new THREE.BoxGeometry(4.03,.11,4.06),0x2d6c66,0);
  base.rotation.y=.014;
  mesh(new THREE.BoxGeometry(3.93,.078,3.94),0xece0ba,.07);
  const paper = mesh(new THREE.BoxGeometry(3.81,.035,3.80),0xf9eccf,.105);
  paper.rotation.y=.005;
  for(const [x,z] of [[-1.88,-1.88],[1.88,-1.88],[-1.88,1.88],[1.88,1.88]]){
    mesh(new THREE.CylinderGeometry(.035,.035,.03,8),0xb88758,.132,x,z);
  }
  for(const {points,fill,move} of diagram.shapes){
    const shape = new THREE.Shape(points.map(([x,y])=>new THREE.Vector2(toX(x),-toZ(y))));
    const tint = new THREE.Color(fill).lerp(new THREE.Color(0xf9eccf),.65);
    const sheet = mesh(new THREE.ExtrudeGeometry(shape,{depth:.023,bevelEnabled:false}),tint,.125,0,0,move);
    sheet.rotation.x=-Math.PI/2;
  }
  for(const {from,to,width,color,move} of diagram.segments){
    const x1=toX(from[0]),z1=toZ(from[1]),x2=toX(to[0]),z2=toZ(to[1]);
    const length=Math.hypot(x2-x1,z2-z1);
    if(length<.001)continue;
    const height=width>=.12?.10:.018;
    const y=width>=.12?.20:width>=.08?.168:.15;
    const beam=mesh(new THREE.BoxGeometry(length,height,width*scale),color,y,(x1+x2)/2,(z1+z2)/2,move);
    beam.rotation.y=-Math.atan2(z2-z1,x2-x1);
  }
  for(const {at:[x,y],color,radius,move} of diagram.markers){
    const width=radius*scale;
    mesh(new THREE.CylinderGeometry(width*1.2,width*1.2,.028,10),0xffefce,.177,toX(x),toZ(y),move);
    mesh(new THREE.CylinderGeometry(width,width,.044,10),color,.21,toX(x),toZ(y),move);
  }
  if(diagram.labels.length){
    const face=document.createElement("canvas");
    face.width=512;face.height=512;
    const ctx=face.getContext("2d");
    ctx.textAlign="center";ctx.textBaseline="middle";ctx.font="bold 55px Tahoma, Arial, sans-serif";
    ctx.strokeStyle="#fff1d4";ctx.lineWidth=4;
    for(const {at:[x,y],text,color} of diagram.labels){
      const px=(toX(x)/3.91+.5)*face.width;
      const py=(toZ(y)/3.91+.5)*face.height;
      ctx.fillStyle=color;
      ctx.strokeText(text,px,py);
      ctx.fillText(text,px,py);
    }
    const texture=new THREE.CanvasTexture(face);
    texture.colorSpace=THREE.SRGBColorSpace;
    const markings=new THREE.Mesh(new THREE.PlaneGeometry(3.91,3.91),
      new THREE.MeshBasicMaterial({map:texture,transparent:true,depthWrite:false}));
    markings.rotation.x=-Math.PI/2;markings.position.y=.242;
    group.add(markings);
  }
  return moving;
}

export function positionSlidingPiece(piece,displacement,fraction) {
  piece.position.set(-displacement[0]*scale*fraction,0,displacement[1]*scale*fraction);
}
