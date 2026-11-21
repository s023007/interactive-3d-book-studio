import {challenge,digitsOf,digitValue,numeral,placeDigit,places,training} from "./model.mjs";

const byId=id=>document.getElementById(id);
const number=value=>numeral.format(value);
const menu=byId("book-index");
const slots=byId("slots"), tiles=byId("tiles"), next=byId("next");
const storageKey="warraq-v2.number-press.complete";
const viewIds=["home","press","result"];
let selected=null, filled=new Set(), step=0, answered=false, dragging=null;
let printed=false;
try {printed=localStorage.getItem(storageKey)==="yes";} catch {}

function show(id,moveFocus=true){
  for(const view of viewIds)byId(view).hidden=view!==id;
  if(moveFocus){
    document.querySelector("#"+id+" h1").focus({preventScroll:true});
    window.scrollTo({top:0,behavior:"instant"});
  }
}

function message(text,kind=""){
  byId("feedback").textContent=text;
  byId("feedback").dataset.kind=kind;
}

function select(digit){
  selected=digit;
  for(const button of tiles.children)button.setAttribute("aria-pressed",String(Number(button.dataset.digit)===digit));
}

function trySlot(index,digit=selected){
  if(step!==0||filled.has(index))return;
  if(digit===null){message("اختر قالب رقم أولًا.");return;}
  const used=[...tiles.children].find(button=>Number(button.dataset.digit)===digit);
  if(!used||used.disabled)return;
  const outcome=placeDigit(training.number,index,digit);
  const slot=slots.children[index];
  for(const item of slots.children)item.classList.remove("needs-review");
  if(!outcome.correct){
    slot.classList.add("needs-review");
    message("قيمة "+number(digit)+" هنا "+number(outcome.value)+". انظر إلى اسم الخانة وجرّب موضعًا آخر.","retry");
    return;
  }
  filled.add(index);
  slot.querySelector("b").textContent=number(digit);
  slot.classList.add("filled");
  slot.setAttribute("aria-label",places[index]+"، "+number(digit));
  slot.setAttribute("aria-disabled","true");
  used.disabled=true;
  used.classList.add("used");
  select(null);
  byId("clear").hidden=false;
  if(filled.size===digitsOf(training.number).length){
    message("اكتملت القوالب. وضعنا الصفر في خانة المئات ليبقى كل رقم في منزلته.","correct");
    next.textContent="جرّب بطاقة جديدة";
    next.hidden=false;
  }else message("وُضع "+number(digit)+" في خانة "+places[index]+".","correct");
}

function button(label,className){
  const item=document.createElement("button");
  item.type="button";
  item.className=className;
  item.textContent=label;
  return item;
}

function buildPress(focus=false){
  filled=new Set();selected=null;step=0;answered=false;
  byId("placing").hidden=false;
  byId("value-task").hidden=true;
  byId("clear").hidden=next.hidden=true;
  byId("level-name").textContent="ركّب العدد";
  byId("machine").dataset.step="training";
  byId("instruction").textContent="هذه بطاقة المطبعة. اختر قالب رقم ثم المس خانته، أو اسحبه إليها.";
  byId("target-number").textContent=number(training.number);
  message("");
  slots.replaceChildren(...places.map((name,index)=>{
    const slot=button("","slot");
    slot.dataset.slot=index;
    slot.setAttribute("aria-label",name+"، خانة فارغة");
    const digit=document.createElement("b");
    digit.textContent="·";
    const label=document.createElement("span");
    label.textContent=name;
    slot.append(digit,label);
    slot.onclick=()=>trySlot(index);
    return slot;
  }));
  tiles.replaceChildren(...training.tiles.map(digit=>{
    const tile=button(number(digit),"tile");
    tile.dataset.digit=digit;
    tile.setAttribute("aria-pressed","false");
    tile.setAttribute("aria-label","القالب "+number(digit));
    tile.onclick=()=>select(selected===digit?null:digit);
    return tile;
  }));
  if(focus)tiles.firstElementChild.focus({preventScroll:true});
}

