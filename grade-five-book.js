import { narration } from "./grade-five-narration.js";
import { curriculum, activeLesson } from "./grade-five-atlas.js";
import { createVoicePanel } from "./grade-five-voice.js";

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
let objectURL=null;
let atlasMode="atlas";
let unitIndex=null;
let outlineLesson=null;
let foldStep=0;
const atlasCards=$("atlas-cards");
const atlasPins=$("atlas-pins");
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
  if(objectURL){URL.revokeObjectURL(objectURL);objectURL=null;}
  window.speechSynthesis?.cancel();
  speaking=false;
  scene?.speak(false);
}
function voiceStatus(value){
  $("audio-status").textContent=value;
  $("audio-status").hidden=!value;
  if($("voice-panel").open)$("voice-panel-status").textContent=value;
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
function deviceNarration(text,request,onUnavailable){
  const synth=window.speechSynthesis;
  const voice=synth?.getVoices().find(item=>/^ar($|-|_)/i.test(item.lang));
  if(!voice||!window.SpeechSynthesisUtterance){onUnavailable();return;}
  const line=new SpeechSynthesisUtterance(text);
  line.voice=voice;line.lang=voice.lang;line.rate=.92;
  line.onstart=()=>{if(request===voiceRequest){speakingNow(true);voiceStatus("قراءة بصوت الجهاز العربي.");}};
  line.onend=()=>{if(request===voiceRequest){speakingNow(false);voiceStatus("");}};
  line.onerror=()=>{if(request===voiceRequest){speakingNow(false);onUnavailable();}};
  synth.speak(line);
}
async function narrate(text){
  if(!text)return;
  speechStop();
  const request=voiceRequest;
  const localClip=await voices.getClip(text);
  if(request!==voiceRequest)return;
  const rejected=()=>voiceStatus("لا يوجد تسجيل قابل للتشغيل. افتح «صوت الراكون» للتسجيل أو رفع ملف. النص معروض على الصفحة.");
  const file=narration.get(text);
  const reserve=()=>{
    if(request!==voiceRequest)return;
    if(!file||!voices.allowFallback()){rejected();return;}
    playClip(new URL("./assets/grade-five-audio/"+file+"?v=2",import.meta.url),"تعمل القراءة العربية الاصطناعية الآن.",rejected);
  };
  function playClip(url,status,onFailure){
    const clip=new Audio(url);
    playing=clip;
    const failed=()=>{
      if(request!==voiceRequest||playing!==clip)return;
      playing=null;
      speakingNow(false);
      if(objectURL){URL.revokeObjectURL(objectURL);objectURL=null;}
      onFailure();
    };
    clip.addEventListener("playing",()=>{
      if(request!==voiceRequest)return;
      speakingNow(true);
      voiceStatus(status);
    });
    clip.addEventListener("waiting",()=>{
      if(request===voiceRequest)speakingNow(false);
    });
    clip.addEventListener("ended",()=>{
      if(request!==voiceRequest)return;
      playing=null;
      if(objectURL){URL.revokeObjectURL(objectURL);objectURL=null;}
      speakingNow(false);
      voiceStatus($("voice-panel").open?"انتهى التشغيل. يمكنك تجربة التسجيل مرة أخرى.":"");
    });
    clip.addEventListener("error",failed,{once:true});
    clip.play().catch(failed);
  }
  if(localClip instanceof Blob){
    objectURL=URL.createObjectURL(localClip);
    playClip(objectURL,"يعمل التسجيل المحفوظ على جهازك.",rejected);
  }else deviceNarration(text,request,reserve);
}
const voices=createVoicePanel({
  getLines:()=>({question:$("question").textContent,feedback:$("feedback").textContent}),
  play:narrate,
  stop:speechStop,
});
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
      selected=i;folded=false;foldStep=0;
      for(const item of $("options").children)item.setAttribute("aria-pressed",String(item===button));
      $("check").disabled=false;
      $("fold").textContent="اطوِ الشبكة";
      model();
    };
    return button;
  }));
}
function renderConceptTools(page){
  const tools=$("concept-tools");
  const note=$("concept-note");
  note.hidden=true;note.textContent="";
  tools.hidden=!page.cuboid;
  tools.replaceChildren();
  if(!page.cuboid)return;
  const pairs=[
    ["اليمين واليسار","هذان الوجهان على طرفي الصندوق، ويغطيان المكان نفسه من حيث الأبعاد."],
    ["الأعلى والأسفل","يمكن أن يغطّي المستطيل نفسه أعلى الصندوق أو أسفله."],
    ["الأمام والخلف","لاحظ أن الوجه الخلفي يطابق الوجه الأمامي في الطول والعرض."],
  ];
  const dimensions=["٢ × ٣","٣ × ٤","٢ × ٤"];
  for(const [i,[label,description]] of pairs.entries()){
    const button=document.createElement("button");
    button.type="button";button.className="quiet";
    button.textContent=label;button.setAttribute("aria-pressed","false");
    button.onclick=()=>{
      const active=button.getAttribute("aria-pressed")!=="true";
      for(const item of tools.children)item.setAttribute("aria-pressed",String(item===button&&active));
      scene?.inspectPair(active?i:-1);
      note.hidden=!active;note.textContent=active?description+(index===5?" أبعاد كل وجه "+dimensions[i]+".":""):"";
    };
    tools.append(button);
  }
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
  $("fold-step").hidden=$("fold").hidden;
  $("fold-step").disabled=!scene;
  renderConceptTools(p);
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
const geometryUnit=curriculum.findIndex(unit=>unit.lessons.some(lesson=>lesson.id===activeLesson));
function breadcrumbs(view){
  const entries=[["trail-index","atlas"],["trail-unit","unit"],["trail-lesson","map"]];
  for(const [id,target] of entries){
    const button=$(id);
    if(view===target||target==="map"&&view==="lesson"||target==="map"&&view==="outline")button.setAttribute("aria-current","step");
    else button.removeAttribute("aria-current");
    button.disabled=target==="unit"?unitIndex===null:target==="map"?unitIndex!==geometryUnit:false;
  }
}
function atlasTile(name,caption,number,activate,featured=false){
  const button=document.createElement("button");
  button.type="button";
  if(featured)button.className="featured";
  const numberCell=document.createElement("span");
  numberCell.className="atlas-number";numberCell.textContent=number;numberCell.ariaHidden="true";
  const text=document.createElement("span"),title=document.createElement("b"),subtitle=document.createElement("small");
  title.textContent=name;subtitle.textContent=caption;
  text.append(title,subtitle);button.append(numberCell,text);
  button.onclick=activate;
  return button;
}
function showAtlasScene(){
  if(!scene)return;
  const cards=[...atlasCards.querySelectorAll("button")];
  const pins=cards.map((card,i)=>{
    const pin=document.createElement("button");
    pin.type="button";
    pin.className=card.className;
    pin.setAttribute("aria-label","معلم "+card.querySelector("b").textContent);
    const number=document.createElement("span");
    number.textContent=digits.format(i+1);
    number.ariaHidden="true";
    pin.append(number);
    pin.onclick=()=>card.click();
    return pin;
  });
  atlasPins.replaceChildren(...pins);
  atlasPins.hidden=!pins.length;
  scene.showAtlas(atlasMode==="atlas"?"index":"unit",unitIndex??1,pins);
}
function showAtlas(view="atlas",focus=true){
  speechStop();
  atlasMode=view;
  inMap=false;
  entering=false;
  document.querySelector(".book").dataset.view=view;
  for(const id of ["map-prompt","door-map","map-summary","lesson-tabs","lesson-prompt","scene-tools","lesson-work","lesson-footer","page-number","fallback"])$(id).hidden=true;
  $("atlas-summary").hidden=atlasCards.hidden=false;
  $("index").hidden=true;
  if(view==="atlas"){
    $("book-title").textContent="أطلس الرياضيات";
    $("book-series").textContent="الفصل الدراسي الأول · الصف الخامس";
    atlasCards.replaceChildren(...curriculum.map((unit,i)=>atlasTile(unit.label,unit.region+" · "+digits.format(unit.lessons.length)+" دروس",digits.format(i+1),()=>{
      unitIndex=i;outlineLesson=null;showAtlas("unit");
    },i===geometryUnit)));
    $("atlas-note").textContent="اختر منطقة في خريطة الفهرس لفتح خريطة دروسها.";
  }else if(view==="unit"){
    const unit=curriculum[unitIndex];
    $("book-title").textContent="خريطة "+unit.label;
    $("book-series").textContent=unit.region+" · "+digits.format(unit.lessons.length)+" دروس";
    atlasCards.replaceChildren(...unit.lessons.map((lesson,i)=>atlasTile(lesson.title,lesson.id+" · ص "+lesson.page,digits.format(i+1),()=>{
      outlineLesson=lesson;
      if(lesson.id===activeLesson)showMap(true);
      else showAtlas("outline");
    },lesson.id===activeLesson)));
    $("atlas-note").textContent="افتح درسًا لتطّلع على هدفه. درس المجسّمات جاهز بالتفاعلات والأسئلة.";
  }else{
    $("book-title").textContent=outlineLesson.title;
    $("book-series").textContent=curriculum[unitIndex].label+" · ص "+outlineLesson.page;
    const card=document.createElement("article");
    card.className="outline-card";
    const title=document.createElement("h2"),goal=document.createElement("p");
    title.textContent="هدف الدرس";goal.textContent=outlineLesson.goal;
    card.append(title,goal);
    atlasCards.replaceChildren(card);
    $("atlas-note").textContent="هذا مدخل خريطة الدرس. أنشطة هذا الدرس قيد الإعداد.";
  }
  breadcrumbs(view);
  showAtlasScene();
  if(focus){
    $("book-title").tabIndex=-1;
    $("book-title").focus({preventScroll:true});
  }
}
function displayMode(showMap){
  atlasMode=showMap?"map":"lesson";
  atlasPins.hidden=true;
  atlasCards.hidden=$("atlas-summary").hidden=true;
  $("index").hidden=false;
  $("book-title").textContent="المكعب ومتوازي المستطيلات";
  $("book-series").textContent="الهندسة · الصفحتان ٤٠–٤١ من الكتاب المدرسي";
  unitIndex=geometryUnit;
  breadcrumbs(atlasMode);
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
  index=next;selected=null;hints=0;foldStep=0;folded=index===rewardPage;
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
$("atlas-home").onclick=()=>showAtlas();
$("trail-index").onclick=()=>showAtlas();
$("trail-unit").onclick=()=>{if(unitIndex!==null)showAtlas("unit");};
$("trail-lesson").onclick=()=>{if(unitIndex===geometryUnit)showMap(true);};
$("back").onclick=()=>go(index-1);
$("show-map").onclick=()=>showMap(true);
$("map-stamp").onclick=()=>$("table").showModal();
$("next").onclick=()=>go(index+1);
$("fold").onclick=()=>{
  foldStep=0;
  folded=!folded;
  $("fold").textContent=folded?"افتح الشبكة":"اطوِ الشبكة";
  scene?.fold(folded);
};
$("fold-step").onclick=()=>{
  const stops=[.37,.72,1,0];
  const notes=[
    "ترتفع الأوجه حول الحواف المشتركة. تتبّع وجهًا واحدًا بعينك.",
    "تابع الحواف المتحركة. افحص هل بقيت جهة تحتاج إلى وجه.",
    "اكتمل الطي. تحقّق هل يغطي كل وجه جهة مختلفة.",
    "عادت الأوجه إلى الورقة. يمكنك إعادة الطي من البداية.",
  ];
  const point=stops[foldStep];
  scene?.foldPart(point);
  folded=point===1;
  $("fold").textContent=folded?"افتح الشبكة":"اطوِ الشبكة";
  teachingFeedback(notes[foldStep]);
  foldStep=(foldStep+1)%stops.length;
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
showAtlas("atlas",false);
import("./grade-five-scene.js").then(module=>{
  scene=module.createBookScene($("paper-scene"));
  $("fold").disabled=$("fold-step").disabled=false;
  scene.speak(speaking);
  if(inMap)showMap();
  else if(atlasMode==="lesson")model();
  else showAtlasScene();
}).catch(()=>{
  rendererFailed=true;
  if(atlasMode==="lesson"){$("fallback").hidden=false;model();}
});
