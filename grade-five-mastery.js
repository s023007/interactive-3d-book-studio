const storageKey="warraq.grade-five.cube-net-skill.v1";
const number=new Intl.NumberFormat("ar-OM",{numberingSystem:"arab"});
const verifications=["workshop","review"];
const outcomes=["unseen","overlap","guided","independent"];
const $=id=>document.getElementById(id);

function readEvidence(){
  try{
    const saved=JSON.parse(localStorage.getItem(storageKey));
    if(saved&&outcomes.includes(saved.latest)&&Number.isSafeInteger(saved.attempts)&&saved.attempts>=0&&
       Number.isSafeInteger(saved.overlaps)&&saved.overlaps>=0&&saved.overlaps<=saved.attempts&&
       Array.isArray(saved.independent)&&saved.independent.every(form=>verifications.includes(form))){
      return {...saved,independent:[...new Set(saved.independent)]};
    }
  }catch{}
  return {latest:"unseen",attempts:0,overlaps:0,independent:[]};
}
function present(evidence,oldStamp){
  const demonstrated=evidence.independent.length;
  const observed=demonstrated===verifications.length;
  const needsPractice=evidence.latest==="overlap"||evidence.latest==="guided";
  const isNew=evidence.latest==="unseen";
  const status=observed?"أتقن المهارة في تحدّيَين":demonstrated?"نجح بمفرده في تحدٍّ واحد":needsPractice?"يتدرّب على المهارة":"بانتظار أول تحدٍّ";
  const descriptions={
    unseen:oldStamp?"لدى الطالب ختم سابق، ويمكنه تسجيل دليل جديد من هذه الورشة.":"أكمل الورشة لتظهر هنا نتيجة أول تحدٍّ.",
    overlap:"في آخر محاولة، وصل وجهان إلى الجهة نفسها بعد الطيّ.",
    guided:"أغلق الطالب المكعب في آخر محاولة بعد تلميح أو إعادة المحاولة.",
    independent:"أغلق الطالب شبكة التحدّي في آخر محاولة دون تلميح.",
  };
  const recommendations=isNew?["ابدأ ورشة الصناديق","جرّب الطيّ وتتبّع أين يقع كل وجه."]:
    needsPractice?["أعد التدريب الموجّه","تتبّع الوجهين المتداخلين، ثم جرّب شبكة مختلفة."]:
    observed?["راجع المهارة","أعد تحدّي الورشة لتراجع خطوات الطيّ."]:
    ["جرّب شبكة جديدة","تحقّق من الفهم في تحدٍّ مختلف عن المثال الأول."];
  return {status,description:descriptions[evidence.latest],recommendations,needsPractice,canReview:!isNew&&!needsPractice&&!observed};
}

export function createCubeMastery({start,review,earned}){
  let evidence=readEvidence(),unsaved=false;
  const card=$("cube-skill-dialog");
  function render(){
    const state=present(evidence,earned());
    $("cube-skill-state").textContent=state.status;
    $("cube-skill-latest").textContent=state.description;
    $("cube-skill-attempts").textContent=number.format(evidence.attempts);
    $("cube-skill-overlaps").textContent=number.format(evidence.overlaps);
    $("cube-skill-independent").textContent=number.format(evidence.independent.length)+" من ٢";
    $("cube-skill-next").textContent=state.recommendations[1];
    $("cube-skill-action").textContent=state.recommendations[0];
    $("cube-skill-local").textContent=unsaved?"هذه النتائج متاحة في الجلسة الحالية. تعذّر حفظها على الجهاز.":
      "تُحفظ النتائج في هذا المتصفح لطالب واحد.";
    $("cube-skill-action").onclick=()=>{
      card.close();
      if(state.canReview)review(evidence.independent[0]==="review"?"workshop":"review");
      else start();
    };
  }
  function open(){
    if(!unsaved)evidence=readEvidence();
    render();
    card.showModal();
  }
  $("open-cube-skill").onclick=open;
  $("workshop-skill").onclick=open;
  return {
    record(outcome,form){
      if(!unsaved)evidence=readEvidence();
      evidence.latest=outcome;
      evidence.attempts++;
      if(outcome==="overlap")evidence.overlaps++;
      if(outcome==="independent"&&!evidence.independent.includes(form))evidence.independent.push(form);
      try{
        localStorage.setItem(storageKey,JSON.stringify(evidence));
        unsaved=false;
      }catch{unsaved=true;}
    },
  };
}
