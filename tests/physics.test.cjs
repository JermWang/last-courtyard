const assert=require('node:assert/strict');
const P=require('../src/physics.js');
const floor={x:-1000,y:-1000,z:-100,w:2000,h:2000,d:100};
const player=()=>({x:0,y:0,z:0,vx:0,vy:0,vz:0,grounded:true,impact:0});
const idle={x:0,y:0};
let p=player();for(let i=0;i<1200;i++)P.step(p,idle,[floor],null);
assert.equal(p.z,0);assert.equal(p.grounded,true);
p=player();const wall={x:60,y:-100,z:0,w:20,h:200,d:200};for(let i=0;i<240;i++)P.step(p,{x:1,y:0},[floor,wall],null);assert.ok(p.x<=44.0001);
p={...player(),x:50,z:100,vx:0,vy:80};let tether={anchor:{x:0,y:0,z:132},length:100};P.constrain(p,tether,[],P.STEP);assert.equal(p.x,50);assert.equal(p.vy,80); // Slack does not push.
p={...player(),x:110,z:100,vx:100,vy:80};tether={anchor:{x:0,y:0,z:132},length:100};P.constrain(p,tether,[],P.STEP);assert.ok(Math.abs(p.x-100)<1e-8);assert.equal(p.vx,0);assert.equal(p.vy,80);
p={...player(),x:180,z:200,grounded:false,vy:200};tether={anchor:{x:0,y:0,z:400},length:300};for(let i=0;i<2400;i++){const result=P.step(p,{x:0.2,y:0.1,reel:true},[],tether);assert.equal(result.invalid,false);assert.ok(P.distance(P.reelPoint(p),tether.anchor)<=tether.length+0.01);}assert.equal(tether.length,90);
for(let i=0;i<1000;i++)P.step(p,{...idle,payout:true},[],tether);assert.equal(tether.length,620);
assert.equal(P.blocked({x:0,y:0,z:50},{x:100,y:0,z:50},[wall]),true);
assert.equal(P.blocked({x:0,y:0,z:250},{x:100,y:0,z:250},[wall]),false);
// Release keeps momentum: solver only applies gravity/air input, no reset.
p={...player(),z:200,grounded:false,vx:150,vy:70,vz:80};P.step(p,idle,[],null);assert.equal(p.vx,150);assert.equal(p.vy,70);
console.log('PASS: grounding, wall collision, slack/taut constraints, tangential velocity, reeling limits, long-run stability, obstruction and release momentum.');
const L=require('../src/level.json');p={...player(),x:505,y:960};
tether={anchor:L.anchors[1],length:P.distance(P.reelPoint(p),L.anchors[1])};let completed=false;
for(let i=0;i<600;i++){
  const result=P.step(p,{x:0,y:-1,reel:i<240,jump:i===0},L.boxes.filter(b=>b.solid),tether);
  assert.equal(result.invalid,false);
  if(result.reason||i===240)tether=null;
  if(p.y<620&&p.grounded&&p.z>=98){completed=true;break;}
}
assert.ok(completed,'The intended swing/reel/release route must reach the checkpoint terrace');
console.log('PASS: first crossing is reachable with jump, reel and momentum-preserving release.');
p={...player(),...L.spawn};tether={anchor:L.anchors[0],length:P.distance(P.reelPoint(p),L.anchors[0])};
for(let i=0;i<84;i++){
  const result=P.step(p,{x:0,y:0,reel:true},L.boxes.filter(b=>b.solid),tether);
  assert.ok(!result.reason,'Practice ring must not snag its own supporting post while reeling from arrival');
}
assert.ok(tether.length<260,'Practice reeling should shorten the tether');
console.log('PASS: practice anchor clears its supporting post during initial reel.');
// Motor starts progressively; lifting clears grounded state; radial motor speed
// is bounded while tangential momentum remains available on release.
p={...player(),z:100,grounded:false};tether={anchor:{x:0,y:0,z:400},length:268};
P.step(p,{...idle,reel:true},[],tether);assert.ok(tether.motor> -135&&tether.motor<0);
for(let i=0;i<200;i++)P.step(p,{...idle,reel:true},[],tether);
assert.ok(Math.hypot(p.vx,p.vy,p.vz)<1000);assert.equal(p.grounded,false);
p={...player(),z:2,grounded:false,coyote:0.08};P.step(p,{...idle,jump:true},[],null);assert.ok(p.vz>300,'coyote jump works');
p={...player(),z:1,grounded:false,vz:-80};P.step(p,{...idle,jump:true},[floor],null);P.step(p,idle,[floor],null);P.step(p,idle,[floor],null);assert.ok(p.vz>300,'buffered jump fires on landing');
console.log('PASS: ramped reel motor, airborne grounding, bounded motor velocity, coyote time and jump buffering.');
p={...player(),x:100,z:100,vx:140,vy:75,grounded:false};tether={anchor:{x:0,y:0,z:132},length:100,lengthRate:90};P.constrain(p,tether,[],P.STEP);assert.equal(p.vx,90);assert.equal(p.vy,75);
console.log('PASS: paying out allows controlled outward motion without losing tangent velocity.');
const stepBox={x:60,y:-50,z:0,w:150,h:100,d:22};
p=player();for(let i=0;i<90;i++)P.step(p,{x:1,y:0},[floor,stepBox],null);
assert.ok(p.x>80&&p.z===22,'low risers are walkable without jumping');
p=player();for(let i=0;i<90;i++)P.step(p,{x:1,y:0},[floor,{...stepBox,d:26}],null);
assert.ok(p.x<=44&&p.z===0,'tall walls must not become stairs');
const lowCeiling={x:40,y:-50,z:100,w:180,h:100,d:20};
p=player();for(let i=0;i<90;i++)P.step(p,{x:1,y:0},[floor,stepBox,lowCeiling],null);
assert.ok(p.x<=44&&p.z===0,'step-up must check head clearance');
console.log('PASS: low-step ascent, tall-riser blocking and full head clearance.');
