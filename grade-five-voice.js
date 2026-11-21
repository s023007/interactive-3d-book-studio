const dbName="warraq.book.voice.v1";
const fallbackKey="warraq.book.allow-synthetic";
let storage;
const openDatabase=()=>storage??=new Promise((resolve,reject)=>{
  if(!window.indexedDB){reject(Error("Storage unavailable"));return;}
  const open=indexedDB.open(dbName,1);
  open.onupgradeneeded=()=>open.result.createObjectStore("lines");
  open.onsuccess=()=>resolve(open.result);
  open.onerror=()=>reject(open.error);
});

export function createVoicePanel({getLines,play,stop}){
  const $=id=>document.getElementById(id);
  const panel=$("voice-panel");
  const select=$("voice-line");
  const note=$("voice-panel-status");
  const record=$("voice-record");
  const end=$("voice-stop");
  const cache=new Map();
  let recorder;
  let requesting=false;
  let selectedText="";
  const limit=16*1024*1024;
  const fallback=$("voice-fallback");
  try{fallback.checked=localStorage.getItem(fallbackKey)==="yes";}catch{}
  fallback.onchange=()=>{
    try{localStorage.setItem(fallbackKey,fallback.checked?"yes":"no");}catch{}
  };

  async function getClip(text){
    if(cache.has(text))return cache.get(text);
    try {
      const db=await openDatabase();
      return await new Promise((resolve,reject)=>{
        const request=db.transaction("lines").objectStore("lines").get(text);
        request.onsuccess=()=>{
          if(request.result instanceof Blob)cache.set(text,request.result);
          resolve(request.result);
        };
        request.onerror=()=>reject(request.error);
      });
    }catch{return undefined;}
  }
  async function storeClip(text,blob){
    cache.set(text,blob);
    let saved=false;
    try{
      const db=await openDatabase();
      await new Promise((resolve,reject)=>{
        const tx=db.transaction("lines","readwrite");
        tx.objectStore("lines").put(blob,text);
        tx.oncomplete=resolve;
        tx.onerror=()=>reject(tx.error);
        tx.onabort=()=>reject(tx.error);
      });
      saved=true;
    }catch{}
    if(panel.open&&selectedText===text){
      $("voice-test").disabled=false;
      note.textContent=saved?"حُفظ التسجيل في هذا المتصفح، ويُشغَّل عند قراءة هذه العبارة.":
        "التسجيل جاهز في الصفحة الحالية. تعذّر حفظه بعد إغلاقها.";
    }
  }
  async function choose(){
    stop();
    const lines=getLines();
    select.options[1].disabled=!lines.feedback;
    if(select.value==="feedback"&&!lines.feedback)select.value="question";
    const text=lines[select.value];
    selectedText=text;
    $("voice-script").textContent=text;
    $("voice-file").value="";
    $("voice-test").disabled=true;
    note.textContent="سجّل العبارة بنفسك أو ارفع ملفًا صوتيًا بإذن صاحبه. يبقى الصوت على هذا الجهاز.";
    const saved=await getClip(text);
    if(saved&&panel.open&&selectedText===text){
      $("voice-test").disabled=false;
      note.textContent="لهذه العبارة تسجيل محفوظ على جهازك.";
    }
  }
  function syncButtons(){
    const active=requesting||recorder?.state==="recording";
    select.disabled=$("voice-file").disabled=Boolean(active);
    record.disabled=Boolean(active);
    end.disabled=recorder?.state!=="recording";
  }
  record.onclick=async()=>{
    if(requesting||recorder?.state==="recording")return;
    const text=selectedText;
    stop();
    requesting=true;syncButtons();
    let stream;
    try{
      if(!navigator.mediaDevices?.getUserMedia||!window.MediaRecorder)throw Error("Microphone unavailable");
      stream=await navigator.mediaDevices.getUserMedia({audio:true});
      if(!panel.open||selectedText!==text){stream.getTracks().forEach(track=>track.stop());return;}
      const active=new MediaRecorder(stream);
      const chunks=[];
      recorder=active;
      active.ondataavailable=event=>{if(event.data.size)chunks.push(event.data);};
      active.onstop=()=>{
        stream.getTracks().forEach(track=>track.stop());
        recorder=null;
        syncButtons();
        const blob=new Blob(chunks,{type:active.mimeType});
        if(blob.size&&blob.size<=limit)storeClip(text,blob);
        else note.textContent="لم يُحفظ التسجيل. حاول تسجيل عبارة أقصر.";
      };
      active.start();
      note.textContent="جارٍ التسجيل. اقرأ العبارة ثم اضغط أوقف التسجيل.";
    }catch{
      stream?.getTracks().forEach(track=>track.stop());
      note.textContent="الميكروفون غير متاح. يمكنك رفع ملف صوتي لهذه العبارة.";
    }finally{requesting=false;syncButtons();}
  };
  end.onclick=()=>{if(recorder?.state==="recording")recorder.stop();};
  select.onchange=choose;
  $("voice-file").onchange=event=>{
    const file=event.target.files[0];
    if(!file)return;
    if(!file.type.startsWith("audio/")||file.size>limit){
      note.textContent="اختر ملفًا صوتيًا صالحًا حتى ١٦ ميغابايت.";
      return;
    }
    storeClip(selectedText,file);
  };
  $("voice-test").onclick=()=>play(selectedText);
  $("voice-close").onclick=()=>panel.close();
  panel.addEventListener("close",()=>{
    stop();
    if(recorder?.state==="recording")recorder.stop();
  });
  function open(recordingsOnly=false){
    $("voice-title").textContent=recordingsOnly?"تسجيل حوار الورشة":"صوت الراكون";
    select.options[0].textContent=recordingsOnly?"العبارة الحالية":"السؤال الحالي";
    fallback.parentElement.hidden=recordingsOnly;
    select.value="question";
    panel.showModal();
    choose();
  }
  $("voice-setup").onclick=()=>open();
  return {getClip,open,allowFallback:()=>fallback.checked};
}
