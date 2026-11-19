import * as T from "three";

export const riverNear = 0;
export const riverFar = -15;
export const bridgeHalf = 2.05;
export const spawn = [0, 18];
export const tracks = [[-2.5, 11], [1.3, 6]];
export const stock = [[-5, 3], [-1.8, 3], [3.9, 3]];
export const lock = [0, .95];
export const lookout = [1.4, -20];
export const animalSite = [3.2, -26.8];

export function elevation(x,z) {
  const bank = Math.max(0,Math.abs(z+7.5)-7.5);
  const outsidePath = Math.min(1,Math.max(0,(Math.abs(x)-4)/8));
  return outsidePath * Math.min(1,bank*.18) * (.48+.42*Math.sin(x*.19+z*.11)+.24*Math.cos(z*.42));
}

function material(color,extra={}) {
  return new T.MeshStandardMaterial({color,roughness:.88,...extra});
}
function mesh(parent,geometry,mat,x,y,z) {
  const obj=new T.Mesh(geometry,mat); obj.position.set(x,y,z); parent.add(obj); return obj;
}
const box = (parent,mat,w,h,d,x,y,z) => mesh(parent,new T.BoxGeometry(w,h,d),mat,x,y,z);
const orb = (parent,mat,w,h,d,x,y,z) => {
  const o=mesh(parent,new T.SphereGeometry(1,14,10),mat,x,y,z); o.scale.set(w,h,d); return o;
};

export function makeRaccoon(scene) {
  const body=new T.Group();
  body.rotation.y=Math.PI-.42;
  scene.add(body);
  const fur=material(0x888988), mask=material(0x272932), pale=material(0xdad0b1);
  const green=material(0x3d7f6e), brass=material(0xbd8a48);
  orb(body,fur,.45,.54,.30,0,.72,0);
  orb(body,pale,.33,.38,.25,0,.71,-.16);
  const head=new T.Group(); head.position.y=1.29; body.add(head);
  orb(head,fur,.55,.46,.42,0,0,0);
  for(const side of [-1,1]){
    orb(head,mask,.18,.19,.11,side*.37,.34,.02);
    orb(head,pale,.117,.122,.082,side*.37,.345,-.047);
    const patch=orb(head,mask,.255,.17,.14,side*.27,.015,-.305);
    patch.rotation.z=side*.22;
    orb(head,pale,.068,.076,.045,side*.205,.035,-.435);
    orb(head,mask,.038,.055,.035,side*.193,.025,-.469);
  }
  orb(head,pale,.29,.174,.145,0,-.108,-.357);
  orb(head,mask,.093,.058,.06,0,-.066,-.497);
  orb(body,green,.38,.33,.17,0,.82,.275);
  box(body,brass,.16,.15,.032,0,.81,.445);
  const scarf=orb(body,green,.35,.09,.34,0,1.03,0);
  scarf.rotation.z=.12;
  const legs=[];
  const arms=[];
  for(const side of [-1,1]){
    const leg=new T.Group(); leg.position.set(side*.22,.46,.025); body.add(leg);
    orb(leg,mask,.127,.235,.13,0,-.17,0);
    orb(leg,mask,.143,.092,.17,0,-.37,-.071);
    legs.push(leg);
    const arm=new T.Group(); arm.position.set(side*.39,.94,0); body.add(arm);
    orb(arm,fur,.112,.242,.112,0,-.15,0);
    orb(arm,mask,.106,.11,.107,0,-.34,0);
    arm.rotation.z=side*.13;
    arms.push(arm);
  }
  const tail=new T.Group(); tail.position.set(0,.56,.25); body.add(tail);
  tail.rotation.x=-.40;
  for(let i=0;i<8;i++){
    const r=.22-i*.014;
    orb(tail,i%3===1?mask:fur,r,r*.86,.15,0,-i*.02,i*.122);
  }
  const plank=box(body,brass,1,.13,.53,0,.77,-.59);
  plank.visible=false;
  const shadowMap=document.createElement("canvas");
  shadowMap.width=shadowMap.height=64;
  const ctx=shadowMap.getContext("2d");
  const shade=ctx.createRadialGradient(32,32,1,32,32,31);
  shade.addColorStop(0,"#10261dc9");shade.addColorStop(1,"#10261d00");
  ctx.fillStyle=shade;ctx.fillRect(0,0,64,64);
  const shadow=mesh(scene,new T.PlaneGeometry(1.65,1.33),
    new T.MeshBasicMaterial({map:new T.CanvasTexture(shadowMap),transparent:true,depthWrite:false,opacity:.54}),0,0,0);
  shadow.rotation.x=-Math.PI/2;
  return {body,head,legs,arms,tail,plank,shadow};
}

