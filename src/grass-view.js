/* Adapted at the owner's request from Y3K's city/green_grass.gd and
 * env/{grass,wind,noise} shaders. Original snapshots: assets/source/y3k-grass.
 * Godot X/Z ground + Y height -> courtyard X/Y ground + Z height, 100 units/m.
 * Eight curved blades per tuft, four segments, source blade_scale 0.6.
 * One instanced draw; wind runs on the GPU and uses paused gameplay time.
 */
(function(root){
  function create(THREE,world,own,patches){
    let seed=3003;
    const rand=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};
    const positions=[],uvs=[];
    for(let k=0;k<8;k++){
      const ang=2*Math.PI*(k+rand()*0.6)/8,r=0.2*Math.sqrt(rand());
      const ox=Math.cos(ang)*r,oy=Math.sin(ang)*r,h=0.16+rand()*0.20,wscale=0.8+rand()*0.5,yaw=rand()*Math.PI*2;
      const rows=[];
      for(let i=0;i<=4;i++){
        const t=i/4,w=0.028*wscale*Math.pow(1-t,0.9),lean=0.15*t*t*h*2.5;
        rows.push([-w,w].map(x=>[(ox+x*Math.cos(yaw)-lean*Math.sin(yaw))*60,(oy+x*Math.sin(yaw)+lean*Math.cos(yaw))*60,t*h*60]));
      }
      for(let i=0;i<4;i++)for(const [row,side] of [[i,0],[i,1],[i+1,1],[i,0],[i+1,1],[i+1,0]]){positions.push(...rows[row][side]);uvs.push(side,row/4);}
    }
    const geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));geometry.setAttribute('uv',new THREE.Float32BufferAttribute(uvs,2));own.push(geometry);
    const noise=`
      float hash12(vec2 p){vec3 p3=fract(vec3(p.xyx)*0.1031);p3+=dot(p3,p3.yzx+33.33);return fract((p3.x+p3.y)*p3.z);}
      float vnoise(vec2 p){vec2 i=floor(p),f=fract(p),u=f*f*(3.0-2.0*f);return mix(mix(hash12(i),hash12(i+vec2(1.,0.)),u.x),mix(hash12(i+vec2(0.,1.)),hash12(i+vec2(1.,1.)),u.x),u.y);}
      float fbm(vec2 p){float v=0.,a=.5;for(int i=0;i<4;i++){v+=a*vnoise(p);p=p*2.03+vec2(17.1,9.3);a*=.5;}return v;}`;
    const material=new THREE.ShaderMaterial({side:THREE.DoubleSide,uniforms:{time:{value:0},rootColor:{value:new THREE.Color('#295c12')},tipColor:{value:new THREE.Color('#75b833')},dryColor:{value:new THREE.Color('#a8a84d')}},
      vertexShader:`uniform float time;varying float bladeHeight;varying vec2 tuftRoot;
        void main(){vec3 p=(instanceMatrix*vec4(position,1.)).xyz;vec3 root=instanceMatrix[3].xyz;
          float h=(p.z-root.z)/100.;vec2 ground=root.xy/100.;float phase=ground.x*.13+ground.y*.09;
          float gust=.55+.45*sin(time*.31+phase*.7);
          float sway=sin(time*1.35+phase*4.)+.3*sin(time*2.9+phase*9.);
          p.xy+=vec2(.83,.55)*sway*gust*1.6*h*h*100.;
          p.xy+=vec2(.4,.25)*sin(time*4.+ground.x*3.+ground.y*2.)*.02*uv.y*uv.y*100.;
          bladeHeight=uv.y;tuftRoot=ground;gl_Position=projectionMatrix*modelViewMatrix*vec4(p,1.);}`,
      fragmentShader:`uniform vec3 rootColor,tipColor,dryColor;varying float bladeHeight;varying vec2 tuftRoot;${noise}
        void main(){float dry=smoothstep(.35,.8,fbm(tuftRoot*.35));vec3 tip=mix(tipColor,dryColor,dry*.35);
          vec3 col=mix(rootColor,tip,smoothstep(0.,1.,bladeHeight));col*=.85+.3*hash12(tuftRoot*91.);
          gl_FragColor=vec4(col,1.);
          #include <colorspace_fragment>
        }`});own.push(material);
    const count=patches.reduce((n,p)=>n+Math.ceil(p.w*p.h/10000*11),0);
    const grass=new THREE.InstancedMesh(geometry,material,count),transform=new THREE.Object3D();let index=0;
    const turfMaterial=new THREE.MeshBasicMaterial({color:'#33661c',side:THREE.DoubleSide});own.push(turfMaterial);
    for(const p of patches){
      const turfGeometry=new THREE.PlaneGeometry(p.w,p.h);own.push(turfGeometry);
      const turf=new THREE.Mesh(turfGeometry,turfMaterial);turf.position.set(p.x+p.w/2,p.y+p.h/2,p.z+0.8);world.add(turf);
      const n=Math.ceil(p.w*p.h/10000*11);
      for(let i=0;i<n;i++){
        // Keep the tuft's 12-unit radius inside the lawn's curb.
        transform.position.set(p.x+14+rand()*(p.w-28),p.y+14+rand()*(p.h-28),p.z+1.5);
        transform.rotation.set(0,0,rand()*Math.PI*2);const width=.85+rand()*.4;
        transform.scale.set(width,width,.7+rand()*.45);transform.updateMatrix();grass.setMatrixAt(index++,transform.matrix);
      }
    }
    grass.instanceMatrix.needsUpdate=true;grass.computeBoundingSphere();grass.boundingSphere.radius+=6;world.add(grass);own.push(grass);
    return {update(time){material.uniforms.time.value=time;},tufts:count,blades:count*8};
  }
  root.createCourtyardGrass=create;
  if(typeof module!=='undefined'&&module.exports)module.exports=create;
})(globalThis);
