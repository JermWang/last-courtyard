const assert = require('node:assert/strict');
const T = require('../src/track.js');
const M = require('../src/bike.js');

// Test-only itineraries through independently chosen crossings. No route
// samples or markers are sent to the game or used to move the player's bike.
function explorationLine(track,first=-1,second=-1){
  const a=first<0?-23:29,b=second<0?-38:19;
  const points=[[0,0],[10,first*2],[24,first*6.8],[39,first*6.8],[52,2],[80,6],[110,12],[150,-4],[200,-3],[225,2],
    [250,first<0?-12:22],[280,a],[310,a],[340,first<0?-22:29],[370,second<0?-24:18],
    [398,b],[418,b],[434,second<0?-38:29],[470,second<0?-42:28],[520,second<0?-44:23],[582,second<0?-45:25]];
  const base=y=>{
    let i=points.findIndex(([next])=>next>y);
    if(i<1)i=points.length-1;
    const [a,x]=points[i-1],[b,next]=points[i];
    return track.mirrored*(x+(next-x)*(y-a)/(b-a));
  };
  return y=>{
    let x=base(y);
    // Seeded rocks move. Plan a local detour around the actual visible
    // obstacle instead of demanding that every seed preserve one line.
    for(const [rx,ry,radius] of track.rocks){
      if(Math.abs(y-ry)>radius+24)continue;
      const separation=base(ry)-rx,clearance=radius+2.7;
      if(Math.abs(separation)>=clearance)continue;
      const direction=Math.sign(separation)||track.mirrored;
      x+=(direction*clearance-separation)*Math.exp(-Math.pow((y-ry)/(radius+9),2));
    }
    return x;
  };
}
function descent(chuteSpeed,track=T,wideSpeed=12.5,jumpSpeeds=null,chooseLine=explorationLine(track,-1,jumpSpeeds?1:-1)){
  const rider=M.create(track);
  rider.phase='riding';
  const landings=new Set();
  const takeoffs=new Set();
  const ridgeGaps=track.jumps.filter(jump=>!jump.flank);
  let inGap=null;
  for(let tick=0;tick<120*95&&rider.phase==='riding';tick++){
    const lookY=rider.y+4.6;
    const chute=chuteSpeed>0&&track.chuteActive(lookY)&&rider.y<track.chuteEnd-9;
    const rockClearance=chute?track.mirrored*1.48*Math.exp(-Math.pow((lookY-track.lowerStart-95)/8,2)):0;
    const jump=jumpSpeeds&&ridgeGaps.findLast(j=>lookY>=j.start&&rider.y<j.end);
    let lookX=(jump?jump.center(lookY):chute?track.chuteX(lookY):chooseLine(lookY))+rockClearance;
    const forkSide=jumpSpeeds?-track.mirrored:Math.sign(chooseLine(35))||-track.mirrored;
    const forkBlend=spread(1,20,lookY)*(1-spread(39,52,lookY));
    lookX+=(forkSide*6.8-lookX)*forkBlend;
    const angle=Math.atan2(lookX-rider.x,lookY-rider.y);
    const target=jump&&rider.y>jump.lip-23&&rider.y<jump.land+9?
      jumpSpeeds[track.jumps.indexOf(jump)]??(jump.min+jump.max)/7.2:
      chute?chuteSpeed:wideSpeed;
    M.step(rider,{
      steer:T.clamp((angle-rider.yaw)*3,-1,1),pedal:rider.speed<target-.8,
      brake:rider.speed>target,back:chute,airPitch:0
    },track);
    if(rider.flight)takeoffs.add(rider.flight.jump.name);
    if(jumpSpeeds){
      const ground=track.sample(rider.x,rider.y);
      if(ground.gap&&!rider.grounded)inGap=ground.jump;
      if(inGap&&rider.grounded&&rider.y>=inGap.land){
        if(ground.landing&&inGap===ground.jump)landings.add(inGap.name);
        inGap=null;
      }
    }
  }
  return Object.assign(rider,{landings:[...landings],takeoffs:[...takeoffs]});
}
const wide=descent(0), cut=descent(0,T,12.5,null,explorationLine(T,1,1));
assert.ok(T.summitDrop>=300&&T.finish>=550,'The summit should add a substantial descent above the original ridge');
assert.equal(wide.phase,'finished',wide.reason);
for(const first of [-1,1])for(const second of [-1,1]){
  const run=descent(0,T,11,null,explorationLine(T,first,second));
  assert.equal(run.phase,'finished','Crossing combination '+first+'/'+second+': '+run.reason);
}
for(const shelf of T.shelves){
  const x=shelf.x,y=shelf.y;
  const grade=T.sample(x,y+.5).z-T.sample(x,y-.5).z;
  assert.ok(Math.abs(grade)<.20,'The lookout must provide a gentle place to stop and scout');
}
for(const cut of T.cuts){
  const at=x=>T.sample(x,cut.y+cut.skew*(x-cut.x));
  assert.ok(at(cut.x).erosion>.9,'The central hollow should be a meaningful terrain depression');
  for(const saddle of cut.saddles){
    assert.ok(at(cut.x+saddle).erosion<.15,'Each ravine must retain two distinct shallow crossings');
  }
}
function spread(a,b,y){
  const t=T.clamp((y-a)/(b-a),0,1);
  return t*t*(3-2*t);
}
for(const side of [-1,1]){
  const line=y=>T.safeX(y)+side*(5.6*spread(5,31,y)+19*spread(537,580,y))+
    (side>0?5*Math.exp(-Math.pow((y-500)/17,2)):0);
  const flank=descent(0,T,10.8,null,line);
  assert.equal(flank.phase,'finished',flank.reason);
  assert.ok(side*(flank.x-T.safeX(flank.y))>20,'Either flank should reach the valley away from the old gate');
}
// Ride both banks of the new fissures all the way from the summit.
const flankLines=[
  [[0,0],[38,0],[76,4],[106,-8],[130,-19],[157,-39],[195,-41],[245,-39],[286,-43],
    [336,-46],[393,-52],[447,-67],[480,-69],[527,-61],[582,-64]],
  [[0,0],[38,0],[76,4],[104,-7],[128,-18],[158,-48],[194,-62],[248,-66],[282,-90],
    [332,-96],[351,-93],[370,-94],[399,-96],[449,-98],[486,-99],[530,-99],[582,-96]],
  [[0,0],[38,3],[76,16],[111,26],[148,43],[194,49],[247,54],[294,59],[350,65],
    [396,73],[446,68],[506,73],[582,70]],
  [[0,0],[38,3],[76,16],[111,30],[147,49],[175,64],[201,76],[247,91],[289,87],
    [321,88],[357,100],[395,100],[447,105],[501,105],[582,103]]
];
for(const points of flankLines){
  const line=y=>{
    const index=points.findIndex(([nextY])=>nextY>y);
    if(index<1)return points.at(-1)[1];
    const [a,x]=points[index-1],[b,nextX]=points[index];
    return x+(nextX-x)*(y-a)/(b-a);
  };
  const run=descent(0,T,11,null,line);
  assert.equal(run.phase,'finished',run.reason);
  assert.deepEqual(run.takeoffs,[],'A flank bypass should reach the valley without jumping a fissure');
  assert.ok(Math.abs(run.x-points.at(-1)[1])<3,'The ride should finish on the selected flank');
}
assert.equal(cut.phase,'finished',cut.reason);

