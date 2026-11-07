const assert=require('node:assert/strict');
const P=require('../src/physics.js'),B=require('../src/puzzle.js'),L=require('../src/level.json');
const c=L.puzzle,ground={x:1000,y:0,z:0,w:700,h:1000,d:100};
function player(y=840){return {x:c.laneX,y,z:100,vx:0,vy:0,vz:0,grounded:true};}
let s=B.create(c),p=player(),a=B.anchor(s,c),t={anchor:a,length:P.distance(P.reelPoint(p),a)};
for(let i=0;i<1200&&!s.solved;i++){
  B.step(s,c,p,t,{reel:true},P.STEP);Object.assign(a,B.anchor(s,c));
  P.step(p,{x:0,y:0},[ground,{x:c.laneX-37,y:s.y-37,z:100,w:74,h:74,d:62}],t);
  assert.ok(Number.isFinite(p.x+p.y+p.z));assert.ok(Math.abs(p.y-840)<0.1,'Pull the block, not the stationary player');
}
assert.equal(s.solved,true);assert.equal(s.y,c.endY);
for(let i=0;i<600;i++)B.step(s,c,p,null,{},P.STEP);
assert.equal(s.flow,1);assert.equal(s.plate,1);
B.reset(s,c);assert.equal(s.solved,true);assert.equal(s.y,c.endY);
console.log('PASS: weighted block docks, plate latches, water completes and recovery retains restoration.');
s=B.create(c);p=player(440);a=B.anchor(s,c);t={anchor:a,length:150};
for(let i=0;i<900;i++){B.step(s,c,p,t,{reel:true},P.STEP);Object.assign(a,B.anchor(s,c));}
assert.ok(s.y+37<=p.y-P.R-4,'Block never crushes or overlaps a player in its lane');
assert.equal(s.solved,false);B.reset(s,c);assert.equal(s.y,c.startY);assert.equal(s.speed,0);
p=player(180);for(let i=0;i<240;i++)B.step(s,c,p,t,{reel:true},P.STEP);
assert.equal(s.y,c.startY,'Wrong-side pulling does not reverse or teleport the block');
const old=JSON.stringify(s);B.step(s,c,player(),t,{reel:true},2);assert.equal(JSON.stringify(s),old);
console.log('PASS: player clearance, unsolved recovery, wrong-side pull and stalled-delta rejection.');
s=B.create(c);p=player();a=B.anchor(s,c);t={anchor:a,length:P.distance(P.reelPoint(p),a)+80};
for(let i=0;i<30;i++)B.step(s,c,p,t,{reel:true},P.STEP);
assert.equal(s.y,c.startY,'A slack chain must wind in before the block moves');
for(let i=0;i<240;i++){B.step(s,c,p,t,{reel:true},P.STEP);Object.assign(a,B.anchor(s,c));}
assert.ok(s.y>c.startY,'Pull resumes after taking up slack');
console.log('PASS: payout slack is recovered before transmitting pull to the block.');
// The expanded courtyard is real connected elevation, not decorative floor art.
const solids=L.boxes.filter(b=>b.solid&&b.name!=='SluiceBlock');
p={...player(550),x:540};
for(let i=0;i<420;i++)P.step(p,{x:1,y:0},solids,null);
assert.ok(p.x>1100&&p.z===100,'East gallery connects the old landing to the waterworks');
p={...player(240),x:1510};
for(let i=0;i<230;i++)P.step(p,{x:0,y:-1},solids,null);
assert.equal(p.z,220,'Six walkable risers reach the upper garden');
p={...player(520),x:1000};
for(let i=0;i<150;i++)P.step(p,{x:0,y:1},solids,null);
assert.equal(p.z,20,'Maintenance stair reaches the lower path');
console.log('PASS: east gallery, upper garden stairs and lower maintenance route are connected.');
