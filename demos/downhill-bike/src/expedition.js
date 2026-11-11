/* One continuous mountain: the calibrated summit joins a longer forest,
 * rock gorge and valley. Render and tire contacts sample the same terrain. */
const BikeExpedition=(()=>{
  const baseTrack=typeof module!=='undefined'&&module.exports?require('./track.js'):BikeTrack;
  const clamp=baseTrack.clamp;
  const smooth=(a,b,x)=>{const t=clamp((x-a)/(b-a),0,1);return t*t*(3-2*t);};
  const hermite=(a,b,h0,h1,s0,s1,y)=>{
    const t=clamp((y-a)/(b-a),0,1),t2=t*t,t3=t2*t,d=b-a;
    return (2*t3-3*t2+1)*h0+(t3-2*t2+t)*d*s0+(-2*t3+3*t2)*h1+(t3-t2)*d*s1;
  };
  function makeTrack(seed=0,stage=1,layout={}){
    const base=baseTrack.makeTrack(seed,stage,layout),finish=2640,seam=620;
    const bounds={...base.bounds,bottom:finish+34};
    const mirror=base.mirrored;
    function region(y){
      const forest=smooth(500,720,y),gorge=smooth(1290,1450,y),valley=smooth(2010,2190,y);
      return {alpine:1-forest,forest:forest*(1-gorge),gorge:gorge*(1-valley),valley,
        name:y<620?'Open summit':y<1380?'Old-growth forest':y<2100?'Waterfall gorge':'Shelter valley'};
    }
    const knots=layout.freeride?[[620,0],[760,60],[920,150],[1080,238],[1240,325],[1380,408],
      [1550,515],[1740,630],[1920,735],[2100,835],[2300,940],[2460,1020],[2640,1090],[2700,1104]]:
      [[620,0],[760,22],[920,75],[1080,115],[1240,160],[1380,205],
      [1550,265],[1740,330],[1920,380],[2100,420],[2300,464],[2460,494],[2640,512],[2700,512]];
    function drop(y){
      if(y<=seam)return 0;if(y>=2700)return knots.at(-1)[1];
      const i=knots.findIndex(([n])=>n>y)-1,[a,h0]=knots[i],[b,h1]=knots[i+1];
      const before=knots[Math.max(0,i-1)],after=knots[Math.min(knots.length-1,i+2)];
      const s0=i===0?(layout.freeride?.28:0):(h1-before[1])/(b-before[0]),s1=i+1===knots.length-1?0:(after[1]-h0)/(after[0]-a);
      return hermite(a,b,h0,h1,s0,s1,y);
    }
    const floorOffset=base.sample(0,seam).z-base.valleyFloor(0);
    const baseFloor=x=>base.valleyFloor(x)+floorOffset;
    const ridge=y=>mirror*(22*Math.sin((y-seam)*.005)+9*Math.sin((y-seam)*.012));
    const rests=[760,1080,1380,1740,2100,2410].map((y,i)=>({
      x:(layout.freeride?[-67,64,-72,68,-64,72]:[-4,8,-8,5,-7,0])[i],y,
      rx:layout.freeride?28:55,ry:layout.freeride?16:27,grade:-.055}));
    const cuts=[
      {x:0,y:868,half:28,depth:4.5,skew:.23,saddles:[-40,22,64]},
      {x:0,y:1180,half:35,depth:6,skew:-.28,saddles:[-61,-17,43]},
      {x:0,y:1510,half:35,depth:11,skew:.32,saddles:[-46,16,65]},
      {x:0,y:1838,half:40,depth:13,skew:-.30,saddles:[-65,-21,44]},
      {x:0,y:2250,half:32,depth:4.5,skew:.17,saddles:[-44,18,63]}
    ];
    const roots=Array.from({length:28},(_,i)=>({x:mirror*((i%3-1)*33+9*Math.sin(i*2.8)),
      y:700+i*22,span:7+i%4,skew:(i%2?1:-1)*.25,height:.075+(i%3)*.018}));
    function natural(x,y){
      const w=smooth(seam,seam+65,y),r=region(y),cx=x-ridge(y);
      const relief=1.9*Math.sin(x*.068+y*.021)+1.4*Math.sin(x*.125-y*.032);
      // Broad banks and erosion, with room to traverse between choices.
      let z=baseFloor(x)-drop(y)+w*relief,shelf=0,erosion=0,root=0;
      for(const c of cuts){
        const across=mirror*x,along=y-c.y-c.skew*across;
        if(Math.abs(along)>c.half)continue;
        const saddle=Math.max(...c.saddles.map(s=>1-smooth(5,15,Math.abs(across-s))));
        const hollow=(1-smooth(.12,1,Math.abs(along)/c.half))*(1-smooth(90,115,Math.abs(x)))*(1-.92*saddle);
        z-=c.depth*hollow;erosion=Math.max(erosion,hollow);
      }
      for(const s of rests){
        if(Math.abs(y-s.y)>s.ry)continue;
        const f=1-smooth(.40,1,Math.hypot((x-mirror*s.x)/s.rx,(y-s.y)/s.ry));
        const plane=baseFloor(mirror*s.x)-drop(s.y)+(y-s.y)*s.grade;
        z+=(plane-z)*f;shelf=Math.max(shelf,f);
      }
      if(y>670&&y<1340&&shelf<.25)for(const q of roots){
        const across=x-q.x,along=y-q.y-q.skew*across;
        if(Math.abs(along)>1.3||Math.abs(across)>q.span)continue;
        const f=Math.exp(-Math.pow(along/.36,2))*(1-smooth(q.span-1.8,q.span,Math.abs(across)));
        z+=f*q.height;root=Math.max(root,f);
      }
      const exposure=clamp(.50+.30*Math.sin(x*.078+y*.037)+.18*Math.sin(x*.19-y*.015),0,1);
      const kind=root>.10?'roots':erosion>.28||r.gorge>.5&&exposure>.76?'gravel':
        layout.freeride&&exposure>(r.forest>.5?.44:.28)?'stone':exposure>.45?'dirt':'grass';
      return {z,kind,exposure,shelf,erosion,ledge:erosion*.65,safeOffset:cx,cutOffset:Infinity,root};
    }
    const extraJumps=[[-43,970,'Root Divide',5.8],[44,1270,'Timber Shelf',6.2],[-50,1615,'Gorge Leap',7.0],[38,1960,'Last Ledge',6.4]].map(([x,lip,name,gap])=>{
      gap*=layout.gapScale?layout.gapScale(lip):1;
      x*=mirror;
      const start=lip-26,land=lip+gap,catchEnd=land+27,runout=catchEnd+17,end=runout+8;
      const lift=layout.freeride?-.34:.10,catchSlope=layout.freeride?-.60:-.47,drop=layout.freeride?3.6:1.3,
        center=()=>x,width=y=>2.8+2*smooth(land-1,land+5,y);
      const h=y=>natural(x,y).z,s=y=>(h(y+.3)-h(y-.3))/.6;
      const takeoff=h(lip)+.45,landing=takeoff-drop,from=h(lip-12),fromSlope=s(lip-12),out=h(runout),outSlope=s(runout);
      const height=y=>y<lip-12?h(y):y<lip?hermite(lip-12,lip,from,takeoff,fromSlope,lift,y):
        y<land?Math.min(landing,h(y))-12:y<catchEnd?landing+catchSlope*(y-land):
        y<runout?hermite(catchEnd,runout,landing+catchSlope*27,out,catchSlope,outSlope,y):h(y);
      return {name,flank:x,lip,gap,start,land,catchEnd,runout,end,center,width,height,takeoff,landing,lift,catchSlope,min:40,max:65};
    });
    function sample(x,y){
      if(y<=seam)return base.sample(x,y);
      const ground=natural(x,y);let {z,kind}=ground,jump=null,jumpOffset=Infinity,gap=false,landing=false;
      for(const j of extraJumps){
        if(y<=j.start||y>=j.end)continue;
        const distance=Math.abs(x-j.center(y)),width=j.width(y);
        const influence=(1-smooth(width,width+3,distance))*smooth(j.start,j.start+5,y)*(1-smooth(j.end-5,j.end,y));
        if(!influence)continue;
        z+=(j.height(y)-z)*influence;jumpOffset=distance-width;
        if(distance<width+.35){jump=j;gap=y>=j.lip&&y<j.land;landing=y>=j.land&&y<j.runout;kind='dirt';}
      }
      const valley=smooth(finish-85,finish-10,y);
      z+=(baseFloor(x)-drop(y)-z)*valley;
      if(valley>.7)kind='grass';
      return {...ground,z,kind,jump,jumpOffset,gap,landing,valley};
    }
    let state=(seed^Math.imul(stage,1664525)^937155)>>>0;
    const random=()=>{state=(Math.imul(state,1664525)+1013904223)>>>0;return state/4294967296;};
    const clear=(x,y,r)=>rests.some(s=>Math.hypot((x-mirror*s.x)/s.rx,(y-s.y)/s.ry)<.65)||
      extraJumps.some(j=>y>j.start-5&&y<j.end+5&&Math.abs(x-j.center(y))<j.width(y)+r+4);
    const rocks=[...base.rocks];
    for(let i=0;i<61;i++){
      const y=690+i*30,x=mirror*(Math.sin(i*2.33)*66),r=1.4+(i%5)*.5;
      if(!clear(x,y,r))rocks.push([x,y,r]);
    }
    // Real collision islands offer left, right and traverse options.
    for(const [x,y,r] of [[0,808,5.5],[-6,1134,6],[5,1460,7],[-4,1784,6.5],[8,2183,4.5]])rocks.push([x*mirror,y,r]);
    const trees=[];
    for(let i=0;i<3600&&trees.length<(layout.freeride?650:850);i++){
      const x=bounds.left+12+random()*(bounds.right-bounds.left-24),y=670+random()*(finish-760),r=region(y),p=sample(x,y);
      if(random()>.16+r.forest*.78||p.gap||p.kind==='stone'||p.erosion>.4||clear(x,y,1.5))continue;
      if(rocks.some(([rx,ry,radius])=>Math.hypot(x-rx,y-ry)<radius+2.1))continue;
      const h=5+random()*6+r.forest*3,w=.7+random()*.35;
      trees.push({x,y,z:p.z,h,w});rocks.push([x,y,.24,'tree']);
    }
    const buckets=new Map();
    for(const rock of rocks){
      const [x,y,r]=rock;
      for(let k=Math.floor((y-r-1)/20);k<=Math.floor((y+r+1)/20);k++){
        if(!buckets.has(k))buckets.set(k,[]);buckets.get(k).push(rock);
      }
    }
    const inside=(x,y)=>x>bounds.left+2&&x<bounds.right-2&&y>bounds.top+2&&y<bounds.bottom-2;
    const valleyFloor=x=>baseFloor(x)-drop(finish);
    return {...base,finish,bounds,sample,inside,region,trees,roots,rocks,extraJumps,expedition:true,
      obstaclesAt:y=>buckets.get(Math.floor(y/20))||[],
      surfaces:{...base.surfaces,roots:{name:'Exposed roots',grip:.86,drag:.15},stone:{name:'Firm bedrock',grip:.96,drag:.075}},
      shelves:[...base.shelves,...rests],cuts:[...base.cuts,...cuts],jumps:[...base.jumps,...extraJumps],
      safeX:y=>y<=seam?base.safeX(y):ridge(y),valleyFloor,valleyZ:valleyFloor(0),
      reachedValley:(x,y,z)=>inside(x,y)&&y>=finish&&Math.abs(z-valleyFloor(x))<2.2,
      summitDrop:Math.round(base.sample(0,0).z-valleyFloor(0)),waterfallY:1660};
  }
  return Object.assign(makeTrack(),{makeTrack});
})();
if(typeof module!=='undefined'&&module.exports)module.exports=BikeExpedition;
