// Run without GDevelop installed: verify committed editor/runtime freshness
// and packaged resources before publishing the browser export.
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),assert=require('node:assert/strict');
const root=path.resolve(__dirname,'..'),folder=path.resolve(process.argv[2]||path.join(root,'build'));
function read(relative){
  const file=path.resolve(folder,relative);
  assert.ok(file.startsWith(folder+path.sep),'Resource escapes export: '+relative);
  const bytes=fs.readFileSync(file);assert.ok(bytes.length,'Empty export: '+relative);return bytes;
}
const normalize=text=>text.replace(/\r\n/g,'\n');
const scripts=[...read('index.html').toString().matchAll(/<script\s+src="([^"]+)"/g)].map(m=>m[1]);
assert.ok(scripts.includes('code0.js')&&scripts.includes('data.js'));
for(const file of scripts)new vm.Script(read(file).toString(),{filename:file});
const code=normalize(read('code0.js').toString());
const project=JSON.parse(fs.readFileSync(path.join(root,'downhill-bike.json'),'utf8'));
const editor=normalize(project.layouts[0].events[0].inlineCode.join('\n'));
for(const file of fs.readdirSync(path.join(root,'src')).filter(f=>f.endsWith('.js'))){
  const source=normalize(fs.readFileSync(path.join(root,'src',file),'utf8'));
  assert.ok(code.includes(source),'Stale browser source: '+file);
  assert.ok(editor.includes(source),'Stale editable source: '+file);
}
assert.ok(!code.includes('__bikeQA'),'Browser QA hooks must not ship');
const context={gdjs:{}};
vm.runInNewContext(read('data.js').toString(),context,{timeout:1000});
const exported=context.gdjs.projectData;
assert.ok(exported?.layouts?.length);
const assets=exported.resources.resources.filter(r=>r.file);
for(const asset of assets){
  const source=project.resources.resources.find(r=>r.name===asset.name);
  assert.ok(source,'Unknown exported asset: '+asset.name);
  assert.ok(read(asset.file).equals(fs.readFileSync(path.join(root,source.file))),'Stale resource: '+asset.name);
}
console.log(`Downhill editor/export integrity passed: ${scripts.length} scripts and ${assets.length} matching resources.`);
