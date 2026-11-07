/* GDevelop JavaScript event implementation. Uses GDevelop's existing Three scene;
 * it does not create a second renderer, game loop, or external game engine.
 * All collision architecture is isolated in physics.js. Scene boxes are editable
 * native GDevelop 3D objects. Generated sprite candidates are loaded as native resources.
 */
const P=globalThis.CourtyardPhysics, A=globalThis.CourtyardAnimation, S=globalThis.CourtyardShot, L=COURTYARD_LEVEL;
const B=globalThis.CourtyardPuzzle,puzzle=B.create(L.puzzle);
const E=globalThis.CourtyardElevation,elevation=E.create();
const animation=A.create();let firedThisFrame=false,lastTickClock=performance.now(),previousActive=false;
const layer=runtimeScene.getLayer(''),renderer=layer.getRenderer();
const group=renderer.getThreeGroup(),camera=renderer.getThreeCamera();
const boxes=L.boxes.filter(b=>b.solid).map(b=>{const o=runtimeScene.getObjects(b.name)[0];return {...b,x:o.getX(),y:o.getY(),z:o.getZ(),w:o.getWidth(),h:o.getHeight(),d:o.getDepth()};});
const p={...L.spawn,vx:0,vy:0,vz:0,grounded:false,impact:0};
const state={time:0,acc:0,tether:null,arrow:null,draw:0,drawing:false,checkpoint:false,paused:true,started:false,keys:new Set(),jump:false,resetCount:0,frames:[],target:null,valid:false,aim:null,shotCount:0,hitCount:0,returnedCount:0,lastCatch:-10,cpuMs:0};
// Explicit, visible test fixture for isolated browser checks, never the normal URL.
const fixture=new URLSearchParams(location.search).has('debug')?new URLSearchParams(location.search).get('stage'):null;
if(fixture==='tower'){puzzle.solved=true;puzzle.flow=1;puzzle.plate=1;puzzle.y=L.puzzle.endY;elevation.locked=true;elevation.drop=160;elevation.tower=true;state.checkpoint=true;Object.assign(p,{x:1300,y:-820,z:400});}
const timing={activeSeconds:0,stalls:0,longest:0,p95:0};
// Native GDevelop frame limiting keeps a paused preview from competing with
// active play. DOM controls remain immediately responsive between game frames.
runtimeScene.getGame().setMaximumFps(15);
let saved={master:0.65,effects:0.8,music:0.35,mute:false};
try{Object.assign(saved,JSON.parse(localStorage.getItem('courtyard-audio')||'{}'));}catch{}
const controls=new AbortController(),signal=controls.signal;
const world=new THREE.Group();group.add(world);
const own=[];
const imageManager=runtimeScene.getGame().getImageManager();
function surfaceTexture(name){const t=imageManager.getThreeTexture(name).clone();t.wrapS=t.wrapT=THREE.RepeatWrapping;t.generateMipmaps=true;t.minFilter=THREE.LinearMipmapLinearFilter;t.needsUpdate=true;own.push(t);return t;}
const stoneMap=surfaceTexture('stone-tile'),woodMap=surfaceTexture('wood-tile'),brassMap=surfaceTexture('brass-tile');
const stoneSurface=new THREE.MeshBasicMaterial({map:stoneMap,vertexColors:true}),woodSurface=new THREE.MeshBasicMaterial({map:woodMap,vertexColors:true});own.push(stoneSurface,woodSurface);
function material(color){const m=new THREE.MeshBasicMaterial({color});own.push(m);return m;}
function mesh(geometry,mat){own.push(geometry);const m=new THREE.Mesh(geometry,mat);world.add(m);return m;}
const flatFaces=new THREE.MeshBasicMaterial({color:0xffffff,vertexColors:true});own.push(flatFaces);
const foregroundProps=[];
function foregroundFade(object,position,bounds=null){
  const original=Array.isArray(object.material)?object.material:[object.material];
  const materials=original.map(m=>{const copy=m.clone();copy.transparent=true;own.push(copy);return copy;});
  object.material=Array.isArray(object.material)?materials:materials[0];
  foregroundProps.push({object,position,materials,bounds});
}
// Three deliberate face tones: no dynamic lighting or smooth tonal gradients.
for(const b of L.boxes){
  const obj=runtimeScene.getObjects(b.name)[0],m=obj.get3DRendererObject();
  const water=b.name.startsWith('Water'),wood=b.color==='#65513f';
  m.material=water?flatFaces:wood?woodSurface:stoneSurface;
  const tones=water?['#2585a4','#246a86','#234a65']:['#ffffff','#eeebe4','#a0a8ba'];
  const tint=new THREE.Color(b.name==='SluiceCourt'||b.name==='BridgeLanding'?'#c5d2cb':'#ffffff');
  const palette=tones.map(c=>new THREE.Color(c).multiply(tint)),attr=m.geometry.attributes.color;
  for(let i=0;i<attr.count;i++){const face=Math.floor(i/4),color=palette[face===4?0:(face===0||face===3||face===5?2:1)];attr.setXYZ(i,color.r,color.g,color.b);}
  attr.needsUpdate=true;
  if(!water){
    const pos=m.geometry.attributes.position,norm=m.geometry.attributes.normal,uv=m.geometry.attributes.uv;
    for(let i=0;i<pos.count;i++){
      const x=pos.getX(i)*b.w,y=pos.getY(i)*b.h,z=pos.getZ(i)*b.d;
      let u,v;
      if(Math.abs(norm.getZ(i))>0.5){u=x/360;v=y/360;}
      else if(Math.abs(norm.getX(i))>0.5){u=y/(wood?64:360);v=z/(wood?280:360);}
      else{u=x/(wood?64:360);v=z/(wood?280:360);}
      if(wood&&b.w>b.d){u=z/64;v=x/280;}
      uv.setXY(i,u,v);
    }
    uv.needsUpdate=true;
  }
  if(!b.name.startsWith('Water')&&b.d>32){
    const edges=new THREE.EdgesGeometry(m.geometry,35),ink=new THREE.LineBasicMaterial({color:b.color==='#65513f'?'#45362f':'#897969',transparent:true,opacity:0.6});
    const outline=new THREE.LineSegments(edges,ink);m.add(outline);own.push(edges,ink);
  }
  if((b.d<=32&&b.z>150)||['PracticeMast','AnchorMast','AnchorBeam','EastAnchorMast','EastAnchorBeam','WeightFrame','WeightBeam','CarriageRail','RailTower','RailCanopy','AscentBeam','WindRail'].includes(b.name))foregroundFade(m,{x:b.x+b.w/2,y:b.y+b.h/2,z:b.z+b.d/2},b);
}
const targetDefinitions=[...L.anchors,B.anchor(puzzle,L.puzzle),E.weight(elevation),E.carriage(elevation)];
const anchorMats=targetDefinitions.map(()=>material('#bc9148'));
for(const mat of anchorMats){mat.map=brassMap;mat.color.set('#ffffff');}
const anchors=targetDefinitions.map((a,i)=>{
  const ring=mesh(new THREE.TorusGeometry(a.kind==='block'?16:22,5,6,24),anchorMats[i]);ring.position.set(a.x,a.y,a.z);
  const center=mesh(new THREE.SphereGeometry(a.kind==='block'?8:13,12,8),material(a.kind==='block'?'#8bb2a5':'#f0d394'));center.position.copy(ring.position);
  foregroundFade(ring,a);foregroundFade(center,a);
  const pick=new THREE.Mesh(new THREE.SphereGeometry(42,10,8),new THREE.MeshBasicMaterial({visible:false}));
  own.push(pick.geometry,pick.material);world.add(pick);pick.position.copy(ring.position);pick.userData.anchor=a;
  return {...a,ring,center,pick};
});
// Engine resource manager owns these textures. Six transparent pixels below the feet
// are compensated in placement, keeping the cutout grounded without tilting it.
const spriteHeight=128,spriteFootOffset=12;
const directionNames=['back','back-right','right','idle','front','front-left','left','back-left'];
// Visual attachment offsets measured against the directional waist reels.
// Physics keeps its central attachment so turning cannot inject tether energy.
const reelOffsets=[18,16,-5,-15,-18,12,6,-12];
const visualReel=new THREE.Vector3();
const directionMaps=directionNames.map(name=>imageManager.getThreeTexture('motion-idle-'+name));
function atlasTexture(name,cols,rows){const t=imageManager.getThreeTexture(name).clone();t.repeat.set(1/cols,1/rows);t.generateMipmaps=false;t.minFilter=THREE.LinearFilter;t.magFilter=THREE.LinearFilter;t.needsUpdate=true;own.push(t);return t;}
const actionMaps=directionNames.map(n=>atlasTexture('motion-'+n+(['front','back'].includes(n)?'-v3':''),4,4));
const reelMaps=directionNames.map(n=>atlasTexture('motion-reel-'+n+(n==='front-left'?'-v2':''),2,1));
let facingX=0,facingY=-1,directionIndex=0;
const sprite=mesh(new THREE.PlaneGeometry(spriteHeight,spriteHeight),new THREE.MeshBasicMaterial({map:directionMaps[0],transparent:true,alphaTest:0.25,side:THREE.DoubleSide,depthWrite:true}));own.push(sprite.material);
const shrubs=[];
for(const [x,y,z,w] of [[145,1020,0,115],[145,1310,0,100],[277,292,100,135],[815,310,100,140],[824,520,100,110],[630,470,142,90]]){
  const h=w*216/384,mat=new THREE.MeshBasicMaterial({map:imageManager.getThreeTexture('courtyard-shrub'),transparent:true,alphaTest:0.25,side:THREE.DoubleSide,depthWrite:true});own.push(mat);
  const shrub=mesh(new THREE.PlaneGeometry(w,h,4,5),mat);shrub.position.set(x,y,z+h/2-h*6/216);shrubs.push(shrub);
}
for(const [x,y,z,w] of [[1110,860,100,100],[1550,860,100,110],[1550,280,100,85],[1125,-115,220,125],[1510,-130,220,120],[965,980,20,65],[875,1190,0,80]]){
  const h=w*216/384,mat=new THREE.MeshBasicMaterial({map:imageManager.getThreeTexture('courtyard-shrub'),transparent:true,alphaTest:0.25,side:THREE.DoubleSide,depthWrite:true});own.push(mat);
  const plant=mesh(new THREE.PlaneGeometry(w,h,4,5),mat);plant.position.set(x,y,z+h/2-h*6/216);shrubs.push(plant);
}
const shadow=mesh(new THREE.CircleGeometry(23,24),new THREE.MeshBasicMaterial({color:'#1f3845',transparent:true,opacity:0.20,depthWrite:false,side:THREE.DoubleSide}));own.push(shadow.material);
const checkpoint=mesh(new THREE.RingGeometry(27,31,32),new THREE.MeshBasicMaterial({color:'#ae995d',side:THREE.DoubleSide}));own.push(checkpoint.material);checkpoint.position.set(L.checkpoint.x,L.checkpoint.y,101);
runtimeScene.getObjects('TreeTrunk')[0].hide(); // retain its simple solid collision volume
const treeMat=new THREE.MeshBasicMaterial({map:imageManager.getThreeTexture('courtyard-tree'),transparent:true,alphaTest:0.25,side:THREE.DoubleSide,depthWrite:true});own.push(treeMat);
const tree=mesh(new THREE.PlaneGeometry(280,262.5,6,8),treeMat);tree.position.set(697,415,142+131.25-262.5*6/480);shrubs.push(tree);
treeMat.color.set('#929575');
// Wind bends the generated cutouts above rooted feet; it never rotates their
// vertical billboard axes toward the camera. Shared phases make gusts coherent.
for(const [x,y,z,w] of [[1160,-610,220,95],[1530,-900,400,95],[630,-920,460,110],[960,-1000,460,85],[755,-350,460,65],[630,485,460,85],[940,470,460,100]]){
 const h=w*216/384,mat=treeMat.clone();mat.map=imageManager.getThreeTexture('courtyard-shrub');mat.color.set('#ffffff');own.push(mat);
 const plant=mesh(new THREE.PlaneGeometry(w,h,4,5),mat);plant.position.set(x,y,z+h/2-h*6/216);shrubs.push(plant);
}
for(const plant of shrubs)plant.userData.rest=plant.geometry.attributes.position.array.slice();
// Batch the cloud bank into one opaque, vertex-colored draw instead of 88
// separately submitted meshes. No lighting or post processing is required.
const cloudPositions=[],cloudColors=[];
for(let i=0;i<22;i++){
 const theta=i*2.39996,cx=850+Math.cos(theta)*(2100+i*37),cy=-200+Math.sin(theta)*(2100+i*37),cz=-80+(i%5)*170;
 for(let j=0;j<4;j++){
  const g=new THREE.SphereGeometry(100+j%2*25,8,5).toNonIndexed(),a=g.attributes.position,c=new THREE.Color(['#eff1df','#dce7df','#b3cdd7'][j%3]);
  for(let k=0;k<a.count;k++){cloudPositions.push(cx+a.getX(k)*2.1+(j-1.5)*130,cy+a.getY(k),cz+a.getZ(k)*0.55+(j%2)*24);cloudColors.push(c.r,c.g,c.b);}g.dispose();
 }
}
const cloudGeo=new THREE.BufferGeometry();cloudGeo.setAttribute('position',new THREE.Float32BufferAttribute(cloudPositions,3));cloudGeo.setAttribute('color',new THREE.Float32BufferAttribute(cloudColors,3));
const cloudBank=mesh(cloudGeo,flatFaces);
// Y3K grass: curved instanced tufts and shared GPU wind.
const courtyardGrass=globalThis.createCourtyardGrass(THREE,world,own,L.grass);

