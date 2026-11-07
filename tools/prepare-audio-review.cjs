// Render the exact game sound() implementation through browser OfflineAudioContext.
// This is a local QA page, never a runtime asset or part of the HTML5 export.
const fs=require('node:fs'),path=require('node:path');
const root=path.resolve(__dirname,'..'),runtime=fs.readFileSync(path.join(root,'src/runtime.js'),'utf8');
const sound=runtime.slice(runtime.indexOf('function sound('),runtime.indexOf('function toast('));
if(!sound.startsWith('function sound('))throw Error('Could not find game sound implementation');
const folder=path.join(root,'.tooling/audio-review');fs.mkdirSync(folder,{recursive:true});
fs.writeFileSync(path.join(folder,'index.html'),`<!doctype html><meta charset="utf-8"><title>Courtyard sound review</title>
<style>body{font:16px system-ui;max-width:800px;margin:40px auto;background:#eef0df;color:#203f3a}button,a{padding:12px;display:inline-block}pre{white-space:pre-wrap}audio{width:100%}</style>
<h1>Courtyard sound review</h1><p>Uses the current game's synthesized effects at their gameplay strengths. This checks waveform levels; listening remains a separate review.</p>
<button id="render">Render sound palette</button><audio controls></audio><a id="download" hidden download="courtyard-sound-palette.wav">Download WAV</a><pre id="result">Ready</pre>
<script>
const P={clamp:(v,a,b)=>Math.max(a,Math.min(b,v))},state={paused:false,draw:0.6,time:0};
const saved={master:0.65,music:0.35,effects:0.8,mute:false},voices=new Set();let audio,noiseBuffer;
${sound}
document.querySelector('#render').onclick=async()=>{
  const button=document.querySelector('#render');button.disabled=true;
  try {
    const palette=[['draw',0.3],['fire',1],['hit',1],['reel',0.3],['tension',0.22],['miss',0.45],['release',1],['step',0.35],['land',1],['splash',1],['checkpoint',1],['music',0.25],['water',0.6]];
    const spacing=2.2,rate=44100,ctx=new OfflineAudioContext(1,Math.ceil(palette.length*spacing*rate),rate);let offset=0;
    audio=new Proxy(ctx,{get(target,key){if(key==='currentTime')return offset;const v=Reflect.get(target,key,target);return typeof v==='function'?v.bind(target):v;}});
    noiseBuffer=null;voices.clear();
    for(let i=0;i<palette.length;i++){offset=i*spacing;state.time=offset;sound(...palette[i]);}
    const buffer=await ctx.startRendering(),samples=buffer.getChannelData(0),measurements=[];
    for(let i=0;i<palette.length;i++){
      let peak=0,sum=0;const start=Math.floor(i*spacing*rate),end=Math.min(samples.length,Math.floor((i+1)*spacing*rate));
      for(let j=start;j<end;j++){peak=Math.max(peak,Math.abs(samples[j]));sum+=samples[j]*samples[j];}
      measurements.push({sound:palette[i][0],peak:Number(peak.toFixed(5)),rmsDb:Number((20*Math.log10(Math.sqrt(sum/(end-start))||1e-10)).toFixed(1))});
    }
    const data=new ArrayBuffer(44+samples.length*2),v=new DataView(data);const ascii=(p,s)=>{for(let i=0;i<s.length;i++)v.setUint8(p+i,s.charCodeAt(i));};
    ascii(0,'RIFF');v.setUint32(4,data.byteLength-8,true);ascii(8,'WAVEfmt ');v.setUint32(16,16,true);v.setUint16(20,1,true);v.setUint16(22,1,true);v.setUint32(24,rate,true);v.setUint32(28,rate*2,true);v.setUint16(32,2,true);v.setUint16(34,16,true);ascii(36,'data');v.setUint32(40,samples.length*2,true);
    for(let i=0;i<samples.length;i++)v.setInt16(44+i*2,Math.round(Math.max(-1,Math.min(1,samples[i]))*32767),true);
    const url=URL.createObjectURL(new Blob([data],{type:'audio/wav'}));document.querySelector('audio').src=url;
    const link=document.querySelector('#download');link.href=url;link.hidden=false;
    document.querySelector('#result').textContent=JSON.stringify({sampleRate:rate,duration:buffer.duration,clippedSamples:samples.reduce((n,x)=>n+(Math.abs(x)>=1),0),measurements},null,2);
  } catch(error){document.querySelector('#result').textContent=String(error);}finally{button.disabled=false;}
};
</script>`);
console.log('Audio QA page prepared in .tooling/audio-review; serve locally for browser rendering.');