function makeDeer(scene) {
  const deer=new T.Group(); deer.position.set(animalSite[0],elevation(...animalSite),animalSite[1]); scene.add(deer);
  deer.rotation.y=-.66;
  const brown=material(0xc38753), cream=material(0xffd59a), dark=material(0x4b382b);
  orb(deer,brown,.44,.42,.75,0,1,.10);
  orb(deer,cream,.40,.24,.56,0,.82,.09);
  orb(deer,brown,.24,.51,.26,0,1.33,.58).rotation.x=.24;
  const head=new T.Group(); head.position.set(0,1.72,.75); deer.add(head);
  orb(head,brown,.27,.25,.34,0,0,0);
  orb(head,cream,.21,.14,.26,0,-.10,.205);
  orb(head,dark,.11,.066,.079,0,-.064,.437);
  for(const side of [-1,1]){
    orb(head,brown,.12,.22,.067,side*.235,.17,-.105).rotation.z=side*-.64;
    orb(head,dark,.048,.052,.051,side*.233,.055,.15);
    for(const depth of [-.36,.46]){
      box(deer,brown,.13,.66,.14,side*.25,.42,depth);
      box(deer,dark,.15,.12,.15,side*.25,.075,depth);
    }
    for(let index=0;index<5;index++)orb(deer,cream,.025,.028,.031,side*.36,.99+(index%2)*.17,-.31+index*.18);
  }
  orb(deer,cream,.16,.15,.21,0,1.1,-.63);
  return {deer,head};
}

function texture(seed,path=false){
  const canvas=document.createElement("canvas");
  canvas.width=canvas.height=256;
  const ctx=canvas.getContext("2d");
  const rng=randomSeed(seed);
  if(!path){
    ctx.fillStyle="#d2d2c1";ctx.fillRect(0,0,256,256);
  }else{
    const fade=ctx.createRadialGradient(128,128,80,128,128,127);
    fade.addColorStop(0,"#e0ddc8");fade.addColorStop(.64,"#ccc9b5");fade.addColorStop(1,"#dfdbbd00");
    ctx.fillStyle=fade;ctx.fillRect(0,0,256,256);
    ctx.globalCompositeOperation="source-atop";
  }
  for(let i=0;i<5500;i++){
    const x=rng()*256,y=rng()*256,length=rng()*(path?4:6)+.8;
    ctx.fillStyle=i%3===0?"#443e2338":i%3===1?"#514d3625":"#ffffee55";
    ctx.fillRect(x,y,1+rng()*2,length);
  }
  const map=new T.CanvasTexture(canvas);
  map.colorSpace=T.SRGBColorSpace;
  if(!path){map.wrapS=map.wrapT=T.RepeatWrapping;map.repeat.set(24,10);}
  return map;
}

function terrain(scene,x0,x1,z0,z1,color,accent) {
  const surface=new T.PlaneGeometry(x1-x0,z1-z0,40,25);
  surface.rotateX(-Math.PI/2);
  const positions=surface.attributes.position;
  const colors=[];
  const a=new T.Color(color), b=new T.Color(accent);
  const c=new T.Color();
  for(let i=0;i<positions.count;i++){
    const x=positions.getX(i)+(x0+x1)*.5,z=positions.getZ(i)+(z0+z1)*.5;
    positions.setXYZ(i,x,elevation(x,z)-.06,z);
    c.copy(a).lerp(b,.5+.22*Math.sin(x*.19+z*.38)+.18*Math.cos(z*.64-x*.36));
    colors.push(c.r,c.g,c.b);
  }
  surface.setAttribute("color",new T.Float32BufferAttribute(colors,3)); surface.computeVertexNormals();
  mesh(scene,surface,material(0xffffff,{vertexColors:true,map:texture(842)}),0,0,0);
}

function randomSeed(seed) {
  return () => {
    seed=(Math.imul(seed,1664525)+1013904223)>>>0;
    return seed/4294967296;
  };
}