const rolling=M.create();
rolling.phase='riding';
for(let i=0;i<120;i++)M.step(rolling,{steer:0,pedal:true,brake:false,back:false});
assert.ok(rolling.speed>3);
const before=rolling.speed;
for(let i=0;i<180;i++)M.step(rolling,{steer:0,pedal:false,brake:true,back:true});
assert.ok(rolling.speed<before*.25&&rolling.vy>=0,'Braking must settle the bike on the summit pitch without reversing');
assert.ok(rolling.shift>.65);
assert.equal(M.create().time,0);
const coasting=M.create();
coasting.phase='riding';
for(let i=0;i<4*120;i++)M.step(coasting,{steer:0});
const openingSpeed=coasting.speed*3.6;
assert.ok(openingSpeed>15&&openingSpeed<45,'The outlook should provide thinking room before the first fork');
for(let i=0;i<2400&&coasting.y<T.jumps[1].land;i++){
  M.step(coasting,{steer:0});
  if(coasting.phase==='crashed')break;
}
assert.ok(coasting.phase==='riding'&&coasting.y>=T.jumps[1].land,
  'An aligned approach may ride over the summit outcrop instead of triggering an obligatory rock crash');
for(const stage of [1,2,3,4,5,20]){
  for(const seed of [42,91,8320,2483051438,4294967295]){
    const generated=T.makeTrack(seed,stage);
    assert.equal(generated.sample(0,120).z,T.makeTrack(seed,stage).sample(0,120).z);
    const lap=descent(0,generated,10.3);
    assert.equal(lap.phase,'finished','Seed '+seed+', stage '+stage+': '+lap.reason);
  }
}
const hop=M.create();
hop.phase='riding';
const pedal={steer:0,pedal:true,brake:false,back:false};
for(let i=0;i<120;i++)M.step(hop,pedal);
M.step(hop,{...pedal,hop:true});
assert.ok(hop.grounded&&hop.hopAge>0,'The rider must load the bike before leaving the ground');
let highest=0;
let airborne=false;
for(let i=0;i<160&&hop.phase==='riding';i++){
  M.step(hop,pedal);
  const grade=T.sample(hop.x,hop.y+.5).z-T.sample(hop.x,hop.y-.5).z;
  highest=Math.max(highest,(hop.z-T.sample(hop.x,hop.y).z-M.clearance)/Math.hypot(1,grade));
  airborne ||= !hop.grounded;
}
assert.ok(airborne&&highest>.30&&highest<1&&hop.grounded&&hop.phase==='riding',
  'The hop must settle across the changing outlook grade: '+highest.toFixed(2)+' m');
