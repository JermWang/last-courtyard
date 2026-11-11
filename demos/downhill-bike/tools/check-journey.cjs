const assert=require('node:assert/strict');
const T=require('../src/track.js'),M=require('../src/bike.js'),journey=require('../src/journey.js');
const flat={...T,rocks:[],sample:()=>({z:0,kind:'dirt',gap:false,jump:null}),reachedValley:()=>false};
function drop(vz){
  const r=M.create(flat);
  Object.assign(r,{phase:'riding',grounded:false,airTime:.2,z:.48,vz,vy:12,speed:12});
  for(let i=0;i<60&&r.phase==='riding'&&!r.grounded;i++)M.step(r,{steer:0,airPitch:0},flat);
  return r;
}
const saved=drop(-9.5);
const shallowContact=M.create(flat);
Object.assign(shallowContact,{phase:'riding',grounded:false,airTime:.2,z:.36,vz:-1,vy:10,speed:10});
M.step(shallowContact,{steer:0,airPitch:0},flat);
assert.ok(shallowContact.grounded&&shallowContact.vz<=0,'Correcting contact penetration must not launch the bike upward');
assert.equal(saved.phase,'riding','Moderately overloaded landing should give the rider a chance to save it');
assert.ok(saved.recovery>.15&&saved.grounded);
for(let i=0;i<240;i++)M.step(saved,{steer:0},flat);
assert.equal(saved.saves,1,'One impact must produce one save, not a stream of save notifications');
assert.equal(saved.recovery,0);
assert.equal(drop(-16).phase,'crashed','Extreme impact should still bail');
function settle(steer){
  const r=M.create(flat);
  Object.assign(r,{phase:'riding',grounded:true,recovery:1,recoveryLean:.3,recoveryPending:true,speed:8,vy:8});
  for(let i=0;i<45;i++)M.step(r,{steer},flat);
  return r;
}
assert.ok(settle(-.3).recovery<settle(.3).recovery,'Countersteering should settle the bike sooner than turning into the lean');
const stone={...flat,rocks:[[0,20,2]]};
const graze=M.create(stone);Object.assign(graze,{phase:'riding',x:2.2,y:19.5,z:.38,speed:15,vy:15});
M.step(graze,{steer:0},stone);
assert.equal(graze.phase,'riding','Fast tangential contact should slide past a rock');
assert.ok(graze.vy>12&&Math.abs(graze.x-2.2)<.1,'A graze must preserve motion without a circular sideways shove');
const headOn=M.create(stone);Object.assign(headOn,{phase:'riding',y:17.75,z:.38,speed:15,vy:15});
for(let i=0;i<30&&headOn.phase==='riding';i++)M.step(headOn,{steer:0},stone);
assert.equal(headOn.crashInfo.code,'rock-strike');
for(const seed of [0,91]){
  const track=T.makeTrack(seed,1),run=journey(track),r=M.create(track);
  Object.assign(r,{phase:'riding',x:0,y:15,speed:0});
  for(let i=0;i<110;i++){r.time+=M.dt;run.update(r,M.dt);}
  assert.equal(run.state.checkpoint.shelfY,15);
  r.x=55;r.y=180;r.time=25;r.saves=2;r.cleanLandings=3;r.phase='crashed';run.fall(r);
  const resumed=run.resume(M);
  assert.equal(resumed.y,15);assert.equal(resumed.time,25);assert.equal(run.state.falls,1);
  assert.equal(resumed.saves,2);assert.equal(resumed.cleanLandings,3);assert.equal(resumed.vy,0);
  assert.equal(resumed.phase,'riding');assert.equal(resumed.recovery,0);
  const fresh=journey(track);assert.equal(fresh.resume(M),null);assert.equal(fresh.state.falls,0);
}
assert.ok(T.region(50).alpine>.95&&T.region(300).forest>.95&&T.region(540).valley>.95);
console.log('Moderate landings recover; severe impacts bail. Countersteering helps. Grazes preserve tangent velocity. Rest points retain run stats and reset motion.');
