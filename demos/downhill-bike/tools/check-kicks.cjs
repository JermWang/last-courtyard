const assert=require('node:assert/strict');
const {once}=require('node:events');
const {setTimeout:delay}=require('node:timers/promises');
const WebSocket=require('ws');
const {createCrewServer}=require('./crew-server.cjs');
const M=require('../src/bike.js');

async function check(){
  const server=createCrewServer({countdownMs:50,roundMs:30000});
  server.listen(0,'127.0.0.1');await once(server,'listening');
  const clients=[];
  async function connect(){
    const socket=new WebSocket('ws://127.0.0.1:'+server.address().port+'/crew');
    const inbox=[];
    socket.on('message',data=>inbox.push(JSON.parse(data)));
    await once(socket,'open');
    const client={socket,inbox,send:message=>socket.send(JSON.stringify(message)),async take(match){
      for(let i=0;i<150;i++){
        const index=inbox.findIndex(match);
        if(index>=0)return inbox.splice(index,1)[0];
        await delay(10);
      }
      assert.fail('Kick test message timed out');
    }};
    clients.push(client);return client;
  }
  try{
    const a=await connect(),b=await connect();
    a.send({type:'create',rules:21,name:'Left'});
    const host=await a.take(m=>m.type==='joined');
    b.send({type:'join',rules:21,name:'Right',code:host.room.code});
    const guest=await b.take(m=>m.type==='joined');
    b.send({type:'ready',value:true});
    await a.take(m=>m.type==='room'&&m.players.some(p=>p.id===guest.id&&p.ready));
    a.send({type:'start'});
    const room=await a.take(m=>m.type==='room'&&m.phase==='race');
    await delay(100);
    const round=room.round;
    const pose=(x,y=45,z=30)=>[x,y,z,0,14,0,-.22,0,0,0,0,0,0,1,0,0,0,0,0,0,0,0,.04,.06,0,14,-3];
    async function attempt(x,y,z,side=1,stale=false){
      await delay(710);
      a.send({type:'pose',round,pose:pose(0)});
      b.send({type:'pose',round,pose:pose(x,y,z)});
      await a.take(m=>m.type==='pose');await b.take(m=>m.type==='pose');
      if(stale){
        await delay(290);
        a.send({type:'pose',round,pose:pose(0)});
        await b.take(m=>m.type==='pose');
      }
      a.send({type:'kick',round,side,solid:true}); // Client cannot demand a solid hit.
      return a.take(m=>m.type==='kick'&&m.id===host.id);
    }
    for(const [x,y,z,side,stale] of [[3,45,30,1,false],[1.4,45,30,-1,false],
      [1.4,47,30,1,false],[1.4,45,32,1,false],[1.4,45,30,1,true]]){
      const miss=await attempt(x,y,z,side,stale);
      assert.equal(miss.target,null);assert.equal(miss.solid,false);
    }
    const graze=await attempt(1.78,45,30);
    assert.equal(graze.target,guest.id);assert.equal(graze.solid,false);
    const hit=await attempt(1.4,45,30);
    assert.equal(hit.target,guest.id);assert.equal(hit.solid,true);
    const victim=M.create();Object.assign(victim,{phase:'riding',speed:14,vy:14});
    M.takeKick(victim,hit.x,hit.y,hit.solid);
    assert.equal(victim.crashInfo.code,'kicked-off');
    b.send({type:'crash',round,pose:pose(1.4)});
    const standings=await a.take(m=>m.type==='room'&&m.players.some(p=>p.id===guest.id&&p.dnf));
    assert.equal(standings.players.find(p=>p.id===guest.id).falls,1);
    a.send({type:'kick',round,side:1});
    await delay(100);
    assert.equal(a.inbox.filter(m=>m.type==='kick').length,0,'Cooldown must reject a repeated kick');
    console.log('Kick range, wrong side, vertical separation, stale poses, glancing contact, square-hit bail and DNF passed.');
  }finally{
    for(const client of clients)client.socket.terminate();
    await new Promise(resolve=>server.close(resolve));
  }
}
check().catch(error=>{console.error(error);process.exitCode=1;});
