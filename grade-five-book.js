import { narration } from "./grade-five-narration.js";
import { curriculum, activeLesson } from "./grade-five-atlas.js";
import { solids } from "./grade-five-solids.js";
import { geometryLessons, renderDiagram } from "./grade-five-geometry.js";
import { buildDiagram } from "./grade-five-diagrams.js";
import { createVoicePanel } from "./grade-five-voice.js";

const $=id=>document.getElementById(id);
const digits=new Intl.NumberFormat("ar-OM",{numberingSystem:"arab"});
const letters=["أ","ب","ج"];
let scene;
let index=0;
let selected=null;
let folded=false;
let hints=0;
let lessonData;
let pageList, rewardPage;
let awarded=false;
let labState;
let speaking=false;
let inMap=true;
let entering=false;
const map=$("door-map");
const lessons = {...geometryLessons, [activeLesson]: solids};
const earnedToday=()=>lessonData.masteryPages.every(page=>solved.has(page));
let playing=null;
let voiceRequest=0;
let objectURL=null;
let atlasMode="atlas";
let unitIndex=null;
let outlineLesson=null;
let foldStep=0;
const atlasCards=$("atlas-cards");
const atlasPins=$("atlas-pins");
let solved=new Set();
let variants=new Set();
const lessonVariants=new Map();
function keys(lesson){
  return lessons[lesson.id].keys??{
    stamp:`warraq.grade-five.${lesson.id}.stamp.v1`,
    progress:`warraq.grade-five.${lesson.id}.progress.v1`,
  };
}
function enterLesson(lesson){
  outlineLesson=lesson;
  lessonData=lessons[lesson.id];
  pageList=lessonData.pages;
  rewardPage=pageList.length-1;
  solved=new Set();
  variants=lessonVariants.get(lesson.id)??new Set();
  lessonVariants.set(lesson.id,variants);
  awarded=false;
  const storage=keys(lesson);
  try{
    awarded=localStorage.getItem(storage.stamp)==="earned";
    const saved=JSON.parse(localStorage.getItem(storage.progress));
    if(Array.isArray(saved)){
      for(const page of saved)if(lessonData.doors.some(door=>door.page===page))solved.add(page);
    }
  }catch{}
  buildLessonNavigation();
  showMap(true);
}
function saveProgress(){
  try{localStorage.setItem(keys(outlineLesson).progress,JSON.stringify([...solved]));}catch{}
}
function stamp(){
  $("stamp").textContent="✦ ختم "+lessonData.stamp;
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
  getLines:()=>({question:$("question").textContent,feedback:activeExplanation()}),
  play:narrate,
  stop:speechStop,
});
function activeExplanation(){
  const note=$("concept-note");
  return $("feedback").textContent||(!note.hidden?note.textContent:"");
}
function model(){
  if(inMap)return;
  const p=pageList[index];
  const description=$("diagram-description");
  description.hidden=true;
  if(p.lab){
    const lab=variants.has(index)?p.retry.lab:p.lab;
    const diagram=buildDiagram(lab,labState??(p.celebration?2:0));
    if(scene){
      scene.setDiagram(diagram,lab,labState??(p.celebration?2:0));
      description.textContent=diagram.description;
      description.hidden=false;
    }else renderDiagram($("fallback-figure"),diagram);
    return;
  }
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
  const options=currentItems(pageList[index]);
  $("options").replaceChildren(...(options??[]).map((value,i)=>{
    const button=document.createElement("button");
    button.type="button";button.className="option";
    button.dataset.option=String(i);
    button.setAttribute("aria-pressed",String(i===selected));
    if(Array.isArray(value)){
      button.append(thumbnail(value),document.createTextNode(letters[i]));
      button.ariaLabel="الشبكة "+letters[i];
    }else if(pageList[index].lab?.kind==="coordinates"){
      const pair=document.createElement("bdi");
      pair.dir="ltr";pair.textContent=value;button.append(pair);
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
  tools.hidden=true;
  tools.replaceChildren();
  if(page.lab&&!page.celebration){
    tools.hidden=false;
    const lab=variants.has(index)?page.retry.lab:page.lab;
    for(const [i,control] of lab.controls.entries()){
      const button=document.createElement("button");
      const step=i+1;
      button.type="button";button.className="quiet";
      button.textContent=control.label;button.setAttribute("aria-pressed","false");
      button.onclick=()=>{
        teachingFeedback("");
        labState=labState===step?0:step;
        for(const [position,item] of [...tools.children].entries()){
          item.setAttribute("aria-pressed",String(position+1===labState));
        }
        note.textContent=labState?control.note:"عاد الرسم إلى وضع البداية.";
        note.hidden=false;
        $("hear").hidden=false;
        model();
      };
      tools.append(button);
    }
    return;
  }
  if(!page.cuboid)return;
  tools.hidden=false;
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
  const p=pageList[index];
  $("page-number").textContent=digits.format(index+1)+" من "+digits.format(pageList.length);
  $("sheet-title").textContent=p.title;
  $("question").textContent=(variants.has(index)?p.retry.question:null)??p.question;
  $("task").textContent=p.task;
  teachingFeedback("");
  $("back").disabled=index===0;
  $("next").disabled=index===rewardPage||(index===rewardPage-1&&!awarded);
  $("next").textContent=index===rewardPage-1?"الإنجاز ←":"التالي ←";
  $("fold").hidden=Boolean(p.lab)||p.cuboid===true||index===rewardPage;
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
    button.disabled=target==="unit"?unitIndex===null:target==="map"?!outlineLesson||!lessons[outlineLesson.id]:false;
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
  for(const id of ["map-prompt","door-map","map-summary","lesson-tabs","lesson-prompt","scene-tools","lesson-work","lesson-footer","page-number","fallback","diagram-description"])$(id).hidden=true;
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
    atlasCards.replaceChildren(...unit.lessons.map((lesson,i)=>{
      let earned=false;
      if(lessons[lesson.id]){
        try{earned=localStorage.getItem(keys(lesson).stamp)==="earned";}catch{}
      }
      const caption=lesson.id+" · ص "+lesson.page+(earned?" · ختم محفوظ":"");
      return atlasTile(lesson.title,caption,digits.format(i+1),()=>{
        outlineLesson=lesson;
        if(lessons[lesson.id])enterLesson(lesson);
        else showAtlas("outline");
      },Boolean(lessons[lesson.id]));
    }));
    $("atlas-note").textContent=unitIndex===geometryUnit
      ?"اختر درسًا. لكل درس خريطة وتجربة هندسية وختم خاص."
      :"افتح درسًا لتطّلع على هدفه.";
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
  $("book-title").textContent=outlineLesson.title;
  $("book-series").textContent=lessonData.series??"الهندسة · ص "+outlineLesson.page;
  document.querySelector(".book").dataset.lesson=lessonData.theme??"solids";
  unitIndex=geometryUnit;
  breadcrumbs(atlasMode);
  inMap=showMap;
  entering=false;
  document.querySelector(".book").dataset.view=showMap?"map":"lesson";
  for(const id of ["map-prompt","door-map","map-summary"])$(id).hidden=!showMap;
  for(const id of ["lesson-tabs","lesson-prompt","scene-tools","lesson-work","lesson-footer","page-number"])$(id).hidden=showMap;
  $("diagram-description").hidden=true;
  $("fallback").hidden=showMap||!rendererFailed;
}
function go(next){
  if(next<0||next>=pageList.length||next===rewardPage&&!awarded)return;
  speechStop();
  displayMode(false);
  scene?.showMap(false);
  index=next;selected=null;labState=undefined;hints=0;foldStep=0;folded=index===rewardPage;
  draw();
  $("sheet-title").tabIndex=-1;
  $("sheet-title").focus({preventScroll:true});
}
let rendererFailed=false;
let doorButtons=[];
function buildLessonNavigation(){
  doorButtons=lessonData.doors.map(({label,page},i)=>{
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
    return button;
  });
  map.replaceChildren(...doorButtons);
  $("page-tabs").replaceChildren(...pageList.map((page,i)=>{
    const li=document.createElement("li"),button=document.createElement("button");
    button.type="button";button.textContent=page.label;button.dataset.page=String(i);
    button.onclick=()=>go(i);
    li.append(button);
    return li;
  }));
  $("page-tabs").style.setProperty("--page-columns",pageList.length);
  $("table-lesson").textContent="الهندسة · "+outlineLesson.title;
  $("lesson-shortcuts").replaceChildren(...lessonData.doors.map(({page})=>{
    const shortcut=document.createElement("button");
    shortcut.type="button";shortcut.dataset.shortcut=String(page);shortcut.className="quiet";
    shortcut.textContent=pageList[page].label;
    shortcut.onclick=()=>{$("table").close();go(page);};
    return shortcut;
  }));
}
function showMap(focus=false){
  speechStop();
  displayMode(true);
  if(scene)map.dataset.projected="";
  else delete map.dataset.projected;
  doorButtons.forEach((button,i)=>{
    const {label,page}=lessonData.doors[i];
    const complete=solved.has(page);
    button.toggleAttribute("data-complete",complete);
    button.removeAttribute("data-opening");
    button.removeAttribute("aria-disabled");
    button.firstElementChild.textContent=complete?"✓":digits.format(i+1);
    button.ariaLabel=complete?label+"، مكتمل":label;
  });
  $("map-title").textContent=lessonData.mapTitle;
  $("map-task").textContent=lessonData.mapTask;
  $("map-count").textContent=digits.format(lessonData.doors.length)+" أسئلة · "+digits.format(solved.size)+" مكتملة";
  $("map-status").textContent=awarded?"ختم "+lessonData.stamp+" في فهرسك. اختر بابًا للمراجعة.":lessonData.mapTip;
  scene?.showMap(true,doorButtons,lessonData.theme);
  stamp();
  if(focus)doorButtons[0].focus({preventScroll:true});
}
$("atlas-home").onclick=()=>showAtlas();
$("trail-index").onclick=()=>showAtlas();
$("trail-unit").onclick=()=>{if(unitIndex!==null)showAtlas("unit");};
$("trail-lesson").onclick=()=>{if(outlineLesson&&lessons[outlineLesson.id])showMap(true);};
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
$("hear").onclick=()=>narrate(activeExplanation());
$("hint").onclick=()=>{
  const p=pageList[index];
  hints++;
  const lab=variants.has(index)?p.retry?.lab:p.lab;
  teachingFeedback(lab?(variants.has(index)||hints>1?lab.controls.at(-1).note:p.hint):hints===1?p.hint:
    p.cuboid?"تتبّع الوجه على الجهة الأخرى من الصندوق.":
    "جرّب الطي، وتتبع حافة كل مربع حتى ترى هل تتكرر إحدى الجهات.");
};
$("explain").onclick=()=>{
  const p=pageList[index];
  if(p.lab&&!p.retry){
    const button=$("concept-tools").lastElementChild;
    if(button&&button.getAttribute("aria-pressed")!=="true")button.click();
    teachingFeedback(p.explain);
    return;
  }
  if(index===0){
    folded=true;
    $("fold").textContent="افتح الشبكة";
    model();
    teachingFeedback(p.explain);
    return;
  }
  if(index===1&&!p.lab){
    selected=p.answer;folded=true;showOptions();model();
    $("fold").textContent="افتح الشبكة";
    teachingFeedback(p.explain);
    return;
  }
  if(variants.has(index)){
    teachingFeedback(p.lab?p.retry.lab.controls.at(-1).note:p.hint);
    return;
  }
  variants.add(index);
  selected=null;folded=false;labState=undefined;
  draw();
  teachingFeedback(p.explain+" جرّب الآن السؤال الجديد لتثبت فهمك.");
};
$("check").onclick=()=>{
  const p=pageList[index];
  const answer=variants.has(index)?p.retry.answer:p.answer;
  if(selected!==answer){
    const hint=variants.has(index)&&p.retry.lab?p.retry.lab.controls.at(-1).note:p.hint;
    teachingFeedback("أعد المحاولة. "+hint);
    if(!p.cuboid&&!p.lab){folded=true;scene?.fold(true);$("fold").textContent="افتح الشبكة";}
    return;
  }
  solved.add(index);
  saveProgress();
  if(earnedToday()){
    awarded=true;
    try{localStorage.setItem(keys(outlineLesson).stamp,"earned");}catch{}
  }
  if(!p.cuboid&&!p.lab){folded=true;scene?.fold(true);$("fold").textContent="افتح الشبكة";}
  teachingFeedback(p.lab?(variants.has(index)?"صحيح. طبّقت الفكرة على مثال جديد.":"صحيح. "+p.explain):
    p.success??(index===2?"صحيح. هذه الشبكة تغلق الجهات الست.":
    index===3?"صحيح. وجدت الأوجه المتقابلة.":"صحيح. اكتملت أوجه المكعب."));
  $("next").disabled=index===rewardPage-1&&!awarded;
  $("page-tabs").querySelector("[data-page='"+rewardPage+"']").disabled=!awarded;
  if(p.lab)scene?.celebrate();
  stamp();
};
$("index").onclick=()=>$("table").showModal();
$("close-index").onclick=()=>$("table").close();
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
