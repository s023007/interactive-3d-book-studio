import { narration } from "./grade-five-narration.js";

const $=id=>document.getElementById(id);
const digits=new Intl.NumberFormat("ar-OM",{numberingSystem:"arab"});
const saveKey="warraq.grade-five.cube-stamp.v1";
const progressKey="warraq.grade-five.cube-progress.v1";
const letters=["أ","ب","ج"];
const cross=[[0,0],[-1,0],[1,0],[2,0],[0,-1],[0,1]];
const overlap=[[0,0],[-1,0],[1,0],[2,0],[-1,-1],[1,-1]];
const offset=[[0,0],[-1,0],[1,0],[2,0],[-1,-1],[2,1]];
const strip=[[0,0],[-2,0],[-1,0],[1,0],[2,0],[3,0]];
const stepped=[[0,0],[1,0],[2,0],[0,1],[-1,1],[-2,1]];
const doubleBack=[[0,0],[1,0],[2,0],[3,0],[0,1],[2,1]];
const pages=[
  {label:"اكتشف", title:"من الورق إلى مجسّم", question:"بعد طي الشبكة، كم وجهًا يكوّن المكعب؟",
    task:"اطوِ الشبكة ثم افتحها لترى أين يذهب كل وجه.", hint:"لاحظ أن المربعات تتصل على حوافها.",
    explain:"ترتفع الأوجه على حواف الورقة حتى تغلق المكعب من جهاته الست.", model:cross, items:["أربعة أوجه","ستة أوجه","ثمانية أوجه"], answer:1},
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
  {label:"ميّز", title:"مكعب أم صندوق؟", question:"أي وصف يميّز المكعب عن صندوق مستطيل تختلف أبعاده؟",
    task:"انظر إلى أوجه المجسّم وقارن أطوال الحواف.", hint:"فكّر في عرض الوجه وطوله. هل يختلفان في المكعب؟",
    explain:"في المكعب ستة أوجه مربعة متطابقة. وقد تختلف أبعاد أوجه متوازي المستطيلات.",
    items:["له ستة أوجه","كل أوجهه مربعة ومتطابقة","له أوجه متقابلة"], answer:1, cuboid:true,
    success:"صحيح. شكل الأوجه وتطابقها هو الوصف الذي يميّز المكعب.",
    retry:{question:"صندوق طوله أربعة وعرضه ثلاثة وارتفاعه اثنان. هل هو مكعب؟",items:["نعم، لأن له ستة أوجه","لا، لأن أبعاده مختلفة","نعم، لأن زواياه قائمة"],answer:1}},
  {label:"ركّب", title:"ألواح متوازي المستطيلات", question:"صندوق أبعاده اثنان وثلاثة وأربعة. ما قياس اللوح المقابل للوح اثنين في ثلاثة؟",
    task:"ابحث عن الوجه المطابق في الحجم على الجهة الأخرى.", hint:"اللوح المقابل يغطي فتحة لها الطول والعرض نفسيهما.",
    explain:"يتطابق كل وجه مع الوجه المقابل. اللوح اثنان في ثلاثة يقابله لوح اثنان في ثلاثة.",
    items:["٢ × ٤","٣ × ٤","٢ × ٣"], answer:2, cuboid:true,
    success:"صحيح. الأبعاد نفسها للوجهين المتقابلين.",
    retry:{question:"في الصندوق نفسه، أي لوح يطابق وجهًا أبعاده ثلاثة في أربعة؟",items:["٣ × ٤","٢ × ٤","٢ × ٣"],answer:0}},
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
let inMap=true;
let entering=false;
const map=$("door-map");
const doors=[
  {label:"باب الاكتشاف",page:0},
  {label:"باب التجربة",page:1},
  {label:"باب التحدّي",page:2},
  {label:"أوجه الصندوق",page:3},
  {label:"مكعب أم صندوق؟",page:4},
  {label:"ألواح الصندوق",page:5},
];
const rewardPage=pages.length-1;
const masteryPages=[2,3,4,5];
const earnedToday=()=>masteryPages.every(page=>solved.has(page));
let playing=null;
let voiceRequest=0;
const solved=new Set();
const variants=new Set();
try{
  awarded=localStorage.getItem(saveKey)==="earned";
  const saved=JSON.parse(localStorage.getItem(progressKey));
  if(Array.isArray(saved)){
    for(const page of saved)if(doors.some(door=>door.page===page))solved.add(page);
  }
}catch{}
function saveProgress(){
  try{localStorage.setItem(progressKey,JSON.stringify([...solved]));}catch{}
}

function stamp(){
  $("stamp").hidden=$("map-stamp").hidden=!awarded;
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
  const clip=new Audio(new URL("./assets/grade-five-audio/"+file+"?v=2",import.meta.url));
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
  if(inMap)return;
  const p=pages[index];
  if(!scene){
    const figure=$("fallback-figure");
    const item=p.model??currentItems(p)?.[selected??0];
    if(Array.isArray(item))figure.replaceChildren(thumbnail(item));
    else figure.textContent="للصندوق وجه علوي وسفلي وأمامي وخلفي ووجه على كل جانب.";
    return;
  }
  if(p.cuboid)scene.setCuboid(index);
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
  $("next").disabled=index===rewardPage||(index===rewardPage-1&&!awarded);
  $("next").textContent=index===rewardPage-1?"الإنجاز ←":"التالي ←";
  $("fold").hidden=p.cuboid===true||index===rewardPage;
  $("fold").disabled=!scene;
  $("fold").textContent=folded?"افتح الشبكة":"اطوِ الشبكة";
  $("check").hidden=!p.items;
  $("check").disabled=selected===null;
  $("hint").hidden=$("explain").hidden=index===rewardPage;
  for(const button of $("page-tabs").querySelectorAll("button")){
    const number=Number(button.dataset.page);
    if(number===index)button.setAttribute("aria-current","page");
    else button.removeAttribute("aria-current");
    button.disabled=number===rewardPage&&!awarded;
  }
  showOptions();model();stamp();
}
function displayMode(showMap){
  inMap=showMap;
  entering=false;
  document.querySelector(".book").dataset.view=showMap?"map":"lesson";
  for(const id of ["map-prompt","door-map","map-summary"])$(id).hidden=!showMap;
  for(const id of ["lesson-tabs","lesson-prompt","scene-tools","lesson-work","lesson-footer","page-number"])$(id).hidden=showMap;
  $("fallback").hidden=showMap||!rendererFailed;
}
function go(next){
  if(next<0||next>=pages.length||next===rewardPage&&!awarded)return;
  speechStop();
  displayMode(false);
  scene?.showMap(false);
  index=next;selected=null;hints=0;folded=index===rewardPage;
  draw();
  $("sheet-title").tabIndex=-1;
  $("sheet-title").focus({preventScroll:true});
}
let rendererFailed=false;
const doorButtons=doors.map(({label,page},i)=>{
  const button=document.createElement("button");
  button.type="button";button.className="door";
  const badge=document.createElement("span");
  badge.ariaHidden="true";
  const title=document.createElement("strong");
  title.textContent=label;
  button.append(badge,title);
  button.onclick=()=>{
    if(entering)return;
    entering=true;
    button.dataset.opening="";
    for(const other of doorButtons)other.setAttribute("aria-disabled","true");
    $("map-status").textContent="يتجه الراكون إلى "+label+".";
    const open=()=>go(page);
    if(scene&&!document.hidden)scene.visitDoor(i,open);
    else open();
  };
  map.append(button);
  return button;
});
function showMap(focus=false){
  speechStop();
  displayMode(true);
  if(scene)map.dataset.projected="";
  else delete map.dataset.projected;
  doorButtons.forEach((button,i)=>{
    const {label,page}=doors[i];
    const complete=solved.has(page);
    button.toggleAttribute("data-complete",complete);
    button.removeAttribute("data-opening");
    button.removeAttribute("aria-disabled");
    button.firstElementChild.textContent=complete?"✓":digits.format(i+1);
    button.ariaLabel=complete?label+"، مكتمل":label;
  });
  $("map-count").textContent=digits.format(doors.length)+" أسئلة · "+digits.format(solved.size)+" مكتملة";
  $("map-status").textContent=awarded?"ختم مستكشف المجسّمات في فهرسك. اختر بابًا للمراجعة.":
    "لكل محطة سؤال. ابدأ بأيّ سؤال، وأكمل التطبيقات الأربعة لتحصل على الختم.";
  scene?.showMap(true,doorButtons);
  stamp();
  if(focus)doorButtons[0].focus({preventScroll:true});
}
for(const [i,p] of pages.entries()){
  const li=document.createElement("li");
  const button=document.createElement("button");
  button.type="button";button.textContent=p.label;button.dataset.page=String(i);
  button.onclick=()=>go(i);
  li.append(button);$("page-tabs").append(li);
}
$("back").onclick=()=>go(index-1);
$("show-map").onclick=()=>showMap(true);
$("map-stamp").onclick=()=>$("table").showModal();
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
  saveProgress();
  if(earnedToday()){
    awarded=true;
    try{localStorage.setItem(saveKey,"earned");}catch{}
  }
  if(!p.cuboid){folded=true;scene?.fold(true);$("fold").textContent="افتح الشبكة";}
  teachingFeedback(p.success??(index===2?"صحيح. هذه الشبكة تغلق الجهات الست.":
    index===3?"صحيح. وجدت الأوجه المتقابلة.":"صحيح. اكتملت أوجه المكعب."));
  $("next").disabled=index===rewardPage-1&&!awarded;
  $("page-tabs").querySelector("[data-page='"+rewardPage+"']").disabled=!awarded;
  stamp();
};
$("index").onclick=()=>$("table").showModal();
$("close-index").onclick=()=>$("table").close();
for(const shortcut of $("table").querySelectorAll("[data-shortcut]")){
  shortcut.onclick=()=>{
    $("table").close();
    go(Number(shortcut.dataset.shortcut));
  };
}
$("restart").onclick=()=>{
  solved.clear();variants.clear();saveProgress();$("table").close();showMap(true);
};
showMap();
import("./grade-five-scene.js").then(module=>{
  scene=module.createBookScene($("paper-scene"));
  $("fold").disabled=false;
  scene.speak(speaking);
  if(inMap)showMap();
  else model();
}).catch(()=>{
  rendererFailed=true;
  if(!inMap){$("fallback").hidden=false;model();}
});
