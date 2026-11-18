export function createRiverAudio() {
  const Audio = window.AudioContext || window.webkitAudioContext;
  const context = new Audio();
  const volume = context.createGain();
  volume.gain.value = 0;
  volume.connect(context.destination);
  let active = false;
  let birdAt = 0;
  let stepAt = 0;
  const water = context.createGain();
  water.gain.value = .02;
  water.connect(volume);
  const sample = context.createBuffer(1,context.sampleRate*3,context.sampleRate);
  const noise = sample.getChannelData(0);
  let previous = 0;
  for(let i=0;i<noise.length;i++){
    previous=(previous+Math.random()*.18-.09)*.94;
    noise[i]=previous * Math.min(1,i/250,(noise.length-1-i)/250);
  }
  const flow=context.createBufferSource();
  flow.buffer=sample;
  flow.loop=true;
  const filter=context.createBiquadFilter();
  filter.type="bandpass"; filter.frequency.value=540; filter.Q.value=.47;
  flow.connect(filter).connect(water);
  flow.start();

  function tone(frequency,end,duration,level,delay=0,pan=0,type="sine") {
    const time=context.currentTime+delay;
    const voice=context.createOscillator();
    const envelope=context.createGain();
    const stereo=context.createStereoPanner();
    stereo.pan.value=pan;
    voice.type=type;voice.frequency.setValueAtTime(frequency,time);
    voice.frequency.exponentialRampToValueAtTime(end,time+duration);
    envelope.gain.setValueAtTime(.0001,time);
    envelope.gain.exponentialRampToValueAtTime(level,time+.018);
    envelope.gain.exponentialRampToValueAtTime(.0001,time+duration);
    voice.connect(envelope).connect(stereo).connect(volume);
    voice.start(time); voice.stop(time+duration+.01);
    voice.onended=()=>{voice.disconnect();envelope.disconnect();stereo.disconnect();};
  }

  return {
    async enable(next){
      if(next)await context.resume();
      active=next;
      volume.gain.setTargetAtTime(next?.48:0,context.currentTime,.07);
    },
    update(z,moving,onBridge) {
      if(!active)return;
      const now=context.currentTime;
      water.gain.setTargetAtTime(.07+.54*Math.exp(-Math.max(0,z,-15-z)*.14),now,.26);
      if(now>birdAt){
        const side=Math.random()>.5?.72:-.72;
        tone(1580,2250,.12,.022,0,side);
        tone(2300,1710,.14,.02,.15,side);
        birdAt=now+3+Math.random()*4;
      }
      if(moving&&now>stepAt){
        tone(onBridge?165:98,onBridge?77:47,.09,onBridge?.046:.025,0,0,"triangle");
        stepAt=now+.26;
      }
    },
    cue(kind) {
      if(!active)return;
      if(kind==="open"){
        tone(196,122,.29,.11,0,0,"triangle");
        tone(392,520,.31,.07,.12);
        tone(523,659,.37,.08,.25);
      }else if(kind==="photo"){
        tone(240,85,.09,.1,0,0,"triangle");
        tone(510,440,.10,.045,.09);
      }else{
        tone(310,220,.14,.065,0,0,"triangle");
      }
    },
  };
}
