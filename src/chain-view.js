/* Lightweight mixed-media equipment in GDevelop's existing Three group.
 * One instanced link mesh, one reusable arrow and a small reusable impact cue.
 * Links are visual only; physics.js owns the single distance constraint. */
globalThis.createCourtyardChainView=function(THREE,world,own,boxes){
  const mat=(color,extra={})=>{const m=new THREE.MeshBasicMaterial({color,...extra});own.push(m);return m;};
  const steel=mat('#738c98',{vertexColors:true}),gold=mat('#c6a05d'),wood=mat('#654735'),feather=mat('#304b5c',{side:THREE.DoubleSide});
  const linkGeo=new THREE.TorusGeometry(2.4,0.7,4,10);linkGeo.scale(1,1.55,1);
  const normal=linkGeo.attributes.normal,colors=[];
  for(let i=0;i<normal.count;i++){const light=normal.getZ(i)*0.7-normal.getX(i)*0.4+normal.getY(i)*0.2,c=new THREE.Color(light>0.3?'#f0eadb':light< -0.3?'#536577':'#aab9bd');colors.push(c.r,c.g,c.b);}
  linkGeo.setAttribute('color',new THREE.Float32BufferAttribute(colors,3));own.push(linkGeo);
  const links=new THREE.InstancedMesh(linkGeo,steel,128);links.count=0;links.frustumCulled=false;links.instanceMatrix.setUsage(THREE.DynamicDrawUsage);world.add(links);own.push(links);
  const arrow=new THREE.Group();world.add(arrow);arrow.visible=false;
  function part(g,m,x,y,z){own.push(g);const o=new THREE.Mesh(g,m);o.position.set(x,y,z);arrow.add(o);return o;}
  part(new THREE.CylinderGeometry(1.25,1.25,28,6),wood,0,-23,0);
  part(new THREE.ConeGeometry(4.4,11,4),gold,0,-4,0);
  part(new THREE.CylinderGeometry(3,3,4,8),gold,0,-13,0);
  for(let i=0;i<3;i++){
    const a=i*Math.PI*2/3,g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute([0,-36,0,Math.cos(a)*5,-33,Math.sin(a)*5,0,-25,0],3));part(g,feather,0,0,0);
    const barb=part(new THREE.ConeGeometry(1.7,8,4),gold,Math.cos(a)*3,-10,Math.sin(a)*3);barb.rotation.z=Math.sin(a)*0.55;barb.rotation.x=Math.cos(a)*0.55;
  }
  const tail=part(new THREE.TorusGeometry(2,0.65,4,8),gold,0,-38,0);tail.rotation.x=Math.PI/2;
  const guideGeo=new THREE.BufferGeometry();guideGeo.setAttribute('position',new THREE.BufferAttribute(new Float32Array(6),3));own.push(guideGeo);
  const guideMat=new THREE.LineDashedMaterial({color:'#c9b16d',dashSize:7,gapSize:6,transparent:true,opacity:0.48});own.push(guideMat);
  const guide=new THREE.Line(guideGeo,guideMat);world.add(guide);guide.visible=false;
  const haloGeo=new THREE.TorusGeometry(1,0.035,4,24),haloMat=mat('#ffe5a4',{transparent:true,opacity:0});own.push(haloGeo);
  const halo=new THREE.Mesh(haloGeo,haloMat);world.add(halo);halo.visible=false;
  let flash=null;const dummy=new THREE.Object3D(),axis=new THREE.Vector3(0,1,0),direction=new THREE.Vector3(),twist=new THREE.Quaternion();
  const points=Array.from({length:25},()=>new THREE.Vector3()),lengths=new Float32Array(25);
  function impact(pos,time,valid){flash={pos:{...pos},time};haloMat.color.set(valid?'#ffe5a4':'#bba78d');}
  function render(s,player,reel,muzzle,aim,cam,time){
    let end=null,dir=null,len=0;
    if(s.tether){end=s.tether.anchor;dir=s.tether.shotDir;len=s.tether.length;}
    else if(s.arrow){end=s.arrow.pos;dir=s.arrow.dir;len=Math.hypot(end.x-reel.x,end.y-reel.y,end.z-reel.z)+(s.arrow.phase==='out'?5:0);}
    arrow.visible=!!end;links.count=0;
    if(end){
      arrow.position.set(end.x,end.y,end.z);direction.set(dir?.x||0,dir?.y||1,dir?.z||0).normalize();arrow.quaternion.setFromUnitVectors(axis,direction);
      // Chain meets the arrow's tail; gameplay attachment remains at its tip.
      const tailEnd={x:end.x-direction.x*38,y:end.y-direction.y*38,z:end.z-direction.z*38};
      const d=Math.hypot(tailEnd.x-reel.x,tailEnd.y-reel.y,tailEnd.z-reel.z),slack=Math.max(0,len-d-38);
      const sag=Math.min(100,Math.sqrt(slack*Math.max(d,1)*0.375));
      let total=0;lengths[0]=0;
      for(let i=0;i<25;i++){
        const t=i/24,v=points[i];v.set(reel.x+(tailEnd.x-reel.x)*t,reel.y+(tailEnd.y-reel.y)*t,reel.z+(tailEnd.z-reel.z)*t-4*t*(1-t)*sag);
        for(const b of boxes)if(b.z+b.d<=Math.min(reel.z,tailEnd.z)&&v.x>b.x&&v.x<b.x+b.w&&v.y>b.y&&v.y<b.y+b.h)v.z=Math.max(v.z,b.z+b.d+3);
        if(i)total+=v.distanceTo(points[i-1]);lengths[i]=total;
      }
      const count=Math.min(128,Math.max(1,Math.floor(total/6.5)));links.count=count;
      let segment=1;
      for(let i=0;i<count;i++){
        const distance=(i+0.5)*total/count;while(segment<24&&lengths[segment]<distance)segment++;
        const a=points[segment-1],b=points[segment],t=(distance-lengths[segment-1])/Math.max(0.001,lengths[segment]-lengths[segment-1]);
        dummy.position.copy(a).lerp(b,t);direction.copy(b).sub(a).normalize();dummy.quaternion.setFromUnitVectors(axis,direction);
        twist.setFromAxisAngle(axis,(i%2)*Math.PI/2);dummy.quaternion.multiply(twist);dummy.scale.set(1,1,1);dummy.updateMatrix();links.setMatrixAt(i,dummy.matrix);
      }
      links.instanceMatrix.needsUpdate=true;
    }
    guide.visible=s.drawing&&!!aim;
    if(guide.visible){const v=guideGeo.attributes.position;v.setXYZ(0,muzzle.x,muzzle.y,muzzle.z);v.setXYZ(1,aim.x,aim.y,aim.z);v.needsUpdate=true;guide.computeLineDistances();guideGeo.computeBoundingSphere();guideMat.color.set(s.valid?'#d8bf77':s.target?'#b8654c':'#a2b8b5');}
    const age=flash?time-flash.time:1;halo.visible=age<0.28;
    if(halo.visible){halo.position.set(flash.pos.x,flash.pos.y,flash.pos.z);halo.rotation.set(Math.PI/2,0,Math.atan2(-(cam.x-flash.pos.x),cam.y-flash.pos.y),'ZYX');halo.scale.setScalar(12+age*90);haloMat.opacity=(1-age/0.28)*0.7;}
  }
  return {render,impact,clear(){flash=null;links.count=0;arrow.visible=guide.visible=halo.visible=false;},get count(){return links.count;}};
};
