/* Two tire contacts support a damped chassis. The race solver runs at 120 Hz
 * inside a GDevelop scene event. */
const BikeMotion = (() => {
  const defaultTrack=typeof module!=='undefined'&&module.exports?require('./track.js'):BikeTrack;
  const solids=typeof module!=='undefined'&&module.exports?require('./solids.js'):BikeSolids;
  const {clamp}=defaultTrack;
  const follow=(value,target,rate)=>target+(value-target)*Math.exp(-rate*dt);
  const dt=1/120;
  const gravity=9.81;
  const clearance=.38;
  const hopWindup=.075,hopRecovery=.78,hopPop=2.72;
  function create(track=defaultTrack,y=0){
    const x=track.safeX(y),yaw=y===0?0:Math.atan2(track.safeX(y+1)-track.safeX(y-1),2);
    return {x,y,z:track.sample(x,y).z+clearance,vx:0,vy:0,vz:0,speed:0,yaw,
      lean:0,pitch:0,turn:0,shift:0,spin:0,rearSpin:0,crank:0,brake:0,drive:0,rearSkid:0,
      grip:1,slip:0,slipSide:0,grounded:true,compression:0,airTime:0,frontTravel:0,rearTravel:0,
      forkLoad:.042,shockLoad:.057,forkRate:0,shockRate:0,
      phase:'ready',time:0,peak:0,surface:'dirt',looseTime:0,reason:'',impact:0,
      crashInfo:null,flight:null,landingTime:0,hopAge:0,roughTime:0,airTrim:0,
      airPitchError:0,airRollError:0,kickSide:0,kickAge:0,kickCooldown:0,shove:0,
      recovery:0,recoveryLean:0,recoveryPending:false,saves:0,cleanLandings:0,lastSave:-10};
  }
  function axleContacts(track,x,y,yaw,center,ceiling=Infinity){
    const dx=Math.sin(yaw)*.64,dy=Math.cos(yaw)*.64;
    const contact=(ax,ay)=>{
      // A tire can overhang a face by part of its wheelbase. Use the face's
      // plane while the chassis remains supported, then leave it naturally.
      if(center.solid){const n=center.normal;return center.z-(n[0]*(ax-x)+n[1]*(ay-y))/n[2];}
      const tire=solids.sample(track,ax,ay,ceiling),j=center.jump;
      if(!center.gap&&tire.gap&&j===tire.jump){
        if(y<j.lip)return j.takeoff+j.lift*(ay-j.lip);
        if(y>=j.land)return j.landing+j.catchSlope*(ay-j.land);
      }
      return tire.z;
    };
    return [contact(x+dx,y+dy),contact(x-dx,y-dy)];
  }
  function suspension(rider,frontRise,rearRise,landing){
    const braking=rider.brake;
    const forkRest=rider.grounded?clamp(.042+braking*.065+frontRise*.042,0,.18):0;
    const shockRest=rider.grounded?clamp(.057-braking*.024+rearRise*.050,0,.20):0;
    const frontShare=clamp(.5-rider.pitch*.35,.27,.74);
    rider.forkRate+=landing*frontShare*.57;
    rider.shockRate+=landing*(1-frontShare)*.62;
    // Let the shock take an impact quickly, then slow the rebound so it
    // settles instead of throwing the rider back up off the trail.
    const forkDamping=rider.forkRate>=0?18:24;
    const shockDamping=rider.shockRate>=0?16:22;
    rider.forkRate+=((forkRest-rider.forkLoad)*245-rider.forkRate*forkDamping)*dt;
    rider.shockRate+=((shockRest-rider.shockLoad)*190-rider.shockRate*shockDamping)*dt;
    const forkNext=rider.forkLoad+rider.forkRate*dt;
    const shockNext=rider.shockLoad+rider.shockRate*dt;
    rider.forkLoad=clamp(forkNext,0,.20);
    rider.shockLoad=clamp(shockNext,0,.22);
    if(forkNext!==rider.forkLoad)rider.forkRate=0;
    if(shockNext!==rider.shockLoad)rider.shockRate=0;
    rider.compression=(rider.forkLoad+rider.shockLoad)*.5;
  }
  const kmh=speed=>Math.round(speed*3.6)+' km/h';
  const degrees=radians=>Math.round(Math.abs(radians)*180/Math.PI)+'°';
  function crash(rider,code,title,detail,metrics=''){
    rider.phase='crashed';
    rider.crashInfo={code,title,detail,metrics};
    rider.reason=title+'. '+detail;
  }
  function unsettle(rider,strength,side){
    // Contact determines the disturbance. No random impulse or steering snap.
    rider.recovery=Math.max(rider.recovery,clamp(strength,.20,1));
    rider.recoveryLean=clamp(side,-.34,.34);
    rider.recoveryPending=true;
  }
  function shortJump(rider,j,z){
    const speed=kmh(rider.flight?.speed??rider.speed);
    const below=Math.max(0,j.landing+clearance-z);
    crash(rider,'short-gap','Short of '+j.name,
      (rider.y<j.land?'You dropped into the gap before the landing.':'The bike hit the far bank below the landing.')+
      ' Carry more speed to the lip or go around on the hillside.',
      'Takeoff '+speed+' · Target '+j.min+'–'+j.max+' km/h'+(rider.y>=j.land&&below>.15?' · '+below.toFixed(1)+' m below the catch':''));
  }
  function failedLanding(rider,next,normalSpeed,limit,pitchError,rollError,sideways){
    const j=next.solid?null:rider.flight?.jump;
    const impact='Impact '+normalSpeed.toFixed(1)+' m/s';
    const takeoff=j?' · Takeoff '+kmh(rider.flight.speed):'';
    if(Math.abs(sideways)>5&&normalSpeed<limit){
      crash(rider,'sideways','Landed sideways',
        'The wheels were turned away from your direction of travel. Straighten the bike in the air.',
        'Sideways speed '+kmh(Math.abs(sideways))+' · '+impact);return;
    }
    if(Math.abs(rollError)>.50&&Math.abs(rollError)>Math.abs(pitchError)&&normalSpeed<limit){
      crash(rider,'off-balance','Landed off balance',
        'The bike leaned too far for the bank. Use A or D to match the slope before touchdown.',
        degrees(rollError)+' off the bank · '+impact);return;
    }
    if(Math.abs(pitchError)>.56&&normalSpeed<limit){
      crash(rider,pitchError<0?'nose-down':'nose-high',pitchError<0?'Nose too low':'Nose too high',
        pitchError<0?'The nose was too low for the slope. Tap S to bring it up.':'The nose was too high for the slope. Tap W to bring it down.',
        degrees(pitchError)+' off the slope · '+impact);return;
    }
    crash(rider,'hard-landing','Hard landing',
      'The impact into the surface was too heavy. Match the slope and use a longer downslope to absorb the drop.',
      impact+' · Bike limit '+limit.toFixed(1)+' m/s'+takeoff);
  }
  function startKick(rider,side){
    if(rider.phase!=='riding'||rider.kickCooldown>0||Math.abs(side)!==1)return false;
    rider.kickSide=side;
    rider.kickAge=dt;
    rider.kickCooldown=.70;
    return true;
  }
  function takeKick(rider,x,y,solid=false){
    if(rider.phase!=='riding'||!Number.isFinite(x)||!Number.isFinite(y))return false;
    rider.vx+=x;
    rider.vy+=y;
    rider.lean=clamp(rider.lean+.31*Math.sign(x*Math.cos(rider.yaw)-y*Math.sin(rider.yaw)),-.78,.78);
    rider.shove=.40;
    if(solid){
      crash(rider,'kicked-off','Kicked off the bike',
        'Another rider landed a square kick alongside you. Leave room or time your own kick before they get level.',
        'Close contact · '+kmh(rider.speed));
    }
    return true;
  }
  function startFlight(jump,rider){
    return {jump,speed:rider.speed};
  }
  function step(rider,input,T=defaultTrack){
    if(rider.phase!=='riding')return;
    rider.time+=dt;
    rider.impact=Math.max(0,rider.impact-dt*7);
    rider.landingTime=Math.max(0,rider.landingTime-dt);
    rider.kickCooldown=Math.max(0,rider.kickCooldown-dt);
    rider.shove=Math.max(0,rider.shove-dt);
    if(rider.grounded&&rider.recovery>0){
      const countersteer=input.steer*rider.recoveryLean<-.035;
      const calm=Math.abs(input.steer)<.22;
      rider.recovery=Math.max(0,rider.recovery-dt*(countersteer?1.25:calm?.72:.38));
      rider.recoveryLean*=Math.exp(-(countersteer?7:calm?3.6:1.8)*dt);
      if(rider.recovery===0&&rider.recoveryPending){
        rider.saves++;rider.lastSave=rider.time;rider.recoveryPending=false;
      }
    }
    if(rider.kickAge>0)rider.kickAge=rider.kickAge>=.38?0:rider.kickAge+dt;
    const {x,y,z}=rider;
    const ground=solids.sample(T,x,y,z-clearance);
    const [front,rear]=axleContacts(T,x,y,rider.yaw,ground,z-clearance);
    const groundPitch=Math.atan2(front-rear,1.28);
    const heldGround=rider.grounded;
    const beforeHop=rider.hopAge;
    if(beforeHop>0)rider.hopAge=beforeHop+dt>=hopRecovery?0:beforeHop+dt;
    if(input.hop&&heldGround&&rider.speed>2.2&&rider.hopAge===0)rider.hopAge=dt;
    if(beforeHop<hopWindup&&rider.hopAge>=hopWindup){
      if(heldGround&&!ground.gap){
        // Apply a bounded impulse along the actual surface normal. Dividing
        // the vertical impulse by cos(slope) injected extra energy on steeps.
        const sx=ground.solid?-ground.normal[0]/ground.normal[2]:
          (T.sample(x+.25,y).z-T.sample(x-.25,y).z)*2;
        const sy=ground.solid?-ground.normal[1]/ground.normal[2]:
          (T.sample(x,y+.25).z-T.sample(x,y-.25).z)*2;
        const n=Math.hypot(1,sx,sy),pop=hopPop/Math.sqrt(n);
        rider.vz=sx*rider.vx+sy*rider.vy+pop/n;
        rider.vx-=sx*pop/n;rider.vy-=sy*pop/n;
        rider.grounded=false;
        rider.pitch+=.043;
      }else rider.hopAge=0;
    }
    const surface=T.surfaces[ground.kind];
    rider.surface=ground.kind;
    rider.grip=surface.grip;
    rider.shift=follow(rider.shift,rider.grounded?Number(!!input.brake||!!input.back)*.76:0,8.3);
    rider.brake=follow(rider.brake,Number(!!input.brake),input.brake?13:19);
    rider.drive=follow(rider.drive,rider.grounded?Number(!!input.pedal):0,16);
    const airPitch=input.airPitch??(Number(!!input.back)-Number(!!input.pedal));
    rider.airTrim=follow(rider.airTrim,rider.grounded?0:clamp(airPitch,-1,1),7);
    rider.turn=follow(rider.turn,clamp(input.steer,-1,1),11.5);
    const speed=Math.hypot(rider.vx,rider.vy);
    const pressure=rider.brake*(.58+.42*rider.brake);
    const loose=clamp((1.04-surface.grip)/.36,0,1);
    const turning=clamp((Math.abs(rider.turn)-.09)/.72,0,1);
    const lockDemand=clamp((pressure*(1+.17*loose)-.38)*1.45,0,1);
    const lock=rider.grounded&&input.brake?lockDemand*clamp((speed-3.5)/5,0,1)*(.19+.81*turning):0;
    rider.rearSkid=follow(rider.rearSkid,lock,lock>rider.rearSkid?9:15);
    const sideBefore=rider.vx*Math.cos(rider.yaw)-rider.vy*Math.sin(rider.yaw);
    const slideRatio=Math.abs(sideBefore)/Math.max(speed,1);
    // Ease the steering into a growing slide. Countersteering keeps its full response.
    const growingSlide=rider.grounded&&sideBefore*rider.turn<0;
    const driftLimit=.15+.035*loose+.11*rider.rearSkid;
    const steeringSupport=growingSlide?1-.73*clamp((slideRatio-driftLimit)/.16,0,1):1;
    const baseSteer=rider.turn*(.95+Math.min(speed,16)*.021)*clamp(speed/1.8,0,1)/(1+.038*Math.max(0,speed-15));
    const steerRate=baseSteer*(1+.14*rider.rearSkid)*steeringSupport;
    rider.yaw+=steerRate*(rider.grounded?1:.21)*dt;
    if(rider.grounded){
      // The front tire still guides the bike as the rear slides. Its pull
      // fades with speed and brake pressure, and returns as the brake lifts.
      const coastGrip=(.18+.56*clamp((20-speed)/9,0,1))*(1-.38*loose);
      const rollingGrip=coastGrip*(1-.85*pressure)*(1-.35*rider.rearSkid)*(1-rider.shove*1.5);
      const turn=steerRate*dt*rollingGrip;
      const oldX=rider.vx;
      rider.vx=oldX*Math.cos(turn)+rider.vy*Math.sin(turn);
      rider.vy=rider.vy*Math.cos(turn)-oldX*Math.sin(turn);
    }
    const fx=Math.sin(rider.yaw),fy=Math.cos(rider.yaw);
    let forward=rider.vx*fx+rider.vy*fy;
    let sideways=rider.vx*fy-rider.vy*fx;
    if(rider.grounded){
      const settled=1-.22*clamp(rider.landingTime/.18,0,1)-rider.shove*.95-.10*rider.recovery;
      const pedal=rider.drive*(1-pressure)*3.9*clamp(1-Math.max(0,forward)/24,0,1);
      const downhillForce=-gravity*Math.sin(groundPitch);
      const resistance=surface.drag*forward+.0055*forward*Math.abs(forward);
      forward+=(downhillForce+pedal-resistance)*dt;
      const brake=pressure*settled*surface.grip*(9.75+rider.shift*.85)*(1-.15*rider.rearSkid)*dt;
      forward=Math.sign(forward)*Math.max(0,Math.abs(forward)-brake);
      if(!input.pedal&&speed<.1&&Math.abs(groundPitch)<.026)forward=0;
      const cross=ground.solid?-(ground.normal[0]*fy-ground.normal[1]*fx)/ground.normal[2]:
        (T.sample(x+fy*.4,y-fx*.4).z-T.sample(x-fy*.4,y+fx*.4).z)/.8;
      sideways-=clamp(cross,-1.2,1.2)*4.6*dt;
      // Braking spends part of the tire's grip that would otherwise be
      // available for turning. Brief skids remain recoverable on dirt.
      const straightening=(1-turning)*(1-pressure);
      const lateralBudget=settled*surface.grip*9.81*(1+.24*straightening)*
        Math.sqrt(1-(.39+.29*rider.rearSkid)*pressure*pressure)*dt;
      sideways-=clamp(sideways*dt*(10+2*straightening-4*rider.rearSkid),-lateralBudget,lateralBudget);
      rider.vx=fx*forward+fy*sideways;
      rider.vy=fy*forward-fx*sideways;
      // A supported bike moves along the contact plane. Stale vertical
      // velocity (including a practice start at speed) must not launch it
      // horizontally off an otherwise continuous downhill surface.
      rider.vz=clamp(Math.tan(groundPitch)*forward+cross*sideways,-32,12);
    }
    rider.slip+=(Math.abs(sideways)-rider.slip)*dt*9;
    rider.slipSide=sideways;
    const speedNow=Math.hypot(rider.vx,rider.vy);
    if(speedNow>25){rider.vx*=25/speedNow;rider.vy*=25/speedNow;}
    rider.speed=Math.min(speedNow,25);
    rider.peak=Math.max(rider.speed,rider.peak);
    const spinStep=forward*dt/.355;
    rider.spin-=spinStep;
    rider.rearSpin-=spinStep*(1-.83*rider.rearSkid);
    rider.crank+=rider.drive*(1-rider.brake)*clamp(2.2+rider.speed*.43,2.2,9.5)*dt;
    if(Math.abs(rider.yaw)>Math.PI*2)rider.yaw-=Math.sign(rider.yaw)*Math.PI*2;
    rider.x+=rider.vx*dt;
    rider.y+=rider.vy*dt;
    const next=solids.sample(T,rider.x,rider.y,Math.max(z,z+(rider.vz-gravity*dt)*dt)-clearance);
    const j=next.jump;
    if(j&&next.gap&&y<j.lip&&rider.y>=j.lip&&!rider.flight){
      if(rider.grounded&&rider.vy>0){
        rider.grounded=false;
        rider.vz=rider.vy*j.lift;
      }
      rider.flight=startFlight(j,rider);
    }
    const flightJump=rider.flight?.jump;
    if(flightJump&&y<flightJump.land&&rider.y>=flightJump.land&&next.jump===flightJump&&z<flightJump.landing+clearance-.42){
      shortJump(rider,flightJump,z);return;
    }
    const [nextFront,nextRear]=axleContacts(T,rider.x,rider.y,rider.yaw,next,z-clearance);
    const floor=Math.max((nextFront+nextRear)*.5,next.z-.035)+clearance;
    const hopFlight=!rider.grounded&&rider.hopAge>=hopWindup&&!rider.flight;
    const popPhase=rider.hopAge-hopWindup;
    const popPitch=hopFlight?.12*Math.max(0,1-Math.abs(popPhase-.062)/.12):0;
    const travelPitch=clamp(Math.atan2(rider.vz,Math.max(3,rider.speed)),-.86,.62);
    let slopePitch=flightJump?Math.atan(flightJump.catchSlope*fy):clamp(groundPitch,-.78,.62);
    let slopeRoll=0;
    if(!rider.grounded){
      const lookTime=clamp((z-floor)/Math.max(3,-rider.vz),.17,.48);
      const ax=rider.x+rider.vx*lookTime,ay=rider.y+rider.vy*lookTime;
      const landing=solids.sample(T,ax,ay,z-clearance);
      if(!landing.gap){
        const [aimFront,aimRear]=axleContacts(T,ax,ay,rider.yaw,landing);
        slopePitch=clamp(Math.atan2(aimFront-aimRear,1.28),-.82,.65);
        const left=solids.sample(T,ax-fy*.38,ay+fx*.38,z-clearance);
        const right=solids.sample(T,ax+fy*.38,ay-fx*.38,z-clearance);
        if(!left.gap&&!right.gap)slopeRoll=clamp(-Math.atan2(right.z-left.z,.76),-.80,.80);
      }
    }
    const slopeBlend=rider.vz<0?.70:.16;
    const airTarget=travelPitch+(slopePitch-travelPitch)*slopeBlend;
    const pitchTarget=rider.grounded?groundPitch+.055*rider.shift-.048*rider.brake:
      clamp(airTarget+.40*rider.airTrim+popPitch,-1.12,.85);
    rider.pitch=follow(rider.pitch,pitchTarget,rider.grounded?12:hopFlight?10:rider.vz<0?4.6:3.9);
    const leanTarget=rider.grounded?clamp(steerRate*rider.speed*.060+rider.recoveryLean,-.65,.65):rider.turn*.71+slopeRoll*.23;
    rider.lean=follow(rider.lean,leanTarget,rider.grounded?9:6);
    rider.airPitchError=rider.pitch-slopePitch;
    rider.airRollError=rider.lean-slopeRoll;
    const predicted=z+(rider.vz-gravity*dt)*dt;
    const rideDrop=clamp(.053+rider.speed*.003,.053,.115);
    let landingImpulse=0;
    if(next.gap&&predicted<next.z+clearance+.6){
      shortJump(rider,next.jump,predicted);return;
    }
    // Compare the next tire contact with the bike's current vertical motion.
    // A smooth steep slope can stay under the tires even at high speed.
    const followsSlope=rider.grounded&&floor>=predicted-rideDrop&&Math.abs(floor-z)<.32;
    const wheelReach=!rider.grounded&&!flightJump&&!hopFlight&&rider.airTime<.12&&rider.vz<=0&&
      predicted-floor<=.16&&Math.abs(floor-z)<.30;
    if(!next.gap&&(predicted<=floor||followsSlope||wheelReach)){
      const pitchError=rider.pitch-Math.atan2(nextFront-nextRear,1.28);
      if(!rider.grounded&&rider.airTime>.085&&predicted<=floor){
        const sx=next.solid?-next.normal[0]/next.normal[2]:(T.sample(rider.x+.25,rider.y).z-T.sample(rider.x-.25,rider.y).z)*2;
        const sy=next.solid?-next.normal[1]/next.normal[2]:next.landing&&rider.y-next.jump.land<.25?next.jump.catchSlope:
          (T.sample(rider.x,rider.y+.25).z-T.sample(rider.x,rider.y-.25).z)*2;
        const hit=Math.max(0,(sx*rider.vx+sy*rider.vy-rider.vz)/Math.hypot(1,sx,sy));
        rider.impact=clamp(hit*.14,0,1);
        const bankRoll=-Math.atan(sx*fy-sy*fx);
        const rollError=rider.lean-bankRoll;
        // Suspension support fades with misalignment instead of switching
        // off at a single angle. Small corrections should have small effects.
        const alignment=clamp(1-Math.max(
          Math.max(0,Math.abs(pitchError)-.26)/.46,
          Math.max(0,Math.abs(rollError)-.24)/.44,
          Math.max(0,Math.abs(sideways)-2)/4.4),0,1);
        // Wheel alignment earns the same suspension tolerance on a boulder,
        // an unmarked bank or an authored catch. A label is not extra grip.
        const limit=8.8+alignment*4.0;
        const pitchCost=Math.max(0,Math.abs(pitchError)-.43)*5.4;
        const rollCost=Math.max(0,Math.abs(rollError)-.36)*5.2;
        const sideCost=Math.max(0,Math.abs(sideways)-3.7)*.62;
        const load=hit+pitchCost+rollCost+sideCost;
        // A moderately overloaded, reasonably aligned landing gets a save
        // window. Severe nose/side impacts still bail with a specific reason.
        const dangerousAngle=Math.abs(pitchError)>.78||Math.abs(rollError)>.82||Math.abs(sideways)>7.2;
        if(hit>3.5&&(load>limit+2.1||dangerousAngle&&load>limit)){
          failedLanding(rider,next,hit,limit,pitchError,rollError,sideways);return;
        }
        if(load>Math.min(9,limit*.78)&&hit>3.5){
          unsettle(rider,(load-limit*.68)/4,rollError*.6+sideways*.035);
        }else if(rider.airTime>.28&&hit>1.8){rider.cleanLandings++;}
        const scrub=1-clamp((load-2.2)*.023,0,.18);
        rider.vx*=scrub;rider.vy*=scrub;
        rider.landingTime=.25*clamp(load/limit,0,1);
        landingImpulse=hit;
      }
      // Contact correction is not takeoff energy. On the first landing,
      // follow the catch's tangent instead of turning a small penetration
      // into an artificial upward launch on the next step.
      rider.vz=!rider.grounded||wheelReach&&predicted>floor?
        clamp((nextFront-nextRear)/1.28*forward,-26,12):clamp((floor-z)/dt,-26,12);
      rider.z=floor;rider.grounded=true;rider.airTime=0;
      rider.supportId=next.solid?.index??null;
      rider.flight=null;
    } else {
      rider.z=predicted;rider.vz-=gravity*dt;rider.grounded=false;
      rider.supportId=null;
      rider.airTime+=dt;
    }
    // Remove the underlying grade so suspension responds to bumps and
    // changes in slope, rather than compressing on every descent.
    const gradeStep=forward*Math.tan(groundPitch)*dt;
    suspension(rider,(nextFront-front-gradeStep)/dt,(nextRear-rear-gradeStep)/dt,landingImpulse);
    const pitchHeight=Math.sin(rider.pitch)*.64;
    rider.frontTravel=follow(rider.frontTravel,rider.grounded?
      clamp(nextFront+clearance-rider.z-pitchHeight,-.14,.14):0,24);
    rider.rearTravel=follow(rider.rearTravel,rider.grounded?
      clamp(nextRear+clearance-rider.z+pitchHeight,-.14,.14):0,24);
    if(!T.inside(rider.x,rider.y)){
      crash(rider,'off-course','Off the mountain','Give the exposed edges more room.','Exit speed '+kmh(rider.speed));return;
    }
    const offSlope=(next.z-ground.z)/Math.max(.025,rider.speed*dt);
    const rough=next.kind==='grass'&&rider.grounded&&rider.landingTime<.05&&rider.speed>9&&
      (offSlope>1.15||(Math.abs(offSlope)>.90&&rider.slip>2.8));
    rider.roughTime=rough?rider.roughTime+dt:Math.max(0,rider.roughTime-dt*2);
    if(rider.roughTime>.12&&rider.recovery<.1){
      unsettle(rider,.56,clamp(sideways*.08,-.3,.3));
      rider.vx*=.93;rider.vy*=.93;rider.roughTime=0;
    }
    const contact=solids.collision(T,[x,y,z],[rider.x,rider.y,rider.z],.26,[ground.solid?.index,next.solid?.index]);
    if(contact){
      const n=contact.normal,closing=Math.max(0,-(rider.vx*n[0]+rider.vy*n[1]+rider.vz*n[2]));
      if(closing>.01){
        const t=Math.max(0,contact.t-.001);
        const rest=[(rider.x-x)*(1-t),(rider.y-y)*(1-t),(rider.z-z)*(1-t)];
        rider.x=x+(rider.x-x)*t;rider.y=y+(rider.y-y)*t;rider.z=z+(rider.z-z)*t;
        if(closing>5.8){
          const tree=contact.solid.kind==='tree';
          crash(rider,tree?'tree-strike':'rock-strike',tree?'Trunk strike':'Rock face impact',tree?
            'The bike hit a solid tree trunk. Steer through the opening or brake before contact.':
            'The bike struck the steep face of the rock. Its upper faces can support a landing; approach above the lip and align with the slope.',
            'Into the face '+kmh(closing)+' · Riding '+kmh(rider.speed));return;
        }
        // Spend the remaining part of this step sliding along the face.
        // Discarding it would pin a bike at an edge while gravity built up.
        const inward=Math.min(0,rest[0]*n[0]+rest[1]*n[1]+rest[2]*n[2]);
        rider.x+=rest[0]-n[0]*inward;rider.y+=rest[1]-n[1]*inward;rider.z+=rest[2]-n[2]*inward;
        rider.vx+=n[0]*closing;rider.vy+=n[1]*closing;rider.vz+=n[2]*closing;
        if(closing>1.5)unsettle(rider,closing/7,clamp((n[0]*fy-n[1]*fx)*.28,-.28,.28));
      }
    }
    if(next.kind==='gravel')rider.looseTime+=dt;
    if(rider.grounded&&T.reachedValley(rider.x,rider.y,rider.z))rider.phase='finished';
  }
  return {create,step,startKick,takeKick,dt,clearance,hopWindup};
})();
if(typeof module!=='undefined'&&module.exports)module.exports=BikeMotion;
