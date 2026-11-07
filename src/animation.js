/* Pure sprite state controller. Units match physics; walk phase follows ground
 * distance, never wall-clock time. Frozen pauses/stalls cannot skip action poses.
 * Atlas: 0–7 walk, 8–10 draw, 11 release, 12 rise, 13 fall, 14 swing, 15 land.
 * Separate two-cell reel strip and normalized idle image share the same root. */
(function(root){
  function create(){return {phase:0,reelPhase:0,fire:0,land:0,pose:{kind:'idle',frame:0,step:false}};}
  function reset(a){Object.assign(a,create());}
  function update(a,s,dt){
    if(s.paused||!(dt>0)||dt>0.15)return a.pose;
    dt=Math.min(dt,1/15);
    a.fire=Math.max(0,a.fire-dt);a.land=Math.max(0,a.land-dt);
    if(s.fired)a.fire=0.22;
    if(s.landed)a.land=0.14;
    let kind='idle',frame=0,step=false;
    if(s.drawing){a.fire=0;kind='draw';frame=s.draw<0.12?8:s.draw<0.35?9:10;}
    else if(a.fire>0){kind='fire';frame=a.fire>0.08?11:8;}
    else if(!s.grounded){kind=s.attached?'swing':s.vz>25?'jump':'fall';frame=s.attached?14:s.vz>25?12:13;}
    else if(a.land>0){kind='land';frame=15;}
    else if(s.reeling){kind='reel';a.reelPhase=(a.reelPhase+dt*6)%2;frame=Math.floor(a.reelPhase);}
    else if(s.distance>0.02){
      kind='walk';const before=Math.floor((a.phase+1e-9)/4);
      a.phase+=Math.min(s.distance,30)*8/140;step=Math.floor((a.phase+1e-9)/4)!==before;
      a.phase%=8;frame=Math.floor(a.phase);
    }
    if(kind==='idle')a.phase=0;
    if(kind!=='reel')a.reelPhase=0;
    a.pose={kind,frame,step};return a.pose;
  }
  const api={create,reset,update};root.CourtyardAnimation=api;
  if(typeof module!=='undefined'&&module.exports)module.exports=api;
})(globalThis);
