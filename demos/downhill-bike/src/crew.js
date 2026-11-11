/* Crew rooms use the browser's WebSocket API and the same-origin game server. */
function createBikeCrew(ui,onRoom,onLeave,onKick){
  const rules=21;
  const panel=document.createElement('div');
  panel.className='bike-cover crew-cover';
  panel.hidden=true;
  panel.innerHTML=`
    <section class="bike-card crew-card" aria-label="Crew Descent">
      <div class="bike-label">PRIVATE CREW / UP TO 4 RIDERS</div>
      <h1>Crew Descent</h1>
      <p data-crew-summary>Share a code and ride the same mountain together.</p>
      <output class="bike-result" data-crew-crash hidden></output>
      <div data-crew-entry>
        <label>Your rider <input data-crew-name maxlength="16" autocomplete="nickname" placeholder="Rider"></label>
        <button type="button" data-crew-create>Create crew</button>
        <form data-crew-join>
          <label>Crew code <input data-crew-code maxlength="6" autocapitalize="characters" autocomplete="off" placeholder="ABC123" required></label>
          <button type="submit">Join crew</button>
        </form>
      </div>
      <div data-crew-room hidden>
        <div class="crew-code" data-crew-room-code></div>
        <button type="button" class="bike-secondary" data-crew-invite>Copy invite link</button>
        <input data-crew-invite-url readonly hidden aria-label="Crew invite link">
        <ul data-crew-list aria-label="Crew standings"></ul>
        <button type="button" data-crew-primary></button>
        <button type="button" class="bike-secondary" data-crew-repeat hidden>Retry trail</button>
        <button type="button" class="bike-secondary" data-crew-lobby hidden>Return to lobby</button>
      </div>
      <button type="button" class="bike-secondary crew-exit" data-crew-back>Back to solo</button>
      <p class="crew-message" data-crew-message aria-live="polite"></p>
    </section>`;
  ui.append(panel);
  const live=document.createElement('div');
  live.className='crew-live';
  live.hidden=true;
  live.setAttribute('aria-live','polite');
  ui.append(live);
  const el=name=>panel.querySelector('[data-crew-'+name+']');
  const name=el('name'),code=el('code');
  const message=text=>{el('message').textContent=text;};
  const pendingInvite=(new URLSearchParams(location.search).get('crew')||'').toUpperCase();
  if(/^[A-Z0-9]{6}$/.test(pendingInvite))code.value=pendingInvite;
  const ghosts=new Map();
  let socket=null,room=null,playerId=null,shown=false,action=null,localCrash=null;
  let offset=0,lastSend=0;
  const now=()=>Date.now()+offset;
  const me=()=>room?.players.find(player=>player.id===playerId);
  const owner=()=>room?.owner===playerId;
  function send(data){
    if(socket?.readyState!==WebSocket.OPEN)return false;
    socket.send(JSON.stringify(data));return true;
  }
  function formatTime(ms){return (ms/1000).toFixed(1)+' s';}
  function render(){
    panel.hidden=!shown||(room?.phase==='race'&&me()?.finish===null&&!me()?.dnf);
    live.hidden=!shown||room?.phase!=='race';
    const crash=room?.phase!=='lobby'&&me()?.dnf?localCrash:null;
    el('crash').hidden=!crash;
    el('crash').textContent=crash?crash.title+' · '+crash.metrics:'';
    if(!room){
      el('entry').hidden=false;el('room').hidden=true;
      el('summary').textContent='Share a code and ride the same mountain together.';
      return;
    }
    el('entry').hidden=true;el('room').hidden=false;
    const result=room.phase==='results',waiting=room.phase==='race';
    const canAdvance=room.players.some(p=>p.finish!==null);
    el('room-code').textContent='CREW '+room.code;
    el('summary').textContent=result?(canAdvance?'Descent complete. Ride this trail again or move down the mountain.':'Nobody reached the valley. Give this descent another run.'):waiting?
      (me()?.dnf?'Run ended. The rest of the crew is still riding.':'Finished. The rest of the crew is still riding.'):
      'One life per rider. Fastest clean finish wins.';
    const rows=room.players.slice().sort((a,b)=>(a.finish??Infinity)-(b.finish??Infinity));
    el('list').replaceChildren(...rows.map(rider=>{
      const li=document.createElement('li');
      const label=document.createElement('strong'),value=document.createElement('span');
      label.textContent='#'+(17+rider.slot*7)+' '+rider.name+(rider.id===playerId?' (you)':'');
      value.textContent=rider.finish!==null?formatTime(rider.finish):rider.dnf&&room.phase!=='lobby'?
        'DNF':waiting?'Riding':rider.id===room.owner?'Host':rider.ready?'Ready':'Waiting';
      li.append(label,value);return li;
    }));
    const primary=el('primary');
    primary.hidden=waiting||(result&&!owner());
    primary.textContent=result?(canAdvance?'Next descent':'Retry descent'):owner()?'Start descent':me()?.ready?'Unready':'Ready';
    primary.disabled=room.phase==='lobby'&&owner()&&(room.players.length<2||room.players.some(p=>p.id!==playerId&&!p.ready));
    el('repeat').hidden=!result||!owner()||!canAdvance;
    el('lobby').hidden=!result||!owner();
    updateLive();
  }
  function updateLive(){
    if(live.hidden)return;
    const stamp=now(),remaining=Math.min(3,Math.ceil((room.startAt-stamp)/1000));
    const secondsLeft=Math.max(0,Math.ceil((room.endsAt-stamp)/1000));
    const finished=room.players.filter(player=>player.finish!==null).length;
    const out=room.players.filter(player=>player.dnf).length;
    const text=remaining>0?'CREW '+room.code+' / START IN '+remaining:
      'CREW '+room.code+' / '+finished+' FINISHED / '+out+' OUT'+(secondsLeft<=20?' / '+secondsLeft+'s LEFT':'');
    if(live.textContent!==text)live.textContent=text;
  }
  function setRoom(next){
    const previous=room;
    room=next;
    if(previous?.round!==room.round){
      ghosts.clear();
      lastSend=0;
      localCrash=null;
    }
    for(const id of ghosts.keys())if(!room.players.some(p=>p.id===id))ghosts.delete(id);
    onRoom(next,previous);
    render();
  }
  const fields=['x','y','z','yaw','speed','lean','pitch','turn','shift','brake','drive','spin','crank',
    'grounded','compression','frontTravel','rearTravel','hopAge','rearSpin','rearSkid','slip','slipSide',
    'forkLoad','shockLoad','vx','vy','vz'];
  function receive(event){
    let payload;
    try{payload=JSON.parse(event.data);}catch{return;}
    if(payload.type==='hello'){
      offset=payload.now-Date.now();send({type:'ping',sent:Date.now()});return;
    }
    if(payload.type==='pong'){
      const receiveTime=Date.now();
      offset=payload.now-(receiveTime+payload.sent)*.5;return;
    }
    if(payload.type==='error'){message(payload.message);return;}
    if(payload.type==='joined'){playerId=payload.id;message('');setRoom(payload.room);return;}
    if(payload.type==='room'){message('');setRoom(payload);return;}
    if(payload.type==='pose'&&room?.round===payload.round){
      const player=room.players.find(p=>p.id===payload.id);
      if(!player)return;
      const pose={slot:player.slot,phase:'riding',time:0};
      fields.forEach((field,i)=>{pose[field]=field==='grounded'?Boolean(payload.pose[i]):payload.pose[i];});
      const prior=ghosts.get(payload.id);
      if(prior)prior.target=pose;
      else ghosts.set(payload.id,{current:{...pose},target:pose,fell:false});
    }
    if(payload.type==='fall'&&room?.round===payload.round){
      const other=ghosts.get(payload.id);
      if(other){Object.assign(other.current,other.target);other.fell=true;}
    }
    if(payload.type==='kick'&&room?.round===payload.round){
      const actor=ghosts.get(payload.id);
      if(actor){actor.kickSide=payload.side;actor.kickAge=.008;}
      onKick(payload);
    }
  }
  function connect(request){
    action=request;
    if(socket?.readyState===WebSocket.OPEN){send(action);action=null;return;}
    if(socket?.readyState===WebSocket.CONNECTING)return;
    message('Connecting to crew server...');
    const protocol=location.protocol==='https:'?'wss:':'ws:';
    const ws=new WebSocket(protocol+'//'+location.host+'/crew');
    socket=ws;
    ws.addEventListener('open',()=>{
      if(socket!==ws)return;
      if(action)send(action);
      action=null;
    });
    ws.addEventListener('message',event=>{if(socket===ws)receive(event);});
    ws.addEventListener('close',()=>{
      if(socket!==ws)return;
      socket=null;action=null;room=null;playerId=null;ghosts.clear();
      onLeave();
      message('Crew server disconnected. Check the link and try again.');
      render();
    });
  }
  function open(){shown=true;render();}
  function close(){
    shown=false;
    room=null;playerId=null;ghosts.clear();action=null;
    const previous=socket;socket=null;
    previous?.close();
    onLeave();message('');render();
  }
  function frame(rider,dt){
    if(room?.phase!=='race'&&room?.phase!=='results')return [];
    updateLive();
    const stamp=performance.now();
    if(room.phase==='race'&&(rider.phase==='ready'||rider.phase==='riding')&&stamp-lastSend>=64){
      transmitPose(rider);lastSend=stamp;
    }
    const output=[];
    for(const other of ghosts.values()){
      const {current,target}=other;
      const snap=Math.hypot(target.x-current.x,target.y-current.y)>14;
      const blend=snap?1:1-Math.exp(-15*dt);
      for(const field of fields){
        if(field==='grounded'){current.grounded=target.grounded;continue;}
        if(field==='hopAge'&&target.hopAge===0){current.hopAge=0;continue;}
        const change=target[field]-current[field];
        current[field]+=(field==='yaw'?Math.atan2(Math.sin(change),Math.cos(change)):change)*blend;
      }
      current.time+=dt;
      if(other.kickAge>0)other.kickAge=other.kickAge>=.38?0:other.kickAge+dt;
      current.kickAge=other.kickAge||0;
      current.kickSide=other.kickSide||0;
      current.phase=other.fell?'crashed':'riding';
      output.push(current);
    }
    return output;
  }
  const pack=rider=>fields.map(key=>Math.round(Number(rider[key]||0)*1000)/1000);
  function transmitPose(rider){send({type:'pose',round:room.round,pose:pack(rider)});}
  function finish(rider){
    if(room?.phase!=='race')return;
    send({type:'finish',round:room.round,pose:pack(rider)});
  }
  function fall(rider){
    if(room?.phase!=='race')return;
    localCrash=rider.crashInfo;
    send({type:'crash',round:room.round,pose:pack(rider)});
  }
  function kick(side){
    if(room?.phase==='race')send({type:'kick',round:room.round,side});
  }
  el('create').addEventListener('click',()=>connect({type:'create',rules,name:name.value}));
  el('join').addEventListener('submit',event=>{
    event.preventDefault();
    const value=code.value.trim().toUpperCase();
    if(!/^[A-Z0-9]{6}$/.test(value)){message('Enter a six-character crew code.');return;}
    connect({type:'join',rules,code:value,name:name.value});
  });
  el('primary').addEventListener('click',()=>{
    if(room.phase==='results')send({type:room.players.some(p=>p.finish!==null)?'advance':'retry'});
    else if(owner())send({type:'start'});
    else send({type:'ready',value:!me()?.ready});
  });
  el('repeat').addEventListener('click',()=>send({type:'retry'}));
  el('lobby').addEventListener('click',()=>send({type:'lobby'}));
  el('back').addEventListener('click',close);
  el('invite').addEventListener('click',async()=>{
    if(!room)return;
    const url=new URL(location.pathname,location.origin);
    url.searchParams.set('crew',room.code);
    try{await navigator.clipboard.writeText(url.href);message('Invite link copied.');}
    catch{
      const input=el('invite-url');
      input.hidden=false;input.value=url.href;input.select();
      message('Copy this link for your friends.');
    }
  });
  return {open,close,frame,finish,fall,kick,now,owner,me,render,
    get room(){return room;},get shown(){return shown;},get invited(){return Boolean(code.value);}};
}