function newCard(){
  step=1;
  next.hidden=true;
  byId("placing").hidden=true;
  byId("value-task").hidden=false;
  byId("machine").dataset.step="challenge";
  byId("level-name").textContent="جرّب وحدك";
  byId("instruction").textContent="انتقل الرقم ٤ إلى منزلة جديدة. ما قيمته في البطاقة الجديدة؟";
  byId("target-number").textContent=number(challenge.number);
  message("");
  const options=byId("value-options");
  options.replaceChildren(...challenge.options.map(value=>{
    const option=button(number(value),"value");
    option.onclick=()=>{
      if(answered)return;
      for(const item of options.children)item.classList.remove("needs-review");
      if(value!==digitValue(challenge.number,challenge.digit)){
        option.classList.add("needs-review");
        message("ابدأ باسم المنزلة التي يشغلها ٤ في البطاقة الجديدة. جرّب مرة أخرى.","retry");
        return;
      }
      answered=true;
      option.classList.add("filled");
      for(const item of options.children)item.setAttribute("aria-disabled","true");
      message("٤ في منزلة عشرات الآلاف. قيمته ٤٠٬٠٠٠.","correct");
      next.textContent="اطبع البطاقة";
      next.hidden=false;
      next.focus({preventScroll:true});
    };
    return option;
  }));
  options.firstElementChild.focus({preventScroll:true});
}

function complete(){
  printed=true;
  try {localStorage.setItem(storageKey,"yes");} catch {}
  byId("index-progress").textContent="✓";
  show("result");
}

function start(){
  if(menu.open)menu.close();
  buildPress();
  show("press");
}
for(const item of document.querySelectorAll(".start"))item.addEventListener("click",start);
byId("replay").onclick=start;
byId("clear").onclick=()=>buildPress(true);
byId("open-index").onclick=()=>{
  byId("index-progress").textContent=printed?"✓":"↗";
  menu.showModal();
};
next.onclick=()=>{
  if(step===0&&filled.size===places.length)newCard();
  else if(step===1&&answered)complete();
};
document.querySelector(".brand").onclick=event=>{event.preventDefault();show("home");};

tiles.addEventListener("pointerdown",event=>{
  const tile=event.target.closest(".tile");
  if(!tile||tile.disabled||event.button!==0||dragging)return;
  dragging={tile,pointer:event.pointerId,x:event.clientX,y:event.clientY,ghost:null};
});
window.addEventListener("pointermove",event=>{
  if(dragging?.pointer!==event.pointerId)return;
  if(!dragging.ghost&&Math.hypot(event.clientX-dragging.x,event.clientY-dragging.y)>9){
    const ghost=document.createElement("span");
    ghost.className="tile drag-ghost";
    ghost.textContent=dragging.tile.textContent;
    ghost.setAttribute("aria-hidden","true");
    document.body.append(ghost);
    dragging.ghost=ghost;
  }
  if(dragging.ghost){
    dragging.ghost.style.left=event.clientX+"px";
    dragging.ghost.style.top=event.clientY+"px";
    const target=document.elementFromPoint(event.clientX,event.clientY)?.closest(".slot");
    for(const item of slots.children)item.classList.toggle("drag-target",item===target);
  }
});
function stopDrag(event){
  if(dragging?.pointer!==event.pointerId)return;
  const state=dragging;
  dragging=null;
  state.ghost?.remove();
  for(const item of slots.children)item.classList.remove("drag-target");
  if(!state.ghost||event.type!=="pointerup")return;
  const target=document.elementFromPoint(event.clientX,event.clientY)?.closest(".slot");
  if(target)trySlot(Number(target.dataset.slot),Number(state.tile.dataset.digit));
  const blockClick=event=>event.stopImmediatePropagation();
  window.addEventListener("click",blockClick,{capture:true,once:true});
  setTimeout(()=>window.removeEventListener("click",blockClick,true),0);
}
window.addEventListener("pointerup",stopDrag);
window.addEventListener("pointercancel",stopDrag);
