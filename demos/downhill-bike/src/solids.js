/* Shared convex boulders: the renderer, tires and ragdoll use these faces.
 * World metres, Z up. No Three dependency in the fixed-step collision code. */
const BikeSolids=(()=>{
  const phi=(1+Math.sqrt(5))/2,vertices=[],faces=[],cache=new WeakMap();
  const dot=(a,b)=>a[0]*b[0]+a[1]*b[1]+a[2]*b[2];
  const sub=(a,b)=>a.map((v,i)=>v-b[i]);
  const cross=(a,b)=>[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]];
  const unit=a=>{const n=Math.hypot(...a);return a.map(v=>v/n);};
  for(const x of [-1,1])for(const y of [-1,1])for(const z of [-1,1])vertices.push([x,y,z]);
  for(const a of [-1,1])for(const b of [-1,1])vertices.push([0,a/phi,b*phi],[a/phi,b*phi,0],[a*phi,0,b/phi]);
  for(const v of vertices)for(let i=0;i<3;i++)v[i]/=Math.sqrt(3);
  // Extract the twelve pentagonal faces once, without a rendering library.
  for(let a=0;a<20;a++)for(let b=a+1;b<20;b++)for(let c=b+1;c<20;c++){
    let n=cross(sub(vertices[b],vertices[a]),sub(vertices[c],vertices[a]));
    if(Math.hypot(...n)<1e-6)continue;n=unit(n);let d=dot(n,vertices[a]);
    if(d<0){n=n.map(v=>-v);d=-d;}
    if(vertices.some(v=>dot(n,v)>d+1e-6)||faces.some(f=>dot(f.normal,n)>.99999))continue;
    const ids=vertices.map((v,i)=>Math.abs(dot(n,v)-d)<1e-6?i:-1).filter(i=>i>=0);
    const center=n.map(v=>v*d),u=unit(sub(vertices[ids[0]],center)),v=cross(n,u);
    ids.sort((a,b)=>Math.atan2(dot(sub(vertices[a],center),v),dot(sub(vertices[a],center),u))-
      Math.atan2(dot(sub(vertices[b],center),v),dot(sub(vertices[b],center),u)));
    faces.push({ids,normal:n});
  }
  function rotate(v,yaw){
    const cz=Math.cos(yaw),sz=Math.sin(yaw),cy=Math.cos(.28),sy=Math.sin(.28),cx=Math.cos(.2),sx=Math.sin(.2);
    const x=v[0]*cz-v[1]*sz,y=v[0]*sz+v[1]*cz,z=v[2],xx=x*cy+z*sy,zz=-x*sy+z*cy;
    return [xx,y*cx-zz*sx,y*sx+zz*cx];
  }
  function get(T){
    if(cache.has(T))return cache.get(T);
    const rocks=[],buckets=new Map(),trees=new Map((T.trees||[]).map(t=>[t.x+','+t.y,t]));
    for(const [index,entry] of T.rocks.entries()){
      const [x,y,r,kind]=entry;
      const yaw=((Math.imul(index+1,2654435761)^(T.seed||0))>>>0)/4294967296*Math.PI;
      const z=T.sample(x,y).z+(kind==='tree'?0:r*.26);
      let points,planes,extent=r;
      if(kind==='tree'){
        const tree=trees.get(x+','+y),h=tree?.h||11.1,w=tree?.w||r/.22;
        extent=.22*w;points=[];
        for(const [radius,height] of [[.22*w,-.01*h],[.15*w,.63*h]])for(let k=0;k<5;k++){
          const a=k/5*Math.PI*2;points.push([x+Math.sin(a)*radius,y-Math.cos(a)*radius,z+height]);
        }
        planes=[{n:[0,0,1],d:z+.63*h},{n:[0,0,-1],d:-z+.01*h}];
        for(let k=0;k<5;k++){
          const a=points[k],b=points[(k+1)%5],c=points[k+5];let n=unit(cross(sub(b,a),sub(c,a)));
          if(dot(n,sub(a,[x,y,z+h*.3]))<0)n=n.map(v=>-v);
          planes.push({n,d:dot(n,a)});
        }
      }else{
        points=vertices.map(v=>rotate([v[0]*r,v[1]*r*.86,v[2]*r*.73],yaw).map((v,i)=>v+[x,y,z][i]));
        planes=faces.map(f=>{const [a,b,c]=f.ids.map(i=>points[i]);const n=unit(cross(sub(b,a),sub(c,a)));return {n,d:dot(n,a)};});
      }
      const rock={x,y,z,r:extent,yaw,points,planes,index,kind:kind==='tree'?'tree':'rock'};
      if(kind!=='tree')rocks.push(rock);
      for(let k=Math.floor((y-r-1)/20);k<=Math.floor((y+r+1)/20);k++){
        if(!buckets.has(k))buckets.set(k,[]);buckets.get(k).push(rock);
      }
    }
    const value={rocks,near:y=>buckets.get(Math.floor(y/20))||[]};cache.set(T,value);return value;
  }
  function top(s,x,y){
    if(Math.abs(x-s.x)>s.r||Math.abs(y-s.y)>s.r)return null;
    let hi=Infinity,lo=-Infinity,normal;
    for(const {n,d} of s.planes){
      const h=d-n[0]*x-n[1]*y;
      if(Math.abs(n[2])<1e-8){if(h<0)return null;continue;}
      const z=h/n[2];
      if(n[2]>0&&z<hi){hi=z;normal=n;}else if(n[2]<0)lo=Math.max(lo,z);
    }
    return hi>=lo?{z:hi,normal}:null;
  }
  function sample(T,x,y,ceiling=Infinity){
    let p=T.sample(x,y);
    for(const s of get(T).near(y)){
      const hit=top(s,x,y);
      if(hit&&hit.z>p.z&&hit.z<=ceiling+.18)p={...p,...hit,solid:s,kind:'gravel',gap:false,landing:false,jump:null,jumpOffset:Infinity};
    }
    return p;
  }
  function sweep(s,a,b,radius=0){
    let enter=0,exit=1,face=null,nearest=-Infinity,insideFace=null;
    for(const {n,d} of s.planes){
      const da=dot(n,a)-d-radius,db=dot(n,b)-d-radius;
      if(da>0&&db>0)return null;
      if(da>nearest){nearest=da;insideFace=n;}
      if(da>db){const t=da/(da-db);if(t>enter){enter=t;face=n;}}
      else if(db>da)exit=Math.min(exit,da/(da-db));
      if(enter>exit)return null;
    }
    if(exit<0||enter>1)return null;
    return {t:Math.max(0,enter),normal:face||insideFace,depth:face?0:Math.max(0,-nearest)};
  }
  function collision(T,a,b,radius=.26,supported=[]){
    let best=null;
    const nearby=new Set([...get(T).near(a[1]),...get(T).near(b[1])]);
    for(const s of nearby){
      if(Math.min(a[0],b[0])>s.x+s.r+radius||Math.max(a[0],b[0])<s.x-s.r-radius)continue;
      const hit=sweep(s,a,b,radius);
      // Skip an upper face only when the tire solver can actually support
      // this bike above it. Hitting the same face from below is still solid.
      if(hit&&!(hit.normal[2]>=.40&&supported.includes(s.index))&&(!best||hit.t<best.t))best={...hit,solid:s};
    }
    return best;
  }
  return {vertices,faces,get,top,sample,sweep,collision};
})();
if(typeof module!=='undefined'&&module.exports)module.exports=BikeSolids;
