// Called only after verify-export passes. Replace changed files individually
// through same-directory temporary files, so HTTP readers never see partial JS.
// This is not a whole-package transaction: reload after publication completes.
const fs=require('node:fs'),path=require('node:path');
const base=path.resolve(__dirname,'..');
const source=path.join(base,'.tooling','html5-staging'),target=path.join(base,'build');
const files=[];
function walk(dir,prefix='') {for(const entry of fs.readdirSync(dir,{withFileTypes:true})) {
  const relative=path.join(prefix,entry.name);
  if(entry.isDirectory())walk(path.join(dir,entry.name),relative);
  else if(entry.isFile())files.push(relative);
}}
walk(source);
// Entry documents last, after their dependencies.
files.sort((a,b)=>(a==='index.html'?2:a==='data.js'?1:0)-(b==='index.html'?2:b==='data.js'?1:0));
let changed=0;
for(const relative of files) {
  const dest=path.join(target,relative),bytes=fs.readFileSync(path.join(source,relative));
  if(fs.existsSync(dest)&&bytes.equals(fs.readFileSync(dest)))continue;
  fs.mkdirSync(path.dirname(dest),{recursive:true});
  const temporary=dest+'.export-tmp';
  fs.writeFileSync(temporary,bytes);fs.renameSync(temporary,dest);changed++;
}
console.log(`Published verified export: ${changed} changed files; unchanged runtime files preserved.`);
