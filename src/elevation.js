/* Deterministic counterweight/bridge and water-driven carriage. Z is vertical.
 * The bridge translates as a single guided deck, rather than simulated joints.
 * The counterweight ratchet retains partial travel; full travel locks the bridge.
 */
(function(root){
  const P=typeof module!=='undefined'&&module.exports?require('./physics.js'):root.CourtyardPhysics;
  function create(){return {drop:0,locked:false,time:0,tower:false,canopy:false,relay:false,complete:false,moved:0};}
  function relayAnchor(anchor, time) {
    const phase = time * 0.85;
    return {
      x: anchor.x + 54 * Math.sin(phase),
      y: anchor.y,
      z: anchor.z,
      vx: 54 * 0.85 * Math.cos(phase),
      vy: 0,
      vz: 0
    };
  }
  function weight(s){return {id:'counterweight',kind:'weight',label:'Counterweight Â· reel down to raise the bridge',x:1500,y:-125,z:470-s.drop};}
  function carriage(s){const phase=s.time*Math.PI/8;return {id:'carriage',kind:'moving',label:'Waterwheel carriage Â· ride west, reel up, release above the landing',x:1130+230*Math.cos(phase),y:-790-75*Math.sin(phase),z:740,vx:s.locked?-230*Math.PI/8*Math.sin(phase):0,vy:s.locked?-75*Math.PI/8*Math.cos(phase):0,vz:0};}
  function step(s,p,t,input,powered,dt){
    s.moved=0;if(!(dt>0)||dt>1/15)return false;
    if(s.locked){s.time+=dt;return false;}
    if(!powered||t?.anchor.kind!=='weight'||!input.reel)return false;
    const a=weight(s),r=P.reelPoint(p),before=P.distance(r,a),slack=t.length-before;
    if(slack>1){t.length=Math.max(before,t.length-135*dt);return false;}
    if(r.z>a.z-35)return false;
    const old=s.drop;s.drop=Math.min(160,s.drop+42*dt);s.moved=s.drop-old;
    t.length=P.clamp(t.length+P.distance(r,weight(s))-before,90,620);
    if(s.drop>=160){s.locked=true;return true;}return false;
  }
  function bridgeTop(s){return 60+s.drop;}
  function checkpoint(s){return s.relay?{x:790,y:-550,z:400}:s.canopy?{x:780,y:-800,z:460}:s.tower?{x:1450,y:-820,z:400}:s.locked?{x:1360,y:-80,z:220}:null;}
  const api={create,weight,carriage,step,bridgeTop,checkpoint,relayAnchor};root.CourtyardElevation=api;if(typeof module!=='undefined'&&module.exports)module.exports=api;
})(globalThis);
