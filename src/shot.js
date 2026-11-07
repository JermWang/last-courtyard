/* Swept 3D grappling-arrow flight. Deliberately straight, forgiving shots; no
 * per-link rigid bodies. A shot owns exactly one outbound/returning projectile. */
(function(root){
  const P=typeof module!=='undefined'&&module.exports?require('./physics.js'):root.CourtyardPhysics;
  const RANGE=620;
  function create(from,to,target,charge=0){
    const d=Math.max(0.001,P.distance(from,to));
    return {pos:{...from},dir:{x:(to.x-from.x)/d,y:(to.y-from.y)/d,z:(to.z-from.z)/d},speed:1000+650*P.clamp(charge,0,1),travel:0,phase:'out',target,hold:0};
  }
  function sphere(a,b,c,r){
    const dx=b.x-a.x,dy=b.y-a.y,dz=b.z-a.z,ox=a.x-c.x,oy=a.y-c.y,oz=a.z-c.z;
    const aa=dx*dx+dy*dy+dz*dz,bb=2*(ox*dx+oy*dy+oz*dz),cc=ox*ox+oy*oy+oz*oz-r*r;
    if(cc<=0)return 0;if(aa<1e-9)return null;
    const disc=bb*bb-4*aa*cc;if(disc<0)return null;
    const t=(-bb-Math.sqrt(disc))/(2*aa);return t>=0&&t<=1?t:null;
  }
  function retract(s){s.phase='return';s.hold=0;}
  function step(s,dt,reel,boxes,anchors){
    if(!(dt>0)||dt>0.15)return null;
    if(s.phase==='return'){
      const d=P.distance(s.pos,reel),travel=1350*dt;
      if(d<=travel+8)return {type:'returned'};
      for(const k of ['x','y','z'])s.pos[k]+=(reel[k]-s.pos[k])/d*travel;
      return null;
    }
    if(s.phase==='impact'){s.hold-=dt;if(s.hold<=0)retract(s);return null;}
    const travel=Math.min(s.speed*dt,RANGE-s.travel),to={};
    for(const k of ['x','y','z'])to[k]=s.pos[k]+s.dir[k]*travel;
    let t=1,hit=null;
    for(const b of boxes){const h=P.segmentHit(s.pos,to,b,1.5);if(h!==null&&h<=t){t=h;hit={type:'wall'};}}
    for(const a of anchors){const h=sphere(s.pos,to,a,16);if(h!==null&&h<t){t=h;hit={type:'anchor',anchor:a};}}
    for(const k of ['x','y','z'])s.pos[k]+=(to[k]-s.pos[k])*t;
    s.travel+=travel*t;
    if(hit){s.phase='impact';s.hold=0.065;return hit;}
    if(s.travel>=RANGE-0.001||P.distance(s.pos,reel)>RANGE+30){retract(s);return {type:'miss'};}
    return null;
  }
  const api={RANGE,create,step,retract,sphere};root.CourtyardShot=api;
  if(typeof module!=='undefined'&&module.exports)module.exports=api;
})(globalThis);
