const assert=require('node:assert/strict'),S=require('../src/shot.js'),P=require('../src/physics.js');
const origin={x:0,y:0,z:50},anchor={id:'test',x:400,y:0,z:50};
function fly(shot,boxes=[],anchors=[]){let event;for(let i=0;i<240;i++){event=S.step(shot,P.STEP,origin,boxes,anchors);if(event&&event.type!=='miss')return event;}return event;}
let shot=S.create(origin,anchor,anchor,1);
assert.equal(fly(shot,[],[anchor]).type,'anchor');
shot=S.create(origin,anchor,anchor,1);
assert.equal(fly(shot,[{x:200,y:-50,z:0,w:2,h:100,d:100}],[anchor]).type,'wall','swept flight must hit thin walls before anchor');
assert.ok(shot.pos.x<200);assert.equal(shot.phase,'impact');
for(let i=0;i<20;i++)S.step(shot,P.STEP,origin,[],[]);
assert.equal(shot.phase,'return');
assert.equal(fly(shot).type,'returned');
shot=S.create(origin,{x:2000,y:0,z:50},null,0);
assert.equal(fly(shot).type,'returned','miss returns automatically');assert.ok(shot.travel<=S.RANGE+0.01);
shot=S.create(origin,anchor,anchor,1);const before=JSON.stringify(shot);S.step(shot,1,origin,[],[anchor]);assert.equal(JSON.stringify(shot),before,'stalled frame cannot advance flight');
S.retract(shot);assert.equal(fly(shot).type,'returned');
assert.ok(S.create(origin,anchor,anchor,1).speed>S.create(origin,anchor,anchor,0).speed);
console.log('PASS: swept anchor/wall ordering, thin walls, bounded range, recall, cancel, charge and stalled-frame safety.');
