/* Guided sluice block: deterministic motion, no rigid-body joint stack.
 * Uses the shared player's collision and tether constraint. Only the block's
 * permitted lane motion is solved here; restoration latches at the plate. */
(function(root){
  const P=typeof module!=='undefined'&&module.exports?require('./physics.js'):root.CourtyardPhysics;
  function create(config){return {y:config.startY,speed:0,solved:false,flow:0,plate:0,travel:0};}
  function anchor(s,c){return {id:'sluice-block',kind:'block',label:'Sluice block · pull toward the brass plate',x:c.laneX,y:s.y+48,z:c.floorZ+42};}
  function reset(s,c){if(!s.solved){s.y=c.startY;s.speed=0;s.travel=0;}s.speed=0;}
  function step(s,c,p,tether,input,dt){
    if(!(dt>0)||dt>1/15)return {moved:0,completed:false};
    if(s.solved){s.flow=Math.min(1,s.flow+dt/4);s.plate=Math.min(1,s.plate+dt*4);s.speed=0;return {moved:0,completed:false};}
    const attached=tether?.anchor.kind==='block',reel=P.reelPoint(p),a=anchor(s,c);
    // Pull from the open end of the lane. The west/east guides never teleport
    // the block sideways; an experiment from the wrong end simply holds it.
    const slack=attached?tether.length-P.distance(reel,a):0;
    if(attached&&input.reel&&slack>1)tether.length=P.clamp(tether.length-135*dt,Math.max(90,P.distance(reel,a)),620);
    const useful=attached&&input.reel&&slack<=1&&reel.y>a.y+58;
    const desired=useful?76:0;
    s.speed+=P.clamp(desired-s.speed,-300*dt,150*dt);
    const old=s.y,next=Math.min(c.endY,s.y+s.speed*dt);
    // Stop before the player's entire collision volume, even when standing in
    // the lane. No block/player penetration or permanent pinning against a wall.
    const overlapsX=Math.abs(p.x-c.laneX)<37+P.R+4;
    const overlapsZ=p.z<c.floorZ+62&&p.z+P.H>c.floorZ;
    s.y=overlapsX&&overlapsZ?Math.max(old,Math.min(next,p.y-P.R-41)):next;
    const moved=s.y-old;s.travel+=moved;
    if(moved<0.001)s.speed=0;
    if(attached&&moved>0){
      const end=anchor(s,c);
      // Consume only the distance actually recovered by moving this weighted
      // block. The common tether solver still prevents walking beyond the line.
      tether.length=P.clamp(tether.length+P.distance(reel,end)-P.distance(reel,a),90,620);
    }
    const completed=c.endY-s.y<=12;
    if(completed){s.y=c.endY;s.solved=true;s.speed=0;}
    return {moved,completed};
  }
  const api={create,anchor,reset,step};root.CourtyardPuzzle=api;
  if(typeof module!=='undefined'&&module.exports)module.exports=api;
})(globalThis);
