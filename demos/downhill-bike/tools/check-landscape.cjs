const assert=require('node:assert/strict'),T=require('../src/landscape.js'),M=require('../src/bike.js');
const itinerary=require('./expedition-line.cjs');
assert.ok(T.bounds.right-T.bounds.left>1500,'The usable mountain must actually be wider');
assert.ok(Math.abs(T.spine(1000)-T.spine(1420))>250,'The mountain should sweep sideways');
for(const [seed,stage,side,pace=11] of [[0,1,-1],[0,1,1],[0,1,-2],[0,1,2],[17,2,-1],[0,1,-2,15]]){
  const track=T.makeTrack(seed,stage),line=itinerary(track,side),r=M.create(track);r.phase='riding';
  let low=0,high=0,outer=0;
  for(let i=0;i<120*560&&r.phase==='riding';i++){
    const aim=Math.atan2(line(r.y+5)-r.x,5),target=pace;
    M.step(r,{steer:T.clamp((aim-r.yaw)*3,-1,1),pedal:(pace===11||r.y<620)&&r.speed<target-.8,brake:r.speed>target,airPitch:0},track);
    low=Math.min(low,r.x);high=Math.max(high,r.x);outer=Math.max(outer,Math.abs(r.x-track.spine(r.y)));
  }
  console.log('Landscape',{seed,stage,side,pace,phase:r.phase,x:r.x,y:r.y,time:r.time,low,high,outer,reason:r.reason});
  assert.equal(r.phase,'finished','The wide mountain must have independently rideable traverses');
  if(Math.abs(side)>1)assert.ok(outer>260,'Wide itinerary must use new collision terrain');
}
for(const j of T.extraJumps)for(const speed of [12,15,18]){
  const y=j.lip-12,r=M.create(T,y),yaw=Math.atan2(j.center(y+.5)-j.center(y-.5),1);
  Object.assign(r,{phase:'riding',x:j.center(y),yaw,z:T.sample(j.center(y),y).z+M.clearance,speed,
    vx:Math.sin(yaw)*speed,vy:Math.cos(yaw)*speed});
  let flew=false,landed=false;
  for(let i=0;i<120*12&&r.phase==='riding'&&r.y<j.runout;i++){
    const aim=Math.atan2(j.center(r.y+5)-r.x,5);
    M.step(r,{steer:T.clamp((aim-r.yaw)*3,-1,1),pedal:false,brake:false,airPitch:0},T);
    if(!r.grounded&&r.y>j.lip)flew=true;
    if(flew&&r.grounded&&r.y>=j.land)landed=true;
  }
  console.log('Curved catch',j.name,speed,r.phase,landed,r.reason);
  assert.ok(landed&&r.phase==='riding','Mapped jumps must retain a usable catch');
}
console.log('Wide traverses, winding core, mirrored seed and curved jump catches passed.');
