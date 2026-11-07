/* Z-up, X/Y ground plane. Pure, fixed-step solver shared by GDevelop and tests.
 * The player's collision proxy is a small upright AABB, NOT 2D engine physics.
 * Tether is a unilateral distance constraint: slack never exerts a force.
 */
(function (root) {
  'use strict';
  const R = 16, H = 86, STEP = 1 / 120;
  const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
  const distance = (a, b) => Math.hypot(a.x-b.x, a.y-b.y, a.z-b.z);
  function overlaps(p, b) {
    return p.x+R>b.x && p.x-R<b.x+b.w && p.y+R>b.y && p.y-R<b.y+b.h && p.z+H>b.z && p.z<b.z+b.d;
  }
  function moveAxis(p, axis, amount, boxes, maxStepZ=-Infinity) {
    if (!amount) return;
    p[axis] += amount;
    for (const b of boxes) {
      if (!overlaps(p,b)) continue;
      // Walk over a low riser only when the full body proxy clears the space
      // above it. Tether corrections never step the player up automatically.
      const top=b.z+b.d,oldZ=p.z;
      if(axis!=='z'&&top>oldZ&&top<=maxStepZ){
        p.z=top;
        if(!boxes.some(other=>overlaps(p,other))){p.grounded=true;continue;}
        p.z=oldZ;
      }
      const lo = b[axis], size = axis==='x'?b.w:axis==='y'?b.h:b.d;
      p[axis] = amount>0 ? lo-(axis==='z'?H:R) : lo+size+(axis==='z'?0:R);
      if (axis==='z' && amount<0) { p.grounded=true; p.impact=Math.max(p.impact,-p.vz); }
      p['v'+axis]=0;
    }
  }
  function move(p, dx,dy,dz,boxes,stepHeight=0) {
    const maxStepZ=stepHeight?p.z+stepHeight:-Infinity;
    moveAxis(p,'x',dx,boxes,maxStepZ); moveAxis(p,'y',dy,boxes,maxStepZ); moveAxis(p,'z',dz,boxes);
  }
  function reelPoint(p) { return {x:p.x,y:p.y,z:p.z+32}; }
  function outside(p,b){return !!b&&(p.x<b.minX||p.x>b.maxX||p.y<b.minY||p.y>b.maxY||p.z<b.minZ||p.z>b.maxZ);}
  // A basin is a finite volume, not a lethal vertical column through lower rooms.
  function inWater(p,b){return p.z<b.z+b.d&&p.z>b.z-30&&p.x>b.x&&p.x<b.x+b.w&&p.y>b.y&&p.y<b.y+b.h;}
  function segmentHit(a,b,box,padding=0) {
    let enter=0,leave=1;
    for(const [axis,size] of [['x','w'],['y','h'],['z','d']]) {
      const delta=b[axis]-a[axis],low=box[axis]-padding,high=box[axis]+box[size]+padding;
      if(Math.abs(delta)<1e-9) { if(a[axis]<low||a[axis]>high)return null; continue; }
      let t0=(low-a[axis])/delta,t1=(high-a[axis])/delta;
      if(t0>t1)[t0,t1]=[t1,t0]; enter=Math.max(enter,t0);leave=Math.min(leave,t1);
      if(enter>leave)return null;
    }
    return enter;
  }
  function blocked(a,b,boxes) { return boxes.some(box=>{ const t=segmentHit(a,b,box);return t!==null&&t>0.005&&t<0.995; }); }
  function constrain(p,tether,boxes,dt) {
    const a=tether.anchor;
    for(let i=0;i<4;i++) {
      const r=reelPoint(p),dx=r.x-a.x,dy=r.y-a.y,dz=r.z-a.z,d=Math.hypot(dx,dy,dz);
      if(d<=tether.length||d<1e-8)break;
      const correction=Math.min(d-tether.length,36);
      move(p,-dx/d*correction,-dy/d*correction,-dz/d*correction,boxes);
    }
    const r=reelPoint(p),d=distance(r,a);
    tether.taut=d>=tether.length-1;
    if(tether.taut&&d>0) {
      const nx=(r.x-a.x)/d,ny=(r.y-a.y)/d,nz=(r.z-a.z)/d;
      const outward=(p.vx-(a.vx||0))*nx+(p.vy-(a.vy||0))*ny+(p.vz-(a.vz||0))*nz;
      const limit=tether.lengthRate||0,removed=Math.max(0,outward-limit);
      if(removed>0){p.vx-=nx*removed;p.vy-=ny*removed;p.vz-=nz*removed;}
      tether.load=clamp(removed/(dt*1800),0,1);
    }
    else tether.load=0;
    // A reel correction can lift the feet after floor collision resolved gravity.
    if(p.grounded&&!boxes.some(b=>p.x+R>b.x&&p.x-R<b.x+b.w&&p.y+R>b.y&&p.y-R<b.y+b.h&&Math.abs(p.z-b.z-b.d)<1))p.grounded=false;
    // A constraint blocked by terrain releases visibly instead of accumulating energy.
    if(d>tether.length+48||blocked(r,a,boxes))return 'obstructed';
    return null;
  }
  function step(p,input,boxes,tether,dt=STEP) {
    p.impact=0;
    const wasGrounded=p.grounded;
    p.coyote=wasGrounded?0.1:Math.max(0,(p.coyote||0)-dt);
    p.jumpBuffer=input.jump?0.12:Math.max(0,(p.jumpBuffer||0)-dt);
    if(p.jumpBuffer>0&&p.coyote>0){p.vz=340;p.grounded=false;p.coyote=0;p.jumpBuffer=0;}
    const n=Math.hypot(input.x,input.y),mx=n?input.x/Math.max(1,n):0,my=n?input.y/Math.max(1,n):0;
    if(wasGrounded){
      const blend=1-Math.exp(-(n?18:22)*dt);
      p.vx+=(mx*220-p.vx)*blend;p.vy+=(my*220-p.vy)*blend;
    }else{
      p.vx+=mx*300*dt;p.vy+=my*300*dt;
      const speed=Math.hypot(p.vx,p.vy);
      if(speed>520){p.vx*=520/speed;p.vy*=520/speed;}
    }
    p.vz=clamp(p.vz-980*dt,-800,700);
    p.grounded=false;
    move(p,p.vx*dt,p.vy*dt,p.vz*dt,boxes,wasGrounded&&p.vz<=0?24:0);
    let reason=null;
    if(tether){
      const requested=(input.payout?165:0)-(input.reel?135:0),old=tether.length;
      tether.motor=(tether.motor||0)+clamp(requested-(tether.motor||0),-650*dt,650*dt);
      tether.length=clamp(old+tether.motor*dt,90,620);
      tether.lengthRate=(tether.length-old)/dt;
      reason=constrain(p,tether,boxes,dt);
    }
    const invalid=!Number.isFinite(p.x+p.y+p.z+p.vx+p.vy+p.vz)||Math.abs(p.x)>5000||Math.abs(p.y)>5000||p.z<-240;
    return {invalid,reason,landed:!wasGrounded&&p.grounded,impact:p.impact};
  }
  const api={R,H,STEP,clamp,distance,move,step,constrain,reelPoint,segmentHit,blocked,outside,overlaps,inWater};
  if(typeof module!=='undefined'&&module.exports)module.exports=api;
  else root.CourtyardPhysics=api;
})(typeof globalThis!=='undefined'?globalThis:this);

