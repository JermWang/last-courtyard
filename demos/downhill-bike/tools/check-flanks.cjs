const assert=require('node:assert/strict'),Landscape=require('../src/landscape.js'),M=require('../src/bike.js');
const journeyFor=require('../src/journey.js');
for(const [seed,stage] of [[0,1],[17,2]]){
const T=Landscape.makeTrack(seed,stage);
console.log('Flank features',{seed,stage});
assert.equal(T.flankCuts.length,14);assert.equal(T.flankJumps.length,8);
for(const c of T.flankCuts){
  const point=a=>{const y=c.y+c.skew*a;return T.sample(T.mirrored*(c.x+a)+T.spine(y),y);};
  assert.ok(point(0).erosion>.8,'The crevice centre must be real erosion');
  for(const s of c.saddles)assert.ok(point(s).erosion<.2,'Each crevice needs two shallow crossings');
  for(const s of [-1,1])assert.ok(point(s*(c.span+2)).erosion<.2,'The ends must remain open');
}
for(const s of T.flankShelves){
  const r=M.create(T,s.y),journey=journeyFor(T);
  Object.assign(r,{phase:'riding',x:s.worldX,yaw:0,z:T.sample(s.worldX,s.y).z+M.clearance});
  for(let i=0;i<160;i++){M.step(r,{steer:0,brake:true,airPitch:0},T);journey.update(r,M.dt);}
  assert.equal(journey.state.checkpoint?.shelfY,s.y,'New resting pockets must save through normal physics');
}
const failures=[];
for(const j of T.flankJumps)for(const [speed,hop] of [[8,false],[11,false],[15,false],[11,true],[19,false],[22,false],[19,true]]){
  const y=j.lip-10,r=M.create(T,y),yaw=Math.atan2(j.center(y+.5)-j.center(y-.5),1);
  Object.assign(r,{phase:'riding',x:j.center(y),yaw,z:T.sample(j.center(y),y).z+M.clearance,speed,
    vx:Math.sin(yaw)*speed,vy:Math.cos(yaw)*speed});
  let flew=false,landed=false,pressed=false;
  for(let i=0;i<120*15&&r.phase==='riding'&&r.y<j.end+3;i++){
    const aim=Math.atan2(j.center(r.y+5)-r.x,5),press=hop&&!pressed&&r.y>=j.lip-2;
    M.step(r,{steer:T.clamp((aim-r.yaw)*3,-1,1),pedal:false,brake:false,airPitch:0,hop:press},T);pressed||=press;
    if(!r.grounded&&r.y>j.lip)flew=true;
    if(flew&&r.grounded&&r.y>=j.land)landed=true;
  }
  const good=landed&&r.phase==='riding'&&r.y>=j.end;
  console.log(j.name,speed,hop?'hop':'coast',good?'landed':r.reason||'no landing',r.y.toFixed(1));
  if(!good)failures.push({name:j.name,speed,hop,reason:r.reason,metrics:r.crashInfo?.metrics,y:r.y,offset:r.x-j.center(r.y)});
}
assert.deepEqual(failures,[],'Small flank jumps must land across a useful speed range');
console.log('Fourteen open-ended crevices, six usable rest pockets and all small-gap coast/hop cases passed.');
}
