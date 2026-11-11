const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const {randomInt,randomBytes} = require('node:crypto');
const {WebSocketServer} = require('ws');
const track = require('../src/landscape.js');

const root=path.resolve(__dirname,'../build');
const types={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8',
  '.css':'text/css; charset=utf-8','.json':'application/json','.png':'image/png',
  '.jpg':'image/jpeg','.ogg':'audio/ogg','.wasm':'application/wasm','.svg':'image/svg+xml'};
const roomAlphabet='ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const rules=21;
function code(){
  return Array.from({length:6},()=>roomAlphabet[randomInt(roomAlphabet.length)]).join('');
}
function riderName(name){
  return typeof name==='string'?name.replace(/[^a-zA-Z0-9 _-]/g,'').trim().slice(0,16):'';
}
function serve(req,res){
  res.setHeader('Cache-Control','no-store');
  res.setHeader('X-Content-Type-Options','nosniff');
  if(req.method!=='GET'&&req.method!=='HEAD'){res.writeHead(405).end();return;}
  let route;
  try {route=decodeURIComponent(new URL(req.url,'http://localhost').pathname);}
  catch {res.writeHead(400).end();return;}
  if(route==='/health'){res.writeHead(200,{'Content-Type':'application/json'}).end(JSON.stringify({game:'downhill-bike',crew:rules}));return;}
  if(route==='/favicon.ico'){res.writeHead(204).end();return;}
  const target=path.resolve(root,'.'+(route==='/'?'/index.html':route));
  if(!target.startsWith(root+path.sep)){res.writeHead(403).end();return;}
  fs.stat(target,(error,info)=>{
    if(error||!info.isFile()){res.writeHead(404).end();return;}
    res.writeHead(200,{'Content-Type':types[path.extname(target)]||'application/octet-stream','Content-Length':info.size});
    if(req.method==='HEAD'){res.end();return;}
    const input=fs.createReadStream(target);
    input.once('error',()=>res.destroy());
    res.once('close',()=>input.destroy());
    input.pipe(res);
  });
}
function createCrewServer({countdownMs=3000,roundMs=600000,minimumFinishMs=8500}={}){
  const server=http.createServer(serve);
  const wss=new WebSocketServer({noServer:true,maxPayload:1024,perMessageDeflate:false});
  const rooms=new Map();
  function send(socket,data){
    if(socket.readyState===1&&socket.bufferedAmount<64*1024)socket.send(JSON.stringify(data));
  }
  function sendError(socket,message){send(socket,{type:'error',message});}
  function playerInfo(p){
    return {id:p.id,name:p.name,slot:p.slot,ready:p.ready,finish:p.finish,falls:p.falls,dnf:p.dnf};
  }
  function roomInfo(room){
    return {type:'room',code:room.code,owner:room.owner,seed:room.seed,stage:room.stage,
      phase:room.phase,round:room.round,startAt:room.startAt,endsAt:room.endsAt,players:[...room.players.values()].map(playerInfo)};
  }
  function broadcast(room,data,except){
    for(const p of room.players.values())if(p!==except)send(p.socket,data);
  }
  function snapshot(room){broadcast(room,roomInfo(room));}
  function closeRound(room){
    if(room.phase!=='race')return;
    for(const p of room.players.values())if(p.finish===null)p.dnf=true;
    room.phase='results';
    snapshot(room);
  }
  function maybeFinish(room){
    if(room.phase==='race'&&[...room.players.values()].every(p=>p.finish!==null||p.dnf))closeRound(room);
  }
  function leave(p){
    const room=p.room;
    if(!room)return;
    room.players.delete(p.id);p.room=null;
    if(!room.players.size){rooms.delete(room.code);return;}
    if(room.owner===p.id)room.owner=room.players.keys().next().value;
    maybeFinish(room);
    snapshot(room);
  }
  function enter(p,data){
    if(data.rules!==rules){sendError(p.socket,'Reload the game to join the current race build.');return;}
    if(p.room){sendError(p.socket,'Leave your current crew first.');return;}
    let room;
    if(data.type==='create'){
      if(rooms.size>=250){sendError(p.socket,'All crew rooms are busy. Try again soon.');return;}
      let id;
      do{id=code();}while(rooms.has(id));
      room={code:id,owner:p.id,seed:randomBytes(4).readUInt32LE(),stage:1,phase:'lobby',
        round:0,startAt:0,endsAt:0,players:new Map()};
      rooms.set(id,room);
    }else{
      room=rooms.get(typeof data.code==='string'?data.code.trim().toUpperCase():'');
      if(!room){sendError(p.socket,'Crew code not found.');return;}
      if(room.phase!=='lobby'){sendError(p.socket,'That crew is on a descent. Join when they return to the lobby.');return;}
      if(room.players.size>=4){sendError(p.socket,'That crew is full.');return;}
    }
    const slot=[0,1,2,3].find(n=>![...room.players.values()].some(player=>player.slot===n));
    Object.assign(p,{name:riderName(data.name)||'Rider '+(slot+1),slot,ready:false,
      finish:null,falls:0,dnf:false,lastPose:0,lastKick:0,pose:null,room});
    room.players.set(p.id,p);
    send(p.socket,{type:'joined',id:p.id,room:roomInfo(room)});
    snapshot(room);
  }
  function start(room,advance){
    if(advance)room.stage++;
    room.terrain=track.makeTrack(room.seed,room.stage);
    room.round++;
    room.phase='race';
    room.startAt=Date.now()+countdownMs;
    room.endsAt=room.startAt+roundMs;
    for(const p of room.players.values())Object.assign(p,{ready:false,finish:null,falls:0,dnf:false,lastPose:0,lastKick:0,pose:null});
    snapshot(room);
  }
  const horizontalLimit=Math.max(-track.bounds.left,track.bounds.right)+16;
  const limits=[horizontalLimit,track.bounds.bottom+16,Math.max(400,Math.abs(track.valleyZ)+100),7,26,1.6,1.4,1.1,1.1,1.1,1.1,1e5,1e5,1.1,.25,.25,.25,.82,1e5,1.1,26,26,
    .21,.23,26,26,48];
  const validPose=pose=>Array.isArray(pose)&&pose.length===limits.length&&
    pose.every((value,index)=>Number.isFinite(value)&&Math.abs(value)<=limits[index]);
  function kick(room,rider,side,now){
    if((side!==-1&&side!==1)||now-rider.lastKick<650||!rider.pose||now-rider.lastPose>260)return;
    rider.lastKick=now;
    const [x,y,z,yaw]=rider.pose;
    const sin=Math.sin(yaw),cos=Math.cos(yaw);
    let target=null,distance=Infinity,solid=false;
    for(const other of room.players.values()){
      if(other===rider||other.dnf||other.finish!==null||!other.pose||now-other.lastPose>260)continue;
      const dx=other.pose[0]-x,dy=other.pose[1]-y;
      const lateral=(dx*cos-dy*sin)*side,ahead=dx*sin+dy*cos;
      if(lateral<.38||lateral>1.85||Math.abs(ahead)>1.28||Math.abs(other.pose[2]-z)>.85)continue;
      const reach=Math.hypot(lateral,ahead);
      if(reach<distance){
        target=other;distance=reach;
        // A full extension beside the torso unseats the rider. At the edge
        // of reach or ahead of the bike it is a recoverable glancing shove.
        solid=lateral<=1.65&&Math.abs(ahead)<=.85&&Math.abs(other.pose[2]-z)<=.60;
      }
    }
    const shove=target?4.5+.055*Math.min(rider.pose[4],20):0;
    broadcast(room,{type:'kick',round:room.round,id:rider.id,side,target:target?.id??null,solid,
      x:cos*side*shove+sin*.36,y:-sin*side*shove+cos*.36});
  }
  function receive(p,data){
    if(!data||typeof data!=='object'||Array.isArray(data))return;
    if(data.type==='ping'){send(p.socket,{type:'pong',sent:data.sent,now:Date.now()});return;}
    if(data.type==='create'||data.type==='join'){enter(p,data);return;}
    if(data.type==='leave'){leave(p);send(p.socket,{type:'left'});return;}
    const room=p.room;
    if(!room)return;
    if(data.type==='ready'&&room.phase==='lobby'){p.ready=data.value===true;snapshot(room);return;}
    if(data.type==='start'&&p.id===room.owner&&room.phase==='lobby'){
      if(room.players.size<2||[...room.players.values()].some(q=>q!==p&&!q.ready)){
        sendError(p.socket,'Wait for another rider to mark ready.');return;
      }
      start(room,false);return;
    }
    if(p.id===room.owner&&room.phase==='results'){
      if(data.type==='advance'&&[...room.players.values()].some(q=>q.finish!==null)){start(room,true);return;}
      if(data.type==='retry'){start(room,false);return;}
      if(data.type==='lobby'){
        room.phase='lobby';room.startAt=0;
        for(const player of room.players.values())player.ready=false;
        snapshot(room);return;
      }
    }
    if(room.phase!=='race'||data.round!==room.round||p.finish!==null||p.dnf)return;
    const now=Date.now();
    if(data.type==='pose'){
      if(now-p.lastPose<44||!validPose(data.pose))return;
      p.lastPose=now;p.pose=data.pose;
      broadcast(room,{type:'pose',id:p.id,round:room.round,pose:p.pose},p);return;
    }
    if(now<room.startAt)return;
    if(data.type==='kick'){kick(room,p,data.side,now);return;}
    if(data.type==='crash'){
      p.falls++;p.dnf=true;
      if(validPose(data.pose)){
        p.pose=data.pose;
        broadcast(room,{type:'pose',id:p.id,round:room.round,pose:p.pose},p);
      }
      broadcast(room,{type:'fall',id:p.id,round:room.round},p);
      maybeFinish(room);
      if(room.phase==='race')snapshot(room);
      return;
    }
    if(data.type==='finish'&&p.pose&&p.pose[1]>=track.finish-16&&validPose(data.pose)&&
      data.pose[13]===1&&room.terrain.reachedValley(...data.pose.slice(0,3))&&now-room.startAt>=minimumFinishMs){
      p.finish=now-room.startAt;
      maybeFinish(room);
      if(room.phase==='race')snapshot(room);
    }
  }
  server.on('upgrade',(req,socket,head)=>{
    if(req.url!=='/crew'||wss.clients.size>=1024){socket.destroy();return;}
    const origin=req.headers.origin;
    if(origin){
      try{if(new URL(origin).host!==req.headers.host){socket.destroy();return;}}
      catch{socket.destroy();return;}
    }
    wss.handleUpgrade(req,socket,head,ws=>wss.emit('connection',ws));
  });
  wss.on('connection',socket=>{
    const p={id:randomBytes(6).toString('hex'),socket,room:null,alive:true,window:0,count:0};
    send(socket,{type:'hello',now:Date.now()});
    socket.on('message',payload=>{
      const now=Date.now();
      if(now-p.window>=1000){p.window=now;p.count=0;}
      if(++p.count>55){socket.close(1008,'Rate limit');return;}
      let data;
      try{data=JSON.parse(payload.toString());}catch{return;}
      receive(p,data);
    });
    socket.on('pong',()=>{p.alive=true;});
    socket.on('close',()=>leave(p));
    socket.on('error',()=>leave(p));
    socket.player=p;
  });
  const timer=setInterval(()=>{
    for(const room of rooms.values())if(room.phase==='race'&&Date.now()>=room.endsAt)closeRound(room);
  },750);
  const heartbeat=setInterval(()=>{
    for(const socket of wss.clients){
      if(!socket.player.alive)socket.terminate();
      else{socket.player.alive=false;socket.ping();}
    }
  },20000);
  timer.unref();heartbeat.unref();
  server.on('close',()=>{
    clearInterval(timer);clearInterval(heartbeat);
    for(const socket of wss.clients)socket.terminate();
    wss.close();
  });
  return server;
}
if(require.main===module){
  const port=Number(process.env.PORT)||8184;
  createCrewServer().listen(port,process.env.HOST||'0.0.0.0',()=>{
    console.log('Downhill Bike crew server listening on port '+port);
  });
}
module.exports={createCrewServer};