function landscape(scene) {
  terrain(scene,-73,73,0,52,0x6b9047,0x8bab53);
  terrain(scene,-73,73,-82,-15,0x678c46,0x96ac56);
  const dirt=material(0xc5a66c,{map:texture(948,true),transparent:true,depthWrite:false,polygonOffset:true,polygonOffsetFactor:-1});
  for(const [x,z,w,d] of [[0,12,4.5,23],[.5,-22,4.2,13],[-1,3,9,5]]){
    const oval=mesh(scene,new T.PlaneGeometry(2,2),dirt,x,.014,z);
    oval.rotation.x=-Math.PI/2; oval.scale.set(w/2,d/2,1);
  }
  const rng=randomSeed(724);
  const instances=(geometry,mat,size,setup)=>{
    const objects=new T.InstancedMesh(geometry,mat,size);
    const helper=new T.Object3D();
    for(let i=0;i<size;i++){
      setup(helper,i);helper.updateMatrix();objects.setMatrixAt(i,helper.matrix);
    }
    scene.add(objects);
    return objects;
  };
  const forest=[];
  for(let i=0;i<115;i++){
    const side=i%2===0?-1:1, bank=i%3===0?-1:1;
    const x=side*(7+rng()*50);
    const z=bank===1?4+rng()*39:-17-rng()*54;
    forest.push([x,z,2.8+rng()*4.6,rng()]);
  }
  for(let i=0;i<38;i++) forest.push([-46+i*2.5,-55-rng()*22,5+rng()*4.5,rng()]);
  instances(new T.CylinderGeometry(.28,.52,1,7),material(0x655647),forest.length,(o,i)=>{
    const [x,z,h]=forest[i];o.position.set(x,elevation(x,z)+h*.23,z);o.scale.set(h*.22,h*.60,h*.22);
  });
  for(let layer=0;layer<3;layer++){
    const leaves=instances(new T.IcosahedronGeometry(1,1),material(0xffffff),forest.length,(o,i)=>{
      const [x,z,h,a]=forest[i];o.position.set(x+(layer-1)*h*.17,elevation(x,z)+h*(.62+.15*(layer===1)),z+(layer%2)*h*.19);
      o.rotation.set(0,a*6,layer*.45);o.scale.set(h*(.42-layer*.042),h*(.38-layer*.032),h*.38);
    });
    const leafColors=[0x345f42,0x477748,0x628b49,0x71944d,0x2b634b];
    for(let i=0;i<forest.length;i++)leaves.setColorAt(i,new T.Color(leafColors[(i+layer)%leafColors.length]));
  }
  instances(new T.IcosahedronGeometry(1,0),material(0x899287),94,(o,i)=>{
    const x=(rng()-.5)*88,z=i%2===0?.17+rng()*1.15:-15.18-rng()*1.25;
    const s=.18+rng()*.54; o.position.set(x,s*.18,z);o.rotation.y=rng()*6;o.scale.set(s*1.5,s*.60,s);
  });
  for(const col of [0x6f9144,0x9eab51,0x578247]){
    instances(new T.ConeGeometry(.12,1,3),material(col),300,(o,i)=>{
      const x=(4+rng()*31)*(i%2?-1:1),z=i%3?-16-rng()*32:1+rng()*26;
      const h=.28+rng()*.52;
      o.position.set(x,elevation(x,z)+h*.39,z);o.rotation.set(.18,rng()*6,.15);o.scale.set(1,h,1);
    });
  }
  const reeds=instances(new T.PlaneGeometry(.17,1),material(0xffffff,{side:T.DoubleSide}),400,(o,i)=>{
    const x=(3+rng()*17)*(i%2?-1:1),z=i%4<2? .24+rng()*2.9:-15.24-rng()*3.4;
    const h=.22+rng()*.76;
    o.position.set(x,h*.44,z);o.rotation.set(.3,rng()*6,.19);o.scale.set(1,h,1);
  });
  const reedColors=[0x496c35,0x69913d,0x879b49,0x355742];
  for(let i=0;i<reeds.count;i++)reeds.setColorAt(i,new T.Color(reedColors[i%4]));
  const shrubs=instances(new T.IcosahedronGeometry(1,1),material(0xffffff),45,(o,i)=>{
    const x=(4.8+rng()*9)*(i%2?-1:1),z=i%4<2?4+rng()*19:-16-rng()*13;
    const h=.24+rng()*.65;
    o.position.set(x,elevation(x,z)+h*.43,z);o.rotation.set(.5,rng()*6,.15);o.scale.set(h*1.55,h,h*.81);
  });
  for(let i=0;i<shrubs.count;i++)shrubs.setColorAt(i,new T.Color(reedColors[(i+1)%4]));
  for(const col of [0xffd887,0xfff6d9]){
    instances(new T.IcosahedronGeometry(.12,0),material(col),52,(o,i)=>{
      const x=(3+rng()*11)*(i%2?-1:1),z=i%2?2+rng()*19:-18-rng()*14;
      o.position.set(x,elevation(x,z)+.14,z);o.scale.setScalar(.8+rng()*.55);
    });
  }
}

