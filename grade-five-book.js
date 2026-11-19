import { narration } from "./grade-five-narration.js";

const $=id=>document.getElementById(id);
const digits=new Intl.NumberFormat("ar-OM",{numberingSystem:"arab"});
const saveKey="warraq.grade-five.cube-stamp.v1";
const letters=["أ","ب","ج"];
const cross=[[0,0],[-1,0],[1,0],[2,0],[0,-1],[0,1]];
const overlap=[[0,0],[-1,0],[1,0],[2,0],[-1,-1],[1,-1]];
const offset=[[0,0],[-1,0],[1,0],[2,0],[-1,-1],[2,1]];
const strip=[[0,0],[-2,0],[-1,0],[1,0],[2,0],[3,0]];
const stepped=[[0,0],[1,0],[2,0],[0,1],[-1,1],[-2,1]];
const doubleBack=[[0,0],[1,0],[2,0],[3,0],[0,1],[2,1]];
const pages=[
  {label:"اكتشف", title:"من الورق إلى مجسّم", question:"كيف تتحول ستة مربعات على الصفحة إلى مكعب؟",
    task:"اطوِ الشبكة ثم افتحها لترى أين يذهب كل وجه.", hint:"لاحظ أن المربعات تتصل على حوافها.",
    explain:"ترتفع الأوجه على حواف الورقة حتى تغلق المكعب من جهاته الست.", model:cross},
  {label:"جرّب", title:"أين تذهب الأوجه؟", question:"أي شبكة تُغلِق مكعبًا؟ جرّب طيّ كل واحدة.",
    task:"اختر شبكة، ثم اطوها أو تحقّق من اختيارك.", hint:"انظر إلى المربعين خارج الصف. هل يغطيان جهتين مختلفتين؟",
    explain:"تغطي الشبكة «ب» جهات المكعب الست. في الشبكة أ يحاول وجهان تغطية الجهة نفسها.", items:[overlap,cross], answer:1},
  {label:"طبّق", title:"شبكة جديدة", question:"أي شبكة تستطيع طيّها لتكوين مكعب مغلق؟",
    task:"اختر شبكة لتطبيق الفكرة.", hint:"ستة مربعات شرط البداية. فكر هل سيجد كل وجه مكانه.",
    explain:"الشبكة أ تلتف حول المكعب وتغطي جهاته الست. الشريط ب يتداخل عند الطي.",
    items:[offset,strip], answer:0,
    retry:{items:[doubleBack,stepped],answer:1}},
  {label:"قارن", title:"أوجه الصندوق", question:"كم زوجًا من الأوجه المتقابلة المتطابقة في متوازي المستطيلات؟",
    task:"راقب الألوان على المجسّم، ثم اختر العدد.", hint:"ابدأ بالوجه العلوي والسفلي. فكّر في الأزواج الأخرى.",
    explain:"للصندوق ثلاثة أزواج من الأوجه المتقابلة. لكل لون على المجسّم وجهان متقابلان متطابقان.",
    items:["زوجان","ثلاثة أزواج","أربعة أزواج"], answer:1, cuboid:true,
    retry:{question:"في هذا الصندوق، ما الوجه المطابق والمقابل للوجه الأمامي؟",items:["الوجه الخلفي","الوجه العلوي","الوجه الأيمن"],answer:0}},
  {label:"الإنجاز",title:"مستكشف المجسّمات",question:"أكملت تطبيق الطيّ وأزواج الأوجه المتقابلة.",
    task:"أُضيف ختم مستكشف المجسّمات إلى الفهرس.",model:cross},
];
let scene;
let index=0;
let selected=null;
let folded=false;
let hints=0;
let awarded=false;
let speaking=false;
let playing=null;
let voiceRequest=0;
const solved=new Set();
const variants=new Set();
try{awarded=localStorage.getItem(saveKey)==="earned";}catch{}

