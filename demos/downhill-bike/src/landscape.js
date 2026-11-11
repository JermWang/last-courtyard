/* A broad, winding mountain around the calibrated expedition. Z remains up.
 * Sampling, obstacles and jump centers share the same horizontal transform;
 * this is actual rideable terrain, not a painted panorama or steering rail. */
const BikeLandscape=(()=>{
  const expedition=typeof module!=='undefined'&&module.exports?require('./expedition.js'):BikeExpedition;
  const clamp=expedition.clamp;
  const smooth=(a,b,x)=>{const t=clamp((x-a)/(b-a),0,1);return t*t*(3-2*t);};
  function makeTrack(seed=0,stage=1){
    const spineKnots=[[0,0],[220,0],[620,-90],[1000,130],[1420,-130],[1820,170],[2200,20],[2640,0]];
    function spineShape(y){
      if(y<=220)return 0;if(y>=2640)return 0;
      const i=spineKnots.findIndex(p=>p[0]>y)-1,[a,h0]=spineKnots[i],[b,h1]=spineKnots[i+1];
      const before=spineKnots[Math.max(0,i-1)],after=spineKnots[Math.min(spineKnots.length-1,i+2)];
      const s0=i===1?0:(h1-before[1])/(b-before[0]),s1=i+1===spineKnots.length-1?0:(after[1]-h0)/(after[0]-a);
      const t=(y-a)/(b-a),t2=t*t,t3=t2*t;
      return (2*t3-3*t2+1)*h0+(t3-2*t2+t)*(b-a)*s0+(-2*t3+3*t2)*h1+(t3-t2)*(b-a)*s1;
    }
    // Keep physical gap length consistent after bending the mountain. A gap
    // measured only along Y otherwise becomes much longer on a diagonal.
    const source=expedition.makeTrack(seed,stage,{gentleFlanks:true,freeride:true,gapScale:y=>1/Math.hypot(1,(spineShape(y+.1)-spineShape(y-.1))/.2)});
    const mirror=source.mirrored,spine=y=>mirror*spineShape(y);
    const bounds={left:-820,right:820,top:-160,bottom:source.finish+110};
    const hills=[[-235,590,100,170,58],[240,910,115,190,72],[-270,1280,125,180,86],
      [245,1600,120,190,95],[-230,1940,135,160,62],[260,2270,145,180,45]];
    // Short erosion pockets, not continuous barriers across the hillside.
    // Each has two low saddles plus open terrain around both tapered ends.
    const flankCuts=[
      [-210,405,50,10,1.8,.20], [210,530,55,10,2.0,-.18],
      [-235,810,66,10,2.8,.22], [235,850,63,11,3.0,-.20],
      [-310,1110,72,12,3.6,-.20], [190,1190,62,10,2.5,.24],
      [-215,1390,70,12,4.1,.25], [310,1440,68,11,3.8,-.24],
      [-300,1690,72,12,4.3,-.22], [215,1810,75,12,4.1,.20],
      [-250,2040,65,11,3.2,.18], [300,2110,70,12,3.4,-.18],
      [-170,2340,57,10,2.0,-.20], [180,2390,60,10,2.2,.20]
    ].map(([x,y,span,half,depth,skew])=>({x,y,span,half,depth,skew,saddles:[-span*.43,span*.40]}));
    const berms=[[-190,535,16,20,.65],[220,590,18,22,.75],[-185,925,16,20,.85],[310,990,18,22,1.1],[-340,1240,18,24,1.25],
      [230,1340,16,19,.9],[-180,1530,17,21,1.05],[345,1640,20,24,1.15],
      [-320,1880,17,22,1.0],[170,1970,18,21,.85],[-230,2220,18,24,.8],[315,2310,17,22,.75]];
    let flankShelves=[];
    // Broad exposed slab faces add optional steep commits. Their long
    // runouts rejoin the falling grade without an uphill exit or a gate.
    const slabs=[[-185,825,130,24,5.5,.16],[220,1040,145,30,6.5,-.20],[-230,1250,145,28,6,.18],
      [190,1480,155,30,7,-.22],[-240,1770,145,28,6.5,.16],[230,1980,140,28,6,-.18],[-180,2200,130,30,5,.15]];
    // Long rock spurs divide the face into traversable bowls. Their rounded
    // crests and open saddles are tire terrain, not decorative cliff meshes.
    const ridges=[[-360,650,205,420,100,.14],[380,930,210,450,115,-.16],
      [-290,1330,180,440,86,-.10],[355,1590,205,460,112,.14],
      [-390,1910,215,450,106,.10],[310,2200,190,380,68,-.16],
      [-590,1160,210,590,170,.08],[580,1850,220,610,190,-.10]];
    const bowls=[[-195,1010,115,220,20],[205,1360,120,230,24],
      [-200,1650,115,230,22],[200,2010,130,220,19]];
    function mountainShape(u,y){
      let height=0,ridge=0,bowl=0;
      for(const [cx,cy,width,length,rise,skew] of ridges){
        const along=(y-cy)/length,across=mirror*u-cx-skew*(y-cy);
        if(Math.abs(along)>=1||Math.abs(across)>=width)continue;
        const edge=Math.max(0,1-(Math.hypot(across,8)-8)/(width-8));
        const f=Math.pow(edge,1.45)*(1-smooth(.10,1,Math.abs(along)));
        height+=rise*f;ridge=Math.max(ridge,f);
      }
      for(const [cx,cy,rx,ry,depth] of bowls){
        const d=Math.hypot((mirror*u-cx)/rx,(y-cy)/ry);
        if(d>=1)continue;
        const f=(1-d*d)**2;height-=depth*f;bowl=Math.max(bowl,f);
      }
      const blend=smooth(100,185,Math.abs(u));
      return {height:height*blend,ridge:ridge*blend,bowl:bowl*blend};
    }
    function flankHeight(u,y){
      const outside=smooth(85,180,Math.abs(u));
      if(!outside)return 0;
      let h=5*Math.sin(u*.015+y*.008)+4*Math.sin(u*.027-y*.009);
      for(const [x,cy,rx,ry,rise] of hills){
        const d=((u-mirror*x)/(rx*1.25))**2+((y-cy)/(ry*1.10))**2;
        if(d<10)h+=rise*.30*Math.exp(-d*1.5);
      }
      // Irregular outer watersheds obscure the finite safety bounds. Their
      // rock faces are ordinary collision terrain, with no invisible walls.
      const edge=Math.abs(u)-(25*Math.sin(y*.007)+32*Math.sin(y*.0023));
      h+=smooth(480,920,edge)*(165+30*Math.sin(y*.005+u*.004));
      h-=smooth(950,1300,edge)*55;
      return outside*h;
    }
    const jumpMap=new Map(source.jumps.map(j=>[j,{...j,center:y=>j.center(y)+spine(y)}]));
    function baseSample(x,y){
      const u=x-spine(y),p=source.sample(u,y),outside=smooth(85,180,Math.abs(u));
      const outerBase=outside?source.sample(Math.sign(u)*126,y).z:p.z,mountain=mountainShape(u,y);
      let z=p.z+(outerBase-p.z)*smooth(115,210,Math.abs(u))+flankHeight(u,y)+mountain.height+
        10*smooth(100,126,Math.abs(u))*smooth(560,650,y)+
        10*smooth(39,77,Math.abs(u))*smooth(2050,2440,y),kind=p.kind;
      // An uphill back ridge closes the summit view, far behind the start.
      if(y< -18)z+=Math.pow((-18-y)/18,1.35)*7;
      let exposure=p.exposure;
      if(outside>.5){
        exposure=clamp(.45+.30*Math.sin(u*.024+y*.026)+.20*Math.sin(u*.057-y*.017),0,1);
        kind=Math.abs(u)>500?'gravel':exposure>.30?'stone':exposure>.18?'dirt':'grass';
      }
      let erosion=0,shelf=p.shelf,berm=0,slab=0;
      for(const [cx,cy,span,run,depth,skew] of slabs){
        const across=mirror*u-cx,along=y-cy-skew*across;
        if(Math.abs(across)>span||along<0||along>run+110)continue;
        const f=(1-smooth(span*.5,span,Math.abs(across)))*smooth(0,run,along)*(1-smooth(run,run+110,along));
        z-=depth*f;slab=Math.max(slab,f);
      }
      for(const c of flankCuts){
        const across=mirror*u-c.x,along=y-c.y-c.skew*across;
        if(Math.abs(across)>c.span||Math.abs(along)>c.half)continue;
        const saddle=Math.max(...c.saddles.map(s=>1-smooth(5,13,Math.abs(across-s))));
        const hollow=(1-smooth(.08,1,Math.abs(along)/c.half))*(1-smooth(c.span*.65,c.span,Math.abs(across)))*(1-.88*saddle);
        z-=c.depth*hollow;erosion=Math.max(erosion,hollow);
      }
      for(const [cx,cy,rx,ry,h] of berms){
        const d=((mirror*u-cx)/rx)**2+((y-cy)/ry)**2;
        if(d>=1)continue;
        const rise=h*(1-d)**3;z+=rise;berm=Math.max(berm,rise);
      }
      for(const s of flankShelves){
        if(Math.abs(y-s.y)>s.ry||Math.abs(x-s.worldX)>s.rx)continue;
        const f=1-smooth(.42,1,Math.hypot((x-s.worldX)/s.rx,(y-s.y)/s.ry));
        z+=(s.z+(y-s.y)*s.grade-z)*f;shelf=Math.max(shelf,f);
      }
      if(erosion>.20)kind='gravel';else if(slab>.15||mountain.ridge>.12)kind='stone';else if(berm>.12)kind='dirt';
      return {...p,z,kind,exposure,shelf,erosion:Math.max(p.erosion||0,erosion),berm,slab,ridge:mountain.ridge,bowl:mountain.bowl,jump:p.jump?jumpMap.get(p.jump):null,
        safeOffset:u-source.safeX(y),ledge:outside>.5?erosion*.45:p.ledge};
    }
    flankShelves=[[-260,1030],[260,1080],[-280,1570],[290,1730],[-260,2160],[250,2270]].map(([u,y])=>{
      const worldX=mirror*u+spine(y);
      return {x:worldX/mirror,worldX,y,z:baseSample(worldX,y).z,rx:32,ry:22,grade:-.065};
    });
    const blendHeight=(a,b,h0,h1,s0,s1,y)=>{
      const t=clamp((y-a)/(b-a),0,1),t2=t*t,t3=t2*t;
      return (2*t3-3*t2+1)*h0+(t3-2*t2+t)*(b-a)*s0+(-2*t3+3*t2)*h1+(t3-t2)*(b-a)*s1;
    };
    const flankJumps=[[-275,890,'Fern Notch'],[275,950,'Pine Step'],[-220,1300,'Root Shelf'],[330,1320,'Stone Skim'],
      [-340,1510,'Scree Notch'],[185,1680,'Birch Hollow'],[-190,1980,'Meadow Step'],[280,2300,'Valley Notch']].map(([u,lip,name],i)=>{
      const rawCenter=y=>mirror*u+spine(y),tangent=(rawCenter(lip+.1)-rawCenter(lip-.1))/.2,metric=Math.hypot(1,tangent);
      const longCatch=name==='Pine Step'||name==='Scree Notch';
      const gap=(1.8+(i%3)*.3)/metric,start=lip-20,land=lip+gap,
        catchEnd=land+(longCatch?30:22),runout=catchEnd+(longCatch?28:18),end=runout+10;
      // The fast catch follows the launch tangent. Bend back into the
      // mountain only after touchdown, rather than underneath a flying bike.
      const center=y=>!longCatch||y<=lip||y>=end?rawCenter(y):y<=catchEnd?rawCenter(lip)+tangent*(y-lip):
        blendHeight(catchEnd,end,rawCenter(lip)+tangent*(catchEnd-lip),rawCenter(end),tangent,
          (rawCenter(end+.1)-rawCenter(end-.1))/.2,y);
      const h=y=>baseSample(center(y),y).z,s=y=>(h(y+.3)-h(y-.3))/.6;
      const takeoff=h(lip)+.18,landing=takeoff-1.35,lift=-.34*metric,catchSlope=(longCatch?-.40:-.44)*metric;
      const approach=h(lip-11),approachSlope=s(lip-11),out=h(runout),outSlope=s(runout);
      const width=y=>3+(longCatch?6:2)*smooth(land,land+5,y);
      const height=y=>y<lip-11?h(y):y<lip?blendHeight(lip-11,lip,approach,takeoff,approachSlope,lift,y):
        y<land?Math.min(landing,h(y))-2.2:y<catchEnd?landing+catchSlope*(y-land):
        y<runout?blendHeight(catchEnd,runout,landing+catchSlope*(catchEnd-land),out,catchSlope,outSlope,y):h(y);
      return {name,flank:u,small:true,start,lip,gap,land,catchEnd,runout,end,center,width,height,takeoff,landing,lift,catchSlope,min:25,max:80};
    });
    function sample(x,y){
      const p=baseSample(x,y);
      for(const j of flankJumps){
        if(y<=j.start||y>=j.end)continue;
        const distance=Math.abs(x-j.center(y)),width=j.width(y);
        const f=(1-smooth(width,width+5,distance))*smooth(j.start,j.start+5,y)*(1-smooth(j.end-6,j.end,y));
        if(!f)continue;
        p.z+=(j.height(y)-p.z)*f;
        if(distance<width+.35)Object.assign(p,{jump:j,jumpOffset:distance-width,gap:y>=j.lip&&y<j.land,
          landing:y>=j.land&&y<j.runout,kind:'dirt'});
      }
      return p;
    }
    const clear=(x,y,r)=>source.shelves.some(s=>Math.hypot((x-spine(y)-mirror*s.x)/s.rx,(y-s.y)/s.ry)<.7)||
      source.jumps.some(j=>y>j.start-6&&y<j.end+6&&Math.abs(x-spine(y)-j.center(y))<j.width(y)+r+4)||
      flankShelves.some(s=>Math.hypot((x-s.worldX)/s.rx,(y-s.y)/s.ry)<.75)||
      flankJumps.some(j=>y>j.start-7&&y<j.end+7&&Math.abs(x-j.center(y))<j.width(y)+r+6);
    const rocks=source.rocks.map(([x,y,r,kind])=>[x+spine(y),y,r,kind]);
    // Broken rock crowns give the spurs a recognisable silhouette. These
    // use the same convex tire/impact surfaces as every other boulder.
    for(const [i,[cx,cy,width,length,,skew]] of ridges.entries())for(let n=0;n<5;n++){
      const y=cy+(n-2)*length*.16,u=cx+skew*(y-cy)+Math.sin(n*2.7+i)*width*.10;
      const x=mirror*u+spine(y),r=5+(i+n*3)%6;
      if(!insideRidgeBounds(x,y)||clear(x,y,r))continue;
      rocks.push([x,y,r]);
    }
    function insideRidgeBounds(x,y){return x>bounds.left+24&&x<bounds.right-24&&y>260&&y<source.finish-90;}
    const trees=source.trees.map(t=>({...t,x:t.x+spine(t.y),z:sample(t.x+spine(t.y),t.y).z}));
    let state=(seed^Math.imul(stage,2531011)^73023)>>>0;
    const random=()=>{state=(Math.imul(state,1664525)+1013904223)>>>0;return state/4294967296;};
    for(let i=0;i<1900;i++){
      const u=(random()<.5?-1:1)*(145+random()*300),y=230+random()*2330,x=u+spine(y),region=source.region(y);
      if(clear(x,y,3))continue;
      const p=sample(x,y);
      if(i%9===0){rocks.push([x,y,1.8+random()*3.2]);continue;}
      if(random()>.13+.78*region.forest||p.kind==='gravel'||p.kind==='stone')continue;
      if(rocks.some(([rx,ry,r])=>Math.abs(ry-y)<r+2&&Math.hypot(rx-x,ry-y)<r+2))continue;
      trees.push({x,y,z:p.z,h:5+random()*7,w:.7+random()*.4});rocks.push([x,y,.24,'tree']);
    }
    // Groups anchor the erosion pockets visually, leaving the saddles and
    // jump runouts open. Every visible boulder and new trunk shares collision.
    for(const [index,c] of flankCuts.entries()){
      for(let n=0;n<6;n++){
        const a=n*2.4+index,u=c.x+Math.cos(a)*(c.span*.72+random()*12),y=c.y+Math.sin(a)*19;
        const x=mirror*u+spine(y),r=.85+random()*1.7;
        if(clear(x,y,r)||rocks.some(([rx,ry,rr])=>Math.hypot(x-rx,y-ry)<r+rr+1.2))continue;
        rocks.push([x,y,r]);
      }
      const u=c.x+(index%2?1:-1)*(c.span+16),cy=c.y+38;
      for(let n=0;n<22;n++){
        const a=random()*Math.PI*2,d=6+random()*21,y=cy+Math.sin(a)*d,x=mirror*(u+Math.cos(a)*d)+spine(y);
        const p=sample(x,y);
        if(clear(x,y,2)||p.gap||p.erosion>.25||Math.abs(x-spine(y))>430||
          rocks.some(([rx,ry,r])=>Math.abs(ry-y)<r+3&&Math.hypot(x-rx,y-ry)<r+3))continue;
        trees.push({x,y,z:p.z,h:4+random()*6,w:.65+random()*.35});rocks.push([x,y,.24,'tree']);
      }
    }
    const buckets=new Map();
    for(const rock of rocks)for(let k=Math.floor((rock[1]-rock[2]-1)/20);k<=Math.floor((rock[1]+rock[2]+1)/20);k++){
      if(!buckets.has(k))buckets.set(k,[]);buckets.get(k).push(rock);
    }
    const inside=(x,y)=>x>bounds.left+2&&x<bounds.right-2&&y>bounds.top+2&&y<bounds.bottom-2;
    const valleyFloor=x=>sample(x,source.finish).z;
    return {...source,bounds,spine,spineKnots,sample,inside,rocks,trees,landscape:true,freeride:true,slabs,ridges,bowls,flankCuts,flankJumps,flankShelves,berms,
      obstaclesAt:y=>buckets.get(Math.floor(y/20))||[],valleyFloor,valleyZ:valleyFloor(0),
      safeX:y=>source.safeX(y)+spine(y),chuteX:y=>source.chuteX(y)+spine(y),
      shelves:source.shelves.map(s=>({...s,x:s.x+spine(s.y)/mirror})).concat(flankShelves),
      roots:source.roots.map(r=>{const factor=1+r.skew*(spine(r.y+.1)-spine(r.y-.1))/.2;
        return {...r,x:r.x+spine(r.y),span:r.span*factor,skew:r.skew/factor};}),
      jumps:[...jumpMap.values(),...flankJumps],extraJumps:source.extraJumps.map(j=>jumpMap.get(j)),
      reachedValley:(x,y,z)=>inside(x,y)&&y>=source.finish&&Math.abs(x)<600&&Math.abs(z-sample(x,y).z)<2.2,
      waterfallX:bounds.left-7,waterfallY:source.waterfallY};
  }
  return Object.assign(makeTrack(),{makeTrack});
})();
if(typeof module!=='undefined'&&module.exports)module.exports=BikeLandscape;
