const assert=require('node:assert/strict'),base=require('../src/track.js'),M=require('../src/bike.js');
const report=process.argv.includes('--report');
for(const grade of [0,-.35,-.65,-.9]){
  const T={...base,rocks:[],obstaclesAt:()=>[],sample:(x,y)=>({z:grade*y,kind:'dirt',gap:false,jump:null}),reachedValley:()=>false};
  const r=M.create(T);Object.assign(r,{phase:'riding',speed:15,vy:15,vz:15*grade,pitch:Math.atan(grade)});
  let flew=false,landed=false,airtime=0,height=0;
  for(let i=0;i<480&&r.phase==='riding';i++){
    M.step(r,{steer:0,hop:i===0,airPitch:0},T);
    if(!r.grounded){flew=true;airtime+=M.dt;height=Math.max(height,(r.z-grade*r.y-M.clearance)/Math.hypot(1,grade));}
    if(flew&&r.grounded){landed=true;break;}
  }
  console.log('Slope hop',{grade,airtime:+airtime.toFixed(3),height:+height.toFixed(3),phase:r.phase});
  if(!report){assert.ok(landed&&r.phase==='riding');assert.ok(airtime<.85&&height<.56,'A slope must not amplify a small bunny hop');}
}
const T=require('../src/landscape.js');
for(const kind of ['dirt','grass','stone'])for(const sy of [-.8,-.4,0,.35])for(const sx of [-.35,0,.35]){
  const track={...T,rocks:[],obstaclesAt:()=>[],sample:(x,y)=>({z:sx*x+sy*y,kind,gap:false,jump:null}),reachedValley:()=>false};
  const r=M.create(track);
  Object.assign(r,{x:0,y:0,z:M.clearance+.04,vx:0,vy:14,speed:14,vz:sy*14-12*Math.hypot(1,sx,sy),
    pitch:Math.atan(sy),lean:-Math.atan(sx),phase:'riding',grounded:false,airTime:.4});
  for(let i=0;i<20&&!r.grounded&&r.phase==='riding';i++)M.step(r,{steer:0,airPitch:0},track);
  if(!report)assert.ok(r.grounded&&r.phase==='riding',`Aligned ${kind} landing on ${sx}/${sy}: ${r.reason}`);
}
const cases=[];
for(const j of T.jumps)for(const speed of [15,20]){
  const y=j.lip-10,r=M.create(T,y),yaw=Math.atan2(j.center(y+.5)-j.center(y-.5),1);
  Object.assign(r,{phase:'riding',x:j.center(y),yaw,z:T.sample(j.center(y),y).z+M.clearance,speed,
    vx:Math.sin(yaw)*speed,vy:Math.cos(yaw)*speed});
  let airtime=0,peak=0,landed=false;
  for(let i=0;i<1800&&r.phase==='riding'&&r.y<j.end;i++){
    const aim=Math.atan2(j.center(r.y+4)-r.x,4);
    M.step(r,{steer:T.clamp((aim-r.yaw)*3,-1,1),airPitch:0},T);
    if(!r.grounded&&r.y>j.lip)airtime+=M.dt;
    if(airtime&&r.grounded)landed=true;
    peak=Math.max(peak,r.airTime);
  }
  cases.push({jump:j.name,speed,airtime:+airtime.toFixed(2),peak:+peak.toFixed(2),landed,phase:r.phase,reason:r.crashInfo?.code});
  if(!report){
    assert.ok(landed&&r.phase==='riding',j.name+' should survive an aligned approach at '+speed+' m/s');
    assert.ok(peak<(j.small?.85:1.4),j.name+' should not throw the bike into a long unintended flight');
  }
}
console.table(cases);
