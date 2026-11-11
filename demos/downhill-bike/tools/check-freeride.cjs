const assert=require('node:assert/strict'),T=require('../src/landscape.js');
const M=require('../src/bike.js');
assert.ok(T.summitDrop>1350&&T.summitDrop<1500,'The extended course must have a substantial continuous descent');
let checked=0,downhill=0,uphill=0;
for(const u of [-300,-180,0,180,300])for(let y=680;y<2480;y+=20){
  const a=T.sample(T.spine(y-10)+u,y-10),b=T.sample(T.spine(y+10)+u,y+10);
  if(a.shelf>.2||b.shelf>.2||a.jump||b.jump)continue;
  const grade=(b.z-a.z)/Math.hypot(20,T.spine(y+10)-T.spine(y-10));
  checked++;downhill+=grade<-.2;uphill+=grade>0;
}
assert.ok(downhill/checked>.95&&uphill===0,'Long traverses should descend rather than becoming flat or climbing');
assert.ok(T.surfaces.stone.grip>T.surfaces.gravel.grip,'Firm bedrock must not behave like loose scree');
assert.equal(T.slabs.length,7);
assert.equal(T.ridges.length,8);assert.equal(T.bowls.length,4);
// Spines must be substantial actual ground relief, with room on either side.
for(const [x,y,width] of T.ridges){
  const z=u=>T.sample(T.spine(y)+T.mirrored*u,y).z;
  assert.ok(z(x)-(z(x-width)+z(x+width))/2>35,'A mountain spur should read as a real ridge');
}
console.log('Freeride grading:',T.summitDrop+' m drop;',downhill+'/'+checked+' sampled segments below -20% grade; no uphill segments.');
// This summit catch borders the regraded extension: check the entire runout.
const j=T.jumps.find(j=>j.name==='Quarry Drop');
for(const speed of [j.min,(j.min+j.max)/2,j.max]){
  const y=j.lip-10,r=M.create(T,y),v=speed/3.6,yaw=Math.atan2(j.center(y+.5)-j.center(y-.5),1);
  Object.assign(r,{phase:'riding',x:j.center(y),yaw,z:T.sample(j.center(y),y).z+M.clearance,
    speed:v,vx:Math.sin(yaw)*v,vy:Math.cos(yaw)*v});
  let flew=false,landed=false;
  for(let i=0;i<120*15&&r.phase==='riding'&&r.y<j.end;i++){
    const aim=Math.atan2(j.center(r.y+5)-r.x,5);
    M.step(r,{steer:T.clamp((aim-r.yaw)*3,-1,1),pedal:false,brake:false,airPitch:0},T);
    if(!r.grounded&&r.y>j.lip)flew=true;
    if(flew&&r.grounded&&r.y>=j.land)landed=true;
  }
  assert.ok(landed&&r.phase==='riding'&&r.y>=j.end,'Quarry catch and runout at '+speed+' km/h: '+r.reason);
}
console.log('Regraded Quarry catch and full runout passed at 46, 54 and 62 km/h.');
