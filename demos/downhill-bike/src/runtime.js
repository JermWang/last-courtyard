/* GDevelop owns startup, rendering, and frame scheduling. This event keeps the
 * simulation, controls and scene-specific interface together. */
function createBikeGame(scene){
  const M=BikeMotion;
  function readProgress(){
    try{
      const saved=JSON.parse(localStorage.getItem('downhill-bike:trail'));
      if(saved&&Number.isInteger(saved.seed)&&Number.isSafeInteger(saved.stage)&&saved.stage>0)return saved;
    }catch{}
    return {seed:0,stage:1};
  }
  let soloTrail=readProgress();
  let T=BikeLandscape.makeTrack(soloTrail.seed,soloTrail.stage),view=createBikeView(scene,T);
  for(const name of ['RidgeReference','ValleyReference'])for(const object of scene.getObjects(name))object.hide();
  const ui=document.createElement('div');
  ui.id='bike-ui';
  ui.innerHTML=`
<style>
#bike-ui{position:fixed;inset:0;z-index:12;pointer-events:none;font-family:system-ui,sans-serif;color:#fff3d8}
#bike-ui *{box-sizing:border-box}#bike-ui button{pointer-events:auto;cursor:pointer;font:inherit}
#bike-ui .hud{position:absolute;inset:0;padding:clamp(13px,2.4vw,32px);display:flex;flex-direction:column;justify-content:space-between}
.bike-top,.bike-bottom{display:flex;justify-content:space-between;gap:14px;align-items:flex-start}
.bike-bottom{align-items:end}.bike-brand,.bike-speed,.bike-cue{background:#252829ed;border:1px solid #b6a28788;border-left:3px solid #bf6739;border-radius:3px;box-shadow:0 3px 0 #10121388}
.bike-brand{padding:12px 17px}.bike-brand strong{display:block;font-size:24px;font-style:italic;font-weight:900;letter-spacing:-.04em;line-height:1.2}
.bike-label{font-size:10px;font-weight:800;letter-spacing:.17em;text-transform:uppercase;color:#dfbb80}
.bike-stat-row{display:flex;gap:16px;align-items:center;margin-top:9px;font-size:13px;color:#dfebde}
.bike-speed{padding:12px 18px;min-width:126px;margin-left:auto}.bike-speed strong{font-size:37px;line-height:1;letter-spacing:-.08em;font-variant-numeric:tabular-nums}
.bike-speed span{font-size:12px;margin-left:7px;color:#dfebde}.bike-surface{font-size:12px;color:#dfbb80;margin-top:7px}
.bike-cue{padding:12px 17px;max-width:min(400px,64vw);font-size:13px;line-height:1.45}
.bike-cue strong{font-size:14px;display:block;margin-bottom:3px}.bike-cue small{display:block;color:#d2ded2;margin-top:5px}
.bike-cue[data-pace="low"] strong,.bike-cue[data-pace="high"] strong{color:#ffbe78}
.bike-cue[data-pace="line"] strong{color:#c3dfac}
.bike-cover{position:absolute;inset:0;display:flex;justify-content:flex-end;align-items:center;padding:clamp(20px,5vw,74px);background:linear-gradient(90deg,#11282903,#11282973)}
.bike-card{pointer-events:auto;background:#e9dcc0;color:#303232;border-radius:4px;padding:clamp(19px,3.4vw,36px);width:min(410px,86vw);box-shadow:0 20px 70px #152b37a0;border-top:4px solid #c46a40}
.bike-card .bike-label{color:#805134}.bike-card h1{font:italic 900 clamp(28px,5vw,46px)/1 system-ui;margin:9px 0 13px;letter-spacing:-.06em}
.bike-card p{line-height:1.48;color:#45534d;margin:0 0 15px;font-size:14px}
.bike-card button{background:#244a49;color:#fff3d8;border:0;border-radius:6px;padding:10px 15px;font-weight:750}
.bike-card button:focus-visible{outline:3px solid #a85e32;outline-offset:3px}
.bike-card .bike-secondary{color:#254542;background:#e2dbca;margin-left:6px}
.bike-card button{margin-top:6px}.bike-volume{display:flex;align-items:center;gap:9px;margin-top:16px;font-size:12px}.bike-volume input{width:120px;accent-color:#365d50}
.bike-mouse-options{border-top:1px solid #52645644;margin-top:14px;padding-top:9px;font-size:12px}.bike-mouse-options label{display:flex;gap:8px;align-items:center;margin:7px 0}.bike-mouse-options input{accent-color:#365d50}.bike-card{max-height:94dvh;overflow:auto}
.bike-mouse-status{margin-top:6px;font-size:11px;color:#dfbb80}
.bike-card kbd{font:700 11px system-ui;background:#e8dfc8;padding:2px 5px;border-radius:3px}
.bike-controls{display:grid;grid-template-columns:1fr 1fr;gap:7px 14px;margin:15px 0;font-size:12px}
.bike-card details{font-size:11px;margin-top:12px;color:#526456}.bike-card summary{cursor:pointer}.bike-result{display:block;margin-top:12px;color:#536055;font-size:13px;font-variant-numeric:tabular-nums}
.crew-cover{padding-top:70px}.crew-card{max-height:calc(100dvh - 85px);overflow:auto}
.crew-card input{pointer-events:auto;display:block;font:inherit;width:100%;border:1px solid #8e8a74;border-radius:3px;background:#faf2dd;color:#292e29;padding:8px;margin:5px 0 8px}
.crew-card label{display:block;font-weight:700;font-size:12px}.crew-card form{margin-top:16px}
.crew-card button:disabled{opacity:.6;cursor:default!important}.crew-code{font:bold 14px monospace;letter-spacing:.12em;margin-bottom:9px}
.crew-card ul{padding:0;list-style:none;font-size:13px}.crew-card li{display:flex;justify-content:space-between;gap:10px;padding:6px 0;border-bottom:1px solid #776b4d44}
.crew-card .crew-exit{margin:10px 0 0}.crew-card .crew-message{font-size:12px;margin:8px 0 0}
.crew-live{position:absolute;top:clamp(13px,2.4vw,32px);left:50%;transform:translateX(-50%);font-size:12px;font-weight:850;letter-spacing:.09em;background:#252829ed;padding:9px 13px;border:1px solid #b6a28788;border-radius:3px;text-align:center}
.bike-inspect{position:absolute;left:clamp(13px,2.4vw,32px);bottom:clamp(13px,2.4vw,32px);width:auto;padding:14px 18px}
.bike-inspect strong{display:block;font-size:19px;font-style:italic;margin:3px 0 10px}
.bike-debug{position:absolute;top:155px;left:26px;white-space:pre;background:#172a2bef;color:#f4edda;padding:9px;font:12px monospace}
#bike-ui [hidden]{display:none!important}
@media(max-height:540px){.bike-card{padding:16px}.bike-cue small{display:none}}
</style>
<div class="hud" data-bike-hud>
  <div class="bike-top">
    <div class="bike-brand"><div class="bike-label" data-bike-trail>DOWNHILL BIKE / 01</div><strong data-bike-name>Ridge Run</strong>
      <div class="bike-stat-row"><span data-bike-time hidden></span><span data-bike-progress></span></div><div class="bike-mouse-status" data-bike-mouse-status hidden></div></div>
  </div>
  <div class="bike-bottom">
    <div class="bike-cue" data-bike-callout hidden><strong data-bike-cue></strong><div data-bike-detail></div></div>
    <div class="bike-speed"><strong data-bike-speed>0</strong><span>km/h</span><div class="bike-surface" data-bike-surface>Packed dirt</div></div>
  </div>
</div>
<div class="bike-cover" data-bike-cover>
  <section class="bike-card" aria-label="Downhill Bike run menu">
    <div class="bike-label" data-bike-eyebrow>ALPINE DESCENT / 01</div><h1 data-bike-heading>Ridge Run</h1>
    <p data-bike-summary>Read the slope and get down to the valley in one piece.</p>
    <div class="bike-controls" data-bike-controls><div><kbd>W</kbd> Pedal</div><div><kbd>Shift</kbd> Brake</div>
      <div><kbd>A</kbd> <kbd>D</kbd> Steer / lean</div><div><kbd>Space</kbd> Jump</div><div><kbd>W</kbd> <kbd>S</kbd> Pitch in air</div>
      <div><kbd>C</kbd> Scout / free look</div><div><kbd>Q</kbd> <kbd>E</kbd> Kick left / right</div><div><kbd>Mouse drag</kbd> Look + steer</div><div><kbd>A/D</kbd> Steering priority</div></div>
    <button data-bike-go>Drop in</button><button class="bike-secondary" data-bike-retry hidden>Retry</button>
    <button class="bike-secondary" data-bike-friends>Ride with friends</button>
    <button class="bike-secondary" data-bike-inspect>View rider</button>
    <button class="bike-secondary" data-bike-practice>Practice a landing</button>
    <output class="bike-result" data-bike-result></output>
    <div class="bike-mouse-options"><label><input data-bike-mouse-enabled type="checkbox" checked> Mouse-assisted riding</label>
      <label>Sensitivity <input data-bike-mouse-sensitivity type="range" min="50" max="150" value="100" aria-label="Mouse sensitivity"><span data-bike-mouse-value>100%</span></label>
      <span>Hold either mouse button and drag to look and steer. A/D takes over steering while mouse-look stays active. Release to recenter. In the air or holding C, mouse movement only looks.</span></div>
    <label class="bike-volume">Sound <input data-bike-volume type="range" min="0" max="100" value="65" aria-label="Master volume"><span data-bike-volume-label>65%</span></label>
    <details><summary>Asset credits</summary>Terrain detail by Christopher Melani, Charlotte Baglioni and eye-candy.xyz (Poly Haven). Kloppenheim 06 sky by Greg Zaal and Jarod Guest (Poly Haven). Bicycle sounds by AntumDeluge (OpenGameArt). CC0.</details>
  </section>
</div>
<section class="bike-card bike-inspect" data-bike-inspect-panel hidden aria-label="Rider preview">
  <div class="bike-label">RIDGE CREW / SERIES 02</div><strong>Trail rider #17</strong>
  <button data-bike-angle>Turn rider</button><button class="bike-secondary" data-bike-back>Back</button>
</section>
<output class="bike-debug" data-bike-debug hidden></output>`;
  document.body.append(ui);
  const get=name=>ui.querySelector('[data-bike-'+name+']');
  const fields=Object.fromEntries(['time','progress','cue','detail','speed','surface','cover','eyebrow','heading',
    'summary','go','retry','friends','result','controls','debug','trail','name','hud',
    'inspect','inspect-panel','angle','back','callout','practice','volume','volume-label',
    'mouse-enabled','mouse-sensitivity','mouse-value','mouse-status'].map(name=>[name,get(name)]));
  function labelMountain(){
    fields.trail.textContent='DOWNHILL BIKE / '+String(T.stage||1).padStart(2,'0');
    fields.name.textContent=T.title||'Ridge Run';
  }
  labelMountain();

  const keys=new Set();
  const controller=new AbortController(),signal=controller.signal;
  const mouseRiding=createMouseRiding();
  let mouseEnabled=true,mouseSensitivity=100,mouseCapture=null,mouseButtonMask=0;
  try{
    const saved=JSON.parse(localStorage.getItem('downhill-bike:mouse'));
    if(saved){mouseEnabled=saved.enabled!==false;if(Number.isFinite(saved.sensitivity))mouseSensitivity=T.clamp(saved.sensitivity,50,150);}
  }catch{}
  fields['mouse-enabled'].checked=mouseEnabled;fields['mouse-sensitivity'].value=mouseSensitivity;
  fields['mouse-value'].textContent=mouseSensitivity+'%';mouseRiding.setSensitivity(mouseSensitivity/100);
  function releaseMouse(){
    mouseRiding.release();
    mouseButtonMask=0;
    const capture=mouseCapture;mouseCapture=null;
    if(capture?.element.hasPointerCapture(capture.id))capture.element.releasePointerCapture(capture.id);
  }
  function saveMouse(){
    mouseEnabled=fields['mouse-enabled'].checked;mouseSensitivity=Number(fields['mouse-sensitivity'].value);
    fields['mouse-value'].textContent=mouseSensitivity+'%';mouseRiding.setSensitivity(mouseSensitivity/100);releaseMouse();
    try{localStorage.setItem('downhill-bike:mouse',JSON.stringify({enabled:mouseEnabled,sensitivity:mouseSensitivity}));}catch{}
  }
  fields['mouse-enabled'].addEventListener('change',saveMouse,{signal});
  fields['mouse-sensitivity'].addEventListener('input',saveMouse,{signal});
  let rider=M.create(T),paused=false,pauseWhy='',snap=true,previous=performance.now(),acc=0,lastUI=0,hopQueued=false;
  let journey=createDescentJourney(T),arrivalReveal=0,bestResult='';
  let longFrames=0,poseValid=false,frameMax=0,worstFrame=0;
  let bailReveal=0;
  let kickMessage='',kickMessageUntil=0;
  const motion=['x','y','z','yaw','speed','lean','pitch','turn','shift','brake','drive','spin','rearSpin','crank','compression',
    'frontTravel','rearTravel','forkLoad','shockLoad','hopAge','rearSkid','slip','slipSide'];
  const prior={},rendered={};
  let inspection=null;
  let practice=null,practiceAirborne=false,practiceLandingAt=null;
  const landedGaps=new Set();
  let lastLandedGap=null,landedGapUntil=0;
  let debug=new URLSearchParams(location.search).has('debug'),frames=0,frameTime=0,fps=0,dropFrames=0;
  let audio=null,master=null,wind=null,grit=null,water=null,windFilter=null,gritFilter=null,noise=null,lastSpoke=-1;
  let volume=.65;
  try{const value=localStorage.getItem('downhill-bike:volume');if(value!==null&&Number.isFinite(Number(value)))volume=T.clamp(Number(value),0,1);}catch{}
  fields.volume.value=Math.round(volume*100);fields['volume-label'].textContent=volume?Math.round(volume*100)+'%':'Muted';
  fields.volume.addEventListener('input',()=>{
    volume=Number(fields.volume.value)/100;
    fields['volume-label'].textContent=volume?Math.round(volume*100)+'%':'Muted';
    if(master)master.gain.setTargetAtTime(volume,audio.currentTime,.04);
    try{localStorage.setItem('downhill-bike:volume',String(volume));}catch{}
  },{signal});
  const sounds=new Map(),voices=new Set();
  function loadSounds(){
    const resources=scene.getGame().getGameData().resources.resources;
    for(const name of ['bike-spokes','bike-bell']){
      const resource=resources.find(entry=>entry.name===name);
      if(!resource)continue;
      fetch(resource.file)
        .then(response=>{if(!response.ok)throw Error('Audio file unavailable');return response.arrayBuffer();})
        .then(buffer=>audio.decodeAudioData(buffer))
        .then(clip=>sounds.set(name,clip))
        .catch(()=>{}); // Procedural wind and rolling audio remain available.
    }
  }
  function playSound(name,volume,rate=1,duration){
    const clip=sounds.get(name);
    if(!clip||audio.state!=='running'||voices.size>=3)return;
    const source=audio.createBufferSource(),gain=audio.createGain();
    source.buffer=clip;source.playbackRate.value=rate;gain.gain.value=volume;
    source.connect(gain).connect(master);
    voices.add(source);
    source.onended=()=>voices.delete(source);
    source.start(0,0,duration??clip.duration);
  }
  function stopSounds(){
    for(const source of voices)source.stop();
    voices.clear();
  }
  function touchdown(strength,crash=false){
    if(!noise||audio.state!=='running'||voices.size>=3)return;
    const source=audio.createBufferSource(),filter=audio.createBiquadFilter(),gain=audio.createGain();
    const t=audio.currentTime;
    source.buffer=noise;filter.type='lowpass';filter.frequency.value=crash?1000:440;
    gain.gain.setValueAtTime(.025+strength*.18,t);
    gain.gain.exponentialRampToValueAtTime(.001,t+(crash?.29:.15));
    source.connect(filter).connect(gain).connect(master);
    voices.add(source);source.onended=()=>voices.delete(source);
    source.start(t,0,crash?.30:.16);
  }
  let lastCompression=0,lastCompressionTime=0,lastCreak=-1;
  function suspensionSound(amount){
    if(!audio||audio.state!=='running'||voices.size>=3)return;
    const t=audio.currentTime,source=audio.createOscillator(),gain=audio.createGain();
    source.type='sine';source.frequency.setValueAtTime(170+amount*40,t);
    source.frequency.exponentialRampToValueAtTime(85,t+.13);
    gain.gain.setValueAtTime(.001,t);gain.gain.linearRampToValueAtTime(.012+amount*.018,t+.012);
    gain.gain.exponentialRampToValueAtTime(.001,t+.15);
    source.connect(gain).connect(master);voices.add(source);source.onended=()=>voices.delete(source);
    source.start(t);source.stop(t+.16);
  }
  function audioStart(){
    if(!audio){
      const AC=window.AudioContext||window.webkitAudioContext;
      if(!AC)return;
      audio=new AC();
      master=audio.createGain();master.gain.value=volume;master.connect(audio.destination);
      const sample=noise=audio.createBuffer(1,audio.sampleRate*2,audio.sampleRate);
      const buf=sample.getChannelData(0);
      for(let i=0;i<buf.length;i++)buf[i]=Math.random()*2-1;
      function texture(type){
        const sound=audio.createBufferSource(),filter=audio.createBiquadFilter(),gain=audio.createGain();
        filter.type=type;sound.buffer=sample;sound.loop=true;gain.gain.value=0;
        sound.connect(filter).connect(gain).connect(master);sound.start();
        return [filter,gain];
      }
      [windFilter,wind]=texture('lowpass');[gritFilter,grit]=texture('bandpass');
      const waterfall=texture('lowpass');waterfall[0].frequency.value=1500;water=waterfall[1];
      loadSounds();
    }
    audio.resume().catch(()=>{});
  }
  function audioUpdate(){
    if(!audio)return;
    const live=!paused&&rider.phase==='riding',speed=live?rider.speed:0,now=audio.currentTime;
    windFilter.frequency.setTargetAtTime(260+speed*28,now,.15);
    const skid=rider.grounded?rider.rearSkid:0;
    gritFilter.frequency.setTargetAtTime((rider.surface==='gravel'?1500:rider.surface==='stone'?1050:rider.surface==='roots'?410:rider.surface==='grass'?420:780)+skid*380,now,.12);
    const region=T.region(rider.y);
    const fallDistance=Math.hypot(rider.x-(T.waterfallX??T.bounds.left-7),rider.y-(T.waterfallY??324));
    water.gain.setTargetAtTime(live?.035*Math.max(0,1-fallDistance/175):0,now,.4);
    wind.gain.setTargetAtTime(live?speed*.0042*(1-.55*region.forest)+.009*region.alpine:0,now,.3);
    const texture=rider.surface==='gravel'?.0045:rider.surface==='stone'?.0018:rider.surface==='grass'?.0012:.0021;
    const rough=rider.grounded?speed*texture+Math.min(.045,rider.slip*.012)+skid*.042:0;
    grit.gain.setTargetAtTime(live?rough:0,now,.09);
    const compression=rider.forkLoad+rider.shockLoad,elapsed=rider.time-lastCompressionTime;
    if(live&&rider.grounded&&elapsed>0&&elapsed<.2&&now-lastCreak>.24){
      const rate=Math.max(0,(compression-lastCompression)/elapsed);
      if(rate>.38){suspensionSound(Math.min(1,rate*.35));lastCreak=now;}
    }
    lastCompression=compression;lastCompressionTime=rider.time;
    if(live&&rider.grounded&&speed>4&&!keys.has('KeyW')&&!keys.has('ArrowUp')&&rider.time-lastSpoke>Math.max(.42,1-speed*.031)){
      playSound('bike-spokes',.048,.88+speed*.021,.30);
      lastSpoke=rider.time;
    }
  }
  function time(seconds){
    const rounded=Math.floor(seconds*10)/10;
    return Math.floor(rounded/60)+':'+(rounded%60).toFixed(1).padStart(4,'0');
  }
  function menu(){
    const phase=rider.phase;
    fields['inspect-panel'].hidden=inspection===null;
    fields.hud.hidden=inspection!==null;
    if(inspection!==null){fields.cover.hidden=true;fields.debug.hidden=true;return;}
    if(crew.shown&&!paused){fields.cover.hidden=true;return;}
    fields.cover.hidden=(!paused&&phase==='riding')||(phase==='crashed'&&bailReveal>0)||(phase==='finished'&&arrivalReveal>0);
    if(fields.cover.hidden)return;
    fields.retry.hidden=Boolean(crew.room)||(!paused&&phase!=='finished'&&!(phase==='crashed'&&journey.state.checkpoint));
    fields.retry.textContent=phase==='crashed'?'Restart at summit':'Ride again';
    fields.friends.textContent=crew.room?'Leave crew':'Ride with friends';
    fields.friends.hidden=Boolean(practice);
    fields.inspect.hidden=phase!=='ready';
    fields.practice.hidden=Boolean(practice||crew.room)||paused||(phase!=='ready'&&phase!=='crashed');
    fields.controls.hidden=phase==='crashed'||phase==='finished'||phase==='practiceDone';
    fields.eyebrow.textContent=paused?'RIDE PAUSED':phase==='finished'?'REFUGE REACHED':phase==='crashed'?'DESCENT INTERRUPTED':'KEEP IT ALIVE / '+fields.trail.textContent;
    fields.heading.textContent=paused?(pauseWhy==='stall'?'Preview slowed down.':'Take a breath.'):phase==='finished'?'You made it down.':
      phase==='crashed'?rider.crashInfo?.title||'Ride over.':fields.name.textContent;
    fields.summary.textContent=paused?(pauseWhy==='stall'?
      'The browser stopped delivering frames. Your bike is paused here. Resume when the tab is active.':
      crew.room?'Resume when you are ready. Your crew’s race clock keeps running.':'Resume when you are ready.'):phase==='finished'?
      'You brought your rider home. Ride this mountain again to discover another way down, or explore the next descent.':
      phase==='crashed'?rider.crashInfo?.detail||rider.reason:
      T.summitDrop+' m down an open summit, old-growth forest and rocky gorge to shelter. Hold C to scout. Stop on a broad outlook to save a rest point.';
    fields.go.textContent=paused?'Resume':phase==='ready'?'Drop in':phase==='finished'?'Next descent':
      !crew.room&&journey.state.checkpoint?'Return to last rest':'Ride again';
    fields.result.textContent=phase==='crashed'?rider.crashInfo?.metrics||'':phase==='finished'?
      time(rider.time)+' · '+journey.state.falls+' falls · '+rider.saves+' saves · '+rider.cleanLandings+' clean landings'+bestResult:'';
    if(practice){
      const crossed=practiceLandingAt!==null;
      fields.eyebrow.textContent='PRACTICE / '+practice.name.toUpperCase();
      if(!paused)fields.heading.textContent=phase==='practiceDone'?(crossed?'Gap cleared.':'Runout reached.'):(rider.crashInfo?.title||'Try the jump again.');
      if(!paused)fields.summary.textContent=phase==='crashed'?(rider.crashInfo?.detail||rider.reason):crossed?'You crossed the gap. Try it in a full descent.':
        'Coast off the lip. Aim for the broad slope below and bring both tires down on the bank.';
      fields.go.textContent=paused?'Resume':'Retry jump';
      fields.retry.hidden=false;fields.retry.textContent='Back to summit';
    }
  }
  function clearMotion(){
    releaseMouse();
    stopSounds();lastSpoke=-1;
    bailReveal=0;
    arrivalReveal=0;
    kickMessageUntil=0;
    landedGaps.clear();lastLandedGap=null;landedGapUntil=0;
    inspection=null;paused=false;pauseWhy='';snap=true;acc=0;longFrames=0;poseValid=false;hopQueued=false;keys.clear();
  }
  function loadTrail(seed,stage){
    if(T.seed===seed&&T.stage===stage)return;
    view.dispose();
    T=BikeLandscape.makeTrack(seed,stage);
    view=createBikeView(scene,T);
    labelMountain();
  }
  function reset(next=false){
    if(practice){startPractice(practice);return;}
    if(next){
      soloTrail={seed:soloTrail.seed||((Math.random()*4294967296)>>>0),stage:T.stage+1};
      try{localStorage.setItem('downhill-bike:trail',JSON.stringify(soloTrail));}catch{}
      loadTrail(soloTrail.seed,soloTrail.stage);
    }
    clearMotion();
    journey=createDescentJourney(T);bestResult='';
    rider=M.create(T);rider.phase='riding';audioStart();menu();
  }
  function recover(){
    const restored=journey.resume(M);
    if(!restored){reset();return;}
    clearMotion();rider=restored;audioStart();menu();
  }
  function startPractice(j){
    clearMotion();
    practice=j;practiceAirborne=false;practiceLandingAt=null;
    const y=j.lip-8;
    rider=M.create(T,y);
    rider.x=j.center(y);
    rider.yaw=Math.atan2(j.center(y+1)-j.center(y-1),2);
    rider.z=T.sample(rider.x,y).z+M.clearance;
    // Start rolling at target pace so the drill teaches the catch.
    rider.speed=(j.min+j.max)/7.2;
    rider.vx=Math.sin(rider.yaw)*rider.speed;
    rider.vy=Math.cos(rider.yaw)*rider.speed;
    const grade=T.sample(j.center(y+.5),y+.5).z-T.sample(j.center(y-.5),y-.5).z;
    rider.vz=grade*rider.vy;
    rider.pitch=Math.atan(grade);
    rider.phase='riding';audioStart();menu();
  }
  function leavePractice(){
    practice=null;practiceAirborne=false;practiceLandingAt=null;clearMotion();
    rider=M.create(T);menu();
  }
  function receiveRoom(room,before){
    const newRun=!before||room.round!==before.round||room.phase==='lobby'&&before.phase!=='lobby';
    if(newRun){
      loadTrail(room.seed,room.stage);
      clearMotion();
      rider=M.create(T);
      const slots=[-.8,.8,-1.92,1.92];
      const baseZ=T.sample(rider.x,rider.y).z;
      const slot=crew.me()?.slot??0;
      view.setLocalSlot(slot);
      rider.x+=slots[slot];
      rider.z+=T.sample(rider.x,rider.y).z-baseZ;
    }
    if(room.phase==='results'){
      const unfinished=rider.phase==='riding'||rider.phase==='ready';
      clearMotion();
      if(unfinished)rider.phase='dnf';
    }
    menu();
  }
  function leaveCrew(){
    clearMotion();
    loadTrail(soloTrail.seed,soloTrail.stage);
    view.setLocalSlot(0);
    journey=createDescentJourney(T);
    rider=M.create(T);menu();
  }
  function setPaused(next,why=''){
    if(rider.phase!=='riding')return;
    paused=next;pauseWhy=next?why:'';keys.clear();acc=0;longFrames=0;poseValid=false;hopQueued=false;
    releaseMouse();
    if(paused)stopSounds();else audioStart();
    audioUpdate();menu();
  }
  function receiveKick(event){
    const me=crew.me()?.id;
    if(event.target===me){
      // The server has already validated that the shared countdown ended.
      // A client clock a few frames behind must not discard a valid hit.
      if(rider.phase==='ready'&&crew.room?.phase==='race')rider.phase='riding';
      if(!M.takeKick(rider,event.x,event.y,event.solid===true))return;
      if(rider.phase==='crashed'){
        paused=false;poseValid=false;acc=0;
        endRun(performance.now());
      }else touchdown(.35,true);
      kickMessage=event.solid?'Kicked off the bike':'Glancing kick';
    }else if(event.id===me){
      kickMessage=event.target?(event.solid?'Rider knocked off':'Glancing kick'):'Kick missed';
      if(event.target)touchdown(.24);
    }else return;
    kickMessageUntil=performance.now()+900;
  }
  const crew=createBikeCrew(ui,receiveRoom,leaveCrew,receiveKick);
  const angles=[2.30,.92,1.54,3.14];
  function closeInspection(){
    inspection=null;snap=true;menu();fields.inspect.focus();
  }
  fields.inspect.addEventListener('click',()=>{
    inspection=0;snap=true;menu();fields.angle.focus();
  },{signal});
  fields.angle.addEventListener('click',()=>{inspection=(inspection+1)%angles.length;},{signal});
  fields.back.addEventListener('click',closeInspection,{signal});
  fields.go.addEventListener('click',()=>{
    if(paused)setPaused(false);
    else if(rider.phase==='crashed'&&!practice&&!crew.room&&journey.state.checkpoint)recover();
    else reset(rider.phase==='finished');
  },{signal});
  fields.retry.addEventListener('click',()=>practice?leavePractice():reset(),{signal});
  fields.practice.addEventListener('click',()=>startPractice(rider.flight?.jump??T.jumps[0]),{signal});
  fields.friends.addEventListener('click',()=>{
    if(crew.room){crew.close();return;}
    audioStart();crew.open();menu();
  },{signal});
  const controls=new Set(['KeyW','KeyA','KeyS','KeyD','Space','ShiftLeft','ShiftRight','ArrowUp','ArrowDown','ArrowLeft','ArrowRight',
    'KeyQ','KeyE','KeyC','KeyR','Escape','F3']);
  window.addEventListener('keydown',event=>{
    if(event.ctrlKey||event.metaKey||event.altKey||event.target instanceof HTMLInputElement&&event.code!=='Escape')return;
    if(inspection!==null){
      if(event.code==='Escape'){event.preventDefault();closeInspection();}
      return;
    }
    if(controls.has(event.code))event.preventDefault();
    if(event.repeat&&(event.code==='KeyR'||event.code==='Escape'||event.code==='F3'))return;
    if(event.code==='Escape'){setPaused(!paused);return;}
    if(event.code==='KeyR'){
      if(!crew.shown)reset();
      return;
    }
    if(event.code==='F3'){debug=!debug;return;}
    if(event.code==='KeyC'&&!paused)keys.add(event.code);
    if(!paused&&rider.phase==='riding'){
      if(event.code==='Space'&&!event.repeat)hopQueued=true;
      if(!event.repeat&&(event.code==='KeyQ'||event.code==='KeyE')){
        const side=event.code==='KeyQ'?-1:1;
        if(M.startKick(rider,side))crew.kick(side);
      }
      keys.add(event.code);
    }
  },{signal});
  window.addEventListener('keyup',event=>{
    keys.delete(event.code);
    if(event.code==='KeyC')mouseRiding.rebase(rider.yaw);
  },{signal});
  const keyboardSteering=()=>['KeyA','KeyD','ArrowLeft','ArrowRight'].some(key=>keys.has(key));
  const rideSurface=target=>!(target instanceof Element&&target.closest('button,input,select,textarea,a,summary,.bike-card,.crew-card'));
  function beginMouse(event){
    if(mouseRiding.state.active||![0,2].includes(event.button)||event.pointerType==='touch'||!mouseEnabled||paused||
      rider.phase!=='riding'||inspection!==null||!rideSurface(event.target))return;
    event.preventDefault();
    mouseButtonMask=event.button===2?2:1;
    mouseRiding.begin(event.clientX,event.clientY,rider.yaw,keys.has('KeyC')||!rider.grounded);
    if(Number.isInteger(event.pointerId)&&event.target instanceof Element){
      try{event.target.setPointerCapture(event.pointerId);mouseCapture={element:event.target,id:event.pointerId};}catch{}
    }
  }
  function moveMouse(event){
    if(!mouseRiding.state.active)return;
    if(!(event.buttons&mouseButtonMask)){releaseMouse();return;}
    mouseRiding.move(event.clientX,event.clientY,rider.yaw,keys.has('KeyC')||!rider.grounded,keyboardSteering());
  }
  function endMouse(event){if((event.button===2?2:event.button===0?1:0)===mouseButtonMask)releaseMouse();}
  // Capture before wrappers intercept the event. Legacy mouse listeners cover
  // embedded surfaces that emit MouseEvents without PointerEvents. Identical
  // client coordinates make paired pointer/mouse moves idempotent.
  for(const type of ['pointerdown','mousedown'])window.addEventListener(type,beginMouse,{signal,capture:true});
  for(const type of ['pointermove','mousemove'])window.addEventListener(type,moveMouse,{signal,capture:true});
  for(const type of ['pointerup','mouseup'])window.addEventListener(type,endMouse,{signal,capture:true});
  window.addEventListener('lostpointercapture',event=>{
    if(mouseCapture?.id===event.pointerId&&!mouseCapture.element.hasPointerCapture(event.pointerId))releaseMouse();
  },{signal});
  window.addEventListener('pointercancel',releaseMouse,{signal});
  window.addEventListener('resize',releaseMouse,{signal});
  window.addEventListener('contextmenu',event=>{
    if(mouseEnabled&&!paused&&rider.phase==='riding'&&rideSurface(event.target))event.preventDefault();
  },{signal,capture:true});
  window.addEventListener('blur',()=>setPaused(true),{signal});
  document.addEventListener('visibilitychange',()=>{if(document.hidden)setPaused(true);},{signal});
  function drawHUD(){
    fields.time.hidden=!crew.room;
    fields.time.textContent=time(rider.time);
    const height=Math.max(0,Math.round(rider.z-M.clearance-T.valleyFloor(rider.x)));
    fields.progress.textContent=practice?'Landing practice':T.region(rider.y).name+' · '+height+' m to refuge';
    fields.speed.textContent=Math.round(rider.speed*3.6);
    fields['mouse-status'].hidden=paused||rider.phase!=='riding';
    fields['mouse-status'].textContent=!mouseEnabled?'Mouse riding off · enable in pause menu':
      !mouseRiding.state.active?'Hold left or right mouse + drag to look / steer':
      keys.has('KeyC')||!rider.grounded?'Mouse look · keyboard balance':
      keyboardSteering()?'Mouse look + keyboard steering':'Mouse riding · release to recenter';
    const brakeDrift=rider.rearSkid>.32&&rider.slip>.55;
    const slipping=rider.slip>Math.max(.70,rider.speed*.075);
    fields.surface.textContent=!rider.grounded?'Airborne':brakeDrift?'Brake drift':
      slipping?'Tires slipping':T.surfaces[rider.surface].name;
    let cue='',detail='',pace='';
    if(rider.phase==='crashed'){
      cue=rider.crashInfo?.title||'Descent ended';
      detail=rider.crashInfo?.metrics||rider.reason;
    }else if(rider.phase==='riding'&&performance.now()<kickMessageUntil){
      cue=kickMessage;
    }else if(rider.recovery>.12){
      cue='Hold it together';detail='Ease the steering. Countersteer gently if the bike leans.';
    }else if(rider.phase==='riding'&&rider.time-rider.lastSave<1.5){
      cue='Saved it';pace='line';
    }else if(!crew.room&&!practice&&rider.time<journey.state.restUntil){
      cue='Rest point saved';detail='After a fall, you can try again from this outlook.';pace='line';
    }else if(!rider.grounded&&rider.airTime>.12){
      const pitch=rider.airPitchError,roll=rider.airRollError;
      if(Math.abs(pitch)>.34){
        cue=pitch>0?'Lower the nose':'Lift the nose';
        detail='Tap '+(pitch>0?'W':'S')+' to match the landing slope.';
      }else if(Math.abs(roll)>.31){
        cue='Match the bank';
        detail='Tap '+(roll>0?'A':'D')+' to bring the wheels in line.';
      }
    }else if(lastLandedGap&&rider.time<landedGapUntil){
      cue=lastLandedGap.name+' cleared';
      pace='line';
    }else if(practice&&rider.y<practice.lip){
      const speed=Math.round(rider.speed*3.6);
      pace=speed<practice.min?'low':speed>practice.max?'high':'line';
      cue=speed>practice.max?'Hold Shift before takeoff':'Coast off the lip';
      detail=practice.min+'–'+practice.max+' km/h. Look for the downslope beyond the gap.';
    }
    fields.cue.textContent=cue;fields.detail.textContent=detail;
    fields.callout.hidden=!cue;
    fields.callout.dataset.pace=pace;
    fields.debug.hidden=!debug||inspection!==null;
    if(debug){
      const gpu=scene.getGame().getRenderer().getThreeRenderer()?.info.render;
      fields.debug.textContent=[
        rider.phase+(paused?' / paused':'')+' | '+fps.toFixed(1)+' fps | '+dropFrames+' skipped stalls',
        'Position '+[rider.x,rider.y,rider.z].map(n=>n.toFixed(2)).join(', '),
        'Speed '+rider.speed.toFixed(2)+' m/s | heading '+(rider.yaw*180/Math.PI).toFixed(1),
        'Grip '+rider.grip+' | slip '+rider.slip.toFixed(2)+' | ground '+rider.grounded,
        'Chute '+rider.looseTime.toFixed(2)+' s | draws '+(gpu?.calls??0)+' | tris '+(gpu?.triangles??0),
        'Frame peak '+Math.round(worstFrame*1000)+' ms'+(rider.crashInfo?' | '+rider.crashInfo.code:'')
      ].join('\n');
    }
  }
  const held=(...names)=>names.some(name=>keys.has(name));
  // Physics landings and asynchronous crew hits share one result path.
  // A kick must still report a DNF if its target has paused their tab.
  function endRun(now){
    releaseMouse();
    if(rider.phase==='finished'||rider.phase==='practiceDone'){
      playSound('bike-bell',.24);
      if(rider.phase==='finished'&&!crew.room&&!practice){
        arrivalReveal=now+1400;
        const key='downhill-bike:best-v8:'+T.seed+':'+T.stage;
        try{
          const best=Number(localStorage.getItem(key))||Infinity;
          if(journey.state.falls===0&&rider.time<best){
            localStorage.setItem(key,String(rider.time));bestResult=' · New clean best';
          }else if(Number.isFinite(best))bestResult=' · Clean best '+time(best);
        }catch{}
      }
      if(!practice)crew.finish(rider);
    }else{
      if(!crew.room&&!practice)journey.fall(rider);
      bailReveal=now+850;
      touchdown(.85,true);
      if(crew.room?.phase==='race')crew.fall(rider);
    }
    keys.clear();menu();
  }
  function tick(){
    const now=performance.now(),elapsed=(now-previous)/1000;previous=now;
    if(elapsed>0&&elapsed<2){frames++;frameTime+=elapsed;frameMax=Math.max(frameMax,elapsed);}
    if(frameTime>=1){fps=frames/frameTime;worstFrame=frameMax;frames=0;frameTime=0;frameMax=0;}
    const room=crew.room;
    if(room?.phase==='race'&&!paused){
      const raceNow=crew.now();
      if(rider.phase==='ready'&&raceNow>=room.startAt){
        rider.phase='riding';audioStart();
      }
    }
    if(!paused&&rider.phase==='riding'&&elapsed>.25){
      dropFrames++;acc=0;poseValid=false;
      if(++longFrames>=2)setPaused(true,'stall');
    }else if(!paused&&rider.phase==='riding'){
      longFrames=0;
      if(elapsed>.13)dropFrames++;
      acc+=Math.min(elapsed,.125);
      const forwardHeld=held('KeyW','ArrowUp'),backHeld=held('KeyS','ArrowDown');
      const input={steer:Number(held('KeyD','ArrowRight'))-Number(held('KeyA','ArrowLeft')),
        pedal:forwardHeld,brake:held('ShiftLeft','ShiftRight'),
        airPitch:Number(backHeld)-Number(forwardHeld)};
      while(acc>=M.dt&&rider.phase==='riding'){
        const keyboard=Number(held('KeyD','ArrowRight'))-Number(held('KeyA','ArrowLeft'));
        input.steer=mouseRiding.steer(rider,keyboard,keyboardSteering(),held('KeyC'));
        input.hop=hopQueued;hopQueued=false;
        for(const k of motion)prior[k]=rider[k];
        poseValid=true;
        const wasGrounded=rider.grounded;
        const inFlight=rider.flight?.jump;
        M.step(rider,input,T);acc-=M.dt;
        if(!crew.room&&!practice)journey.update(rider,M.dt);
        if(!wasGrounded&&rider.grounded&&rider.impact>.12&&rider.phase==='riding')touchdown(rider.impact);
        if(!practice&&inFlight&&!wasGrounded&&rider.grounded){
          const surface=T.sample(rider.x,rider.y);
          if(surface.landing&&surface.jump===inFlight){
            landedGaps.add(inFlight.name);
            lastLandedGap=inFlight;
            landedGapUntil=rider.time+2.3;
          }
        }
        if(practice&&rider.phase==='riding'){
          const surface=T.sample(rider.x,rider.y);
          if(surface.gap&&surface.jump===practice&&!rider.grounded)practiceAirborne=true;
          if(practiceLandingAt===null&&practiceAirborne&&!wasGrounded&&rider.grounded&&
            surface.landing&&surface.jump===practice)practiceLandingAt=rider.y;
          const caught=practiceLandingAt!==null&&rider.grounded&&rider.y>=practiceLandingAt+7;
          if(caught||rider.y>=practice.runout)rider.phase='practiceDone';
        }
      }
      if(room?.phase==='race'){
        rider.time=Math.max(0,(crew.now()-room.startAt)/1000);
      }
      if(rider.phase!=='riding'){
        endRun(now);
      }
    }
    if(bailReveal&&now>=bailReveal){bailReveal=0;menu();}
    if(arrivalReveal&&now>=arrivalReveal){arrivalReveal=0;menu();}
    let pose=rider;
    if(!snap&&!paused&&poseValid&&rider.phase==='riding'){
      pose=Object.assign(rendered,rider);
      const t=T.clamp(acc/M.dt,0,1);
      for(const k of motion){
        const d=rider[k]-prior[k];
        pose[k]=k==='hopAge'&&d<0?rider[k]:prior[k]+(k==='yaw'?Math.atan2(Math.sin(d),Math.cos(d)):d)*t;
      }
    }
    view.render(pose,Math.min(elapsed,.075),snap,angles[inspection]??null,held('KeyC')||rider.phase==='ready',mouseRiding.view(pose.yaw));
    const visualDt=Math.min(elapsed,.05);
    view.renderOthers(crew.frame(rider,visualDt),paused?0:visualDt,pose,snap);
    snap=false;
    if(now-lastUI>=65){drawHUD();audioUpdate();lastUI=now;}
  }
  if(crew.invited)crew.open();
  view.render(rider,0,true,null,true);drawHUD();menu();
  return {tick,dispose(){releaseMouse();controller.abort();crew.close();view.dispose();ui.remove();audio?.close().catch(()=>{});}};
}
