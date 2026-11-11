/* Mouse intent feeds the same steering input as the keys. It never writes
 * position, velocity, grip, or airborne orientation into the bike solver. */
function createMouseRiding(){
  const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
  const angle=v=>Math.atan2(Math.sin(v),Math.cos(v));
  const state={active:false,targetYaw:0,lookTargetYaw:0,pitch:0,x:0,y:0,free:false};
  let sensitivity=1;
  function release(){state.active=false;state.pitch=0;state.free=false;}
  function begin(x,y,yaw,free=false){Object.assign(state,{active:true,x,y,targetYaw:yaw,lookTargetYaw:yaw,pitch:0,free});}
  function move(x,y,yaw,free=false,override=false){
    if(!state.active)return;
    const dx=clamp(x-state.x,-150,150),dy=clamp(y-state.y,-150,150);state.x=x;state.y=y;
    const limit=free?.95:.62;
    state.lookTargetYaw=yaw+clamp(angle(state.lookTargetYaw-yaw)+dx*.0028*sensitivity,-limit,limit);
    state.pitch=clamp(state.pitch-dy*.0016*sensitivity,-.22,.26);
    if(override&&!free){state.targetYaw=yaw;return;}
    state.targetYaw=yaw+clamp(angle(state.targetYaw-yaw)+dx*.0028*sensitivity,-limit,limit);
  }
  function rebase(yaw){state.targetYaw=yaw;state.lookTargetYaw=yaw;}
  function steer(rider,keyboard=0,override=false,scout=false){
    if(!state.active)return keyboard;
    const free=scout||!rider.grounded;
    // Looking during a jump/scout must not queue a surprise turn on landing.
    if(state.free&&!free)rebase(rider.yaw);
    state.free=free;
    if(free)return keyboard;
    if(override){state.targetYaw=rider.yaw;return keyboard;}
    const error=angle(state.targetYaw-rider.yaw),dead=.025;
    const demand=Math.sign(error)*Math.max(0,Math.abs(error)-dead)*2.4;
    const limit=.82-.24*clamp((rider.speed-8)/14,0,1);
    return clamp(demand,-limit,limit);
  }
  function view(yaw){return state.active?{yaw:clamp(angle(state.lookTargetYaw-yaw),-.95,.95),pitch:state.pitch}:{yaw:0,pitch:0};}
  return {state,begin,move,release,rebase,steer,view,setSensitivity(value){sensitivity=clamp(value,.5,1.5);}};
}
if(typeof module!=='undefined'&&module.exports)module.exports=createMouseRiding;
