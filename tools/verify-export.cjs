// Validate the actual HTML5 package, independently of the exporter exit code.
// This checks packaging and syntax; browser startup/playtesting is still required.
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const base = path.resolve(__dirname, '..');
const folder = path.resolve(process.argv[2] || path.join(base, 'build'));
function read(relative) {
  const file = path.resolve(folder, relative);
  if (!file.startsWith(folder + path.sep)) throw Error('Resource escapes export: ' + relative);
  const bytes = fs.readFileSync(file);
  if (!bytes.length) throw Error('Empty exported file: ' + relative);
  return bytes;
}
const html = read('index.html').toString();
const scripts = [...html.matchAll(/<script\s+src="([^"]+)"/g)].map(m => m[1]);
if (!scripts.includes('code0.js') || !scripts.includes('data.js')) throw Error('Missing game scripts');
for (const file of scripts) new vm.Script(read(file).toString(), {filename: file});
const code = read('code0.js').toString().replace(/\r\n/g, '\n');
for (const name of ['physics.js','animation.js','shot.js','puzzle.js','elevation.js','journey.js','chain-view.js','grass-view.js','runtime.js']) {
  const maintained = fs.readFileSync(path.join(base, 'src', name), 'utf8').replace(/\r\n/g, '\n');
  if (!code.includes(maintained)) throw Error('Export does not contain current source: ' + name);
}
const level = JSON.parse(fs.readFileSync(path.join(base, 'src', 'level.json'), 'utf8'));
if (!code.includes('const COURTYARD_LEVEL=' + JSON.stringify(level) + ';')) throw Error('Export has stale level data');
const context = {gdjs: {}};
vm.runInNewContext(read('data.js').toString(), context, {timeout: 1000});
const project = context.gdjs.projectData;
if (!project?.layouts?.length) throw Error('Export contains no scenes');
let assets = 0;
for (const resource of project.resources.resources) {
  if (!resource.file) continue;
  const bytes = read(resource.file);
  if (resource.kind === 'image' && resource.file.endsWith('.png') &&
      !bytes.subarray(0, 8).equals(Buffer.from([137,80,78,71,13,10,26,10]))) {
    throw Error('Invalid PNG: ' + resource.file);
  }
  assets++;
}
console.log(`Export integrity passed: ${scripts.length} scripts, ${assets} assets, ${project.layouts.length} scene(s). Browser validation remains required.`);
