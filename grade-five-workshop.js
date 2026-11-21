import {challengeNets,inspectFolds,panelColors,practiceNets,reviewNets,workshopLines} from "./grade-five-workshop-data.js";

const stampKey="warraq.grade-five.workshop.stamp.v1";
const digits=new Intl.NumberFormat("ar-OM",{numberingSystem:"arab"});
const names={artisan:"صانعة الصناديق",raccoon:"الراكون"};
const titles=["جرّب الطيّ","أصلح الصندوق","اصنع صندوقًا جديدًا"];
const $=id=>document.getElementById(id);

export function createWorkshop({scene,enter,exit,narrate,stop,openVoice,report}){
  const canvas=$("paper-scene"), targets=$("workshop-faces");
  const netChoices=$("workshop-nets");
  const next=$("workshop-next");
  let active=false, round=0, design=null, plan=null, closed=new Set(), conflicts=new Set();
  let gesture=null, complete=false, repairReady=false, cue="arrive", buttons=[], autoVoice=false, savedStamp=false;
  let form="workshop", helped=false;
  const attempted=new Set();

  function earned(){
    try{return localStorage.getItem(stampKey)==="earned";}catch{return false;}
  }
  function lineFor(text){
    return Object.entries(workshopLines).find(([,line])=>line.text===text)?.[0];
  }
  function say(key){
    stop();
    cue=key;
    const line=workshopLines[key];
    $("workshop-audio").hidden=true;
    $("workshop-speaker").textContent=names[line.speaker];
    $("workshop-line").textContent=line.text;
    $("workshop-caption").dataset.speaker=line.speaker;
    scene()?.workshopCue(line.speaker);
    if(autoVoice)narrate(line.text,true);
  }
  function netThumbnail(faces,numbered){
    const thumb=document.createElement("span");
    thumb.className="workshop-net";
    thumb.dir="ltr";
    const left=Math.min(...faces.map(face=>face.cell[0]));
    const top=Math.min(...faces.map(face=>face.cell[1]));
    for(const {id,cell:[x,z]} of faces){
      const tile=document.createElement("i");
      tile.style.gridColumn=x-left+1;
      tile.style.gridRow=z-top+1;
      tile.style.setProperty("--face-color",panelColors[id]);
      if(numbered){
        tile.textContent=digits.format(id+1);
        tile.toggleAttribute("data-folded",closed.has(id));
        tile.toggleAttribute("data-conflict",conflicts.has(id));
      }
      thumb.append(tile);
    }
    return thumb;
  }
  function paint(){
    $("workshop-stage-title").textContent=complete?"صانع المكعّبات":titles[round];
    $("workshop-count").textContent=plan&&!complete?digits.format(closed.size)+" من ٥ طيّات":"";
    $("workshop-fallback").hidden=!!scene()||!plan;
    if(!scene()&&plan)$("workshop-flat").replaceChildren(netThumbnail(plan,true));
    netChoices.hidden=round!==2||complete;
    targets.hidden=!plan||complete;
    for(const [i,button] of buttons.entries()){
      const id=i+1;
      button.setAttribute("aria-pressed",String(closed.has(id)));
      button.toggleAttribute("data-conflict",conflicts.has(id));
    }
    $("workshop-stamp").hidden=!complete;
    $("workshop-skill").hidden=!complete;
    $("workshop-hint").hidden=complete||!plan;
    $("workshop-back").hidden=complete;
    next.hidden=!repairReady&&!complete;
    next.textContent=complete?"عد إلى خريطة الدرس":round===0?"جرّب شبكة أخرى":"ابدأ التحدّي";
    $("workshop").dataset.phase=complete?"earned":!plan?"choose":conflicts.size?"overlap":"fold";
    $("workshop-support").textContent=complete?(savedStamp?"حُفظ الختم في خريطة الدرس.":"أحرزت الختم في هذه المحاولة."):
      conflicts.size?"الوجهان المعلّمان هما "+[...conflicts].map(id=>digits.format(id+1)).join(" و")+".":!plan?
        "اختر إحدى الشبكتين لبدء المحاولة.":scene()?"اسحب وجهًا إلى أعلى، أو المس رقمه لتطويه أو تفتحه.":"استخدم أرقام الأوجه لتجربة ترتيب الطيّ.";
  }
  function refresh(){
    const engine=scene();
    if(engine&&plan){
      engine.setWorkshop(plan);
      for(const id of closed)engine.workshopTurn(id,1);
      engine.workshopMark(conflicts,complete);
      engine.workshopCue(workshopLines[cue].speaker);
    }else if(engine)engine.workshopChoose();
    paint();
  }
  function chooseButtons(){
    const options=form==="review"?reviewNets:challengeNets;
    const descriptions=form==="review"?
      ["أربعة مربعات في صف ومربع عند كل طرف على جهتين مختلفتين", "أربعة مربعات في صف ومربعان فوقه"] :
      ["أربعة مربعات في صف ومربعان منفصلان أسفله","صفّان منزاحان، ثلاثة مربعات في كل صف"];
    netChoices.replaceChildren(...options.map((net,i)=>{
      const button=document.createElement("button");
      button.type="button";
      button.className="quiet workshop-choice";
      button.setAttribute("aria-pressed",String(design===i));
      const label=i===0?"الشبكة أ":"الشبكة ب";
      button.setAttribute("aria-label",label+"، "+descriptions[i]);
      const title=document.createElement("b");
      title.textContent=label;
      const thumb=netThumbnail(net,false);
      thumb.setAttribute("aria-hidden","true");
      button.append(thumb,title);
      button.onclick=()=>{
        if(design===i)return;
        design=i;
        setPlan(net);
        chooseButtons();
        netChoices.children[i].focus({preventScroll:true});
      };
      return button;
    }));
  }
  function setPlan(value){
    gesture=null;
    plan=value;closed=new Set();conflicts=new Set();
    buttons=value?value.slice(1).map(({id})=>{
      const button=document.createElement("button");
      button.className="quiet workshop-face";
      button.type="button";
      button.dataset.face=String(id);
      button.setAttribute("aria-label","اطوِ أو افتح الوجه "+digits.format(id+1));
      button.style.setProperty("--face-color",panelColors[id]);
      button.textContent=digits.format(id+1);
      button.onclick=()=>turn(id,!closed.has(id));
      return button;
    }):[];
    targets.replaceChildren(...buttons);
    refresh();
  }
  function turn(id,folded){
    if(!plan||complete)return;
    if(folded)closed.add(id);
    else closed.delete(id);
    scene()?.workshopTurn(id,folded?1:0);
    const priorConflict=conflicts.size;
    const result=inspectFolds(plan,closed);
    conflicts=result.conflicts;
    if(conflicts.size&&!priorConflict){
      if(round===0)repairReady=true;
      if(round===2){
        helped=true;
        if(!attempted.has(design)){
          attempted.add(design);
          report("overlap",form);
        }
      }
      say(round===2?"retry":"overlap");
    }else if(priorConflict&&!conflicts.size){
      say("move");
    }
    if(result.fitted){
      if(round===2){
        complete=true;
        report(helped?"guided":"independent",form);
        try{localStorage.setItem(stampKey,"earned");savedStamp=true;}catch{}
        say("finish");
        scene()?.celebrate();
      }else if(round===1){
        repairReady=true;
        say("fit");
      }
    }else if(round===1){
      repairReady=false;
    }
    scene()?.workshopMark(conflicts,complete);
    paint();
    if(complete)next.focus({preventScroll:true});
  }
  function leave(){
    if(!active)return;
    active=false;gesture=null;
    for(const id of ["workshop","workshop-caption","workshop-fallback"])$(id).hidden=true;
  }
  function begin(check){
    enter();
    active=true;round=check?2:0;design=null;complete=false;repairReady=false;savedStamp=false;
    form=check??"workshop";helped=false;attempted.clear();
    $("workshop").hidden=$("workshop-caption").hidden=false;
    if(check){
      setPlan(null);
      chooseButtons();
      say("choose");
      netChoices.firstElementChild.focus({preventScroll:true});
    }else{
      setPlan(practiceNets[0]);
      say("arrive");
    }
  }

  next.onclick=()=>{
    if(complete){exit();return;}
    if(!repairReady)return;
    repairReady=false;
    round++;
    if(round===1){
      setPlan(practiceNets[1]);
      say("repair");
      buttons[0].focus({preventScroll:true});
    }else{
      setPlan(null);
      chooseButtons();
      say("choose");
      netChoices.firstElementChild.focus({preventScroll:true});
    }
  };
  $("workshop-hint").onclick=()=>{
    if(round===2)helped=true;
    say(conflicts.size?(round===2?"retry":"overlap"):"move");
  };
  $("workshop-listen").onclick=()=>{
    autoVoice=true;
    $("workshop-stop").hidden=false;
    narrate(workshopLines[cue].text);
  };
  $("workshop-voice").onclick=()=>openVoice(true);
  $("workshop-back").onclick=exit;

  canvas.addEventListener("pointerdown",event=>{
    if(!active||!plan||complete||gesture||event.button!==0)return;
    const id=scene()?.workshopPick(event.clientX,event.clientY);
    if(id==null)return;
    canvas.setPointerCapture(event.pointerId);
    gesture={id,pointer:event.pointerId,y:event.clientY,initial:closed.has(id)?1:0};
  });
  canvas.addEventListener("pointermove",event=>{
    if(gesture?.pointer!==event.pointerId)return;
    const amount=gesture.initial+(gesture.y-event.clientY)/66;
    scene()?.workshopTurn(gesture.id,Math.max(0,Math.min(1,amount)));
  });
  canvas.addEventListener("pointerup",event=>{
    if(gesture?.pointer!==event.pointerId)return;
    const {id,y,initial}=gesture;
    gesture=null;
    const delta=y-event.clientY;
    turn(id,Math.abs(delta)<9?!initial:delta>0);
  });
  function cancel(event){
    if(gesture?.pointer!==event.pointerId)return;
    scene()?.workshopTurn(gesture.id,gesture.initial);
    gesture=null;
  }
  canvas.addEventListener("pointercancel",cancel);
  canvas.addEventListener("lostpointercapture",cancel);
  return {
    open:()=>begin(null),review:begin,leave,refresh,earned,lineFor,currentLine:()=>workshopLines[cue].text,
    pauseNarration(){autoVoice=false;$("workshop-stop").hidden=true;},
  };
}