for(const grade of [0,-.48]){
  const slopeTrack={...T,rocks:[],sample:(x,y)=>({z:grade*y,kind:'dirt',safeOffset:0,jump:null,gap:false})};
  const fastHop=M.create(slopeTrack);
  Object.assign(fastHop,{phase:'riding',vy:15,speed:15});
  M.step(fastHop,{steer:0,hop:true},slopeTrack);
  let apex=0;
  for(let i=0;i<96;i++){
    M.step(fastHop,{steer:0},slopeTrack);
    apex=Math.max(apex,fastHop.z-grade*fastHop.y-M.clearance);
  }
  assert.ok(apex>.30&&apex<.54&&fastHop.grounded,'Hop at 54 km/h on grade '+grade+': '+apex);
}
const jumps=descent(0,T,14,[]);
assert.equal(jumps.phase,'finished',jumps.reason+' at '+jumps.y);
assert.deepEqual(jumps.landings,T.jumps.filter(j=>!j.flank).map(j=>j.name),'Every ridge gap must land on its catch slope');
for(const seed of [91,2483051438]){
  const trail=T.makeTrack(seed,5);
  const allGaps=descent(0,trail,13,[]);
  assert.equal(allGaps.phase,'finished','Advanced seed '+seed+': '+allGaps.reason);
  assert.deepEqual(allGaps.landings,trail.jumps.filter(j=>!j.flank).map(j=>j.name));
}
const matchedBlue=descent(0,T,14);
assert.equal(matchedBlue.phase,'finished',matchedBlue.reason);
const short=descent(0,T,13,[7,8]);
assert.equal(short.crashInfo?.code,'short-gap');
assert.match(short.crashInfo.metrics,/Takeoff \d+ km\/h · Target/);
function launchTrial(jump,{speed=(jump.min+jump.max)/7.2,offset=0,headingError=0,guide=true,hop=false,pedal=false,distance=2,baseTrack=T}={}){
  const unguided={...jump,landingGuide:false};
  const track=guide?baseTrack:{...baseTrack,sample(x,y){
    const ground=baseTrack.sample(x,y);
    return ground.jump===jump?{...ground,jump:unguided}:ground;
  }};
  const y=jump.lip-distance,x=jump.center(y)+offset;
  const yaw=Math.atan2(jump.center(y+1)-jump.center(y-1),2)+headingError;
  const rider=M.create(track,y);
  Object.assign(rider,{phase:'riding',x,z:track.sample(x,y).z+M.clearance,yaw,speed,
    vx:speed*Math.sin(yaw),vy:speed*Math.cos(yaw)});
  const grade=track.sample(x+Math.sin(yaw)*.5,y+Math.cos(yaw)*.5).z-
    track.sample(x-Math.sin(yaw)*.5,y-Math.cos(yaw)*.5).z;
  rider.vz=grade*speed;rider.pitch=Math.atan(grade);
  for(let i=0;i<540&&rider.phase==='riding';i++){
    const inFlight=Boolean(rider.flight);
    M.step(rider,{steer:0,hop:hop&&i===0,pedal},track);
    if(inFlight&&!rider.flight&&rider.grounded){
      rider.catchOffset=Math.abs(rider.x-jump.center(rider.y));
      rider.landedOnCatch=track.sample(rider.x,rider.y).landing;
      break;
    }
  }
  return rider;
}
const [knifeEdge,skyfall]=T.jumps;
for(const jump of [knifeEdge,skyfall]){
  for(const kmh of [54,65,75,85])for(const hop of [false,true])for(const pedal of [false,true]){
    const fast=launchTrial(jump,{speed:kmh/3.6,hop,pedal});
    assert.ok(fast.phase==='riding'&&fast.grounded&&fast.landedOnCatch,
      jump.name+' at '+kmh+' km/h, hop '+hop+', pedal '+pedal+': '+fast.reason);
  }
}
for(const seed of [91,2483051438]){
  const trail=T.makeTrack(seed,5);
  for(const jump of trail.jumps.slice(0,2))for(const hop of [false,true]){
    const fast=launchTrial(jump,{speed:75/3.6,hop,baseTrack:trail});
    assert.ok(fast.phase==='riding'&&fast.grounded&&fast.landedOnCatch,
      'Seeded '+jump.name+' should catch a fast jump: '+fast.reason);
  }
}
for(const distance of [5,8])for(const kmh of [54,65,75,85]){
  const early=launchTrial(knifeEdge,{speed:kmh/3.6,distance,hop:true,pedal:true});
  assert.ok(early.phase==='riding'&&early.grounded&&early.landedOnCatch,
    'An early hop '+distance+' m before the first lip at '+kmh+' km/h should settle on its catch: '+early.reason);
}
const timberGap=T.jumps.find(jump=>jump.name==='Timber Gap');
const timberLanding=launchTrial(timberGap,{speed:56/3.6});
assert.ok(timberLanding.phase==='riding'&&timberLanding.grounded&&Number.isFinite(timberLanding.catchOffset),
  'A centered 56 km/h launch should land on the Timber Gap catch');
