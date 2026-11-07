const assert=require('node:assert/strict');
const G=require('../src/grapple-input.js'),P=require('../src/physics.js'),S=require('../src/shot.js');
const a={id:'a',x:0,y:0,z:400},b={id:'b',x:400,y:0,z:400};
function state(){return {tether:{anchor:a,length:200},keys:new Set(),drawing:false,mouseReel:false};}
let s=state();assert.equal(G.press(s,a,true),'reel');assert.ok(G.reel(s));assert.equal(s.drawing,false);
G.press(s,null,false);assert.ok(!G.reel(s));s.keys.add('KeyE');assert.ok(G.reel(s));s.keys.add('KeyQ');assert.ok(!G.reel(s));
s=state();const old=s.tether;assert.equal(G.press(s,b,false),'blocked');assert.equal(s.tether,old);assert.ok(!G.reel(s),'A blocked ring is never mistaken for a reel click');assert.equal(G.press(s,b,true),'transfer');assert.equal(s.tether,old,'Aiming never releases the current anchor');assert.equal(s.drawTarget,b);
assert.deepEqual(G.fire(s,false),{fired:false,cancelled:true});assert.equal(s.tether,old,'Blocked transfer keeps the safety attachment');
G.press(s,b,true);assert.deepEqual(G.fire(s,true),{fired:true,from:'a'});assert.equal(s.tether,null);assert.ok(!s.mouseReel&&!s.drawing);
s=state();G.press(s,a,true);G.clear(s);assert.ok(!G.reel(s));assert.equal(s.tether.anchor,a,'Pause cancels mouse intent while retaining tether');
// The original anchor must not recatch the freshly fired transfer arrow.
const shot=S.create({x:-20,y:0,z:400},b,b,0);shot.ignoreAnchorId='a';shot.speed=1800;
let hit;for(let i=0;i<60&&!hit;i++)hit=S.step(shot,P.STEP,{x:-20,y:0,z:400},[],[a,b]);
assert.equal(hit.type,'anchor');assert.equal(hit.anchor,b);
console.log('PASS mouse toggle, E/Q priority, attached draw, blocked transfer cancellation, pause cleanup and old-ring exclusion.');

// Real shared solver + swept arrow across a 1,600-unit floorless relay. Only
// the start/end platforms exist; no teleporting, artificial impulses or dual ropes.
const anchors=Array.from({length:5},(_,i)=>({id:'relay-'+i,x:100+i*400,y:0,z:650}));
const floors=[{x:-150,y:-150,z:-30,w:350,h:300,d:30},{x:1550,y:-150,z:-30,w:400,h:300,d:30}];
let p={x:0,y:0,z:180,vx:220,vy:0,vz:0,grounded:false};
s={...state(),tether:{anchor:anchors[0],length:P.distance(P.reelPoint(p),anchors[0]),motor:0},arrow:null};
let index=0,transfers=0,minZ=p.z,maxSpeed=0,frames=0,groundTouches=0;
for(;frames<6000;frames++){
  const next=anchors[index+1];
  if(next&&s.tether&&p.z>310&&p.x>anchors[index].x-70&&P.distance(P.reelPoint(p),next)<580){
    G.press(s,next,true);
    // A short draw still runs normal physics on the original tether.
    for(let j=0;j<12;j++)P.step(p,{x:1,y:0,reel:false},floors,s.tether);
    const before={vx:p.vx,vy:p.vy,vz:p.vz},change=G.fire(s,true);
    assert.deepEqual({vx:p.vx,vy:p.vy,vz:p.vz},before,'Release never zeros or boosts momentum');
    s.arrow=S.create(P.reelPoint(p),next,next,0);s.arrow.speed=1800;s.arrow.ignoreAnchorId=change.from;
  }
  if(s.arrow){const event=S.step(s.arrow,P.STEP,P.reelPoint(p),floors,anchors);
    if(event?.type==='anchor'){index++;assert.equal(event.anchor,anchors[index]);transfers++;
      s.tether={anchor:event.anchor,length:P.distance(P.reelPoint(p),event.anchor),motor:0};s.arrow=null;
    }else if(event)assert.fail('Relay shot failed: '+event.type);
  }
  const result=P.step(p,{x:1,y:0,reel:!!s.tether&&p.z<430},floors,s.tether);
  assert.equal(result.invalid,false);assert.equal(result.reason,null);
  minZ=Math.min(minZ,p.z);maxSpeed=Math.max(maxSpeed,Math.hypot(p.vx,p.vy,p.vz));if(p.grounded)groundTouches++;
  if(transfers===4&&p.x>1600&&p.z>200)break;
}
assert.equal(transfers,4,JSON.stringify({p,frames,index}));assert.equal(groundTouches,0);assert.ok(minZ>80);assert.ok(maxSpeed<900);
console.log(`PASS four consecutive airborne transfers over 1,600 units, no floor contact; minimum height ${minZ.toFixed(1)}, max speed ${maxSpeed.toFixed(1)}.`);
