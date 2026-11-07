/* One rope, two reel inputs. A new target is selected at pointer-down so moving
 * the cursor while drawing cannot accidentally change a transfer into a toggle.
 * Drawing preserves the current tether; firing is the explicit release point. */
(function(root){
  function clear(s){s.mouseReel=false;s.drawing=false;s.draw=0;s.drawTarget=null;s.transferFrom=null;}
  function press(s,target,valid){
    if (s.tether && target && target.id !== s.tether.anchor.id && !valid) return 'blocked';
    if(s.tether&&(!target||target.id===s.tether.anchor.id)){
      s.mouseReel=!s.mouseReel;return 'reel';
    }
    s.mouseReel=false;s.drawing=true;s.draw=0;s.drawTarget=valid?target:null;
    s.transferFrom=s.tether?.anchor.id||null;return s.transferFrom?'transfer':'draw';
  }
  function reel(s){return !!s.tether&&!s.keys.has('KeyQ')&&(s.mouseReel||s.keys.has('KeyE'));}
  function fire(s,valid){
    if(!s.drawing)return {fired:false};
    // If a locked transfer loses line of sight/range during the draw, keep the
    // old attachment. An invalid click must not drop someone into a void.
    if(s.transferFrom&&!valid){clear(s);return {fired:false,cancelled:true};}
    const from=s.transferFrom;clear(s);s.tether=null;return {fired:true,from};
  }
  const api={clear,press,reel,fire};root.CourtyardGrappleInput=api;if(typeof module!=='undefined'&&module.exports)module.exports=api;
})(globalThis);
