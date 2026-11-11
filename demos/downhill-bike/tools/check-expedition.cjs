const assert=require('node:assert/strict'),T=require('../src/expedition.js'),M=require('../src/bike.js');
const lineFor=require('./expedition-line.cjs');
function run(track,side){
  const r=M.create(track),line=lineFor(track,side);r.phase='riding';
  let air=0,maxAir=0;
  for(let tick=0;tick<120*440&&r.phase==='riding';tick++){
    const aim=Math.atan2(line(r.y+4.6)-r.x,4.6);
    M.step(r,{steer:T.clamp((aim-r.yaw)*3,-1,1),pedal:r.speed<10.2,brake:r.speed>11,airPitch:0},track);
    air=r.grounded?0:air+M.dt;maxAir=Math.max(maxAir,air);
  }
  return {phase:r.phase,x:r.x,y:r.y,time:r.time,reason:r.reason,crash:r.crashInfo,maxAir,saves:r.saves};
}
for(const [seed,stage] of [[0,1],[17,1],[84521,1],[17,2]]){
  const track=T.makeTrack(seed,stage);
  for(const x of [-90,0,90])assert.ok(Math.abs(track.sample(x,620.001).z-track.sample(x,619.999).z)<.01,'Summit extension seam');
  for(const s of track.shelves){
    const x=s.x*track.mirrored;assert.ok(Math.abs(track.sample(x,s.y+.5).z-track.sample(x,s.y-.5).z)<.20,'Rest shelf slope');
    const journey=require('../src/journey.js')(track),r=M.create(track,s.y);
    Object.assign(r,{x,yaw:0,z:track.sample(x,s.y).z+M.clearance,phase:'riding'});
    for(let i=0;i<160;i++){M.step(r,{brake:true,steer:0,airPitch:0},track);journey.update(r,M.dt);}
    assert.equal(journey.state.checkpoint?.shelfY,s.y,'Each outlook must let a rider actually stop and save');
  }
  for(const side of [-1,1]){const result=run(track,side);console.log('Expedition',seed,stage,side,JSON.stringify(result));assert.equal(result.phase,'finished');}
}
for(const j of T.extraJumps){
  for(const speed of [12,15,18]){
    const r=M.create(T,j.lip-9);Object.assign(r,{x:j.center(j.lip),z:T.sample(j.center(j.lip),j.lip-9).z+M.clearance,phase:'riding',yaw:0,vy:speed,speed});
    let flew=false,landed=false;
    for(let i=0;i<120*10&&r.phase==='riding'&&r.y<j.runout;i++){
      M.step(r,{steer:T.clamp((Math.atan2(j.center(r.y+4)-r.x,4)-r.yaw)*3,-1,1),pedal:false,brake:false,airPitch:0},T);
      if(!r.grounded&&r.y>j.lip)flew=true;
      if(flew&&r.grounded&&r.y>=j.land)landed=true;
    }
    console.log('Gap',j.name,speed,r.phase,landed,r.reason);assert.ok(landed&&r.phase==='riding','Optional jump should have a usable landing');
  }
}
const root=T.roots.find(r=>T.sample(r.x,r.y).kind==='roots'&&!T.sample(r.x,r.y).jump);
assert.ok(root,'A visible root must reach the tire surface');
assert.ok(T.sample(root.x,root.y).z-(T.sample(root.x,root.y-1).z+T.sample(root.x,root.y+1).z)/2>.04,'Roots must be raised geometry');
const trunk=[0,20,.24,'tree'];
const flat={...T,sample:()=>({z:0,kind:'dirt',gap:false,jump:null}),rocks:[trunk],obstaclesAt:()=>[trunk],reachedValley:()=>false};
const impact=M.create(flat);Object.assign(impact,{phase:'riding',x:0,y:19.4,z:.38,speed:15,vy:15});
for(let i=0;i<10&&impact.phase==='riding';i++)M.step(impact,{steer:0},flat);
assert.equal(impact.crashInfo?.code,'tree-strike','Trunks need real collision and a specific cause');
const graze=M.create(flat);Object.assign(graze,{phase:'riding',x:.51,y:19.9,z:.38,speed:15,vy:15});
M.step(graze,{steer:0},flat);assert.equal(graze.phase,'riding');assert.ok(graze.vy>12);
console.log('Long mountain: continuous surface, all nine rest shelves, eight full itineraries, four optional gaps, raised roots and trunk impacts/grazes passed.');
