// A bounded pool shared by the local and crew riders. No meshes are allocated
// per puff, and the rear wheel only throws dirt while it touches the trail.
function createBikeDust(world,track){
  const capacity=120;
  const positions=new Float32Array(capacity*3);
  const colors=new Float32Array(capacity*3);
  const alpha=new Float32Array(capacity);
  const size=new Float32Array(capacity);
  const pool=Array.from({length:capacity},()=>({age:1,life:0,vx:0,vy:0,vz:0,opacity:0,radius:0,grit:false}));
  const remainders=new Float32Array(5);
  const geometry=new THREE.BufferGeometry();
  const attributes={position:positions,tint:colors,opacity:alpha,radius:size};
  for(const [name,data] of Object.entries(attributes)){
    geometry.setAttribute(name,new THREE.BufferAttribute(data,data===positions||data===colors?3:1).setUsage(THREE.DynamicDrawUsage));
  }
  const material=new THREE.ShaderMaterial({
    transparent:true,depthWrite:false,
    uniforms:{screenHeight:{value:720}},
    vertexShader:`
      attribute vec3 tint;
      attribute float opacity, radius;
      uniform float screenHeight;
      varying vec4 vPuff;
      void main(){
        vec4 eye = modelViewMatrix * vec4(position, 1.0);
        gl_Position = projectionMatrix * eye;
        gl_PointSize = clamp(radius * screenHeight / max(0.1, -eye.z), 1.0, 58.0);
        vPuff = vec4(tint, opacity);
      }`,
    fragmentShader:`
      varying vec4 vPuff;
      void main(){
        float r = length(gl_PointCoord - 0.5) * 2.0;
        float edge = 1.0 - smoothstep(0.13, 1.0, r);
        if (vPuff.a < 0.005 || edge < 0.005) discard;
        gl_FragColor = vec4(vPuff.rgb, edge * vPuff.a);
        #include <colorspace_fragment>
      }`
  });
  const points=new THREE.Points(geometry,material);
  points.frustumCulled=false;
  points.visible=false;
  world.add(points);
  const tints={dirt:new THREE.Color('#d8b07b'),gravel:new THREE.Color('#c0ad92'),stone:new THREE.Color('#a8a49b'),grass:new THREE.Color('#91825b')};
  const gritTint=new THREE.Color('#735337');
  let cursor=0;
  function emit(rider,dt,slot){
    if(!rider.grounded||rider.phase!=='riding'||rider.speed<3.5)return;
    const brakeSlide=(rider.rearSkid||0)*.83;
    const naturalSlide=Math.max(0,(rider.slip||0)-.8)*.15;
    const skid=track.clamp(brakeSlide+naturalSlide,0,1);
    if(skid<.055)return;
    const sin=Math.sin(rider.yaw),cos=Math.cos(rider.yaw);
    const x=rider.x-sin*.65,y=rider.y-cos*.65;
    const ground=track.sample(x,y);
    if(ground.gap)return;
    const loose=ground.kind==='gravel'?1.3:ground.kind==='stone'?.28:ground.kind==='grass'?.48:1;
    remainders[slot]+=dt*(18+skid*61)*skid*loose;
    const count=Math.floor(remainders[slot]);
    remainders[slot]-=count;
    for(let n=0;n<count;n++){
      const i=cursor,j=i*3,puff=pool[i];
      cursor=(cursor+1)%capacity;
      puff.grit=i%5===0;
      const tint=puff.grit?gritTint:(tints[ground.kind]||tints.dirt);
      const spread=(Math.random()-.5)*.38;
      positions[j]=x+cos*spread;
      positions[j+1]=y-sin*spread;
      positions[j+2]=ground.z+.10;
      const kick=.65+Math.random()*rider.speed*(puff.grit?.30:.23);
      const sweep=(Math.random()-.5)*2.2+(rider.slipSide||0)*.27;
      puff.vx=-sin*kick+cos*sweep;
      puff.vy=-cos*kick-sin*sweep;
      puff.vz=(puff.grit?.8:.45)+Math.random()*.76;
      puff.age=0;
      puff.life=puff.grit?.24+Math.random()*.22:.46+Math.random()*.48;
      puff.opacity=Math.min(.86,(.28+skid*.52)*loose);
      puff.radius=puff.grit?.03+Math.random()*.045:.19+Math.random()*.23;
      colors[j]=tint.r;colors[j+1]=tint.g;colors[j+2]=tint.b;
    }
  }
  function update(local,others,dt,clear,screenHeight){
    material.uniforms.screenHeight.value=screenHeight;
    if(clear){
      for(const puff of pool)puff.age=puff.life;
      alpha.fill(0);remainders.fill(0);
      points.visible=false;
      return;
    }
    emit(local,dt,0);
    for(const other of others)emit(other,dt,1+other.slot);
    let visible=false;
    for(let i=0;i<capacity;i++){
      const puff=pool[i],j=i*3;
      if(puff.age>=puff.life){alpha[i]=0;continue;}
      puff.age+=dt;
      const t=Math.min(1,puff.age/puff.life);
      positions[j]+=puff.vx*dt;
      positions[j+1]+=puff.vy*dt;
      positions[j+2]+=puff.vz*dt;
      puff.vz-=dt*(puff.grit?4.4:.55);
      size[i]=puff.radius*(puff.grit?1:1+t*1.85);
      alpha[i]=puff.opacity*(1-t)**1.5;
      visible=true;
    }
    points.visible=visible;
    if(visible)for(const name of Object.keys(attributes))geometry.getAttribute(name).needsUpdate=true;
  }
  return {update};
}