for(const jump of T.jumps.filter(jump=>jump.flank)){
  const landing=launchTrial(jump);
  assert.ok(landing.phase==='riding'&&landing.grounded&&Number.isFinite(landing.catchOffset),
    jump.name+' should have a rideable landing at its intended approach speed');
}
const wideAim={offset:1.7,headingError:.09};
const guided=launchTrial(skyfall,wideAim),unguided=launchTrial(skyfall,{...wideAim,guide:false});
assert.ok(Math.abs(unguided.x-guided.x)<1e-8&&Math.abs(unguided.y-guided.y)<1e-8,
  'Legacy landing-guide markers must not nudge the airborne trajectory');
const badlyAimed=launchTrial(skyfall,{headingError:.30});
assert.ok(!badlyAimed.landedOnCatch&&badlyAimed.phase==='crashed',
  'A badly aimed jump must not be relocated onto the catch');
const airBrake=M.create();
airBrake.phase='riding';
for(let i=0;i<120;i++)M.step(airBrake,pedal);
M.step(airBrake,{...pedal,hop:true});
for(let i=0;i<18&&airBrake.grounded;i++)M.step(airBrake,pedal);
assert.equal(airBrake.grounded,false);
const launchSpeed=airBrake.speed;
for(let i=0;i<24;i++)M.step(airBrake,{steer:0,brake:true});
assert.equal(airBrake.grounded,false);
assert.ok(Math.abs(airBrake.speed-launchSpeed)<.01,'Holding the brake in the air must not change travel speed');

