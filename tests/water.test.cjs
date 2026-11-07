const assert=require('node:assert/strict');
const W=require('../src/water.js'),P=require('../src/physics.js'),L=require('../src/level.json');
const main=L.water.find(b=>b.name==='Water'),sky=L.water.find(b=>b.name==='WaterSkyCistern');
assert.equal(W.sample({x:630,y:410,z:100},L.water,0),null,'Elevated water must not affect the lower courtyard');
assert.ok(W.sample({x:630,y:410,z:498},L.water,0));
assert.equal(W.sample({x:630,y:410,z:530},L.water,0),null);
assert.equal(W.sample({x:main.x-1,y:800,z:-30},L.water,0),null);
assert.equal(W.sample({x:500,y:800,z:-150},L.water,0),null,'Basins have finite bottoms');
const hit=W.crossing({x:500,y:800,z:100},{x:500,y:800,z:-80},L.water,0);
assert.equal(hit.basin.name,'Water');assert.ok(hit.t>0&&hit.t<1);
assert.equal(W.crossing({x:500,y:800,z:-30},{x:500,y:800,z:100},L.water,0),null,'Only entering shots generate surface impact');
assert.equal(W.crossing({x:630,y:410,z:200},{x:630,y:410,z:100},L.water,0),null,'A shot below the cistern remains free');
let p={x:500,y:800,z:-25,vx:200,vy:0,vz:-400},s=W.create(),contact=W.sample(p,L.water,0);
assert.ok(contact.deep);const event=W.step(s,p,contact,0,P.STEP);assert.ok(event.splash&&event.ripple);assert.ok(p.vz>=-95&&p.vx<200);
let recovery=false;for(let i=0;i<47;i++)recovery=W.step(s,p,contact,0,P.STEP).recover;
assert.ok(recovery,'Deep basin gives a short bounded splash/recovery period');
W.step(s,p,null,0,P.STEP);assert.equal(s.deepTime,0);assert.equal(s.wet,false);
contact=W.sample({x:630,y:410,z:498},L.water,0);assert.equal(contact.deep,false);
s=W.create();for(let i=0;i<1200;i++)assert.equal(W.step(s,p,contact,1,P.STEP).recover,false,'Shallow water can be explored safely');
const saved=JSON.stringify(s);W.step(s,p,contact,100,3);assert.equal(JSON.stringify(s),saved,'Stalled time cannot trigger recovery');
// Actual rebuilt cistern has an open interior with a floor below its surface.
const solids=L.boxes.filter(b=>b.solid);p={x:640,y:420,z:540,vx:0,vy:0,vz:0,grounded:false};
for(let i=0;i<120;i++)P.step(p,{x:0,y:0},solids,null);
assert.equal(p.z,sky.bottom);assert.ok(W.sample(p,L.water,0));
assert.equal(solids.some(b=>P.overlaps(p,b)),false,'The cistern floor/walls do not embed the player');
assert.ok(!L.anchors.some(a=>a.id==='east'));assert.ok(L.anchors.every(a=>a.purpose));
for(const name of ['CanopyRail680','CanopyRail890']){const b=L.boxes.find(b=>b.name===name);assert.ok(b.x>=700&&b.x+b.w<=890,'High-walk rails sit on their supporting deck');}
console.log('PASS finite water volumes, swept arrow impact, shallow drag, bounded deep recovery, stall safety, hollow cistern, purposeful anchors and supported rails.');
