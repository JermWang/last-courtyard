const assert=require('node:assert/strict');
const S=require('../src/shot.js'),J=require('../src/journey.js');
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
walk(p,0,0,80);
p={x:790,y:-750,z:460,vx:0,vy:0,vz:0,grounded:true};
walk(p,0,1,115);assert.ok(p.y>-590&&p.y<-460&&p.z===400,JSON.stringify(p));
s.relay=true;assert.deepEqual(E.checkpoint(s),{x:790,y:-550,z:400});
console.log('PASS moving-anchor ride, canopy landing and walk down to the relay checkpoint.');

p={x:790,y:-550,z:400,vx:0,vy:0,vz:0,grounded:true};
walk(p,0,1,105);assert.ok(p.y>-460&&p.z===340,JSON.stringify(p));
walk(p,0,0,30);
walk(p,0,-1,46);walk(p,0,0,30);
walk(p,1,0,72);walk(p,0,0,24);
walk(p,0,-1,69);walk(p,0,0,24);walk(p,-1,0,68);
assert.equal(p.z,400,'Catch shelf side stairs return to the launch deck');
assert.ok(p.x<875&&p.y<-528,JSON.stringify(p));
console.log('PASS falling to the catch shelf and walking up its side stairs.');

const defs=L.anchors.filter(a=>a.relay);
function cross(offset, shift, drawFrames=14){
  let player={x:790+shift,y:-550,z:400,vx:0,vy:0,vz:0,grounded:true};
  let tether=null,arrow=null,catches=0,t=offset,released=false,minZ=900,maxSpeed=0,draw=0;
  let airborneContacts=0;
  const anchors=defs.map(a=>({...a}));
  for(let i=0;i<2400;i++,t+=P.STEP){
    Object.assign(anchors[2],E.relayAnchor(defs[2],t));
    const next=anchors[catches];
    if(next&&!arrow){
      const dir={x:next.x-player.x,y:next.y-player.y};
      const n=Math.hypot(dir.x,dir.y)||1;
      const from={x:player.x+20*dir.x/n,y:player.y+20*dir.y/n,z:player.z+54};
      if((!tether||draw>0||(player.y>tether.anchor.y-65&&player.z>=tether.anchor.z-165))&&
          P.distance(P.reelPoint(player),next)<610&&!P.blocked(from,next,boxes)){
        if(++draw>=drawFrames){
          const speed=tether?1850:1350,lead=P.distance(from,next)/speed;
          arrow=S.create(from,{...next,x:next.x+(next.vx||0)*lead},next,.7);
          arrow.speed=speed;arrow.ignoreAnchorId=tether?.anchor.id;
          tether=null;
          draw=0;
        }
      }else draw=0;
    }
    if(arrow){
      const hit=S.step(arrow,P.STEP,P.reelPoint(player),boxes,anchors);
      if(hit?.type==='anchor'){
        if(hit.anchor!==anchors[catches++])return {failure:'wrong hit',catches,player};
        tether={anchor:hit.anchor,length:P.distance(P.reelPoint(player),hit.anchor)};
        arrow=null;
      }else if(hit)return {failure:hit.type,catches,player};
    }
    if(catches===3&&!released&&player.y>330&&player.y<455&&player.z>525&&Math.abs(player.vy)<145){
      released=true;tether=null;
    }
    const y=catches===3?P.clamp((395-player.y)*.017-player.vy*.008,-1,1):catches?1:0;
    const x=P.clamp((790-player.x)*.018-player.vx*.006,-.8,.8);
    const result=P.step(player,{x,y,reel:!!tether},boxes,tether);
    maxSpeed=Math.max(maxSpeed,Math.hypot(player.vx,player.vy,player.vz));
    if(player.y>-460+P.R&&player.y<310-P.R){minZ=Math.min(minZ,player.z);if(player.grounded)airborneContacts++;}
    if(result.invalid||result.reason)return {failure:result.reason||'invalid',catches,player};
    if(released&&player.grounded&&player.z===460)return {catches,player,seconds:t-offset,minZ,maxSpeed,airborneContacts};
  }
  return {failure:'timeout',catches,player,minZ};
}

// Drive the real swept shots, draw time, moving ring and solid terrain across
// a full cycle, including off-centre approaches. No floor contacts in the gap.
for(const phase of [0,1,2,3,4,5,6,7]){
  for(const shift of [-24,0,24]){
    const run=cross(phase,shift);
    assert.equal(run.failure,undefined,JSON.stringify(run));
    assert.equal(run.catches,3);
    assert.equal(run.airborneContacts,0,JSON.stringify(run));
    assert.ok(run.minZ>=385&&run.maxSpeed<900,JSON.stringify(run));
    const player=run.player,journey=J.create(),restored={solved:true,flow:1};
    const progress={...s,locked:true,tower:true,canopy:true};
    for(let i=0;i<230;i++){
      const dx=785-player.x,dy=450-player.y;
      P.step(player,{x:P.clamp(dx*.04,-1,1),y:P.clamp(dy*.04,-1,1)},boxes,null);
      J.step(journey,restored,progress,player,P.STEP,false);
    }
    assert.equal(journey.phase,'restoring',JSON.stringify(player));
  }
}
console.log('PASS all 24 sky relay approaches, three catches over the gap, cistern landing and seal activation.');
assert.ok(!P.outside({x:790,y:-143,z:800},L.bounds));
for(const point of [{x:1901,y:0,z:100},{x:0,y:-1351,z:100},{x:400,y:800,z:1121}])assert.ok(P.outside(point,L.bounds));
const cistern=L.boxes.find(b=>b.name==='WaterSkyCistern');
assert.ok(!P.inWater({x:640,y:420,z:100},cistern),'Ground floor below an elevated basin must remain safe');
assert.ok(P.inWater({x:640,y:420,z:510},cistern),'Feet entering the actual water volume trigger recovery');
console.log('PASS elevated water volumes preserve routes underneath.');

