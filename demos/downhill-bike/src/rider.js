/* Series 02: original low-poly freerider, textured like a 2000s sports game.
 * Two-bone limbs track the pedals and grips during every riding pose. */
function createRiderFactory(world,paintTile){
  const material=color=>new THREE.MeshStandardMaterial({color,roughness:.84,flatShading:true});
  const alloy=material('#aab5b4'), rubber=material('#242626'), skin=material('#bd8666');
  const canvas=material('#6d6351'), cargo=material('#564f42'), pad=material('#353a3d');
  const goggles=material('#252832'), lens=material('#657b86'), boot=material('#333a42');
  const sole=material('#b0a392'), binding=material('#d4c5ad');
  const kits=[
    ['#252f48','#ece1c7','#bad05f','#a0a969','#465e9c'],
    ['#2c464c','#eddbc1','#e69c54','#517078','#98593d'],
    ['#443750','#e9dfc4','#e0ae66','#866c8b','#5d4974'],
    ['#48533c','#ead8bd','#85c1b6','#879568','#547566']
  ];
  const unit=new THREE.Vector3(0,1,0);
  const box=(x,y,z)=>new THREE.BoxGeometry(x,y,z);
  const ball=new THREE.IcosahedronGeometry(1,1);
  const bar=new THREE.CylinderGeometry(1,1,1,6);
  function body(rows,sides=10){
    const positions=[],uvs=[],indices=[];
    for(const [z,width,depth,shift=0] of rows){
      const v=(z-rows[0][0])/(rows.at(-1)[0]-rows[0][0]);
      for(let i=0;i<=sides;i++){
        const u=i/sides,a=u*2*Math.PI;
        positions.push(Math.sin(a)*width,shift+Math.cos(a)*depth,z);
        uvs.push(u,v);
      }
    }
    for(let row=0;row<rows.length-1;row++)for(let i=0;i<sides;i++){
      const a=row*(sides+1)+i,b=a+sides+1;
      indices.push(a,b,a+1,a+1,b,b+1);
    }
    const geometry=new THREE.BufferGeometry();
    geometry.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));
    geometry.setAttribute('uv',new THREE.Float32BufferAttribute(uvs,2));
    geometry.setIndex(indices);
    geometry.computeVertexNormals();
    return geometry;
  }
  const shirtGeo=body([
    [0,.012,.018,-.014],[.014,.171,.110,-.014],[.100,.163,.116,-.006],
    [.242,.195,.131,-.005],[.340,.226,.124,.008],[.389,.208,.109,.009],
    [.430,.082,.076,.018],[.437,.010,.012,.018]
  ],12);
  const hipGeo=body([[-.113,.012,.012,-.01],[-.096,.185,.119,-.018],[-.01,.177,.123,-.007],
    [.034,.158,.108,.005],[.040,.008,.008,.005]]);
  const shellGeo=body([[-.014,.106,.116,-.015],[.012,.165,.156,-.016],[.082,.171,.160,-.027],
    [.135,.139,.132,-.026],[.177,.088,.085,-.030],[.184,.006,.006,-.031]],12);
  const visorGeo=body([[.021,.018,.031,.119],[.024,.143,.139,.126],[.056,.156,.127,.098],
    [.078,.100,.078,.080],[.080,.012,.015,.066]],8);
  const shoeGeo=body([[-.046,.008,.012,.038],[-.034,.071,.139,.036],[.002,.072,.143,.039],
    [.049,.063,.115,.021],[.083,.050,.067,-.015],[.087,.006,.008,-.014]],8);
  const soleGeo=body([[-.056,.009,.012,.037],[-.048,.075,.141,.038],[-.024,.073,.143,.039],
    [-.019,.010,.010,.039]],8);
  function limbShape(profile){return new THREE.LatheGeometry(profile.map(([y,r])=>new THREE.Vector2(r,y)),8);}
  const shortsGeo=limbShape([[-.50,.78],[-.39,1.06],[-.15,1.00],[.20,.86],[.45,.91],[.49,0]]);
  const shinGeo=limbShape([[-.50,.82],[-.24,1.00],[.08,.82],[.35,.57],[.49,.54]]);
  const sleeveGeo=limbShape([[-.50,1.05],[-.32,1.04],[.12,.89],[.43,.85],[.49,0]]);
  const forearmGeo=limbShape([[-.50,.83],[-.17,1.00],[.14,.81],[.49,.58]]);
  const rimGeo=new THREE.TorusGeometry(.282,.014,5,20).rotateY(Math.PI/2);
  const tireGeo=new THREE.TorusGeometry(.318,.037,6,24).rotateY(Math.PI/2);
  const vec=(...xyz)=>new THREE.Vector3(...xyz);
  function add(parent,geo,mat,x=0,y=0,z=0){
    const object=new THREE.Mesh(geo,mat);
    object.position.set(x,y,z);
    parent.add(object);
    return object;
  }
  function joint(parent,x,y,z){
    const group=new THREE.Group();
    group.position.set(x,y,z);
    parent.add(group);
    return group;
  }
  const direction=vec(), jointAxis=vec(), guide=vec(), bendPoint=vec(), target=vec();
  function segment(mesh,start,end,radius){
    direction.subVectors(end,start);
    const length=Math.max(.001,direction.length());
    mesh.position.copy(start).addScaledVector(direction,.5);
    mesh.quaternion.setFromUnitVectors(unit,direction.divideScalar(length));
    mesh.scale.set(radius,length,radius);
  }
  function tube(parent,mat,a,b,radius){
    const mesh=add(parent,bar,mat);
    segment(mesh,vec(...a),vec(...b),radius);
    return mesh;
  }
  function limb(parent,upperMat,lowerMat,r1,r2,a,b,kind,trim){
    const arm=kind==='arm';
    const upper=add(parent,arm?sleeveGeo:shortsGeo,upperMat);
    const lower=add(parent,arm?forearmGeo:shinGeo,lowerMat);
    const jointPad=add(parent,ball,arm?trim:pad);
    const cuff=add(parent,bar,arm?trim:cargo);
    const bend=vec();
    function place(from,knee,to){
      segment(upper,from,knee,r1);
      segment(lower,knee,to,r2);
      jointPad.position.copy(knee);
      jointPad.scale.set(arm?.067:.088,arm?.067:.091,arm?.065:.091);
      target.copy(knee).lerp(from,.13);
      segment(cuff,target,knee,arm?.068:.091);
    }
    function solve(from,to,plane){
      jointAxis.subVectors(to,from);
      const length=THREE.MathUtils.clamp(jointAxis.length(),Math.abs(a-b)+.015,a+b-.007);
      jointAxis.normalize();
      guide.copy(plane).addScaledVector(jointAxis,-plane.dot(jointAxis)).normalize();
      const along=(a*a-b*b+length*length)/(2*length);
      bendPoint.copy(from).addScaledVector(jointAxis,along).addScaledVector(guide,Math.sqrt(Math.max(0,a*a-along*along)));
      bend.copy(bendPoint);
      place(from,bend,to);
    }
    return {solve,place,bend};
  }
  function wheel(parent,x,y,z){
    const hub=joint(parent,x,y,z),spindle=joint(hub,0,0,0);
    add(spindle,tireGeo,rubber);
    add(spindle,rimGeo,alloy);
    add(spindle,ball,alloy).scale.set(.060,.044,.044);
    for(let i=0;i<8;i++){
      const a=i*Math.PI/4;
      tube(spindle,alloy,[0,0,0],[0,.275*Math.sin(a),.275*Math.cos(a)],.006);
    }
    return {hub,spindle};
  }
  const kitMaterials=new Map();
  function kit(slot){
    const id=slot%kits.length;
    if(kitMaterials.has(id))return kitMaterials.get(id);
    const [base,cream,accent,trimColor,frameColor]=kits[id];
    const sleeve=material(cream),trim=material(trimColor),frame=material(frameColor);
    const jersey=material('#ffffff'),helmet=material('#ffffff'),visor=material(base),guard=material(accent);
    jersey.map=paintTile(256,128,ctx=>{
      ctx.fillStyle=base;ctx.fillRect(0,0,256,128);
      ctx.fillStyle=cream;ctx.beginPath();
      ctx.moveTo(0,0);ctx.lineTo(256,0);ctx.lineTo(256,48);ctx.lineTo(208,37);
      ctx.lineTo(163,54);ctx.lineTo(94,59);ctx.lineTo(50,39);ctx.lineTo(0,48);ctx.fill();
      ctx.fillStyle=accent;ctx.beginPath();
      ctx.moveTo(0,83);ctx.lineTo(256,72);ctx.lineTo(256,89);ctx.lineTo(0,101);ctx.fill();
      ctx.fillStyle=base;ctx.fillRect(0,0,256,11);
      ctx.fillStyle=accent;ctx.fillRect(84,15,88,5);
      ctx.textAlign='center';ctx.fillStyle=base;ctx.font='900 11px system-ui';ctx.fillText('RIDGE CREW',128,37);
      ctx.fillStyle=cream;ctx.font='italic 900 40px system-ui';
      ctx.lineWidth=4;ctx.strokeStyle=base;
      const bib=String(17+id*7);
      ctx.strokeText(bib,128,84);ctx.fillText(bib,128,84);
      ctx.font='italic 900 22px system-ui';ctx.fillStyle=base;
      ctx.fillText(bib,2,36);ctx.fillText(bib,258,36);
      ctx.fillStyle=accent;ctx.fillRect(0,114,256,3);
    });
    jersey.map.repeat.x=-1;
    jersey.map.offset.x=1;
    helmet.map=paintTile(128,64,ctx=>{
      ctx.fillStyle=base;ctx.fillRect(0,0,128,64);
      ctx.fillStyle=cream;ctx.fillRect(0,4,128,28);
      ctx.fillStyle=accent;ctx.fillRect(53,0,23,64);
      ctx.fillStyle=base;ctx.fillRect(61,0,6,64);
      ctx.fillRect(37,25,12,4);ctx.fillRect(79,25,12,4);
      ctx.fillStyle=cream;ctx.fillRect(24,41,25,4);ctx.fillRect(79,41,25,4);
    });
    const result={jersey,sleeve,trim,helmet,visor,guard,frame};
    kitMaterials.set(id,result);
    return result;
  }
  function create(slot,track){
    const {jersey,sleeve,trim,helmet,visor,guard,frame}=kit(slot);
    const root=joint(world,0,0,0),attitude=joint(root,0,0,0),chassis=joint(attitude,0,0,0);
    const stem=[0,.39,.65],seat=[0,-.26,.64],crank=[0,-.12,.12];
    for(const [a,b,radius] of [
      [seat,stem,.046],
      [stem,crank,.055],[crank,seat,.041],[[0,-.30,.61],[0,-.31,.70],.033]
    ]) tube(chassis,frame,a,b,radius);
    add(chassis,box(.20,.33,.055),rubber,0,-.31,.71);
    tube(chassis,alloy,[-.18,-.12,.12],[.18,-.12,.12],.026);
    const fork=joint(chassis,...stem);
    const forkLegs=[-.084,.084].map(x=>({
      x,upper:tube(fork,alloy,[x,0,.01],[x,.14,-.34],.021),
      lower:tube(fork,frame,[x,.14,-.34],[x,.25,-.65],.035)
    }));
    tube(fork,alloy,[-.36,-.067,.073],[.36,-.067,.073],.023);
    for(const side of [-1,1]){
      tube(fork,boot,[side*.285,-.067,.073],[side*.377,-.067,.073],.030);
      add(fork,box(.042,.125,.030),alloy,side*.28,.012,.055);
    }
    const front=wheel(fork,0,.25,-.65),rear=wheel(attitude,0,-.64,0);
    const pivot=vec(0,-.16,.18);
    const swingarm=[-1,1].map(side=>tube(chassis,frame,[side*.071,-.16,.18],[side*.082,-.64,0],.032));
    const shockBody=tube(chassis,alloy,[0,-.035,.37],[0,-.31,.17],.043);
    const shockShaft=tube(chassis,alloy,[0,-.31,.17],[0,-.48,.08],.019);
    const shockTop=vec(0,-.035,.37),axle=vec(),rocker=vec(),shockSplit=vec();
    const pedals=[-1,1].map(side=>add(chassis,box(.122,.132,.037),rubber,side*.18,-.12,.12));
    const crankArms=[-1,1].map(side=>tube(chassis,alloy,[side*.14,-.12,.12],[side*.18,.04,.12],.013));

    const bodyRig=joint(root,0,0,0),torso=joint(bodyRig,0,0,0);
    add(torso,shirtGeo,jersey);
    add(torso,hipGeo,canvas);
    add(torso,ball,skin,0,.012,.458).scale.set(.076,.071,.088);
    const head=joint(torso,0,.012,.541);
    add(head,ball,skin,0,.030,-.018).scale.set(.118,.118,.127);
    add(head,shellGeo,helmet);
    add(head,visorGeo,visor);
    add(head,ball,visor,0,-.089,-.037).scale.set(.149,.100,.090);
    const jaw=add(head,ball,guard,0,.103,-.088);
    jaw.scale.set(.141,.130,.057);
    add(head,box(.121,.019,.022),goggles,0,.223,-.079);
    for(const s of [-1,1]){
      add(head,ball,visor,s*.115,.035,-.053).scale.set(.052,.114,.066);
      const eye=add(head,box(.112,.035,.063),goggles,s*.051,.137,-.010);
      eye.rotation.z=-s*.22;
      const glass=add(head,box(.090,.018,.044),lens,s*.052,.153,-.010);
      glass.rotation.z=-s*.22;
      add(head,box(.035,.036,.037),trim,s*.151,.054,-.027);
    }
    const limbs=[-1,1].map(side=>({
      side,
      leg:limb(bodyRig,canvas,skin,.103,.064,.385,.416,'leg',trim),
      arm:limb(bodyRig,sleeve,skin,.069,.054,.26,.274,'arm',trim),
      glove:add(bodyRig,ball,boot),
      shoe:joint(bodyRig,0,0,0),
      hip:vec(),shoulder:vec(),hand:vec(),foot:vec(),
      kneePlane:vec(side*.12,1,.03),elbowPlane:vec(side*.8,-.10,-.65),
      localGrip:vec(side*.355,-.067,.073)
    }));
    for(const part of limbs){
      add(part.shoe,shoeGeo,boot);add(part.shoe,soleGeo,sole);
      for(let i=0;i<3;i++)add(part.shoe,box(.083,.013,.009),binding,0,.038+i*.022,.062-i*.005);
    }
    const position=vec(),torsoRotation=new THREE.Quaternion(),chassisInverse=new THREE.Quaternion();
    const sideAxis=vec(),forwardAxis=vec(),upAxis=vec(),midpoint=vec();
    const basis=new THREE.Matrix4(),orientation=new THREE.Quaternion();
    let bail=null;
    function ridePose(p){
      const braking=p.brake||0,drive=p.drive||0,shift=p.shift||0;
      const airborne=p.grounded===false?1:0,age=p.hopAge||0;
      const launch=BikeMotion.hopWindup,fly=age-launch;
      const ease=THREE.MathUtils.smoothstep;
      const load=age>0?ease(age,0,launch)*(1-ease(age,launch,launch+.096)):0;
      const pull=airborne&&age>launch?(1-ease(fly,.028,.163))*ease(fly,0,.052):0;
      const tuck=airborne&&age>launch?ease(fly,.060,.193)*(1-ease(fly,.24,.43)):0;
      const kickAge=p.kickAge||0;
      const kick=ease(kickAge,0,.10)*(1-ease(kickAge,.155,.37));
      const forkLoad=(p.forkLoad??p.compression??0)+.025*load;
      const shockLoad=(p.shockLoad??p.compression??0)+.035*load;
      const compress=(forkLoad+shockLoad)*.5;
      const effort=(1-airborne)*drive*(1-braking),steering=p.turn||0;
      const rise=Math.min(1,(p.speed||0)*.24)*effort;
      root.position.set(p.x,p.y,p.z);
      root.rotation.z=-p.yaw;
      attitude.position.set(0,0,0);
      attitude.rotation.set(p.pitch||0,p.lean||0,0,'XYZ');
      bodyRig.position.set(0,0,0);
      bodyRig.quaternion.copy(attitude.quaternion);
      chassis.position.z=-compress;
      chassis.rotation.x=(shockLoad-forkLoad)/1.28;
      chassisInverse.copy(chassis.quaternion).invert();
      fork.rotation.z=-(p.turn||0)*.26;
      front.hub.position.set(0,.25-forkLoad*.29,-.65+(p.frontTravel||0)+forkLoad);
      rear.hub.position.z=p.rearTravel||0;
      for(const {x,upper,lower} of forkLegs){
        position.set(x,front.hub.position.y-.107,front.hub.position.z+.292);
        segment(upper,target.set(x,0,.01),position,.021);
        segment(lower,position,target.set(x,front.hub.position.y,front.hub.position.z),.035);
      }
      axle.copy(rear.hub.position).sub(chassis.position).applyQuaternion(chassisInverse);
      for(let i=0;i<2;i++){
        const x=i===0?-.078:.078;
        segment(swingarm[i],position.copy(pivot).setX(x),target.copy(axle).setX(x),.032);
      }
      rocker.copy(pivot).lerp(axle,.52);
      shockSplit.copy(shockTop).lerp(rocker,.61+shockLoad*.9);
      segment(shockBody,shockTop,shockSplit,.043);
      segment(shockShaft,shockSplit,rocker,.019);
      front.spindle.rotation.x=p.spin||0;
      rear.spindle.rotation.x=p.rearSpin??p.spin??0;
      const breath=.009*Math.sin((p.time||0)*3.7),recover=p.recovery||0;
      const crankAngle=p.crank||0;
      torso.position.set(.046*Math.sin(crankAngle)*effort-(p.recoveryLean||0)*.13,
        -.28-shift*.16+effort*.063-.079*load-.103*pull+.089*tuck,
        .814+rise*.039-compress*.85-braking*.068-airborne*.038+breath-.077*load+.031*pull-.061*tuck-.055*recover);
      torso.rotation.set(-.70-braking*.19+shift*.20-airborne*.09+.18*pull-.13*tuck,
        -.06*steering-(p.kickSide||0)*kick*.14,.067*steering);
      head.position.set(0,.012,.541);
      head.rotation.x=.50+airborne*.16-braking*.055;
      head.rotation.y=0;
      head.rotation.z=-steering*.24-(p.lookYaw||0)*.45;
      torsoRotation.copy(torso.quaternion);
      for(let i=0;i<limbs.length;i++){
        const part=limbs[i],s=part.side,a=crankAngle+i*Math.PI;
        part.hip.set(s*.103,-.013,-.024).applyQuaternion(torsoRotation).add(torso.position);
        part.shoulder.set(s*.190,-.012,.337).applyQuaternion(torsoRotation).add(torso.position);
        pedals[i].position.set(s*.184,-.12+Math.cos(a)*.137,.12+Math.sin(a)*.137);
        segment(crankArms[i],position.set(s*.14,-.12,.12),pedals[i].position,.014);
        part.foot.copy(pedals[i].position);
        part.foot.applyQuaternion(chassis.quaternion).add(chassis.position);
        part.foot.z+=.046;
        if(s===p.kickSide){
          part.foot.x+=s*kick*.37;
          part.foot.y+=kick*.05;
          part.foot.z+=kick*.24;
        }
        part.hand.copy(part.localGrip).applyQuaternion(fork.quaternion).add(fork.position);
        part.hand.applyQuaternion(chassis.quaternion).add(chassis.position);
        part.leg.solve(part.hip,part.foot,part.kneePlane);
        part.arm.solve(part.shoulder,part.hand,part.elbowPlane);
        part.shoe.position.copy(part.foot);part.shoe.position.y+=.048;
        part.shoe.rotation.set(.13*Math.sin(a)+airborne*.16,0,0);
        part.glove.position.copy(part.hand);part.glove.scale.set(.050,.060,.042);
      }
    }
    function worldPoint(object,point=vec()){
      return world.worldToLocal(object.localToWorld(point.clone()));
    }
    function bodyBasis(q){
      sideAxis.subVectors(q[1],q[0]).add(forwardAxis.subVectors(q[3],q[2])).normalize();
      upAxis.copy(q[2]).add(q[3]).sub(q[0]).sub(q[1]).normalize();
      forwardAxis.crossVectors(upAxis,sideAxis).normalize();
      upAxis.crossVectors(sideAxis,forwardAxis).normalize();
      return orientation.setFromRotationMatrix(basis.makeBasis(sideAxis,forwardAxis,upAxis));
    }
    function bikeBasis(q){
      forwardAxis.subVectors(q[1],q[0]).normalize();
      sideAxis.subVectors(q[4],q[3]).normalize();
      upAxis.crossVectors(sideAxis,forwardAxis).normalize();
      sideAxis.crossVectors(forwardAxis,upAxis).normalize();
      return orientation.setFromRotationMatrix(basis.makeBasis(sideAxis,forwardAxis,upAxis));
    }
    function startBail(p){
      const bodyNodes=[
        {position:worldPoint(bodyRig,limbs[0].hip),radius:.15,mass:3},
        {position:worldPoint(bodyRig,limbs[1].hip),radius:.15,mass:3},
        {position:worldPoint(bodyRig,limbs[0].shoulder),radius:.14,mass:3},
        {position:worldPoint(bodyRig,limbs[1].shoulder),radius:.14,mass:3},
        {position:worldPoint(head),radius:.16,mass:1.6}
      ];
      const bodyEdges=[[0,1],[2,3],[0,2],[1,3],[0,3],[1,2],[2,4],[3,4]];
      for(let i=0;i<2;i++){
        const part=limbs[i],start=bodyNodes.length;
        for(const [joint,radius] of [[part.leg.bend,.084],[part.foot,.083],[part.arm.bend,.065],[part.hand,.061]]){
          bodyNodes.push({position:worldPoint(bodyRig,joint),radius});
        }
        bodyEdges.push([i,start],[start,start+1],[i+2,start+2],[start+2,start+3],
          [i,start+1,.67,1.34],[i+2,start+3,.58,1.38]);
      }
      const bikeNodes=[
        {position:worldPoint(rear.hub),radius:.31,mass:2},
        {position:worldPoint(front.hub),radius:.31,mass:2},
        {position:worldPoint(chassis,vec(0,-.28,.71)),radius:.12,mass:2},
        {position:worldPoint(fork,limbs[0].localGrip),radius:.065},
        {position:worldPoint(fork,limbs[1].localGrip),radius:.065}
      ];
      const bikeEdges=[];
      for(let a=0;a<bikeNodes.length;a++)for(let b=a+1;b<bikeNodes.length;b++)bikeEdges.push([a,b]);
      const sin=Math.sin(p.yaw),cos=Math.cos(p.yaw);
      const velocity=vec(p.vx??sin*p.speed,p.vy??cos*p.speed,p.vz??0);
      const direction=Math.sign(p.slipSide||p.lean||p.turn||1);
      const strength=Math.min(1,p.speed/14);
      const personVelocity=velocity.clone().multiplyScalar(.61);
      personVelocity.add(vec(cos*.8*direction,-sin*.8*direction,.38));
      const personSpin=vec(cos*(-1.5-2.6*strength),-sin*(-1.5-2.6*strength),direction*.8);
      const bikeSpin=vec(sin*direction*2.2,cos*direction*2.2,.65*direction);
      const bikeOffset=worldPoint(attitude).sub(bikeNodes[0].position);
      const bikeReference=bikeBasis(bikeNodes.map(node=>node.position)).clone().invert();
      const bikeRotation=root.quaternion.clone().multiply(attitude.quaternion);
      const torsoWorld=root.quaternion.clone().multiply(bodyRig.quaternion).multiply(torso.quaternion);
      const bodyReference=bodyBasis(bodyNodes.map(node=>node.position)).clone().invert();
      const hipOffset=worldPoint(torso).sub(bodyNodes[0].position.clone().lerp(bodyNodes[1].position,.5));
      bail={
        person:createBikeBail(track,bodyNodes,bodyEdges,personVelocity,personSpin,.79),
        bike:createBikeBail(track,bikeNodes,bikeEdges,velocity.multiplyScalar(.38),bikeSpin,.83),
        bikeOffset,bikeReference,bikeRotation,bodyReference,torsoWorld,hipOffset
      };
    }
    function poseBail(dt){
      bail.person.update(dt);
      bail.bike.update(dt);
      const human=bail.person.positions,bike=bail.bike.positions;
      root.position.set(0,0,0);root.rotation.set(0,0,0);
      bodyRig.position.set(0,0,0);bodyRig.rotation.set(0,0,0);
      const rotation=bikeBasis(bike).multiply(bail.bikeReference);
      attitude.position.copy(bail.bikeOffset).applyQuaternion(rotation).add(bike[0]);
      attitude.quaternion.copy(rotation).multiply(bail.bikeRotation);
      const bodyRotation=bodyBasis(human).multiply(bail.bodyReference);
      midpoint.copy(human[0]).lerp(human[1],.5);
      torso.position.copy(bail.hipOffset).applyQuaternion(bodyRotation).add(midpoint);
      torso.quaternion.copy(bodyRotation).multiply(bail.torsoWorld);
      head.position.copy(human[4]).sub(torso.position).applyQuaternion(torsoRotation.copy(torso.quaternion).invert());
      for(let i=0;i<2;i++){
        const part=limbs[i],start=5+i*4;
        part.leg.place(human[i],human[start],human[start+1]);
        part.arm.place(human[i+2],human[start+2],human[start+3]);
        part.shoe.position.copy(human[start+1]);
        part.shoe.quaternion.setFromUnitVectors(unit,direction.subVectors(human[start+1],human[start]).normalize());
        part.glove.position.copy(human[start+3]);
      }
    }
    function pose(p,dt,snap=false){
      if(snap||p.phase!=='crashed')bail=null;
      if(p.phase!=='crashed'){ridePose(p);return;}
      if(!bail){ridePose(p);startBail(p);}
      poseBail(dt);
    }
    return {root,pose,bailFocus:()=>bail?.person.positions[0]??null};
  }
  return {create};
}
