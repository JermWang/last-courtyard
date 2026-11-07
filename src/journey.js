/* Level-one progression. Physical checkpoints remain in elevation.js; this
 * small state machine owns the one-shot ending and excludes paused/stalled time.
 * Recovery never recreates it. Replay creates a fresh scene and journey. */
(function(root){
  const DURATION=7;
  function create(){return {phase:'playing',hold:0,reveal:0,seconds:0,result:null};}
  function ready(b,e){return b.solved&&b.flow>=1&&e.locked&&e.tower&&e.canopy;}
  function onSeal(p){return p.grounded&&Math.abs(p.z-460)<2&&Math.hypot(p.x-785,p.y-450)<=39;}
  function progress(b,e){return [b.solved&&b.flow>=1,e.locked,e.complete];}
  function step(s,b,e,p,dt,paused,stats={}){
    if(paused||!Number.isFinite(dt)||dt<=0||dt>0.15)return null;
    if(s.phase==='playing'){
      s.seconds+=dt;
      s.hold=ready(b,e)&&onSeal(p)?s.hold+dt:0;
      if(s.hold>=0.8){
        e.complete=true;s.phase='restoring';s.reveal=0;s.hold=0;
        s.result={seconds:s.seconds,shots:stats.shots||0,recoveries:stats.recoveries||0};
        return 'restore';
      }
    }else if(s.phase==='restoring'){
      s.reveal=Math.min(DURATION,s.reveal+dt);
      if(s.reveal>=DURATION){s.phase='complete';return 'complete';}
    }
    return null;
  }
  function skip(s){if(s.phase!=='restoring')return false;s.reveal=DURATION;s.phase='complete';return true;}
  function explore(s){if(s.phase!=='complete')return false;s.phase='exploring';return true;}
  function locked(s){return s.phase==='restoring'||s.phase==='complete';}
  const api={create,ready,onSeal,progress,step,skip,explore,locked,DURATION};
  root.CourtyardJourney=api;if(typeof module!=='undefined'&&module.exports)module.exports=api;
})(globalThis);
