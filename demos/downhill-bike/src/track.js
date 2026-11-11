/* Metres, Z up, positive Y down the mountain. Seeded descents reuse a tested
 * ridge silhouette and vary the turn lines, grades and obstacle positions. */
const BikeTrack = (() => {
  const lowerStart = 218;
  const finish = lowerStart + 362;
  const bounds = { left: -116, right: 126, top: -28, bottom: finish + 34 };
  const summitLine = [[-28,-2],[0,0],[25,0],[45,1.5],[70,5],[95,13],[119,12],
    [141,1],[164,-9],[182,-8],[200,-3]];
  // Height in metres above the saddle where the lower mountain starts.
  const summitElevation = [[-28,180],[0,165],[23,154],[48,143],[77,127],[105,105],
    [135,78],[161,52],[184,30],[202,13]];
  const roadSource = [[-30,0],[0,0],[28,1],[53,8],[81,24],[115,36],[141,30],
    [164,12],[189,0],[217,-8],[249,-23],[275,-24],[306,-9],[332,1],[362,4],[398,4]];
  const chuteSource = [[46,5.7],[55,6.9],[66,6],[87,-2],[118,-7],[146,-2],[168,6.2],[180,4.4],[190,-.35]];
  const elevationSource = [[-30,91],[0,85],[29,77.8],[54,72],[87,64],[117,57],
    [147,49.4],[180,42],[218,34.5],[250,27.2],[276,21],[310,13.6],
    [342,7.4],[362,5.2],[398,5]];
  const rocksSource = [
    [-4,95,.69],[-8.8,113,.72],[-3,134,.64],[2.7,152,.73],
    [-16,120,1.8],[47,114,2.4],[40,172,2.1],[-36,257,2.6],[-16,284,1.35],
    [14,318,1.8],[-31,202,2.15],[18,208,2.3]
  ];
  // Shared biome weights drive materials and ambience, without marking routes.
  function region(y){
    const blend=(a,b)=>{const t=Math.max(0,Math.min(1,(y-a)/(b-a)));return t*t*(3-2*t);};
    const forest=blend(174,248),valley=blend(424,510);
    return {alpine:1-forest,forest:forest*(1-valley),valley,
      name:y<218?'Exposed summit':y<462?'Pine gorge':'Fern valley'};
  }
  const surfaces = {
    dirt:{name:'Packed dirt',grip:1.04,drag:.06},
    gravel:{name:'Loose rock',grip:.68,drag:.10},
    grass:{name:'Grass',grip:.72,drag:.26}
  };
  const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
  const smooth = (a,b,value) => {
    const t=clamp((value-a)/(b-a),0,1);
    return t*t*(3-2*t);
  };
  const ramp=(y,a,b,h0,h1,s0,s1)=>{
    const d=b-a,t=clamp((y-a)/d,0,1),q=t*t,c=q*t;
    return (2*c-3*q+1)*h0+(c-2*q+t)*d*s0+(-2*c+3*q)*h1+(c-q)*d*s1;
  };
  function spline(knots,y){
    const n=knots.length-1;
    if (y<=knots[0][0]) return knots[0][1];
    if (y>=knots[n][0]) return knots[n][1];
    let i=0;
    while(y>knots[i+1][0]) i++;
    const [a,x]=knots[i],[b,v]=knots[i+1];
    const [before,u]=knots[Math.max(0,i-1)],[after,w]=knots[Math.min(n,i+2)];
    const t=(y-a)/(b-a), t2=t*t, t3=t2*t;
    return (2*t3-3*t2+1)*x+(t3-2*t2+t)*(b-a)*(v-u)/(b-before)
      +(-2*t3+3*t2)*v+(t3-t2)*(b-a)*(w-x)/(after-a);
  }
  function makeTrack(seed=0,stage=1,layout={}){
    const value=seed>>>0,tier=clamp(Math.floor(stage)-1,0,4);
    const hash=Math.imul((value^Math.imul(stage,1640531527))>>>0,2246822519)>>>0;
    const authored=stage===1&&value===0;
    const mirrored=authored?1:hash&1?-1:1;
    const phase=(hash>>>8)*.000031;
    const widthFactor=authored?1:.96+tier*.039+((hash>>>5)&31)*.003;
    const grade=1.79+tier*.065+(authored?0:((hash>>>2)&15)*.004);
    const drift=y=>authored?0:Math.sin(y*.022+phase)*Math.min(5,1.8+tier*.65)*smooth(18,80,y);
    const offsetX=(x,y)=>{
      // Mirror the summit as a whole. Apply seeded lateral variation after
      // the long gaps, where the routes have room to shift without twisting the catches.
      const variation=smooth(200,260,y);
      return mirrored*x*(1+(widthFactor-1)*variation)+drift(y)*variation;
    };
    const flankX=(x,y)=>mirrored*x*(1+(widthFactor-1)*.48)+drift(y)*.52;
    const lowerKnots=knots=>knots.filter(([y])=>y>=0).map(([y,z])=>[y+lowerStart,z]);
    const road=summitLine.concat(lowerKnots(roadSource)).map(([y,x])=>{
      const low=y-lowerStart;
      const sweep=tier*Math.sin(low*.042+phase)*smooth(181,212,low)*(1-smooth(301,340,low));
      return [y,offsetX(x,y)+sweep];
    });
    const chute=lowerKnots(chuteSource).map(([y,x])=>[y,offsetX(x,y)]);
    const chuteStart=chute[0][0],chuteEnd=chute.at(-1)[0];
    const saddleZ=-36+80*grade;
    const elevation=summitElevation.map(([y,z])=>[y,saddleZ+z])
      .concat(lowerKnots(elevationSource).map(([y,z])=>[y,-36+(z-5)*grade]));
    const title=stage===1?'Ridge Run':['Timber Cut','Pine Divide','Scree Pass','The Last Drop'][(stage-2)%4];
    const chuteHalf=2.08-tier*.055;
    const rollers=tier?[226+(hash>>>16)%12,278+(hash>>>23)%15].slice(0,tier===1?1:2).map(y=>y+lowerStart):[];
    function rollerHeight(y){
      let z=0;
      for(const middle of rollers){
        const u=(y-middle)/5.8;
        if(Math.abs(u)<1)z+=(.28+tier*.071)*(1-u*u)**2;
      }
      return z;
    }
    const safeX = y => spline(road,y);
    const chuteX = y => spline(chute,y);
    const baseZ = y => spline(elevation,y)-(layout.freeride?.28*Math.max(0,y-510)*smooth(500,540,y):0);
    const chuteActive = y => y>=chuteStart && y<=chuteEnd;
    const mainWidth = y => y<12 ? 4.5 : y>finish-20 ? 5.1 : 4.05-tier*.085;
    const baseSlope=y=>(baseZ(y+.2)-baseZ(y-.2))/.4;
    const valleyZ=baseZ(finish);
    // The broad mountain needs traversable shoulders, not the short demo's
    // deep edge chutes. Construct jumps against this same grading.
    const shoulderDrop=x=>(layout.gentleFlanks?10:25)*smooth(39,77,Math.abs(x))+
      (layout.gentleFlanks?10:26)*smooth(100,126,Math.abs(x));
    const valleyFloor=x=>valleyZ-shoulderDrop(x);
    // Broad resting shelves and diagonal erosion cuts create spatial choices.
    // Their mouths taper into open hillside, so no crossing is compulsory.
    const shelves=[
      {x:0,y:15,rx:28,ry:12,grade:-.09},
      {x:3,y:252,rx:48,ry:22,grade:-.12},
      {x:-9,y:373,rx:62,ry:25,grade:-.10}
    ];
    const cuts=[
      {x:0,y:293,span:68,half:18,skew:.24,depth:7.2,saddles:[-23,29]},
      {x:-5,y:414,span:77,half:17,skew:-.22,depth:6.4,saddles:[-33,24]}
    ];
    const ravines=[
      {from:91,to:187,x:-55,bend:-9,width:11,depth:9},
      {from:129,to:244,x:61,bend:12,width:13,depth:11},
      {from:259,to:365,x:-80,bend:9,width:15,depth:8},
      {from:341,to:448,x:59,bend:-9,width:10,depth:7},
      {from:432,to:531,x:-54,bend:-12,width:13,depth:10}
    ];
    const jumps=[
      // Long catches accept the ballistic arc at normal downhill speeds.
      // A low lip and gradual runout also tolerate an early bunny hop.
      {name:'Knife Edge',lip:64,gap:10.8+tier*.18,side:-mirrored,min:43,max:85,branch:12,landingGuide:true,
        drop:11.5,lift:-.60,lipRise:.6,catchSlope:-.75,catchLength:42,runoutLength:22,pitDepth:19,catchWidth:5.25},
      {name:'Skyfall',lip:169,gap:15.3+tier*.22,side:mirrored,min:51,max:85,branch:15,landingGuide:true,
        drop:17,lift:-.70,lipRise:4.1,catchSlope:-.85,catchLength:35,runoutLength:13,pitDepth:28,catchWidth:5.10},
      {name:'Timber Gap',lip:lowerStart+222+(authored?0:(hash>>>12)%5),gap:5.6+tier*.28,side:mirrored,min:39,max:57,
        lift:.10,drop:1.05,catchSlope:-.46,catchLength:23,runoutLength:12,catchWidth:4.9},
      {name:'Quarry Drop',lip:lowerStart+306+(authored?0:(hash>>>18)%4),gap:7.6+tier*.34,side:-mirrored,min:46,max:62,
        lift:.12,catchSlope:-.48,catchLength:layout.freeride?28:21,runoutLength:layout.freeride?18:9,catchWidth:layout.freeride?8:4.65},
      {name:'Split Shale',flank:-52,lip:250,gap:4.5+tier*.15,min:37,max:50,
        lift:.10,drop:.9,catchSlope:-.43,catchLength:17,runoutLength:14,pitDepth:9,catchWidth:4.1},
      {name:'Pine Fault',flank:82,lip:358,gap:6.1+tier*.18,min:43,max:57,
        lift:.10,drop:1.55,catchSlope:-.54,catchLength:18,runoutLength:16,pitDepth:12,catchWidth:4.4},
      {name:'Slate Split',flank:-83,lip:459,gap:5.1+tier*.16,min:39,max:54,
        lift:.12,drop:1.05,catchSlope:-.46,catchLength:18,runoutLength:15,pitDepth:10,catchWidth:4.15}
    ].map(j=>{
      if(layout.freeride&&!j.landingGuide)j={...j,lift:-.24,drop:Math.max(j.drop||0,j.gap*.27+.7),catchWidth:Math.max(j.catchWidth||0,6.5)};
      const {lip,side,gap,branch=10.4,drop=gap*.12,lift=.16,lipRise=.55,catchSlope=-.50,catchLength=19,
        runoutLength=6,pitDepth=7.5,catchWidth=4.65}=j;
      const start=lip-(j.flank?26:37),land=lip+gap,catchEnd=land+catchLength;
      const runout=catchEnd+runoutLength,end=Math.min((layout.freeride?620:finish)-8,runout+15);
      const approach=j.flank?y=>flankX(j.flank+(y-lip)*.08,y):safeX;
      const startX=approach(start),lipX=j.flank?approach(lip):safeX(lip)+side*branch,endX=approach(end);
      const dx=clamp((lipX-startX)/(lip-start),-.38,.38)*(j.landingGuide?.52:1);
      const slope=y=>(approach(y+.2)-approach(y-.2))/.4;
      const line=y=>lipX+dx*(y-lip);
      const entry=lip-9,exit=j.landingGuide||layout.freeride&&j.name==='Quarry Drop'?catchEnd:land+14,entryX=line(entry),exitX=line(exit);
      const startSlope=slope(start),endSlope=slope(end);
      const center=y=>{
        if(y<=start||y>=end)return approach(y);
        if(y<entry)return ramp(y,start,entry,startX,entryX,startSlope,dx);
        if(y>exit)return ramp(y,exit,end,exitX,endX,dx,endSlope);
        return line(y);
      };
      const referenceHeight=j.flank?y=>naturalGround(center(y),y).z:baseZ;
      const referenceSlope=j.flank?y=>(referenceHeight(y+.2)-referenceHeight(y-.2))/.4:baseSlope;
      const takeoff=referenceHeight(lip)+lipRise,landing=takeoff-drop;
      const catchHeight=landing+catchSlope*catchLength;
      const width=y=>2.65+(catchWidth-2.65)*smooth(land-1,land+4,y);
      function height(y){
        if(y<lip-12)return referenceHeight(y);
        if(y<lip)return ramp(y,lip-12,lip,takeoffFrom,takeoff,fromSlope,lift);
        if(y<land)return Math.min(landing,referenceHeight(y))-pitDepth;
        if(y<catchEnd)return landing+catchSlope*(y-land);
        if(y<runout)return ramp(y,catchEnd,runout,catchHeight,runoutZ,catchSlope,toSlope);
        return referenceHeight(y);
      }
      const takeoffFrom=referenceHeight(lip-12),fromSlope=referenceSlope(lip-12);
      const runoutZ=referenceHeight(runout),toSlope=referenceSlope(runout);
      return {...j,start,land,catchEnd,runout,end,center,width,height,takeoff,lift,landing,catchSlope};
    });
    const slopeRocks=Array.from({length:15},(_,i)=>{
      const y=lowerStart+33+i*20.5;
      const wave=Math.sin(i*2.39+phase);
      const x=safeX(y)+mirrored*(i%2?1:-1)*(13+wave*4.4);
      return [x,y,.9+Math.abs(wave)*1.15];
    }).filter(([x,y,r])=>!chuteActive(y)||Math.abs(x-chuteX(y))>chuteHalf+r+2);
    const summitRocks=[[14,29,1.3],[-16,42,2.2],[26,64,3.4],[27,83,1.5],[-14,108,2.5],
      [-7,128,1.4],[24,151,2.7],[-19,166,2.4],[13,192,1.6],[-13,206,2.9]];
    const flankRocks=[[-46,92,2.1],[52,111,2.8],[-76,156,3.1],[75,178,3.6],[-87,220,2.9],
      [68,251,3.3],[-63,289,2.5],[97,315,4.1],[-101,357,3.9],[61,389,2.7],[-72,419,2.3],
      [92,445,3.4],[-53,501,3.1],[68,518,2.6]];
    const rocks=summitRocks.concat(rocksSource.map(([x,y,r])=>[x,y+lowerStart,r]))
      .map(([x,y,r])=>[offsetX(x,y),y,r]).concat(flankRocks.map(([x,y,r])=>[flankX(x,y),y,r]),slopeRocks)
      .filter(([x,y,r])=>
      !jumps.some(j=>y>=j.start&&y<=j.end&&Math.abs(x-j.center(y))<j.width(y)+r+1));
    // These are visible islands to ride around, not invisible route gates.
    for(const [x,y,r] of [[0,34,3.7],[1.7,37,2.5],[7,269,4.7],[-7,395,5.1]]){
      rocks.push([flankX(x,y),y,r]);
    }
    function offset(x,y,center){
      const dx=(center(y+.4)-center(y-.4))/.8;
      return (x-center(y))/Math.hypot(1,dx);
    }
    function naturalGround(x,y){
      const safeOffset=offset(x,y,safeX);
      const cutOffset=chuteActive(y)?offset(x,y,chuteX):Infinity;
      const mainHalf=mainWidth(y);
      const cutHalf=chuteHalf;
      const mainShoulder=1-smooth(mainHalf,mainHalf+4,Math.abs(safeOffset));
      const ridgeShoulder=1-smooth(mainHalf+5,mainHalf+17,Math.abs(safeOffset));
      const cutShoulder=1-smooth(cutHalf,cutHalf+2.2,Math.abs(cutOffset));
      const low=y-lowerStart;
      const envelope=smooth(54,96,low)*(1-smooth(152,190,low));
      const cutDepth=envelope*(2.3+tier*.21+.68*Math.sin((low-61)*.14)+.21*Math.sin(low*.62));
      const exposure=clamp(.48+.24*Math.sin(x*.32+y*.042)+.20*Math.sin(x*.13-y*.168)
        +.10*Math.sin(x*.51+y*.27),0,1);
      const edge=Math.abs(x),outer=smooth(42,78,edge);
      const flankRelief=outer*(3.4*Math.sin(x*.095+y*.034)+2.3*Math.cos(x*.046-y*.062));
      const mountain=(1.95*Math.sin(x*.18+y*.028)+1.65*Math.sin(x*.055-y*.04))+
        .28*Math.sin(x*.51+y*.33)+flankRelief-shoulderDrop(x);
      // Broad ridge support, without the old perfectly smooth narrow strip.
      const routeInfluence=Math.max(ridgeShoulder*.70,cutShoulder*.65);
      let z=baseZ(y)+mountain*(1-routeInfluence);
      const northShelf=smooth(99,114,low)*(1-smooth(146,163,low))*smooth(7.5,13.5,mirrored*safeOffset);
      const southShelf=smooth(226,241,low)*(1-smooth(261,276,low))*smooth(8,15,-mirrored*safeOffset);
      const accessStart=mirrored*safeOffset>0?39:75;
      const access=smooth(accessStart,accessStart+43,y);
      const summitExposure=(1-smooth(145,lowerStart,y))*smooth(15+5*access,31+25*access,Math.abs(safeOffset))*(1-.47*access);
      const summitRock=summitExposure*(.86+.14*Math.cos(x*.34-y*.076));
      let ravine=0;
      if(edge>32){
        for(const {from,to,x:mouth,bend,width,depth} of ravines){
          if(y<=from||y>=to)continue;
          const t=(y-from)/(to-from);
          const center=flankX(mouth+bend*Math.sin(Math.PI*t),y);
          const channel=smooth(0,.23,t)*(1-smooth(.70,1,t))*(1-smooth(width*.19,width,Math.abs(x-center)));
          z-=depth*channel;
          ravine=Math.max(ravine,channel);
        }
      }
      let ledge=Math.max(northShelf,southShelf,summitRock,ravine);
      z-=Math.max(northShelf,southShelf)*5.7+summitRock*(layout.gentleFlanks?18:52);
      const cutMix=cutShoulder*(1-mainShoulder);
      z-=cutDepth*cutMix;
      z+=mainShoulder*rollerHeight(y);
      z+=cutMix*Math.min(Math.abs(cutOffset),cutHalf)**2*.042;
      let shelf=0,erosion=0;
      for(const s of shelves){
        if(Math.abs(y-s.y)>=s.ry)continue;
        const center=flankX(s.x,s.y),radius=Math.hypot((x-center)/s.rx,(y-s.y)/s.ry);
        const blend=1-smooth(.42,1,radius);
        const height=baseZ(s.y)-shoulderDrop(center)+(y-s.y)*s.grade;
        z+=(height-z)*blend;shelf=Math.max(shelf,blend);
      }
      for(const cut of cuts){
        const across=mirrored*x-cut.x;
        const along=y-cut.y-cut.skew*across;
        if(Math.abs(along)>=cut.half||Math.abs(across)>=cut.span)continue;
        const bank=1-smooth(.16,1,Math.abs(along)/cut.half);
        const mouth=1-smooth(cut.span*.73,cut.span,Math.abs(across));
        const saddle=Math.max(1-smooth(5,15,Math.abs(across-cut.saddles[0])),
          1-smooth(5,15,Math.abs(across-cut.saddles[1])));
        const hollow=bank*mouth*(1-.88*saddle);
        z-=cut.depth*hollow;erosion=Math.max(erosion,hollow);
      }
      ledge=Math.max(ledge,erosion*.85);
      const kind=erosion>.35||ravine>.48||Math.abs(cutOffset)<=cutHalf&&Math.abs(safeOffset)>mainHalf?'gravel':
        exposure>.48?'dirt':'grass';
      return {z,kind,safeOffset,cutOffset,exposure,ledge,shelf,erosion};
    }
    function sample(x,y){
      const ground=naturalGround(x,y);
      let {z,kind}=ground;
      let jump=null,jumpOffset=Infinity,gap=false,landing=false;
      for(const j of jumps){
        if(y<=j.start||y>=j.end)continue;
        const distance=Math.abs(x-j.center(y));
        const width=j.width(y);
        const blend=smooth(j.start,j.start+6,y)*(1-smooth(j.end-6,j.end,y));
        const apron=j.landingGuide||j.flank?2.6*smooth(j.land,j.land+4,y):0;
        const influence=(1-smooth(width,width+2.4+apron,distance))*blend;
        if(influence<=0)continue;
        // A shallow bowl helps the tires settle on the shoulder of a catch.
        const bank=j.landingGuide?.32*Math.min(1,distance/width)**4*
          smooth(j.land,j.land+3,y)*(1-smooth(j.catchEnd-4,j.catchEnd,y)):0;
        z+=(j.height(y)+bank-z)*influence;
        jumpOffset=distance-width;
        if(distance<=width+.35){
          jump=j;gap=y>=j.lip&&y<j.land;landing=y>=j.land&&y<j.runout;
          if(distance<=width)kind='dirt';
        }
      }
      const valley=smooth(finish-36,finish-5,y);
      z+=(baseZ(y)-shoulderDrop(x)-z)*valley;
      if(valley>.85)kind='grass';
      return {...ground,z,kind,jump,jumpOffset,gap,landing,valley};
    }
    function inside(x,y){
      return x>bounds.left+2&&x<bounds.right-2&&y>bounds.top+2&&y<bounds.bottom-2;
    }
    function reachedValley(x,y,z){
      const floor=valleyFloor(x);
      return inside(x,y)&&y>=finish&&z>=floor-1&&z<=floor+2.2;
    }
    const summitDrop=Math.round(sample(safeX(0),0).z-sample(safeX(finish),finish).z);
    return {finish,valleyZ,valleyFloor,reachedValley,bounds,rocks,surfaces,clamp,safeX,chuteX,chuteActive,mainWidth,sample,inside,
      seed:value,stage,tier,mirrored,title,lowerStart,chuteStart,chuteEnd,chuteHalf,rollers,jumps,summitDrop,shelves,cuts,region};
  }
  return Object.assign(makeTrack(),{makeTrack});
})();
if(typeof module!=='undefined'&&module.exports)module.exports=BikeTrack;