// Broad seams and a few solid trims dress existing geometry without changing routes.
const seamPoints=[];
for(const b of L.boxes.filter(b=>b.name==='Arrival'||b.name==='Landing')){
  const z=b.z+b.d+0.3;
  for(let y=b.y+110;y<b.y+b.h;y+=110)seamPoints.push(b.x,y,z,b.x+b.w,y,z);
  for(let row=0,y=b.y;y<b.y+b.h;y+=110,row++)for(let x=b.x+100+(row%2)*100;x<b.x+b.w;x+=200)seamPoints.push(x,y,z,x,Math.min(y+110,b.y+b.h),z);
}
const seamGeometry=new THREE.BufferGeometry();seamGeometry.setAttribute('position',new THREE.Float32BufferAttribute(seamPoints,3));
const seamMaterial=new THREE.LineBasicMaterial({color:'#b69b78',transparent:true,opacity:0.45});world.add(new THREE.LineSegments(seamGeometry,seamMaterial));own.push(seamGeometry,seamMaterial);
seamMaterial.visible=false; // paving seams now come from the generated stone UV texture
const stoneTones=['#8b8d9b','#dcc7a6','#dcc7a6','#8b8d9b','#f4e1c1','#8b8d9b'].map(material);
const brassTones=['#8a6939','#b38b45','#b38b45','#795a36','#ddbb73','#795a36'].map(material);
for(const m of brassTones){m.map=brassMap;m.color.set('#ffffff');}
function trim(x,y,z,w,h,d,mats){const t=mesh(new THREE.BoxGeometry(w,h,d),mats);t.position.set(x+w/2,y+h/2,z+d/2);return t;}
for(const name of ['RearWall','LandingWestWall','ArrivalWestWall','TreePlanter']){
  const b=L.boxes.find(b=>b.name===name);
  const cap={name:name+'Cap',x:b.x-3,y:b.y-3,z:b.z+b.d,w:b.w+6,h:b.h+6,d:8,solid:true};
  trim(cap.x,cap.y,cap.z,cap.w,cap.h,cap.d,stoneTones);boxes.push(cap);
}
// Narrow props still block the player/arrows and occlude sprites normally.
// They must not collapse the camera arm: the hidden tree collision proxy and
// slim masts can sit immediately behind the avatar without enclosing the view.
const cameraBoxes=boxes.filter(b=>!(b.d<=32&&b.z>150)&&!b.name.startsWith('HighColumn')&&!['WeightFrame','TreeTrunk','PracticeMast','AnchorMast','AnchorBeam','EastAnchorMast','EastAnchorBeam'].includes(b.name));
for(const [x,y,z,w,h,d] of [[197,217,100,44,42,148],[880,217,100,40,42,148],[63,875,-10,42,42,110]]){trim(x,y,z,w,h,d,stoneTones);trim(x-3,y-3,z+d,w+6,h+6,10,stoneTones);}
for(const [x,y,z,w,h,d] of [[488,747,433,31,28,27],[786,747,420,30,28,40],[268,1158,266,24,24,14],[272,1170,291,16,28,10]]){
  const mount=trim(x,y,z,w,h,d,brassTones);foregroundFade(mount,{x:x+w/2,y:y+h/2,z:z+d/2});
} // ring stands forward of the post so reeling cannot snag its own mount
const rippleMat=material('#4ca8bb');
for(const [x,y,w] of [[150,755,58],[360,817,42],[568,748,65],[730,830,55]]){const r=mesh(new THREE.PlaneGeometry(w,3),rippleMat);r.position.set(x,y,-22.6);}
// Waterworks: broad lane guides, a matching plate mark, and an actual elevated
// aqueduct deliver water downhill into the tree bed. All streams are cheap boxes.
const laneMat=material('#a28b60'),plateMat=material('#bc9555'),waterMat=material('#318eaa');
for(const x of [1236,1320])trim(x,260,101,4,455,3,[laneMat,laneMat,laneMat,laneMat,laneMat,laneMat]);
const plateMark=mesh(new THREE.RingGeometry(28,34,24),plateMat);plateMark.position.set(1280,660,106);
const blockMark=mesh(new THREE.RingGeometry(20,24,24),plateMat);blockMark.position.set(1280,300,163);
// Visible brass signal line connects the plate to the sluice along the deck.
trim(1150,674,101,76,4,2,[laneMat,laneMat,laneMat,laneMat,laneMat,laneMat]);
trim(1150,265,101,4,413,2,[laneMat,laneMat,laneMat,laneMat,laneMat,laneMat]);
const streams=[];
for(const [x,y,z,w,h,d] of [[1174,248,150,37,57,33],[695,299,149,505,25,4],[694,323,142,28,35,9],[690,350,142,40,70,3]]){
  const m=trim(x,y,z,w,h,d,[waterMat,waterMat,waterMat,waterMat,waterMat,waterMat]);m.visible=false;streams.push(m);
}
const wheel=new THREE.Group();world.add(wheel);wheel.position.set(1350,235,175);wheel.rotation.x=Math.PI/2;
const wheelRim=new THREE.TorusGeometry(48,5,6,20);own.push(wheelRim);wheel.add(new THREE.Mesh(wheelRim,material('#795939')));
for(let i=0;i<8;i++){const g=new THREE.BoxGeometry(7,90,7);own.push(g);const spoke=new THREE.Mesh(g,material('#795939'));spoke.rotation.z=i*Math.PI/4;wheel.add(spoke);}
const waterGlints=[];
for(let i=0;i<14;i++){const m=mesh(new THREE.PlaneGeometry(15,2),rippleMat);m.visible=false;waterGlints.push(m);}
const blockBox=boxes.find(b=>b.name===L.puzzle.block),blockObject=runtimeScene.getObjects(L.puzzle.block)[0];
const blockAnchor=anchors.find(a=>a.kind==='block'),plateObject=runtimeScene.getObjects(L.puzzle.plate)[0];
const pressureMat=plateObject.get3DRendererObject().material.clone();own.push(pressureMat);plateObject.get3DRendererObject().material=pressureMat;
const gateObject=runtimeScene.getObjects(L.puzzle.gate)[0],returnGateObject=runtimeScene.getObjects(L.puzzle.returnGate)[0];
const returnGateBox=boxes.find(b=>b.name===L.puzzle.returnGate);
function syncPuzzle(visual=true){
  blockBox.y=puzzle.y-37;returnGateBox.z=20+puzzle.flow*150;
  Object.assign(blockAnchor,B.anchor(puzzle,L.puzzle));if(!visual)return;
  blockObject.setY(blockBox.y);blockMark.position.y=puzzle.y;
  for(const o of [blockAnchor.ring,blockAnchor.center,blockAnchor.pick])o.position.set(blockAnchor.x,blockAnchor.y,blockAnchor.z);
  plateObject.setZ(100-puzzle.plate*3);plateMark.position.z=106-puzzle.plate*3;
  gateObject.setZ(173+puzzle.flow*62);returnGateBox.z=20+puzzle.flow*150;returnGateObject.setZ(returnGateBox.z);
  plateMat.color.set(puzzle.solved?'#8bbd87':'#bc9555');
  pressureMat.color.set(puzzle.solved?'#bdd6a6':'#ffffff');laneMat.color.set(puzzle.solved?'#6b986b':'#a28b60');
  for(let i=0;i<streams.length;i++)streams[i].visible=puzzle.flow>(i+0.15)/streams.length;
  treeMat.color.setRGB(0.573+0.427*puzzle.flow,0.584+0.416*puzzle.flow,0.459+0.541*puzzle.flow);
  wheel.rotation.z=state.time*(puzzle.flow>0.5?0.45:0);
  for(let i=0;i<waterGlints.length;i++){const m=waterGlints[i];m.visible=puzzle.flow>0.5;m.position.set(1190-((state.time*65+i*38)%490),311,153.3);}
}
syncPuzzle();
const bridgeBox=boxes.find(b=>b.name==='CounterBridge'),bridgeObject=runtimeScene.getObjects('CounterBridge')[0];
const weightObject=runtimeScene.getObjects('HangingWeight')[0];
const weightAnchor=anchors.find(a=>a.kind==='weight'),movingAnchor=anchors.find(a=>a.kind==='moving');
const cableMat=material('#665e4d'),cables=[];
for(const [x,y] of [[1490,-155],[1280,-470],[1440,-470]]){const cable=mesh(new THREE.CylinderGeometry(2,2,1,6),cableMat);cable.rotation.x=Math.PI/2;cables.push({mesh:cable,x,y});}
const highStream=trim(696,415,145,10,16,315,[waterMat,waterMat,waterMat,waterMat,waterMat,waterMat]);highStream.visible=false;
const seal=mesh(new THREE.RingGeometry(32,38,32),material('#bc9555'));seal.position.set(785,450,465);
function syncElevation(visual=true){
 bridgeBox.z=E.bridgeTop(elevation)-24;
 Object.assign(weightAnchor,E.weight(elevation));Object.assign(movingAnchor,E.carriage(elevation));
 if(!visual)return;bridgeObject.setZ(bridgeBox.z);
 weightObject.setZ(425-elevation.drop);
 for(const [a,data] of [[weightAnchor,E.weight(elevation)],[movingAnchor,E.carriage(elevation)]]){
  Object.assign(a,data);for(const obj of [a.ring,a.center,a.pick])obj.position.set(a.x,a.y,a.z);
 }
 const ends=[495-elevation.drop,E.bridgeTop(elevation),E.bridgeTop(elevation)];
 cables.forEach((c,i)=>{const top=i?560:560;c.mesh.position.set(c.x,c.y,(top+ends[i])/2);c.mesh.scale.y=top-ends[i];});
 seal.material.color.set(elevation.complete?'#8bbd87':'#bc9555');highStream.visible=elevation.complete;
}
syncElevation();
const rigPoints=[new THREE.Vector3(1280,-470,560),new THREE.Vector3(1280,-155,560),new THREE.Vector3(1490,-155,560),new THREE.Vector3(1440,-155,560),new THREE.Vector3(1440,-470,560)];
const rigGeo=new THREE.BufferGeometry().setFromPoints(rigPoints),rigMat=new THREE.LineBasicMaterial({color:'#665e4d'});own.push(rigGeo,rigMat);world.add(new THREE.Line(rigGeo,rigMat));
const trackPoints=[];for(let i=0;i<=80;i++){const a=i/80*Math.PI*2;trackPoints.push(new THREE.Vector3(1130+230*Math.cos(a),-790-75*Math.sin(a),765));}
const trackGeometry=new THREE.BufferGeometry().setFromPoints(trackPoints);own.push(trackGeometry);const trackMat=new THREE.LineBasicMaterial({color:'#b39155'});own.push(trackMat);world.add(new THREE.Line(trackGeometry,trackMat));
const operatingMark=mesh(new THREE.RingGeometry(24,27,32),material('#b39155'));operatingMark.position.set(1360,-100,221);
const paddleObject=runtimeScene.getObjects('WindPaddle')[0];
const paddleCord=mesh(new THREE.CylinderGeometry(2,2,115,6),cableMat);paddleCord.rotation.x=Math.PI/2;
const restMark=mesh(new THREE.RingGeometry(25,29,24),material('#b39155'));restMark.position.set(790,-350,461);
const launchMark=mesh(new THREE.RingGeometry(26,30,24),material('#b39155'));launchMark.position.set(1500,-540,221);const pullMark=mesh(new THREE.RingGeometry(24,28,24),material('#b39155'));pullMark.position.set(1280,840,101);
const chainView=globalThis.createCourtyardChainView(THREE,world,own,boxes);
const raycaster=new THREE.Raycaster(),mouse=new THREE.Vector2(0,0),projected=new THREE.Vector3();
const root=document.createElement('div');root.id='courtyard-ui';
root.innerHTML=`<style>
#courtyard-ui{position:fixed;inset:0;pointer-events:none;color:#eff1dd;font:14px/1.45 system-ui,sans-serif;z-index:10}#courtyard-ui *{box-sizing:border-box}#courtyard-ui .top{position:absolute;top:24px;left:28px;right:28px;display:flex;justify-content:space-between;align-items:flex-start;gap:20px}.brand{background:#203f3a;box-shadow:0 3px 0 #b4a572;padding:15px 20px;border-radius:3px}.eyebrow{letter-spacing:.2em;font-size:10px;text-transform:uppercase;color:#d4bc7a}.brand h1{font-family:Georgia,serif;font-weight:400;font-size:27px;margin:2px 0}.brand p{margin:0;font-size:12px;color:#ccd3c1}.pill{background:#203f3aed;padding:10px 16px;border:1px solid #68796c;border-radius:3px}.bottom{position:absolute;bottom:22px;left:50%;transform:translateX(-50%);text-align:center;width:min(660px,92vw)}.hint{padding:12px 22px;background:#203f3af2;border-radius:3px;border-top:2px solid #b6a16c}.hint strong{display:block;font-weight:500;font-size:15px}.hint small{color:#c6cfbd}.controls{color:#304d46;background:#e7ebdded;font-size:11px;margin-top:8px;padding:7px 12px;border-radius:3px}.panel{pointer-events:auto;position:absolute;inset:0;background:#17362c70;display:flex;align-items:center;justify-content:center;backdrop-filter:blur(2px)}.card{width:min(460px,90vw);background:#f0eddd;color:#28463e;padding:34px;border:1px solid #9baf96;border-radius:5px;box-shadow:0 16px 80px #16362e40}.card h2{font:36px/1.12 Georgia,serif;margin:8px 0 18px}.card p{font-size:13px;color:#5e6d5e}.card button{cursor:pointer;background:#2a6554;border:0;color:#fff8dc;padding:12px 24px;font:inherit;border-radius:3px}.card label{display:flex;align-items:center;justify-content:space-between;font-size:12px;margin:10px 0}.card input[type=range]{width:52%;accent-color:#2a6554}.keys{font-size:12px;display:grid;grid-template-columns:1fr 1fr;gap:5px 16px;margin:15px 0 20px}.keys b{color:#28463e}.reticle{position:absolute;width:34px;height:34px;border:2px solid #c9a75b;border-radius:50%;transform:translate(-50%,-50%);display:none}.reticle.bad{border-color:#b84a39}.reticle:after{content:'';position:absolute;width:4px;height:4px;background:currentColor;top:13px;left:13px}.drawbar{height:3px;background:#a8915e;width:0;max-width:100%;margin-top:7px}.toast{position:absolute;top:138px;left:50%;transform:translateX(-50%);padding:10px 18px;background:#eff0de;color:#305649;opacity:0;transition:opacity .15s;border-radius:3px}.pausebtn{pointer-events:auto;background:#203f3a;color:#eee9cf;border:1px solid #688273;padding:10px 16px;cursor:pointer}.hidden{display:none!important}@media(max-width:700px){#courtyard-ui .top{top:10px;left:10px;right:10px}.brand{padding:9px 12px}.brand h1{font-size:20px}.pill{display:none}.bottom{bottom:8px}.controls{font-size:10px}}
</style><div class="top"><div class="brand"><div class="eyebrow">KEEP IT ALIVE</div><h1>The Last Courtyard</h1><p>Restore the water. Bring the garden home.</p></div><button class="pausebtn">Pause · Esc</button></div><div class="toast"></div><div class="reticle"></div><div class="bottom"><div class="hint"><strong></strong><small></small><div class="drawbar"></div></div><div class="controls">WASD move · Space jump · Hold / release left mouse to shoot · E reel · Q pay out · Right mouse detach · R recover</div></div><div class="panel"><div class="card"><div class="eyebrow" style="color:#7d7448">A BOW & CHAIN ADVENTURE</div><h2>One small garden.<br>One more chance.</h2><p class="intro">Learn to move and swing across the old watercourse. This first playable increment uses a temporary character and tree; the garden restoration puzzles are still to come.</p><div class="keys"><span><b>WASD</b> move</span><span><b>Space</b> jump</span><span><b>Left mouse</b> draw / fire</span><span><b>Right mouse</b> detach</span><span><b>E / Q</b> reel in / pay out</span><span><b>R</b> checkpoint reset</span><span><b>Esc</b> pause / resume</span><span><b>C</b> compare camera</span></div><label>Master<input data-volume="master" type="range" min="0" max="1" step="0.01"></label><label>Effects<input data-volume="effects" type="range" min="0" max="1" step="0.01"></label><label>Music<input data-volume="music" type="range" min="0" max="1" step="0.01"></label><label>Mute<input class="mute" type="checkbox"></label><button class="start">Enter the courtyard</button><p style="margin-bottom:0;font-size:11px">Movement & tether study · temporary artwork</p></div></div>`;
root.querySelector('.intro').textContent='Restore the lower waterworks, raise the counterweight bridge, then ride the moving anchor to the high canopy walk. Bring both water routes back to the tree.';
root.querySelector('.card p:last-child').textContent='R recovers safely. Restored water stays restored.';
root.querySelector('.start').insertAdjacentHTML('afterend','<button class="restart" style="margin:10px 0 0 8px;background:#596b5d">Restart courtyard</button>');
root.querySelector('style').textContent += '.card{max-height:calc(100vh - 32px);overflow-y:auto}.reticle{pointer-events:none}';
root.querySelector('style').textContent += '@media(min-width:900px){#courtyard-ui .bottom{left:20px;bottom:18px;transform:none;width:325px;text-align:left}.hint{padding:10px 14px}.controls{line-height:1.7}}';
// Preserve the player's feet and landing area on short/narrow desktop windows.
root.querySelector('style').textContent += '@media(max-width:899px){.bottom{bottom:8px}.hint{padding:6px 12px}.hint strong{font-size:13px}.hint small{font-size:11px}.controls{font-size:10px;line-height:1.3;padding:5px 8px;margin-top:4px}.drawbar{margin-top:3px}.brand p{display:none}.brand{padding:9px 12px}.brand h1{font-size:21px}}';
document.body.appendChild(root);
const diagnostics=document.createElement('output');diagnostics.id='courtyard-diagnostics';diagnostics.style.cssText='position:absolute;right:25px;top:78px;white-space:pre;background:#17382be8;padding:12px;color:#edf0dc;font:12px monospace;display:none';root.appendChild(diagnostics);
let diagnosticVisible=new URLSearchParams(location.search).has('debug');
const $=s=>root.querySelector(s),panel=$('.panel'),title=$('.hint strong'),detail=$('.hint small'),reticle=$('.reticle');
let audio=null,lastReel=0,lastMusic=0,lastWater=-2,lastCreak=0,toastUntil=0,perspective=true,noiseBuffer=null,lastHud=-1,lastDiagnostic=-1,lastMechanism=-1,restorationNotified=false;
const voices=new Set();
const musicResource=runtimeScene.getGame().getGameData().resources.resources.find(r=>r.name==='courtyard-flute');
const flute=document.createElement('audio');flute.src=musicResource.file;flute.loop=true;flute.preload='auto';flute.dataset.role='courtyard-music';flute.style.display='none';root.appendChild(flute);
let musicFailed=false;
function musicVolume(){flute.volume=saved.mute?0:saved.master*saved.music*0.65;}
function musicPlay(){musicVolume();flute.play().then(()=>{musicFailed=false;}).catch(()=>{musicFailed=true;});}

