const paperInk = "#28434a";
const stone = "#a4b5aa";
const teal = "#17746f";
const amber = "#a85a2b";
const rose = "#953b60";
const violet = "#604784";
const ar = number => String(number).replace(/\d/g,digit=>"٠١٢٣٤٥٦٧٨٩"[digit]);

export function buildDiagram(lab,step) {
  const view = {shapes:[],segments:[],markers:[],labels:[],description:""};
  const segment = (from,to,color=paperInk,width=.06) => view.segments.push({from,to,color,width});
  const marker = (at,color=amber,radius=.13) => view.markers.push({at,color,radius});
  const label = (at,text,color=paperInk) => view.labels.push({at,text,color});
  const shape = (points,color,move=false) => {
    view.shapes.push({points,fill:color,move});
    points.forEach((from,i)=>view.segments.push({from,to:points[(i+1)%points.length],color,width:.082,move}));
  };
  function arrow(from,to,color) {
    segment(from,to,color,.084);
    const angle = Math.atan2(to[1]-from[1],to[0]-from[0]);
    for(const turn of [-.58,.58]){
      segment(to,[to[0]-.23*Math.cos(angle+turn),to[1]-.23*Math.sin(angle+turn)],color,.075);
    }
  }
  function grid() {
    for(let i=1;i<6;i++){
      segment([i,0],[i,5],stone,.022);
      segment([0,i],[5,i],stone,.022);
    }
  }

  if(lab.kind==="lines"){
    const span=step===0?1.8:2.55;
    const pivot=[3,lab.type==="parallel"?3.93:2.1];
    const angle=lab.type==="right"?Math.PI/2:lab.type==="parallel"?0:lab.side*Math.PI*.24;
    const along=distance=>[pivot[0]+distance*Math.cos(angle),pivot[1]+distance*Math.sin(angle)];
    segment([3-span,2.1],[3+span,2.1],amber,.17);
    segment(along(-Math.min(span,1.55/Math.max(.001,Math.abs(Math.sin(angle))))),along(span),teal,.17);
    if(step>=2){
      if(lab.type==="parallel"){
        for(const x of [1.6,4.4])arrow([x,2.36],[x,3.67],violet);
      }else{
        marker(pivot,amber);
        segment([3,2.93],[3.82,2.93],violet,.075);
        segment([3.82,2.93],[3.82,2.1],violet,.075);
        segment(pivot,[3,2.93],violet,.045);
      }
    }
    view.description=lab.type==="parallel"?"عارضتان أفقيتان وبينهما فراغ ثابت.":
      lab.type==="right"?"عارضة أفقية وأخرى عمودية تتقاطعان.":
      "عارضة أفقية تتقاطع مع عارضة مائلة.";
  }else if(lab.kind==="triangle"){
    const [base,right,left]=lab.lengths;
    const offset=(base*base+left*left-right*right)/(2*base);
    const height=Math.sqrt(left*left-offset*offset);
    const scale=Math.min(4.33/base,3.56/height);
    const vertices=[[3-base*scale/2,1.06],[3+base*scale/2,1.06],[3+(offset-base/2)*scale,1.06+height*scale]];
    shape(vertices,violet);
    const labelOffsets=[[0,-.38],[.42,.08],[-.40,.14]];
    const colors=[amber,teal,rose];
    for(let i=0;i<step;i++){
      const from=vertices[i],to=vertices[(i+1)%3];
      const [dx,dy]=labelOffsets[i];
      segment(from,to,colors[i],.14);
      label([(from[0]+to[0])/2+dx,(from[1]+to[1])/2+dy],ar(lab.lengths[i]),colors[i]);
    }
    vertices.forEach(position=>marker(position,violet,.1));
    view.description=step?"الأطوال التي قستها بالترتيب "+lab.lengths.slice(0,step).map(ar).join("، ")+".":"مثلث بثلاثة أضلاع يمكن قياسها.";
  }else if(lab.kind==="coordinates"){
    grid();
    arrow([0,0],[5.63,0],paperInk);
    arrow([0,0],[0,5.73],paperInk);
    label([5.69,.36],"س");
    label([.34,5.70],"ص");
    label([-.26,-.27],ar(0));
    for(let i=1;i<=5;i++){
      label([i,-.30],ar(i));
      label([-.29,i],ar(i));
    }
    const [x,y]=lab.target;
    if(step>=1&&x)arrow([0,0],[x,0],teal);
    if(step>=2&&y)arrow([x,0],[x,y],rose);
    marker(lab.target,amber,.19);
    view.description="شبكة من صفر إلى خمسة. العلامة الذهبية عند س "+ar(x)+" وص "+ar(y)+".";
  }else{
    grid();
    const piece=[[1,1],[2,1],[2,2],[1.65,2.45],[1,2.45]];
    const mirror=lab.type==="mirror";
    const vertical=lab.axis==="vertical";
    if(mirror){
      segment(vertical?[3,0]:[0,3],vertical?[3,5]:[5,3],violet,.105);
    }
    const image=piece.map(([x,y])=>mirror?(vertical?[6-x,y]:[x,6-y]):[x+lab.change[0],y+lab.change[1]]);
    shape(piece,teal);
    if(step>=1)shape(image,rose,!mirror);
    if(step>=2){
      if(mirror){
        const center=vertical?[3,1]:[1,3];
        segment(piece[0],center,paperInk,.062);
        segment(center,image[0],paperInk,.062);
        marker(center,violet,.1);
      }else{
        const corner=[image[0][0],piece[0][1]];
        if(lab.change[0])arrow(piece[0],corner,amber);
        if(lab.change[1])arrow(corner,image[0],amber);
      }
    }
    marker(piece[0]);
    if(step>=1){
      view.markers.push({at:image[0],color:amber,radius:.13,move:!mirror});
      if(!mirror)view.displacement=lab.change;
    }
    view.description=step===0?"قطعة ورقية على شبكة.":mirror?
      "قطعة وصورتها على جانبي محور "+(vertical?"رأسي.":"أفقي."):
      "قطعة وصورتها بعد الحركة. بقي اتجاه القطعة كما هو.";
  }
  return view;
}
