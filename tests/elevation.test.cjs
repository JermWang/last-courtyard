const assert=require('node:assert/strict');
const E=require('../src/elevation.js'),P=require('../src/physics.js'),L=require('../src/level.json');
let s=E.create(),p={x:1460,y:-20,z:220,vx:0,vy:0,vz:0,grounded:true};
let a=E.weight(s),t={anchor:a,length:P.distance(P.reelPoint(p),a)+60};
for(let i=0;i<600;i++)E.step(s,p,t,{reel:true},false,P.STEP);
assert.equal(s.drop,0,'Unrestored water cannot power the bridge');
for(let i=0;i<30;i++)E.step(s,p,t,{reel:true},true,P.STEP);
assert.equal(s.drop,0,'Payout slack is recovered before weight movement');
for(let i=0;i<900;i++){E.step(s,p,t,{reel:true},true,P.STEP);Object.assign(a,E.weight(s));}
assert.equal(s.locked,true);assert.equal(E.bridgeTop(s),220);
const snapshot=s.drop;for(let i=0;i<600;i++)E.step(s,p,null,{},true,P.STEP);
assert.equal(s.drop,snapshot,'Bridge remains latched without tether');
assert.ok(Math.abs(E.carriage(s).vx)<=91);
s.tower=true;assert.equal(E.checkpoint(s).z,400);s.canopy=true;assert.equal(E.checkpoint(s).z,460);
console.log('PASS water dependency, slack, bounded counterweight, persistent bridge, tiered checkpoints.');
const boxes=L.boxes.filter(b=>b.solid).map(b=>({...b}));boxes.find(b=>b.name==='CounterBridge').z=196;
function walk(p,x,y,n){for(let i=0;i<n;i++){const r=P.step(p,{x,y},boxes,null);assert.equal(r.invalid,false);}return p;}
p={x:1360,y:-80,z:220,vx:0,vy:0,vz:0,grounded:true};walk(p,0,-1,242);assert.ok(p.y<-500&&p.z===220);
walk(p,1,0,80);walk(p,0,-1,160);assert.equal(p.z,220,'Walking alone cannot reach the tower');
p={x:1500,y:-540,z:220,vx:0,vy:0,vz:0,grounded:true};
a=L.anchors.find(a=>a.id==='ascent');t={anchor:a,length:P.distance(P.reelPoint(p),a)};
let ascentReleased=false,ascentLanded=false;
for(let i=0;i<1000;i++){
 if(p.z>520&&!ascentReleased){t=null;ascentReleased=true;}
 const r=P.step(p,{x:0,y:-1,reel:!ascentReleased},boxes,t);
 assert.equal(r.reason,null,'Tower ring must clear the solid ledge');assert.equal(r.invalid,false);
 if(ascentReleased&&p.grounded){ascentLanded=p.z===400;break;}
}
assert.ok(ascentLanded,JSON.stringify(p));
console.log('PASS bridge crossing and swing-only tower ascent using actual collision geometry.');
// Ride the real moving attachment using the shared unilateral solver; release
// above the west landing. This also checks relative radial velocity stability.
s=E.create();s.locked=true;p={x:1320,y:-820,z:400,vx:0,vy:0,vz:0,grounded:true};
a=E.carriage(s);t={anchor:a,length:P.distance(P.reelPoint(p),a)};
let released=false,maxSpeed=0,landed=false;
for(let i=0;i<1800;i++){
 E.step(s,p,t,{},true,P.STEP);Object.assign(a,E.carriage(s));
 if(!released&&p.x<970&&p.z>480){released=true;t=null;}
 const r=P.step(p,{x:released?0:-0.1,y:0,reel:!released},boxes,t);
 assert.equal(r.invalid,false,JSON.stringify(p));assert.equal(r.reason,null,'Moving tether must not cross solid rail');
 maxSpeed=Math.max(maxSpeed,Math.hypot(p.vx,p.vy,p.vz));
 if(released&&p.grounded&&p.x<1000&&p.z===460){landed=true;break;}
}
assert.ok(landed,JSON.stringify(p));assert.ok(maxSpeed<900);
walk(p,0,0,80);p={x:790,y:-750,z:460,vx:0,vy:0,vz:0,grounded:true};walk(p,0,1,660);assert.ok(p.y>400&&p.z===460,JSON.stringify(p));
console.log('PASS moving-anchor ride, momentum release, canopy landing and overlapping upper walkway.');
// Wind gate has a wide open phase, a real body-volume contact phase, and a
// reachable overhead bypass. Recovery is close and deterministic.
s.wind=true;assert.deepEqual(E.checkpoint(s),{x:790,y:-350,z:460});
const body={x:790,y:-143,z:460};
assert.ok(P.overlaps(body,E.obstacle({time:0})));
assert.ok(!P.overlaps(body,E.obstacle({time:Math.PI/1.4})));
assert.ok(!P.overlaps({...body,z:560},E.obstacle({time:0})));
assert.ok(!P.outside({x:790,y:-143,z:800},L.bounds));
for(const point of [{x:1901,y:0,z:100},{x:0,y:-1351,z:100},{x:400,y:800,z:1121}])assert.ok(P.outside(point,L.bounds));
p={x:790,y:-350,z:460,vx:0,vy:0,vz:0,grounded:true};a=L.anchors.find(a=>a.id==='wind');t={anchor:a,length:P.distance(P.reelPoint(p),a)};
let bypass=false;for(let i=0;i<600;i++){const r=P.step(p,{x:0,y:0,reel:true},boxes,t);assert.equal(r.reason,null);if(p.z>570){bypass=true;break;}}
assert.ok(bypass,'The wind ring lifts above the paddle');
console.log('PASS wind gate contact/opening, high bypass, nearby checkpoint and bounded recovery envelope.');
const cistern=L.boxes.find(b=>b.name==='WaterSkyCistern');
assert.ok(!P.inWater({x:640,y:420,z:100},cistern),'Ground floor below an elevated basin must remain safe');
assert.ok(P.inWater({x:640,y:420,z:510},cistern),'Feet entering the actual water volume trigger recovery');
console.log('PASS elevated water volumes preserve routes underneath.');

