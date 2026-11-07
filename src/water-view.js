/* Small opaque water surfaces on the existing GDevelop renderer. Shared shader
 * uses three color bands, edge foam and travelling highlights, without screen
 * reflections or post processing. Fixed-size ripple pool cannot accumulate. */
(function(root){
  function create(THREE,world,own,basins){
    const W=root.CourtyardWater,surfaces=[],falls=[],rings=[];
    const vertex=`uniform float time;uniform vec2 size;uniform float vertical;varying vec2 point;
      void main(){vec3 p=position;point=uv*size;
        float edge=min(min(uv.x,1.-uv.x)*size.x,min(uv.y,1.-uv.y)*size.y);
        if(vertical<.5)p.z+=sin(p.x*.035+time*1.7)*cos(p.y*.04-time*.9)*.7*clamp(edge/12.,0.,1.);
        gl_Position=projectionMatrix*modelViewMatrix*vec4(p,1.);}`;
    const fragment=`uniform float time;uniform vec2 size;uniform vec2 flow;uniform float vertical;varying vec2 point;
      void main(){vec2 q=point-flow*time;
        float bands=sin(q.x*.06+sin(q.y*.035))*cos(q.y*.065+sin(q.x*.04));
        float edge=min(min(point.x,size.x-point.x),min(point.y,size.y-point.y));
        vec3 col=bands>.58?vec3(.19,.47,.58):bands<-.48?vec3(.08,.29,.40):vec3(.12,.38,.50);
        float glint=step(.94,sin(q.x*.045+q.y*.11))*step(.3,cos(q.y*.035-q.x*.09));
        float foam=(1.-step(2.+sin(time*1.2+point.x*.08)*.6,edge))*step(-.2,sin(point.x*.13+point.y*.16-time));
        if(vertical>.5){glint=step(.83,sin(q.y*.16+sin(q.x*.2)))*.55;foam=0.;}
        col=mix(col,vec3(.64,.81,.77),max(foam*.65,glint*.5));gl_FragColor=vec4(col,1.);
        #include <colorspace_fragment>
      }`;
    function plane(x,y,z,w,h,flowX=9,flowY=3,vertical=false){
      const mat=new THREE.ShaderMaterial({side:THREE.DoubleSide,uniforms:{time:{value:0},size:{value:new THREE.Vector2(w,h)},flow:{value:new THREE.Vector2(flowX,flowY)},vertical:{value:vertical?1:0}},vertexShader:vertex,fragmentShader:fragment});
      const geo=new THREE.PlaneGeometry(w,h,Math.min(24,Math.ceil(w/35)),Math.min(24,Math.ceil(h/35)));
      own.push(mat,geo);const mesh=new THREE.Mesh(geo,mat);mesh.position.set(x+w/2,y+h/2,z);world.add(mesh);
      const item={mesh,mat,x,y,z,w,h};surfaces.push(item);return item;
    }
    for(const b of basins){const item=plane(b.x,b.y,b.z,b.w,b.h,b.flowX||9,b.flowY||3);item.basin=b;}
    // Gate -> stepped receiving trough -> downhill aqueduct -> root bed.
    const lower=[plane(1174,248,183,37,57,0,55),plane(695,299,153,505,25,-65,0),plane(694,323,151,28,35,0,40),plane(690,350,145,40,70,0,25)];
    lower[0].mesh.rotation.x=-Math.atan2(30,57);lower[0].mesh.position.z=168;
    function fall(x,y,top,bottom,width){const item=plane(x-width/2,y,top,width,top-bottom,0,-130,true);item.mesh.rotation.x=Math.PI/2;item.mesh.position.set(x,y,(top+bottom)/2);item.top=top;item.bottom=bottom;falls.push(item);return item;}
    const sky=fall(624,400,498,145,14);
    const outlet=plane(615,385,498,18,23,0,55);outlet.mesh.visible=false;
    const pool=plane(613,391,143,38,37,0,18);
    const ringGeo=new THREE.RingGeometry(.82,1,24);own.push(ringGeo);
    for(let i=0;i<20;i++){const mat=new THREE.MeshBasicMaterial({color:'#b3d6cb',transparent:true,opacity:0,depthWrite:false,side:THREE.DoubleSide}),mesh=new THREE.Mesh(ringGeo,mat);own.push(mat);mesh.visible=false;world.add(mesh);rings.push({mesh,age:9,strength:1,basin:null});}
    let cursor=0,lastFoam=-1;
    function splash(x,y,z,strength=1,basin=null){const r=rings[cursor++%rings.length];r.age=0;r.strength=Math.min(1.6,strength);r.basin=basin;r.mesh.position.set(x,y,z+1.4);r.mesh.visible=true;}
    let previous=0;
    function update(time,lowerFlow,skyFlow){
      const dt=Math.max(0,Math.min(.15,time-previous));previous=time;
      for(const item of surfaces){item.mat.uniforms.time.value=time;if(item.basin)item.mesh.position.z=W.surface(item.basin,time);}
      for(let i=0;i<lower.length;i++){const f=Math.max(0,Math.min(1,lowerFlow*4-i));lower[i].mesh.visible=f>0;const item=lower[i];
        if(i===1){item.mesh.scale.x=Math.max(.001,f);item.mesh.position.x=item.x+item.w-item.w*f/2;}
        else{item.mesh.scale.y=Math.max(.001,f);item.mesh.position.y=item.y+item.h*f/2;}
      }
      sky.mesh.visible=skyFlow>0;sky.mesh.scale.y=Math.max(.001,skyFlow);sky.mesh.position.z=sky.top-(sky.top-sky.bottom)*skyFlow/2;
      outlet.mesh.visible=skyFlow>0;pool.mesh.visible=skyFlow>.98;
      if(time-lastFoam>.32){if(skyFlow>.98)splash(624,406,144,.45);if(lowerFlow>.98)splash(710,395,146,.25);lastFoam=time;}
      for(const r of rings){r.age+=dt;r.mesh.visible=r.age<1.2;if(!r.mesh.visible)continue;
        const radius=5+r.age*28*r.strength;r.mesh.scale.set(radius,radius,1);r.mesh.material.opacity=(1-r.age/1.2)*.55;
        if(r.basin){r.mesh.position.z=W.surface(r.basin,time)+1.4;const b=r.basin;const edge=Math.min(r.mesh.position.x-b.x,b.x+b.w-r.mesh.position.x,r.mesh.position.y-b.y,b.y+b.h-r.mesh.position.y);if(radius>edge)r.mesh.visible=false;}
      }
    }
    return {update,splash,clear(){for(const r of rings){r.age=9;r.mesh.visible=false;}},get activeRipples(){return rings.filter(r=>r.mesh.visible).length;},count:surfaces.length};
  }
  root.createCourtyardWaterView=create;
})(globalThis);
