// Position-based bodies. Distances keep the bike rigid and the
// rider articulated. Each point can independently contact the mountain.
function createBikeBail(track,seeds,edges,velocity,spin,drag){
  const dt=1/120;
  const points=seeds.map(({position,radius,mass=1})=>({
    position:position.clone(),previous:position.clone(),normal:new THREE.Vector3(),incoming:new THREE.Vector3(),
    radius,weight:1/mass,contact:false
  }));
  const center=seeds[0].position;
  const delta=new THREE.Vector3();
  for(const point of points){
    delta.subVectors(point.position,center).crossVectors(spin,delta).add(velocity);
    point.previous.addScaledVector(delta,-dt);
  }
  const links=edges.map(([a,b,min=1,max=1])=>{
    const length=points[a].position.distanceTo(points[b].position);
    return {a:points[a],b:points[b],min:min*length,max:max*length};
  });
  const solids=BikeSolids.get(track);
  let accumulator=0,age=0,quietSteps=0,asleep=false;

  function collide(point){
    const p=point.position;
    for(const rock of solids.near(p.y)){
      if(Math.abs(p.x-rock.x)>rock.r+point.radius||Math.abs(p.y-rock.y)>rock.r+point.radius)continue;
      const from=point.previous.toArray(),to=p.toArray();
      const hit=BikeSolids.sweep(rock,from,to,point.radius);
      if(!hit)continue;
      point.normal.fromArray(hit.normal);
      if(hit.depth>0)delta.copy(point.normal).multiplyScalar(Math.min(.08,hit.depth));
      else delta.copy(point.previous).lerp(p,Math.max(0,hit.t-.001)).sub(p);
      p.add(delta);point.previous.add(delta);point.contact=true;
    }
    const floor=track.sample(p.x,p.y).z;
    if(p.z>floor+point.radius*2.3)return;
    const xSlope=(track.sample(p.x+.14,p.y).z-track.sample(p.x-.14,p.y).z)/.28;
    const ySlope=(track.sample(p.x,p.y+.14).z-track.sample(p.x,p.y-.14).z)/.28;
    const slopeX=track.clamp(xSlope,-1.45,1.45);
    const slopeY=track.clamp(ySlope,-1.45,1.45);
    const height=floor+point.radius*Math.hypot(1,slopeX,slopeY);
    if(p.z<height){
      point.previous.z+=height-p.z;
      p.z=height;
      point.normal.set(-slopeX,-slopeY,1).normalize();
      point.contact=true;
    }
  }

  function step(){
    let maxMotion=0;
    let settledMotion=0;
    for(const point of points){
      point.incoming.subVectors(point.position,point.previous).multiplyScalar(.998);
      point.incoming.z-=9.81*dt*dt;
      point.previous.copy(point.position);
      point.position.add(point.incoming);
      maxMotion=Math.max(maxMotion,point.incoming.length());
      point.contact=false;
    }
    for(let pass=0;pass<6;pass++){
      for(const link of links){
        delta.subVectors(link.b.position,link.a.position);
        const distance=delta.length();
        if(distance<.0001)continue;
        const correction=(distance-track.clamp(distance,link.min,link.max))/distance;
        const weight=link.a.weight+link.b.weight;
        link.a.position.addScaledVector(delta,correction*link.a.weight/weight);
        link.b.position.addScaledVector(delta,-correction*link.b.weight/weight);
      }
      for(const point of points)collide(point);
    }
    for(const point of points){
      // Constraint projections may be large when the crash starts inside a
      // rock. They cannot create a new launch impulse on the next step.
      delta.subVectors(point.position,point.previous).clampLength(0,Math.min(.145,maxMotion+.004));
      delta.z=Math.min(delta.z,point.incoming.z+.021);
      if(point.contact){
        const approach=point.incoming.dot(point.normal);
        delta.addScaledVector(point.normal,-delta.dot(point.normal)).multiplyScalar(drag);
        if(approach<-.026)delta.addScaledVector(point.normal,-approach*.11);
      }
      point.previous.copy(point.position).sub(delta);
      settledMotion=Math.max(settledMotion,delta.length());
    }
    quietSteps=age>.5&&settledMotion<.0013?quietSteps+1:0;
    asleep=quietSteps>120;
  }

  function update(elapsed){
    if(asleep)return;
    accumulator+=Math.min(elapsed,.05);
    while(accumulator>=dt&&!asleep){
      step();
      accumulator-=dt;
      age+=dt;
    }
  }
  return {update,positions:points.map(point=>point.position)};
}
