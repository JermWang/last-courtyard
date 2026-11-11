/* Solo rest points are earned by stopping on a broad outlook. Crew races
 * retain their one-life rules. No markers or mandatory checkpoint gates. */
function createDescentJourney(track){
  let restFor=0;
  const state={checkpoint:null,falls:0,time:0,cleanLandings:0,saves:0,restUntil:0};
  function update(rider,dt){
    if(rider.phase!=='riding')return;
    state.time=rider.time;state.saves=rider.saves;state.cleanLandings=rider.cleanLandings;
    const shelf=track.shelves.find(s=>
      Math.hypot((rider.x-track.mirrored*s.x)/s.rx,(rider.y-s.y)/s.ry)<.48&&
      s.y>(state.checkpoint?.shelfY??-Infinity));
    const safe=rider.grounded&&rider.speed<1.8&&rider.recovery<.1&&shelf&&
      !track.sample(rider.x,rider.y).gap;
    restFor=safe?restFor+dt:0;
    if(restFor<.85)return;
    state.checkpoint={x:rider.x,y:rider.y,yaw:rider.yaw,shelfY:shelf.y};
    state.restUntil=rider.time+3.5;restFor=0;
  }
  function fall(rider){
    state.falls++;state.time=rider.time;state.saves=rider.saves;state.cleanLandings=rider.cleanLandings;
  }
  function resume(motion){
    if(!state.checkpoint)return null;
    const rider=motion.create(track);
    Object.assign(rider,state.checkpoint,{phase:'riding',time:state.time,saves:state.saves,cleanLandings:state.cleanLandings});
    rider.z=track.sample(rider.x,rider.y).z+motion.clearance;
    restFor=0;
    return rider;
  }
  return {state,update,fall,resume};
}
if(typeof module!=='undefined'&&module.exports)module.exports=createDescentJourney;
