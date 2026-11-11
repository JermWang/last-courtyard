const assert=require('node:assert/strict'),M=require('../src/bike.js'),S=require('../src/solids.js'),base=require('../src/track.js');
const T={...base,seed:0,rocks:[[0,10,4]],obstaclesAt:undefined,sample:()=>({z:0,kind:'dirt',gap:false,jump:null}),reachedValley:()=>false};
const rock=S.get(T).rocks[0];
assert.equal(S.faces.length,12);
for(const p of rock.points)for(const f of rock.planes)assert.ok(f.n.reduce((a,v,i)=>a+v*p[i],0)<=f.d+1e-8);
function falling(x,vz,extra=.28){
  const r=M.create(T),p=S.top(rock,x,10);
  Object.assign(r,{x,y:10,z:p.z+M.clearance+extra,vx:0,vy:4,vz,speed:4,phase:'riding',grounded:false,airTime:.2,
    pitch:Math.atan(-p.normal[1]/p.normal[2]),lean:-Math.atan(-p.normal[0]/p.normal[2])});
  return r;
}
for(const x of [-1,0,1])for(const vz of [-2,-5,-8]){
  const r=falling(x,vz);let landed=false,last={...r},peakStep=0;
  for(let i=0;i<100&&r.phase==='riding';i++){
    M.step(r,{steer:0},T);peakStep=Math.max(peakStep,Math.hypot(r.x-last.x,r.y-last.y,r.z-last.z));last={...r};
    if(r.grounded&&r.supportId===0){landed=true;break;}
  }
  assert.ok(landed&&r.phase==='riding',`Face landing x=${x} vz=${vz}: ${r.reason}`);
  assert.ok(peakStep<.25,'Landing must not teleport the rider');
  assert.ok(r.z>2,'Rock top must support the wheels above the underlying ground');
  if(x===0&&vz===-5){
    let left=false;
    for(let i=0;i<600&&r.phase==='riding';i++){
      const before={...r};M.step(r,{steer:0,pedal:true},T);
      assert.ok(Math.hypot(r.x-before.x,r.y-before.y)<.3,'Rock edge must not shove the rider');
      if(!r.grounded&&r.y>11)left=true;
    }
    assert.ok(left,'Riding off the rock should become an ordinary flight');
    assert.equal(r.phase,'riding',r.reason);assert.ok(r.y>15&&r.grounded,'Ride away after returning to terrain');
  }
}
const hard=falling(0,-20);
for(let i=0;i<60&&hard.phase==='riding';i++)M.step(hard,{steer:0},T);
assert.equal(hard.phase,'crashed','Severe rock impact still bails');
const ended={x:hard.x,y:hard.y,z:hard.z};for(let i=0;i<600;i++)M.step(hard,{steer:0},T);
assert.deepEqual({x:hard.x,y:hard.y,z:hard.z},ended,'A crash must never silently restart or relocate the rider');
const nose=falling(0,-9,.02);nose.pitch=-1.2;
for(let i=0;i<60&&nose.phase==='riding';i++)M.step(nose,{steer:0,airPitch:-1},T);
assert.equal(nose.phase,'crashed','Bad alignment on a rock must matter even when a matched landing is survivable');
assert.equal(S.sample(T,0,10,0).solid,undefined,'A rider underneath a tall face cannot snap onto its top');
const wall=M.create(T);Object.assign(wall,{x:0,y:5,z:.38,phase:'riding',vy:20,speed:20});
for(let i=0;i<90&&wall.phase==='riding';i++){const y=wall.y;M.step(wall,{steer:0},T);assert.ok(wall.y>=y-.001&&wall.y-y<.20);}
assert.equal(wall.crashInfo?.code,'rock-strike');assert.ok(wall.z<1,'Front-face impact must not lift the rider onto the rock');
// A sloped real-world outcrop exposed an edge-pinning bug that a flat test
// floor could not reproduce. Preserve tangential progress through contact.
const mountain=require('../src/landscape.js'),outcrop=S.get(mountain).rocks.find(s=>s.r>3&&s.y>50&&s.y<180);
const face=S.top(outcrop,outcrop.x,outcrop.y),edge=M.create(mountain,outcrop.y);
Object.assign(edge,{x:outcrop.x,y:outcrop.y,z:face.z+.78,yaw:0,vx:0,vy:1,vz:-4,speed:1,phase:'riding',grounded:false,airTime:.2,
  pitch:Math.atan(-face.normal[1]/face.normal[2]),lean:Math.atan(face.normal[0]/face.normal[2])});
let supported=false,left=false,returned=false;
for(let i=0;i<960&&edge.phase==='riding';i++){
  M.step(edge,{steer:0,pedal:supported&&!left,airPitch:0},mountain);
  if(edge.supportId===outcrop.index&&edge.grounded)supported=true;
  if(supported&&!edge.grounded)left=true;
  if(left&&edge.grounded&&edge.supportId!==outcrop.index){returned=true;break;}
}
assert.ok(supported&&left&&returned&&edge.phase==='riding','The real summit outcrop must release the bike onto the hillside');
console.log('Shared convex faces, nine angle/impact landings, ride-off, severe impact, swept front-face collision and no relocation passed.');
