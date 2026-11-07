const fs=require('fs'),path=require('path');
const base=path.resolve(__dirname,'..');
(async()=>{
  const gd=await require('../.tooling/gdcore/libGD.js')();
  gd.ProjectHelper.initializePlatforms();
  const ext=require('../.tooling/gdevelop-5.6.287/resources/GDJS/Runtime-sources/Extensions/3D/JsExtension.js').createExtension(s=>s,gd);
  gd.JsPlatform.get().addNewExtension(ext);
  const project=gd.ProjectHelper.createNewGDJSProject();
  project.setName('The Last Courtyard — Keep it Alive');
  project.setDescription('Keep it Alive: restore the courtyard tree through a bow-and-chain sluice puzzle. Explore a real 3D courtyard, upper garden and lower maintenance route with illustrated directional sprites.');
  project.setGameResolutionSize(1280,800); project.setFirstLayout('Courtyard');
  project.setMaximumFPS(60); project.setMinimumFPS(15); project.setPackageName('com.courtyard.keepitalive');
  project.setLastCompilationDirectory(path.join(base,'build'));
  const level=JSON.parse(fs.readFileSync(path.join(base,'src/level.json'),'utf8'));
  const layout=project.insertNewLayout('Courtyard',0);
  const serialize=o=>{const e=new gd.SerializerElement();o.serializeTo(e);const d=JSON.parse(gd.Serializer.toJSON(e));e.delete();return d;};
  for(const b of level.boxes){
    const obj=layout.getObjects().insertNewObject(project,'Scene3D::Cube3DObject',b.name,layout.getObjects().getObjectsCount());
    const inst=layout.getInitialInstances().insertNewInitialInstance();
    inst.setObjectName(b.name);inst.setX(b.x);inst.setY(b.y);inst.setZ(b.z);
    inst.setHasCustomSize(true);inst.setCustomWidth(b.w);inst.setCustomHeight(b.h);inst.setHasCustomDepth(true);inst.setCustomDepth(b.d);
  }
  const scripts=['physics.js','animation.js','shot.js','puzzle.js','elevation.js','journey.js','chain-view.js','grass-view.js','runtime.js'].map(f=>fs.readFileSync(path.join(base,'src',f),'utf8'));
  const ev=layout.getEvents().insertNewEvent(project,'BuiltinCommonInstructions::JsCode',0);
  gd.asJsCodeEvent(ev).setInlineCode('if (!runtimeScene.__courtyard) {\n'+scripts[0]+'\nconst COURTYARD_LEVEL='+JSON.stringify(level)+';\n'+scripts.slice(1).join('\n')+'\n}\nruntimeScene.__courtyard.tick();');
  const data=serialize(project),scene=data.layouts[0];
  data.resources.resources.push({kind:'image',name:'flat-white',file:'assets/runtime/flat-white.png',smoothed:true,userAdded:true});
  data.resources.resources.push({kind:'audio',name:'courtyard-flute',file:'assets/runtime/courtyard-flute.mp3',userAdded:true});
  const artNames=fs.readdirSync(path.join(base,'assets/runtime')).filter(f=>f.endsWith('.png')&&f!=='flat-white.png'&&f!=='grass-tile.png').map(f=>f.slice(0,-4));
  for(const name of artNames)data.resources.resources.push({kind:'image',name,file:'assets/runtime/'+name+'.png',smoothed:true,userAdded:true});
  // Native sprite definitions make these JS-consumed images discoverable to the
  // exporter and scene preloader. They are also available for editing in GDevelop.
  for(const resource of artNames)scene.objects.push({name:'Art_'+resource.replace(/-/g,'_'),type:'Sprite',variables:[],behaviors:[],effects:[],updateIfNotVisible:false,animations:[{name:'Idle',useMultipleDirections:false,directions:[{looping:true,timeBetweenFrames:0.1,sprites:[{image:resource,originPoint:{name:'origin',x:0,y:0},centerPoint:{name:'center',automatic:true,x:0,y:0},points:[],hasCustomCollisionMask:false,customCollisionMask:[]}]}]}]});
  scene.r=125;scene.v=178;scene.b=201;
  scene.layers[0].renderingType='3d';scene.layers[0].cameraType='orthographic';
  scene.layers[0].camera3DFarPlaneDistance=10000;scene.layers[0].camera3DNearPlaneDistance=10;
  for(const o of scene.objects){const b=level.boxes.find(b=>b.name===o.name);if(!b)continue;Object.assign(o.content,{width:b.w,height:b.h,depth:b.d,materialType:'Basic',tint:b.color,isCastingShadow:false,isReceivingShadow:false});for(const f of ['front','back','left','right','top','bottom'])o.content[f+'FaceResourceName']='flat-white';}
  data.properties.loadingScreen.showGDevelopSplash=false;
  data.properties.loadingScreen.backgroundColor=0x233c3c;
  data.properties.loadingScreen.minDuration=0.1;
  data.properties.watermark.showWatermark=false;
  fs.writeFileSync(path.join(base,'courtyard.json'),JSON.stringify(data,null,2));
  console.log('Wrote editable GDevelop courtyard.json with '+level.boxes.length+' native 3D terrain objects and '+artNames.length+' sprite resource definitions.');
})();
