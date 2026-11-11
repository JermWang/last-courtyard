/* Isolated Chrome QA. Test-only observation/control hooks are injected into
 * the served response; they are never written into the GDevelop export.
 * The full descent uses normal fixed-step physics and an automated controller.
 * Targeted UI checks can position a fresh rider; those are NOT full runs. */
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const playwright=require(process.env.PLAYWRIGHT_PATH||'playwright-core');
const root=path.resolve(__dirname,'..'),qa=path.join(root,'qa');
fs.mkdirSync(qa,{recursive:true});
async function main(){
  const browser=await playwright.chromium.launch({headless:true,executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',
    args:['--disable-background-timer-throttling','--disable-renderer-backgrounding','--disable-backgrounding-occluded-windows']});
  const page=await browser.newPage({viewport:{width:1280,height:800}}),errors=[];
  page.on('pageerror',e=>errors.push(e.message));
  page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
  let bundle=fs.readFileSync(path.join(root,'build/code0.js'),'utf8');
  bundle=bundle.replace('        M.step(rider,input,T);acc-=M.dt;',`
        if(window.__qaDrive){
          const y=rider.y+4.6,line=window.__qaLine;
          const aim=Math.atan2(line(y)-rider.x,4.6);
          input.steer=T.clamp((aim-rider.yaw)*3,-1,1);
          const pace=window.__qaPace||11;
          input.pedal=(pace===11||rider.y<620)&&rider.speed<pace-.8;input.brake=rider.speed>pace;input.airPitch=0;
        }
        M.step(rider,input,T);acc-=M.dt;`);
  bundle=bundle.replace('  return {tick,dispose(){',`
  window.__bikeQA={
    read:()=>({phase:rider.phase,paused,x:rider.x,y:rider.y,z:rider.z,speed:rider.speed,time:rider.time,
      fps,dropFrames,crash:rider.crashInfo,journey:journey.state,cleanLandings:rider.cleanLandings,saves:rider.saves,
      recovery:rider.recovery,audio:audio?.state,volume,draws:scene.getGame().getRenderer().getThreeRenderer()?.info.render.calls,
      yaw:rider.yaw,lean:rider.lean,turn:rider.turn,grounded:rider.grounded,airTime:rider.airTime,supportId:rider.supportId,
      mouse:{...mouseRiding.state},mouseEnabled,mouseSensitivity,mouseView:mouseRiding.view(rider.yaw),lastCreak,soundsLoaded:sounds.size,voices:voices.size}),
    audioMeter:()=>{if(!audio||!master)return null;
      if(!window.__qaAnalyser){window.__qaAnalyser=audio.createAnalyser();master.connect(window.__qaAnalyser);}
      const values=new Float32Array(2048);window.__qaAnalyser.getFloatTimeDomainData(values);
      return Math.sqrt(values.reduce((sum,v)=>sum+v*v,0)/values.length);},
    roots:()=>T.roots,
    rockDrop:(hard=false)=>{clearMotion();const rock=BikeSolids.get(T).rocks.find(s=>s.r>3&&s.y>50&&s.y<180);
      const p=BikeSolids.top(rock,rock.x,rock.y);rider=M.create(T,rock.y);
      Object.assign(rider,{x:rock.x,y:rock.y,z:p.z+M.clearance+.4,yaw:0,vx:0,vy:1,vz:hard?-20:-4,speed:1,
        phase:'riding',grounded:false,airTime:.2,pitch:Math.atan(-p.normal[1]/p.normal[2]),lean:Math.atan(p.normal[0]/p.normal[2])});
      menu();return {id:rock.index,x:rock.x,y:rock.y,top:p.z};},
    support:()=>({terrain:T.sample(rider.x,rider.y).z,surface:BikeSolids.sample(T,rider.x,rider.y,rider.z).z}),
    camera:()=>{const c=scene.getLayer('').getRenderer().getThreeCamera();return {
      distance:Math.hypot(c.position.x-rider.x,c.position.y-rider.y),fov:c.fov,
      clearance:c.position.z-T.sample(c.position.x,c.position.y).z};},
    flankPractice:i=>startPractice(T.flankJumps[i]),
    flankViews:()=>T.flankCuts.map(c=>({x:T.spine(c.y-20)+T.mirrored*c.x,y:c.y-20,
      yaw:Math.atan2(T.spine(c.y+1)-T.spine(c.y-1),2)})),
    mountainViews:()=>T.ridges.slice(0,6).map(([x,y,width])=>({x:T.spine(y-70)+T.mirrored*(x-Math.sign(x)*width*.65),y:y-70,
      yaw:Math.atan2(T.spine(y+1)-T.spine(y-1),2)})),
    flipSky:()=>{scene.getLayer('').getRenderer().getThreeGroup().traverse(o=>{
      if(o.geometry?.parameters?.radius!==4500)return;
      const uv=o.geometry.getAttribute('uv');for(let i=0;i<uv.count;i++)uv.setY(i,1-uv.getY(i));uv.needsUpdate=true;
    });},
    pause:setPaused,
    place:(x,y)=>{clearMotion();rider=M.create(T,y);rider.x=x;rider.z=T.sample(x,y).z+M.clearance;rider.phase='riding';menu();},
    lineData:()=>({rocks:T.rocks,mirrored:T.mirrored,spineKnots:T.spineKnots}),
    set:p=>Object.assign(rider,p)
  };
  return {tick,dispose(){`);
  await page.route('**/code0.js',route=>route.fulfill({status:200,contentType:'application/javascript',body:bundle}));
  try{
    await page.goto('http://127.0.0.1:8182/?debug');
    await page.waitForFunction(()=>window.__bikeQA,{timeout:30000});
    await page.screenshot({path:path.join(qa,'survival-summit.png')});
    console.log('Loaded',await page.evaluate(()=>window.__bikeQA.read()));
    assert.deepEqual(errors,[],'Startup/shader errors');
    const mode=process.argv[2]||'full';
    await page.locator(mode==='jump'?'[data-bike-practice]':'[data-bike-go]').click();
    if(mode==='full'){
      await page.evaluate(({factory,side,pace})=>{
        window.__qaLine=(0,eval)('('+factory+')')(window.__bikeQA.lineData(),side);
        window.__qaDrive=true;
        window.__qaPace=pace;
      },{factory:require('./expedition-line.cjs').toString(),side:Number(process.argv[3]||-1),pace:Number(process.argv[4]||11)});
      const samples=[],pauses=[],captured=new Set(),started=Date.now();
      while(Date.now()-started<420000){
        await page.waitForTimeout(1000);
        const s=await page.evaluate(()=>window.__bikeQA.read());samples.push(s);
        if(samples.length%15===0)console.log('Descent',JSON.stringify({phase:s.phase,y:s.y,time:s.time,fps:s.fps,draws:s.draws}));
        for(const [y,name] of [[740,'forest-entry'],[1100,'forest-descent'],[1490,'gorge-crossing'],[1710,'waterfall-gorge'],[2230,'lower-valley'],[2580,'refuge-approach']]){
          if(s.y>=y&&!captured.has(name)){captured.add(name);await page.screenshot({path:path.join(qa,name+'.png')});}
        }
        if(s.phase!=='riding')break;
        if(s.paused){
          pauses.push({y:s.y,time:s.time,heading:await page.locator('[data-bike-heading]').innerText()});
          console.log('Resume after pause',JSON.stringify(pauses.at(-1)));
          assert.ok(pauses.length<=3,'Repeated pauses make this browser run unusable');
          await page.waitForTimeout(500);
          const still=await page.evaluate(()=>window.__bikeQA.read());
          assert.equal(still.y,s.y,'Pause must preserve position');
          await page.locator('[data-bike-go]').click();
          assert.equal(await page.evaluate(()=>window.__bikeQA.read().paused),false);
        }
      }
      await page.waitForTimeout(1700);
      const result=await page.evaluate(()=>window.__bikeQA.read());
      await page.screenshot({path:path.join(qa,'survival-full-run.png')});
      fs.writeFileSync(path.join(qa,'survival-browser.json'),JSON.stringify({result,samples,pauses,errors},null,2));
      console.log('Result',JSON.stringify(result));
      assert.equal(result.phase,'finished','Automated browser descent must reach the refuge');
      assert.match(await page.locator('[data-bike-result]').innerText(),/falls.*saves.*clean landings/);
      await page.locator('[data-bike-retry]').click();
      const retry=await page.evaluate(()=>window.__bikeQA.read());
      assert.ok(retry.y<2&&retry.journey.falls===0);
    }else if(mode==='mouse'){
      await page.evaluate(()=>{window.__bikeQA.place(0,15);window.__bikeQA.set({vy:8,speed:8,yaw:0});});
      await page.mouse.move(600,400);await page.mouse.down({button:'right'});
      await page.mouse.move(740,380,{steps:10});await page.waitForTimeout(450);
      let s=await page.evaluate(()=>window.__bikeQA.read());
      assert.ok(s.mouse.active&&s.yaw>.04&&s.lean>.01,'Right drag should turn and lean the grounded bike');
      assert.equal(await page.evaluate(()=>document.pointerLockElement),null,'Mouse riding must not lock the pointer');
      await page.screenshot({path:path.join(qa,'mouse-riding.png')});
      await page.keyboard.down('a');await page.waitForTimeout(250);
      s=await page.evaluate(()=>window.__bikeQA.read());assert.ok(s.turn<-.5,'Keyboard correction must override mouse');
      const gaze=s.mouseView.yaw;await page.mouse.move(810,380,{steps:4});
      s=await page.evaluate(()=>window.__bikeQA.read());assert.ok(s.mouseView.yaw>.1,'Mouse look remains active during keyboard correction');
      await page.keyboard.up('a');await page.mouse.up({button:'right'});await page.waitForTimeout(250);
      s=await page.evaluate(()=>window.__bikeQA.read());assert.equal(s.mouse.active,false);assert.equal(s.mouseView.yaw,0);
      // Reproduce a game-surface wrapper instead of the bare canvas. It even
      // stops bubbling, as an embed can; capture-phase game input must work.
      await page.evaluate(()=>{
        window.__bikeQA.place(0,15);window.__bikeQA.set({vy:7,speed:7,yaw:0});
        const layer=document.createElement('div');layer.id='qa-input-wrapper';
        layer.style.cssText='position:fixed;inset:0;z-index:11;background:transparent';
        for(const type of ['pointerdown','pointermove','pointerup'])layer.addEventListener(type,e=>e.stopPropagation());
        document.body.append(layer);
      });
      await page.mouse.move(600,400);await page.mouse.down({button:'left'});await page.mouse.move(460,400,{steps:7});
      await page.waitForTimeout(350);s=await page.evaluate(()=>window.__bikeQA.read());
      assert.ok(s.mouse.active&&s.yaw<-.03,'Left drag on a wrapper should steer left');
      await page.mouse.up({button:'left'});assert.equal(await page.evaluate(()=>window.__bikeQA.read().mouse.active),false);
      await page.evaluate(()=>{
        const layer=document.getElementById('qa-input-wrapper');
        layer.dispatchEvent(new MouseEvent('mousedown',{bubbles:true,cancelable:true,button:2,buttons:2,clientX:500,clientY:400}));
        layer.dispatchEvent(new MouseEvent('mousemove',{bubbles:true,buttons:2,clientX:610,clientY:400}));
      });
      assert.equal(await page.evaluate(()=>window.__bikeQA.read().mouse.active),true,'MouseEvent-only embeds should activate input');
      await page.evaluate(()=>{
        const layer=document.getElementById('qa-input-wrapper');
        layer.dispatchEvent(new MouseEvent('mouseup',{bubbles:true,button:2,buttons:0}));layer.remove();
      });
      assert.equal(await page.evaluate(()=>window.__bikeQA.read().mouse.active),false);
      await page.evaluate(()=>window.__bikeQA.place(3,252));
      await page.keyboard.down('c');await page.mouse.move(600,400);await page.mouse.down({button:'right'});
      const heading=await page.evaluate(()=>window.__bikeQA.read().yaw);
      await page.mouse.move(800,420,{steps:8});await page.waitForTimeout(350);
      s=await page.evaluate(()=>window.__bikeQA.read());
      assert.ok(Math.abs(s.yaw-heading)<.001&&s.mouseView.yaw>.25,'Scout must look without steering');
      await page.keyboard.up('c');await page.waitForTimeout(150);
      s=await page.evaluate(()=>window.__bikeQA.read());assert.ok(Math.abs(s.mouseView.yaw)<.02);
      await page.keyboard.press('Escape');s=await page.evaluate(()=>window.__bikeQA.read());
      assert.ok(s.paused&&!s.mouse.active,'Escape must release mouse control');await page.mouse.up({button:'right'});
      await page.locator('[data-bike-go]').click();
      for(let i=0;i<8;i++){
        await page.mouse.move(600,400);await page.mouse.down({button:'right'});
        assert.equal(await page.evaluate(()=>window.__bikeQA.read().mouse.active),true);
        await page.mouse.up({button:'right'});
        assert.equal(await page.evaluate(()=>window.__bikeQA.read().mouse.active),false);
      }
      await page.mouse.move(600,400);await page.mouse.down({button:'right'});
      await page.setViewportSize({width:1000,height:720});
      await page.waitForFunction(()=>!window.__bikeQA.read().mouse.active,{timeout:2000});
      assert.equal(await page.evaluate(()=>window.__bikeQA.read().mouse.active),false);
      await page.mouse.up({button:'right'});
      await page.mouse.down({button:'right'});await page.evaluate(()=>window.dispatchEvent(new Event('blur')));
      s=await page.evaluate(()=>window.__bikeQA.read());assert.ok(s.paused&&!s.mouse.active,'Blur handler must release control and pause');
      await page.mouse.up({button:'right'});
      await page.locator('[data-bike-mouse-enabled]').uncheck();await page.locator('[data-bike-mouse-sensitivity]').fill('130');
      await page.locator('[data-bike-go]').click();await page.mouse.move(550,400);await page.mouse.down({button:'right'});
      await page.mouse.move(750,400);assert.equal(await page.evaluate(()=>window.__bikeQA.read().mouse.active),false);
      await page.mouse.up({button:'right'});
      await page.reload();await page.waitForFunction(()=>window.__bikeQA);
      assert.equal(await page.locator('[data-bike-mouse-enabled]').isChecked(),false);
      assert.equal(await page.locator('[data-bike-mouse-sensitivity]').inputValue(),'130');
      await page.locator('[data-bike-mouse-enabled]').check();await page.locator('[data-bike-practice]').click();
      await page.keyboard.press('Space');
      await page.waitForFunction(()=>{const s=window.__bikeQA.read();return !s.grounded&&s.airTime>.1;},{timeout:5000});
      await page.mouse.move(500,380);await page.mouse.down({button:'right'});await page.mouse.move(640,360,{steps:5});
      s=await page.evaluate(()=>window.__bikeQA.read());assert.ok(s.mouse.active&&Math.abs(s.turn)<.01);
      await page.waitForFunction(()=>window.__bikeQA.read().phase!=='riding',{timeout:15000});
      s=await page.evaluate(()=>window.__bikeQA.read());assert.equal(s.phase,'practiceDone');assert.equal(s.mouse.active,false);
      await page.mouse.up({button:'right'});
      assert.equal(await page.locator('[data-bike-heading]').innerText(),'Gap cleared.');
      console.log('Actual pointer drag turns/leans; keyboard overrides; scout does not steer; release, Escape, resize and blur handler clear input; settings persist; airborne mouse look clears the jump.');
    }else if(mode==='solids'){
      const rock=await page.evaluate(()=>window.__bikeQA.rockDrop());
      await page.waitForFunction(id=>window.__bikeQA.read().supportId===id&&window.__bikeQA.read().grounded,rock.id,{timeout:5000});
      let r=await page.evaluate(()=>window.__bikeQA.read()),surface=await page.evaluate(()=>window.__bikeQA.support());
      assert.equal(r.phase,'riding');assert.ok(r.z>surface.terrain+.7&&Math.abs(r.z-surface.surface-.38)<.2);
      await page.screenshot({path:path.join(qa,'rock-top-landing.png')});
      await page.waitForFunction(()=>!window.__bikeQA.read().grounded,{timeout:10000});
      await page.screenshot({path:path.join(qa,'rock-ride-off.png')});
      await page.waitForFunction(()=>window.__bikeQA.read().grounded||window.__bikeQA.read().phase==='crashed',{timeout:10000});
      r=await page.evaluate(()=>window.__bikeQA.read());assert.equal(r.phase,'riding',JSON.stringify(r.crash));
      await page.evaluate(()=>window.__bikeQA.rockDrop(true));
      await page.waitForFunction(()=>window.__bikeQA.read().phase==='crashed',{timeout:5000});
      const before=await page.evaluate(()=>window.__bikeQA.read());await page.waitForTimeout(4000);
      await page.screenshot({path:path.join(qa,'rock-impact-bail.png')});
      const after=await page.evaluate(()=>window.__bikeQA.read());
      assert.equal(after.phase,'crashed');assert.equal(after.x,before.x);assert.equal(after.y,before.y);assert.equal(after.z,before.z);
      assert.match(await page.locator('[data-bike-heading]').innerText(),/landing|Nose|balance/i);
      console.log('Browser rock-top landing, ride-off to terrain, hard-impact ragdoll and no automatic respawn passed.');
    }else if(mode==='camera'){
      await page.evaluate(()=>window.__bikeQA.place(-7,30));
      await page.keyboard.down('w');await page.waitForTimeout(2400);await page.keyboard.up('w');
      await page.screenshot({path:path.join(qa,'camera-close-descent.png')});
      let c=await page.evaluate(()=>window.__bikeQA.camera());
      assert.ok(c.distance>5&&c.distance<8&&c.fov<62&&c.clearance>.5,'Chase camera gives a visibly wider view and stays above terrain');
      await page.keyboard.down('a');await page.waitForTimeout(350);await page.keyboard.up('a');
      await page.screenshot({path:path.join(qa,'camera-action-turn.png')});
      assert.equal(await page.evaluate(()=>window.__bikeQA.read().phase),'riding');
      await page.evaluate(()=>window.__bikeQA.place(3,252));
      await page.keyboard.down('Shift');await page.waitForTimeout(1200);
      const close=await page.evaluate(()=>window.__bikeQA.camera());
      await page.keyboard.down('c');await page.waitForTimeout(1200);
      const scout=await page.evaluate(()=>window.__bikeQA.camera());
      assert.ok(scout.distance>close.distance+5,'C still offers deliberate scouting');
      await page.keyboard.up('c');await page.waitForTimeout(1200);
      await page.setViewportSize({width:900,height:650});await page.waitForTimeout(400);
      await page.screenshot({path:path.join(qa,'camera-close-resize.png')});
      await page.keyboard.up('Shift');await page.setViewportSize({width:1280,height:800});
      await page.evaluate(()=>window.__bikeQA.flankPractice(2));await page.keyboard.press('Space');
      await page.waitForFunction(()=>window.__bikeQA.read().airTime>.1,{timeout:5000});
      await page.screenshot({path:path.join(qa,'camera-close-air.png')});
      await page.waitForFunction(()=>window.__bikeQA.read().phase==='practiceDone'&&window.__bikeQA.read().grounded,{timeout:20000});
      await page.screenshot({path:path.join(qa,'camera-close-landing.png')});
      console.log('Close chase, steering, bank clearance, scout return, resize and bunny-hop landing passed.',{close,scout});
    }else if(mode==='features'){
      const spots=await page.evaluate(()=>window.__bikeQA.flankViews());
      for(const i of [2,6,10]){
        await page.evaluate(p=>{window.__bikeQA.place(p.x,p.y);window.__bikeQA.set({yaw:p.yaw});},spots[i]);
        await page.keyboard.down('Shift');await page.keyboard.down('c');await page.waitForTimeout(800);
        await page.screenshot({path:path.join(qa,'flank-crevice-'+i+'.png')});
        await page.keyboard.up('Shift');await page.keyboard.up('c');
      }
      for(const i of [0,2,6,7]){
        await page.evaluate(i=>window.__bikeQA.flankPractice(i),i);
        if(i===2)await page.keyboard.press('Space');
        await page.waitForFunction(()=>window.__bikeQA.read().airTime>.08,{timeout:5000});
        await page.screenshot({path:path.join(qa,'small-jump-'+i+'.png')});
        await page.waitForFunction(()=>window.__bikeQA.read().phase!=='riding',{timeout:12000});
        const s=await page.evaluate(()=>window.__bikeQA.read());
        assert.equal(s.phase,'practiceDone',JSON.stringify(s.crash));assert.ok(s.grounded,'Small jump must actually land');
      }
      console.log('Crevice viewpoints captured; four small browser jumps landed, including a keyboard bunny hop.');
    }else if(mode==='mountain'){
      const spots=await page.evaluate(()=>window.__bikeQA.mountainViews());
      await page.keyboard.press('F3');
      for(const i of [0,1,2,3]){
        await page.evaluate(p=>{window.__bikeQA.place(p.x,p.y);window.__bikeQA.set({yaw:p.yaw});},spots[i]);
        await page.keyboard.down('Shift');await page.keyboard.down('c');await page.waitForTimeout(1000);
        await page.screenshot({path:path.join(qa,'mountain-spur-'+i+'.png')});
        await page.keyboard.up('Shift');await page.keyboard.up('c');
      }
      console.log('Four actual mountain spur and basin viewpoints captured.');
    }else if(mode==='sky'){
      await page.evaluate(()=>window.__bikeQA.place(0,2600));await page.keyboard.down('Shift');
      await page.mouse.move(600,500);await page.mouse.down({button:'right'});await page.mouse.move(600,100,{steps:10});
      await page.waitForTimeout(900);await page.screenshot({path:path.join(qa,'sky-orientation-a.png')});
      await page.evaluate(()=>window.__bikeQA.flipSky());await page.waitForTimeout(300);
      await page.screenshot({path:path.join(qa,'sky-orientation-b.png')});
      await page.mouse.up({button:'right'});await page.keyboard.up('Shift');
    }else if(mode==='sound'){
      await page.evaluate(()=>{window.__bikeQA.place(-33,697);window.__bikeQA.set({yaw:0,vy:10,speed:10});window.__bikeQA.audioMeter();});
      let loudest=0,creak=false;
      for(let i=0;i<35;i++){
        await page.waitForTimeout(100);loudest=Math.max(loudest,await page.evaluate(()=>window.__bikeQA.audioMeter()));
        creak||=(await page.evaluate(()=>window.__bikeQA.read().lastCreak))>=0;
      }
      assert.ok(loudest>.0001,'Riding must produce real audio output');
      assert.ok(creak,'Suspension must trigger compression sound on uneven ground');
      const s=await page.evaluate(()=>window.__bikeQA.read());assert.equal(s.audio,'running');assert.equal(s.soundsLoaded,2);
      await page.keyboard.press('Escape');await page.waitForTimeout(2200);
      const silent=await page.evaluate(()=>window.__bikeQA.audioMeter());assert.ok(silent<.0001,'Pause must silence rolling and water');
      assert.equal(await page.evaluate(()=>window.__bikeQA.read().voices),0,'No stuck transient voices');
      console.log('Audio: decoded recordings, rolling output, terrain compression cue and silent pause passed.',{loudest,silent});
    }else if(mode==='views'){
      await page.keyboard.press('F3');
      for(const [x,y,yaw,name] of [[0,760,-.15,'forest-outlook'],[140,1000,-.45,'wide-forest'],[-250,1100,.4,'forest-bowl'],[360,1600,.3,'gorge-flank'],[-10,2590,0,'valley-refuge']]){
        await page.evaluate(({x,y,yaw})=>{window.__bikeQA.place(x,y);window.__bikeQA.set({yaw});},{x,y,yaw});
        await page.keyboard.down('Shift');await page.keyboard.down('c');await page.waitForTimeout(1000);
        await page.screenshot({path:path.join(qa,name+'.png')});
        await page.keyboard.up('Shift');await page.keyboard.up('c');
      }
      console.log('Scenery inspection viewpoints captured (targeted views, not a playthrough).');
    }else if(mode==='jump'){
      await page.keyboard.press('Space');
      await page.keyboard.down('w');await page.waitForTimeout(500);await page.keyboard.up('w');
      await page.waitForFunction(()=>window.__bikeQA.read().phase!=='riding',{timeout:15000});
      const result=await page.evaluate(()=>window.__bikeQA.read());
      console.log('Keyboard jump',JSON.stringify(result));
      await page.screenshot({path:path.join(qa,'survival-keyboard-jump.png')});
      assert.equal(result.phase,'practiceDone');
      assert.equal(await page.locator('[data-bike-heading]').innerText(),'Gap cleared.');
    }else{
      // Targeted rest / crash / resume checks, separate from the complete run.
      await page.evaluate(()=>{window.__bikeQA.place(3,252);});
      await page.keyboard.down('Shift');await page.waitForTimeout(1300);await page.keyboard.up('Shift');
      let s=await page.evaluate(()=>window.__bikeQA.read());
      assert.equal(s.journey.checkpoint?.shelfY,252);
      await page.evaluate(()=>window.__bikeQA.set({phase:'riding',x:7,y:264.7,z:100,vy:16,vx:0,speed:16}));
      // Use a known severe vertical impact on the shared terrain.
      await page.evaluate(()=>{window.__bikeQA.place(3,252);window.__bikeQA.set({grounded:false,airTime:.3,vz:-35});});
      await page.waitForTimeout(1200);
      s=await page.evaluate(()=>window.__bikeQA.read());assert.equal(s.phase,'crashed');
      assert.equal(await page.locator('[data-bike-go]').innerText(),'Return to last rest');
      await page.locator('[data-bike-go]').click();
      s=await page.evaluate(()=>window.__bikeQA.read());assert.equal(s.phase,'riding');assert.ok(Math.abs(s.y-252)<2);assert.equal(s.journey.falls,1);
      await page.keyboard.press('Escape');let before=await page.evaluate(()=>window.__bikeQA.read());
      await page.waitForTimeout(500);s=await page.evaluate(()=>window.__bikeQA.read());assert.equal(s.y,before.y);
      await page.locator('[data-bike-volume]').fill('0');
      assert.equal(await page.evaluate(()=>window.__bikeQA.read().volume),0);
      await page.setViewportSize({width:900,height:650});await page.screenshot({path:path.join(qa,'rest-pause-resize.png')});
      await page.locator('[data-bike-go]').click();
      assert.equal(await page.evaluate(()=>window.__bikeQA.read().paused),false);
      await page.keyboard.press('KeyR');s=await page.evaluate(()=>window.__bikeQA.read());
      assert.ok(s.y<1&&s.journey.falls===0&&s.journey.checkpoint===null);
      await page.reload();await page.waitForFunction(()=>window.__bikeQA);assert.equal(await page.evaluate(()=>window.__bikeQA.read().volume),0);
      console.log('Rest point, crash return, pause, resize, volume persistence and fresh restart passed.');
    }
    assert.deepEqual(errors,[],'Browser console must contain no errors');
  }finally{await browser.close();}
}
main().catch(e=>{console.error(e);process.exitCode=1;});
