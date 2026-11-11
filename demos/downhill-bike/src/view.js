/* Original low-poly assets, generated in GDevelop's existing Three scene. */
function createBikeView(scene,T=BikeTrack){
  const layer=scene.getLayer('');
  const renderer=layer.getRenderer();
  const camera=renderer.getThreeCamera();
  const world=new THREE.Group();
  const unit=scene.getRenderer3DWorldScale();
  world.scale.set(unit,-unit,unit); // Cancel the scene Y reflection for this metre-based view.
  renderer.getThreeGroup().add(world);
  const scene3D=renderer.getThreeScene();
  scene3D.background=new THREE.Color('#9bbfcf');
  scene3D.fog=new THREE.FogExp2('#b6bfc5',.00165);
  world.add(new THREE.HemisphereLight('#dce6ef','#625c54',1.55));
  const sun=new THREE.DirectionalLight('#ffe0b7',2.8);
  sun.position.set(-32,45,28);
  world.add(sun);
  let randomState=(40785^T.seed^Math.imul(T.stage-1,2246822519))>>>0;
  function random(){
    randomState=(Math.imul(1664525,randomState)+1013904223)>>>0;
    return randomState/4294967296;
  }
  const mat=(color)=>new THREE.MeshStandardMaterial({color,roughness:.88,flatShading:true});
  const grass=new THREE.Color('#65824d'), dirt=new THREE.Color('#aa8460'), gravel=new THREE.Color('#92908a');
  const alpine=new THREE.Color('#929b98'),forestFloor=new THREE.Color('#586547'),wetGreen=new THREE.Color('#547c59');
  const rock=new THREE.Color('#65635e'), shoulder=new THREE.Color('#847454'), color=new THREE.Color();
  const exposedRock=new THREE.Color('#716a5d');
  const valleyGrass=new THREE.Color('#748257'),pit=new THREE.Color('#4d4744');
  const positions=[],colors=[],weights=[],indices=[];
  const {left,right,top,bottom}=T.bounds;
  const xs=[];
  if(T.landscape){
    for(let x=-1060;x< -460;x+=18)xs.push(x);
    for(let x=-460;x< -160;x+=6)xs.push(x);
    for(let i=0;i<=200;i++)xs.push(-160+i*1.6);
    for(let x=166;x<=460;x+=6)xs.push(x);
    for(let x=478;x<1060;x+=18)xs.push(x);
    xs.push(1060);
    for(const j of T.flankJumps||[])for(let dx=-10;dx<=10;dx+=1.25)xs.push(j.flank*T.mirrored+dx);
    xs.sort((a,b)=>a-b);
    for(let i=xs.length-1;i>0;i--)if(xs[i]-xs[i-1]<.02)xs.splice(i,1);
  }else{const count=Math.ceil((right-left)/(T.expedition?1.6:1.36));for(let i=0;i<=count;i++)xs.push(left+(right-left)*i/count);}
  const cols=xs.length-1,gridRows=Math.ceil((bottom-top)*(T.expedition?.65:.90));
  const ys=Array.from({length:gridRows+1},(_,i)=>top+(bottom-top)*i/gridRows);
  for(const {lip,land} of T.jumps)ys.push(lip-.025,lip+.025,land-.025,land+.025);
  ys.sort((a,b)=>a-b);
  const rows=ys.length-1;
  for(let j=0;j<=rows;j++){
    const y=ys[j];
    const region=T.region(y);
    for(let i=0;i<=cols;i++){
      const x=xs[i]+(T.spine?T.spine(y):0);
      const p=T.sample(x,y);
      positions.push(x,y,p.z);
      const q=Math.abs(p.cutOffset)-T.chuteHalf;
      color.copy(grass).lerp(rock,T.expedition&&y>620?0:T.clamp((Math.abs(x)-40)/32,0,1));
      color.lerp(shoulder,p.exposure*.50);
      const jumpMix=T.clamp((.38-p.jumpOffset)/1.05,0,1);
      const gravelMix=T.expedition&&y>620?(p.kind==='gravel'?.86:p.kind==='stone'?.92:0):Math.max(p.ledge*.72,T.clamp((.7-q)/1.2,0,1));
      const dirtMix=p.gap?0:T.expedition&&y>620?(p.kind==='dirt'||p.kind==='roots'?.86:0):T.clamp((p.exposure-.28)*1.24,0,.89)*(1-p.valley*.88);
      const cutBank=T.clamp(1-Math.abs(Math.abs(p.cutOffset)-3.55)/1.45,0,1)
        *T.clamp((y-T.chuteStart-15)/21,0,1);
      const loose=Math.max(gravelMix,cutBank*.68);
      color.lerp(exposedRock,cutBank*.68).lerp(gravel,gravelMix).lerp(dirt,dirtMix);
      if(p.kind==='stone')color.lerp(exposedRock,.46).lerp(rock,(p.slab||0)*.22);
      if(p.ridge>.12){
        color.lerp(rock,.18+.24*p.ridge);
        // Restrained strata follow height, not a separate painted backdrop.
        color.multiplyScalar(Math.sin(p.z*.34+x*.012+y*.018)>.45?.94:1);
      }
      color.lerp(rock,p.ledge*.72);
      color.lerp(valleyGrass,p.valley*.76);
      color.lerp(valleyGrass,p.shelf*.18);
      color.lerp(alpine,region.alpine*.25*(1-dirtMix));
      color.lerp(forestFloor,region.forest*(p.kind==='stone'?.08:.36)).lerp(wetGreen,region.valley*(p.kind==='stone'?.05:.38));
      if(p.gap)color.lerp(pit,jumpMix);
      weights.push((1-loose)*(1-dirtMix),dirtMix,loose*(1-dirtMix));
      const wear=.064*Math.sin(x*.29+y*.61)+.045*Math.sin(x*.48-y*.37);
      color.multiplyScalar(.92+.14*random()+wear);
      colors.push(color.r,color.g,color.b);
      if(j<rows&&i<cols){
        const a=j*(cols+1)+i,b=a+cols+1;
        indices.push(a,a+1,b,b,a+1,b+1);
      }
    }
  }
  const terrain=new THREE.BufferGeometry();
  terrain.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));
  terrain.setAttribute('color',new THREE.Float32BufferAttribute(colors,3));
  terrain.setAttribute('surfaceMix',new THREE.Float32BufferAttribute(weights,3));
  terrain.setIndex(indices);
  terrain.computeVertexNormals();
  const terrainMaterial=new THREE.MeshStandardMaterial({vertexColors:true,roughness:1});
  const images=scene.getGame().getImageManager();
  let sky=null;
  if(T.landscape){
    const panorama=images.getThreeTexture('mountain-sky').clone();
    panorama.colorSpace=THREE.SRGBColorSpace;panorama.flipY=false;panorama.needsUpdate=true;
    const globe=new THREE.SphereGeometry(4500,64,32);globe.rotateX(Math.PI/2);
    // GDevelop uploads ImageBitmaps with top-left image orientation; WebGL
    // ignores texture.flipY for them. Orient the panorama through UVs instead.
    const skyUV=globe.getAttribute('uv');for(let i=0;i<skyUV.count;i++)skyUV.setY(i,1-skyUV.getY(i));
    sky=new THREE.Mesh(globe,new THREE.MeshBasicMaterial({map:panorama,side:THREE.BackSide,depthWrite:false,fog:false}));
    sky.rotation.z=1.7;sky.renderOrder=-1000;sky.frustumCulled=false;world.add(sky);
  }
  const maps=['forest_floor','park_dirt','gravel_floor_04'].map(name=>{
    const texture=images.getThreeTexture(name).clone();
    texture.colorSpace=THREE.NoColorSpace;
    texture.wrapS=texture.wrapT=THREE.RepeatWrapping;
    texture.generateMipmaps=true;
    texture.minFilter=THREE.LinearMipmapLinearFilter;
    texture.anisotropy=4;
    texture.needsUpdate=true;
    return texture;
  });
  terrainMaterial.onBeforeCompile=shader=>{
    shader.uniforms.forestDetail={value:maps[0]};
    shader.uniforms.dirtDetail={value:maps[1]};
    shader.uniforms.gravelDetail={value:maps[2]};
    const varyings='varying vec3 vSurfaceMix, vGround, vGroundNormal;\n';
    shader.vertexShader='attribute vec3 surfaceMix; '+varyings+
      shader.vertexShader.replace('#include <begin_vertex>',`#include <begin_vertex>
        vSurfaceMix=surfaceMix; vGround=position; vGroundNormal=normal;
      `);
    shader.fragmentShader='uniform sampler2D forestDetail,dirtDetail,gravelDetail; '+varyings+
      shader.fragmentShader.replace('#include <map_fragment>',`#include <map_fragment>
        vec3 faceNormal=abs(normalize(vGroundNormal));
        float cliff=1.0-smoothstep(0.32,0.62,faceNormal.z);
        vec2 faceUV=faceNormal.x>faceNormal.y?vGround.yz:vGround.xz;
        vec3 materials=mix(vSurfaceMix,vec3(0.0,0.0,1.0),cliff);
        vec2 gravelUV=mix(vGround.xy,faceUV,cliff);
        float groundPattern=texture2D(forestDetail,vGround.xy/2.1).r*materials.x
          +texture2D(dirtDetail,vGround.xy/3.0).r*materials.y
          +texture2D(gravelDetail,gravelUV/2.5).r*materials.z;
        float scuff=0.035*sin(vGround.y*3.7+sin(vGround.x*1.8))
          +0.053*sin(vGround.y*0.51-vGround.x*0.29);
        float strata=0.91+0.09*sin(vGround.z*1.37+0.36*sin(faceUV.x*0.51));
        diffuseColor.rgb=mix(diffuseColor.rgb,vec3(0.17,0.155,0.134)*strata,cliff*0.84);
        diffuseColor.rgb *= 1.0 + (groundPattern - 0.5)*1.42 + scuff;
      `);
  };

  function add(geo,material,x,y,z,parent=world){
    const mesh=new THREE.Mesh(geo,material);
    mesh.position.set(x,y,z);
    parent.add(mesh);
    return mesh;
  }
  const trunkMat=mat('#594839'), pineMat=mat('#597359');
  // Layered, uneven boughs give pines a broken silhouette instead of a solid
  // triangular canopy. Geometry is shared across every tree instance.
  const crownVertices=[],crownColors=[];
  for(let tier=0;tier<4;tier++){
    const z=-.82+tier*.43,radius=1-tier*.21;
    for(let branch=0;branch<9;branch++){
      const a=branch/9*Math.PI*2+tier*.47,b=(branch+1)/9*Math.PI*2+tier*.47;
      const ra=radius*(.85+.15*Math.sin(branch*7.3+tier)),rb=radius*(.85+.15*Math.sin((branch+1)*7.3+tier));
      crownVertices.push(Math.cos(a)*ra,Math.sin(a)*ra,z-.09*(branch%2),
        Math.cos(b)*rb,Math.sin(b)*rb,z-.09*((branch+1)%2),.07*Math.sin(tier),0,z+.78);
      const tone=.76+tier*.055+(branch%3)*.08;
      for(let vertex=0;vertex<3;vertex++)crownColors.push(tone,tone,tone);
    }
  }
  const treeShape=new THREE.BufferGeometry();
  treeShape.setAttribute('position',new THREE.Float32BufferAttribute(crownVertices,3));
  treeShape.setAttribute('color',new THREE.Float32BufferAttribute(crownColors,3));treeShape.computeVertexNormals();
  pineMat.vertexColors=true;pineMat.side=THREE.DoubleSide;
  const trunkShape=new THREE.CylinderGeometry(.15,.22,1,5);
  trunkShape.rotateX(Math.PI/2);
  const trees=[];
  for(let i=0;i<3300&&trees.length<420;i++){
    const x=left+12+random()*(right-left-24),y=8+random()*(T.expedition?602:T.finish+5),p=T.sample(x,y);
    const region=T.region(y);
    if(y>T.finish-24||p.ledge>.50||p.shelf>.25||region.alpine>.5&&random()<.82||p.kind!=='grass'||p.jumpOffset<2||
      Math.abs(p.safeOffset)<2.8||Math.abs(p.cutOffset)<3.7||Math.abs(x)<10&&y<45)continue;
    trees.push({x,y,z:p.z,h:3+random()*4.3+region.forest*3.5,w:.65+random()*.54});
  }
  if(T.trees)trees.push(...T.trees);
  const needles=new THREE.InstancedMesh(treeShape,pineMat,trees.length*2);
  const trunks=new THREE.InstancedMesh(trunkShape,trunkMat,trees.length);
  const transform=new THREE.Object3D();
  trees.forEach((tree,i)=>{
    const {x,y,z,h,w}=tree;
    transform.position.set(x,y,z+h*.31);
    transform.scale.set(w,w,h*.64);transform.updateMatrix();
    trunks.setMatrixAt(i,transform.matrix);
    tree.trunkMatrix=transform.matrix.clone();
    transform.position.z=z+h*.57;transform.scale.set(w*h*.28,w*h*.28,h*.34);transform.updateMatrix();
    needles.setMatrixAt(i*2,transform.matrix);
    tree.crownMatrix=transform.matrix.clone();
    transform.position.z=z+h*.82;transform.scale.multiplyScalar(.74);transform.updateMatrix();
    needles.setMatrixAt(i*2+1,transform.matrix);
    tree.tipMatrix=transform.matrix.clone();
    const tone=new THREE.Color().setHSL(.28+random()*.03,.20+random()*.13,.58+random()*.13);
    needles.setColorAt(i*2,tone);
    needles.setColorAt(i*2+1,tone.clone().multiplyScalar(1.18));
  });
  world.add(trunks,needles);
  needles.computeBoundingSphere();trunks.computeBoundingSphere();

  // Bake broad tree shade into the terrain vertices once. The trail stays in
  // one mesh and needs no shadow-map pass or transparent shadow decals.
  const groundColors=terrain.getAttribute('color');
  const groundPositions=terrain.getAttribute('position');
  function columnNear(x){let lo=0,hi=cols;while(lo<hi){const mid=(lo+hi)>>1;if(xs[mid]<x)lo=mid+1;else hi=mid;}return lo;}
  function rowNear(y){
    let lo=0,hi=rows;
    while(lo<hi){const mid=(lo+hi)>>1;if(ys[mid]<y)lo=mid+1;else hi=mid;}
    return lo;
  }
  for(const tree of trees){
    const cx=tree.x+tree.h*.35, cy=tree.y-tree.h*.48;
    const rx=tree.h*.74, ry=tree.h*.41;
    const y0=Math.max(0,rowNear(cy-ry)-1),y1=rowNear(cy+ry);
    for(let j=y0;j<=y1;j++){
      const offset=T.spine?T.spine(ys[j]):0;
      const x0=Math.max(0,columnNear(cx-rx-offset)-1),x1=columnNear(cx+rx-offset);
      for(let i=x0;i<=x1;i++){
        const d=((groundPositions.getX(j*(cols+1)+i)-cx)/rx)**2+((ys[j]-cy)/ry)**2;
        if(d>=1)continue;
        const index=j*(cols+1)+i;
        const shade=1-(1-d)*.42;
        groundColors.setXYZ(index,groundColors.getX(index)*shade,
          groundColors.getY(index)*shade,groundColors.getZ(index)*shade);
      }
    }
  }
  // Preserve the shared normals along tile edges, then let the camera cull
  // the mountain behind and beside the rider instead of drawing it every frame.
  const groundTiles=[];
  for(let j0=0;j0<rows;j0+=38)for(let i0=0;i0<cols;i0+=44){
    const w=Math.min(44,cols-i0),h=Math.min(38,rows-j0),stride=w+1;
    const tile=new THREE.BufferGeometry(),cells=[];
    for(const name of ['position','normal','color','surfaceMix']){
      const src=terrain.getAttribute(name).array,dst=new Float32Array(stride*(h+1)*3);
      for(let j=0;j<=h;j++){
        const start=((j0+j)*(cols+1)+i0)*3;
        dst.set(src.subarray(start,start+stride*3),j*stride*3);
      }
      tile.setAttribute(name,new THREE.BufferAttribute(dst,3));
    }
    for(let j=0;j<h;j++)for(let i=0;i<w;i++){
      const a=j*stride+i,b=a+stride;
      cells.push(a,a+1,b,b,a+1,b+1);
    }
    tile.setIndex(cells);
    tile.computeBoundingSphere();
    const groundTile=new THREE.Mesh(tile,terrainMaterial);world.add(groundTile);groundTiles.push(groundTile);
  }
  terrain.dispose();

  const rockPositions=[],rockUV=[];
  for(const f of BikeSolids.faces)for(let i=1;i<f.ids.length-1;i++)for(const index of [f.ids[0],f.ids[i],f.ids[i+1]]){
    const v=BikeSolids.vertices[index];rockPositions.push(...v);rockUV.push(v[0]*.5+.5,v[2]*.5+.5);
  }
  const boulder=new THREE.BufferGeometry(),stone=mat('#8d8172');
  boulder.setAttribute('position',new THREE.Float32BufferAttribute(rockPositions,3));
  boulder.setAttribute('uv',new THREE.Float32BufferAttribute(rockUV,2));boulder.computeVertexNormals();
  stone.map=maps[2];
  const stones=BikeSolids.get(T).rocks;
  const boulders=new THREE.InstancedMesh(boulder,stone,stones.length);
  stones.forEach(({x,y,z,r,yaw},i)=>{
    transform.position.set(x,y,z);
    transform.scale.set(r,r*.86,r*.73);transform.rotation.set(.2,.28,yaw);transform.updateMatrix();
    boulders.setMatrixAt(i,transform.matrix);
  });
  boulders.computeBoundingSphere();world.add(boulders);
  // Continuous distant ridges hide the horizon below the play space.
  function skyline(radius,ground,height,tint){
    const vertices=[],faces=[],segments=46;
    for(let i=0;i<segments;i++){
      const a=i/segments*Math.PI*2;
      const hill=(.38+.38*Math.sin(a*5+radius)+random()*.28)*height;
      const range=radius+Math.cos(a*4)*29;
      const x=Math.sin(a)*range,y=T.finish*.50+Math.cos(a)*range;
      const elevation=T.expedition?T.sample(0,T.clamp(y,0,T.finish)).z+ground:ground;
      vertices.push(x,y,T.valleyZ-600,x,y,elevation+hill);
      const k=i*2,next=(i+1)%segments*2;
      faces.push(k,k+1,next,k+1,next+1,next);
    }
    const mesh=new THREE.BufferGeometry();
    mesh.setAttribute('position',new THREE.Float32BufferAttribute(vertices,3));mesh.setIndex(faces);
    add(mesh,new THREE.MeshBasicMaterial({color:tint,side:THREE.DoubleSide,fog:false}),0,0,0);
  }
  if(!T.landscape){
    skyline(Math.max(620,T.finish*.65+400),50,260,'#91a5ad');
    skyline(Math.max(440,T.finish*.55+300),15,180,'#7f969a');
  }
  const scenery=createMountainScenery(world,T,random,terrainMaterial);
  pineMat.onBeforeCompile=shader=>{
    shader.uniforms.pineTime=scenery.clock;
    shader.vertexShader='uniform float pineTime; varying vec3 vTreeView;\n'+shader.vertexShader.replace('#include <begin_vertex>',
      '#include <begin_vertex>\ntransformed.x+=sin(pineTime*1.2+instanceMatrix[3].x*.13+instanceMatrix[3].y*.09)*max(0.0,position.z)*0.025;\n'+
      'vTreeView=(modelViewMatrix*instanceMatrix*vec4(transformed,1.0)).xyz;');
    shader.fragmentShader='varying vec3 vTreeView;\n'+shader.fragmentShader.replace('#include <clipping_planes_fragment>',
      '#include <clipping_planes_fragment>\nif(length(vTreeView)<2.7)discard;');
  };
  function paintTile(width,height,draw){
    const canvas=document.createElement('canvas');
    canvas.width=width;canvas.height=height;
    draw(canvas.getContext('2d'));
    const texture=new THREE.CanvasTexture(canvas);
    texture.colorSpace=THREE.SRGBColorSpace;
    texture.magFilter=THREE.NearestFilter;
    texture.anisotropy=4;
    return texture;
  }
  const riders=createRiderFactory(world,paintTile),models=new Map();
  const dust=createBikeDust(world,T);
  function modelFor(slot){
    let model=models.get(slot);
    if(!model){model=riders.create(slot,T);model.root.visible=false;models.set(slot,model);}
    return model;
  }
  let local=modelFor(0);
  function setLocalSlot(slot){local.root.visible=false;local=modelFor(slot);}
  const shadow=add(new THREE.CircleGeometry(1,22),new THREE.MeshBasicMaterial({
    color:'#2d382b',transparent:true,opacity:.24,depthWrite:false,side:THREE.DoubleSide
  }),0,0,0);
  shadow.scale.set(.60,1.29,1);

  const eye=new THREE.Vector3(),look=new THREE.Vector3();
  const desiredEye=new THREE.Vector3(),desiredLook=new THREE.Vector3();
  const forward=new THREE.Vector3(),move=new THREE.Vector3();
  const shadowUp=new THREE.Vector3(0,0,1),shadowNormal=new THREE.Vector3();
  const hiddenTree=new THREE.Matrix4().makeScale(0,0,0);
  function clearFoliage(p){
    // Remove whole decorative trees crossing the camera-to-rider sightline.
    // This also works in the wide scout view, without transparent overdraw.
    const dx=p.x-eye.x,dy=p.y-eye.y,dz=p.z+.8-eye.z,length=dx*dx+dy*dy+dz*dz;
    let changed=false;
    for(let i=0;i<trees.length;i++){
      const tree=trees[i],tx=tree.x-eye.x,ty=tree.y-eye.y,tz=tree.z+tree.h*.55-eye.z;
      const t=T.clamp((tx*dx+ty*dy+tz*dz)/Math.max(length,.01),0,1);
      const radius=tree.h*.40;
      const hidden=t<.96&&(tx-dx*t)**2+(ty-dy*t)**2+(tz-dz*t)**2<radius*radius;
      if(hidden===Boolean(tree.hidden))continue;
      tree.hidden=hidden;changed=true;
      trunks.setMatrixAt(i,hidden?hiddenTree:tree.trunkMatrix);
      needles.setMatrixAt(i*2,hidden?hiddenTree:tree.crownMatrix);
      needles.setMatrixAt(i*2+1,hidden?hiddenTree:tree.tipMatrix);
    }
    if(changed){trunks.instanceMatrix.needsUpdate=true;needles.instanceMatrix.needsUpdate=true;}
  }
  function clearBank(cameraEye,p,floor){
    // A bank can cross the sightline even when both ends are above ground.
    // Keep the lower chase view outside it without changing the rider path.
    const anchorZ=Math.max(p.z,floor)+1.1;
    for(let i=2;i<=9;i++){
      const t=i/9;
      const ground=BikeSolids.sample(T,p.x+(cameraEye.x-p.x)*t,p.y+(cameraEye.y-p.y)*t).z;
      const height=ground+(i===9?.85:.30);
      cameraEye.z=Math.max(cameraEye.z,anchorZ+(height-anchorZ)/t);
    }
  }
  let scout=0,lookYaw=0,lookPitch=0,actionBank=0,airLift=0,landingDip=0,cameraFov=58;
  function render(p,dt,snap,inspectionAngle=null,survey=false,mouseLook={yaw:0,pitch:0}){
    // Fog is effectively opaque here; avoid drawing the entire far mountain
    // just because the sky needs a long camera far plane.
    for(const tile of groundTiles){const b=tile.geometry.boundingSphere;tile.visible=Math.hypot(b.center.x-p.x,b.center.y-p.y)<950+b.radius;}
    const blend=snap?1:1-Math.exp(-7*dt);
    lookYaw+=(mouseLook.yaw-lookYaw)*blend;lookPitch+=(mouseLook.pitch-lookPitch)*blend;
    scenery.update(p.time||0);
    local.root.visible=true;
    if(inspectionAngle===null)local.pose({...p,lookYaw},dt,snap);
    else{
      const dx=Math.sin(p.yaw)*.64,dy=Math.cos(p.yaw)*.64;
      const front=T.sample(p.x+dx,p.y+dy).z,rear=T.sample(p.x-dx,p.y-dy).z;
      local.pose({...p,z:(front+rear)/2+.355,pitch:Math.atan2(front-rear,1.28)},dt,snap);
    }
    const bail=local.bailFocus();
    if(bail)p={...p,x:bail.x,y:bail.y,z:bail.z,vx:0,vy:0};
    const support=BikeSolids.sample(T,p.x,p.y,p.z),floor=support.z;
    shadow.position.set(p.x,p.y,floor+.075);
    const slopeX=T.sample(p.x+.5,p.y).z-T.sample(p.x-.5,p.y).z;
    const slopeY=T.sample(p.x,p.y+.5).z-T.sample(p.x,p.y-.5).z;
    if(support.solid)shadowNormal.fromArray(support.normal);
    else shadowNormal.set(-slopeX,-slopeY,1).normalize();
    shadow.quaternion.setFromUnitVectors(shadowUp,shadowNormal);
    shadow.rotateZ(-p.yaw);
    const height=p.z-floor;
    shadow.material.opacity=.25*T.clamp(1-height*.26,0,1);

    forward.set(Math.sin(p.yaw),Math.cos(p.yaw),0);
    move.set(p.vx,p.vy,0);
    if(move.lengthSq()>2)forward.lerp(move.normalize(),.29).normalize();
    const gaze=Math.atan2(forward.x,forward.y)+lookYaw*.72;
    forward.set(Math.sin(gaze),Math.cos(gaze),0);
    const scoutTarget=survey&&inspectionAngle===null?1:0;
    scout+=(scoutTarget-scout)*(snap?1:1-Math.exp(-6*dt));
    const speed=T.clamp(p.speed/19,0,1),distance=5.8+.90*speed+7*scout;
    // Bounded, damped motion follows the bike rather than shaking the screen.
    const action=p.phase==='riding'&&!survey&&inspectionAngle===null?1:0;
    const ease=snap?1:1-Math.exp(-8*dt);
    actionBank+=(T.clamp((p.lean||0)*.055,-.026,.026)*action-actionBank)*ease;
    airLift+=((!p.grounded?.24:0)*action-airLift)*ease;
    landingDip+=(T.clamp((p.impact||0)*.025+(p.compression||0)*.12,0,.13)*action-landingDip)*ease;
    const shoulderOffset=.38+T.clamp(p.turn||0,-1,1)*.10*(1-scout);
    desiredEye.set(p.x-forward.x*distance+forward.y*shoulderOffset,
      p.y-forward.y*distance-forward.x*shoulderOffset,p.z+2.35+speed*.40+airLift-landingDip+9*scout);
    desiredEye.z=Math.max(desiredEye.z,T.sample(desiredEye.x,desiredEye.y).z+.90);
    const lookAhead=1.8+speed*2.8+10*scout;
    const ahead=BikeSolids.sample(T,p.x+forward.x*lookAhead,p.y+forward.y*lookAhead,p.z+.3);
    const lookFloor=ahead.gap?ahead.jump.landing:ahead.z;
    const terrainLook=T.clamp(lookFloor+.35,p.z-(support.solid?1.1:6),p.z+1);
    desiredLook.set(p.x+forward.x*lookAhead,p.y+forward.y*lookAhead,
      (p.z+.30)*.32+terrainLook*.68-1.2*scout+lookPitch*lookAhead);
    // Follow the impending landing gently, preserving a view of the rider.
    if(!p.grounded&&p.phase==='riding'){
      const ahead=BikeSolids.sample(T,p.x+forward.x*lookAhead,p.y+forward.y*lookAhead,p.z+.3);
      if(!ahead.gap)desiredLook.z+=(Math.max(p.z-4,ahead.z+1.3)-desiredLook.z)*.26;
    }
    if(p.phase==='finished'){
      desiredEye.add(new THREE.Vector3(forward.y*2,-forward.x*2,1.8));
      desiredLook.set(p.x,p.y+4,p.z+.8);
    }
    if(inspectionAngle!==null){
      const a=inspectionAngle+p.yaw;
      desiredEye.set(p.x+3.28*Math.sin(a),p.y+3.28*Math.cos(a),p.z+1.39);
      desiredLook.set(p.x,p.y,p.z+.55);
    }
    clearBank(desiredEye,p,floor);
    eye.lerp(desiredEye,snap?1:1-Math.exp(-10*dt));
    look.lerp(desiredLook,snap?1:1-Math.exp(-7.7*dt));
    if(inspectionAngle===null)eye.z=Math.max(eye.z,T.sample(eye.x,eye.y).z+.85);
    clearBank(eye,p,floor);
    clearFoliage(p);
    if(sky)sky.position.copy(eye);
    layer.setCameraX(eye.x*unit);layer.setCameraY(-eye.y*unit);layer.setCameraZ(eye.z*unit,null);
    camera.position.set(eye.x,eye.y,eye.z);
    camera.up.set(0,0,1);
    camera.lookAt(look.x,look.y,look.z);
    if(inspectionAngle===null)camera.rotateZ(-actionBank);
    cameraFov+=((58+speed*3+12*scout)-cameraFov)*(snap?1:1-Math.exp(-4*dt));
    camera.fov=inspectionAngle===null?cameraFov:44;
    camera.aspect=scene.getGame().getGameResolutionWidth()/scene.getGame().getGameResolutionHeight();
    camera.updateProjectionMatrix();camera.updateMatrixWorld();
  }
  function renderOthers(others,dt,localRider,clearDust){
    for(const model of models.values())if(model!==local)model.root.visible=false;
    for(const other of others){
      const model=modelFor(other.slot);
      model.root.visible=true;model.pose(other,dt,clearDust);
    }
    dust.update(localRider,others,dt,clearDust,scene.getGame().getGameResolutionHeight());
  }
  function dispose(){
    const geometries=new Set(),materials=new Set(),textures=new Set(maps);
    world.traverse(object=>{
      if(object.geometry)geometries.add(object.geometry);
      if(object.material){
        const list=Array.isArray(object.material)?object.material:[object.material];
        for(const mat of list){materials.add(mat);if(mat.map)textures.add(mat.map);}
      }
    });
    for(const asset of [...geometries,...materials,...textures])asset.dispose();
    world.removeFromParent();
  }
  return {render,renderOthers,setLocalSlot,dispose};
}
