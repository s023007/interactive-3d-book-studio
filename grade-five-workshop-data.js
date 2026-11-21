const join = (a,b) => a.map((value,index)=>value+b[index]);
const times = (a,factor) => a.map(value=>value*factor);

// Centres are measured in half-square units, so face contacts can be compared exactly.
export function planFolds(cells){
  const available=new Set(cells.map(cell=>cell.join(",")));
  const visited=new Set();
  const faces=[];
  function visit(cell,parent,dx,dz,centre,x,y,z){
    visited.add(cell.join(","));
    const face={id:faces.length,cell,parent,dx,dz,centre,normal:y};
    faces.push(face);
    for(const [a,b] of [[1,0],[0,-1],[-1,0],[0,1]]){
      const next=[cell[0]+a,cell[1]+b];
      if(!available.has(next.join(","))||visited.has(next.join(",")))continue;
      const direction=times(a?x:z,a||b);
      visit(next,face.id,a,b,join(join(centre,direction),y),
        a?times(y,a):x,times(direction,-1),b?times(y,b):z);
    }
  }
  visit(cells[0],null,0,0,[0,0,0],[1,0,0],[0,1,0],[0,0,1]);
  return faces;
}

export function inspectFolds(faces,closed){
  const seated=new Set();
  const places=new Map();
  const conflicts=new Set();
  for(const face of faces){
    if(face.parent!==null&&(!closed.has(face.id)||!seated.has(face.parent)))continue;
    seated.add(face.id);
    const slot=face.centre.join(",")+":"+face.normal.findIndex(value=>value!==0);
    if(places.has(slot)){
      conflicts.add(places.get(slot));
      conflicts.add(face.id);
    }
    places.set(slot,face.id);
  }
  const fitted=faces.length===6&&seated.size===6&&!conflicts.size&&faces.every(({centre,normal})=>
    centre.every((value,i)=>value===(i===1?1:0)-normal[i]));
  return {conflicts,fitted};
}

export const practiceNets=[
  planFolds([[0,0],[-1,0],[1,0],[2,0],[-1,-1],[1,-1]]),
  planFolds([[0,0],[-1,0],[1,0],[2,0],[0,-1],[0,1]]),
];
export const challengeNets=[
  planFolds([[0,0],[1,0],[2,0],[3,0],[0,1],[2,1]]),
  planFolds([[0,0],[1,0],[2,0],[0,1],[-1,1],[-2,1]]),
];
export const reviewNets=[
  planFolds([[0,0],[-1,0],[1,0],[2,0],[-1,-1],[2,1]]),
  planFolds([[0,0],[-1,0],[1,0],[2,0],[0,-1],[2,-1]]),
];

export const panelColors=["#d9a569","#44958c","#e68c83","#8d7fb6","#dda94c","#59a0b4"];
const line=(speaker,text)=>({speaker,text});
export const workshopLines={
  arrive:line("artisan","وصلت قطعة جديدة للورشة. هل تستطيع طيّ هذه الشبكة لتصنع لها صندوقًا؟"),
  move:line("raccoon","اسحب مربعًا إلى أعلى أو المسه ليُطوى عند الحافة. تتبّع كل وجه إلى مكانه."),
  overlap:line("raccoon","هذان الوجهان وصلا إلى الجهة نفسها. افتح أحدهما وانظر أين بقي الصندوق مفتوحًا."),
  repair:line("artisan","جرّب هذه الشبكة. فيها العدد نفسه من المربعات، لكن أماكنها مختلفة."),
  fit:line("raccoon","كل وجه وصل إلى جهة مختلفة. أصبح لدينا الآن صندوقٌ مغلق."),
  choose:line("artisan","بقي صندوق أخير. اختر شبكة جديدة واطوِها بنفسك."),
  retry:line("raccoon","راجع مكان الوجهين المعلّمين، ثم اطوِ من جديد أو جرّب الشبكة الأخرى."),
  finish:line("artisan","أغلقت الصندوق الجديد! احتفظ داخله بختم صانع المكعّبات."),
};

// Register the licensed recordings here by line ID when they are delivered.
export const workshopRecordings=Object.freeze({});