const bank={...T,rocks:[],sample:x=>({z:.45*x,kind:'dirt',safeOffset:0,jump:null,gap:false})};
function bankLanding(steer,airPitch,initial={}){
  const rider=M.create(bank);
  Object.assign(rider,{phase:'riding',grounded:false,airTime:.18,z:M.clearance+2.6,speed:13,vy:13,vz:-5},initial);
  for(let i=0;i<120&&rider.phase==='riding'&&!rider.grounded;i++)M.step(rider,{steer,airPitch},bank);
  return rider;
}
const balanced=bankLanding(-1,0);
assert.ok(balanced.grounded&&balanced.phase==='riding'&&balanced.landingTime>0,
  'A hard landing with the bike aligned to the bank must be recoverable');
assert.equal(bankLanding(1,0).crashInfo?.code,'off-balance');
assert.equal(bankLanding(0,-1).phase,'riding','Holding pedal through a modest drop should be recoverable');
assert.equal(bankLanding(0,-1,{pitch:-1.2,z:M.clearance+.6,vz:-7}).crashInfo?.code,'nose-down',
  'A steep nose-first impact should still cause a clear crash');

function corner(kind,speed,{brake=false,steer=.8,steps=55,recovery=0}={}){
  const track={...T,rocks:[],sample:()=>({z:0,kind,safeOffset:0,jump:null,gap:false})};
  const rider=M.create(track);
  Object.assign(rider,{phase:'riding',speed,vy:speed});
  for(let i=0;i<steps;i++)M.step(rider,{steer,brake},track);
  for(let i=0;i<recovery;i++)M.step(rider,{steer:0},track);
  return rider;
}
const dirtBrake=corner('dirt',17,{brake:true}),gravelBrake=corner('gravel',17,{brake:true});
assert.ok(gravelBrake.rearSkid>dirtBrake.rearSkid&&gravelBrake.slip>dirtBrake.slip,
  'Braking into a turn must produce a stronger slide on gravel');
assert.ok(Math.abs(gravelBrake.rearSpin)<Math.abs(gravelBrake.spin),
  'The rear wheel must spin more slowly while braking into a slide');
const rollingTurn=corner('dirt',11),looseTurn=corner('gravel',11);
const brakeTurn=corner('dirt',11,{brake:true}),fastTurn=corner('dirt',20);
assert.ok(rollingTurn.slip<.35&&rollingTurn.rearSkid===0,'Packed dirt should hold its line at trail speed');
assert.ok(looseTurn.slip>rollingTurn.slip*1.5&&looseTurn.slip<.65&&looseTurn.rearSkid===0,
  'Gravel should have modest natural drift without rear wheel lock');
assert.ok(brakeTurn.slip>rollingTurn.slip*3&&brakeTurn.rearSkid>.4,'Braking should open up a controlled slide');
assert.ok(fastTurn.slip>rollingTurn.slip*3&&fastTurn.rearSkid===0,'Fast turns should still allow natural drift');
const fastLoose=corner('gravel',25,{steer:1,steps:110});
assert.ok(Math.abs(fastLoose.slipSide)/fastLoose.speed<.34,'A sustained high-speed turn should keep the rear from swinging too far');
const leftBrake=corner('gravel',17,{brake:true,steer:-.8});
assert.ok(leftBrake.yaw<0&&leftBrake.slipSide>0&&gravelBrake.yaw>0&&gravelBrake.slipSide<0,
  'The rear should slide outward for brake turns in either direction');
