/* Lightweight authored scenery. Terrain remains the shared collision surface.
 * Cliffs/waterfall are beyond the playable boundary; huts are beyond arrival.
 * Repeated grass uses opaque instancing, not thousands of transparent planes. */
function createMountainScenery(world,T,random,terrainMaterial){
  const clock={value:0},meshes=[];
  const material=color=>new THREE.MeshStandardMaterial({color,roughness:1,flatShading:true});
  const stone=material('#66717a'),darkStone=material('#465559');
  const wood=material('#6b4835'),roof=material('#36555b'),wall=material('#b7a382');
  const lamp=new THREE.MeshBasicMaterial({color:'#ffda87'});
  function mesh(geometry,mat,x,y,z,sx=1,sy=1,sz=1){
    const m=new THREE.Mesh(geometry,mat);m.position.set(x,y,z);m.scale.set(sx,sy,sz);world.add(m);return m;
  }
  const box=new THREE.BoxGeometry(1,1,1),rock=new THREE.DodecahedronGeometry(1,0);
  // Continue the valley behind the refuge so arrival never looks like the
  // square edge of a floating heightfield. The run ends before this backdrop.
  const apron=new THREE.BufferGeometry(),ap=[],ac=[],aw=[],ai=[],columns=42,rows=24;
  const meadow=new THREE.Color('#678051');
  for(let j=0;j<=rows;j++)for(let i=0;i<=columns;i++){
    const x=T.landscape?-1500+3000*i/columns:T.bounds.left-80+(T.bounds.right-T.bounds.left+160)*i/columns;
    const d=j/rows,y=T.bounds.bottom+d*(T.landscape?1600:260);
    const edge=T.landscape?Math.max(0,Math.abs(x)-1150)/450:Math.max(0,Math.abs(x)-140)/70;
    const z=T.sample(x,T.bounds.bottom).z+Math.sin(Math.PI*d)*(13+11*Math.sin(x*.027))
      -Math.pow(d,4)*145-Math.pow(edge,3)*100*d;
    ap.push(x,y,z);ac.push(meadow.r,meadow.g,meadow.b);aw.push(1,0,0);
    if(i<columns&&j<rows){const a=j*(columns+1)+i,b=a+columns+1;ai.push(a,a+1,b,b,a+1,b+1);}
  }
  apron.setAttribute('position',new THREE.Float32BufferAttribute(ap,3));
  apron.setAttribute('color',new THREE.Float32BufferAttribute(ac,3));
  apron.setAttribute('surfaceMix',new THREE.Float32BufferAttribute(aw,3));
  apron.setIndex(ai);apron.computeVertexNormals();mesh(apron,terrainMaterial,0,0,0);
  // Continue the sheer outer faces below the playable edge. These steep
  // background flanks give the long mountain volume instead of a floating
  // ribbon silhouette; all navigable terrain remains inside the shared bounds.
  if(T.expedition)for(const side of [-1,1]){
    const vertices=[],colors=[],weights=[],faces=[],distances=[0,7,20,50,100,180,300,460,650];
    const drops=[0,16,31,53,93,150,225,310,390],rows=Math.ceil((T.bounds.bottom-T.bounds.top)/18);
    const tint=new THREE.Color('#72756a'),stride=distances.length;
    for(let row=0;row<=rows;row++)for(let col=0;col<stride;col++){
      const y=T.bounds.top+(T.bounds.bottom-T.bounds.top)*row/rows;
      const edge=T.landscape?T.spine(y)+(side<0?-1060:1060):side<0?T.bounds.left:T.bounds.right;
      const x=edge+side*distances[col],z=T.sample(edge,y).z-drops[col]+
        Math.sin(y*.024+col*.7)*Math.min(18,distances[col]*.08);
      vertices.push(x,y,z);colors.push(tint.r,tint.g,tint.b);weights.push(.12,0,.88);
      if(row<rows&&col<stride-1){const a=row*stride+col,b=a+stride;
        if(side>0)faces.push(a,a+1,b,b,a+1,b+1);else faces.push(a,b,a+1,b,b+1,a+1);}
    }
    const skirt=new THREE.BufferGeometry();skirt.setAttribute('position',new THREE.Float32BufferAttribute(vertices,3));
    skirt.setAttribute('color',new THREE.Float32BufferAttribute(colors,3));skirt.setAttribute('surfaceMix',new THREE.Float32BufferAttribute(weights,3));
    skirt.setIndex(faces);skirt.computeVertexNormals();mesh(skirt,terrainMaterial,0,0,0);
  }
  // Several rows of real slopes form the distant range. The old two flat
  // skyline curtains made the mountain look like a narrow lane in a box.
  if(T.landscape)for(let ring=0;ring<2;ring++){
    const vertices=[],colors=[],faces=[],segments=144,bands=[.72,.82,.90,.96,1,1.04,1.12,1.25,1.42];
    const radiusX=1800+ring*800,radiusY=2600+ring*650;
    const baseTint=new THREE.Color(ring?'#a6b3c1':'#7d8e9f'),peakTint=new THREE.Color(ring?'#d2d6dd':'#c3c6c5');
    for(let band=0;band<bands.length;band++)for(let i=0;i<=segments;i++){
      const a=i/segments*Math.PI*2;
      const ridge=1+.065*Math.sin(a*7+ring)+.035*Math.sin(a*13);
      const x=Math.sin(a)*radiusX*bands[band]*ridge,y=T.finish*.50+Math.cos(a)*radiusY*bands[band]*ridge;
      const height=(480+ring*180)*(1+.34*Math.sin(a*5+ring)+.22*Math.cos(a*11)+.14*Math.sin(a*19+.7))*
        [0,.24,.55,.78,1,.72,.42,.16,0][band];
      const ground=T.sample(0,T.clamp(y,0,T.finish)).z-160;
      vertices.push(x,y,ground+height);
      const tint=baseTint.clone().lerp(peakTint,T.clamp((height-280)/450,0,.72));
      colors.push(tint.r,tint.g,tint.b);
      if(band<bands.length-1&&i<segments){const k=band*(segments+1)+i,n=k+segments+1;faces.push(k,n,k+1,n,n+1,k+1);}
    }
    const range=new THREE.BufferGeometry();range.setAttribute('position',new THREE.Float32BufferAttribute(vertices,3));
    range.setAttribute('color',new THREE.Float32BufferAttribute(colors,3));range.setIndex(faces);
    const facets=range.toNonIndexed();range.dispose();facets.computeVertexNormals();
    const normals=facets.getAttribute('normal'),tones=facets.getAttribute('color');
    for(let i=0;i<normals.count;i++){
      const light=Math.abs(normals.getX(i)*-.52+normals.getY(i)*.73+normals.getZ(i)*.46);
      const shade=light>.65?1:light>.3?.92:.84;
      tones.setXYZ(i,tones.getX(i)*shade,tones.getY(i)*shade,tones.getZ(i)*shade);
    }
    mesh(facets,new THREE.MeshBasicMaterial({vertexColors:true,fog:false,side:THREE.DoubleSide}),0,0,0);
  }
  // Large, recognisable silhouettes framing the gorge rather than tiny props.
  for(const side of [-1,1])for(let i=0;i<(T.expedition?16:8);i++){
    const y=T.expedition?1390+i*47:195+i*40,x=side<0?T.bounds.left-18-i%2*11:T.bounds.right+19+i%2*12;
    const z=T.sample(side<0?T.bounds.left+2:T.bounds.right-2,y).z;
    const m=mesh(rock,i%2?stone:darkStone,x,y,z+9,17+random()*9,22+random()*12,29+random()*23);
    m.rotation.z=random()*.8;
  }
  // Water spills outside the traversable mountainside, with an opaque face
  // and a cheap moving band pattern. It introduces no false rideable surface.
  const fallX=T.bounds.left-7,fallY=T.waterfallY??324,fallTop=T.sample(T.bounds.left+2,fallY).z+48,fallHeight=65;
  const fallMaterial=new THREE.MeshBasicMaterial({color:'#9acacb',side:THREE.DoubleSide});
  fallMaterial.onBeforeCompile=shader=>{
    shader.uniforms.fallTime=clock;
    shader.vertexShader='varying vec2 vFall;\n'+shader.vertexShader.replace('#include <begin_vertex>',
      '#include <begin_vertex>\nvFall=uv;');
    shader.fragmentShader='uniform float fallTime; varying vec2 vFall;\n'+shader.fragmentShader.replace('#include <color_fragment>',
      '#include <color_fragment>\nfloat ribbon=sin(vFall.x*47.0+sin(vFall.y*9.0+fallTime*3.0));\n'+
      'float streak=sin(vFall.y*94.0+fallTime*10.0+vFall.x*12.0);\n'+
      'diffuseColor.rgb*=0.82+0.12*ribbon+0.10*step(0.7,streak);');
  };
  mesh(rock,darkStone,fallX-9,fallY,fallTop-fallHeight*.5,12,21,fallHeight*.68);
  const fallGeometry=new THREE.PlaneGeometry(8,fallHeight);
  fallGeometry.rotateX(Math.PI/2);fallGeometry.rotateZ(Math.PI/2-.22);
  mesh(fallGeometry,fallMaterial,fallX+3,fallY-8,fallTop-fallHeight*.5);
  // A roof is visible before arrival. All flanks share the same valley refuge.
  const refugeY=T.finish+21;
  for(const x of (T.landscape?[-350,5,350]:[-72,5,83])){
    const z=T.sample(x,refugeY).z;
    mesh(box,wall,x,refugeY,z+1.7,7,5,3.4);
    for(const side of [-1,1]){
      const r=mesh(box,roof,x+side*2,refugeY,z+4.1,4.6,6.6,.22);r.rotation.y=side*.40;
    }
    mesh(box,wood,x,refugeY-2.54,z+1.1,1.5,.12,2.2);
    for(const side of [-1,1])mesh(box,lamp,x+side*2.3,refugeY-2.57,z+1.9,1.1,.09,.9);
    mesh(box,stone,x+2.5,refugeY+1.1,z+4.3,.7,.8,2.7);
    mesh(box,wood,x,refugeY-4.3,z+.35,5,.6,.24);
  }
  // Root ribbons follow the same raised tire surface; dark flanks make their
  // small height readable without adding separate, mismatched collision boxes.
  const rootVertices=[];
  for(const r of T.roots||[]){
    for(let x=r.x-r.span;x<r.x+r.span;x+=.45){
      const corners=[];
      for(const [a,b] of [[x,-.20],[Math.min(x+.45,r.x+r.span),-.20],[x,.20],[Math.min(x+.45,r.x+r.span),.20]]){
        const y=r.y+r.skew*(a-r.x)+b,p=T.sample(a,y);
        corners.push([a,y,p.z+.018]);
      }
      const p=T.sample(x,r.y+r.skew*(x-r.x));
      if(p.root<.08||p.jump||p.shelf>.25)continue;
      for(const i of [0,1,2,2,1,3])rootVertices.push(...corners[i]);
    }
  }
  if(rootVertices.length){
    const rootGeometry=new THREE.BufferGeometry();
    rootGeometry.setAttribute('position',new THREE.Float32BufferAttribute(rootVertices,3));rootGeometry.computeVertexNormals();
    mesh(rootGeometry,wood,0,0,0);
  }
  const grassMat=material('#6c8550');grassMat.side=THREE.DoubleSide;
  grassMat.onBeforeCompile=shader=>{
    shader.uniforms.grassTime=clock;
    shader.vertexShader='uniform float grassTime;\n'+shader.vertexShader.replace('#include <begin_vertex>',
      '#include <begin_vertex>\ntransformed.x+=sin(grassTime*1.8+instanceMatrix[3].x*.37+instanceMatrix[3].y*.19)*position.z*.14;');
  };
  const tuft=new THREE.BufferGeometry();
  tuft.setAttribute('position',new THREE.Float32BufferAttribute([
    -.19,0,0,.13,0,0,-.06,.02,.52, 0,-.14,0,0,.18,0,.04,.02,.39,
    -.12,-.09,0,.17,.09,0,.12,.06,.32],3));
  tuft.computeVertexNormals();
  const transform=new THREE.Object3D();
  for(let band=0;band<Math.ceil((T.finish+8)/100);band++){
    const spots=[];
    for(let i=0;i<(T.expedition?850:1500);i++){
      const x=T.bounds.left+9+random()*(T.bounds.right-T.bounds.left-18),y=band*100+random()*100;
      const g=T.sample(x,y),region=T.region(y);
      if(y>T.finish+8||g.kind!=='grass'||g.gap||g.ledge>.32||g.jumpOffset<1||random()> .30+.65*region.valley+.3*region.forest)continue;
      const slope=Math.abs(T.sample(x+.4,y).z-g.z)+Math.abs(T.sample(x,y+.4).z-g.z);
      if(slope>.5)continue;
      // Small islands of grass leave soil visible between clusters.
      for(let blade=0;blade<5;blade++){
        const bx=x+(random()-.5)*1.4,by=y+(random()-.5)*1.4;
        spots.push({x:bx,y:by,z:T.sample(bx,by).z,size:.65+random()*.8});
      }
    }
    const batch=new THREE.InstancedMesh(tuft,grassMat,spots.length);
    spots.forEach((p,i)=>{
      transform.position.set(p.x,p.y,p.z-.025);transform.rotation.z=random()*Math.PI;
      transform.scale.setScalar(p.size);transform.updateMatrix();batch.setMatrixAt(i,transform.matrix);
      batch.setColorAt(i,new THREE.Color().setHSL(.20+random()*.06,.24+random()*.18,.52+random()*.12));
    });
    batch.computeBoundingSphere();world.add(batch);meshes.push(batch);
  }
  return {clock,update(time){clock.value=time;}};
}