function river(scene) {
  const uniforms={time:{value:0}, deep:{value:new T.Color(0x237981)}, shallow:{value:new T.Color(0x81c4ae)}};
  const surface=new T.ShaderMaterial({
    uniforms,
    vertexShader:`varying vec2 vUv; void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}`,
    fragmentShader:`varying vec2 vUv; uniform float time; uniform vec3 deep; uniform vec3 shallow;
    void main(){
      float a=sin(vUv.x*175.-time*1.75+sin(vUv.y*51.)*3.6);
      float b=sin(vUv.y*142.+vUv.x*38.+sin(vUv.x*63.-time*.9)*3.);
      float glint=pow(max(0.,a*.45+b*.55),7.)*.27;
      float bank=1.-smoothstep(.015,.17,min(vUv.y,1.-vUv.y));
      float edge=1.-smoothstep(.008,.025,abs(min(vUv.y,1.-vUv.y)-.021+sin(vUv.x*140.+time)*.005));
      gl_FragColor=vec4(mix(deep,shallow,bank*.68+b*.075)+vec3(glint+edge*.16),1.);
      #include <colorspace_fragment>
    }`,
  });
  const lake=mesh(scene,new T.PlaneGeometry(146,15.1),surface,0,-.26,-7.5); lake.rotation.x=-Math.PI/2;
  return uniforms;
}

function bridge(scene) {
  const wood=material(0xb78555), dark=material(0x6b4c38), brass=material(0xeabf75);
  const moving=new T.Group(); moving.position.set(0,.12,-3.3); scene.add(moving);
  for(let i=0;i<25;i++){
    const z=.6-i*.67;
    if(z<-3.3&&z>-11.2)box(moving,i%4===0?dark:wood,4.15,.19,.60,0,0,z+3.3);
    else box(scene,i%4===0?dark:wood,4.15,.19,.60,0,.12,z);
  }
  for(const side of [-1,1]){
    for(const z of [.6,-2.9,-11.3,-15.6]){
      box(scene,dark,.27,.91,.26,side*1.99,.47,z);
      box(scene,brass,.34,.08,.34,side*1.99,.90,z);
    }
    for(const z of [-1.1,-13.4])box(scene,dark,.10,.10,3.5,side*1.99,.66,z);
  }
  const board=[];
  for(let i=0;i<8;i++){
    board.push(box(scene,i<4?wood:dark,.31,.15,1.05,(i-3.5)*.35,.52,.37));
  }
  return {moving,board,brass};
}

export function buildWorld(scene) {
  scene.background=new T.Color(0xb5d7c8);
  scene.fog=new T.FogExp2(0xb5d7c8,.024);
  scene.add(new T.HemisphereLight(0xfff0ce,0x587968,2.15));
  const sun=new T.DirectionalLight(0xffe3ac,2.05);sun.position.set(-14,25,3);scene.add(sun);
  landscape(scene);
  const water=river(scene);
  const crossing=bridge(scene);
  const actor=makeRaccoon(scene);
  const wildlife=makeDeer(scene);
  const wood=material(0xd8a76a), trackMat=material(0x906e47);
  const stacks=stock.map(([x,z],i)=>{
    const group=new T.Group();group.position.set(x,.15,z);scene.add(group);
    for(let n=0;n<=i;n++)box(group,wood,.92,.105,.28,(n-i/2)*.07,n*.112,0).rotation.y=.11*(n-i);
    return group;
  });
  const prints=tracks.map(([x,z])=>{
    const group=new T.Group();group.position.set(x,.04,z);scene.add(group);
    for(let i=0;i<4;i++){
      const px=i%2*.38-.13,pz=-i*.26+.39;
      orb(group,trackMat,.13,.03,.15,px,0,pz);
      for(const offset of [-.09,0,.09])orb(group,trackMat,.036,.027,.04,px+offset,0,pz-.14);
    }
    return group;
  });
  const stones=material(0x9eac95);
  for(const [x,z] of [[-5,16],[5.5,8],[-6,-19],[8,-25]]) {
    orb(scene,stones,.9,.42,.61,x,.19,z).rotation.y=.75;
  }
  return {actor,wildlife,water,crossing,stacks,prints};
}
