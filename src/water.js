/* Bounded water interaction in engine X/Y ground, Z height. Basins have real
 * bottoms; water is never an infinite trigger column. This is a surface/current
 * model, not a volumetric fluid simulation. Deep water remains a forgiving fall. */
(function(root){
  function surface(b,time){return b.z+Math.sin(time*1.15+b.x*.013)*.55;}
  function sample(p,basins,time){
    for(const b of basins){const z=surface(b,time);
      if(p.x>b.x&&p.x<b.x+b.w&&p.y>b.y&&p.y<b.y+b.h&&p.z>=b.bottom-2&&p.z<z+1)
        return {basin:b,z,depth:Math.max(0,z-p.z),deep:z-b.bottom>40};
    }return null;
  }
  function crossing(a,b,basins,time){
    let first=null;
    for(const basin of basins){const z=surface(basin,time);if(a.z<=z||b.z>z)continue;
      const t=(a.z-z)/(a.z-b.z),x=a.x+(b.x-a.x)*t,y=a.y+(b.y-a.y)*t;
      if(x>basin.x&&x<basin.x+basin.w&&y>basin.y&&y<basin.y+basin.h&&(!first||t<first.t))first={t,x,y,z,basin};
    }return first;
  }
  function create(){return {wet:false,deepTime:0,distance:0};}
  function step(s,p,contact,travel,dt){
    if(!(dt>0)||dt>0.15)return {splash:false,ripple:false,recover:false};
    const splash=!!contact&&!s.wet;s.wet=!!contact;
    s.deepTime=contact?.deep?s.deepTime+dt:0;
    s.distance=contact?s.distance+travel:0;
    const ripple=splash||s.distance>32;if(ripple)s.distance=0;
    if(contact){const damping=Math.exp(-(contact.deep?5:2)*dt);p.vx*=damping;p.vy*=damping;
      if(contact.deep)p.vz=Math.max(-95,p.vz*Math.exp(-6*dt));
    }
    return {splash,ripple,recover:s.deepTime>=0.38};
  }
  const api={surface,sample,crossing,create,step};root.CourtyardWater=api;if(typeof module!=='undefined'&&module.exports)module.exports=api;
})(globalThis);