const straightBrake=corner('gravel',17,{brake:true,steer:0});
assert.ok(straightBrake.rearSkid<.3&&straightBrake.slip<.05,'Braking straight should not start a drift');
const recovered=corner('gravel',17,{brake:true,recovery:72});
assert.ok(recovered.slip<gravelBrake.slip*.25&&recovered.rearSkid<.03,'Letting go and straightening should bring grip back');
assert.ok(brakeTurn.forkLoad>brakeTurn.shockLoad+.04,'Braking must transfer load to the front');

const bump={...T,rocks:[],sample:(x,y)=>({
  z:.12*Math.exp(-Math.pow((y-4)/.43,2)),kind:'dirt',safeOffset:0,jump:null,gap:false
})};
const suspension=M.create(bump);
Object.assign(suspension,{phase:'riding',speed:8,vy:8});
let frontPeak=0,rearPeak=0,frontAt=0,rearAt=0;
for(let i=0;i<200;i++){
  M.step(suspension,{steer:0},bump);
  if(suspension.forkLoad>frontPeak){frontPeak=suspension.forkLoad;frontAt=suspension.y;}
  if(suspension.shockLoad>rearPeak){rearPeak=suspension.shockLoad;rearAt=suspension.y;}
}
assert.ok(frontPeak>.05&&rearPeak>.07&&rearAt>frontAt+1,'Each wheel should compress as it crosses the bump');
assert.ok(Math.abs(suspension.forkRate)+Math.abs(suspension.shockRate)<.01,'Suspension should settle after the bump');
const kicked=M.create(bank);
Object.assign(kicked,{phase:'riding',speed:9,vy:9});
assert.ok(M.startKick(kicked,1));
assert.equal(M.startKick(kicked,-1),false,'Kick cooldown must reject a second immediate kick');
M.takeKick(kicked,-4.9,0);
for(let i=0;i<30;i++)M.step(kicked,{steer:0},bank);
assert.ok(kicked.x<-.65,'A landed kick must push the rider sideways');
assert.equal(kicked.phase,'riding','Glancing contact must remain recoverable');
for(const side of [-1,1]){
  const victim=M.create();
  Object.assign(victim,{phase:'riding',speed:14,vy:14});
  assert.equal(M.takeKick(victim,side*5,.36,true),true);
  assert.equal(victim.crashInfo?.code,'kicked-off');
  assert.equal(victim.phase,'crashed');
  assert.ok(side*victim.vx>0&&victim.vy>14,'Bail should retain downhill momentum and the sideways kick');
  assert.equal(M.takeKick(victim,side*5,.36,true),false,'A fallen rider cannot be knocked off twice');
}
console.log('Opposite crossing itineraries: '+wide.time.toFixed(2)+' s and '+cut.time.toFixed(2)+' s.');
console.log('All four crossing combinations finish. Three resting shelves and both ravines retain their independent crossings.');
console.log('Four full flank lines bypass the new fissures. All three flank gaps have rideable landings.');
console.log('Thirty seeded wide trails are rideable. Bunny hop apex: '+highest.toFixed(2)+' m above rest clearance.');
console.log(T.summitDrop+' m of vertical descent. Matched cruise: spine '+matchedBlue.time.toFixed(2)+' s; four gaps '+jumps.time.toFixed(2)+' s.');
console.log('No-pedal coast: '+Math.round(openingSpeed)+' km/h at 4 s. An aligned approach rides over the visible summit outcrop.');
console.log('Both summit jumps catch 54–85 km/h coast-offs and hops, including held pedal input. Short and badly aimed jumps still crash.');
console.log('Aligned bank landings recover. Bad lean or pitch can cause a crash. Gravel skids more than packed dirt.');
console.log('Natural gravel drift stays modest. Brake slides work both ways and settle after release.');
