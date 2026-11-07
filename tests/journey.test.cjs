const assert=require('node:assert/strict');
const J=require('../src/journey.js'),B=require('../src/puzzle.js'),E=require('../src/elevation.js'),P=require('../src/physics.js'),L=require('../src/level.json');
let s=J.create(),b=B.create(L.puzzle),e=E.create();
const seal={x:785,y:450,z:460,grounded:true};
function advance(seconds,p=seal,paused=false){const events=[];for(let i=0;i<Math.ceil(seconds*120);i++){const event=J.step(s,b,e,p,P.STEP,paused,{shots:12,recoveries:3});if(event)events.push(event);}return events;}
assert.deepEqual(J.progress(b,e),[false,false,false]);
assert.deepEqual(advance(2),[],'Finding the final seal before solving the route must not win');
Object.assign(b,{solved:true,flow:1});e.locked=true;e.canopy=true;
assert.deepEqual(advance(2),[],'The tower ascent must be completed too');
e.tower=true;b.flow=0.5;
assert.deepEqual(advance(2),[],'Wait until the first water feed reaches the tree');
b.flow=1;assert.deepEqual(J.progress(b,e),[true,true,false]);
advance(0.4);assert.ok(s.hold>0);advance(0.2,{...seal,x:850});assert.equal(s.hold,0,'Leaving the actual seal cancels activation');
assert.deepEqual(advance(2,{...seal,grounded:false}),[],'Flying over the seal cannot win');
assert.deepEqual(advance(2,{...seal,z:100}),[],'Standing below the seal cannot win');
advance(0.4);const saved={...s};advance(2,seal,true);assert.deepEqual(s,saved,'Pause freezes the activation dwell and run clock');
for(const dt of [1,30,NaN,-1])assert.equal(J.step(s,b,e,seal,dt,false),null);
assert.deepEqual(s,saved,'A stall must not skip activation or run time');
const events=advance(0.5);assert.deepEqual(events,['restore']);assert.equal(e.complete,true);assert.equal(s.phase,'restoring');assert.equal(s.hold,0);
assert.deepEqual(J.progress(b,e),[true,true,true]);assert.ok(J.locked(s));
const finishStats={...s.result};assert.equal(finishStats.shots,12);assert.equal(finishStats.recoveries,3);
advance(2);const reveal=s.reveal;advance(10,seal,true);assert.equal(s.reveal,reveal);
assert.equal(J.step(s,b,e,seal,12,false),null);assert.equal(s.reveal,reveal,'Stalled time cannot skip the reveal');
assert.deepEqual(advance(8),['complete']);assert.equal(s.phase,'complete');assert.deepEqual(s.result,finishStats);
assert.deepEqual(advance(20),[],'Completion is emitted only once');assert.ok(J.explore(s));assert.ok(!J.locked(s));
assert.deepEqual(advance(20),[],'Returning to the seal in free exploration never replays the ending');assert.deepEqual(s.result,finishStats);
B.reset(b,L.puzzle);assert.ok(b.solved&&e.complete,'Checkpoint recovery retains completed mechanisms');
const replay=J.create();assert.equal(replay.phase,'playing');assert.equal(replay.result,null);assert.equal(replay.seconds,0);
assert.ok(!J.skip(replay));replay.phase='restoring';assert.ok(J.skip(replay));assert.equal(replay.reveal,J.DURATION);assert.ok(!J.skip(replay));assert.ok(J.explore(replay));
console.log('PASS ordered objectives, physical seal/height, interrupted dwell, pause/stall safety, one-shot ending, skip, free exploration and fresh replay.');
// Use actual solid geometry to walk the final overlook approach into the seal.
s=J.create();e.complete=false;
let p={x:785,y:350,z:460,vx:0,vy:0,vz:0,grounded:true};
const boxes=L.boxes.filter(b=>b.solid).map(b=>({...b}));
for(let i=0;i<50;i++)P.step(p,{x:0,y:1},boxes,null);
for(let i=0;i<120;i++){P.step(p,{x:0,y:0},boxes,null);J.step(s,b,e,p,P.STEP,false);}
assert.equal(s.phase,'restoring',JSON.stringify(p));
console.log('PASS final seal reached and activated on the real overlook collision geometry.');