function stamp(){
  $("stamp").hidden=!awarded;
}
function speechStop(){
  voiceRequest++;
  playing?.pause();
  playing=null;
  window.speechSynthesis?.cancel();
  speaking=false;
  scene?.speak(false);
}
function voiceStatus(value){
  $("audio-status").textContent=value;
  $("audio-status").hidden=!value;
}
function teachingFeedback(text){
  speechStop();
  voiceStatus("");
  $("feedback").textContent=text;
  $("hear").hidden=!text;
}
function speakingNow(value){
  speaking=value;
  scene?.speak(value);
}
function deviceNarration(text,request){
  const synth=window.speechSynthesis;
  const voice=synth?.getVoices().find(item=>/^ar($|-|_)/i.test(item.lang));
  if(!voice||!window.SpeechSynthesisUtterance){
    voiceStatus("تعذّر تشغيل الصوت. النص معروض على الصفحة.");
    return;
  }
  const line=new SpeechSynthesisUtterance(text);
  line.voice=voice;line.lang=voice.lang;line.rate=.92;
  line.onstart=()=>{if(request===voiceRequest)speakingNow(true);};
  line.onend=()=>{if(request===voiceRequest)speakingNow(false);};
  line.onerror=()=>{
    if(request!==voiceRequest)return;
    speakingNow(false);
    voiceStatus("تعذّر تشغيل الصوت. النص معروض على الصفحة.");
  };
  synth.speak(line);
  voiceStatus("قراءة بصوت الجهاز الاصطناعي.");
}
function narrate(text){
  speechStop();
  const request=voiceRequest;
  const file=narration.get(text);
  if(!file){deviceNarration(text,request);return;}
  const clip=new Audio(new URL("./assets/grade-five-audio/"+file,import.meta.url));
  playing=clip;
  const onFailure=()=>{
    if(request!==voiceRequest||playing!==clip)return;
    playing=null;
    speakingNow(false);
    deviceNarration(text,request);
  };
  clip.addEventListener("playing",()=>{
    if(request!==voiceRequest)return;
    speakingNow(true);
    voiceStatus("تعمل القراءة العربية الاصطناعية الآن.");
  });
  clip.addEventListener("waiting",()=>{
    if(request===voiceRequest)speakingNow(false);
  });
  clip.addEventListener("ended",()=>{
    if(request!==voiceRequest)return;
    playing=null;
    speakingNow(false);
    voiceStatus("");
  });
  clip.addEventListener("error",onFailure,{once:true});
  clip.play().catch(onFailure);
}
function model(){
  const p=pages[index];
  if(!scene){
    const figure=$("fallback-figure");
    const item=p.model??currentItems(p)?.[selected??0];
    if(Array.isArray(item))figure.replaceChildren(thumbnail(item));
    else figure.textContent="تخيّل صندوقًا له وجه علوي وسفلي وأمامي وخلفي ووجه على كل جانب.";
    return;
  }
  if(p.cuboid)scene.setCuboid();
  else{
    const items=currentItems(p);
    scene.setNet(p.model??items[selected??0]);
    scene.fold(folded);
  }
}
function thumbnail(shape){
  const view=document.createElement("span");
  view.className="net-thumb";view.ariaHidden="true";
  const minX=Math.min(...shape.map(cell=>cell[0])),minZ=Math.min(...shape.map(cell=>cell[1]));
  for(const [x,z] of shape){
    const tile=document.createElement("i");
    tile.style.gridColumn=x-minX+1;
    tile.style.gridRow=z-minZ+1;
    view.append(tile);
  }
  return view;
}
function currentItems(page){return variants.has(index)?page.retry.items:page.items;}
function showOptions(){
  const options=currentItems(pages[index]);
  $("options").replaceChildren(...(options??[]).map((value,i)=>{
    const button=document.createElement("button");
    button.type="button";button.className="option";
    button.dataset.option=String(i);
    button.setAttribute("aria-pressed",String(i===selected));
    if(Array.isArray(value)){
      button.append(thumbnail(value),document.createTextNode(letters[i]));
      button.ariaLabel="الشبكة "+letters[i];
    }else button.textContent=value;
    button.onclick=()=>{
      selected=i;folded=false;
      for(const item of $("options").children)item.setAttribute("aria-pressed",String(item===button));
      $("check").disabled=false;
      $("fold").textContent="اطوِ الشبكة";
      model();
    };
    return button;
  }));
}
function draw(){
  const p=pages[index];
  $("page-number").textContent=digits.format(index+1)+" من "+digits.format(pages.length);
  $("sheet-title").textContent=p.title;
  $("question").textContent=(variants.has(index)?p.retry.question:null)??p.question;
  $("task").textContent=p.task;
  teachingFeedback("");
  $("back").disabled=index===0;
  $("next").disabled=index===4||(index===3&&(!solved.has(2)||!solved.has(3)));
  $("next").textContent=index===3?"الإنجاز ←":"التالي ←";
  $("fold").hidden=p.cuboid===true||index===4;
  $("fold").disabled=!scene;
  $("fold").textContent=folded?"افتح الشبكة":"اطوِ الشبكة";
  $("check").hidden=!p.items;
  $("check").disabled=selected===null;
  $("hint").hidden=$("explain").hidden=index===4;
  for(const button of $("page-tabs").querySelectorAll("button")){
    const number=Number(button.dataset.page);
    if(number===index)button.setAttribute("aria-current","page");
    else button.removeAttribute("aria-current");
    button.disabled=number===4&&(!solved.has(2)||!solved.has(3));
  }
  showOptions();model();stamp();
}
function go(next){
  if(next<0||next>=pages.length||next===4&&(!solved.has(2)||!solved.has(3)))return;
  speechStop();
  index=next;selected=null;hints=0;folded=index===4;
  draw();
  $("sheet-title").tabIndex=-1;
  $("sheet-title").focus({preventScroll:true});
}
for(const [i,p] of pages.entries()){
  const li=document.createElement("li");
  const button=document.createElement("button");
  button.type="button";button.textContent=p.label;button.dataset.page=String(i);
  button.onclick=()=>go(i);
  li.append(button);$("page-tabs").append(li);
}
$("back").onclick=()=>go(index-1);
$("next").onclick=()=>go(index+1);
$("fold").onclick=()=>{
  folded=!folded;
  $("fold").textContent=folded?"افتح الشبكة":"اطوِ الشبكة";
  scene?.fold(folded);
};
$("read").onclick=()=>narrate($("question").textContent);
$("hear").onclick=()=>narrate($("feedback").textContent);
$("hint").onclick=()=>{
  const p=pages[index];
  hints++;
  teachingFeedback(hints===1?p.hint:
    p.cuboid?"تتبّع الوجه على الجهة الأخرى من الصندوق.":
    "جرّب الطي، وتتبع حافة كل مربع حتى ترى هل تتكرر إحدى الجهات.");
};
$("explain").onclick=()=>{
  const p=pages[index];
  if(index===0){
    folded=true;
    $("fold").textContent="افتح الشبكة";
    model();
    teachingFeedback(p.explain);
    return;
  }
  if(index===1){
    selected=p.answer;folded=true;showOptions();model();
    $("fold").textContent="افتح الشبكة";
    teachingFeedback(p.explain);
    return;
  }
  if(variants.has(index)){
    teachingFeedback(p.hint);
    return;
  }
  variants.add(index);
  selected=null;folded=false;
  draw();
  teachingFeedback(p.explain+" جرّب الآن السؤال الجديد لتثبت فهمك.");
};
$("check").onclick=()=>{
  const p=pages[index];
  const answer=variants.has(index)?p.retry.answer:p.answer;
  if(selected!==answer){
    teachingFeedback("أعد المحاولة. "+p.hint);
    if(!p.cuboid){folded=true;scene?.fold(true);$("fold").textContent="افتح الشبكة";}
    return;
  }
  solved.add(index);
  if(solved.has(2)&&solved.has(3)){
    awarded=true;
    try{localStorage.setItem(saveKey,"earned");}catch{}
  }
  if(!p.cuboid){folded=true;scene?.fold(true);$("fold").textContent="افتح الشبكة";}
  teachingFeedback(index===2?"صحيح. هذه الشبكة تغلق الجهات الست.":
    index===3?"صحيح. وجدت الأوجه المتقابلة.":"صحيح. اكتملت أوجه المكعب.");
  $("next").disabled=index===3&&(!solved.has(2)||!solved.has(3));
  $("page-tabs").querySelector("[data-page='4']").disabled=!awarded||!solved.has(2)||!solved.has(3);
  stamp();
};
$("index").onclick=()=>$("table").showModal();
$("close-index").onclick=()=>$("table").close();
$("restart").onclick=()=>{
  solved.clear();variants.clear();$("table").close();go(0);
};
draw();
import("./grade-five-scene.js").then(module=>{
  scene=module.createBookScene($("paper-scene"));
  $("fold").disabled=false;
  scene.speak(speaking);
  model();
}).catch(()=>{$("fallback").hidden=false;model();});
