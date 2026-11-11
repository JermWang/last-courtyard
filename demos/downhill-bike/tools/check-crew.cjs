const assert=require('node:assert/strict');
const {once}=require('node:events');
const {setTimeout:delay}=require('node:timers/promises');
const WebSocket=require('ws');
const {createCrewServer}=require('./crew-server.cjs');
const track=require('../src/landscape.js');

async function check(){
  const server=createCrewServer({countdownMs:300,roundMs:2200,minimumFinishMs:90});
  server.listen(0,'127.0.0.1');
  await once(server,'listening');
  const base='127.0.0.1:'+server.address().port;
  const sockets=[];
  async function connect(){
    const socket=new WebSocket('ws://'+base+'/crew',{origin:'http://'+base});
    sockets.push(socket);
    const messages=[];
    socket.on('message',data=>messages.push(JSON.parse(data.toString())));
    await once(socket,'open');
    return {
      socket,
      send:data=>socket.send(JSON.stringify(data)),
      async take(match){
        for(let attempt=0;attempt<250;attempt++){
          const index=messages.findIndex(match);
          if(index>=0)return messages.splice(0,index+1).pop();
          await delay(10);
        }
        assert.fail('Expected crew message did not arrive');
      }
    };
  }
  try{
    const health=await fetch('http://'+base+'/health').then(response=>response.json());
    assert.equal(health.crew,21);
    const host=await connect(),guest=await connect();
    host.send({type:'create',rules:13,name:'Old build'});
    await host.take(m=>m.type==='error'&&m.message.includes('Reload'));
    host.send({type:'create',rules:21,name:'Trail Test'});
    const a=await host.take(m=>m.type==='joined');
    guest.send({type:'join',rules:21,name:'Pine Test',code:a.room.code});
    const b=await guest.take(m=>m.type==='joined');
    assert.equal(b.room.seed,a.room.seed);
    assert.notEqual(a.id,b.id);
    host.send({type:'start'});
    await host.take(m=>m.type==='error');
    guest.send({type:'ready',value:true});
    await host.take(m=>m.type==='room'&&m.players.some(p=>p.id===b.id&&p.ready));
    host.send({type:'start'});
    const race=m=>m.type==='room'&&m.phase==='race';
    const round=await host.take(race);
    assert.equal((await guest.take(race)).startAt,round.startAt);
    const pose=(y,x=0,z=30)=>[x,y,z,0,10,.05,-.22,.1,0,0,.5,12,3,1,.02,-.03,.01,.18,11,.4,1.3,-1.1,.11,.06,2,9,-3];
    const summit=track.sample(0,0).z+.38;
    host.send({type:'pose',round:round.round,pose:pose(0,-.8,summit)});
    guest.send({type:'pose',round:round.round,pose:pose(0,.8,summit)});
    assert.equal((await host.take(m=>m.type==='pose'&&m.id===b.id)).pose[0],.8);
    assert.equal((await guest.take(m=>m.type==='pose'&&m.id===a.id)).pose[0],-.8);
    await delay(Math.max(0,round.startAt-Date.now()+100));
    host.send({type:'pose',round:round.round,pose:pose(45,-.7)});
    guest.send({type:'pose',round:round.round,pose:pose(45,.7)});
    await host.take(m=>m.type==='pose'&&m.id===b.id);
    await guest.take(m=>m.type==='pose'&&m.id===a.id);
    host.send({type:'kick',round:round.round,side:-1});
    assert.equal((await host.take(m=>m.type==='kick')).target,null,'A kick must miss on the wrong side');
    host.send({type:'kick',round:round.round,side:1});
    guest.send({type:'kick',round:round.round,side:-1});
    const left=await host.take(m=>m.type==='kick'&&m.id===b.id);
    assert.equal(left.target,a.id);
    assert.ok(left.x<0);
    assert.equal(left.solid,true);
    await delay(660);
    host.send({type:'pose',round:round.round,pose:pose(55,-.7)});
    guest.send({type:'pose',round:round.round,pose:pose(55,.7)});
    await host.take(m=>m.type==='pose'&&m.id===b.id&&m.pose[1]===55);
    await guest.take(m=>m.type==='pose'&&m.id===a.id&&m.pose[1]===55);
    host.send({type:'kick',round:round.round,side:1});
    const right=await guest.take(m=>m.type==='kick'&&m.id===a.id&&m.side===1);
    assert.equal(right.target,b.id);
    assert.ok(right.x>0);
    assert.equal(right.solid,true);
    await delay(55);
    host.send({type:'pose',round:round.round,pose:pose(track.finish-12,102)});
    const seen=await guest.take(m=>m.type==='pose');
    assert.equal(seen.id,a.id);
    assert.deepEqual(seen.pose,pose(track.finish-12,102));
    guest.send({type:'crash',round:round.round});
    const fallen=await host.take(m=>m.type==='room'&&m.players.some(p=>p.id===b.id&&p.dnf));
    assert.equal(fallen.players.find(p=>p.id===b.id).falls,1);
    guest.send({type:'pose',round:round.round,pose:pose(track.finish-2)});
    const valleyPose=pose(track.finish,102,track.valleyFloor(102)+.38);
    guest.send({type:'finish',round:round.round,pose:valleyPose});
    host.send({type:'finish',round:round.round,pose:valleyPose});
    const results=await host.take(m=>m.type==='room'&&m.phase==='results');
    assert.ok(results.players.find(p=>p.id===a.id).finish!==null);
    assert.equal(results.players.find(p=>p.id===b.id).finish,null,'A crashed rider cannot finish the race');
    assert.ok(results.players.find(p=>p.id===b.id).dnf);
    host.send({type:'advance'});
    const next=await guest.take(m=>race(m)&&m.round>round.round);
    assert.equal(next.stage,2);
    assert.equal(next.seed,round.seed);
    assert.ok(next.players.every(p=>p.finish===null&&p.falls===0));
    const nextTrack=track.makeTrack(next.seed,next.stage);
    await delay(Math.max(0,next.startAt-Date.now()+100));
    host.send({type:'pose',round:next.round,pose:pose(nextTrack.finish-10,102,nextTrack.valleyFloor(102)+.38)});
    await guest.take(m=>m.type==='pose'&&m.id===a.id&&m.round===next.round);
    host.send({type:'finish',round:next.round,pose:pose(nextTrack.finish,102,nextTrack.valleyFloor(102)+.38)});
    await guest.take(m=>m.type==='room'&&m.players.some(p=>p.id===a.id&&p.finish!==null));
    const timeout=await host.take(m=>m.type==='room'&&m.phase==='results'&&m.round===next.round);
    assert.ok(timeout.players.find(p=>p.id===b.id).dnf);
    assert.ok(timeout.players.find(p=>p.id===a.id).finish!==null,'Seeded finish height must match the client mountain');
    host.send({type:'lobby'});
    await guest.take(m=>m.type==='room'&&m.phase==='lobby');
    host.socket.close();
    await guest.take(m=>m.type==='room'&&m.owner===b.id);
    console.log('Two crew clients share a start, poses, directional kicks, one-life DNF, results and the next seeded trail.');
  }finally{
    await Promise.all(sockets.map(async socket=>{
      if(socket.readyState===WebSocket.CLOSED)return;
      const done=once(socket,'close');
      socket.terminate();
      await done;
    }));
    await new Promise(resolve=>server.close(resolve));
  }
}
check().catch(error=>{console.error(error);process.exitCode=1;});