function stopVoices(){for(const o of voices){try{o.stop();}catch{}}voices.clear();}
// Short layered synthesized voices: string snap, filtered air, soft metal partials.
// No persistent loops: every voice has a scheduled stop and belongs to stopVoices().
function sound(kind,strength=1){
  if(!audio||saved.mute||state.paused)return;
  const now=audio.currentTime,volume=saved.master*(kind==='music'?saved.music:saved.effects)*P.clamp(strength,0,1.5);
  if(volume<=0)return;
  function tone(freq,end,dur,level,type='sine'){
    const o=audio.createOscillator(),g=audio.createGain();o.type=type;o.frequency.setValueAtTime(freq,now);o.frequency.exponentialRampToValueAtTime(Math.max(30,end),now+dur);
    g.gain.setValueAtTime(0.0001,now);g.gain.exponentialRampToValueAtTime(Math.max(0.0001,level*volume),now+0.004);g.gain.exponentialRampToValueAtTime(0.0001,now+dur);
    o.connect(g);g.connect(audio.destination);voices.add(o);o.start(now);o.stop(now+dur+0.01);o.onended=()=>{voices.delete(o);o.disconnect();g.disconnect();};
  }
  function noise(freq,dur,level,attack=0){
    if(!noiseBuffer){noiseBuffer=audio.createBuffer(1,audio.sampleRate/2,audio.sampleRate);const d=noiseBuffer.getChannelData(0);let seed=173;for(let i=0;i<d.length;i++){seed=(seed*16807)%2147483647;d[i]=seed/1073741824-1;}}
    const o=audio.createBufferSource(),f=audio.createBiquadFilter(),g=audio.createGain();o.buffer=noiseBuffer;o.loop=dur>noiseBuffer.duration;f.type='bandpass';f.frequency.value=freq;f.Q.value=0.8;
    g.gain.setValueAtTime(attack?0.0001:Math.max(0.0001,level*volume),now);
    if(attack)g.gain.exponentialRampToValueAtTime(Math.max(0.0001,level*volume),now+attack);
    g.gain.exponentialRampToValueAtTime(0.0001,now+dur);o.connect(f);f.connect(g);g.connect(audio.destination);voices.add(o);o.start(now);o.stop(now+dur);o.onended=()=>{voices.delete(o);o.disconnect();f.disconnect();g.disconnect();};
  }
  if(kind==='fire'){tone(260,65,0.11,0.1,'triangle');noise(2600,0.15,0.15);tone(650,220,0.05,0.035);}
  else if(kind==='hit'){tone(880,860,0.22,0.075);tone(1493,1470,0.12,0.03);tone(2381,2350,0.065,0.015);noise(3200,0.025,0.08);}
  else if(kind==='draw'){tone(110+Math.min(state.draw,0.6)*110,95,0.11,0.03,'triangle');noise(550,0.07,0.045);}
  else if(kind==='reel'){noise(1850,0.035,0.075);tone(510,350,0.03,0.028);}
  else if(kind==='tension'){tone(125,93,0.13,0.06,'triangle');tone(690,610,0.08,0.018);}
  else if(kind==='miss'){noise(850,0.07,0.11);tone(210,75,0.08,0.05,'triangle');}
  else if(kind==='release'||kind==='stow'){tone(620,290,0.06,0.05);noise(2100,0.04,0.06);}
  else if(kind==='step'){noise(620,0.045,0.14);tone(135,70,0.04,0.035);}
  else if(kind==='land'){noise(480,0.12,0.18);tone(110,48,0.13,0.065);}
  else if(kind==='block'){noise(270,0.13,0.055);tone(82,65,0.12,0.018,'triangle');}
  else if(kind==='plate'){tone(470,190,0.12,0.065,'triangle');noise(1200,0.05,0.075);}
  else if(kind==='sluice'){noise(380,0.2,0.045);tone(110,80,0.16,0.02,'triangle');}
  else if(kind==='splash'){noise(900,0.25,0.16);tone(130,60,0.16,0.035);}
  else if(kind==='water'){noise(700+Math.sin(state.time*0.3)*100,1.6,0.04,0.3);}
  else if(kind==='checkpoint'){tone(660,660,0.4,0.065);tone(990,990,0.55,0.025);}
  else if(kind==='music'){const n=[196,294,330,246.94][Math.floor(state.time/8)%4];tone(n,n,1.6,0.05);}
}
function toast(text){$('.toast').textContent=text;toastUntil=state.time+2.5;}
function detach(reason){
  if(state.tether){
    const t=state.tether;state.arrow={pos:{x:t.anchor.x,y:t.anchor.y,z:t.anchor.z},dir:t.shotDir||{x:0,y:0,z:1},phase:'return',hold:0};
    state.tether=null;sound('release');if(reason)toast(reason);
  }else if(state.arrow)S.retract(state.arrow);
  state.drawing=false;state.draw=0;
}
function recover(){stopVoices();chainView.clear();A.reset(animation);firedThisFrame=false;B.reset(puzzle,L.puzzle);syncPuzzle();const spawn=E.checkpoint(elevation)||(puzzle.solved?L.puzzle.checkpoint:state.checkpoint?L.checkpoint:L.spawn);Object.assign(p,spawn,{vx:0,vy:0,vz:0,grounded:false,coyote:0,jumpBuffer:0});state.tether=null;state.arrow=null;state.drawing=false;state.draw=0;state.acc=0;state.jump=false;state.resetCount++;state.keys.clear();facingX=0;facingY=-1;toast(puzzle.solved?'Water restored. Progress kept.':'Back on solid ground');}
function pause(on){
  stopVoices();
  // Both the entry button and Escape are user gestures. Either can start play
  // and unlock audio; Escape must not silently bypass sound initialization.
  if(!on){if(!audio){const AC=window.AudioContext||window.webkitAudioContext;if(AC)audio=new AC();}state.started=true;}
  state.paused=on;state.keys.clear();state.drawing=false;state.draw=0;state.jump=false;state.acc=0;
  runtimeScene.getGame().setMaximumFps(on?15:60);
  panel.classList.toggle('hidden',!on);$('.start').textContent=state.started?'Return to the courtyard':'Enter the courtyard';
  if(audio){if(on)audio.suspend();else audio.resume();}
  if(on)flute.pause();else musicPlay();
}
$('.start').addEventListener('click',()=>pause(false),{signal});
$('.restart').addEventListener('click',()=>location.reload(),{signal});
$('.pausebtn').addEventListener('click',()=>pause(true),{signal});
for(const el of root.querySelectorAll('[data-volume]')){el.value=saved[el.dataset.volume];el.addEventListener('input',()=>{saved[el.dataset.volume]=Number(el.value);musicVolume();try{localStorage.setItem('courtyard-audio',JSON.stringify(saved));}catch{}},{signal});}
$('.mute').checked=saved.mute;$('.mute').addEventListener('change',e=>{saved.mute=e.target.checked;musicVolume();if(saved.mute)stopVoices();try{localStorage.setItem('courtyard-audio',JSON.stringify(saved));}catch{}},{signal});
window.addEventListener('keydown',e=>{
  if(e.ctrlKey||e.metaKey||e.altKey)return; // Preserve browser shortcuts such as Ctrl+R.
  if(e.code==='Escape'&&!e.repeat){pause(!state.paused);return;}
  if(e.code==='F3'&&!e.repeat){e.preventDefault();diagnosticVisible=!diagnosticVisible;return;}
  if(state.paused)return;
  if(['Space','KeyW','KeyA','KeyS','KeyD','KeyE','KeyQ','KeyR','KeyC'].includes(e.code))e.preventDefault();
  state.keys.add(e.code);if(e.code==='Space'&&!e.repeat)state.jump=true;
  if(e.code==='KeyR'&&!e.repeat)recover();
  if(e.code==='KeyC'&&!e.repeat){perspective=!perspective;toast(perspective?'Perspective comparison':'Orthographic view');}
},{signal});
window.addEventListener('keyup',e=>state.keys.delete(e.code),{signal});
window.addEventListener('blur',()=>{if(state.started)pause(true);},{signal});
document.addEventListener('visibilitychange',()=>{if(document.hidden&&state.started)pause(true);},{signal});
window.addEventListener('contextmenu',e=>{if(e.target.tagName==='CANVAS')e.preventDefault();},{signal});
window.addEventListener('pointermove',e=>{const c=document.querySelector('canvas'),r=c?.getBoundingClientRect();if(r){mouse.set((e.clientX-r.left)/r.width*2-1,-(e.clientY-r.top)/r.height*2+1);}},{signal});
window.addEventListener('pointerdown',e=>{
  if(state.paused||e.target.tagName!=='CANVAS')return;
  if(e.button===2){detach();return;}
  if(e.button===0){detach();state.arrow=null;state.drawing=true;state.draw=0;state.drawTarget=null;targetUnderMouse();state.drawTarget=state.valid?state.target:null;sound('draw');}
},{signal});
window.addEventListener('pointerup',e=>{
  if(e.button!==0||!state.drawing||state.paused)return;
  targetUnderMouse();const charge=P.clamp(state.draw/0.6,0,1),from=muzzlePoint(),to=state.aim;
  state.drawing=false;state.draw=0;firedThisFrame=true;sound('fire',0.7+charge*0.3);
  const lead=state.valid&&state.target?.kind==='moving'?P.distance(from,to)/(1000+650*charge):0;
  const aim=lead?{x:to.x+state.target.vx*lead,y:to.y+state.target.vy*lead,z:to.z}:to;
  state.arrow=S.create(from,aim,state.valid?state.target:null,charge);state.shotCount++;state.drawTarget=null;

},{signal});
// Diagnostic perspective camera reuses the same engine-owned scene, renderer and layer.
const alternate=new THREE.PerspectiveCamera(50,1,0.1,100);
const follow={x:p.x+40,y:p.y+620,z:p.z+340,target:{x:p.x,y:p.y-230,z:p.z+135},zoom:0.66};
let cameraResetCount=state.resetCount;
function viewConfig(){return perspective?follow:L.camera;}
function activeCamera(){return perspective?alternate:camera;}
function setView(){
  const dt=Math.min(1/30,runtimeScene.getElapsedTime()/1000),snap=cameraResetCount!==state.resetCount;
  const blend=snap?1:1-Math.exp(-7*dt);cameraResetCount=state.resetCount;
  const desired={x:p.x+40,y:p.y+620,z:p.z+340};
  for(const k of ['x','y','z'])follow[k]+=(desired[k]-follow[k])*blend;
  const ahead={x:p.x+P.clamp(p.vx*0.18,-45,45),y:p.y-170+P.clamp(p.vy*0.45,-60,110),z:p.z+115};
  for(const k of ['x','y','z'])follow.target[k]+=(ahead[k]-follow.target[k])*blend;
  // Shorten the camera arm if a wall lies between camera and player; never clip into it.
  const eye={x:p.x,y:p.y,z:p.z+70};let obstruction=1;
  for(const b of cameraBoxes){
    if(b.z+b.d<=eye.z)continue; // Do not let padding turn a low curb into a camera wall.
    const hit=P.segmentHit(eye,follow,b,10);if(hit!==null&&hit>0.01)obstruction=Math.min(obstruction,Math.max(0.15,hit-0.03));
  }
  const cfg=perspective?{...follow,x:eye.x+(follow.x-eye.x)*obstruction,y:eye.y+(follow.y-eye.y)*obstruction,z:eye.z+(follow.z-eye.z)*obstruction}:L.camera;
  layer.setCameraX(cfg.x);layer.setCameraY(cfg.y);layer.setCameraZ(cfg.z,null);layer.setCameraZoom(cfg.zoom);
  gdjs.scene3d.camera.turnCameraTowardPosition(runtimeScene,cfg.target.x,cfg.target.y,cfg.target.z,'',0,false);
  camera.updateMatrixWorld();
  // The comparison changes the renderer's active camera only; restore it before layer setters.
  alternate.position.copy(camera.position);alternate.up.set(0,0,1);alternate.lookAt(cfg.target.x/100,-cfg.target.y/100,cfg.target.z/100);
  alternate.aspect=runtimeScene.getGame().getGameResolutionWidth()/runtimeScene.getGame().getGameResolutionHeight();
  // Keep the close 50-degree desktop view; widen only when a narrow window
  // would crop the lateral swing space. Upright sprites remain vertical.
  alternate.fov=Math.min(78,2*Math.atan(Math.tan(25*Math.PI/180)*Math.max(1,1.15/alternate.aspect))*180/Math.PI);
  alternate.updateProjectionMatrix();alternate.updateMatrixWorld();
}
// Keep the comparison out of internal renderer state: native camera projection matrix swap.
function updateCamera(){setView();if(perspective){camera.projectionMatrix.copy(alternate.projectionMatrix);camera.projectionMatrixInverse.copy(alternate.projectionMatrixInverse);}}
function screenPoint(a){const c=document.querySelector('canvas'),r=c.getBoundingClientRect();projected.set(a.x/100,-a.y/100,a.z/100).project(activeCamera());return{x:r.left+(projected.x+1)*r.width/2,y:r.top+(1-projected.y)*r.height/2};}
function muzzlePoint(){
  const n=Math.hypot(facingX,facingY)||1;
  return {x:p.x+facingX/n*20,y:p.y+facingY/n*20,z:p.z+54};
}
function targetUnderMouse(){
  for(const a of anchors)a.pick.updateWorldMatrix(true,false);raycaster.setFromCamera(mouse,activeCamera());
  const hits=raycaster.intersectObjects(anchors.map(a=>a.pick),false);
  let target=hits.length?anchors.find(a=>a.id===hits[0].object.userData.anchor.id):null;
  if(!target){let nearest=0.06;for(const a of anchors){projected.set(a.x/100,-a.y/100,a.z/100).project(activeCamera());if(projected.z< -1||projected.z>1)continue;const d=Math.hypot(projected.x-mouse.x,(projected.y-mouse.y)*0.7);if(d<nearest){nearest=d;target=a;}}}
  if(state.drawing&&state.drawTarget)target=state.drawTarget;
  const origin=raycaster.ray.origin,far=raycaster.ray.at(25,new THREE.Vector3());
  const from={x:origin.x*100,y:-origin.y*100,z:origin.z*100},to={x:far.x*100,y:-far.y*100,z:far.z*100};
  let t=1;for(const b of boxes){const hit=P.segmentHit(from,to,b);if(hit!==null)t=Math.min(t,hit);}
  state.aim=target?{x:target.x,y:target.y,z:target.z}:{x:from.x+(to.x-from.x)*t,y:from.y+(to.y-from.y)*t,z:from.z+(to.z-from.z)*t};
  state.target=target;
  if(state.drawing){facingX=state.aim.x-p.x;facingY=state.aim.y-p.y;}
  state.valid=!!target&&P.distance(P.reelPoint(p),target)<=S.RANGE&&!P.blocked(muzzlePoint(),target,boxes)&&!P.blocked(P.reelPoint(p),target,boxes);
  for(const a of anchors)a.ring.material.color.set(a===target?(state.valid?'#fff1c4':'#c36a5a'):'#ffffff');
  reticle.style.display=state.paused?'none':'block';
  const canvas=document.querySelector('canvas').getBoundingClientRect(),q=target?screenPoint(target):{x:canvas.left+(mouse.x+1)*canvas.width/2,y:canvas.top+(1-mouse.y)*canvas.height/2};
  reticle.style.left=q.x+'px';reticle.style.top=q.y+'px';reticle.classList.toggle('bad',!!target&&!state.valid);
  reticle.style.opacity=target?'1':state.drawing?'0.65':'0.28';
  reticle.style.transform='translate(-50%,-50%) scale('+(state.drawing?1.25-P.clamp(state.draw/0.6,0,1)*0.4:1)+')';
}
function setText(el,value){if(el.textContent!==value)el.textContent=value;}
function render(){
  syncPuzzle();syncElevation();
  const paddle=E.obstacle(elevation);paddleObject.setX(paddle.x);paddleCord.position.set(paddle.x+35,-143,612.5);
  updateCamera();const cam=viewConfig(),angle=Math.atan2(-(cam.x-p.x),cam.y-p.y);
  // Close third-person framing: near-camera hardware must not fill the screen
  // when walking behind it. Fade only these props; collision and picking stay real.
  const eye=activeCamera().position;
  for(const prop of foregroundProps){
    const q=prop.position,d=Math.hypot(q.x-eye.x*100,q.y+eye.y*100,q.z-eye.z*100);
    let opacity=prop.bounds&&(prop.bounds.w>150||prop.bounds.h>150)?1:0.12+0.88*P.clamp((d-130)/170,0,1);
    if(prop.bounds&&P.segmentHit({x:eye.x*100,y:-eye.y*100,z:eye.z*100},{x:p.x,y:p.y,z:p.z+55},prop.bounds,15)!==null)opacity=Math.min(opacity,0.08);
    for(const m of prop.materials){m.opacity=opacity;m.depthWrite=opacity>0.98;}
    for(const child of prop.object.children)if(child.isLineSegments)child.visible=opacity>0.5;
  }
  const fx=cam.target.x-cam.x,fy=cam.target.y-cam.y,n=Math.hypot(fx,fy),right=-fy/n*facingX+fx/n*facingY,forward=fx/n*facingX+fy/n*facingY;
  const index=(Math.round(Math.atan2(right,forward)/(Math.PI/4))+8)%8;
  directionIndex=index;
  const pose=animation.pose;let map;
  if(pose.kind==='idle')map=directionMaps[index];
  else if(pose.kind==='reel'){map=reelMaps[index];map.offset.set(pose.frame/2,0);}
  else{map=actionMaps[index];map.offset.set((pose.frame%4)/4,1-(Math.floor(pose.frame/4)+1)/4);}
  sprite.material.map=map;
  sprite.rotation.set(Math.PI/2,0,angle,'ZYX');sprite.position.set(p.x,p.y,p.z+spriteHeight/2-spriteFootOffset);
  for(const shrub of shrubs){
 shrub.rotation.set(Math.PI/2,0,Math.atan2(-(cam.x-shrub.position.x),cam.y-shrub.position.y),'ZYX');
 const attr=shrub.geometry.attributes.position,rest=shrub.userData.rest,h=shrub.geometry.parameters.height;
 const gust=Math.sin(state.time*1.15+shrub.position.x*0.006)+0.3*Math.sin(state.time*2.3+shrub.position.y*0.01);
 for(let i=0;i<attr.count;i++){const t=(rest[i*3+1]+h/2)/h;attr.setX(i,rest[i*3]+gust*(shrub===tree?3.8:2.8)*t*t);}
 attr.needsUpdate=true;
}
cloudBank.position.x=Math.sin(state.time*0.025)*45;
courtyardGrass.update(state.time);
  let floor=-120;for(const b of boxes)if(p.x>b.x&&p.x<b.x+b.w&&p.y>b.y&&p.y<b.y+b.h&&b.z+b.d<=p.z+2)floor=Math.max(floor,b.z+b.d);
  shadow.position.set(p.x,p.y,floor+0.5);shadow.scale.setScalar(P.clamp(1-(p.z-floor)/600,0.4,1));
  for(const a of anchors)a.ring.rotation.set(Math.PI/2,0,Math.atan2(cam.x-a.x,-(cam.y-a.y)),'ZYX');
  const reelX=pose.kind==='swing'?reelOffsets[index]*0.75:reelOffsets[index];
  // This upright plane's local -Z faces the camera. Keep the chain outlet just
  // in front of the illustrated reel; world geometry still depth-tests normally.
  visualReel.set(reelX,-24,-3).applyQuaternion(sprite.quaternion).add(sprite.position);
  chainView.render(state,p,visualReel,muzzlePoint(),state.aim,cam,state.time);
  const bar=$('.drawbar');
  bar.style.width=(state.tether?(state.tether.length-90)/530*100:Math.min(1,state.draw/0.6)*100)+'%';
  bar.style.background=state.tether?.taut?'#e1c583':'#a8915e';
  $('.toast').style.opacity=state.time<toastUntil?'1':'0';
  if(state.time-lastHud<0.08&&!state.paused)return;lastHud=state.time;
  if(state.drawing){setText(title,state.draw>=0.6?'Ready. Release to fire.':'Draw the bow.');setText(detail,state.valid?'Clear anchor · longer draw gives a faster shot.':state.target?'The shot is obstructed or out of reach.':'Aim at a brass ring. Missed arrows wind back in.');}
  else if(state.arrow){setText(title,state.arrow.phase==='out'?'Chain paying out.':'Winding the arrow home.');setText(detail,'Right mouse cancels · You can draw another shot immediately.');}
  else if(state.tether?.anchor.kind==='weight'){setText(title,puzzle.flow<1?'The waterwheel has no power.':elevation.locked?'Bridge locked in place.':'Lower the weight. Raise the bridge.');setText(detail,puzzle.flow<1?'Restore the water with the block below first.':(state.tether.length<=90.5&&!elevation.locked?'Fully reeled: step sideways away from the weight to keep tension, then E.':'Hold E from the upper garden. The ratchet keeps your progress; release when the bridge is level.'));}
  else if(state.tether?.anchor.kind==='moving'){setText(title,'Ride the waterwheel carriage.');setText(detail,'Reel up with E. Ride west toward the high landing, then release. R returns to your latest terrace.');}
  else if(state.tether?.anchor.kind==='block'){setText(title,puzzle.solved?'The sluice is secured.':'Pull the sluice block.');setText(detail,puzzle.solved?'Water is on its way to the tree. Right mouse releases the chain.':state.tether.length<=90.5?'Step backward toward the brass standing mark, then keep holding E. The chain needs room to pull.':'Stand on the brass mark beyond the plate and hold E. The guide keeps the heavy block on course.');}
  else if(state.tether?.anchor.id==='ascent'){setText(title,'Climb on the chain.');setText(detail,'Hold E and move north. Release above the upper terrace; your momentum carries you onto it.');}
  else if(state.tether){setText(title,state.tether.length<=90.5?'Fully reeled in.':state.tether.length>=619.5?'Chain at full reach.':state.tether.taut?'Feel the chain take your weight.':'Attached. Move toward the watercourse.');setText(detail,'E shortens the chain · Q gives you room · Right mouse releases your momentum');}
  else if(state.target){setText(title,state.valid?'Hold, draw, release.':P.distance(P.reelPoint(p),state.target)>620?'Move closer to this anchor.':'Stone blocks the shot.');setText(detail,state.target.label+' · A gold reticle means a clear shot.');}
  else if(elevation.complete){setText(title,'The sky garden is alive.');setText(detail,'Two water routes feed the tree. Explore the walkways above and below it.');}
  else if(elevation.canopy){setText(title,elevation.wind&&p.y<-80?'The wind walk.':'Follow the high walk back to the tree.');setText(detail,elevation.wind&&p.y<-80?'Wait for the wooden paddle to sweep aside, or use the high ring to swing over it.':'Head south to the overlook. Stand on the brass seal to open the sky cistern.');}
  else if(elevation.tower){setText(title,'A path across the sky.');setText(detail,'Catch the moving ring. Reel upward, ride west, and release above the broad landing.');}
  else if(elevation.locked){setText(title,'The bridge is ready.');setText(detail,'Cross the bridge. From the brass mark, catch the high tower ring, reel up, then release above the ledge.');}
  else if(puzzle.solved){setText(title,'Water powers the upper mechanism.');setText(detail,'Climb the garden stairs. Pull the hanging counterweight to raise the bridge across the ravine.');}
  else if(p.x>1050){setText(title,'The sluice needs a keeper.');setText(detail,'Catch the ring on the wooden block. Pull it along the guide onto the matching brass plate.');}
  else if(state.checkpoint){setText(title,'Find the dry aqueduct.');setText(detail,'Follow the east gallery to the waterworks. The raised garden and lower path reconnect here.');}
  else{setText(title,'Reach the raised terrace across the water.');setText(detail,'Try the nearby anchor first. Aim at the suspended brass rings.');}
}
function tick(){
  const cpuStart=performance.now();
  const rawElapsed=Math.max(0,(cpuStart-lastTickClock)/1000);lastTickClock=cpuStart;
  // GDevelop caps elapsed time at its minimum FPS. Use a monotonic wall clock
  // for stall protection and measurements so that cap cannot hide slow frames.
  const elapsed=rawElapsed>0.15?rawElapsed:runtimeScene.getElapsedTime()/1000;
  if(!state.paused&&previousActive&&rawElapsed>0){
    state.frames.push(rawElapsed);if(state.frames.length>300)state.frames.shift();
    timing.longest=Math.max(timing.longest,rawElapsed);
    if(rawElapsed>0.15)timing.stalls++;else timing.activeSeconds+=rawElapsed;
  }
  previousActive=!state.paused;
  if(!state.paused){
    // Drop stalled time, not held intent. A single slow frame must not require
    // releasing and repressing movement/reel. Key-up and blur still clear input;
    // jump pulses are discarded so a delayed frame cannot launch the player.
    if(elapsed>0.15){state.acc=0;state.jump=false;firedThisFrame=false;}
    else{
      state.acc+=Math.min(elapsed,1/15);state.time+=Math.min(elapsed,1/15);
      if(state.drawing){const before=state.draw;state.draw+=elapsed;if(before<0.6&&state.draw>=0.6)sound('stow',0.2);}
      targetUnderMouse();
      if(state.drawing&&state.time-lastCreak>0.16){sound('draw',0.12+Math.min(1,state.draw/0.6)*0.18);lastCreak=state.time;}
      const cfg=viewConfig(),dx=perspective?-40:cfg.target.x-cfg.x,dy=perspective?-850:cfg.target.y-cfg.y,n=Math.hypot(dx,dy),fx=dx/n,fy=dy/n;
      const k=state.keys,f=(k.has('KeyW')?1:0)-(k.has('KeyS')?1:0),r=(k.has('KeyD')?1:0)-(k.has('KeyA')?1:0);
      if((f||r)&&!state.drawing&&animation.fire<=0){facingX=fx*f-fy*r;facingY=fy*f+fx*r;}
      if(state.drawing&&state.aim){facingX=state.aim.x-p.x;facingY=state.aim.y-p.y;}
      let walked=0,landed=false;
      let steps=0;while(state.acc>=P.STEP&&steps++<8){
        if(state.arrow){
          const shot=state.arrow,event=S.step(shot,P.STEP,P.reelPoint(p),boxes,anchors);
          if(event?.type==='anchor'){
            const a=event.anchor;
            if(P.distance(P.reelPoint(p),a)<=S.RANGE&&!P.blocked(P.reelPoint(p),a,boxes)){
              state.tether={anchor:a,length:Math.max(90,P.distance(P.reelPoint(p),a)),taut:false,motor:0,shotDir:{...shot.dir}};
              state.arrow=null;state.hitCount++;state.lastCatch=state.time;chainView.impact(a,state.time,true);sound('hit');
            }else{S.retract(shot);sound('miss',0.4);}
          }else if(event?.type==='wall'){chainView.impact(shot.pos,state.time,false);sound('miss',0.45);}
          else if(event?.type==='returned'){state.arrow=null;state.returnedCount++;sound('stow',0.4);}
        }
        const oldX=p.x,oldY=p.y,wasGrounded=p.grounded;
        const pullingBlock=['block','weight'].includes(state.tether?.anchor.kind);
        const mechanism=B.step(puzzle,L.puzzle,p,state.tether,{reel:k.has('KeyE')},P.STEP);
        syncPuzzle(false);
        const bridgeWas=E.bridgeTop(elevation),ridingBridge=p.grounded&&Math.abs(p.z-bridgeWas)<1&&p.x>bridgeBox.x-P.R&&p.x<bridgeBox.x+bridgeBox.w+P.R&&p.y>bridgeBox.y-P.R&&p.y<bridgeBox.y+bridgeBox.h+P.R;
        const locked=E.step(elevation,p,state.tether,{reel:k.has('KeyE')},puzzle.flow>=1,P.STEP);
        syncElevation(false);
        if(ridingBridge)p.z+=E.bridgeTop(elevation)-bridgeWas;
        if(locked){sound('plate');toast('Bridge locked. Climb the waterwheel tower.');}
        const result=P.step(p,{x:fx*f-fy*r,y:fy*f+fx*r,jump:state.jump,reel:!pullingBlock&&k.has('KeyE'),payout:k.has('KeyQ')},boxes,state.tether);
        if(mechanism.completed){state.checkpoint=true;sound('plate');toast('Sluice secured. Water is returning.');}
        state.jump=false;state.acc-=P.STEP;
        if(wasGrounded&&p.grounded)walked+=Math.hypot(p.x-oldX,p.y-oldY);
        if(result.reason)detach('Chain released: the path is blocked');
        const wet=L.boxes.some(water=>water.name.startsWith('Water')&&!water.name.endsWith('Bed')&&P.inWater(p,water));
        if(result.invalid||wet||P.outside(p,L.bounds)){recover();sound('splash');break;}
        if(elevation.canopy&&P.overlaps(p,E.obstacle(elevation))){recover();sound('land',0.3);toast('A soft bump. Wait for the paddle, or swing over it.');break;}
        if(result.landed&&result.impact>100){landed=true;sound('land',Math.min(1,result.impact/500));}
      }
      if(state.acc>P.STEP*8)state.acc=0;
      if(!state.checkpoint&&p.y<620&&p.z>=98&&p.grounded){state.checkpoint=true;checkpoint.material.color.set('#c9df91');toast('Checkpoint reached');sound('checkpoint');}
      if(p.grounded&&p.z>=398&&p.x>1100&&p.y<-730&&!elevation.tower){elevation.tower=true;toast('Tower checkpoint. Ride the moving ring west.');sound('checkpoint');}
      if(p.grounded&&p.z>=458&&p.x<1020&&p.y<-650&&!elevation.canopy){elevation.canopy=true;toast('Canopy checkpoint. Follow the high walk back to the tree.');sound('checkpoint');}
      if(elevation.canopy&&!elevation.wind&&p.grounded&&p.z===460&&p.y>-430&&p.y<-270){elevation.wind=true;toast('Wind walk checkpoint. Watch the paddle or take the high ring.');sound('checkpoint');}
      if(elevation.canopy&&p.grounded&&p.z>=458&&p.x>730&&p.x<840&&p.y>400&&p.y<500&&!elevation.complete){elevation.complete=true;sound('checkpoint');toast('The sky cistern is flowing. Keep it alive.');}
      const pose=A.update(animation,{grounded:p.grounded,vz:p.vz,distance:walked,drawing:state.drawing,draw:state.draw,fired:firedThisFrame,landed,attached:!!state.tether,reeling:(!!state.tether&&(k.has('KeyE')||k.has('KeyQ')))||state.arrow?.phase==='return'},elapsed);
      firedThisFrame=false;if(pose.step)sound('step',0.35);
      const blockSlack=state.tether?.anchor.kind==='block'&&state.tether.length-P.distance(P.reelPoint(p),state.tether.anchor)>1;
      const motor=state.tether?.anchor.kind==='block'?Math.max(puzzle.speed,blockSlack&&k.has('KeyE')&&!puzzle.solved?135:0):state.tether?Math.abs(state.tether.lengthRate||0):state.arrow?180:0;
      if(state.time-lastMechanism>0.16&&(elevation.moved>0||puzzle.speed>2||(puzzle.solved&&puzzle.flow<1))){sound(puzzle.speed>2?'block':'sluice',0.6);lastMechanism=state.time;}
      if(puzzle.flow>=1&&!restorationNotified){restorationNotified=true;sound('checkpoint');sound('music',0.6);toast('Keep it alive. The tree has water again.');}
      if(motor>8&&state.time-lastReel>Math.max(0.055,10/motor)){sound('reel',state.arrow?0.15:0.22+0.12*(state.tether.load||0));lastReel=state.time;}
      if(state.tether?.taut&&state.time-state.lastCatch>0.65&&(state.tether.load||0)>0.45){sound('tension',0.22);state.lastCatch=state.time;}
      // The single licensed flute track replaces the old repeated test tones.
      // Overlapping finite voices create a quiet bed; at most two water voices
      // coexist. They use the effects volume and stop with all other sounds.
      if(state.time-lastWater>1.1){sound('water',P.clamp(1-Math.hypot(p.x-485,p.y-800)/1000,0.15,0.6));lastWater=state.time;}
    }
  }
  render();
  state.cpuMs+=(performance.now()-cpuStart-state.cpuMs)*0.08;
  if(state.time-lastDiagnostic<0.2&&!state.paused)return;lastDiagnostic=state.time;
  if(diagnosticVisible&&state.frames.length){const sorted=state.frames.slice().sort((a,b)=>a-b);timing.p95=sorted[Math.floor((sorted.length-1)*0.95)]*1000;}
  diagnostics.style.display=diagnosticVisible?'block':'none';
  diagnostics.textContent=`${fixture?'TEST FIXTURE: '+fixture+' (seeded prerequisites)\n':''}GDevelop 5.6.287 | ${perspective?'perspective':'orthographic'}\n${state.paused?'PAUSED':'RUNNING'} | ${state.frames.length?(state.frames.length/state.frames.reduce((a,b)=>a+b,0)).toFixed(1):'—'} fps (last 300 active frames)\nPosition ${p.x.toFixed(1)}, ${p.y.toFixed(1)}, ${p.z.toFixed(1)}\nVelocity ${p.vx.toFixed(1)}, ${p.vy.toFixed(1)}, ${p.vz.toFixed(1)}\nUpdate ${state.cpuMs.toFixed(2)} ms | grounded ${p.grounded} | checkpoint ${state.checkpoint}\nTether ${state.tether?state.tether.anchor.id+' '+state.tether.length.toFixed(1)+(state.tether.taut?' taut':' slack'):'none'}\nArrows ${state.arrow?1:0} | chains ${state.tether?1:0} | resets ${state.resetCount}\nAudio ${audio?audio.state:'locked'} | ${saved.mute?'muted':'enabled'} | voices ${voices.size}\nLinks ${chainView.count} | shot ${state.arrow?.phase||'none'}\nShots ${state.shotCount} | catches ${state.hitCount} | returned ${state.returnedCount}\nSprite ${directionNames[directionIndex]} | ${animation.pose.kind} ${animation.pose.frame}\nF3 diagnostics | C compare projection`;
  diagnostics.textContent+=`\nActive ${timing.activeSeconds.toFixed(1)}s | stalls ${timing.stalls} | p95 ${timing.p95.toFixed(1)} ms | max ${(timing.longest*1000).toFixed(0)} ms`;
  diagnostics.textContent+=`\nDocument ${document.visibilityState} | focus ${document.hasFocus()?'yes':'no'} | frame cap ${state.paused?15:60}`;
  diagnostics.textContent+=`\nFlute ${musicFailed?'unavailable':flute.paused?'paused':'playing'} | ${flute.currentTime.toFixed(1)}s`;
  diagnostics.textContent+=`\nBridge ${Math.round(elevation.drop/160*100)}% | ${elevation.locked?'locked':'waiting'} | tower ${elevation.tower} | canopy ${elevation.canopy} | complete ${elevation.complete}`;
  const gpu=runtimeScene.getGame().getRenderer().getThreeRenderer()?.info.render;
  diagnostics.textContent+=`\nDraw calls ${gpu?.calls??'—'} | triangles ${gpu?.triangles??'—'} | wind checkpoint ${elevation.wind}`;
  diagnostics.textContent+=`\nSluice block ${puzzle.y.toFixed(1)} | plate ${puzzle.solved?'latched':'waiting'} | water ${Math.round(puzzle.flow*100)}%`;
}
function dispose(){flute.pause();flute.removeAttribute('src');flute.load();controls.abort();runtimeScene.getGame().setMaximumFps(60);root.remove();group.remove(world);for(const resource of own)resource.dispose?.();audio?.close();}
runtimeScene.__courtyard={tick,dispose,state,player:p,boxes,anchors,recover};
// Developer inspection only; gameplay never depends on this handle.
globalThis.__courtyard=runtimeScene.__courtyard;
if(!gdjs.__courtyardCleanup){gdjs.__courtyardCleanup=true;gdjs.registerRuntimeSceneUnloadedCallback(scene=>scene.__courtyard?.dispose());}
render();
